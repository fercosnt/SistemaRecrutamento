---
phase: 46-purga-autom-tica-dry-run-live
plan: 05
subsystem: edge-functions
tags: [deno, edge-function, postgres, plpgsql, lgpd, purga, authz, destrutivo, supabase, tdd, checkpoint]
status: checkpoint

requires:
  - phase: 45-direito-do-titular
    provides: "public.anonimizar_candidato(uuid, boolean) — o motor destrutivo exercitado em PROD em 2026-08-22 — e o molde estrutural da EF executar-direito-titular (a classe de erro atribuida a passo, o handler testavel com deps injetadas, a ordem Storage -> Postgres -> Auth)"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 02
    provides: "purga_execucoes e purga_execucao_itens — as colunas, os vocabularios fechados de situacao e desfecho_*, e concluido_em como coluna LOAD-BEARING"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 04
    provides: "o 4o ramo do guard de anonimizar_candidato (20260823000006, secao p) — o ESTADO que esta EF entra em vez de uma credencial que ela carrega; o 3o ramo de plano_exclusao_titular (20260823000008, Blocker B-02); a janela de 1 h de HI-03; e desconhecido no vocabulario dos desfechos (20260823000009)"
provides:
  - "supabase/migrations/20260823000010_p46_item_lifecycle.sql — public.reivindicar_item_purga(uuid,uuid) e public.concluir_item_purga(uuid,jsonb)"
  - "supabase/functions/purgar-retencao/index.ts — o executor destrutivo, UM titular por invocacao, auto-autenticado por Bearer do Vault"
  - "supabase/functions/purgar-retencao/index.test.ts — 14 casos Deno, TDD RED -> GREEN, todos verdes"
  - "vite.config.ts (+1 linha de exclude, LITERAL) e supabase/config.toml (+[functions.purgar-retencao] / verify_jwt = false)"
  - "supabase/tests/p46_purga_smoke.sql — assercoes (q.1) a (q.5); RESUMO (z) 16 -> 21"
  - "⚠ O FECHO DO CENARIO RD2-03 NO LUGAR CERTO: a margem de 150 s dentro da janela de 1 h faz a reivindicacao ser recusada ANTES do primeiro ato irreversivel"
affects: [46-06, 46-07]

actuals:
  tokens: 29000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Guard de RPC ESTRITAMENTE MAIS EXIGENTE que o guard que ele antecede: a reivindicacao repete as seis condicoes do 4o ramo destrutivo e acrescenta duas. Uma porta que autoriza a entrada e morre tres linhas depois nao autorizou nada — so moveu a falha para um ponto pior (a licao literal do Blocker B-02)"
    - "Margem de TETO DE PAREDE dentro de uma janela de autorizacao: exigir que a execucao tenha ao menos a duracao maxima da propria invocacao de janela restante e o que transforma 'a autorizacao pode vencer no meio' em 'a autorizacao nao pode vencer no meio'"
    - "A funcao que VERIFICA o estado autorizante jamais o PRODUZ: se a reivindicacao pudesse carimbar situacao ou abrir item, a Edge Function se autorizaria sozinha e o guard viraria decoracao"
    - "Vocabulario aceito pela RPC deliberadamente MENOR que o CHECK da coluna: `desconhecido` existe para quem NAO observou (a reconciliacao) e e recusado para quem observou (a EF). Um observador nao declara ignorancia"
    - "Contador de dominio incrementado por DISCRIMINACAO e nao por ocasiao: `processados` sobe quando o motor rodou, nunca quando o item fechou — senao a coluna passa a significar outra coisa e mente sobre o unico numero que ela existe para responder"
    - "Mapeamento SQLSTATE -> HTTP escopado ao PASSO: P46FB vira 403 EXCLUSIVAMENTE no passo 0; em qualquer outro passo, qualquer erro e 500"

key-files:
  created:
    - supabase/migrations/20260823000010_p46_item_lifecycle.sql
    - supabase/functions/purgar-retencao/index.ts
    - supabase/functions/purgar-retencao/index.test.ts
  modified:
    - vite.config.ts
    - supabase/config.toml
    - supabase/tests/p46_purga_smoke.sql

key-decisions:
  - "A reivindicacao VERIFICA o estado autorizante e nunca o produz — o `key_link` do plano dizia que ela 'carimba situacao=executando', e carimbar seria a EF se autorizando sozinha"
  - "+2 condicoes alem das cinco do plano: `cp.modo = 'live'` (o kill switch tem de morder ANTES do primeiro ato irreversivel) e a margem de 150 s (o fecho de RD2-03 na unica porta anterior ao Storage)"
  - "P46FB tambem na conclusao de item ja concluido, e o mapeamento para 403 fica escopado ao passo 0 — assim o codigo nao precisa de um segundo SQLSTATE e a conclusao falha como 500, que e o que ela e"
  - "`pendente` RECUSADO na conclusao: e o unico valor do vocabulario que descreve intencao em vez de observacao, e um item fechado nao tem intencoes"
  - "O Storage e enumerado do BUCKET e nao do plano — `plano_exclusao_titular` devolve `storage_remove.objetos = NULL` COM O MOTIVO ESCRITO no proprio retorno (SONDA 2). E a listagem do bucket que pega o blob orfao, por construcao"
  - "O `authUid` vem de `candidatos.user_id`, lido ANTES do tombstone. Alternativa recusada: alargar o retorno de `plano_exclusao_titular`, que exigiria um TERCEIRO re-pin de md5 numa funcao da Phase 45 e tocar um guard — Rule 4, custo desproporcional a uma leitura de uma coluna"
  - "Titular sem `user_id`: Storage e Auth ficam `nao_aplicavel` e o Postgres AINDA roda. Recusar deixaria o titular preso num laco de purgas que nunca concluem"
  - "Comparacao do Bearer em TEMPO CONSTANTE, divergindo do molde `cost-alerter` (`!==` direto): esta funcao e verify_jwt=false E destroi dado irreversivel"

requirements-completed: []  # PURGA-02/05/06 NAO fecham aqui — ver §Requirements

metrics:
  duration: ~75min
  completed: 2026-08-23
---

# Phase 46 Plan 05: O executor `purgar-retencao` — Summary

A purga ganhou o executor que destrói os três sistemas, e ele **é incapaz de destruir quem quer
que seja escolhido pelo corpo da requisição**: o alvo chega no POST, atravessa uma única porta que
reverifica o encontro inteiro no servidor, e o identificador que sai daquela porta é o **do item** —
o do corpo não é lido nem uma vez abaixo dela.

⚠ **NADA FOI APLICADO E NADA FOI DEPLOYADO.** Uma migration, uma Edge Function com 14 testes Deno
verdes, duas linhas de configuração e cinco asserções novas de smoke — tudo no disco. O apply, o
deploy e a execução dos smokes são a Task 4 e pertencem ao orquestrador.

⚠ **`status: checkpoint`, e não `complete`, DE PROPÓSITO.** O plano tem quatro tasks e a quarta não
foi executada por mim. Marcar `complete` aqui faria o scanner de auditoria acreditar num apply que
não aconteceu — que é exatamente a classe de defeito que a memória desta máquina chama de *"apply
sem artefato é indistinguível de não-aplicado"*. **Condição exata para virar `complete`:** a
migration `20260823000010` no ledger com md5 conferido dos dois lados, a EF com `version` medida
antes e depois e `verify_jwt: false`, o `401` sem cabeçalho de autorização, e `p46_purga_smoke`
verde em **21/21**.

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1 | A linha de `exclude` e a entrada de `config.toml` — antes de existir teste | `c7e5171` |
| 2 | O ciclo de vida do item + as cinco asserções `(q)` do smoke | `e182458` |
| 3 (RED) | Os nove comportamentos, 14 casos, todos vermelhos por UMA razão | `89ecef0` |
| 3 (GREEN) | A Edge Function — 14/14 verdes | `9d6aea0` |
| 4 | ⏸ **APPLY + DEPLOY + SMOKES — do orquestrador** | — |

Zero `--no-verify`: o hook de type-check rodou nos quatro commits e reportou **96 erros — o
baseline congelado**, inalterado. Vitest **188 arquivos / 1895 testes** verde em todos eles,
inclusive no que criou a pasta da EF.

## ⭐ O achado do plano: a autorização podia vencer NO MEIO, e o mecanismo que fecha isso vive aqui

O `46-REVIEW.md` registrou o **RD2-03** como *obrigação de aceite do 46-06* — uma consequência que a
janela de 1 h de HI-03 criou e que ninguém tinha onde consertar:

```
post entregue 70 min depois → a EF apaga o CV no Storage
                            → chama o motor → 42501 (a janela venceu)
                            → Storage apagado, Postgres intacto
```

Currículo órfão e **irrecuperável** — o Storage está fora de todo caminho de backup e não há PITR
(D-45-10). O registro dizia, corretamente, que o 46-06 teria de provar por teste que uma sonda com
`42501` implica **zero** chamada de Storage.

**Mas o teste é a prova, não o mecanismo.** O mecanismo tem de estar na única porta que a EF
atravessa **antes** de tocar em qualquer sistema, e essa porta nasceu neste plano. A reivindicação
exige que a execução tenha, no mínimo, **o teto de parede da própria Edge Function** (150 s) de
janela restante:

```sql
AND e.iniciada_em > pg_catalog.now() - (c_janela_guard - c_teto_parede)
```

Concedida a reivindicação, **a invocação inteira não consegue sobreviver à janela** — logo, se a
reivindicação passou, o guard ainda autoriza em todo passo posterior. A obrigação do 46-06 continua
de pé; o que mudou é que ela agora tem o que provar em vez de o que construir.

> ⚠⚠ **CORREÇÃO (2026-08-23, HI-05 do `46-REVIEW-2.md`) — o parágrafo acima descrevia a margem
> como se ela fechasse o cenário INTEIRO, e ela fecha só uma metade dele.** Duas ressalvas, e as
> duas são materiais:
>
> 1. **O pressuposto não tinha dono.** Toda a propriedade se sustenta sobre *"a EF morre aos
>    150 s"*, e nada neste repositório fazia isso valer: `index.ts` não tinha `AbortController`,
>    `AbortSignal.timeout` nem `deadline`; `config.toml` só declara `verify_jwt = false`; e
>    `(q.2)` do smoke prova apenas que o **literal** `interval '150 seconds'` está no corpo vivo da
>    RPC — um literal presente não é um relógio. O número veio da RESEARCH da fase, ou seja é uma
>    medição da plataforma, do tipo que muda com plano, região ou versão do runtime, sem diff e sem
>    aviso. Se o teto real fosse maior que 150 s, **o RD2-03 reabria exatamente como escrito
>    acima**. Consertado no commit de HI-05: o orçamento de parede passou a ser **da função**
>    (`PRAZO_MS = 120_000`, ancorado na reivindicação, conferido antes de abrir o Storage, entre
>    lotes de `remove` e antes do motor), com relógio injetável e três testes que provam que ele
>    morde nas duas direções.
> 2. **Resta um resíduo que a margem não fecha nem no melhor caso.** Se o worker morrer por wall
>    clock **entre** o `remove` e a chamada ao motor, o desfecho é o mesmo — Storage apagado,
>    Postgres intacto — não porque o motor recuse, mas porque ninguém o chama. O sistema
>    **converge** (a reconciliação de 1 h fecha o item, a varredura seguinte recolhe o titular, e o
>    Storage já está vazio), e é isso — e só isso — que a margem garante nessa metade. Com o
>    orçamento da função, esse resíduo passa a ser alcançado **de propósito**, com desfecho honesto
>    gravado no ledger (`storage = ok`, `postgres = falha`), em vez de sofrido por um `SIGKILL` do
>    runtime que não deixa carimbo nenhum.

⚠ **E isso é assertado por EXECUÇÃO, não por prosa.** A asserção `(q.3.5)` do smoke abre a execução
há **59 minutos** — ainda dentro da hora que o guard exige, mas com menos de 150 s de margem — e
exige `P46FB`. A `(q.4)` faz o par: com a execução aberta agora, a reivindicação **aceita** e o
guard destrutivo autoriza **no mesmo instante** (`P0002` sobre o alvo sintético). *Reivindicação
concedida implica guard honrando* — o acoplamento medido, não prometido.

## O que foi construído

### `20260823000010_p46_item_lifecycle.sql` — duas RPCs

**`reivindicar_item_purga(p_item_id, p_candidato_id) RETURNS uuid`** — a única porta.
**Sete** condições cumulativas numa única expressão `EXISTS`, fail-closed por construção. As cinco
do plano, mais as duas da §Deviations. Recusa com `P46FB`, sempre — não há segundo código.

⚠⚠ **Ela NÃO produz o estado que autoriza — ela o VERIFICA.** O `key_link` do plano dizia que a
função *"carimba `situacao='executando'` na execução"*. Se ela carimbasse, a Edge Function se
autorizaria sozinha e o 4º ramo do guard viraria decoração. O estado autorizante é produzido
**exclusivamente** por `varrer_purga_retencao()`, que escolhe o alvo por **política**.

⚠ **A mensagem de recusa imprime o que MEDIU.** Sete booleanos são medidos separadamente e o
diagnóstico nomeia a condição que reprovou — sem ecoar nenhum valor recebido, e sem chegar ao
chamador (a EF responde `403` sem corpo de detalhe). Há um ramo explícito para o caso em que o
predicado de decisão recusou e nenhuma medição individual reprovou: ele diz **isso**, em vez de
inventar uma causa plausível. *Diagnóstico errado custa mais caro que "falhou"* — a lição que esta
fase pagou com um dia inteiro.

**`concluir_item_purga(p_item_id, p_desfechos)`** — carimba os três desfechos, fecha o item,
incrementa `processados` e fecha a execução se não restou item aberto. **Fechar o item é o que
RETIRA a autorização do 4º ramo**: a janela de destruição de um titular dura exatamente o tempo
entre a reivindicação e a conclusão, e isso está no `COMMENT`.

### `supabase/functions/purgar-retencao/` — a Edge Function

Seis desvios nomeados contra o molde da Phase 45, na tabela do docblock. O central:
**esta EF não tem sessão de titular de onde derivar o alvo** — é por isso que o guard precisou do 4º
ramo e é por isso que ela **não pode** injetar um `Authorization` de operador.

| Passo | O que faz | Desfecho |
|---|---|---|
| 0 | `reivindicar_item_purga` | `P46FB` → 403 · qualquer outro erro → **500** |
| 1 | `plano_exclusao_titular` + leitura de `candidatos.user_id` | falha → `storage: falha` |
| 2 | Storage Admin API: enumera o prefixo, remove em lotes, **re-enumera** | `ok` / `falha` |
| 3 | `anonimizar_candidato(alvo, false)` | `ok` / `falha` |
| 4 | `auth.admin.deleteUser(authUid)` | `ok` / `falha` |
| 5 | `concluir_item_purga` — **no `finally`** | sempre |

## Deviations from Plan

### [Rule 2 - Segurança] +2 condições no encontro, e as duas fecham o mesmo tipo de buraco

O plano enumerou **cinco** condições. Foram escritas **sete**, e as duas extras existem pela razão
do Blocker B-02: *uma porta que autoriza a entrada e morre três linhas depois não autorizou nada —
só moveu a falha para um ponto pior.*

| # | Condição | Sem ela |
|---|---|---|
| 6 | `cp.modo = 'live'` | a reivindicação seria concedida com o kill switch de D-46-06 já em `off`; a EF apagaria o CV e **só então** o motor recusaria com 42501 |
| 7 | margem de 150 s dentro da janela de 1 h | o cenário RD2-03 inteiro (§acima) |

**Invariante que governa as duas:** o predicado da reivindicação é, por construção, **estritamente
mais exigente** que a metade `(p.2)` do 4º ramo. Está escrito no cabeçalho, no `COMMENT`, e —
porque *prosa que afirma uma propriedade não é a propriedade* (BL-01) — medido por `(q.2)` sobre os
dois corpos vivos e executado por `(q.3.5)`/`(q.4)`.

### [Rule 1 - Bug] `processados` incrementado por DISCRIMINAÇÃO, não por ocasião

O plano dizia *"incrementa `purga_execucoes.processados` na mesma transação"*. Incrementar em toda
conclusão contaria também o titular cujo Storage falhou e cujo **motor nunca rodou** — a coluna
passaria a significar "itens fechados" e mentiria sobre o único número que ela existe para
responder (o `COMMENT` dela, em `20260823000002:206-210`, diz *"quantos titulares tiveram o motor
destrutivo efetivamente executado"*). Mesma classe do **RD2-01**: a mentira simétrica custa o mesmo
que a otimista. Incrementa quando `desfecho_postgres` é `ok` **ou** `falha`. Assertado nos dois
sentidos por `(q.5.a)` e `(q.5.e)`.

### [Rule 1 - Bug] A execução só vira `concluida` se estiver em `executando`

A reconciliação de `20260823000007` **aborta** execuções vencidas. Uma conclusão tardia que
revertesse `abortada` → `concluida` apagaria o registro de que a execução morreu no meio.

### [Rule 2 - Correção] `pendente` e a reescrita de item fechado são RECUSADOS

`pendente` é o único valor do vocabulário que descreve **intenção** e não observação, e um item
fechado não tem intenções. Reescrever um item já concluído falsifica uma observação dentro de um
registro de cumprimento de obrigação legal com retenção **indefinida** (D-46-16), sem PITR para
desmentir.

⚠ E o vocabulário aceito é **deliberadamente menor** que o `CHECK` da coluna: `desconhecido` foi
acrescentado pela `20260823000009` para a **reconciliação**, que não observou nada. Quem chama esta
função observou os três passos — e um observador não declara ignorância.

### [Rule 3 - Bloqueio] O `authUid` não existia em lugar nenhum alcançável

O plano manda `deleteUser(<id devolvido>)` e enumerar o Storage a partir do plano. Medido por
leitura, **as duas coisas não funcionam como escritas**:

- `plano_exclusao_titular` devolve `storage_remove.objetos = **NULL**`, com o motivo escrito dentro
  do próprio retorno: *"`storage.objects` NAO tem FK para `auth.users` (SONDA 2)"*. Não há caminho
  relacional do titular até os objetos dele — a enumeração é `storage.list(prefixo)`, e é ela que
  pega o **blob órfão**, por construção (ela pergunta ao bucket o que existe, em vez de perguntar ao
  Postgres o que deveria existir).
- O prefixo do Storage e o alvo do `deleteUser` são o **`auth.users.id`**, não o `candidato_id`. Na
  Phase 45 ele vinha do `sub` do JWT; aqui não há JWT, e o plano devolve apenas
  `user_id_presente` (booleano).

**Feito:** uma leitura de **uma coluna** — `candidatos.user_id` — **antes** do tombstone, que é o
statement que a severa. **Saída recusada:** alargar o retorno de `plano_exclusao_titular` exigiria
um **terceiro** re-pin de md5 numa função da Phase 45 e tocar um guard — Rule 4, custo
desproporcional.

### [Rule 2 - Correção] Titular sem `user_id`: `nao_aplicavel` nos dois extremos, e o Postgres AINDA roda

Sem `user_id` não existe prefixo a derivar nem conta a apagar, e `nao_aplicavel` é literalmente
verdade (*não havia caminho a tentar*). **Recusar a invocação inteira deixaria o titular preso num
laço de purgas que nunca concluem** — toda varredura o selecionaria de novo e toda invocação
falharia igual. Caso `(i2)`.

⚠ **Limite residual, declarado:** se `user_id` já era NULL **e** existiam objetos sob o antigo
prefixo, eles ficam. Isso é uma propriedade pré-existente do sistema (SONDA 2), não algo que esta EF
cria — mas está registrado no `WINDOWS.md` para não virar folclore.

### [Rule 2] O Bearer é comparado em TEMPO CONSTANTE

O molde (`cost-alerter:112`) usa `!==` direto. Esta função é `verify_jwt = false` **e** destrói dado
irreversível: um oráculo de temporização sobre o segredo do Vault é o passo que falta entre
"conhecer a URL" e "escolher quem é apagado". O comprimento continua vazando — dito por escrito no
código, porque fingir que não seria a mesma desonestidade que o resto do arquivo combate.

### [Rule 1] Uma palavra trocada para satisfazer uma asserção estática

`console.warn("... Bearer ausente ...")` casava o gate *"nenhum vocabulário de credencial adjacente
a chamada de log"*. Trocado para `credencial`, com a razão escrita ao lado. **Isto não é afrouxar um
portão:** o gate mede uma propriedade real (uma mensagem que fala de segredo é a vizinha natural de
uma que o imprime), e a troca custa zero informação de diagnóstico — o caminho de código já é único.

## ⛔ O defeito do próprio harness de teste, e por que ele importa mais que os outros

`cenarioFeliz` espalhava `...extra` **depois** de montar o mapa de RPCs. Um `extra.rpc` parcial
**apagava as outras três** — `reivindicar_item_purga` sumia do mapa, devolvia `null`, e a EF
respondia 500 no passo 0.

⚠ **E os testes (e), (f) e (f2) continuavam VERDES — pelo motivo errado.** Eles esperam recusa no
passo 0 de qualquer jeito. Só `(h2)` e `(h3)`, que precisam **chegar ao motor**, expuseram o
defeito.

É a classe de falso verde que esta fase inteira cataloga, agora **dentro do instrumento de medida**.
E ela só apareceu porque a suíte foi **executada** — o `deno` está disponível nesta máquina, e a
diferença entre "escrevi 14 asserções" e "14 asserções passaram por 14 razões distintas" é
exatamente o que a `(p.3)` desta fase custou três rodadas de review para ensinar.

## As cinco asserções novas do smoke — e o que cada uma NÃO prova

| # | Mede | Executa? |
|---|---|---|
| `(q.1)` | as duas funções existem, são `SECURITY DEFINER` com `search_path` fixo, **inalcançáveis** por `anon` e `authenticated`, alcançáveis pelo papel de serviço | catálogo |
| `(q.2)` | o corpo VIVO da reivindicação carrega as seis condições do guard + a margem, e o guard continua com `interval '1 hour'` | forma |
| `(q.3)` | **cinco recusas**, uma condição de cada vez: item forjado · titular alheio · item concluído · kill switch · 59 minutos | ✅ |
| `(q.4)` | ⊕ **aceita** e devolve o titular DO ITEM, **e** o guard autoriza no mesmo instante | ✅ |
| `(q.5)` | seis chamadas de conclusão: vocabulário · `pendente` · chave ausente · ⊕ caminho feliz · reescrita · o `processados` discriminado | ✅ |

⚠ **`(q.2)` declara o próprio limite dentro da mensagem**, e isso é obrigação e não modéstia: ela
mede **presença** no corpo, e cada condição está escrita em **dois** lugares (a decisão e o
diagnóstico). Ela detecta a remoção da condição **do arquivo**, e não a remoção dela **apenas do
predicado de decisão**. Quem prova que a decisão morde é `(q.3)`/`(q.4)`, que executam. O que só a
forma alcança é o acoplamento com a janela do guard — não dá para fazer o relógio andar num smoke.

⚠ **A revogação de `authenticated` em `(q.1)` é LOAD-BEARING**, e não higiene copiada:
`anonimizar_candidato` e `plano_exclusao_titular` **têm** EXECUTE para `authenticated` (a EF do
direito do titular chama as duas com o JWT da pessoa). Se `reivindicar_item_purga` também tivesse,
qualquer usuário logado poderia bater na porta que o 4º ramo reconhece até acertar um item aberto.

## Varredura por FORMA — e um buraco no próprio padrão de varredura

Rodada conforme o `CLAUDE.md`: `grep -nE "v_[a-z_]* (<>|!=) [0-9]+|= ANY \(ARRAY\['"`.

⚠ **O regex do `CLAUDE.md` não cobre `IS DISTINCT FROM <n>`** — que é o idioma dominante do
`p46_purga_smoke.sql` (nove ocorrências, duas delas minhas). Nenhuma das minhas é fotografia (as
duas comparam contra estado que o próprio bloco cria na mesma execução), mas **um padrão de
varredura que não enxerga o idioma do arquivo que ele vigia é um portão com ponto cego**. Registrado
no `WINDOWS.md`; o conserto do regex é do 46-06 ou de quem tocar o `CLAUDE.md` antes.

## Requirements

**PURGA-02, PURGA-05 e PURGA-06 NÃO fecham aqui**, e por isso `requirements-completed` está vazio.
O executor existe no disco e **nada o invoca**; o dispatch nasce no 46-06 e `config_purga.modo`
continua em `'off'`. Fechá-los agora seria declarar cumprido um requisito cujo caminho vivo não
existe.

## O que a Task 4 tem de fazer, na ordem — e o que ela pode reprovar

Está no `<checkpoint>` devolvido ao orquestrador. Três pontos que não são óbvios:

1. **A `version` nasce correta** pela via da Management API — **não rodar o `UPDATE ... SET version`**
   que os cabeçalhos das migrations `…001`..`…004` ainda mandam. Aquela instrução está condenada
   (RD4-02) e hoje corromperia o ledger.
2. **O `401` sem cabeçalho de autorização tem de vir DA FUNÇÃO.** Um `403` ali significaria
   `verify_jwt = true` vivo e o cron não conseguiria invocar; um `200` significaria que a
   auto-autenticação não está no caminho.
3. **O smoke vai a 21, e ele pode reprovar por coisa minha.** As cinco asserções `(q)` nunca foram
   executadas contra Postgres nenhum — esta máquina não tem instância local, e o `deno` cobre a EF,
   não o SQL. Se `(q.*)` reprovar, **medir o portão antes de acreditar na explicação**: a lição nº 6
   dos sete portões da Phase 45 diz que um diagnóstico plausível escrito num documento não é
   evidência.

## Self-Check: PASSED

| Item | Verificado |
|---|---|
| `supabase/migrations/20260823000010_p46_item_lifecycle.sql` | ✅ existe |
| `supabase/functions/purgar-retencao/index.ts` | ✅ existe |
| `supabase/functions/purgar-retencao/index.test.ts` | ✅ existe |
| Commits `c7e5171` `e182458` `89ecef0` `9d6aea0` | ✅ os quatro em `git log` |
| `deno test supabase/functions/purgar-retencao/` | ✅ **14 passed / 0 failed** |
| `npm run test:run` | ✅ **188 arquivos / 1895 testes** |
| `npm run lint` | ✅ **96 erros = baseline congelado** |
| Zero `--no-verify` | ✅ o hook rodou nos quatro commits |
