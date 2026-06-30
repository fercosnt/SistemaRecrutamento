---
status: closed_via_phase21
phase: 20-refino-rh-editar-guia-de-entrevista-seed-001
source: [20-VERIFICATION.md]
started: 2026-06-30
updated: 2026-06-30
deferred_to: Phase 21 (live UAT)
---

## Current Test

[awaiting live PROD round-trip — by design, deferred to Phase 21]

All 9 must-haves verified server-side: migration LIVE (apply_migration), RPC authz 6/6 SQL
smokes (incl. claim-liar = role from usuarios_rh not JWT), EF merge-preserve Deno 4/4, edit-UI
RTL 13/13, vitest 692/692, tsc 257. The 2 items below need a real RH account editing a real
guide in PROD — Phase 21's scope.

## Tests

### UAT-20-01 — RH edits a real guide in PROD (ENTREV-06/07/08)
- **Why manual:** needs a real RH account (recrutador owning a vaga) + a candidatura with a guide.
- **Steps:** As RH-with-posse, open the guia tab, toggle "Editar guia", edit a pergunta's text +
  dimensão, add a manual question, delete one, reorder via up/down, "Salvar edições". Confirm it
  persists (reload) and the manual question shows the "Manual" badge. As an RH-without-posse /
  candidato, confirm the save is denied (permission copy, no raw error).
- **Status:** deferred → Phase 21

### UAT-20-02 — Regen preserves manual edits (ENTREV-08 anti-silent-discard)
- **Why manual:** needs the live gerar-guia EF (v4) + a guide with a saved manual question.
- **Steps:** After saving a manual question, click "Gerar guia" (regen). Confirm the manual
  question SURVIVES (still present, text intact, "Manual" badge) alongside fresh IA questions —
  not silently discarded. Confirm a failed/garbled regen does not clobber manual questions.
- **Status:** deferred → Phase 21

## Notes

- Known limitation (deferred-items.md): top-level guide fields (introduction/closing/
  scoring_instructions) are not preserved across a manual save (anti-tamper tradeoff; recoverable
  via regen). Not part of these UATs.
- When Phase 21 runs these green, re-run /gsd-verify-work 20 to flip 20-VERIFICATION.md to passed.


## Phase 21 closure (2026-06-30)
Deferred live UATs executed/closed in Phase 21 (live PROD). See `.planning/phases/21-production-readiness-uats-live/21-HUMAN-UAT.md` + `21-RUNBOOK.md`. Backend/deterministic halves PASS live; visual residue → 21-RUNBOOK; literal SR/overload re-deferred with justification.
