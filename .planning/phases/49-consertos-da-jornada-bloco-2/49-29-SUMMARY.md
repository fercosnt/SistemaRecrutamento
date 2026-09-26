---
phase: 49-consertos-da-jornada-bloco-2
plan: "29"
subsystem: database
tags: [postgres, supabase, lgpd, erase, anonimizacao, motor-destrutivo, desidentificacao, retroativo, jorn-36, d-66, d-70, migrations, p46apply, mutation-testing, windows-83, windows-86]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "17"
    provides: "o checkpoint que achou este defeito e a decisão (c) do operador (2026-09-23): desidentificar no MOTOR em vez de enfraquecer o recibo. E os fatos RE-MEDIDOS que o 49-17 corrigiu nos dois sentidos — `entrevista_guias` = 0 de 5 (não 2), e `analise_candidato_vaga` como LIMITE INFERIOR porque casar contra o nome atual é cego ao titular que já se excluiu"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "21"
    provides: "os dois md5 que são o PRÉ-PORTÃO deste apply (`1d8f96c8…` / `6f2ef836…`), o contador 37 do smoke e o statement do D-69 como último molde de passo"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "20"
    provides: "o molde do passo destrutivo: escolha por coluna lida do catálogo, `GET DIAGNOSTICS` com predicado que faz VISITADA == RASPADA, chave própria em `'passos'`, e a lição das variantes `Mnb`"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "14"
    provides: "a regra (ii) — dry-run e execução saem da MESMA expressão"
  - phase: 46-purga-e-guardas
    provides: "`p46apply.cjs` (SQL lido do ARQUIVO, migration + ledger na mesma requisição, md5 conferido por leitura de volta)"
provides:
  - "passo `desidentificar_analises` em `anonimizar_candidato`: UM statement, ANTES de `severar_fks_set_null`, escopado por `candidatura_id IN (SELECT id FROM candidaturas WHERE candidato_id = p_candidato_id)`. `resumo_cv` e `resumo_respostas` (nuláveis) a NULL; `pontos_fortes` e `gaps` (`text[] NOT NULL`) com sentinela. A LINHA fica"
  - "a CORREÇÃO do conjunto retroativo: são **2 linhas**, não 8. O predicado do plano (`email like '%@invalido.local'`) casa TRÊS populações, e seis das oito análises pertenciam a contas de teste com PII INTACTA que nunca pediram exclusão"
  - "as 2 linhas retroativas TRATADAS no mesmo apply, pelo padrão §I: conjunto literal em `v_autorizados` conferido por `IS DISTINCT FROM` contra o que o predicado acha, `ROW_COUNT` conferido contra a medição de antes, e controle das linhas alheias medido ANTES e DEPOIS na mesma transação"
  - "`entrevista_guias` MEDIDA e deliberadamente FORA do passo, por instrumento ESTRUTURAL e não por probe de nome: o `guia` é derivado da VAGA (zero nome, zero e-mail, zero celular, zero primeira pessoa nas 5 linhas vivas; uma delas usa PLACEHOLDER)"
  - "a classificação titular/sistema das 13 colunas das duas tabelas, MEDIDA por PRIMEIRA PESSOA e não por nome — o instrumento que decide, porque o probe por nome dá ZERO em `gaps` e teria produzido o veredito errado"
  - "`p45_motor_exclusao_smoke.sql`: (B24) por EXECUÇÃO com 9 cláusulas, (C3/viii) por FORMA com 9 cláusulas lendo o corpo SEM COMENTÁRIOS, duas fixtures novas, as duas tabelas na negativa de resíduo (28 → 30), contador 37 → 38 nos TRÊS lugares"
  - "os md5 novos, que são o PRÉ-PORTÃO de quem editar estes corpos depois: `anonimizar_candidato` = 4624854408950110cbfebc971481145a (length 86 864) · `plano_exclusao_titular` = 35d451416c22e150e48a583d879fe48d (length 35 368)"
  - "WINDOWS 86 nova: o inventário LGPD continua afirmando que `analise_candidato_vaga` não tem PII do titular enquanto o motor gasta um passo inteiro removendo-a. Nenhum dos quatro `check:*` reprova — medido — e é justamente por isso que a janela existe"
affects: [49-19, fecho-do-M8]

# Actuals (#2632) — mesmo instrumento do 49-20 e do 49-14 (octetos da migration +
# chars das linhas acrescentadas ao smoke), para que os três números sejam comparáveis.
actuals:
  tokens: 45127
  tasks: 1
  commits: 1
  plan_head_before: 5222121aaaa5383640a885929543ccd0e5524199
  # `commits: 1` = MEDIDO por `git rev-list --count 5222121a..HEAD` no instante em que
  # este SUMMARY foi escrito (HEAD = 4e652b9f, o commit de código). Re-medir DEPOIS
  # deste ponto dá um número MAIOR, e isso NÃO é divergência: o commit de metadado
  # deste plano entra no mesmo intervalo por construção, porque o `plan_head_before`
  # é anterior a ele.
  # `tokens: 45127` = (155 843 octetos da migration + 24 668 chars das linhas
  # acrescentadas ao smoke) / 4. A estimativa era 26 000; o realizado é **1,74x**.
  # ⚠ Erro de estimativa REAL e explicável, não artefato: o plano orçou «um passo, um
  # statement» e o custo não está no statement — está no corpo INTEIRO das duas
  # funções, que a migration carrega transcrito por exigência do padrão §A (114 232
  # dos 155 843 octetos são os dois corpos re-emitidos). Somando as duas funções
  # ANTES de estimar, o 49-20 gastou 55 244 para treze statements e este gastou
  # 45 127 para um: o piso de reescrever `anonimizar_candidato` é ~28 000 e não
  # depende de quantos statements entram.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Um portão estático que procura o nome de uma tabela no `prosrc` NÃO distingue «o motor toca a tabela» de «o motor explica por que NÃO a toca» — e as duas leituras pedem ações opostas. A primeira versão do meu pós-portão reprovou o apply CORRETO porque a palavra `entrevista_guias` aparece nos COMENTÁRIOS que justificam a exclusão dela. Conserto: as cláusulas NEGATIVAS leem o corpo com os comentários removidos (`regexp_replace(src, '--[^\\n]*', '', 'g')`, com asserção de que a remoção removeu algo); as POSITIVAS continuam lendo o corpo inteiro, porque ali a presença do texto é exactamente o que se quer. É o 49-PATTERNS §K subindo um nível"
    - "Delimitar um trecho de função por `position(marcador)` a partir do octeto ZERO é frágil quando o marcador de FIM também aparece dentro de um LITERAL DE STRING que o motor GRAVA: medido, `severar_fks_set_null` ocorre duas vezes no corpo sem comentários, e a primeira (octeto 20 384) é a sentinela de `ai_call_logs.parsed_reasoning`, que remete o auditor à nota daquele passo. Procurar do zero devolve `fim < ini` e o portão reprova um apply correto. Stripar comentários NÃO resolve — a ocorrência não é prosa, é dado. Procurar o fim A PARTIR do início resolve"
    - "Classificar uma coluna de texto livre como «do titular» ou «do sistema» por PROBE DE NOME é o instrumento errado, e erra nos DOIS sentidos. O instrumento que decide é a PRIMEIRA PESSOA: texto em que a pessoa fala de si é texto DELA, por mais que a IA o tenha reescrito. Medido em 25 linhas: o probe por nome dá 0 em `gaps` (veredito «sistema», errado) e 3 em `pontos_fortes` — os três coincidências —, enquanto o probe de primeira pessoa dá 5 e 8. O 49-17 já havia documentado a cegueira do probe por nome; este plano mostra qual é o substituto"
    - "Um predicado de raspagem sobre coluna `NOT NULL` só é idempotente se comparar com a SENTINELA (`IS DISTINCT FROM v_sent`) em vez de com a presença de conteúdo (`array_length > 0`): com a segunda forma, a linha JÁ desidentificada volta a ser VISITADA e o `ROW_COUNT` declara ao auditor uma raspagem que não aconteceu. É a lição do 49-20 na direção oposta — lá o problema era contar visitas em coluna nulável; aqui é contar visitas em coluna que a própria sentinela mantém preenchida"
    - "Sentinela de UM ELEMENTO em `text[] NOT NULL`, nunca `'{}'`: o array vazio não distingue «nunca teve» de «foi removido a pedido», e é o RH que lê esta lista na tela. Mesmo argumento que faz `redacoes_candidato.texto` receber texto em vez de string vazia"
    - "`email like '%@invalido.local'` NÃO é predicado de «titular anonimizado» neste banco — ele casa TRÊS populações (o titular anonimizado de verdade, as fixtures-semente da p46, e nove contas de teste com PII INTACTA que usam o domínio como endereço seguro). O discriminador correto é a SENTINELA que o próprio motor grava em `nome_completo`, conferida junto com as três marcas que só uma exclusão concluída produz (`user_id` NULL, `cpf` NULL, sem linha em `auth.users`)"

key-files:
  created:
    - supabase/migrations/20260923000002_p49_motor_desidentifica_analises.sql
  modified:
    - supabase/tests/p45_motor_exclusao_smoke.sql
    - .planning/WINDOWS.md

key-decisions:
  - "O CONJUNTO RETROATIVO É 2 LINHAS E NÃO 8, e esta é a decisão mais importante do plano — porque seguir a letra dele teria criado um defeito NOVO, na direção oposta à que a migration existe para corrigir. O plano mede as 8 por `email like '%@invalido.local'` e chama-as «titulares já anonimizados». Medido: esse predicado acha 15 linhas de `candidatos`, das quais UMA é titular anonimizado (`nome_completo` = a sentinela do motor, `user_id` NULL, `cpf` NULL, zero linha em `auth.users`), cinco são fixtures-semente da p46 (que se identificam no próprio nome) e NOVE são contas de teste com PII INTACTA — nome real, cidade `São Paulo`, celular, data de nascimento — que apenas usam o domínio como endereço seguro. SEIS das oito análises pertenciam a essa terceira população. Tratá-las teria apagado o currículo analisado de seis candidatos que nunca pediram exclusão, irreversivelmente e com PITR desligado"
  - "`entrevista_guias` FICOU FORA do passo, e a razão é MEDIÇÃO e não escopo economizado. O 49-17 diz que o caveat dela é ESTRUTURAL e não medido — então medi. O `guia` é derivado da VAGA: nas 5 linhas vivas há ZERO ocorrências do nome do titular, ZERO do e-mail, ZERO do celular e ZERO de primeira pessoa; uma delas dirige-se ao titular por PLACEHOLDER em vez de nome; e as `questions[].rationale` argumentam a partir do requisito da vaga. Nenhuma das 5 pertence a titular anonimizado. Duas medições independentes (a do 49-17, por nome; a minha, estrutural) concordam em 0 de 5. Escrever um statement sobre ela seria alargar um passo de mão única sobre dado que não é do titular — e destruiria o roteiro de entrevista que a vaga produziu"
  - "DUAS das quatro colunas que o plano enumera são dado de SISTEMA, e TRÊS que ele não enumera são dado do TITULAR. O plano lista `resumo_cv`, `resumo_respostas`, `descartada_motivo` e `erro`. Medido: `erro` tem ZERO de 25 linhas com conteúdo, e `descartada_motivo` tem CHECK que admite NULL ou um único literal — um domínio de um valor não carrega dado de pessoa. E `pontos_fortes` e `gaps`, que o plano não menciona, são `text[] NOT NULL` com até 857 e 1 168 octetos de prosa livre citando o titular EM PRIMEIRA PESSOA. `flags` foi a terceira e ficou fora: vocabulário FECHADO, exatamente dois valores distintos em 25 linhas, os dois rótulos snake_case de sistema"
  - "O INSTRUMENTO que decidiu a classificação foi a PRIMEIRA PESSOA, não o nome — e a escolha é a diferença entre o veredito certo e o errado. O probe por nome dá **0 de 25** em `gaps` (leitura: «não é dado do titular») e **3 de 25** em `pontos_fortes`, sendo os três coincidências. O probe de primeira pessoa dá **5** e **8**. O 49-17 documentou que o probe por nome é cego ao titular anonimizado e propenso a falso positivo com substantivo comum; este plano mostra qual é o substituto, e o registro disso está escrito DENTRO do corpo da função, onde a próxima pessoa vai procurar"
  - "A LINHA FICA e NENHUM `DELETE` entra no passo. Ela é o registro de tratamento que o JORN-28 exige e a prova de não-discriminação que a RNF-07a preserva: `score_match`, `status`, `flags`, `created_at` e `vaga_id` sobrevivem. A exceção do D-62 é válida SÓ no passo `apagar_respostas_e_producoes` e SÓ nas quatro tabelas de múltipla escolha, e três portões independentes reprovam um `DELETE` aqui (pós-portão do apply, (B24/⊕) por execução, (C3/viii) por forma)"
  - "NENHUM texto do recibo mudou, e isso é a decisão (c) do operador executada e não escopo esquecido. O item `avaliacoes_e_analises` já promete que as análises ficam guardadas «sem ligação com você»; o que faltava era o motor cumpri-la. A direção oposta — ressalvar no recibo que o currículo sobrevive — eram as opções (a)/(b) e foram recusadas. `git diff` não toca nenhum arquivo de `docs/compliance/`"
  - "A TELEMETRIA e os HASHES ficaram intocados. `provedor_ia`/`modelo_ia` acabaram de receber veredito `export: false` no 49-17, e `status` tem veredito de export também; apagá-las desfaria proveniência sem devolver privacidade nenhuma. Os hashes do D-70 não existem nestas duas tabelas — nada a decidir aqui, e a ausência está escrita no corpo para que a próxima pessoa não procure"
  - "UMA chave de contagem em `'passos'`, e não duas. Uma chave zerada para `entrevista_guias` diria ao auditor que a tabela está sob vigilância quando ela está FORA do passo por decisão medida — e um zero que parece vigilância é pior que um silêncio (é a forma-armadilha que o `CLAUDE.md` cataloga, com outra cara)"
  - "DUAS das dez mutações encontraram defeito no MEU PRÓPRIO artefato, e as duas foram consertadas ANTES do apply. A M4 (o passo apaga a linha) reprovava pela cláusula da SENTINELA com diagnóstico **FALSO** — «as colunas NOT NULL não receberam a sentinela», quando a verdade é que a linha não existe mais; a cláusula ⊕ da linha passou a vir PRIMEIRO. A M5 (o passo alarga para `provedor_ia`) era pega SÓ pelo portão de FORMA, porque a cláusula ⊕ não cobria telemetria; as duas colunas entraram nela. Um portão que reprova com diagnóstico errado manda a próxima pessoa consertar o lugar errado"
  - "O `push` para `origin/main` foi DENEGADO DUAS VEZES pelo classificador de auto mode (`Out-of-Place Publication`), exatamente como o `<push_policy>` do plano previa. Por política eu NÃO contornei. O commit de código está preso local; PROD já carrega a migration. Ver «⚠ Estado vivo no fecho»"
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Não registrado como desvio"

patterns-established:
  - "Quando um plano entrega um NÚMERO medido («8 linhas, de 57 a 1918 caracteres»), confira a POPULAÇÃO antes do número: um intervalo que vai de 57 a 1918 pode estar somando duas coisas diferentes, e aqui estava — o 57 é uma mensagem de SISTEMA na linha do titular real e o 1918 é uma fixture. Um intervalo largo sobre população heterogênea parece precisão e é a média de duas coisas que não se comparam"
  - "Prove a mordida de um portão negativo com uma mutação que ele deveria pegar E leia QUAL cláusula falou. Duas das minhas dez foram pegas pela cláusula ERRADA, e nos dois casos isso era um defeito do meu artefato — não do portão em geral. «Mordeu» não é a informação; «mordeu ali, com este diagnóstico» é"
  - "Um harness de mutação que reporta `exit 0` sobre uma falha real é o §L acontecendo: medi isso em mim no primeiro ensaio, porque li o `$?` de um `tail` num pipe. O conserto é redirecionar a saída para arquivo e ler o exit code do RUNNER. Aconteceu uma vez e produziu a conclusão oposta à verdade por um comando inteiro"

requirements-completed: [JORN-36]

coverage:
  - id: D1
    description: "O motor passa a desidentificar os textos livres do titular em `analise_candidato_vaga` — tabela que ele HOJE não citava"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "PROD, antes do apply: `position('analise_candidato_vaga' in prosrc)` = **0**, `position('resumo_cv')` = **0**, `position('entrevista_guias')` = **0** no corpo vivo (md5 `1d8f96c8f21a755ded0505a0b652113a`, 78 301). Depois: `cita_acv` = **7705** no motor e **31175** no plano"
        status: pass
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B24) — 9 cláusulas: não-vacuidade das 4 colunas, pós-estado NULL nas 2 nuláveis, sentinela nas 2 `NOT NULL`, ⊕ a linha existe, ⊕ score/status/flags/provedor_ia/modelo_ia intactos, ⊖ `entrevista_guias` idêntica, ⊖ escopo alheio preservado, e as TRÊS fontes do número (plano, expressão à mão, `'passos'`)"
        status: pass
      - kind: integration
        ref: "mutação M1 (o corpo ANTERIOR inteiro — a inversão que o plano pede) ⇒ FAIL (B24) «o texto livre NULAVEL da analise SOBREVIVEU ao tombstone (resumo_cv=[SMOKE P45 fixture (acv): curriculo de SMOKE P45 Titular Sint…])»"
        status: pass
      - kind: integration
        ref: "mutação M2 (`resumo_cv` deixa de ser anulado) ⇒ FAIL (B24) nomeando só ela, com `resumo_respostas=[<null>]` ao lado — o diagnóstico distingue QUAL das duas sobreviveu"
        status: pass
      - kind: integration
        ref: "mutação M3 (`pontos_fortes` sem sentinela) ⇒ FAIL (B24) «as duas colunas text[] NOT NULL nao receberam a sentinela», imprimindo o valor sobrevivente em primeira pessoa e o `gaps` já correto"
        status: pass
    human_judgment: false
  - id: D2
    description: "O escopo foi MEDIDO coluna por coluna, com a classificação titular/sistema justificada por evidência — e a medição refutou o plano em três pontos"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "PROD, só leitura, 25 linhas de `analise_candidato_vaga`: `resumo_cv` 25 com conteúdo / 11 em 1ª pessoa · `resumo_respostas` 25 / 13 · `pontos_fortes` 19 / 8 · `gaps` 20 / 5 ⇒ as QUATRO são dado do titular"
        status: pass
      - kind: integration
        ref: "as que ficaram FORA, cada uma com a medição: `flags` = vocabulário FECHADO (exatamente 2 valores distintos em 25 linhas, `cv_nao_extraido` ×7 e `vaga_sem_rubrica_deliberada` ×1, o maior com 27 octetos) · `erro` = **0 de 25** com conteúdo · `descartada_motivo` = CHECK `IS NULL OR = 'knockout_automatico'` · `status` = CHECK de 3 valores · `provedor_ia`/`modelo_ia` = telemetria com veredito `export: false` no 49-17 · `score_match` = inteiro 0..100"
        status: pass
      - kind: integration
        ref: "`entrevista_guias` ABSOLVIDA por instrumento estrutural: 5 linhas, chaves de topo `candidate_id,closing,duration_minutes,format,introduction,job_title,questions,scoring_instructions`; **0 de 5** com o primeiro nome do titular, 0 com o nome completo, 0 com o e-mail, 0 com o celular, **0 com primeira pessoa**; 1 de 5 usa `[Nome]` como PLACEHOLDER. `de_anon` = **0** — nenhuma pertence a titular anonimizado"
        status: pass
      - kind: integration
        ref: "o pré-portão (3/3) do apply confere as 13 colunas das duas tabelas no catálogo (tipo + nulidade, esperado escrito como `VALUES`) mais a existência do CHECK de `descartada_motivo` — que é o argumento inteiro de ela ser dado de sistema. Passou: «13 colunas conferidas no catalogo (4 no passo, 9 fora…)»"
        status: pass
    human_judgment: false
  - id: D3
    description: "As linhas retroativas tratadas — e o conjunto CORRIGIDO de 8 para 2, porque seis das oito não eram de titular anonimizado"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "as TRÊS populações que `email like '%@invalido.local'` casa, medidas: **1** titular anonimizado (`317ff71a-…`, `nome_completo` = a sentinela do motor, `user_id` NULL, `cpf` NULL, `auth_existe` = 0), **5** fixtures-semente `fixture-p46+…` (nome «FIXTURE P46 …»), **9** contas de teste com PII INTACTA (`f0000001..6` + outras: nome real, `São Paulo`, celular, data de nascimento reais)"
        status: pass
      - kind: integration
        ref: "a exclusão do `317ff71a` é REAL e CONCLUÍDA: `solicitacoes_dados` com `storage_concluido_em` 2026-08-22 02:14:46, `postgres_concluido_em` 02:14:46, `auth_concluido_em` 02:14:47 e **`recibo_enviado_em` 02:14:48** — a pessoa RECEBEU o recibo que diz «sem ligação com você»"
        status: pass
      - kind: integration
        ref: "as 2 linhas dele, medidas antes: `5355ff34…` com `resumo_cv` de **132 chars carregando o NOME COMPLETO original** («Zorilda Testequilha Descartavel»), e `4fb13cdc…` com 57 chars que são uma mensagem de SISTEMA. ⚠ É o intervalo «57 a 1918» do plano somando duas populações: o 57 é sistema e o 1918 é a fixture `Larissa`"
        status: pass
      - kind: integration
        ref: "o bloco retroativo por §I: `v_autorizados` literal de 2 ids, conferido por `IS DISTINCT FROM` contra o que o predicado da SENTINELA acha (aborta e manda RE-AUTORIZAR se divergir), não-vacuidade, controle alheio medido ANTES e DEPOIS na mesma transação, `ROW_COUNT` conferido contra a medição de antes, e as duas negativas de que o `status` não mudou e a linha não deixou de existir"
        status: pass
      - kind: integration
        ref: "pós-estado em PROD, lido depois do apply: as 2 linhas com `resumo_cv` NULL, `resumo_respostas` NULL, os dois arrays com a sentinela, e `flags`/`status`/`score_match` INTACTOS. Contagem global: **25 linhas, 23 ainda com `resumo_cv`, 2 com sentinela** — exatamente o conjunto autorizado, nenhuma linha alheia tocada"
        status: pass
      - kind: integration
        ref: "mutação M7 (o filtro por candidatura CAI) ⇒ FAIL (B24/⊖escopo) «o passo levou o texto livre de analises de OUTRAS candidaturas (antes=23, depois=0)» — as 23 linhas alheias são exatamente a população que o predicado do plano teria arrastado"
        status: pass
      - kind: other
        ref: "o motor NÃO foi executado de ponta a ponta contra titular vivo. A única execução contra dado real foi em `dry_run`, pela asserção (b) do `p46_purga_smoke`, em requisição que aborta — 49-19 continua sendo o dono da primeira execução real, sob portão do operador (D-54)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Telemetria, hashes do D-70 e o texto do recibo intocados"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "mutação M5 (o passo alarga para `provedor_ia`) ⇒ FAIL (B24/⊕) «o passo levou junto o que NAO e dado do titular (… provedor_ia=<null>, modelo_ia=claude-smoke-p45)». ⚠ Na PRIMEIRA rodada esta mutação era pega SÓ pelo portão de FORMA (C3/viii) — a cláusula ⊕ não cobria telemetria, e as duas colunas entraram nela antes do apply"
        status: pass
      - kind: integration
        ref: "mutação M6 (o passo alarga para `entrevista_guias`) ⇒ FAIL (B24/⊖guias) «o passo ALARGOU para entrevista_guias». E em PROD, depois do apply: 5 guias, 5 com conteúdo, comprimentos 7 817..15 745 — IDÊNTICOS aos de antes"
        status: pass
      - kind: other
        ref: "`git diff` do commit toca exatamente DOIS arquivos: a migration nova e o smoke. ZERO arquivos de `docs/compliance/` — nenhum texto do recibo, nenhuma razão de silêncio, nenhum veredito de export alterado. Os hashes do D-70 não existem nestas duas tabelas, e a ausência está escrita no corpo da função"
        status: pass
      - kind: command
        ref: "os QUATRO `check:*` (export-allowlist, pii-inventory-md, recibo-exclusao, matriz-retencao) ⇒ **OK**. `npm run -s lint` = **89** erros TS (teto D-53 = 90; margem de um preservada, nenhum erro novo)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A migration está aplicada E escriturada, com md5 conferido por leitura de volta, e ENSAIADA antes em requisição que aborta"
    verification:
      - kind: other
        ref: "ledger: `20260923000002` = `p49_motor_desidentifica_analises`, `md5(statements[1])` = **5e746a4fcd14a00d36dc5422e21d8afb** — IDÊNTICO ao md5 do arquivo no disco, lido de volta. `version` nasceu correta (nenhum reparo). ⚠ O `length` do ledger é 149 488 e o arquivo tem 155 843 octetos: são CHARS contra OCTETOS (UTF-8 multibyte), não divergência"
        status: pass
      - kind: other
        ref: "o slot `20260922000010` NÃO foi reutilizado — conferido no ledger: ele continua ausente, registrando a recusa da D-47"
        status: pass
      - kind: other
        ref: "sonda de forma (a migration sozinha + `RAISE 'SONDA_MIGRATION_OK'`) e ENSAIO (migration + smoke ampliado + `RAISE` LENDO o contador), UMA requisição cada, as duas abortando no marcador: **`ENSAIO_OK CONTADOR=38 (esperado 38)`** — medido, não inferido de «não levantou». `md5(prosrc)` vivo continuava o ANTIGO depois dos dois"
        status: pass
      - kind: other
        ref: "os md5 novos foram PREVISTOS do arquivo antes do apply (para que os pins do smoke pudessem ser trocados e o ensaio rodasse com eles) e depois CONFERIDOS contra o catálogo: `4624854408950110cbfebc971481145a` / 86 864 e `35d451416c22e150e48a583d879fe48d` / 35 368, os dois batendo exatamente. Não é redundância — é a diferença entre um pin calculado e um pin carimbado"
        status: pass
      - kind: other
        ref: "pré-portão (1/3): `config_purga.modo = 'dry_run'` lido antes de escrever uma linha e relido depois de tudo. O pré-portão ABORTA o apply se o modo não for `dry_run`"
        status: pass
      - kind: other
        ref: "pré-portão (2/3): os dois md5 pinados conferidos por execução, MAIS a prova NEGATIVA de que o corpo vivo não citava `analise_candidato_vaga` no instante do apply — «os dois md5 batem, e o corpo vivo NAO cita analise_candidato_vaga (position = 0)»"
        status: pass
    human_judgment: false
  - id: D6
    description: "O portão morde — DEZ inversões, uma por cláusula, e duas delas acharam defeito no próprio artefato"
    verification:
      - kind: integration
        ref: "mutação M4 (o passo APAGA a linha) ⇒ FAIL (B24/⊕) «a linha de analise DEIXOU DE EXISTIR (0 linha(s) com o id da fixture)». ⚠ Na PRIMEIRA rodada ela reprovava pela cláusula da SENTINELA, com diagnóstico **FALSO** («as colunas NOT NULL nao receberam a sentinela») — a cláusula ⊕ passou a vir PRIMEIRO, antes do apply"
        status: pass
      - kind: integration
        ref: "mutação M8 (o dry-run perde a chave) ⇒ FAIL (B24) «nao aparece no plano (<ausente>)»; M9 (o motor não declara em `'passos'`) ⇒ FAIL (B24) pela outra metade da mesma cláusula"
        status: pass
      - kind: integration
        ref: "mutação M10 (o predicado troca `IS DISTINCT FROM v_an_sent` por `array_length > 0`) ⇒ FAIL (C3/viii) «o predicado do passo nao compara os arrays com a sentinela por IS DISTINCT FROM. Com array_length no lugar, uma linha JA desidentificada volta a ser VISITADA»"
        status: pass
      - kind: other
        ref: "as dez rodaram em requisição ATÔMICA que ABORTA, com o marcador `MUTACAO_TERMINOU` como o que apareceria se o portão não mordesse: **nenhuma das dez chegou a ele**. O harness aborta com «HARNESS QUEBRADO» se a âncora da mutação não ocorrer exatamente uma vez — §L, defeito de instrumento nunca lido como veredito"
        status: pass
      - kind: other
        ref: "nada vazou: depois das dez mutações e dos dois ensaios, `md5(prosrc)` de `anonimizar_candidato` era ainda `1d8f96c8…` e de `plano_exclusao_titular` `6f2ef836…` (os de ANTES do apply); 25 `analise_candidato_vaga`, 5 `entrevista_guias`, 25 com `resumo_cv`, `config_purga.modo = dry_run`"
        status: pass
    human_judgment: false
  - id: D7
    description: "A rede de FORMA cresceu ANTES do re-pin, e o smoke fecha 38/38 com o contador LIDO"
    verification:
      - kind: integration
        ref: "`p45_motor_exclusao_smoke` com um `RAISE` de leitura do contador no fim, DEPOIS do apply: **`P45=38 (esperado 38)`**. E `CONTADOR=38` já no ensaio, antes dele. `run` puro: `exit 0`, sem exceção"
        status: pass
      - kind: integration
        ref: "`p46_purga_smoke` = **`P46P_REG_CONTADOR=27`** (gate cheio) no `run` PURO, `exit 0`. ⚠ A (j.2) não reprova mais — resultado esperado do 49-28, não drift. E a asserção (b) dele chama `anonimizar_candidato(id, true)` para TODOS os titulares elegíveis reais: o passo novo executou contra as 23 análises reais em `dry_run` e voltou atrás, que é a prova do Pitfall 6 que nenhuma fixture sintética consegue dar"
        status: pass
      - kind: command
        ref: "o contador foi bumpado nos TRÊS lugares em que vive (o «GATE VERDE» do topo, a descrição do (z) na lista de asserções, e o `v_esperado` que MANDA) — a deviation 3 do 49-20 aplicada de propósito, não descoberta de novo. Mais o histórico 25 → 30 → 36 → 37 → 38 escrito"
        status: pass
      - kind: command
        ref: "varredura de portões pela FORMA (`CLAUDE.md`): **317** achados em `supabase/tests/*.sql` (eram 315 no 49-17). Os 2 novos são meus e os dois são a MESMA classificação que o 49-20 registrou: `v_acv_viva_d <> 1` e `v_acv_sm_d IS DISTINCT FROM 71` são contagem contra constante sobre uma **fixture criada na própria execução** — não é fotografia de PROD. Nenhuma lista literal de objetos acrescentada"
        status: pass
      - kind: command
        ref: "as duas tabelas entraram na negativa de resíduo do (z) — 28 → 30 —, e a segunda pela razão OPOSTA à primeira: `analise_candidato_vaga` porque o passo escreve nela, `entrevista_guias` porque ele deliberadamente NÃO escreve e «intocada» sem medição é só uma frase"
        status: pass
    human_judgment: false

# Metrics
duration: ~3h 40min
completed: 2026-09-26
status: complete
---

# Phase 49 Plano 29: O motor desidentifica os textos livres da análise de vaga — e o conjunto retroativo era 2 linhas, não 8 Summary

**Um titular que exerceu o direito de exclusão em 2026-08-22, e que recebeu o recibo dizendo que as análises ficaram guardadas «sem ligação com você», tinha o próprio NOME COMPLETO original dentro de `analise_candidato_vaga.resumo_cv` — numa tabela que o motor não citava em lugar nenhum do corpo. O operador escolheu a opção (c): fazer o motor cumprir a promessa existente, não enfraquecê-la. O passo `desidentificar_analises` entrou, as duas linhas dele foram tratadas retroativamente, e nenhum texto do recibo mudou. Mas o achado mais importante deste plano é uma CORREÇÃO ao plano: o conjunto retroativo é de 2 linhas e não de 8, porque o predicado `email like '%@invalido.local'` casa três populações e seis das oito análises pertenciam a contas de teste com PII INTACTA que nunca pediram exclusão — tratá-las teria apagado o currículo analisado de seis candidatos, irreversivelmente, na direção OPOSTA à que esta migration existe para corrigir.**

## Performance

- **Duration:** ~3h 40min (medido do primeiro `p46apply sql` de medição ao commit)
- **Tasks:** 1 / 1
- **Files:** 3 (1 criado, 2 modificados — o smoke e o `WINDOWS.md`)

## A precondição, lida antes de escrever uma linha

| O que o plano exige | Medido em PROD (2026-09-25, só leitura) | Bate? |
|---|---|---|
| purga automática em ensaio | **`config_purga.modo = 'dry_run'`** | sim |
| `md5(prosrc)` de `anonimizar_candidato` = `1d8f96c8…` (78 301) | **`1d8f96c8f21a755ded0505a0b652113a`**, length **78 301** | sim |
| `md5(prosrc)` de `plano_exclusao_titular` = `6f2ef836…` (33 716) | **`6f2ef83664944b9a39c7d495a49ab8f1`**, length **33 716** | sim |
| o motor NÃO cita a tabela | `position('analise_candidato_vaga')` = **0** · `resumo_cv` = **0** · `entrevista_guias` = **0** | sim |
| (medido a mais) o corpo extraído do dump bate o vivo | md5 recalculado LOCALMENTE sobre o corpo de `pg_get_functiondef` = o do banco, nos dois | sim |

A precondição não ficou só lida: virou **pré-portão da migration**, com a prova NEGATIVA junto — se o corpo vivo já citasse a tabela, o apply recusa, porque o fato que ele conserta não estaria mais no estado medido.

## ⚠ O que a medição refutou no plano — três pontos, e o primeiro teria criado um defeito NOVO

### 1. O conjunto retroativo é 2 linhas, não 8

O plano afirma, como fato medido pelo orquestrador: *«8 linhas de `analise_candidato_vaga` pertencentes a titulares com e-mail `@invalido.local` ainda têm `resumo_cv` preenchido, de 57 a 1918 caracteres»*. A contagem de 8 está certa. A **interpretação** dela não: `@invalido.local` não é marca de titular anonimizado neste banco — é o domínio seguro que este projeto usa para **toda** conta sintética (49-PATTERNS §D: «Fixture sintética `@invalido.local`»).

Medido: das 15 linhas de `candidatos` que o predicado acha,

| População | Quantas | Como se identifica | Análises |
|---|---|---|---|
| **titular anonimizado de verdade** | **1** | `nome_completo` = a sentinela que o motor grava, `user_id` NULL, `cpf` NULL, zero linha em `auth.users` | **2** |
| fixtures-semente da p46 | 5 | `fixture-p46+…@invalido.local`, nome «FIXTURE P46 … (sintetico, nao e pessoa real)» | 0 |
| **contas de teste com PII INTACTA** | **9** | nome real, cidade `São Paulo`, celular e data de nascimento REAIS — nunca passaram pelo motor | **6** |

**Seis das oito análises são da terceira população.** Tratá-las, como a letra do plano manda, apagaria o currículo analisado de seis candidatos que nunca pediram exclusão — irreversivelmente, com PITR desligado. É a mesma classe de erro que a migration existe para corrigir, com o sinal invertido. E a mutação **M7** mede o tamanho exato do estrago: com o filtro de escopo removido, as linhas alheias com texto livre vão de **23 para 0**.

O discriminador correto é a **sentinela que o próprio motor grava** em `nome_completo`, conferida junto com as três marcas que só uma exclusão concluída produz. É ela que o bloco retroativo usa, e o `IS DISTINCT FROM` contra o conjunto literal aborta o apply se as duas leituras divergirem.

⚠ E o intervalo «de 57 a 1918 caracteres» soma as duas populações: o **57** é `«CV não pôde ser extraído — análise baseada nas respostas.»` — uma mensagem de SISTEMA, na linha do titular real — e o **1918** é a fixture `Larissa Ferreira Nogueira`. Um intervalo largo sobre população heterogênea parece precisão e é a média de duas coisas que não se comparam.

### 2. `entrevista_guias` fica FORA — e agora está MEDIDO, não suposto

O 49-17 diz explicitamente que o caveat dela é **estrutural, não medido**, e entrega isso como a minha entrada. Medi, com um instrumento diferente do dele (ele usou probe por nome; eu li **de onde o campo é gerado**):

| O que | Medido nas 5 linhas vivas |
|---|---|
| chaves de topo do `guia` | `candidate_id, closing, duration_minutes, format, introduction, job_title, questions, scoring_instructions` |
| primeiro nome do titular | **0 de 5** |
| nome completo / e-mail / celular | **0 / 0 / 0** |
| primeira pessoa (`tenho`, `minha`, `meu`, `trabalhei`, …) | **0 de 5** |
| dirige-se ao titular por `[Nome]` (PLACEHOLDER) | 1 de 5 |
| pertencem a titular anonimizado | **0 de 5** |

O `questions[].rationale` argumenta a partir do requisito **da vaga** («A vaga exige resposta ao lead em até 5 minutos…»), e o `introduction` usa `[Nome]`. É roteiro de entrevista derivado da vaga, não dado do titular. As duas medições independentes concordam em **0 de 5**. Alargar um passo de mão única sobre ela destruiria o roteiro que a vaga produziu.

### 3. Duas colunas que o plano enumera são de SISTEMA, e três que ele não enumera são do TITULAR

O plano manda medir «`resumo_cv`, `resumo_respostas`, `descartada_motivo`, `erro`» — mas diz também «**e o que mais houver**», e foi o que mais havia que mudou o desenho.

| Coluna | Tipo | Conteúdo | 1ª pessoa | Veredito |
|---|---|---|---|---|
| `resumo_cv` | `text` NULÁVEL | 25 de 25 | **11** | **TITULAR** → NULL |
| `resumo_respostas` | `text` NULÁVEL | 25 de 25 | **13** | **TITULAR** → NULL |
| `pontos_fortes` | `text[] NOT NULL` | 19 de 25 (até 857 octetos) | **8** | **TITULAR** → sentinela |
| `gaps` | `text[] NOT NULL` | 20 de 25 (até 1 168 octetos) | **5** | **TITULAR** → sentinela |
| `flags` | `text[] NOT NULL` | 7 de 25 | — | SISTEMA (2 valores distintos em 25 linhas) |
| `erro` | `text` NULÁVEL | **0 de 25** | — | SISTEMA (mensagem técnica) |
| `descartada_motivo` | `text` NULÁVEL | 3 de 25 | — | SISTEMA (CHECK de um literal) |
| `status` | `text NOT NULL` | 25 | — | SISTEMA (CHECK de 3; veredito de export no 49-17) |
| `provedor_ia` / `modelo_ia` | `text` NULÁVEL | — | — | TELEMETRIA (veredito `export: false` no 49-17) |
| `score_match` | `integer` | — | — | o próprio registro de tratamento |

⚠ **O instrumento é o achado.** O probe por NOME dá **0 de 25** em `gaps` — leitura «não é dado do titular», **errada** — e 3 em `pontos_fortes`, sendo os três coincidências. O que decide é a **PRIMEIRA PESSOA**: `«Disponibilidade presencial integral confirmada — Tenho disponibilidade integral e presencial, de segunda a sexta»` são as palavras do titular, copiadas para dentro do array. O 49-17 documentou que o probe por nome é cego; este plano nomeia o substituto, e o registro disso está **dentro do corpo da função**, onde a próxima pessoa vai procurar.

## O passo, e o que ele deliberadamente não faz

```
resumo_cv        → NULL          (nulável)
resumo_respostas → NULL          (nulável)
pontos_fortes    → sentinela     (text[] NOT NULL)
gaps             → sentinela     (text[] NOT NULL)
```

A **LINHA FICA**, e com ela `score_match`, `status`, `flags`, `vaga_id` e `created_at`. Nenhum `DELETE` entra — a exceção do D-62 vale só no outro passo e só nas quatro tabelas de múltipla escolha, e **três portões independentes** reprovam um `DELETE` aqui.

A sentinela nas duas colunas `NOT NULL` é um array de **um elemento**, não `'{}'`: um array vazio não distingue «nunca teve pontos fortes» de «foram removidos a pedido», e é o RH que lê esta lista na tela.

O predicado compara os arrays com a sentinela por **`IS DISTINCT FROM`**, não por `array_length > 0` — é o que torna o passo **idempotente** e o `ROW_COUNT` honesto. Com `array_length`, uma linha já desidentificada voltaria a ser VISITADA (a sentinela tem comprimento 1) e o número declarado ao auditor contaria uma raspagem que não aconteceu. A mutação **M10** prova a mordida.

**UMA chave em `'passos'`**, não duas: uma chave zerada para `entrevista_guias` diria ao auditor que a tabela está sob vigilância quando ela está fora do passo por decisão medida.

## Ledger de PROD

| version | name | md5 do arquivo | md5 do ledger | octetos / chars |
|---|---|---|---|---|
| 20260923000002 | p49_motor_desidentifica_analises | `5e746a4fcd14a00d36dc5422e21d8afb` | `5e746a4fcd14a00d36dc5422e21d8afb` | 155 843 / 149 488 |

A `version` nasceu correta (nenhum reparo). O md5 do ledger foi **lido de volta** e conferido, porque «aplicado» e «escriturado» são afirmações diferentes. ⚠ A diferença 155 843 × 149 488 é **octetos contra chars** (UTF-8 multibyte), não divergência. O slot `20260922000010` **não** foi reutilizado — conferido: continua ausente do ledger, registrando a recusa da D-47.

## md5 — antes e depois (⚠ os pins novos do smoke saem daqui)

| Objeto | Antes do apply | Depois (vivo) |
|---|---|---|
| `anonimizar_candidato(uuid,boolean)` | `1d8f96c8f21a755ded0505a0b652113a` (78 301) | **`4624854408950110cbfebc971481145a`** (**86 864**) |
| `plano_exclusao_titular(uuid)` | `6f2ef83664944b9a39c7d495a49ab8f1` (33 716) | **`35d451416c22e150e48a583d879fe48d`** (**35 368**) |
| pins do `p45_motor_exclusao_smoke` (C3) | os dois do 49-21 | **os dois novos, re-pinados no MESMO commit, com a rede (C3/viii) crescida ANTES** |
| contador do RESUMO (z) | 37 | **38** |

Os dois valores «depois» foram **previstos do arquivo** antes do apply, para que os pins pudessem ser trocados e o ensaio rodasse com eles — e depois **conferidos contra o catálogo**. Os dois bateram exatamente.

## Ensaio ANTES do apply

| Ensaio | Conteúdo (uma requisição, que aborta) | Resultado |
|---|---|---|
| sonda de forma | a migration sozinha + `RAISE 'SONDA_MIGRATION_OK'` | abortou no marcador — os três pré-portões, os dois `CREATE OR REPLACE`, o pós-portão e o bloco retroativo passaram |
| ensaio | migration + `p45_motor_exclusao_smoke` ampliado + `RAISE` LENDO o contador | **`ENSAIO_OK CONTADOR=38 (esperado 38)`** — medido, não inferido de «não levantou» |
| conferência | `md5(prosrc)` e as 2 linhas, lidos DEPOIS dos ensaios | ainda o ANTIGO, e as 2 ainda com `resumo_cv` — **os ensaios não vazaram** |

## O portão morde — DEZ inversões, e duas delas acharam defeito no MEU artefato

Uma inversão por cláusula, cada uma em requisição atômica que **aborta**. A mutação reescreve o corpo **já instalado** (portanto DEPOIS do pós-portão da migration), para que seja o **smoke** a falar — a lição `Mnb` do 49-14/49-20 aplicada de propósito. O marcador `MUTACAO_TERMINOU` é o que apareceria se o portão não mordesse: **nenhuma das dez chegou a ele**.

| Mutação | Inversão | Quem falou |
|---|---|---|
| **M1** | o corpo ANTERIOR inteiro — o passo não existe (a inversão que o plano pede) | **(B24)**: «o texto livre NULAVEL da analise SOBREVIVEU ao tombstone», imprimindo o currículo |
| **M2** | `resumo_cv` deixa de ser anulado | **(B24)**, nomeando só ela, com `resumo_respostas=[<null>]` ao lado |
| **M3** | `pontos_fortes` sem sentinela | **(B24)**: «as duas colunas text[] NOT NULL nao receberam a sentinela», imprimindo o valor em 1ª pessoa |
| **M4** | o passo APAGA A LINHA | **(B24/⊕)**: «a linha de analise DEIXOU DE EXISTIR (0 linha(s))» — ⚠ ver abaixo |
| **M5** | o passo alarga para `provedor_ia` | **(B24/⊕)**: «levou junto o que NAO e dado do titular (… provedor_ia=<null>)» — ⚠ ver abaixo |
| **M6** | o passo alarga para `entrevista_guias` | **(B24/⊖guias)**: «o passo ALARGOU para entrevista_guias» |
| **M7** | o filtro por candidatura CAI | **(B24/⊖escopo)**: «levou o texto livre de analises de OUTRAS candidaturas (antes=23, depois=0)» |
| **M8** | o dry-run perde a chave | **(B24)**: «nao aparece no plano (`<ausente>`)» |
| **M9** | o motor não declara em `'passos'` | **(B24)**, pela outra metade da mesma cláusula |
| **M10** | o predicado troca `IS DISTINCT FROM` por `array_length > 0` | **(C3/viii)**: «uma linha JA desidentificada volta a ser VISITADA» |

### ⚠ As duas mutações que acharam defeito em mim, e as duas foram consertadas ANTES do apply

1. **M4 reprovava com diagnóstico FALSO.** Com a cláusula ⊕ da linha DEPOIS das de coluna, um `DELETE` no lugar do `UPDATE` era pego pela cláusula da **sentinela**, que dizia «as colunas NOT NULL não receberam a sentinela» — os arrays leem NULL porque a **linha não existe mais**. Um portão que reprova com diagnóstico errado manda a próxima pessoa consertar o lugar errado, e é a classe de defeito com que o `CLAUDE.md` deste projeto abre. **Conserto:** a cláusula ⊕ da linha passou a vir PRIMEIRO, com a razão escrita ao lado dela.
2. **A cláusula ⊕ não cobria telemetria.** M5 era pega **só** pelo portão de FORMA (C3/viii). Forma e comportamento respondem perguntas diferentes, e deixar a segunda descoberta significa que uma reescrita do passo com outra grafia passaria verde. **Conserto:** `provedor_ia` e `modelo_ia` entraram na cláusula ⊕, e a fixture grava valores conhecidos para as duas.

### ⚠ E um defeito de INSTRUMENTO, medido em mim no primeiro ensaio (§L)

A minha primeira leitura de resultado foi `node p46apply.cjs run … 2>&1 | tail -30; echo "EXIT_RUNNER=$?"`. Ela imprimiu **`EXIT_RUNNER=0`** sobre uma execução que **FALHOU** com erro de sintaxe: o `$?` era do `tail`, não do runner. É exactamente o §L, e produziu a conclusão oposta à verdade por um comando inteiro. Conserto: saída redirecionada para arquivo e `$?` lido do runner — usado em todas as medições subsequentes, inclusive nas dez mutações.

## O pós-portão da migration reprovou o apply CORRETO, duas vezes, e as duas razões são registro

As duas foram consertadas antes do apply e as duas são padrão novo:

1. **Ele lia COMENTÁRIO.** A cláusula «o motor não cita `entrevista_guias`» procurava a palavra no `prosrc` inteiro — e ela aparece nos comentários do passo novo, que explicam por que a tabela ficou de **FORA**. É o 49-PATTERNS §K subindo um nível: um portão estático que lê prosa não distingue «o motor toca a tabela» de «o motor explica por que não a toca», e as duas leituras pedem ações **opostas**. Conserto: as cláusulas NEGATIVAS leem o corpo com os comentários removidos, com asserção de que a remoção removeu algo; as POSITIVAS continuam lendo o corpo inteiro. O mesmo desenho foi para a (C3/viii) do smoke — e o `(C3/janela)` que vive logo abaixo dela no arquivo já registrava esta mesma família de defeito como a «SEXTA ocorrência» da fase.
2. **A delimitação do trecho procurava o FIM a partir do octeto zero.** Medido: no corpo sem comentários, `severar_fks_set_null` ocorre **duas** vezes, e a primeira (octeto 20 384) vive dentro de um **literal de string** — a sentinela de `ai_call_logs.parsed_reasoning`, que remete o auditor à nota daquele passo. Procurar do zero devolve `fim < ini` e o portão reprova um apply correto. **Stripar comentários NÃO resolve: a ocorrência não é prosa, é dado que o motor GRAVA.** Conserto: procurar o fim A PARTIR do início.

## Regressão em PROD (depois do apply)

| Smoke / prova | Como | Resultado |
|---|---|---|
| `p45_motor_exclusao_smoke.sql` | `run` puro | **verde**, `exit 0`, sem exceção |
| `p45_motor_exclusao_smoke.sql` | `run` com `RAISE` lendo o contador | **`P45=38 (esperado 38)`** |
| `p46_purga_smoke.sql` | `run` puro | **`P46P_REG_CONTADOR=27`**, `exit 0` — gate cheio |
| os QUATRO `check:*` | | **OK** nos quatro |
| `npm run -s lint` | | **89** erros TS (teto D-53 = 90) |
| varredura de portões pela FORMA | padrão do `CLAUDE.md` | **317** achados (eram 315); os 2 novos são meus, classificados |
| estado de PROD | relido coluna a coluna depois de tudo | 25 `analise_candidato_vaga` (23 com `resumo_cv`, **2 com sentinela**), 5 `entrevista_guias` intactas (7 817..15 745), `config_purga.modo = dry_run` |

### ⚠ A prova mais forte deste plano é a asserção (b) do `p46_purga_smoke`, e ela é acidental

A (b) chama `anonimizar_candidato(id, true)` **para todos os titulares elegíveis reais** e termina revertendo. Ou seja: depois do apply, o passo novo **executou contra as 23 análises reais** de pessoas de verdade, com `pontos_fortes` e `gaps` reais, e voltou atrás. Nenhum `NOT NULL`, nenhum CHECK e nenhum trigger abortou. É a medição que o Pitfall 6 pede e que nenhuma fixture sintética consegue dar.

### O `p46_purga_smoke (j.2)` não reprova mais — e isso é o esperado

O `<known_blocker>` do plano já o diz: é o resultado do 49-28, não drift. Medido: `run` puro sai `exit 0` com o gate cheio em 27.

## Deviations from Plan

**1. [Rule 1 — bug, e o mais consequente do plano] O conjunto retroativo é 2 e não 8, porque o predicado do plano casa três populações**
- **Found during:** Task 1, medição do escopo
- **Issue:** o plano manda tratar «as 8 linhas», medidas por `email like '%@invalido.local'`. Seis delas pertencem a contas de teste com PII **intacta**, que nunca passaram pelo motor.
- **Fix:** discriminador trocado pela **sentinela que o motor grava** em `nome_completo` + `user_id` NULL + `cpf` NULL + ausência em `auth.users`. O conjunto autorizado literal (2 ids) é conferido por `IS DISTINCT FROM` contra o que esse predicado acha, e o apply aborta mandando RE-AUTORIZAR se divergir.
- **Files modified:** `supabase/migrations/20260923000002_p49_motor_desidentifica_analises.sql`
- **Verification:** pós-estado em PROD — 2 linhas com sentinela, **23 alheias intactas**; mutação M7 mede o estrago evitado (23 → 0)
- **Committed in:** `4e652b9f`

**2. [Rule 2 — funcionalidade crítica ausente] `pontos_fortes` e `gaps` entraram no passo; `erro` e `descartada_motivo` não**
- **Found during:** Task 1, classificação coluna por coluna
- **Issue:** a enumeração do plano deixaria de fora duas colunas `text[] NOT NULL` com até 1 168 octetos de prosa citando o titular em **primeira pessoa**, e incluiria duas que não carregam dado de pessoa (`erro` = 0 de 25 com conteúdo; `descartada_motivo` = CHECK de um literal).
- **Fix:** classificação MEDIDA das 13 colunas das duas tabelas, com o instrumento de primeira pessoa; as quatro do titular no passo, as nove restantes no pré-portão do catálogo com a razão escrita.
- **Files modified:** os dois arquivos do plano
- **Verification:** mutações M3 e M5; pré-portão «13 colunas conferidas no catalogo (4 no passo, 9 fora…)»
- **Committed in:** `4e652b9f`

**3. [Rule 1 — bug no próprio artefato] O pós-portão reprovou o apply correto, por ler COMENTÁRIO e por delimitar do octeto zero**
- **Found during:** Task 1, sonda de forma
- **Issue:** ver «O pós-portão da migration reprovou o apply CORRETO» acima — as duas causas e os dois consertos.
- **Fix:** cláusulas negativas leem o corpo sem comentários (com asserção de que a remoção removeu algo); o fim do trecho é procurado A PARTIR do início. O mesmo desenho na (C3/viii).
- **Files modified:** os dois arquivos do plano
- **Verification:** a sonda passou depois de cada conserto, e as mutações M5/M6/M10 provam que as cláusulas consertadas continuam MORDENDO — um portão que se tornou incapaz de falhar é pior que o quebrado
- **Committed in:** `4e652b9f`

**4. [Rule 1 — bug no próprio artefato, achado por mutação] O diagnóstico da (B24) era FALSO para um `DELETE`, e a cláusula ⊕ não cobria telemetria**
- **Found during:** Task 1, mutações M4 e M5
- **Issue / Fix:** ver «As duas mutações que acharam defeito em mim».
- **Files modified:** `supabase/tests/p45_motor_exclusao_smoke.sql`
- **Verification:** M4 e M5 re-rodadas ⇒ as duas agora reprovam pela cláusula PRETENDIDA e com o diagnóstico CERTO
- **Committed in:** `4e652b9f`

**5. [Escopo — ampliação deliberada] DEZ mutações em vez de uma**
- **Found during:** Task 1
- **Issue:** o plano pede prova de mordida «uma por cláusula». A (B24) tem 9 cláusulas e a (C3/viii) tem 9; uma única inversão deixaria as outras sem prova própria.
- **Fix:** dez inversões, cada uma numa requisição que aborta, com o harness abortando com «HARNESS QUEBRADO» se a âncora não ocorrer exatamente uma vez (§L).
- **Files modified:** nenhum (as mutações vivem no scratchpad; nunca no repositório)
- **Committed in:** n/a (prova de sessão)

**6. [Escopo — NÃO feito, e a razão medida] O inventário LGPD NÃO foi realinhado — WINDOWS 86**
- **Found during:** Task 1, leitura do `gen-recibo-exclusao.cjs` e do `pii-inventory.yaml`
- **Issue:** `analise_candidato_vaga` continua em `tabelas_sem_pii_titular` (coberta em bloco pela R4) enquanto o motor agora gasta um passo inteiro **removendo** texto livre do titular dela. O inventário afirma o contrário do que o motor faz. O 49-17 nomeou este movimento como do 49-29 — mas o `files_modified` deste plano lista apenas a migration e o smoke, e o movimento muda TRÊS artefatos gerados (`pii-inventory.yaml`/`.md`, `recibo-exclusao.json`, os dois espelhos TS) e obriga a redeploy das duas EFs.
- **Fix:** **não feito, e registrado.** Medido antes de decidir: nenhum dos quatro `check:*` reprova — e é exatamente por isso que a janela existe, porque nenhum portão vai lembrar disso sozinho.
- **Files modified:** `.planning/WINDOWS.md` (entrada **86**)
- **Verification:** os quatro `check:*` OK; o `windows append` aceitou (é o comparador FORTE, por §M/49-28)
- **Committed in:** o commit de metadado deste plano

**7. [Estado vivo] O `push` foi DENEGADO DUAS VEZES pelo classificador**
- Ver «⚠ Estado vivo no fecho». Não contornado, por política explícita do plano.

---

**Total deviations:** 7 (4 da Regra 1/2 — três delas defeitos no meu próprio artefato, achados por sonda e por mutação —, 1 ampliação deliberada de escopo, 1 não-feito registrado, 1 estado vivo). **O estado vivo medido bateu integralmente com o que o plano assume nos pré-portões** — os dois md5, a purga em `dry_run` e a ausência da tabela no corpo. O que o plano **não** previa e a medição trouxe: as três populações do `@invalido.local`, as duas colunas `text[]` de texto do titular, a absolvição estrutural de `entrevista_guias`, e as duas ocorrências novas da família «portão que parece medir e não mede». **Impact on plan:** o artefato é mais forte que o pedido (18 cláusulas em vez de «uma por coluna», 10 mutações em vez de 1, o pré-portão do catálogo cobrindo as 9 colunas que ficam FORA, e as duas tabelas na negativa de resíduo), e o conjunto retroativo é **menor** que o pedido, por medição.

## ⚠ Estado vivo no fecho — o que está preso, e o que já está em PROD

O `git push origin main` foi **DENEGADO DUAS VEZES** pelo classificador de auto mode (`Out-of-Place Publication`), exatamente como o `<push_policy>` do plano previa que poderia acontecer. Por política eu **não contornei**.

**O que está em PROD agora:** a migration `20260923000002` aplicada e escriturada; os dois corpos de função com os md5 novos; as 2 linhas retroativas desidentificadas.

**O que está preso local:** o commit **`4e652b9f`** (`feat(49-29)`), tocando `supabase/migrations/20260923000002_p49_motor_desidentifica_analises.sql` (novo) e `supabase/tests/p45_motor_exclusao_smoke.sql`; mais o commit de metadado deste plano.

**⚠ E a assimetria importa, mas NÃO na direção mais perigosa.** O `CLAUDE.md` avisa que `p46apply.cjs` não passa pelo git e que o front sai por outro canal — foi assim que, em 2026-09-06, uma migration ficou horas em PROD com o código que a chama parado no disco. **Aqui não há esse par:** este plano não toca `src/` nem `supabase/functions/`, então não existe front esperando deploy. O que existe é um **registro de repositório incompleto** — o arquivo que PROVA o que está aplicado (e o smoke que o vigia) não está publicado. É sério por razão de auditoria, não de comportamento: o próximo agente que ler `origin/main` vai encontrar o motor sem o passo e os md5 antigos nos pins do smoke, e vai medir divergência contra PROD.

**Recomendação ao orquestrador:** empurrar `4e652b9f` e o commit de metadado. Depois, `git log --oneline origin/main..HEAD` tem de sair VAZIO.

## Registrado, não consertado

- **WINDOWS 86 — o inventário afirma o contrário do que o motor faz.** Ver a deviation 6. É o movimento que fecha o D-66 pelo lado do registro, e ele não está no `files_modified` deste plano.
- **WINDOWS 83 (D-66)** pode passar a `fixed` pelo lado do MOTOR — o defeito que ela descreve (o nome do titular sobrevivendo dentro da análise) está corrigido e as linhas existentes foram tratadas. Não a fechei, porque a entrada nomeia o desalinhamento entre o recibo e o motor, e a metade de REGISTRO dele continua aberta na 86. Fechar uma janela cuja metade sobrevive com outro número é o registro-que-mente que esta fase gastou dias perseguindo.
- **`v_analises_presas`** (herdada do 49-17, WINDOWS 85): a view de dono `postgres` sem `security_invoker` que expõe `erro` de análise a qualquer `authenticated`. Medida pelo 49-17 como não expondo coluna alguma da fase. Fora do escopo deste plano — e note que `erro` é justamente uma das colunas que medi como dado de sistema, o que reduz (não elimina) a gravidade.
- **Os dois erros TS pré-existentes** que o `<known_blocker>` nomeia (`resend-webhook.test.ts` com `npm:svix@1.99.1` e `_shared/__tests__/strict-schema.test.ts:88`) continuam de pé. Não «consertados», por instrução explícita.

## Self-Check: PASSED

- `supabase/migrations/20260923000002_p49_motor_desidentifica_analises.sql` — **FOUND** (155 843 octetos)
- `supabase/tests/p45_motor_exclusao_smoke.sql` — **FOUND** (modificado, +291/−13)
- `.planning/phases/49-consertos-da-jornada-bloco-2/49-29-SUMMARY.md` — **FOUND**
- commit `4e652b9f` — **FOUND** em `git log`
- ledger `20260923000002` com `md5(statements[1])` = `5e746a4f…` — **CONFERIDO por leitura de volta**
- `P45=38`, `P46P_REG_CONTADOR=27`, quatro `check:*` OK, lint 89 — **MEDIDOS nesta sessão**
- ⚠ `git log --oneline origin/main..HEAD` **NÃO está vazio** — ver «Estado vivo no fecho». É o único critério de sucesso do plano que não fecha, e a razão é a denegação do classificador, não trabalho faltando.
