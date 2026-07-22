-- =============================================================================
-- Phase 37 — Ledger de notificações (LEDGER-01 + LEDGER-02 + LEDGER-03)
-- =============================================================================
-- Requisitos cobertos por este arquivo:
--   LEDGER-01 — audit trail: uma linha por despacho de notificação, com o estado
--               do provedor (status/provider_message_id) e a trilha de retry.
--   LEDGER-02 — idempotência durável: `uq_notif_dedupe UNIQUE (dedupe_key)`.
--   LEDGER-03 — RLS: RH vaga-scoped via join-through-candidaturas
--               (`rh_le_notificacoes`) + candidato-DENY por default-deny
--               (NÃO existe policy que case para o role `candidato`, e não há
--               policy de INSERT/UPDATE — só `service_role`, que bypassa RLS,
--               escreve; correto para a Edge Function da P38).
--
-- -----------------------------------------------------------------------------
-- ⚠ PROVENIÊNCIA — LEIA ANTES DE FAZER QUALQUER COISA COM ESTE ARQUIVO
-- -----------------------------------------------------------------------------
-- Este arquivo é uma RECONSTRUÇÃO POR ENGENHARIA REVERSA do schema que já está
-- VIVO em produção. Ele NÃO foi o arquivo que rodou: a version `20260721000001`
-- já consta em `supabase_migrations.schema_migrations` desde 2026-07-21, aplicada
-- por uma sessão anterior cujos arquivos nunca chegaram ao repositório. O drift
-- PROD→repo foi descoberto em 2026-07-22, durante o reconcile do ledger da P36.
--
-- ⛔ NÃO APLICAR. Nem `apply_migration`, nem `supabase db push`. A proteção
--    contra re-execução é o próprio ledger, que já contém esta version. Este
--    arquivo existe para que um `supabase db reset` / rebuild de ambiente
--    reproduza a tabela em vez de perdê-la silenciosamente.
--
-- O DDL abaixo foi transcrito do catálogo Postgres vivo, capturado pelo Plano
-- 37-01 em `.planning/phases/37-…/37-SCHEMA-VIVO.md` (seções A colunas, B
-- constraints, C índices, D policies, E RLS, F enums, G COMMENTs, H GRANTs).
-- Os nomes de objeto são os REAIS — `uq_notif_dedupe`, `rh_le_notificacoes`,
-- `idx_notif_retry`, `idx_notif_provider_msg`, `idx_notif_candidatura`. Inventar
-- nome aqui faria o drift voltar pela porta dos fundos num rebuild futuro.
--
-- Sem `CREATE TABLE IF NOT EXISTS`, sem `CREATE OR REPLACE`, sem `DROP … IF
-- EXISTS`: contra um banco que já tem a tabela este arquivo DEVE falhar alto.
-- Mascarar divergência é exatamente o que produziu este drift.
--
-- As lacunas descobertas DEPOIS deste estado — as colunas de auditoria do modo
-- teste (`destinatario_original`, `modo`) e a função/trigger `tocar_atualizado_em`
-- que descongela `atualizado_em` — NÃO entram aqui. Elas vivem exclusivamente na
-- migration ADITIVA `20260722000002` (Plano 37-03). Editar um arquivo que já
-- consta no ledger seria mentira histórica.
--
-- A fidelidade deste arquivo ao catálogo é provada por execução, não por leitura:
-- `supabase/tests/p37_fidelidade_schema_smoke.sql`.
--
-- NO explicit BEGIN;/COMMIT; wrapper (D-22, CLAUDE.md §Migrations — the CLI
-- driver wraps each migration itself).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1 · Enum de status do despacho (seção F do dump, ordem de `enumsortorder`)
-- ---------------------------------------------------------------------------
-- `public.etapa_processo` é PRÉ-EXISTENTE (8 labels) e é apenas REFERENCIADO
-- por 20260721000002_config_sla_etapa.sql — nunca re-declarado aqui.
CREATE TYPE public.status_notificacao AS ENUM (
  'pendente',
  'enviado',
  'entregue',
  'falhou',
  'bounce',
  'reclamado'
);

-- ---------------------------------------------------------------------------
-- 2 · Tabela (16 colunas, na ordem de `ordinal_position` do catálogo)
-- ---------------------------------------------------------------------------
-- Os nomes das constraints auto-geradas pelo Postgres são LOAD-BEARING e devem
-- ser reproduzidos por um rebuild: `notificacoes_enviadas_pkey`,
-- `notificacoes_enviadas_candidatura_id_fkey`,
-- `notificacoes_enviadas_candidato_id_fkey` e `notificacoes_enviadas_evento_check`
-- resultam deterministicamente das declarações inline abaixo. `uq_notif_dedupe`
-- NÃO é um nome default — por isso é declarado explicitamente.
CREATE TABLE public.notificacoes_enviadas (
  id                   uuid                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento               text                      NOT NULL CHECK (evento IN ('confirmacao', 'avanco', 'convite', 'decisao')),
  candidatura_id       uuid                      NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  candidato_id         uuid                      NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  template             text                      NOT NULL,
  destinatario_email   text                      NOT NULL,
  status               public.status_notificacao NOT NULL DEFAULT 'pendente',
  provider_message_id  text,
  dedupe_key           text                      NOT NULL,
  tentativas           integer                   NOT NULL DEFAULT 0,
  proxima_tentativa_em timestamptz,
  ultimo_erro          text,
  criado_em            timestamptz               NOT NULL DEFAULT now(),
  atualizado_em        timestamptz               NOT NULL DEFAULT now(),
  enviado_em           timestamptz,
  entregue_em          timestamptz,
  CONSTRAINT uq_notif_dedupe UNIQUE (dedupe_key)
);

-- ---------------------------------------------------------------------------
-- 3 · Índices não-implícitos (seção C do dump, transcritos do `indexdef`)
-- ---------------------------------------------------------------------------
-- `notificacoes_enviadas_pkey` e `uq_notif_dedupe` são criados implicitamente
-- pelas constraints acima; os 3 abaixo são explícitos. Total vivo = 5 índices.
CREATE INDEX idx_notif_candidatura ON public.notificacoes_enviadas USING btree (candidatura_id);

CREATE INDEX idx_notif_provider_msg ON public.notificacoes_enviadas USING btree (provider_message_id)
  WHERE (provider_message_id IS NOT NULL);

-- Índice da varredura de retry do `pg_cron` da P41. JÁ EXISTE em PROD — o Plano
-- 37-03 o VERIFICA, não o cria. A forma parcial `btree (proxima_tentativa_em)
-- WHERE status IN (…)` é mais estreita que `(status, proxima_tentativa_em)`
-- porque o predicado parcial já fixa `status`.
CREATE INDEX idx_notif_retry ON public.notificacoes_enviadas USING btree (proxima_tentativa_em)
  WHERE (status = ANY (ARRAY['pendente'::status_notificacao, 'falhou'::status_notificacao]));

-- ---------------------------------------------------------------------------
-- 4 · RLS — LEDGER-03
-- ---------------------------------------------------------------------------
-- EXATAMENTE UMA policy, `SELECT`, `{authenticated}`: o predicado join-through
-- vaga-scoped (autorização chaveada na vaga REAL da candidatura, imune a
-- vaga_id spoofado — mesmo idioma de `rh_gerencia_agendamento`/WR-04, P33).
-- Não existe policy de INSERT/UPDATE/DELETE → só `service_role` escreve.
-- Não existe policy que case para o role `candidato` → candidato-DENY sai de
-- graça pelo default-deny da RLS (decisão travada no 37-CONTEXT: uma policy
-- permissiva mal escrita ABRE acesso; a AUSÊNCIA de policy nunca abre).
-- O literal do role admin é `administrador` (convenção do repo, 28 ocorrências).
ALTER TABLE public.notificacoes_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rh_le_notificacoes ON public.notificacoes_enviadas
  FOR SELECT TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );

-- ---------------------------------------------------------------------------
-- 5 · COMMENTs (seção G do dump — transcritos VERBATIM do catálogo vivo)
-- ---------------------------------------------------------------------------
-- Os dois COMMENTs de coluna abaixo são CONTRATO DE IMPLEMENTAÇÃO para a
-- Phase 38: o formato da `dedupe_key` e o protocolo de reivindicação
-- (`ON CONFLICT … DO NOTHING RETURNING id` ANTES de enviar) já estão
-- especificados aqui. A P38 deve segui-los, não reinventá-los.
COMMENT ON TABLE public.notificacoes_enviadas IS
  'Phase 37 / LEDGER-01/02/03: audit trail of every notification dispatch. RH vaga-scoped via rh_le_notificacoes join-through; candidato-DENY. Writes ONLY via P38 EF service_role. UNIQUE(dedupe_key) durable idempotency. Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8).';

COMMENT ON COLUMN public.notificacoes_enviadas.status IS
  'State machine pendente -> enviado -> (entregue | falhou | bounce | reclamado); falhou may return to pendente on retry. Governed by the P38 EF / P41 webhook, NOT a rigid constraint.';

COMMENT ON COLUMN public.notificacoes_enviadas.dedupe_key IS
  'Durable idempotency guard; format ''{evento}:{candidatura_id}:{discriminador}'' where discriminador = etapa_destino for avanco/decisao, agendamento_id for convite, literal ''confirmacao'' for confirmation. EF claims via INSERT ... ON CONFLICT (dedupe_key) DO NOTHING RETURNING id BEFORE sending.';

-- ---------------------------------------------------------------------------
-- 6 · GRANTs (seção H do dump)
-- ---------------------------------------------------------------------------
-- Nenhum GRANT explícito além dos defaults do Supabase foi capturado no
-- catálogo vivo — o acesso de `anon`/`authenticated` é inteiramente mediado
-- pela RLS acima, e a escrita da EF ocorre por `service_role` (bypassa RLS).
-- Nada a declarar aqui; a ausência é intencional, não um esquecimento.
