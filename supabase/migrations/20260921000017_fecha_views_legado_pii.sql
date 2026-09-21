-- =============================================================================
-- 20260921000017 — fecha 7 views legado que expunham PII a anon e authenticated
-- =============================================================================
-- Hotfix de segurança aprovado pelo operador em 2026-09-21, durante a Phase 48
-- (achado pelo orquestrador ao conferir o hotfix 20260921000016). Fora do escopo
-- dos planos da fase — registrado em deferred-items.md e no STATE.
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-21, só leitura, SET LOCAL ROLE):
--   As 7 views abaixo não têm `security_invoker`; o dono é `postgres`
--   (rolbypassrls = true), então elas leem as tabelas-base IGNORANDO o RLS. E o
--   pg_default_acl do schema concede SELECT a anon e authenticated em todo CREATE.
--   Resultado — legível com a chave publicável do site, e por qualquer sessão:
--     v_candidatos_ativos       42 linhas: nome, CPF, e-mail, celular, nascimento,
--                               endereço, redes sociais de todos os candidatos
--     v_ultimos_acessos         43 linhas: e-mail tentado, IP, dispositivo, cidade
--     v_usuarios_rh_ativos       7 linhas: nome, e-mail, telefone, papel do RH
--     v_sessoes_ativas_validas   0 linhas hoje: session_token, IP
--     security_analysis_view     6 linhas: agregados de logs_acesso
--     v_estatisticas_webhooks    3 linhas: URL e contadores dos webhooks
--     v_biblioteca_mais_usadas   0 linhas: perguntas + nome/cargo de quem criou
--
-- CONSUMIDOR VIVO: nenhum — nenhuma das 7 é citada em src/ nem em
-- supabase/functions/ (grep, 2026-09-21). São legado; service_role mantém acesso.
--
-- O QUE MUDA, por view: `security_invoker = true` (um GRANT futuro passa a
-- respeitar o RLS da tabela-base em vez de reabrir a exposição) e REVOKE ALL de
-- anon e authenticated. O que NÃO muda: as tabelas-base, o ACL de service_role.
--
-- REVERSÍVEL (não fazer): ALTER VIEW ... RESET (security_invoker) + GRANT.
--
-- Sem wrapper BEGIN/COMMIT (CLAUDE.md §Commands).
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000017_fecha_views_legado_pii.sql
-- =============================================================================

DO $pre_portao_p48_views$
DECLARE
  v_view text;
BEGIN
  FOREACH v_view IN ARRAY ARRAY['v_candidatos_ativos', 'v_ultimos_acessos', 'v_usuarios_rh_ativos',
                                'v_sessoes_ativas_validas', 'security_analysis_view',
                                'v_estatisticas_webhooks', 'v_biblioteca_mais_usadas'] LOOP
    IF to_regclass('public.' || v_view) IS NULL THEN
      RAISE EXCEPTION 'VIEWS PRE-PORTAO: public.% nao existe — o estado mudou desde a medicao', v_view;
    END IF;
    IF NOT has_table_privilege('anon', ('public.' || v_view)::regclass, 'SELECT') THEN
      RAISE EXCEPTION 'VIEWS PRE-PORTAO: anon ja nao tem SELECT em public.% — reler o vivo', v_view;
    END IF;
    IF NOT has_table_privilege('service_role', ('public.' || v_view)::regclass, 'SELECT') THEN
      RAISE EXCEPTION 'VIEWS PRE-PORTAO: service_role nao tem SELECT em public.% — a linha de base nao e a medida', v_view;
    END IF;
  END LOOP;
END
$pre_portao_p48_views$;

ALTER VIEW public.v_candidatos_ativos      SET (security_invoker = true);
ALTER VIEW public.v_ultimos_acessos        SET (security_invoker = true);
ALTER VIEW public.v_usuarios_rh_ativos     SET (security_invoker = true);
ALTER VIEW public.v_sessoes_ativas_validas SET (security_invoker = true);
ALTER VIEW public.security_analysis_view   SET (security_invoker = true);
ALTER VIEW public.v_estatisticas_webhooks  SET (security_invoker = true);
ALTER VIEW public.v_biblioteca_mais_usadas SET (security_invoker = true);

REVOKE ALL ON TABLE public.v_candidatos_ativos      FROM anon, authenticated;
REVOKE ALL ON TABLE public.v_ultimos_acessos        FROM anon, authenticated;
REVOKE ALL ON TABLE public.v_usuarios_rh_ativos     FROM anon, authenticated;
REVOKE ALL ON TABLE public.v_sessoes_ativas_validas FROM anon, authenticated;
REVOKE ALL ON TABLE public.security_analysis_view   FROM anon, authenticated;
REVOKE ALL ON TABLE public.v_estatisticas_webhooks  FROM anon, authenticated;
REVOKE ALL ON TABLE public.v_biblioteca_mais_usadas FROM anon, authenticated;

DO $verifica_p48_views$
DECLARE
  v_view text;
  v_role text;
  v_oid  regclass;
BEGIN
  FOREACH v_view IN ARRAY ARRAY['v_candidatos_ativos', 'v_ultimos_acessos', 'v_usuarios_rh_ativos',
                                'v_sessoes_ativas_validas', 'security_analysis_view',
                                'v_estatisticas_webhooks', 'v_biblioteca_mais_usadas'] LOOP
    v_oid := ('public.' || v_view)::regclass;
    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_table_privilege(v_role, v_oid, 'SELECT') OR has_any_column_privilege(v_role, v_oid, 'SELECT') THEN
        RAISE EXCEPTION 'VIEWS VERIFICA: % ainda le public.%', v_role, v_view;
      END IF;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM pg_class c, pg_options_to_table(c.reloptions) o
                    WHERE c.oid = v_oid AND o.option_name = 'security_invoker'
                      AND o.option_value IN ('true', 'on')) THEN
      RAISE EXCEPTION 'VIEWS VERIFICA: public.% sem security_invoker', v_view;
    END IF;
    IF NOT has_table_privilege('service_role', v_oid, 'SELECT') THEN
      RAISE EXCEPTION 'VIEWS VERIFICA: service_role perdeu SELECT em public.%', v_view;
    END IF;
  END LOOP;
END
$verifica_p48_views$;
