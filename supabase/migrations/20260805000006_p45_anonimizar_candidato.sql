-- =============================================================================
-- Phase 45 / Plano 45-07 — ERASE-02 / ERASE-08 / ERASE-09 / ERASE-10
-- `anonimizar_candidato(uuid, boolean)` — o tombstone. UMA transação, com
-- `p_dry_run` no MESMO corpo do delete real.
-- =============================================================================
--
-- Requirement:          ERASE-02 (tombstone in-place), ERASE-08 (a trilha de
--                       decisão sobrevive), ERASE-09 (as 5 FKs SET NULL),
--                       ERASE-10 (severar antes do deleteUser)
-- Decisões de origem:   D-45-02 / D-45-03 (preservar a justificativa ANONIMIZADA,
--                       nunca apagar) · D-45-11 (a S1, precondição desta função)
--                       D-45-10 (PITR desligado — o dry-run é a única rede)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-07, Task 3
--
-- -----------------------------------------------------------------------------
-- ⚠⚠ ESTA É A FUNÇÃO QUE APAGA PII DE FORMA IRREVERSÍVEL
-- -----------------------------------------------------------------------------
-- ⚠ REVERSIBILIDADE: `one-way`. O tombstone desvincula a justificativa do
-- recrutador do titular (D-45-03) e destrói in-place o conteúdo identificante de
-- `candidatos`. Uma vez executado em produção não há caminho de volta ao titular —
-- **é o efeito pretendido**, e com o PITR desligado (D-45-10) não há segunda via.
--
-- `p_dry_run` tem `DEFAULT true` **de propósito: o modo seguro é o padrão**, e
-- apagar exige dizê-lo. Uma chamada distraída não destrói nada.
--
-- Apply atrás do portão destrutivo do M8 (plano 45-11): code review BLOQUEANTE
-- antes do apply, dry-run pela MESMA query, asserções negativas, zero `--no-verify`.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes GSD
-- não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- O plano 45-07 AUTORA e **aplica ZERO**; quem aplica é o **45-11**.
--
-- ⚠ ORDEM DE APPLY OBRIGATÓRIA, e a auto-verificação no fim deste arquivo a
-- verifica em vez de deixar o erro cru do Postgres explicar:
--   20260805000003 (45-05) → cria `candidatos.faixa_etaria_materializada`
--   20260805000004 (45-07) → torna `candidatos.user_id` nulável
--   20260805000005 (45-07) → cria `plano_exclusao_titular`, que este corpo CHAMA
--   20260805000006 (este)
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`** — o driver já abre a transação e o BEGIN
-- externo é o gatilho do 42601 (CLAUDE.md §Migrations).
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER, logo após o apply:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000006'
--    WHERE name LIKE '%p45_anonimizar_candidato%';
--
-- ⚠ O token do delimitador de cifrões NÃO aparece em prosa neste arquivo, e a
-- omissão é deliberada: a receita de extração registrada no smoke (§PROVENIENCIA)
-- é um `indexOf` ingênuo, e uma menção em comentário antes da função faria o 45-11
-- pinar o md5 de um trecho de prosa em vez do corpo.
--
-- -----------------------------------------------------------------------------
-- (2) ESCOPO NEGATIVO — O QUE ESTA MIGRATION NUNCA FAZ
-- -----------------------------------------------------------------------------
-- **NENHUMA DAS 3 FKs `NO ACTION` DA TRILHA DE DECISÃO É TOCADA.** Não há DDL
-- alguma sobre `historico_candidatura`, `decisao_final` ou
-- `decisao_final_historico`, e não há remoção de linha em nenhuma das três. As três
-- seguem com `confdeltype = 'a'`, que a asserção A1 do smoke mede ANTES de qualquer
-- outra coisa.
--
-- O `23503` é o schema fazendo o trabalho CERTO. A saída é anonimizar a linha filha
-- e severar o ponteiro — **afrouxar a constraint é o atalho que o ERASE-08 proíbe e
-- que vai ser proposto no primeiro erro**. Com CASCADE ali, apagar a candidatura
-- apagaria a prova de que a decisão foi humana (RNF-07a).
--
-- -----------------------------------------------------------------------------
-- (3) ⚠ O TRIGGER QUE DESFAZ A ANONIMIZAÇÃO SE A ORDEM ESTIVER ERRADA
-- -----------------------------------------------------------------------------
-- `trg_decisao_final_snapshot` (20260709000011:105-118) é
-- `AFTER UPDATE ON public.decisao_final FOR EACH ROW`, **SEM cláusula `WHEN`**, e o
-- corpo insere em `decisao_final_historico` o `OLD.justificativa` — o texto
-- IDENTIFICÁVEL — junto com `OLD.por_usuario`.
--
-- Consequência direta e não-óbvia: o `UPDATE` que desidentifica `decisao_final`
-- **RECRIA no arquivo a PII que acabou de remover da linha corrente**. O operador
-- antecipou isso por escrito ao travar a BD-9: *"o histórico entrega o que a linha
-- corrente protege"*.
--
-- **Obrigação que isso impõe a este arquivo, e ela é de ORDEM:** o scrub de
-- `decisao_final_historico` é o **ÚLTIMO** statement a tocar o par, **depois** do
-- `UPDATE` em `decisao_final`. Fazê-lo antes deixa uma linha identificável
-- recém-criada atrás dele — e a asserção B7 do smoke pega exatamente isso.
--
-- Corolário para o ERASE-08: a leitura ingênua ("contagem idêntica nas três") é
-- INSATISFAZÍVEL sem apagar do arquivo, que o próprio ERASE-08 proíbe. O invariante
-- que de fato protege a pessoa é: `historico_candidatura` e `decisao_final` com
-- contagem ESTRITAMENTE idêntica; `decisao_final_historico` nunca DECRESCE e cresce
-- no máximo o número de linhas de `decisao_final` que o tombstone atualizou.
--
-- -----------------------------------------------------------------------------
-- (4) CADA SENTINELA É ESCOLHIDA CONTRA O CATÁLOGO VIVO, NUNCA POR PARECER BOA
-- -----------------------------------------------------------------------------
-- Fonte: `45-SONDAS-PROD.md` SONDA 1, medida em 2026-08-05. NÃO
-- `docs/sql/sql/02-tabela-candidatos.sql`, que é de 2025 e diverge do catálogo em
-- pelo menos `cpf` (Pitfall 9).
--
--   coluna            | restrição MEDIDA                          | sentinela
--   ------------------+-------------------------------------------+---------------------------
--   email             | NOT NULL + UNIQUE + check_email_format    | única por linha, no formato
--   celular           | NOT NULL + check_celular_format           | (00) 00000-0000
--   data_nascimento   | NOT NULL + check_data_nascimento (<hoje)  | 1900-01-01
--   estado            | NOT NULL + check_estado (27 UFs)          | PRESERVADA — ver (5)
--   cidade            | NOT NULL, sem CHECK                       | marcador livre
--   nome_completo     | NOT NULL, sem CHECK                       | marcador livre
--   cpf               | NULÁVEL (D4) + UNIQUE + check_cpf_format  | NULL
--   genero            | NULÁVEL + check_genero                    | NULL
--   como_conheceu     | NULÁVEL + check_como_conheceu (a SÉTIMA,  | NULL
--                     |   não prevista pela pesquisa — D2)        |
--   linkedin/instagram| NULÁVEIS — são QUATRO colunas, dois pares  | NULL
--   avatar_url        | NULÁVEL — ausente do mapa da fase         | NULL
--
-- ⚠ A sentinela de e-mail é ÚNICA POR LINHA porque a coluna é UNIQUE (D5): uma
-- sentinela FIXA colidiria na SEGUNDA exclusão e abortaria a transação inteira de
-- quem pediu depois. E ela casa
-- `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$` — um marcador em prosa como
-- `[removido]` viola a CHECK e derruba tudo.
--
-- ⚠ A sentinela de `data_nascimento` não pode ser "qualquer data no passado": ela
-- também precisa CAIR FORA da faixa etária real, senão a asserção B9
-- (re-identificação por faixa + UF + vaga + timestamp) acha o titular. 1900-01-01
-- dá idade ~126, que não colide com faixa alguma de pessoa viva.
--
-- -----------------------------------------------------------------------------
-- (5) A DECISÃO SOBRE `estado`, E A ALTERNATIVA QUE FOI RECUSADA
-- -----------------------------------------------------------------------------
-- `estado` é `bpchar NOT NULL` com `check_estado` aceitando exatamente as 27 UFs.
-- **Não existe valor "removido" válido para esta coluna.** As duas saídas eram:
--
--   (a) RECUSADA — mexer na CHECK para admitir um valor sentinela. Alterar uma
--       constraint de tabela viva dentro de uma fase irreversível é risco maior que
--       o dado retido, e criaria uma segunda migration destrutiva de schema onde a
--       fase inteira foi desenhada para ter apenas uma.
--   (b) ADOTADA — PRESERVAR a UF. O `pii-inventory.yaml` a classifica como
--       preservável por granularidade útil ao bias snapshot; a UF sozinha não
--       re-identifica (são 27 valores sobre 22 candidatos), e o que de fato fecha o
--       vetor de re-identificação é a faixa etária deixar de casar — que é o
--       ERASE-01 e está resolvido no passo 1 deste corpo.
--
-- -----------------------------------------------------------------------------
-- (6) `candidate_ai_decisions` — A CLÁUSULA DE FK INEXEQUÍVEL (achado M2)
-- -----------------------------------------------------------------------------
-- A tabela declara `candidato_id` E `vaga_id` como `NOT NULL` com
-- `ON DELETE SET NULL` (20260609000001:236-237, confirmado no catálogo vivo).
-- `NOT NULL` somado a `SET NULL` é contradição estrutural: apagar a linha
-- referenciada faria o Postgres tentar gravar NULL numa coluna `NOT NULL` e
-- levantar `23502`. A cláusula NUNCA pode ser cumprida — a FK é **bomba latente**,
-- não proteção, e hoje está dormente APENAS porque a tabela tem 0 linhas.
--
-- **Escolha deste plano, entre afrouxar as colunas e desidentificar o conteúdo:
-- DESIDENTIFICAR O CONTEÚDO.** Razão: a fase foi desenhada para conter UMA única
-- migration destrutiva de schema (a S1), e afrouxar mais duas colunas `NOT NULL`
-- ampliaria essa superfície sem necessidade — o `ai_reasoning_summary` é o que
-- carrega texto sobre a pessoa, e é ele que re-identifica.
--
-- ⚠ E o corpo NÃO fixa essa escolha por suposição: ele LÊ `attnotnull` ao vivo. Se
-- alguém afrouxar a coluna depois, o mesmo statement passa a severar o ponteiro
-- TAMBÉM. As duas metades do achado M2 ficam cobertas sem reescrita.
--
-- -----------------------------------------------------------------------------
-- (7) O QUE ESTE CORPO NÃO ESCREVE, E POR QUÊ
-- -----------------------------------------------------------------------------
-- **Não escreve em `logs_auditoria`.** A tabela usa dois enums (`categoria_log_auditoria`,
-- `severidade_log`) cujos valores vivos este plano NÃO pôde medir (subagentes não
-- recebem os tools MCP do Supabase), e a regra da fase é que nenhuma escrita é
-- escolhida por parecer razoável — cada uma é escolhida contra o catálogo lido. Um
-- valor de enum inventado abortaria a transação de anonimização inteira, no pedido
-- real, depois de o currículo já ter sido apagado do Storage.
-- A trilha desta exclusão é o RECIBO mais as colunas de estado de
-- `solicitacoes_dados`, escritas pela Edge Function do 45-10.
-- ⚠ Efeito colateral favorável: a asserção B4 do smoke exige que a re-execução
-- acrescente ZERO linha em `logs_auditoria`, e um no-op que audita não é no-op.
--
-- **Não toca `deleted_at` nem `ativo`.** Cinco leituras de RH filtram por
-- `deleted_at`, e um soft delete faria a linha sumir de todas em silêncio
-- (Invariante 9 da 45-UI-SPEC). O mandato desta função é desidentificar, não gerir
-- ciclo de vida.
--
-- **Não toca `decisao_final.por_usuario` nem `decisao_final_historico.por_usuario`:
-- as duas são `NOT NULL`** no catálogo vivo e apontam para o RECRUTADOR, não para o
-- titular (a SONDA 6 mediu ZERO linha de titular nelas). Severá-las é impossível
-- sem DDL, e desnecessário no caminho medido — registrado como resíduo declarado
-- para a enumeração dinâmica de `23503` do 45-10.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.anonimizar_candidato(uuid, boolean) — o tombstone
-- ---------------------------------------------------------------------------
-- `VOLATILE` porque escreve; `SECURITY DEFINER` porque precisa atravessar a RLS de
-- uma dúzia de tabelas; `SET search_path = ''` endurece o DEFINER, e por isso TODA
-- referência é qualificada. Delimitador NOMEADO para que `md5(prosrc)` seja
-- extraível pela asserção C3 do smoke.
--
-- ⚠ A ATOMICIDADE É O REQUISITO. Esta é a ÚNICA atomicidade que a fase inteira
-- consegue: Storage, Postgres e Auth não compartilham transação, mas dentro do
-- Postgres tudo o que este corpo faz acontece ou nada acontece. É por isso que o
-- tombstone é um RPC e não código de Edge Function — a EF não tem transação, o RPC
-- tem. Uma interrupção deixa a linha INTEIRAMENTE não-anonimizada, nunca meio
-- anonimizada: não existe estado intermediário observável (nome anonimizado com CPF
-- intacto reprova a asserção B5).
CREATE OR REPLACE FUNCTION public.anonimizar_candidato(
  p_candidato_id uuid,
  p_dry_run      boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $anonimizar_candidato$
DECLARE
  v_uid        uuid := auth.uid();
  v_role       text := (select auth.jwt() #>> '{app_metadata,role}');
  -- O dono de `p_candidato_id`, lido ANTES do guard: a metade (b) precisa dele.
  v_dono       uuid;
  v_plano      jsonb;
  v_user_id    uuid;
  v_email      text;
  v_achou      boolean := false;
  v_sent_email text;
  v_aidec_fixa boolean;

  v_n_cand     integer := 0;
  v_n_df       integer := 0;
  v_n_dfh      integer := 0;
  v_n_hist     integer := 0;
  v_n_aicall   integer := 0;
  v_n_aidec    integer := 0;
  v_n_logs     integer := 0;
  v_n_alerts   integer := 0;
  v_n_aut      integer := 0;
  v_n_notif    integer := 0;
BEGIN
  -- ── GUARD, DUAS METADES ───────────────────────────────────────────────────
  -- (a) chamador SEM claim nenhuma é recusado EXPLICITAMENTE. Esta função apaga
  --     PII de forma irreversível e nasceria executável por `anon` sem o REVOKE
  --     abaixo — mas um guard confiado só ao ACL é um controle confiado a uma
  --     configuração de schema que ninguém relê.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao anonimiza ninguem'
      USING ERRCODE = '42501';
  END IF;

  -- O DONO é lido ANTES da metade (b), porque a metade (b) precisa dele. É uma
  -- leitura de UMA coluna, escopada ao id recebido, e nada é devolvido antes do guard.
  SELECT c.user_id INTO v_dono
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  -- (b) TRÊS comparações, todas por `IS DISTINCT FROM` e NUNCA por `NOT IN`: com um
  --     dos lados NULL o `NOT IN` avalia NULL, o `IF` NÃO é tomado, e o guard FALHA
  --     ABERTO exatamente para `anon` (defeito REAL medido na 42-06). Com o candidato
  --     inexistente ou já severado o dono resolve NULL, `NULL IS DISTINCT FROM <uid>`
  --     é TRUE, e a função recusa — falha FECHADA por construção, não por lembrança.
  --
  -- ⚠ O TITULAR ENTRA AQUI, E A RAZÃO É DATÁVEL. O 45-07 desenhou esta função como
  --     função de OPERADOR (`rh`/`administrador`, `GRANT` só a `service_role`); o
  --     45-10 — escrito depois — a cabeou dentro do caminho de execução **do próprio
  --     titular**, cujo papel de aplicação é `candidato`. As duas metades estavam
  --     certas isoladamente; a junta não. ⚠ A metade (a) NÃO é tocada: aceitar
  --     `auth.uid() IS NULL` sob `service_role` é a saída **recusada** pelo
  --     `DI-45-07-01` e pela decisão do operador de 2026-08-05, e deixaria uma função
  --     que apaga PII irreversivelmente sem controle nenhum no corpo.
  IF v_role IS DISTINCT FROM 'rh'
     AND v_role IS DISTINCT FROM 'administrador'
     AND v_dono IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: a anonimizacao so pode ser executada por rh, por administrador ou pelo proprio titular daquele candidato'
      USING ERRCODE = '42501';
  END IF;

  -- ── PASSO 0 · A EXPRESSÃO ÚNICA. CHAMAR, NUNCA COPIAR O CORPO ─────────────
  -- O dry-run e o delete real saem DAQUI. Reescrever este predicado inline criaria
  -- uma segunda definição de exclusão no banco, e a que o dry-run mostra deixaria
  -- de ser a que o delete real executa (P39 CR-02). A asserção C3 do smoke exige
  -- que `pg_get_functiondef` desta função CONTENHA esta chamada.
  v_plano := public.plano_exclusao_titular(p_candidato_id);

  SELECT true, c.user_id, c.email
    INTO v_achou, v_user_id, v_email
    FROM public.candidatos c
   WHERE c.id = p_candidato_id;

  IF NOT coalesce(v_achou, false) THEN
    RAISE EXCEPTION 'CANDIDATO_INEXISTENTE: nao ha linha em candidatos para o id informado — anonimizar o que nao existe seria um sucesso silencioso, e o recibo prometeria ao titular um apagamento que nunca teve alvo'
      USING ERRCODE = 'P0002';
  END IF;

  v_sent_email := 'anonimizado+' || p_candidato_id::text || '@invalido.local';

  -- ── IDEMPOTÊNCIA POR ESTADO, NUNCA POR try/catch ──────────────────────────
  -- O predicado RECONHECE a sentinela. "Apagar de novo porque não dá erro" funciona
  -- por ACIDENTE e para de funcionar no dia em que a enumeração devolver algo novo
  -- — e nesse dia a evidência de que já tinha rodado não existe. Zero coluna muda,
  -- zero linha de auditoria nasce: um no-op que audita não é um no-op.
  IF v_email LIKE 'anonimizado+%@invalido.local' THEN
    RETURN jsonb_build_object(
      'resultado',    'ja_anonimizado',
      'candidato_id', p_candidato_id,
      'dry_run',      p_dry_run,
      'plano',        v_plano,
      'observacao',   'a sentinela de e-mail foi reconhecida: esta linha ja e um tombstone. Nenhuma coluna foi tocada e nenhuma linha de auditoria foi criada'
    );
  END IF;

  -- ══ passo_motor: tombstone_candidato ══════════════════════════════════════
  -- ⚠ (1/2) A FAIXA ETÁRIA PRIMEIRO — restrição de ordenação nº 1 do ROADMAP.
  -- `gerar_bias_snapshot()` deriva a idade por JOIN VIVO em `data_nascimento` no
  -- momento do snapshot. Toda data no passado tem idade, então a sentinela CAI numa
  -- faixa real: se a faixa continuasse sendo derivada, anonimizar um titular moveria
  -- a coorte e a série EEOC 4/5 mudaria RETROATIVAMENTE (SC#5). Materializar depois
  -- da sentinela gravaria a faixa do ANO 1900 — o mesmo defeito com outra cara.
  -- As bandas são as de `20260625100001:349-353`, copiadas verbatim: uma segunda
  -- definição de faixa etária no repositório envelheceria em silêncio.
  UPDATE public.candidatos c
     SET faixa_etaria_materializada = coalesce(
           c.faixa_etaria_materializada,
           CASE
             WHEN c.data_nascimento IS NULL                                        THEN NULL
             WHEN date_part('year', age(c.data_nascimento))::int BETWEEN 18 AND 24 THEN '18-24'
             WHEN date_part('year', age(c.data_nascimento))::int BETWEEN 25 AND 34 THEN '25-34'
             WHEN date_part('year', age(c.data_nascimento))::int BETWEEN 35 AND 44 THEN '35-44'
             WHEN date_part('year', age(c.data_nascimento))::int BETWEEN 45 AND 54 THEN '45-54'
             WHEN date_part('year', age(c.data_nascimento))::int >= 55             THEN '55+'
           END)
   WHERE c.id = p_candidato_id;

  -- ⚠ (2/2) O TOMBSTONE. Cada sentinela contra a SONDA 1 — ver o bloco (4) do
  -- cabeçalho. `estado` NÃO aparece aqui: é preservada por decisão registrada em (5).
  UPDATE public.candidatos c
     SET nome_completo          = '[titular removido a pedido]',
         email                  = v_sent_email,
         cpf                    = NULL,
         celular                = '(00) 00000-0000',
         data_nascimento        = DATE '1900-01-01',
         genero                 = NULL,
         cidade                 = '[removido]',
         como_conheceu          = NULL,
         como_conheceu_detalhes = NULL,
         linkedin               = NULL,
         instagram              = NULL,
         linkedin_url           = NULL,
         instagram_url          = NULL,
         avatar_url             = NULL,
         cep                    = NULL,
         logradouro             = NULL,
         numero                 = NULL,
         complemento            = NULL,
         bairro                 = NULL,
         bloqueado_motivo       = NULL,
         data_ultimo_acesso     = NULL,
         -- passo_motor: severar_user_id — só possível pela 20260805000004 (S1).
         user_id                = NULL,
         -- As duas abaixo apontam a auth.users com NO ACTION: se o titular tiver
         -- criado a própria linha, elas BLOQUEIAM o deleteUser com 23503 depois de
         -- o currículo já ter sido apagado. A SONDA 6 mediu ZERO no caminho do
         -- titular puro — o predicado existe para a conta híbrida, que existe em PROD.
         created_by             = CASE WHEN v_user_id IS NOT NULL AND c.created_by = v_user_id
                                       THEN NULL ELSE c.created_by END,
         updated_by             = CASE WHEN v_user_id IS NOT NULL AND c.updated_by = v_user_id
                                       THEN NULL ELSE c.updated_by END,
         updated_at             = now()
   WHERE c.id = p_candidato_id;

  GET DIAGNOSTICS v_n_cand = ROW_COUNT;

  -- ══ passo_motor: tombstone_decisao_final ══════════════════════════════════
  -- D-45-02 / D-45-03: PRESERVAR ANONIMIZADA. As duas colunas são `NOT NULL` —
  -- nunca NULL, nunca remoção da linha. O texto sobrevive como prova de
  -- não-discriminação (Art. 7º, VI / RNF-07a); o vínculo com o titular, não.
  UPDATE public.decisao_final d
     SET justificativa = '[justificativa preservada de forma desidentificada a pedido do titular — o texto original foi removido; a decisao permanece registrada como prova de que houve avaliacao humana (LGPD Art. 7o, VI / RNF-07a)]'
   WHERE d.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_df = ROW_COUNT;

  -- ⚠⚠ ESTE É O ÚLTIMO STATEMENT A TOCAR O PAR, E A ORDEM É O MECANISMO.
  -- O `UPDATE` acima acabou de disparar `trg_decisao_final_snapshot` (AFTER UPDATE,
  -- FOR EACH ROW, SEM `WHEN`), que inseriu no arquivo uma linha nova carregando
  -- `OLD.justificativa` — a PII que o statement anterior removeu da linha corrente.
  -- Fazer este scrub ANTES deixaria essa linha recém-criada identificável atrás
  -- dele. Ver o bloco (3) do cabeçalho.
  UPDATE public.decisao_final_historico h
     SET justificativa = '[justificativa arquivada, preservada de forma desidentificada a pedido do titular — LGPD Art. 7o, VI / RNF-07a]'
   WHERE h.candidatura_id IN (
           SELECT c.id FROM public.candidaturas c WHERE c.candidato_id = p_candidato_id);

  GET DIAGNOSTICS v_n_dfh = ROW_COUNT;

  -- ══ passo_motor: severar_fks_set_null (ERASE-09) ══════════════════════════
  -- Cinco statements EXPLÍCITOS, um por tabela, mais `historico_candidatura.ator`.
  -- A ordem relativa entre eles NÃO é observável de fora (mesma transação) — a
  -- asserção correta é sobre o PÓS-ESTADO das cinco, e um teste que dependesse da
  -- ordem estaria medindo implementação em vez de contrato.

  -- (1/5) ai_call_logs — `candidato_id` é nulável: não há desculpa estrutural.
  -- ⚠ Além do ponteiro, o CONTEÚDO: `raw_response` e `parsed_reasoning` carregam o
  -- texto que a IA leu e escreveu SOBRE A PESSOA (inclusive trechos de currículo).
  -- Um ponteiro severado com o texto intacto é pseudonimização apresentada como
  -- anonimização, que é exatamente o que o Art. 12 §1º não aceita.
  UPDATE public.ai_call_logs l
     SET candidato_id     = NULL,
         parsed_reasoning = NULL,
         raw_response     = '{"redigido":"anonimizacao_p45"}'::jsonb
   WHERE l.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_aicall = ROW_COUNT;

  -- (2/5) candidate_ai_decisions — achado M2, ver bloco (6) do cabeçalho.
  -- `attnotnull` é lido AO VIVO: enquanto a coluna for `NOT NULL` o ponteiro não é
  -- severável e o conteúdo é desidentificado; se alguém afrouxar a coluna depois,
  -- o MESMO statement passa a severar também. `ai_reasoning_summary` é `NOT NULL`.
  SELECT a.attnotnull INTO v_aidec_fixa
    FROM pg_attribute a
   WHERE a.attrelid = 'public.candidate_ai_decisions'::regclass
     AND a.attname  = 'candidato_id'
     AND NOT a.attisdropped;

  UPDATE public.candidate_ai_decisions x
     SET ai_reasoning_summary = '[sumario de raciocinio desidentificado a pedido do titular]',
         candidato_id         = CASE WHEN coalesce(v_aidec_fixa, true)
                                     THEN x.candidato_id ELSE NULL END
   WHERE x.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_aidec = ROW_COUNT;

  -- (3/5) logs_acesso — `ip_address` é `inet NOT NULL`: TRUNCAR, nunca anular
  -- (NULL abortaria a transação de anonimização inteira). `network(set_masklen(...))`
  -- zera os bits de host de verdade; `set_masklen` sozinho preservaria o endereço
  -- completo e só mudaria a máscara — seria mascaramento de fachada.
  -- `email_tentativa` guarda o endereço digitado e re-identifica sozinho.
  UPDATE public.logs_acesso g
     SET user_id         = NULL,
         email_tentativa = NULL,
         device_info     = NULL,
         ip_address      = network(set_masklen(g.ip_address,
                             CASE WHEN family(g.ip_address) = 4 THEN 24 ELSE 48 END))::inet
   WHERE v_user_id IS NOT NULL AND g.user_id = v_user_id;

  GET DIAGNOSTICS v_n_logs = ROW_COUNT;

  -- (4/5) recruiter_alerts
  UPDATE public.recruiter_alerts r
     SET candidato_id = NULL,
         message      = '[alerta desidentificado a pedido do titular]'
   WHERE r.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_alerts = ROW_COUNT;

  -- (5/5) autorizacoes — ⚠ D8: esta tabela tem DUAS FKs. A que é SET NULL aponta a
  -- `auth.users` (`user_id`); a que aponta a `candidatos` é CASCADE, e o ERASE-09
  -- confunde as duas. O predicado cobre os dois caminhos porque uma linha pode
  -- chegar por qualquer um deles.
  -- `ip_aceite` é a PROVA DE ACEITE: a linha fica, o endereço não.
  UPDATE public.autorizacoes a
     SET user_id           = NULL,
         user_agent_aceite = '[desidentificado]',
         ip_aceite         = network(set_masklen(a.ip_aceite,
                               CASE WHEN family(a.ip_aceite) = 4 THEN 24 ELSE 48 END))::inet
   WHERE a.candidato_id = p_candidato_id
      OR (v_user_id IS NOT NULL AND a.user_id = v_user_id);

  GET DIAGNOSTICS v_n_aut = ROW_COUNT;

  -- `historico_candidatura.ator` — nulável, e é o ponteiro que resta ao titular na
  -- trilha. ⚠ EFEITO COLATERAL REGISTRADO (Pitfall 8, item 1): a linha passa a
  -- PARECER escrita pelo sistema. `auto_rejeitado` é boolean ARMAZENADO, então a
  -- prova RNF-07a sobrevive — mas qualquer leitor que derive "foi o sistema" de
  -- `ator IS NULL` passa a mentir. Fica como dependência declarada da W-1/CONSOL-02
  -- da Phase 47. Isto é `UPDATE`: zero linha removida, contagem inalterada.
  UPDATE public.historico_candidatura h
     SET ator = NULL
   WHERE v_user_id IS NOT NULL AND h.ator = v_user_id;

  GET DIAGNOSTICS v_n_hist = ROW_COUNT;

  -- ══ passo_motor: scrub_ledger_email ═══════════════════════════════════════
  -- `destinatario_email` E `destinatario_original` são AMBOS `NOT NULL`: o endereço
  -- é gravado DUAS vezes por linha, e NULL abortaria a transação inteira.
  -- ⚠ `dedupe_key` é UNIQUE e precisa ser RE-NAMESPACEADA. Sem isso, um recadastro
  -- futuro colide, o claim `ON CONFLICT DO NOTHING RETURNING id` volta VAZIO, e o
  -- e-mail legítimo NUNCA É ENVIADO — sem erro em lugar nenhum (Pitfall 8, item 2).
  -- O discriminador é o próprio id da linha, que garante unicidade sem sorteio.
  UPDATE public.notificacoes_enviadas n
     SET destinatario_email    = v_sent_email,
         destinatario_original = v_sent_email,
         ultimo_erro           = NULL,
         dedupe_key            = n.evento || ':' || n.candidatura_id::text
                                 || ':purgado-' || n.id::text
   WHERE n.candidato_id = p_candidato_id;

  GET DIAGNOSTICS v_n_notif = ROW_COUNT;

  -- ══ DRY-RUN — AO FIM DO MESMO CORPO, NUNCA UM SEGUNDO CORPO ═══════════════
  -- Tudo acima já executou de verdade; o `RAISE` reverte a transação inteira. É
  -- essa forma — e não `IF p_dry_run THEN <query A> ELSE <query B>` — que garante
  -- que o que o dry-run mostra é literalmente o que o delete real faz. A forma de
  -- dois corpos é o parente direto do CR-02 da P39, uma guarda que era dead code.
  -- O `ERRCODE` é PRÓPRIO para que o chamador distinga "dry-run concluído" de "erro
  -- real": um erro real disfarçado de sucesso de dry-run seria o pior falso verde
  -- desta fase, e no sentido inverso um P45DR chegando no caminho real passaria por
  -- sucesso quando nada foi apagado.
  IF p_dry_run THEN
    RAISE EXCEPTION 'P45 DRY-RUN concluido: o corpo COMPLETO da anonimizacao executou e esta sendo revertido agora. Nada foi persistido. candidatos=% decisao_final=% decisao_final_historico=% historico_ator=% ai_call_logs=% candidate_ai_decisions=% logs_acesso=% recruiter_alerts=% autorizacoes=% notificacoes_enviadas=%. Para executar de verdade, chame com p_dry_run := false — o modo seguro e o DEFAULT, e apagar exige dize-lo',
      v_n_cand, v_n_df, v_n_dfh, v_n_hist, v_n_aicall, v_n_aidec, v_n_logs,
      v_n_alerts, v_n_aut, v_n_notif
      USING ERRCODE = 'P45DR';
  END IF;

  RETURN jsonb_build_object(
    'resultado',    'anonimizado',
    'candidato_id', p_candidato_id,
    'dry_run',      false,
    'executado_em', now(),
    'plano',        v_plano,
    'passos', jsonb_build_object(
      'tombstone_candidato',     jsonb_build_object('candidatos', v_n_cand),
      'tombstone_decisao_final', jsonb_build_object('decisao_final', v_n_df,
                                                    'decisao_final_historico', v_n_dfh),
      'severar_user_id',         jsonb_build_object('candidatos', v_n_cand,
                                                    'historico_candidatura_ator', v_n_hist),
      'severar_fks_set_null',    jsonb_build_object('ai_call_logs', v_n_aicall,
                                                    'candidate_ai_decisions', v_n_aidec,
                                                    'logs_acesso', v_n_logs,
                                                    'recruiter_alerts', v_n_alerts,
                                                    'autorizacoes', v_n_aut),
      'scrub_ledger_email',      jsonb_build_object('notificacoes_enviadas', v_n_notif)
    )
  );
END;
$anonimizar_candidato$;


-- ---------------------------------------------------------------------------
-- 2 · ACL — REVOKE nominal e só então o GRANT mínimo
-- ---------------------------------------------------------------------------
-- ⚠ NOMEAR `anon` É OBRIGATÓRIO: o `pg_default_acl` do schema `public` concede
-- EXECUTE a `anon` e `authenticated` como grants DIRETOS E NOMEADOS em todo
-- `CREATE FUNCTION` (medido na P42-06). `REVOKE ... FROM PUBLIC` sozinho removeria
-- um grant que nunca existiu e deixaria `anon=X` de pé — numa função que apaga PII
-- de forma irreversível e que, sem isto, nasceria chamável via PostgREST.
REVOKE ALL ON FUNCTION public.anonimizar_candidato(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonimizar_candidato(uuid, boolean) TO service_role;


-- ---------------------------------------------------------------------------
-- 3 · Auto-verificação: EXECUTA o caminho FELIZ e exige COMPLETUDE
-- ---------------------------------------------------------------------------
-- ⚠ ESTE É O BLOCO MAIS IMPORTANTE DESTE ARQUIVO, e a resposta direta ao Pitfall 1:
-- uma sentinela que viola formato só se revela num apply que EXECUTA. "Não lançou"
-- não é "completou" — o gate anterior deste projeto media a recusa e chamava aquilo
-- de cobertura, e o 42804 da P43 sobreviveu a um smoke 10/10 verde.
--
-- Envelope: subtransação encerrada por `RAISE EXCEPTION`, que o Postgres reverte
-- inteira. Método exercitado em PROD pela SONDA 6 (§6d), com verificação de
-- integridade provando zero resíduo — inclusive de DDL, porque Postgres reverte DDL.
--
-- ⚠ ESCOPO HONESTO DESTE BLOCO: ele prova que o tombstone COMPLETA contra as SETE
-- CHECKs vivas e os NOT NULL de `candidatos`, que a faixa é materializada ANTES da
-- sentinela, que os dois `inet` são mascarados de verdade, que a re-execução é
-- no-op por ESTADO e que o dry-run levanta `P45DR` sem mutar nada. A cobertura das
-- demais tabelas do ERASE-09 e a asserção de re-identificação (B9) são do smoke
-- `supabase/tests/p45_motor_exclusao_smoke.sql`, que roda no 45-11 — dizer isso
-- aqui é melhor que deixar a lacuna parecer cobertura.
DO $verifica_anonimizar_candidato$
DECLARE
  v_admin    uuid;
  v_user_a   uuid := gen_random_uuid();
  v_user_b   uuid := gen_random_uuid();
  v_cand_a   uuid;
  v_cand_b   uuid;
  v_log_id   uuid;
  v_aut_id   uuid;
  v_mail_a   text;
  v_mail_b   text;

  v_ret      jsonb;
  v_ret2     jsonb;
  v_faixa    text;
  v_email_d  text;
  v_cel_d    text;
  v_nasc_d   date;
  v_uf_d     char(2);
  v_cpf_d    text;
  v_gen_d    text;
  v_conh_d   text;
  v_nome_d   text;
  v_cid_d    text;
  v_uid_d    uuid;
  v_ip_log   inet;
  v_ip_aut   inet;
  v_uniq     int;
  v_mudou2   int;
  v_snap_a   text;
  v_snap_b   text;
  v_state    text;
  v_levantou boolean := false;
  -- ⚠ 45-12 — o ramo de titularidade, nas duas direções.
  v_st_dono  text;
  v_lev_dono boolean := false;
  v_st_alheio text;
  v_lev_alheio boolean := false;
  v_ufs      text[] := ARRAY['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                             'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
BEGIN
  -- ── PRECONDIÇÕES DE ORDEM DE APPLY, ditas com todas as letras ──────────────
  IF NOT EXISTS (SELECT 1 FROM pg_attribute a
                  WHERE a.attrelid = 'public.candidatos'::regclass
                    AND a.attname  = 'faixa_etaria_materializada'
                    AND NOT a.attisdropped) THEN
    RAISE EXCEPTION 'P45-TOMBSTONE: candidatos.faixa_etaria_materializada NAO existe — a migration 20260805000003 (plano 45-05) precisa ser aplicada ANTES desta. Sem a coluna, o ERASE-01 e inexequivel e a sentinela de data_nascimento moveria a serie EEOC 4/5 retroativamente';
  END IF;

  IF (SELECT a.attnotnull FROM pg_attribute a
       WHERE a.attrelid = 'public.candidatos'::regclass
         AND a.attname  = 'user_id' AND NOT a.attisdropped) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'P45-TOMBSTONE: candidatos.user_id ainda e NOT NULL — a migration 20260805000004 (a S1 do D-45-11) precisa ser aplicada ANTES desta. A SONDA 6 mediu o desfecho exato de tentar sem ela: 23502 null value in column "user_id" violates not-null constraint';
  END IF;

  IF to_regproc('public.plano_exclusao_titular(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P45-TOMBSTONE: public.plano_exclusao_titular(uuid) NAO existe — a migration 20260805000005 precisa ser aplicada ANTES desta. Ela e a expressao UNICA da qual o dry-run e o delete real saem, e este corpo a CHAMA';
  END IF;

  SELECT u.user_id INTO v_admin
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador' AND u.ativo AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'P45-TOMBSTONE: nenhum administrador vivo em usuarios_rh — o caminho FELIZ nao pode ser exercitado sem ator real, e verificar so a recusa foi EXATAMENTE o defeito que a 20260803000001 corrigiu';
  END IF;

  v_mail_a := 'p45tomba+' || replace(v_user_a::text, '-', '') || '@invalido.local';
  v_mail_b := 'p45tombb+' || replace(v_user_b::text, '-', '') || '@invalido.local';

  -- ───────────────────────────────────────────────────────────────────────────
  -- SUBTRANSAÇÃO — tudo daqui até o RAISE final é revertido.
  -- ───────────────────────────────────────────────────────────────────────────
  BEGIN
    -- Fixture A — o titular do caminho FELIZ. Todas as colunas NOT NULL medidas na
    -- SONDA 1a, com valores escolhidos contra as SETE CHECKs vivas da SONDA 1b.
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_mail_a, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);

    INSERT INTO public.candidatos
      (user_id, nome_completo, email, cpf, celular, data_nascimento, genero,
       cidade, estado, como_conheceu, linkedin, instagram, linkedin_url, instagram_url,
       ativo, email_verificado, bloqueado, created_at, updated_at)
    VALUES
      (v_user_a, 'P45 TOMBSTONE verificacao A', v_mail_a,
       '000.000.' || lpad((floor(random() * 1000))::int::text, 3, '0')
                  || '-' || lpad((floor(random() * 100))::int::text, 2, '0'),
       '(11) 98888-7777', DATE '1991-03-14', 'prefiro_nao_informar',
       'Campinas', 'SP', 'site', 'p45-a', 'p45-a',
       'https://linkedin.example/p45-a', 'https://instagram.example/p45-a',
       true, false, false, now(), now())
    RETURNING id INTO v_cand_a;

    -- `ip_address` é `inet NOT NULL` — o mascaramento é o que este par exercita.
    INSERT INTO public.logs_acesso (user_id, evento, ip_address)
    VALUES (v_user_a, 'login_sucesso', '203.0.113.42'::inet)
    RETURNING id INTO v_log_id;

    INSERT INTO public.autorizacoes
      (candidato_id, user_id, autorizacao_uso_dados, autorizacao_comunicacao,
       autorizacao_retencao_curriculo, autorizacao_analise_video, policy_version,
       ip_aceite, user_agent_aceite, created_at, updated_at)
    VALUES
      (v_cand_a, v_user_a, true, true, true, true, 'p45-verifica',
       '198.51.100.77'::inet, 'p45-verifica', now(), now())
    RETURNING id INTO v_aut_id;

    -- Fixture B — só para o dry-run. Separada de propósito: o dry-run tem de ser
    -- medido sobre uma linha que NUNCA foi anonimizada, senão o ramo de
    -- idempotência retornaria antes de o RAISE de dry-run ser alcançado.
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (v_user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            v_mail_b, '', now(), now(),
            '{"provider":"email","providers":["email"],"role":"candidato"}'::jsonb, '{}'::jsonb);

    INSERT INTO public.candidatos
      (user_id, nome_completo, email, celular, data_nascimento,
       cidade, estado, como_conheceu, ativo, email_verificado, bloqueado,
       created_at, updated_at)
    VALUES
      (v_user_b, 'P45 TOMBSTONE verificacao B', v_mail_b,
       '(11) 97777-6666', DATE '1988-07-02', 'Sorocaba', 'SP', 'site',
       true, false, false, now(), now())
    RETURNING id INTO v_cand_b;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, true);

    -- ── (i) O CAMINHO FELIZ ─────────────────────────────────────────────────
    v_ret := public.anonimizar_candidato(v_cand_a, false);

    SELECT c.nome_completo, c.email, c.cpf, c.celular, c.data_nascimento, c.genero,
           c.cidade, c.estado, c.como_conheceu, c.user_id, c.faixa_etaria_materializada
      INTO v_nome_d, v_email_d, v_cpf_d, v_cel_d, v_nasc_d, v_gen_d,
           v_cid_d, v_uf_d, v_conh_d, v_uid_d, v_faixa
      FROM public.candidatos c WHERE c.id = v_cand_a;

    SELECT g.ip_address INTO v_ip_log FROM public.logs_acesso  g WHERE g.id = v_log_id;
    SELECT a.ip_aceite  INTO v_ip_aut FROM public.autorizacoes a WHERE a.id = v_aut_id;

    IF v_ret IS NULL OR (v_ret ->> 'resultado') IS DISTINCT FROM 'anonimizado' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: anonimizar_candidato(id, false) nao devolveu resultado = anonimizado (veio %). A assercao e sobre COMPLETUDE, nao sobre ausencia de excecao: uma funcao que retorna vazio nao provou que chegou ao fim do corpo', coalesce(v_ret::text, '<nulo>');
    END IF;

    -- ⚠ A ORDEM DO ERASE-01, PROVADA E NÃO ASSUMIDA. 1991-03-14 dá idade ~35, logo
    -- faixa 35-44. Se a faixa tivesse sido materializada DEPOIS da sentinela, ela
    -- seria 55+ (o ano 1900), e a série EEOC mudaria retroativamente.
    IF v_faixa IS DISTINCT FROM '35-44' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: faixa_etaria_materializada = % , esperado 35-44. Ou a faixa nao foi materializada, ou foi materializada DEPOIS da sentinela de data_nascimento — e nesse caso o valor gravado e a faixa do ano 1900 (55+), que e a restricao de ordenacao numero 1 do ROADMAP sendo violada (ERASE-01 / SC#5)', coalesce(v_faixa, '<nulo>');
    END IF;

    IF v_email_d !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: a sentinela de e-mail % nao casa o check_email_format vivo — uma sentinela plausivel-mas-invalida aborta a transacao inteira com check_violation, e e esse desfecho que este bloco existe para pegar ANTES do primeiro pedido real', v_email_d;
    END IF;

    SELECT count(*) INTO v_uniq FROM public.candidatos c WHERE c.email = v_email_d;
    IF v_uniq <> 1 THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: a sentinela de e-mail nao e unica por linha (% ocorrencias). A coluna e NOT NULL + UNIQUE + CHECK de formato (D5): uma sentinela FIXA colide na SEGUNDA exclusao e aborta a transacao de quem pediu depois', v_uniq;
    END IF;

    IF v_cel_d !~ '^\(\d{2}\) \d{5}-\d{4}$' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: a sentinela de celular % nao casa o check_celular_format vivo — a coluna e NOT NULL e um marcador em prosa aborta a transacao', v_cel_d;
    END IF;

    IF v_nasc_d IS NULL OR v_nasc_d >= CURRENT_DATE OR v_nasc_d = DATE '1991-03-14' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: data_nascimento = % — tem de ser NAO-NULA, no passado (check_data_nascimento) e DIFERENTE da original', coalesce(v_nasc_d::text, '<nulo>');
    END IF;

    IF v_uf_d IS NULL OR NOT (v_uf_d::text = ANY (v_ufs)) THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: estado = % nao esta entre as 27 UFs do check_estado vivo. Nao existe valor removido valido para esta coluna: a decisao registrada e PRESERVAR a UF, nunca inventar sentinela que a CHECK recusa', coalesce(v_uf_d::text, '<nulo>');
    END IF;

    IF v_cpf_d IS NOT NULL OR v_gen_d IS NOT NULL OR v_conh_d IS NOT NULL THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: cpf=%, genero=%, como_conheceu=% — as tres sao NULAVEIS no catalogo vivo (SONDA 1a / D4) e deveriam ter ido a NULL. O mapa de nullability NAO pode ser lido de docs/sql/sql/02-tabela-candidatos.sql, que declara cpf NOT NULL e diverge do catalogo (Pitfall 9)', coalesce(v_cpf_d, '<nulo>'), coalesce(v_gen_d, '<nulo>'), coalesce(v_conh_d, '<nulo>');
    END IF;

    IF v_nome_d IS NULL OR v_nome_d = 'P45 TOMBSTONE verificacao A'
       OR v_cid_d IS NULL OR v_cid_d = 'Campinas' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: nome=% e cidade=% — as duas sao NOT NULL sem CHECK de formato, e as duas tem de mudar', coalesce(v_nome_d, '<nulo>'), coalesce(v_cid_d, '<nulo>');
    END IF;

    IF v_uid_d IS NOT NULL THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: user_id = % — o passo severar_user_id nao executou. Com o ponteiro de pe, deleteUser cascateia e bate nas tres FKs NO ACTION com 23503 DEPOIS de o curriculo ja ter sido apagado do Storage', v_uid_d;
    END IF;

    -- Os dois `inet`: mascarados DE VERDADE (bits de host zerados) e nunca nulos.
    IF v_ip_log IS NULL OR v_ip_log = '203.0.113.42'::inet OR host(v_ip_log) <> '203.0.113.0' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: logs_acesso.ip_address = % — esperado 203.0.113.0/24. E inet NOT NULL: tem de ser TRUNCADO (bits de host zerados), nunca nulo e nunca so remascarado, porque set_masklen sozinho preserva o endereco completo', coalesce(v_ip_log::text, '<nulo>');
    END IF;

    IF v_ip_aut IS NULL OR v_ip_aut = '198.51.100.77'::inet OR host(v_ip_aut) <> '198.51.100.0' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: autorizacoes.ip_aceite = % — esperado 198.51.100.0/24. E prova de aceite: a linha fica, o endereco nao', coalesce(v_ip_aut::text, '<nulo>');
    END IF;

    -- ── (ii) IDEMPOTÊNCIA POR ESTADO ────────────────────────────────────────
    v_snap_a := (SELECT c::text FROM public.candidatos c WHERE c.id = v_cand_a);
    v_ret2   := public.anonimizar_candidato(v_cand_a, false);
    v_snap_b := (SELECT c::text FROM public.candidatos c WHERE c.id = v_cand_a);

    IF (v_ret2 ->> 'resultado') IS DISTINCT FROM 'ja_anonimizado' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: a segunda chamada devolveu %, e o contrato e retornar ja_anonimizado quando a sentinela e reconhecida. Um retorno indistinguivel do primeiro impede o chamador de saber se ele acabou de apagar algo ou nao', coalesce(v_ret2::text, '<nulo>');
    END IF;

    IF v_snap_b IS DISTINCT FROM v_snap_a THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: a segunda chamada MUTOU a linha. A idempotencia tem de ser por ESTADO — o predicado reconhece a sentinela e retorna sem tocar em nada';
    END IF;

    -- ── (iii) O DRY-RUN, sobre a fixture B ──────────────────────────────────
    v_snap_a := (SELECT c::text FROM public.candidatos c WHERE c.id = v_cand_b);

    BEGIN
      PERFORM public.anonimizar_candidato(v_cand_b, true);
      v_levantou := false;
    EXCEPTION
      WHEN OTHERS THEN
        v_levantou := true;
        v_state    := SQLSTATE;
    END;

    v_snap_b := (SELECT c::text FROM public.candidatos c WHERE c.id = v_cand_b);

    IF NOT v_levantou THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: anonimizar_candidato(..., p_dry_run := true) RETORNOU NORMALMENTE. Ou nao existe ramo de dry-run, ou ele muta e segue em frente. O contrato e terminar o MESMO corpo com RAISE EXCEPTION — nunca dois corpos';
    END IF;

    IF v_state IS DISTINCT FROM 'P45DR' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: o dry-run levantou SQLSTATE % e o combinado desta fase e P45DR. A distincao e a que impede um ERRO REAL de ser lido como "dry-run concluido com sucesso" pela Edge Function do 45-10', coalesce(v_state, '<nulo>');
    END IF;

    IF v_snap_b IS DISTINCT FROM v_snap_a THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: a linha de candidatos MUDOU sob p_dry_run := true. Sob dry-run, zero coluna muda';
    END IF;

    -- ── (iv) O RAMO DE TITULARIDADE (45-12), NAS DUAS DIREÇÕES ──────────────
    -- ⚠ As DUAS são obrigatórias. Sem o caso RECUSADO, o caso ACEITO não prova nada:
    -- um guard que aceitasse todo mundo passaria no primeiro. E o ACEITO é medido por
    -- CHEGAR AO `RAISE` DE DRY-RUN (`P45DR`) — que é o sinal de que o corpo EXECUTOU,
    -- e não apenas de que a chamada não explodiu. Tudo sob `p_dry_run := true`: o
    -- ramo de titularidade é sobre AUTORIZAÇÃO, e exercitá-lo não precisa (nem deve)
    -- mutar uma segunda fixture.
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_user_b::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);

    BEGIN
      PERFORM public.anonimizar_candidato(v_cand_b, true);
      v_lev_dono := false;
    EXCEPTION
      WHEN OTHERS THEN
        v_lev_dono := true;
        v_st_dono  := SQLSTATE;
    END;

    IF NOT v_lev_dono OR v_st_dono IS DISTINCT FROM 'P45DR' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: o PROPRIO TITULAR (papel candidato, dono de p_candidato_id) nao chegou ao RAISE de dry-run (levantou=%, sqlstate=%). Se veio 42501, a metade (b) do guard ainda EXCLUI o titular — e o 45-10 cabeou esta funcao dentro do caminho de execucao dele. O conserto e ESTENDER o guard, nunca afrouxar a metade (a)', v_lev_dono, coalesce(v_st_dono, '<nulo>');
    END IF;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', gen_random_uuid()::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, true);

    BEGIN
      PERFORM public.anonimizar_candidato(v_cand_b, true);
      v_lev_alheio := false;
    EXCEPTION
      WHEN OTHERS THEN
        v_lev_alheio := true;
        v_st_alheio  := SQLSTATE;
    END;

    IF NOT v_lev_alheio OR v_st_alheio IS DISTINCT FROM '42501' THEN
      RAISE EXCEPTION 'P45-TOMBSTONE: um candidato que NAO e o dono alcancou o corpo da anonimizacao de outra pessoa (levantou=%, sqlstate=%). O ramo de titularidade tem de ser por IS DISTINCT FROM e NUNCA por NOT IN: com um dos lados NULL o NOT IN avalia NULL, o IF nao e tomado, e o guard falha ABERTO justamente para o chamador mais suspeito (defeito REAL medido na 42-06). Nesta funcao um guard aberto apaga PII de forma irreversivel', v_lev_alheio, coalesce(v_st_alheio, '<nulo>');
    END IF;

    PERFORM set_config('request.jwt.claims', '', true);

    -- Sinaliza sucesso E reverte a subtransacao inteira. Nada persiste.
    RAISE EXCEPTION 'P45-TOMBSTONE-OK';
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('request.jwt.claims', '', true);
      IF SQLERRM <> 'P45-TOMBSTONE-OK' THEN
        RAISE;
      END IF;
      RAISE NOTICE 'P45-TOMBSTONE OK: o tombstone COMPLETOU contra as 7 CHECKs vivas e os NOT NULL medidos; faixa materializada ANTES da sentinela (35-44); user_id severado; os 2 inet truncados de verdade; re-execucao no-op por ESTADO devolvendo ja_anonimizado; dry-run levantou P45DR sem mutar coluna alguma; o PROPRIO TITULAR foi ACEITO (chegou ao P45DR) e um candidato que nao e o dono foi RECUSADO com 42501. A subtransacao foi revertida e NADA persistiu';
  END;
END
$verifica_anonimizar_candidato$;


-- ---------------------------------------------------------------------------
-- 4 · COMMENT — depois do bloco anônimo, ordem herdada do molde
-- ---------------------------------------------------------------------------
COMMENT ON FUNCTION public.anonimizar_candidato(uuid, boolean) IS
  'Phase 45 / ERASE-02 + ERASE-08 + ERASE-09 + ERASE-10: O TOMBSTONE. Desidentifica o titular '
  'in-place e severa os ponteiros que resolveriam de volta ate a pessoa, TUDO EM UMA TRANSACAO. '
  'Devolve jsonb com resultado, o plano e as contagens por passo. VOLATILE SECURITY DEFINER com '
  'search_path vazio; delimitador NOMEADO para que md5(prosrc) seja extraivel pelo smoke. '
  '⚠ p_dry_run tem DEFAULT true: o modo SEGURO e o padrao, e apagar exige dize-lo. O dry-run '
  'executa o MESMO corpo do delete real e termina nele com RAISE EXCEPTION USING ERRCODE = P45DR, '
  'que reverte tudo. Nunca dois corpos, nunca IF p_dry_run THEN <query A> senao <query B> — essa '
  'forma e o parente direto do CR-02 da P39, uma guarda que era dead code. O ERRCODE e proprio '
  'para que o chamador distinga "dry-run concluido" de erro real. '
  '⚠ CHAMA public.plano_exclusao_titular(uuid) e NAO copia o corpo dela: o dry-run e o delete real '
  'saem da MESMA expressao. A assercao C3 do smoke exige que pg_get_functiondef desta funcao '
  'CONTENHA a chamada, e pina o md5(prosrc) das duas. Com PITR desligado (D-45-10) e o backup de 7 '
  'dias excluindo Storage, o dry-run nao e processo: e a UNICA rede desta fase. '
  '⚠ IDEMPOTENCIA POR ESTADO, nunca por try/catch: o predicado RECONHECE a sentinela de e-mail e '
  'devolve ja_anonimizado sem mutar coluna alguma e sem criar linha de auditoria. Apagar de novo '
  '"porque nao da erro" funciona por acidente e para de funcionar no dia em que a enumeracao '
  'devolver algo novo — e nesse dia a evidencia de que ja tinha rodado nao existe. '
  'MAPA passo_motor -> statements (PASSOS_MOTOR de reciboExclusao.ts): '
  'tombstone_candidato = os DOIS updates em candidatos (faixa etaria PRIMEIRO, depois as '
  'sentinelas); tombstone_decisao_final = update em decisao_final e, DEPOIS dele, o scrub de '
  'decisao_final_historico; severar_user_id = user_id/created_by/updated_by em candidatos mais '
  'historico_candidatura.ator; severar_fks_set_null = os cinco updates das tabelas do ERASE-09; '
  'scrub_ledger_email = update em notificacoes_enviadas. storage_remove e auth_delete_user sao de '
  'FORA do banco (45-10). '
  '⚠⚠ ORDEM QUE E MECANISMO, EM DOIS PONTOS. (1) faixa_etaria_materializada e escrita ANTES da '
  'sentinela de data_nascimento: gerar_bias_snapshot deriva a idade por JOIN vivo, toda data no '
  'passado tem idade, e materializar depois gravaria a faixa do ano 1900 — a serie EEOC 4/5 '
  'mudaria RETROATIVAMENTE (ERASE-01 / SC#5). (2) o scrub de decisao_final_historico e o ULTIMO '
  'statement a tocar o par, DEPOIS do update em decisao_final: trg_decisao_final_snapshot '
  '(20260709000011:105-118) e AFTER UPDATE FOR EACH ROW SEM clausula WHEN e insere OLD.justificativa '
  'no arquivo, ou seja o proprio update de anonimizacao RECRIA no historico a PII que acabou de '
  'remover da linha corrente. Fazer o scrub antes deixa uma linha identificavel recem-criada atras '
  'dele. O operador antecipou isto ao travar a BD-9: "o historico entrega o que a linha corrente '
  'protege". '
  '⚠ NENHUMA SENTINELA FOI ESCOLHIDA POR PARECER RAZOAVEL — cada uma foi escolhida contra a lista '
  'de constraints lida do catalogo VIVO (45-SONDAS-PROD.md SONDA 1, 2026-08-05), nunca contra '
  'docs/sql/sql/02-tabela-candidatos.sql, que e de 2025 e diverge em pelo menos cpf. '
  'email: NOT NULL + UNIQUE + check_email_format -> sentinela UNICA POR LINHA e no formato (uma '
  'sentinela FIXA colidiria na SEGUNDA exclusao e abortaria a transacao de quem pediu depois). '
  'celular: NOT NULL + check_celular_format -> (00) 00000-0000. '
  'data_nascimento: NOT NULL + check_data_nascimento -> 1900-01-01, escolhida tambem para CAIR '
  'FORA de qualquer faixa etaria real, senao a busca por faixa + UF + vaga + timestamp reacha o '
  'titular (assercao B9). '
  'cpf, genero e como_conheceu: NULAVEIS no catalogo vivo -> NULL (check sobre NULL e NULL). '
  'como_conheceu tem a SETIMA CHECK, check_como_conheceu, que a pesquisa nao previu. '
  'nome_completo e cidade: NOT NULL sem CHECK -> marcadores livres. '
  'linkedin/instagram: sao QUATRO colunas (dois pares duplicados) -> NULL. avatar_url idem. '
  '⚠ estado E PRESERVADA, E A ALTERNATIVA FOI RECUSADA EXPLICITAMENTE: a coluna e bpchar NOT NULL '
  'com check_estado aceitando as 27 UFs, e NAO EXISTE valor removido valido. Mexer na CHECK dentro '
  'de uma fase irreversivel e risco maior que o dado retido; a UF sozinha nao re-identifica, e o '
  'que fecha o vetor de re-identificacao e a faixa etaria deixar de casar (ERASE-01). '
  '⚠ candidate_ai_decisions declara candidato_id E vaga_id NOT NULL com clausula SET NULL — '
  'contradicao estrutural que nunca pode ser cumprida (achado M2). ESCOLHA REGISTRADA: '
  'desidentificar o CONTEUDO (ai_reasoning_summary), nao afrouxar as colunas, porque a fase foi '
  'desenhada para conter UMA unica migration destrutiva de schema. O corpo LE attnotnull ao vivo: '
  'se alguem afrouxar a coluna depois, o mesmo statement passa a severar o ponteiro tambem. '
  '⚠ OS DOIS inet SAO TRUNCADOS, NUNCA ANULADOS: logs_acesso.ip_address e inet NOT NULL e NULL '
  'abortaria a transacao inteira. network(set_masklen(...)) zera os bits de host de verdade; '
  'set_masklen sozinho preservaria o endereco completo e seria mascaramento de fachada. '
  '⚠ dedupe_key E RE-NAMESPACEADA (formato evento:candidatura_id:purgado-id, e a coluna e UNIQUE): '
  'sem isso um recadastro futuro colide, o claim ON CONFLICT DO NOTHING RETURNING id volta VAZIO, '
  'e o e-mail legitimo NUNCA E ENVIADO, sem erro em lugar nenhum (Pitfall 8, item 2). '
  '⚠ EFEITO COLATERAL REGISTRADO: com historico_candidatura.ator nulo a linha passa a PARECER '
  'escrita pelo sistema. auto_rejeitado e boolean ARMAZENADO, entao a prova RNF-07a sobrevive, mas '
  'qualquer leitor que derive "foi o sistema" de ator IS NULL passa a mentir — dependencia '
  'declarada da W-1/CONSOL-02 da Phase 47. '
  '⚠ O QUE ESTA FUNCAO NUNCA FAZ: nao remove linha de tabela alguma; nao toca as 3 FKs NO ACTION '
  'da trilha de decisao (o 23503 e o schema fazendo o trabalho certo, e afrouxar a constraint e o '
  'atalho que o ERASE-08 proibe); nao anula decisao_final.justificativa nem '
  'decisao_final_historico.justificativa (as duas sao NOT NULL e sao PRESERVADAS ANONIMIZADAS por '
  'D-45-02/D-45-03 — o texto sobrevive como prova de nao-discriminacao, o vinculo nao); nao toca '
  'deleted_at nem ativo (5 leituras de RH filtram por deleted_at e um soft delete faria a linha '
  'sumir de todas em silencio); e nao escreve em logs_auditoria, porque os dois enums daquela '
  'tabela nao puderam ser medidos por este plano e um valor inventado abortaria a anonimizacao no '
  'pedido real, depois de o curriculo ja ter sido apagado. '
  '⚠ OBRIGACAO DO CHAMADOR: o guard le a CLAIM (auth.uid e app_metadata.role), nao o papel do '
  'banco. Um cliente service_role SEM Authorization de usuario tem auth.uid() NULO e recebe 42501 '
  '— passar as claims e obrigacao declarada da Edge Function do 45-10, e a assercao C2 do smoke a '
  'exige das cinco funcoes da fase. '
  'GUARD NULL-SAFE em duas metades: (a) recusa 42501 o chamador SEM CLAIM NENHUMA; (b) recusa quem '
  'nao e rh, nao e administrador E nao e o dono de p_candidato_id. As TRES comparacoes da metade '
  '(b) sao por IS DISTINCT FROM e nunca por NOT IN, que avalia NULL, nao toma o IF e falha ABERTO '
  'para anon; com o candidato inexistente ou ja severado o dono resolve NULL, '
  'NULL IS DISTINCT FROM <uid> e TRUE, e a funcao recusa. '
  '⚠ POR QUE O TITULAR ESTA ENTRE OS CHAMADORES ACEITOS, E A RAZAO E DATAVEL (45-12): o plano '
  '45-07 desenhou esta funcao como funcao de OPERADOR (rh/administrador, GRANT so a service_role) '
  'e o plano 45-10 — escrito depois — a cabeou dentro do caminho de execucao DO PROPRIO TITULAR, '
  'cujo papel de aplicacao e candidato. As duas metades estavam certas isoladamente; a junta nao '
  'estava. O conserto ESTENDE a metade (b); a metade (a) NAO foi tocada, e aceitar '
  'auth.uid() IS NULL sob service_role e a saida RECUSADA — deixaria uma funcao que apaga PII '
  'irreversivelmente sem controle nenhum no corpo. '
  'ACL: REVOKE ALL de PUBLIC e anon NOMINALMENTE. Alem do GRANT a service_role, a migration '
  '20260805000009 (plano 45-12) concede EXECUTE a authenticated, porque o PostgREST deriva o PAPEL '
  'do MESMO JWT que carrega as claims: o client da Edge Function que repassa o Authorization do '
  'titular chega como authenticated. O precedente e a Phase 44 — o ACL abre a porta ao papel e o '
  'guard do corpo decide quem passa.';
