---
phase: 46-purga-autom-tica-dry-run-live
plan: 04
subsystem: database
tags: [postgres, plpgsql, lgpd, purga, guard, authz, destrutivo, supabase, prod-write, checkpoint]
status: complete

requires:
  - phase: 45-direito-do-titular
    provides: "public.anonimizar_candidato(uuid, boolean) — o motor destrutivo exercitado em PROD em 2026-08-22 — e public.plano_exclusao_titular(uuid), a expressao unica que ele CHAMA"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 02
    provides: "config_purga, o ledger de duas tabelas, titulares_alem_da_janela(), e o corpo de varrer_purga_retencao() com o bloco por titular ja no formato final"
  - phase: 46-purga-autom-tica-dry-run-live
    plan: 03
    provides: "retencao_hold (e a ameaca INDIRETA que ela cria), o predicado com as quatro excecoes, e o conjunto elegivel medido em 4"
provides:
  - "supabase/migrations/20260823000006_p46_guard_purga.sql — o 4o ramo do guard de anonimizar_candidato, em DUAS METADES FISICAMENTE DISTINTAS (D-46-18 / D-46-24)"
  - "Bloco de auto-verificacao que ABORTA o apply sobre QUATRO tabelas: purga_execucoes, purga_execucao_itens, config_purga e retencao_hold"
  - "supabase/migrations/20260823000007_p46_sweep_dry_run.sql — o laco de dry-run passa a CHAMAR o motor, com captura tipada e o ERRCODE proprio P46NT"
  - "supabase/tests/p46_purga_smoke.sql — assercoes (b) e (o); RESUMO (z) 11 -> 13"
  - "supabase/tests/p45_motor_exclusao_smoke.sql (C3) — re-pin cruzado do md5 de anonimizar_candidato, com a rede estrutural crescendo de 2 para 3 metades"
  - "⛔ BLOCKER B-02 DESCOBERTO E DOCUMENTADO: plano_exclusao_titular tem guard PROPRIO que recusa chamador sem sessao — D-46-18 e incompleto"
affects: [46-05, 46-06, 46-07]

actuals:
  tokens: 40000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Ramo de autorizacao com metades FISICAMENTE DISTINTAS: dois SELECT EXISTS separados, jamais um predicado com lista de modos compartilhada — e assim que o caminho destrutivo deixa de poder herdar em silencio a permissao do reversivel"
    - "Guard por ESTADO e nunca por CREDENCIAL: o chamador e aceito pelo estado que so o motor produz, e um estado ninguem carrega no bolso"
    - "Bloco de auto-verificacao que aborta o apply cobre tambem a superficie INDIRETA (retencao_hold): liberar um hold nao chama a funcao destrutiva, mas e o passo que falta ate ela"
    - "Assercao negativa sobre guard destrutivo apontada para um id INEXISTENTE: 42501 = guard recusou, P0002 = guard autorizou — totalmente discriminante e incapaz de destruir"
    - "Re-pin de md5 SEMPRE acompanhado de crescimento da rede estrutural embaixo dele: no dia do re-pin o md5 casa com qualquer corpo, e e so a rede que continua exigindo a forma revisada"

key-files:
  created:
    - supabase/migrations/20260823000006_p46_guard_purga.sql
    - supabase/migrations/20260823000007_p46_sweep_dry_run.sql
  modified:
    - supabase/tests/p46_purga_smoke.sql
    - supabase/tests/p45_motor_exclusao_smoke.sql

key-decisions:
  - "escopo-duplo (D-46-24), PRE-RESOLVIDO — o executor leu a decisao em vez de perguntar de novo, e a frase literal de D-46-18 foi lida como escopada a DESTRUICAO"
  - "As duas metades sao dois SELECT EXISTS separados, com `= 'live'` escrito por extenso duas vezes na metade destrutiva — a obrigacao de aceite de D-46-24"
  - "As duas leituras de modo (purga_execucoes.modo_vigente E config_purga.modo) sao CUMULATIVAS: e isso que faz o kill switch morder no meio de uma execucao ja em curso"
  - "A metade (a) manteve a MENSAGEM verbatim e ganhou uma alternativa por ESTADO — a saida recusada (aceitar sessao nula sob service_role) e uma CREDENCIAL, e credencial e portavel"
  - "O bloco de auto-verificacao pergunta por INSERT alem de UPDATE: quem insere no ledger fabrica o estado autorizante do zero"
  - "retencao_hold e config_purga entraram na mesma pergunta — a primeira por caminho INDIRETO (levantada pelo 46-03, ausente do plano)"
  - "O COMMENT vivo foi PRESERVADO verbatim com duas emendas, em vez de reescrito: ele e o unico lugar dentro do banco onde vivem razoes pagas com quatro rodadas de review e um incidente medido"
  - "As quatro chamadas negativas de (o) apontam para um candidato_id INEXISTENTE — a assercao fica discriminante E incapaz de destruir"

requirements-completed: []  # PURGA-02 e PURGA-05 NAO fecham aqui — ver §Requirements

metrics:
  duration: ~95min
  completed: 2026-08-23
---

# Phase 46 Plan 04: O 4º ramo do guard — Summary

O motor destrutivo provado em produção ganhou um caminho de entrada para o cron, e esse caminho
**não é uma credencial: é um estado que só a própria purga produz e destrói**. As duas metades do
ramo — a reversível e a destrutiva — são dois predicados fisicamente separados, e o smoke as afere
separadamente, sobre estado idêntico, mudando só a intenção.

⚠ **NADA FOI APLICADO.** Dois arquivos de migration escritos e commitados, dois smokes emendados.
O code review bloqueante e o apply são da Task 4, e pertencem ao orquestrador.

⛔ **E este plano descobriu um segundo blocker que D-46-18 não previu.** Ele está na §Blocker B-02,
é a primeira coisa a ler, e é o motivo de o checkpoint desta entrega não ser só "revise e aplique".

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1 | [CHECKPOINT] D-46-18 — escopo do 4º ramo | pré-resolvido por **D-46-24**; não reaberto |
| 2 | O 4º ramo do guard + o bloco que aborta o apply | `82e4b2e` |
| 3 | O laço chama o motor + (b) + (o) + re-pin de (C3) | `9a7744a` |
| — | SUMMARY + STATE + ROADMAP | `<este commit>` |

Zero `--no-verify`: o hook de type-check rodou nos três commits e reportou **96 erros — o baseline
congelado**, inalterado.

## Task 1 — a decisão, e por que ela não foi perguntada de novo

**Escolha: `escopo-duplo`.** Registrada por **D-46-24** (`46-CONTEXT.md` §Área 6, operador,
2026-08-22), que existe precisamente para pré-resolver o `checkpoint:decision` da Task 1. O executor
leu a decisão; não perguntou de novo.

**A frase literal de D-46-18 — *"Um `modo` que não seja `live` não autoriza nada"* — foi lida como
escopada à DESTRUIÇÃO, e o registro da razão é obrigação de aceite:** aplicada ao pé da letra, ela
recusaria o próprio laço de dry-run durante os 14 dias inteiros da janela `dry_run`, tornaria a
asserção (b) do contrato de validação **impossível de satisfazer**, e produziria exatamente o
**dry-run decorativo** que o SC#1 desta fase existe para proibir — a mesma classe do P39/CR-02, que
este projeto já embarcou uma vez.

O texto integral do ramo aprovado está em `20260823000006_p46_guard_purga.sql`, seção (p), e as duas
metades são:

| Metade | Predicado | Autoriza sob |
|---|---|---|
| **(p.1) dry-run** | `SELECT EXISTS` próprio | item aberto + execução `executando` + `modo_vigente` ∈ {`dry_run`,`live`} + `config_purga.modo` ∈ {`dry_run`,`live`} |
| **(p.2) destrutivo** | `SELECT EXISTS` **separado** | as mesmas condições de item/execução + `modo_vigente = 'live'` **e** `config_purga.modo = 'live'` |

**Nenhuma capacidade destrutiva ganhou permissão nova.** O que passou a ser autorizado fora de
`live` é um caminho cujo efeito o Postgres reverte por construção — ele termina no terminador de
dry-run. A assimetria não é invenção: é a que a metade (b) já tinha desde o 45-13
(`20260805000006:390-403`), onde o ramo de leitura aceita `rh` e o destrutivo não.

## ⛔ BLOCKER B-02 — `plano_exclusao_titular` tem guard PRÓPRIO, e D-46-18 não o viu

**Este é o achado do plano, e ele é bloqueante para PURGA-02.**

`anonimizar_candidato`, no PASSO 0 (`20260805000006:456`), executa:

```sql
v_plano := public.plano_exclusao_titular(p_candidato_id);
```

E `plano_exclusao_titular` tem um guard de **duas metades próprias**
(`20260805000005_p45_plano_e_dry_run.sql:201-253`):

- **(a)** `IF v_uid IS NULL THEN RAISE 'FORBIDDEN: chamador sem sessao nao le o plano de exclusao de
  ninguem' USING ERRCODE = '42501'`
- **(b)** `v_role IS DISTINCT FROM 'rh' AND ... 'administrador' AND v_user_id IS DISTINCT FROM v_uid`

**Consequência medida por leitura, e ela desfaz o pressuposto de D-46-18:** o 4º ramo autoriza o
cron a entrar em `anonimizar_candidato` — e três linhas depois a chamada morre com `42501` vindo de
**outra função**. `SECURITY DEFINER` não ajuda: `auth.uid()` lê a claim do JWT, não o papel do banco.

- Para um titular **real**, a metade (b) também recusa: `v_user_id IS DISTINCT FROM v_uid` é
  `<uuid real> IS DISTINCT FROM NULL` = TRUE. Ou seja **as DUAS metades precisam da alternativa**,
  não só a (a).
- Para o id **inexistente** das negativas de (o), é a metade (a) que dispara.

**Por que D-46-18 não viu:** a medição de 2026-08-22 aferiu que as três claims são NULL sob
`postgres` e enumerou as três metades do guard **de `anonimizar_candidato`**. Ela nunca perguntou o
que aquele corpo *chama*. O `md5(prosrc)` de `plano_exclusao_titular` está pinado na mesma asserção
(C3) — o objeto estava à vista o tempo todo, do outro lado da mesma linha do smoke.

**Isto é RULE 4 (mudança arquitetural) e por isso o executor PAROU em vez de escrever a correção:**
ela exige uma terceira migration que edita uma **segunda** função da Phase 45, um **segundo** re-pin
de md5 em (C3) (`v_pin_plano = '97634d07ef13447e06741a8c8372fca6'`, que o plano declarava que *não*
mudaria), e toca de novo a metade (a) que o operador protegeu nominalmente em 2026-08-05.

**Saídas avaliadas:**

| Saída | Veredito |
|---|---|
| **A — 4º ramo espelhado em `plano_exclusao_titular`**, nas DUAS metades, com o mesmo par de predicados separados | **Recomendada.** Menor mudança que faz o desenho funcionar, no idioma exato do arquivo. É uma função de LEITURA: ela não destrói nada, e o risco do edit é qualitativamente menor que o do 000006 |
| B — o motor pula `plano_exclusao_titular` quando chamado pela purga | ⛔ **Recusada.** (C3/ii) assere que o tombstone CONTÉM a chamada; pular cria um segundo caminho pelo corpo destrutivo e contradiz PURGA-02 e o P39/CR-02 |
| C — a varredura carimba `request.jwt.claims` antes de chamar | ⛔ **Recusada.** É forjar sessão. Faria `auth.uid()` mentir para tudo o que rodasse naquela transação, e é a família de "credencial standing" que D-46-18 já recusou |

**A prova de que o smoke pegaria isto sozinho:** `p46_purga_smoke.sql` **nunca** carimba
`request.jwt.claims` (medido: as únicas ocorrências são `RESET ROLE` e a limpeza final da linha
1345). A sessão do smoke tem `auth.uid()` NULL, exatamente como o cron. As asserções (b) e (o.2b)
escritas neste plano reprovam com o diagnóstico certo enquanto B-02 estiver aberto — foi assim que
ele apareceu.

## O que foi construído

### `20260823000006_p46_guard_purga.sql` — o 4º ramo

O arquivo carrega o corpo **inteiro** da função. A cópia foi conferida por md5 **antes** de qualquer
edição, e a conferência é o que autoriza tudo o que veio depois:

| Lado | Valor | Octetos |
|---|---|---|
| Corpo extraído do arquivo `20260805000006` | `8c86e0f040219e7eade47eb587dbf5de` | 34 488 |
| Pin vivo em `p45_motor_exclusao_smoke.sql:1591` | **idem** | 34 488 |
| `md5(prosrc)` medido em PROD em 2026-08-22 | **idem** | — |

Batem os três. **O corpo que foi editado era byte a byte o que está aplicado em produção** — e não
"o que o catálogo tem hoje, seja lá o que for", que é a leitura que faria o gate deixar de comparar.

**As três diferenças, e são só três, todas na região do guard:**

1. **(p)** — o cálculo das duas metades, antes da metade (a). Dois `SELECT EXISTS` separados. Falha
   FECHADA por construção: com qualquer lado nulo o predicado avalia NULL, a linha não é
   selecionada, o `EXISTS` é `false` e a função recusa — a mesma propriedade que `:418-423` descreve
   para `executar_em`, e por isso não há cláusula `IS NOT NULL` extra.
2. **(a)** — **mensagem verbatim, nem uma letra**; a condição ganhou `AND NOT v_ramo_purga`. A
   distinção que separa esta emenda da saída recusada está escrita no arquivo: *a saída recusada é
   uma **credencial**, e credencial é portável; o que está escrito aqui é um **estado**, e estado
   ninguém carrega no bolso.*
3. **(b)** e **(c)** — cada forma consulta **a sua própria metade** (`v_purga_dry` na de leitura,
   `v_purga_live` na destrutiva e na (c)), nunca a variável comum. Escrito assim, a pergunta do
   revisor — *"a metade destrutiva herdou a permissividade da de leitura?"* — se responde lendo
   **uma palavra**. As mensagens foram **estendidas** para nomear a quarta condição.

O `COMMENT ON FUNCTION` foi **preservado verbatim** com duas emendas cirúrgicas (TRÊS→QUATRO
metades, e um bloco novo no fim). Reescrevê-lo teria descartado prosa paga com quatro rodadas de
code review e um incidente medido em produção — e o `COMMENT` é o único lugar **dentro do banco**
onde essas razões existem.

### O bloco de auto-verificação que ABORTA o apply — sobre QUATRO tabelas

Espelho de `20260805000006:988-1028`, com as duas metades preservadas (a que aborta e a que apenas
avisa e declara a RLS como parte do guard), e **três divergências deliberadas**:

| Tabela | Verbos perguntados | Caminho | Por quê |
|---|---|---|---|
| `purga_execucoes` | INSERT · UPDATE | direto | quem carimba `situacao=executando` + `modo_vigente=live` autoriza a destruição |
| `purga_execucao_itens` | INSERT · UPDATE | direto | quem cria item aberto **escolhe quem** será destruído |
| `config_purga` | INSERT · UPDATE | direto | `modo` é lido **dentro** do predicado do ramo novo |
| **`retencao_hold`** | **UPDATE · DELETE** | **INDIRETO** | **levantado pelo 46-03, ausente do plano** |

- **INSERT entrou na pergunta** — o precedente só pergunta por UPDATE de duas colunas de uma linha
  que o motor já criou. Aqui, quem puder **inserir** fabrica o estado autorizante do zero, sem
  editar linha nenhuma. Perguntar só por UPDATE deixaria aberta a porta mais óbvia.
- **`retencao_hold` entrou**, embora o guard não a leia: com a tabela viva, **liberar um hold
  (`liberado_em`) passou a ser o passo que falta entre "registro sob litígio" e "registro apagado
  irreversivelmente"**. Quem escreve `liberado_em` não chama esta função — devolve a candidatura ao
  conjunto elegível e o cron faz o resto. Uma superfície de destruição irreversível por caminho
  indireto merece a mesma asserção de catálogo que a direta.
- O bloco **emite um `RAISE NOTICE` final incondicional**, e isso é asserção: um apply que não o
  tenha emitido **não exercitou o bloco**, e um bloco não exercitado é indistinguível de um bloco
  ausente.

**Estado medido (46-02 / 46-03): as quatro tabelas têm RLS LIGADA, UMA policy de `SELECT` e ZERO de
escrita.** Portanto o apply deve emitir **NOTICE, e não abortar**. Um abort é informação, não bug —
ver a Task 4.

### `20260823000007_p46_sweep_dry_run.sql` — o laço chama o motor

Corpo idêntico ao do 46-02 exceto o interior do bloco por titular. A chamada é
`public.anonimizar_candidato(r.candidato_id, true)` com o literal `true` — **não** uma expressão
derivada do modo, porque isso seria um caminho destrutivo com um `IF` na frente, a única coisa que o
escopo negativo do arquivo promete não criar. O ramo `live` nasce no 46-06.

## Deviations from Plan

### [Rule 1 - Bug] O plano mandava inserir o item DEPOIS da chamada — e isso faria TODA chamada receber 42501

O plano (Task 3) dizia: *"O item de `purga_execucao_itens` é inserido **depois** do bloco"*. Isso é
**impossível por construção do guard que o mesmo plano acabou de escrever**: o 4º ramo exige
**item vivo com `concluido_em IS NULL`** para aquele `candidato_id`. Um item que ainda não existe
não autoriza nada.

A ordem correta já estava no tracer do 46-02, com a razão escrita
(`20260823000004:290-292`): o item nasce ABERTO, o motor roda dentro dessa janela, e o `UPDATE` que
fecha o item é o mesmo que grava `relato_dry_run`. **Adotada a ordem do tracer.** Commit `9a7744a`.

### [Rule 1 - Bug] `PERFORM` + `P46NT` incondicional transformaria trabalho correto em "defeito", todo dia

O plano pedia `PERFORM` e um `RAISE ... 'P46NT'` incondicional na linha seguinte. Escrito assim, o
portão **reprovaria trabalho correto** — o padrão que treina quem executa a desligá-lo.

**O dry-run do motor tem DUAS terminações, e as duas são contrato (WR-05), escritas no `COMMENT`
vivo daquela função:** numa linha VIVA ele termina em `P45DR`; numa linha que **já é tombstone** ele
**RETORNA NORMALMENTE** com `resultado = 'ja_anonimizado'`, porque a idempotência por ESTADO devolve
**antes** do terminador. E depois do primeiro `live`, um titular anonimizado **continua** com linha
em `candidatos` e em `candidaturas` (ERASE-08 as preserva), **continua** além da janela e
**continua** numa etapa da allowlist — ou seja, **ele volta a ser selecionado**.

**O que foi feito:** `SELECT ... INTO v_ret` em vez de `PERFORM`, e o retorno é **discriminado**.
`ja_anonimizado` é registrado como o que é, com um relato que carrega o mesmo prefixo `P45 DRY-RUN`
de propósito (para que a asserção (b) valha para as duas terminações sem deixar de morder).
Qualquer **outro** retorno normal levanta `P46NT`. Commit `9a7744a`.

### [Rule 2 - Funcionalidade crítica ausente] `P46NT` e `query_canceled` precisam DERRUBAR a varredura, não virar linha de ledger

O `must_have` do plano diz que "não levantou" *"derruba a execução com o ERRCODE próprio `P46NT`"* —
mas o envelope por titular herdado do tracer tem `EXCEPTION WHEN OTHERS`, que engoliria o `P46NT` e
o transformaria em N linhas de `desfecho_postgres = 'falha'`. Alguém leria **"a purga teve falhas"**
quando o fato é **"uma função destrutiva perdeu o freio"** — diagnóstico falso, que é o modo de
falha que esta fase inteira cataloga. O mesmo vale para `query_canceled`: engolido, cada statement
seguinte é cortado de novo e o ledger enche de itens que descrevem o relógio, não o dado.

**O que foi feito:** duas cláusulas `WHEN ... THEN RAISE;` **antes** do `WHEN OTHERS`, com a
consequência aceita e declarada no arquivo — nesses dois casos o cabeçalho também é revertido e o
heartbeat do dia não existe; a ausência da linha somada ao registro de falha do job é um sinal
inequívoco, e uma linha `concluida` com N falhas dentro não seria. Commit `9a7744a`.

### [Rule 2 - Segurança] O bloco de auto-verificação ganhou INSERT, `config_purga` e `retencao_hold`

Ver §"O bloco de auto-verificação". Três acréscimos ao que o plano especificou, cada um numa
superfície que **de fato** autoriza a destruição. Commit `82e4b2e`.

### [Rule 1 - Bug] Dois critérios de aceite do plano reprovariam o arquivo CORRETO — pela terceira vez nesta fase

Os dois medem por `grep -c`, que conta **linhas**, sem distinguir SQL de prosa:

| Critério do plano | Medido | Por que não pode ser "consertado" |
|---|---|---|
| `grep -vE '^\s*--' \| grep -c 'p_dry_run'` = **2** | **5** | Três das cinco são **strings** — mensagens de recusa e o `COMMENT`, copiados verbatim de uma função destrutiva. Editá-las para satisfazer um `grep` seria editar o terminador do dry-run |
| `grep -cE '\mNOT\s+IN\M'` (fora de comentário) = **0** | **2** | As duas são o `COMMENT` **explicando por que `NOT IN` é proibido**. É o portão reprovando a própria documentação que o torna revisável — a lição literal do 46-02 |
| `grep -c 'WHEN OTHERS'` (fora de comentário) = **0** | **2** | São os handlers **pré-existentes** do tracer, que impedem a falha de um titular de abortar os demais. Removê-los é uma regressão |

**Medição honesta adotada** — fora de comentário **e** fora de literal de string:

| Propriedade | Valor | Esperado |
|---|---|---|
| `p_dry_run` lido como SQL | **2** (assinatura + normalização) | 2 |
| `coalesce(p_dry_run, true)` como SQL | **1** | 1 |
| Negação por conjunto em SQL puro (`20260823000006`) | **0** | 0 |
| Negação por conjunto em SQL puro (`20260823000007`) | **0** | 0 |
| `WHEN OTHERS` **dentro do envelope da chamada ao motor** | **0** | 0 |
| `WHEN SQLSTATE 'P45DR'` no envelope da chamada | **1** | 1 |
| `modo IN (...)` compartilhado pelas duas metades | **0** | 0 |

⚠ E, como no 46-03: `\m`/`\M` **falham em vez de medir** neste ambiente (`ugrep`). Usado `\b` no
shell; dentro do plpgsql `\m`/`\M` continuam corretos e a asserção (C3/iii) os usa.

### [Rule 4 - Arquitetural] Blocker B-02 — PARADO, decisão do operador exigida

Ver §Blocker B-02. Nenhuma linha foi escrita sobre `plano_exclusao_titular`.

## O re-pin cruzado de (C3) — um lado medido, o outro fecha no checkpoint

| Lado | Valor | Octetos | Quem mediu |
|---|---|---|---|
| **ARQUIVO** (`20260823000006`) | `35d1df5d8a3739854e97dd7cbd0d600e` | **43 532** | executor, **por execução** do comando registrado no bloco de PROVENIÊNCIA — nunca digitado |
| **VIVO** (`md5(prosrc)`) | ⏸ pendente | ⏸ | orquestrador, DEPOIS do apply |

Extração conferida quanto a contaminação de comentário — a armadilha encontrada no 46-02: o trecho
começa em `\nDECLARE\n` e termina em `END;\n`. A migration **não menciona o delimitador nomeado em
prosa em lugar nenhum**, de propósito.

**O valor antigo permanece no bloco de PROVENIÊNCIA como histórico**, com as datas e a observação de
que ele vigorou durante a execução do motor em produção de 2026-08-22. É isso que torna a sequência
auditável: dá para ver que o pin mudou, quando, e por quê.

### ⚠ O re-pin NÃO afrouxou nada — a rede estrutural cresceu de DUAS metades para TRÊS

(C3) tinha (i) md5 e (ii) "o tombstone CHAMA a expressão única". Ganhou **(iii)**, medida sobre o
corpo VIVO com fronteira de palavra:

| Checagem | O que a ausência dela permitiria |
|---|---|
| corpo contém `purga_execucao_itens` | o 4º ramo ter sido apagado, e o md5 novo casar mesmo assim |
| corpo exige `concluido_em IS NULL` | um item **fechado** de uma execução antiga autorizar para sempre — o ramo aceitaria um **vestígio** do estado em vez do estado |
| corpo **não** contém negação por conjunto | o guard voltar a falhar ABERTO com um lado NULL (defeito real da 42-06) |
| metade destrutiva exige `modo_vigente = 'live'` por extenso | as duas metades voltarem a compartilhar um predicado — a regressão que D-46-24 tornou inaceitável |

**E a razão de (iii) nascer junto com um re-pin está escrita no arquivo:** enquanto o pin nunca
muda, a diferença entre "o corpo vivo é o do arquivo" e "o arquivo tem a forma certa" é teórica. No
dia do re-pin ela deixa de ser — **um md5 recém-carimbado casa com QUALQUER corpo**. O contador do
`p45_motor_exclusao_smoke.sql` **continua em 24**: as quatro checagens entraram DENTRO do bloco (C3)
existente, sem `set_config` novo.

## As duas asserções novas

### (b) — PURGA-02, e o que ela prova que (c) não prova

(c) já dizia "nada mudou". **Sozinha, ela passaria idêntica num laço que não chamasse função
nenhuma** — que foi exatamente o estado do 46-02, e por isso PURGA-02 não fechou lá. (b) prova o
outro lado, sobre a **mesma execução**:

| Metade | Mede |
|---|---|
| ⊖ não-vacuidade | `elegiveis >= 3` **e** itens > 0 — as três metades são triviais sobre conjunto vazio |
| relato presente | `relato_dry_run` **não nulo** em **todos** os itens |
| relato é do MOTOR | todos começam por `P45 DRY-RUN` — outro texto significa que quem escreveu a linha **não foi o motor** |
| ⭐ corpo COMPLETO | ≥ 1 item contém `candidatos=` — **as contagens por passo**. O prefixo sozinho é compatível com uma recusa precoce; só as contagens provam que as doze mutações rodaram antes da reversão |
| ⊖ nada mudou | as cinco contagens de domínio idênticas, zero desfecho carimbado |

### (o) — as duas metades aferidas SEPARADAMENTE, e por que o alvo não existe

**Seis chamadas: quatro que TÊM de recusar, e DUAS que têm de ser aceitas.** Um guard que recusa
**tudo** também passaria numa asserção só de recusas — e provar só recusa é o **modo de falha nº 3
dos sete portões da Phase 45**.

| Caso | Estado | Esperado |
|---|---|---|
| (o.1) | `modo='off'` + item aberto, dry-run | `42501` — o kill switch não autoriza **nem** o reversível |
| **(o.2a)** | `modo='dry_run'` + item aberto, **destrutivo** | **`42501`** — ⛔ a asserção que vale a decisão inteira |
| **(o.2b)** | **estado IDÊNTICO ao de (o.2a)**, dry-run | **`P0002`** — o guard **autorizou** |
| (o.3) | `modo='live'`, execução `executando`, **sem item aberto** | `42501` — autorizar por MODO em vez de por ALVO faria a purga virar exclusão dirigida |
| (o.4) | item aberto, mas execução `concluida` | `42501` — vestígio não autoriza |
| (o.5) | titular **REAL** `pos1`, condições satisfeitas, dry-run | `P45DR` — o corpo completo executa e é revertido |

⭐ **O par (o.2a)/(o.2b) é a prova de D-46-24, e ele é um par de propósito:** mesmo cerco, mesma
execução, mesmo item — muda **só a intenção**. Se as duas metades voltassem a compartilhar um
predicado, as duas chamadas dariam o **mesmo** desfecho.

⚠ **As quatro negativas apontam para um `candidato_id` que NÃO EXISTE**, e isso é decisão de
segurança, não de conveniência. `purga_execucao_itens.candidato_id` não tem FK (deliberado,
`20260823000002:264`), então dá para fabricar o estado autorizante para um titular inexistente. O
efeito: **42501 = o guard recusou · P0002 = o guard autorizou** — dois desfechos distinguíveis por
SQLSTATE, e **nenhum dos dois apaga coluna alguma de pessoa real**. Um teste de guard destrutivo não
precisa apontar para gente de verdade para provar que o guard morde. A asserção mede ainda, como
primeira checagem, que aquele uuid **de fato não existe** — com um candidato real ali, um guard
defeituoso destruiria PII em vez de parar em `P0002`.

## Varredura de portões — pela FORMA, e o resultado é vazio por construção

Feita como manda o CLAUDE.md §"Portões: varra pela FORMA", sobre todos os arquivos de
`supabase/tests/`. **Conclusão medida: nenhum portão precisou de emenda, e a razão é estrutural —
este plano NÃO CRIA UM ÚNICO OBJETO DE CATÁLOGO.**

| Verificação | Resultado |
|---|---|
| `CREATE`/`ALTER TABLE`/`DROP` nas duas migrations | **apenas 2 `CREATE OR REPLACE FUNCTION`** de funções que já existem |
| Tabela nova · policy nova · índice novo · job de cron novo | **zero** de cada |
| Algum smoke pina `md5` de `varrer_purga_retencao`? | **nenhum** |
| As migrations tocam `candidaturas_alem_da_janela`? | **não** — o pin `b4fdb3a1…` (1 958 octetos) **não deve mudar** |
| `p42_invent05_cron_smoke` (a) `cron.job = 3` | intocado — o 4º job nasce no **46-06** (D-46-23) |
| `p43_previa_smoke` (f)/(g) — listas literais | **escopo deliberado**; este plano não cria função nenhuma |

## Known Stubs

| Stub | Arquivo | Razão | Resolvido por |
|---|---|---|---|
| ⛔ **B-02: `plano_exclusao_titular` recusa chamador sem sessão** | `20260805000005:201-253` | **Rule 4 — decisão do operador exigida.** Enquanto aberto, (b) e (o.2b)/(o.5) reprovam e PURGA-02 não fecha | Saída A, se aprovada — migration nova + 2º re-pin de (C3) |
| `varrer_purga_retencao()` sem dispatch e sem leitura de Vault | `20260823000007` | Deliberado e no escopo negativo: o ramo `live` nasce no 46-06 com a EF `purgar-retencao` | **46-05** / **46-06** |
| `processados` fixo em `0` | idem | Literal e correto nesta versão: nada foi processado | **46-06** |
| Vocabulários `despachado` / `segredo_ausente` sem escritor | `20260823000002` (herdado) | Esperando o ramo `live` | **46-06** |
| `notificacoes_expurgadas` = 0 · `janela_notificacoes_meses` sem leitor | idem (herdado) | RETEN-05 | **46-07** |
| `retencao_hold` sem caminho de ESCRITA | `20260823000005` (herdado do 46-03) | Deliberado e declarado. ⚠ **Este plano acrescentou uma razão nova para não abri-lo sem RPC auditada:** `liberado_em` agora é o passo indireto até a destruição irreversível, e o bloco de auto-verificação de `20260823000006` **aborta o apply** se `authenticated` puder escrever ali | Nenhum plano desta fase |

## Threat Flags

| Flag | Arquivo | Descrição |
|---|---|---|
| `threat_flag: elevation-of-privilege` | `20260805000005_p45_plano_e_dry_run.sql` | **B-02.** Superfície de autorização não prevista pelo `<threat_model>` do plano: o motor delega a uma segunda função com guard próprio. Qualquer emenda ali entra no mesmo registro que T-46-04-01/03 |
| `threat_flag: elevation-of-privilege` | `20260823000005` / `retencao_hold` | Já no bloco que aborta o apply. Escrita em `liberado_em` = destruição irreversível por caminho indireto |
| `threat_flag: elevation-of-privilege` | `20260823000001` / `config_purga` | `modo` é lido **dentro** do predicado do 4º ramo; entrou no mesmo bloco |

## Requirements

- ❌ **PURGA-02 NÃO fecha.** O laço agora chama o motor pela MESMA expressão e a asserção (b)
  existe — mas **B-02 impede a chamada de completar**, e a asserção só será verde depois da Saída A
  e do apply. *"A asserção foi escrita"* e *"o requirement fechou"* são coisas diferentes.
- ❌ **PURGA-05 NÃO fecha.** O kill switch já era provado por (f) desde o 46-02; o que este plano
  acrescenta é que `modo='off'` também não autoriza o guard — asserção (o.1), ainda não executada.

## Verification

| Critério | Estado |
|---|---|
| `20260823000006_p46_guard_purga.sql` existe | ✅ |
| Corpo copiado do ARQUIVO e conferido por md5 ANTES de editar | ✅ `8c86e0f0…` / 34 488 — bate o pin **e** o vivo |
| Sem transação explícita (`grep -c 'BEGIN;'`) | ✅ **0** nas duas migrations |
| Sem delimitador de cifrão anônimo | ✅ **0** nas duas |
| Metade (a) verbatim | ✅ **1** ocorrência da mensagem original |
| `coalesce(p_dry_run, true)` como SQL | ✅ **1** |
| `p_dry_run` como SQL (assinatura + normalização) | ✅ **2** |
| ⭐ As duas metades FISICAMENTE DISTINTAS | ✅ **2** `SELECT EXISTS` separados; **0** `modo IN (...)` compartilhado |
| Negação por conjunto em SQL puro | ✅ **0 / 0** nas duas migrations |
| Ramo lê as três fontes de estado | ✅ `purga_execucao_itens` **13** · `purga_execucoes` **13** · `config_purga` **15** |
| Ramo exige item aberto | ✅ `concluido_em IS NULL` **2** (uma por metade) |
| Bloco de auto-verificação com as DUAS metades | ✅ `RAISE EXCEPTION` + `RAISE NOTICE` (**2**) |
| Bloco consulta os quatro sinais de catálogo | ✅ `has_table_privilege` · `has_column_privilege` · `relrowsecurity` · `pg_policies` |
| Bloco cobre `retencao_hold` | ✅ **8** menções no arquivo |
| ACL nomeia `anon` | ✅ `FROM PUBLIC, anon, authenticated` **1** · `TO service_role` **1** |
| `COMMENT` nomeia as tabelas do ledger como dependência | ✅ preservado verbatim + bloco novo do 46-04 |
| Delimitadores nomeados balanceados | ✅ `anonimizar_candidato` **2** · `verifica_guard_purga` **2** · `sweep_purga` **2** |
| `BEGIN`/`END` balanceados nos dois corpos e no envelope do smoke | ✅ profundidade final correta, nunca negativa |
| `20260823000007` chama o motor | ✅ |
| Captura tipada e única **no envelope da chamada** | ✅ `WHEN SQLSTATE 'P45DR'` **1**; `WHEN OTHERS` no envelope da chamada **0** |
| "Não levantou" é defeito | ✅ `ERRCODE = 'P46NT'` **1**, com a exceção contratada (WR-05) discriminada |
| `P46NT` e `query_canceled` derrubam a varredura | ✅ `WHEN … THEN RAISE;` **2** |
| Ainda sem dispatch | ✅ `net.http_post` **0** e `vault` **0** em SQL puro |
| (b) prova as três coisas juntas | ✅ relato não nulo · marca do terminador · contagens por passo · ⊖ domínio · ⊖ desfechos |
| (o) tem 4 recusas + 2 aceitações | ✅ **4** `42501` · **1** `P0002` · **1** `P45DR` |
| ⊖ (o) não pode destruir | ✅ alvo das negativas é um uuid **inexistente**, e a inexistência é asserida |
| Pin de (C3) mudou, 32 hex, antigo preservado | ✅ `35d1df5d8a3739854e97dd7cbd0d600e`, 43 532 octetos |
| ⊖ (C3) NÃO afrouxada | ✅ rede de **2 → 3** metades, `IS DISTINCT FROM` preservado, nenhuma checagem removida |
| Contador do `p45_motor_exclusao_smoke` | ✅ **24** — inalterado (as checagens entraram no bloco existente) |
| RESUMO (z) do `p46_purga_smoke` 11 → 13 | ✅ **13** incrementos, `v_esperado = 13` |
| Extração do md5 sem contaminação de comentário | ✅ head `\nDECLARE\n` · tail `END;\n` |
| Cabeçalhos **sem** a instrução obsoleta de reparo de `version` | ✅ os dois dizem explicitamente que ela não existe mais e por quê |
| Zero objeto novo de catálogo · zero portão a emendar | ✅ só 2 `CREATE OR REPLACE FUNCTION` |
| `npm run lint` | ✅ **96 erros — baseline congelado**, nos três commits |
| Zero `--no-verify` | ✅ |
| Zero arquivo apagado | ✅ `git diff --diff-filter=D` vazio |
| ⛔ **Nada aplicado em PROD** | ✅ **por desenho** — o apply é do orquestrador, Task 4 |
| ⛔ **B-02 documentado e NÃO auto-corrigido** | ✅ Rule 4 |

## Self-Check: PASSED

- `supabase/migrations/20260823000006_p46_guard_purga.sql` — FOUND
- `supabase/migrations/20260823000007_p46_sweep_dry_run.sql` — FOUND
- `supabase/tests/p46_purga_smoke.sql` — FOUND (modificado)
- `supabase/tests/p45_motor_exclusao_smoke.sql` — FOUND (modificado)
- `.planning/phases/46-purga-autom-tica-dry-run-live/46-04-SUMMARY.md` — FOUND

Commits `82e4b2e` e `9a7744a` — FOUND em `git log`.

## Lessons

**Um guard não é uma função: é uma CADEIA, e D-46-18 mediu só o primeiro elo.**

A medição de 2026-08-22 foi rigorosa e correta no que perguntou — as três claims são NULL sob
`postgres`, e as três metades do guard de `anonimizar_candidato` recusam. Ela só não perguntou o que
aquele corpo **chama**. `plano_exclusao_titular` está a três linhas de distância, tem guard próprio
com a mesma metade (a), e o seu `md5` está pinado **na mesma linha do mesmo smoke** que este plano
foi re-carimbar. O objeto esteve à vista o tempo todo.

A generalização é a que vale para a próxima vez: **ao estender a autorização de uma função
`SECURITY DEFINER`, enumere todas as funções que o corpo dela invoca e verifique o guard de cada
uma.** `SECURITY DEFINER` troca o papel do BANCO; ele não troca `auth.uid()`, que é uma claim de
JWT — e é sobre a claim que todos estes guards decidem.

**E o que fez o defeito aparecer neste plano, e não em produção às três da manhã, foi uma escolha
de higiene que parece pequena:** o smoke **nunca carimba `request.jwt.claims`**. Se ele rodasse sob
claims de administrador, as duas funções teriam autorizado por PAPEL, as asserções (b) e (o)
ficariam **verdes**, e o cron — que não tem papel nenhum — falharia calado no primeiro dia de
`dry_run`. Um teste que roda com mais privilégio que o chamador real é um teste que mede outra
coisa.
