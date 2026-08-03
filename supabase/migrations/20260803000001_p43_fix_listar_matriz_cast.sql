-- =============================================================================
-- Phase 43 / RETEN-01 — `listar_matriz_retencao` levantava 42804 no caminho feliz
-- =============================================================================
--
-- CORRETIVA · ZERO-DESTRUTIVA. Um `CREATE OR REPLACE FUNCTION` que acrescenta UM
-- cast. Nenhuma linha tocada, nenhuma policy, nenhum privilegio alterado
-- (`CREATE OR REPLACE` preserva o ACL; o REVOKE/GRANT ao final apenas reafirma o
-- estado pretendido, de forma idempotente).
--
-- -----------------------------------------------------------------------------
-- (1) O DEFEITO, MEDIDO AO VIVO EM 2026-08-03
-- -----------------------------------------------------------------------------
-- A tela `/admin/retencao` abriu pela primeira vez e mostrou:
--
--     "Não foi possível carregar a matriz de retenção."
--
-- enquanto a PREVIA na mesma tela funcionava e trazia o carimbo do servidor
-- ("Prévia calculada em 03/08/2026 às 01:36"). As duas funcoes tem o MESMO guard,
-- entao o contraste ja localizava o problema no CORPO desta, nao na autorizacao.
--
-- Chamada com claim de administrador valida:
--
--     42804 — structure of query does not match function result type
--
-- Causa exata:
--
--     RETURNS TABLE (… alterado_por_nome text …)
--     SELECT … u.nome_completo …          -- character varying(255)
--
-- `RETURN QUERY` sob `RETURNS TABLE` exige IDENTIDADE de tipo, nao apenas
-- compatibilidade de atribuicao. `varchar(255)` nao e `text`, e o Postgres recusa a
-- linha inteira. As outras quatro colunas batem exatamente — so esta diverge.
--
-- -----------------------------------------------------------------------------
-- (2) ⚠ POR QUE UM SMOKE DE 10/10 NAO PEGOU ISSO — a licao que importa
-- -----------------------------------------------------------------------------
-- `p43_matriz_retencao_smoke.sql` chama `listar_matriz_retencao()` UMA vez, na
-- assercao (f), e o cenario e "chamador SEM CLAIM NENHUMA deve receber 42501":
--
--     PERFORM * FROM public.listar_matriz_retencao();   -- espera 42501
--
-- O guard dispara na PRIMEIRA linha do corpo e levanta. **O `RETURN QUERY` nunca
-- executa.** A assercao e legitima e continua valiosa (ela fecha o defeito
-- NULL-cego sistemico da 42-06) — mas ela exercita o guard, nao a leitura.
--
-- Nenhuma outra assercao lia a matriz por esta funcao: (a), (b), (c) e (j)
-- consultam `config_retencao_etapa` DIRETAMENTE, e (g) usa `salvar_janela_retencao`.
-- Resultado: 10/10 verdes com o caminho feliz desta funcao JAMAIS executado — nem no
-- smoke, nem em teste de cliente (a feature `admin/retencao` nao tem arquivo de
-- teste em `services/` nem em `hooks/`), nem ao vivo, ate a tela abrir.
--
-- **Um contador de assercoes verdes mede quantos caminhos foram exercitados, nao
-- quantos existem.** Uma funcao cujo unico teste e a recusa esta, para efeito de
-- corpo, sem teste nenhum. A assercao (k) acrescentada ao smoke por esta migration
-- fecha essa lacuna especifica: ela EXECUTA a leitura com claim valida e confere as
-- 8 linhas.
--
-- -----------------------------------------------------------------------------
-- (3) PROTOCOLO DE APPLY
-- -----------------------------------------------------------------------------
-- Por MCP `apply_migration`, pelo ORQUESTRADOR. Sem wrapper `BEGIN;/COMMIT;`
-- (CLAUDE.md §Migrations). Reparar a `version` do ledger para `20260803000001` e
-- conferir `md5(statements[1])` contra o md5 do arquivo.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- A funcao, byte-identica a de `20260801000002` EXCETO pelo `::text`
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_matriz_retencao()
RETURNS TABLE (
  etapa              public.etapa_processo,
  janela_meses       integer,
  origem             text,
  alterado_por_nome  text,
  atualizado_em      timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Guard NULL-SAFE, inalterado. Em SECURITY DEFINER um guard NULL-cego falha
  -- ABERTO para quem chama sem JWT, e o que vazaria aqui e a POLITICA DE RETENCAO
  -- da empresa somada aos NOMES dos administradores.
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode ler a matriz de retencao'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.etapa,
         c.janela_meses,
         c.origem,
         -- ⚠ O CAST E O FIX. `usuarios_rh.nome_completo` e varchar(255) e o RETURNS
         -- TABLE declara `text`; sem o cast, RETURN QUERY levanta 42804. Nao trocar
         -- a DECLARACAO para varchar(255) em vez disso: `text` e o tipo certo na
         -- fronteira da API (a tela quer um nome, nao um campo de 255), e amarrar a
         -- assinatura ao limite fisico da coluna faria uma futura mudanca de
         -- `nome_completo` quebrar o contrato da funcao sem necessidade.
         u.nome_completo::text,
         c.atualizado_em
    FROM public.config_retencao_etapa c
    LEFT JOIN public.usuarios_rh u ON u.id = c.alterado_por
   ORDER BY c.etapa;
END;
$$;

-- Idempotente: `CREATE OR REPLACE` ja preserva o ACL. Reafirmado para que o estado
-- pretendido esteja LEGIVEL nesta migration, e nao apenas herdado da anterior.
REVOKE ALL ON FUNCTION public.listar_matriz_retencao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_matriz_retencao() TO authenticated;


-- ---------------------------------------------------------------------------
-- Auto-verificacao: EXECUTA o caminho feliz, que e o que ninguem executava
-- ---------------------------------------------------------------------------
-- Um gate que nao morde nao e um gate — e esta migration existe justamente porque
-- o gate anterior media a recusa e chamava aquilo de cobertura.
DO $verifica_leitura$
DECLARE
  v_admin uuid;
  v_linhas int;
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P43-FIX: nenhum administrador vivo — o caminho feliz nao pode ser verificado, e verificar so a recusa foi exatamente o defeito que esta migration corrige';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text,
                      'app_metadata', json_build_object('role','administrador'))::text, true);

  SELECT count(*) INTO v_linhas FROM public.listar_matriz_retencao();

  PERFORM set_config('request.jwt.claims', '', true);

  IF v_linhas <> 8 THEN
    RAISE EXCEPTION 'P43-FIX: listar_matriz_retencao devolveu % linhas, esperado 8 (o enum etapa_processo inteiro)', v_linhas;
  END IF;

  RAISE NOTICE 'P43-FIX OK: listar_matriz_retencao executa e devolve as 8 linhas da matriz';
END
$verifica_leitura$;


COMMENT ON FUNCTION public.listar_matriz_retencao() IS
  'Phase 43 / RETEN-01: le a matriz de retencao com o NOME do ultimo alterador ja resolvido no '
  'servidor. SECURITY DEFINER + STABLE com search_path vazio. Existe para que a tela do admin '
  'nunca precise de acesso a usuarios_rh (admin-only desde a SEG-02): o LEFT JOIN devolve NULL '
  'quando o alterador nao existe mais, que e o caso "Nao identificado" da UI-SPEC e nao um erro. '
  'Projecao por allowlist de 5 colunas — nunca usuarios_rh.*, nunca e-mail, nunca o id do '
  'alterador. Guard NULL-SAFE por IS DISTINCT FROM: recusa com 42501 tanto o papel errado quanto '
  'o chamador SEM claim nenhuma — DEFINER bypassa RLS, entao este guard e o unico controle. '
  'REVOKE ALL de PUBLIC/anon/authenticated e so entao GRANT EXECUTE a authenticated. '
  '⚠ CORRIGIDA em 20260803000001: a versao de 20260801000002 levantava 42804 '
  '("structure of query does not match function result type") em TODA chamada bem-sucedida, '
  'porque usuarios_rh.nome_completo e varchar(255) e o RETURNS TABLE declara text — RETURN QUERY '
  'exige identidade de tipo. O defeito sobreviveu a um smoke 10/10 porque a unica assercao que '
  'chamava esta funcao testava a RECUSA sem claim: o guard levanta na primeira linha e o '
  'RETURN QUERY nunca executava. Um contador de assercoes verdes mede caminhos exercitados, '
  'nao caminhos existentes.';
