---
phase: 38-ef-notificar-candidato-comm
verified: 2026-07-23
status: passed
score: 6/6 COMM requirements code-verified (17/17 deno tests) · 1 live smoke deferred (HUMAN-UAT, non-blocking)
overrides_applied: 0
human_verification:
  - test: "UAT-38-1 — Deploy dormente da EF notificar-candidato + smoke ponta-a-ponta via net.http_post"
    expected: "EF ACTIVE em list_edge_functions (verify_jwt=false, sem trigger); net.http_post grava 1 linha status='enviado'+provider_message_id no ledger, destinatario_email='delivered+candidatura_recebida@resend.dev'; re-disparo não cria 2ª linha (idempotência)"
    why_human: "Deploy em PROD + smoke exigem Supabase MCP + Vault + a chave live; GSD executor subagents não têm MCP (bug upstream). Bloqueado em UAT-36-2 (resend_api_key ausente do Vault, verificado em PROD 2026-07-23). Operador optou por adiar deploy+smoke para uma sessão humana única (2026-07-23). NÃO bloqueia o fechamento do código desta fase; é o único proof não-autônomo (COMM-01 critério 4)."
---

# Phase 38: EF `notificar-candidato` (COMM) — Verification Report

**Phase Goal:** Uma única EF self-authenticating que, dado um payload ids-only, resolve os dados do candidato por allowlist explícita (nunca `select('*')`), reivindica idempotência contra o ledger, renderiza o template Beauty Smile correto para cada um dos 4 eventos (com um port server-side verbatim do `.ics` do M6 para o convite), envia via `fetch` plano ao Resend e grava o resultado de volta — deployável dormente e smoke-testável via `net.http_post` manual antes de qualquer trigger.

**Verified:** 2026-07-23
**Status:** passed (code goal achieved; live smoke deferred as non-blocking HUMAN-UAT)
**Re-verification:** No — initial verification

## Methodology Note

O verificador **re-executou** a suite completa da fase de forma independente das SUMMARYs: `deno test _shared/__tests__/ics.test.ts _shared/__tests__/email-templates.test.ts notificar-candidato/__tests__/notificar-candidato.test.ts --allow-env --allow-read` → **17 passed / 0 failed**. `deno check notificar-candidato/index.ts` limpo. `npm run lint` = 97 erros `tsc` (baseline inalterado; EF/Deno não é type-checked pelo tsc do src). O estado de PROD foi verificado **read-only** via Supabase MCP (projeto `isljnozzlvckrgjjbjwp`): EF ainda não deployada; Vault sem `resend_api_key`. Nenhuma mudança foi feita em PROD.

## Goal Achievement — Success Criteria (ROADMAP)

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| SC1 | EF existe: self-auth Bearer (`--no-verify-jwt`), allowlist de colunas (nunca `select('*')`), `fetch` ao Resend, grava no ledger (COMM-01) | ✓ VERIFIED (código) / **pending** (smoke live) | `notificar-candidato/index.ts`: self-auth vs `SUPABASE_SERVICE_ROLE_KEY`; allowlists explícitas (candidato_id/nome_completo/email/titulo/data_hora/local_ou_link/tipo), zero `select('*')`; claim-before-send `upsert onConflict:'dedupe_key' ignoreDuplicates`; `fetch` a `api.resend.com/emails`; ledger 2-fase (pendente→enviado/falhou). Registrado `[functions.notificar-candidato] verify_jwt=false`. Prova live (net.http_post → linha `enviado`) é HUMAN-UAT UAT-38-1, deferida (blocked on UAT-36-2). |
| SC2 | Produz o e-mail correto por evento: confirmação (survivor-guard), avanço, convite (.ics PUBLISH America/Sao_Paulo), decisão neutra fixa (COMM-02/03/04/05) | ✓ VERIFIED | `renderarEmail` mapeia os 4 eventos; `mapearEvento` (ledger→email-config) coberto por teste; convite formata `data_hora` em `America/Sao_Paulo` (Intl.DateTimeFormat) e anexa `.ics` PUBLISH via `gerarIcsAgendamento`+`icsParaBase64`; decisão usa `COPY_REJEICAO` congelada. Survivor-guard (COMM-02) é enforcement de trigger (P39) — na P38 o evento `confirmacao` simplesmente não é despachado para knockout; nota registrada. 11 testes (ics+templates) verdes. |
| SC3 | 4 templates hand-rolled inline-CSS (não react-email); cópia de rejeição revisada/congelada; grep-guard prova ausência de token de scoring (COMM-06) | ✓ VERIFIED | `_shared/email-templates.ts` table-based inline-CSS, sem `@react-email` (asserido por leitura de import); `COPY_REJEICAO` congelada; **grep-guard** roda sobre o HTML renderizado de `decisao_final` e falha em `/score\|percentil\|trait\|motivo\|nota\|ranking\|pontuaç\|crit[ée]rio/i` → verde. `escapeHtml` em todo valor (provado com `Ana <b>` → `&lt;b&gt;`). |
| SC4 | `net.http_post` manual à EF dormente envia a `resend.dev` e grava linha `enviado` — prova ponta-a-ponta antes dos triggers (COMM-01 critério 4) | ⏸ DEFERRED (HUMAN-UAT) | Bloqueado em UAT-36-2 (Vault sem `resend_api_key`, verificado em PROD 2026-07-23). Operador optou por adiar. Procedimento completo em `38-HUMAN-UAT.md` (UAT-38-1). Não bloqueia o fechamento do código; a P39 não deve aterrissar antes deste smoke. |

## Requirements Coverage

| REQ | Plan(s) | Status |
|-----|---------|--------|
| COMM-01 | 38-03 (código), 38-04 (smoke deferido) | ✓ código / ⏸ live |
| COMM-02 | 38-02, 38-03 | ✓ |
| COMM-03 | 38-02, 38-03 | ✓ |
| COMM-04 | 38-01, 38-03 | ✓ |
| COMM-05 | 38-02, 38-03 | ✓ |
| COMM-06 | 38-02 | ✓ |

## Deferred / Human-Needed

- **UAT-38-1** (deploy dormente + smoke live) — blocked on **UAT-36-2** (provisionar `resend_api_key` no Vault, ação do Fernando). Registrado em `38-HUMAN-UAT.md`. Decisão do operador (2026-07-23): adiar; autonomous segue para a Phase 39.

## Conclusion

O objetivo de **código** da Phase 38 está alcançado e provado por execução (17/17 deno tests + deno check limpo + acceptance greps): a EF existe, é self-authenticating, resolve por allowlist, reivindica idempotência, renderiza os 4 templates Beauty Smile com a rejeição neutra guardada por grep-guard, anexa o `.ics` PUBLISH e grava o ledger em 2 fases sem vazar PII/segredo. O único item aberto é o **smoke live** (COMM-01 critério 4), deliberadamente deferido como HUMAN-UAT bloqueado no provisionamento do Vault — mesmo padrão de não-bloqueio da Phase 36. **Status: passed.**
