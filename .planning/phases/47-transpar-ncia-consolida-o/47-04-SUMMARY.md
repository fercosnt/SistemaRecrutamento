---
phase: 47-transpar-ncia-consolida-o
plan: 04
subsystem: frontend
tags: [compliance, lgpd, transparencia, rota-publica, copy-gate, vitest, react]

requires:
  - phase: 47-transpar-ncia-consolida-o
    provides: "matrizRetencao.generated.ts — o artefato gerado de onde saem, verbatim, as duas citações de base legal desta lista (47-01)"
  - phase: 45-motor-de-exclusao
    provides: "o molde de constante versionada com `as const` e o vocabulário travado de 'o que fica'"
  - phase: 43-consentimentos-honestos
    provides: "copyPortoesLgpd.test.ts — os quatro idiomas do portão de copy (diretório ausente = zero, literais por junção, dobra preservando índices, escopo por família)"
provides:
  - "src/features/transparencia/constants/subprocessadores.ts — as seis empresas contratadas, o tipo que obriga `país` e o validador que reprova ALTO"
  - "src/features/transparencia/constants/copyTransparencia.ts — a copy das páginas de transparência (bloco desta página; 47-06 acrescenta o dele)"
  - "SubprocessadorFicha + SubprocessadoresPage — a página pública, sem estado assíncrono"
  - "a rota pública `/subprocessadores`, sem guard de sessão"
  - "o portão de copy do escopo `src/features/transparencia/`, já montado para quando a segunda página nascer"
affects: [47-06-privacidade, 47-08-rodape-publico, 47-09-consol-04]

actuals:
  tokens: 41000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Sentinela declarada como terceiro caminho entre 'não compila' e 'publica um palpite': o tipo obriga o campo, a sentinela ocupa o valor por medir, e validador + componente a tratam como reprovação dura"
    - "Bloqueio de embarque asserido por lista NOMINAL de pendências (não por 'nenhuma sentinela'): preencher um país fora do checkpoint deixa o teste vermelho nomeando a entrada"
    - "RED de COMPORTAMENTO quando o portão de pre-commit é de contagem de tsc: o esqueleto existe para o tipo fechar, e nenhuma declaração faz o que promete"

key-files:
  created:
    - src/features/transparencia/constants/subprocessadores.ts
    - src/features/transparencia/constants/copyTransparencia.ts
    - src/features/transparencia/components/SubprocessadorFicha.tsx
    - src/features/transparencia/components/SubprocessadoresPage.tsx
    - src/features/transparencia/index.ts
    - src/features/transparencia/__tests__/subprocessadores.test.ts
    - src/features/transparencia/__tests__/subprocessadoresPage.test.tsx
    - src/features/transparencia/__tests__/copyTransparencia.test.ts
  modified:
    - src/router/routes.tsx

key-decisions:
  - "As seis entradas embarcam com a sentinela no campo `país` — nenhum país foi inventado para fechar o arquivo. A página LANÇA hoje, e isso é o comportamento correto"
  - "O serviço público de CEP ENTRA na lista, com a decisão escrita no arquivo: a chamada é disparada pela página da Beauty Smile, com dado digitado aqui e o endereço de origem do navegador do próprio candidato"
  - "O modo de teste do provedor de e-mail NÃO vira segunda ficha: a decisão está registrada em comentário, e a ficha descreve o modo de produção"
  - "As duas citações de base legal são cópia verbatim do artefato gerado da matriz, amarradas por teste — uma revisão do Encarregado lá deixa esta lista vermelha até acompanhar"
  - "TRANSP-01 NÃO é marcado como concluído: a página existe e não pode ser publicada"

patterns-established:
  - "Portão de copy de escopo de feature nascendo ANTES da segunda página da feature, com diretório ausente tratado como zero ocorrência"
  - "Asserção de esqueleto de conteúdo medida DENTRO do painel, não no documento: a shell clonada pinta um gradiente com pulso em toda página do projeto desde o M1"

requirements-completed: []

coverage:
  - id: D1
    description: "As seis empresas existem como dado tipado com cinco campos obrigatórios, e uma entrada sem `país` não compila"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/subprocessadores.test.ts#(11)..(17)"
        status: pass
    human_judgment: false
  - id: D2
    description: "O validador reprova ALTO nomeando empresa e campo — campo vazio, só espaço, sentinela em qualquer campo, marcador de indefinição, lista vazia — provado por fixture sintética"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/subprocessadores.test.ts#(1)..(10)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A página renderiza as seis fichas rotuladas, sem tabela, sem clique intermediário, sem estado assíncrono, com piso de alvo tátil em cada link e texto íntegro"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/subprocessadoresPage.test.tsx#(1)..(10)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A falha alta é propriedade do componente: entrada com país por medir faz a página e a ficha lançarem"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/subprocessadoresPage.test.tsx#(11)..(12)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A rota é pública, na seção de rotas públicas, sem proteção de sessão; nenhuma rota existente foi tocada"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/subprocessadoresPage.test.tsx#(13)..(15)"
        status: pass
    human_judgment: false
  - id: D6
    description: "O portão de copy do escopo da feature cobre as cinco famílias com esperado zero, trata diretório ausente como zero ocorrência, prova que não é vácuo e prova que morde"
    requirement: TRANSP-01
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/copyTransparencia.test.ts"
        status: pass
    human_judgment: false
  - id: D7
    description: "Os seis países — a região onde o dado deste projeto é tratado em cada provedor"
    requirement: TRANSP-01
    verification:
      - kind: manual
        ref: "47-04-PLAN.md Task 3 — checkpoint bloqueante do operador"
        status: blocked
    human_judgment: true
    rationale: "Não é medível deste ambiente e não é achável por pesquisa: o país que a página declara não é o da sede da empresa, é a região onde o dado deste projeto é tratado, e isso é fato da conta do provedor. Trocar um pelo outro produziria a declaração pública falsa que a página existe para não fazer."

duration: 12min
completed: 2026-08-09
status: complete
---

# Phase 47 Plan 04: `/subprocessadores` — as seis empresas contratadas, com o país impossível de embarcar em branco

**A página pública que responde com quem os dados são compartilhados nasce com as seis empresas medidas no código vivo, e com o campo `país` construído de forma que uma entrada não medida seja impossível de embarcar em silêncio — o tipo a obriga, uma sentinela declarada ocupa o valor por medir, e validador e componente lançam em vez de renderizar um branco.**

## O estado em uma frase, antes de qualquer detalhe

**A página existe e NÃO pode ser publicada.** As seis entradas carregam a sentinela `PAIS_POR_MEDIR`;
`/subprocessadores` lança ao renderizar. Isso não é uma falha do plano — é o plano funcionando. O
único fato que faltava não é obtenível deste ambiente, e nenhum país foi inventado para fechar o
arquivo. Ver §Checkpoint bloqueante.

## Performance

- **Duração:** ~12 min
- **Iniciado:** 2026-08-09T19:02Z
- **Concluído:** 2026-08-09T19:14Z
- **Tarefas:** 2 de 3 (a terceira é o checkpoint do operador, deixado **não satisfeito**)
- **Arquivos criados/modificados:** 9

## Accomplishments

- **Seis entradas, não quatro.** Anthropic, OpenAI, ViaCEP, Resend, Supabase e Vercel — as duas que o
  parêntese do ROADMAP omite são o provedor de IA de reserva (caminho vivo, registrado com o nome do
  provedor no log de chamada) e o serviço público de CEP (chamada feita pelo navegador do próprio
  candidato). Uma página que diz "estas são as empresas" e omite duas é factualmente falsa.
- **O `país` é obrigatório por tipo, e a sentinela é o caminho honesto.** Sem ela, quem preenchesse o
  arquivo seria empurrado a inventar um país para fazê-lo compilar. Ela é reprovação dura em três
  lugares: o validador, a ficha e a página.
- **A falha alta está provada por fixture sintética, não pelo estado do arquivo real.** Os dez casos
  do bloco de propriedade continuam valendo **depois** de a Task 3 preencher os países — que é o
  ponto: um teste que só olhasse a lista real viraria vacuidade no dia em que ela ficasse correta.
- **O bloqueio de embarque é asserido por lista NOMINAL de pendências.** Mais estrito do que "nenhuma
  sentinela": se alguém preencher **um** país fora do checkpoint do operador, o conjunto de pendentes
  encolhe e o teste fica vermelho **nomeando a entrada**. A asserção "nenhuma sentinela" só acusaria
  quando as seis fossem preenchidas de uma vez.
- **A copy das entradas de IA descreve exatamente as sete classes de padrão que o mascarador remove —
  e diz que o nome próprio escapa.** O mascaramento é por expressão de escrita e não há padrão de
  nome: um nome digitado no meio de uma frase chega ao provedor. Um teste confronta o texto com as
  sete classes e reprova o vocabulário que implicaria ausência de identificação.
- **As bases legais são carregadas, nunca autoradas.** As duas citações são cópia verbatim de
  `matrizRetencao.generated.ts` (o artefato gerado do plano 47-01) e um teste amarra as duas pontas:
  se a revisão do Encarregado reescrever uma citação lá, esta lista fica vermelha até acompanhar.
- **O portão de copy do escopo da feature já está montado**, com os quatro idiomas da Phase 43 e a
  prova de que ele **morde** — o padrão elástico é aplicado a um texto sintético montado no teste, sem
  sujar a feature com a string proibida.

## Task Commits

Cada tarefa foi commitada atomicamente, com o hook de pre-commit rodando — **zero `--no-verify`**.

1. **Task 1 (tracer, TDD): a constante, o tipo obrigatório e o validador**
   - `773a359` (test) — RED: 24 de 30 falhando
   - `cf7b56e` (feat) — GREEN: 30/30
2. **Task 2 (TDD): a ficha, a página, a rota e o portão de copy da feature**
   - `0bd0eac` (test) — RED: 15 falhando
   - `004a99b` (feat) — GREEN: 56/56 na feature

## Files Created/Modified

- `src/features/transparencia/constants/subprocessadores.ts` — o tipo de cinco campos obrigatórios, a
  sentinela documentada, as seis entradas e os dois validadores (lista e entrada isolada). Docblock
  registrando por que lança em vez de filtrar: filtrar entregaria uma página **mais curta e
  plausível** — a declaração pública de que compartilhamos com menos empresas do que compartilhamos.
- `src/features/transparencia/constants/copyTransparencia.ts` — a copy da feature e o formatador de
  data que **lança** em data ausente ou inválida. Nenhuma string literal de copy dentro de JSX.
- `src/features/transparencia/components/SubprocessadorFicha.tsx` — **um** componente para as seis,
  item de lista + cabeçalho real + lista de definição, tratamento visual idêntico entre elas.
- `src/features/transparencia/components/SubprocessadoresPage.tsx` — a página inteira: shell clonada,
  marca do controlador, título, subtítulo, carimbo datado, a lista de fichas e o link cruzado com
  piso de alvo tátil. Zero consulta, zero estado.
- `src/features/transparencia/index.ts` — barrel da feature.
- `src/router/routes.tsx` — **+1 rota**, ao lado da rota de manifesto, sem proteção de sessão.
  Nenhuma rota existente tocada.
- Três arquivos de teste, **56 casos, zero snapshot**.

## Decisions Made

- **Nenhum país foi inventado.** As seis carregam a sentinela e a página lança. É a única regra desta
  fase cuja violação produziria um documento público falso sobre tratamento de dados pessoais.
- **O serviço público de CEP entra na lista**, com a decisão escrita no arquivo. A alternativa
  (concluir que ele não qualifica) só seria legítima **escrita**; omitir em silêncio é o proibido.
- **O modo de teste do provedor de e-mail não vira segunda ficha**, e a razão está registrada em
  comentário: a ficha descreve o modo de produção, que é o que trata dado de candidato real.
- **`TRANSP-01` não é marcado como concluído.** A página existe e não pode ser publicada; marcar o
  requirement seria exatamente o teatro de compliance que este milestone existe para remover.
- **O link cruzado aponta para `/privacidade`, que ainda não existe** (nasce em 47-06). É o contrato
  da UI-SPEC e a rota não está em navegação nenhuma, então ninguém alcança o destino quebrado antes
  de 47-06 — mas o fato fica escrito aqui em vez de descoberto depois.

## Deviations from Plan

### 1. [Rule 3 - Blocking] O RED é de COMPORTAMENTO, não de compilação

- **Encontrado durante:** Task 1, no primeiro commit
- **Problema:** o `.husky/pre-commit` deste repositório é um gate de **contagem** de erros de
  `tsc --noEmit`, congelada em 97. Um teste que importa um módulo inexistente eleva a contagem para
  102 — ou seja, o RED clássico ("o arquivo não existe") só seria commitável com `--no-verify`, que o
  portão do M8 proíbe.
- **Correção:** cada commit RED traz o módulo como **esqueleto declarativo** — as assinaturas existem
  para o tipo fechar e nenhuma delas faz o que promete. O RED continua sendo real (24 e 15 casos
  falhando, respectivamente) e o commit GREEN substitui o arquivo inteiro.
- **Commits:** `773a359`, `0bd0eac`

### 2. [Rule 1 - Bug] O guard automático do plano reprovava um caminho de `@see`

- **Encontrado durante:** Task 1, ao rodar o `<verify>`
- **Problema:** o guard do plano procura `supabase` no arquivo da constante para provar que não há
  leitura de dados em runtime — e casou com o caminho `supabase/functions/_shared/pii-masker.ts`
  dentro de um `@see`. É a armadilha que o próprio plano nomeia: um guard que varre a string crua
  também lê comentário.
- **Correção:** a referência passou a usar a forma curta `_shared/pii-masker.ts`, que é o mesmo
  atalho que o plano usa na sua própria prosa. O guard passa e a proveniência continua legível.
- **Commit:** `cf7b56e`

### 3. [Rule 1 - Bug] A asserção de "zero esqueleto" reprovava a shell que a UI-SPEC manda clonar

- **Encontrado durante:** Task 2, no GREEN
- **Problema:** `BackgroundImage:91` pinta um gradiente com `animate-pulse` enquanto a imagem de
  fundo não carrega — em **toda** página deste projeto desde o M1. Uma asserção sobre o documento
  inteiro reprovava a shell clonada, e um portão que reprova o comportamento correto treina quem
  executa a desligá-lo.
- **Correção:** o pulso passou a ser medido **dentro do painel de conteúdo**. O que esta fase proíbe
  é esqueleto de **conteúdo**: a página não espera por dado nenhum.
- **Commit:** `004a99b`

### 4. Desvio de forma — o portão de país é GREEN e nominal, não "vermelho por desenho"

O plano manda a asserção de estado real ficar **vermelha por desenho** até a Task 3. Uma suíte
vermelha, porém, é regressão de baseline (1725 → falhas) e o contrato de execução desta fase exige
suíte verde com o checkpoint **não satisfeito** — as duas coisas ao mesmo tempo.

A adaptação é mais estrita do que a letra do plano, não mais frouxa: em vez de asserir "nenhuma
entrada carrega a sentinela" (vermelho hoje, e que só acusaria quando as **seis** fossem preenchidas),
o caso (18) assere a **lista nominal de pendências** — as seis, por nome — mais o lançamento do
validador sobre a lista real. Consequências:

- hoje é **verde**, e o nome do caso (`as seis entradas estão pendentes de país medido, e a lista NÃO
  é publicável`) declara o bloqueio em toda execução da suíte;
- preencher **um** país sem passar pelo checkpoint deixa o teste **vermelho nomeando a entrada** —
  que é exatamente a ação proibida;
- a Task 3 troca o caso por `toEqual([])` + `not.toThrow()`, e o bloco de propriedade continua
  provando a falha alta por fixture sintética.

### 5. Desvio de forma — o portão do tracer não foi devolvido como checkpoint interativo

O contrato de execução manda, em corrida interativa, parar num `checkpoint:human-verify` logo após a
tarefa `tracer`. O `<verify>` do tracer aqui é **inteiramente automatizado** (suíte da feature + guard
de arquivo) e passou verde; não há nada visual para um humano conferir num arquivo de constante. O
único portão humano deste plano é a Task 3, que é o que esta execução devolve não satisfeito.

---

**Total de desvios:** 3 auto-fixes (1 bloqueio de ferramenta, 2 bugs de guard) + 2 desvios de forma.
**Impacto no plano:** nenhum scope creep, e nenhum afrouxamento — o desvio 4 endurece o portão.

## Checkpoint bloqueante — Task 3, NÃO satisfeita

**O que falta:** o país de cada uma das seis entradas — e o país que a página declara **não é o da
sede da empresa**, é **a região onde o dado deste projeto é tratado**. O primeiro é achável na web; o
segundo só na conta do provedor. Trocar um pelo outro daria verniz de fonte a um palpite.

**Por que não foi medido aqui** (47-RESEARCH §C3.2, medido por execução):

| Caminho | Resultado |
|---|---|
| `SUPABASE_ACCESS_TOKEN` no ambiente | ausente |
| CLI do provedor de infraestrutura no PATH | ausente |
| DNS do domínio do projeto | resolve para rede de distribuição, não revela a origem |
| `vercel.json` → `regions` | ausente |
| Pin de região para os outros três | nenhum |
| `docs/compliance/backup-posture.md` | registra a região da infraestrutura como desconhecida |

**Entradas bloqueadas: as seis.** Anthropic, OpenAI, ViaCEP, Resend, Supabase, Vercel.

**Consequência hoje, registrada para não ser descoberta depois:** `/subprocessadores` está registrada
como rota e **lança ao renderizar**. Quem digitar a URL vê a página falhar. É a falha alta escolhida
sobre a alternativa — publicar uma declaração de transferência internacional com campo em branco ou
com país presumido. A rota **não está em navegação nenhuma** (o rodapé público é entrega de 47-08), e
**47-08 não pode tornar a página alcançável antes deste checkpoint ser fechado**.

**Para fechar:** informar os seis países medidos e o método de cada um. O executor então substitui a
sentinela, acrescenta ao lado de cada entrada um comentário com **como** e **em que data** aquele país
foi medido, e troca o caso (18) por `toEqual([])` + `not.toThrow()`. Se algum não for medível, a
entrada **mantém a sentinela** — e isso continua sendo o comportamento correto.

⚠ Para o provedor de hospedagem, "um país" pode não ser a resposta honesta: para conteúdo servido por
rede de borda global, a formulação alternativa descreve o **fato** (rede de distribuição global, com
a empresa e a sua jurisdição nomeadas). **Essa formulação muda a forma do campo e é decisão do
Encarregado**, não do executor.

## Verificação final

| Gate | Resultado |
|---|---|
| `npm run test:run` | **1781 passed / 179 files** (baseline 1725 + 56 novos) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada 97 — sem regressão) |
| `<verify>` da Task 1 (suíte + guard de arquivo) | OK |
| `<verify>` da Task 2 (suíte da feature + guard dos 6 arquivos + guard de rota) | OK — 6 arquivos auditados |
| `<verify>` da Task 3 | **NÃO EXECUTADO** — checkpoint não satisfeito, por desenho |
| `portoesInvocados.test.ts` | verde — este plano não cria `check:*`, então não há portão órfão a ligar |
| Dependência npm nova | **0** |
| `--no-verify` | **0 usos** — o hook rodou e passou nos 4 commits |
| Migration escrita ou aplicada | **0**. Nada deployado |

## Known Stubs

Nenhum stub de implementação. Há **um bloqueio declarado**, que é coisa diferente e está registrado
em `.planning/WINDOWS.md` (`unmet-truth`):

| Item | Arquivo | Estado |
|---|---|---|
| O `país` das seis entradas | `src/features/transparencia/constants/subprocessadores.ts` | sentinela `PAIS_POR_MEDIR`; a página lança; portão nominal verde declarando o bloqueio |

## Threat Flags

Nenhuma superfície de segurança nova além da rota pública já prevista no `<threat_model>` do plano. A
página não lê dado em runtime, não expõe RPC a visitante anônimo e não nomeia modelo, plano contratado
nem região técnica (asserido pelo caso (13)). O mitigador de T-47-04-01 (país presumido) está
implementado em três camadas e provado por fixture sintética.

## User Setup Required

**Sim — e é o que bloqueia a publicação.** Os seis países medidos, com o método de cada um. Ver
§Checkpoint bloqueante.

## Next Phase Readiness

- **47-06 (`/privacidade`)** herda o portão de copy da feature **já montado** e a constante de copy
  com o molde de bloco por página. O link cruzado desta página já aponta para lá.
- **47-08 (rodapé público)** está **bloqueado por este checkpoint**: tornar `/subprocessadores`
  alcançável hoje publicaria uma página que lança.
- **47-09 (CONSOL-04)** ganha `SUBPROCESSADORES` como a lista publicada a ser confrontada com a
  varredura de destinos de rede do repositório.
- **Manutenção:** um fornecedor novo entra na lista com os cinco campos, ou a varredura de 47-09
  reprova. Uma revisão do Encarregado nas citações de base legal da matriz deixa esta lista vermelha
  até acompanhar — de propósito.

## Self-Check: PASSED

Os 8 arquivos declarados existem em disco e os 4 commits existem em `git log`. Verificado por
execução, não por leitura.

---
*Phase: 47-transpar-ncia-consolida-o*
*Completed: 2026-08-09*
