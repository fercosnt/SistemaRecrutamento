---
phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
plan: 02
subsystem: database
tags: [postgres, plpgsql, security-definer, cognitivo, card-status, rls, idor, sql-smoke, supabase]

# Dependency graph
requires:
  - phase: 14 (entrevistas-com-ia — gap closure CR-01/CR-02)
    provides: the LIVE 5-arg pontuar_cognitivo (20260625000001), cognitivo_itens/cognitivo_respostas, CR-01 empty-bank guard
  - phase: 11 (avaliacao-assincrona infra)
    provides: scores_candidato sink (tipo/subtipo), respostas_avaliacao autosave, get_opcoes_sjt neutral-DEFINER-reader envelope
  - phase: 23 (redacoes_candidato + salvar_revisao_redacao)
    provides: the redacoes_candidato essay write-path (the redacao registrado source)
  - phase: 24 (SEC blindagem)
    provides: sec05_08_smokes.sql impersonation idiom (set_config request.jwt.claims + SET ROLE authenticated)
provides:
  - "pontuar_cognitivo gate relax (files-only): the LIVE 5-arg overload accepts etapa 'avaliacao_assincrona' ADDED to the interview stages — cognitivo reachable as an async assessment (FUNIL-08 DB back-stop)"
  - "get_avaliacao_status(uuid) neutral DEFINER RPC (files-only): per-test PRESENCE booleans only for the 5 cards — the own-row truth source that closes the phantom entry.status read (FUNIL-12 DB truth source)"
  - "funil08_pontuar_cognitivo_smokes.sql + funil12_status_rpc_smoke.sql: behavioral gates over impersonated JWTs (RED until 26-07)"
affects: [26-05 (client consumes get_avaliacao_status + cognitivo card/route), 26-06 (deriveCards from RPC + honest copy), 26-07 (Wave 4 BLOCKING apply + smoke run), 27 (database.types.ts regen)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CREATE OR REPLACE of a live overload with a single-token delta (add an enum literal to the etapa IN) — full body byte-preserved so CR-01/CR-02/CTT do not silently regress"
    - "Neutral DEFINER status reader returning PRESENCE booleans only (EXISTS per row), never the row content — the RLS-row-deny + read-through-RPC posture (RLS hides rows, not columns)"
    - "redacao card keyed on the actual essay write-path (redacoes_candidato), not a phantom scores tipo — sourcing the boolean from what actually writes"
    - "Self-contained disposable SQL smoke around a discovered real candidato; jsonb-walk assertion that every card leaf is a boolean + no verdict key reachable"

key-files:
  created:
    - supabase/migrations/20260712100002_funil08_pontuar_cognitivo_gate.sql
    - supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql
    - supabase/tests/funil08_pontuar_cognitivo_smokes.sql
    - supabase/tests/funil12_status_rpc_smoke.sql
  modified: []

key-decisions:
  - "FUNIL-08 = Option A: ADD 'avaliacao_assincrona' to the pontuar_cognitivo etapa IN, KEEP the two interview stages (no regression); the rest of the 5-arg body is byte-preserved from 20260625000001:68-199"
  - "FUNIL-12 get_avaliacao_status returns PRESENCE booleans only (registrado/iniciado) — never score/status/score_max/metadata (RNF-07a / Pitfall 8); smoke jsonb-walks every leaf to prove booleans-only"
  - "redacao.registrado sourced from redacoes_candidato (the avaliar-redacao-cultural EF upsert + salvar_revisao_redacao RPC), NOT scores_candidato tipo=redacao (nothing writes that row — a scores-keyed redacao card would stay eternally Pendente)"
  - "sjt_caso_aberto is a distinct card: registrado from scores_candidato subtipo='caso_aberto' (avaliar-redacao EF); iniciado from respostas_avaliacao teste='sjt_caso_aberto'"
  - "sjt_mc carries registrado only (no iniciado) — SjtMultiplaEscolhaScreen has NO autosave, so a teste='sjt' draft boolean would be permanently false"
  - "Ownership gate WITHOUT an etapa clause (card state is readable across etapas) → 42501 on a foreign candidatura (IDOR); scores_candidato keeps its candidate-DENY row policy (no candidate SELECT policy added)"

patterns-established:
  - "Overload-preserving CREATE OR REPLACE: copy the full live body, change only the requirement's delta; the acceptance grep asserts CR-01/CR-02 tokens survive so a truncated copy cannot pass"
  - "Autosave-key ground-truthing: iniciado booleans use the CONFIRMED respostas_avaliacao.teste constants (redacao/sjt_caso_aberto/big_five), never an invented key"

requirements-advanced: [FUNIL-08, FUNIL-12]

# Metrics
duration: 15min
completed: 2026-07-12
---

# Phase 26 Plan 02: Cognitivo reachability + neutral card-status RPC (FUNIL-08 + FUNIL-12) Summary

**Authored the two DB halves that make the cognitive assessment reachable and give the candidate cards a neutral own-row truth source: `CREATE OR REPLACE` the LIVE 5-arg `pontuar_cognitivo` adding `avaliacao_assincrona` to the etapa gate (interview stages kept — no regression), and a new `get_avaliacao_status` DEFINER RPC returning per-test PRESENCE booleans only for the 5 cards; both plus their behavioral smokes are files-only, live apply deferred to the Wave 4 BLOCKING plan 26-07.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-12
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments
- **FUNIL-08 (A18) — cognitivo reachable (DB back-stop):** `CREATE OR REPLACE public.pontuar_cognitivo(uuid, jsonb, text, int, jsonb)` with the etapa gate widened to `IN ('entrevista_online','entrevista_presencial','avaliacao_assincrona')` — the async stage is **ADDED**, the two interview stages are **KEPT** (Pitfall 5, no interview-stage regression). The full body is copied byte-for-byte from the live `20260625000001:68-199`, so the CR-01 empty-bank guard (`no_data_found` 'prova cognitiva sem itens configurados'), the CR-02 `cognitivo_respostas` raw-picks persistence, the CTT soma + 5-band scoring, and the neutral `scores_candidato` insert/return all survive unchanged.
- **FUNIL-12 (A41) — neutral card-status truth source:** new `get_avaliacao_status(uuid)` SECURITY DEFINER RPC returns per-test **presence booleans only** for the five container cards (`sjt_mc`, `sjt_caso_aberto`, `big_five`, `redacao`, `cognitivo`) — closing the phantom `entry.status` read. `redacao.registrado` is sourced from **`redacoes_candidato`** (the essay write-path), `sjt_caso_aberto.registrado` from `scores_candidato subtipo='caso_aberto'`; each `iniciado` uses the CONFIRMED `respostas_avaliacao.teste` autosave keys (`sjt_caso_aberto`/`redacao`/`big_five`).
- **Security (RNF-07a + IDOR):** the status RPC never leaks a verdict — booleans only, no `score`/`status`/`score_max`/`metadata` key anywhere in the payload; the ownership gate (`candidatos.user_id = auth.uid()`, no etapa clause) RAISEs 42501 on a foreign candidatura; `scores_candidato` keeps its candidate-DENY row policy (no candidate SELECT policy added).
- **Behavioral gates:** `funil08_pontuar_cognitivo_smokes.sql` (async submit registrado + interview submit still registrado + one cognitivo score row each) and `funil12_status_rpc_smoke.sql` (booleans-only jsonb-walk + own-row `sjt_mc.registrado=true` + foreign-user IDOR 42501) — both impersonated-JWT, disposable-fixture, ROLLBACK-free, RED until 26-07.

## Task Commits

Each task was committed atomically (hooks-bypass per project rule):

1. **Task 1: Relax the pontuar_cognitivo etapa gate + FUNIL-08 smoke** - `5f2252e` (feat)
2. **Task 2: get_avaliacao_status neutral RPC + FUNIL-12 smoke** - `97c0233` (feat)

**Plan metadata:** _(final docs commit — this SUMMARY + STATE + ROADMAP)_

## Files Created/Modified
- `supabase/migrations/20260712100002_funil08_pontuar_cognitivo_gate.sql` - `CREATE OR REPLACE` the 5-arg `pontuar_cognitivo`; single delta = `avaliacao_assincrona` added to the etapa `IN`; CR-01/CR-02/CTT/insert/return byte-preserved; correct `SET search_path=''` envelope + REVOKE/GRANT tail; no `BEGIN/COMMIT` wrapper; COMMENT updated to name the added stage.
- `supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql` - new neutral DEFINER RPC; ownership gate (no etapa clause) → 42501 IDOR; per-card `jsonb_build_object` of presence booleans (`registrado`/`iniciado`), 9 `EXISTS` subqueries; redacao on `redacoes_candidato`; REVOKE PUBLIC / GRANT authenticated tail.
- `supabase/tests/funil08_pontuar_cognitivo_smokes.sql` - impersonated-JWT smoke (3 PASS notices): async registrado, interview no-regression, one cognitivo row per candidatura; seeds one disposable `cognitivo_itens` so the CR-01 empty-bank guard does not fire; cleanup deletes the global item row explicitly.
- `supabase/tests/funil12_status_rpc_smoke.sql` - impersonated-JWT smoke (3 PASS notices): jsonb-walk booleans-only + no verdict key, own-row `sjt_mc.registrado=true` from a seeded MC score, foreign-user IDOR 42501; ROLLBACK-free cleanup.

## Decisions Made
- **Requirement status kept honest — FUNIL-08/FUNIL-12 remain `Pending` in REQUIREMENTS.md.** This plan delivers only the DB half. FUNIL-08 (cognitivo reachable *via navigation*: card gate on `vaga.aplica_cognitivo` + the real `/candidato/prova-cognitiva/:id` route) and FUNIL-12 (cards *derive* completion from the RPC) are not satisfied until their client halves land in 26-05/26-06 and the migrations apply in 26-07. Marking them complete now (the DB back-stop alone) would misrepresent status against M4's honesty theme, so no `requirements mark-complete` was run for this plan.
- **Overload-preserving copy over a truncated template.** RESEARCH Example 3 showed only `:68-103`; copying that would silently drop the CR-01 empty-bank guard and CR-02 persistence while still passing every structural grep. The acceptance criteria (and this plan) grep for `cognitivo_respostas` + `no_data_found` precisely to force a full-body copy — done from the live `20260625000001:68-199`.
- **`redacao` keyed on the write-path, not a phantom score.** Verified in-tree that the essay flow writes `redacoes_candidato` only (`avaliar-redacao-cultural` EF upsert + `salvar_revisao_redacao` RPC) and that nothing writes `scores_candidato tipo=redacao`; the `sjt_caso_aberto` (open case) is the row that lands in `scores_candidato subtipo='caso_aberto'` (the `avaliar-redacao` EF). Keying redacao on scores would have kept that card eternally Pendente (the FUNIL-12 bug in a new form).

## Deviations from Plan

None - plan executed exactly as written. Both migrations and both smokes match the plan `<action>` blocks; the get_avaliacao_status body follows RESEARCH §Code Example 6 with the two BLOCKER-2 corrections the plan mandates (redacao ← redacoes_candidato; explicit sjt_caso_aberto card). No auto-fixes (Rules 1-3) were required. tsc unaffected (SQL-only), baseline held at 107.

## Issues Encountered
- The candidate-facing base tables (`candidaturas`/`candidatos`/`vagas`) are M1 pre-versioned baseline (the DBMIG-01/Phase-27 gap), so their exact NOT NULL column set is not fully knowable from the repo. Both smokes source their insert columns from the 26-01 fixture + `submit_candidatura`/`seed.sql` precedent and wrap fixture-build in a skip-with-NOTICE exception handler, so the Wave 4 (26-07) agent running against live PROD can adjust any residual schema gap before the smokes go GREEN.
- `pontuar_cognitivo` scores over ALL `cognitivo_itens` (there is no per-candidatura item scoping and the CC0 bank is deferred to M5). The funil08 smoke therefore seeds one disposable item so the CR-01 empty-bank guard cannot fire, and asserts only `registrado` (row written, no error) — never a specific score — so it is robust whether or not PROD already holds real items.

## User Setup Required
None - no external service configuration. The live apply of both migrations and the two smoke runs are the BLOCKING Wave 4 plan 26-07 (Supabase MCP `apply_migration` / `execute_sql`).

## Next Phase Readiness
- Files-only deliverable ready for the Wave 4 BLOCKING apply (26-07): apply `20260712100002` + `20260712100003` via MCP `apply_migration`, then run `funil08_pontuar_cognitivo_smokes.sql` + `funil12_status_rpc_smoke.sql` via `execute_sql` — expect 3 PASS notices each, zero EXCEPTION.
- Client-half dependents unblocked: 26-05 (avaliacaoService calls `get_avaliacao_status` via the narrow confined cast + adds the cognitivo card/route) and 26-06 (deriveCards from RPC + honest copy) can consume both RPCs.
- No blockers. `database.types.ts` regen for the new `get_avaliacao_status` RPC is Phase 27 (26-05 uses the confined-cast idiom until then).

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260712100002_funil08_pontuar_cognitivo_gate.sql`
- FOUND: `supabase/migrations/20260712100003_funil12_get_avaliacao_status.sql`
- FOUND: `supabase/tests/funil08_pontuar_cognitivo_smokes.sql`
- FOUND: `supabase/tests/funil12_status_rpc_smoke.sql`
- FOUND: `.planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-02-SUMMARY.md`
- FOUND commit: `5f2252e` (Task 1) · `97c0233` (Task 2)
- tsc baseline held at 107 (SQL-only changes, no growth)

---
*Phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring*
*Completed: 2026-07-12*
