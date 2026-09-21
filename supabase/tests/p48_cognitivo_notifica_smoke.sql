-- =============================================================================
-- Phase 48 / Plano 48-10 — smoke do aviso da liberação cognitiva (JORN-15 · D-22)
-- =============================================================================
-- O QUE ELE VIGIA. A migration 20260921000010 pôs `trg_notif_cognitivo_liberado` em
-- `public.cognitivo_liberacao`: liberar a avaliação cognitiva despacha o evento
-- `cognitivo_liberado` para `/functions/v1/notificar-candidato`, com
-- `ciclo = extract(epoch from liberado_em)::bigint::text`. O guard de transição no corpo
-- decide quando uma liberação é aviso NOVO.
--
-- Prova, por EXECUÇÃO em PROD, numa subtransação que REVERTE, com claim de administrador:
--   (a) `liberar_cognitivo` → EXATAMENTE 1 linha nova em `net.http_request_queue` para
--       notificar-candidato, com `evento='cognitivo_liberado'`, a `candidatura_id` da fixture
--       e `ciclo` = epoch de `liberado_em` (forma `^\d{1,12}$`).
--   (b) `liberar_cognitivo` de novo, SEM revogar (liberação vigente) → 0 linha nova. Clicar
--       «Liberar» duas vezes não manda dois e-mails.
--   (c) `revogar_cognitivo` → 0 linha nova (revogar não é comunicado); `liberar_cognitivo` de
--       novo (RE-liberação depois da revogação) → 1 linha nova.
--       ⚠ Dentro de uma transação `now()` é CONSTANTE, então o `ciclo` da re-liberação repete
--       o da primeira. A asserção é sobre o DESPACHO (o trigger enfileira), não sobre o valor
--       do ciclo: em uso real as duas liberações são transações diferentes, `liberado_em`
--       difere e a EF produz duas chaves. A diferenciação da chave é provada nos testes Deno
--       da EF (`48-10 — montarDedupeKey(...)`).
--   (d) catálogo — o CHECK vivo aceita `cognitivo_liberado`, a classe é `transacional`, o
--       trigger existe, está habilitado e aponta para a função; a varredura de retry NÃO
--       exclui o evento (é de candidato).
--   (e) ⊖ NEGATIVA — nada da fixture sobrevive (candidatura, liberação, fila) e as contagens
--       globais de `cognitivo_liberacao` e da fila são as mesmas antes e depois.
--
-- A FIXTURE NÃO É UMA CANDIDATURA REAL (desvio deliberado da letra do plano, no idioma do
-- 48-08 e do 48-09). O plano pedia «uma candidatura real de conta de teste em andamento». As
-- contas `+claude` podem estar sendo exercitadas pelo operador em PROD (plano 48-05) — um
-- UPDATE nelas, mesmo revertido, disputa lock de linha com o fluxo vivo. O que se prova é o
-- corpo que o TRIGGER monta, e o trigger não distingue conta de teste de fixture: titular
-- sintético (`@invalido.local`), candidatura que nasce `status = 'rejeitado'` (desarma
-- `trg_notif_confirmacao`) e é levada a `em_analise` por UPDATE (`liberar_cognitivo` recusa
-- candidatura encerrada).
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL encerrada
-- por `RAISE EXCEPTION` com SQLSTATE próprio (`P48C1`), capturado logo acima: ROLLBACK da
-- subtransação inteira, inclusive das linhas que o trigger enfileira em `net.http_request_queue`
-- (a fila do `pg_net` é transacional: o worker só vê o que foi COMMITADO).
-- NOTIFICACOES_MODO = 'producao', mas nada daqui é commitado — nenhum e-mail sai. Os valores
-- medidos ficam em variáveis PL/pgSQL (que NÃO são revertidas) e o julgamento é feito depois,
-- fora da subtransação. O contador é incrementado fora dela (GUC é transacional).
--
-- POR QUE AS CONTAGENS GLOBAIS DE (e) NÃO SÃO FOTOGRAFIA (D-17). São baseline capturada NA
-- PRÓPRIA execução. A asserção que decide é a de resíduo ESCOPADA à fixture; a global é o
-- cinto — e se ela divergir com resíduo zero, a mensagem diz que o delta veio de tráfego
-- concorrente (outra transação commitou no meio da requisição), para não ser lida como vazamento.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p48_cognitivo_notifica_smoke.sql` — UMA
-- requisição, UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer
-- FAIL é `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO: é o número de asserções DESTE arquivo
-- (escopo deliberado), não uma fotografia do banco.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke48c.pass', '0', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — identidades vivas (leitura) e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_admin uuid;
  v_vaga  uuid;
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P48C FAIL (baseline): nenhum administrador vivo — liberar_cognitivo exige papel rh/administrador';
  END IF;

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P48C FAIL (baseline): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke48c.admin', v_admin::text, false);
  PERFORM set_config('smoke48c.vaga',  v_vaga::text, false);
  PERFORM set_config('smoke48c.n_lib',  (SELECT count(*) FROM public.cognitivo_liberacao)::text, false);
  PERFORM set_config('smoke48c.n_netq', (SELECT count(*) FROM net.http_request_queue)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (a) (b) (c) (e) — liberar, liberar de novo, revogar, re-liberar; tudo revertido.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $abce$
DECLARE
  v_admin  uuid := current_setting('smoke48c.admin')::uuid;
  v_vaga   uuid := current_setting('smoke48c.vaga')::uuid;
  v_user   uuid := gen_random_uuid();
  v_email  text;
  v_cand   uuid;
  v_a      uuid;
  v_ran    boolean := false;
  v_err    text;
  -- medido dentro da subtransação
  n0 int; n1 int; n2 int; n3 int; n4 int;
  a_corpo  jsonb;
  a_ciclo  text;
  c_corpo  jsonb;
  n_lib_fx int;
  -- (e)
  e_cand   int;  e_lib int;  e_fila int;
  e_lib_g  bigint;  e_netq_g bigint;
BEGIN
  BEGIN
    -- ── fixture ────────────────────────────────────────────────────────────────
    v_email := 'p48csmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P48C Titular', v_email, '(11) 96666-5544',
       DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;

    -- em andamento DE VERDADE (INSERT rejeitado desarma o dispatch da confirmação; UPDATE leva a em_analise)
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'entrevista_presencial', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_a;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_a;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);

    SELECT count(*) INTO n0 FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text;

    -- ── (a) primeira liberação ─────────────────────────────────────────────────
    PERFORM public.liberar_cognitivo(v_a, 'smoke P48C (a)');
    SELECT count(*), max(convert_from(q.body, 'UTF8'))::jsonb INTO n1, a_corpo
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text;
    SELECT extract(epoch from l.liberado_em)::bigint::text INTO a_ciclo
      FROM public.cognitivo_liberacao l WHERE l.candidatura_id = v_a;

    -- ── (b) clicar «Liberar» de novo numa liberação vigente ───────────────────
    PERFORM public.liberar_cognitivo(v_a, NULL);
    SELECT count(*) INTO n2 FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text;

    -- ── (c) revogar, depois re-liberar ─────────────────────────────────────────
    PERFORM public.revogar_cognitivo(v_a, 'smoke P48C (c)');
    SELECT count(*) INTO n3 FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text;

    PERFORM public.liberar_cognitivo(v_a, NULL);
    SELECT count(*) INTO n4 FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text;
    SELECT convert_from(q.body, 'UTF8')::jsonb INTO c_corpo
      FROM net.http_request_queue q
     WHERE q.url LIKE '%/functions/v1/notificar-candidato'
       AND convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = v_a::text
     ORDER BY q.id DESC
     LIMIT 1;

    SELECT count(*) INTO n_lib_fx FROM public.cognitivo_liberacao l WHERE l.candidatura_id = v_a;

    PERFORM set_config('request.jwt.claims', '', false);
    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P48C1';
  EXCEPTION
    WHEN SQLSTATE 'P48C1' THEN NULL;  -- ROLLBACK: fixture, liberação e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P48C FAIL (a): a fixture/liberação não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (a) julgamento ────────────────────────────────────────────────────────────
  IF n0 <> 0 THEN
    RAISE EXCEPTION 'P48C FAIL (a): a fixture já tinha % despacho(s) para notificar-candidato ANTES da liberação — a fixture não está desarmada', n0;
  END IF;
  IF n1 - n0 <> 1 THEN
    RAISE EXCEPTION 'P48C FAIL (a): liberar_cognitivo gerou % linha(s) na fila para notificar-candidato (esperado exatamente 1 — trg_notif_cognitivo_liberado não disparou, ou disparou em dobro)', n1 - n0;
  END IF;
  IF a_corpo ->> 'evento' IS DISTINCT FROM 'cognitivo_liberado' THEN
    RAISE EXCEPTION 'P48C FAIL (a): o despacho da liberação não é o evento cognitivo_liberado: %', a_corpo;
  END IF;
  IF a_corpo ->> 'ciclo' IS NULL OR a_corpo ->> 'ciclo' !~ '^\d{1,12}$'
     OR a_corpo ->> 'ciclo' IS DISTINCT FROM a_ciclo THEN
    RAISE EXCEPTION 'P48C FAIL (a): o corpo não carrega o ciclo da liberação — ciclo no corpo = %, epoch de liberado_em = %. Corpo: %',
      coalesce(a_corpo ->> 'ciclo', '<ausente>'), coalesce(a_ciclo, '<nulo>'), a_corpo;
  END IF;
  IF n_lib_fx <> 1 THEN
    RAISE EXCEPTION 'P48C FAIL (a): % linha(s) de cognitivo_liberacao para a fixture (esperado 1 — o upsert por candidatura)', n_lib_fx;
  END IF;
  PERFORM set_config('smoke48c.pass', (current_setting('smoke48c.pass')::int + 1)::text, false);

  -- ── (b) julgamento ────────────────────────────────────────────────────────────
  IF n2 - n1 <> 0 THEN
    RAISE EXCEPTION 'P48C FAIL (b): liberar de novo uma liberação VIGENTE gerou % despacho(s) (esperado 0 — clicar «Liberar» duas vezes mandaria dois e-mails)', n2 - n1;
  END IF;
  PERFORM set_config('smoke48c.pass', (current_setting('smoke48c.pass')::int + 1)::text, false);

  -- ── (c) julgamento ────────────────────────────────────────────────────────────
  IF n3 - n2 <> 0 THEN
    RAISE EXCEPTION 'P48C FAIL (c): revogar_cognitivo gerou % despacho(s) (esperado 0 — revogar não é comunicado ao candidato)', n3 - n2;
  END IF;
  IF n4 - n3 <> 1 THEN
    RAISE EXCEPTION 'P48C FAIL (c): a RE-liberação depois da revogação gerou % despacho(s) (esperado exatamente 1 — é aviso novo)', n4 - n3;
  END IF;
  IF c_corpo ->> 'evento' IS DISTINCT FROM 'cognitivo_liberado' OR c_corpo ->> 'ciclo' IS NULL THEN
    RAISE EXCEPTION 'P48C FAIL (c): o despacho da re-liberação não é cognitivo_liberado com ciclo: %', c_corpo;
  END IF;
  PERFORM set_config('smoke48c.pass', (current_setting('smoke48c.pass')::int + 1)::text, false);

  -- ── (e) NEGATIVA — nada da fixture sobreviveu; globais iguais ────────────────
  SELECT count(*) INTO e_cand FROM public.candidaturas c WHERE c.id = v_a;
  SELECT count(*) INTO e_lib  FROM public.cognitivo_liberacao l WHERE l.candidatura_id = v_a;
  SELECT count(*) INTO e_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8') LIKE '%' || v_a::text || '%';
  IF e_cand <> 0 OR e_lib <> 0 OR e_fila <> 0 THEN
    RAISE EXCEPTION 'P48C FAIL (e): RESÍDUO da fixture — candidatura=% liberacao=% fila=% (a subtransação não reverteu; um despacho na fila COMMITADO sai como e-mail)', e_cand, e_lib, e_fila;
  END IF;
  SELECT count(*) INTO e_lib_g  FROM public.cognitivo_liberacao;
  SELECT count(*) INTO e_netq_g FROM net.http_request_queue;
  IF e_lib_g <> current_setting('smoke48c.n_lib')::bigint
     OR e_netq_g <> current_setting('smoke48c.n_netq')::bigint THEN
    RAISE EXCEPTION 'P48C FAIL (e): contagem global mudou (cognitivo_liberacao % -> %, fila % -> %) com resíduo ZERO da fixture — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke48c.n_lib'), e_lib_g, current_setting('smoke48c.n_netq'), e_netq_g;
  END IF;
  PERFORM set_config('smoke48c.pass', (current_setting('smoke48c.pass')::int + 1)::text, false);
END
$abce$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (d) catálogo — CHECK, classe, trigger e a varredura de retry.
-- ─────────────────────────────────────────────────────────────────────────────
DO $d$
DECLARE
  v_chk    text;
  v_classe text;
  v_retry  text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_chk
    FROM pg_constraint c
   WHERE c.conname = 'notificacoes_enviadas_evento_check'
     AND c.conrelid = 'public.notificacoes_enviadas'::regclass;
  IF position('''cognitivo_liberado''::text' IN coalesce(v_chk, '')) = 0 THEN
    RAISE EXCEPTION 'P48C FAIL (d): o CHECK vivo de evento NÃO aceita cognitivo_liberado — o claim da EF levaria 23514 e nenhum e-mail sairia: %', v_chk;
  END IF;

  SELECT classe INTO v_classe FROM public.classe_evento_notificacao WHERE evento = 'cognitivo_liberado';
  IF v_classe IS DISTINCT FROM 'transacional' THEN
    RAISE EXCEPTION 'P48C FAIL (d): classe de cognitivo_liberado = % (esperado transacional — sem classe o guard recusa com P0003)', coalesce(v_classe, '<ausente>');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
     WHERE t.tgrelid = 'public.cognitivo_liberacao'::regclass
       AND t.tgname = 'trg_notif_cognitivo_liberado'
       AND t.tgfoid = 'public.trg_notif_cognitivo_liberado()'::regprocedure
       AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION 'P48C FAIL (d): trg_notif_cognitivo_liberado ausente, desabilitado ou apontando para outra função';
  END IF;

  SELECT prosrc INTO v_retry FROM pg_proc
   WHERE oid = 'public.varrer_retry_notificacoes()'::regprocedure;
  IF position('cognitivo' IN v_retry) > 0 THEN
    RAISE EXCEPTION 'P48C FAIL (d): varrer_retry_notificacoes passou a mencionar cognitivo — evento de CANDIDATO não pode sair do retry (o candidato não tem fila onde recuperar um aviso perdido)';
  END IF;
  PERFORM set_config('smoke48c.pass', (current_setting('smoke48c.pass')::int + 1)::text, false);
END
$d$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke48c.pass')::int <> 5 THEN
    RAISE EXCEPTION 'P48C FAIL (gate): pass = % de 5 — alguma asserção não incrementou o contador', current_setting('smoke48c.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',    'p48_cognitivo_notifica',
  'pass',     current_setting('smoke48c.pass')::int,
  'esperado', 5,
  'n_lib',    current_setting('smoke48c.n_lib')::int,
  'n_netq',   current_setting('smoke48c.n_netq')::int
) AS resultado;
