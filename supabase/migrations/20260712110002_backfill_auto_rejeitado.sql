-- =============================================================================
-- Migration: backfill historico_candidatura.auto_rejeitado (DBMIG-02 data fix)
-- Date: 2026-07-12
-- Phase: 27 (integridade-de-migrations-fechamento-da-rede-de-testes)
-- Requirement: DBMIG-02 (A28) — one-time correction of historically-mismarked audit rows
-- PAIRED WITH: 20260712110001_avancar_etapa_auto_rejeitado_fix.sql (the trigger code fix)
-- =============================================================================
--
-- PURPOSE
-- One-time data correction. The Phase-6 trigger (20260607000005) wrote
-- `auto_rejeitado = (v_ator IS NULL)` for EVERY system write, so every historical
-- survivor-advance row (a system write that changed etapa but was NOT a rejection — e.g.
-- inscricao → triagem) was mismarked `auto_rejeitado = true`. Replacing the trigger function
-- body (the paired code-fix migration) corrects FUTURE writes only; it does NOT retro-correct
-- existing rows (RESEARCH §Pitfall 4 — code fix ≠ data fix, ship as two distinct migrations).
-- This file is the data half.
--
-- CORRECTION: relabel the mismarked non-terminal system-advance rows to false. Genuine
-- terminal-rejection rows (etapa landing on the terminal reject, e.g. the knockout's own
-- explicit history row) are preserved as `true` by the terminal-etapa guard in the WHERE clause
-- below — the backfill never over-corrects a real auto-rejection (T-27-04-02).
--
-- RNF-07a / SAFETY: this UPDATE touches ONLY the audit column `auto_rejeitado`; it does NOT
-- change any candidatura status, etapa, or decision — no candidate is rejected or un-rejected by
-- this migration. `auto_rejeitado` is an audit-only column with ZERO reads in the client
-- (`grep -rn "auto_rejeitado" src/` = 0), so relabeling historical rows cannot affect any
-- candidate-facing or RH-facing behavior.
--
-- APPLY ORDER: apply this AFTER the trigger fix (20260712110001) so the corpus does not regain
-- mismarked rows between the two. Both are APPLIED via Supabase MCP apply_migration in the
-- [BLOCKING] wave 27-05 — NOT applied here; version-row reconcile is part of the DBMIG-01 ledger
-- close in that same wave.
--
-- NOTE: No outer `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). The Supabase CLI
-- driver / MCP apply wraps each migration in its own implicit transaction. Pure data migration
-- (no DDL, no `$$` body).
-- =============================================================================

UPDATE public.historico_candidatura
   SET auto_rejeitado = false
 WHERE auto_rejeitado = true
   AND etapa_para <> 'rejeitado';   -- system advances mismarked as rejections; terminal rejects kept true
