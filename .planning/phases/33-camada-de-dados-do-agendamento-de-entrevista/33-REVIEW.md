---
phase: 33-camada-de-dados-do-agendamento-de-entrevista
reviewed: 2026-07-16T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - supabase/migrations/20260716000001_agendamentos_entrevista.sql
  - supabase/tests/seg33_agendamento_smokes.sql
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: resolved
resolved: 2026-07-16
resolution_migration: supabase/migrations/20260716000002_agendamento_audit_hardening.sql
---

# Phase 33: Code Review Report

**Reviewed:** 2026-07-16
**Depth:** standard
**Files Reviewed:** 2
**Status:** resolved (all 4 findings fixed — 2026-07-16)

## Resolution (2026-07-16) — migration `20260716000002_agendamento_audit_hardening.sql` (applied live, ledger reconciled)

All four findings fixed by overloading the existing BEFORE INSERT/UPDATE trigger `agendamento_normaliza_vaga_id()` + one REVOKE, then adding a 9th smoke assertion. Re-ran the full gate live in PROD → **9/9 PASS (a–i), zero SKIP**.

- **WR-01 (fixed, stronger than suggested):** trigger now forces `NEW.agendado_por := auth.uid()` on INSERT. Stronger than the suggested `SET DEFAULT auth.uid()` — a DEFAULT only fills an *omitted* value, whereas the trigger overwrites a *client-supplied spoofed* value too. Proven by new assertion (i): admin inserts with a bogus `agendado_por` → stored value is the actor's uid.
- **WR-02 (fixed):** trigger's UPDATE branch now stamps `updated_by := auth.uid()` + `updated_at := now()` (preserving original `agendado_por`). Folded into the existing trigger rather than a second trigger (fewer objects, same effect as the suggested `agendamento_set_updated_meta`).
- **WR-03 (fixed):** new smoke assertion **(i)** behaviorally proves the trigger overwrites a deliberately-wrong client-supplied `vaga_id` (admin inserts `vaga_id=vagaA` for candidatura d01 → persisted as `vagaB`, d01's real vaga). Closes the "asserted only in prose" gap (also plan-check Warning 1).
- **IN-01 (fixed):** added `REVOKE ALL ON FUNCTION public.agendamento_normaliza_vaga_id() FROM PUBLIC` — matches the repo's trigger-fn convention (`avancar_etapa()`, `slugify()`).

## Summary

Reviewed the `agendamentos_entrevista` migration (table + `agendamento_normaliza_vaga_id` BEFORE trigger + `rh_gerencia_agendamento` RLS policy + `get_meu_agendamento` DEFINER RPC) and the 8-assertion behavioral smoke, per the review focus (access-control correctness beyond what the already-GREEN live smoke proves).

**Access-control verdict: no bypass found.** The `rh_gerencia_agendamento` predicate correctly keys authorization on `candidatura_id → candidaturas → vagas.created_by` in both USING and WITH CHECK, so the denormalized `vaga_id` column is genuinely irrelevant to authorization (traced through several attack shapes: spoofed `vaga_id` on INSERT, `candidatura_id` reassignment on UPDATE to hijack a foreign row — both correctly denied by WITH CHECK regardless of the trigger). `get_meu_agendamento` correctly returns 0 rows for `auth.uid() IS NULL` (anon) and for non-owning callers; `search_path=''` is respected with every object schema-qualified.

The issues found are all robustness/data-integrity gaps that the access-control smoke does not (and structurally cannot) exercise: unenforced audit columns, a missing `updated_at` maintenance trigger given this table's direct (non-RPC) write path, and a genuine coverage gap in the smoke itself — the trigger's core "force-normalize a mismatched `vaga_id`" behavior is never actually exercised, only claimed in comments. None of these affect the SEG-03 isolation guarantee already proven live; none are blocking.

## Warnings

### WR-01: `agendado_por` / `updated_by` are unenforced — AGEND-01's "recorded with author" guarantee has no DB backstop

**File:** `supabase/migrations/20260716000001_agendamentos_entrevista.sql:34,37`
**Issue:** `agendado_por uuid` and `updated_by uuid` are plain nullable columns with no `DEFAULT`, no `NOT NULL`, and nothing ties them to `auth.uid()`. AGEND-01 requires the row be "gravada com autor," but a P34 client that forgets to pass `agendado_por` on INSERT silently produces an attribution-less row, and any RH caller (authorized for the row via WR-04) can set `agendado_por` to an arbitrary UUID, misattributing the booking to a different recruiter. This is a data-integrity gap the smoke never probes (assertion (b) always explicitly sets the correct value).
**Fix:** Give `agendado_por` a server-derived default so the DB — not client discipline — is the source of truth (the RH write path is a direct RLS-gated `.insert()` under the caller's own session, so `auth.uid()` resolves correctly here, unlike inside a `SET search_path=''` DEFINER body):
```sql
ALTER TABLE public.agendamentos_entrevista
  ALTER COLUMN agendado_por SET DEFAULT auth.uid();
```
`updated_by` should be set server-side on every UPDATE — see WR-02's trigger, which can stamp both `updated_at` and `updated_by` in one pass.

### WR-02: No `updated_at`/`updated_by` auto-maintenance trigger — will go stale under this table's direct-write path

**File:** `supabase/migrations/20260716000001_agendamentos_entrevista.sql:35-37` (columns), whole file (no `BEFORE UPDATE` trigger present)
**Issue:** CONTEXT Area 2 locks "RH write path: writes diretos gated-por-RLS (.insert/.update/.delete) — sem RPC." That is precisely the scenario this codebase already has a precedent for handling with a `BEFORE UPDATE` trigger (`update_usuarios_rh_updated_at`, `supabase/migrations/20260713000002_usr_rh_anti_lockout.sql:37-39,90`) — because there is no single funnel-point RPC to remember to set the column manually. The *other* precedent this migration's design otherwise resembles (`entrevista_guia_edits`, `20260629190949:62,140`) explicitly documents *why* it correctly omits such a trigger: "the single write-path" (one upsert RPC) sets `updated_at` itself. `agendamentos_entrevista` has neither a trigger nor a single write-path RPC — every future P34 `.update()` call site (reagendar, cancelar, marcar `compareceu`) must remember to pass `updated_at`/`updated_by` explicitly, or the columns silently freeze at their `created_at` values.
**Fix:**
```sql
CREATE OR REPLACE FUNCTION public.agendamento_set_updated_meta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agendamento_set_updated_meta ON public.agendamentos_entrevista;
CREATE TRIGGER trg_agendamento_set_updated_meta
  BEFORE UPDATE ON public.agendamentos_entrevista
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_set_updated_meta();
```

### WR-03: Smoke never behaviorally proves the `vaga_id`-normalization trigger actually normalizes

**File:** `supabase/tests/seg33_agendamento_smokes.sql:105-151` (assertions b, c); `supabase/migrations/20260716000001_agendamentos_entrevista.sql:60-89` (trigger)
**Issue:** The migration's own comment claims the trigger "guarantees the denormalized vaga_id can never diverge from candidatura.vaga_id" (lines 63-64). No assertion in the smoke actually verifies this. Assertion (b) inserts with `vaga_id` already equal to the *correct* value (`vagaB`, matching candidatura d01's real vaga), so a no-op trigger would pass it identically. Assertion (c)'s denial is fully explained by the WITH CHECK ownership predicate alone — the smoke file's own comment concedes this ("NOT a sole discriminator of predicate choice," line 18). So the trigger's actual write-effect (overwriting a client-supplied, mismatched-but-otherwise-authorized `vaga_id`) is asserted only in prose, never exercised. A future regression to the trigger (e.g., wrong join column, `OLD` vs `NEW`, or the `WHERE` clause resolving to the wrong row) would ship with all 8 smoke assertions still GREEN and silently corrupt the P34 KPI-by-vaga aggregate this column exists to serve.
**Fix:** Add a 9th assertion: as the *owning* recruiter (B), INSERT or UPDATE a row on candidatura d01 supplying a deliberately wrong `vaga_id` (e.g., vagaA's id, which B does not own — legal to attempt since WITH CHECK only checks `candidatura_id`), then read the persisted row back (as admin, or via `RETURNING vaga_id`) and assert it equals `vagaB`, not the supplied value:
```sql
-- (i) trigger normalization proof — owner supplies a WRONG vaga_id, DB must force the real one.
UPDATE public.agendamentos_entrevista
   SET vaga_id = '33010033-0000-4000-8000-000000000a01'  -- wrong (vagaA), owner is testing the trigger
 WHERE id = '33010033-0000-4000-8000-000000000e01'
RETURNING vaga_id INTO v_vaga_id;
IF v_vaga_id IS DISTINCT FROM '33010033-0000-4000-8000-000000000b01'::uuid THEN
  RAISE EXCEPTION 'SEG-33 FAIL (i): trigger did not normalize vaga_id (got %)', v_vaga_id;
END IF;
```

## Info

### IN-01: Trigger function missing `REVOKE ALL ... FROM PUBLIC` (defense-in-depth, not currently exploitable)

**File:** `supabase/migrations/20260716000001_agendamentos_entrevista.sql:68-84`
**Issue:** `agendamento_normaliza_vaga_id()` is `SECURITY DEFINER` but has no `REVOKE ALL ON FUNCTION ... FROM PUBLIC`, unlike every other trigger function in this codebase (`avancar_etapa()` — `20260607000005_avancar_etapa_trigger.sql:115`; `slugify()`/`generate_unique_vaga_slug()` — `20260425000001_vagas_slug_trigger.sql:150-151`). By default Postgres grants `EXECUTE` on new functions to `PUBLIC`, so in isolation this function is callable by any role. It is **not currently exploitable**: Postgres refuses to invoke a `RETURNS trigger` function directly outside of trigger-firing context ("ERROR: trigger functions can only be called as triggers"). Still, it's a deviation from this repo's established defense-in-depth convention.
**Fix:**
```sql
REVOKE ALL ON FUNCTION public.agendamento_normaliza_vaga_id() FROM PUBLIC;
```

---

_Reviewed: 2026-07-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
