-- =============================================================================
-- p46_teardown_fixture.sql
-- Phase 46 (Purga Automatica) / plano 46-01 / Task 2 — D-46-21
-- =============================================================================
--
-- ⚠ ESTE ARQUIVO EXISTE ANTES DA FIXTURE, E ESSA ORDEM E A ENTREGA
--   D-46-21 obriga o caminho de remocao a ser escrito e commitado ANTES de a
--   primeira linha sintetica existir em PROD. A razao nao e cerimonia: uma
--   fixture DURAVEL (ela tem de sobreviver aos 14 dias de dry-run de PURGA-03,
--   logo nao pode ser revertida por subtransacao como a do smoke) que exista num
--   banco de PII sem caminho de remocao escrito e LIXO PERMANENTE. O momento em
--   que alguem precisa deste arquivo e exatamente o momento em que ninguem tem
--   calma para escreve-lo.
--
-- (1) PROTOCOLO DE EXECUCAO
--   Rodado pelo ORQUESTRADOR por MCP `execute_sql`, EM UMA UNICA CHAMADA.
--   O arquivo inteiro e UM UNICO statement (`DO $p46_teardown$ ... $p46_teardown$;`)
--   de proposito: um `DO` roda dentro de uma transacao implicita, entao ou TODAS
--   as remocoes acontecem, ou NENHUMA. Um teardown que remove metade e falha
--   deixa um estado pior do que aquele em que entrou.
--   Sem wrapper de transacao explicita — o driver ja envolve a chamada, e o par
--   externo e o gatilho do SQLSTATE 42601 no transaction pooler quando ha corpo
--   `$$` adjacente (CLAUDE.md §Migrations).
--
-- (2) O UNICO PONTO DE ENTRADA
--   O namespace do e-mail em `auth.users`: `fixture-p46+%@invalido.local`.
--   Toda linha da fixture e alcancavel a partir dele, por correlacao. Se este
--   arquivo precisasse de uma lista de UUIDs para funcionar, ele seria inutil no
--   dia em que a lista se perdesse — que e o unico dia em que ele importa.
--   As `vagas` sao o unico alvo sem ligacao a `auth.users`; elas carregam o
--   MESMO prefixo no `titulo` (`fixture-p46%`), que e a marca deliberada.
--
-- (3) IDIOMA: `EXISTS` CORRELACIONADO, JAMAIS NEGACAO DE PERTENCIMENTO
--   Todo `DELETE` correlaciona por `EXISTS`/`NOT EXISTS`. A forma `id NOT IN
--   (subconsulta)` e NULL-CEGA e FALHA ABERTO: contra um conjunto que contenha
--   um NULL ela avalia DESCONHECIDO e o registro escapa. Foi literalmente esse
--   defeito que o INVENT-05 corrigiu neste repositorio
--   (`20260730000005_p42_invent05_not_exists.sql:40-91`), do outro lado deste
--   mesmo tipo de predicado. Aqui o escape nao apagaria dado demais: deixaria
--   PII sintetica viva num banco de producao, em silencio.
--
-- (4) ORDEM DE REMOCAO — INVERSA A DE CRIACAO
--   retencao_hold -> decisao_final -> decisao_final_historico ->
--   historico_candidatura -> candidaturas -> candidatos -> vagas -> auth.users
--   As duas ultimas etapas trazem guarda `NOT EXISTS` propria (fail-closed): uma
--   `vaga` que ainda tenha candidatura, ou um `auth.users` que ainda tenha
--   candidato, NAO e removido — a FK reclamaria, mas a guarda diz POR QUE.
--
-- (5) "NAO LANCOU" NAO E "COMPLETOU"
--   O bloco final conta o residuo em cada tabela e levanta excecao se qualquer
--   contagem for diferente de zero. E a mesma disciplina do envelope de
--   subtransacao de `20260805000006:839-849`: uma remocao parcial que nao lanca
--   e indistinguivel de uma remocao completa, e a diferenca entre as duas e PII
--   sintetica esquecida em producao.
--
-- (6) IDEMPOTENTE
--   Rodar duas vezes remove zero na segunda e NAO falha. O bloco de verificacao
--   final continua valendo: zero residuo e zero residuo.
--
-- =============================================================================

DO $p46_teardown$
DECLARE
  -- O unico ponto de entrada. Trocar este literal e trocar a fixture inteira.
  v_ns_email  constant text := 'fixture-p46+%@invalido.local';
  v_ns_titulo constant text := 'fixture-p46%';

  v_tem_hold  boolean := (to_regclass('public.retencao_hold') IS NOT NULL);

  n_hold      bigint := 0;
  n_dec       bigint := 0;
  n_dec_hist  bigint := 0;
  n_hist      bigint := 0;
  n_cand      bigint := 0;
  n_titular   bigint := 0;
  n_vaga      bigint := 0;
  n_user      bigint := 0;

  r_hold      bigint := 0;
  r_dec       bigint := 0;
  r_dec_hist  bigint := 0;
  r_hist      bigint := 0;
  r_cand      bigint := 0;
  r_titular   bigint := 0;
  r_vaga      bigint := 0;
  r_user      bigint := 0;
  r_notif     bigint := 0;
  v_residuo   text;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1 · public.retencao_hold
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠ Esta tabela NASCE NO PLANO 46-03. O bloco fica guardado por `to_regclass`
  -- e usa SQL dinamico: presente e inerte enquanto a tabela nao existir, ativo
  -- assim que existir, sem uma segunda edicao deste arquivo. Escrever o teardown
  -- de uma tabela futura e barato agora e caro depois.
  IF v_tem_hold THEN
    EXECUTE format($sql$
      DELETE FROM public.retencao_hold h
       WHERE EXISTS (
               SELECT 1
                 FROM public.candidaturas c
                 JOIN public.candidatos  ca ON ca.id = c.candidato_id
                 JOIN auth.users         u  ON u.id  = ca.user_id
                WHERE c.id = h.candidatura_id
                  AND u.email LIKE %L
             )
    $sql$, v_ns_email);
    GET DIAGNOSTICS n_hold = ROW_COUNT;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2 · public.decisao_final (a variante `neg-art20` grava aqui)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.decisao_final d
   WHERE EXISTS (
           SELECT 1
             FROM public.candidaturas c
             JOIN public.candidatos  ca ON ca.id = c.candidato_id
             JOIN auth.users         u  ON u.id  = ca.user_id
            WHERE c.id = d.candidatura_id
              AND u.email LIKE v_ns_email
         );
  GET DIAGNOSTICS n_dec = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3 · public.decisao_final_historico
  -- ═══════════════════════════════════════════════════════════════════════════
  -- A fixture NAO deveria escrever aqui: `trg_decisao_final_snapshot`
  -- (`20260709000011:113-117`) e AFTER UPDATE, e a fixture so faz INSERT em
  -- `decisao_final`. O bloco existe porque a remocao tem de ser robusta a uma
  -- edicao futura da fixture que introduza um UPDATE sem notar o gatilho — e
  -- porque um residuo aqui bloquearia a remocao das candidaturas mais abaixo.
  DELETE FROM public.decisao_final_historico dh
   WHERE EXISTS (
           SELECT 1
             FROM public.candidaturas c
             JOIN public.candidatos  ca ON ca.id = c.candidato_id
             JOIN auth.users         u  ON u.id  = ca.user_id
            WHERE c.id = dh.candidatura_id
              AND u.email LIKE v_ns_email
         );
  GET DIAGNOSTICS n_dec_hist = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4 · public.historico_candidatura (o degrau (1) da data-ancora)
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.historico_candidatura h
   WHERE EXISTS (
           SELECT 1
             FROM public.candidaturas c
             JOIN public.candidatos  ca ON ca.id = c.candidato_id
             JOIN auth.users         u  ON u.id  = ca.user_id
            WHERE c.id = h.candidatura_id
              AND u.email LIKE v_ns_email
         );
  GET DIAGNOSTICS n_hist = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 5 · public.candidaturas
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.candidaturas c
   WHERE EXISTS (
           SELECT 1
             FROM public.candidatos ca
             JOIN auth.users        u ON u.id = ca.user_id
            WHERE ca.id = c.candidato_id
              AND u.email LIKE v_ns_email
         );
  GET DIAGNOSTICS n_cand = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 6 · public.candidatos
  -- ═══════════════════════════════════════════════════════════════════════════
  DELETE FROM public.candidatos ca
   WHERE EXISTS (
           SELECT 1
             FROM auth.users u
            WHERE u.id = ca.user_id
              AND u.email LIKE v_ns_email
         );
  GET DIAGNOSTICS n_titular = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 7 · public.vagas — o unico alvo sem ligacao a auth.users
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Marcadas pelo MESMO prefixo no `titulo`. A guarda `NOT EXISTS` e
  -- fail-closed e nao redundancia defensiva: se uma candidatura de PESSOA REAL
  -- tivesse sido criada contra uma vaga da fixture — ela e visivel na listagem
  -- publica enquanto viva — remover a vaga levaria a candidatura junto pelo
  -- `ON DELETE CASCADE` de `13-tabela-candidaturas.sql:18`. A guarda faz o
  -- teardown PARAR e explicar, em vez de apagar dado de gente.
  DELETE FROM public.vagas v
   WHERE v.titulo LIKE v_ns_titulo
     AND NOT EXISTS (
           SELECT 1 FROM public.candidaturas c WHERE c.vaga_id = v.id
         );
  GET DIAGNOSTICS n_vaga = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 8 · auth.users — a raiz do namespace, removida por ultimo
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Mesma guarda fail-closed: um `auth.users` com candidato ainda vivo nao e
  -- removido. `candidatos.user_id` tem `ON DELETE CASCADE`
  -- (`02-tabela-candidatos.sql:14`), entao remover aqui com candidato vivo
  -- apagaria uma linha que os passos acima decidiram NAO apagar.
  DELETE FROM auth.users u
   WHERE u.email LIKE v_ns_email
     AND NOT EXISTS (
           SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.id
         );
  GET DIAGNOSTICS n_user = ROW_COUNT;

  RAISE NOTICE 'P46 TEARDOWN — removidos: retencao_hold=% decisao_final=% decisao_final_historico=% historico=% candidaturas=% candidatos=% vagas=% auth.users=%',
    n_hold, n_dec, n_dec_hist, n_hist, n_cand, n_titular, n_vaga, n_user;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 9 · VERIFICACAO DE RESIDUO — "nao lancou" nao e "completou"
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Conta o que sobrou em cada tabela. Qualquer contagem diferente de zero
  -- levanta excecao com o mapa completo, e a transacao inteira volta atras.
  IF v_tem_hold THEN
    EXECUTE format($sql$
      SELECT count(*)
        FROM public.retencao_hold h
       WHERE EXISTS (
               SELECT 1
                 FROM public.candidaturas c
                 JOIN public.candidatos  ca ON ca.id = c.candidato_id
                 JOIN auth.users         u  ON u.id  = ca.user_id
                WHERE c.id = h.candidatura_id
                  AND u.email LIKE %L
             )
    $sql$, v_ns_email) INTO r_hold;
  END IF;

  SELECT count(*) INTO r_dec
    FROM public.decisao_final d
   WHERE EXISTS (SELECT 1 FROM public.candidaturas c
                   JOIN public.candidatos ca ON ca.id = c.candidato_id
                   JOIN auth.users u ON u.id = ca.user_id
                  WHERE c.id = d.candidatura_id AND u.email LIKE v_ns_email);

  SELECT count(*) INTO r_dec_hist
    FROM public.decisao_final_historico dh
   WHERE EXISTS (SELECT 1 FROM public.candidaturas c
                   JOIN public.candidatos ca ON ca.id = c.candidato_id
                   JOIN auth.users u ON u.id = ca.user_id
                  WHERE c.id = dh.candidatura_id AND u.email LIKE v_ns_email);

  SELECT count(*) INTO r_hist
    FROM public.historico_candidatura h
   WHERE EXISTS (SELECT 1 FROM public.candidaturas c
                   JOIN public.candidatos ca ON ca.id = c.candidato_id
                   JOIN auth.users u ON u.id = ca.user_id
                  WHERE c.id = h.candidatura_id AND u.email LIKE v_ns_email);

  SELECT count(*) INTO r_cand
    FROM public.candidaturas c
   WHERE EXISTS (SELECT 1 FROM public.candidatos ca
                   JOIN auth.users u ON u.id = ca.user_id
                  WHERE ca.id = c.candidato_id AND u.email LIKE v_ns_email);

  SELECT count(*) INTO r_titular
    FROM public.candidatos ca
   WHERE EXISTS (SELECT 1 FROM auth.users u
                  WHERE u.id = ca.user_id AND u.email LIKE v_ns_email);

  SELECT count(*) INTO r_vaga
    FROM public.vagas v WHERE v.titulo LIKE v_ns_titulo;

  SELECT count(*) INTO r_user
    FROM auth.users u WHERE u.email LIKE v_ns_email;

  -- ⊖ Asserção negativa herdada de T-46-01-03: a fixture nunca pode ter escrito
  -- em `notificacoes_enviadas`. Conferir no teardown e barato e fecha o unico
  -- caminho pelo qual um e-mail real poderia ter sido disparado com
  -- `NOTIFICACOES_MODO=producao`. Uma contagem nao-zero aqui nao e residuo de
  -- limpeza: e prova de que a fixture teve um efeito que ela jurou nao ter.
  SELECT count(*) INTO r_notif
    FROM public.notificacoes_enviadas n
   WHERE EXISTS (SELECT 1 FROM public.candidaturas c
                   JOIN public.candidatos ca ON ca.id = c.candidato_id
                   JOIN auth.users u ON u.id = ca.user_id
                  WHERE c.id = n.candidatura_id AND u.email LIKE v_ns_email);

  v_residuo := NULL;
  IF r_hold     <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('retencao_hold=%s', r_hold)); END IF;
  IF r_dec      <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('decisao_final=%s', r_dec)); END IF;
  IF r_dec_hist <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('decisao_final_historico=%s', r_dec_hist)); END IF;
  IF r_hist     <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('historico_candidatura=%s', r_hist)); END IF;
  IF r_cand     <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('candidaturas=%s', r_cand)); END IF;
  IF r_titular  <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('candidatos=%s', r_titular)); END IF;
  IF r_vaga     <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('vagas=%s', r_vaga)); END IF;
  IF r_user     <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('auth.users=%s', r_user)); END IF;
  IF r_notif    <> 0 THEN v_residuo := concat_ws(', ', v_residuo, format('notificacoes_enviadas=%s', r_notif)); END IF;

  IF v_residuo IS NOT NULL THEN
    RAISE EXCEPTION 'P46B0: teardown INCOMPLETO — sobrou residuo da fixture em PROD: %. A transacao inteira esta sendo revertida, entao o banco volta ao estado anterior a esta chamada e NADA foi removido pela metade. Causas possiveis, na ordem em que valem a pena: (1) uma vaga com prefixo fixture-p46 ainda tem candidatura ligada — a guarda NOT EXISTS do passo 7 recusou remove-la de proposito, para nao levar junto uma candidatura de pessoa real pelo ON DELETE CASCADE; (2) um auth.users do namespace ainda tem candidato vivo — mesma guarda no passo 8; (3) notificacoes_enviadas nao-zero, que NAO e problema de limpeza e sim prova de que a fixture escreveu onde jurou nao escrever (T-46-01-03), e nesse caso o que precisa de investigacao e a fixture, nao o teardown; (4) uma tabela nova passou a referenciar candidaturas depois que este arquivo foi escrito, e este teardown precisa de mais um passo. NAO contornar removendo a guarda: ela e o unico motivo pelo qual este script nao pode apagar dado de gente.', v_residuo;
  END IF;

  RAISE NOTICE 'P46 TEARDOWN OK — zero residuo da fixture no namespace fixture-p46+ em nove tabelas conferidas.';

END
$p46_teardown$;
