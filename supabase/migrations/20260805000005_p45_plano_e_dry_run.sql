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

  -- (b) papel por `IS DISTINCT FROM`, NUNCA por `NOT IN`: com `v_role` NULL o
  --     `NOT IN` avalia NULL, o `IF` NÃO é tomado, e o guard FALHA ABERTO
  --     exatamente para o chamador mais suspeito, que é `anon` (defeito REAL
  --     medido na 42-06). A forma NULL-safe falha FECHADA por construção, não por
  --     lembrança.
  IF v_role IS DISTINCT FROM 'rh' AND v_role IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas rh ou administrador le o plano de exclusao'
      USING ERRCODE = '42501';
  END IF;

  SELECT true, c.user_id, (c.email LIKE 'anonimizado+%@invalido.local')
    INTO v_existe, v_user_id, v_anon
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  -- Titular inexistente NÃO é erro: é um plano legítimo cujas contagens são todas
  -- zero. Levantar aqui obrigaria o chamador a distinguir "não achei" de "falhou",
  -- e a Edge Function do 45-10 precisa exatamente do oposto — de um plano que ela
  -- possa mostrar ao operador sem ramificar.
  v_existe := coalesce(v_existe, false);

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
      'nota', 'o motor trata 23503 como CLASSE e nunca como constraint nomeada: duas contas reais deram dois bloqueadores DIFERENTES na SONDA 6 (historico_candidatura.candidatura_id no titular puro, preferencias_notificacoes.created_by na conta hibrida candidato+RH)'
    ),

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
  v_plano   jsonb;
  v_passo   text;
  v_faltando text := '';
BEGIN
  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P45-PLANO: nenhum administrador vivo em usuarios_rh — o caminho FELIZ nao pode ser exercitado sem ator real, e verificar so a recusa foi EXATAMENTE o defeito que a 20260803000001 corrigiu';
  END IF;

  SELECT c.id INTO v_cand
    FROM public.candidatos c
   ORDER BY c.created_at
   LIMIT 1;

  IF v_cand IS NULL THEN
    RAISE EXCEPTION 'P45-PLANO: nenhum candidato vivo — o plano nao teria sobre quem ser computado, e um jsonb de zeros passaria por VACUIDADE';
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
                                 'auth_delete_user']
  LOOP
    IF NOT (v_plano ? v_passo) THEN
      v_faltando := v_faltando || v_passo || ' ';
    END IF;
  END LOOP;

  IF v_faltando <> '' THEN
    RAISE EXCEPTION 'P45-PLANO: passo(s) do recibo SEM cobertura no plano: %. PASSOS_MOTOR (reciboExclusao.ts:23-31) e o vocabulario que o recibo promete ao titular; um passo sem chave aqui e uma promessa que nenhuma query sustenta', v_faltando;
  END IF;

  -- Os dois passos de fora do banco têm de estar MARCADOS como tal. Um zero
  -- silencioso ali seria pior que a ausência da chave: pareceria resposta.
  IF (v_plano #>> '{storage_remove,fonte}') IS DISTINCT FROM 'fora_do_banco'
     OR (v_plano #>> '{auth_delete_user,fonte}') IS DISTINCT FROM 'fora_do_banco' THEN
    RAISE EXCEPTION 'P45-PLANO: storage_remove e auth_delete_user precisam vir marcados com fonte = fora_do_banco. A SONDA 2 mediu que storage.objects NAO tem FK para auth.users: nao ha como conta-los por SQL, e um zero seria lido como "nao ha curriculo a apagar"';
  END IF;

  RAISE NOTICE 'P45-PLANO OK: plano_exclusao_titular COMPLETOU e devolveu uma chave para cada um dos 7 passos de PASSOS_MOTOR, com storage_remove e auth_delete_user marcados como fora_do_banco';
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
  'candidato+RH). O motor trata 23503 como CLASSE, nunca como constraint nomeada. '
  'GUARD NULL-SAFE em duas metades: recusa 42501 tanto o papel errado quanto o chamador SEM CLAIM '
  'NENHUMA, por IS DISTINCT FROM e nunca por NOT IN (que avalia NULL, nao toma o IF, e falha '
  'ABERTO para anon — defeito real medido na 42-06). DEFINER bypassa RLS, entao este guard e o '
  'unico controle do corpo. REVOKE ALL de PUBLIC, anon e authenticated NOMINALMENTE (pg_default_acl '
  'concede a anon como grant DIRETO, entao revogar so de PUBLIC nao remove nada), e o UNICO GRANT '
  'e para service_role. '
  '⚠ OBRIGACAO DO CHAMADOR: o guard le a CLAIM, nao o papel do banco. Um cliente service_role sem '
  'Authorization de usuario tem auth.uid() NULO e recebe 42501 — passar as claims e obrigacao '
  'declarada da Edge Function, e a assercao C2 do smoke a exige das cinco funcoes da fase.';
