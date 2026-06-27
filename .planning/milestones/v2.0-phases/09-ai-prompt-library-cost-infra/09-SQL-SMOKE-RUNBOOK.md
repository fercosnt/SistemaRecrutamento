# Phase 9 — SQL Smoke Runbook (migration apply gate)

**Authored:** 2026-06-08 (Plan 09-01 Task 3)
**Owner of execution:** the `[BLOCKING] non-autonomous` migration-apply task (Plan 09-07).

These smokes are the post-apply acceptance gate for the Phase-9 migrations
(schema + RPCs/triggers + cron + seed). Each smoke is a copy-paste SQL block with
an expected result. Run them via **Supabase MCP `execute_sql`** against a
throwaway fixture (D-22 apply path). Per the Phase-8 precedent, cleanup is
**ROLLBACK-free**: use a disposable fixture row set, then `DELETE` the fixture
rows at the end of each smoke (no `BEGIN; ... ROLLBACK;` — the transaction pooler
trips SQLSTATE 42601 on PL/pgSQL bodies wrapped in an explicit transaction).

> Why MCP execute_sql and not `db push`: the cost-anomaly trigger + the 3 promote/
> rollback RPCs + the immutability trigger are PL/pgSQL-heavy; `db push --linked`
> on the transaction pooler trips 42601 (CLAUDE.md §Migrations). MCP `execute_sql`
> / `apply_migration` bypasses it; reconcile by writing version rows into
> `supabase_migrations` so `db push --linked` reports "up to date".

The 6 new tables: `ai_call_logs`, `prompt_versions`, `candidate_ai_decisions`,
`ai_cost_daily`, `data_deletion_log`, `recruiter_alerts`.
The 3 enums: `llm_call_type` (7 values), `llm_provider`, `candidate_status`.

---

## SMOKE-1 — all 6 tables exist with RLS enabled

```sql
-- Expected: 6 rows, each rowsecurity = true.
SELECT t.tablename, c.relrowsecurity AS rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'ai_call_logs', 'prompt_versions', 'candidate_ai_decisions',
    'ai_cost_daily', 'data_deletion_log', 'recruiter_alerts'
  )
ORDER BY t.tablename;

-- Expected: each table has at least 1 administrador SELECT policy.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'ai_call_logs', 'prompt_versions', 'candidate_ai_decisions',
    'ai_cost_daily', 'data_deletion_log', 'recruiter_alerts'
  )
ORDER BY tablename, policyname;
```

**Expected result:** 6 tables, all `rls_enabled = true`; each has at least one
`SELECT` policy keyed to `(select auth.jwt() #>> '{app_metadata,role}') = 'administrador'`.
Writes happen only via EF service_role (RLS-bypassing) — there is intentionally
NO INSERT policy (same idiom as `bias_audit_log`).

---

## SMOKE-2 — enums created with the expected values

```sql
-- Expected: llm_call_type has exactly 7 values (the 7 prompt call_types).
SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname IN ('llm_call_type', 'llm_provider', 'candidate_status')
GROUP BY t.typname
ORDER BY t.typname;
```

**Expected result:**
- `llm_call_type` → 7 labels (e.g. `cv_summary`, `cv_job_match`, plus the other 5).
- `llm_provider` → at least `anthropic`, `openai`.
- `candidate_status` → the LGPD-audit status set (advance/reject/review).

---

## SMOKE-3 — `unique_active_per_type` EXCLUDE constraint blocks 2 active+non-canary rows (Pitfall 5)

```sql
-- Fixture: insert one active+non-canary version for a throwaway call_type.
INSERT INTO public.prompt_versions
  (call_type, semver, content_hash, system_template, user_template, is_active, is_canary)
VALUES
  ('cv_summary', '9.9.1', repeat('a',64), 'sys', 'usr', true, false);

-- This SECOND active+non-canary row of the SAME call_type MUST be rejected.
-- Expected: ERROR — conflicting key value violates exclusion constraint
--           "unique_active_per_type".
INSERT INTO public.prompt_versions
  (call_type, semver, content_hash, system_template, user_template, is_active, is_canary)
VALUES
  ('cv_summary', '9.9.2', repeat('b',64), 'sys', 'usr', true, false);

-- Cleanup (ROLLBACK-free).
DELETE FROM public.prompt_versions WHERE semver IN ('9.9.1','9.9.2') AND content_hash IN (repeat('a',64), repeat('b',64));
```

**Expected result:** the second INSERT raises
`conflicting key value violates exclusion constraint "unique_active_per_type"`.
The first INSERT succeeds. Cleanup removes the fixture.

---

## SMOKE-4 — immutability trigger blocks UPDATE of system_template on a deployed row (RF-PL-04)

```sql
-- Fixture: a deployed (is_active=true) version.
INSERT INTO public.prompt_versions
  (call_type, semver, content_hash, system_template, user_template, is_active, is_canary, deployed_at)
VALUES
  ('cv_job_match', '9.9.3', repeat('c',64), 'frozen sys', 'usr', true, false, now());

-- Attempt to mutate the frozen template — MUST be blocked by the trigger.
-- Expected: ERROR (P0001 or trigger-raised) — immutable after deploy.
UPDATE public.prompt_versions
SET system_template = 'tampered'
WHERE semver = '9.9.3' AND content_hash = repeat('c',64);

-- State-column UPDATE (is_active/deprecated_at) MUST still be allowed (Pitfall 5).
-- Expected: success.
UPDATE public.prompt_versions
SET is_active = false, deprecated_at = now()
WHERE semver = '9.9.3' AND content_hash = repeat('c',64);

-- Cleanup.
DELETE FROM public.prompt_versions WHERE semver = '9.9.3' AND content_hash = repeat('c',64);
```

**Expected result:** the `system_template` UPDATE is rejected by the immutability
trigger; the state-column UPDATE (`is_active`/`deprecated_at`) succeeds — the
trigger only guards `system_template/user_template/content_hash/semver`.

---

## SMOKE-5 — `promote_to_canary` RAISEs P0001 out of range + 42501 for non-administrador

```sql
-- Out-of-range canary_pct (must be 1..50) — Expected: ERROR P0001
--   "canary_pct must be between 1 and 50".
SELECT public.promote_to_canary('00000000-0000-0000-0000-000000000000'::uuid, 99);

-- Non-administrador caller — simulate a candidate JWT via set_config (Phase 8
-- precedent). Expected: ERROR 42501 "forbidden".
SELECT set_config(
  'request.jwt.claims',
  '{"app_metadata":{"role":"candidato"}}',
  true
);
SELECT public.promote_to_canary('00000000-0000-0000-0000-000000000000'::uuid, 10);

-- Reset the simulated claims.
SELECT set_config('request.jwt.claims', '', true);
```

**Expected result:** the first call raises `P0001` with the human-readable range
message (the admin UI surfaces it verbatim). The second call, under a `candidato`
JWT, raises `42501 forbidden` — the in-body role check requires `'administrador'`
(NOT `'admin'`). Note: escape literal `%` as `%%` in the RAISE format string
(MEMORY: publish_vaga `%%` bug pre-apply).

---

## SMOKE-6 — cost-anomaly trigger queues a pg_net POST above the PRD threshold (IA-04)

```sql
-- Fixture: insert an ai_cost_daily row ABOVE a PRD threshold
-- (custo/candidato p95 > R$ 1,00 = 3x baseline R$ 0,38, or vaga > R$200/mo).
-- The AFTER INSERT trigger notify_cost_anomaly() must enqueue a net.http_post
-- to the cost-alerter EF.
INSERT INTO public.ai_cost_daily (vaga_id, date, total_cost_usd, call_count, avg_cost_per_candidate_usd)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, current_date, 999.99, 10, 1.50);

-- Expected: at least 1 queued request to the /functions/v1/cost-alerter URL.
SELECT id, url, method
FROM net.http_request_queue
WHERE url LIKE '%/functions/v1/cost-alerter%'
ORDER BY id DESC
LIMIT 5;

-- Cleanup.
DELETE FROM public.ai_cost_daily
WHERE vaga_id = '22222222-2222-2222-2222-222222222222'::uuid AND total_cost_usd = 999.99;
```

**Expected result:** `net.http_request_queue` (pg_net) carries at least one POST
to the `cost-alerter` EF URL after the over-threshold INSERT. A below-threshold
INSERT must NOT enqueue (dedup per Pitfall 7 — same `(alert_type, vaga_id, date)`
bucket alerts once). `[MEDIUM confidence — not fully live-testable without Vault
secrets; verify the queue insert, EF dispatch is human-gated.]`

---

## SMOKE-7 — pg_cron jobs registered (aggregation 01:30 + retention cleanup 02:00)

```sql
-- Expected: 2 jobs registered in cron.job.
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN ('ai-cost-aggregation', 'ai-logs-retention-cleanup')
ORDER BY jobname;
```

**Expected result:**
- `ai-cost-aggregation` → schedule `30 1 * * *` (01:30 daily), `active = true`.
- `ai-logs-retention-cleanup` → schedule `0 2 * * *` (02:00 daily), `active = true`.

NO pgmq async queues this phase (deferred to Phase 11) — only these two cron jobs.

---

## Post-smoke reconciliation

After all 7 smokes PASS:

1. Write the migration version rows into `supabase_migrations` (so `db push
   --linked` reports "Remote database is up to date").
2. Regenerate `database.types.ts` at the **repo ROOT** via `npm run db:types`
   (never hand-edit).
3. Human-gated follow-ups (NOT part of these smokes): set `ANTHROPIC_API_KEY` /
   `OPENAI_API_KEY` EF secrets, create the Vault secrets (`project_url`,
   `edge_invoke_key`) for the cost-alerter pg_net auth, and run the one-time
   manual `is_active = true` SQL per call_type.
