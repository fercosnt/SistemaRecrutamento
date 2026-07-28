---
phase: 14-entrevistas-com-ia-companion-etapas-4-5
plan: 02
subsystem: cognitivo
status: partial-deferred
tags: [cognitivo, cc0, item-bank, entrev-05, deferred, license]

# Dependency graph
requires:
  - phase: 14-entrevistas-com-ia-companion-etapas-4-5
    provides: "14-01 scoreRaciocinio scorer + SecaoRaciocinio/gabarito contract that ItemRaciocinio must stay consistent with"
provides:
  - "ItemRaciocinio typed contract { id, secao, enunciado, alternativas[], gabarito_idx } (item-bank.ts)"
  - "docs/conhecimento/cognitivo/README.md — CC0-only sourcing convention"
  - "SEED_ITENS_RACIOCINIO = [] ([PENDING] — real CC0 items deferred to follow-up todo)"
affects: [14-03-seed-migration, 14-06-candidate-cognitive-UI]

tech-stack:
  added: []
  patterns:
    - "Typed item-bank contract decoupled from item content — lets schema/RPC/UI ship against an empty seed; live items hydrate later"
---

# Plan 14-02 — CC0 Cognitive Item Bank — PARTIAL (Task 2 deferred by user decision)

**Outcome:** Task 1 complete; Task 2 (CC0 item-content sourcing) **deferred** by explicit
user decision at the `checkpoint:human-verify` gate during Phase 14 autonomous execution
(2026-06-24). Tracked as a follow-up: `.planning/todos/pending/cc0-cognitive-item-bank-sourcing.md`.

## Task 1 — DONE (commit `880ff86`)
- `supabase/functions/_shared/cognitivo/item-bank.ts` — the `ItemRaciocinio` interface
  `{ id, secao, enunciado, alternativas[], gabarito_idx }`, `buildGabarito` / `buildSecoesByItem`
  helpers, and `SEED_ITENS_RACIOCINIO: ItemRaciocinio[] = []` ([PENDING] placeholder). Consistent
  with 14-01's `scoreRaciocinio` (`secao` = `"matriz" | "letra_numero"`, server-only `gabarito_idx`).
- `docs/conhecimento/cognitivo/README.md` — documents the CC0-only rule, forbids the legacy
  Raven `.webp` blobs and the non-commercial icar-project.com bank.
- Verification green: `deno check` exit 0; contract greps ≥1; forbidden-strings guard 16/16
  (no `QI` / `teste psicológico`).

## Task 2 — DEFERRED (checkpoint:human-verify)
The dataset `doi:10.7910/DVN/TZJGAT` was confirmed **CC0 1.0** (Harvard Dataverse API), but the
`.tab` files carry only the answer keys + item statistics — the actual item **stems** (matrix
figures + letter-number series text + alternatives) are published separately and require human
sourcing + CC0 provenance verification. The executor correctly refused to fabricate item content.
Per user decision, the live item bank is deferred; `itens-raciocinio-cc0.json` + `LICENSE-CC0.md`
are NOT created in this phase.

## Impact on ENTREV-05
ENTREV-05 infra still ships fully in Phase 14: the deterministic scorer (`scoreRaciocinio`, 14-01),
the `pontuar_cognitivo` RPC + `cognitivo_*` tables (14-03), and the candidate prova UI + light
proctoring (14-06) all build and run against the **empty seed**. The prova is opt-in via
`vaga.aplica_cognitivo` (default **OFF**) and CONTEXTUAL (never auto-rejects, RNF-07a), so no
candidate reaches it until the real items are seeded via the follow-up todo. The verifier will
correctly flag ENTREV-05 live-items as outstanding (human_needed) — this is the intended, honest state.

## Self-Check: PASSED (partial — deferral documented + tracked)
