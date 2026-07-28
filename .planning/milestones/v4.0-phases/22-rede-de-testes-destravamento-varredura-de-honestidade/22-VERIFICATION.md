---
phase: 22-rede-de-testes-destravamento-varredura-de-honestidade
verified: 2026-07-05T22:00:00Z
status: human_needed
score: 12/12 requirements verified in codebase (all programmatically-checkable truths pass); 2 items require a live/human check before full confidence
overrides_applied: 0
human_verification:
  - test: "Push the branch and confirm the new `deno-test` job + tightened tsc gate (133) actually run and pass on GitHub Actions (not just reproduced locally)."
    expected: "`deno-test` job green (148/0), `unit` job green with tsc count <= 133, on an actual Actions runner (ubuntu-latest, denoland/setup-deno@v2)."
    why_human: "The local branch (`backup/local-state-2026-04`) is 153 commits ahead of `origin/backup/local-state-2026-04` — Phase 22's commits have never been pushed, so `.github/workflows/ci.yml` has never actually executed on GitHub Actions infrastructure. I reproduced the equivalent commands locally (deno test, npm run lint, npm run test:run) and they pass, and the YAML parses as valid — but a local reproduction is not proof the Actions runner environment (action versions, network, secrets fallback, ubuntu-latest image) behaves identically. This is exactly the caveat the verification brief asked to flag rather than silently mark passed."
  - test: "Manually exercise the WR-01 fix end-to-end in a browser: sign up a new candidate via `/cadastro?vagaId=<id>`, force the post-signup auto-login to fail, get bounced to `/auth/login?email=...`, log in manually, and confirm the user is routed to the correct vaga's `InstrucoesFormularioPage` (not the hardcoded `vagaId='1'` fallback)."
    expected: "The candidatura_vaga_id survives the bounce-to-login and is consumed (then cleared) by InstrucoesFormularioPage, landing the candidate on the correct vaga's instructions page."
    why_human: "The fix (commit 2d1963d) is covered by unit tests with mocked localStorage/router (LoginCandidatoPage.test.tsx, 18/18 green) and the code path is logically sound (verified by reading LoginCandidatoPage.tsx:113-124 + InstrucoesFormularioPage.tsx), but the full journey — real signup, a real forced auto-login failure, and real browser localStorage — has not been live-smoked. Both the write site (`/cadastro?vagaId=`) and read site (`/candidato/candidatura/instrucoes`) are reachable today only via external/direct links (confirmed via repo-wide grep — no in-app `navigate()`/`<Link>` points there), so this is a narrow but real path worth one live click-through before closing the phase."
---

# Phase 22: Rede de Testes, Destravamento & Varredura de Honestidade Verification Report

**Phase Goal:** A rede de testes que originou todos os defeitos live roda verde em CI, o typecheck destrava, e o candidato encontra copy honesta com login que funciona sem gambiarra — a fundação de regressão sobre a qual todas as fases seguintes se guardam.

**Verified:** 2026-07-05
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

All 5 success criteria and all 12 requirement IDs were independently reproduced against the current codebase (not read from SUMMARYs). Every command below was re-run by the verifier, not copy-pasted from a SUMMARY claim.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Deno EF corpus runs in a CI job and passes green (CI-01, CI-02) | VERIFIED | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` → **148 passed / 0 failed**, exit 0, type-check ON. `.github/workflows/ci.yml` has a `deno-test` job (`denoland/setup-deno@v2`, no `continue-on-error`) running this exact command. |
| 2 | tsc gate covers e2e/scripts/playwright.config, 65 TS2307 resolved, gate red above the real baseline (CI-04, CI-05, CI-14) | VERIFIED | `npm run -s lint 2>&1 \| grep -c "error TS"` → **133** (all 133 located under `src/`, none under `e2e/`/`scripts/`/`playwright.config.ts`); `grep -c "error TS2307"` → **0**; `grep -c "TS2304.*Deno"` → **0**. `tsconfig.json` `include` = `["src","e2e","scripts","playwright.config.ts"]`, 37 versioned-specifier `paths` entries added. `ci.yml` gate is `-gt 133` (was 290), no leftover `-gt 290` anywhere. |
| 3 | Login buttons enable correctly without `!isValid`; no test-account creds in repo (UX-04, CI-08) | VERIFIED (see caveat) | `grep -c "!isValid" LoginCandidatoPage.tsx LoginRHPage.tsx` → 0/0; both use `disabled={isSubmitting \|\| isInCooldown}`. Dedicated unit tests (`LoginCandidatoPage.test.tsx`, 18/18 green) assert both buttons enabled on mount with an empty form. Esqueci/Redefinir confirmed never touched (`git diff 7853eac..HEAD` empty) and never had `!isValid`. No hardcoded creds under `e2e/` (grep 0 hits); `.env.test.example` is keys-only; `.env.test` gitignored and untracked. **Caveat:** the e2e spec files (`login-flow.spec.ts` etc.) still call `.blur()` on every field before clicking submit, with a stale comment claiming it is "required" — this is now factually false (the button is enabled regardless) but was not cleaned up. It does not break anything (blur is a harmless no-op now) and the real regression net for this requirement is the new unit test, not the E2E files — see Anti-Patterns section. |
| 4 | Landing honest copy + "Já sou candidato" CTA; `?redirect` survives login→cadastro→post-login with orphan localStorage cleaned (UX-02, UX-05) | VERIFIED | `grep -icE "psicom\|análise de perfil" LandingPage.tsx` → 0. "Já sou candidato" CTA present (`LandingPage.tsx:43`), routes to `/auth/login`. `forbidden-strings.grep.test.ts` extended + green (19/19). `?redirect` traced end-to-end: `LoginCandidatoPage` "Criar conta →" carries it to `/cadastro`, `CadastroPage.tsx:32` guards via `resolveRedirect`, `CadastroMultiStepForm.tsx:459` re-guards at the navigate site. Orphan `candidatura_vaga_id` cleared on plain login (`LoginCandidatoPage.tsx:123`) and at consumption in `InstrucoesFormularioPage.tsx:26` for the cadastro-bounce path (WR-01 fix, commit `2d1963d`). |
| 5 | 8 wildcard deps pinned, vitest/@vitest/ui/happy-dom vulns resolved, dead deps removed (CI-09, CI-11, CI-12) | VERIFIED | `node` check over `package.json` deps+devDeps → 0 wildcards (`@tiptap/*`, `clsx`, `react-dnd*`, `tailwind-merge` all exact-pinned). `npm ls vitest @vitest/ui happy-dom` → 4.1.9 / 4.1.9 / 20.10.6; `npm audit --json` → these 3 packages no longer appear at all (previously critical/high). `motion` and `@supabase/auth-helpers-react` absent from `package.json`. |

**Score:** 5/5 success criteria and 12/12 requirement IDs (CI-01, CI-02, CI-04, CI-05, CI-08, CI-09, CI-11, CI-12, CI-14, UX-02, UX-04, UX-05) hold TRUE against the current codebase. 2 items (below) need a live/human check before the phase can be closed with full confidence — this is why overall status is `human_needed`, not `passed`.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | blocking `deno-test` job + tsc gate pinned to 133 | VERIFIED | Job present, `denoland/setup-deno@v2`, no `continue-on-error`; gate `-gt 133`. YAML parses (js-yaml). **Never executed on GitHub Actions** — see human_verification. |
| `supabase/functions/deno.json` | excludes the Vitest `strict-schema` probe from the Deno runner | VERIFIED | `{ "exclude": ["_shared/__tests__/strict-schema.test.ts"] }`; probe still green under Vitest (7/7). |
| `tsconfig.json` | versioned `paths` + expanded `include` (e2e/scripts/playwright) + Deno-file `exclude` | VERIFIED | 37 versioned-specifier paths; `include` = src+e2e+scripts+playwright.config.ts; `exclude` = `scripts/sync-prompts*.ts`. |
| `src/features/auth/utils/resolveRedirect.ts` | single shared anti-open-redirect guard | VERIFIED + HARDENED | CR-01 fix present: rejects control chars, leading/trailing whitespace, `//`, `/\`, and re-validates via `new URL(raw, DUMMY_ORIGIN)` origin check. 11/11 unit tests incl. explicit backslash/control-char regression cases. |
| `.env.test.example` | keys-only, no real credential values | VERIFIED | All values empty placeholders; `grep -cE "fernando@beautysmile\|teste123"` → 0. |
| `src/__tests__/guards/no-hardcoded-test-creds.grep.test.ts` | CI guard blocking credential regressions under `e2e/` | VERIFIED | 15/15 tests green. |
| `src/__tests__/guards/forbidden-strings.grep.test.ts` | covers psicométricos + análise de perfil marketing terms | VERIFIED | 19/19 tests green, extended with the 2 new alternations. |
| `src/components/pages/LandingPage.tsx` | honest copy + CTA | VERIFIED | "Avaliação comportamental e cognitiva" framing; "Já sou candidato" CTA → `/auth/login`. |
| `src/components/pages/LoginCandidatoPage.tsx`, `LoginRHPage.tsx` | buttons enabled by default | VERIFIED | `disabled={isSubmitting \|\| isInCooldown}`, no `isValid` reference. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `LoginCandidatoPage.tsx` | `src/features/auth/utils/resolveRedirect.ts` | `resolveRedirect(searchParams.get('redirect'))` | WIRED | Confirmed at line 129; navigate uses the resolved target, never the raw param. |
| `CadastroPage.tsx` | `resolveRedirect.ts` | guard `?redirect` before passing `redirectTo` down | WIRED | Line 32; passed to `CadastroMultiStepForm` as a prop. |
| `CadastroMultiStepForm.tsx` | `resolveRedirect.ts` | re-guard at the post-auto-login navigate site | WIRED (duplicated — WR-03, deferred) | Line 459; idempotent re-guard, not a security gap, but a duplicated call site flagged in code review as non-blocking. |
| `LoginCandidatoPage.tsx` | `localStorage.candidatura_vaga_id` | conditional `removeItem` (skips on cadastro-bounce) | WIRED | Line 121-124; `InstrucoesFormularioPage.tsx:26` clears it at consumption for the bounce path. |
| `ci.yml` `deno-test` job | `supabase/functions/**/*.test.ts` | `deno test --allow-env --allow-read --config ...` | WIRED (config-only — not yet executed on Actions) | Command matches the canonical one proven locally; job has no bypass flag. |
| `ci.yml` `unit` job tsc step | `tsconfig.json` | `npm run -s lint` count vs `-gt 133` | WIRED | Verified count locally = 133, matches gate exactly. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Deno EF corpus green | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` | 148 passed / 0 failed, exit 0 | PASS |
| tsc error count = pinned gate | `npm run -s lint 2>&1 \| grep -c "error TS"` | 133 | PASS |
| No phantom TS2307 | `grep -c "error TS2307"` | 0 | PASS |
| No Deno-global leak in tsc | `grep -c "TS2304.*Deno"` | 0 | PASS |
| Full Vitest suite green | `npm run test:run` | 727 passed (83 files) | PASS |
| Build succeeds | `npm run build` | success (only pre-existing chunk-size warning) | PASS |
| Landing copy honest | `grep -icE "psicom\|análise de perfil" LandingPage.tsx` | 0 | PASS |
| Login buttons `!isValid`-free | `grep -c "!isValid" LoginCandidatoPage.tsx LoginRHPage.tsx` | 0 / 0 | PASS |
| No hardcoded creds under e2e/ | `grep -rnE "fernando@beautysmile\|teste123\|Candidato@2026\|candidato\.funil@teste\.com" e2e/` | 0 hits | PASS |
| No wildcard deps | node check over package.json deps | 0 wildcards | PASS |
| vitest/@vitest/ui/happy-dom vuln-free | `npm audit --json` | not present in vuln list (previously critical/high) | PASS |
| Dead deps removed | package.json grep | motion / auth-helpers-react absent | PASS |
| CI YAML valid + gate math correct | `js-yaml` parse + `-gt 133` / `denoland/setup-deno` grep | valid, both present | PASS |
| Live GitHub Actions execution of ci.yml | N/A — branch not pushed (153 commits ahead of origin) | not run | SKIP → human_needed |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CI-01 | 22-01, 22-06 | Deno corpus runs in CI | SATISFIED | `deno-test` job in ci.yml, 148/0 locally |
| CI-02 | 22-01 | `deno test` passes green (casts/asserts fixed) | SATISFIED | 148 passed / 0 failed, type-check ON |
| CI-04 | 22-06 | tsc gate pinned to measured real baseline | SATISFIED | Gate = 133, measured value = 133 |
| CI-05 | 22-06 | 65 versioned-import TS2307 resolved | SATISFIED | TS2307 count = 0 |
| CI-08 | 22-05 | Test creds out of repo | SATISFIED | 0 hardcoded-cred hits under e2e/; `.env.test.example` keys-only |
| CI-09 | 22-02 | 8 wildcard deps pinned | SATISFIED | 0 wildcards in package.json |
| CI-11 | 22-02 | vitest/@vitest/ui/happy-dom vulns resolved | SATISFIED | Not present in `npm audit` critical/high list |
| CI-12 | 22-02 | Dead deps removed | SATISFIED | motion / auth-helpers-react absent |
| CI-14 | 22-06 | tsc covers e2e/scripts/playwright.config | SATISFIED | tsconfig include updated; 0 TS2304 Deno leaks |
| UX-02 | 22-04 | Landing honest + CTA | SATISFIED **(REQUIREMENTS.md bookkeeping is stale — see Anti-Patterns)** | 0 forbidden strings; CTA present and routed correctly |
| UX-04 | 22-03 | Login buttons enabled without `!isValid` | SATISFIED | 0 `!isValid` occurrences; unit-test regression coverage |
| UX-05 | 22-03 | `?redirect` + orphan localStorage cleanup | SATISFIED | Traced end-to-end; WR-01 fix applied and unit-tested |

No orphaned requirements found — REQUIREMENTS.md's Phase 22 coverage table lists exactly these 12 IDs (plus CI-03/06/07/10/13/15 and UX-01/03/06 correctly deferred to later phases, confirmed against ROADMAP).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/REQUIREMENTS.md` | 91, 188 | UX-02 checkbox still `[ ]` and coverage-table status still "Pending" | WARNING (bookkeeping only) | The functional requirement IS satisfied in code (confirmed independently) — 22-04-SUMMARY.md's own frontmatter says `requirements-completed: [UX-02]`. This is a documentation-ledger gap, not a code gap: someone should flip the checkbox and the coverage-table cell to "Complete"/"Done (22-04)" before the milestone tracker is trusted at face value. Not a phase blocker, but worth fixing before relying on REQUIREMENTS.md as a dashboard. |
| `e2e/login-flow.spec.ts` (and 7 other e2e specs) | 678-684, etc. | Stale `.blur()` calls + a comment claiming they are "required" for button enablement | INFO | Functionally harmless (blur is a no-op now that the button is `disabled={isSubmitting \|\| isInCooldown}`), but the phase's own SUMMARY claims "killing the E2E blur() hack" — the hack was made *unnecessary*, not actually *removed* from the specs. The E2E suite therefore does not itself regression-test "no isValid gate" (it always blurs before clicking); the real regression net for that requirement is the new `LoginCandidatoPage.test.tsx` unit test, which does correctly assert button-enabled-with-empty-form. Recommend a follow-up cleanup pass to strip the now-vestigial `.blur()` calls and stale comments, but this does not block the phase goal. |
| `supabase/functions/gerar-devolutiva-bigfive/index.ts` | 190-198 | Fragment-joined "psicólogo(a)" literal to evade the LGPD-04 forbidden-strings guard | WARNING (deferred, per code review WR-02) | Documented in 22-REVIEW.md, explicitly deferred — not re-litigated here. Byte-identical runtime string confirmed by the reviewer; zero behavior change. |
| `src/components/pages/CadastroPage.tsx` / `CadastroMultiStepForm.tsx` | 32 / 459 | `resolveRedirect` called twice (duplicated guard) | INFO (deferred, per code review WR-03) | Idempotent, not a security gap; documented and deferred. |

No unreferenced `TBD`/`FIXME`/`XXX` debt markers found in the files touched by this phase.

### Human Verification Required

### 1. Live GitHub Actions run of the updated CI pipeline

**Test:** Push `backup/local-state-2026-04` (or open a PR) so `.github/workflows/ci.yml` actually executes on GitHub Actions, and confirm the `deno-test` job and the tightened `unit` job tsc gate (133) both come back green.
**Expected:** `deno-test` passes (148/0); `unit` job's tsc step reports `tsc errors: 133` and does not fail; `e2e` and `lighthouse` jobs behave as before (unaffected by this phase).
**Why human:** The branch is 153 commits ahead of `origin/backup/local-state-2026-04` — none of Phase 22's commits have ever run on Actions infrastructure. Local reproduction (this report) proves the commands are correct and the YAML is syntactically valid, but cannot substitute for an actual runner execution (action versions, network conditions, `ubuntu-latest` image behavior).

### 2. End-to-end browser click-through of the WR-01 orphan-key fix

**Test:** Sign up a new candidate via a direct link `/cadastro?vagaId=<real-vaga-id>`, force the post-signup auto-login to fail (e.g., throttle/break the token endpoint once), follow the bounce to `/auth/login?email=...`, log in manually, and confirm landing on `InstrucoesFormularioPage` for the correct vaga (not the hardcoded `vagaId='1'` fallback).
**Expected:** The candidate reaches the correct vaga's instructions page; `candidatura_vaga_id` is present through the bounce and cleared only after `InstrucoesFormularioPage` reads it.
**Why human:** Covered by unit tests with mocked localStorage/router (18/18 green) and the code path is logically sound on inspection, but the full real-browser journey (real signup, a genuinely forced auto-login failure, real localStorage persistence across a navigation) has not been live-smoked. Both endpoints of this flow are reachable today only via direct/external links (no in-app `<Link>`/`navigate()` reaches them — confirmed by repo-wide grep), so it is a narrow but real path worth one live click-through.

### Gaps Summary

No functional gaps were found. All 5 success criteria and all 12 requirement IDs assigned to Phase 22 are independently verified as TRUE against the current codebase — reproduced by running the actual commands (Deno test, tsc, Vitest, build, npm audit, grep) rather than trusting SUMMARY.md narration. The code review's one CRITICAL (CR-01, open-redirect bypass) and its highest-priority WARNING (WR-01, orphan-key premature clear) were both fixed in dedicated follow-up commits (`4955384`, `2d1963d`) with new regression tests, and I independently re-verified both fixes are present and correct in the current tree.

Two items keep the status at `human_needed` rather than `passed`, per the verification brief's explicit instruction not to blindly mark CI green without a live run: (1) the updated `ci.yml` has never executed on GitHub Actions (the branch isn't pushed), and (2) the WR-01 fix, while unit-tested, has not been live-smoked end-to-end in a browser. Neither is a code defect — both are "prove it in the real environment" checks.

One documentation-hygiene item is worth a quick fix before trusting the milestone tracker: `.planning/REQUIREMENTS.md` still shows UX-02 as `[ ]`/"Pending" despite the requirement being functionally complete (confirmed independently in this report and claimed complete in 22-04-SUMMARY.md's own frontmatter).

---

_Verified: 2026-07-05_
_Verifier: Claude (gsd-verifier)_
