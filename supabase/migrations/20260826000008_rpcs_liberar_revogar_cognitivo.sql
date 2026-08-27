-- =============================================================================
-- Migration: RPCs para liberar e revogar a avaliação cognitiva
-- Date: 2026-08-26
-- =============================================================================
--
-- A tabela `cognitivo_liberacao` (20260826000007) não tem policy de escrita: liberar
-- e revogar passam OBRIGATORIAMENTE por aqui, para que todo ato tenha autor.
--
-- As duas RPCs seguem o padrão de `upsert_pergunta_opcoes_metadata` e
-- `reprocessar_analise` desta base — SECURITY DEFINER com a checagem de papel DENTRO
-- do corpo, porque RLS não se aplica a DEFINER e o controle precisa ser explícito.
--
-- ⚠ OWNERSHIP, e não só papel: `rh` só libera candidato de vaga que ele criou
-- (`vagas.created_by = auth.uid()`); `administrador` passa por cima. É a mesma regra
-- que gateia o resto do escopo do recrutador nesta base, e sem ela um recrutador
-- poderia liberar avaliação de candidato de outra pessoa.
--
-- ⚠ SEM GATE DE ETAPA, e isso é deliberado. O cognitivo é presencial e o operador
-- decide QUANDO aplicar — pode ser antes ou depois da entrevista, conforme a agenda
-- da clínica. Amarrar a uma etapa fixa engessaria o uso que motivou a liberação
-- individual. O que NÃO se permite é liberar candidatura encerrada: quem saiu do
-- funil não faz avaliação.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.liberar_cognitivo(
  p_candidatura_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
DECLARE
  v_role   text;
  v_uid    uuid;
  v_owner  uuid;
  v_status public.status_candidatura;
BEGIN
  v_uid  := (SELECT auth.uid());
  v_role := (auth.jwt() #>> '{app_metadata,role}');

  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT v.created_by, c.status INTO v_owner, v_status
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada' USING errcode = 'no_data_found';
  END IF;

  -- rh so libera na propria vaga; administrador passa por cima (mesma regra do
  -- resto do escopo do recrutador nesta base).
  IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Quem saiu do funil nao faz avaliacao.
  IF v_status IN ('rejeitado', 'finalizado') THEN
    RAISE EXCEPTION 'candidatura % — nao se libera avaliacao para quem saiu do funil', v_status
      USING errcode = 'P0001';
  END IF;

  -- Re-liberar uma revogada e legitimo (o operador mudou de ideia, a agenda mudou):
  -- limpa a revogacao e recarimba o autor.
  INSERT INTO public.cognitivo_liberacao (candidatura_id, liberado_por, motivo)
  VALUES (p_candidatura_id, v_uid, p_motivo)
  ON CONFLICT (candidatura_id) DO UPDATE
    SET liberado_por = v_uid,
        liberado_em  = now(),
        revogado_em  = NULL,
        revogado_por = NULL,
        motivo       = COALESCE(EXCLUDED.motivo, public.cognitivo_liberacao.motivo);

  RETURN jsonb_build_object('candidatura_id', p_candidatura_id, 'liberado', true);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.revogar_cognitivo(
  p_candidatura_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $fn$
DECLARE
  v_role  text;
  v_uid   uuid;
  v_owner uuid;
BEGIN
  v_uid  := (SELECT auth.uid());
  v_role := (auth.jwt() #>> '{app_metadata,role}');

  IF v_role IS NULL OR v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT v.created_by INTO v_owner
    FROM public.candidaturas c JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidatura nao encontrada' USING errcode = 'no_data_found';
  END IF;

  IF v_role = 'rh' AND v_owner IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Revoga sem apagar: o rastro de quem liberou e quando permanece.
  UPDATE public.cognitivo_liberacao
     SET revogado_em = now(), revogado_por = v_uid,
         motivo = COALESCE(p_motivo, motivo)
   WHERE candidatura_id = p_candidatura_id AND revogado_em IS NULL;

  RETURN jsonb_build_object('candidatura_id', p_candidatura_id, 'revogado', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.liberar_cognitivo(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revogar_cognitivo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.liberar_cognitivo(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revogar_cognitivo(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.liberar_cognitivo(uuid, text) IS
  'Libera a avaliacao cognitiva para UMA candidatura. Papel rh/administrador; rh so '
  'na propria vaga. Nao libera para quem saiu do funil. Re-liberar uma revogada e '
  'permitido e limpa a revogacao. Ver 20260826000007.';
