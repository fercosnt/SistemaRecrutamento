# Phase 5: Perfil + Hardening MVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 5-Perfil + Hardening MVP
**Areas discussed:** Perfil gap & UX, E2E '100% in CI', Lighthouse / perf depth, a11y + token + backlog

---

## Perfil gap & UX (Area 1)

### Perfil UX — how much to touch the page

| Option | Description | Selected |
|--------|-------------|----------|
| Verify + polish only | Keep current layout; smoke-runtime confirm real data; fix styling/contrast; write E2E. No structural rework. | ✓ |
| Rework candidaturas list | Redesign listing and/or progresso block (per-candidatura progress). | |
| You decide after seeing it | Render + screenshot, recommend keep-vs-rework. | |

**User's choice:** Verify + polish only
**Notes:** Page already renders real candidaturas (status/etapa/date) + first-candidatura progresso block. Accepted as-is for M1 close.

### Styling fix — "fonts black on dark glass"

| Option | Description | Selected |
|--------|-------------|----------|
| Root-cause the glass-input pattern | Fix once at shared input/Select/glass primitive level, then sweep consumers. Ties into D-26 token. | ✓ |
| Targeted per-page fixes | Port cadastro glass-input styling page-by-page without touching primitives. | |
| Defer to backlog | Cosmetic; fix only what WCAG-AA strictly requires. | |

**User's choice:** Root-cause the glass-input pattern
**Notes:** Recurring across F-04.1-C, F-04-08-G, F-04.1-A. Reference styling = cadastro form.

---

## E2E '100% in CI' (Area 2)

### CI scope

| Option | Description | Selected |
|--------|-------------|----------|
| Set up real GitHub Actions | .github/workflows running Vitest + Playwright on push/PR; needs Supabase test-env + secrets. | ✓ |
| Green locally + CI-ready config | Reproducible local gate; defer GH Actions wiring to M2. | |
| You decide | Assess Supabase test-env feasibility and recommend. | |

**User's choice:** Set up real GitHub Actions
**Notes:** Research flag raised — CI Supabase strategy (test project vs live + test user) undecided; left for researcher.

### Spec hygiene

| Option | Description | Selected |
|--------|-------------|----------|
| Prune legacy + un-gate what's deterministic | Delete/merge legacy job-application-flow spec; deterministic core (login+cadastro+candidatura) at 100%; real-email/Supabase scenarios skipped-with-reason. | ✓ |
| Un-fixme everything | Invest in fixtures/mailbox automation so all scenarios run green. | |
| Keep all specs, just make green | No pruning; accept legacy + gated as-is. | |

**User's choice:** Prune legacy + un-gate what's deterministic
**Notes:** job-application-flow.spec.ts = PRD-0005 legacy dup of candidatura-submit.spec.ts.

---

## Lighthouse / perf depth (Area 3)

### Lighthouse gate

| Option | Description | Selected |
|--------|-------------|----------|
| Automate in CI (LHCI) | Lighthouse CI in GH Actions with >80 assertion budget on key routes. | ✓ |
| Manual gate + documented run | Run manually once, capture scores in verification artifact. | |
| You decide | Assess route stability, recommend. | |

**User's choice:** Automate in CI (LHCI)
**Notes:** Pairs with Area 2 real-CI decision.

### Perf fixes if Performance <80

| Option | Description | Selected |
|--------|-------------|----------|
| Measure first, fix only if flagged | Fold D-17 (enriquecerVaga N+1) only if Lighthouse <80. | ✓ |
| Fix D-17 proactively | Treat N+1 as definite task regardless of score. | |
| Defer all perf to M2 | Accept score; adjust threshold if <80. | |

**User's choice:** Measure first, fix only if flagged
**Notes:** Avoid premature optimization.

---

## a11y + token + backlog (Area 4)

### Token D-26 (bg-primary broken project-wide)

| Option | Description | Selected |
|--------|-------------|----------|
| Repair token + semantic sweep | Fix tailwind/globals HSL-vs-HEX mismatch, then sweep hex-literal workarounds to semantic tokens. | ✓ |
| Repair token only, no sweep | Fix definition; leave existing workarounds. | |
| Leave as-is | Document as accepted tech debt for M2. | |

**User's choice:** Repair token + semantic sweep
**Notes:** Pairs with the glass-primitive root-cause (D-02).

### a11y scope (HARD-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Full candidate-flow audit | All flows: cadastro, login, recovery, vagas, candidatura, perfil. | ✓ |
| Perfil + in-scope pages only | Limit to perfil + Lighthouse-flagged pages. | |
| You decide | Run audit first, scope to failures. | |

**User's choice:** Full candidate-flow audit
**Notes:** Aligns with Lighthouse a11y >80 + manual review demands.

### Backlog triage (multiSelect — which non-HARD items fold in)

| Option | Description | Selected |
|--------|-------------|----------|
| Quick UX bug fixes | F-04.1-B (CEP toast loop) + F-04.1-E (422 friendly toast). | ✓ |
| DB data hygiene migrations | F-04-08-B (soft-deleted vaga status sync) + F-04-08-C (bloco_valido schema drift migration). | ✓ |
| Code-review debt + primitives | WR-01-09/02-09 + GlassButton inline-flex fix + BeautySmileLogo type union. | ✓ |
| PKCE→OTP recovery migration (D-16) | Migrate recovery PKCE→OTP for cross-browser deeplink fix. | ✓ |

**User's choice:** ALL FOUR folded in
**Notes:** Deliberate "close M1 clean" call. D-16 flagged as carve-out candidate if it balloons during planning. Phase is now large — planner should expect multi-wave decomposition.

---

## Claude's Discretion

- Wave/plan decomposition (planner's call; expect several waves).
- Specific LHCI route budgets + per-route a11y audit depth.
- Internal structure of glass-input primitive fix + token sweep.
- Mechanical hardening items handled without discussion: HARD-03 (ErrorBoundary→root), HARD-05 (mobile validation), HARD-06 (DevNav DEV gating — already present, verify only).

## Deferred Ideas

- None pushed to M2 backlog — all four backlog buckets folded into Phase 5.
- Per-candidatura progresso UX (vs current first-candidatura-only block) — out of scope for M1; future enhancement.
- ⚠ Research flag for downstream: CI Supabase test-env strategy (dedicated test project vs live project + seeded test user + secrets).
