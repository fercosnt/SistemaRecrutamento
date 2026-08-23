-- =============================================================================
-- Phase 47 / Plano 47-02 Task 2 — ESPEC EXECUTÁVEL do CONSOL-02 (VISRH-03 / W-1)
-- `listar_historico_candidatura`: o caminho FELIZ com dado real, mais as recusas
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito ANTES do apply de `20260809000001_p47_listar_historico_candidatura.sql`,
-- deliberadamente RED: a função ainda não existe em PROD. Ele descreve o que a
-- migration tem de produzir.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi aplicado é ESCALAR o problema — é exatamente o
-- movimento que transforma um gate em decoração.
--
-- -----------------------------------------------------------------------------
-- ⚠ A LIÇÃO QUE ESTE ARQUIVO EXISTE PARA NÃO REPETIR
-- -----------------------------------------------------------------------------
-- O smoke da fase que introduziu o `42804` passou **10/10** — e a função que ele
-- cobria estava quebrada em PROD desde o apply, com `/admin/retencao` sem carregar
-- para ninguém. Motivo, verbatim de `.planning/STATE.md:754`: a ÚNICA asserção sobre
-- aquela função testava a **recusa sem claim**. O guard levanta na PRIMEIRA linha do
-- corpo e o `RETURN QUERY` **nunca executava**.
--
-- **Um contador de asserções verdes mede caminhos EXERCITADOS, não caminhos
-- EXISTENTES.** Uma função cujo único teste é a recusa está, para efeito de corpo, sem
-- teste nenhum. Toda função com guard precisa de DUAS asserções: a que prova que ela
-- RECUSA quem deve recusar, e a que prova que ela FUNCIONA para quem deve passar.
--
-- Por isso a asserção (a) — caminho feliz, com um nome REAL resolvido — é a primeira,
-- e por isso ela **nunca é pulada**: quando o banco vivo não oferece o caso, ela monta
-- a própria fixture numa subtransação revertida. Uma asserção pulada é a forma barata
-- de fabricar exatamente o mesmo falso verde.
--
-- -----------------------------------------------------------------------------
-- COMO RODAR
-- -----------------------------------------------------------------------------
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** — nunca
-- pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug upstream
-- anthropics/claude-code#13898). A chamada única é obrigatória por motivo MECÂNICO:
-- `set_config(..., false)` é escopado à SESSÃO, então statements espalhados por
-- chamadas separadas zerariam o contador `smoke47h.pass` e o RESUMO (z) reprovaria um
-- run que na verdade passou (lição da P41-05).
--
-- Rodar **DEPOIS** do apply de `20260809000001`. GATE VERDE = o contador
-- `smoke47h.pass` bate **6** no RESUMO (z). O gate NÃO é "não levantou exceção": num
-- batch de chamada única, tudo depois do primeiro `RAISE` é INALCANÇÁVEL e, para quem
-- lê a saída, indistinguível de verde — foi assim que a P43 perdeu 9 asserções (lição
-- W-1). O contador é o que transforma silêncio em falha. Por isso (a) vem primeiro.
--
-- -----------------------------------------------------------------------------
-- ⚠ ESTE SMOKE PODE ESCREVER — E TODA ESCRITA É REVERTIDA
-- -----------------------------------------------------------------------------
-- As asserções (a), (d) e (e) inserem linhas de `historico_candidatura` quando
-- precisam de um recorte que o banco vivo não oferece, sempre dentro de subtransação
-- encerrada por `RAISE` com SQLSTATE próprio — ou seja, **ROLLBACK**. Variáveis
-- PL/pgSQL sobrevivem ao rollback, então as comparações rodam sobre o payload
-- capturado (idioma de `p43_matriz_retencao_smoke.sql`, asserção (g)).
--
-- A asserção (f) transforma "nada persistiu" de afirmação em MEDIÇÃO: a contagem de
-- `historico_candidatura` antes e depois do smoke inteiro tem de ser IDÊNTICA. Este é
-- um caminho de LEITURA, e um smoke de leitura que mude o estado do banco é um
-- defeito, não um teste.
--
-- ⚠ A claim impersonada é sempre fixada FORA das subtransações: `SET` não-local é
-- transacional no Postgres, e um `set_config` feito dentro do bloco revertido voltaria
-- atrás junto com as linhas.
--
-- -----------------------------------------------------------------------------
-- AS 6 ASSERÇÕES — QUATRO DELAS NEGATIVAS
-- -----------------------------------------------------------------------------
--   (a) ⊕ CAMINHO FELIZ, e a fase inteira depende dele. Administrador chama a função
--       para uma candidatura real e recebe ≥1 linha, com ≥1 rótulo IGUAL ao
--       `nome_completo` de um usuário RH vivo. Um `42804` (o cast ausente) reprova
--       AQUI; uma junção pelo lado errado reprova AQUI, porque nenhum nome resolveria.
--   (b) ⊖ NEGATIVA — ESCOPO POR VAGA. Um `rh` que não criou a vaga daquela candidatura
--       recebe `42501`. Sem esta asserção a regressão da SEG-02/WR-04 é SILENCIOSA NA
--       UI: nada muda de aparência, e um recrutador passa a ler o histórico de
--       candidaturas de vagas que não são dele.
--   (c) ⊖ NEGATIVA — PAPEL DO CANDIDATO, e o chamador sem claim nenhuma. A policy
--       `candidato_le_proprio_historico` continua VIVA no banco, então esta é a
--       asserção que prova que a fase NÃO abriu um vazamento de PII de funcionário que
--       não existia. A metade sem claim fecha o defeito NULL-cego sistêmico da 42-06:
--       um guard por `NOT IN` passaria por (b) em verde e reprovaria só aqui.
--   (d) ⊖ NEGATIVA — NENHUM IDENTIFICADOR INTERNO SAI DA FUNÇÃO. Nenhum rótulo com
--       forma de uuid, nenhum vazio, nenhum nulo — em nenhuma linha.
--   (e) OS QUATRO RÓTULOS, UM RECORTE POR VEZ, montados como fixture revertida. É o
--       backstop `E5 · partial` da 47-UI-SPEC em forma executável: um teste só do
--       caminho feliz passaria com a colisão de rótulos presente.
--   (f) ⊖ NEGATIVA — a contagem de `historico_candidatura` é idêntica antes e depois.
--   (z) RESUMO — exige o total de 6 PASS; run parcial falha AQUI, não em silêncio.
--
-- -----------------------------------------------------------------------------
-- ESCOPO DA PROVA — o que ela cobre e o que NÃO cobre
-- -----------------------------------------------------------------------------
-- COBRE: o caminho feliz com nome real (a chave de junção e o cast, por EXECUÇÃO), os
-- dois modos de recusa que a mudança de tier de controle poderia ter apagado, a
-- ausência de identificador interno na saída, os quatro rótulos com a ordem dos ramos,
-- e a invariante de leitura.
--
-- NÃO COBRE: o componente `HistoricoBlock` nem o serviço (plano 47-07), e não cobre a
-- forma da definição — isso é o `DO` block de catálogo da própria migration, que
-- reprova o APPLY quando a junção ou o cast vêm errados.
--
-- HIGIENE: `RESET ROLE` em toda troca de contexto e ao final; a claim impersonada é
-- limpa explicitamente. Os NOTICEs carregam contagens, SQLSTATEs e nomes de objeto —
-- ⚠ e NUNCA o `nome_completo` resolvido, que é PII de funcionário: as asserções
-- comparam o nome e reportam apenas se BATEU.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke47h.pass', '0', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- FIXTURE — resolve os atores e a candidatura, e captura a baseline de (f).
--
-- ⚠ Cada resolução que falhar levanta ALTO. Um SKIP silencioso aqui seria
-- indistinguível de uma função que devolve qualquer coisa: as asserções deixariam de
-- provar o que dizem provar e o gate ficaria verde por AUSÊNCIA de teste — que é
-- literalmente o defeito que este arquivo existe para não repetir.
--
-- `smoke47h.feliz_vivo` registra se o banco vivo já oferece o caminho feliz (uma
-- transição cujo ator resolve para RH vivo e não é o próprio titular). Quando não
-- oferece, a asserção (a) monta a própria fixture — nunca é pulada.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin_auth uuid;
  v_cand       uuid;
  v_titular    uuid;
  v_rh_auth    uuid;
  v_rh_nome    text;
  v_orfao      uuid;
  v_hist       bigint;
  v_feliz      boolean := false;
BEGIN
  -- Administrador vivo: o chamador autorizado das asserções (a), (d) e (e).
  SELECT u.user_id INTO v_admin_auth
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin_auth IS NULL THEN
    RAISE EXCEPTION 'P47H FAIL (fixture): nenhum administrador VIVO em usuarios_rh — sem chamador autorizado o caminho feliz nao pode ser exercitado, e verificar so a recusa foi EXATAMENTE o defeito que deixou o 42804 passar por um smoke 10/10';
  END IF;

  -- O caminho feliz JA existe no banco vivo? Uma transicao cujo ator resolve para um
  -- usuario RH vivo e que NAO e o proprio titular (esse cai no rotulo 2, nao no nome).
  SELECT h.candidatura_id, u.user_id, u.nome_completo::text
    INTO v_cand, v_rh_auth, v_rh_nome
    FROM public.historico_candidatura h
    JOIN public.candidaturas cv ON cv.id = h.candidatura_id
    JOIN public.candidatos   ca ON ca.id = cv.candidato_id
    JOIN public.usuarios_rh  u  ON u.user_id = h.ator AND u.deleted_at IS NULL
   -- ⚠ `ca.user_id IS NOT NULL` vem ANTES do `IS DISTINCT FROM`, e nao e redundante:
   -- com `ca.user_id` nulo o `IS DISTINCT FROM` devolve TRUE para qualquer ator, e
   -- esta candidatura seria eleita "caminho feliz" so para ser recusada 20 linhas
   -- abaixo, onde `v_titular` e exigido nao-nulo. Mesma classe do fallback (:180).
   WHERE ca.user_id IS NOT NULL
     AND h.ator IS DISTINCT FROM ca.user_id
   ORDER BY h.criado_em DESC
   LIMIT 1;

  v_feliz := (v_cand IS NOT NULL);

  -- Sem o caso vivo: uma candidatura de suporte para a fixture revertida.
  --
  -- ⚠ NAO e "qualquer candidatura". Ela tem de ter titular com `user_id` NAO-NULO,
  -- que e exatamente o que o statement seguinte exige para exercitar o rotulo 2
  -- ("O proprio candidato"). Selecionar sem esse filtro e depois reprovar por falta
  -- dele e um portao que culpa o DADO por uma propriedade que ele proprio deixou de
  -- pedir — e o diagnostico que ele imprime aponta para o lugar errado.
  --
  -- Isto NAO e hipotetico: em 2026-08-23 este smoke reprovou em PROD exatamente
  -- assim. O motor de exclusao da Phase 45 rodou de verdade em 2026-08-22 sobre uma
  -- conta descartavel, e `candidatos_user_id_fkey` e `SET NULL` DE PROPOSITO — o
  -- candidato sobrevive a remocao da conta com `user_id` nulo. Aquele titular ficou
  -- dono das DUAS candidaturas mais novas, entao um `ORDER BY created_at DESC` sem
  -- filtro passou a escolher justamente o caso impossivel. O `IS DISTINCT FROM` do
  -- seletor do caminho feliz (:154) tem a mesma cegueira: com `ca.user_id` nulo ele
  -- devolve TRUE, que e a classe de defeito NULL-cego que a 42-06 ja pagou uma vez.
  IF v_cand IS NULL THEN
    SELECT cv.id INTO v_cand
      FROM public.candidaturas cv
      JOIN public.candidatos ca ON ca.id = cv.candidato_id
     WHERE ca.user_id IS NOT NULL
     ORDER BY cv.created_at DESC
     LIMIT 1;
  END IF;

  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'P47H FAIL (fixture): nenhuma candidatura em public.candidaturas cujo titular tenha user_id NAO-NULO — nao ha sobre o que ler historico exercitando o rotulo 2, e montar candidato+vaga+candidatura inteiros aqui excederia o que um smoke de LEITURA deve escrever. ⚠ Se `candidaturas` NAO esta vazia, o que faltou foi titular com conta: confira `SELECT count(*) FROM candidatos WHERE user_id IS NULL` antes de suspeitar da funcao';
  END IF;

  SELECT ca.user_id INTO v_titular
    FROM public.candidaturas cv
    JOIN public.candidatos ca ON ca.id = cv.candidato_id
   WHERE cv.id = v_cand;

  IF v_titular IS NULL THEN
    RAISE EXCEPTION 'P47H FAIL (fixture): a candidatura % nao resolve o user_id do titular — o rotulo 2 (O proprio candidato) nao poderia ser exercitado', v_cand;
  END IF;

  -- Um usuario RH VIVO que nao seja o titular: e o ator do rotulo 3 (o nome real).
  IF v_rh_auth IS NULL OR v_rh_auth = v_titular THEN
    SELECT u.user_id, u.nome_completo::text
      INTO v_rh_auth, v_rh_nome
      FROM public.usuarios_rh u
     WHERE u.deleted_at IS NULL AND u.user_id IS DISTINCT FROM v_titular
     ORDER BY u.created_at
     LIMIT 1;
    v_feliz := false;
  END IF;

  IF v_rh_auth IS NULL OR coalesce(btrim(v_rh_nome), '') = '' THEN
    RAISE EXCEPTION 'P47H FAIL (fixture): nenhum usuarios_rh vivo com nome_completo preenchido e distinto do titular — sem ele o rotulo do NOME (o requirement inteiro) nao tem como ser exercitado';
  END IF;

  -- Um ator NAO-nulo que NAO resolve para usuario vivo: e o rotulo 4. Preferencia por
  -- um usuarios_rh SOFT-DELETADO, que de quebra exercita o predicado deleted_at do ON.
  SELECT u.user_id INTO v_orfao
    FROM public.usuarios_rh u
   WHERE u.deleted_at IS NOT NULL AND u.user_id IS DISTINCT FROM v_titular
   ORDER BY u.deleted_at DESC
   LIMIT 1;

  IF v_orfao IS NULL THEN
    SELECT ca.user_id INTO v_orfao
      FROM public.candidatos ca
     WHERE ca.user_id IS DISTINCT FROM v_titular
       AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh u
                        WHERE u.user_id = ca.user_id AND u.deleted_at IS NULL)
     ORDER BY ca.created_at
     LIMIT 1;
  END IF;

  IF v_orfao IS NULL THEN
    RAISE EXCEPTION 'P47H FAIL (fixture): nao ha nenhum id de auth.users que deixe de resolver para usuarios_rh vivo — o rotulo 4 (Recrutador removido) nao poderia ser exercitado, e ele e justamente o rotulo para onde TODAS as linhas cairiam se a juncao estivesse pelo lado errado';
  END IF;

  SELECT count(*) INTO v_hist FROM public.historico_candidatura;

  PERFORM set_config('smoke47h.admin',      v_admin_auth::text, false);
  PERFORM set_config('smoke47h.cand',       v_cand::text,       false);
  PERFORM set_config('smoke47h.titular',    v_titular::text,    false);
  PERFORM set_config('smoke47h.rh_auth',    v_rh_auth::text,    false);
  PERFORM set_config('smoke47h.rh_nome',    v_rh_nome,          false);
  PERFORM set_config('smoke47h.orfao',      v_orfao::text,      false);
  PERFORM set_config('smoke47h.hist',       v_hist::text,       false);
  PERFORM set_config('smoke47h.feliz_vivo', v_feliz::text,      false);

  RAISE NOTICE 'FIXTURE ok: administrador vivo, candidatura % resolvida com titular e ator RH vivo distintos; caminho feliz disponivel no dado vivo = %; baseline de leitura = % linhas de historico', v_cand, v_feliz, v_hist;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (a) ⊕ CAMINHO FELIZ — A ASSERÇÃO DE QUE A FASE INTEIRA DEPENDE, E ELA VEM PRIMEIRO.
--
--     Administrador chama a função para uma candidatura real e recebe ≥1 linha, com
--     ≥1 rótulo IGUAL ao `nome_completo` de um usuário RH vivo.
--
--     Ela morde os DOIS defeitos que deixariam a suíte verde:
--       · o `::text` ausente ⇒ `42804` em toda chamada bem-sucedida, e o bloco aborta;
--       · a junção pela PK interna ⇒ ZERO nomes resolvem, `v_nome_ok` fica em 0, e a
--         mensagem NOMEIA a chave certa.
--
--     Quando o banco vivo não oferece o caso, a fixture é MONTADA aqui e revertida.
--     Pular seria fabricar o mesmo falso verde de 10/10 que este arquivo repudia.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin   uuid := current_setting('smoke47h.admin')::uuid;
  v_cand    uuid := current_setting('smoke47h.cand')::uuid;
  v_rh_auth uuid := current_setting('smoke47h.rh_auth')::uuid;
  v_rh_nome text := current_setting('smoke47h.rh_nome');
  v_feliz   boolean := current_setting('smoke47h.feliz_vivo')::boolean;
  v_linhas  int := -1;
  v_nome_ok int := -1;
  v_montou  boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text,
                      'app_metadata', json_build_object('role', 'administrador'))::text, false);

  IF v_feliz THEN
    -- O dado vivo ja tem o caso: LEITURA PURA, zero escrita.
    SELECT count(*), count(*) FILTER (WHERE t.ator_rotulo = v_rh_nome)
      INTO v_linhas, v_nome_ok
      FROM public.listar_historico_candidatura(v_cand) t;
  ELSE
    v_montou := true;
    BEGIN
      INSERT INTO public.historico_candidatura
             (candidatura_id, etapa_de, etapa_para, criterio_texto, ator)
      VALUES (v_cand, 'triagem', 'triagem', 'P47H fixture (a) — revertida', v_rh_auth);

      SELECT count(*), count(*) FILTER (WHERE t.ator_rotulo = v_rh_nome)
        INTO v_linhas, v_nome_ok
        FROM public.listar_historico_candidatura(v_cand) t;

      -- ROLLBACK INTENCIONAL: a linha ja provou o que tinha de provar e NAO pode
      -- sobreviver. Este smoke roda contra PROD e a trilha e append-only probatoria.
      RAISE EXCEPTION 'rollback_p47h_a' USING ERRCODE = 'P4701';
    EXCEPTION
      WHEN sqlstate 'P4701' THEN
        NULL;  -- reversao esperada; as variaveis acima sobreviveram
    END;
  END IF;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_linhas < 1 THEN
    RAISE EXCEPTION 'P47H FAIL (a): listar_historico_candidatura devolveu % linha(s) para uma candidatura com historico — o caminho feliz nao executa, e uma funcao cujo unico teste e a recusa esta, para efeito de corpo, sem teste nenhum', v_linhas;
  END IF;
  IF v_nome_ok < 1 THEN
    RAISE EXCEPTION 'P47H FAIL (a): % linha(s) devolvidas e NENHUMA com o nome real resolvido. E a assinatura da juncao pelo lado errado: usuarios_rh tem id (PK interna) E user_id (ponteiro para auth.users), e historico_candidatura.ator e FK de AUTH.USERS. Junte por u.user_id = h.ator. Com a outra chave zero linhas resolvem, todas caem em Recrutador removido, a tela fica plausivel e o requirement e entregue ao contrario', v_linhas;
  END IF;

  PERFORM set_config('smoke47h.pass', (coalesce(nullif(current_setting('smoke47h.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (a): CAMINHO FELIZ — % linha(s) devolvidas, % com nome real resolvido (fixture montada e revertida: %)', v_linhas, v_nome_ok, v_montou;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (b) ⊖ NEGATIVA — ESCOPO POR VAGA. Um `rh` que não criou a vaga recebe `42501`.
--
--     `SECURITY DEFINER` BYPASSA a RLS `rh_le_historico`, que a Phase 32 tornou
--     vaga-scoped (WR-04). Se o corpo não reimpuser o predicado, a mudança de tier de
--     controle APAGA o escopo — e a regressão é SILENCIOSA NA UI: nada muda de
--     aparência, e um recrutador passa a ler o histórico de candidaturas de vagas
--     alheias.
--
--     ⚠ O `sub` impersonado é um uuid SORTEADO de propósito: assim ele não pode
--     coincidir com o criador da vaga, e a asserção não depende de qual candidatura a
--     fixture escolheu.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand uuid := current_setting('smoke47h.cand')::uuid;
  v_ok   int := 0;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid()::text,
                      'app_metadata', json_build_object('role', 'rh'))::text, false);

  BEGIN
    PERFORM * FROM public.listar_historico_candidatura(v_cand);
    RAISE EXCEPTION 'P47H FAIL (b): a funcao ACEITOU um recrutador que NAO criou a vaga desta candidatura — o escopo por vaga da RLS rh_le_historico (P32/WR-04) foi apagado pela troca para SECURITY DEFINER e nao foi reimposto no corpo. E o vazamento horizontal que a SEG-02 abriu para fechar, reaberto pela porta que esta fase abriu para consertar um UUID'
      USING ERRCODE = 'P4702';
  EXCEPTION
    WHEN sqlstate 'P4702' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_ok <> 1 THEN
    RAISE EXCEPTION 'P47H FAIL (b): a recusa nao veio com 42501 (ok = %)', v_ok;
  END IF;

  PERFORM set_config('smoke47h.pass', (coalesce(nullif(current_setting('smoke47h.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (b): recrutador fora do escopo da vaga recusado com 42501 — o predicado do rh_le_historico vive no corpo';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (c) ⊖ NEGATIVA — O CANDIDATO, E O CHAMADOR SEM CLAIM NENHUMA.
--
--     A policy `candidato_le_proprio_historico` (20260607000006:60-70) continua VIVA:
--     a Phase 32 declarou explicitamente que não a tocou. Logo o candidato NÃO é
--     DB-denied, e o `GRANT EXECUTE TO authenticated` põe esta função ao alcance dele.
--     Sem o guard de papel, a fase criaria um vazamento de PII de funcionário que
--     **não existe hoje**. Esta asserção é a prova de que ela não criou.
--
--     ⚠ A metade (c.2) — sem claim nenhuma — fecha o defeito NULL-cego sistêmico da
--     42-06: `IF v_role NOT IN ('rh','administrador')` avalia NULL sem JWT, o `IF`
--     **não é tomado**, e o guard FALHA ABERTO justamente para o chamador mais
--     suspeito. Um guard por `NOT IN` passaria por (b) em verde e reprovaria só aqui.
--
--     O `sub` de (c.1) é o do PRÓPRIO titular: é o caso mais forte, porque é a única
--     pessoa que a RLS deixaria ler aquelas linhas por SELECT direto.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_cand    uuid := current_setting('smoke47h.cand')::uuid;
  v_titular uuid := current_setting('smoke47h.titular')::uuid;
  v_ok      int := 0;
BEGIN
  -- (c.1) papel `candidato`, com o sub do titular daquela candidatura.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_titular::text,
                      'app_metadata', json_build_object('role', 'candidato'))::text, false);

  BEGIN
    PERFORM * FROM public.listar_historico_candidatura(v_cand);
    RAISE EXCEPTION 'P47H FAIL (c.1): a funcao ACEITOU chamada com papel candidato — nome_completo de recrutadores acabou de ficar legivel para qualquer candidato autenticado, um vazamento de PII de funcionario que NAO existia antes desta fase'
      USING ERRCODE = 'P4703';
  EXCEPTION
    WHEN sqlstate 'P4703' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  -- (c.2) sem claim nenhuma: auth.jwt() resolve NULL e o guard tem de recusar assim mesmo.
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('request.jwt.claim.sub', '', false);

  BEGIN
    PERFORM * FROM public.listar_historico_candidatura(v_cand);
    RAISE EXCEPTION 'P47H FAIL (c.2): a funcao ACEITOU chamada SEM CLAIM NENHUMA — o guard e NULL-cego e falha ABERTO. Trocar IS DISTINCT FROM por NOT IN reintroduz exatamente este defeito, medido na 42-06'
      USING ERRCODE = 'P4704';
  EXCEPTION
    WHEN sqlstate 'P4704' THEN RAISE;
    WHEN sqlstate '42501' THEN v_ok := v_ok + 1;
  END;

  IF v_ok <> 2 THEN
    RAISE EXCEPTION 'P47H FAIL (c): apenas % de 2 recusas vieram com 42501', v_ok;
  END IF;

  PERFORM set_config('smoke47h.pass', (coalesce(nullif(current_setting('smoke47h.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (c): candidato autenticado E chamador sem claim recusados com 42501 (guard NULL-safe)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (d) ⊖ NEGATIVA — NENHUM IDENTIFICADOR INTERNO SAI DA FUNÇÃO.
--
--     O requirement é "nome em vez de UUID". Esta asserção é a que impede que a
--     correção seja um UUID com outro nome de coluna: nenhum rótulo pode ter forma de
--     uuid, ser vazio ou ser nulo — em NENHUMA linha.
--
--     A fixture (duas linhas: uma que resolve, outra que não) garante que a asserção
--     não passe por VACUIDADE quando a candidatura escolhida tiver poucas transições.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin   uuid := current_setting('smoke47h.admin')::uuid;
  v_cand    uuid := current_setting('smoke47h.cand')::uuid;
  v_rh_auth uuid := current_setting('smoke47h.rh_auth')::uuid;
  v_orfao   uuid := current_setting('smoke47h.orfao')::uuid;
  v_total   int := -1;
  v_uuid    int := -1;
  v_vazio   int := -1;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text,
                      'app_metadata', json_build_object('role', 'administrador'))::text, false);

  BEGIN
    INSERT INTO public.historico_candidatura
           (candidatura_id, etapa_de, etapa_para, criterio_texto, ator)
    VALUES (v_cand, 'triagem', 'triagem', 'P47H fixture (d.1) — revertida', v_rh_auth),
           (v_cand, 'triagem', 'triagem', 'P47H fixture (d.2) — revertida', v_orfao);

    SELECT count(*),
           count(*) FILTER (WHERE t.ator_rotulo ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
           count(*) FILTER (WHERE t.ator_rotulo IS NULL OR btrim(t.ator_rotulo) = '')
      INTO v_total, v_uuid, v_vazio
      FROM public.listar_historico_candidatura(v_cand) t;

    RAISE EXCEPTION 'rollback_p47h_d' USING ERRCODE = 'P4705';
  EXCEPTION
    WHEN sqlstate 'P4705' THEN NULL;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_total < 2 THEN
    RAISE EXCEPTION 'P47H FAIL (d): a fixture inseriu 2 linhas e a funcao devolveu % — a leitura nao esta enxergando as linhas da candidatura pedida', v_total;
  END IF;
  IF v_uuid <> 0 THEN
    RAISE EXCEPTION 'P47H FAIL (d): % rotulo(s) com forma de uuid na saida — o identificador interno do ator esta vazando pela funcao, que e literalmente o defeito que o CONSOL-02 veio consertar', v_uuid;
  END IF;
  IF v_vazio <> 0 THEN
    RAISE EXCEPTION 'P47H FAIL (d): % rotulo(s) nulo(s) ou vazio(s) — a linha de metadado do Historico renderizaria um espaco em branco onde deveria estar a autoria de uma transicao sob a RNF-07a', v_vazio;
  END IF;

  PERFORM set_config('smoke47h.pass', (coalesce(nullif(current_setting('smoke47h.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (d): % rotulo(s) inspecionado(s), zero com forma de uuid, zero vazio ou nulo (fixture revertida)', v_total;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (e) OS QUATRO RÓTULOS, UM RECORTE POR VEZ — o backstop `E5 · partial` da UI-SPEC.
--
--     ⚠ A ORDEM DOS RAMOS DO `CASE` É CONTRATO, E É ISTO QUE A PROVA. Se o ramo de
--     `ator IS NULL` não vier PRIMEIRO, a comparação com o `user_id` do titular avalia
--     NULL para a transição automática, cai no `ELSE`, e "Sistema" vira "Recrutador
--     removido" — a colisão que a Correção factual 3 da 47-UI-SPEC identificou,
--     reintroduzida por ordem de cláusula. Um teste só do caminho feliz passaria com
--     ela presente.
--
--     Os quatro recortes são discriminados por `criterio_texto`, e não por posição:
--     as quatro linhas têm o mesmo carimbo de tempo e a ordem entre elas é arbitrária.
--
--     ⚠ A mensagem de falha reporta o rótulo ESPERADO por CLASSE, nunca o
--     `nome_completo` — a saída deste smoke não carrega PII de funcionário.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_admin   uuid := current_setting('smoke47h.admin')::uuid;
  v_cand    uuid := current_setting('smoke47h.cand')::uuid;
  v_rh_auth uuid := current_setting('smoke47h.rh_auth')::uuid;
  v_rh_nome text := current_setting('smoke47h.rh_nome');
  v_titular uuid := current_setting('smoke47h.titular')::uuid;
  v_orfao   uuid := current_setting('smoke47h.orfao')::uuid;
  v_r1      text;
  v_r2      text;
  v_r3      text;
  v_r4      text;
  v_falhas  text := '';
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text,
                      'app_metadata', json_build_object('role', 'administrador'))::text, false);

  BEGIN
    INSERT INTO public.historico_candidatura
           (candidatura_id, etapa_de, etapa_para, criterio_texto, ator)
    VALUES (v_cand, 'triagem', 'triagem', 'P47H (e1) rh vivo',    v_rh_auth),
           (v_cand, 'triagem', 'triagem', 'P47H (e2) titular',    v_titular),
           (v_cand, 'triagem', 'triagem', 'P47H (e3) nao resolve', v_orfao),
           (v_cand, 'triagem', 'triagem', 'P47H (e4) sistema',    NULL);

    SELECT max(t.ator_rotulo) FILTER (WHERE t.criterio_texto = 'P47H (e1) rh vivo'),
           max(t.ator_rotulo) FILTER (WHERE t.criterio_texto = 'P47H (e2) titular'),
           max(t.ator_rotulo) FILTER (WHERE t.criterio_texto = 'P47H (e3) nao resolve'),
           max(t.ator_rotulo) FILTER (WHERE t.criterio_texto = 'P47H (e4) sistema')
      INTO v_r1, v_r2, v_r3, v_r4
      FROM public.listar_historico_candidatura(v_cand) t;

    RAISE EXCEPTION 'rollback_p47h_e' USING ERRCODE = 'P4706';
  EXCEPTION
    WHEN sqlstate 'P4706' THEN NULL;
  END;

  PERFORM set_config('request.jwt.claims', '', false);

  IF v_r1 IS DISTINCT FROM v_rh_nome THEN
    v_falhas := v_falhas || '(e1) ator que resolve para RH vivo NAO recebeu o nome_completo — juncao errada ou LEFT JOIN convertido em INNER; ';
  END IF;
  IF v_r2 IS DISTINCT FROM 'O próprio candidato' THEN
    v_falhas := v_falhas || format('(e2) ator igual ao user_id do titular recebeu %L, esperado o rotulo do proprio candidato — sem esse ramo a inscricao diria Recrutador removido sobre a propria pessoa; ', coalesce(v_r2, '<nulo>'));
  END IF;
  IF v_r3 IS DISTINCT FROM 'Recrutador removido' THEN
    v_falhas := v_falhas || format('(e3) ator nao-nulo que nao resolve recebeu %L, esperado o rotulo de recrutador removido — a linha sumiu (deleted_at foi para o WHERE e o LEFT JOIN virou INNER) ou o ramo nao existe; ', coalesce(v_r3, '<nulo>'));
  END IF;
  IF v_r4 IS DISTINCT FROM 'Sistema' THEN
    v_falhas := v_falhas || format('(e4) ator NULO recebeu %L, esperado o rotulo neutro de sistema — o ramo de ator nulo nao veio PRIMEIRO no CASE e a comparacao com o titular avaliou nulo, caindo no ELSE: e a colisao de rotulos reintroduzida por ordem de clausula; ', coalesce(v_r4, '<nulo>'));
  END IF;

  IF v_falhas <> '' THEN
    RAISE EXCEPTION 'P47H FAIL (e): %', v_falhas;
  END IF;

  PERFORM set_config('smoke47h.pass', (coalesce(nullif(current_setting('smoke47h.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (e): os QUATRO rotulos batem, um recorte por vez — nome real, proprio candidato, recrutador removido e sistema (fixture revertida)';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (f) ⊖ NEGATIVA E OBRIGATÓRIA — A CONTAGEM DO HISTÓRICO NÃO MUDOU.
--
--     Este é um caminho de LEITURA. Um smoke de leitura que mude o estado do banco é
--     um defeito, não um teste — e aqui o estado em questão é uma trilha append-only
--     que existe como prova sob a RNF-07a. "As subtransações deveriam ter revertido" e
--     "reverteram" são afirmações diferentes; esta asserção mede a segunda.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_antes   bigint := current_setting('smoke47h.hist')::bigint;
  v_agora   bigint;
  v_fixture bigint;
BEGIN
  SELECT count(*) INTO v_agora FROM public.historico_candidatura;

  SELECT count(*) INTO v_fixture
    FROM public.historico_candidatura h
   WHERE h.criterio_texto LIKE 'P47H%';

  IF v_agora <> v_antes THEN
    RAISE EXCEPTION 'P47H FAIL (f): public.historico_candidatura saiu de % para % linhas durante o smoke — alguma fixture escapou da subtransacao revertida e a trilha probatoria de PROD ganhou linha de teste', v_antes, v_agora;
  END IF;
  IF v_fixture <> 0 THEN
    RAISE EXCEPTION 'P47H FAIL (f): % linha(s) de fixture do smoke sobreviveram em historico_candidatura — o idioma de rollback nao esta funcionando como escrito', v_fixture;
  END IF;

  PERFORM set_config('smoke47h.pass', (coalesce(nullif(current_setting('smoke47h.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'PASS (f): % linha(s) de historico, identicas a baseline, e zero linha de fixture sobrevivente — leitura pura, medida', v_agora;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO em 6. Run parcial falha AQUI.
--
--     O gate NÃO é "não levantou exceção". Num batch de chamada única, tudo depois do
--     primeiro `RAISE` é inalcançável e some da saída sem deixar rastro de reprovação
--     — foi assim que a P43 perdeu 9 asserções. O contador transforma silêncio em falha.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE
  v_n        int;
  v_esperado int := 6;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke47h.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P47H FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'P47H RESUMO: % assercoes PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
