---
phase: 22
slug: rede-de-testes-destravamento-varredura-de-honestidade
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-05
updated: 2026-07-05
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. This phase IS the regression net — its own gates (Vitest, Deno, tsc, npm audit) are the validation surface. Per-task map populated by the planner (6 plans / 2 waves).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend/unit) + Deno test (Edge Functions) + Playwright (E2E) + tsc (`--noEmit`) |
| **Config file** | `vite.config.ts` (Vitest block), `supabase/functions/deno.json` (new — 22-01), `playwright.config.ts`, `tsconfig.json` |
| **Quick run command** | `npm run test:run` (Vitest single run) |
| **Full suite command** | `npm run test:run && deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions && npm run lint` |
| **Estimated runtime** | ~90–150 seconds (Vitest ~60s, Deno ~15s, tsc ~20s) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (or scoped `deno test` for the EF-corpus task in 22-01).
- **After every plan wave:** Run the full suite (`npm run test:run && deno test … && npm run lint`).
- **Before `/gsd:verify-work`:** Full suite green + Deno corpus green + tsc at/below the measured pinned baseline (22-06).
- **Max feedback latency:** ~150 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-T1/T2 | 01 | 1 | CI-01, CI-02 | T-22-01-01 | Deno corpus green under type-check; strict-schema Vitest probe excluded | integration | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` (exit 0) | ❌ W0 (deno.json) | ⬜ pending |
| 22-02-T1 | 02 | 1 | CI-09, CI-12 | T-22-02-03/04 | Zero `"*"` deps; dead deps removed | supply-chain | `node -e "…wildcards.length===0 && !motion && !auth-helpers"` | ✅ | ⬜ pending |
| 22-02-T2 | 02 | 1 | CI-11 | T-22-02-01/02 | vitest/@vitest/ui RCE + happy-dom code-exec cleared; suite green | audit | `npm run test:run` + `npm audit --json` (3 pkgs clear) | ✅ | ⬜ pending |
| 22-03-T1 | 03 | 1 | UX-05 | T-22-03-01 | shared resolveRedirect rejects `//evil` + non-root | unit | `npm run test:run` (resolveRedirect.test) | ✅ | ⬜ pending |
| 22-03-T2 | 03 | 1 | UX-04 | T-22-03-04 | login buttons enabled on mount; validate-on-submit; no TS6133 | unit | `npm run test:run` + `npm run lint \| grep -c TS6133.*isValid` == 0 | ✅ | ⬜ pending |
| 22-03-T3 | 03 | 1 | UX-05 | T-22-03-01/03 | `?redirect` propagated (guarded) + orphan `candidatura_vaga_id` cleared | unit | `npm run test:run` (redirect + cleanup assertions) | ✅ | ⬜ pending |
| 22-04-T1 | 04 | 1 | UX-02 | T-22-04-01 | forbidden-strings guard covers the 2 marketing terms | vitest grep | `npm run test:run` (forbidden-strings.grep) | ✅ | ⬜ pending |
| 22-04-T2 | 04 | 1 | UX-02 | T-22-04-01 | landing copy honest + "Já sou candidato" CTA to /auth/login | vitest grep | `npm run test:run` + `grep -c psicom\|análise de perfil LandingPage` == 0 | ✅ | ⬜ pending |
| 22-05-T1 | 05 | 1 | CI-08 | T-22-05-01 | no hardcoded credential literal under e2e/ | grep | `grep -rnE "fernando@beautysmile\|teste123\|Candidato@2026\|E2eAdmin" e2e/` == 0 | ✅ | ⬜ pending |
| 22-05-T2 | 05 | 1 | CI-08 | T-22-05-02 | `.env.test.example` keys-only + CI guard blocks regressions | grep/guard | `npm run test:run` (no-hardcoded-test-creds.grep) | ❌ W0 (guard) | ⬜ pending |
| 22-06-T1 | 06 | 2 | CI-05 | T-22-06-03 | 65 versioned-import TS2307 → 0 (cascade 257→~133) | typecheck | `npm run -s lint 2>&1 \| grep -c "error TS2307"` == 0 | ✅ | ⬜ pending |
| 22-06-T2 | 06 | 2 | CI-14 | T-22-06-03 | tsc covers e2e/scripts/playwright; no `TS2304 'Deno'` leak | typecheck | `npm run -s lint 2>&1 \| grep -c "TS2304.*Deno"` == 0 | ✅ | ⬜ pending |
| 22-06-T3 | 06 | 2 | CI-01, CI-04 | T-22-06-01 | Deno job blocking in CI + tsc gate pinned to MEASURED green baseline | ci/typecheck | `npm run lint` count ≤ pinned baseline + `denoland/setup-deno` present in ci.yml | ❌ W0 (job + gate) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements (all assigned to concrete plan tasks)

- [x] `.github/workflows/ci.yml` — new blocking `deno-test` job + tsc gate pinned to the measured baseline → **Plan 22-06 Task 3**.
- [x] `supabase/functions/deno.json` — `exclude` the `strict-schema.test.ts` Vitest probe → **Plan 22-01 Task 1**.
- [x] `tsconfig.json` — `paths` (versioned) + expanded `include` (e2e/scripts/playwright) + `exclude` the scripts Deno files → **Plan 22-06 Tasks 1–2**.
- [x] `.env.test.example` — documents the test-credential env keys (no secrets) → **Plan 22-05 Task 2**.
- [x] `src/__tests__/guards/no-hardcoded-test-creds.grep.test.ts` — CI grep guard for CI-08 → **Plan 22-05 Task 2**.
- [x] Existing infrastructure (Vitest, Deno, Playwright, tsc) covers all other phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Landing copy reads honestly to a human | UX-02 | Grep guards the forbidden strings but not the replacement's tone | Visual read of `/` — confirm "avaliação comportamental/cognitiva" framing + "Já sou candidato" CTA present and routing to `/auth/login` |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Deno CI job, deno.json exclude, tsconfig paths/include, `.env.test.example`, no-hardcoded-creds guard)
- [x] No watch-mode flags (all commands single-run)
- [x] Feedback latency < 150s
- [x] `nyquist_compliant: true` set in frontmatter (per-task map populated by the planner)

**Approval:** planner-complete (2026-07-05) — ready for `/gsd:execute-phase 22`
