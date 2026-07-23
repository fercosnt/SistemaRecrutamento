---
phase: 38-ef-notificar-candidato-comm
plan: 03
subsystem: edge-functions
tags: [deno, edge-function, resend, self-auth, allowlist, idempotency, ledger, fire-and-forget]

# Dependency graph
requires:
  - phase: 38-01
    provides: "_shared/ics.ts — gerarIcsAgendamento + icsParaBase64 (anexo do convite)"
  - phase: 38-02
    provides: "_shared/email-templates.ts — renderarEmail(evento, dados)"
  - phase: 38 (P36)
    provides: "_shared/email-config.ts — resolverModo/resolverDestinatario/FROM/REPLY_TO; rpc ler_resend_api_key()"
  - phase: 37
    provides: "notificacoes_enviadas (uq_notif_dedupe, status_notificacao, destinatario_original NOT NULL)"
provides:
  - "supabase/functions/notificar-candidato/index.ts — Deno.serve handler: self-auth Bearer, ids-only parse, allowlist resolve, claim-before-send, render, fetch Resend, ledger 2-fase, always-200"
  - "supabase/functions/notificar-candidato/helpers.ts — funções puras (mapearEvento, montarDedupeKey, construirCorpoResend, logSeguro) unit-testáveis sem Deno.serve"
  - "supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts — 5 testes deno offline"
  - "supabase/config.toml — [functions.notificar-candidato] verify_jwt = false"
affects: [38-04, 39, 41]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EF self-auth Bearer vs SUPABASE_SERVICE_ROLE_KEY + verify_jwt=false (mirror cost-alerter/analise-candidato-individual)"
    - "Helpers puros em módulo separado (helpers.ts) — importar index.ts num teste dispararia Deno.serve; padrão de cost-alerter/messages.ts"
    - "Claim-before-send: upsert onConflict dedupe_key ignoreDuplicates:true + .select('id') — data vazio ⇒ já reivindicado ⇒ no-op 200"
    - "Fire-and-forget: falha de envio grava 'falhou'+proxima_tentativa_em e retorna 200 (nunca 5xx ao trigger; net.http_post é at-most-once)"
    - "Ledger 2-fase: pendente (claim) → enviado+provider_message_id OU falhou+ultimo_erro"
    - "fetch plano ao Resend (zero SDK); anexo .ics condicional (só convite)"

key-files:
  created:
    - supabase/functions/notificar-candidato/index.ts
    - supabase/functions/notificar-candidato/helpers.ts
    - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
  modified:
    - supabase/config.toml

key-decisions:
  - "DEVIATION do plano (que pedia helpers exportados de index.ts): os helpers puros vivem em helpers.ts separado — importar index.ts num teste dispararia Deno.serve (padrão comprovado de cost-alerter/messages.ts). O teste importa helpers.ts; o índice também"
  - "Sem injeção de fetch no handler: o proof offline é a forma do request (construirCorpoResend) + o envio real é provado pelo smoke manual do 38-04. Igual ao cost-alerter (testa messages.ts, usa fetch plano)"
  - "Comentários reescritos para não conter o literal select('*') — a acceptance do plano grepa a fonte; o comentário didático tripava o guard. O código usa allowlists explícitas (candidato_id/nome_completo/email/titulo/data_hora/local_ou_link/tipo)"
  - "Coluna real ultimo_erro (não 'erro') e destinatario_email (o 'to') vs destinatario_original (e-mail real) — confirmado no Insert type de database.types.ts; destinatario_original é NOT NULL e é setado no claim"
  - "Body ids-only fala o vocabulário do LEDGER (confirmacao/avanco/convite/decisao) — casa o CHECK e a coluna evento; a EF mapeia para EventoNotificacao (email-config/templates) via mapearEvento"

# Verification
verification:
  automated: "deno test (ics + email-templates + notificar-candidato) → 17 passed / 0 failed; deno check notificar-candidato/index.ts limpo"
  acceptance: "index.ts: 0 select('*'), self-auth vs SERVICE_ROLE, onConflict dedupe_key, ler_resend_api_key, renderarEmail, icsParaBase64, api.resend.com/emails; config.toml verify_jwt=false"
  lint: "tsc src/** 97→97 (Deno não é type-checked pelo tsc do src)"
---

# 38-03 — EF notificar-candidato (COMM-01/02/03/04/05)

Construí a EF `notificar-candidato`: o despachante único das 4 notificações. `index.ts` (`Deno.serve`) faz self-auth do Bearer contra `SUPABASE_SERVICE_ROLE_KEY` (deploy `verify_jwt=false`), faz parse do body ids-only `{ evento, candidatura_id, agendamento_id? }`, resolve candidato/vaga/agendamento por **allowlist explícita de colunas** (nunca projeção-estrela), reivindica idempotência (`upsert onConflict:'dedupe_key' ignoreDuplicates:true` → data vazio ⇒ 200 `skipped:'duplicate'`), renderiza via `renderarEmail`, anexa o `.ics` (só no convite, via `gerarIcsAgendamento`+`icsParaBase64`), lê a chave do Vault via `rpc('ler_resend_api_key')`, envia com `fetch` plano ao Resend e grava o resultado no ledger em 2 fases. Falha de envio ⇒ grava `falhou`+`proxima_tentativa_em` e retorna 200 (fire-and-forget; nunca relança). Logs só com ids/evento/status via `logSeguro`.

Os invariantes puros (dedupe_key convite-vs-outros, mapa dos 4 eventos, forma do corpo Resend com anexo condicional e sem chave, filtro de PII do log) estão em `helpers.ts` e são provados por 5 testes deno offline. Suite completa da fase: 17/17 verde. Registrei `[functions.notificar-candidato] verify_jwt = false` em config.toml.

**Deviations:** helpers puros em `helpers.ts` separado (não exportados de index.ts como o plano sugeria) — necessário porque importar `index.ts` dispararia `Deno.serve` no teste (padrão de cost-alerter). Comentários reescritos para não conter o literal `select('*')` (o código usa allowlists; o comentário tripava o grep de acceptance). **Next:** deploy dormente + smoke ponta-a-ponta (38-04, checkpoint do orquestrador).
