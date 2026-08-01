-- =============================================================================
-- Phase 43 / Plan 43-05 — CONSENT-03 · CONSENT-04 (SC#2)
-- O opt-out de marketing ganha CONSEQUÊNCIA: um guard no banco, no ponto por onde
-- TODO envio é registrado, que RECUSA a escrita quando a classe do evento é
-- marketing e o consentimento está ausente.
-- =============================================================================
--
-- ADITIVA · ZERO-DESTRUTIVA. Uma função de leitura, uma tabela nova, um CHECK que
-- só CRESCE (6 → 7 valores), uma função de trigger e um trigger. Nenhum `DELETE`,
-- nenhum `DROP TABLE`, nenhum `DROP COLUMN`, nenhum `UPDATE` sobre dado de titular.
-- O único `DROP` é o da própria constraint de CHECK, imediatamente readicionada com
-- superconjunto do vocabulário — e o bloco `DO` do BLOCO C ABORTA o apply se algum
-- dos 6 valores vivos sumir.
--
-- -----------------------------------------------------------------------------
-- (1) ⚠ DEPENDÊNCIA DE ORDEM — ESTA MIGRATION LÊ UMA COLUNA DE `20260801000001`
-- -----------------------------------------------------------------------------
-- `public.pode_receber_marketing()` (BLOCO A) lê
-- `public.autorizacoes.autorizacao_marketing_vagas`, criada pela migration
-- `20260801000001_p43_consent_prova_e_marketing.sql` (plano 43-01).
--
-- Aplicar ESTA migration antes daquela FALHA ALTO no `CREATE FUNCTION`, e isso é o
-- comportamento DESEJADO: uma função que compilasse contra uma coluna inexistente e
-- só quebrasse na primeira execução transformaria um erro de ordem de apply num
-- erro de runtime, no meio de um envio. Falhar no apply é a forma barata.
--
-- ORDEM OBRIGATÓRIA DO CHECKPOINT 43-07:
--   1º  20260801000001  (as colunas de consentimento, incl. marketing)
--   2º  20260801000002  (a matriz de retenção — independente, mas numerada antes)
--   3º  ESTA (20260801000003)
--
-- -----------------------------------------------------------------------------
-- (2) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- Sem wrapper de transação externo: o driver já envolve cada migration na sua própria
-- transação implícita, e o par externo é o gatilho do SQLSTATE 42601 ("cannot insert
-- multiple commands into a prepared statement") — CLAUDE.md §Migrations.
--
-- ⚠ AS DUAS PROPRIEDADES DO `apply_migration`, MEDIDAS NA PHASE 42 E NA 43:
--
--   1. **Ele carimba a PRÓPRIA `version` no ledger** — um timestamp do instante do
--      apply, não o do nome do arquivo. A linha PRECISA ser reparada à mão:
--
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260801000003'
--         WHERE name LIKE '%p43_guard_marketing%';
--
--      Sem o reparo, a ordenação do ledger diverge da ordenação dos arquivos e um
--      `db push` futuro leria esta migration como não-aplicada.
--
--   2. **O ledger guarda o SQL LITERALMENTE aplicado** em
--      `supabase_migrations.schema_migrations.statements text[]`. Isso torna a
--      fidelidade PROVÁVEL em vez de presumida — e ela precisa ser provada, porque
--      `apply_migration` recebe o SQL como STRING na chamada da ferramenta e o
--      agente que aplica precisa RETRANSMITI-LO. Duas das cinco migrations do M8
--      chegaram a PROD com os comentários descartados por essa via.
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260801000003';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260801000003_*.sql)" | md5
--
--      ⚠ AQUI A PERDA DE COMENTÁRIO **NÃO É BENIGNA**. Os `COMMENT ON TABLE` e
--      `COMMENT ON FUNCTION` deste arquivo são o único lugar DENTRO DO BANCO onde
--      ficam registrados (a) a declaração BD-5 sobre toda a base histórica, (b) o
--      aviso de que `divulgacao_vagas` é vocabulário RESERVADO e não suporte a
--      marketing, e (c) a razão de o guard ser trigger e não `if` de Edge Function.
--      Perdê-los é perder exatamente o que impede o próximo leitor de errar.
--
-- -----------------------------------------------------------------------------
-- (3) ⚠ LEITURA OBRIGATÓRIA ANTES DO APPLY — o CHECK vivo de `evento`
-- -----------------------------------------------------------------------------
-- `SELECT pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname = 'notificacoes_enviadas_evento_check';`
--
-- Transcrever o resultado nas linhas `>>> antes:` / `>>> depois:` abaixo, ANTES do
-- apply. Se o vivo carregar QUALQUER cláusula além da lista de eventos, PARAR: o
-- `ADD CONSTRAINT` do BLOCO C tem de preservá-la, senão o DROP/ADD a perde em
-- silêncio. Lição do 42-07: o arquivo não é o objeto vivo.
--
-- ESTADO ESPERADO (após o apply de `20260730000004` pelo checkpoint da 42-07):
--   CHECK ((evento = ANY (ARRAY['confirmacao'::text, 'avanco'::text, 'convite'::text,
--                              'decisao'::text, 'revisao_solicitada'::text,
--                              'revisao_respondida'::text])))
--
-- >>> TRANSCRIÇÃO DO VIVO (a preencher no checkpoint 43-07, ANTES do apply):
-- >>> antes:
-- >>> depois:
--
-- -----------------------------------------------------------------------------
-- (4) ESCOPO HONESTO — o que este arquivo prova e o que ele NÃO prova
-- -----------------------------------------------------------------------------
-- NÃO EXISTE CAMINHO DE ENVIO DE MARKETING NESTE SISTEMA, e a afirmação é
-- ESTRUTURAL, não "ninguém escreveu ainda": `notificacoes_enviadas` exige
-- `candidatura_id NOT NULL` e `candidato_id NOT NULL` (`20260721000001:78-80`), então
-- a infraestrutura de envio é CANDIDATURA-ESCOPADA POR CONSTRUÇÃO — um aviso de nova
-- vaga não tem candidatura a que se prender. Os 5 eventos que chegam ao titular são
-- todos transacionais (Art. 7º, V).
--
-- Logo, este arquivo NÃO prova que um e-mail de marketing deixou de sair: nenhum
-- jamais saiu. Ele prova que a TENTATIVA DE REGISTRAR um envio de classe marketing
-- sem consentimento é RECUSADA pelo banco, no ponto por onde todo envio passa, e
-- antes de qualquer contato com o provedor. O artefato
-- `docs/compliance/marketing-consentimento-escopo.md` escreve esse limite por
-- extenso, para que ele não seja subentendido.
--
-- CONTEÚDO
--   BLOCO A — `public.pode_receber_marketing(uuid)` — a autoridade única do
--             consentimento, fail-closed em todos os caminhos.
--   BLOCO B — `public.classe_evento_notificacao` — a classificação de evento como
--             DADO inspecionável, com o 7º valor RESERVADO.
--   BLOCO C — o CHECK do ledger estendido a 7 valores, com auto-verificação que
--             aborta o apply se perder qualquer um dos 6 vivos.
--   BLOCO D — `public.guard_marketing_consentimento()` + o trigger `BEFORE INSERT`.
-- =============================================================================


-- =============================================================================
-- BLOCO A — A autoridade única do consentimento de marketing
-- =============================================================================
-- Uma função, um lugar. Todo consumidor futuro (trigger, RPC, tela) pergunta AQUI,
-- em vez de reimplementar `coalesce(..., false)` em cada sítio — que é como um
-- consentimento acaba lido de três formas diferentes por três caminhos.
--
-- ⚠ FAIL-CLOSED EM TRÊS CAMINHOS, e os três importam:
--   · candidato SEM NENHUMA linha em `autorizacoes`  ⇒ false
--       (BD-4: 4 dos 21 candidatos vivos estão exatamente nesse estado, medido em
--        2026-08-01, e NÃO foram back-fillados — consentimento retroativo é
--        fabricar prova.)
--   · coluna `autorizacao_marketing_vagas` NULL       ⇒ false
--       (BD-5: é o estado de TODA a base histórica.)
--   · candidato inexistente                           ⇒ false
--
-- É esta função que torna VERDADEIRA a declaração BD-5: nenhum candidato já
-- cadastrado está autorizado a receber divulgação de vagas, porque o consentimento
-- separado de marketing não existia antes desta fase e ninguém pôde dá-lo.
--
-- ⚠ SEMÂNTICA DE MULTIPLICIDADE — "a linha mais recente vence".
-- `public.autorizacoes` é estruturalmente 1:N por candidato (a FK não é UNIQUE —
-- `isOneToOne: false` em `database.types.ts`), ainda que na prática a EF
-- `cadastrar-candidato` escreva uma linha por cadastro. Com N linhas possíveis, "o
-- consentimento do candidato" não é uma expressão bem definida sem uma regra, e a
-- regra desta fase é: ORDER BY created_at DESC, id DESC LIMIT 1 — a manifestação de
-- vontade mais recente prevalece sobre as anteriores, que é o que a LGPD pressupõe
-- ao tratar consentimento como revogável.
-- O `id DESC` é desempate determinístico: duas linhas com o MESMO `created_at`
-- (mesmo INSERT em lote) tornariam a resposta não-determinística sem ele — e uma
-- função de consentimento que responde diferente a cada chamada é pior que uma que
-- responde errado, porque não é auditável.
-- O checkpoint 43-07 MEDE quantos candidatos têm mais de uma linha hoje e registra
-- o número; se for > 0, a regra deixa de ser teórica.

CREATE OR REPLACE FUNCTION public.pode_receber_marketing(p_candidato_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $pode_receber_marketing$
  SELECT coalesce(
    (
      SELECT coalesce(a.autorizacao_marketing_vagas, false)
        FROM public.autorizacoes a
       WHERE a.candidato_id = p_candidato_id
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 1
    ),
    false  -- nenhuma linha em autorizacoes (ou candidato inexistente) ⇒ NÃO AUTORIZADO
  );
$pode_receber_marketing$;

-- `REVOKE … FROM PUBLIC` NÃO basta e não é redundância defensiva: medido na P42-06,
-- o `pg_default_acl` do schema `public` neste projeto concede EXECUTE a `anon` e
-- `authenticated` como grants DIRETOS E NOMEADOS em todo `CREATE FUNCTION`. O revoke
-- de PUBLIC removeria um grant que nunca existiu, e a função DEFINER continuaria
-- executável pelo papel anônimo. Nomear `anon` e `authenticated` é obrigatório.
-- NENHUM `GRANT` de volta: só o trigger do BLOCO D chama esta função, e triggers
-- rodam com o privilégio do dono da função de trigger, não do chamador.
REVOKE ALL ON FUNCTION public.pode_receber_marketing(uuid) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.pode_receber_marketing(uuid) IS
  'Phase 43 / 43-05 CONSENT-04: autoridade UNICA do consentimento de marketing. Le a '
  'linha MAIS RECENTE de public.autorizacoes do candidato (ORDER BY created_at DESC, '
  'id DESC LIMIT 1 — a manifestacao de vontade mais recente prevalece; o id DESC e '
  'desempate deterministico para linhas com o mesmo created_at) e devolve '
  'coalesce(autorizacao_marketing_vagas, false). FAIL-CLOSED nos tres caminhos: sem '
  'linha, coluna NULL e candidato inexistente resolvem para NAO AUTORIZADO. '
  'BD-5 (decisao do operador, 2026-08-01): autorizacao_marketing_vagas nasce NULL para '
  'TODA a base historica e NULL vale NAO AUTORIZADO — portanto ZERO candidato ja '
  'cadastrado esta autorizado a receber divulgacao de vagas. Isso NAO e regressao, e a '
  'correcao: ninguem nunca consentiu marketing separadamente porque o consentimento '
  'separado nao existia, e herdar de autorizacao_comunicacao seria reconstruir '
  'consentimento por inferencia — exatamente o que o .default(true) fazia e o que esta '
  'fase existe para eliminar. Reconquistar a base exige campanha de re-opt-in (outro '
  'milestone). Se uma metrica de alcance de divulgacao cair a zero apos esta fase, a '
  'explicacao esta AQUI. SEM GRANT para papel de cliente: so o trigger '
  'trg_guard_marketing_consentimento a usa.';


-- =============================================================================
-- BLOCO B — A classificação de evento como DADO inspecionável
-- =============================================================================
-- A classe de um evento (transacional × marketing × interno) decide se a base legal
-- é o Art. 7º V (execução de procedimento preliminar ao contrato, sem opt-out) ou o
-- consentimento revogável do Art. 7º I. Essa decisão precisa ser CONSULTÁVEL — por
-- um auditor, por uma tela, pelo próprio guard — e não enterrada num `CASE` dentro
-- de uma função. Tabela, não constante.

CREATE TABLE public.classe_evento_notificacao (
  evento    text PRIMARY KEY,
  classe    text NOT NULL CHECK (classe IN ('transacional', 'marketing', 'interno')),
  descricao text NOT NULL
);

-- RLS ligada com ZERO policy = default-deny total. Deliberado, e não esquecimento:
-- os únicos leitores são o trigger do BLOCO D (SECURITY DEFINER, bypassa RLS) e
-- `service_role` (bypassa RLS). Nenhum papel de cliente precisa desta tabela, e uma
-- policy permissiva mal escrita ABRE acesso enquanto a AUSÊNCIA de policy nunca abre
-- (decisão travada no 37-CONTEXT, mesmo idioma de `notificacoes_enviadas`).
ALTER TABLE public.classe_evento_notificacao ENABLE ROW LEVEL SECURITY;

-- Seed: os SEIS valores hoje vivos no CHECK do ledger + UM valor RESERVADO.
-- `ON CONFLICT DO NOTHING`, jamais upsert: um seed que sobrescrevesse uma
-- reclassificação feita pelo operador transformaria o re-apply da migration numa
-- regressão silenciosa de base legal.
INSERT INTO public.classe_evento_notificacao (evento, classe, descricao) VALUES
  ('confirmacao',        'transacional',
   'Confirmacao de candidatura recebida. Art. 7 V — procedimento preliminar ao contrato. Sem opt-out.'),
  ('avanco',             'transacional',
   'Avanco de etapa no funil. Art. 7 V — procedimento preliminar ao contrato. Sem opt-out.'),
  ('convite',            'transacional',
   'Convite para entrevista/avaliacao agendada. Art. 7 V — procedimento preliminar ao contrato. Sem opt-out.'),
  ('decisao',            'transacional',
   'Comunicacao da decisao final da candidatura. Art. 7 V — procedimento preliminar ao contrato. Sem opt-out.'),
  ('revisao_respondida', 'transacional',
   'Aviso ao titular de que sua solicitacao de revisao (Art. 20) foi respondida. Resposta a exercicio de DIREITO do titular — nunca opt-outavel.'),
  ('revisao_solicitada', 'interno',
   'Aviso ao RH de que um titular solicitou revisao (Art. 20). Destinatario e a equipe, NAO o titular — nao e comunicacao ao titular e nao passa por consentimento dele.'),
  ('divulgacao_vagas',   'marketing',
   'RESERVADO. Divulgacao de novas vagas ao candidato. NENHUM emissor existe: nenhum trigger o produz e a EF notificar-candidato o rejeitaria com 400 VALIDATION. Existe para que a RECUSA por falta de consentimento seja PROVAVEL por escrita real.')
ON CONFLICT (evento) DO NOTHING;

COMMENT ON TABLE public.classe_evento_notificacao IS
  'Phase 43 / 43-05 CONSENT-03: a classe de cada evento do ledger de notificacoes como '
  'DADO consultavel, e nao como CASE enterrado numa funcao. A classe decide a base '
  'legal: transacional = Art. 7 V (procedimento preliminar ao contrato, SEM opt-out, '
  'decisao travada no M7); marketing = Art. 7 I (consentimento especifico e revogavel); '
  'interno = destinatario e a equipe de RH, nao o titular. '
  '⚠ divulgacao_vagas E VOCABULARIO RESERVADO COM GUARD VIVO, **NAO E SUPORTE A '
  'MARKETING**. NENHUM trigger o emite, a EF notificar-candidato o rejeitaria com 400 '
  'VALIDATION (EVENTOS_VALIDOS e derivado de EVENTO_MAP, que nao o contem), e nao existe '
  'caminho de envio de marketing neste sistema — notificacoes_enviadas exige '
  'candidatura_id NOT NULL, entao a infraestrutura de envio e candidatura-escopada por '
  'construcao e um aviso de nova vaga nao tem candidatura a que se prender. O valor '
  'existe para que a recusa por falta de consentimento seja PROVAVEL por escrita real, '
  'em vez de afirmada por leitura de flag (SC#2). '
  'PRECEDENTE EXATO de vocabulario do banco maior que o da EF: revisao_solicitada esta no '
  'CHECK do ledger desde 20260730000004 e NAO esta em EventoLedger/EVENTO_MAP. '
  'ESTE VOCABULARIO E O DO CHECK notificacoes_enviadas_evento_check SAO DOIS REGISTROS DA '
  'MESMA VERDADE: a assercao (e) de supabase/tests/p43_guard_marketing_smoke.sql reprova '
  'se divergirem. '
  'RLS ligada com ZERO policy (default-deny): so o trigger DEFINER e service_role leem.';

COMMENT ON COLUMN public.classe_evento_notificacao.classe IS
  'transacional | marketing | interno. SOMENTE a classe marketing e submetida ao guard '
  'de consentimento; transacional e interno passam sem consulta adicional. Reclassificar '
  'um evento vivo de transacional para marketing o SUBMETE ao guard imediatamente e, com '
  'a base historica toda NULL (BD-5), isso interromperia esse envio para TODOS os '
  'candidatos. Nao e operacao cosmetica.';


-- =============================================================================
-- BLOCO C — O vocabulário do ledger, de 6 para 7 valores
-- =============================================================================
-- ⚠ O VOCABULÁRIO SÓ CRESCE — 4 (M7) → 5 (42-07) → 6 (42-08) → 7 (aqui). A lista
-- abaixo PRESERVA os SEIS vivos. `revisao_solicitada` e `revisao_respondida` têm
-- LINHAS REAIS no ledger em PROD; um `DROP`/`ADD` que omitisse um deles falharia
-- alto hoje, porque o `ADD CONSTRAINT` valida a tabela inteira — mas contar com
-- isso seria contar com SORTE, e o bloco `DO` abaixo existe para não depender dela.
-- Se amanhã as linhas históricas forem purgadas (Phase 46, RETEN-05), a sorte some
-- e só o bloco `DO` continua de pé.
--
-- ⚠ O NOME DA CONSTRAINT É LOAD-BEARING. `notificacoes_enviadas_evento_check` é o
-- nome auto-gerado que a declaração inline de `20260721000001:77` produz
-- deterministicamente, e o cabeçalho daquele arquivo o declara load-bearing.
--
-- Os 7 valores e quem os produz/consome:
--   confirmacao · avanco · convite · decisao   → triggers de funil (P39) → EF notificar-candidato
--   revisao_solicitada                          → trg_notif_revisao_solicitada (42-07) → EF notificar-rh
--   revisao_respondida                          → trg_notif_revisao_respondida (42-08) → EF notificar-candidato
--   divulgacao_vagas                            → NINGUÉM. Reservado, com guard vivo (BLOCO D).

ALTER TABLE public.notificacoes_enviadas
  DROP CONSTRAINT IF EXISTS notificacoes_enviadas_evento_check;

ALTER TABLE public.notificacoes_enviadas
  ADD CONSTRAINT notificacoes_enviadas_evento_check
  CHECK (evento IN ('confirmacao', 'avanco', 'convite', 'decisao',
                    'revisao_solicitada', 'revisao_respondida', 'divulgacao_vagas'));

-- Auto-verificação: ABORTA o apply se (a) restou algum OUTRO CHECK sobre `evento`
-- (nome divergente em PROD ⇒ o novo conviveria com o antigo, a reivindicação
-- continuaria recusada, e a migration teria "passado"), ou (b) qualquer um dos SEIS
-- valores vivos sumiu da definição resultante. Um gate que não morde não é um gate.
-- Idioma verbatim do BLOCO A de `20260730000004`.
DO $verifica_check$
DECLARE
  v_qtd     int;
  v_defs    text;
  v_vivos   text[] := ARRAY[
    'confirmacao', 'avanco', 'convite', 'decisao',
    'revisao_solicitada', 'revisao_respondida'
  ];
  v_ev      text;
BEGIN
  SELECT count(*), string_agg(c.conname || ' => ' || pg_get_constraintdef(c.oid), ' | ')
    INTO v_qtd, v_defs
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'notificacoes_enviadas'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%evento%';

  IF v_qtd <> 1 THEN
    RAISE EXCEPTION 'P43-05 BLOCO C: esperava 1 CHECK sobre evento, achei % — %', v_qtd, v_defs;
  END IF;

  FOREACH v_ev IN ARRAY v_vivos LOOP
    IF v_defs NOT LIKE '%' || v_ev || '%' THEN
      RAISE EXCEPTION 'P43-05 BLOCO C: o CHECK vivo PERDEU o evento ''%'' — esta migration acabou de quebrar um evento JA ENTREGUE em PROD. Apply abortado: %', v_ev, v_defs;
    END IF;
  END LOOP;

  IF v_defs NOT LIKE '%divulgacao_vagas%' THEN
    RAISE EXCEPTION 'P43-05 BLOCO C: o CHECK vivo nao aceita divulgacao_vagas — o guard do BLOCO D nao teria como ser provado por escrita real: %', v_defs;
  END IF;

  RAISE NOTICE 'P43-05 BLOCO C OK (7 valores, os 6 vivos preservados): %', v_defs;
END
$verifica_check$;

COMMENT ON CONSTRAINT notificacoes_enviadas_evento_check ON public.notificacoes_enviadas IS
  'Phase 43 / 43-05 CONSENT-04: vocabulario de evento do ledger, agora com 7 valores. '
  'Os 4 do M7 (confirmacao/avanco/convite/decisao) sao produzidos pelos triggers de funil; '
  'revisao_solicitada por trg_notif_revisao_solicitada (42-07, consumido pela EF '
  'notificar-rh); revisao_respondida por trg_notif_revisao_respondida (42-08). '
  'O 7o valor, divulgacao_vagas, NAO TEM EMISSOR: e vocabulario RESERVADO de classe '
  'marketing, existente para que o guard trg_guard_marketing_consentimento seja PROVAVEL '
  'por escrita real (SC#2). Adicionar valor aqui sem os sitios de codigo correspondentes '
  'produz 400 VALIDATION sobre um dispatch at-most-once; adicionar em codigo sem adicionar '
  'aqui produz 23514 no claim (D-P42-14). O vocabulario apenas CRESCE: remover um valor '
  'quebra o evento correspondente em silencio.';


-- =============================================================================
-- BLOCO D — O guard, no ponto de estrangulamento
-- =============================================================================
-- ⚠ POR QUE TRIGGER E NÃO UM `if` NA EDGE FUNCTION — é a decisão inteira do plano:
--
--   1. `service_role` BYPASSA RLS mas **NÃO BYPASSA TRIGGER**. O claim da EF roda
--      com `service_role`, então uma policy de RLS não o alcançaria; o trigger sim.
--   2. Um `if` na EF é contornável pelo PRÓXIMO caminho de envio, e múltiplos
--      emissores é o estado NORMAL deste sistema, não a exceção: a P39 precisou de
--      DROP-and-CREATE de triggers no mesmo phase porque havia 3+ triggers dormentes
--      e um disparo por env-var em outra função. Um controle que vive num dos
--      emissores protege um dos emissores.
--   3. O ledger é o PONTO DE ESTRANGULAMENTO: toda notificação é reivindicada aqui
--      (`INSERT ... ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`) antes de
--      existir. Um controle no ledger alcança todo caminho presente e futuro.
--
-- ⚠ A PROPRIEDADE OPERACIONAL QUE TORNA O SMOKE SEGURO: o `INSERT` em
-- `notificacoes_enviadas` é o **CLAIM**, e o claim acontece ANTES do `fetch` para
-- `api.resend.com/emails` no fluxo da EF `notificar-candidato`. Uma recusa no
-- `BEFORE INSERT` NUNCA alcança o provedor — o que importa porque `NOTIFICACOES_MODO`
-- é `producao` em PROD e é secret de PROJETO, não de ambiente. A asserção (i) do
-- smoke transforma essa afirmação em MEDIÇÃO (zero linha nova em `net._http_response`).
--
-- ⚠ CLASSE DESCONHECIDA TAMBÉM RECUSA. Um evento sem linha em
-- `classe_evento_notificacao` é exatamente o caminho por onde um envio de marketing
-- entraria sem ser visto — alguém adiciona um valor ao CHECK, esquece a
-- classificação, e o guard o trataria como transacional. Fail-closed inclui "não sei".
--
-- ⚠ SQLSTATE `P0003` — NOTA HONESTA, PORQUE NÃO É UM CÓDIGO LIVRE.
-- `P0003` é, no PL/pgSQL, a condição interna `too_many_rows`. Ele é usado aqui como
-- código do contrato do guard (é o que o plano fixa e o que o smoke assere), e a
-- ambiguidade é PROVAVELMENTE INÓCUA neste caminho: nenhuma das duas funções deste
-- arquivo pode levantar `too_many_rows` genuíno — `pode_receber_marketing` usa
-- `LIMIT 1` e a resolução de classe é lookup por chave primária, e nenhuma delas usa
-- `SELECT ... INTO STRICT`. Quem precisar discriminar com certeza deve olhar o
-- prefixo da MENSAGEM (`P43-GUARD:`), não apenas o SQLSTATE.
--
-- ⚠ SEM PII NA MENSAGEM. O `RAISE` nomeia o evento e o motivo. Nunca e-mail, nunca
-- nome — e o guard sequer LÊ coluna de contato. Mensagens de exceção vazam para logs
-- de aplicação, para o painel do Supabase e, em algumas rotas, para a resposta HTTP.

CREATE OR REPLACE FUNCTION public.guard_marketing_consentimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $guard_marketing$
DECLARE
  v_classe text;
BEGIN
  SELECT c.classe INTO v_classe
    FROM public.classe_evento_notificacao c
   WHERE c.evento = NEW.evento;

  -- Fail-closed para o "não sei": evento presente no CHECK mas ausente da tabela de
  -- classes. Tratá-lo como transacional seria abrir a porta exata que este guard fecha.
  IF v_classe IS NULL THEN
    RAISE EXCEPTION 'P43-GUARD: evento ''%'' nao tem classe registrada em classe_evento_notificacao — registro de envio RECUSADO por fail-closed. Classifique o evento antes de emiti-lo.', NEW.evento
      USING ERRCODE = 'P0003';
  END IF;

  -- Transacional (Art. 7 V) e interno (destinatario e o RH) passam SEM consulta
  -- adicional: os 5 eventos vivos nao pagam uma leitura a mais por causa deste guard.
  IF v_classe <> 'marketing' THEN
    RETURN NEW;
  END IF;

  IF NOT public.pode_receber_marketing(NEW.candidato_id) THEN
    RAISE EXCEPTION 'P43-GUARD: envio de classe marketing (evento ''%'') RECUSADO — o titular nao autorizou divulgacao de vagas (autorizacao_marketing_vagas ausente, NULL ou false). Consentimento de marketing e especifico e revogavel (Art. 7 I); NULL vale NAO AUTORIZADO.', NEW.evento
      USING ERRCODE = 'P0003';
  END IF;

  RETURN NEW;
END;
$guard_marketing$;

-- Mesmo motivo do BLOCO A: `pg_default_acl` concede EXECUTE a `anon`/`authenticated`
-- como grants nominais em todo `CREATE FUNCTION`, então revogar só de PUBLIC não
-- remove nada. Uma função de trigger não precisa de EXECUTE por papel de cliente: o
-- Postgres a invoca com o privilégio do dono, independentemente de GRANT.
REVOKE ALL ON FUNCTION public.guard_marketing_consentimento() FROM PUBLIC, anon, authenticated;

-- `DROP TRIGGER IF EXISTS` antes do `CREATE`: torna a migration re-aplicável e
-- substitui um objeto de nome conhecido. ⚠ O nome dropado é EXATAMENTE
-- `trg_guard_marketing_consentimento`. Os triggers pré-existentes de
-- `notificacoes_enviadas` (incl. o de `atualizado_em`, P37-03) vivem na MESMA tabela
-- e NÃO podem ser tocados; a asserção (h) do smoke afere a contagem depois do apply.
DROP TRIGGER IF EXISTS trg_guard_marketing_consentimento ON public.notificacoes_enviadas;
CREATE TRIGGER trg_guard_marketing_consentimento
  BEFORE INSERT ON public.notificacoes_enviadas
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_marketing_consentimento();

COMMENT ON FUNCTION public.guard_marketing_consentimento() IS
  'Phase 43 / 43-05 CONSENT-04 (SC#2): RECUSA o registro de um envio de classe marketing '
  'quando o titular nao consentiu. BEFORE INSERT em public.notificacoes_enviadas, que e o '
  'PONTO DE ESTRANGULAMENTO por onde TODO envio passa (o INSERT e o CLAIM da Edge '
  'Function, feito ANTES do fetch para api.resend.com — logo uma recusa aqui NUNCA alcanca '
  'o provedor, o que importa porque NOTIFICACOES_MODO e producao em PROD). '
  'POR QUE TRIGGER E NAO UM if NA EDGE FUNCTION: service_role bypassa RLS mas NAO bypassa '
  'trigger, e o claim da EF roda com service_role; alem disso um if na EF e contornavel '
  'pelo proximo caminho de envio, e multiplos emissores e o estado NORMAL deste sistema '
  '(a P39 tinha 3+ triggers dormentes e um disparo por env-var em outra funcao). '
  'FAIL-CLOSED tambem para CLASSE DESCONHECIDA: evento sem linha em '
  'classe_evento_notificacao e recusado, porque um evento novo nao classificado e '
  'exatamente o caminho por onde um envio de marketing entraria sem ser visto. '
  'transacional e interno retornam NEW sem consulta adicional — os 5 eventos vivos nao '
  'pagam nada por este guard. '
  'SQLSTATE P0003 e a mensagem prefixada P43-GUARD:. NOTA: P0003 e tambem o too_many_rows '
  'interno do PL/pgSQL; nenhuma funcao deste arquivo pode levanta-lo de verdade (LIMIT 1 e '
  'lookup por PK, sem INTO STRICT), mas quem precisar discriminar deve olhar o prefixo da '
  'mensagem. SEM PII: a mensagem nomeia evento e motivo, nunca e-mail ou nome, e o guard '
  'nao le coluna de contato.';
