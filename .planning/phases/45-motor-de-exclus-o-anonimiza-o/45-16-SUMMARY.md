---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 16
subsystem: edge-function
tags: [supabase, edge-function, deno, storage, lgpd, retomada, code-review, mutation-testing]

requires:
  - phase: 45-15
    provides: "a tabela de `md5(prosrc)` que este documento reconfere, e o portão aberto para o apply das sete migrations"
  - phase: 45-REVIEW-2
    provides: "a especificação de WR-A (`:315`) e WR-E (`:414`)"
  - phase: 45-REVIEW-3
    provides: "a manutenção de WR-A e WR-E como as DUAS condições da execução REAL, e a retirada de WR-C dessa lista"
provides:
  - "WR-A fechado — a conferência do passo 1 distingue RESÍDUO PLANEJADO (remoção que falhou → falha fechada) de OBJETO POSTERIOR ao passo 0 (varrido, com contagem). O `plano.caminhos` permanece CONGELADO: ERASE-04 intacto"
  - "WR-E fechado — a forma do plano persistido é verificada ANTES da remoção, e os `caminhos` re-validados contra o prefixo do titular antes de chegarem a um `remove()` sob service key"
  - "a `causa` passou a nomear o passo em que a execução DE FATO estava: uma exceção genérica depois do `remove()` grava `falha_storage`, nunca mais `falha_postgres`"
  - "9 casos Deno novos, 6 deles PROVADOS discriminantes por mutação executada contra o código pré-fix"
  - "`md5(prosrc)` das duas funções recomputado por execução e INALTERADO — a referência do 45-11 segue sendo a tabela do `45-15-SUMMARY.md`, agora reconfirmada"
affects: [45-11, portao-destrutivo, execucao-real-task-3]

actuals:
  tokens: 26000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "numa mutação não-atômica retomável, a conferência final mede o PÓS-ESTADO do mundo — e o mundo pode mudar legitimamente entre a captura e a mutação. Quem tolera a mudança é a CONFERÊNCIA; o plano continua congelado"
    - "resíduo de algo que o plano mandou apagar e objeto que apareceu depois são fatos diferentes: tratá-los igual transforma um evento normal em estado terminal"
    - "a forma de um registro persistido é verificada ANTES da parte irreversível, nunca no ponto em que ela é consumida — verificar depois é diagnosticar o que já não tem volta"
    - "uma varredura de UMA passada, dentro de um passo que já é retomável, converge sem virar laço com timeout: reprovar adia, e a tentativa seguinte fecha"
    - "prova por mutação (rodar os testes NOVOS contra o código PRÉ-fix) é o que separa cobertura de decoração"

key-files:
  created:
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-16-SUMMARY.md
  modified:
    - supabase/functions/executar-direito-titular/index.ts
    - supabase/functions/executar-direito-titular/index.test.ts

key-decisions:
  - "WR-A NÃO foi fechado unindo `restantes` ao `plano.caminhos` (a sugestão literal do `45-REVIEW-2.md:341`). O plano congelado no passo 0 é o ERASE-04 — é a captura de antes da primeira mutação que torna a mutação não-atômica retomável. O que passou a tolerar o prefixo mudado é a CONFERÊNCIA; `caminhos` sai do passo 1 byte a byte igual ao que entrou, e a `(ap2)` mede exatamente isso"
  - "A distinção que corrige é entre resíduo PLANEJADO e objeto POSTERIOR. Um caminho que estava no plano e continua no bucket é uma remoção que FALHOU — e continua reprovando sem carimbo, porque re-tentá-lo em silêncio esconderia uma remoção que não acontece. Um caminho que não estava no plano entrou depois do passo 0: ele está sob `{authUid}/`, é PII do titular, e é objeto do direito que ele exerceu"
  - "A varredura é de UMA passada. Um laço até convergir dentro de uma Edge Function com timeout trocaria um estado terminal por outro; uma passada só faz um upload que chegue DURANTE a varredura reprovar ESTA tentativa e passar na seguinte — adiar, nunca travar"
  - "Os varridos SOMAM em `contagens.storage_remove` e são registrados à parte em `achados_resumo.varridos_pos_plano`. CONTAGEM, nunca a lista: o caminho embute o `auth.uid()` que a exclusão existe para apagar (mesma regra do CR-02)"
  - "A normalização do WR-E roda nos DOIS ramos (plano recém-montado e plano vindo do banco). No primeiro ela é no-op por construção; rodar nos dois é o que garante que TODO plano consumido por este motor passou pelo mesmo portão"
  - "A normalização também re-valida o PREFIXO dos `caminhos` persistidos. O WR-03 peneira a lista montada no passo 0; um plano vindo do banco (versão anterior, edição manual) nunca passou por aquela peneira e ia direto a um `remove()` sob service key, que ignora RLS. O descarte NÃO para o passo — com a varredura do WR-A no lugar, o prefixo é limpo assim mesmo, e parar ali seria um estado terminal novo com o plano congelado"
  - "O `catch` deixou de atribuir `\"postgres\"` por default a uma exceção que não é `ErroDePasso`: ela herda o passo em que a execução estava. O default segue `\"postgres\"` ATÉ o passo 1 começar — afirmar `falha_storage` antes de qualquer remoção diria que o currículo pode ter sido destruído quando nada foi tocado, que é a razão escrita no docblock de `causaDaFalha()`"
  - "O `TypeError` de um `remove()` que devolva uma forma desconhecida foi DEIXADO no lugar, em vez de coagido para `[]`. Coagir carimbaria `storage_remove` menor do que o que o passo de fato apagou — a prova que sobrevive ao titular subestimando o próprio ato. Falhar fechada diante de uma API que mudou é o lado certo, e agora a `causa` nomeia o sistema certo"

requirements-completed: []

coverage:
  - id: E1
    description: "WR-A — um objeto que aparece sob o prefixo depois do passo 0 deixa de produzir estado terminal"
    verification:
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(ap) objeto NOVO sob o prefixo depois do passo 0 → varrido, e o passo CARIMBA"
        status: pass
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(ap2) a varredura não recomputa `caminhos`; ela vira CONTAGEM no resumo"
        status: pass
    human_judgment: false
  - id: E2
    description: "WR-A — a falha FECHADA que existia antes não foi afrouxada"
    verification:
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(ap3) resíduo de um caminho DO PLANO reprova mesmo com objeto novo ao lado"
        status: pass
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(ap4) varredura que não limpa o prefixo → falha FECHADA, sem carimbo"
        status: pass
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(w) objeto que SOBRA no bucket após o laço → falha_storage e sem carimbo (pré-existente, continua verde)"
        status: pass
    human_judgment: false
  - id: E3
    description: "WR-E — a forma do plano persistido é verificada antes da remoção"
    verification:
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(aq) plano sem `contagens` nem `achados_resumo` COMPLETA o passo 1"
        status: pass
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(aq2) `contagens` escalar e `achados_resumo` array são NORMALIZADOS, não consumidos"
        status: pass
    human_judgment: false
  - id: E4
    description: "WR-E — um `caminho` de outra pessoa dentro do plano persistido nunca alcança o `remove()` sob service key"
    verification:
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(aq3) caminho fora do prefixo dentro do plano NUNCA chega ao remove()"
        status: pass
    human_judgment: false
  - id: E5
    description: "WR-E — a `causa` nomeia o sistema em que a execução de fato parou"
    verification:
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(ar) exceção genérica no passo 1 grava falha_storage, nunca falha_postgres"
        status: pass
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(ar2) exceção genérica ANTES de qualquer remoção NÃO vira falha_storage"
        status: pass
    human_judgment: false
  - id: E6
    description: "Os testes novos DISCRIMINAM o defeito — não são decoração"
    verification:
      - kind: manual
        ref: "prova por mutação executada: `index.ts` de HEAD (pré-fix) numa árvore isolada, com o arquivo de teste ATUAL → 81 passed | 6 failed, e as 6 são exatamente (ap), (ap2), (aq), (aq2), (aq3) e (ar)"
        status: pass
    human_judgment: false
  - id: E7
    description: "Os pins de `md5(prosrc)` do 45-11 continuam válidos"
    verification:
      - kind: manual
        ref: "recomputação por execução da receita do smoke §PROVENIENCIA sobre as duas migrations — 97634d07… (21349) e 8c86e0f0… (34488), inalterados; `git diff` de `supabase/migrations/` VAZIO"
        status: pass
    human_judgment: false

duration: 50min
completed: 2026-08-11
status: complete
---

# Phase 45 Plan 16: Os dois estados terminais depois do passo 1 — Summary

**O passo 1 passou a distinguir «o `remove()` falhou» de «apareceu um arquivo depois da captura», e o plano persistido passou a ter a forma verificada ANTES da parte irreversível — as duas condições que o `45-REVIEW-3.md` manteve para a execução REAL, fechadas por mecanismo e provadas por mutação.**

⚠ **Zero apply, zero deploy, zero contato com PROD.** As sete migrations `20260805000003` …
`20260805000009` continuam **NÃO aplicadas**; PROD segue com as duas migrations tracer. Nenhuma
migration foi tocada neste plano (`git diff supabase/migrations/` **vazio**). Não usei ferramenta
MCP do Supabase — não as tenho.

---

## O critério pelo qual eu julguei os dois fixes

Os dois achados produzem estados **depois** do passo 1 — currículo já destruído, PII intacta. Então
a pergunta não é *«para de lançar?»*, é *«a execução ainda CONVERGE a partir daqui?»*. Um erro mais
claro no mesmo estado terminal não fecharia nenhum dos dois. Abaixo, para cada um: o estado do motor
quando a condição ocorre, o que o fix faz em vez disso, e se o desfecho é **RETOMÁVEL** ou apenas um
erro mais bonito.

---

## WR-A · a retomada do passo 1 quando o bucket ganha um objeto depois do passo 0

### O estado do motor quando a condição ocorre

`plano.caminhos` foi congelado no passo 0 e não é recomputado numa retomada (`index.ts:810`), mas a
conferência final mede o **pós-estado do prefixo inteiro** (`:859-863`). Um objeto que apareça sob
`{authUid}/` depois do passo 0 — o titular sobe um CV novo entre uma tentativa que morreu (rede,
timeout de Deno) e a retomada, e nada nesta fase impede novas candidaturas durante os 15 dias —
nunca entra em `caminhos`, nunca é removido, e faz `restantes.length > 0`.

**Estado alcançado:** os CVs originais **já foram apagados** pelo laço; `storage_concluido_em`
**não** é carimbado; o pedido fica em `situacao='executando'` com `causa='falha_storage'`,
respondendo 500. Na tentativa seguinte o laço não encontra mais nada para apagar, a conferência
mede o mesmo objeto novo, e reprova **de novo**. **Terminal, e para sempre** — currículo destruído,
PII intacta, sem caminho de operador (WR-09).

### O que o fix faz em vez disso

A conferência passou a separar dois fatos que ela tratava igual:

| o que a re-enumeração encontrou | o que significa | o que o motor faz |
|---|---|---|
| um caminho **que estava no plano** | o `remove()` daquele caminho **FALHOU** | falha FECHADA, sem carimbo — **igual a antes** |
| um caminho que **não estava no plano** | ele entrou **depois** do passo 0 | varre: `remove()` + re-enumeração; se o prefixo ficou vazio, **carimba** |

E a varredura é de **uma passada só**. Um laço até convergir dentro de uma Edge Function com timeout
trocaria um estado terminal por outro; uma passada faz um upload que chegue *durante* a varredura
reprovar **esta** tentativa — e a seguinte fecha, porque o laço do plano já não encontra nada e a
varredura pega o retardatário.

⚠ **O `plano.caminhos` NÃO foi tocado, e isso é deliberado.** O `45-REVIEW-2.md:341` sugere
`plano.caminhos = [...new Set([...caminhos, ...restantes])]`. Não fiz isso: a captura de antes da
primeira mutação é o que torna a mutação não-atômica retomável — é literalmente o ERASE-04 — e
redescobrir caminhos depois é o que o desenho proíbe. **Quem tolera o prefixo mudado é a
conferência; o plano não deriva.** A `(ap2)` mede o `caminhos` do carimbo do passo 1 e exige que ele
seja idêntico ao do passo 0.

Por que varrer, em vez de ignorar o objeto novo: deixá-lo produziria um recibo afirmando que o
currículo foi apagado enquanto o arquivo continua no bucket — e, depois do passo 2 (que anula
`curriculo_url`) e do passo 3 (que apaga a conta do Auth), **nada mais no sistema seria capaz de
encontrá-lo**. É o mesmo desfecho que o BL-03 existe para impedir, por outra porta.

### O desfecho é RETOMÁVEL, ou só um erro mais claro?

**RETOMÁVEL — e, no caso descrito, sequer chega a falhar.** O gatilho do WR-A (um objeto novo sob o
prefixo) passa a produzir uma execução que **completa**: carimba `storage_concluido_em`, segue para
os passos 2, 3 e 4, e o pedido termina `concluido`. A `(ap)` mede o 200 e o
`auth_concluido_em`, não só a ausência de exceção. O caso em que ele ainda reprova — a varredura
que não limpa o prefixo, `(ap4)` — é falha **fechada com o arquivo ainda existindo**, que é o lado
certo e continua retomável (a próxima tentativa re-varre).

---

## WR-E · o plano persistido consumido sem forma verificada

### O estado do motor quando a condição ocorre

A única condição para reusar o plano persistido era `Array.isArray(plano.caminhos)` (`:810`),
enquanto `plano.achados_resumo.nao_devolvidos = …` e `plano.contagens.storage_remove = …` rodavam
**depois** do laço de remoção (`:869-870`). Um plano gravado por outra versão — rollback de deploy,
edição manual da coluna — sem uma dessas duas chaves fazia a remoção acontecer e **só então** lançar
`TypeError`.

**Estado alcançado:** os arquivos **já foram apagados**; `TypeError` não é `ErroDePasso`, então o
`catch` atribuía `"postgres"` por default e gravava `causa='falha_postgres'` para uma execução que
parou **no Storage, depois de apagar**. A retomada repete o mesmo `TypeError` indefinidamente.
**Terminal, e com a `causa` mentindo** — e a `causa` é, pelo próprio docblock dos helpers, «a única
pergunta que importa às 3 da manhã».

### O que o fix faz em vez disso

`normalizarPlanoPersistido(plano, prefixo)` roda **antes do passo 1**, nos dois ramos (plano
recém-montado e plano vindo do banco):

1. `contagens` vira objeto simples com **apenas** entradas numéricas finitas — um valor não-numérico
   ali viraria `NaN` no `arquivos_apagados` da resposta e no recibo;
2. `achados_resumo` vira objeto com `blob_orfao` e `ponteiro_morto` numéricos, preservando os
   opcionais que existirem;
3. **`caminhos` é re-validado contra o prefixo do titular.** O WR-03 peneira a lista *montada* no
   passo 0; um plano vindo do banco nunca passou por aquela peneira e ia direto a um `remove()` que
   roda com a service key e **ignora RLS**. Um caminho de outra pessoa ali apagaria o CV dela,
   irreversivelmente — sem PITR e com o Storage fora de todo backup. O descarte é registrado em
   `achados_resumo.fora_do_prefixo` e **não para o passo**: com a varredura do WR-A no lugar, o
   prefixo do titular é limpo assim mesmo, e parar ali criaria um estado terminal novo.

E o `catch` deixou de assumir `"postgres"`: uma exceção que não é `ErroDePasso` herda o passo em que
a execução estava. ⚠ O default continua `"postgres"` **até o passo 1 começar** — dizer
`falha_storage` antes de qualquer remoção afirmaria que o currículo pode ter sido destruído quando
nada foi tocado, que é exatamente a razão escrita no docblock de `causaDaFalha()`. A `(ar2)` pina
esse lado.

### O desfecho é RETOMÁVEL, ou só um erro mais claro?

**Nem um nem outro: o erro deixa de existir.** Depois da normalização o passo 1 tem onde escrever,
carimba, e a execução segue até o fim — a `(aq)` mede 200 e `storage_concluido_em`, não uma mensagem
melhor. Não é um `TypeError` mais legível; é a **ausência** do `TypeError`.

O que sobra como falha — o `remove()` devolvendo uma forma desconhecida, `(ar)` — é falha
**fechada** (sem carimbo) e com a `causa` nomeando o sistema certo. **Deixei esse `TypeError` no
lugar de propósito**, em vez de coagir `data` para `[]`: coagir carimbaria `storage_remove` menor do
que o que o passo de fato apagou, ou seja, a prova que sobrevive ao titular subestimando o próprio
ato. Diante de uma API que mudou de forma, parar é o lado certo — e agora quem lê a linha sabe em
qual sistema parou.

---

## ⚠⚠ A PROVA POR MUTAÇÃO — executada, não afirmada

O precedente desta fase é explícito: a `(C7)` do round 2 não alcançava o defeito porque a fixture
fazia a versão quebrada e a corrigida se comportarem igual. Então **rodei os 9 casos novos contra o
código PRÉ-fix**, numa árvore isolada
(`git show HEAD:…/index.ts` copiado para fora do repositório, com o arquivo de teste **atual**):

```
PRÉ-fix  (index.ts de HEAD + testes novos):  81 passed | 6 failed
PÓS-fix  (árvore de trabalho):               87 passed | 0 failed
```

As **6** que falham no pré-fix, com a mensagem que a reprovação produziu lá:

| caso | o que mede | falha no pré-fix com |
|---|---|---|
| `(ap)` | objeto novo sob o prefixo → varrido e o passo carimba | `500` onde se espera `200` |
| `(ap2)` | o plano NÃO deriva; o varrido vira contagem | `o passo 1 tem de ter carimbado` |
| `(aq)` | plano sem `contagens`/`achados_resumo` completa | `500` onde se espera `200` |
| `(aq2)` | `contagens` escalar e `achados_resumo` array normalizados | `500` onde se espera `200` |
| `(aq3)` | caminho alheio no plano persistido não vai ao `remove()` | `o caminho de outra pessoa JAMAIS pode ir ao remove()` |
| `(ar)` | exceção genérica no passo 1 → `falha_storage` | `falha_postgres` onde se espera `falha_storage` |

⚠ **Os outros 3 casos novos NÃO discriminam, e digo isso com todas as letras** — eles são guardas de
regressão, não prova de fix: `(ap3)` e `(ap4)` passam nas duas versões porque medem que a falha
**fechada** continua fechada (é o que a varredura não pode afrouxar), e `(ar2)` passa nas duas
porque mede que o default `"postgres"` antes do passo 1 **não** mudou.

⚠ E **zero regressão nos 78 antigos**: os 81 que passam no pré-fix são os 78 pré-existentes + esses
3. Nenhum teste antigo precisou ser editado — em particular o `(w)`, que é a asserção de falha
fechada sobre resíduo, continua verde sem uma linha alterada. Foi essa restrição que me levou à
distinção «resíduo planejado × objeto posterior»: qualquer fix que fizesse o `(w)` mudar de
comportamento teria afrouxado a falha fechada.

---

## ⚠ HANDOFF Nº 1 PARA O 45-11 — os `md5(prosrc)` **NÃO** mudaram

Os dois achados moram na Edge Function; **nenhuma migration foi tocada** (`git diff` de
`supabase/migrations/`: **vazio**). Recomputei mesmo assim, por execução da receita do smoke
§PROVENIENCIA sobre os arquivos como estão neste commit — não transcrevi do documento anterior:

| função | `md5(prosrc)` | octetos | mudou neste plano? |
|---|---|---|---|
| `public.plano_exclusao_titular(uuid)` | `97634d07ef13447e06741a8c8372fca6` | 21349 | **não** |
| `public.anonimizar_candidato(uuid, boolean)` | `8c86e0f040219e7eade47eb587dbf5de` | 34488 | **não** |

Batem com o `45-15-SUMMARY.md` e com o `45-REVIEW-3.md:224-225`. Prova de que a extração não pegou
prosa: cada delimitador aparece **exatamente 2×** no seu arquivo, e o corpo extraído começa em
`\nDECLARE\n` e termina em ` );\nEND;\n` nos dois casos. **A referência do portão continua sendo o
`45-15-SUMMARY.md`**, agora reconfirmada por medição independente.

## ⚠ HANDOFF Nº 2 — o contador FIXO do smoke continua **24**

`supabase/tests/p45_motor_exclusao_smoke.sql` **não foi tocado**. Este plano não acrescenta asserção
SQL nenhuma — as 9 novas são Deno, e a suíte Deno não tem contador fixo (o gate é `0 failed`).

## ⚠ HANDOFF Nº 3 — a suíte Deno subiu de 78 para 87

Quem reconferir o número do `45-REVIEW-3.md:182` (*«`HEAD` → 78 passed | 0 failed»*) vai encontrar
**87**. A diferença são exatamente os 9 casos deste plano, listados na tabela acima. Nenhum caso
antigo foi removido nem editado.

---

## Os 21 guards — o que este plano tocou, e o que não

Só verifiquei o que este plano poderia ter quebrado; os demais não foram tocados por construção
(nenhuma migration mudou).

| # | veredito | como conferi |
|---|---|---|
| **G13** | **intacto** | `montarPlano` está **byte a byte idêntico ao HEAD** — conferido por `diff` do corpo extraído da função nas duas versões. O guard de falha fechada estrutural (`ponteiros` crus antes da filtragem) e a recusa de descarte integral do BL-03 não foram tocados. As `(v)`, `(v2)` e `(v3)` seguem verdes. |
| **G7** | **intacto** | Zero SQL sobre a tabela de objetos do Storage na EF: a única ocorrência do token em `index.ts` é a **prosa** do comentário `:842` que proíbe a prática. A varredura nova usa a Storage Admin API (`storage.from().remove()`), a mesma do laço do plano. |
| **G10** | **intacto** | `deleteUser` inalterado: `try/catch` para a exceção síncrona **e** `if (retornoDelete?.error) throw`, hard delete explícito `(authUid, false)`. As `(dd)`, `(dd2)` e `(cc)` seguem verdes. |
| **G12** | **intacto** | `helpers.ts` **não foi tocado** (`git status` limpo para ele): paginação com teto, erro de listagem lança, marcador de pasta lança. A varredura reusa `enumerarObjetosTitular`, então ela herda as três propriedades — inclusive a de que a re-enumeração vazia é PROVA. |
| **G11** | **intacto** | A releitura de `postgres_concluido_em` contra a autoridade antes do passo 3 não foi tocada. |
| **G14** | **intacto** | A varredura opera **exclusivamente** sobre caminhos que a própria enumeração de `{authUid}/` produziu — não há como um caminho de outro espaço de IDs entrar nela. E o WR-E **estreitou** a superfície: o plano persistido agora também é filtrado por prefixo. |
| **G20** | **intacto** | Commit único, sem `--no-verify`. |

⚠ **A varredura amplia o que o `remove()` pode alcançar?** Não. Os caminhos varridos saem de
`enumerarObjetosTitular(admin, "{authUid}/")`, que os constrói como `${pasta}/${name}` a partir do
prefixo — estar sob o prefixo do titular é uma **propriedade estrutural** deles, não uma validação
que alguém possa esquecer. E na direção oposta este plano **reduziu** superfície: a `(aq3)` prova
que um caminho alheio dentro do plano persistido deixou de chegar ao `remove()`.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Funcionalidade crítica ausente] O plano persistido ia a um `remove()` sob service key sem re-validação de prefixo**

- **Encontrado durante:** o fechamento do WR-E, ao escrever a verificação de forma.
- **Problema:** o WR-03 valida a lista **montada** no passo 0. Um `plano` vindo da coluna `jsonb`
  (rollback de deploy, edição manual, versão anterior da EF) nunca passou por aquela peneira, e
  `plano.caminhos` vai direto ao `remove()` com service key, que ignora RLS. Um caminho de outra
  pessoa ali apagaria o CV dela — sem PITR e com o Storage fora de todo backup.
- **Correção:** a re-validação entrou em `normalizarPlanoPersistido`, com o descarte registrado em
  `achados_resumo.fora_do_prefixo` e **sem** parar o passo (a varredura do WR-A limpa o prefixo de
  qualquer forma).
- **Prova:** `(aq3)`, que **falha no pré-fix** com «o caminho de outra pessoa JAMAIS pode ir ao
  remove()» — ou seja, o defeito era **ativo**, não hipotético.
- **Arquivos:** `supabase/functions/executar-direito-titular/index.ts`

**2. [Rule 1 - Bug] A `causa` atribuía `falha_postgres` a exceções genéricas ocorridas no Storage**

- **Encontrado durante:** o WR-E o descreve como consequência do seu próprio gatilho; a
  normalização mata o gatilho, mas não a **classe**.
- **Correção:** `passoCorrente`, atualizado na entrada de cada passo, herdado pelo `catch` quando o
  erro não é `ErroDePasso`. O default continua `"postgres"` até o passo 1 começar.
- **Prova:** `(ar)` (discrimina: `falha_postgres` → `falha_storage`) e `(ar2)` (pina o lado que
  **não** pode mudar).
- **Arquivos:** `supabase/functions/executar-direito-titular/index.ts`

### O que eu deliberadamente NÃO fiz

- **Não uni `restantes` ao `plano.caminhos`**, apesar de ser a sugestão literal do
  `45-REVIEW-2.md:341` — o plano congelado é o ERASE-04. Está registrado em `key-decisions` e medido
  pela `(ap2)`.
- **Não coagi `data` para `[]`** no `remove()` — a razão está em `key-decisions` e o caso é medido
  pela `(ar)`.
- **Não toquei WR-B, WR-C, WR-D, WR-F, WR-G, NW-01…NW-06.** WR-C foi **reduzido** pelo round 3 com
  rastreamento de alcançabilidade e não é condição de portão; os demais seguem em
  `deferred-items.md` (`DI-45-14-02`). Não reabri nada que o round 3 tenha resolvido.
- **Não rodei `deno fmt`.** Ele já reprovava os dois arquivos **antes** deste plano (conferido
  contra `HEAD`) e não há script npm que o execute — formatar agora produziria um diff de arquivo
  inteiro sobre linhas que este plano não tocou. Mesma situação para os 4 achados de `deno lint`
  (2 `no-import-prefix` + 2 `ban-unused-ignore`), todos em linhas pré-existentes e intocadas.

---

## Baselines

| gate | antes | depois |
|---|---|---|
| `deno test` (EF do titular) | 78 passed / 0 failed | **87 passed / 0 failed** |
| `npm run test:run` | 1892 | **1892 passed** (187 arquivos) |
| `npm run lint` (`tsc --noEmit`) | 97 | **97** |
| `deno check` da EF | limpo | **limpo** |
| `check:*` (os cinco) | verdes | **verdes** |
| dependências npm novas | — | **zero** |
| commits com `--no-verify` | 0 | **0** |
| migrations tocadas | — | **zero** |

---

## Next Phase Readiness

**O portão da execução REAL (não-dry-run) da Task 3 do 45-11 pode ser reaberto para reavaliação.**
As duas condições que o `45-REVIEW-3.md:501-504` manteve — **WR-A** e **WR-E** — estão fechadas por
mecanismo, e o mecanismo é discriminado por 6 testes que **falham** no código de `HEAD`.

O que o 45-11 confere, sem mudança em relação ao que já estava escrito:

1. `md5(prosrc)` contra a tabela do `45-15-SUMMARY.md` — **reconfirmada** aqui por medição
   independente (handoff nº 1);
2. contador do smoke: **24**, lido do cabeçalho do arquivo (handoff nº 2);
3. suíte Deno: **87**, e não mais 78 (handoff nº 3).

⚠ **O que este plano NÃO fecha, e o portão precisa saber:**

- **NW-03 continua de pé, e este plano ALARGOU a colisão que ele descreve.** Contado por execução
  (`grep -oE 'ErroDePasso\("storage", ?"[a-z_]+"' | sort -u`): eram **7** classes distintas e agora
  são **10** — as três novas são `varredura_pos_plano`, `list_pos_varredura` e
  `residuo_apos_varredura`. Somam-se a `carimbo` (quando o `UPDATE` de um passo de Storage falha) e,
  **por causa deste plano**, a `excecao` — uma exceção genérica no passo 1 agora chega à linha como
  `falha_storage` em vez de `falha_postgres`, que é o fix correto e **um membro a mais** na mesma
  colisão. A `classe` continua indo só para o log redigido, nunca para a linha. Não é destruição e é
  o lado seguro, mas o diagnóstico de um pedido parado segue exigindo o log da invocação — e o fix
  barato que a NW-03 propõe (persistir `ultima_classe` no `plano`) ficou por escrever.
- **WR-B, WR-D, WR-F e WR-G continuam abertos** (`DI-45-14-02`). O round 3 não os colocou como
  condição de portão nenhum; o WR-F em particular **cresceu** com o fix do BL-02, e a linha no
  `COMMENT` que o round 2 pediu continua não escrita.
- **`EXPORT-03` segue não exercitado em produção**, então o caminho de leitura do Storage de que o
  passo 1 depende continua não-provado fora do dublê. Não mudou e não é achado desta fase.
- **A varredura nunca rodou contra a Storage Admin API real** — ela é exercitada contra o mock com
  bucket-como-estado. É a mesma forma de garantia do laço de remoção que já existia, e o mesmo
  limite.

---

## Self-Check: PASSED

Conferido por execução, não por memória:

- os 2 arquivos modificados e este SUMMARY existem no disco;
- `deno test` da EF: **87 passed | 0 failed**; prova por mutação contra `HEAD`: **81 passed | 6
  failed**, com as 6 nomeadas e conferidas uma a uma;
- `npm run test:run`: **1892/1892**; `npm run lint`: **97**; `deno check`: limpo; os cinco `check:*`
  verdes;
- os dois `md5(prosrc)` **recomputados pela receita do smoke** sobre os arquivos como estão neste
  commit — inalterados, e `git diff supabase/migrations/` vazio;
- `montarPlano` conferido **byte a byte** contra `HEAD` (G13 e o guard do BL-03 intactos);
- `helpers.ts` e `p45_motor_exclusao_smoke.sql` não aparecem em `git status`.

---
*Phase: 45-motor-de-exclus-o-anonimiza-o*
*Completed: 2026-08-11*
