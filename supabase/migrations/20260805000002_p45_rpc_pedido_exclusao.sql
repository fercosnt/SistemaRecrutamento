-- =============================================================================
-- Phase 45 / Plano 45-03 — ERASE-05 + ERASE-06
-- As duas RPCs de ESTADO do pedido de exclusão: registrar (que encerra as
-- candidaturas em andamento na MESMA transação) e cancelar (que NÃO as reabre).
-- Nenhuma das duas apaga coisa alguma.
-- =============================================================================
--
-- Requirement:          ERASE-05, ERASE-06
-- Decisão de origem:    45-CONTEXT D-45-01 (a janela vem da config, nunca de
--                       literal) · D-45-06 / D-45-07 (encerramento IMEDIATO; o
--                       cancelamento não reabre) · D-45-13 (coluna aditiva)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-03, Task 1 (a fatia TRACER)
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **NENHUMA DAS DUAS FUNÇÕES APAGA, ANONIMIZA OU SEVERA COISA ALGUMA.** A única
-- escrita destas funções sobre dado vivo é `UPDATE candidaturas SET
-- encerrada_a_pedido_em = now()` — uma coluna que nasceu NULA na `20260805000001` e
-- que ACRESCENTA um fato sem apagar nem mover nenhum. Zero `DELETE`, zero `DROP`,
-- zero escrita em `etapa_atual`, zero linha nova em `historico_candidatura`, zero
-- e-mail disparado. O motor destrutivo é 45-07/45-10 e não está aqui.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- É o plano **45-06** que aplica; o plano 45-03 apenas AUTORA este arquivo.
--
-- ⚠ **ESTE É O SEGUNDO APPLY DO 45-03, E A ORDEM É O CONTROLE.** A
-- `20260805000001` vai primeiro: ela cria a tabela da janela que a
-- `registrar_pedido_exclusao` LÊ e as colunas que ela ESCREVE. Aplicar esta antes
-- daquela falha alto — e a auto-verificação no fim deste arquivo diz isso com todas
-- as letras em vez de deixar o erro cru do Postgres explicar.
--
-- ⚠ **ESTE ARQUIVO TEM DOIS CORPOS DELIMITADOS POR CIFRÕES** (duas funções
-- `LANGUAGE plpgsql`) e mais um bloco anônimo, todos cercados de
-- `REVOKE`/`GRANT`/`COMMENT` — exatamente a combinação que o transaction pooler
-- recusa com SQLSTATE 42601 ("cannot insert multiple commands into a prepared
-- statement"), CLAUDE.md §Migrations. Se o `apply_migration` reprovar, o caminho é o
-- workaround do CLAUDE.md (SQL Editor + `migration repair --status applied`), nunca
-- reescrever as funções para caber no transporte.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua
-- própria transação implícita, e o BEGIN/COMMIT externo é o gatilho do 42601.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. Logo após o apply:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000002'
--    WHERE name LIKE '%p45_rpc_pedido_exclusao%';
--
-- ⚠ FIDELIDADE DO CONTEÚDO. O ledger guarda o SQL literalmente aplicado em
-- `supabase_migrations.schema_migrations.statements text[]`. Aqui os `COMMENT` são o
-- único lugar dentro do banco onde está escrito que `cancelar_pedido_exclusao` NÃO
-- reabre candidatura — que é a promessa que a Invariante 3 da 45-UI-SPEC obriga a
-- tela a fazer ao titular ANTES do primeiro clique. Conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260805000002';
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260804000002_p44_solicitacoes_dados.sql:238-250` — o guard NULL-safe na sua
--     forma mais explícita, com o comentário que explica por que `NOT IN` falha
--     ABERTO. E `:295-296` — o `REVOKE` que NOMEIA `anon`.
--
--   · `20260801000004_p43_previa_retencao.sql:174-217` — o delimitador NOMEADO (o
--     que torna `md5(prosrc)` extraível pelo smoke) e o `REVOKE` sem grant de volta.
--
--   · `20260803000001_p43_fix_listar_matriz_cast.sql:110-168` — a ORDEM que
--     sobreviveu ao pooler (`REVOKE`/`GRANT` -> bloco anônimo -> `COMMENT`) e, mais
--     importante, o bloco de auto-verificação que exercita o **CAMINHO FELIZ**. A
--     lição literal daquele arquivo: *"um gate que nao morde nao e um gate — e esta
--     migration existe justamente porque o gate anterior media a recusa e chamava
--     aquilo de cobertura."*
--
--   · ⚠ **O ENVELOPE DA AUTO-VERIFICAÇÃO DIVERGE DO MOLDE, E A DIVERGÊNCIA É
--     OBRIGATÓRIA.** Lá a função verificada é `STABLE` — executá-la não deixa
--     resíduo. Aqui ela ESCREVE. Então o caminho feliz roda dentro de uma
--     SUBTRANSAÇÃO que termina em `RAISE EXCEPTION`, revertendo tudo. É o método que
--     a SONDA 6 (`45-SONDAS-PROD.md §6`) exercitou em PROD em 2026-08-05 com
--     verificação de integridade: zero resíduo, zero linha alterada.
--
--   · ⚠ **NENHUM CAMINHO DE REJEIÇÃO É REUSADO, e a recusa é medida.** As duas
--     modelagens intuitivas do encerramento estão erradas por razões diferentes:
--     passar por `etapa_atual` com o JWT do titular dispara o trigger de notificação
--     de transição, que manda **e-mail de decisão para quem acabou de pedir para ser
--     esquecido**; passar por ele com `service_role` grava `auto_rejeitado = true`,
--     **fabricando na tabela que existe para provar que ninguém é rejeitado por
--     máquina (RNF-07a) exatamente a evidência do contrário**. Por isso o
--     encerramento aqui é `UPDATE` de UMA coluna aditiva, e a palavra `rejeitado`
--     aparece UMA vez neste arquivo — como filtro de EXCLUSÃO do conjunto, jamais
--     como valor escrito.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.registrar_pedido_exclusao(uuid) — o pedido vira estado, e as
--     candidaturas em andamento fecham NA MESMA TRANSAÇÃO
-- ---------------------------------------------------------------------------
-- `SECURITY DEFINER` porque a escrita é privilegiada e chega por Edge Function com
-- `service_role`; `VOLATILE` porque ela escreve. `SET search_path = ''` endurece o
-- DEFINER (convenção do projeto), e por isso TODA referência é qualificada.
--
-- ⚠ `#variable_conflict use_column`: as colunas do `RETURNS TABLE` também são
-- variáveis em escopo, e `executar_em` é NOME DE COLUNA de `solicitacoes_dados`.
-- Sem esta diretiva um `RETURNING executar_em` levantaria 42702 (ambiguidade). Todas
-- as variáveis locais são prefixadas `v_` e o parâmetro `p_` exatamente para que a
-- diretiva nunca precise arbitrar nada de verdade.
--
-- ⚠ A ATOMICIDADE É O REQUISITO, não um efeito: o registro do pedido e o
-- encerramento das candidaturas acontecem na MESMA transação. Um estado em que o
-- pedido existe e as candidaturas continuam abertas é um recrutador agendando
-- entrevista com quem já pediu para sair; o inverso é uma pessoa fora de todos os
-- processos sem pedido registrado a que se agarrar.
CREATE OR REPLACE FUNCTION public.registrar_pedido_exclusao(p_candidato_id uuid)
RETURNS TABLE (
  solicitacao_id          uuid,
  executar_em             timestamptz,
  candidaturas_encerradas integer
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $registrar_pedido_exclusao$
#variable_conflict use_column
DECLARE
  v_uid        uuid := auth.uid();
  v_dono       uuid;
  v_dias       integer;
  v_id         uuid;
  v_executar   timestamptz;
  v_encerradas integer := 0;
BEGIN
  -- ── GUARD, DUAS METADES, E A SEGUNDA É A QUE FECHA O DEFEITO SISTÊMICO ─────
  -- (a) chamador SEM claim nenhuma é recusado EXPLICITAMENTE. Toda função DEFINER
  --     nova neste projeto nasce executável por `anon` (`pg_default_acl` de
  --     `public` concede EXECUTE como grant DIRETO), e o `REVOKE` abaixo é a outra
  --     metade — mas um guard que dependesse só do ACL seria um guard confiado a
  --     uma configuração de schema.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao registra pedido de exclusao'
      USING ERRCODE = '42501';
  END IF;

  -- (b) titularidade por `IS DISTINCT FROM`, NUNCA por `NOT IN`: com um dos lados
  --     NULL o `NOT IN` avalia NULL, o `IF` não é tomado, e o guard FALHA ABERTO
  --     justamente para o chamador mais suspeito (defeito REAL medido na 42-06).
  --     Aqui a forma NULL-safe também cobre "candidato inexistente": `v_dono` fica
  --     NULL, `NULL IS DISTINCT FROM <uid>` é TRUE, e a função recusa. Falha
  --     FECHADA por construção, não por lembrança.
  SELECT c.user_id INTO v_dono
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  IF v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: o pedido de exclusao so pode ser registrado pelo proprio titular'
      USING ERRCODE = '42501';
  END IF;

  -- ── IDEMPOTÊNCIA POR ESTADO, NUNCA POR try/catch ──────────────────────────
  -- Um pedido já agendado devolve A MESMA linha, sem mutar nada — e sem empurrar a
  -- data para frente. Empurrar o prazo a cada clique transformaria a janela de
  -- arrependimento num relógio que o próprio titular não consegue esgotar. E
  -- resolver isso por `EXCEPTION WHEN unique_violation` exigiria um índice único
  -- parcial que ninguém pediu, além de tornar o no-op indistinguível de uma corrida.
  SELECT s.id, s.executar_em INTO v_id, v_executar
    FROM public.solicitacoes_dados s
   WHERE s.candidato_id = p_candidato_id
     AND s.tipo = 'exclusao'
     AND s.situacao = 'agendado'
   ORDER BY s.solicitado_em DESC
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT v_id, v_executar, 0;
    RETURN;
  END IF;

  -- ── A JANELA VEM DA CONFIG, E A AUSÊNCIA DELA É ERRO, NUNCA UM DEFAULT ─────
  -- Um número compilado aqui seria uma segunda verdade sobre o mesmo fato, e a
  -- divergência apareceria entre o que foi PROMETIDO na tela e o que foi EXECUTADO
  -- sobre os dados. Falhar alto é a única saída honesta: a tela sabe degradar (ela
  -- renderiza a data alvo sem a contagem de dias); o motor, não.
  SELECT j.dias INTO v_dias
    FROM public.config_janela_exclusao j
   WHERE j.chave = 'exclusao_arrependimento';

  IF v_dias IS NULL THEN
    RAISE EXCEPTION 'CONFIG_AUSENTE: config_janela_exclusao sem a linha exclusao_arrependimento — a janela NAO pode ser assumida por default, porque um numero compilado aqui viraria mentira silenciosa na tela do titular'
      USING ERRCODE = 'P0001';
  END IF;

  -- `now()` é constante dentro da transação, então `executar_em` calculado com
  -- `now()` é IDÊNTICO a `solicitado_em + janela` — que é o que a auto-verificação
  -- no fim deste arquivo assere.
  INSERT INTO public.solicitacoes_dados (candidato_id, tipo, situacao, executar_em)
  VALUES (p_candidato_id, 'exclusao', 'agendado', now() + (v_dias * INTERVAL '1 day'))
  RETURNING id, executar_em INTO v_id, v_executar;

  -- ── O ENCERRAMENTO: UMA COLUNA ADITIVA, E NADA MAIS ───────────────────────
  -- ⚠ NÃO toca `etapa_atual`. ⚠ NÃO chama caminho de rejeição algum. ⚠ NÃO escreve
  -- em `historico_candidatura` (que tem UM único escritor desde o M2/Phase 6) e
  -- portanto NÃO dispara notificação de transição. ⚠ NÃO toca `deleted_at`, para
  -- que as cinco leituras de RH que filtram `.is('deleted_at', null)` continuem
  -- vendo a linha (Invariante 9 da 45-UI-SPEC: o silêncio também é proibido).
  --
  -- A palavra `rejeitado` aparece UMA vez neste arquivo, aqui, como filtro de
  -- EXCLUSÃO do conjunto — jamais como valor escrito. Candidatura já decidida não é
  -- encerrada a pedido: encerrar um processo que já acabou seria carimbar um fato
  -- que não aconteceu.
  UPDATE public.candidaturas c
     SET encerrada_a_pedido_em = now()
   WHERE c.candidato_id = p_candidato_id
     AND c.encerrada_a_pedido_em IS NULL
     AND c.deleted_at IS NULL
     AND c.etapa_atual NOT IN ('aprovado', 'rejeitado');

  GET DIAGNOSTICS v_encerradas = ROW_COUNT;

  RETURN QUERY SELECT v_id, v_executar, v_encerradas;
END;
$registrar_pedido_exclusao$;


-- ---------------------------------------------------------------------------
-- 2 · public.cancelar_pedido_exclusao(uuid) — interrompe a exclusão dos DADOS,
--     e NADA MAIS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancelar_pedido_exclusao(p_solicitacao_id uuid)
RETURNS TABLE (
  solicitacao_id uuid,
  cancelado_em   timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $cancelar_pedido_exclusao$
#variable_conflict use_column
DECLARE
  v_uid       uuid := auth.uid();
  v_dono      uuid;
  v_situacao  text;
  v_executar  timestamptz;
  v_id        uuid;
  v_cancelado timestamptz;
BEGIN
  -- Guard idêntico ao da seção 1, pelas mesmas duas metades. Ver os comentários de
  -- lá — a duplicação da prosa é deliberada nos moldes vivos deste repositório.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao cancela pedido de exclusao'
      USING ERRCODE = '42501';
  END IF;

  SELECT c.user_id, s.situacao, s.executar_em
    INTO v_dono, v_situacao, v_executar
    FROM public.solicitacoes_dados s
    JOIN public.candidatos c ON c.id = s.candidato_id
   WHERE s.id = p_solicitacao_id
     AND s.tipo = 'exclusao';

  IF v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: o pedido de exclusao so pode ser cancelado pelo proprio titular'
      USING ERRCODE = '42501';
  END IF;

  -- ⚠ FECHA NO ILEGÍVEL E NO EXPIRADO. `executar_em` NULL ou já passado NÃO é
  -- cancelável: a janela é o que torna o pedido reversível, e um cancelamento aceito
  -- depois dela seria a tela prometendo desfazer o que o motor já pode ter começado.
  -- Recusa com 22023 (invalid_parameter_value) para que a Edge Function traduza para
  -- 400 VALIDATION com código próprio — NUNCA 500: um pedido já executado ou já
  -- cancelado é um fato do domínio, não uma falha do servidor.
  IF v_situacao IS DISTINCT FROM 'agendado'
     OR v_executar IS NULL
     OR v_executar <= now() THEN
    RAISE EXCEPTION 'PEDIDO_NAO_CANCELAVEL: so um pedido agendado e dentro da janela pode ser cancelado'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.solicitacoes_dados s
     SET situacao = 'cancelado',
         cancelado_em = now()
   WHERE s.id = p_solicitacao_id
  RETURNING s.id, s.cancelado_em INTO v_id, v_cancelado;

  -- ⚠ NENHUMA ESCRITA SOBRE A TABELA DE CANDIDATURAS EXISTE NESTE CORPO, E A
  -- AUSÊNCIA É A DECISÃO. Cancelar interrompe a exclusão dos DADOS; ele NÃO reabre
  -- candidatura alguma (D-45-06). Ver o COMMENT desta função — é a promessa que a
  -- Invariante 3 da 45-UI-SPEC obriga a tela a fazer ANTES do primeiro clique.
  --
  -- (A frase proibida não é escrita aqui nem em prosa: um arquivo que proíbe uma
  -- string e a contém verbatim é sua própria primeira violação, e o grep de
  -- aceitação deste plano procura exatamente esse token dentro deste corpo.)
  RETURN QUERY SELECT v_id, v_cancelado;
END;
$cancelar_pedido_exclusao$;


-- ---------------------------------------------------------------------------
-- 3 · ACL — REVOKE nominal e só então o GRANT mínimo
-- ---------------------------------------------------------------------------
-- ⚠ NOMEAR `anon` É OBRIGATÓRIO. `FROM PUBLIC` sozinho NÃO remove nada: medido na
-- P42-06, o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a
-- `anon` e `authenticated` como grants DIRETOS E NOMEADOS em todo `CREATE FUNCTION`.
-- Revogar só de PUBLIC removeria um grant que nunca existiu.
--
-- ⚠ O ÚNICO GRANT É PARA `service_role`, e a diferença em relação às RPCs da fila do
-- RH (que concedem a `authenticated`) é substantiva: estas funções ESCREVEM, e a
-- única porta legítima até elas é a Edge Function `executar-direito-titular`, que
-- resolve o titular de `auth.uid()` no servidor. Conceder a `authenticated` daria ao
-- navegador um caminho direto para registrar pedidos, e o guard do corpo passaria a
-- ser o único controle contra um cliente que chama a RPC com o `candidato_id` de
-- outra pessoa — exatamente a classe T-32-03 que a EF existe para eliminar.
REVOKE ALL ON FUNCTION public.registrar_pedido_exclusao(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pedido_exclusao(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cancelar_pedido_exclusao(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_pedido_exclusao(uuid) TO service_role;


-- ---------------------------------------------------------------------------
-- 4 · Auto-verificação: EXECUTA o caminho feliz e assere que ele COMPLETOU
-- ---------------------------------------------------------------------------
-- Molde de `20260803000001:116-150`, com o envelope adaptado porque a função aqui
-- ESCREVE: tudo roda numa SUBTRANSAÇÃO que termina em `RAISE EXCEPTION`, e o
-- Postgres a reverte inteira. Método exercitado em PROD pela SONDA 6, com
-- verificação de integridade: zero resíduo.
--
-- ⚠ "NÃO LANÇOU" NÃO É "COMPLETOU". O gate anterior deste projeto media a recusa e
-- chamava aquilo de cobertura, e o defeito real (42804 em toda chamada bem-sucedida)
-- sobreviveu a um smoke 10/10 verde. As asserções abaixo são todas sobre o CAMINHO
-- FELIZ: a linha devolvida, a aritmética da janela, a idempotência do segundo
-- pedido, e a asserção NEGATIVA de que nenhuma linha de trilha nasceu.
DO $verifica_registrar_pedido_exclusao$
DECLARE
  v_titular    uuid;
  v_cand       uuid;
  v_dias       integer;
  v_id         uuid;
  v_id2        uuid;
  v_exec       timestamptz;
  v_exec2      timestamptz;
  v_sol        timestamptz;
  v_enc2       integer;
  v_hist_antes integer;
  v_hist_pos   integer;
BEGIN
  SELECT j.dias INTO v_dias
    FROM public.config_janela_exclusao j
   WHERE j.chave = 'exclusao_arrependimento';

  IF v_dias IS NULL THEN
    RAISE EXCEPTION 'P45-VERIFICA: config_janela_exclusao sem a linha exclusao_arrependimento — a 20260805000001 precisa ser aplicada ANTES desta migration';
  END IF;

  -- Um titular real, sem pedido de exclusão em aberto. A escrita que ele vai sofrer
  -- é revertida pela subtransação abaixo; medir sobre forma de dado REAL é melhor
  -- que sobre fixture sintética, e não deixa resíduo se algo falhar no meio —
  -- porque não há limpeza a falhar, há rollback.
  SELECT c.id, c.user_id INTO v_cand, v_titular
    FROM public.candidatos c
   WHERE c.user_id IS NOT NULL
     AND NOT EXISTS (
           SELECT 1 FROM public.solicitacoes_dados s
            WHERE s.candidato_id = c.id AND s.tipo = 'exclusao')
   ORDER BY c.created_at
   LIMIT 1;

  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'P45-VERIFICA: nenhum titular disponivel para exercitar o CAMINHO FELIZ de registrar_pedido_exclusao — e verificar so a recusa foi EXATAMENTE o defeito que a 20260803000001 corrigiu (o gate media a recusa e chamava aquilo de cobertura)';
  END IF;

  SELECT count(*) INTO v_hist_antes
    FROM public.historico_candidatura h
    JOIN public.candidaturas c2 ON c2.id = h.candidatura_id
   WHERE c2.candidato_id = v_cand;

  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_titular::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);

    SELECT r.solicitacao_id, r.executar_em INTO v_id, v_exec
      FROM public.registrar_pedido_exclusao(v_cand) r;

    -- Segunda invocação: idempotência POR ESTADO. Mesma data, zero encerramento
    -- novo, e a data NÃO empurrada para frente.
    SELECT r.solicitacao_id, r.executar_em, r.candidaturas_encerradas
      INTO v_id2, v_exec2, v_enc2
      FROM public.registrar_pedido_exclusao(v_cand) r;

    PERFORM set_config('request.jwt.claims', '', true);

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'P45-VERIFICA: registrar_pedido_exclusao nao devolveu linha — a funcao NAO COMPLETOU, e "nao lancou" nao e a mesma coisa que "completou"';
    END IF;

    SELECT s.solicitado_em INTO v_sol
      FROM public.solicitacoes_dados s WHERE s.id = v_id;

    IF v_exec IS DISTINCT FROM v_sol + (v_dias * INTERVAL '1 day') THEN
      RAISE EXCEPTION 'P45-VERIFICA: executar_em (%) nao e solicitado_em (%) + % dias — a janela precisa sair da config, nunca de literal', v_exec, v_sol, v_dias;
    END IF;

    IF v_id2 IS DISTINCT FROM v_id OR v_exec2 IS DISTINCT FROM v_exec OR v_enc2 <> 0 THEN
      RAISE EXCEPTION 'P45-VERIFICA: a segunda invocacao nao foi no-op (id % vs %, data % vs %, encerradas %) — um pedido ja agendado tem de devolver a MESMA linha sem mutar nada', v_id2, v_id, v_exec2, v_exec, v_enc2;
    END IF;

    SELECT count(*) INTO v_hist_pos
      FROM public.historico_candidatura h
      JOIN public.candidaturas c2 ON c2.id = h.candidatura_id
     WHERE c2.candidato_id = v_cand;

    IF v_hist_pos <> v_hist_antes THEN
      RAISE EXCEPTION 'P45-VERIFICA: o registro do pedido produziu % linha(s) nova(s) em historico_candidatura — o encerramento NAO pode passar pelo caminho de transicao de etapa, que dispararia notificacao e marcaria auto_rejeitado', v_hist_pos - v_hist_antes;
    END IF;

    IF EXISTS (SELECT 1 FROM public.candidaturas c3
                WHERE c3.candidato_id = v_cand
                  AND c3.encerrada_a_pedido_em IS NOT NULL
                  AND c3.deleted_at IS NOT NULL) THEN
      RAISE EXCEPTION 'P45-VERIFICA: candidatura encerrada a pedido com deleted_at preenchido — o encerramento e ADITIVO, e um soft delete a faria sumir das 5 leituras de RH em silencio';
    END IF;

    -- Sinaliza sucesso E reverte a subtransação inteira. Nada persiste.
    RAISE EXCEPTION 'P45-VERIFICA-OK';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('request.jwt.claims', '', true);
      IF SQLERRM <> 'P45-VERIFICA-OK' THEN
        RAISE;
      END IF;
      RAISE NOTICE 'P45 OK: registrar_pedido_exclusao COMPLETOU o caminho feliz (executar_em = solicitado_em + % dias), a segunda invocacao foi no-op, nenhuma linha de trilha nasceu, e a subtransacao foi revertida — nada persistiu', v_dias;
  END;
END
$verifica_registrar_pedido_exclusao$;


-- ---------------------------------------------------------------------------
-- 5 · COMMENT — depois do bloco anônimo, ordem herdada do molde
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION public.registrar_pedido_exclusao(uuid) IS
  'Phase 45 / ERASE-05 + ERASE-06 (LGPD Art. 18, VI): registra o pedido de exclusao do titular e '
  'encerra, NA MESMA TRANSACAO, toda candidatura dele que ainda esta em andamento. Devolve '
  '(solicitacao_id, executar_em, candidaturas_encerradas). '
  'SECURITY DEFINER + VOLATILE com search_path vazio; delimitador NOMEADO para que md5(prosrc) '
  'seja extraivel pelo smoke. '
  '⚠ A JANELA VEM DA CONFIG (config_janela_exclusao.exclusao_arrependimento), NUNCA de literal: '
  'a mesma linha que a copy da secao 4 de /candidato/privacidade le e a que o predicado de '
  'execucao do motor le (D-45-01). Config ausente levanta excecao — um default embutido aqui '
  'viraria mentira silenciosa sobre a data prometida ao titular. '
  '⚠ IDEMPOTENCIA POR ESTADO, nunca por try/catch: pedido ja agendado devolve A MESMA linha, com '
  'candidaturas_encerradas = 0, e a data NAO e empurrada para frente. '
  '⚠ O ENCERRAMENTO E IMEDIATO (D-45-06) e a alternativa "esperar o funil fechar sozinho" foi '
  'recusada explicitamente (D-45-07): um funil parado deixaria o pedido pendente indefinidamente, '
  'e o Art. 18 nao tem clausula de "quando der". Por isso NAO ha ramo algum que aguarde estado de '
  'etapa. '
  '⚠ O QUE ESTA FUNCAO NUNCA FAZ, e cada recusa tem razao medida: nao escreve em etapa_atual '
  '(esse e o caminho da REJEICAO — com JWT de titular ele dispara e-mail de decisao para quem '
  'pediu para ser esquecido; com service_role ele grava auto_rejeitado = true, fabricando na '
  'tabela que existe para provar que ninguem e rejeitado por maquina exatamente a evidencia do '
  'contrario, RNF-07a); nao insere em historico_candidatura (UM unico escritor desde o M2/Phase '
  '6); nao toca deleted_at (5 leituras de RH filtram por ele, e um soft delete faria a '
  'candidatura sumir de todas em silencio — Invariante 9 da 45-UI-SPEC); e nao apaga NADA. '
  'GUARD em duas metades: rejeicao explicita de auth.uid() NULL, e titularidade por IS DISTINCT '
  'FROM (nunca NOT IN, que falha ABERTO para chamador sem claim). Candidato inexistente cai no '
  'mesmo ramo, porque NULL IS DISTINCT FROM <uid> e TRUE. Recusa 42501. '
  'REVOKE ALL de PUBLIC, anon e authenticated NOMINALMENTE (pg_default_acl concede a anon como '
  'grant direto), e o UNICO GRANT e para service_role: a porta legitima e a Edge Function '
  'executar-direito-titular, que resolve o titular de auth.uid() no servidor e IGNORA qualquer '
  'candidato_id vindo do corpo do request (classe T-32-03).';

COMMENT ON FUNCTION public.cancelar_pedido_exclusao(uuid) IS
  'Phase 45 / ERASE-06: cancela um pedido de exclusao AGENDADO e DENTRO da janela. Grava '
  'situacao = cancelado e cancelado_em = now(). Devolve (solicitacao_id, cancelado_em). '
  '⚠ ESTA FUNCAO NAO REABRE CANDIDATURA ALGUMA, E A AUSENCIA DESSA ESCRITA E A DECISAO (D-45-06). '
  'Nao existe UPDATE sobre public.candidaturas em corpo algum desta funcao. A janela e cancelavel '
  'quanto a EXCLUSAO DOS DADOS e NAO quanto ao ENCERRAMENTO DOS PROCESSOS, que aconteceu no '
  'instante do pedido e nao volta. Esta e a promessa que a Invariante 3 da 45-UI-SPEC obriga a '
  'tela a fazer ANTES do primeiro clique: a frase "voce pode cancelar a qualquer momento", '
  'sozinha, PROMETE UM DESFAZER QUE NAO EXISTE, e por isso ela e proibida sem o qualificador nos '
  'tres sitios onde o cancelamento aparece. '
  '⚠ FECHA NO ILEGIVEL E NO EXPIRADO: executar_em NULL ou ja passado NAO e cancelavel. Aceitar um '
  'cancelamento fora da janela seria a tela prometendo desfazer o que o motor ja pode ter '
  'comecado — e nao ha copia de reserva do curriculo (D-45-10, PITR desligado). Recusa com 22023 '
  'para que a Edge Function traduza para 400 VALIDATION com codigo proprio, NUNCA 500: pedido ja '
  'executado ou ja cancelado e fato do dominio, nao falha de servidor. '
  'Mesmo guard em duas metades e mesma politica de ACL de registrar_pedido_exclusao.';
