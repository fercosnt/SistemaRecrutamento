-- =============================================================================
-- 20260921000016 — fecha a leitura anônima de public.candidaturas
-- =============================================================================
-- Hotfix de segurança aprovado pelo operador em 2026-09-21, durante a Phase 48
-- (achado do executor do plano 48-14, confirmado pelo orquestrador por catálogo).
-- Fora do escopo dos planos da fase — registrado em deferred-items.md e no STATE.
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-21, só leitura):
--   · policy «Allow anonymous duplicate check» = FOR SELECT TO anon USING (true);
--   · ACL da tabela: anon=arwdDxtm/postgres (o pg_default_acl do schema concede
--     direto em todo CREATE TABLE) — SELECT nas 40 colunas;
--   · resultado: quem tem a chave publicável (que vai no bundle do site) lia as
--     33 candidaturas pelo PostgREST — motivo_rejeicao, observacoes_rh,
--     analise_ia_*, curriculo_url.
--   O CLAUDE.md já proíbe o padrão («Duplicate check via RPC SECURITY DEFINER,
--   não anon SELECT»). Nenhuma migration do repositório cria esta policy — ela
--   nasceu fora do repositório (o mesmo caminho de apply desconhecido do drift
--   que o STATE registra).
--
-- POR QUE É SEGURO PARA O CONSUMIDOR VIVO:
--   · o front só consulta candidaturas com sessão (vagasService.ts:94-106,
--     «anon → nem hasUserApplied nem counts»); o INSERT é de authenticated;
--   · as Edge Functions usam service_role;
--   · candidatos já NÃO tem privilégio para anon (a policy gêmea de lá é inerte).
--
-- O QUE MUDA: DROP da policy anônima + REVOKE ALL da tabela para anon.
-- O QUE NÃO MUDA: as policies de authenticated / RH / candidato, e o ACL de
-- authenticated e service_role — provado abaixo contra a linha de base capturada
-- nesta mesma transação.
--
-- REVERSÍVEL: recriar a policy e o GRANT restaura o estado anterior (não fazer).
--
-- Sem wrapper BEGIN/COMMIT (CLAUDE.md §Commands — corpo $$ + REVOKE adjacente).
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000016_fecha_leitura_anonima_candidaturas.sql
-- =============================================================================

DO $pre_portao_p48_hotfix$
DECLARE
  v_qual  text;
  v_roles text;
BEGIN
  SELECT p.qual, p.roles::text INTO v_qual, v_roles
    FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'candidaturas'
     AND p.policyname = 'Allow anonymous duplicate check';
  IF v_qual IS DISTINCT FROM 'true' OR v_roles IS DISTINCT FROM '{anon}' THEN
    RAISE EXCEPTION 'HOTFIX PRE-PORTAO: a policy anonima nao esta como medida (qual=%, roles=%) — reler o vivo antes de aplicar', v_qual, v_roles;
  END IF;
  IF NOT has_table_privilege('anon', 'public.candidaturas', 'SELECT') THEN
    RAISE EXCEPTION 'HOTFIX PRE-PORTAO: anon ja nao tem SELECT em candidaturas — o estado mudou desde a medicao';
  END IF;

  -- Linha de base, na própria transação, do que NÃO pode mudar.
  PERFORM set_config('hotfix16.outras_policies',
    (SELECT string_agg(policyname || '|' || cmd || '|' || roles::text, ';' ORDER BY policyname)
       FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'candidaturas'
        AND policyname <> 'Allow anonymous duplicate check'), true);
  PERFORM set_config('hotfix16.acl_outros',
    (SELECT string_agg(a::text, ',' ORDER BY a::text)
       FROM pg_class c, unnest(c.relacl) a
      WHERE c.oid = 'public.candidaturas'::regclass AND a::text NOT LIKE 'anon=%'), true);
END
$pre_portao_p48_hotfix$;

DROP POLICY "Allow anonymous duplicate check" ON public.candidaturas;

REVOKE ALL ON TABLE public.candidaturas FROM anon;

DO $verifica_p48_hotfix$
DECLARE
  v_priv text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'candidaturas'
                AND 'anon' = ANY (roles)) THEN
    RAISE EXCEPTION 'HOTFIX VERIFICA: ainda existe policy de candidaturas com o papel anon';
  END IF;
  FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('anon', 'public.candidaturas', v_priv) THEN
      RAISE EXCEPTION 'HOTFIX VERIFICA: anon ainda tem % em candidaturas', v_priv;
    END IF;
  END LOOP;
  IF has_any_column_privilege('anon', 'public.candidaturas', 'SELECT') THEN
    RAISE EXCEPTION 'HOTFIX VERIFICA: anon ainda tem SELECT por coluna em candidaturas';
  END IF;
  IF (SELECT string_agg(policyname || '|' || cmd || '|' || roles::text, ';' ORDER BY policyname)
        FROM pg_policies WHERE schemaname = 'public' AND tablename = 'candidaturas')
     IS DISTINCT FROM current_setting('hotfix16.outras_policies', true) THEN
    RAISE EXCEPTION 'HOTFIX VERIFICA: as demais policies de candidaturas mudaram';
  END IF;
  IF (SELECT string_agg(a::text, ',' ORDER BY a::text)
        FROM pg_class c, unnest(c.relacl) a
       WHERE c.oid = 'public.candidaturas'::regclass)
     IS DISTINCT FROM current_setting('hotfix16.acl_outros', true) THEN
    RAISE EXCEPTION 'HOTFIX VERIFICA: o ACL de authenticated/service_role/postgres mudou';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.candidaturas', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.candidaturas', 'INSERT') THEN
    RAISE EXCEPTION 'HOTFIX VERIFICA: authenticated perdeu SELECT/INSERT — o fluxo do candidato quebraria';
  END IF;
END
$verifica_p48_hotfix$;
