# Phase 41: Reconciliação de Entrega, Retry & Testing - Research

**Researched:** 2026-07-26
**Domain:** Resend delivery webhooks (Svix), pg_cron/pg_net retry sweep, Deno edge-function testing
**Confidence:** HIGH (todas as decisões travadas têm precedente vivo no repo + doc oficial citada)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1 — Retry sweep (`pg_cron`, RECON-03)**
- **Cadência:** varredura a cada **15 min** (dentro da janela ~6h do `net._http_response`).
- **Cap de tentativas:** **5** — após isso a linha permanece `falhou` (sem retry infinito).
- **Backoff:** **exponencial** via `proxima_tentativa_em` (≈15m → 1h → 6h → 24h), com teto.
- **Mecanismo:** a varredura **re-invoca a EF `notificar-candidato` em modo retry** (reusa o caminho de envio já provado), NÃO re-POSTa ao Resend em paralelo. A EF precisa de um entrypoint de retry que RE-tente uma linha `pendente`/`falhou` existente (em vez de colapsar em `skipped:duplicate` pelo `dedupe_key`). Seleção: `status IN ('pendente','falhou') AND tentativas < 5 AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= now())` — cobre o índice parcial vivo `idx_notif_retry`.

**Área 2 — Webhook EF + delivery/bounce/complaint (RECON-01, RECON-02)**
- **Verificação de assinatura:** **Svix** (import `npm:` **estático** no topo — Pitfall do `.join("npm:")`), EF com `verify_jwt=false` (webhook público, self-auth pela assinatura Svix).
- **Mapeamento evento → status:** `email.delivered` → `entregue` (+ `entregue_em`); `email.bounced` → `bounce` (+ `bounce_em`); `email.complained` → `reclamado` (+ `reclamado_em`).
- **Colunas novas:** migration aditiva adiciona **`reclamado_em`** (deferido da P37) **+ `bounce_em`** `timestamptz` NULL. (`enviado_em`/`entregue_em` já existem; `status_notificacao` já tem `bounce`/`reclamado`.)
- **Matching:** por `provider_message_id`; evento com id desconhecido é ignorado graciosamente (log, sem erro). Idempotência: um webhook repetido para o mesmo id/status é no-op.
- **Segredo de assinatura:** no **Vault** (novo secret, ex.: `resend_webhook_secret`), espelhando o padrão de `resend_api_key`; a EF lê via service-role.

**Área 3 — Testing & safety (RECON-02, RECON-03)**
- **CI:** **mockar o `fetch` do Resend** (sem chave viva) + unit-tests da verificação de assinatura e do mapeamento evento→status. Deno test para a EF; Vitest para qualquer utilitário `src/` (não previsto — é tudo backend EF).
- **Guard de destinatário non-prod:** **hard-fail** em modo `teste` se o destinatário não for um sink `*@resend.dev` (estende `_shared/email-config.ts`, que já redireciona em modo teste).
- **UAT ao vivo:** `delivered@`/`bounced@`/`complained@resend.dev` exercitando a reconciliação ponta-a-ponta — **DEFERIDO atrás de DELIV-01** (domínio `rh.beautysmile.com.br` não verificado).
- **Rate limits:** o planner/research **verifica os números de free-tier/rate-limit do Resend na doc** antes de fixar a cadência/batch-size da varredura (RESOLVIDO abaixo — ver §Standard Stack / §Open Questions).

### Claude's Discretion
- Forma exata do entrypoint de retry da EF (flag no body vs. rota dedicada), tamanho de batch da varredura, nomes internos de funções/arquivos, e a curva exata do backoff dentro do teto — à discrição do executor, respeitando as decisões acima.

### Deferred Ideas (OUT OF SCOPE)
- **Supressão automática** de destinatários com bounce/complaint (lista de exclusão) → LGPD-OPS/M8+.
- **Retenção/purga** de `notificacoes_enviadas` → LGPD-OPS/M8+.
- Tratamento de `email.delivery_delayed` (só delivered/bounced/complained no v1).
- Nudge de bounce no painel do candidato → M7-v2/backlog.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **RECON-01** | `notificacoes_enviadas` implementa a state machine `pendente → enviado → entregue/falhou/bounce` — status reflete o resultado real do envio (funil avança independentemente). | State machine já modelada no enum `status_notificacao` (P37, migration `20260721000001`) + COMMENT de contrato na coluna `status`. Esta fase completa as transições finais (`entregue`/`bounce`/`reclamado`) via webhook. Ver §Architecture Patterns / §Code Examples. |
| **RECON-02** | EF de webhook do Resend (assinatura Svix verificada) atualiza o status por `provider_message_id` nos eventos `email.delivered`/`email.bounced`/`email.complained`. | `npm:svix` `Webhook.verify` (import estático) + payload `data.email_id`; match por `idx_notif_provider_msg` (índice parcial já vivo). Migration aditiva adiciona `bounce_em`+`reclamado_em`. Ver §Architecture Patterns Pattern 1, §Code Examples. |
| **RECON-03** | Varredura `pg_cron` re-tenta linhas `pendente`/`falhou` (tentativas-capped) como rede de segurança para a janela ~6h do `net._http_response`. | `cron.schedule('*/15 * * * *', ...)` (precedente vivo `20260609000003`) → função SQL SECURITY DEFINER que faz `net.http_post` re-invocando a EF em modo retry (precedente `20260726000001` P39 + `20260610000002`). Backoff exponencial computado na EF. Ver §Architecture Patterns Pattern 2 & 3. |
</phase_requirements>

## Summary

Esta é a última fase do M7. Ela fecha o loop fire-and-forget do pipeline de notificação sobre infraestrutura que **já está toda viva em PROD**: a tabela `notificacoes_enviadas` retry-ready (P37), a EF `notificar-candidato` provada (P38), e os 3 triggers canônicos disparando (P39). Nenhum dos três mecanismos desta fase é greenfield — cada um tem um precedente exato no repositório que deve ser copiado, não reinventado.

Os três mecanismos são ortogonais: (1) uma **EF de webhook** que o Resend chama nos eventos de entrega e que reconcilia o `status` por `provider_message_id` (verificação de assinatura via `npm:svix`, `verify_jwt=false`); (2) uma **varredura `pg_cron`** a cada 15 min que re-invoca a EF `notificar-candidato` em modo retry para linhas `pendente`/`falhou` sob cap de 5 tentativas com backoff exponencial; e (3) **testes CI** (Deno) com o `fetch` do Resend mockado + guard de destinatário non-prod que hard-falha se o destinatário não for `*@resend.dev`.

A restrição operacional dominante é **DELIV-01 aberto**: `rh.beautysmile.com.br` não está verificado no Resend, então todo envio grava `falhou` (403). Isso significa que a fase entrega e testa a maquinaria de recuperação, mas o UAT ao vivo (delivered/bounced/complained) só fecha depois da verificação DNS do Fernando. Enquanto isso, a varredura acumula linhas `falhou` até o cap — exatamente o cenário que esta fase resolve.

**Primary recommendation:** Construa a EF de webhook copiando o esqueleto self-auth de `analise-candidato-individual` (mas troque o Bearer-check por `Webhook.verify` do Svix); construa a varredura copiando o hop `net.http_post`+Vault de `20260726000001` (P39) dentro de uma função SQL agendada por `cron.schedule` no padrão de `20260609000003`; adicione um branch de retry mínimo na EF `notificar-candidato` gateado por um `retry_id` no body que pula o claim-before-send e re-tenta uma linha existente. Todo apply em PROD é **checkpoint do orquestrador** (subagentes não recebem MCP Supabase — bug #13898).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Verificação de assinatura do webhook | API / Backend (nova EF `resend-webhook`) | — | Endpoint público chamado pelo Resend; a autenticação É a assinatura Svix, não um JWT de usuário → `verify_jwt=false`. |
| Reconciliação de status por `provider_message_id` | API / Backend (EF webhook, service-role) | Database (índice `idx_notif_provider_msg`) | Só `service_role` escreve em `notificacoes_enviadas` (RLS candidato-DENY, sem policy de UPDATE). O match usa o índice parcial já vivo. |
| Agendamento da varredura | Database (`pg_cron`) | — | `pg_cron` roda dentro do Postgres; não há servidor Node próprio. Precedente `20260609000003`. |
| Re-invocação da EF de envio | Database (`pg_net` `net.http_post`) → API (EF `notificar-candidato`) | Vault (`project_url`+`edge_invoke_key`) | A varredura NÃO re-POSTa ao Resend; delega à EF provada (reuso do caminho de envio). Hop idêntico ao dos triggers P39. |
| Envio + state transition (retry) | API / Backend (EF `notificar-candidato`, branch retry) | Database (`notificacoes_enviadas`) | A EF é a única dona da lógica de envio, render e escrita do ledger. O branch de retry re-tenta uma linha existente. |
| Guard de destinatário non-prod | API / Backend (`_shared/email-config.ts`) | CI (Deno test) | Extensão do contrato de modo/destinatário já centralizado; testado sem rede. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `svix` (via `npm:svix`) | **1.99.1** (latest, publicado 2026-07-23) | `Webhook.verify(payload, headers)` — verifica a assinatura Svix do webhook do Resend | É a biblioteca oficial da Svix, **explicitamente citada na doc do Resend** para verificação de webhooks. Resend usa Svix como sua infra de webhooks. `[VERIFIED: npm registry]` `[CITED: resend.com/docs/dashboard/webhooks/verify-webhooks-requests]` |
| `pg_cron` | extensão Supabase (já habilitada — precedente `20260609000003`) | Agenda a varredura de retry `*/15 * * * *` | Padrão Supabase para jobs recorrentes no Postgres; já em uso no repo. `[VERIFIED: codebase]` |
| `pg_net` (`net.http_post`) | extensão Supabase (já viva via SEC-03/P39) | Re-invoca a EF a partir da função agendada | Já é o hop trigger→EF do repo inteiro. `[VERIFIED: codebase 20260726000001]` |
| `@supabase/supabase-js` | `@2` (esm.sh, mesma pin do repo) | Client service-role dentro da EF de webhook | Import idêntico ao de `notificar-candidato`/`analise-candidato-individual`. `[VERIFIED: codebase]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `https://deno.land/std@0.224.0/assert/mod.ts` | 0.224.0 | asserts nos Deno tests | Mesma pin do teste vivo `notificar-candidato.test.ts`. `[VERIFIED: codebase]` |
| Web Crypto (`crypto.subtle`) | nativo do Deno edge | **Alternativa** manual HMAC-SHA256 (ver Alternatives) | Só se quiser zero-new-npm; a decisão travada é `npm:svix`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npm:svix` `Webhook.verify` | Verificação manual HMAC-SHA256 via Web Crypto (`crypto.subtle`), zero npm | Preserva a política "zero npm novo" do repo, mas re-implementa: decode do `whsec_`+base64, `HMAC-SHA256` sobre `${svix-id}.${svix-timestamp}.${body}`, split das assinaturas `v1,...` space-delimited, e comparação **constant-time**. **CONTEXT trava `npm:svix`** — o STACK/M7 já sanciona esse import como a exceção explícita à regra zero-npm. Manter Svix; a rota manual fica documentada como fallback caso `npm:svix` dê problema no Deno. `[CITED: docs.svix.com/receiving/verifying-payloads/how-manual]` |
| `import { Webhook } from "npm:svix"` | `https://esm.sh/svix@1.99.1` ou `https://cdn.skypack.dev/svix` | O blog da Svix p/ Supabase usa `cdn.skypack.dev`; esm.sh também serve (HTTP 200 confirmado). **CONTEXT trava `npm:` estático** (evita o Pitfall do `.join("npm:")` que quebrou a análise IA). Deno 2.7.7 (CI + local) resolve `npm:svix` CJS→ESM nativamente. Ficar com `npm:svix`. |
| Varredura re-POSTa ao Resend direto | Re-invocar a EF `notificar-candidato` (modo retry) | **CONTEXT trava re-invocação da EF** — evita duplicar a lógica de envio/render/ledger em SQL e mantém uma única fonte da verdade do envio. |
| Fila externa (pgmq/QStash/BullMQ) | `notificacoes_enviadas` + `pg_net` + `pg_cron` | Overkill p/ 4 eventos neste volume (exclusão explícita do REQUIREMENTS.md). |

**Installation:** Nenhum `npm install` no `package.json` raiz. O único pacote novo é `npm:svix`, importado **estaticamente no topo da EF de webhook** (Deno resolve no deploy; nenhuma entrada em `config.toml`/`import_map` é necessária porque é um specifier `npm:` completo, não bare — mesmo padrão de `npm:@anthropic-ai/sdk` em `analise-candidato-individual`).

```typescript
// No TOPO da EF de webhook — NUNCA runtime-constructed `["npm:","svix"].join("")`.
import { Webhook } from "npm:svix@1.99.1";
```

**Version verification (executada nesta sessão):**
```
npm view svix version        → 1.99.1
npm view svix time.modified  → 2026-07-23T16:19:33Z
npm view svix repository.url → git+https://github.com/svix/svix-webhooks.git
downloads (última semana)    → 5,768,574
scripts.postinstall          → (nenhum)
```

## Package Legitimacy Audit

> slopcheck **não pôde ser instalado** nesta sessão (`pip install slopcheck` indisponível no ambiente). Per protocolo de graceful-degradation, o pacote abaixo seria marcado `[ASSUMED]` — **exceto** que `svix` tem proveniência forte por outra via: é **citado nominalmente na doc oficial do Resend** como a biblioteca de verificação, é a lib oficial da própria Svix (a infra de webhooks que o Resend usa), com 5.7M downloads/semana e repositório oficial. Recomendação ao planner: manter, mas inserir **um único `checkpoint:human-verify`** antes do primeiro deploy da EF de webhook confirmando `npm:svix@1.99.1` no `deno.lock`.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `svix` | npm | ~5 anos (org Svix, ativo; latest 2026-07-23) | 5.77M/semana | github.com/svix/svix-webhooks | n/d (slopcheck indisponível) | **Approved** — citado por doc oficial Resend + sem postinstall |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Postinstall scripts:** `svix` não tem `postinstall` (verificado via `npm view svix scripts.postinstall` → vazio).

## Architecture Patterns

### System Architecture Diagram

```
  ┌─────────────────────── FLUXO DE ENTREGA (RECON-01/02) ──────────────────────┐
  │                                                                               │
  │  Trigger P39 ──net.http_post──> EF notificar-candidato ──fetch──> Resend API  │
  │  (funil)                          │  grava enviado + provider_message_id       │
  │                                   ▼                                            │
  │                          notificacoes_enviadas                                 │
  │                          (status=enviado)                                      │
  │                                   ▲                                            │
  │                                   │ UPDATE por provider_message_id             │
  │                                   │ (idx_notif_provider_msg)                   │
  │  Resend  ──POST webhook──> EF resend-webhook (verify_jwt=false)                │
  │  (email.delivered/          1. Webhook.verify(rawBody, svix-headers)  [Svix]   │
  │   bounced/complained)       2. lê data.email_id                                │
  │                             3. mapeia type → status + timestamp col            │
  │                             4. id desconhecido → 200 no-op (graceful)          │
  │                             → status=entregue|bounce|reclamado                 │
  │                                                                               │
  └───────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────── REDE DE SEGURANÇA (RECON-03) ────────────────────────┐
  │                                                                               │
  │  pg_cron '*/15 * * * *' ──> varrer_retry_notificacoes()  [SECURITY DEFINER]   │
  │                              SELECT ... WHERE status IN ('pendente','falhou')  │
  │                                AND tentativas < 5                              │
  │                                AND (proxima_tentativa_em IS NULL               │
  │                                     OR proxima_tentativa_em <= now())          │
  │                                ORDER BY proxima_tentativa_em NULLS FIRST       │
  │                                LIMIT <batch>            [idx_notif_retry]      │
  │                              FOR EACH row:                                     │
  │                                net.http_post(EF notificar-candidato,           │
  │                                  body={retry_id, evento, candidatura_id,       │
  │                                        agendamento_id?}, Bearer edge_invoke_key)│
  │                                        │                                       │
  │                                        ▼                                       │
  │                              EF notificar-candidato [BRANCH RETRY]             │
  │                                skip claim → re-tenta linha existente           │
  │                                sucesso → enviado / falha → tentativas++,       │
  │                                          proxima_tentativa_em=backoff(n)       │
  │                                                                               │
  └───────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
supabase/functions/
├── resend-webhook/              # NOVA EF (nome à discrição)
│   ├── index.ts                 # Deno.serve gateado por import.meta.main (testável)
│   ├── helpers.ts               # funções PURAS: mapEventoStatus(type)→{status,col}, parse
│   └── __tests__/
│       └── resend-webhook.test.ts   # assinatura + mapeamento, SEM --allow-net
├── notificar-candidato/
│   ├── index.ts                 # + branch retry (retry_id no body) — mudança MÍNIMA
│   ├── helpers.ts               # + computeBackoff(tentativas) puro (unit-testável)
│   └── __tests__/notificar-candidato.test.ts  # + testes do backoff + guard non-prod
└── _shared/
    └── email-config.ts          # + guard hard-fail non-prod (exigirSinkTeste())

supabase/migrations/
└── 202607XXXXXXXX_p41_recon.sql # ADITIVA: ADD bounce_em, reclamado_em + cron.schedule
```

### Pattern 1: EF de webhook com verificação Svix (RECON-02)

**What:** EF pública (`verify_jwt=false`) que o Resend chama; autentica pela assinatura Svix, não por JWT.
**When to use:** Todo webhook de provedor que usa Svix (Resend, e outros).
**Chaves:**
- Precisa do **corpo bruto (texto)** — `await req.text()` ANTES de qualquer `JSON.parse`. Qualquer reserialize quebra a assinatura.
- Os 3 headers: `svix-id`, `svix-timestamp`, `svix-signature`.
- `wh.verify()` lança em assinatura inválida → responder 400. Sucesso → devolve o payload parseado.
- Reusa o esqueleto de `analise-candidato-individual` (import.meta.main + handler testável + `createClient` service-role + `errorResponse`/CORS), **substituindo** o self-auth Bearer pela verificação Svix.

```typescript
// Source: resend.com/docs/dashboard/webhooks/verify-webhooks-requests + svix.com/blog (Deno)
import { Webhook } from "npm:svix@1.99.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request): Promise<Response> => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Segredo do Vault (mirror ler_resend_api_key) — NUNCA logado/interpolado.
  const { data: whsec } = await supabaseAdmin.rpc("ler_resend_webhook_secret");
  if (!whsec || typeof whsec !== "string") {
    console.error("[resend-webhook] webhook secret ausente no Vault");
    return new Response("misconfigured", { status: 500 });
  }

  const rawBody = await req.text(); // corpo BRUTO — não parsear antes de verificar
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let evt: { type: string; data: { email_id?: string } };
  try {
    evt = new Webhook(whsec).verify(rawBody, headers) as typeof evt; // lança se inválida
  } catch {
    console.warn("[resend-webhook] assinatura Svix inválida");
    return new Response("invalid signature", { status: 400 });
  }

  const emailId = evt.data?.email_id;
  const mapped = mapEventoStatus(evt.type); // helper puro; ver Pattern abaixo
  if (!emailId || !mapped) {
    return new Response("ignored", { status: 200 }); // tipo não tratado — graceful
  }

  // Match por provider_message_id; id desconhecido = no-op (id de outro sistema/reenvio).
  const patch: Record<string, unknown> = { status: mapped.status };
  patch[mapped.col] = new Date().toISOString();
  await supabaseAdmin
    .from("notificacoes_enviadas")
    .update(patch)
    .eq("provider_message_id", emailId);
  // .update sem match afeta 0 linhas → naturalmente idempotente/no-op p/ id desconhecido.

  return new Response("ok", { status: 200 });
});
```

**Mapeamento (helper puro, unit-testável — o coração dos testes de CI):**
```typescript
// Source: resend.com/docs/webhooks/event-types
export function mapEventoStatus(
  type: string,
): { status: "entregue" | "bounce" | "reclamado"; col: "entregue_em" | "bounce_em" | "reclamado_em" } | null {
  switch (type) {
    case "email.delivered":  return { status: "entregue",  col: "entregue_em" };
    case "email.bounced":    return { status: "bounce",    col: "bounce_em" };
    case "email.complained": return { status: "reclamado", col: "reclamado_em" };
    default:                 return null; // delivery_delayed/sent/opened/clicked = ignorados no v1
  }
}
```

### Pattern 2: Varredura `pg_cron` → função SQL → `net.http_post` (RECON-03)

**What:** Job `pg_cron` a cada 15 min que chama uma função SQL que re-invoca a EF para cada linha elegível.
**When to use:** Rede de segurança para trabalho assíncrono cujo `net.http_post` inicial pode ter se perdido (at-most-once, janela ~6h).
**Chaves:**
- A função é `SECURITY DEFINER SET search_path = ''` com refs qualificadas (`vault.decrypted_secrets`, `net.http_post`, `public.notificacoes_enviadas`) — idioma verbatim de `20260726000001` (P39).
- Lê `project_url` + `edge_invoke_key` do Vault; graceful-skip se NULL.
- `LIMIT <batch>` + `ORDER BY proxima_tentativa_em NULLS FIRST` — cobre `idx_notif_retry`.
- Para `convite`, o `agendamento_id` sai do `dedupe_key` (`split_part(dedupe_key, ':', 1)`), pois não há coluna dedicada (a `dedupe_key` de convite é `{agendamento_id}:convite`).

```sql
-- Source: precedente vivo 20260726000001 (P39) + 20260609000003 (cron) + 20260610000002
CREATE OR REPLACE FUNCTION public.varrer_retry_notificacoes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_project_url text;
  v_invoke_key  text;
  r             record;
BEGIN
  SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key  FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN; -- graceful-skip
  END IF;

  FOR r IN
    SELECT id, evento, candidatura_id, dedupe_key
      FROM public.notificacoes_enviadas
     WHERE status IN ('pendente','falhou')
       AND tentativas < 5
       AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= pg_catalog.now())
     ORDER BY proxima_tentativa_em NULLS FIRST
     LIMIT 20   -- batch cap (à discrição; ver §Open Questions rate-limit/free-tier)
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/notificar-candidato',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_invoke_key
        ),
        body := jsonb_build_object(
          'retry_id', r.id,               -- sinaliza o branch de retry na EF
          'evento', r.evento,
          'candidatura_id', r.candidatura_id,
          'agendamento_id',
            CASE WHEN r.evento = 'convite'
                 THEN split_part(r.dedupe_key, ':', 1) END  -- {agendamento_id}:convite
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'varrer_retry: dispatch falhou id=% (%: %)', r.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.varrer_retry_notificacoes() FROM PUBLIC;

-- Agendamento (precedente 20260609000003). Idempotência do apply: unschedule antes.
SELECT cron.unschedule('notif-retry-sweep')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notif-retry-sweep');
SELECT cron.schedule('notif-retry-sweep', '*/15 * * * *',
  $sweep$ SELECT public.varrer_retry_notificacoes(); $sweep$);
```

> **Nota de dispatch counting:** a varredura NÃO incrementa `tentativas` — o `net.http_post` é at-most-once, então a varredura não sabe o resultado. Quem incrementa `tentativas` e grava `proxima_tentativa_em` é a EF, **só quando de fato tenta enviar**. Um `net.http_post` que se perde (EF fora do ar) NÃO queima uma tentativa — a próxima varredura re-tenta. Correto.

### Pattern 3: Branch de retry na EF `notificar-candidato` (mudança mínima)

**What:** Um branch opt-in gateado por `retry_id` no body que pula o claim-before-send e re-tenta uma linha existente.
**Why:** Hoje um 2º disparo colapsa em `skipped:duplicate` porque o `upsert ... onConflict dedupe_key ignoreDuplicates` não retorna id (index.ts:200-207). O retry precisa deliberadamente re-tentar a linha existente.

**Mudança mínima recomendada (preserva o caminho normal byte-a-byte):**
1. No parse do body, aceitar `retry_id?: string` opcional.
2. **Se `retry_id` presente** (branch retry): pular o passo 5 (claim). Em vez disso:
   - `SELECT id, status, tentativas, dedupe_key FROM notificacoes_enviadas WHERE id = retry_id`.
   - **Guard:** se ausente, ou `status NOT IN ('pendente','falhou')`, ou `tentativas >= 5` → `return 200 { skipped: "nao_elegivel" }`.
   - Seguir para o passo 6-8 normal (resolver dados, render, enviar), mas nas escritas de falha/sucesso usar `WHERE id = retry_id` e **incrementar** `tentativas` (não setar `1`).
3. **Se `retry_id` ausente** (caminho normal): fluxo atual **inalterado**.

**Backoff (helper puro em `helpers.ts`, unit-testável):**
```typescript
// ≈15m → 1h → 6h → 24h, cap 24h, cap 5 tentativas. Indexado pela NOVA contagem.
const BACKOFF_MS = [
  15 * 60_000,        // após tentativa 1 → +15min
  60 * 60_000,        // após tentativa 2 → +1h
  6 * 60 * 60_000,    // após tentativa 3 → +6h
  24 * 60 * 60_000,   // após tentativa 4 → +24h
];
/** Retorna ISO da próxima tentativa, ou null quando esgotou o cap (fica falhou). */
export function computeProximaTentativa(novasTentativas: number): string | null {
  if (novasTentativas >= 5) return null;              // cap: sem mais retries
  const ms = BACKOFF_MS[novasTentativas - 1] ?? BACKOFF_MS.at(-1)!;
  return new Date(Date.now() + ms).toISOString();
}
```
Unifique `registrarFalha` (index.ts:238) para usar esse helper: no caminho normal `novasTentativas = 1`; no retry `novasTentativas = row.tentativas + 1`. Resultado idêntico ao 15-min hardcoded atual para o primeiro fail, mas correto para os subsequentes.

**Cinto secundário recomendado (LEDGER-02, hoje ausente):** adicionar o header `Idempotency-Key` ao `fetch` do Resend usando a `dedupe_key` (ou `retry_id`). O Resend suporta `Idempotency-Key` (máx 256 chars, janela 24h) — assim um re-send dentro de 24h para a mesma chave é no-op no Resend, tornando o retry seguro contra double-send mesmo se duas varreduras se sobrepuserem. `[CITED: resend.com/docs/api-reference/emails/send-email]`

### Anti-Patterns to Avoid
- **Parsear o body antes de `Webhook.verify`:** qualquer `JSON.parse`+reserialize muda whitespace e quebra a assinatura. Sempre `req.text()` primeiro.
- **Import `npm:` dinâmico/runtime-constructed** (`["npm:","svix"].join("")`): esconde o pacote do deploy → `ERR_MODULE_NOT_FOUND` no runtime (foi exatamente o bug que fez a EF de análise nunca extrair CV). Import estático no topo.
- **Recriar o índice de retry ou de provider_msg:** ambos já vivem em PROD (`idx_notif_retry`, `idx_notif_provider_msg`). Nada de `CREATE INDEX` — a migration da P37 já provou isso.
- **`cron.schedule` sem `unschedule` antes:** re-aplicar duplicaria o job. Guard com `cron.unschedule`.
- **Logar/interpolar o `resend_webhook_secret` ou o `edge_invoke_key`:** só ids/evento/status nos logs (helper `logSeguro` já existe).
- **A varredura incrementar `tentativas`:** ela não sabe o resultado (at-most-once). Só a EF incrementa, ao tentar.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verificação de assinatura do webhook | HMAC-SHA256 manual + parse de headers + constant-time compare | `npm:svix` `Webhook.verify` | Svix trata timestamp tolerance, múltiplas assinaturas `v1,`, e comparação constant-time. Errar constant-time compare é uma vuln de timing real. (Web Crypto manual é fallback documentado, não o padrão.) |
| Agendamento recorrente | Loop/setInterval numa EF, ou serviço externo | `pg_cron` `cron.schedule` | Roda no Postgres, sobrevive a restart, precedente vivo. |
| Fila de retry | pgmq/Redis/broker | `notificacoes_enviadas` + `idx_notif_retry` + `pg_cron` | Exclusão explícita do REQUIREMENTS.md — overkill p/ 4 eventos. |
| Idempotência de double-send no retry | Lock/dedupe caseiro | `UNIQUE(dedupe_key)` (já vivo) + header `Idempotency-Key` do Resend | Durável no DB + 24h no provedor. |
| Cleanup do `net._http_response` | Job de purga manual | `pg_net.ttl` (default 6h, automático) | pg_net já limpa sozinho. `[CITED]` |

**Key insight:** Todo componente desta fase tem um gêmeo já vivo em PROD. O trabalho é adaptação cirúrgica de padrões provados, não construção nova. A única dependência genuinamente nova é `npm:svix`, e essa é a lib oficial que o próprio Resend manda usar.

## Common Pitfalls

### Pitfall 1: Assinatura Svix quebrada por body reparseado
**What goes wrong:** `Webhook.verify` sempre falha com 400 mesmo com segredo correto.
**Why:** O código parseou/reserializou o JSON antes de verificar, mudando bytes/whitespace.
**How to avoid:** `const rawBody = await req.text()` primeiro; passar `rawBody` cru a `verify`; só depois `JSON.parse` (ou usar o objeto que `verify` devolve).
**Warning signs:** 100% dos webhooks falhando verificação em staging.

### Pitfall 2: `npm:svix` no runtime Deno edge (CJS)
**What goes wrong:** Teoria de que a lib CJS não roda no Deno edge.
**Why:** `svix` é `type: commonjs` (`dist/index.js`). Deno 2.7.7 (CI + local) faz CJS→ESM interop nativamente para specifiers `npm:`, e polyfilla `node:crypto`.
**How to avoid:** Import estático `import { Webhook } from "npm:svix@1.99.1"`. Confirmar no `deno.lock` após o primeiro `deno check`. Se por acaso `verify` reclamar de crypto, o fallback é a rota Web Crypto manual (documentada em Alternatives).
**Warning signs:** `ERR_MODULE_NOT_FOUND` no deploy = import dinâmico/bare; `crypto is not defined` = versão de Deno antiga (não é o caso aqui).
**Confidence:** MEDIUM-HIGH — `npm:svix` no Deno é padrão comum (blog Svix usa `cdn.skypack.dev/svix`; `npm:` é o equivalente sancionado pelo repo). Validar no smoke da EF.

### Pitfall 3: `Webhook.verify` — síncrono vs `await`
**What goes wrong:** Dúvida se precisa `await`.
**Why:** Na lib JS da Svix `verify` é **síncrono** (retorna o payload verificado); o blog da Svix mostra `await webhook.verify(...)`, que é inofensivo (await de valor não-Promise é o próprio valor).
**How to avoid:** Ambos funcionam. Sem `await` é mais fiel à API; com `await` não quebra. Envolver em try/catch (lança em falha).

### Pitfall 4: Janela ~6h do `net._http_response` / at-most-once
**What goes wrong:** Assumir que o `net.http_post` da varredura é confiável ou que a resposta fica guardada.
**Why:** `net._http_response` é tabela **unlogged** com TTL default **6h** (`pg_net.ttl`); `net.http_post` é fire-and-forget/at-most-once (pode se perder num restart). `[CITED: supabase.com/docs/.../pg_net]`
**How to avoid:** É por isso que a varredura existe e roda a **cada 15 min** (bem dentro dos 6h). Não depender da resposta do `net.http_post`; a EF é quem grava o resultado no ledger. A cadência de 15 min garante múltiplas chances dentro da janela.

### Pitfall 5: `edge_invoke_key != service_role` (rotação — gap da P38)
**What goes wrong:** A varredura re-invoca a EF e leva 401.
**Why:** A invariante `edge_invoke_key == SUPABASE_SERVICE_ROLE_KEY` está **quebrada por rotação** (STATE: `edge_invoke_key`/`ANALISE_SECRET`=`823aa757…` ≠ service_role injetada=`085073ec…`). A EF `notificar-candidato` só aceita o Bearer via `NOTIFICAR_SECRET` (setado = `edge_invoke_key` na P38). Os triggers P39 usam `edge_invoke_key` do Vault — a varredura DEVE usar **o mesmo** `edge_invoke_key`.
**How to avoid:** A varredura lê `edge_invoke_key` do Vault (idêntico aos triggers P39). Se, ao apply, a EF levar 401, checar que `NOTIFICAR_SECRET` (env da EF) == `edge_invoke_key` (Vault). Não usar `SUPABASE_SERVICE_ROLE_KEY` no header da varredura.
**Warning signs:** Linhas nunca saem de `pendente`/`falhou` apesar da varredura rodar; log da EF com `UNAUTHORIZED`.

### Pitfall 6: Free-tier do Resend estoura no flush do backlog
**What goes wrong:** Depois que DELIV-01 fechar, o backlog acumulado de `falhou` é flushado de uma vez e estoura o cap de 100 e-mails/dia do free-tier.
**Why:** Free-tier = **100 emails/dia, 3.000/mês** `[CITED: resend.com/pricing]`. Com a varredura a cada 15 min (96 sweeps/dia) e um batch grande, um backlog de dias vira uma rajada.
**How to avoid:** `LIMIT` no batch (recomendo ≤20 por sweep como ponto de partida) + considerar plano Pro ($20/mês, 50k/mês, sem cap diário) **antes** de verificar o domínio se o backlog for grande. Enquanto DELIV-01 aberto, os 403 provavelmente NÃO consomem quota (rejeitados antes do envio), mas isso deve ser confirmado no UAT.
**Warning signs:** `429` (rate-limit, 10 req/s) ou erros de quota diária nos logs da EF após DELIV-01.

### Pitfall 7: 42601 no apply de PL/pgSQL adjacente a COMMENT/GRANT
**What goes wrong:** `supabase db push` falha com `SQLSTATE 42601`.
**Why:** Corpos `$$` (função da varredura, `cron.schedule`) adjacentes a COMMENT/REVOKE quebram o parser de prepared-statement do pooler. Documentado no CLAUDE.md §Migrations e reincidente em toda migration PL/pgSQL do repo.
**How to avoid:** Apply via **Supabase MCP `apply_migration`** (não `db push`) + `reconcile` do ledger — checkpoint do orquestrador (subagentes não têm MCP, bug #13898). Sem wrapper `BEGIN;/COMMIT;` externo. Precedente: P37-04, P39-04.

## Code Examples

### Migration aditiva (colunas + agendamento) — RECON-01/03

```sql
-- Source: padrão aditivo P37 (20260722000002) + cron P09 (20260609000003)
-- Apply via MCP apply_migration + reconcile (NÃO db push). Sem BEGIN/COMMIT externo.

-- Colunas finais da state machine (bounce_em deferido da P37; reclamado_em idem).
-- enviado_em/entregue_em JÁ existem; status_notificacao JÁ tem bounce/reclamado.
ALTER TABLE public.notificacoes_enviadas ADD COLUMN bounce_em    timestamptz;
ALTER TABLE public.notificacoes_enviadas ADD COLUMN reclamado_em timestamptz;

COMMENT ON COLUMN public.notificacoes_enviadas.bounce_em IS
  'M7/P41 RECON-02: timestamp do email.bounced (webhook Resend). NULL até o bounce.';
COMMENT ON COLUMN public.notificacoes_enviadas.reclamado_em IS
  'M7/P41 RECON-02: timestamp do email.complained (webhook Resend). NULL até a reclamacao.';

-- (função varrer_retry_notificacoes + cron.schedule — ver Pattern 2)
```

### Deno test do webhook — SEM `--allow-net` (RECON-02, CI)

```typescript
// Source: padrão vivo notificar-candidato.test.ts + analise __tests__ (deps injetadas)
// Roda em: deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapEventoStatus } from "../helpers.ts";

Deno.test("RECON-02 — mapeia os 3 eventos e ignora o resto", () => {
  assertEquals(mapEventoStatus("email.delivered"),  { status: "entregue",  col: "entregue_em" });
  assertEquals(mapEventoStatus("email.bounced"),    { status: "bounce",    col: "bounce_em" });
  assertEquals(mapEventoStatus("email.complained"), { status: "reclamado", col: "reclamado_em" });
  assertEquals(mapEventoStatus("email.delivery_delayed"), null);
  assertEquals(mapEventoStatus("email.opened"), null);
});
```
Para testar a **verificação de assinatura** sem rede: gerar headers válidos com o mesmo `Webhook` (a Svix expõe `wh.sign(msgId, timestamp, payload)` para produzir uma assinatura de teste), depois assertar que `verify` aceita a boa e rejeita a adulterada. Isso não usa `--allow-net` (só crypto local).

### Guard de destinatário non-prod (RECON-03/DELIV-03)

```typescript
// Source: extensão de _shared/email-config.ts (contrato de modo/destinatário P36)
/** Hard-fail em modo teste se o destinatário efetivo não for um sink *@resend.dev. */
export function exigirSinkTeste(paraEfetivo: string, modo: ModoNotificacao): void {
  if (modo === "teste" && !/@resend\.dev$/i.test(paraEfetivo)) {
    throw new Error(
      `[email-config] modo=teste mas destinatario "${paraEfetivo}" não é sink *@resend.dev — envio abortado (DELIV-03).`,
    );
  }
}
```
Chamado na EF `notificar-candidato` logo após `resolverDestinatario`, antes do `fetch`. Testável puro (sem rede). Nota: como o email real do candidato viaja no erro, o log deve usar `logSeguro`/mascarar — no throw, não incluir PII na mensagem que vai para log estruturado (a mensagem acima cita o destinatário efetivo, que em teste já é o sink, não o real; validar).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Reconciliação de entrega via n8n (SEC-03) | Webhook nativo Resend→EF + `pg_cron` retry | M7 (P39 aposentou n8n; P41 fecha o loop) | Zero superfície externa; tudo no Supabase. |
| `provider_message_id` só gravado, nunca reconciliado | Webhook atualiza `entregue`/`bounce`/`reclamado` | P41 (esta fase) | State machine RECON-01 completa. |
| Retry manual/inexistente | `pg_cron` 15 min, cap 5, backoff exp | P41 | Rede de segurança para at-most-once do `pg_net`. |

**Deprecated/outdated:**
- `n8n_webhook_base` (Vault): já removido na P39; nada a fazer.
- `react-email` para templates: incompatível Deno edge (fora de escopo, já decidido).
- `cdn.skypack.dev/svix` (do blog Svix 2022): funcional, mas o repo padroniza `npm:` — usar `npm:svix`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `email.complained` também carrega `data.email_id` no mesmo envelope de `delivered`/`bounced` (a doc detalhada de complained não foi obtida; delivered/bounced confirmam email_id). | Pattern 1 | Baixo — se o campo tiver outro nome no complained, o UPDATE não casa e a linha fica `enviado`; corrigível no UAT ao vivo com `complained@resend.dev`. |
| A2 | Free-tier Resend = 100/dia, 3.000/mês; Pro = 50k/mês $20 (páginas de pricing mudam). | Pitfall 6, Open Q | Médio — dimensiona batch-size; confirmar no dashboard vivo (`resend.com/settings/usage`). |
| A3 | `npm:svix@1.99.1` `Webhook.verify` roda no Deno 2.7.7 edge sem ajuste (CJS interop + node:crypto polyfill). | Pitfall 2 | Médio — se falhar, fallback Web Crypto manual (documentado). Validar no primeiro smoke da EF. |
| A4 | Um `403 domain not verified` (DELIV-01 aberto) NÃO consome quota diária do free-tier. | Pitfall 6 | Baixo — afeta só a estimativa de backlog; confirmar no UAT. |
| A5 | `Idempotency-Key` do Resend aplica a `POST /emails` com janela 24h e é seguro reusar `dedupe_key` como chave. | Pattern 3 | Baixo — melhoria de segurança; se não suportado numa rota, o `UNIQUE(dedupe_key)` do DB já protege. Doc confirma suporte + 24h. |

## Open Questions

1. **Batch-size da varredura vs rate-limit/free-tier**
   - What we know: Resend = **10 req/s por team** (429 se estourar) `[CITED]`; free-tier **100/dia, 3.000/mês** `[CITED]`. `pg_net` aguenta ~200 req/s.
   - What's unclear: o tamanho ótimo de batch depende do plano ativo no momento do flush (free vs Pro) e de quanto backlog `falhou` DELIV-01 acumulou.
   - Recommendation: `LIMIT 20` por sweep como ponto de partida (bem abaixo dos 10 req/s se as invocações não forem instantâneas; e 20×96 sweeps/dia >> 100/dia, então o batch NÃO é o gargalo — o cap diário do free-tier é). Antes do flush pós-DELIV-01, decidir com Fernando se sobe para Pro. Batch é discricionário (CONTEXT).

2. **`agendamento_id` de convite no retry vem do `dedupe_key`**
   - What we know: `dedupe_key` de convite = `{agendamento_id}:convite` (helpers.ts:38); não há coluna dedicada.
   - What's unclear: se algum convite legado tiver `dedupe_key` em formato diferente.
   - Recommendation: `split_part(dedupe_key,':',1)` na varredura; a EF em modo retry valida que o agendamento existe (já faz graceful-skip `dados_ausentes`). Como a tabela nasceu vazia na P37, não há legado.

3. **UAT ao vivo gated em DELIV-01**
   - What we know: `rh.beautysmile.com.br` não verificado → 403 → tudo grava `falhou`.
   - What's unclear: quando o Fernando fecha o DNS.
   - Recommendation: a fase entrega e testa toda a maquinaria com o Resend mockado (CI) + smoke estrutural; o UAT ponta-a-ponta (`delivered@`/`bounced@`/`complained@resend.dev`) fica como HUMAN-UAT deferido atrás de DELIV-01, exatamente como o CONTEXT trava.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Deno | Deno tests da EF (CI) | ✓ | 2.7.7 (local + CI `v2.x`) | — |
| `npm:svix` | EF de webhook | ✓ (npm 1.99.1, esm.sh 200) | 1.99.1 | Web Crypto HMAC manual |
| `pg_cron` | varredura | ✓ (vivo — 20260609000003) | extensão Supabase | — |
| `pg_net` | hop varredura→EF | ✓ (vivo — SEC-03/P39) | extensão Supabase | — |
| Supabase Vault | `resend_webhook_secret`, `edge_invoke_key`, `project_url` | ✓ (padrão vivo) | — | — |
| Supabase MCP `apply_migration` | apply da migration + cron | ✓ (só no orquestrador — bug #13898) | — | SQL Editor + `migration repair` (CLAUDE.md D-22) |
| Domínio Resend verificado | UAT ao vivo | ✗ **DELIV-01 aberto** | — | UAT deferido; CI mockado prova a lógica |
| `resend_webhook_secret` (Vault) | verificação Svix em PROD | ✗ (a provisionar) | — | Ação humana Fernando (dashboard Resend gera o whsec; registrar no Vault) |

**Missing dependencies with no fallback (bloqueiam só o UAT ao vivo, não o código/CI):**
- Verificação de `rh.beautysmile.com.br` no Resend (DELIV-01) — ação humana/DNS.
- `resend_webhook_secret` no Vault + registro do endpoint do webhook no dashboard Resend — ação humana (como DELIV-01/UAT-36-2).

**Missing dependencies with fallback:**
- `npm:svix` no Deno edge → Web Crypto HMAC manual (documentado), caso o import CJS dê problema.

## Validation Architecture

> `workflow.nyquist_validation: true` no config.json → seção incluída.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Deno test (EFs) — `deno 2.7.7`; Vitest só para `src/` (não usado nesta fase, é tudo backend EF) |
| Config file | `supabase/functions/deno.json` (imports + exclude) |
| Quick run command | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/resend-webhook supabase/functions/notificar-candidato` |
| Full suite command | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` (job `deno-test` do CI, blocking) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RECON-02 | `mapEventoStatus` mapeia delivered/bounced/complained e ignora o resto | unit | `deno test ... supabase/functions/resend-webhook` | ❌ Wave 0 |
| RECON-02 | `Webhook.verify` aceita assinatura boa, rejeita adulterada (sem `--allow-net`) | unit | `deno test ... supabase/functions/resend-webhook` | ❌ Wave 0 |
| RECON-02 | id desconhecido → UPDATE 0 linhas (no-op idempotente) — via supabaseAdmin mockado | unit | `deno test ... supabase/functions/resend-webhook` | ❌ Wave 0 |
| RECON-03 | `computeProximaTentativa` produz 15m/1h/6h/24h e `null` no cap 5 | unit | `deno test ... supabase/functions/notificar-candidato` | ❌ Wave 0 (novo teste) |
| RECON-03 | branch retry: `retry_id` não-elegível (`tentativas>=5`/status errado) → skip | unit | `deno test ... supabase/functions/notificar-candidato` | ❌ Wave 0 |
| RECON-02/03 | `fetch` do Resend mockado (sem chave viva) — sucesso→enviado, 429/non-2xx→falhou+backoff | unit | `deno test ... supabase/functions/notificar-candidato` | ❌ Wave 0 (requer refactor p/ deps injetáveis, ver Gaps) |
| DELIV-03 | `exigirSinkTeste` hard-falha se destinatário non-prod não for `*@resend.dev` | unit | `deno test ... supabase/functions/_shared` | ❌ Wave 0 |
| RECON-01/03 | migration adiciona `bounce_em`/`reclamado_em`; cron `notif-retry-sweep` registrado; seleção casa `idx_notif_retry` | smoke SQL | smoke de fidelidade (padrão P37/P39, gate GUC) — orquestrador via MCP | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/resend-webhook supabase/functions/notificar-candidato`
- **Per wave merge:** full suite (`... supabase/functions`) — job blocking do CI.
- **Phase gate:** full suite verde + smoke SQL 100% (gate GUC) antes de `/gsd:verify-work`. UAT ao vivo deferido (DELIV-01).

### Wave 0 Gaps
- [ ] `supabase/functions/resend-webhook/index.ts` + `helpers.ts` — nova EF (esqueleto de `analise-candidato-individual` com `import.meta.main` + handler testável).
- [ ] `supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts` — assinatura + mapeamento (RECON-02).
- [ ] `computeProximaTentativa` em `notificar-candidato/helpers.ts` + testes (RECON-03).
- [ ] **Refactor testabilidade de `notificar-candidato/index.ts`**: hoje o `fetch` do Resend e o `createClient` são construídos inline no `Deno.serve` (não há `import.meta.main`/handler injetável como em `analise-candidato-individual`). Para mockar o `fetch` sem `--allow-net`, extrair um `handler(req, deps)` com `fetch`/`supabaseAdmin` injetáveis, OU testar via `globalThis.fetch` stub. Recomendo o padrão de deps injetadas de `analise-candidato-individual` (import.meta.main). Este é o maior item de Wave 0.
- [ ] `exigirSinkTeste` em `_shared/email-config.ts` + teste em `_shared/__tests__/email-config.test.ts` (já existe o arquivo — adicionar casos).
- [ ] Smoke SQL de fidelidade (colunas novas + cron job + predicado da seleção) no padrão gate-GUC da P37/P39.

*(Framework já instalado; `denoland/setup-deno@v2` no CI. Nenhum install novo.)*

## Security Domain

> `security_enforcement` ausente no config → tratado como habilitado.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | EF webhook: autenticação = **assinatura Svix** (`Webhook.verify`), não JWT (`verify_jwt=false`). Varredura→EF: Bearer `edge_invoke_key` do Vault (self-auth, mirror P39). |
| V3 Session Management | no | Sem sessões; endpoints server-to-server. |
| V4 Access Control | yes | `notificacoes_enviadas` RLS candidato-DENY + RH join-through (LEDGER-03, já vivo). Só `service_role` escreve. A EF webhook usa service-role (bypassa RLS) — correto. |
| V5 Input Validation | yes | Payload do webhook validado por assinatura ANTES de uso; `type` num allowlist (`mapEventoStatus`); `email_id` tratado como opaco no `.eq()` (sem SQL injection via supabase-js parametrizado). |
| V6 Cryptography | yes | HMAC-SHA256 via Svix (nunca hand-rolled); segredo `resend_webhook_secret` só no Vault, nunca logado/interpolado. Se rota manual: `crypto.subtle` + comparação constant-time. |
| V7 Error Handling & Logging | yes | Logs só ids/evento/status (`logSeguro`); segredo do webhook e chave da API nunca logados; assinatura inválida → 400 genérico sem vazar detalhe. |

### Known Threat Patterns for {Resend webhook / pg_cron retry}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook forjado (atacante POSTa evento falso p/ marcar `entregue`) | Spoofing | `Webhook.verify` (assinatura Svix) obrigatória; sem `verify` a EF é spoofable. |
| Replay de webhook antigo | Tampering/Replay | Svix inclui `svix-timestamp` + tolerância (a lib rejeita timestamps fora da janela); `svix-id` permite dedupe se necessário. |
| Timing attack na comparação de assinatura | Information Disclosure | Svix usa constant-time compare internamente (por isso não hand-roll). |
| Vazamento do `resend_webhook_secret`/`edge_invoke_key` em log | Information Disclosure | Segredos só do Vault; `logSeguro` allowlist; nunca interpolar em `console.*`. |
| Varredura re-invoca EF com Bearer errado (rotação) | Elevation/DoS | Usar `edge_invoke_key` do Vault (== `NOTIFICAR_SECRET` da EF); ver Pitfall 5. |
| Retry infinito (DoS de e-mail / custo) | Denial of Service | Cap `tentativas < 5` + backoff exponencial + `LIMIT` no batch. |
| PII no payload do webhook em log | Information Disclosure | O payload do Resend traz `to`/`subject` — nunca logar o payload; só `email_id`/`type`/`status`. |

## Sources

### Primary (HIGH confidence)
- **Codebase (VERIFIED):** `20260721000001_notificacoes_enviadas.sql` (schema/enum/índices vivos), `20260722000002_p37_notificacoes_lacunas.sql` (padrão aditivo), `20260726000001_p39_rewire_triggers_aposenta_n8n.sql` (hop net.http_post+Vault, verbatim a copiar), `20260610000002_analise_trigger.sql` (template pg_net), `20260609000003_prompt_library_cron.sql` (cron.schedule), `notificar-candidato/index.ts`+`helpers.ts` (EF a modificar), `analise-candidato-individual/index.ts` (esqueleto import.meta.main + deps injetáveis), `_shared/email-config.ts` (contrato de modo), `config.toml` (verify_jwt posture), `ci.yml` (job deno-test), `notificar-candidato.test.ts` (padrão de teste).
- resend.com/docs/api-reference/rate-limit — 10 req/s por team; headers `ratelimit-*`/`retry-after`; 429.
- resend.com/docs/api-reference/emails/send-email — `Idempotency-Key` (256 chars, 24h).
- resend.com/docs/webhooks/emails/delivered — payload `{type, created_at, data:{email_id, message_id, ...}}`.
- resend.com/docs/webhooks/emails/bounced — `data.bounce:{type, subType, message, diagnosticCode}`.
- resend.com/docs/dashboard/webhooks/verify-webhooks-requests — `import { Webhook } from 'svix'`; headers svix-id/timestamp/signature; `wh.verify(payload, headers)`.
- docs.svix.com/receiving/verifying-payloads/how-manual — HMAC-SHA256 manual (signedContent, whsec_ base64, v1, constant-time).
- supabase.com/docs/guides/database/extensions/pg_net — `pg_net.ttl` 6h, unlogged, at-most-once, ~200 req/s.
- supabase.com/docs/guides/functions/schedule-functions — cron.schedule + net.http_post.

### Secondary (MEDIUM confidence)
- resend.com/pricing — free 100/dia+3.000/mês; Pro 50k/mês $20 (páginas de pricing mudam — confirmar no dashboard).
- svix.com/blog/receive-webhooks-with-supabase-edge-functions — padrão Deno `req.text()` cru + verify (usa `cdn.skypack.dev/svix`; adaptar p/ `npm:svix`).
- npm registry: `svix@1.99.1`, 5.77M downloads/semana, repo oficial, sem postinstall (VERIFIED via `npm view`).

### Tertiary (LOW confidence)
- Payload exato de `email.complained` (assumido A1: mesmo envelope com `data.email_id`) — validar no UAT ao vivo.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `npm:svix` citado pela doc oficial Resend + versão/downloads verificados; pg_cron/pg_net com precedente vivo.
- Architecture: HIGH — cada padrão tem gêmeo em PROD (P37/P38/P39); cópia cirúrgica, não greenfield.
- Pitfalls: HIGH — a maioria vem de bugs REAIS já documentados no repo (import dinâmico, 42601, rotação de chave, at-most-once).
- Rate-limits/free-tier: MEDIUM — doc oficial citada, mas pricing muda; confirmar no dashboard antes do flush.
- Deno+npm:svix runtime: MEDIUM-HIGH — padrão comum, validar no primeiro smoke da EF.

**Research date:** 2026-07-26
**Valid until:** 2026-08-25 (30 dias — Resend pricing/rate-limits e svix version são os itens mais voláteis; re-verificar antes de fixar batch-size).

## RESEARCH COMPLETE
