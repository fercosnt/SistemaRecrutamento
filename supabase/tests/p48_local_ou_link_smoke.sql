-- =============================================================================
-- Phase 48 / Plano 48-03 — JORN-D5 : `local_ou_link` obrigatório e validado na escrita
-- =============================================================================
-- Prova, por EXECUÇÃO em PROD, a migration 20260921000003_p48_local_ou_link_valida.sql
-- (função `validar_local_ou_link_agendamento` + triggers `trg_agendamento_valida_local_ins`
-- e `trg_agendamento_valida_local_upd` em `agendamentos_entrevista`).
--
-- RODAR COM: node p46apply.cjs run supabase/tests/p48_local_ou_link_smoke.sql
--
-- COMO NÃO DEIXA RASTRO. Toda escrita acontece numa SUBTRANSAÇÃO que termina com uma
-- exceção-sentinela e é revertida inteira. Os `net.http_post` que `trg_notif_convite`
-- (AFTER INSERT) e `trg_notif_convite_reagendamento` (AFTER UPDATE) enfileiram são
-- linhas em `net.http_request_queue` escritas na MESMA subtransação — a reversão as
-- descarta, e nenhum convite sai. Os resultados de cada caso ficam em variáveis
-- PL/pgSQL (que sobrevivem à reversão) e são asseridos DEPOIS dela.
--
-- FIXTURE: nenhuma linha nova sobrevive. Os INSERTs usam a candidatura da linha legada
-- `online`/`dddd` (conta de teste `+claude4`, localizada por `tipo='online' AND
-- local_ou_link='dddd'`), sob `SET ROLE authenticated` com claim de `administrador` de um
-- `usuarios_rh` real ativo — o mesmo caminho do PostgREST (policy `rh_gerencia_agendamento`).
-- Não achar a linha legada ou o administrador REPROVA — não pula.
--
-- ASSERÇÕES (cada uma conta 1 PASS; esperado 9):
--   (a) INSERT online com 'dddd'                                   → 23514 (check_violation)
--   (b) INSERT online com https://meet.google.com/abc-defg-hij      → aceito
--   (c) INSERT presencial com um ENDEREÇO (dígitos, vírgula, sem esquema) → aceito
--   (d) INSERT presencial com '', '   ' e NULL                      → 23514 nos três
--   (e) INSERT online com NULL                                     → 23514
--   (f) INSERT online com 'javascript:alert(1)', 'data:text/html,…' e 'https://' (sem host)
--                                                                  → 23514 nos três
--   (g) Na linha LEGADA 'dddd': UPDATE data_hora, UPDATE compareceu, UPDATE status='cancelada'
--       e um UPDATE que REPETE local_ou_link/tipo com o mesmo valor (o formulário manda o
--       patch inteiro) → os quatro aceitos, 1 linha cada. É a prova de que o trigger não
--       tornou a linha legada impossível de cancelar (o motivo de não ser CHECK NOT VALID).
--   (h) UPDATE da mesma linha para local_ou_link='eeee'             → 23514
--   (i) ⊖ NEGATIVA — contagem e impressão digital (md5 do to_jsonb de cada linha) de
--       `agendamentos_entrevista` IDÊNTICAS antes e depois; a linha legada continua 'dddd'.
--
-- Recusa só conta se vier DESTE trigger: SQLSTATE 23514 E a mensagem cita `local_ou_link`
-- (um 42501 de RLS, por exemplo, não passa por recusa correta).
--
-- HIGIENE: NOTICEs e mensagens carregam SQLSTATEs e contagens — nunca e-mail ou nome.
-- =============================================================================

RESET ROLE;
SELECT set_config('smoke48l.pass', '0', false);

DO $l$
DECLARE
  v_n_antes   bigint;
  v_fp_antes  text;
  v_n_depois  bigint;
  v_fp_depois text;
  v_n_leg     int;
  v_leg       uuid;
  v_cand      uuid;
  v_vaga      uuid;
  v_admin     uuid;
  v_inesperado text;
  v_rc        int;
  v_valor_leg text;
  v_pass      int := 0;
  v_diverg    text := '';

  r_a  text;  r_b  text;  r_c  text;
  r_d1 text;  r_d2 text;  r_d3 text;
  r_e  text;
  r_f1 text;  r_f2 text;  r_f3 text;
  r_g1 text;  r_g2 text;  r_g3 text;  r_g4 text;
  r_h  text;
BEGIN
  -- ── baseline de (i), capturada NESTA execução ─────────────────────────────
  SELECT count(*), md5(coalesce(string_agg(to_jsonb(a)::text, E'\n' ORDER BY a.id), ''))
    INTO v_n_antes, v_fp_antes
    FROM public.agendamentos_entrevista a;

  -- ── fixture: a linha legada e um administrador real ──────────────────────
  SELECT count(*) INTO v_n_leg
    FROM public.agendamentos_entrevista
   WHERE tipo = 'online' AND local_ou_link = 'dddd';
  IF v_n_leg <> 1 THEN
    RAISE EXCEPTION 'P48L FAIL (fixture): esperada exatamente 1 linha legada online/dddd, achadas % — a borda (g) nao pode ser provada', v_n_leg;
  END IF;
  SELECT id, candidatura_id INTO v_leg, v_cand
    FROM public.agendamentos_entrevista
   WHERE tipo = 'online' AND local_ou_link = 'dddd';
  SELECT vaga_id INTO v_vaga FROM public.candidaturas WHERE id = v_cand;

  SELECT user_id INTO v_admin
    FROM public.usuarios_rh
   WHERE role::text = 'administrador' AND ativo AND deleted_at IS NULL AND user_id IS NOT NULL
   ORDER BY user_id LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P48L FAIL (fixture): nenhum usuarios_rh administrador ativo para a claim';
  END IF;

  -- ── subtransação que REVERTE ──────────────────────────────────────────────
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text, 'role', 'authenticated',
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    EXECUTE 'SET ROLE authenticated';

    -- (a)
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'online', now() + interval '5 days', 'dddd');
      r_a := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_a := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;

    -- (b)
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'online', now() + interval '5 days', 'https://meet.google.com/abc-defg-hij');
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      r_b := 'aceitou:' || v_rc;
    EXCEPTION WHEN OTHERS THEN r_b := SQLSTATE || ':' || SQLERRM;
    END;

    -- (c)
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'presencial', now() + interval '5 days',
             'Av. Paulista, 1000 - sala 2, Bela Vista, Sao Paulo/SP');
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      r_c := 'aceitou:' || v_rc;
    EXCEPTION WHEN OTHERS THEN r_c := SQLSTATE || ':' || SQLERRM;
    END;

    -- (d) presencial vazio / só espaços / NULL
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'presencial', now() + interval '5 days', '');
      r_d1 := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_d1 := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'presencial', now() + interval '5 days', '   ');
      r_d2 := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_d2 := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'presencial', now() + interval '5 days', NULL);
      r_d3 := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_d3 := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;

    -- (e) online NULL
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'online', now() + interval '5 days', NULL);
      r_e := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_e := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;

    -- (f) esquemas perigosos e URL sem host
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'online', now() + interval '5 days', 'javascript:alert(1)');
      r_f1 := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_f1 := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'online', now() + interval '5 days', 'data:text/html,<b>x</b>');
      r_f2 := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_f2 := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;
    BEGIN
      INSERT INTO public.agendamentos_entrevista (candidatura_id, vaga_id, tipo, data_hora, local_ou_link)
      VALUES (v_cand, v_vaga, 'online', now() + interval '5 days', 'https://');
      r_f3 := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_f3 := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;

    -- (g) a linha legada continua editável nas outras colunas
    BEGIN
      UPDATE public.agendamentos_entrevista SET data_hora = data_hora + interval '1 day' WHERE id = v_leg;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      r_g1 := 'aceitou:' || v_rc;
    EXCEPTION WHEN OTHERS THEN r_g1 := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      UPDATE public.agendamentos_entrevista SET compareceu = true WHERE id = v_leg;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      r_g2 := 'aceitou:' || v_rc;
    EXCEPTION WHEN OTHERS THEN r_g2 := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      UPDATE public.agendamentos_entrevista
         SET local_ou_link = local_ou_link, tipo = tipo, entrevistador = '[SMOKE P48L]'
       WHERE id = v_leg;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      r_g4 := 'aceitou:' || v_rc;
    EXCEPTION WHEN OTHERS THEN r_g4 := SQLSTATE || ':' || SQLERRM;
    END;
    BEGIN
      UPDATE public.agendamentos_entrevista SET status = 'cancelada' WHERE id = v_leg;
      GET DIAGNOSTICS v_rc = ROW_COUNT;
      r_g3 := 'aceitou:' || v_rc;
    EXCEPTION WHEN OTHERS THEN r_g3 := SQLSTATE || ':' || SQLERRM;
    END;

    -- (h) mudar o link da linha legada para outro inválido
    BEGIN
      UPDATE public.agendamentos_entrevista SET local_ou_link = 'eeee' WHERE id = v_leg;
      r_h := 'aceitou';
    EXCEPTION WHEN OTHERS THEN r_h := SQLSTATE || CASE WHEN SQLERRM LIKE '%local_ou_link%' THEN ':trigger' ELSE ':' || SQLERRM END;
    END;

    RAISE EXCEPTION 'P48L_REVERT';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM IS DISTINCT FROM 'P48L_REVERT' THEN
      v_inesperado := SQLSTATE || ': ' || SQLERRM;
    END IF;
  END;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_inesperado IS NOT NULL THEN
    RAISE EXCEPTION 'P48L FAIL (subtransacao): erro inesperado fora dos casos — %', v_inesperado;
  END IF;

  -- ── asserções ─────────────────────────────────────────────────────────────
  IF r_a IS DISTINCT FROM '23514:trigger' THEN
    RAISE EXCEPTION 'P48L FAIL (a): INSERT online/dddd deu % (esperado 23514 do trigger)', r_a;
  END IF;
  v_pass := v_pass + 1;

  IF r_b IS DISTINCT FROM 'aceitou:1' THEN
    RAISE EXCEPTION 'P48L FAIL (b): INSERT online com link valido deu % (esperado aceito)', r_b;
  END IF;
  v_pass := v_pass + 1;

  IF r_c IS DISTINCT FROM 'aceitou:1' THEN
    RAISE EXCEPTION 'P48L FAIL (c): INSERT presencial com endereco deu % (esperado aceito — o campo guarda endereco no presencial)', r_c;
  END IF;
  v_pass := v_pass + 1;

  IF (r_d1, r_d2, r_d3) IS DISTINCT FROM ('23514:trigger', '23514:trigger', '23514:trigger') THEN
    RAISE EXCEPTION 'P48L FAIL (d): presencial vazio/espacos/NULL deu (%, %, %) (esperado 23514 do trigger nos tres)', r_d1, r_d2, r_d3;
  END IF;
  v_pass := v_pass + 1;

  IF r_e IS DISTINCT FROM '23514:trigger' THEN
    RAISE EXCEPTION 'P48L FAIL (e): INSERT online/NULL deu % (esperado 23514 do trigger)', r_e;
  END IF;
  v_pass := v_pass + 1;

  IF (r_f1, r_f2, r_f3) IS DISTINCT FROM ('23514:trigger', '23514:trigger', '23514:trigger') THEN
    RAISE EXCEPTION 'P48L FAIL (f): javascript:/data:/https:// sem host deu (%, %, %) (esperado 23514 do trigger nos tres)', r_f1, r_f2, r_f3;
  END IF;
  v_pass := v_pass + 1;

  IF (r_g1, r_g2, r_g3, r_g4) IS DISTINCT FROM ('aceitou:1', 'aceitou:1', 'aceitou:1', 'aceitou:1') THEN
    RAISE EXCEPTION 'P48L FAIL (g): a linha legada dddd deixou de ser editavel — data_hora %, compareceu %, cancelar %, patch com o mesmo link %', r_g1, r_g2, r_g3, r_g4;
  END IF;
  v_pass := v_pass + 1;

  IF r_h IS DISTINCT FROM '23514:trigger' THEN
    RAISE EXCEPTION 'P48L FAIL (h): trocar o link da linha legada para eeee deu % (esperado 23514 do trigger)', r_h;
  END IF;
  v_pass := v_pass + 1;

  -- (i) ⊖ zero resíduo
  SELECT count(*), md5(coalesce(string_agg(to_jsonb(a)::text, E'\n' ORDER BY a.id), ''))
    INTO v_n_depois, v_fp_depois
    FROM public.agendamentos_entrevista a;
  SELECT local_ou_link INTO v_valor_leg FROM public.agendamentos_entrevista WHERE id = v_leg;
  IF v_n_depois IS DISTINCT FROM v_n_antes THEN
    v_diverg := v_diverg || format('contagem %s -> %s; ', v_n_antes, v_n_depois);
  END IF;
  IF v_fp_depois IS DISTINCT FROM v_fp_antes THEN
    v_diverg := v_diverg || 'impressao digital mudou; ';
  END IF;
  IF v_valor_leg IS DISTINCT FROM 'dddd' THEN
    v_diverg := v_diverg || 'a linha legada nao e mais dddd; ';
  END IF;
  IF v_diverg <> '' THEN
    RAISE EXCEPTION 'P48L FAIL (i): RESIDUO EM PROD — %', v_diverg;
  END IF;
  v_pass := v_pass + 1;

  PERFORM set_config('smoke48l.pass', v_pass::text, false);
  IF v_pass IS DISTINCT FROM 9 THEN
    RAISE EXCEPTION 'P48L FAIL (z): % PASS de 9 esperadas — run parcial, NAO tratar como verde', v_pass;
  END IF;
  RAISE NOTICE 'P48L RESUMO: % de 9 — zero residuo (% linhas, fp %)', v_pass, v_n_depois, v_fp_depois;
END
$l$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT jsonb_build_object('smoke', 'p48_local_ou_link',
                          'pass', current_setting('smoke48l.pass')::int,
                          'esperado', 9) AS resultado;
