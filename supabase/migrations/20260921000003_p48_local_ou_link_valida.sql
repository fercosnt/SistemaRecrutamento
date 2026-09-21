-- =============================================================================
-- 20260921000003 — validar_local_ou_link_agendamento : o local/link da entrevista
--                  passa a ser OBRIGATÓRIO e VALIDADO NA ESCRITA (JORN-D5)
-- =============================================================================
-- Phase 48 / Plano 48-03 · D-05 (só a parte antecipada do D5; o redesenho do
-- agendamento — PP-8 — é fase própria, depois do Bloco 2).
--
-- O QUE ESTAVA ERRADO (medido em PROD, 2026-09-21, só leitura). O RH conseguiu salvar
-- uma entrevista `online` com `local_ou_link = 'dddd'`. `isSafeHttpUrl`
-- (`AgendamentoCandidatoCard.tsx`) já impedia o `dddd` de virar link clicável na
-- RENDERIZAÇÃO — mas nada impedia o valor inválido de ENTRAR. A escrita é PostgREST
-- direto sob RLS (`agendamentoService.ts` insert/update, policy
-- `rh_gerencia_agendamento`), sem RPC no meio: a única camada servidor possível é um
-- trigger. A camada cliente é o Zod (`agendamentoSchema.ts`, mesmo plano), que usa a
-- MESMA `isSafeHttpUrl`, agora em `src/lib/url/isSafeHttpUrl.ts`.
--
-- O CAMPO GUARDA ENDEREÇO NO PRESENCIAL (medido). As 2 linhas vivas na abertura:
--   · `presencial` / `reagendada` — texto de 57 caracteres com dígitos e vírgula
--     (um endereço), conta `+claude1`;
--   · `online` / `reagendada` — `dddd`, conta `+claude4` (a única violação).
-- Por isso a regra é: obrigatório (texto não vazio depois de `btrim`) nas DUAS
-- modalidades; URL http(s) com host SÓ em `tipo = 'online'`. Exigir link no presencial
-- quebraria o agendamento presencial — um endereço não é link inválido.
--
-- POR QUE TRIGGER, E NÃO `CHECK … NOT VALID`. Um CHECK — mesmo `NOT VALID` — é
-- reavaliado em QUALQUER UPDATE da linha. A linha legada `dddd` passaria a recusar
-- `status = 'cancelada'`, `compareceu` e `data_hora`: o RH não conseguiria nem cancelar
-- a entrevista com o link ruim. O trigger de UPDATE só dispara quando `local_ou_link`
-- ou `tipo` MUDAM (`UPDATE OF … WHEN (tupla IS DISTINCT FROM tupla)`, o idioma de
-- `20260906000004`). A linha legada fica intocada, sem UPDATE retroativo (D-18), e
-- continua cancelável e editável nas outras colunas; o dia em que alguém trocar o link
-- dela, o valor novo é validado.
--
-- ORDEM DOS BEFORE TRIGGERS (alfabética — `20260709000010:40-43`):
--   trg_agendamento_normaliza_vaga  (n) — normaliza vaga_id, carimba autoria
--   trg_agendamento_reagendado_reset (r) — zera compareceu quando data_hora muda
--   trg_agendamento_valida_local_ins (v) — ESTE (INSERT)
--   trg_agendamento_valida_local_upd (v) — ESTE (UPDATE)
-- Os dois anteriores não tocam `local_ou_link` nem `tipo`; validar por último vê a
-- linha como ela será gravada. Um RAISE aqui desfaz a escrita inteira antes de
-- qualquer AFTER (`trg_notif_convite*`) — convite com link inválido não sai.
--
-- A REGRA DE URL ESPELHA `isSafeHttpUrl`: esquema http/https + host não vazio
-- (`^https?://[^[:space:]/?#]+`, sem distinção de caixa, sobre o valor aparado).
-- `javascript:`, `data:`, `dddd` e `https://` sem host são recusados. O servidor é
-- deliberadamente um pouco MAIS estrito que o `new URL()` do navegador (que aceita
-- `http:host` sem as barras): na divergência, falha fechado.
--
-- ERRO: `check_violation` (23514), o mesmo SQLSTATE que um CHECK daria — o cliente
-- trata as duas coisas igual.
--
-- AUTHZ: função de trigger comum (não DEFINER — só lê NEW). `REVOKE … FROM PUBLIC,
-- anon` como toda função de trigger do projeto (`20260730000004:256-257`).
--
-- IDEMPOTÊNCIA: CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL
-- `$$` com REVOKE/COMMENT adjacentes é a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000003_p48_local_ou_link_valida.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validar_local_ou_link_agendamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_valor text := btrim(coalesce(NEW.local_ou_link, ''));
BEGIN
  IF v_valor = '' THEN
    RAISE EXCEPTION 'local_ou_link obrigatório: informe o local (presencial) ou o link (online) da entrevista'
      USING ERRCODE = 'check_violation',
            HINT = 'JORN-D5 — validar_local_ou_link_agendamento';
  END IF;

  IF NEW.tipo = 'online' AND v_valor !~* '^https?://[^[:space:]/?#]+' THEN
    RAISE EXCEPTION 'local_ou_link inválido para entrevista online: informe um link começando com http:// ou https://'
      USING ERRCODE = 'check_violation',
            HINT = 'JORN-D5 — validar_local_ou_link_agendamento';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_local_ou_link_agendamento() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validar_local_ou_link_agendamento() FROM anon;

COMMENT ON FUNCTION public.validar_local_ou_link_agendamento() IS
  'JORN-D5 (Phase 48, 48-03): local_ou_link obrigatório (btrim não vazio) nas duas modalidades; '
  'URL http(s) com host SÓ em tipo=online — no presencial o campo guarda o ENDEREÇO (medido: '
  'texto de 57 caracteres com dígitos e vírgula). Recusa com check_violation. É trigger, e não '
  'CHECK NOT VALID, porque um CHECK é reavaliado em qualquer UPDATE da linha: a linha legada '
  'online/dddd deixaria de ser cancelável. O trigger de UPDATE só age quando local_ou_link ou tipo '
  'MUDAM, então a linha legada segue cancelável sem UPDATE retroativo. Camada cliente: '
  'agendamentoSchema.ts com src/lib/url/isSafeHttpUrl.ts.';

-- INSERT: sempre valida.
DROP TRIGGER IF EXISTS trg_agendamento_valida_local_ins ON public.agendamentos_entrevista;
CREATE TRIGGER trg_agendamento_valida_local_ins
  BEFORE INSERT ON public.agendamentos_entrevista
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_local_ou_link_agendamento();

-- UPDATE: só quando o link ou a modalidade MUDAM (cancelar, marcar comparecimento,
-- reagendar a data e editar observações não passam por aqui).
DROP TRIGGER IF EXISTS trg_agendamento_valida_local_upd ON public.agendamentos_entrevista;
CREATE TRIGGER trg_agendamento_valida_local_upd
  BEFORE UPDATE OF local_ou_link, tipo ON public.agendamentos_entrevista
  FOR EACH ROW
  WHEN ((OLD.local_ou_link, OLD.tipo) IS DISTINCT FROM (NEW.local_ou_link, NEW.tipo))
  EXECUTE FUNCTION public.validar_local_ou_link_agendamento();

-- Portão de auto-verificação (catálogo): os dois triggers existem, estão habilitados,
-- apontam para a função, e o de UPDATE carrega o WHEN por tupla (sem ele, a linha
-- legada `dddd` deixaria de ser cancelável).
DO $$
DECLARE
  v_fn  oid := 'public.validar_local_ou_link_agendamento()'::regprocedure;
  v_n   integer;
  v_def text;
BEGIN
  SELECT count(*) INTO v_n
    FROM pg_trigger
   WHERE tgrelid = 'public.agendamentos_entrevista'::regclass
     AND tgfoid = v_fn
     AND tgenabled = 'O'
     AND tgname IN ('trg_agendamento_valida_local_ins', 'trg_agendamento_valida_local_upd');
  IF v_n IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'JORN-D5: esperados os 2 triggers de validação apontando para a função; achados %', v_n;
  END IF;

  SELECT pg_get_triggerdef(oid) INTO v_def
    FROM pg_trigger
   WHERE tgrelid = 'public.agendamentos_entrevista'::regclass
     AND tgname = 'trg_agendamento_valida_local_upd';
  IF position('IS DISTINCT FROM' IN v_def) = 0 OR position('UPDATE OF local_ou_link, tipo' IN v_def) = 0 THEN
    RAISE EXCEPTION 'JORN-D5: trg_agendamento_valida_local_upd instalado SEM o WHEN por tupla / UPDATE OF — %', v_def;
  END IF;
END $$;
