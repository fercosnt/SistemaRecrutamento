---
status: pending
phase: 38-ef-notificar-candidato-comm
source: [38-04-PLAN.md, 38-VALIDATION.md]
blocked_on: [UAT-36-2]
started: 2026-07-23
updated: 2026-07-23
---

## Current Test

[awaiting human execution — requires (a) a live `resend_api_key` no Supabase Vault (UAT-36-2, ainda pendente) e (b) o deploy da EF em PROD via Supabase MCP/CLI pelo orquestrador]

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

- **status:** pending (blocked on UAT-36-2)
