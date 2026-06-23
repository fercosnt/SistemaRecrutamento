-- Phase 10 / TRIAGEM-02 fix — painel de triagem ordenável por score.
--
-- BUG: o painel ordenava `score_match` via `order(..., { referencedTable: 'analise' })`,
-- mas o PostgREST NÃO ordena as linhas-pai (candidaturas) por coluna de um recurso
-- EMBUTIDO — só ordena o array interno. Resultado: a lista voltava na ordem default
-- (sort por score nunca funcionou; pego no UAT 2026-06-22).
--
-- FIX: esta view achata `score_match` (+ campos da análise + candidato) em colunas
-- TOP-LEVEL, então `order('score_match')` ordena de verdade e `.range()` (paginação
-- server-side 20/página) continua correto. `security_invoker = true` preserva a RLS das
-- tabelas-base para o usuário RH (a view não tem RLS própria; delega às tabelas).
--
-- NOTA: aplicada em PROD via Supabase MCP `apply_migration` (mesmo padrão das Phases
-- 6/10/11). Este arquivo é o registro em git / source of truth.

create or replace view public.v_triagem_panel
with (security_invoker = true) as
select
  c.id,
  c.vaga_id,
  c.status,
  c.etapa_atual,
  c.created_at,
  c.curriculo_nome_original,
  c.deleted_at,
  ca.id            as candidato_id,
  ca.nome_completo as candidato_nome,
  a.score_match,
  a.pontos_fortes,
  a.gaps,
  a.flags,
  a.status         as analise_status
from public.candidaturas c
left join public.candidatos ca            on ca.id = c.candidato_id
left join public.analise_candidato_vaga a on a.candidatura_id = c.id;

grant select on public.v_triagem_panel to authenticated;
