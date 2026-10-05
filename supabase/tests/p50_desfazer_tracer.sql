-- =============================================================================
-- Phase 50 — DESFAZER DO TRACER (migration 20261005000001): o texto do «Undo» do 50-02
-- =============================================================================
-- ⚠ NÃO É MIGRATION E NÃO SE RODA AVULSO. Dois usos, e só esses:
--   1. ENSAIO REVERSO (50-02, verify das vistas — WR-07 do 50-REVIEW-TRACER-1), numa requisição
--      que ABORTA no sentinela:
--        node scripts/p50_ensaio.cjs --vistas --sem-migracoes --mutacao=supabase/tests/p50_desfazer_tracer.sql
--      = sonda do estado VIVO (tracer aplicado) → ESTE arquivo → sonda do estado desfeito →
--      compara, na MESMA transação. É o «antes × depois do apply» sem janela de tráfego entre as
--      duas fotografias: nada do que o RH ou o candidato fizer no intervalo entra na comparação —
--      porque o prefixo do ensaio abre a transação em REPEATABLE READ (um snapshot só para a
--      requisição inteira; em READ COMMITTED, o padrão da via, cada instrução veria os commits do
--      meio — WR-03 do 50-REVIEW-TRACER-2).
--   2. Base de uma migration CORRETIVA, se algo tiver de ser desfeito de verdade — só com
--      checkpoint do operador (memória «aditivo autônomo, destrutivo com portão»), pela mesma via
--      (`p46apply.cjs migrate`), com nome/versão próprios.
--
-- O TEXTO ANTIGO, VERBATIM. Lido ao vivo em 2026-10-05 (só leitura, `pg_policies.qual` de
-- `public.candidaturas.rh_le_candidaturas`), ANTES do apply: PERMISSIVE, SELECT, roles `{public}`,
-- WITH CHECK nulo, `md5(coalesce(qual,'')||'|'||coalesce(with_check,''))` =
-- 34060c39f6f61e65613e15a093222691, comentário nulo. Depois do apply ele some do catálogo — por
-- isso vive aqui, e o PÓS-PORTÃO abaixo confere que re-alimentar o desparseado devolve o MESMO md5.
-- O desparse usa nomes relativos ao `search_path` da sessão (`vagas` sem schema): é o mesmo da
-- via da Management API em que o md5 foi medido.
--
-- ORDEM OBRIGATÓRIA (IN-03): primeiro o ALTER POLICY (a policy deixa de depender do helper),
-- depois `DROP FUNCTION … RESTRICT`. NUNCA `CASCADE`: derrubaria `rh_le_candidaturas` — e, depois
-- da migration 20261005000002, as outras policies que passam a chamar o helper —, e RH e
-- administrador perderiam toda a leitura. Depois do 0002, este desfazer SOZINHO deixa de existir:
-- o RESTRICT falha alto (outras policies dependem do helper), que é exatamente o comportamento
-- certo; o desfazer passa a ser o do conjunto 0001..000N.
--
-- PRÉ-PORTÃO: helper presente; policy `{authenticated}` chamando o helper — o estado que a
-- migration deixa. PÓS-PORTÃO: md5 e roles = os medidos antes do apply; helper ausente.
-- =============================================================================

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

DO $desfazer_pre$
DECLARE
  v_roles text;
  v_qual  text;
BEGIN
  IF to_regprocedure('public.is_active_rh_user()') IS NULL THEN
    RAISE EXCEPTION 'P50D FAIL (pre): public.is_active_rh_user() nao existe — nao ha tracer para desfazer';
  END IF;
  SELECT p.roles::text, p.qual INTO v_roles, v_qual
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'candidaturas' AND p.policyname = 'rh_le_candidaturas';
  IF v_roles IS DISTINCT FROM '{authenticated}' OR position('is_active_rh_user' IN coalesce(v_qual, '')) = 0 THEN
    RAISE EXCEPTION 'P50D FAIL (pre): rh_le_candidaturas nao esta no estado do tracer (roles=%, qual=%) — medir de novo e decidir A MAO', v_roles, v_qual;
  END IF;
END
$desfazer_pre$;

ALTER POLICY rh_le_candidaturas ON public.candidaturas
  TO public
  USING (((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'administrador'::text) OR ((( SELECT (auth.jwt() #>> '{app_metadata,role}'::text[])) = 'rh'::text) AND (deleted_at IS NULL) AND (is_rascunho = false) AND (vaga_id IN ( SELECT vagas.id
   FROM vagas
  WHERE (vagas.created_by = ( SELECT auth.uid() AS uid)))))));

COMMENT ON POLICY rh_le_candidaturas ON public.candidaturas IS NULL;

DROP FUNCTION public.is_active_rh_user() RESTRICT;

DO $desfazer_pos$
DECLARE
  c_md5   constant text := '34060c39f6f61e65613e15a093222691';
  v_roles text;
  v_md5   text;
BEGIN
  SELECT p.roles::text, md5(coalesce(p.qual, '') || '|' || coalesce(p.with_check, ''))
    INTO v_roles, v_md5
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'candidaturas' AND p.policyname = 'rh_le_candidaturas';
  IF v_md5 IS DISTINCT FROM c_md5 OR v_roles IS DISTINCT FROM '{public}' THEN
    RAISE EXCEPTION 'P50D FAIL (pos): rh_le_candidaturas desfeita ficou md5=% roles=% (esperado % / {public} — o medido antes do apply)', v_md5, v_roles, c_md5;
  END IF;
  IF to_regprocedure('public.is_active_rh_user()') IS NOT NULL THEN
    RAISE EXCEPTION 'P50D FAIL (pos): o helper ainda existe depois do DROP';
  END IF;
END
$desfazer_pos$;
