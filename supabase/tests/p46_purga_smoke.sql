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
-- ⚠ ESTE ARQUIVO NASCE COM AS LETRAS DO PLANO 46-02. As demais — (a), (b), (d),
-- (e), (g), (j.1-3), (k), (l), (m), (n), (o) — chegam nos planos 46-03 a 46-07,
-- NESTE MESMO ARQUIVO, e o RESUMO (z) sobe junto. Um arquivo por fase, e não um
-- por plano: as asserções desta fase leem umas o estado das outras.
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
-- GATE VERDE = o contador `smoke46p.pass` bate **6** no RESUMO (z). O gate NÃO é
-- "não levantou exceção": um run parcial acumularia < 6 e o RESUMO reprova ALTO.
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
-- Números esperados sobre a fixture viva, DEPOIS do apply do plano 46-02:
--   `candidaturas_alem_da_janela()` = **6** (era 7; `neg-etapa#08` saiu porque
--   `entrevista_online` não está na allowlist de D-46-19)
--   `titulares_alem_da_janela()`    = **6** (pos1, pos2, pos3, cap2, neg-hold,
--   neg-vaga — `neg-art20` sai pelo Art. 20, e o titular de `neg-etapa` tem uma
--   segunda candidatura DENTRO da janela, que é o caso de D-46-11)
-- Os `>=` das asserções são deliberados: o arquivo tem de continuar válido depois
-- que o 46-03 derrubar `neg-hold` e `neg-vaga` (6 → 4).
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
-- AS ASSERÇÕES DESTE PLANO — quatro delas NEGATIVAS
-- -----------------------------------------------------------------------------
--   (h)     ⊖ O ledger não tem coluna de PII, aferido sobre o CATÁLOGO.
--   (f)     ⊖ Kill switch provado por execução REAL com `modo = 'off'`.
--   (c)     ⊖ Dry-run sobre conjunto NÃO-VAZIO não apagou nada e não despachou.
--   (i)     O item registra a POLÍTICA, e não só a contagem.
--   (idem)  A idempotência do dry-run é OBSERVADA, não presumida.
--   (claim) ⊖ Titular com item ABERTO não é re-selecionado (Pitfall 6).
--   (z)     RESUMO — exige o total exato de 6 PASS.
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
  v_pos1 constant uuid := '4601b000-0000-4000-8000-000000000001'::uuid;
  v_pos2 constant uuid := '4601b000-0000-4000-8000-000000000002'::uuid;
  v_pos3 constant uuid := '4601b000-0000-4000-8000-000000000003'::uuid;

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

  RAISE NOTICE 'P46P TEARDOWN ok: envelope revertido — config_purga.modo voltou a [%], e as % linhas de purga_execucoes gravadas por este smoke NAO existem (elas inflariam o criterio de >= 14 execucoes de D-46-14)', coalesce(v_modo_antes, 'NULL'), v_f_novas + v_c_novas + v_d_novas + v_k_novas;
END $envelope$;


-- ─────────────────────────────────────────────────────────────────────────────
-- (z) RESUMO — gate de contagem. Esperado FIXO. Run parcial falha AQUI.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $z$
DECLARE v_n int; v_esperado int := 6;
BEGIN
  v_n := coalesce(nullif(current_setting('smoke46p.pass', true), ''), '0')::int;
  IF v_n <> v_esperado THEN
    RAISE EXCEPTION 'P46P FAIL (z): RESUMO % PASS de % esperadas — run parcial; NAO tratar como verde. Se o numero veio 0 num run que emitiu NOTICEs de PASS, o contador foi revertido junto com o envelope: os set_config TEM de ficar DEPOIS do RAISE P46B0, nunca dentro dele', v_n, v_esperado;
  END IF;
  RAISE NOTICE 'P46P RESUMO: % asseracoes PASS de % esperadas — gate VERDE', v_n, v_esperado;
END $z$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
