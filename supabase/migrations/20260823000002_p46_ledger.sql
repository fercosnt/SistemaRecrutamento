-- =============================================================================
-- Phase 46 / Plan 46-02 (TRACER) — PURGA-06 · D-46-15/16
-- O ledger da purga: DUAS tabelas que respondem "o que foi apagado, sob qual
-- política, em qual execução" — e que, por construção, não podem reintroduzir o
-- dado que a purga acabou de remover.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO APAGA NADA, NÃO CRIA FUNÇÃO, NÃO CRIA CRON E NÃO GRAVA
-- NENHUMA LINHA — as duas tabelas nascem VAZIAS e sem escritor.**
--
-- Nenhum `DELETE`, nenhum `DROP`, nenhum `INSERT`, nenhum agendamento. O escritor
-- destas duas tabelas (`public.varrer_purga_retencao()`) nasce na migration
-- `20260823000004`, DEPOIS desta e por dependência de ordem.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR
-- (subagentes GSD não recebem os tools MCP do Supabase — bug upstream
-- anthropics/claude-code#13898). Sem par de transacao explicita no topo deste
-- arquivo: o driver ja envolve cada migration na sua propria transacao
-- implicita, e um par externo de abertura e fechamento de transacao
-- e o gatilho do SQLSTATE 42601 — CLAUDE.md §Migrations.
--
--   1. **`apply_migration` carimba a PRÓPRIA `version`.** Reparar:
--
--        UPDATE supabase_migrations.schema_migrations
--           SET version = '20260823000002'
--         WHERE name LIKE '%p46_ledger%';
--
--   2. **O ledger de migrations guarda o SQL LITERALMENTE aplicado.** Conferir:
--
--        SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--         WHERE version = '20260823000002';
--        -- comparar com:
--        --   printf '%s' "$(cat supabase/migrations/20260823000002_*.sql)" | md5
--
--      ⚠ AQUI A PERDA DE COMENTÁRIO **NÃO É BENIGNA**: o `COMMENT ON TABLE` é o
--      único lugar DENTRO DO BANCO onde fica escrita a justificativa de D-46-16
--      (retenção INDEFINIDA do próprio ledger). "Retenção sem prazo e sem razão
--      escrita" é exatamente o que o RETEN-05 existe para eliminar — perder o
--      comentário entregaria a estrutura e apagaria a razão dela.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, de onde, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260721000001_notificacoes_enviadas.sql:66-158` — o SHAPE de ledger: a
--     ordem de colunas do catálogo, RLS ligada com EXATAMENTE UMA policy de
--     SELECT, zero policy de escrita (só `service_role` escreve, e `service_role`
--     bypassa RLS, por isso não precisa de policy), e o `COMMENT ON TABLE` que
--     declara a RAZÃO da tabela.
--
--   · `20260804000002_p44_solicitacoes_dados.sql:90-163` — `CONSTRAINT … CHECK`
--     NOMEADOS explicitamente, e o `COMMENT ON COLUMN` que ENUMERA o vocabulário
--     fechado. O comentário de `causa` (`:147-153`) é o molde direto de
--     `relato_dry_run`, incluindo a frase que proíbe guardar a mensagem crua do
--     transporte, código HTTP, stack ou caminho de Storage.
--
--   · `20260804000002:126-131` — o idioma de JUSTIFICAR POR ESCRITO o silêncio de
--     uma FK, em vez de deixá-lo por decidir. Aqui a FK ausente é a de
--     `candidato_id`, e a razão está na seção 2.
--
--   · `20260801000002:153-165` — o molde de "COMMENT que declara a razão, não a
--     estrutura", usado para a justificativa de retenção indefinida (D-46-16).
--
--   · ⚠ **NÃO foi reusada `public.data_deletion_log`.** A Phase 47 a adotou para
--     outro fim (CONSOL-02, `20260809000002`), e colapsar dois registros com
--     semânticas diferentes destrói ambos: aquele responde "o titular exerceu o
--     direito de exclusão", este responde "a política de retenção expirou o dado
--     sozinho". São fatos jurídicos distintos, com bases legais distintas.
--
--   · ⚠ **NÃO foi copiado o `ON DELETE CASCADE`** de `notificacoes_enviadas`
--     (`20260721000001:78-79`) para `candidato_id`. Ver seção 2 — copiá-lo
--     apagaria a linha do ledger exatamente no instante em que ela passa a ser a
--     única prova de que a purga aconteceu.
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PRECEDENTE, E POR QUÊ
-- -----------------------------------------------------------------------------
-- `notificacoes_enviadas` tem FK com `ON DELETE CASCADE` para `candidaturas` e
-- `candidatos`: quando o titular some, a notificação some junto, e isso está
-- certo para aquela tabela.
--
-- **`purga_execucao_itens.candidato_id` NÃO TEM FK NENHUMA**, e a divergência é o
-- ponto inteiro da tabela: a linha do ledger tem de SOBREVIVER ao desaparecimento
-- do titular, porque ela É o registro de que ele deixou de existir. Uma FK com
-- CASCADE apagaria a prova junto com o fato; uma FK com RESTRICT impediria a
-- purga de concluir; uma FK com SET NULL destruiria a única coluna que responde
-- "quem". Nenhuma das três disposições é aceitável, então não há FK — e o
-- silêncio fica JUSTIFICADO por escrito, no idioma de `20260804000002:126-131`.
--
-- Segunda divergência: `notificacoes_enviadas` tem retenção que RETEN-05 passa a
-- limitar. O ledger da purga tem retenção INDEFINIDA (D-46-16), e a justificativa
-- está no `COMMENT ON TABLE` porque as duas condições que a tornam defensável —
-- registro de cumprimento de obrigação legal, e ausência de PII por desenho —
-- precisam ser verificáveis por quem auditar o banco, não por quem ler prosa de
-- planning.
--
-- -----------------------------------------------------------------------------
-- (4) ORDEM DE ENTREGA + QUAL SMOKE É O CONTRATO
-- -----------------------------------------------------------------------------
-- ORDEM OBRIGATÓRIA das quatro migrations do plano 46-02:
--   1º  20260823000001  (config: `elegivel_purga` + `config_purga`)
--   2º  20260823000002  (ESTA — ledger)
--   3º  20260823000003  (predicado)
--   4º  20260823000004  (varredura — a PRIMEIRA escritora destas duas tabelas)
--
-- A espec executável é `supabase/tests/p46_purga_smoke.sql`, asserções (c), (h) e
-- (i). Ele é CONTRATO: se algo divergir, corrige-se ESTA migration.
--
-- ⚠⚠ ESTA MIGRATION DEIXA DE SER HIGIENE NO PLANO 46-04. Com D-46-18, o 4º ramo
-- autorizado do guard de `public.anonimizar_candidato` passa a aceitar o chamador
-- com base em existir item vivo NESTAS DUAS TABELAS — ou seja, **a segurança do
-- guard destrutivo PASSA A SER a segurança destas duas tabelas**. É por isso que
-- a RLS aqui é ligada com ZERO policy de escrita, e é por isso que a migration do
-- 46-04 carrega um bloco de auto-verificação que ABORTA o apply se `authenticated`
-- puder escrever nelas (espelho de `20260805000006:1000-1028`).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.purga_execucoes — o CABEÇALHO, uma linha por execução (PURGA-06)
-- ---------------------------------------------------------------------------
-- ⚠ UMA LINHA POR EXECUÇÃO, INCLUSIVE PELAS QUE NÃO FAZEM NADA. O cabeçalho é
-- gravado com `modo = 'off'` e com `elegiveis = 0` também — é o HEARTBEAT
-- (Pitfall 5). Sem ele, "o cron parou" e "não havia nada a purgar" produzem o
-- mesmo silêncio, e uma política de retenção inexistente fica indistinguível de
-- uma política funcionando sobre conjunto vazio. É o cabeçalho que torna
-- detectável a condição "nenhuma linha de ledger em mais de 36 h", e é ele que
-- torna MENSURÁVEL o critério de D-46-14 (>= 14 execuções com ledger não-vazio).
--
-- ⚠ `cron.job_run_details` NÃO serve para isso, e a razão é medida: aquela tabela
-- acumula disco, não é limpa automaticamente e sobrevive ao desagendamento — ela
-- registra que o JOB rodou, não que a POLÍTICA foi aplicada.
CREATE TABLE public.purga_execucoes (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  modo_vigente             text        NOT NULL,
  cap_vigente              integer     NOT NULL,
  elegiveis                integer     NOT NULL,
  processados              integer     NOT NULL DEFAULT 0,
  notificacoes_expurgadas  integer     NOT NULL DEFAULT 0,
  veredito                 text        NOT NULL,
  situacao                 text        NOT NULL DEFAULT 'executando',
  iniciada_em              timestamptz NOT NULL DEFAULT now(),
  concluida_em             timestamptz,

  CONSTRAINT ck_purga_execucoes_veredito
    CHECK (veredito IN ('desligado','dry_run','despachado','cap_excedido','segredo_ausente')),

  CONSTRAINT ck_purga_execucoes_situacao
    CHECK (situacao IN ('executando','concluida','abortada'))
);

ALTER TABLE public.purga_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY purga_execucoes_admin_read ON public.purga_execucoes
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador');

COMMENT ON POLICY purga_execucoes_admin_read ON public.purga_execucoes IS
  'Phase 46 / 46-02: leitura admin-only. ⚠ ZERO POLICY DE ESCRITA, e a partir do plano 46-04 a '
  'ausencia dela deixa de ser higiene: com D-46-18 o 4o ramo do guard de anonimizar_candidato '
  'autoriza o chamador com base em existir item vivo nesta tabela, entao QUEM PUDER ESCREVER AQUI '
  'AUTORIZA A DESTRUICAO DE PII. A migration do 46-04 carrega bloco de auto-verificacao que ABORTA '
  'o apply se authenticated puder escrever nesta tabela (espelho de 20260805000006:1000-1028). '
  'A escrita e exclusiva de public.varrer_purga_retencao() (SECURITY DEFINER) e de service_role.';

COMMENT ON TABLE public.purga_execucoes IS
  'Phase 46 / 46-02 PURGA-06 (D-46-15/16): CABECALHO do ledger da purga automatica — UMA linha por '
  'execucao da varredura, com o modo e o cap VIGENTES no instante em que ela rodou. '
  'A razao de existir, e nao a estrutura: sem este registro, "quantos" nao e respondivel e "o cron '
  'parou" fica indistinguivel de "nao havia nada a purgar". '
  '⚠ HEARTBEAT (Pitfall 5): a linha e gravada em TODA execucao, INCLUSIVE com modo = off e com '
  'elegiveis = 0. E isso que torna detectavel a condicao "nenhuma linha de ledger ha mais de 36 h", '
  'e e isso que torna mensuravel o criterio de D-46-14 (>= 14 execucoes com ledger nao-vazio, >= 1 '
  'sobre conjunto NAO-VAZIO). cron.job_run_details NAO serve: acumula disco, nao e limpa '
  'automaticamente, sobrevive ao desagendamento, e registra que o JOB rodou — nao que a POLITICA foi '
  'aplicada. '
  '⚠ RETENCAO INDEFINIDA, E A RAZAO ESTA ESCRITA AQUI DE PROPOSITO (D-46-16): este e registro de '
  'CUMPRIMENTO DE OBRIGACAO LEGAL e, pelo desenho de D-46-15, NAO CONTEM PII — as duas condicoes '
  'que tornam a retencao indefinida defensavel. "Retencao sem prazo e sem razao escrita" e '
  'exatamente o que o RETEN-05 existe para eliminar, entao a razao fica dentro do banco e nao em '
  'prosa de planning. '
  '⚠ A PURGA NUNCA E INSTRUMENTO DE EXCLUSAO DIRIGIDA: nenhum caminho desta fase apaga um titular '
  'escolhido por pessoa. O alvo so existe por POLITICA, medido pelo predicado unico '
  'public.candidaturas_alem_da_janela(). '
  'RLS ligada, UMA policy de SELECT admin-only, ZERO policy de escrita.';

COMMENT ON COLUMN public.purga_execucoes.modo_vigente IS
  'O valor de config_purga.modo LIDO NO INICIO desta execucao, sob FOR UPDATE. Registrado na linha '
  'porque a config e mutavel e a pergunta "sob que regime esta execucao rodou" tem de ser '
  'respondivel meses depois, sem depender do valor atual da config.';

COMMENT ON COLUMN public.purga_execucoes.cap_vigente IS
  'O valor de config_purga.cap_titulares vigente nesta execucao. Junto com elegiveis, e o que torna '
  'auditavel um veredito cap_excedido: os dois numeros que produziram a recusa ficam na linha.';

COMMENT ON COLUMN public.purga_execucoes.elegiveis IS
  'Quantos TITULARES o predicado unico devolveu nesta execucao, contados da tabela temporaria '
  'materializada UMA vez. Contar de uma consulta e despachar de outra e a corrida que esta coluna '
  'existe para nao ter. ⚠ elegiveis = 0 e um resultado LEGITIMO e esperado no regime normal — o '
  'que ele NAO pode ser e a base de uma asserção verde: toda asserção desta fase responde "isto '
  'passaria se o conjunto fosse vazio?" antes de contar como prova (D-46-14).';

COMMENT ON COLUMN public.purga_execucoes.processados IS
  'Quantos titulares tiveram o motor destrutivo efetivamente executado. ⚠ VALE ZERO EM TODO REGIME '
  'QUE NAO SEJA live: em off a varredura retorna antes dos itens, e em dry_run o corpo do motor '
  'executa dentro de uma subtransacao que o Postgres reverte inteira. Um processados > 0 com '
  'modo_vigente <> live e a assinatura de que o escopo duplo de D-46-24 foi violado.';

COMMENT ON COLUMN public.purga_execucoes.notificacoes_expurgadas IS
  'Phase 46 / RETEN-05: quantas linhas de public.notificacoes_enviadas a regra INDEPENDENTE de '
  'retencao apagou nesta execucao (a regra que nao depende de o titular ter sido purgado — as FKs '
  'ON DELETE CASCADE de 20260721000001:78-79 ja levam as notificacoes junto na purga do titular). '
  'Nasce em 0 e so passa a ser escrita no plano 46-07.';

COMMENT ON COLUMN public.purga_execucoes.veredito IS
  'Vocabulario FECHADO de CINCO valores, um por desfecho possivel da varredura: '
  'desligado (modo = off — o kill switch de PURGA-05 mordeu; contou os elegiveis e nao tocou em '
  'nada); dry_run (percorreu e registrou, sem autorizar o caminho destrutivo); despachado (modo = '
  'live e a Edge Function foi invocada); cap_excedido (D-46-08 — o conjunto excedeu cap_vigente e a '
  'execucao ABORTOU INTEIRA: zero linha tocada, zero item, zero dispatch, NUNCA "processa ate o '
  'cap"); segredo_ausente (graceful-skip por project_url ou edge_invoke_key ausentes do Vault, '
  'gravado ANTES do RETURN — divergencia deliberada do molde de 20260727000001:159-161, que '
  'retornava em silencio). '
  '⚠ NUNCA guarda a mensagem crua do transporte, codigo HTTP, stack ou caminho de Storage.';

COMMENT ON COLUMN public.purga_execucoes.situacao IS
  'Maquina de estados da linha: executando -> concluida | abortada. Nasce executando e so vira '
  'concluida no fechamento, para que um sweep cortado por statement_timeout (Pitfall 8) deixe uma '
  'linha visivelmente INACABADA em vez de uma linha ausente. Uma execucao que ficou em executando e '
  'um sinal, nao um bug do ledger.';

COMMENT ON COLUMN public.purga_execucoes.iniciada_em IS
  'Carimbo do servidor no INSERT do cabecalho. E dele que o criterio de D-46-14 conta os 14 dias '
  'corridos e as 14 execucoes, e e sobre ele que se mede a lacuna de heartbeat (> 36 h sem linha).';

-- Índice do heartbeat e do critério de D-46-14: "qual foi a última execução" e
-- "quantas execuções nos últimos 14 dias" são as duas leituras quentes desta
-- tabela, e ambas ordenam por `iniciada_em`.
CREATE INDEX idx_purga_execucoes_iniciada
  ON public.purga_execucoes (iniciada_em DESC);

COMMENT ON INDEX public.idx_purga_execucoes_iniciada IS
  'Phase 46 / 46-02: serve a leitura de heartbeat (ultima execucao) e a contagem de execucoes na '
  'janela de 14 dias que o criterio de flip de D-46-14 exige.';


-- ---------------------------------------------------------------------------
-- 2 · public.purga_execucao_itens — o ITEM, uma linha por titular (PURGA-06)
-- ---------------------------------------------------------------------------
-- Sem esta tabela, "**o que** foi apagado" não é respondível — só "quantos"
-- (D-46-15). O item grava o identificador que DEIXA DE EXISTIR mais a POLÍTICA
-- que foi aplicada a ele.
--
-- ⚠⚠ ZERO PII, E ISTO É ESTRUTURA E NÃO ZELO. Nenhuma coluna de nome, e-mail,
-- CPF, telefone, endereço ou data de nascimento. O ledger NUNCA reintroduz o dado
-- que a purga acabou de remover — se ele o fizesse, a purga não teria purgado
-- nada, apenas movido a PII de uma tabela para outra. A asserção (h) do smoke
-- afere isso sobre `information_schema.columns` (o CATÁLOGO) e não sobre dados,
-- de propósito: a proibição tem de valer ANTES de qualquer linha existir.
--
-- ⚠ `candidato_id` **NÃO TEM FK** para `public.candidatos`, e o silêncio é
-- deliberado (idioma de `20260804000002:126-131`). Nenhuma das três disposições
-- possíveis serve: CASCADE apagaria a prova junto com o fato, no exato instante
-- em que ela passa a ser a única evidência de que a purga aconteceu; RESTRICT
-- impediria a purga de concluir; SET NULL destruiria a única coluna que responde
-- "quem". A linha do ledger tem de sobreviver ao desaparecimento do titular
-- porque ela É o registro desse desaparecimento.
CREATE TABLE public.purga_execucao_itens (
  id                    uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id           uuid                  NOT NULL REFERENCES public.purga_execucoes(id),
  candidato_id          uuid                  NOT NULL,
  etapa                 public.etapa_processo NOT NULL,
  janela_meses_aplicada integer               NOT NULL,
  ancora_origem         text                  NOT NULL,
  ancora_em             timestamptz           NOT NULL,
  desfecho_storage      text                  NOT NULL DEFAULT 'pendente',
  desfecho_postgres     text                  NOT NULL DEFAULT 'pendente',
  desfecho_auth         text                  NOT NULL DEFAULT 'pendente',
  relato_dry_run        text,
  criado_em             timestamptz           NOT NULL DEFAULT now(),
  concluido_em          timestamptz,

  CONSTRAINT ck_purga_itens_ancora
    CHECK (ancora_origem IN ('historico','decisao_final','updated_at','data_candidatura')),

  CONSTRAINT ck_purga_itens_desfecho_storage
    CHECK (desfecho_storage IN ('pendente','ok','falha','nao_aplicavel')),

  CONSTRAINT ck_purga_itens_desfecho_postgres
    CHECK (desfecho_postgres IN ('pendente','ok','falha','nao_aplicavel')),

  CONSTRAINT ck_purga_itens_desfecho_auth
    CHECK (desfecho_auth IN ('pendente','ok','falha','nao_aplicavel'))
);

ALTER TABLE public.purga_execucao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY purga_execucao_itens_admin_read ON public.purga_execucao_itens
  FOR SELECT TO authenticated
  USING ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador');

COMMENT ON POLICY purga_execucao_itens_admin_read ON public.purga_execucao_itens IS
  'Phase 46 / 46-02: leitura admin-only. ⚠ ZERO POLICY DE ESCRITA, e a partir do plano 46-04 a '
  'ausencia dela deixa de ser higiene: com D-46-18 o 4o ramo do guard de anonimizar_candidato exige '
  'item vivo NESTA tabela, com concluido_em nulo, sob execucao com situacao = executando. QUEM '
  'PUDER INSERIR AQUI AUTORIZA A DESTRUICAO DA PII DE QUALQUER PESSOA. E a mesma dependencia que '
  '20260805000006:425-429 ja nomeia para solicitacoes_dados, e a migration do 46-04 carrega o bloco '
  'de auto-verificacao que ABORTA o apply se authenticated puder escrever nesta tabela.';

COMMENT ON TABLE public.purga_execucao_itens IS
  'Phase 46 / 46-02 PURGA-06 (D-46-15/16): ITEM do ledger — UMA linha por titular alcancado por uma '
  'execucao da varredura. Sem esta tabela, "o QUE foi apagado" nao e respondivel: o cabecalho '
  'responde apenas "quantos". '
  '⚠⚠ ZERO PII, POR CONSTRUCAO: nenhuma coluna de nome, e-mail, CPF, telefone, endereco ou data de '
  'nascimento. O ledger grava o IDENTIFICADOR QUE DEIXA DE EXISTIR mais a POLITICA APLICADA, e nada '
  'mais. Um ledger que reintroduzisse a PII removida faria a purga nao purgar nada — apenas mover a '
  'PII de uma tabela para outra. A asserção (h) do smoke afere a proibicao sobre '
  'information_schema.columns (o CATALOGO) e nao sobre dados, porque ela tem de valer ANTES de '
  'qualquer linha existir. '
  '⚠ candidato_id SEM FK, deliberadamente: a linha tem de SOBREVIVER ao desaparecimento do titular, '
  'porque ela E o registro de que ele deixou de existir. CASCADE apagaria a prova junto com o fato; '
  'RESTRICT impediria a purga de concluir; SET NULL destruiria a unica coluna que responde "quem". '
  '⚠ RETENCAO INDEFINIDA (D-46-16), pela mesma razao escrita em purga_execucoes: registro de '
  'cumprimento de obrigacao legal, sem PII por desenho. '
  'RLS ligada, UMA policy de SELECT admin-only, ZERO policy de escrita.';

COMMENT ON COLUMN public.purga_execucao_itens.candidato_id IS
  'O titular alcancado. ⚠ SEM FK e SEM ON DELETE — ver o COMMENT da tabela. Depois de uma execucao '
  'em modo live este uuid tipicamente NAO resolve para nenhuma linha viva de public.candidatos nem '
  'de auth.users, e isso e o desfecho ESPERADO, nao uma inconsistencia. '
  'O alvo NUNCA e escolhido por pessoa: ele vem do predicado unico, por politica.';

COMMENT ON COLUMN public.purga_execucao_itens.etapa IS
  'Estado da candidatura que ancorou a decisao, na etapa_processo em que ela estava. E metade da '
  'resposta a "sob que politica esta pessoa foi apagada" — a outra metade e janela_meses_aplicada. '
  'Registrado no item e nao inferido depois: a matriz e mutavel, e um item que dependesse de reler '
  'config_retencao_etapa passaria a mentir sobre o passado no dia seguinte a um ajuste de janela.';

COMMENT ON COLUMN public.purga_execucao_itens.janela_meses_aplicada IS
  'A janela de config_retencao_etapa VIGENTE no instante da selecao, em meses. Congelada aqui pela '
  'mesma razao de etapa: a matriz e alteravel sem deploy, e o ledger tem de continuar respondendo '
  'sob que regra a linha foi apagada mesmo depois de a regra mudar.';

COMMENT ON COLUMN public.purga_execucao_itens.ancora_origem IS
  'Vocabulario FECHADO, verbatim dos QUATRO degraus do COALESCE da data-ancora de '
  'public.candidaturas_alem_da_janela(): historico (o criado_em mais recente de '
  'historico_candidatura cuja etapa_para e a etapa_atual — o instante em que a candidatura ENTROU '
  'no estado); decisao_final (data_decisao_final); updated_at; data_candidatura, que e NOT NULL e '
  'por isso fecha a ladeira. '
  '⚠ O PAR (origem, em) E CALCULADO UMA UNICA VEZ, no LATERAL do predicado, e VIAJA ate aqui. '
  'Recomputar a escada no ledger seria a SEGUNDA COPIA — e e assim que o ledger passa a mentir '
  'sobre por que a linha foi escolhida, enquanto o predicado escolhe por outro motivo. '
  '⚠ NUNCA guarda a mensagem crua do transporte, codigo HTTP, stack ou caminho de Storage.';

COMMENT ON COLUMN public.purga_execucao_itens.ancora_em IS
  'O instante que o degrau nomeado em ancora_origem resolveu — o MESMO valor que o WHERE do '
  'predicado comparou contra now(). Contrato de desempate: a comparacao e ESTRITA (<), entao uma '
  'candidatura cuja ancora mais a janela da EXATAMENTE now() NAO e elegivel. make_interval(months => '
  'n) conta meses de CALENDARIO, nao blocos de 30 dias.';

COMMENT ON COLUMN public.purga_execucao_itens.desfecho_storage IS
  'Vocabulario FECHADO: pendente | ok | falha | nao_aplicavel. Desfecho do passo de Storage (o CV) '
  'para este titular. A ordem imposta pela plataforma e Storage -> Postgres -> Auth, e ter um '
  'desfecho POR PASSO existe porque o catch generico nao consegue dizer em qual dos tres sistemas a '
  'mutacao parou — e essa e a unica pergunta que importa as 3 da manha sobre um arquivo que nao tem '
  'copia de reserva (20260805000006 / executar-direito-titular:384-394). '
  'Em dry_run os tres desfechos ficam em nao_aplicavel: nada foi tentado, e dizer "ok" seria mentir.';

COMMENT ON COLUMN public.purga_execucao_itens.desfecho_postgres IS
  'Vocabulario FECHADO: pendente | ok | falha | nao_aplicavel. Desfecho do passo de Postgres '
  '(anonimizacao das colunas de PII do titular). Ver o COMMENT de desfecho_storage.';

COMMENT ON COLUMN public.purga_execucao_itens.desfecho_auth IS
  'Vocabulario FECHADO: pendente | ok | falha | nao_aplicavel. Desfecho do passo de Auth (hard '
  'delete da conta). Ver o COMMENT de desfecho_storage.';

COMMENT ON COLUMN public.purga_execucao_itens.relato_dry_run IS
  'Resumo ESTRUTURADO do que o dry-run apurou para este titular: contagens por passo e o veredito '
  'do plano, no vocabulario que public.anonimizar_candidato(..., true) ja devolve. '
  '⚠ NUNCA guarda nome, e-mail, CPF, telefone, endereco nem data de nascimento — e NUNCA guarda a '
  'mensagem crua do transporte, codigo HTTP, stack ou caminho de Storage (molde: '
  '20260804000002:147-153). Um caminho de Storage contem o auth.uid() do titular e um stack pode '
  'carregar valores de coluna: os dois reintroduziriam por acidente exatamente o dado que a purga '
  'removeu. A asserção (h) do smoke afere a ausencia de coluna de PII sobre o catalogo; esta '
  'proibicao, que e sobre o CONTEUDO de uma coluna de texto livre, e responsabilidade de quem '
  'escreve nela — por isso ela esta escrita aqui, dentro do banco. '
  '⚠ NASCE NULO NO PLANO 46-02: o laco da varredura ja existe, mas a chamada ao motor so chega no '
  'plano 46-04 (o guard de anonimizar_candidato recusa qualquer chamador sem sessao, e o 4o ramo '
  'que resolve isso e D-46-18/D-46-24). E um vao de FUNCIONALIDADE, nunca de arquitetura.';

COMMENT ON COLUMN public.purga_execucao_itens.concluido_em IS
  '⚠ COLUNA LOAD-BEARING, e nao carimbo decorativo: um item com concluido_em NULO e um item ABERTO, '
  'e a varredura seguinte EXCLUI por NOT EXISTS todo candidato_id com item aberto. E o claim que '
  'impede efeitos SOBREPOSTOS sem que as execucoes se sobreponham (Pitfall 6) — sem ele, um sweep '
  'que ainda esta processando um titular seria seguido por outro que comeca a processa-lo de novo. '
  'Consequencia direta: o laco de dry-run TEM de carimbar concluido_em, senao a segunda execucao '
  'selecionaria ZERO e a idempotencia do dry-run seria falsa.';

-- Índice do claim anti-sobreposição (Pitfall 6): a varredura pergunta, para cada
-- titular candidato, "existe item aberto para este candidato_id?". Parcial em
-- `concluido_em IS NULL` porque a esmagadora maioria das linhas está fechada — é
-- o caminho quente da varredura, não otimização especulativa.
CREATE INDEX idx_purga_itens_abertos
  ON public.purga_execucao_itens (candidato_id)
  WHERE concluido_em IS NULL;

COMMENT ON INDEX public.idx_purga_itens_abertos IS
  'Phase 46 / 46-02: serve o claim anti-sobreposicao da varredura (NOT EXISTS de item aberto por '
  'candidato_id). Parcial em concluido_em IS NULL — e tambem o indice que o 4o ramo do guard de '
  'D-46-18 percorre a cada chamada do motor no plano 46-04.';

CREATE INDEX idx_purga_itens_execucao
  ON public.purga_execucao_itens (execucao_id);

COMMENT ON INDEX public.idx_purga_itens_execucao IS
  'Phase 46 / 46-02: serve a leitura "o que esta execucao alcancou", que e a pergunta que PURGA-06 '
  'exige que seja respondivel.';
