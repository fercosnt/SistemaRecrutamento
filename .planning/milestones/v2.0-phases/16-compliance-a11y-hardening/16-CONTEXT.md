# Phase 16: Compliance & A11y Hardening - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas resolved via user acceptance

<domain>
## Phase Boundary

Close the v2.0 milestone with release quality: every **main** RH and Candidate screen
of M2 passes WCAG AA (axe-core ≥90, verified in CI), and the M1-inherited tech-debt is
triaged — the cheap, high-value items fixed in-phase, the heavy items documented and
deferred. This is a hardening phase: no NEW user-facing features, only compliance,
accessibility, and quality of existing surfaces. **Requirement: LGPD-05.**

</domain>

<decisions>
## Implementation Decisions

### Scope & Triage (grey area 1 — "A11y + cheap wins")
- **In scope (fix now):** axe-core ≥90 on the main M2 RH+Candidate screens; add an
  axe-core CI gate; the carry-in a11y batch + the 3 Phase-15 UI polish one-liners;
  remove debug `console.log` on the RH-path; trivial tsc-error burn-down (FOUND-08).
- **Document-and-defer (out of scope, logged as backlog):** HARD-02 bundle
  code-splitting (661 KiB monolith), PERF-01 cache-invalidation ≤60s. These are large,
  higher-risk, and the success criterion explicitly permits documented deferral.
- Rationale: tractable, low-risk, satisfies LGPD-05 without a multi-day bundle/perf effort.

### Auth-hook RLS gap (grey area 2 — "Fix in Phase 16")
- **User decision:** fix RH-login in-phase. **BUT — verified live in PROD 2026-06-26, the
  DB-level RLS gap is ALREADY CLOSED** (it was applied sometime after the 2026-06-22 memory).
  Confirmed by direct PROD inspection:
  - `usuarios_rh` has policy `auth_admin_le_usuarios_rh` — **SELECT** for `supabase_auth_admin`, `USING true`.
  - `supabase_auth_admin` holds the **SELECT table grant** on `usuarios_rh` AND **EXECUTE** on the hook.
  - `custom_access_token_hook` (SECURITY INVOKER) reads `usuarios_rh` (ativo + deleted_at IS NULL),
    maps `recrutador`→`rh` / `administrador`→`administrador`, falls back to `candidato`. The chain is correct end-to-end.
- **Therefore DO NOT author a redundant auth-hook RLS migration.** The residual RH-login risk is
  the **frontend race** — `src/components/pages/LoginRHPage.tsx` reads the role before the JWT
  rehydrates (the staged, currently-uncommitted fix). Phase 16 auth work = **(1) commit that
  staged LoginRHPage.tsx race fix, (2) verify a real RH-login round-trip yields role='rh'/'administrador'
  in the JWT (live UAT — needs a real RH user), (3) document that the RLS+grant+hook chain is
  PROD-verified complete.** No new PROD migration for the hook unless the live verify surfaces a real DB gap.
- (The other items in `reference_auth_hook_rls_gap` — confirmation_token NULL, admin-only gate —
  are GoTrue/data concerns; check during the live verify, don't pre-emptively migrate.)

### tsc Baseline Burn-down (grey area 3 — "Trivial burn-down")
- Fix the **cheap, obvious** tsc errors only (unused vars, enum typos like `'bigfive'`
  vs `big_five` / `'clinica'` vs `clinico` / `'tempo_integral'` in `vagasTypes.ts`+
  `vagasService.ts`, object-literal key mismatches). Reduce the ~291 baseline meaningfully;
  **keep** the documented husky-hook bypass (`core.hooksPath=/dev/null`). Do NOT chase the
  long tail or re-enable the pre-commit hook (deferred).

### Claude's Discretion
- The exact axe-core threshold wiring (per-screen `@axe-core/playwright` assertions vs an
  aggregate score), which screens count as "main", and the precise CI job shape are at
  Claude's discretion within "axe-core ≥90 in CI on main M2 screens".
- Whether to delete the WR-02 `biasMath` dead-mirror vs leave it (lean toward delete if
  truly unreferenced).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@axe-core/playwright ^4.11.3`** is already a dependency; **`e2e/a11y.spec.ts`** already
  exists; **`playwright.config.ts`** present. Phase 16 EXPANDS this harness to the main M2
  screens + a CI gate — it does not set a11y up from scratch.
- Radix/shadcn primitives already provide accessible bases (e.g. Phase 15 used Radix
  `Tooltip`, not native `title=`). Prefer fixing via the existing primitives.

### Established Patterns
- a11y testing = `@axe-core/playwright` in e2e (matches "verified in CI" + existing setup).
- PROD DDL via Supabase MCP `apply_migration` (no-BEGIN/COMMIT wrapper); reconcile version rows after.
- Commits use the `git -c core.hooksPath=/dev/null` bypass (tsc pre-commit hook vs legacy baseline).

### Integration Points
- CI: extend `.github/workflows/` with an axe-core a11y job (or fold into the existing test job).
- Auth-hook fix: a new `supabase/migrations/*` (grant + RLS policy on `usuarios_rh` for
  `supabase_auth_admin`), applied to PROD; pairs with `src/components/pages/LoginRHPage.tsx`.
- tsc fixes localized to `src/features/vagas/types/vagasTypes.ts`, `vagasService.ts`, etc.

</code_context>

<specifics>
## Specific Ideas

Carry-in worklist (from Phase 14/15 reviews + STATE):
- **3 Phase-15 polish one-liners:** `DecisaoFinalPage.tsx:178` `text-[#35BFAD]`→`text-white/70`;
  `ConsolidacaoDashboard.tsx:58` `font-medium`→`font-semibold`; `BiasAuditPage.tsx:87`
  `text-[28px]`→`text-3xl md:text-4xl`.
- **5 Phase-15 a11y items + Phase-14 a11y carry-in batch:** ARIA tablist semantics; custom-radio
  keyboard nav; amber-on-translucent AA contrast; `text-white/50-60` micro-label contrast bump;
  tooltip/`cursor-help` keyboard reachability; slider `aria-valuetext`.
- **Misc cleanups:** dead "Agendar" CTA; autosave-copy-mismatch; WR-02 `biasMath` dead-mirror
  (delete if unreferenced); debug `console.log` on RH-path.

</specifics>

<deferred>
## Deferred Ideas

- **HARD-02** bundle code-splitting (661 KiB monolithic bundle; Lighthouse warn-baseline 0.62-0.68) — document as backlog.
- **PERF-01** cache-invalidation ≤60s window between apply and candidate-profile display — document as backlog.
- **Full tsc burn-down to 0** + re-enabling the husky pre-commit hook — beyond "trivial".
- **Migration-version drift** reconciliation (MCP apply_migration timestamp vs filename version) — cosmetic, defer.

</deferred>
