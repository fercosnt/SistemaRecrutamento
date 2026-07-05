---
phase: 22
slug: rede-de-testes-destravamento-varredura-de-honestidade
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-05
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. This phase IS the regression net — its own gates (Vitest, Deno, tsc, npm audit) are the validation surface.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend/unit) + Deno test (Edge Functions) + Playwright (E2E) + tsc (`--noEmit`) |
| **Config file** | `vitest.config.ts`, `deno.json`/`deno.jsonc`, `playwright.config.ts`, `tsconfig.json` |
| **Quick run command** | `npm run test:run` (Vitest single run) |
| **Full suite command** | `npm run test:run && deno test -A supabase/functions && npm run lint` |
| **Estimated runtime** | ~90–150 seconds (Vitest ~60s, Deno ~15s, tsc ~20s) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (or scoped `deno test` for EF-corpus tasks).
- **After every plan wave:** Run the full suite (`npm run test:run && deno test -A supabase/functions && npm run lint`).
- **Before `/gsd:verify-work`:** Full suite green + Deno corpus green + tsc at/below the measured pinned baseline.
- **Max feedback latency:** ~150 seconds.

---

## Per-Task Verification Map

> Populated by the planner/executor per task. Each requirement maps to an automated gate below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-XX-XX | XX | X | CI-01/02 | — | Deno corpus runs + passes in CI | integration | `deno test -A supabase/functions` | ❌ W0 (job) | ⬜ pending |
| 22-XX-XX | XX | X | CI-04/05/14 | — | tsc destravado, gate pinned to measured green baseline (~133) | typecheck | `npm run lint` (count ≤ pinned) | ✅ | ⬜ pending |
| 22-XX-XX | XX | X | CI-08 | T-22 auth-cred | No hardcoded creds; specs skip-if-unset | grep/guard | `grep -rE '@teste\.com|@beautysmile' e2e/ \| wc -l == 0` | ❌ W0 | ⬜ pending |
| 22-XX-XX | XX | X | CI-09/11/12 | T-22 supply-chain | Wildcards pinned, vulns fixed, dead deps gone | supply-chain | `npm audit --audit-level=high` (0 crit/high dev) + suite green | ✅ | ⬜ pending |
| 22-XX-XX | XX | X | UX-02 | T-22 copy | No forbidden psychometric strings; CTA present | grep/guard | `forbidden-strings.grep.test.ts` (extended) exits 0 | ✅ | ⬜ pending |
| 22-XX-XX | XX | X | UX-04 | — | Login buttons enable w/o `!isValid`; validate-on-submit | unit/E2E | Vitest on login pages + E2E without `blur()` hack | ✅ | ⬜ pending |
| 22-XX-XX | XX | X | UX-05 | T-22 open-redirect | `?redirect` propagated + orphan `candidatura_vaga_id` cleared | unit | Vitest on `resolveRedirect` + cleanup path | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.github/workflows/ci.yml` — new `deno-test` job (denoland/setup-deno@v2, type-check ON) wired as a blocking gate.
- [ ] `deno.json`/glob `exclude` — drop `strict-schema.test.ts` (Vitest-only Node probe) and `scripts/sync-prompts*.ts` (Deno files) from the wrong runner's scope.
- [ ] `.env.test.example` — documents the test-credential env keys (no secrets committed).
- [ ] Existing infrastructure (Vitest, Deno, Playwright, tsc) covers all other phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Landing copy reads honestly to a human | UX-02 | Grep guards the forbidden strings but not the replacement's tone | Visual read of `/` — confirms "avaliação comportamental/cognitiva" + "Já sou candidato" CTA present and routes to `/login` |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (Deno CI job, test-runner excludes, `.env.test.example`)
- [ ] No watch-mode flags (all commands single-run)
- [ ] Feedback latency < 150s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner completes the per-task map)

**Approval:** pending
