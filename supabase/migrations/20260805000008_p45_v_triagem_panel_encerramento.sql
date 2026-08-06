-- =============================================================================
-- Phase 45 / Plano 45-09 — Invariante 9 (o silencio tambem e proibido)
-- `v_triagem_panel` passa a EXPOR `encerrada_a_pedido_em`.
-- =============================================================================
--
-- Requirement:          ERASE-05 (a metade de LEGIBILIDADE, lado RH)
-- Decisao de origem:    45-UI-SPEC Invariante 9 · D-45-13 (coluna aditiva)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-09, Task 3
--
-- -----------------------------------------------------------------------------
-- (1) ESCOPO NEGATIVO, EM UMA LINHA
-- -----------------------------------------------------------------------------
-- **UMA COLUNA A MAIS NUMA VIEW DE LEITURA.** Zero DDL sobre tabela, zero escrita,
-- zero policy, zero grant novo. A view ja e `security_invoker = true`, entao ela
-- continua delegando a RLS as tabelas-base — nenhuma linha nova fica visivel para
-- ninguem.
--
-- -----------------------------------------------------------------------------
-- (2) ⚠ POR QUE ESTE ARQUIVO EXISTE — DESVIO D-45-09-04, E ELE E BLOQUEANTE
-- -----------------------------------------------------------------------------
-- O plano 45-09 manda acrescentar `encerrada_a_pedido_em` a allowlist de colunas do
-- `select` de `triagemService.ts`. **Mas aquele service NAO le `candidaturas`: ele
-- le a VIEW `v_triagem_panel`** (`20260623000001`), e a view NAO expoe a coluna.
--
-- Sem este arquivo, o `select` da allowlist pede uma coluna inexistente e o
-- PostgREST devolve erro **para a consulta inteira**. O efeito nao seria "o estado
-- nao aparece": seria **o painel de triagem inteiro parar de carregar** — um modo de
-- falha PIOR que o silencio que a Invariante 9 proibe, porque some com a lista toda
-- em vez de com uma palavra.
--
-- ⚠ E o teste de unidade NAO pegaria: ele monta `rows` a mao e nunca toca PostgREST.
-- Verde no CI, painel quebrado em producao — a classe de defeito que esta fase
-- inteira existe para nao repetir.
--
-- -----------------------------------------------------------------------------
-- (3) ⚠ POR QUE ESTA MUDANCA NAO ENTROU NA `20260805000007`
-- -----------------------------------------------------------------------------
-- Aquele arquivo tem ORDEM DE ENTREGA OBRIGATORIA: a EF `notificar-rh` deployada
-- ANTES, senao o trigger dispara contra um endpoint que nao conhece o evento e o
-- aviso some num 404 silenciosamente droppado (`net.http_post` e at-most-once).
--
-- Esta view NAO tem dependencia nenhuma: nem da EF, nem do trigger, nem do CHECK.
-- Acopla-la aquele arquivo faria a LEGIBILIDADE no RH — que e metade da Invariante
-- 9 e nao depende de e-mail nenhum — ficar refem do deploy de uma Edge Function.
-- Arquivo separado, aplicavel em qualquer ordem.
--
-- -----------------------------------------------------------------------------
-- (4) PROTOCOLO DE APPLY
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR. E o plano
-- **45-11** que aplica; o 45-09 apenas AUTORA. `supabase db push` segue PROIBIDO.
-- Sem wrapper `BEGIN;`/`COMMIT;` (CLAUDE.md · SQLSTATE 42601).
--
-- ⚠ REPARO OBRIGATORIO DO LEDGER, logo apos o apply:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000008'
--    WHERE name LIKE '%p45_v_triagem_panel_encerramento%';
--
-- -----------------------------------------------------------------------------
-- (5) ⚠ A COLUNA NOVA VAI NO **FIM**, E ISSO E EXIGENCIA DO POSTGRES
-- -----------------------------------------------------------------------------
-- `CREATE OR REPLACE VIEW` so aceita ACRESCENTAR colunas ao FIM da lista: renomear,
-- reordenar, remover ou trocar o tipo de uma coluna existente faz o comando falhar
-- ("cannot change name of view column"). As 13 colunas vivas abaixo estao na ORDEM
-- EXATA de `20260623000001:18-32`, transcritas sem uma virgula fora do lugar, e
-- `encerrada_a_pedido_em` entra como a 14a.
--
-- ⚠ `deleted_at` CONTINUA na view e CONTINUA sendo filtrada pelo service. Ela nao e
-- redundante com a coluna nova — sao fatos DIFERENTES: `deleted_at` e remocao;
-- `encerrada_a_pedido_em` e encerramento a pedido do titular, que e ADITIVO
-- justamente para que a linha NAO suma das cinco leituras de RH que filtram por
-- `deleted_at` (D-45-13). Confundi-las reintroduziria o defeito que a coluna existe
-- para evitar.
-- =============================================================================

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
  a.status         as analise_status,
  c.encerrada_a_pedido_em
from public.candidaturas c
left join public.candidatos ca            on ca.id = c.candidato_id
left join public.analise_candidato_vaga a on a.candidatura_id = c.id;

-- `CREATE OR REPLACE VIEW` PRESERVA os grants existentes; o grant abaixo e
-- reafirmacao explicita, no idioma do arquivo original (`20260623000001:37`).
grant select on public.v_triagem_panel to authenticated;

-- Auto-verificacao: falha ALTO se a coluna nao chegou a view. Sem ela, o `select`
-- da allowlist do `triagemService` derruba o painel de triagem INTEIRO com erro de
-- PostgREST — e nenhum teste de unidade daquele componente perceberia, porque eles
-- montam as linhas a mao.
do $verifica_view_encerramento$
declare
  v_tem boolean;
begin
  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'v_triagem_panel'
       and column_name  = 'encerrada_a_pedido_em'
  ) into v_tem;

  if not v_tem then
    raise exception 'P45-09: v_triagem_panel NAO expoe encerrada_a_pedido_em — o select da allowlist do triagemService pediria coluna inexistente e o PostgREST derrubaria o painel de triagem INTEIRO (modo de falha PIOR que o silencio da Invariante 9)';
  end if;

  -- A outra metade: `deleted_at` nao pode ter sumido na transcricao, senao o
  -- `.is('deleted_at', null)` de CINCO servicos de RH quebra de uma vez.
  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'v_triagem_panel'
       and column_name  = 'deleted_at'
  ) into v_tem;

  if not v_tem then
    raise exception 'P45-09: v_triagem_panel PERDEU deleted_at na transcricao — cinco leituras de RH filtram por ela';
  end if;

  raise notice 'P45-09 OK: v_triagem_panel expoe encerrada_a_pedido_em e preserva deleted_at';
end
$verifica_view_encerramento$;

comment on view public.v_triagem_panel is
  'Painel de triagem RH (TRIAGEM-02), security_invoker=true — delega a RLS as '
  'tabelas-base. Phase 45 / 45-09: expoe candidaturas.encerrada_a_pedido_em para que '
  'a candidatura encerrada a pedido do titular seja LEGIVEL no funil (Invariante 9 da '
  '45-UI-SPEC). O encerramento e ADITIVO e NAO usa deleted_at de proposito: cinco '
  'leituras de RH filtram .is(deleted_at, null), e um soft delete faria a candidatura '
  'sumir de todas elas em silencio — um recrutador agendando entrevista com quem saiu. '
  'As duas colunas coexistem porque sao fatos diferentes: deleted_at e remocao, '
  'encerrada_a_pedido_em e encerramento a pedido.';
