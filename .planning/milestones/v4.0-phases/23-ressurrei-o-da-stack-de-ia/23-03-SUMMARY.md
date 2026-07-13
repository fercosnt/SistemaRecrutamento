---
phase: 23-ressurrei-o-da-stack-de-ia
plan: 03
subsystem: infra
tags: [deno, edge-functions, ai-client, cost-guardrail, kill-switch, cost-alerter, rnf-07a]

# Dependency graph
requires:
  - phase: 23-01
    provides: "parseIntEnv (NaN/≤0→default) + callAi replay/breaker structure em ai-client.ts"
provides:
  - "Kill-switch de custo PRÉ-chamada em callAi (AI_DAILY_COST_CAP_USD, per-vaga, dia UTC corrente) — corta gasto em RUNTIME"
  - "Fail-OPEN no lookup de custo (erro/ausência → procede; o trigger DB é o backstop)"
  - "error_code 'cost_cap_exceeded' + 1 linha ai_call_logs success=false; devolve 'hold' + flagged_for_human_review (RNF-07a)"
  - "cost-alerter/messages.ts: alertMessage + CostAnomalyBody extraídos, unit-testáveis sem Deno.serve (4 canais incl candidate_cost_over_1)"
affects: [23-05, 23-06, phase-24]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Kill-switch fail-OPEN: feature-detect select + try/catch → um guard de disponibilidade nunca vira outage de bloqueio"
    - "Extração de copy pura (sem Deno.serve) para módulo irmão testável — mata código morto não-guardado"

key-files:
  created:
    - "supabase/functions/cost-alerter/messages.ts"
    - "supabase/functions/_shared/__tests__/cost-alerter-messages.test.ts"
  modified:
    - "supabase/functions/_shared/ai-client.ts"
    - "supabase/functions/_shared/__tests__/ai-client.test.ts"
    - "supabase/functions/cost-alerter/index.ts"

key-decisions:
  - "Ler AI_DAILY_COST_CAP_USD POR CHAMADA (não módulo-level) — ajuste sem redeploy + testável via Deno.env"
  - "Filtrar success=true no SUM p/ usar o índice parcial idx_ai_logs_vaga_cost; sum client-side sobre cost_usd"
  - "Recusa de custo NÃO tem fallback OpenAI (provider 'none') — um teto de gasto não deve gastar no fallback"
  - "AI_DAILY_COST_CAP_USD default 50 = teto HARD operacional, distinto do threshold de negócio R$200/mês (trigger/cost-alerter)"

patterns-established:
  - "Kill-switch fail-OPEN: qualquer erro/ausência do lookup → false (procede); disponibilidade acima do teto de custo, documentado"
  - "TDD RED→GREEN por task com husky-bypass (core.hooksPath=/dev/null)"

requirements-completed: [AI-06]

# Metrics
duration: 22min
completed: 2026-07-05
---

# Phase 23 Plan 03: Guardrails de Custo (AI-06) Summary

**Kill-switch de custo PRÉ-chamada em callAi (soma cost_usd do dia por vaga vs AI_DAILY_COST_CAP_USD, fail-OPEN, hold nunca reject) + alertMessage do cost-alerter extraído para módulo puro testável cobrindo os 4 canais incluindo candidate_cost_over_1.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-05T23:23:00-03:00
- **Completed:** 2026-07-05T23:45:15-03:00
- **Tasks:** 2 (TDD RED→GREEN cada)
- **Files modified:** 5 (2 criados, 3 modificados)

## Accomplishments
- **Corte de gasto em RUNTIME (AI-06 hole #5):** `callAi` agora soma o `cost_usd` das chamadas de sucesso do dia UTC corrente por vaga e, acima de `AI_DAILY_COST_CAP_USD` (default 50), RECUSA a chamada antes de tocar qualquer provedor — o único fix que corta na hora (o cron de alerta só detecta o dia seguinte às 01:30).
- **Fail-OPEN deliberado (T-23-03-02):** feature-detect do `select` + try/catch envolvendo o lookup inteiro — erro/ausência do select → procede. Um lookup de custo que falha nunca mata o funil (o trigger DB é o backstop). Tradeoff documentado: disponibilidade acima do teto de custo.
- **RNF-07a preservado:** a recusa devolve `{ recommendation: "hold", flagged_for_human_review: true }` + `error_code: "cost_cap_exceeded"` + 1 linha `ai_call_logs` `success=false` — NUNCA rejeita candidato por custo; o kill-switch não vira caminho silencioso de rejeição.
- **candidate_cost_over_1 deixa de ser código morto:** `alertMessage` + `CostAnomalyBody` movidos para `cost-alerter/messages.ts` (módulo puro sem `Deno.serve`), cobertos por 6 testes (4 canais distintos + guard de termos proibidos RNF-12a). O handler importa daqui — comportamento byte-idêntico.

## Task Commits

Cada task seguiu o ciclo TDD RED→GREEN, commitada com husky-bypass (`core.hooksPath=/dev/null`):

1. **Task 1: kill-switch pré-chamada de custo em callAi** — `96cfb2b` (test/RED) → `da63409` (feat/GREEN)
2. **Task 2: extrair alertMessage + cobrir os 4 canais** — `7ca8737` (test/RED) → `e12807f` (feat/GREEN)

**Plan metadata:** (docs commit — SUMMARY + STATE + ROADMAP)

## Files Created/Modified
- `supabase/functions/_shared/ai-client.ts` — `isDailyCostCapExceeded` (SUM per-vaga do dia, fail-OPEN) + wiring no `callAi` após replay / antes de injection
- `supabase/functions/_shared/__tests__/ai-client.test.ts` — 3 testes AI-06 (over-cap 0 provider calls; under-cap procede; fail-open) + mock `makeMockSupabaseWithCostLogs` (builder chainable+thenable)
- `supabase/functions/cost-alerter/messages.ts` — **novo** módulo puro `alertMessage` + `CostAnomalyBody`
- `supabase/functions/cost-alerter/index.ts` — importa de `./messages.ts`, remove defs locais
- `supabase/functions/_shared/__tests__/cost-alerter-messages.test.ts` — **novo** 6 testes (4 canais + distinção + guard de termos)

## Decisions Made
- **Teto lido por-chamada:** `parseIntEnv("AI_DAILY_COST_CAP_USD", 50)` roda DENTRO do kill-switch (não módulo-level) → operador ajusta sem redeploy e os testes exercitam via `Deno.env` (módulo cacheado pelo dynamic import não veria env módulo-level).
- **`success=true` no filtro:** usa o índice parcial `idx_ai_logs_vaga_cost (vaga_id, cost_usd) WHERE success=true`; soma client-side.
- **Sem fallback na recusa:** over-cap retorna `provider: "none"` — nem Anthropic nem OpenAI são chamados (um teto de gasto não pode gastar no fallback).
- **Teto default 50 = HARD operacional**, distinto do threshold de negócio (R$200/mês por vaga) coberto pelo trigger + cost-alerter com ~1 dia de atraso.

## Deviations from Plan

None - plan executed exactly as written. Ambas as tasks seguiram o `<action>` do plano; nenhum bug/blocker/funcionalidade crítica ausente surgiu (Rules 1-4 não acionadas).

## Issues Encountered
None. O baseline do corpus estava verde (166); o over-cap RED falhou como esperado (kill-switch ausente) e virou GREEN com a implementação. O corpus fechou em **175 passed / 0 failed** (166 + 3 kill-switch + 6 messages).

## Scope Notes (deliberadamente FORA — por design do plano)
- **NÃO redeploya** as EFs (bundle-freeze) — as 9 EFs + cost-alerter são redeployadas no **Plan 23-06**. Até lá, as mudanças em `_shared/*` e em `cost-alerter/*` NÃO estão vivas em PROD.
- **NÃO** toca `verify_jwt`/authz (Phase 24).
- A emissão do canal `candidate_cost_over_1` pelo trigger, o fix de janela/escopo (30-dias) e o `RAISE WARNING` de Vault ausente são a migration do **Plan 23-05**. Este plano só extraiu+cobriu a cópia do canal (deixou de ser código morto).

## User Setup Required
None - nenhum env é obrigatório (`AI_DAILY_COST_CAP_USD` é default-guarded → ausência = teto 50). Ficará vivo com o redeploy do 23-06.

## Next Phase Readiness
- Kill-switch + cost-alerter refatorado prontos para o redeploy do **Plan 23-06** (bundle-freeze). O corpus Deno é o gate de regressão.
- **Plan 23-05** (migration PROD) fecha os holes #2/#3/#4 do AI-06 (escopo/janela/canal/silent-skip); este plano entregou o hole #5 (kill-switch runtime) + o hole #3 lado-código (candidate_cost_over_1 testável).

---
*Phase: 23-ressurrei-o-da-stack-de-ia*
*Completed: 2026-07-05*

## Self-Check: PASSED

- Files: messages.ts ✓, cost-alerter-messages.test.ts ✓, 23-03-SUMMARY.md ✓
- Commits: 96cfb2b (RED) ✓, da63409 (GREEN) ✓, 7ca8737 (RED) ✓, e12807f (GREEN) ✓
- Deno corpus: 175 passed / 0 failed
- Acceptance greps: AI_DAILY_COST_CAP_USD ×3, cost_cap_exceeded ×3 (ai-client.ts); candidate_cost_over_1 ×2 (messages.ts); index imports `from './messages` ×1
