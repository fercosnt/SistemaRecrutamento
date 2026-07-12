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
-- CORRECTION: relabel the mismarked non-terminal system-advance rows to false.
--
-- ⚠ CR-01 FIX (Phase-27 code review, 2026-07-12): the knockout's OWN explicit audit row
-- (submit_candidatura_atomic, 20260709000014:147-150) is an `inscricao → inscricao` SELF-LOOP
-- with auto_rejeitado=true — the knockout flips `status→rejeitado` but keeps `etapa_atual='inscricao'`,
-- so etapa_para is 'inscricao', NOT 'rejeitado'. An earlier draft guarded only on `etapa_para <> 'rejeitado'`,
-- which MATCHED (and would have flipped to false) every genuine knockout row — inverting the exact audit
-- truth this migration exists to make honest. The self-loop exclusion below preserves the knockout's
-- correct `true`. (Live PROD had 0 knockout rows when the original ran, so no live data was corrupted;
-- this fix hardens the file for any from-zero replay / other environment.) A survivor advance
-- (inscricao → triagem) is a real transition and is correctly relabeled to false.
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
   AND etapa_para <> 'rejeitado'                            -- keep any terminal-reject row true
   AND NOT (etapa_de = 'inscricao' AND etapa_para = 'inscricao');  -- CR-01: keep the knockout self-loop true (its true is correct)
