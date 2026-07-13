# Plan 24-08 Summary — PROD Landing + Live Smokes

**Status:** ✅ Complete
**Wave:** 3 (BLOCKING · non-autonomous · Supabase MCP PROD writes)
**Completed:** 2026-07-09 (orchestrator-run inline; executor has no MCP)
**Requirements:** SEC-01, SEC-02, SEC-03, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, UX-08 (all landed live)

## What was done

Applied all 8 authored Phase-24 migrations to PROD via Supabase MCP `apply_migration` (+ 2 smoke-driven remediation migrations = **10 version rows**), then ran live attacker-role SQL smokes for every SEC requirement. Full apply log + per-requirement results in `24-PROD-LANDING.md`.

## The behavioral smokes caught 2 real leaks (structural checks passed; behavior did not)

1. **SEC-07 column REVOKE was a no-op** vs Supabase's table-level GRANT → authored a `sec07_rubric_remediation` migration (REVOKE table SELECT + GRANT the 10 non-rubric columns). Re-proof: rubric now unreadable by authenticated/anon.
2. **SEC-08 duplicate-policy OR-leak** — a non-owner recruiter still saw all 8 candidaturas because an M1-era role-only RH policy pair (`"RH vê candidaturas de suas vagas"` / `"RH atualiza candidaturas"`) OR-combined with the swapped M2 pair. Authored `sec08_candidaturas_dup_policy_remediation` (drop the M1 duplicates + re-emit vaga-scoped rh_le_candidaturas preserving the non-draft filter). Re-proof: non-owner → 0 rows; owner → 7/4; admin bypass intact.

Both are documented as deviations D-24-08-A (SEC-07) and D-24-08-B (SEC-08).

## Live smoke results — ALL PASS

candidate cognitivo/redação/rubric reads denied · get_* RPCs project only safe columns · non-owner RH → 0 rows on analise/comparativo/candidaturas/redacoes · owner + admin still read · backup table + schema erased (NULL) · auth_admin policy byte-for-behavior intact (RH login unaffected) · 3 n8n triggers live (graceful-skip) · 116 active Big-Five items, O 24→20, political items not exposed. RNF-07a: no candidaturas write / auto-reject in any applied statement.

## Deferred (tracked in deferred-items.md)

- **SEC-03 n8n Vault secret** — value is Fernando's operational n8n URL; not fabricated. Security requirement (no URL in bundle) already met; server-side dispatch defers gracefully until the secret is set.
- **database.types.ts regen + confined-cast drop** → Phase 27 (self-contained casts, tests green; avoids a 170k-char one-line diff mid-landing).
- **Ledger version-row reconcile** → Phase 27 / DBMIG-01.

## key-files
- created: `24-PROD-LANDING.md`, `supabase/migrations/20260709000001_sec07_rubric_remediation.sql`, `supabase/migrations/20260709000002_sec08_candidaturas_dup_policy_remediation.sql`

## Self-Check: PASSED
- 10 migrations applied (version rows confirmed); every SEC live smoke PASS; both remediations re-proven; RNF-07a preserved; ready for 24-09 EF redeploys.
