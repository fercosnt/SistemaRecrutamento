-- =============================================================================
-- Phase 33 — Camada de Dados do Agendamento de Entrevista (AGEND-01 + SEG-03)
-- =============================================================================
-- Reconciles the two competing schema proposals into ONE authoritative table:
--   ARCHITECTURE.md: observacoes_rh, status, agendado_por
--   FEATURES.md:     entrevistador, compareceu
-- (CONTEXT Area 1 — LOCKED). Reuses the two enums already live in PROD
-- (public.status_entrevista, public.tipo_entrevista_avaliacao) — referenced, never re-declared.
--
-- Applied to PROD via Supabase MCP `apply_migration` in plan 33-03 (bypasses the
-- 42601 prepared-statement error on PL/pgSQL $$ bodies). NO explicit BEGIN;/COMMIT;
-- wrapper (D-22, CLAUDE.md §Migrations — the CLI driver wraps each migration itself).
--
-- Sections:
--   33-01 (this): CREATE TABLE + indices + COMMENT + vaga_id-consistency trigger
--   33-02:        ENABLE RLS + rh_gerencia_agendamento (WR-04 join-through) +
--                 get_meu_agendamento DEFINER allowlist RPC
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 33-01 · Table (authoritative reconciled column set)
-- ---------------------------------------------------------------------------
CREATE TABLE public.agendamentos_entrevista (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  vaga_id        uuid NOT NULL REFERENCES public.vagas(id),
  tipo           public.tipo_entrevista_avaliacao NOT NULL,
  data_hora      timestamptz NOT NULL,
  local_ou_link  text,
  status         public.status_entrevista NOT NULL DEFAULT 'agendada',
  observacoes_rh text,
  entrevistador  text,
  compareceu     boolean,
  agendado_por   uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid,
  deleted_at     timestamptz
);

CREATE INDEX idx_agendamentos_candidatura ON public.agendamentos_entrevista (candidatura_id);
CREATE INDEX idx_agendamentos_vaga        ON public.agendamentos_entrevista (vaga_id);

COMMENT ON TABLE public.agendamentos_entrevista IS
  'Phase 33 / AGEND-01 + SEG-03: per-candidatura interview schedule. '
  'RH is vaga-scoped via WR-04 join-through predicate (rh_gerencia_agendamento, 33-02). '
  'The candidate reads ONLY via public.get_meu_agendamento (SECURITY DEFINER allowlist) — '
  'there is NO candidate base-table SELECT policy, so observacoes_rh (RH-internal) is '
  'unreachable to the candidate by construction (RLS is row-level, not column-level). '
  'Cancel = status=''cancelada'' (row kept, candidate must see it); deleted_at = hard removal. '
  'compareceu (nullable, null=pending) is the KPI-04 no-show source of truth. '
  'vaga_id is denormalized KPI convenience, force-normalized to candidatura.vaga_id by '
  'trg_agendamento_normaliza_vaga — it is NEVER the authorization key.';

COMMENT ON COLUMN public.agendamentos_entrevista.observacoes_rh IS
  'RH-internal notes — MUST NEVER appear in the candidate projection (SEG-03). '
  'Excluded from the get_meu_agendamento allowlist by construction.';

-- ---------------------------------------------------------------------------
-- 33-01 · vaga_id-consistency BEFORE trigger (Pitfall-1 belt + KPI-by-vaga trust)
-- ---------------------------------------------------------------------------
-- Authorization is keyed on the candidatura's REAL vaga by the 33-02 RLS
-- join-through predicate. This trigger is the BELT: it guarantees the
-- denormalized vaga_id can never diverge from candidatura.vaga_id, so a
-- client-supplied vaga_id is OVERWRITTEN, not trusted. SECURITY DEFINER +
-- search_path='' so the candidaturas lookup resolves regardless of the
-- writer's RLS on candidaturas, and no search_path hijack is possible (Pitfall 3).
CREATE OR REPLACE FUNCTION public.agendamento_normaliza_vaga_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.vaga_id := (SELECT c.vaga_id FROM public.candidaturas c WHERE c.id = NEW.candidatura_id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.agendamento_normaliza_vaga_id() IS
  'Phase 33 Pitfall-1 belt: forces agendamentos_entrevista.vaga_id to the '
  'candidatura''s real vaga on INSERT/UPDATE (KPI-by-vaga integrity). The '
  'authorization mitigation is the 33-02 join-through RLS predicate; this trigger '
  'additionally neutralizes a spoofed client-supplied vaga_id (D-06 / Pitfall 1).';

DROP TRIGGER IF EXISTS trg_agendamento_normaliza_vaga ON public.agendamentos_entrevista;
CREATE TRIGGER trg_agendamento_normaliza_vaga
  BEFORE INSERT OR UPDATE ON public.agendamentos_entrevista
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_normaliza_vaga_id();

-- ---------------------------------------------------------------------------
-- 33-02 · RLS (bidirectional) + candidate DEFINER allowlist RPC
-- ---------------------------------------------------------------------------
-- RH: EXACTLY ONE policy, FOR ALL, the WR-04 join-through-candidaturas predicate
-- in BOTH USING and WITH CHECK (authorization keyed on the candidatura's REAL vaga —
-- immune to a spoofed vaga_id, Pitfall 1; the direct `vaga_id IN (SELECT id FROM
-- public.vagas …)` form is FORBIDDEN). There is NO candidate SELECT/write policy —
-- the candidate reads ONLY via public.get_meu_agendamento (allowlist), so observacoes_rh
-- is unreachable by construction (RLS is row-level, not column-level). A 2nd permissive
-- policy would OR-defeat the scope (P24 SEC-08 / P32 caught a 2nd live policy).
ALTER TABLE public.agendamentos_entrevista ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rh_gerencia_agendamento ON public.agendamentos_entrevista;
CREATE POLICY rh_gerencia_agendamento ON public.agendamentos_entrevista
  FOR ALL TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  )
  WITH CHECK (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );

COMMENT ON POLICY rh_gerencia_agendamento ON public.agendamentos_entrevista IS
  'WR-04 vaga-scoped (join-through-candidaturas): admin bypass OR rh owning the '
  'candidatura''s vaga. Sole policy; no candidate policy exists. The denormalized '
  'vaga_id is authorization-irrelevant here (scope keyed on candidatura_id -> real '
  'vaga) — a spoofed vaga_id cannot cross scope (Pitfall 1; direct form forbidden).';

-- Candidate own-row reader — SECURITY DEFINER allowlist RPC (clones get_minha_redacao).
-- Ownership enforced INSIDE via candidaturas->candidatos WHERE user_id=auth.uid().
-- The result signature physically excludes observacoes_rh / entrevistador /
-- agendado_por / updated_by / vaga_id — SEG-03 column isolation by construction.
CREATE OR REPLACE FUNCTION public.get_meu_agendamento(p_candidatura_id uuid)
RETURNS TABLE (
  id             uuid,
  candidatura_id uuid,
  tipo           public.tipo_entrevista_avaliacao,
  data_hora      timestamptz,
  local_ou_link  text,
  status         public.status_entrevista,
  compareceu     boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.candidatura_id, a.tipo, a.data_hora, a.local_ou_link, a.status, a.compareceu
    FROM public.agendamentos_entrevista a
    JOIN public.candidaturas c  ON c.id  = a.candidatura_id
    JOIN public.candidatos   ca ON ca.id = c.candidato_id
   WHERE a.candidatura_id = p_candidatura_id
     AND ca.user_id = auth.uid()
     AND a.deleted_at IS NULL
   ORDER BY a.data_hora DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_meu_agendamento(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_meu_agendamento(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_meu_agendamento(uuid) IS
  'Phase 33 / SEG-03 / AGEND-04 candidate own-row reader. Ownership enforced INSIDE '
  '(candidaturas->candidatos WHERE user_id=auth.uid()). The result allowlist EXCLUDES '
  'observacoes_rh / entrevistador / agendado_por / updated_by / vaga_id — unreachable by '
  'construction (no candidate base-table SELECT policy exists). deleted_at IS NULL hides '
  'hard-removed rows; status=''cancelada'' stays visible so the candidate sees a cancellation.';
