# Phase 41: Reconciliação de Entrega, Retry & Testing - Pattern Map

**Mapped:** 2026-07-26
**Files analyzed:** 11 (4 new, 5 modified, 2 test/smoke)
**Analogs found:** 11 / 11 (todo componente tem gêmeo vivo em PROD — cópia cirúrgica, não greenfield)

> **Insight-chave (RESEARCH §Don't Hand-Roll):** Nenhum arquivo desta fase é greenfield.
> Cada um copia um padrão já provado em PROD (P36/P37/P38/P39). A única dependência
> genuinamente nova é `npm:svix` (import estático no topo da EF de webhook).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/resend-webhook/index.ts` | controller (EF pública) | event-driven (webhook) | `supabase/functions/analise-candidato-individual/index.ts` | role-match (self-auth EF; troca Bearer→Svix) |
| `supabase/functions/resend-webhook/helpers.ts` | utility (funções puras) | transform | `supabase/functions/notificar-candidato/helpers.ts` | exact (pure helpers p/ testabilidade) |
| `supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts` | test | transform + mock | `notificar-candidato/__tests__/notificar-candidato.test.ts` + `analise-candidato-individual/__tests__/index.test.ts` | exact (pure) + role-match (mock supabaseAdmin) |
| `supabase/functions/notificar-candidato/index.ts` (MOD) | controller (EF) | request-response + branch retry | `supabase/functions/analise-candidato-individual/index.ts` | exact (deps injetáveis + import.meta.main) |
| `supabase/functions/notificar-candidato/helpers.ts` (MOD) | utility (funções puras) | transform | ele mesmo (linhas 43-84, padrão de helper puro) | exact (mesmo arquivo) |
| `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` (MOD) | test | transform + mock | `analise-candidato-individual/__tests__/index.test.ts` | role-match (deps injetadas/mock fetch) |
| `supabase/functions/_shared/email-config.ts` (MOD) | config/utility | transform (guard) | ele mesmo — `exigirChaveApi` (linhas 121-129) | exact (mesmo arquivo, mesma forma) |
| `supabase/functions/_shared/__tests__/email-config.test.ts` (MOD) | test | transform | ele mesmo (caso 6, `exigirChaveApi` assertThrows) | exact (mesmo arquivo) |
| `supabase/migrations/202607XXXXXXXX_p41_recon.sql` | migration | CRUD (DDL) + event-driven (cron) | `20260722000002_p37…` + `20260726000001_p39…` + `20260609000003…` | exact (3 gêmeos combinados) |
| `ler_resend_webhook_secret()` RPC (na migration) | migration (função Vault) | request-response | `20260722000001_p36_vault_resend_reader.sql` (`ler_resend_api_key`) | exact (mirror do reader escopado) |
| `supabase/config.toml` (MOD) | config | — | bloco `[functions.notificar-candidato]` (linhas 29-31) | exact (mesmo arquivo, verify_jwt=false) |

## Pattern Assignments

### `supabase/functions/resend-webhook/index.ts` (controller/EF pública, event-driven)

**Analog primário:** `supabase/functions/analise-candidato-individual/index.ts` (esqueleto self-auth + `import.meta.main` + handler testável + deps injetáveis + CORS/errorResponse).
**Diferença cirúrgica:** troca o self-auth Bearer (linhas 148-156) pela verificação `Webhook.verify` do Svix; import `npm:svix` ESTÁTICO no topo (nunca `.join("npm:")`).
**Segundo analog:** `notificar-candidato/index.ts:255-259` (padrão de leitura de segredo do Vault via `supabaseAdmin.rpc(...)` — aqui será `rpc("ler_resend_webhook_secret")`).

**Imports pattern** — import `npm:` estático + createClient esm.sh (analog `analise…/index.ts:38,54-58`; o comentário de import estático está em 50-53):
```typescript
import { Webhook } from "npm:svix@1.99.1";                       // NOVO — estático (Pitfall .join)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapEventoStatus } from "./helpers.ts";
```
> RESEARCH Pitfall 2 (linhas 405-410) + comentário verbatim de `analise…/index.ts:50-53`:
> o `["npm:",pkg].join("")` escondia o pacote do deploy → `ERR_MODULE_NOT_FOUND` no runtime
> (o EF de análise "nunca extraía CV"). Import estático no topo.

**CORS + response helpers** — COPIAR verbatim de `analise…/index.ts:64-81` (`corsHeaders`, `jsonResponse`, `errorResponse`). Idêntico ao de `notificar-candidato/index.ts:38-56`.

**Handler testável + deps injetáveis** — analog `analise…/index.ts:126-146`:
```typescript
export interface WebhookDeps {
  supabaseAdmin: any;      // client service-role (mock nos testes)
  webhookSecret: string;   // whsec_… do Vault (injetado; testes passam um sintético)
}
export async function handler(req: Request, deps: WebhookDeps): Promise<Response> { … }
```

**Verificação Svix (substitui o Bearer self-auth)** — RESEARCH Pattern 1 (linhas 204-255). Substitui `analise…/index.ts:148-156`. CRÍTICO: `req.text()` bruto ANTES de qualquer parse (Pitfall 1, linhas 399-403):
```typescript
const rawBody = await req.text();                 // corpo BRUTO — não parsear antes de verificar
const headers = {
  "svix-id":        req.headers.get("svix-id") ?? "",
  "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
  "svix-signature": req.headers.get("svix-signature") ?? "",
};
let evt: { type: string; data: { email_id?: string } };
try {
  evt = new Webhook(deps.webhookSecret).verify(rawBody, headers) as typeof evt; // lança se inválida
} catch {
  console.warn("[resend-webhook] assinatura Svix inválida");
  return new Response("invalid signature", { status: 400 });
}
```

**Reconciliação por `provider_message_id` (idempotente/no-op)** — RESEARCH Pattern 1 (linhas 238-253). O `.update().eq(...)` que não casa afeta 0 linhas → naturalmente idempotente; usa o índice vivo `idx_notif_provider_msg`:
```typescript
const emailId = evt.data?.email_id;
const mapped = mapEventoStatus(evt.type);           // helper puro
if (!emailId || !mapped) return new Response("ignored", { status: 200 }); // graceful
const patch: Record<string, unknown> = { status: mapped.status };
patch[mapped.col] = new Date().toISOString();
await deps.supabaseAdmin.from("notificacoes_enviadas")
  .update(patch).eq("provider_message_id", emailId);
return new Response("ok", { status: 200 });
```

**Wiring de produção (`import.meta.main`)** — COPIAR a forma de `analise…/index.ts:378-408`; construir `supabaseAdmin` do env e ler o segredo do Vault via RPC (mirror `notificar-candidato/index.ts:255-256`):
```typescript
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: whsec } = await supabaseAdmin.rpc("ler_resend_webhook_secret");
    if (!whsec || typeof whsec !== "string") return new Response("misconfigured", { status: 500 });
    return await handler(req, { supabaseAdmin, webhookSecret: whsec });
  });
}
```

---

### `supabase/functions/resend-webhook/helpers.ts` (utility, funções puras)

**Analog:** `supabase/functions/notificar-candidato/helpers.ts` (funções puras extraídas para serem testáveis SEM `Deno.serve`; docstring linhas 1-7 explica o porquê — importar `index.ts` num teste dispararia o servidor).

**Core pattern (mapa evento→status, allowlist explícita)** — RESEARCH Pattern 1 (linhas 258-269). Mesma forma do `EVENTO_MAP` literal de `notificar-candidato/helpers.ts:14-23`:
```typescript
// Source: resend.com/docs/webhooks/event-types
export function mapEventoStatus(type: string):
  { status: "entregue"|"bounce"|"reclamado"; col: "entregue_em"|"bounce_em"|"reclamado_em" } | null {
  switch (type) {
    case "email.delivered":  return { status: "entregue",  col: "entregue_em" };
    case "email.bounced":    return { status: "bounce",    col: "bounce_em" };
    case "email.complained": return { status: "reclamado", col: "reclamado_em" };
    default:                 return null; // delivery_delayed/sent/opened/clicked = ignorados no v1
  }
}
```
> `col` alinha aos nomes de coluna do enum vivo `status_notificacao` (schema `20260721000001:57-64`)
> e às colunas novas da migration desta fase (`bounce_em`/`reclamado_em`).

---

### `supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts` (test)

**Analog A (pure helper tests, sem `--allow-net`):** `notificar-candidato/__tests__/notificar-candidato.test.ts` (linhas 1-36) — import do módulo de helpers + `assertEquals`, pin `std@0.224.0`.
**Analog B (mock supabaseAdmin via deps injetadas):** `analise-candidato-individual/__tests__/index.test.ts:74-126` (`makeMockSupabase` grava upserts/updates; handler recebe deps) — para o teste do UPDATE 0-linhas (no-op idempotente).

**Import + assert pattern** (analog `notificar…test.ts:9-16`):
```typescript
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapEventoStatus } from "../helpers.ts";
```

**Teste do mapeamento** — RESEARCH §Code Examples (linhas 468-475):
```typescript
Deno.test("RECON-02 — mapeia os 3 eventos e ignora o resto", () => {
  assertEquals(mapEventoStatus("email.delivered"),  { status: "entregue",  col: "entregue_em" });
  assertEquals(mapEventoStatus("email.bounced"),    { status: "bounce",    col: "bounce_em" });
  assertEquals(mapEventoStatus("email.complained"), { status: "reclamado", col: "reclamado_em" });
  assertEquals(mapEventoStatus("email.delivery_delayed"), null);
});
```

**Teste da assinatura Svix sem rede** — RESEARCH linhas 476: gerar headers válidos com `wh.sign(msgId, timestamp, payload)` do próprio `Webhook`, assertar `verify` aceita a boa e rejeita a adulterada (só crypto local, sem `--allow-net`).

**Teste do no-op idempotente** — mock `supabaseAdmin` no molde de `analise…test.ts:74-126` (o `from(table).update().eq()` registra o patch; assertar que id desconhecido não produz erro e o handler devolve 200).

---

### `supabase/functions/notificar-candidato/index.ts` (MODIFY — controller/EF, +branch retry)

**Analog:** `supabase/functions/analise-candidato-individual/index.ts` (padrão `import.meta.main` + `handler(req, deps)` com deps injetáveis — linhas 126-146, 378-408). O maior item de Wave 0 (RESEARCH linhas 586): hoje o `fetch` do Resend e o `createClient` são construídos inline no `Deno.serve` (não há handler injetável), impedindo mock sem `--allow-net`.

**Refactor testabilidade (deps injetáveis)** — espelhar `AnaliseDeps`/`handler` de `analise…/index.ts:126-172`:
```typescript
export interface NotificarDeps {
  supabaseAdmin: any;
  fetchImpl: typeof fetch;   // testes injetam mock → sem --allow-net
  serviceKey: string;        // == NOTIFICAR_SECRET (self-auth Bearer)
}
export async function handler(req: Request, deps: NotificarDeps): Promise<Response> { … }
// if (import.meta.main) { Deno.serve(... constrói createClient + fetch reais e delega ...) }
```
> Preservar o caminho normal **byte-a-byte** (RESEARCH Pattern 3, linhas 349-356). O self-auth
> Bearer atual (linhas 88-96) migra para dentro do handler usando `deps.serviceKey`.

**Branch de retry (gate por `retry_id` no body)** — RESEARCH Pattern 3 (linhas 344-373). Aceitar `retry_id?: string` no parse (hoje `CorpoRequisicao` linhas 67-71). Se presente: PULAR o claim-before-send (linhas 176-207) e re-tentar a linha existente:
```typescript
// SELECT id, status, tentativas, dedupe_key FROM notificacoes_enviadas WHERE id = retry_id
// guard: ausente | status NOT IN ('pendente','falhou') | tentativas >= 5 → 200 { skipped: "nao_elegivel" }
// nas escritas de falha/sucesso: WHERE id = retry_id, e INCREMENTAR tentativas (não setar 1)
```
> Motivo (RESEARCH linha 347): hoje o 2º disparo colapsa em `skipped:duplicate` porque o
> `upsert onConflict dedupe_key ignoreDuplicates` não retorna id (index.ts:200-207).

**Unificar `registrarFalha` com o backoff helper** — hoje `registrarFalha` (linhas 238-253) hardcoda `tentativas: 1` e `RETRY_INTERVALO_MS` (linha 65, 15min fixo). Trocar por `computeProximaTentativa(novasTentativas)` (novo helper): caminho normal `novasTentativas=1`; retry `row.tentativas + 1` (RESEARCH linhas 357-373).

**Guard non-prod** — chamar `exigirSinkTeste(dest.para, modo)` logo após `resolverDestinatario` (index.ts:172), antes do `fetch` (RESEARCH linhas 478-491).

**(Opcional, LEDGER-02) `Idempotency-Key`** — adicionar header ao `fetch` do Resend (index.ts:263-272) usando `dedupe_key`/`retry_id` (RESEARCH linhas 375).

---

### `supabase/functions/notificar-candidato/helpers.ts` (MODIFY — utility)

**Analog:** ele mesmo — mesma forma dos helpers puros existentes (`montarDedupeKey` linhas 29-41, `construirCorpoResend` 44-63). Adicionar `computeProximaTentativa` puro.

**Core pattern (backoff exponencial capado)** — RESEARCH Pattern 3 (linhas 358-372):
```typescript
// ≈15m → 1h → 6h → 24h, cap 24h, cap 5 tentativas. Indexado pela NOVA contagem.
const BACKOFF_MS = [15*60_000, 60*60_000, 6*60*60_000, 24*60*60_000];
export function computeProximaTentativa(novasTentativas: number): string | null {
  if (novasTentativas >= 5) return null;               // cap: sem mais retries (fica falhou)
  const ms = BACKOFF_MS[novasTentativas - 1] ?? BACKOFF_MS.at(-1)!;
  return new Date(Date.now() + ms).toISOString();
}
```

---

### `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` (MODIFY — test)

**Analog:** `analise-candidato-individual/__tests__/index.test.ts` (deps injetadas + mock; `loadHandler()` via `import("../index.ts")` linhas 147-160; `makeMockSupabase` linhas 74-126; `makeRequest` com Bearer linhas 164-172). Manter os testes puros existentes (linhas 19-85).

**Novos casos (RESEARCH Test Map linhas 571-573):**
- `computeProximaTentativa` → 15m/1h/6h/24h e `null` no cap 5 (unit puro, molde dos casos existentes 19-24).
- branch retry: `retry_id` não-elegível (`tentativas>=5`/status errado) → skip (handler + mock supabaseAdmin no molde `analise…test.ts:277-299`).
- `fetch` mockado (sem chave viva): sucesso→`enviado`; 429/non-2xx→`falhou`+backoff (injetar `fetchImpl` mock via deps).

---

### `supabase/functions/_shared/email-config.ts` (MODIFY — config/utility)

**Analog:** ele mesmo — `exigirChaveApi` (linhas 121-129) é a forma EXATA a copiar: guard que lança `Error` com mensagem acionável citando só identificadores (sem interpolar segredo/PII). Docstring do módulo (linhas 12-18) trava a regra ZERO IMPORTS — não adicionar `npm:`/`std`/`zod`.

**Core pattern (guard hard-fail non-prod)** — RESEARCH linhas 482-489:
```typescript
/** Hard-fail em modo teste se o destinatário efetivo não for um sink *@resend.dev. */
export function exigirSinkTeste(paraEfetivo: string, modo: ModoNotificacao): void {
  if (modo === "teste" && !/@resend\.dev$/i.test(paraEfetivo)) {
    throw new Error(
      `[email-config] modo=teste mas destinatario não é sink *@resend.dev — envio abortado (DELIV-03).`,
    );
  }
}
```
> RESEARCH linha 491 (Security V7): como o email real pode viajar no erro, NÃO incluir o
> destinatário real na mensagem que vai para log estruturado. Em teste `paraEfetivo` já é o
> sink (produzido por `resolverDestinatario` linhas 93-108), não o real — validar.

---

### `supabase/functions/_shared/__tests__/email-config.test.ts` (MODIFY — test)

**Analog:** ele mesmo — caso 6 (`exigirChaveApi`, linhas 74-77) é o molde exato: `assertThrows(() => exigirSinkTeste(...), Error, "resend.dev")` + caso que NÃO lança quando o destinatário é `*@resend.dev`. Import pattern `assertThrows` (linha 15). Rodar sem `--allow-net`.

---

### `supabase/migrations/202607XXXXXXXX_p41_recon.sql` (NEW — migration)

**Analog A (aditiva ALTER + COMMENT, sem BEGIN/COMMIT):** `20260722000002_p37_notificacoes_lacunas.sql` — bloco ALTER+COMMENT (linhas 99-128) + a nota de header sobre apply via MCP sem wrapper transacional (linhas 85-90).
**Analog B (hop `net.http_post` + Vault, verbatim):** `20260726000001_p39_rewire_triggers_aposenta_n8n.sql` — leitura Vault (linhas 83-89), `net.http_post` Bearer (91-105), `REVOKE ALL … FROM PUBLIC` (111), `SECURITY DEFINER SET search_path=''` (65-66).
**Analog C (cron.schedule com corpo `$$`):** `20260609000003_prompt_library_cron.sql:36-64`.
**Analog D (função Vault reader escopada):** `20260722000001_p36_vault_resend_reader.sql:54-83` (para `ler_resend_webhook_secret()`).

**Colunas aditivas** — COPIAR a forma de `20260722000002:99-119` (ALTER ADD COLUMN + COMMENT ON COLUMN). `bounce_em`/`reclamado_em` entram `timestamptz` NULL (sem NOT NULL — a tabela pode ter linhas; diferente do `destinatario_original` NOT NULL da P37 que exigia tabela vazia):
```sql
ALTER TABLE public.notificacoes_enviadas ADD COLUMN bounce_em    timestamptz;
ALTER TABLE public.notificacoes_enviadas ADD COLUMN reclamado_em timestamptz;
COMMENT ON COLUMN public.notificacoes_enviadas.bounce_em    IS 'M7/P41 RECON-02: timestamp do email.bounced (webhook Resend). NULL até o bounce.';
COMMENT ON COLUMN public.notificacoes_enviadas.reclamado_em IS 'M7/P41 RECON-02: timestamp do email.complained (webhook Resend). NULL até a reclamacao.';
```
> NÃO criar índice: `idx_notif_retry` e `idx_notif_provider_msg` JÁ vivem em PROD
> (`20260721000001:100-110`; nota P37 linhas 41-64). Anti-pattern RESEARCH linha 380.

**Função da varredura `SECURITY DEFINER`** — RESEARCH Pattern 2 (linhas 282-340). Estrutura verbatim do P39 (leitura Vault `project_url`+`edge_invoke_key`, graceful-skip se NULL, `net.http_post` Bearer, `EXCEPTION WHEN OTHERS RAISE WARNING`, `REVOKE ALL FROM PUBLIC`). Diferenças: (a) `FOR r IN SELECT … WHERE status IN ('pendente','falhou') AND tentativas < 5 AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= now()) ORDER BY proxima_tentativa_em NULLS FIRST LIMIT 20` (cobre `idx_notif_retry`); (b) body inclui `retry_id: r.id` + `agendamento_id` derivado de `split_part(r.dedupe_key, ':', 1)` para convite (dedupe de convite = `{agendamento_id}:convite`, ver `notificar-candidato/helpers.ts:29-41`).
> **Nota (RESEARCH linha 342):** a varredura NÃO incrementa `tentativas` — quem incrementa é a EF, só ao tentar (at-most-once do `pg_net`).

**Agendamento cron (idempotente)** — RESEARCH Pattern 2 (linhas 336-339). `cron.schedule('notif-retry-sweep', '*/15 * * * *', $sweep$ SELECT public.varrer_retry_notificacoes(); $sweep$)` no molde de `20260609000003:36-64`, com `cron.unschedule` guard antes (evita job duplicado — anti-pattern RESEARCH linha 381).

**RPC `ler_resend_webhook_secret()`** — mirror EXATO de `ler_resend_api_key()` (`20260722000001:54-83`): sem argumento, escopado ao literal `resend_webhook_secret`, `SECURITY DEFINER SET search_path=''`, retorna NULL graceful, `REVOKE FROM PUBLIC/anon/authenticated` + `GRANT EXECUTE TO service_role`.

**Apply em PROD (Pitfall 7, linhas 434-437):** via Supabase MCP `apply_migration` (NÃO `db push` — 42601 nos corpos `$$`) + reconcile do ledger. Sem wrapper `BEGIN;/COMMIT;` externo. **Checkpoint do orquestrador** (subagentes não têm MCP — bug #13898).

---

### `supabase/config.toml` (MODIFY — config)

**Analog:** bloco `[functions.notificar-candidato]` (linhas 29-31) — a EF de webhook é self-auth (assinatura Svix, não JWT):
```toml
# EF pública chamada pelo Resend — self-auth pela assinatura Svix (verify_jwt=false)
[functions.resend-webhook]
verify_jwt = false
```
> NÃO precisa de `import_map` (linha 43+): o `import_map` só serve às EFs que importam o
> `zod` bare do `deno.json`; a EF de webhook usa specifier `npm:svix@1.99.1` completo
> (não-bare), que o Deno resolve sozinho no deploy — mesmo caso de `npm:@anthropic-ai/sdk`
> em `analise-candidato-individual` (RESEARCH linha 99).

## Shared Patterns

### Self-auth EF via Vault (verify_jwt=false)
**Source:** `supabase/functions/analise-candidato-individual/index.ts:148-156` (Bearer) + `.../index.ts:378-408` (wiring); `config.toml:29-31` (posture).
**Apply to:** `resend-webhook/index.ts` (a autenticação passa a ser a assinatura Svix, mas mantém `verify_jwt=false` + service-role client); `notificar-candidato/index.ts` (mantém o Bearer via `NOTIFICAR_SECRET`).
```typescript
const bearer = (req.headers.get("Authorization") ?? "").startsWith("Bearer ")
  ? authHeader.slice("Bearer ".length).trim() : "";
if (!bearer || bearer !== deps.serviceKey) return errorResponse("UNAUTHORIZED", "Não autorizado.", 401);
```

### Leitura de segredo do Vault via RPC escopada
**Source:** `supabase/migrations/20260722000001_p36_vault_resend_reader.sql:54-83` (`ler_resend_api_key`); consumo em `notificar-candidato/index.ts:255-256`.
**Apply to:** nova RPC `ler_resend_webhook_secret()` na migration + consumo na EF de webhook. Sem argumento (blast-radius de 1 segredo), `SECURITY DEFINER SET search_path=''`, graceful NULL, `GRANT EXECUTE TO service_role` apenas.

### Hop `net.http_post` + Vault (trigger/cron → EF)
**Source:** `supabase/migrations/20260726000001_p39_rewire_triggers_aposenta_n8n.sql:83-111` (verbatim do `20260610000002_analise_trigger.sql`).
**Apply to:** `varrer_retry_notificacoes()` na migration. Lê `project_url`+`edge_invoke_key` do Vault, graceful-skip se NULL, `net.http_post` Bearer, `EXCEPTION WHEN OTHERS THEN RAISE WARNING`.
> **Pitfall 5 (RESEARCH linhas 422-426):** usar `edge_invoke_key` do Vault (== `NOTIFICAR_SECRET` da EF), NÃO `SUPABASE_SERVICE_ROLE_KEY` — a invariante está quebrada por rotação. Header errado → 401 na EF.

### Funções puras extraídas para testabilidade (sem `Deno.serve`)
**Source:** `notificar-candidato/helpers.ts:1-7` (docstring do porquê) + `_shared/email-config.ts:12-18` (regra ZERO IMPORTS).
**Apply to:** `resend-webhook/helpers.ts` (`mapEventoStatus`), `notificar-candidato/helpers.ts` (`computeProximaTentativa`), `email-config.ts` (`exigirSinkTeste`). Coração dos testes de CI (rodam sem `--allow-net`).

### Log seguro (allowlist — nunca PII/segredo)
**Source:** `notificar-candidato/helpers.ts:65-84` (`logSeguro`, allowlist `CHAVES_LOG_OK`).
**Apply to:** todos os `console.*` das EFs desta fase — só ids/evento/status. NUNCA logar `resend_webhook_secret`, `edge_invoke_key`, payload do webhook (traz `to`/`subject` — PII), corpo do email (Security V7, RESEARCH linhas 605, 617).

### Migration PL/pgSQL — apply via MCP, sem BEGIN/COMMIT externo
**Source:** `20260722000002_p37…:85-90`, `20260726000001_p39…:30-33`, `20260609000003…:24-29` (todas com a mesma nota de header).
**Apply to:** a migration da P41. Corpos `$$` (função da varredura + `cron.schedule`) adjacentes a COMMENT/REVOKE quebram o pooler (42601 — CLAUDE.md §Migrations). Apply via Supabase MCP `apply_migration` + reconcile — **checkpoint do orquestrador**.

## No Analog Found

Nenhum arquivo desta fase carece de analog. A única superfície genuinamente nova é a
biblioteca `npm:svix` (import estático), que não é código do repo mas tem proveniência
forte (lib oficial citada pela doc do Resend — RESEARCH §Package Legitimacy Audit). O
padrão de import `npm:` estático já existe (`analise…/index.ts:54-58`), então até o
mecanismo de import tem gêmeo vivo.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (nenhum) | — | — | Cobertura de analog = 100% |

**Nota sobre smoke SQL de fidelidade (Wave 0, RESEARCH linhas 575, 588):** o smoke que
verifica colunas novas + job cron `notif-retry-sweep` + predicado da seleção segue o padrão
gate-GUC de `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql` (referenciado em
`20260722000002:64`). É executado pelo orquestrador via MCP, não é arquivo de código-fonte de EF.

## Metadata

**Analog search scope:** `supabase/functions/` (EFs + `_shared` + `__tests__`), `supabase/migrations/` (P36/P37/P38/P39 + cron P09), `supabase/config.toml`, `.github/workflows/ci.yml`.
**Files scanned:** ~18 (11 lidos integralmente; migrations e config por seção-alvo).
**Skills:** nenhum diretório `.claude/skills/` ou `.agents/skills/` presente.
**CLAUDE.md:** lido — §Migrations (workaround 42601), §Security Rules (nunca service_role no client; segredos só no Vault), §Key Conventions (pt-BR domínio, en técnico) aplicados.
**Pattern extraction date:** 2026-07-26
