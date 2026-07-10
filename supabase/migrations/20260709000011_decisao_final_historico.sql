-- =============================================================================
-- Migration: decisao_final_historico — append-only decision history + snapshot trigger
-- Date: 2026-07-09
-- Phase: 25 (corre-o-do-funil-lado-rh-enums-colunas-contratos)
-- Requirement: FUNIL-09 (A26) — registrar_decisao must not destroy the previous decision
-- DEPENDS ON: 20260607000003 (decisao_final table + decisao_final_resultado enum)
-- =============================================================================
--
-- ⚠ VERSION RENUMBER (executor deviation, 25-01 Task 2): plan named this file
-- 20260709000002_decisao_final_historico.sql; 20260709000002 was already taken by the
-- committed Phase-24 20260709000002_sec08_candidaturas_dup_policy_remediation.sql.
-- Renumbered into the fresh contiguous 20260709000010..000014 block. Content unchanged.
--
-- PURPOSE (A26)
-- decisao_final has UNIQUE(candidatura_id) → registrar_decisao UPSERTs (ON CONFLICT DO
-- UPDATE), OVERWRITING decisao/justificativa/por_usuario/em in place. An amendment (a 2nd
-- registrar_decisao for the same candidatura) or an em_espera decision writes NO
-- historico_candidatura row (only aprovado/rejeitado change etapa → fire avancar_etapa). So
-- the prior decision — including the human actor (por_usuario) — is destroyed with no trail.
--
-- FIX: an append-only decisao_final_historico table fed by an AFTER UPDATE trigger on
-- decisao_final that copies OLD.* BEFORE the overwrite lands. The actor is preserved
-- (por_usuario NOT NULL) so LGPD-02 auditability survives every amendment. Capture lives in
-- ONE trigger (never a per-writer manual INSERT) → guarantees capture for any future writer.
--
-- RLS (mirror decisao_final — 20260607000003): all client writes blocked (explicit
-- FOR INSERT WITH CHECK(false); no UPDATE/DELETE policy → denied by default); the SECURITY
-- DEFINER snapshot trigger bypasses RLS to insert. RH-scoped SELECT ONLY (vaga-owner scope,
-- administrador bypasses) — mirror rh_le_decisao_final (20260625100002); NO candidate-facing
-- policy (A3 — the archived justificativa/actor is internal, never candidate-visible).
--
-- Pure DDL + RLS + one PL/pgSQL $$ trigger fn + COMMENT → apply via Supabase MCP
-- apply_migration in the [BLOCKING] wave 25-07 — NOT applied here (D-22; no BEGIN/COMMIT
-- wrapper). Types regen (database.types.ts) deferred to Phase 27; the executor may need a
-- local `as never` shim if TS needs the new table before regen (Phase 8/11 precedent).
-- =============================================================================

-- Append-only history table — mirrors decisao_final's columns + a snapshot timestamp.
CREATE TABLE public.decisao_final_historico (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id),
  decisao        public.decisao_final_resultado NOT NULL,  -- OLD value
  justificativa  text NOT NULL,                            -- OLD value
  por_usuario    uuid NOT NULL,                            -- OLD actor (preserved — LGPD-02)
  decidido_em    timestamptz NOT NULL,                     -- OLD.em (when the overwritten decision was made)
  arquivado_em   timestamptz NOT NULL DEFAULT now()        -- when this snapshot was captured
);

CREATE INDEX idx_decisao_final_historico_candidatura
  ON public.decisao_final_historico (candidatura_id);

COMMENT ON TABLE public.decisao_final_historico IS
  'Phase 25 / FUNIL-09 (A26): append-only archive of overwritten decisao_final rows. The AFTER '
  'UPDATE trigger snapshot_decisao_final copies OLD.* here before registrar_decisao''s UPSERT '
  'overwrite lands, so an amendment/em_espera decision no longer destroys the prior decision or '
  'its human actor (por_usuario preserved — LGPD-02). Client writes blocked; RH-scoped SELECT only.';

ALTER TABLE public.decisao_final_historico ENABLE ROW LEVEL SECURITY;

-- Client INSERT blocked entirely (mirror decisao_final_no_client_insert) — only the SECURITY
-- DEFINER trigger writes here; no UPDATE/DELETE policy → those are denied by default.
CREATE POLICY decisao_final_historico_no_client_insert ON public.decisao_final_historico
  FOR INSERT WITH CHECK (false);

-- RH read scoped by vaga ownership (mirror rh_le_decisao_final 20260625100002): administrador
-- reads all; role='rh' reads ONLY history of candidaturas on vagas they own. No candidate
-- policy (A3) → candidates can never read the archived justificativa/actor.
CREATE POLICY rh_le_decisao_final_historico ON public.decisao_final_historico
  FOR SELECT
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR (
      (select auth.jwt() #>> '{app_metadata,role}') = 'rh'
      AND candidatura_id IN (
        SELECT c.id FROM public.candidaturas c
          JOIN public.vagas v ON v.id = c.vaga_id
         WHERE v.created_by = (select auth.uid())
      )
    )
  );

COMMENT ON POLICY rh_le_decisao_final_historico ON public.decisao_final_historico IS
  'Phase 25 / FUNIL-09 (A3): leitura de decisao_final_historico escopada por posse da vaga. '
  'administrador le tudo; rh le APENAS candidaturas de vagas que possui (candidaturas.vaga_id -> '
  'vagas.created_by = auth.uid()). Sem policy candidato-facing — o historico interno de decisao/'
  'justificativa/ator nunca e visivel ao candidato. Espelha rh_le_decisao_final (20260625100002).';

-- Snapshot trigger fn — captures OLD.* before the UPSERT overwrite lands. Same DEFINER preamble
-- as every trigger fn; the DEFINER bypass is what lets it write past the client-INSERT block.
CREATE OR REPLACE FUNCTION public.snapshot_decisao_final()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.decisao_final_historico
    (candidatura_id, decisao, justificativa, por_usuario, decidido_em)
  VALUES
    (OLD.candidatura_id, OLD.decisao, OLD.justificativa, OLD.por_usuario, OLD.em);
  RETURN NEW;
END;
$$;

-- Bind AFTER UPDATE on decisao_final (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_decisao_final_snapshot'
      AND tgrelid = 'public.decisao_final'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_decisao_final_snapshot
             AFTER UPDATE ON public.decisao_final
             FOR EACH ROW
             EXECUTE FUNCTION public.snapshot_decisao_final()';
  END IF;
END $$;

COMMENT ON FUNCTION public.snapshot_decisao_final() IS
  'Phase 25 / FUNIL-09 (A26): AFTER UPDATE ON decisao_final — INSERTs OLD.(candidatura_id, decisao, '
  'justificativa, por_usuario, em) into decisao_final_historico so every overwrite (amendment/em_espera) '
  'is archived with its original human actor preserved (LGPD-02). SECURITY DEFINER + search_path='''' '
  '(bypasses the client-INSERT block). One trigger owns capture — no per-writer manual INSERT.';

REVOKE ALL ON FUNCTION public.snapshot_decisao_final() FROM PUBLIC;
