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
-- GATE VERDE = o contador `smoke42.pass` bate **8** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial (asserção pulada por erro de ambiente)
-- acumularia < 8 e o RESUMO reprova alto. Esperado FIXO — não há metade adaptativa.
--
-- ⚠ ESTE SMOKE ESCREVE. Diferente do p41 (100% catálogo), as asserções (f), (g) e
-- (h) fazem chamadas REAIS de escrita sobre uma linha de `decisao_final` de
-- fixture. A fixture é criada no topo e REMOVIDA no teardown ao final (idioma
-- P41-05 T3), incluindo as linhas que o trigger `trg_decisao_final_snapshot`
-- arquiva em `decisao_final_historico` a cada UPDATE.
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
--   (z) RESUMO — exige o total de 9 PASS; run parcial falha AQUI, não em silêncio.
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

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE (como postgres) — dois auth.users DISTINTOS que sejam usuarios_rh
-- ATIVOS, mais uma candidatura de teste sem decisao_final. Resolve tudo em GUCs.
--
-- ⚠ Se QUALQUER id resolver para NULL, levanta exceção ALTO. Esta prova é o
-- critério de sucesso #3 do ROADMAP e NÃO pode virar SKIP silencioso — um SKIP
-- aqui seria indistinguível de um guard que não existe.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_decisor      uuid;
  v_outro        uuid;
  v_cand         uuid;
  v_decisor_role text;
  v_outro_role   text;
  v_notif_antes  int;
BEGIN
  -- Contas de teste PROD registradas na STATE.md § Blockers/Concerns.
  SELECT u.id INTO v_decisor
    FROM auth.users u
    JOIN public.usuarios_rh r ON r.user_id = u.id
   WHERE u.email = 'e2e.admin@beautysmile.com.br'
     AND r.ativo = true AND r.deleted_at IS NULL;

  SELECT r.user_id INTO v_outro
    FROM public.usuarios_rh r
   WHERE r.user_id = 'fba9bc0f-4053-4eff-bc71-9cc8d1cddbe7'::uuid
     AND r.ativo = true AND r.deleted_at IS NULL;

  IF v_decisor IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (fixture): o RH decisor (e2e.admin@beautysmile.com.br) não resolveu para um usuarios_rh ATIVO — a prova do guard não pode rodar sem dois RHs reais';
  END IF;
  IF v_outro IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (fixture): o 2º RH (recrutador fba9bc0f-…) não resolveu para um usuarios_rh ATIVO — sem um SEGUNDO RH o guard reviewer<>decider é intestável';
  END IF;
  IF v_decisor = v_outro THEN
    RAISE EXCEPTION 'P42 FAIL (fixture): decisor e revisor resolveram para o MESMO usuário — a prova exige dois auth.users DISTINTOS';
  END IF;

  -- Mapeamento de taxonomia de role (Pattern 5): usuarios_rh.role NUNCA vale 'rh';
  -- o custom_access_token_hook mapeia recrutador → 'rh' em app_metadata.role.
  SELECT CASE WHEN r.role = 'administrador' THEN 'administrador' ELSE 'rh' END
    INTO v_decisor_role FROM public.usuarios_rh r WHERE r.user_id = v_decisor;
  SELECT CASE WHEN r.role = 'administrador' THEN 'administrador' ELSE 'rh' END
    INTO v_outro_role   FROM public.usuarios_rh r WHERE r.user_id = v_outro;

  -- Uma candidatura do candidato de teste que AINDA NÃO tenha decisao_final — assim
  -- a fixture nunca sobrescreve uma decisão real.
  SELECT c.id INTO v_cand
    FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
    JOIN auth.users u ON u.id = ca.user_id
   WHERE u.email = 'candidato.funil@teste.com'
     AND c.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.decisao_final d WHERE d.candidatura_id = c.id)
   LIMIT 1;

  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (fixture): nenhuma candidatura de candidato.funil@teste.com SEM decisao_final — criar uma antes de rodar (não sobrescrever decisão real)';
  END IF;

  -- A linha de fixture: decisão registrada pelo DECISOR, com revisão JÁ SOLICITADA
  -- (senão o guard de alcançabilidade barraria antes do guard sob teste).
  INSERT INTO public.decisao_final
    (candidatura_id, decisao, justificativa, por_usuario, revisao_solicitada_em)
  VALUES
    (v_cand, 'rejeitado', repeat('f', 60), v_decisor, now());

  SELECT count(*) INTO v_notif_antes FROM public.notificacoes_enviadas;

  PERFORM set_config('smoke42.decisor',      v_decisor::text,      false);
  PERFORM set_config('smoke42.outro',        v_outro::text,        false);
  PERFORM set_config('smoke42.cand',         v_cand::text,         false);
  PERFORM set_config('smoke42.decisor_role', v_decisor_role,       false);
  PERFORM set_config('smoke42.outro_role',   v_outro_role,         false);
  PERFORM set_config('smoke42.notif_antes',  v_notif_antes::text,  false);
  PERFORM set_config('smoke42.criou',        'y',                  false);

  RAISE NOTICE 'FIXTURE ok: 2 RHs distintos resolvidos (roles JWT %/%), decisao_final de teste criada com revisao_solicitada_em; ledger de notificações em % linhas',
    v_decisor_role, v_outro_role, v_notif_antes;
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
-- (f) parte 1 — T-42-V6: o DECISOR tenta responder à revisão da PRÓPRIA decisão.
--     TEM de ser recusado com 42501 e mensagem discriminável. Um SUCESSO aqui é
--     falha do smoke, nunca verde. O contador só é incrementado na parte 2.
-- ─────────────────────────────────────────────────────────────────────────────
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke42.decisor'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', current_setting('smoke42.decisor_role')))::text, false);
  BEGIN
    PERFORM public.responder_revisao_decisao(
      current_setting('smoke42.cand')::uuid, 'mantida', repeat('x', 60));
    RAISE EXCEPTION 'P42 FAIL (f): o DECISOR conseguiu responder à revisão da própria decisão — REVISAO-05 NÃO é server-enforced';
  EXCEPTION WHEN sqlstate '42501' THEN
    -- 42501 cobre DOIS casos no servidor ("não é RH" e "é o decisor"); aceitar o
    -- SQLSTATE genericamente provaria a coisa errada. Só a mensagem discrimina.
    IF SQLERRM LIKE '%decisor%' THEN
      PERFORM set_config('smoke42.f_barrado', 'y', false);
      RAISE NOTICE 'PASS (f.1): decisor barrado pelo servidor (42501, mensagem discriminável)';
    ELSE
      RAISE EXCEPTION 'P42 FAIL (f): 42501 porém mensagem inesperada (pode ser a recusa "não é RH", não o guard): %', SQLERRM;
    END IF;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (g) T-42-V7 — ASSERÇÃO NEGATIVA, medida ENTRE a tentativa barrada e a
--     bem-sucedida: a recusa não pode ter escrito nada nem disparado notificação.
--     Um guard que recusa DEPOIS de escrever é um guard tarde demais.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_resp timestamptz; v_por uuid; v_ver text;
  v_notif_agora int; v_notif_antes int;
BEGIN
  IF current_setting('smoke42.f_barrado', true) IS DISTINCT FROM 'y' THEN
    RAISE EXCEPTION 'P42 FAIL (g): a tentativa barrada (f.1) não chegou a rodar — impossível asserir o não-efeito';
  END IF;

  SELECT revisao_respondida_em, revisao_por_usuario, revisao_veredito
    INTO v_resp, v_por, v_ver
    FROM public.decisao_final
   WHERE candidatura_id = current_setting('smoke42.cand')::uuid;

  IF v_resp IS NOT NULL THEN
    RAISE EXCEPTION 'P42 FAIL (g): revisao_respondida_em foi GRAVADA pela tentativa recusada — o guard corre depois da escrita';
  END IF;
  IF v_por IS NOT NULL THEN
    RAISE EXCEPTION 'P42 FAIL (g): revisao_por_usuario foi GRAVADA pela tentativa recusada';
  END IF;
  IF v_ver IS NOT NULL THEN
    RAISE EXCEPTION 'P42 FAIL (g): revisao_veredito foi GRAVADO pela tentativa recusada';
  END IF;

  v_notif_antes := coalesce(nullif(current_setting('smoke42.notif_antes', true), ''), '-1')::int;
  SELECT count(*) INTO v_notif_agora FROM public.notificacoes_enviadas;
  IF v_notif_antes < 0 THEN
    RAISE EXCEPTION 'P42 FAIL (g): baseline do ledger de notificações não foi capturado na fixture';
  END IF;
  IF v_notif_agora <> v_notif_antes THEN
    RAISE EXCEPTION 'P42 FAIL (g): notificacoes_enviadas subiu de % para % durante a tentativa RECUSADA — o candidato receberia e-mail de uma revisão que não foi respondida', v_notif_antes, v_notif_agora;
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (g): a recusa não escreveu nada na linha e o ledger de notificações permaneceu em % linhas', v_notif_agora;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (f) parte 2 — T-42-V6: o OUTRO RH responde. TEM de suceder, gravando a autoria
--     e o timestamp. Só aqui o contador de (f) é incrementado.
-- ─────────────────────────────────────────────────────────────────────────────
-- A CHAMADA é feita como `authenticated` (é o papel real do RH no PostgREST).
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke42.outro'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', current_setting('smoke42.outro_role')))::text, false);

  PERFORM public.responder_revisao_decisao(
    current_setting('smoke42.cand')::uuid, 'mantida', repeat('y', 60));
END $$;

-- ⚠ CORREÇÃO DE SPEC (P42-06, 2ª rodada do checkpoint da Task 2 — justificativa
-- registrada). O READBACK precisa de `RESET ROLE`, exatamente como a asserção (g)
-- já fazia. Na forma original ele vivia DENTRO do mesmo bloco `SET ROLE
-- authenticated` da chamada, e portanto lia `decisao_final` SOB RLS: a tabela tem
-- RLS ligada com `rh_le_decisao_final [SELECT]` escopada por vaga, e a candidatura
-- de fixture pertence a uma vaga que o revisor NÃO criou. O SELECT devolvia ZERO
-- linhas, `v_por` ficava NULL, e a asserção reprovava com "autoria errada" —
-- acusando a implementação por um efeito da própria espec.
--
-- Este é o modo de falha mais perigoso possível para um gate: RLS filtrando um
-- readback não levanta erro, devolve vazio. Se o teste fosse escrito ao contrário
-- (esperando NULL), ele passaria em verde sem NADA ter sido verificado. A verificação
-- de um write feito sob um papel restrito tem de ser lida por um papel que veja a
-- tabela inteira, senão o gate afere a RLS em vez de aferir a escrita.
RESET ROLE;
DO $$
DECLARE v_por uuid; v_resp timestamptz;
BEGIN
  SELECT revisao_por_usuario, revisao_respondida_em INTO v_por, v_resp
    FROM public.decisao_final
   WHERE candidatura_id = current_setting('smoke42.cand')::uuid;

  IF v_por IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (f): revisao_por_usuario está NULL após o sucesso — ou a escrita não ocorreu, ou o readback foi filtrado (ler como postgres, nunca sob RLS)';
  END IF;
  IF v_por::text IS DISTINCT FROM current_setting('smoke42.outro') THEN
    RAISE EXCEPTION 'P42 FAIL (f): revisao_por_usuario gravou % em vez do REVISOR % — a trilha de autoria da revisão está errada',
      v_por, current_setting('smoke42.outro');
  END IF;
  IF v_resp IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (f): revisao_respondida_em não foi gravada apesar do sucesso';
  END IF;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): decisor BARRADO (42501 discriminado) e outro RH ACEITO, com autoria % e timestamp gravados — REVISAO-05 server-enforced', v_por;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (h) T-42-V8 + T-42-V9 — fronteira dos 50 caracteres e idempotência.
--     Repor a fixture a NULL como postgres ANTES dos sub-casos (a linha ficou
--     respondida por (f) parte 2).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
UPDATE public.decisao_final
   SET revisao_veredito = NULL, revisao_resultado = NULL,
       revisao_por_usuario = NULL, revisao_respondida_em = NULL
 WHERE candidatura_id = current_setting('smoke42.cand')::uuid;

SET ROLE authenticated;
DO $$
DECLARE v_resp timestamptz;
BEGIN
  PERFORM set_config('request.jwt.claims', jsonb_build_object(
    'sub', current_setting('smoke42.outro'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('role', current_setting('smoke42.outro_role')))::text, false);

  -- (h.1) FRONTEIRA INFERIOR — 49 caracteres tem de ser RECUSADO (22023).
  BEGIN
    PERFORM public.responder_revisao_decisao(
      current_setting('smoke42.cand')::uuid, 'mantida', repeat('z', 49));
    RAISE EXCEPTION 'P42 FAIL (h): justificativa de 49 caracteres ACEITA — o guardrail de substância não morde na fronteira';
  EXCEPTION WHEN sqlstate '22023' THEN
    RAISE NOTICE 'PASS (h.1): 49 caracteres recusado (22023)';
  END;

  -- (h.2) FRONTEIRA — exatamente 50 caracteres tem de ser ACEITO.
  --
  -- ⚠ A prova de aceitação NÃO pode ser um readback aqui: estamos sob `SET ROLE
  -- authenticated` e `decisao_final` tem RLS escopada por vaga, então o SELECT
  -- devolveria zero linhas e reprovaria um write que ocorreu (mesma correção de
  -- spec aplicada em (f) parte 2). O RPC devolve a row via `RETURNING * INTO`, e é
  -- ESSA row — o retorno do próprio write-path, imune a RLS por vir de dentro do
  -- DEFINER — que prova a aceitação. Um erro aqui levantaria exceção e abortaria.
  SELECT (public.responder_revisao_decisao(
            current_setting('smoke42.cand')::uuid, 'revertida', repeat('z', 50))
         ).revisao_respondida_em
    INTO v_resp;
  IF v_resp IS NULL THEN
    RAISE EXCEPTION 'P42 FAIL (h): justificativa de 50 caracteres foi aceita porém revisao_respondida_em voltou NULL do próprio write-path';
  END IF;

  -- (h.3) IDEMPOTÊNCIA — uma resposta, uma vez. 2ª chamada tem de ser recusada
  -- com mensagem discriminável ('respondida'), não um 22023 qualquer.
  BEGIN
    PERFORM public.responder_revisao_decisao(
      current_setting('smoke42.cand')::uuid, 'mantida', repeat('w', 60));
    RAISE EXCEPTION 'P42 FAIL (h): 2ª resposta ACEITA sobre revisão já respondida — o veredito é sobrescrevível';
  EXCEPTION WHEN sqlstate '22023' THEN
    IF SQLERRM LIKE '%respondida%' THEN
      RAISE NOTICE 'PASS (h.3): 2ª resposta recusada por idempotência (22023 já respondida)';
    ELSE
      RAISE EXCEPTION 'P42 FAIL (h): 22023 porém mensagem inesperada (não é a recusa de idempotência): %', SQLERRM;
    END IF;
  END;

  PERFORM set_config('smoke42.pass', (coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (h): fronteira 49/50 correta e 2ª resposta barrada por idempotência';
END $$;

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
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_esperado int := 9;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke42.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P42 FAIL (z): RESUMO % PASS de % esperadas — run parcial; NÃO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'RESUMO: % asserções PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEARDOWN — devolve o estado. A fixture criada por este arquivo é REMOVIDA:
-- a linha de decisao_final E as linhas que o trigger trg_decisao_final_snapshot
-- arquivou em decisao_final_historico a cada UPDATE feito acima.
--
-- ⚠ Roda MESMO se uma asserção acima falhar? NÃO — uma exceção aborta o script.
-- Nesse caso, remover a fixture MANUALMENTE com os dois comandos abaixo usando o
-- candidatura_id emitido no NOTICE da FIXTURE. Deixar a linha para trás
-- contaminaria a fila de revisão de PROD com um item de teste.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DELETE FROM public.decisao_final_historico
 WHERE candidatura_id = current_setting('smoke42.cand')::uuid;

DELETE FROM public.decisao_final
 WHERE candidatura_id = current_setting('smoke42.cand')::uuid
   AND current_setting('smoke42.criou', true) = 'y';

DO $$
DECLARE v_resto int;
BEGIN
  SELECT count(*) INTO v_resto FROM public.decisao_final
   WHERE candidatura_id = current_setting('smoke42.cand')::uuid;
  IF v_resto <> 0 THEN
    RAISE EXCEPTION 'P42 FAIL (teardown): a linha de fixture NÃO foi removida — item de teste ficaria na fila de revisão de PROD';
  END IF;
  RAISE NOTICE 'TEARDOWN ok: fixture removida (decisao_final + histórico arquivado pelo trigger)';
END $$;

RESET ROLE;
