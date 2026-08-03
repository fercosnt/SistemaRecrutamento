-- =============================================================================
-- Phase 44 / Plano 44-02 — EXPORT-05
-- O pedido de cópia vira FATO DURÁVEL: uma linha com marco temporal próprio, que
-- É o cooldown e É o ponto a partir do qual o prazo do Art. 19, II é contado.
-- =============================================================================
--
-- Requirement:          EXPORT-05
-- Decisão de origem:    44-CONTEXT §Área 1 (o cooldown É o registro) e §Área 4
--                       (`tipo` nasce genérico) · §BD-8 (escopo da fila do RH)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 44-02, Task 2
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO LÊ, NÃO ESCREVE E NÃO APAGA NENHUMA LINHA DE CANDIDATO.**
--
-- Ela cria UMA tabela nova (vazia), um índice, uma policy de leitura e duas funções
-- de LEITURA. Nenhum verbo destrutivo, nenhum predicado de purga, nenhuma escrita
-- sobre PII existente. As duas funções são `STABLE`: elas não conseguem escrever.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- É o plano **44-04** que aplica; o plano 44-02 apenas AUTORA este arquivo.
--
-- ⚠ **ESTE É O SEGUNDO APPLY, E A ORDEM É O CONTROLE.** A `20260804000001`
-- (`config_sla_dados`) vai primeiro porque não tem dependência e não tem corpo
-- delimitado por cifrões. **Este arquivo TEM**: duas funções `LANGUAGE plpgsql`
-- cercadas de `REVOKE` / `GRANT` / `COMMENT` — exatamente a combinação que o
-- transaction pooler recusa com SQLSTATE 42601 ("cannot insert multiple commands
-- into a prepared statement"), CLAUDE.md §Migrations. Se o procedimento estiver
-- errado, ele já terá falhado sobre uma tabela de config, e não sobre a tabela que
-- registra o marco de um prazo legal.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua
-- própria transação implícita, e o BEGIN/COMMIT externo é o gatilho do 42601.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. `apply_migration` carimba a PRÓPRIA `version`.
-- Logo após o apply:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260804000002'
--    WHERE name LIKE '%p44_solicitacoes_dados%';
--
-- ⚠ FIDELIDADE DO CONTEÚDO. O ledger guarda o SQL literalmente aplicado em
-- `schema_migrations.statements text[]`. Duas das cinco migrations do M8 chegaram a
-- PROD com os comentários descartados por essa via. Aqui os `COMMENT` são o único
-- lugar dentro do banco onde estão escritos o invariante fila≡contador do BD-8 e a
-- razão de o candidato não ter caminho de escrita. Conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260804000002';
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, e onde o molde NÃO TEM TRADUÇÃO DIRETA
-- -----------------------------------------------------------------------------
--   · `20260730000001_p42_revisao_art20.sql:280-429` — o molde das duas RPCs:
--     `SECURITY DEFINER` + `STABLE` + search_path vazio, `RETURNS TABLE` de colunas
--     NOMEADAS (nunca a row inteira), cap server-side, e o par fila+contador com o
--     comentário (`:421-429`) que declara o invariante que o BD-8 repete.
--
--   · `20260607000006_rls_policies_m2_backbone.sql:38-42`
--     (`candidato_le_propria_candidatura`) — o predicado own-row espelhado aqui.
--
--   · `20260730000002_p42_revisao_art20_authz_fail_closed.sql` — o guard NULL-safe
--     e o `REVOKE` que NOMEIA `anon`.
--
--   · ⚠ **O PREDICADO DE ESCOPO DA P42 NÃO TEM TRADUÇÃO DIRETA.** Lá o escopo sai
--     da própria linha: uma revisão pertence a uma candidatura, que pertence a uma
--     vaga, que tem dono. **Um pedido de acesso não tem vaga.** O BD-8 resolve por
--     decisão do operador, e a tradução está na seção 4 deste arquivo.
--
-- -----------------------------------------------------------------------------
-- (3) A ESPEC EXECUTÁVEL
-- -----------------------------------------------------------------------------
-- `supabase/tests/p44_pedidos_dados_smoke.sql` — 14 asserções, várias NEGATIVAS.
-- Ele é CONTRATO: se algo divergir, corrige-se ESTA migration, nunca o smoke.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.solicitacoes_dados — o registro do pedido (EXPORT-05)
-- ---------------------------------------------------------------------------
-- Uma decisão, dois efeitos (44-CONTEXT §Área 1): **o cooldown É o registro do
-- pedido**. Sem linha registrada não existe marco a partir do qual medir o prazo, e
-- sem cap o endpoint de export é um amplificador de exfiltração. Por isso o cooldown
-- vive na TABELA e nunca em memória: não existe pedido sem marco nem marco sem
-- pedido, porque são a mesma linha.
CREATE TABLE public.solicitacoes_dados (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id  uuid        NOT NULL,
  tipo          text        NOT NULL DEFAULT 'acesso',
  situacao      text        NOT NULL DEFAULT 'pendente',
  causa         text,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  atendido_em   timestamptz,

  CONSTRAINT fk_solicitacoes_dados_candidato
    FOREIGN KEY (candidato_id) REFERENCES public.candidatos(id),

  CONSTRAINT ck_solicitacoes_dados_tipo
    CHECK (tipo IN ('acesso', 'exclusao')),

  CONSTRAINT ck_solicitacoes_dados_situacao
    CHECK (situacao IN ('atendido', 'pendente')),

  CONSTRAINT ck_solicitacoes_dados_causa
    CHECK (causa IS NULL OR causa IN ('falha_geracao', 'curriculo_ausente', 'permissao'))
);

COMMENT ON TABLE public.solicitacoes_dados IS
  'Phase 44 / EXPORT-05: registro DURAVEL dos pedidos do titular sobre os proprios dados (LGPD '
  'Art. 18). Uma decisao com dois efeitos (44-CONTEXT Area 1): esta linha E o cooldown de 24h E o '
  'marco temporal do prazo. O cooldown vive na TABELA e nunca em memoria, porque assim nao existe '
  'pedido sem marco nem marco sem pedido — sao a mesma linha. A fila de supervisao do RH le esta '
  'tabela pelas RPCs listar_pedidos_dados / contar_pedidos_dados_pendentes, NUNCA por policy: o '
  'nome do candidato vive em public.candidatos e o escopo do BD-8 e predicado explicito. '
  'A escrita e EXCLUSIVA da Edge Function exportar-meus-dados, com service_role, que bypassa RLS.';

COMMENT ON COLUMN public.solicitacoes_dados.candidato_id IS
  'Titular do pedido. Resolvido SEMPRE no servidor a partir de auth.uid(); nunca aceito do corpo '
  'do request (classe T-32-03 — aceitar identificador do cliente e deixar forjar de quem e o '
  'pedido, e portanto de quem sao os dados exportados).';

COMMENT ON CONSTRAINT fk_solicitacoes_dados_candidato ON public.solicitacoes_dados IS
  '⚠ SEM clausula ON DELETE, deliberadamente (= NO ACTION). A decisao de o pedido de acesso '
  'sobreviver ou nao ao tombstone do candidato pertence a PHASE 45, que e quem carrega o portao '
  'destrutivo e quem vai ter lido o proprio problema. Escolher CASCADE ou SET NULL agora seria '
  'decidir por uma fase que ainda nao leu o proprio problema — e a escolha errada apagaria, junto '
  'com o titular, a prova de que ele exerceu um direito.';

COMMENT ON COLUMN public.solicitacoes_dados.tipo IS
  '⚠ NASCE COM DOIS VALORES NO CHECK E UM SO EM USO. acesso e o unico valor escrito nesta fase; '
  'exclusao entra na Phase 45. A coluna nasce agora porque a Phase 45 e a fase de MAIOR RISCO do '
  'milestone (portao destrutivo integral) e nao pode gastar orcamento de risco com uma migration '
  'de retrofit sobre linhas VIVAS. Corolario obrigatorio: as duas RPCs desta fase filtram '
  'tipo = ''acesso'' NO SERVIDOR — sem esse filtro, as linhas de exclusao da Phase 45 apareceriam '
  'em silencio na fila de acesso, misturando dois direitos e dois prazos legais na mesma tela.';

COMMENT ON COLUMN public.solicitacoes_dados.situacao IS
  'atendido | pendente. ⚠ A linha nasce ATENDIDA no caminho feliz: o export e self-service e o '
  'proprio clique do candidato o atende (44-CONTEXT Area 4). pendente e o caso que CONSOME PRAZO '
  '— falha da EF, curriculo ausente do Storage, erro de permissao — e e o unico que precisa de '
  'alguem. O valor inteiro do SC#4 esta na falha, porque o caminho feliz e automatico.';

COMMENT ON COLUMN public.solicitacoes_dados.causa IS
  'Vocabulario FECHADO, verbatim da 44-UI-SPEC §Coluna "O que aconteceu": falha_geracao, '
  'curriculo_ausente, permissao. NULL quando a situacao e atendido. O cliente traduz com fallback '
  'TOTAL ("Motivo nao registrado") e o CHECK fecha o vocabulario no banco. ⚠ Divergencia entre os '
  'dois lados produz celula em branco na fila do RH (assuncao A5 da pesquisa) — que e pior que um '
  'token cru, porque parece dado ausente em vez de vocabulario dessincronizado. NUNCA guarda a '
  'mensagem crua do transporte, codigo HTTP, stack ou caminho de Storage.';

COMMENT ON COLUMN public.solicitacoes_dados.solicitado_em IS
  '⚠ ESTE E O MARCO DO ART. 19, II. E dele que o cooldown de 24h le, e e dele que a contagem de '
  'dias da fila do RH parte — um unico marco, dois consumidores, e e isso que faz o SC#4 medir a '
  'coisa certa. Um segundo carimbo para "quando o RH viu" NAO existe de proposito: o prazo corre '
  'do PEDIDO, nao da ciencia de quem atende.';

COMMENT ON COLUMN public.solicitacoes_dados.atendido_em IS
  'Quando a copia foi efetivamente entregue. No caminho feliz e igual a solicitado_em a menos de '
  'milissegundos (entrega sincrona). NULL enquanto pendente.';

-- Índice do cooldown. A leitura "qual foi o último pedido deste candidato" roda em
-- TODO carregamento da seção 3 do painel do candidato **e** em TODA invocação da
-- Edge Function — é o caminho quente desta fase, não uma otimização especulativa.
CREATE INDEX idx_solicitacoes_dados_cooldown
  ON public.solicitacoes_dados (candidato_id, solicitado_em DESC);

COMMENT ON INDEX public.idx_solicitacoes_dados_cooldown IS
  'Phase 44 / EXPORT-05: serve a leitura do cooldown (ultimo pedido do candidato), que roda no '
  'carregamento do painel do candidato e em toda invocacao da EF exportar-meus-dados.';


-- ---------------------------------------------------------------------------
-- 2 · RLS — UMA policy de leitura own-row, e NENHUM caminho de escrita
-- ---------------------------------------------------------------------------
ALTER TABLE public.solicitacoes_dados ENABLE ROW LEVEL SECURITY;

-- Espelha o predicado vivo de `candidato_le_propria_candidatura`
-- (`20260607000006:38-42`), que é o idioma own-row deste projeto.
CREATE POLICY solicitacoes_dados_candidato_own_read ON public.solicitacoes_dados
  FOR SELECT TO authenticated
  USING (
    candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid()))
  );

COMMENT ON POLICY solicitacoes_dados_candidato_own_read ON public.solicitacoes_dados IS
  'Phase 44 / EXPORT-05: o titular le a PROPRIA linha, e so ela — espelho do predicado own-row '
  'vivo de candidato_le_propria_candidatura. E o que permite ao painel do candidato mostrar '
  'quando o cooldown libera sem consultar nada mais. '
  '⚠ ZERO POLICY DE ESCRITA PARA O CANDIDATO, E A RAZAO NAO E OBVIA: se ele pudesse inserir, ele '
  'poderia tambem NAO inserir — furando o cooldown que existe para conter exfiltracao repetida — '
  'ou inserir uma linha ja marcada como atendida sem que nada tivesse sido entregue, zerando o '
  'relogio de um prazo legal sobre uma entrega que nao houve. O registro e AFIRMACAO DO SERVIDOR '
  'SOBRE UM FATO DO SERVIDOR. A escrita e exclusiva da EF exportar-meus-dados com service_role, '
  'que bypassa RLS e por isso nao precisa de policy. '
  'O RH NAO le esta tabela por policy: le pelas duas RPCs SECURITY DEFINER, porque o nome do '
  'candidato vive em outra tabela e o escopo do BD-8 e predicado explicito, nao expressao de RLS.';


-- ---------------------------------------------------------------------------
-- 3 · public.listar_pedidos_dados — a fila de supervisão do RH (EXPORT-05)
-- ---------------------------------------------------------------------------
-- `SECURITY DEFINER` porque o nome do candidato vive em `public.candidatos`, atrás
-- de RLS que um recrutador comum não atravessa para um candidato que não é dele —
-- via PostgREST a fila renderizaria linhas como "Não identificado".
--
-- `RETURNS TABLE` de SETE colunas NOMEADAS, jamais a row inteira: RLS é row-level e
-- **não esconde COLUNA**. A fila é sobre o PEDIDO, não sobre o DADO — nada de
-- e-mail, CPF, documento ou caminho de Storage (Invariante 5 da 44-UI-SPEC). Uma
-- projeção-estrela também arrastaria para a tela toda coluna que a tabela ganhar no
-- futuro, incluindo as que a Phase 45 vai acrescentar.
--
-- ⚠ `nome_completo` é `varchar` e a coluna declarada é `text`. O `::text` é
-- OBRIGATÓRIO: `RETURN QUERY` exige IDENTIDADE de tipo, e a ausência do cast é
-- exatamente o `42804` que derrubou `/admin/retencao` na P43 com o smoke em 10/10
-- verdes (`20260803000001`).
CREATE OR REPLACE FUNCTION public.listar_pedidos_dados(
  p_incluir_atendidos boolean DEFAULT true
)
RETURNS TABLE (
  id             uuid,
  candidato_id   uuid,
  candidato_nome text,
  situacao       text,
  causa          text,
  solicitado_em  timestamptz,
  atendido_em    timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
BEGIN
  -- GUARD DE PAPEL, NULL-SAFE. `IS DISTINCT FROM` e NUNCA `NOT IN`: com v_role NULL
  -- (chamador sem JWT) a expressão `NOT IN` avalia NULL, o `IF` não é tomado, e o
  -- guard FALHA ABERTO justamente para o chamador mais suspeito. Em SECURITY
  -- DEFINER isso é grave porque o DEFINER bypassa RLS e o guard do corpo é o ÚNICO
  -- controle. Defeito REAL medido na 42-06
  -- (`.planning/todos/pending/42-anon-execute-definer-sistemico.md`).
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
      s.id,
      s.candidato_id,
      -- LEFT JOIN, não INNER: um pedido cujo candidato não é resolvível continua
      -- aparecendo na fila (a UI mostra "Não identificado"). Sumir com a linha
      -- esconderia justamente o pedido que consome prazo sem ter dono.
      ca.nome_completo::text,
      s.situacao::text,
      s.causa::text,
      s.solicitado_em,
      s.atendido_em
    FROM public.solicitacoes_dados s
    LEFT JOIN public.candidatos ca ON ca.id = s.candidato_id
   WHERE s.tipo = 'acesso'
     AND (p_incluir_atendidos OR s.situacao = 'pendente')
     -- ESCOPO DO BD-8 — prosa IDÊNTICA à de contar_pedidos_dados_pendentes.
     -- O administrador vê a fila inteira, INCLUSIVE os órfãos (pedido de candidato
     -- sem candidatura nenhuma): o órfão é precisamente o pedido que queima o
     -- relógio do Art. 19, II sem ter dono natural, e o admin é esse dono.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND EXISTS (
                    SELECT 1
                      FROM public.candidaturas cd
                     WHERE cd.candidato_id = s.candidato_id
                       AND cd.deleted_at IS NULL
                       AND cd.is_rascunho = false
                       AND cd.vaga_id IN (SELECT vg.id
                                            FROM public.vagas vg
                                           WHERE vg.created_by = v_uid)))
         )
   -- ORDENAÇÃO COMPOSTA: não atendidos primeiro (do mais antigo ao mais recente),
   -- depois os atendidos (do mais recente ao mais antigo). Ver o COMMENT abaixo —
   -- ela é o que torna VERDADEIRO o aviso de corte da tela.
   ORDER BY (s.situacao = 'atendido'),
            CASE WHEN s.situacao = 'pendente' THEN s.solicitado_em END ASC,
            CASE WHEN s.situacao = 'atendido' THEN s.solicitado_em END DESC
   LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_pedidos_dados(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_pedidos_dados(boolean) TO authenticated;

COMMENT ON FUNCTION public.listar_pedidos_dados(boolean) IS
  'Phase 44 / EXPORT-05 (LGPD Art. 18, II / Art. 19, II): fila de SUPERVISAO dos pedidos de copia '
  'de dados. RETURNS TABLE com EXATAMENTE 7 colunas nomeadas — jamais a row inteira: RLS e '
  'row-level e nao esconde coluna, e a fila e sobre o PEDIDO e nao sobre o DADO (Invariante 5 da '
  '44-UI-SPEC). Zero e-mail, CPF, documento ou caminho de Storage. '
  'SECURITY DEFINER + STABLE com search_path vazio, porque o nome do candidato vive em '
  'public.candidatos atras de RLS que um recrutador nao atravessa para candidato que nao e dele. '
  'Como o DEFINER bypassa RLS, o escopo e predicado EXPLICITO (BD-8): administrador ve tudo, '
  'INCLUSIVE os orfaos (pedido de candidato sem candidatura nenhuma) — o orfao e justamente o '
  'pedido que consome prazo legal sem ter dono natural, e o admin e esse dono; rh ve pedidos de '
  'candidatos com candidatura nao-rascunho e nao-deletada em vaga sua. '
  '⚠ INVARIANTE: este predicado e o de contar_pedidos_dados_pendentes sao O MESMO. Se divergirem, '
  'o badge do menu conta o que a tela nao mostra, e o operador vai cacar trabalho invisivel num '
  'relogio de 15 dias corridos. '
  'Filtro fixo tipo = ''acesso'' no SERVIDOR: sem ele, as linhas de exclusao da Phase 45 entram '
  'nesta tela em silencio. Guard NULL-safe com IS DISTINCT FROM (nunca NOT IN, que falha ABERTO '
  'para chamador sem claim); recusa 42501. '
  '⚠ ORDENACAO COMPOSTA (nao atendidos ASC, depois atendidos DESC) e cap de 200 linhas no '
  'servidor. A ordenacao e o que torna VERDADEIRA a copy do aviso de corte ("todos os nao '
  'atendidos aparecem; os atendidos mais antigos podem ter ficado de fora"). MUDAR ESTA ORDENACAO '
  'SEM MUDAR AQUELA COPY FAZ A FILA MENTIR POR OMISSAO. '
  'REVOKE de PUBLIC e de anon NOMINALMENTE (o pg_default_acl de public concede EXECUTE a anon em '
  'todo CREATE FUNCTION, como grant direto: revogar so de PUBLIC remove um grant que nunca '
  'existiu), GRANT EXECUTE a authenticated.';


-- ---------------------------------------------------------------------------
-- 4 · public.contar_pedidos_dados_pendentes — o contador do badge (EXPORT-05)
-- ---------------------------------------------------------------------------
-- MESMO guard de papel, MESMO filtro de tipo e MESMO escopo do BD-8 da seção 3.
-- A duplicação da prosa do predicado é DELIBERADA e é o ponto: as duas têm de dizer
-- a mesma coisa, e é isso que o smoke (m) assere em dois papéis distintos.
CREATE OR REPLACE FUNCTION public.contar_pedidos_dados_pendentes()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text := (select auth.jwt() #>> '{app_metadata,role}');
  v_n    integer;
BEGIN
  -- Guard NULL-safe idêntico ao da seção 3. Ver o comentário de lá.
  IF v_role IS DISTINCT FROM 'administrador' AND v_role IS DISTINCT FROM 'rh' THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_n
    FROM public.solicitacoes_dados s
   WHERE s.tipo = 'acesso'
     AND s.situacao = 'pendente'
     -- ESCOPO DO BD-8 — prosa IDÊNTICA à de listar_pedidos_dados.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND EXISTS (
                    SELECT 1
                      FROM public.candidaturas cd
                     WHERE cd.candidato_id = s.candidato_id
                       AND cd.deleted_at IS NULL
                       AND cd.is_rascunho = false
                       AND cd.vaga_id IN (SELECT vg.id
                                            FROM public.vagas vg
                                           WHERE vg.created_by = v_uid)))
         );

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.contar_pedidos_dados_pendentes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contar_pedidos_dados_pendentes() TO authenticated;

COMMENT ON FUNCTION public.contar_pedidos_dados_pendentes() IS
  'Phase 44 / EXPORT-05: contagem dos pedidos de acesso PENDENTES que alimenta o badge do menu do '
  'RH. SECURITY DEFINER + STABLE com search_path vazio, com o MESMO guard de papel, o MESMO '
  'filtro tipo = ''acesso'' e o MESMO escopo do BD-8 de listar_pedidos_dados. '
  '⚠ SE OS DOIS PREDICADOS DIVERGIREM, O BADGE CONTA O QUE A FILA NAO MOSTRA — e aqui esse '
  'trabalho invisivel corre contra o prazo de 15 dias corridos do Art. 19, II. O smoke (m) assere '
  'a igualdade entre esta contagem e as linhas pendentes devolvidas pela fila, em dois papeis '
  'distintos, exatamente para que essa divergencia nao possa nascer em silencio. '
  'Sem cap: um contador truncado mentiria por construcao. Guard NULL-safe com IS DISTINCT FROM; '
  'recusa 42501. REVOKE de PUBLIC e de anon NOMINALMENTE, GRANT EXECUTE a authenticated.';
