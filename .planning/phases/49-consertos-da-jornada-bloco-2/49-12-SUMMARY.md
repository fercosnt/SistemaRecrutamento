---
phase: 49-consertos-da-jornada-bloco-2
plan: 12
subsystem: dados-retroativos-prod
status: complete
tags: [escrita-retroativa, lgpd, proveniencia-ia, portao-de-escopo, checkpoint-do-operador]

requires:
  - "49-06 (`20260922000004`): `avancar_etapa` limpa `etapa_justificativa`; `registrar_decisao` não copia a justificativa para a trilha"
  - "49-10 (`20260922000007`/`000008`): `entrevista_analise_vigente` e a RPC que marca a anterior como superada"
provides:
  - "D-46 aplicada: nenhuma candidatura carrega justificativa de outra transição (`d46 = 0`)"
  - "D-43 aplicada: nenhum grupo `(candidatura, tipo)` com mais de uma análise vigente, e proveniência reconstruída em 5 de 6"
  - "instrumento de pós-estado que distingue «recusada» de «falhou» (`p49_12_pos_estado.sql`)"
  - "conferência de forma que conhece os DOIS idiomas de medição de linhas tocadas (`scripts/p49_12_forma_retroativas.cjs`)"
affects:
  - "49-17 (inventário LGPD): tem de carregar a BD-9 MEIO-FECHADA"
  - "49-19: o 4º ramo do guard do motor segue não exercitado"
  - "49-28: conserto da fixture do `p46_purga_smoke` (5 asserções bloqueadas)"
  - "fecho do M8: a BD-9 meio-fechada é item aberto"

tech-stack:
  added: []
  patterns:
    - "§I — escrita retroativa em PROD com escopo autorizado literal e portão de divergência"
    - "pré-voo revertido: a migration inteira rodada com `SELECT 1/0;` no fim, na mesma requisição atômica, para validar os portões sem escrever"
    - "portão de forma que reconhece idiomas equivalentes, com modo `--prove` e controle positivo"

key-files:
  created:
    - supabase/migrations/20260922000009_p49_retro_justificativa_grudada.sql
    - supabase/migrations/20260922000011_p49_retro_marca_analises.sql
    - supabase/tests/p49_12_pos_estado.sql
    - scripts/p49_12_forma_retroativas.cjs
  modified: []
  not_created_on_purpose:
    - path: supabase/migrations/20260922000010_p49_retro_trilha_bd9.sql
      motivo: "D-47 RECUSADA pelo operador em 2026-09-23. A versão `20260922000010` fica deliberadamente VAZIA no ledger — não foi reaproveitada."

key-decisions:
  - "D-46 APROVADA: `etapa_justificativa` → NULL nas 9 candidaturas medidas, incluindo as 2 do titular já anonimizado e a 1 conta real"
  - "D-47 RECUSADA: editaria a trilha de auditoria sem que a trilha registre a edição — o único efeito que o próprio relatório do ensaio apontou como não recuperável"
  - "D-43 APROVADA com alargamento deliberado da D-30: `provedor_ia`/`modelo_ia` escritos nas 5 análises cuja proveniência é reconstruível e unívoca, DERIVADOS do log e não transcritos"
  - "vaga seed `4601d000-…-0003` NÃO tocada: continua `arquivada`; o conserto do smoke é do 49-28"
  - "o instrumento de pós-estado foi CORRIGIDO para não exigir `d47 = 0` — esse critério passou a afirmar o que o operador declinou"

requirements-completed: [JORN-17, JORN-12]
requirements-not-completed:
  - id: JORN-37
    motivo: "depende da D-47, RECUSADA pelo operador. Não marcar como completo."

metrics:
  duration: "≈50 min (segmento de continuação, depois do checkpoint) · Task 1 rodou em sessão anterior"
  completed: 2026-09-23

actuals:
  tokens: 13951
  tasks: 3
  commits: 4
plan_head_before: 314e7fa5fe8326acf079f090040985683380e0d5
---

# Phase 49 Plano 12: As três escritas retroativas — duas aplicadas, uma recusada, e o portão que teria reprovado a recusa

Das três correções retroativas que a fase levou ao operador com ensaio revertido, **duas foram
aplicadas e uma foi recusada** — e a recusa obrigou a consertar o instrumento de verificação, que
exigia exatamente o que o operador declinou.

## O que o operador decidiu, e o que cada decisão custa

| Decisão | Resposta | Efeito medido em PROD |
|---|---|---|
| **D-46** / JORN-17 — limpar a justificativa grudada | **APROVADA** | `d46` 9 → **0**. `20260922000009`, md5 do ledger BATE |
| **D-47** / JORN-37 — tirar da trilha a cópia da justificativa | **RECUSADA** | `d47` fica **5**. Nenhum arquivo criado, nenhum apply |
| **D-43** / JORN-12 — marcar vigente/superada nas análises | **APROVADA, com o backfill de proveniência** | 5 análises marcadas, 0 grupos com >1 vigente. `20260922000011`, md5 BATE |
| vaga seed `…-0003` | **UPDATE RECUSADO** | continua `arquivada` |

## ⚠ ITEM ABERTO — a BD-9 está MEIO-FECHADA, e registrá-la como fechada seria mentira

A D-47 foi recusada, então **o mesmo texto de justificativa da decisão final continua em 5 linhas
de `historico_candidatura.criterio_texto`** (candidaturas `2b7b0e1b`, `5e4357b9`, `9c01dc72`,
`dda6287d`, `e0b90cfe` — sendo esta última a que só casa uma versão ARQUIVADA em `decisao_final_historico`).

**Isto tem de aparecer em dois lugares, e não está fechado aqui:**

- **`49-17`** (inventário LGPD, o próximo plano de checkpoint) — a BD-9 entra lá como pendência,
  não como resolvida.
- **o fecho do M8** — fechar o milestone com a BD-9 marcada como fechada seria exatamente a classe
  de registro-que-mente que este projeto já tem entrada de defeito para (`WINDOWS`; e o aviso no
  topo do `CLAUDE.md` sobre sete milestones de atraso escritos com autoridade de documento oficial).
  Registrado no `.planning/WINDOWS.md` como `unmet-truth`, ainda `open`.

**As duas metades cobrem caminhos DIFERENTES, e isso é deliberado.** Meu relatório do ensaio havia
apontado que aprovar só a D-47 deixaria o texto escapando pela coluna `etapa_justificativa`. O
operador escolheu a outra metade:

- **D-46 (aplicada)** fecha o caminho da **EXPORTAÇÃO DE DADOS** — a coluna `etapa_justificativa`
  vai ao titular quando ele exerce o direito de acesso. Esse caminho está fechado.
- **D-47 (recusada)** cobriria a cópia na **TRILHA DE AUDITORIA**, que também chega ao titular. Esse
  caminho segue aberto, por decisão.

O motivo da recusa, nas palavras do que foi decidido: a D-47 **editaria uma trilha de auditoria sem
que a trilha registrasse ter sido editada** — e foi o meu próprio relatório que nomeou isso como a
única coisa ali não recuperável. A recusa está respondendo precisamente a esse ponto.

## O que a D-46 fez, e por que o texto não se perdeu

9 candidaturas, aprovadas nominalmente:
`0b1c887b`, `2ce20fbf`, `38945a50`, `6e5d8051`, `a111296a`, `a1dd4c42`, `bf26ee3c`, `c912aa17`, `d31c78bb`.
Duas são do titular já anonimizado (linha tombstone; identificadas pelo DOMÍNIO `@invalido.local`,
nunca pelo endereço) e uma é conta real (`d31c78bb`, valor de 5 caracteres).

**O portão de md5 é o que separa «limpar» de «apagar».** Só entra no UPDATE a linha cujo valor bate
byte a byte com o `criterio_texto` da linha mais recente do histórico da mesma candidatura — a
trilha é a fonte, a coluna era cópia. `d46_nao_batem = 0` nas duas medições. Se qualquer uma
deixasse de bater, a transação inteira abortaria em vez de limpar «o que der»: provado por mutação
(`md5(…) = md5(… || 'x')` ⇒ `9 nao batem mais md5 (batem: {})`, nada escrito).

## O que a D-43 fez — e o alargamento que o operador assumiu

Três coisas distintas, sobre 5 das 6 análises existentes:

1. **`superada_em`** nas 3 não-vigentes de `bf26ee3c`. O carimbo é o `created_at` da PRÓXIMA análise
   do mesmo grupo — o instante em que aquela deixou de valer, não um horário inventado.
2. **`texto_hash`/`ai_call_log_id`** pelas 5 correspondências unívocas com `ai_call_logs`, medidas
   pela projeção `{competency, score}` sobre `raw_response->'competency_evaluations'`.
3. **`provedor_ia`/`modelo_ia` = `anthropic`/`claude-sonnet-4-6`** — **alargamento deliberado da
   D-30**, que o operador assumiu. A D-30 dizia «proveniência desconhecida ⇒ NULL»; medi que para
   estas 5 ela não é desconhecida, é reconstruível do log já vinculado.

**As duas condições do operador estão implementadas como portão, não como promessa:**

- A reconstrução é **RE-MEDIDA no instante do apply** pela mesma projeção, e a transação aborta se
  a correspondência deixou de ser unívoca para qualquer uma das 5, ou se divergir do autorizado.
  Provado por três mutações (log trocado; `superada_em` deslocado em **1 microssegundo**; modelo
  aprovado diferente do que o log diz) — todas abortaram.
- **Os valores não são transcritos.** `provedor_ia`/`modelo_ia` são lidos do `ai_call_logs`
  vinculado e só então escritos; o literal aprovado serve de CONFERÊNCIA contra o log, e o portão
  aborta se o log disser outra coisa. Era o único jeito de o alargamento não ser um palpite.

### O que ficou NULL de propósito

- **`48f0351e-f485-4916-9f62-4892a6348c27`** (candidatura `a1dd4c42`, de 2026-06-26): não tem log
  correspondente e é a única do grupo. Os quatro campos ficam NULL — **NULL honesto** sob a D-30.
  Preenchê-la por aproximação seria inventar proveniência.
- **`tipo` e `solicitado_por`** nas 6: genuinamente irrecuperáveis, nada no banco os reconstrói. A
  D-30 continua governando, e o instrumento de pós-estado reprova se deixarem de ser NULL.

### Achado registrado, não escondido: três análises apontam para o MESMO log

`5cf856a8`, `99208dea` e `fef2211f` têm projeção de competências **byte-idêntica**, e existe
**exatamente um** log com essa projeção (`10dc2cc2`, `input_hash 9adae98a…`). A correspondência é
unívoca na direção que o portão exige (cada análise casa um único log) e **não é injetiva na
inversa**. São 3 logs distintos servindo 5 análises, não 5 logs. Não há índice único sobre
`texto_hash` nem sobre `ai_call_log_id`, então o banco aceita. A leitura provável é que a mesma
transcrição foi reanalisada e só uma das chamadas ficou logada — e é justamente por não haver como
distinguir qual que o vínculo é o MESMO para as três, em vez de um palpite diferente para cada.

## A vaga seed — recusa aceita, e o que fica bloqueado

`4601d000-0000-4000-8000-000000000003` continua **`arquivada`** (o título diz «vaga ativa
(sintetica)» — é exatamente a incoerência). O operador aceitou a recomendação de não tocar:
uma vaga sintética aberta fica visível ao público.

**Seguem BLOQUEADAS até o `49-28` rodar** (fixture que abre e restaura dentro do próprio envelope),
no `p46_purga_smoke`:

| Asserção | O que ela prova |
|---|---|
| (j.2) | vaga aberta protege, vaga arquivada deixa de proteger |
| (o) | o 4º ramo do guard RECUSA fora das condições (quatro casos) |
| (o.6) | BL-02 — chamador COM SESSÃO não entra pelo ramo |
| (o.7) | o PAR positivo de (o.6): mesmo estado, sessão nula, metade destrutiva AUTORIZA |
| (p) | o 3º ramo de `plano_exclusao_titular` (B-02) |

**Consequência para o `49-19`: o 4º ramo do guard do motor entra NÃO EXERCITADO.** Registrado no
`.planning/WINDOWS.md` como `unrun-verify`, `open`.

## Verificação

### Ensaio reproduzido antes do apply (idêntico ao da sessão do checkpoint)

```
ENSAIO OK: d46=9 (0b1c887b, 2ce20fbf, 38945a50, 6e5d8051, a111296a, a1dd4c42, bf26ee3c, c912aa17, d31c78bb)
d46_nao_batem=0 (-) d46_anonimizados=2
d47=5 linhas em 4 candidaturas (2b7b0e1b, 5e4357b9, 9c01dc72, dda6287d, e0b90cfe)
d43=5 marcadas, 3 com superada_em, 5 com vinculo
fila_delta=0 historico_delta=0 notif_delta=0 dfh_delta=0 controle_a=1 controle_b=1
```

`controle_a=1` e `controle_b=1` são o que impede o `fila_delta=0` de ser uma medida cega: as duas
subtransações revertidas provam que a tabela ENFILEIRA quando deveria.

### Pré-voo revertido de cada migration, e cinco mutações antes de qualquer apply

Rodei **a migration inteira** com `SELECT 1/0;` no fim, na mesma requisição — a atomicidade do
endpoint garante que nada é escrito, e o `division by zero` (em vez de um `JORN-xx`) prova que
todos os portões passaram. Depois, cinco mutações que **devem** abortar:

| Mutação | Resultado |
|---|---|
| D-46 com 8 ids em vez de 9 | abortou: `escopo divergente, nada foi escrito` |
| D-46 com o md5 quebrado | abortou: `9 nao batem mais md5 (batem: {})` |
| D-43 com um `log_id` trocado | abortou: `deixou de ser univoca ou divergiu do autorizado` |
| D-43 com `superada_em` +1 microssegundo | abortou (a comparação é exata ao microssegundo) |
| D-43 com o modelo aprovado ≠ o do log | abortou, listando as 5 linhas |

Conferido depois: `fila=0 hist=67 notif=67 dfh=11 d46=9 analises_com_log=0` — **nada havia sido
escrito** pelo pré-voo nem pelas mutações.

### Pós-estado (`node p46apply.cjs run supabase/tests/p49_12_pos_estado.sql`)

```
POS-ESTADO OK: d46=0/0 (APROVADA) d47=5/5 (RECUSADA — BD-9 meio-fechada de proposito)
d43=0/0 grupos com >1 vigente (APROVADA) dfh=11/11 (D-45 intocado)
proveniencia prov=5/5 log=5/5 hash=5/5 modelo=5/5
orfa_48f0351e_null=t d30_tipo_e_solicitado_por_null=t
vaga_seed=arquivada/arquivada (RECUSADA, conserto no 49-28)
```

E ele **morde**: mutar `c_esp_d47` para 0, `c_esp_prov` para 6 ou `c_esp_vaga` para `aberta` faz
cada um reprovar com o diagnóstico certo.

### Ledger, apply e publicação

| Item | Estado |
|---|---|
| `20260922000009` | ✅ aplicada e escriturada, md5 `233b1c231812bd5d99eabd99f46bbe27`, 8726 octetos |
| `20260922000010` | ⊘ **VAZIA de propósito** — D-47 recusada, número não reaproveitado |
| `20260922000011` | ✅ aplicada e escriturada, md5 `88fb3dadf10dae3ccbf236c2c6014d18`, 14612 octetos |
| Via de apply | `node p46apply.cjs migrate`, SQL lido do ARQUIVO (nunca transcrição, nunca MCP `apply_migration`) |
| `npm run lint` | **89** — inalterado; teto D-53 é 90 |
| `git log --oneline origin/main..HEAD` | **VAZIO** (`8ecf92c8..e03370c1` publicado) |
| `decisao_final_historico` | 11 → **11** (D-45) |

## Deviations from Plan

### 1. [Rule 1 - Bug de VERIFICAÇÃO] O `<verify>` de pós-estado exigia o que o operador recusou

- **Encontrado em:** Task 3, ao montar a verificação.
- **Problema:** o `<verify>` do plano media `d46`, `d47`, `d43` e reprovava se **qualquer** um fosse
  ≠ 0. Era correto enquanto as três eram candidatas — e virou **errado** no instante da recusa da
  D-47: exigir `d47 = 0` é afirmar, como critério de sucesso, exatamente o que o operador declinou.
  Ele reprovaria o plano por a trilha de auditoria **não** ter sido editada, e a leitura óbvia da
  mensagem vermelha («a escrita quebrou») levaria alguém a "consertar" aplicando a D-47 recusada.
- **Conserto:** `supabase/tests/p49_12_pos_estado.sql`, que declara o esperado **por decisão**
  (`d46=0` aprovada, `d47=5` recusada, `d43=0` aprovada) e no qual **`d47 = 0` TAMBÉM reprova** —
  seria escrita sem autorização. O valor esperado vive em **uma constante só**, lida pelo comparador
  E pela mensagem: nas primeiras mutações eu mudava só o comparador e a mensagem saía dizendo
  «esperado 5» enquanto o comparador exigia 0 — a mensagem contradizendo o portão que ela explica é
  o que faz alguém consertar a coisa errada.
- **Commit:** `e03370c1`

### 2. [Rule 1 - Bug de VERIFICAÇÃO] A conferência de forma REPROVOU a `…000011` com a garantia inteira presente

- **Encontrado em:** Task 3, rodando o `<verify>` estático do plano.
- **Problema:** o `node -e` do plano exigia o token literal `ROW_COUNT` e reprovou a `…000011` —
  que mede as linhas tocadas por `count(*)` sobre o `RETURNING` de um UPDATE em CTE e aborta em
  `IF v_tocadas <> cardinality(v_autorizados)`. `GET DIAGNOSTICS … ROW_COUNT` **não serviria ali**:
  depois de um UPDATE embrulhado em CTE ele devolve a contagem do SELECT externo, que é a medida
  errada. Portão que conhece **um idioma só**, reprovando trabalho correto — a classe do CLAUDE.md
  §«varra pela FORMA, não pelo sintoma», na variante que reprova em vez de deixar passar.
- **Conserto — e onde ele NÃO podia ser:** `scripts/p49_12_forma_retroativas.cjs`, que reconhece os
  dois idiomas e, em ambos, **exige a comparação** contra `cardinality(v_autorizados)` (é ela, não o
  token, que aborta). ⚠ **Não consertei a migration**: ela já está aplicada e `statements[1]` guarda
  o corpo literal; editar o arquivo faria o md5 divergir do ledger e **quebraria a própria prova** —
  o mesmo motivo pelo qual as `20260823000001..4` carregam uma instrução obsoleta que não se corrige
  lá (CLAUDE.md). Nem afrouxei o portão: ele ganhou duas checagens novas (as 4 contagens de controle;
  ausência de `BEGIN;`/`COMMIT;`).
- **§L honrado:** `--prove` roda **9 mutações** (uma por garantia) e **2 controles positivos**. A
  primeira versão da checagem tinha folga real — o `count(*)` das contagens de efeito colateral
  casava a heurística —, e foi a mutação que **removia o `count(*)` do SELECT sobre a CTE** que
  acendeu isso. Apertei a checagem para exigir o `count(*)` **depois** do `RETURNING`.
- **Commit:** `e03370c1`

### 3. [Rule 2 - Registro] `JORN-37` NÃO marcado como completo

- **Motivo:** depende da D-47, recusada. Marcá-lo completo transformaria uma recusa do operador em
  requisito atendido. `requirements-completed` traz só `JORN-17` e `JORN-12`.

**Total: 3 desvios** (2 bugs de verificação auto-corrigidos, 1 de registro). **Impacto:** nenhum na
escrita em PROD — os dois bugs eram do instrumento, e um deles teria reprovado trabalho correto com
diagnóstico falso.

## Ordem de apply fora da sequência de versão — registrado

As `…000009` e `…000011` entraram **depois** de a `…000012` já estar no ledger. Fora de ordem de
propósito e sem consequência: a `…000012` redefine FUNÇÕES (motor, logs, revisão) e estas escrevem
LINHAS de `candidaturas`/`entrevista_analises` — objetos disjuntos, dono único, estado final
independente da ordem relativa. A `…000010` fica vazia entre elas, e é assim que a sequência conta a
verdade sobre o que existiu.

## Known Stubs

Nenhum. As duas ausências deste plano são **decisões registradas**, não stubs: a migration da D-47
não existe porque foi recusada, e os quatro campos de `48f0351e` são NULL porque a proveniência dela
é genuinamente irrecuperável.

## Issues Encountered

1. **A BD-9 fica meio-fechada** — ver a seção dedicada acima. `WINDOWS.md`, `unmet-truth`, `open`.
2. **5 asserções do `p46_purga_smoke` bloqueadas** até o `49-28`; o 4º ramo do guard do motor entra
   **não exercitado** no `49-19`. `WINDOWS.md`, `unrun-verify`, `open`.
3. **Pré-existentes e fora de escopo, nomeados e não tocados:** `resend-webhook.test.ts`
   (`npm:svix@1.99.1`) e `_shared/__tests__/strict-schema.test.ts:88`.

## Self-Check: PASSED

| Verificação | Resultado |
|---|---|
| `supabase/migrations/20260922000009_…sql` existe | ✅ |
| `supabase/migrations/20260922000011_…sql` existe | ✅ |
| `supabase/migrations/20260922000010_…sql` **ausente** (recusada) | ✅ esperado |
| `supabase/tests/p49_12_pos_estado.sql` existe | ✅ |
| `scripts/p49_12_forma_retroativas.cjs` existe | ✅ |
| commits `d6a16e91`, `fd8d0105`, `e03370c1` no histórico | ✅ |
| pós-estado verde e mordendo | ✅ |
| `origin/main..HEAD` vazio | ✅ |

## Próximo

`49-17` (inventário LGPD) — **tem de carregar a BD-9 meio-fechada como pendência**. E o `49-28`
destrava as 5 asserções do `p46_purga_smoke` antes do `49-19`.
