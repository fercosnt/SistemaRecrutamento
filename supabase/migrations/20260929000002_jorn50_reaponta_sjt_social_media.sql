-- 20260929000002_jorn50_reaponta_sjt_social_media.sql
--
-- JORN-50 — a vaga ATIVA de Social Media aponta para o banco SJT do cargo errado.
--
-- O DEFEITO, medido em PROD em 2026-09-29:
--   `social-media-producao-captacao-conteudo` tem status `ativa` (aceitando candidatura) e
--   `testes_aplicaveis` traz {"cargo":"sdr-social-seller","teste":"work_sample_sjt",
--   "obrigatorio":true}. O cargo `sdr-social-seller` tem UM item, de cenario de vendas.
--   O peso do `work_sample_sjt` em `pesos_avaliacao` e 35 — o componente MAIS PESADO da
--   avaliacao, acima de entrevista (25), triagem (25) e redacao (15).
--   Ou seja: quem se candidata a produzir conteudo responde UMA pergunta de SDR, e isso
--   vira 35% do score. Um numero que PARECE avaliacao.
--
-- O banco certo ja existe: a migration 20260929000001 criou `social-media` com 7 itens
-- (6 multipla escolha + 1 caso aberto), escritos para esta funcao.
--
-- DANO: PROSPECTIVO, e isso foi MEDIDO, nao suposto.
--   `respostas_avaliacao` tem UMA linha de SJT no banco inteiro: `sjt_caso_aberto`, na vaga
--   de teste `teste-dentista-funil-e2e`, de 2026-06-26. NINGUEM respondeu pelo cargo errado.
--   Logo: nao ha dado de avaliacao a corrigir nem candidatura a reprocessar. E so
--   configuracao, e o conserto e barato porque chegou antes da primeira resposta.
--
-- ⚠ ESCOPO: SO a vaga de Social Media.
--   `consultor-relacionamento-pre-vendas` tambem aponta para `sdr-social-seller`, e esta
--   CORRETO — e vaga de pre-vendas, o cargo do banco e o dela. Nao tocar.
--
-- REVERSAO (valor exato de antes, capturado em 2026-09-29 antes do UPDATE):
--   {"cargo":"sdr-social-seller","teste":"work_sample_sjt","perguntas":[],
--    "customizado":false,"obrigatorio":true}
--   Para reverter, rodar este mesmo UPDATE trocando 'social-media' por 'sdr-social-seller'.
--
-- Muda APENAS a chave `cargo` do elemento `work_sample_sjt`. As demais chaves do elemento e
-- os outros cinco testes ficam intactos, e a ordem do array e preservada por WITH ORDINALITY.
-- Nao mexe em `pesos_avaliacao`, nem em `status`, nem em pergunta nenhuma.
--
-- Sem BEGIN/COMMIT (D-22).

UPDATE public.vagas v
SET testes_aplicaveis = (
      SELECT jsonb_agg(
               CASE WHEN elem->>'teste' = 'work_sample_sjt'
                    THEN elem || '{"cargo":"social-media"}'::jsonb
                    ELSE elem
               END
               ORDER BY ord
             )
      FROM jsonb_array_elements(v.testes_aplicaveis) WITH ORDINALITY AS t(elem, ord)
    ),
    updated_at = now()
WHERE v.slug = 'social-media-producao-captacao-conteudo'
  AND v.deleted_at IS NULL;
