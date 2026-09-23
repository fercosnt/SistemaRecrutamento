---
phase: 49-consertos-da-jornada-bloco-2
plan: "14"
subsystem: database
tags: [postgres, supabase, lgpd, erase, anonimizacao, motor-destrutivo, ai_call_logs, migrations, p46apply, mutation-testing]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "as 16 colunas novas da fase, varias delas nas tabelas que o motor limpa"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "07"
    provides: "`trg_decisao_final_snapshot` com `WHEN` por `to_jsonb` da linha inteira — `justificativa` E `revisao_resultado` estao DENTRO da comparacao, entao o tombstone continua arquivando; e a asserção (g) de paridade de colunas, que reprovaria se este plano tivesse acrescentado coluna a `decisao_final` (nao acrescentou)"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "08"
    provides: "o formato `Candidato C<n> (id=<candidatura_id>)` do prompt de comparativo — o unico fio entre a linha `comparative_ranking` e o titular"
  - phase: 46-purga-e-guardas
    provides: "`p46apply.cjs` (SQL lido do ARQUIVO, migration + ledger na mesma requisicao, md5 conferido por leitura de volta) e os corpos vivos de `anonimizar_candidato`/`plano_exclusao_titular` com o 4o/3o ramo do guard"
provides:
  - "`anonimizar_candidato` apaga `ai_call_logs.user_prompt_template` — o INPUT que o titular mandou ao modelo — no MESMO UPDATE que faz `candidato_id := NULL` (D-61)"
  - "passo novo (0/5) que rediga INTEIRAS as linhas `call_type='comparative_ranking'` que CITAM uma candidatura do titular, achadas por `position('id=' || candidatura_id IN user_prompt_template)` — as linhas que o motor nunca alcancava porque `candidato_id` delas e NULL por desenho (D-63)"
  - "`decisao_final.revisao_resultado` e a copia em `decisao_final_historico` recebem sentinela nos MESMOS dois UPDATEs do tombstone, na ordem corrente -> arquivo (D-60) — a resposta que o revisor escreveu ao pedido de revisao do Art. 20 deixa de sobreviver"
  - "`plano_exclusao_titular` conta as MESMAS tres coisas pela MESMA expressao: o dry-run e o delete real continuam saindo de uma unica definicao (regra (ii) do C3)"
  - "tres contagens novas em `'passos'` e na mensagem do terminador do dry-run — um passo destrutivo que nao diz quanto destruiu nao e auditavel"
  - "portao de apply que le do CATALOGO VIVO o minimo do CHECK `decisao_final_revisao_justificativa_min_check` e reprova uma sentinela curta — o 23514 que aconteceria DEPOIS do Storage apagado (Pitfall 1) passa a ser reprovado no apply"
  - "`p45_motor_exclusao_smoke.sql` com 5 assercoes novas (B12..B16), rede estrutural (C3/v) sobre as duas funcoes, contador 25 -> 30, e 12 mutacoes provando a mordida clausula por clausula"
  - "os md5 novos que sao o PRE-PORTAO do plano 49-20: `anonimizar_candidato` = 6ab2890ebfc87fbd489215579bf1d9f8 (length 54807 / 56226 octetos) · `plano_exclusao_titular` = 12bfca3bf936704f1bc581acd5061df3 (length 28413 / 29603 octetos)"
affects: [49-19, 49-20, 49-21, 49-17, 49-18]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4).
actuals:
  tokens: 37132
  tasks: 1
  commits: 1
  plan_head_before: 9957f07653d10d82fb2f237e7e42db1f7f9d2882
  # `commits: 1` = MEDIDO por `git rev-list --count 9957f076..HEAD` no instante em que
  # este SUMMARY foi escrito (293f86f8), nao narrado. Re-medir DEPOIS deste ponto da um
  # numero MAIOR e isso nao e divergencia: o commit de metadado do proprio plano entra
  # no mesmo intervalo por construcao, porque o `plan_head_before` e anterior a ele.
  # `tokens: 37132` = (111 116 octetos da migration + 37 412 chars das linhas
  # acrescentadas ao smoke) / 4. A estimativa era 70 000; o realizado e 0,53x.
  # Registrado como medido, nao ajustado para parecer perto. A razao de ficar em pouco
  # mais da metade: as duas funcoes NAO foram transcritas — os corpos foram lidos do
  # arquivo e editados por ancora, entao as ~730 + ~540 linhas que o plano orcava como
  # reescrita nao custaram escrita nenhuma. O que custou foram as 5 assercoes, a rede
  # (C3/v) e as 12 mutacoes.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Montar a migration por SUBSTITUICAO DE ANCORA UNICA sobre o corpo lido do arquivo, num script que ABORTA se a ancora aparecer 0 ou 2 vezes — em vez de transcrever 730 linhas. O md5 bate por construcao e o diff util cabe numa tela"
    - "Contar por `SELECT count(*)` com a MESMA expressao do dry-run, e nao por `GET DIAGNOSTICS ROW_COUNT`, quando a coluna escrita e NULAVEL: `ROW_COUNT` conta toda linha atualizada e diria «raspei N» quando raspou zero"
    - "`CASE WHEN <col> IS NULL THEN NULL ELSE <sentinela> END` em coluna nulavel: carimbar sentinela onde nao havia valor INVENTA o fato que o recibo passa a prometer ter apagado"
    - "Ler o MINIMO de um CHECK do catalogo vivo (`regexp_match` sobre `pg_get_constraintdef`) e comparar com o comprimento da sentinela extraida do corpo instalado — o portao acompanha o CHECK em vez de fotografar o valor de hoje"
    - "Assercao de LISTA `SET` CONTIGUA em vez de duas presencas somadas, quando o que importa e «na mesma escrita»: duas presencas passam com a coluna num UPDATE separado que nao acha linha nenhuma — zero linha, zero erro, dado intacto"
    - "Assercao de ORDEM por POSICAO (`position(A) < position(B)`) quando a ordem E o mecanismo: presenca das duas passa nos dois mundos"
    - "Assercao NEGATIVA de escopo (a linha que NAO cita o titular fica intocada) ao lado da positiva: sem ela, «a redacao funcionou» e indistinguivel de «a redacao alcancou o banco inteiro»"
    - "Tres fontes independentes na MESMA transacao para uma igualdade de contagem: a expressao medida a mao, o `'plano'` que o motor leu no PASSO 0, e o `'passos'` que ele declarou. Duas bastariam para uma igualdade; a terceira distingue «concordam» de «copiaram o mesmo erro»"
    - "Quando a igualdade esperada NAO e simples (o arquivo cresce durante o passo), asserir a RELACAO derivada (`plano + linhas correntes`) e declara-la — uma igualdade simples reprovaria o comportamento correto"
    - "Provar que uma rede de FORMA morde exige mutar o corpo E re-pinar o md5 para o corpo mutado: com o pin antigo, (C3/i) reprova primeiro e a rede fica sem prova propria"

key-files:
  created:
    - supabase/migrations/20260922000012_p49_motor_logs_e_revisao.sql
  modified:
    - supabase/tests/p45_motor_exclusao_smoke.sql

key-decisions:
  - "A linha de comparativo e redigida INTEIRA, e o custo esta escrito no corpo: apaga tambem o input dos OUTROS titulares daquela chamada. Cortar so o bloco do titular foi REJEITADO por depender do FORMATO do prompt (`Candidato C<n> (id=...)`) — e o formato ja mudou uma vez nesta fase. Um corte por layout deixaria, na primeira mudanca de layout, o texto passando intacto e o portao VERDE. O resultado do comparativo nao se perde: vive em `comparativo_solicitado`"
  - "As duas contagens de revisao NAO saem de `GET DIAGNOSTICS`. As colunas sao NULAVEIS e a maioria das linhas do titular nao tem resposta de revisor: `ROW_COUNT` diria «raspei N respostas» quando raspou ZERO, e o recibo passaria a prometer um apagamento que nao aconteceu"
  - "A contagem do ARQUIVO e lida DEPOIS do UPDATE da corrente, de proposito — o snapshot acabou de inserir uma versao com o valor ANTIGO, e contar antes deixaria essa versao fora do numero. A assimetria com o dry-run e DECLARADA no corpo e ASSERIDA como relacao derivada (`plano + correntes`), nunca escondida numa igualdade que nao se sustenta"
  - "O comprimento da sentinela da revisao virou PORTAO DE APPLY, lendo o minimo do CHECK vivo. Medido: `decisao_final_revisao_justificativa_min_check` exige >= 50 caracteres uteis quando ha veredito. Uma sentinela curta NAO falha no apply — falha com 23514 no primeiro pedido REAL, depois de o curriculo ja ter sido apagado do Storage (Pitfall 1). O minimo e lido do catalogo e nao transcrito: se alguem subir o CHECK para 80, o portao reprova o apply em vez de deixar o 23514 esperando"
  - "A fixture do smoke traz o ciclo de revisao do Art. 20 COMPLETO (veredito + revisor + data + texto), e nao `revisao_resultado` solto. Com o veredito preenchido, ela EXERCITA o CHECK de tamanho: uma sentinela curta aborta o tombstone com 23514 dentro do smoke. Sem veredito, a armadilha passaria e o smoke ficaria verde sobre ela"
  - "A migration foi MONTADA por script, com os corpos lidos do ARQUIVO e as edicoes aplicadas por substituicao de ancora UNICA (0 ou 2 ocorrencias abortam a montagem). Transcrever 730 + 540 linhas e o que fez duas das cinco migrations do M8 chegarem a PROD com os comentarios descartados"
  - "ZERO `DELETE` nesta migration, e o pos-portao reprova se aparecer um. A excecao decidida (D-62, as 4 tabelas de resposta) e do passo NOVO do 49-20 — e o pos-portao procura a forma por regex POSIX, nao pela string literal, porque o `<verify>` deste plano varre o arquivo pela string e uma assercao literal reprovaria a si mesma (PATTERNS §K com outra cara)"
  - "A rede estrutural (C3/v) cresceu ANTES do re-pin, no MESMO commit, com a proveniencia escrita no cabecalho. Um md5 recem-carimbado casa com QUALQUER corpo, inclusive um em que o passo novo nunca existiu"
  - "DOZE mutacoes em vez de uma. O plano pedia uma (os corpos anteriores + o smoke). Um smoke e fail-fast: uma mutacao que desfaz varios consertos produz UM `FAIL` e deixa os demais PARECENDO provados. Cada clausula nova ganhou a sua inversao exata, e duas delas (M6b, M10b) existem porque a inversao obvia reprovava por OUTRA assercao"
  - "`main` mantida como branch de trabalho (autorizacao explicita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Nao registrado como desvio"

patterns-established:
  - "Quando a coluna escrita e NULAVEL, `GET DIAGNOSTICS ROW_COUNT` nao e a contagem do que foi apagado — e a contagem de linhas visitadas. A diferenca vira uma promessa falsa no recibo"
  - "Um portao que precisa de um limiar (tamanho minimo, contagem, janela) LE o limiar do catalogo vivo em vez de transcrever o valor de hoje. Transcrito, ele fotografa; lido, ele acompanha"
  - "Provar que uma rede de FORMA morde exige simular o cenario para o qual ela existe — no caso de um pin de md5, isso e mutar o corpo E re-pinar. Com o pin antigo a assercao de md5 reprova primeiro e a rede de forma fica sem prova propria"
  - "Antes de culpar o proprio conserto por uma FAIL num smoke vizinho, restaurar os corpos ANTERIORES numa requisicao que aborta e rodar o mesmo smoke. Uma FAIL identica nos dois mundos e alheia — e essa medicao custa um minuto contra horas de conserto na direcao errada"

requirements-completed: []

coverage:
  - id: D1
    description: "O conteudo que o titular mandou as analises automaticas (`ai_call_logs.user_prompt_template`) sai com ele — no MESMO UPDATE que faz `candidato_id := NULL`, porque e o `candidato_id` que acha a linha (D-61)"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B12) o valor de ANTES carrega o nome do titular sintetico (nao-vacuidade) e o de DEPOIS e a sentinela, sem o nome"
        status: pass
      - kind: integration
        ref: "mutacao M1 (o (1/5) volta a nao rasgar `user_prompt_template`) ⇒ FAIL (B12) «user_prompt_template do titular SOBREVIVEU ao tombstone»"
        status: pass
      - kind: integration
        ref: "mutacao M10b (a sentinela sai para um UPDATE SEPARADO antes do (1/5) + re-pin descuidado para o md5 mutado) ⇒ FAIL (C3/v) «NAO esta na mesma lista SET» — a forma reprova o que hoje funciona e amanha nao"
        status: pass
      - kind: other
        ref: "PROD: `pg_get_functiondef(anonimizar_candidato)` contem a lista SET contigua `candidato_id = NULL, parsed_reasoning = NULL, raw_response = ..., user_prompt_template = '[conteudo enviado...'`; `md5(prosrc)` = 6ab2890ebfc87fbd489215579bf1d9f8"
        status: pass
    human_judgment: false
  - id: D2
    description: "As linhas `comparative_ranking` que CITAM uma candidatura do titular sao redigidas INTEIRAS (as tres colunas de conteudo) — elas tem `candidato_id` NULL por desenho e o motor nunca as alcancava (D-63)"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B13) a fixture citava `id=<candidatura do titular>` ANTES (nao-vacuidade); DEPOIS: `user_prompt_template` redigido, `raw_response` com a sentinela PROPRIA `anonimizacao_p49_comparativo`, `parsed_reasoning` sem o nome"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B14) ⊖ a OUTRA linha de comparativo, a que NAO cita o titular, ficou IDENTICA nas tres colunas"
        status: pass
      - kind: integration
        ref: "mutacao M2 (o passo (0/5) removido inteiro) ⇒ FAIL (B13/user_prompt_template)"
        status: pass
      - kind: integration
        ref: "mutacao M3 (o predicado perde o `EXISTS`, redigindo TODA linha de comparativo do banco) ⇒ FAIL (B14) «o tombstone redigiu uma linha que NAO cita o titular» — o escopo vazado destruiria historico de IA de terceiros"
        status: pass
    human_judgment: false
  - id: D3
    description: "A resposta que o revisor escreveu ao pedido de revisao do Art. 20 (`revisao_resultado`) sai da linha corrente E de TODAS as versoes do arquivo, inclusive a que o snapshot cria DURANTE o proprio passo carregando o valor antigo (D-60)"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B15/corrente) valor de ANTES presente na fixture, valor de DEPOIS = sentinela, sem `SMOKE P45`"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B15/arquivo) ZERO versoes com copia identificavel (contra os DOIS valores de ANTES), e a metade de nao-vacuidade: 2 versoes com `revisao_resultado` nao nulo (sentinela, nunca NULL — o CHECK exige >= 50 caracteres uteis)"
        status: pass
      - kind: integration
        ref: "mutacao M4 (a corrente volta a nao rasgar) ⇒ FAIL (B15/corrente)"
        status: pass
      - kind: integration
        ref: "mutacao M5 (o arquivo volta a nao rasgar) ⇒ FAIL (B15/arquivo) «2 versao(oes) … ainda carregam a resposta do revisor IDENTIFICAVEL»"
        status: pass
      - kind: integration
        ref: "mutacao M6b (ordem invertida SO na coluna nova, mantendo a da `justificativa` correta) ⇒ FAIL (B15/arquivo) «1 versao(oes)» — a armadilha M1 isolada na coluna que nasceu depois"
        status: pass
    human_judgment: false
  - id: D4
    description: "O dry-run PREVE exatamente o que o motor executa, pela MESMA expressao — as tres contagens novas em `plano_exclusao_titular` e em `'passos'`"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B16) tres fontes na mesma transacao: a expressao medida a mao antes do tombstone, o `'plano'` que o motor leu no PASSO 0, e o `'passos'` que ele declarou — corrente 1 = 1 = 1, comparativo 1 = 1 = 1"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B16/arquivo) a relacao DERIVADA: `passos.revisao_resultado_arquivo` = `plano` + `correntes` = 1 + 1 = 2, porque o snapshot arquiva durante o passo"
        status: pass
      - kind: integration
        ref: "mutacao M7 (`plano_exclusao_titular` perde as tres contagens) ⇒ FAIL (B16) «o dry-run NAO expoe as tres contagens novas (corrente=<ausente>…)»"
        status: pass
      - kind: integration
        ref: "mutacao M8 (o motor conta o arquivo ANTES do UPDATE da corrente) ⇒ FAIL (B16/arquivo) «declarou 1 e o esperado e 2»"
        status: pass
    human_judgment: false
  - id: D5
    description: "A migration esta aplicada E escriturada, com `md5(statements[1])` do ledger conferido contra o md5 do disco, ENSAIADA em requisicao que aborta ANTES do apply; nenhuma linha apagada, nenhum `DELETE` no corpo, e o motor NAO foi executado contra dado real"
    verification:
      - kind: other
        ref: "ledger: 20260922000012 = 34f803a24f7162e979d66b48aaf8187b (111 116 octetos) — identico ao md5 do disco, lido de volta; `version` nasceu correta (nenhum reparo)"
        status: pass
      - kind: other
        ref: "ensaio (migration + smoke ampliado + `RAISE 'ENSAIO_OK'`, UMA requisicao que aborta) ANTES do apply: abortou em `ENSAIO_OK`, sem `FAIL`; e o `md5(prosrc)` vivo continuava o ANTIGO depois dele (o ensaio nao vazou)"
        status: pass
      - kind: other
        ref: "estado de PROD antes/depois: `ai_call_logs` 55 (1 `comparative_ranking`), `decisao_final` 7, `decisao_final_historico` 11, `revisao_resultado` nao nulo 1/1, `config_purga.modo = dry_run`. Nada mutado — toda escrita do smoke e das 12 mutacoes viveu em requisicao que aborta"
        status: pass
      - kind: other
        ref: "pos-portao do apply: reprova qualquer `DELETE` no corpo (por regex POSIX), exige a ordem corrente -> arquivo por POSICAO, a lista SET contigua do (1/5), as tres chaves no motor E no plano, e a nao-regressao do 4o ramo do guard / das duas variaveis do D-46-24 / da normalizacao `coalesce(p_dry_run, true)` / do terminador `P45DR`"
        status: pass
      - kind: other
        ref: "`npm run -s lint` = 89 erros (teto D-53 = 90; baseline congelada do hook = 96). Este plano nao toca `src/` nem `supabase/functions/`"
        status: pass
    human_judgment: false
  - id: D6
    description: "A purga automatica estava em ENSAIO no instante do apply — nenhum titular real passa pelo motor alterado antes do checkpoint do 49-19 (D-54)"
    verification:
      - kind: other
        ref: "`config_purga` lida so leitura antes de escrever uma linha: `modo = 'dry_run'`, cap 50, janela 24 meses, atualizado em 2026-08-23 02:06. O pre-portao da migration ABORTA o apply se o modo nao for `dry_run`"
        status: pass
    human_judgment: false
  - id: D7
    description: "O smoke `p45_motor_exclusao_smoke` passa 30/30 com o contador LIDO, e `p46_purga_smoke` fecha 27/27 sobre os corpos novos"
    verification:
      - kind: integration
        ref: "`p45_motor_exclusao_smoke` com um `RAISE` de leitura do contador no fim: `CONTADOR=30` — antes das mutacoes e DEPOIS delas"
        status: pass
      - kind: integration
        ref: "`p46_purga_smoke` = `P46P_REG_CONTADOR=27` (gate cheio), com a fixture-seed do 46-01 devolvida a `ativa` DENTRO da requisicao que aborta. Ver «Registrado, nao consertado»: a (j.2) reprova por estado alheio, medido identico com os corpos ANTERIORES"
        status: pass
    human_judgment: false

# Metrics
duration: 88 min
completed: 2026-09-23
status: complete
---

# Phase 49 Plano 14: O motor apaga o que o titular mandou para a IA, os comparativos que o citam, e a resposta do revisor Summary

**Excluir um titular passa a apagar o INPUT que ele mandou ao modelo (nome, texto, fala literal transcrita), as linhas de comparativo que o CITAM — que o motor nunca alcancava porque o `candidato_id` delas e NULL por desenho — e a resposta que o revisor escreveu ao seu pedido de revisao do Art. 20, na linha corrente e em TODAS as versoes do arquivo; o dry-run conta o mesmo pela mesma expressao, e a mordida esta provada por DOZE inversoes, uma por clausula, nenhuma delas vazando para PROD.**

## Performance

- **Duration:** 88 min
- **Started:** 2026-09-23T03:55:00Z
- **Completed:** 2026-09-23T05:23:00Z
- **Tasks:** 1 / 1
- **Files:** 2 (1 criado, 1 modificado)

## A precondicao, lida antes de escrever uma linha

`config_purga.modo = 'dry_run'` (cap 50 titulares, janela de notificacoes 24 meses,
alterado 2026-08-23 02:06 por `6970c8f9-…`). A purga automatica esta em ENSAIO, e e por
isso que este apply pode acontecer: o cron `purga-retencao-sweep` dispara toda noite e
CHAMA este motor. Com `modo = 'live'`, o motor ALTERADO alcancaria titular real antes do
checkpoint do 49-19, que e onde a primeira execucao real foi deliberadamente posta (D-54).

⚠ A precondicao nao ficou so lida: ela virou **pre-portao da migration**. Um apply futuro
com a purga em `live` aborta com `P49-14 PRE-PORTAO`. Uma pre-condicao conferida uma vez
nao sobrevive ao dia em que alguem liga a purga e reaplica o arquivo.

## Medicoes vivas (D-49 / D-51) — o plano nao foi ajustado para caber

Tudo abaixo foi medido em PROD, so leitura, ANTES de escrever uma linha.

| O que o plano assume | Medido em PROD (2026-09-23) | Bate? |
|---|---|---|
| `md5(prosrc)` do motor = pin `5209239f…` | **`5209239f191aa15b1725b726b00eb4cd`**, length 46 246 | sim |
| `md5(prosrc)` do plano = pin `42f916d8…` | **`42f916d81cd274b28044a410ae57a237`**, length 26 220 | sim |
| os corpos do ARQUIVO sao byte a byte os vivos | extraidos de `20260823000006`/`20260823000008`: md5 **identicos** aos vivos (conferencia CRUZADA) | sim |
| `ai_call_logs.user_prompt_template` nulavel? | **`text NOT NULL`** → sentinela, nunca NULL | sim (informou a forma) |
| `ai_call_logs.raw_response` | **`jsonb NOT NULL`** → sentinela jsonb propria | sim |
| `ai_call_logs.parsed_reasoning` | `text` NULAVEL — mesmo assim recebe sentinela (D-63 pede redacao, nao anulacao) | sim |
| `ai_call_logs` tem `candidatura_id`? | **NAO** — nao existe coluna. O unico endereco e o `id=` dentro do prompt | sim (e a razao do `position`) |
| linhas `comparative_ranking` com `candidato_id` | **1 linha, `candidato_id` NULL** (as 54 outras, de 6 tipos, todas com `candidato_id` menos 1 `cv_summary`) | sim |
| formato do prompt de comparativo | `` `Candidato C${i+1} (id=${r.candidatura_id})` `` — `comparativo-candidatos/index.ts:382` | sim |
| `decisao_final.revisao_resultado` / no arquivo | `text` NULAVEL nas duas; **1 linha nao nula em cada** | sim |
| `config_purga.modo` | **`dry_run`** | sim |
| `tsc` ≤ 90 (D-53) | **89** (baseline congelada do hook = 96) | sim |

### ⚠ E uma medicao que o plano NAO previa, e ela mudou o desenho

`decisao_final` tem um CHECK vivo que o plano nao menciona:

```
decisao_final_revisao_justificativa_min_check
  CHECK ((revisao_veredito IS NULL) OR (length(btrim(COALESCE(revisao_resultado,''))) >= 50))
```

Consequencias, as duas necessarias:

1. **A sentinela da revisao tem comprimento LOAD-BEARING.** Uma sentinela curta nao
   falha no apply — falha com **23514 no primeiro pedido REAL**, e nesse instante o
   curriculo do titular ja foi apagado do Storage, sem PITR e sem backup de Storage.
   E o **Pitfall 1** desta fase, com nome e endereco. Virou portao de apply, e o minimo
   e **lido do catalogo vivo** por `regexp_match` sobre `pg_get_constraintdef`: se
   alguem subir o CHECK para 80, o portao reprova o apply e manda alongar a sentinela,
   em vez de deixar o 23514 esperando.
2. **A fixture do smoke ganhou o ciclo de revisao COMPLETO** (veredito + revisor + data
   + texto), e nao `revisao_resultado` solto. Com o veredito preenchido, a fixture
   **exercita** o CHECK: uma sentinela curta aborta o tombstone dentro do smoke. Sem
   veredito, a armadilha passaria e o smoke ficaria verde sobre ela.

E o CHECK irmao (`..._resposta_completa_check`) prova que o caso «veredito sem texto»
nao existe: os tres campos vao juntos ou nenhum vai. Ou seja, `revisao_resultado IS NULL`
implica `revisao_veredito IS NULL`, e por isso o ramo `THEN NULL` do `CASE` e seguro.

## Passo 1 — C4 do kickoff re-executada: «origem prometida → acao no motor → asserção»

| # | Item do recibo | O que o recibo afirma | Acao no motor, medida AGORA | Asserção que a vigia |
|---|---|---|---|---|
| 1 | `respostas_e_producoes` (14 origens: `respostas_raven`, `respostas_bigfive`, `respostas_disc`, `respostas_formulario`, textos, transcricoes) | «foram apagados» | **nenhuma** — o motor nao toca as 14 tabelas. `respostas_raven` ausente do corpo vivo (medido `false`) | **plano 49-20** (passo `apagar_respostas_e_producoes`, D-48/D-62) — este plano deixa o corpo de que ele parte |
| 1b | `devolutivas_candidato.conteudo_jsonb` | apagada | a linha morre por **FK CASCADE** para `auth.users` no passo 3 | ja coberta (verdade por FK, nao pelo motor) |
| 3 | `dados_enviados_a_analise_automatica` | «o conteudo enviado para as analises automaticas … foram apagados» | **FECHADO AQUI**: `user_prompt_template` recebe sentinela no MESMO UPDATE de `candidato_id := NULL` | **(B12)** + mutacoes M1, M10b; (C3/v) `v_upt_junto` |
| 4 | idem, linhas `comparative_ranking` | idem | **FECHADO AQUI**: passo (0/5) novo, achado por `position('id=' \|\| candidatura_id IN user_prompt_template)`, redigindo as TRES colunas de conteudo | **(B13)** positiva + **(B14)** negativa; mutacoes M2, M3 |
| 5 | citacoes literais em `redacoes_candidato.analise_ia` e na `metadata` SJT (`cited_evidence`) | «o texto foi apagado» e o trecho fica | **nenhuma** — `cited_evidence` ausente do corpo vivo (medido `false`) | **plano 49-20** |
| 6 | `tabelas_sem_pii_titular` afirma `analise_candidato_vaga` e `entrevista_guias` «sem PII» | — | fora do escopo do motor: e **defeito de inventario** (13/24 analises e 2/5 guias contem o primeiro nome) | **operador / 49-21** (ver «Registrado, nao consertado») |
| 7 | `anotacoes_da_equipe` inclui `decisao_final.revisao_resultado` | «fica sem ligacao com voce» | **FECHADO AQUI**: sentinela nos DOIS UPDATEs do tombstone, ordem corrente → arquivo | **(B15)** corrente + arquivo; mutacoes M4, M5, M6b; (C3/v) `v_rev_corr`/`v_rev_arq`/`v_rev_ordem` |

⚠ **O recibo ainda diz MENOS do que o motor apaga, e a direcao e a que importa.** O
`recibo-exclusao.json:500` e `:534` mapeiam `ai_call_logs.user_prompt_template` como
`conteudo_do_produto` — isto e, conteudo PRESERVADO. Alinhar os tres artefatos gerados e
o **plano 49-21**, e ele vem ANTES de qualquer execucao real (49-19). Entre este plano e
aquele, o recibo promete menos do que a exclusao entrega; nunca mais, que seria a
promessa vazia.

## Passo 1 — varredura de portoes pela FORMA (`CLAUDE.md` §«Portoes»)

Padrao do `CLAUDE.md` sobre `supabase/tests/*.sql`: **abertura 310** → **fecho 311**.
Um unico achado novo, e ele e meu:

| Linha | Forma | Classificacao |
|---|---|---|
| `p45_motor_exclusao_smoke.sql:1653` — `IF v_revh_ident <> 0` | contagem contra constante | **escopo deliberado**: «zero copia identificavel sobrevivendo no arquivo» e invariante, nao fotografia. Mesma classificacao da irma `v_justh_ident <> 0` da (B7), que ja existia |

**Nenhum achado da varredura cita `anonimizar_candidato` nem `plano_exclusao_titular`** —
os conhecidos (os dois pins de md5 e o contador) nao casam o padrao porque comparam
contra VARIAVEL (`v_md5_anon IS DISTINCT FROM v_pin_anon`, `v_asserts <> v_esperado`), e
isso e correto: o pin e escopo deliberado documentado, e o contador tem o bump registrado
no cabecalho.

A migration nao acrescenta nenhuma forma-fotografia: as suas comparacoes sao contra
variavel (`v_md5_anon IS DISTINCT FROM v_esp_anon`, `v_len_sent < v_min_rev` com o minimo
LIDO do catalogo) ou `position(...) = 0` / `> 0`, que nao e contagem contra constante.

## Task Commits

1. **Task 1 (tracer): o input da IA, os comparativos que citam e a resposta do revisor** — `293f86f8` (feat)

**Ledger de PROD:**

| version | name | md5 do arquivo | md5 do ledger | octetos |
|---|---|---|---|---|
| 20260922000012 | p49_motor_logs_e_revisao | `34f803a24f7162e979d66b48aaf8187b` | `34f803a24f7162e979d66b48aaf8187b` | 111 116 |

A `version` nasceu correta (nenhum reparo de ledger). O md5 do ledger foi **lido de
volta** e conferido, porque «aplicado» e «escriturado» sao afirmacoes diferentes.

## md5 e catalogo — antes e depois (⚠ o PRE-PORTAO do plano 49-20 sai daqui)

| Objeto | Antes do apply | Depois (vivo) |
|---|---|---|
| `anonimizar_candidato(uuid,boolean)` | `5209239f191aa15b1725b726b00eb4cd` (length 46 246 / 47 549 octetos) | **`6ab2890ebfc87fbd489215579bf1d9f8`** (length **54 807** / 56 226 octetos) |
| `plano_exclusao_titular(uuid)` | `42f916d81cd274b28044a410ae57a237` (length 26 220 / 27 392 octetos) | **`12bfca3bf936704f1bc581acd5061df3`** (length **28 413** / 29 603 octetos) |
| pins do `p45_motor_exclusao_smoke` (C3/i) | os dois antigos | **os dois novos, re-pinados no MESMO commit, com a rede (C3/v) crescida ANTES** |
| contador do RESUMO (z) | 25 | **30** |
| ACL das duas funcoes | `service_role` + `authenticated`, sem `anon`/`PUBLIC` | **identico** (reemitido de proposito: `pg_default_acl` deste schema concede a `anon` como grant DIRETO) |

## Ensaio ANTES do apply

| Ensaio | Conteudo (uma requisicao, que aborta) | Resultado |
|---|---|---|
| sonda de forma | a migration sozinha + `RAISE 'SONDA_MIGRATION_OK'` | abortou em `SONDA_MIGRATION_OK` — os dois portoes passaram e o PL/pgSQL compila |
| 1 | `…000012` + `p45_motor_exclusao_smoke` ampliado + `RAISE 'ENSAIO_OK'` | abortou em **`ENSAIO_OK`**, sem `FAIL` |
| conferencia | `md5(prosrc)` lido DEPOIS do ensaio | ainda os ANTIGOS — **o ensaio nao vazou** |

## O portao morde (medido nesta sessao) — DOZE inversoes, uma por clausula

Um smoke e fail-fast, e a licao que esta fase acumulou e que uma mutacao que desfaz
varios consertos de uma vez produz UM `FAIL` e deixa os demais **parecendo provados**. O
plano pedia UMA (os corpos anteriores + o smoke). Cada clausula ganhou a sua inversao
exata, aplicada em requisicao atomica que ABORTA:

| Mutacao | Inversao | Esperado | Saida |
|---|---|---|---|
| **M1** | o (1/5) volta a nao rasgar `user_prompt_template` (D-61 desfeito) | `FAIL (B12)` | `P45M FAIL (B12): ai_call_logs.user_prompt_template do titular SOBREVIVEU ao tombstone (depois=SMOKE P45 fixture (input): curriculo de SMOKE P45 Titular Sintetico, …)` |
| **M2** | o passo (0/5) dos comparativos REMOVIDO inteiro (D-63 desfeito) | `FAIL (B13)` | `P45M FAIL (B13/user_prompt_template): a linha comparative_ranking que CITA o titular sobreviveu (depois=… Candidato C1 (id=d21ffdf9…))` |
| **M3** | o predicado do (0/5) perde o `EXISTS` — rediga TODA linha de comparativo do banco | `FAIL (B14)` | `P45M FAIL (B14): o tombstone redigiu uma linha comparative_ranking que NAO cita o titular (antes=… que NAO cita …, depois=[entrada de comparativo removida …])` |
| **M4** | o tombstone da CORRENTE volta a nao rasgar `revisao_resultado` | `FAIL (B15/corrente)` | `P45M FAIL (B15/corrente): decisao_final.revisao_resultado sobreviveu ao tombstone (depois=SMOKE P45 fixture: resposta do revisor …)` |
| **M5** | o tombstone do ARQUIVO volta a nao rasgar `revisao_resultado` | `FAIL (B15/arquivo)` | `P45M FAIL (B15/arquivo): 2 versao(oes) de decisao_final_historico do titular ainda carregam a resposta do revisor IDENTIFICAVEL` |
| **M6** | ORDEM INVERTIDA dos dois UPDATEs inteiros | `FAIL` de ordem | `P45M FAIL (B7): 1 linha(s) … ainda carregam justificativa IDENTIFICAVEL` — reprovou pela assercao **ANTIGA**, que mede a mesma ordem na `justificativa`. Registrado, e foi o que motivou a M6b |
| **M6b** | ordem invertida **SO na coluna nova** (a `justificativa` mantem a ordem certa) | `FAIL (B15/arquivo)` | `P45M FAIL (B15/arquivo): 1 versao(oes) … ainda carregam a resposta do revisor IDENTIFICAVEL` — a armadilha M1 **isolada** na coluna que nasceu depois |
| **M7** | `plano_exclusao_titular` perde as tres contagens | `FAIL (B16)` | `P45M FAIL (B16): o dry-run NAO expoe as tres contagens novas (corrente=<ausente>, arquivo=<ausente>, comparativo=<ausente>)` |
| **M8** | o motor conta o arquivo **ANTES** do UPDATE da corrente | `FAIL (B16/arquivo)` | `P45M FAIL (B16/arquivo): o motor declarou 1 revisoes raspadas no arquivo e o esperado e 2 (plano 1 + 1 linha(s) corrente(s) que o snapshot acabou de arquivar)` |
| **M9** | os DOIS corpos ANTERIORES ao apply, inteiros (a inversao que o plano pede) | `FAIL (B12)` | `P45M FAIL (B12): … SOBREVIVEU ao tombstone` — a primeira assercao nova deste plano, como o plano previu |
| **M10** | FORMA: a sentinela do input sai para um UPDATE SEPARADO **antes** do (1/5) | `FAIL` de forma | `P45M FAIL (C3/i): o corpo VIVO … NAO casa byte a byte (md5 vivo=9e68daed…)` — reprovou pelo **pin**, nao pela forma. Registrado, e foi o que motivou a M10b |
| **M10b** | o MESMO corpo da M10 **+ um re-pin descuidado** para o md5 mutado | `FAIL (C3/v)` | `P45M FAIL (C3/v): user_prompt_template NAO esta na mesma lista SET que faz candidato_id := NULL no passo (1/5)` — a rede de FORMA mordendo exatamente no cenario para o qual existe |

Em nenhuma delas a saida chegou a `MUTACAO_TERMINOU` — o marcador que apareceria se o
portao NAO mordesse.

### Duas honestidades sobre as mutacoes, e as duas geraram trabalho

1. **A M6 reprovou pela assercao ERRADA, e isso e informacao.** Inverter a ordem dos dois
   UPDATEs quebra a `justificativa` E a `revisao_resultado` ao mesmo tempo, e a (B7) —
   que existe desde a Phase 45 — dispara primeiro. Sem a **M6b**, a clausula de ORDEM da
   (B15/arquivo) ficaria *parecendo* provada por uma mutacao que provou outra coisa. A
   M6b isola o defeito na coluna nova mantendo a `justificativa` correta, e reprova onde
   deve.
2. **Provar que uma rede de FORMA morde exige simular o cenario para o qual ela existe.**
   A M10 muda o corpo, logo a (C3/i) — o md5 — reprova antes de a (C3/v) ser alcancada.
   Isso significa que **nenhuma mutacao de corpo consegue provar (C3/v)**: a unica
   situacao em que ela e a primeira a falar e o **re-pin**. A M10b reproduz exatamente
   isso (corpo mutado + pin atualizado para o corpo mutado, como faria alguem que
   re-pinou sem revisar), e a (C3/v) reprova. E o argumento de D-46-18 obrigacao 4
   fechado por execucao, e nao por afirmacao.

**Nenhuma mutacao vazou:** depois das doze, `md5(prosrc)` vivo de `anonimizar_candidato` e
`6ab2890e…` e de `plano_exclusao_titular` e `12bfca3b…` (os do pos-portao); `ai_call_logs`
55 linhas com 1 `comparative_ranking`; `decisao_final` 7 / `decisao_final_historico` 11
com 1 `revisao_resultado` nao nulo em cada; `config_purga.modo = dry_run`; e o
`p45_motor_exclusao_smoke` volta a **30/30** (contador LIDO, nao inferido de «nao
levantou»).

## Regressao em PROD

| Smoke / prova | Como | Resultado |
|---|---|---|
| `p45_motor_exclusao_smoke.sql` | `run`, com `RAISE` de leitura do contador no fim | **`CONTADOR=30`** (antes e depois das mutacoes) |
| `p46_purga_smoke.sql` | `run` puro | **FAIL (j.2)** — ⚠ alheio a este plano, ver abaixo |
| `p46_purga_smoke.sql` | com a fixture-seed do 46-01 devolvida a `ativa` DENTRO da requisicao que aborta | **`P46P_REG_CONTADOR=27`** (gate cheio) |
| `p46_purga_smoke.sql` | com os corpos **ANTERIORES** ao apply restaurados na requisicao que aborta | **FAIL (j.2) IDENTICA** — a prova de que e alheia |
| `npm run -s lint` | | **89** erros (teto D-53 = 90) |

### ⚠ A FAIL do `p46_purga_smoke` (j.2) e alheia, e eu medi antes de acreditar nisso

```
P46P FAIL (j.2): ⊖ NAO-VACUIDADE — a vaga 4601d000-0000-4000-8000-000000000003 da
candidatura 4601c000-0000-4000-8000-000000000006 esta em status [arquivada] (esperado ativa)
```

A vaga e a fixture-seed `fixture-p46 vaga ativa (sintetica)`, e ela esta `arquivada`
desde **2026-08-23 17:47** — um mes antes deste plano. O reflexo errado era assumir que o
meu `CREATE OR REPLACE` a tinha causado. A medicao que fecha a questao: **restaurei os
dois corpos ANTERIORES numa requisicao que aborta e rodei o mesmo smoke — a FAIL e
IDENTICA, na mesma linha, com a mesma mensagem.**

E a (j.2) esta **correta ao reprovar**: com a vaga ja fechada, «a candidatura nao aparece
em `candidaturas_alem_da_janela()`» seria verdade pelo motivo errado, e a assercao existe
para nao aceitar isso. O defeito e de **estado de fixture-seed que derivou**, nao de
portao nem de motor. Nao foi consertado (fora do escopo deste plano; a correcao e um
`UPDATE` retroativo numa fixture-seed, que e territorio de checkpoint) e esta registrado
em `.planning/WINDOWS.md` como `unrun-verify`.

⚠ **O que importa para ESTE plano:** a (j.2) esta na linha 1532 e bloqueia as assercoes
`(o)`, `(o.6)`, `(o.7)` e `(p)` (linhas 1677-1716), que sao **justamente** as que
exercitam o 4o ramo do guard de `anonimizar_candidato` — a funcao que eu reescrevi.
Deixar a regressao sem medicao por causa de um defeito alheio seria aceitar um verde que
nao existe. Por isso medi com a vaga devolvida a `ativa` **dentro da requisicao que
aborta**: **27/27**, gate cheio, zero regressao. A vaga continua `arquivada` em PROD (o
aborto reverteu) — e esta escrito aqui que foi uma medicao, nao um conserto.

A assercao `(b)`, que chama o motor em TODOS os titulares elegiveis com o corpo COMPLETO
executando e sendo revertido, passa na linha 1433, **antes** da (j.2) — ou seja, ela ja
estava verde no `run` puro.

## Deviations from Plan

### Registradas

**1. [Rule 2 — funcionalidade critica ausente] O comprimento da sentinela virou portao de apply, lendo o minimo do CHECK vivo**
- **Found during:** Task 1, Passo 2 (medicao do catalogo antes de escrever a sentinela)
- **Issue:** o plano especifica «sentinela em `text` NOT NULL; NULL onde a coluna
  aceita» e nao menciona `decisao_final_revisao_justificativa_min_check`, que exige
  `length(btrim(coalesce(revisao_resultado,''))) >= 50` sempre que ha veredito. Uma
  sentinela curta **nao falha no apply**: falha com 23514 no primeiro pedido REAL, depois
  de o curriculo ja ter sido apagado do Storage — Pitfall 1, o modo de falha mais caro
  desta fase.
- **Fix:** pos-portao que extrai a sentinela do corpo INSTALADO (`regexp_match`) e a
  compara com o minimo **lido de `pg_get_constraintdef`** do CHECK vivo. Constante
  transcrita seria fotografia do CHECK de hoje; lido, o portao acompanha. E a fixture do
  smoke ganhou o ciclo de revisao completo, para que o CHECK seja **exercitado** por
  execucao e nao apenas por forma.
- **Files modified:** os dois arquivos do plano
- **Verification:** o pos-portao passou no apply (com sentinela curta ele levantaria); o
  smoke passa com o veredito preenchido, o que prova que o CHECK aceita a sentinela real
- **Committed in:** `293f86f8`

**2. [Escopo — ampliacao deliberada] DOZE mutacoes em vez de uma, e duas delas nasceram de mutacoes que reprovaram pela assercao errada**
- **Found during:** Task 1, Passo 5
- **Issue:** o plano pede UMA prova de mordida (os corpos anteriores + o smoke). Com um
  smoke fail-fast, as outras quatro assercoes novas ficariam sem prova PROPRIA. E duas
  inversoes «obvias» reprovaram pela assercao errada: a M6 (ordem invertida) disparou a
  (B7) da `justificativa`, e a M10 (forma) disparou o pin (C3/i).
- **Fix:** doze inversoes — M1..M5 e M7..M9 uma por clausula; M6b isolando a ordem na
  coluna nova; M10b simulando o re-pin descuidado, que e a UNICA situacao em que a
  (C3/v) e a primeira a falar.
- **Files modified:** nenhum (as mutacoes vivem no scratchpad; nunca no repositorio)
- **Verification:** ver a tabela «O portao morde»; nenhuma chegou a `MUTACAO_TERMINOU`
- **Committed in:** n/a (prova de sessao)

**3. [Rule 2 — registro desatualizado] O `COMO RODAR` do smoke mandava usar a via MCP, obsoleta desde a Phase 46**
- **Found during:** Task 1, Passo 3
- **Issue:** o cabecalho instruia rodar por `execute_sql` do MCP «pelo orquestrador». Essa
  via esta obsoleta (`CLAUDE.md` §«Via de apply ATUAL»), e pelo motivo que importa neste
  arquivo: ela depende de o SQL ser TRANSCRITO. Quem seguisse a instrucao seguiria o
  caminho que fez duas migrations do M8 chegarem a PROD com os comentarios descartados.
  O `CLAUDE.md` deste projeto e explicito: «registro desatualizado custa o mesmo que
  registro ausente — e este custava mais, porque vinha com autoridade».
- **Fix:** trocado por `node p46apply.cjs run supabase/tests/p45_motor_exclusao_smoke.sql`,
  com a razao mecanica da requisicao unica preservada (e observando que o `run` a satisfaz
  por construcao). A afirmacao retirada foi **descrita, nao reproduzida** (PATTERNS §K).
- **Files modified:** `supabase/tests/p45_motor_exclusao_smoke.sql`
- **Verification:** o smoke foi rodado exatamente por essa via, 30/30
- **Committed in:** `293f86f8`

**4. [Registro] A regressao do `p46_purga_smoke` foi medida com a fixture-seed reparada DENTRO de requisicao que aborta**
- **Found during:** Task 1, Passo 4
- **Issue:** o `<verify>` #3 do plano exige `p46_purga_smoke` verde. Ele reprova em (j.2)
  por estado de fixture-seed que derivou em 2026-08-23 — medido IDENTICO com os corpos
  anteriores. A (j.2) bloqueia as assercoes que exercitam o 4o ramo do guard do motor.
- **Fix:** medida a regressao com a vaga devolvida a `ativa` dentro da requisicao que
  aborta: **27/27**. A vaga continua `arquivada` em PROD. Registrado em `WINDOWS.md`.
- **Files modified:** `.planning/WINDOWS.md`
- **Verification:** `P46P_REG_CONTADOR=27`; `status` da vaga relido depois = `arquivada`
- **Committed in:** metadado deste plano

**5. [Processo] O `<verify>` #1 do plano proibia a forma literal que o pos-portao precisava usar**
- **Found during:** Task 1, Passo 2
- **Issue:** o `<verify>` varre o arquivo por `/DELETE\s+FROM/i` nas linhas de codigo, e o
  pos-portao precisa asserir a AUSENCIA dessa forma no corpo instalado. Escrito com a
  string literal, o portao reprovaria a si mesmo.
- **Fix:** o pos-portao usa o padrao POSIX `'DELETE[[:space:]]+FROM'`, que expressa a
  mesma proibicao sem conter a forma proibida — e o comentario inline diz por que. E a
  §K do PATTERNS num registro novo: descrever a forma proibida sem reproduzi-la.
- **Files modified:** `supabase/migrations/20260922000012_p49_motor_logs_e_revisao.sql`
- **Verification:** `<verify>` #1 passa (`OK`); o pos-portao passa no apply
- **Committed in:** `293f86f8`

---

**Total deviations:** 5 (1 da Regra 2 por CHECK nao previsto, 1 da Regra 2 por registro
desatualizado, 1 ampliacao deliberada de escopo, 2 de processo/registro). **O estado vivo
medido bateu integralmente com o que o plano assume** — os dois md5, a nulabilidade das
tres colunas de `ai_call_logs`, a ausencia de `candidatura_id`, a linha unica de
`comparative_ranking` com `candidato_id` NULL, o formato do prompt, `revisao_resultado`
nao nulo em 1 linha de cada tabela, e a purga em `dry_run`.
**Impact on plan:** o artefato e MAIS forte que o pedido (5 assercoes + 8 clausulas de
rede de forma em vez das «uma por coluna nova», 12 mutacoes em vez de 1, e um portao de
apply que o plano nao previa). Nada aplicado em PROD alem do que o plano especifica.

## Registrado, nao consertado

- **`p46_purga_smoke` (j.2)** reprova por estado de fixture-seed alheio (a vaga
  `4601d000-…-0003` esta `arquivada` desde 2026-08-23). Medido pre-existente por execucao
  com os corpos anteriores. Registrado em `.planning/WINDOWS.md` como `unrun-verify`. O
  conserto e um `UPDATE` retroativo em fixture de PROD — territorio de checkpoint (D-54),
  nao de agente.
- **O recibo e o inventario ainda descrevem `user_prompt_template` como preservado**
  (`docs/compliance/recibo-exclusao.json:500` e `:534`,
  `src/features/privacidade/constants/reciboExclusao.generated.ts`). E o **plano 49-21**,
  que vem ANTES de qualquer execucao real (49-19). A direcao do desalinhamento e a segura:
  o recibo diz MENOS do que o motor apaga.
- **Os itens 1 e 5 da C4** (`respostas_e_producoes`, as 14 tabelas; e `cited_evidence` em
  `redacoes_candidato.analise_ia` / `metadata` SJT) seguem abertos. Medido no corpo vivo:
  `respostas_raven` e `cited_evidence` **ausentes**. E o passo novo do **plano 49-20**
  (D-48/D-62), e este plano deixa o corpo de que ele parte, com o pre-portao dele pinado
  nos md5 do pos-portao daqui.
- **O item 6 da C4** (`tabelas_sem_pii_titular` afirmando que `analise_candidato_vaga` e
  `entrevista_guias` estao «sem PII do titular», quando 13/24 analises e 2/5 guias contem
  o primeiro nome) e **defeito de inventario pre-existente**, fora do escopo do motor.
  Vai ao operador pelo 49-21.
- **`PASSOS_MOTOR` nao foi tocada.** As tres contagens entram nas chaves EXISTENTES
  (`tombstone_decisao_final`, `severar_fks_set_null`), nao num passo novo. O passo novo e
  do 49-20, e e ele que precisara mexer em `_shared/reciboExclusao.ts:23-31`.
- **A `M6` e a `M10` estao na tabela mesmo tendo reprovado pela assercao «errada».**
  Registradas em vez de apagadas: elas sao a razao de a M6b e a M10b existirem, e apagar
  a tentativa que falhou esconde o raciocinio que produziu a prova boa.
- **`resend-webhook.test.ts`** (`npm:svix@1.99.1`) e
  **`_shared/__tests__/strict-schema.test.ts:88`** (TS7053 no type-check Deno) continuam
  quebrados. Pre-existentes, ja em `WINDOWS.md`, e fora de escopo: este plano nao roda
  nenhum teste Deno (e SQL puro). **Nao foram «consertados».**
- **`p43_previa_smoke.sql:667`** segue usando a forma de lista literal (`proname IN (...)`)
  que o `CLAUDE.md` nomeia como ponto cego. Fora do escopo desta fase. Mesma
  classificacao do 49-06 e do 49-07.

## Known Stubs

Nenhum. O plano produz DDL aplicado em PROD e SQL de teste: nao ha componente, valor
vazio codificado, texto de placeholder nem fonte de dados nao ligada. As **sentinelas
nao sao placeholders** — sao os valores finais que o motor grava, e o comprimento de uma
delas e conferido contra um CHECK vivo no apply. Os `gen_random_uuid()` das candidaturas
citadas na fixture 12c **tambem nao sao placeholders**: sao ids deliberadamente
inexistentes, porque a assercao negativa (B14) precisa de uma linha de comparativo que
comprovadamente NAO cite o titular.

## Threat Flags

Nenhuma superficie de seguranca nova fora do `<threat_model>` do plano. O plano **remove**
superficie de dados (tres colunas de conteudo passam a ser apagadas). As cinco mitigacoes
declaradas ficaram provadas por execucao:

| Threat | Disposicao | Prova em PROD |
|---|---|---|
| T-49-14-01 (input mascarado do titular sobrevivendo) | mitigate | smoke (B12); mutacoes M1 e M10b reprovam; pos-portao exige a LISTA SET CONTIGUA, nao duas presencas |
| T-49-14-03 (apagar linha fora do escopo decidido) | mitigate | `<verify>` #1 reprova qualquer `DELETE FROM` nas linhas de codigo; pos-portao reprova a forma no corpo instalado (por regex POSIX); zero linha apagada medido em 4 tabelas |
| T-49-14-05 (input de varios titulares na linha de comparativo) | mitigate | smoke (B13) positiva + **(B14) negativa**; mutacao M3 (escopo vazado) reprova nomeando a linha alheia |
| T-49-14-06 (re-pin do md5 sem rede estrutural) | mitigate | (C3/v) com 8 clausulas, crescida ANTES do re-pin no MESMO commit; proveniencia no cabecalho; **mutacao M10b** prova que a rede morde no cenario do re-pin |
| T-49-14-08 (resposta do revisor sobrevivendo na corrente ou no arquivo) | mitigate | smoke (B15) nas duas metades + nao-vacuidade; mutacoes M4, M5 e **M6b** (ordem isolada na coluna nova) reprovam |
| T-49-14-SC (supply chain) | mitigate | zero instalacao de pacote; so SQL |

Adicional nao previsto no `<threat_model>`, e fechado: o **23514 tardio** por sentinela
curta, que aconteceria DEPOIS do apagamento do Storage (Pitfall 1). Virou portao de apply
que le o minimo do CHECK vivo, e e exercitado por execucao pela fixture com veredito.

## Issues Encountered

- **A FAIL do `p46_purga_smoke` quase custou um conserto na direcao errada.** O reflexo
  era assumir que o meu `CREATE OR REPLACE` a causara. A medicao que fechou a questao —
  restaurar os corpos ANTERIORES numa requisicao que aborta e rodar o mesmo smoke —
  custou um minuto e devolveu uma FAIL **identica**. E a mesma licao que este repositorio
  ja tem escrita em dois lugares: ler o log antes de reverter; o sintoma pode ser do
  proprio teste.
- **Duas mutacoes reprovaram pela assercao errada**, e as duas precisaram de uma versao
  isolada (M6b, M10b). Sem elas, duas clausulas ficariam *parecendo* provadas por
  mutacoes que provaram outra coisa — exatamente o modo de falha que motiva «uma inversao
  por clausula».
- **Um erro de shell que vale registrar:** o script que restaura os corpos anteriores foi
  escrito primeiro com `node -e '...'` contendo `SET search_path = ''`. Em aspas simples
  de shell, `''` fecha e reabre a citacao e **desaparece** — o SQL saiu com
  `SET search_path = ` e o Postgres respondeu `42601: syntax error at or near "AS"`. O
  diagnostico correto veio de ler a LINHA apontada, nao de teorizar sobre o PL/pgSQL.
  Conserto: o script passou a viver num arquivo (heredoc `<<'NODEEOF'`).
- `tsc` segue em **89**, teto 90 (D-53). Este plano nao acrescentou nenhum erro — nao
  toca `src/` nem `supabase/functions/`. A margem de 1 continua valendo.

## User Setup Required

None — nenhuma configuracao de servico externo. O token do Supabase ja esta no Keychain
(servico "Supabase CLI", conta "supabase").

## Next Phase Readiness

**Pronto.** O que este plano entrega e quem o consome:

- **`49-20`** (o passo novo `apagar_respostas_e_producoes`, D-48/D-62) parte do corpo que
  este plano deixa. Ele precisa de tres coisas daqui, e as tres estao acima:
  1. **os md5 do pos-portao, para o seu pre-portao**: `anonimizar_candidato` =
     `6ab2890ebfc87fbd489215579bf1d9f8` (length 54 807) · `plano_exclusao_titular` =
     `12bfca3bf936704f1bc581acd5061df3` (length 28 413);
  2. **o contador novo do smoke: 30** (era 25) — acrescentar assercao sem bumpar reprova
     o RESUMO;
  3. **a precondicao da purga em `dry_run`**, que o pre-portao daqui ja assere e que o
     49-20 deve conferir de novo (o cron roda toda noite).
  ⚠ E ele e o UNICO plano autorizado a escrever `DELETE` no motor (D-62, as 4 tabelas de
  resposta). O `<verify>` e o pos-portao **deste** arquivo proibem `DELETE`, de proposito
  — o 49-20 escreve um pos-portao proprio.
- **`49-21`** (recibo e inventario) tem a lista exata do que alinhar: a C4 acima diz item
  por item o que o motor faz AGORA. E `ai_call_logs.user_prompt_template` mapeado como
  `conteudo_do_produto` em `recibo-exclusao.json:500` e `:534` e a primeira linha a mudar.
- **`49-19`** (primeira execucao real, checkpoint) herda um motor cujo dry-run PREVE as
  tres contagens novas: a contagem antes/depois que o checkpoint exige pode ser lida do
  `'plano'` e conferida contra o `'passos'`, e a relacao do arquivo (`plano + correntes`)
  esta documentada para nao ser lida como divergencia.
- **`49-18`** (`p49_prova_prod.sql`) pode se apoiar nas (B12)..(B16) como especificacao
  executavel do que o motor apaga.
- **Quem for mexer nos dois corpos depois**: os corpos NAO devem ser transcritos. Ler do
  arquivo (`20260922000012`, entre os delimitadores nomeados), conferir o md5 contra o
  vivo, editar por ancora unica. O script de montagem deste plano cabe em 250 linhas e
  aborta se uma ancora aparecer 0 ou 2 vezes.

**Atencao para os planos seguintes:** `tsc` em 89, teto 90 (D-53) — margem de um.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*
