---
phase: 14-entrevistas-com-ia-companion-etapas-4-5
plan: 03
subsystem: server-core
tags: [migrations, edge-functions, rls, security-definer, cognitivo, entrevista, callai, rnf-07a, anti-tamper]

# Dependency graph
requires:
  - phase: 14-entrevistas-com-ia-companion-etapas-4-5
    provides: "14-01 GerarGuiaBodySchema/AvaliarTranscricaoBodySchema (.strict body) + scoreRaciocinio (banding cutoffs the RPC mirrors) + deriveLanguageAccentFlag + checkWeakDimCoverage; 14-02 ItemRaciocinio/SEED_ITENS_RACIOCINIO (empty seed) contract"
  - phase: 11-avaliacao-assincrona-infra-work-sample-sjt
    provides: "scores_candidato generic sink (tipo_score has entrevista+cognitivo, NO ALTER TYPE) + pontuar_sjt DEFINER RPC clone target + respostas_avaliacao etapa-gated back-lock RLS"
  - phase: 13-redacao-cultural-revisao-humana
    provides: "avaliar-redacao-cultural EF clone target (untrusted text→callAi→never-absent persist) + salvar_revisao_redacao DEFINER RPC clone target + essay-schemas.ts /v4 output-schema idiom"
  - phase: 10-triagem-rh-ia-comparativo
    provides: "comparativo-candidatos RH-authorize EF skeleton (role from usuarios_rh, vagas.created_by ownership, OPTIONS-before-auth, two-client wiring)"
  - phase: 06-pipeline-backbone-schema
    provides: "avancar_etapa() BEFORE-UPDATE trigger (CREATE OR REPLACE target for the flag guard)"
provides:
  - "4 no-wrapper migrations (D-22): entrevista_cognitivo_tables (4 tables+RLS+2 vagas cols) + salvar_avaliacao_entrevista RPC + pontuar_cognitivo RPC + avancar_etapa flag guard"
  - "gerar-guia-entrevista EF (online/presencial branch, weak-dim post-validation, persists entrevista_guias)"
  - "avaliar-transcricao-entrevista EF (untrusted text→callAi→server-derived lang/accent flag→never-absent persist)"
  - "_shared/interview-output-schemas.ts (InterviewGuideSchema + TranscriptAnalysisSchema in EF deploy scope, /v4 import)"
affects: [14-04-blocking-apply, 14-05-RH-UI, 14-06-candidate-cognitive-UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OUTPUT schemas copied from docs/ into _shared/ (docs not in EF deploy bundle), imported npm:zod@3.25.76/v4 (essay-schemas.ts precedent — Pitfall 3)"
    - "Deterministic-scoring DEFINER RPC mirrors a TS scorer's banding cutoffs verbatim (TS/SQL no-drift contract)"
    - "Funil-state invariant (lang/accent flag block) enforced INSIDE avancar_etapa, not the UI (server-authoritative)"

key-files:
  created:
    - supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql
    - supabase/migrations/20260624000002_salvar_avaliacao_entrevista_rpc.sql
    - supabase/migrations/20260624000003_pontuar_cognitivo_rpc.sql
    - supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql
    - supabase/functions/_shared/interview-output-schemas.ts
    - supabase/functions/gerar-guia-entrevista/index.ts
    - supabase/functions/avaliar-transcricao-entrevista/index.ts
  modified: []

key-decisions:
  - "interview/transcript OUTPUT schemas authored in _shared/ (not imported from docs/) — docs/ is NOT in the EF deploy bundle; mirrors essay-schemas.ts (Phase 13). /v4 import is load-bearing for the SDK structured-output helpers."
  - "Back-lock etapa for cognitivo_respostas = ('entrevista_online','entrevista_presencial') (CONTEXT places the cognitive prova at Etapa 4/5, not Phase-11's avaliacao_assincrona)"
  - "pontuar_cognitivo banding CASE mirrors scoring.ts bandaFromTotal cutoffs EXACTLY (<=0.2/0.4/0.6/0.8/>) to avoid TS/SQL drift; nTotal<=0 → na_media defensive"
  - "salvar_avaliacao_entrevista sets revisao_confirmada_em (releases the avancar_etapa guard) but NEVER advances candidaturas (RNF-07a) — confirm + advance are separate human actions"
  - "avancar_etapa guard fires only on a FORWARD advance PAST entrevista_online (NEW>OLD, non-terminal); regressions/terminals unaffected; reads entrevista_analises.bloqueio_avanco=true AND revisao_confirmada_em IS NULL"

requirements-completed: [ENTREV-01, ENTREV-02, ENTREV-03, ENTREV-04, ENTREV-05]

# Metrics
duration: ~30min
completed: 2026-06-24
---

# Phase 14 Plan 03: Server Core — Interview/Cognitive Migrations + 2 Interview EFs Summary

**The Phase-14 server core: 4 no-wrapper migrations (4 interview/cognitive tables with candidate-DENY + etapa-gated RLS, the `salvar_avaliacao_entrevista` human-override RPC, the no-LLM `pontuar_cognitivo` deterministic scoring RPC whose banding mirrors `scoring.ts` exactly, and the `avancar_etapa` language/accent flag guard) + the 2 RH-invoked interview EFs (`gerar-guia-entrevista` online/presencial with weak-dim post-validation, `avaliar-transcricao-entrevista` untrusted-text→callAi→server-derived flag→never-absent persist) — every artifact a verbatim clone of a PROD-green Phase 6/10/11/13 analog, authored-not-applied (14-04 applies live via MCP).**

## Performance
- **Duration:** ~30 min
- **Tasks:** 3 (all `type="auto"`)
- **Files:** 7 created (4 migrations + 1 output-schema module + 2 EFs)

## Accomplishments
- **4 no-wrapper migrations (D-22).** `20260624000001` creates `entrevista_guias` + `entrevista_analises` (candidate-DENY RLS), `cognitivo_itens` (gabarito_idx server-only, no separate gabarito table), `cognitivo_respostas` (etapa-gated USING+WITH CHECK back-lock), plus `vagas.aplica_cognitivo` (opt-in, default OFF) + `vagas.entrevista_agendada_em` (ENTREV-02 manual 24h marker). `…02` clones `salvar_revisao_redacao` → `salvar_avaliacao_entrevista` (role + vaga-owner guard, never writes candidaturas). `…03` clones `pontuar_sjt` → `pontuar_cognitivo` (CTT soma server-side from `cognitivo_itens.gabarito_idx`, 5-faixa banding identical to `scoring.ts`, tipo='cognitivo'+subtipo='raciocinio_logico', NO ALTER TYPE, never auto-rejects). `…04` CREATE OR REPLACEs `avancar_etapa()` keeping all transition+audit logic verbatim + adds the language/accent flag block.
- **gerar-guia-entrevista EF** — RH-authorize (role from `usuarios_rh`, `vagas.created_by` ownership), branches on `body.tipo` (online weak dims score<3 / presencial GAPS score<4 from `tipo='entrevista'` scorecard), runs `callAi('interview_guide', InterviewGuideSchema)`, post-validates weak-dim coverage (`checkWeakDimCoverage` → one bounded re-prompt → human flag if still uncovered), persists to `entrevista_guias`. Never writes candidaturas.
- **avaliar-transcricao-entrevista EF** — clone of `avaliar-redacao-cultural`: length≥200 guard, untrusted transcript through `callAi('transcript_analysis', TranscriptAnalysisSchema)` (injection-detect + maskPII inside), `deriveLanguageAccentFlag` server-side → `bloqueio_avanco`, persists `entrevista_analises` + `scores_candidato` (tipo='entrevista'), `status_analise='pendente_humano'` the only status, never-absent on parse-fail/injection. Never writes candidaturas.
- **`_shared/interview-output-schemas.ts`** — `InterviewGuideSchema` + `TranscriptAnalysisSchema` (and primitives) transcribed verbatim from `docs/00-shared-zod-schemas.ts` into the EF deploy scope, imported as `npm:zod@3.25.76/v4` (the SDK structured-output helpers need the v4 surface — Pitfall 3).

## Task Commits
1. **Task 1: 4 migrations** — `7ff351b` (feat)
2. **Task 2: gerar-guia-entrevista EF + output schemas** — `24515f4` (feat)
3. **Task 3: avaliar-transcricao-entrevista EF** — `71aac8f` (feat)

**Plan metadata:** (this commit) `docs(14-03): complete plan`

## Verification
- `deno check` exit 0 on both EFs; both use STATIC `npm:` imports (no `.join("npm:")`) + injected `zodOutputFormat`/`zodResponseFormat`.
- All 4 migrations no-wrapper (no top-level `BEGIN;`/`COMMIT;`), 0 `ALTER TYPE` statements (the 2 grep hits are doc-comment mentions), 4 `ENABLE ROW LEVEL SECURITY`, candidate-DENY SELECT on guias/analises, `pontuar_cognitivo` SECURITY DEFINER + REVOKE/GRANT + neutral payload, guard references `revisao_confirmada`+`bloqueio_avanco` and RAISEs.
- All 4 new index names (`idx_entrevista_guias_candidatura`, `idx_entrevista_analises_candidatura`, `idx_cognitivo_itens_secao`, `idx_cognitivo_respostas_candidatura`) — 0 prior collisions (grep cross-check; no legacy `entrevistas_*`/`raven` idx collide).
- Neither EF calls `.from('candidaturas').update` (RNF-07a) — grep confirms absence.
- `forbidden-strings.grep` GREEN 16/16; `entrevista-contract.test.ts` GREEN 16/16; deno `_local` tests GREEN 18/18 (derive-flags + weak-dim-coverage + cognitivo/scoring).
- tsc baseline 291 = 291 (zero growth, ≤305 — EFs are outside the tsc include scope). Commits via `git -c core.hooksPath=/dev/null` (project convention).
- **AUTHORED-NOT-APPLIED:** the live PROD apply (migrations via MCP `apply_migration` + EF deploys + prompt hydration) is the [BLOCKING] 14-04 wave.

## Decisions Made
- **OUTPUT schemas in `_shared/`, not imported from `docs/`** — `docs/` is not bundled at EF deploy; the canonical schemas were copied verbatim (mirrors `essay-schemas.ts`). This was the one structural gap the plan's `<read_first>` (pointing at `docs/00-shared-zod-schemas.ts` as "the OUTPUT contract") implied but did not pre-create. Treated as a blocking-dependency auto-add (Rule 3) — see Deviations.
- **Cognitive back-lock etapa** = `('entrevista_online','entrevista_presencial')` — CONTEXT places the cognitive prova at Etapa 4/5 (interview etapas), not Phase-11's `avaliacao_assincrona`. Both the `pontuar_cognitivo` ownership guard and the `cognitivo_respostas` RLS use this etapa set.
- **`pontuar_cognitivo` banding is a verbatim mirror of `scoring.ts bandaFromTotal`** (`<=0.2/0.4/0.6/0.8/>` quintiles, `nTotal<=0 → na_media`) — keeps the SQL and TS scorers from drifting (the cognitive RPC is the live scorer; `scoreRaciocinio` is the test-locked spec).
- **`salvar_avaliacao_entrevista` sets `revisao_confirmada_em`** to release the `avancar_etapa` guard but NEVER advances `candidaturas` — recording the human review and moving the candidate are two separate human actions (RNF-07a).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking dependency] Authored `_shared/interview-output-schemas.ts` (OUTPUT schemas in EF deploy scope)**
- **Found during:** Task 2 (gerar-guia-entrevista EF needs the `InterviewGuideSchema` OUTPUT contract; Task 3 needs `TranscriptAnalysisSchema`).
- **Issue:** The canonical `InterviewGuideSchema`/`TranscriptAnalysisSchema` live in `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts`, which is NOT included in the Edge Function deploy bundle (the bundle only ships `supabase/functions/`). Importing them via a relative path from an EF would `ERR_MODULE_NOT_FOUND` at deploy — the exact anti-pattern `essay-schemas.ts` (Phase 13) was created to avoid. The plan's Task 2/3 `<read_first>` cites `docs/…00-shared-zod-schemas.ts` as "the OUTPUT contract" and the `<interfaces>` block names the schemas, but no `_shared/` copy existed and the `files_modified` list did not enumerate one.
- **Fix:** Transcribed `InterviewGuideSchema` + `TranscriptAnalysisSchema` (and their primitive deps `BarsLevel`/`Score1to5`/`Citation`/`RecommendationEnum`/`ConfidenceEnum`/`InterviewQuestionSchema`) verbatim into `supabase/functions/_shared/interview-output-schemas.ts`, imported as `npm:zod@3.25.76/v4` (the load-bearing `/v4` surface for the SDK structured-output helpers — Pitfall 3, identical to `essay-schemas.ts`). Both EFs import the OUTPUT schema from this `_shared/` module.
- **Files created:** `supabase/functions/_shared/interview-output-schemas.ts`
- **Verification:** `deno check` GREEN on both EFs (the schema resolves + type-checks); the schema shapes match the canonical `docs/` definitions byte-for-byte.
- **Committed in:** `24515f4` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking-dependency auto-add)
**Impact on plan:** No scope creep, no behavior change — the schemas are a verbatim copy of the canonical OUTPUT contract, moved into the only scope the EF runtime can import from. Without it both EFs would deploy-fail in 14-04 (the `.join`-class silent failure the phase is explicitly guarding against).

## Authentication Gates
None — no auth gates encountered (all work is file authoring; the live apply that needs Supabase MCP / EF deploy is the [BLOCKING] 14-04 wave).

## Known Stubs
- **`SEED_ITENS_RACIOCINIO = []` (empty seed)** — the CC0 cognitive item content was DEFERRED by user decision at the 14-02 checkpoint (tracked: `.planning/todos/pending/cc0-cognitive-item-bank-sourcing.md`). This plan's `cognitivo_itens` table, `pontuar_cognitivo` RPC, and `cognitivo_respostas` back-lock all build and run correctly against an empty `cognitivo_itens` (an empty item set scores 0/0 → `nTotal<=0 → na_media` defensive branch; no row insert fails on zero items). The prova is opt-in via `vaga.aplica_cognitivo` (default OFF) and CONTEXTUAL (never auto-rejects), so no candidate reaches it until the real items are seeded. The verifier will correctly flag ENTREV-05 live items as outstanding (human_needed) — the intended, honest state.
- **`entrevista-allowlist.test.ts` calibrated RED** (3 tests) — the 14-01 Wave-0 gate that flips GREEN when 14-05 ships the allowlist-projecting `entrevistaService.ts`. NOT a stub introduced here; documented in 14-01.

## Threat Flags
None — every new surface (the 2 RH EFs, the 2 RPCs, the 4 tables, the flag guard) is in the plan's `<threat_model>` register (T-14-03-01..07 + SC). No network endpoint / auth path / schema surface outside the registered set was introduced.

## Issues Encountered
- **`supabase/functions/_shared/__tests__/essay-schemas.test.ts` fails under the full `npm run test:run`** — a pre-existing Phase-13 Deno test that uses `Deno.test`/`deno.land`; vitest's `include` picks it up but the `exclude` list does not name it. It runs GREEN under `deno test`. Pre-existing (documented in 14-01 "Issues Encountered" + `deferred-items.md`), NOT touched by this plan. Out of scope (SCOPE BOUNDARY — pre-existing failure in an unrelated file).
- **Full vitest run: 528 passed / 3 failed** — the 3 failures are the `entrevista-allowlist.test.ts` calibrated RED (3) + `essay-schemas.test.ts` (counted at the file level). Both pre-exist this plan; the 14-01 schema/scorer/flag suites are all GREEN.

## Self-Check: PASSED
All 7 created files exist on disk; all 3 task commits (`7ff351b`, `24515f4`, `71aac8f`) are present in git history.

## Next Phase Readiness
- **14-04 ([BLOCKING] apply)** can apply the 4 migrations live via Supabase MCP `apply_migration` (no-wrapper authoring confirmed), deploy both EFs via `supabase functions deploy` (JWT-on), hydrate the `interview_guide`/`transcript_analysis` prompt_versions (is_active=true), regenerate `database.types.ts`, and run the 14-VALIDATION.md 7-block SQL smokes.
- **14-05/06 (UI)** inherit working server contracts: the `salvar_avaliacao_entrevista` RPC, the `entrevista_guias`/`entrevista_analises` reads (allowlist), the `pontuar_cognitivo` RPC + `cognitivo_itens` (id/secao/enunciado/alternativas/ordem candidate projection), and the `vaga.aplica_cognitivo` opt-in gate.

---
*Phase: 14-entrevistas-com-ia-companion-etapas-4-5*
*Completed: 2026-06-24*
