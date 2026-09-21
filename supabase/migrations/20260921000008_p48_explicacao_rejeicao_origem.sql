-- =============================================================================
-- 20260921000008 — explicacao_rejeicao_origem : a explicação passa a servir a
--                  rejeição humana na triagem (JORN-22 / D-20)
-- =============================================================================
-- Phase 48 / plano 48-09, Task 1. Decisão do operador D-20 (48-CONTEXT.md):
-- «Rejeição humana na triagem: explicação + canal, sem pedido de revisão».
--
-- O QUE ESTAVA ERRADO (medido — 48-RESEARCH.md §B, Achado Contraditório #2).
-- D-12 manda `rejeitar_candidatura` gravar `feedback_rejeicao` neutro, como o
-- knockout já faz; com isso o cartão «Entenda a decisão» do painel passa a
-- aparecer para quem foi rejeitado pelo RH antes da decisão final. Mas o cartão
-- leva a `/candidato/explicacao/:id`, e ali, sem linha em `decisao_final`, o
-- serviço pergunta a `explicacao_rejeicao_automatica` (20260906000007) — que
-- devolve `true` SÓ para o knockout. Para a rejeição humana ela devolve `false`,
-- e a página responderia «Esta página não está disponível». O cartão sozinho
-- trocaria a ausência do direito por um link para uma página vazia.
--
-- O QUE ESTA FUNÇÃO FAZ. Devolve um DISCRIMINADOR de três estados:
--
--   'automatica'     — knockout: status='rejeitado' AND
--                      motivo_rejeicao='knockout_automatico' AND
--                      opcao_knockout_id IS NOT NULL (a mesma condição da booleana);
--   'humana_triagem' — rejeição por uma pessoa FORA da decisão final
--                      (`rejeitar_candidatura`): status='rejeitado', motivo que
--                      NÃO é o do knockout, e SEM linha em `decisao_final`;
--   NULL             — todo o resto.
--
-- «humana_triagem» exige `motivo_rejeicao IS DISTINCT FROM 'knockout_automatico'`
-- de propósito: uma linha com o motivo do knockout mas sem `opcao_knockout_id`
-- (forma que hoje não existe em PROD — medido em 2026-09-21: 0 linhas) cairia,
-- sem essa cláusula, em «uma pessoa da nossa equipe decidiu», o que seria falso.
-- Na dúvida sobre QUEM decidiu, a função cala (NULL), não chuta.
--
-- O QUE ELA NÃO DEVOLVE. Nunca `motivo_rejeicao`, nunca `opcao_knockout_id`,
-- nunca a justificativa do RH. A RPC continua sendo o único lugar onde o motivo é
-- LIDO sem ser DEVOLVIDO (a razão de existir da 20260906000007): o candidato
-- recebe QUEM decidiu (uma regra / uma pessoa), nunca o PORQUÊ.
--
-- ANTI-ORÁCULO. NULL cobre «não é sua» E «é sua, mas não se aplica»
-- (em andamento, aprovada, decisão final registrada, sem JWT). Uma exceção no
-- primeiro caso faria dela um oráculo de existência de candidatura alheia.
--
-- DECISÃO FINAL NÃO É «humana_triagem». Candidatura com linha em `decisao_final`
-- — mesmo rejeitada — devolve NULL aqui: a página a atende pelo caminho humano
-- que já existe (leitura own-row de `decisao_final`, com direito de revisão), e o
-- serviço nem chega a chamar esta função nesse caso.
--
-- POR QUE FUNÇÃO NOVA, E NÃO REDEFINIR A BOOLEANA. Trocar `RETURNS boolean` por
-- `RETURNS text` exige `DROP FUNCTION` — o front publicado chama a booleana e
-- quebraria no intervalo entre este apply e o deploy do front novo (e o
-- `database.types.ts` também, até o regen). Com nome próprio não há janela: a
-- booleana fica (sem DROP), o front novo passa a chamar esta, e a antiga vira
-- código morto a remover num plano futuro.
--
-- AUTHZ: guard own-row idêntico ao da booleana e ao de `stamp_explicacao_acessada`
-- — `candidatos.user_id = auth.uid()`, que sobrevive ao SECURITY DEFINER pela GUC
-- request.jwt. `SET search_path = ''`.
--
-- ACL — `anon` NOMEADO no REVOKE. Diferente da booleana: lá ficou só
-- `REVOKE … FROM PUBLIC`, e o `pg_default_acl` do projeto concede EXECUTE a `anon`
-- como grant direto — medido em 2026-09-21, a booleana está com `anon=X`. Sem JWT
-- o corpo devolveria NULL de qualquer forma (auth.uid() nulo), mas a superfície
-- anônima não precisa existir. O `DO` do fim assere que `anon` não executa.
--
-- IDEMPOTÊNCIA: CREATE OR REPLACE. Sem efeito colateral — é uma leitura.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/GRANT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000008_p48_explicacao_rejeicao_origem.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação;
-- a `version` nasce correta, não há reparo de ledger a fazer).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.explicacao_rejeicao_origem(
  p_candidatura_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_origem text;
BEGIN
  SELECT CASE
           WHEN c.status = 'rejeitado'
            AND c.motivo_rejeicao = 'knockout_automatico'
            AND c.opcao_knockout_id IS NOT NULL
             THEN 'automatica'
           WHEN c.status = 'rejeitado'
            AND c.motivo_rejeicao IS DISTINCT FROM 'knockout_automatico'
            AND NOT EXISTS (
                  SELECT 1
                    FROM public.decisao_final d
                   WHERE d.candidatura_id = c.id
                )
             THEN 'humana_triagem'
           ELSE NULL
         END
    INTO v_origem
    FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
   WHERE c.id = p_candidatura_id
     AND ca.user_id = auth.uid();

  -- Sem linha (não é sua, não existe, ou sem JWT) → v_origem continua NULL.
  RETURN v_origem;
END;
$$;

REVOKE ALL ON FUNCTION public.explicacao_rejeicao_origem(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.explicacao_rejeicao_origem(uuid) TO authenticated;

COMMENT ON FUNCTION public.explicacao_rejeicao_origem(uuid) IS
  'Phase 48 / JORN-22 / D-20: diz QUEM encerrou esta candidatura do proprio titular, '
  'quando nao ha decisao final — ''automatica'' (knockout), ''humana_triagem'' '
  '(rejeicao por uma pessoa via rejeitar_candidatura, sem linha em decisao_final) ou '
  'NULL. E so o discriminador: le motivo_rejeicao sem devolve-lo; nunca o motivo, o '
  'criterio, a opcao do knockout ou a justificativa do RH. NULL cobre «nao e sua» E '
  '«nao se aplica» (anti-oraculo de existencia). Candidatura com linha em decisao_final '
  'devolve NULL: a pagina a atende pelo caminho humano, com revisao. humana_triagem '
  'exige motivo diferente do do knockout — na duvida sobre quem decidiu, cala. Funcao '
  'NOVA, e nao redefinicao de explicacao_rejeicao_automatica: trocar o tipo de retorno '
  'exigiria DROP e quebraria o front publicado ate o deploy e o regen dos tipos. '
  'Own-row por candidatos.user_id=auth.uid(). anon sem EXECUTE (nomeado no REVOKE). '
  'NAO abre pedido de revisao para a triagem (D-20).';

-- Portão de auto-verificação: a função instalada tem a forma e o ACL decididos.
DO $$
DECLARE
  v_oid  oid := to_regprocedure('public.explicacao_rejeicao_origem(uuid)');
  v_p    record;
  v_def  text;
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'explicacao_rejeicao_origem(uuid) NAO foi instalada';
  END IF;

  SELECT p.prosecdef, p.provolatile, p.prorettype::regtype::text AS ret
    INTO v_p
    FROM pg_catalog.pg_proc p
   WHERE p.oid = v_oid;

  IF NOT v_p.prosecdef THEN
    RAISE EXCEPTION 'explicacao_rejeicao_origem instalada SEM SECURITY DEFINER';
  END IF;
  IF v_p.provolatile <> 's' THEN
    RAISE EXCEPTION 'explicacao_rejeicao_origem instalada com volatilidade % (esperado STABLE)', v_p.provolatile;
  END IF;
  IF v_p.ret <> 'text' THEN
    RAISE EXCEPTION 'explicacao_rejeicao_origem devolve % (esperado text)', v_p.ret;
  END IF;

  IF has_function_privilege('anon', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'explicacao_rejeicao_origem: anon ainda tem EXECUTE';
  END IF;
  IF NOT has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'explicacao_rejeicao_origem: authenticated sem EXECUTE';
  END IF;

  v_def := pg_get_functiondef(v_oid);
  IF position('auth.uid()' IN v_def) = 0 THEN
    RAISE EXCEPTION 'explicacao_rejeicao_origem instalada SEM o guard own-row';
  END IF;
  IF position('decisao_final' IN v_def) = 0 THEN
    RAISE EXCEPTION 'explicacao_rejeicao_origem instalada SEM a exclusao de decisao_final';
  END IF;

  -- A booleana antiga continua existindo (sem DROP): o front publicado a chama.
  IF to_regprocedure('public.explicacao_rejeicao_automatica(uuid)') IS NULL THEN
    RAISE EXCEPTION 'explicacao_rejeicao_automatica(uuid) sumiu — o front publicado depende dela';
  END IF;
END $$;
