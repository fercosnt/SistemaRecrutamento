---
status: partial
phase: 38-ef-notificar-candidato-comm
source: [38-04-PLAN.md, 38-VALIDATION.md]
blocked_on: [UAT-36-1]
started: 2026-07-23
updated: 2026-07-26
---

## Current Test

[EF deployada + smoke rodado 2026-07-26. Auth/idempotência/render/ledger/graceful-fail PROVADOS.
A **entrega** (`status='enviado'`) segue bloqueada em **DELIV-01 / UAT-36-1**: o Resend rejeita
com `403 domain not verified` porque o subdomínio remetente **`rh.beautysmile.com.br` não está
verificado** no Resend (a migração recruta.→rh. do commit `f284672` adiantou-se à verificação DNS).
Ver Evidência abaixo.]

## Context

A Phase 38 fechou **todo o código** da EF `notificar-candidato` e o provou por `deno test` (17/17 verde): o gerador `.ics` portado (`_shared/ics.ts`), os 4 templates Beauty Smile + grep-guard da rejeição (`_shared/email-templates.ts`), e a EF self-auth com claim-before-send + ledger 2-fase (`supabase/functions/notificar-candidato/`). O que resta é **irredutivelmente operacional**: o deploy em PROD e o smoke ponta-a-ponta, que precisam do segredo do Vault.

**Estado verificado em PROD (2026-07-23, via Supabase MCP, projeto `isljnozzlvckrgjjbjwp`):**
- A EF `notificar-candidato` **ainda NÃO está deployada** (ausente de `list_edge_functions`).
- `vault.secrets` contém `edge_invoke_key` e `project_url`, mas **NÃO** `resend_api_key` → **UAT-36-2 continua pendente**. Sem a chave, a EF grava `falhou` (graceful) e o smoke não pode provar `status='enviado'`.

**Decisão do operador (2026-07-23):** adiar deploy + smoke para uma sessão humana única (provisionar a chave → deploy dormente → smoke). Nenhuma mudança em PROD foi feita nesta fase. A cadeia P39 (rewire de triggers) NÃO deve aterrissar antes deste smoke — os triggers precisam de uma EF viva e provada como alvo.

## Tests

### UAT-38-1 — Deploy dormente + smoke ponta-a-ponta da EF (COMM-01 critério 4)

- **Pré-requisito ABSOLUTO:** UAT-36-2 concluído — `select public.ler_resend_api_key() is null as sem_segredo;` deve retornar **`false`** antes de tentar o smoke. Sem a chave, PARAR (não fabricar chave).
- **Steps:**

1. **Provisionar a chave** (se ainda não): seguir UAT-36-2 em `.planning/phases/36-deliverability-sender-identity/36-HUMAN-UAT.md`.

2. **Deploy dormente** (orquestrador, via Supabase MCP `deploy_edge_function` ou `supabase functions deploy notificar-candidato --no-verify-jwt`):
   - Incluir no upload: `notificar-candidato/index.ts` (entrypoint), `notificar-candidato/helpers.ts`, e as deps `_shared/ics.ts`, `_shared/email-templates.ts`, `_shared/email-config.ts` (relative deps).
   - `verify_jwt = false` (a EF é a dona da auth — Bearer self-auth).
   - Confirmar: aparece **ACTIVE** em `list_edge_functions`; **nenhum trigger** aponta para ela (dormente — o rewire é a P39).

3. **Smoke** (orquestrador, via `execute_sql`, modo teste — `NOTIFICACOES_MODO` ausente ⇒ fail-safe teste ⇒ `resend.dev`):
   - Escolher uma `candidatura_id` de teste que resolva candidato+vaga (ex.: `candidato.funil@teste.com`).
   ```sql
   select net.http_post(
     url := (select decrypted_secret from vault.decrypted_secrets where name='project_url') || '/functions/v1/notificar-candidato',
     headers := jsonb_build_object(
       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='edge_invoke_key'),
       'Content-Type', 'application/json'),
     body := jsonb_build_object('evento','confirmacao','candidatura_id','<uuid-de-teste>')
   );
   ```
   - Aguardar ~5s e verificar:
   ```sql
   select evento, dedupe_key, status, provider_message_id, destinatario_email
   from public.notificacoes_enviadas
   where dedupe_key = '<uuid-de-teste>:confirmacao';
   ```
   Esperado: 1 linha, `status='enviado'`, `provider_message_id` não-nulo, `destinatario_email='delivered+candidatura_recebida@resend.dev'`.

4. **Idempotência:** repetir o mesmo `net.http_post` → confirmar que NENHUMA segunda linha é criada e a EF responde `200 {skipped:'duplicate'}`.

5. **Limpeza:** `delete from public.notificacoes_enviadas where dedupe_key like '<uuid-de-teste>:%';` (a tabela é audit trail de produção).

6. Registrar neste arquivo a data + a evidência (ids, status, provider_message_id mascarado).

- **status:** partial — funcional PROVADO; entrega bloqueada em DELIV-01 (domínio remetente não verificado)

---

## Evidência da execução (2026-07-26, orquestrador via Supabase MCP + CLI)

**Ambiente:** projeto `isljnozzlvckrgjjbjwp`. Candidatura de teste `a1dd4c42-bc92-4c37-a584-dc19a59a631d`
(`candidato.funil@teste.com`, vaga `[TESTE] Dentista — Funil E2E`).

**Pré-requisito UAT-36-2 — ✅ RESOLVIDO desde a última verificação.** `vault.secrets` agora contém
`resend_api_key`; `select public.ler_resend_api_key() is null` = **false** (length 36). Fernando
provisionou a chave em algum momento após a verificação de 2026-07-23.

**Deploy dormente — ✅.** `supabase functions deploy notificar-candidato --no-verify-jwt` (v1→v2).
`ACTIVE`, `verify_jwt=false`, entrypoint do repo `/Users/fernando/code/SistemaRecrutamento/...`.
Dormência confirmada por catálogo: **0** funções PL/pgSQL referenciam a EF; os 4 triggers `trg_n8n_*`
seguem vivos (P39 os dropará); o único `trg_notif_*` presente é o touch de `atualizado_em` da P37.

**⚠ GAP LATENTE DA P38 ENCONTRADO E CORRIGIDO — auth self-secret.** O 1º smoke retornou **401
UNAUTHORIZED**. Causa-raiz: a EF usa `expectedSecret = NOTIFICAR_SECRET ?? SUPABASE_SERVICE_ROLE_KEY`,
mas o `NOTIFICAR_SECRET` **nunca foi setado** e a invariante assumida "`edge_invoke_key == service_role`"
(herdada do comentário do `cost-alerter`) está **quebrada em PROD por rotação da service_role**
(digests: `edge_invoke_key`/`ANALISE_SECRET` = `823aa757…`; `SUPABASE_SERVICE_ROLE_KEY` injetada = `085073ec…`
— **diferem**). As EFs-espelho sobrevivem porque pinam um secret explícito (`ANALISE_SECRET`); a P38
esqueceu o equivalente. **Correção aplicada:** `supabase secrets set NOTIFICAR_SECRET=<edge_invoke_key>`
(valor extraído do Vault sem exposição — RPC `SECURITY DEFINER` guard-token efêmera + curl anon, dropada
em seguida). Verificado por digest: `NOTIFICAR_SECRET` = `823aa757…` = `ANALISE_SECRET` = `edge_invoke_key`.
EF redeployada (v2) para carregar o secret. **Isto também é pré-requisito dos triggers da P39** (que
enviam `Bearer edge_invoke_key`). *Recomendação: codificar este passo no runbook de deploy da EF.*

**Smoke pós-fix — ✅ funcional / ⚠ entrega:**
- `net.http_post` → **HTTP 200 `{"ok":true}`**. Auth OK (401→200).
- Ledger: 1 linha criada, `evento=confirmacao`, `dedupe_key=…:confirmacao`, `destinatario_email=delivered+candidatura_recebida@resend.dev` (sink de teste correto), `destinatario_original=candidato.funil@teste.com`, `modo=teste`.
- **Entrega FALHOU (esperado, dado o gate):** `status=falhou`, `tentativas=1`, `ultimo_erro="Resend non-2xx: 403 The rh.beautysmile.com.br domain is not verified…"`. A EF degradou como projetado (fire-and-forget: gravou `falhou`, retornou 200, **nunca** 5xx).
- **Idempotência — ✅.** 2º POST idêntico → **200 `{"ok":true,"skipped":"duplicate"}`**, **0** segunda linha, `tentativas` inalterado (a EF não re-tenta — isso é o `pg_cron` da P41).
- **Limpeza — ✅.** A linha de teste (`…:confirmacao`, status `falhou`) foi deletada do ledger.

**Veredito UAT-38-1:** a EF está **viva e provada** em auth, idempotência, resolução por allowlist,
render e degradação graciosa. O único critério não provado é a **entrega real** (`status='enviado'`),
**bloqueado em DELIV-01 / UAT-36-1** — verificar `rh.beautysmile.com.br` no Resend (ação DNS+dashboard
do Fernando). Re-rodar o smoke após a verificação deve produzir `status='enviado'` + `provider_message_id`.

- **status:** partial (funcional provado; entrega gated em DELIV-01)
