-- =============================================================================
-- Phase 47 / Plano 47-02 — CONSOL-02 / VISRH-03
-- O Histórico deixa de mostrar um UUID: quem agiu em cada transição passa a ser
-- resolvido **no servidor**, como RÓTULO de texto, sem abrir `usuarios_rh` a ninguém.
-- =============================================================================
--
-- Requirement:          CONSOL-02 (SC#2 do ROADMAP · VISRH-03 · W-1)
-- Decisão de origem:    47-CONTEXT §Área 2 + §Área 5 (os QUATRO rótulos da D-47-U08)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 47-02, Task 1
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION É DE LEITURA. ELA NÃO ESCREVE E NÃO APAGA NENHUMA LINHA.**
--
-- Nenhum `DELETE`, nenhum `UPDATE`, nenhuma alteração de tabela, nenhuma policy
-- tocada, nenhum gatilho tocado. Ela cria UMA função de leitura, revoga/concede o
-- EXECUTE dela, verifica a si mesma por leitura de catálogo e escreve UM `COMMENT`.
--
-- -----------------------------------------------------------------------------
-- (1) POR QUE UMA RPC, E NÃO UM `JOIN` NO CLIENTE NEM UMA VIEW
-- -----------------------------------------------------------------------------
-- O nome do recrutador mora em `usuarios_rh`, ADMIN-ONLY desde a SEG-02. Um
-- recrutador comum lendo o hub **não tem** permissão de consultar a tabela de
-- usuários — resolver no cliente exigiria abri-la, e abrir a tabela de funcionários
-- para consertar a exibição de um UUID é trocar um defeito cosmético por um vetor de
-- enumeração de pessoal.
--
-- ⚠ A alternativa "VIEW com `security_invoker = true`" foi REJEITADA POR MEDIÇÃO, não
-- por preferência: ela preservaria a RLS de graça, mas o `LEFT JOIN` com `usuarios_rh`
-- seria avaliado com os direitos do CHAMADOR, e o recrutador comum veria NULL em toda
-- linha. Preservaria a segurança e não entregaria o requirement.
--
-- -----------------------------------------------------------------------------
-- (2) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- O plano 47-02 apenas AUTORA este arquivo; **nenhuma wave desta fase mistura escrever
-- uma migration com aplicá-la**.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua própria
-- transação implícita, e o BEGIN/COMMIT externo é o gatilho documentado do SQLSTATE
-- 42601 ("cannot insert multiple commands into a prepared statement") quando há corpo
-- delimitado por cifrões adjacente a `COMMENT`/`GRANT`/`REVOKE` — CLAUDE.md §Migrations.
--
-- ⚠ Higiene deste arquivo: os corpos usam delimitadores NOMEADOS
-- (`fn_historico` / `verifica_historico`) e o par de cifrões anônimo não aparece
-- literalmente em lugar nenhum, nem dentro de comentário.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. `apply_migration` carimba a PRÓPRIA `version` — um
-- timestamp do instante do apply, não o do nome deste arquivo. Reconciliar logo depois:
--
--   supabase migration repair --status applied 20260809000001
--
-- ou, direto no ledger:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260809000001'
--    WHERE name LIKE '%p47_listar_historico_candidatura%';
--
-- Sem o reparo o CLI leria este arquivo como NÃO aplicado. (Aqui a reaplicação seria
-- benigna — `CREATE OR REPLACE` é idempotente — mas o ledger divergente contamina o
-- diagnóstico de toda migration seguinte.)
--
-- ⚠ FIDELIDADE DO CONTEÚDO. O ledger guarda o SQL literalmente aplicado em
-- `supabase_migrations.schema_migrations.statements text[]`. Conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260809000001';
--
-- -----------------------------------------------------------------------------
-- (3) PROVENIÊNCIA — e as TRÊS armadilhas MEDIDAS que esta migration desarma
-- -----------------------------------------------------------------------------
--   · FORMA copiada de `20260803000001_p43_fix_listar_matriz_cast.sql`
--     (`listar_matriz_retencao`): `STABLE SECURITY DEFINER SET search_path = ''`,
--     guard NULL-safe no corpo, ordem `REVOKE`/`GRANT` → `DO` → `COMMENT`.
--     **A FORMA é o molde. A JUNÇÃO NÃO É.**
--
--   ⚠ ARMADILHA 1 — A CHAVE DE JUNÇÃO NÃO É A DO PRECEDENTE.
--     `historico_candidatura.ator` referencia **`auth.users(id)`**
--     (`20260607000001:43`), e aquela migration alerta EM MAIÚSCULAS contra confundir
--     com a tabela legada `historico_acoes`, cuja FK aponta para `usuarios_rh.id`.
--     O precedente que se está copiando junta por `u.id = c.alterado_por`, e
--     `usuarios_rh` tem AS DUAS COLUNAS (`id` PK e `user_id` → auth.users). Nada no
--     TIPO denuncia o erro: os dois lados são `uuid`.
--     **Clone verbatim ⇒ ZERO linhas resolvem**, todas caem em "Recrutador removido",
--     a tela fica plausível, a suíte fica verde e o requirement é entregue ao
--     contrário. A junção correta é `u.user_id = h.ator`, e o `DO` block ao final
--     REPROVA O APPLY se a definição vier com a outra.
--
--   ⚠ ARMADILHA 2 — `usuarios_rh.nome_completo` É `varchar(255)`.
--     Este projeto JÁ SHIPPOU ESTE BUG, NESTA COLUNA, NUMA RPC DESTA FORMA: a versão
--     de `20260801000002` declarava `text` no `RETURNS TABLE` e levantava
--     `42804 — structure of query does not match function result type` em **TODA
--     chamada bem-sucedida**; `/admin/retencao` não carregava para ninguém
--     (`.planning/STATE.md:752`). `RETURN QUERY` exige IDENTIDADE de tipo, não
--     compatibilidade de atribuição. Daí o `::text` explícito — e o `DO` block
--     reprova o apply se ele sumir.
--
--   ⚠ ARMADILHA 3 — `SECURITY DEFINER` APAGA UM ESCOPO DE ACESSO QUE JÁ EXISTE.
--     A RLS `rh_le_historico` não é role-only desde a Phase 32: ela é **VAGA-SCOPED**
--     (`20260715000002` Part 2, WR-04), e a própria migration registra que
--     "DEFINER bypasses row RLS". Trocar o `select` direto de
--     `historicoCandidaturaService.listHistorico` por uma RPC DEFINER **remove** esse
--     escopo a menos que o corpo o reimponha. O bloco (2) do corpo é essa reimposição,
--     com o predicado COPIADO da policy, não reinventado.
--
--   ⚠ E A PORTA QUE ESTA FASE ABRE: `candidato_le_proprio_historico`
--     (`20260607000006:60-70`) CONTINUA VIVA — a Phase 32 declarou explicitamente que
--     não a tocou. O docblock do serviço diz "candidate DB-denied" e isso é verdade
--     sobre a MONTAGEM DA TELA e falso sobre o BANCO. Um `GRANT EXECUTE TO
--     authenticated` sem guard de papel no corpo exporia `nome_completo` de
--     recrutadores AO CANDIDATO — um vazamento de PII de funcionário que **não existe
--     hoje**, criado pela porta aberta para consertar um UUID. O guard do bloco (1) é
--     o único controle que o impede.
--
-- -----------------------------------------------------------------------------
-- (4) ONDE ESTA MIGRATION DIVERGE DO MOLDE, E A DIVERGÊNCIA É DELIBERADA
-- -----------------------------------------------------------------------------
--   · O `DO` block do precedente EXECUTA o caminho feliz com fixture. Aqui ele é de
--     **CATÁLOGO** (`pg_get_functiondef` + `pg_proc`): montar candidato, candidatura e
--     usuário RH com todas as colunas obrigatórias dentro de uma subtransação custa
--     mais do que vale, e o caminho feliz com dado REAL é o smoke
--     `supabase/tests/p47_historico_smoke.sql`, asserção (a), que roda contra o banco
--     vivo depois deste apply. O que o `DO` block precisa garantir é que as duas
--     armadilhas de FORMA (junção e cast) não consigam sequer ser aplicadas.
--
--   · O guard tem DOIS blocos, não um: papel **e** escopo por vaga. O precedente é
--     admin-only e não precisa do segundo.
--
--   · O predicado do escopo vive INTEIRO no `ON` do `EXISTS` (sem `WHERE`), porque
--     `JOIN ... ON` e `WHERE` são equivalentes num inner join e a ausência de `WHERE`
--     antes do `LEFT JOIN` mantém legível, para leitor e para guard automático, que a
--     ÚNICA cláusula `WHERE` deste arquivo vem DEPOIS da condição de deleção.
--
-- -----------------------------------------------------------------------------
-- (5) A ESPEC EXECUTÁVEL QUE ESTA MIGRATION TEM DE SATISFAZER
-- -----------------------------------------------------------------------------
-- `supabase/tests/p47_historico_smoke.sql`, asserções (a) a (f). Ele é CONTRATO: se
-- algo divergir, corrige-se ESTA migration, nunca o smoke.
--
-- ⚠ E a asserção (a) é a razão de o smoke existir. O smoke da fase que introduziu o
-- `42804` passou **10/10** porque a única asserção sobre aquela função testava a
-- RECUSA sem claim: o guard levanta na primeira linha e o `RETURN QUERY` nunca
-- executava. Um contador de asserções verdes mede caminhos EXERCITADOS, não caminhos
-- EXISTENTES.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- A função: quem agiu, resolvido no servidor, como TEXTO
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_historico_candidatura(p_candidatura_id uuid)
RETURNS TABLE (
  etapa_de       public.etapa_processo,
  etapa_para     public.etapa_processo,
  ator_rotulo    text,           -- resolvido no servidor; o uuid do ator NUNCA sai daqui
  criterio_texto text,
  criado_em      timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn_historico$
DECLARE
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- (1) GUARD DE PAPEL — PRIMEIRO STATEMENT, E NULL-SAFE.
  --
  -- ⚠ `IS DISTINCT FROM`, NUNCA o idioma difundido `NOT IN ('rh','administrador')`.
  -- Com a claim ausente a expressão de pertinência negativa avalia NULL, o `IF` **não
  -- é tomado**, e o guard FALHA ABERTO exatamente para o chamador mais suspeito.
  -- Defeito REAL medido na 42-06
  -- (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
  --
  -- ⚠ E aqui ele é o ÚNICO controle contra um vazamento NOVO: a policy própria do
  -- candidato (`candidato_le_proprio_historico`, 20260607000006:60-70) continua VIVA,
  -- então o candidato não é recusado pelo banco — só por este guard. Sem ele, o
  -- `GRANT EXECUTE TO authenticated` abaixo entregaria `nome_completo` de recrutadores
  -- a qualquer candidato autenticado.
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas rh ou administrador podem ler o historico da candidatura'
      USING ERRCODE = '42501';
  END IF;

  -- (2) REIMPOSIÇÃO DO ESCOPO POR VAGA — o bloco sem o qual esta fase REGRIDE.
  --
  -- ⚠ `SECURITY DEFINER` BYPASSA a RLS de linha, e `rh_le_historico` não é role-only
  -- desde a Phase 32: ela é vaga-scoped (`20260715000002` Part 2, WR-04, e a própria
  -- migration escreve "DEFINER bypasses row RLS"). Trocar o `select` direto do serviço
  -- por esta RPC REMOVE esse escopo a menos que ele seja reimposto AQUI.
  --
  -- O predicado é COPIADO da policy, não reinventado — reescrevê-lo reabriria uma
  -- auditoria já fechada (SEG-02 / WR-04). `administrador` continua vendo tudo, que é
  -- exatamente o que a policy diz.
  --
  -- Sem este bloco a regressão é SILENCIOSA NA UI: nada muda de aparência e um
  -- recrutador passa a ler o histórico de candidaturas de vagas que não são dele.
  IF v_role = 'rh' AND NOT EXISTS (
    SELECT 1
      FROM public.candidaturas c
      JOIN public.vagas v
        ON v.id = c.vaga_id
       AND c.id = p_candidatura_id
       AND v.created_by = (select auth.uid())
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: a candidatura pedida nao pertence a uma vaga criada por este recrutador'
      USING ERRCODE = '42501';
  END IF;

  -- (3) A PROJEÇÃO E OS QUATRO RÓTULOS (D-47-U08).
  --
  -- ⚠ A ORDEM DOS RAMOS É CONTRATO, NÃO ESTILO. O ramo de ator nulo vem PRIMEIRO:
  -- se ele não viesse, a comparação `h.ator = cand.user_id` avaliaria NULL para a
  -- transição automática, o `CASE` cairia no `ELSE`, e "Sistema" viraria "Recrutador
  -- removido" — a colisão que a Correção factual 3 da 47-UI-SPEC identificou,
  -- reintroduzida por ordem de cláusula. `ator IS NULL` JÁ significa "Sistema" hoje
  -- (`HistoricoBlock.tsx:68`), e é o caso MAJORITÁRIO da trilha.
  RETURN QUERY
  SELECT h.etapa_de,
         h.etapa_para,
         CASE
           -- 1 · transição automática/serviço: `ator` nulo (D-09). O RAMO É O PRIMEIRO.
           WHEN h.ator IS NULL THEN 'Sistema'::text
           -- 2 · o ator é o próprio titular daquela candidatura (a inscrição, tipicamente)
           WHEN h.ator = cand.user_id THEN 'O próprio candidato'::text
           -- 3 · resolveu para um usuário RH vivo → o NOME COMPLETO, nunca abreviado.
           --     ⚠ `::text` OBRIGATÓRIO: `nome_completo` é varchar(255) e `RETURN QUERY`
           --     sob `RETURNS TABLE` exige IDENTIDADE de tipo — sem o cast, 42804 em
           --     TODA chamada bem-sucedida. Já aconteceu neste repositório.
           WHEN u.nome_completo IS NOT NULL THEN u.nome_completo::text
           -- 4 · ator NÃO-nulo que não resolve para nenhum usuário vivo → falha de
           --     RESOLUÇÃO (nunca derivada de `ator IS NULL`, que é o ramo 1).
           ELSE 'Recrutador removido'::text
         END,
         h.criterio_texto,
         h.criado_em
    FROM public.historico_candidatura h
    JOIN public.candidaturas cv   ON cv.id = h.candidatura_id
    JOIN public.candidatos   cand ON cand.id = cv.candidato_id
    -- ⚠ ARMADILHA 1, DESARMADA AQUI: a junção é por `u.user_id`, NUNCA por `u.id`.
    -- `ator` é FK para **auth.users** (20260607000001:43); `usuarios_rh.id` é a PK
    -- interna e nunca aparece em `historico_candidatura`. Junção pelo outro lado ⇒
    -- ZERO linhas resolvem e todas caem no ramo 4, em silêncio.
    --
    -- ⚠ `u.deleted_at IS NULL` vive NO `ON`, jamais no `WHERE`: no `WHERE` o `LEFT
    -- JOIN` viraria `INNER` e apagaria justamente as linhas que o ramo 4 existe para
    -- mostrar. E só `deleted_at` participa — `ativo = false` com `deleted_at` nulo
    -- CONTINUA exibindo o nome: desativado não é removido, e quem agiu naquela data
    -- agiu (regra travada da 47-UI-SPEC).
    LEFT JOIN public.usuarios_rh u
           ON u.user_id = h.ator
          AND u.deleted_at IS NULL
   WHERE h.candidatura_id = p_candidatura_id
   ORDER BY h.criado_em DESC
   LIMIT 100;   -- espelha o bound defensivo que o serviço já aplica hoje (WR-05)
END;
$fn_historico$;


-- ---------------------------------------------------------------------------
-- ACL: fecha primeiro, abre depois — e o `anon` é NOMEADO
-- ---------------------------------------------------------------------------
-- `REVOKE ALL ... FROM PUBLIC` sozinho NÃO remove o grant que o `pg_default_acl` de
-- `public` concede a `anon` em todo `CREATE FUNCTION` — ele é direto e nomeado.
-- O `GRANT` a `authenticated` é o que a superfície exige (PostgREST), e é EXATAMENTE
-- por isso que o guard de papel do corpo é obrigatório: `authenticated` inclui o
-- candidato.
REVOKE ALL ON FUNCTION public.listar_historico_candidatura(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_historico_candidatura(uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- Auto-verificação DE CATÁLOGO — as duas armadilhas de forma ficam INAPLICÁVEIS
-- ---------------------------------------------------------------------------
-- Este bloco lê a definição RECÉM-CRIADA e reprova o apply inteiro se ela não for a
-- que este arquivo descreve. É a única camada que roda ANTES de qualquer tela existir
-- — o smoke roda depois, e um requirement entregue ao contrário com a suíte verde é
-- precisamente o que não pode chegar até lá.
--
-- ⚠ Os padrões abaixo são escritos como REGEX (com `\s`, `\w`, `\m`) e não como
-- literais de SQL: um guard cujo próprio texto contém a string proibida passa a se
-- acusar, e um guard de arquivo que procurasse a string proibida encontraria ESTA
-- linha. A regex descreve a forma sem escrevê-la.
DO $verifica_historico$
DECLARE
  v_def       text;
  v_secdef    boolean;
  v_config    text[];
  v_acl       aclitem[];
  v_pub       int;
  v_anon      int;
  v_auth      int;
BEGIN
  SELECT pg_get_functiondef(p.oid), p.prosecdef, p.proconfig, p.proacl
    INTO v_def, v_secdef, v_config, v_acl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'listar_historico_candidatura'
     AND p.pronargs = 1;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'P47-02 FAIL: public.listar_historico_candidatura(uuid) NAO existe apos o CREATE — o apply nao produziu a funcao';
  END IF;

  -- (a) A JUNÇÃO CERTA — pela coluna que aponta para auth.users.
  IF v_def !~* ('\mON\s+' || '\w+\.user_id\s*=\s*' || '\w+\.ator\M') THEN
    RAISE EXCEPTION 'P47-02 FAIL (a): a definicao aplicada NAO junta usuarios_rh pela coluna que aponta para auth.users. historico_candidatura.ator e FK de auth.users (20260607000001:43); sem essa juncao ZERO linhas resolvem o nome e TODAS caem no rotulo de recrutador removido — com a suite verde';
  END IF;

  -- (b) ⊖ A JUNÇÃO ERRADA — pela PK interna de `usuarios_rh` contra o ator.
  IF v_def ~* ('\mON\s+' || '\w+\.id\s*=\s*' || '\w+\.ator\M') THEN
    RAISE EXCEPTION 'P47-02 FAIL (b): a definicao aplicada junta a PK interna de usuarios_rh contra o ator — e o clone verbatim de listar_matriz_retencao, cuja chave e outra. usuarios_rh tem AS DUAS colunas e ambas sao uuid, entao nada no tipo denuncia o erro: o resultado e o requirement entregue ao contrario';
  END IF;

  -- (c) O CAST EXPLÍCITO — `nome_completo` é varchar(255).
  IF v_def !~* 'nome_completo\s*::\s*text' THEN
    RAISE EXCEPTION 'P47-02 FAIL (c): a definicao aplicada projeta nome_completo SEM cast explicito para text. A coluna e varchar(255) e RETURN QUERY sob RETURNS TABLE exige identidade de tipo: a funcao levantaria 42804 em TODA chamada bem-sucedida — o defeito exato que derrubou /admin/retencao inteira (STATE.md:752)';
  END IF;

  -- (d) A POSTURA — DEFINER com search_path vazio.
  IF NOT v_secdef THEN
    RAISE EXCEPTION 'P47-02 FAIL (d): a funcao aplicada NAO e SECURITY DEFINER — sem DEFINER o LEFT JOIN roda com os direitos do chamador e usuarios_rh e admin-only desde a SEG-02: o recrutador comum veria NULL em toda linha';
  END IF;
  -- ⚠ O padrao aceita `search_path=` e `search_path=''`: o catalogo grava a forma
  -- normalizada, e um gate que exigisse UMA das duas grafias reprovaria uma funcao
  -- CORRETA. Um gate que reprova o trabalho certo treina quem executa a desliga-lo.
  IF v_config IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(v_config) AS cfg WHERE cfg ~ '^search_path=(''''|"")?$'
  ) THEN
    RAISE EXCEPTION 'P47-02 FAIL (d): a funcao aplicada NAO fixa search_path vazio (proconfig = %) — um DEFINER com search_path herdado do chamador e sequestravel por objeto homonimo em schema anterior', coalesce(array_to_string(v_config, ','), '<nulo>');
  END IF;

  -- (e) ⊖ O ACL — nem PUBLIC nem `anon`; `authenticated` com EXECUTE.
  IF v_acl IS NULL THEN
    RAISE EXCEPTION 'P47-02 FAIL (e): proacl NULO — nenhum REVOKE/GRANT explicito vigora, logo o default ACL (que concede EXECUTE a anon) esta em vigor e a funcao e chamavel sem autenticacao nenhuma';
  END IF;

  SELECT count(*) FILTER (WHERE a.grantee = 0),
         count(*) FILTER (WHERE g.rolname = 'anon'),
         count(*) FILTER (WHERE g.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE')
    INTO v_pub, v_anon, v_auth
    FROM aclexplode(v_acl) a
    LEFT JOIN pg_roles g ON g.oid = a.grantee;

  IF v_pub <> 0 THEN
    RAISE EXCEPTION 'P47-02 FAIL (e): o ACL concede privilegio a PUBLIC (proacl = %) — qualquer papel do banco leria nomes de recrutadores', v_acl::text;
  END IF;
  IF v_anon <> 0 THEN
    RAISE EXCEPTION 'P47-02 FAIL (e): o ACL concede privilegio ao papel anon (proacl = %) — o REVOKE precisa NOMEAR anon, nao apenas PUBLIC, porque o default ACL de public concede EXECUTE a anon em todo CREATE FUNCTION', v_acl::text;
  END IF;
  IF v_auth <> 1 THEN
    RAISE EXCEPTION 'P47-02 FAIL (e): authenticated NAO tem EXECUTE (proacl = %) — a tela de RH nao conseguiria chamar a funcao', v_acl::text;
  END IF;

  RAISE NOTICE 'P47-02 OK: juncao por user_id, cast explicito, DEFINER com search_path vazio, ACL sem PUBLIC e sem anon. O caminho feliz com dado real e provado pelo smoke p47_historico_smoke.sql, assercao (a)';
END
$verifica_historico$;


COMMENT ON FUNCTION public.listar_historico_candidatura(uuid) IS
  'Phase 47 / CONSOL-02 (VISRH-03): le a trilha de transicoes de UMA candidatura com o '
  'ROTULO de quem agiu ja resolvido no servidor. O uuid do ator NUNCA sai da funcao. '
  'STABLE SECURITY DEFINER com search_path vazio. Existe para que a tela de RH nunca '
  'precise de acesso a usuarios_rh (admin-only desde a SEG-02). '
  'CHAVE DE JUNCAO: usuarios_rh.user_id = historico_candidatura.ator. ⚠ NAO e a chave do '
  'precedente listar_matriz_retencao, que junta pela PK interna: ator e FK de auth.users '
  '(20260607000001:43), nao de usuarios_rh. usuarios_rh tem AS DUAS colunas e ambas sao '
  'uuid, entao a juncao pelo lado errado nao falha — ela resolve ZERO linhas em silencio. '
  'CAST: nome_completo e varchar(255) e o RETURNS TABLE declara text; sem ::text a funcao '
  'levanta 42804 em toda chamada bem-sucedida (defeito ja shippado nesta coluna, STATE.md:752). '
  'ESCOPO POR VAGA NO CORPO: DEFINER bypassa a RLS rh_le_historico, que a Phase 32 tornou '
  'vaga-scoped (WR-04); o predicado da policy e reimposto no bloco 2 e um recrutador que peca '
  'candidatura de vaga alheia recebe 42501. Sem esse bloco a regressao seria SILENCIOSA na UI. '
  'GUARD DE PAPEL NULL-SAFE (IS DISTINCT FROM, nunca NOT IN — o NOT IN falha ABERTO com claim '
  'nula, defeito medido na 42-06): e o unico controle que impede o CANDIDATO de chamar esta '
  'funcao, porque a policy candidato_le_proprio_historico continua VIVA no banco e o GRANT e a '
  'authenticated. '
  'QUATRO ROTULOS, e a ORDEM DOS RAMOS e contrato: (1) ator nulo -> Sistema, PRIMEIRO ramo; '
  '(2) ator = user_id do titular -> O proprio candidato; (3) resolveu para RH vivo -> '
  'nome_completo completo, nunca abreviado; (4) nao resolveu -> Recrutador removido. Se (1) nao '
  'vier primeiro, a comparacao com o titular avalia nulo, cai no ELSE, e Sistema vira Recrutador '
  'removido. deleted_at IS NULL vive no ON do LEFT JOIN (no WHERE viraria INNER e apagaria as '
  'linhas do rotulo 4); ativo NAO participa — desativado nao e removido e quem agiu naquela data '
  'agiu. '
  '⚠ RESIDUO DECLARADO, ACEITO POR DECISAO (D-47-U09): depois de uma exclusao da Phase 45 o '
  'ponteiro do titular e severado (ator := NULL, 20260805000006) e a linha de inscricao passa a '
  'ler Sistema. Um 5o rotulo descreveria o fato — e informaria a um recrutador, numa tela de '
  'funil, que aquela pessoa exerceu o direito de exclusao, vazamento proibido textualmente pela '
  'Invariante 9 da 45-UI-SPEC. Entre imprecisao de autoria numa linha e vazamento de exercicio '
  'de direito, o contrato escolhe a imprecisao — escrita aqui, nao descoberta depois.';
