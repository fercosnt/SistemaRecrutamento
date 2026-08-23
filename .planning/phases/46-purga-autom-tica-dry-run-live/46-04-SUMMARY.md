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
  - "supabase/migrations/20260823000007_p46_sweep_dry_run.sql — o laco de dry-run passa a CHAMAR o motor, com captura tipada, o ERRCODE proprio P46NT e a RECONCILIACAO de execucoes vencidas (HI-03)"
  - "supabase/migrations/20260823000009_p46_ck_modo_vigente.sql — CHECK de dominio na coluna que o guard destrutivo le (ME-01)"
  - "supabase/migrations/20260823000008_p46_guard_plano.sql — o 3o ramo de plano_exclusao_titular (Blocker B-02 / Saida A), nas DUAS metades"
  - "supabase/tests/p45_motor_exclusao_smoke.sql (C3) — re-pin cruzado dos DOIS md5, com a rede estrutural crescendo de 2 para 4 metades"
  - "supabase/tests/p46_purga_smoke.sql — assercoes (b), (o), (o.6), (o.7) e (p); RESUMO (z) 11 -> 16"
  - "⛔ BLOCKER B-02 DESCOBERTO E FECHADO no mesmo plano (Saida A, operador 2026-08-22) — e a varredura que prova que NAO HA B-03"
affects: [46-05, 46-06, 46-07]

actuals:
  tokens: 112000
  tasks: 4
  commits: 9

tech-stack:
  added: []
  patterns:
    - "Ramo de autorizacao com metades FISICAMENTE DISTINTAS: dois SELECT EXISTS separados, jamais um predicado com lista de modos compartilhada — e assim que o caminho destrutivo deixa de poder herdar em silencio a permissao do reversivel"
    - "Guard por ESTADO e nunca por CREDENCIAL: o chamador e aceito pelo estado que so o motor produz, e um estado ninguem carrega no bolso"
    - "Bloco de auto-verificacao que aborta o apply cobre tambem a superficie INDIRETA (retencao_hold): liberar um hold nao chama a funcao destrutiva, mas e o passo que falta ate ela"
    - "Assercao negativa sobre guard destrutivo apontada para um id INEXISTENTE: 42501 = guard recusou, P0002 = guard autorizou — totalmente discriminante e incapaz de destruir"
    - "Re-pin de md5 SEMPRE acompanhado de crescimento da rede estrutural embaixo dele: no dia do re-pin o md5 casa com qualquer corpo, e e so a rede que continua exigindo a forma revisada"
  - "Guard novo tem de ser correlacionado com o CHAMADOR, e nao so com o alvo e o estado global: um OR sobre estado global desliga as guardas existentes para TODO MUNDO enquanto o estado durar (BL-02)"
  - "Estado que autoriza destruicao tem de EXPIRAR: sem limite de idade, um executor que morre deixa autorizacao destrutiva standing e o alvo sumindo das varreduras seguintes (HI-03)"
  - "Historico de pins distingue 'existiu no repositorio' de 'esteve APLICADO': um pin que aparece e some sem explicacao e indistinguivel de um pin trocado as escondidas"
  - "'Ordem de repositorio' nunca e 'ordem de apply' — num apply incremental contra banco vivo, um REVOKE reemitido remove grants que migrations POSTERIORES no repositorio concederam ANTES no tempo (BL-01)"

key-files:
  created:
    - supabase/migrations/20260823000006_p46_guard_purga.sql
    - supabase/migrations/20260823000007_p46_sweep_dry_run.sql
    - supabase/migrations/20260823000008_p46_guard_plano.sql
    - supabase/migrations/20260823000009_p46_ck_modo_vigente.sql
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
  - "B-02 / Saida A: o 3o ramo entra nas DUAS metades de plano_exclusao_titular; emendar so a (a) mudaria o sintoma sem mudar a causa"
  - "⚠ Em plano_exclusao_titular o ramo e UM predicado, e nao dois: a funcao e STABLE e nao tem caminho destrutivo, entao um segundo ramo restrito a live seria SUBCONJUNTO ESTRITO do primeiro — codigo morto dentro de um guard, que e o P39/CR-02 literal"
  - "O ramo do plano exige o ALVO e nao so o modo: sem isso, estar numa purga autorizaria LER o plano de qualquer pessoa"

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

⚠ **NADA FOI APLICADO.** **Quatro** arquivos de migration escritos e commitados, dois smokes
emendados. O apply é da Task 4 e pertence ao orquestrador.

⛔ **DUAS rodadas de code review bloqueante.** A rodada 1 reprovou com **2 BLOCKER, 4 HIGH, 4 MEDIUM,
2 LOW** e encontrou dois defeitos que teriam ido a produção: um que derrubaria o direito de exclusão
do titular no instante do apply, e outro que abria uma janela em que qualquer usuário logado
destruiria um titular fora da ordem Storage → Postgres → Auth. A rodada 2 fechou os dois BLOCKERs
**por verificação mecânica** (ACL final simulado, md5 recalculados) e achou **três HIGH novos, dois
deles introduzidos pelo próprio conserto** — inclusive uma reconciliação que **mentiria sobre um ato
irreversível** e uma asserção de segurança que só provava recusa. **21 achados no total, todos
tratados.**

⭐ **A lição estrutural das duas rodadas:** os dois BLOCKERs da rodada 1 passaram porque eu tinha
escrito, no próprio arquivo, um argumento que os justificava — *"ordem de aplicação do repositório"*
e *"se e somente se"*. **Prosa que afirma uma propriedade não é a propriedade.** E a rodada 2 mostrou
o corolário: dois dos três HIGH novos nasceram do conserto, ou seja **um conserto de segurança é
código novo e merece o mesmo ceticismo que o defeito que ele corrige**.

⛔ **E este plano descobriu — e fechou — um segundo blocker que D-46-18 não previu.** O motor delega
a `plano_exclusao_titular`, que tinha guard próprio recusando chamador sem sessão: o 4º ramo
autorizava o cron a entrar e ele morria três linhas depois. Está na §Blocker B-02, é a primeira
coisa a ler, e a **varredura da cadeia inteira de chamadas guardadas** (que prova que **não há
B-03**) é o que torna a correção suficiente em vez de "o próximo nível a descobrir".

## Task Commits

| Task | Nome | Commit |
|------|------|--------|
| 1 | [CHECKPOINT] D-46-18 — escopo do 4º ramo | pré-resolvido por **D-46-24**; não reaberto |
| 2 | O 4º ramo do guard + o bloco que aborta o apply | `82e4b2e` |
| 3 | O laço chama o motor + (b) + (o) + re-pin de (C3) | `9a7744a` |
| — | SUMMARY + STATE + ROADMAP + WINDOWS (checkpoint B-02) | `7c3b4f4` |
| 3b | **B-02 / Saída A** — o 3º ramo do plano + (p) + 2º re-pin | `0a8e22b` |
| — | Escrituração do fechamento de B-02 | `fa9e7ea` |
| **4a** | ⛔ **Consertos da rodada 1** — 2 BLOCKER, 4 HIGH, 3 MEDIUM, 2 LOW | `6029f94` |
| — | Escrituração da rodada 1 + `46-REVIEW.md` | `16e00e9`, `0137f25` |
| **4b** | ⛔ **Consertos da rodada 2** — 3 HIGH, 3 MEDIUM, 3 LOW | `381e16a` |
| — | Escrituração da rodada 2 | `<este commit>` |

Zero `--no-verify`: o hook de type-check rodou nos nove commits e reportou **96 erros — o baseline
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

**Este é o achado do plano.** Levantado como Rule 4, **resolvido pela Saída A** (decisão do
operador, 2026-08-22) e **fechado no mesmo plano** — migration `20260823000008`, asserção (p) e o 2º
re-pin de (C3), commit `0a8e22b`.

⭐ **E a varredura que fecha a dúvida seguinte foi feita e é o que torna a Saída A suficiente:**
a cadeia inteira de chamadas com guard de sessão foi percorrida —
**`anonimizar_candidato → plano_exclusao_titular` é o ÚNICO par**, e `plano_exclusao_titular` não
chama mais nenhuma função guardada. **NÃO HÁ B-03.** Sem essa varredura, a Saída A seria "consertar
o nível que apareceu"; com ela, é consertar a cadeia.

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
| **A — 3º ramo em `plano_exclusao_titular`**, nas DUAS metades | ✅ **ESCOLHIDA** pelo operador em 2026-08-22, e implementada em `20260823000008` |
| B — o motor pula `plano_exclusao_titular` quando chamado pela purga | ⛔ **Recusada.** (C3/ii) assere que o tombstone CONTÉM a chamada; pular cria um segundo caminho pelo corpo destrutivo e contradiz PURGA-02 e o P39/CR-02 |
| C — a varredura carimba `request.jwt.claims` antes de chamar | ⛔ **Recusada.** É forjar sessão. Faria `auth.uid()` mentir para tudo o que rodasse naquela transação, e é a família de "credencial standing" que D-46-18 já recusou |

**A prova de que o smoke pegaria isto sozinho:** `p46_purga_smoke.sql` **nunca** carimba
`request.jwt.claims`. A sessão do smoke tem `auth.uid()` NULL, exatamente como o cron. As asserções
(b) e (o.2b) escritas neste plano reprovam com o diagnóstico certo enquanto B-02 estiver aberto —
foi assim que ele apareceu.

### `20260823000008_p46_guard_plano.sql` — como a Saída A foi escrita

O corpo inteiro veio do arquivo `20260805000005`, conferido por md5 antes da edição:
`97634d07ef13447e06741a8c8372fca6` / 21 349 octetos — bate o pin **e** o vivo. **Duas** diferenças,
ambas no guard.

**1. O ramo entra nas DUAS metades, e isso foi medido, não presumido.** Para um titular REAL sob o
cron, `v_user_id` é um uuid e `v_uid` é NULL, então `v_user_id IS DISTINCT FROM v_uid` é TRUE e a
metade (b) recusaria **mesmo com a (a) já resolvida**. Emendar só a (a) deixaria o blocker de pé com
outra cara — e mudança de sintoma sem mudança de causa é o modo de falha mais caro de diagnosticar.
A alternativa é **cumulativa**: `rh`, `administrador` e o próprio titular continuam passando pelo
caminho de sempre.

**2. Escopo DUPLO (`dry_run` ou `live`) — é o D-46-24 um nível abaixo.** O laço chama
`anonimizar_candidato(id, true)`, que chama esta função no PASSO 0. Exigir `live` aqui mataria o
dry-run durante os 14 dias inteiros da janela e a fase voltaria a provar zero sobre o caminho do
delete. `off` não autoriza — e a asserção (p.1) mede exatamente isso.

### ⚠ Divergência da obrigação 2 do coordenador — e por que seguir a letra criaria o defeito

O coordenador pediu **duas metades fisicamente distintas "sem exceção"**. **Não foi feito, e a razão
está escrita no cabeçalho da migration.**

Em `anonimizar_candidato` as duas metades **têm conteúdo**: existe um caminho reversível e um
destrutivo, e separá-los é o que impede o segundo de herdar a permissão do primeiro. **Esta função
não tem caminho destrutivo** — é `STABLE`, tem uma assinatura, não recebe intenção e devolve sempre
a mesma coisa. Não existe segunda metade a restringir.

E escrevê-la mesmo assim não seria verbosidade inofensiva: o predicado de `live` é um **subconjunto
estrito** do de `dry_run OU live`. Dois `EXISTS` unidos por OU dariam um segundo ramo que **nunca
poderia ser a razão de a função autorizar** — sempre que ele fosse verdadeiro, o primeiro também
seria. Isso é **código morto dentro de um guard**, e este projeto tem precedente nomeado e datado
para exatamente isso: **P39 / CR-02, "uma guarda que era dead code"** — o mesmo precedente que o
plano inteiro cita para justificar por que o dry-run tem de sair da mesma expressão.

A restrição ativa por modo continua existindo e continua onde tem efeito: `20260823000006`, seção
(p.2), no caminho que de fato destrói. Autorizar a **leitura** do plano em `dry_run` não autoriza
destruição nenhuma — quem decide destruir é o outro guard, e ele não foi tocado por este arquivo.
A obrigação 3 (cumulativa, nunca substitutiva) e a 4 (o estado que só a purga produz) foram
cumpridas na letra.

### O que o ramo exige, e por que o ALVO importa tanto quanto o modo

Item vivo em `purga_execucao_itens` **para aquele `p_candidato_id`**, `concluido_em` nulo, execução
em `situacao='executando'`, e o par de modos. **Sem a condição de alvo, estar em `dry_run`
autorizaria ler o plano de QUALQUER pessoa** — e o ACL desta função (`REVOKE` nominal de `anon` e
`authenticated`, `20260805000005:470-474`) existe precisamente porque *"esta função devolve CONTAGENS
de PII por pessoa; uma tela capaz de enumerá-las é superfície de exfiltração"*. A asserção (p.2) mede
essa metade em separado.

**Premissa medida antes de escrever, porque a decisão do operador se apoia nela:** o retorno foi lido
chave por chave — `candidato_id`, booleanos de estado, contagens por tabela, e nomes de
tabela/coluna em `bloqueadores_deleteuser`. **Zero PII.** O que a Saída A ampliou foi quem lê
*contagens*, não quem destrói. E a asserção (p) **verifica essa premissa em execução**, sobre as
chaves do jsonb — se ela deixar de valer, a decisão precisa ser retomada, não remendada.

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

## ⛔ Code review bloqueante — REPROVADO na 1ª rodada, e o que ele encontrou

`46-REVIEW.md`, 2026-08-22, modo adversarial: **2 BLOCKER · 4 HIGH · 4 MEDIUM · 2 LOW**. O portão
funcionou exatamente como a Phase 45 previa — lá foram 9 blockers em 3 rodadas, e **zero** chegou a
produção. Aqui, dois defeitos que teriam ido a PROD:

### BL-01 — as migrations derrubavam o direito de exclusão do titular

`20260805000009` está aplicada **desde 2026-08-05** e concede `EXECUTE` a `authenticated` nas duas
funções — é como a EF `executar-direito-titular` chama o motor com o JWT do titular. `CREATE OR
REPLACE` preserva o ACL; meu `REVOKE` rodaria **depois** e o removeria, sem re-`GRANT`. Um titular
exercendo o Art. 18 receberia `42501`. **`DI-45-10-01` reintroduzido em produção** por uma migration
cujo escopo negativo promete não tocar em nada.

⚠ **E o que fez o defeito passar foi um argumento que eu escrevi no arquivo:** *"a `20260805000009`
concede EXECUTE a `authenticated` DEPOIS desta linha **na ordem de aplicação do repositório**"*.
**Ordem de repositório não é ordem de apply.** Numa reconstrução do zero seria verdade; num apply
incremental contra o banco vivo — o único que vai acontecer — é falso. O `COMMENT` do próprio
arquivo descrevia o grant que a linha seguinte destruía, e o portão (C1) do
`p45_motor_exclusao_smoke.sql` já exigia esse grant e ficaria vermelho.

**Corrigido** re-emitindo `GRANT … TO authenticated` nas duas migrations, com a proveniência de cada
grantee escrita, e **reescrevendo o comentário errado** — ele não podia ser preservado, porque era a
razão documentada pela qual o defeito não foi visto.

### BL-02 — o 4º ramo não era correlacionado com o CHAMADOR

O predicado interno estava certo; **a ligação estava errada**. `v_purga_live` era propriedade
apenas de `p_candidato_id` e do cerco — **não mencionava quem chama**. Consequência: enquanto
houvesse item aberto sob execução em `live` (que no desenho do 46-06 é exatamente a janela do
dispatch assíncrono), as metades (b) e (c) — as duas únicas que restringem a destruição — ficavam
**desligadas para todo mundo**. Qualquer usuário logado com `EXECUTE` — um `rh`, ou o próprio
candidato via PostgREST — destruiria aquele titular **fora da ordem Storage → Postgres → Auth**,
orfanando o CV no bucket de forma irrecuperável. **CR-01 cenário 2 reaberto.**

⚠ Meu cabeçalho prometia *"se e somente se"* — **em prosa**. O código não impunha.

**Corrigido** com `(v_uid IS NULL) AND EXISTS (…)` nos três predicados: o ramo existe para autorizar
**o cron**, e o cron se caracteriza por não ter sessão. Um chamador com claim volta a ser julgado
por (b) e (c), como sempre foi.

⚠ **E o caso era INOBSERVÁVEL** — o smoke nunca carimba claims, higiene que está certa e que foi o
que revelou B-02, mas que tornava invisível o único caso que importava aqui. **Asserção (o.6)**
carimba claims de `rh` e de `candidato` sob item aberto em `live` e exige `42501`; é o único bloco
do arquivo que usa claims, e ele **as limpa imediatamente**, antes de (p) — um vazamento faria as
asserções seguintes passarem por PAPEL em vez de pelo ramo da purga.

### Os quatro HIGH

| ID | O que era | Conserto |
|---|---|---|
| **HI-01** | Ordem de apply **errada**, e as três migrations declaravam ordens **diferentes entre si** — a única explícita era a errada. `007` chama o motor, que chama `plano_exclusao_titular` no PASSO 0 | **`006 → 008 → 009 → 007`**, a mesma frase nos quatro cabeçalhos. ⚠ Esta célula dizia `006 → 008 → 007 → 009` — a ordem da rodada 1, correta até a `009` nascer. A `009` alarga o `CHECK` de `desfecho_*` para aceitar `desconhecido`, e é a reconciliação da `007` que escreve esse valor: aplicar `007` antes de `009` faria a primeira reconciliação abortar com `23514`. Deixar as duas linhas divergindo dentro do mesmo documento é **RD3-06** (regressão de LO-02), e a linha errada era justamente a que alguém copiaria para o apply |
| **HI-02** | O bloco que aborta perguntava só por `authenticated` e ignorava `anon` — a lição que o `REVOKE` do mesmo arquivo aplica e o bloco de catálogo não. Uma policy `FOR INSERT TO anon` não casaria em nenhuma das três perguntas | Laço sobre `['authenticated','anon']` e `p.roles && ARRAY[…]` (cobre também policy sem cláusula `TO`) |
| **HI-03** | **Nada limitava no TEMPO o estado autorizante.** EF que morre deixa item aberto **para sempre** = autorização destrutiva *standing* — a categoria que D-46-18 recusou ao rejeitar a Saída A. E o titular sumiria de todas as varreduras seguintes pelo claim anti-sobreposição | `e.iniciada_em > now() - interval '1 hour'` nos três predicados **e** a **reconciliação** no `…007`, que fecha itens órfãos e aborta execuções vencidas antes de materializar |
| **HI-04** | `(o.5)` tratava `ja_anonimizado` — a 2ª terminação que o `…007` implementa **de propósito** — como *"o terminador sumiu e a transação teria COMMITADO"*. **5ª ocorrência da forma "portão que reprova trabalho correto com diagnóstico falso" nesta fase** | O estado de `pos1` é **MEDIDO antes**, pelo mesmo predicado de reconhecimento do motor (CR-06), e a asserção exige a terminação **exata** que aquele estado obriga — não afrouxa, e nunca fica vermelha sozinha |

### MEDIUM / LOW — o que foi feito e o que foi deferido

| ID | Decisão |
|---|---|
| **ME-01** | **Feito** — `20260823000009` acrescenta CHECK de domínio em `modo_vigente`. Não há escalação conhecida (igualdade literal + par cumulativo); o que fecha é uma **superfície sem contrato** numa coluna que decide destruição irreversível. `'ausente'` entra no vocabulário porque o ramo fail-closed o grava — omiti-lo faria o **comportamento seguro** abortar com 23514 |
| **ME-02** | **DEFERIDO ao 46-06**, com razão: o `FOR UPDATE` serializa mas não é exclusão mútua no tempo, e em `dry_run` a reentrância é inócua. O guard de "uma execução por dia" pertence ao plano que cria o cron, junto com o dispatch que ela protege |
| **ME-03** | **Feito** — o `NOTICE` final declara o **escopo honesto**: o bloco cobre papéis de cliente; `service_role` e `postgres` bypassam RLS por desenho e continuam podendo liberar um hold. A RPC auditada de `retencao_hold` é declarada **pré-condição do flip**, não melhoria posterior |
| **ME-04** | **Feito** — (C3/iii) media que `modo_vigente = 'live'` existia *em algum lugar*; a regressão real (a metade destrutiva passar a ler `v_purga_dry`) deixaria o portão **verde**. Agora mede a **LIGAÇÃO**: as duas variáveis existem **e** as guardas leem a certa. Mais BL-02 e HI-03 vigiados por forma, nas duas funções |
| **LO-01** | **Feito** — referência `46-04` → `46-06` corrigida |
| **LO-02** | **Feito** — as duas linhas superadas deste SUMMARY corrigidas |

## ⛔ Rodada 2 — os dois BLOCKERs fecharam, e o conserto trouxe três HIGH novos

A rodada 2 verificou **mecanicamente**, não por leitura de cabeçalho: simulou o ACL final das quatro
migrations (`{postgres, service_role, authenticated}` nas duas funções — idêntico ao vivo), recalculou
os dois md5 byte a byte, e **inventariou as sete chamadas** que exercitavam o 4º ramo. Foi o
inventário que produziu o achado mais grave.

### RD2-02 — a metade destrutiva nunca foi provada capaz de AUTORIZAR *(o mais grave)*

Das sete chamadas, **nenhuma tinha `v_purga_live = TRUE`.** Eu provei que o ramo **recusa** — quatro
vezes, com diagnósticos precisos — e nunca que ele **autoriza**.

Duas consequências, e a segunda é pior que a primeira:

1. Se alguém quebrasse `v_purga_live` amanhã (`= 'live '` com espaço, `e.modo_vigente` trocado por
   `cp.modo`, um `AND` a mais), **todo o portão continuaria verde** e a descoberta chegaria no dia do
   flip `dry_run → live`, com o cron devolvendo `42501` em 100% dos titulares.
2. `(o.6)` — a asserção que eu tinha acabado de escrever para tornar o BL-02 observável — concluía
   *"o guard recusou **porque o chamador tem sessão**"*, mas media apenas *"o guard recusou"*. Se o
   estado montado deixasse de valer, ela ficaria **verde com o BL-02 de volta**.

⭐ **É a lição de vacuidade desta fase aplicada ao próprio conserto de segurança**, e é o *modo de
falha nº 3 dos sete portões da Phase 45* — o mesmo que este arquivo já invocava para justificar
`(o.2b)`. **Corrigido** com `(o.7)`: mesmo estado, sessão NULA, intenção destrutiva → tem de
**autorizar** (`P0002` sobre o alvo sintético). O par converte "recusou" em "recusou por este motivo".

### RD2-01 — a reconciliação mentiria sobre um ato irreversível

Ela carimbava `desfecho_postgres = 'falha'` **incondicionalmente**. Se a EF concluísse o Postgres e
morresse antes de fechar o item, o ledger passaria a **afirmar que a anonimização falhou** — sobre um
ato que aconteceu e não tem volta. E `purga_execucao_itens` é, por D-46-16, **registro de cumprimento
de obrigação legal com retenção indefinida**; com PITR desligado, não existe segunda fonte para
desmentir.

Este arquivo já tinha escrito que *"dizer `ok` aqui seria a mentira mais cara possível"*. **A mentira
simétrica custa o mesmo.**

**Corrigido com três regras diferentes, e a diferença é epistêmica:**

| Coluna | Regra | Por quê |
|---|---|---|
| qualquer, **já carimbada** | **PRESERVADA** | descreve um ato que alguém observou; reescrevê-la é falsificar |
| `desfecho_postgres` pendente | **INFERIDO** da sentinela do CR-06 | o tombstone é **uma** transação: ou a sentinela está na linha de `candidatos` (aconteceu → `ok`) ou não está (não aconteceu → `falha`). **Inferir do próprio banco em vez de presumir** |
| `desfecho_storage` / `_auth` pendentes | **`desconhecido`** | a SONDA 2 mediu que `storage.objects` não tem FK para `auth.users`, e o Auth vive fora do banco. `falha` afirmaria que não aconteceu; `nao_aplicavel`, que não havia o que fazer — **as duas são asserções sobre um fato que ninguém observou** |

⚠ `desconhecido` **não existia no vocabulário**. `20260823000009` alarga os três `CHECK` — alargar
nunca falha por dado. **Um campo que diz "eu não sei" é estritamente mais honesto que um que afirma
errado**, e a migration existe só para tornar essa frase exprimível.

### RD2-03 — a janela de 1 h criou uma obrigação nova sobre o 46-06 *(registrada, não consertada aqui)*

A janela é **folgada** — 24× o teto de parede de 150 s da EF, com um post por titular. O risco não é
a duração: é a **latência de entrega**. As tabelas do `pg_net` são `UNLOGGED` com **TTL de ~6 h**, e a
EF **começa pelo Storage, que não tem guard nenhum**.

```
post entregue 70 min depois → EF apaga o CV no Storage
                            → chama o motor → 42501 (janela venceu)
                            → Storage apagado, Postgres intacto
```

Currículo órfão e irrecuperável. ⚠ **Antes do 46-04 esse cenário não existia** — a autorização não
expirava. A janela continua sendo a troca certa (a alternativa era autorização destrutiva *standing*,
recusada por D-46-18), mas ela **desloca** o risco para um ponto que o 46-06 não sabia que tinha de
cobrir.

**Registrado como obrigação de aceite no topo do `46-06-PLAN.md`**, com a ordem de operações da EF
nomeada e o critério mensurável: no teste, um caso em que a sonda devolve `42501` prova que **zero**
chamada de Storage aconteceu — não "que a EF retornou erro". *A diferença entre as duas é um
currículo.*

### Os demais

| ID | Decisão |
|---|---|
| **RD2-04** | `iniciada_em` entrou na lista de colunas do bloco que aborta — **quem escreve essa coluna RENOVA a janela**, desfazendo HI-03 sem nenhum portão falar. O bloco diz de si mesmo que declarar leitura nova é obrigação de quem a escreve; eu tinha violado a regra escrita no próprio bloco |
| **RD2-05** | Reconciliação movida para **depois** do kill switch. Cenário quebrado: um operador aciona `off` **para congelar** uma execução travada e investigá-la, e a varredura seguinte a abortava — apagando o cenário. `off` voltou a significar *"esta execução só escreve o heartbeat"* |
| **RD2-06** | **(C3/janela)** mede o **VALOR** das três janelas, não a existência. O código reconhecia o problema e escolhia conviver numa frase de comentário — **uma frase não é um mecanismo**, e é a mesma aposta que produziu BL-01 |
| **RD2-07** | Escopo honesto escrito **dentro do corpo**, no `COMMENT` e no cabeçalho. ⚠ Ver a nota sobre o 3º re-pin |
| **RD2-08 / 09 / 10** | Papel ofensor nomeado na mensagem; comentário órfão removido; não-vacuidade re-medida para a 2ª perna de `(o.6)` |

### ⚠ Por que aceitei um TERCEIRO re-pin quando o revisor oferecia evitá-lo

O revisor foi explícito: escrever RD2-07 **fora** do corpo (só no `COMMENT` e no cabeçalho) manteria
`md5(prosrc)` estável e pouparia o re-pin. **Escrevi dentro do corpo assim mesmo.**

A razão é o próprio defeito: RD2-07 existe porque *"quem ler `…006:310-312` daqui a seis meses vai
entender que apenas o cron passa, e essa é a premissa falsa a partir da qual o próximo BL-01 é
escrito"*. **A frase errada está a três linhas do predicado** — é ali que o leitor lê. Corrigi-la em
dois outros lugares e deixá-la intacta no lugar que importa é literalmente a forma do BL-01: prose
num lugar contradizendo a verdade no outro.

O re-pin é um custo mecânico que eu pago com precisão e que o histórico torna auditável. Uma frase
errada dentro de um guard destrutivo não tem esse preço.

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

**São DOIS re-pins, e os dois no mesmo commit da migration que os obriga** — um commit intermediário
em que a migration existe e o pin ainda aponta para o corpo antigo é um estado em que o portão está
mecanicamente vermelho por construção do repositório (CLAUDE.md §"Portões").

⚠ **E eles foram REFEITOS depois do code review**, porque BL-01, BL-02, HI-02 e HI-03 mudaram os dois
corpos. Os valores intermediários **nunca vigoraram em PROD**, e o bloco de PROVENIÊNCIA diz isso
com essas palavras — a coluna que importa num histórico de pins não é "quais existiram", é **"quais
estiveram aplicados"**. Um pin que aparece e some sem explicação é indistinguível de um pin trocado
às escondidas.

| Função | Lado ARQUIVO (vigente) | Octetos | Intermediários (nunca aplicados) | Anterior (vigorou em PROD) | VIVO |
|---|---|---|---|---|---|
| `anonimizar_candidato` (`…006`) | **`5209239f191aa15b1725b726b00eb4cd`** | **47 549** | `35d1df5d…` (r1) · `4765cc68…` (r2) | `8c86e0f0…` (34 488) | ⏸ orquestrador |
| `plano_exclusao_titular` (`…008`) | **`42f916d81cd274b28044a410ae57a237`** | **27 392** | `3f6007b8…` (r1) · `12621ce8…` (r2) | `97634d07…` (21 349) | ⏸ orquestrador |

**Três re-pins no mesmo dia, e nenhum foi silencioso:** o plano escreveu os corpos e duas rodadas de
review os corrigiram **antes de qualquer apply**. Os quatro valores intermediários estão no bloco de
PROVENIÊNCIA marcados **"NUNCA VIGOROU EM PROD"** — a coluna que importa num histórico de pins não é
"quais existiram", é **"quais estiveram aplicados"**.

Os lados ARQUIVO foram medidos **por execução** do comando registrado no bloco de PROVENIÊNCIA —
nunca digitados.

Extração conferida quanto a contaminação de comentário — a armadilha encontrada no 46-02: o trecho
começa em `\nDECLARE\n` e termina em `END;\n`. A migration **não menciona o delimitador nomeado em
prosa em lugar nenhum**, de propósito.

**O valor antigo permanece no bloco de PROVENIÊNCIA como histórico**, com as datas e a observação de
que ele vigorou durante a execução do motor em produção de 2026-08-22. É isso que torna a sequência
auditável: dá para ver que o pin mudou, quando, e por quê.

### ⚠ Os re-pins NÃO afrouxaram nada — a rede estrutural cresceu de DUAS metades para QUATRO

⚠ **LO-02 do review:** duas linhas desta seção ficaram desatualizadas entre o commit do checkpoint
e o fechamento de B-02 (diziam "2 → 3" e "11 → 13"). Corrigidas: a rede é **2 → 4** e o RESUMO (z)
vai a **16** (`v_esperado := 16` em `p46_purga_smoke.sql:1637` — 6 do 46-02 + 5 do 46-03 + 5 do
46-04). ⚠ **RD4-03:** esta mesma linha saiu com **15** na primeira correção, e um documento que
erra o número no parágrafo em que anuncia ter corrigido o número é pior que o erro original.

(C3) tinha (i) md5 e (ii) "o tombstone CHAMA a expressão única". Ganhou **(iii)** sobre o motor e
**(iv)** sobre o plano, as duas medidas sobre o corpo VIVO com fronteira de palavra:

| Checagem | O que a ausência dela permitiria |
|---|---|
| corpo contém `purga_execucao_itens` | o 4º ramo ter sido apagado, e o md5 novo casar mesmo assim |
| corpo exige `concluido_em IS NULL` | um item **fechado** de uma execução antiga autorizar para sempre — o ramo aceitaria um **vestígio** do estado em vez do estado |
| corpo **não** contém negação por conjunto | o guard voltar a falhar ABERTO com um lado NULL (defeito real da 42-06) |
| metade destrutiva exige `modo_vigente = 'live'` por extenso | as duas metades voltarem a compartilhar um predicado — a regressão que D-46-24 tornou inaceitável |
| **(iv)** o corpo do **PLANO** contém `purga_execucao_itens` | ⭐ **o Blocker B-02 voltar em silêncio** — o 4º ramo do motor deixaria de produzir efeito útil e o sintoma seria "o titular falhou" |
| **(iv)** o corpo do plano exige `i.candidato_id = p_candidato_id` | estar numa purga autorizar ler o plano de **qualquer pessoa** — a superfície de exfiltração que o `REVOKE` nominal daquela função existe para fechar |
| **(iv)** o corpo do plano não contém negação por conjunto | o guard falhar ABERTO com um lado NULL |

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

### (p) — o 3º ramo do plano, medido DIRETAMENTE e em separado de (o)

**Ela é separada de (o) de propósito.** (o) mede o guard do MOTOR, e o motor só alcança
`plano_exclusao_titular` **depois** de passar por aquele guard. Se as duas fossem uma asserção só, um
defeito aqui apareceria como *"o motor recusou"* e mandaria a próxima pessoa depurar o arquivo
errado — que foi literalmente o que quase aconteceu com B-02.

| Caso | Estado | Esperado |
|---|---|---|
| (p.1) | cerco em `off`, titular COM item aberto | `42501` — o kill switch fecha também a LEITURA |
| **(p.2)** | cerco em `dry_run`, titular **SEM item aberto** | **`42501`** — ⭐ prova que o ramo exige o **ALVO**, e não só o modo |
| (p.3) | cerco em `dry_run`, titular COM item aberto | plano devolvido, e ⊖ **zero chave de PII** no jsonb |

⊖ E (p) mede ainda a **premissa da decisão do operador**: o jsonb devolvido não pode ter chave de
nome, e-mail, CPF, telefone, endereço ou nascimento. Se a premissa deixar de valer, o que a Saída A
ampliou tem outro tamanho e a decisão precisa ser retomada, não remendada.

⚠ **As quatro negativas de (o) apontam para um `candidato_id` que NÃO EXISTE**, e isso é decisão de
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
| ⭐ `p45_motor_exclusao_smoke` **(C2)** — 10 recusas de 5 funções × 2 contextos | **conferida contra os dois ramos novos:** ela chama com `gen_random_uuid()`, para o qual **não pode existir item de ledger**, então as duas funções continuam recusando com `42501`. **O portão continua mordendo em 10 e não precisou de emenda** |

## Known Stubs

**FECHADO neste plano:** ⛔ **B-02** — `plano_exclusao_titular` recusava chamador sem sessão.
Resolvido pela Saída A (`20260823000008`), com a varredura que prova que **não há B-03**.

| Stub | Arquivo | Razão | Resolvido por |
|---|---|---|---|
| `varrer_purga_retencao()` sem dispatch e sem leitura de Vault | `20260823000007` | Deliberado e no escopo negativo: o ramo `live` nasce no 46-06 com a EF `purgar-retencao` | **46-05** / **46-06** |
| `processados` fixo em `0` | idem | Literal e correto nesta versão: nada foi processado | **46-06** |
| Vocabulários `despachado` / `segredo_ausente` sem escritor | `20260823000002` (herdado) | Esperando o ramo `live` | **46-06** |
| `notificacoes_expurgadas` = 0 · `janela_notificacoes_meses` sem leitor | idem (herdado) | RETEN-05 | **46-07** |
| `retencao_hold` sem caminho de ESCRITA | `20260823000005` (herdado do 46-03) | Deliberado e declarado. ⚠ **Este plano acrescentou uma razão nova para não abri-lo sem RPC auditada:** `liberado_em` agora é o passo indireto até a destruição irreversível, e o bloco de auto-verificação de `20260823000006` **aborta o apply** se `authenticated` puder escrever ali | Nenhum plano desta fase |

## Threat Flags

| Flag | Arquivo | Descrição |
|---|---|---|
| `threat_flag: elevation-of-privilege` | `20260823000008_p46_guard_plano.sql` | **B-02, MITIGADO.** Superfície não prevista pelo `<threat_model>` do plano: o motor delega a uma segunda função com guard próprio. Mitigação: o ramo exige o **ALVO** além do modo (a função devolve contagens de PII por titular); (C3/iv) exige a forma; (p.2) mede a recusa sem alvo; e (p) verifica em execução a premissa de zero PII no retorno. ⊖ Varredura da cadeia: **não há B-03** |
| `threat_flag: elevation-of-privilege` | `20260823000005` / `retencao_hold` | Já no bloco que aborta o apply. Escrita em `liberado_em` = destruição irreversível por caminho indireto |
| `threat_flag: elevation-of-privilege` | `20260823000001` / `config_purga` | `modo` é lido **dentro** do predicado do 4º ramo; entrou no mesmo bloco |

## Requirements

- ❌ **PURGA-02 NÃO fecha — e a razão agora é só uma: nada foi APLICADO.** O laço chama o motor pela
  MESMA expressão, a asserção (b) existe, e a cadeia de guards está completa (B-02 fechado). O que
  falta é execução: (b) só fica verde depois do apply das três migrations. *"A asserção foi
  escrita"* e *"o requirement fechou"* continuam sendo coisas diferentes.
- ❌ **PURGA-05 NÃO fecha.** O kill switch já era provado por (f) desde o 46-02; o que este plano
  acrescenta é que `modo='off'` não autoriza **nenhum** dos dois guards — asserções (o.1) e (p.1),
  ainda não executadas.

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
| Pin de (C3) mudou, 32 hex, antigos preservados | ✅ `5209239f191aa15b1725b726b00eb4cd`, 47 549 octetos |
| ⊖ (C3) NÃO afrouxada | ✅ rede de **2 → 4** metades (RD4-03: dizia 3), `IS DISTINCT FROM` preservado, nenhuma checagem removida |
| Contador do `p45_motor_exclusao_smoke` | ✅ **24** — inalterado (as checagens entraram no bloco existente) |
| RESUMO (z) do `p46_purga_smoke` 11 → 16 | ✅ **16** incrementos, `v_esperado = 16` (RD4-03: dizia 13) |
| Extração do md5 sem contaminação de comentário | ✅ head `\nDECLARE\n` · tail `END;\n` |
| Cabeçalhos **sem** a instrução obsoleta de reparo de `version` | ✅ os dois dizem explicitamente que ela não existe mais e por quê |
| Zero objeto novo de catálogo · zero portão a emendar | ✅ só 2 `CREATE OR REPLACE FUNCTION` |
| `npm run lint` | ✅ **96 erros — baseline congelado**, nos três commits |
| Zero `--no-verify` | ✅ |
| Zero arquivo apagado | ✅ `git diff --diff-filter=D` vazio |
| `20260823000008_p46_guard_plano.sql` existe | ✅ |
| Corpo do plano copiado do ARQUIVO e conferido por md5 ANTES de editar | ✅ `97634d07…` / 21 349 — bate o pin **e** o vivo |
| Metade (a) do plano verbatim | ✅ **1** ocorrência da mensagem original |
| O ramo do plano entra nas DUAS metades | ✅ `v_por_purga` em SQL: **4** (declare + INTO + guarda (a) + guarda (b)) |
| O ramo do plano exige o ALVO | ✅ `i.candidato_id = p_candidato_id`, aferido por (C3/iv) e por (p.2) |
| ACL do plano intocado e nomeando `anon` | ✅ `FROM PUBLIC, anon, authenticated` **1** · `TO service_role` **1** |
| ⊖ Zero `modo IN (...)` compartilhado nas **três** migrations | ✅ **0 / 0 / 0** |
| ⊖ Zero negação por conjunto em SQL puro nas **três** | ✅ **0 / 0 / 0** |
| ⊖ Zero `vault` e zero `net.http_post` em SQL puro nas **três** | ✅ **0 / 0** |
| Pin do plano mudou, 32 hex, antigos preservados | ✅ `42f916d81cd274b28044a410ae57a237`, 27 392 octetos |
| (C3) de 2 → **4** metades, nenhuma removida | ✅ (iii) motor + (iv) plano, mais as checagens de LIGACAO do ME-04 |
| (p) com 3 casos + ⊖ zero PII no jsonb | ✅ |
| RESUMO (z) do `p46_purga_smoke` 11 → **16** | ✅ **16** incrementos, `v_esperado = 16` |
| ⭐ (o.7) — a metade DESTRUTIVA provada capaz de AUTORIZAR | ✅ o par de (o.6); sem ele `v_purga_live = TRUE` não era provado em lugar nenhum |
| Reconciliação preserva desfecho carimbado · infere Postgres · `desconhecido` em Storage/Auth | ✅ RD2-01 |
| Reconciliação guardada por `modo <> off`, **antes de (b)** | ✅ RD2-05 + **RD3-02** — `off` só escreve heartbeat, e o kill switch é respeitado por guard EXPLÍCITO, nunca por posição. ⚠ **RD4-04:** esta célula dizia "roda **depois** do kill switch", verdade até `c27abe7` e falsa desde então — a gêmea exata do comentário órfão que `e223e23` consertou em `…007:243`, deixada de pé no documento |
| As TRÊS janelas medidas pelo VALOR | ✅ **`1 hour`** nos três corpos, aferido por (C3/janela) |
| `iniciada_em` na lista de colunas do bloco que aborta | ✅ RD2-04 |
| RD2-03 registrado onde o 46-06 vai ler | ✅ topo do `46-06-PLAN.md`, com critério mensurável |
| ⭐ (C2) conferida contra os dois ramos novos | ✅ usa `gen_random_uuid()` sem item de ledger — **continua mordendo em 10**, sem emenda |
| ⛔ **Nada aplicado em PROD** | ✅ **por desenho** — o apply é do orquestrador, Task 4 |
| Ordem de apply | ✅ **`006 → 008 → 009 → 007`** nos quatro cabeçalhos (a `009` precede a `007` porque a reconciliação escreve `desconhecido`) |
| ⛔ **B-02: levantado como Rule 4, aprovado, e FECHADO** | ✅ Saída A + varredura que prova que não há B-03 |

## Self-Check: PASSED

- `supabase/migrations/20260823000006_p46_guard_purga.sql` — FOUND
- `supabase/migrations/20260823000007_p46_sweep_dry_run.sql` — FOUND
- `supabase/migrations/20260823000008_p46_guard_plano.sql` — FOUND
- `supabase/tests/p46_purga_smoke.sql` — FOUND (modificado)
- `supabase/tests/p45_motor_exclusao_smoke.sql` — FOUND (modificado)
- `.planning/phases/46-purga-autom-tica-dry-run-live/46-04-SUMMARY.md` — FOUND

Commits `82e4b2e`, `9a7744a`, `7c3b4f4` e `0a8e22b` — FOUND em `git log`.

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

**E a correção só é uma correção porque a cadeia foi varrida INTEIRA.** Consertar
`plano_exclusao_titular` porque ela foi a que apareceu seria consertar um nível; a varredura que
mostra que `anonimizar_candidato → plano_exclusao_titular` é o **único** par com guard de sessão, e
que a segunda não chama mais nada guardado, é o que transforma "o defeito que vimos" em "o defeito
que existe". Sem ela, a Saída A seria uma aposta de que não há um terceiro nível.

**A segunda lição é sobre seguir uma regra até ela produzir o defeito que ela previne.** A obrigação
de "duas metades fisicamente distintas" é certa em `anonimizar_candidato` e **errada** em
`plano_exclusao_titular`: lá existem dois caminhos, aqui existe um. Escrever a segunda metade numa
função `STABLE` produziria um ramo que é subconjunto estrito do primeiro — **código morto dentro de
um guard**, que é literalmente o P39/CR-02 que a regra existe para evitar. Uma regra de segurança
copiada sem o modelo de ameaça que a justifica vira cerimônia, e cerimônia num guard é pior que
ausência: o próximo leitor gasta o tempo dele procurando a restrição que aquele ramo aparenta impor.

**E o que fez o defeito aparecer neste plano, e não em produção às três da manhã, foi uma escolha
de higiene que parece pequena:** o smoke **nunca carimba `request.jwt.claims`**. Se ele rodasse sob
claims de administrador, as duas funções teriam autorizado por PAPEL, as asserções (b) e (o)
ficariam **verdes**, e o cron — que não tem papel nenhum — falharia calado no primeiro dia de
`dry_run`. Um teste que roda com mais privilégio que o chamador real é um teste que mede outra
coisa.
