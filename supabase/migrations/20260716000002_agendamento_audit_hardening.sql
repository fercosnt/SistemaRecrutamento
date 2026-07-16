-- =============================================================================
-- Phase 33 code-review hardening (WR-01, WR-02, WR-03, IN-01) — forward-only follow-up
-- to 20260716000001. The agendamentos_entrevista write-path is direct client
-- .insert()/.update() (no funnel RPC), so authorship + audit columns MUST be stamped
-- server-side — they cannot be left to (or spoofed by) the client.
--
-- Overloads the existing BEFORE INSERT/UPDATE trigger fn agendamento_normaliza_vaga_id()
-- (already the sole BEFORE-row hook on this table) to ALSO stamp:
--   INSERT: agendado_por := auth.uid()   (WR-01 — anti-spoof authorship; mirrors avancar_etapa ator=auth.uid())
--   UPDATE: agendado_por preserved from OLD; updated_by := auth.uid(); updated_at := now()  (WR-02)
-- Keeps the vaga_id normalization (Pitfall-1 belt) unchanged.
-- Adds REVOKE ALL ... FROM PUBLIC on the trigger fn for codebase consistency (IN-01).
--
-- Applied to PROD via Supabase MCP apply_migration. No BEGIN;/COMMIT; wrapper (D-22).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.agendamento_normaliza_vaga_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Pitfall-1 belt: vaga_id can never diverge from the candidatura's real vaga.
  NEW.vaga_id := (SELECT c.vaga_id FROM public.candidaturas c WHERE c.id = NEW.candidatura_id);

  -- Server-side authorship + audit stamping (WR-01/WR-02) — the write-path is direct
  -- .insert/.update, so these are enforced here, not trusted from the client payload.
  IF TG_OP = 'INSERT' THEN
    NEW.agendado_por := auth.uid();            -- who created it (anti-spoof)
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.agendado_por := OLD.agendado_por;      -- preserve original author
    NEW.updated_by   := auth.uid();            -- who last changed it
    NEW.updated_at   := now();                 -- when
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.agendamento_normaliza_vaga_id() FROM PUBLIC;  -- IN-01 consistency

COMMENT ON FUNCTION public.agendamento_normaliza_vaga_id() IS
  'Phase 33 BEFORE INSERT/UPDATE write-stamp trigger for agendamentos_entrevista. '
  '(1) Pitfall-1 belt: forces vaga_id to candidatura.vaga_id (KPI integrity; a spoofed '
  'vaga_id is overwritten). (2) WR-01/WR-02 audit: on INSERT stamps agendado_por=auth.uid() '
  '(anti-spoof authorship); on UPDATE preserves agendado_por and stamps updated_by=auth.uid() '
  '+ updated_at=now(). The authorization mitigation is the 33-02 join-through RLS predicate; '
  'this trigger is the integrity/audit belt.';
