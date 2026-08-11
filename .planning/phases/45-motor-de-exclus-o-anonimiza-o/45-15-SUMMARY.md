---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 15
subsystem: database
tags: [supabase, postgres, plpgsql, security-definer, lgpd, assercoes, catalogo, code-review]

requires:
  - phase: 45-14
    provides: "a `(vii)` com as duas medições sobre `candidatos`, o probe escopado da `20260805000005` e a tabela de `md5(prosrc)` que este documento reconfere"
  - phase: 45-REVIEW-3
    provides: "o veredito APROVADO COM CONDIÇÕES: NW-01 e NW-02 são as DUAS condições antes do apply das sete migrations"
provides:
  - "NW-01 fechado — a `(vii)` ganhou a medição `(c)`: autoria na PRÓPRIA CANDIDATURA do titular NÃO bloqueia, que é a única prova do recorte `t.candidato_id` em toda a fase"
  - "NW-02 fechado — precondição de CATÁLOGO antes da `(vii)`: os QUATRO pares de autoria têm de continuar FK `NO ACTION`/`RESTRICT`, com mensagem que nomeia o que foi medido (o catálogo) e diz explicitamente que NÃO é o defeito do BL-02"
  - "`md5(prosrc)` das duas funções RECOMPUTADO por execução e INALTERADO — este documento é a referência do 45-11"
  - "a divergência de convenção de octetos do `$c2$` (NW-06) resolvida em uma linha, medida nas duas convenções"
affects: [45-11, portao-destrutivo, code-review-bloqueante]

actuals:
  tokens: 9800
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "quando duas tabelas usam colunas de recorte DIFERENTES para o mesmo predicado, cada uma precisa da sua própria medição: a assimetria é onde o erro nasce, e uma asserção que só cobre a simétrica passa com o erro de pé"
    - "asserção que depende de um fato de catálogo verifica esse fato ANTES, com diagnóstico próprio — senão ela falha pelo motivo errado e treina quem lê a desconfiar do bloco inteiro"
    - "uma mensagem de falha nomeia o que foi MEDIDO, não o defeito que se esperava encontrar"

key-files:
  created:
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-15-SUMMARY.md
  modified:
    - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
    - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql

key-decisions:
  - "A precondição do NW-02 mede os QUATRO pares de autoria, e não só os dois `updated_by` que a `(vii)` consulta: os quatro são o que `v_esc_candidatos`/`v_esc_candidaturas` recortam, e um deles fora do regime de bloqueio muda o contrato daquela lista sem que nada mais perceba"
  - "A mensagem da precondição abre dizendo o que foi medido (o CATÁLOGO) e nega explicitamente o BL-02, porque o custo do NW-02 não é a parada — é a parada com a atribuição errada"
  - "A `(c)` vem ANTES da `(b)`, e a razão está escrita no código: a `(b)` suja `candidaturas` com uma linha ALHEIA e o probe é um `EXISTS` sobre a tabela inteira — depois dela a `(c)` mediria ≠ 0 sem defeito nenhum de recorte"
  - "A `20260805000005` foi tocada APENAS no `COMMENT`, que está fora do corpo entre os delimitadores — o cross-reference da doutrina foi escrito sem custar o pin de `md5(prosrc)`"

requirements-completed: []

coverage:
  - id: D1
    description: "NW-01 — o recorte `t.candidato_id` de `candidaturas` fica pinado nas DUAS direções, e não só o `t.id` de `candidatos`"
    verification:
      - kind: integration
        ref: "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql#(vii)(c) — candidatura DO PRÓPRIO titular com updated_by = <uid dele> NÃO pode aparecer em bloqueadores_deleteuser"
        status: unknown
      - kind: integration
        ref: "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql#(vii)(b) — candidatura de OUTRO candidato TEM de aparecer"
        status: unknown
    human_judgment: true
    rationale: "PL/pgSQL. Não há Postgres local (psql/docker ausentes). A asserção só executa no apply da 20260805000006, que acontece no 45-11 — este documento não é o verificador"
  - id: D2
    description: "NW-02 — a `(vii)` deixa de poder abortar o apply culpando um defeito de escopo que não aconteceu"
    verification:
      - kind: integration
        ref: "supabase/migrations/20260805000006_p45_anonimizar_candidato.sql#(vii)/precondicao de catalogo — os 4 pares de autoria conferidos como FK NO ACTION/RESTRICT antes das três medições"
        status: unknown
    human_judgment: true
    rationale: "Mesma razão da D1. E o desfecho que ela evita só é observável numa árvore de catálogo diferente da atual — o que a torna, por construção, inexercitável aqui"
  - id: D3
    description: "O pin de `md5(prosrc)` do 45-11 continua correto depois destas edições"
    verification:
      - kind: manual
        ref: "recomputação por execução da receita do smoke §PROVENIENCIA sobre os dois arquivos, antes e depois — os dois md5 INALTERADOS"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-08-11
status: complete
---

# Phase 45 Plan 15: As DUAS condições do terceiro review — Summary

**A `(vii)` passou a provar o recorte de `candidaturas` (que usa uma coluna diferente da de `candidatos`, e errá-la recusaria toda exclusão legítima), e ganhou a precondição de catálogo sem a qual ela poderia abortar o apply culpando um defeito que não aconteceu — as duas em asserções que nunca foram executadas.**

⚠ **Zero apply, zero deploy, zero contato com PROD.** As sete migrations `20260805000003`
… `20260805000009` continuam **NÃO aplicadas**. Quem aplica é o **45-11**.

---

## ⚠⚠ HANDOFF Nº 1 PARA O 45-11 — os `md5(prosrc)` **NÃO** mudaram, e isto corrige a condição nº 3 do `45-REVIEW-3.md`

A condição nº 3 do review diz: *«Os dois fixes acima mudam o corpo de `20260805000006` — logo
mudam o `md5(prosrc)` de `anonimizar_candidato`.»* **Isso não se confirmou, e a razão é mecânica,
não uma folga:**

`prosrc` é o corpo da FUNÇÃO — o texto entre os dois delimitadores `$anonimizar_candidato$`, que
fecha na **linha 823**. Os dois fixes moram no bloco anônimo de auto-verificação, delimitado por
`$verifica_anonimizar_candidato$`, que começa na linha 867. **Todos os hunks do diff estão em
linha ≥ 863** (conferido por `git diff -U0`), e o `COMMENT ON FUNCTION` também está fora do corpo.
A `(C3)` do smoke compara `md5(p.prosrc)` lido de `pg_proc` — ela não vê nada disto.

**A tabela do portão, RECOMPUTADA por execução da receita do smoke §PROVENIENCIA sobre os arquivos
como estão neste commit — não transcrita:**

| função | `md5(prosrc)` | octetos | mudou neste plano? |
|---|---|---|---|
| `public.plano_exclusao_titular(uuid)` | `97634d07ef13447e06741a8c8372fca6` | 21349 | **não** |
| `public.anonimizar_candidato(uuid, boolean)` | `8c86e0f040219e7eade47eb587dbf5de` | 34488 | **não** |

**Este documento é a referência do 45-11.** Os valores são os mesmos do `45-14-SUMMARY.md` — mas
a referência passa a ser **este** arquivo, porque ele é o que foi medido depois da última edição
das duas migrations. Os `45-13`, `45-12` e `45-07` continuam inválidos, como já estavam.

Prova de que a extração não pegou prosa: cada delimitador aparece **exatamente 2×** no seu
arquivo, e o corpo extraído começa em `\nDECLARE\n` e termina em ` );\nEND;\n` nos dois casos.

## ⚠ HANDOFF Nº 2 — o contador FIXO do smoke continua **24**

`supabase/tests/p45_motor_exclusao_smoke.sql` **não foi tocado** (`git status` limpo para ele). As
duas asserções novas moram na auto-verificação de uma migration, não no smoke: o cabeçalho, a lista
e o `v_esperado` do bloco `(z)` continuam coerentes em 24. O número a bater continua sendo o do
cabeçalho do arquivo, nunca um herdado de um SUMMARY.

## ⚠ HANDOFF Nº 3 — a nota de octetos do `$c2$` (NW-06 do review), medida nas duas convenções

O `45-14-SUMMARY.md` afirma «2676 octetos» e a receita dos `md5` produz 2668. A diferença é
exatamente `len("$c2$") × 2 = 8`: o SUMMARY mediu **incluindo** os dois delimitadores, a receita
os **exclui**. Registro aqui para que quem conferir no portão não leia 8 octetos de divergência
como «alguém editou a `(C2)`»:

> **`$c2$` = 2676 octetos INCLUINDO os dois delimitadores; 2668 pelo recorte da receita do
> §PROVENIENCIA, que os exclui. `md5` do corpo sem delimitadores: `b82ce8a4b7e11b20d94df3e13f0238d6`.**

E a afirmação substantiva continua verdadeira, reconferida por extração e comparação de string
contra `HEAD`: **o `$c2$` é byte a byte idêntico** (2668 = 2668, strings iguais).

---

## Accomplishments

### NW-01 · a `(vii)` provava `t.id` e nunca `t.candidato_id` — o par cujo erro recusaria TODA exclusão legítima

As duas tabelas usam colunas de recorte **diferentes** no probe de `plano_exclusao_titular`:
`t.id IS DISTINCT FROM $2` para `candidatos`, `t.candidato_id IS DISTINCT FROM $2` para
`candidaturas`. Só a primeira tinha prova. E a assimetria é exatamente onde o erro nasce: escrever
`t.id` também para `candidaturas` compara o id da **candidatura** com o id do **candidato**, que
nunca são iguais — o probe nunca excluiria nada.

**As três asserções da fase passariam com esse recorte errado**, e conferi as três uma a uma:
a `(vii)(a)` não olha `candidaturas`; a `(vii)(b)` usa `v_candtr`, que pertence a **outro**
candidato; e a asserção de `20260805000005` («pelo menos um titular vivo vem com a lista vazia»)
passa porque a SONDA 6 §6a mediu **zero linha** nessas quatro colunas em PROD.

O efeito só apareceria no primeiro pedido real — e apareceria em **todos**: quem se candidata por
si mesmo escreve a própria autoria na própria `candidaturas`. `bloqueadores_deleteuser` viria
não-vazia, a Edge Function recusaria em `index.ts:1077`, e **nenhuma exclusão jamais completaria**.
É o falso-**positivo** que o comentário de `20260805000005` diz existir para evitar, no único par
que ele não media — o espelho exato do falso-negativo do BL-02.

**Fix:** um bloco `(c)` na `(vii)`, com base zero própria para `candidaturas`, uma candidatura do
**próprio** `v_cand_b` (`status = 'rejeitado'`, survivor-guard dos dois `AFTER INSERT` com
`net.http_post`, pela mesma razão já escrita na fixture de `v_candtr`), e a exigência de que ela
**não** apareça entre os bloqueadores.

⚠ **A `(c)` vem ANTES da `(b)`, e a razão está escrita no código:** a `(b)` marca `v_candtr` — uma
candidatura de **outro** candidato — com o mesmo `v_user_b`, e o probe é um `EXISTS` sobre a tabela
inteira. Depois dela, o bloqueador de `candidaturas` aparece por causa da linha alheia, e a `(c)`
mediria ≠ 0 sem que o recorte tivesse defeito nenhum.

**Como ela discrimina:** com `t.candidato_id` (o código de hoje, que está certo) a `(c)` mede 0 e
a `(b)` mede ≠ 0. Com `t.id` escrito para `candidaturas`, a `(c)` mede 1 e **morde na primeira
linha**, com a mensagem dizendo por que os dois ids nunca são iguais.

### NW-02 · a `(vii)(b)` acoplava o sucesso do apply a um fato de catálogo que ela não verificava

`(vii)(b)` exige `v_bl_alh <> 0 AND v_bl_cand <> 0`. Mas o probe só enumera FKs para `auth.users`
com `confdeltype IN ('a','r')`. Se um par de autoria estivesse como `SET NULL`/`CASCADE`/
`SET DEFAULT` no catálogo vivo **no dia do apply**, a chave não aparece, a `(a)` e a `(c)` passam
por **vacuidade** e a `(b)` dispara com a mensagem do BL-02 — descrevendo um falso-negativo de
escopo que **não aconteceu**. O apply de `20260805000006` para, e quem investigar procura um
defeito de recorte inexistente.

**Fix:** uma precondição de catálogo antes das três medições, que mede o que realmente importa e
diz que foi isso que mediu. Duas escolhas dentro do fix, as duas registradas:

1. **Os QUATRO pares, não os dois `updated_by` que a `(vii)` consulta.** Os quatro são o que
   `v_esc_candidatos`/`v_esc_candidaturas` recortam em `20260805000005`; um deles fora do regime de
   bloqueio muda o contrato daquela lista sem que nada mais perceba. A mensagem nomeia, por
   `string_agg`, **exatamente quais** saíram do regime.
2. **A mensagem abre dizendo o que foi medido e nega o BL-02 com todas as letras** — «o que foi
   medido AQUI é o CATÁLOGO, não o recorte do probe […] ISTO NÃO É O DEFEITO DO BL-02: o recorte da
   enumeração pode estar perfeito e esta asserção ainda assim parar o apply». O custo do NW-02 não
   é a parada; é a parada com a atribuição errada.

A consulta usa a **mesma forma** do laço de enumeração de `20260805000005` (`unnest(c.conkey)
WITH ORDINALITY`, e não `conkey[1]`), com a razão escrita: quem confere a precondição contra o
probe tem de ver a mesma consulta, senão a comparação vira exegese.

### O cross-reference, sem custar o pin

A doutrina desta fase é que a prova seja procurável dos dois lados. Acrescentei o apontamento das
duas correções ao `COMMENT ON FUNCTION` de `plano_exclusao_titular` — que está **fora** do corpo
entre os delimitadores (o corpo fecha na linha 458; o `COMMENT` começa depois). Por isso o
`md5(prosrc)` de `plano_exclusao_titular` também ficou inalterado.

## Task Commits

1. **NW-01 + NW-02 + o cross-reference + este SUMMARY** — commit único.

⚠ **Por que um commit só, e não três:** a instrução do review é que a tabela de `md5(prosrc)` seja
recomputada **no mesmo commit** das edições, porque um pin defasado vira parada imediata e falsa no
portão. Um commit intermediário — com a `(c)` escrita e o SUMMARY do portão ainda apontando para o
documento anterior — seria exatamente o estado que a condição nº 3 existe para não deixar existir.
Os dois fixes também são interdependentes por leitura: a precondição do NW-02 existe para proteger
as **três** medições, inclusive a que o NW-01 acrescenta.

## Files Created/Modified

- `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql` — no bloco
  `$verifica_anonimizar_candidato$` (nunca no corpo da função): três variáveis novas
  (`v_bl_prop_c`, `v_bl_base_c`, `v_fk_falt`), a precondição de catálogo dos quatro pares, o bloco
  `(c)` entre a `(a)` e a `(b)`, o cabeçalho da `(vii)`, o preâmbulo do bloco de auto-verificação e
  o `NOTICE` final.
- `supabase/migrations/20260805000005_p45_plano_e_dry_run.sql` — **apenas o `COMMENT ON FUNCTION`**
  (fora do corpo): o cross-reference para a `(vii)(c)` e para a precondição.

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Base zero própria para `candidaturas`**

- **Encontrado durante:** NW-01.
- **Issue:** a `(vii)` tinha base zero só para `candidatos.updated_by`. A medição `(c)` é uma
  asserção de **ausência** (`= 0`); sem base própria, um estado pré-existente em `candidaturas`
  faria a `(c)` reprovar por algo que a fixture não criou — o mesmo «falha pelo motivo errado» que
  o NW-02 ataca, na asserção que fecha o NW-01.
- **Fix:** `v_bl_base_c`, medida antes do `INSERT`, com mensagem própria.
- **Verificação:** roda no apply, junto com o resto do bloco.

**2. [Rule 2 - Missing Critical] Cross-reference no `COMMENT` de `20260805000005`**

Fora da letra do review, dentro da doutrina do 45-14 («o cross-reference escrito nos dois
arquivos»). Escolhido o `COMMENT` por ser o único sítio daquele arquivo que serve à doutrina **sem**
mudar `prosrc`.

**Total de desvios:** 2 auto-fix (Rule 2). Zero scope creep: NW-03, NW-04 e NW-05 **não** foram
tocados — o review diz que não bloqueiam nada, e os 7 WARNINGs do round 2 continuam abertos em
`deferred-items.md` (`DI-45-14-02`), com **WR-A** e **WR-E** ainda de pé como condição da execução
REAL da Task 3.

## Issues Encountered

- **As duas asserções novas estão ESCRITAS E NÃO EXECUTADAS.** Não há Postgres local (`psql` e
  `docker` ausentes) — é a mesma condição de todos os planos de autoria desta fase. **A primeira
  vez que elas rodam é o apply de `20260805000006` no 45-11**, e é ali que uma falha delas significa
  o gate funcionando. O que reduzi neste plano é a chance de essa falha vir pelo motivo errado.
- A `(vii)/precondição` é, por construção, **inexercitável aqui**: o desfecho que ela evita só é
  observável numa árvore de catálogo diferente da atual, e a SONDA 4c mediu os quatro pares como
  `NO ACTION` em 2026-08-05.

## Conferências estáticas — o que foi de fato EXECUTADO no lugar

| verificação | resultado |
|---|---|
| `md5(prosrc)` das duas funções, receita do smoke §PROVENIENCIA, antes e depois | **INALTERADOS** (`97634d07…`/21349 e `8c86e0f0…`/34488); delimitadores 2× por arquivo; corpo de `\nDECLARE\n` a ` );\nEND;\n` |
| escopo do diff em `20260805000006` | todos os hunks em **linha ≥ 863**; o corpo da função fecha em **823** |
| aridade de `%` × argumentos em **197 `RAISE`** (os 3 arquivos do motor) | **zero divergência** |
| aspas simples fora de comentário, por varredura léxica | **balanceadas** nos 3 arquivos; estado final fora de string |
| `$c2$` do smoke extraído e comparado com `HEAD` | **byte a byte idêntico** (2668 octetos pela receita; 2676 com delimitadores) |
| `NOT IN` como SQL nos dois corpos | **zero** — as 8 ocorrências em `000006` e as 4 em `000005` são prosa proibindo-o, e nenhuma é nova |
| DDL nova / `ALTER TABLE` / `DROP CONSTRAINT` / `DELETE FROM` / `storage.objects` no diff | **zero** |
| `v_uid IS NULL` (metade (a) do guard) no diff | **zero linhas** — não tocada |
| smoke tocado? | **não** — contador FIXO segue 24 |

## Baselines (todas verdes)

| medida | baseline | agora |
|---|---|---|
| `npm run test:run` | 1892/1892 | **1892/1892** (187 arquivos) |
| `npm run lint` (tsc) | ≤ 97 | **97** |
| `deno test .../executar-direito-titular/` | ≥ 78 | **78/78** |
| `check:export-allowlist` · `check:recibo-exclusao` · `check:matriz-retencao` · `check:pii-inventory-md` · `check:resend-dominio` | verdes | **verdes** |
| `--no-verify` nos commits da fase | 0 | **0** |
| dependências novas | 0 | **0** |

## Os 21 guards — o que o diff prova

Nenhum foi tocado, e a prova mais forte é estrutural: **o corpo das duas funções não mudou** (os
dois `md5(prosrc)` inalterados, por recomputação). Todos os 21 guards descrevem propriedades do
corpo das funções, da Edge Function ou do schema — e nada disso está no diff. Especificamente:

- **G1** (`IS DISTINCT FROM`, zero `NOT IN`): o SQL novo não usa `NOT IN`; as comparações novas são
  `IS NOT NULL` sobre `string_agg` e `<> 0` sobre `count(*)`, que nunca é NULL — a mesma forma das
  medições `(a)` e `(b)` já existentes.
- **metade (a)**, **G4** (faixa antes da sentinela), **G5** (`decisao_final_historico` por último),
  **G6** (as 3 FKs `NO ACTION`), **G7** (zero `DELETE FROM storage.objects`), **G8** (dry-run no
  MESMO corpo), **G10** (erro de `deleteUser` não engolido), **G13**: nenhuma linha no diff.
- **`$c2$`**: byte a byte idêntico, conferido por extração e comparação de string.

## Next Phase Readiness

**O 45-11 pode prosseguir.** As duas condições que o `45-REVIEW-3.md` colocou **antes do apply**
das sete migrations estão fechadas. O que o 45-11 confere:

1. `md5(prosrc)` contra a tabela **deste** documento — que é a mesma do `45-14-SUMMARY.md`, e a
   coincidência é o resultado medido, não um descuido (handoff nº 1).
2. O contador do smoke: **24**, lido do cabeçalho do arquivo.
3. A `(vii)` agora tem **três medições e uma precondição**. Uma falha na precondição **não** é o
   BL-02 — a mensagem diz isso na primeira frase.

**O portão continua NÃO aberto para a execução REAL (não-dry-run) da Task 3** enquanto **WR-A** e
**WR-E** estiverem de pé: os dois produzem estados terminais **depois** do passo 1 — currículo
destruído, PII intacta, sem retomada.

## Self-Check: PASSED

Conferido por execução, não por memória:

- os 2 arquivos modificados e este SUMMARY existem no disco;
- os dois `md5(prosrc)` foram **recomputados pela receita do smoke** sobre os arquivos como estão
  neste commit — e a igualdade com a tabela anterior é uma medição, não uma transcrição;
- `$c2$` extraído de `HEAD` e do disco e comparado como string: idêntico;
- 197 `RAISE` analisados por aridade de `%`: zero divergência;
- suíte 1892/1892, tsc 97, deno 78/78, os cinco `check:*` verdes.

---
*Phase: 45-motor-de-exclus-o-anonimiza-o*
*Completed: 2026-08-11*
