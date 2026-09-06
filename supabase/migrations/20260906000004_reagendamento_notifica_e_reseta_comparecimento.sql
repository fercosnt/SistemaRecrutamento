-- =============================================================================
-- Migration: reagendar entrevista AVISA a candidata e zera o comparecimento
-- Date: 2026-09-06 (E4 do guia de validação)
-- =============================================================================
-- MEDIDO ao vivo: RH2 reagendou a entrevista da T1 de online (10/09 14:00) para
-- presencial (10/09 10:00, sala 2). Resultado:
--   1. NENHUM e-mail. `trg_notif_convite` é `AFTER INSERT` apenas — o reagendamento é
--      um UPDATE in place (agendamentoService.reagendar → status='reagendada'). A
--      candidata continuaria com o convite antigo (online, 14:00) na agenda.
--   2. «Compareceu» continuou marcado: o `compareceu=true` da entrevista online foi
--      herdado pela presencial, que ainda não aconteceu.
--
-- Conserto (banco, autoritativo — o cliente não precisa saber):
--   • trg_notif_convite() passa a informar `reagendamento: (TG_OP = 'UPDATE')` no corpo.
--     A EF notificar-candidato (mesmo commit) usa isso para dedupar por
--     `{agendamento_id}:convite:{data_hora}` em vez de `{agendamento_id}:convite` — a
--     chave antiga foi consumida pelo convite original e engoliria o reenvio. O .ics
--     mantém o UID (id do agendamento), então o calendário da candidata ATUALIZA o
--     evento em vez de duplicar.
--   • Trigger novo AFTER UPDATE OF data_hora, tipo, local_ou_link — só quando algum dos
--     três mudou de fato e o agendamento segue ativo (agendada/reagendada, não deletado).
--     Marcar comparecimento ou editar observações internas NÃO dispara e-mail.
--   • Trigger BEFORE UPDATE: data_hora mudou e o cliente não mexeu em compareceu →
--     compareceu volta a NULL (Pendente).
--
-- Aplicar pela Management API com o SQL lido do arquivo (p46apply.cjs migrate).
-- Sem BEGIN/COMMIT externo — a requisição já é uma transação.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_notif_convite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'convite',
        'candidatura_id', NEW.candidatura_id,
        'agendamento_id', NEW.id,
        -- 2026-09-06: UPDATE = reagendamento → a EF dedupa por data_hora e muda a copy.
        'reagendamento', (TG_OP = 'UPDATE')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_convite: dispatch falhou (%: %) — funil intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.trg_notif_convite() IS
  'Dispara notificar-candidato (evento convite) no INSERT do agendamento e, desde 2026-09-06, '
  'tambem no UPDATE que muda data_hora/tipo/local_ou_link (reagendamento) — o corpo leva '
  'reagendamento=true e a EF dedupa por {agendamento_id}:convite:{data_hora}.';

DROP TRIGGER IF EXISTS trg_notif_convite_reagendamento ON public.agendamentos_entrevista;
CREATE TRIGGER trg_notif_convite_reagendamento
  AFTER UPDATE OF data_hora, tipo, local_ou_link ON public.agendamentos_entrevista
  FOR EACH ROW
  WHEN (
    NEW.deleted_at IS NULL
    AND NEW.status IN ('agendada', 'reagendada')
    AND (OLD.data_hora, OLD.tipo, OLD.local_ou_link)
        IS DISTINCT FROM (NEW.data_hora, NEW.tipo, NEW.local_ou_link)
  )
  EXECUTE FUNCTION public.trg_notif_convite();

CREATE OR REPLACE FUNCTION public.agendamento_reagendado_reset_comparecimento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  -- A entrevista mudou de data: o comparecimento registrado era da data ANTIGA.
  -- Só zera se o cliente não alterou compareceu no mesmo UPDATE.
  IF NEW.compareceu IS NOT DISTINCT FROM OLD.compareceu THEN
    NEW.compareceu := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_agendamento_reagendado_reset ON public.agendamentos_entrevista;
CREATE TRIGGER trg_agendamento_reagendado_reset
  BEFORE UPDATE OF data_hora ON public.agendamentos_entrevista
  FOR EACH ROW
  WHEN (OLD.data_hora IS DISTINCT FROM NEW.data_hora)
  EXECUTE FUNCTION public.agendamento_reagendado_reset_comparecimento();

-- Portão: os dois triggers existem e o corpo do dispatch leva o discriminador.
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_trigger
       WHERE tgrelid = 'public.agendamentos_entrevista'::regclass
         AND tgname IN ('trg_notif_convite_reagendamento', 'trg_agendamento_reagendado_reset')) <> 2 THEN
    RAISE EXCEPTION 'triggers de reagendamento nao instalados';
  END IF;
  IF position('''reagendamento'', (TG_OP = ''UPDATE'')' IN
              pg_get_functiondef('public.trg_notif_convite()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'trg_notif_convite sem o discriminador de reagendamento';
  END IF;
END $$;
