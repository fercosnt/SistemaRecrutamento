---
phase: 2
slug: cadastro-candidato
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Sourced from `02-RESEARCH.md` §Validation Architecture (Pathway 8). Planner fills the Per-Task Verification Map once tasks exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit/integration)** | Vitest 3.x (already installed in package.json) |
| **Framework (E2E)** | Playwright 1.x (already installed, 4 specs in repo) |
| **Unit config** | `vitest.config.ts` |
| **E2E config** | `playwright.config.ts` |
| **Quick run command** | `npm run test:run` (Vitest single run) + `npm run lint` (tsc --noEmit) |
| **Full suite command** | `npm run test:run && npm run test:e2e && npm run build` |
| **Estimated runtime** | unit ~15s · E2E ~40-60s (headless) · full ~90s cold |

**Wave 0 dependency install:** Research Pathway 8 identified that `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom` may not be in `package.json`. Verify in Wave 0; if missing, install as devDependencies.

---

## Sampling Rate

- **After every task commit:** Run `npm run test:run` (Vitest changed-files) + `npm run lint` for the touched directory
- **After every plan wave:** Run `npm run test:run && npm run test:e2e -- --reporter=line`
- **Before `/gsd-verify-work`:** Full suite must be green — `test:run`, `test:e2e`, `build`
- **Max feedback latency:** 30 seconds (unit-level); 120 seconds (E2E per wave)

---

## Per-Task Verification Map

> Every task from `02-XX-PLAN.md` is mapped here to its automated `<verify><automated>` command. File Exists column: ✅ = task patches an existing file; ❌ W0 = Wave 0 (Plan 02-01) scaffolds the file before any feature code touches it. Status flips from `⬜ pending` to `✅ green` as each task's verify command passes during execution.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-T1 | 01 | 0 | CAD-01, CAD-02, CAD-03 | T-02-00-01 | SDK upgrade preserves sb_publishable_ anon-key compatibility without tampering ripple | integration | `node -p "require('@supabase/supabase-js/package.json').version" \| grep -E "^2\.(5[0-9]\|[6-9][0-9])\." && npm run build` | ✅ | ⬜ pending |
| 2-01-T2 | 01 | 0 | CAD-01, CAD-02, CAD-03 | — | Vitest picks up tests/setup.ts so jest-dom matchers load once globally (no per-file leakage) | integration | `test -f tests/setup.ts && grep -q "@testing-library/jest-dom" tests/setup.ts && grep -q "tests/setup.ts" vite.config.ts && npx vitest run --passWithNoTests` | ✅ | ⬜ pending |
| 2-01-T3 | 01 | 0 | CAD-01, CAD-02, CAD-03 | — | Test scaffolds exist before feature code (Nyquist contract) | unit | `test -f src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts && test -f src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts && test -f src/features/cadastro/hooks/__tests__/useDuplicateCheck.test.ts && grep -q "structured error_code routing" src/features/cadastro/services/__tests__/cadastroService.test.ts && grep -q "rate_limited handling" src/features/cadastro/services/__tests__/duplicateCheckService.test.ts && npx vitest run src/features/cadastro/` | ❌ W0 (creates) | ⬜ pending |
| 2-01-T4 | 01 | 0 | CAD-01, CAD-02, CAD-03 | T-02-00-02 | Audit results capture schema facts needed to gate Wave 1 migration (redact tokens in request.headers) | manual | Human checkpoint — resume signal `approved — audit results captured` (no single-command gate; `.planning/phases/02-cadastro-candidato/02-AUDIT-RESULTS.md` non-empty verified in Plan 02-02 Task 1) | ❌ W0 (creates) | ⬜ pending |
| 2-02-T1 | 02 | 1 | CAD-03, CAD-05 | T-02-01, T-02-02, T-02-03, T-02-04, T-02-05 | Migration authored in a single transaction with REVOKE on audit table + policy_version default | schema | `test -f supabase/migrations/20260421000001_rate_limit_duplicate_check.sql && grep -q "CREATE TABLE IF NOT EXISTS public.rate_limit_check_duplicate" supabase/migrations/20260421000001_rate_limit_duplicate_check.sql && grep -q "rate_limited" supabase/migrations/20260421000001_rate_limit_duplicate_check.sql && grep -q "ADD COLUMN IF NOT EXISTS policy_version" supabase/migrations/20260421000001_rate_limit_duplicate_check.sql && grep -q "'v1.0-2026-04'" supabase/migrations/20260421000001_rate_limit_duplicate_check.sql && grep -q "GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate(text, text) TO anon, authenticated" supabase/migrations/20260421000001_rate_limit_duplicate_check.sql && grep -q "REVOKE ALL ON TABLE public.rate_limit_check_duplicate FROM anon" supabase/migrations/20260421000001_rate_limit_duplicate_check.sql` | ❌ W0 (creates) | ⬜ pending |
| 2-02-T2 | 02 | 1 | CAD-03, CAD-05 | T-02-01, T-02-02, T-02-03 | BLOCKING schema push applied to linked prod + types regenerated (no client bypass) | manual | Human checkpoint — `npx supabase db push` (interactive) OR `SUPABASE_ACCESS_TOKEN=... SUPABASE_DB_PASSWORD=... npx supabase db push --linked --include-all` then `npm run db:types` then `grep -c "policy_version" database.types.ts` ≥ 1 | ✅ | ⬜ pending |
| 2-03-T1 | 03 | 2 | CAD-03, CAD-05, CAD-07 | T-02-02, T-02-14 | Deno shared constants + schemas carry POLICY_VERSION and CadastroErrorCode enum with no client access to service_role | unit / schema | `test -f supabase/functions/_shared/constants.ts && grep -q "POLICY_VERSION = 'v1.0-2026-04'" supabase/functions/_shared/constants.ts && grep -q "export type CadastroErrorCode" supabase/functions/_shared/schemas.ts && grep -q "zodPathToFieldName" supabase/functions/_shared/schemas.ts` | ✅/❌ W0 (constants new; schemas patch) | ⬜ pending |
| 2-03-T2 | 03 | 2 | CAD-03, CAD-05, CAD-07 | T-02-02, T-02-14 | Edge Function emits structured `{error_code, message, field, error}` + inserts policy_version into autorizacoes (no supabaseAdmin on client; T-02-14 server-side z.literal(true) block) | integration | `grep -q "error_code" supabase/functions/cadastrar-candidato/index.ts && grep -q "policy_version:\s*POLICY_VERSION" supabase/functions/cadastrar-candidato/index.ts && grep -q "import.*POLICY_VERSION" supabase/functions/cadastrar-candidato/index.ts` | ✅ | ⬜ pending |
| 2-03-T3 | 03 | 2 | CAD-03, CAD-05, CAD-07 | — | Redeploy with `--no-verify-jwt` (Phase 1 UAT blocker #1 regression gate) + live probes confirm structured errors over the wire | manual | Human checkpoint — `supabase functions deploy cadastrar-candidato --no-verify-jwt` then `curl -X OPTIONS <url>` returns 200, `curl -X POST <url>` with duplicate returns body containing `error_code: "EMAIL_EXISTS"` | ✅ | ⬜ pending |
| 2-04-T1 | 04 | 2 | CAD-01, CAD-03, CAD-05 | — | Client constants module has exactly 2 exports (no secret leakage / stray imports) | schema | `test -f src/features/cadastro/constants.ts && grep -q "POLICY_VERSION = 'v1.0-2026-04' as const" src/features/cadastro/constants.ts && grep -q "CADASTRO_DRAFT_KEY = 'cadastro:draft:v1' as const" src/features/cadastro/constants.ts && npx tsc --noEmit src/features/cadastro/constants.ts --target ES2020 --module ESNext --moduleResolution Bundler` | ❌ W0 (creates) | ⬜ pending |
| 2-04-T2 | 04 | 2 | CAD-01, CAD-03, CAD-05 | T-02-02, T-02-08 | `useCadastroDraft.save()` strips senha/confirmar_senha before persisting (PII never leaves RHF state) | unit | `test -f src/features/cadastro/hooks/useCadastroDraft.ts && grep -q "export function useCadastroDraft" src/features/cadastro/hooks/useCadastroDraft.ts && grep -q "CADASTRO_DRAFT_KEY" src/features/cadastro/hooks/useCadastroDraft.ts && grep -q "delete.*senha" src/features/cadastro/hooks/useCadastroDraft.ts && grep -q "delete.*confirmar_senha" src/features/cadastro/hooks/useCadastroDraft.ts && npx vitest run src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts` | ❌ W0 (creates) | ⬜ pending |
| 2-04-T3 | 04 | 2 | CAD-01, CAD-03, CAD-05 | T-02-09, T-02-10 | `useLeaveGuard` registers/removes beforeunload per isDirty toggle without custom messages (UI-SPEC + Pitfall 4) | unit | `test -f src/features/cadastro/hooks/useLeaveGuard.ts && grep -q "export function useLeaveGuard" src/features/cadastro/hooks/useLeaveGuard.ts && grep -q "addEventListener('beforeunload'" src/features/cadastro/hooks/useLeaveGuard.ts && grep -q "event.returnValue = ''" src/features/cadastro/hooks/useLeaveGuard.ts && npx vitest run src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts` | ❌ W0 (creates) | ⬜ pending |
| 2-04-T4 | 04 | 2 | CAD-01, CAD-03, CAD-05 | — | `useDuplicateCheck` default debounce aligned to D-10 (300ms) and both DadosPessoaisStep overrides removed — UI consistency with CONTEXT | unit | `grep -E "debounceMs\s*=\s*300" src/features/cadastro/hooks/useDuplicateCheck.ts && ! grep -E "debounceMs\s*=\s*800" src/features/cadastro/hooks/useDuplicateCheck.ts && ! grep -qE "debounceMs:\s*800" src/features/cadastro/components/steps/DadosPessoaisStep.tsx && npx vitest run src/features/cadastro/hooks/__tests__/useDuplicateCheck.test.ts` | ✅ | ⬜ pending |
| 2-04-T5 | 04 | 2 | CAD-01, CAD-03, CAD-05 | — | No-regression gate after Wave 2 hooks stream — all hook tests green, no new TS errors | unit | `npx vitest run src/features/cadastro/hooks/ && test "$(npm run lint 2>&1 \| grep -v 'src/features/vagas' \| grep -E 'error TS' \| wc -l \| tr -d ' ')" = "0"` | ✅ | ⬜ pending |
| 2-05-T1 | 05 | 2 | CAD-03, CAD-06, CAD-07 | T-02-03, T-02-04, T-02-11 | cadastroService routes `error_code` → CadastroError with `field`; tryAutoLogin never logs password; FIELD_TO_STEP_* whitelists server-provided fields | unit | `grep -q "'EMAIL_EXISTS'" src/features/cadastro/services/cadastroService.ts && grep -q "'CPF_EXISTS'" src/features/cadastro/services/cadastroService.ts && grep -q "'VALIDATION'" src/features/cadastro/services/cadastroService.ts && grep -q "'SERVER_ERROR'" src/features/cadastro/services/cadastroService.ts && grep -q "export async function tryAutoLogin" src/features/cadastro/services/cadastroService.ts && grep -q "export const FIELD_TO_STEP_INDEX" src/features/cadastro/services/cadastroService.ts && grep -q "export const FIELD_TO_STEP_PATH" src/features/cadastro/services/cadastroService.ts && ! grep -qE "'AUTH_FAILED'\|'INSERT_FAILED'\|'ROLLBACK_FAILED'" src/features/cadastro/services/cadastroService.ts && ! grep -qE "console\.(log\|info\|debug\|error).*\.senha" src/features/cadastro/services/cadastroService.ts` | ✅ | ⬜ pending |
| 2-05-T2 | 05 | 2 | CAD-03, CAD-06, CAD-07 | T-02-01, T-02-12 | duplicateCheckService throws `RATE_LIMITED` before surfacing booleans when RPC rate_limited=true (toast-plumbing covered by unit probe) | unit | `grep -q "'RATE_LIMITED'" src/features/cadastro/services/duplicateCheckService.ts && grep -q "rate_limited: boolean" src/features/cadastro/services/duplicateCheckService.ts && grep -q "Muitas tentativas. Aguarde alguns instantes." src/features/cadastro/services/duplicateCheckService.ts && grep -q "cpf_exists: boolean \| null" src/features/cadastro/services/duplicateCheckService.ts && npx vitest run src/features/cadastro/services/__tests__/duplicateCheckService.test.ts -t "RATE_LIMITED" && grep -q "rate_limited: true" src/features/cadastro/services/__tests__/duplicateCheckService.test.ts && grep -q "code: 'RATE_LIMITED'" src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` | ✅ | ⬜ pending |
| 2-05-T3 | 05 | 2 | CAD-03, CAD-06, CAD-07 | T-02-03, T-02-04 | Pitfall 7 password-in-logs audit asserted by test; EMAIL_EXISTS / CPF_EXISTS / VALIDATION / SERVER_ERROR / NETWORK_ERROR / UNKNOWN_ERROR branches exercised | unit | `npx vitest run src/features/cadastro/services/__tests__/cadastroService.test.ts` | ✅ | ⬜ pending |
| 2-05-T4 | 05 | 2 | CAD-03, CAD-06, CAD-07 | T-02-01, T-02-12 | rate_limited + normal-path + structural interface probe for DuplicateCheckResponse | unit | `npx vitest run src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` | ✅ | ⬜ pending |
| 2-05-T5 | 05 | 2 | CAD-03, CAD-06, CAD-07 | — | Services + hooks full-suite + lint gate (no regression from Wave 2) | integration | `npx vitest run src/features/cadastro/services/ && npx vitest run src/features/cadastro/ && test "$(npm run lint 2>&1 \| grep -v 'src/features/vagas' \| grep -E 'error TS' \| wc -l \| tr -d ' ')" = "0" && npm run build` | ✅ | ⬜ pending |
| 2-06-T1 | 06 | 3 | CAD-01, CAD-02, CAD-04, CAD-05, CAD-06 | T-02-09, T-02-11, T-02-14 | Form wiring: draft/leave-guard/tryAutoLogin/routeCadastroError; LGPD mandatory gate; Loader2 on submit; LoadingProgress suppressed; Enter-key guarded | integration | Multi-line compound grep in Plan 02-06 Task 1 `<verify>` block asserting: useCadastroDraft, useLeaveGuard, tryAutoLogin, signInWithPassword, navigate('/candidato/perfil'), autorizacao_uso_dados, routeCadastroError, "Criar conta", "Criando", primeiroNome extraction, NO `LoadingProgress.*open={true}` on submit path, NO "Finalizar Cadastro" literal, `npm run lint` 0 new errors | ✅ | ⬜ pending |
| 2-06-T2 | 06 | 3 | CAD-01, CAD-02, CAD-04, CAD-05, CAD-06 | T-02-14 | AutorizacoesStep stacked-cards layout with POLICY_VERSION caption; mandatory row visually distinct; no "IA" word (CLAUDE.md linguistic rule) | unit / integration | `grep -q "POLICY_VERSION" src/features/cadastro/components/steps/AutorizacoesStep.tsx && grep -q "Autorizo o uso dos meus dados" src/features/cadastro/components/steps/AutorizacoesStep.tsx && grep -q "Obrigatório" src/features/cadastro/components/steps/AutorizacoesStep.tsx && grep -q "Autorizo receber comunicações" src/features/cadastro/components/steps/AutorizacoesStep.tsx && grep -q "Autorizo manter meu currículo" src/features/cadastro/components/steps/AutorizacoesStep.tsx && grep -q "Autorizo análise de vídeo-entrevistas" src/features/cadastro/components/steps/AutorizacoesStep.tsx && grep -q "avaliação comportamental e de comunicação" src/features/cadastro/components/steps/AutorizacoesStep.tsx && ! grep -qE "\bIA\b" src/features/cadastro/components/steps/AutorizacoesStep.tsx && grep -q "fieldset" src/features/cadastro/components/steps/AutorizacoesStep.tsx` | ✅ | ⬜ pending |
| 2-06-T3 | 06 | 3 | CAD-01, CAD-02, CAD-04, CAD-05, CAD-06 | — | UI-SPEC Dimension 4 compliance — only font weights 400/600 in cadastro surface | integration | `test "$(grep -rE "font-medium\|font-bold" src/features/cadastro/components/ 2>/dev/null \| wc -l \| tr -d ' ')" = "0" && npm run build` | ✅ | ⬜ pending |
| 2-06-T4 | 06 | 3 | CAD-01, CAD-02, CAD-04, CAD-05, CAD-06 | T-02-15 | E2E spec extends cadastro-flow with 6 Wave 0 cases (happy-path auto-login, EMAIL_EXISTS, CPF_EXISTS, LGPD mandatory block, draft restore, rate_limited skip); seed-dependent cases gated by env | e2e | `grep -q "happy path: auto-login lands on /candidato/perfil" e2e/cadastro-flow.spec.ts && grep -q "LGPD mandatory: submit blocked" e2e/cadastro-flow.spec.ts && grep -q "draft restore: Step 1-2 fields preserved" e2e/cadastro-flow.spec.ts && grep -q "EMAIL_EXISTS at submit" e2e/cadastro-flow.spec.ts && grep -q "CPF_EXISTS at blur" e2e/cadastro-flow.spec.ts && grep -q "Criar conta" e2e/cadastro-flow.spec.ts && ! grep -q "Finalizar Cadastro" e2e/cadastro-flow.spec.ts` | ✅ | ⬜ pending |
| 2-06-T5 | 06 | 3 | CAD-01, CAD-02, CAD-04, CAD-05, CAD-06 | — | Full-suite validation gate — lint + Vitest + build must all be green before UAT preflight | integration / e2e | `test "$(npm run lint 2>&1 \| grep -v 'src/features/vagas' \| grep -E 'error TS' \| wc -l \| tr -d ' ')" = "0" && npm run test:run && npm run build` (plus manual `npx playwright test cadastro-flow --project=chromium --reporter=line`) | ✅ | ⬜ pending |
| 2-06-T6 | 06 | 3 | CAD-01, CAD-02, CAD-04, CAD-05, CAD-06 | T-02-13, T-02-14 | Manual UAT preflight — iPhone 12 Pro viewport + Sonner toast audit + draft UX + CTA label + LGPD visual hierarchy + mandatory block | manual | Human checkpoint — resume signal `approved — UAT preflight green` after 6 behaviors verified in Chrome DevTools iPhone 12 Pro emulation | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Based on RESEARCH.md §Validation Architecture. Wave 0 is a foundation/scaffolding wave that must complete BEFORE any feature code changes.

### Dependencies
- [ ] **Install testing-library** (if missing) — `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- [ ] **Verify Vitest JSDOM environment** — `vitest.config.ts` uses `environment: 'jsdom'` for hook tests
- [ ] **Upgrade `@supabase/supabase-js`** — 2.48.1 → ≥ 2.50.x (Research Pathway 9 carryover blocker; required for `rpc()` with `sb_publishable_` anon key)

### Test scaffolding (stubs per new/modified surface)
- [ ] `src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts` — stubs for save/load/clear/clearOnAuthChange/PII-exclusion
- [ ] `src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts` — stubs for beforeunload register/cleanup, dirty-state toggle
- [ ] `src/features/cadastro/hooks/__tests__/useDuplicateCheck.test.ts` — update existing or add: RPC path, rate_limited toast
- [ ] `src/features/cadastro/services/__tests__/cadastroService.test.ts` — update: `error_code` routing, auto-login + retry 1x, fallback to `/auth/login`
- [ ] `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` — update: `supabase.rpc('check_candidato_duplicate')` mock
- [ ] `e2e/cadastro-flow.spec.ts` — extend with 6 cases:
  1. Happy path: 4 steps → submit → auto-login → `/candidato/perfil` + toast
  2. EMAIL_EXISTS at submit → auto-navigate Step 1 + inline error + toast
  3. CPF_EXISTS at blur (debounce) → inline indicator + cannot advance Step 1
  4. LGPD mandatory unchecked → submit button disabled
  5. Draft restore: fill Step 1-2 → refresh → Step 1-2 pre-filled (senha empty)
  6. rate_limited response → toast "Muitas tentativas…" + field re-enabled

### Schema & infra audit (probes, not changes)
- [ ] **Audit `autorizacoes` columns in prod** — `\d public.autorizacoes` via Supabase SQL Editor. Research Open Question 2: confirm whether `ip_aceite`, `data_aceite`, `user_id` exist (Edge Function inserts them best-effort; baseline migration is 0 bytes, so column presence unverified).
- [ ] **Probe `inet_client_addr()`** — Research Open Question 1: write a 3-line SQL function returning `inet_client_addr()`, call from client via RPC, compare to browser's public IP. Decides if Phase 2 rate-limit uses IP or falls back to `auth.uid()`-only.
- [ ] **Verify SDK version** — after upgrade, confirm `rpc()` works with the `sb_publishable_` anon key format (Research Pathway 9).

### Exit criteria for Wave 0
- All 8 test stub files exist (green or pending, but file-present)
- `npm run test:run` passes with new stubs (empty `it.todo()` acceptable)
- `@supabase/supabase-js` upgraded and pinned; `npm run lint` passes (ignoring pre-existing `features/vagas` errors documented in KNOWN-ISSUES-CARRYOVER-PHASE-3.md)
- Audit SQL results captured in a comment at the top of `02-01-PLAN.md` or as an appendix here

---

## Manual-Only Verifications

Behaviors that cannot be automated within Phase 2's scope. Each must be executed during `/gsd-verify-work`.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iPhone 12 Pro viewport (390×844) form fills end-to-end without horizontal scroll, logout reachable | HARD-05 (carryover from Phase 5) | Playwright has mobile projects but visual regressions need eyeballs; UI-SPEC declares iPhone 12 Pro as mandatory baseline | Open Chrome DevTools → iPhone 12 Pro device emulation → complete Steps 1-4 → verify no horizontal scroll, no overflow, 44px touch targets, LGPD mandatory distinct |
| LGPD copy legal review (4 checkbox strings + policy text + "Saiba mais" modal) | CAD-05 | Legal compliance; needs human reviewer from the business/legal side | Export the 4 checkbox strings + policy V1.0 text from UI-SPEC §Microcopy Catalog → send to Beauty Smile legal/compliance lead → capture sign-off in PR |
| Edge Function redeploy after contract change (add `error_code`/`field`/`message`) | CAD-07 | Supabase CLI deploy is a manual command; cannot be in a unit test. Must verify `--no-verify-jwt` is applied (Phase 1 UAT blocker #1) | `supabase functions deploy cadastrar-candidato --no-verify-jwt` → curl OPTIONS + POST probes → verify 200/400 as expected |
| Production policy URL resolves | D-16 | The "Saiba mais" link points to a policy page that must exist in the Beauty Smile product / hosting; verifying 200 OK on prod URL is not a unit test | `curl -I https://beautysmile.com.br/politica-de-privacidade` OR inline modal with stamped text (acceptable fallback for MVP) |
| Rate-limit trigger on real user | D-12 | Emulating `inet_client_addr()` in unit tests is fragile; better to have one production smoke test at release | In a private tab, call `supabase.rpc('check_candidato_duplicate', …)` 31x in 60s → verify the 31st returns `{rate_limited: true}` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner fills)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (planner enforces)
- [ ] Wave 0 covers all MISSING references (dep install, test stubs, SDK upgrade, column audit, IP probe)
- [ ] No `--watch` flags in commands (all single-run for CI determinism)
- [ ] Feedback latency < 30s at task level, < 120s at wave level
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 completes

**Approval:** pending — Wave 0 completion
