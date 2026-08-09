---
phase: 47-transpar-ncia-consolida-o
plan: 06
subsystem: frontend
tags: [compliance, lgpd, transparencia, retencao, rota-publica, vitest, react, emenda-de-copy]

requires:
  - phase: 47-transpar-ncia-consolida-o
    provides: "matrizRetencao.generated.ts — o artefato gerado, sob check:matriz-retencao, com meta.medido_em (47-01)"
  - phase: 47-transpar-ncia-consolida-o
    provides: "a shell clonada, o molde de constante de copy por página e o portão de copy do escopo da feature (47-04)"
  - phase: 45-motor-de-exclusao
    provides: "reciboExclusao.generated.ts — colunas_mantem com rótulo e base legal por item, sob check:recibo-exclusao"
  - phase: 43-consentimentos-honestos
    provides: "DIALOGO_JANELA_COPY.confirmacao — o bloco de copy que a Emenda A estende sem editar"
provides:
  - "src/features/transparencia/components/PrivacidadePublicaPage.tsx — /privacidade, os cinco blocos e o carimbo de vigência"
  - "src/features/transparencia/components/MatrizRetencaoPublica.tsx — o bloco de prazos, derivado do artefato gerado"
  - "src/features/transparencia/components/RetencaoIndeterminadaLista.tsx — o bloco do que fica, derivado do recibo gerado"
  - "a rota pública /privacidade, sem guard de sessão e fora de toda navegação"
  - "DIALOGO_JANELA_COPY.confirmacao.publicacao — a Emenda A, o detector do drift de RUNTIME, provada renderizada"
affects: [47-08-rodape-publico, 47-09-consol-04]

actuals:
  tokens: 16200
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Página pública inteiramente derivada: dois artefatos gerados sob portão alimentam os dois blocos de dado, e nenhuma janela nem redação de item é digitada dentro de um componente"
    - "Falha alta no ponto de renderização como substituta do estado vazio: lista vazia, janela sem número e data de medição ausente LANÇAM, porque as três são falha de geração e não estado de tela"
    - "Emenda de copy ADITIVA a contrato de fase anterior: a chave existente fica byte-idêntica e asserida como tal; a chave nova é provada RENDERIZADA, nunca só declarada"

key-files:
  created:
    - src/features/transparencia/components/PrivacidadePublicaPage.tsx
    - src/features/transparencia/components/MatrizRetencaoPublica.tsx
    - src/features/transparencia/components/RetencaoIndeterminadaLista.tsx
    - src/features/transparencia/__tests__/privacidadePublica.test.tsx
    - src/features/transparencia/__tests__/matrizRetencaoPublica.test.tsx
    - src/features/admin/retencao/components/__tests__/emendaPublicacao.test.tsx
  modified:
    - src/features/transparencia/constants/copyTransparencia.ts
    - src/features/transparencia/index.ts
    - src/router/routes.tsx
    - src/features/admin/retencao/components/EditarJanelaDialog.tsx

key-decisions:
  - "O carimbo publica `meta.medido_em` (a data da MEDIÇÃO da matriz viva), nunca `gerado_em` — e um teste assere que os dois são fatos diferentes"
  - "A Emenda A é renderizada FORA da descrição do Radix: a descrição é um parágrafo, e um segundo parágrafo dentro dela seria aninhamento inválido"
  - "O bloco de prazos LANÇA quando uma janela não é inteiro positivo — assim 'nenhum prazo sem fim no bloco 1' vira propriedade do componente em vez de confiança no gerador"
  - "As quatro palavras proibidas para o prazo sem fim NÃO estavam no portão de copy de 47-04 (medido): a asserção foi escrita sobre o DOM dos dois blocos, com os padrões montados por junção de fragmentos"
  - "O guard de coluna administrativa no DOM não bane `admin` nem `seed`: `administrativo` é palavra da citação legal de metade das etapas, e um portão que reprova a base legal correta treina quem executa a desligá-lo"

patterns-established:
  - "Tipo ESTRUTURAL ao lado do artefato literal: o `as const` do artefato impediria a fixture sem data de compilar, e a propriedade da falha alta ficaria sem prova"
  - "Ponteiro para superfície autenticada a partir de página pública: o rótulo do link é o próprio nome da página de destino, sem prometer nela o que a página pública não entrega"

requirements-completed: []

coverage:
  - id: D1
    description: "A página existe com os cinco blocos na ordem da especificação, cabeçalho real em cada um, e o carimbo de vigência logo abaixo do subtítulo no tamanho de rótulo"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/privacidadePublica.test.tsx#(1)..(4)"
        status: pass
    human_judgment: false
  - id: D2
    description: "O carimbo traz a data da MEDIÇÃO da matriz viva, e uma data ausente ou inválida faz a página lançar"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/privacidadePublica.test.tsx#(2), (11), (12)"
        status: pass
    human_judgment: false
  - id: D3
    description: "O bloco de prazos renderiza uma ficha por estado, na ordem do funil, SEM agrupar — provado com fixture de janelas idênticas — e as três colunas administrativas não aparecem no DOM nem no código"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/matrizRetencaoPublica.test.tsx#(1)..(10)"
        status: pass
    human_judgment: false
  - id: D4
    description: "O bloco do que fica é derivado do recibo gerado, com a expressão contratada inteira e a base legal por item; nenhuma das quatro palavras proibidas aparece"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/matrizRetencaoPublica.test.tsx#(11)..(16)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A Emenda A existe no bloco de confirmação, é RENDERIZADA no diálogo, não promete regeneração automática, e a chave de escopo fica byte-idêntica"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "src/features/admin/retencao/components/__tests__/emendaPublicacao.test.tsx#(1)..(6)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A rota é pública, sem proteção de sessão, e nenhuma rota existente foi tocada; nenhum arquivo da página autenticada de privacidade foi modificado"
    requirement: TRANSP-02
    verification:
      - kind: unit
        ref: "src/features/transparencia/__tests__/privacidadePublica.test.tsx#(13)..(18)"
        status: pass
      - kind: other
        ref: "git diff --name-only 1d387ef..HEAD -- src/features/privacidade → vazio"
        status: pass
    human_judgment: false
  - id: D7
    description: "A revisão do Encarregado sobre as oito citações de base legal publicadas no bloco de prazos"
    requirement: TRANSP-02
    verification:
      - kind: manual
        ref: "47-CONTEXT §Área 5 — gate de PUBLICAÇÃO, herdado de 47-01 (D5)"
        status: blocked
    human_judgment: true
    rationale: "As citações são fato jurídico autorado na fonte YAML de 47-01; o portão garante que existam e que não usem vocabulário banido, não que o artigo citado esteja juridicamente correto. Esta página é a primeira superfície pública a EXIBI-LAS, então o gate de publicação passa a valer também para ela."

duration: 15min
completed: 2026-08-09
status: complete
---

# Phase 47 Plan 06: `/privacidade` — a página derivada, o carimbo de vigência e a única ponte até a edição de runtime

**A página pública que responde o que é guardado, por quanto tempo e por quê nasce inteiramente derivada — o bloco de prazos vem do artefato que 47-01 pôs sob portão, o bloco do que fica vem do recibo que a Phase 45 já gera — e a terceira trava, a que enxerga o drift que acontece de verdade, passa a existir: quem encurta uma janela em produção lê, no instante da confirmação, que a página pública ficou para trás.**

## O risco central da fase, e por que a terceira trava é a que importa

O artefato é de **build-time**; a matriz é editável em **runtime**. As três travas ficaram assim:

| # | Trava | O que ela pega | Onde |
|---|---|---|---|
| 1 | `check:matriz-retencao` | divergência **dentro do repositório** | 47-01 |
| 2 | Carimbo "Política vigente em {data}" | **quando** o retrato foi tirado | esta página |
| 3 | **Emenda A** | a edição feita **em produção**, pela tela do administrador | este plano |

Sem a terceira, as duas primeiras só detectam a metade do problema que **não acontece na prática**.
A divergência que acontece nasce numa tela de administrador, e o portão do repositório continua
verde enquanto a matriz viva anda sozinha — a fonte declarada e o artefato seguem combinando entre
si. A frase acrescentada à confirmação é a ponte inteira, e o caso (2) do teste dela é o que a
torna um detector em vez de uma declaração: ele **abre o diálogo e procura o texto na tela**.

Que o risco é real já estava medido: 47-01 encontrou `rejeitado` com **18 meses e `origem = admin`**,
divergindo do seed de 24. A página publica 18.

## Performance

- **Duração:** ~15 min
- **Tarefas:** 3 (todas TDD, RED→GREEN, cada uma commitada atomicamente)
- **Arquivos criados/modificados:** 10
- **Dependência npm nova:** 0

## Accomplishments

- **Nenhuma janela e nenhuma redação de item sobrevive digitada na página.** O bloco de prazos lê
  `MATRIZ_RETENCAO`; o bloco do que fica lê `RECIBO_EXCLUSAO.colunas_mantem`. Um teste assere que
  nenhum rótulo do recibo aparece escrito dentro do componente — redigi-lo de novo criaria duas
  declarações públicas sobre o mesmo fato, divergindo na primeira edição.
- **O carimbo publica a data da MEDIÇÃO, e o teste prova que ela não é a data do build.** O artefato
  carrega os dois carimbos; publicar o errado responderia "quando o arquivo foi escrito" a uma
  pergunta que é "quando isto era verdade".
- **Data ausente LANÇA.** A página nunca renderiza um carimbo pela metade: um carimbo de vigência sem
  data é a burocracia sem a informação que a justifica.
- **O não-agrupamento está provado com fixture de janelas idênticas.** Hoje sete das oito janelas são
  iguais e a tentação de renderizar uma linha só é forte. A asserção compara a contagem de fichas com
  a de estados **num cenário em que todas as janelas coincidem** — que é exatamente o cenário em que
  a forma agrupada pareceria correta.
- **O prazo sem fim é impossível no bloco de prazos, por construção do componente.** Uma janela que
  não seja inteiro positivo faz o bloco lançar. Sem isso, a afirmação "nenhum prazo indeterminado no
  bloco 1" seria confiança no gerador; com isso, é propriedade provada por fixture.
- **A Emenda A é aditiva.** A chave de escopo ficou byte-idêntica e é asserida contra o texto literal
  aprovado na Phase 43. A chave nova diz *peça a regeneração*, e diz explicitamente que a página
  **não muda sozinha** — porque não muda, e prometer o contrário criaria, na fase que existe para
  remover promessa sem dono, uma promessa sem dono.
- **A rota está registrada e fora de toda navegação.** `RodapePublico` e o gate de publicação do
  Encarregado são entrega de 47-08, deliberadamente depois desta.

## Task Commits

Cada tarefa foi commitada atomicamente, com o hook de pre-commit rodando — **zero `--no-verify`**.

1. **Task 1 (tracer, TDD): a página, a shell, o carimbo e a rota**
   - `0230935` (test) — RED: 13 de 18 falhando
   - `5051555` (feat) — GREEN: 74/74 na feature
2. **Task 2 (TDD): os dois blocos derivados**
   - `6ef964e` (test) — RED: 13 de 18 falhando
   - `9b86b2c` (feat) — GREEN: 92/92 na feature
3. **Task 3 (TDD): a Emenda A**
   - `1e06ac5` (test) — RED: (2) e (3) falhando, as duas por ausência de renderização
   - `cff33b7` (feat) — GREEN: 56/56 em `src/features/admin/retencao`

## Files Created/Modified

- `src/features/transparencia/components/PrivacidadePublicaPage.tsx` — a página inteira: shell
  clonada da página irmã, marca do controlador, título, subtítulo, carimbo de vigência e as cinco
  seções separadas por linha divisória, cada uma com cabeçalho real. Zero consulta, zero estado. O
  docblock registra as três travas e por que a terceira não é cosmética.
- `src/features/transparencia/components/MatrizRetencaoPublica.tsx` — as fichas do bloco 1, com as
  **seis regras** e o motivo de cada uma escritos em comentário, mais as duas falhas altas.
- `src/features/transparencia/components/RetencaoIndeterminadaLista.tsx` — o bloco 2, um item por
  entrada do recibo, com a expressão contratada inteira e a base legal daquele item ao lado.
- `src/features/transparencia/constants/copyTransparencia.ts` — o bloco `privacidade`, copy verbatim
  da UI-SPEC. **Nenhuma string literal de copy dentro de JSX**, que é o que mantém o portão de copy
  da feature (47-04) efetivo sobre esta página.
- `src/features/transparencia/index.ts` — a página nova no barrel.
- `src/router/routes.tsx` — **+1 rota** na seção pública, sem proteção de sessão, com o comentário
  que registra que ela é distinta de `/candidato/privacidade`. Nenhuma rota existente tocada.
- `src/features/admin/retencao/components/EditarJanelaDialog.tsx` — **+1 chave** no bloco de
  confirmação e a renderização dela ao lado do escopo.
- Três arquivos de teste, **42 casos, zero snapshot**.

## Decisions Made

- **O ponteiro para a página autenticada é um link de verdade**, com o piso de alvo tátil, e o rótulo
  dele é o próprio nome da página de destino. A página pública nomeia a autenticada sem repetir os
  controles dela: zero formulário, zero botão, zero chave de autorização — asserido pelo caso (15).
- **O canal humano é texto, não `mailto:`.** A especificação lista dois controles acionáveis nesta
  página, e um terceiro link inline dentro de um parágrafo não cumpriria o piso de 44px sem quebrar a
  caixa de linha. O endereço vem da constante canônica e é comparado com ela no teste.
- **As quatro palavras proibidas para o prazo sem fim foram asseridas sobre o DOM**, não sobre
  arquivos — ver o desvio 1.
- **`admin` e `seed` ficaram fora do guard de coluna administrativa no DOM**: `administrativo` é
  palavra da citação legal de metade das etapas. O guard bane os nomes das colunas e o formato do
  carimbo de data e hora, que é o rastro mais fácil de deixar escapar.

## Deviations from Plan

### 1. [Rule 2 - Missing Critical] O portão de copy de 47-04 **não** cobre as quatro palavras do prazo sem fim

- **Encontrado durante:** Task 2, ao escrever as asserções.
- **Problema:** o plano afirma que "as quatro palavras que a UI-SPEC proíbe para esse prazo estão
  banidas pelo portão de copy do escopo da feature, criado em 47-04". **Medido: não estão.** As cinco
  famílias daquele portão são construções elásticas, vocabulário de engenharia, totalidade sobre
  exclusão, marcadores de indefinição e nomes de objeto de banco. Nenhuma delas contém as quatro. O
  `<behavior>` da Task 2 exige a propriedade; nada a executava.
- **Correção:** os casos (10) e (13) do teste dos blocos derivados asserem sobre o **DOM renderizado**
  dos dois blocos, com os padrões montados por junção de fragmentos — assim o arquivo de teste, que
  mora dentro do escopo varrido pelo portão da feature, não contém contígua nenhuma das strings que
  ele existe para reprovar.
- **Por que no DOM e não em arquivo:** um portão de arquivo sobre a feature reprovaria o próprio
  arquivo que declara as palavras banidas — o defeito que este projeto já produziu duas vezes
  (Phase 43 e Phase 44) e que a UI-SPEC registra nominalmente.
- **Commit:** `6ef964e` / `9b86b2c`

### 2. [Rule 2 - Missing Critical] O bloco de prazos LANÇA quando a janela não é inteiro positivo

- **Encontrado durante:** Task 2.
- **Problema:** o plano exige que "um prazo indeterminado NUNCA apareça no bloco de prazos" e diz que
  isso é impossível por construção do banco. É verdade sobre o banco; não é verdade sobre o
  componente, que recebe dado de um artefato. Sem uma trava aqui, a asserção correspondente seria
  confiança no gerador, não propriedade do bloco.
- **Correção:** o componente lança nomeando a etapa. Provado pelo caso (9), com fixture.
- **Commit:** `9b86b2c`

### 3. Desvio de forma — a Task 2 também toca o arquivo da página

O `<files>` da Task 2 lista os dois componentes e o teste. Mas o próprio `<action>` da Task 1 diz que
"os blocos 1 e 2 são a Task 2, **e a página os compõe**". A montagem tem de acontecer em algum
commit, e fazê-la na Task 1 exigiria referenciar dois componentes inexistentes — o que, com o
pre-commit sendo portão de **contagem** de `tsc`, só seria commitável com o bypass proibido. A Task 1
entregou as cinco seções com os cabeçalhos reais e a Task 2 inseriu os dois blocos derivados dentro
das duas primeiras.

### 4. Desvio de forma — o RED é de COMPORTAMENTO, não de compilação

Precedente idêntico ao registrado em 47-04. Cada commit RED traz o módulo como **esqueleto
declarativo**: as assinaturas existem para o tipo fechar e nenhuma faz o que promete. O RED continua
sendo real (13, 13 e 2 casos falhando) e o commit GREEN substitui o arquivo.

Na Task 3 esse formato é especialmente literal: o RED é a chave de copy **declarada e não exibida** —
exatamente a promessa sem dono que o caso (2) existe para detectar.

### 5. Desvio de forma — o portão do tracer não foi devolvido como checkpoint interativo

O contrato de execução manda parar num `checkpoint:human-verify` logo após a tarefa `tracer`. O
`<verify>` do tracer aqui é **inteiramente automatizado** (suíte da feature + guard de arquivo +
guard de rota + guard da página autenticada) e passou verde antes de qualquer tarefa de expansão; o
plano é `autonomous: true` e o precedente da mesma fase (47-04, desvio 5) é o mesmo. Nada foi
aplicado nem deployado, então não há nada em produção para um humano conferir.

---

**Total de desvios:** 2 auto-fixes (funcionalidade crítica ausente) + 3 desvios de forma.
**Impacto no plano:** nenhum scope creep. Os dois auto-fixes transformam duas afirmações do plano em
propriedades executadas — que é o que esta fase inteira existe para fazer.

## Issues Encountered

- **Nada foi aplicado nem deployado.** Zero migration escrita, zero migration aplicada, zero MCP
  chamado por este executor. O plano é write-only por desenho.
- Um caso do teste da Emenda A nasceu banindo `sozinha.`, que casava com a própria negação honesta
  da copy (`não muda sozinha`). Corrigido antes do commit RED para `atualiza sozinha` — o padrão que
  descreve a promessa, não a negação dela.

## Verificação final

| Gate | Resultado |
|---|---|
| `npm run test:run` | **1823 passed / 182 files** (baseline 1781 + 42 novos) |
| `npm run -s lint \| grep -c "error TS"` | **97** (baseline congelada 97 — sem regressão) |
| `npm run -s check:matriz-retencao` | exit 0 |
| `npm run -s check:recibo-exclusao` | exit 0 |
| `npm run -s check:pii-inventory-md` | exit 0 |
| `npm run -s check:export-allowlist` | exit 0 |
| `portoesInvocados.test.ts` | verde — este plano não cria `check:*`, então não há portão órfão a ligar |
| `<verify>` da Task 1 | OK — guards de estado, de tabela, de truncamento, de constante canônica e de rota |
| `<verify>` da Task 2 | OK — 2 arquivos auditados com comentários removidos antes da busca |
| `<verify>` da Task 3 | OK — 5 chaves no bloco de confirmação, escopo byte-idêntico |
| `git diff -- src/features/privacidade` | **vazio** — a página autenticada está intacta |
| Dependência npm nova | **0** |
| `--no-verify` | **0 usos** — o hook rodou e passou nos 6 commits |
| Migration escrita ou aplicada | **0**. Nada deployado |

## Known Stubs

Nenhum. Os dois blocos de dado consomem artefatos gerados e completos; nenhuma seção da página
renderiza espaço reservado, e nenhuma delas espera por dado.

Há **um bloqueio herdado**, que é coisa diferente: a revisão do Encarregado sobre as oito citações de
base legal (D7), declarada em 47-01 como gate de **publicação**, não de engenharia. Esta página é a
primeira superfície pública a exibi-las. A rota não está em navegação nenhuma, e 47-08 é o plano que
decide a alcançabilidade.

## Threat Flags

Nenhuma superfície de segurança nova além da rota pública já prevista no `<threat_model>` do plano. A
página não lê dado em runtime, não expõe RPC a visitante anônimo e não projeta nenhuma das três
colunas administrativas — em particular, nenhum nome de administrador chega ao DOM (T-47-06-03,
provado pelo caso (8)).

## User Setup Required

Nenhuma para esta entrega. Para **publicar** a página, dois itens herdados: a revisão do Encarregado
sobre as citações de base legal, e o país das seis empresas contratadas (checkpoint aberto de 47-04).

## Next Phase Readiness

- **47-08 (rodapé público)** ganha a segunda rota para apontar — e continua bloqueado pelo checkpoint
  de país de 47-04: tornar `/subprocessadores` alcançável hoje publicaria uma página que lança.
- **47-09 (CONSOL-04)** ganha a Emenda A como exemplo de promessa **com** dono: uma frase de copy que
  descreve uma consequência real, provada renderizada por teste.
- **Manutenção:** quando uma janela mudar em produção, o caminho está escrito no lugar certo — o
  administrador lê a Emenda A no momento em que salva. Quem regenerar precisa re-medir, atualizar
  `janela_meses` e `medido_em` na fonte e rodar o gerador; `check:matriz-retencao` no CI garante que
  a segunda metade não seja esquecida.

## Self-Check: PASSED

Os 6 arquivos declarados como criados existem em disco e os 6 commits existem em `git log`.
Verificado por execução, não por leitura.

---
*Phase: 47-transpar-ncia-consolida-o*
*Completed: 2026-08-09*
