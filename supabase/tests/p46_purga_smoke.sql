-- =============================================================================
-- Phase 46 / Plano 46-02 (TRACER) — ESPEC EXECUTÁVEL da espinha da purga
-- (PURGA-02 · PURGA-03 · PURGA-05 · PURGA-06 · PURGA-07 · D-46-08/09/15/16/19)
-- =============================================================================
-- ⚠ ESTE ARQUIVO É A ESPECIFICAÇÃO, NÃO UM RELATÓRIO.
-- Escrito ANTES do apply das quatro migrations do plano 46-02, deliberadamente
-- RED: `public.config_purga`, `public.purga_execucoes`,
-- `public.purga_execucao_itens`, `public.titulares_alem_da_janela()` e
-- `public.varrer_purga_retencao()` ainda não existem em PROD.
--
-- Consequência de processo, dita aqui para não ser negociada depois: se a
-- implementação divergir deste arquivo, **corrige-se a implementação**. Alterar o
-- smoke para caber no que foi aplicado é ESCALAR o problema — é o movimento que
-- transforma um gate em decoração.
--
-- ⚠ ESTE ARQUIVO NASCEU COM AS LETRAS DO PLANO 46-02; o plano 46-03
-- ACRESCENTOU (j.1), (j.2), (j.3), (k) e (l); e o plano 46-04 acrescentou (b) e
-- (o). As demais — (a), (d), (e), (g), (m), (n) — chegam nos planos 46-05 a
-- 46-07, NESTE MESMO ARQUIVO, e o RESUMO (z) sobe junto (era 6, depois 11, agora
-- é 13). Um arquivo por fase, e não um por plano: as asserções desta fase leem
-- umas o estado das outras.
--
-- -----------------------------------------------------------------------------
-- COMO RODAR
-- -----------------------------------------------------------------------------
-- Via Supabase MCP `execute_sql`, PELO ORQUESTRADOR e numa **ÚNICA chamada** —
-- nunca pelo executor (subagentes GSD não recebem os tools MCP do Supabase; bug
-- upstream anthropics/claude-code#13898). A chamada única é obrigatória por
-- motivo MECÂNICO: `set_config(..., false)` é escopado à SESSÃO, então statements
-- espalhados por chamadas separadas zerariam o contador `smoke46p.pass` e o
-- RESUMO (z) reprovaria um run que na verdade passou (lição da P41-05).
--
-- GATE VERDE = o contador `smoke46p.pass` bate **13** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial acumularia < 13 e o RESUMO reprova ALTO.
--
-- ⚠⚠ A PARTIR DO PLANO 46-04 ESTE ARQUIVO EXERCITA UMA FUNÇÃO DESTRUTIVA VIVA.
-- As asserções (b) e (o) chamam `public.anonimizar_candidato`, que é o motor que
-- apaga PII de forma irreversível. Três propriedades, e as três são deliberadas:
--   1. **Toda chamada é de DRY-RUN** (`p_dry_run := true`) ou é uma chamada que o
--      guard tem de RECUSAR. Nenhuma chamada deste arquivo pede destruição real
--      esperando que ela aconteça.
--   2. **As quatro chamadas negativas apontam para um `candidato_id` que NÃO
--      EXISTE.** Se o guard recusar (o correto), o desfecho é `42501`; se um guard
--      defeituoso autorizasse, o motor pararia em `P0002` sem ter mutado uma única
--      coluna de pessoa real. A asserção continua totalmente discriminante e passa
--      a ser incapaz de destruir.
--   3. **Tudo roda dentro do envelope**, que o Postgres reverte inteiro — o mesmo
--      método que a própria migration do motor usa no apply (`20260805000006:839-849`).
--
-- -----------------------------------------------------------------------------
-- ⚠ A FIXTURE JÁ ESTÁ VIVA — ESTE ARQUIVO NÃO A CRIA, E DEPENDE DELA
-- -----------------------------------------------------------------------------
-- O plano 46-01 aplicou `supabase/tests/p46_fixture_elegivel.sql` em PROD em
-- 2026-08-22: 8 titulares sintéticos, 9 candidaturas, 3 vagas, no namespace
-- `fixture-p46+%@invalido.local`. É ela que torna este arquivo capaz de provar
-- alguma coisa: **medido em 2026-08-22, `candidaturas_alem_da_janela()` devolvia
-- ZERO antes da fixture** — o conjunto elegível era vazio por ARITMÉTICA (matriz
-- em 24 meses, sistema mais novo que a janela), não por defeito.
--
-- ⊖ **TODA asserção deste arquivo responde "isto passaria se o conjunto fosse
-- vazio?" ANTES de contar como prova**, e as que dependem do conjunto reprovam
-- explicitamente quando `elegiveis = 0`. Um kill switch provado sobre conjunto
-- vazio não prova nada; um dry-run que não apagou nada porque não havia nada é a
-- definição de decoração (SC#1, e a mesma classe do P39/CR-02).
--
-- Números esperados sobre a fixture viva, DEPOIS do apply do plano 46-03:
--   `candidaturas_alem_da_janela()` = **4** · `titulares_alem_da_janela()` = **4**
--   (`pos1#01`, `pos2#02`, `pos3#03`, `cap2#04`)
--
-- A trajetória inteira, e cada queda com nome — porque "o número baixou" nunca
-- foi o critério; **qual** linha caiu é que é:
--   7  fixture do 46-01 aplicada (o conjunto era 0 antes dela, por aritmética)
--   6  46-02: sai `neg-etapa#08`, pela allowlist de D-46-19 (`entrevista_online`)
--   4  46-03: saem `neg-hold#05` (linha viva em `retencao_hold`, D-46-04) e
--      `neg-vaga#06` (vaga em `ativa`, D-46-03)
--   `neg-art20#07` nunca esteve: a exceção do Art. 20 já valia desde a Phase 43.
--   `neg-etapa#09` nunca esteve: está DENTRO da janela, e é por ela que o titular
--   de `neg-etapa` não aparece em `titulares_alem_da_janela()` (D-46-11).
--
-- ⚠ Os `>=` das asserções de execução são deliberados e continuam: o arquivo tem
-- de seguir válido quando os planos 46-04 a 46-07 mexerem no conjunto. O que NÃO
-- é `>=` são as asserções (j.1-3), (k) e (l), que nomeiam a fixture EXATA — é
-- delas que sai a prova de que cada exceção morde por si.
--
-- -----------------------------------------------------------------------------
-- ⚠⚠ O ENVELOPE, E POR QUE AS ASSERÇÕES SÃO JULGADAS FORA DELE
-- -----------------------------------------------------------------------------
-- Este arquivo ESCREVE — ele muda `config_purga.modo` e faz a varredura gravar no
-- ledger. Nada disso pode persistir, por DUAS razões:
--   1. `config_purga.modo` tem de terminar como começou. Um smoke que deixasse a
--      purga em `dry_run` seria um smoke que liga a purga.
--   2. ⚠ **Linhas de `purga_execucoes` commitadas por um TESTE inflariam o
--      critério de flip de D-46-14** ("≥ 14 execuções com ledger não-vazio").
--      Rodar o smoke 14 vezes num dia satisfaria o portão que existe para exigir
--      14 DIAS de observação real. O envelope não é higiene: é o que impede o
--      teste de fabricar a evidência que autoriza a purga a ficar destrutiva.
--
-- O envelope é uma subtransação encerrada por `RAISE EXCEPTION … USING ERRCODE =
-- 'P46B0'`, que o Postgres reverte inteira — método já exercitado em PROD pela
-- Phase 45 (`20260805000006:839-849`).
--
-- ⚠ NENHUMA ASSERÇÃO É *MEDIDA* DEPOIS DO ROLLBACK. É a lição nº 6 dos sete
-- portões da Phase 45: a asserção `(B3/email)` media um estado que ela mesma
-- tinha destruído, reprovava em TODA execução com o motor CERTO, e o diagnóstico
-- errado disso ficou escrito como fato por um dia. A correção adotada lá — e
-- copiada aqui verbatim na forma (`p45_motor_exclusao_smoke.sql:957-964` e
-- `:1061-1082`) — é a separação entre MEDIR e JULGAR:
--
--   · **MEDIR acontece DENTRO do envelope**, para variáveis plpgsql. Toda consulta
--     viva deste arquivo está lá dentro.
--   · **JULGAR acontece DEPOIS**, sobre essas variáveis. Variáveis plpgsql são
--     memória, e o rollback de subtransação NÃO as reverte.
--
-- ⚠ E ISSO É OBRIGATÓRIO, NÃO PREFERÊNCIA: `set_config(..., false)` é
-- TRANSACIONAL. Um incremento do contador feito dentro do envelope seria desfeito
-- pelo rollback, e o RESUMO (z) leria 0 num run perfeito. Por isso os
-- `set_config('smoke46p.pass', …)` ficam DEPOIS do `RAISE … 'P46B0'`, e não antes.
-- Um portão que reprova trabalho correto treina quem executa a desligá-lo.
--
-- -----------------------------------------------------------------------------
-- AS ASSERÇÕES — 46-02 (6), 46-03 (5), 46-04 (2). Dez são NEGATIVAS.
-- -----------------------------------------------------------------------------
--   (h)     ⊖ O ledger não tem coluna de PII, aferido sobre o CATÁLOGO.
--   (f)     ⊖ Kill switch provado por execução REAL com `modo = 'off'`.
--   (c)     ⊖ Dry-run sobre conjunto NÃO-VAZIO não apagou nada e não despachou.
--   (b)     O laço de dry-run CHAMOU o motor e terminou no terminador DELE —
--           `relato_dry_run` não nulo em todos os itens, com as contagens por
--           passo, e ⊖ as cinco contagens de domínio idênticas (PURGA-02).
--   (o)     ⊖ O 4º ramo do guard RECUSA fora das condições (quatro casos) e
--           ACEITA dentro delas (dois) — as duas metades de D-46-24 aferidas
--           SEPARADAMENTE, sobre estado idêntico.
--   (i)     O item registra a POLÍTICA, e não só a contagem.
--   (idem)  A idempotência do dry-run é OBSERVADA, não presumida.
--   (claim) ⊖ Titular com item ABERTO não é re-selecionado (Pitfall 6).
--   (j.1)   ⊖ `retencao_hold` protege — e o hold LIBERADO deixa de proteger.
--   (j.2)   ⊖ Vaga ainda aberta protege — e a vaga arquivada deixa de proteger.
--   (j.3)   ⊖ Revisão do Art. 20 em aberto protege — respondida, deixa de proteger.
--   (k)     Degrau correto quando não há decisão registrada (PURGA-07 / SC#4).
--   (l)     ⊖ Etapa fora da allowlist não entra (D-46-19) — e a allowlist é
--           aferida por IGUALDADE DE CONJUNTO, jamais por contagem nua.
--   (z)     RESUMO — exige o total exato de 13 PASS.
--
-- -----------------------------------------------------------------------------
-- ⚠⚠ POR QUE (j.1), (j.2) E (j.3) TÊM **DUAS METADES** CADA UMA
-- -----------------------------------------------------------------------------
-- A metade óbvia é "a fixture negativa NÃO aparece no conjunto elegível". Ela,
-- sozinha, **não prova nada**: a fixture poderia estar fora por qualquer outro
-- motivo — porque a data ainda não venceu, porque a etapa saiu da allowlist,
-- porque alguém a apagou. Uma asserção que passa por um motivo que ela não mediu
-- é exatamente o falso verde que esta fase inteira existe para eliminar.
--
-- A segunda metade — **"passa a estar"** — é a que fecha o argumento: desfeita a
-- condição da exceção (hold liberado, vaga arquivada, revisão respondida), a
-- candidatura **volta** ao conjunto. Isso só é possível se ela já estava ALÉM DA
-- JANELA o tempo todo, e portanto a ausência anterior era causada pela EXCEÇÃO e
-- por nada mais. **A não-vacuidade não é uma observação no fim do log: ela é a
-- segunda metade da própria asserção.**
--
-- As três fixtures negativas foram construídas no plano 46-01 com `updated_at` a
-- -30 meses justamente para isso — se estivessem DENTRO da janela, a asserção
-- passaria porque a DATA protegeu, e não porque a exceção funcionou.
--
-- -----------------------------------------------------------------------------
-- ⚠ POR QUE ESTE ARQUIVO DESLIGA GATILHOS, E POR QUE POR CRITÉRIO MEDIDO
-- -----------------------------------------------------------------------------
-- A metade "passa a estar" de (j.3) carimba `revisao_respondida_em` em
-- `public.decisao_final` — e existe um gatilho vivo (`trg_notif_revisao_respondida`,
-- `20260730000004`) que dispara nessa transição e chama `net.http_post`. Duas
-- consequências, e as duas importam:
--   1. A asserção (c) mede `net.http_request_queue` ANTES e DEPOIS de tudo o que
--      este envelope faz. Um enfileiramento aqui **reprovaria (c)** — um portão
--      correto reprovando trabalho correto.
--   2. Mesmo revertido pelo rollback (o `INSERT` do `pg_net` é transacional, e um
--      registro nunca commitado nunca fica visível ao worker), despachar é um
--      risco que não precisa ser corrido.
-- Por isso os gatilhos são desligados — e **por CRITÉRIO MEDIDO DO CATÁLOGO**
-- (`pg_get_functiondef` contendo `net.http_post`), nunca por lista fixa de nomes.
-- ⚠ A lição é do plano 46-01 e foi paga com medição: a lista estática que o
-- repositório anunciava tinha DOIS gatilhos, o catálogo vivo tinha TRÊS, e um dos
-- anunciados não existia mais. Uma lista de nomes envelhece em silêncio; um
-- critério não. A lista de TABELAS varridas (`decisao_final`, `vagas`,
-- `retencao_hold`) é ESCOPO deliberado — são exatamente as três que este bloco
-- muta —, e não uma fotografia do catálogo.
--
-- -----------------------------------------------------------------------------
-- POR QUE (h) USA FRONTEIRA E NUNCA CASAMENTO NU DE SUBSTRING
-- -----------------------------------------------------------------------------
-- Porque o precedente MEDIDO está em `p45_motor_exclusao_smoke.sql:266-269`: um
-- `strpos(lower(prosrc), 'update')` REPROVARIA a implementação CORRETA, já que
-- `updated_at` e `deleted_at` contêm os verbos como substring. Um teste que
-- reprova o comportamento correto é pior que teste nenhum.
-- Aqui a banlist é de nomes de COLUNA, então a fronteira certa é `(^|_)termo(_|$)`
-- — ela casa `nome_completo`, `data_nascimento` e `destinatario_email`, e NÃO casa
-- `modo_vigente` nem `notificacoes_expurgadas`. Mais uma banlist de igualdade
-- exata por `column_name = ANY(...)`, para os nomes que não têm separador.
-- ⚠ `candidato_id` NÃO é banido, e a distinção é o ponto de D-46-15: o ledger
-- grava o IDENTIFICADOR QUE DEIXA DE EXISTIR — é isso que ele é. O que ele não
-- pode ter é nome, e-mail, CPF, telefone, endereço ou data de nascimento.
--
-- HIGIENE: `RESET ROLE` em toda troca de contexto e ao final. Os NOTICEs carregam
-- contagens, SQLSTATEs e nomes de objeto — NUNCA PII e nunca o valor de um
-- segredo. Os uuids sintéticos da fixture não são PII: são literais gerados pelo
-- plano 46-01 para contas em domínio não-roteável.
-- =============================================================================

RESET ROLE;
-- Inicializa o contador (idempotente entre runs).
SELECT set_config('smoke46p.pass', '0', false);


-- ─────────────────────────────────────────────────────────────────────────────
-- (h) ⊖ O LEDGER NÃO GUARDA PII — aferido sobre o CATÁLOGO (PURGA-06 / D-46-15)
--
--     ⚠ SOBRE O CATÁLOGO E NÃO SOBRE DADOS, DE PROPÓSITO. A proibição tem de
--     valer ANTES de qualquer linha existir — uma asserção sobre dados passaria
--     por vacuidade num ledger vazio, que é exatamente o estado em que ele nasce.
--     É o molde da asserção (a) do smoke da 43, que afere a assinatura e não uma
--     execução.
--
--     A razão de fundo: o ledger NUNCA pode reintroduzir o dado que a purga
--     acabou de remover. Se ele o fizesse, a purga não teria purgado nada — teria
--     apenas movido a PII de uma tabela para outra, com retenção INDEFINIDA por
--     cima (D-46-16).
--
--     FORA DO ENVELOPE: esta asserção não escreve, não lê a fixture e não depende
--     de execução nenhuma. Ela é estática por natureza.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $h$
DECLARE
  r          record;
  v_tab      text;
  v_banido   text;
  v_n_tab    int := 0;
  v_n_col    int := 0;
  v_tabelas  text[] := ARRAY['purga_execucoes', 'purga_execucao_itens'];
  -- Fronteira por separador de palavra: casa `nome_completo`, `data_nascimento`,
  -- `destinatario_email`; NAO casa `modo_vigente`, `notificacoes_expurgadas`.
  v_banlist  text[] := ARRAY[
    '(^|_)nome(_|$)', '(^|_)email(_|$)', '(^|_)e_mail(_|$)', '(^|_)cpf(_|$)',
    '(^|_)telefone(_|$)', '(^|_)celular(_|$)', '(^|_)endereco(_|$)',
    '(^|_)nascimento(_|$)', '(^|_)rg(_|$)', '(^|_)curriculo(_|$)',
    '(^|_)genero(_|$)', '(^|_)destinatario(_|$)'
  ];
  -- Igualdade EXATA, para nomes sem separador que a fronteira acima ja cobre mas
  -- que ficam aqui como segunda camada legivel.
  v_banexato text[] := ARRAY[
    'nome', 'nome_completo', 'email', 'cpf', 'celular', 'telefone', 'endereco',
    'data_nascimento', 'rg', 'curriculo_url'
  ];
BEGIN
  FOREACH v_tab IN ARRAY v_tabelas LOOP
    IF to_regclass('public.' || v_tab) IS NULL THEN
      RAISE EXCEPTION 'P46P FAIL (h): public.% NAO existe — a migration 20260823000002_p46_ledger nao foi aplicada, e sem o ledger a pergunta "o QUE foi apagado" (PURGA-06) nao e respondivel', v_tab;
    END IF;
    v_n_tab := v_n_tab + 1;

    FOR r IN
      SELECT c.column_name
        FROM information_schema.columns c
       WHERE c.table_schema = 'public'
         AND c.table_name   = v_tab
       ORDER BY c.ordinal_position
    LOOP
      v_n_col := v_n_col + 1;

      IF lower(r.column_name) = ANY (v_banexato) THEN
        RAISE EXCEPTION 'P46P FAIL (h): a coluna public.%.% e um identificador de pessoa (igualdade exata) — o ledger da purga NAO pode reintroduzir o dado que a purga acabou de remover. Ele grava o identificador que DEIXA DE EXISTIR mais a politica aplicada, e nada mais (D-46-15). Um ledger com PII faria a purga apenas MOVER a PII, com retencao INDEFINIDA por cima (D-46-16)', v_tab, r.column_name;
      END IF;

      FOREACH v_banido IN ARRAY v_banlist LOOP
        IF lower(r.column_name) ~ v_banido THEN
          RAISE EXCEPTION 'P46P FAIL (h): a coluna public.%.% casa o identificador de pessoa banido /%/ — o ledger da purga NAO pode reintroduzir o dado que a purga acabou de remover (D-46-15). Nota: candidato_id NAO e banido de proposito, porque e justamente o identificador que deixa de existir; o que esta proibido e nome, e-mail, CPF, telefone, endereco e data de nascimento', v_tab, r.column_name, v_banido;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  IF v_n_tab <> 2 THEN
    RAISE EXCEPTION 'P46P FAIL (h): encontrei % das 2 tabelas de ledger esperadas', v_n_tab;
  END IF;

  -- ⊖ NAO-VACUIDADE DA PROPRIA BANLIST: se as tabelas existissem com duas colunas
  -- cada, a varredura passaria em verde sem ter olhado para nada. As duas somam
  -- 23 colunas por desenho (10 + 13).
  IF v_n_col < 20 THEN
    RAISE EXCEPTION 'P46P FAIL (h): as duas tabelas do ledger somam apenas % colunas (esperado >= 20) — a banlist passaria por VACUIDADE. Ou as tabelas nao foram criadas como a migration 20260823000002 prescreve, ou esta asserção deixou de olhar para elas', v_n_col;
  END IF;

  -- Metade POSITIVA: um ledger que nao registrasse a POLITICA passaria pela
  -- banlist em silencio e nao responderia PURGA-06.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = 'purga_execucao_itens'
       AND c.column_name = 'ancora_origem'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = 'purga_execucao_itens'
       AND c.column_name = 'janela_meses_aplicada'
  ) THEN
    RAISE EXCEPTION 'P46P FAIL (h): purga_execucao_itens nao tem ancora_origem + janela_meses_aplicada — a banlist passaria por vacuidade sobre um ledger que nao responde "sob QUAL POLITICA esta pessoa foi apagada"';
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (h): as 2 tabelas do ledger somam % colunas e NENHUMA e identificador de pessoa; ancora_origem e janela_meses_aplicada presentes', v_n_col;
END $h$;


-- ─────────────────────────────────────────────────────────────────────────────
-- AS ASSERÇÕES DE EXECUÇÃO — (f), (c), (i), (idem), (claim)
--
-- Tudo abaixo é MEDIDO dentro do envelope e JULGADO fora dele. Ver o cabeçalho:
-- variáveis plpgsql sobrevivem ao rollback de subtransação, GUCs não.
--
-- (f) ⊖ KILL SWITCH PROVADO DESLIGANDO DE VERDADE (PURGA-05 / D-46-09 / SC#3).
--     Com `modo = 'off'`: as cinco contagens de domínio idênticas, `veredito =
--     'desligado'`, `processados = 0`, ZERO item — e `elegiveis > 0`. O critério é
--     explícito em recusar prova por leitura de config, e um kill switch provado
--     sobre conjunto vazio não prova nada.
--
-- (c) ⊖ DRY-RUN SOBRE CONJUNTO NÃO-VAZIO NÃO APAGOU NADA (PURGA-03).
--     Com `modo = 'dry_run'`: as cinco contagens idênticas, `veredito = 'dry_run'`,
--     `processados = 0`, `elegiveis >= 3`, e nenhum despacho.
--     ⚠ A negativa sobre `pg_net` tem DUAS metades porque uma delas é perecível:
--     `net._http_response` é UNLOGGED com TTL de ~6 h, então a asserção sobre ela
--     só vale dentro da janela. A metade DURÁVEL é a ausência de item com
--     desfecho de Storage/Postgres/Auth carimbado em `ok` ou `falha` — em
--     `dry_run` nada foi tentado, e dizer `ok` seria a mentira mais cara possível.
--     As duas ficam no arquivo, e o NOTICE diz qual delas pôde ser medida.
--
-- (i) O ITEM REGISTRA A POLÍTICA, NÃO SÓ A CONTAGEM (PURGA-06).
--     Cada item tem `etapa`, `janela_meses_aplicada`, `ancora_origem` e
--     `ancora_em` — e a `janela_meses_aplicada` gravada BATE a janela viva da
--     matriz para aquela etapa, e aquela etapa está na allowlist. É essa metade
--     que torna a asserção não-trivial: as quatro colunas são NOT NULL por DDL, e
--     conferir "não é nulo" não provaria nada além do `CREATE TABLE`.
--     ⚠ Mais a cardinalidade: `ancora_origem` observada em >= 2 valores DISTINTOS
--     entre `pos1`/`pos2`/`pos3`. Sem esta segunda metade a coluna seria observada
--     num valor só e não provaria que a escada de degraus funciona.
--
-- (idem) A IDEMPOTÊNCIA DO DRY-RUN É OBSERVADA, NÃO PRESUMIDA.
--     Duas execuções seguidas em `dry_run`: mesma seleção, mesmo `elegiveis`,
--     mesmo número de itens, DUAS linhas de `purga_execucoes`, zero mutação nas
--     duas. É o carimbo de `concluido_em` do primeiro laço que fecha o claim do
--     Pitfall 6 e permite a segunda passada enxergar o mesmo conjunto.
--
-- (claim) ⊖ TITULAR COM ITEM ABERTO NÃO É RE-SELECIONADO (Pitfall 6).
--     ⚠ ESTA ASSERÇÃO EXISTE PORQUE, SEM ELA, O `NOT EXISTS` ANTI-SOBREPOSIÇÃO DA
--     VARREDURA SERIA DEAD CODE — nunca exercitado, porque no caminho feliz nunca
--     há item aberto. É a mesma classe do P39/CR-02 e a mesma lição de
--     `neg-art20` no plano 46-01: uma guarda que nunca foi exercitada é uma
--     guarda que ninguém sabe se funciona. Plantamos um item ABERTO para `pos1` e
--     medimos que a passada seguinte o EXCLUI, e exclui exatamente ele.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $envelope$
DECLARE
  -- TITULARES (public.candidatos.id) — o alvo do ledger.
  v_pos1 constant uuid := '4601b000-0000-4000-8000-000000000001'::uuid;
  v_pos2 constant uuid := '4601b000-0000-4000-8000-000000000002'::uuid;
  v_pos3 constant uuid := '4601b000-0000-4000-8000-000000000003'::uuid;

  -- CANDIDATURAS (public.candidaturas.id) — o alvo do predicado. Os dois espacos
  -- de id sao DIFERENTES de proposito na fixture do 46-01 (`…b000…` titular,
  -- `…c000…` candidatura), e trocar um pelo outro produziria uma asserção que
  -- passa por vacuidade contando zero linhas de um id que nao existe.
  v_cdt_pos3     constant uuid := '4601c000-0000-4000-8000-000000000003'::uuid;
  v_cdt_hold     constant uuid := '4601c000-0000-4000-8000-000000000005'::uuid;
  v_cdt_vaga     constant uuid := '4601c000-0000-4000-8000-000000000006'::uuid;
  v_cdt_art20    constant uuid := '4601c000-0000-4000-8000-000000000007'::uuid;
  v_cdt_etapa    constant uuid := '4601c000-0000-4000-8000-000000000008'::uuid;
  -- Ator sintetico da resposta a revisao do Art. 20: o PROPRIO titular sintetico
  -- (`auth.users.id` da variante neg-art20). Mesma escolha da fixture do 46-01
  -- para `por_usuario` — nenhum id de recrutador REAL entra neste arquivo.
  v_auth_art20   constant uuid := '4601a000-0000-4000-8000-000000000007'::uuid;
  v_etapa_fora   constant public.etapa_processo := 'entrevista_online';

  v_modo_antes text;
  v_vistos     uuid[];
  v_novas      int;

  v_dom_a text;  -- contagens de dominio ANTES de tudo
  v_dom_f text;  -- depois da execucao em off
  v_dom_z text;  -- depois de TODAS as execucoes

  v_net_medido boolean := true;
  v_net_nota   text    := 'medido';
  v_netr_a bigint; v_netr_z bigint;
  v_netq_a bigint; v_netq_z bigint;

  -- (f) execucao em off
  v_f_id uuid; v_f_modo text; v_f_ver text; v_f_sit text;
  v_f_eleg int; v_f_proc int; v_f_itens bigint; v_f_novas int;

  -- (c) dry-run #1
  v_c_id uuid; v_c_modo text; v_c_ver text; v_c_sit text;
  v_c_eleg int; v_c_proc int; v_c_novas int;
  v_c_itens bigint; v_c_carimbados bigint; v_c_abertos bigint;

  -- (i)
  v_i_divergentes bigint; v_i_pos bigint; v_i_origens bigint; v_i_nulos bigint;

  -- (idem) dry-run #2
  v_d_id uuid; v_d_ver text; v_d_eleg int; v_d_proc int; v_d_novas int;
  v_d_itens bigint;

  -- (claim) dry-run #3, com item ABERTO plantado para pos1
  v_k_id uuid; v_k_eleg int; v_k_novas int; v_k_plantados int;
  v_k_itens bigint; v_k_pos1 bigint;

  -- ── PLANO 46-03 ────────────────────────────────────────────────────────────
  -- Gatilhos de despacho desligados por CRITERIO MEDIDO, e a lista do que foi
  -- desligado, para religar e para asserir que nada ficou desligado.
  r_trg      record;
  v_trg_off  int   := 0;
  v_trg_back int   := 0;
  v_trg_rest int;
  v_trg_lista jsonb := '[]'::jsonb;
  v_trg_item jsonb;

  -- (j.1) hold pontual
  v_j1_ativos bigint; v_j1_antes bigint; v_j1_depois bigint; v_j1_liberados int;
  -- (j.2) vaga ainda aberta
  v_j2_vaga uuid; v_j2_status text; v_j2_antes bigint; v_j2_depois bigint;
  -- (j.3) revisao do Art. 20 em aberto
  v_j3_abertas bigint; v_j3_antes bigint; v_j3_depois bigint; v_j3_respondidas int;
  -- (k) degrau (3) quando nao ha decisao registrada
  v_k4_hist bigint; v_k4_dec bigint; v_k4_pred bigint;
  v_k4_origem text; v_k4_itens bigint; v_k4_item_origem text;
  -- (l) allowlist por igualdade de CONJUNTO
  v_l_antes bigint; v_l_depois bigint; v_l_flip int;
  v_l_allow text[];
  v_l_esperada constant text[] := ARRAY['aprovado','decisao_final','rejeitado'];

  -- ── PLANO 46-04 ────────────────────────────────────────────────────────────
  -- (b) o laco de dry-run chamou o MOTOR e terminou no terminador dele
  v_b_itens       bigint; v_b_sem_relato bigint;
  v_b_com_marca   bigint; v_b_corpo_cheio bigint;

  -- (o) ⊖ o 4o ramo do guard recusa fora das condicoes, e ACEITA dentro delas.
  -- ⚠⚠ O ALVO DAS QUATRO NEGATIVAS E UM `candidato_id` QUE NAO EXISTE, e a
  --    escolha e de SEGURANCA, nao de conveniencia. `purga_execucao_itens`
  --    NAO tem FK para `candidatos` (deliberado, 20260823000002:264) — entao da
  --    para fabricar o estado autorizante para um titular inexistente. O efeito e
  --    que a assercao vira TOTALMENTE DISCRIMINANTE e ZERO DESTRUTIVA ao mesmo
  --    tempo: se o guard RECUSA (o correto) vem `42501`; se o guard AUTORIZASSE
  --    por defeito, o motor iria adiante e pararia em `P0002`
  --    (CANDIDATO_INEXISTENTE) sem ter mutado uma unica coluna de pessoa real.
  --    Os dois desfechos sao distinguiveis por SQLSTATE, e nenhum dos dois apaga
  --    nada. Um teste de guard destrutivo NAO precisa apontar para gente de
  --    verdade para provar que o guard morde.
  v_o_sint    constant uuid := '4604f000-0000-4000-8000-00000000000f'::uuid;
  v_o_exec     uuid; v_o_item uuid; v_o_item_pos uuid;
  v_o_st       text[] := ARRAY[]::text[];
  v_o_pos_st   text;
  v_o_alvo_ex  bigint;
BEGIN
  BEGIN
    -- ═══ MEDIÇÃO — tudo aqui dentro; nada disso persiste ═══════════════════════

    SELECT cp.modo INTO v_modo_antes FROM public.config_purga cp;

    SELECT format('candidatos=%s candidaturas=%s historico=%s decisao_final=%s users=%s',
                  (SELECT count(*) FROM public.candidatos),
                  (SELECT count(*) FROM public.candidaturas),
                  (SELECT count(*) FROM public.historico_candidatura),
                  (SELECT count(*) FROM public.decisao_final),
                  (SELECT count(*) FROM auth.users))
      INTO v_dom_a;

    -- ⚠ pg_net e medido com tolerancia DECLARADA, nunca com silencio: se a
    -- relacao nao existir ou o papel nao puder le-la, o run NAO reprova — mas o
    -- NOTICE final DIZ que aquela metade nao foi medida, e a metade duravel
    -- (desfechos nao carimbados) continua obrigatoria. Um skip silencioso aqui
    -- seria um portao que finge ter olhado.
    BEGIN
      IF to_regclass('net._http_response') IS NULL THEN
        v_net_medido := false;
        v_net_nota   := 'net._http_response nao existe neste banco';
      ELSE
        EXECUTE 'SELECT count(*) FROM net._http_response' INTO v_netr_a;
      END IF;
      IF to_regclass('net.http_request_queue') IS NOT NULL THEN
        EXECUTE 'SELECT count(*) FROM net.http_request_queue' INTO v_netq_a;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_net_medido := false;
      v_net_nota   := format('leitura de pg_net recusada (%s: %s)', SQLSTATE, SQLERRM);
    END;

    -- ── (f) KILL SWITCH ────────────────────────────────────────────────────────
    SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;

    UPDATE public.config_purga SET modo = 'off';
    PERFORM public.varrer_purga_retencao();

    -- ⚠ A linha nova NAO e localizada por ORDER BY iniciada_em: o default daquela
    -- coluna e now(), que e CONSTANTE dentro de uma transacao — as tres execucoes
    -- deste envelope compartilham o mesmo carimbo, e ordenar por ele seria
    -- nao-determinista. A identificacao e por DIFERENCA de conjunto de ids.
    SELECT count(*) INTO v_f_novas
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT e.id, e.modo_vigente, e.elegiveis, e.processados, e.veredito, e.situacao
      INTO v_f_id, v_f_modo, v_f_eleg, v_f_proc, v_f_ver, v_f_sit
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT count(*) INTO v_f_itens
      FROM public.purga_execucao_itens i WHERE i.execucao_id = v_f_id;

    SELECT format('candidatos=%s candidaturas=%s historico=%s decisao_final=%s users=%s',
                  (SELECT count(*) FROM public.candidatos),
                  (SELECT count(*) FROM public.candidaturas),
                  (SELECT count(*) FROM public.historico_candidatura),
                  (SELECT count(*) FROM public.decisao_final),
                  (SELECT count(*) FROM auth.users))
      INTO v_dom_f;

    -- ── (c) + (i) DRY-RUN #1 ───────────────────────────────────────────────────
    SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;

    UPDATE public.config_purga SET modo = 'dry_run';
    PERFORM public.varrer_purga_retencao();

    SELECT count(*) INTO v_c_novas
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT e.id, e.modo_vigente, e.elegiveis, e.processados, e.veredito, e.situacao
      INTO v_c_id, v_c_modo, v_c_eleg, v_c_proc, v_c_ver, v_c_sit
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT count(*) INTO v_c_itens
      FROM public.purga_execucao_itens i WHERE i.execucao_id = v_c_id;

    -- ⊖ Metade DURAVEL da negativa de despacho: nada foi tentado, entao nenhum
    -- passo pode estar carimbado como ok nem como falha.
    SELECT count(*) INTO v_c_carimbados
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_c_id
       AND (i.desfecho_storage  IN ('ok', 'falha')
         OR i.desfecho_postgres IN ('ok', 'falha')
         OR i.desfecho_auth     IN ('ok', 'falha'));

    -- O laco de dry-run TEM de fechar todos os itens: um item aberto deixado para
    -- tras faria a passada seguinte excluir aquele titular para sempre.
    SELECT count(*) INTO v_c_abertos
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_c_id AND i.concluido_em IS NULL;

    -- (i) — a politica gravada BATE a matriz viva, e a etapa esta na allowlist.
    SELECT count(*) INTO v_i_divergentes
      FROM public.purga_execucao_itens i
      JOIN public.config_retencao_etapa m ON m.etapa = i.etapa
     WHERE i.execucao_id = v_c_id
       AND (i.janela_meses_aplicada IS DISTINCT FROM m.janela_meses
         OR m.elegivel_purga IS DISTINCT FROM true);

    SELECT count(*) INTO v_i_nulos
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_c_id
       AND (i.etapa IS NULL OR i.janela_meses_aplicada IS NULL
         OR i.ancora_origem IS NULL OR i.ancora_em IS NULL);

    SELECT count(*), count(DISTINCT i.ancora_origem)
      INTO v_i_pos, v_i_origens
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_c_id
       AND i.candidato_id IN (v_pos1, v_pos2, v_pos3);

    -- ── (b) 46-04 · O LACO CHAMOU O MOTOR, E TERMINOU NO TERMINADOR DELE ──────
    -- ⚠ E ESTA A ASSERCAO QUE FECHA PURGA-02, e ela mede sobre a MESMA execucao
    --   que (c) julga. (c) prova que NADA mudou; sozinha, ela passaria identica
    --   num laco que nao chamasse funcao nenhuma — que foi exatamente o estado do
    --   46-02, e por isso PURGA-02 nao fechou la. (b) prova o outro lado: o corpo
    --   COMPLETO do motor executou e foi revertido.
    SELECT count(*) INTO v_b_itens
      FROM public.purga_execucao_itens i WHERE i.execucao_id = v_c_id;

    SELECT count(*) INTO v_b_sem_relato
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_c_id AND i.relato_dry_run IS NULL;

    -- O identificador do terminador do MOTOR, e nao uma frase escrita por este
    -- laco: `SQLERRM` do `P45DR` comeca por `P45 DRY-RUN`. A 2a terminacao
    -- contratada (WR-05, linha que JA e tombstone) carrega o mesmo prefixo de
    -- proposito, para que a assercao valha para as DUAS sem deixar de morder.
    SELECT count(*) INTO v_b_com_marca
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_c_id AND i.relato_dry_run LIKE 'P45 DRY-RUN%';

    -- ⚠ A METADE QUE NENHUMA OUTRA ASSERCAO COBRE: o relato traz as CONTAGENS POR
    --   PASSO que o motor produziu antes de derrubar a transacao. Um relato com o
    --   prefixo mas sem `candidatos=` seria compativel com um motor que recusou
    --   cedo; um relato COM as contagens so pode ter sido produzido depois de as
    --   doze mutacoes terem efetivamente rodado. E dai que sai a frase "o corpo
    --   COMPLETO executou e foi revertido" — por medicao, e nao por confianca.
    SELECT count(*) INTO v_b_corpo_cheio
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_c_id AND i.relato_dry_run LIKE '%candidatos=%';

    -- ── (idem) DRY-RUN #2, sem tocar em mais nada ──────────────────────────────
    SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;

    PERFORM public.varrer_purga_retencao();

    SELECT count(*) INTO v_d_novas
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT e.id, e.elegiveis, e.processados, e.veredito
      INTO v_d_id, v_d_eleg, v_d_proc, v_d_ver
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT count(*) INTO v_d_itens
      FROM public.purga_execucao_itens i WHERE i.execucao_id = v_d_id;

    -- ── (claim) planta um item ABERTO para pos1 e roda a TERCEIRA passada ──────
    -- O item plantado copia os valores REAIS do item de pos1 da passada anterior,
    -- para que a unica diferenca seja `concluido_em` nulo.
    INSERT INTO public.purga_execucao_itens
           (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em)
    SELECT i.execucao_id, i.candidato_id, i.etapa, i.janela_meses_aplicada, i.ancora_origem, i.ancora_em
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_d_id AND i.candidato_id = v_pos1
     LIMIT 1;

    GET DIAGNOSTICS v_k_plantados = ROW_COUNT;

    SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;

    PERFORM public.varrer_purga_retencao();

    SELECT count(*) INTO v_k_novas
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT e.id, e.elegiveis
      INTO v_k_id, v_k_eleg
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT count(*) INTO v_k_itens
      FROM public.purga_execucao_itens i WHERE i.execucao_id = v_k_id;

    SELECT count(*) INTO v_k_pos1
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_k_id AND i.candidato_id = v_pos1;

    -- ══ PLANO 46-03 — (j.1)(j.2)(j.3)(k)(l) ═══════════════════════════════════
    -- Tudo daqui em diante e MEDIDO aqui dentro e JULGADO depois do rollback.
    -- As tres mutacoes de (j) sao DESFEITAS logo apos a medicao da 2ª metade —
    -- redundante com o rollback, e a redundancia e o ponto: enquanto o envelope
    -- ainda roda, as asserções seguintes tem de enxergar o mesmo estado que as
    -- anteriores enxergaram.

    -- Gatilhos de despacho DESLIGADOS POR CRITERIO MEDIDO DO CATALOGO — nunca por
    -- lista fixa de nomes (licao paga por medicao no plano 46-01: o repositorio
    -- anunciava 2 gatilhos, o catalogo vivo tinha 3, e um dos anunciados nao
    -- existia mais). A lista de TABELAS e escopo deliberado: sao exatamente as
    -- tres que este bloco muta.
    FOR r_trg IN
      SELECT c.relname AS tabela, t.tgname AS gatilho
        FROM pg_trigger t
        JOIN pg_class c     ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_proc p      ON p.oid = t.tgfoid
       WHERE NOT t.tgisinternal
         AND n.nspname = 'public'
         AND c.relname IN ('decisao_final', 'vagas', 'retencao_hold')
         AND t.tgenabled <> 'D'
         AND pg_get_functiondef(p.oid) LIKE '%net.http_post%'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER %I', r_trg.tabela, r_trg.gatilho);
      v_trg_off   := v_trg_off + 1;
      v_trg_lista := v_trg_lista || jsonb_build_object('t', r_trg.tabela, 'g', r_trg.gatilho);
    END LOOP;

    -- ── (j.1) ⊖ `retencao_hold` PROTEGE, e o hold LIBERADO deixa de proteger ──
    SELECT count(*) INTO v_j1_ativos
      FROM public.retencao_hold h
     WHERE h.candidatura_id = v_cdt_hold AND h.liberado_em IS NULL;

    SELECT count(*) INTO v_j1_antes
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_hold;

    UPDATE public.retencao_hold
       SET liberado_em = pg_catalog.now()
     WHERE candidatura_id = v_cdt_hold AND liberado_em IS NULL;
    GET DIAGNOSTICS v_j1_liberados = ROW_COUNT;

    SELECT count(*) INTO v_j1_depois
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_hold;

    UPDATE public.retencao_hold SET liberado_em = NULL WHERE candidatura_id = v_cdt_hold;

    -- ── (j.2) ⊖ VAGA AINDA ABERTA protege; arquivada, deixa de proteger ───────
    SELECT c.vaga_id INTO v_j2_vaga FROM public.candidaturas c WHERE c.id = v_cdt_vaga;
    SELECT v.status::text INTO v_j2_status FROM public.vagas v WHERE v.id = v_j2_vaga;

    SELECT count(*) INTO v_j2_antes
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_vaga;

    UPDATE public.vagas SET status = 'arquivada'::public.status_vaga WHERE id = v_j2_vaga;

    SELECT count(*) INTO v_j2_depois
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_vaga;

    UPDATE public.vagas SET status = v_j2_status::public.status_vaga WHERE id = v_j2_vaga;

    -- ── (j.3) ⊖ REVISAO DO ART. 20 EM ABERTO protege; respondida, nao ─────────
    -- ⚠ A resposta grava as QUATRO colunas juntas porque
    -- decisao_final_revisao_resposta_completa_check e tudo-ou-nada, e
    -- decisao_final_revisao_justificativa_min_check exige >= 50 caracteres. Este
    -- UPDATE contorna o RPC responder_revisao_decisao de proposito — o objeto sob
    -- teste aqui e o PREDICADO, nao o guard daquele RPC (que tem smoke proprio em
    -- p42_revisao_art20_smoke.sql). Nenhum id de pessoa REAL e usado.
    SELECT count(*) INTO v_j3_abertas
      FROM public.decisao_final d
     WHERE d.candidatura_id = v_cdt_art20
       AND d.revisao_solicitada_em IS NOT NULL
       AND d.revisao_respondida_em IS NULL;

    SELECT count(*) INTO v_j3_antes
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_art20;

    UPDATE public.decisao_final
       SET revisao_veredito       = 'mantida',
           revisao_por_usuario    = v_auth_art20,
           revisao_respondida_em  = pg_catalog.now(),
           revisao_resultado      = 'SMOKE P46 (j.3) — resposta sintetica a uma revisao sintetica sobre candidatura sintetica; existe apenas para provar que a excecao do Art. 20 deixa de proteger quando a revisao e respondida. Revertida pelo envelope.'
     WHERE candidatura_id = v_cdt_art20 AND revisao_respondida_em IS NULL;
    GET DIAGNOSTICS v_j3_respondidas = ROW_COUNT;

    SELECT count(*) INTO v_j3_depois
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_art20;

    UPDATE public.decisao_final
       SET revisao_veredito      = NULL,
           revisao_por_usuario   = NULL,
           revisao_respondida_em = NULL,
           revisao_resultado     = NULL
     WHERE candidatura_id = v_cdt_art20;

    -- ── Gatilhos RELIGADOS, e o resto medido ─────────────────────────────────
    FOR v_trg_item IN SELECT jsonb_array_elements(v_trg_lista) LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER %I',
                     v_trg_item ->> 't', v_trg_item ->> 'g');
      v_trg_back := v_trg_back + 1;
    END LOOP;

    SELECT count(*) INTO v_trg_rest
      FROM pg_trigger t
      JOIN pg_class c     ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p      ON p.oid = t.tgfoid
     WHERE NOT t.tgisinternal
       AND n.nspname = 'public'
       AND c.relname IN ('decisao_final', 'vagas', 'retencao_hold')
       AND t.tgenabled = 'D'
       AND pg_get_functiondef(p.oid) LIKE '%net.http_post%';

    -- ── (k) DEGRAU CORRETO QUANDO NAO HA DECISAO REGISTRADA (PURGA-07 / SC#4) ──
    -- As duas medicoes de PRE-CONDICAO existem para que a asserção reprove com o
    -- diagnostico CERTO: se a fixture tiver ganhado historico ou data_decisao_final,
    -- o degrau esperado deixa de ser (3) e o erro e da FIXTURE, nao do predicado.
    SELECT count(*) INTO v_k4_hist
      FROM public.historico_candidatura h
      JOIN public.candidaturas c ON c.id = h.candidatura_id
     WHERE h.candidatura_id = v_cdt_pos3 AND h.etapa_para = c.etapa_atual;

    SELECT count(*) INTO v_k4_dec
      FROM public.candidaturas c
     WHERE c.id = v_cdt_pos3 AND c.data_decisao_final IS NOT NULL;

    SELECT count(*), max(f.ancora_origem)
      INTO v_k4_pred, v_k4_origem
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_pos3;

    SELECT count(*), max(i.ancora_origem)
      INTO v_k4_itens, v_k4_item_origem
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_c_id AND i.candidato_id = v_pos3;

    -- ── (l) ⊖ ETAPA FORA DA ALLOWLIST NAO ENTRA (D-46-19) ─────────────────────
    SELECT count(*) INTO v_l_antes
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_etapa;

    -- ⚠ IGUALDADE DE CONJUNTO, e nunca contagem nua: uma contagem de 3 passaria
    -- com as TRES ETAPAS ERRADAS marcadas como elegiveis, que e precisamente o
    -- estado mais perigoso que esta asserção pode deixar passar. O ORDER BY e por
    -- TEXTO e nao pelo enum: `etapa_processo` tem ordem de funil (decisao_final
    -- vem ANTES de aprovado), e comparar contra um literal alfabetico ordenado
    -- pelo enum reprovaria por acidente de ordenacao.
    SELECT array_agg(etapa ORDER BY etapa)
      INTO v_l_allow
      FROM (
        SELECT m.etapa::text AS etapa
          FROM public.config_retencao_etapa m
         WHERE m.elegivel_purga
      ) s;

    -- 2ª metade: marcar a etapa de `neg-etapa` como elegivel TEM de faze-la
    -- aparecer. Sem isto, "ela nao aparece" poderia ser verdade por qualquer
    -- outro motivo — inclusive por ela ter deixado de existir.
    UPDATE public.config_retencao_etapa
       SET elegivel_purga = true
     WHERE etapa = v_etapa_fora;
    GET DIAGNOSTICS v_l_flip = ROW_COUNT;

    SELECT count(*) INTO v_l_depois
      FROM public.candidaturas_alem_da_janela() f
     WHERE f.candidatura_id = v_cdt_etapa;

    UPDATE public.config_retencao_etapa
       SET elegivel_purga = false
     WHERE etapa = v_etapa_fora;

    -- ══ (o) 46-04 · ⊖ O 4o RAMO RECUSA FORA DAS CONDICOES, E ACEITA DENTRO ════
    -- ⚠⚠ AS DUAS METADES SAO ASSERIDAS SEPARADAMENTE, e essa separacao E a
    --   obrigacao de aceite de D-46-24. Nao basta "a funcao recusa": um guard que
    --   recusa TUDO tambem passaria — e provar so recusa e o modo de falha no 3
    --   dos sete portoes da Phase 45. Por isso ha SEIS chamadas: quatro que TEM de
    --   recusar com 42501, e DUAS que tem de ser ACEITAS pelo guard.
    --
    -- ⚠ COMO O RESULTADO E LIDO, e por que ele e inequivoco sobre um alvo que nao
    --   existe:  42501 = o GUARD recusou (o correto nas quatro negativas).
    --            P0002 = o guard ACEITOU e o motor parou por nao haver candidato
    --                    (o correto na aceitacao de controle, e prova positiva de
    --                    que o ramo autoriza).
    --            P45DR = o guard aceitou e o corpo COMPLETO rodou e foi revertido
    --                    (o correto na aceitacao sobre titular REAL).
    --   Tres SQLSTATEs, tres significados, zero ambiguidade — e nenhum deles apaga
    --   coluna alguma de pessoa real.
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, veredito, situacao)
    VALUES ('live', 50, 1, 0, 'dry_run', 'executando')
    RETURNING id INTO v_o_exec;

    INSERT INTO public.purga_execucao_itens
           (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em)
    VALUES (v_o_exec, v_o_sint, 'aprovado'::public.etapa_processo, 24,
            'data_candidatura', pg_catalog.now())
    RETURNING id INTO v_o_item;

    -- ⊖ NAO-VACUIDADE DO PROPRIO ALVO: o titular sintetico tem de NAO existir. Se
    -- alguem criar um candidato com este uuid, o P0002 deixa de ser possivel e as
    -- negativas passariam a ser lidas errado.
    SELECT count(*) INTO v_o_alvo_ex
      FROM public.candidatos c WHERE c.id = v_o_sint;

    -- ── CASO 1 · cerco em `off` com item ABERTO -> RECUSA (D-46-06) ────────────
    -- O kill switch nao autoriza NENHUM dos dois caminhos, nem o reversivel.
    UPDATE public.config_purga SET modo = 'off';
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, true);
      v_o_st := v_o_st || 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o_st := v_o_st || SQLSTATE;
    END;

    -- ── CASO 2 · O PAR QUE PROVA O ESCOPO DUPLO, SOBRE ESTADO IDENTICO ────────
    -- ⚠ E ESTE PAR QUE VALE A DECISAO INTEIRA. Mesma execucao, mesmo item, mesmo
    --   cerco: muda SO a intencao. Se as duas metades tivessem passado a
    --   compartilhar um predicado, as duas chamadas dariam o MESMO desfecho — e e
    --   exatamente essa a regressao que D-46-24 mandou tornar impossivel.
    UPDATE public.config_purga SET modo = 'dry_run';
    UPDATE public.purga_execucoes SET modo_vigente = 'dry_run' WHERE id = v_o_exec;

    -- 2a · DESTRUTIVO sob `dry_run` -> RECUSA (a metade destrutiva exige `live`)
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, false);
      v_o_st := v_o_st || 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o_st := v_o_st || SQLSTATE;
    END;

    -- 2b · DRY-RUN sob `dry_run`, MESMO ESTADO -> ACEITO (chega ao motor: P0002)
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, true);
      v_o_st := v_o_st || 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o_st := v_o_st || SQLSTATE;
    END;

    -- ── CASO 3 · cerco em `live`, mas SEM item aberto -> RECUSA ───────────────
    UPDATE public.config_purga SET modo = 'live';
    UPDATE public.purga_execucoes SET modo_vigente = 'live' WHERE id = v_o_exec;
    UPDATE public.purga_execucao_itens SET concluido_em = pg_catalog.now() WHERE id = v_o_item;
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, false);
      v_o_st := v_o_st || 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o_st := v_o_st || SQLSTATE;
    END;

    -- ── CASO 4 · item reaberto, mas execucao `concluida` -> RECUSA ────────────
    -- Um item aberto pendurado numa execucao ja fechada e um VESTIGIO, e vestigio
    -- nao autoriza: o ramo exige o estado que o motor produz AGORA.
    UPDATE public.purga_execucao_itens SET concluido_em = NULL WHERE id = v_o_item;
    UPDATE public.purga_execucoes SET situacao = 'concluida' WHERE id = v_o_exec;
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, false);
      v_o_st := v_o_st || 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o_st := v_o_st || SQLSTATE;
    END;

    -- ── CASO 5 · POSITIVO SOBRE TITULAR REAL: as condicoes satisfeitas ────────
    -- ⚠ SEM ESTA CHAMADA, (o) provaria apenas que a funcao recusa tudo. Ela roda
    --   sobre `pos1`, com `p_dry_run := true`, e TEM de terminar em `P45DR`: o
    --   corpo COMPLETO executa e a subtransacao o reverte.
    UPDATE public.purga_execucoes
       SET situacao = 'executando', modo_vigente = 'dry_run' WHERE id = v_o_exec;
    UPDATE public.config_purga SET modo = 'dry_run';

    INSERT INTO public.purga_execucao_itens
           (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em)
    VALUES (v_o_exec, v_pos1, 'aprovado'::public.etapa_processo, 24,
            'data_candidatura', pg_catalog.now())
    RETURNING id INTO v_o_item_pos;

    BEGIN
      PERFORM public.anonimizar_candidato(v_pos1, true);
      v_o_pos_st := 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o_pos_st := SQLSTATE;
    END;

    -- Fecha os dois itens de (o) para nao deixar vestigio para as leituras
    -- seguintes deste envelope (redundante com o rollback; a redundancia e o ponto).
    UPDATE public.purga_execucao_itens i
       SET concluido_em = pg_catalog.now()
     WHERE i.id IN (v_o_item, v_o_item_pos) AND i.concluido_em IS NULL;

    UPDATE public.purga_execucoes e
       SET situacao = 'concluida', concluida_em = pg_catalog.now()
     WHERE e.id = v_o_exec;

    UPDATE public.config_purga SET modo = 'dry_run';

    -- ── Estado final do dominio e do pg_net ────────────────────────────────────
    SELECT format('candidatos=%s candidaturas=%s historico=%s decisao_final=%s users=%s',
                  (SELECT count(*) FROM public.candidatos),
                  (SELECT count(*) FROM public.candidaturas),
                  (SELECT count(*) FROM public.historico_candidatura),
                  (SELECT count(*) FROM public.decisao_final),
                  (SELECT count(*) FROM auth.users))
      INTO v_dom_z;

    IF v_net_medido THEN
      BEGIN
        EXECUTE 'SELECT count(*) FROM net._http_response' INTO v_netr_z;
        IF v_netq_a IS NOT NULL THEN
          EXECUTE 'SELECT count(*) FROM net.http_request_queue' INTO v_netq_z;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_net_medido := false;
        v_net_nota   := format('leitura final de pg_net recusada (%s: %s)', SQLSTATE, SQLERRM);
      END;
    END IF;

    -- ═══ TEARDOWN — reverte a fixture deste smoke por completo ═════════════════
    -- Reverte `config_purga.modo` ao valor que estava vivo, as tres (ou quatro)
    -- linhas de `purga_execucoes`, todos os itens, e o item plantado.
    RAISE EXCEPTION 'rollback_smoke46p_envelope' USING ERRCODE = 'P46B0';
  EXCEPTION
    WHEN sqlstate 'P46B0' THEN
      NULL;  -- reversao ESPERADA; as variaveis acima sobreviveram ao rollback
  END;

  RESET ROLE;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- JULGAMENTO — fora da subtransação, sobre variáveis, sem uma única consulta
  -- viva. Ordem deliberada: primeiro o que prova NÃO-VACUIDADE, depois o resto.
  -- ═══════════════════════════════════════════════════════════════════════════

  -- ── (f) ⊖ KILL SWITCH ──────────────────────────────────────────────────────
  IF v_f_novas <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (f): a execucao em modo off gravou % linha(s) de purga_execucoes (esperado exatamente 1). O HEARTBEAT exige UMA linha por execucao, inclusive pelas que nao fazem nada — sem ela, "o cron parou" fica indistinguivel de "nao havia nada a purgar" (Pitfall 5)', v_f_novas;
  END IF;

  IF coalesce(v_f_eleg, -1) = 0 THEN
    RAISE EXCEPTION 'P46P FAIL (f): ⊖ NAO-VACUIDADE — a execucao em off reportou elegiveis = 0. UM KILL SWITCH PROVADO SOBRE CONJUNTO VAZIO NAO PROVA NADA: ele nao apagou nada porque nao havia nada, e nao porque estava desligado. A fixture do plano 46-01 esta viva em PROD e candidaturas_alem_da_janela() deve devolver 6; conferir com SELECT count(*) FROM public.titulares_alem_da_janela()';
  END IF;

  IF coalesce(v_f_eleg, -1) < 3 THEN
    RAISE EXCEPTION 'P46P FAIL (f): a execucao em off reportou elegiveis = % (esperado >= 3 sobre a fixture viva do 46-01)', v_f_eleg;
  END IF;

  IF v_f_ver IS DISTINCT FROM 'desligado' THEN
    RAISE EXCEPTION 'P46P FAIL (f): a execucao com modo = off gravou veredito = % (esperado desligado). PURGA-05 / SC#3 exigem que o kill switch seja provado DESLIGANDO DE VERDADE, por execucao REAL que nao apaga nada — nunca por leitura de config', coalesce(v_f_ver, 'NULL');
  END IF;

  IF v_f_modo IS DISTINCT FROM 'off' OR v_f_proc IS DISTINCT FROM 0 OR v_f_sit IS DISTINCT FROM 'concluida' THEN
    RAISE EXCEPTION 'P46P FAIL (f): cabecalho inconsistente em modo off (modo_vigente=%, processados=%, situacao=%; esperado off / 0 / concluida)', coalesce(v_f_modo,'NULL'), coalesce(v_f_proc,-1), coalesce(v_f_sit,'NULL');
  END IF;

  IF v_f_itens <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (f): a execucao em off gravou % item(ns) (esperado 0) — o ramo off tem de retornar ANTES de qualquer item', v_f_itens;
  END IF;

  IF v_dom_f IS DISTINCT FROM v_dom_a THEN
    RAISE EXCEPTION 'P46P FAIL (f): ⊖ as contagens de dominio MUDARAM durante a execucao em off. antes=[%] depois=[%]. Uma execucao com o kill switch acionado acabou de tocar em dado de pessoa', v_dom_a, v_dom_f;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (f): kill switch provado DESLIGANDO — % elegiveis contados, 0 processados, 0 itens, veredito desligado, e as 5 contagens de dominio inalteradas [%]', v_f_eleg, v_dom_f;

  -- ── (c) ⊖ DRY-RUN SOBRE CONJUNTO NÃO-VAZIO ─────────────────────────────────
  IF v_c_novas <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (c): a execucao em dry_run gravou % linha(s) de purga_execucoes (esperado exatamente 1)', v_c_novas;
  END IF;

  IF coalesce(v_c_eleg, -1) = 0 THEN
    RAISE EXCEPTION 'P46P FAIL (c): ⊖ NAO-VACUIDADE — o dry-run reportou elegiveis = 0. UM DRY-RUN QUE NAO APAGOU NADA PORQUE NAO HAVIA NADA E A DEFINICAO DE DECORACAO (SC#1), e e a mesma classe de falha do P39/CR-02. Este arquivo NAO pode ficar verde nesse estado';
  END IF;

  IF coalesce(v_c_eleg, -1) < 3 THEN
    RAISE EXCEPTION 'P46P FAIL (c): o dry-run reportou elegiveis = % (esperado >= 3 sobre a fixture viva do 46-01)', v_c_eleg;
  END IF;

  IF v_c_ver IS DISTINCT FROM 'dry_run' OR v_c_modo IS DISTINCT FROM 'dry_run'
     OR v_c_proc IS DISTINCT FROM 0 OR v_c_sit IS DISTINCT FROM 'concluida' THEN
    RAISE EXCEPTION 'P46P FAIL (c): cabecalho inconsistente em dry_run (modo_vigente=%, veredito=%, processados=%, situacao=%; esperado dry_run / dry_run / 0 / concluida). ⚠ processados > 0 fora de modo live e a assinatura de que o escopo DUPLO de D-46-24 foi violado', coalesce(v_c_modo,'NULL'), coalesce(v_c_ver,'NULL'), coalesce(v_c_proc,-1), coalesce(v_c_sit,'NULL');
  END IF;

  IF v_c_itens <> v_c_eleg THEN
    RAISE EXCEPTION 'P46P FAIL (c): o dry-run reportou % elegiveis mas gravou % itens — o numero do cabecalho e o do laco tem de sair da MESMA temporaria. Contar de uma consulta e percorrer de outra e a corrida que a materializacao unica existe para nao ter', v_c_eleg, v_c_itens;
  END IF;

  IF v_c_carimbados <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (c): ⊖ % item(ns) do dry-run tem desfecho de Storage/Postgres/Auth carimbado em ok ou falha. Em dry_run NADA foi tentado, e dizer ok e a mentira mais cara possivel neste sistema: ela faria o ledger afirmar uma destruicao que nao houve, ou esconder uma que houve', v_c_carimbados;
  END IF;

  IF v_c_abertos <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (c): o dry-run deixou % item(ns) ABERTOS (concluido_em nulo). O laco TEM de carimbar concluido_em: sem isso o claim anti-sobreposicao excluiria aqueles titulares PARA SEMPRE nas passadas seguintes', v_c_abertos;
  END IF;

  IF v_dom_z IS DISTINCT FROM v_dom_a THEN
    RAISE EXCEPTION 'P46P FAIL (c): ⊖ as contagens de dominio MUDARAM ao longo das execucoes de dry-run. antes=[%] depois=[%]. PURGA-03 exige que o dry-run sobre conjunto NAO-VAZIO nao apague NADA — e o conjunto era nao-vazio (% elegiveis), entao esta negativa nao passou por vacuidade', v_dom_a, v_dom_z, v_c_eleg;
  END IF;

  IF v_net_medido THEN
    IF v_netr_z IS DISTINCT FROM v_netr_a THEN
      RAISE EXCEPTION 'P46P FAIL (c): ⊖ net._http_response saiu de % para % linhas durante o dry-run — houve despacho HTTP, e em dry_run nada e despachado', v_netr_a, v_netr_z;
    END IF;
    IF v_netq_a IS NOT NULL AND v_netq_z IS DISTINCT FROM v_netq_a THEN
      RAISE EXCEPTION 'P46P FAIL (c): ⊖ net.http_request_queue saiu de % para % linhas durante o dry-run — uma requisicao foi enfileirada, e em dry_run nada e despachado', v_netq_a, v_netq_z;
    END IF;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (c): dry-run sobre % elegiveis (NAO-VAZIO), % itens, 0 processados, 0 desfechos carimbados, 0 itens abertos, dominio inalterado [%]; metade perecivel de pg_net: %', v_c_eleg, v_c_itens, v_dom_z, v_net_nota;

  -- ── (b) 46-04 · O LAÇO CHAMOU O MOTOR E TERMINOU NO TERMINADOR (PURGA-02) ──
  -- ⊖ NAO-VACUIDADE PRIMEIRO, porque as tres metades desta asserção sao
  -- trivialmente verdadeiras sobre conjunto vazio.
  IF coalesce(v_c_eleg, -1) < 3 THEN
    RAISE EXCEPTION 'P46P FAIL (b): ⊖ NAO-VACUIDADE — o dry-run reportou elegiveis = % (esperado >= 3 sobre a fixture viva do 46-01). UM LACO QUE NAO PERCORREU NINGUEM NAO PROVA QUE ELE CHAMA O MOTOR: as tres metades de (b) passariam por vacuidade, e PURGA-02 ficaria marcado como fechado sem uma unica chamada ter acontecido', v_c_eleg;
  END IF;

  IF coalesce(v_b_itens, 0) = 0 THEN
    RAISE EXCEPTION 'P46P FAIL (b): ⊖ NAO-VACUIDADE — zero itens gravados pela execucao em dry_run. Nao ha o que inspecionar, e uma asserção sobre o conteudo de itens inexistentes passa TRIVIALMENTE';
  END IF;

  IF v_b_sem_relato <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (b): % de % item(ns) da execucao em dry_run tem relato_dry_run NULO. O laco NAO chamou public.anonimizar_candidato para aquele(s) titular(es) — ou chamou e a chamada nao terminou em nenhuma das DUAS terminacoes contratadas. Enquanto o relato for nulo, o dry-run e exatamente o que o SC#1 chama de decoracao: um laco que nao apaga nada porque nao FAZ nada. ⚠ Se o desfecho_postgres desses itens estiver em falha, a causa esta no WARNING da varredura — a hipotese numero 1 e a migration 20260823000006 (o 4o ramo do guard) nao ter sido aplicada, e nesse caso o SQLSTATE de cada titular foi 42501', v_b_sem_relato, v_b_itens;
  END IF;

  IF v_b_com_marca IS DISTINCT FROM v_b_itens THEN
    RAISE EXCEPTION 'P46P FAIL (b): apenas % de % itens carregam o identificador do terminador do MOTOR (o relato tem de comecar por "P45 DRY-RUN"). Um relato com outro texto significa que quem escreveu aquela linha NAO foi o motor — o laco fabricou uma mensagem propria, e o dry-run voltou a ser uma segunda definicao de exclusao (P39 / CR-02)', v_b_com_marca, v_b_itens;
  END IF;

  IF coalesce(v_b_corpo_cheio, 0) < 1 THEN
    RAISE EXCEPTION 'P46P FAIL (b): NENHUM item traz as contagens por passo do motor (o relato deveria conter "candidatos="). O prefixo sozinho e compativel com uma recusa precoce; sao as CONTAGENS que provam que as doze mutacoes rodaram de verdade antes de a subtransacao ser revertida. Sem esta metade, "o corpo COMPLETO executou" seria confianca, e nao medicao — e com PITR desligado (D-45-10) e o Storage fora do backup, o dry-run e a UNICA rede desta fase';
  END IF;

  -- As duas negativas duraveis de (b) sao as MESMAS variaveis que (c) julga, e
  -- isso e deliberado: as duas asserções descrevem a mesma execucao por dois
  -- lados. (c) diz que nada mudou; (b) diz que o motor rodou inteiro. Uma sem a
  -- outra e metade da prova de PURGA-02.
  IF v_dom_z IS DISTINCT FROM v_dom_a THEN
    RAISE EXCEPTION 'P46P FAIL (b): ⊖ as contagens de dominio MUDARAM. antes=[%] depois=[%]. O motor rodou o corpo COMPLETO e a reversao NAO aconteceu — este e o unico modo de falha desta fase que e IRREVERSIVEL', v_dom_a, v_dom_z;
  END IF;

  IF v_c_carimbados <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (b): % item(ns) com desfecho de Storage/Postgres/Auth carimbado em ok ou falha depois de uma varredura em dry_run. Nada foi tentado fora do Postgres, e o Postgres foi revertido', v_c_carimbados;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (b): PURGA-02 — o laco chamou o MOTOR em % titulares; % de % itens com relato do terminador, % com as contagens por passo (o corpo COMPLETO executou e foi revertido); zero desfecho carimbado e as 5 contagens de dominio inalteradas [%]', v_c_eleg, v_b_com_marca, v_b_itens, v_b_corpo_cheio, v_dom_z;

  -- ── (i) O ITEM REGISTRA A POLÍTICA ─────────────────────────────────────────
  IF coalesce(v_c_itens, 0) = 0 THEN
    RAISE EXCEPTION 'P46P FAIL (i): ⊖ NAO-VACUIDADE — zero itens gravados. Uma asserção sobre o conteudo dos itens passa TRIVIALMENTE quando nao ha item nenhum, e elegiveis = 0 e o unico jeito de este arquivo ficar verde sem ter provado coisa alguma';
  END IF;

  IF v_i_nulos <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (i): % item(ns) com etapa, janela_meses_aplicada, ancora_origem ou ancora_em nulos', v_i_nulos;
  END IF;

  IF v_i_divergentes <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (i): % item(ns) gravaram uma janela que NAO bate a matriz viva daquela etapa, ou foram selecionados numa etapa FORA da allowlist (elegivel_purga = false). A primeira metade e o que impede o ledger de mentir sobre a politica aplicada; a segunda e PURGA-07 / D-46-19 medido sobre o resultado, e nao sobre o codigo', v_i_divergentes;
  END IF;

  IF v_i_pos < 2 THEN
    RAISE EXCEPTION 'P46P FAIL (i): ⊖ NAO-VACUIDADE — apenas % das fixtures pos1/pos2/pos3 apareceram entre os itens (esperado >= 2). Sem elas a cardinalidade de ancora_origem nao pode ser aferida, e a coluna passaria a ser observada num valor so', v_i_pos;
  END IF;

  IF v_i_origens < 2 THEN
    RAISE EXCEPTION 'P46P FAIL (i): ancora_origem foi observada em apenas % valor(es) distinto(s) entre pos1/pos2/pos3 (esperado >= 2). As tres fixtures foram construidas no plano 46-01 para exercitar degraus DIFERENTES da escada da data-ancora — pos1 pelo historico, pos2 por data_decisao_final, pos3 por updated_at. Um valor so significa que a escada colapsou num degrau e a coluna nao prova nada', v_i_origens;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (i): % itens com politica completa, janela batendo a matriz viva e etapa na allowlist; ancora_origem observada em % valores distintos entre as % fixtures positivas', v_c_itens, v_i_origens, v_i_pos;

  -- ── (idem) IDEMPOTÊNCIA DO DRY-RUN ─────────────────────────────────────────
  IF v_d_novas <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (idem): a segunda execucao em dry_run gravou % linha(s) de purga_execucoes (esperado exatamente 1). Duas execucoes tem de produzir DUAS linhas — o heartbeat conta execucoes, nao dias', v_d_novas;
  END IF;

  IF v_d_id IS NOT DISTINCT FROM v_c_id THEN
    RAISE EXCEPTION 'P46P FAIL (idem): a segunda execucao reusou a linha de cabecalho da primeira — o criterio de D-46-14 (>= 14 execucoes com ledger) contaria uma so';
  END IF;

  IF v_d_eleg IS DISTINCT FROM v_c_eleg THEN
    RAISE EXCEPTION 'P46P FAIL (idem): a segunda passada em dry_run selecionou % elegiveis contra % da primeira. A selecao tem de ser ESTAVEL sobre o mesmo estado: se ela caiu, o laco deixou itens ABERTOS e o claim anti-sobreposicao esta excluindo titulares que ele nao deveria; se ela subiu, o predicado nao e deterministico', v_d_eleg, v_c_eleg;
  END IF;

  IF v_d_itens IS DISTINCT FROM v_c_itens OR v_d_ver IS DISTINCT FROM 'dry_run' OR v_d_proc IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P46P FAIL (idem): a segunda passada divergiu (itens=% contra %, veredito=%, processados=%)', v_d_itens, v_c_itens, coalesce(v_d_ver,'NULL'), coalesce(v_d_proc,-1);
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (idem): duas passadas em dry_run, duas linhas de purga_execucoes, mesma selecao (% elegiveis / % itens nas duas), zero mutacao — a idempotencia foi OBSERVADA', v_d_eleg, v_d_itens;

  -- ── (claim) ⊖ TITULAR COM ITEM ABERTO NÃO É RE-SELECIONADO ─────────────────
  IF v_k_plantados <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (claim): ⊖ NAO-VACUIDADE — nao foi possivel plantar o item ABERTO (% linha(s) inseridas, esperado 1), porque a fixture pos1 (%) nao apareceu entre os itens do dry-run. Sem o item plantado, o NOT EXISTS anti-sobreposicao da varredura continua sendo DEAD CODE — nunca exercitado, do mesmo jeito que a excecao do Art. 20 era ate 2026-08-22', v_k_plantados, v_pos1;
  END IF;

  IF v_k_novas <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (claim): a terceira execucao gravou % linha(s) de purga_execucoes (esperado exatamente 1)', v_k_novas;
  END IF;

  IF v_k_eleg IS DISTINCT FROM v_c_eleg - 1 THEN
    RAISE EXCEPTION 'P46P FAIL (claim): com UM item aberto plantado para pos1, a passada seguinte selecionou % elegiveis (esperado %, ou seja um a menos). O claim anti-sobreposicao do Pitfall 6 NAO mordeu: efeitos podem se sobrepor sem que as EXECUCOES se sobreponham, e um titular que ficou a meio caminho entre Storage e Auth seria processado DE NOVO', v_k_eleg, v_c_eleg - 1;
  END IF;

  IF v_k_pos1 <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (claim): a passada seguinte gravou % item(ns) para pos1, o titular que tinha item ABERTO. O numero caiu mas o titular EXCLUIDO foi outro — a exclusao esta acontecendo pelo motivo errado', v_k_pos1;
  END IF;

  IF v_k_itens IS DISTINCT FROM v_k_eleg THEN
    RAISE EXCEPTION 'P46P FAIL (claim): a terceira passada reportou % elegiveis e gravou % itens', v_k_eleg, v_k_itens;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (claim): com item ABERTO plantado para pos1, a passada seguinte caiu de % para % elegiveis e NAO reselecionou pos1 — o NOT EXISTS anti-sobreposicao deixou de ser dead code', v_c_eleg, v_k_eleg;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- PLANO 46-03 — (j.1)(j.2)(j.3)(k)(l)
  -- Cada (j) julga as DUAS metades. A primeira ("nao aparece") sozinha nao prova
  -- nada; a segunda ("passa a estar") e a que demonstra que a ausencia era
  -- causada pela EXCECAO e nao pela data, pela etapa ou por a fixture ter sumido.
  -- ═══════════════════════════════════════════════════════════════════════════

-- (j.1) ⊖ `retencao_hold` PROTEGE — e o hold LIBERADO deixa de proteger (D-46-04)
  IF v_j1_ativos <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (j.1): ⊖ NAO-VACUIDADE — a candidatura % tem % linha(s) de retencao_hold ATIVA (liberado_em nulo; esperado exatamente 1). A migration 20260823000005 TEM de inserir essa linha: e obrigacao HERDADA do plano 46-01, cuja fixture (§5f) tentou inseri-la em 2026-08-22, nao conseguiu porque a tabela nao existia, e emitiu apenas um aviso. ENQUANTO ELA FALTAR, neg-hold e so mais uma candidatura elegivel e ESTA ASSERCAO PASSARIA POR VACUIDADE — o modo de falha exato que a Phase 46 existe para eliminar', v_cdt_hold, v_j1_ativos;
  END IF;

  IF v_j1_antes <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (j.1): a candidatura % APARECE em candidaturas_alem_da_janela() mesmo com hold ATIVO (% linha(s) no resultado, esperado 0). A clausula de D-46-04 nao mordeu: um registro sob obrigacao legal concorrente esta na fila da purga, e a purga nao tem como saber disso de outro jeito — sem essa clausula, o unico controle disponivel seria DESLIGAR A PURGA INTEIRA', v_cdt_hold, v_j1_antes;
  END IF;

  IF v_j1_liberados <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (j.1): a liberacao do hold afetou % linha(s) (esperado 1) — a 2ª metade da asserção nao pode ser medida', v_j1_liberados;
  END IF;

  IF v_j1_depois <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (j.1): ⊖ NAO-VACUIDADE, 2ª METADE — liberado o hold, a candidatura % NAO passa a estar em candidaturas_alem_da_janela() (% linha(s), esperado 1). Isso significa que a ausencia da 1ª metade NAO era causada pelo hold: ou a fixture nao esta mais ALEM DA JANELA, ou outra excecao a esta segurando, ou ela deixou de existir. Uma asserção que passa por um motivo que ela nao mediu e um FALSO VERDE', v_cdt_hold, v_j1_depois;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (j.1): com hold ATIVO a candidatura % esta FORA do conjunto elegivel; liberado o hold, ela passa a estar DENTRO — a excecao de D-46-04 morde, e a fixture estava ALEM DA JANELA o tempo todo', v_cdt_hold;

-- (j.2) ⊖ VAGA AINDA ABERTA protege — arquivada, deixa de proteger (D-46-03)
  IF v_j2_status IS DISTINCT FROM 'ativa' THEN
    RAISE EXCEPTION 'P46P FAIL (j.2): ⊖ NAO-VACUIDADE — a vaga % da candidatura % esta em status [%] (esperado ativa). A fixture neg-vaga do plano 46-01 existe justamente para que esta asserção tenha uma vaga ABERTA contra a qual medir; com a vaga ja fechada, "a candidatura nao aparece" seria verdade pelo motivo errado', coalesce(v_j2_vaga::text,'NULL'), v_cdt_vaga, coalesce(v_j2_status,'NULL');
  END IF;

  IF v_j2_antes <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (j.2): a candidatura % APARECE em candidaturas_alem_da_janela() com a vaga ainda ATIVA (% linha(s), esperado 0). Processo VIVO nao se apaga, mesmo com a data-ancora estourada — e a forma da clausula e o que torna isso fail-closed: o interior dela e o COMPLEMENTO da allowlist de estados fechados, entao ate um valor NOVO de status_vaga deveria PROTEGER', v_cdt_vaga, v_j2_antes;
  END IF;

  IF v_j2_depois <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (j.2): ⊖ NAO-VACUIDADE, 2ª METADE — arquivada a vaga, a candidatura % NAO passa a estar em candidaturas_alem_da_janela() (% linha(s), esperado 1). A ausencia da 1ª metade NAO era causada pela vaga aberta: ou a fixture nao esta mais alem da janela, ou outra excecao a segura', v_cdt_vaga, v_j2_depois;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (j.2): com a vaga em ativa a candidatura % esta FORA; arquivada a vaga, ela passa a estar DENTRO — a excecao de D-46-03 morde', v_cdt_vaga;

-- (j.3) ⊖ REVISAO DO ART. 20 EM ABERTO protege — respondida, deixa de proteger
  IF v_trg_back <> v_trg_off OR v_trg_rest <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (j.3): higiene de gatilhos — % desligados, % religados, % ainda DESLIGADOS com corpo que chama net.http_post em decisao_final/vagas/retencao_hold (esperado religar todos e restar 0). Deixar um despachante desligado em PROD e pior que o problema que o desligamento evitava: nenhuma notificacao sairia e ninguem saberia', v_trg_off, v_trg_back, v_trg_rest;
  END IF;

  IF v_j3_abertas <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (j.3): ⊖ NAO-VACUIDADE — a candidatura % tem % decisao(oes) com revisao do Art. 20 EM ABERTO (solicitada nao-nula e respondida nula; esperado exatamente 1). Sem a revisao aberta, "a candidatura nao aparece" seria verdade por outro motivo qualquer', v_cdt_art20, v_j3_abertas;
  END IF;

  IF v_j3_antes <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (j.3): a candidatura % APARECE em candidaturas_alem_da_janela() com revisao do Art. 20 EM ABERTO (% linha(s), esperado 0). Apagar a evidencia de um direito EM EXERCICIO e exatamente o defeito que o Art. 20 existe para impedir', v_cdt_art20, v_j3_antes;
  END IF;

  IF v_j3_respondidas <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (j.3): a resposta a revisao afetou % linha(s) (esperado 1) — a 2ª metade da asserção nao pode ser medida', v_j3_respondidas;
  END IF;

  IF v_j3_depois <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (j.3): ⊖ NAO-VACUIDADE, 2ª METADE — respondida a revisao, a candidatura % NAO passa a estar em candidaturas_alem_da_janela() (% linha(s), esperado 1). A ausencia da 1ª metade NAO era causada pela revisao aberta, e a excecao do Art. 20 pode estar passando por acidente', v_cdt_art20, v_j3_depois;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (j.3): com revisao ABERTA a candidatura % esta FORA; respondida a revisao, ela passa a estar DENTRO. % gatilho(s) de despacho desligados por criterio medido e religados', v_cdt_art20, v_trg_off;

-- (k) DEGRAU CORRETO QUANDO NAO HA DECISAO REGISTRADA (PURGA-07 / SC#4)
  IF v_k4_hist <> 0 OR v_k4_dec <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (k): ⊖ NAO-VACUIDADE — a fixture pos3 (%) DERIVOU: ela tem % linha(s) de historico_candidatura na etapa atual e % data_decisao_final preenchida (esperado 0 e 0). Ela existe para exercitar o degrau (3) da escada da data-ancora, e com historico ou data_decisao_final o degrau CORRETO passa a ser outro. ESTE ERRO E DA FIXTURE, NAO DO PREDICADO — a asserção abaixo mediria a coisa errada e daria diagnostico falso', v_cdt_pos3, v_k4_hist, v_k4_dec;
  END IF;

  IF v_k4_pred <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (k): MODO DE ERRO 1 — a candidatura % NAO esta em candidaturas_alem_da_janela() (% linha(s), esperado 1). Ela tem data_decisao_final NULA e nenhum historico, e o degrau (3) do COALESCE (updated_at) deveria classifica-la. Uma candidatura assim OMITIDA EM SILENCIO e o modo de falha que PURGA-07 nomeia: o sistema acredita ter politica de retencao funcionando enquanto classifica errado sem sinal nenhum. E a metade do SC#4 que uma contagem sozinha NAO responde', v_cdt_pos3, v_k4_pred;
  END IF;

  IF v_k4_origem IS DISTINCT FROM 'updated_at' THEN
    RAISE EXCEPTION 'P46P FAIL (k): MODO DE ERRO 2 — a candidatura % esta no conjunto mas veio classificada por ancora_origem = [%] (esperado updated_at). Ela nao tem historico nem data_decisao_final, entao qualquer outro degrau significa que a escada do COALESCE colapsou ou que o LATERAL passou a relatar um instante diferente do que o WHERE filtrou — e e assim que o ledger passa a MENTIR sobre por que a linha foi escolhida', v_cdt_pos3, coalesce(v_k4_origem, 'NULL');
  END IF;

  IF v_k4_itens <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (k): o titular de pos3 (%) tem % item(ns) no ledger do dry-run (esperado 1) — o predicado a classificou mas o ledger nao a registrou, e PURGA-06 exige que o registro exista', v_pos3, v_k4_itens;
  END IF;

  IF v_k4_item_origem IS DISTINCT FROM 'updated_at' THEN
    RAISE EXCEPTION 'P46P FAIL (k): o item de ledger do titular % gravou ancora_origem = [%] enquanto o predicado relatou [%]. Os dois TEM de sair da mesma expressao; divergir aqui e a prova de que a politica esta sendo recalculada em algum lugar', v_pos3, coalesce(v_k4_item_origem,'NULL'), coalesce(v_k4_origem,'NULL');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (k): pos3 (sem historico, sem data_decisao_final) ESTA no conjunto e foi classificada pelo degrau (3) — ancora_origem = updated_at no predicado E no item de ledger';

-- (l) ⊖ ETAPA FORA DA ALLOWLIST NAO ENTRA (D-46-19 / PURGA-07)
  IF v_l_antes <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (l): a candidatura % (etapa %) APARECE em candidaturas_alem_da_janela() (% linha(s), esperado 0). A allowlist de D-46-19 tem TRES estados terminais e este nao e um deles — uma candidatura em funil ATIVO entrou na fila da purga', v_cdt_etapa, v_etapa_fora, v_l_antes;
  END IF;

  IF v_l_allow IS DISTINCT FROM v_l_esperada THEN
    RAISE EXCEPTION 'P46P FAIL (l): a allowlist viva de config_retencao_etapa e [%] e o esperado e [%]. ⚠ A COMPARACAO E POR IGUALDADE DE CONJUNTO, E NAO POR CONTAGEM, DE PROPOSITO: uma contagem de 3 passaria em verde com AS TRES ETAPAS ERRADAS marcadas como elegiveis — que e o estado mais perigoso que esta asserção poderia deixar passar, porque o sistema apagaria gente em funil ativo acreditando ter uma politica funcionando', array_to_string(coalesce(v_l_allow, ARRAY[]::text[]), ', '), array_to_string(v_l_esperada, ', ');
  END IF;

  IF v_l_flip <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (l): marcar a etapa % como elegivel afetou % linha(s) da matriz (esperado 1) — a 2ª metade da asserção nao pode ser medida', v_etapa_fora, v_l_flip;
  END IF;

  IF v_l_depois <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (l): ⊖ NAO-VACUIDADE, 2ª METADE — marcada a etapa % como elegivel, a candidatura % NAO passa a estar em candidaturas_alem_da_janela() (% linha(s), esperado 1). A ausencia da 1ª metade NAO era causada pela allowlist: ou a fixture nao esta mais alem da janela, ou outra excecao a segura, ou a clausula m.elegivel_purga deixou de ser lida da MATRIZ e virou lista no codigo', v_etapa_fora, v_cdt_etapa, v_l_depois;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (l): a allowlist viva e EXATAMENTE [%]; a candidatura % em % esta FORA, e passa a estar DENTRO quando a etapa e marcada elegivel — a allowlist e DADO na matriz, nao lista no codigo', array_to_string(v_l_allow, ', '), v_cdt_etapa, v_etapa_fora;

-- (o) 46-04 · ⊖ O 4o RAMO DO GUARD RECUSA FORA DAS CONDICOES, E ACEITA DENTRO
  -- ⊖ NAO-VACUIDADE DO ALVO, ANTES DE TUDO: as quatro negativas so sao lidas
  -- corretamente porque o titular sintetico NAO existe.
  IF coalesce(v_o_alvo_ex, -1) <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (o): ⊖ NAO-VACUIDADE DO ALVO — existe(m) % linha(s) em candidatos com o uuid sintetico das negativas. Ele foi escolhido justamente por NAO existir: e isso que torna P0002 (candidato inexistente) o desfecho de um guard que AUTORIZOU, e 42501 o de um guard que RECUSOU. Com um candidato real ali, um guard defeituoso destruiria PII de verdade em vez de parar em P0002', v_o_alvo_ex;
  END IF;

  IF array_length(v_o_st, 1) IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION 'P46P FAIL (o): foram registradas % chamadas de controle (esperado 5). Um bloco que nao executou as cinco nao provou nada sobre o ramo novo', coalesce(array_length(v_o_st, 1), 0);
  END IF;

  -- ── As QUATRO recusas ─────────────────────────────────────────────────────
  IF v_o_st[1] IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P46P FAIL (o.1): com config_purga.modo = off e item ABERTO sob execucao em executando, a chamada de dry-run devolveu [%] em vez de 42501. O KILL SWITCH DE D-46-06 NAO AUTORIZA NENHUM DOS DOIS CAMINHOS, nem o reversivel — se ele autoriza o dry-run, "desligado" deixou de significar desligado. ⚠ [P0002] aqui significa que o guard AUTORIZOU e o motor seguiu adiante', coalesce(v_o_st[1], 'NULL');
  END IF;

  IF v_o_st[2] IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P46P FAIL (o.2a): ⛔ A ASSERCAO QUE VALE A DECISAO INTEIRA. Com config_purga.modo = dry_run, execucao em executando e item ABERTO, a chamada DESTRUTIVA (p_dry_run := false) devolveu [%] em vez de 42501. Um modo que nao seja live NAO AUTORIZA DESTRUICAO (D-46-18), e o escopo DUPLO de D-46-24 vale SO para o caminho reversivel. Este desfecho significa que as duas metades do 4o ramo deixaram de ser predicados separados e que a metade destrutiva HERDOU a permissividade da metade de leitura — que e literalmente a regressao que a obrigacao de aceite de D-46-24 existe para tornar impossivel', coalesce(v_o_st[2], 'NULL');
  END IF;

  IF v_o_st[4] IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P46P FAIL (o.3): com config_purga.modo = live e execucao em executando, mas SEM item aberto para aquele candidato_id, a chamada destrutiva devolveu [%] em vez de 42501. O ramo estaria autorizando por MODO em vez de por ALVO — e ai a purga vira instrumento de exclusao dirigida: bastaria estar em live para destruir a PII de qualquer pessoa', coalesce(v_o_st[4], 'NULL');
  END IF;

  IF v_o_st[5] IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P46P FAIL (o.4): com item ABERTO mas execucao em situacao = concluida, a chamada destrutiva devolveu [%] em vez de 42501. Um item aberto pendurado numa execucao ja fechada e um VESTIGIO, e vestigio nao autoriza — o ramo tem de exigir o estado que o motor produz AGORA, nao a marca de que ele existiu um dia', coalesce(v_o_st[5], 'NULL');
  END IF;

  -- ── As DUAS aceitacoes — sem elas, (o) provaria so que a funcao recusa tudo ─
  IF v_o_st[3] IS DISTINCT FROM 'P0002' THEN
    RAISE EXCEPTION 'P46P FAIL (o.2b): ⊖ O OUTRO LADO DO PAR. Sob EXATAMENTE o mesmo estado da chamada (o.2a) — mesmo cerco, mesma execucao, mesmo item —, mudando SO a intencao para dry-run, a chamada devolveu [%] em vez de P0002. P0002 (CANDIDATO_INEXISTENTE) e a prova de que o guard AUTORIZOU e o motor seguiu ate nao achar o titular sintetico. [42501] aqui significa que o caminho de DRY-RUN esta sendo recusado sob modo dry_run, e entao o laco da varredura nao consegue rodar: os 14 dias de dry_run provariam ZERO sobre o caminho do delete, que e o dry-run decorativo do SC#1 e a mesma classe do P39/CR-02. ⚠ PROVAR SO RECUSA E O MODO DE FALHA No 3 DOS SETE PORTOES DA PHASE 45', coalesce(v_o_st[3], 'NULL');
  END IF;

  IF v_o_pos_st IS DISTINCT FROM 'P45DR' THEN
    RAISE EXCEPTION 'P46P FAIL (o.5): a chamada POSITIVA sobre o titular REAL pos1, com as quatro condicoes satisfeitas e p_dry_run := true, devolveu [%] em vez de P45DR. [42501] significa que o ramo recusa mesmo dentro das condicoes que ele proprio define, e a purga nunca vai conseguir fazer o dry-run; [SEM-EXCECAO] significa que o terminador do motor sumiu e a transacao teria COMMITADO o corpo destrutivo', coalesce(v_o_pos_st, 'NULL');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (o): as DUAS metades do 4o ramo asseridas SEPARADAMENTE. Recusas 42501 em: modo off com item aberto (%); DESTRUTIVO sob dry_run (%); live sem item aberto (%); item aberto sob execucao concluida (%). Aceitacoes: dry-run sob dry_run no MESMO estado da recusa destrutiva -> % (o guard autorizou e o motor parou por nao haver candidato); e o titular REAL pos1 em dry-run -> % (o corpo COMPLETO executou e foi revertido)', v_o_st[1], v_o_st[2], v_o_st[4], v_o_st[5], v_o_st[3], v_o_pos_st;

  RAISE NOTICE 'P46P TEARDOWN ok: envelope revertido — config_purga.modo voltou a [%], e as % linhas de purga_execucoes gravadas por este smoke NAO existem (elas inflariam o criterio de >= 14 execucoes de D-46-14)', coalesce(v_modo_antes, 'NULL'), v_f_novas + v_c_novas + v_d_novas + v_k_novas + 1;
END $envelope$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE v_n int; v_esperado int := 13;  -- 6 (46-02) + 5 (46-03) + 2 (46-04: b, o)
BEGIN
  v_n := coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P46P FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde. Se o numero veio 0 num run que emitiu NOTICEs de PASS, o contador foi revertido junto com o envelope: os set_config TEM de ficar DEPOIS do RAISE P46B0, nunca dentro dele', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'P46P RESUMO: % asseracoes PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $z$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
