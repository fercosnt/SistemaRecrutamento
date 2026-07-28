-- Phase 23 / AI-01 — extend public.llm_call_type with 'bigfive_devolutiva'.
--
-- WHY ITS OWN FILE: PROD already carries this enum label (drift ahead of the base
-- migration 20260609000001, which declares only 7 values). This file exists so the
-- ledger / a clean rebuild (DBMIG-01, Phase 27) includes the value — do NOT edit
-- 20260609000001. ADD VALUE is non-transactional and must not run in the same txn
-- that inserts a row using the value (hence the separate seed migration). Idempotent
-- via IF NOT EXISTS. Applied to PROD via Supabase MCP apply_migration.
ALTER TYPE public.llm_call_type ADD VALUE IF NOT EXISTS 'bigfive_devolutiva';
