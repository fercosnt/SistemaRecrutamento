-- =============================================================================
-- NÃO É MIGRATION — corpo vivo de public.get_avaliacao_status(uuid) ANTES do apply de
-- 20261008000001 (Phase 51 / 51-06), lido só-leitura de PROD em 2026-10-09T04:22:14.437Z
-- (pg_get_functiondef + aclexplode(proacl) + obj_description, pela via do projeto).
--   md5(prosrc) = 0ad235f334b552ddcf00b65dbe7413be
--   proacl      = {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   ACL (aclexplode, grantee:privilegio:grantable:grantor) — com a linha de anon:
--   anon:EXECUTE:false:postgres
--   authenticated:EXECUTE:false:postgres
--   postgres:EXECUTE:false:postgres
--   service_role:EXECUTE:false:postgres
--
-- Base de um DESFAZER CORRETIVO pela via do projeto (node p46apply.cjs migrate <migration nova>):
--   · desfazer TUDO  = uma migration nova com o CREATE OR REPLACE abaixo, o COMMENT abaixo e
--                      GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO anon;
--   · desfazer SÓ o aperto nomeado (veto na pergunta (f) do 51-16) = só o GRANT a anon.
-- Nunca rodar este arquivo como está: ele é registro, não instrução.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_avaliacao_status(p_candidatura_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_owns boolean;
  r      jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.id = p_candidatura_id
       AND ca.user_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT jsonb_build_object(
    'sjt_mc', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'sjt' AND subtipo = 'mc')),
    'sjt_caso_aberto', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'sjt' AND subtipo = 'caso_aberto'),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'sjt_caso_aberto')),
    'redacao', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.redacoes_candidato
                            WHERE candidatura_id = p_candidatura_id),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'redacao')),
    'big_five', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'big_five'),
      'iniciado',   EXISTS(SELECT 1 FROM public.respostas_avaliacao
                            WHERE candidatura_id = p_candidatura_id
                              AND teste = 'big_five')),
    'cognitivo', jsonb_build_object(
      'registrado', EXISTS(SELECT 1 FROM public.scores_candidato
                            WHERE candidatura_id = p_candidatura_id
                              AND tipo = 'cognitivo'))
  ) INTO r;

  RETURN r;
END;
$function$;

-- COMMENT vivo de antes:
COMMENT ON FUNCTION public.get_avaliacao_status(uuid) IS
  'Phase 26 / FUNIL-12 (26-02): fonte de verdade NEUTRA do estado dos 5 cards de avaliacao — booleans de PRESENCA por teste (registrado/iniciado), NUNCA score/veredito/threshold (fecha o entry.status fantasma A41). redacao vem de redacoes_candidato, sjt_caso_aberto de scores_candidato subtipo=caso_aberto. SECURITY DEFINER; guard de posse (candidatos.user_id=auth.uid()) sem clausula de etapa; 42501 em candidatura alheia (IDOR). scores_candidato mantem candidate-DENY. GRANT authenticated (REVOKE PUBLIC).';

-- ACL viva de antes (proacl = {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}):
-- GRANT EXECUTE ON FUNCTION public.get_avaliacao_status(uuid) TO anon, authenticated, service_role;
