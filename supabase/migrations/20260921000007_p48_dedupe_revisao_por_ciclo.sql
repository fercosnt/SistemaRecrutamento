-- =============================================================================
-- 20260921000007 — os despachos do ciclo de revisão passam a dizer QUAL ciclo
--                  (pré-requisito do JORN-19 / D-01)
-- =============================================================================
-- Phase 48 / plano 48-08, Task 3.
--
-- O QUE FICOU FALSO. O cabeçalho de 20260730000004 (linhas 196-200) registrou:
--
--   «Por isso `montarDedupeKey` NAO ganhou ramo novo em helpers.ts: ha no maximo uma
--    revisao por candidatura (`decisao_final.candidatura_id` e UNIQUE), logo no maximo um
--    e-mail legitimo, logo a chave `{candidatura_id}:revisao_respondida` nunca bloqueia nada.»
--
-- Era verdade em 2026-07-30 e deixa de ser com a decisão D-01 do operador (REABRIR, não
-- reverter): o veredito `revertida` devolve a candidatura a `decisao_final` para uma NOVA
-- decisão (plano 48-11), e essa nova decisão pode ter um SEGUNDO pedido de revisão, com uma
-- SEGUNDA resposta. As duas chaves do ciclo eram uma por candidatura:
--   · `notificar-candidato`: `{candidatura}:revisao_respondida`
--   · `notificar-rh`:        `{candidatura}:revisao_solicitada:{user_id}`
-- e o 2º ciclo seria descartado como `skipped:"duplicate"` — o mesmo mecanismo do Defeito 18
-- (20260921000006), agora no Art. 20: o titular pede revisão e nenhum RH é avisado; o RH
-- responde e o titular não é avisado. Em silêncio.
--
-- O CONSERTO. Os dois triggers passam no corpo a identidade do ciclo:
--   'ciclo', extract(epoch from NEW.revisao_solicitada_em)::bigint::text
-- — o instante do pedido de revisão, a mesma expressão nos dois (o pedido e a resposta de um
-- ciclo carregam o MESMO `ciclo`). As EFs versionam a chave por ele:
--   · `{candidatura}:revisao_respondida:{ciclo}`
--   · `{candidatura}:revisao_solicitada:{ciclo}:{user_id}` (o `user_id` segue no FIM)
-- Texto, e não número: é o que as EFs validam (`^\d{1,12}$`).
--
-- ORDEM DE ENTREGA (Pitfall 7 — `net.http_post` é at-most-once). As EFs tolerantes foram
-- deployadas ANTES desta migration (aceitam o campo, a ausência dele e `null`):
--   notificar-candidato v11 / notificar-rh v4 — 2026-09-21T14:26:20Z (aceitam `ciclo`);
--   notificar-candidato v12 / notificar-rh v5 — 2026-09-21T14:27:44Z (`null` = ausente:
--   `jsonb_build_object` manda `"ciclo": null` se `revisao_solicitada_em` for nulo, e
--   recusar com 400 perderia o e-mail).
--
-- BASE: os corpos VIVOS, lidos por `pg_get_functiondef` em 2026-09-21 —
--   trg_notif_revisao_solicitada  md5(prosrc) = 2536b7d29c5537daf023cb6b28208f3e (1503 octetos)
--   trg_notif_revisao_respondida  md5(prosrc) = 1085057921f2682b7ef99c3a2bbe83a6 (1523 octetos)
-- UMA mudança em cada: o `jsonb_build_object` do corpo ganha o `ciclo`. Guards de transição
-- (NULL -> NOT NULL), leitura do Vault com graceful-skip, `EXCEPTION WHEN OTHERS` fail-open:
-- intactos — e o PÓS-PORTÃO PROVA isso: sem o fragmento novo, cada corpo instalado volta ao
-- md5 vivo. As definições dos TRIGGERS (`AFTER UPDATE OF revisao_solicitada_em` /
-- `… OF revisao_respondida_em`, vigiadas por `p42_notif_revisao_smoke` (c)/(d)) NÃO mudam —
-- só as funções.
--
-- AUTHZ / ACL: CREATE OR REPLACE preserva o ACL vivo (`postgres, authenticated,
-- service_role`; `anon` já revogado). Os REVOKEs da migration base são repetidos como
-- estavam (no-op sobre o ACL vivo).
--
-- IDEMPOTÊNCIA: o pré-portão aceita os md5 de ANTES (primeiro apply) e recusa qualquer
-- outro — re-aplicar sobre os corpos novos falharia de propósito, com mensagem.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (CLAUDE.md §Commands): corpos PL/pgSQL `$$` com
-- `DO`/`REVOKE`/`COMMENT` adjacentes são a forma exata do 42601.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20260921000007_p48_dedupe_revisao_por_ciclo.sql
-- (SQL lido do ARQUIVO; migration + ledger na mesma transação; a `version` nasce correta).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PRÉ-PORTÃO — os vivos são os corpos medidos.
-- ---------------------------------------------------------------------------
DO $pre_p48_08b$
DECLARE
  v_sol text;
  v_res text;
BEGIN
  SELECT md5(p.prosrc) INTO v_sol FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.trg_notif_revisao_solicitada()'::regprocedure;
  SELECT md5(p.prosrc) INTO v_res FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.trg_notif_revisao_respondida()'::regprocedure;
  IF v_sol IS DISTINCT FROM '2536b7d29c5537daf023cb6b28208f3e' THEN
    RAISE EXCEPTION 'P48-08 PRE-PORTAO: trg_notif_revisao_solicitada vivo md5 = %, medido = 2536b7d29c5537daf023cb6b28208f3e — reler o vivo e refazer esta migration', v_sol;
  END IF;
  IF v_res IS DISTINCT FROM '1085057921f2682b7ef99c3a2bbe83a6' THEN
    RAISE EXCEPTION 'P48-08 PRE-PORTAO: trg_notif_revisao_respondida vivo md5 = %, medido = 1085057921f2682b7ef99c3a2bbe83a6 — reler o vivo e refazer esta migration', v_res;
  END IF;
END
$pre_p48_08b$;

-- ---------------------------------------------------------------------------
-- trg_notif_revisao_solicitada — corpo vivo + `ciclo` no corpo do despacho ao RH.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notif_revisao_solicitada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Guard de transição, idêntico ao do ancestral droppado: dispara SÓ quando a revisão
  -- é solicitada pela PRIMEIRA vez (NULL -> NOT NULL). Idempotente com o write-path, que
  -- nunca sobrescreve um pedido existente. Um UPDATE que apenas toque outras colunas de
  -- decisao_final não chega aqui (a cláusula AFTER UPDATE OF já filtra), e um UPDATE que
  -- reescreva o mesmo timestamp não passa deste IF.
  IF NOT (OLD.revisao_solicitada_em IS NULL AND NEW.revisao_solicitada_em IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, pedido do titular intacto
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-rh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'revisao_solicitada',
        'candidatura_id', NEW.candidatura_id,
        'ciclo', extract(epoch from NEW.revisao_solicitada_em)::bigint::text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_revisao_solicitada: dispatch falhou (%: %) — pedido intacto', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_notif_revisao_solicitada() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_solicitada() FROM anon;

-- ---------------------------------------------------------------------------
-- trg_notif_revisao_respondida — corpo vivo + `ciclo` no corpo do despacho ao candidato.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notif_revisao_respondida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_project_url text;
  v_invoke_key  text;
BEGIN
  -- Guard de transição: dispara SÓ quando a revisão é respondida pela PRIMEIRA vez
  -- (NULL -> NOT NULL). Um UPDATE que apenas toque outras colunas de decisao_final não
  -- chega aqui (a cláusula AFTER UPDATE OF já filtra), e um UPDATE que reescreva o mesmo
  -- timestamp não passa deste IF — provado ao vivo no trigger irmão da 42-07, onde um 2º
  -- UPDATE com o mesmo valor não produziu segunda linha de ledger.
  IF NOT (OLD.revisao_respondida_em IS NULL AND NEW.revisao_respondida_em IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN NEW;  -- segredos ausentes — dispatch adiado, resposta do RH intacta
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_project_url || '/functions/v1/notificar-candidato',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_invoke_key
      ),
      body := jsonb_build_object(
        'evento', 'revisao_respondida',
        'candidatura_id', NEW.candidatura_id,
        'ciclo', extract(epoch from NEW.revisao_solicitada_em)::bigint::text
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notif_revisao_respondida: dispatch falhou (%: %) — resposta intacta', SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_notif_revisao_respondida() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_notif_revisao_respondida() FROM anon;

COMMENT ON FUNCTION public.trg_notif_revisao_solicitada() IS
  'Phase 42 / 42-07 REVISAO-01 (D-P42-13): despacha o nudge ao RH quando um titular solicita revisao da decisao. AFTER UPDATE OF revisao_solicitada_em em decisao_final, guard de transicao NULL -> NOT NULL. RE-CRIACAO de trg_n8n_revisao_decisao (20260706110005:163-211), dropado pela P39, agora apontado para a Edge Function notificar-rh em vez do webhook n8n aposentado. Corpo ids-only (evento + candidatura_id) via Bearer self-auth do Vault (project_url + edge_invoke_key, NUNCA a chave de servidor privilegiada — a igualdade esta quebrada por rotacao), graceful-skip se algum segredo faltar, fail-open num EXCEPTION WHEN OTHERS. AT-MOST-ONCE: a EF tem de estar deployada ANTES deste trigger existir, senao o nudge se perde sem erro em lugar nenhum. Nao existe retry automatico deste evento — ver o COMMENT de varrer_retry_notificacoes; a fila /rh/revisoes e a superficie duravel. '
  'Desde 2026-09-21 (48-08) o corpo carrega tambem ciclo = extract(epoch from revisao_solicitada_em)::bigint::text: a chave do nudge passa a ser {candidatura}:revisao_solicitada:{ciclo}:{user_id}, porque a reabertura (D-01) permite um 2o ciclo de revisao sobre a mesma candidatura.';

COMMENT ON FUNCTION public.trg_notif_revisao_respondida() IS
  'Phase 42 / 42-08 REVISAO-04 (D-P42-14): despacha o aviso ao CANDIDATO de que sua solicitacao de revisao da decisao (Art. 20) foi respondida. AFTER UPDATE OF revisao_respondida_em em decisao_final, guard de transicao NULL -> NOT NULL. Corpo ids-only (evento + candidatura_id) via Bearer self-auth do Vault (project_url + edge_invoke_key, NUNCA a chave de servidor privilegiada — a igualdade esta quebrada por rotacao), graceful-skip se algum segredo faltar, fail-open num EXCEPTION WHEN OTHERS. O VEREDITO NAO viaja no payload: a EF o le de decisao_final.revisao_veredito com privilegio proprio, para nao criar um segundo registro da mesma verdade. AT-MOST-ONCE: a EF notificar-candidato tem de aceitar o evento revisao_respondida ANTES deste trigger existir, senao a notificacao se perde sem erro em lugar nenhum. UNICO DESPACHANTE deste evento — responder_revisao_decisao nunca chama net.http_post; dois despachantes produziriam e-mail duplo ou colisao de dedupe_key. Diferente do evento de RH, ESTE evento CONTINUA elegivel a varrer_retry_notificacoes: o candidato nao tem fila onde recuperar um aviso perdido. '
  'Desde 2026-09-21 (48-08) o corpo carrega tambem ciclo = extract(epoch from revisao_solicitada_em)::bigint::text (o MESMO do pedido): a chave passa a ser {candidatura}:revisao_respondida:{ciclo}. A premissa de uma revisao por candidatura (20260730000004:196-200) caiu com a reabertura (D-01).';

-- ---------------------------------------------------------------------------
-- PÓS-PORTÃO — o `ciclo` está nas duas; a mudança é UMA em cada (sem o fragmento, o corpo
-- volta ao md5 vivo); os dois TRIGGERS seguem vivos e com a mesma forma.
-- ---------------------------------------------------------------------------
DO $pos_p48_08b$
DECLARE
  c_frag constant text := E',\n        ''ciclo'', extract(epoch from NEW.revisao_solicitada_em)::bigint::text';
  v_sol  text;
  v_res  text;
BEGIN
  SELECT p.prosrc INTO v_sol FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.trg_notif_revisao_solicitada()'::regprocedure;
  SELECT p.prosrc INTO v_res FROM pg_catalog.pg_proc p
   WHERE p.oid = 'public.trg_notif_revisao_respondida()'::regprocedure;

  IF position('''ciclo''' IN pg_get_functiondef('public.trg_notif_revisao_solicitada()'::regprocedure)) = 0
     OR position('''ciclo''' IN pg_get_functiondef('public.trg_notif_revisao_respondida()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'P48-08: uma das funcoes de trigger de revisao foi instalada SEM o ciclo no corpo';
  END IF;
  IF md5(replace(v_sol, c_frag, '')) IS DISTINCT FROM '2536b7d29c5537daf023cb6b28208f3e' THEN
    RAISE EXCEPTION 'P48-08: trg_notif_revisao_solicitada — a mudanca NAO e so o ciclo (sem o fragmento o corpo deveria voltar ao md5 vivo 2536b7d2…)';
  END IF;
  IF md5(replace(v_res, c_frag, '')) IS DISTINCT FROM '1085057921f2682b7ef99c3a2bbe83a6' THEN
    RAISE EXCEPTION 'P48-08: trg_notif_revisao_respondida — a mudanca NAO e so o ciclo (sem o fragmento o corpo deveria voltar ao md5 vivo 10850579…)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
     WHERE t.tgrelid = 'public.decisao_final'::regclass AND NOT t.tgisinternal
       AND t.tgname = 'trg_notif_revisao_solicitada'
       AND pg_get_triggerdef(t.oid) LIKE '%AFTER UPDATE OF revisao_solicitada_em ON public.decisao_final%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger t
     WHERE t.tgrelid = 'public.decisao_final'::regclass AND NOT t.tgisinternal
       AND t.tgname = 'trg_notif_revisao_respondida'
       AND pg_get_triggerdef(t.oid) LIKE '%AFTER UPDATE OF revisao_respondida_em ON public.decisao_final%'
  ) THEN
    RAISE EXCEPTION 'P48-08: um dos triggers de revisao em decisao_final sumiu ou mudou de forma';
  END IF;
END
$pos_p48_08b$;
