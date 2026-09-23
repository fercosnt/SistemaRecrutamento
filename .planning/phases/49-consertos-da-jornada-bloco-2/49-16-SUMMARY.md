---
phase: 49-consertos-da-jornada-bloco-2
plan: 16
subsystem: frontend
tags: [jorn-12, jorn-28, d-39, d-40, d-41, d-42, d-27b, entrevista, hub-candidato, react, vitest, tdd, vercel, windows-61]
status: complete

# Dependency graph
requires:
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "10"
    provides: "o contrato da EF (`{ok, analise_id, tipo, reaproveitada, vigente, falhou}`), o `tipo` OPCIONAL já aceito no body `.strict()`, a RPC `registrar_analise_entrevista` como único escritor, e as duas RPCs de revisão com as ASSINATURAS inalteradas — o serviço não precisou mudar para chamar, só para MANDAR o tipo e para OFERECER a vigente"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "01"
    provides: "as colunas `tipo`/`superada_em`/`texto_hash`/`provedor_ia`/`modelo_ia` de `entrevista_analises` e o predicado ÚNICO `public.entrevista_analise_vigente(timestamptz,text,jsonb)`, cujo corpo vivo foi LIDO do catálogo em 2026-09-23 e transcrito uma vez neste serviço"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "13"
    provides: "`ProvenienciaIABadge` + `textoProveniencia`/`ehResultadoDeContingencia` — o selo ÚNICO de proveniência do produto, consumido aqui nas três telas sem nenhuma segunda implementação"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "24"
    provides: "`entrevista_guias.provedor_ia`/`modelo_ia` GRAVADOS desde a v18 da EF — e as 5 linhas legadas com os dois NULL, que o selo tinha de saber ler como «modelo não registrado» e não como erro"
  - phase: 49-consertos-da-jornada-bloco-2
    plan: "26"
    provides: "`weak_dim_uncovered` deixou de ser um estado impossível e o bloqueio por custo passou a cair no ramo `falhou` — sem isso o `falhou: true` que esta tela agora TRADUZ teria menos causas reais, e o ramo de falha marcaria a análise boa como superada"
provides:
  - "`getAnalises(candidaturaId)` — UMA consulta que classifica as linhas por VIGÊNCIA (vigente de cada tipo, superadas, falhas, e a `vigenteMaisRecente` que a RPC grava), com o predicado do banco transcrito UMA vez em `analiseVigente()`"
  - "`getAnalise` devolvendo a vigente MAIS RECENTE — não mais a linha mais nova de qualquer estado"
  - "`analisarTranscricao(id, texto, tipo)` mandando `tipo` no body e devolvendo `{analise_id, tipo, reaproveitada, vigente, falhou}` — o resultado da EF, não a linha lida de volta"
  - "`ENTREVISTA_ANALISE_ALLOWLIST` com vigência + proveniência e SEM `ai_call_log_id`/`solicitado_por` (UUID de funcionário); `ENTREVISTA_GUIA_ALLOWLIST` e `ANALISE_HUB_ALLOWLIST` com `provedor_ia, modelo_ia`, as três sem curinga"
  - "a aba da transcrição com seletor online/presencial (`data-testid=\"transcricao-tipo-seletor\"`), vigente por entrevista, anteriores acessíveis com a revisão que tiveram, falhas como falha, e os avisos de `reaproveitada`/`falhou`"
  - "o selo de proveniência VIVO em três telas: análise de entrevista, guia STAR/PEI e análise da triagem do hub"
  - "para o 49-12: a tela já EXIBE as 5 legadas como «Superada — data não registrada»; quando a marcação retroativa rodar, a data aparece sem nenhuma mudança de código"
affects: [49-12, 49-17, 49-18, 49-22]

# Actuals (#2632) — mesma escala do `estimate` do plano: estimateTokens (chars/4) sobre o diff realizado.
actuals:
  tokens: 24801
  tasks: 2
  commits: 3
  plan_head_before: 3a9bc6cad58243cb93604840ac56efdd25fcf5bd
  estimate_tokens_do_plano: 100000
  # `commits: 3` = MEDIDO por `git rev-list --count 3a9bc6ca..HEAD` no instante da escrita
  # deste SUMMARY (f2a0c3b9, 9c4f2537, 2a191b80) — os três de PRODUÇÃO, nenhum de metadado.
  # Re-medir DEPOIS do commit de metadado deste plano dá 4, e isso não é divergência: o
  # `plan_head_before` é anterior a ele por construção.
  # `tokens: 24801` = 99 204 octetos de `git diff 3a9bc6ca..HEAD -- src` ÷ 4. O plano
  # estimou 100 000 e o realizado foi 4,0× ABAIXO — a MESMA direção e quase a MESMA razão
  # das amostras anteriores da fase (49-24 5,2×, 49-25 4,0×, 49-10 3,6×, 49-26 2,6×). Nona
  # amostra na mesma direção, e a causa continua a mesma: o orçamento foi dimensionado pelo
  # TRABALHO (ler o serviço de 787 linhas, o painel, o guia de 675, medir PROD, ler o corpo
  # vivo do predicado, projetar o agrupamento) e o `actuals` mede o ARTEFATO. Registrado
  # medido, não ajustado para parecer perto.

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "quando um predicado do BANCO tem de existir também no navegador (que não pode chamar a função SQL numa projeção de coluna), transcrevê-lo UMA vez numa função nomeada, com o corpo vivo citado no docblock e a fonte apontada — em vez de espalhar a condição pelos lugares que precisam dela"
    - "derivar o padrão de um seletor do prop assíncrono em vez de copiá-lo para o estado num `useEffect`: `tipoEscolhido ?? tipoPadraoDaEtapa(etapa)` nunca congela o `null` do primeiro render, e a escolha explícita do usuário sempre vence sem nenhuma sincronização"
    - "a ausência de padrão defensável é uma decisão a EXIBIR, não a preencher: fora de etapa de entrevista o botão de analisar fica desabilitado com a razão dita — a mesma postura do servidor, que responde 400 pedindo o tipo em vez de gravar um palpite"
    - "`?? null` e não `?? undefined` num mapeamento de leitura quando a ausência é um VALOR que a tela renderiza: «não sei qual modelo» é uma afirmação, e `undefined` a transformaria em silêncio — que é indistinguível de proveniência confirmada"
    - "campo de proveniência OBRIGATÓRIO (com valor `null`) em vez de opcional: todo construtor de linha passa a declarar de onde ela veio, e foi o compilador que cobrou a fixture antiga do teste"
    - "sobrepor a cópia de UM código de erro para UMA chamada (`mapRpcError(err, fallback, {'23514': …})`) em vez de trocar a frase para todas: a mesma mensagem que está errada numa chamada está certa nas outras quatro"

key-files:
  created:
    - src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx
  modified:
    - src/features/entrevista/services/entrevistaService.ts
    - src/features/entrevista/hooks/useEntrevistaScorecard.ts
    - src/features/entrevista/components/TranscricaoReviewPanel.tsx
    - src/features/entrevista/components/EntrevistaWorkspace.tsx
    - src/features/entrevista/components/GuiaEntrevistaPanel.tsx
    - src/features/entrevista/__tests__/entrevista-allowlist.test.ts
    - src/features/entrevista/__tests__/entrevista-contract.test.ts
    - src/features/entrevista/__tests__/citacoes-render.test.tsx
    - src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx
    - src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts
    - src/features/hub-candidato/services/analiseCandidatoService.ts
    - src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts
    - src/features/hub-candidato/components/AnaliseIABlock.tsx
    - src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx

key-decisions:
  - "O predicado de vigência é uma função NOMEADA (`analiseVigente`) com o corpo vivo de `public.entrevista_analise_vigente` citado no docblock, lido do catálogo antes de escrever. A lacuna do JORN-12 é literalmente quatro leitores decidindo «qual análise vale» por regras que divergiam em silêncio; os três do servidor passaram a CHAMAR a função do banco (49-06/49-10), e o navegador não pode chamá-la numa projeção de coluna. Então ela é transcrita UMA vez, com a fonte apontada — em vez de a condição aparecer nos três lugares da tela que precisam dela, que é a quinta cópia esperando divergir."
  - "Fora de etapa de entrevista o seletor NÃO tem padrão: o botão de analisar fica desabilitado com a razão escrita. Considerado e descartado o padrão `'online'` — a EF do 49-10 já decidiu que «fora de etapa de entrevista não há padrão defensável» e responde 400 pedindo o tipo; uma tela que chuta ali mandaria o palpite que o servidor recusa, e uma análise com o tipo errado supera a vigente da entrevista ERRADA."
  - "As legadas sem `superada_em` gravado entram em `superadas` (elas SÃO superadas de fato — existe uma vigente mais nova do mesmo grupo) e a tela diz «Superada — data não registrada» em vez de exibir a data de criação no lugar da data de superação. O marcador é do 49-12; inventar a data seria trocar um registro ausente por um registro falso, que custa mais."
  - "O painel deixou de receber UMA análise e passa a receber o AGRUPAMENTO (`analises`), numa consulta só. Considerado manter o prop `analise` por compatibilidade e descartado: seriam duas portas para a mesma pergunta, e a próxima edição consertaria uma. O custo foi atualizar o `citacoes-render.test.tsx` (fora da lista de `files_modified`, registrado como desvio)."
  - "`provedor_ia`/`modelo_ia` entraram como OBRIGATÓRIOS em `AnaliseHubRow` (com valor `null`), não opcionais. Assim todo lugar que constrói uma linha de análise DECLARA de onde ela veio; opcionais deixariam «esqueci» indistinguível de «não sei». Foi o compilador que cobrou a fixture antiga do teste, que é o mecanismo funcionando."
  - "O 23514 do `confirmar_revisao_entrevista` ganhou a frase certa («esta análise não é mais a vigente»), por um override escopado À CHAMADA. O 49-10 registrou que a frase genérica do `mapRpcError` («Dados inválidos. Verifique os campos.») não serve para essa recusa — não há campo errado para o RH conferir. Trocar a frase para TODAS as RPCs a tornaria errada em quatro lugares em vez de um, e o `<scope_note>` proibia exatamente esse alargamento."
  - "O selo do guia só renderiza quando existe roteiro; o selo da análise da triagem renderiza TAMBÉM no caminho de falha. Não é inconsistência: um resultado que não existe não tem proveniência, mas uma tentativa que falhou tem — e saber que ela veio do modelo de contingência é o que ajuda a entender por quê."
  - "`main` mantida como branch de trabalho (autorização explícita do orquestrador: `git.allow_default_branch_commits: true`, `branching_strategy: none`, CLAUDE.md declara `main` como base). Não registrado como desvio."

patterns-established:
  - "Um `<precondition>` conferível SÓ por leitura é o caso fácil, e vale dizer como foi resolvido sem side effect: a EF viva foi conferida por (a) grep do disco (`rpc(\"registrar_analise_entrevista\"` ×2) e (b) o registro de version=18 ACTIVE relido da Management API pelo 49-26 HOJE. Nenhum deploy, nenhum POST, nenhuma reinvocação."
  - "O RED de um selo de tela falha por «Unable to find [data-testid=…]», que é uma falha por ASSERÇÃO e não por carregamento de módulo (#3770) — e a distinção importa porque um RED que estoura no import pareceria igualmente vermelho sem provar nada. Os 11 reprovados foram listados por nome antes do GREEN."
  - "Um commit RED pode legitimamente estourar o teto de `tsc` do plano, e esconder isso com um cast que sobreviveria ao conserto é a troca errada. Os 2 erros novos do RED eram `Property 'provedor_ia' does not exist on type 'AnaliseHubRow'` — exatamente o tipo que o GREEN acrescenta. Ficou escrito na mensagem do commit, e o GREEN voltou a 89 com o conjunto IDÊNTICO ao baseline."

requirements-completed: [JORN-12, JORN-28]

# Coverage (#1602)
coverage:
  - deliverable: "O RH diz de qual entrevista é a transcrição que está mandando analisar (D-41)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«renderiza o seletor com o MESMO par de opções dos CTAs do guia» · #«candidatura em entrevista_online ⇒ «Entrevista online» PRÉ-SELECIONADO» · #«candidatura em entrevista_presencial ⇒ …» · #«manda ao onAnalisar o texto E o tipo escolhido pelo RH (que vence a etapa)»"
        status: pass
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«fora de etapa de entrevista NÃO há padrão: analisar fica bloqueado até o RH escolher» — o botão desabilitado, a razão na tela, e o tipo viajando depois da escolha"
        status: pass
      - kind: test
        ref: "entrevista-contract.test.ts — o body `{candidatura_id, transcricao, tipo}` parseia no `AvaliarTranscricaoBodySchema.strict()` compartilhado; `tipo: 'hibrido'` é recusado; o body SEM tipo AINDA parseia (a compatibilidade que permitiu a EF sair antes — D-55); campo estranho continua recusado"
        status: pass
      - kind: command
        ref: "`transcricao-tipo-seletor` presente em `build/assets/EntrevistaWorkspace-HRBEpQFb.js` (chunk lazy de `/rh/*`) e AUSENTE do índice eager `index-FfswZsZD.js` — o falso negativo que o CLAUDE.md descreve, medido nos dois lados"
        status: pass
  - deliverable: "A tela mostra a análise VIGENTE de cada entrevista, e nunca a mais nova de qualquer estado no lugar dela (D-39)"
    requirement: JORN-12
    human_judgment: false
    verification:
      - kind: unit
        ref: "`analiseVigente()` transcreve o corpo VIVO de `public.entrevista_analise_vigente` lido do catálogo em 2026-09-23 (`superada_em IS NULL AND status_analise IS DISTINCT FROM 'falhou' AND competencias IS NOT NULL`); `getAnalise` passou a devolver `vigenteMaisRecente`"
        status: pass
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«a análise que FALHOU aparece como falha, NUNCA como vigente (D-39)» — a falha é MAIS NOVA que a vigente na fixture, e a vigente segue sendo a vigente"
        status: pass
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«uma vigente por ENTREVISTA: online e presencial aparecem as duas» · #«o grupo SEM tipo aparece como «entrevista não identificada» — sem palpitar online/presencial»"
        status: pass
      - kind: test
        ref: "entrevista-allowlist.test.ts — a allowlist nomeia `tipo`/`superada_em`/`status_analise`/`competencias`, mantém os 4 marcadores de revisão, e NÃO projeta `ai_call_log_id` nem `solicitado_por` (T-49-16-02)"
        status: pass
  - deliverable: "As análises anteriores ficam acessíveis, com a revisão humana que tiveram (D4 / D-42)"
    requirement: JORN-12
    human_judgment: false
    verification:
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«as DUAS superadas ficam acessíveis, com a data da superação» · #«a superada REVISADA mostra a revisão que teve — quem e quando (D-42)» · #«a superada SEM revisão diz que não foi revisada, em vez de ficar muda»"
        status: pass
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«a superada LEGADA (sem `superada_em` gravado) diz que a data não está registrada — nunca inventa uma»"
        status: pass
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«a vigente sem revisão aparece como «aguardando revisão humana» (D-42)»"
        status: pass
  - deliverable: "A revisão humana é oferecida SÓ na análise que a RPC grava (49-10)"
    requirement: JORN-12
    human_judgment: false
    verification:
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«confirma a revisão SOBRE a vigente mais recente (o id que a RPC aceita)» — assere o id passado E que o id da superada NÃO é passado"
        status: pass
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«a superada NÃO oferece botão de revisar — é uma ação que o servidor recusa» (`queryByRole('button')` dentro do item = null) · #«sem bandeira disparada não há botão de confirmar revisão em lugar nenhum»"
        status: pass
      - kind: unit
        ref: "o scorecard inline passou a ler `analiseVigente?.competencias` (a mesma linha que `salvar_avaliacao_entrevista` grava) — antes lia a mais nova de qualquer estado, então uma falha sem competências apagava o scorecard da análise que funcionou"
        status: pass
      - kind: other
        ref: "`confirmarRevisaoHumana` traduz o 23514 da RPC como «esta análise não é mais a vigente», por override escopado à chamada — a pendência que o 49-10 deixou nomeada"
        status: pass
  - deliverable: "«Este texto já tinha sido analisado» e «a análise não pôde ser concluída» são DITOS, em vez de a tela simular uma análise nova (D-40)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx#«reaproveitada + vigente ⇒ …» · #«reaproveitada + NÃO vigente ⇒ diz que a vigente desta entrevista é outra» · #«falhou ⇒ … e a vigente anterior CONTINUA na tela» · #«análise nova e normal NÃO mostra aviso nenhum (nem simula um)»"
        status: pass
      - kind: unit
        ref: "`analisarTranscricao` devolve o RESULTADO da EF (`reaproveitada`/`vigente`/`falhou`) lido do CORPO da resposta, não do código de status — a EF responde 200 no caminho de falha de propósito (49-26), então ler o status diria «pronto» nos dois casos"
        status: pass
  - deliverable: "Todo resultado de IA que o RH lê diz quando veio do modelo de contingência (D-27b)"
    requirement: JORN-28
    human_judgment: false
    verification:
      - kind: test
        ref: "TranscricaoReviewPanel.test.tsx — 4 testes de selo: `openai` ⇒ contingência com o modelo; `anthropic` ⇒ neutro; `modelo_ia` NULL ⇒ «modelo não registrado» (D-30); a SUPERADA carrega o SEU selo (a proveniência dela não é a da vigente)"
        status: pass
      - kind: test
        ref: "GuiaEntrevistaPanel.test.tsx — 4 testes novos (contingência / neutro / «modelo não registrado» para as 5 linhas legadas / sem guia = sem selo). RED medido antes: 3 reprovados por «Unable to find [data-testid=proveniencia-ia-badge]»"
        status: pass
      - kind: test
        ref: "AnaliseIABlock.test.tsx — 5 testes novos, incluindo o caminho de FALHA com selo e «sem análise = sem selo». RED medido: 4 reprovados pela mesma asserção"
        status: pass
      - kind: test
        ref: "analiseCandidatoService.test.ts — `ANALISE_HUB_ALLOWLIST` com as 7 colunas, star-free, a proveniência chegando à linha, `?? null` e não `undefined` para as 25 linhas vivas, e o teste NEGATIVO novo (`resumo_cv`/`resumo_respostas`/`erro` seguem fora)"
        status: pass
      - kind: command
        ref: "`proveniencia-ia-badge` presente em `build/assets/ProvenienciaIABadge-DUdFjuJR.js` e LIDO DE VOLTA do site vivo pelo crawler"
        status: pass
  - deliverable: "Publicado — os dois canais (git e Vercel) em dia"
    human_judgment: false
    verification:
      - kind: command
        ref: "`git push origin main` ⇒ `3a9bc6ca..2a191b80`; `git log --oneline origin/main..HEAD` VAZIO; `origin/main` = `HEAD` = `2a191b80`"
        status: pass
      - kind: command
        ref: "crawler do plano, re-executado VERBATIM: `PRESENTE em PROD: transcricao-tipo-seletor`. E o mesmo crawler para `proveniencia-ia-badge`: PRESENTE"
        status: pass
      - kind: command
        ref: "`npm run -s lint` ⇒ **89** erros (teto D-53 = 90) e o CONJUNTO DE MENSAGENS IDÊNTICO ao baseline, conferido por `diff` das 89 linhas ordenadas — medido depois de cada task"
        status: pass
  - deliverable: "Nenhuma regressão além do pedido"
    human_judgment: false
    verification:
      - kind: test
        ref: "suíte completa: **216 arquivos / 2288 testes, zero falha**. Escopo do plano: 38 arquivos / 401 testes (baseline 37/352 — +1 arquivo, +49 testes)"
        status: pass
      - kind: command
        ref: "varredura de FORMA nos smokes (CLAUDE.md §Portões): **sem alvo** — 0 arquivos `.sql` tocados por este plano (`git diff --name-only | grep -c '\\.sql$'` = 0). Declarado em vez de omitido. A contagem atual da fase é 311 linhas, inalterada por este plano"
        status: pass
  - deliverable: "O RH CONFERE na tela viva que a análise que ele lê é a que vale, e que o histórico está lá"
    human_judgment: true
    rationale: "Os testes de componente asseream o contrato de render sobre fixtures; o julgamento de que a hierarquia visual comunica «esta vale, aquelas valeram» é humano e depende de PROD. E há um detalhe que só a tela viva revela: as 6 análises de PROD são TODAS do grupo sem tipo (`tipo` NULL em todas, medido 2026-09-23), então a candidatura `bf26ee3c` vai mostrar UMA vigente e TRÊS «Superada — data não registrada» até o 49-12 rodar. Isso é o conserto funcionando (antes ela mostrava a 4ª como se fosse a única), mas a frase sobre a data ausente aparece 3 vezes, e se isso incomoda é decisão do operador — não de um teste."

# Metrics
duration: ~48 min
completed: 2026-09-23
tasks: 2
files: 15
---

# Phase 49 Plano 49-16: A tela da entrevista para de mentir sobre qual análise vale Summary

**O servidor já sabia qual análise valia desde o 49-10 — a tela não perguntava. Ela lia a
linha mais NOVA de qualquer estado, então uma análise que falhou virava «a análise» e
escondia a que tinha funcionado, junto com a revisão humana que alguém já havia feito nela;
e o body ia sem `tipo`, que é como as 6 análises vivas de PROD nasceram sem saber de qual
entrevista são. Agora `getAnalises` classifica por VIGÊNCIA numa consulta, com o predicado do
banco transcrito UMA vez e nomeado; a aba tem o seletor online/presencial (com a etapa como
padrão, e NENHUM padrão fora de etapa de entrevista — a mesma postura da EF); as anteriores
ficam acessíveis com a revisão que tiveram; a revisão é oferecida só na linha que a RPC
aceita; e «este texto já tinha sido analisado» deixou de ser indistinguível de «analisei de
novo». Mais o selo de contingência em três telas, por TDD com RED medido. `tsc` 89 com o
conjunto de mensagens idêntico, suíte completa 2288/2288, e os dois marcadores lidos de volta
do site vivo.**

## Performance

- **Duration:** ~48 min
- **Started:** 2026-09-23 10:25:41 -03 (1º commit de tarefa)
- **Completed:** 2026-09-23 10:31:30 -03 (último commit de produção)
- **Tasks:** 2 / 2 (Task 1 `tracer`, Task 2 `tdd`)
- **Files:** 1 criado, 14 modificados
- **Testes:** escopo do plano 352 → **401**; suíte completa **2288**, sempre 0 falhas

## As medições vivas que precederam a escrita (D-49 / D-51)

Lidas de PROD por `p46apply.cjs sql` com `SET TRANSACTION READ ONLY` em 2026-09-23, **antes**
de qualquer edição — o plano não foi ajustado para caber nelas:

| O que o plano assume | Medido em PROD | Bate? |
|---|---|---|
| Precondição: a EF do 49-10 está no ar | `rpc("registrar_analise_entrevista"` ×2 no disco + version=18 ACTIVE relida da Management API pelo 49-26 HOJE | sim |
| corpo vivo de `entrevista_analise_vigente` | `superada_em IS NULL AND status_analise IS DISTINCT FROM 'falhou' AND competencias IS NOT NULL` — transcrito verbatim no docblock | sim |
| as 6 análises antigas com `tipo` NULL | **6 linhas, `tipo` NULL em TODAS as 6**, 0 superadas, 0 com proveniência, 0 falhas | sim |
| os 5 guias legados sem proveniência | **5 linhas, `provedor_ia`/`modelo_ia` NULL em todas**, 0 com a chave `flags` | sim |
| a análise da triagem sem proveniência | **25 linhas, `provedor_ia`/`modelo_ia` NULL em todas**, 0 `openai` | sim |
| enum `etapa_processo` com as duas etapas de entrevista | `entrevista_online`, `entrevista_presencial` (de 8 valores) | sim |
| `tsc` = 89, teto 90 | 89 | sim |

**Uma medição que mudou o desenho.** As 4 análises de `bf26ee3c` passam TODAS o predicado de
vigência (nenhuma tem `superada_em`), porque o invariante «uma vigente por `(candidatura,
tipo)`» só vale para as linhas que a RPC do 49-10 escreveu. Um agrupamento que assumisse o
invariante deixaria 3 das 4 fora de qualquer categoria — invisíveis na tela, que é a forma
pior do mesmo defeito. Então `getAnalises` trata a segunda vigente de um grupo como
**superada de fato, com o marcador ausente**, e a tela diz «Superada — data não registrada».

## O conserto

### Task 1 (tracer) — do seletor até a EF e de volta

`getAnalises(candidaturaId)` faz UMA consulta (`READ_LIMIT`, sem N+1) e classifica:

```
superada_em != null                        → superadas
!analiseVigente(row)                       → falhas
1ª vigente do grupo (tipo ?? sem_tipo)     → vigentes
vigente seguinte do MESMO grupo            → superadas (a legada, sem marcador)
```

`analiseVigente()` é a transcrição nomeada do predicado do banco, com o corpo vivo citado. Foi
escrita UMA vez de propósito: a lacuna do JORN-12 é quatro leitores com quatro cópias
divergindo em silêncio, e os três do servidor já passaram a chamar a função SQL (49-06/49-10).
O navegador não pode chamá-la numa projeção de coluna — então a quinta cópia existe, mas é
uma só, nomeada, com a fonte apontada.

`getAnalise` virou um wrapper de `vigenteMaisRecente`, e o `useTranscricaoAnalise` passou a
devolver o agrupamento inteiro — o scorecard, a revisão e a tela leem a MESMA classificação.

`analisarTranscricao(id, texto, tipo)` manda o `tipo` e devolve `{analise_id, tipo,
reaproveitada, vigente, falhou}` **lido do corpo da resposta**, não do código de status: a EF
responde 200 no caminho de falha de propósito (dar 500 a um corte por teto de custo bem-
sucedido transformaria um controle funcionando em falha do sistema, 49-25/49-26), então ler o
status diria «pronto» nas duas situações.

O seletor de tipo derivado, sem efeito de sincronização:

```tsx
const [tipoEscolhido, setTipoEscolhido] = useState<TipoEntrevista | null>(null)
const tipo = tipoEscolhido ?? tipoPadraoDaEtapa(etapaAtual)
```

A etapa chega depois (o contexto carrega em paralelo), e um `useState(padrão)` congelaria o
`null` do primeiro render. Fora de etapa de entrevista `tipoPadraoDaEtapa` devolve `null` e o
botão de analisar fica desabilitado com a razão na tela — a decisão de não chutar, exibida.

### Task 2 (TDD) — o selo em duas telas a mais

RED → GREEN → (sem REFACTOR: não havia limpeza óbvia a fazer, e commitar um `refactor` vazio
seria teatro). `ANALISE_HUB_ALLOWLIST` foi a 7 colunas, `AnaliseHubRow` ganhou a proveniência
como campo **obrigatório com valor `null`**, e o `GuiaEntrevistaPanel`/`AnaliseIABlock`
passaram a renderizar o `ProvenienciaIABadge` do 49-13 — sem nenhuma segunda implementação de
selo.

## Task Commits

1. **Task 1 (tracer): o RH escolhe a entrevista, e a tela mostra qual análise VALE** — `f2a0c3b9` (feat)
2. **Task 2 RED: o guia e a análise da triagem não dizem qual modelo os escreveu** — `9c4f2537` (test)
3. **Task 2 GREEN: o guia e a análise da triagem dizem qual modelo os escreveu** — `2a191b80` (feat)

## O RED, medido (não sintetizado)

**86 passed | 11 failed**, e cada falha é por **ASSERÇÃO** da behavior planejada — zero erro
de carregamento de módulo, zero erro de sintaxe (a distinção que o #3770 nomeia: um RED que
estoura no import pareceria igualmente vermelho sem provar nada):

| Reprovado | Motivo medido |
|---|---|
| 3 × `GuiaEntrevistaPanel.test.tsx` | `Unable to find an element by: [data-testid="proveniencia-ia-badge"]` |
| 4 × `AnaliseIABlock.test.tsx` | a mesma asserção, incluindo o caminho de falha |
| 2 × `analiseCandidatoService.test.ts` (allowlist) | `expected 'score_match, pontos_fortes, gaps, fla…' to contain 'provedor_ia'` |
| 1 × idem (mapeamento) | `expected { score_match: 61, …(4) } to match object { provedor_ia: 'openai', …(1) }` |
| 1 × idem (`?? null`) | `expected undefined to be null` |

⚠ **`check tdd-red-evidence` não lê a saída do vitest**, então o RED fica registrado por esta
medição e **nenhuma linha de contador foi sintetizada** para o checker — forjar o artefato que
ele existe para ler é pior que não tê-lo.

⚠ **O commit RED ficou com `tsc` em 91, acima do teto de 90, por construção.** As duas
mensagens novas eram `Property 'provedor_ia' does not exist on type 'AnaliseHubRow'` —
exatamente o tipo que o GREEN acrescenta. Escondê-las com um cast que sobreviveria ao conserto
seria a troca errada; ficaram escritas na mensagem do commit. O GREEN voltou a **89 com o
conjunto de mensagens IDÊNTICO ao baseline**.

## Verification results

| Verify | Resultado |
|---|---|
| Task 1 `<verify>` #1 — `vitest` de `src/features/entrevista` + guards | **17 arquivos / 180 testes, 0 falha** |
| Task 1 `<verify>` #2 — sonda do service/painel + `tsc` ≤ 90 | `OK`; `lint exit=2 tsc errors=89`; exit 0 |
| Portão de realimentação do tracer | `<verify>` re-executado INTEIRO pós-commit: 180/180, sonda OK, 89. Modo `end-of-phase` + `<verify>` só automatizado ⇒ verificado e expandido, sem checkpoint |
| Task 2 `<verify>` #1 — `vitest` das 3 features + guards | **38 arquivos / 401 testes, 0 falha** |
| Task 2 `<verify>` #2 — build + marcador + `tsc` | build OK (49 chunks, assert-chunks PASSED); marcador em `EntrevistaWorkspace-HRBEpQFb.js`; `tsc errors=89`; exit 0 |
| Task 2 `<verify>` #3 — `origin/main..HEAD` + crawler | vazio; `PRESENTE em PROD: transcricao-tipo-seletor` |
| Suíte completa (regressão além do pedido) | **216 arquivos / 2288 testes, 0 falha** |
| Varredura de FORMA nos smokes | **sem alvo** — 0 arquivos `.sql` tocados |
| `WINDOWS` | `windows status --raw` ⇒ `ok: true` (tabela e JSON concordam); 61 `fixed` com motivo de 1171 caracteres; 73 nova |

## Publicação (D-52 / PATTERNS §J) — e a latência da Vercel, medida

| Item | Estado |
|---|---|
| `npm run build` | ✅ 49 chunks, `assert-chunks PASSED` |
| Marcador no chunk CERTO | ✅ `build/assets/EntrevistaWorkspace-HRBEpQFb.js` (lazy `/rh/*`) |
| Marcador no índice eager | ✅ **0 ocorrências** em `index-FfswZsZD.js` — o falso negativo do CLAUDE.md, medido nos dois lados em vez de assumido |
| Selo no chunk | ✅ `build/assets/ProvenienciaIABadge-DUdFjuJR.js` |
| `git push origin main` | ✅ `3a9bc6ca..2a191b80` |
| `git log --oneline origin/main..HEAD` | ✅ **vazio**; `origin/main` = `HEAD` = `2a191b80` |
| Crawler, marcador do plano | ✅ `PRESENTE em PROD: transcricao-tipo-seletor` |
| Crawler, marcador do selo | ✅ `PRESENTE em PROD: proveniencia-ia-badge` |

⚠ **A primeira execução do crawler falhou — e a causa era a Vercel, não o código.** Rodado
~40 s depois do push, deu `AUSENTE em PROD: transcricao-tipo-seletor`. O poll seguinte achou
na **primeira tentativa**. Registro isto porque o sintoma de «build ainda não terminou» é
IDÊNTICO ao de «o marcador não entrou no bundle», e os dois pedem ações opostas (esperar ×
investigar). O plano avisa dos 20-30 s; medido aqui foi um pouco mais. Quem rodar o crawler
imediatamente após o push deve tratar o primeiro `AUSENTE` como inconclusivo e repetir antes
de concluir qualquer coisa — é a mesma classe do §L do PATTERNS (o instrumento antes do
veredito).

## Deviations from Plan

### Auto-corrigidas

**1. [Regra 3 - Blocker] O `citacoes-render.test.tsx` passava o prop que deixou de existir**

- **Found during:** Task 1, depois de trocar o prop do painel.
- **Issue:** o teste (fora da lista de `files_modified` do plano) monta
  `<TranscricaoReviewPanel analise={...} />` em 5 lugares. Com o painel recebendo `analises`,
  todos renderizariam um painel vazio e as 5 asserções de citação cairiam — um bloqueio real,
  não uma escolha.
- **Fix:** helper `comoVigente(analise)` no próprio teste, embalando a MESMA fixture como a
  vigente, e a fixture ganhou os 5 campos novos. **Nenhuma asserção de citação foi alterada** —
  o que mudou foi por onde a análise entra no componente, e o comentário de proveniência diz
  isso. Considerado e descartado manter o prop `analise` por compatibilidade: seriam duas
  portas para a mesma pergunta.
- **Files modified:** `src/features/entrevista/__tests__/citacoes-render.test.tsx`
- **Verification:** os 6 testes de citação seguem verdes.
- **Commit:** `f2a0c3b9`

**2. [Regra 3 - Blocker] O mock do teste do hook não tinha o export novo**

- **Found during:** Task 1, ao trocar `getAnalise` por `getAnalises` no hook.
- **Issue:** `useEntrevistaScorecard.test.ts` mocka o módulo do serviço inteiro e listava
  `getAnalise`. Um export ausente num módulo mockado estoura no primeiro acesso ao binding —
  latente, e o tipo de falha que aparece três planos depois sem relação aparente com a causa.
- **Fix:** `getAnalises: vi.fn()` acompanhando o import real, com comentário do porquê.
- **Files modified:** `src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts`
- **Verification:** os 2 testes de invalidação do hook seguem verdes.
- **Commit:** `f2a0c3b9`

**3. [Regra 3 - Blocker] A fixture antiga de `AnaliseIABlock.test.tsx` não declarava a proveniência**

- **Found during:** GREEN da Task 2 — `tsc` saltou a **97**.
- **Issue:** ao tornar `provedor_ia`/`modelo_ia` **obrigatórios** em `AnaliseHubRow`, a fixture
  `cheia` (pré-existente, usada em 8 lugares) passou a faltar as duas ⇒ 8 erros `TS2739`, muito
  acima do teto de 90.
- **Fix:** a fixture declara `provedor_ia: null, modelo_ia: null`. **Não** foi afrouxar o tipo
  para opcional: obrigatório-com-`null` é o que faz todo construtor DECLARAR de onde a linha
  veio, e opcionais deixariam «esqueci» indistinguível de «não sei». O compilador cobrando a
  fixture É o mecanismo funcionando.
- **Files modified:** `src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx`
- **Verification:** `tsc` de volta a **89**, conjunto de mensagens idêntico ao baseline.
- **Commit:** `2a191b80`

**4. [Regra 2 - Funcionalidade crítica ausente] O 23514 do `confirmar_revisao_entrevista` dizia a frase errada**

- **Found during:** Task 1, ao ligar a revisão à vigente mais recente.
- **Issue:** o 49-10 deixou nomeado que `mapRpcError` traduz 23514 como «Dados inválidos.
  Verifique os campos.» — e desde o 49-10 esse é o código da recusa «a análise foi superada ou
  falhou». Não há campo errado para o RH conferir; a frase mandaria procurar um defeito que não
  existe, num caso em que o servidor está certo.
- **Fix:** `mapRpcError` ganhou um override **por chamada**, e só `confirmarRevisaoHumana` o
  usa. O `<scope_note>` proibia alargar para todas as RPCs, e com razão: 23514 nas outras
  quatro É validação de campo, então a frase genérica está certa lá.
- **Files modified:** `src/features/entrevista/services/entrevistaService.ts`
- **Verification:** `tsc` 89; os 16 testes de contrato do serviço seguem verdes.
- **Commit:** `f2a0c3b9`

### Registradas (sem alteração de artefato)

**5. [Processo] Parte do `<action>` da Task 2 caiu no commit da Task 1**

- **Issue:** `ENTREVISTA_GUIA_ALLOWLIST` (+ `provedor_ia, modelo_ia`) e os campos em
  `EntrevistaGuiaRow` estão no commit da Task 1, não no da Task 2 — eles entraram na mesma
  edição da allowlist da análise, que é adjacente no arquivo.
- **Consequência:** nenhuma no artefato final; o RED da Task 2 continuou sendo um RED genuíno
  (o selo do guia não existia). Registrado em vez de omitido porque quem ler o histórico
  procurando «onde a allowlist do guia mudou» vai achar no commit anterior ao esperado.

**6. [Processo] Sem commit `refactor` na Task 2**

- **Issue:** o ciclo TDD prevê REFACTOR opcional. Não houve limpeza óbvia a fazer depois do
  GREEN, e a referência diz «only commit if changes made».
- **Consequência:** 2 commits na Task 2 em vez de 3. Um `refactor` vazio seria teatro de
  disciplina.

---

**Total deviations:** 6 — **4 auto-corrigidas** (3 × Regra 3, 1 × Regra 2) e 2 de processo.
**Impact on plan:** nenhum no escopo nem na interface pública. As três de Regra 3 são
consequências mecânicas de trocar um prop e endurecer um tipo — e a **3** vale reter: o
compilador pegou 8 sítios que eu teria de achar à mão, porque o campo foi declarado
obrigatório em vez de opcional. A **4** fecha uma pendência que o plano irmão deixou escrita.

## Deferred (registrado, não consertado)

| Item | Por quê fica fora | Onde |
|---|---|---|
| **`getGuia` sem filtro de `tipo`** — a aba do guia mostra sempre o roteiro mais RECENTE, e das 3 candidaturas com guia **DUAS têm os dois tipos**, então o roteiro da online é inalcançável nelas. O selo que este plano acrescentou herda o problema: diz corretamente qual modelo escreveu o roteiro EXIBIDO, que pode não ser o da entrevista em curso | o plano fixou explicitamente que `getGuia` segue sem filtro (§Deferred, achado não perguntado ao operador) | **WINDOWS 73** (nova) |
| A marcação retroativa de `superada_em` nas 6 análises legadas | é o plano **49-12**, com checkpoint do operador (D-54). A tela já exibe o estado atual honestamente («Superada — data não registrada») e ganha a data sem mudança de código | 49-12 |
| `mapRpcError` traduzindo 23514 genericamente nas OUTRAS quatro RPCs | lá 23514 É validação de campo — a frase genérica está certa. Alargar seria tornar a mensagem errada em quatro lugares | §scope_note |
| **WINDOWS 56** (`motivos_revisao`/`dimensoes_desconhecidas` do SJT gravados e não lidos) | o operador roteou para o **49-17** | WINDOWS 56, aberta |
| **WINDOWS 71/72** (mapas de rótulo Big Five fora da tabela de varredura; o guard não vigia o termo clínico do N) | fora do escopo declarado | WINDOWS 71/72, abertas |
| **WINDOWS 45** (`entrevista_analises`/`entrevista_guias` sem smoke vigiando) | é o **49-18** | WINDOWS 45, aberta |

**WINDOWS 61 marcada `fixed` com o motivo escrito** (1171 caracteres) — é a janela que este
plano existe para fechar. Seguido o **§M do PATTERNS**: a razão foi escrita no **bloco JSON**
(a fonte de verdade) e a célula da tabela **sincronizada lendo o texto de volta do JSON**,
nunca redigitada; `windows status --raw` responde `ok: true`, que é o que prova que os dois
concordam. Confirmado de passagem o defeito que o §M descreve: `windows fixed 61` gravou
`status: fixed` com `reason` **vazia**.

## Known Stubs

**Nenhum.** Varridos os 15 arquivos tocados por
`TODO|FIXME|placeholder|coming soon|not available|não disponível|= \[\]|= \{\}|=""`. Os 9
acertos, um a um:

- 3 são `placeholder` de **atributo de input** / classe Tailwind (`placeholder:text-white/40`)
  — texto de campo vazio, não valor codificado;
- 3 são os **acumuladores** `const vigentes/superadas/falhas: EntrevistaAnaliseRow[] = []` que
  o laço de classificação preenche na mesma função;
- 3 são docblock e **estado vazio pré-existentes** do `AnaliseIABlock` («Análise ainda não
  disponível» é a frase honesta para «não há linha de análise», e a fonte de dados está ligada).

⚠ **Duas coisas que NÃO são stub e parecem:**

1. **`tipoPadraoDaEtapa` devolvendo `null`** fora de etapa de entrevista. Não é um caso
   esquecido — é a decisão de não chutar, e há teste dedicado a ela (`fora de etapa … analisar
   fica bloqueado até o RH escolher`) mais um que percorre as 5 etapas não-entrevista.
2. **A frase «Superada — data não registrada»** nas 5 legadas. Não é placeholder esperando
   dado: é a única afirmação verdadeira disponível hoje (`superada_em` é NULL nas 6 linhas de
   PROD, medido). Exibir `created_at` ali seria trocar um registro ausente por um falso.

## Threat Flags

Nenhuma superfície nova: nenhum endpoint, nenhum caminho de auth, nenhuma mudança de esquema,
nenhuma migration, nenhum pacote instalado.

| Threat | Disposição | Prova |
|---|---|---|
| T-49-16-01 (RH lendo análise superada/falha como vigente) | mitigate | leitura por vigência com o predicado do banco transcrito uma vez; 6 testes (falha mais nova não vira vigente; uma vigente por tipo; grupo sem tipo; superadas com data; legada sem data; falha como falha) |
| T-49-16-02 (colunas técnicas/de funcionário no navegador) | mitigate | teste NEGATIVO explícito: `ai_call_log_id` e `solicitado_por` fora da allowlist; as três allowlists sem curinga; teste negativo novo também na do hub (`resumo_cv`/`resumo_respostas`/`erro`) |
| T-49-16-03 (revisão oferecida sobre análise que a RPC não grava) | mitigate | 3 testes (o id da vigente mais recente é o passado; o da superada NÃO é; a superada não tem botão nenhum); e a RPC recusa desde o 49-10, agora com a frase certa na tela |
| T-49-16-SC (supply chain) | mitigate | **zero** instalação de pacote; o único import novo é um componente local do próprio repositório |

RNF-07a intacta: nenhuma escrita em `candidaturas`, nenhum avanço de funil, nenhuma rejeição
automática. O CTA «Avançar etapa» segue desabilitado com o tooltip nomeando a decisão final.
O disclaimer NEGADO do rodapé da devolutiva (exceção decidida no CLAUDE.md) não foi tocado, e
o guard `forbidden-strings.grep.test.ts` passa com o texto novo — mais um teste próprio no
painel varrendo 4 radicais clínicos no DOM renderizado.

## Issues Encountered

- **`tsc` em 89 contra teto 90 (D-53): margem de UM, e este plano tocou 15 arquivos de front
  (o maior da fase).** Zero erro acrescentado, e o **conjunto de mensagens** foi conferido por
  `diff` das 89 linhas ordenadas depois de CADA task — não só a contagem, como o
  `<known_blocker>` pediu. O RED esteve em 91 por construção (registrado acima). A baseline
  congelada do hook é 96 e **não pega o 90º**.
- **A primeira execução do crawler deu `AUSENTE` e a causa era a latência da Vercel.**
  Registrado como aprendizado acima: o primeiro `AUSENTE` imediatamente após o push é
  inconclusivo, não um veredito.
- **As 6 análises de PROD são todas do grupo sem tipo**, então `bf26ee3c` passa a exibir 1
  vigente + 3 «Superada — data não registrada». Isso é o conserto funcionando (antes ela
  exibia a 4ª como se fosse a única análise existente), mas é uma mudança visível na tela do
  RH que vale conferir em UAT.
- **`resend-webhook.test.ts`** continua abortando ao resolver `npm:svix@1.99.1` — pré-existente
  (WINDOWS 46), do lado Deno, fora do escopo deste plano, que não rodou suíte Deno nenhuma.

## Next

- **49-12** (retroativos): tem agora um consumidor visível da marcação. Quando `superada_em`
  for gravado nas legadas, a tela troca «Superada — data não registrada» pela data **sem
  nenhuma mudança de código** — e o número de linhas afetadas é 5 (medido).
- **49-17** (WINDOWS 56, o SJT): o idioma deste plano serve de precedente — allowlist ganha as
  colunas, o componente as lê, e o teste NEGATIVO (o que NÃO pode ser projetado) entra na
  mesma edição.
- **49-18** (`p49_prova_prod`): dois invariantes de FORMA para vigiar, nenhum deles contagem
  que envelhece — (a) nenhuma candidatura com duas linhas vigentes do MESMO `tipo` (hoje o
  grupo sem tipo de `bf26ee3c` viola, e é o que o 49-12 conserta); (b) nenhuma análise com
  `superada_em` preenchida e `revisao_confirmada_em` apagado (superar é marcar, não apagar).
- **49-22** (decisão final): o selo já está nas cinco telas de resultado de IA menos a dela; o
  `ProvenienciaIABadge` é o mesmo componente, e o padrão de leitura (allowlist + `?? null`)
  está nas duas allowlists que este plano tocou.
- **Quem tocar a aba do guia:** **WINDOWS 73** — `getGuia` sem filtro de tipo. É a mesma classe
  do defeito que este plano consertou na aba vizinha, um nível ao lado.

## Self-Check: PASSED

- `src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx` — FOUND
- `src/features/entrevista/components/TranscricaoReviewPanel.tsx` — FOUND
- `src/features/entrevista/services/entrevistaService.ts` — FOUND
- `src/features/hub-candidato/components/AnaliseIABlock.tsx` — FOUND
- commits `f2a0c3b9`, `9c4f2537`, `2a191b80` — os três FOUND em `git log --all` e os três já em
  `origin/main`
- `commits: 3` **MEDIDO** por `git rev-list --count 3a9bc6ca..HEAD`; `plan_head_before`
  registrado; `tokens` = octetos de diff ÷ 4, com o erro de 4,0× escrito em vez de suavizado
- `<precondition>` da Task 1 verificada **só por leitura, sem side effect**, antes de qualquer
  escrita: `rpc("registrar_analise_entrevista"` ×2 no disco + version=18 ACTIVE relida da
  Management API pelo 49-26 hoje
- nenhuma deleção de arquivo no intervalo (`git diff --diff-filter=D` vazio); nenhum arquivo
  untracked; `git status --short` limpo além dos metadados que vão no commit de fecho
- `must_haves.artifacts` conferidos por padrão: `transcricao-tipo-seletor` ×1 no painel,
  `superada_em` ×9 no service, `ProvenienciaIABadge` ×3 no `AnaliseIABlock`
- `must_haves.key_links` conferidos: o body `{candidatura_id, transcricao, tipo}` com `tipo` no
  literal, e a allowlist com `superada_em`
- `<acceptance_criteria>` das duas tasks re-executados: service lendo por vigência numa
  consulta e mandando `tipo`; testes de allowlist e contrato mudados COM comentário de
  proveniência; aba com seletor/vigente/superadas-com-revisão/falhas; revisão só na vigente
  mais recente; avisos de `reaproveitada`/`falhou`; guia e análise da triagem com selo;
  allowlists sem curinga; `vitest` e guards verdes; `tsc` ≤ 90; marcador no build e no ar;
  `origin/main..HEAD` vazio
- `<verification>` de plano re-executada: 38 arquivos / 401 testes nas três features + guards;
  suíte completa 216/2288; `tsc` 89 com conjunto idêntico; os DOIS marcadores presentes no
  chunk lazy correto E lidos de volta do site vivo; `origin/main` = `HEAD` = `2a191b80`
- varredura de FORMA nos smokes: **sem alvo** (0 arquivos `.sql`), declarado em vez de omitido
- PATTERNS **§K** respeitado: nenhuma afirmação retirada foi reproduzida verbatim — as
  descrições dos três defeitos consertados estão em prosa, e o guard `forbidden-strings` passa
- PATTERNS **§M** seguido ao fechar a WINDOWS 61: razão no bloco JSON, célula da tabela
  sincronizada por leitura de volta, `windows status --raw` ⇒ `ok: true`. E o defeito da
  ferramenta confirmado de novo (`reason` nasce vazia)
- PATTERNS **§L** aplicado ao diagnóstico do crawler: o primeiro `AUSENTE` foi tratado como
  medição do INSTRUMENTO (a Vercel ainda construindo) e não como veredito sobre o bundle
- `requirements.mark-complete` **NÃO** executado: `requirements.ready-ids` devolveu 0/2 —
  planos irmãos desta fase também declaram JORN-12/JORN-28 e ainda não terminaram (portão de
  ID compartilhado, #2388). Correto, não uma omissão
- **Todos** os critérios de aceite do plano satisfeitos.

---
*Phase: 49-consertos-da-jornada-bloco-2*
*Completed: 2026-09-23*
