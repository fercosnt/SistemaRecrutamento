-- =============================================================================
-- Phase 44 / Plano 44-02 — EXPORT-05
-- Os limiares de acompanhamento do prazo do Art. 19, II nascem como DADO:
-- alteráveis por `UPDATE`, sem deploy, e ABAIXO do teto legal de 15 dias.
-- =============================================================================
--
-- Requirement:          EXPORT-05
-- Decisão de origem:    44-CONTEXT §Área 4 (`config_sla_dados` espelhando
--                       `config_sla_revisao`; os 15 dias são TETO, não limiar)
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 44-02, Task 1
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO LÊ, NÃO ESCREVE E NÃO APAGA NENHUMA LINHA DE CANDIDATO.**
--
-- Nenhum `DELETE`, nenhum `DROP`, nenhum `UPDATE` sobre dado de titular. Ela cria
-- UMA tabela de configuração, semeia UMA linha de configuração, liga a RLS e
-- pendura o trigger de carimbo já existente. Zero superfície sobre PII.
--
-- -----------------------------------------------------------------------------
-- (1) POR QUE ESTA É A PRIMEIRA DAS DUAS MIGRATIONS DA FASE
-- -----------------------------------------------------------------------------
-- A ordem `config_sla_dados` → `solicitacoes_dados` é DELIBERADA, e a ordem é o
-- controle. Esta tabela **não tem dependência nenhuma** e **não tem corpo `$$`**:
-- o apply dela é o teste BARATO do procedimento 42601 antes da migration que
-- importa (a `20260804000002`, que tem dois corpos PL/pgSQL cercados de
-- `COMMENT`/`REVOKE`/`GRANT` — exatamente a combinação que o pooler recusa).
-- Se o procedimento estiver errado, ele falha aqui, sobre uma tabela de config,
-- e não sobre a tabela que registra o marco de um prazo legal.
--
-- -----------------------------------------------------------------------------
-- (2) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- É o plano **44-04** que aplica; o plano 44-02 apenas AUTORA este arquivo.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua
-- própria transação implícita, e o BEGIN/COMMIT externo é o gatilho documentado do
-- SQLSTATE 42601 ("cannot insert multiple commands into a prepared statement")
-- quando há corpo `$$` adjacente a `COMMENT`/`GRANT`/`REVOKE` — CLAUDE.md §Migrations.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. `apply_migration` carimba a PRÓPRIA `version` —
-- um timestamp do instante do apply, não o do nome deste arquivo. A linha PRECISA
-- ser reparada à mão logo depois:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260804000001'
--    WHERE name LIKE '%p44_config_sla_dados%';
--
-- Sem o reparo, o CLI leria este arquivo como NÃO aplicado e tentaria reaplicá-lo —
-- e `CREATE TABLE` puro falha alto na segunda vez.
--
-- ⚠ FIDELIDADE DO CONTEÚDO. O ledger guarda o SQL literalmente aplicado em
-- `supabase_migrations.schema_migrations.statements text[]`. Duas das cinco
-- migrations do M8 chegaram a PROD com os comentários descartados por essa via.
-- Aqui a perda de um `COMMENT` NÃO é benigna: eles são o único lugar dentro do
-- banco onde está escrito que 15 dias é TETO e por que o CHECK correspondente foi
-- deliberadamente NÃO escrito. Conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260804000001';
--
-- -----------------------------------------------------------------------------
-- (3) PROVENIÊNCIA — o que foi copiado, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260730000001_p42_revisao_art20.sql:442-513` (`config_sla_revisao`) — o
--     MOLDE ESTRUTURAL integral: colunas, CHECK de ordem, RLS ligada, UMA policy de
--     SELECT restrita por papel, NENHUMA policy de escrita, seed
--     `ON CONFLICT DO NOTHING`, trigger `tocar_atualizado_em()` REUSADA.
--
--   · ⚠ **`config_sla_etapa` (P37) NÃO é o molde, e a RLS dela NUNCA é copiada.**
--     Aquela tabela tem leitura PÚBLICA por design (`{anon, authenticated}`,
--     `USING (true)`) porque a P37 a construiu para o painel do CANDIDATO. A
--     `20260730000001:437-441` já registrou essa armadilha in loco, e a Invariante 8
--     da `44-UI-SPEC` a repete: nenhum valor de acompanhamento vaza para o
--     candidato — e essa invariante NÃO pode depender de a tela não renderizar.
--
--   · ⚠ **`config_sla_revisao` NÃO É REUSADA como tabela.** São dois prazos legais
--     DISTINTOS — Art. 20 (revisão de decisão automatizada) e Art. 18/19 (acesso aos
--     dados). Compartilhar uma linha acoplaria os dois: ajustar o acompanhamento de
--     um mexeria no do outro, e nada no schema diria que isso aconteceu.
--
-- -----------------------------------------------------------------------------
-- (4) ONDE ESTA MIGRATION DIVERGE DO MOLDE, E A DIVERGÊNCIA É JURÍDICA
-- -----------------------------------------------------------------------------
-- O `COMMENT` do análogo declara, corretamente, que **o Art. 20 não fixa prazo** e
-- que 7/15 são meta operacional interna. **Copiar esse texto para cá produziria
-- documentação FALSA**: o Art. 19, II fixa **15 dias corridos** para responder a um
-- pedido de acesso. Aqui os 15 dias são TETO LEGAL; os limiares desta tabela são
-- internos, ficam ABAIXO dele, e existem para avisar com folga para agir.
-- É o mesmo defeito que a `44-UI-SPEC` nomeia para o tooltip da coluna
-- "Acompanhamento": duas telas gêmeas cuja única divergência relevante é a copy.
--
-- A espec executável que esta migration tem de satisfazer é
-- `supabase/tests/p44_pedidos_dados_smoke.sql`, asserções (b) e (g). Ele é
-- CONTRATO: se algo divergir, corrige-se ESTA migration, nunca o smoke.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.config_sla_dados — os limiares INTERNOS de acompanhamento
-- ---------------------------------------------------------------------------
-- O CHECK de ordem (`dias_atraso > dias_atencao`) é o que permite ao classificador
-- do cliente CONFIAR na sequência das faixas em vez de reordenar defensivamente.
-- Ele não é, porém, garantia total: a faixa `degenerado` de `classifySlaDados`
-- existe porque um `UPDATE` mal feito ainda pode produzir um estado que nenhuma
-- faixa cobre (config ausente, coluna nula, valor ilegível) — e uma tela de fila
-- nunca pode virar tela de erro por causa de um limiar.
CREATE TABLE public.config_sla_dados (
  chave         text        PRIMARY KEY,
  dias_atencao  integer     NOT NULL CHECK (dias_atencao > 0),
  dias_atraso   integer     NOT NULL CHECK (dias_atraso > 0),
  descricao     text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_config_sla_dados_ordem CHECK (dias_atraso > dias_atencao)
);

ALTER TABLE public.config_sla_dados ENABLE ROW LEVEL SECURITY;

-- UMA única policy, de leitura, restrita a RH/administrador. NENHUMA policy de
-- escrita: default-deny. Alterar o limiar é operação de BANCO, não de aplicação —
-- e é justamente isso que o torna alterável SEM DEPLOY (um UPDATE resolve).
--
-- ⚠ NÃO copiar a RLS de `config_sla_etapa` (public-read por desenho do painel do
-- candidato). Ver §(3) do cabeçalho: a Invariante 8 da 44-UI-SPEC é defendida
-- ABAIXO da UI, aqui.
CREATE POLICY config_sla_dados_rh_read ON public.config_sla_dados
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

COMMENT ON TABLE public.config_sla_dados IS
  'Phase 44 / EXPORT-05 (44-CONTEXT Area 4): limiares INTERNOS de acompanhamento dos pedidos de '
  'acesso aos dados do titular (LGPD Art. 18, II / Art. 19, II), alteraveis por UPDATE sem deploy. '
  'Alimenta o classificador de badge do cliente (classifySlaDados, alias de classifyRevisaoSla); '
  'config ausente ou ilegivel resolve para a faixa degenerada, nunca para erro de tela. '
  '⚠ ENQUADRAMENTO JURIDICO, e ele DIVERGE do analogo config_sla_revisao: o Art. 19, II FIXA 15 '
  'dias corridos para responder a um pedido de acesso. Esses 15 dias sao o TETO LEGAL e NAO sao o '
  'limiar de atencao. Os dois limiares desta tabela sao metas operacionais internas da equipe, '
  'ficam ABAIXO do teto, e existem para que a faixa vermelha apareca com folga para agir. '
  'NAO reusa config_sla_revisao: Art. 20 e Art. 18/19 sao prazos legais distintos e uma linha '
  'compartilhada os acoplaria. NAO copia a RLS de config_sla_etapa, que e public-read por desenho '
  'do painel do candidato — aqui e RH-only, porque nenhum valor de acompanhamento pode vazar para '
  'o titular (Invariante 8 da 44-UI-SPEC). Uma unica policy, de SELECT; zero policy de escrita.';

COMMENT ON COLUMN public.config_sla_dados.chave IS
  'Identificador do conjunto de limiares. Unico valor em uso nesta fase: acesso_dados. A Phase 45 '
  'pode acrescentar uma chave propria para pedidos de exclusao sem tocar nesta linha.';

COMMENT ON COLUMN public.config_sla_dados.dias_atencao IS
  'Dias corridos desde solicitacoes_dados.solicitado_em a partir dos quais o pedido entra na faixa '
  'de atencao. Meta operacional INTERNA da equipe — nao e exigencia estatutaria e nao e o prazo '
  'do Art. 19, II.';

COMMENT ON COLUMN public.config_sla_dados.dias_atraso IS
  'Dias corridos a partir dos quais o pedido entra na faixa de atraso. Sempre maior que '
  'dias_atencao (ck_config_sla_dados_ordem). ⚠ Uma constraint CHECK impondo dias_atraso ABAIXO de '
  '15 foi DELIBERADAMENTE NAO escrita, e a ausencia e a decisao. (A sintaxe literal dessa '
  'constraint nao aparece neste arquivo de proposito: o gate do plano 44-02 a proibe por grep, e '
  'reproduzi-la aqui em prosa faria o gate acusar exatamente o que este comentario nega.) '
  'O teto de 15 dias corridos do Art. 19, II admite prazo '
  'diferenciado disposto pela ANPD por setor (Art. 19 §4o); um CHECK travaria uma alteracao '
  'LEGITIMA numa tabela cuja razao de existir e ser alteravel sem deploy. O teto vive na copy da '
  'tela e neste comentario, que sao alteraveis junto com a lei; a constraint nao seria.';

-- Seed único. `ON CONFLICT DO NOTHING`, JAMAIS upsert: re-seedar sobrescreveria em
-- produção um número que o operador pode ter ajustado (mesma decisão travada da P37
-- e repetida na P42).
--
-- ⚠ 7 e 12 são SEED, não recomendação técnica. São escolhidos ABAIXO de 15 de
-- propósito: um alerta que dispara no dia do vencimento não é alerta, é constatação.
INSERT INTO public.config_sla_dados (chave, dias_atencao, dias_atraso, descricao)
VALUES (
  'acesso_dados',
  7,
  12,
  'Meta operacional interna da equipe para atender pedidos de acesso aos dados do titular. Ambos os numeros ficam ABAIXO do teto de 15 dias corridos do Art. 19, II, para avisar antes do fim. Alteram-se por UPDATE, sem deploy.'
)
ON CONFLICT (chave) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2 · Trigger de atualizado_em — TRABALHO HERDADO, não trabalho novo
-- ---------------------------------------------------------------------------
-- A função de carimbo já existe desde a P37 (`20260722000002:144`) e é reutilizável
-- tal como está: sem privilégio elevado, com search_path vazio e referência
-- totalmente qualificada. Ela **NÃO é redefinida aqui** — redefini-la criaria
-- divergência com a versão viva sem ganho nenhum, e arrastaria um corpo `$$` para
-- dentro de uma migration que hoje não tem nenhum (ver §(1) do cabeçalho).
--
-- `CREATE TRIGGER` PURO, sem DROP prévio: idioma deliberado da P37/P42, que prefere
-- FALHAR ALTO contra um trigger inesperado a substituí-lo em silêncio. Numa tabela
-- criada uma seção acima não pode haver trigger algum.
CREATE TRIGGER trg_config_sla_dados_atualizado_em
  BEFORE UPDATE ON public.config_sla_dados
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
