-- =============================================================================
-- Phase 47 / Plano 47-03 Task 1 — CONSOL-03
-- A ADOÇÃO de `public.data_deletion_log`: o catálogo para de prometer uma função
-- que nunca existiu, e o rollback da biblioteca de prompts passa a aparecer na
-- trilha de auditoria que alguém de fato consulta.
-- =============================================================================
--
-- Requirement:          CONSOL-03 (SC#3 do ROADMAP · W-2)
-- Decisão de origem:    operador, 2026-08-09 — ADOTAR, não remover
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 47-03, Task 1
--
-- -----------------------------------------------------------------------------
-- (0) A DECISÃO, EM QUATRO LINHAS — e por que ela não é um recuo
-- -----------------------------------------------------------------------------
-- 1. O critério de sucesso do ROADMAP aceita DUAS saídas: "removido **OU** adotado
--    com escritas reais". A tabela JÁ recebe escrita real desde 2026-06-09 — a RPC
--    de rollback da biblioteca de prompts grava nela a cada reversão.
-- 2. A remoção foi MEDIDA (47-RESEARCH §C1.3) e custa ONZE consumidores derivados:
--    dois YAML-fonte de compliance, o catálogo vivo do M4, o gerador do recibo de
--    exclusão, cinco artefatos gerados, o `database.types.ts` e uma string visível
--    ao administrador. Removê-la deixaria onze descrições de um objeto inexistente.
-- 3. O que tornava esta tabela um zumbi NÃO era existir: era o comentário de
--    catálogo prometer uma função de exclusão de titular que a Phase 15 nunca
--    criou e que continua AUSENTE de `pg_proc`. Promessa se corrige — é o que este
--    arquivo faz. É a promessa órfã canônica deste repositório e a entrada nº 1 do
--    registro de promessas do CONSOL-04 (plano 47-09).
-- 4. CONSEQUÊNCIA ESTRUTURAL: adotar mantém a Phase 47 INTEIRAMENTE ADITIVA e
--    ELIMINA o portão destrutivo do M8 desta fase. Isso é resultado de medição, não
--    de conveniência — a adoção é reversível, a remoção não é.
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **NENHUM OBJETO É DESTRUÍDO AQUI.** Nenhuma tabela, nenhuma coluna, nenhum
-- índice, nenhuma policy, nenhuma linha. Um comentário de catálogo é reescrito e
-- uma função é recriada com o corpo anterior PRESERVADO mais um `PERFORM`.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- O plano 47-03 apenas AUTORA este arquivo; **nenhuma wave desta fase mistura
-- escrever uma migration com aplicá-la**.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua
-- própria transação implícita, e o BEGIN/COMMIT externo é o gatilho documentado do
-- SQLSTATE 42601 ("cannot insert multiple commands into a prepared statement")
-- quando há corpo delimitado por cifrões adjacente a `COMMENT`/`GRANT`/`REVOKE` —
-- CLAUDE.md §Migrations + db push.
--
-- ⚠ Higiene deste arquivo: os corpos usam delimitadores NOMEADOS
-- (`fn_rollback` / `verifica_p47_consol03`) e o par de cifrões anônimo não aparece
-- literalmente em lugar nenhum.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. `apply_migration` carimba a PRÓPRIA `version` —
-- um timestamp do instante do apply, não o do nome deste arquivo. Reconciliar logo
-- depois:
--
--   supabase migration repair --status applied 20260809000002
--
-- ou, direto no ledger:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260809000002'
--    WHERE name LIKE '%p47_adotar_data_deletion_log%';
--
-- Sem o reparo o CLI leria este arquivo como NÃO aplicado. (Aqui a reaplicação seria
-- benigna — `COMMENT ON` e `CREATE OR REPLACE` são idempotentes — mas o ledger
-- divergente contamina o diagnóstico de toda migration seguinte.)
--
-- ⚠ FIDELIDADE DO CONTEÚDO. O ledger guarda o SQL literalmente aplicado em
-- `supabase_migrations.schema_migrations.statements text[]`. Conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260809000002';
--
-- -----------------------------------------------------------------------------
-- (2) ORDEM DE APPLY DESTA FASE
-- -----------------------------------------------------------------------------
--   20260809000001 (47-02, já aplicada) → **20260809000002 (este arquivo)** →
--   20260809000003 (CONSENT-05). As duas do 47-03 são INDEPENDENTES entre si — não
--   há dependência de objeto de uma na outra — mas a ordem numérica é a que o
--   `supabase/tests/p47_consol03_consent05_smoke.sql` assume ao provar as duas numa
--   única execução.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- (3) MOVIMENTO 1 — O COMENTÁRIO DE CATÁLOGO PARA DE PROMETER
-- -----------------------------------------------------------------------------
-- O texto anterior (`20260609000001_prompt_library_schema.sql`) dizia que a função
-- de exclusão de titular do Art. 18 estava "deferida à Phase 15". A Phase 15 fechou
-- e a função nunca foi criada: ela continua ausente do catálogo de funções. Um
-- comentário de catálogo que promete executor inexistente é a forma mais duradoura
-- de promessa órfã, porque viaja junto com o objeto e sobrevive a toda refatoração.
--
-- O texto novo diz o que a tabela É, e NOMEIA o motor real de exclusão de titular
-- deste projeto — `public.anonimizar_candidato` (Phase 45, 20260805000006) — para
-- que a próxima pessoa que abrir o catálogo encontre um ponteiro em vez de uma
-- promessa.
--
-- ⚠ O nome da função prometida NÃO aparece neste texto — nem para explicar que ela
-- não existe. Uma oração de contraste ("não é mais a X") reintroduziria a string no
-- catálogo e faria o portão automático desta task casar com a própria explicação do
-- conserto. O fato histórico está registrado ACIMA, em comentário de arquivo, que é
-- onde ele pertence.
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.data_deletion_log IS
  'ADOTADA na Phase 47 sob o CONSOL-03 (decisao do operador, 2026-08-09). '
  'O QUE ELA E: trilha append-only de reversao de versao da biblioteca de prompts. '
  'Cada linha registra um rollback administrativo de prompt de IA, no formato '
  'prompt_rollback:<call_type>:<semver>, com o instante da acao. '
  'O QUE ELA NAO E: ela NAO tem vinculo com titular — quatro colunas, nenhuma FK, '
  'nenhum identificador de candidato — e por isso o pii-inventory.yaml a classifica '
  'como tabela_sem_vinculo_com_titular e ela fica FORA do escopo do recibo de '
  'exclusao (ERASE) e do export do titular (EXPORT-02, telemetria_interna). '
  'ESCRITOR VIVO: public.rollback_to_version, desde 2026-06-09. A partir da Phase 47 '
  'esse escritor audita nos DOIS destinos — esta tabela e public.log_auditoria — na '
  'MESMA transacao, porque uma trilha que nenhuma tela consegue ler nao e trilha. '
  'MOTOR REAL DE EXCLUSAO DE TITULAR: e a RPC de anonimizacao da Phase 45, '
  'public.anonimizar_candidato (20260805000006), acionada pelo pedido de exclusao do '
  'titular. NAO e esta tabela e nunca foi. '
  'HISTORICO, dito uma vez: o texto anterior deste comentario prometia uma funcao de '
  'exclusao de titular deferida a Phase 15 que nunca foi criada e que segue ausente '
  'do catalogo de funcoes. Era a promessa orfa canonica deste repositorio e e a '
  'entrada no 1 do registro de promessas do CONSOL-04 (plano 47-09). Ela fecha aqui.';


-- -----------------------------------------------------------------------------
-- (4) MOVIMENTO 2 — O ESCRITOR PASSA A AUDITAR NOS DOIS DESTINOS
-- -----------------------------------------------------------------------------
-- `CREATE OR REPLACE` com a MESMA assinatura. O corpo vivo é preservado por
-- inteiro: guard de papel, validação do alvo, os dois `UPDATE` na ordem
-- desativa-depois-reativa (exigida pela constraint EXCLUDE `unique_active_per_type`,
-- Pitfall 5 da Phase 9) e o `INSERT` de auditoria na tabela adotada.
--
-- ⚠ O `INSERT` na tabela adotada PERMANECE. Ele é o que faz "adotado com escritas
-- reais" ser verdade — removê-lo seria remover a tabela por outro caminho, com a
-- desvantagem de deixar o objeto no banco descrito por onze consumidores.
--
-- ⚠ O GUARD VIVO NÃO É ALVO DESTE PLANO. Ele já é NULL-safe: testa `v_role IS NULL`
-- explicitamente ANTES da pertinência à lista, então a claim ausente cai no ramo de
-- negação em vez de fazer o `NOT IN` avaliar nulo e falhar ABERTO (o defeito real
-- medido na 42-06). Reescrevê-lo para o idioma `IS DISTINCT FROM` seria mexer no
-- único controle de acesso desta função sem requirement que peça — risco sem ganho.
-- Preservado verbatim.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rollback_to_version(
  p_call_type public.llm_call_type,
  p_semver    text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn_rollback$
DECLARE
  v_role      text;
  v_target_id uuid;
BEGIN
  v_role := (auth.jwt() #>> '{app_metadata,role}');
  IF v_role IS NULL OR v_role NOT IN ('administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Validate target exists and was deprecated less than 1 year ago.
  SELECT id INTO v_target_id
    FROM public.prompt_versions
   WHERE call_type = p_call_type
     AND semver = p_semver
     AND deprecated_at > now() - INTERVAL '1 year';
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Nao e possivel reverter para %: nao encontrada ou depreciada ha mais de 1 ano.', p_semver
      USING errcode = 'P0001';
  END IF;

  -- Deactivate the current active version (deactivate-then-reactivate — Pitfall 5).
  UPDATE public.prompt_versions
     SET is_active = false, deprecated_at = now()
   WHERE call_type = p_call_type AND is_active = true;

  -- Reactivate the target.
  UPDATE public.prompt_versions
     SET is_active = true, deprecated_at = NULL
   WHERE id = v_target_id;

  -- Audit trail (no candidate ID — compliance). PRESERVADO: é a escrita real que
  -- sustenta a adoção da tabela sob o CONSOL-03.
  INSERT INTO public.data_deletion_log (deletion_type, deleted_at)
  VALUES ('prompt_rollback:' || p_call_type::text || ':' || p_semver, now());

  -- ── Phase 47 / CONSOL-03: O SEGUNDO DESTINO, NA MESMA TRANSAÇÃO ────────────
  -- Por que DOIS destinos e não a substituição de um pelo outro:
  --   · a tabela acima é o que faz "adotado com escritas reais" ser VERDADE;
  --   · este `PERFORM` é o que torna a trilha CONSULTÁVEL. Nenhuma tela do
  --     projeto lê `data_deletion_log` (varredura repo-wide: zero SELECT), e uma
  --     trilha que ninguém consegue ler não é trilha. É também o que torna
  --     verdadeira a frase do diálogo de confirmação do rollback ("Esta ação é
  --     registrada na trilha de auditoria") — sem ele a copy seria promessa órfã,
  --     a mesma classe de defeito que esta migration existe para fechar.
  --
  -- Mesmo corpo ⇒ mesma transação: a reversão e o registro commitam ou revertem
  -- juntos. Não existe estado em que o prompt ativo mudou e a trilha não registrou.
  --
  -- `log_auditoria` é SECURITY DEFINER com owner BYPASSRLS, então a linha sobrevive
  -- ao REVOKE de INSERT que a P28 aplicou sobre `logs_auditoria`. Idioma provado
  -- duas vezes: `gerir_usuario_rh_mutacao` (Phase 13) e `salvar_janela_retencao`
  -- (Phase 43, 20260801000002:424-435), de onde a forma nomeada foi copiada.
  --
  -- Os valores 'configuracao' e 'aviso' foram MEDIDOS contra os enums vivos
  -- `categoria_log_auditoria` e `severidade_log` (database.types.ts:5527-5537 e
  -- :5580) — NÃO são valores novos e nenhuma modificação de tipo entra nesta fase.
  --
  -- `p_dados_antes` fica nulo por HONESTIDADE, não por descuido: o corpo vivo não
  -- captura qual versão estava ativa antes, e acrescentar essa captura mudaria o
  -- corpo preservado além da adição de auditoria. O `p_recurso_id` aponta para a
  -- versão reativada, que é o alvo da ação.
  PERFORM public.log_auditoria(
    p_usuario_id   := (select auth.uid()),
    p_usuario_tipo := 'admin',
    p_acao         := 'rollback_versao_prompt',
    p_categoria    := 'configuracao',
    p_descricao    := format('Rollback de prompt: a versao %s de %s foi reativada e a versao ativa anterior foi depreciada', p_semver, p_call_type::text),
    p_severidade   := 'aviso',
    p_recurso_tipo := 'prompt_versions',
    p_recurso_id   := v_target_id,
    p_dados_antes  := NULL::jsonb,
    p_dados_depois := jsonb_build_object('call_type', p_call_type::text, 'semver', p_semver),
    p_sucesso      := true
  );

  RETURN v_target_id;
END;
$fn_rollback$;

REVOKE ALL ON FUNCTION public.rollback_to_version(public.llm_call_type, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rollback_to_version(public.llm_call_type, text) TO authenticated;

COMMENT ON FUNCTION public.rollback_to_version(public.llm_call_type, text) IS
  'Phase 9 / RF-PL-10, ampliada pela Phase 47 / CONSOL-03: rollback de emergencia '
  'restrito a administrador. O alvo tem de existir e ter sido depreciado ha menos de '
  '1 ano. Desativa a ativa e reativa o alvo (deprecated_at=NULL), nessa ordem — a '
  'inversa viola a constraint EXCLUDE unique_active_per_type. '
  'AUDITA EM DOIS DESTINOS, NA MESMA TRANSACAO: (1) public.data_deletion_log, a '
  'trilha adotada sob o CONSOL-03, que e a escrita real que sustenta a adocao — '
  'formato prompt_rollback:<call_type>:<semver>, sem identificador de candidato '
  '(compliance); e (2) public.log_auditoria, o sink canonico, que e onde o resto do '
  'projeto de fato consulta a trilha. O segundo existe porque NENHUMA tela le a '
  'primeira: uma trilha que ninguem consegue ler nao e trilha, e a copy do dialogo '
  'de confirmacao promete registro em trilha de auditoria. As duas escritas vivem no '
  'MESMO corpo, logo na MESMA transacao — a reversao e o registro commitam ou '
  'revertem juntos. log_auditoria e SECURITY DEFINER com owner BYPASSRLS, entao a '
  'linha sobrevive ao REVOKE de INSERT que a P28 aplicou sobre logs_auditoria. '
  'GUARD DE PAPEL NULL-SAFE preservado verbatim da Phase 9: testa v_role IS NULL '
  'ANTES da pertinencia a lista, entao a claim ausente cai no ramo de negacao em vez '
  'de fazer o NOT IN avaliar nulo e falhar ABERTO (defeito medido na 42-06).';


-- -----------------------------------------------------------------------------
-- (5) AUTO-VERIFICAÇÃO POR CATÁLOGO — cinco asserções, cada uma nomeando o medido
-- -----------------------------------------------------------------------------
-- Roda no MESMO apply. Se qualquer uma for falsa a migration inteira reverte, e o
-- operador recebe a razão escrita em vez de um sucesso silencioso.
-- -----------------------------------------------------------------------------
DO $verifica_p47_consol03$
DECLARE
  v_tabela   oid;
  v_indice   int;
  v_policy   int;
  v_comment  text;
  v_def      text;
  v_definer  boolean;
  v_config   text[];
BEGIN
  -- (a) A TABELA ADOTADA CONTINUA EXISTINDO, com o índice e a policy intactos.
  --     Esta é a asserção que impede a fase de virar destrutiva por acidente.
  SELECT c.oid INTO v_tabela
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'data_deletion_log' AND c.relkind = 'r';

  IF v_tabela IS NULL THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (a): public.data_deletion_log nao existe. A decisao do operador em 2026-08-09 foi ADOTAR — a ausencia da tabela significa que alguem tornou esta fase destrutiva sem passar por portao nenhum, e onze consumidores derivados passam a descrever um objeto inexistente';
  END IF;

  SELECT count(*) INTO v_indice
    FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid
   WHERE i.indrelid = v_tabela AND ic.relname = 'idx_data_deletion_log_deleted_at';

  IF v_indice <> 1 THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (a): o indice idx_data_deletion_log_deleted_at sumiu. Adotar significa manter o objeto INTEIRO, nao so a relacao';
  END IF;

  SELECT count(*) INTO v_policy
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'data_deletion_log'
     AND policyname = 'administrador_le_data_deletion_log';

  IF v_policy <> 1 THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (a): a policy administrador_le_data_deletion_log sumiu. Sem ela a unica leitura possivel da trilha adotada deixa de existir';
  END IF;

  -- (b) O COMENTÁRIO DE CATÁLOGO NÃO PROMETE MAIS A FUNÇÃO AUSENTE.
  --     A string procurada aqui é o nome da função que a Phase 15 nunca criou. Ela
  --     aparece NESTE bloco (é o objeto da busca) e em NENHUM outro lugar do
  --     arquivo — em particular, não no comentário novo.
  v_comment := obj_description(v_tabela, 'pg_class');

  IF v_comment IS NULL OR length(btrim(v_comment)) = 0 THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (b): a tabela adotada ficou SEM comentario de catalogo. Uma tabela adotada sem razao escrita e uma tabela que a proxima fase apaga por nao saber para que serve';
  END IF;

  IF v_comment LIKE '%delete_candidate_data%' THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (b): o comentario de catalogo AINDA promete a funcao de exclusao de titular que a Phase 15 nunca criou. Essa promessa e a entrada no 1 do registro de promessas do CONSOL-04 e o motivo pelo qual esta tabela era chamada de zumbi';
  END IF;

  -- (c) e (d) O ESCRITOR AUDITA NOS DOIS DESTINOS.
  --     A prova é a definição da função no catálogo, não a leitura deste arquivo:
  --     o que importa é o que o banco tem, não o que a migration pretendia.
  SELECT p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
    INTO v_definer, v_config, v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'rollback_to_version';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (c): public.rollback_to_version nao existe no catalogo — o escritor vivo da tabela adotada desapareceu';
  END IF;

  IF v_def NOT LIKE '%log_auditoria%' THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (c): a definicao viva de rollback_to_version nao chama o sink canonico de auditoria. Sem essa chamada a trilha do rollback existe apenas numa tabela que nenhuma tela le, e a copy do dialogo de confirmacao volta a ser promessa orfa';
  END IF;

  IF v_def NOT LIKE '%data_deletion_log%' THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (d): a definicao viva de rollback_to_version nao escreve mais na tabela adotada. Sem essa escrita a adocao vira NOMINAL, e o criterio de sucesso exige "adotado com escritas REAIS"';
  END IF;

  -- (e) POSTURA DE SEGURANÇA PRESERVADA.
  IF v_definer IS NOT TRUE THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (e): rollback_to_version deixou de ser SECURITY DEFINER. Ela precisa desse modo para escrever em logs_auditoria sob o REVOKE da P28';
  END IF;

  -- ⚠ O padrao aceita `search_path=` E `search_path=""`: o catalogo grava a forma
  -- NORMALIZADA, e qual das duas ele escolhe nao e escolha desta migration. Medido
  -- em PROD em 2026-08-10, ANTES do apply: `proconfig` desta funcao e
  -- `{"search_path=\"\""}` — com aspas. A forma estrita `@> ARRAY['search_path=']`
  -- devolveria FALSO e abortaria o apply inteiro sobre uma funcao CORRETA.
  -- Mesma licao ja paga pelo `20260809000001` (47-02, bloco (d)): um gate que
  -- reprova o trabalho certo treina quem executa a desliga-lo, e ai ele para de
  -- pegar o caso real.
  IF v_config IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(v_config) AS cfg WHERE cfg ~ '^search_path=(''''|"")?$'
  ) THEN
    RAISE EXCEPTION 'P47-CONSOL03 FAIL (e): rollback_to_version perdeu o search_path vazio (proconfig = %). Uma funcao SECURITY DEFINER sem search_path fixado e sequestravel por objeto homonimo em schema do chamador', coalesce(array_to_string(v_config, ','), '<nulo>');
  END IF;

  RAISE NOTICE 'P47-CONSOL03 OK: tabela adotada intacta (indice + policy), comentario de catalogo sem promessa orfa, e o escritor auditando nos dois destinos com a postura de seguranca preservada';
END
$verifica_p47_consol03$;
