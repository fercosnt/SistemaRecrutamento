---
phase: 49-consertos-da-jornada-bloco-2
plan: 04
subsystem: frontend-rh
tags: [jorn-13, jorn-38, jorn-40, scorecard, estado-tipado, lgpd, projecao-explicita, cognitivo-banda, tdd, ux-07]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "as 16 colunas nullable de procedência vivas em PROD — o card tem colunas a ler (não consumidas por este plano, que lê `scores_candidato`/`redacoes_candidato`/`scores_raven`)"
  - phase: 23
    plan: "04"
    provides: "`cognitivoBanda` privada no `ScoreCard.tsx:23-27` e os limites 70/40 — a função que este plano EXTRAIU sem alterar"
provides:
  - "`src/lib/cognitivo/cognitivoBanda.ts` — o vocabulário ÚNICO da faixa cognitiva nas telas do RH (`CognitivoBanda`, `cognitivoBanda`), consumido pelo card da lista (via `estadoInteligencia`) e pelo bloco do hub"
  - "`EstadoCultura`/`estadoCultura`, `EstadoBigFive`/`estadoBigFive`, `EstadoInteligencia`/`estadoInteligencia` em `vagasTypes.ts` — estados TIPADOS que substituem os três helpers que devolviam nota para fonte vazia"
  - "`CANDIDATO_ALLOWLIST`, `VAGA_ALLOWLIST`, `EMBEDS_NOTAS_CARD`, `SELECT_LISTA_RH` — as projeções das listas do RH como constantes auditáveis (molde do `SCORES_ALLOWLIST`)"
  - "marcadores `scorecard-cultura-estado`, `scorecard-bigfive-estado`, `scorecard-inteligencia-estado`, `cognitivo-banda-rh` — vivos em PROD"
affects: [49-18]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 14396
  tasks: 3
  commits: 5
  plan_head_before: 9b8353f694776876bf8251db4684cf131a415d8e
  # `commits: 5` MEDIDO por `git rev-list --count 9b8353f6..HEAD` no instante da escrita
  # deste SUMMARY (831f3d3e, 23ed86e1, bfd9ac38, 22e4ea3b, 4939b667) — todos de PRODUÇÃO
  # e todos já em `origin/main`. Re-medir DEPOIS do commit de metadado dá 6, por construção.
  # `tokens: 14396` = 57 583 octetos de `git diff 9b8353f6..HEAD -- src` ÷ 4.
  estimate_tokens_do_plano: 95000
  # O plano estimou 95 000 e o realizado foi 14 396 — 6,6× ABAIXO, registrado sem arredondar.
  # A razão é a mesma do 49-03 e vale registrar duas vezes porque o padrão está se repetindo:
  # o peso deste plano esteve em LEITURA e em MEDIÇÃO, nada do que aparece no diff. Ler quem
  # consome `candidato`/`vaga` antes de cortar coluna (6 telas), medir 7 tabelas em PROD para
  # saber quais estão vazias, e conferir cardinalidade de embed no catálogo custou mais que
  # escrever os três helpers. `confidence: low` era honesto.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ESTADO TIPADO em vez de valor-sentinela: `{estado:'nota';valor} | {estado:'aguardando_revisao'} | {estado:'nao_fez'}` obriga a tela a TRATAR a ausência, onde `0` (ou `null` + `??`) deixava a ausência parecer dado"
    - "projeção de embed como constante nomeada no topo do serviço (molde `SCORES_ALLOWLIST`), com o docblock dizendo QUEM exibe cada coluna — a auditoria de payload não exige ler a query"
    - "o número que não deve ser exibido não entra no componente: `estadoInteligencia` resolve a faixa ANTES do `ScoreCard`, então não há percentil no escopo da tela para exibir por descuido"
    - "teste que reprova pela FORMA da string de `.select` (curinga, `cpf`, embed morto) — o mesmo idioma do Wave-0 de `scoresRhService`, e o que pega o retorno do curinga sem depender de fixture"
    - "asserção negativa por limite de palavra (`\\b12\\b`) quando um dígito legítimo convive na mesma tela: «nenhum dígito no bloco» reprovaria o campo Tempo, que é correto"

key-files:
  created:
    - src/lib/cognitivo/cognitivoBanda.ts
    - src/lib/cognitivo/__tests__/cognitivoBanda.test.ts
    - src/features/vagas/types/__tests__/estadosAvaliacao.test.ts
    - src/features/avaliacao-cognitiva/components/__tests__/LiberacaoCognitivoBlock.test.tsx
  modified:
    - src/features/vagas/services/candidaturasService.ts
    - src/features/vagas/services/__tests__/candidaturasService.test.ts
    - src/features/vagas/types/vagasTypes.ts
    - src/components/ScoreCard.tsx
    - src/components/__tests__/ScoreCard.test.tsx
    - src/components/pages/CandidatosRHPage.tsx
    - src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx

key-decisions:
  - "A célula do card recebe ESTADO, não `number | null`. `null` + `?? 'N/A'` já existia e falhou: o defeito não era o operador, era o helper devolver `0`, que não é nullish. Estado tipado torna «não fez» um caso que o compilador obriga a tratar — a mesma classe de valor não pode voltar a passar por nota."
  - "`estadoInteligencia` mora em `vagasTypes.ts` e resolve a faixa ANTES do `ScoreCard` — então o `ScoreCard` não chama `cognitivoBanda` diretamente, ao contrário da letra do `key_links` do plano. Motivo: com a faixa já resolvida, o percentil não existe no escopo do componente, e exibi-lo por descuido deixa de ser possível. A função continua sendo UMA (D-64): `vagasTypes` e o hub importam a mesma."
  - "Os limites 70/40 do `cognitivoBanda` NÃO foram tocados. A extração é um MOVE; mudar limite no mesmo passo em que se muda o lugar torna impossível dizer qual das duas coisas explicou uma diferença na tela. Ficam PROVISÓRIOS, com a norma real diferida ao M5, e o teste trava as duas fronteiras."
  - "A célula DISC foi REMOVIDA, não reaproveitada. Ela pintava `text-green-400` FIXO — verde, sempre, para um dado que nunca chegou (0 linhas em PROD, instrumento inexistente no produto). Uma célula que mostra a melhor cor para ausência é a mesma forma do defeito, invertida."
  - "`listCandidaturasByVaga` passou a usar o MESMO `SELECT_LISTA_RH` da lista geral, e não uma projeção própria. A aba «Por Vaga» renderiza o MESMO `CandidatoCard`: duas projeções para um componente é o berço do «funciona numa aba e não na outra» — e era o estado de hoje, com a aba sem embed de nota nenhum e sem o título da vaga."
  - "O `updateCandidaturaStatus` ficou com `select('id, etapa_atual, status')` — `status` entra por diagnóstico, não por uso. O corpo lê só `etapa_atual`; cortar até o mínimo absoluto tornaria qualquer log futuro mais pobre sem reduzir exposição (as duas colunas são da própria `candidaturas`, que o RH já vê inteira)."
  - "Evidência de RED registrada à mão: `gsd-tools check tdd-red-evidence` NÃO consegue classificar um run vitest (ver Findings). Nenhuma linha de contador foi sintetizada para fazê-lo devolver OK."

requirements-completed: []
# ⚠ Os 3 IDs do plano (JORN-13, JORN-38, JORN-40) ficaram BLOQUEADOS pelo portão de ID
# compartilhado (#2388): o `49-18-PLAN.md` declara os mesmos três e ainda não tem SUMMARY.
# `requirements.ready-ids` devolveu `ready: []`, `blocked: [JORN-13, JORN-38, JORN-40]`, e
# nada foi marcado. Isso é o portão funcionando: marcar agora diria «Complete» com metade
# do trabalho dos IDs ainda em aberto. Eles fecham quando o 49-18 fechar.

# Coverage (#1602)
coverage:
  - deliverable: "A célula Cultura mostra só a nota revisada por humano; ausência vira «não fez»/«aguardando revisão», nunca 0"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/features/vagas/types/__tests__/estadosAvaliacao.test.ts#estadoCultura — tabela-verdade de 8 casos (nota 72, aguardando revisão, pendente_humano, nada, undefined, só big_five, sjt)"
        status: pass
      - kind: test
        ref: "src/components/__tests__/ScoreCard.test.tsx#célula Cultura: ausência NUNCA vira 0 — 4 casos, sem dígito e sem classe de cor de nota"
        status: pass
      - kind: command
        ref: "node p46apply.cjs sql \"SET TRANSACTION READ ONLY; select pg_get_functiondef('public.sincronizar_score_redacao(uuid)'…)\" — grava tipo='redacao', status='sucesso', score_max=100"
        status: pass
  - deliverable: "Big Five sem número nem cor de nota; DISC fora do card; Inteligência pela faixa"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/components/__tests__/ScoreCard.test.tsx#Big Five sem número, e DISC fora do card — «concluído»/«não fez», queryByText('DISC') null"
        status: pass
      - kind: test
        ref: "src/components/__tests__/ScoreCard.test.tsx#UX-07 cognitivo banda — 4 casos, nenhum dígito na célula"
        status: pass
      - kind: test
        ref: "src/lib/cognitivo/__tests__/cognitivoBanda.test.ts — tabela-verdade de 10 casos + as duas fronteiras (70|69, 40|39) + nenhuma saída com dígito"
        status: pass
  - deliverable: "Os três selects do `candidaturasService` sem curinga de candidatos, sem cpf, sem data_nascimento, sem embed morto (JORN-38)"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/features/vagas/services/__tests__/candidaturasService.test.ts#listAllCandidaturas — projeção explícita e fonte canônica"
        status: pass
      - kind: test
        ref: "src/features/vagas/services/__tests__/candidaturasService.test.ts#listCandidaturasByVaga — sem cpf/data_nascimento, com os embeds de notas"
        status: pass
      - kind: test
        ref: "src/features/vagas/services/__tests__/candidaturasService.test.ts#updateCandidaturaStatus — o pré-fetch não puxa o cadastro do candidato"
        status: pass
      - kind: command
        ref: "node -e '… candidatos(*) | cpf | data_nascimento | scores_bigfive|scores_disc no código sem comentários' → OK selects"
        status: pass
  - deliverable: "O hub deixa de mostrar percentil e «Acertos X de 60»; mostra a MESMA faixa do card (JORN-40 / D-64)"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/features/avaliacao-cognitiva/components/__tests__/LiberacaoCognitivoBlock.test.tsx — faixa presente; \\b12\\b, \\b8\\b, «de 60», «Percentil», «Inferior» ausentes; «15min 00s» presente"
        status: pass
      - kind: test
        ref: "src/features/avaliacao-cognitiva/components/__tests__/LiberacaoCognitivoBlock.test.tsx — percentil NULO não vira faixa"
        status: pass
      - kind: test
        ref: "src/__tests__/guards/forbidden-strings.grep.test.ts (LGPD-04 / D-58) verde no mesmo run"
        status: pass
  - deliverable: "A aba «Por Vaga» lê a mesma fonte de notas da lista geral"
    human_judgment: false
    verification:
      - kind: test
        ref: "src/features/vagas/services/__tests__/candidaturasService.test.ts#listCandidaturasByVaga — scores_candidato + redacoes_candidato + scores_raven + vaga:vagas no select"
        status: pass
      - kind: command
        ref: "grep: as duas abas renderizam o MESMO `CandidatoCard` (CandidatosRHPage:927 e :930) — uma projeção, um componente"
        status: pass
  - deliverable: "Publicado: os marcadores estão no build, no chunk certo, e no ar"
    human_judgment: false
    verification:
      - kind: command
        ref: "npm run build → exit 0; grep -rl scorecard-cultura-estado build/assets/ → CandidatosRHPage-BWyp-uxg.js; cognitivo-banda-rh → PerfilCandidatoRHPage-C15ZGuE9.js"
        status: pass
      - kind: command
        ref: "git push origin main; git log --oneline origin/main..HEAD → vazio"
        status: pass
      - kind: command
        ref: "crawler em https://rh.beautysmile.com.br → PRESENTE em PROD: scorecard-cultura-estado · PRESENTE em PROD: cognitivo-banda-rh"
        status: pass
  - deliverable: "O que o RH lê na tela corresponde ao que existe no banco (juízo de adequação da leitura)"
    human_judgment: true
    rationale: "Os testes provam que nenhum número inventado alcança o DOM e que os marcadores estão no ar. Se «aguardando revisão» e «não fez» são as palavras certas para o RH — e se ele entende a diferença entre elas sem treinamento — é juízo de UX sobre texto em pt-BR, que nenhuma asserção decide. O card não foi aberto por pessoa nesta sessão."

# Metrics
duration: 22 min
completed: 2026-09-22
tasks: 3
files: 11
---

# Phase 49 Plano 04: O card do RH e o bloco cognitivo do hub mostram o que existe Summary

As quatro células do card da lista do RH viraram três, e cada uma passou a dizer a verdade: Big Five
diz se a pessoa fez, Cultura mostra só a nota que um humano revisou, Inteligência mostra faixa — e
nenhuma das três transforma ausência em `0`. No mesmo passo, as listas pararam de levar o cadastro
inteiro do candidato ao navegador, e o bloco cognitivo do hub deixou de exibir percentil e acertos
crus.

## O que estava errado — medido, não inferido

Re-medido em PROD em 2026-09-22 (só leitura, via `p46apply.cjs sql` com `SET TRANSACTION READ ONLY`):

| Fonte que o card lia | Linhas em PROD |
|---|---|
| `scores_bigfive` | **0** |
| `scores_disc` | **0** (o instrumento não existe no produto) |
| `candidaturas.analise_ia_cultura` não-nulo | **0 de 39** |
| `candidaturas.score_geral` não-nulo | **0 de 39** |
| `scores_raven` | 1 |
| `redacoes_candidato` | 2 |

E a fonte que ele **não** lia:

| `scores_candidato` | `tipo` / `status` | linhas | com `score` |
|---|---|---|---|
| | `big_five` / `sucesso` | 5 | **0** ← NULL por desenho |
| | `redacao` / `sucesso` | 2 | 2 |
| | `sjt` / `sucesso` | 1 | 1 |
| | `sjt` / `pendente_humano` | 1 | 1 |
| | `entrevista` / `sucesso` | 1 | 1 |
| | `entrevista` / `pendente_humano` | 2 | 0 |

Três células liam tabelas vazias, os helpers convertiam o vazio em `0`, e o `?? 'N/A'` do card **nunca
disparava** — porque `0` não é nullish. O resultado na tela do RH eram 38 cards com zero vermelho,
indistinguível de uma nota real de zero. A quarta célula, DISC, pintava `text-green-400` **fixo**:
verde, sempre, para um dado que nunca chegou — a mesma forma do defeito, invertida.

O mesmo select trazia `candidato:candidatos(*)`: CPF e data de nascimento no payload de qualquer
recrutador logado (JORN-38). A RLS filtra **linhas**, não **colunas** — nenhuma política impedia.

E o hub mostrava «Percentil 12» e «Acertos 8 de 60» (JORN-40), na mesma sessão em que o card mostrava
faixa: duas telas, dois vocabulários, e o do hub contradizia a regra.

## Passo 1 (D-50) — delta da varredura C8

Re-rodado o padrão da C8 do `49-VARREDURA-KICKOFF.md`. **Os quatro defeitos saíram; nada novo entrou.**

| # da C8 | Onde | Estado agora |
|---|---|---|
| 1 | `vagasTypes.ts:696` `calculateBigFiveAverage` → `0` | **removido** (o arquivo não tem mais nenhum `return 0`) |
| 2 | `vagasTypes.ts:722-724` `getCultureScore` → `0` | **removido** |
| 3 | `CandidatosRHPage.tsx:352-355` lia as 3 fontes mortas | **consertado** — lê `scores_candidato`/`redacoes_candidato`/`scores_raven` |
| 4 | `ScoreCard.tsx:84-138` `getScoreColor(bigFive)` | **consertado** — Big Five em cor neutra, sem número |
| 5 | `LiberacaoCognitivoBlock.tsx:94-109` «Percentil N» **e** «Acertos X de 60» | **consertado** (Task 3) |
| 6 | `revisaoRedacaoService.ts:107-108`, `RedacaoSidebar.tsx:61` `classificacao_cor ?? 'verde'` | **intacto** — forma INVERSA, fora dos IDs, registrado abaixo |
| 7 | `calcular_score_geral(uuid)` `COALESCE(score_x,0)*peso` | **intacto** — código morto, sem chamador vivo |
| 8 | `CandidatosRHPage.tsx:900` `funilEtapas[...] \|\| 0` | **intacto** — escopo deliberado |

Classificação das 22 ocorrências restantes: **20 são contagem** (`progress.tsx:25`,
`VagasRHPage:196-198`, `DashboardRHPage:92-95,296`, `VagasPublicasPage:166`,
`VagaCandidatosRHPage:95`, `triagemService:232`, `RelatoriosRHPage:106-111`,
`CandidatosRHPage:902`, `HubCandidatoRH:387,390`) — para contagem, ausência **é** zero, e o zero é
verdade. As **2 restantes** são a forma inversa do #6 (`RedacaoSidebar:61` e
`revisaoRedacaoService:107-108`): ausência de cor virando `'verde'` na ordenação da fila de revisão,
o que **promove** o caso não classificado para o topo da lista de «tudo bem». Fora dos IDs deste
plano, não tocado (Scope Boundary), e nomeado aqui porque é a mesma classe com o sinal trocado.

## Accomplishments

1. **A célula Cultura passou a distinguir três coisas que antes eram uma** (`estadoCultura`):
   nota revisada por humano (`scores_candidato` `tipo='redacao'`/`status='sucesso'`, conferida ao
   vivo por `pg_get_functiondef` de `sincronizar_score_redacao`), «aguardando revisão» (inclui
   `pendente_humano`, o estado em que a nota que existe é a **da IA** — e ela não vai à tela, D-32),
   e «não fez». Tabela-verdade de 8 casos.

2. **Big Five diz «concluído»/«não fez», pela EXISTÊNCIA da linha** — porque o `score` dela é NULL
   por desenho (5 linhas, 0 com score, medido). Qualquer número nessa célula seria inventado
   (UX-07/RNF-07a, D-31).

3. **`cognitivoBanda` deixou de ser privada do `ScoreCard` e passou a ser UMA** para as duas telas
   (`src/lib/cognitivo/cognitivoBanda.ts`, D-64), com limites 70/40 **inalterados** e tabela-verdade
   de 10 casos + as duas fronteiras. A extração é um MOVE.

4. **A célula DISC foi removida** e o card ficou com três células verdadeiras.

5. **Os três selects ficaram com projeção explícita** (`CANDIDATO_ALLOWLIST`, `VAGA_ALLOWLIST`,
   `EMBEDS_NOTAS_CARD`, `SELECT_LISTA_RH`), no molde do `SCORES_ALLOWLIST`. `cpf` e
   `data_nascimento` saíram; o pré-fetch de `updateCandidaturaStatus` foi de
   `*, candidatos(*), vagas(*)` para `id, etapa_atual, status` (o corpo lê **uma** coluna).

6. **A aba «Por Vaga» passou a ler a MESMA fonte** — e ganhou o que nunca teve: antes deste plano
   ela não embutia nota nenhuma **nem o título da vaga**, então o `vaga?.titulo` do card caía em
   «Vaga não disponível» naquela aba. Defeito adjacente, corrigido pela mesma mudança.

7. **O hub mostra «Faixa» em badge neutro** (`cognitivo-banda-rh`), sem percentil, sem «de 60», e sem
   a `classificacao` por extenso do instrumento — que é a escala do teste, não a leitura de aderência
   à vaga. O «Tempo» ficou: minutos decorridos não são nota.

8. **Publicado e provado no ar**: build verde, os marcadores nos chunks lazy corretos,
   `origin/main..HEAD` vazio, e os dois marcadores lidos de volta de `https://rh.beautysmile.com.br`.

## Verification results

| Verify | Resultado |
|---|---|
| `npx vitest run …/ScoreCard.test.tsx …/candidaturasService.test.ts` (T1) | **19 passed** |
| `npx vitest run src/lib/cognitivo src/components src/features/vagas src/lib/candidatura` (T2) | **271 passed** (33 arquivos) |
| forma dos 3 selects (`node -e` sobre o código sem comentários) | **OK selects** |
| `npx vitest run src/features/avaliacao-cognitiva src/__tests__/guards` (T3) | **99 passed** (12 arquivos) |
| `npm run -s lint` (tsc --noEmit) | **exit 2, 90 `error TS`** — teto do plano é 90, e a contagem **não subiu** |
| conjunto de erros `tsc` × baseline (ignorando linha/coluna) | **IDÊNTICO — zero erro novo, zero removido** |
| `npm run build` | **exit 0**, `assert-chunks PASSED`, 47 chunks |
| `grep -rl scorecard-cultura-estado build/assets/` | `CandidatosRHPage-BWyp-uxg.js` |
| `grep -rl scorecard-bigfive-estado build/assets/` | `CandidatosRHPage-BWyp-uxg.js` |
| `grep -rl cognitivo-banda-rh build/assets/` | `PerfilCandidatoRHPage-C15ZGuE9.js` |
| `git push origin main` → `git log --oneline origin/main..HEAD` | **vazio** |
| crawler em PROD (`scorecard-cultura-estado`) | **PRESENTE** (ausente na 1ª tentativa, presente na 2ª — o build da Vercel leva ~30 s) |
| crawler em PROD (`cognitivo-banda-rh`) | **PRESENTE** |

**Regressão, além do pedido pelo plano:** a suíte vitest inteira — **208 arquivos / 2101 testes, 0
falhas** — porque `vagasTypes.ts` é importado por telas que este plano não abriu (`KanbanBoard`,
`VagaCandidatosRHPage`, `ComparativoCandidatosPage`) e a remoção de três exports não apareceria no
subconjunto.

⚠ **O `tsc` deste repo está em 90 e o teto do plano era 90 — margem zero.** A contagem foi medida
ANTES de qualquer edição (baseline 90) e depois de cada tarefa, e o conjunto de mensagens foi
**diferenciado**, não só contado: uma compensação (um erro novo entrando enquanto um pré-existente
sai) manteria o número e passaria o portão. O único delta em todo o plano foi o **número de linha**
de um `TS6133` pré-existente no `ScoreCard.tsx`, deslocado pelo import novo.

## TDD Gate Compliance

`workflow.tdd_mode` é **false**, então o gate não bloqueia. A disciplina foi seguida e os commits
estão na ordem, nas duas tarefas `tdd="true"`:

| Tarefa | Gate | Commit | Estado |
|---|---|---|---|
| Task 2 | RED | `23ed86e1` `test(49-04): …` | ✓ 9 alvo reprovam (23 descobertos, 14 passam) |
| Task 2 | GREEN | `bfd9ac38` `feat(49-04): …` | ✓ 271/271 |
| Task 2 | REFACTOR | — | não houve: a extração do `cognitivoBanda` JÁ é a limpeza, e ela foi parte do GREEN |
| Task 3 | RED | `22e4ea3b` `test(49-04): …` | ✓ 1 alvo reprova (21 descobertos, 20 passam) |
| Task 3 | GREEN | `4939b667` `feat(49-04): …` | ✓ 99/99 e a suíte inteira 2101/2101 |
| Task 3 | REFACTOR | — | não houve: a troca são ~15 linhas de JSX |

**RED da Task 2 medido:** 23 testes descobertos, 14 passam, **9 reprovam** — e os 9 são exatamente os
alvo. Quatro por `TestingLibraryElementError: Unable to find an element by:
[data-testid="scorecard-inteligencia-estado"]`, dois por `scorecard-bigfive-estado`, um por
`AssertionError: expected <div …(1)></div> to be null` (a célula DISC ainda lá), e dois por
`AssertionError` sobre a string do select (`not to match /\bcpf\b/`, `not to match /candidatos/`).
Nenhuma falha de carregamento de módulo: **não é INVALID_RED (#3770)**.

**RED da Task 3 medido:** 21 descobertos, 20 passam, **1 reprova** — o alvo, por consulta ao DOM.

⚠ **Os 2 outros casos do `<behavior>` da Task 3 já passavam no RED, por construção** (o bloco sem
resultado, e o percentil nulo): eles não descrevem comportamento novo, descrevem o que a mudança
**não pode** quebrar. Registrado para não parecer que 3 asserções novas ficaram verdes de graça — a
mesma nota que o 49-03 precisou fazer, pela mesma razão.

⚠ **As tabelas-verdade de `cognitivoBanda`, `estadoBigFive` e `estadoInteligencia` não têm RED
próprio, e a razão é do instrumento.** O RED de um módulo que ainda não existe é um erro de
`ERR_MODULE_NOT_FOUND` — que o próprio #3770 classifica como `fixture_or_load_failure`, isto é,
**INVALID_RED**. Elas entraram no commit GREEN. O RED que foi medido é o de COMPORTAMENTO (o que o RH
lê na tela), que é sobre o que os requisitos falam.

## Findings

**1. `gsd-tools check tdd-red-evidence` não consegue classificar um run vitest — e nenhuma evidência
foi sintetizada para contornar isso.**

O checker chama `parseNodeTestSummary`, que casa exatamente `/^# tests (\d+)/m`, `/^# pass (\d+)/m` e
`/^# fail (\d+)/m` — os contadores do `node:test`. Vitest **tem** reporter TAP (`--reporter=tap`), e
ele emite `TAP version 13`, `1..N` e `not ok N - <nome>` **sem** essas linhas `#` (medido: `grep -cE
'^# (tests|pass|fail) '` = **0**). Resultado: `INVALID_RED (zero_tests_discovered)` sobre um run que
descobriu **23** testes e reprovou **9** por asserção.

Há um segundo problema no mesmo caminho, e ele é pior que o primeiro: `tapFailedTestNames` extraiu
**`src/components/__tests__/ScoreCard.test.tsx`** como nome do teste que falhou — porque o TAP do
vitest aninha as suítes sob um `not ok` de nível de **arquivo**. Isso cai exatamente no ramo
`fixture_or_load_failure`, que existe para pegar um crash de carregamento. Sobre um run em que nove
asserções reais reprovaram, o checker teria dois motivos diferentes para dar o veredito errado.

Escrever aquelas três linhas `#` à mão dentro do campo `output` faria o checker devolver
`RED_EVIDENCE_OK` — e **seria forjar o artefato que o checker existe para ler**, transformando uma
verificação de máquina num auto-relato fantasiado de verificação. Não foi feito. Os runs TAP crus
estão guardados, e o veredito honesto é: **o gate é inaplicável neste runtime**, não «aprovado».

⚠ Este é o **segundo** runtime deste repositório em que o checker não morde — o 49-03 registrou o
mesmo para Deno. Os dois únicos runners do projeto estão fora do alcance dele. Um portão que não
consegue ler nenhum dos dois runners do repositório que ele vigia não está «às vezes indisponível»:
ele está estruturalmente inaplicável aqui, e vale mais registrar isso uma vez do que repetir a nota
em cada plano.

**2. A baseline congelada do pre-commit e um commit RED honesto são incompatíveis por construção — e
o conserto não é `--no-verify`.**

O `pre-commit` deste repo reprova qualquer commit que suba `tsc` acima de 96. Um RED honesto, por
definição, escreve testes contra uma API que ainda não existe — e no caso da Task 2 a API mudava de
FORMA (`bigFive?: number` → `EstadoBigFive`), o que são **7 `TS2322`** no arquivo de teste. O commit
RED foi **bloqueado** pelo hook, com `tsc errors: 97 (frozen baseline: 96)`.

O caminho fácil era `--no-verify`, que o CLAUDE.md e o prompt proíbem. O caminho tomado foi um helper
de **uma linha**, nomeado `red()`, com docblock dizendo que é andaime e que sai no GREEN — e ele saiu
no GREEN (`bfd9ac38`), devolvendo a checagem de tipo ao teste, que é metade do valor dele.
⚠ A primeira tentativa (`p as never`) **também** reprovou, com 7 `TS2698` («Spread types may only be
created from object types») — trocar um erro de tipo por outro não é conserto; a segunda versão
(`: any` de retorno, com `eslint-disable` explícito na linha) foi a que funcionou.

**3. A aba «Por Vaga» tinha um segundo defeito que o plano não nomeia, e a leitura do consumidor foi o
que o revelou.** O `read_first` mandava conferir quais colunas cada tela consome **antes** de cortar.
Ao fazer isso apareceu que `listCandidaturasByVaga` **não embutia `vaga` nenhuma** — e o
`CandidatoCard`, que é o mesmo componente das duas abas, lê `vaga?.titulo`. Naquela aba, o título
caía em «Vaga não disponível» para todo mundo. Corrigido pela mesma mudança que unificou a fonte.
A lição é sobre o método: o `read_first` foi escrito para evitar cortar coluna que alguém lê, e
achou o contrário — coluna que alguém lê e que nunca foi enviada.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] A aba «Por Vaga» não embutia `vaga`, e o card dela mostrava «Vaga não disponível»**

- **Found during:** Task 2 (`read_first`: conferir consumidores antes de cortar colunas)
- **Issue:** `listCandidaturasByVaga` selecionava apenas `*` + `candidato:candidatos(...)`. O
  `CandidatoCard` — o MESMO componente da lista geral — renderiza `vaga?.titulo`, que caía no
  fallback em 100% dos cards daquela aba.
- **Fix:** a aba passou a usar o mesmo `SELECT_LISTA_RH` da lista geral, que inclui
  `vaga:vagas(id, titulo)`. Uma projeção, um componente.
- **Files modified:** `src/features/vagas/services/candidaturasService.ts`
- **Verification:** teste novo assertando `vaga:vagas` no select (`candidaturasService.test.ts`).
- **Commit:** `bfd9ac38`

**2. [Rule 2 - Missing critical] A tabela-verdade de `estadoCultura` não tinha arquivo de teste previsto, e ela é o coração do `<behavior>`**

- **Found during:** Task 1
- **Issue:** o `<action>` mandava pôr os testes do `<behavior>` em `ScoreCard.test.tsx` e
  `candidaturasService.test.ts`. Mas o primeiro item do `<behavior>` descreve `estadoCultura(...)`
  como UNIDADE (4 casos), e nenhum dos dois arquivos é a casa de um helper puro de `vagasTypes.ts` —
  pôr ali acoplaria a tabela-verdade a um render ou a um mock de PostgREST.
- **Fix:** criado `src/features/vagas/types/__tests__/estadosAvaliacao.test.ts` (8 casos, `it.each`,
  forma herdada de `candidaturaEncerrada.test.ts`). Conferido antes que o include do vitest
  (`**/__tests__/**`) cobre o diretório novo — ele cobre.
- **Files modified:** `src/features/vagas/types/__tests__/estadosAvaliacao.test.ts` (novo)
- **Verification:** 9 testes verdes no arquivo; `npx vitest run src/features/vagas` verde.
- **Commit:** `831f3d3e`

**3. [Rule 3 - Blocker] O commit RED foi bloqueado pelo pre-commit, e a primeira tentativa de conserto trocou um erro de tipo por outro**

- **Found during:** Task 2, fase RED
- **Issue:** ver Finding 2. `tsc errors: 97 (frozen baseline: 96)` → hook reprovou. `p as never`
  reprovou de novo, com 7 `TS2698`.
- **Fix:** helper `red()` com retorno `any` e `eslint-disable` na linha, docblock declarando que é
  andaime; removido no GREEN.
- **Files modified:** `src/components/__tests__/ScoreCard.test.tsx`
- **Verification:** RED commitado com `tsc errors: 90`; GREEN commitado com `tsc errors: 90` e o
  andaime ausente (`grep -c "red("` = 0).
- **Commit:** `23ed86e1` (entra) / `bfd9ac38` (sai)

### Desvio deliberado da LETRA do plano, registrado

**`ScoreCard.tsx` não chama `cognitivoBanda` diretamente** — o `key_links` do plano dizia
`cognitivoBanda.ts → ScoreCard.tsx e LiberacaoCognitivoBlock.tsx`, `via: import da mesma função`. Na
implementação, `estadoInteligencia` (em `vagasTypes.ts`) resolve a faixa e o `ScoreCard` recebe
`{estado:'faixa', faixa}` pronto. O invariante que o link protege — **uma** função para as duas telas
(D-64) — está satisfeito: `vagasTypes.ts` e o hub importam a MESMA. O que muda é melhor que a letra:
com a faixa já resolvida, **o percentil não existe no escopo do componente**, e exibi-lo por descuido
deixa de ser possível — em vez de ser possível e proibido por teste.

**Total deviations:** 3 auto-corrigidas (2 × Rule 2, 1 × Rule 3) + 1 desvio deliberado de letra.
**Impact:** nenhum negativo; as duas Rule 2 **acrescentam** correção (um defeito adjacente e uma
tabela-verdade que o plano pedia sem dar endereço).

## Fora de escopo, registrado e NÃO tocado

- **C8 #6 — a forma INVERSA** (`revisaoRedacaoService.ts:107-108`, `RedacaoSidebar.tsx:61`):
  `classificacao_cor ?? 'verde'` faz ausência virar a **melhor** cor na ordenação da fila de revisão,
  promovendo o caso não classificado para o topo de «tudo bem». Fora dos IDs deste plano.
- **C8 #7** — `calcular_score_geral(uuid)` com `COALESCE(score_x, 0) * peso`: código morto, sem
  chamador vivo. Não tocado.
- **`getScoreColor` em `vagasTypes.ts:821` está sem chamador** e já estava antes deste plano (o
  `KanbanBoard.tsx:137` tem uma cópia local própria, e o `ScoreCard` tem a sua). Export morto, fora
  do escopo — não removido, porque remover export sem chamador é mudança de superfície pública que
  não pertence a este plano.
- **`CandidatosRHPage.tsx:228`** — `case 'score': // TODO: Quando tiver scores calculados, ordenar
  por eles; break`. O RH pode escolher «ordenar por score» e **nada acontece**, silenciosamente.
  Pré-existente, e é sobre ORDENAÇÃO, não sobre o que a célula mostra (JORN-13). Registrado aqui, não
  consertado (Scope Boundary).
- **`score_geral` (0 de 39)** segue escondido quando nulo — comportamento pré-existente que o próprio
  plano registrou como §Deferred.

## Known Stubs

**Nenhum introduzido por este plano.** Os 4 arquivos criados e os 7 modificados foram varridos por
`TODO|FIXME|placeholder|coming soon|not available|não disponível`: os acertos são (a) o `TODO` de
ordenação por score na `CandidatosRHPage:228`, **pré-existente** e registrado acima; (b) `placeholder`
como atributo HTML de campos de busca e `SelectValue`, que é uso legítimo do atributo; (c) «Nome não
disponível»/«Vaga não disponível», que são fallbacks de render — e o segundo deles **deixou de
disparar** nesta sessão, porque a aba «Por Vaga» passou a receber a vaga.

## Threat Flags

Nenhuma superfície nova. O plano **remove** superfície:

- **T-49-04-01** (CPF/nascimento no payload da lista — *Information Disclosure*): mitigado, com teste
  que reprova pela FORMA da string de `.select` nos três caminhos.
- **T-49-04-02** (nota inventada orientando decisão do RH — *Repudiation*): mitigado por estado
  tipado + 12 asserções de «nenhum dígito» / «nenhuma cor de nota».
- **T-49-04-03** (percentil cru exposto, UX-07): mitigado nas DUAS telas, e no card por construção —
  o número não entra no componente.
- **T-49-04-SC** (npm/pip/cargo installs): **zero instalação de pacote** neste plano.

## Next

Plano 49-05. ⚠ Os três requisitos (JORN-13, JORN-38, JORN-40) ficam `blocked` até o **49-18** fechar
— ele declara os mesmos três IDs, e o portão #2388 recusa marcar `Complete` com metade do trabalho de
um ID em aberto. Nada foi marcado em `REQUIREMENTS.md`.

Para quem mexer no card depois: `estadoBigFive` sinaliza **existência** de linha `big_five`, e o dia
em que aquele `score` deixar de ser NULL o helper continuará correto sem mudança — mas alguém vai
querer exibir o número, e a regra (UX-07/RNF-07a) diz que não. O docblock de `estadoBigFive` registra
isso onde quem for mexer vai ler.

## Self-Check: PASSED

- Presentes no disco: `src/lib/cognitivo/cognitivoBanda.ts`,
  `src/lib/cognitivo/__tests__/cognitivoBanda.test.ts`,
  `src/features/vagas/types/__tests__/estadosAvaliacao.test.ts`,
  `src/features/avaliacao-cognitiva/components/__tests__/LiberacaoCognitivoBlock.test.tsx`, e este
  SUMMARY.
- Presentes no `git log` e **todos já em `origin/main`**: `831f3d3e`, `23ed86e1`, `bfd9ac38`,
  `22e4ea3b`, `4939b667`.
- Marcadores lidos de volta de PROD: `scorecard-cultura-estado` e `cognitivo-banda-rh`.
