-- =============================================================================
-- Phase 43 / Plano 43-06 Task 2 — ESPEC EXECUTÁVEL da prévia de retenção
-- (RETEN-04 · PURGA-02 herdado pela Phase 46)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito ANTES do apply de `20260801000004_p43_previa_retencao.sql`,
-- deliberadamente RED: as três funções ainda não existem em PROD. Ele descreve o
-- que a migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi aplicado é ESCALAR o problema — é exatamente o
-- movimento que transforma um gate em decoração. A única exceção autorizada está
-- escrita no bloco de PROVENIÊNCIA abaixo, e ela é sobre a EXTRAÇÃO do corpo,
-- nunca sobre o rigor da asserção.
--
-- -----------------------------------------------------------------------------
-- ⚠ EMENDADO EM 2026-08-23 PELA PHASE 46 / PLANO 46-02 — TRÊS ALTERAÇÕES
-- -----------------------------------------------------------------------------
-- A migration `20260823000003_p46_predicado_titular.sql` ESTENDEU o predicado
-- (assinatura de 3 para 6 colunas, escada da data-âncora num `LATERAL` calculado
-- uma vez, cláusula `elegivel_purga` de D-46-19) e criou um TERCEIRO wrapper,
-- `titulares_alem_da_janela()`. As três emendas entraram no MESMO commit que a
-- migration que as obriga, porque uma delas não é opcional:
--
--   (e) RE-PIN do `md5(prosrc)`. Valor anterior `ddfa6542…` (775 octetos, medido
--       2026-08-01), valor vigente `6df35644…` (1357 octetos, medido 2026-08-23),
--       com conferência CRUZADA vivo × arquivo — ver PROVENIÊNCIA. A rede
--       estrutural embaixo do md5 GANHOU duas checagens e não perdeu nenhuma.
--   (f) DE DOIS PARA TRÊS wrappers na lista literal de `proname`.
--   (g) DE TRÊS PARA QUATRO funções na negativa de verbo de escrita.
--
-- ⚠ POR QUE (f) E (g) NÃO SÃO COSMÉTICA: as duas iteram sobre listas LITERAIS de
-- nomes e exigem uma contagem exata. Um objeto NOVO não as faz reprovar — ele
-- simplesmente fica FORA delas, e o portão continua verde enquanto o único
-- wrapper que a purga realmente consome fica sem vigilância. **Um portão que não
-- enxerga o objeto novo é pior que um portão vermelho: ele parece verde.**
--
-- -----------------------------------------------------------------------------
-- COMO RODAR
-- -----------------------------------------------------------------------------
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** —
-- nunca pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug
-- upstream anthropics/claude-code#13898). A chamada única é obrigatória por
-- motivo MECÂNICO: `set_config(..., false)` é escopado à SESSÃO, então statements
-- espalhados por chamadas separadas zerariam o contador `smoke43p.pass` e o
-- RESUMO (z) reprovaria um run que na verdade passou (lição da P41-05).
--
-- GATE VERDE = o contador `smoke43p.pass` bate **9** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial acumularia < 9 e o RESUMO reprova ALTO.
-- Esperado FIXO — não há metade adaptativa.
--
-- -----------------------------------------------------------------------------
-- ⚠ ESTE SMOKE NÃO ESCREVE NADA. NEM DENTRO DE SUBTRANSAÇÃO.
-- -----------------------------------------------------------------------------
-- Diferente do `p43_matriz_retencao_smoke.sql`, aqui não há um só `INSERT`,
-- `UPDATE` ou `DELETE` — nem revertido. As QUATRO funções sob teste (três desde a
-- Phase 43, mais `titulares_alem_da_janela` desde a Phase 46) são STABLE e
-- read-only, e a asserção (i) transforma essa afirmação em MEDIÇÃO.
--
-- -----------------------------------------------------------------------------
-- AS 9 ASSERÇÕES — cinco delas NEGATIVAS
-- -----------------------------------------------------------------------------
--   (a) A PRÉVIA NÃO EXPÕE PII — o tipo de retorno dos dois wrappers, lido de
--       `pg_get_function_result`, não contém coluna de id de candidato/candidatura,
--       nome, e-mail, CPF ou telefone. Asserção sobre a ASSINATURA, não sobre uma
--       execução: uma tela que enumera pessoas prestes a serem apagadas é
--       superfície de exfiltração construída sem necessidade, e a proibição tem
--       de valer ANTES de qualquer render.
--   (b) ⊖ NEGATIVA — `proacl` de `candidaturas_alem_da_janela` NÃO concede
--       EXECUTE a `anon`, a `authenticated` nem a PUBLIC. É a função que devolve
--       LINHAS IDENTIFICÁVEIS; ela não pode ser chamável por papel de cliente.
--   (c) ⊖ NEGATIVA — `proacl` dos DOIS wrappers não contém `anon`.
--   (d) ⊖ GUARD — os dois wrappers recusam papel `rh` com 42501 **e** recusam o
--       chamador SEM CLAIM NENHUMA com 42501. A segunda metade é a que fecha o
--       defeito sistêmico: um guard NULL-cego (`NOT IN`) passa pela primeira em
--       verde e falha ABERTO exatamente para o chamador mais suspeito.
--   (e) GATE DE NÃO-DIVERGÊNCIA, PARTE 1 — `md5(prosrc)` de
--       `candidaturas_alem_da_janela` bate o valor PINADO abaixo.
--   (f) GATE DE NÃO-DIVERGÊNCIA, PARTE 2 — `pg_get_functiondef` dos TRÊS
--       wrappers CONTÉM a chamada a `candidaturas_alem_da_janela`, e nenhum deles
--       referencia `config_retencao_etapa` por conta própria. Se alguém reescrever
--       a prévia (ou a varredura) com um predicado próprio, esta asserção reprova
--       — que é o ponto inteiro de a definição ser única.
--   (g) ⊖ NEGATIVA DE ESCRITA — o `prosrc` das QUATRO funções não contém verbo de
--       escrita. As quatro são read-only por contrato, e a afirmação vira medição.
--   (h) COERÊNCIA — a prévia executa; a soma de `candidaturas_afetadas` por
--       estado é IGUAL ao número de linhas do predicado; o total é MENOR OU IGUAL
--       à soma dos `candidatos_afetados` por estado; e `calculada_em` é um
--       carimbo de AGORA, vindo do servidor.
--   (i) ⊖ NEGATIVA E OBRIGATÓRIA — as contagens de `public.candidaturas` e de
--       `public.candidatos` são IDÊNTICAS antes e depois do smoke.
--   (z) RESUMO — exige o total exato de 9 PASS. Run parcial falha AQUI.
--
-- =============================================================================
-- POR QUE (e) COMPARA POR md5 E NÃO POR STRING TRANSCRITA
-- =============================================================================
-- Duas razões, nesta ordem:
--   1. md5 sobre o corpo inteiro É comparação byte a byte. Um espaço a mais, uma
--      quebra de linha a menos, um acento trocado — qualquer diferença muda o
--      resumo. É estritamente mais forte que inspeção visual e que `strpos`.
--   2. Transcrever o corpo esperado AQUI traria de volta o próprio sítio de
--      drift que este gate existe para fechar: passaria a haver DUAS cópias do
--      predicado no repositório, e a segunda envelheceria em silêncio. O resumo
--      carrega a mesma informação sem carregar a cópia.
--
-- PROVENIÊNCIA DO RESUMO ESPERADO (não apagar — é o que torna um re-pin auditável)
--
--   valor VIGENTE  : 6df3564414519abc56379d9b8924fad0   (1357 octetos)
--   origem         : corpo entre os dois delimitadores NOMEADOS de cifrão do
--                    `CREATE FUNCTION public.candidaturas_alem_da_janela()` em
--                    `supabase/migrations/20260823000003_p46_predicado_titular.sql`
--   re-pinado em   : 2026-08-23, pelo plano 46-02 da Phase 46
--   POR QUE MUDOU  : a Phase 46 ESTENDEU o predicado, e a mudança era ESPERADA e
--                    está declarada no `46-CONTEXT.md` §Área 1. São três
--                    alterações no corpo: a assinatura passou de TRÊS para SEIS
--                    colunas (`janela_meses_aplicada`, `ancora_origem`,
--                    `ancora_em`, que o ledger de PURGA-06 exige); a escada da
--                    data-âncora foi para um `CROSS JOIN LATERAL` que a calcula
--                    UMA vez, de modo que o `WHERE` filtre pelo MESMO instante que
--                    a saída relata; e entrou a cláusula `m.elegivel_purga`, a
--                    allowlist de D-46-19. O `DROP`+`CREATE` (necessário porque
--                    `RETURNS TABLE` não é substituível em lugar) está declarado
--                    no escopo negativo daquela migration.
--   CONFERENCIA    : CRUZADA, nos DOIS lados — e é a conferência que autoriza o
--                    pin, não "li o valor vivo e copiei". Copiar o valor vivo
--                    pinaria o que está aplicado, seja lá o que for, e o gate
--                    deixaria de comparar.
--                      md5(prosrc) VIVO (pg_proc, via MCP somente-leitura)  ==
--                      md5(corpo)  do ARQUIVO commitado (comando abaixo)
--                    lado ARQUIVO : 6df3564414519abc56379d9b8924fad0, 1357
--                                   octetos, medido em 2026-08-23 POR EXECUÇÃO do
--                                   comando de recomputação — nunca digitado.
--                    lado VIVO    : medido pelo ORQUESTRADOR no checkpoint do
--                                   plano 46-02, imediatamente APÓS o apply da
--                                   `20260823000003`. Os dois valores ficam
--                                   registrados lado a lado no `46-02-SUMMARY.md`.
--
--   valor ANTERIOR : ddfa6542921d241323c0124fc1bd1f99   (775 octetos)
--                    origem: `20260801000004_p43_previa_retencao.sql`, medido em
--                    2026-08-01 e confirmado ainda válido em 2026-08-22
--                    (`46-01-MEDICOES.md` §M4b). Vigorou até 2026-08-23.
--                    ⚠ FICA AQUI COMO HISTÓRICO, e apagá-lo destruiria a única
--                    coisa que torna o re-pin auditável: sem ele não há como ver
--                    que o pin mudou UMA vez, com data e com razão, em vez de ter
--                    mudado sozinho.
--
--   recomputar (se e somente se a migration mudar):
--     node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
--       D="$"+process.argv[2]+"$", a=f.indexOf(D),
--       b=f.indexOf(D,a+D.length);
--       console.log(require("crypto").createHash("md5")
--         .update(f.slice(a+D.length,b),"utf8").digest("hex"))' \
--       supabase/migrations/20260823000003_p46_predicado_titular.sql \
--       candidaturas_alem_da_janela
--   ⚠ O nome do delimitador entra por ARGUMENTO e nunca literal no comando: um
--     arquivo que MENCIONE `$` + `candidaturas_alem_da_janela` + `$` num
--     comentário faria o `indexOf` casar o comentário e extrair o corpo errado.
--     Foi o defeito encontrado e corrigido durante o próprio re-pin de 2026-08-23.
--   ⚠ Se este resumo for re-pinado sem que a migration tenha mudado, a asserção
--     (e) deixa de provar qualquer coisa. Re-pinar é ATO CONSCIENTE E REVISÁVEL.
--   ⚠⚠ UM RE-PIN NUNCA É DESCULPA PARA AFROUXAR A ASSERÇÃO (Pitfall 2). A rede
--     estrutural embaixo do md5 GANHOU duas checagens nesta fase — `elegivel_purga`
--     presente (a allowlist é DADO, não lista no código) e `ancora_origem` presente
--     (a política viaja do predicado até o ledger, calculada uma vez só) — e não
--     perdeu nenhuma. Ela só cresce. Um portão que reprova trabalho correto treina
--     quem executa a desligá-lo; um portão afrouxado para caber no trabalho não
--     reprova mais nada.
--
-- ⚠ A ÚNICA DIVERGÊNCIA AUTORIZADA, E O SEU TESTE DE DISCRIMINAÇÃO
-- Se no checkpoint o pin de (e) NÃO bater **E** o `md5(statements[1])` do apply
-- tiver batido o md5 do arquivo (ou seja: o SQL aplicado é COMPROVADAMENTE
-- idêntico ao arquivo commitado), então a divergência é da EXTRAÇÃO do corpo pelo
-- comando acima, **não do objeto vivo**. Nesse e apenas nesse caso o orquestrador
-- atualiza o pin UMA vez com o valor medido e registra a discrepância de extração
-- no SUMMARY. NUNCA o contrário — nunca afrouxar a asserção, nunca trocar o md5
-- por `strpos`, nunca marcar (e) como opcional.
--
-- =============================================================================
-- POR QUE (g) USA FRONTEIRA DE PALAVRA E NÃO `strpos` SOBRE A SUBSTRING NUA
-- =============================================================================
-- Porque `strpos(lower(prosrc), 'update')` REPROVARIA a implementação CORRETA: o
-- degrau (3) da data-âncora é `c.updated_at`, e a exceção de soft-delete é
-- `c.deleted_at`. As duas colunas contêm `update` e `delete` como SUBSTRING. Um
-- teste que reprova o comportamento correto é pior que teste nenhum: ele treina
-- quem executa a desligá-lo (mesma lição que a 43-UI-SPEC registrou sobre o
-- escopo do grep de `automaticamente`).
-- `\m` e `\M` são as fronteiras de palavra do regex do Postgres, e `_` conta como
-- caractere de palavra — então `\mupdate\M` NÃO casa dentro de `updated_at`, mas
-- casa no verbo `UPDATE` isolado. É o verbo que está banido, não a letra.
--
-- HIGIENE: `RESET ROLE` em toda troca de contexto e ao final; a claim impersonada
-- é limpa explicitamente. Os NOTICEs carregam contagens, SQLSTATEs, resumos md5 e
-- nomes de objeto — NUNCA PII e nunca o valor de um segredo.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke43p.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE — baselines de (i). Nenhum ator é necessário: o guard das duas funções
-- lê APENAS a claim `app_metadata.role`, então a impersonação de (d) e (h) não
-- depende de existir um administrador vivo. Isso é propriedade da função, não
-- conveniência do teste — e é por isso que este smoke não pode ficar verde por
-- ausência de fixture.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cands  bigint;
  v_candos bigint;
BEGIN
  SELECT count(*) INTO v_cands  FROM public.candidaturas;
  SELECT count(*) INTO v_candos FROM public.candidatos;

  PERFORM set_config('smoke43p.cands',  v_cands::text,  false);
  PERFORM set_config('smoke43p.candos', v_candos::text, false);

  RAISE NOTICE 'P43P FIXTURE ok: baseline zero-destrutiva = % candidaturas / % candidatos', v_cands, v_candos;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) A PRÉVIA NÃO EXPÕE PII — asserção sobre a ASSINATURA.
--
--     `pg_get_function_result` devolve o `RETURNS TABLE(...)` inteiro. A banlist
--     é de IDENTIFICADORES de pessoa, não de radicais: `candidatos_afetados` é
--     uma CONTAGEM e tem de passar; `candidato_id` é um identificador e tem de
--     reprovar. Por isso a banlist casa `candidato_id`, e não `candidato`.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  r          record;
  v_checadas int := 0;
  v_banido   text;
  v_banlist  text[] := ARRAY[
    'candidato_id', 'candidatura_id', '\mid\M', 'nome', 'email', 'e_mail',
    '\mcpf\M', 'telefone', 'curriculo'
  ];
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_result(p.oid) AS ret
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('previa_retencao', 'previa_retencao_total')
  LOOP
    v_checadas := v_checadas + 1;

    FOREACH v_banido IN ARRAY v_banlist LOOP
      IF lower(r.ret) ~ v_banido THEN
        RAISE EXCEPTION 'P43P FAIL (a): a assinatura de public.%() contem o identificador banido /%/ — %. Uma previa que devolve id, nome ou e-mail e uma lista de pessoas prestes a serem apagadas, ou seja superficie de exfiltracao de PII construida sem necessidade. So contagens agregadas passam daqui', r.proname, v_banido, r.ret;
      END IF;
    END LOOP;
  END LOOP;

  IF v_checadas <> 2 THEN
    RAISE EXCEPTION 'P43P FAIL (a): encontrei % dos 2 wrappers esperados em public — a migration 20260801000004 nao criou ambos', v_checadas;
  END IF;

  -- Metade POSITIVA: uma funcao que nao devolvesse nada passaria pela banlist em
  -- silencio. As colunas de contagem TEM de estar la.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'previa_retencao'
       AND pg_get_function_result(p.oid) LIKE '%candidaturas_afetadas%'
       AND pg_get_function_result(p.oid) LIKE '%candidatos_afetados%'
       AND pg_get_function_result(p.oid) LIKE '%etapa%'
  ) THEN
    RAISE EXCEPTION 'P43P FAIL (a): previa_retencao nao devolve etapa + candidaturas_afetadas + candidatos_afetados — a banlist passaria por vacuidade';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'previa_retencao_total'
       AND pg_get_function_result(p.oid) LIKE '%candidatos_afetados%'
       AND pg_get_function_result(p.oid) LIKE '%calculada_em%'
  ) THEN
    RAISE EXCEPTION 'P43P FAIL (a): previa_retencao_total nao devolve candidatos_afetados + calculada_em — sem o carimbo nao ha como distinguir um numero de hoje de um numero colado do mes passado';
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (a): os 2 wrappers devolvem SO contagens + carimbo; nenhum identificador de pessoa na assinatura';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) ⊖ NEGATIVA — O PREDICADO NÃO É CHAMÁVEL POR PAPEL DE CLIENTE.
--
--     `candidaturas_alem_da_janela` é a ÚNICA função da fase que devolve linhas
--     IDENTIFICÁVEIS. Se `authenticated` tiver EXECUTE, ela vira endpoint
--     PostgREST e a prévia agregada deixa de ser a única porta — a proibição de
--     enumerar PII passaria a depender de ninguém chamar a função errada.
--     PUBLIC é `grantee = 0` em `aclexplode` e NÃO aparece num JOIN com
--     `pg_roles`; por isso ele é checado separadamente.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_acl     aclitem[];
  v_ofensor text;
BEGIN
  SELECT p.proacl INTO v_acl
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'candidaturas_alem_da_janela';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'P43P FAIL (b): public.candidaturas_alem_da_janela NAO existe — a migration 20260801000004 nao foi aplicada';
  END IF;

  IF v_acl IS NULL THEN
    RAISE EXCEPTION 'P43P FAIL (b): proacl NULO em candidaturas_alem_da_janela — nenhum REVOKE explicito foi aplicado, logo o pg_default_acl deste schema (que concede EXECUTE a anon e authenticated como grant DIRETO em todo CREATE FUNCTION) esta em vigor, e o predicado que devolve ids esta chamavel via PostgREST';
  END IF;

  SELECT string_agg(coalesce(g.rolname, 'PUBLIC') || ':' || a.privilege_type, ', ')
    INTO v_ofensor
    FROM aclexplode(v_acl) a
    LEFT JOIN pg_roles g ON g.oid = a.grantee
   WHERE a.privilege_type = 'EXECUTE'
     AND (a.grantee = 0 OR g.rolname IN ('anon', 'authenticated'));

  IF v_ofensor IS NOT NULL THEN
    RAISE EXCEPTION 'P43P FAIL (b): candidaturas_alem_da_janela concede EXECUTE a papel de cliente (%) — a proibicao de enumerar candidatos prestes a serem apagados TEM de ser estrutural (viver no REVOKE), nao confiada a camada de apresentacao. Os unicos chamadores legitimos sao os wrappers DEFINER e, na Phase 46, o DELETE do cron', v_ofensor;
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (b): o predicado nao concede EXECUTE a anon, authenticated nem PUBLIC (proacl = %)', v_acl::text;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) ⊖ NEGATIVA — `anon` NÃO tem privilégio em nenhum dos dois wrappers.
--
--     `REVOKE ALL … FROM PUBLIC` sozinho NÃO remove o grant que o
--     `pg_default_acl` de `public` concede a `anon` em todo `CREATE FUNCTION` —
--     ele é direto e nomeado (medido na P42-06: 61 funções DEFINER com EXECUTE
--     para anon, 39 chamáveis via PostgREST). Esta asserção é o gate contra a
--     regressão para o idioma incompleto.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  r          record;
  v_checadas int := 0;
BEGIN
  FOR r IN
    SELECT p.proname, p.proacl
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('previa_retencao', 'previa_retencao_total')
  LOOP
    v_checadas := v_checadas + 1;

    IF r.proacl IS NULL THEN
      RAISE EXCEPTION 'P43P FAIL (c): public.%() tem proacl NULO — o default ACL, que concede EXECUTE a anon, esta em vigor', r.proname;
    END IF;

    IF EXISTS (
      SELECT 1 FROM aclexplode(r.proacl) a
       JOIN pg_roles g ON g.oid = a.grantee
      WHERE g.rolname = 'anon'
    ) THEN
      RAISE EXCEPTION 'P43P FAIL (c): o papel anon TEM privilegio em public.%() (proacl = %) — o REVOKE precisa NOMEAR anon, nao apenas PUBLIC', r.proname, r.proacl::text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM aclexplode(r.proacl) a
       JOIN pg_roles g ON g.oid = a.grantee
      WHERE g.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'P43P FAIL (c): authenticated NAO tem EXECUTE em public.%() — a tela do admin nao conseguiria ler a previa', r.proname;
    END IF;
  END LOOP;

  IF v_checadas <> 2 THEN
    RAISE EXCEPTION 'P43P FAIL (c): encontrei % dos 2 wrappers esperados em public', v_checadas;
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (c): os 2 wrappers existem, anon sem privilegio nenhum, authenticated com EXECUTE';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) ⊖ GUARD — papel `rh` recusado com 42501, e chamador SEM CLAIM NENHUMA
--     TAMBÉM recusado com 42501. Quatro recusas (2 funções × 2 contextos).
--
--     A SEGUNDA METADE É A QUE FECHA O DEFEITO SISTÊMICO. O idioma difundido no
--     repositório — `IF v_role NOT IN ('rh','administrador')` — avalia NULL
--     quando não há JWT, e um `IF` NULL **não é tomado**: o guard FALHA ABERTO
--     exatamente para o chamador mais suspeito. Em SECURITY DEFINER isso é grave
--     porque DEFINER bypassa RLS e o guard do corpo é o único controle.
--     Um guard NULL-cego passaria pela metade `rh` em verde e reprovaria SÓ aqui.
--
--     A impersonação é por `set_config('request.jwt.claims', …)` — nunca por
--     leitura de catálogo. O guard LÊ a claim, então é a claim que tem de ser
--     exercitada; ler `pg_get_functiondef` provaria apenas que o texto do guard
--     existe, não que ele RECUSA.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_ok int := 0;
BEGIN
  -- (d.1) e (d.2) — papel `rh`. `rh` e papel REAL deste sistema e nao administrador.
  PERFORM set_config('request.jwt.claims',
    json_build_object('app_metadata', json_build_object('role', 'rh'))::text, false);

  BEGIN
    PERFORM * FROM public.previa_retencao();
    RAISE EXCEPTION 'P43P FAIL (d.1): previa_retencao ACEITOU chamada com papel rh — a previa de retencao da empresa e legivel por qualquer recrutador'
      USING ERRCODE = 'P43A1';
  EXCEPTION
    WHEN sqlstate 'P43A1' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  BEGIN
    PERFORM * FROM public.previa_retencao_total();
    RAISE EXCEPTION 'P43P FAIL (d.2): previa_retencao_total ACEITOU chamada com papel rh'
      USING ERRCODE = 'P43A2';
  EXCEPTION
    WHEN sqlstate 'P43A2' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  -- (d.3) e (d.4) — SEM CLAIM NENHUMA. auth.jwt() resolve NULL e o guard tem de
  -- recusar mesmo assim.
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('request.jwt.claim.sub', '', false);

  BEGIN
    PERFORM * FROM public.previa_retencao();
    RAISE EXCEPTION 'P43P FAIL (d.3): previa_retencao ACEITOU chamada SEM CLAIM NENHUMA — o guard e NULL-cego e falha ABERTO. Trocar IS DISTINCT FROM por NOT IN reintroduz exatamente este defeito'
      USING ERRCODE = 'P43A3';
  EXCEPTION
    WHEN sqlstate 'P43A3' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  BEGIN
    PERFORM * FROM public.previa_retencao_total();
    RAISE EXCEPTION 'P43P FAIL (d.4): previa_retencao_total ACEITOU chamada SEM CLAIM NENHUMA — guard NULL-cego, falha ABERTO'
      USING ERRCODE = 'P43A4';
  EXCEPTION
    WHEN sqlstate 'P43A4' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  IF v_ok <> 4 THEN
    RAISE EXCEPTION 'P43P FAIL (d): apenas % de 4 recusas ocorreram com 42501 (2 funcoes x papel rh + sem claim)', v_ok;
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (d): os 2 wrappers recusaram papel rh E chamador sem claim, os 4 casos com 42501 (guard NULL-safe)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) GATE DE NÃO-DIVERGÊNCIA, PARTE 1 — `md5(prosrc)` do predicado bate o PIN.
--
--     Ver o bloco de PROVENIÊNCIA no cabeçalho, incluindo a ÚNICA divergência
--     autorizada (discrepância de EXTRAÇÃO, discriminada pelo md5 do apply) e a
--     proibição de afrouxar a asserção.
--
--     A rede de diagnóstico estrutural embaixo do md5 existe para o caso de um
--     re-pin indevido: se o resumo casar mas a forma estiver errada, é porque
--     alguém re-pinou sem a migration ter mudado.
--
--     ⚠ A REDE CRESCEU NA PHASE 46, E ELA SÓ CRESCE. Às três checagens originais
--     (`data_candidatura`, `NOT EXISTS`, forma banida de negação por conjunto)
--     somam-se duas do plano 46-02: `elegivel_purga` presente — a allowlist de
--     D-46-19 é DADO na matriz e não lista no código, e um predicado que voltasse
--     a enumerar estados no corpo passaria pelo md5 re-pinado — e `ancora_origem`
--     presente, porque é a coluna pela qual a política viaja do predicado até o
--     ledger, calculada UMA vez só no `LATERAL`. Um re-pin que tivesse vindo
--     acompanhado de afrouxamento seria indistinguível de um re-pin honesto; por
--     isso a única direção autorizada é acrescentar.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_src          text;
  v_md5          text;
  v_esperado     text := '6df3564414519abc56379d9b8924fad0';
  v_tem_ancora   boolean;
  v_tem_notex    boolean;
  v_tem_notin    boolean;
  v_tem_elegivel boolean;
  v_tem_origem   boolean;
BEGIN
  SELECT p.prosrc INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'candidaturas_alem_da_janela';

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'P43P FAIL (e): public.candidaturas_alem_da_janela NAO existe — nao ha predicado unico, e o DELETE da Phase 46 nao teria o que chamar';
  END IF;

  v_md5          := md5(v_src);
  v_tem_ancora   := strpos(v_src, 'data_candidatura') > 0;
  v_tem_notex    := strpos(v_src, 'NOT EXISTS') > 0;
  v_tem_notin    := v_src ~ '\mNOT\s+IN\M';
  v_tem_elegivel := strpos(v_src, 'elegivel_purga') > 0;
  v_tem_origem   := strpos(v_src, 'ancora_origem') > 0 OR strpos(v_src, 'AS origem') > 0;

  IF v_md5 IS DISTINCT FROM v_esperado THEN
    RAISE EXCEPTION 'P43P FAIL (e): o corpo VIVO do predicado NAO casa byte a byte com a migration. md5 vivo=% (esperado %), octetos=%, data-ancora presente=%, NOT EXISTS presente=%, forma banida de negacao por conjunto presente=%, elegivel_purga presente=%, ancora_origem presente=%. Se o md5(statements[1]) do apply TIVER batido o md5 do arquivo, a divergencia e de EXTRACAO e nao do objeto — ver PROVENIENCIA no cabecalho. Caso contrario alguem editou o predicado sem re-pinar, e a previa deixou de provar o que o DELETE da Phase 46 fara',
      v_md5, v_esperado, octet_length(v_src), v_tem_ancora, v_tem_notex, v_tem_notin, v_tem_elegivel, v_tem_origem;
  END IF;

  IF v_tem_notin OR NOT v_tem_notex OR NOT v_tem_ancora OR NOT v_tem_elegivel OR NOT v_tem_origem THEN
    RAISE EXCEPTION 'P43P FAIL (e): o md5 casou mas a FORMA esta errada (data-ancora=%, NOT EXISTS=%, forma banida=%, elegivel_purga=%, ancora_origem=%) — o resumo esperado foi re-pinado sem a migration ter mudado, ou foi re-pinado para caber num predicado que perdeu uma propriedade estrutural. As cinco checagens sao CUMULATIVAS: a rede so cresce (Pitfall 2)',
      v_tem_ancora, v_tem_notex, v_tem_notin, v_tem_elegivel, v_tem_origem;
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (e): o corpo vivo do predicado casa byte a byte com a migration (md5 %, % octetos) e mantem as 5 propriedades estruturais', v_md5, octet_length(v_src);
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (f) GATE DE NÃO-DIVERGÊNCIA, PARTE 2 — os wrappers CHAMAM o predicado.
--
--     (e) prova que o predicado não mudou. (f) prova que a prévia continua
--     PASSANDO POR ELE. Sem esta metade, alguém poderia deixar
--     `candidaturas_alem_da_janela` intacta e reescrever a prévia com um
--     predicado próprio "mais rápido" — o md5 continuaria verde e o dry-run
--     voltaria a mentir sobre a purga. É o ponto inteiro de a definição ser única.
--
--     ⚠ EMENDA DA PHASE 46 / PLANO 46-02 — DE DOIS PARA TRÊS WRAPPERS.
--     A lista era LITERAL e exigia `v_checadas = 2`. `titulares_alem_da_janela()`
--     (D-46-11), criada pela `20260823000003`, é o wrapper que a Phase 46
--     REALMENTE usa: é dele que a varredura tira o alvo. Sem esta emenda ele
--     nasceria FORA da regra que proíbe reler `config_retencao_etapa` por conta
--     própria, e a asserção continuaria VERDE enquanto o único wrapper que
--     importa ficava sem vigilância. **Um portão que não enxerga o objeto novo é
--     pior que um portão vermelho: ele parece verde.** Por isso a emenda entrou
--     no MESMO commit que criou a função, e não como limpeza posterior.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  r          record;
  v_checadas int := 0;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('previa_retencao', 'previa_retencao_total', 'titulares_alem_da_janela')
  LOOP
    v_checadas := v_checadas + 1;

    IF strpos(r.def, 'candidaturas_alem_da_janela') = 0 THEN
      RAISE EXCEPTION 'P43P FAIL (f): public.%() NAO chama candidaturas_alem_da_janela — a previa foi reescrita com um predicado PROPRIO. Existem agora DUAS definicoes de retencao no banco, e a que o administrador ve na tela nao e a que a Phase 46 vai executar. O dry-run voltou a ser decoracao (P39 CR-02)', r.proname;
    END IF;

    -- Segunda copia INLINE do JOIN da matriz dentro do wrapper: sinal de que
    -- alguem comecou a reimplementar o predicado ao lado da chamada.
    IF strpos(r.def, 'config_retencao_etapa') > 0 THEN
      RAISE EXCEPTION 'P43P FAIL (f): public.%() referencia config_retencao_etapa DIRETAMENTE — o wrapper deve consumir o predicado unico e NADA MAIS; ler a matriz por conta propria e o primeiro passo da segunda copia', r.proname;
    END IF;
  END LOOP;

  IF v_checadas <> 3 THEN
    RAISE EXCEPTION 'P43P FAIL (f): encontrei % dos 3 wrappers esperados em public (previa_retencao, previa_retencao_total, titulares_alem_da_janela). O terceiro nasceu na Phase 46 / migration 20260823000003 e e o wrapper que a VARREDURA consome — se ele nao existe, a purga nao tem alvo; se ele existe e nao foi contado, esta asserção deixou de vigia-lo', v_checadas;
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (f): os 3 wrappers CHAMAM candidaturas_alem_da_janela e nao releem a matriz por conta propria — uma definicao so';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (g) ⊖ NEGATIVA DE ESCRITA — nenhuma das TRÊS funções contém verbo de escrita.
--
--     Fronteira de palavra, NÃO substring nua — ver a seção correspondente no
--     cabeçalho: `updated_at` (degrau 3 da data-âncora) e `deleted_at` (a exceção
--     de soft-delete) contêm `update` e `delete` como substring, e um `strpos`
--     reprovaria a implementação CORRETA.
--
--     A fase é ZERO-DESTRUTIVA por desenho, e "por desenho" só vale alguma coisa
--     se for MEDIDO. Esta é a metade estática da medição; (i) é a dinâmica.
--
--     ⚠ EMENDA DA PHASE 46 / PLANO 46-02 — DE TRÊS PARA QUATRO FUNÇÕES.
--     `titulares_alem_da_janela()` entra na lista. Ela é `STABLE` e read-only por
--     contrato, e a Phase 46 é a fase em que existe, ao lado dela, um motor que
--     APAGA — o que torna esta negativa mais necessária aqui do que era na 43,
--     não menos. A fronteira de palavra é MANTIDA: `updated_at` e `deleted_at`
--     contêm `update` e `delete` como substring, e um casamento nu reprovaria a
--     implementação CORRETA. Um teste que reprova o comportamento correto é pior
--     que teste nenhum — ele treina quem executa a desligá-lo.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  r          record;
  v_checadas int := 0;
  v_verbo    text;
  v_verbos   text[] := ARRAY[
    '\mdelete\M', '\minsert\M', '\mupdate\M', '\mtruncate\M', '\mdrop\M'
  ];
BEGIN
  FOR r IN
    SELECT p.proname, p.prosrc
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('candidaturas_alem_da_janela', 'titulares_alem_da_janela', 'previa_retencao', 'previa_retencao_total')
  LOOP
    v_checadas := v_checadas + 1;

    FOREACH v_verbo IN ARRAY v_verbos LOOP
      IF lower(r.prosrc) ~ v_verbo THEN
        RAISE EXCEPTION 'P43P FAIL (g): o corpo de public.%() contem o verbo de escrita /%/ — a Phase 43 e ZERO-DESTRUTIVA por desenho e acabou de deixar de ser. A purga e a Phase 46, com parecer juridico e com a matriz confirmada pelo operador (origem<>seed)', r.proname, v_verbo;
      END IF;
    END LOOP;

    -- Metade de VOLATILIDADE: uma funcao VOLATILE nao prova escrita, mas STABLE
    -- e a declaracao que o planejador acredita, e uma previa que deixasse de ser
    -- STABLE seria o primeiro sinal de que ela passou a fazer outra coisa.
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p2 JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
       WHERE n2.nspname = 'public' AND p2.proname = r.proname AND p2.provolatile = 's'
    ) THEN
      RAISE EXCEPTION 'P43P FAIL (g): public.%() nao e STABLE — as quatro funcoes desta familia sao read-only por contrato', r.proname;
    END IF;
  END LOOP;

  IF v_checadas <> 4 THEN
    RAISE EXCEPTION 'P43P FAIL (g): encontrei % das 4 funcoes esperadas em public (candidaturas_alem_da_janela, previa_retencao, previa_retencao_total, titulares_alem_da_janela). A quarta nasceu na Phase 46 / migration 20260823000003; se ela existe e nao foi contada, a negativa de escrita deixou de alcancar o wrapper que a purga consome', v_checadas;
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (g): as 4 funcoes sao STABLE e nenhuma contem verbo de escrita (fronteira de palavra: updated_at/deleted_at NAO sao falsos positivos)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (h) COERÊNCIA — a prévia EXECUTA, e os números batem.
--
--     · soma de `candidaturas_afetadas` por estado  =  linhas do predicado.
--       Se divergir, o `GROUP BY` está filtrando ou duplicando, e o número da
--       tela deixou de ser o número da purga.
--     · total  <=  soma dos `candidatos_afetados` por estado. É `<=` e não `=`
--       por DUAS razões que empurram no MESMO sentido: um candidato pode aparecer
--       em dois estados (a soma o conta duas vezes), e o total só conta quem está
--       INTEIRAMENTE fora da janela (quem tem uma candidatura ativa sai). Um
--       total MAIOR que a soma significaria que o wrapper total está contando
--       gente que o predicado não devolveu.
--     · `calculada_em` é um carimbo de AGORA, vindo do SERVIDOR (lição do 42-12).
--
--     A impersonação é de `administrador` porque (d) já provou a recusa; aqui o
--     que se mede é o NÚMERO.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_pred        bigint;
  v_soma_cands  bigint;
  v_soma_pess   bigint;
  v_total       bigint;
  v_carimbo     timestamptz;
  v_deriva      interval;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('app_metadata', json_build_object('role', 'administrador'))::text, false);

  SELECT count(*) INTO v_pred FROM public.candidaturas_alem_da_janela();

  SELECT coalesce(sum(p.candidaturas_afetadas), 0),
         coalesce(sum(p.candidatos_afetados), 0)
    INTO v_soma_cands, v_soma_pess
    FROM public.previa_retencao() p;

  SELECT t.candidatos_afetados, t.calculada_em
    INTO v_total, v_carimbo
    FROM public.previa_retencao_total() t;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_soma_cands <> v_pred THEN
    RAISE EXCEPTION 'P43P FAIL (h): a soma de candidaturas_afetadas por estado e %, mas o predicado devolve % linhas — o agregado da tela NAO e o agregado do predicado, e a previa deixou de descrever a purga', v_soma_cands, v_pred;
  END IF;

  IF v_total IS NULL THEN
    RAISE EXCEPTION 'P43P FAIL (h): previa_retencao_total nao devolveu linha — um agregado sem GROUP BY devolve exatamente uma linha mesmo com conjunto vazio, entao NULL aqui significa outra coisa';
  END IF;

  IF v_total > v_soma_pess THEN
    RAISE EXCEPTION 'P43P FAIL (h): o total (%) e MAIOR que a soma dos candidatos_afetados por estado (%) — o wrapper total esta contando gente que o predicado nao devolveu. O total conta APENAS candidatos cujas candidaturas vivas estao TODAS fora da janela', v_total, v_soma_pess;
  END IF;

  IF v_carimbo IS NULL THEN
    RAISE EXCEPTION 'P43P FAIL (h): calculada_em veio NULO — sem carimbo nao ha como distinguir um numero de hoje de um numero colado do mes passado (licao 42-12)';
  END IF;

  v_deriva := greatest(now() - v_carimbo, v_carimbo - now());
  IF v_deriva > interval '5 minutes' THEN
    RAISE EXCEPTION 'P43P FAIL (h): calculada_em (%) esta a % de now() — o carimbo NAO esta sendo computado pela mesma funcao que computa o numero', v_carimbo, v_deriva;
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (h): predicado % linhas = soma % por estado; total % <= soma de pessoas %; carimbo do servidor com deriva %', v_pred, v_soma_cands, v_total, v_soma_pess, v_deriva;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (i) ⊖ NEGATIVA E OBRIGATÓRIA — ZERO LINHA DE CANDIDATO TOCADA.
--
--     A metade DINÂMICA da invariante zero-destrutiva: (g) leu os corpos, esta
--     conta as linhas. Ela é a asserção que um predicado de purga acidentalmente
--     ligado nesta fase reprovaria — que é precisamente o acidente contra o qual
--     a fase inteira foi desenhada. Note que a asserção (h) EXECUTOU as três
--     funções: se alguma delas apagasse algo, seria aqui que apareceria.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cands_antes  bigint := current_setting('smoke43p.cands')::bigint;
  v_candos_antes bigint := current_setting('smoke43p.candos')::bigint;
  v_cands_agora  bigint;
  v_candos_agora bigint;
BEGIN
  SELECT count(*) INTO v_cands_agora  FROM public.candidaturas;
  SELECT count(*) INTO v_candos_agora FROM public.candidatos;

  IF v_cands_agora <> v_cands_antes THEN
    RAISE EXCEPTION 'P43P FAIL (i): public.candidaturas saiu de % para % linhas durante o smoke — a previa read-only acabou de escrever, e a Phase 43 deixou de ser zero-destrutiva', v_cands_antes, v_cands_agora;
  END IF;
  IF v_candos_agora <> v_candos_antes THEN
    RAISE EXCEPTION 'P43P FAIL (i): public.candidatos saiu de % para % linhas durante o smoke', v_candos_antes, v_candos_agora;
  END IF;

  PERFORM set_config('smoke43p.pass', (coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P43P PASS (i): % candidaturas / % candidatos INALTERADOS apos executar as 3 funcoes — zero acao destrutiva, MEDIDO', v_cands_agora, v_candos_agora;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_esperado int := 9;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke43p.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P43P FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'P43P RESUMO: % asseracoes PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
