-- =============================================================================
-- Phase 24 / Plan 24-06 / SEC-10 — LGPD erasure of the backup_m2 PII snapshot
-- =============================================================================
-- Compliance boundary: LGPD erasure flow → backup_m2 schema. During the 2026-06-07 M2
-- funnel cutover a full snapshot of candidaturas was preserved as
-- `backup_m2.candidaturas_pre_funil`. That table holds candidate PII but lives OUTSIDE
-- the covered erasure flow (data_deletion_log — 20260609000001), so a candidate's
-- right-to-erasure request never reaches it. The live data is in public.candidaturas;
-- the backup is superseded and must be dropped to complete LGPD erasure coverage.
--
-- LGPD erasure evidence (24-01 live-state capture, 24-LIVE-STATE.md, assumption A1
-- CONFIRMED via MCP): `to_regclass('backup_m2.candidaturas_pre_funil')` was non-null
-- (EXISTS — this DROP is a real op, not a no-op). The table carried 35 columns of
-- candidate PII, including:
--   candidato_id, curriculo_url, curriculo_nome_original, analise_ia_* (7 cols),
--   score_geral, feedback_rejeicao, observacoes_rh, created_by.
-- That column list is the recorded erasure evidence — captured before the drop so the
-- LGPD record shows exactly which PII surface was erased.
--
-- IF EXISTS makes this idempotent: if the table/schema is already gone (e.g. re-run or a
-- clean rebuild that never created the backup) it is a safe no-op. DROP SCHEMA ... CASCADE
-- removes the now-empty backup_m2 schema so no orphaned PII-bearing container survives.
--
-- RNF-07a: nothing here writes or auto-rejects public.candidaturas — this is erasure of a
-- separate backup schema only, never a mutation of the live funnel.
-- Applied via Supabase MCP in 24-08 (bypasses 42601). NO outer BEGIN/COMMIT wrapper
-- (the driver wraps each migration in its own tx — an outer BEGIN/COMMIT triggers 42601).
-- Post-apply smoke (24-08): `SELECT to_regclass('backup_m2.candidaturas_pre_funil')` ⇒ NULL.
-- =============================================================================

-- (1) Drop the PII backup table (erasure).
DROP TABLE IF EXISTS backup_m2.candidaturas_pre_funil;

-- (2) Drop the now-empty backup schema so no PII-bearing container lingers.
DROP SCHEMA IF EXISTS backup_m2 CASCADE;
