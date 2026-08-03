-- =============================================================================
-- Phase 43 / Plan 43-06 — RETEN-04
-- O predicado de retenção nasce como UMA definição, e a prévia read-only o
-- consome em forma AGREGADA: quantos seriam afetados, por estado, sem executar
-- nada e sem nomear ninguém.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO ESCREVE E NÃO APAGA NENHUMA LINHA DE CANDIDATO.**
--
-- Ela cria TRÊS funções de leitura. Nenhuma delas contém verbo de escrita (o
-- smoke mede isso sobre `prosrc`, asserção (g)). Não cria cron, não agenda nada,
-- não arma gatilho nenhum. A purga é a Phase 46; aqui nasce só a DEFINIÇÃO que
-- ela vai consumir, mais a contagem que um administrador pode olhar hoje.
--
-- ⚠ POR QUE A DEFINIÇÃO NASCE AQUI E NÃO NA PHASE 46 — é o plano inteiro:
-- o dry-run da purga tem de ser gerado pela MESMA query do `DELETE` real. Um
-- dry-run que diverge do predicado é decoração, e este projeto já embarcou essa
-- classe de falha uma vez (P39 CR-02: uma guarda que era dead code). Se a
-- definição nascer aqui e a Phase 46 CHAMAR esta função em vez de reescrever o
-- predicado, a 46 herda o requirement satisfeito POR CONSTRUÇÃO — e o gate de
-- md5 do smoke reprova quem tentar criar a segunda cópia.
--
-- -----------------------------------------------------------------------------
-- (1) ⚠ DEPENDÊNCIA DE ORDEM — ESTA MIGRATION LÊ UMA TABELA DE `20260801000002`
-- -----------------------------------------------------------------------------
-- `public.candidaturas_alem_da_janela()` junta `public.config_retencao_etapa`,
-- criada pela migration `20260801000002_p43_config_retencao.sql` (plano 43-04).
-- Aplicar ESTA antes daquela FALHA ALTO no `CREATE FUNCTION`, e falhar no apply
-- é a forma barata: uma função que compilasse contra tabela inexistente e só
-- quebrasse na primeira execução transformaria erro de ordem em erro de runtime.
--
-- ORDEM OBRIGATÓRIA DO CHECKPOINT 43-07:
--   1º  20260801000001  (43-01 — as colunas de consentimento)
--   2º  20260801000002  (43-04 — a matriz de retenção)   ← ESTA MIGRATION A LÊ
--   3º  20260801000003  (43-05 — o guard de marketing)
--   4º  ESTA (20260801000004)
--
-- -----------------------------------------------------------------------------
-- (2) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR
-- (subagentes GSD não recebem os tools MCP do Supabase — bug upstream
-- anthropics/claude-code#13898). Sem wrapper `BEGIN;/COMMIT;`: o driver já
-- envolve cada migration na sua própria transação implícita, e o par externo é o
-- gatilho do SQLSTATE 42601 ("cannot insert multiple commands into a prepared
-- statement") — CLAUDE.md §Migrations. Este arquivo é exatamente a combinação que
-- o transaction pooler recusa: corpos delimitados por cifrões ADJACENTES a
-- `COMMENT` / `REVOKE` / `GRANT`.
--
-- ⚠ AS DUAS PROPRIEDADES DO `apply_migration`, MEDIDAS TRÊS VEZES NA PHASE 42:
--
--   1. **Ele carimba a PRÓPRIA `version` no ledger** — um timestamp do instante
--      do apply, não o do nome deste arquivo. A linha PRECISA ser reparada:
--
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260801000004'
--         WHERE name LIKE '%p43_previa_retencao%';
--
--      Sem o reparo, a ordenação do ledger diverge da dos arquivos e um
--      `db push` futuro leria esta migration como não-aplicada.
--
--   2. **O ledger guarda o SQL LITERALMENTE aplicado** em
--      `supabase_migrations.schema_migrations.statements text[]`. A fidelidade é
--      PROVÁVEL, e precisa ser provada: `apply_migration` recebe o SQL como
--      STRING na chamada da ferramenta e o agente que aplica precisa
--      RETRANSMITI-LO. Duas das cinco migrations do M8 chegaram a PROD com os
--      comentários descartados por essa via.
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260801000004';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260801000004_*.sql)" | md5
--
--      ⚠ AQUI A PERDA DE COMENTÁRIO **NÃO É BENIGNA**. Os `COMMENT ON FUNCTION`
--      deste arquivo são o único lugar DENTRO DO BANCO onde ficam registrados
--      (a) a ordem exata da data-âncora e por que ela termina em coluna NOT NULL,
--      (b) que a lista de exceções é EXTENSÍVEL E INCOMPLETA POR DESENHO e que
--      confirmá-la é dependência da Phase 46 com parecer jurídico, e (c) a
--      decisão BD-1 de que `autorizacao_retencao_curriculo` NÃO encurta janela
--      nesta fase. Perdê-los é perder exatamente o que impede o próximo leitor de
--      armar a purga sobre premissas erradas.
--
--      ⚠ HÁ UM SEGUNDO md5 EM JOGO, E ELE É OUTRA COISA: o smoke
--      `supabase/tests/p43_previa_smoke.sql` pina o `md5(prosrc)` do PREDICADO
--      (só o CORPO, o texto entre os dois delimitadores de cifrão do
--      `CREATE OR REPLACE FUNCTION public.candidaturas_alem_da_janela()`).
--      Aquele prova que o OBJETO VIVO não divergiu; este prova que o ARQUIVO
--      chegou inteiro. Se o pin do smoke falhar E este md5 do apply tiver batido,
--      a divergência é da EXTRAÇÃO do corpo, não do objeto — ver a nota de
--      proveniência no cabeçalho do smoke.
--
-- -----------------------------------------------------------------------------
-- (3) PROVENIÊNCIA — o que foi herdado, de onde
-- -----------------------------------------------------------------------------
--   · `docs/compliance/sql/04-invent05-blast-radius.sql` — a regra da CONSULTA
--     ÚNICA: o que o dry-run conta e o que o delete apaga têm de sair da MESMA
--     expressão, senão o dry-run não prova nada sobre o delete.
--   · `20260730000005_p42_invent05_not_exists.sql` — o idioma NULL-safe de
--     exceção. `NOT EXISTS`, JAMAIS `id NOT IN (…)`: `NOT IN` contra um conjunto
--     que contenha NULL devolve DESCONHECIDO e o registro ESCAPA. Foi
--     literalmente o INVENT-05, do outro lado do mesmo tipo de predicado.
--   · `20260801000002_p43_config_retencao.sql` (43-04) — o guard NULL-safe por
--     `IS DISTINCT FROM` e o `REVOKE` que NOMEIA `anon` (o `pg_default_acl` deste
--     schema concede EXECUTE a `anon` como grant DIRETO em todo `CREATE
--     FUNCTION`; revogar só de PUBLIC não remove nada).
--
-- CONTEÚDO
--   BLOCO A — `public.candidaturas_alem_da_janela()`: A ÚNICA DEFINIÇÃO do
--             predicado. Revogada de TODO papel de cliente.
--   BLOCO B — `public.previa_retencao()`: agregado por estado.
--   BLOCO C — `public.previa_retencao_total()`: total + carimbo de data.
-- =============================================================================


-- =============================================================================
-- BLOCO A — A ÚNICA DEFINIÇÃO DO PREDICADO DE RETENÇÃO
-- =============================================================================
-- ⚠ SE VOCÊ VEIO DA PHASE 46 PARA ESCREVER O `DELETE`: **CHAME ESTA FUNÇÃO.**
-- Não copie o corpo, não reescreva "só a parte que interessa", não inline o
-- `JOIN`. A asserção (f) do smoke exige que os wrappers CHAMEM esta função, e a
-- asserção (e) pina o md5 do corpo dela. Uma segunda cópia é como um dry-run
-- passa a mentir sobre a purga sem que ninguém perceba.
--
-- -----------------------------------------------------------------------------
-- A DATA-ÂNCORA — quatro degraus, e o último NUNCA é NULL
-- -----------------------------------------------------------------------------
--   (1) o `criado_em` MAIS RECENTE de `historico_candidatura` cuja `etapa_para` é
--       a `etapa_atual` da candidatura — o instante em que ela ENTROU no estado
--       em que está. É a única leitura que responde "há quanto tempo esta
--       candidatura está PARADA neste estado", e é por estado que a matriz é
--       chaveada.
--   (2) `data_decisao_final` — candidaturas decididas antes de o histórico
--       existir, ou cujo evento de entrada no estado terminal não foi gravado.
--   (3) `updated_at`  — último toque conhecido.
--   (4) `data_candidatura` — **NOT NULL**. É o degrau que fecha a ladeira.
--
-- ⚠ POR QUE O ÚLTIMO DEGRAU SER NOT NULL É LOAD-BEARING E NÃO ZELO:
-- se a ladeira pudesse resolver para NULL, `NULL + interval < now()` avalia NULL,
-- o `WHERE` não seria satisfeito, e a candidatura sairia SILENCIOSAMENTE da
-- contagem. O sistema acreditaria ter uma política de retenção funcionando
-- enquanto classificava errado sem sinal nenhum — que é EXATAMENTE o modo de
-- falha que o INVENT-05 corrigiu do outro lado deste mesmo tipo de predicado.
-- Terminar numa coluna NOT NULL torna esse modo de falha INEXPRIMÍVEL.
--
-- -----------------------------------------------------------------------------
-- AS EXCEÇÕES — sempre `NOT EXISTS`, e a lista é INCOMPLETA POR DESENHO
-- -----------------------------------------------------------------------------
--   · `deleted_at IS NULL` — soft-delete já feito não é candidato a nada.
--   · Pedido de revisão do Art. 20 EM ABERTO fica de fora. Apagar a evidência de
--     um direito EM EXERCÍCIO é o defeito que o Art. 20 existe para impedir: o
--     titular pediu que uma pessoa revisasse a decisão, a resposta ainda não
--     saiu, e a base probatória da revisão é justamente a candidatura.
--
-- O que NÃO está aqui, e é DEPENDÊNCIA REGISTRADA DA PHASE 46 (com o parecer
-- jurídico trabalhista que o CONTEXT define como pré-requisito DELA):
--   · **Candidaturas em RASCUNHO** (`is_rascunho = true`) hoje ENTRAM na
--     contagem. Se a decisão for que rascunho tem regra própria, ela se escreve
--     AQUI, num só lugar, e vale para a prévia e para o `DELETE` na mesma edição.
--   · Retenção por obrigação legal concorrente (trabalhista, fiscal), litígio em
--     curso, e o tratamento de candidaturas de vaga ainda aberta.
--
-- -----------------------------------------------------------------------------
-- ⚠ DECISÃO REGISTRADA (BD-1) — `autorizacao_retencao_curriculo` NÃO ENTRA AQUI
-- -----------------------------------------------------------------------------
-- Nesta fase esse consentimento é lido como BASE LEGAL CITADA na superfície do
-- candidato (RETEN-03, `/candidato/privacidade`), **nunca como encurtador de
-- janela**. Encurtar a janela de quem não autorizou faria a prévia mostrar
-- números altos e alarmantes numa fase declaradamente ZERO-DESTRUTIVA — e, pior,
-- a decisão "não autorizou ⇒ retenção = duração do processo" é DECISÃO DE
-- POLÍTICA, não de implementação. Ela pertence à Phase 46, junto com o parecer
-- jurídico. Escrevê-la aqui seria tomá-la por acidente de implementação.

CREATE OR REPLACE FUNCTION public.candidaturas_alem_da_janela()
RETURNS TABLE (candidatura_id uuid, candidato_id uuid, etapa public.etapa_processo)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $candidaturas_alem_da_janela$
  SELECT c.id, c.candidato_id, c.etapa_atual
    FROM public.candidaturas c
    JOIN public.config_retencao_etapa m ON m.etapa = c.etapa_atual
   WHERE c.deleted_at IS NULL
     AND NOT EXISTS (
           SELECT 1
             FROM public.decisao_final d
            WHERE d.candidatura_id = c.id
              AND d.revisao_solicitada_em IS NOT NULL
              AND d.revisao_respondida_em IS NULL
         )
     AND COALESCE(
           (SELECT max(h.criado_em)
              FROM public.historico_candidatura h
             WHERE h.candidatura_id = c.id
               AND h.etapa_para = c.etapa_atual),
           c.data_decisao_final,
           c.updated_at,
           c.data_candidatura::timestamptz
         ) + make_interval(months => m.janela_meses) < now();
$candidaturas_alem_da_janela$;

-- ⚠ REVOGADA DE TODO PAPEL DE CLIENTE, E **NENHUM `GRANT` DE VOLTA**.
-- Esta é a única função da fase que devolve LINHAS IDENTIFICÁVEIS (ids de
-- candidatura e de candidato). Uma tela capaz de enumerar as pessoas prestes a
-- serem apagadas é superfície de exfiltração de PII construída sem necessidade —
-- então a proibição vive AQUI, no `REVOKE`, e não na camada de apresentação.
-- Quem a chama: os dois wrappers agregados (que são DEFINER e rodam como o
-- owner, para quem o REVOKE não se aplica) e, na Phase 46, o `DELETE` do cron.
--
-- `FROM PUBLIC` sozinho NÃO basta e não é redundância defensiva: medido na
-- P42-06, o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a
-- `anon` e `authenticated` como grants DIRETOS E NOMEADOS em todo
-- `CREATE FUNCTION`. Nomear os dois papéis é obrigatório.
REVOKE ALL ON FUNCTION public.candidaturas_alem_da_janela()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.candidaturas_alem_da_janela() IS
  'Phase 43 / 43-06 RETEN-04: A UNICA DEFINICAO do predicado de retencao. Devolve as '
  'candidaturas cuja DATA-ANCORA somada a janela do proprio estado (public.config_retencao_etapa, '
  'criada pelo plano 43-04) ja passou de now(). '
  'SE VOCE VEIO DA PHASE 46 PARA ESCREVER O DELETE (PURGA-02): CHAME ESTA FUNCAO, nao copie o '
  'corpo. O dry-run e o delete real TEM de sair da mesma expressao; um dry-run que diverge do '
  'predicado e decoracao (precedente: P39 CR-02, uma guarda que era dead code). O smoke '
  'supabase/tests/p43_previa_smoke.sql pina o md5(prosrc) desta funcao e assere que os wrappers a '
  'CHAMAM — uma segunda copia reprova o gate. '
  'DATA-ANCORA, COALESCE de quatro degraus NESTA ORDEM: (1) o criado_em MAIS RECENTE de '
  'historico_candidatura cuja etapa_para e a etapa_atual da candidatura (o instante em que ela '
  'ENTROU no estado atual — e por estado que a matriz e chaveada); (2) data_decisao_final; '
  '(3) updated_at; (4) data_candidatura, que e NOT NULL. O quarto degrau ser NOT NULL e '
  'LOAD-BEARING: se a ladeira pudesse render NULL, NULL + interval < now() avaliaria NULL, o WHERE '
  'nao seria satisfeito e a candidatura sairia SILENCIOSAMENTE da contagem — o sistema acreditaria '
  'ter politica de retencao funcionando enquanto classificava errado sem sinal, que e o modo de '
  'falha que o INVENT-05 corrigiu do outro lado deste mesmo tipo de predicado. '
  'EXCECOES por NOT EXISTS, JAMAIS por id NOT IN (...): NOT IN contra conjunto que contenha NULL '
  'devolve DESCONHECIDO e o registro ESCAPA. Sao elas: deleted_at IS NULL, e pedido de revisao do '
  'Art. 20 EM ABERTO (revisao_solicitada_em NOT NULL e revisao_respondida_em NULL) — apagar a '
  'evidencia de um direito EM EXERCICIO e o defeito que o Art. 20 existe para impedir. '
  '⚠ A LISTA DE EXCECOES E EXTENSIVEL E INCOMPLETA POR DESENHO. Confirma-la e DEPENDENCIA '
  'EXPLICITA DA PHASE 46, junto com o parecer juridico trabalhista — em particular o tratamento de '
  'CANDIDATURAS EM RASCUNHO (is_rascunho), que HOJE ENTRAM NA CONTAGEM, alem de retencao por '
  'obrigacao legal concorrente, litigio em curso e vaga ainda aberta. '
  '⚠ DECISAO REGISTRADA (BD-1): autorizacao_retencao_curriculo NAO ENTRA NESTE PREDICADO. Nesta '
  'fase ele e base legal CITADA na superficie do candidato (RETEN-03), nunca encurtador de janela. '
  'Encurtar a janela de quem nao autorizou faria a previa mostrar numeros alarmantes numa fase '
  'declaradamente zero-destrutiva, e a decisao "nao autorizou => retencao = duracao do processo" e '
  'decisao de POLITICA que pertence a Phase 46 com o parecer juridico. '
  'SEM GRANT PARA PAPEL DE CLIENTE: esta e a unica funcao da fase que devolve linhas '
  'IDENTIFICAVEIS, e uma tela capaz de enumerar as pessoas prestes a serem apagadas e superficie '
  'de exfiltracao de PII construida sem necessidade. A proibicao e ESTRUTURAL (vive no REVOKE), '
  'nao confiada a camada de apresentacao. STABLE e sem verbo de escrita: ela LE, nunca apaga.';


-- =============================================================================
-- BLOCO B — `previa_retencao()`: agregado POR ESTADO. Zero id, zero nome.
-- =============================================================================
-- ⚠ O QUE ELA DEVOLVE E O QUE ELA NÃO PODE DEVOLVER:
-- `etapa`, `candidaturas_afetadas`, `candidatos_afetados`. NENHUM id de
-- candidatura, NENHUM id de candidato, NENHUM nome, NENHUM e-mail. A asserção
-- (a) do smoke afere isso sobre a ASSINATURA (`pg_get_function_result`), não
-- sobre uma execução — a proibição tem de valer ANTES de qualquer render.
--
-- ⚠ `candidaturas_afetadas` × `candidatos_afetados` CONTAM COISAS DIFERENTES, e
-- a distinção não é preciosismo: a matriz é chaveada por estado de CANDIDATURA, e
-- um candidato pode ter várias. `count(*)` conta candidaturas; `count(DISTINCT
-- candidato_id)` conta pessoas dentro daquele estado. A `43-UI-SPEC.md` foi
-- emendada pelo plano 43-06 para que o rótulo da tela diga o que ele conta.
--
-- GUARD NULL-SAFE por `IS DISTINCT FROM`, herdado do 43-04. `NOT IN` avalia NULL
-- quando não há JWT, e um `IF` NULL **não é tomado**: o guard falharia ABERTO
-- exatamente para o chamador mais suspeito. Em SECURITY DEFINER isso é grave,
-- porque DEFINER bypassa RLS e o guard do corpo é o único controle.

CREATE OR REPLACE FUNCTION public.previa_retencao()
RETURNS TABLE (
  etapa                 public.etapa_processo,
  candidaturas_afetadas bigint,
  candidatos_afetados   bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $previa_retencao$
BEGIN
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode ler a previa de retencao'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT a.etapa,
           count(*)::bigint,
           count(DISTINCT a.candidato_id)::bigint
      FROM public.candidaturas_alem_da_janela() a
     GROUP BY a.etapa
     ORDER BY a.etapa;
END;
$previa_retencao$;

REVOKE ALL ON FUNCTION public.previa_retencao()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.previa_retencao() TO authenticated;

COMMENT ON FUNCTION public.previa_retencao() IS
  'Phase 43 / 43-06 RETEN-04: a previa read-only AGREGADA POR ESTADO. Wrapper de '
  'public.candidaturas_alem_da_janela() — ela CHAMA o predicado unico, jamais o reimplementa (a '
  'assercao (f) de supabase/tests/p43_previa_smoke.sql reprova se pg_get_functiondef deixar de '
  'conter a chamada). '
  'DEVOLVE SO CONTAGENS: etapa, candidaturas_afetadas (count(*)) e candidatos_afetados '
  '(count(DISTINCT candidato_id)). ZERO id, ZERO nome, ZERO e-mail — a assercao (a) do smoke afere '
  'isso sobre a ASSINATURA, nao sobre uma execucao, porque a proibicao tem de valer antes de '
  'qualquer render. '
  'As duas contagens CONTAM COISAS DIFERENTES: a matriz e chaveada por estado de CANDIDATURA e um '
  'candidato pode ter varias. A 43-UI-SPEC.md foi emendada pelo plano 43-06 para que o rotulo da '
  'tela diga o que ele conta (linha por estado = candidaturas; total = candidatos). '
  'ESTA FUNCAO NAO EXECUTA NADA: e STABLE, nao contem verbo de escrita, e nao existe cron nem '
  'gatilho ligado a ela nesta fase. Guard NULL-SAFE por IS DISTINCT FROM (42501): recusa o papel '
  'errado E o chamador SEM CLAIM NENHUMA — NOT IN falharia ABERTO para o segundo. '
  'REVOKE ALL de PUBLIC/anon/authenticated e so entao GRANT EXECUTE a authenticated.';


-- =============================================================================
-- BLOCO C — `previa_retencao_total()`: o total, e o CARIMBO DE DATA
-- =============================================================================
-- ⚠ O TOTAL NÃO É A SOMA DAS LINHAS DE `previa_retencao()`, e isso é deliberado.
-- Ele conta apenas os candidatos cujas candidaturas VIVAS estão **TODAS** fora da
-- janela. Um candidato com uma candidatura ativa não seria purgado por nenhuma
-- definição sã de retenção — somá-lo inflaria a prévia e a faria afirmar um
-- alcance que a purga não terá. Consequência aritmética esperada e asserida pelo
-- smoke (h): `total <= soma dos candidatos_afetados por estado`.
--
-- ⚠ `calculada_em := now()` É COMPUTADO PELA MESMA FUNÇÃO QUE COMPUTA O NÚMERO.
-- Lição direta do 42-12: um fato datado cuja data depende de alguém lembrar de
-- anotá-la é promessa sem código que a execute. Sem carimbo vindo do servidor não
-- há como distinguir um número de HOJE de um número colado do mês passado — e a
-- 43-UI-SPEC torna o carimbo obrigatório na tela justamente por isso.
--
-- `NOT EXISTS` aninhado, nunca `NOT IN`: mesma razão do BLOCO A.

CREATE OR REPLACE FUNCTION public.previa_retencao_total()
RETURNS TABLE (
  candidatos_afetados bigint,
  calculada_em        timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $previa_retencao_total$
BEGIN
  IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administrador pode ler a previa de retencao'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    WITH fora AS (
      SELECT * FROM public.candidaturas_alem_da_janela()
    ),
    vivas AS (
      SELECT c.id, c.candidato_id
        FROM public.candidaturas c
       WHERE c.deleted_at IS NULL
    )
    SELECT count(DISTINCT f.candidato_id)::bigint,
           now()
      FROM fora f
     WHERE NOT EXISTS (
             SELECT 1
               FROM vivas v
              WHERE v.candidato_id = f.candidato_id
                AND NOT EXISTS (
                      SELECT 1 FROM fora f2 WHERE f2.candidatura_id = v.id
                    )
           );
END;
$previa_retencao_total$;

REVOKE ALL ON FUNCTION public.previa_retencao_total()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.previa_retencao_total() TO authenticated;

COMMENT ON FUNCTION public.previa_retencao_total() IS
  'Phase 43 / 43-06 RETEN-04: o TOTAL da previa read-only, mais o CARIMBO DE DATA. Wrapper de '
  'public.candidaturas_alem_da_janela() — CHAMA o predicado unico, jamais o reimplementa. '
  'O TOTAL NAO E A SOMA DAS LINHAS DE previa_retencao(): conta apenas os candidatos cujas '
  'candidaturas VIVAS (deleted_at IS NULL) estao TODAS fora da janela. Um candidato com uma '
  'candidatura ativa nao seria purgado por nenhuma definicao sa de retencao, e soma-lo inflaria a '
  'previa fazendo-a afirmar um alcance que a purga nao tera. Consequencia aritmetica esperada e '
  'asserida pelo smoke (h): total <= soma dos candidatos_afetados por estado (um candidato pode '
  'aparecer em dois estados). '
  'calculada_em := now() E COMPUTADO PELA MESMA FUNCAO QUE COMPUTA O NUMERO — licao do 42-12: um '
  'fato datado cuja data depende de alguem lembrar de anota-la e promessa sem codigo que a '
  'execute. Sem carimbo vindo do servidor nao ha como distinguir um numero de hoje de um numero '
  'colado do mes passado. '
  'ZERO id, ZERO nome, ZERO e-mail na assinatura. STABLE, sem verbo de escrita, sem cron e sem '
  'gatilho: ESTA FUNCAO NAO EXECUTA NADA. Guard NULL-SAFE por IS DISTINCT FROM (42501). '
  'NOT EXISTS aninhado, nunca NOT IN — NOT IN contra conjunto com NULL devolve DESCONHECIDO '
  '(INVENT-05). REVOKE ALL de PUBLIC/anon/authenticated e so entao GRANT EXECUTE a authenticated.';
