-- =============================================================================
-- Phase 24 / Plan 24-04 — SEC-05 / SEC-06 / SEC-08 vaga-scope smoke (repeatable)
-- Reescrito na Phase 50 / Plano 50-08 (D-01, D-02, D-04) — leia a nota abaixo antes de tudo.
-- =============================================================================
-- ⚠ RODAR SÓ PELO ENVELOPE QUE ABORTA:
--     node scripts/p50_ensaio.cjs supabase/tests/sec05_08_smokes.sql
--   A positiva de SEC-08 faz um UPDATE de verdade (no-op de valor, mas o trigger de updated_at
--   carimba) nas candidaturas de uma vaga real, e o positivo de reprocessar NÃO é chamado aqui
--   justamente porque ele despacharia `net.http_post`. Fora do envelope, nada disto pode rodar.
--
-- PHASE 50 / D-01, D-02 — A REGRA MUDOU, E ESTE ARQUIVO DIZ A NOVA.
--   Até a Phase 49 a pergunta era «um rh que NÃO é dono da vaga lê alguma coisa dela?» (resposta
--   exigida: zero). Desde a Phase 50 o recrutador ATIVO vê tudo o que o administrador vê sobre
--   vagas e candidaturas (D-01), e o que separa quem vê de quem não vê é a linha VIVA em
--   `usuarios_rh` (`public.is_active_rh_user()`: ativo = true, deleted_at IS NULL), lida a cada
--   consulta — porque o JWT vive 3600 s e desativar não desloga (D-02). Por isso cada antiga
--   asserção «não-dono → 0» virou um PAR na mesma execução:
--     positivo  rh ATIVO que NÃO é autor da vaga-alvo lê as linhas dela (contagem EXATA contra a
--               população lida como postgres na mesma execução);
--     negativo  o mesmo claim `rh` com o sub de um RECRUTADOR INATIVO (o token velho) lê 0, e o
--               sub sintético sem linha nenhuma em `usuarios_rh` (…00ff) lê 0.
--   O administrador continua lendo tudo. Um portão só com a negativa passaria num bug que nega
--   tudo; só com a positiva, num bug que abre para todos. O par é o que distingue.
--
-- REGRA DE FORMA (por que nenhum sub vem de `vagas.created_by`). O texto antigo escolhia o «dono»
--   com `SELECT v.created_by … LIMIT 1`, sem ORDER BY. O autor pode ser uma linha INATIVA (em PROD,
--   `bbbbbbbb…`, papel administrador, ativo = false, autor de 3 vagas): a policy antiga tinha uma
--   subconsulta em `vagas` sob a RLS de `vagas`, e um autor inativo não enxerga a própria vaga não
--   ativa — o «dono» lia 0 e o arquivo reprovava trabalho correto (medido no 50-08: o texto antigo
--   já estava VERMELHO em SEC-05 (analise/owner) contra os objetos vivos, antes da expansão). Os
--   atores agora são lidos em tempo de execução pelo que importa à regra: `ativo`, não autoria.
--   A vaga-alvo é escolhida com autor DIFERENTE do ator ativo (`IS DISTINCT FROM`), então a
--   positiva é sempre «vaga alheia».
--
-- ATORES (lidos na execução; cada um ausente = FAIL, nunca SKIP — população vazia mente):
--   a_ativo  usuarios_rh ATIVO, não excluído, SEM linha em `candidatos` (nenhuma policy de titular
--            pode explicar o que ele lê), recrutador primeiro, depois quem não é autor de vaga.
--   a_velho  usuarios_rh `role = 'recrutador' AND NOT ativo`, sem linha em `candidatos`.
--   …00ff    sub sintético sem linha em `usuarios_rh` (a negativa de sempre, mantida).
--   …00aa    sub sintético com claim `administrador` (o ramo do administrador é só de claim).
--
-- SEC-06 (b) reprocessar_analise (D-04): token velho → 42501; sub VÁLIDO (o de a_ativo) SEM papel
--   no JWT → 42501; …00ff com claim rh → 42501. As três guardas disparam ANTES da leitura do Vault
--   e do `net.http_post` (corpo do 20261005000004). O positivo (rh ativo passa) é provado pelo
--   smoke-portão da fase (`p50_acesso_recrutador_smoke.sql` (i)), não aqui.
--
-- RNF-07a (nenhuma pontuar_* escreve candidaturas) fica como estava.
--
-- O QUE PROVA QUE ESTE ARQUIVO NÃO É VAZIO (matriz de 4 execuções do 50-08): sem as migrations
--   20261005000002..4 ele REPROVA (a positiva de SEC-05 lê 0 sob a policy de posse); com elas,
--   passa. Uma reescrita que passasse nos dois lados não diria nada sobre a regra nova.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ATORES — descoberta privilegiada (RLS ignorada), só ids
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_ativo uuid; v_velho uuid;
BEGIN
  SELECT u.user_id INTO v_ativo
    FROM public.usuarios_rh u
   WHERE u.ativo AND u.deleted_at IS NULL AND u.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY (u.role = 'recrutador') DESC,
            EXISTS (SELECT 1 FROM public.vagas v WHERE v.created_by = u.user_id),
            u.user_id
   LIMIT 1;
  IF v_ativo IS NULL THEN
    RAISE EXCEPTION 'SEC-05 FAIL (atores): nenhuma linha usuarios_rh ATIVA sem linha de candidato — a positiva «rh ativo ve a vaga alheia» nao teria ator';
  END IF;

  SELECT u.user_id INTO v_velho
    FROM public.usuarios_rh u
   WHERE u.role = 'recrutador' AND NOT u.ativo AND u.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.user_id)
   ORDER BY u.user_id
   LIMIT 1;
  IF v_velho IS NULL THEN
    RAISE EXCEPTION 'SEC-05 FAIL (atores): nenhum recrutador INATIVO sem linha de candidato — a negativa do token velho nao teria ator';
  END IF;

  PERFORM set_config('smoke.a_ativo', v_ativo::text, false);
  PERFORM set_config('smoke.a_velho', v_velho::text, false);
  RAISE NOTICE 'SEC atores: ativo % · velho %', v_ativo, v_velho;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-05 (a) — analise_candidato_vaga : rh ativo não-autor → todas · token velho → 0 · …00ff → 0 · admin → todas
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_vaga uuid; v_cnt int;
BEGIN
  SELECT a.vaga_id INTO v_vaga
    FROM public.analise_candidato_vaga a
    JOIN public.vagas v ON v.id = a.vaga_id
   WHERE v.created_by IS DISTINCT FROM current_setting('smoke.a_ativo')::uuid
   ORDER BY (v.created_by IS NOT NULL) DESC, a.vaga_id
   LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'SEC-05 FAIL (analise): nenhuma analise em vaga alheia ao rh ativo — o par nao teria populacao';
  END IF;
  SELECT count(*) INTO v_cnt FROM public.analise_candidato_vaga WHERE vaga_id = v_vaga;
  PERFORM set_config('smoke.analise_vaga', v_vaga::text, false);
  PERFORM set_config('smoke.analise_cnt', v_cnt::text, false);
END $$;

SET ROLE authenticated;
DO $$
DECLARE n int; v_cnt int := current_setting('smoke.analise_cnt')::int;
BEGIN
  -- positivo: rh ATIVO, não autor da vaga → lê TODAS as linhas dela
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.a_ativo'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.analise_candidato_vaga WHERE vaga_id = current_setting('smoke.analise_vaga')::uuid;
  IF n IS DISTINCT FROM v_cnt THEN RAISE EXCEPTION 'SEC-05 FAIL (analise/ativo): rh ativo nao-autor leu %/% linhas da vaga alheia — D-01 (rh ativo ve tudo) nao vale', n, v_cnt; END IF;

  -- negativo: token velho (claim rh + recrutador INATIVO) → 0
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.a_velho'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.analise_candidato_vaga WHERE vaga_id = current_setting('smoke.analise_vaga')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-05 FAIL (analise/velho): token de recrutador INATIVO leu % linha(s) — D-02 (helper vivo) nao vale', n; END IF;

  -- negativo: sub sem linha em usuarios_rh → 0
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.analise_candidato_vaga WHERE vaga_id = current_setting('smoke.analise_vaga')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-05 FAIL (analise/sem-linha): sub sem linha usuarios_rh leu % linha(s) — horizontal leak', n; END IF;

  -- administrador → todas
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO n FROM public.analise_candidato_vaga WHERE vaga_id = current_setting('smoke.analise_vaga')::uuid;
  IF n <> v_cnt THEN RAISE EXCEPTION 'SEC-05 FAIL (analise/admin): administrador read %/% rows — admin blinded', n, v_cnt; END IF;

  RAISE NOTICE 'SEC-05 PASS (analise): rh ativo nao-autor→todas; velho→0; sem-linha→0; admin→todas (% rows)', v_cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-05 (b) — comparativo_solicitado : o mesmo par
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_vaga uuid; v_cnt int;
BEGIN
  SELECT co.vaga_id INTO v_vaga
    FROM public.comparativo_solicitado co
    JOIN public.vagas v ON v.id = co.vaga_id
   WHERE v.created_by IS DISTINCT FROM current_setting('smoke.a_ativo')::uuid
   ORDER BY (v.created_by IS NOT NULL) DESC, co.vaga_id
   LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'SEC-05 FAIL (comparativo): nenhum comparativo em vaga alheia ao rh ativo — o par nao teria populacao';
  END IF;
  SELECT count(*) INTO v_cnt FROM public.comparativo_solicitado WHERE vaga_id = v_vaga;
  PERFORM set_config('smoke.comp_vaga', v_vaga::text, false);
  PERFORM set_config('smoke.comp_cnt', v_cnt::text, false);
END $$;

SET ROLE authenticated;
DO $$
DECLARE n int; v_cnt int := current_setting('smoke.comp_cnt')::int;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.a_ativo'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.comparativo_solicitado WHERE vaga_id = current_setting('smoke.comp_vaga')::uuid;
  IF n IS DISTINCT FROM v_cnt THEN RAISE EXCEPTION 'SEC-05 FAIL (comparativo/ativo): rh ativo nao-autor leu %/% linhas da vaga alheia', n, v_cnt; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.a_velho'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.comparativo_solicitado WHERE vaga_id = current_setting('smoke.comp_vaga')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-05 FAIL (comparativo/velho): token de recrutador INATIVO leu % linha(s)', n; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.comparativo_solicitado WHERE vaga_id = current_setting('smoke.comp_vaga')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-05 FAIL (comparativo/sem-linha): sub sem linha usuarios_rh leu % linha(s) — horizontal leak', n; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO n FROM public.comparativo_solicitado WHERE vaga_id = current_setting('smoke.comp_vaga')::uuid;
  IF n <> v_cnt THEN RAISE EXCEPTION 'SEC-05 FAIL (comparativo/admin): administrador read %/% rows — admin blinded', n, v_cnt; END IF;

  RAISE NOTICE 'SEC-05 PASS (comparativo): rh ativo nao-autor→todas; velho→0; sem-linha→0; admin→todas (% rows)', v_cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-08 (a) — candidaturas SELECT : rh ativo não-autor → as VIVAS da vaga · velho → 0 · …00ff → 0 · admin → todas
--         (b) — candidaturas UPDATE no-op : rh ativo → as vivas (rh_avanca_etapa) · velho → 0 · …00ff → 0
--   O ramo rh de rh_le_candidaturas filtra deleted_at/is_rascunho da própria linha (0001); o do
--   administrador não. Por isso a população do rh é a das VIVAS e a do admin, a de TODAS.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_vaga uuid; v_cand uuid; v_cnt int; v_vivas int;
BEGIN
  SELECT c.vaga_id, c.id INTO v_vaga, v_cand
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE v.created_by IS DISTINCT FROM current_setting('smoke.a_ativo')::uuid
     AND c.deleted_at IS NULL AND c.is_rascunho = false
   ORDER BY (v.created_by IS NOT NULL) DESC, c.vaga_id, c.id
   LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'SEC-08 FAIL (candidaturas): nenhuma candidatura viva em vaga alheia ao rh ativo — o par nao teria populacao';
  END IF;
  SELECT count(*), count(*) FILTER (WHERE deleted_at IS NULL AND is_rascunho = false)
    INTO v_cnt, v_vivas
    FROM public.candidaturas WHERE vaga_id = v_vaga;
  PERFORM set_config('smoke.cand_vaga', v_vaga::text, false);
  PERFORM set_config('smoke.cand_id', v_cand::text, false);
  PERFORM set_config('smoke.cand_cnt', v_cnt::text, false);
  PERFORM set_config('smoke.cand_vivas', v_vivas::text, false);
END $$;

SET ROLE authenticated;
DO $$
DECLARE n int; v_upd int;
  v_cnt   int := current_setting('smoke.cand_cnt')::int;
  v_vivas int := current_setting('smoke.cand_vivas')::int;
  v_sub text;
BEGIN
  -- positivo: rh ATIVO não-autor → SELECT das vivas e UPDATE no-op das vivas
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.a_ativo'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.candidaturas WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
  IF n IS DISTINCT FROM v_vivas THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/ativo SELECT): rh ativo nao-autor leu %/% candidaturas vivas da vaga alheia', n, v_vivas; END IF;
  UPDATE public.candidaturas SET updated_at = updated_at
   WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  IF v_upd IS DISTINCT FROM v_vivas THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/ativo UPDATE): rh ativo nao-autor atualizou %/% candidaturas vivas (rh_avanca_etapa)', v_upd, v_vivas; END IF;

  -- negativos: token velho e sub sem linha → UPDATE 0 e SELECT 0. O UPDATE vem ANTES do SELECT de
  -- propósito: o WHERE do UPDATE lê colunas, então a linha também precisa passar na policy de
  -- SELECT — com a de SELECT quebrada, o SELECT reprovaria primeiro e esconderia o UPDATE; nesta
  -- ordem, cada quebra aparece na própria letra (mordidas do 50-08).
  FOREACH v_sub IN ARRAY ARRAY[current_setting('smoke.a_velho'), '00000000-0000-0000-0000-0000000000ff'] LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object(
      'sub', v_sub, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
    UPDATE public.candidaturas SET updated_at = updated_at
     WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
    GET DIAGNOSTICS v_upd = ROW_COUNT;
    IF v_upd <> 0 THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/% UPDATE): UPDATE tocou % linha(s) — write leak',
      CASE WHEN v_sub = current_setting('smoke.a_velho') THEN 'velho' ELSE 'sem-linha' END, v_upd; END IF;
    SELECT count(*) INTO n FROM public.candidaturas WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
    IF n <> 0 THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/% SELECT): leu % candidatura(s) — horizontal leak',
      CASE WHEN v_sub = current_setting('smoke.a_velho') THEN 'velho' ELSE 'sem-linha' END, n; END IF;
  END LOOP;

  -- administrador → todas
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO n FROM public.candidaturas WHERE vaga_id = current_setting('smoke.cand_vaga')::uuid;
  IF n <> v_cnt THEN RAISE EXCEPTION 'SEC-08 FAIL (candidaturas/admin): administrador read %/% rows — admin blinded', n, v_cnt; END IF;

  RAISE NOTICE 'SEC-08 PASS (candidaturas): rh ativo nao-autor SELECT/UPDATE→% vivas; velho e sem-linha→0/0; admin→todas (%)', v_vivas, v_cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-06 (a) — redacoes_candidato RH SELECT (redacao_rh_select, forma B: candidatura viva)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_cand uuid; v_cnt int;
BEGIN
  SELECT r.candidatura_id INTO v_cand
    FROM public.redacoes_candidato r
    JOIN public.candidaturas c ON c.id = r.candidatura_id
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE v.created_by IS DISTINCT FROM current_setting('smoke.a_ativo')::uuid
     AND c.deleted_at IS NULL AND c.is_rascunho = false
   ORDER BY (v.created_by IS NOT NULL) DESC, r.candidatura_id
   LIMIT 1;
  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'SEC-06 FAIL (redacoes): nenhuma redacao de candidatura viva em vaga alheia ao rh ativo — o par nao teria populacao';
  END IF;
  SELECT count(*) INTO v_cnt FROM public.redacoes_candidato WHERE candidatura_id = v_cand;
  PERFORM set_config('smoke.red_cand', v_cand::text, false);
  PERFORM set_config('smoke.red_cnt', v_cnt::text, false);
END $$;

SET ROLE authenticated;
DO $$
DECLARE n int; v_cnt int := current_setting('smoke.red_cnt')::int;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.a_ativo'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.redacoes_candidato WHERE candidatura_id = current_setting('smoke.red_cand')::uuid;
  IF n IS DISTINCT FROM v_cnt THEN RAISE EXCEPTION 'SEC-06 FAIL (redacoes/ativo): rh ativo nao-autor leu %/% redacoes da vaga alheia', n, v_cnt; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke.a_velho'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.redacoes_candidato WHERE candidatura_id = current_setting('smoke.red_cand')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-06 FAIL (redacoes/velho): token de recrutador INATIVO leu % redacao(oes)', n; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'rh'))::text, false);
  SELECT count(*) INTO n FROM public.redacoes_candidato WHERE candidatura_id = current_setting('smoke.red_cand')::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'SEC-06 FAIL (redacoes/sem-linha): sub sem linha usuarios_rh leu % redacao(oes) — verdict horizontal leak', n; END IF;

  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-0000-0000-0000000000aa', 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', 'administrador'))::text, false);
  SELECT count(*) INTO n FROM public.redacoes_candidato WHERE candidatura_id = current_setting('smoke.red_cand')::uuid;
  IF n <> v_cnt THEN RAISE EXCEPTION 'SEC-06 FAIL (redacoes/admin): administrador read %/% rows — admin blinded', n, v_cnt; END IF;

  RAISE NOTICE 'SEC-06 PASS (redacoes RH): rh ativo nao-autor→todas; velho→0; sem-linha→0; admin→todas (% rows)', v_cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEC-06 (b) — reprocessar_analise : token velho → 42501 · sub válido SEM papel → 42501 (D-04) ·
--   …00ff com claim rh → 42501. Todas recusam ANTES do Vault e do net.http_post (20261005000004).
--   Candidatura-alvo: a viva da vaga alheia de SEC-08 (existe — senão a função daria no_data_found).
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
DECLARE v_rot text; v_claims jsonb;
BEGIN
  FOR v_rot, v_claims IN
    SELECT * FROM (VALUES
      ('velho',     jsonb_build_object('sub', current_setting('smoke.a_velho'), 'role', 'authenticated',
                                       'app_metadata', jsonb_build_object('role', 'rh'))),
      ('sem-papel', jsonb_build_object('sub', current_setting('smoke.a_ativo'), 'role', 'authenticated')),
      ('sem-linha', jsonb_build_object('sub', '00000000-0000-0000-0000-0000000000ff', 'role', 'authenticated',
                                       'app_metadata', jsonb_build_object('role', 'rh')))
    ) AS t(rot, claims)
  LOOP
    PERFORM set_config('request.jwt.claims', v_claims::text, false);
    BEGIN
      PERFORM public.reprocessar_analise(current_setting('smoke.cand_id')::uuid);
      RAISE EXCEPTION 'SEC-06 FAIL (reprocessar/%): a chamada NAO foi barrada (esperado 42501 insufficient_privilege, antes do net.http_post)', v_rot;
    EXCEPTION
      WHEN insufficient_privilege THEN NULL;  -- esperado
    END;
  END LOOP;
  RAISE NOTICE 'SEC-06 PASS (reprocessar): velho, sem-papel (D-04) e sem-linha recebem 42501';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RNF-07a — the scoring path never writes candidaturas (no auto-reject / status flip)
--   Content-independent: inspect every pontuar_* function body — none may write candidaturas.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE r record; v_bad text := '';
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname LIKE 'pontuar\_%'
  LOOP
    IF r.def ~* '(insert|update|delete)\s+(into\s+)?(public\.)?candidaturas\M' THEN
      v_bad := v_bad || r.proname || ' ';
    END IF;
  END LOOP;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'RNF-07a FAIL: pontuar_* function(s) write candidaturas (auto-reject risk): %', v_bad;
  END IF;
  RAISE NOTICE 'RNF-07a PASS: no pontuar_* function writes candidaturas (scoring never flips status)';
END $$;

-- ── Reset the simulated context ──────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '', false);
RESET ROLE;
