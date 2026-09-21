-- =============================================================================
-- Phase 48 / Plano 48-09 — smoke da rejeição humana na triagem (JORN-22 · D-12 · D-20)
-- =============================================================================
-- O QUE ELE VIGIA. Duas migrations do 48-09:
--   · 20260921000008 — `explicacao_rejeicao_origem(uuid) → text`, o discriminador
--     'automatica' | 'humana_triagem' | NULL que a página de explicação consulta
--     quando não há linha em `decisao_final`;
--   · 20260921000009 — `rejeitar_candidatura` grava `feedback_rejeicao` NEUTRO no
--     MESMO UPDATE que rejeita (é o dado que faz o cartão do painel aparecer).
--
-- Prova, por EXECUÇÃO em PROD:
--   (a) `rejeitar_candidatura` grava EXATAMENTE o texto neutro em
--       `feedback_rejeicao`, diferente da `etapa_justificativa` do RH, sem o texto
--       nem o motivo do RH dentro dele, e deixa `data_decisao_final` nulo.
--   (b) o texto GRAVADO não casa o grep-guard de palavras dos e-mails de decisão
--       (`score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio`) nem
--       «teste psicológico».
--   (c) `explicacao_rejeicao_origem`: em andamento → NULL; depois da rejeição, JWT
--       do titular → 'humana_triagem'; JWT de OUTRO candidato → NULL; sem claims →
--       NULL; `anon` sem EXECUTE.
--   (d) knockout → 'automatica' com o JWT do titular — sobre fixture E sobre TODAS as
--       candidaturas reais com a forma do knockout (leitura, sem escrita).
--   (e) candidatura com linha em `decisao_final` rejeitada → NULL com o JWT do
--       titular — sobre fixture E sobre todas as reais (leitura). E, sobre as reais,
--       toda rejeição não-knockout sem `decisao_final` → 'humana_triagem'.
--   (f) ⊖ NEGATIVA — contagens de candidaturas, candidatos, auth.users,
--       historico_candidatura, decisao_final, notificacoes_enviadas e
--       net.http_request_queue idênticas antes e depois.
--
-- POR QUE AS LEITURAS REAIS EM (d)/(e) NÃO SÃO FOTOGRAFIA (D-17). Não há contagem
-- esperada: cada linha real que tem a forma é conferida contra a regra, qualquer que
-- seja o número delas hoje. Titular anonimizado (`candidatos.user_id` nulo) não tem
-- JWT possível e fica de fora — contado à parte, no resultado.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p48_rejeicao_triagem_smoke.sql`
-- — UMA requisição, UMA sessão (o contador `smoke48r.pass` é GUC de sessão). O
-- `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer FAIL é
-- `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL
-- encerrada por `RAISE EXCEPTION` com SQLSTATE próprio (`P48R1`), capturado logo
-- acima: ROLLBACK da subtransação inteira, inclusive das linhas que os triggers de
-- dispatch enfileiram em `net.http_request_queue` (a fila do `pg_net` é
-- transacional). A rejeição da fixture dispararia o e-mail `decisao` (NOTIFICACOES_MODO
-- = 'producao') — mas o `net.http_post` só sai depois do COMMIT, e nada daqui é
-- commitado. Nenhuma candidatura REAL é escrita: as leituras de (d)/(e) só trocam as
-- claims da sessão e chamam uma função STABLE.
-- Fixtures no idioma do `p48_candidatura_encerrada_smoke.sql`: titular sintético
-- (e-mail `@invalido.local`), candidatura nasce com `status = 'rejeitado'` (desarma
-- `trg_notif_confirmacao`) e é levada ao estado desejado por UPDATE. O contador é
-- incrementado FORA da subtransação (GUC é transacional).
--
-- GATE VERDE = `pass = 6` (a..f). Esperado FIXO: é o número de asserções DESTE
-- arquivo (escopo deliberado), não uma fotografia do banco.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke48r.pass', '0', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — identidades vivas (leitura) e contagens para (f).
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_admin uuid;
  v_vagas uuid[];
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P48R FAIL (baseline): nenhum administrador vivo — (a) precisa de ator real (historico_candidatura.ator e decisao_final.por_usuario -> auth.users)';
  END IF;

  SELECT array_agg(t.id ORDER BY t.created_at) INTO v_vagas
    FROM (SELECT v.id, v.created_at FROM public.vagas v ORDER BY v.created_at LIMIT 3) t;
  IF coalesce(array_length(v_vagas, 1), 0) < 3 THEN
    RAISE EXCEPTION 'P48R FAIL (baseline): menos de 3 vagas vivas — as 3 candidaturas do titular sintetico precisam de vagas distintas (UNIQUE (candidato_id, vaga_id))';
  END IF;

  PERFORM set_config('smoke48r.admin', v_admin::text, false);
  PERFORM set_config('smoke48r.vaga1', v_vagas[1]::text, false);
  PERFORM set_config('smoke48r.vaga2', v_vagas[2]::text, false);
  PERFORM set_config('smoke48r.vaga3', v_vagas[3]::text, false);

  PERFORM set_config('smoke48r.n_cands',  (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke48r.n_candos', (SELECT count(*) FROM public.candidatos)::text, false);
  PERFORM set_config('smoke48r.n_users',  (SELECT count(*) FROM auth.users)::text, false);
  PERFORM set_config('smoke48r.n_hist',   (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke48r.n_df',     (SELECT count(*) FROM public.decisao_final)::text, false);
  PERFORM set_config('smoke48r.n_notif',  (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke48r.n_netq',   (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a)..(e) — comportamento. Fixture: um titular sintético com TRÊS candidaturas —
--   A em andamento (triagem, em_analise) que o administrador rejeita;
--   K com a forma exata do knockout (inscricao, rejeitado, knockout_automatico, opção);
--   D com decisão final rejeitada (linha em `decisao_final`).
-- Tudo numa subtransação revertida por P48R1; o julgamento vem depois, fora dela.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $abcde$
DECLARE
  c_texto   constant text := 'Após análise da sua candidatura pela nossa equipe, não seguiremos com ela neste momento.';
  c_token   constant text := 'TOKEN_JUSTIFICATIVA_SMOKE_P48R';
  c_guard   constant text := 'score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio|teste psicol';
  v_admin   uuid := current_setting('smoke48r.admin')::uuid;
  v_vaga1   uuid := current_setting('smoke48r.vaga1')::uuid;
  v_vaga2   uuid := current_setting('smoke48r.vaga2')::uuid;
  v_vaga3   uuid := current_setting('smoke48r.vaga3')::uuid;
  v_user    uuid := gen_random_uuid();
  v_outro   uuid := gen_random_uuid();
  v_email   text;
  v_cand    uuid;
  v_a       uuid;
  v_k       uuid;
  v_d       uuid;
  v_just    text;
  v_ran     boolean := false;
  v_err     text;
  -- (a)
  a_fb      text;  a_just text;  a_ddf timestamptz;  a_status text;  a_etapa text;
  -- (c)
  c_andamento text;  c_titular text;  c_outro text;  c_sem text;
  -- (d)(e)
  k_titular text;  d_titular text;
  -- real (leitura)
  r         record;
  v_obt     text;
  n_real_k  int := 0;  n_real_h int := 0;  n_real_df int := 0;  n_anon int := 0;
  v_diverg  text := '';
BEGIN
  v_just := 'Justificativa sintetica do smoke P48R, escrita pelo RH: ' || c_token || ' — nunca chega ao candidato.';

  BEGIN
    -- ── fixture ────────────────────────────────────────────────────────────────
    v_email := 'p48rsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P48R Titular', v_email, '(11) 96666-5544',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;

    -- A: em andamento DE VERDADE (INSERT rejeitado desarma o dispatch; UPDATE leva a em_analise)
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga1, 'triagem', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_a;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_a;

    -- K: a forma exata do knockout (submit_candidatura_atomic, 20260709000014:138-143)
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura,
                                     motivo_rejeicao, opcao_knockout_id, feedback_rejeicao)
    VALUES (v_cand, v_vaga2, 'inscricao', 'rejeitado', false, now() - interval '9 days',
            'knockout_automatico', gen_random_uuid(),
            'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.')
    RETURNING id INTO v_k;

    -- D: decisão final rejeitada (linha em decisao_final)
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga3, 'rejeitado', 'rejeitado', false, now() - interval '8 days')
    RETURNING id INTO v_d;
    INSERT INTO public.decisao_final (candidatura_id, decisao, justificativa, por_usuario)
    VALUES (v_d, 'rejeitado', 'Decisao final sintetica do smoke P48R, com mais de cinquenta caracteres.', v_admin);

    -- ── (c) antes: em andamento → NULL ─────────────────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_user::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, false);
    c_andamento := public.explicacao_rejeicao_origem(v_a);
    PERFORM set_config('request.jwt.claims', '', false);

    -- ── (a) a rejeição humana, pelo administrador ──────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    BEGIN
      PERFORM public.rejeitar_candidatura(v_a, 'reprovado_entrevista', v_just);
    EXCEPTION WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
    END;
    PERFORM set_config('request.jwt.claims', '', false);

    SELECT c.feedback_rejeicao, c.etapa_justificativa, c.data_decisao_final, c.status::text, c.etapa_atual::text
      INTO a_fb, a_just, a_ddf, a_status, a_etapa
      FROM public.candidaturas c WHERE c.id = v_a;

    -- ── (c) depois: titular / outro / sem claims ───────────────────────────────
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_user::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, false);
    c_titular := public.explicacao_rejeicao_origem(v_a);
    k_titular := public.explicacao_rejeicao_origem(v_k);   -- (d)
    d_titular := public.explicacao_rejeicao_origem(v_d);   -- (e)

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_outro::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, false);
    c_outro := public.explicacao_rejeicao_origem(v_a);

    PERFORM set_config('request.jwt.claims', '', false);
    c_sem := public.explicacao_rejeicao_origem(v_a);

    v_ran := true;
    RAISE EXCEPTION 'rollback_smoke48r' USING ERRCODE = 'P48R1';
  EXCEPTION
    WHEN sqlstate 'P48R1' THEN
      NULL;  -- reversão esperada
  END;

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);

  IF NOT v_ran THEN RAISE EXCEPTION 'P48R FAIL: a secao de comportamento nao rodou'; END IF;

  -- ── julgamento (a) ──────────────────────────────────────────────────────────
  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (a): rejeitar_candidatura recusou a candidatura em andamento: %', v_err;
  END IF;
  IF a_status IS DISTINCT FROM 'rejeitado' OR a_etapa IS DISTINCT FROM 'rejeitado' THEN
    RAISE EXCEPTION 'P48R FAIL (a): a rejeicao nao aconteceu (etapa %, status %) — as asserções abaixo passariam por vacuidade', a_etapa, a_status;
  END IF;
  IF a_fb IS DISTINCT FROM c_texto THEN
    RAISE EXCEPTION 'P48R FAIL (a): feedback_rejeicao gravado = %, esperado o texto neutro constante', coalesce(a_fb, '<NULL>');
  END IF;
  IF a_fb IS NOT DISTINCT FROM a_just THEN
    RAISE EXCEPTION 'P48R FAIL (a): feedback_rejeicao IGUAL a etapa_justificativa — o texto do RH chegaria ao candidato';
  END IF;
  IF position(c_token IN a_fb) > 0 OR position('reprovado_entrevista' IN a_fb) > 0 THEN
    RAISE EXCEPTION 'P48R FAIL (a): feedback_rejeicao carrega a justificativa ou o motivo do RH';
  END IF;
  IF position(c_token IN coalesce(a_just, '')) = 0 THEN
    RAISE EXCEPTION 'P48R FAIL (a): etapa_justificativa nao guardou o texto do RH — a comparacao acima seria sem base';
  END IF;
  IF a_ddf IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (a): data_decisao_final preenchida (%) — a rejeicao na triagem nao e decisao final', a_ddf;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── julgamento (b) ──────────────────────────────────────────────────────────
  IF a_fb ~* c_guard THEN
    RAISE EXCEPTION 'P48R FAIL (b): o feedback_rejeicao gravado casa o grep-guard de palavras: %', a_fb;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── julgamento (c) ──────────────────────────────────────────────────────────
  IF c_andamento IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (c): candidatura EM ANDAMENTO devolveu % (esperado NULL)', c_andamento;
  END IF;
  IF c_titular IS DISTINCT FROM 'humana_triagem' THEN
    RAISE EXCEPTION 'P48R FAIL (c): JWT do titular devolveu % (esperado humana_triagem)', coalesce(c_titular, '<NULL>');
  END IF;
  IF c_outro IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (c): JWT de OUTRO candidato devolveu % — oraculo de candidatura alheia', c_outro;
  END IF;
  IF c_sem IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (c): sem claims devolveu % (esperado NULL)', c_sem;
  END IF;
  IF has_function_privilege('anon', 'public.explicacao_rejeicao_origem(uuid)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'P48R FAIL (c): anon tem EXECUTE em explicacao_rejeicao_origem';
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── leituras reais (d)/(e) — sem escrita; só claims de sessão + função STABLE ──
  FOR r IN
    SELECT c.id,
           ca.user_id,
           (c.status::text = 'rejeitado'
            AND c.motivo_rejeicao = 'knockout_automatico'
            AND c.opcao_knockout_id IS NOT NULL)                                   AS eh_knockout,
           EXISTS (SELECT 1 FROM public.decisao_final d WHERE d.candidatura_id = c.id) AS tem_df,
           (c.status::text = 'rejeitado')                                          AS rejeitada,
           c.motivo_rejeicao
      FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
     WHERE c.status::text = 'rejeitado'
  LOOP
    IF r.user_id IS NULL THEN
      n_anon := n_anon + 1;
      CONTINUE;
    END IF;
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', r.user_id::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, false);
    v_obt := public.explicacao_rejeicao_origem(r.id);
    PERFORM set_config('request.jwt.claims', '', false);

    IF r.eh_knockout THEN
      n_real_k := n_real_k + 1;
      IF v_obt IS DISTINCT FROM 'automatica' THEN
        v_diverg := v_diverg || format('(d) %s knockout -> %s; ', r.id, coalesce(v_obt, 'NULL'));
      END IF;
    ELSIF r.tem_df THEN
      n_real_df := n_real_df + 1;
      IF v_obt IS NOT NULL THEN
        v_diverg := v_diverg || format('(e) %s com decisao_final -> %s; ', r.id, v_obt);
      END IF;
    ELSIF r.motivo_rejeicao IS DISTINCT FROM 'knockout_automatico' THEN
      n_real_h := n_real_h + 1;
      IF v_obt IS DISTINCT FROM 'humana_triagem' THEN
        v_diverg := v_diverg || format('(e) %s rejeicao humana sem decisao_final -> %s; ', r.id, coalesce(v_obt, 'NULL'));
      END IF;
    END IF;
  END LOOP;
  PERFORM set_config('request.jwt.claims', '', false);

  PERFORM set_config('smoke48r.n_real_k',  n_real_k::text,  false);
  PERFORM set_config('smoke48r.n_real_h',  n_real_h::text,  false);
  PERFORM set_config('smoke48r.n_real_df', n_real_df::text, false);
  PERFORM set_config('smoke48r.n_anon',    n_anon::text,    false);

  -- ── julgamento (d) ──────────────────────────────────────────────────────────
  IF k_titular IS DISTINCT FROM 'automatica' THEN
    RAISE EXCEPTION 'P48R FAIL (d): knockout da fixture com o JWT do titular devolveu % (esperado automatica)', coalesce(k_titular, '<NULL>');
  END IF;
  IF position('(d)' IN v_diverg) > 0 THEN
    RAISE EXCEPTION 'P48R FAIL (d): candidaturas REAIS de knockout fora da regra: %', v_diverg;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  -- ── julgamento (e) ──────────────────────────────────────────────────────────
  IF d_titular IS NOT NULL THEN
    RAISE EXCEPTION 'P48R FAIL (e): candidatura com decisao_final rejeitada devolveu % (esperado NULL — a pagina a atende pelo caminho humano com revisao)', d_titular;
  END IF;
  IF position('(e)' IN v_diverg) > 0 THEN
    RAISE EXCEPTION 'P48R FAIL (e): candidaturas REAIS fora da regra: %', v_diverg;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);
END
$abcde$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (f) ⊖ NEGATIVA DE RESÍDUO + gate de contagem.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $f$
DECLARE
  v_diverg text := '';
  v_pass   int;
BEGIN
  IF (SELECT count(*) FROM public.candidaturas)::text IS DISTINCT FROM current_setting('smoke48r.n_cands') THEN
    v_diverg := v_diverg || format('candidaturas %s -> %s; ', current_setting('smoke48r.n_cands'), (SELECT count(*) FROM public.candidaturas));
  END IF;
  IF (SELECT count(*) FROM public.candidatos)::text IS DISTINCT FROM current_setting('smoke48r.n_candos') THEN
    v_diverg := v_diverg || format('candidatos %s -> %s; ', current_setting('smoke48r.n_candos'), (SELECT count(*) FROM public.candidatos));
  END IF;
  IF (SELECT count(*) FROM auth.users)::text IS DISTINCT FROM current_setting('smoke48r.n_users') THEN
    v_diverg := v_diverg || format('auth.users %s -> %s; ', current_setting('smoke48r.n_users'), (SELECT count(*) FROM auth.users));
  END IF;
  IF (SELECT count(*) FROM public.historico_candidatura)::text IS DISTINCT FROM current_setting('smoke48r.n_hist') THEN
    v_diverg := v_diverg || format('historico_candidatura %s -> %s; ', current_setting('smoke48r.n_hist'), (SELECT count(*) FROM public.historico_candidatura));
  END IF;
  IF (SELECT count(*) FROM public.decisao_final)::text IS DISTINCT FROM current_setting('smoke48r.n_df') THEN
    v_diverg := v_diverg || format('decisao_final %s -> %s; ', current_setting('smoke48r.n_df'), (SELECT count(*) FROM public.decisao_final));
  END IF;
  IF (SELECT count(*) FROM public.notificacoes_enviadas)::text IS DISTINCT FROM current_setting('smoke48r.n_notif') THEN
    v_diverg := v_diverg || format('notificacoes_enviadas %s -> %s; ', current_setting('smoke48r.n_notif'), (SELECT count(*) FROM public.notificacoes_enviadas));
  END IF;
  IF (SELECT count(*) FROM net.http_request_queue)::text IS DISTINCT FROM current_setting('smoke48r.n_netq') THEN
    v_diverg := v_diverg || format('net.http_request_queue %s -> %s; ', current_setting('smoke48r.n_netq'), (SELECT count(*) FROM net.http_request_queue));
  END IF;
  IF (SELECT count(*) FROM public.candidatos WHERE email LIKE 'p48rsmoke-%@invalido.local') <> 0 THEN
    v_diverg := v_diverg || 'titular sintetico sobreviveu; ';
  END IF;

  IF v_diverg <> '' THEN
    RAISE EXCEPTION 'P48R FAIL (f): residuo do smoke (ou escrita concorrente — rodar de novo antes de concluir): %', v_diverg;
  END IF;
  PERFORM set_config('smoke48r.pass', (current_setting('smoke48r.pass')::int + 1)::text, false);

  v_pass := current_setting('smoke48r.pass')::int;
  IF v_pass <> 6 THEN
    RAISE EXCEPTION 'P48R FAIL (gate): % de 6 asserções passaram — alguma secao nao contou', v_pass;
  END IF;
END
$f$;

SELECT set_config('request.jwt.claims', '', false);
SELECT jsonb_build_object('smoke', 'p48_rejeicao_triagem',
                          'pass', current_setting('smoke48r.pass')::int,
                          'esperado', 6,
                          'reais_knockout', current_setting('smoke48r.n_real_k')::int,
                          'reais_humana_triagem', current_setting('smoke48r.n_real_h')::int,
                          'reais_com_decisao_final', current_setting('smoke48r.n_real_df')::int,
                          'reais_titular_anonimizado', current_setting('smoke48r.n_anon')::int) AS resultado;
