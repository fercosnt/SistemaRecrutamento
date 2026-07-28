-- =============================================================================
-- Migration: P37 — lacunas ADITIVAS do ledger de notificação (LEDGER-01/02)
-- Date: 2026-07-22
-- Milestone: M7 (v7.0 — Comunicação com o Candidato)
-- Phase: 37 (camada-de-dados-de-notificacao) / Plano 37-03
-- Requirements: LEDGER-01, LEDGER-02
-- =============================================================================
--
-- PURPOSE
--   Fecha as DUAS lacunas REAIS entre o schema que já vive em PROD e o que a
--   Edge Function da P38 e a varredura da P41 precisam:
--
--   (1) AUDITORIA DO MODO TESTE. `notificacoes_enviadas` guarda apenas
--       `destinatario_email` — o endereço que efetivamente foi para o provedor.
--       Em modo teste esse endereço é reescrito para a sandbox
--       `delivered+<evento>@resend.dev`, e o e-mail REAL do candidato se perde.
--       Resultado: um envio de UAT fica indistinguível de um envio real no
--       ledger, e a auditoria mente sobre quem *deveria* ter recebido. As
--       colunas `destinatario_original` e `modo` guardam exatamente o par que
--       `resolverDestinatario()` / `resolverModo()` de
--       `supabase/functions/_shared/email-config.ts` (P36) já produzem.
--
--   (2) `atualizado_em` CONGELADO. As duas tabelas têm `atualizado_em
--       timestamptz NOT NULL DEFAULT now()` e ZERO triggers (seção E do dump).
--       A coluna congela no instante do INSERT e engana justamente onde seria
--       mais útil: reivindicação de idempotência, retry e reconciliação da P41.
--       `public.tocar_atualizado_em()` + um trigger `BEFORE UPDATE` por tabela
--       fazem a coluna significar o que o nome diz.
--
-- POR QUE ESTA MIGRATION É ADITIVA E NÃO UMA EDIÇÃO DOS ARQUIVOS ANTERIORES
--   Os arquivos `20260721000001_notificacoes_enviadas.sql` e
--   `20260721000002_config_sla_etapa.sql` são RECONSTRUÇÕES de versions que já
--   constam em `supabase_migrations.schema_migrations` desde 2026-07-21. Eles
--   descrevem o que rodou em PROD. Acrescentar estas colunas lá dentro seria
--   MENTIRA HISTÓRICA: o conteúdo passaria a divergir do que a version
--   registrada de fato aplicou, e um `db reset` produziria um schema que nunca
--   existiu naquele ponto do tempo. As lacunas descobertas DEPOIS daquele
--   estado vivem exclusivamente aqui, numa version nova. Decisão travada em
--   `.planning/phases/37-…/37-CONTEXT.md` § "Estratégia de Reconciliação".
--
-- NOTA DE ESCOPO — POR QUE NÃO HÁ NENHUM `CREATE INDEX` NESTE ARQUIVO
--   O `37-CONTEXT.md` previa TRÊS lacunas; a terceira era criar o índice
--   parcial da varredura de retry do `pg_cron` da P41 (RECON-02). O dump
--   literal do catálogo (`37-SCHEMA-VIVO.md` § C, capturado em 2026-07-22)
--   FALSIFICOU essa premissa: o índice **já existe em PROD** como
--   `idx_notif_retry`, na forma
--     btree (proxima_tentativa_em) WHERE status IN ('pendente','falhou')
--   Essa forma é funcionalmente equivalente à planejada
--   `(status, proxima_tentativa_em) WHERE …` — e mais ESTREITA, porque o
--   predicado parcial já fixa `status`, tornando-o redundante como primeira
--   coluna da chave. Ou seja: a forma viva é a CORRETA; "corrigi-la" seria uma
--   regressão. Recriá-la aqui daria erro de nome duplicado; recriá-la com
--   `IF NOT EXISTS` daria um no-op SILENCIOSO, mascarando qualquer divergência
--   de definição entre o planejado e o vivo. Por isso: nada de índice aqui.
--
--   Bônus registrado no mesmo dump: `idx_notif_provider_msg`
--   (btree (provider_message_id) WHERE provider_message_id IS NOT NULL) também
--   já existe, e é exatamente o índice de que a reconciliação por webhook da
--   P41 vai precisar. Nada a fazer sobre ele tampouco.
--
--   ⚠ O ponto deste parágrafo é que um leitor futuro NÃO conclua que os
--   índices foram ESQUECIDOS. Eles foram VERIFICADOS, não omitidos, e a
--   verificação é executável: asserção (m) de
--   `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql`.
--
-- O QUE ESTA MIGRATION DELIBERADAMENTE NÃO FAZ
--   · Nenhuma policy nova. O candidato-DENY do LEDGER-03 permanece IMPLÍCITO
--     pelo default-deny da RLS (não existe policy que case para o role
--     `candidato`). Uma policy PERMISSIVE mal escrita ABRE acesso; a ausência
--     de policy nunca abre. Decisão travada no CONTEXT; provada por
--     comportamento na asserção (g) do smoke, com JWT de candidato REAL.
--   · Nenhum re-seed de `config_sla_etapa` (8/8 e correto em PROD).
--   · Nenhuma alteração da policy `rh_le_notificacoes`.
--   · Nenhuma coluna booleana de desvio — esse flag é DERIVÁVEL de
--     (destinatario_email <> destinatario_original); persistir um derivado só
--     cria uma segunda fonte da verdade que pode divergir.
--
-- PREMISSA DE DADOS (seção J do dump): `notificacoes_enviadas` tem **0 linhas**.
--   Por isso `ADD COLUMN destinatario_original text NOT NULL` entra SEM default
--   e SEM backfill. Se a tabela tiver ganhado linhas entre a captura do dump e
--   o apply, este statement FALHA ALTO — que é o comportamento desejado: um
--   backfill silencioso inventaria um "destinatário original" que ninguém sabe
--   qual era.
--
-- NOTE: sem wrapper transacional externo (BEGIN/COMMIT) — CLAUDE.md D-22. O
--   driver do Supabase já envolve cada migration em sua própria transação, e o
--   wrapper externo é justamente o gatilho do SQLSTATE 42601 em corpo PL/pgSQL
--   `$$` adjacente a COMMENT/GRANT. Apply em PROD via Supabase MCP
--   `apply_migration` (NUNCA `supabase db push --linked`) + reconcile do
--   ledger para a version 20260722000002. Quem aplica é o Plano 37-04.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- LACUNA 1 · Auditoria do modo teste (LEDGER-01)
-- ---------------------------------------------------------------------------
-- `destinatario_original` entra NOT NULL e SEM DEFAULT de propósito: a tabela
-- está vazia, então não há backfill a inventar, e a ausência de default obriga
-- a EF da P38 a gravar o valor explicitamente — nunca a herdar um placeholder.
ALTER TABLE public.notificacoes_enviadas
  ADD COLUMN destinatario_original text NOT NULL;

-- `modo` entra com DEFAULT fail-safe `teste`, espelhando `resolverModo()`:
-- qualquer coisa que não seja exatamente `producao` cai em `teste`. Um default
-- `producao` faria uma linha mal gravada parecer um envio real.
ALTER TABLE public.notificacoes_enviadas
  ADD COLUMN modo text NOT NULL DEFAULT 'teste';

ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT ck_notif_modo CHECK (modo IN ('producao','teste'));

COMMENT ON COLUMN public.notificacoes_enviadas.destinatario_original IS
  'M7/P37 LEDGER-01: e-mail REAL do candidato, sempre preservado — inclusive '
  'quando `destinatario_email` foi reescrito para a sandbox do provedor '
  '(delivered+<evento>@resend.dev) em modo teste. Produzido por '
  'resolverDestinatario() em supabase/functions/_shared/email-config.ts (P36) e '
  'gravado pela Edge Function notificar-candidato (P38). A auditoria precisa '
  'saber quem DEVERIA ter recebido, nao so quem recebeu. Nao existe coluna '
  'booleana de desvio: ela e derivavel de '
  '(destinatario_email <> destinatario_original).';

COMMENT ON COLUMN public.notificacoes_enviadas.modo IS
  'M7/P37 LEDGER-01: modo do despacho — ''producao'' (alcanca pessoas reais) ou '
  '''teste'' (desviado para a sandbox do provedor). DEFAULT ''teste'' e '
  'FAIL-SAFE deliberado, espelhando resolverModo() de '
  'supabase/functions/_shared/email-config.ts: apenas o literal exato '
  '''producao'' habilita producao; qualquer outro valor cai em teste. Existe '
  'para que um envio de UAT NUNCA seja confundido com um envio real na '
  'auditoria do ledger. Dominio travado por ck_notif_modo.';

-- ---------------------------------------------------------------------------
-- LACUNA 2 · `atualizado_em` que de fato atualiza (LEDGER-01 / TIMELINE-01)
-- ---------------------------------------------------------------------------
-- Variante pt-BR DELIBERADA. O repo já tem uma função equivalente em inglês
-- (`update_updated_at_column`, seção I do dump) que NAO serve aqui: ela atribui
-- a `NEW.updated_at`, coluna que NAO existe em nenhuma destas duas tabelas — o
-- trigger levantaria erro de campo inexistente em todo UPDATE. Ela também usa
-- `search_path=public` em vez de `''`. Decisão travada no 37-CONTEXT.
--
-- SEM `SECURITY DEFINER`: carimbar uma coluna da própria linha não requer
-- privilégio elevado, e DEFINER aqui só ampliaria superfície de ataque sem
-- ganho algum. `SET search_path = ''` + `pg_catalog.now()` totalmente
-- qualificado tornam a resolução de nome imune a objeto homônimo em schema de
-- atacante — idioma já padrão do repo (20260722000001, 20260706110005).
CREATE OR REPLACE FUNCTION public.tocar_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em := pg_catalog.now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tocar_atualizado_em() IS
  'M7/P37 LEDGER-01: carimba NEW.atualizado_em a cada UPDATE. Variante pt-BR '
  'deliberada — a funcao equivalente em ingles ja existente no repo atribui a '
  'NEW.updated_at, coluna que NAO existe em notificacoes_enviadas nem em '
  'config_sla_etapa, e usa search_path=public em vez de vazio; reusa-la '
  'quebraria todo UPDATE nestas tabelas. Sem privilegio elevado (stamping de '
  'coluna nao precisa) e com search_path vazio + referencia qualificada.';

-- `CREATE TRIGGER` puro, sem `DROP TRIGGER` prévio: a seção E do dump prova que
-- hoje há 0 triggers não-internos nas duas tabelas. Falhar alto contra um
-- trigger inesperado é preferível a substituí-lo silenciosamente.
CREATE TRIGGER trg_notificacoes_atualizado_em
  BEFORE UPDATE ON public.notificacoes_enviadas
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

CREATE TRIGGER trg_config_sla_atualizado_em
  BEFORE UPDATE ON public.config_sla_etapa
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- LACUNA 3 · NÃO EXISTE — ver "NOTA DE ESCOPO" no cabeçalho.
-- ---------------------------------------------------------------------------
-- O índice parcial de retry já vive em PROD. Esta migration não o cria, não o
-- recria e não o comenta; o smoke da Task 2 o VERIFICA estruturalmente.
