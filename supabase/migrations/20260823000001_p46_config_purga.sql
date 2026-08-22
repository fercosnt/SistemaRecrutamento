-- =============================================================================
-- Phase 46 / Plan 46-02 (TRACER) — PURGA-05 · PURGA-07 · D-46-05/06/07/19/20
-- A camada de CONFIG da purga: a allowlist de estados vira DADO na matriz, e o
-- cerco operacional (modo · cap · janela do RETEN-05) nasce como linha única de
-- uma tabela, DESLIGADO.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO APAGA NADA, NÃO CRIA FUNÇÃO, NÃO CRIA CRON E NÃO LIGA A
-- PURGA — ela nasce em `modo = 'off'`.**
--
-- Nenhum `DELETE`, nenhum `DROP`, nenhum predicado alterado, nenhum agendamento.
-- Ela acrescenta UMA coluna a `public.config_retencao_etapa`, marca TRÊS linhas
-- dessa matriz como elegíveis, e cria UMA tabela de configuração com UMA linha.
-- A capacidade destrutiva desta fase não existe ao fim deste plano, de propósito.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR
-- (subagentes GSD não recebem os tools MCP do Supabase — bug upstream
-- anthropics/claude-code#13898). Sem par de transacao explicita no topo deste
-- arquivo: o driver ja envolve cada migration na sua propria transacao
-- implicita, e um par externo de abertura e fechamento de transacao
-- e o gatilho do SQLSTATE 42601 ("cannot insert multiple commands into a
-- prepared statement") — CLAUDE.md §Migrations. Este arquivo tem a combinação que
-- o transaction pooler recusa: `CREATE TABLE` / `INSERT` ADJACENTES a `COMMENT`.
--
-- ⚠ AS DUAS PROPRIEDADES DO `apply_migration`, MEDIDAS TRÊS VEZES NA PHASE 42:
--
--   1. **Ele carimba a PRÓPRIA `version` no ledger** — um timestamp do instante
--      do apply, não o do nome deste arquivo. A linha PRECISA ser reparada:
--
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260823000001'
--         WHERE name LIKE '%p46_config_purga%';
--
--      Sem o reparo, a ordenação do ledger diverge da dos arquivos e as quatro
--      migrations deste plano deixam de ser legíveis na ordem em que dependem
--      umas das outras.
--
--   2. **O ledger guarda o SQL LITERALMENTE aplicado** em
--      `supabase_migrations.schema_migrations.statements text[]`. A fidelidade é
--      PROVÁVEL, não garantida: duas das cinco migrations do M8 chegaram a PROD
--      com os comentários descartados por essa via. Asserção obrigatória logo
--      após o apply:
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260823000001';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260823000001_*.sql)" | md5
--
--      ⚠ AQUI A PERDA DE COMENTÁRIO **NÃO É BENIGNA**: o `COMMENT ON COLUMN` de
--      `elegivel_purga` é o único lugar DENTRO DO BANCO onde fica registrada a
--      LACUNA NOMEADA de D-46-19 — que rascunho e candidatura parada em funil
--      ativo têm retenção INDEFINIDA porque `inscricao` não está na allowlist.
--      Uma lacuna escrita é auditável; uma lacuna silenciosa é o próprio modo de
--      falha que o PURGA-07 descreve.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260801000002_p43_config_retencao.sql:133-232` — o esqueleto INTEIRO,
--     seção por seção: tabela, RLS ligada, UMA policy de SELECT restrita a
--     administrador, ZERO policy de escrita (default-deny), reuso do trigger
--     `public.tocar_atualizado_em()` sem `DROP` prévio, seed com
--     `ON CONFLICT DO NOTHING`, e `COMMENT` que declara a RAZÃO e não a estrutura.
--
--   · `20260804000002_p44_solicitacoes_dados.sql:99-110` — o idioma de nomear
--     EXPLICITAMENTE cada `CONSTRAINT … CHECK` quando o nome é load-bearing (o
--     smoke da fase cita os nomes; um nome auto-gerado não é greppável).
--
--   · ⚠ **`config_sla_etapa` (P37) NÃO é o molde, e a RLS dela NUNCA é copiada.**
--     Aquela tabela tem leitura PÚBLICA por desenho (`{anon, authenticated}`,
--     `USING (true)`) porque foi construída para o painel do CANDIDATO. Copiá-la
--     aqui poria o ESTADO DA PURGA — se ela está ligada, com que cap, sobre que
--     estados — ao alcance do papel anônimo. A semelhança é enganosa.
--
--   · ⚠ **NAO foi copiada a variante CONDICIONAL de `ADD COLUMN`.** Ela e a
--     causa MEDIDA do drift de `candidatos.user_id` (`20260805000001:211-215`):
--     ela transforma "a coluna já existe com outro tipo" em silêncio em vez de
--     falha alta. Aqui a forma é pura, e falhar no apply é a saída barata.
--
--   · ⚠ **NÃO foi copiada a RPC `salvar_janela_retencao`.** A RPC auditada de
--     escrita em `config_purga` (`salvar_config_purga`) nasce no plano **46-07**,
--     junto com a recusa server-side do flip `dry_run → live` (D-46-14/22). Até
--     lá a tabela tem ZERO caminho de escrita de aplicação — e isso é a postura
--     correta para uma tabela cujo valor liga um motor destrutivo.
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PRECEDENTE, E POR QUÊ
-- -----------------------------------------------------------------------------
-- `config_retencao_etapa` é chaveada por `etapa_processo`: OITO linhas, uma por
-- estado. `config_purga` é chaveada por um BOOLEANO com `CHECK (id)`: **uma linha
-- só, e a segunda é INEXPRIMÍVEL** — não meramente improvável (D-46-05/06).
--
-- A razão da divergência é a semântica: a matriz descreve uma política POR
-- ESTADO, e faz sentido ter tantas linhas quantos estados. A configuração da
-- purga descreve o estado do CERCO, e duas linhas de cerco não significam nada —
-- significariam que existe uma segunda resposta possível para "a purga está
-- ligada?". Um `PRIMARY KEY` sobre um booleano com `CHECK (id)` faz o Postgres
-- recusar a segunda linha, em vez de o código ter de escolher qual delas ler.
--
-- Segunda divergência: `modo` é UM campo com TRÊS estados (D-46-06), e não um par
-- `ativo boolean` + `modo text`. O kill switch é o estado `off`. O estado
-- contraditório ("live e inativo") fica inexprimível em vez de improvável, e há
-- um só lugar a ler.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA + QUAL SMOKE É O CONTRATO
-- -----------------------------------------------------------------------------
-- ORDEM OBRIGATÓRIA das quatro migrations do plano 46-02:
--   1º  20260823000001  (ESTA — config: `elegivel_purga` + `config_purga`)
--   2º  20260823000002  (ledger: `purga_execucoes` + `purga_execucao_itens`)
--   3º  20260823000003  (predicado: consome `elegivel_purga` desta migration)
--   4º  20260823000004  (varredura: consome `config_purga` desta migration)
--
-- Aplicar a 3ª antes desta FALHA ALTO no `CREATE FUNCTION` (coluna inexistente),
-- e falhar no apply é a forma barata.
--
-- A espec executável é `supabase/tests/p46_purga_smoke.sql`. Ele é CONTRATO: se
-- algo divergir, corrige-se ESTA migration, nunca o smoke.
--
-- ⚠ CONSEQUÊNCIA MEDIDA DESTA MIGRATION, para o checkpoint: com `elegivel_purga`
-- em vigor, `public.candidaturas_alem_da_janela()` cai de **7 para 6** sobre a
-- fixture viva do 46-01 — `neg-etapa#08` está em `entrevista_online`, que NÃO
-- está na allowlist. **Um número que não cai é a cláusula falhando em silêncio.**
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · A allowlist vira DADO na matriz (D-46-19 · PURGA-07)
-- ---------------------------------------------------------------------------
-- ALLOWLIST, JAMAIS DENYLIST — PURGA-07 na letra. A diferença não é estilística:
-- uma denylist deixa todo estado NOVO do enum `etapa_processo` elegível por
-- omissão, no dia em que alguém acrescentar um. Uma allowlist deixa o estado novo
-- PROTEGIDO por omissão. Num mecanismo que apaga dado sem PITR e com Storage fora
-- do backup, a falha por omissão tem de ser a que NÃO apaga.
--
-- ⚠ FORMA PURA, sem `IF NOT EXISTS`. A variante condicional é a causa medida do
-- drift de `candidatos.user_id` (`20260805000001:211-215`) — ela engole "a coluna
-- já existe, com outro tipo" e o esquema diverge sem sinal. Se esta linha falhar
-- no apply, é porque alguém já criou a coluna, e isso é exatamente o que se quer
-- saber ALTO.
--
-- `DEFAULT false`: as OITO linhas existentes nascem NÃO-elegíveis. As três da
-- allowlist são promovidas pelo `UPDATE` logo abaixo, nominalmente.
ALTER TABLE public.config_retencao_etapa
  ADD COLUMN elegivel_purga boolean NOT NULL DEFAULT false;

-- Os TRÊS estados terminais da allowlist de D-46-19, nomeados um a um.
-- ⚠ Este `UPDATE` dispara `trg_config_retencao_atualizado_em` e move
-- `atualizado_em` nestas três linhas. Não move `origem` nem `alterado_por`: as
-- duas linhas que ainda estão em `origem = 'seed'` (`aprovado` e `decisao_final`,
-- medidas em PROD 2026-08-22) CONTINUAM em seed, e confirmá-las segue sendo
-- pré-condição do flip `dry_run → live` (D-46-22). Marcar uma etapa como elegível
-- NÃO é o mesmo que um humano ter escolhido a janela dela.
UPDATE public.config_retencao_etapa
   SET elegivel_purga = true
 WHERE etapa IN ('aprovado', 'rejeitado', 'decisao_final');

COMMENT ON COLUMN public.config_retencao_etapa.elegivel_purga IS
  'Phase 46 / 46-02 PURGA-07 (D-46-19): ALLOWLIST de estados que a purga automatica pode alcancar. '
  'true APENAS em aprovado, rejeitado e decisao_final. Os outros CINCO (inscricao, triagem, '
  'avaliacao_assincrona, entrevista_online, entrevista_presencial) nascem false e ficam false. '
  'A allowlist e DADO e nao lista no codigo: o predicado public.candidaturas_alem_da_janela() le '
  'esta coluna, entao mudar a politica e um UPDATE auditado e nao um deploy. '
  '⚠ ALLOWLIST, JAMAIS DENYLIST: uma denylist deixaria todo valor NOVO do enum etapa_processo '
  'elegivel POR OMISSAO no dia em que alguem acrescentasse um. Com PITR desligado (D-45-10) e o '
  'Storage fora do backup, a falha por omissao tem de ser a que NAO apaga. '
  '⚠⚠ LACUNA NOMEADA, E ELA E O PONTO — D-46-19 muda o EFEITO de D-46-01: candidatura em RASCUNHO '
  '(is_rascunho) e candidatura parada em FUNIL ATIVO ficam em estados fora da allowlist, logo NUNCA '
  'sao purgadas automaticamente. Isso e RETENCAO INDEFINIDA DECLARADA, escrita aqui dentro do banco '
  'de proposito: uma lacuna escrita e auditavel, e uma lacuna silenciosa e exatamente o modo de '
  'falha que o PURGA-07 descreve ("o sistema acredita ter uma politica funcionando e apaga zero"). '
  'Fechar essa lacuna exige o parecer juridico trabalhista que o CONTEXT da Phase 43 registrou como '
  'pre-requisito, e se escreve AQUI, num UPDATE desta coluna, valendo para a previa e para o DELETE '
  'na mesma edicao. '
  '⚠ MARCAR ELEGIVEL NAO E CONFIRMAR A JANELA: origem continua ''seed'' nas linhas que nunca foram '
  'tocadas por um humano, e D-46-22 mantem a confirmacao das 3 linhas da allowlist como '
  'pre-condicao do flip dry_run -> live.';


-- ---------------------------------------------------------------------------
-- 2 · public.config_purga — o cerco, em UMA linha (D-46-05/06/07/20)
-- ---------------------------------------------------------------------------
-- ⚠ SINGLETON POR CONSTRUÇÃO, não por convenção. `id boolean PRIMARY KEY
-- DEFAULT true` mais `CHECK (id)`: o único valor que passa no CHECK é `true`, e o
-- PRIMARY KEY recusa o segundo `true`. Uma segunda linha fica INEXPRIMÍVEL. A
-- alternativa difundida — "por convenção só existe uma linha" — obriga todo
-- leitor a escolher qual linha ler, e num mecanismo destrutivo essa escolha é
-- feita uma vez errada e ninguém percebe.
--
-- ⚠ `modo`: UM campo, TRÊS estados (D-46-06). O kill switch (PURGA-05) É o estado
-- `off`, e não um booleano separado. Com dois campos existiria o estado
-- contraditório "live e inativo"; com um campo ele não existe.
--
-- ⚠ `janela_notificacoes_meses` é ESCALAR PRÓPRIO (D-46-20), jamais derivado de
-- `max(janela_meses)` da matriz. Derivar mudaria a retenção de notificações em
-- SILÊNCIO no dia em que um admin encurtasse a janela de um estado — e a relação
-- "notificação ↔ etapa" nem sequer existe no modelo. A coluna nasce aqui e só é
-- CONSUMIDA no plano 46-07 (RETEN-05).
CREATE TABLE public.config_purga (
  id                        boolean     NOT NULL PRIMARY KEY DEFAULT true,
  modo                      text        NOT NULL DEFAULT 'off',
  cap_titulares             integer     NOT NULL DEFAULT 50,
  janela_notificacoes_meses integer     NOT NULL DEFAULT 24,
  alterado_por              uuid        NULL REFERENCES public.usuarios_rh(id),
  atualizado_em             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_config_purga_singleton
    CHECK (id),

  CONSTRAINT ck_config_purga_modo
    CHECK (modo IN ('off', 'dry_run', 'live')),

  CONSTRAINT ck_config_purga_cap
    CHECK (cap_titulares BETWEEN 1 AND 500),

  CONSTRAINT ck_config_purga_janela_notif
    CHECK (janela_notificacoes_meses BETWEEN 1 AND 120)
);

ALTER TABLE public.config_purga ENABLE ROW LEVEL SECURITY;

-- UMA única policy, de SELECT, restrita a administrador. **NENHUMA policy de
-- escrita** — default-deny. A escrita passa EXCLUSIVAMENTE pela RPC auditada do
-- plano 46-07. A ausência de policy de escrita NÃO é esquecimento: acrescentar
-- uma depois seria abrir um segundo caminho de escrita que não deixa rastro e que
-- não pode RECUSAR — e o que essa tabela guarda é o gatilho de um motor que
-- destrói PII de forma irreversível.
CREATE POLICY config_purga_admin_read ON public.config_purga
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador');

COMMENT ON POLICY config_purga_admin_read ON public.config_purga IS
  'Phase 46 / 46-02: LEITURA admin-only, espelho de config_retencao_etapa_admin_read. '
  '⚠ ZERO POLICY DE ESCRITA, E A AUSENCIA E O CONTROLE: quem escreve modo liga e desliga um motor '
  'que apaga PII de forma irreversivel (PITR desligado por D-45-10, Storage fora do backup). '
  'A escrita e exclusivamente pela RPC auditada salvar_config_purga (plano 46-07), que grava a '
  'mudanca e a linha de log_auditoria na MESMA transacao e que RECUSA o flip dry_run -> live '
  'enquanto os criterios de D-46-14 e D-46-22 nao forem satisfeitos. Uma policy de UPDATE daria '
  'escrita SEM trilha e SEM recusa — as duas coisas que PURGA-04 exige na mesma respiracao.';

COMMENT ON TABLE public.config_purga IS
  'Phase 46 / 46-02 PURGA-04/05 (D-46-05/06/07/20): o CERCO OPERACIONAL da purga automatica, em UMA '
  'linha. A razao de existir, e nao a estrutura: PURGA-04 exige que o flip dry_run -> live seja '
  'checkpoint SEPARADO E EVIDENCIADO, nunca efeito colateral de um deploy, e PURGA-05 exige um kill '
  'switch SEM DEPLOY. Um secret de projeto muda sem deixar trilha e sem recusar nada; uma linha '
  'alterada por RPC deixa trilha atomica e PODE RECUSAR. Por isso o modo vive aqui e nao em env var. '
  'SINGLETON POR CONSTRUCAO: id boolean PRIMARY KEY DEFAULT true + CHECK (id) — a segunda linha e '
  'INEXPRIMIVEL, nao meramente improvavel. '
  'modo IN (off, dry_run, live): UM campo, TRES estados. O kill switch E o estado off; com um '
  'booleano separado existiria o estado contraditorio "live e inativo". '
  'cap_titulares (D-46-07/08): teto de blast-radius por execucao. Conjunto elegivel ACIMA do cap '
  'ABORTA a execucao inteira e grava veredito cap_excedido — NUNCA processa "ate o cap". '
  'janela_notificacoes_meses (D-46-20): escalar PROPRIO do RETEN-05, jamais derivado da matriz. '
  '⚠ A LINHA NASCE EM modo = off: a purga chega ao banco DESLIGADA, e liga-la e um ato separado, '
  'humano e auditado. RLS ligada, UMA policy de SELECT admin-only, ZERO policy de escrita.';

COMMENT ON COLUMN public.config_purga.id IS
  'Chave do singleton. boolean PRIMARY KEY DEFAULT true com CHECK (id): o unico valor aceito e '
  'true, e o PRIMARY KEY recusa o segundo. Nao existe "a linha certa" a escolher porque nao existe '
  'uma segunda linha — a alternativa por convencao obriga todo leitor a escolher, e num mecanismo '
  'destrutivo essa escolha e feita errada uma vez e ninguem percebe.';

COMMENT ON COLUMN public.config_purga.modo IS
  'Vocabulario FECHADO: off | dry_run | live (D-46-06). '
  'off  = kill switch. A varredura roda, CONTA os elegiveis, grava o cabecalho de heartbeat com '
  '       veredito desligado e RETORNA antes de qualquer item. PURGA-05 / SC#3 exigem que o kill '
  '       switch seja provado DESLIGANDO DE VERDADE, por execucao real que nao apaga nada — nunca '
  '       por leitura de config. '
  'dry_run = a varredura percorre os titulares, grava o ledger, e o caminho destrutivo NAO e '
  '       autorizado (D-46-24: escopo duplo do 4o ramo do guard — o caminho de dry-run vale sob '
  '       dry_run|live, o destrutivo so sob live). '
  'live = a unica situacao em que ha mutacao real de Storage, Postgres e Auth. '
  '⚠ O SEED NASCE EM off. Mudar este valor e ato humano auditado pela RPC do 46-07, e o flip para '
  'live e RECUSADO no servidor enquanto os criterios de D-46-14 (>= 14 dias, >= 14 execucoes com '
  'ledger, >= 1 sobre conjunto NAO-VAZIO) e de D-46-22 (as 3 linhas da allowlist com origem <> seed) '
  'nao forem satisfeitos.';

COMMENT ON COLUMN public.config_purga.cap_titulares IS
  'Teto de blast-radius por execucao (D-46-07). Semeado em 50; CHECK BETWEEN 1 AND 500. '
  'Base medida em 2026-08-22: auth.users = 29 linhas (37 com a fixture do 46-01). 50 e folgado para '
  'qualquer operacao legitima e ainda assim para um runaway antes de ele virar incidente. '
  '⚠ D-46-08 — CONJUNTO ACIMA DO CAP ABORTA A EXECUCAO INTEIRA: zero linha tocada, zero item, zero '
  'dispatch, veredito cap_excedido no ledger. A varredura NUNCA recorta o trabalho pelo cap. A razao '
  'e dura: com PITR desligado (D-45-10) e o Storage fora do backup do Supabase, um CV apagado e '
  'irrecuperavel por qualquer meio; um predicado quebrado que processasse ate o cap apagaria 50 '
  'pessoas reais por dia, em silencio, e cada dia de atraso na deteccao seria irreversivel. Abortar '
  'torna a purga RECUSAVEL POR DESENHO — ela so roda quando o conjunto cabe dentro do cerco. '
  'Alteravel sem deploy: e o que torna barato provar o cap reduzindo-o a 1 sobre 2+ elegiveis, em '
  'vez de criar 51 titulares sinteticos.';

COMMENT ON COLUMN public.config_purga.janela_notificacoes_meses IS
  'Phase 46 / RETEN-05 (D-46-20): meses de retencao de public.notificacoes_enviadas, ancorados em '
  'criado_em (a UNICA coluna temporal NOT NULL daquela tabela). Semeado em 24. '
  '⚠ ESCALAR PROPRIO, JAMAIS DERIVADO de max(janela_meses) da matriz: derivar mudaria a retencao de '
  'notificacoes EM SILENCIO no dia em que um admin encurtasse a janela de um estado, e a relacao '
  '"notificacao <-> etapa" nem existe no modelo. '
  'A coluna NASCE neste plano e so e CONSUMIDA no plano 46-07 — uma coluna sem leitor por enquanto, '
  'de proposito: a alternativa e uma migration de retrofit sobre uma tabela viva na fase de maior '
  'risco do milestone.';

COMMENT ON COLUMN public.config_purga.alterado_por IS
  'usuarios_rh.id do ultimo administrador que alterou o cerco, resolvido no SERVIDOR a partir de '
  'auth.uid() pela RPC do 46-07 — nunca recebido por parametro. NULL enquanto ninguem tiver tocado '
  'a linha semeada, que e o estado em que ela nasce.';

COMMENT ON COLUMN public.config_purga.atualizado_em IS
  'Carimbado por trg_config_purga_atualizado_em a cada UPDATE. E o marco a partir do qual o criterio '
  'de D-46-14 conta os 14 dias corridos de dry-run — por isso ele nao pode depender de alguem '
  'lembrar de anota-lo (licao do 42-12).';


-- ---------------------------------------------------------------------------
-- 3 · Trigger de atualizado_em — TRABALHO HERDADO, não trabalho novo
-- ---------------------------------------------------------------------------
-- `public.tocar_atualizado_em()` já existe desde a P37 (`20260722000002:144`),
-- atribui a `NEW.atualizado_em`, não tem privilégio elevado e usa
-- `pg_catalog.now()` com `search_path` vazio. Ela **NÃO é redefinida aqui** —
-- redefini-la criaria divergência com a versão viva sem ganho nenhum.
--
-- `CREATE TRIGGER` PURO, sem `DROP` prévio: é o idioma deliberado, que prefere
-- FALHAR ALTO contra um trigger inesperado a substituí-lo em silêncio. Numa
-- tabela criada uma seção acima não pode haver trigger algum.
CREATE TRIGGER trg_config_purga_atualizado_em
  BEFORE UPDATE ON public.config_purga
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();


-- ---------------------------------------------------------------------------
-- 4 · Seed — a linha única, DESLIGADA
-- ---------------------------------------------------------------------------
-- `ON CONFLICT (id) DO NOTHING`, **JAMAIS a variante que atualiza**. A razão é a
-- mesma que `20260801000002:212-217` já escreveu para a matriz, e aqui ela é
-- ainda mais dura: um `DO UPDATE` transformaria um reapply acidental desta
-- migration numa REVOGAÇÃO SILENCIOSA da política escolhida por um humano — e a
-- política, neste caso, é "a purga está ligada ou desligada". Um reapply que
-- desligasse a purga seria irritante; um que a religasse seria um incidente.
--
-- ⚠ `modo = 'off'`: A PURGA CHEGA AO BANCO DESLIGADA. Ligá-la é um ato separado,
-- humano e auditado (PURGA-04 / D-46-05). Nenhuma migration desta fase liga.
INSERT INTO public.config_purga (id, modo, cap_titulares, janela_notificacoes_meses)
VALUES (true, 'off', 50, 24)
ON CONFLICT (id) DO NOTHING;
