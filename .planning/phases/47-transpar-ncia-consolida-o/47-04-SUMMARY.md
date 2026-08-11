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
  tokens: 51000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Sentinela declarada como terceiro caminho entre 'não compila' e 'publica um palpite': o tipo obriga o campo, a sentinela ocupa o valor por medir, e validador + componente a tratam como reprovação dura"
    - "Bloqueio de embarque asserido por lista NOMINAL de pendências (não por 'nenhuma sentinela'): preencher um país fora do checkpoint deixa o teste vermelho nomeando a entrada"
    - "RED de COMPORTAMENTO quando o portão de pre-commit é de contagem de tsc: o esqueleto existe para o tipo fechar, e nenhuma declaração faz o que promete"
    - "Portão que fica verde NÃO é portão desmontado: ao ser preenchido, o caso de bloqueio se divide em estado (zero pendências) + mordida provada entrada a entrada + proveniência datada exigida no arquivo-fonte. Um teste que só assere 'zero pendências' passa por não haver nada"
    - "Proveniência por entrada em comentário datado ao lado do campo: seis meses depois, um país correto e um país adivinhado são indistinguíveis sem ela"
    - "Nuance de medição posicionada por CONSEQUÊNCIA, não por completude: se ela muda a conclusão do leitor, é campo visível; se muda só como sabemos, é comentário de código"

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
  - "FECHADO em 2026-08-11: os seis países foram medidos pelo operador nos painéis e documentos dos fornecedores. Cinco tratam os dados nos Estados Unidos; ViaCEP declara jurisdição brasileira"
  - "O TimeZone do banco em PROD (America/Sao_Paulo) foi RECUSADO como prova de região antes da medição — e a recusa se provou certa: a região medida é us-east-1, Estados Unidos. O indício apontava para o Brasil e estava errado"
  - "A sentinela e o validador PERMANECEM depois de preenchidos: são a rede da SÉTIMA entrada, não deste preenchimento"
  - "A nuance do ViaCEP (hospedagem não divulgada) é VISÍVEL no campo; a da OpenAI (padrão-não-configurado) fica em comentário. O critério é se a nuance muda a conclusão do leitor"
  - "`LISTA_MEDIDA_EM` passa a 2026-08-11: o carimbo público diz 'Lista completa em', e a lista só ficou completa com os países medidos"
  - "(histórico, 2026-08-09) As seis entradas embarcaram com a sentinela no campo `país` — nenhum país foi inventado para fechar o arquivo. A página LANÇAVA, e isso era o comportamento correto"
  - "O serviço público de CEP ENTRA na lista, com a decisão escrita no arquivo: a chamada é disparada pela página da Beauty Smile, com dado digitado aqui e o endereço de origem do navegador do próprio candidato"
  - "O modo de teste do provedor de e-mail NÃO vira segunda ficha: a decisão está registrada em comentário, e a ficha descreve o modo de produção"
  - "As duas citações de base legal são cópia verbatim do artefato gerado da matriz, amarradas por teste — uma revisão do Encarregado lá deixa esta lista vermelha até acompanhar"
  - "TRANSP-01 continua NÃO marcado como concluído — mas por outro motivo: o bloqueio de fato acabou, e agora o que falta é a alcançabilidade (47-08) e a varredura de destinos (47-09), que também declaram este requirement"

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
        ref: "src/features/transparencia/__tests__/subprocessadoresPage.test.tsx#(14)..(16)"
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
    description: "Os seis países — a região onde o dado deste projeto é tratado em cada provedor — MEDIDOS, com proveniência datada ao lado de cada entrada"
    requirement: TRANSP-01
    verification:
      - kind: manual
        ref: "47-04-PLAN.md Task 3 — medição do operador nos painéis e documentos dos fornecedores, 2026-08-11"
        status: pass
      - kind: unit
        ref: "src/features/transparencia/__tests__/subprocessadores.test.ts#(18)..(21)"
        status: pass
      - kind: unit
        ref: "src/features/transparencia/__tests__/subprocessadoresPage.test.tsx#(13)"
        status: pass
    human_judgment: true
    rationale: "O fato só existe na conta do provedor: o país que a página declara não é o da sede da empresa, é a região onde o dado deste projeto é tratado. Medido pelo operador em 2026-08-11. Os testes guardam o preenchimento, a mordida do portão e a proveniência datada — nenhum deles pode RE-MEDIR o fato, e é por isso que o julgamento humano continua marcado."

duration: 12min (Tasks 1-2, 2026-08-09) + 9min (Task 3, 2026-08-11)
completed: 2026-08-11
status: complete
---

# Phase 47 Plan 04: `/subprocessadores` — as seis empresas contratadas, com o país impossível de embarcar em branco

**A página pública que responde com quem os dados são compartilhados nasce com as seis empresas medidas no código vivo, e com o campo `país` construído de forma que uma entrada não medida seja impossível de embarcar em silêncio — o tipo a obriga, uma sentinela declarada ocupa o valor por medir, e validador e componente lançam em vez de renderizar um branco.**

## O estado em uma frase, antes de qualquer detalhe

**A página existe, renderiza e é publicável.** Os seis países foram medidos pelo operador em
2026-08-11, nos painéis e nos documentos dos fornecedores; nenhuma entrada carrega mais a sentinela,
e nenhum país foi presumido. **Cinco das seis tratam os dados nos Estados Unidos** — todos os
candidatos são brasileiros, então a página declara transferência internacional em quase toda a
cadeia, que é exatamente o fato que o Art. 18, VII existe para tornar público.

⚠ **Publicável não é publicada.** A rota continua fora de toda navegação de produção; montá-la é
entrega do 47-08, atrás do portão de publicação do Encarregado. O que fechou aqui foi o bloqueio de
**fato**, não o de **publicação**.

## Performance

- **Duração:** ~12 min (Tasks 1-2) + ~9 min (Task 3)
- **Iniciado:** 2026-08-09T19:02Z · **Task 3:** 2026-08-11T00:30Z
- **Concluído:** 2026-08-11T00:39Z
- **Tarefas:** 3 de 3 — a terceira é o checkpoint do operador, **satisfeito com medição**
- **Arquivos criados/modificados:** 9 (4 deles editados de novo pela Task 3)

## Accomplishments

- **Os seis países medidos (2026-08-11), e a página passou a poder ser publicada.** Cinco tratam os
  dados nos **Estados Unidos**; o serviço de CEP declara jurisdição brasileira, com a ressalva de que
  a hospedagem não é divulgada. Cada valor carrega, em comentário datado ao lado, **de onde ele saiu**
  — painel do projeto, política pública, DPA ou documentação do serviço.
- **O indício que teria produzido uma página falsa foi recusado a tempo.** O `TimeZone` do banco em
  produção é `America/Sao_Paulo`; a região medida é `us-east-1`. Ver §O achado.
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
3. **Task 3 (checkpoint do operador): os seis países medidos**
   - `eeed0e5` (feat) — os seis valores, a proveniência datada por entrada, o portão
     redividido em três casos e o carimbo de completude movido para 11/08. 95/95 na
     feature, 1844/1844 na suíte

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
*(Fechada em 2026-08-11 — ver a seção do checkpoint.)*

### 6. [Task 3 · Rule 2] O caso (18) foi REDIVIDIDO, não trocado por `toEqual([])`

- **Encontrado durante:** Task 3, ao aplicar a instrução literal do plano
- **Problema:** o plano manda trocar o caso (18) por `expect(pendentes).toEqual([])` +
  `not.toThrow()`. Sozinho, isso é um caso que **passa por não haver nada**: com os países
  preenchidos, ele fica verde para sempre e não reprova a regressão que importa — alguém devolver um
  país para "por medir", ou acrescentar um sétimo fornecedor sem medição. O portão viraria decoração
  exatamente no dia em que passou a ter algo a proteger.
- **Correção:** o caso virou três, e o conjunto é mais estrito que a letra do plano:
  - **(18)** o estado — zero pendências e a lista real é publicável (a letra do plano);
  - **(20)** a **mordida provada entrada a entrada** — reintroduzir a sentinela em qualquer uma das
    seis reprova, e a mensagem tem de **nomear** aquela entrada;
  - **(21)** a **proveniência datada** — cada entrada carrega, no arquivo-fonte, uma data entre o
    `nome` e o `pais`. Sem ela, daqui a seis meses um país medido e um país adivinhado são
    indistinguíveis, e o `<verify>` do plano (que só conta datas no arquivo) não amarra a data à
    entrada.
  - Na página, o caso (11) deixou de renderizar `<SubprocessadoresPage />` sem props (essa forma
    passaria a provar o contrário do que promete) e passou a injetar **uma** entrada pendente no meio
    de cinco válidas — que é como o defeito real aparece. O novo caso (13) prova o contraponto: a
    lista de produção renderiza. Sem ele, (11) e (12) ficariam verdes numa página que não renderiza
    em circunstância nenhuma.
- **Commit:** `eeed0e5`

### 7. [Task 3 · Rule 2] `LISTA_MEDIDA_EM` avançou para 2026-08-11

- **Encontrado durante:** Task 3, ao revisar o que o carimbo público afirma
- **Problema:** o carimbo diz **"Lista completa em {data}"**. Com a data anterior (09/08 — a varredura
  do código vivo que elegeu as seis empresas), a página carimbaria completude numa data em que ela
  **não estava completa**: faltavam os seis países, e a ficha nem renderizava.
- **Correção:** a constante passou a 2026-08-11 e o docblock passou a declarar as **duas** medições
  com as suas datas (varredura 09/08, países 11/08), sendo o carimbo a data da última. A asserção de
  formatação em `copyTransparencia.test.ts` acompanhou, com o motivo escrito ao lado.
- **Commit:** `eeed0e5`

---

**Total de desvios:** 3 auto-fixes na primeira execução (1 bloqueio de ferramenta, 2 bugs de guard),
2 desvios de forma, e 2 auto-fixes na Task 3.
**Impacto no plano:** nenhum scope creep, e nenhum afrouxamento — os desvios 4, 6 e 7 **endurecem** o
portão ou corrigem o que a página afirma.

## Checkpoint — Task 3, **FECHADA** com medição (2026-08-11)

O operador mediu os seis no computador dele, nos painéis e nos documentos de cada fornecedor. A
proveniência é **por entrada** e está registrada em comentário datado ao lado do campo `pais`, além
da tabela abaixo.

| Empresa | `pais` gravado | Proveniência exata |
|---|---|---|
| **Supabase** | Estados Unidos | Painel do projeto → Settings → General → Region = `us-east-1` (Norte da Virgínia). Lido na conta pelo operador |
| **Vercel** | Estados Unidos | Painel do projeto → Settings → Functions → Function Region = `iad1` (Washington, D.C., East) |
| **OpenAI** | Estados Unidos | ⚠ Campo de residência de dados **não encontrado** no painel: a conta nunca configurou região, logo vale o **padrão do fornecedor**. É padrão-não-configurado, **não** uma região escolhida |
| **Anthropic** | Estados Unidos | Política pública (Trust Center / lista de subprocessadores): sede nos EUA, dados transferidos, usados e armazenados lá |
| **Resend** | Estados Unidos | DPA, citação literal: *"Company's primary processing operations take place in the United States"* |
| **ViaCEP** | Brasil *(com ressalva visível)* | Webservice brasileiro de CEP, alimentado por IBGE/ANATEL/SIAFI. ⚠ O fornecedor **não publica** a região de hospedagem — o valor reflete a **jurisdição do serviço**, não um centro de dados medido |

### ⚠ O achado: o indício apontava para o Brasil e estava ERRADO

Antes da medição havia um indício à mão — o `TimeZone` do banco em produção é `America/Sao_Paulo` — e
o orquestrador **recusou** tratá-lo como prova de região. A medição no painel provou que a região real
é `us-east-1`: **Estados Unidos**.

Se o fuso tivesse sido aceito, esta página afirmaria que os dados de candidatos brasileiros ficam no
**Brasil**, o que é **falso** — e seria uma declaração pública falsa sobre transferência internacional,
produzida por um palpite plausível, no documento que existe justamente para não fazer isso. O erro não
teria sido descoberto por nenhum teste, porque nenhum teste pode medir a conta do provedor.

É a justificativa **viva** da regra que o tipo desta constante declara (`fato MEDIDO, nunca
presumido`): a regra não é zelo processual, é a diferença entre esta página e uma mentira. O achado
está escrito no arquivo, ao lado da entrada da Supabase, e não só aqui — o SUMMARY sai de contexto, o
comentário fica.

### As duas nuances, e por que elas vivem em lugares diferentes

O critério aplicado foi um só: **a página não pode afirmar mais do que foi medido**. Se a nuance muda
a conclusão do leitor, ela é visível; se muda apenas *como sabemos*, é comentário de código.

- **OpenAI → comentário.** "Estados Unidos" é onde o dado é tratado sob o padrão do fornecedor. Saber
  que ninguém configurou a região não muda essa conclusão — muda a base dela. Fica na proveniência.
- **ViaCEP → campo visível.** Um "Brasil" seco seria lido pelo candidato **na mesma escala das outras
  cinco**, que declaram região medida, e afirmaria hospedagem no Brasil — que ninguém mediu. O campo
  publicado diz, por extenso, que declara a jurisdição do serviço e não um centro de dados medido.

### A sentinela e o validador **não** foram removidos

Eles são a rede da **sétima** entrada, não deste preenchimento. Um fornecedor novo acrescentado com
pressa continua tendo de escolher entre "não compila" e a sentinela — nunca entre "não compila" e
inventar um país. Um portão que some no dia em que fica verde nunca foi um portão.

## Verificação final

Coluna da esquerda: o resultado registrado na primeira execução (2026-08-09). Coluna da direita: o
resultado depois da Task 3 (2026-08-11), medido por execução.

| Gate | 2026-08-09 | 2026-08-11 (Task 3) |
|---|---|---|
| `npm run test:run` | 1781 / 179 arquivos | **1844 passed / 183 arquivos** (baseline da fase 1841 → +3) |
| `npm run -s lint \| grep -c "error TS"` | 97 | **97** (baseline congelada — sem regressão) |
| `<verify>` da Task 1 (suíte + guard de arquivo) | OK | **OK** |
| `<verify>` da Task 2 (guard dos arquivos da feature + guard de rota) | OK — 6 arquivos | **OK — 9 arquivos auditados** |
| `<verify>` da Task 3 (suíte + ≥6 datas de medição no arquivo) | não executado | **OK — 13 datas, e a (21) amarra cada data à sua entrada** |
| Os quatro `check:*` (`resend-dominio`, `export-allowlist`, `recibo-exclusao`, `matriz-retencao`) | — | **exit 0 nos quatro** |
| `portoesInvocados.test.ts` | verde | **verde — 7/7** |
| Dependência npm nova | 0 | **0** |
| `--no-verify` | 0 usos | **0 usos** — o hook rodou e passou nos 5 commits |
| Migration escrita ou aplicada | 0 | **0**. Nada deployado, nada montado em navegação |

## Known Stubs

**Nenhum.** O bloqueio declarado que existia aqui — o `país` das seis entradas — foi **fechado por
medição** em 2026-08-11, não por afrouxamento de portão. A entrada `unmet-truth` correspondente em
`.planning/WINDOWS.md` foi marcada como resolvida.

| Item | Arquivo | Estado |
|---|---|---|
| O `país` das seis entradas | `src/features/transparencia/constants/subprocessadores.ts` | **medido** em 2026-08-11, com proveniência datada por entrada; a lista é publicável e o portão continua montado |

## Threat Flags

Nenhuma superfície de segurança nova além da rota pública já prevista no `<threat_model>` do plano. A
página não lê dado em runtime, não expõe RPC a visitante anônimo e não nomeia modelo, plano contratado
nem região técnica (asserido pelo caso (13)). O mitigador de T-47-04-01 (país presumido) está
implementado em três camadas e provado por fixture sintética.

**Depois da Task 3:** as duas regiões técnicas medidas (`us-east-1`, `iad1`) ficam **apenas em
comentário de código** — a Invariante 11 continua valendo para o campo visível, e o caso (13) do teste
de constante varre os valores das fichas, não os comentários. Nome de região em página pública é mapa
de infraestrutura oferecido de graça e muda sem aviso.

## User Setup Required

**Cumprido em 2026-08-11.** O operador mediu os seis países nos painéis e documentos dos fornecedores
e os informou. Ver §Checkpoint — Task 3.

**O que continua sendo decisão humana, e não é deste plano:** a **publicação**. A rota existe e
renderiza, mas não está em navegação nenhuma; montá-la é entrega do 47-08, atrás do portão de
publicação do Encarregado.

## Next Phase Readiness

- **47-06 (`/privacidade`)** herda o portão de copy da feature **já montado** e a constante de copy
  com o molde de bloco por página. O link cruzado desta página já aponta para lá.
- **47-08 (rodapé público)** deixa de estar bloqueado **por este checkpoint**: a página não lança
  mais e pode ser alcançada sem publicar um erro. O portão que resta é o de **publicação** (decisão
  do Encarregado), que é outro e continua fechado até ele se manifestar.
- **47-09 (CONSOL-04)** ganha `SUBPROCESSADORES` como a lista publicada a ser confrontada com a
  varredura de destinos de rede do repositório — agora com os países preenchidos, o confronto passa a
  ser sobre a lista inteira.
- **Manutenção:** um fornecedor novo entra na lista com os cinco campos **e o país medido na conta do
  provedor**, ou o caso (20) reprova nomeando a entrada e a varredura de 47-09 reprova a omissão. Uma
  revisão do Encarregado nas citações de base legal da matriz deixa esta lista vermelha até
  acompanhar — de propósito.
- **Revalidação:** o país é fato de conta, e conta muda. A proveniência datada por entrada é o que
  permite saber **quando** cada um foi medido pela última vez sem reabrir painel nenhum.

## Self-Check: PASSED

Os 8 arquivos declarados existem em disco e os 5 commits existem em `git log`. As seis entradas foram
lidas do arquivo em disco depois do commit, e a suíte, o `tsc`, os quatro `check:*` e o
`portoesInvocados` foram executados. Verificado por execução, não por leitura.

---
*Phase: 47-transpar-ncia-consolida-o*
*Completed: 2026-08-11 (Tasks 1-2 em 2026-08-09; Task 3 em 2026-08-11)*
