-- =============================================================================
-- p49_fallback_forcado_desliga.sql — FECHA a janela de fallback forçado (49-18, Task 3)
-- =============================================================================
-- ⚠⚠ ESTE ARQUIVO ESCREVE EM PRODUÇÃO — e é o que devolve o comparativo ao modelo
--    configurado. Rodar IMEDIATAMENTE depois de o comparativo de prova sair:
--
--   node p46apply.cjs run supabase/tests/p49_fallback_forcado_desliga.sql
--
-- ── GUARDA DE VALOR ESPERADO (T-49-18-01)
--
-- Só restaura se o `model_id` ativo for EXATAMENTE o identificador forçado. Isto é o que
-- impede o script de sobrescrever uma troca legítima de modelo feita por outra pessoa
-- depois da janela: ele restaura, ele não "conserta o que der".
--
-- ── E SE ESTE SCRIPT ABORTAR COM A JANELA ABERTA?
--
-- O caso perigoso é ele abortar porque o valor ativo NÃO é o forçado — aí a janela já está
-- fechada e não há nada a fazer (a mensagem diz o valor encontrado). O caso a NÃO ignorar é
-- o inverso: se o `model_id` ativo continuar sendo o forçado depois de uma tentativa, o
-- comparativo segue saindo do modelo de contingência em PRODUÇÃO, para candidatos reais.
-- A conferência obrigatória é a coluna `p28_teto_comparativo_3600` do `p49_prova_prod.sql`,
-- que sai `false` exatamente nesse estado — ela é o portão, não este arquivo.
-- =============================================================================

DO $$
DECLARE
  -- Mesmo par de constantes do `_liga`, declarado UMA vez e lido pelo comparador E pela
  -- mensagem. O `c_original` é o baseline medido em 2026-09-26 e registrado no
  -- `49-PROVA-PROD.md` — é ele que o `_liga` exigiu para poder abrir a janela, então
  -- restaurá-lo devolve o estado exato de antes.
  c_forcado  constant text := 'claude-inexistente-p49-fallback-forcado';
  c_original constant text := 'claude-sonnet-4-6';

  v_antes  text;
  v_depois text;
  v_n      int;
BEGIN
  SELECT model_id INTO v_antes
    FROM public.prompt_versions
   WHERE call_type = 'comparative_ranking' AND is_active;

  IF v_antes IS NULL THEN
    RAISE EXCEPTION 'P49 FB DESLIGA ABORTADO: nao ha prompt ATIVO de comparative_ranking (ou o model_id dele e NULL). ⚠ CONFIRA A MAO em que estado o comparativo esta.';
  END IF;

  IF v_antes <> c_forcado THEN
    RAISE EXCEPTION 'P49 FB DESLIGA ABORTADO: o model_id ativo e "%", e nao o identificador forcado "%". Ou a janela nunca foi aberta, ou ja foi fechada, ou alguem trocou o modelo no meio — nao vou sobrescrever uma troca que nao foi minha. Nada foi gravado.', v_antes, c_forcado;
  END IF;

  UPDATE public.prompt_versions
     SET model_id = c_original
   WHERE call_type = 'comparative_ranking' AND is_active;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P49 FB DESLIGA ABORTADO: o UPDATE tocou % linha(s), esperado exatamente 1. A transacao inteira foi desfeita — ⚠ A JANELA CONTINUA ABERTA.', v_n;
  END IF;

  SELECT model_id INTO v_depois
    FROM public.prompt_versions
   WHERE call_type = 'comparative_ranking' AND is_active;

  IF v_depois IS DISTINCT FROM c_original THEN
    RAISE EXCEPTION 'P49 FB DESLIGA ABORTADO: depois do UPDATE o model_id ativo e "%", esperado "%". Desfeito — ⚠ A JANELA CONTINUA ABERTA.', v_depois, c_original;
  END IF;

  PERFORM set_config('p49.fb_antes',  v_antes,  false);
  PERFORM set_config('p49.fb_depois', v_depois, false);
END
$$;

SELECT 'JANELA DE FALLBACK FORCADO FECHADA'                 AS estado,
       current_setting('p49.fb_antes')                      AS model_id_antes,
       current_setting('p49.fb_depois')                     AS model_id_depois,
       (current_setting('p49.fb_depois') = 'claude-sonnet-4-6') AS restaurado_ao_baseline,
       (SELECT max_tokens FROM public.prompt_versions
         WHERE call_type = 'comparative_ranking' AND is_active) AS max_tokens_intocado,
       'CONFIRA p28_teto_comparativo_3600 em p49_prova_prod.sql'  AS portao_final;
