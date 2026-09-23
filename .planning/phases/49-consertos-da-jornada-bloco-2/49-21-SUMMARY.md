---
phase: 49-consertos-da-jornada-bloco-2
plan: "21"
subsystem: compliance
tags: [lgpd, recibo-exclusao, pii-inventory, postgres, supabase, anonimizacao, motor-destrutivo, jsonb, migrations, p46apply, edge-functions, mutation-testing]

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "20"
    provides: "o corpo vivo de que este plano parte e os dois md5 que sao o seu PRE-PORTAO (`0d16c0d8…` / `f86cb2b1…`), o contador 36 do smoke, a tabela C4 item a item do que o recibo ainda desalinhava, e a medicao que criou o D-69 (as escolhas da SJT sobreviviam em 4 de 5 linhas `sjt`)"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "14"
    provides: "o motor apagando `ai_call_logs.user_prompt_template` (D-61), as linhas `comparative_ranking` que citam o titular (D-63) e `revisao_resultado` nas duas tabelas (D-60) — os tres apagamentos que o recibo escondia; e a medicao do defeito de inventario do D-66"
  - phase: 46-purga-e-guardas
    provides: "`p46apply.cjs` (SQL lido do ARQUIVO, migration + ledger na mesma requisicao, md5 conferido por leitura de volta) e `efdeploy.cjs`"
provides:
  - "D-69 aplicado: o passo `apagar_respostas_e_producoes` ganha o statement (14/14) — `scores_candidato.metadata - 'respostas'`, a CHAVE sai e a LINHA fica —, escopado por `candidatura_id`, com `jsonb_exists` no PREDICADO e contagem propria (`scores_candidato_respostas_sjt`) em `'passos'`, no terminador do dry-run e em `plano_exclusao_titular` pela MESMA expressao"
  - "o item `respostas_e_producoes` do recibo passa a apontar `passo_motor: 'apagar_respostas_e_producoes'` — ate aqui apontava `tombstone_candidato`, que nao tocava NENHUMA das suas origens — e ganha `scores_candidato.metadata` como origem"
  - "`ai_call_logs.user_prompt_template` sai de `conteudo_do_produto` e vira origem de `dados_enviados_a_analise_automatica` (D-61); o texto do item cobre tambem o conteudo das analises comparativas que citavam o titular (D-63), sem nomear tabela"
  - "`revisao_resultado` (corrente e arquivo) sai de `anotacoes_da_equipe` e ganha linha PROPRIA na coluna «sai» (`resposta_ao_seu_pedido_de_revisao`, passo `tombstone_decisao_final`), com texto que descreve o que o motor faz em vez de herdar a afirmacao de preservacao (D-60)"
  - "no inventario: `user_prompt_template` → `apagar`/R5 com a nota medida, a nota de `raw_response` corrigida (ela guarda a SAIDA), `revisao_resultado` → `apagar`/R5 nas duas tabelas com o «⚠ nao a toca» removido, `scores_candidato.metadata` com o registro do que sai e do que fica"
  - "`p45_motor_exclusao_smoke.sql`: (B23) com QUATRO metades, (C3/vii) com quatro clausulas de forma acrescentadas ANTES do re-pin, a 14a chave na (B20), duas fixtures novas, e contador 36 → 37"
  - "os md5 novos, que sao o PRE-PORTAO de quem editar estes corpos depois: `anonimizar_candidato` = 1d8f96c8f21a755ded0505a0b652113a (length 78 301) · `plano_exclusao_titular` = 6f2ef83664944b9a39c7d495a49ab8f1 (length 33 716)"
  - "`executar-direito-titular` version=10 ACTIVE com `verify_jwt=true`; o recibo novo conferido no bundle VIVO e no chunk do front LIDO DE VOLTA do site"
affects: [49-19, 49-17, 49-18, 49-28]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4),
# e o MESMO instrumento do 49-14/49-20 (octetos da migration + chars das linhas
# acrescentadas aos demais arquivos), para os numeros serem comparaveis.
actuals:
  tokens: 43021
  tasks: 1
  commits: 1
  plan_head_before: 405e764671a9de2c6944b72ca71c4b46b2443a4c
  # `commits: 1` = MEDIDO por `git rev-list --count 405e7646..HEAD` no instante em que
  # este SUMMARY foi escrito (HEAD = 33283202, o commit de codigo). Re-medir DEPOIS
  # deste ponto da um numero MAIOR, e isso NAO e divergencia: os commits de metadado
  # deste plano entram no mesmo intervalo por construcao, porque o `plan_head_before`
  # e anterior a eles.
  # `tokens: 43021` = (134 242 octetos da migration + 37 842 chars das linhas
  # acrescentadas ao smoke, ao gerador, ao inventario, aos artefatos gerados e ao
  # teste) / 4. A estimativa era 45 000; o realizado e 0,96x — a mais proxima da fase,
  # e a razao e que a migration foi MONTADA por extracao (nenhum corpo transcrito) e o
  # escopo de texto era conhecido item a item pela C4 do 49-20.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Montar a migration por EXTRACAO em vez de transcricao, e provar a extracao pelo md5 ANTES de editar: o script le os corpos entre os delimitadores nomeados do arquivo anterior, calcula `md5(prosrc)` e ABORTA se nao bater o vivo. O off-by-one do `\\n` que segue o delimitador de abertura (75 396 contra 75 397) foi pego por esse portao — um corpo extraido errado por um caractere produziria um pre-portao que reprova o proprio apply"
    - "Quando o recibo passa a citar um NUMERO, a contagem tem de ser um `ROW_COUNT` proprio e nao uma parcela de outro: somada a contagem vizinha, um ZERO na chave nova ficaria invisivel e ninguem poderia dizer QUAL das tres raspagens da coluna nao aconteceu"
    - "O ⊖ CONTROLE de escopo mais forte nao usa fixture: conta as linhas de OUTRAS candidaturas que hoje carregam o dado em PROD, antes e depois. Uma mutacao que remova o filtro por `candidatura_id` nao e vista por nenhuma assercao de pos-estado sobre a fixture — e e vista por essa"
    - "Uma segunda linha de fixture SEM o dado alvo e o que transfere a prova do predicado do pos-portao do apply (que roda uma vez) para o smoke (que roda sempre): com uma linha so, `ROW_COUNT` sem o predicado da o MESMO numero da contagem correta e a assercao de tres fontes passa"
    - "Mutacao que MOVE o statement para fora do passo mantendo o comportamento identico, com o pin re-carimbado, e a unica forma de a rede de FORMA ser a primeira a falar — o analogo da M13 do 49-20 para um statement que nao apaga linha"
    - "Classificacao de coluna no inventario segue o MECANISMO e nao a palavra: `revisao_resultado` recebe valor fixo no lugar do texto, igual a `redacoes_candidato.texto`, que e `apagar` — e foi a classificacao `preservar_com_ressalva` que a manteve descrita como anotacao que fica"
    - "Uma coluna PARCIALMENTE redigida pertence as DUAS colunas do recibo, e a regra de ORIGEM DUPLICADA do gerador (uma por lado) permite exatamente isso: `scores_candidato.metadata` em «sai» (as escolhas e as citacoes saem) e em «mantem» (o score fica) e a unica descricao verdadeira"

key-files:
  created:
    - supabase/migrations/20260923000001_p49_motor_respostas_sjt.sql
  modified:
    - supabase/tests/p45_motor_exclusao_smoke.sql
    - docs/compliance/sql/gen-recibo-exclusao.cjs
    - docs/compliance/pii-inventory.yaml
    - docs/compliance/pii-inventory.md
    - docs/compliance/recibo-exclusao.json
    - docs/compliance/export-allowlist.json
    - docs/compliance/__tests__/genReciboExclusao.test.ts
    - supabase/functions/_shared/reciboExclusao.ts
    - supabase/functions/_shared/exportAllowlist.ts
    - src/features/privacidade/constants/reciboExclusao.generated.ts
    - .planning/WINDOWS.md

key-decisions:
  - "O statement do D-69 e SEPARADO e nao uma clausula a mais no (13/13), porque o recibo passa a poder citar o numero: um `ROW_COUNT` que somasse citacoes, `cited_evidence` e escolhas da SJT nao permitiria dizer QUAL das tres foi zero. Custo: uma chave a mais nas tres fontes da (B20). Beneficio: o auditor le `scores_candidato_respostas_sjt` separado de `scores_candidato`"
  - "`revisao_resultado` NAO foi posto nas duas linhas da justificativa, apesar de o D-60 dizer «o recibo passa a trata-lo como trata a justificativa». Razao MEDIDA: aquelas duas linhas afirmam que «o texto continua guardado» / «fica guardada», e o motor substitui o texto da justificativa por um valor fixo que diz, com estas palavras, que o texto original foi removido. Herdar essa frase para a coluna nova seria descrever falsamente o apagamento que este plano existe para descrever. O D-60 foi cumprido no MECANISMO (mesmo passo `tombstone_decisao_final`, mesma familia de item, classificacao `apagar` como a de `redacoes_candidato.texto`) e a linha ganhou texto proprio. O defeito de copy da justificativa e PRE-EXISTENTE (Phase 45 contra Phase 45), esta fora da C4, e foi REGISTRADO em WINDOWS em vez de consertado: reescrever uma das TRES linhas obrigatorias da UI-SPEC e copy de produto com peso legal"
  - "O D-66 NAO foi implementado como «tirar as duas tabelas da lista», e a razao esta medida: removidas de `tabelas_sem_pii_titular` elas teriam de entrar em `tabelas:`, e a regra de COBERTURA do gerador exigiria um veredito por coluna — cujo unico veredito honesto hoje seria uma linha NOVA dizendo ao titular que o seu nome continua nesses textos, porque o operador deixou o apagamento de `resumo_cv`/`guia` fora do escopo (§Deferred). O que FOI feito: a `nota` da secao e as duas entradas passaram a registrar a medicao (13/24 e 2/5) e a ressalva ABERTA, para que o documento deixe de AFIRMAR ausencia de PII. A decisao entre (a) o motor desidentificar e (b) copy nova esta em WINDOWS 81, para o operador"
  - "O ⊖ CONTROLE de escopo da (B23) conta populacao REAL de PROD (as 4 linhas de outras candidaturas com a chave) em vez de criar um segundo titular sintetico. Uma fixture alheia exigiria candidato+candidatura novos e ainda assim provaria menos: o vazamento que importa e sobre quem nao pediu nada, e sao essas as linhas que existem"
  - "Uma SEGUNDA linha de score do titular, sem a chave, entrou na fixture de proposito. Sem ela o titular tinha UMA linha, `ROW_COUNT` sem o predicado `jsonb_exists` daria o MESMO 1 da contagem correta, e a prova do predicado ficaria so no pos-portao do apply — que roda uma vez e nunca mais. Medido: com ela, a mutacao M4b sai NOMEADA pelo smoke (`passos=2 mao=1`)"
  - "A migration foi MONTADA por extracao (script no scratchpad, nunca no repositorio) com o md5 dos corpos conferido contra o vivo ANTES da edicao e os md5 NOVOS PREVISTOS do arquivo antes do apply, para que os pins do smoke fossem trocados e o ensaio rodasse com eles. Os dois previstos bateram exatamente o catalogo depois — e a diferenca entre um pin calculado e um pin carimbado e a prova de que nao houve re-pin cego"
  - "`main` mantida como branch de trabalho (autorizacao explicita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Nao registrado como desvio"

patterns-established:
  - "Um plano que muda motor E recibo na mesma entrega tem de aplicar o motor PRIMEIRO e so depois alinhar a promessa: entre os dois momentos o recibo diz MENOS do que o motor apaga, que e a direcao segura. A ordem inversa cria uma janela em que o recibo promete o que ainda nao acontece"
  - "Ao herdar uma decisao que manda «tratar X como Y», MEDIR o que o sistema faz com Y antes de copiar o texto de Y: se a descricao de Y for falsa, a heranca propaga a falsidade para X — e o plano que existe para alinhar promessa e mecanismo teria acrescentado um desalinhamento novo"
  - "Neutralizar o pos-portao da migration trocando `RAISE EXCEPTION` por `RAISE NOTICE` por regex e a forma barata de fazer a variante `Mnb`: o portao anterior deixa de falar primeiro e a assercao pretendida fica com prova propria, sem editar o smoke (editar o smoke para provar o smoke e circular)"

requirements-completed: [JORN-36]

coverage:
  - id: D1
    description: "As escolhas da SJT (as alternativas que a pessoa marcou) saem de `scores_candidato.metadata` quando o titular pede exclusao, e a linha com o score FICA (D-69)"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B23) quatro metades — a chave existia ANTES (nao-vacuidade), nao existe DEPOIS, `motivos_revisao`/`composite_0_25` FICAM, e as linhas de OUTRAS candidaturas guardam as suas escolhas"
        status: pass
      - kind: integration
        ref: "mutacao M1 (statement removido) ⇒ POS-PORTAO do apply; M1b (removido + a contagem MENTINDO por um count) ⇒ FAIL (B23) «as ESCOLHAS da SJT do titular SOBREVIVERAM ao tombstone»"
        status: pass
      - kind: integration
        ref: "mutacao M2 (sentinela na coluna INTEIRA) ⇒ POS-PORTAO; M2b (pos-portao neutralizado) ⇒ FAIL (B19/⊕) «a remocao da citacao levou a ANALISE junto»; M2c (remocao que leva a chave VIZINHA) ⇒ FAIL (B23/⊕) «motivos_revisao=<ausente>» — a unica que a (B19) nao ve"
        status: pass
      - kind: integration
        ref: "mutacao M3 (escopo vazado) ⇒ FAIL (B20) «passos=5 mao=1»; M3b (o MESMO vazamento com a contagem honesta) ⇒ FAIL (B23/⊖escopo) «antes=4 depois=0» sobre populacao REAL de PROD"
        status: pass
      - kind: other
        ref: "PROD depois do apply: `md5(prosrc)` de `anonimizar_candidato` = 1d8f96c8f21a755ded0505a0b652113a (78 301), o statement dentro do passo e ANTES de `severar_fks_set_null`, e o apagamento de LINHA continua em exatamente 4 tabelas (lista EXTRAIDA do corpo instalado)"
        status: pass
    human_judgment: false
  - id: D2
    description: "O dry-run PREVE o numero das escolhas que VAO sair, pela MESMA expressao do motor — e o motor DECLARA quanto removeu"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(B20) a 14a chave (`scores_candidato_respostas_sjt`) entrou nas TRES fontes: a expressao medida a mao, o `'plano'` lido no PASSO 0 e o `'passos'` declarado"
        status: pass
      - kind: integration
        ref: "mutacao M4 (predicado sem `jsonb_exists`) ⇒ POS-PORTAO; M4b (neutralizado) ⇒ FAIL (B20) «passos=2 mao=1» — possivel SO por causa da segunda linha de fixture sem a chave"
        status: pass
      - kind: integration
        ref: "mutacao M5 (o dry-run perde a chave) ⇒ POS-PORTAO; M5b (neutralizado) ⇒ FAIL (B20) «plano=<ausente> mao=1»"
        status: pass
    human_judgment: false
  - id: D3
    description: "A rede de FORMA cresceu ANTES do re-pin e morde no cenario do re-pin descuidado"
    requirement: JORN-36
    verification:
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(C3/vii) quatro clausulas — o statement no passo, o predicado, a chave declarada no motor e a chave + predicado no dry-run — acrescentadas no MESMO commit e ANTES da troca dos dois pins, com a proveniencia escrita no cabecalho"
        status: pass
      - kind: integration
        ref: "mutacao M6 (statement MOVIDO para fora do passo, comportamento IDENTICO) ⇒ POS-PORTAO; M6b (neutralizado) ⇒ FAIL (C3/i) pelo pin; M6c (o MESMO com o pin RE-CARIMBADO para o corpo mutado, 169a9ad9…) ⇒ FAIL (C3/vii) — a unica situacao em que a rede de forma e a primeira a falar"
        status: pass
    human_judgment: false
  - id: D4
    description: "O recibo e o inventario descrevem o motor como ele e, item a item contra a C4 do 49-20"
    requirement: JORN-36
    verification:
      - kind: command
        ref: "`node docs/compliance/sql/gen-recibo-exclusao.cjs` + `gen-pii-md.cjs` + os QUATRO `check:*` (matriz-retencao, pii-inventory-md, recibo-exclusao, export-allowlist) — todos OK; 223 de 223 colunas em escopo com veredito"
        status: pass
      - kind: tests
        ref: "docs/compliance src/features/privacidade src/__tests__/guards — 298 testes, 23 arquivos, verdes. `genReciboExclusao.test.ts` (1) mudou DE PROPOSITO (sete → oito passos) com comentario de proveniencia"
        status: pass
      - kind: command
        ref: "verify #2 do plano: `apagar_respostas_e_producoes` no recibo JSON e `user_prompt_template: { classificacao: apagar }` no YAML — OK"
        status: pass
      - kind: command
        ref: "`npm run -s lint` = 89 erros TS (teto D-53 = 90; margem de um preservada, nenhum erro novo)"
        status: pass
    human_judgment: false
  - id: D5
    description: "O recibo novo chega ao titular real: a EF que o embarca esta no ar e o espelho do front esta publicado"
    verification:
      - kind: other
        ref: "`efdeploy.cjs executar-direito-titular` (apos `--dry-run` com os 5 arquivos, `_shared/reciboExclusao.ts` incluso) ⇒ `version=10 status=ACTIVE verify_jwt=true`; bundle VIVO lido pela Management API: `apagar_respostas_e_producoes`=5, `resposta_ao_seu_pedido_de_revisao`=2, `user_prompt_template`=2 (um marcador por chamada, §N)"
        status: pass
      - kind: other
        ref: "front: `origin/main..HEAD` VAZIO; hash do indice servido por rh.beautysmile.com.br = `assets/index-B2PsHgGs.js` = o do build local (§N: o hash responde «o deploy saiu»); e os dois marcadores LIDOS DE VOLTA do chunk vivo, um por chamada"
        status: pass
    human_judgment: false
  - id: D6
    description: "A migration esta aplicada E escriturada, ENSAIADA antes em requisicao que aborta, e o motor NAO foi executado contra titular real"
    verification:
      - kind: other
        ref: "ledger: 20260923000001 = 0ed04de22ab3c58f3d294ae745c7d5e8 (134 242 octetos) — identico ao md5 do disco, LIDO DE VOLTA; `version` nasceu correta (nenhum reparo)"
        status: pass
      - kind: other
        ref: "sonda de forma (migration sozinha + `RAISE 'SONDA_MIGRATION_OK'`) e ensaio (migration + smoke ampliado + `RAISE` LENDO o contador ⇒ `CONTADOR=37 (esperado 37)`), UMA requisicao cada, as duas abortaram no marcador e sem `FAIL`; `md5(prosrc)` vivo continuava o ANTIGO depois das duas"
        status: pass
      - kind: other
        ref: "estado de PROD relido depois de tudo: `config_purga.modo = dry_run`, `scores_candidato` 15 (4 AINDA com a chave `respostas`, 5 `sjt`), `respostas_raven` 60, `respostas_formulario` 115, `redacoes_candidato` 2, `candidatos` 44. Toda escrita do smoke e das ONZE mutacoes viveu em requisicao que aborta"
        status: pass
    human_judgment: false
  - id: D7
    description: "Os smokes do motor fecham com o contador LIDO, depois do apply"
    verification:
      - kind: integration
        ref: "`p45_motor_exclusao_smoke` com um `RAISE` de leitura do contador no fim: `P45=37 (esperado 37)` — depois do apply. E `CONTADOR=37` ja no ensaio, antes dele"
        status: pass
      - kind: integration
        ref: "`p46_purga_smoke` = `P46P_REG_CONTADOR=27` no `run` PURO (gate cheio). A (j.2) que reprovava no 49-20 por estado de fixture-seed alheio nao reprova mais — ver «Registrado, nao consertado». A assercao `(b)` desse arquivo roda o motor em `dry_run` sobre os titulares REAIS elegiveis, entao o statement novo executou contra as 4 linhas reais com a chave e foi revertido"
        status: pass
    human_judgment: false

# Metrics
duration: 70 min
completed: 2026-09-23
status: complete
---

# Phase 49 Plano 21: O motor apaga as escolhas da SJT, e o recibo passa a descrever o motor como ele é Summary

**As alternativas que a pessoa marcou na SJT deixam de sobreviver a um pedido de exclusão — a chave `respostas` sai de `scores_candidato.metadata` e a linha com o score fica (D-69, remoção cirúrgica pela mesma razão que o `cited_evidence`) —, e o recibo que o titular recebe passa a nomear o passo que de fato executa cada uma das suas promessas: o conteúdo enviado ao modelo sai de «conteúdo do produto» e vira apagamento declarado, as análises comparativas entram no texto, e a resposta ao pedido de revisão ganha linha própria em vez de herdar uma frase que dizia que ela fica guardada.**

## Performance

- **Duration:** 70 min
- **Started:** 2026-09-23T20:05:00Z
- **Completed:** 2026-09-23T21:15:00Z
- **Tasks:** 1 / 1
- **Files:** 12 (1 criado, 11 modificados)

## A precondição, lida antes de escrever uma linha

| O que o plano exige | Medido em PROD (2026-09-23, só leitura) | Bate? |
|---|---|---|
| `apagar_respostas_e_producoes` no corpo vivo | posição **41 791** em `anonimizar_candidato` | sim |
| `revisao_resultado` no corpo vivo | posição **3 952** | sim |
| `comparative_ranking` no corpo vivo | posição **4 095** | sim |
| `md5(prosrc)` de `anonimizar_candidato` = `0d16c0d8…` (pré-portão do 49-20) | **`0d16c0d8185fe9885d4ec823cfa4dd71`**, length 75 397 | sim |
| `md5(prosrc)` de `plano_exclusao_titular` = `f86cb2b1…` | **`f86cb2b1ae6ae007c8145c18f7797dbd`**, length 33 074 | sim |
| purga automática em ensaio | **`config_purga.modo = 'dry_run'`** | sim |
| os corpos do ARQUIVO são byte a byte os vivos | extraídos de `20260922000013`: md5 **idênticos** aos dois vivos (conferência CRUZADA, e ela pegou um off-by-one de um caractere) | sim |

⚠ A precondição não ficou só lida: virou **pré-portão da migration**, com os dois pins, a
purga, o catálogo de `scores_candidato.metadata` (`jsonb` / `NOT NULL` — é o que torna a
remoção cirúrgica a única saída) e a janela `app.motor_exclusao` no trigger da redação, de
que o passo inteiro depende para não abortar no meio sob claims de administrador.

## Passo 1 — a C4 do 49-20, item a item, e o que cada item virou

| # | O que o 49-20 deixou | O que o recibo/inventário dizia | O que passou a dizer |
|---|---|---|---|
| 1 | `respostas_e_producoes` com `passo_motor: 'tombstone_candidato'` | um passo que **não tocava nenhuma** das 14 origens | `passo_motor: 'apagar_respostas_e_producoes'`, com `PASSO_ONDE` nomeando as duas migrations |
| 2 | `user_prompt_template` mapeado como `conteudo_do_produto` (`recibo-exclusao.json:500`/`:534`) | conteúdo do produto = **preservado** | origem de `dados_enviados_a_analise_automatica`; no inventário, `apagar`/R5 com a nota medida do RESEARCH |
| 2b | a nota de `raw_response` dizia «contém o payload **enviado**» | a nota estava na coluna errada do par | «**SAÍDA** do modelo sobre a pessoa (o input enviado é `user_prompt_template`)» |
| 3 | as escolhas da SJT sobreviviam (4 de 5 linhas `sjt`) | o recibo prometia que as respostas foram apagadas | **D-69**: o motor passa a removê-las; a promessa ganhou mecanismo |
| 4 | D-63: as análises comparativas que citavam o titular | o texto do item não as cobria | segunda frase no item, **sem nomear tabela** |
| 5 | D-60: `revisao_resultado` em `anotacoes_da_equipe` («ficam guardadas») | descrita como anotação que **fica** | linha própria na coluna «sai» + `apagar`/R5 nas duas tabelas; o «⚠ não a toca» saiu |
| 6 | D-66: `analise_candidato_vaga` e `entrevista_guias` «sem PII» | afirmação de ausência, com 13/24 e 2/5 carregando o primeiro nome | a `nota` e as duas entradas passaram a registrar a **medição** e a ressalva ABERTA; a decisão vai ao operador (WINDOWS 81) |
| — | `scores_candidato.metadata` só em «mantém» | o score fica — verdade pela metade | agora nos **dois** lados: as escolhas e as citações saem, o score fica |

## Passo 1 — varredura de portões pela FORMA (`CLAUDE.md` §«Portões»)

Padrão do `CLAUDE.md` sobre `supabase/tests/*.sql`: **311 achados** (o número que o 49-20
deixou). As formas que **eu acrescentei** e a classificação de cada uma:

| Forma nova | Classificação |
|---|---|
| a 14ª chave em `v_rp_chaves` | **escopo deliberado** — é a lista de promessas do recibo escrita como dado; uma origem nova TEM de reprovar até entrar aqui |
| `v_sc_out_d <> v_sc_out_a` | comparação com **baseline capturada na própria execução** (a contagem de antes), jamais com constante — é o conserto que o `CLAUDE.md` prescreve |
| `v_sc_out_a = 0` (não-vacuidade do controle) | contagem contra constante, e **deliberada**: zero ali significa que a consulta do controle está errada, não que o banco está limpo — a mensagem diz isso |
| `v_sc_mot_d <> 'dimensao_desconhecida'` | comparação com valor de **fixture criada na própria execução** — não é fotografia de PROD |
| contador `37` | escopo deliberado, com o bump registrado nos **três** lugares e o histórico (25 → 30 → 36 → 37) escrito |

## Task Commits

1. **Task 1 (tracer): o motor apaga as escolhas da SJT, e o recibo descreve o motor como ele é** — `33283202` (feat)

**Ledger de PROD:**

| version | name | md5 do arquivo | md5 do ledger | octetos |
|---|---|---|---|---|
| 20260923000001 | p49_motor_respostas_sjt | `0ed04de22ab3c58f3d294ae745c7d5e8` | `0ed04de22ab3c58f3d294ae745c7d5e8` | 134 242 |

A `version` nasceu correta (nenhum reparo de ledger). O md5 do ledger foi **lido de volta**
e conferido, porque «aplicado» e «escriturado» são afirmações diferentes.

## md5 — antes e depois (⚠ os pins novos do smoke saem daqui)

| Objeto | Antes do apply | Depois (vivo) |
|---|---|---|
| `anonimizar_candidato(uuid,boolean)` | `0d16c0d8185fe9885d4ec823cfa4dd71` (75 397) | **`1d8f96c8f21a755ded0505a0b652113a`** (**78 301**) |
| `plano_exclusao_titular(uuid)` | `f86cb2b1ae6ae007c8145c18f7797dbd` (33 074) | **`6f2ef83664944b9a39c7d495a49ab8f1`** (**33 716**) |
| `trg_redacao_rh_only_review_fields()` | `d54f28e0…` | **intocado** (só conferido: a janela `app.motor_exclusao` continua lá) |
| pins do `p45_motor_exclusao_smoke` (C3/i) | os dois do 49-20 | **os dois novos, trocados no MESMO commit, com a rede (C3/vii) crescida ANTES** |
| contador do RESUMO (z) | 36 | **37** |
| ACL das duas funções | `service_role` + `authenticated` | **idêntico** (reemitido de propósito: `pg_default_acl` deste schema concede a `anon` como grant DIRETO) |

⚠ Os dois valores «depois» foram **previstos do arquivo** (md5 do corpo montado) ANTES do
apply, para que os pins do smoke pudessem ser trocados e o ensaio rodasse com eles — e
depois **conferidos contra o catálogo**. Os dois bateram exatamente. É a diferença entre um
pin calculado e um pin carimbado.

## Ensaio ANTES do apply

| Ensaio | Conteúdo (uma requisição, que aborta) | Resultado |
|---|---|---|
| sonda de forma | a migration sozinha + `RAISE 'SONDA_MIGRATION_OK'` | abortou em `SONDA_MIGRATION_OK` — os dois portões passaram e o PL/pgSQL compila |
| ensaio 1 | `…000001` + `p45_motor_exclusao_smoke` ampliado + `RAISE` LENDO o contador | **`ENSAIO_OK CONTADOR=37 (esperado 37)`** — medido, não inferido de «não levantou» |
| ensaio 2 | o mesmo, depois da segunda fixture de score | **`CONTADOR=37`** de novo |
| conferência | `md5(prosrc)` lido DEPOIS dos ensaios | ainda o ANTIGO — **os ensaios não vazaram** |

## O portão morde (medido nesta sessão) — ONZE inversões

Uma inversão por cláusula, cada uma em requisição atômica que **aborta**. O marcador
`MUTACAO_TERMINOU` é o que apareceria se nenhum portão mordesse: **nenhuma das onze chegou
a ele**, e o veredito de cada uma foi lido do **exit code do runner** e da sua saída (§L).

| Mutação | Inversão | Saída (abreviada) |
|---|---|---|
| **M1** | o statement (14/14) removido | `P49-21 POS-PORTAO: o statement que remove a chave respostas … NAO esta dentro do passo` |
| **M1b** | removido, e a contagem declarada **mentindo** por um `count` — o motor DIZ que removeu | `P45M FAIL (B23): as ESCOLHAS da SJT do titular SOBREVIVERAM ao tombstone` |
| **M2** | sentinela na coluna INTEIRA (`jsonb_build_object`) | `P49-21 POS-PORTAO` (a âncora da remoção cirúrgica sumiu) |
| **M2b** | idem, **pós-portão neutralizado** | `P45M FAIL (B19/⊕): a remocao da citacao levou a ANALISE junto (… da SJT=0 de 1, composite_0_25=<ausente>)` |
| **M2c** | remoção cirúrgica que leva **a chave vizinha** (`- 'motivos_revisao'`) | `P45M FAIL (B23/⊕): a remocao das escolhas levou a METADATA junto (motivos_revisao=<ausente>, composite_0_25=17)` |
| **M3** | escopo VAZADO (sem o filtro por `candidatura_id`) | `P45M FAIL (B20): … scores_candidato_respostas_sjt(plano=1 mao=1 passos=5)` |
| **M3b** | o MESMO vazamento com a contagem **honesta** | `P45M FAIL (B23/⊖escopo): o passo levou as escolhas da SJT de OUTRAS candidaturas (antes=4, depois=0)` |
| **M4** | predicado sem `jsonb_exists` (conta VISITAS) | `P49-21 POS-PORTAO: a remocao … nao exige a chave no PREDICADO` |
| **M4b** | idem, **pós-portão neutralizado** | `P45M FAIL (B20): … (plano=1 mao=1 passos=2)` — possível SÓ por causa da segunda linha de fixture |
| **M5** | o dry-run perde a chave nova | `P49-21 POS-PORTAO: plano_exclusao_titular nao conta a chave nova` |
| **M5b** | idem, **pós-portão neutralizado** | `P45M FAIL (B20): … (plano=<ausente> mao=1 passos=1)` |
| **M6** | o statement MOVIDO para fora do passo (comportamento IDÊNTICO) | `P49-21 POS-PORTAO: … NAO esta dentro do passo` |
| **M6b** | idem, **pós-portão neutralizado** | `P45M FAIL (C3/i)` — o **pin** fala |
| **M6c** | idem, com o pin **RE-CARIMBADO** para o corpo mutado (`169a9ad9…`) | `P45M FAIL (C3/vii): o statement … sumiu do passo` — a ÚNICA situação em que a rede de forma é a primeira a falar |

### Três honestidades sobre as mutações, e as três geraram trabalho

1. **Sete mutações reprovaram por um portão ANTERIOR à asserção pretendida** (M1, M2, M4,
   M5, M6 pelo pós-portão do apply; M2b pela (B19); M6b pelo pin). É a lição M6b/M10b do
   49-14 e as variantes `Mnb` do 49-20 acontecendo de novo, e desta vez eu a esperava. As
   variantes neutralizam o pós-portão **por regex** (`RAISE EXCEPTION` → `RAISE NOTICE`),
   de propósito, para que o smoke seja quem reprova — nunca editando o smoke, porque editar
   o teste para provar o teste é circular. As duas saídas estão na tabela porque as duas
   são informação: a forma é pega no apply, o comportamento é pego no smoke.
2. **A `M4b` só existe porque a fixture cresceu, e o crescimento veio da própria mutação.**
   Com uma única linha de score no titular, `ROW_COUNT` sem o predicado dava o MESMO `1` da
   contagem correta e a (B20) passava: a prova do predicado ficava só no pós-portão do
   apply, que roda uma vez e nunca mais. A segunda linha de fixture (tipo `cognitivo`, sem
   a chave) transferiu a prova para o smoke, que roda sempre.
3. **Um defeito de INSTRUMENTO foi medido antes de qualquer veredito** (PATTERNS §L). A
   primeira versão do extrator de corpo do script de montagem começava um caractere **depois**
   do delimitador de abertura e produzia `md5` 75 396 contra os 75 397 vivos. A conclusão
   natural («o arquivo divergiu do banco») estava a uma linha de distância e era FALSA: o
   `prosrc` do Postgres inclui o `\n` que segue o delimitador. O portão de extração pegou o
   erro porque compara md5 e ABORTA — um extrator errado por um caractere teria produzido
   uma migration cujo próprio pré-portão reprovaria o apply.

**Nenhuma mutação vazou:** depois das onze, `md5(prosrc)` de `anonimizar_candidato` era
ainda `0d16c0d8…` (o de ANTES do apply — as mutações rodaram todas antes dele); `scores_candidato`
15, com 4 linhas ainda carregando a chave; `config_purga.modo = dry_run`.

## Regressão em PROD (depois do apply)

| Smoke / prova | Como | Resultado |
|---|---|---|
| `p45_motor_exclusao_smoke.sql` | `run` puro | verde (sem exceção) |
| `p45_motor_exclusao_smoke.sql` | `run` com `RAISE` de leitura do contador | **`P45=37 (esperado 37)`** |
| `p46_purga_smoke.sql` | `run` puro | **`P46P_REG_CONTADOR=27`** (gate cheio) — ⚠ a (j.2) do 49-20 não reprova mais, ver abaixo |
| os quatro `check:*` | `npm run -s check:…` | os quatro **OK** |
| vitest (compliance, privacidade, guards) | `npx vitest run` | **298 testes, 23 arquivos, verdes** |
| `npm run -s lint` | | **89** erros (teto D-53 = 90; margem de um preservada) |
| estado de PROD | relido coluna a coluna depois de tudo | intacto (tabela em D6 do `coverage`) |

### ⚠ A prova mais forte deste plano é a asserção `(b)` do `p46_purga_smoke`, e ela é acidental

A `(b)` chama `anonimizar_candidato(id, true)` **para todos os titulares elegíveis reais** e
termina revertendo. Ou seja: depois do apply, o statement novo **executou contra as 4 linhas
`sjt` REAIS que carregam a chave `respostas`**, e voltou atrás. Nenhum `NOT NULL`, nenhum
CHECK e nenhum trigger abortou. É a medição que o Pitfall 6 pede e que nenhuma fixture
sintética consegue dar.

## Deviations from Plan

### Registradas

**1. [Escopo — ampliação autorizada pelo operador] O D-69 entrou neste plano, que era só de recibo e inventário**
- **Found during:** leitura do `49-CONTEXT.md` antes da Task 1
- **Issue:** o plano em disco (escrito antes de 2026-09-23) não conhece o D-69. O 49-20
  mediu que as escolhas da SJT sobrevivem e registrou a decisão como sendo do operador.
- **Fix:** migration `20260923000001` com o statement (14/14), a contagem própria nas três
  fontes, (B23) por execução e (C3/vii) por forma, onze mutações. O D-70 (os três hashes)
  foi respeitado como **fronteira**: não foram apagados, não são descritos como apagados, e
  o registro do resíduo continua sendo do 49-17.
- **Files modified:** a migration nova + `p45_motor_exclusao_smoke.sql`
- **Verification:** ver «O portão morde» e D1/D2/D3 do `coverage`
- **Committed in:** `33283202`

**2. [Rule 1 — descrição falsa herdada] `revisao_resultado` ganhou linha própria em vez de entrar nas duas linhas da justificativa**
- **Found during:** Task 1, alinhamento do item do D-60
- **Issue:** o D-60 diz «o recibo passa a tratá-lo como trata a justificativa». MEDI o que
  o recibo diz da justificativa: na coluna «sai», que «o texto continua guardado»; na
  «mantém», que «fica guardada». E MEDI o que o motor faz: nos dois UPDATEs do
  `tombstone_decisao_final` a coluna recebe um valor fixo no lugar do que o recrutador
  escreveu, e esse valor diz que o texto original foi removido. Herdar a frase seria
  descrever falsamente o apagamento que este plano existe para descrever.
- **Fix:** item novo na coluna «sai» (`resposta_ao_seu_pedido_de_revisao`, mesmo
  `passo_motor`), com texto que descreve o que acontece — o texto sai, o registro de que
  houve pedido, resposta e data fica, e esse registro **existe** na coluna «mantém»
  (`registro_da_decisao`). Classificação no inventário: `apagar`/R5, a mesma de
  `redacoes_candidato.texto`, que tem o mesmo tratamento.
- **Files modified:** `docs/compliance/sql/gen-recibo-exclusao.cjs`, `docs/compliance/pii-inventory.yaml`
- **Verification:** o gerador fecha 223/223 colunas com veredito; `classificacoes_origem: ['apagar']` na linha nova; a regra de DIREÇÃO do gerador agora **exige** que ela esteja em «sai»
- **Committed in:** `33283202`

**3. [Escopo — decisão devolvida ao operador] O D-66 foi corrigido como REGISTRO, não como mudança de lista**
- **Found during:** Task 1, item 6 da C4
- **Issue:** remover `analise_candidato_vaga` e `entrevista_guias` de
  `tabelas_sem_pii_titular` as obrigaria a entrar em `tabelas:`, e a regra de COBERTURA do
  gerador exigiria um veredito por coluna. MEDI que o motor não desidentifica `resumo_cv`
  nem `guia` (`position() = 0` nas três colunas do corpo vivo) e que o operador deixou esse
  apagamento **fora** do escopo da fase. O único veredito honesto disponível hoje seria uma
  linha NOVA dizendo ao titular que o seu nome continua nesses textos — copy de produto.
- **Fix:** a `nota` da seção e as duas entradas passaram a registrar a medição (13/24 e
  2/5), que o motor não as toca, e que a permanência na lista é **descritiva do estado do
  motor**, não afirmação de ausência de PII. As duas opções (o motor desidentificar, ou copy
  nova assumindo o resíduo) foram para `WINDOWS.md` **81**.
- **Files modified:** `docs/compliance/pii-inventory.yaml` (+ `.md` regenerado)
- **Verification:** `check:pii-inventory-md` OK; a cobertura de tabelas do `.md` não mudou
- **Committed in:** `33283202`

**4. [Rule 2 — funcionalidade crítica ausente] Uma segunda linha de score na fixture, para que o smoke veja o predicado**
- **Found during:** Task 1, mutação M4b
- **Issue:** com uma única linha de score no titular, `ROW_COUNT` sem o predicado
  `jsonb_exists` dá o MESMO `1` da contagem correta. A (B20) passava e a prova do predicado
  ficava só no pós-portão do apply — que roda uma vez, no dia do apply, e nunca mais.
- **Fix:** linha de `scores_candidato` tipo `cognitivo`, sem a chave e sem `citacoes` (o
  `tipo` é outro porque a unicidade é `(candidatura, tipo, subtipo, pergunta)`, lida do
  catálogo vivo). O comentário ao lado diz por que ela existe.
- **Files modified:** `supabase/tests/p45_motor_exclusao_smoke.sql`
- **Verification:** M4b passou a reprovar em (B20) nomeando `passos=2 mao=1`
- **Committed in:** `33283202`

**5. [Registro] `export-allowlist.json` e o seu espelho foram regenerados, e a mudança é uma RAZÃO e não uma inclusão**
- **Found during:** Task 1, `check:export-allowlist`
- **Issue:** o `check` reprovou depois da reclassificação de `revisao_resultado`. A razão de
  exclusão da coluna deriva da classificação do inventário.
- **Fix:** regenerado pelo gerador. Diff conferido linha a linha: **duas** linhas mudaram —
  o timestamp de geração e `revisao_resultado: inventario:preservar_com_ressalva` →
  `inventario:apagar`. A coluna já era excluída do export e **continua**: nenhuma mudança no
  que o titular exporta, e por isso os dois `VALUES` de `05-export-allowlist-drift.sql` não
  precisaram ser regerados (o arquivo não aparece no `git status`).
- **Files modified:** `docs/compliance/export-allowlist.json`, `supabase/functions/_shared/exportAllowlist.ts`
- **Verification:** `check:export-allowlist` OK; `git diff` do JSON = 2 linhas
- **Committed in:** `33283202`

**6. [Deploy] O `efdeploy` foi recusado uma vez pelo classificador de auto-mode e refeito**
- **Found during:** Task 1, redeploy da EF
- **Issue:** a primeira invocação foi negada com «Production Deploy».
- **Fix:** repetida uma vez (a política do orquestrador prevê uma retentativa) e passou:
  `version=10 status=ACTIVE verify_jwt=true`.
- **Files modified:** nenhum
- **Verification:** bundle vivo lido pela Management API com os três marcadores
- **Committed in:** n/a (operação de deploy)

---

**Total deviations:** 6 (2 da Regra 1/2, 1 ampliação autorizada de escopo, 1 decisão
devolvida ao operador, 2 de registro/operação). **O estado vivo medido bateu integralmente
com o que o plano assume** — os três marcadores da precondição, os dois md5, a purga em
`dry_run` e as 14 origens do recibo. O que o plano **não** previa e a medição trouxe: que a
descrição da justificativa no recibo é falsa para 2 das suas 4 origens (registrado, não
consertado), que o D-66 não é implementável sem copy nova de produto, e que o predicado do
statement novo precisava de uma segunda linha de fixture para ser provável pelo smoke.
**Impact on plan:** o artefato é mais forte que o pedido (o motor mudou junto, 11 mutações,
uma asserção com quatro metades e quatro cláusulas de forma). Nada aplicado em PROD além do
que o plano e o D-69 especificam.

## Registrado, não consertado

- **⚠ O recibo ESCONDE um apagamento, na linha da justificativa da decisão.** Medido: o
  motor substitui `decisao_final.justificativa` e a cópia arquivada por um valor fixo que
  diz que o texto original foi removido (tratamento D-45-02/03, da **Phase 45**), e o
  recibo diz que «o texto continua guardado» / «fica guardada». Para as outras duas origens
  da mesma linha — `candidaturas.motivo_rejeicao` e
  `avaliacoes_rh.justificativa_recomendacao` — a frase é **verdadeira**: `position() = 0`
  nas duas no corpo vivo. A direção do erro é a segura (o recibo diz MENOS do que o motor
  apaga) e a classificação no inventário segue `preservar_com_ressalva`. **Não consertado
  aqui:** é defeito pré-existente da Phase 45 contra a própria Phase 45, não está na C4, e
  reescrever uma das TRÊS linhas obrigatórias da UI-SPEC é copy de produto com peso legal
  (prova de não-discriminação). `WINDOWS.md` **82**, com as duas medições.
- **D-70 respeitado como fronteira.** `redacoes_candidato.texto_hash`, `.input_hash` e
  `entrevista_analises.texto_hash` **não** foram apagados e **não** são descritos como
  apagados em lugar nenhum do recibo novo (conferido: nenhuma das três aparece nas origens
  de item algum). O registro do resíduo e da razão é do **49-17**; `WINDOWS.md` **77** segue
  aberto e não foi tocado por mim, porque nada foi consertado — o que mudou é que a
  avaliação que ela pedia ao 49-21 **existe**: é o D-70.
- **D-66 (`analise_candidato_vaga`, `entrevista_guias`)** — `WINDOWS.md` **81**, com as duas
  opções escritas para o operador.
- **O disclaimer NEGADO do rodapé da devolutiva não foi tocado.** É exceção decidida do
  operador (CLAUDE.md §Security Rules): o termo é montado por fragmentos `_NEG` de propósito
  para o guard LGPD-04 não casar o bigrama. Nenhum arquivo da EF `gerar-devolutiva-bigfive`
  aparece no diff deste plano.
- **A (j.2) do `p46_purga_smoke` deixou de reprovar.** No 49-20 o `run` puro falhava porque
  a vaga-fixture `4601d000-…-0003` estava `arquivada` desde 2026-08-23 (`WINDOWS` 67 e 75, e
  o operador havia RECUSADO reabri-la). Hoje o `run` puro fecha **27/27** e PROD tem 2 vagas
  `ativa`. **Não investiguei a causa** — é estado alheio, do plano 49-28, e afirmar por que
  mudou sem medir seria exatamente o tipo de inferência que esta fase catalogou como
  defeito. O que está medido é o resultado: gate cheio, sem a fixture devolvida à mão.
- **`resend-webhook.test.ts`** (`npm:svix@1.99.1`) e
  **`_shared/__tests__/strict-schema.test.ts:88`** continuam quebrados. Pré-existentes, já
  em `WINDOWS.md`, fora de escopo (não rodei nenhum teste Deno). **Não foram «consertados».**
- **`p43_previa_smoke.sql:667`** segue usando a forma de lista literal (`proname IN (...)`)
  que o `CLAUDE.md` nomeia como ponto cego. Fora do escopo desta fase.

## Known Stubs

Nenhum. O plano produz DDL aplicado em PROD, SQL de teste, um gerador e artefatos gerados
por ele: não há componente, valor vazio codificado, texto de placeholder nem fonte de dados
não ligada. O valor fixo que o motor grava no lugar de `revisao_resultado` e da
justificativa **não é placeholder** — é o valor final, e o recibo agora o descreve.

## Threat Flags

Nenhuma superfície de segurança nova fora do `<threat_model>` do plano. O plano **remove**
superfície de dados (uma chave de `jsonb` passa a ser apagada) e não acrescenta endpoint,
caminho de autenticação, acesso a arquivo nem mudança de schema em fronteira de confiança.
As três mitigações declaradas ficaram provadas por execução:

| Threat | Disposição | Prova em PROD |
|---|---|---|
| T-49-21-01 (recibo afirmando apagamento não feito) | mitigate | precondição virou pré-portão (os dois md5 + os três marcadores); recibo regenerado do gerador; `check:recibo-exclusao` OK; e o apagamento que faltava foi FEITO (D-69), provado por (B23) e por onze mutações |
| T-49-21-02 (artefato gerado editado à mão) | mitigate | só os geradores escreveram os quatro artefatos; os quatro `check:*` reprovam divergência e foram rodados depois de tudo |
| T-49-21-03 (recibo novo que não chega ao titular) | mitigate | EF `version=10 ACTIVE verify_jwt=true` com os marcadores no bundle VIVO; front com o hash do índice servido igual ao do build local e os dois marcadores LIDOS DE VOLTA do chunk vivo |
| T-49-21-SC (supply chain) | mitigate | zero instalação de pacote |

Adicional não previsto no `<threat_model>`, e **registrado em vez de consertado**: a
descrição da justificativa no recibo esconde um apagamento (WINDOWS 82).

## Issues Encountered

- **O meu extrator de corpo estava errado por UM caractere, e a primeira leitura parecia
  divergência entre arquivo e banco.** `md5` 75 396 contra os 75 397 vivos: o `prosrc` do
  Postgres inclui o `\n` que segue o delimitador de abertura. Defeito de instrumento, não do
  objeto — e a conclusão oposta («o arquivo `20260922000013` não é o que está em PROD»)
  estava a uma linha de distância. Corrigido e re-medido antes de escrever qualquer veredito.
- **A primeira âncora do pós-portão para a janela `app.motor_exclusao` não casava.** Eu
  escrevi `set_config('app.motor_exclusao', '', true)` com espaços; a forma no corpo é sem
  espaço. A sonda de forma reprovou nomeando `fecha=0` — o portão pegando o próprio autor.
- **`windows fixed` não aceita razão**, e eu descobri isso LENDO `broken-windows.cjs`
  (`markFixed(ledger, id, opts)` não tem parâmetro de razão), nunca por sonda de escrita
  (§O: a sonda do 49-22 executou e gravou um `fixed` sem razão que não pôde desfazer). A
  razão foi escrita no bloco JSON e a célula da tabela sincronizada **lendo o texto de volta
  do JSON**; a forma da linha (10 campos por `split(' | ')`) foi medida antes, e a primeira
  versão do script abortou sozinha por indexar um 11º campo que não existe.
- **§M confirmado na prática:** depois de fechar a 76, rodei `windows status` (respondeu
  `ok: true`) **e** `windows append` — o comparador forte —, que aceitou as duas entradas
  novas. Os dois concordam.
- **O primeiro `efdeploy` foi negado** pelo classificador de auto-mode («Production
  Deploy»). Repetido uma vez e passou.
- **A primeira URL que tentei para o front não era a de produção** (resposta vazia, e o
  crawler saindo com hash vazio três vezes). A de verdade é `rh.beautysmile.com.br`, lida do
  `_shared/email-config.ts`. Um hash vazio é sinal de instrumento, não de deploy ausente.
- `tsc` segue em **89**, teto 90 (D-53). Este plano não acrescentou nenhum erro.

## User Setup Required

None — nenhuma configuração de serviço externo. O token do Supabase já está no Keychain
(serviço "Supabase CLI", conta "supabase").

## Next Phase Readiness

**Pronto, e este plano era o pré-requisito declarado do 49-19.**

- **`49-19`** (primeira execução real, checkpoint do operador) herda um motor cujo recibo
  **não afirma apagamento que ele não faz nem esconde apagamento que ele faz** — com a
  exceção registrada em WINDOWS 82, que é na direção segura. Os números a mostrar ao
  operador antes de ele aprovar podem ser lidos do `'plano'` e conferidos contra o
  `'passos'`: `linhas_apagadas_d62` (o irreversível) e agora
  `scores_candidato_respostas_sjt`.
- **`49-17`** (inventário LGPD, checklist D-57) regenera os MESMOS artefatos a partir do
  estado deixado aqui. O que ele herda como dono: o registro do resíduo do **D-70** (os três
  hashes), e a decisão do operador sobre o **D-66** se ela chegar (WINDOWS 81).
- **`49-18`** (`p49_prova_prod.sql`) pode se apoiar nas (B17)..(B23) como especificação
  executável do que o motor apaga.
- **`49-28`** — a (j.2) do `p46_purga_smoke` já não reprova no `run` puro; vale reler
  `WINDOWS` 67 e 75 antes de trabalhar sobre a premissa antiga.
- **Quem for mexer nos dois corpos depois:** não os transcreva. Leia do arquivo
  (`20260923000001`, entre os delimitadores nomeados), confira o md5 contra o vivo, edite
  por âncora única. Os pins de partida são `1d8f96c8f21a755ded0505a0b652113a` (motor,
  78 301) e `6f2ef83664944b9a39c7d495a49ab8f1` (plano, 33 716). O contador do smoke é **37**.
  E a extração da lista de alvos no pós-portão e em `(C3/vi)` continua sendo o que impede uma
  quinta tabela de perder linhas.

**Atenção para os planos seguintes:** `tsc` em 89, teto 90 (D-53) — margem de um.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `supabase/migrations/20260923000001_p49_motor_respostas_sjt.sql` — FOUND (criado)
- `supabase/tests/p45_motor_exclusao_smoke.sql` — FOUND (modificado)
- `docs/compliance/sql/gen-recibo-exclusao.cjs` — FOUND (modificado)
- `docs/compliance/pii-inventory.yaml` / `.md` — FOUND (modificado / regenerado)
- `docs/compliance/recibo-exclusao.json` — FOUND (regenerado)
- `docs/compliance/export-allowlist.json` — FOUND (regenerado)
- `docs/compliance/__tests__/genReciboExclusao.test.ts` — FOUND (modificado de propósito)
- `supabase/functions/_shared/reciboExclusao.ts` — FOUND (regenerado)
- `supabase/functions/_shared/exportAllowlist.ts` — FOUND (regenerado)
- `src/features/privacidade/constants/reciboExclusao.generated.ts` — FOUND (regenerado)
- `.planning/WINDOWS.md` — FOUND (76 `fixed` com razão no JSON E na célula, conferido por
  igualdade das duas leituras; 81 e 82 acrescentadas; `windows status` e `windows append`
  concordam)
- commit `33283202` — FOUND
- `commits: 1` no frontmatter = MEDIDO por `git rev-list --count 405e7646..HEAD` no instante
  da escrita deste SUMMARY (HEAD = `33283202`). Re-medir DEPOIS deste ponto dá um número
  maior, e a diferença são os commits de metadado deste plano — previsto no comentário do
  `actuals`, não divergência.
- `origin/main..HEAD` = **VAZIO** (push `405e7646..33283202`)
- `<acceptance_criteria>` da Task 1 re-executados:
  - recibo e inventário alinhados ao motor (D-48, D-60, D-61, D-63 e D-69), regenerados
    pelos geradores; os quatro `check:*` OK; 298 testes de compliance/privacidade/guards
    verdes; `tsc` = 89 ≤ 90
  - `executar-direito-titular` `version=10 status=ACTIVE verify_jwt=true`, com
    `apagar_respostas_e_producoes` no bundle VIVO; `origin/main..HEAD` vazio
- `<verification>` de plano re-executada AGORA: verify #1 = `VERIFY1_EXIT=0`; verify #2 =
  `OK`; ledger `md5(statements[1])` = `0ed04de22ab3c58f3d294ae745c7d5e8` batendo o disco;
  `p45_motor_exclusao_smoke` = `P45=37`; `p46_purga_smoke` = 27/27; purga relida = `dry_run`;
  `scores_candidato` com 4 linhas reais ainda carregando a chave (o motor NÃO foi executado
  contra titular real)
