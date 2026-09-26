-- =============================================================================
-- p49_fallback_forcado_liga.sql — LIGA a janela de fallback forçado (plano 49-18, Task 3)
-- =============================================================================
-- ⚠⚠ ESTE ARQUIVO ESCREVE EM PRODUÇÃO. Só rodar COM APROVAÇÃO EXPLÍCITA do operador,
--    e com o `_desliga` rodado IMEDIATAMENTE depois de o comparativo de prova sair.
--
--   node p46apply.cjs run supabase/tests/p49_fallback_forcado_liga.sql
--   ... o operador gera UM comparativo de 2–4 candidaturas de teste, exporta o PDF,
--       abre o log de IA do admin ...
--   node p46apply.cjs run supabase/tests/p49_fallback_forcado_desliga.sql
--
-- ── O QUE ELE FAZ, E POR QUE ASSIM
--
-- Troca o `model_id` do prompt ATIVO de `comparative_ranking` por um identificador
-- INEXISTENTE e explícito. A chamada ao Anthropic falha com erro de API, o `ai-client`
-- classifica a causa e cai para o fallback OpenAI — que é justamente o caminho que o
-- D-27 manda ver acontecer de verdade, uma vez, em PROD.
--
--   · Por que NÃO forçar por timeout: o teto por chamada é herdado pelo fallback (ele usa
--     o mesmo `max_tokens`/janela do prompt), então um timeout derrubaria os DOIS e não
--     haveria fallback para observar.
--   · Por que `model_id` pode ser trocado: o `prevent_published_prompt_edit` não protege
--     esta coluna (49-18 RESEARCH, Correção 6). Isso é uma FOLGA do guard, não uma
--     permissão — e é a razão de este script existir com guarda própria.
--
-- ── GUARDA DE VALOR ESPERADO (T-49-18-01)
--
-- O UPDATE só acontece se o `model_id` ativo for EXATAMENTE o valor medido no baseline e
-- registrado no `49-PROVA-PROD.md`. Se alguém (ou algum plano) tiver mudado o modelo do
-- comparativo entre o baseline e agora, este script ABORTA em vez de gravar — porque o
-- `_desliga` restaura o valor ESPERADO, e restaurar o valor errado é a forma silenciosa
-- de deixar a configuração trocada para sempre. É o mesmo raciocínio do portão de md5 da
-- D-46: só entra no UPDATE a linha cujo valor bate byte a byte com o esperado.
--
-- ── EFEITO COLATERAL ACEITO (T-49-18-04, decisão do operador)
--
-- Durante a janela, um comparativo REAL de qualquer RH também sai do modelo de
-- contingência. A janela é de minutos, aprovada no momento, e o resultado sai MARCADO
-- como contingência na tela, no PDF e no log — que é exatamente o contrato que se está
-- provando.
--
-- ── SAÍDA
--
-- Imprime antes/depois. A Management API não devolve `RAISE NOTICE`, então os dois valores
-- viajam por GUC de sessão e saem no SELECT final — que é a ÚLTIMA instrução da
-- requisição e, por isso, o resultado que o `p46apply` mostra. Uma requisição inteira é
-- UMA transação: se o `DO` abortar, nada é gravado e o SELECT não roda.
-- =============================================================================

DO $$
DECLARE
  -- ⚠ O ESPERADO É DECLARADO UMA VEZ SÓ, e o comparador e a mensagem leem daqui —
  --   uma mensagem que contradiz o portão que ela explica faz alguém consertar a coisa
  --   errada (a lição do `p49_12_pos_estado.sql`).
  c_esperado constant text := 'claude-sonnet-4-6';  -- baseline medido em 2026-09-26 (49-PROVA-PROD.md)
  c_forcado  constant text := 'claude-inexistente-p49-fallback-forcado';

  v_antes  text;
  v_depois text;
  v_n      int;
BEGIN
  SELECT model_id INTO v_antes
    FROM public.prompt_versions
   WHERE call_type = 'comparative_ranking' AND is_active;

  IF v_antes IS NULL THEN
    RAISE EXCEPTION 'P49 FB LIGA ABORTADO: nao ha prompt ATIVO de comparative_ranking (ou o model_id dele e NULL). Nada foi gravado.';
  END IF;

  IF v_antes = c_forcado THEN
    RAISE EXCEPTION 'P49 FB LIGA ABORTADO: o model_id ativo JA E o identificador forcado (%). A janela ja esta aberta — rode o _desliga antes de qualquer outra coisa.', c_forcado;
  END IF;

  IF v_antes <> c_esperado THEN
    RAISE EXCEPTION 'P49 FB LIGA ABORTADO: o model_id ativo de comparative_ranking e "%", e o esperado (baseline do 49-PROVA-PROD.md) e "%". O _desliga restauraria o valor ESPERADO, nao o atual — abrir a janela agora deixaria a configuracao trocada. Re-medir o baseline e decidir com o operador. Nada foi gravado.', v_antes, c_esperado;
  END IF;

  UPDATE public.prompt_versions
     SET model_id = c_forcado
   WHERE call_type = 'comparative_ranking' AND is_active;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'P49 FB LIGA ABORTADO: o UPDATE tocou % linha(s), esperado exatamente 1. A transacao inteira foi desfeita.', v_n;
  END IF;

  SELECT model_id INTO v_depois
    FROM public.prompt_versions
   WHERE call_type = 'comparative_ranking' AND is_active;

  IF v_depois IS DISTINCT FROM c_forcado THEN
    RAISE EXCEPTION 'P49 FB LIGA ABORTADO: depois do UPDATE o model_id ativo e "%", esperado "%". Desfeito.', v_depois, c_forcado;
  END IF;

  PERFORM set_config('p49.fb_antes',  v_antes,  false);
  PERFORM set_config('p49.fb_depois', v_depois, false);
END
$$;

SELECT 'JANELA DE FALLBACK FORCADO ABERTA'                  AS estado,
       current_setting('p49.fb_antes')                      AS model_id_antes,
       current_setting('p49.fb_depois')                     AS model_id_depois,
       (SELECT max_tokens FROM public.prompt_versions
         WHERE call_type = 'comparative_ranking' AND is_active) AS max_tokens_intocado,
       'RODE supabase/tests/p49_fallback_forcado_desliga.sql ASSIM QUE O COMPARATIVO SAIR' AS proximo_passo;
