---
phase: 16-compliance-a11y-hardening
verified: 2026-06-26T11:10:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "RH cold-start login round-trip (real recrutador account)"
    expected: "Log in with a real 'rh' account and land on /rh/dashboard — no 'sem acesso' bounce. Log in with 'administrador' — same. JWT app_metadata.role is 'rh' or 'administrador' respectively."
    why_human: "No real RH PROD account was available in-session. The LoginRHPage.tsx race+gate fix is committed (464ead8). Automated R1 axe (/auth/login-rh) is GREEN. The live cold-start DB round-trip (usuarios_rh fetchProfile) cannot be exercised without a real RH credential."
  - test: "Tier-B screens — R5 RedacaoReviewPanel and C5 BigFiveQuestionnaireScreen axe sweep (E2E_REAL_LOGIN)"
    expected: "With E2E_REAL_LOGIN=1 and a seeded live candidatura, both screens pass axe serious/critical=0 (same WCAG AA bar as the 15 Tier-A screens)."
    why_human: "R5 reads live redacoes_candidato + review state; C5 renders 120 Likert items from live scores_candidato. Both require a seeded live session. These are the documented Tier-B screens (A1 assumption) — the 15 Tier-A unconditional screens are GREEN."
  - test: "Keyboard roving focus (AB-5) on Radix Tabs + RadioGroups over glass"
    expected: "Tab into the EntrevistaWorkspace tablist → ArrowLeft/Right moves selection. Tab into SjtMultiplaEscolha and BigFive radiogroups → ArrowUp/Down/Left/Right moves selection. Radix tooltip triggers (BiasAuditPage 4/5-flag, ProvaCognitivaScreen submit hint, EntrevistaDashboard Agendar CTA) are reachable by Tab and activate on Enter/Space."
    why_human: "axe-core (headless) does not model keyboard event routing on Radix Tabs/RadioGroup. These are GREEN on axe but require real browser keyboard interaction. Documented as AB-5/AB-6/AB-8 in 16-03-SUMMARY manual-check items."
  - test: "Visible focus ring on glass surfaces (AB-6)"
    expected: "Every Radix tab trigger, radiogroup item, slider thumb, and the Agendar/tooltip-span focusable wrappers show a visible focus ring over the dark #00109E glass composite."
    why_human: "Focus-ring visibility is not in axe's headless rule set — requires sighted keyboard navigation over the actual composited glass UI."
---

# Phase 16: Compliance & A11y Hardening Verification Report

**Phase Goal:** Todo o lado RH e candidato do M2 passa WCAG AA, e o tech-debt herdado do M1 é endereçado — fechando o milestone com qualidade de release.
**Verified:** 2026-06-26T11:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 15 in-scope main M2 screens pass axe-core ≥90 (zero serious/critical, WCAG AA), verified in CI via unconditional Tier-A loop | ✓ VERIFIED | `e2e/a11y.spec.ts` lists 15 Tier-A tests (5 public + 15 Tier-A + 2 Tier-B skip). Playwright `--list` confirms 22 tests, R6/R7/R8 explicitly included. SUMMARY 16-03 confirms live Playwright chromium run: all 15 Tier-A GREEN. FX-01 through FX-14 fixes land across plans 16-02/16-03/16-04. |
| 2 | Tier-A axe gate is wired into CI unconditionally (no env-gate, no skip) | ✓ VERIFIED | `e2e/a11y.spec.ts`: Tier-A loop uses unconditional `for ... test(...)` (lines 175–203). CI e2e job runs `npx playwright test --project=chromium` (no `E2E_AUTH_TEST_USERS` gate for the Tier-A loop). Tier-B only screens (R5/C5) use `test.skip(!process.env.E2E_REAL_LOGIN, ...)`. |
| 3 | The original Phase-5 public-route axe loop (strict `toEqual([])`, both `.exclude()` constants) is preserved untouched | ✓ VERIFIED | `e2e/a11y.spec.ts:90` still asserts `expect(results.violations).toEqual([])`. Both `DEFERRED_SELECT_PLACEHOLDER` and `OTP_TRANSPARENT_INPUT` constants present (lines 60, 78). |
| 4 | FX-14 RH-path console.* grep guard is GREEN (zero console.log/debug/info/warn on RH path) | ✓ VERIFIED | `npm run test:run -- rh-console.grep` → 4/4 PASSED (independently run this session). `PerfilCandidatoRHPage.tsx` and `SuporteRHPage.tsx` both show 0 `console.(log\|debug\|info\|warn)` matches. |
| 5 | DecisaoFinalPage uses Radix Tabs (not hand-rolled aria-pressed); accent leak (#35BFAD) removed | ✓ VERIFIED | `grep "from '@/components/ui/tabs'"` matches line 29 of `DecisaoFinalPage.tsx`. `grep "text-\[#35BFAD\]"` = 0 matches. |
| 6 | RegistrarDecisaoForm uses Radix RadioGroup (not hand-rolled role=radiogroup) | ✓ VERIFIED | `grep "from '@/components/ui/radio-group'"` matches line 36 of `RegistrarDecisaoForm.tsx`. `grep "role=\"radiogroup\""` = 0 matches. |
| 7 | BiasAuditPage H1 uses `text-3xl` role token; cursor-help tooltip triggers are keyboard-focusable (real `<button>`) | ✓ VERIFIED | `text-3xl` found at line 87 of `BiasAuditPage.tsx`. `text-\[28px\]` = 0 matches. `type="button"` found at line 200 (the 4/5-flag tooltip trigger). |
| 8 | EntrevistaWorkspace uses Radix Tabs; BARS sliders carry `aria-valuetext` | ✓ VERIFIED | `grep "from '@/components/ui/tabs'"` matches line 26 of `EntrevistaWorkspace.tsx`. `aria-pressed` = 0 matches. `aria-valuetext` confirmed at `EntrevistaScorecardInline.tsx:116` and `RedacaoOverrideForm.tsx:223`. |
| 9 | Dead biasMath runtime functions removed; live type exports preserved; build exits 0 | ✓ VERIFIED | `grep "function computeAdverseImpact\|function bandFromAge"` in `biasMath.ts` = 0 matches. `export interface BandResult` (line 49) and `export interface AdverseImpactResult` (line 65) present. `__tests__/biasMath.test.ts` deleted. `npm run build` exits 0 (confirmed this session). |
| 10 | Three deferral backlog docs exist; HARD-02, PERF-01, FOUND-08 tsc tail documented | ✓ VERIFIED | All three files verified: `hard-02-bundle-code-splitting.md` (mentions "661" and "Lighthouse"), `perf-01-cache-invalidation.md` (mentions "60s" and "perfil"), `found-08-tsc-burndown-tail.md` (mentions "TS2307", "tempo_integral", "core.hooksPath"). |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `e2e/a11y.spec.ts` | Tier-A unconditional axe loop + public loop preserved | ✓ VERIFIED | 22 tests total; 15 Tier-A screens listed; public loop at line 80–92 untouched strict |
| `e2e/fixtures/a11y-session.ts` | `makeJwt` + `mockSession` + `driveLogin` exports | ✓ VERIFIED | File exists; exports `MockRole`, `makeJwt`, `mockSession`, `driveLogin` |
| `src/__tests__/guards/rh-console.grep.test.ts` | FX-14 grep guard, node:fs, 4/4 GREEN | ✓ VERIFIED | Uses `node:fs` (confirmed); `child_process` absent; 4/4 GREEN this session |
| `src/features/decisao/components/DecisaoFinalPage.tsx` | Radix Tabs import + no accent leak | ✓ VERIFIED | Tabs imported line 29; zero `text-[#35BFAD]` |
| `src/features/decisao/components/RegistrarDecisaoForm.tsx` | RadioGroup import + no hand-roll | ✓ VERIFIED | RadioGroup imported line 36; zero `role="radiogroup"` |
| `src/features/admin/bias-audit/components/BiasAuditPage.tsx` | `text-3xl`, keyboard-focusable tooltip trigger | ✓ VERIFIED | `text-3xl` line 87; `<button type="button">` line 200 |
| `src/features/entrevista/components/EntrevistaWorkspace.tsx` | Radix Tabs import + no `aria-pressed` | ✓ VERIFIED | Tabs imported line 26; zero `aria-pressed` |
| `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` | Radix Tooltip import | ✓ VERIFIED | Tooltip imported line 45 |
| `src/features/admin/bias-audit/biasMath.ts` | Type exports live; dead fns gone | ✓ VERIFIED | Both interfaces present; functions absent; file ~82 lines (type-only) |
| `src/components/pages/LoginRHPage.tsx` | Poll 3s + gate `{rh, administrador}` | ✓ VERIFIED | Lines 115–123: `for (let i = 0; i < 60 && !role; i++) await ... setTimeout(r, 50)` + `role !== 'administrador' && role !== 'rh'` |
| `.github/workflows/ci.yml` | tsc baseline gate lowered (currently -gt 290) | ✓ VERIFIED | Line 52: `if [ "$COUNT" -gt 290 ]`. Live tsc count = 290 (confirmed this session). |
| `.planning/todos/pending/hard-02-bundle-code-splitting.md` | HARD-02 deferral doc | ✓ VERIFIED | Exists; grep tokens present |
| `.planning/todos/pending/perf-01-cache-invalidation.md` | PERF-01 deferral doc | ✓ VERIFIED | Exists; grep tokens present |
| `.planning/todos/pending/found-08-tsc-burndown-tail.md` | FOUND-08 structural tail deferral doc | ✓ VERIFIED | Exists; grep tokens present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `e2e/a11y.spec.ts` | `e2e/fixtures/a11y-session.ts` | `import { mockSession, driveLogin, type MockRole }` | ✓ WIRED | Line 26 of `a11y.spec.ts` |
| `DecisaoFinalPage.tsx` | `@/components/ui/tabs` | `import Tabs/TabsList/TabsTrigger/TabsContent` | ✓ WIRED | Line 29 |
| `RegistrarDecisaoForm.tsx` | `@/components/ui/radio-group` | `import RadioGroup/RadioGroupItem` | ✓ WIRED | Line 36 |
| `EntrevistaWorkspace.tsx` | `@/components/ui/tabs` | `import Tabs/TabsContent/TabsList/TabsTrigger` | ✓ WIRED | Line 26 |
| `ProvaCognitivaScreen.tsx` | `@/components/ui/tooltip` | `import Tooltip/TooltipTrigger/TooltipContent/TooltipProvider` | ✓ WIRED | Line 45 |
| `src/__tests__/guards/rh-console.grep.test.ts` | RH-path source files | `collectFiles` recursive scan; RH_PATH_FILES list | ✓ WIRED | Guard scans PerfilCandidatoRHPage, SuporteRHPage, features/decisao, entrevista, triagem |
| `biasAuditService.ts` | `biasMath.ts` | `import type { AdverseImpactResult, BandResult }` | ✓ WIRED | Types present in biasMath.ts; service not broken |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| LGPD-05 | 16-01, 16-02, 16-03, 16-04 | UI RH e Candidato passam WCAG AA (axe-core ≥90 nas telas principais) | ✓ SATISFIED | 15 Tier-A screens: unconditional CI gate in place; FX-01..FX-14 fixes landed; Playwright chromium run GREEN 15/15 per SUMMARY 16-03; live tsc=290, build=0, grep guard=GREEN |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/pages/PerfilCandidatoRHPage.tsx` | ~430-490 | Handlers now silent no-ops after console removal (`handleSalvarTranscricaoOnline`, etc.) — success UI fires without backend persistence | ℹ️ Info | Pre-existing placeholder state on a legacy `components/pages/` screen; FX-14 cleanup is correct; backend wiring is deferred as a tracked non-blocking item (CODE-REVIEW IN-03). |
| `src/components/pages/SuporteRHPage.tsx` | ~101 | Same pattern — `handleSubmit` shows success but does not persist | ℹ️ Info | Same as above — legacy screen, FX-14 correctly removed the console; backend wiring deferred. |
| `.github/workflows/ci.yml` | lines 12–16 | Header comment says "baseline 291" but the gate is `-gt 290` | ℹ️ Info | The stale prose comments (written at Plan 16-04 time, before WR-01 fixed it to 290) were not updated by the code-review WR-01 commit. Gate itself is correct at 290; comment drift is cosmetic only. |

**Debt marker scan:** No `TBD`, `FIXME`, or `XXX` markers found in Phase-16 modified source files.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build exits 0 | `npm run build` | exit 0 (built in 6.14s) | ✓ PASS |
| tsc error count = 290 (≤ gate of 290) | `npm run -s lint \| grep -c "error TS"` | 290 | ✓ PASS |
| 584 vitest tests pass (2 Deno suite-load failures pre-existing) | `npm run test:run` | 584 passed, 2 pre-existing Deno file failures (not tests) | ✓ PASS |
| FX-14 grep guard GREEN 4/4 | `npm run test:run -- rh-console.grep` | 4/4 passed | ✓ PASS |
| Playwright a11y spec parses — 22 tests listed | `npx playwright test e2e/a11y.spec.ts --list` | 22 tests (5 public + 15 Tier-A + 2 Tier-B) | ✓ PASS |

### Probe Execution

Step 7c: No `scripts/*/tests/probe-*.sh` probes exist for this phase. Phase 16 is a frontend/a11y/cleanup phase — no DB migration, no Edge Function deploy. SKIPPED (no phase probes defined).

### Human Verification Required

#### 1. RH Cold-Start Login Round-Trip

**Test:** After an idle period (COLD-START — the stress case for the 3s poll window), navigate to `/auth/login-rh`. Log in with a real `recrutador` (role `'rh'`) account. Log in with a real `administrador` account.
**Expected:** Both land on `/rh/dashboard` without being bounced to `/vagas` with "Esta conta não tem acesso ao painel RH." JWT `app_metadata.role` is `'rh'` or `'administrador'` respectively.
**Why human:** No real RH PROD account available in-session. The frontend fix (poll 3s + widened gate) is committed (`464ead8`). Automated R1 axe (/auth/login-rh) is GREEN. The live `usuarios_rh` DB round-trip cannot be exercised without a real credential.

#### 2. Tier-B Screens — R5 + C5 Axe Sweep (E2E_REAL_LOGIN)

**Test:** With `E2E_REAL_LOGIN=1`, a seeded live candidatura in `avaliacao_assincrona` etapa, and a real candidate session, run `npx playwright test e2e/a11y.spec.ts --project=chromium` (the Tier-B block will execute instead of skip).
**Expected:** R5 (RedacaoReviewPanel at `/rh/candidato/:id/redacao`) and C5 (BigFiveQuestionnaireScreen at `/candidato/avaliacao/:id/bigfive`) report zero serious/critical axe violations.
**Why human:** Both screens require live `redacoes_candidato` / `scores_candidato` state that cannot be deterministically mocked. The documented A1 assumption places them in Tier-B by design.

#### 3. Keyboard Roving Focus on Radix Primitives (AB-5/AB-6)

**Test:** Using keyboard only: Tab into the EntrevistaWorkspace tablist — press ArrowLeft/ArrowRight, confirm tab selection moves. Tab into a SjtMultiplaEscolha option group (C3) — press ArrowUp/ArrowDown, confirm selection moves. Tab to the BiasAuditPage 4/5-flag `<button>` and ProvaCognitivaScreen submit tooltip trigger — press Enter/Space, confirm tooltip appears.
**Expected:** Radix Tabs and RadioGroup exhibit native roving focus. Tooltip triggers are keyboard-operable. Visible focus rings appear on all interactive elements over the dark glass surface.
**Why human:** axe-core (headless) does not model keyboard event routing on Radix primitives or focus-ring visibility on composited glass backgrounds. These are GREEN on axe but require sighted keyboard testing (RESEARCH Pitfall 3; documented in SUMMARY 16-03).

#### 4. Tier-B Screen (C5 BigFive) — Live Autosave aria-live Announce (AB-8)

**Test:** During a live BigFive session, wait 30 seconds for the autosave interval. Confirm a screen-reader (or `aria-live` monitor in devtools) announces "Salvo automaticamente" with an accent check icon.
**Expected:** The `aria-live` announcement fires every 30s autosave cycle without page refresh.
**Why human:** `aria-live` announcement behavior is only verifiable with an actual screen-reader or live ARIA monitor; axe cannot model it.

### Gaps Summary

No gaps found. All 10 must-haves are verified by codebase evidence. The 4 human verification items are deferrable live-data/keyboard checks (explicitly deferred per the 16-04 plan's `<how-to-verify>` fallback and the A1 Tier-B assumption). They do not represent failed must-haves — the automated gates for those behaviors are GREEN.

**Notable context:**
- The ci.yml prose comments (lines 12–16) still reference "baseline 291" but the gate is correctly `-gt 290` (the comment was not updated after WR-01 commit `14ee12f` lowered the baseline by one more point). Cosmetic only.
- The FOUND-08 enum typos (`clinica`→`clinico`, `big_five`→`bigfive`) proved structural and were correctly reverted. The tsc baseline was still lowered from 292 → 291 → 290 across plans 16-04 + the WR-01 fix.
- 16-HUMAN-UAT.md does not yet exist in the phase directory; the deferred items are recorded in this VERIFICATION.md frontmatter and this report for the orchestrator to action.

---

_Verified: 2026-06-26T11:10:00Z_
_Verifier: Claude (gsd-verifier)_
