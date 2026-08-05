-- =============================================================================
-- Phase 45 / Plano 45-07 — ERASE-10 (D-45-11, saída S1)
-- A FK que hoje GARANTE o pior desfecho da fase deixa de ser cascata destrutiva
-- e vira rede de contenção: `candidatos.user_id` passa a aceitar NULL e a FK
-- para `auth.users` é recriada com `SET NULL`.
-- =============================================================================
--
-- Requirement:          ERASE-10 (precondição aritmética; sem esta migration o
--                       requisito é INEXECUTÁVEL, medido por execução na SONDA 6)
-- Decisão de origem:    45-CONTEXT D-45-11 — saída S1, travada pelo operador em
--                       2026-08-04 com os custos já declarados
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-07, Task 1 (a fatia TRACER)
--
-- -----------------------------------------------------------------------------
-- ⚠⚠ DDL DESTRUTIVA DE SCHEMA SOBRE TABELA VIVA, SEM PRECEDENTE NESTE REPOSITÓRIO
-- -----------------------------------------------------------------------------
-- Esta é a única migration do M8 que REMOVE uma garantia de schema (`NOT NULL`) e
-- TROCA a semântica de `ON DELETE` de uma FK sobre uma tabela com 22 linhas vivas.
-- A `45-PATTERNS.md` § No Analog Found registra: **não há análogo interno**. Só o
-- cabeçalho e a auto-verificação por bloco `DO` são herdados; o corpo é original.
--
-- Por isso ela é o **candidato número 1 a code review bloqueante + dry-run** pelo
-- portão de fase destrutiva do M8 (plano 45-11). Com o PITR desligado (D-45-10) e
-- o backup de 7 dias EXCLUINDO Storage, esse portão deixou de ser processo e virou
-- o mecanismo de segurança.
--
-- ⚠ REVERSIBILIDADE: `one-way`. Depois de aplicada, `user_id` aceita NULL e a
-- semântica de `ON DELETE` muda para TODAS as linhas existentes. Voltar exigiria
-- repopular `user_id` de linhas cujo usuário do Auth pode já não existir.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- O plano 45-07 AUTORA este arquivo e **aplica ZERO**. Quem aplica é o **45-11**,
-- atrás de code review bloqueante e do dry-run.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua
-- própria transação implícita, e o BEGIN/COMMIT externo é o gatilho do SQLSTATE
-- 42601 (CLAUDE.md §Migrations). Postgres tem DDL transacional, então uma falha em
-- qualquer statement abaixo reverte a migration INTEIRA — a auto-verificação no fim
-- deste arquivo depende disso.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. Logo após o apply:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000004'
--    WHERE name LIKE '%p45_sever_user_id%';
--
-- ⚠ FIDELIDADE. Conferir com o md5 do arquivo SEM o newline final — medido no
-- 45-06 (`printf '%s' "$(cat <arquivo>)" | md5 -q`); `length(statements[1])` conta
-- CARACTERES e `wc -c` conta BYTES, e a diferença de 1 é o newline descartado:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260805000004';
--
-- -----------------------------------------------------------------------------
-- (2) O QUE FOI MEDIDO, E POR QUE ISSO REORDENA A FASE INTEIRA
-- -----------------------------------------------------------------------------
-- `45-SONDAS-PROD.md` SONDA 1b, lida de `pg_constraint` em 2026-08-05:
--
--   candidatos_user_id_fkey | f | FOREIGN KEY (user_id) REFERENCES auth.users(id)
--                                 <cascata na exclusão — confdeltype = 'c'>
--
-- O repositório dizia `SET NULL` (`20260421000001_rate_limit_duplicate_check.sql:193`)
-- e era **ficção**: o `ADD COLUMN IF NOT EXISTS` daquele arquivo virou no-op contra
-- o schema legado, e a cláusula de FK escrita ali nunca chegou ao catálogo. Esta
-- migration RECONCILIA o drift que o próprio repositório já descrevia.
--
-- ⚠ E a falha não é benigna. Com a cascata viva, `auth.admin.deleteUser` destrói a
-- linha de `candidatos` em vez de deixar o tombstone, alcança `candidaturas` e bate
-- nas três FKs `NO ACTION` da trilha de decisão com **23503** → rollback → 500. Se
-- isso acontece DEPOIS do passo de Storage, o estado final é **currículo apagado e
-- irrecuperável (sem PITR, sem backup de Storage) com 100% da PII do titular
-- intacta no banco**. É o pior estado alcançável nesta fase, e hoje é o desfecho
-- GARANTIDO de qualquer implementação que chame `deleteUser` sem tratar esta FK.
--
-- -----------------------------------------------------------------------------
-- (3) PROVA POR EXECUÇÃO — o dry-run que o portão destrutivo exige JÁ FOI FEITO
-- -----------------------------------------------------------------------------
-- `45-SONDAS-PROD.md §6c`, 2026-08-05, sobre o titular puro `1079ccf7…`, num único
-- bloco transacional revertido por `RAISE EXCEPTION`:
--
--   ANTES  : historico=5 · decisao_final=1 · candidaturas=9 · candidatos=22
--   DROP NOT NULL ......................................... OK
--   DROP CONSTRAINT + recriar com SET NULL ................ OK
--   UPDATE candidatos SET user_id = NULL .................. OK (impossível antes)
--   DELETE FROM auth.users WHERE id = … ................... ✅ SUCESSO
--   DEPOIS : historico=5 · decisao_final=1 · candidaturas=9 · candidatos=22
--
-- As contagens são IDÊNTICAS: a trilha de decisão sobrevive inteira ao `deleteUser`.
-- E a prova de que a coluna é o bloqueio — ANTES da S1, `UPDATE candidatos SET
-- user_id = NULL` devolveu `23502 | null value in column "user_id" of relation
-- "candidatos" violates not-null constraint`. A S1 não é preferência de desenho:
-- é precondição aritmética do ERASE-10.
--
-- -----------------------------------------------------------------------------
-- (4) ESCOPO NEGATIVO, EM UMA LINHA
-- -----------------------------------------------------------------------------
-- **ESTA MIGRATION NÃO APAGA NENHUMA LINHA E NÃO TOCA A TRILHA DE DECISÃO.**
-- Zero `DELETE`, zero `DROP TABLE`, zero `DROP COLUMN`, zero `UPDATE` sobre PII.
-- Nenhuma das três FKs `NO ACTION` do ERASE-08 é mencionada, alterada ou relaxada —
-- a única FK tocada é `candidatos.user_id`, e ela é AFROUXADA de cascata para
-- `SET NULL`, que é a direção protetiva. A única escrita de linha é a fixture
-- sintética da auto-verificação, revertida por `RAISE`.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · A coluna passa a aceitar NULL
-- ---------------------------------------------------------------------------
-- É isto que torna o tombstone POSSÍVEL: o ERASE-02 manda desvincular in-place, e
-- desvincular é escrever NULL aqui.
ALTER TABLE public.candidatos
  ALTER COLUMN user_id DROP NOT NULL;


-- ---------------------------------------------------------------------------
-- 2 · A FK viva sai — pelo `conname` LIDO DO CATÁLOGO, nunca pelo do arquivo
-- ---------------------------------------------------------------------------
-- `candidatos_user_id_fkey` é o nome medido na SONDA 1b em 2026-08-05, e não o
-- nome que o arquivo de 2025 sugere. A distinção importa porque foi exatamente a
-- confiança no arquivo que produziu a divergência que esta migration reconcilia.
ALTER TABLE public.candidatos
  DROP CONSTRAINT candidatos_user_id_fkey;


-- ---------------------------------------------------------------------------
-- 3 · A FK volta como REDE
-- ---------------------------------------------------------------------------
ALTER TABLE public.candidatos
  ADD CONSTRAINT candidatos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- 4 · O índice UNIQUE de `user_id` PERMANECE — e é ele que torna a S1 viável
-- ---------------------------------------------------------------------------
-- `candidatos_user_id_key` NÃO é recriado e NÃO é dropado. Em Postgres, NULLs são
-- DISTINTOS entre si para efeito de índice único, então múltiplos tombstones
-- convivem sob o mesmo UNIQUE. É essa propriedade — medida no bloco `DO` abaixo, e
-- não assumida — que torna a saída S1 viável e a S3 (sentinela sintética em
-- `user_id`) inviável, porque uma sentinela precisaria existir em `auth.users`.


COMMENT ON CONSTRAINT candidatos_user_id_fkey ON public.candidatos IS
  'Phase 45 / ERASE-10 / D-45-11 (saída S1). QUATRO REGISTROS QUE A PRÓXIMA PESSOA PRECISA TER. '
  '(a) ESTADO ANTERIOR, MEDIDO: até 2026-08-05 esta FK vivia em pg_constraint com confdeltype = '
  '''c'' (cascata na exclusão), enquanto o repositório de migrations declarava SET NULL em '
  '20260421000001_rate_limit_duplicate_check.sql:193. A divergência veio de um ADD COLUMN IF NOT '
  'EXISTS que virou no-op contra o schema legado: a cláusula escrita no arquivo nunca chegou ao '
  'catálogo. Fonte de verdade para qualquer questão de ON DELETE é pg_constraint, nunca o arquivo. '
  '(b) POR QUE O ESTADO ANTERIOR ERA O PIOR POSSÍVEL: com a cascata viva, auth.admin.deleteUser '
  'DESTRUÍA a linha do candidato em vez de deixar o tombstone, alcançava candidaturas e batia nas '
  'três FKs NO ACTION da trilha de decisão com 23503 — e se isso acontecesse DEPOIS do passo de '
  'Storage, o currículo já teria sido apagado (irrecuperável: PITR desligado por D-45-10 e o '
  'backup de 7 dias exclui Storage) com 100% da PII do titular intacta no banco. '
  '(c) O QUE MUDOU: com SET NULL a FK vira REDE em vez de cascata — um deleteUser fora de ordem '
  'deixa ÓRFÃO em vez de destruir a linha e a trilha. O índice UNIQUE de user_id permanece de pé: '
  'NULLs são distintos em Postgres, então vários tombstones convivem (provado no bloco DO desta '
  'migration, não assumido). '
  '(d) EFEITO COLATERAL DESEJADO E MEDIDO, dito aqui em vez de descoberto depois: a policy own-row '
  'de solicitacoes_dados (20260804000002:183-187), que casa candidato_id IN (SELECT id FROM '
  'public.candidatos WHERE user_id = (select auth.uid())), deixa de casar com QUALQUER sessão '
  'depois do tombstone, e a Edge Function passa a responder 403 para o titular anonimizado. Isso é '
  'o CERTO — a pessoa pediu para sumir, e o painel dela sumiu junto — e não um defeito a consertar '
  'devolvendo visibilidade.';


COMMENT ON COLUMN public.candidatos.user_id IS
  'FK para auth.users. NULÁVEL desde 20260805000004 (Phase 45 / D-45-11): NULL é o TOMBSTONE — a '
  'linha do candidato sobrevive para que candidaturas e a trilha de decisão sobrevivam (ERASE-08), '
  'e o vínculo com a pessoa é o que morre. '
  '⚠ CUSTO ACEITO E DECLARADO no D-45-11: database.types.ts passa a user_id: string | null, e todo '
  'consumidor de src/ que assumia non-null precisa de varredura. A varredura está registrada no '
  '45-07-SUMMARY.md — é auditada no plano, não descoberta no tsc. '
  '⚠ QUEM ESCREVE NULL AQUI: exclusivamente public.anonimizar_candidato(uuid, boolean), passo '
  'severar_user_id, dentro da mesma transação do tombstone. Um NULL escrito por qualquer outro '
  'caminho é órfão sem recibo.';


-- ---------------------------------------------------------------------------
-- 5 · Auto-verificação: EXECUTA o caminho FELIZ e reverte
-- ---------------------------------------------------------------------------
-- Molde de `20260803000001:116-150`. "Não lançou" NÃO é "completou": este bloco não
-- se contenta em ler o catálogo — ele EXERCITA a propriedade que a saída S1 inteira
-- pressupõe, inserindo DUAS linhas com user_id NULL e exigindo que as DUAS sejam
-- aceitas. Uma migration que omitisse essa inserção estaria ASSUMINDO que o UNIQUE
-- não morde em NULL, e a fase inteira depende disso ser verdade.
--
-- Método provado em PROD pela SONDA 6 (§6d, zero resíduo): subtransação encerrada
-- por `RAISE EXCEPTION`, que o Postgres reverte inteira.
DO $verifica_sever_user_id$
DECLARE
  v_notnull  boolean;
  v_deltype  "char";
  v_a        uuid := gen_random_uuid();
  v_b        uuid := gen_random_uuid();
  v_aceitas  int;
  v_uniq     int;
BEGIN
  -- (i) a coluna deixou de ser NOT NULL
  SELECT a.attnotnull INTO v_notnull
    FROM pg_attribute a
   WHERE a.attrelid = 'public.candidatos'::regclass
     AND a.attname  = 'user_id'
     AND NOT a.attisdropped;

  IF v_notnull IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P45-S1: candidatos.user_id continua com attnotnull = % — o tombstone nao consegue setar NULL, e a SONDA 6 mediu o desfecho exato disso (23502 null value in column "user_id" violates not-null constraint). O ERASE-10 seguiria INEXECUTAVEL', v_notnull;
  END IF;

  -- (ii) a FK foi recriada com a semantica protetiva
  SELECT c.confdeltype INTO v_deltype
    FROM pg_constraint c
   WHERE c.contype   = 'f'
     AND c.conrelid  = 'public.candidatos'::regclass
     AND c.confrelid = 'auth.users'::regclass
     AND c.conname   = 'candidatos_user_id_fkey';

  IF v_deltype IS NULL THEN
    RAISE EXCEPTION 'P45-S1: a FK candidatos_user_id_fkey nao existe no catalogo depois da recriacao — o DROP aconteceu e o ADD nao';
  END IF;

  IF v_deltype <> 'n' THEN
    RAISE EXCEPTION 'P45-S1: candidatos.user_id -> auth.users esta com confdeltype = %, esperado ''n''. Sem SET NULL, deleteUser volta a destruir a linha do candidato e a bater nas tres FKs NO ACTION da trilha com 23503 — DEPOIS de o curriculo ja ter sido apagado', v_deltype;
  END IF;

  -- (iii) A PROPRIEDADE QUE A S1 INTEIRA PRESSUPOE: o UNIQUE nao morde em NULL.
  --       DUAS linhas, nao uma. Com uma so, um UNIQUE que rejeitasse o segundo NULL
  --       passaria despercebido — e a fase descobriria isso no SEGUNDO pedido de
  --       exclusao real, com o primeiro tombstone ja escrito.
  BEGIN
    INSERT INTO public.candidatos
      (id, user_id, nome_completo, email, celular, data_nascimento, cidade, estado,
       ativo, email_verificado, bloqueado, created_at, updated_at)
    VALUES
      (v_a, NULL, 'P45 S1 verificacao A',
       'p45s1a+' || replace(v_a::text, '-', '') || '@invalido.local',
       '(11) 90000-0001', DATE '1990-01-01', 'Campinas', 'SP',
       true, false, false, now(), now()),
      (v_b, NULL, 'P45 S1 verificacao B',
       'p45s1b+' || replace(v_b::text, '-', '') || '@invalido.local',
       '(11) 90000-0002', DATE '1990-01-02', 'Campinas', 'SP',
       true, false, false, now(), now());

    SELECT count(*) INTO v_aceitas
      FROM public.candidatos c WHERE c.id IN (v_a, v_b);

    SELECT count(*) INTO v_uniq
      FROM public.candidatos c WHERE c.id IN (v_a, v_b) AND c.user_id IS NULL;

    IF v_aceitas <> 2 OR v_uniq <> 2 THEN
      RAISE EXCEPTION 'P45-S1: o catalogo aceitou % das 2 linhas com user_id NULL (e % com user_id efetivamente nulo). A saida S1 pressupoe que multiplos tombstones convivem sob candidatos_user_id_key, porque NULLs sao DISTINTOS em Postgres. Se isso nao vale aqui, a S1 nao e viavel e a fase precisa voltar a decisao D-45-11', v_aceitas, v_uniq;
    END IF;

    -- Sinaliza sucesso E reverte a subtransacao inteira. Nada persiste.
    RAISE EXCEPTION 'P45-S1-OK';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM <> 'P45-S1-OK' THEN
        RAISE;
      END IF;
      RAISE NOTICE 'P45-S1 OK: user_id e nulavel (attnotnull = false), a FK foi recriada com confdeltype = ''n'', e o indice UNIQUE aceitou DUAS linhas com user_id NULL — a subtransacao foi revertida e nada persistiu';
  END;
END
$verifica_sever_user_id$;
