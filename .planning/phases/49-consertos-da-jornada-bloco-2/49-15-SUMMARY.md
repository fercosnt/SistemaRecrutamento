---
phase: 49-consertos-da-jornada-bloco-2
plan: 15
subsystem: frontend-rh
tags: [jorn-07, jorn-28, d-25, d-26, d-27b, d-27c, redacao, bars, rubrica, ai-logs, fallback, tdd, windows-52]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "09"
    provides: "`DIMENSOES_REDACAO` e `RUBRICA_REDACAO_VERSAO` em `_shared/bars-redacao.ts` (zero imports por contrato) — a rubrica que a EF v15 envia ao modelo, e agora a MESMA que as duas telas da redação rotulam. Também `redacoes_candidato.rubrica_versao`/`provedor_ia`/`modelo_ia` ESCRITAS."
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "02"
    provides: "`PREFIXO_FALLBACK`, `ehFallback`, `causaDoFallback` e `CAUSA_FALLBACK_ROTULO` em `_shared/ai-error-codes.ts` — as causas legíveis em pt-BR que o log do admin passa a exibir"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "13"
    provides: "`ProvenienciaIABadge` — o selo ÚNICO de proveniência do produto, agora consumido também pelo painel da redação (D-27b)"
provides:
  - "`RedacaoReviewPanel` e `RedacaoOverrideForm` rotulando as 4 dimensões por `DIMENSOES_REDACAO`, resolvidas PELA CHAVE — fecha a WINDOWS 52"
  - "`AnaliseIA` e `RedacaoRubricaVersaoAviso` exportados de `RedacaoReviewPanel.tsx` — o bloco de análise testável sem montar a shell do RH"
  - "`CitacaoIA`, `DimensionScoreIA`, `AnaliseIARedacao` em `revisaoRedacaoService.ts` — a forma REAL do `analise_ia`, tipada a partir de `essay-schemas.ts` e conferida em PROD"
  - "`REDACAO_ALLOWLIST` + `rubrica_versao, provedor_ia, modelo_ia`"
  - "`estadoDaChamada` em `AiLogsPage.tsx` — o predicado dos três estados do log de IA (`sucesso | falha | fallback`), por FORMA e não por prefixo"
  - "`AI_LOGS_LIST_COLUMNS` + `error_code, model_snapshot`; `AiLogListRow` com as duas"
  - "marcadores `redacao-rubrica-versao-antiga` e `ai-log-fallback` — vivos em PROD"
affects: [49-16, 49-18, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 15251
  tasks: 2
  commits: 3
  plan_head_before: a118e6aba8980e40740b2eca5ee6a5fb6db0719d
  # `commits: 3` MEDIDO por `git rev-list --count a118e6ab..HEAD` no instante da escrita
  # deste SUMMARY (b98f790c, be92dde7, 0442fd0c) — os três de PRODUÇÃO, nenhum de metadado,
  # e os três já em `origin/main`. Re-medir DEPOIS do commit de metadado dá 4, por
  # construção (o `plan_head_before` é anterior a ele). A fronteira é esta; produção é 3.
  # `tokens: 15251` = 61 004 octetos de `git diff a118e6ab..HEAD -- src` ÷ 4.
  estimate_tokens_do_plano: 80000
  # O plano estimou 80 000 e o realizado foi 15 251 — 5,2× ABAIXO. É a QUINTA amostra do
  # mesmo padrão na fase (01, 02, 08, 09, e agora 15), e a razão não muda: o peso esteve em
  # LEITURA (a constante de 382 linhas, os dois componentes, o serviço, o `essay-schemas`,
  # o `ai-error-codes`, o `ProvenienciaIABadge`, os precedentes de import relativo e de
  # mock de página) e em MEDIÇÃO em PROD (a forma do `analise_ia` nas 2 linhas vivas, as 17
  # linhas de fallback dos `ai_call_logs`, o catálogo de `model_snapshot`) — nada disso
  # aparece no diff. `confidence: low` era honesto.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rótulo resolvido pela CHAVE que o modelo devolveu, contra a MESMA constante que alimentou o prompt — nunca por posição do array nem por mapa próprio da tela"
    - "teste que ITERA sobre a constante importada em vez de travar rótulos literais: a forma que reprova a divergência em vez de congelá-la (um teste com lista literal PROTEGE o defeito que a lista descreve)"
    - "sub-componente exportado para o teste alcançar a afirmação sem montar a shell inteira (RHLayout + router + TanStack Query) — o objeto do teste é o que o humano LÊ, não o wiring"
    - "fixture de teste tipada LOCALMENTE quando o RED antecede a mudança de tipo do serviço: mantém o RED reprovando por ASSERÇÃO, não por tipo nem por carregamento de módulo (#3770)"
    - "discriminante de estado escrito pela FORMA do dado («há código de erro numa chamada que deu certo»), não pela codificação vigente («o código começa com fallback_») — a codificação só existe depois de uma data, e a forma vale para as linhas de antes"

key-files:
  created:
    - src/features/triagem/components/__tests__/RedacaoReviewPanel.test.tsx
    - src/features/admin/ai-logs/components/__tests__/AiLogsPage.test.tsx
    - src/features/admin/ai-logs/services/__tests__/aiLogsService.test.ts
  modified:
    - src/features/triagem/components/RedacaoReviewPanel.tsx
    - src/features/triagem/components/RedacaoOverrideForm.tsx
    - src/features/triagem/components/__tests__/RedacaoOverrideForm.test.tsx
    - src/features/triagem/services/revisaoRedacaoService.ts
    - src/features/triagem/services/__tests__/revisaoRedacaoService.test.ts
    - src/features/admin/ai-logs/components/AiLogsPage.tsx
    - src/features/admin/ai-logs/services/aiLogsService.ts

key-decisions:
  - "A NOTA por dimensão continua vindo de `scores_dimensao`, não do `score` dentro de `dimension_scores`. As duas existem e concordam hoje, mas `scores_dimensao` é a coluna que o override herda como baseline e sobre a qual `regraVermelho` e os caps incidem. Trocar a fonte da nota no mesmo passo em que se troca a fonte do RÓTULO tornaria impossível dizer qual das duas explicou uma diferença na tela — e o plano pedia o rótulo."
  - "O predicado de fallback do log do admin é `success && error_code != null`, NÃO `ehFallback(error_code)`. Medido: as 17 linhas vivas nesse estado são ANTERIORES ao prefixo `fallback_` do 49-02 e carregam o código cru. Um discriminante escrito sobre o prefixo deixaria exatamente essas 17 verdes — as mesmas que motivaram o conserto. `ehFallback` segue sendo consultado, mas só para decidir se há prefixo a remover antes de o código virar causa legível."
  - "`AnaliseIA` e `RedacaoRubricaVersaoAviso` passaram a ser exports nomeados. A alternativa era montar `RedacaoReviewPanel` inteiro no teste — `useParams`, `useQuery`, dois hooks de fila, RHLayout — para asserir sobre um bloco de 60 linhas. O teste ficaria caro e frágil em tudo que não é o objeto dele."
  - "O selo «Fallback» é ÂMBAR, não vermelho, e é a mesma cor do `ProvenienciaIABadge`. Vermelho diria «deu errado»: o resultado é utilizável. O que o selo afirma é que ele não veio do modelo que se pediu — e o admin e o RH precisam ler a mesma coisa da mesma cor."
  - "A causa desconhecida degrada para o PRÓPRIO `error_code` em vez de virar «—». Um código cru na tela é feio; uma célula vazia se lê como «sem causa», que é uma afirmação falsa sobre uma linha que tem causa registrada."
  - "`IaScores` virou `Partial<Record<ChaveDimensaoRedacao, number | null>>` e o estado inicial dos sliders é montado percorrendo a constante. Antes eram quatro literais `D1..D4` em três lugares; uma dimensão nova teria de ser lembrada em cada um."

patterns-established:
  - "Um harness de mutação que não roda teste nenhum devolve «0 reprovados», que é visualmente indistinguível de «o portão não morde». `--reporter=basic` não existe no vitest 4: as 8 primeiras mutações deste plano saíram todas em 0, e a causa era a flag — não o portão. Ler o log ANTES de concluir qualquer coisa sobre mordida; um resultado uniformemente zero é suspeita de instrumento, não de resultado."
  - "Tela vazia não é dado ausente. Os blocos «Raciocínio» e «Citações» renderizavam nada desde a Phase 13 — não porque a IA não escrevesse, mas porque a tela lia duas chaves que nunca existiram no contrato. A pergunta que resolveu foi «quem MAIS lê esta mesma fonte?»: o `essay-schemas.ts` respondeu, e o catálogo de PROD confirmou."

requirements-completed: []
# ⚠ JORN-07 e JORN-28 ficaram BLOQUEADOS pelo portão de ID compartilhado (#2388): planos
# irmãos desta fase declaram os mesmos dois IDs e ainda não têm SUMMARY. Ver §Next.

# Coverage (#1602)
coverage:
  - deliverable: "As duas telas da redação rotulam as 4 dimensões pela constante que a EF envia ao modelo, resolvidas pela CHAVE (D-25 — fecha a WINDOWS 52)"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "RedacaoReviewPanel.test.tsx#mostra o rótulo da constante para a chave %s — 4 casos, iterando sobre DIMENSOES_REDACAO"
        status: pass
      - kind: test
        ref: "RedacaoOverrideForm.test.tsx#rotula a dimensão %s com o rótulo da constante — 4 casos, iterando sobre DIMENSOES_REDACAO"
        status: pass
      - kind: test
        ref: "RedacaoReviewPanel.test.tsx + RedacaoOverrideForm.test.tsx#NÃO usa o valor Beauty Smile \"%s\" como rótulo de dimensão — 4 casos em cada, iterando sobre VALORES_BEAUTY_SMILE"
        status: pass
      - kind: command
        ref: "portão estático do plano: as duas telas contêm `DIMENSOES_REDACAO` e nenhum dos 4 valores no código sem comentários; o teste do override itera sobre a constante → OK"
        status: pass
      - kind: other
        ref: "mutação M1 (painel volta ao mapa próprio) ⇒ 25 reprovados; M7 (override volta ao mapa próprio) ⇒ 6 reprovados"
        status: pass
  - deliverable: "O rótulo é resolvido pela chave que a IA devolveu, nunca por posição do array"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "RedacaoReviewPanel.test.tsx#com dimension_scores em ordem TROCADA (D3,D1,D4,D2), o raciocínio de %s segue sob \"%s\" — 4 casos"
        status: pass
      - kind: other
        ref: "mutação M2 (`dimension_scores` lido por POSIÇÃO) ⇒ 4 reprovados, e são EXATAMENTE os 4 de ordem trocada — todos os outros 21 testes do arquivo passam com a mutação"
        status: pass
  - deliverable: "O raciocínio e as citações que a IA escreve aparecem POR DIMENSÃO, e o resumo qualitativo aparece (D-25)"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "RedacaoReviewPanel.test.tsx#o raciocínio de %s aparece sob o rótulo \"%s\" (4) + #as 2 citações de %s aparecem sob \"%s\", com a localização (4)"
        status: pass
      - kind: test
        ref: "RedacaoReviewPanel.test.tsx#mostra o qualitative_summary que a IA escreveu"
        status: pass
      - kind: test
        ref: "RedacaoReviewPanel.test.tsx#ignora `reasoning`/`citacoes` na RAIZ de analise_ia (chaves que não existem no contrato)"
        status: pass
      - kind: integration
        ref: "PROD (só leitura, 2026-09-23): nas 2 linhas de `redacoes_candidato`, `analise_ia ? 'reasoning'` = false e `? 'citacoes'` = false; `dimension_scores[0] ? 'reasoning'` = true e `? 'cited_evidence'` = true"
        status: pass
      - kind: other
        ref: "mutação M5 (volta a ler da RAIZ) ⇒ 9 reprovados; M6 (resumo não exibido) ⇒ 1 reprovado"
        status: pass
  - deliverable: "Redação com `rubrica_versao` NULL mostra o aviso de rubrica antiga; nenhuma escrita retroativa (D-26)"
    requirement: JORN-07
    human_judgment: false
    verification:
      - kind: test
        ref: "RedacaoReviewPanel.test.tsx#rubrica_versao NULL ⇒ aviso + #rubrica_versao = 'bars-prd-1.1' ⇒ SEM aviso"
        status: pass
      - kind: integration
        ref: "PROD: as 2 linhas vivas têm `rubrica_versao` NULL — o aviso é o estado REAL delas hoje, não um caso hipotético. Nenhum UPDATE foi executado por este plano."
        status: pass
      - kind: other
        ref: "mutação M3 (aviso removido) ⇒ 2 reprovados"
        status: pass
  - deliverable: "O painel da redação mostra o `ProvenienciaIABadge` com `provedor_ia`/`modelo_ia` da linha (D-27b)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "RedacaoReviewPanel.test.tsx#provedor_ia = openai ⇒ selo de contingência + #anthropic ⇒ selo neutro com o modelo real + #modelo_ia NULL ⇒ «modelo não registrado» (D-30)"
        status: pass
      - kind: test
        ref: "revisaoRedacaoService.test.ts#REDACAO_ALLOWLIST projeta `%s` (4 casos) + #o select() da fila leva `%s` ao navegador (3 casos)"
        status: pass
      - kind: other
        ref: "mutação M4 (selo fora do painel) ⇒ 3 reprovados; M8 (allowlist sem as 3 colunas) ⇒ 6 reprovados"
        status: pass
  - deliverable: "O log de IA do admin mostra três estados, com a causa legível, e o fallback nunca aparece como «Sucesso» (D-27c)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "AiLogsPage.test.tsx#success=true com `fallback_anthropic_max_tokens` ⇒ «Fallback» com «não coube»"
        status: pass
      - kind: test
        ref: "AiLogsPage.test.tsx#a linha de fallback NUNCA diz «Sucesso» (a prohibition do JORN-28)"
        status: pass
      - kind: test
        ref: "AiLogsPage.test.tsx#success=false com `anthropic_timeout` ⇒ «Falha» com «demorou» + #success=true sem error_code ⇒ «Sucesso» + #os quatro estados convivem na mesma tabela"
        status: pass
      - kind: test
        ref: "AiLogsPage.test.tsx#linha antiga `anthropic_retries_exhausted` ⇒ «Fallback» com «causa não registrada (antes da Phase 49)»"
        status: pass
      - kind: integration
        ref: "PROD (só leitura): `ai_call_logs` tem 55 linhas — 38 com `error_code` NULL e `success=true`, e 17 com `success=true` + `error_code='anthropic_retries_exhausted'` (as 17 estavam verdes). Todas as 17 têm `model_snapshot` preenchido."
        status: pass
      - kind: other
        ref: "mutação N1 (predicado volta a ser SÓ o prefixo `fallback_`) ⇒ 2 reprovados; N2 (volta aos dois estados) ⇒ 6; N4 (causa não exibida) ⇒ 3; N5 (selo deixa de ser âmbar) ⇒ 1"
        status: pass
  - deliverable: "A coluna Modelo mostra o modelo REAL (`model_snapshot`, com `model_id` como reserva)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "AiLogsPage.test.tsx#mostra `model_snapshot` quando presente + #cai para `model_id` quando é NULL — nunca célula vazia"
        status: pass
      - kind: other
        ref: "mutação N3 (coluna volta ao modelo CONFIGURADO) ⇒ 7 reprovados"
        status: pass
  - deliverable: "T-49-15-03: a listagem do log segue sem as colunas sensíveis, acrescida só de `error_code` e `model_snapshot`"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "aiLogsService.test.ts#NÃO projeta a coluna sensível `%s` na listagem — 4 casos (system_prompt, user_prompt_template, raw_response, parsed_reasoning) + #nunca projeta `*`"
        status: pass
      - kind: test
        ref: "aiLogsService.test.ts#o detalhe projeta raw_response e parsed_reasoning, e `error_code` — o conteúdo segue exclusivo do modal"
        status: pass
      - kind: other
        ref: "mutação N8 (listagem passa a projetar `raw_response`) ⇒ 1 reprovado; N6/N7 (allowlist sem `error_code`/`model_snapshot`) ⇒ 1 cada"
        status: pass
  - deliverable: "Publicado: os dois marcadores estão no build, no chunk lazy certo, e no ar"
    human_judgment: false
    verification:
      - kind: command
        ref: "npm run build → exit 0, `assert-chunks PASSED`, 49 chunks; `grep -rl ai-log-fallback build/assets/` → AiLogsPage-BwW_MLMK.js; `redacao-rubrica-versao-antiga` → RedacaoReviewPanel-D4O1GT-q.js; ZERO ocorrências dos dois no índice eager"
        status: pass
      - kind: command
        ref: "git push origin main (a118e6ab..0442fd0c); `git log --oneline origin/main..HEAD` → vazio"
        status: pass
      - kind: command
        ref: "crawler em https://rh.beautysmile.com.br → PRESENTE em PROD: ai-log-fallback E redacao-rubrica-versao-antiga"
        status: pass
  - deliverable: "As palavras que o RH e o admin leem são as certas para eles"
    human_judgment: true
    rationale: "Os testes provam que o rótulo renderizado é o da constante que o modelo recebeu, que o raciocínio cai sob a dimensão certa mesmo com a ordem trocada, e que os marcadores estão no ar. O que nenhuma asserção decide: se «Especificidade da situação» comunica ao recrutador o que ele deve avaliar melhor do que «Experiência UAU» comunicava (é MAIS VERDADEIRO, e isso está provado; ser mais ÚTIL é juízo de UX), se o aviso de rubrica antiga é lido como «desconfie deste número» ou ignorado como ruído, e se «não coube»/«demorou» bastam ao admin sem o código cru ao lado. Nenhuma das duas telas foi aberta por pessoa nesta sessão."

# Metrics
duration: 28 min
completed: 2026-09-23
tasks: 2
files: 10
---

# Phase 49 Plano 15: O RH passa a ler o nome da dimensão que a IA avaliou Summary

**A tela de revisão da redação mostrava um número correto sob uma legenda falsa — media
«Especificidade da situação» e escrevia «Experiência UAU» — e, no mesmo bloco, dois cabeçalhos
que nunca renderizaram nada, porque liam duas chaves que jamais existiram no JSONB. Agora os
rótulos vêm da MESMA constante que a Edge Function envia ao modelo, resolvidos pela chave que a
IA devolveu, e o raciocínio e as citações que a IA escreve aparecem por dimensão. No log de IA do
admin, 17 chamadas em que o modelo configurado não respondeu deixaram de ser verdes.**

## O que estava errado — medido, não inferido

Três medições em PROD em 2026-09-23 (só leitura, via `p46apply.cjs sql` com
`SET TRANSACTION READ ONLY`):

**1. As duas telas rotulavam D1–D4 com os 4 valores Beauty Smile.** `RedacaoReviewPanel.tsx:47`
(`DIM_LABEL`) e `RedacaoOverrideForm.tsx:45` (`DIMENSOES`) tinham cada um o seu mapa. Desde o
deploy da EF v15 (plano 49-09) a D1 mede a especificidade da SITUAÇÃO narrada — e a tela a
chamava de «Experiência UAU». Os 4 valores são o **objeto da D4**, não as dimensões. Era a
WINDOWS 52, aberta pelo plano irmão que a tornou aguda.

**2. O raciocínio da IA nunca chegou ao RH — e o dado estava lá o tempo inteiro.** A tela lia
`analise_ia.reasoning` e `analise_ia.citacoes`. Nas 2 linhas vivas de `redacoes_candidato`:

| | `analise_ia ? 'reasoning'` | `? 'citacoes'` | `dimension_scores[0] ? 'reasoning'` | `? 'cited_evidence'` |
|---|---|---|---|---|
| redação A | **false** | **false** | true | true |
| redação B | **false** | **false** | true | true |

As duas chaves de RAIZ **não existem no contrato** (`essay-schemas.ts`: o que existe é
`dimension_scores[].reasoning` e `.cited_evidence`, mais o `qualitative_summary`). Os blocos
«Raciocínio» e «Citações» renderizavam vazio desde a Phase 13, sobre dado presente. Isso não
estava no `<behavior>` como defeito a diagnosticar — o plano já mandava trocar a leitura —, mas
vale registrar o que a medição acrescentou: **não era dado ausente, era leitura no lugar errado**,
e a tela vazia não distinguia as duas coisas.

**3. No log do admin, 17 de 55 chamadas mentiam.** `ai_call_logs`:

| `error_code` | `success` | linhas | com `model_snapshot` |
|---|---|---|---|
| NULL | true | 38 | 37 |
| `anthropic_retries_exhausted` | **true** | **17** | 17 |

As 17 são chamadas em que o modelo configurado **não respondeu** e o resultado veio do de
contingência. A tela as pintava de verde «Sucesso», idênticas às 38 legítimas, e a coluna Modelo
mostrava `model_id` — o modelo **configurado**, que não foi quem respondeu.

## Passo 1 (D-50) — a varredura C7 #6 re-rodada: delta de DOIS achados

Padrão do plano (`DIM_LABEL|DIMENSOES = \[`) re-executado sobre `src/`:

| Sítio | Estado antes | Estado agora |
|---|---|---|
| `RedacaoReviewPanel.tsx:47` (`DIM_LABEL`) | os 4 valores | **removido** — `DIMENSOES_REDACAO` |
| `RedacaoOverrideForm.tsx:45` (`DIMENSOES`) | os 4 valores | **removido** — `DIMENSOES_REDACAO` |
| `EntrevistaScorecardInline.tsx:29-34` | os 4 valores como COMPETÊNCIAS de entrevista | **intacto** — escopo deliberado |
| **`DevolutivaBigFiveView.tsx:38` (`DIM_LABEL`)** | mapa local Big Five | **intacto** — delta, ver abaixo |
| **`ScorecardAvaliacao.tsx:223` (`BIGFIVE_DIM_LABEL`)** | mapa local Big Five | **intacto** — delta, ver abaixo |

**Delta 1 — o padrão acha DOIS mapas de rótulo que a tabela C7 do kickoff não lista**, e os dois
são do Big Five. Eles estão **idênticos hoje** (5 de 5 iguais), então **não há defeito vivo**. O
que há é a **precondição exata** da WINDOWS 52: dois mapas locais, nenhuma constante
compartilhada, e um `_shared/bigfive-scoring.ts` que poderia hospedar a fonte única e **não
hospeda rótulo nenhum**. A divergência da redação também começou com duas tabelas iguais, e
apareceu quando **um** lado mudou. Agravante que não é cosmético: `N: 'Sensibilidade Emocional'`
é exigência LGPD-04 nos dois, e o guard `forbidden-strings` **não** vigia o termo clínico do N
(não está entre os 7 termos). Registrado em **WINDOWS 71**, não consertado — fora dos IDs deste
plano, e o Big Five é outra rubrica.

**Delta 2 — depois deste conserto, `EntrevistaScorecardInline.tsx:29-34` é o ÚNICO lugar do front
onde os 4 valores aparecem como rótulos de eixo de avaliação.** Ali eles são competências de
ENTREVISTA, o que é legítimo, e o plano manda não tocar. Registrado em **WINDOWS 72** porque o
portão estático deste plano procura os 4 valores **apenas** nos dois arquivos da redação: quem
varrer o front inteiro vai achar este sítio e precisa saber que o achado é correto.

## Accomplishments

1. **O rótulo passou a ter UMA fonte, e é a que o modelo recebeu.** As duas telas importam
   `DIMENSOES_REDACAO` de `_shared/bars-redacao.ts` por caminho relativo (precedentes vivos:
   `exportacaoService.ts:61`, `ProvenienciaIABadge.tsx:52`, `AutorizacoesStep.tsx:50`). O
   contrato de zero imports daquele módulo é o que torna o import possível sob o Vite.

2. **O rótulo é resolvido pela CHAVE, nunca por posição.** `dimAnalise` faz
   `find(d => d.dimension === chave)`. O schema garante vocabulário e contagem, **não ordem** —
   ler por índice colocaria o raciocínio de uma dimensão sob o rótulo de outra, que é a mesma
   classe do defeito consertado, uma camada abaixo. Há 4 testes só para a ordem trocada, e a
   mutação que troca `find` por posição reprova **exatamente** esses 4.

3. **O raciocínio e as citações apareceram.** Por dimensão, com a `location` de cada citação
   («Parágrafo 2», «Frase final»), mais o `qualitative_summary`. As chaves de raiz saíram, e há
   um teste que **nega** que texto colocado na raiz seja renderizado.

4. **O aviso de rubrica antiga é o estado REAL das 2 linhas vivas**, não um caso hipotético: as
   duas têm `rubrica_versao` NULL. Nenhuma escrita retroativa (D-26/D-30) — a rubrica que as
   avaliou não é recuperável, e NULL é a verdade.

5. **O painel ganhou o selo de proveniência** (`ProvenienciaIABadge`, do 49-13), com
   «modelo não registrado» quando `modelo_ia` é NULL, que é o caso das 2 linhas de hoje.

6. **O log do admin tem três estados.** «Fallback» âmbar com a causa legível em pt-BR, vinda de
   `CAUSA_FALLBACK_ROTULO` — a mesma tabela que a EF escreve. A coluna Modelo passou a
   `model_snapshot ?? model_id`.

7. **O predicado de fallback foi escrito pela FORMA, não pela codificação vigente** — ver
   §«A decisão que a medição obrigou» abaixo. É o item mais importante deste plano e o que teria
   passado silenciosamente se eu tivesse seguido a letra do `<action>`.

8. **`REDACAO_ALLOWLIST` e `AI_LOGS_LIST_COLUMNS` cresceram o mínimo**, e o segundo ganhou teste
   por coluna sensível: acrescentar coluna a uma allowlist é exatamente o momento em que a outra
   metade do contrato se perde em silêncio.

## A decisão que a medição obrigou — e que contraria a letra do plano

O `<action>` do plano diz: «o badge de status passa a ter três estados, com `ehFallback(row.error_code)`
decidindo «Fallback»». Implementado assim, **as 17 linhas vivas continuariam verdes** — porque
`ehFallback` testa o prefixo `fallback_`, que o plano 49-02 instalou, e as 17 são **anteriores** a
ele: carregam o código cru `anthropic_retries_exhausted`.

Medido, não inferido:

```
ehFallback('fallback_anthropic_max_tokens')  → true
ehFallback('anthropic_retries_exhausted')    → false   ← as 17 linhas de PROD
```

O predicado implementado é `success && error_code != null` — «há código de erro numa chamada que
deu certo». `ehFallback` continua sendo consultado, mas só para decidir se há prefixo a remover
antes de o código virar causa legível.

Isto é o §«Portões: varra pela FORMA, não pelo sintoma» do CLAUDE.md aplicado a um
**discriminante de exibição** em vez de a um portão de teste, e é a segunda das duas formas que
aquela seção descreve: **a lista literal (aqui, o conjunto de prefixos conhecidos) não reprova
nada sobre o objeto que está fora dela.** A diferença é que o objeto fora da lista, neste caso,
são precisamente as 17 linhas que motivaram o requisito. Um conserto fiel à letra teria entregue
uma tela com três estados e **as mesmas 17 mentiras**.

Há um teste dedicado a esse caso, e a mutação N1 (voltar o predicado a `ehFallback`) reprova **2**
testes — o da linha antiga e o dos quatro estados convivendo. Nenhum dos outros 7.

## Prova de mordida (D-56) — 16 mutações, e a rodada que mediu o instrumento

### ⚠ As 8 primeiras mutações saíram todas em «0 reprovados», e a causa era o harness

O primeiro harness rodava `npx vitest run <dir> --reporter=basic`. **`--reporter=basic` não existe
no vitest 4**: o comando aborta em `loadCustomReporterModule` antes de executar teste nenhum, e a
saída não contém a linha `Tests N passed` que o parser procurava — então o parser devolvia `0`.
Oito mutações, oito zeros, um veredito uniforme e falso: «nenhum portão morde».

Um resultado uniformemente zero é **suspeita de instrumento, não de resultado**. Lido o log, a
flag saiu, e as mesmas 8 mutações passaram a reprovar de 1 a 25 testes cada. Registrado em
`patterns-established` porque o modo de falha é exatamente o que o CLAUDE.md descreve um nível
acima: um portão que não pode falhar não vigia nada — e um harness que não roda teste nenhum se
apresenta como um portão que não morde.

### Task 1 — a rubrica na tela (todas mordem)

| # | Mutação | Reprovados | Precisão |
|---|---|---|---|
| M1 | painel volta a rotular pelos 4 valores (mapa próprio) | **25** | o defeito original |
| M2 | `dimension_scores` lido por POSIÇÃO em vez de por `dimension` | **4** | **exatamente** os 4 de ordem trocada |
| M3 | aviso de rubrica antiga removido | **2** | os 2 casos de `rubrica_versao` |
| M4 | `ProvenienciaIABadge` fora do painel | **3** | os 3 casos de proveniência |
| M5 | volta a ler `reasoning`/`citacoes` da RAIZ | **9** | raciocínio + a negativa da raiz |
| M6 | `qualitative_summary` não é exibido | **1** | o resumo |
| M7 | override volta a rotular pelos 4 valores | **6** | os 4 rótulos + os 2 negativos |
| M8 | `REDACAO_ALLOWLIST` sem as 3 colunas novas | **6** | os 3 + os 3 do select |

### Task 2 — o log do admin (todas mordem)

| # | Mutação | Reprovados | Precisão |
|---|---|---|---|
| N1 | predicado volta a ser SÓ o prefixo `fallback_` | **2** | a linha antiga + os 4 estados |
| N2 | volta aos DOIS estados | **6** | todo o bloco de estado |
| N3 | coluna Modelo volta ao modelo CONFIGURADO | **7** | localização por snapshot |
| N4 | causa legível deixa de ser exibida | **3** | as 3 causas |
| N5 | selo de fallback deixa de ser âmbar | **1** | a cor |
| N6 | allowlist sem `error_code` | **1** | a projeção |
| N7 | allowlist sem `model_snapshot` | **1** | a projeção |
| N8 | listagem passa a projetar `raw_response` | **1** | T-49-15-03 |

**Restauração verificada por `git diff --quiet` a cada mutação** (lição da Deviation 2 do 49-09),
e o trabalho foi **commitado antes** de qualquer mutação, nas duas rodadas.

## TDD Gate Compliance

`workflow.tdd_mode` é **false**, então o gate não bloqueia. A disciplina foi seguida na tarefa
`tdd="true"`:

| Tarefa | Gate | Commit | Estado |
|---|---|---|---|
| Task 1 | — | `b98f790c` | `type="tracer"`: sem fase RED própria. As 8 mutações são a prova equivalente |
| Task 2 | RED | `be92dde7` `test(49-15): …` | ✓ 18 descobertos, 8 passam, **10 reprovam** — os 10 alvo |
| Task 2 | GREEN | `0442fd0c` `feat(49-15): …` | ✓ 371/371 no conjunto; **2239/2239** na suíte inteira |
| Task 2 | REFACTOR | — | não houve: o `StatusCell` extraído JÁ é a limpeza, e entrou no GREEN |

**RED da Task 2 medido:** 18 descobertos, 8 passam, **10 reprovam**, e as 10 falhas são
`TestingLibraryElementError` (consulta ao DOM) ou `AssertionError` sobre a string de `.select`.
Nenhuma falha de carregamento de módulo: **não é INVALID_RED (#3770)**.

⚠ **O RED foi mantido válido por uma escolha de tipagem, não por sorte.** O fixture da página é
tipado por uma `interface LinhaFixture` **local**, não por `AiLogListRow` — que naquele momento
ainda não tinha `error_code` nem `model_snapshot`. Importá-lo faria o RED reprovar por **tipo**
antes de chegar à asserção, e (medido no 49-04, Finding 2) empurraria o `tsc` contra a baseline
congelada do pre-commit. O hook é o mesmo; o caminho que o 49-04 resolveu com um andaime
`red()` aqui foi resolvido sem andaime nenhum.

⚠ **Os 8 que já passavam no RED descrevem o que a mudança não podia quebrar** (a allowlist sem
colunas sensíveis; `model_id` como reserva da coluna Modelo), não comportamento novo. Registrado
para não parecer que 8 asserções ficaram verdes de graça — a mesma nota que o 49-03 e o 49-04
precisaram fazer, pela mesma razão.

**`gsd-tools check tdd-red-evidence` segue inaplicável neste runtime** (o checker lê contadores
do `node:test`; o repositório só tem vitest e Deno). O 49-04 e o 49-03 já o registraram. **Nenhuma
linha de contador foi sintetizada** para o checker devolver OK — forjar o artefato que ele existe
para ler transformaria uma verificação de máquina em auto-relato fantasiado.

## Verification results

| Verify | Resultado |
|---|---|
| `npx vitest run src/features/triagem src/__tests__/guards` (T1) | **220 passed** (20 arquivos) |
| portão estático T1 (constante presente; os 4 valores ausentes; teste itera) | **OK** |
| `npx vitest run src/features/admin src/features/triagem src/__tests__/guards` (T2) | **371 passed** (35 arquivos) |
| `aiLogsService.test.ts` — 4 colunas sensíveis ausentes da listagem | **pass** |
| `npm run -s lint` (tsc --noEmit) | **exit 2, 89 `error TS`** — teto D-53 é 90, e não subiu |
| conjunto de erros `tsc` × baseline (ignorando linha/coluna) | **IDÊNTICO — zero novo, zero removido**, medido 4 vezes |
| `npm run build` | **exit 0**, `assert-chunks PASSED`, 49 chunks |
| `grep -rl ai-log-fallback build/assets/` | `AiLogsPage-BwW_MLMK.js` |
| `grep -rl redacao-rubrica-versao-antiga build/assets/` | `RedacaoReviewPanel-D4O1GT-q.js` |
| os dois marcadores no índice **eager** | **0 e 0** — confirma o falso-negativo do CLAUDE.md |
| `git push origin main` → `git log --oneline origin/main..HEAD` | **vazio** (`a118e6ab..0442fd0c`) |
| crawler em PROD (`ai-log-fallback`, `redacao-rubrica-versao-antiga`) | **os dois PRESENTES** |
| **Regressão além do pedido:** suíte vitest inteira | **215 arquivos / 2239 testes, 0 falhas** |

**A regressão da suíte inteira importa porque `AiLogListRow` ganhou dois campos OBRIGATÓRIOS** e
`IaScores` mudou de forma — qualquer consumidor que construísse um desses objetos quebraria, e não
apareceria no subconjunto do plano.

⚠ **O `tsc` está em 89 contra teto 90: margem de UM.** Medido antes de qualquer edição (baseline
89) e depois de cada tarefa, e o conjunto de **mensagens** foi diferenciado, não só contado — uma
compensação (erro novo entrando enquanto um pré-existente sai) manteria o número e passaria o
portão. Em uma medição intermediária o número **subiu para 90**, por um `TS2353` meu no teste novo
do `aiLogsService` (`data` tipado `unknown[]` recebendo uma linha única); corrigido na hora, sem
andaime. **E a medição que mais importava para este plano: importar `bars-redacao.ts` do `src/`
custou ZERO erro de tipo** — era o risco que o 49-09 sinalizou («é o primeiro plano em que este
arquivo pode custar erro»), e ele não se materializou.

## Medições vivas (D-49 / D-51) — o plano não foi ajustado para caber

| O que o plano assume | Medido em PROD (2026-09-23, só leitura) | Bate? |
|---|---|---|
| `analise_ia.dimension_scores[k].reasoning` e `.cited_evidence` existem | `true` nas 2 linhas | sim |
| `analise_ia.reasoning` / `.citacoes` (o que a tela lia) **não** existem | `false` / `false` nas 2 | sim |
| `qualitative_summary` existe | `true` nas 2 | sim |
| as 2 redações antigas têm `rubrica_versao` NULL | NULL nas duas (e `provedor_ia`/`modelo_ia` também) | sim |
| `dimension_scores` tem 4 entradas | 4 nas duas | sim |
| «as 17 linhas antigas `anthropic_retries_exhausted`» | **17**, exatamente, todas com `success=true` | sim |
| `ai_call_logs.error_code` e `.model_snapshot` existem e são nuláveis | as duas `text`, `is_nullable=YES` | sim |
| a coluna Modelo pode mostrar o modelo real | `model_snapshot` preenchido em 54 das 55 linhas | sim |
| baseline de `tsc` = 89, teto 90 | **89**, conjunto de mensagens idêntico | sim |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] O predicado de fallback da letra do plano deixaria as 17 linhas verdes**

- **Found during:** Task 2, RED (ao escrever o caso «linha antiga» do `<behavior>`)
- **Issue:** o `<action>` manda `ehFallback(row.error_code)` decidir «Fallback». `ehFallback` testa
  o prefixo `fallback_`; as 17 linhas vivas nesse estado são anteriores ao prefixo (49-02) e
  carregam o código cru. O `<behavior>` do próprio plano exige que essas 17 mostrem «causa não
  registrada (antes da Phase 49)» — e a `prohibition` do JORN-28 proíbe mostrar um fallback como
  «Sucesso». As duas cláusulas são incompatíveis com o predicado da letra.
- **Fix:** predicado por FORMA — `success && error_code != null` —, com `ehFallback` mantido para
  decidir se há prefixo a remover antes de o código virar causa legível. Documentado no docblock
  de `estadoDaChamada`, que é onde quem for mexer vai ler.
- **Files modified:** `src/features/admin/ai-logs/components/AiLogsPage.tsx`
- **Verification:** teste dedicado à linha antiga; mutação N1 (voltar a `ehFallback`) reprova 2.
- **Commit:** `0442fd0c`

**2. [Rule 2 - Missing critical] O critério «a listagem continua sem colunas sensíveis» não tinha arquivo de teste previsto**

- **Found during:** Task 2, RED
- **Issue:** o `<acceptance_criteria>` exige que a listagem siga sem as 4 colunas sensíveis, e os
  `<files>` da tarefa não incluem nenhum teste de serviço. A casa disso não é o teste da PÁGINA:
  a página consome o hook mockado e nunca vê a string de `.select`.
- **Fix:** criado `src/features/admin/ai-logs/services/__tests__/aiLogsService.test.ts` (10
  asserções, idioma de `revisaoRedacaoService.test.ts`: captura da string de `.select` no cliente
  mockado). Conferido que o include do vitest (`**/__tests__/**`) cobre o diretório novo.
- **Files modified:** `src/features/admin/ai-logs/services/__tests__/aiLogsService.test.ts` (novo)
- **Verification:** mutação N8 (listagem passa a projetar `raw_response`) reprova 1.
- **Commit:** `be92dde7` (RED) / `0442fd0c` (GREEN)

**3. [Rule 1 - Bug] O primeiro harness de mutação não rodava teste nenhum, e reportava «0 reprovados»**

- **Found during:** prova de mordida da Task 1
- **Issue:** `--reporter=basic` não existe no vitest 4. As 8 mutações saíram em 0, e o veredito
  uniforme era do instrumento. Ver §«Prova de mordida».
- **Fix:** flag removida; harness re-executado. Parser passou a distinguir «nenhum teste rodou»
  de «zero reprovados» — a ausência da linha `Tests N passed` é reportada explicitamente.
- **Files modified:** nenhum do produto (harness em `/tmp`)
- **Verification:** as mesmas 8 mutações passaram a reprovar de 1 a 25.
- **Commit:** —

**4. [Rule 1 - Bug] Um `TS2353` meu levou o `tsc` a 90 (o teto) numa medição intermediária**

- **Found during:** Task 2, RED
- **Issue:** no teste novo do `aiLogsService`, o captador `queryResult` estava tipado
  `{ data: unknown[] }` e o bloco do DETALHE atribuía uma linha única. Contagem 89 → **90**,
  encostada no teto do plano.
- **Fix:** `data` passou a `unknown` (a listagem devolve array, o detalhe devolve uma linha, e os
  dois compartilham o captador), com comentário dizendo por quê.
- **Files modified:** `src/features/admin/ai-logs/services/__tests__/aiLogsService.test.ts`
- **Verification:** 89 com conjunto de mensagens idêntico ao baseline.
- **Commit:** `be92dde7`

### Desvios de processo, registrados

**5. [Processo] `gsd-tools windows fixed` não aceita razão, e a tabela do ledger é GERADA**

- **Issue:** o prompt avisava que `windows fixed` aceita e DESCARTA a razão; medido: ele não tem
  `--reason` nenhum (`Error: Unknown flag`). E a primeira tentativa de escrever a razão à mão na
  **tabela** quebrou o ledger: a fonte de verdade é o bloco JSON cercado, e o comando seguinte
  reprovou com «Ledger table disagrees with the fenced JSON entries … for row id(s): 52».
- **Fix:** razão escrita no **JSON** (994 caracteres) e a célula da tabela sincronizada
  programaticamente **lendo o texto de volta do JSON**, para garantir igualdade exata. `windows
  append` voltou a funcionar, e as duas entradas novas (71, 72) entraram.
- **Lição:** num artefato com fonte de verdade e vista gerada, editar a vista é editar a cópia. O
  aviso do prompt estava certo no efeito e incompleto no mecanismo.

**Total deviations:** 4 auto-corrigidas (2 × Rule 2, 2 × Rule 1) + 1 de processo.
**Impact:** a **1** é a mais consequente e é a razão de este plano ter valor: sem ela, a entrega
teria três estados na tela e as mesmas 17 mentiras no banco. As duas Rule 2 **acrescentam**
correção e cobertura; as duas Rule 1 são do instrumento e do meu próprio texto.

## Fora de escopo, registrado e NÃO tocado

| Item | Por quê fica fora | Onde ficou registrado |
|---|---|---|
| **C8 #6, a forma INVERSA** — `classificacao_cor ?? 'verde'` em `revisaoRedacaoService.ts:107-108` e `RedacaoSidebar.tsx:61`. **Conferido: continua lá**, e o `RedacaoReviewPanel.tsx:181` tem a MESMA expressão montando os itens da sidebar (um terceiro sítio, que a C8 não lista). Ausência de classificação vira a MELHOR cor e **promove** o caso não classificado ao topo da fila de «tudo bem» | mesma classe do defeito deste plano com o sinal trocado, mas fora dos IDs (JORN-07/JORN-28). O plano diz explicitamente para não consertar | §Scope note do prompt; o terceiro sítio é achado NOVO deste plano e está nesta linha |
| **WINDOWS 56** — `motivos_revisao`/`dimensoes_desconhecidas` do SJT gravados e não lidos | o operador roteou a questão ao 49-17 | WINDOWS 56 (aberta) |
| Os dois mapas locais de rótulo do **Big Five**, idênticos hoje e sem fonte única | outra rubrica, fora dos IDs | **WINDOWS 71** (nova) |
| `EntrevistaScorecardInline.tsx:29-34` — os 4 valores como competências de ENTREVISTA | escopo deliberado; o plano manda não tocar | **WINDOWS 72** (nova) |
| A NOTA por dimensão continuar vindo de `scores_dimensao` e não do `score` de `dimension_scores` | trocar a fonte da nota junto com a do rótulo tornaria as duas indistinguíveis como explicação | `key-decisions` |
| O filtro «Status» do log do admin segue com duas opções (Sucesso/Falha) — não há filtro por Fallback | o `<behavior>` pede o ESTADO na linha, não o filtro; e o filtro é `.eq('success', …)` no servidor, que não distingue os três | esta tabela |

## Known Stubs

**Nenhum.** Os 10 arquivos foram varridos por
`TODO|FIXME|placeholder|coming soon|not available|não disponível|it.skip|test.skip|describe.skip|.todo(`:
os únicos acertos são o atributo HTML `placeholder` em campos de busca, no `SelectValue` e no
`Textarea` de justificativa — uso legítimo do atributo, todos pré-existentes. **Nenhum teste
pulado, nenhum `<verify>` do plano deixado sem rodar.**

⚠ **Uma coisa que NÃO é stub mas parece:** a causa de fallback degrada para o **próprio
`error_code`** quando não está em `CAUSA_FALLBACK_ROTULO`. É decisão medida (ver `key-decisions`),
não fiação faltando: uma célula vazia se leria como «sem causa» numa linha que tem causa
registrada.

## Threat Flags

Nenhuma superfície de segurança nova. Nenhum endpoint, nenhum caminho de auth, nenhuma mudança de
esquema. As 4 mitigações declaradas ficaram provadas:

| Threat | Disposição | Prova |
|---|---|---|
| T-49-15-01 (rótulo da tela diferente da rubrica que o modelo recebeu) | mitigate | constante única importada pela EF e pelas duas telas; testes que ITERAM sobre ela; mutações M1, M2, M7 |
| T-49-15-02 (fallback exibido como sucesso ao admin) | mitigate | terceiro estado por FORMA (não por prefixo — ver §A decisão que a medição obrigou); mutações N1 e N2 |
| T-49-15-03 (colunas sensíveis do log na listagem) | mitigate | allowlist acrescida só de `error_code`/`model_snapshot`, com teste POR coluna sensível; conteúdo só no detalhe; mutação N8 |
| T-49-15-SC (supply chain) | mitigate | **zero instalação de pacote**, nenhuma dependência nova |

**D-07 / D-58:** nenhum texto novo contém a expressão proibida nem o endereço do canal de
privacidade — o guard `forbidden-strings.grep.test.ts` rodou verde em todas as execuções deste
plano (está em `src/__tests__/guards`, incluído nos dois `<verify>`).

## Issues Encountered

- **`tsc` em 89 contra teto 90: margem de UM para os planos restantes.** Este plano não
  acrescentou erro e o conjunto de mensagens é idêntico — conferido por `diff`, quatro vezes. A
  boa notícia medida: **importar `bars-redacao.ts` do `src/` custou zero**, o que fecha o risco
  que o 49-09 sinalizou.
- **As duas telas consertadas não foram abertas por pessoa.** Os testes provam o que o DOM contém
  e o crawler prova o que está no ar; se «Especificidade da situação» ajuda mais o recrutador do
  que «Experiência UAU» ajudava é juízo de UX (item `human_judgment: true` do `coverage`).
- **O filtro de Status do log continua binário**, então não há como o admin LISTAR só os
  fallbacks — ele os vê linha a linha. Registrado em §Fora de escopo; o servidor filtra por
  `success`, que é a coluna errada para essa pergunta.
- **`gsd-tools check tdd-red-evidence` segue inaplicável** neste repositório (terceiro registro:
  49-03 para Deno, 49-04 para vitest, este).

## Next

Plano 49-16. O que este plano deixa pronto:

- **49-16** (selo no guia e na análise de entrevista): o molde do consumo do `ProvenienciaIABadge`
  por um painel que já existia está aqui (`AnaliseIA`), e a WINDOWS 61 (`entrevista_guias`
  gravado e não lido) é o irmão exato do que este plano fechou para a redação.
- **49-18** (prova em PROD): `redacoes_candidato.rubrica_versao` agora tem **leitor** — a primeira
  redação avaliada pela v15 vai mostrar o aviso desaparecer, e isso é observável na tela. O 49-18
  também fecha a WINDOWS 54 (saída real sob a rubrica nova).
- **49-22** (decisão final): o mesmo padrão de import relativo de `_shared` e o mesmo selo.

⚠ **Para quem mexer no log do admin depois:** leia o docblock de `estadoDaChamada` antes. O
predicado **não** é o prefixo `fallback_`, e a razão está escrita lá — trocá-lo por
`ehFallback(...)` «para usar o helper canônico» reabriria o defeito para as 17 linhas históricas
sem quebrar nenhum teste exceto os dois que existem exatamente para isso.

## Self-Check: PASSED

- Presentes no disco: `src/features/triagem/components/__tests__/RedacaoReviewPanel.test.tsx`,
  `src/features/admin/ai-logs/components/__tests__/AiLogsPage.test.tsx`,
  `src/features/admin/ai-logs/services/__tests__/aiLogsService.test.ts`, e este SUMMARY.
- Presentes no `git log` e **todos já em `origin/main`**: `b98f790c`, `be92dde7`, `0442fd0c`.
- `commits: 3` **MEDIDO** por `git rev-list --count a118e6ab..HEAD`, não narrado;
  `plan_head_before: a118e6ab` registrado para o `/gsd-verify-work` medir com o mesmo instrumento.
- Nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo
  untracked; `git status --short` limpo depois das 16 mutações.
- `<acceptance_criteria>` das duas tarefas re-executados: verdes — as duas telas rotulam pela
  constante sem os 4 valores no código; raciocínio, citações, resumo, aviso e selo com teste; o
  teste do override itera sobre a constante; os 5 casos do `<behavior>` do log com teste; a
  listagem sem colunas sensíveis; `tsc` 89 ≤ 90.
- `<verification>` de plano re-executada: **371/371** no conjunto do plano, **2239/2239** na suíte
  inteira, portão estático OK, os dois marcadores nos chunks lazy corretos e **lidos de volta de
  `https://rh.beautysmile.com.br`**, `origin/main..HEAD` vazio.
- 16 mutações executadas, **todas mordem**; a rodada que devolveu 16 zeros foi medida, nomeada e
  atribuída ao instrumento — nenhuma declarada aprovada.
- Varredura C7 #6 re-rodada: **2 deltas** registrados em WINDOWS (71, 72).
- **WINDOWS 52 marcada `fixed`**, com a razão escrita à mão no bloco JSON (a fonte de verdade) e a
  tabela sincronizada a partir dele.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*
