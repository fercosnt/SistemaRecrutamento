---
phase: 02-cadastro-candidato
plan: 02
wave: 1
status: complete
completed: 2026-04-21
commits:
  - ff19c21  # T1 - authored migration SQL file
  - cc9bd38  # T2 - regenerated database.types.ts after db push
---

# Plan 02-02 — Wave 1 Migration + Schema Push — SUMMARY

## What changed

Schema migration applied to prod Supabase project `isljnozzlvckrgjjbjwp`. `database.types.ts` regenerated from the live schema. No feature code touched (Wave 2 consumes these types).

### Files touched
- `supabase/migrations/20260421000001_rate_limit_duplicate_check.sql` (NEW, 211 lines) — authored at commit `ff19c21`; applied to prod via `supabase db push`
- `database.types.ts` (regenerated) — +33 lines at commit `cc9bd38`

### Operator-run commands
```bash
npx supabase db push
# > Applying migration 20260421000001_rate_limit_duplicate_check.sql...
# > NOTICE (42710): extension "pgcrypto" already exists, skipping
# > Finished supabase db push.

npm run db:types
# > npx supabase gen types typescript --linked > database.types.ts
```

## Verification

| Check | Result |
|-------|--------|
| Migration push | ✅ `Finished supabase db push` (no errors, no rollback) |
| `pgcrypto` extension | Already installed in prod (NOTICE 42710 — expected no-op) |
| `database.types.ts` regen | ✅ 3251 total lines (+33 delta) |
| `grep -c "policy_version"` | 3 (Row/Insert/Update for autorizacoes) ✅ |
| `grep -c "user_agent_aceite"` | 3 ✅ |
| `grep -c "rate_limit_check_duplicate"` | 1 (new table definition) ✅ |
| `grep -c "check_candidato_duplicate"` | 1 (new RPC signature) ✅ |

## Operator decisions during audit that shipped in this migration
- **`data_aceite` dropped** (redundant with existing `created_at`) — confirmed via Probe 1 in `02-AUDIT-RESULTS.md`
- **`user_agent_aceite` added** — LGPD forensics; operator-requested addition beyond the original plan
- **Rate limit key strategy:** hybrid `x-forwarded-for` (via `current_setting('request.headers', true)::json->>'x-forwarded-for'`) + composite `(xff, sha256(cpf|email))` + global 1000/min cap — NOT `inet_client_addr()` (which returns Supabase proxy IP per Probe 2, would DoS the product)

## Must-haves check

- [x] Migration authored in a single atomic `BEGIN;`/`COMMIT;` transaction
- [x] `pgcrypto` extension ensured present (idempotent via `CREATE EXTENSION IF NOT EXISTS`)
- [x] `rate_limit_check_duplicate` table created with composite index, REVOKED from all client roles
- [x] RPC `check_candidato_duplicate` patched: hybrid rate-limit, SECURITY DEFINER, empty `search_path`, proper GRANT/REVOKE
- [x] 4 `ADD COLUMN IF NOT EXISTS` on autorizacoes (policy_version/ip_aceite/user_agent_aceite/user_id)
- [x] 2 indexes (partial on user_id, plain on policy_version)
- [x] No references to `inet_client_addr` or `data_aceite` in the migration file
- [x] Types regenerated and committed
- [x] All new symbols present in `database.types.ts`

## Pending — runtime observation (moved to Wave 2)

The migration shipped but the **`x-forwarded-for` propagation check is still pending**. The plan required observing `v_xff` from a real `supabase.rpc()` call to determine whether the hybrid strategy runs in primary mode (real client IP) or degraded mode (null xff → composite collapses to `(null, hash)` keying = per-candidato throttling).

**Recommendation:** This observation belongs in Plan 02-05 when `duplicateCheckService.ts` is migrated to the RPC. Add a task "log runtime xff from first RPC call" as part of the migration validation; if xff is null in production, document degradation mode in `02-05-SUMMARY.md` and carry a flag into Plan 02-06 for E2E Pitfall 5 mitigation (test-env threshold override).

## Handoffs confirmed for downstream plans

**→ Plan 02-03 (Edge Function) must add:**
- `user_agent_aceite: req.headers.get('user-agent')` in the `autorizacoes` insert payload
- `policy_version: POLICY_VERSION` (constant from `_shared/constants.ts`)
- `ip_aceite` capture via `req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()` (already in current Edge Function — keep)
- MUST NOT reference `data_aceite` (column no longer exists/never did; was a planning assumption)

**→ Plan 02-06 (E2E) must mitigate Pitfall 5:**
- The rate-limit threshold (30 calls/60s per key) can be hit by an E2E suite running many duplicate-checks against the same candidato. Mitigations:
  - RECOMMENDED: env-var `DUPLICATE_CHECK_RATE_LIMIT_OVERRIDE` read by the RPC when `NODE_ENV=test` (requires a tiny follow-up migration; flag for Plan 02-06)
  - Alternative: seed `rate_limit_check_duplicate` with 0 rows at E2E `beforeAll` hook (possible since tests have service-role access)
  - Alternative: whitelist the CI runner IP (depends on CI infra; not currently configured)

## Deviations

1. **Types path in the plan's commit command was wrong** — plan instructed `supabase/types/database.types.ts`; the actual path (per `CLAUDE.md` + `package.json` script) is project root `database.types.ts`. Operator caught it, added from the correct path. Not a migration-content bug.
2. **RPC normalization went beyond plan spec.** Executor added `regexp_replace(p_cpf, '\D', '', 'g')` and `lower(trim(p_email))` + `deleted_at IS NULL` filter + `CASE WHEN clean = '' THEN false` guard. These align with the existing Edge Function behavior and are strictly defensive — zero semantic regression vs plan intent. Documented for awareness.
3. **`user_id` FK to `auth.users`** — `ON DELETE SET NULL` worked in the push. Plan had flagged potential cross-schema FK issue; proved to be a non-issue.

## Commits

| SHA | Scope |
|-----|-------|
| `ff19c21` | T1 — authored `20260421000001_rate_limit_duplicate_check.sql` (211 lines) |
| `cc9bd38` | T2 — regenerated `database.types.ts` after operator-run `supabase db push` |

## Next action

Plan 02-02 complete. Next plan: **02-03 (Edge Function contract evolution)** in Wave 2. Also parallel-eligible in Wave 2: **02-04 (new hooks)** and **02-05 (service layer + autoLogin)**.

Recommended when ready:
```
/gsd-execute-phase 2
```
— scope-check will offer Wave 2 (3 plans, some parallelizable).
