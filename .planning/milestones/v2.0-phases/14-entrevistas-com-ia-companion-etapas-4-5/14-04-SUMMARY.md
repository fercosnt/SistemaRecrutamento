---
phase: 14-entrevistas-com-ia-companion-etapas-4-5
plan: 04
subsystem: infra-prod-apply
status: complete
tags: [supabase, apply_migration, edge-functions, prompt-hydration, rls, rnf-07a, prod, smokes]

# Dependency graph
requires:
  - phase: 14-entrevistas-com-ia-companion-etapas-4-5
    provides: "14-03 authored migrations (4) + 2 EFs; 14-01 scorer/schemas; 14-02 empty item-bank contract"
provides:
  - "LIVE PROD: entrevista_guias + entrevista_analises + cognitivo_itens + cognitivo_respostas (candidate-DENY/etapa-gated RLS)"
  - "LIVE PROD: salvar_avaliacao_entrevista + pontuar_cognitivo RPCs + avancar_etapa flag-block guard"
  - "2 EFs deployed JWT-on: gerar-guia-entrevista + avaliar-transcricao-entrevista"
  - "interview_guide + transcript_analysis prompts hydrated + is_active=true (content-first)"
  - "database.types.ts regenerated at repo ROOT (entrevista_guias + cognitivo_* + 2 RPCs)"
affects: [14-05-RH-UI, 14-06-candidate-cognitive-UI]

tech-stack:
  added: []
  patterns:
    - "Orchestrator-run live PROD apply via Supabase MCP apply_migration (D-22) — bypasses 42601, writes version rows"
    - "Prompt hydration content-first BEFORE deployed_at (Pitfall 6 immutability ordering)"
    - "Disposable-fixture live smokes with set_config jwt.claims role simulation + ROLLBACK-free teardown (Phase-8/11)"
---

# Plan 14-04 — [BLOCKING] Live PROD Apply — COMPLETE

**Human checkpoint** (autonomous:false, high blast radius). User authorized "Apply to PROD now (I run it)";
the orchestrator ran the full apply via Supabase MCP + CLI. PROD project `isljnozzlvckrgjjbjwp`.

## Task 1 — migrations + prompt hydration + types (DONE)
- **4 migrations applied** in order via MCP `apply_migration` (D-22, no BEGIN/COMMIT wrapper, no 42601):
  `entrevista_cognitivo_tables` → `salvar_avaliacao_entrevista_rpc` → `pontuar_cognitivo_rpc` →
  `avancar_etapa_flag_guard`. **Pre-flight verified** the live `avancar_etapa()` body matched the
  migration's reproduction exactly before the CREATE OR REPLACE (no Phase-6/8 logic regressed);
  `scores_candidato` has the conflict target `(candidatura_id,tipo,subtipo,pergunta_id) NULLS NOT DISTINCT`;
  `tipo_score` already carried `cognitivo`/`entrevista` (no `ALTER TYPE`); `etapa_processo` order confirms
  `> entrevista_online` ⇒ presencial/decisao.
- **Prompts hydrated content-first**: `interview_guide` (sys 2496 / usr 749) + `transcript_analysis`
  (sys 2571 / usr 726, the Etapa-2 scoring block) UPDATEd from `04-interview-guide.md`/`05-transcript-analysis.md`
  (dollar-quoted) + `is_active=true`, `deployed_at` left NULL (Pitfall 6). Verified `still_placeholder=false`.
- **Cognitive items seeded: 0 rows** (ENTREV-05 live items deferred per user; the empty-seed defensive
  path is exercised by the smokes).
- **`database.types.ts` regenerated** (`npm run db:types --linked`) — 9 grep matches for the new entities (≥7).

## Task 2 — EF deploy + live SQL smokes (DONE)
- **Both EFs deployed JWT-on** via `supabase functions deploy` (auto-bundled all 11 `_shared` deps —
  no `.join` bug): `gerar-guia-entrevista`, `avaliar-transcricao-entrevista`.
- **7/7 live SQL smokes PASS** (disposable fixture, role-simulated, ROLLBACK-free teardown — 0 residual rows):
  1. flag-block server-authoritative (advance raised `check_violation`; released after human confirm) — RNF-07a
  2. `pontuar_cognitivo` non-owner → 42501
  3. cognitive scoring wrote `scores_candidato` but candidaturas UNCHANGED (never-auto-reject)
  4. `aplica_cognitivo=false` opt-in gate (default OFF)
  5. `salvar_avaliacao_entrevista` non-owner RH → 42501
  6. candidate-DENY RLS (candidato sees 0 `entrevista_analises` rows)
  7. both EFs anon `curl` → HTTP 401 (JWT-on)
- `14-VALIDATION.md` updated with the live results; `nyquist_compliant: true` flipped.

## Deviations
- None functional. The cognitive item seed is 0 rows by user decision (14-02 deferral) — documented; the
  `pontuar_cognitivo` defensive `nTotal<=0 → na_media` branch is the live-exercised path.

## Notes for downstream (14-05 / 14-06)
- Live endpoints + live `database.types.ts` are ready: the RH workspace (14-05) and candidate prova (14-06)
  can build against the deployed EFs/RPCs and regenerated types.
- MCP `apply_migration` wrote timestamp-versioned migration rows (not the filename versions) — cosmetic
  version drift vs `supabase db push`, deferred to Phase 16 reconcile (Phase 11 precedent).

## Self-Check: PASSED (live PROD apply verified by 7/7 smokes; RNF-07a holds live)
