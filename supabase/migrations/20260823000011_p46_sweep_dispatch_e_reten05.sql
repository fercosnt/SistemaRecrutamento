-- =============================================================================
-- Phase 46 / Plano 46-06 — PURGA-01 · PURGA-05 · RETEN-05
-- `varrer_purga_retencao()` v3: a varredura ganha as DUAS metades que faltavam —
-- o hop para a Edge Function no ramo `live`, e a regra INDEPENDENTE de retencao
-- de `public.notificacoes_enviadas`, que e 100% Postgres e nao passa por HTTP.
-- =============================================================================
--
-- ⚠ ESCOPO NEGATIVO, EM TRES LINHAS:
-- **ELA NAO CRIA NEM REMOVE AGENDAMENTO ALGUM** (isso e a `20260823000012`, e os
-- nomes dos agendamentos vivos nao aparecem neste arquivo), **NAO ALTERA
-- `public.config_purga`** (nenhum verbo de escrita sobre aquela tabela existe
-- aqui — o flip de modo e ato do 46-07, pela RPC auditada), e **NAO TOCA
-- `public.historico_candidatura` NEM `public.decisao_final`**: a unica tabela que
-- este arquivo apaga e `public.notificacoes_enviadas`, e a trilha de decisao
-- humana que prova nao-discriminacao (Art. 7o, VI) esta fora do alcance do unico
-- verbo de exclusao deste corpo — por ESCOPO do statement, e nao por promessa.
--
-- ⚠ O QUE MUDA EM RELACAO AO `20260823000007`, e sao QUATRO acrescimos e uma
-- reordenacao. Cabecalho, leitura do cerco sob bloqueio, reconciliacao,
-- materializacao unica, contagem, aborto por cap, heartbeat, kill switch e o
-- laco de dry-run continuam byte a byte os mesmos, exceto onde marcado `46-06`.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` E PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- Apply EXCLUSIVAMENTE pelo ORQUESTRADOR (subagentes GSD nao recebem os tools MCP
-- do Supabase — bug upstream anthropics/claude-code#13898), pela VIA ATUAL:
--
--     node p46apply.cjs migrate supabase/migrations/20260823000011_p46_sweep_dispatch_e_reten05.sql
--
-- Ela le os OCTETOS DO ARQUIVO e grava a migration e a linha de
-- `supabase_migrations.schema_migrations` na MESMA requisicao (CLAUDE.md §"Via de
-- apply ATUAL"). ⚠ O `apply_migration` do MCP **TRANSCREVE** o SQL, e foi por ai
-- que duas das cinco migrations do M8 chegaram a PROD com os comentarios
-- descartados — num arquivo cujo valor esta na prosa, isso e perda de conteudo.
--
-- ⚠ **NAO HA REPARO DE `version` A FAZER.** Por esta via a linha do ledger nasce
-- com a version do nome do arquivo. A instrucao `UPDATE ... SET version` dos
-- cabecalhos das migrations `20260823000001`..`4` esta OBSOLETA (RD4-02) e hoje
-- CORROMPERIA o ledger; ela continua escrita dentro do banco porque corrigir
-- aqueles arquivos faria o md5 deles divergir e quebraria a propria prova.
--
-- Sem par de transacao explicita no topo: o driver ja envolve cada migration na
-- sua propria transacao implicita, e um par externo e o gatilho do SQLSTATE 42601
-- (CLAUDE.md §Migrations). Este arquivo tem a combinacao de gatilho: corpo
-- delimitado por cifrao NOMEADO adjacente a `ALTER FUNCTION` / `REVOKE` / `GRANT`
-- / `COMMENT`.
--
-- Conferencia obrigatoria logo apos o apply, **os dois lados registrados**:
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260823000011';
--   -- comparar com:  printf '%s' "$(cat supabase/migrations/20260823000011_*.sql)" | md5
--
-- ⚠⚠ ORDEM DE APPLY: **`20260823000011` ANTES de `20260823000012`**. Agendar um
-- job que chama uma funcao que ainda nao tem o corpo novo criaria uma janela em
-- que o cron dispara a versao anterior — e a versao anterior nao tem RETEN-05
-- nem dispatch, entao a janela seria silenciosa.
--
-- ⚠⚠ PRECONDICAO MEDIVEL, E ELA DECIDE SE O DRY-RUN CONTINUA POSSIVEL: os dois
-- segredos `project_url` e `edge_invoke_key` TEM de existir no cofre ANTES deste
-- apply. Ver a secao (3), DIVERGENCIA 2 — a ausencia deles passa a ABORTAR
-- tambem o `dry_run`, de proposito, e um banco sem eles veria as assercoes (b),
-- (c), (i), (idem) e (claim) do smoke ficarem vermelhas com o diagnostico certo
-- (`veredito = segredo_ausente`). A consulta de conferencia esta no checkpoint do
-- plano 46-06 e le, pelos dois nomes, a mesma relacao que a secao (f.5) deste
-- corpo le — ela NAO e repetida aqui de proposito, para que o portao estatico
-- "duas leituras do cofre, e so duas" continue medindo o codigo executavel.
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIENCIA — o que foi copiado, de onde
-- -----------------------------------------------------------------------------
--   · O CORPO INTEIRO vem de `20260823000007_p46_sweep_dry_run.sql`, conferido
--     antes da edicao. As secoes (a), (a.3), (b), (c), (d), (e)/(f) e o interior
--     do laco por titular estao inalterados exceto onde ha marca `46-06`.
--
--   · A FORMA DO HOP e a leitora de segredo vem de `20260727000001:101-132` e
--     `:155-193` (P41 RECON-02/03) — referencia TOTALMENTE QUALIFICADA ao schema
--     do cofre (imune a sequestro de nome, a razao de seguranca esta em `:96-99`),
--     um post por linha, cada um em bloco isolado.
--
--   · A FORMA DO EXPURGO vem de `20260730000005:123-136` — o unico outro verbo de
--     exclusao em cron deste sistema: um statement, escopado, sem negacao por
--     conjunto de valores.
--
-- -----------------------------------------------------------------------------
-- (3) ONDE ESTA MIGRATION DIVERGE DO PLANO QUE A ENCOMENDOU, E POR QUE
-- -----------------------------------------------------------------------------
-- **DIVERGENCIA 1 — RETEN-05 roda em (a.4), e nao "ao fim do corpo".** O plano
-- pedia o expurgo de notificacoes no FIM da funcao. Escrito ali, ele **nunca
-- rodaria em `off`** (o kill switch retorna em (f), antes) **nem sob
-- `cap_excedido`** (o aborto retorna em (d), antes) — e o proprio plano exige, em
-- letra, que "o mesmo statement rode nos tres modos", alem de mandar o checkpoint
-- PROVAR que em `off` a contagem de notificacoes fica inalterada. Uma regra que
-- nao roda nao pode ser provada inocente. Alem disso, a contagem precisa existir
-- ANTES do `INSERT` de heartbeat, que e quem grava a coluna do ledger.
--
-- **DIVERGENCIA 2 — a leitura do cofre acontece DEPOIS da contagem (f.5), e nao
-- "antes de qualquer selecao".** O plano pedia a leitura logo apos a config. Ali,
-- a linha de ledger com `veredito = 'segredo_ausente'` teria de gravar
-- `elegiveis = 0` — um numero que a funcao ainda nao mediu, num registro de
-- cumprimento de obrigacao legal com retencao indefinida (D-46-16). **Gravar 0
-- num campo cujo valor real e 4 e a mesma classe do RD2-01**: a mentira simetrica
-- custa o mesmo que a otimista. Lendo depois de (c), a linha carrega o `elegiveis`
-- verdadeiro e a informacao de que nada foi despachado, que e o par que o
-- operador precisa. A propriedade que o plano queria — "a ausencia e detectada e
-- REGISTRADA ainda durante o dry-run, quando consertar nao custa nada" — esta
-- preservada, e e por isso que a ausencia aborta tambem em `dry_run` e nao so em
-- `live`: um dry-run que pula em silencio a unica perna que faltaria em `live`
-- produz 14 noites de evidencia de ensaio que autorizam o flip para um `live` que
-- nao despacha nada. Isso e o dry-run DECORATIVO que o SC#1 desta fase proibe.
-- ⚠ Em `off` o cofre NAO e lido: `off` significa "esta execucao so escreve o
-- heartbeat" (RD2-05), e um `veredito = 'segredo_ausente'` ali apagaria a prova
-- do kill switch, que D-46-09/SC#3 exigem por execucao real.
--
-- **DIVERGENCIA 3 — `processados` NAO recebe o numero de posts enfileirados.** O
-- plano pedia `processados` = posts. Isso quebraria a coluna em dois sentidos ao
-- mesmo tempo: (i) o `COMMENT` vivo dela (`20260823000002:206-210`) diz que ela
-- conta "quantos titulares tiveram o motor destrutivo efetivamente executado", e
-- no instante do despacho **zero** titular teve; (ii) quem a incrementa e
-- `concluir_item_purga` (46-05, `20260823000010`), uma vez por item cujo motor
-- rodou — somar os posts aqui daria contagem DUPLA, terminando em 2N. A coluna
-- fica em 0 no fim da varredura e sobe pelas conclusoes, uma a uma. O numero de
-- despachos e recuperavel e mais fino no proprio ledger: um item aberto = um post
-- enfileirado; um item fechado com `desfecho_postgres = 'falha'` e `relato` de
-- despacho = um post que nao saiu.
--
-- **DIVERGENCIA 4 — `notificacoes_expurgadas` vale ZERO fora de `live`.** O plano
-- mandava a contagem do `GET DIAGNOSTICS` para a coluna nos tres modos. Fora de
-- `live` o expurgo e REVERTIDO, entao aquela coluna passaria a afirmar que N
-- linhas de trilha de auditoria foram apagadas quando **nenhuma** foi. O
-- `COMMENT` vivo da coluna diz, literalmente, "quantas linhas ... a regra
-- INDEPENDENTE de retencao **apagou** nesta execucao". A escolha adotada e a
-- MESMA doutrina que `processados` ja declara na coluna vizinha ("VALE ZERO EM
-- TODO REGIME QUE NAO SEJA live") — duas colunas adjacentes com convencoes
-- opostas seriam uma armadilha para o proximo leitor. O numero do ENSAIO nao se
-- perde: ele vai para um aviso, e so quando ha o que dizer.
--
-- **DIVERGENCIA 5 — em `live` o laco NAO fecha o item.** O plano descreve o laco
-- de dry-run rodando em todos os modos exceto `off`, e o dispatch percorrendo "os
-- itens abertos da execucao". As duas coisas so sao compativeis se o fechamento
-- for condicional: `reivindicar_item_purga` exige **item com `concluido_em`
-- nulo**, entao um item fechado pelo laco nao poderia ser reivindicado por
-- Edge Function nenhuma e o despacho inteiro seria recusado com `P46FB`. Em
-- `live` o `UPDATE` grava so o `relato_dry_run` e o item continua ABERTO ate a
-- Edge Function o fechar por `concluir_item_purga` — que e tambem quem fecha o
-- cabecalho. Por isso, em `live`, a execucao termina em `situacao = 'executando'`
-- e nao em `concluida`: **e a conclusao do ultimo item que a fecha**, e a
-- reconciliacao de (a.3) e quem a aborta se ninguem o fizer dentro de 1 hora.
--
-- **DIVERGENCIA 6 — a medicao honesta de `WHEN OTHERS`, pela QUARTA vez nesta
-- fase.** O criterio de aceite do plano pede `1` ocorrencia fora de comentario.
-- O valor correto e **4**, e nenhuma das quatro pode sair:
--   1. o envelope POR TITULAR (pre-existente do tracer) — impede que a falha de um
--      titular aborte os demais;
--   2. o envelope do REGISTRO daquela falha (pre-existente) — nao conseguir
--      registrar tambem nao pode derrubar a varredura;
--   3. o envelope do DESPACHO, que o proprio plano exige que seja generico, porque
--      uma falha do hop pode vir de qualquer camada;
--   4. o envelope do REGISTRO da falha de despacho, pela razao de (2) — sem ele,
--      um `UPDATE` que falhasse dentro do handler propagaria para fora do laco e
--      transformaria a falha de UM despacho na falha da varredura inteira,
--      revertendo inclusive os despachos que ja tinham sido enfileirados.
-- Remover qualquer uma e regressao. A propriedade que o criterio QUERIA medir —
-- "o envelope da chamada ao motor nao tem captura generica" — continua valendo e
-- esta medida abaixo, com o numero que a satisfaz.
--
-- MEDICAO HONESTA (fora de comentario E fora de literal de string):
--   | propriedade                                            | valor | esperado |
--   | captura generica no arquivo (os 4 handlers acima)       |   4   |    4     |
--   | captura generica DENTRO do envelope da chamada ao motor |   0   |    0     |
--   | terminador tipado do dry-run do motor                   |   1   |    1     |
--   | terminador tipado do expurgo de notificacoes            |   1   |    1     |
--   | verbo de exclusao sobre notificacoes                    |   1   |    1     |
--   | hop do pg_net                                           |   1   |    1     |
--   | leituras do cofre                                       |   2   |    2     |
--   | negacao por conjunto de valores em SQL puro             |   0   |    0     |
--
-- -----------------------------------------------------------------------------
-- (4) O QUE E O CONTRATO
-- -----------------------------------------------------------------------------
-- A espec executavel e `supabase/tests/p46_purga_smoke.sql`, assercoes **(g)** —
-- o contrato de fronteira do cap, com o lado que RODA e o lado que ABORTA —,
-- **(m)** — RETEN-05 sobre fixture retrodatada, com a negativa sobre a trilha de
-- decisao humana — e **(n)** — o texto vivo do comentario da tabela. Elas sao
-- CONTRATO: se algo divergir, corrige-se ESTA migration, nunca o smoke.
--
-- ⚠ AO FIM DESTE APPLY A PURGA CONTINUA EM `off`. Nenhuma linha deste arquivo
-- escreve em `public.config_purga`. Ligar o dry-run e ato do 46-07.
-- =============================================================================


CREATE OR REPLACE FUNCTION public.varrer_purga_retencao()
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $sweep_purga$
DECLARE
  v_modo     text;
  v_cap      integer;
  v_n        integer;
  v_execucao uuid;
  v_item     uuid;
  r          record;
  -- ── 46-04 ─────────────────────────────────────────────────────────────────
  -- ⚠ `v_relato` E `v_ret` SAO VARIAVEIS LOCAIS, E E POR ISSO QUE O RELATORIO
  --   EXISTE SEM NADA TER PERSISTIDO. O motor executa o corpo COMPLETO e o
  --   derruba com um `RAISE`; a subtransacao que o envolve e revertida inteira,
  --   inclusive as contagens que ele acabou de fazer. Mas variavel plpgsql e
  --   MEMORIA, e o rollback de subtransacao nao a reverte — o resumo capturado
  --   aqui sobrevive ao rollback e e o unico artefato do dry-run.
  v_relato   text;
  v_ret      jsonb;
  -- HI-03 · a reconciliacao de execucoes vencidas, medida para o WARNING
  v_reconc      integer := 0;
  v_reconc_exec integer := 0;
  -- ── 46-06 ─────────────────────────────────────────────────────────────────
  -- RETEN-05. `v_notif` e quantas linhas o statement ALCANCOU; `v_notif_grav` e
  -- quantas ele de fato APAGOU — os dois numeros so coincidem em `live`, e a
  -- distincao e a DIVERGENCIA 4 do cabecalho.
  v_notif       integer := 0;
  v_notif_grav  integer := 0;
  -- O hop para a Edge Function. `v_url` e `v_chave` nunca aparecem em `RAISE`
  -- algum deste corpo — nem o valor, nem um prefixo dele, nem o comprimento.
  v_url         text;
  v_chave       text;
  v_desp        integer := 0;
  v_desp_falha  integer := 0;
  d             record;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- (a) LER O CERCO, SOB BLOQUEIO DE LINHA
  -- ═══════════════════════════════════════════════════════════════════════════
  -- `FOR UPDATE` serializa contra um flip concorrente de `modo`. Ler a config numa
  -- transação e despachar noutra É a corrida: entre a leitura de `dry_run` e o
  -- dispatch, um administrador pode ter posto `live`, ou vice-versa — e o
  -- resultado seria uma execução que apaga sob um regime que ninguém autorizou.
  -- Sem `WHERE`: a tabela é singleton por construção (id boolean PRIMARY KEY com
  -- CHECK (id)), então "a linha" é inequívoca.
  SELECT cp.modo, cp.cap_titulares
    INTO v_modo, v_cap
    FROM public.config_purga cp
     FOR UPDATE;

  -- ⚠ FAIL-CLOSED: config ausente NÃO é "seguir com o padrão". Se a linha do
  -- singleton sumiu, ninguém sabe sob que regime esta execução deveria rodar, e a
  -- única resposta segura é não rodar — deixando um registro VISÍVEL de que não
  -- rodou, que é o ponto inteiro do heartbeat.
  -- ⚠ 46-06: e isso vale com forca REDOBRADA para RETEN-05, cuja janela em meses
  --   e lida DESTA MESMA LINHA. Sem a linha nao existe janela; expurgar sob um
  --   padrao presumido seria apagar trilha de auditoria sob um prazo que ninguem
  --   escolheu. Por isso o expurgo de (a.4) fica DEPOIS deste retorno.
  IF v_modo IS NULL THEN
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, notificacoes_expurgadas,
            veredito, situacao, concluida_em)
    VALUES ('ausente', 0, 0, 0, 0, 'desligado', 'abortada', pg_catalog.now());
    RAISE WARNING 'varrer_purga_retencao: public.config_purga esta VAZIA — execucao abortada sem tocar em nada. Reaplicar o seed de 20260823000001.';
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (a.3) 46-04 · RECONCILIACAO DE EXECUCOES VENCIDAS
  --       (HI-03 + RD2-01 + RD2-05 + RD3-02)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠⚠ A POSICAO DESTE BLOCO JA MUDOU DUAS VEZES, E AS DUAS POR MOTIVO MEDIDO —
  --   por isso ela esta justificada aqui com o mesmo peso que a secao (3) do
  --   cabecalho usa para justificar por que o CAP vem antes do kill switch.
  --
  --   · Na rodada 1 ela vinha em (a.2), ANTES de tudo. RD2-05 mostrou o defeito:
  --     com `modo = 'off'` a varredura executava dois `UPDATE` no ledger antes de
  --     gravar o heartbeat. O cenario concreto e um operador que aciona o kill
  --     switch EXATAMENTE para congelar uma execucao `live` travada e investiga-la
  --     — e a varredura seguinte a abortava, fechava os itens e devolvia os
  --     titulares, apagando o cenario que ele queria olhar.
  --   · Na rodada 2 ela foi para depois do kill switch. RD3-02 mostrou o defeito
  --     NOVO, e ele e pior: no caminho, ela passou tambem para depois do **CAP** e
  --     do fail-closed de config ausente — e desses so o `off` tinha sido
  --     justificado. Sob `cap_excedido`, que dura ATE INTERVENCAO HUMANA, os itens
  --     orfaos ficavam abertos e o claim anti-sobreposicao excluia aqueles
  --     titulares de **toda** varredura seguinte. E o modo de falha do PURGA-07 —
  --     "o sistema acredita ter politica funcionando e apaga zero" — reintroduzido
  --     pela peca que existe para impedi-lo.
  --
  -- ⚠ A FORMA QUE SATISFAZ OS DOIS: o bloco volta para ANTES de (b), e o kill
  --   switch e respeitado por um guard EXPLICITO em vez de por posicao. `off`
  --   continua significando "esta execucao so escreve o heartbeat"; e o cap, que
  --   e uma anomalia a investigar e nao um desligamento deliberado, deixa de
  --   bloquear a limpeza dos orfaos.
  --
  -- ⚠ E POR QUE NAO DEPOIS DE (d), ENTRE O CAP E O KILL SWITCH: porque o conjunto
  --   de (b) ja depende do resultado desta reconciliacao. Um item orfao fechado
  --   AQUI devolve o titular ao conjunto elegivel na MESMA passada; fechado depois
  --   de (b), ele so voltaria na passada seguinte, e o proprio `elegiveis` gravado
  --   no ledger descreveria um conjunto que a funcao ja sabia estar desatualizado.
  --
  -- ⚠⚠ 46-06 · E ELA E A OUTRA PONTA DO DESPACHO ASSINCRONO QUE NASCE NESTE
  --   ARQUIVO. A partir de agora existe, de verdade, o caso que ela foi escrita
  --   para tratar: em `live` o item fica ABERTO esperando a Edge Function, e se a
  --   Edge Function nunca chegar (post perdido, worker do pg_net represado alem do
  --   TTL de ~6 h, funcao morta no meio) e este bloco — e mais nada — que devolve
  --   o titular as varreduras seguintes.
  IF v_modo <> 'off' THEN
    -- Na rodada 1 ela estava em (a.2), antes do cap e antes do `off` — e com o cerco
    -- desligado a varredura executava dois `UPDATE` no ledger antes de gravar o
    -- heartbeat. O cenario que isso quebra e concreto: um operador aciona o kill
    -- switch EXATAMENTE para congelar uma execucao `live` que travou e investiga-la,
    -- e a varredura seguinte a abortava, fechava os itens e devolvia os titulares —
    -- apagando o cenario que ele queria olhar. **`off` significa "esta execucao so
    -- escreve o heartbeat"**.
    -- ⚠ E O KILL SWITCH E RESPEITADO PELO `IF` ACIMA, NAO POR POSICAO. A frase
    -- anterior aqui dizia «o ramo `off` acima retorna ANTES daqui» — verdadeira
    -- enquanto o bloco vinha depois de (f), e FALSA desde que RD3-02 o devolveu
    -- para antes de (b). O ramo `off` de (f) esta LOGO ABAIXO deste bloco. Deixar
    -- a frase seria a forma exata que BL-01 e RD3-01 nomeiam: comentario que
    -- contradiz o codigo ao lado, e que o proximo leitor acredita.
    --
    -- ⚠ E A OUTRA METADE DO CONSERTO CUJA PRIMEIRA METADE ESTA NO GUARD. O 4o ramo
    -- de `20260823000006` exige `e.iniciada_em > now() - interval '1 hour'`, entao a
    -- AUTORIZACAO ja expira sozinha. Mas expirar a autorizacao nao fecha o item — e e
    -- o ITEM ABERTO que o claim anti-sobreposicao de (b) enxerga. Sem esta secao, um
    -- titular cuja Edge Function morreu ficaria com item aberto para sempre e
    -- **sumiria de todas as varreduras seguintes, sem ninguem ser avisado**.
    --
    -- ⚠ A JANELA E A MESMA DO GUARD, E O PORTAO MEDE O VALOR, nao so a existencia:
    -- (C3/janela) do `p45_motor_exclusao_smoke.sql` extrai o literal dos TRES corpos
    -- e exige igualdade. Se as tres divergirem, existe um intervalo em que o item
    -- ainda autoriza a destruicao e a varredura ja o considera orfao — e agora isso
    -- reprova alto em vez de depender de alguem lembrar (RD2-06).
    --
    -- ⚠⚠ O QUE ELA ESCREVE — E ESTE E O CONSERTO DO RD2-01, O MAIS IMPORTANTE DOS
    -- TRES. A versao da rodada 1 carimbava `desfecho_postgres = 'falha'`
    -- INCONDICIONALMENTE. Se a Edge Function tivesse concluido o Postgres e morrido
    -- antes de fechar o item, o ledger passaria a AFIRMAR que a anonimizacao daquele
    -- titular falhou — sobre um ato que aconteceu e **nao tem volta**. E
    -- `purga_execucao_itens` e, por D-46-16, registro de cumprimento de obrigacao
    -- legal com retencao INDEFINIDA, e com o PITR desligado nao existe segunda fonte
    -- para desmentir. Este arquivo ja escreveu que "dizer ok aqui seria a mentira
    -- mais cara possivel"; **a mentira simetrica custa o mesmo**.
    --
    -- As tres colunas seguem tres regras diferentes, e a diferenca e epistemica:
    --   · JA CARIMBADO -> PRESERVADO, sempre. Um desfecho gravado descreve um ato
    --     que alguem observou; reescreve-lo e falsificar o registro.
    --   · POSTGRES pendente -> **INFERIDO DO PROPRIO BANCO**, nunca presumido. O
    --     tombstone e UMA transacao (a atomicidade e o requisito declarado em
    --     `20260805000006:266-272`), entao ou a sentinela do CR-06 esta na linha de
    --     `candidatos` — e o passo aconteceu — ou nao esta, e nao aconteceu. O
    --     predicado e o MESMO do motor: igualdade com o valor derivado do id, mais o
    --     cinto de `user_id` severado e `data_nascimento` na sentinela de 1900 —
    --     jamais um padrao sobre `email`, que o usuario escreve (CR-06).
    --   · STORAGE e AUTH pendentes -> **`desconhecido`**. O Postgres NAO TEM COMO
    --     SABER: a SONDA 2 mediu que `storage.objects` nao tem FK para `auth.users`,
    --     e o Auth vive fora do banco. `falha` afirmaria que nao aconteceu e
    --     `nao_aplicavel` que nao havia o que fazer — as duas sao asserções sobre um
    --     fato que ninguem observou. O vocabulario ganhou a palavra em
    --     `20260823000009` exatamente para que o ledger possa dizer "eu nao sei".
    UPDATE public.purga_execucao_itens i
       SET desfecho_postgres = CASE
             WHEN i.desfecho_postgres <> 'pendente' THEN i.desfecho_postgres
             WHEN EXISTS (
                    SELECT 1 FROM public.candidatos c
                     WHERE c.id = i.candidato_id
                       AND c.email = 'anonimizado+' || c.id::text || '@invalido.local'
                       AND c.user_id IS NULL
                       AND c.data_nascimento = DATE '1900-01-01'
                  ) THEN 'ok'
             WHEN EXISTS (SELECT 1 FROM public.candidatos c WHERE c.id = i.candidato_id)
                  THEN 'falha'
             ELSE 'desconhecido'
           END,
           desfecho_storage = CASE WHEN i.desfecho_storage = 'pendente'
                                   THEN 'desconhecido' ELSE i.desfecho_storage END,
           desfecho_auth    = CASE WHEN i.desfecho_auth    = 'pendente'
                                   THEN 'desconhecido' ELSE i.desfecho_auth    END,
           concluido_em     = pg_catalog.now(),
           relato_dry_run   = coalesce(i.relato_dry_run, '')
             || '[RECONCILIADO] item ABERTO em execucao que nao terminou dentro da janela de 1 hora. '
             || 'Os desfechos JA carimbados foram PRESERVADOS: eles descrevem atos que alguem observou, '
             || 'e reescreve-los faria o registro de cumprimento de obrigacao legal (D-46-16) mentir '
             || 'sobre um ato irreversivel. O de Postgres foi INFERIDO da sentinela do CR-06 na linha '
             || 'de candidatos, porque o tombstone e UMA transacao e o banco sabe a resposta. Os de '
             || 'Storage e Auth ficaram desconhecido: o Postgres nao tem como saber se aconteceram, e '
             || 'afirmar qualquer coisa ali seria inventar. Este fechamento devolve o titular as '
             || 'varreduras seguintes, porque um item aberto para sempre o excluiria para sempre.'
     WHERE i.concluido_em IS NULL
       AND EXISTS (
             SELECT 1
               FROM public.purga_execucoes e
              WHERE e.id = i.execucao_id
                AND e.situacao    = 'executando'
                AND e.iniciada_em <= pg_catalog.now() - interval '1 hour'
           );

    GET DIAGNOSTICS v_reconc = ROW_COUNT;

    UPDATE public.purga_execucoes e
       SET situacao     = 'abortada',
           concluida_em = pg_catalog.now()
     WHERE e.situacao    = 'executando'
       AND e.iniciada_em <= pg_catalog.now() - interval '1 hour';

    GET DIAGNOSTICS v_reconc_exec = ROW_COUNT;

    IF v_reconc > 0 OR v_reconc_exec > 0 THEN
      -- ⚠ `WARNING` E O PISO, NAO O TETO: o que sobrevive e a LINHA DE LEDGER, com o
      -- relato dizendo exatamente o que foi preservado, o que foi inferido e o que
      -- ficou desconhecido. Uma falha reportada so por WARNING e uma falha que
      -- ninguem ve (a divergencia 1 que este arquivo herdou do 46-02).
      RAISE WARNING 'varrer_purga_retencao: RECONCILIACAO fechou % item(ns) orfao(s) em % execucao(oes) vencida(s) (mais de 1 hora em executando). Desfechos ja carimbados foram PRESERVADOS; o de Postgres foi INFERIDO da sentinela; Storage e Auth ficaram desconhecido. ⚠ E OS DOIS desconhecido NAO TEM O MESMO PESO (RD3-07): para o Auth e DEFINITIVO, porque auth.users vive fora do alcance desta consulta. Para o Storage e uma ESCOLHA desta varredura, e ela so e a unica resposta possivel em METADE dos casos — quando o Postgres ficou em ok o tombstone ja anulou candidaturas.curriculo_url e o caminho do objeto se perdeu; quando ficou em falha a linha esta viva, curriculo_url CONTINUA la, e storage.objects e uma tabela deste mesmo banco: aquele objeto E determinavel, e cabe a Edge Function purgar-retencao reconcilia-lo, nao a esta varredura. Investigar a Edge Function purgar-retencao: item aberto para sempre e autorizacao destrutiva permanente pelo guard, e titular excluido para sempre das varreduras pelo claim anti-sobreposicao.', v_reconc, v_reconc_exec;
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (a.4) 46-06 · RETEN-05 — A REGRA INDEPENDENTE DE RETENCAO DE NOTIFICACOES
  --       (D-46-17 / D-46-20) — 100% Postgres, sem Edge Function e sem hop HTTP
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠⚠ POR QUE ELA EXISTE, e a frase e literal: desde 2026-07-21 o comentario
  --   vivo da tabela `public.notificacoes_enviadas` declara retencao sem prazo
  --   com o expurgo diferido a este milestone. **Isso e uma promessa sem codigo**,
  --   e e exatamente a classe de achado que o CONSOL-04 audita. Este bloco e o
  --   codigo; a reescrita daquele comentario, no fim deste arquivo, e a outra
  --   metade — as duas na MESMA migration, porque separa-las deixaria o banco
  --   afirmando uma coisa e fazendo outra por uma janela inteira.
  --
  -- ⚠ ELA E INDEPENDENTE, e essa palavra e o requisito. As chaves estrangeiras
  --   `ON DELETE CASCADE` de `20260721000001:78-79` ja levam as notificacoes junto
  --   quando um titular e purgado — mas neste sistema elas estao **DORMENTES**: o
  --   motor de exclusao ANONIMIZA em vez de apagar (ERASE-08 preserva as linhas de
  --   `candidatos` e `candidaturas`), entao a cascata nunca dispara. O que falta,
  --   e o que RETEN-05 pede, e a expiracao das notificacoes de candidaturas que
  --   **NAO** foram purgadas. A assercao (m) mede as duas metades: a notificacao
  --   vencida some E nenhuma candidatura ou candidato foi apagado na mesma
  --   execucao — sem essa segunda metade, um expurgo por cascata passaria por
  --   cumprimento da regra independente.
  --
  -- ⚠ A ANCORA E `criado_em` PORQUE ELA E A UNICA COLUNA TEMPORAL `NOT NULL`
  --   daquela tabela (`20260721000001:75-93`): `enviado_em`, `entregue_em` e as
  --   demais sao todas nulas. Ancorar numa coluna nula faria a soma avaliar NULO,
  --   a comparacao devolver DESCONHECIDO, e a linha sair **em silencio** da
  --   contagem — a mesma familia do INVENT-05, que este projeto ja embarcou uma
  --   vez e corrigiu em `20260730000005`.
  --
  -- ⚠ A JANELA VEM DO ESCALAR PROPRIO `config_purga.janela_notificacoes_meses`
  --   (D-46-20), JAMAIS derivada do maior valor da matriz de retencao. Derivar
  --   mudaria a retencao de notificacoes em SILENCIO no dia em que um admin
  --   encurtasse a janela de um estado — e a relacao "notificacao <-> etapa" nem
  --   existe no modelo. (A forma proibida seria um max(janela_meses) sobre
  --   config_retencao_etapa; ela nao aparece neste arquivo, e o portao estatico
  --   afere isso fora de comentario.)
  --
  -- ⚠⚠ UM STATEMENT SO, NOS TRES MODOS — e e isso que o torna honesto. Fora de
  --   `live` o bloco termina com o ERRCODE proprio, que reverte o expurgo
  --   INTEIRO; a contagem tirada por `GET DIAGNOSTICS` **antes** do `RAISE`
  --   sobrevive na variavel local, porque o rollback de subtransacao nao restaura
  --   variavel plpgsql. **Nunca dois statements, um para contar e outro para
  --   apagar**: a forma de dois corpos e o parente direto do CR-02 da Phase 39 —
  --   uma segunda definicao da regra, que passa a divergir da primeira sem que
  --   ninguem perceba, e um dry-run que mede uma coisa e um `live` que faz outra.
  --
  -- ⚠ A captura e TIPADA pelo ERRCODE proprio, jamais generica: uma captura
  --   generica aqui engoliria um erro REAL do expurgo — violacao de constraint,
  --   corte por timeout — e o apresentaria como "revertido conforme o esperado",
  --   que e o pior falso verde que este bloco pode produzir.
  BEGIN
    DELETE FROM public.notificacoes_enviadas n
     WHERE n.criado_em + make_interval(months => (SELECT cp.janela_notificacoes_meses
                                                    FROM public.config_purga cp)) < pg_catalog.now();

    GET DIAGNOSTICS v_notif = ROW_COUNT;

    IF v_modo <> 'live' THEN
      RAISE EXCEPTION 'P46 RETEN-05 ENSAIO: o expurgo alcancou % linha(s) de notificacoes_enviadas e esta sendo REVERTIDO porque modo_vigente = %. O statement e o MESMO que roda em live — nao ha segunda definicao da regra — e a contagem sobrevive nesta variavel para ir ao ledger como ensaio, nunca como expurgo consumado', v_notif, v_modo
        USING ERRCODE = 'P46RN';
    END IF;
  EXCEPTION
    WHEN SQLSTATE 'P46RN' THEN
      -- Reversao ESPERADA. `v_notif` sobreviveu; a tabela nao foi tocada.
      NULL;
  END;

  -- ⚠ DIVERGENCIA 4 DO CABECALHO, AQUI EM UMA LINHA: a coluna do ledger recebe o
  --   que foi APAGADO, e fora de `live` isso e ZERO. O numero do ensaio nao se
  --   perde — ele vai para o aviso abaixo, e so quando ha o que dizer.
  v_notif_grav := CASE WHEN v_modo = 'live' THEN v_notif ELSE 0 END;

  IF v_notif > 0 THEN
    IF v_modo = 'live' THEN
      RAISE WARNING 'varrer_purga_retencao: RETEN-05 APAGOU % linha(s) de notificacoes_enviadas com criado_em alem da janela de config_purga.janela_notificacoes_meses. Isto e irreversivel (PITR desligado, D-45-10) e esta registrado em purga_execucoes.notificacoes_expurgadas.', v_notif;
    ELSE
      RAISE WARNING 'varrer_purga_retencao: RETEN-05 em ENSAIO sob modo % — % linha(s) de notificacoes_enviadas SERIAM apagadas por criado_em alem da janela, e o expurgo foi revertido. A coluna notificacoes_expurgadas fica em ZERO de proposito: ela conta o que foi apagado, e fora de live nada foi (a mesma doutrina que processados declara na coluna vizinha).', v_modo, v_notif;
    END IF;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (b) MATERIALIZAR O CONJUNTO **UMA VEZ**
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Contar de uma consulta e percorrer de outra é a corrida. A temporária dá a
  -- MESMA expressão às duas perguntas — "quantos são" e "quais são" — e é por isso
  -- que `elegiveis` no ledger é o número que o laço efetivamente percorreu, e não
  -- um número parecido.
  --
  -- ⚠ O `NOT EXISTS` de item ABERTO é o CLAIM ANTI-SOBREPOSIÇÃO (Pitfall 6):
  -- efeitos podem se sobrepor sem que as EXECUÇÕES se sobreponham. Um titular que
  -- ficou com item aberto numa execução anterior — porque aquela foi cortada pelo
  -- `statement_timeout`, ou porque um passo falhou entre Storage e Auth — NÃO é
  -- re-selecionado, mesmo continuando além da janela. Correlacionado por
  -- `NOT EXISTS`, jamais por negação de pertencimento a conjunto de valores: com
  -- um conjunto que contenha NULL, aquela forma devolve DESCONHECIDO e o registro
  -- ESCAPA (INVENT-05, `20260730000005`) — aqui "escapar" significaria apagar
  -- alguém duas vezes.
  --
  -- ⚠ 46-06: A PARTIR DESTE ARQUIVO O CLAIM PASSA A SER A PECA CENTRAL DO DESENHO
  -- ASSINCRONO, e nao mais uma guarda contra corte por timeout. Em `live` o item
  -- fica ABERTO de propósito, esperando a Edge Function — e e este `NOT EXISTS`
  -- que impede a varredura da noite seguinte de despachar um SEGUNDO post para um
  -- titular cuja purga ainda esta em curso.
  --
  -- ⚠ `pg_temp.` EXPLÍCITO, e o `DROP` guardado: com `search_path = ''` a
  -- resolução implícita do schema temporário é sutil demais para se confiar num
  -- corpo que decide quem é apagado, e o smoke desta fase chama esta função DUAS
  -- VEZES dentro da mesma transação (a prova de idempotência do dry-run) — onde o
  -- `ON COMMIT DROP` ainda não teria disparado.
  IF pg_catalog.to_regclass('pg_temp.tmp_purga_alvos') IS NOT NULL THEN
    DROP TABLE pg_temp.tmp_purga_alvos;
  END IF;

  CREATE TEMP TABLE tmp_purga_alvos ON COMMIT DROP AS
    SELECT t.candidato_id,
           t.candidaturas_alem,
           t.etapa,
           t.janela_meses_aplicada,
           t.ancora_origem,
           t.ancora_em
      FROM public.titulares_alem_da_janela() t
     WHERE NOT EXISTS (
             SELECT 1
               FROM public.purga_execucao_itens i
              WHERE i.candidato_id = t.candidato_id
                AND i.concluido_em IS NULL
           );

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (c) O NÚMERO — contado da temporária, e de mais lugar nenhum
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT count(*)::integer INTO v_n FROM pg_temp.tmp_purga_alvos;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (d) CAP — ABORTO INTEGRAL (D-46-08 / PURGA-05)
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠ NUNCA RECORTA O TRABALHO PELO CAP. Não há `LIMIT v_cap` neste corpo, e a
  -- ausência dele é o requisito — ver a seção (3) do cabeçalho. Zero linha de
  -- titular tocada, zero item, zero despacho.
  --
  -- ⚠ A COMPARACAO E `>` ESTRITO, E O CONTRATO DE FRONTEIRA E EXPLICITO
  -- (PURGA-05): `elegiveis = cap` EXECUTA · `elegiveis = cap - 1` EXECUTA ·
  -- `elegiveis = cap + 1` ABORTA. Os dois lados sao inteiros — `v_n` vem de um
  -- `count(*)::integer` e `cap_titulares` e `integer` com CHECK BETWEEN 1 AND 500
  -- —, entao nao ha arredondamento nem perda de precisao na fronteira. A assercao
  -- (g) do smoke exercita os TRES pontos, inclusive os dois que RODAM: sem o lado
  -- que roda, o portao provaria apenas que a funcao recusa, que e o modo de falha
  -- no 3 dos sete portoes da Phase 45.
  --
  -- ⚠ ORDEM DELIBERADA: o cap é avaliado ANTES do kill switch. Um conjunto grande
  -- demais é informação que o operador precisa ter mesmo com a purga desligada —
  -- é o sinal de que o predicado pode ter quebrado. Nada fica mascarado, porque
  -- `modo_vigente` é gravado na mesma linha: uma linha `cap_excedido` com
  -- `modo_vigente = 'off'` diz as duas coisas de uma vez.
  --
  -- ⚠ 46-06 · E RETEN-05 **NAO** E BLOQUEADA PELO CAP, de proposito. O cap governa
  -- o conjunto de TITULARES e existe porque um conjunto grande demais e sinal de
  -- predicado quebrado NAQUELE predicado. RETEN-05 tem predicado proprio, sobre
  -- outra tabela, com outra janela. Suspende-la aqui faria uma condicao que dura
  -- ATE INTERVENCAO HUMANA levar junto, em silencio, a retencao de notificacoes —
  -- que e literalmente o defeito RD3-02, um bloco correto desligando uma peca
  -- alheia por posicao. Por isso (a.4) roda antes, e a linha abaixo registra o que
  -- ela apagou mesmo no aborto.
  IF v_n > v_cap THEN
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, notificacoes_expurgadas,
            veredito, situacao, concluida_em)
    VALUES (v_modo, v_cap, v_n, 0, v_notif_grav, 'cap_excedido', 'concluida', pg_catalog.now());
    RAISE WARNING 'varrer_purga_retencao: conjunto elegivel (%) EXCEDE o cap (%) — execucao ABORTADA INTEIRA, zero titular tocado, zero item, zero despacho. Isto nao e um limite de lote: um conjunto acima do cap e sinal de predicado quebrado, e processar ate o cap apagaria gente em silencio (D-46-08).', v_n, v_cap;
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (e)+(f) HEARTBEAT E KILL SWITCH — o cabeçalho é gravado SEMPRE
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠ O KILL SWITCH É PROVADO DESLIGANDO DE VERDADE (D-46-09 / SC#3), nunca por
  -- leitura de config. Por isso o ramo `off` não é um `RETURN` mudo no topo da
  -- função: ele CONTA os elegíveis, grava a linha com `veredito = 'desligado'` e
  -- `processados = 0`, e só então retorna — ANTES de qualquer item. É uma execução
  -- real que não apaga nada, e o ledger prova isso por escrito.
  --
  -- ⚠ O cabeçalho é gravado inclusive com `elegiveis = 0`. É isso que torna
  -- detectável a lacuna "nenhuma linha de ledger há mais de 36 h", e é isso que
  -- torna mensurável o critério de D-46-14. `cron.job_run_details` não serve:
  -- acumula disco, não é limpo automaticamente, sobrevive ao desagendamento, e
  -- registra que o JOB rodou — não que a POLÍTICA foi aplicada.
  --
  -- ⚠ 46-06 · `notificacoes_expurgadas` E ZERO NESTE RAMO POR CONSTRUCAO, e nao
  -- por esquecimento: em `off` o expurgo de (a.4) rodou e foi revertido, entao
  -- nenhuma linha foi apagada e a coluna tem de dizer isso. Uma linha de heartbeat
  -- com `modo_vigente = 'off'` e `notificacoes_expurgadas > 0` seria lida, com
  -- razao, como "a purga desligada apagou trilha de auditoria".
  IF v_modo = 'off' THEN
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, notificacoes_expurgadas,
            veredito, situacao, concluida_em)
    VALUES (v_modo, v_cap, v_n, 0, v_notif_grav, 'desligado', 'concluida', pg_catalog.now());
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (f.5) 46-06 · O COFRE — leitura escopada, e o skip que DEIXA RASTRO
  -- ═══════════════════════════════════════════════════════════════════════════
  -- Referencia TOTALMENTE QUALIFICADA ao schema do cofre: com `search_path = ''`
  -- e um nome qualificado, nao ha caminho de sequestro de nome. Dois segredos,
  -- lidos um a um pelo NOME — nunca uma leitura generica que devolvesse o cofre
  -- inteiro (a razao de seguranca esta escrita em `20260727000001:96-99`: escopar
  -- limita o raio de um comprometimento a UM segredo).
  --
  -- ⚠⚠ DIVERGENCIA OBRIGATORIA EM RELACAO AO P41, E ELA E O PITFALL 5 INTEIRO. La
  --   (`20260727000001:159-161`), segredo ausente faz a funcao **retornar em
  --   silencio**. Aqui ela grava a linha de ledger ANTES de retornar, porque um
  --   retorno silencioso e INDISTINGUIVEL de "nada elegivel": a politica de
  --   retencao deixaria de existir e o unico sinal seria a ausencia de uma linha
  --   que ninguem esta olhando. Com a linha, "a purga nao roda ha N noites por
  --   falta de segredo" e uma consulta de uma linha.
  --
  -- ⚠ E ela grava o `elegiveis` VERDADEIRO, porque esta leitura acontece depois de
  --   (c) — ver DIVERGENCIA 2 do cabecalho. Gravar 0 ali seria inventar um numero
  --   dentro de um registro de cumprimento de obrigacao legal.
  --
  -- ⚠ NENHUM `RAISE` DESTE BLOCO CARREGA VALOR DE SEGREDO — nem o valor, nem um
  --   prefixo, nem o comprimento. A mensagem diz QUAL NOME faltou, e nada mais; o
  --   nome de um segredo ausente nao e segredo, e e a unica informacao que torna o
  --   conserto possivel sem uma segunda investigacao.
  SELECT s.decrypted_secret INTO v_url
    FROM vault.decrypted_secrets s WHERE s.name = 'project_url';
  SELECT s.decrypted_secret INTO v_chave
    FROM vault.decrypted_secrets s WHERE s.name = 'edge_invoke_key';

  IF v_url IS NULL OR v_chave IS NULL THEN
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, notificacoes_expurgadas,
            veredito, situacao, concluida_em)
    VALUES (v_modo, v_cap, v_n, 0, v_notif_grav, 'segredo_ausente', 'concluida', pg_catalog.now());
    RAISE WARNING 'varrer_purga_retencao: segredo ausente no cofre (project_url presente=%, edge_invoke_key presente=%) — execucao ABORTADA com veredito segredo_ausente, zero titular tocado. ⚠ Ela aborta TAMBEM em dry_run, e nao so em live: um ensaio que pulasse em silencio a unica perna que faltaria em live produziria noites de evidencia que autorizam o flip para um live incapaz de despachar. Provisionar os dois segredos e reexecutar.',
      (v_url IS NOT NULL), (v_chave IS NOT NULL);
    RETURN;
  END IF;

  INSERT INTO public.purga_execucoes
         (modo_vigente, cap_vigente, elegiveis, processados, notificacoes_expurgadas,
          veredito, situacao)
  VALUES (v_modo, v_cap, v_n, 0, v_notif_grav, 'dry_run', 'executando')
  RETURNING id INTO v_execucao;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (g) O LAÇO — um item por titular, cada um em subtransação própria
  -- ═══════════════════════════════════════════════════════════════════════════
  -- As colunas de política vêm DIRETO da temporária, ou seja: do par (origem, em)
  -- que o `LATERAL` do predicado calculou UMA vez. Recomputá-las aqui seria a
  -- segunda cópia, e é assim que o ledger passaria a mentir sobre por que a linha
  -- foi escolhida.
  FOR r IN SELECT * FROM pg_temp.tmp_purga_alvos LOOP
    BEGIN
      -- O item nasce ABERTO (`concluido_em` nulo). Entre este `INSERT` e o
      -- `UPDATE` que o fecha está a janela em que o motor roda — e é exatamente
      -- essa janela que o claim anti-sobreposição de (b) enxerga.
      INSERT INTO public.purga_execucao_itens
             (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em)
      VALUES (v_execucao, r.candidato_id, r.etapa, r.janela_meses_aplicada, r.ancora_origem, r.ancora_em)
      RETURNING id INTO v_item;

      -- ══ 46-04 · A CHAMADA AO MOTOR — A LACUNA DELIBERADA DO 46-02 FECHA AQUI ══
      -- ⚠ ELA E O REQUISITO INTEIRO DO PURGA-02: o dry-run tem de sair da MESMA
      --   EXPRESSAO do delete real. Nao "uma query equivalente", nao "o mesmo
      --   WHERE copiado" — a MESMA CHAMADA DE FUNCAO. O motor executa o corpo
      --   COMPLETO (as doze mutacoes, na ordem que a plataforma impoe) e so entao
      --   derruba tudo com o terminador. Uma segunda definicao de exclusao no
      --   banco e como o dry-run passa a mentir sobre a purga sem que ninguem
      --   perceba, e tem nome neste projeto: P39 / CR-02.
      --
      -- ⚠ O SEGUNDO ARGUMENTO CONTINUA SENDO O LITERAL `true`, INCLUSIVE EM
      --   `live`, E ISSO E DESENHO E NAO OMISSAO (46-06): quem destroi de verdade
      --   e a Edge Function `purgar-retencao`, um titular por invocacao, com teto
      --   de parede proprio e retomavel. O que este laco produz em `live` e o
      --   ENSAIO daquele titular — as contagens por passo, capturadas em
      --   `relato_dry_run` **imediatamente antes** da destruicao real. E a
      --   pre-imagem que fica no registro de cumprimento depois que o dado sumiu.
      --   Um `false` aqui destruiria N titulares dentro de UMA transacao de cron,
      --   sem teto de parede, sem retomada e sem a ordem Storage -> Postgres ->
      --   Auth — a cada corte por timeout, um lote meio aplicado.
      --
      -- ⚠ O ITEM JA ESTA ABERTO NESTE PONTO, E ISSO E PRE-CONDICAO, NAO ORDEM
      --   ARBITRARIA: o 4o ramo do guard (`20260823000006`) exige item vivo com
      --   `concluido_em IS NULL` para este `candidato_id`. Inserir o item depois
      --   da chamada faria TODA chamada receber 42501.
      v_relato := NULL;
      v_ret    := NULL;

      BEGIN
        SELECT public.anonimizar_candidato(r.candidato_id, true) INTO v_ret;

        -- ⚠⚠ CHEGAR A ESTA LINHA E, EM REGRA, DEFEITO — E O DEFEITO MAIS CARO QUE
        --   ESTE ARQUIVO PODE ENCONTRAR: significa que o terminador do dry-run
        --   sumiu do motor e que a transacao teria COMMITADO o corpo destrutivo.
        --   "Nao lancou" nunca foi o mesmo que "completou".
        --
        -- ⚠ EXCETO POR UMA TERMINACAO, E ELA E CONTRATO (WR-05, escrito no COMMENT
        --   vivo do motor): o dry-run tem DUAS terminacoes. Numa linha VIVA ele
        --   termina em `P45DR`; numa linha que JA e tombstone ele RETORNA
        --   NORMALMENTE com `resultado = 'ja_anonimizado'`, porque o ramo de
        --   idempotencia por ESTADO devolve ANTES do terminador, sem mutar coluna
        --   alguma. Depois do primeiro `live`, um titular anonimizado continua com
        --   linha em `candidatos` e em `candidaturas` (ERASE-08 as preserva),
        --   continua alem da janela e continua numa etapa da allowlist — ou seja,
        --   ele VOLTA a ser selecionado. Tratar essa reincidencia legitima como
        --   defeito seria um portao correto reprovando trabalho correto, todo dia.
        IF (v_ret ->> 'resultado') = 'ja_anonimizado' THEN
          v_relato := 'P45 DRY-RUN (2a terminacao, WR-05): o titular JA e tombstone. O motor reconheceu a sentinela por ESTADO e devolveu ja_anonimizado ANTES do terminador, sem mutar coluna alguma e sem criar linha de auditoria. Nao e defeito: e a idempotencia por estado funcionando.';
        ELSE
          RAISE EXCEPTION 'P46 DRY-RUN NAO TERMINOU: public.anonimizar_candidato(%, true) RETORNOU NORMALMENTE com resultado = %. As duas terminacoes CONTRATADAS do dry-run sao o SQLSTATE P45DR (linha viva) e o retorno ja_anonimizado (linha que ja e tombstone) — qualquer outro retorno normal significa que o terminador sumiu do corpo do motor e que esta transacao teria COMMITADO as doze mutacoes destrutivas. Com PITR desligado (D-45-10) e o Storage fora do backup, isso seria irrecuperavel. A varredura e DERRUBADA aqui de proposito, sem gravar item nem fechar a execucao: uma linha de ledger dizendo falha diria a coisa errada, e um sweep que continuasse repetiria o corpo destrutivo em cada titular restante',
            r.candidato_id, coalesce(v_ret ->> 'resultado', '<nulo>')
            USING ERRCODE = 'P46NT';
        END IF;

      EXCEPTION
        -- ⚠⚠ CAPTURA TIPADA, E SO ELA. A captura generica e PROIBIDA NESTE
        --   ENVELOPE, e a razao esta escrita no proprio motor
        --   (`20260805000006:765-768`): um erro real disfarcado de "dry-run
        --   concluido" seria o pior falso verde desta fase, e no sentido inverso
        --   um `P45DR` chegando no caminho real passaria por sucesso quando nada
        --   foi apagado. Tudo o que NAO for o terminador — 42501 do guard, erro
        --   real, corte por timeout — sobe para o envelope de fora e vira o que
        --   deve virar: falha atribuida, e nunca sucesso.
        WHEN SQLSTATE 'P45DR' THEN
          -- `SQLERRM` traz as doze contagens por passo que o motor acabou de
          -- produzir. A subtransacao deste bloco ja foi revertida; a variavel,
          -- nao. E assim que o relatorio existe sem nada ter persistido.
          v_relato := SQLERRM;
      END;

      -- ⚠⚠ 46-06 · O FECHAMENTO DO ITEM E CONDICIONAL AO MODO, E A DIFERENCA E O
      --   DESENHO ASSINCRONO INTEIRO (DIVERGENCIA 5 do cabecalho).
      --
      --   · FORA DE `live`: nada foi tentado, os tres desfechos ficam em
      --     `nao_aplicavel` — dizer `ok` aqui seria a mentira mais cara possivel
      --     neste arquivo — e `concluido_em` e carimbado. Sem esse carimbo o
      --     titular ficaria com item aberto e a execucao seguinte o excluiria para
      --     sempre.
      --
      --   · EM `live`: o item continua **ABERTO**, com os desfechos em `pendente`,
      --     porque `reivindicar_item_purga` (`20260823000010`) exige `concluido_em
      --     IS NULL` e um item fechado aqui seria recusado com `P46FB` na porta —
      --     o despacho inteiro viraria 403. Quem fecha o item e a Edge Function,
      --     por `concluir_item_purga`, e e o fechamento do ULTIMO item que fecha o
      --     cabecalho da execucao. Se ninguem fechar, a reconciliacao de (a.3)
      --     aborta a execucao depois de 1 hora e devolve o titular.
      --
      --   ⚠ `relato_dry_run` recebe a variavel local nos dois ramos, e ela e NOT
      --     NULL por construcao — os dois unicos caminhos que chegam aqui a
      --     preenchem. Um item com `relato_dry_run` nulo significa que a chamada
      --     ao motor nao aconteceu, e a assercao (b) do smoke reprova sobre isso.
      IF v_modo = 'live' THEN
        UPDATE public.purga_execucao_itens i
           SET relato_dry_run = v_relato
         WHERE i.id = v_item;
      ELSE
        UPDATE public.purga_execucao_itens i
           SET desfecho_storage  = 'nao_aplicavel',
               desfecho_postgres = 'nao_aplicavel',
               desfecho_auth     = 'nao_aplicavel',
               relato_dry_run    = v_relato,
               concluido_em      = pg_catalog.now()
         WHERE i.id = v_item;
      END IF;

    EXCEPTION
      -- ⚠⚠ 46-04 · DUAS CONDICOES QUE **NAO** VIRAM ITEM DE LEDGER E SOBEM ATE
      --   DERRUBAR A VARREDURA. O envelope por titular existe para que a falha de
      --   UM nao aborte os demais — e isso continua valendo para falhas de um
      --   titular. Estas duas nao sao falhas de um titular:
      --
      --   · `P46NT` — o terminador do dry-run sumiu do MOTOR. E uma propriedade do
      --     corpo daquela funcao, nao daquele candidato: os titulares restantes
      --     teriam o corpo destrutivo executado tambem. Registrado como
      --     `desfecho_postgres = 'falha'`, viraria N linhas dizendo "a purga teve
      --     falhas" quando o fato e "uma funcao destrutiva perdeu o freio" —
      --     diagnostico FALSO, que e o modo de falha que esta fase inteira cataloga.
      --
      --   · `query_canceled` — o corte por `statement_timeout`. Engolido, cada
      --     statement seguinte seria cortado de novo e o ledger encheria de itens
      --     com `falha` que descrevem o relogio, e nao o dado.
      --
      --   ⚠ CONSEQUENCIA ACEITA E DECLARADA: subindo daqui, o cabecalho da
      --   execucao tambem e revertido e o heartbeat daquele dia NAO existe. A
      --   ausencia da linha somada ao registro de falha do job e um sinal
      --   INEQUIVOCO; uma linha `concluida` com N falhas dentro nao seria.
      --   ⚠ 46-06 · E o expurgo de RETEN-05 de (a.4) tambem e revertido nesses dois
      --   casos, porque ele ocorre na MESMA transacao. Isso e correto e nao e
      --   perda: a varredura da noite seguinte reexecuta o mesmo statement sobre o
      --   mesmo conjunto — a regra e idempotente por construcao, ja que o
      --   predicado e "criado_em alem da janela" e nao "ainda nao processado".
      WHEN SQLSTATE 'P46NT' THEN
        RAISE;
      WHEN query_canceled THEN
        RAISE;
      WHEN OTHERS THEN
      -- Uma falha de um titular NÃO aborta os demais (idioma de
      -- `20260727000001:194-196`) — mas, divergindo do analog, ela NÃO fica só no
      -- `WARNING`: `WARNING` não marca o job como `failed`, não chega ao
      -- `return_message` do cron e não sobrevive à rotação de log. A falha vira
      -- LINHA DE LEDGER. O registro da falha roda no seu próprio envelope para
      -- que não conseguir registrar também não derrube a varredura.
      RAISE WARNING 'varrer_purga_retencao: titular % falhou (%: %)', r.candidato_id, SQLSTATE, SQLERRM;
      BEGIN
        INSERT INTO public.purga_execucao_itens
               (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em,
                desfecho_storage, desfecho_postgres, desfecho_auth, concluido_em)
        VALUES (v_execucao, r.candidato_id, r.etapa, r.janela_meses_aplicada, r.ancora_origem, r.ancora_em,
                'nao_aplicavel', 'falha', 'nao_aplicavel', pg_catalog.now());
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'varrer_purga_retencao: nem o registro da falha do titular % pode ser gravado (%: %)', r.candidato_id, SQLSTATE, SQLERRM;
      END;
    END;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (g.5) 46-06 · O DISPATCH — UM POST POR TITULAR, SO NO RAMO `live`
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠⚠ ESTE BLOCO INTEIRO SO EXISTE DENTRO DO `IF` ABAIXO. Em `off` a funcao ja
  --   retornou em (f); em `dry_run` o `IF` nao entra. Nao ha um post enfileirado
  --   fora de `live`, e a propriedade e ESTRUTURAL e nao "por configuracao": o
  --   hop do pg_net so ocorre no COMMIT, entao qualquer caminho que retorne antes
  --   daqui garante ZERO requisicao por construcao, e nao por esperanca.
  --
  -- ⚠⚠ UM POST POR TITULAR, JAMAIS UM POST PARA O LOTE. A Edge Function tem teto
  --   de parede de 150 s e 2 s de CPU por requisicao; um lote de 50 titulares x
  --   (Storage + RPC + Auth) estoura, e um lote cortado no meio deixa Storage
  --   apagado e Postgres intacto — irreversivel e sem ninguem para retomar. Cada
  --   invocacao processa exatamente um titular, e limitada e retomavel.
  --
  -- ⚠⚠ A ASSIMETRIA COM A PHASE 41 E DELIBERADA: la, o at-most-once do transporte
  --   era um PROBLEMA (a varredura nao sabe se a notificacao chegou, e a linha
  --   fica presa esperando retry). Aqui ele e FAIL-SAFE — post perdido implica
  --   nada apagado, o item continua aberto, a reconciliacao de (a.3) o fecha
  --   depois de 1 hora e a varredura seguinte recolhe o titular. O custo de uma
  --   perda e **um titular adiado por um dia**, nunca uma execucao meio aplicada.
  --
  -- ⚠ DIVERGENCIA OBRIGATORIA EM RELACAO AO P41, PELA SEGUNDA VEZ NESTE ARQUIVO:
  --   la, um despacho que falha vira `RAISE WARNING` e mais nada. Um aviso nao
  --   marca o job do cron como falho, nao chega ao `return_message` e nao
  --   sobrevive a rotacao de log — uma falha registrada so por aviso e uma falha
  --   que ninguem ve. Aqui ela vira LINHA DE LEDGER: o item e fechado com
  --   `desfecho_postgres = 'falha'`, que e verdade literal (o motor daquele
  --   titular nao rodou, porque ninguem foi invocado), e o relato diz o SQLSTATE.
  --   Fechar tambem devolve o titular a varredura seguinte em vez de deixa-lo
  --   preso ate a reconciliacao.
  IF v_modo = 'live' THEN
    FOR d IN
      SELECT i.id AS item_id, i.candidato_id
        FROM public.purga_execucao_itens i
       WHERE i.execucao_id = v_execucao
         AND i.concluido_em IS NULL
       ORDER BY i.id
    LOOP
      BEGIN
        PERFORM net.http_post(
          url := v_url || '/functions/v1/purgar-retencao',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || v_chave
          ),
          body := jsonb_build_object(
            'execucao_id',   v_execucao,
            'item_id',       d.item_id,
            'candidato_id',  d.candidato_id
          )
        );
        v_desp := v_desp + 1;
      EXCEPTION WHEN OTHERS THEN
        v_desp_falha := v_desp_falha + 1;
        RAISE WARNING 'varrer_purga_retencao: DESPACHO falhou para o item % (titular %) — %: %. O item foi FECHADO com desfecho_postgres = falha (o motor daquele titular nao rodou porque ninguem foi invocado) e o titular volta ao conjunto elegivel na varredura seguinte.', d.item_id, d.candidato_id, SQLSTATE, SQLERRM;
        BEGIN
          UPDATE public.purga_execucao_itens i
             SET desfecho_storage  = 'nao_aplicavel',
                 desfecho_postgres = 'falha',
                 desfecho_auth     = 'nao_aplicavel',
                 relato_dry_run    = coalesce(i.relato_dry_run, '')
                   || ' [DESPACHO FALHOU] o hop para a Edge Function purgar-retencao nao pode ser '
                   || 'enfileirado (SQLSTATE ' || SQLSTATE || '). Nenhum dos tres sistemas foi tocado: '
                   || 'desfecho_postgres = falha descreve o fato de o motor nao ter rodado, e nao uma '
                   || 'tentativa que deu errado. O item e fechado de proposito — deixa-lo aberto '
                   || 'excluiria este titular de toda varredura seguinte ate a reconciliacao de 1 hora.',
                 concluido_em      = pg_catalog.now()
           WHERE i.id = d.item_id;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'varrer_purga_retencao: nem o registro da falha de despacho do item % pode ser gravado (%: %)', d.item_id, SQLSTATE, SQLERRM;
        END;
      END;
    END LOOP;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- (h) FECHAMENTO
  -- ═══════════════════════════════════════════════════════════════════════════
  -- ⚠ `processados` CONTINUA ZERO AQUI, NOS DOIS RAMOS, e a DIVERGENCIA 3 do
  --   cabecalho explica por que isso vale inclusive em `live`: no instante do
  --   despacho nenhum titular teve o motor executado. Quem incrementa a coluna e
  --   `concluir_item_purga`, uma vez por item cujo motor de fato rodou. Somar os
  --   posts aqui daria contagem DUPLA e faria a coluna significar outra coisa.
  --
  -- ⚠ EM `live` A EXECUCAO FICA EM `executando`, e isso e o desenho e nao um
  --   esquecimento: os itens estao abertos esperando a Edge Function, e
  --   `reivindicar_item_purga` exige `e.situacao = 'executando'`. Fecha-la aqui
  --   recusaria toda reivindicacao com `P46FB` e o despacho inteiro viraria 403.
  --   Quem fecha o cabecalho e a conclusao do ULTIMO item; se ninguem fechar, a
  --   reconciliacao de (a.3) aborta a execucao depois de 1 hora.
  --
  -- ⚠ O CASO EM QUE `live` FECHA AQUI MESMO: se nao restou item aberto — porque o
  --   conjunto era vazio, ou porque TODOS os despachos falharam e cada item foi
  --   fechado no bloco acima —, ninguem vai chamar `concluir_item_purga`. Deixar a
  --   execucao em `executando` criaria uma linha que so a reconciliacao fecharia,
  --   uma hora depois, marcando como `abortada` uma execucao que na verdade
  --   terminou. Fechar aqui e o que impede o ledger de descrever errado.
  IF v_modo = 'live' THEN
    UPDATE public.purga_execucoes e
       SET processados  = 0,
           veredito     = 'despachado',
           situacao     = CASE
                            WHEN EXISTS (SELECT 1 FROM public.purga_execucao_itens i
                                          WHERE i.execucao_id = v_execucao
                                            AND i.concluido_em IS NULL)
                            THEN 'executando' ELSE 'concluida' END,
           concluida_em = CASE
                            WHEN EXISTS (SELECT 1 FROM public.purga_execucao_itens i
                                          WHERE i.execucao_id = v_execucao
                                            AND i.concluido_em IS NULL)
                            THEN NULL ELSE pg_catalog.now() END
     WHERE e.id = v_execucao;

    RAISE WARNING 'varrer_purga_retencao: modo live — % post(s) enfileirado(s) e % falha(s) de despacho sobre % titular(es) elegivel(is). ⚠ processados continua 0 de proposito: quem o incrementa e concluir_item_purga, uma vez por titular cujo motor de fato rodou. A execucao permanece em executando ate o ultimo item fechar.', v_desp, v_desp_falha, v_n;
  ELSE
    -- `processados = 0` é literal e não é preguiça: neste ramo NADA foi
    -- processado, e o número tem de dizer isso. Um `processados` maior que zero
    -- com `modo_vigente` diferente de `live` é a assinatura de que o escopo duplo
    -- de D-46-24 foi violado.
    UPDATE public.purga_execucoes e
       SET processados  = 0,
           veredito     = 'dry_run',
           situacao     = 'concluida',
           concluida_em = pg_catalog.now()
     WHERE e.id = v_execucao;
  END IF;
END;
$sweep_purga$;

-- ⚠ `statement_timeout` PRÓPRIO (Pitfall 8). O global do papel `postgres` é 2 min
-- (medido em PROD 2026-08-22), e um laço com uma subtransação por titular é caro
-- de entrar e de sair. Sem este `ALTER`, um sweep cortado pelo timeout global
-- acusaria o lugar errado — e a mensagem de erro é o que alguém vai ler às 3 da
-- manhã. 300s é folgado para o cap de 50 e ainda assim finito.
ALTER FUNCTION public.varrer_purga_retencao() SET statement_timeout = '300s';

-- ACL: esta função escreve no ledger, dispara o motor destrutivo em ensaio, apaga
-- trilha de notificação e despacha para a Edge Function que destrói de verdade.
-- Nenhum papel de cliente a alcança. `FROM PUBLIC` sozinho NÃO basta: o
-- `pg_default_acl` do schema `public` neste projeto concede EXECUTE a `anon` e
-- `authenticated` como grants DIRETOS E NOMEADOS em todo `CREATE FUNCTION`
-- (medição de 2026-07-30: 61 funções DEFINER com EXECUTE para `anon`).
REVOKE ALL ON FUNCTION public.varrer_purga_retencao()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.varrer_purga_retencao() TO service_role;

COMMENT ON FUNCTION public.varrer_purga_retencao() IS
  'Phase 46 / 46-06 PURGA-01/02/05/06 + RETEN-05: a VARREDURA da purga de retencao, em sua terceira '
  'e ultima versao. Acionada pelo cron purga-retencao-sweep (0 3 * * * UTC, D-46-10), criado em '
  '20260823000012. '
  'ORDEM DO CORPO, e ela E o requisito: '
  '(a) le public.config_purga sob FOR UPDATE — serializa contra um flip concorrente de modo; ler a '
  'config numa transacao e despachar noutra E a corrida. Config ausente e FAIL-CLOSED: grava '
  'cabecalho com modo_vigente = ausente / situacao = abortada e retorna — e isso vale com forca '
  'redobrada para RETEN-05, cuja janela em meses e lida daquela mesma linha. '
  '(a.3) RECONCILIACAO DE EXECUCOES VENCIDAS (HI-03 / RD2-01 / RD2-05 / RD3-02): fecha os itens '
  'ABERTOS de execucoes em executando ha mais de 1 hora — a MESMA janela que o 4o ramo do guard de '
  '20260823000006 usa para expirar a autorizacao, e (C3/janela) do p45_motor_exclusao_smoke.sql '
  'mede o LITERAL nos tres corpos. ⚠ A partir do 46-06 ela deixa de ser guarda contra corte por '
  'timeout e passa a ser a outra ponta do despacho ASSINCRONO: em live o item fica aberto esperando '
  'a Edge Function, e se ela nunca chegar e esta secao que devolve o titular. '
  'O que ela escreve NAO e categorico (RD2-01): desfecho ja carimbado e PRESERVADO, o de Postgres e '
  'INFERIDO da sentinela de tombstone, e Storage/Auth ficam desconhecido. '
  '(a.4) RETEN-05 (D-46-17/20): UM statement de exclusao sobre public.notificacoes_enviadas, '
  'ancorado em criado_em — a UNICA coluna temporal NOT NULL daquela tabela — e com a janela lida do '
  'escalar PROPRIO config_purga.janela_notificacoes_meses, JAMAIS derivada da matriz de retencao. '
  'E a regra INDEPENDENTE: as FKs em cascata ja levariam as notificacoes junto na purga do titular, '
  'mas elas estao DORMENTES neste sistema (o motor anonimiza em vez de apagar, ERASE-08), e o que '
  'falta e a expiracao das notificacoes de candidaturas que NAO foram purgadas. '
  '⚠ O MESMO statement roda nos TRES modos; fora de live ele e revertido pelo ERRCODE proprio '
  'P46RN, com captura TIPADA e nunca generica. Nunca dois statements (um para contar, outro para '
  'apagar): a forma de dois corpos e o parente direto do P39/CR-02. '
  '⚠ notificacoes_expurgadas recebe o que foi APAGADO, e vale ZERO fora de live — mesma doutrina da '
  'coluna vizinha processados. O numero do ensaio vai para WARNING, e so quando ha o que dizer: uma '
  'linha de ledger dizendo que a purga DESLIGADA apagou trilha de auditoria seria uma mentira. '
  '⚠ Ela roda ANTES do cap e ANTES do kill switch de proposito, e NAO e bloqueada pelo cap: o cap '
  'governa o predicado de TITULARES, RETEN-05 tem predicado proprio sobre outra tabela, e suspende-la '
  'sob uma condicao que dura ate intervencao humana seria o defeito RD3-02 de novo. '
  '(b) materializa o conjunto UMA vez numa temporaria ON COMMIT DROP, EXCLUINDO por NOT EXISTS todo '
  'candidato_id com item ABERTO — o claim anti-sobreposicao do Pitfall 6, que a partir do 46-06 e '
  'tambem o que impede um SEGUNDO post para um titular cuja purga ainda esta em curso. '
  '(c) conta da temporaria, e de mais lugar nenhum. '
  '(d) CAP (D-46-08 / PURGA-05): se elegiveis > cap_titulares, grava veredito cap_excedido, '
  'processados 0, situacao concluida, e RETORNA. Zero titular tocado, zero item, zero despacho. '
  '⚠ ELA NUNCA RECORTA O TRABALHO PELO CAP — nao existe LIMIT neste corpo. A comparacao e > ESTRITO '
  'e o contrato de fronteira e explicito: elegiveis = cap executa, elegiveis = cap - 1 executa, '
  'elegiveis = cap + 1 aborta; os dois lados sao inteiros, sem arredondamento. Como o despacho do '
  'pg_net so ocorre no COMMIT, retornar antes garante zero request por ESTRUTURA. '
  '(e) HEARTBEAT: o cabecalho e gravado em TODA execucao, inclusive com modo off e com elegiveis 0. '
  'E isso que torna detectavel "nenhuma linha de ledger ha mais de 36 h". cron.job_run_details NAO '
  'serve: acumula disco, nao e limpo automaticamente, sobrevive ao desagendamento, e registra que o '
  'JOB rodou — nao que a POLITICA foi aplicada. '
  '(f) KILL SWITCH: com modo = off, grava veredito desligado, processados 0, e retorna ANTES de '
  'qualquer item e ANTES de tocar o cofre. '
  '(f.5) COFRE: le project_url e edge_invoke_key por referencia totalmente qualificada, um a um pelo '
  'NOME (escopar limita o raio de um comprometimento a UM segredo). ⚠ DIVERGINDO DO P41, segredo '
  'ausente NAO retorna em silencio: grava veredito segredo_ausente com o elegiveis VERDADEIRO e '
  'retorna, porque um retorno mudo e indistinguivel de "nada elegivel" e a politica de retencao '
  'deixaria de existir sem sinal (Pitfall 5). Ela aborta tambem em dry_run: um ensaio que pulasse em '
  'silencio a unica perna que faltaria em live produziria evidencia de ensaio autorizando o flip '
  'para um live incapaz de despachar. Nenhum RAISE deste corpo carrega valor de segredo. '
  '(g) LACO: um item por titular, cada um em subtransacao propria. O motor e chamado com o literal '
  'true em TODOS os modos — inclusive live —, porque quem destroi de verdade e a Edge Function '
  'purgar-retencao, um titular por invocacao. O que o laco produz em live e a PRE-IMAGEM daquele '
  'titular, capturada imediatamente antes da destruicao real. CAPTURA TIPADA E SO ELA: WHEN SQLSTATE '
  'P45DR. As duas terminacoes contratadas do dry-run (WR-05) sao P45DR numa linha viva e retorno '
  'ja_anonimizado numa linha que JA e tombstone; qualquer outro retorno normal levanta P46NT. P46NT '
  'e query_canceled sao re-levantados e DERRUBAM a varredura. '
  '⚠ O FECHAMENTO DO ITEM E CONDICIONAL AO MODO: fora de live o item fecha com os tres desfechos em '
  'nao_aplicavel; em live ele fica ABERTO, porque reivindicar_item_purga exige concluido_em nulo e '
  'um item fechado seria recusado com P46FB na porta. '
  '(g.5) DISPATCH, EXCLUSIVO DO RAMO live: um hop do pg_net por TITULAR para /functions/v1/'
  'purgar-retencao, com Bearer = edge_invoke_key do cofre. JAMAIS um post para o lote: a Edge '
  'Function tem teto de parede de 150 s, e um lote cortado no meio deixa Storage apagado e Postgres '
  'intacto. A assimetria com a Phase 41 e deliberada — la o at-most-once era problema, aqui e '
  'FAIL-SAFE: post perdido implica nada apagado, e o custo e um titular adiado por um dia. Um '
  'despacho que falha vira LINHA DE LEDGER (item fechado com desfecho_postgres = falha e o SQLSTATE '
  'no relato), nunca so um aviso. '
  '(h) FECHAMENTO: fora de live, veredito dry_run e situacao concluida. Em live, veredito despachado '
  'e situacao EXECUTANDO — quem fecha o cabecalho e a conclusao do ULTIMO item, por concluir_item_'
  'purga; a execucao so fecha aqui se nao restou item aberto (conjunto vazio ou todos os despachos '
  'falhados), para que a reconciliacao nao marque como abortada uma execucao que terminou. '
  '⚠ processados continua 0 no fim da varredura em TODOS os modos, inclusive live: no instante do '
  'despacho nenhum titular teve o motor executado, e quem incrementa a coluna e concluir_item_purga. '
  'statement_timeout proprio de 300s (Pitfall 8) porque o global do papel postgres e 2 min. '
  'SECURITY DEFINER com search_path vazio; REVOKE nominal de PUBLIC, anon e authenticated; GRANT '
  'EXECUTE apenas a service_role.';

-- ---------------------------------------------------------------------------
-- 46-06 · O COMENTARIO DA COLUNA DO LEDGER — a frase que envelheceu
-- ---------------------------------------------------------------------------
-- O texto vivo (`20260823000002`) termina com "Nasce em 0 e so passa a ser
-- escrita no plano 46-07". **Isso deixou de ser verdade neste arquivo**, e um
-- comentario que declara uma coluna inerte enquanto ela e escrita toda noite e a
-- mesma classe de defeito que o BL-01 do 46-04 produziu: prosa num lugar
-- contradizendo a verdade no outro, e o proximo leitor acredita na prosa. O texto
-- novo preserva a definicao (o que a coluna conta e por que a regra e
-- independente) e substitui a ultima frase pela doutrina de valor por modo.
COMMENT ON COLUMN public.purga_execucoes.notificacoes_expurgadas IS
  'Phase 46 / RETEN-05: quantas linhas de public.notificacoes_enviadas a regra INDEPENDENTE de '
  'retencao APAGOU nesta execucao (a regra que nao depende de o titular ter sido purgado — as FKs '
  'ON DELETE CASCADE de 20260721000001:78-79 ja levam as notificacoes junto na purga do titular, '
  'mas estao DORMENTES neste sistema porque o motor anonimiza em vez de apagar). '
  '⚠ ESCRITA DESDE O 46-06 (20260823000011), e VALE ZERO EM TODO REGIME QUE NAO SEJA live — mesma '
  'doutrina da coluna vizinha processados. Fora de live o statement de expurgo roda e e REVERTIDO '
  'pelo ERRCODE P46RN, entao nenhuma linha foi apagada e a coluna tem de dizer isso; o numero do '
  'ENSAIO vai para um WARNING. Um valor > 0 com modo_vigente <> live significaria que a purga '
  'DESLIGADA apagou trilha de auditoria — leia como incidente, nao como resultado.';

-- ---------------------------------------------------------------------------
-- 46-06 · RETEN-05 · A PROMESSA SEM CODIGO, FECHADA NA MESMA MIGRATION
-- ---------------------------------------------------------------------------
-- O texto vivo do comentario da tabela `public.notificacoes_enviadas`, escrito em
-- 2026-07-21 (`20260721000001:143-144`), termina assim, verbatim:
--
--     Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8).
--
-- Essa frase e LITERALMENTE a promessa-sem-codigo que RETEN-05 existe para
-- fechar, e ela e o tipo de achado que o CONSOL-04 audita: o banco declarando uma
-- politica de retencao que nenhuma linha de codigo executa. Deixa-la viva depois
-- de (a.4) seria pior do que antes — o codigo passaria a apagar sob um prazo que
-- o proprio objeto diz nao existir.
--
-- ⚠ TUDO O QUE O TEXTO ATUAL DIZ FOI PRESERVADO: a natureza de trilha de
-- auditoria, o escopo vaga-scoped do RH pela policy join-through, a negacao ao
-- candidato, a escrita exclusiva por service_role e a idempotencia duravel por
-- UNIQUE(dedupe_key). **Somente a ultima frase muda**, e a nova nomeia as quatro
-- coisas que a antiga nao tinha: a janela, de onde ela e lida, a coluna-ancora e
-- a funcao que executa a regra.
--
-- ⚠ O portao estatico deste arquivo afere o STATEMENT, e nao o arquivo: o bloco
-- acima cita o texto antigo de proposito, e um portao sobre o arquivo inteiro
-- reprovaria essa citacao correta. Quem afere o objeto VIVO — que e a prova que
-- conta — e a assercao (n) do p46_purga_smoke.sql.
COMMENT ON TABLE public.notificacoes_enviadas IS
  'Phase 37 / LEDGER-01/02/03: audit trail of every notification dispatch. RH vaga-scoped via rh_le_notificacoes join-through; candidato-DENY. Writes ONLY via P38 EF service_role. UNIQUE(dedupe_key) durable idempotency. Phase 46 / RETEN-05 (20260823000011): retention is NO LONGER open-ended — rows are purged once criado_em (the only NOT NULL temporal column of this table) is older than config_purga.janela_notificacoes_meses, by the single DELETE inside public.varrer_purga_retencao(), section (a.4). That rule is INDEPENDENT of titular purge: the ON DELETE CASCADE FKs above would carry notifications along, but they are dormant here because the erasure engine anonymizes instead of deleting (ERASE-08). The window is a scalar of its own (D-46-20), never derived from the retention matrix, and the count of rows actually deleted is recorded in purga_execucoes.notificacoes_expurgadas.';
