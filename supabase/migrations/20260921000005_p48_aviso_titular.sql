-- =============================================================================
-- 20260921000005 — solicitacoes_dados : carimbos PRÓPRIOS do aviso ao titular
--                  (Phase 48 / 48-07 / JORN-27)
-- =============================================================================
-- O QUE ESTAVA ERRADO (medido na Etapa 12 da validação manual, 2026-09-21). O
-- pedido e o cancelamento de exclusão geravam três e-mails, TODOS para o RH, e
-- ZERO para a titular. Com a conta invadida, a exclusão é pedida e a dona dos
-- dados não sabe — até o dia em que a conta some. O aviso é CONTROLE DE CONTA
-- INVADIDA, não cortesia.
--
-- POR QUE COLUNAS NOVAS, E NÃO `recibo_enviado_em`. A letra antiga do requisito
-- mandava escrever `recibo_enviado_em` no pedido. A pesquisa (48-RESEARCH §D.4)
-- mediu que aquela coluna é o CINTO PRIMÁRIO do recibo pós-exclusão
-- (`executar-direito-titular/index.ts`, passo 4: `if (!estado.recibo_enviado_em)`)
-- e a chave do reencontro de pedidos órfãos. Escrita no pedido, ela faria o motor
-- PULAR o recibo final: a titular teria a conta apagada sem o único e-mail que
-- prova a exclusão. O operador confirmou colunas próprias (48-CONTEXT, correções
-- de fato).
--
-- POR QUE FORA DE `notificacoes_enviadas`. O ledger exige `candidatura_id` NOT
-- NULL, e 16 de 42 titulares não têm candidatura. O aviso segue a mecânica do
-- recibo (idempotência por coluna de estado + `Idempotency-Key` no Resend).
--
-- QUEM ESCREVE: só a EF `executar-direito-titular`, pelo client de serviço,
-- DEPOIS do 2xx do Resend. Falha de envio deixa a coluna NULA — observável por
-- `aviso_pedido_enviado_em IS NULL` num pedido agendado — e o log da EF leva a
-- causa por código (`aviso_<causa>`).
--
-- AUTHZ: nenhuma mudança. Colunas nullable, sem GRANT novo; RLS e policies de
-- `solicitacoes_dados` intocadas. A cópia LGPD (`exportar-meus-dados`) exporta
-- por ALLOWLIST de colunas (`export-allowlist.json`), então as duas colunas
-- NÃO entram na cópia até alguém decidir que entram — o mesmo estado das sete
-- colunas de estado do P45 (`executar_em`, ..., `recibo_enviado_em`).
--
-- IDEMPOTÊNCIA: nenhuma, de propósito. `ADD COLUMN` sem `IF NOT EXISTS` (idioma
-- de 20260805000001 §3: `IF NOT EXISTS` transforma «já existe com outra forma» em
-- no-op silencioso). Um segundo apply falha alto na primeira linha.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): o bloco `DO $$ ... $$`
-- com statements adjacentes é a forma exata do 42601 no pooler.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000005_p48_aviso_titular.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

ALTER TABLE public.solicitacoes_dados
  ADD COLUMN aviso_pedido_enviado_em timestamptz,
  ADD COLUMN aviso_cancelamento_enviado_em timestamptz;

COMMENT ON COLUMN public.solicitacoes_dados.aviso_pedido_enviado_em IS
  'Phase 48 / JORN-27: quando o e-mail que avisa a TITULAR do pedido de exclusao (data de '
  'execucao e como cancelar) foi aceito pelo Resend. Controle de conta invadida: quem nao pediu '
  'fica sabendo antes de a conta sumir. Escrito SO pela EF executar-direito-titular, depois do '
  '2xx. NULL num pedido agendado = aviso NAO entregue (a causa esta no log da EF, por codigo) — '
  'observavel de proposito, porque silencio e o pior modo de falha deste controle. '
  '⚠ NAO E recibo_enviado_em: aquela coluna e o cinto do recibo POS-exclusao (passo 4 do motor); '
  'escrita no pedido, ela suprimiria o recibo final.';

COMMENT ON COLUMN public.solicitacoes_dados.aviso_cancelamento_enviado_em IS
  'Phase 48 / JORN-27: quando o e-mail que avisa a TITULAR do CANCELAMENTO do pedido de exclusao '
  'foi aceito pelo Resend. Mesmo contrato de aviso_pedido_enviado_em: escrito so pela EF, depois '
  'do 2xx; NULL num pedido cancelado = aviso nao entregue (causa no log da EF). '
  '⚠ NAO E recibo_enviado_em — ver o COMMENT de aviso_pedido_enviado_em.';

-- ── Auto-verificação: as duas colunas existem, com o tipo certo e nullable ──
DO $$
DECLARE
  v_n int;
BEGIN
  SELECT count(*) INTO v_n
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'solicitacoes_dados'
     AND column_name IN ('aviso_pedido_enviado_em', 'aviso_cancelamento_enviado_em')
     AND data_type    = 'timestamp with time zone'
     AND is_nullable  = 'YES';
  -- A contagem 2 é ESCOPO DELIBERADO (as duas colunas que ESTA migration cria),
  -- não fotografia do schema.
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'p48 aviso_titular: esperadas 2 colunas timestamptz nullable, achadas %', v_n;
  END IF;
END $$;
