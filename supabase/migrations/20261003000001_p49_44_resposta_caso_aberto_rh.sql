-- =============================================================================
-- 20261003000001 — ler_resposta_caso_aberto_sjt : o RH dono da vaga lê, na Decisão Final,
--                  o texto que o candidato gravou na resposta do caso aberto da SJT ;
--                  caso_aberto_sjt_enviado + cand_congela_caso_aberto_{ins,upd,del} : o
--                  candidato não reescreve nem apaga o caso aberto depois que a nota nasce
-- =============================================================================
-- Phase 49 / Plano 49-44 · JORN-41 · WR-07 do 49-REVIEW-GAPS-4 · D-21, D-48, D-52..D-58
--
-- O QUE ESTAVA ERRADO (WR-07).
--   O aviso que o CR-02 pôs na Decisão Final (`decisao-sjt-sinal-revisao`) diz «revise o texto
--   antes de considerar este resultado». O RH não tinha onde fazer isso: a `avaliar-redacao` não
--   persiste o texto que analisa; o autosave grava em `respostas_avaliacao`, que nenhuma policy
--   deixa o RH ler (só `cand_le_respostas_aval` e `cand_escreve_respostas_aval`, do titular).
--   A marca estava cumprida; a revisão, não.
--
--   Decisão do operador (2026-10-01). Opção apresentada, texto literal: «(b) Dar ao RH acesso ao
--   texto da resposta. É maior e mexe em permissão de dados (RLS). Viraria um plano novo, e
--   publico com o aviso atual.» Resposta, verbatim: «B».
--
-- MEDIDO EM PROD (2026-10-03, só leitura, `set transaction read only`):
--   · policies vivas de `respostas_avaliacao`: exatamente `cand_escreve_respostas_aval`
--     (PERMISSIVE, ALL, {public}) e `cand_le_respostas_aval` (PERMISSIVE, SELECT, {public});
--   · `relforcerowsecurity` = false; dono da tabela = postgres;
--   · `anonimizar_candidato(uuid,boolean)`: `prosecdef` = true, dono = postgres;
--   · triggers da tabela: só os dois internos de FK (nenhum de `updated_at`);
--   · a RPC e o helper desta migration não existem; o ledger não tem esta versão;
--   · `pg_roles.rolconfig`: `authenticated` tem `statement_timeout=8s`; `authenticator` tem
--     `statement_timeout=8s` e `lock_timeout=8s` (ver «POR QUE OS DOIS SET LOCAL» abaixo).
--
-- POR QUE RPC E NÃO COLUNA NEM POLICY (escolhas do PLANEJADOR, vetáveis pelo operador no 49-45).
--   (1) Uma coluna em `scores_candidato` copiaria o texto para um segundo lugar que o motor de
--       exclusão, o recibo e as allowlists teriam de passar a cobrir. Uma policy de SELECT do RH
--       em `respostas_avaliacao` abriria TODOS os `teste` da tabela (respostas cruas de outros
--       instrumentos, contra a minimização do D-31). A RPC projeta só o texto do caso aberto, e a
--       única cópia continua sendo a que o motor já redige (20260923000001, passo 8/13).
--   (2) O predicado de posse é o WR-04, COPIADO e não inventado: o mesmo de `rh_le_scores`
--       (20260625000001), que protege a nota que este texto explica — administrador, ou `rh` dono
--       da vaga (`vagas.created_by = auth.uid()`). Sem filtro de `deleted_at`, como o WR-04.
--   (3) Só depois do envio: o texto sai só quando existe a linha `scores_candidato`
--       `sjt`/`caso_aberto`; o rascunho de um caso aberto não enviado nunca sai.
--
-- ESTADOS (sem causa inventada; escolha 5 do planejador, vetável no 49-45 (a)): `disponivel`
--   (texto inteiro, sem aparar); `sem_resposta_enviada` (sem a linha de score; `texto` nulo mesmo
--   havendo rascunho); `indisponivel` (enviado, e sem texto gravado — a função não alega por quê);
--   `removida` (o marcador `redigido` está na linha). `removida` é NEUTRO de propósito: o marcador
--   prova que o MOTOR de exclusão redigiu o texto, não QUEM pediu. O motor tem dois ramos e os
--   dois gravam o MESMO `{"redigido":"anonimizacao_p49"}`: (I) o direito do titular, via
--   `executar-direito-titular`; (II) a purga de retenção, via `purgar-retencao`
--   (20260923000002, `v_ramo_purga`). Um estado que dissesse «a pedido do titular» afirmaria ao
--   RH, sobre uma candidatura purgada por retenção, um exercício de direito LGPD que ninguém fez.
--   Sempre as duas chaves, `situacao` e `texto`.
--
-- POR QUE CONGELAR (escolha 4 do planejador; medição do código em 2026-10-03).
--   A tela do caso aberto reaberta depois do envio começa com o buffer vazio, e o `onBlur` do
--   campo grava `{}` por cima do texto (`SjtCasoAbertoScreen.tsx` → `flushNow`;
--   `useAutosaveAvaliacao.ts` → `flush` com `bufferRef` vazio numa tela recém-montada). Digitar
--   grava um texto novo. A trava por etapa (`cand_escreve_respostas_aval`) não impede nenhuma
--   das duas coisas enquanto a candidatura segue em `avaliacao_assincrona`. Sem o congelamento,
--   o RH poderia ler um texto que não é o que existia quando a nota nasceu, sem aviso.
--   A promessa já está na tela do candidato: «Após enviar, você não poderá editar suas
--   respostas.» (`AlertDialogDescription` do envio).
--
--   COMO: helper `public.caso_aberto_sjt_enviado(uuid)` (plpgsql SECURITY DEFINER, como o
--   `is_active_rh_admin` do 20260713000001 — lê como dono, sem recursão de RLS) e três políticas
--   `AS RESTRICTIVE … TO authenticated` (INSERT, UPDATE, DELETE) com
--     P = teste IS DISTINCT FROM 'sjt_caso_aberto' OR NOT public.caso_aberto_sjt_enviado(candidatura_id)
--   O helper só é verdadeiro para o PRÓPRIO titular (`candidatos.user_id = auth.uid()`) E quando
--   a linha `scores_candidato` `sjt`/`caso_aberto` existe; para qualquer outro devolve falso, e
--   assim não serve de oráculo sobre candidatura alheia. Não há política restritiva de SELECT: o
--   titular continua lendo a própria resposta.
--
--   POR QUE RESTRICTIVE ADITIVA, E NÃO REESCREVER A POLICY VIVA: as policies do titular têm
--   escritor vivo (o autosave). Acrescentar uma restrição é aditivo e reversível; derrubar e
--   recriar a policy viva é destrutivo e abriria uma janela sem trava. É o critério do operador
--   para objetos com escritor vivo («aditivo autônomo, destrutivo com portão»).
--
--   POR QUE O MOTOR NÃO É ALCANÇADO: as três políticas são `TO authenticated`. O motor de
--   exclusão (`anonimizar_candidato`, SECURITY DEFINER, dono = postgres = dono da tabela, sem
--   FORCE RLS — medido acima) escreve como dono, fora do alcance delas; ele continua redigindo a
--   linha congelada (cláusula (h) do smoke).
--
--   Resíduo aceito pelo planejador (T-49-44-12), não consertado aqui: o candidato que reabrir a
--   tela depois do envio vê a cópia neutra de trava já existente («Sua etapa avançou…»), que não
--   é exata nesse caso, mas é neutra e diz que «suas respostas já estão salvas».
--
-- O QUE O CONGELAMENTO NÃO FECHA (medição do PLANEJADOR no código em 2026-10-03; nomeado, não
-- consertado aqui; a disposição é do OPERADOR, no item (c) do checkpoint do 49-45).
--   O congelamento começa quando a linha de score nasce, e ela só nasce no FIM da chamada de IA
--   da `avaliar-redacao`, não no clique em «Enviar». Antes disso, o texto gravado e o texto
--   analisado podem divergir por três caminhos (R1–R3), e o RH leria o gravado sem aviso; e há
--   um quarto DEPOIS dela (R4):
--   · R1, flush falho segue para o envio. `handleSubmit` (`SjtCasoAbertoScreen.tsx`) faz
--     `await flushNow()` e chama `avaliarRedacao` mesmo quando o flush falhou: `flush`
--     (`useAutosaveAvaliacao.ts`) engole o erro com `setStatus('error')`, sem lançar e sem
--     devolver nada. A EF analisa o `texto` do estado React, e a linha gravada é a do último
--     flush que deu certo: um prefixo antigo, talvez sem o trecho que gerou o sinal. Sem flush
--     nenhum, a RPC devolve `indisponivel`, e isso é honesto.
--   · R2, edição durante a chamada de IA. A `avaliar-redacao` só insere a linha de score depois
--     de `callAi`, e essa chamada pode durar ~140 s, não 110 s: `timeoutMs: 110_000` é o teto de
--     CADA chamada ao provedor; com ele o primário faz uma tentativa só, e o fallback recebe o
--     que sobra do orçamento total `AI_TOTAL_BUDGET_MS` = 140000 (`ai-client.ts`, com piso de
--     5 s). Esses são os defaults do código: o orçamento é configurável por env, e o valor de
--     PROD não foi lido. A janela vai do envio até a linha nascer: essa chamada mais o trabalho
--     da EF antes e depois dela. Durante a chamada o campo segue editável (`submitting` só
--     desabilita o botão), e o debounce de 30 s ou o `onBlur` gravam o texto editado antes de a
--     linha nascer. Uma segunda aba ou um segundo aparelho do mesmo candidato fazem o mesmo, e
--     também um cliente que desistiu da resposta da EF enquanto a EF terminava — e este caso
--     acontece NA MESMA ABA: `avaliarRedacao` falha do lado do cliente (rede, aba em segundo
--     plano, fetch abortado) enquanto a EF segue até o `insert`; `handleSubmit` cai no `catch`
--     («Tente novamente») e o `finally` põe `submitting=false` (`SjtCasoAbertoScreen.tsx:146-155`,
--     medido em 2026-10-03); o `Textarea`, que nunca foi travado (`:233-241`, sem `disabled` nem
--     `readOnly`), é editado, e o `onBlur` ou o debounce gravam o texto novo antes de a linha nascer.
--   · R3, cliente modificado. A `avaliar-redacao` não grava o texto que recebe (`body.texto` vai
--     só para `callAi`). O autosave e o corpo da EF são duas escritas independentes do cliente, e
--     um cliente modificado pode mandar um texto à EF e gravar outro.
--   · R4, DEPOIS da linha de score: uma segunda nota sobre outro texto. A `avaliar-redacao`
--     aceita qualquer `pergunta_id` com `formato='caso_aberto'`, sem amarrá-la à vaga, e não
--     recusa quando a candidatura já tem linha `sjt`/`caso_aberto`; a chave única de
--     `scores_candidato` inclui a `pergunta_id` (4 perguntas de caso aberto em PROD, medido pelo
--     revisor em 2026-10-03). Um cliente modificado (o ator de R3), ainda em
--     `avaliacao_assincrona`, chama a EF de novo DEPOIS do congelamento, com outra pergunta de
--     caso aberto e outro texto: nasce uma segunda linha, que conta no resultado da SJT
--     (`normalizeSjtComposite`, `sinaisDasLinhas` da `consolidar-decisao-final`) e pode trazer o
--     sinal, enquanto o RH lê o texto congelado, que é o da primeira. O congelamento trava o
--     TEXTO gravado, não o número de notas. Hoje há 0 candidaturas com mais de uma linha
--     `sjt`/`caso_aberto` (medido pelo revisor): é resíduo latente, não incidente.
--   Rotas conhecidas, nenhuma escolhida aqui:
--   (i) na tela do candidato, não seguir para a EF sem flush bem-sucedido e travar o campo
--       durante o envio. Fecha R1, e a edição na mesma aba ENQUANTO o envio está pendente. NÃO
--       fecha a edição na mesma aba depois que o cliente desiste da resposta da EF (o `finally`
--       libera o campo com a EF ainda rodando), nem a de outra aba ou aparelho: essas partes de
--       R2 só a (ii) fecha;
--   (ii) a `avaliar-redacao` gravar, pelo service_role, o `body.texto` analisado imediatamente
--       antes da linha de score (fecha R1, R2 e R3, menos o intervalo entre as duas escritas;
--       custa mudar e publicar uma EF de IA);
--   (iii) publicar com os quatro registrados.
--   NENHUMA das rotas (i)–(iii) fecha R4: (i) é da tela; (ii) sobrescreveria o texto com o da
--   segunda chamada, que passaria a divergir da PRIMEIRA nota; (iii) só registra. O conserto de
--   R4 seria na `avaliar-redacao` (recusar quando a candidatura já tem linha `sjt`/`caso_aberto`
--   e exigir que a pergunta seja da SJT da vaga), fora do 49-44, e a disposição é do operador.
--   Esta migration NÃO afirma que o texto que o RH lê é o que a IA analisou, nem que a nota do
--   caso aberto é uma só: afirma só que, depois que a nota nasce, o candidato não reescreve nem
--   apaga o texto gravado.
--
-- POR QUE OS DOIS SET LOCAL NO TOPO. Os três CREATE POLICY tomam `AccessExclusiveLock` em
--   `respostas_avaliacao` até o fim da transação do apply. Um autosave que espere mais de ~8 s
--   atrás do lock FALHA (`statement_timeout` de `authenticated`/`authenticator`, medido acima): o
--   hook marca `error`, e o próximo flush tenta de novo. `lock_timeout = 3s` limita quanto tempo o
--   pedido de lock do apply fica na fila, onde faria todo autosave novo enfileirar atrás dele;
--   `statement_timeout = 5s` limita cada instrução enquanto o lock está seguro. O limite tem de
--   estar NO ARQUIVO, porque o `p46apply.cjs migrate` manda o arquivo byte a byte e o md5 do
--   ledger é o dele. Fora de transação, `SET LOCAL` só emite WARNING e não tem efeito — inócuo
--   para outras ferramentas.
--
-- ERRO: `insufficient_privilege` (42501) na guarda de papel e na de posse — para `rh`,
--   candidatura inexistente e candidatura alheia dão o MESMO 42501 (o RH de outra vaga não
--   distingue inexistente de alheio); `no_data_found` (P0002) só para administrador com
--   candidatura inexistente.
--
-- AUTHZ: `SECURITY DEFINER` / `SET search_path = ''`. Guarda fail-closed ANTES de qualquer
--   leitura: `auth.uid()` nulo recusa, e `coalesce(v_role, '')` faz o papel ausente recusar
--   (a comparação direta sobre um papel nulo devolve NULL e o IF não dispara). ACL:
--   `REVOKE ALL … FROM PUBLIC`, `REVOKE ALL … FROM anon` com `anon` NOMEADO (o `pg_default_acl`
--   concede EXECUTE a `anon` como grant direto), `GRANT EXECUTE … TO authenticated, service_role`.
--   O helper tem o MESMO ACL: a policy roda com o papel de quem consulta, que precisa de EXECUTE.
--
-- IDEMPOTÊNCIA: `CREATE OR REPLACE` nas duas funções; o pré-portão exige que as duas funções e as
--   três políticas NÃO existam, então reaplicar por cima de si mesma aborta em vez de sobrescrever
--   em silêncio. Nenhum DML de dado; nenhuma policy viva é tocada.
--
-- Sem wrapper `BEGIN; ... COMMIT;` (D-22 — CLAUDE.md §Commands): corpo PL/pgSQL `$$` com
-- REVOKE/COMMENT adjacentes é a forma exata do 42601, e o endpoint já roda a requisição inteira
-- numa transação.
--
-- APLICAR COM: node p46apply.cjs migrate supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql
-- (a via da Phase 46 — SQL lido do ARQUIVO, migration + ledger na mesma transação).
-- =============================================================================

-- Limites de espera e de posse do lock (ver «POR QUE OS DOIS SET LOCAL NO TOPO»).
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '5s';

-- ─────────────────────────────────────────────────────────────────────────────
-- PRÉ-PORTÃO — RPC e helper não existem; nenhuma das três políticas existe; as policies vivas
-- são as duas do titular; sem FORCE RLS.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pre_portao$
DECLARE
  v_pols  text;
  v_force boolean;
BEGIN
  IF to_regprocedure('public.ler_resposta_caso_aberto_sjt(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: public.ler_resposta_caso_aberto_sjt(uuid) JA existe — esta migration a cria; reaplicar por cima sobrescreveria um corpo que ninguem mediu.';
  END IF;
  IF to_regprocedure('public.caso_aberto_sjt_enviado(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: public.caso_aberto_sjt_enviado(uuid) JA existe — esta migration o cria.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = 'respostas_avaliacao'
       AND p.policyname IN ('cand_congela_caso_aberto_ins', 'cand_congela_caso_aberto_upd', 'cand_congela_caso_aberto_del')
  ) THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: alguma das politicas cand_congela_caso_aberto_* JA existe — esta migration as cria.';
  END IF;

  SELECT string_agg(p.policyname || ':' || p.permissive, ',' ORDER BY p.policyname) INTO v_pols
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'respostas_avaliacao';
  IF v_pols IS DISTINCT FROM 'cand_escreve_respostas_aval:PERMISSIVE,cand_le_respostas_aval:PERMISSIVE' THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: as policies vivas de respostas_avaliacao sao «%», e o medido em 2026-10-03 era so as duas do titular. Uma policy a mais pode ja abrir leitura ao RH — medir de novo e decidir A MAO.', v_pols;
  END IF;

  SELECT c.relforcerowsecurity INTO v_force
    FROM pg_catalog.pg_class c WHERE c.oid = 'public.respostas_avaliacao'::regclass;
  IF v_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P49-44 PRE-PORTAO: respostas_avaliacao tem FORCE ROW LEVEL SECURITY = % — o desenho desta migration supoe que o dono da tabela (o motor de exclusao) nao e alcancado por RLS.', v_force;
  END IF;

  RAISE NOTICE 'P49-44 PRE-PORTAO OK — RPC ausente ; policies = % ; force_rls = %', v_pols, v_force;
END
$pre_portao$;


-- ─────────────────────────────────────────────────────────────────────────────
-- public.ler_resposta_caso_aberto_sjt(uuid) — a leitura do RH, predicado WR-04.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ler_resposta_caso_aberto_sjt(p_candidatura_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $ler$
DECLARE
  v_role  text;
  v_uid   uuid;
  v_dono  uuid;
  v_achou boolean;
  v_resp  jsonb;
BEGIN
  -- (i) Guarda de papel ANTES de qualquer leitura (não revela existência a quem não é RH).
  --     Fail-closed: sem `sub` recusa; sem papel recusa.
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  v_uid  := (select auth.uid());
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (ii) Posse da vaga — o predicado WR-04 de `rh_le_scores`. Para `rh`, inexistente e alheia
  --      dão o MESMO 42501. Sem filtro de `deleted_at`, como o WR-04.
  SELECT v.created_by INTO v_dono
    FROM public.candidaturas c
    JOIN public.vagas v ON v.id = c.vaga_id
   WHERE c.id = p_candidatura_id;
  v_achou := FOUND;

  IF v_role = 'rh' AND (NOT v_achou OR v_dono IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT v_achou THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;

  -- (iii) Só depois do envio: sem a linha de score do caso aberto, o rascunho NUNCA sai.
  IF NOT EXISTS (
    SELECT 1 FROM public.scores_candidato sc
     WHERE sc.candidatura_id = p_candidatura_id
       AND sc.tipo = 'sjt'
       AND sc.subtipo = 'caso_aberto'
  ) THEN
    RETURN jsonb_build_object('situacao', 'sem_resposta_enviada', 'texto', NULL);
  END IF;

  -- (iv) O texto gravado. `removida` não nomeia causa: o marcador prova a redação pelo motor,
  --      e o motor grava o mesmo marcador no direito do titular e na purga de retenção.
  SELECT ra.respostas INTO v_resp
    FROM public.respostas_avaliacao ra
   WHERE ra.candidatura_id = p_candidatura_id
     AND ra.teste = 'sjt_caso_aberto';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('situacao', 'indisponivel', 'texto', NULL);
  END IF;
  IF jsonb_typeof(v_resp) = 'object' AND v_resp ? 'redigido' THEN
    RETURN jsonb_build_object('situacao', 'removida', 'texto', NULL);
  END IF;
  IF jsonb_typeof(v_resp) = 'object'
     AND jsonb_typeof(v_resp -> 'texto') = 'string'
     AND btrim(v_resp ->> 'texto') <> '' THEN
    RETURN jsonb_build_object('situacao', 'disponivel', 'texto', v_resp ->> 'texto');
  END IF;
  RETURN jsonb_build_object('situacao', 'indisponivel', 'texto', NULL);
END
$ler$;

REVOKE ALL ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.ler_resposta_caso_aberto_sjt(uuid) IS
  'P49-44 / WR-07: devolve ao RH o texto que o candidato gravou na resposta do caso aberto da SJT, para revisar o sinal da Decisao Final. Predicado WR-04 (o de rh_le_scores): administrador, ou rh dono da vaga (vagas.created_by = auth.uid()); guarda fail-closed. So depois do envio (linha scores_candidato sjt/caso_aberto) — nunca o rascunho. Retorno {situacao, texto}: disponivel | sem_resposta_enviada | indisponivel | removida. removida e neutro: o marcador redigido prova a redacao pelo motor de exclusao, nao quem a pediu (o motor grava o mesmo marcador no direito do titular e na purga de retencao).';


-- ─────────────────────────────────────────────────────────────────────────────
-- public.caso_aberto_sjt_enviado(uuid) — helper das políticas do congelamento.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.caso_aberto_sjt_enviado(p_candidatura_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $enviado$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := (select auth.uid());
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  -- Verdadeiro só para o PRÓPRIO titular E com a linha de score do caso aberto: para quem não
  -- é o titular devolve falso, e não serve de oráculo sobre candidatura alheia.
  RETURN EXISTS (
    SELECT 1
      FROM public.candidaturas c
      JOIN public.candidatos ca ON ca.id = c.candidato_id
      JOIN public.scores_candidato sc
        ON sc.candidatura_id = c.id
       AND sc.tipo = 'sjt'
       AND sc.subtipo = 'caso_aberto'
     WHERE c.id = p_candidatura_id
       AND ca.user_id = v_uid
  );
END
$enviado$;

REVOKE ALL ON FUNCTION public.caso_aberto_sjt_enviado(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caso_aberto_sjt_enviado(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.caso_aberto_sjt_enviado(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.caso_aberto_sjt_enviado(uuid) IS
  'P49-44 / WR-07: helper das politicas cand_congela_caso_aberto_*. Verdadeiro so quando a candidatura e do PROPRIO titular (candidatos.user_id = auth.uid()) E ja existe a linha scores_candidato sjt/caso_aberto dela; falso para qualquer outro (nao e oraculo sobre candidatura alheia). plpgsql SECURITY DEFINER: le como dono, sem recursao de RLS.';


-- ─────────────────────────────────────────────────────────────────────────────
-- O congelamento: três políticas RESTRICTIVE, aditivas, só `TO authenticated`.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY cand_congela_caso_aberto_ins ON public.respostas_avaliacao
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (teste IS DISTINCT FROM 'sjt_caso_aberto' OR NOT public.caso_aberto_sjt_enviado(candidatura_id));

CREATE POLICY cand_congela_caso_aberto_upd ON public.respostas_avaliacao
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (teste IS DISTINCT FROM 'sjt_caso_aberto' OR NOT public.caso_aberto_sjt_enviado(candidatura_id))
  WITH CHECK (teste IS DISTINCT FROM 'sjt_caso_aberto' OR NOT public.caso_aberto_sjt_enviado(candidatura_id));

CREATE POLICY cand_congela_caso_aberto_del ON public.respostas_avaliacao
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (teste IS DISTINCT FROM 'sjt_caso_aberto' OR NOT public.caso_aberto_sjt_enviado(candidatura_id));

COMMENT ON POLICY cand_congela_caso_aberto_ins ON public.respostas_avaliacao IS
  'P49-44 / WR-07: depois que a linha scores_candidato sjt/caso_aberto nasce, o titular nao insere de novo a resposta do caso aberto. RESTRICTIVE e aditiva (soma-se a trava por etapa); so TO authenticated, fora do alcance do motor de exclusao.';
COMMENT ON POLICY cand_congela_caso_aberto_upd ON public.respostas_avaliacao IS
  'P49-44 / WR-07: depois que a linha scores_candidato sjt/caso_aberto nasce, o titular nao reescreve a resposta do caso aberto (nem pelo upsert do autosave). RESTRICTIVE e aditiva; so TO authenticated, fora do alcance do motor de exclusao.';
COMMENT ON POLICY cand_congela_caso_aberto_del ON public.respostas_avaliacao IS
  'P49-44 / WR-07: depois que a linha scores_candidato sjt/caso_aberto nasce, o titular nao apaga a resposta do caso aberto. RESTRICTIVE e aditiva; so TO authenticated, fora do alcance do motor de exclusao.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PÓS-PORTÃO — o que ficou no catálogo é o que este arquivo diz.
-- ─────────────────────────────────────────────────────────────────────────────
DO $pos_portao$
DECLARE
  c_sig    constant text := 'public.ler_resposta_caso_aberto_sjt(uuid)';
  c_helper constant text := 'public.caso_aberto_sjt_enviado(uuid)';
  v_md5_h  text;
  v_restr  text;
  v_perm   text;
  v_secdef boolean;
  v_conf   text[];
  v_md5    text;
  v_anon   boolean;
  v_auth   boolean;
BEGIN
  SELECT p.prosecdef, p.proconfig, md5(p.prosrc) INTO v_secdef, v_conf, v_md5
    FROM pg_catalog.pg_proc p WHERE p.oid = c_sig::regprocedure;
  IF v_secdef IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: % nao e SECURITY DEFINER — sem ela a leitura cairia na RLS do titular e o RH leria zero', c_sig;
  END IF;
  IF v_conf IS NULL OR NOT ('search_path=""' = ANY (v_conf)) THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: % sem search_path vazio (proconfig = %)', c_sig, v_conf;
  END IF;
  v_anon := has_function_privilege('anon',          c_sig::regprocedure, 'EXECUTE');
  v_auth := has_function_privilege('authenticated', c_sig::regprocedure, 'EXECUTE');
  IF v_anon THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: anon tem EXECUTE em % — o grant do pg_default_acl e DIRETO; o REVOKE nominal falhou', c_sig;
  END IF;
  IF NOT v_auth THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: authenticated sem EXECUTE em % — o RH nao conseguiria ler pela tela', c_sig;
  END IF;

  -- O helper: SECURITY DEFINER, search_path vazio, anon sem EXECUTE, authenticated com.
  SELECT p.prosecdef, p.proconfig, md5(p.prosrc) INTO v_secdef, v_conf, v_md5_h
    FROM pg_catalog.pg_proc p WHERE p.oid = c_helper::regprocedure;
  IF v_secdef IS DISTINCT FROM true OR v_conf IS NULL OR NOT ('search_path=""' = ANY (v_conf)) THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: % sem SECURITY DEFINER ou sem search_path vazio (prosecdef=%, proconfig=%)', c_helper, v_secdef, v_conf;
  END IF;
  IF has_function_privilege('anon', c_helper::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: anon tem EXECUTE em %', c_helper;
  END IF;
  IF NOT has_function_privilege('authenticated', c_helper::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: authenticated sem EXECUTE em % — a politica rodaria com o papel de quem consulta e falharia em todo autosave', c_helper;
  END IF;

  -- As três políticas: RESTRICTIVE, roles = {authenticated}, um comando cada.
  SELECT string_agg(p.policyname || ':' || p.permissive || ':' || p.cmd || ':' || array_to_string(p.roles, '|'), ',' ORDER BY p.policyname)
    INTO v_restr
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'respostas_avaliacao' AND p.permissive = 'RESTRICTIVE';
  IF v_restr IS DISTINCT FROM 'cand_congela_caso_aberto_del:RESTRICTIVE:DELETE:authenticated,cand_congela_caso_aberto_ins:RESTRICTIVE:INSERT:authenticated,cand_congela_caso_aberto_upd:RESTRICTIVE:UPDATE:authenticated' THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: as politicas RESTRICTIVE de respostas_avaliacao sao «%» (esperado as tres cand_congela_caso_aberto_*, TO authenticated)', v_restr;
  END IF;

  -- O conjunto PERMISSIVE é exatamente o de antes: nenhum caminho novo de leitura nem de escrita.
  SELECT string_agg(p.policyname, ',' ORDER BY p.policyname) INTO v_perm
    FROM pg_catalog.pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'respostas_avaliacao' AND p.permissive = 'PERMISSIVE';
  IF v_perm IS DISTINCT FROM 'cand_escreve_respostas_aval,cand_le_respostas_aval' THEN
    RAISE EXCEPTION 'P49-44 POS-PORTAO: as policies PERMISSIVE de respostas_avaliacao sao «%» (esperado so as duas do titular) — um caminho novo de leitura apareceu', v_perm;
  END IF;

  RAISE NOTICE 'P49-44 POS-PORTAO OK — md5(prosrc) ler_resposta_caso_aberto_sjt = % ; caso_aberto_sjt_enviado = % ; anon=% authenticated=% ; restritivas = %',
    v_md5, v_md5_h, v_anon, v_auth, v_restr;
END
$pos_portao$;
