---
phase: 07-configura-o-de-vaga-tags
plan: 01
subsystem: config-vaga (test scaffold + live-DB smoke runbook)
tags: [wave-0, nyquist, red-scaffold, vitest, rtl, sql-smoke, d-13-regression]
requires:
  - "Phase-4 candidaturaFormSchema.ts (shipped reader the D-13 regression guards)"
  - "Live RLS idiom from 20260607000006_rls_policies_m2_backbone.sql"
provides:
  - "9 Wave-0 test files (RED until Plans 03/04 land the modules)"
  - "07-SQL-SMOKE-RUNBOOK.md (consumed by Plan 02 apply checkpoint + /gsd:verify-work)"
  - "wave_0_complete: true in 07-VALIDATION.md"
affects:
  - "Plans 03/04 (flip these RED tests GREEN, then set nyquist_compliant: true)"
  - "Plan 02 (consumes the SQL smoke runbook after schema apply)"
tech-stack:
  added: []
  patterns:
    - "Wave-0 RED scaffold: tests COMPILE under TS strict, FAIL at runtime (module-not-found) by design"
    - "Neutral normalizer import @/lib/opcoes/opcoesNormalize avoids vagas→config-vaga cross-feature edge"
    - "it.each loop covering all 8 cargo slugs for the sum-to-100 invariant"
key-files:
  created:
    - "src/features/config-vaga/schemas/__tests__/pesosAvaliacaoSchema.test.ts"
    - "src/features/config-vaga/templates/__tests__/cargoTemplates.test.ts"
    - "src/features/config-vaga/__tests__/publishGate.test.ts"
    - "src/features/config-vaga/components/__tests__/TemplateVagaSelector.test.tsx"
    - "src/features/config-vaga/components/__tests__/PesosSliders.test.tsx"
    - "src/features/config-vaga/components/__tests__/PerguntaWithTagsForm.test.tsx"
    - "src/features/config-vaga/components/__tests__/BulkMarkDialog.test.tsx"
    - "src/features/config-vaga/services/__tests__/configVagaService.test.ts"
    - ".planning/phases/07-configura-o-de-vaga-tags/07-SQL-SMOKE-RUNBOOK.md"
  modified:
    - "src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts (D-13 regression: +2 cases, 16 preserved)"
    - ".planning/phases/07-configura-o-de-vaga-tags/07-VALIDATION.md (wave_0_complete: true)"
decisions:
  - "Whole-file RED is acceptable for candidaturaFormSchema.test.ts: the new @/lib/opcoes import fails at resolve time, taking the existing 16 cases RED until Plan 03 creates the normalizer; existing cases are textually preserved (49 ins / 0 del) and flip back GREEN with the module"
  - "publishGate fn placed at src/features/config-vaga/publishGate.ts (feature root, not components/) — pure fn mirroring the isUuid util test idiom"
metrics:
  duration: "~12 min"
  completed: "2026-06-07"
  tasks: 3
  files: 11
---

# Phase 7 Plan 01: Wave-0 Test Scaffold & SQL Smoke Runbook Summary

Front-loaded all Phase-7 Nyquist scaffolds — 9 RED Vitest/RTL test files asserting the planned config-vaga module contracts (pesos schema, 8 cargo templates, D-12 publish gate, TemplateVagaSelector, PesosSliders, tag wizard, BulkMarkDialog, configVagaService) plus the D-13 Phase-4 regression case — and authored the live SQL smoke runbook, before any module is implemented.

## What Was Built

- **Task 1 (commit `137a4bd`):** 4 RED scaffolds — `pesosAvaliacaoSchema.test.ts` (refine sum≠100 reject/accept + integer guard Pitfall 4 + `somaPesos`), `cargoTemplates.test.ts` (all 8 slugs sum to 100 via `it.each` + deep-copy mutation isolation), `publishGate.test.ts` (D-12 three isolated failing conditions + all-three + all-pass), `TemplateVagaSelector.test.tsx` (8 cards + deep-copy-on-select + Trocar-template AlertDialog).
- **Task 2 (commit `8fb1760`):** 3 RTL component tests (`PesosSliders` live-sum invalid/valid copy + no silent rebalance D-08; `PerguntaWithTagsForm` choice rows + empty-state for texto/numerico D-11; `BulkMarkDialog` reset-to-neutro/0/null D-11) + `configVagaService.test.ts` (vagas UPDATE + `upsert_pergunta_opcoes_metadata` RPC + `publish_vaga` RPC by exact name + 42501→`FORBIDDEN`). EXTENDED `candidaturaFormSchema.test.ts` with the D-13 regression (`[{id,texto}]`→`z.enum` via `@/lib/opcoes/opcoesNormalize`, idempotent with legacy `string[]`), preserving all 16 existing cases (49 ins / 0 del).
- **Task 3 (commit `6c3d8e9`):** `07-SQL-SMOKE-RUNBOOK.md` with 5 numbered live-DB sections (RPC idempotency / opcao_id gen + jsonb backfill / RLS deny candidato-anon 42501 / publish_vaga D-12 guard / `db push` up-to-date) against project `isljnozzlvckrgjjbjwp`; flipped `07-VALIDATION.md` `wave_0_complete: true` (left `nyquist_compliant: false`) with TemplateVagaSelector mapped to VAGACFG-01.

## Verification

- File-existence preflight passed for all 9 test files before each vitest run.
- `npx vitest run --reporter=verbose` confirmed RED for all 9 files — every failure is `Failed to resolve import` (module-not-found) for the planned paths, the intended Wave-0 assertion that the modules are absent. No assertion-level or syntax failures.
- candidaturaFormSchema.test.ts: 16 existing cases preserved (git numstat 49/0, zero deletions); 2 new D-13 cases added.
- `npm run build` exit 0 (test files excluded from the production build; no src/ runtime code added).
- Task 3 runbook grep gate `RUNBOOK_OK` passed (both RPC names + 42501/candidato/anon + wave_0_complete + TemplateVagaSelector present).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. All commits used the documented `git -c core.hooksPath=/dev/null` bypass (project convention, FOUND-08 tsc baseline).

### Notes

- The Task 1 commit `137a4bd` additionally swept in pre-staged Phase-7 planning docs (07-01/03/04-PLAN.md, 07-VALIDATION.md) that were already in the git index (`A`) at session start. Benign — they belong to this phase's planning. No unintended file was created or deleted by this plan.

## Authentication Gates

None.

## Known Stubs

None. The 9 test files are intentional Wave-0 RED scaffolds (not stub modules) — the plan's explicit contract is that the *production modules* do NOT exist yet; tests are RED for module-not-found until Plans 03/04 land them. No empty-value or placeholder src/ runtime code was introduced.

## Self-Check: PASSED

All 9 created test files + the runbook exist on disk; all 3 task commits (`137a4bd`, `8fb1760`, `6c3d8e9`) present in git log.
