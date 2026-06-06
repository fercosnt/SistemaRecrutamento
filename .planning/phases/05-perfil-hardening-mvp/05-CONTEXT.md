# Phase 5: Perfil + Hardening MVP - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Final phase of milestone M1. Delivers two things: (1) the candidate sees their **real** application data on `/candidato/perfil` (PERF-01/02), and (2) the entire candidate MVP clears its quality gates — E2E suite green in CI, Lighthouse mobile >80 (Performance + Accessibility), a11y compliance, global ErrorBoundary, mobile validation, and DevNav hidden in production (HARD-01..06).

**Requirements:** PERF-01, PERF-02, HARD-01, HARD-02, HARD-03, HARD-04, HARD-05, HARD-06.

**Scope note — this is a large phase.** During discussion the user folded ALL deferred Phase 5 backlog items into scope (including the heaviest, D-16 PKCE→OTP). None is scope creep — every item maps to an existing PERF/HARD requirement or documented carryover debt — but the planner should expect a multi-wave breakdown. See `<deferred>` for the items explicitly flagged as candidates to carve into their own plan/sub-phase if they balloon during planning (notably D-16).

**Key grounding from codebase scout (changes what "build" means):**
- **PERF-01/02 are largely already implemented.** `src/components/pages/MeuPerfilCandidatoPage.tsx` (760 LoC, routed at `/candidato/perfil` in `src/router/routes.tsx:144`) already wires `useCandidaturas()` and renders real status badge + inscrição date + etapa label + empty state, with personal data from `useCandidato()`. → Phase 5 is **verify-and-polish**, not net-new build.
- **HARD-03** — `ErrorBoundary` exists at `src/features/cadastro/components/ErrorBoundary.tsx` but is scoped to cadastro; it is NOT plugged at the app root. → promote/hoist to App root.
- **HARD-06** — `DevNavigationMenu` is already gated by `import.meta.env.DEV` (`src/App.tsx:221`). → verify only; essentially done.
</domain>

<decisions>
## Implementation Decisions

### Perfil page (PERF-01/02) — Area 1
- **D-01:** **Verify + polish only.** Keep the current `MeuPerfilCandidatoPage` layout (candidaturas list + first-candidatura "PROGRESSO NO PROCESSO SELETIVO" block). Confirm via smoke-runtime that real data renders (no mock), fix styling/contrast, write the E2E. NO structural rework of the listing or progresso UX.

### Styling / glass-input root-cause — Area 1 (+ Area 4 token)
- **D-02:** **Root-cause the "fonts black on dark glass" bug at the shared primitive level.** The recurring dark-on-dark / black-font defects (F-04.1-C candidatura form fonts, F-04-08-G WCAG-AA contrast on BackgroundImage, F-04.1-A dropdown/Select initial text dark-on-dark) must be fixed once at the shared input / shadcn Select / glass primitive layer so the pattern cannot recur, then sweep consumers. Do NOT do per-page patches.

### E2E suite + CI (HARD-01) — Area 2
- **D-03:** **Set up REAL GitHub Actions CI.** Add `.github/workflows/*` running Vitest + Playwright on push/PR — an actual green checkmark, not just a local runbook. Requires Supabase test-env + test-user secrets in CI (see research flag below).
- **D-04:** **Prune legacy + require deterministic core at 100%.** Delete/merge the legacy `e2e/job-application-flow.spec.ts` (PRD-0005 duplicate of `e2e/candidatura-submit.spec.ts`). The deterministic core (login + cadastro + candidatura) must pass 100%. Scenarios that genuinely need real email / live Supabase stay **explicitly skipped-with-reason**, not silently fixme'd.
- **⚠ Research flag (downstream):** CI Supabase strategy is undecided — dedicated Supabase test project vs. the live project with a seeded test user + secrets. Researcher should determine the feasible/safe approach for running Playwright against Supabase in GitHub Actions (RLS, test-user provisioning, secret management, real-email scenarios).

### Lighthouse / performance (HARD-02) — Area 3
- **D-05:** **Automate Lighthouse in CI (LHCI).** Add Lighthouse CI to the GitHub Actions pipeline with an >80 assertion budget (Performance + Accessibility) on key routes. Pairs with D-03.
- **D-06:** **Measure-first on perf fixes.** Only fold D-17 (`vagasService.enriquecerVaga` N+1 — 3 queries per vaga → RPC/denormalization) or other perf optimization IF Lighthouse Performance actually comes in under 80. No premature optimization.

### Token repair (D-26) — Area 4
- **D-07:** **Repair the bg-primary token + semantic sweep.** Fix the `tailwind.config` (expects HSL components) vs `globals.css` (defines HEX → `hsl(#00109E)` invalid) mismatch so `bg-primary` resolves correctly, then sweep the hex-literal workarounds (e.g. `bg-[#00109E]`) back to semantic tokens. Pairs with the D-02 primitive work.

### Accessibility (HARD-04) — Area 4
- **D-08:** **Full candidate-flow a11y audit.** Audit + fix labels / tab order / visible focus across ALL candidate-facing flows: cadastro, login, recovery, vagas, candidatura, perfil. (This is what Lighthouse a11y >80 + manual review demand anyway.)

### Mechanical hardening (Claude handles — not discussed, low ambiguity)
- **D-09:** HARD-03 — promote/hoist `ErrorBoundary` to the App root.
- **D-10:** HARD-06 — verify `DevNavigationMenu` DEV gating (already present at `App.tsx:221`); no change expected.
- **D-11:** HARD-05 — manual iPhone 12 Pro viewport validation; confirm logout button reachable.

### Folded backlog items (all selected in Area 4 — fold into Phase 5)
- **D-12:** **Quick UX bug fixes** — F-04.1-B (CEP "encontrado" toast loops via useEffect dependency array) + F-04.1-E (422 transient on first `setNewPassword` → friendly retry toast).
- **D-13:** **DB data hygiene migrations** — F-04-08-B (vaga soft-deleted but `status='ativa'` → CHECK/trigger sync) + F-04-08-C (`bloco_valido_check` constraint schema drift → reconciliation migration). PL/pgSQL `db push` workaround applies (see CLAUDE.md + D-22).
- **D-14:** **Code-review debt + primitives** — WR-01-09 / WR-02-09 deferred review items + GlassButton inline-flex primitive root fix + BeautySmileLogo type union. Pairs with the D-02 glass-primitive work.
- **D-15:** **PKCE→OTP recovery migration (D-16)** — migrate password recovery from PKCE to OTP to fix the cross-browser deeplink limitation (hardens existing AUTH-03 recovery). **Heaviest single item — candidate to carve into its own plan/wave or inserted sub-phase if it balloons during planning.**

### Claude's Discretion
- Exact wave/plan decomposition (planner's call — but expect several waves given phase size).
- Which specific routes get LHCI budgets and a11y audit depth per route.
- Internal structure of the glass-input primitive fix and token sweep.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 5: Perfil + Hardening MVP" — goal, 5 success criteria, requirement list.
- `.planning/REQUIREMENTS.md` lines 55–65 + traceability rows 145–152 — PERF-01/02 + HARD-01..06 definitions.
- `docs/prds/PRD-MASTER-sistema-recrutamento.md` — master PRD for the recruitment system.

### Smoke-runtime gate & UI-SPEC requirement (Phase 4.1 meta-deliverable — applies to this phase)
- `.planning/phases/04.1-auth-hydration-fix/04.1-VERIFICATION.md` — smoke-runtime gate definition (Phase 5 inherits this as a plan-checker requirement).
- `.planning/phases/02-cadastro-candidato/02-UI-SPEC.md` + `.planning/phases/03-login-recuperacao-senha/03-UI-SPEC.md` — UI-SPEC precedent (Phase 5 has UI hint: yes → consider `/gsd:ui-phase 5`).

### Deferred-findings provenance (the backlog items folded into scope)
- `.planning/STATE.md` — full ledger of F-04-08-A..G, F-04.1-A..E, D-16/D-17/D-26, WR-* (Decisions log + per-plan ledgers).
- `.planning/phases/04-vagas-candidatura/04-CONTEXT.md` §"Out-of-Scope — Defer to Roadmap Backlog" (lines 136–148) — D-16, D-17, perfil listing, E2E/Lighthouse/a11y all explicitly deferred TO Phase 5.
- `.planning/phases/03-login-recuperacao-senha/03-07-SUMMARY.md` — PKCE cross-browser limitation + 3 mitigations (D-16 source).

### Conventions & known workarounds
- `CLAUDE.md` §"Migrations + db push — workaround conhecido (PL/pgSQL)" — required for D-13 DB migrations.
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/ARCHITECTURE.md` — codebase maps.
- `.claude/skills/beauty-smile-design-system` — glass UI / Beauty Smile design tokens (relevant to D-02 + D-07).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/pages/MeuPerfilCandidatoPage.tsx` — already renders real candidaturas + personal data; the verify+polish target (D-01).
- `src/features/vagas/hooks/useCandidaturas.ts` (`useCandidaturas`, `candidaturasKeys`, `useCandidaturasCount`) — the real-data hook already consumed by the perfil page.
- `src/features/vagas/types/vagasTypes.ts` — `ETAPA_PROCESSO_LABELS`, `STATUS_CANDIDATURA_LABELS`, `Candidatura` type (status/etapa rendering).
- `src/features/cadastro/components/ErrorBoundary.tsx` — existing ErrorBoundary to promote to root (D-09 / HARD-03).
- `e2e/*.spec.ts` (7 specs) — existing Playwright suite; `cadastro-flow`, `login-flow`, `password-recovery-flow`, `candidatura-submit`, `auth-hydration`, `vagas-browse` are the keep set; `job-application-flow` is the legacy prune target (D-04).
- Cadastro glass-input styling — the reference styling to lift into the shared primitive (D-02).

### Established Patterns
- Glass UI Beauty Smile + shadcn/ui (Radix) primitives — the layer where D-02 root-cause fix lands.
- Smoke-runtime gate (Phase 4.1) — plan-checker requires real browser render before "complete", not just green unit/e2e gates. Directly relevant to D-01 (perfil) verification.
- Procedural `git -c core.hooksPath=/dev/null` lock-in; lint baseline **296** (zero-growth invariant carried from Phase 4.1/4.2).
- PL/pgSQL `db push` workaround (CLAUDE.md / D-22) — applies to D-13 migrations.

### Integration Points
- `.github/workflows/` — NEW (does not exist yet); D-03 CI + D-05 LHCI land here.
- `tailwind.config` + `src/.../globals.css` — D-07 token repair site (HSL-vs-HEX mismatch).
- `src/App.tsx` — ErrorBoundary root mount (D-09) + existing DevNav DEV gate at line 221 (D-10).

</code_context>

<specifics>
## Specific Ideas

- Perfil "PROGRESSO NO PROCESSO SELETIVO" block is currently driven by the *first* candidatura only — user accepted this as-is (D-01, no rework). Note for any future per-candidatura progress work (M2+).
- The glass-input fix should be lifted from the **cadastro** form's glass-input styling (the known-good reference per F-04.1-C: "copiar o mesmo design do formulario de cadastro").
- "100% in CI" means a real GitHub Actions green check, not a documented local runbook (D-03) — user was explicit.

</specifics>

<deferred>
## Deferred Ideas

- **None pushed to M2 backlog from this discussion.** The user deliberately folded ALL four candidate backlog buckets into Phase 5 (D-12, D-13, D-14, D-15). This is an intentional "close M1 clean" decision.
- **Carve-out candidate (not deferred, but flagged):** D-15 / D-16 (PKCE→OTP recovery migration) is the heaviest item. If planning shows it ballooning, the planner should split it into its own plan/wave or an inserted sub-phase rather than dropping it.
- **Per-candidatura progresso UX** (vs current first-candidatura-only block) — explicitly out of scope for M1 (D-01); future enhancement.

</deferred>

---

*Phase: 5-Perfil + Hardening MVP*
*Context gathered: 2026-06-06*
