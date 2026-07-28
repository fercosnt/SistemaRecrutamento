---
phase: 02-cadastro-candidato
plan: 01
wave: 0
status: complete
completed: 2026-04-20
commits:
  - 6e08883  # T1 SDK + testing-library
  - f619e39  # T2 Vitest setup.ts
  - feaaf5d  # T3 Test stubs (5 files, 23 it.todo)
  - _pending # audit + summary (this commit)
---

# Plan 02-01 — Wave 0 Foundation — SUMMARY

## What changed

Infrastructure-only. Zero feature code. Unblocked Phase 1 UAT Bug 5 (SDK incompatibility with `sb_publishable_` anon keys) and established Nyquist test scaffolding for the remaining Phase 2 plans.

### Files touched
- `package.json`, `package-lock.json` — `@supabase/supabase-js` 2.48.1 → **2.104.0**; added `@testing-library/react@16.3.2`, `@testing-library/jest-dom@6.9.1`, `@testing-library/user-event@14.6.1` to devDependencies
- `tests/setup.ts` (NEW) — loads `@testing-library/jest-dom` matchers globally
- `vite.config.ts` — wired `setupFiles: ['./tests/setup.ts']`
- `src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts` (NEW) — 5 `it.todo` stubs
- `src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts` (NEW) — 5 `it.todo` stubs
- `src/features/cadastro/hooks/__tests__/useDuplicateCheck.test.ts` (NEW) — 3 `it.todo` stubs
- `src/features/cadastro/services/__tests__/cadastroService.test.ts` — appended `structured error_code routing` describe (7 `it.todo`)
- `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` — appended `rate_limited handling` describe (3 `it.todo`)
- `.planning/phases/02-cadastro-candidato/02-AUDIT-RESULTS.md` (NEW) — operator SQL probe results

## Verification

| Check | Result |
|-------|--------|
| SDK version | `2.104.0` (target: `>= 2.50.0`) ✅ |
| Testing-library installed | RTL 16.3.2 + jest-dom 6.9.1 + user-event 14.6.1 ✅ |
| `npm run build` | Exit 0 (4.58s) ✅ |
| `npm run lint` (delta) | Zero NEW errors in `src/features/cadastro/*`, `src/store/*`, `src/lib/supabase/*` (Pitfall 1 clean) ✅ |
| `npx vitest run src/features/cadastro/` | 138 passing / 27 failing (pre-existing dead tests from Phase 1) / 23 todo ✅ |
| Stubs count | 23 `it.todo` ≥ 17 floor ✅ |
| Audit file | Exists, 118 lines, both probes populated ✅ |

## Pitfall 1 — SDK upgrade ripple check

**Protected scope (must not regress):** `src/features/cadastro/*`, `src/store/*`, `src/lib/supabase/*`. **Result: clean** — zero NEW TS errors in this scope.

**Out of protected scope (ignored for Phase 2, flagged for Phase 4):** 1 new TS error appeared at `src/components/pages/DashboardRHPage.tsx:36` — SDK 2.104 type tightening surfaces the known `ativa`-column family bug (same as `KNOWN-ISSUES-CARRYOVER-PHASE-3.md` Bug 3). Not a ripple; not introduced by Phase 2.

## Audit results (link)

See `.planning/phases/02-cadastro-candidato/02-AUDIT-RESULTS.md`. Two findings materially affect Plan 02-02 (Wave 1):

### Finding A — `autorizacoes` columns
Table currently has: `id, candidato_id, 4 autorizacao_* booleans, created_at, updated_at`. **Missing:** `policy_version`, `ip_aceite`, `user_id`. **Operator decision (documented in audit):** ALSO add `user_agent_aceite`; do NOT add `data_aceite` (redundant with `created_at`). Final migration DDL provided in the audit file.

### Finding B — `inet_client_addr()` returns proxy IP, not client IP
Probe returned `2600:1f18:2a66:6e00:971c:cfc4:d814:be86` — AWS US-East range, i.e., Supabase's internal proxy/pooler. **Implication:** rate limiting by `inet_client_addr()` alone would throttle the entire app under one global bucket. **Strategy update for Plan 02-02:** hybrid key using `current_setting('request.headers', true)::json->>'x-forwarded-for'` with a composite fallback `(x_forwarded_for, hash(cpf+email))` + global upper bound. The operator also flagged Pitfall 5 (E2E test rate-limit collision) as now REQUIRED to mitigate.

## Deviations

1. **KNOWN-ISSUES scope misrepresentation** — doc said 388 errors in `features/vagas/*`; reality is 385 spanning ~50 files across `App.tsx`, `components/pages/*`, `components/ui/*`, etc. Verification used delta-based (same set before/after) instead of the literal grep from the plan. Impact: Plan 02-01's acceptance-criteria grep would have false-failed. No functional issue — underlying guarantee (zero NEW errors in protected scope) was enforced via delta.
2. **Vitest pre-state assumption** — plan implied green suite; actual was 39 failing. T2 recovered 12; T3 added `it.todo` only (no regression possible). Acceptance criteria (existence + grep) passed.
3. **Audit-results file schema** — user enriched the template beyond the minimum: added Redaction Log, Decisions for Wave 1 section with hybrid rate-limit strategy, and 3 flags for downstream plans. These are useful artifacts, not plan violations.

## Must-haves check

- [x] `npx vitest run src/features/cadastro/hooks/__tests__/` produces non-zero test count and exits 0
- [x] `npm run lint` — zero NEW errors in protected scope (delta-verified)
- [x] `package.json` declares `@supabase/supabase-js >= 2.50.0` and `node_modules` version matches
- [x] 3 `@testing-library/*` packages in devDependencies
- [x] `02-AUDIT-RESULTS.md` exists and contains both probe outputs
- [x] `tests/setup.ts` contains `import '@testing-library/jest-dom'`
- [x] 3 NEW hook test files exist
- [x] `vite.config.ts` → `tests/setup.ts` wired via `setupFiles`
- [x] `package.json devDependencies` → `@testing-library/react` present

## Impact on downstream plans

- **Plan 02-02 (Wave 1 migration) NEEDS UPDATE before execution:**
  - DDL must add 4 columns: `policy_version`, `ip_aceite`, `user_agent_aceite`, `user_id` (remove `data_aceite` from plan; use `created_at`)
  - Rate limit strategy changes from `inet_client_addr()` to `x-forwarded-for` hybrid with composite fallback
  - RPC signature may need to accept the hint for composite key computation
- **Plan 02-03 (Edge Function evolution):** must also insert `user_agent_aceite` (from `req.headers.get('user-agent')`) alongside the existing `ip_aceite` capture
- **Plan 02-06 (E2E):** Pitfall 5 mitigation is now REQUIRED — must whitelist CI IP OR seed `rpc_call_log` OR raise threshold above E2E cost

## Next action

Wave 0 complete. Operator asked for Wave 0 only in this session — stopping here. Before running Wave 1, revise Plan 02-02 to incorporate the audit findings (column set + rate-limit strategy). Recommended command:

```
/gsd-plan-phase 2 --gaps
```

— OR manual edit of `02-02-PLAN.md` citing `02-AUDIT-RESULTS.md` as the source of truth.

After Plan 02-02 is revised, resume with `/gsd-execute-phase 2` (executor picks up at Wave 1).
