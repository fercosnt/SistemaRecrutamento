-- =============================================================================
-- Phase 37 — Config de SLA por etapa do funil (TIMELINE-01)
-- =============================================================================
-- Requisito coberto por este arquivo:
--   TIMELINE-01 — config estática, não-PII, de prazo + rótulo por etapa do
--                 funil. Leitura pública por design (a TIMELINE-02 / P40 lê
--                 esta tabela do painel do candidato); escrita só por migration.
--
-- -----------------------------------------------------------------------------
-- ⚠ PROVENIÊNCIA — LEIA ANTES DE FAZER QUALQUER COISA COM ESTE ARQUIVO
-- -----------------------------------------------------------------------------
-- Este arquivo é uma RECONSTRUÇÃO POR ENGENHARIA REVERSA do schema que já está
-- VIVO em produção. Ele NÃO foi o arquivo que rodou: a version `20260721000002`
-- já consta em `supabase_migrations.schema_migrations` desde 2026-07-21, aplicada
-- por uma sessão anterior cujos arquivos nunca chegaram ao repositório. O drift
-- PROD→repo foi descoberto em 2026-07-22, durante o reconcile do ledger da P36.
--
-- ⛔ NÃO APLICAR. Nem `apply_migration`, nem `supabase db push`. A proteção
--    contra re-execução é o próprio ledger, que já contém esta version. Este
--    arquivo existe para que um `supabase db reset` / rebuild de ambiente
--    reproduza a tabela E O SEED em vez de perdê-los silenciosamente.
--
-- O DDL abaixo foi transcrito do catálogo Postgres vivo, capturado pelo Plano
-- 37-01 em `.planning/phases/37-…/37-SCHEMA-VIVO.md`. Os nomes de objeto são os
-- REAIS — `ck_sla_prazo_consistente`, `sla_public_read`, `config_sla_etapa_pkey`.
--
-- Sem `CREATE TABLE IF NOT EXISTS`, sem `CREATE OR REPLACE`, sem `DROP … IF
-- EXISTS`: contra um banco que já tem a tabela este arquivo DEVE falhar alto.
--
-- A tabela está seedada 8/8 em PROD com rótulos pt-BR corretos. O seed abaixo é
-- `ON CONFLICT (etapa) DO NOTHING` — jamais um upsert: re-seedar sobrescreveria
-- em produção um texto que já está certo (decisão travada no 37-CONTEXT). Os
-- rótulos são transcritos byte-a-byte, com a acentuação preservada; corrigir
-- redação ou acentuação aqui É drift, não melhoria — o texto vivo é o texto.
--
-- A fidelidade deste arquivo ao catálogo é provada por execução, não por leitura:
-- `supabase/tests/p37_fidelidade_schema_smoke.sql`.
--
-- NO explicit BEGIN;/COMMIT; wrapper (D-22, CLAUDE.md §Migrations — the CLI
-- driver wraps each migration itself).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1 · Tabela (5 colunas, na ordem de `ordinal_position` do catálogo)
-- ---------------------------------------------------------------------------
-- `public.etapa_processo` é PRÉ-EXISTENTE (8 labels) — apenas referenciado aqui,
-- nunca re-declarado. A PK É a etapa: no máximo um rótulo por etapa.
-- Os nomes `config_sla_etapa_pkey`, `config_sla_etapa_prazo_unidade_check` e
-- `config_sla_etapa_prazo_valor_check` são os defaults determinísticos do
-- Postgres para as declarações inline abaixo — reproduzidos por um rebuild.
-- `ck_sla_prazo_consistente` não é um nome default, por isso é explícito: ele
-- amarra prazo_valor e prazo_unidade como um par tudo-ou-nada (a etapa terminal
-- `aprovado` tem os DOIS nulos; nenhuma etapa pode ter valor sem unidade).
CREATE TABLE public.config_sla_etapa (
  etapa            public.etapa_processo NOT NULL PRIMARY KEY,
  prazo_valor      integer               CHECK (prazo_valor IS NULL OR prazo_valor > 0),
  prazo_unidade    text                  CHECK (prazo_unidade IS NULL OR prazo_unidade IN ('dias_uteis', 'dias_corridos', 'horas')),
  rotulo_candidato text                  NOT NULL,
  atualizado_em    timestamptz           NOT NULL DEFAULT now(),
  CONSTRAINT ck_sla_prazo_consistente CHECK ((prazo_valor IS NULL) = (prazo_unidade IS NULL))
);

-- ---------------------------------------------------------------------------
-- 2 · RLS — leitura pública por design (TIMELINE-01 / TIMELINE-02)
-- ---------------------------------------------------------------------------
-- Uma policy, `SELECT`, `{anon, authenticated}`, `USING (true)`. O painel do
-- candidato (P40) lê esta tabela sem autenticação privilegiada. Não há policy de
-- escrita: só `service_role` (bypassa RLS) e migrations alteram o conteúdo.
-- ⚠ INVARIANTE PARA ALTERAÇÕES FUTURAS: esta tabela é config estática não-PII.
--   Adicionar aqui qualquer coluna com dado de pessoa vazaria por `anon`. Dado
--   de candidato pertence a outra tabela, atrás de RLS escopada.
ALTER TABLE public.config_sla_etapa ENABLE ROW LEVEL SECURITY;

CREATE POLICY sla_public_read ON public.config_sla_etapa
  FOR SELECT TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 3 · COMMENT (transcrito VERBATIM do catálogo vivo — seção G do dump)
-- ---------------------------------------------------------------------------
-- Glosa pt-BR do que o comentário vivo diz, para quem lê o repo:
--   config estática non-PII por etapa do funil · public-read por design
--   (TIMELINE-01/TIMELINE-02: o painel do candidato lê sem privilégio) ·
--   `rotulo_candidato` é texto voltado AO CANDIDATO e é sempre enquadrado como
--   ESTIMATIVA, nunca como countdown — o produto não promete relógio · a etapa
--   `referencias` foi omitida porque não existe como valor do enum vivo · a
--   etapa `aprovado` tem prazo NULL por ser terminal-positiva.
-- O texto do COMMENT abaixo NÃO é reescrito para pt-BR: ele é o que está no
-- catálogo, e alterá-lo produziria divergência repo↔PROD.
COMMENT ON TABLE public.config_sla_etapa IS
  'Phase 37 / TIMELINE-01: static non-PII SLA config per funnel etapa. Public-read; write only via migration. Seeded from PRD §5.1.1, consumed by P40 candidate timeline (ESTIMATE, never countdown). ''referencias'' omitted (no live enum value); ''aprovado'' NULL prazo (terminal-positive).';

-- ---------------------------------------------------------------------------
-- 4 · Seed — 8/8 etapas (seção J do dump, transcrito literalmente)
-- ---------------------------------------------------------------------------
-- `DO NOTHING` (nunca `DO UPDATE`): num rebuild parcialmente seedado o INSERT
-- não quebra, e contra PROD ele é um no-op — o texto vivo nunca é sobrescrito.
-- `atualizado_em` fica FORA do INSERT de propósito: o default `now()` age.
INSERT INTO public.config_sla_etapa (etapa, prazo_valor, prazo_unidade, rotulo_candidato) VALUES
  ('inscricao',             48,   'horas',         'Inscrição recebida — retorno da triagem em até 48 horas.'),
  ('triagem',               48,   'horas',         'Em triagem — retorno em até 48 horas.'),
  ('avaliacao_assincrona',  7,    'dias_corridos', 'Avaliação liberada — conclua em até 7 dias corridos.'),
  ('entrevista_online',     7,    'dias_uteis',    'Entrevista online — agendamento em até 7 dias úteis.'),
  ('entrevista_presencial', 7,    'dias_uteis',    'Entrevista presencial — agendamento em até 7 dias úteis.'),
  ('decisao_final',         3,    'dias_uteis',    'Em decisão final — resposta em até 3 dias úteis.'),
  ('aprovado',              NULL, NULL,            'Parabéns! Você foi aprovado(a). Nossa equipe entrará em contato com os próximos passos.'),
  ('rejeitado',             24,   'horas',         'Processo encerrado — retorno enviado em até 24 horas.')
ON CONFLICT (etapa) DO NOTHING;
