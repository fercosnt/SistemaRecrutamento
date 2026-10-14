-- 20261014000001_mc3_videomaker_encurtado.sql
--
-- POR QUE ESTA MIGRATION EXISTE
--
-- (D-34) A alternativa certa do MC3 do cargo `videomaker-storymaker` era 40% mais longa que a
-- media das erradas: 128 caracteres contra 91. Medido em 2026-10-13, era o UNICO dos 18 itens
-- ativos dos tres cargos de marketing fora do criterio -- os outros 17 ficaram entre 0,92 e 1,07.
-- Comprimento e pista independente de posicao: embaralhar as opcoes nao resolve, e o item passa a
-- medir traquejo em prova em vez de julgamento.
--
-- O item foi reescrito em 2026-10-12 (a troca «grava e pergunta depois», decisao do operador) e o
-- medidor de comprimento NAO foi rodado de novo depois da reescrita. Este arquivo conserta isso.
--
--   antes: "Grava, e assim que o momento passa pergunta a ele se pode publicar -- ou pede ao Dr.
--           que pergunte. Nada vai ao ar sem o sim dele."            (128 car · razao 1,41)
--   agora: "Grava e pergunta a ele depois se pode publicar -- ou pede ao Dr. que pergunte. Nada
--           vai ao ar sem o sim."                                    (103 car · razao 1,14)
--
-- A decisao que o item mede NAO muda: captar e perguntar depois continua sendo a resposta de peso
-- 4, e publicar sem perguntar continua sendo a de peso 0.
--
-- RETIRA, nao apaga (mesmo padrao da 20261011000003): o item antigo vai a `status='retired'` e as
-- respostas gravadas continuam apontando para linhas existentes. Medido antes do apply: ZERO
-- respostas de SJT nas tres vagas novas -- nenhum candidato foi avaliado pelo item antigo.
--
-- A `ordem` das alternativas e permutacao deterministica semeada pelo content_hash (D-37), pela
-- MESMA funcao `_permutacao` de `scripts/geradores/sjt_texto.py` que gerou o banco no ar -- nunca
-- uma copia. A posicao da certa foi conferida contra os 5 itens que FICAM para nao estourar o teto
-- de 3 itens do cargo na mesma posicao.
--
-- ⚠ SQL GERADO, nao transcrito: o texto sai de docs/vagas/videomaker-storymaker.md pelo parser
-- compartilhado (`sjt_texto._item` via `itens_do_doc` do gen-104). Sem BEGIN/COMMIT (D-22).

UPDATE public.perguntas
   SET status = 'retired'
 WHERE cargo = 'videomaker-storymaker'
   AND formato = 'mc'
   AND status = 'active'
   AND content_hash LIKE 'a635603b24%';

WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', 'videomaker-storymaker', $dim$Discrição + Leitura de ambiente$dim$, $cen$Um paciente emocionado agradece o Dr. no corredor, chorando, dizendo que voltou a sorrir depois de 10 anos. É o melhor material que você viu no mês. Ele não sabe que você está por perto, e não há câmera à vista.$cen$, 'mc', 4, NULL, '1ee603cf3b2e9fc69cef3554a7c30171ddab01f3fe084c00b44627b8a27f08d1', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '1ee603cf3b2e9fc69cef3554a7c30171ddab01f3fe084c00b44627b8a27f08d1')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem
FROM novo, (VALUES
    ($o0$Grava e pergunta a ele depois se pode publicar — ou pede ao Dr. que pergunte. Nada vai ao ar sem o sim.$o0$, 'fortemente_pontua'::enum_tag_opcao, 4, 1),
    ($o1$Grava e leva à Coordenação, para decidirem juntos se vale pedir a autorização depois.$o1$, 'pontua'::enum_tag_opcao, 2, 4),
    ($o2$Não grava, e depois pergunta se ele toparia contar de novo em vídeo, com termo assinado.$o2$, 'neutro'::enum_tag_opcao, 1, 2),
    ($o3$Grava e publica em stories — é depoimento espontâneo e verdadeiro, e ele ficaria feliz de aparecer.$o3$, 'atencao'::enum_tag_opcao, 0, 3)
) AS v(texto, tag, peso, ordem);
