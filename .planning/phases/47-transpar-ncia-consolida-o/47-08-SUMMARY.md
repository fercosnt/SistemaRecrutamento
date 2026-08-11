---
phase: 47-transpar-ncia-consolida-o
plan: 08
subsystem: frontend
tags: [compliance, lgpd, transparencia, alcancabilidade, rodape, alvo-tatil, vitest, react]

requires:
  - phase: 47-transpar-ncia-consolida-o
    provides: "SubprocessadoresPage + a rota /subprocessadores, com os seis países medidos em 2026-08-11 (47-04)"
  - phase: 47-transpar-ncia-consolida-o
    provides: "PrivacidadePublicaPage + a rota /privacidade, derivada e datada (47-06)"
  - phase: 47-transpar-ncia-consolida-o
    provides: "COPY_TRANSPARENCIA — o molde de bloco de copy por superfície, e o portão de copy do escopo da feature (47-04)"
provides:
  - "src/features/transparencia/components/RodapePublico.tsx — o componente de alcançabilidade: dois links, piso de alvo tátil em cada um, lista de proibições no docblock"
  - "COPY_TRANSPARENCIA.rodape — os dois rótulos verbatim da UI-SPEC + o nome acessível do ponto de referência de navegação"
  - "src/features/transparencia/__tests__/rodapePublico.test.tsx — 17 casos: o contrato dos dois links, o piso estrutural por link, a lista de proibições no DOM e na fonte, a forma, o zero-estado e o docblock"
  - "A ALCANÇABILIDADE: `/privacidade` e `/subprocessadores` passam a ser encontradas a partir da página inicial, da lista de vagas e do detalhe de vaga — o rodapé montado nas cinco superfícies públicas"
  - "src/features/transparencia/__tests__/rodapeMontagem.test.tsx — 9 casos, incluindo a asserção NEGATIVA que exige que o conjunto de arquivos que montam o rodapé seja exatamente as cinco superfícies (reprova a falta e o excesso)"
affects: [47-09-consol-04, publicacao-das-duas-rotas-publicas]

actuals:
  tokens: 8300
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Piso de alvo tátil asserido no PRÓPRIO elemento acionável e acompanhado da caixa que o torna eficaz: `min-height` numa âncora `inline` é ignorado pelo CSS, então a classe sozinha é uma asserção que passa enquanto o defeito persiste"
    - "Tratamento repetido de propósito, com o motivo escrito ao lado: uma constante compartilhada deixaria um portão de CONTAGEM de fonte vendo um piso só, e um link novo sem piso passaria despercebido"
    - "Lista de proibições nominal DENTRO do docblock do componente, com o portão varrendo o código sem os comentários — a documentação da proibição não pode ser a primeira violação dela"

key-files:
  created:
    - src/features/transparencia/components/RodapePublico.tsx
    - src/features/transparencia/__tests__/rodapePublico.test.tsx
    - src/features/transparencia/__tests__/rodapeMontagem.test.tsx
  modified:
    - src/features/transparencia/constants/copyTransparencia.ts
    - src/features/transparencia/index.ts
    - src/components/pages/LandingPage.tsx
    - src/components/pages/VagasPublicasPage.tsx
    - src/components/pages/VagaDetalhePage.tsx
    - src/features/transparencia/components/SubprocessadoresPage.tsx
    - src/features/transparencia/components/PrivacidadePublicaPage.tsx

key-decisions:
  - "O portão de publicação foi liberado pelo OPERADOR (Fernando) em 2026-08-11, após revisão das duas páginas públicas. A revisão formal do Encarregado permanece item ABERTO e rastreável — não foi exercida, e este SUMMARY não a declara exercida"
  - "A Task 3 (a montagem nas cinco superfícies) foi executada DEPOIS da liberação, nunca antes: a ordem das tarefas era o portão e ela foi respeitada"
  - "A lista pública vai ao ar com DOIS destinos de rede pendentes de classificação (achado do 47-09): `api.ipify.org` e `www.youtube.com`. Eles NÃO foram acrescentados à lista publicada nem tiveram o estado pendente enfraquecido — classificar destino como operador contratado é ato do Encarregado"
  - "O link cruzado que já existia dentro do painel das duas páginas novas foi MANTIDO ao lado do rodapé: removê-lo editaria linhas de 47-04/47-06 e reprovaria testes existentes, e a redundância é benigna"
  - "O nome acessível do ponto de referência de navegação entra na constante de copy e NÃO é um terceiro link: sem ele, o rodapé e a navegação de topo das páginas de conversão viram dois pontos de referência indistinguíveis para leitor de tela"
  - "O tratamento dos dois links é repetido em vez de extraído para constante — a contagem de fonte é o portão, e ela precisa encontrar uma ocorrência POR LINK"
  - "O registro de que o componente não está montado ficou no barrel da feature, não só neste SUMMARY: o SUMMARY sai de contexto, o comentário fica"

patterns-established:
  - "Componente de alcançabilidade entregue COMPLETO e deliberadamente desmontado: a engenharia atravessa o portão de publicação, a navegação não"
  - "Asserção de montagem NEGATIVA por varredura de árvore: o conjunto de arquivos que montam o componente é comparado por igualdade com a lista prevista, o que reprova tanto a superfície esquecida quanto a superfície indevida"
  - "Registro de aprovação com o AUTOR nomeado e o item não exercido mantido aberto ao lado: quem aprovou é fato do registro, e um portão liberado por A não vira portão exercido por B"

requirements-completed: [TRANSP-01, TRANSP-02]

coverage:
  - id: D1
    description: "O rodapé renderiza exatamente dois links, com os rótulos vindos da constante de copy, na ordem da especificação e apontando para as duas rotas públicas"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(1)..(5)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cada link carrega o piso de alvo tátil de 44px no próprio elemento acionável, com a caixa que torna o piso eficaz — o modo de falha mais provável da fase, invisível em teste de texto"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(6), (7)"
        status: pass
      - kind: other
        ref: "guard automático do 47-08-PLAN.md Task 2 — 2 links, 2 pisos, zero posicionamento fixo"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nenhum item da lista de proibições aparece no DOM renderizado nem no código fora de comentário: sem marca, sem canal de contato, sem rede social, sem direitos autorais, sem terceiro link"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(8)..(10)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A forma: separado por linha divisória, empilhado abaixo do ponto de quebra e lado a lado acima dele, nunca fixo nem grudado nem sobreposto"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(11)..(13)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Zero estado, zero consulta, zero render assíncrono, e o docblock registra que ele é um rodapé de alcançabilidade e lista nominalmente o que é proibido nele"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapePublico.test.tsx#(14)..(17)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A revisão do Encarregado — o portão de PUBLICAÇÃO das duas páginas, antes de qualquer navegação de produção apontar para elas"
    requirement: TRANSP-02
    verification:
      - kind: manual_procedural
        ref: "47-08-PLAN.md Task 1 — quatro itens de revisão; 47-CONTEXT §Área 5"
        status: pass
    human_judgment: true
    rationale: "LIBERADO PELO OPERADOR (Fernando) em 2026-08-11, após revisão das duas páginas públicas. ⚠ A revisão formal do ENCARREGADO permanece item ABERTO e rastreável — não foi exercida, e este registro não a declara exercida. A distinção é o próprio objeto desta fase: um portão liberado pelo operador não é um parecer do Encarregado, e registrá-lo como tal seria a classe exata de registro falso que este milestone existe para eliminar. Nenhum teste pode revisar uma declaração pública de transferência internacional; cinco das seis empresas contratadas tratam os dados nos Estados Unidos enquanto todos os candidatos são brasileiros."
  - id: D7
    description: "A montagem do rodapé nas três rotas de conversão e nas duas páginas novas (Task 3)"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/rodapeMontagem.test.tsx#(1)..(9)"
        status: pass
      - kind: other
        ref: "guard automático do 47-08-PLAN.md Task 3 — cinco superfícies montadas, zero linha removida nas três páginas de conversão"
        status: pass
    human_judgment: false
  - id: D8
    description: "Dois destinos de rede sem ficha publicada nem decisão registrada (`api.ipify.org`, `www.youtube.com`) — achado do 47-09, que vai ao ar JUNTO com a lista, em estado pendente"
    requirement: TRANSP-01
    verification:
      - kind: manual_procedural
        ref: "47-09-SUMMARY.md — varredura de destinos de rede; src/services/logAccessService.ts:110; src/components/pages/InstrucoesFormularioPage.tsx:77"
        status: unknown
    human_judgment: true
    rationale: "ABERTO por desenho. Classificar um destino de rede como operador contratado é ato do Encarregado, não do executor. Os dois seguem `pendente-de-decisao` com fato medido e rota registrados, sem enfraquecimento — e a lista publicada NÃO os inclui. O fato de a publicação acontecer com duas pendências viaja junto com a lista, em vez de ser descoberto depois."

duration: 14min + 12min (Task 3)
completed: 2026-08-11
status: complete
---

# Phase 47 Plano 08: `RodapePublico` — o componente que torna as duas páginas encontráveis, agora montado nas cinco superfícies públicas

**O rodapé de alcançabilidade existe, tem exatamente dois links com o piso de alvo tátil provado estruturalmente, e está montado nas cinco superfícies públicas — a partir da liberação do portão de publicação pelo OPERADOR em 2026-08-11. `/privacidade` e `/subprocessadores` deixam de existir e passam a ser ENCONTRADAS.**

## ⚠ O REGISTRO DA APROVAÇÃO — E A DISTINÇÃO QUE ELE PRESERVA

> Aprovado pelo **operador (Fernando)** em **2026-08-11**, após revisão das duas páginas públicas.
> A revisão formal do **Encarregado permanece como item aberto e rastreável** — não foi exercida.

**Este SUMMARY não afirma, em lugar nenhum, que as páginas foram aprovadas pelo Encarregado.** O
operador reviu as duas páginas e escolheu liberar a publicação como **ato dele**, mantendo a revisão
formal do Encarregado aberta. Registrar essa liberação como parecer do Encarregado seria a classe
exata de registro que excede o fato — e é precisamente o defeito que este milestone existe para
eliminar. Um portão liberado por A não vira portão exercido por B porque a publicação aconteceu.

O que continua **aberto**, portanto, é a revisão formal dos quatro itens abaixo por parte do
Encarregado. As páginas estão publicadas; o parecer formal, não.

## ⚠ A LISTA VAI AO AR COM DOIS DESTINOS PENDENTES DE CLASSIFICAÇÃO

O plano 47-09 varreu o repositório atrás de destinos de rede e encontrou **dois** que não têm ficha
publicada **nem** decisão registrada:

| Destino | Onde | O que o terceiro recebe |
|---|---|---|
| `api.ipify.org` | `src/services/logAccessService.ts:110` | o navegador do próprio usuário pede o IP dele; o terceiro recebe o endereço de origem. Caminho vivo via `useSessionTimeout` |
| `www.youtube.com` | `src/components/pages/InstrucoesFormularioPage.tsx:77` | iframe embutido; o navegador do visitante pede direto ao terceiro, que recebe origem e referenciador |

Eles são **estruturalmente idênticos ao serviço de CEP**, que a lista publicada **incluiu**. O 47-09
deixou os dois deliberadamente em `pendente-de-decisao`, com fato medido e rota registrados, porque
classificar um destino como operador contratado é **ato do Encarregado**.

**Este plano não os acrescentou à lista publicada e não removeu nem enfraqueceu o estado pendente
deles.** O escopo desta tarefa era a montagem. Mas o fato precisa viajar **junto com** a publicação
em vez de ser descoberto depois: **a lista pública foi ao ar com dois destinos ainda por
classificar.**

## Os quatro itens da revisão formal — o material que o Encarregado ainda precisa ver

O portão tem **quatro itens**, e o primeiro deles mudou de natureza desde que o plano foi escrito.

### 1 · Os seis países — **cinco das seis tratam os dados nos Estados Unidos**

Os países foram **medidos** pelo operador em 2026-08-11 (fecho da Task 3 de 47-04). O bloqueio de
**fato** acabou; o que ele revelou é material para esta revisão:

| Empresa | País declarado na página | Como foi medido |
|---|---|---|
| Supabase | Estados Unidos | painel do projeto, região `us-east-1` |
| Vercel | Estados Unidos | painel do projeto, região `iad1` (Washington, D.C.) |
| OpenAI | Estados Unidos | padrão do fornecedor — a região nunca foi configurada na conta |
| Anthropic | Estados Unidos | política pública do fornecedor |
| Resend | Estados Unidos | DPA, citação literal |
| ViaCEP | Brasil (jurisdição do serviço; hospedagem não divulgada) | documentação do fornecedor |

**Todos os candidatos são brasileiros.** Com cinco das seis tratando os dados nos Estados Unidos, a
página está declarando **transferência internacional em quase toda a cadeia**. Isso não é um detalhe
de rodapé da revisão: é o núcleo dela. O que o Encarregado decide aqui é se a página declara esse
fato da forma correta e se a base legal citada em cada entrada sustenta a transferência.

Há também um achado de método que vale registrar para a revisão: antes da medição existia um indício
à mão — o fuso horário do banco em produção é `America/Sao_Paulo` — e ele foi **recusado** como prova
de região. A medição provou que a região real é `us-east-1`. Se o indício tivesse sido aceito, a
página afirmaria que os dados de candidatos brasileiros ficam no Brasil, o que é falso, e nenhum
teste teria pego.

### 2 · A formulação do provedor de hospedagem

Para conteúdo estático servido por rede de borda global, "um país" pode não ser a resposta honesta. A
alternativa é descrever o **fato** — rede de distribuição global, com a empresa e a jurisdição
nomeadas. Isso **muda a forma do campo**, e a regra de que nenhuma entrada embarca com o campo
indefinido continua valendo nas duas formas. Decisão do Encarregado, não de quem executa.

### 3 · A qualificação do serviço público de CEP

Ele recebe o CEP digitado e o endereço de origem do navegador do candidato. Se o Encarregado decidir
que ele **não** é empresa contratada tratando dados em nome da Beauty Smile, a entrada sai da lista
**e a decisão fica registrada em comentário no arquivo** — omitir em silêncio é o proibido.

### 4 · A copy das duas páginas, com atenção a três frases

- a que descreve o que os provedores de IA recebem — ela enumera as classes que o mascarador
  comprovadamente remove e **não** afirma ausência de identificação, porque o mascaramento não
  alcança nome próprio digitado em texto livre;
- a que explica como a página de privacidade é feita — ela **não** promete regeneração automática;
- o carimbo de vigência — ele carrega a data de **medição** da matriz viva, não a data do build.

### O que a Task 3 fez depois da liberação

`<RodapePublico />` foi montado como **último filho do container existente** nas cinco superfícies,
com a regra de não-regressão cumprida ao pé da letra: **zero linha removida** nas três páginas de
conversão e exatamente **2 linhas adicionadas** em cada uma — o import e a montagem, nada mais.

| Superfície | Caminho | Adicionadas | Removidas |
|---|---|---|---|
| Página inicial | `src/components/pages/LandingPage.tsx` | 2 | **0** |
| Lista de vagas | `src/components/pages/VagasPublicasPage.tsx` | 2 | **0** |
| Detalhe de vaga | `src/components/pages/VagaDetalhePage.tsx` | 2 | **0** |
| Subprocessadores | `src/features/transparencia/components/SubprocessadoresPage.tsx` | 2 | **0** |
| Privacidade pública | `src/features/transparencia/components/PrivacidadePublicaPage.tsx` | 2 | **0** |

Medido por `git diff --numstat`, não afirmado — o guard do plano reprova qualquer remoção e qualquer
adição acima de 3 linhas nas três páginas de conversão, e passou.

## Performance

- **Duração:** ~14 min (Tasks 1-2) + ~12 min (Task 3)
- **Iniciado:** 2026-08-11T00:44Z
- **Portão liberado pelo operador:** 2026-08-11
- **Concluído:** 2026-08-11T01:25Z
- **Tarefas:** 3 de 3 — o portão foi liberado e a montagem correu **depois** dele, nunca antes
- **Arquivos criados/modificados:** 10
- **Dependência npm nova:** 0

## Accomplishments

- **O componente existe e é completo.** Dois links, os rótulos vindos da constante, destinos
  corretos, ordem da especificação, tratamento visual idêntico entre eles.
- **O modo de falha mais provável da fase está travado por asserção estrutural, e por duas.** O piso
  de 44px é asserido em **cada** link, no **próprio elemento acionável** — não num contêiner
  ancestral, porque um ancestral alto com uma âncora baixa dentro dele passa em qualquer asserção de
  contêiner e continua sendo impossível de acertar com o polegar. E a asserção exige também a caixa
  `flex`: `min-height` numa âncora `inline` é **ignorado pelo CSS**, então a classe sozinha seria uma
  asserção que passa enquanto o defeito persiste.
- **A lista de proibições é executável, não uma nota.** Marca, canal de contato, rede social,
  direitos autorais, boletim e qualquer terceiro link são asseridos ausentes **no DOM renderizado** e
  **no código fora de comentário**. "Completar" o rodapé passa a ser um teste vermelho em vez de uma
  discussão de gosto.
- **A proibição está escrita onde a próxima pessoa lê antes de editar** — no docblock do componente,
  nominalmente. E o portão varre o código **sem** os comentários, porque um grep sobre o arquivo
  inteiro reprovaria a documentação da própria proibição: o defeito de portão auto-invalidante que
  este projeto já pagou duas vezes (Phases 43 e 44).
- **O rodapé não é fixo, grudado nem sobreposto**, asserido nas classes e na fonte. Um rodapé grudado
  comeria dobra numa tela de 320px — numa superfície mobile-first isso é conteúdo perdido.
- **O portão de publicação foi respeitado sem ser enfraquecido.** Nem auto-satisfeito, nem contornado
  por uma montagem parcial "que não publica nada" — e a montagem só correu **depois** da liberação.
- **A alcançabilidade está fechada, e a asserção é dos dois lados.** O caso (8) do novo arquivo varre
  a árvore de fontes e exige que o conjunto de arquivos que montam o rodapé seja **exatamente** as
  cinco superfícies. Ele reprova a superfície esquecida **e** a superfície indevida — um rodapé que
  vazasse para uma tela de RH ficaria vermelho na mesma asserção que pega a que faltou.
- **A não-regressão foi medida, não afirmada.** `git diff --numstat` nas três páginas de conversão:
  `2 0`, `2 0`, `2 0`.

## Task Commits

Cada tarefa foi commitada atomicamente, com o hook de pre-commit rodando — **zero `--no-verify`**.

1. **Task 1 (checkpoint: portão de publicação)** — **LIBERADO pelo operador (Fernando) em
   2026-08-11**, após revisão das duas páginas públicas. Sem commit de código, por natureza: é um
   ato de decisão, e o registro dele é este SUMMARY. **A revisão formal do Encarregado segue
   aberta.**
2. **Task 2 (TDD): o `RodapePublico`, a copy, o barrel e os 17 casos**
   - `3a86db6` (test) — RED: 14 de 17 casos falhando
   - `2c68c49` (feat) — GREEN: 17/17 no arquivo, 112/112 na feature, 1861/1861 na suíte
3. **Task 3 (TDD): a montagem nas cinco superfícies**
   - `2aaa45c` (test) — RED: 8 de 9 casos falhando. O caso (9), a asserção negativa, já passava —
     nada montava o rodapé em lugar nenhum, que era exatamente o estado a corrigir.
   - `f46b2e7` (feat) — GREEN: 9/9 no arquivo, 121/121 na feature, **1892/1892 na suíte**

## Files Created/Modified

- `src/features/transparencia/components/RodapePublico.tsx` — o componente. O docblock registra em
  três blocos o que ele **é** (alcançabilidade), o que ele **não é** (institucional, com a lista
  nominal de proibições) e as duas propriedades que um teste de texto não vê.
- `src/features/transparencia/__tests__/rodapePublico.test.tsx` — **17 casos, zero snapshot.** Um
  snapshot passaria num rodapé que perdeu o piso de alvo tátil sem mudar de texto.
- `src/features/transparencia/constants/copyTransparencia.ts` — **+1 bloco** com os dois rótulos
  verbatim da UI-SPEC e o nome acessível do ponto de referência. O docblock do bloco declara que ele
  **não cresce**.
- `src/features/transparencia/index.ts` — exporta o componente e **registra as cinco superfícies onde
  ele está montado e onde ele NÃO é montado**, apontando para a asserção que sustenta o conjunto. O
  SUMMARY sai de contexto; o comentário fica.
- `src/features/transparencia/__tests__/rodapeMontagem.test.tsx` — **9 casos, arquivo novo.** Separado
  de `rodapePublico.test.tsx` de propósito: aquele prova que o componente está **correto**, este prova
  que ele está **no lugar**. São asserções diferentes, e a segunda é a que fecha o critério da fase.
- `src/components/pages/LandingPage.tsx` · `VagasPublicasPage.tsx` · `VagaDetalhePage.tsx` — **+2
  linhas cada, 0 removidas.** Import e montagem como último filho do `container mx-auto` existente.
- `src/features/transparencia/components/SubprocessadoresPage.tsx` ·
  `PrivacidadePublicaPage.tsx` — **+2 linhas cada, 0 removidas.** Montagem como último filho do
  container, abaixo do painel de vidro.

## Decisions Made

- **O nome acessível do ponto de referência de navegação entra na copy, e não é um terceiro link.**
  Sem ele, o rodapé e a navegação de topo das páginas de conversão viram dois pontos de referência
  indistinguíveis para quem usa leitor de tela — o oposto do que um componente de alcançabilidade
  existe para fazer. A proibição da UI-SPEC é sobre itens visíveis e links; o nome de um ponto de
  referência não é nenhum dos dois.
- **O tratamento dos dois links é repetido de propósito.** Ver o desvio 1.
- **Nada foi montado, nem parcialmente.** Ver o desvio 2.

## Deviations from Plan

### 1. [Rule 2 - Missing Critical] O piso de alvo tátil exige a CAIXA, não só a classe

- **Encontrado durante:** Task 2, ao escrever a asserção que o plano chama de "a que carrega o peso".
- **Problema:** `min-height` numa âncora `inline` — o padrão de um `<a>` — é **ignorado pelo CSS**.
  Uma asserção que só verifica a presença de `min-h-[44px]` na classe passaria num link de 20px de
  altura, que é exatamente o defeito que ela existe para pegar. A asserção seria uma cerimônia.
- **Correção:** o caso (6) exige, além do piso, que a classe do link traga `flex`, `inline-flex` ou
  `grid` — a caixa que faz o `min-height` valer. Mesma forma já usada nos links de 47-04 e 47-06.
- **Commit:** `3a86db6` / `2c68c49`

### 2. [Rule 2 - Missing Critical] O tratamento foi REPETIDO nos dois links, não extraído

- **Encontrado durante:** Task 2, no primeiro GREEN — o caso (7) ficou vermelho.
- **Problema:** a primeira versão extraiu a classe para uma constante compartilhada. O componente
  ficou mais limpo e o **portão de contagem de fonte** passou a ver **um** piso em vez de dois. Um
  portão que conta ocorrências para provar "uma por link" perde a capacidade de acusar o link novo
  que nasce sem piso.
- **Correção:** o tratamento é repetido nos dois links, com o motivo escrito em comentário ao lado —
  para que a próxima pessoa que quiser "limpar" a duplicação leia primeiro por que ela existe. O
  caso (6), que mede o DOM link a link, continua sendo a prova forte; o caso (7) é a rede da fonte.
- **Commit:** `2c68c49`

### 3. Desvio de escopo (RESOLVIDO) — a Task 3 esperou o portão, e correu depois dele

No fecho de 2026-08-11T00:58Z a Task 3 **não** havia sido executada, em cumprimento literal da ordem
das tarefas: *"MUST NOT montar o rodapé antes da aprovação"*. Uma montagem **parcial** (só nas duas
páginas novas, "sem publicar nada") foi considerada e recusada na ocasião.

O portão foi **liberado pelo operador em 2026-08-11**, e só então a Task 3 correu. A ordem foi
preservada de ponta a ponta: nenhuma navegação de produção apontou para as duas páginas antes da
liberação.

### 5. [Achado registrado, não refatorado] O link cruzado antigo convive com o rodapé nas duas páginas novas

- **Encontrado durante:** Task 3, ao montar nas duas páginas de transparência.
- **Situação:** `SubprocessadoresPage` já trazia, dentro do painel de vidro, um link para
  `/privacidade` (rótulo *"Ver o que guardamos e por quanto tempo"*), e `PrivacidadePublicaPage` já
  trazia o recíproco. Com o rodapé montado, cada uma passa a ter **dois** caminhos para a página
  irmã, com rótulos diferentes.
- **Por que NÃO foi removido:** remover editaria linhas escritas em 47-04/47-06 e reprovaria o caso
  (9) de `subprocessadoresPage.test.tsx`, que assere o link cruzado pelo rótulo travado. O plano
  manda **registrar achado, não refatorar a página vizinha** — e a redundância é benigna: os dois
  caminhos levam ao mesmo lugar, com piso de alvo tátil nos dois.
- **Consequência:** nenhuma. Fica como item de limpeza opcional para quem revisitar a copy das duas
  páginas.

### 6. [Achado registrado, não refatorado] No detalhe de vaga o rodapé não alcança os estados de carregamento e de 404

- **Encontrado durante:** Task 3, ao mapear o container de `VagaDetalhePage`.
- **Situação:** a página tem **três** retornos — esqueleto de carregamento, `VagaNotFoundState` (404
  anti-enumeração) e o conteúdo. O rodapé foi montado no container do **conteúdo**, que é o único
  container "existente" no sentido do plano. Quem cair num 404 de vaga não vê o rodapé.
- **Por que NÃO foi corrigido:** montar nos três retornos custaria mais de 3 linhas adicionadas e o
  guard de não-regressão reprova — corretamente, porque isso é reestruturar a página, não montar um
  rodapé. O caminho de aquisição principal (inicial → lista → detalhe) está coberto nos três.
- **Consequência:** um visitante que chegue direto a uma URL de vaga inexistente fica sem o caminho
  até as duas páginas **naquela tela**; a lista de vagas, para onde o próprio 404 o convida a voltar,
  tem o rodapé.

### 4. Desvio de forma — o RED é de COMPORTAMENTO, não de compilação

Precedente idêntico ao registrado em 47-04 e 47-06. O `.husky/pre-commit` é portão de **contagem** de
erros de `tsc`, congelada em 97; um RED clássico (módulo inexistente) elevaria a contagem e só seria
commitável com o bypass que o portão do M8 proíbe. O commit RED traz o componente como esqueleto
declarativo — a assinatura existe para o tipo fechar e não faz nada do que promete — e o bloco de
copy, sem o qual o teste não tipa. O RED continua real: **14 de 17 casos falhando**.

---

**Total de desvios:** 2 auto-fixes (funcionalidade crítica ausente), 1 desvio de escopo já resolvido
(o portão), 1 desvio de forma e **2 achados registrados sem refatoração**.
**Impacto no plano:** nenhum scope creep e nenhum afrouxamento. Os dois auto-fixes **endurecem** as
asserções que o plano chama de mais frágeis da fase; os dois achados ficam registrados como o plano
manda, em vez de virarem licença para editar página vizinha.

## Issues Encountered

- **Nada foi aplicado nem deployado.** Zero migration escrita, zero migration aplicada, zero MCP
  chamado por este executor. O plano é write-only por desenho.
- Nenhum `check:*` novo foi criado, então não há portão órfão a cabear no CI — `portoesInvocados`
  continua verde com os mesmos 7 casos.

## Verificação final

| Gate | Resultado |
|---|---|
| `npm run test:run` | **1892 passed / 187 files** (baseline exigida 1883 → **+9**) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada — sem regressão) |
| `<verify>` da Task 2 (suíte da feature + guard de arquivo) | **OK — 121/121 na feature; 2 links, 2 alvos táteis, zero posicionamento fixo** |
| `<verify>` da Task 3 (suíte inteira + guard de montagem + numstat) | **OK — rodapé montado em 5 superfícies, 3 delas sem nenhuma remoção** |
| Regra de não-regressão (`git diff --numstat`) | **`2 0` · `2 0` · `2 0`** nas três páginas de conversão |
| Os cinco `check:*` (`resend-dominio`, `export-allowlist`, `recibo-exclusao`, `matriz-retencao`, `pii-inventory-md`) | **exit 0 nos cinco** |
| `portoesInvocados.test.ts` | **verde — 7/7** |
| Dependência npm nova | **0** |
| `--no-verify` | **0 usos** — o hook rodou e passou nos 4 commits |
| Migration escrita ou aplicada | **0**. **Nada aplicado nem deployado em PROD por este plano** |
| Rodapé montado em navegação de produção | **5 superfícies**, e em nenhuma outra (asserido por igualdade de conjunto) |

## Known Stubs

**Nenhum stub.** O componente é completo: não há campo por preencher, nenhuma seção espera por dado e
nenhum caminho renderiza espaço reservado.

Há **itens abertos declarados**, que são coisa diferente de stubs:

| Item | Onde | Estado |
|---|---|---|
| Portão de PUBLICAÇÃO das duas páginas | 47-08-PLAN.md Task 1 | **LIBERADO pelo operador (Fernando), 2026-08-11** |
| **Revisão formal do Encarregado** (os quatro itens) | 47-08-PLAN.md Task 1 · 47-CONTEXT §Área 5 | **ABERTO e rastreável** — não exercida. As páginas estão publicadas; o parecer formal, não |
| Montagem do rodapé nas cinco superfícies | 47-08-PLAN.md Task 3 | **COMPLETA** — `f46b2e7` |
| Classificação de `api.ipify.org` | `src/services/logAccessService.ts:110` · 47-09 | **`pendente-de-decisao`** — fora da lista publicada, por desenho |
| Classificação de `www.youtube.com` | `src/components/pages/InstrucoesFormularioPage.tsx:77` · 47-09 | **`pendente-de-decisao`** — fora da lista publicada, por desenho |

## Threat Flags

Nenhuma superfície de segurança nova. O componente não lê dado em runtime, não tem estado, não faz
consulta e não expõe identificador interno nenhum. Os mitigadores do `<threat_model>` do plano ficam
assim:

| Ameaça | Estado |
|---|---|
| T-47-08-01 (páginas publicadas sem revisão) | **mitigado pela ordem** — a montagem correu **depois** da liberação do portão, e o registro nomeia quem liberou sem promover a liberação a parecer do Encarregado |
| T-47-08-02 (páginas existentes e inalcançáveis) | **mitigado** — cinco superfícies montadas, com asserção de conjunto que reprova falta e excesso |
| T-47-08-03 (alvo tátil abaixo do piso) | **mitigado** — asserção por link no DOM, com a caixa, mais a contagem na fonte, mais a re-verificação do piso **em cada superfície montada** (caso 7 do novo arquivo) |
| T-47-08-04 (refatoração das páginas de conversão) | **mitigado e medido** — `2 0`, `2 0`, `2 0`. Dois achados que tentariam justificar refatoração foram registrados como achados, não executados |
| T-47-08-05 (rodapé institucional) | **mitigado** — proibições no docblock, asseridas no DOM e na fonte |
| T-47-08-06 (rodapé grudado comendo dobra) | **mitigado** — asserido nas classes e na fonte |
| T-47-08-SC (instalação npm) | **mitigado** — zero dependência nova |

## User Setup Required

**O portão de publicação está liberado; três itens continuam abertos e são de decisão humana:**

1. **A revisão formal do Encarregado** dos quatro itens em §"Os quatro itens da revisão formal". Ela
   **não foi exercida**. As páginas foram publicadas por decisão do operador, e essa distinção está
   registrada de propósito.
2. **A classificação de `api.ipify.org`** — o navegador do usuário pede o próprio IP a um terceiro,
   pelo caminho vivo do `useSessionTimeout`. Entra na lista ou sai com decisão registrada.
3. **A classificação de `www.youtube.com`** — iframe que faz o navegador do visitante pedir direto
   ao terceiro. Mesma decisão.

Para revisar, subir a aplicação (`npm run dev`, porta 3003) e abrir as duas rotas **em aba anônima**.
Agora elas também são alcançáveis por navegação, que é o que mudou:

- `http://localhost:3003/privacidade`
- `http://localhost:3003/subprocessadores`
- ou, pelo caminho do visitante: `http://localhost:3003/` → rodapé → qualquer uma das duas

## Next Phase Readiness

- **O critério SC#1 do ROADMAP — *"qualquer visitante lê"* — está fechado pelo lado da
  alcançabilidade.** Um visitante que chegue à página inicial, à lista de vagas ou ao detalhe de uma
  vaga encontra as duas páginas.
- **Duas classificações de destino de rede seguem pendentes** e viajam junto com a lista publicada,
  em vez de serem descobertas depois. Elas são o próximo item de compliance, não de engenharia.
- **47-09 (CONSOL-04)** não depende deste plano; foi ele quem produziu o achado dos dois destinos.
- **Manutenção:** um terceiro link no rodapé fica **vermelho** no caso (1) de `rodapePublico`; um
  link sem piso de alvo tátil fica vermelho nos casos (6)/(7) de `rodapePublico` e no (7) de
  `rodapeMontagem`; uma superfície que perca o rodapé, ou uma tela interna que ganhe um, fica
  vermelha no caso (8) de `rodapeMontagem`.

## Self-Check: PASSED

Os 3 arquivos declarados como criados e os 7 modificados existem em disco; os 4 commits de tarefa
(`3a86db6`, `2c68c49`, `2aaa45c`, `f46b2e7`) existem em `git log`. A suíte (**1892/1892**), o `tsc`
(**97**), os cinco `check:*` (**exit 0**), o `portoesInvocados` (**7/7**) e os guards automáticos das
Tasks 2 e 3 foram **executados**, não lidos. A regra de não-regressão foi confirmada por
`git diff --numstat HEAD~1 HEAD`: **zero linhas removidas** nas cinco superfícies. Confirmado por
execução que `RodapePublico` **não** é montado em `ManifestoPage.tsx`, em rota de autenticação nem
em qualquer rota interna — o conjunto de arquivos que o montam é exatamente as cinco superfícies.

---
*Phase: 47-transpar-ncia-consolida-o*
*Portão liberado pelo operador e montagem concluída: 2026-08-11*
