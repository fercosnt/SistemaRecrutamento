-- =============================================================================
-- Migration: o gabarito do Raven fecha DE VERDADE
-- Date: 2026-08-26
-- =============================================================================
--
-- ⚠ CONSERTA UM CONSERTO INCOMPLETO MEU, da 20260826000009.
--
-- Lá eu escrevi:
--
--     REVOKE SELECT (resposta_correta) ON public.questoes_raven FROM authenticated;
--
-- e conferi depois: `anon` saiu, mas `authenticated` CONTINUAVA com SELECT sobre
-- `resposta_correta`. O gabarito seguiu aberto para todo usuário logado — inclusive
-- o candidato — mesmo depois da migration que existia para fechá-lo.
--
-- A razão é do Postgres e vale registrar: um GRANT em nível de TABELA cobre todas as
-- colunas, e um REVOKE em nível de COLUNA não o recorta. Enquanto
-- `GRANT SELECT ON questoes_raven TO authenticated` existir, revogar coluna a coluna
-- não tem efeito nenhum. O caminho correto é revogar o SELECT da TABELA e então
-- conceder, explicitamente, apenas as colunas que podem ser lidas.
--
-- ⚠ E ISSO SÓ APARECEU PORQUE A VERIFICAÇÃO FOI FEITA. O `REVOKE` não deu erro, não
-- avisou nada, e a migration foi aplicada com md5 conferido — tudo indicava sucesso.
-- Se eu tivesse parado no "aplicada com sucesso", o gabarito continuaria público e
-- eu teria escrito no commit que estava fechado. Aplicar não é o mesmo que ter
-- efeito, e só a consulta de volta distingue os dois.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $gab$
DECLARE
  v_ainda int;
BEGIN
  -- Tira o SELECT da TABELA (é ele que sustentava o acesso à coluna do gabarito)…
  REVOKE SELECT ON public.questoes_raven FROM authenticated;

  -- …e devolve, coluna a coluna, só o que o candidato pode ver. `resposta_correta`
  -- fica DE FORA, deliberadamente. Quem precisa dela é a pontuação, que roda como
  -- DEFINER no servidor (calcular_scores_raven) e não depende deste GRANT.
  GRANT SELECT (id, numero_questao, versao, serie, imagem_matriz_url, opcoes_imagens,
                created_at, updated_at, deleted_at, created_by)
    ON public.questoes_raven TO authenticated;

  -- Portao: prova por leitura de volta que o gabarito NAO esta mais concedido.
  SELECT count(*) INTO v_ainda
    FROM information_schema.column_privileges
   WHERE table_name = 'questoes_raven'
     AND column_name = 'resposta_correta'
     AND privilege_type = 'SELECT'
     AND grantee IN ('anon', 'authenticated');

  IF v_ainda > 0 THEN
    RAISE EXCEPTION 'resposta_correta AINDA concedida a % grantee(s) — o revoke nao teve efeito', v_ainda;
  END IF;

  RAISE NOTICE 'gabarito do Raven fechado para anon e authenticated';
END
$gab$;
