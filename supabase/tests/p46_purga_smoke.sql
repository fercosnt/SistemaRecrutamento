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
-- ACRESCENTOU (j.1), (j.2), (j.3), (k) e (l); o plano 46-04 acrescentou (b) e
-- (o), (o.6), (o.7) e (p); o plano 46-05 acrescentou (q.1) a (q.5); o plano
-- 46-06 acrescentou (a), (g), (m) e (n); e o plano 46-07 FECHOU o arquivo com as
-- duas ultimas letras, (d) e (e). O RESUMO (z) subiu junto a cada plano (era 6,
-- depois 11, depois 16, depois 21, depois 25, agora é 27 — o total final).
-- Um arquivo por fase, e não um por plano: as asserções desta fase leem umas o
-- estado das outras.
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
-- GATE VERDE = o contador `smoke46p.pass` bate **27** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial acumularia < 27 e o RESUMO reprova ALTO.
-- ⚠ LER O CONTADOR É OBRIGAÇÃO DE QUEM RODA: "não levantou" nunca foi "as
-- asserções rodaram".
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
-- AS ASSERÇÕES — 46-02 (6), 46-03 (5), 46-04 (5). Doze são NEGATIVAS e duas são ⊕ POSITIVAS.
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
--   (o.6)   ⊖ **BL-02** — chamador COM SESSÃO (`rh` e `candidato`) NÃO entra pelo
--           ramo da purga, mesmo com item aberto sob `live`. É o único bloco do
--           arquivo que carimba claims, e ele as limpa em seguida.
--   (o.7)   ⊕ **O PAR de (o.6)** — mesmo estado, sessão NULA: a metade DESTRUTIVA
--           do 4º ramo **AUTORIZA**. Sem ela, (o.6) prova só que algo recusou, e
--           `v_purga_live = TRUE` não seria provado em lugar nenhum.
--   (p)     ⊖ O 3º ramo de `plano_exclusao_titular` (Blocker B-02) recusa sob
--           `off` e SEM ALVO, aceita com item aberto, e o plano devolvido não
--           carrega PII — medido na função que o motor CHAMA no PASSO 0.
--   (i)     O item registra a POLÍTICA, e não só a contagem.
--   (idem)  A idempotência do dry-run é OBSERVADA, não presumida.
--   (claim) ⊖ Titular com item ABERTO não é re-selecionado (Pitfall 6).
--   (j.1)   ⊖ `retencao_hold` protege — e o hold LIBERADO deixa de proteger.
--   (j.2)   ⊖ Vaga ainda aberta protege — e a vaga arquivada deixa de proteger.
--   (j.3)   ⊖ Revisão do Art. 20 em aberto protege — respondida, deixa de proteger.
--   (k)     Degrau correto quando não há decisão registrada (PURGA-07 / SC#4).
--   (l)     ⊖ Etapa fora da allowlist não entra (D-46-19) — e a allowlist é
--           aferida por IGUALDADE DE CONJUNTO, jamais por contagem nua.
--   (q.1-5) 46-05 · o ciclo de vida do item — cinco recusas, e DUAS aceitações.
--   (a)     46-06 · PURGA-01 — o agendamento `purga-retencao-sweep` existe UMA
--           vez, às 03:00 UTC, ativo, com `md5(command)` PINADO contra a
--           migration; e os três agendamentos herdados continuam existindo, por
--           igualdade exata de `jobname`.
--   (g)     46-06 · ⊖ PURGA-05 / D-46-08 — o CONTRATO DE FRONTEIRA do cap, com os
--           três pontos: `elegiveis = cap` RODA · `elegiveis = cap - 1` RODA ·
--           `elegiveis = cap + 1` ABORTA. E o aborto é integral: zero item, zero
--           requisição enfileirada.
--   (m)     46-06 · RETEN-05 sobre fixture RETRODATADA — a notificação além da
--           janela é apagada, a de dentro sobrevive, e ⊖ nenhuma candidatura,
--           nenhum candidato, nenhuma linha de `historico_candidatura` e nenhuma
--           de `decisao_final` foi apagada na mesma execução. Mais ⊕ a prova
--           DURÁVEL de que o dispatch do ramo `live` rodou.
--   (n)     46-06 · ⊖ O `COMMENT` VIVO de `notificacoes_enviadas` deixou de
--           declarar retenção sem prazo E passou a nomear a janela e a âncora.
--   (d)     46-07 · ⊖⊕ O PORTÃO DO FLIP — `salvar_config_purga` RECUSA
--           `dry_run → live` em CINCO casos, um critério de cada vez (sem
--           confirmação · 13 dias · 13 execuções · zero elegíveis · matriz em
--           seed), cada recusa nomeando SÓ o critério que faltou; ⊕ ACEITA com os
--           cinco satisfeitos, na fronteira de 14 dias EXATOS; e ⊖⊕ a transição
--           para `off` passa mesmo com os três critérios falhando.
--   (e)     46-07 · A mudança de modo grava EXATAMENTE UMA linha em
--           `logs_auditoria` na MESMA transação, com ator resolvido no servidor,
--           severidade no topo do vocabulário e os dois estados diferentes — e a
--           linha DESAPARECE com o rollback, que é a prova estrutural.
--   (z)     RESUMO — exige o total exato de 27 PASS.
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
-- ⚠⚠ HIGIENE DE CLAIMS, E ELA GANHOU UMA EXCEÇÃO NOMEADA NO 46-04. Este arquivo
-- roda com `auth.uid()` NULO — como o cron —, e foi essa disciplina que revelou o
-- Blocker B-02. **O único bloco que carimba `request.jwt.claims` é (o.6)**, porque
-- o caso que ele mede ("chamador COM sessão sob item aberto em `live`") é
-- inobservável sem elas; e ele **limpa as claims imediatamente depois**, antes de
-- (p). Um vazamento de claim para as asserções seguintes as faria passar por PAPEL
-- em vez de pelo ramo da purga — o falso verde que (o.6) existe para eliminar.
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
  v_p_pii_como text; -- RD4-10: COMO a PII foi encontrada — o portao tem de nomear o achado
  v_p_err  text;   -- RD4-09: a MENSAGEM do erro de (p.3), nao so o SQLSTATE
  v_p_ctx  text;   -- RD4-09: e o CONTEXTO, que diz em que linha ele nasceu
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
  v_c_valores text;   -- RD3-05: QUAL valor foi encontrado, e nao so quantos

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
  v_o_pos_ret  jsonb;
  v_o_pos_tomb boolean;
  v_o_alvo_ex  bigint;
  -- (o.6) BL-02 · o unico caso que precisa de CLAIMS para existir
  v_o6_rh      text;
  v_o6_cand    text;
  v_o6_uid     bigint;
  v_o6_uid2    bigint;   -- RD2-10: a 2a perna precisa da PROPRIA nao-vacuidade
  -- (o.7) RD2-02 · o CONTROLE POSITIVO do par de (o.6)
  v_o7_semsess text;

  -- (p) 46-04 / B-02 · o 3o ramo de `plano_exclusao_titular`, medido DIRETAMENTE.
  -- ⚠ Ela e medida em separado de (o) de proposito: (o) mede o guard do MOTOR, e o
  --   motor so alcanca esta funcao DEPOIS de passar por aquele guard. Se as duas
  --   fossem uma so assercao, um defeito aqui apareceria como "o motor recusou" e
  --   mandaria a proxima pessoa depurar o arquivo errado — que foi literalmente o
  --   que quase aconteceu com o Blocker B-02.
  v_p_st       text[] := ARRAY[]::text[];
  v_p_plano    jsonb;
  v_p_pii      int := 0;
  v_p_chave    text;
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
    -- passo pode estar carimbado com desfecho algum.
    -- ⚠⚠ RD3-05 · A NEGATIVA E POR COMPLEMENTO, E NAO POR ENUMERACAO. A versao
    --   anterior perguntava `IN ('ok','falha')` — uma LISTA DE INCLUSAO sobre um
    --   vocabulario que a migration `20260823000009` acabou de alargar de quatro
    --   para cinco valores. Um item que aparecesse com `desfecho_* =
    --   'desconhecido'` — que e, por definicao, uma asserção sobre um passo que
    --   NAO e `pendente` — nao seria contado, e esta negativa passaria por VERDE
    --   afirmando "nada foi tentado". O defeito era latente (nenhum caminho de
    --   dry-run produz esse valor hoje), mas a FORMA e a que este projeto reprova
    --   por escrito: enumerar um vocabulario ABERTO num portao.
    -- ⚠ As DUAS ausencias-de-tentativa legitimas sao `pendente` (ainda vou
    --   tentar) e `nao_aplicavel` (nada havia a fazer — o valor que o proprio laco
    --   de dry-run escreve). Qualquer OUTRA coisa e uma afirmacao sobre um passo,
    --   e em dry_run nenhum passo foi dado. Escrito assim, o portao sobrevive ao
    --   proximo alargamento do vocabulario sem que ninguem precise lembrar dele.
    -- ⚠ E a negacao e por `IS DISTINCT FROM`, e nao por pertencimento a conjunto:
    --   as tres colunas sao `NOT NULL DEFAULT 'pendente'` hoje, mas escrever a
    --   forma NULL-cega num arquivo cujo tema e "a forma banida falha ABERTO"
    --   seria pedir para alguem copia-la para um lugar onde ela morde.
    SELECT count(*), coalesce(string_agg(DISTINCT x.v, ', '), '<nenhum>')
      INTO v_c_carimbados, v_c_valores
      FROM public.purga_execucao_itens i
      CROSS JOIN LATERAL (VALUES (i.desfecho_storage), (i.desfecho_postgres), (i.desfecho_auth)) AS x(v)
     WHERE i.execucao_id = v_c_id
       AND x.v IS DISTINCT FROM 'pendente'
       AND x.v IS DISTINCT FROM 'nao_aplicavel';

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
      v_o_st := v_o_st || 'SEM-EXCECAO'::text;
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
      v_o_st := v_o_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_o_st := v_o_st || SQLSTATE;
    END;

    -- 2b · DRY-RUN sob `dry_run`, MESMO ESTADO -> ACEITO (chega ao motor: P0002)
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, true);
      v_o_st := v_o_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_o_st := v_o_st || SQLSTATE;
    END;

    -- ── CASO 3 · cerco em `live`, mas SEM item aberto -> RECUSA ───────────────
    UPDATE public.config_purga SET modo = 'live';
    UPDATE public.purga_execucoes SET modo_vigente = 'live' WHERE id = v_o_exec;
    UPDATE public.purga_execucao_itens SET concluido_em = pg_catalog.now() WHERE id = v_o_item;
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, false);
      v_o_st := v_o_st || 'SEM-EXCECAO'::text;
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
      v_o_st := v_o_st || 'SEM-EXCECAO'::text;
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

    -- ⚠⚠ HI-04 do `46-REVIEW.md` — A VERSAO ANTERIOR DESTE BLOCO USAVA `PERFORM` E
    --   TRATAVA O RETORNO NORMAL COMO O PIOR DEFEITO POSSIVEL. Mas o dry-run tem
    --   DUAS terminacoes contratadas (WR-05), e a `20260823000007` — escrita pelo
    --   MESMO plano, no mesmo dia — implementa a discriminacao de proposito:
    --   `P45DR` numa linha VIVA, e retorno normal com `resultado='ja_anonimizado'`
    --   numa linha que JA e tombstone. Depois do primeiro `live`, `pos1` volta a
    --   ser selecionado (ERASE-08 preserva as linhas) e o portao ficaria VERMELHO
    --   dizendo "o terminador sumiu e a transacao teria COMMITADO" — falso, e o
    --   padrao que o CLAUDE.md §"Portoes" nomeia: reprova trabalho correto com
    --   diagnostico FALSO. Seria a 5a ocorrencia desta forma na fase.
    --
    -- ⚠ E O CONSERTO NAO E "ACEITAR AS DUAS E PRONTO" — isso afrouxaria o portao.
    --   O estado de `pos1` e MEDIDO ANTES, pelo mesmo predicado de reconhecimento
    --   que o motor usa (CR-06: igualdade com a sentinela derivada do id, mais o
    --   cinto de `user_id` severado e `data_nascimento` em 1900 — nunca padrao
    --   sobre `email`, que o usuario escreve). Com o estado medido, a assercao
    --   exige a terminacao EXATA que aquele estado obriga: se `pos1` esta viva,
    --   so `P45DR` passa; se ja e tombstone, so o retorno `ja_anonimizado` passa.
    --   O portao continua mordendo nos dois sentidos e deixa de ter um dia em que
    --   ele fica vermelho sozinho.
    SELECT (c.email = 'anonimizado+' || c.id::text || '@invalido.local'
            AND c.user_id IS NULL
            AND c.data_nascimento = DATE '1900-01-01')
      INTO v_o_pos_tomb
      FROM public.candidatos c WHERE c.id = v_pos1;

    BEGIN
      SELECT public.anonimizar_candidato(v_pos1, true) INTO v_o_pos_ret;
      v_o_pos_st := CASE
                      WHEN (v_o_pos_ret ->> 'resultado') = 'ja_anonimizado'
                        THEN 'RETORNO-ja_anonimizado'
                      ELSE 'SEM-EXCECAO'
                    END;
    EXCEPTION WHEN OTHERS THEN
      v_o_pos_st := SQLSTATE;
    END;

    -- ══ (o.6) BL-02 · ⊖ CHAMADOR **COM SESSAO** NAO ENTRA PELO RAMO DA PURGA ══
    -- ⚠⚠ E ESTE O CASO QUE O CODE REVIEW ENCONTROU E QUE NENHUMA ASSERCAO VIA.
    --   O 4o ramo era propriedade apenas do ALVO e do CERCO: nao mencionava o
    --   chamador. Enquanto houvesse item aberto sob execucao em `live`, as metades
    --   (b) e (c) — as duas UNICAS que restringem a destruicao — ficavam
    --   desligadas PARA TODO MUNDO, e qualquer usuario logado que alcancasse a
    --   funcao pelo GRANT a `authenticated` destruiria aquele titular FORA da
    --   ordem Storage -> Postgres -> Auth, orfanando o curriculo de forma
    --   irrecuperavel (CR-01, cenario 2).
    --
    -- ⚠ POR QUE ELE ERA INOBSERVAVEL, E A LICAO E DESCONFORTAVEL: este arquivo
    --   NUNCA carimba `request.jwt.claims`, e essa higiene esta CERTA — e ela que
    --   faz o smoke rodar com `auth.uid()` NULO, como o cron, e foi ela que
    --   revelou o Blocker B-02. Mas ela tem um efeito colateral: torna invisivel
    --   exatamente o caso "chamador COM sessao". A resposta nao e abandonar a
    --   higiene; e carimbar claims **num bloco proprio, escopado, que as limpa em
    --   seguida** — e so para o caso que precisa delas.
    --
    -- ⚠ ZERO RISCO DE DESTRUICAO, e por construcao: o alvo continua sendo o uuid
    --   SINTETICO. Se o guard recusar (o correto) vem 42501; se um guard
    --   defeituoso autorizasse, o motor pararia em P0002 sem mutar coluna alguma.
    --   Os dois papeis testados sao os dois que o CR-01 nomeia: `rh` (cenario 2) e
    --   `candidato` (o titular alheio).
    UPDATE public.config_purga SET modo = 'live';
    UPDATE public.purga_execucoes SET situacao = 'executando', modo_vigente = 'live'
     WHERE id = v_o_exec;
    UPDATE public.purga_execucao_itens SET concluido_em = NULL WHERE id = v_o_item;

    -- ⚠ O IDIOMA E O DE (C2) DO `p45_motor_exclusao_smoke.sql:1571-1573`, VERBATIM,
    --   inclusive a limpeza de `request.jwt.claim.sub`: aquele portao carimba
    --   claims em PROD e funciona, e copiar a forma que ja e exercitada e melhor
    --   que inventar uma segunda.
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', gen_random_uuid()::text,
                        'app_metadata', json_build_object('role', 'rh'))::text, false);
    PERFORM set_config('request.jwt.claim.sub', '', false);
    SELECT count(*) INTO v_o6_uid FROM (SELECT auth.uid() AS u) s WHERE s.u IS NOT NULL;
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, false);
      v_o6_rh := 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o6_rh := SQLSTATE;
    END;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', gen_random_uuid()::text,
                        'app_metadata', json_build_object('role', 'candidato'))::text, false);
    PERFORM set_config('request.jwt.claim.sub', '', false);
    -- ⚠ RD2-10: a nao-vacuidade e RE-MEDIDA para a segunda perna. Se a troca de
    --   claims falhasse aqui, esta chamada rodaria com auth.uid() NULO — ou seja,
    --   repetiria (o.2a) e passaria por VERDE medindo o caso errado.
    SELECT count(*) INTO v_o6_uid2 FROM (SELECT auth.uid() AS u) s WHERE s.u IS NOT NULL;
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, false);
      v_o6_cand := 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o6_cand := SQLSTATE;
    END;

    -- ⚠ AS CLAIMS SAO LIMPAS AQUI, e nao no fim: tudo o que vem depois — inclusive
    -- (p) — depende de `auth.uid()` voltar a ser NULO. Um vazamento de claim para
    -- as asserções seguintes as faria passar por PAPEL e nao pelo ramo da purga,
    -- que e precisamente o falso verde que este bloco existe para eliminar.
    PERFORM set_config('request.jwt.claims', '', false);
    PERFORM set_config('request.jwt.claim.sub', '', false);

    -- ══ (o.7) ⊕ CONTROLE POSITIVO DO PAR DE (o.6) — RD2-02 ═══════════════════
    -- ⚠⚠ SEM ESTA CHAMADA, `v_purga_live = TRUE` NAO E PROVADO EM LUGAR NENHUM
    --   DESTE ARQUIVO. O inventario das sete chamadas anteriores mostrou que a
    --   metade DESTRUTIVA do 4o ramo — a que o 46-06 inteiro vai depender — so
    --   aparecia em casos que RECUSAM. Provar so recusa e o **modo de falha no 3
    --   dos sete portoes da Phase 45**, e e o mesmo argumento que este arquivo ja
    --   usa para justificar (o.2b) na metade de dry-run.
    --
    -- ⚠ E O EFEITO SOBRE (o.6) E IMEDIATO: sem o par, (o.6) conclui "o guard
    --   recusou", nunca "o guard recusou PORQUE o chamador tem sessao". Se o
    --   estado montado acima deixasse de valer — o item nao reabrir, a execucao
    --   sair de `executando`, alguem encostar na fixture —, (o.6) ficaria VERDE
    --   com o BL-02 de volta. **O par positivo e o que converte "recusou" em
    --   "recusou por este motivo".**
    --
    -- ESTADO: identico ao de (o.6) — cerco `live`, execucao `executando`/`live`,
    -- item ABERTO para o alvo sintetico. Muda UMA coisa: a sessao acabou de ser
    -- limpa. E tao seguro quanto (o.2b): o alvo nao existe em `candidatos`, entao
    -- se o guard autoriza (o correto) o motor para em `P0002` sem mutar coluna.
    BEGIN
      PERFORM public.anonimizar_candidato(v_o_sint, false);
      v_o7_semsess := 'SEM-EXCECAO';
    EXCEPTION WHEN OTHERS THEN
      v_o7_semsess := SQLSTATE;
    END;

    -- Teardown de (o): fecha o item sintetico e devolve o cerco a `dry_run`.
    -- ⚠ `v_o_item_pos` (o de `pos1`) fica ABERTO DE PROPOSITO — (p.3) depende dele.
    UPDATE public.config_purga SET modo = 'dry_run';
    UPDATE public.purga_execucoes SET modo_vigente = 'dry_run' WHERE id = v_o_exec;
    UPDATE public.purga_execucao_itens SET concluido_em = pg_catalog.now() WHERE id = v_o_item;

    -- ══ (p) 46-04 / B-02 · O 3o RAMO DE `plano_exclusao_titular`, DIRETO ══════
    -- ⚠ POR QUE ESTA ASSERCAO EXISTE SEPARADA DE (o): o motor CHAMA esta funcao no
    --   PASSO 0, e ela tem guard PROPRIO. Enquanto ele nao tinha o 3o ramo, o cron
    --   era autorizado pelo guard do motor e recusado com 42501 TRES LINHAS
    --   DEPOIS, aqui dentro — e o sintoma que chegava ao ledger dizia apenas "o
    --   titular falhou". Medir esta funcao DIRETAMENTE e o que faz o diagnostico
    --   apontar para o arquivo certo.
    -- ⚠ O estado ainda e o do CASO 5: execucao `executando` em `dry_run`, item
    --   ABERTO para pos1, cerco em `dry_run`. E deliberado — e exatamente o estado
    --   em que o laco de dry-run de 14 dias vai rodar.

    -- (p.1) ⊖ cerco em `off` -> RECUSA. O kill switch tambem fecha a LEITURA.
    UPDATE public.config_purga SET modo = 'off';
    BEGIN
      PERFORM public.plano_exclusao_titular(v_pos1);
      v_p_st := v_p_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_p_st := v_p_st || SQLSTATE;
    END;

    -- (p.2) ⊖ cerco em `dry_run`, mas titular SEM item aberto -> RECUSA.
    -- ⚠ E ESTA A METADE QUE PROVA QUE O RAMO EXIGE O **ALVO**, e nao so o modo.
    --   Sem ela, "estar numa purga" autorizaria ler o plano de qualquer pessoa — e
    --   esta funcao devolve CONTAGENS DE PII POR TITULAR.
    UPDATE public.config_purga SET modo = 'dry_run';
    BEGIN
      PERFORM public.plano_exclusao_titular(v_pos2);
      v_p_st := v_p_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_p_st := v_p_st || SQLSTATE;
    END;

    -- (p.3) ACEITA o titular COM item aberto, sob o mesmo cerco -> plano devolvido.
    BEGIN
      v_p_plano := public.plano_exclusao_titular(v_pos1);
      v_p_st    := v_p_st || 'OK'::text;
    EXCEPTION WHEN OTHERS THEN
      -- ⚠⚠ RD4-09 · CAPTURAR A MENSAGEM, E NAO SO O SQLSTATE. A versao anterior
      --   guardava apenas `SQLSTATE` e a asserção abaixo narrava, por texto FIXO,
      --   que um erro aqui significa "B-02 de pe / a 20260823000008 nao foi
      --   aplicada". Quando a `008` ESTAVA aplicada e o erro real foi `22P02`, o
      --   portao acusou a causa errada com total confianca — a mesma familia de
      --   HI-04, RD3-01 e RD4-01, agora no DIAGNOSTICO em vez de na medicao.
      --   Um portao que erra a causa custa mais caro que um que so diz "falhou":
      --   ele manda o proximo leitor investigar o arquivo errado.
      GET STACKED DIAGNOSTICS v_p_err = MESSAGE_TEXT, v_p_ctx = PG_EXCEPTION_CONTEXT;
      v_p_st    := v_p_st || SQLSTATE;
      v_p_plano := NULL;
    END;

    -- ⊖ E O PLANO DEVOLVIDO NAO PODE CARREGAR PII. O que a Saida A ampliou foi
    -- quem LE contagens; se o jsonb trouxesse nome, e-mail, CPF, telefone,
    -- endereco ou data de nascimento, a ampliacao teria outro tamanho e a decisao
    -- do operador teria sido tomada sobre uma premissa falsa.
    --
    -- ⚠⚠ RD4-10 · A VERSAO ANTERIOR MEDIA SO O **NOME DA CHAVE**, e por isso fazia
    --   as DUAS coisas erradas ao mesmo tempo:
    --   · REPROVAVA trabalho correto com o diagnostico mais caro deste arquivo.
    --     `scrub_ledger_email` termina em `_email` e casava o padrao — mas e o NOME
    --     DE UM PASSO ("limpar a coluna de e-mail do ledger"), e o valor dela e um
    --     objeto descritor. Medido em 2026-08-23: o `nome_completo`, o `email`, o
    --     `cpf` e o `celular` REAIS do titular NAO aparecem no documento, e nao ha
    --     padrao de e-mail, CPF nem telefone em lugar nenhum dele. O portao mandava
    --     o operador **retomar a decisao do B-02** por causa de um nome de passo.
    --     OITAVA ocorrencia da familia "portao que reprova trabalho correto com
    --     diagnostico falso" nesta fase.
    --   · E NAO MEDIA O QUE DIZ MEDIR. Um valor de PII sob uma chave de nome inocente
    --     — `{"amostra": "fulano@x.com"}` — passava VERDE. O nome da chave sempre foi
    --     um PROXY, e o proxy nao cobria o caso que interessa.
    --
    -- ⚠ AS DUAS METADES DO CONSERTO, e as duas sao necessarias:
    --   (1) chave cujo NOME casa PII so conta se o VALOR dela for ESCALAR. Isso e
    --       ESCOPO, e nao fotografia: a estrutura do plano e "uma chave por passo,
    --       valor objeto"; uma chave de nome `email` com valor STRING seria um
    --       e-mail, com valor OBJETO e um passo. Se o formato do plano mudar para
    --       escalares, o portao volta a morder sozinho.
    --   (2) o DOCUMENTO INTEIRO e varrido por PADRAO de valor — e-mail, CPF de 11
    --       digitos, telefone de 10-11 — e tambem pelos valores LITERAIS do proprio
    --       titular lidos de `candidatos`. Esta metade nao existia.
    IF v_p_plano IS NOT NULL THEN
      FOR v_p_chave IN SELECT jsonb_object_keys(v_p_plano) LOOP
        IF v_p_chave ~ '(^|_)(nome|email|cpf|telefone|celular|endereco|nascimento)(_|$)'
           AND jsonb_typeof(v_p_plano -> v_p_chave) IN ('string', 'number') THEN
          v_p_pii := v_p_pii + 1;
          v_p_pii_como := coalesce(v_p_pii_como || ', ', '') || 'chave escalar ' || v_p_chave;
        END IF;
      END LOOP;

      -- (2) o documento inteiro, por PADRAO de valor
      IF v_p_plano::text ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' THEN
        v_p_pii := v_p_pii + 1;
        v_p_pii_como := coalesce(v_p_pii_como || ', ', '') || 'endereco de e-mail no documento';
      END IF;
      IF v_p_plano::text ~ '[^0-9][0-9]{11}[^0-9]' THEN
        v_p_pii := v_p_pii + 1;
        v_p_pii_como := coalesce(v_p_pii_como || ', ', '') || 'sequencia de 11 digitos (CPF)';
      END IF;

      -- (2b) e os valores LITERAIS do proprio titular — o teste mais direto que existe
      FOR v_p_chave IN
        SELECT x.v FROM public.candidatos c
        CROSS JOIN LATERAL (VALUES (c.nome_completo), (c.email), (c.cpf), (c.celular)) AS x(v)
        WHERE c.id = v_pos1 AND x.v IS NOT NULL AND length(x.v) >= 5
      LOOP
        IF position(v_p_chave in v_p_plano::text) > 0 THEN
          v_p_pii := v_p_pii + 1;
          v_p_pii_como := coalesce(v_p_pii_como || ', ', '') || 'valor literal do titular';
        END IF;
      END LOOP;
    END IF;

    -- Teardown de (o) e (p)
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
    RAISE EXCEPTION 'P46P FAIL (c): ⊖ % desfecho(s) do dry-run estao carimbados com valor que NAO e ausencia-de-tentativa — encontrados: [%]. Em dry_run NADA foi tentado, e dizer ok e a mentira mais cara possivel neste sistema: ela faria o ledger afirmar uma destruicao que nao houve, ou esconder uma que houve. ⚠ A pergunta e por COMPLEMENTO (tudo que nao e pendente nem nao_aplicavel), entao ela pega tambem valores que o vocabulario ganhar depois (RD3-05)', v_c_carimbados, v_c_valores;
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
    RAISE EXCEPTION 'P46P FAIL (b): % desfecho(s) carimbados com valor que NAO e ausencia-de-tentativa depois de uma varredura em dry_run — encontrados: [%]. Nada foi tentado fora do Postgres, e o Postgres foi revertido', v_c_carimbados, v_c_valores;
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

  -- ⚠ A terminacao EXIGIDA e a que o estado MEDIDO de pos1 obriga (HI-04).
  IF v_o_pos_st IS DISTINCT FROM (CASE WHEN coalesce(v_o_pos_tomb, false)
                                       THEN 'RETORNO-ja_anonimizado'
                                       ELSE 'P45DR' END) THEN
    RAISE EXCEPTION 'P46P FAIL (o.5): a chamada POSITIVA sobre o titular REAL pos1, com as quatro condicoes satisfeitas e p_dry_run := true, devolveu [%]. pos1 esta tombstone? [%] — e com esse estado a UNICA terminacao contratada aceitavel era [%]. Leitura dos desfechos: [42501] = o ramo recusa DENTRO das condicoes que ele proprio define, e a purga nunca vai conseguir fazer o dry-run; [SEM-EXCECAO] = o terminador do motor sumiu e a transacao teria COMMITADO o corpo destrutivo; [RETORNO-ja_anonimizado] sobre uma linha VIVA = o reconhecimento da sentinela ficou amplo demais e o motor esta declarando anonimizado quem nao esta (CR-06); [P45DR] sobre uma linha que JA e tombstone = o ramo de idempotencia por ESTADO parou de devolver antes do terminador, e o motor voltou a mutar quem ja estava anonimizado',
      coalesce(v_o_pos_st, 'NULL'),
      coalesce(v_o_pos_tomb::text, 'NULL'),
      CASE WHEN coalesce(v_o_pos_tomb, false) THEN 'RETORNO-ja_anonimizado' ELSE 'P45DR' END;
  END IF;

  -- ── (o.6) BL-02 · ⊖ CHAMADOR COM SESSAO NAO ENTRA PELO RAMO DA PURGA ──────
  -- ⊖ NAO-VACUIDADE PRIMEIRO: se as claims nao tivessem tomado efeito, `auth.uid()`
  -- continuaria NULO e o teste mediria o caso errado — o mesmo caso de (o.2a).
  IF coalesce(v_o6_uid, 0) <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (o.6): ⊖ NAO-VACUIDADE — as claims carimbadas NAO tomaram efeito e auth.uid() continua NULO. Este bloco existe justamente para medir o chamador COM sessao; sem as claims ele repete (o.2a) e o caso do BL-02 volta a ser INOBSERVAVEL';
  END IF;

  IF v_o6_rh IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P46P FAIL (o.6/rh): ⛔ BL-02 DE VOLTA. Com item ABERTO sob execucao em live e o cerco em live, um chamador COM SESSAO e papel rh chamou o caminho DESTRUTIVO e obteve [%] em vez de 42501. O 4o ramo voltou a ser propriedade apenas do ALVO e do CERCO, sem mencionar o chamador — e enquanto a janela durar, as metades (b) e (c) ficam desligadas PARA TODO MUNDO. Um rh acabou de poder destruir a PII de um titular FORA da ordem Storage -> Postgres -> Auth: o curriculo fica orfao no bucket para sempre, sem PITR (D-45-10) e com o Storage fora de todo backup. E o CR-01 cenario 2 reaberto. O predicado tem de comecar por (v_uid IS NULL)', coalesce(v_o6_rh, 'NULL');
  END IF;

  IF v_o6_cand IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P46P FAIL (o.6/candidato): ⛔ BL-02 DE VOLTA, pela porta do titular ALHEIO. Um chamador com papel candidato — que alcanca a funcao pelo GRANT a authenticated da 20260805000009 — obteve [%] em vez de 42501 sobre um candidato que NAO e ele. A metade (b) so nao recusou porque o ramo da purga a desligou', coalesce(v_o6_cand, 'NULL');
  END IF;

  IF coalesce(v_o6_uid2, 0) <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (o.6/candidato): ⊖ NAO-VACUIDADE DA SEGUNDA PERNA — a troca de claims para o papel candidato NAO tomou efeito e auth.uid() estava NULO naquela chamada. Ela teria repetido (o.2a) e passado por VERDE medindo o caso errado (RD2-10)';
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (o.6): ⊖ com item ABERTO sob live, um chamador COM SESSAO NAO entra pelo ramo da purga — rh -> %, candidato -> %. O ramo vale so para quem nao tem sessao de usuario (na pratica service_role), e nao para papel de cliente', v_o6_rh, v_o6_cand;

  -- ── (o.7) ⊕ CONTROLE POSITIVO: a metade DESTRUTIVA CONSEGUE autorizar ─────
  IF v_o7_semsess IS DISTINCT FROM 'P0002' THEN
    RAISE EXCEPTION 'P46P FAIL (o.7): ⊕ CONTROLE POSITIVO DA METADE DESTRUTIVA. Com cerco em live, execucao em executando/live, item ABERTO para o alvo, intencao DESTRUTIVA e sessao NULA — ou seja, TODAS as condicoes do 4o ramo satisfeitas —, a chamada devolveu [%] em vez de P0002. ⚠ [42501] significa que a metade DESTRUTIVA do 4o ramo RECUSA DENTRO DAS PROPRIAS CONDICOES: o flip dry_run -> live do 46-06 falharia em 100%% dos titulares, e a descoberta chegaria no dia do flip. ⚠ E enquanto esta assercao nao existir, (o.6) prova apenas que ALGUMA COISA recusou, nunca que ela recusou POR O CHAMADOR TER SESSAO — o par e o que torna a negativa significativa (RD2-02). ⚠ [SEM-EXCECAO] significa que o guard autorizou E o motor completou sobre um candidato que nao existe, o que seria um defeito do proprio motor', coalesce(v_o7_semsess, 'NULL');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (o.7): ⊕ a metade DESTRUTIVA do 4o ramo AUTORIZA sob as proprias condicoes (P0002 = passou o guard e parou por nao haver candidato). O par (o.6)/(o.7) e o que prova que a recusa de (o.6) e causada pela SESSAO, e nao por o guard recusar tudo';

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (o): as DUAS metades do 4o ramo asseridas SEPARADAMENTE. Recusas 42501 em: modo off com item aberto (%); DESTRUTIVO sob dry_run (%); live sem item aberto (%); item aberto sob execucao concluida (%). Aceitacoes: dry-run sob dry_run no MESMO estado da recusa destrutiva -> % (o guard autorizou e o motor parou por nao haver candidato); e o titular REAL pos1 em dry-run -> % (o corpo COMPLETO executou e foi revertido)', v_o_st[1], v_o_st[2], v_o_st[4], v_o_st[5], v_o_st[3], v_o_pos_st;

-- (p) 46-04 / B-02 · ⊖ O 3o RAMO DE `plano_exclusao_titular`
  IF array_length(v_p_st, 1) IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'P46P FAIL (p): foram registradas % chamadas de controle (esperado 3)', coalesce(array_length(v_p_st, 1), 0);
  END IF;

  IF v_p_st[1] IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P46P FAIL (p.1): com config_purga.modo = off, a leitura do plano de um titular COM item aberto devolveu [%] em vez de 42501. O kill switch de D-46-06 tem de fechar tambem a LEITURA: com a purga desligada, nenhuma execucao deveria estar processando ninguem, e um ramo que continua autorizando sob off e um ramo que sobrevive ao proprio desligamento', coalesce(v_p_st[1], 'NULL');
  END IF;

  IF v_p_st[2] IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'P46P FAIL (p.2): ⛔ O RAMO ESTA AUTORIZANDO POR MODO EM VEZ DE POR ALVO. Sob cerco em dry_run, a leitura do plano de um titular SEM item aberto devolveu [%] em vez de 42501. plano_exclusao_titular devolve CONTAGENS DE PII POR TITULAR, e o REVOKE nominal dela existe porque contagens enumeraveis sao superficie de exfiltracao (20260805000005:470-474). Um ramo sem a condicao i.candidato_id = p_candidato_id transforma "estar numa purga" em licenca para ler o plano de qualquer pessoa', coalesce(v_p_st[2], 'NULL');
  END IF;

  IF v_p_st[3] IS DISTINCT FROM 'OK' THEN
    RAISE EXCEPTION 'P46P FAIL (p.3): ⊖ O OUTRO LADO. Com item ABERTO para o titular, execucao em executando e cerco em dry_run, a leitura do plano devolveu [%] em vez de completar. MENSAGEM: %. CONTEXTO: %. ⚠ SO SE O CODIGO FOR 42501 isto e o Blocker B-02 de pe (a 20260823000008 nao aplicada, e sem ela o 4o ramo da 20260823000006 nao produz efeito util: o cron passa no guard do motor e morre no PASSO 0, tres linhas depois). QUALQUER OUTRO CODIGO E OUTRA COISA, e a mensagem acima e que diz o que — nao presuma B-02. ⚠ Provar so recusa e o modo de falha no 3 dos sete portoes da Phase 45', coalesce(v_p_st[3], 'NULL'), coalesce(v_p_err, '<sem mensagem>'), left(coalesce(v_p_ctx, '<sem contexto>'), 600);
  END IF;

  IF v_p_plano IS NULL THEN
    RAISE EXCEPTION 'P46P FAIL (p): ⊖ NAO-VACUIDADE — a chamada aceita nao devolveu plano nenhum. "Nao lancou" nunca foi o mesmo que "completou", e sem o jsonb a checagem de PII abaixo passaria trivialmente';
  END IF;

  IF v_p_pii <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (p): ⊖ o plano devolvido carrega % indicio(s) de PII. ACHADO: %. A Saida A do Blocker B-02 foi decidida pelo operador sobre a premissa MEDIDA de que esta funcao devolve contagens, booleanos e nomes de tabela/coluna — e NAO nome, e-mail, CPF, telefone, endereco ou data de nascimento. Se a premissa deixou de valer, o que o 3o ramo ampliou tem outro tamanho e a decisao precisa ser retomada, nao remendada. ⚠ Um nome de CHAVE que contem "email" com valor OBJETO e o nome de um PASSO e NAO conta — foi assim que este portao reprovou trabalho correto em 2026-08-23 (RD4-10); o que conta e valor ESCALAR sob chave de PII, ou padrao de PII em qualquer lugar do documento', v_p_pii, coalesce(v_p_pii_como, '<o portao nao soube dizer — isto e um defeito do portao>');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (p): o 3o ramo de plano_exclusao_titular RECUSA sob off (%) e RECUSA sem alvo (%), e ACEITA o titular COM item aberto sob dry_run (%) — devolvendo um plano com ZERO chave de PII. B-02 fechado por execucao', v_p_st[1], v_p_st[2], v_p_st[3];

  RAISE NOTICE 'P46P TEARDOWN ok: envelope revertido — config_purga.modo voltou a [%], e as % linhas de purga_execucoes gravadas por este smoke NAO existem (elas inflariam o criterio de >= 14 execucoes de D-46-14)', coalesce(v_modo_antes, 'NULL'), v_f_novas + v_c_novas + v_d_novas + v_k_novas + 1;
END $envelope$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (q) 46-05 · O CICLO DE VIDA DO ITEM — a reivindicação e a conclusão
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠⚠ ESTE BLOCO EXERCITA O CAMINHO DE SUCESSO, E NÃO SÓ O DE RECUSA. Um guard
-- que recusa TUDO passaria por qualquer bateria só de negativas — é o modo de
-- falha nº 3 dos sete portões da Phase 45, e é o RD2-02 do `46-REVIEW.md`. Pior
-- ainda: uma asserção cujo ramo de sucesso NUNCA ROLA não é asserção, é promessa.
-- A `(p.3)` deste mesmo arquivo passou por três rodadas de review sendo
-- estruturalmente incapaz de passar, porque o guard sempre recusava e o ramo de
-- sucesso nunca era executado. Aqui, (q.4) e o passo (e) de (q.5) são caminhos de
-- sucesso EXECUTADOS.
--
-- ⚠ E ELE É INCAPAZ DE DESTRUIR ALGUÉM. Os alvos são uuids SINTÉTICOS que não
-- existem em `public.candidatos` — por isso a chamada positiva a
-- `anonimizar_candidato` termina em `P0002` (candidato inexistente), que é
-- exatamente a prova de que o guard AUTORIZOU. Tudo dentro do envelope, que o
-- Postgres reverte inteiro.
--
-- ⚠ (q.1) e (q.2) são medições de CATÁLOGO e de FORMA e ficam FORA do envelope,
-- de propósito: se a migration `20260823000010` não estiver aplicada, o bloco
-- reprova ali, com o diagnóstico certo, antes de montar fixture nenhuma.
RESET ROLE;
DO $q$
DECLARE
  -- Três uuids SINTÉTICOS. Nenhum existe em public.candidatos, e (q.4) prova isso
  -- antes de usá-los.
  c_sint   constant uuid := '4605f000-0000-4000-8000-00000000000f'::uuid;
  c_sint2  constant uuid := '4605f000-0000-4000-8000-0000000000a2'::uuid;
  c_forja  constant uuid := '4605f000-0000-4000-8000-0000000000ff'::uuid;

  -- (q.1) catálogo e ACL
  v_reiv       oid;
  v_conc       oid;
  v_sd_r       boolean;
  v_sd_c       boolean;
  v_sp_r       text;
  v_sp_c       text;
  v_anon_r     boolean;
  v_auth_r     boolean;
  v_svc_r      boolean;
  v_anon_c     boolean;
  v_auth_c     boolean;
  v_svc_c      boolean;
  v_q1_diag    text;

  -- (q.2) acoplamento por forma, sobre os corpos VIVOS
  v_src_r      text;
  v_src_g      text;
  v_q2_diag    text;

  -- fixture do envelope
  v_modo_antes text;
  v_exec       uuid;
  v_item       uuid;
  v_item2      uuid;
  v_alvo_ex    int;

  -- (q.3) recusas · (q.4) controle positivo
  v_q3_st      text[] := ARRAY[]::text[];
  v_q4_dev     uuid;
  v_q4_st      text;
  v_q4_guard   text;

  -- (q.5) conclusão
  v_q5_st      text[] := ARRAY[]::text[];
  v_q5_proc_na int;
  v_q5_sit_na  text;
  v_q5_conc    timestamptz;
  v_q5_ds      text;
  v_q5_dp      text;
  v_q5_da      text;
  v_q5_proc    int;
  v_q5_sit     text;
BEGIN
  -- ══ (q.1) CATÁLOGO E ACL — as duas funções existem, e não são alcançáveis por
  --    papel de cliente. ⚠ `to_regprocedure`, jamais `to_regproc`: este último
  --    devolve NULL SEMPRE que recebe uma assinatura com tipos, e foi assim que
  --    cinco portões da Phase 45 passaram medindo nada.
  v_reiv := to_regprocedure('public.reivindicar_item_purga(uuid,uuid)')::oid;
  v_conc := to_regprocedure('public.concluir_item_purga(uuid,jsonb)')::oid;

  IF v_reiv IS NULL OR v_conc IS NULL THEN
    RAISE EXCEPTION 'P46P FAIL (q.1): reivindicar_item_purga(uuid,uuid) resolveu para [%] e concluir_item_purga(uuid,jsonb) para [%] — NULL significa que a migration 20260823000010 nao esta aplicada neste banco. Sem as duas funcoes a Edge Function purgar-retencao nao tem porta de entrada, e o resto deste bloco mediria a ausencia delas em vez do comportamento delas',
      coalesce(v_reiv::text, 'NULL'), coalesce(v_conc::text, 'NULL');
  END IF;

  SELECT p.prosecdef,
         (SELECT x FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) x WHERE x LIKE 'search_path=%' LIMIT 1)
    INTO v_sd_r, v_sp_r
    FROM pg_proc p WHERE p.oid = v_reiv;

  SELECT p.prosecdef,
         (SELECT x FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) x WHERE x LIKE 'search_path=%' LIMIT 1)
    INTO v_sd_c, v_sp_c
    FROM pg_proc p WHERE p.oid = v_conc;

  v_anon_r := has_function_privilege('anon',          v_reiv, 'EXECUTE');
  v_auth_r := has_function_privilege('authenticated', v_reiv, 'EXECUTE');
  v_svc_r  := has_function_privilege('service_role',  v_reiv, 'EXECUTE');
  v_anon_c := has_function_privilege('anon',          v_conc, 'EXECUTE');
  v_auth_c := has_function_privilege('authenticated', v_conc, 'EXECUTE');
  v_svc_c  := has_function_privilege('service_role',  v_conc, 'EXECUTE');

  -- ⚠ A mensagem IMPRIME O QUE MEDIU, condição por condição. Um diagnóstico que
  -- narra uma causa presumida custa mais caro que um "falhou" — esta fase perdeu
  -- um dia atrás de uma mensagem que afirmava, com texto fixo, que uma migration
  -- nao fora aplicada enquanto ela estava aplicada e conferida por md5.
  v_q1_diag := concat_ws(', '::text,
    CASE WHEN coalesce(v_sd_r,   false) THEN NULL ELSE 'reivindicar nao e SECURITY DEFINER'::text                 END,
    CASE WHEN coalesce(v_sd_c,   false) THEN NULL ELSE 'concluir nao e SECURITY DEFINER'::text                    END,
    CASE WHEN v_sp_r IS NOT NULL        THEN NULL ELSE 'reivindicar nao fixa search_path'::text                   END,
    CASE WHEN v_sp_c IS NOT NULL        THEN NULL ELSE 'concluir nao fixa search_path'::text                      END,
    CASE WHEN coalesce(v_anon_r, false) THEN 'reivindicar alcancavel por anon'::text          ELSE NULL           END,
    CASE WHEN coalesce(v_auth_r, false) THEN 'reivindicar alcancavel por authenticated'::text ELSE NULL           END,
    CASE WHEN coalesce(v_anon_c, false) THEN 'concluir alcancavel por anon'::text             ELSE NULL           END,
    CASE WHEN coalesce(v_auth_c, false) THEN 'concluir alcancavel por authenticated'::text    ELSE NULL           END,
    CASE WHEN coalesce(v_svc_r,  false) THEN NULL ELSE 'reivindicar NAO alcancavel por service_role'::text        END,
    CASE WHEN coalesce(v_svc_c,  false) THEN NULL ELSE 'concluir NAO alcancavel por service_role'::text           END
  );

  IF v_q1_diag IS NOT NULL AND v_q1_diag <> '' THEN
    RAISE EXCEPTION 'P46P FAIL (q.1): medido [%]. ⚠ A revogacao de authenticated e LOAD-BEARING aqui, e nao higiene copiada: anonimizar_candidato e plano_exclusao_titular TEM EXECUTE para authenticated (a EF do direito do titular chama as duas com o JWT da pessoa, 20260805000009). Se reivindicar_item_purga tambem tivesse, qualquer usuario logado poderia chamar a porta que o 4o ramo do guard reconhece, ate acertar um item aberto. search_path fixo lido: reivindicar=[%] concluir=[%]',
      v_q1_diag, coalesce(v_sp_r, 'AUSENTE'), coalesce(v_sp_c, 'AUSENTE');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (q.1): as duas funcoes do ciclo de vida existem, sao SECURITY DEFINER com search_path fixo (reivindicar=[%], concluir=[%]), sao INALCANCAVEIS por anon e por authenticated, e alcancaveis pelo papel de servico', v_sp_r, v_sp_c;

  -- ══ (q.2) ACOPLAMENTO POR FORMA — a reivindicação repete as condições do guard
  --    ⚠ O QUE ESTA ASSERÇÃO PROVA, E O QUE ELA NÃO PROVA, dito por extenso para
  --    que ninguém a leia como mais do que é: ela mede PRESENÇA das condições no
  --    corpo vivo, e o corpo tem cada condição escrita em DOIS lugares (a decisão
  --    e o diagnóstico). Portanto ela detecta a REMOÇÃO da condição do arquivo, e
  --    NÃO a remoção dela apenas do predicado de decisão. Quem prova que a decisão
  --    MORDE é (q.3), que executa cada recusa, e (q.4), que executa a aceitação.
  --    O que só a forma alcança é o acoplamento com a janela do guard: não dá para
  --    fazer o relógio andar dentro de um smoke.
  SELECT regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')
    INTO v_src_r FROM pg_proc p WHERE p.oid = v_reiv;

  SELECT regexp_replace(regexp_replace(p.prosrc, '--[^\n]*', '', 'g'), '\s+', ' ', 'g')
    INTO v_src_g FROM pg_proc p
   WHERE p.oid = to_regprocedure('public.anonimizar_candidato(uuid,boolean)')::oid;

  v_q2_diag := concat_ws(', '::text,
    CASE WHEN position('i.concluido_em IS NULL' in coalesce(v_src_r, ''))       > 0 THEN NULL ELSE 'falta i.concluido_em IS NULL'::text        END,
    CASE WHEN position('e.situacao = ''executando''' in coalesce(v_src_r, ''))  > 0 THEN NULL ELSE 'falta e.situacao = executando'::text       END,
    CASE WHEN position('e.modo_vigente = ''live''' in coalesce(v_src_r, ''))    > 0 THEN NULL ELSE 'falta e.modo_vigente = live'::text         END,
    CASE WHEN position('cp.modo = ''live''' in coalesce(v_src_r, ''))           > 0 THEN NULL ELSE 'falta cp.modo = live (kill switch)'::text  END,
    CASE WHEN position('i.candidato_id = p_candidato_id' in coalesce(v_src_r, '')) > 0 THEN NULL ELSE 'falta a igualdade do alvo'::text        END,
    CASE WHEN position('e.iniciada_em >' in coalesce(v_src_r, ''))              > 0 THEN NULL ELSE 'falta a leitura de e.iniciada_em'::text    END,
    CASE WHEN position('interval ''150 seconds''' in coalesce(v_src_r, ''))     > 0 THEN NULL ELSE 'falta a margem de 150 s do teto de parede da EF'::text END,
    CASE WHEN position('interval ''1 hour''' in coalesce(v_src_r, ''))          > 0 THEN NULL ELSE 'a reivindicacao deixou de nomear a janela de 1 hora'::text END,
    CASE WHEN position('interval ''1 hour''' in coalesce(v_src_g, ''))          > 0 THEN NULL ELSE 'o GUARD deixou de usar interval 1 hour'::text END
  );

  IF v_q2_diag IS NOT NULL AND v_q2_diag <> '' THEN
    RAISE EXCEPTION 'P46P FAIL (q.2): medido [%]. O predicado de reivindicar_item_purga TEM de ser ESTRITAMENTE MAIS EXIGENTE que a metade (p.2) do 4o ramo do guard (20260823000006): ele repete as seis condicoes daquele predicado e acrescenta a identidade do item e uma margem de 150 s dentro da janela de 1 hora de HI-03. Se as duas divergirem, a Edge Function volta a poder APAGAR O CURRICULO NO STORAGE para uma chamada que o motor recusara tres passos depois — o cenario RD2-03, cujo desfecho e um curriculo orfao e IRRECUPERAVEL num sistema em que o Storage esta fora de todo caminho de backup. ⚠ Se o achado for "o GUARD deixou de usar interval 1 hour", a margem de 150 s foi calibrada contra uma janela que nao existe mais e as duas precisam ser reconciliadas JUNTAS',
      v_q2_diag;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (q.2): o corpo vivo da reivindicacao carrega as seis condicoes do 4o ramo destrutivo mais a margem de 150 s, e o guard continua com a janela de 1 hora contra a qual essa margem foi calibrada';

  -- ══ ENVELOPE — a partir daqui tudo é revertido ═════════════════════════════
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('request.jwt.claim.sub', '', false);

  BEGIN
    SELECT cp.modo INTO v_modo_antes FROM public.config_purga cp;

    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, veredito, situacao)
    VALUES ('live', 50, 2, 0, 'despachado', 'executando')
    RETURNING id INTO v_exec;

    INSERT INTO public.purga_execucao_itens
           (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em)
    VALUES (v_exec, c_sint, 'aprovado'::public.etapa_processo, 24, 'data_candidatura', pg_catalog.now())
    RETURNING id INTO v_item;

    INSERT INTO public.purga_execucao_itens
           (execucao_id, candidato_id, etapa, janela_meses_aplicada, ancora_origem, ancora_em)
    VALUES (v_exec, c_sint2, 'aprovado'::public.etapa_processo, 24, 'data_candidatura', pg_catalog.now())
    RETURNING id INTO v_item2;

    -- ⊖ NÃO-VACUIDADE DO ALVO: os dois sintéticos têm de NÃO existir. Com um
    -- candidato real ali, o P0002 de (q.4) deixaria de ser possível e a aceitação
    -- passaria a destruir PII de verdade em vez de parar no motor.
    SELECT count(*) INTO v_alvo_ex
      FROM public.candidatos c WHERE c.id = c_sint OR c.id = c_sint2;

    UPDATE public.config_purga SET modo = 'live';

    -- ── (q.3) AS CINCO RECUSAS, uma condição de cada vez ───────────────────────
    -- 1 · item FORJADO: um uuid que não é item nenhum
    BEGIN
      PERFORM public.reivindicar_item_purga(c_forja, c_sint);
      v_q3_st := v_q3_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q3_st := v_q3_st || SQLSTATE;
    END;

    -- 2 · item real, TITULAR ALHEIO no corpo — o caso do Pitfall 11
    BEGIN
      PERFORM public.reivindicar_item_purga(v_item, c_sint2);
      v_q3_st := v_q3_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q3_st := v_q3_st || SQLSTATE;
    END;

    -- 3 · item JÁ CONCLUÍDO — a idempotência é por ESTADO no ledger
    UPDATE public.purga_execucao_itens SET concluido_em = pg_catalog.now() WHERE id = v_item;
    BEGIN
      PERFORM public.reivindicar_item_purga(v_item, c_sint);
      v_q3_st := v_q3_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q3_st := v_q3_st || SQLSTATE;
    END;
    UPDATE public.purga_execucao_itens SET concluido_em = NULL WHERE id = v_item;

    -- 4 · KILL SWITCH: cerco em `off` com o item aberto e a execução em live
    UPDATE public.config_purga SET modo = 'off';
    BEGIN
      PERFORM public.reivindicar_item_purga(v_item, c_sint);
      v_q3_st := v_q3_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q3_st := v_q3_st || SQLSTATE;
    END;
    UPDATE public.config_purga SET modo = 'live';

    -- 5 · A MARGEM DO TETO DE PAREDE, EXECUTADA. A execução foi aberta há 59
    --     minutos: ela AINDA está dentro da hora que o guard exige, mas não tem
    --     150 s de janela restante. A reivindicação TEM de recusar — se ela
    --     aceitasse, a EF apagaria o Storage e o motor recusaria depois.
    UPDATE public.purga_execucoes SET iniciada_em = pg_catalog.now() - interval '59 minutes' WHERE id = v_exec;
    BEGIN
      PERFORM public.reivindicar_item_purga(v_item, c_sint);
      v_q3_st := v_q3_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q3_st := v_q3_st || SQLSTATE;
    END;
    UPDATE public.purga_execucoes SET iniciada_em = pg_catalog.now() WHERE id = v_exec;

    -- ── (q.4) ⊕ O CONTROLE POSITIVO, E O PAR QUE PROVA O ACOPLAMENTO ──────────
    -- Mesmo estado das cinco recusas, com todas as condições satisfeitas. Duas
    -- medições, e é o PAR que importa: a reivindicação devolve o titular DO ITEM,
    -- e o guard destrutivo autoriza NAQUELE MESMO INSTANTE. Uma reivindicação
    -- concedida que o guard recusasse em seguida é o cenário RD2-03 vivo.
    BEGIN
      SELECT public.reivindicar_item_purga(v_item, c_sint) INTO v_q4_dev;
      v_q4_st := 'OK'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q4_st := SQLSTATE;
    END;

    BEGIN
      PERFORM public.anonimizar_candidato(c_sint, false);
      v_q4_guard := 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q4_guard := SQLSTATE;
    END;

    -- ── (q.5) A CONCLUSÃO ─────────────────────────────────────────────────────
    -- a · `nao_aplicavel` no Postgres NÃO incrementa `processados`
    BEGIN
      PERFORM public.concluir_item_purga(v_item2,
        '{"storage":"falha","postgres":"nao_aplicavel","auth":"nao_aplicavel"}'::jsonb);
      v_q5_st := v_q5_st || 'OK'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q5_st := v_q5_st || SQLSTATE;
    END;

    SELECT e.processados, e.situacao INTO v_q5_proc_na, v_q5_sit_na
      FROM public.purga_execucoes e WHERE e.id = v_exec;

    -- b · valor FORA do vocabulário fechado
    BEGIN
      PERFORM public.concluir_item_purga(v_item,
        '{"storage":"ok","postgres":"desconhecido","auth":"ok"}'::jsonb);
      v_q5_st := v_q5_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q5_st := v_q5_st || SQLSTATE;
    END;

    -- c · `pendente` não é desfecho de conclusão
    BEGIN
      PERFORM public.concluir_item_purga(v_item,
        '{"storage":"ok","postgres":"pendente","auth":"ok"}'::jsonb);
      v_q5_st := v_q5_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q5_st := v_q5_st || SQLSTATE;
    END;

    -- d · chave AUSENTE — jamais gravação silenciosa
    BEGIN
      PERFORM public.concluir_item_purga(v_item, '{"storage":"ok","auth":"ok"}'::jsonb);
      v_q5_st := v_q5_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q5_st := v_q5_st || SQLSTATE;
    END;

    -- e · ⊕ O CAMINHO FELIZ, EXECUTADO
    BEGIN
      PERFORM public.concluir_item_purga(v_item,
        '{"storage":"ok","postgres":"ok","auth":"ok"}'::jsonb);
      v_q5_st := v_q5_st || 'OK'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q5_st := v_q5_st || SQLSTATE;
    END;

    SELECT i.concluido_em, i.desfecho_storage, i.desfecho_postgres, i.desfecho_auth
      INTO v_q5_conc, v_q5_ds, v_q5_dp, v_q5_da
      FROM public.purga_execucao_itens i WHERE i.id = v_item;

    SELECT e.processados, e.situacao INTO v_q5_proc, v_q5_sit
      FROM public.purga_execucoes e WHERE e.id = v_exec;

    -- f · reescrever item JÁ CONCLUÍDO é falsificar uma observação
    BEGIN
      PERFORM public.concluir_item_purga(v_item,
        '{"storage":"falha","postgres":"falha","auth":"falha"}'::jsonb);
      v_q5_st := v_q5_st || 'SEM-EXCECAO'::text;
    EXCEPTION WHEN OTHERS THEN
      v_q5_st := v_q5_st || SQLSTATE;
    END;

    UPDATE public.config_purga SET modo = v_modo_antes;

    RAISE EXCEPTION 'rollback_smoke46q_envelope' USING ERRCODE = 'P46B0';
  EXCEPTION
    WHEN sqlstate 'P46B0' THEN
      NULL;  -- reversao ESPERADA; as variaveis acima sobreviveram ao rollback
  END;

  RESET ROLE;

  -- ══ JULGAMENTO — sobre variáveis, sem uma única consulta viva ══════════════

  IF v_alvo_ex <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (q): ⊖ NAO-VACUIDADE DO ALVO — existe(m) % linha(s) em candidatos com os uuids sinteticos deste bloco. Eles foram escolhidos por NAO existir: e isso que faz P0002 significar "o guard AUTORIZOU e o motor parou por nao haver titular". Com um candidato real ali, a aceitacao de (q.4) destruiria PII de verdade em vez de parar no motor', v_alvo_ex;
  END IF;

  IF array_length(v_q3_st, 1) IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION 'P46P FAIL (q.3): foram registradas % chamadas de controle (esperado 5). Um bloco que nao executou as cinco nao provou nada sobre a reivindicacao', coalesce(array_length(v_q3_st, 1), 0);
  END IF;

  IF v_q3_st[1] IS DISTINCT FROM 'P46FB' THEN
    RAISE EXCEPTION 'P46P FAIL (q.3.1): um item_id FORJADO devolveu [%] em vez de P46FB. O corpo da requisicao SELECIONA e nao autoriza — se um identificador inventado atravessa a porta, quem conseguisse forjar um POST com o Bearer certo escolheria quem e destruido (Pitfall 11 / classe T-32-03). ⚠ [SEM-EXCECAO] aqui e o pior desfecho possivel: a reivindicacao teria devolvido um titular para um item que nao existe', coalesce(v_q3_st[1], 'NULL');
  END IF;

  IF v_q3_st[2] IS DISTINCT FROM 'P46FB' THEN
    RAISE EXCEPTION 'P46P FAIL (q.3.2): ⛔ O CASO QUE VALE A DEFESA INTEIRA. Um item REAL e ABERTO, com o titular ALHEIO no corpo, devolveu [%] em vez de P46FB. Isso significa que a funcao deixou de exigir i.candidato_id = p_candidato_id — e entao basta conhecer UM item aberto para mandar destruir QUALQUER pessoa, porque o identificador do corpo passaria a viajar para o Storage, para o motor e para a Admin API do Auth', coalesce(v_q3_st[2], 'NULL');
  END IF;

  IF v_q3_st[3] IS DISTINCT FROM 'P46FB' THEN
    RAISE EXCEPTION 'P46P FAIL (q.3.3): um item JA CONCLUIDO devolveu [%] em vez de P46FB. A idempotencia desta fase e por ESTADO no ledger, nunca por "tentar de novo e nao dar erro": uma segunda invocacao sobre um item fechado tem de ser RECUSADA, e nao repetida em silencio sobre tres sistemas irreversiveis', coalesce(v_q3_st[3], 'NULL');
  END IF;

  IF v_q3_st[4] IS DISTINCT FROM 'P46FB' THEN
    RAISE EXCEPTION 'P46P FAIL (q.3.4): com config_purga.modo = off e o item ainda ABERTO sob execucao em live, a reivindicacao devolveu [%] em vez de P46FB. O KILL SWITCH DE D-46-06 TEM DE MORDER ANTES DO PRIMEIRO ATO IRREVERSIVEL: a reivindicacao e a unica porta que a Edge Function atravessa antes de tocar no Storage, e o guard do motor so seria consultado DEPOIS de o curriculo ja ter sido apagado', coalesce(v_q3_st[4], 'NULL');
  END IF;

  IF v_q3_st[5] IS DISTINCT FROM 'P46FB' THEN
    RAISE EXCEPTION 'P46P FAIL (q.3.5): ⛔ A MARGEM DO TETO DE PAREDE NAO MORDEU. Com a execucao aberta ha 59 minutos — ainda DENTRO da hora que o 4o ramo do guard exige, mas com menos de 150 s de janela restante —, a reivindicacao devolveu [%] em vez de P46FB. Este e o cenario RD2-03 do 46-REVIEW: a EF reivindicaria, apagaria o CURRICULO NO STORAGE, chamaria o motor e receberia 42501 porque a janela de HI-03 venceu no meio. Storage apagado, Postgres intacto, curriculo orfao e IRRECUPERAVEL — o Storage esta fora de todo caminho de backup e nao ha PITR (D-45-10). A diferenca entre "a EF retornou erro" e "nenhuma chamada de Storage aconteceu" e um curriculo', coalesce(v_q3_st[5], 'NULL');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (q.3): a reivindicacao RECUSA com P46FB nas cinco condicoes, uma de cada vez — item forjado (%), titular alheio (%), item ja concluido (%), kill switch em off (%), e execucao sem 150 s de janela restante (%)', v_q3_st[1], v_q3_st[2], v_q3_st[3], v_q3_st[4], v_q3_st[5];

  IF v_q4_st IS DISTINCT FROM 'OK' THEN
    RAISE EXCEPTION 'P46P FAIL (q.4): ⊕ CONTROLE POSITIVO. Com TODAS as condicoes satisfeitas — cerco em live, execucao em executando/live aberta agora, item ABERTO e o titular do corpo batendo o do item —, a reivindicacao devolveu [%] em vez de aceitar. ⚠ PROVAR SO RECUSA NAO PROVA NADA: um guard que recusa tudo passaria nas cinco negativas de (q.3), e a descoberta chegaria no dia do flip dry_run -> live, com a EF devolvendo 403 em 100%% dos titulares. E o RD2-02 desta fase, e o modo de falha no 3 dos sete portoes da Phase 45', coalesce(v_q4_st, 'NULL');
  END IF;

  IF v_q4_dev IS DISTINCT FROM c_sint THEN
    RAISE EXCEPTION 'P46P FAIL (q.4): a reivindicacao aceitou mas devolveu [%] em vez do titular DO ITEM. E este valor, e nenhum outro, que a Edge Function usa para o Storage, para o motor e para a Admin API do Auth — se ele deixar de vir do item, o identificador do corpo voltou a mandar em quem e destruido', coalesce(v_q4_dev::text, 'NULL');
  END IF;

  IF v_q4_guard IS DISTINCT FROM 'P0002' THEN
    RAISE EXCEPTION 'P46P FAIL (q.4): ⛔ O ACOPLAMENTO QUEBROU, E ELE E O PONTO INTEIRO DESTA ASSERCAO. No MESMO instante em que a reivindicacao foi CONCEDIDA, o guard destrutivo de anonimizar_candidato devolveu [%] em vez de P0002. P0002 significa "o guard autorizou e o motor parou por nao haver titular sintetico". ⚠ [42501] significa que a reivindicacao concede autorizacao que o guard NAO honra — e a Edge Function apaga o Storage ENTRE as duas chamadas. O predicado da reivindicacao tem de ser ESTRITAMENTE MAIS EXIGENTE que a metade (p.2) do 4o ramo, e neste instante ele nao e', coalesce(v_q4_guard, 'NULL');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (q.4): ⊕ satisfeitas as condicoes, a reivindicacao ACEITA e devolve o titular DO ITEM (%), e o guard destrutivo autoriza no MESMO instante (%) — reivindicacao concedida implica guard honrando, que e o acoplamento que fecha o RD2-03', v_q4_dev, v_q4_guard;

  IF array_length(v_q5_st, 1) IS DISTINCT FROM 6 THEN
    RAISE EXCEPTION 'P46P FAIL (q.5): foram registradas % chamadas de controle (esperado 6)', coalesce(array_length(v_q5_st, 1), 0);
  END IF;

  IF v_q5_st[1] IS DISTINCT FROM 'OK' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.a): concluir um item com desfecho de Postgres nao_aplicavel devolveu [%] em vez de completar. Este e o caminho em que o Storage falhou e o motor nunca chegou a rodar, e ele TEM de conseguir fechar o item: um item que fica aberto mantem viva a autorizacao do 4o ramo do guard ate a hora de HI-03 vencer', coalesce(v_q5_st[1], 'NULL');
  END IF;

  IF v_q5_proc_na IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.a): depois de concluir um item cujo motor NUNCA RODOU, processados vale % (esperado 0). A coluna diz de si mesma, no COMMENT de 20260823000002, que conta "quantos titulares tiveram o motor destrutivo efetivamente executado". Incrementar em toda conclusao a faria significar "itens fechados" e mentir sobre o unico numero que ela existe para responder — a mesma classe do RD2-01, em que a mentira simetrica custa o mesmo que a otimista', v_q5_proc_na;
  END IF;

  IF v_q5_sit_na IS DISTINCT FROM 'executando' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.a): com UM item ainda ABERTO, a execucao ja esta em situacao [%] (esperado executando). Fechar a execucao antes do ultimo item apagaria o sinal de que ela ainda esta processando alguem', coalesce(v_q5_sit_na, 'NULL');
  END IF;

  IF v_q5_st[2] IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.b): um desfecho FORA do vocabulario (desconhecido) devolveu [%] em vez de 22023. ⚠ desconhecido EXISTE no CHECK da coluna desde a 20260823000009 e pertence a RECONCILIACAO de execucoes vencidas, que nao observou nada; quem chama esta funcao OBSERVOU os tres passos, e um observador nao declara ignorancia. Aceitar o valor aqui seria deixar a Edge Function gravar "eu nao sei" sobre um ato que ela mesma executou', coalesce(v_q5_st[2], 'NULL');
  END IF;

  IF v_q5_st[3] IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.c): pendente na conclusao devolveu [%] em vez de 22023. pendente e o unico valor do vocabulario que descreve uma INTENCAO ("ainda vou tentar"), e um item fechado nao tem intencoes — grava-lo seria uma afirmacao falsa num registro de cumprimento de obrigacao legal com retencao indefinida', coalesce(v_q5_st[3], 'NULL');
  END IF;

  IF v_q5_st[4] IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.d): um objeto SEM a chave postgres devolveu [%] em vez de 22023. Chave ausente tem de ser RECUSA e jamais gravacao silenciosa: o item fecharia com o desfecho daquele sistema em pendente, e um item fechado que diz "ainda vou tentar" e exatamente o registro que ninguem consegue interpretar depois', coalesce(v_q5_st[4], 'NULL');
  END IF;

  IF v_q5_st[5] IS DISTINCT FROM 'OK' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.e): ⊕ O CAMINHO FELIZ. A conclusao com os tres desfechos validos devolveu [%] em vez de completar. Sem este caso, (q.5) provaria apenas que a funcao recusa — e uma funcao que recusa tudo deixaria a Edge Function INCAPAZ DE FECHAR O ITEM, mantendo viva a autorizacao destrutiva do 4o ramo por uma hora inteira depois de a purga daquele titular ja ter terminado', coalesce(v_q5_st[5], 'NULL');
  END IF;

  IF v_q5_conc IS NULL OR v_q5_ds IS DISTINCT FROM 'ok' OR v_q5_dp IS DISTINCT FROM 'ok' OR v_q5_da IS DISTINCT FROM 'ok' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.e): o item nao ficou como a chamada pediu — concluido_em=[%], storage=[%], postgres=[%], auth=[%] (esperado carimbo nao-nulo e ok nos tres). ⚠ concluido_em e a coluna LOAD-BEARING: e ela que RETIRA a autorizacao do 4o ramo do guard, e "nao lancou" nunca foi o mesmo que "gravou"',
      coalesce(v_q5_conc::text, 'NULL'), coalesce(v_q5_ds, 'NULL'), coalesce(v_q5_dp, 'NULL'), coalesce(v_q5_da, 'NULL');
  END IF;

  IF v_q5_proc IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.e): depois de concluir o item cujo motor RODOU, processados vale % (esperado exatamente 1 — o outro item foi fechado com o motor nao executado). Um contador que nao sobe quando o motor roda deixa PURGA-06 sem resposta para "quantos"', v_q5_proc;
  END IF;

  IF v_q5_sit IS DISTINCT FROM 'concluida' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.e): fechado o ULTIMO item aberto, a execucao ficou em situacao [%] (esperado concluida). No desenho assincrono do 46-06 quem fecha o cabecalho e a conclusao do ultimo item: se ela nao fechar, a execucao fica em executando para sempre e a reconciliacao de 20260823000007 acaba ABORTANDO uma execucao que na verdade terminou bem', coalesce(v_q5_sit, 'NULL');
  END IF;

  IF v_q5_st[6] IS DISTINCT FROM 'P46FB' THEN
    RAISE EXCEPTION 'P46P FAIL (q.5.f): reescrever o desfecho de um item JA CONCLUIDO devolveu [%] em vez de P46FB. Isso e falsificar uma observacao dentro de um registro de cumprimento de obrigacao legal com retencao INDEFINIDA (D-46-16), sem PITR para desmentir — e a segunda escrita apagaria o desfecho que alguem de fato observou', coalesce(v_q5_st[6], 'NULL');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (q.5): a conclusao RECUSA vocabulario invalido (%), pendente (%), chave ausente (%) e reescrita de item fechado (%); e ACEITA o caminho feliz (%), carimbando os tres desfechos, incrementando processados para % apenas quando o motor rodou, e fechando a execucao em [%]', v_q5_st[2], v_q5_st[3], v_q5_st[4], v_q5_st[6], v_q5_st[5], v_q5_proc, v_q5_sit;

  RAISE NOTICE 'P46P TEARDOWN ok (q): envelope revertido — config_purga.modo volta a [%], e a execucao e os dois itens deste bloco NAO existem', coalesce(v_modo_antes, 'NULL');
END $q$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 46-06 · O GATILHO, A FRONTEIRA DO CAP, RETEN-05 E O COMENTÁRIO VIVO
-- ─────────────────────────────────────────────────────────────────────────────
-- (a) PURGA-01 · o agendamento `purga-retencao-sweep` existe UMA vez, às 03:00
--     UTC, ativo, com `md5(command)` pinado byte a byte contra a migration
--     `20260823000012` — e os três agendamentos herdados continuam presentes,
--     aferidos por igualdade exata de `jobname`.
-- (g) ⊖ PURGA-05 / D-46-08 · o CONTRATO DE FRONTEIRA do cap, com os três pontos:
--     `elegiveis = cap` RODA · `elegiveis = cap - 1` RODA · `elegiveis = cap + 1`
--     ABORTA. Mais o aborto integral com `cap = 1`: zero item e zero requisição.
-- (m) RETEN-05 sobre fixture RETRODATADA — a notificação além da janela é
--     apagada, a de dentro sobrevive, e ⊖ nada mais foi apagado. Mais ⊕ a prova
--     durável de que o dispatch do ramo `live` rodou.
-- (n) ⊖ o `COMMENT` VIVO de `notificacoes_enviadas` deixou de declarar retenção
--     sem prazo E passou a nomear a janela, a âncora e a função.
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ (a) e (n) são medições de CATÁLOGO e ficam FORA do envelope, de propósito: se
-- as migrations `20260823000011`/`20260823000012` não estiverem aplicadas, o bloco
-- reprova ali, com o diagnóstico certo, antes de montar fixture nenhuma.
--
-- ⚠⚠ (m) RODA A VARREDURA EM `live`, e é a primeira vez que este arquivo faz
-- isso. Três propriedades tornam a coisa segura, e as três são estruturais:
--   1. **Nada é destruído pela varredura.** Em `live` o laço continua chamando o
--      motor com o literal `true` (ensaio revertido); quem destrói é a Edge
--      Function, invocada por um post que só sai **no COMMIT** — e este bloco
--      termina em `RAISE … 'P46B0'`, então o COMMIT não acontece.
--   2. **O kill switch é a segunda camada.** O envelope devolve
--      `config_purga.modo` ao valor anterior ANTES do rollback; mesmo no cenário
--      impossível em que tudo commitasse, `reivindicar_item_purga` exige
--      `cp.modo = 'live'` e recusaria toda invocação com `P46FB`, antes do
--      primeiro ato irreversível.
--   3. **O que (m) de fato apaga é UMA linha de notificação sintética que este
--      bloco mesmo criou**, e o rollback a devolve.
--
-- ⚠ (m) É SOBRE FIXTURE RETRODATADA, E ISSO NÃO É CONVENIÊNCIA: medido em
-- 2026-08-23, a linha mais antiga de `notificacoes_enviadas` em PROD é de
-- 2026-07-31 e a janela é de 24 meses. **O alcance real de RETEN-05 hoje é ZERO,
-- e continuará zero por ~23 meses.** Uma asserção sobre as linhas vivas passaria
-- por VACUIDADE — e passaria igual com o `DELETE` removido do corpo da função.
-- Por isso (m) planta a própria linha vencida, e por isso ela exige que a linha
-- plantada tenha SUMIDO, e não que "nada quebrou".
--
-- ⚠ (m) TEM UMA METADE NEGATIVA QUE É O REQUISITO INTEIRO DE "INDEPENDENTE": as
-- FKs `ON DELETE CASCADE` de `notificacoes_enviadas` levariam as notificações
-- junto se a candidatura ou o candidato fossem apagados. Se a asserção medisse só
-- "a notificação sumiu", uma cascata acidental passaria por cumprimento da regra.
-- Por isso ela mede também que **nenhuma** candidatura e **nenhum** candidato
-- foram apagados — e, separadamente, que `historico_candidatura` e `decisao_final`
-- mantiveram a contagem, que é a trilha de decisão humana que prova
-- não-discriminação (Art. 7º, VI) e que a purga NUNCA pode destruir.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $r$
DECLARE
  -- ══ (a) O AGENDAMENTO ═══════════════════════════════════════════════════════
  c_job      constant text   := 'purga-retencao-sweep';
  c_sched    constant text   := '0 3 * * *';
  -- PROVENIÊNCIA DO RESUMO ESPERADO (não apagar — é o que torna um re-pin auditável)
  --   valor  : 381a0edbc8a59b47b23b50dd1eba9a86   (40 octetos)
  --   origem : corpo entre os dois delimitadores `$sweep$` de
  --            `supabase/migrations/20260823000012_p46_cron.sql`
  --   medido : 2026-08-23, POR EXECUÇÃO — nunca digitado à mão
  --   recomputar (se e somente se a migration mudar):
  --     node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
  --       a=f.indexOf("$sweep$"),b=f.indexOf("$sweep$",a+7);
  --       console.log(require("crypto").createHash("md5")
  --         .update(f.slice(a+7,b),"utf8").digest("hex"))' \
  --       supabase/migrations/20260823000012_p46_cron.sql
  --   ⚠ Os DOIS espaços — o que abre e o que fecha o corpo — fazem parte dos 40
  --     octetos. Reformatar a migration muda o resumo, e é para isso que ele serve.
  --   ⚠ Se este resumo for re-pinado sem que a migration tenha mudado, a asserção
  --     deixa de provar qualquer coisa. Re-pinar é ato consciente e revisável.
  --   comparado contra: md5(command) da linha viva de `cron.job` — igualdade de
  --     resumo sobre o texto inteiro É comparação byte a byte, e é estritamente
  --     mais forte que `strpos` ou inspeção visual. Mesmo idioma da asserção (b)
  --     do `p42_invent05_cron_smoke.sql`.
  c_md5      constant text   := '381a0edbc8a59b47b23b50dd1eba9a86';
  -- ⚠ ESCOPO DELIBERADO, NÃO FOTOGRAFIA — a mesma lista, com a mesma razão, vive
  --   em `p42_invent05_cron_smoke.sql` (a). Ela está repetida aqui de propósito:
  --   os dois arquivos passam a dizer a MESMA coisa sobre o inventário, e uma
  --   divergência entre eles é detectável em vez de silenciosa.
  c_herdados constant text[] := ARRAY['ai-cost-aggregation',
                                      'ai-logs-retention-cleanup',
                                      'notif-retry-sweep'];
  v_a_n      int;
  v_a_sched  text;
  v_a_active boolean;
  v_a_cmd    text;
  v_a_md5    text;
  v_a_oct    int;
  v_a_falta  text;

  -- ══ (n) O COMENTÁRIO VIVO ═══════════════════════════════════════════════════
  v_n_txt    text;
  v_n_diag   text;

  -- ══ ENVELOPE ════════════════════════════════════════════════════════════════
  v_modo0    text;
  v_cap0     int;

  -- (g) fronteira do cap
  v_vistos   uuid[];
  v_g_n      int;
  v_g0_ver   text;  v_g0_eleg int;
  v_g1_id    uuid;  v_g1_ver text;  v_g1_eleg int;  v_g1_novas int;
  v_g2_id    uuid;  v_g2_ver text;  v_g2_eleg int;
  v_g3_id    uuid;  v_g3_ver text;  v_g3_eleg int;  v_g3_proc int;  v_g3_itens bigint;
  v_g4_id    uuid;  v_g4_ver text;  v_g4_eleg int;  v_g4_proc int;  v_g4_itens bigint;

  -- fila do pg_net, medida com tolerância DECLARADA (nunca com silêncio)
  v_fila_ok   boolean := true;
  v_fila_nota text    := 'medida';
  v_fila_a    bigint;   -- antes do run de cap = 1
  v_fila_g    bigint;   -- depois do run de cap = 1
  v_fila_m    bigint;   -- depois do run em live

  -- (m) RETEN-05
  c_cdt_pos1   constant uuid := '4601c000-0000-4000-8000-000000000001'::uuid;
  c_nt_fora    constant uuid := '4606f000-0000-4000-8000-0000000000f1'::uuid;
  c_nt_dentro  constant uuid := '4606f000-0000-4000-8000-0000000000f2'::uuid;
  v_m_cand     uuid;
  v_m_janela   int;
  v_m_ins      int := 0;
  v_m_fora_a   bigint; v_m_dentro_a bigint;
  v_m_fora_z   bigint; v_m_dentro_z bigint;
  v_m_dom_a    text;   v_m_dom_z    text;
  v_m_hist_a   bigint; v_m_hist_z   bigint;
  v_m_dec_a    bigint; v_m_dec_z    bigint;
  v_m_id       uuid;   v_m_ver text; v_m_sit text;
  v_m_eleg     int;    v_m_proc int; v_m_exp int;
  v_m_itens    bigint; v_m_abertos bigint; v_m_falhas bigint;

  -- higiene de gatilhos de despacho sobre a tabela que (m) muta
  r_t        record;
  v_t_off    int := 0;
  v_t_back   int := 0;
  v_t_rest   int;
BEGIN
  -- ══ (a) O AGENDAMENTO (PURGA-01) ════════════════════════════════════════════
  SELECT count(*), max(j.schedule), bool_and(j.active), max(j.command)
    INTO v_a_n, v_a_sched, v_a_active, v_a_cmd
    FROM cron.job j
   WHERE j.jobname = c_job;

  IF v_a_n <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (a): ha % agendamento(s) chamados % em cron.job (esperado exatamente 1). ZERO significa que a migration 20260823000012 nao esta aplicada neste banco — e entao a purga automatica NAO EXISTE: ha uma funcao completa que ninguem chama, e o heartbeat de D-46-14 nunca sera gravado. MAIS DE UM significa que o par desagendar-antes-de-agendar daquela migration nao mordeu, e a varredura rodaria duas vezes por noite — em live, duas passadas concorrentes disputando os mesmos titulares',
      v_a_n, c_job;
  END IF;

  IF v_a_sched IS DISTINCT FROM c_sched THEN
    RAISE EXCEPTION 'P46P FAIL (a): o schedule de % e [%] (esperado [%], UTC — D-46-10). pg_cron interpreta o schedule no fuso do servidor, que neste projeto e GMT; 03:00 UTC = 00:00 BRT, off-peak. Um horario diferente do declarado na migration significa que o agendamento vivo nao veio deste repositorio',
      c_job, coalesce(v_a_sched, 'NULL'), c_sched;
  END IF;

  IF v_a_active IS NOT TRUE THEN
    RAISE EXCEPTION 'P46P FAIL (a): o agendamento % existe mas NAO esta ativo. Um agendamento correto porem inativo e uma politica de retencao que continua nao rodando — o mesmo desfecho de nao ter agendamento nenhum, por outra via, e sem nenhum sinal alem desta coluna',
      c_job;
  END IF;

  v_a_md5 := md5(v_a_cmd);
  v_a_oct := octet_length(v_a_cmd);

  IF v_a_md5 IS DISTINCT FROM c_md5 THEN
    RAISE EXCEPTION 'P46P FAIL (a): o corpo VIVO de % NAO casa byte a byte com a migration. md5 vivo=% (esperado %), octetos=% (esperado 40). ⚠ E ESTA A ASSERCAO QUE TORNA DETECTAVEL UM CORPO ALTERADO FORA DO REPOSITORIO: cron.job.command e estado vivo que nenhum commit vigia, e este projeto mantem em aberto a hipotese processo-origem-do-drift-desconhecida. O corpo esperado e SO a chamada da funcao, entre os delimitadores nomeados de 20260823000012 — se ele ganhou SQL solto, a logica passou a viver fora de todo pin. Ver o bloco de PROVENIENCIA acima antes de considerar re-pinar',
      c_job, v_a_md5, c_md5, v_a_oct;
  END IF;

  -- Os TRÊS herdados, por igualdade exata de `jobname`. Correlacionado por
  -- `NOT EXISTS`, e não por pertencimento a conjunto: `jobname` é anulável.
  SELECT string_agg(x.nome, ', ' ORDER BY x.nome)
    INTO v_a_falta
    FROM unnest(c_herdados) AS x(nome)
   WHERE NOT EXISTS (SELECT 1 FROM cron.job j WHERE j.jobname = x.nome);

  IF v_a_falta IS NOT NULL THEN
    RAISE EXCEPTION 'P46P FAIL (a): agendamento(s) herdado(s) AUSENTE(S) depois da chegada do 4o job: [%]. A migration 20260823000012 declara, no escopo negativo, que nao menciona nenhum dos tres — se um deles sumiu, alguma coisa fora do escopo declarado foi executada. ⚠ Esta metade existe para que ESTE smoke e a assercao (a) do p42_invent05_cron_smoke.sql digam a MESMA coisa sobre o inventario: uma divergencia entre os dois seria silenciosa se so um deles olhasse',
      v_a_falta;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (a): o agendamento % existe UMA vez, schedule % (UTC), ativo, com o corpo pinado byte a byte (md5 %, % octetos) — e os tres agendamentos herdados continuam presentes por igualdade exata de jobname', c_job, v_a_sched, v_a_md5, v_a_oct;

  -- ══ (n) O COMENTÁRIO VIVO DE `notificacoes_enviadas` ════════════════════════
  -- ⚠ DUAS METADES, E AS DUAS IMPORTAM. Só a negativa passaria com o comentário
  --   APAGADO — e um objeto sem comentário não documenta política nenhuma. Só a
  --   positiva passaria com o texto antigo ainda anexado ao lado do novo. Juntas,
  --   elas dizem: a promessa-sem-código sumiu, e no lugar dela ficou a descrição
  --   da regra que existe.
  v_n_txt := obj_description('public.notificacoes_enviadas'::regclass, 'pg_class');

  v_n_diag := concat_ws(', '::text,
    CASE WHEN v_n_txt IS NULL OR btrim(v_n_txt) = ''
         THEN 'o COMMENT da tabela esta VAZIO'::text ELSE NULL END,
    CASE WHEN position('INDEFINITE' in coalesce(v_n_txt, '')) > 0
         THEN 'o texto AINDA declara retencao sem prazo (INDEFINITE)'::text ELSE NULL END,
    CASE WHEN position('criado_em' in coalesce(v_n_txt, '')) > 0
         THEN NULL ELSE 'o texto nao nomeia a coluna-ancora criado_em'::text END,
    CASE WHEN position('janela_notificacoes_meses' in coalesce(v_n_txt, '')) > 0
         THEN NULL ELSE 'o texto nao nomeia de onde a janela e lida (config_purga.janela_notificacoes_meses)'::text END,
    CASE WHEN position('varrer_purga_retencao' in coalesce(v_n_txt, '')) > 0
         THEN NULL ELSE 'o texto nao nomeia a funcao que executa a regra'::text END
  );

  IF v_n_diag IS NOT NULL AND v_n_diag <> '' THEN
    RAISE EXCEPTION 'P46P FAIL (n): medido [%]. Desde 2026-07-21 o COMMENT vivo desta tabela declarava "Retention INDEFINITE in v1 (LGPD-OPS purge deferred to M8)" — a promessa-sem-codigo que RETEN-05 existe para fechar, e a classe de achado que o CONSOL-04 audita. A migration 20260823000011 reescreve a ultima frase preservando todo o resto (trilha de auditoria, escopo do RH, negacao ao candidato, escrita so por service_role, idempotencia duravel). ⚠ Se a migration nao estiver aplicada, este e o achado esperado — e ele e o mesmo diagnostico, porque o objeto vivo e a unica prova que conta. Texto medido: [%]',
      v_n_diag, left(coalesce(v_n_txt, '<NULO>'), 400);
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (n): o COMMENT vivo de notificacoes_enviadas nao declara mais retencao sem prazo, E nomeia a coluna-ancora (criado_em), o escalar da janela (janela_notificacoes_meses) e a funcao que executa a regra';

  -- ══ ENVELOPE — a partir daqui tudo é revertido ══════════════════════════════
  -- ⚠ HIGIENE DE CLAIMS, e ela NÃO é redundante: `set_config(..., false)` é
  --   escopado à SESSÃO, e (o.6) é o único bloco deste arquivo que carimba
  --   claims. Ele as limpa, e (q) limpa de novo — este bloco limpa uma terceira
  --   vez porque tudo aqui roda com `auth.uid()` NULO, como o cron. Uma claim
  --   vazada faria a metade destrutiva do 4º ramo recusar (BL-02) e o diagnóstico
  --   apontaria para o dispatch, que não teria falhado.
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('request.jwt.claim.sub', '', false);

  BEGIN
    SELECT cp.modo, cp.cap_titulares, cp.janela_notificacoes_meses
      INTO v_modo0, v_cap0, v_m_janela
      FROM public.config_purga cp;

    -- Gatilhos de despacho sobre a tabela que (m) muta, desligados POR CRITÉRIO
    -- MEDIDO DO CATÁLOGO e nunca por lista fixa de nomes (lição do 46-01: o
    -- repositório anunciava 2, o catálogo vivo tinha 3). Se o critério não casar
    -- nada, o contador fica em 0 — e isso é "medi e não havia", não "não olhei".
    FOR r_t IN
      SELECT c.relname AS tabela, t.tgname AS gatilho
        FROM pg_trigger t
        JOIN pg_class c     ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_proc p      ON p.oid = t.tgfoid
       WHERE NOT t.tgisinternal
         AND n.nspname = 'public'
         AND c.relname = 'notificacoes_enviadas'
         AND t.tgenabled <> 'D'
         AND pg_get_functiondef(p.oid) LIKE '%net.http_post%'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER %I', r_t.tabela, r_t.gatilho);
      v_t_off := v_t_off + 1;
    END LOOP;

    -- ── (g) O CONTRATO DE FRONTEIRA DO CAP ────────────────────────────────────
    -- ⚠ O NÚMERO DE ELEGÍVEIS NÃO É UMA CONSTANTE ESCRITA AQUI, e não é uma
    --   segunda cópia do predicado: ele é DESCOBERTO pela própria função, com o
    --   cap no teto do domínio (500), e lido do ledger. Uma constante envelheceria
    --   com a fixture; uma reimplementação do predicado seria a segunda definição
    --   que o P39/CR-02 nomeia.
    UPDATE public.config_purga SET modo = 'dry_run', cap_titulares = 500;

    SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;
    PERFORM public.varrer_purga_retencao();
    SELECT e.veredito, e.elegiveis INTO v_g0_ver, v_g0_eleg
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);
    v_g_n := v_g0_eleg;

    -- ⊕ PONTO 1 DA FRONTEIRA: `elegiveis = cap` — TEM de RODAR.
    IF v_g_n BETWEEN 2 AND 498 THEN
      UPDATE public.config_purga SET cap_titulares = v_g_n;
      SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;
      PERFORM public.varrer_purga_retencao();
      SELECT count(*) INTO v_g1_novas
        FROM public.purga_execucoes e
       WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);
      SELECT e.id, e.veredito, e.elegiveis INTO v_g1_id, v_g1_ver, v_g1_eleg
        FROM public.purga_execucoes e
       WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

      -- ⊕ PONTO 2: `elegiveis = cap - 1` — TEM de RODAR.
      UPDATE public.config_purga SET cap_titulares = v_g_n + 1;
      SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;
      PERFORM public.varrer_purga_retencao();
      SELECT e.id, e.veredito, e.elegiveis INTO v_g2_id, v_g2_ver, v_g2_eleg
        FROM public.purga_execucoes e
       WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

      -- ⊖ PONTO 3: `elegiveis = cap + 1` — TEM de ABORTAR.
      UPDATE public.config_purga SET cap_titulares = v_g_n - 1;
      SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;
      PERFORM public.varrer_purga_retencao();
      SELECT e.id, e.veredito, e.elegiveis, e.processados INTO v_g3_id, v_g3_ver, v_g3_eleg, v_g3_proc
        FROM public.purga_execucoes e
       WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);
      SELECT count(*) INTO v_g3_itens
        FROM public.purga_execucao_itens i WHERE i.execucao_id = v_g3_id;

      -- ⊖ D-46-08 NA FORMA QUE O PLANO PEDE: cap = 1 com 2+ elegíveis, e a prova
      --   de que o aborto é INTEGRAL — zero item e zero requisição enfileirada.
      BEGIN
        IF to_regclass('net.http_request_queue') IS NULL THEN
          v_fila_ok   := false;
          v_fila_nota := 'net.http_request_queue nao existe neste banco';
        ELSE
          EXECUTE $fila$SELECT count(*) FROM net.http_request_queue q
                         WHERE q.url LIKE '%/functions/v1/purgar-retencao'$fila$ INTO v_fila_a;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_fila_ok   := false;
        v_fila_nota := format('leitura de pg_net recusada (%s: %s)', SQLSTATE, SQLERRM);
      END;

      UPDATE public.config_purga SET cap_titulares = 1;
      SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;
      PERFORM public.varrer_purga_retencao();
      SELECT e.id, e.veredito, e.elegiveis, e.processados INTO v_g4_id, v_g4_ver, v_g4_eleg, v_g4_proc
        FROM public.purga_execucoes e
       WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);
      SELECT count(*) INTO v_g4_itens
        FROM public.purga_execucao_itens i WHERE i.execucao_id = v_g4_id;

      IF v_fila_ok THEN
        BEGIN
          EXECUTE $fila$SELECT count(*) FROM net.http_request_queue q
                         WHERE q.url LIKE '%/functions/v1/purgar-retencao'$fila$ INTO v_fila_g;
        EXCEPTION WHEN OTHERS THEN
          v_fila_ok   := false;
          v_fila_nota := format('leitura de pg_net recusada apos o run (%s: %s)', SQLSTATE, SQLERRM);
        END;
      END IF;
    END IF;

    -- ── (m) RETEN-05, COM FIXTURE RETRODATADA ─────────────────────────────────
    SELECT c.candidato_id INTO v_m_cand
      FROM public.candidaturas c WHERE c.id = c_cdt_pos1;

    SELECT format('candidatos=%s candidaturas=%s users=%s',
                  (SELECT count(*) FROM public.candidatos),
                  (SELECT count(*) FROM public.candidaturas),
                  (SELECT count(*) FROM auth.users))
      INTO v_m_dom_a;

    SELECT count(*) INTO v_m_hist_a
      FROM public.historico_candidatura h WHERE h.candidatura_id = c_cdt_pos1;
    SELECT count(*) INTO v_m_dec_a
      FROM public.decisao_final d WHERE d.candidatura_id = c_cdt_pos1;

    IF v_m_cand IS NOT NULL THEN
      -- ⚠ `status = 'entregue'` NÃO é decoração: é um estado TERMINAL, e uma linha
      --   terminal não é selecionada por `varrer_retry_notificacoes` (o cron
      --   `notif-retry-sweep`, a cada 15 min). Mesmo no cenário impossível em que
      --   este envelope commitasse, nenhuma dessas duas linhas geraria despacho de
      --   e-mail. `pendente` — o default da coluna — geraria.
      INSERT INTO public.notificacoes_enviadas
             -- ⚠ `destinatario_original` e NOT NULL e nao tem default (M7/DELIV): e o
             --   endereco ANTES do redirecionamento do modo de teste, e e a segunda
             --   coluna que o passo `scrub_ledger_email` do plano de exclusao limpa.
             --   Omiti-la aqui derrubava a fixture inteira com 23502 — medido em PROD
             --   em 2026-08-23, e invisivel a quem escreve o smoke sem banco a mao.
             (id, evento, candidatura_id, candidato_id, template, destinatario_email,
              destinatario_original, status, dedupe_key, criado_em)
      VALUES (c_nt_fora, 'decisao', c_cdt_pos1, v_m_cand, 'p46-reten05-fixture',
              'fixture-p46+reten05@invalido.local',
              'fixture-p46+reten05@invalido.local', 'entregue',
              'p46-reten05:fora-da-janela:' || c_nt_fora::text,
              pg_catalog.now() - make_interval(months => v_m_janela + 2)),
             (c_nt_dentro, 'decisao', c_cdt_pos1, v_m_cand, 'p46-reten05-fixture',
              'fixture-p46+reten05@invalido.local',
              'fixture-p46+reten05@invalido.local', 'entregue',
              'p46-reten05:dentro-da-janela:' || c_nt_dentro::text,
              pg_catalog.now() - interval '1 day');
      GET DIAGNOSTICS v_m_ins = ROW_COUNT;
    END IF;

    SELECT count(*) INTO v_m_fora_a
      FROM public.notificacoes_enviadas n WHERE n.id = c_nt_fora;
    SELECT count(*) INTO v_m_dentro_a
      FROM public.notificacoes_enviadas n WHERE n.id = c_nt_dentro;

    -- ⚠ `live` COM O CAP NO TETO: o que (m) mede é RETEN-05 e o dispatch, não a
    --   fronteira do cap — essa é (g), e misturar as duas faria um defeito de uma
    --   aparecer como falha da outra.
    UPDATE public.config_purga SET modo = 'live', cap_titulares = 500;

    SELECT coalesce(array_agg(e.id), ARRAY[]::uuid[]) INTO v_vistos FROM public.purga_execucoes e;
    PERFORM public.varrer_purga_retencao();

    SELECT e.id, e.veredito, e.situacao, e.elegiveis, e.processados, e.notificacoes_expurgadas
      INTO v_m_id, v_m_ver, v_m_sit, v_m_eleg, v_m_proc, v_m_exp
      FROM public.purga_execucoes e
     WHERE NOT EXISTS (SELECT 1 FROM unnest(v_vistos) AS s(id) WHERE s.id = e.id);

    SELECT count(*) INTO v_m_itens
      FROM public.purga_execucao_itens i WHERE i.execucao_id = v_m_id;
    SELECT count(*) INTO v_m_abertos
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_m_id AND i.concluido_em IS NULL;
    SELECT count(*) INTO v_m_falhas
      FROM public.purga_execucao_itens i
     WHERE i.execucao_id = v_m_id AND i.desfecho_postgres = 'falha';

    SELECT count(*) INTO v_m_fora_z
      FROM public.notificacoes_enviadas n WHERE n.id = c_nt_fora;
    SELECT count(*) INTO v_m_dentro_z
      FROM public.notificacoes_enviadas n WHERE n.id = c_nt_dentro;

    SELECT format('candidatos=%s candidaturas=%s users=%s',
                  (SELECT count(*) FROM public.candidatos),
                  (SELECT count(*) FROM public.candidaturas),
                  (SELECT count(*) FROM auth.users))
      INTO v_m_dom_z;

    SELECT count(*) INTO v_m_hist_z
      FROM public.historico_candidatura h WHERE h.candidatura_id = c_cdt_pos1;
    SELECT count(*) INTO v_m_dec_z
      FROM public.decisao_final d WHERE d.candidatura_id = c_cdt_pos1;

    IF v_fila_ok THEN
      BEGIN
        EXECUTE $fila$SELECT count(*) FROM net.http_request_queue q
                       WHERE q.url LIKE '%/functions/v1/purgar-retencao'$fila$ INTO v_fila_m;
      EXCEPTION WHEN OTHERS THEN
        v_fila_ok   := false;
        v_fila_nota := format('leitura de pg_net recusada apos o run em live (%s: %s)', SQLSTATE, SQLERRM);
      END;
    END IF;

    -- Religa os gatilhos DENTRO do envelope — redundante com o rollback, e a
    -- redundância é o ponto: deixar um despachante desligado é pior que o
    -- problema que o desligamento evitava.
    FOR r_t IN
      SELECT c.relname AS tabela, t.tgname AS gatilho
        FROM pg_trigger t
        JOIN pg_class c     ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_proc p      ON p.oid = t.tgfoid
       WHERE NOT t.tgisinternal
         AND n.nspname = 'public'
         AND c.relname = 'notificacoes_enviadas'
         AND t.tgenabled = 'D'
         AND pg_get_functiondef(p.oid) LIKE '%net.http_post%'
    LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER %I', r_t.tabela, r_t.gatilho);
      v_t_back := v_t_back + 1;
    END LOOP;

    SELECT count(*) INTO v_t_rest
      FROM pg_trigger t
      JOIN pg_class c     ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p      ON p.oid = t.tgfoid
     WHERE NOT t.tgisinternal
       AND n.nspname = 'public'
       AND c.relname = 'notificacoes_enviadas'
       AND t.tgenabled = 'D'
       AND pg_get_functiondef(p.oid) LIKE '%net.http_post%';

    UPDATE public.config_purga SET modo = v_modo0, cap_titulares = v_cap0;

    RAISE EXCEPTION 'rollback_smoke46r_envelope' USING ERRCODE = 'P46B0';
  EXCEPTION
    WHEN sqlstate 'P46B0' THEN
      NULL;  -- reversao ESPERADA; as variaveis acima sobreviveram ao rollback
  END;

  RESET ROLE;

  -- ══ JULGAMENTO — sobre variáveis, sem uma única consulta viva ═══════════════

  -- ── (g) ───────────────────────────────────────────────────────────────────
  IF v_g0_ver IS DISTINCT FROM 'dry_run' THEN
    RAISE EXCEPTION 'P46P FAIL (g): a execucao de DESCOBERTA, com o cap no teto do dominio (500), terminou em veredito [%] (esperado dry_run). Sem ela nao ha numero de elegiveis vindo da PROPRIA funcao, e os tres pontos da fronteira teriam de ser escritos contra uma constante — que e a forma que envelhece. ⚠ Se o veredito veio segredo_ausente, os segredos project_url e edge_invoke_key nao estao no cofre e a migration 20260823000011 aborta o dry_run de proposito (ver a DIVERGENCIA 2 do cabecalho dela)',
      coalesce(v_g0_ver, 'NULL');
  END IF;

  IF v_g_n IS NULL OR v_g_n < 2 OR v_g_n > 498 THEN
    RAISE EXCEPTION 'P46P FAIL (g): ⊖ NAO-VACUIDADE — o conjunto elegivel medido e % (exigido entre 2 e 498). Com menos de 2 elegiveis a fronteira do cap NAO PODE ser exercitada: nao existe cap inteiro que aborte com 1 elegivel e ainda deixe um ponto que rode. Uma assercao de cap sobre conjunto de 1 passaria por vacuidade, exatamente como o kill switch provado sobre conjunto vazio. Reaplicar a fixture do 46-01 (pos1, pos2, pos3, cap2 = 4 titulares)',
      coalesce(v_g_n, -1);
  END IF;

  IF v_g1_novas IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P46P FAIL (g): a passada de cap = elegiveis gravou % linha(s) nova(s) de purga_execucoes (esperado exatamente 1). O heartbeat e gravado em TODA execucao; zero linha significa que a funcao retornou antes dele, e mais de uma que este bloco esta lendo execucao alheia',
      coalesce(v_g1_novas, -1);
  END IF;

  IF v_g1_ver IS DISTINCT FROM 'dry_run' OR v_g1_eleg IS DISTINCT FROM v_g_n THEN
    RAISE EXCEPTION 'P46P FAIL (g): ⊕ PONTO 1 DA FRONTEIRA — com cap = elegiveis = %, a execucao terminou em veredito [%] com elegiveis = % (esperado dry_run e %). A comparacao do aborto e > ESTRITO: elegiveis IGUAL ao cap TEM de rodar. Se ela abortou aqui, o cap virou >= e a purga passa a recusar exatamente o lote que o operador dimensionou',
      v_g_n, coalesce(v_g1_ver, 'NULL'), coalesce(v_g1_eleg, -1), v_g_n;
  END IF;

  IF v_g2_ver IS DISTINCT FROM 'dry_run' OR v_g2_eleg IS DISTINCT FROM v_g_n THEN
    RAISE EXCEPTION 'P46P FAIL (g): ⊕ PONTO 2 DA FRONTEIRA — com cap = % (um acima dos % elegiveis), a execucao terminou em veredito [%] com elegiveis = % (esperado dry_run e %). Sem os dois pontos que RODAM, esta assercao provaria apenas que a funcao recusa — e uma funcao que recusa tudo passa em qualquer bateria so de negativas (modo de falha no 3 dos sete portoes da Phase 45)',
      v_g_n + 1, v_g_n, coalesce(v_g2_ver, 'NULL'), coalesce(v_g2_eleg, -1), v_g_n;
  END IF;

  IF v_g3_ver IS DISTINCT FROM 'cap_excedido' OR v_g3_eleg IS DISTINCT FROM v_g_n
     OR v_g3_proc IS DISTINCT FROM 0 OR v_g3_itens IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P46P FAIL (g): ⊖ PONTO 3 DA FRONTEIRA — com cap = % (um ABAIXO dos % elegiveis), a execucao terminou em veredito [%], elegiveis = %, processados = %, itens = % (esperado cap_excedido, %, 0 e 0). Um unico item gravado aqui significaria que a funcao RECORTOU o trabalho pelo cap em vez de abortar, e D-46-08 recusa isso por escrito: um conjunto acima do cap e sinal de PREDICADO QUEBRADO, e processar ate o cap apagaria gente em silencio — com PITR desligado e o Storage fora do backup, irrecuperavelmente',
      v_g_n - 1, v_g_n, coalesce(v_g3_ver, 'NULL'), coalesce(v_g3_eleg, -1), coalesce(v_g3_proc, -1), coalesce(v_g3_itens, -1), v_g_n;
  END IF;

  IF v_g4_ver IS DISTINCT FROM 'cap_excedido' OR v_g4_eleg IS DISTINCT FROM v_g_n
     OR v_g4_proc IS DISTINCT FROM 0 OR v_g4_itens IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P46P FAIL (g): ⊖ D-46-08 COM cap = 1 E % ELEGIVEIS — veredito [%], elegiveis = %, processados = %, itens = % (esperado cap_excedido, %, 0 e 0). Este e o caso extremo do aborto integral, e ele e medido em separado do ponto 3 de proposito: um cap recem-reduzido a 1 por um operador assustado tem de abortar TUDO, e nao processar o primeiro da fila',
      v_g_n, coalesce(v_g4_ver, 'NULL'), coalesce(v_g4_eleg, -1), coalesce(v_g4_proc, -1), coalesce(v_g4_itens, -1), v_g_n;
  END IF;

  IF v_fila_ok AND v_fila_g IS DISTINCT FROM v_fila_a THEN
    RAISE EXCEPTION 'P46P FAIL (g): ⊖ o aborto por cap ENFILEIROU requisicao — a fila do pg_net para /functions/v1/purgar-retencao tinha % linha(s) antes e % depois. O despacho do pg_net so ocorre no COMMIT, entao retornar antes garante zero request por ESTRUTURA; uma linha a mais significa que o ramo de dispatch passou a ser alcancavel de um caminho que retorna',
      coalesce(v_fila_a, -1), coalesce(v_fila_g, -1);
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (g): fronteira do cap com % elegiveis — cap = % RODA (%), cap = % RODA (%), cap = % ABORTA (%, 0 itens) e cap = 1 ABORTA (%, 0 itens). Fila do pg_net: %',
    v_g_n, v_g_n, v_g1_ver, v_g_n + 1, v_g2_ver, v_g_n - 1, v_g3_ver, v_g4_ver,
    CASE WHEN v_fila_ok THEN format('%s antes, %s depois — inalterada', v_fila_a, v_fila_g) ELSE v_fila_nota END;

  -- ── (m) ───────────────────────────────────────────────────────────────────
  IF v_m_cand IS NULL OR v_m_ins <> 2 OR v_m_fora_a <> 1 OR v_m_dentro_a <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (m): ⊖ NAO-VACUIDADE DA FIXTURE — a candidatura pos1 (%) resolveu para o titular [%], % notificacao(oes) sintetica(s) foi(ram) inserida(s) (esperado 2), e antes da varredura a de FORA da janela existia % vez(es) e a de DENTRO % vez(es) (esperado 1 e 1). Sem a linha retrodatada, RETEN-05 nao teria o que apagar: medido em 2026-08-23, a linha mais antiga viva de notificacoes_enviadas e de 2026-07-31 e a janela e de % meses, entao o alcance real da regra hoje e ZERO e uma assercao sobre as linhas vivas passaria com o DELETE removido do corpo da funcao',
      c_cdt_pos1, coalesce(v_m_cand::text, 'NULL'), v_m_ins, coalesce(v_m_fora_a, -1), coalesce(v_m_dentro_a, -1), coalesce(v_m_janela, -1);
  END IF;

  IF v_m_ver IS DISTINCT FROM 'despachado' THEN
    RAISE EXCEPTION 'P46P FAIL (m): a varredura em live terminou em veredito [%] (esperado despachado). ⚠ Se veio segredo_ausente, os segredos project_url e edge_invoke_key nao estao no cofre — a migration 20260823000011 grava esse veredito e RETORNA de proposito, porque um retorno mudo seria indistinguivel de "nada elegivel". Se veio cap_excedido, o cap ficou abaixo dos elegiveis e este bloco esta medindo (g) por engano. Se veio dry_run, o ramo live nao foi tomado e nenhum despacho existe',
      coalesce(v_m_ver, 'NULL');
  END IF;

  IF v_m_eleg IS NULL OR v_m_eleg < 2 THEN
    RAISE EXCEPTION 'P46P FAIL (m): ⊖ NAO-VACUIDADE DO CONJUNTO — a varredura em live viu % elegivel(is) (exigido >= 2). Com conjunto vazio nao ha item, nao ha despacho, e as metades ⊕ desta assercao passariam sem medir nada',
      coalesce(v_m_eleg, -1);
  END IF;

  IF v_m_fora_z <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (m): a notificacao RETRODATADA para % meses atras (janela vigente: % meses) CONTINUA existindo depois da varredura em live. RETEN-05 nao apagou o que tinha de apagar — e a promessa que o COMMENT da tabela passou a fazer virou de novo uma promessa sem codigo. Conferir a secao (a.4) de 20260823000011: a ancora e criado_em (a unica coluna temporal NOT NULL da tabela) e a janela vem de config_purga.janela_notificacoes_meses',
      coalesce(v_m_janela, 0) + 2, coalesce(v_m_janela, -1);
  END IF;

  IF v_m_dentro_z <> 1 THEN
    RAISE EXCEPTION 'P46P FAIL (m): ⊖ A NOTIFICACAO DE DENTRO DA JANELA (criada ha 1 dia) sobreviveu % vez(es), esperado 1. Se ela SUMIU, isto e pior que a regra nao rodar: significa que o predicado nao discrimina pela data e que RETEN-05 esta apagando trilha de auditoria viva. Com PITR desligado (D-45-10) nao ha de onde recuperar',
      coalesce(v_m_dentro_z, -1);
  END IF;

  IF v_m_exp IS NULL OR v_m_exp < 1 THEN
    RAISE EXCEPTION 'P46P FAIL (m): a linha de ledger da execucao em live registrou notificacoes_expurgadas = % (esperado >= 1, porque uma linha retrodatada foi apagada). O expurgo aconteceu mas o registro nao — e um ato irreversivel sem registro e, para efeito de prova de cumprimento, indistinguivel de um ato que nao aconteceu',
      coalesce(v_m_exp, -1);
  END IF;

  IF v_m_dom_z IS DISTINCT FROM v_m_dom_a THEN
    RAISE EXCEPTION 'P46P FAIL (m): ⊖ A INDEPENDENCIA DA REGRA NAO FOI PROVADA — as contagens de dominio MUDARAM na mesma execucao. Antes: [%]. Depois: [%]. RETEN-05 tem de apagar notificacao SEM que nenhuma candidatura ou candidato tenha sido apagado: as FKs ON DELETE CASCADE de notificacoes_enviadas levariam as notificacoes junto se a candidatura sumisse, e entao a linha teria sumido pela CASCATA e nao pela regra. Sem esta metade, um expurgo por cascata passaria por cumprimento da regra independente',
      v_m_dom_a, v_m_dom_z;
  END IF;

  IF v_m_hist_z IS DISTINCT FROM v_m_hist_a OR v_m_dec_z IS DISTINCT FROM v_m_dec_a THEN
    RAISE EXCEPTION 'P46P FAIL (m): ⊖ A TRILHA DE DECISAO HUMANA FOI TOCADA. historico_candidatura da candidatura % foi de % para %, e decisao_final de % para %. A purga NUNCA destroi a trilha que prova nao-discriminacao (Art. 7o, VI): RETEN-05 apaga NOTIFICACAO, jamais historico_candidatura ou decisao_final, e o escopo do unico verbo de exclusao daquele corpo e uma tabela so',
      c_cdt_pos1, coalesce(v_m_hist_a, -1), coalesce(v_m_hist_z, -1), coalesce(v_m_dec_a, -1), coalesce(v_m_dec_z, -1);
  END IF;

  -- ⊕ A PROVA DURÁVEL DE QUE O DISPATCH RODOU, e ela não depende do `pg_net`.
  --   Em `live` o laço NÃO fecha o item (`reivindicar_item_purga` exige
  --   `concluido_em IS NULL`), e um post que falhasse fecharia AQUELE item com
  --   `desfecho_postgres = 'falha'`. Logo: todos os itens abertos + zero falha +
  --   `veredito = 'despachado'` só é possível se o laço de dispatch percorreu
  --   todos e nenhum enfileiramento levantou. É verificável no ledger, que é
  --   durável — ao contrário das tabelas do `pg_net`, que são UNLOGGED com TTL.
  IF v_m_itens IS DISTINCT FROM v_m_eleg::bigint OR v_m_abertos IS DISTINCT FROM v_m_itens
     OR v_m_falhas IS DISTINCT FROM 0 OR v_m_sit IS DISTINCT FROM 'executando' THEN
    RAISE EXCEPTION 'P46P FAIL (m): ⊕ O DISPATCH DO RAMO live NAO SE COMPORTOU. itens = % (esperado % = elegiveis), abertos = % (esperado igual a itens), com desfecho_postgres = falha: % (esperado 0), situacao = [%] (esperado executando). ⚠ ITEM FECHADO AQUI E O DEFEITO MAIS CARO DESTE RAMO: reivindicar_item_purga exige concluido_em nulo, entao a Edge Function receberia P46FB e o despacho inteiro viraria 403 — a purga rodaria todas as noites despachando e sendo recusada, com o ledger dizendo despachado. E situacao concluida fecharia o cabecalho antes de a Edge Function reivindicar, o que tambem recusa (o guard exige executando)',
      coalesce(v_m_itens, -1), coalesce(v_m_eleg, -1), coalesce(v_m_abertos, -1), coalesce(v_m_falhas, -1), coalesce(v_m_sit, 'NULL');
  END IF;

  IF v_m_proc IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'P46P FAIL (m): no fim da varredura em live, processados vale % (esperado 0). No instante do despacho NENHUM titular teve o motor destrutivo executado — o COMMENT da coluna diz exatamente isso —, e quem a incrementa e concluir_item_purga, uma vez por item cujo motor rodou. Somar os posts aqui daria contagem DUPLA, terminando em 2N',
      v_m_proc;
  END IF;

  IF v_t_back <> v_t_off OR v_t_rest <> 0 THEN
    RAISE EXCEPTION 'P46P FAIL (m): higiene de gatilhos — % desligado(s), % religado(s), % ainda DESLIGADO(S) sobre notificacoes_enviadas (esperado religar todos e restar 0). Deixar um despachante desligado em PROD e pior que o problema que o desligamento evitava',
      v_t_off, v_t_back, v_t_rest;
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (m): RETEN-05 apagou a notificacao retrodatada (% meses) e PRESERVOU a de dentro da janela; notificacoes_expurgadas = %; ⊖ contagens de dominio identicas [%], historico_candidatura % -> % e decisao_final % -> %; ⊕ o dispatch abriu % item(ns), nenhum com falha, execucao em [%] com veredito [%]. Fila do pg_net: %. Gatilhos: % desligados, % religados',
    coalesce(v_m_janela, 0) + 2, v_m_exp, v_m_dom_z, v_m_hist_a, v_m_hist_z, v_m_dec_a, v_m_dec_z,
    v_m_abertos, v_m_sit, v_m_ver,
    CASE WHEN v_fila_ok THEN format('%s linha(s) para a Edge Function depois do run em live (era %s)', v_fila_m, v_fila_g) ELSE v_fila_nota END,
    v_t_off, v_t_back;

  RAISE NOTICE 'P46P TEARDOWN ok (a/g/m/n): envelope revertido — config_purga volta a modo [%] e cap [%], e as duas notificacoes sinteticas NAO existem', coalesce(v_modo0, 'NULL'), coalesce(v_cap0, -1);
END $r$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 46-07 · O PORTÃO DO FLIP E A TRILHA — (d) e (e)
-- ─────────────────────────────────────────────────────────────────────────────
-- (d) ⊖⊕ `public.salvar_config_purga` RECUSA a transição `dry_run → live` quando
--     falta QUALQUER critério — cinco casos, **um critério de cada vez** —,
--     ACEITA quando os cinco estão satisfeitos, e **NUNCA** recusa a transição
--     para `off` (PURGA-04 · PURGA-05 · D-46-14 · D-46-22).
-- (e) Uma mudança de modo bem-sucedida grava EXATAMENTE UMA linha em
--     `logs_auditoria`, na MESMA transação, com ator resolvido no servidor e os
--     dois estados registrados e DIFERENTES (PURGA-04).
--
-- ⚠⚠ ESTE BLOCO PLANTA O PRÓPRIO LEDGER SINTÉTICO, E ISSO É OBRIGATÓRIO.
--   Medido em 2026-08-23, o estado real de PROD **não satisfaz** nenhum critério
--   de D-46-14 — e não pode: `min(iniciada_em)` de `purga_execucoes` é de
--   2026-08-22 (UM dia contra os catorze exigidos) e há TRÊS execuções contra as
--   catorze. Isso é o desenho funcionando, não um defeito a contornar.
--
--   Mas a razão de plantar não é "hoje não dá" — é que **uma asserção que
--   dependesse do estado real deixaria de asserir sozinha**. Daqui a duas semanas
--   os critérios de dias e de execuções passariam a valer em PROD por si, e os
--   dois casos negativos correspondentes ficariam VERDES sem medir coisa alguma:
--   um instantâneo travestido de invariante, a mesma forma de defeito que o
--   `CLAUDE.md` cataloga e que esta fase já pagou três vezes. O ledger sintético
--   torna cada caso construído por este bloco e **independente do calendário**.
--
-- ⚠⚠ E O CASO POSITIVO É O QUE FAZ (d) SER ASSERÇÃO EM VEZ DE PROMESSA.
--   Sem ele, (d) provaria apenas que a função recusa — e uma função que recusa
--   TUDO passaria nas cinco negativas, com a descoberta chegando no dia do flip.
--   É o modo de falha nº 3 dos sete portões da Phase 45, e é literalmente o que
--   aconteceu com a `(p.3)` deste mesmo arquivo, que atravessou três rodadas de
--   review sendo estruturalmente incapaz de passar porque o guard sempre recusava
--   e o ramo de sucesso nunca era executado. **Aqui o ramo de sucesso RODA.**
--
-- ⚠ A JANELA DE `DELETE` SOBRE O LEDGER, DITA POR EXTENSO PORQUE ELA ASSUSTA.
--   O caso "menos de 14 execuções" é o único que **não pode** ser montado por
--   acréscimo: a contagem só desce removendo linhas. Ele é montado dentro de uma
--   subtransação PRÓPRIA, aninhada, que é revertida IMEDIATAMENTE — e não apenas
--   no fim do envelope. A janela em que o ledger fica alterado tem três
--   statements. E, porque prosa que afirma uma propriedade não é a propriedade,
--   a restauração é **MEDIDA**: a impressão digital das duas tabelas do ledger é
--   capturada antes do envelope e reconferida depois dele.
--
-- ⚠ ESTA É A ÚNICA MEDIÇÃO LEGÍTIMA DEPOIS DO ROLLBACK deste arquivo, e a
--   distinção importa. A regra do cabeçalho existe por causa da lição nº 6 dos
--   sete portões da Phase 45: uma asserção que media um estado que ela mesma
--   tinha destruído reprovava em TODA execução correta. Aqui é o oposto — o que
--   se afere é que o estado **voltou**, o que é verdade exatamente quando o run
--   está correto, e falso exatamente quando algo grave aconteceu.
--
-- ⚠ ⊖ E O KILL SWITCH É PROVADO COM OS TRÊS CRITÉRIOS FALHANDO DE PROPÓSITO.
--   A partir do `live` montado pelo caso positivo, uma chamada para `off` passa
--   SEM confirmação, SEM ledger suficiente e COM a matriz em procedência de seed.
--   Um kill switch que pode ser recusado não é um kill switch, e o momento em que
--   ele mais importa é exatamente aquele em que algum critério estaria falhando.
--
-- ⚠ CLAIMS: este é o segundo bloco do arquivo que carimba `request.jwt.claims`
--   (o primeiro é (o.6)) — a função exige papel de administrador E conta viva de
--   RH, e sem sessão ela recusaria com 42501 em TODOS os casos, inclusive no
--   positivo, que passaria a provar nada. As claims são limpas logo depois do
--   envelope, antes do RESUMO (z).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $de$
DECLARE
  v_fn           oid;

  -- impressão digital do ledger, para provar a restauração
  v_led_n_a      bigint;
  v_led_fp_a     text;
  v_led_n_z      bigint;
  v_led_fp_z     text;

  -- o ator
  v_admin_rh     uuid;
  v_admin_auth   uuid;
  v_uid_ok       int := -1;

  -- estado real medido, só para o NOTICE
  v_real_n       bigint;
  v_real_min     timestamptz;
  v_real_eleg    bigint;
  v_modo0        text;

  -- (d) as sete chamadas de controle
  v_d_st         text[] := ARRAY[]::text[];
  v_d_msg        text[] := ARRAY[]::text[];
  v_marc         text[] := ARRAY[]::text[];
  v_d_modo_pos   text;
  v_d_modo_off   text;
  v_d_conta13    bigint := -1;

  -- (e) a trilha
  v_e_ids        uuid[];
  v_e_base       bigint;
  v_e_delta      bigint := -1;
  v_e_usuario    uuid;
  v_e_antes      jsonb;
  v_e_depois     jsonb;
  v_e_sev        text;
  v_e_cat        text;
  v_e_acao_z     bigint := -1;

  v_msg          text;
BEGIN
  -- ══ CATÁLOGO — a função existe. FORA do envelope, de propósito: sem ela o
  --    resto do bloco mediria a ausência dela em vez do comportamento dela.
  --    ⚠ `to_regprocedure`, jamais `to_regproc`: o segundo devolve NULL SEMPRE
  --    que recebe assinatura com tipos, e foi assim que cinco portões da Phase 45
  --    passaram medindo nada.
  v_fn := to_regprocedure('public.salvar_config_purga(text,integer,integer,boolean)')::oid;

  IF v_fn IS NULL THEN
    RAISE EXCEPTION 'P46P FAIL (d): public.salvar_config_purga(text,integer,integer,boolean) resolveu para NULL — a migration 20260823000013 nao esta aplicada neste banco. Sem ela config_purga NAO TEM caminho de escrita de aplicacao nenhum (a tabela tem RLS ligada e zero policy de escrita), e portanto nem o flip nem o kill switch existem';
  END IF;

  -- ══ IMPRESSÃO DIGITAL DAS DUAS TABELAS DO LEDGER, ANTES DE QUALQUER COISA ══
  --    `to_jsonb` da linha inteira NÃO ENVELHECE: uma coluna nova entra sozinha
  --    na impressão, sem uma segunda edição deste arquivo. Uma lista de colunas
  --    aqui seria a fotografia que o `CLAUDE.md` manda evitar.
  SELECT count(*), md5(coalesce(string_agg(t.linha, E'\n' ORDER BY t.linha), ''))
    INTO v_led_n_a, v_led_fp_a
    FROM (SELECT to_jsonb(e)::text AS linha FROM public.purga_execucoes e
          UNION ALL
          SELECT to_jsonb(i)::text        FROM public.purga_execucao_itens i) t;

  -- ══ O ATOR — um administrador VIVO, resolvido como a RPC o resolve ═════════
  --    ⚠ Sem administrador vivo NÃO há skip silencioso: um skip aqui seria
  --    indistinguível de uma RPC que aceita qualquer um, e o gate ficaria verde
  --    por AUSÊNCIA DE TESTE.
  SELECT u.id, u.user_id INTO v_admin_rh, v_admin_auth
    FROM public.usuarios_rh u
   WHERE u.role = 'administrador'
     AND u.ativo
     AND u.deleted_at IS NULL
   ORDER BY u.created_at
   LIMIT 1;

  IF v_admin_rh IS NULL OR v_admin_auth IS NULL THEN
    RAISE EXCEPTION 'P46P FAIL (d): nenhum administrador VIVO em public.usuarios_rh (id=[%], user_id=[%]) — a RPC resolve o ator no SERVIDOR contra essa tabela e recusaria com 42501 em TODOS os casos, inclusive no positivo. Um skip silencioso aqui deixaria o portao do flip sem asseracao nenhuma',
      coalesce(v_admin_rh::text, 'NULL'), coalesce(v_admin_auth::text, 'NULL');
  END IF;

  -- Estado real, só para o relatório — nenhuma decisão deste bloco depende dele.
  SELECT count(*), min(e.iniciada_em), count(*) FILTER (WHERE e.elegiveis > 0)
    INTO v_real_n, v_real_min, v_real_eleg
    FROM public.purga_execucoes e;

  -- ══ ENVELOPE — a partir daqui tudo é revertido ═════════════════════════════
  BEGIN
    SELECT cp.modo INTO v_modo0 FROM public.config_purga cp;

    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin_auth::text,
                        'app_metadata', json_build_object('role', 'administrador'))::text, false);
    PERFORM set_config('request.jwt.claim.sub', '', false);

    -- ⚠ NÃO-VACUIDADE DA IMPERSONAÇÃO, medida e não presumida: se a troca de
    --   claims falhasse, TODAS as chamadas abaixo rodariam com `auth.uid()` nulo,
    --   a RPC recusaria com 42501 em todas, e as cinco negativas ficariam VERDES
    --   medindo o guard de papel em vez do portão do flip.
    SELECT count(*) INTO v_uid_ok FROM (SELECT auth.uid() AS u) s WHERE s.u IS NOT NULL;

    -- A transição sob teste é `dry_run → live`, e não `off → live`: é a que o
    -- runbook descreve e a única que o operador executará daqui a duas semanas.
    UPDATE public.config_purga SET modo = 'dry_run';

    -- ══ O LEDGER SINTÉTICO SATISFATÓRIO ═════════════════════════════════════
    -- 14 execuções, a mais antiga a EXATAMENTE -14 dias (a fronteira de D-46-14)
    -- e uma delas sobre conjunto NÃO-VAZIO. Somadas às reais, os três critérios
    -- passam a valer — por construção deste bloco, não por calendário.
    --
    -- ⚠ FRONTEIRA, e ela é robusta nos dois sentidos: a comparação da RPC é
    --   `min(iniciada_em) <= now() - interval '14 days'`. Plantada em T0 - 14d e
    --   avaliada em T1 > T0, ela é VERDADEIRA (o caso positivo aceita); plantada
    --   em T0 - 13d, é FALSA por uma margem de um dia inteiro (o caso negativo
    --   recusa). Nenhum dos dois depende de o relógio parar.
    --
    -- Colunas NOT NULL sem default de `purga_execucoes` (lidas de
    -- `20260823000002:136-153`, não de memória): modo_vigente, cap_vigente,
    -- elegiveis, veredito. `processados`, `notificacoes_expurgadas`, `situacao`,
    -- `iniciada_em` e `id` têm default; `concluida_em` é anulável.
    INSERT INTO public.purga_execucoes
           (modo_vigente, cap_vigente, elegiveis, processados, veredito, situacao,
            iniciada_em, concluida_em)
    SELECT 'dry_run', 50,
           CASE WHEN g = 1 THEN 3 ELSE 0 END,
           0, 'dry_run', 'concluida',
           pg_catalog.now() - make_interval(days => 15 - g),
           pg_catalog.now() - make_interval(days => 15 - g)
      FROM generate_series(1, 14) g;

    -- As três etapas da allowlist deixam de estar em procedência de seed.
    -- ⚠ Só as da allowlist: D-46-22 é sobre as etapas que a purga ALCANÇA, e
    --   marcar a matriz inteira mediria uma condição mais larga que a real.
    UPDATE public.config_retencao_etapa
       SET origem = 'admin'
     WHERE elegivel_purga
       AND origem = 'seed';

    -- ── (d.1) ⊖ SEM O ARGUMENTO DE CONFIRMAÇÃO ───────────────────────────────
    -- Todos os outros critérios satisfeitos. O modo seguro é o padrão, e ligar a
    -- destruição exige AFIRMAR a intenção — um flip que fosse efeito colateral de
    -- uma chamada que pretendia mudar o cap é exatamente o que PURGA-04 proíbe.
    BEGIN
      PERFORM public.salvar_config_purga(p_modo := 'live', p_cap_titulares := NULL,
                                         p_janela_notificacoes_meses := NULL,
                                         p_confirmo_live := false);
      v_d_st  := v_d_st  || 'SEM-EXCECAO'::text;
      v_d_msg := v_d_msg || '<sem excecao>'::text;
    EXCEPTION WHEN OTHERS THEN
      v_d_st  := v_d_st  || SQLSTATE;
      v_d_msg := v_d_msg || SQLERRM;
    END;

    -- ── (d.2) ⊖ MENOS DE 14 DIAS CORRIDOS ────────────────────────────────────
    BEGIN
      UPDATE public.purga_execucoes
         SET iniciada_em = pg_catalog.now() - interval '13 days'
       WHERE iniciada_em < pg_catalog.now() - interval '13 days';

      BEGIN
        PERFORM public.salvar_config_purga(p_modo := 'live', p_cap_titulares := NULL,
                                           p_janela_notificacoes_meses := NULL,
                                           p_confirmo_live := true);
        v_d_st  := v_d_st  || 'SEM-EXCECAO'::text;
        v_d_msg := v_d_msg || '<sem excecao>'::text;
      EXCEPTION WHEN OTHERS THEN
        v_d_st  := v_d_st  || SQLSTATE;
        v_d_msg := v_d_msg || SQLERRM;
      END;

      RAISE EXCEPTION 'reverte_caso_dias' USING ERRCODE = 'P46B1';
    EXCEPTION
      WHEN sqlstate 'P46B1' THEN
        NULL;  -- a data volta ao plantado; as variaveis acima sobreviveram
    END;

    -- ── (d.3) ⊖ MENOS DE 14 EXECUÇÕES COM LEDGER ─────────────────────────────
    -- ⚠ O ÚNICO CASO QUE NÃO PODE SER MONTADO POR ACRÉSCIMO: a contagem só desce
    --   removendo linhas. A remoção vive nesta subtransação aninhada e é desfeita
    --   três statements depois — e a impressão digital conferida no fim do bloco
    --   transforma "foi desfeita" de suposição em medição.
    -- Reconstrói-se um ledger de EXATAMENTE 13 linhas, ainda com a mais antiga a
    -- -20 dias e uma sobre conjunto não-vazio: assim o único critério que falha é
    -- a contagem, e o diagnóstico tem de nomear ELA e mais nenhuma.
    BEGIN
      DELETE FROM public.purga_execucao_itens;
      DELETE FROM public.purga_execucoes;

      INSERT INTO public.purga_execucoes
             (modo_vigente, cap_vigente, elegiveis, processados, veredito, situacao,
              iniciada_em, concluida_em)
      SELECT 'dry_run', 50,
             CASE WHEN g = 1 THEN 3 ELSE 0 END,
             0, 'dry_run', 'concluida',
             pg_catalog.now() - make_interval(days => 21 - g),
             pg_catalog.now() - make_interval(days => 21 - g)
        FROM generate_series(1, 13) g;

      SELECT count(*) INTO v_d_conta13 FROM public.purga_execucoes;

      BEGIN
        PERFORM public.salvar_config_purga(p_modo := 'live', p_cap_titulares := NULL,
                                           p_janela_notificacoes_meses := NULL,
                                           p_confirmo_live := true);
        v_d_st  := v_d_st  || 'SEM-EXCECAO'::text;
        v_d_msg := v_d_msg || '<sem excecao>'::text;
      EXCEPTION WHEN OTHERS THEN
        v_d_st  := v_d_st  || SQLSTATE;
        v_d_msg := v_d_msg || SQLERRM;
      END;

      RAISE EXCEPTION 'reverte_caso_contagem' USING ERRCODE = 'P46B1';
    EXCEPTION
      WHEN sqlstate 'P46B1' THEN
        NULL;  -- o ledger inteiro volta; a contagem medida sobreviveu em memoria
    END;

    -- ── (d.4) ⊖ 14+ EXECUÇÕES E NENHUMA SOBRE CONJUNTO NÃO-VAZIO ─────────────
    -- ⚠⚠ É POR ESTE CASO QUE A FASE INTEIRA EXISTE. A prévia devolve zero por
    --   ARITMÉTICA — a matriz está em 24 meses e o sistema é mais novo que a
    --   janela —, então catorze dias de zeros são o desfecho ESPERADO em produção
    --   sem a fixture do 46-01. Eles não provam nada sobre o caminho do delete: é
    --   o dry-run decorativo que o SC#1 nomeia, e a mesma classe de falha de uma
    --   guarda que era dead code. Um critério que conta dias e execuções mas não
    --   conta ELEGÍVEIS deixaria o portão aprovar exatamente esse cenário.
    BEGIN
      UPDATE public.purga_execucoes SET elegiveis = 0;

      BEGIN
        PERFORM public.salvar_config_purga(p_modo := 'live', p_cap_titulares := NULL,
                                           p_janela_notificacoes_meses := NULL,
                                           p_confirmo_live := true);
        v_d_st  := v_d_st  || 'SEM-EXCECAO'::text;
        v_d_msg := v_d_msg || '<sem excecao>'::text;
      EXCEPTION WHEN OTHERS THEN
        v_d_st  := v_d_st  || SQLSTATE;
        v_d_msg := v_d_msg || SQLERRM;
      END;

      RAISE EXCEPTION 'reverte_caso_elegiveis' USING ERRCODE = 'P46B1';
    EXCEPTION
      WHEN sqlstate 'P46B1' THEN
        NULL;
    END;

    -- ── (d.5) ⊖ ETAPA DA ALLOWLIST AINDA EM PROCEDÊNCIA DE SEED (D-46-22) ────
    -- Um valor em seed significa que ninguém CONTESTOU aquele número, não que
    -- alguém o DECIDIU — e o `COMMENT` da coluna declara essa pré-condição dentro
    -- do banco desde a Phase 43. Medido em PROD em 2026-08-22: 7 das 8 linhas
    -- seguem em seed.
    BEGIN
      UPDATE public.config_retencao_etapa
         SET origem = 'seed'
       WHERE elegivel_purga;

      BEGIN
        PERFORM public.salvar_config_purga(p_modo := 'live', p_cap_titulares := NULL,
                                           p_janela_notificacoes_meses := NULL,
                                           p_confirmo_live := true);
        v_d_st  := v_d_st  || 'SEM-EXCECAO'::text;
        v_d_msg := v_d_msg || '<sem excecao>'::text;
      EXCEPTION WHEN OTHERS THEN
        v_d_st  := v_d_st  || SQLSTATE;
        v_d_msg := v_d_msg || SQLERRM;
      END;

      RAISE EXCEPTION 'reverte_caso_seed' USING ERRCODE = 'P46B1';
    EXCEPTION
      WHEN sqlstate 'P46B1' THEN
        NULL;
    END;

    -- ── (d.6) ⊕ O CASO POSITIVO — E (e) MEDIDA EM VOLTA DELE ─────────────────
    -- Os cinco critérios satisfeitos: 14 dias EXATOS desde a primeira execução,
    -- 14+ execuções, uma delas sobre conjunto não-vazio, a allowlist fora do
    -- seed, e a confirmação explícita. A chamada TEM de passar e o modo TEM de
    -- ficar `live` — dentro do envelope, que reverte tudo.
    -- ⚠ A BASELINE É O CONJUNTO DE `id` JÁ EXISTENTES, e não uma contagem: depois
    --   do checkpoint desta fase haverá linhas reais de `alterar_config_purga` em
    --   PROD, e a linha NOVA precisa ser identificável sem depender de ordenação
    --   por um carimbo que o catálogo declara ANULÁVEL. É baseline capturada na
    --   própria execução, jamais lista literal.
    SELECT array_agg(l.id) INTO v_e_ids
      FROM public.logs_auditoria l WHERE l.acao = 'alterar_config_purga';
    v_e_base := coalesce(array_length(v_e_ids, 1), 0)::bigint;

    BEGIN
      PERFORM public.salvar_config_purga('live', NULL, NULL, true);
      v_d_st  := v_d_st  || 'OK'::text;
      v_d_msg := v_d_msg || '<aceitou>'::text;
    EXCEPTION WHEN OTHERS THEN
      v_d_st  := v_d_st  || SQLSTATE;
      v_d_msg := v_d_msg || SQLERRM;
    END;

    SELECT cp.modo INTO v_d_modo_pos FROM public.config_purga cp;

    SELECT count(*) - v_e_base INTO v_e_delta
      FROM public.logs_auditoria l WHERE l.acao = 'alterar_config_purga';

    SELECT l.usuario_id, l.dados_antes, l.dados_depois,
           l.severidade::text, l.categoria::text
      INTO v_e_usuario, v_e_antes, v_e_depois, v_e_sev, v_e_cat
      FROM public.logs_auditoria l
     WHERE l.acao = 'alterar_config_purga'
       AND NOT EXISTS (
         SELECT 1 FROM unnest(coalesce(v_e_ids, ARRAY[]::uuid[])) x WHERE x = l.id
       );

    -- ── (d.7) ⊖⊕ O KILL SWITCH É IRRECUSÁVEL ─────────────────────────────────
    -- A partir do `live` recém-montado, as TRÊS condições que reprovariam a
    -- entrada em `live` são quebradas de propósito — e a chamada para `off` passa
    -- assim mesmo, SEM argumento de confirmação. Um kill switch que pode ser
    -- recusado não é um kill switch, e o momento em que ele mais importa é
    -- exatamente aquele em que algum critério estaria falhando.
    UPDATE public.purga_execucoes SET elegiveis = 0, iniciada_em = pg_catalog.now();
    UPDATE public.config_retencao_etapa SET origem = 'seed' WHERE elegivel_purga;

    BEGIN
      PERFORM public.salvar_config_purga(p_modo := 'off', p_cap_titulares := NULL,
                                         p_janela_notificacoes_meses := NULL,
                                         p_confirmo_live := NULL);
      v_d_st  := v_d_st  || 'OK'::text;
      v_d_msg := v_d_msg || '<desligou>'::text;
    EXCEPTION WHEN OTHERS THEN
      v_d_st  := v_d_st  || SQLSTATE;
      v_d_msg := v_d_msg || SQLERRM;
    END;

    SELECT cp.modo INTO v_d_modo_off FROM public.config_purga cp;

    UPDATE public.config_purga SET modo = v_modo0;

    RAISE EXCEPTION 'rollback_smoke46de_envelope' USING ERRCODE = 'P46B0';
  EXCEPTION
    WHEN sqlstate 'P46B0' THEN
      NULL;  -- reversao ESPERADA; as variaveis acima sobreviveram ao rollback
  END;

  -- ⚠ As claims são limpas AQUI. Um vazamento para o RESUMO (z) não o quebraria,
  -- mas a higiene deste arquivo é que ele roda com `auth.uid()` NULO — como o
  -- cron —, e foi essa disciplina que revelou o Blocker B-02 no 46-04.
  PERFORM set_config('request.jwt.claims', '', false);
  PERFORM set_config('request.jwt.claim.sub', '', false);
  RESET ROLE;

  -- ══ MEDIÇÃO DE RESTAURAÇÃO — a exceção legítima à regra do cabeçalho ═══════
  SELECT count(*), md5(coalesce(string_agg(t.linha, E'\n' ORDER BY t.linha), ''))
    INTO v_led_n_z, v_led_fp_z
    FROM (SELECT to_jsonb(e)::text AS linha FROM public.purga_execucoes e
          UNION ALL
          SELECT to_jsonb(i)::text        FROM public.purga_execucao_itens i) t;

  SELECT count(*) INTO v_e_acao_z
    FROM public.logs_auditoria l WHERE l.acao = 'alterar_config_purga';

  -- ══ JULGAMENTO — sobre variáveis ═══════════════════════════════════════════

  IF v_led_n_z IS DISTINCT FROM v_led_n_a OR v_led_fp_z IS DISTINCT FROM v_led_fp_a THEN
    RAISE EXCEPTION 'P46P FAIL (d): ⛔ O LEDGER NAO VOLTOU AO ESTADO ANTERIOR. Antes: % linha(s), impressao digital [%]. Depois: % linha(s), impressao digital [%]. Este bloco REMOVE e RECRIA linhas de purga_execucoes dentro de subtransacoes que TEM de ser revertidas — se elas nao foram, um registro de cumprimento de obrigacao legal com retencao INDEFINIDA (D-46-16) acabou de ser alterado por um TESTE, num sistema sem PITR. Nao rodar este arquivo de novo antes de entender o que aconteceu',
      v_led_n_a, v_led_fp_a, v_led_n_z, v_led_fp_z;
  END IF;

  IF v_uid_ok IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P46P FAIL (d): ⊖ NAO-VACUIDADE DA IMPERSONACAO — auth.uid() resolveu para NULO depois de carimbar as claims (medido %). Sem sessao, a RPC recusa com 42501 em TODAS as chamadas: as cinco negativas ficariam verdes medindo o guard de papel, e o caso positivo reprovaria por um motivo que nada tem a ver com o portao do flip', v_uid_ok;
  END IF;

  IF array_length(v_d_st, 1) IS DISTINCT FROM 7 THEN
    RAISE EXCEPTION 'P46P FAIL (d): foram registradas % chamadas de controle (esperado 7 — cinco recusas, uma aceitacao e o kill switch). Um bloco que nao executou as sete nao provou nada sobre o portao do flip', coalesce(array_length(v_d_st, 1), 0);
  END IF;

  -- As CINCO recusas, uma por critério.
  IF v_d_st[1] IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION 'P46P FAIL (d.1): com TODOS os criterios satisfeitos e SEM o argumento de confirmacao, a RPC devolveu [%] em vez de 22023. Mensagem: [%]. ⚠ [SEM-EXCECAO] aqui significa que ligar a destruicao irreversivel de PII virou efeito colateral de uma chamada que nao a pediu — que e literalmente o que PURGA-04 proibe',
      coalesce(v_d_st[1], 'NULL'), coalesce(v_d_msg[1], 'NULL');
  END IF;

  IF v_d_st[2] IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION 'P46P FAIL (d.2): com a primeira execucao do ledger a 13 dias — um dia INTEIRO aquem da fronteira de D-46-14 —, a RPC devolveu [%] em vez de 22023. Mensagem: [%]. A fronteira e o contrato: 13 dias recusa, 14 dias aceita, e o caso (d.6) prova a outra metade',
      coalesce(v_d_st[2], 'NULL'), coalesce(v_d_msg[2], 'NULL');
  END IF;

  IF v_d_conta13 IS DISTINCT FROM 13 THEN
    RAISE EXCEPTION 'P46P FAIL (d.3): a montagem do caso deixou % execucao(oes) no ledger (esperado exatamente 13). Com um numero diferente o caso pode ter falhado por OUTRO criterio, e a recusa observada nao seria prova da contagem', coalesce(v_d_conta13, -1);
  END IF;

  IF v_d_st[3] IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION 'P46P FAIL (d.3): com 13 execucoes no ledger — uma aquem das 14 exigidas, e com os outros criterios satisfeitos —, a RPC devolveu [%] em vez de 22023. Mensagem: [%]',
      coalesce(v_d_st[3], 'NULL'), coalesce(v_d_msg[3], 'NULL');
  END IF;

  IF v_d_st[4] IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION 'P46P FAIL (d.4): ⛔ O CASO QUE A FASE INTEIRA EXISTE PARA NAO DEIXAR PASSAR. Com 14+ execucoes, 14+ dias e NENHUMA execucao sobre conjunto elegivel nao-vazio, a RPC devolveu [%] em vez de 22023. Mensagem: [%]. Catorze noites de zeros nao provam NADA sobre o caminho do delete: a previa devolve zero por ARITMETICA, nao por defeito, e um portao que conta dias e execucoes mas nao conta ELEGIVEIS autoriza exatamente o dry-run decorativo que o SC#1 proibe',
      coalesce(v_d_st[4], 'NULL'), coalesce(v_d_msg[4], 'NULL');
  END IF;

  IF v_d_st[5] IS DISTINCT FROM '22023' THEN
    RAISE EXCEPTION 'P46P FAIL (d.5): com as etapas da allowlist de volta a procedencia de seed, a RPC devolveu [%] em vez de 22023. Mensagem: [%]. D-46-22 nao e detalhe: um valor em seed significa que ninguem CONTESTOU aquele numero, nao que alguem o DECIDIU — e ligar a purga sobre uma matriz que ninguem escolheu apaga pessoas por um prazo que nenhum humano confirmou',
      coalesce(v_d_st[5], 'NULL'), coalesce(v_d_msg[5], 'NULL');
  END IF;

  -- ⊖ O DIAGNÓSTICO NOMEIA O CRITÉRIO CERTO — E SÓ ELE.
  -- ⚠ Isto não é preciosismo de texto: a lição mais cara desta fase é que um
  --   diagnóstico ERRADO custa mais que um "falhou". Uma mensagem que nomeasse
  --   quatro critérios quando só um faltou mandaria o operador confirmar a matriz
  --   inteira quando o que faltava eram dias — e o checkpoint desta fase depende
  --   de a mensagem de recusa dizer o que fazer.
  --
  -- ⚠ VARREDURA POR FORMA (CLAUDE.md), respondida aqui e não deixada implícita:
  --   os quatro marcadores abaixo são uma lista literal, e a pergunta obrigatória
  --   é se ela codifica um ESCOPO deliberado ou uma FOTOGRAFIA que vai envelhecer.
  --   São ESCOPO: os quatro são exatamente os quatro critérios de D-46-14 mais
  --   D-46-22, e a lista só muda no dia em que os CRITÉRIOS mudarem — que é
  --   precisamente o dia em que esta asserção tem de ser reescrita junto. Um
  --   critério novo sem marcador novo faz o caso correspondente inexistir, e não
  --   passar em silêncio: cada caso compara o conjunto de marcadores por
  --   IGUALDADE EXATA, então um critério a mais na mensagem reprova pelo nome.
  v_marc := ARRAY[]::text[];
  FOR v_k IN 2..5 LOOP
    v_msg  := coalesce(v_d_msg[v_k], '');
    v_marc := v_marc || coalesce(concat_ws('+'::text,
      CASE WHEN position('dias corridos'       in v_msg) > 0 THEN 'dias'::text      END,
      CASE WHEN position('execucoes com linha' in v_msg) > 0 THEN 'execucoes'::text END,
      CASE WHEN position('NAO-VAZIO'           in v_msg) > 0 THEN 'elegiveis'::text END,
      CASE WHEN position('procedencia de seed' in v_msg) > 0 THEN 'seed'::text      END
    ), '<nenhum>'::text);
  END LOOP;

  IF v_marc[1] IS DISTINCT FROM 'dias'
     OR v_marc[2] IS DISTINCT FROM 'execucoes'
     OR v_marc[3] IS DISTINCT FROM 'elegiveis'
     OR v_marc[4] IS DISTINCT FROM 'seed' THEN
    RAISE EXCEPTION 'P46P FAIL (d): o DIAGNOSTICO de cada recusa nao nomeia o criterio certo e so ele. Medido, na ordem (13 dias / 13 execucoes / zero elegiveis / matriz em seed): [%], [%], [%], [%] — esperado dias, execucoes, elegiveis, seed. ⚠ Um diagnostico que nomeia criterios que NAO faltaram manda o operador consertar o que ja estava certo; um que nomeia menos do que faltou o manda tentar de novo as cegas. O passo 4 do checkpoint desta fase copia a mensagem inteira para o SUMMARY: ela E a evidencia de que o portao existe',
      coalesce(v_marc[1], 'NULL'), coalesce(v_marc[2], 'NULL'), coalesce(v_marc[3], 'NULL'), coalesce(v_marc[4], 'NULL');
  END IF;

  -- ⊕ A ACEITAÇÃO.
  IF v_d_st[6] IS DISTINCT FROM 'OK' THEN
    RAISE EXCEPTION 'P46P FAIL (d.6): ⊕ O CONTROLE POSITIVO. Com os CINCO criterios satisfeitos — 14 dias exatos desde a primeira execucao, 14+ execucoes com ledger, uma delas sobre conjunto nao-vazio, allowlist fora do seed e confirmacao explicita —, a RPC devolveu [%] em vez de aceitar. Mensagem: [%]. ⚠ PROVAR SO RECUSA NAO PROVA NADA: uma funcao que recusa TUDO passaria nas cinco negativas acima, e a descoberta chegaria no dia do flip, com o operador incapaz de ligar a purga e sem saber por que. E o modo de falha no 3 dos sete portoes da Phase 45, e e o que aconteceu com a (p.3) deste mesmo arquivo por tres rodadas de review',
      coalesce(v_d_st[6], 'NULL'), coalesce(v_d_msg[6], 'NULL');
  END IF;

  IF v_d_modo_pos IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'P46P FAIL (d.6): a RPC aceitou mas config_purga.modo ficou em [%] (esperado live). "Nao levantou" nunca foi o mesmo que "gravou" — uma funcao que retorna sem escrever deixaria o operador convencido de que ligou a purga', coalesce(v_d_modo_pos, 'NULL');
  END IF;

  -- ⊖⊕ O KILL SWITCH.
  IF v_d_st[7] IS DISTINCT FROM 'OK' THEN
    RAISE EXCEPTION 'P46P FAIL (d.7): ⛔ O KILL SWITCH FOI RECUSADO. A partir de live, com as TRES condicoes que reprovariam a ENTRADA em live falhando de proposito (sem confirmacao, ledger insuficiente e matriz em seed), a chamada para off devolveu [%] em vez de passar. Mensagem: [%]. UM KILL SWITCH QUE PODE SER RECUSADO NAO E UM KILL SWITCH, e o momento em que ele mais importa e exatamente aquele em que algum criterio esta falhando — as tres da manha, com a purga apagando o que nao devia',
      coalesce(v_d_st[7], 'NULL'), coalesce(v_d_msg[7], 'NULL');
  END IF;

  IF v_d_modo_off IS DISTINCT FROM 'off' THEN
    RAISE EXCEPTION 'P46P FAIL (d.7): a chamada de desligamento nao levantou, mas config_purga.modo ficou em [%] (esperado off). Um kill switch que retorna sem desligar e pior que um que recusa: o operador vai embora achando que desligou', coalesce(v_d_modo_off, 'NULL');
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (d): o portao do flip RECUSA com 22023 nos cinco criterios, um de cada vez — sem confirmacao (%), 13 dias (%), 13 execucoes (%), zero elegiveis (%), matriz em seed (%) —, cada recusa nomeando SO o criterio que faltou; ⊕ ACEITA com os cinco satisfeitos e config_purga.modo vai a [%]; e ⊖⊕ a transicao para off passa mesmo com os tres criterios falhando, indo a [%]. Estado REAL de PROD no instante do run (nao usado por nenhuma decisao deste bloco): % execucoes, primeira em [%], % sobre conjunto nao-vazio',
    v_d_st[1], v_d_st[2], v_d_st[3], v_d_st[4], v_d_st[5], v_d_modo_pos, v_d_modo_off,
    v_real_n, coalesce(v_real_min::text, 'NENHUMA'), v_real_eleg;

  -- ══ (e) A TRILHA, NA MESMA TRANSAÇÃO ═══════════════════════════════════════
  -- ⚠ A prova de "mesma transação" é ESTRUTURAL, e não uma inspeção de código: a
  --   linha foi contada DENTRO do envelope e some quando ele reverte. Se a trilha
  --   fosse escrita por fora do corpo — trigger assíncrono, job posterior —, o
  --   delta aqui daria 0; e se fosse escrita fora da transação, ela SOBREVIVERIA
  --   ao rollback e a segunda medição pegaria isso.
  IF v_e_delta IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P46P FAIL (e): a mudanca de modo bem-sucedida produziu % linha(s) nova(s) em logs_auditoria com acao = alterar_config_purga (esperado exatamente 1). ⚠ Se for 0, a chamada da trilha NAO roda no mesmo corpo e o flip deixa de ser EVIDENCIADO — existiria um estado em que o modo mudou e a trilha nao registrou, que e precisamente o que PURGA-04 exige que nao exista. Se for mais de 1, ha um segundo escritor e a trilha passa a contar a mesma mudanca duas vezes', coalesce(v_e_delta, -1);
  END IF;

  IF v_e_usuario IS DISTINCT FROM v_admin_rh THEN
    RAISE EXCEPTION 'P46P FAIL (e): a linha de trilha aponta para o ator [%] e nao para o administrador resolvido no SERVIDOR [%]. O ator NUNCA e recebido por parametro — a assinatura da RPC nao tem parametro de ator —, e uma autoria escolhida por quem esta sendo auditado nao e trilha',
      coalesce(v_e_usuario::text, 'NULL'), v_admin_rh::text;
  END IF;

  IF v_e_antes IS NULL OR v_e_depois IS NULL THEN
    RAISE EXCEPTION 'P46P FAIL (e): a linha de trilha tem dados_antes = [%] e dados_depois = [%] — os dois precisam carregar a linha inteira de config_purga em jsonb. Sem o estado ANTERIOR nao ha como saber de onde a purga foi ligada, e um registro que so diz o depois nao responde a pergunta que a auditoria faz',
      coalesce(v_e_antes::text, 'NULL'), coalesce(v_e_depois::text, 'NULL');
  END IF;

  IF (v_e_antes ->> 'modo') IS NOT DISTINCT FROM (v_e_depois ->> 'modo') THEN
    RAISE EXCEPTION 'P46P FAIL (e): dados_antes e dados_depois registram o MESMO modo [%] — a linha afirma uma alteracao que nao teria acontecido. Poluir a trilha probatoria com nao-mudancas e o oposto do que PURGA-04 pede dela',
      coalesce(v_e_antes ->> 'modo', 'NULL');
  END IF;

  IF v_e_cat IS DISTINCT FROM 'configuracao' OR v_e_sev IS DISTINCT FROM 'critico' THEN
    RAISE EXCEPTION 'P46P FAIL (e): a linha ficou com categoria [%] e severidade [%] — esperado configuracao e critico. ⚠ A severidade sobe ao TOPO do vocabulario quando o destino e live, e isso nao e enfase: a partir de live a varredura noturna destroi PII de pessoas reais em tres sistemas, de forma irreversivel, num projeto sem PITR e com o Storage fora de todo caminho de backup. Ligar isso nao e um aviso, e quem varrer a trilha por severidade tem de encontrar este evento',
      coalesce(v_e_cat, 'NULL'), coalesce(v_e_sev, 'NULL');
  END IF;

  IF v_e_acao_z IS DISTINCT FROM v_e_base THEN
    RAISE EXCEPTION 'P46P FAIL (e): depois do rollback restaram % linha(s) com acao = alterar_config_purga, e antes da chamada havia % — a linha de trilha SOBREVIVEU ao envelope. Isso significa que ela NAO foi escrita na mesma transacao da mudanca, e portanto existe um estado em que uma delas acontece sem a outra. E tambem significa que este smoke acabou de poluir a trilha probatoria de PROD',
      coalesce(v_e_acao_z, -1), coalesce(v_e_base, -1);
  END IF;

  PERFORM set_config('smoke46p.pass', (coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int + 1)::text, false);
  RAISE NOTICE 'P46P PASS (e): a mudanca de modo gravou EXATAMENTE 1 linha em logs_auditoria dentro do envelope, com ator [%] resolvido no servidor, categoria [%], severidade [%], e os dois estados registrados e diferentes ([%] -> [%]); e a linha DESAPARECEU com o rollback, que e a prova estrutural de que ela vive na mesma transacao da mutacao',
    v_e_usuario, v_e_cat, v_e_sev, v_e_antes ->> 'modo', v_e_depois ->> 'modo';

  RAISE NOTICE 'P46P TEARDOWN ok (d/e): envelope revertido — config_purga.modo voltou a [%], o ledger voltou a % linha(s) com a impressao digital [%] identica a de antes, e a trilha voltou a % linha(s) de alterar_config_purga',
    coalesce(v_modo0, 'NULL'), v_led_n_z, v_led_fp_z, v_e_acao_z;
END $de$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE v_n int; v_esperado int := 27;  -- 6 (46-02) + 5 (46-03) + 5 (46-04: b, o, o.6, o.7, p) + 5 (46-05: q.1..q.5) + 4 (46-06: a, g, m, n) + 2 (46-07: d, e)
BEGIN
  v_n := coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P46P FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde. Se o numero veio 0 num run que emitiu NOTICEs de PASS, o contador foi revertido junto com o envelope: os set_config TEM de ficar DEPOIS do RAISE P46B0, nunca dentro dele', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'P46P RESUMO: % asseracoes PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $z$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
