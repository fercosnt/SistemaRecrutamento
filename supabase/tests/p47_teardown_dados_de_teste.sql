-- =============================================================================
-- p47_teardown_dados_de_teste.sql
-- Bloco I / item I3 do GUIA-VALIDACAO-FINAL — a limpeza antes da divulgação
-- =============================================================================
--
-- Remove os candidatos de TESTE de produção antes de as vagas serem divulgadas.
-- Medido em 2026-09-07: `public.candidatos` tem 41 linhas e NENHUMA é de pessoa
-- real — as vagas nunca foram divulgadas. Depois deste teardown restam 8: as
-- fixtures da Phase 46.
--
-- (1) O QUE FICA, E POR QUÊ FICA
--   As 8 fixtures `fixture-p46+%@invalido.local` **não** são removidas aqui. Elas
--   são a PROVA do flip da purga (H6): a primeira noite em `live` tem de
--   destruí-las, e é a destruição delas que demonstra que o motor funciona. Removê-las
--   antes seria apagar o instrumento de medida antes da medição. Para elas existe
--   arquivo próprio: `p46_teardown_fixture.sql`.
--
-- (2) ⚠ A TRAVA QUE O TEARDOWN DA PHASE 46 NÃO PRECISAVA TER
--   Aquele arquivo tinha um namespace de e-mail sintético — `fixture-p46+%` — que
--   nenhuma pessoa real jamais teria. Este NÃO tem essa sorte: ele remove endereços
--   como `@teste.com` e `test+…@beautysmile.com.br`, e o dia em que alguém rodar
--   este arquivo por engano com candidatos REAIS no banco é o dia em que ele apaga
--   gente.
--
--   Por isso ele NÃO É IDEMPOTENTE por desenho e **exige a contagem esperada**: se
--   `public.candidatos` não tiver EXATAMENTE as 41 linhas medidas em 2026-09-07,
--   ele levanta exceção e não remove nada. Rodar duas vezes falha na segunda — e
--   isso é a propriedade, não um defeito. Um teardown de PII que aceita rodar
--   contra um banco que ele não reconhece é uma arma apontada para o futuro.
--
-- (3) ⚠ A CONTA DO ADMINISTRADOR NÃO PODE MORRER
--   `fernando@beautysmile.com.br` existe DUAS vezes: como `candidatos` (3
--   candidaturas de teste) e como `usuarios_rh` + `auth.users` (o login que
--   administra o sistema). Este arquivo remove a primeira e **jamais** a segunda.
--   A remoção em `auth.users` traz guarda `NOT EXISTS (usuarios_rh)` explícita:
--   apagar por engano o próprio login do operador seria o único erro deste teardown
--   que ninguém conseguiria desfazer pela tela.
--
-- (4) ORDEM INVERSA À DE CRIAÇÃO, E POR QUE ESTAS TABELAS E NÃO OUTRAS
--   O grafo de FKs foi MEDIDO (`pg_constraint`), não presumido. A maioria é
--   `ON DELETE CASCADE` e some sozinha; as que BLOQUEIAM (`NO ACTION`) precisam de
--   `DELETE` explícito e nesta ordem:
--     retencao_hold → decisao_final → decisao_final_historico →
--     historico_candidatura → solicitacoes_dados → candidaturas → candidatos →
--     auth.users
--   `ai_call_logs`, `candidate_ai_decisions` e `recruiter_alerts` são `SET NULL`:
--   sobrevivem com a referência nula, de propósito — são trilha de IA e de custo,
--   não PII do titular.
--
-- (5) "NÃO LANÇOU" NÃO É "COMPLETOU"
--   O bloco final reconta e levanta exceção se sobrar resíduo. Uma remoção parcial
--   que não lança é indistinguível de uma completa, e a diferença entre as duas é
--   PII de teste esquecida em produção.
--
-- (6) ⚠ O QUE ESTE ARQUIVO **NÃO** FAZ: O STORAGE
--   Há **16 currículos** no bucket `curriculos`, e eles pertencem a estes mesmos
--   candidatos de teste. Este arquivo NÃO os remove, e a omissão é deliberada:
--   apagar linhas de `storage.objects` por SQL remove o REGISTRO e deixa o objeto
--   órfão no S3 — o arquivo continua existindo, só que sem dono e sem trilha. Quem
--   remove de verdade é a Storage API, que é o caminho que a EF `purgar-retencao`
--   usa no motor de exclusão (§SC#2 do 45-VERIFICATION: «Storage 3 → 0»).
--
--   Portanto, depois deste teardown, o Storage fica com 16 PDFs de teste sem
--   candidato correspondente. **Não é vazamento** (não há pessoa real entre eles) e
--   **não bloqueia a divulgação**, mas é lixo que precisa sair por um segundo passo,
--   pela API. Os caminhos são derivávéis: `<owner>/<uuid>.pdf`, onde `owner` é o
--   `auth.users.id` — exceto os 6 fictícios da comparação, cujo prefixo é o
--   `candidatos.id` (`f0000001…`) e cujo `owner` é NULL.
--
--   Dizer isto aqui, e não descobrir depois, é o ponto: um teardown que se apresenta
--   como completo e deixa PII num segundo sistema é pior do que um que declara a
--   fronteira.
--
-- (7) PROTOCOLO
--   UM ÚNICO statement `DO`, logo uma única transação implícita: ou tudo, ou nada.
--   Sem `BEGIN/COMMIT` externo (CLAUDE.md §Migrations — é o gatilho do 42601 no
--   transaction pooler).
--
-- =============================================================================

DO $p47_teardown$
DECLARE
  -- ═══ O QUE É TESTE — a lista é EXPLÍCITA e não uma negação de "real" ═══════
  -- Negar ("tudo que não é real") é NULL-cego e falha ABERTO no dia em que a
  -- definição de real mudar. Enumerar falha FECHADO: um padrão esquecido deixa
  -- lixo, que é recuperável; um padrão largo demais apaga gente, que não é.
  v_padroes constant text[] := ARRAY[
    '%@teste.com',                          -- seed histórico (joao, maria, funil)
    'test+%@beautysmile.com.br',            -- gerados pelo E2E de abril
    'uat-form-%@beautysmile.com.br',        -- UAT do formulário
    'fernandinho.costa.neto+claude%@gmail.com',  -- T1/T2/T3 desta validação
    'fernandinho.costa.neto+cand%@gmail.com',    -- teste de vaga nova
    'fernando@beautysmile.com.br',          -- ⚠ SÓ o candidato; o RH fica (item 3)
    'fernando@fotona.com.br',
    'paulista@beautysmile.com.br',
    '%.teste@invalido.local',               -- os 6 fictícios da comparação
    'anonimizado+%@invalido.local'          -- tombstone do teste de exclusão
  ];

  -- A fotografia do banco no dia em que este arquivo foi escrito. Ver item (2).
  v_esperado_candidatos constant bigint := 41;
  v_esperado_alvo       constant bigint := 33;

  v_total   bigint;
  v_alvo    bigint;

  n_hold    bigint := 0;
  n_dec     bigint := 0;
  n_dhist   bigint := 0;
  n_hist    bigint := 0;
  n_solic   bigint := 0;
  n_cand    bigint := 0;
  n_titular bigint := 0;
  n_user    bigint := 0;

  r_cand    bigint := 0;
  r_users   bigint := 0;
  v_residuo text;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- 0 · A TRAVA. Antes de qualquer remoção.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT count(*) INTO v_total FROM public.candidatos;

  SELECT count(*) INTO v_alvo
    FROM public.candidatos c
   WHERE c.email LIKE ANY (v_padroes);

  IF v_total <> v_esperado_candidatos OR v_alvo <> v_esperado_alvo THEN
    RAISE EXCEPTION
      'P47 TEARDOWN RECUSADO: este arquivo foi escrito contra um banco com % candidatos '
      '(% de teste), e encontrou % (% de teste). NAO removeu nada. Se a diferenca for '
      'legitima (candidatos REAIS chegaram), NAO ajuste as constantes: reescreva o alvo. '
      'Um teardown de PII que aceita um banco que ele nao reconhece e uma arma apontada '
      'para o futuro.',
      v_esperado_candidatos, v_esperado_alvo, v_total, v_alvo;
  END IF;

  -- ⊖ E a negativa que a trava acima não cobre: nenhuma fixture da Phase 46 pode
  -- estar no alvo. Se o padrão de e-mail um dia passar a alcançá-las, o flip perde
  -- a prova e ninguém notaria — a remoção seria silenciosa e "bem-sucedida".
  IF EXISTS (
    SELECT 1 FROM public.candidatos c
     WHERE c.email LIKE ANY (v_padroes)
       AND c.email LIKE 'fixture-p46+%'
  ) THEN
    RAISE EXCEPTION
      'P47 TEARDOWN RECUSADO: um padrao alcancou as fixtures da Phase 46, que sao a '
      'PROVA do flip da purga (H6). NAO removeu nada.';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1 · retencao_hold  (FK NO ACTION → candidaturas)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.retencao_hold h
   WHERE EXISTS (
           SELECT 1 FROM public.candidaturas c
             JOIN public.candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = h.candidatura_id
              AND ca.email LIKE ANY (v_padroes)
         );
  GET DIAGNOSTICS n_hold = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2 · decisao_final_historico  (FK NO ACTION; ANTES de decisao_final)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.decisao_final_historico d
   WHERE EXISTS (
           SELECT 1 FROM public.candidaturas c
             JOIN public.candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = d.candidatura_id
              AND ca.email LIKE ANY (v_padroes)
         );
  GET DIAGNOSTICS n_dhist = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3 · decisao_final  (FK NO ACTION → candidaturas)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.decisao_final d
   WHERE EXISTS (
           SELECT 1 FROM public.candidaturas c
             JOIN public.candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = d.candidatura_id
              AND ca.email LIKE ANY (v_padroes)
         );
  GET DIAGNOSTICS n_dec = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4 · historico_candidatura  (FK NO ACTION → candidaturas)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.historico_candidatura h
   WHERE EXISTS (
           SELECT 1 FROM public.candidaturas c
             JOIN public.candidatos ca ON ca.id = c.candidato_id
            WHERE c.id = h.candidatura_id
              AND ca.email LIKE ANY (v_padroes)
         );
  GET DIAGNOSTICS n_hist = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 5 · solicitacoes_dados  (FK NO ACTION → candidatos)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.solicitacoes_dados s
   WHERE EXISTS (
           SELECT 1 FROM public.candidatos ca
            WHERE ca.id = s.candidato_id
              AND ca.email LIKE ANY (v_padroes)
         );
  GET DIAGNOSTICS n_solic = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 6 · candidaturas  (arrasta ~25 tabelas por CASCADE — medido em pg_constraint)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.candidaturas c
   WHERE EXISTS (
           SELECT 1 FROM public.candidatos ca
            WHERE ca.id = c.candidato_id
              AND ca.email LIKE ANY (v_padroes)
         );
  GET DIAGNOSTICS n_cand = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 7 · candidatos  (arrasta autorizacoes, disponibilidade, notificacoes)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.candidatos ca
   WHERE ca.email LIKE ANY (v_padroes);
  GET DIAGNOSTICS n_titular = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 8 · auth.users — COM AS DUAS GUARDAS DO ITEM (3)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠ `NOT EXISTS (usuarios_rh)` é a linha mais importante deste arquivo. Sem ela,
  -- `fernando@beautysmile.com.br` — que casa um dos padrões — perderia o login de
  -- administrador. É o único erro daqui que ninguém desfaria pela tela.
  DELETE FROM auth.users u
   WHERE u.email LIKE ANY (v_padroes)
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id)
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.id);
  GET DIAGNOSTICS n_user = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 9 · RESÍDUO — item (5)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT count(*) INTO r_cand FROM public.candidatos ca
   WHERE ca.email LIKE ANY (v_padroes);

  SELECT count(*) INTO r_users FROM auth.users u
   WHERE u.email LIKE ANY (v_padroes)
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id);

  IF r_cand <> 0 OR r_users <> 0 THEN
    v_residuo := format('candidatos=%s auth.users=%s', r_cand, r_users);
    RAISE EXCEPTION 'P47 TEARDOWN INCOMPLETO — residuo: %. A transacao inteira sera revertida.', v_residuo;
  END IF;

  -- ⊖ A fixture da Phase 46 tem de estar INTACTA: 8 candidatos. Se este teardown a
  -- tocou, o flip perdeu a prova.
  SELECT count(*) INTO r_cand FROM public.candidatos ca
   WHERE ca.email LIKE 'fixture-p46+%';
  IF r_cand <> 8 THEN
    RAISE EXCEPTION 'P47 TEARDOWN CORROMPEU A FIXTURE: esperado 8 candidatos fixture-p46, encontrado %', r_cand;
  END IF;

  RAISE NOTICE 'P47 TEARDOWN OK — hold=% dec_hist=% dec=% hist=% solic=% candidaturas=% candidatos=% auth_users=% | fixture p46 intacta (8)',
    n_hold, n_dhist, n_dec, n_hist, n_solic, n_cand, n_titular, n_user;
END;
$p47_teardown$;
