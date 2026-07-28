# Plan 11-04 SUMMARY — [BLOCKING] PROD apply

**Plan:** 11-04 (avaliacao-prod-apply) · type checkpoint:human-verify (autonomous:false)
**Executed:** 2026-06-09 by the orchestrator via Supabase MCP + CLI, under standing user authorization ("take decisions yourself").
**Status:** complete — all acceptance criteria met.

## Applied to live PROD (project `isljnozzlvckrgjjbjwp`)

1. **4 migrations applied** via Supabase MCP `apply_migration` (no 42601 — no-wrapper authoring held even for the PL/pgSQL `pontuar_sjt`/`get_opcoes_sjt` `$$` bodies). NOTE: db push --linked was NOT used — the Phase-10 MCP applies left version-row drift (`20260608235734…` vs filenames); MCP apply_migration is the consistent path this session. Live schema is correct; the supabase_migrations version strings differ cosmetically from filenames (reconcile is non-blocking).
   - `20260611000001_scores_candidato` — generic score sink (tipo_score enum forward-declares sjt/big_five/redacao/entrevista/cognitivo/decisao for P12-15; status_score) + candidato-DENY RLS + RH allowlist + UNIQUE NULLS NOT DISTINCT idempotency.
   - `20260611000002_perguntas_sjt` — `perguntas` SJT bank + dedicated `perguntas_opcao_sjt` weights (answer-key protected: NO candidato SELECT) + `get_opcoes_sjt()` SECURITY DEFINER (id+texto only, randomized) + 8-cargo seed (10 perguntas: 9 MC + 1 open-case; 36 options).
   - `20260611000003_respostas_avaliacao` — autosave/progress + etapa-gated back-lock RLS (avaliacao_assincrona in USING + WITH CHECK).
   - `20260611000004_pontuar_sjt_rpc` — deterministic Σ peso SECURITY DEFINER RPC (owner+etapa authz 42501; per-vaga mc_min_pct default 60; pendente_humano; never writes candidaturas).
2. **`work_sample_sjt` prompt flipped is_active=true** (verified).
3. **`avaliar-redacao` EF deployed JWT-ON** (script 432.8 kB).
4. **`database.types.ts` regenerated** at repo ROOT (contains scores_candidato, perguntas_opcao_sjt, respostas_avaliacao). Committed.

## Live verification
| Check | Result |
|-------|--------|
| 4 new tables present | ✅ |
| pontuar_sjt + get_opcoes_sjt | ✅ both exist |
| work_sample_sjt is_active | ✅ true |
| SJT bank seeded | ✅ 10 perguntas / 36 opções (8 cargos) |
| avaliar-redacao deployed | ✅ JWT-ON |

## SQL smokes (via MCP execute_sql, set_config jwt.claims, ROLLBACK-free fixtures restored)
| Smoke | Result |
|-------|--------|
| SMOKE-1 — Σ peso correctness | ✅ 3× fortemente_pontua → 12/12, status=sucesso, no atencao |
| SMOKE-2 — atencao → pendente_humano | ✅ 8/12 (1 atencao) → pendente_humano, has_atencao=true |
| SMOKE-3 — non-owner → 42501 | ✅ raised forbidden |
| SMOKE-4 — owner wrong-etapa (triagem) → 42501 | ✅ raised forbidden (back-lock) |
| SMOKE-5 — never-auto-reject | ✅ candidaturas.etapa_atual unchanged by scoring |
| SMOKE-7 — scores candidato DENY / RH read | ✅ candidato 0 rows, RH 1 row |
| SMOKE-8 — get_opcoes_sjt projects id+texto only | ✅ 4 options, no peso/tag exposed (answer-key safe) |
| SMOKE-6 — etapa-gate RLS back-lock | covered-by-policy (same etapa predicate SMOKE-4 exercised live + the respostas_avaliacao USING/WITH CHECK clauses) |

All fixtures rolled back — scores_candidato + respostas_avaliacao back to 0 rows.

## Open items for UAT (deferred — see 11-HUMAN-UAT.md)
- Full candidate assessment flow live (real candidatura at avaliacao_assincrona → SJT MC + open-case → autosave → back-lock).
- avaliar-redacao open-case AI scoring quality (real AI call, weighted 0-25, <13/25 OR red_flag → pendente_humano).
- RH scorecard visual.

## Deviation
- MCP `apply_migration` instead of db push (version-row drift from Phase-10 MCP applies). Live schema authoritative; local migration files match. The supabase_migrations version strings are cosmetically out of sync with filenames — a one-time `migration repair` could reconcile, deferred (non-blocking; Phase 16 hardening candidate).
