-- =============================================================================
-- Phase 45 / Plano 45-07 — ERASE-02 / ERASE-09 / ERASE-10
-- `plano_exclusao_titular(uuid)` — a expressão ÚNICA da qual o dry-run e o
-- delete real saem. Diz o que a exclusão FARIA, por passo do motor, e não muta
-- nada.
-- =============================================================================
--
-- Requirement:          ERASE-02, ERASE-09, ERASE-10 (o inventário executável)
-- Decisão de origem:    45-CONTEXT D-45-10 (PITR NÃO ligado — o dry-run deixou de
--                       ser processo e virou o mecanismo de segurança da fase)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-07, Task 2
--
-- -----------------------------------------------------------------------------
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA
-- -----------------------------------------------------------------------------
-- **ESTA MIGRATION É INTEIRAMENTE READ-ONLY.** Não há `INSERT`, não há `UPDATE`,
-- não há `DELETE` e não há DDL destrutiva em lugar nenhum deste arquivo — nem no
-- corpo da função, nem na auto-verificação. A função é `STABLE` **por contrato e
-- por corpo**, e a auto-verificação só a CHAMA. Uma migration que declarasse
-- `STABLE` e escrevesse seria uma mentira que o planejador de queries acreditaria.
--
-- ⚠ E ISSO CONTINUA VERDADE DEPOIS DO 45-13, que acrescentou SQL DINÂMICO ao corpo
-- (a enumeração de bloqueadores do CR-05): o único comando construído é um
-- `SELECT EXISTS (...)`, o `user_id` vai por PARÂMETRO e os identificadores por `%I`.
-- `EXECUTE` de um `SELECT` não escreve nada e não viola `STABLE`. A auto-verificação
-- também **continua sem fixture**: ela exercita a enumeração contra contas VIVAS, por
-- leitura — criar fixture aqui é que quebraria a declaração acima.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes GSD
-- não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- O plano 45-07 AUTORA e **aplica ZERO**; quem aplica é o **45-11**.
--
-- ⚠ Este arquivo tem UM corpo delimitado por cifrões NOMEADOS cercado de
-- `REVOKE`/`GRANT`/`COMMENT` — a combinação que o transaction pooler recusa com
-- 42601. **Sem wrapper `BEGIN;`/`COMMIT;`** (o driver já abre a transação; o
-- BEGIN externo é o gatilho). Se `apply_migration` reprovar, o caminho é o
-- workaround do CLAUDE.md (SQL Editor + `migration repair --status applied`) —
-- nunca reescrever a função para caber no transporte.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER, logo após o apply:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000005'
--    WHERE name LIKE '%p45_plano_e_dry_run%';
--
-- -----------------------------------------------------------------------------
-- (2) POR QUE ESTA FUNÇÃO EXISTE SEPARADA DO TOMBSTONE
-- -----------------------------------------------------------------------------
-- O COMMENT vivo de `candidaturas_alem_da_janela()` (20260801000004:226-232) já
-- escreveu a regra, endereçada NOMINALMENTE a esta fase:
--
--     "CHAME ESTA FUNCAO, nao copie o corpo. O dry-run e o delete real TEM de sair
--      da mesma expressao; um dry-run que diverge do predicado e decoracao
--      (precedente: P39 CR-02, uma guarda que era dead code)."
--
-- Ela vale literalmente aqui. `anonimizar_candidato` (20260805000006) **CHAMA**
-- esta função; nunca copia o corpo dela. O smoke `p45_motor_exclusao_smoke.sql`
-- fecha isso por DOIS lados (asserção C3): pina o `md5(prosrc)` das duas E exige
-- que `pg_get_functiondef` do chamador CONTENHA a chamada. Uma sozinha não serve —
-- só com o md5, alguém deixaria esta função intacta e reescreveria o tombstone com
-- um predicado próprio "mais rápido", o md5 seguiria verde e o dry-run voltaria a
-- mentir sobre a exclusão.
--
-- ⚠ E isso importa MAIS aqui do que importava na P43: com o PITR desligado
-- (D-45-10) e o backup de 7 dias excluindo Storage inteiramente, **o dry-run é a
-- única rede que esta fase tem**.
--
-- -----------------------------------------------------------------------------
-- (3) O QUE ESTE PLANO NÃO ENUMERA, E POR QUE DIZER "NÃO SEI" É MELHOR QUE UM ZERO
-- -----------------------------------------------------------------------------
-- **Storage não é enumerável por SQL.** A SONDA 2 mediu: `storage.objects` NÃO tem
-- FK para `auth.users` — a única FK é `bucket_id -> storage.buckets`. Logo não há
-- caminho relacional do titular até os objetos dele, e inventar um por convenção de
-- prefixo aqui produziria um número que PARECE resposta. A enumeração real é
-- `storage.list(prefixo)` paginado, a partir da Edge Function (45-10).
--
-- O mesmo vale para `auth.users`: a remoção é da Auth Admin API, fora de transação.
--
-- Por isso os passos `storage_remove` e `auth_delete_user` vêm no jsonb com
-- `"fonte": "fora_do_banco"` e contagem **NULA** — explicitamente marcados. Um zero
-- ali seria lido como "não há currículo a apagar", e o recibo prometeria ao titular
-- exatamente o apagamento que ninguém executou.
--
-- ⚠ Corolário medido da SONDA 2, que redefine o ERASE-03: a ordem
-- `Storage -> Postgres -> Auth` **NÃO é imposta pela plataforma**. `REQUIREMENTS.md:25`
-- afirma que "o Supabase recusa deletar usuário que possua objetos no Storage" e
-- isso é FACTUALMENTE FALSO — não existe constraint alguma ligando objeto a dono.
-- A ordem é disciplina que o motor impõe a si mesmo, e o modo de falha é
-- SILENCIOSO: uma ordem errada não levanta erro, apenas deixa o blob órfão para
-- sempre.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.plano_exclusao_titular(uuid) — o inventário executável
-- ---------------------------------------------------------------------------
-- `STABLE` porque só lê; `SECURITY DEFINER` porque precisa atravessar a RLS de uma
-- dúzia de tabelas para contar o que existe; `SET search_path = ''` endurece o
-- DEFINER (convenção do projeto), e por isso TODA referência é qualificada.
--
-- Delimitador NOMEADO — não é estilo: é o que torna o corpo extraível para o
-- `md5(prosrc)` que a asserção C3 do smoke pina.
--
-- ⚠ O TOKEN DO DELIMITADOR NÃO APARECE EM PROSA NESTE ARQUIVO, E A OMISSÃO É
-- DELIBERADA. A receita de extração registrada no smoke (§PROVENIENCIA) é um
-- `indexOf` ingênuo do par de cifrões: ela pega a PRIMEIRA ocorrência do token. Uma
-- menção em comentário antes da função faria a receita extrair o comentário em vez
-- do corpo, e o 45-11 pinaria o md5 de um trecho de prosa — um pin que nunca
-- casaria com `prosrc` e que gastaria a única divergência autorizada da asserção C3.
CREATE OR REPLACE FUNCTION public.plano_exclusao_titular(p_candidato_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $plano_exclusao_titular$
DECLARE
  v_uid     uuid := auth.uid();
  v_role    text := (select auth.jwt() #>> '{app_metadata,role}');
  v_user_id uuid;
  v_existe  boolean;
  v_anon    boolean;
  v_email   text;
  v_nasc    date;
  -- ── CR-05 (plano 45-13): a enumeração dos bloqueadores do hard delete ──────
  v_bloq    jsonb := '[]'::jsonb;
  v_tem     boolean;
  r_fk      record;
  /**
   * ⚠⚠ O CONTRATO ENTRE AS DUAS FUNÇÕES DO MOTOR, E ELE VIVE AQUI, EM UM LUGAR SÓ.
   *
   * Esta é a lista das `(schema.tabela.coluna)` que `anonimizar_candidato`
   * COMPROVADAMENTE severa dentro da transação do tombstone. Ela é subtraída da
   * enumeração abaixo — sem isso, a chave de bloqueadores viria não-vazia para todo
   * titular e o motor recusaria TODA execução legítima.
   *
   * ⚠ A ASSIMETRIA É O QUE FECHA O RESÍDUO INDEFINIDAMENTE, e é deliberada:
   *   · quem acrescentar uma severação em `anonimizar_candidato` acrescenta aqui;
   *   · quem acrescentar uma FK NOVA ao schema **não precisa fazer nada** — ela aparece
   *     sozinha como bloqueador, e o motor recusa ANTES do passo 1. O custo de esquecer
   *     é uma recusa barata, nunca um currículo destruído com o 23503 no passo 3.
   *
   * ⚠ `public.decisao_final.por_usuario` **NÃO ENTRA AQUI, E A OMISSÃO É A DECISÃO.**
   * Ela é `NOT NULL` e aponta para o RECRUTADOR que decidiu; severá-la destruiria a
   * prova de que houve avaliação humana (RNF-07a / LGPD Art. 7º, VI). Numa conta
   * híbrida candidato+RH ela é um bloqueador LEGÍTIMO, e o desfecho certo é a recusa
   * antes da primeira mutação — com o nome da tabela e da coluna no plano, para que
   * quem for resolver saiba o que está olhando. Quem vier "consertar" isto severando a
   * coluna está trocando um pedido que para por uma prova que não volta.
   */
  v_severadas text[] := ARRAY[
    'public.candidatos.user_id',
    'public.candidatos.created_by',
    'public.candidatos.updated_by',
    'public.candidaturas.created_by',
    'public.candidaturas.updated_by',
    'public.historico_candidatura.ator',
    'public.logs_acesso.user_id',
    'public.autorizacoes.user_id',
    'public.preferencias_notificacoes.created_by',
    'public.preferencias_notificacoes.updated_by'
  ];
BEGIN
  -- ── GUARD, DUAS METADES, E A SEGUNDA É A QUE FECHA O DEFEITO SISTÊMICO ─────
  -- (a) chamador SEM claim nenhuma é recusado EXPLICITAMENTE. Toda função DEFINER
  --     nova neste projeto NASCE executável por `anon` (o `pg_default_acl` de
  --     `public` concede EXECUTE como grant DIRETO E NOMEADO), e o `REVOKE` abaixo
  --     é a outra metade — mas um guard que dependesse só do ACL seria um controle
  --     confiado a uma configuração de schema que ninguém relê.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao le o plano de exclusao de ninguem'
      USING ERRCODE = '42501';
  END IF;

  -- A LEITURA VEM ANTES DA METADE (b) porque a metade (b) precisa do DONO. Ela é a
  -- mesma leitura de sempre — não há uma segunda consulta — apenas movida para cima.
  SELECT true, c.user_id, c.email, c.data_nascimento
    INTO v_existe, v_user_id, v_email, v_nasc
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  -- ⚠ CR-06 (plano 45-13), o MESMO predicado do tombstone e pelo mesmo motivo: o
  -- reconhecimento é IGUALDADE com a sentinela derivada do id desta linha, mais o cinto
  -- de `user_id` severado e `data_nascimento` na sentinela de 1900 — nunca um padrão
  -- sobre `email`, que é escrita pelo usuário no cadastro. Aqui a chave é informativa
  -- (`ja_anonimizado`), mas ela é EXATAMENTE a que o 45-11 lê antes do dry-run para
  -- saber qual das duas terminações esperar (WR-05): um `true` falso faria o gate medir
  -- um retorno normal e registrar evidência ambígua.
  v_anon := (v_email = 'anonimizado+' || p_candidato_id::text || '@invalido.local'
             AND v_user_id IS NULL
             AND v_nasc = DATE '1900-01-01');

  -- (b) TRÊS comparações, todas por `IS DISTINCT FROM` e NUNCA por `NOT IN`: com um
  --     dos lados NULL o `NOT IN` avalia NULL, o `IF` NÃO é tomado, e o guard FALHA
  --     ABERTO exatamente para o chamador mais suspeito, que é `anon` (defeito REAL
  --     medido na 42-06). A forma NULL-safe falha FECHADA por construção, não por
  --     lembrança — e com `p_candidato_id` inexistente ou já severado o dono resolve
  --     NULL, `NULL IS DISTINCT FROM <uid>` é TRUE, e a função recusa.
  --
  -- ⚠ O TITULAR ENTRA AQUI, E A RAZÃO É DATÁVEL. O plano 45-07 desenhou esta função
  --     como função de OPERADOR (`rh`/`administrador`, `GRANT` só a `service_role`);
  --     o 45-10 — escrito depois — a cabeou dentro do caminho de execução **do
  --     próprio titular**, que é quem clica em "apagar meus dados" e cujo papel de
  --     aplicação é `candidato`. As duas metades estavam certas isoladamente; a junta
  --     não estava, e o desfecho era `42501` na metade (b) mesmo com as claims
  --     chegando. O conserto é ESTENDER o guard para reconhecer o chamador que o
  --     desenho de fato tem — nunca afrouxar a metade (a), que continua recusando
  --     quem não tem sessão (`DI-45-07-01`, saída recusada; decisão do operador de
  --     2026-08-05).
  IF v_role IS DISTINCT FROM 'rh'
     AND v_role IS DISTINCT FROM 'administrador'
     AND v_user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: o plano de exclusao so pode ser lido por rh, por administrador ou pelo proprio titular daquele candidato'
      USING ERRCODE = '42501';
  END IF;

  -- Titular inexistente NÃO é erro: é um plano legítimo cujas contagens são todas
  -- zero. Levantar aqui obrigaria o chamador a distinguir "não achei" de "falhou",
  -- e a Edge Function do 45-10 precisa exatamente do oposto — de um plano que ela
  -- possa mostrar ao operador sem ramificar.
  v_existe := coalesce(v_existe, false);

  -- ══ CR-05 · OS BLOQUEADORES DO HARD DELETE, ENUMERADOS DO CATÁLOGO ═════════
  -- Até o 45-12, este arquivo AFIRMAVA em dois lugares — no jsonb devolvido ao chamador
  -- e no `COMMENT` que vai para o catálogo vivo — que o motor tratava a violação de FK
  -- por classe. Uma varredura do repositório inteiro não encontrava leitura de SQLSTATE
  -- de violação de FK em migration alguma nem na Edge Function: era uma garantia que
  -- era dead code, vivendo num texto que a próxima pessoa lê como fato medido (o padrão
  -- P39/CR-02 repetido). Agora o plano ENUMERA em vez de afirmar.
  --
  -- ⚠ O QUE ISSO COMPRA, em uma linha: uma verificação ANTES da primeira mutação
  -- transforma o 23503 de «desfecho esperado» em «recusa barata». É a única forma de
  -- ele não custar um currículo — sem PITR e com o Storage fora de todo backup, um
  -- 23503 no passo 3 deixa o CV destruído e a pessoa não apagada, sem retomada.
  --
  -- ⚠ SEGURANÇA DO SQL DINÂMICO: o `user_id` vai por PARÂMETRO (`USING`), nunca
  -- interpolado no texto do comando; os identificadores vão por `%I`, nunca por
  -- concatenação crua. Esta função é `SECURITY DEFINER` — aqui isso não é estilo.
  -- ⚠ E ela continua `STABLE`: `EXECUTE` de um `SELECT` não escreve nada.
  IF v_user_id IS NOT NULL THEN
    FOR r_fk IN
      SELECT n.nspname AS esquema, cl.relname AS tabela, a.attname AS coluna
        FROM pg_constraint c
        JOIN pg_class cl     ON cl.oid = c.conrelid
        JOIN pg_namespace n  ON n.oid  = cl.relnamespace
        JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
        JOIN pg_attribute a  ON a.attrelid = c.conrelid AND a.attnum = k.attnum
       WHERE c.contype     = 'f'
         AND c.confrelid   = 'auth.users'::regclass
         -- 'a' = NO ACTION, 'r' = RESTRICT: as duas BLOQUEIAM o delete. 'c'/'n'/'d'
         -- (CASCADE / SET NULL / SET DEFAULT) resolvem sozinhas e não são bloqueio.
         AND c.confdeltype IN ('a', 'r')
         AND array_length(c.conkey, 1) = 1
         AND cl.relkind IN ('r', 'p')
         AND NOT a.attisdropped
         AND (n.nspname || '.' || cl.relname || '.' || a.attname) <> ALL (v_severadas)
       ORDER BY n.nspname, cl.relname, a.attname
    LOOP
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I t WHERE t.%I = $1)',
                     r_fk.esquema, r_fk.tabela, r_fk.coluna)
        INTO v_tem
        USING v_user_id;

      IF v_tem THEN
        v_bloq := v_bloq || jsonb_build_object(
          'tabela', r_fk.esquema || '.' || r_fk.tabela,
          'coluna', r_fk.coluna
        );
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'candidato_id',      p_candidato_id,
    'candidato_existe',  v_existe,
    'ja_anonimizado',    coalesce(v_anon, false),
    'user_id_presente',  (v_user_id IS NOT NULL),
    'gerado_em',         now(),

    -- ── storage_remove — FORA DO BANCO, e dito com todas as letras ───────────
    'storage_remove', jsonb_build_object(
      'fonte',     'fora_do_banco',
      'objetos',   NULL,
      'motivo',    'storage.objects NAO tem FK para auth.users (SONDA 2): nao ha caminho relacional do titular ate os objetos dele. A enumeracao e storage.list(prefixo) paginado, na Edge Function do 45-10. Um zero aqui seria lido como "nao ha curriculo a apagar" e o recibo prometeria o apagamento que ninguem executou'
    ),

    -- ── tombstone_candidato ─────────────────────────────────────────────────
    'tombstone_candidato', jsonb_build_object(
      'candidatos',            (CASE WHEN v_existe THEN 1 ELSE 0 END),
      'candidaturas_vinculadas',
        (SELECT count(*) FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id),
      'devolutivas_candidato',
        (SELECT count(*) FROM public.devolutivas_candidato d WHERE d.candidato_id = v_user_id),
      'disponibilidade',
        (SELECT count(*) FROM public.disponibilidade x WHERE x.candidato_id = p_candidato_id),
      'solicitacoes_dados',
        (SELECT count(*) FROM public.solicitacoes_dados s WHERE s.candidato_id = p_candidato_id)
    ),

    -- ── tombstone_decisao_final ─────────────────────────────────────────────
    -- ⚠ As duas colunas são PRESERVADAS ANONIMIZADAS (D-45-02 / D-45-03), nunca
    -- apagadas: o texto sobrevive como prova de não-discriminação (Art. 7º, VI /
    -- RNF-07a) e o vínculo com o titular é o que morre.
    'tombstone_decisao_final', jsonb_build_object(
      'decisao_final',
        (SELECT count(*) FROM public.decisao_final d
          JOIN public.candidaturas c ON c.id = d.candidatura_id
         WHERE c.candidato_id = p_candidato_id),
      'decisao_final_historico',
        (SELECT count(*) FROM public.decisao_final_historico h
          JOIN public.candidaturas c ON c.id = h.candidatura_id
         WHERE c.candidato_id = p_candidato_id),
      'nota', 'preservar anonimizada (D-45-02/D-45-03): UPDATE in-place. Zero linha apagada, zero valor nulo — as duas colunas de justificativa sao NOT NULL'
    ),

    -- ── severar_user_id ─────────────────────────────────────────────────────
    -- ⚠ A SONDA 6 (§6a) REFUTOU a lista fixa de "sete colunas a severar": as vinte
    -- FKs NO ACTION para auth.users medem ZERO linha para os 21 titulares puros,
    -- porque quem move etapa e quem decide é o RH. O bloqueio real do deleteUser é
    -- TRANSITIVO (§6b) e a S1 o resolve mantendo `candidatos` fora do cascade. As
    -- contagens abaixo são por CONTA, medidas na hora — nunca uma lista fixa.
    'severar_user_id', jsonb_build_object(
      'candidatos_user_id',    (CASE WHEN v_user_id IS NOT NULL THEN 1 ELSE 0 END),
      'candidatos_created_by',
        (SELECT count(*) FROM public.candidatos c
          WHERE c.id = p_candidato_id AND v_user_id IS NOT NULL AND c.created_by = v_user_id),
      'candidatos_updated_by',
        (SELECT count(*) FROM public.candidatos c
          WHERE c.id = p_candidato_id AND v_user_id IS NOT NULL AND c.updated_by = v_user_id),
      'historico_candidatura_ator',
        (SELECT count(*) FROM public.historico_candidatura h
          WHERE v_user_id IS NOT NULL AND h.ator = v_user_id),
      'candidaturas_autoria',
        (SELECT count(*) FROM public.candidaturas c
          WHERE c.candidato_id = p_candidato_id AND v_user_id IS NOT NULL
            AND (c.created_by = v_user_id OR c.updated_by = v_user_id)),
      'preferencias_notificacoes',
        (SELECT count(*) FROM public.preferencias_notificacoes p
          WHERE v_user_id IS NOT NULL
            AND (p.created_by = v_user_id OR p.updated_by = v_user_id)),
      'nota', 'as contagens sao por CONTA, medidas na hora. Os bloqueadores do deleteUser nao sao afirmados aqui: eles sao ENUMERADOS do catalogo na chave bloqueadores_deleteuser, e quem recusa antes do passo 1 e a Edge Function. As duas contas reais da SONDA 6 deram bloqueadores DIFERENTES (historico_candidatura.candidatura_id no titular puro, alcancado transitivamente; preferencias_notificacoes.created_by na conta hibrida candidato+RH) — e o segundo passou a ser severado na mesma transacao do tombstone'
    ),

    -- ── bloqueadores_deleteuser (CR-05) ─────────────────────────────────────
    -- ⚠ ENUMERADO DO CATALOGO, NUNCA AFIRMADO. Lista das FKs para `auth.users` cujo
    -- `ON DELETE` BLOQUEIA (`NO ACTION`/`RESTRICT`) e que TEM linha viva apontando para
    -- este titular, MENOS as `(tabela, coluna)` que o tombstone comprovadamente severa
    -- (a lista `v_severadas`, declarada nominalmente no corpo).
    -- ⚠ VAZIA É O ESTADO ESPERADO de um titular puro. Não-vazia significa que o
    -- `deleteUser` do passo 3 falharia com 23503 — e a Edge Function recusa ANTES do
    -- passo 1, quando isso ainda não custou nada. `decisao_final.por_usuario` aparece
    -- aqui de propósito nas contas híbridas: ela é `NOT NULL`, aponta ao recrutador que
    -- decidiu, e severá-la destruiria a prova de não-discriminação (RNF-07a).
    'bloqueadores_deleteuser', v_bloq,

    -- ── severar_fks_set_null (ERASE-09) ─────────────────────────────────────
    -- ⚠ D8, medido na SONDA 4b: `autorizacoes` tem DUAS FKs. A que é SET NULL
    -- aponta a `auth.users` (`user_id`); a que aponta a `candidatos`
    -- (`candidato_id`) é CASCADE. O ERASE-09 trata as duas como se fossem uma.
    'severar_fks_set_null', jsonb_build_object(
      'ai_call_logs',
        (SELECT count(*) FROM public.ai_call_logs l WHERE l.candidato_id = p_candidato_id),
      'candidate_ai_decisions',
        (SELECT count(*) FROM public.candidate_ai_decisions x WHERE x.candidato_id = p_candidato_id),
      'logs_acesso',
        (SELECT count(*) FROM public.logs_acesso g WHERE v_user_id IS NOT NULL AND g.user_id = v_user_id),
      'recruiter_alerts',
        (SELECT count(*) FROM public.recruiter_alerts r WHERE r.candidato_id = p_candidato_id),
      'autorizacoes',
        (SELECT count(*) FROM public.autorizacoes a
          WHERE a.candidato_id = p_candidato_id
             OR (v_user_id IS NOT NULL AND a.user_id = v_user_id)),
      'nota', 'candidate_ai_decisions declara candidato_id E vaga_id NOT NULL com ON DELETE SET NULL — clausulas INEXEQUIVEIS (achado M2 do smoke). Enquanto as colunas forem NOT NULL o ponteiro NAO e severavel e o motor desidentifica o CONTEUDO; a escolha esta registrada no COMMENT de anonimizar_candidato'
    ),

    -- ── scrub_ledger_email ──────────────────────────────────────────────────
    'scrub_ledger_email', jsonb_build_object(
      'notificacoes_enviadas',
        (SELECT count(*) FROM public.notificacoes_enviadas n WHERE n.candidato_id = p_candidato_id),
      'nota', 'destinatario_email E destinatario_original sao ambos NOT NULL — o endereco e gravado DUAS vezes por linha, e NULL abortaria a transacao de anonimizacao inteira. dedupe_key e UNIQUE e precisa ser re-namespaceada, senao um recadastro futuro colide, o claim ON CONFLICT DO NOTHING RETURNING id volta VAZIO, e o e-mail legitimo nunca e enviado sem erro em lugar nenhum'
    ),

    -- ── auth_delete_user — FORA DO BANCO ────────────────────────────────────
    'auth_delete_user', jsonb_build_object(
      'fonte',   'fora_do_banco',
      'usuario', NULL,
      'motivo',  'a remocao e da Auth Admin API (GoTrue), fora de transacao do Postgres, com shouldSoftDelete = false (D-45-09). Este plano so pode dizer se HA user_id a remover — ver user_id_presente'
    )
  );
END;
$plano_exclusao_titular$;


-- ---------------------------------------------------------------------------
-- 2 · ACL — REVOKE nominal e só então o GRANT mínimo
-- ---------------------------------------------------------------------------
-- ⚠ NOMEAR `anon` É OBRIGATÓRIO, e não é redundância defensiva. Medido na P42-06:
-- o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a `anon` e a
-- `authenticated` como grants DIRETOS E NOMEADOS em todo `CREATE FUNCTION`.
-- `REVOKE ... FROM PUBLIC` sozinho remove um grant de PUBLIC que NUNCA EXISTIU e
-- deixa `anon=X` de pé. Hoje há 61 funções DEFINER em `public` com EXECUTE para
-- `anon`, 39 chamáveis via PostgREST
-- (`docs/compliance/anon-execute-definer-audit.md:11-18`).
--
-- Esta função devolve CONTAGENS de PII por pessoa. Uma tela capaz de enumerá-las é
-- superfície de exfiltração construída sem necessidade — então a proibição vive
-- AQUI, no ACL, e não na camada de apresentação.
REVOKE ALL ON FUNCTION public.plano_exclusao_titular(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plano_exclusao_titular(uuid) TO service_role;


-- ---------------------------------------------------------------------------
-- 3 · Auto-verificação: EXECUTA o caminho FELIZ
-- ---------------------------------------------------------------------------
-- Molde de `20260803000001:116-150`. Um gate que não morde não é um gate — e
-- aquela migration existe justamente porque o gate anterior media a RECUSA e
-- chamava aquilo de cobertura, deixando um 42804 sobreviver a um smoke 10/10.
--
-- Aqui a exigência é de COMPLETUDE em duas camadas: a função tem de EXECUTAR, e o
-- jsonb devolvido tem de trazer UMA CHAVE POR PASSO de `PASSOS_MOTOR`
-- (`supabase/functions/_shared/reciboExclusao.ts:23-31`). Um plano que não cobre um
-- passo do recibo é um recibo que promete o que ninguém executa.
--
-- ⚠ Não há subtransação aqui, e a ausência é a decisão: a função é `STABLE` e não
-- escreve nada. O envelope de rollback da SONDA 6 é obrigatório para o tombstone
-- (20260805000006), que ESCREVE — não para uma leitura.
DO $verifica_plano_exclusao_titular$
DECLARE
  v_admin   uuid;
  v_cand    uuid;
  v_dono    uuid;
  v_plano   jsonb;
  v_passo   text;
  v_faltando text := '';
  v_lev     boolean := false;
  v_state   text;
  -- ⚠ 45-13 · CR-05 — a enumeração de bloqueadores.
  r          record;
  v_vazio    boolean := false;
  v_checados int := 0;
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P45-PLANO: nenhum administrador vivo em usuarios_rh — o caminho FELIZ nao pode ser exercitado sem ator real, e verificar so a recusa foi EXATAMENTE o defeito que a 20260803000001 corrigiu';
  END IF;

  -- ⚠ O `user_id` NÃO-NULO é requisito, não conveniência: sem ele o caso do TITULAR
  -- ACEITO (abaixo) não teria quem impersonar, e o bloco provaria só metade do guard.
  SELECT c.id, c.user_id INTO v_cand, v_dono
    FROM public.candidatos c
   WHERE c.user_id IS NOT NULL
   ORDER BY c.created_at
   LIMIT 1;

  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'P45-PLANO: nenhum candidato vivo COM user_id — o plano nao teria sobre quem ser computado (um jsonb de zeros passaria por VACUIDADE), e o ramo de titularidade do guard nao teria titular a exercitar';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text,
                      'app_metadata', json_build_object('role', 'administrador'))::text, true);

  v_plano := public.plano_exclusao_titular(v_cand);

  PERFORM set_config('request.jwt.claims', '', true);

  IF v_plano IS NULL THEN
    RAISE EXCEPTION 'P45-PLANO: a funcao devolveu NULL — ela NAO COMPLETOU, e "nao lancou" nao e a mesma coisa que "completou"';
  END IF;

  -- UMA CHAVE POR PASSO DO RECIBO. Os sete, inclusive os dois que vêm de fora do
  -- banco — que precisam existir no jsonb JUSTAMENTE para carregar a marca de que
  -- vêm de fora.
  FOREACH v_passo IN ARRAY ARRAY['storage_remove', 'tombstone_candidato',
                                 'tombstone_decisao_final', 'severar_user_id',
                                 'severar_fks_set_null', 'scrub_ledger_email',
                                 'auth_delete_user', 'bloqueadores_deleteuser']
  LOOP
    IF NOT (v_plano ? v_passo) THEN
      v_faltando := v_faltando || v_passo || ' ';
    END IF;
  END LOOP;

  IF v_faltando <> '' THEN
    RAISE EXCEPTION 'P45-PLANO: chave(s) obrigatoria(s) ausente(s) no plano: %. As sete primeiras sao PASSOS_MOTOR (reciboExclusao.ts:23-31), o vocabulario que o recibo promete ao titular — um passo sem chave e uma promessa que nenhuma query sustenta. bloqueadores_deleteuser e a oitava (CR-05): sem ela a Edge Function nao tem o que ler antes do passo 1, e o 23503 volta a ser um desfecho que custa um curriculo', v_faltando;
  END IF;

  -- ── CR-05 · A ENUMERAÇÃO DE BLOQUEADORES TEM DE SER UTILIZÁVEL ─────────────
  -- A forma primeiro: `bloqueadores_deleteuser` é um ARRAY jsonb, e cada item nomeia
  -- `tabela` e `coluna`. Um objeto ou uma string ali quebraria a leitura da EF em
  -- silêncio, no ponto em que ela decide se recusa a execução.
  IF jsonb_typeof(v_plano -> 'bloqueadores_deleteuser') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'P45-PLANO: bloqueadores_deleteuser nao e um array jsonb (veio %). A Edge Function LE esta chave para recusar a execucao ANTES do passo 1; um formato inesperado ali vira uma recusa que nao acontece', coalesce(jsonb_typeof(v_plano -> 'bloqueadores_deleteuser'), '<ausente>');
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_plano -> 'bloqueadores_deleteuser') x
     WHERE NOT (x ? 'tabela') OR NOT (x ? 'coluna')
  ) THEN
    RAISE EXCEPTION 'P45-PLANO: ha item em bloqueadores_deleteuser sem tabela e/ou coluna. O valor do item e justamente dizer a quem for resolver O QUE esta bloqueando: uma lista nao-vazia sem nome e uma recusa sem diagnostico';
  END IF;

  -- ⚠ E AGORA A METADE QUE IMPEDE A ENUMERAÇÃO DE SER SEMPRE-VERMELHA. Uma lista que
  -- viesse não-vazia para todo mundo faria o motor recusar TODA execução legítima, e
  -- ninguém descobriria antes do primeiro pedido real — a subtração das `(tabela,
  -- coluna)` que o tombstone severa é o que a torna utilizável, e é ela que esta
  -- asserção mede.
  --
  -- ⚠ A FORMA DA ASSERÇÃO É «PELO MENOS UM TITULAR VIVO VEM COM A LISTA VAZIA», e não
  -- «este titular vem vazio», por uma razão medida: a SONDA 6 encontrou em PROD uma
  -- conta HÍBRIDA candidato+RH cuja `decisao_final.por_usuario` é um bloqueador
  -- LEGÍTIMO — para ela, não-vazio é a resposta CERTA. Exigir vazio de uma linha
  -- arbitrária reprovaria a implementação correta se o sorteio caísse nela; exigir que
  -- NENHUM titular puro venha vazio é exatamente o defeito que se quer pegar.
  -- ⚠ As claims voltam para o `administrador` aqui: o guard da metade (a) recusa
  -- chamador SEM sessão, e este laço CHAMA a função — sem a impersonação ele receberia
  -- `42501` e abortaria o apply por um motivo que não é o que se está medindo.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text,
                      'app_metadata', json_build_object('role', 'administrador'))::text, true);

  v_vazio := false;
  FOR r IN
    SELECT c.id FROM public.candidatos c
     WHERE c.user_id IS NOT NULL
     ORDER BY c.created_at
     LIMIT 10
  LOOP
    IF jsonb_array_length(public.plano_exclusao_titular(r.id) -> 'bloqueadores_deleteuser') = 0 THEN
      v_vazio := true;
      EXIT;
    END IF;
    v_checados := v_checados + 1;
  END LOOP;

  PERFORM set_config('request.jwt.claims', '', true);

  IF NOT v_vazio THEN
    RAISE EXCEPTION 'P45-PLANO: NENHUM dos % titulares vivos examinados veio com bloqueadores_deleteuser VAZIA. Ou a enumeracao esta devolvendo FK que o tombstone de fato severa (a lista v_severadas do corpo esta desatualizada em relacao a anonimizar_candidato), ou o predicado de linha viva esta errado. O efeito e o pior possivel: o motor recusaria TODA execucao legitima antes do passo 1, e isso so apareceria no primeiro pedido real de um titular. ⚠ Antes de "consertar" removendo a chave: ela e o que impede o 23503 de acontecer DEPOIS de o curriculo ter sido apagado', v_checados;
  END IF;

  -- Os dois passos de fora do banco têm de estar MARCADOS como tal. Um zero
  -- silencioso ali seria pior que a ausência da chave: pareceria resposta.
  IF (v_plano #>> '{storage_remove,fonte}') IS DISTINCT FROM 'fora_do_banco'
     OR (v_plano #>> '{auth_delete_user,fonte}') IS DISTINCT FROM 'fora_do_banco' THEN
    RAISE EXCEPTION 'P45-PLANO: storage_remove e auth_delete_user precisam vir marcados com fonte = fora_do_banco. A SONDA 2 mediu que storage.objects NAO tem FK para auth.users: nao ha como conta-los por SQL, e um zero seria lido como "nao ha curriculo a apagar"';
  END IF;

  -- ───────────────────────────────────────────────────────────────────────────
  -- (ii) O RAMO DE TITULARIDADE, NAS DUAS DIREÇÕES — e as duas são obrigatórias.
  --      Sem o caso RECUSADO, o caso ACEITO não prova nada: um guard que aceitasse
  --      todo mundo passaria no primeiro. A impersonação é por claims, no mesmo
  --      idioma que o caso do `administrador` acima já usa — o guard LÊ a claim,
  --      então é a claim que tem de ser exercitada.
  -- ───────────────────────────────────────────────────────────────────────────

  -- (ii.a) O DONO é ACEITO, mesmo com papel de aplicação `candidato`.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_dono::text,
                      'app_metadata', json_build_object('role', 'candidato'))::text, true);

  v_plano := public.plano_exclusao_titular(v_cand);

  PERFORM set_config('request.jwt.claims', '', true);

  IF v_plano IS NULL THEN
    RAISE EXCEPTION 'P45-PLANO: o proprio titular (papel candidato, dono do candidato) NAO obteve o plano. A metade (b) do guard precisa aceitar rh, administrador OU o dono de p_candidato_id: o 45-07 desenhou esta funcao como funcao de operador e o 45-10 a cabeou dentro do caminho de execucao do proprio titular';
  END IF;

  -- (ii.b) Um `candidato` que NAO e o dono continua RECUSADO com 42501.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid()::text,
                      'app_metadata', json_build_object('role', 'candidato'))::text, true);

  BEGIN
    PERFORM public.plano_exclusao_titular(v_cand);
    v_lev := false;
  EXCEPTION
    WHEN OTHERS THEN
      v_lev   := true;
      v_state := SQLSTATE;
  END;

  PERFORM set_config('request.jwt.claims', '', true);

  IF NOT v_lev OR v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P45-PLANO: um candidato que NAO e o dono leu o plano de outra pessoa (levantou=%, sqlstate=%). O ramo de titularidade tem de ser por IS DISTINCT FROM e NUNCA por NOT IN — com um dos lados NULL o NOT IN avalia NULL, o IF nao e tomado, e o guard falha ABERTO justamente para o chamador mais suspeito (defeito REAL medido na 42-06)', v_lev, coalesce(v_state, '<nulo>');
  END IF;

  RAISE NOTICE 'P45-PLANO OK: plano_exclusao_titular COMPLETOU e devolveu uma chave para cada um dos 7 passos de PASSOS_MOTOR, com storage_remove e auth_delete_user marcados como fora_do_banco; o proprio titular foi ACEITO e um candidato que nao e o dono foi RECUSADO com 42501. ⚠ 45-13: bloqueadores_deleteuser existe, e um array jsonb, cada item nomeia tabela e coluna, e pelo menos um titular vivo veio com a lista VAZIA — a subtracao das colunas que o tombstone severa esta em dia, e o motor nao recusa execucao legitima (CR-05)';
END
$verifica_plano_exclusao_titular$;


-- ---------------------------------------------------------------------------
-- 4 · COMMENT — depois do bloco anônimo, ordem herdada do molde
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION public.plano_exclusao_titular(uuid) IS
  'Phase 45 / ERASE-02 + ERASE-09 + ERASE-10: A UNICA DEFINICAO do que a exclusao de um titular '
  'faria. Devolve jsonb com uma chave por passo de PASSOS_MOTOR (supabase/functions/_shared/'
  'reciboExclusao.ts:23-31) e as contagens do que seria afetado. STABLE SECURITY DEFINER com '
  'search_path vazio; delimitador NOMEADO para que md5(prosrc) seja extraivel pelo smoke. '
  '⚠ SE VOCE VEIO ESCREVER O EXECUTOR (o tombstone, ou o passo 0 da Edge Function do 45-10): '
  'CHAME ESTA FUNCAO, NAO COPIE O CORPO. O dry-run e o delete real TEM de sair da mesma expressao; '
  'um dry-run que diverge do predicado e decoracao. Precedente nomeado: P39 CR-02, uma guarda que '
  'era dead code. O smoke supabase/tests/p45_motor_exclusao_smoke.sql fecha isso por DOIS lados na '
  'assercao C3 — pina o md5(prosrc) desta funcao E exige que pg_get_functiondef de '
  'anonimizar_candidato CONTENHA a chamada a ela. Uma segunda copia do predicado reprova o gate. '
  'Com so o md5, alguem deixaria esta funcao intacta e reescreveria o tombstone com um predicado '
  'proprio "mais rapido": o md5 seguiria verde e o dry-run voltaria a mentir. '
  '⚠ E ISSO IMPORTA MAIS AQUI DO QUE IMPORTAVA NA P43: com o PITR desligado (D-45-10) e o backup '
  'de 7 dias excluindo Storage inteiramente, o dry-run nao e processo — e a UNICA rede desta fase. '
  '⚠ O QUE ESTA FUNCAO NAO ENUMERA, E POR QUE: Storage e Auth vem com fonte = fora_do_banco e '
  'contagem NULA. A SONDA 2 mediu que storage.objects NAO tem FK para auth.users (a unica FK e '
  'bucket_id -> storage.buckets), entao nao existe caminho relacional do titular ate os objetos '
  'dele e um numero inventado por convencao de prefixo PARECERIA resposta. A enumeracao real e '
  'storage.list(prefixo) paginado, no 45-10. Corolario que redefine o ERASE-03: a ordem '
  'Storage -> Postgres -> Auth NAO e imposta pela plataforma (REQUIREMENTS.md:25 esta factualmente '
  'errado) — e disciplina do motor, e o modo de falha e SILENCIOSO, porque uma ordem errada nao '
  'levanta erro: apenas orfana o blob para sempre, sem PITR e sem backup de Storage. '
  '⚠ AS CONTAGENS SAO POR CONTA, MEDIDAS NA HORA, NUNCA POR LISTA FIXA. A SONDA 6 (§6a) refutou a '
  'inferencia de "sete colunas a severar": as vinte FKs NO ACTION para auth.users tem ZERO linha '
  'para os 21 titulares puros, porque quem move etapa e quem decide e o RH. E o bloqueador do '
  'deleteUser foi DIFERENTE em duas contas reais (historico_candidatura.candidatura_id no titular '
  'puro, alcancado transitivamente; preferencias_notificacoes.created_by na conta hibrida '
  'candidato+RH). '
  '⚠⚠ bloqueadores_deleteuser (CR-05, plano 45-13): ESTA FUNCAO ENUMERA OS BLOQUEADORES, EM VEZ DE '
  'AFIRMAR QUE O MOTOR OS TRATA. Ate o 45-12 esta chave e este COMMENT declaravam um tratamento de '
  '23503 por classe que NAO EXISTIA EM CODIGO NENHUM da fase — uma garantia que era dead code, '
  'vivendo num COMMENT que a proxima pessoa le como fato medido (padrao P39/CR-02). O que existe '
  'agora e mecanismo: a chave lista, do catalogo (pg_constraint por confdeltype em a/r), as FKs '
  'para auth.users que BLOQUEIAM o delete e que tem linha viva apontando ao titular, MENOS as '
  '(tabela, coluna) que o tombstone comprovadamente severa — lista declarada nominalmente no corpo, '
  'num lugar so, que e o contrato entre as duas funcoes do motor. A assimetria e deliberada: quem '
  'acrescenta uma severacao la acrescenta aqui, e quem acrescenta uma FK NOVA ao schema nao precisa '
  'fazer nada — ela aparece sozinha como bloqueador e o motor recusa. A Edge Function recusa ANTES '
  'do passo 1 se a lista vier nao-vazia, e e isso que transforma o 23503 de desfecho esperado em '
  'recusa barata: sem PITR e com o Storage fora de todo backup, um 23503 no passo 3 deixa o '
  'curriculo destruido e a pessoa nao apagada. '
  '⚠ decisao_final.por_usuario NAO esta entre as severadas, e a omissao e a DECISAO: e NOT NULL, '
  'aponta ao recrutador que decidiu, e severa-la destruiria a prova de avaliacao humana (RNF-07a / '
  'Art. 7o, VI). Numa conta hibrida candidato+RH ela e um bloqueador LEGITIMO, e o desfecho certo e '
  'a recusa antes da primeira mutacao — com o nome da tabela e da coluna no plano. '
  '⚠ O SQL dinamico da enumeracao passa o user_id por PARAMETRO e os identificadores por %I: '
  'interpolar valor no texto do comando numa funcao SECURITY DEFINER nao e estilo. '
  'GUARD NULL-SAFE em duas metades: (a) recusa 42501 o chamador SEM CLAIM NENHUMA; (b) recusa quem '
  'nao e rh, nao e administrador E nao e o dono de p_candidato_id. As TRES comparacoes da metade '
  '(b) sao por IS DISTINCT FROM e nunca por NOT IN (que avalia NULL, nao toma o IF, e falha ABERTO '
  'para anon — defeito real medido na 42-06); com o candidato inexistente ou ja severado o dono '
  'resolve NULL, NULL IS DISTINCT FROM <uid> e TRUE, e a funcao recusa. DEFINER bypassa RLS, entao '
  'este guard e o unico controle do corpo. '
  '⚠ POR QUE O TITULAR ESTA ENTRE OS CHAMADORES ACEITOS, E A RAZAO E DATAVEL (45-12): o plano '
  '45-07 desenhou esta funcao como funcao de OPERADOR (rh/administrador, GRANT so a service_role) '
  'e o plano 45-10 — escrito depois — a cabeou dentro do caminho de execucao DO PROPRIO TITULAR, '
  'que e quem clica em "apagar meus dados" e cujo papel de aplicacao e candidato. As duas metades '
  'estavam certas isoladamente; a junta nao estava, e o desfecho era 42501 na metade (b) mesmo com '
  'as claims chegando. O conserto ESTENDE o guard, nunca afrouxa a metade (a). '
  '⚠ OBRIGACAO DO CHAMADOR: o guard le a CLAIM, nao o papel do banco. Um cliente service_role sem '
  'Authorization de usuario tem auth.uid() NULO e recebe 42501 — passar as claims e obrigacao '
  'declarada da Edge Function, e a assercao C2 do smoke a exige das cinco funcoes da fase. '
  'ACL: REVOKE ALL de PUBLIC e anon NOMINALMENTE (pg_default_acl concede a anon como grant DIRETO, '
  'entao revogar so de PUBLIC nao remove nada). Alem do GRANT a service_role, a migration '
  '20260805000009 (plano 45-12) concede EXECUTE a authenticated: o PostgREST deriva o PAPEL do '
  'MESMO JWT que carrega as claims, entao o client da Edge Function que repassa o Authorization do '
  'titular chega como authenticated e nao como service_role. O precedente e a Phase 44 — ACL abre '
  'a porta ao papel, o guard do corpo decide quem passa.';
