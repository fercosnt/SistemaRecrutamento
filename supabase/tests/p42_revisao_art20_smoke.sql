-- =============================================================================
-- ⚠ 48-11 (2026-09-21) — O QUE MUDOU NESTE ARQUIVO, E POR QUÊ (ler antes do resto)
--   1. ATORES: as duas contas FIXAS da fixture (`e2e.admin@…`, recrutador `fba9bc0f-…`)
--      estão `ativo=false` desde 2026-09-05, e o arquivo estava vermelho na fixture contra
--      código correto. Agora os atores vêm do catálogo vivo, lidos NA EXECUÇÃO.
--   2. (f)/(g)/(h) rodam numa SUBTRANSAÇÃO QUE REVERTE, sobre titular sintético. Antes, as
--      escritas de topo COMMITAVAM, e a resposta de (f) enfileirava um `revisao_respondida`
--      real para `candidato.funil@teste.com` com NOTIFICACOES_MODO='producao'.
--   3. (h.2) MUDOU DE EFEITO por decisão do operador (D-01, «reabrir, não reverter»): o
--      veredito `revertida` agora exige decisão `rejeitado` e candidatura `rejeitado/rejeitado`,
--      e REABRE a candidatura (`decisao_final/em_analise`). A asserção confere isso. O aviso
--      abaixo («corrige-se a implementação») continua valendo: aqui a espec mudou porque o
--      COMPORTAMENTO pedido mudou, e não para caber numa implementação.
--   4. O TEARDOWN virou a negativa (j): nada foi commitado, e (j) prova isso. Gate = 10.
--   Rodar com `node p46apply.cjs run supabase/tests/p42_revisao_art20_smoke.sql` (uma
--   requisição = uma sessão). O `SELECT` final devolve `{pass, esperado}`.
-- =============================================================================
-- =============================================================================
-- Phase 42 / Plano 42-03 Task 3 — ESPEC EXECUTÁVEL do write-path da revisão
-- de decisão (REVISAO-02 · REVISAO-03 · REVISAO-05, LGPD Art. 20)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Ele foi escrito **ANTES** da migration do Plano 42-06, deliberadamente RED: as
-- colunas novas, os dois RPCs e a tabela de configuração ainda NÃO existem. Ele
-- descreve o comportamento que a migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi implementado é ESCALAR o problema, não resolvê-lo —
-- é exatamente o movimento que transforma um gate em decoração.
--
-- COMO RODAR
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** —
-- nunca pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug
-- upstream anthropics/claude-code#13898). A chamada única é obrigatória por um
-- motivo mecânico, não estilístico: `set_config(..., false)` é escopado à SESSÃO,
-- então statements espalhados por chamadas separadas zerariam o contador
-- `smoke42.pass` e o RESUMO (z) reprovaria um run que na verdade passou — ou, pior,
-- deixaria a fixture criada para trás (lição registrada da P41-05).
--
-- GATE VERDE = o contador `smoke42.pass` bate **10** no RESUMO (z) (8 originais + (i)
-- da P42-06 + (j) do 48-11). O gate NÃO é "não levantou exceção": um run parcial
-- acumularia menos e o RESUMO reprova alto. Esperado FIXO — não há metade adaptativa.
--
-- ⚠ ESTE SMOKE ESCREVE. Diferente do p41 (100% catálogo), as asserções (f), (g) e
-- (h) fazem chamadas REAIS de escrita — desde o 48-11, TODAS dentro de uma
-- subtransação que reverte (ver o bloco (f)+(g)+(h)); a negativa (j) prova zero
-- resíduo. Não há teardown.
--
-- -----------------------------------------------------------------------------
-- AS 8 ASSERÇÕES
-- -----------------------------------------------------------------------------
--   (a) CATÁLOGO — decisao_final ganhou revisao_veredito text, revisao_por_usuario
--       uuid e revisao_respondida_em timestamptz, as TRÊS nullable, e existe FK de
--       revisao_por_usuario → auth.users(id) em pg_constraint.
--   (b) CATÁLOGO — CHECK restringindo revisao_veredito a exatamente
--       'mantida'/'revertida' (asserido por pg_get_constraintdef, NUNCA por nome
--       adivinhado) + CHECK do mínimo de 50 caracteres da justificativa quando o
--       veredito está preenchido.
--   (c) CATÁLOGO — responder_revisao_decisao(uuid,text,text) existe, é SECURITY
--       DEFINER, tem search_path VAZIO em proconfig, e o EXECUTE está REVOGADO de
--       PUBLIC e CONCEDIDO a authenticated.
--   (d) CATÁLOGO — listar_revisoes_decisao existe, é SECURITY DEFINER e STABLE, e o
--       conjunto de colunas do seu RETURNS TABLE **não** contém `justificativa`
--       (asserção NEGATIVA por pg_get_function_result — Pitfall 8 / T-42-03).
--   (e) CATÁLOGO — config_sla_revisao tem RLS habilitada e NENHUMA policy sua
--       concede acesso ao papel anônimo (asserção negativa sobre pg_policies.roles);
--       o seed existe com dias_atraso > dias_atencao (T-42-11).
--   (f) T-42-V6 — A PROVA NOMINADA (D-P42-09/D-P42-10, critério de sucesso #3 do
--       ROADMAP): impersonar o DECISOR e chamar responder_revisao_decisao tem de
--       levantar 42501 com SQLERRM LIKE '%decisor%'. Um SUCESSO aqui é RAISE
--       EXCEPTION de FALHA, nunca verde. Depois, impersonar o OUTRO RH tem de
--       SUCEDER, gravando revisao_por_usuario = outro RH e revisao_respondida_em.
--   (g) T-42-V7 — ASSERÇÃO NEGATIVA: entre a tentativa BARRADA e a bem-sucedida, a
--       linha continuava com revisao_respondida_em IS NULL e revisao_por_usuario IS
--       NULL, e a contagem de notificacoes_enviadas NÃO subiu (medida antes/depois).
--       Uma recusa que já tivesse escrito, ou que já tivesse disparado e-mail, seria
--       um guard tarde demais.
--   (h) T-42-V8 + T-42-V9 — FRONTEIRA e IDEMPOTÊNCIA: com a fixture reposta a NULL
--       (como postgres, entre sub-casos), justificativa de 49 caracteres → 22023; de
--       50 → ACEITA; e uma 2ª chamada sobre a mesma revisão já respondida → 22023
--       com SQLERRM LIKE '%respondida%'.
--   (i) FAIL-CLOSED (adicionada na 2ª rodada do checkpoint da Task 2 — ver a
--       justificativa em (c)): com o papel `authenticated` e NENHUMA claim de JWT,
--       os TRÊS RPCs têm de levantar 42501. Esta asserção existe porque a sua
--       AUSÊNCIA foi o que deixou passar um defeito real: os guards nasceram como
--       `v_role NOT IN ('rh','administrador')`, e `NULL NOT IN (…)` avalia NULL, de
--       modo que um `IF` com condição NULL não é tomado — o guard era um no-op para
--       chamador sem JWT. As 8 asserções originais não cobriam esse caminho porque
--       todas injetam uma claim válida antes de chamar. Um gate que só testa o
--       caminho autenticado não pode detectar um guard que falha ABERTO.
--   (j) NEGATIVA (48-11) — zero resíduo: a fixture não existe depois do run e o estado
--       global (decisão, arquivo, histórico, fila, ledger, candidaturas por etapa/status)
--       é o da baseline capturada na própria execução.
--   (z) RESUMO — exige o total de 10 PASS; run parcial falha AQUI, não em silêncio.
--
-- -----------------------------------------------------------------------------
-- ESCOPO DA PROVA — o que ela cobre e o que ela NÃO cobre
-- -----------------------------------------------------------------------------
-- COBRE: `auth.uid()` real dentro do SECURITY DEFINER, o guard reviewer ≠ decider,
-- o SQLSTATE emitido, a autoria efetivamente gravada, e a recusa por TENTATIVA
-- REAL (não aviso de UI, não teste com mock — o critério de sucesso #3 exige isso).
--
-- NÃO COBRE: a verificação de ASSINATURA JWT do GoTrue/PostgREST, porque aqui a
-- claim é INJETADA na sessão via set_config e não é assinada. Isso não enfraquece a
-- prova: o guard lê `auth.uid()`, e `auth.uid()` **é** `request.jwt.claims->>'sub'`
-- — logo o que precisa ser provado está integralmente provado. É o mesmo critério
-- que a STATE.md registra para o candidato-DENY do LEDGER-03.
--
-- HIGIENE: RESET ROLE em toda troca de papel e ao final; NOTICEs carregam apenas
-- contagens, SQLSTATEs e booleanos — NUNCA PII (nome, e-mail, justificativa) e
-- nunca o valor de um segredo.
-- =============================================================================


RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke42.pass', '0', false);
SELECT set_config('request.jwt.claims', '', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE (como postgres, SÓ LEITURA) — dois RH/admin DISTINTOS e ATIVOS, lidos
-- do catálogo NA EXECUÇÃO, e as contagens da negativa (j).
--
-- ⚠ 48-11: até aqui a fixture exigia DUAS CONTAS FIXAS (`e2e.admin@…` e o recrutador
-- `fba9bc0f-…`). As duas estão `ativo=false` desde 2026-09-05, e o smoke parava em
-- `P42 FAIL (fixture)` antes de qualquer asserção, VERMELHO contra código correto. O
-- decisor é agora o primeiro administrador ativo (registrar_decisao exige dono da vaga
-- para 'rh'; administrador não). O revisor é qualquer RH/admin ativo distinto dele.
-- Continua valendo que um ator ausente levanta ALTO — nunca SKIP silencioso.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_decisor      uuid;
  v_outro        uuid;
  v_vaga         uuid;
  v_outro_role   text;
BEGIN
  SELECT r.user_id INTO v_decisor
    FROM public.usuarios_rh r
   WHERE r.role = 'administrador' AND r.ativo AND r.deleted_at IS NULL AND r.user_id IS NOT NULL
   ORDER BY r.created_at, r.user_id
   LIMIT 1;
  SELECT r.user_id INTO v_outro
    FROM public.usuarios_rh r
   WHERE r.role IN ('administrador', 'recrutador') AND r.ativo AND r.deleted_at IS NULL
     AND r.user_id IS NOT NULL AND r.user_id <> v_decisor
   ORDER BY r.created_at, r.user_id
   LIMIT 1;

  IF v_decisor IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (fixture): nenhum administrador ATIVO em usuarios_rh — a prova do guard não pode rodar sem um decisor real';
  END IF;
  IF v_outro IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (fixture): só há UM RH/admin ativo — sem um SEGUNDO o guard reviewer<>decider é intestável';
  END IF;

  -- Mapeamento de taxonomia de role (Pattern 5): usuarios_rh.role NUNCA vale 'rh';
  -- o custom_access_token_hook mapeia recrutador → 'rh' em app_metadata.role.
  SELECT CASE WHEN r.role = 'administrador' THEN 'administrador' ELSE 'rh' END
    INTO v_outro_role FROM public.usuarios_rh r WHERE r.user_id = v_outro;

  SELECT v.id INTO v_vaga FROM public.vagas v ORDER BY v.created_at LIMIT 1;
  IF v_vaga IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (fixture): nenhuma vaga viva para a fixture';
  END IF;

  PERFORM set_config('smoke42.decisor',      v_decisor::text,  false);
  PERFORM set_config('smoke42.outro',        v_outro::text,    false);
  PERFORM set_config('smoke42.decisor_role', 'administrador',  false);
  PERFORM set_config('smoke42.outro_role',   v_outro_role,     false);
  PERFORM set_config('smoke42.vaga',         v_vaga::text,     false);

  -- baseline da negativa (j): capturada NA execução, nunca constante (D-17)
  PERFORM set_config('smoke42.n_df',   (SELECT count(*) FROM public.decisao_final)::text, false);
  PERFORM set_config('smoke42.n_dfh',  (SELECT count(*) FROM public.decisao_final_historico)::text, false);
  PERFORM set_config('smoke42.n_hist', (SELECT count(*) FROM public.historico_candidatura)::text, false);
  PERFORM set_config('smoke42.n_netq', (SELECT count(*) FROM net.http_request_queue)::text, false);
  PERFORM set_config('smoke42.n_notif', (SELECT count(*) FROM public.notificacoes_enviadas)::text, false);
  PERFORM set_config('smoke42.fp_cand',
    (SELECT md5(coalesce(string_agg(t.linha, E'\n' ORDER BY t.linha), ''))
       FROM (SELECT format('%s|%s|%s', c.etapa_atual, c.status, count(*)) AS linha
               FROM public.candidaturas c GROUP BY c.etapa_atual, c.status) t), false);

  RAISE NOTICE 'BASELINE ok: 2 RHs distintos resolvidos do catálogo vivo (roles JWT administrador/%)', v_outro_role;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) CATÁLOGO — as 3 colunas novas de decisao_final + a FK de autoria do revisor.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_ver_type text; v_ver_null text;
  v_por_type text; v_por_null text;
  v_res_type text; v_res_null text;
  v_fk       int;
BEGIN
  SELECT data_type, is_nullable INTO v_ver_type, v_ver_null
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='decisao_final' AND column_name='revisao_veredito';
  SELECT data_type, is_nullable INTO v_por_type, v_por_null
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='decisao_final' AND column_name='revisao_por_usuario';
  SELECT data_type, is_nullable INTO v_res_type, v_res_null
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='decisao_final' AND column_name='revisao_respondida_em';

  IF v_ver_type IS NULL OR v_por_type IS NULL OR v_res_type IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (a): faltam colunas em decisao_final (revisao_veredito=% revisao_por_usuario=% revisao_respondida_em=%) — migration 42-06 incompleta',
      coalesce(v_ver_type,'<ausente>'), coalesce(v_por_type,'<ausente>'), coalesce(v_res_type,'<ausente>');
  END IF;
  IF v_ver_type <> 'text' THEN
    RAISE EXCEPTION 'P42 FAIL (a): revisao_veredito é % — esperado text', v_ver_type;
  END IF;
  IF v_por_type <> 'uuid' THEN
    RAISE EXCEPTION 'P42 FAIL (a): revisao_por_usuario é % — esperado uuid', v_por_type;
  END IF;
  IF v_res_type <> 'timestamp with time zone' THEN
    RAISE EXCEPTION 'P42 FAIL (a): revisao_respondida_em é % — esperado timestamptz', v_res_type;
  END IF;
  -- NULLABLE nas três: a tabela tem linhas vivas; NOT NULL falharia o apply.
  IF v_ver_null <> 'YES' OR v_por_null <> 'YES' OR v_res_null <> 'YES' THEN
    RAISE EXCEPTION 'P42 FAIL (a): coluna(s) NÃO nullable (veredito=% por_usuario=% respondida_em=%) — decisões já existentes não têm revisão respondida',
      v_ver_null, v_por_null, v_res_null;
  END IF;

  -- A FK de autoria. D-P42-06 proíbe `ADD COLUMN IF NOT EXISTS` justamente porque
  -- esse idioma SILENCIA a cláusula FK — a causa identificada do drift de
  -- candidatos.user_id que esta própria fase documenta. Aqui provamos que não recorreu.
  SELECT count(*) INTO v_fk
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
   WHERE c.conrelid = 'public.decisao_final'::regclass
     AND c.contype = 'f'
     AND a.attname = 'revisao_por_usuario'
     AND c.confrelid = 'auth.users'::regclass;
  IF v_fk < 1 THEN
    RAISE EXCEPTION 'P42 FAIL (a): NÃO existe FK de decisao_final.revisao_por_usuario -> auth.users(id) — o idioma ADD COLUMN IF NOT EXISTS silencia a FK (INVENT-04)';
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): revisao_veredito/revisao_por_usuario/revisao_respondida_em existem, tipadas, nullable, com FK -> auth.users';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) CATÁLOGO — os dois CHECKs, asseridos por pg_get_constraintdef (o NOME da
--     constraint não é adivinhado: procuramos pela DEFINIÇÃO).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_veredito text; v_min50 text;
BEGIN
  -- CHECK do vocabulário do veredito: exatamente mantida/revertida.
  SELECT pg_get_constraintdef(c.oid) INTO v_veredito
    FROM pg_constraint c
   WHERE c.conrelid = 'public.decisao_final'::regclass
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%revisao_veredito%'
     AND pg_get_constraintdef(c.oid) LIKE '%mantida%'
   LIMIT 1;

  IF v_veredito IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (b): NÃO existe CHECK sobre revisao_veredito — sem ele um service_role grava qualquer string no veredito';
  END IF;
  IF strpos(v_veredito, 'revertida') = 0 THEN
    RAISE EXCEPTION 'P42 FAIL (b): o CHECK de revisao_veredito não admite ''revertida'': %', v_veredito;
  END IF;

  -- CHECK de substância: >= 50 caracteres quando há veredito. O guard no RPC
  -- protege o caminho da APLICAÇÃO; o CHECK protege contra qualquer service_role.
  SELECT pg_get_constraintdef(c.oid) INTO v_min50
    FROM pg_constraint c
   WHERE c.conrelid = 'public.decisao_final'::regclass
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%50%'
     AND pg_get_constraintdef(c.oid) LIKE '%revisao_%'
   LIMIT 1;

  IF v_min50 IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (b): NÃO existe CHECK do mínimo de 50 caracteres da justificativa da revisão — o guardrail vivo de decisao_final.justificativa não foi espelhado';
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): CHECK de vocabulário (mantida/revertida) e CHECK do mínimo de 50 caracteres presentes por definição';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) CATÁLOGO — responder_revisao_decisao: DEFINER + search_path vazio + escopo
--     de EXECUTE (REVOKE de PUBLIC, GRANT a authenticated).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_oid oid; v_secdef boolean; v_proconfig text[]; v_proacl aclitem[];
  v_public_exec boolean; v_auth boolean; v_anon boolean;
BEGIN
  -- Identidade resolvida por TIPOS via to_regprocedure, não por igualdade de string
  -- contra pg_get_function_identity_arguments.
  --
  -- ⚠ CORREÇÃO DE SPEC (P42-06, nova rodada do checkpoint da Task 2 — justificativa
  -- registrada conforme o plano exige). A forma original era
  --     pg_get_function_identity_arguments(p.oid) = 'uuid, text, text'
  -- e ela era um RED FALSO: `pg_get_function_identity_arguments` omite apenas os
  -- DEFAULTS, e PRESERVA os nomes dos parâmetros. Em PG 17.6 esta função devolve
  --     'p_candidatura_id uuid, p_veredito text, p_justificativa text'
  -- logo a igualdade era insatisfazível para QUALQUER implementação correta — só
  -- passaria com parâmetros anônimos, impossível em PL/pgSQL (o corpo referencia os
  -- params pelo nome). Provado contra o catálogo: o builtin has_function_privilege
  -- devolve 'text, text' porque args de funções C são anônimos, enquanto toda função
  -- PL/pgSQL nomeada devolve os nomes. Não é a implementação que divergiu da espec:
  -- era a espec que aferia o catálogo pela coluna errada.
  --
  -- A substância da asserção (c) permanece byte-a-byte: DEFINER + search_path vazio
  -- + REVOKE de PUBLIC/anon + GRANT a authenticated. Só o LOOKUP mudou, e mudou para
  -- uma forma ESTRITAMENTE mais forte: to_regprocedure resolve por schema + nome +
  -- tipos de entrada exatos (devolve NULL em vez de levantar, então a mensagem de
  -- falha abaixo continua sendo a que o operador lê), de modo que uma sobrecarga com
  -- aridade ou tipos diferentes NÃO casa, e renomear um parâmetro não quebra o gate.
  SELECT p.oid, p.prosecdef, p.proconfig, p.proacl
    INTO v_oid, v_secdef, v_proconfig, v_proacl
    FROM pg_proc p
   WHERE p.oid = to_regprocedure('public.responder_revisao_decisao(uuid,text,text)');

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (c): responder_revisao_decisao(uuid,text,text) NÃO existe — REVISAO-03 incompleto';
  END IF;
  IF NOT v_secdef THEN
    RAISE EXCEPTION 'P42 FAIL (c): responder_revisao_decisao NÃO é SECURITY DEFINER — não conseguiria escrever sob RLS';
  END IF;
  IF v_proconfig IS NULL OR NOT ('search_path=' = ANY(v_proconfig) OR 'search_path=""' = ANY(v_proconfig)) THEN
    RAISE EXCEPTION 'P42 FAIL (c): responder_revisao_decisao sem search_path VAZIO em proconfig (%) — DEFINER sem search_path fixo é sequestrável', coalesce(array_to_string(v_proconfig, ','), '<nulo>');
  END IF;

  IF v_proacl IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (c): proacl NULL — privilégios default, PUBLIC ainda executa (REVOKE ausente)';
  END IF;
  SELECT EXISTS (SELECT 1 FROM aclexplode(v_proacl) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
    INTO v_public_exec;
  IF v_public_exec THEN
    RAISE EXCEPTION 'P42 FAIL (c): PUBLIC ainda tem EXECUTE em responder_revisao_decisao';
  END IF;

  v_anon := has_function_privilege('anon', v_oid, 'EXECUTE');
  IF v_anon THEN
    RAISE EXCEPTION 'P42 FAIL (c): anon tem EXECUTE em responder_revisao_decisao — write-path aberto ao papel anônimo';
  END IF;

  v_auth := has_function_privilege('authenticated', v_oid, 'EXECUTE');
  IF NOT v_auth THEN
    RAISE EXCEPTION 'P42 FAIL (c): authenticated NÃO tem EXECUTE — o RH não conseguiria responder';
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): responder_revisao_decisao é DEFINER, search_path vazio, revogada de PUBLIC/anon e concedida a authenticated';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) CATÁLOGO — listar_revisoes_decisao: DEFINER + STABLE, e o RETURNS TABLE NÃO
--     projeta `justificativa` (Pitfall 8 / T-42-03). Asserção NEGATIVA: é o
--     servidor quem impõe o contrato que FILA_REVISAO_COLUNAS espelha no cliente.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_oid oid; v_secdef boolean; v_volatile char; v_result text;
BEGIN
  SELECT p.oid, p.prosecdef, p.provolatile
    INTO v_oid, v_secdef, v_volatile
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname='public' AND p.proname='listar_revisoes_decisao'
   LIMIT 1;

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (d): listar_revisoes_decisao NÃO existe — REVISAO-02 incompleto';
  END IF;
  IF NOT v_secdef THEN
    RAISE EXCEPTION 'P42 FAIL (d): listar_revisoes_decisao NÃO é SECURITY DEFINER — o recrutador leria 100%% das linhas como "Não identificado" (RLS de usuarios_rh)';
  END IF;
  IF v_volatile <> 's' THEN
    RAISE EXCEPTION 'P42 FAIL (d): listar_revisoes_decisao tem provolatile=% — esperado STABLE (s)', v_volatile;
  END IF;

  v_result := pg_get_function_result(v_oid);
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (d): não foi possível ler o RETURNS TABLE de listar_revisoes_decisao';
  END IF;
  -- A asserção NEGATIVA que fecha o Pitfall 8: a justificativa INTERNA do
  -- recrutador (texto livre, PII digitada à mão, BD-9 em aberto) não pode ser
  -- projetada pela fila. `revisao_resultado` é OUTRA coluna e é permitida.
  IF v_result ~ 'justificativa' THEN
    RAISE EXCEPTION 'P42 FAIL (d): o RETURNS TABLE de listar_revisoes_decisao projeta `justificativa` — texto interno do recrutador vazando na fila (Pitfall 8): %', v_result;
  END IF;
  -- RETURNS SETOF decisao_final seria select-estrela por outro nome.
  IF v_result !~ 'TABLE' THEN
    RAISE EXCEPTION 'P42 FAIL (d): listar_revisoes_decisao não devolve TABLE com colunas nomeadas (encontrado: %) — SETOF da tabela arrastaria toda coluna futura', v_result;
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): listar_revisoes_decisao é DEFINER+STABLE e seu RETURNS TABLE não projeta justificativa';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) CATÁLOGO — config_sla_revisao: RLS ligada, NENHUMA policy concede ao papel
--     anônimo (T-42-11 — "o SLA é interno" defendido ABAIXO da UI), e o seed é
--     coerente (dias_atraso > dias_atencao), senão o classificador cliente
--     resolveria a fila inteira para a faixa degenerada.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_rls boolean; v_anon int; v_seed int; v_atencao int; v_atraso int;
BEGIN
  SELECT relrowsecurity INTO v_rls FROM pg_class WHERE oid = 'public.config_sla_revisao'::regclass;
  IF v_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P42 FAIL (e): RLS DESLIGADA em config_sla_revisao — configuração interna aberta';
  END IF;

  -- Asserção NEGATIVA sobre pg_policies.roles: nenhuma policy pode citar `anon`
  -- (nem PUBLIC, que em pg_policies aparece como {public}).
  SELECT count(*) INTO v_anon
    FROM pg_policies p
   WHERE p.schemaname='public' AND p.tablename='config_sla_revisao'
     AND ('anon' = ANY(p.roles) OR 'public' = ANY(p.roles));
  IF v_anon > 0 THEN
    RAISE EXCEPTION 'P42 FAIL (e): % policy(s) de config_sla_revisao concedem ao papel anônimo/PUBLIC — o limiar de SLA é interno e nunca vai ao candidato', v_anon;
  END IF;

  SELECT count(*) INTO v_seed FROM public.config_sla_revisao;
  IF v_seed < 1 THEN
    RAISE EXCEPTION 'P42 FAIL (e): config_sla_revisao SEM seed — o badge cairia na faixa degenerada para 100%% das linhas';
  END IF;

  SELECT dias_atencao, dias_atraso INTO v_atencao, v_atraso
    FROM public.config_sla_revisao ORDER BY 1 LIMIT 1;
  IF v_atencao IS NULL OR v_atraso IS NULL OR v_atencao <= 0 OR v_atraso <= v_atencao THEN
    RAISE EXCEPTION 'P42 FAIL (e): seed incoerente (dias_atencao=% dias_atraso=%) — exigido 0 < dias_atencao < dias_atraso', v_atencao, v_atraso;
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): config_sla_revisao com RLS ligada, zero policy anônima, seed coerente (atencao=% atraso=%)', v_atencao, v_atraso;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (f) + (g) + (h) — o write-path da revisão, numa SUBTRANSAÇÃO QUE REVERTE.
--
-- ⚠ 48-11 — POR QUE ESTE BLOCO MUDOU DE FORMA E (h.2) DE EFEITO. Com a D-01 do operador
-- («reabrir, não reverter», plano 48-11, migration 20260921000011), o veredito `revertida`
-- passou a EXIGIR decisão `rejeitado` e candidatura `rejeitado/rejeitado` (senão 22023). Ele
-- também passou a MUTAR `candidaturas`: volta a `decisao_final/em_analise`, com
-- `data_decisao_final = NULL`, `reaberta_em`/`prazo_nova_decisao_em` e uma linha
-- `rejeitado→decisao_final` no histórico. A forma antiga não servia mais, por três motivos:
-- a fixture (decisão INSERIDA sobre uma candidatura REAL de `candidato.funil@teste.com` em
-- andamento) nem chega ao estado exigido; o teardown (só `decisao_final`/arquivo) deixaria
-- resíduo em `candidaturas` e no histórico; e as escritas de topo COMMITAVAM. Resultado: a
-- resposta de (f) enfileirava um `revisao_respondida` real (NOTIFICACOES_MODO='producao').
--
-- AGORA: titular SINTÉTICO (`@invalido.local`), decisão `rejeitado` registrada pelo DECISOR
-- via `registrar_decisao` e pedido de revisão pelo próprio TITULAR, tudo dentro desta
-- subtransação. O bloco termina em `RAISE … USING ERRCODE = 'P42R1'`, capturado logo acima:
-- ROLLBACK de tudo, inclusive da fila do `pg_net`. Os valores medidos ficam em variáveis
-- PL/pgSQL e o julgamento é feito FORA da subtransação. As trocas de papel continuam
-- `SET ROLE authenticated` para as CHAMADAS e `RESET ROLE` para os READBACKS (as duas
-- correções de spec da P42-06 abaixo seguem valendo).
--
-- A SUBSTÂNCIA das asserções não mudou. (f): decisor barrado com 42501 «decisor», outro RH
-- aceito com autoria gravada. (g): a recusa não escreve nem notifica. (h): fronteira 49/50 e
-- idempotência. Só (h.2) assere o EFEITO NOVO, porque o antigo deixou de ser o correto.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $fgh$
DECLARE
  v_decisor  uuid := current_setting('smoke42.decisor')::uuid;
  v_outro    uuid := current_setting('smoke42.outro')::uuid;
  v_vaga     uuid := current_setting('smoke42.vaga')::uuid;
  v_claims_d text;
  v_claims_o text;
  v_user     uuid := gen_random_uuid();
  v_email    text;
  v_titular  uuid;
  v_cand     uuid;
  v_ran      boolean := false;
  v_err      text;
  -- (f)
  f1_state text;  f2_state text;  f_por uuid;  f_resp timestamptz;
  -- (g)
  g_resp timestamptz;  g_por uuid;  g_ver text;  g_notif_antes bigint;  g_notif_depois bigint;
  -- (h)
  h1_state text;  h2_state text;  h2_resp timestamptz;  h3_state text;
  h2_etapa text;  h2_status text;  h2_ddf timestamptz;  h2_reab timestamptz;
BEGIN
  BEGIN
    -- ── fixture ────────────────────────────────────────────────────────────────
    v_email := 'p42smoke-' || replace(v_user::text, '-', '') || '@invalido.local';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_email, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);
    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento, cidade, estado, como_conheceu)
    VALUES
      (v_user, 'SMOKE P42 Titular', v_email, '(11) 96666-5420', DATE '1990-01-15', 'Santos', 'SP', 'site')
    RETURNING id INTO v_titular;
    -- em decisao_final DE VERDADE (INSERT rejeitado desarma a confirmação; UPDATE leva a em_analise)
    INSERT INTO public.candidaturas (candidato_id, vaga_id, etapa_atual, status, is_rascunho, data_candidatura)
    VALUES (v_titular, v_vaga, 'decisao_final', 'rejeitado', false, now() - interval '20 days')
    RETURNING id INTO v_cand;
    UPDATE public.candidaturas SET status = 'em_analise' WHERE id = v_cand;

    v_claims_d := jsonb_build_object('sub', v_decisor::text, 'role', 'authenticated',
                    'app_metadata', jsonb_build_object('role', current_setting('smoke42.decisor_role')))::text;
    v_claims_o := jsonb_build_object('sub', v_outro::text, 'role', 'authenticated',
                    'app_metadata', jsonb_build_object('role', current_setting('smoke42.outro_role')))::text;

    -- decisão `rejeitado` pelo DECISOR; pedido de revisão pelo TITULAR
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claims', v_claims_d, false);
    PERFORM public.registrar_decisao(v_cand, 'rejeitado', repeat('f', 60));
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_user::text, 'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'candidato'))::text, false);
    PERFORM public.solicitar_revisao_decisao(v_cand);
    RESET ROLE;
    SELECT count(*) INTO g_notif_antes FROM public.notificacoes_enviadas;

    -- ── (f) parte 1 — T-42-V6: o DECISOR tenta responder à revisão da PRÓPRIA decisão ──
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claims', v_claims_d, false);
    BEGIN
      PERFORM public.responder_revisao_decisao(v_cand, 'mantida', repeat('x', 60));
      f1_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN f1_state := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;

    -- ── (g) T-42-V7 — a recusa não escreveu nem notificou (readback como postgres) ──
    SELECT revisao_respondida_em, revisao_por_usuario, revisao_veredito
      INTO g_resp, g_por, g_ver
      FROM public.decisao_final WHERE candidatura_id = v_cand;
    SELECT count(*) INTO g_notif_depois FROM public.notificacoes_enviadas;

    -- ── (f) parte 2 — o OUTRO RH responde `mantida` ─────────────────────────────
    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claims', v_claims_o, false);
    BEGIN
      PERFORM public.responder_revisao_decisao(v_cand, 'mantida', repeat('y', 60));
      f2_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN f2_state := SQLSTATE || ':' || SQLERRM;
    END;
    -- readback como postgres: sob RLS (rh_le_decisao_final escopada por vaga) o SELECT
    -- devolveria vazio e acusaria a implementação por um efeito da espec (correção P42-06)
    RESET ROLE;
    SELECT revisao_por_usuario, revisao_respondida_em INTO f_por, f_resp
      FROM public.decisao_final WHERE candidatura_id = v_cand;

    -- ── (h) T-42-V8 + T-42-V9 — repõe a revisão a NULL (postgres) e testa a fronteira ──
    UPDATE public.decisao_final
       SET revisao_veredito = NULL, revisao_resultado = NULL,
           revisao_por_usuario = NULL, revisao_respondida_em = NULL
     WHERE candidatura_id = v_cand;

    SET ROLE authenticated;
    PERFORM set_config('request.jwt.claims', v_claims_o, false);
    -- (h.1) 49 caracteres → 22023
    BEGIN
      PERFORM public.responder_revisao_decisao(v_cand, 'mantida', repeat('z', 49));
      h1_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN h1_state := SQLSTATE || ':' || SQLERRM;
    END;
    -- (h.2) exatamente 50 → ACEITO. A prova de aceitação é a row devolvida pelo próprio
    -- write-path (RETURNING dentro do DEFINER, imune a RLS). EFEITO NOVO (48-11): `revertida`
    -- REABRE — conferido abaixo como postgres.
    BEGIN
      SELECT (public.responder_revisao_decisao(v_cand, 'revertida', repeat('z', 50))).revisao_respondida_em
        INTO h2_resp;
      h2_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN h2_state := SQLSTATE || ':' || SQLERRM;
    END;
    -- (h.3) 2ª resposta sobre revisão já respondida → 22023 «respondida»
    BEGIN
      PERFORM public.responder_revisao_decisao(v_cand, 'mantida', repeat('w', 60));
      h3_state := 'ACEITO';
    EXCEPTION WHEN OTHERS THEN h3_state := SQLSTATE || ':' || SQLERRM;
    END;
    RESET ROLE;
    SELECT c.etapa_atual::text, c.status::text, c.data_decisao_final INTO h2_etapa, h2_status, h2_ddf
      FROM public.candidaturas c WHERE c.id = v_cand;
    SELECT d.reaberta_em INTO h2_reab FROM public.decisao_final d WHERE d.candidatura_id = v_cand;

    v_ran := true;
    RAISE EXCEPTION 'reverter' USING ERRCODE = 'P42R1';
  EXCEPTION
    WHEN SQLSTATE 'P42R1' THEN NULL;  -- ROLLBACK: fixture, decisão, pedido, respostas, reabertura e fila somem
    WHEN OTHERS THEN
      v_err := SQLSTATE || ': ' || SQLERRM;
  END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', false);
  -- (i) e (j) precisam do id; ele já não existe (é o que (j) confere).
  PERFORM set_config('smoke42.cand', v_cand::text, false);
  PERFORM set_config('smoke42.titular_email', v_email, false);

  IF v_err IS NOT NULL OR NOT v_ran THEN
    RAISE EXCEPTION 'P42 FAIL (fixture/f/g/h): o bloco não rodou até o fim — %', coalesce(v_err, 'sem erro, mas sem marca de execução');
  END IF;

  -- ── (f) julgamento ────────────────────────────────────────────────────────────
  -- 42501 cobre DOIS casos no servidor ("não é RH" e "é o decisor"); só a mensagem discrimina.
  IF f1_state NOT LIKE '42501:%decisor%' THEN
    RAISE EXCEPTION 'P42 FAIL (f): o DECISOR respondendo à própria revisão devolveu «%» (esperado 42501 decisor — REVISAO-05 server-enforced)', f1_state;
  END IF;
  IF f2_state IS DISTINCT FROM 'ACEITO' THEN
    RAISE EXCEPTION 'P42 FAIL (f): o OUTRO RH não conseguiu responder — «%»', f2_state;
  END IF;
  IF f_por IS DISTINCT FROM v_outro THEN
    RAISE EXCEPTION 'P42 FAIL (f): revisao_por_usuario gravou % em vez do REVISOR % — a trilha de autoria da revisão está errada', f_por, v_outro;
  END IF;
  IF f_resp IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (f): revisao_respondida_em não foi gravada apesar do sucesso';
  END IF;
  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): decisor BARRADO (42501 discriminado) e outro RH ACEITO, com autoria e timestamp gravados';

  -- ── (g) julgamento ────────────────────────────────────────────────────────────
  IF g_resp IS NOT NULL OR g_por IS NOT NULL OR g_ver IS NOT NULL THEN
    RAISE EXCEPTION 'P42 FAIL (g): a tentativa RECUSADA gravou (respondida_em=% por=% veredito=%) — o guard corre depois da escrita', g_resp, g_por, g_ver;
  END IF;
  IF g_notif_depois IS DISTINCT FROM g_notif_antes THEN
    RAISE EXCEPTION 'P42 FAIL (g): notificacoes_enviadas subiu de % para % durante a tentativa RECUSADA', g_notif_antes, g_notif_depois;
  END IF;
  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (g): a recusa não escreveu nada na linha e o ledger de notificações não mudou';

  -- ── (h) julgamento ────────────────────────────────────────────────────────────
  IF h1_state NOT LIKE '22023:%' THEN
    RAISE EXCEPTION 'P42 FAIL (h): justificativa de 49 caracteres devolveu «%» (esperado 22023) — o guardrail de substância não morde na fronteira', h1_state;
  END IF;
  IF h2_state IS DISTINCT FROM 'ACEITO' OR h2_resp IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (h): justificativa de 50 caracteres devolveu «%» (respondida_em=%) — esperado ACEITO com timestamp', h2_state, h2_resp;
  END IF;
  -- EFEITO NOVO (48-11 / D-01): revertida REABRE — nunca aprova.
  IF h2_etapa IS DISTINCT FROM 'decisao_final' OR h2_status IS DISTINCT FROM 'em_analise'
     OR h2_ddf IS NOT NULL OR h2_reab IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (h): revertida não reabriu a candidatura — etapa=% status=% data_decisao_final=% reaberta_em=% (esperado decisao_final/em_analise, data NULL, reaberta_em preenchido)',
      h2_etapa, h2_status, h2_ddf, h2_reab;
  END IF;
  IF h3_state NOT LIKE '22023:%respondida%' THEN
    RAISE EXCEPTION 'P42 FAIL (h): a 2ª resposta sobre revisão já respondida devolveu «%» (esperado 22023 já respondida)', h3_state;
  END IF;
  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (h): fronteira 49/50 correta, revertida reabre (decisao_final/em_analise) e 2ª resposta barrada';
END
$fgh$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (i) FAIL-CLOSED — papel `authenticated` com ZERO claim de JWT. Os três RPCs têm
--     de recusar com 42501. É a asserção que faltava: um guard escrito como
--     `v_role NOT IN (…)` é um no-op quando v_role é NULL (três valores), e nenhuma
--     das 8 asserções originais exercitava o caminho sem claim.
--
--     ⚠ Não use o papel `anon` para esta asserção. Após o REVOKE da migration
--     20260730000002, `anon` é barrado no PORTÃO DE PRIVILÉGIO, e o 42501 que
--     retorna prova o grant — não o guard. Só `authenticated` sem claim exercita o
--     corpo da função e portanto o guard propriamente dito.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', NULL, false);
DO $$
DECLARE v_n int; v_ok int := 0;
BEGIN
  BEGIN
    SELECT public.contar_revisoes_pendentes() INTO v_n;
    RAISE EXCEPTION 'P42 FAIL (i): contar_revisoes_pendentes EXECUTOU sem claim de JWT (retornou %) — guard falha ABERTO', coalesce(v_n::text,'NULL');
  EXCEPTION WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  BEGIN
    SELECT count(*) INTO v_n FROM public.listar_revisoes_decisao(false);
    RAISE EXCEPTION 'P42 FAIL (i): listar_revisoes_decisao EXECUTOU sem claim de JWT (% linhas) — guard falha ABERTO', v_n;
  EXCEPTION WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  BEGIN
    PERFORM public.responder_revisao_decisao(current_setting('smoke42.cand')::uuid, 'mantida', repeat('q', 60));
    RAISE EXCEPTION 'P42 FAIL (i): responder_revisao_decisao NAO recusou sem claim de JWT — write-path do Art. 20 com guard aberto';
  EXCEPTION
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
    -- Qualquer OUTRO SQLSTATE aqui significa que a execucao passou do guard e
    -- alcancou o corpo — foi exatamente esse o defeito (P0002 / 23514 chegavam ao
    -- chamador anonimo e formavam um oraculo de estado sobre o pedido do titular).
    WHEN others THEN
      RAISE EXCEPTION 'P42 FAIL (i): responder_revisao_decisao passou do guard sem claim e falhou adiante com % / % — o guard nao e o que barra', SQLSTATE, SQLERRM;
  END;

  IF v_ok <> 3 THEN
    RAISE EXCEPTION 'P42 FAIL (i): apenas % de 3 RPCs recusaram sem claim de JWT', v_ok;
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (i): os 3 RPCs recusam com 42501 sem claim de JWT — guard fail-closed';
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (j) NEGATIVA — ZERO resíduo (48-11). Substitui o antigo TEARDOWN: não há o que apagar,
--     porque nada foi commitado. A negativa PROVA isso: nada da fixture sobrevive, e as
--     contagens de `decisao_final`, `decisao_final_historico`, `historico_candidatura`, da
--     fila do `pg_net` e do ledger de notificações, mais a distribuição de `candidaturas` por
--     etapa/status, são as da baseline capturada nesta execução.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand uuid := current_setting('smoke42.cand')::uuid;
  r_cand int;  r_df int;  r_dfh int;  r_hist int;  r_fila int;  r_tit int;
  g_df bigint;  g_dfh bigint;  g_hist bigint;  g_netq bigint;  g_notif bigint;  g_fp text;
BEGIN
  SELECT count(*) INTO r_cand FROM public.candidaturas WHERE id = v_cand;
  SELECT count(*) INTO r_df   FROM public.decisao_final WHERE candidatura_id = v_cand;
  SELECT count(*) INTO r_dfh  FROM public.decisao_final_historico WHERE candidatura_id = v_cand;
  SELECT count(*) INTO r_hist FROM public.historico_candidatura WHERE candidatura_id = v_cand;
  SELECT count(*) INTO r_fila FROM net.http_request_queue q
   WHERE convert_from(q.body, 'UTF8') LIKE '%' || v_cand::text || '%';
  SELECT count(*) INTO r_tit  FROM public.candidatos WHERE email = current_setting('smoke42.titular_email');
  IF r_cand <> 0 OR r_df <> 0 OR r_dfh <> 0 OR r_hist <> 0 OR r_fila <> 0 OR r_tit <> 0 THEN
    RAISE EXCEPTION 'P42 FAIL (j): RESÍDUO da fixture — candidatura=% decisao_final=% arquivo=% historico=% fila=% titular=% (a subtransação não reverteu; um despacho COMMITADO sai como e-mail)',
      r_cand, r_df, r_dfh, r_hist, r_fila, r_tit;
  END IF;

  SELECT count(*) INTO g_df    FROM public.decisao_final;
  SELECT count(*) INTO g_dfh   FROM public.decisao_final_historico;
  SELECT count(*) INTO g_hist  FROM public.historico_candidatura;
  SELECT count(*) INTO g_netq  FROM net.http_request_queue;
  SELECT count(*) INTO g_notif FROM public.notificacoes_enviadas;
  SELECT md5(coalesce(string_agg(t.linha, E'\n' ORDER BY t.linha), '')) INTO g_fp
    FROM (SELECT format('%s|%s|%s', c.etapa_atual, c.status, count(*)) AS linha
            FROM public.candidaturas c GROUP BY c.etapa_atual, c.status) t;
  IF g_df    IS DISTINCT FROM current_setting('smoke42.n_df')::bigint
     OR g_dfh   IS DISTINCT FROM current_setting('smoke42.n_dfh')::bigint
     OR g_hist  IS DISTINCT FROM current_setting('smoke42.n_hist')::bigint
     OR g_netq  IS DISTINCT FROM current_setting('smoke42.n_netq')::bigint
     OR g_notif IS DISTINCT FROM current_setting('smoke42.n_notif')::bigint
     OR g_fp    IS DISTINCT FROM current_setting('smoke42.fp_cand') THEN
    RAISE EXCEPTION 'P42 FAIL (j): estado global mudou (decisao_final % -> %, arquivo % -> %, historico % -> %, fila % -> %, ledger % -> %, candidaturas por etapa/status mudou=%) com resíduo ZERO da fixture — o delta é de tráfego concorrente commitado durante a requisição; rodar de novo',
      current_setting('smoke42.n_df'), g_df, current_setting('smoke42.n_dfh'), g_dfh,
      current_setting('smoke42.n_hist'), g_hist, current_setting('smoke42.n_netq'), g_netq,
      current_setting('smoke42.n_notif'), g_notif, (g_fp IS DISTINCT FROM current_setting('smoke42.fp_cand'));
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (j): zero resíduo — fixture inexistente e estado global igual à baseline';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO (escopo deliberado: as asserções DESTE
--     arquivo; 48-11 acrescentou (j)). Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_esperado int := 10;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P42 FAIL (z): RESUMO % PASS de % esperadas — run parcial; NÃO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'RESUMO: % asserções PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT json_build_object(
  'smoke',    'p42_revisao_art20',
  'pass',     current_setting('smoke42.pass')::int,
  'esperado', 10
) AS resultado;
