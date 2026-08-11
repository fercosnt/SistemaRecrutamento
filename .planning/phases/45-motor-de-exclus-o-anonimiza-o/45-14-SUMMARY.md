---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 14
subsystem: database
tags: [supabase, postgres, plpgsql, security-definer, edge-functions, deno, storage, lgpd, null-safety]

requires:
  - phase: 45-13
    provides: "o fechamento dos 6 blockers do `45-REVIEW.md` — a metade (c), a enumeração de bloqueadores, a filtragem de prefixo do WR-03 e os md5 pinados que este plano invalida"
  - phase: 45-REVIEW-2
    provides: "o veredito REPROVADO da segunda rodada: 3 BLOCKERS (BL-01, BL-02, BL-03) e 7 WARNINGs, com a condição de reabertura escrita item a item"
provides:
  - "`anonimizar_candidato` normaliza a INTENÇÃO uma única vez, no `DECLARE`, para o lado SEGURO — `v_dry_run := coalesce(p_dry_run, true)`, e o corpo inteiro lê `v_dry_run` (BL-01)"
  - "caso (vi.d) na auto-verificação de `20260805000006` e asserção `(C8)` no smoke: `p_dry_run := NULL` sobre linha REAL tem de terminar em `P45DR` com a linha intacta"
  - "`plano_exclusao_titular` enumera os quatro pares de AUTORIA com o MESMO escopo da severação, em vez de subtraí-los inteiros (BL-02)"
  - "caso (vii) na auto-verificação de `20260805000006`: o escopo do probe medido nas DUAS direções, com base zero anti-vacuidade"
  - "G13 restaurado — a falha fechada estrutural volta a medir os ponteiros CRUS, antes da filtragem de prefixo, mais a recusa quando TODOS os ponteiros caem fora do prefixo (BL-03)"
  - "testes `(v2)` e `(v3)` no `index.test.ts`, os dois RED antes do fix"
  - "`md5(prosrc)` recomputado das duas funções do motor — ESTE documento substitui o `45-13-SUMMARY.md` como referência do 45-11"
affects: [45-11, portao-destrutivo, code-review-bloqueante]

actuals:
  tokens: 13495
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "intenção destrutiva normalizada UMA vez, no ponto mais alto do corpo, e sempre para o lado que não persiste: um booleano de três valores não pode decidir três ramos independentes"
    - "probe de bloqueador com o MESMO escopo da severação que ele desconta — subtrair um par inteiro que é severado por linha produz falso-negativo silencioso"
    - "guard de falha fechada estrutural mede a entrada CRUA, antes de qualquer filtro: filtrar primeiro desarma exatamente o caso mais suspeito"
    - "asserção que exige fixture mora onde as fixtures já vivem, com o cross-reference escrito nos dois arquivos, em vez de quebrar a declaração de read-only de uma migration"

key-files:
  created:
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-14-SUMMARY.md
  modified:
    - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql
    - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
    - supabase/functions/executar-direito-titular/index.ts
    - supabase/functions/executar-direito-titular/index.test.ts
    - supabase/tests/p45_motor_exclusao_smoke.sql

key-decisions:
  - "BL-01 fechado por NORMALIZAÇÃO ÚNICA para o lado seguro (`coalesce(p_dry_run, true)` no `DECLARE`), e NÃO por três `coalesce` nos três sítios nem por recusa explícita de NULL: três patches independentes é como um quarto sítio nasce sem o seu, e destruir sobre intenção não declarada é o desfecho que o portão existe para impedir"
  - "BL-02 fechado ESTREITANDO a enumeração (probe com o escopo da severação), e não ALARGANDO a severação para o `user_id` inteiro: alargar faria linhas de OUTRAS pessoas perderem o registro de autoria por causa do pedido de um terceiro"
  - "A prova com fixture do BL-02 mora na auto-verificação de `20260805000006` (caso (vii)) e não na de `20260805000005`, porque aquele arquivo declara escopo negativo READ-ONLY e as duas migrations sobem no MESMO apply — desvio consciente da letra da condição de reabertura nº 2, com cross-reference escrito nos dois arquivos"
  - "BL-03 ganhou uma recusa a mais que o G13 original: descartar TODOS os ponteiros pelo prefixo passa a PARAR o motor. Descarte pontual continua sendo achado registrado"
  - "Os 7 WARNINGs do `45-REVIEW-2.md` NÃO foram tocados: o escopo deste plano são os 3 blockers, e WR-A/WR-C/WR-E seguem nomeados como o que o review pede antes da execução real da Task 3 do 45-11"

patterns-established:
  - "Asserção NULL só é prova sobre alvo REAL: contra uuid inexistente, a versão defeituosa e a corrigida produzem o mesmo `P0002`. O alvo sintético que a (C7) usa por segurança é exatamente o que impede a (C7) de pegar o BL-01"
  - "Discriminação por SQLSTATE com terceira via nomeada: na (C8), `42501` não é PASS nem regressão de segurança — é mudança de contrato, e a mensagem diz onde ela tem de ser registrada"

requirements-completed: []

coverage:
  - id: D1
    description: "BL-01 — `p_dry_run := NULL` deixa de pular o ramo de papel, o guard de intenção e o terminador do dry-run de uma só vez"
    verification:
      - kind: integration
        ref: "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql#(vi.d) — chamada com NULL sob claims de administrador tem de dar P45DR com a linha intacta"
        status: unknown
      - kind: integration
        ref: "supabase/tests/p45_motor_exclusao_smoke.sql#(C8)"
        status: unknown
    human_judgment: true
    rationale: "As duas asserções são PL/pgSQL e só executam contra o Postgres de PROD, no apply/smoke do 45-11 — nada foi aplicado neste plano. O verificador é o portão destrutivo, não este documento"
  - id: D2
    description: "BL-02 — `bloqueadores_deleteuser` deixa de voltar `[]` com um bloqueador de autoria de pé em linha de outro candidato"
    verification:
      - kind: integration
        ref: "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql#(vii) — as duas direções do escopo, com base zero"
        status: unknown
    human_judgment: true
    rationale: "Mesma razão da D1: a asserção roda no apply da `20260805000006`, que acontece no 45-11"
  - id: D3
    description: "BL-03 — G13 restaurado: ponteiros vivos com enumeração vazia param o motor mesmo quando todos caem fora do prefixo"
    requirement: "ERASE-03"
    verification:
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(v2) ponteiros vivos TODOS fora do prefixo + list() vazio → o motor PARA, sem carimbo"
        status: pass
      - kind: unit
        ref: "supabase/functions/executar-direito-titular/index.test.ts#(v3) descartar TODOS os ponteiros não é achado silencioso: para mesmo com list() cheio"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-08-11
status: complete
---

# Phase 45 Plan 14: Os TRÊS blockers do segundo code review — Summary

**A intenção destrutiva deixou de ser um booleano de três valores, a enumeração de bloqueadores passou a perguntar com o escopo da severação, e a falha fechada estrutural do Storage voltou a medir os ponteiros crus — os três com asserção que falha antes do fix.**

⚠ **Zero apply, zero deploy, zero contato com PROD.** As sete migrations `20260805000003` …
`20260805000009` continuam **NÃO aplicadas**; PROD tem apenas as duas migrations tracer. Quem
aplica é o **45-11**, e o portão dele reabre com um **code review novo** — nunca com a
autodeclaração deste plano.

---

## ⚠⚠ HANDOFF Nº 1 PARA O 45-11 — os `md5(prosrc)` mudaram OUTRA VEZ

O corpo das duas funções do motor mudou. A asserção **C3** do smoke compara o md5 vivo contra um
pin, e uma divergência é **parada imediata** no 45-11 — deixar a referência velha de pé
transformaria esta edição legítima em incidente.

**A partir daqui, o 45-11 confere `md5(prosrc)` contra ESTES valores. Este documento
SUBSTITUI o `45-13-SUMMARY.md` como referência do portão** (que por sua vez já substituíra o
`45-12-SUMMARY.md` e o `45-07-SUMMARY.md` — os três estão invalidados):

| função | `md5(prosrc)` | octetos |
|---|---|---|
| `public.plano_exclusao_titular(uuid)` | `97634d07ef13447e06741a8c8372fca6` | 21349 |
| `public.anonimizar_candidato(uuid, boolean)` | `8c86e0f040219e7eade47eb587dbf5de` | 34488 |

Valores anteriores, agora **INVÁLIDOS** (`45-13-SUMMARY.md`):
`42237a680e00bb01d7d79d649eb13dbe` (17155) e `3bb0c38181ff91b721bc21f416ebd46b` (31267).

Receita — a mesma do smoke §PROVENIENCIA, corpo entre os dois delimitadores NOMEADOS de cifrão:

```
node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
  D="$"+process.argv[2]+"$", a=f.indexOf(D), b=f.indexOf(D,a+D.length);
  console.log(require("crypto").createHash("md5")
    .update(f.slice(a+D.length,b),"utf8").digest("hex"))' \
  supabase/migrations/20260805000006_p45_anonimizar_candidato.sql \
  anonimizar_candidato
```

Conferido por execução: cada delimitador aparece **exatamente duas vezes** no seu arquivo, e o
corpo extraído começa em `\nDECLARE` e termina em `);\nEND;\n` — a extração não pegou prosa.

## ⚠ HANDOFF Nº 2 — o contador FIXO do smoke subiu de 23 para **24**

`(C8)` é o bloco novo. O cabeçalho (`GATE VERDE`, `AS 24 ASSERCOES`), a lista de asserções e o
`v_esperado` do bloco `(z)` foram bumpados **no mesmo commit**. O número a bater continua sendo o
do cabeçalho do arquivo, nunca um número herdado de um SUMMARY.

## ⚠ HANDOFF Nº 3 — a Task 1 do 45-11 tem de RE-RODAR o review sobre estes arquivos

O `45-REVIEW-2.md` reprovou com 3 blockers. Este plano os fecha **no disco**. Um plano de correção
declarando-se pronto não substitui um review; só um review novo substitui um veredito de review.

---

## Performance

- **Duração:** ~40 min
- **Tasks:** 3 (uma por blocker)
- **Commits:** 3 (+ 1 de metadados)
- **Arquivos modificados:** 5

## Accomplishments

### BL-01 · `p_dry_run := NULL` pulava os três `IF` de uma vez — e a transação COMMITAVA

O parâmetro é `boolean DEFAULT true`, e o `DEFAULT` **não protege contra `NULL` explícito** — o
PostgREST converte um `null` JSON no argumento nomeado. Com o parâmetro cru, os três pontos que o
corpo consultava avaliavam NULL e **nenhum `IF` era tomado**: a chamada caía no ramo DESTRUTIVO da
metade (b), o guard de INTENÇÃO da metade (c) **não rodava**, e o terminador `P45DR` **não
disparava** — a transação persistia. Uma chamada de navegador destruía a PII do titular sem pedido
em `solicitacoes_dados`, fora da janela do ERASE-06, sem recibo e sem trilha; e pior que antes do
45-13, porque sem o pedido o reencontro do CR-03 não acha nada e o currículo fica órfão no bucket
para sempre.

**Fechado por normalização ÚNICA, no `DECLARE`, para o lado SEGURO:**

```sql
v_dry_run    boolean := coalesce(p_dry_run, true);
```

e o corpo inteiro passa a ler `v_dry_run` — **o parâmetro cru não é consultado em lugar nenhum**
(conferido por extração do corpo: a única ocorrência de `p_dry_run` fora de prosa é a própria
linha acima). Por que NULL resolve para seguro e não para uma recusa: destruir sobre uma intenção
**não declarada** é exatamente o desfecho que o portão inteiro desta fase existe para impedir, e
`true` não persiste nada — o chamador recebe `P45DR`, que é alto, distinguível e já carrega a
instrução de dizer `false` explicitamente.

**E a prova, que não existia:** nem a `(C7)` nem o bloco `DO` exercitavam NULL — os dois chamavam
com `false` **literal**, e foi por isso que o defeito passou pelas duas suítes. Agora:
- `(vi.d)` na auto-verificação da `20260805000006`;
- `(C8)` no smoke, com fixture **real** (auth.users + candidatos, revertidos pela subtransação).

⚠ A `(C8)` **precisa** de fixture, e a razão é mecânica: contra o uuid inexistente que a `(C7)` usa
por segurança, a versão defeituosa e a corrigida produzem o **mesmo** `P0002`. O alvo sintético não
discrimina — é precisamente o que impedia a `(C7)` de alcançar este defeito.

### BL-02 · `v_severadas` subtraía quatro pares que o tombstone severa em escopo MENOR

`candidatos.created_by/updated_by` e `candidaturas.created_by/updated_by` eram subtraídos
**inteiros** da enumeração, mas o tombstone os severa apenas nas linhas **deste** candidato
(`WHERE c.id = p_candidato_id` / `WHERE c.candidato_id = p_candidato_id`). Uma linha de **outro**
candidato com autoria deste `user_id` não era severada **e não era enumerada**:
`bloqueadores_deleteuser` voltava `[]` com um bloqueador REAL de pé, a Edge Function não recusava,
o passo 1 destruía o currículo e o `deleteUser` do passo 3 falhava com 23503 — repetidamente, com
o e-mail do titular vivo em `auth.users` para sempre e o recibo nunca enviado.

**Fechado ESTREITANDO a enumeração, nunca alargando a severação.** A lista passou a conter apenas
os pares severados para o `user_id` inteiro; os quatro de autoria saíram dela e passaram a ser
enumerados com o **mesmo recorte** da severação:

```sql
--   candidatos:   ... WHERE t.<col> = $1 AND t.id           IS DISTINCT FROM $2
--   candidaturas: ... WHERE t.<col> = $1 AND t.candidato_id IS DISTINCT FROM $2
```

`IS DISTINCT FROM` e nunca `<>`, pelo motivo de sempre: com `$2` nulo o `<>` avaliaria NULL, a
linha sairia e o bloqueador sumiria — falha ABERTA. A alternativa que o review oferecia (alargar a
severação para o `user_id` inteiro) foi **recusada**: ela faria linhas de OUTRAS pessoas perderem o
registro de autoria por causa do pedido de um terceiro.

**A prova (caso (vii)) mede as DUAS direções**, com base zero antes delas como guard
anti-vacuidade: autoria na PRÓPRIA linha do titular **não** bloqueia (o tombstone severa); autoria
na linha de OUTRO candidato **bloqueia**. Sem a primeira, uma enumeração sempre-vermelha passaria;
sem a segunda, a subtração inteira passaria — que é exatamente o que a asserção antiga
("pelo menos um titular vem vazio") permitiu.

### BL-03 · A filtragem de prefixo do WR-03 tinha desarmado o G13

O guard media a lista **já filtrada**, então o caso mais suspeito de todos — ponteiros vivos que
não casam o prefixo do titular — produzia `doBanco = 0`, o guard não disparava, o passo 1 carimbava
`storage_concluido_em` com zero objeto removido e o recibo declarava o currículo apagado, com os
arquivos ainda no bucket e sem nenhuma linha (nem conta do Auth) capaz de reencontrá-los.

A ordem foi invertida: o guard volta a medir `ponteiros` **crus**, antes da filtragem. E ganhou o
irmão que o review pediu: **descartar TODOS os ponteiros pelo prefixo passa a parar o motor**
(`todos_os_ponteiros_fora_do_prefixo`) — descarte pontual continua sendo achado registrado, porque
uma linha estranha é um fato sobre o sistema e parar por causa dela negaria ao titular o direito que
ele exerceu; descarte integral é a afirmação de que a convenção de caminho desta conta não é a que o
código conhece, e nesse estado o motor não sabe o que apagar.

**RED provado por execução:** com o `index.ts` revertido ao estado do 45-13, `(v2)` e `(v3)` falham
(`76 passed | 2 failed`); com o fix, `78 passed | 0 failed`.

## Task Commits

1. **BL-03 — G13 restaurado + testes (v2)/(v3)** — `c1a74c6` (fix)
2. **BL-02 — enumeração com o escopo da severação** — `ac0185d` (fix)
3. **BL-01 — normalização única de `p_dry_run` + (vi.d) + (C8) + contador 23→24, mais a prova (vii) do BL-02** — `0ed00a3` (fix)

⚠ **Por que os commits 2 e 3 dividem o BL-02:** o mecanismo mora na `20260805000005` e a prova com
fixture mora na `20260805000006`, que é o mesmo arquivo do BL-01. A divisão escolhida deixa cada
commit **autoconsistente**: o commit 2 (mecanismo) passa sozinho; o commit 3 traz a asserção que
só é verdadeira depois dele. A ordem inversa produziria um commit intermediário quebrado.

## Files Created/Modified

- `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql` — `v_severadas` reduzida aos pares
  severados por `user_id` inteiro; `v_esc_candidatos`/`v_esc_candidaturas` e o probe escopado no
  laço; `COMMENT` e o `jsonb` atualizados, com o apontamento para onde a prova mora.
- `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql` — `v_dry_run` no `DECLARE` e as
  quatro leituras convertidas; casos `(vi.d)` e `(vii)` na auto-verificação; bloco (8) do cabeçalho,
  `COMMENT` e o `NOTICE` final atualizados.
- `supabase/functions/executar-direito-titular/index.ts` — G13 antes da filtragem + a recusa por
  descarte integral de ponteiros.
- `supabase/functions/executar-direito-titular/index.test.ts` — `(v2)` e `(v3)`.
- `supabase/tests/p45_motor_exclusao_smoke.sql` — `(C8)`; cabeçalho, lista de asserções e `(z)`
  bumpados de 23 para 24.

## Decisions Made

Ver `key-decisions` no frontmatter. As duas que mais importam para quem revisar:

1. **NULL resolve para SEGURO, não para recusa.** A `(C8)` trata `42501` como FAIL **com mensagem
   própria**, dizendo que aquilo não é regressão de segurança e sim mudança de contrato — e onde ela
   teria de estar registrada. O objetivo é que a próxima pessoa que "endureça" isso não descubra
   pelo vermelho sem explicação.
2. **A prova com fixture do BL-02 mora na `20260805000006`.** A condição de reabertura nº 2 do
   review pede a asserção "em `000005`". A `20260805000005` declara, no seu bloco de escopo
   negativo, que é **inteiramente read-only** — e diz, com todas as letras, que criar fixture ali
   quebraria essa declaração. As duas migrations sobem no mesmo apply, a `000006` já tem as três
   fixtures e o envelope de subtransação, e a `000006` é o arquivo que **owns** o escopo da
   severação que o probe desconta. O cross-reference está escrito nos dois arquivos (no corpo, no
   `COMMENT` e no cabeçalho do bloco `DO`), para que a prova não fique procurável só por sorte.
   **Registrado aqui como desvio consciente da letra do review, não como item fechado em silêncio.**

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Recusa nova por descarte integral de ponteiros**

- **Encontrado durante:** BL-03
- **Issue:** restaurar o G13 sobre os ponteiros crus fecha o caso "enumeração vazia", mas não o caso
  "enumeração cheia e nenhum ponteiro casando o prefixo" — que tem o mesmo desfecho (carimbo com
  zero objeto do banco e recibo mentindo).
- **Fix:** `todos_os_ponteiros_fora_do_prefixo`, exatamente como o review propõe.
- **Verificação:** teste `(v3)`.
- **Commit:** `c1a74c6`.

**2. [Rule 4 - decisão registrada, não arquitetural] Localização da prova do BL-02**

Descrito acima em "Decisions Made". Não altera mecanismo nenhum — só onde a asserção vive.

---

**Total de desvios:** 1 auto-fix (Rule 2) + 1 decisão de localização registrada.
**Impacto:** nenhum scope creep. Os 7 WARNINGs do review continuam abertos e nomeados.

## Issues Encountered

- **Não há Postgres local** (`psql`, `docker` ausentes) — as asserções PL/pgSQL novas
  (`(vi.d)`, `(vii)`, `(C8)`) **não puderam ser executadas** neste plano, apenas escritas. É a mesma
  condição de todos os planos de autoria desta fase, e é o 45-11 que as executa. Conferências
  estáticas feitas no lugar: delimitadores de cifrão aparecem exatamente 2× por arquivo; o corpo
  extraído começa em `\nDECLARE` e termina em `);\nEND;\n`; zero `NOT IN` como SQL nos dois corpos
  (as 6 ocorrências são prosa explicando por que ele é proibido); aspas simples balanceadas; e o
  número de `%` de cada `RAISE` novo bate o número de argumentos.
- **`deno test supabase/functions/` (o diretório inteiro) falha** por dependência ausente
  (`npm:svix@1.99.1`, da `resend-webhook`) — **pré-existente e fora do escopo**, registrado em
  `deferred-items.md`. O comando de baseline desta fase é
  `deno test supabase/functions/executar-direito-titular/`, e ele sai **78/78**.

## Baselines (todas verdes)

| medida | baseline | agora |
|---|---|---|
| `npm run test:run` | 1892/1892 | **1892/1892** (187 arquivos) |
| `npm run lint` (tsc) | ≤ 97 | **97** (baseline congelada desde a Phase 42) |
| `deno test .../executar-direito-titular/` | ≥ 76 | **78** (+2: `(v2)`, `(v3)`) |
| `check:export-allowlist` · `check:recibo-exclusao` · `check:matriz-retencao` · `check:pii-inventory-md` · `check:resend-dominio` | verdes | **verdes** |
| `--no-verify` nos commits da fase | 0 | **0** (os três commits passaram pelo hook) |
| dependências novas | 0 | **0** |

## Os guards do `45-REVIEW.md` — conferidos após o fix

- **G1 (zero `NOT IN`, `IS DISTINCT FROM` em toda comparação):** intacto **e reforçado** — o probe
  novo usa `IS DISTINCT FROM`, e a doutrina que o BL-01 tinha violado (lógica de três valores
  abrindo um guard) foi restaurada pela normalização.
- **Metade (a) do guard, nas duas funções:** **não tocada** — `git diff` sobre as migrations não tem
  uma única linha alterando `IF v_uid IS NULL`.
- **G4 (faixa etária ANTES da sentinela) e G5 (scrub de `decisao_final_historico` por último):**
  não tocados — nenhuma linha dos `UPDATE` do tombstone foi alterada.
- **G6 (as 3 FKs `NO ACTION`):** zero DDL nova. `git diff` sem `ALTER TABLE` / `DROP CONSTRAINT` /
  `DELETE FROM`.
- **G7 (zero SQL sobre a tabela de objetos do Storage):** zero ocorrência nova.
- **G8 (dry-run no MESMO corpo):** preservado — o terminador continua no fim do mesmo corpo, agora
  lendo o valor normalizado.
- **G10 (erro de `deleteUser` não engolido):** não tocado.
- **G13:** **restaurado** (BL-03).
- **`$c2$` do smoke:** **byte a byte idêntico** — 2676 octetos antes e depois, conferido por
  extração e comparação de string, não por leitura do diff. E continua não-vacuosa: ela chama com
  `true` **literal**, onde a normalização é identidade — nenhuma das dez recusas mudou de significado.
  Os blocos `$c1$`, `$c3$` e `$c456$` também não foram tocados.

## Next Phase Readiness

**O 45-11 pode re-rodar a Task 1.** O que ele precisa conferir, além do escopo que já lista:

1. Os **três** blockers do `45-REVIEW-2.md` contra a § "Condição de reabertura do portão" — com a
   ressalva registrada sobre a localização da prova do BL-02 (item 2 de "Decisions Made").
2. Os **21 guards** do `45-REVIEW.md`, incluindo o G13, que agora volta a morder.
3. Os `md5(prosrc)` contra a tabela **deste** documento — nunca contra o `45-13-SUMMARY.md`.
4. O contador do smoke: **24**, lido do cabeçalho do arquivo.

**O que continua aberto, nomeado e não silencioso:** os 7 WARNINGs do `45-REVIEW-2.md`. O próprio
review diz que eles não bloqueiam o apply, mas que **WR-A, WR-C e WR-E** deveriam fechar antes da
execução real da Task 3 do 45-11 — os três produzem estados terminais **depois** do passo 1, que é
o custo exato que esta fase existe para não pagar.

## Self-Check: PASSED

Conferido por execução, não por memória:

- os 5 arquivos citados existem no disco;
- os 3 commits (`c1a74c6`, `ac0185d`, `0ed00a3`) existem no histórico e nenhum menciona bypass do
  hook;
- os dois `md5(prosrc)` da tabela do handoff nº 1 foram **recomputados pela receita do smoke**
  sobre os arquivos como estão neste commit — não transcritos de lugar nenhum;
- `$c2$` extraído e comparado: 2676 octetos, string idêntica à de `HEAD~3`.

---
*Phase: 45-motor-de-exclus-o-anonimiza-o*
*Completed: 2026-08-11*
