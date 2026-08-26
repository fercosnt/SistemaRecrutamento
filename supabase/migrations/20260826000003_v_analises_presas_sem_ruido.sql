-- =============================================================================
-- Migration: v_analises_presas deixa de acusar o que ninguém vai consertar
-- Date: 2026-08-26
-- =============================================================================
--
-- A view nasceu na 20260826000002 e, ao ser consultada pela primeira vez, devolveu
-- 13 linhas — TODAS de vagas `arquivada`, 8 delas fixtures de teste da Phase 46,
-- paradas há 915 dias. Nenhuma é acionável: ninguém vai analisar candidatura de
-- vaga arquivada.
--
-- ⚠ ISSO IMPORTA MAIS DO QUE PARECE. Um alerta que sempre mostra as mesmas linhas
-- irrelevantes é um alerta que ninguém abre, e quando finalmente aparecer uma linha
-- REAL ela vai estar no meio de treze que aprenderam a ser ignoradas. Ruído
-- constante não é inofensivo: ele desativa o sinal. Uma view de vigilância que
-- nunca está vazia em estado saudável não vigia nada.
--
-- Este arquivo restringe ao que é acionável HOJE:
--   · vaga `ativa` ou `rascunho` — arquivada/inativa não recebe candidato novo;
--   · candidatura que não está `finalizado` nem `rejeitado` — quem saiu do funil
--     (knockout inclusive) não precisa de score.
--
-- Em estado saudável a view fica VAZIA, e é isso que a torna útil: qualquer linha
-- que aparecer merece um olhar.
--
-- Sem BEGIN/COMMIT (D-22).
-- =============================================================================

CREATE OR REPLACE VIEW public.v_analises_presas AS
SELECT
  c.id                AS candidatura_id,
  c.vaga_id,
  v.slug              AS vaga_slug,
  c.data_candidatura,
  COALESCE(a.status, 'sem_linha') AS situacao,
  a.erro,
  a.updated_at        AS analise_atualizada_em,
  now() - COALESCE(a.updated_at, c.data_candidatura) AS parada_ha
FROM public.candidaturas c
JOIN public.vagas v ON v.id = c.vaga_id
LEFT JOIN public.analise_candidato_vaga a ON a.candidatura_id = c.id
WHERE c.deleted_at IS NULL
  AND v.deleted_at IS NULL
  -- So vaga que ainda recebe gente. Arquivada/inativa nao gera trabalho.
  AND v.status IN ('ativa', 'rascunho')
  -- Quem ja saiu do funil nao precisa de score.
  AND c.status NOT IN ('finalizado', 'rejeitado')
  AND (
    (a.status = 'pendente' AND a.updated_at < now() - interval '10 minutes')
    OR (a.id IS NULL AND c.data_candidatura < now() - interval '10 minutes')
  );

COMMENT ON VIEW public.v_analises_presas IS
  'Candidaturas ACIONAVEIS cuja analise de IA comecou e nao terminou (pendente ha '
  '>10 min) ou nunca comecou (sem linha). Restrita a vaga ativa/rascunho e '
  'candidatura ainda no funil — em estado saudavel fica VAZIA, e e isso que a faz '
  'servir de sinal. Existe porque o dispatch nao serve: net.http_post registrava '
  'timeout em toda execucao, inclusive nas bem-sucedidas. Ver 20260826000002.';

REVOKE ALL ON public.v_analises_presas FROM PUBLIC, anon;
GRANT SELECT ON public.v_analises_presas TO authenticated;
