---
id: found-08-tsc-burndown-tail
created: 2026-06-26
source: Phase 16 / Plan 16-01 (documented-deferral; 16-RESEARCH §Pitfall 1 + 16-CONTEXT §Deferred)
priority: low
resolves_phase: null
tags: [found-08, tsc, typescript, type-check, husky, deferred, m1-tech-debt]
---

# FOUND-08 — Structural tsc burn-down tail (deferred)

Phase 16 burns down the **cheap, self-contained** tsc errors only (unused vars/imports,
the 2 confirmed one-line enum typos). The **structural tail** below stays **deferred** —
each item needs a real type/schema decision, not a one-liner, and is out of proportion to
a hardening phase (16-RESEARCH.md §Pitfall 1; 16-CONTEXT.md §tsc Baseline Burn-down,
§Deferred; 16-UI-SPEC.md §5).

## What is deferred (the structural tail)

- **TS2307 (largest bucket, ~65 errors) — vendored shadcn primitives.** All in
  `src/components/ui/*` (the versioned-import pattern of the vendored shadcn/Radix
  primitives). **DO NOT touch** — these are the legacy-baseline core; "fixing" them risks
  the whole primitive library. Structural / out-of-scope.
- **TS7006 (~45) implicit-any params**, **TS2322 (~43) type-assignment**,
  **TS2339 (~23) property-missing**, **TS2345 (~8)** — each needs a real per-site type
  decision; not mechanical. Deferred.
- **TS2551 "Did you mean…" (~17) — schema/form-shape mismatches.** In
  `CriarEditarVagaPage.tsx` (`faixa_salarial` / `descricao_completa` / `requisito_*` →
  columns absent on the generated row type) and `DadosProfissionaisStep.tsx`
  (`dadosProfissionais` → `dadosPessoais`, cascades ~12×). These LOOK like typos but are
  structural — a single rename cascades. Deferred (verify each before any future touch).
- **The `tempo_integral` `TIPO_VAGA_LABELS` map (TS2353) — a DECISION, not a typo.**
  `TipoVaga = 'CLT' | 'PJ'` (verified), but the `TIPO_VAGA_LABELS` map in
  `src/features/vagas/types/vagasTypes.ts` still keys on the stale
  `tempo_integral` / `meio_periodo` / `estagio` / `temporario` set. Fixing it means
  EITHER rewriting the map to `{ CLT, PJ }` OR widening the `TipoVaga` union — a product
  decision about the vaga-type taxonomy, deferred out of the trivial burn-down.
  (Contrast: the 2 IN-SCOPE one-liners that WERE fixable are `clinica`→`clinico` and
  `big_five`→`bigfive` — true one-char enum typos with a self-contained fix.)

## What is KEPT (intentionally, documented)

- **The husky pre-commit hook bypass `core.hooksPath=/dev/null` is KEPT.** Phase 16 does
  NOT re-enable the husky tsc pre-commit hook against the legacy baseline — every commit
  continues to use the `git -c core.hooksPath=/dev/null commit …` form (the established
  project convention). Re-enabling the hook requires the full tsc tail above to reach 0,
  which is explicitly deferred.
- **Migration-version drift reconciliation** (Supabase MCP `apply_migration` timestamp
  version vs the migration filename version) — cosmetic, deferred per 16-CONTEXT §Deferred.

## The gate that DOES stay enforced
The `ci.yml` tsc gate is **zero-growth**: CI goes red only if the `error TS` count RISES
above the frozen baseline. Phase 16 re-measures after the trivial burn-down and LOWERS the
baseline to the new (dropped) count (handled in 16-04), so the gate tightens — it does not
require the structural tail to be cleared.

## Success criterion it satisfies
ROADMAP Phase-16 criterion: *"M1-inherited tech-debt is triaged … the heavy items
documented and deferred."* The full tsc burn-down to 0 + husky re-enable is the heavy item;
this doc is its required documentation (with the structural histogram, the `tempo_integral`
map decision, the kept `core.hooksPath` bypass, and the migration-version drift).
