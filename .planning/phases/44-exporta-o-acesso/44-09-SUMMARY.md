---
phase: 44
plan: 09
subsystem: frontend
status: checkpoint
tags: [lgpd, export, art-18-ii, art-19-ii, rh, fila, ui, bd-8, reuso, colorblind-safe, uat-pendente]

requires:
  - "src/features/pedidos-dados/{services,hooks,constants} (44-08) — consumidos verbatim, zero re-derivação"
  - "public.listar_pedidos_dados(boolean) + public.contar_pedidos_dados_pendentes() — VIVAS em PROD (44-02/44-04)"
  - "src/features/revisao/components/RevisaoSlaBadge.tsx — reusado sem uma linha de código nova"
  - "src/features/revisao/services/revisaoService.ts — formatarBadgePendentes IMPORTADA"
  - "src/features/revisao/components/{RevisoesRHPage,FilaRevisoesTable,VereditoBadge}.tsx — os moldes estruturais"
provides:
  - "src/features/pedidos-dados/components/SituacaoPedidoBadge.tsx — vocabulário fechado + normalização defensiva"
  - "src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx (+ FILA_COPY, CAP_LEITURA, TH_CLASSES, CELULA_TRUNCADA, formatarData, formatarDataHora, rotularAtendimento)"
  - "src/features/pedidos-dados/components/PedidosDadosRHPage.tsx (+ PAGINA_COPY)"
  - "rota /rh/pedidos-dados (lazyNamed + RoleGuard ['rh','administrador'])"
  - "item de menu pedidos-dados-rh na RHSidebar — os 3 sítios + contador"
  - "docblock de RevisaoSlaBadge com os DOIS consumidores nomeados"
affects:
  - "Phase 45 (exclusão) — decide se acrescenta a coluna `Tipo` a esta fila ou abre uma segunda superfície; esta tela não pré-compromete"
  - "o operador — o UAT ao vivo com os dois papéis do BD-8 continua ABERTO (ver §Checkpoint)"

tech-stack:
  patterns:
    - "backstop de distinção por canal TEXTUAL dentro da `<tr>`, jamais por classe de cor"
    - "gate de ausência de matcher de classe medido por grep — e a própria nota que o explica escrita em paráfrase, para não ser a ocorrência que reprova"
    - "sonda de texto-fonte ancorada em `process.cwd()` (o `URL` global do happy-dom reescreve a base para a origem do documento)"
    - "asserção de ORDEM no DOM por `compareDocumentPosition`, não de presença"
    - "asserção sobre a PROP entregue ao filho mockado, não sobre o estado visual do controle"
    - "asserção de ÍNDICE de vizinhança no menu, não de presença"

key-files:
  created:
    - src/features/pedidos-dados/components/SituacaoPedidoBadge.tsx
    - src/features/pedidos-dados/components/__tests__/SituacaoPedidoBadge.test.tsx
    - src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx
    - src/features/pedidos-dados/components/__tests__/FilaPedidosDadosTable.test.tsx
    - src/features/pedidos-dados/components/PedidosDadosRHPage.tsx
    - src/features/pedidos-dados/components/__tests__/PedidosDadosRHPage.test.tsx
    - src/components/__tests__/RHSidebarPedidosDados.test.tsx
  modified:
    - src/features/revisao/components/RevisaoSlaBadge.tsx
    - src/components/RHSidebar.tsx
    - src/router/routes.tsx

decisions:
  - "O eixo da linha sai de `situacao !== 'atendido'`, não de `atendido_em !== null`: um token novo do servidor cai no lado da SUPERVISÃO. Errar para esse lado é barato (uma linha a mais na fila); errar para o outro esconderia trabalho com 15 dias corridos correndo."
  - "`null`/`undefined` em `situacao` renderizam o travessão, não o token cru: travessão é 'não há valor' e o token cru é 'há um valor que não conheço'. São fatos diferentes, e o docblock do análogo já fixou a distinção."
  - "O gate `grep -c 'GlassCard' == 1` é insatisfazível — o próprio análogo pontua 4 (docblock + import + abertura + fechamento). Medido pela forma que mede a SUBSTÂNCIA ('a página não ganha card acima da tabela'): `grep -cE '<GlassCard'` = 1."
  - "O gate `grep -c 'toHaveClass' == 0` foi mantido LITERAL e a prosa que o explica foi parafraseada — mesma disciplina que o plano exige para a frase jurídica proibida. Afrouxar o gate teria esvaziado a asserção que impede o falso verde da Invariante 6."
  - "As três suítes vivas de sidebar NÃO precisaram do mock do hook novo — o precedente do plano (RHSidebar.admin.test.tsx) se confirmou: 166 arquivos verdes sem nenhuma edição nelas."

metrics:
  duration: ~35min
  completed: 2026-08-04
  tasks: 3
  commits: 3
  files: 10

actuals:
  tokens: 18060
  tasks: 3
  commits: 3
---

# Phase 44 Plan 09: A tela do EXPORT-05 — Summary

`/rh/pedidos-dados` existe, é alcançável pelo menu com contador, e renderiza a fila de
supervisão de 5 colunas onde **um pedido que falhou é distinguível de um atendido pela
PALAVRA** e **um pedido perto do teto de 15 dias é distinguível de um recém-chegado pela
faixa do badge**. Os três sítios da sidebar entraram no mesmo commit. O
`RevisaoSlaBadge` foi reusado sem uma linha de código nova e seu docblock deixou de
afirmar consumidor único.

**Zero contato com PROD. Zero dependência npm nova. Zero `--no-verify`.**

⚠ **O UAT ao vivo com os dois papéis do BD-8 NÃO rodou** — é a razão de `status:
checkpoint`. Ver §Checkpoint.

## O que foi construído

### Task 1 — Os dois badges (`29956bf`)

`SituacaoPedidoBadge` no molde do `VereditoBadge`, com as **duas divergências deliberadas**
escritas no docblock (sem elas a próxima leitura "uniformiza" com o análogo e desfaz as
duas):

| Aspecto | `VereditoBadge` | Aqui |
|---|---|---|
| Fora do vocabulário | devolve nulo — nada renderiza | renderiza o **token cru**, neutro |
| Tratamento por valor | idêntico nos dois | **neutro** atendido · **âmbar** não atendido |

A primeira é a normalização defensiva do 42-11: o CHECK do banco fecha o vocabulário, mas
um invariante **remoto** é a coisa errada para uma decisão de **renderização** se apoiar.
A segunda é a regra de eixos — Situação é âmbar, Acompanhamento é vermelho.

`TIPOGRAFIA_BADGE` redeclarado localmente (a do `RevisaoSlaBadge` é privada ao módulo).
Zero ícone, zero accent, zero quinto tamanho.

**`RevisaoSlaBadge` — SOMENTE o docblock.** A frase que afirmava consumidor único saiu; no
lugar entraram os dois consumidores nomeados **com a invariante 8 reescrita por inteiro**
(faixa, cor, contagem e rótulo de atraso nunca aparecem em superfície de candidato, em
nenhuma das duas filas). Provado por dois gates independentes: a suíte viva do componente
segue verde (15 testes) **e** o diff filtrado de linhas não-comentário devolveu **0**,
medido antes do commit.

### Task 2 — `FilaPedidosDadosTable` (`0a0b3b3`)

Clone estrutural do `FilaRevisoesTable` com os **seis desvios**. O que se copiou verbatim:
`CAP_LEITURA = 200` espelhando o `LIMIT` do servidor, `TH_CLASSES` **com o comentário do
sticky nas células**, `CELULA_TRUNCADA`, o travessão para data inválida, o scrollport
`max-h-[70vh]`, o `AsyncState` com copy sobrescrita, a config lida **fora** do carregamento
e o aviso de corte **fora** da tabela.

Os desvios que mais importam:

- **Zero ação e zero accent na linha.** Gate executável: `<button|onClick=` no arquivo = 0
  **e** a asserção (bz), que varre a `<table>` renderizada exigindo zero controle, zero
  link e zero `[download]`. É a Invariante 5 em forma executável — um caminho de download
  aqui seria a segunda superfície de exfiltração que a autorização own-row da EF fecha.
- **O tooltip é OUTRO, e a diferença é jurídica.** A sonda (cd) exige, no texto-fonte, a
  ausência da frase da fila gêmea que nega a existência de prazo e a presença do teto de
  15 dias corridos — **e** que o teto apareça na TELA, não só no arquivo.
- **As três formas da copy de atendimento.** `rotularAtendimento` é função local pura, e o
  teste morde nas três: `0 → "Atendido no mesmo dia"` (o caso esmagadoramente mais comum
  em produção, e um `0d` leria como bug), `1 → singular`, `n → plural`.
- **Segunda linha em TODA linha não atendida**: *Atender pelo Encarregado de Dados e
  responder ao titular.* É o que a Invariante 5 oferece no lugar de um botão — texto, a
  causa e o próximo passo humano.

**O backstop do SC#4 (bv)** localiza a `<tr>` da linha não atendida e exige nela a palavra
**Não atendido**, e a ausência dessa palavra na linha atendida. É **textual**: uma asserção
por classe passaria numa UI que quebrou a regra colorblind-safe.

### Task 3 — Página, rota e os três sítios (`0f182f1`)

`PedidosDadosRHPage` no esqueleto verbatim da `RevisoesRHPage`, com os dois desvios: o
**banner de escopo sempre visível e não colapsável**, e o **default do toggle invertido**.

> O `false` do análogo abre a tela **filtrada**; o `false` daqui abre a **completa**. Os
> dois parecem iguais e significam o oposto — o motivo está escrito na linha do estado, e
> o teste (ce) o prende pela **prop entregue à tabela**, não pelo estado visual do
> controle. Aqui a linha nasce atendida: abrir filtrado mostraria tela vazia em quase todo
> acesso, e uma fila que quase sempre aparece vazia deixa de ser consultada.

Rota `/rh/pedidos-dados` via `lazyNamed` com `RoleGuard role={['rh','administrador']}` — o
mesmo das rotas RH vizinhas, com o comentário registrando que o gate REAL de dados é o
predicado do BD-8 dentro do `SECURITY DEFINER`.

Os **três sítios** da `RHSidebar` no mesmo commit, cada um comentado nominalmente, com o
contador por `formatarBadgePendentes` **importada** — e o comentário registrando que ela
devolve `undefined`, não string vazia (gate: nenhuma comparação com `''` entrou).

## Verificação

| Critério | Resultado |
|---|---|
| `npx vitest run src/features/pedidos-dados/ src/components/__tests__/` | **117/117** verdes (16 arquivos) |
| Asserções rotuladas | `(bm)`–`(br)`, `(bs)`–`(cd)`, `(ce)`–`(co)` — **todas** presentes |
| `npm run test:run` | **166 arquivos / 1559 testes** verdes (era 164/1543) |
| `npm run lint` (`tsc --noEmit`) | **97** — baseline congelada, zero regressão |
| Diff filtrado de `RevisaoSlaBadge.tsx` (linhas não-comentário) | **0** ✓ (medido antes do commit) |
| Suíte viva de `RevisaoSlaBadge` | **15/15** verdes ✓ |
| `TIPOGRAFIA_BADGE` no badge novo (≥2) | **3** ✓ · `lucide-react\|text-accent\|35BFAD\|text-xs` → **0** ✓ |
| `exclusivamente pela fila do RH` no reusado | **0** ✓ · `pedidos-dados` no docblock → **3** ✓ |
| `<button\|onClick=` na tabela | **0** ✓ · `text-accent\|35BFAD\|text-xs` → **0** ✓ |
| `não fixa prazo` na tabela | **0** ✓ · `15 dias corridos` → **2** ✓ |
| `CAP_LEITURA` (≥3) | **4** ✓ · `TH_CLASSES` (≥6) → **7** ✓ · `max-h-[70vh]` (=1) → **1** ✓ |
| import de `@/features/revisao/components/RevisaoSlaBadge` (=1) | **1** ✓ |
| `toHaveClass` na suíte da tabela (=0) | **0** ✓ (ver desvio 2) |
| `pedidos-dados-rh` na `RHSidebar` (=3) | **3** ✓ · `formatarBadgePendentes` (≥3) → **6** ✓ · `=== ''` → **0** ✓ |
| `PedidosDadosRHPage` em `routes.tsx` (=2) | **2** ✓ · `RoleGuard` nas 4 linhas seguintes → **2** ✓ |
| `<GlassCard` na página (=1) | **1** ✓ (ver desvio 1) · `text-accent\|35BFAD\|text-xs` → **0** ✓ |
| `git diff --exit-code package.json` | **intacto** — zero dependência nova ✓ |
| Deleções de arquivo nos 3 commits | **nenhuma** ✓ · árvore limpa, zero untracked ✓ |
| `.husky/pre-commit` | rodou e passou nos **3 commits**. **Zero `--no-verify`** ✓ |
| Contato com PROD | **nenhum** ✓ |

## ⛔ Checkpoint — o UAT ao vivo NÃO rodou, e a precondição não é verificável daqui

A `<verify><human-check>` da Task 3 é o **único passo que prova o SC#4 na forma em que o
ROADMAP o escreveu** e a igualdade fila ≡ contador atravessando cliente e servidor. Ela
**não rodou**, por dois motivos independentes, ambos estruturais:

1. **Não há ferramenta de navegador nem login vivo neste executor** — sem `mcp__supabase`
   e sem automação de browser, não há como autenticar como recrutador nem como
   administrador. Fabricar o resultado seria pior que não tê-lo.
2. **A `<precondition>` da Task 3 não é verificável por leitura.** Ela exige contas de
   teste vivas para os dois papéis **e** que o recrutador seja `created_by` de ao menos uma
   vaga com candidatura. O único indício ao alcance é o e-mail `recrutador.rh@teste.com`
   usado como *seed* em `RHSidebarRevisoes.test.tsx` — que é convenção de teste, não prova
   de conta viva. ⚠ E a precondição é substantiva: **sem essa vaga, a fila do recrutador
   aparece vazia por ESCOPO, não por ausência de pedidos, e as duas coisas são
   indistinguíveis na tela** — o passo mediria a coisa errada e concluiria o oposto.

**O que o operador precisa fazer** (≈3 minutos, os 8 passos do plano):

1. Login como **recrutador**. O item **Pedidos de dados** aparece entre Revisões e Vagas.
   Registrar se traz badge e **qual número**.
2. Clicar. Abre `/rh/pedidos-dados`, o item **se acende**, a fila abre na **visão
   completa**. Registrar quantas linhas.
3. **A igualdade do BD-8:** contar as linhas com Situação **Não atendido** e comparar com o
   badge do menu. **Têm de ser iguais.**
4. Ligar **Mostrar só os não atendidos**. Confirmar que o vazio é **"Nenhum pedido ficou
   sem atendimento"** (a boa notícia), e não o outro.
5. Repetir 1–3 como **administrador**; registrar os dois pares lado a lado. Admin vendo
   mais linhas é o BD-8 funcionando.
6. ⚠ **Se não houver nenhum pedido não atendido em PROD, registrar o fato e parar.** Não
   fabricar um: seria poluir um registro de exercício de direito com marco temporal legal.
   A distinção não atendido × atendido já está provada pelo teste (bv); o que este passo
   mede é a **igualdade**, observável mesmo em zero.
7. A 1366×768, confirmar que **a primeira linha da tabela está dentro da dobra** — o banner
   de escopo é o elemento novo que pode empurrá-la para fora.

**Contexto que reduz o risco de o passo 6 esvaziar a medição:** `solicitacoes_dados` tinha
**0 linhas** em PROD na medição do orquestrador. Ou seja, o desfecho mais provável é
`0 linhas · sem badge` nos dois papéis — que **é** a igualdade, e é também o estado em que o
vazio da visão completa aparece. Esse desfecho é resultado válido, não medição frustrada.

## Desvios do plano

### 1. [Regra 1 — gate que não podia passar] `grep -c 'GlassCard' == 1` é insatisfazível

- **Problema:** um arquivo que importa e usa o componente pontua no mínimo 3 linhas
  (import, abertura, fechamento). **O próprio análogo, `RevisoesRHPage.tsx`, pontua 4** —
  medido antes de escrever a página. Nenhum código correto poderia passar.
- **É a quinta ocorrência desta classe na fase** (o smoke do 44-03, o grep do 44-02, o md5
  do 44-04 e os dois greps `-r` do 44-08 foram as anteriores).
- **Correção:** medir a **substância** que o critério declara — *"a página não ganha card
  acima da tabela"* — pelos **elementos JSX**: `grep -cE '<GlassCard'` = **1**. Um segundo
  card (o modo de falha que o critério existe para pegar) faria a contagem ir a 2.
- **Não afrouxado:** a restrição da âncora visual está escrita no docblock da página, junto
  do motivo, exatamente como o plano manda.

### 2. [Regra 1 — bug no meu próprio texto] O gate `toHaveClass` mordeu no docblock

- **Problema:** minha primeira versão da suíte da tabela explicava, em prosa, que nenhum
  matcher de classe é usado — **citando o matcher literalmente**. O `grep -c` do critério
  não distingue asserção de comentário, e a contagem foi a **1**.
- **Correção:** **parafraseei a nota, não afrouxei o gate.** Afrouxá-lo esvaziaria
  justamente a asserção que impede o falso verde da Invariante 6. É a mesma disciplina que
  o plano já exige para a frase jurídica proibida, aplicada ao próprio arquivo de teste — e
  a nota agora **diz isso**, para que a próxima pessoa não reintroduza o literal.
- **Commit:** `0a0b3b3`

### 3. [Regra 3 — bloqueio] A sonda de texto-fonte não pode usar `import.meta.url` aqui

- **Problema:** o idioma do plano (`fileURLToPath(new URL('../X', import.meta.url))`, vivo
  em `PedirCopiaBloco.test.tsx`) **lançou** `The URL must be of scheme file` na suíte nova.
- **Medi a causa em vez de contornar:** `import.meta.url` **é** `file:///…` (confirmado por
  sonda), mas o `URL` **global** do ambiente `happy-dom` reescreve a base para a origem do
  documento — a expressão devolve
  `http://localhost:3000/src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx`,
  e `fileURLToPath` rejeita o que não é `file:`. Que o análogo passe apesar disso é
  irrelevante para o meu arquivo: o comportamento medido aqui é este.
- **Correção:** caminho ancorado em `process.cwd()` + `node:path`. O `cwd` da suíte é a raiz
  do repositório, e um `cwd` errado faria o `readFileSync` **lançar**, nunca passar em
  silêncio — a propriedade que importa numa sonda.
- **Commit:** `0a0b3b3`

### 4. [Regra 1 — bug no meu próprio teste] "zero botões na página" era asserção errada

- **Problema:** a asserção (cg) exigia zero `<button>` na página para provar que o banner
  não é colapsável. O `Switch` do shadcn **é** um `<button role="switch"`, então a asserção
  reprovava a própria implementação que o plano manda escrever.
- **Correção:** medir a substância — **o único controle da página é o toggle**
  (`buttons.length === 1` **e** esse botão tem `role="switch"`). Isso continua reprovando
  qualquer botão de colapso acrescentado depois, que é o que a asserção existe para pegar.
- **Commit:** `0f182f1`

### 5. [Nota de execução] TDD por tarefa, um commit por tarefa

O ciclo RED→GREEN foi seguido nas três tarefas (o teste foi escrito e **visto falhar**
antes de cada implementação — duas vezes por módulo ausente, uma por 10 asserções
vermelhas). Os commits são **um por tarefa**, não um por gate, seguindo o precedente vivo
desta fase (44-08: 3 tarefas / 3 commits) e o critério do orquestrador ("cada tarefa
commitada individualmente").

## Requirements — EXPORT-05 marcado Complete, e o que exatamente isso afirma

Depois de **cinco recusas honestas consecutivas** nesta fase (44-01 chegou a **reverter**
uma marcação falsa), o requirement é marcado. O que mudou é preciso: até o 44-08 a fase
tinha tabelas, RPCs e camada de dados e **nenhuma tela** — o requirement fala em algo
**visível ao RH**, e nada renderizava. Agora renderiza.

**O que está provado por asserção executável:** a rota existe e é gateada como as vizinhas;
o item de menu existe, se acende e navega (os três sítios, por comportamento); a fila
renderiza 5 colunas; um pedido não atendido é distinguível de um atendido **pela palavra**;
a faixa do badge de acompanhamento distingue um pedido perto do teto de um recém-chegado, e
a faixa degenerada absorve config ausente sem erro de tela; a fila não oferece ação nenhuma
nem expõe qualquer parte do dado exportado; o tooltip diz a verdade jurídica **desta** fila.

**O que NÃO está provado, e fica registrado como item humano aberto:** que um RH real e um
administrador real abriram a tela, e que o contador do menu bateu com as linhas não
atendidas nos dois papéis. Essa medição é a do §Checkpoint. Ela mede o invariante do BD-8
**atravessando cliente e servidor**; o lado do servidor já está provado por impersonação
real no smoke (m) do 44-02, e o lado do cliente é o que este plano garante por construção
(um único par de RPCs, zero predicado local).

### ⚠ A assimetria com o EXPORT-01 é DELIBERADA, não descuido de contabilidade

Um leitor do `REQUIREMENTS.md` vai notar que o **EXPORT-01 continua `[ ]`** embora tenha
código completo **e** EF deployada — mais evidência viva que este requirement tem. A
diferença é o que cada um afirma:

- **EXPORT-01** afirma um **ato do titular** ("candidato solicita cópia dos próprios dados
  pelo painel"). Um ato só é observável acontecendo: o único fato que o fecha é um download
  real, e ele foi adiado pelo operador junto do UAT do 44-05.
- **EXPORT-05**, na forma do SC#4 do ROADMAP, afirma uma **propriedade de renderização**
  ("o prazo do Art. 19, II está **visível ao RH**"). Essa propriedade é asserível, e está
  asserida: 24 asserções entre badge, tabela, página e menu.

Marcar os dois pelo mesmo critério apagaria essa diferença. Manter o EXPORT-01 aberto e
fechar o EXPORT-05 é o que preserva o significado de cada `[x]`. **O que ainda falta ao
EXPORT-05 — a igualdade fila ≡ contador medida ao vivo — não é a visibilidade que ele
afirma; é o invariante do BD-8, que tem prova de servidor própria e um item aberto próprio
no §Checkpoint.**

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. As sete mitigações declaradas
foram implementadas, cada uma com asserção executável:

| Threat | Mitigação | Asserção |
|---|---|---|
| T-44-42 | acesso horizontal | a tela consome só os hooks do 44-08; zero leitura própria, zero parâmetro de escopo, zero id de rota |
| T-44-09 | contador × fila (BD-8) | mesmo par de RPCs nos dois lados; **a medição ponta a ponta é o §Checkpoint — ABERTA** |
| T-44-12 | superfície da fila | **(bz)** zero controle/link/`[download]` na tabela + gate `<button\|onClick=` = 0 |
| T-44-37 | identificador interno na tela | **(bw)** causa nula → "Motivo não registrado."; **(bu)** mensagem crua ausente |
| T-44-39 | acompanhamento vazando ao candidato | docblock emendado nomeia os dois consumidores **mantendo a invariante escrita**; `grep -rn "pedidos-dados" src/features/privacidade/` → 0 |
| T-44-40 | copy que afirma fato jurídico falso | **(cd)** sonda de texto-fonte nas duas direções + o teto na tela |
| T-44-41 | fila que mente por omissão no corte | **(ca1)/(ca2)** 199 sem aviso, 200 com aviso |

## Known Stubs

**Nenhum stub de código.** Zero `TODO`/`FIXME`/placeholder, zero `t.skip`/`test.todo`/
`describe.skip` nos sete arquivos criados. Nenhum `<verify><automated>` deixou de rodar.

**Aberto, e é o motivo do `status: checkpoint`:**

1. **`<verify><human-check>` da Task 3 — UAT ao vivo com os dois papéis do BD-8.** Não
   rodou (sem browser, sem login, sem MCP). Detalhado no §Checkpoint. ⚠ Item **novo**, não
   herdado.

**Aberto por bloqueio herdado, não introduzido aqui:** `database.types.ts` continua não
regenerado (auth gate do Supabase CLI, medido no 44-04 e re-medido no 44-08). Este plano
**não** tocou o arquivo nem dependeu dele — a ponte de tipos do 44-08 já absorve a lacuna.

## Self-Check: PASSED

- Arquivos criados: **7/7 FOUND** · modificados: **3/3** com diff verificado
- Commits `29956bf`, `0a0b3b3`, `0f182f1` — **3/3 FOUND** no histórico
- `npm run test:run` **1559/1559** verdes · `tsc` **97** (baseline) · `package.json` intacto
- Zero deleções de arquivo · zero untracked · árvore limpa · zero `--no-verify`
- Zero contato com PROD
