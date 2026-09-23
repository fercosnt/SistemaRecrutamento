-- =============================================================================
-- Phase 49 / Plano 49-10 — smoke da ANÁLISE VIGENTE de entrevista
--                          (JORN-12 / JORN-28 / D-39..D-42 / D-65)
-- =============================================================================
-- O QUE ELE VIGIA.
--   · 20260922000007 — `public.registrar_analise_entrevista(...)`, o ÚNICO escritor de
--     `entrevista_analises` a partir da EF de transcrição: lock por
--     `(candidatura, tipo)`, reaproveitamento por `texto_hash` (D-40), superação por
--     MARCA (`superada_em = now()`, D-02) e upsert de `scores_candidato` devolvendo a
--     nota a `pendente_humano` com `score` NULL (D-42 / D-65).
--   · 20260922000008 — `salvar_avaliacao_entrevista` e `confirmar_revisao_entrevista`
--     passam a olhar a análise VIGENTE (pelo predicado único
--     `public.entrevista_analise_vigente` do 49-01) e trocam o guard de papel por
--     fail-closed.
--
--   O defeito que os dois consertos atacam é UM: os leitores DISCORDAVAM sobre qual
--   análise vale. Medido em PROD em 2026-09-22 — 6 análises em 3 candidaturas, `tipo`
--   NULL e `superada_em` NULL em TODAS, com 4 «vigentes» ao mesmo tempo numa delas. A
--   tela e a revisão pegavam a mais nova de qualquer estado; o portão de avanço olhava
--   todas até o 49-06; uma análise que falhava virava «a mais nova».
--
-- PARTE 1 — a vigente, numa subtransação que reverte (`P49V1`):
--   (a)  RPC com o texto A (`tipo='online'`) ⇒ exatamente UMA análise, e ela é VIGENTE.
--   (b)  RPC com o texto B ⇒ A fica com `superada_em` PREENCHIDA, B é a única vigente da
--        `(candidatura, online)`, e `scores_candidato` `tipo='entrevista'` está em
--        `pendente_humano` com `score` NULL. A superação é por MARCA: A continua na
--        tabela (D-02 — a trilha de decisão automatizada é direito do titular, Art. 20).
--   (c)  RPC com o texto A DE NOVO ⇒ `reaproveitada: true`, a contagem da candidatura
--        CONTINUA 2, e a vigente CONTINUA B. ⚠ É a decisão do operador (CONTEXT
--        §specifics): reenviar A devolve a análise A que já existe e NÃO a torna vigente
--        de novo. Medido em PROD: 2 das 4 análises de `bf26ee3c…` são replays do mesmo
--        texto — linhas que nunca deveriam ter nascido.
--   (d)  RPC com `p_status_analise='falhou'` ⇒ linha NOVA (never-absent: a falha é
--        registrada, não engolida), que NÃO é vigente e NÃO superou ninguém — a vigente
--        continua B. Era por aqui que uma falha de IA escondia da tela a análise boa.
--   (e)  `salvar_avaliacao_entrevista` (claims de administrador) grava em B, NÃO na
--        falha nem na superada; `confirmar_revisao_entrevista(A)` — a SUPERADA — é
--        RECUSADA com `check_violation`; `confirmar_revisao_entrevista(B)` passa.
--        ⚠ A recusa importa porque `revisao_confirmada_em` é o que o `avancar_etapa` lê
--        para LIBERAR a trava de língua/sotaque: confirmar na superada não libera nada
--        (e o RH fica sem entender por que o avanço segue travado).
--   (f)  RPC com o texto D ⇒ B fica superada e CONSERVA `scores_humanos`,
--        `notas_humanas`, `revisada_por` e `revisao_confirmada_em` (a revisão que o RH
--        fez continua legível), enquanto a nota consolidada volta a `pendente_humano`
--        com `score` NULL. É o D-42 inteiro: a revisão anterior não vale para um texto
--        que ela nunca viu, e também não é apagada.
--   (g)  RPC com `tipo='presencial'` ⇒ `superadas = 0` e a vigente da online (D)
--        INTACTA: UMA vigente POR TIPO. Os tipos são grupos independentes, e é por isso
--        que `tipo IS NOT DISTINCT FROM p_tipo` compara — `tipo` NULL (as 6 antigas, de
--        entrevista desconhecida) é um grupo próprio e não é superado por nenhum dos dois.
--   (h)  SEM claims ⇒ `salvar_avaliacao_entrevista` RECUSA com `insufficient_privilege`.
--        É o guard fail-closed: com `v_role` nulo a comparação direta devolvia NULL, o
--        `IF` não disparava, e quem chegava sem papel nenhum passava. `anon` tinha
--        EXECUTE nas duas RPCs por grant DIRETO do `pg_default_acl` (medido `true` em
--        2026-09-22), então esta não era uma porta teórica.
-- NEGATIVA:
--   (z)  nada das fixtures sobrevive (candidaturas, titulares, análises, notas,
--        histórico, fila) e as contagens globais são as de antes.
--
-- A FIXTURE NÃO É UMA CANDIDATURA REAL (idioma do 48-08/48-09/48-11/49-06/49-07): o
-- operador pode estar exercitando as contas `+claude` em PROD, e um UPDATE nelas — mesmo
-- revertido — disputa lock de linha com o fluxo vivo. Titular sintético `@invalido.local`;
-- candidatura que nasce `status='rejeitado'` (desarma `trg_notif_confirmacao`) e vai a
-- `em_analise` por UPDATE só de `status` — `candidaturas_avancar_etapa_trg` é
-- `BEFORE UPDATE OF etapa_atual` e não é acionado, e o ramo JORN-34 de
-- `guard_rejeicao_auditada` é escopado a `auth.uid() IS NOT NULL` (conferido no catálogo
-- em 2026-09-22). Os ATORES são reais — administrador ATIVO lido NA EXECUÇÃO (FK de
-- `entrevista_analises.revisada_por`), nunca conta fixa.
--
-- OS `texto_hash` SÃO SINTÉTICOS de propósito (`p49v:A`, `p49v:B`, `p49v:D`). O que a RPC
-- faz com o hash é comparar IGUALDADE; o cálculo do hash (que tem de bater com
-- `ai_call_logs.input_hash`) é do lado da EF, e é o `__tests__/index.test.ts` dela que o
-- prova contra o `inputHashDe`. Um sha256 real aqui não acrescentaria asserção nenhuma e
-- esconderia qual texto é qual na mensagem de falha.
--
-- ⚠ ESTE SMOKE ESCREVE — e TODA escrita acontece dentro de uma subtransação PL/pgSQL
-- encerrada por `RAISE EXCEPTION` com SQLSTATE próprio (`P49V1`), capturado logo acima:
-- ROLLBACK da subtransação inteira, inclusive das linhas que os triggers enfileiram em
-- `net.http_request_queue` (o worker do `pg_net` só vê o que foi COMMITADO).
-- NOTIFICACOES_MODO = 'producao', mas nada daqui é commitado — nenhum e-mail sai a
-- candidato real (D-54). Os valores medidos ficam em variáveis PL/pgSQL (não revertidas) e
-- o julgamento é feito FORA da subtransação. O contador é incrementado fora dela.
--
-- AS CONTAGENS GLOBAIS DE (z) NÃO SÃO FOTOGRAFIA (D-17): baseline capturada NA PRÓPRIA
-- execução. A asserção que decide é a de resíduo ESCOPADA às fixtures; a global é o cinto —
-- divergência com resíduo zero é tráfego concorrente commitado durante a requisição, e a
-- mensagem diz isso.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p49_analise_vigente_smoke.sql` — UMA
-- requisição, UMA sessão. O `SELECT` final devolve `{smoke, pass, esperado, ...}`; qualquer
-- FAIL é `RAISE EXCEPTION` e o `p46apply` sai com código ≠ 0.
--
-- GATE VERDE = `pass = esperado`. Esperado FIXO = o número de asserções DESTE arquivo
-- (escopo deliberado), não uma fotografia do banco. Hoje: 9 — a, b, c, d, e, f, g, h, z.
-- =============================================================================

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke49v.pass', '0', false);
SELECT set_config('smoke49v.fixtures', '', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — atores vivos (leitura) e contagens para a negativa.
-- ─────────────────────────────────────────────────────────────────────────────
DO $baseline$
DECLARE
  v_admin uuid;
  v_vaga  uuid;
BEGIN
  -- `salvar_avaliacao_entrevista` com papel `rh` exige posse da vaga; `administrador` não.
  -- Lido NA EXECUÇÃO — conta fixa envelhece (as contas RH de teste estão `ativo=false`).
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
   ORDER BY u.created_at, u.user_id
   LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P49V FAIL (baseline): nenhum administrador ATIVO — sem ele as asserções (e) e (h) não têm quem chame as RPCs de revisão';
  END IF;

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P49V FAIL (baseline): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke49v.admin', v_admin::text, false);
  PERFORM set_config('smoke49v.vaga',  v_vaga::text,  false);

  PERFORM set_config('smoke49v.n_cand',   (SELECT count(*) FROM public.candidaturas)::text, false);
  PERFORM set_config('smoke49v.n_ea',     (SELECT count(*) FROM public.entrevista_analises)::text, false);
  PERFORM set_config('smoke49v.n_sc',     (SELECT count(*) FROM public.scores_candidato)::text, false);
  PERFORM set_config('smoke49v.n_hist',   (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke49v.n_notif',  (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke49v.n_netq',   (SELECT count(*) FROM net.http_request_queue)::text, false);
  -- Cinto adicional: as análises SUPERADAS de PROD. Nenhuma asserção daqui pode marcar
  -- linha viva, e a marcação retroativa das 6 antigas é do plano 49-12 (checkpoint, D-54).
  PERFORM set_config('smoke49v.n_sup',
    (SELECT count(*) FROM public.entrevista_analises WHERE superada_em IS NOT NULL)::text, false);
END
$baseline$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — (a) … (h), numa subtransação que reverte (`P49V1`).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $p1$
DECLARE
  v_admin      uuid := current_setting('smoke49v.admin')::uuid;
  v_vaga       uuid := current_setting('smoke49v.vaga')::uuid;
  v_claims     text;
  v_ids        text := '';
  v_ran        boolean := false;
  v_err        text;
  v_user       uuid;
  v_email      text;
  v_cand       uuid;
  v_f1         uuid;
  v_ret        jsonb;
  c_comp  constant jsonb :=
    '[{"competency":"Resolucao de conflitos","score":4},{"competency":"Responsabilizacao","score":4}]'::jsonb;
  c_cit   constant jsonb := '[{"competency":"Resolucao de conflitos","cited_evidence":["ouvi cada uma"]}]'::jsonb;
  c_bias  constant jsonb := '[{"competency":"Resolucao de conflitos","bias_flags":{"regional_markers_ignored":true}}]'::jsonb;
  -- (a)
  a_id uuid;  a_n int;  a_vig boolean;  a_reap boolean;  a_sup_ret int;
  -- (b)
  b_id uuid;  b_n int;  b_sup_ret int;  b_a_superada timestamptz;
  b_vig_ids uuid[];  b_sc_status text;  b_sc_score numeric;
  -- (c)
  c_ret_id uuid;  c_reap boolean;  c_n int;  c_vig_ids uuid[];
  -- (d)
  d_id uuid;  d_vig boolean;  d_sup_ret int;  d_n int;  d_vig_ids uuid[];
  -- (e)
  e_alvo uuid;  e_conf_a text := '<sem excecao>';  e_conf_b boolean := false;
  e_salvar text;  e_conf_b_err text;
  e_b_rev timestamptz;  e_b_scores jsonb;  e_b_por uuid;
  -- (f)
  f_id uuid;  f_sup_ret int;  f_b_superada timestamptz;
  f_b_scores jsonb;  f_b_notas text;  f_b_por uuid;  f_b_rev timestamptz;
  f_sc_status text;  f_sc_score numeric;  f_vig_ids uuid[];
  -- (g)
  g_id uuid;  g_sup_ret int;  g_vig_online uuid[];  g_vig_pres uuid[];
  -- (h)
  h_sqlstate text := '<sem excecao>';
BEGIN
  v_claims := json_build_object('sub', v_admin::text,
                'app_metadata', json_build_object('role', 'administrador'))::text;

  BEGIN
    -- ── fixture F1 · titular sintético + candidatura em entrevista_online ─────
    v_user  := gen_random_uuid();
    v_email := 'p49vsmoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P49V Titular F1', v_email, '(11) 95555-5801',
       DATE '1991-02-20', 'Santos', 'SP', 'site')
    RETURNING id INTO v_cand;
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_cand, v_vaga, 'entrevista_online', 'rejeitado', false, now() - interval '10 days')
    RETURNING id INTO v_f1;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_f1;
    v_ids := v_ids || v_f1::text || ',';

    -- ── (a) · texto A, tipo online ⇒ UMA análise, VIGENTE ────────────────────
    v_ret := public.registrar_analise_entrevista(
      p_candidatura_id := v_f1, p_tipo := 'online', p_solicitado_por := v_admin,
      p_texto_hash := 'p49v:A', p_ai_call_log_id := NULL,
      p_provedor_ia := 'anthropic', p_modelo_ia := 'claude-sonnet-4-6-20260215',
      p_prompt_version := '1.0.0', p_status_analise := 'pendente_humano',
      p_competencias := c_comp, p_citacoes := c_cit, p_bias_flags := c_bias,
      p_bloqueio_avanco := false, p_score_metadata := '{"fonte":"smoke_p49v"}'::jsonb);
    a_id      := (v_ret ->> 'analise_id')::uuid;
    a_reap    := (v_ret ->> 'reaproveitada')::boolean;
    a_vig     := (v_ret ->> 'vigente')::boolean;
    a_sup_ret := (v_ret ->> 'superadas')::int;
    SELECT count(*) INTO a_n FROM public.entrevista_analises WHERE candidatura_id = v_f1;

    -- ── (b) · texto B ⇒ A superada por MARCA, B única vigente, nota pendente ─
    v_ret := public.registrar_analise_entrevista(
      p_candidatura_id := v_f1, p_tipo := 'online', p_solicitado_por := v_admin,
      p_texto_hash := 'p49v:B', p_ai_call_log_id := NULL,
      p_provedor_ia := 'anthropic', p_modelo_ia := 'claude-sonnet-4-6-20260215',
      p_prompt_version := '1.0.0', p_status_analise := 'pendente_humano',
      p_competencias := c_comp, p_citacoes := c_cit, p_bias_flags := c_bias,
      p_bloqueio_avanco := false, p_score_metadata := '{"fonte":"smoke_p49v"}'::jsonb);
    b_id      := (v_ret ->> 'analise_id')::uuid;
    b_sup_ret := (v_ret ->> 'superadas')::int;
    SELECT count(*) INTO b_n FROM public.entrevista_analises WHERE candidatura_id = v_f1;
    SELECT ea.superada_em INTO b_a_superada FROM public.entrevista_analises ea WHERE ea.id = a_id;
    SELECT coalesce(array_agg(ea.id ORDER BY ea.created_at), '{}'::uuid[]) INTO b_vig_ids
      FROM public.entrevista_analises ea
     WHERE ea.candidatura_id = v_f1 AND ea.tipo = 'online'
       AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);
    SELECT sc.status::text, sc.score INTO b_sc_status, b_sc_score
      FROM public.scores_candidato sc
     WHERE sc.candidatura_id = v_f1 AND sc.tipo = 'entrevista'
       AND sc.subtipo IS NULL AND sc.pergunta_id IS NULL;

    -- ── (c) · texto A DE NOVO ⇒ reaproveitada, nada criado, vigente segue B ──
    v_ret := public.registrar_analise_entrevista(
      p_candidatura_id := v_f1, p_tipo := 'online', p_solicitado_por := v_admin,
      p_texto_hash := 'p49v:A', p_ai_call_log_id := NULL,
      p_provedor_ia := 'anthropic', p_modelo_ia := 'claude-sonnet-4-6-20260215',
      p_prompt_version := '1.0.0', p_status_analise := 'pendente_humano',
      p_competencias := c_comp, p_citacoes := c_cit, p_bias_flags := c_bias,
      p_bloqueio_avanco := false, p_score_metadata := '{"fonte":"smoke_p49v"}'::jsonb);
    c_ret_id := (v_ret ->> 'analise_id')::uuid;
    c_reap   := (v_ret ->> 'reaproveitada')::boolean;
    SELECT count(*) INTO c_n FROM public.entrevista_analises WHERE candidatura_id = v_f1;
    SELECT coalesce(array_agg(ea.id ORDER BY ea.created_at), '{}'::uuid[]) INTO c_vig_ids
      FROM public.entrevista_analises ea
     WHERE ea.candidatura_id = v_f1 AND ea.tipo = 'online'
       AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);

    -- ── (d) · FALHA ⇒ linha nova, não vigente, não supera ninguém ────────────
    v_ret := public.registrar_analise_entrevista(
      p_candidatura_id := v_f1, p_tipo := 'online', p_solicitado_por := v_admin,
      p_texto_hash := 'p49v:C-falha', p_ai_call_log_id := NULL,
      p_provedor_ia := NULL, p_modelo_ia := NULL,
      p_prompt_version := '1.0.0', p_status_analise := 'falhou',
      p_competencias := NULL, p_citacoes := NULL, p_bias_flags := NULL,
      p_bloqueio_avanco := false, p_score_metadata := NULL);
    d_id      := (v_ret ->> 'analise_id')::uuid;
    d_vig     := (v_ret ->> 'vigente')::boolean;
    d_sup_ret := (v_ret ->> 'superadas')::int;
    SELECT count(*) INTO d_n FROM public.entrevista_analises WHERE candidatura_id = v_f1;
    SELECT coalesce(array_agg(ea.id ORDER BY ea.created_at), '{}'::uuid[]) INTO d_vig_ids
      FROM public.entrevista_analises ea
     WHERE ea.candidatura_id = v_f1 AND ea.tipo = 'online'
       AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);

    -- ── (e) · a revisão humana vai para B; confirmar em A (superada) é recusado ──
    -- ⚠ TODA chamada de RPC daqui em diante vai dentro do seu PRÓPRIO bloco de exceção,
    --   inclusive as que DEVEM passar. A razão é a mutação, não a elegância: as asserções
    --   são medidas aqui e julgadas depois do rollback, e uma RPC que estoura no meio
    --   aborta a subtransação ANTES de as asserções anteriores serem julgadas — o smoke
    --   fica vermelho pelo motivo certo mas aponta para o lugar errado («erro
    --   INESPERADO») e deixa as clausulas anteriores apenas PARECENDO provadas. Medido
    --   nas mutacoes M3 e M4 desta entrega: as duas quebram (c) e (d), e sem esta captura
    --   as duas apareciam como erro generico em (e). Capturar o SQLSTATE mantem a
    --   execucao viva ate o fim, e o julgamento reprova a PRIMEIRA clausula quebrada.
    PERFORM set_config('request.jwt.claims', v_claims, false);
    BEGIN
      v_ret := public.salvar_avaliacao_entrevista(
        v_f1, '{"Resolucao de conflitos": 4, "Responsabilizacao": 5}'::jsonb,
        'Notas humanas da entrevista, escritas pelo gestor no smoke P49V.');
      e_alvo := (v_ret ->> 'analise_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      e_salvar := format('%s: %s', SQLSTATE, SQLERRM);
    END;

    -- `confirmar_revisao_entrevista` na SUPERADA (A) tem de ser recusada.
    BEGIN
      PERFORM public.confirmar_revisao_entrevista(a_id);
      e_conf_a := '<aceitou>';
    EXCEPTION WHEN OTHERS THEN
      e_conf_a := SQLSTATE;
    END;

    -- e na VIGENTE (B) tem de passar.
    BEGIN
      v_ret := public.confirmar_revisao_entrevista(b_id);
      e_conf_b := (v_ret ->> 'ok')::boolean;
    EXCEPTION WHEN OTHERS THEN
      e_conf_b_err := format('%s: %s', SQLSTATE, SQLERRM);
    END;
    PERFORM set_config('request.jwt.claims', '', false);

    SELECT ea.revisao_confirmada_em, ea.scores_humanos, ea.revisada_por
      INTO e_b_rev, e_b_scores, e_b_por
      FROM public.entrevista_analises ea WHERE ea.id = b_id;

    -- ── (f) · texto D ⇒ B superada CONSERVA a revisão; nota volta a pendente ──
    v_ret := public.registrar_analise_entrevista(
      p_candidatura_id := v_f1, p_tipo := 'online', p_solicitado_por := v_admin,
      p_texto_hash := 'p49v:D', p_ai_call_log_id := NULL,
      p_provedor_ia := 'openai', p_modelo_ia := 'gpt-4o-mini-2024-07-18',
      p_prompt_version := '1.0.0', p_status_analise := 'pendente_humano',
      p_competencias := c_comp, p_citacoes := c_cit, p_bias_flags := c_bias,
      p_bloqueio_avanco := false, p_score_metadata := '{"fonte":"smoke_p49v"}'::jsonb);
    f_id      := (v_ret ->> 'analise_id')::uuid;
    f_sup_ret := (v_ret ->> 'superadas')::int;
    SELECT ea.superada_em, ea.scores_humanos, ea.notas_humanas, ea.revisada_por, ea.revisao_confirmada_em
      INTO f_b_superada, f_b_scores, f_b_notas, f_b_por, f_b_rev
      FROM public.entrevista_analises ea WHERE ea.id = b_id;
    SELECT sc.status::text, sc.score INTO f_sc_status, f_sc_score
      FROM public.scores_candidato sc
     WHERE sc.candidatura_id = v_f1 AND sc.tipo = 'entrevista'
       AND sc.subtipo IS NULL AND sc.pergunta_id IS NULL;
    SELECT coalesce(array_agg(ea.id ORDER BY ea.created_at), '{}'::uuid[]) INTO f_vig_ids
      FROM public.entrevista_analises ea
     WHERE ea.candidatura_id = v_f1 AND ea.tipo = 'online'
       AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);

    -- ── (g) · tipo presencial NÃO supera a vigente da online ─────────────────
    v_ret := public.registrar_analise_entrevista(
      p_candidatura_id := v_f1, p_tipo := 'presencial', p_solicitado_por := v_admin,
      p_texto_hash := 'p49v:E-presencial', p_ai_call_log_id := NULL,
      p_provedor_ia := 'anthropic', p_modelo_ia := 'claude-sonnet-4-6-20260215',
      p_prompt_version := '1.0.0', p_status_analise := 'pendente_humano',
      p_competencias := c_comp, p_citacoes := c_cit, p_bias_flags := c_bias,
      p_bloqueio_avanco := false, p_score_metadata := '{"fonte":"smoke_p49v"}'::jsonb);
    g_id      := (v_ret ->> 'analise_id')::uuid;
    g_sup_ret := (v_ret ->> 'superadas')::int;
    SELECT coalesce(array_agg(ea.id ORDER BY ea.created_at), '{}'::uuid[]) INTO g_vig_online
      FROM public.entrevista_analises ea
     WHERE ea.candidatura_id = v_f1 AND ea.tipo = 'online'
       AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);
    SELECT coalesce(array_agg(ea.id ORDER BY ea.created_at), '{}'::uuid[]) INTO g_vig_pres
      FROM public.entrevista_analises ea
     WHERE ea.candidatura_id = v_f1 AND ea.tipo = 'presencial'
       AND public.entrevista_analise_vigente(ea.superada_em, ea.status_analise, ea.competencias);

    -- ── (h) · SEM claims ⇒ fail-closed ───────────────────────────────────────
    PERFORM set_config('request.jwt.claims', '', false);
    BEGIN
      PERFORM public.salvar_avaliacao_entrevista(
        v_f1, '{"Resolucao de conflitos": 3}'::jsonb, 'Tentativa sem papel nenhum.');
      h_sqlstate := '<aceitou>';
    EXCEPTION WHEN OTHERS THEN
      h_sqlstate := SQLSTATE;
    END;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P49V1';
  EXCEPTION
    WHEN SQLSTATE 'P49V1' THEN
      NULL;  -- ROLLBACK da subtransação. Os valores medidos estão nas variáveis acima.
    WHEN OTHERS THEN
      v_err := format('%s: %s', SQLSTATE, SQLERRM);
  END;

  -- ⚠ FORA da subtransação, e é obrigatório que seja: um `set_config(..., false)` feito
  --   DENTRO dela é revertido junto com ela (o ensaio desta entrega reprovou exatamente
  --   aqui — «(z) nenhuma fixture registrada»). A variável PL/pgSQL `v_ids` sobrevive ao
  --   rollback; a GUC não. Mesmo idioma do `p49_snapshot_smoke.sql:320`.
  PERFORM set_config('smoke49v.fixtures', v_ids, false);
  PERFORM set_config('request.jwt.claims', '', false);

  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'P49V FAIL (parte 1): a subtransação abortou por erro INESPERADO (%) — nenhuma asserção foi julgada', v_err;
  END IF;
  IF NOT v_ran THEN
    RAISE EXCEPTION 'P49V FAIL (parte 1): a subtransação não chegou ao fim e não houve erro capturado — estado impossível';
  END IF;

  -- ═══ JULGAMENTO, FORA da subtransação ═══

  -- (a)
  IF a_n IS DISTINCT FROM 1 OR a_reap IS DISTINCT FROM false
     OR a_vig IS DISTINCT FROM true OR a_sup_ret IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49V FAIL (a): a 1a analise devia nascer unica (n=%, esperado 1), NAO reaproveitada (%, esperado false), VIGENTE (%, esperado true) e sem superar ninguem (superadas=%, esperado 0)',
      a_n, a_reap, a_vig, a_sup_ret;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);

  -- (b)
  IF b_n IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'P49V FAIL (b): depois do texto B a candidatura tem % analise(s) (esperado 2) — superar e MARCAR, nunca apagar: a analise A tem de CONTINUAR na tabela (D-02), porque a revisao anterior e trilha de decisao automatizada que o titular pode consultar (Art. 20)', b_n;
  END IF;
  IF b_sup_ret IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P49V FAIL (b): a RPC devolveu superadas=% (esperado 1) — a vigente anterior nao foi marcada', b_sup_ret;
  END IF;
  IF b_a_superada IS NULL THEN
    RAISE EXCEPTION 'P49V FAIL (b): a analise A ficou com superada_em NULL depois de B entrar — as duas continuariam vigentes ao mesmo tempo, que e exatamente o estado medido em PROD (4 «vigentes» numa candidatura)';
  END IF;
  IF b_vig_ids IS DISTINCT FROM ARRAY[b_id] THEN
    RAISE EXCEPTION 'P49V FAIL (b): as vigentes da (candidatura, online) sao % e a unica esperada e B (%)', b_vig_ids, b_id;
  END IF;
  IF b_sc_status IS DISTINCT FROM 'pendente_humano' OR b_sc_score IS NOT NULL THEN
    RAISE EXCEPTION 'P49V FAIL (b): scores_candidato tipo=entrevista ficou status=% score=% (esperado pendente_humano / NULL) — uma analise de IA nova NAO pode pesar na decisao final antes da revisao humana (D-42 / RNF-07a)',
      b_sc_status, b_sc_score;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);

  -- (c)
  IF c_reap IS DISTINCT FROM true OR c_ret_id IS DISTINCT FROM a_id THEN
    RAISE EXCEPTION 'P49V FAIL (c): reenviar o texto A devia devolver reaproveitada=true (veio %) com o id da analise A (% , veio %) — medido em PROD: 2 das 4 analises de bf26ee3c sao replays do mesmo texto, linhas que nunca deveriam ter nascido (D-40)',
      c_reap, a_id, c_ret_id;
  END IF;
  IF c_n IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'P49V FAIL (c): reenviar o texto A criou linha — a candidatura passou a ter % analise(s) (esperado continuar 2)', c_n;
  END IF;
  IF c_vig_ids IS DISTINCT FROM ARRAY[b_id] THEN
    RAISE EXCEPTION 'P49V FAIL (c): reenviar o texto A mudou a vigente para % — a vigente tem de CONTINUAR sendo B (%). A decisao do operador e explicita: A, B, A da 2 analises e a vigente e a B; o RH nao pediu para voltar atras, pediu para analisar um texto — e esse texto ja foi analisado',
      c_vig_ids, b_id;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);

  -- (d)
  IF d_n IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'P49V FAIL (d): a analise que FALHOU tem de entrar na tabela (never-absent) — a candidatura tem % analise(s) (esperado 3)', d_n;
  END IF;
  IF d_vig IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P49V FAIL (d): a RPC devolveu vigente=% para uma analise com status_analise=falhou (esperado false) — era assim que uma falha de IA virava «a mais nova» e escondia da tela a analise que tinha funcionado', d_vig;
  END IF;
  IF d_sup_ret IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49V FAIL (d): a falha superou % analise(s) (esperado 0) — uma falha nao invalida a analise boa anterior', d_sup_ret;
  END IF;
  IF d_vig_ids IS DISTINCT FROM ARRAY[b_id] THEN
    RAISE EXCEPTION 'P49V FAIL (d): depois da falha as vigentes sao % e a esperada continua B (%)', d_vig_ids, b_id;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);

  -- (e)
  IF e_salvar IS NOT NULL THEN
    RAISE EXCEPTION 'P49V FAIL (e): salvar_avaliacao_entrevista ESTOUROU com claims de administrador (%) — com uma vigente (B = %) presente ela tinha de gravar. Um no_data_found aqui significa que a vigente desapareceu antes da revisao (alguma coisa a superou indevidamente); um 42501 significa que o guard fail-closed recusou quem TEM papel',
      e_salvar, b_id;
  END IF;
  IF e_conf_b_err IS NOT NULL THEN
    RAISE EXCEPTION 'P49V FAIL (e): confirmar_revisao_entrevista ESTOUROU na analise VIGENTE B (% ) com «%» — a recusa da superada nao pode ter fechado tambem o caminho legitimo',
      b_id, e_conf_b_err;
  END IF;
  IF e_alvo IS DISTINCT FROM b_id THEN
    RAISE EXCEPTION 'P49V FAIL (e): salvar_avaliacao_entrevista gravou na analise % e a VIGENTE e B (%) — a versao anterior escolhia por ORDER BY created_at DESC, e a mais nova aqui e a FALHA (%), que nao tem competencias para pontuar',
      e_alvo, b_id, d_id;
  END IF;
  IF e_b_rev IS NULL OR e_b_scores IS NULL OR e_b_por IS DISTINCT FROM v_admin THEN
    RAISE EXCEPTION 'P49V FAIL (e): a revisao nao ficou completa em B (revisao_confirmada_em=%, scores_humanos=%, revisada_por=% esperado %)',
      e_b_rev, e_b_scores, e_b_por, v_admin;
  END IF;
  IF e_conf_a IS DISTINCT FROM '23514' THEN
    RAISE EXCEPTION 'P49V FAIL (e): confirmar_revisao_entrevista na analise SUPERADA (A) devolveu «%» e o esperado e SQLSTATE 23514 (check_violation). revisao_confirmada_em e o que o avancar_etapa le para LIBERAR a trava de lingua/sotaque, e desde o 49-06 ele so olha a VIGENTE: confirmar na superada nao libera nada, e o RH fica sem entender por que o avanco segue travado',
      e_conf_a;
  END IF;
  IF e_conf_b IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P49V FAIL (e): confirmar_revisao_entrevista na VIGENTE (B) nao passou (ok=%) — a recusa da superada nao pode ter fechado tambem o caminho legitimo', e_conf_b;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);

  -- (f)
  IF f_sup_ret IS DISTINCT FROM 1 OR f_b_superada IS NULL THEN
    RAISE EXCEPTION 'P49V FAIL (f): o texto D devia superar B (superadas=%, esperado 1; B.superada_em=%, esperado preenchida)', f_sup_ret, f_b_superada;
  END IF;
  IF f_b_scores IS NULL OR f_b_notas IS NULL OR f_b_por IS NULL OR f_b_rev IS NULL THEN
    RAISE EXCEPTION 'P49V FAIL (f): a analise SUPERADA perdeu a revisao humana (scores_humanos=%, notas_humanas=%, revisada_por=%, revisao_confirmada_em=%) — superar e MARCAR: a revisao que o RH fez continua legivel na analise superada (D-42). Apagar seria destruir trilha de decisao automatizada',
      f_b_scores, f_b_notas, f_b_por, f_b_rev;
  END IF;
  IF f_sc_status IS DISTINCT FROM 'pendente_humano' OR f_sc_score IS NOT NULL THEN
    RAISE EXCEPTION 'P49V FAIL (f): a nota consolidada ficou status=% score=% depois de uma analise NOVA (esperado pendente_humano / NULL) — a media BARS confirmada por uma revisao humana anterior continuaria valendo para um texto que ela nunca viu (D-42)',
      f_sc_status, f_sc_score;
  END IF;
  IF f_vig_ids IS DISTINCT FROM ARRAY[f_id] THEN
    RAISE EXCEPTION 'P49V FAIL (f): as vigentes da online sao % e a unica esperada e D (%)', f_vig_ids, f_id;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);

  -- (g)
  IF g_sup_ret IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P49V FAIL (g): a analise PRESENCIAL superou % analise(s) (esperado 0) — os tipos sao grupos independentes: uma vigente POR TIPO', g_sup_ret;
  END IF;
  IF g_vig_online IS DISTINCT FROM ARRAY[f_id] THEN
    RAISE EXCEPTION 'P49V FAIL (g): a vigente da ONLINE mudou para % depois da analise presencial (esperada continuar D = %) — analisar a presencial nao pode invalidar a analise da online', g_vig_online, f_id;
  END IF;
  IF g_vig_pres IS DISTINCT FROM ARRAY[g_id] THEN
    RAISE EXCEPTION 'P49V FAIL (g): as vigentes da PRESENCIAL sao % e a unica esperada e % ', g_vig_pres, g_id;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);

  -- (h)
  IF h_sqlstate IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P49V FAIL (h): salvar_avaliacao_entrevista SEM claims devolveu «%» e o esperado e SQLSTATE 42501 (insufficient_privilege). O guard fail-OPEN comparava v_role direto: com v_role nulo o NOT IN devolve NULL, o IF nao dispara, e quem chega sem papel nenhum passa — e anon tinha EXECUTE nesta funcao por grant DIRETO do pg_default_acl (medido true em 2026-09-22), entao nao era porta teorica',
      h_sqlstate;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);

  PERFORM set_config('smoke49v.n_analises_f1', d_n::text, false);
END
$p1$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) NEGATIVA — nada das fixtures sobreviveu; contagens globais iguais às de antes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE
  v_ids  uuid[] := coalesce(string_to_array(rtrim(current_setting('smoke49v.fixtures'), ','), ',')::uuid[], '{}');
  l_cand int;  l_ea int;  l_sc int;  l_hist int;  l_fila int;  l_tit int;
  g_cand bigint;  g_ea bigint;  g_sc bigint;  g_hist bigint;  g_notif bigint;  g_netq bigint;  g_sup bigint;
BEGIN
  IF cardinality(v_ids) = 0 THEN
    RAISE EXCEPTION 'P49V FAIL (z): nenhuma fixture registrada — a negativa não teria o que conferir';
  END IF;
  SELECT count(*) INTO l_cand FROM public.candidaturas c WHERE c.id = ANY (v_ids);
  SELECT count(*) INTO l_ea   FROM public.entrevista_analises ea WHERE ea.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_sc   FROM public.scores_candidato sc WHERE sc.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_hist FROM public.historico_candidatura h WHERE h.candidatura_id = ANY (v_ids);
  SELECT count(*) INTO l_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8')::jsonb ->> 'candidatura_id' = ANY (v_ids::text[]);
  SELECT count(*) INTO l_tit  FROM public.candidatos c WHERE c.email LIKE 'p49vsmoke-%@invalido.local';
  IF l_cand <> 0 OR l_ea <> 0 OR l_sc <> 0 OR l_hist <> 0 OR l_fila <> 0 OR l_tit <> 0 THEN
    RAISE EXCEPTION 'P49V FAIL (z): RESÍDUO das fixtures — candidaturas=% analises=% notas=% historico=% fila=% titulares=% (a subtransação não reverteu; um despacho COMMITADO sai como e-mail a candidato real)',
      l_cand, l_ea, l_sc, l_hist, l_fila, l_tit;
  END IF;

  SELECT count(*) INTO g_cand  FROM public.candidaturas;
  SELECT count(*) INTO g_ea    FROM public.entrevista_analises;
  SELECT count(*) INTO g_sc    FROM public.scores_candidato;
  SELECT count(*) INTO g_hist  FROM public.historico_candidatura;
  SELECT count(*) INTO g_notif FROM public.notificacoes_enviadas;
  SELECT count(*) INTO g_netq  FROM net.http_request_queue;
  SELECT count(*) INTO g_sup   FROM public.entrevista_analises WHERE superada_em IS NOT NULL;
  IF g_cand  IS DISTINCT FROM current_setting('smoke49v.n_cand')::bigint
     OR g_ea    IS DISTINCT FROM current_setting('smoke49v.n_ea')::bigint
     OR g_sc    IS DISTINCT FROM current_setting('smoke49v.n_sc')::bigint
     OR g_hist  IS DISTINCT FROM current_setting('smoke49v.n_hist')::bigint
     OR g_notif IS DISTINCT FROM current_setting('smoke49v.n_notif')::bigint
     OR g_netq  IS DISTINCT FROM current_setting('smoke49v.n_netq')::bigint THEN
    RAISE EXCEPTION 'P49V FAIL (z): contagem global mudou (candidaturas % -> %, analises % -> %, notas % -> %, historico % -> %, notificacoes % -> %, fila % -> %) com resíduo ZERO das fixtures — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke49v.n_cand'), g_cand, current_setting('smoke49v.n_ea'), g_ea,
      current_setting('smoke49v.n_sc'), g_sc, current_setting('smoke49v.n_hist'), g_hist,
      current_setting('smoke49v.n_notif'), g_notif, current_setting('smoke49v.n_netq'), g_netq;
  END IF;
  -- Cinto próprio deste smoke: ele MARCA `superada_em` nas fixtures, e nenhuma dessas
  -- marcas pode ter escapado para uma linha viva. A marcação retroativa das análises
  -- antigas é do plano 49-12, com checkpoint do operador (D-54).
  IF g_sup IS DISTINCT FROM current_setting('smoke49v.n_sup')::bigint THEN
    RAISE EXCEPTION 'P49V FAIL (z): analises com superada_em preenchida foram de % para % — este smoke marca superada_em nas FIXTURES, e uma marca que sobrou tocou linha VIVA. A marcacao retroativa e do plano 49-12, com checkpoint do operador (D-54)',
      current_setting('smoke49v.n_sup'), g_sup;
  END IF;
  PERFORM set_config('smoke49v.pass', (current_setting('smoke49v.pass')::int + 1)::text, false);
END
$z$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GATE + resultado.
-- ─────────────────────────────────────────────────────────────────────────────
DO $gate$
BEGIN
  IF current_setting('smoke49v.pass')::int <> 9 THEN
    RAISE EXCEPTION 'P49V FAIL (gate): pass = % de 9 — alguma asserção não incrementou o contador', current_setting('smoke49v.pass');
  END IF;
END
$gate$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',        'p49_analise_vigente',
  'pass',         current_setting('smoke49v.pass')::int,
  'esperado',     9,
  'analises_f1',  current_setting('smoke49v.n_analises_f1')::int,
  'n_cand',       current_setting('smoke49v.n_cand')::int,
  'n_ea',         current_setting('smoke49v.n_ea')::int,
  'n_ea_superadas', current_setting('smoke49v.n_sup')::int,
  'n_sc',         current_setting('smoke49v.n_sc')::int,
  'n_netq',       current_setting('smoke49v.n_netq')::int
) AS resultado;
