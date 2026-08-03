-- =============================================================================
-- Phase 43 / Plano 43-05 Task 2 — ESPEC EXECUTÁVEL do guard de marketing
-- (CONSENT-04 · SC#2 · LGPD Art. 7 I × Art. 7 V)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito junto com a migration `20260801000003` e deliberadamente RED contra o
-- banco atual: a função de consentimento, a tabela de classes e o trigger ainda
-- não existem. Ele descreve o que a migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi aplicado é ESCALAR o problema, não resolvê-lo — é o
-- movimento exato que transforma um gate em decoração.
--
-- COMO RODAR
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** — nunca
-- pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug upstream
-- anthropics/claude-code#13898). A chamada única é obrigatória por motivo mecânico:
-- `set_config(..., false)` é escopado à SESSÃO, então statements espalhados por
-- chamadas separadas zerariam o contador `smoke43g.pass` e o RESUMO (z) reprovaria
-- um run que na verdade passou (lição registrada da P41-05).
--
-- GATE VERDE = o contador `smoke43g.pass` bate **9** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial acumularia < 9 e o RESUMO reprova ALTO.
--
-- -----------------------------------------------------------------------------
-- ⚠ ESTE SMOKE ESCREVE — E DESFAZ TUDO QUE ESCREVE, POR CONSTRUÇÃO
-- -----------------------------------------------------------------------------
-- Toda escrita vive dentro de subtransação SEMPRE revertida (idioma `RAISE
-- EXCEPTION` com SQLSTATE próprio `P4305`, capturado logo acima). Isso vale também
-- para as escritas em `public.autorizacoes` e `public.classe_evento_notificacao`
-- que as asserções (b) e (f) precisam fazer para exercitar os ramos fail-closed e
-- o ramo positivo: elas são revertidas pelo MESMO mecanismo, e as asserções (y1) e
-- (y2) medem as contagens antes e depois em vez de acreditar nisso.
--
-- ⚠ POR QUE O ROLLBACK IMPORTA MAIS AQUI DO QUE PARECE, em duas frentes:
--   1. Uma linha esquecida em `notificacoes_enviadas` com `status='pendente'` é
--      ELEGÍVEL à varredura de retry do `pg_cron` (`varrer_retry_notificacoes`, a
--      cada 15 min) e seria re-despachada à Edge Function a cada ciclo, para
--      sempre. `NOTIFICACOES_MODO` é `producao` em PROD e é secret de PROJETO.
--   2. Uma linha esquecida em `public.autorizacoes` com
--      `autorizacao_marketing_vagas = true` seria CONSENTIMENTO FABRICADO — o
--      oposto exato do que esta fase inteira entrega. O teardown não é higiene, é
--      contenção; a asserção (y2) o mede.
--
-- Provar o guard por INSERÇÃO em vez de por leitura de `pg_trigger` é deliberado e
-- é o SC#2 inteiro: o catálogo conta o que o trigger DIZ; o INSERT conta o que o
-- banco FAZ, e é o segundo que decide se um envio é registrado.
--
-- -----------------------------------------------------------------------------
-- AS 9 ASSERÇÕES
-- -----------------------------------------------------------------------------
--   (a) A RECUSA, PROVADA POR ESCRITA REAL. Um `INSERT` de `divulgacao_vagas`
--       para candidato sem `autorizacao_marketing_vagas = true` recebe `P0003`.
--       É a metade do SC#2 que a fase precisa provar: envio bloqueado no ponto
--       onde todo envio é registrado, não leitura de flag.
--   (b) FAIL-CLOSED EM TRÊS FORMAS: sem nenhuma linha em `autorizacoes`, com a
--       coluna NULL, e com `evento` sem linha em `classe_evento_notificacao`.
--   (c) NÃO-REGRESSÃO DOS VIVOS: os 5 transacionais + o interno continuam sendo
--       ACEITOS por inserção real. Sem isto, um guard que recusasse TUDO passaria
--       em verde por (a) e (b).
--   (d) NEGATIVA DE VOCABULÁRIO: um 8º evento inventado é recusado com `23514` —
--       é o que distingue "aceita os 7" de "aceita qualquer coisa".
--   (e) NÃO-DIVERGÊNCIA DOS DOIS VOCABULÁRIOS: a lista do `pg_get_constraintdef`
--       vivo e `classe_evento_notificacao` coincidem NOS DOIS SENTIDOS.
--   (f) O CAMINHO POSITIVO EXISTE: com consentimento gravado (e revertido), o
--       mesmo `INSERT` é ACEITO — o guard discrimina, não bloqueia por construção.
--   (g) NEGATIVA DE PRIVILÉGIO: `proacl` das duas funções não contém `anon`; e
--       `classe_evento_notificacao` tem RLS ligada com ZERO policies.
--   (h) NEGATIVA DE TRIGGER VIZINHO: `trg_notificacoes_atualizado_em` (P37-03)
--       continua vivo com a mesma forma, e a tabela tem exatamente 2 triggers
--       não-internos.
--   (i) NEGATIVA DE ENVIO: `net._http_response` não ganhou NENHUMA linha durante o
--       smoke. A recusa é anterior ao `fetch`; esta asserção transforma essa
--       afirmação em MEDIÇÃO.
--   (y1)(y2) TEARDOWN ASSERIDO — ledger e `autorizacoes` de volta ao tamanho exato.
--   (z) RESUMO — exige o total de 9 PASS; run parcial falha AQUI, não em silêncio.
--
-- -----------------------------------------------------------------------------
-- ESCOPO DA PROVA — o que ela cobre e o que NÃO cobre
-- -----------------------------------------------------------------------------
-- COBRE: que o banco RECUSA o registro de um envio de classe marketing sem
-- consentimento, nos quatro ramos fail-closed, e que discrimina (o ramo positivo
-- passa); que os eventos vivos não regrediram; que os dois vocabulários coincidem;
-- e a postura de privilégio dos objetos novos.
--
-- NÃO COBRE — e isto está escrito por extenso em
-- `docs/compliance/marketing-consentimento-escopo.md`: que um e-mail de marketing
-- deixou de sair. NENHUM JAMAIS SAIU. Não existe caminho de envio de marketing
-- neste sistema, e a afirmação é ESTRUTURAL: `notificacoes_enviadas` exige
-- `candidatura_id NOT NULL`, então a infraestrutura de envio é candidatura-escopada
-- por construção e um aviso de nova vaga não tem candidatura a que se prender.
-- `divulgacao_vagas` é vocabulário RESERVADO com guard vivo, não suporte a marketing.
--
-- HIGIENE: `RESET ROLE` em toda troca de papel e ao final; NOTICEs carregam apenas
-- contagens, SQLSTATEs e nomes de objeto — NUNCA PII (nome, e-mail) e nunca o valor
-- de um segredo.
-- =============================================================================

RESET ROLE;
SELECT set_config('smoke43g.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE — resolve um par (candidatura, candidato) REAL só para satisfazer as
-- FKs NOT NULL de `notificacoes_enviadas`, e captura as baselines que as
-- asserções negativas (i), (y1) e (y2) vão comparar no fim.
--
-- ⚠ Se o par não resolver, levanta exceção ALTO. Um SKIP silencioso aqui seria
-- indistinguível de um guard que não existe.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand   uuid;
  v_cando  uuid;
  v_ledger int;
  v_autz   int;
  v_http   int;
  v_multi  int;
BEGIN
  SELECT c.id, c.candidato_id INTO v_cand, v_cando
    FROM public.candidaturas c
    JOIN public.candidatos ca ON ca.id = c.candidato_id
    JOIN auth.users u ON u.id = ca.user_id
   WHERE u.email = 'candidato.funil@teste.com'
     AND c.deleted_at IS NULL
   LIMIT 1;

  IF v_cand IS NULL THEN
    SELECT c.id, c.candidato_id INTO v_cand, v_cando
      FROM public.candidaturas c
     WHERE c.deleted_at IS NULL
     LIMIT 1;
    RAISE NOTICE 'FIXTURE: conta de teste não resolveu; usando a primeira candidatura viva (todas as escritas são revertidas de qualquer modo)';
  END IF;

  IF v_cand IS NULL OR v_cando IS NULL THEN
    RAISE EXCEPTION 'P43G FAIL (fixture): nenhuma candidatura viva para satisfazer as FKs NOT NULL de notificacoes_enviadas — o guard não pode ser provado por inserção sem uma linha-alvo válida';
  END IF;

  SELECT count(*) INTO v_ledger FROM public.notificacoes_enviadas;
  SELECT count(*) INTO v_autz   FROM public.autorizacoes;

  -- Baseline de requisições HTTP. `net._http_response` é a tabela do pg_net onde
  -- toda resposta de `net.http_post` aterrissa; ela é a MEDIDA de "nada foi
  -- despachado". Se ela não existir/não for legível, o smoke não pode provar a
  -- asserção (i) e isso tem de falhar ALTO em vez de virar um PASS vazio.
  IF to_regclass('net._http_response') IS NULL THEN
    RAISE EXCEPTION 'P43G FAIL (fixture): net._http_response não existe ou não é visível — a asserção (i) de zero envio não pode ser medida, e sem ela o smoke não prova que nada saiu para o provedor';
  END IF;
  EXECUTE 'SELECT count(*) FROM net._http_response' INTO v_http;

  -- ⚠ MEDIÇÃO DA MULTIPLICIDADE (o número que o 43-07 tem de registrar):
  -- quantos candidatos têm MAIS DE UMA linha em `autorizacoes` hoje. A regra
  -- "linha mais recente vence" de `pode_receber_marketing()` só é observável se
  -- este número for > 0; se for 0, a regra existe mas nunca foi exercida ao vivo.
  SELECT count(*) INTO v_multi
    FROM (SELECT candidato_id FROM public.autorizacoes
           GROUP BY candidato_id HAVING count(*) > 1) s;

  PERFORM set_config('smoke43g.cand',        v_cand::text,   false);
  PERFORM set_config('smoke43g.cando',       v_cando::text,  false);
  PERFORM set_config('smoke43g.ledger',      v_ledger::text, false);
  PERFORM set_config('smoke43g.autz',        v_autz::text,   false);
  PERFORM set_config('smoke43g.http',        v_http::text,   false);

  RAISE NOTICE 'FIXTURE ok: par (candidatura, candidato) resolvido; ledger=% linhas, autorizacoes=% linhas, net._http_response=% linhas (baselines)', v_ledger, v_autz, v_http;
  RAISE NOTICE 'FIXTURE — MULTIPLICIDADE MEDIDA: % candidato(s) com MAIS DE UMA linha em autorizacoes. A semântica "linha mais recente vence" de pode_receber_marketing() decide o resultado para esses; se o número for 0, a regra ainda não foi exercida ao vivo. REGISTRAR ESTE NÚMERO NO 43-07.', v_multi;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) A RECUSA, PROVADA POR ESCRITA REAL — o coração do SC#2.
--
--     Um `INSERT` de `divulgacao_vagas` para um candidato que NÃO tem
--     `autorizacao_marketing_vagas = true` tem de receber `P0003` do guard.
--     Envio bloqueado por ESCRITA RECUSADA no ponto por onde todo envio passa —
--     não por leitura de flag em algum ramo de código.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand  uuid := current_setting('smoke43g.cand')::uuid;
  v_cando uuid := current_setting('smoke43g.cando')::uuid;
  v_pode  boolean;
BEGIN
  -- Pré-condição explícita: sem ela, um candidato que POR ACASO tenha consentido
  -- faria esta asserção falhar por motivo errado, e a mensagem diria a verdade.
  SELECT public.pode_receber_marketing(v_cando) INTO v_pode;
  IF v_pode THEN
    RAISE EXCEPTION 'P43G FAIL (a): o candidato-fixture JÁ autorizou marketing (pode_receber_marketing = true) — a asserção de recusa não pode ser medida com este fixture. Escolha um candidato sem consentimento de marketing.';
  END IF;

  BEGIN
    INSERT INTO public.notificacoes_enviadas
      (evento, candidatura_id, candidato_id, template,
       destinatario_email, destinatario_original, dedupe_key, status, modo)
    VALUES
      ('divulgacao_vagas', v_cand, v_cando, 'smoke43g',
       'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
       'smoke43g:a', 'pendente', 'teste');

    -- Chegou aqui ⇒ o guard NÃO recusou. É a falha mais grave que este smoke pode
    -- detectar: o opt-out de marketing voltou a ser promessa órfã.
    RAISE EXCEPTION 'P43G FAIL (a): o INSERT de divulgacao_vagas foi ACEITO para um candidato SEM consentimento de marketing — o guard trg_guard_marketing_consentimento não existe, não está ligado, ou não recusa. O SC#2 está REPROVADO.'
      USING ERRCODE = 'P4306';
  EXCEPTION
    WHEN sqlstate 'P4306' THEN
      RAISE;  -- propaga a falha do smoke
    WHEN sqlstate 'P0003' THEN
      PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
      RAISE NOTICE 'PASS (a): o banco RECUSOU (P0003) o registro de um envio de classe marketing sem consentimento — escrita real bloqueada, não leitura de flag';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) FAIL-CLOSED EM TRÊS FORMAS. Os três ramos por onde um envio de marketing
--     entraria sem ser visto:
--       (b1) candidato SEM NENHUMA linha em `autorizacoes` (BD-4: 4 dos 21
--            candidatos vivos estão nesse estado, e NÃO foram back-fillados);
--       (b2) coluna `autorizacao_marketing_vagas` explicitamente NULL (BD-5: é o
--            estado de TODA a base histórica);
--       (b3) `evento` presente no CHECK mas SEM linha em
--            `classe_evento_notificacao` — o "não sei" do guard.
--
--     ⚠ (b1), (b2) e (b3) escrevem em `autorizacoes` / `classe_evento_notificacao`
--     para montar o cenário. Todas as escritas vivem na MESMA subtransação do
--     INSERT que as exercita, e o `P0003` do guard a reverte inteira — inclusive o
--     DELETE. As asserções (y1)/(y2) medem que nada sobrou.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand  uuid := current_setting('smoke43g.cand')::uuid;
  v_cando uuid := current_setting('smoke43g.cando')::uuid;
  v_ok    int  := 0;
BEGIN
  -- (b1) SEM NENHUMA LINHA em autorizacoes
  BEGIN
    DELETE FROM public.autorizacoes WHERE candidato_id = v_cando;
    INSERT INTO public.notificacoes_enviadas
      (evento, candidatura_id, candidato_id, template,
       destinatario_email, destinatario_original, dedupe_key, status, modo)
    VALUES
      ('divulgacao_vagas', v_cand, v_cando, 'smoke43g',
       'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
       'smoke43g:b1', 'pendente', 'teste');
    RAISE EXCEPTION 'P43G FAIL (b1): INSERT de marketing ACEITO para candidato SEM NENHUMA linha em autorizacoes — pode_receber_marketing() não é fail-closed na ausência de linha'
      USING ERRCODE = 'P4306';
  EXCEPTION
    WHEN sqlstate 'P4306' THEN RAISE;
    WHEN sqlstate 'P0003' THEN v_ok := v_ok + 1;
  END;

  -- (b2) COLUNA EXPLICITAMENTE NULL na linha mais recente
  BEGIN
    UPDATE public.autorizacoes SET autorizacao_marketing_vagas = NULL
     WHERE candidato_id = v_cando;
    INSERT INTO public.notificacoes_enviadas
      (evento, candidatura_id, candidato_id, template,
       destinatario_email, destinatario_original, dedupe_key, status, modo)
    VALUES
      ('divulgacao_vagas', v_cand, v_cando, 'smoke43g',
       'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
       'smoke43g:b2', 'pendente', 'teste');
    RAISE EXCEPTION 'P43G FAIL (b2): INSERT de marketing ACEITO com autorizacao_marketing_vagas = NULL — NULL não está sendo tratado como NÃO AUTORIZADO (BD-5 violado)'
      USING ERRCODE = 'P4306';
  EXCEPTION
    WHEN sqlstate 'P4306' THEN RAISE;
    WHEN sqlstate 'P0003' THEN v_ok := v_ok + 1;
  END;

  -- (b3) EVENTO SEM CLASSE registrada — o "não sei" recusa.
  --      Usa `confirmacao`, um evento TRANSACIONAL VIVO: removida a classificação,
  --      até ele passa a ser recusado. É a demonstração mais forte possível de que
  --      o guard não presume transacional por omissão.
  BEGIN
    DELETE FROM public.classe_evento_notificacao WHERE evento = 'confirmacao';
    INSERT INTO public.notificacoes_enviadas
      (evento, candidatura_id, candidato_id, template,
       destinatario_email, destinatario_original, dedupe_key, status, modo)
    VALUES
      ('confirmacao', v_cand, v_cando, 'smoke43g',
       'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
       'smoke43g:b3', 'pendente', 'teste');
    RAISE EXCEPTION 'P43G FAIL (b3): INSERT ACEITO para evento SEM linha em classe_evento_notificacao — o guard presume transacional por omissão, que é exatamente o caminho por onde um envio de marketing entra sem ser visto'
      USING ERRCODE = 'P4306';
  EXCEPTION
    WHEN sqlstate 'P4306' THEN RAISE;
    WHEN sqlstate 'P0003' THEN v_ok := v_ok + 1;
  END;

  IF v_ok <> 3 THEN
    RAISE EXCEPTION 'P43G FAIL (b): apenas % de 3 ramos fail-closed recusaram com P0003', v_ok;
  END IF;

  PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): fail-closed nos 3 ramos — sem linha, coluna NULL e classe desconhecida (todas as escritas de cenário revertidas)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) NÃO-REGRESSÃO DOS VIVOS — os 5 transacionais + o interno continuam sendo
--     ACEITOS, por inserção real, uma linha por evento em subtransação revertida.
--
--     Sem esta asserção, um guard que recusasse TUDO (por exemplo, por classificar
--     mal ou por consultar a coluna errada) passaria em verde por (a) e (b) e
--     derrubaria em silêncio os 5 e-mails transacionais do sistema.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand    uuid := current_setting('smoke43g.cand')::uuid;
  v_cando   uuid := current_setting('smoke43g.cando')::uuid;
  v_eventos text[] := ARRAY[
    'confirmacao', 'avanco', 'convite', 'decisao',
    'revisao_respondida', 'revisao_solicitada'
  ];
  v_ev      text;
  v_aceitos int := 0;
BEGIN
  FOREACH v_ev IN ARRAY v_eventos LOOP
    BEGIN
      INSERT INTO public.notificacoes_enviadas
        (evento, candidatura_id, candidato_id, template,
         destinatario_email, destinatario_original, dedupe_key, status, modo)
      VALUES
        (v_ev, v_cand, v_cando, 'smoke43g',
         'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
         'smoke43g:c:' || v_ev, 'pendente', 'teste');

      -- Chegou aqui ⇒ CHECK e guard aceitaram. Variáveis de PL/pgSQL NÃO são
      -- revertidas por rollback de subtransação, então o contador sobrevive.
      v_aceitos := v_aceitos + 1;
      RAISE EXCEPTION 'rollback_smoke43g' USING ERRCODE = 'P4305';
    EXCEPTION
      WHEN sqlstate 'P4305' THEN
        NULL;  -- reversão esperada
      WHEN sqlstate 'P0003' THEN
        RAISE EXCEPTION 'P43G FAIL (c): o guard RECUSOU o evento vivo ''%'' — um evento TRANSACIONAL (ou interno) foi tratado como marketing, e o e-mail correspondente acabou de morrer em silêncio para TODOS os candidatos', v_ev;
      WHEN check_violation THEN
        RAISE EXCEPTION 'P43G FAIL (c): o CHECK vivo REJEITOU o evento ''%'' com 23514 — a migration 20260801000003 reconstruiu o vocabulário SEM ele', v_ev;
    END;
  END LOOP;

  IF v_aceitos <> 6 THEN
    RAISE EXCEPTION 'P43G FAIL (c): apenas % de 6 eventos vivos foram aceitos', v_aceitos;
  END IF;

  PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): os 6 eventos vivos (5 transacionais + 1 interno) continuam sendo aceitos por inserção real (todas revertidas)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) NEGATIVA DE VOCABULÁRIO — o CHECK rejeita um 8º evento inventado, com
--     `23514`. Sem esta metade, um CHECK dropado e nunca readicionado passaria por
--     (c) em verde: um `evento text NOT NULL` sem CHECK aceita as 7 strings e todas
--     as outras. É esta asserção que distingue "aceita os 7" de "aceita qualquer
--     coisa".
--
--     ⚠ O SQLSTATE esperado é `23514` (check_violation) e NÃO `P0003`: o CHECK é
--     avaliado DEPOIS do `BEFORE INSERT`, mas o guard recusaria este evento com
--     P0003 (classe desconhecida) antes de o CHECK opinar. Ambos são recusa, e o
--     smoke aceita as duas — o que ele NÃO aceita é o INSERT passar.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand  uuid := current_setting('smoke43g.cand')::uuid;
  v_cando uuid := current_setting('smoke43g.cando')::uuid;
BEGIN
  BEGIN
    INSERT INTO public.notificacoes_enviadas
      (evento, candidatura_id, candidato_id, template,
       destinatario_email, destinatario_original, dedupe_key, status, modo)
    VALUES
      ('evento_inventado_smoke43g', v_cand, v_cando, 'smoke43g',
       'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
       'smoke43g:d', 'pendente', 'teste');

    RAISE EXCEPTION 'P43G FAIL (d): o ledger ACEITOU o evento inventado ''evento_inventado_smoke43g'' — o vocabulário não está mais fechado (constraint ausente ou substituída por uma sem lista de valores) E o guard não recusou por classe desconhecida'
      USING ERRCODE = 'P4306';
  EXCEPTION
    WHEN sqlstate 'P4306' THEN
      RAISE;
    WHEN check_violation THEN
      PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
      RAISE NOTICE 'PASS (d): o CHECK vivo rejeitou o 8º evento inventado com 23514 (vocabulário fechado)';
    WHEN sqlstate 'P0003' THEN
      PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
      RAISE NOTICE 'PASS (d): o guard rejeitou o 8º evento inventado com P0003 (classe desconhecida) antes de o CHECK opinar — recusa igualmente válida';
  END;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) NÃO-DIVERGÊNCIA DOS DOIS VOCABULÁRIOS. O CHECK do ledger e
--     `classe_evento_notificacao` são DOIS REGISTROS DA MESMA VERDADE, e dois
--     registros da mesma verdade divergem. Esta asserção é o que impede:
--       · todo valor do `pg_get_constraintdef` VIVO tem linha na tabela de classes;
--       · toda linha da tabela de classes está no CHECK vivo.
--
--     Um valor no CHECK sem classe seria recusado pelo guard em runtime (fail-closed
--     do "não sei") — um evento que o banco aceita nomear e recusa gravar. Uma
--     classe sem valor no CHECK é classificação de algo que não pode existir.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_def       text;
  v_no_check  text[];
  v_no_classe text[];
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'notificacoes_enviadas'
     AND c.conname = 'notificacoes_enviadas_evento_check';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P43G FAIL (e): a constraint notificacoes_enviadas_evento_check NÃO existe — o nome load-bearing foi perdido no DROP/ADD';
  END IF;

  -- Valores do CHECK que NÃO têm linha na tabela de classes.
  SELECT coalesce(array_agg(x.v), '{}') INTO v_no_classe
    FROM (SELECT unnest(regexp_matches(v_def, '''([a-z_]+)''::text', 'g')) AS v) x
   WHERE NOT EXISTS (
     SELECT 1 FROM public.classe_evento_notificacao ce WHERE ce.evento = x.v
   );

  -- Linhas da tabela de classes que NÃO estão no CHECK vivo.
  SELECT coalesce(array_agg(ce.evento), '{}') INTO v_no_check
    FROM public.classe_evento_notificacao ce
   WHERE v_def NOT LIKE '%''' || ce.evento || '''%';

  IF array_length(v_no_classe, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'P43G FAIL (e): valor(es) no CHECK vivo SEM linha em classe_evento_notificacao: % — o guard os recusaria em runtime (fail-closed do "não sei"): eventos que o banco aceita nomear e recusa gravar', array_to_string(v_no_classe, ', ');
  END IF;
  IF array_length(v_no_check, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'P43G FAIL (e): linha(s) em classe_evento_notificacao SEM valor no CHECK vivo: % — classificação de algo que não pode existir', array_to_string(v_no_check, ', ');
  END IF;

  PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): os dois vocabulários coincidem nos dois sentidos — CHECK vivo: %', v_def;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (f) O CAMINHO POSITIVO EXISTE — o guard DISCRIMINA, não bloqueia por construção.
--
--     Com `autorizacao_marketing_vagas = true` gravado numa subtransação, o MESMO
--     `INSERT` de `divulgacao_vagas` é ACEITO. Sem esta asserção, uma função de
--     consentimento que devolvesse `false` incondicionalmente passaria por (a) e
--     (b) em verde e o "consentimento" não teria consequência nenhuma — só um
--     "não" universal, que é o mesmo que nenhuma leitura.
--
--     ⚠ O `true` gravado aqui é CONSENTIMENTO FABRICADO e não pode sobreviver um
--     instante além desta subtransação. A asserção (y2) mede que não sobreviveu.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand    uuid := current_setting('smoke43g.cand')::uuid;
  v_cando   uuid := current_setting('smoke43g.cando')::uuid;
  v_linhas  int;
  v_aceito  boolean := false;
BEGIN
  BEGIN
    UPDATE public.autorizacoes
       SET autorizacao_marketing_vagas = true
     WHERE candidato_id = v_cando;
    GET DIAGNOSTICS v_linhas = ROW_COUNT;

    -- Candidato sem nenhuma linha (BD-4: 4 dos 21 vivos) precisa de uma para poder
    -- consentir. ⚠ `ip_aceite` é NOT NULL na tabela viva (`database.types.ts`: sem
    -- `| null` no `Row`), então omiti-lo aqui levantaria `23502` FORA dos handlers
    -- abaixo e abortaria o smoke inteiro com um erro que não diz nada sobre o guard.
    -- O `0.0.0.0` é marcador de dado sintético e vive só dentro desta subtransação.
    IF v_linhas = 0 THEN
      INSERT INTO public.autorizacoes
        (candidato_id, autorizacao_uso_dados, autorizacao_marketing_vagas, ip_aceite)
      VALUES (v_cando, true, true, '0.0.0.0'::inet);
    END IF;

    INSERT INTO public.notificacoes_enviadas
      (evento, candidatura_id, candidato_id, template,
       destinatario_email, destinatario_original, dedupe_key, status, modo)
    VALUES
      ('divulgacao_vagas', v_cand, v_cando, 'smoke43g',
       'delivered+smoke@resend.dev', 'delivered+smoke@resend.dev',
       'smoke43g:f', 'pendente', 'teste');

    v_aceito := true;
    RAISE EXCEPTION 'rollback_smoke43g' USING ERRCODE = 'P4305';
  EXCEPTION
    WHEN sqlstate 'P4305' THEN
      NULL;  -- reversão esperada: o consentimento fabricado E a linha do ledger somem juntos
    WHEN sqlstate 'P0003' THEN
      RAISE EXCEPTION 'P43G FAIL (f): o guard RECUSOU o envio de marketing MESMO COM autorizacao_marketing_vagas = true — pode_receber_marketing() não discrimina, devolve "não" incondicionalmente, e o consentimento continua sem consequência';
  END;

  IF NOT v_aceito THEN
    RAISE EXCEPTION 'P43G FAIL (f): o INSERT de divulgacao_vagas com consentimento não foi aceito, e o motivo não foi o guard — cenário não pôde ser montado';
  END IF;

  PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): com consentimento gravado (e revertido), o MESMO INSERT de marketing foi ACEITO — o guard discrimina';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (g) NEGATIVA DE PRIVILÉGIO. `REVOKE … FROM PUBLIC` NÃO remove `anon`: medido na
--     P42-06, o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a
--     `anon`/`authenticated` como grants DIRETOS E NOMEADOS em todo `CREATE
--     FUNCTION`. Esta asserção mede o `proacl` resultante em vez de acreditar no
--     texto do REVOKE.
--
--     Mais a postura da tabela nova: RLS LIGADA com ZERO policies (default-deny).
--     Uma policy permissiva mal escrita ABRE acesso; a AUSÊNCIA nunca abre.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_acl_pode  text;
  v_acl_guard text;
  v_rls       boolean;
  v_pols      int;
BEGIN
  SELECT coalesce(array_to_string(p.proacl, ','), '<nulo>') INTO v_acl_pode
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'pode_receber_marketing';
  IF v_acl_pode IS NULL THEN
    RAISE EXCEPTION 'P43G FAIL (g): public.pode_receber_marketing NÃO existe';
  END IF;
  IF v_acl_pode LIKE '%anon=%' THEN
    RAISE EXCEPTION 'P43G FAIL (g): anon TEM EXECUTE em pode_receber_marketing — o REVOKE nominal não pegou: %', v_acl_pode;
  END IF;

  SELECT coalesce(array_to_string(p.proacl, ','), '<nulo>') INTO v_acl_guard
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'guard_marketing_consentimento';
  IF v_acl_guard IS NULL THEN
    RAISE EXCEPTION 'P43G FAIL (g): public.guard_marketing_consentimento NÃO existe';
  END IF;
  IF v_acl_guard LIKE '%anon=%' THEN
    RAISE EXCEPTION 'P43G FAIL (g): anon TEM EXECUTE em guard_marketing_consentimento — %', v_acl_guard;
  END IF;

  SELECT c.relrowsecurity INTO v_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'classe_evento_notificacao';
  IF v_rls IS NULL THEN
    RAISE EXCEPTION 'P43G FAIL (g): a tabela public.classe_evento_notificacao NÃO existe';
  END IF;
  IF NOT v_rls THEN
    RAISE EXCEPTION 'P43G FAIL (g): RLS NÃO está ligada em classe_evento_notificacao';
  END IF;

  SELECT count(*) INTO v_pols FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'classe_evento_notificacao';
  IF v_pols <> 0 THEN
    RAISE EXCEPTION 'P43G FAIL (g): classe_evento_notificacao ganhou % policy(ies) — o desenho é default-deny TOTAL (só o trigger DEFINER e service_role leem)', v_pols;
  END IF;

  PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (g): anon sem EXECUTE nas duas funções; classe_evento_notificacao com RLS ligada e ZERO policies';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (h) NEGATIVA DE TRIGGER VIZINHO. Esta migration cria um trigger numa tabela que
--     JÁ TEM UM: `trg_notificacoes_atualizado_em` (P37-03,
--     `20260722000002:166-168`), que descongela `atualizado_em`. Um `CREATE
--     TRIGGER` descuidado, ou um `DROP` de nome errado, o derrubaria em silêncio —
--     e a coluna `atualizado_em` voltaria a congelar sem nenhum erro em lugar
--     nenhum.
--
--     Total esperado após o apply: EXATAMENTE 2 triggers não-internos.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_vizinho text;
  v_guard   text;
  v_total   int;
  v_nomes   text;
BEGIN
  SELECT pg_get_triggerdef(t.oid) INTO v_vizinho
    FROM pg_trigger t
   WHERE t.tgrelid = 'public.notificacoes_enviadas'::regclass
     AND t.tgname = 'trg_notificacoes_atualizado_em'
     AND NOT t.tgisinternal;

  IF v_vizinho IS NULL THEN
    RAISE EXCEPTION 'P43G FAIL (h): trg_notificacoes_atualizado_em DESAPARECEU de notificacoes_enviadas — o apply desta migration derrubou o trigger de atualizado_em da P37-03, e a coluna volta a congelar em silêncio';
  END IF;
  IF v_vizinho NOT LIKE '%BEFORE UPDATE%' THEN
    RAISE EXCEPTION 'P43G FAIL (h): trg_notificacoes_atualizado_em mudou de forma — esperado BEFORE UPDATE: %', v_vizinho;
  END IF;

  SELECT pg_get_triggerdef(t.oid) INTO v_guard
    FROM pg_trigger t
   WHERE t.tgrelid = 'public.notificacoes_enviadas'::regclass
     AND t.tgname = 'trg_guard_marketing_consentimento'
     AND NOT t.tgisinternal;

  IF v_guard IS NULL THEN
    RAISE EXCEPTION 'P43G FAIL (h): trg_guard_marketing_consentimento NÃO existe em notificacoes_enviadas';
  END IF;
  IF v_guard NOT LIKE '%BEFORE INSERT%' THEN
    RAISE EXCEPTION 'P43G FAIL (h): o guard não é BEFORE INSERT — um AFTER INSERT recusaria DEPOIS de a linha existir, e um BEFORE UPDATE não recusaria nada: %', v_guard;
  END IF;

  SELECT count(*), coalesce(string_agg(t.tgname, ', ' ORDER BY t.tgname), '<nenhum>')
    INTO v_total, v_nomes
    FROM pg_trigger t
   WHERE t.tgrelid = 'public.notificacoes_enviadas'::regclass
     AND NOT t.tgisinternal;

  IF v_total <> 2 THEN
    RAISE EXCEPTION 'P43G FAIL (h): notificacoes_enviadas tem % trigger(s) não-interno(s), esperado 2 (trg_notificacoes_atualizado_em + trg_guard_marketing_consentimento): %', v_total, v_nomes;
  END IF;

  PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (h): o vizinho trg_notificacoes_atualizado_em está intacto; a tabela tem exatamente 2 triggers não-internos (%)', v_nomes;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (i) NEGATIVA DE ENVIO — `net._http_response` não ganhou NENHUMA linha.
--
--     A afirmação estrutural é: o `INSERT` em `notificacoes_enviadas` é o CLAIM, e
--     o claim acontece ANTES do `fetch` para `api.resend.com/emails` no fluxo da
--     Edge Function; uma recusa no `BEFORE INSERT` nunca alcança o provedor. Esta
--     asserção transforma a afirmação em MEDIÇÃO — e é OBRIGATÓRIA porque
--     `NOTIFICACOES_MODO` é `producao` em PROD e é secret de PROJETO, não de
--     ambiente: um despacho acidental daqui sairia como e-mail REAL.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_antes int := current_setting('smoke43g.http')::int;
  v_agora int;
BEGIN
  EXECUTE 'SELECT count(*) FROM net._http_response' INTO v_agora;

  -- ⚠ A DIREÇÃO IMPORTA, e só uma delas é notícia (code review WR-05). O que esta
  -- asserção existe para detectar é um ACRÉSCIMO: requisição nova ⇒ despacho. Uma
  -- QUEDA é o worker de TTL do próprio pg_net podando respostas velhas — evento
  -- rotineiro, alheio ao smoke. Um `<>` trataria a poda como despacho e emitiria,
  -- em voz de urgência, a acusação FALSA de que um e-mail real pode ter saído.
  -- Um alarme que dispara sozinho é um alarme que alguém desliga.
  IF v_agora > v_antes THEN
    RAISE EXCEPTION 'P43G FAIL (i): net._http_response SUBIU de % para % linhas — ALGO FOI DESPACHADO durante o smoke. NOTIFICACOES_MODO é producao em PROD: verificar imediatamente se um e-mail REAL saiu', v_antes, v_agora;
  END IF;

  PERFORM set_config('smoke43g.pass', (coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int + 1)::text, false);
  IF v_agora < v_antes THEN
    RAISE NOTICE 'PASS (i): net._http_response CAIU de % para % linhas (poda de TTL do pg_net) — zero requisição nova, que é o que esta asserção afere', v_antes, v_agora;
  ELSE
    RAISE NOTICE 'PASS (i): ZERO requisição HTTP nova (net._http_response estável em % linhas) — nada saiu para o provedor', v_agora;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (y1) TEARDOWN ASSERIDO — o ledger. Nenhuma linha do smoke sobreviveu e a
--      contagem voltou ao valor exato de antes. As subtransações já revertem tudo;
--      esta asserção existe porque "deveria ter revertido" e "reverteu" são
--      afirmações diferentes.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_resto int;
  v_agora int;
  v_antes int := coalesce(nullif(current_setting('smoke43g.ledger', true), ''), '-1')::int;
BEGIN
  SELECT count(*) INTO v_resto
    FROM public.notificacoes_enviadas
   WHERE dedupe_key LIKE 'smoke43g:%' OR template = 'smoke43g';

  IF v_resto <> 0 THEN
    -- Contenção ANTES de falhar: uma linha 'pendente' esquecida vira dispatch
    -- recorrente do cron a cada 15 minutos, para sempre.
    DELETE FROM public.notificacoes_enviadas
     WHERE dedupe_key LIKE 'smoke43g:%' OR template = 'smoke43g';
    RAISE EXCEPTION 'P43G FAIL (y1): % linha(s) do smoke sobreviveram às subtransações (removidas agora) — o idioma de rollback não está funcionando como escrito', v_resto;
  END IF;

  -- A checagem PRECISA é a de cima, por `dedupe_key`/`template`: ela isola as linhas
  -- DO SMOKE e é imune a escrita concorrente. A contagem de tabela inteira abaixo é
  -- grosseira — em PROD um envio transacional legítimo pode aterrissar no meio da
  -- execução e ACRESCENTAR uma linha que não é do smoke. Por isso ela só afere a
  -- direção que nenhuma escrita legítima produz: PERDA (code review WR-05).
  SELECT count(*) INTO v_agora FROM public.notificacoes_enviadas;
  IF v_antes >= 0 AND v_agora < v_antes THEN
    RAISE EXCEPTION 'P43G FAIL (y1): o ledger CAIU de % para % linhas — o smoke APAGOU registro de envio, numa fase declaradamente zero-destrutiva', v_antes, v_agora;
  END IF;

  RAISE NOTICE 'TEARDOWN (y1) ok: zero linha do smoke remanescente; ledger de volta a % linhas', v_agora;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (y2) TEARDOWN ASSERIDO — `autorizacoes` e `classe_evento_notificacao`. A mais
--      importante das duas, e a razão é substantiva: as asserções (b) e (f)
--      DELETARAM, ANULARAM e MARCARAM COMO `true` linhas de consentimento de um
--      titular real dentro de subtransações. Um `true` sobrevivente seria
--      CONSENTIMENTO FABRICADO — o oposto exato do que esta fase inteira entrega —
--      e um DELETE sobrevivente seria PROVA APAGADA numa fase declaradamente
--      zero-destrutiva.
--
--      Esta asserção também é o gate que um predicado de purga acidentalmente
--      ligado nesta fase reprovaria.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_agora  int;
  v_antes  int := coalesce(nullif(current_setting('smoke43g.autz', true), ''), '-1')::int;
  v_cando  uuid := current_setting('smoke43g.cando')::uuid;
  v_true   int;
  v_classe int;
BEGIN
  -- Mesma razão de (y1) (code review WR-05): um cadastro REAL durante a execução
  -- acrescenta uma linha de `autorizacoes` que não é do smoke, e acusá-lo de
  -- "prova fabricada" seria acusar o produto de funcionar. O acréscimo fabricado
  -- que de fato importa está coberto com PRECISÃO pela asserção seguinte, que olha
  -- o candidato-fixture por `candidato_id`. Aqui fica só a PERDA — a direção que
  -- nenhum uso legítimo produz nesta fase, porque nada apaga.
  SELECT count(*) INTO v_agora FROM public.autorizacoes;
  IF v_antes >= 0 AND v_agora < v_antes THEN
    RAISE EXCEPTION 'P43G FAIL (y2): public.autorizacoes CAIU de % para % linhas — o smoke APAGOU prova de consentimento de forma persistente. Numa fase zero-destrutiva, isto é a falha mais grave possível', v_antes, v_agora;
  END IF;

  SELECT count(*) INTO v_true
    FROM public.autorizacoes
   WHERE candidato_id = v_cando AND autorizacao_marketing_vagas IS TRUE;
  IF v_true <> 0 THEN
    RAISE EXCEPTION 'P43G FAIL (y2): o candidato-fixture ficou com % linha(s) de autorizacao_marketing_vagas = true — CONSENTIMENTO FABRICADO pela asserção (f) sobreviveu à subtransação', v_true;
  END IF;

  SELECT count(*) INTO v_classe FROM public.classe_evento_notificacao;
  IF v_classe <> 7 THEN
    RAISE EXCEPTION 'P43G FAIL (y2): classe_evento_notificacao tem % linha(s), esperado 7 — o DELETE da asserção (b3) não foi revertido, e o evento removido passaria a ser recusado em PRODUÇÃO por classe desconhecida', v_classe;
  END IF;

  RAISE NOTICE 'TEARDOWN (y2) ok: autorizacoes de volta a % linhas, zero consentimento de marketing fabricado, classe_evento_notificacao íntegra em 7 linhas', v_agora;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_n int; v_esperado int := 9;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke43g.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P43G FAIL (z): RESUMO % PASS de % esperadas — run parcial; NÃO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'RESUMO: % asserções PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
