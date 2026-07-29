-- =============================================================================
-- Phase 42 / Plano 42-06 — Write-path e fila da revisão de decisão (LGPD Art. 20)
-- =============================================================================
-- Requisitos cobertos por este arquivo:
--   REVISAO-02 — fila do RH ordenada por antiguidade, lida por RPC (nunca por
--                projeção-estrela via PostgREST), com o limiar de acompanhamento
--                interno vivendo em tabela de configuração alterável sem deploy.
--   REVISAO-03 — resultado da revisão registrado por UM write-path auditável.
--   REVISAO-05 — quem registrou a decisão original NÃO pode responder à revisão
--                dela, barrado pelo SERVIDOR (não por aviso de UI, não por mock).
--
-- Decisões travadas que este arquivo materializa (índices sobre 42-CONTEXT):
--   D-P42-02 — o write-path da revisão é RPC SECURITY DEFINER, e é lá que o guard
--              REVISAO-05 vive. `decisao_final` NÃO tem policy de UPDATE (arquivo
--              20260607000003: INSERT é WITH CHECK (false) e não há UPDATE), logo
--              o DEFINER é o único caminho possível — o guard não é contornável.
--   D-P42-03 — o limiar de SLA é INTERNO. Nunca é exibido ao candidato, e a
--              defesa dessa invariante começa ABAIXO da UI (ver seção 6).
--   D-P42-04 — a fila ordena por `revisao_solicitada_em` ASC (mais antigo
--              primeiro) e, por padrão, mostra só o que está pendente.
--   D-P42-06 — a FK de autoria da revisão é declarada em sentença NOMEADA
--              própria, jamais embutida numa cláusula que possa ser silenciada.
--   D-P42-07 — `ADD COLUMN` na forma INCONDICIONAL, uma sentença por coluna.
--              O idioma condicional é exatamente o que o INVENT-04 desta mesma
--              fase cataloga como capaz de silenciar cláusulas (inclusive a FK)
--              sem erro em lugar nenhum — a causa identificada do drift de
--              `candidatos.user_id`. A fase que documenta o defeito não pode
--              reproduzi-lo. Contra um banco que já tenha as colunas, este
--              arquivo DEVE falhar alto.
--   D-P42-08 — a tabela de configuração reusa o PADRÃO de `config_sla_etapa`,
--              nunca a tabela e NUNCA a RLS dela.
--   D-P42-09 — o guard reviewer ≠ decider é ABSOLUTO: sem override de
--              administrador e sem fallback para o caso de haver um único RH ativo.
--
-- -----------------------------------------------------------------------------
-- PROVENIÊNCIA DOS ANÁLOGOS (o que foi copiado, de onde, e o que NÃO foi)
-- -----------------------------------------------------------------------------
--   · `20260625100001_decisao_final_phase15.sql:174-231` (`solicitar_revisao_decisao`)
--     — o irmão literal dos RPCs abaixo: preâmbulo DEFINER com search_path vazio,
--     guards ordenados com `USING errcode`, readback da row, o par REVOKE/GRANT e
--     um COMMENT que descreve o contrato incluindo os SQLSTATEs.
--   · `20260709000002_sec08_candidaturas_dup_policy_remediation.sql:38-46`
--     (`rh_le_candidaturas`) — o escopo por vaga re-implementado dentro dos DEFINERs
--     de leitura. Um SECURITY DEFINER BYPASSA RLS: o escopo tem de ser predicado
--     explícito, senão um recrutador enxergaria revisões de vagas alheias.
--   · `20260721000002_config_sla_etapa.sql:54-76` — o MOLDE da tabela de config.
--     ⚠ Aquele arquivo está marcado NÃO APLICAR (reconstrução por engenharia
--     reversa). Dele foi copiada a FORMA da tabela; a policy `sla_public_read`
--     ({anon, authenticated}, USING (true)) NÃO foi copiada — ver seção 6.
--   · `20260722000002_p37_notificacoes_lacunas.sql:144-172` — a função de carimbo
--     de `atualizado_em` JÁ EXISTE e é reutilizável, e o idioma de CREATE TRIGGER
--     puro (sem DROP prévio) é deliberado. Ver seção 7.
--   · `.planning/.../42-RESEARCH.md` §Code Examples E3 — o corpo e a ordem dos
--     guards do RPC de escrita, transcritos aqui.
--
-- A espec executável que este arquivo tem de satisfazer é
-- `supabase/tests/p42_revisao_art20_smoke.sql` (8 asserções, escrito ANTES desta
-- migration, deliberadamente RED). Ele é CONTRATO, não sugestão: se algo divergir,
-- corrige-se ESTA migration, nunca o smoke.
--
-- -----------------------------------------------------------------------------
-- COMO APLICAR
-- -----------------------------------------------------------------------------
-- Via MCP `apply_migration` com o nome `p42_revisao_art20`, pelo orquestrador /
-- main thread. NUNCA `supabase db push --linked`: este arquivo tem múltiplos
-- corpos PL/pgSQL delimitados por cifrões ADJACENTES a COMMENT/REVOKE/GRANT, que
-- é a combinação exata que o transaction pooler recusa com SQLSTATE 42601
-- ("cannot insert multiple commands into a prepared statement") — CLAUDE.md
-- §Migrations. Alternativa equivalente: colar no SQL Editor do Supabase.
--
-- Após o apply, RECONCILIAR O LEDGER (obrigatório, precedentes P37-04 / P39-04 /
-- P41-05): o MCP grava a version com timestamp próprio; ajustar
-- `supabase_migrations.schema_migrations.version` para `20260730000001`,
-- preservando a ordem em relação à P41 (`20260727000001`), e confirmar zero drift
-- novo.
--
-- SEM wrapper `BEGIN;` / `COMMIT;` no topo e no fim: o driver do CLI já envolve
-- cada migration na própria transação implícita, e o wrapper EXTERNO é o gatilho
-- documentado do 42601 (CLAUDE.md §Migrations, precedente Phase 4 / Plan 04-01).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · Colunas novas em public.decisao_final — uma sentença por coluna, INCONDICIONAL
-- ---------------------------------------------------------------------------
-- As TRÊS são nullable de propósito: a tabela tem linhas vivas em produção e
-- nenhuma delas tem revisão respondida. NOT NULL aqui reprovaria o apply.
ALTER TABLE public.decisao_final ADD COLUMN revisao_veredito text;
ALTER TABLE public.decisao_final ADD COLUMN revisao_por_usuario uuid;
ALTER TABLE public.decisao_final ADD COLUMN revisao_respondida_em timestamptz;

-- FK de autoria em sentença NOMEADA própria (D-P42-06).
--
-- ⚠ ESCOLHA DE `ON DELETE` — declarada explicitamente, nunca herdada por omissão
-- de leitura. A autoria da revisão é trilha de AUDITORIA: apagar o usuário de RH
-- não pode apagar a linha de decisão, então CASCADE está fora de questão.
-- Declaramos SET NULL, e vale registrar a interação real com o CHECK de coerência
-- da seção 2: numa linha JÁ RESPONDIDA, zerar `revisao_por_usuario` violaria o
-- CHECK tudo-ou-nada, de modo que o DELETE do usuário é recusado — o CHECK DOMINA
-- a ação da FK e o efeito prático é RESTRICT. Isso é o desejado (T-42-22,
-- repúdio: uma resposta sem autor gravado é precisamente o que não pode existir);
-- em linhas ainda não respondidas as três colunas já são nulas e o SET NULL é
-- inócuo. As 3 FKs NO ACTION catalogadas no FK-AUDIT-LIVE não são tocadas aqui.
ALTER TABLE public.decisao_final
  ADD CONSTRAINT decisao_final_revisao_por_usuario_fkey
  FOREIGN KEY (revisao_por_usuario) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.decisao_final.revisao_veredito IS
  'P42/REVISAO-03: veredito da revisao por pessoa natural (LGPD Art. 20). Vocabulario '
  'FECHADO em 2 valores por CHECK, nao por ENUM (decisao do plano 42-06, questao aberta 4): '
  'auditavel em pg_constraint ao lado do CHECK de substancia, sem criar objeto de tipo novo '
  'numa fase cuja tese e inventariar o que ja existe.';

COMMENT ON COLUMN public.decisao_final.revisao_por_usuario IS
  'P42/REVISAO-05 (T-42-22): quem RESPONDEU a revisao. Gravado SEMPRE pelo proprio RPC a '
  'partir de auth.uid(), nunca vindo do cliente. E o par de auditoria de por_usuario (quem '
  'DECIDIU) — o guard do RPC exige que os dois sejam pessoas diferentes.';

COMMENT ON COLUMN public.decisao_final.revisao_respondida_em IS
  'P42/REVISAO-03: carimbo da resposta. Enquanto NULO, a revisao esta pendente e aparece na '
  'fila do RH; preenchido, e o sinal de idempotencia que recusa uma segunda resposta.';


-- ---------------------------------------------------------------------------
-- 2 · Os três CHECKs nomeados
-- ---------------------------------------------------------------------------
-- (2a) Vocabulário fechado do veredito.
ALTER TABLE public.decisao_final
  ADD CONSTRAINT decisao_final_revisao_veredito_check
  CHECK (revisao_veredito IS NULL OR revisao_veredito IN ('mantida', 'revertida'));

-- (2b) Coerência tudo-ou-nada entre as três colunas da resposta: ou as três nulas
-- (revisão não respondida) ou as três preenchidas. Impede que um caminho
-- privilegiado (service_role, que bypassa RLS) grave um estado meio-respondido —
-- um veredito sem autor, ou um autor sem carimbo.
ALTER TABLE public.decisao_final
  ADD CONSTRAINT decisao_final_revisao_resposta_completa_check
  CHECK (
    (revisao_veredito IS NULL AND revisao_por_usuario IS NULL AND revisao_respondida_em IS NULL)
    OR
    (revisao_veredito IS NOT NULL AND revisao_por_usuario IS NOT NULL AND revisao_respondida_em IS NOT NULL)
  );

-- (2c) Substância da resposta, espelhando o guardrail vivo de >= 50 caracteres que
-- a decisão original já carrega desde a Phase 6.
--
-- ⚠ O guard homônimo dentro do RPC (seção 3, guard 5) NÃO torna este CHECK
-- redundante, e o inverso também não: o guard protege o caminho da APLICAÇÃO e
-- devolve um SQLSTATE que a UI sabe apresentar; o CHECK protege contra QUALQUER
-- escritor privilegiado que contorne o RPC. Os dois existem de propósito.
ALTER TABLE public.decisao_final
  ADD CONSTRAINT decisao_final_revisao_justificativa_min_check
  CHECK (revisao_veredito IS NULL OR length(btrim(coalesce(revisao_resultado, ''))) >= 50);


-- ---------------------------------------------------------------------------
-- 3 · RPC de ESCRITA — public.responder_revisao_decisao (REVISAO-03 / REVISAO-05)
-- ---------------------------------------------------------------------------
-- O ÚNICO write-path da resposta à revisão. `decisao_final` não tem policy de
-- UPDATE, então não existe caminho alternativo pelo cliente — e é por isso que o
-- guard REVISAO-05 vive AQUI e não numa camada acima.
--
-- A ORDEM DOS GUARDS É LOAD-BEARING e está comentada guard a guard abaixo.
-- Em especial, (3) vem antes de (4) DE PROPÓSITO: o decisor recebe a recusa do
-- guard de identidade mesmo numa revisão já respondida, que é a mensagem honesta
-- ("você não pode responder a esta"), e não a mensagem lateral ("já respondida").
--
-- Este RPC NÃO despacha notificação. O despacho é do trigger dos planos 42-07 /
-- 42-08; um segundo despachante produziria e-mail duplo ou colisão de dedupe_key.
CREATE OR REPLACE FUNCTION public.responder_revisao_decisao(
  p_candidatura_id uuid,
  p_veredito       text,
  p_justificativa  text
)
RETURNS public.decisao_final
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row  public.decisao_final;
  v_uid  uuid := auth.uid();
BEGIN
  -- (1) PAPEL. O SECURITY DEFINER bypassa RLS: a autorização tem de ser explícita
  --     aqui dentro. Vocabulário do JWT (administrador | rh | candidato) — o hook
  --     de access token mapeia usuarios_rh.role = recrutador para rh.
  IF (select auth.jwt() #>> '{app_metadata,role}') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- (2) ALCANÇABILIDADE. Só há o que responder se a decisão existir e se o
  --     candidato tiver de fato pedido revisão dela.
  SELECT * INTO v_row
    FROM public.decisao_final
   WHERE candidatura_id = p_candidatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'decisao inexistente' USING errcode = 'no_data_found';
  END IF;

  IF v_row.revisao_solicitada_em IS NULL THEN
    RAISE EXCEPTION 'sem pedido de revisao para esta decisao' USING errcode = '22023';
  END IF;

  -- (3) GUARD REVISAO-05 (D-P42-09) — ABSOLUTO. Sem exceção de administrador, sem
  --     fallback para "só existe 1 RH ativo". A palavra final entre parênteses é
  --     load-bearing: o SQLSTATE 42501 cobre TAMBÉM a recusa "não é RH" do guard
  --     (1), e o cliente precisa discriminar os dois casos sem adivinhar — a UI
  --     não oferece retry nesta recusa, porque tentar de novo nunca funcionaria.
  IF v_uid = v_row.por_usuario THEN
    RAISE EXCEPTION 'quem registrou a decisao nao pode responder a revisao dela (decisor)'
      USING errcode = '42501';
  END IF;

  -- (4) IDEMPOTÊNCIA — uma resposta, uma vez. Esta é a RESOLUÇÃO REGISTRADA da
  --     questão aberta 1 da pesquisa (reabrir uma revisão após veredito), fechada
  --     em v1: uma decisão, não um efeito colateral. A alternativa (permitir
  --     reabertura) bloquearia o 2º e-mail EM SILÊNCIO pelo dedupe_key do ledger
  --     de notificações, que é a classe exata do CR-02.
  IF v_row.revisao_respondida_em IS NOT NULL THEN
    RAISE EXCEPTION 'revisao ja respondida' USING errcode = '22023';
  END IF;

  -- (5) SUBSTÂNCIA do payload.
  IF p_veredito NOT IN ('mantida', 'revertida') THEN
    RAISE EXCEPTION 'veredito invalido' USING errcode = '22023';
  END IF;

  IF length(btrim(coalesce(p_justificativa, ''))) < 50 THEN
    RAISE EXCEPTION 'justificativa precisa de ao menos 50 caracteres' USING errcode = '22023';
  END IF;

  -- Escrita + readback (idioma de solicitar_revisao_decisao). A autoria e o
  -- carimbo vêm do SERVIDOR, nunca do payload do cliente.
  UPDATE public.decisao_final
     SET revisao_veredito      = p_veredito,
         revisao_resultado     = p_justificativa,
         revisao_por_usuario   = v_uid,
         revisao_respondida_em = pg_catalog.now()
   WHERE candidatura_id = p_candidatura_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.responder_revisao_decisao(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.responder_revisao_decisao(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.responder_revisao_decisao(uuid, text, text) IS
  'Phase 42 / REVISAO-03 + REVISAO-05 (LGPD Art. 20): UNICO write-path da resposta a uma '
  'revisao de decisao. Grava revisao_veredito, revisao_resultado, revisao_por_usuario := '
  'auth.uid() e revisao_respondida_em := now(); RETORNA a row (readback). SECURITY DEFINER '
  'com search_path vazio — decisao_final nao tem policy de UPDATE, logo este e o unico '
  'caminho e e onde o guard vive. CONTRATO DE RECUSA por SQLSTATE: 42501 = nao e RH/admin '
  '(mensagem forbidden) OU e o proprio decisor (mensagem contendo a palavra decisor — o '
  'cliente DISCRIMINA os dois casos pela mensagem, porque o SQLSTATE sozinho nao separa); '
  'no_data_found = nao existe decisao para a candidatura; 22023 = sem pedido de revisao, '
  'revisao ja respondida, veredito invalido, ou texto com menos de 50 caracteres. Ordem dos '
  'guards deliberada: o guard do decisor corre ANTES do de idempotencia. NAO despacha '
  'notificacao (o trigger dos planos 42-07/42-08 e o unico despachante). REVOKE de PUBLIC, '
  'GRANT EXECUTE a authenticated.';


-- ---------------------------------------------------------------------------
-- 4 · RPC de LEITURA da fila — public.listar_revisoes_decisao (REVISAO-02)
-- ---------------------------------------------------------------------------
-- POR QUE A LEITURA TEM DE SER UM RPC, e não uma query PostgREST:
--   (i)  o nome de quem decidiu vive em `usuarios_rh`, cuja RLS (SEG-02,
--        20260713000001) um recrutador comum não passa — via PostgREST a fila
--        renderizaria 100% das linhas como "Não identificado";
--   (ii) RLS é row-level e NÃO esconde COLUNA. Uma projeção-estrela arrastaria a
--        justificativa INTERNA do recrutador (texto livre, PII digitada à mão,
--        BD-9 em aberto) para a rede e para o DevTools.
--
-- Por isso o retorno é uma TABELA de colunas NOMEADAS — exatamente as 11 que o
-- espelho cliente `FILA_REVISAO_COLUNAS` (plano 42-03) declara. Devolver a row
-- inteira da tabela seria projeção-estrela por outro nome, e arrastaria junto toda
-- coluna que a tabela ganhar no futuro.
CREATE OR REPLACE FUNCTION public.listar_revisoes_decisao(
  p_incluir_respondidos boolean DEFAULT false
)
RETURNS TABLE (
  candidatura_id        uuid,
  candidato_nome        text,
  vaga_titulo           text,
  decisao               text,
  decidido_por_nome     text,
  revisao_solicitada_em timestamptz,
  revisao_respondida_em timestamptz,
  revisao_veredito      text,
  revisao_resultado     text,
  respondida_por_nome   text,
  pode_responder        boolean
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
  -- Guard de papel idêntico ao do write-path. O DEFINER bypassa RLS.
  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
      d.candidatura_id,
      ca.nome_completo::text,
      vg.titulo::text,
      d.decisao::text,
      -- Resolução de nome por SUBCONSULTA ESCALAR, nunca por LEFT JOIN: um join
      -- em usuarios_rh multiplicaria a linha da fila se o mesmo user_id tivesse
      -- mais de um registro (por exemplo um soft-deletado ao lado do vivo), e um
      -- item duplicado numa fila de trabalho é um defeito visível. Preferimos o
      -- registro vivo; sem correspondência alguma resolve para NULL e a UI mostra
      -- "Não identificado" — um uuid NUNCA chega à tela.
      (SELECT ur.nome_completo::text
         FROM public.usuarios_rh ur
        WHERE ur.user_id = d.por_usuario
        ORDER BY ur.deleted_at ASC NULLS FIRST
        LIMIT 1),
      d.revisao_solicitada_em,
      d.revisao_respondida_em,
      d.revisao_veredito,
      d.revisao_resultado,
      (SELECT ur.nome_completo::text
         FROM public.usuarios_rh ur
        WHERE ur.user_id = d.revisao_por_usuario
        ORDER BY ur.deleted_at ASC NULLS FIRST
        LIMIT 1),
      -- Espelho COSMÉTICO do guard, calculado no servidor para que a UI não
      -- reimplemente regra de autorização. Quem IMPEDE continua sendo o guard (3)
      -- de responder_revisao_decisao; este booleano só decide se o botão aparece.
      (d.revisao_respondida_em IS NULL AND d.por_usuario IS DISTINCT FROM v_uid)
    FROM public.decisao_final d
    JOIN public.candidaturas c  ON c.id  = d.candidatura_id
    JOIN public.candidatos   ca ON ca.id = c.candidato_id
    JOIN public.vagas        vg ON vg.id = c.vaga_id
   WHERE d.revisao_solicitada_em IS NOT NULL
     AND (p_incluir_respondidos OR d.revisao_respondida_em IS NULL)
     -- ESCOPO RE-IMPLEMENTADO (T-42-20). Espelha a policy MAIS RESTRITIVA viva,
     -- rh_le_candidaturas, e não a permissiva rh_le_decisao_final: as duas
     -- discordam entre si (achado A-01 do plano 42-05), e essa assimetria fica
     -- REGISTRADA, não corrigida de passagem por esta migration.
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND c.deleted_at IS NULL
              AND c.is_rascunho = false
              AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
         )
   ORDER BY d.revisao_solicitada_em ASC
   LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_revisoes_decisao(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_revisoes_decisao(boolean) TO authenticated;

COMMENT ON FUNCTION public.listar_revisoes_decisao(boolean) IS
  'Phase 42 / REVISAO-02 (LGPD Art. 20): fila de revisoes de decisao do RH. RETURNS TABLE com '
  'EXATAMENTE 11 colunas nomeadas (o espelho servidor de FILA_REVISAO_COLUNAS) — jamais a row '
  'inteira da tabela: RLS e row-level e nao esconde coluna, e o texto INTERNO que fundamentou '
  'a decisao original (BD-9 em aberto) nao entra na fila. revisao_resultado E outra coluna: e a '
  'resposta escrita PARA o candidato, e e permitida. SECURITY DEFINER + STABLE com search_path '
  'vazio, porque o nome do decisor vive em usuarios_rh atras da RLS SEG-02 que um recrutador '
  'nao passa. Como o DEFINER bypassa RLS, o escopo e predicado EXPLICITO: administrador ve '
  'tudo; rh ve so candidaturas nao-rascunho e nao-deletadas de vagas com created_by = '
  'auth.uid() (espelho de rh_le_candidaturas). Recusa: 42501 se o papel nao for rh/administrador. '
  'Filtro padrao = so pendentes; ordem por antiguidade do pedido (ASC); LIMIT 200 server-side. '
  'pode_responder e espelho COSMETICO do guard — quem impede e o RPC de escrita. REVOKE de '
  'PUBLIC, GRANT EXECUTE a authenticated.';


-- ---------------------------------------------------------------------------
-- 5 · Contador do badge — public.contar_revisoes_pendentes (REVISAO-02 / D-P42-01)
-- ---------------------------------------------------------------------------
-- MESMO guard de papel e MESMO escopo por vaga da seção 4. Se os dois escopos
-- divergirem, o badge da sidebar passa a contar linhas que a fila não mostra.
CREATE OR REPLACE FUNCTION public.contar_revisoes_pendentes()
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
  IF v_role NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_n
    FROM public.decisao_final d
    JOIN public.candidaturas c ON c.id = d.candidatura_id
   WHERE d.revisao_solicitada_em IS NOT NULL
     AND d.revisao_respondida_em IS NULL
     AND (
          v_role = 'administrador'
          OR (v_role = 'rh'
              AND c.deleted_at IS NULL
              AND c.is_rascunho = false
              AND c.vaga_id IN (SELECT vg2.id FROM public.vagas vg2 WHERE vg2.created_by = v_uid))
         );

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.contar_revisoes_pendentes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contar_revisoes_pendentes() TO authenticated;

COMMENT ON FUNCTION public.contar_revisoes_pendentes() IS
  'Phase 42 / REVISAO-02: contagem de revisoes PENDENTES (revisao_solicitada_em preenchida e '
  'revisao_respondida_em nula) que alimenta o badge da RHSidebar. SECURITY DEFINER + STABLE '
  'com search_path vazio, com o MESMO guard de papel e o MESMO escopo por vaga de '
  'listar_revisoes_decisao — se os dois divergirem, o badge conta o que a fila nao mostra. '
  'Recusa: 42501 se o papel nao for rh/administrador. REVOKE de PUBLIC, GRANT EXECUTE a '
  'authenticated.';


-- ---------------------------------------------------------------------------
-- 6 · public.config_sla_revisao — o limiar INTERNO de acompanhamento (D-P42-03)
-- ---------------------------------------------------------------------------
-- Reusa o PADRÃO de config_sla_etapa, nunca a tabela: a PK de lá é um valor do
-- enum etapa_processo, e não existe valor de enum para "revisão Art. 20".
--
-- ⚠ E NUNCA A RLS DE LÁ. `config_sla_etapa` tem leitura PÚBLICA por design
-- ({anon, authenticated}, USING (true)) porque a P37 a construiu para o painel do
-- CANDIDATO. Copiar aquela policy poria este limiar ao alcance do papel anônimo e
-- derrubaria POR BAIXO DA UI a invariante de que o SLA é interno e nunca é exibido
-- ao candidato — a invariante não pode depender só de a tela não renderizar.
CREATE TABLE public.config_sla_revisao (
  chave         text        PRIMARY KEY,
  dias_atencao  integer     NOT NULL CHECK (dias_atencao > 0),
  dias_atraso   integer     NOT NULL CHECK (dias_atraso > 0),
  descricao     text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_config_sla_revisao_ordem CHECK (dias_atraso > dias_atencao)
);

ALTER TABLE public.config_sla_revisao ENABLE ROW LEVEL SECURITY;

-- UMA única policy, de leitura, restrita a RH/administrador. Nenhuma policy de
-- escrita: default-deny. Alterar o limiar é operação de banco, não de aplicação —
-- e é justamente isso que o torna alterável SEM DEPLOY (um UPDATE resolve).
CREATE POLICY config_sla_revisao_rh_read ON public.config_sla_revisao
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

COMMENT ON TABLE public.config_sla_revisao IS
  'Phase 42 / REVISAO-02 (D-P42-03): limiar INTERNO de acompanhamento das revisoes do Art. 20, '
  'alteravel por UPDATE sem deploy. Alimenta o classificador de badge do cliente '
  '(classifyRevisaoSla, plano 42-03); config ausente resolve para a faixa degenerada, nunca '
  'para erro de tela. Reusa o PADRAO de config_sla_etapa e NAO a RLS dela: aquela tabela e '
  'public-read por design (painel do candidato), esta e RH-only — o SLA nunca e exibido ao '
  'candidato, e essa invariante e defendida ABAIXO da UI. Uma unica policy, de SELECT; sem '
  'policy de escrita (default-deny).';

COMMENT ON COLUMN public.config_sla_revisao.dias_atencao IS
  'Dias corridos desde revisao_solicitada_em a partir dos quais o item entra na faixa de '
  'atencao. Meta operacional INTERNA da equipe — nao e exigencia estatutaria.';

COMMENT ON COLUMN public.config_sla_revisao.dias_atraso IS
  'Dias corridos a partir dos quais o item entra na faixa de atraso. Sempre maior que '
  'dias_atencao (ck_config_sla_revisao_ordem). Meta operacional INTERNA — nao e exigencia '
  'estatutaria.';

-- Seed único. ON CONFLICT DO NOTHING, jamais upsert: re-seedar sobrescreveria em
-- produção um número que o operador pode ter ajustado (mesma decisão travada da P37).
--
-- ⚠ 7 e 15 são SEED, não recomendação técnica e não exigência da lei. O Art. 20 da
-- LGPD assegura o direito à revisão por pessoa natural e NÃO fixa um número de
-- dias; o número aqui é decisão do operador (BD-4 em aberto) e altera-se por
-- UPDATE. A copy da UI e deste arquivo nunca enquadra este limiar como estatutário.
INSERT INTO public.config_sla_revisao (chave, dias_atencao, dias_atraso, descricao)
VALUES (
  'revisao_art20',
  7,
  15,
  'Meta operacional interna da equipe para responder pedidos de revisao do Art. 20. BD-4 em aberto: o numero e decisao do operador e altera-se por UPDATE, sem deploy.'
)
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
-- 7 · Trigger de atualizado_em — TRABALHO HERDADO, não trabalho novo
-- ---------------------------------------------------------------------------
-- A função de carimbo já existe desde a P37 (20260722000002:144) e é reutilizável
-- tal como está: sem privilégio elevado, com search_path vazio e referência
-- totalmente qualificada. Ela NÃO é redefinida aqui — redefini-la seria criar
-- divergência com a versão viva sem ganho nenhum.
--
-- `CREATE TRIGGER` PURO, sem DROP prévio: é o idioma deliberado da P37, que
-- prefere FALHAR ALTO contra um trigger inesperado a substituí-lo em silêncio.
-- Numa tabela criada duas seções acima não pode haver trigger algum.
--
-- ⚠ ASSIMETRIA CONSCIENTE com os triggers de despacho dos planos 42-07 / 42-08:
-- aqueles USAM a forma condicional de DROP, porque RECRIAM um trigger que já
-- existiu antes. As duas convenções coexistem por razões diferentes — criar algo
-- novo versus substituir algo conhecido — e NÃO devem ser uniformizadas.
CREATE TRIGGER trg_config_sla_revisao_atualizado_em
  BEFORE UPDATE ON public.config_sla_revisao
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();
