---
fase: 46-purga-automatica-dry-run-live
tipo: re-revisao adversarial dos CONSERTOS da iteracao 2 — passe final do loop
escopo_diff: 56485db..HEAD (9 commits)
revisado_em: 2026-08-23T04:30:00-03:00
profundidade: deep
arquivos_revisados: 6
files_reviewed_list:
  - supabase/migrations/20260823000014_p46_portao_flip_veredito.sql
  - supabase/migrations/20260823000015_p46_config_purga_privilegio.sql
  - supabase/tests/p46_purga_smoke.sql
  - supabase/functions/purgar-retencao/index.ts
  - supabase/functions/purgar-retencao/index.test.ts
  - .planning/phases/46-purga-autom-tica-dry-run-live/46-07-RUNBOOK-FLIP.md
alvo: 46-REVIEW-FIX.md iteracao 2 (BL-R3-01, BL-R3-02, HI-R3-01 … HI-R3-05)
status: issues_found
veredito: >
  ZERO BLOCKERS. Pela primeira vez em tres rodadas, o conserto NAO introduziu
  defeito novo. Os sete achados da iteracao 2 estao fechados, e os quatro que o
  fixer declarou "provados por execucao" eu reproduzi de forma independente
  contra o banco vivo — inclusive rodando o bloco DO da `…0015` sozinho, que
  MORDE hoje com os quinze pares. Restam 8 achados, nenhum bloqueante, nenhum
  capaz de alterar o desfecho do apply.
exige_reverter_prod: false
seguro_aplicar: >
  SIM. As duas migrations sao ADITIVAS e REVERSIVEIS, nao tocam dado, nao tocam
  o cron e nao tocam o modo. Precondicoes: (1) rodar o passo 4 (o smoke) na
  MESMA sessao de trabalho do apply, e nao no dia seguinte — ele e a unica prova
  end-to-end de `(d.3)` e de `(d.8)`/`(d.9)`; (2) conferir o md5 pelos valores
  publicados abaixo, e NAO pela forma herdada; (3) provar `cron.alter_job` num
  momento controlado ANTES de precisar dela. Nenhuma das tres bloqueia o apply.
achados:
  blocker: 0
  high: 2
  medium: 3
  low: 3
  total: 8
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
prod_tocada_por_esta_revisao: false
---

# Phase 46 · Revisao adversarial final — os consertos da iteracao 2

**Escopo:** `56485db..HEAD` (`6d47886`, `afe4f45`, `14b3684`, `85b3462`, `479161d`, `4b591fe`,
`aa24a42`, `85de7c6`, `a415e18`).
**Metodo:** leitura integral das duas migrations, diff mecanico do corpo vivo contra o disco,
**execucao read-only** contra PROD pela via de apply (`node p46apply.cjs sql|run`, exclusivamente
`SELECT` de catalogo, mais dois blocos `DO`/`CREATE FUNCTION pg_temp` que nao mutam nada),
`deno test` local. **PROD nao foi mutada:** nenhuma migration aplicada, nenhuma funcao publicada,
nenhum smoke executado, nenhum `cron.alter_job` acionado.
**Nao reaberto:** rodadas 1–3, nem os MEDIUM/LOW que o fixer declarou fora de escopo (eles sao
citados como *ainda em aberto*, nunca recontados como achados novos).

---

## ⚠ PRIMEIRO — A RESPOSTA DE SEGURANCA, ANTES DE QUALQUER ACHADO

### 1 · Aplicar as duas migrations pode fazer a varredura destruir linha real ou enfileirar `net.http_post`?

**NAO — nos tres estados. E a resposta agora tem medicao nova que as rodadas anteriores nao tinham.**

| Estado | Pode destruir? | Como foi medido nesta sessao |
|---|---|---|
| **Antes do apply** | **Nao** | `config_purga.modo = 'dry_run'`, `atualizado_em = 2026-08-23 02:06:37.866049-03` — T0 intacto. O bloco `(g.5)` (o `net.http_post`) vive inteiro dentro de `IF v_modo = 'live'` |
| **Depois so da `…0014`** | **Nao** | Inventario de statements extraido mecanicamente do arquivo: **um `DO`** (so `SELECT` em `pg_constraint`/`pg_attribute` + `RAISE`), **um `CREATE OR REPLACE FUNCTION`**, **um `REVOKE`**, **um `GRANT`**, **um `COMMENT`**. Zero `INSERT`/`UPDATE`/`DELETE`/`DROP`/`ALTER TABLE`/`cron.*`. E medido: **nenhuma funcao do banco referencia `salvar_config_purga`** (`SELECT … FROM pg_proc WHERE prosrc LIKE '%salvar_config_purga%'` → **`[]`**) — ela e alcancavel so por PostgREST, e nao esta no caminho noturno |
| **Depois das duas** | **Nao** | `…0015` = **um `REVOKE`** de privilegio de tabela, **um `DO`** de catalogo, **um `COMMENT`**. `REVOKE` **so retira** capacidade; e impossivel ele habilitar destruicao |

**A prova de que a `…0015` nao corta nenhum caminho vivo, medida e nao presumida:**

```
as CINCO funcoes que referenciam config_purga:
  anonimizar_candidato · plano_exclusao_titular · reivindicar_item_purga
  salvar_config_purga  · varrer_purga_retencao
  → prosecdef = true e owner = postgres em TODAS as cinco.  REVOKE nao alcanca o DONO.

cron.job jobid 6 → " SELECT public.varrer_purga_retencao(); " · username = postgres · active = true
pg_roles: anon / authenticated / service_role → rolsuper=false, membro_de = <nenhum>
```

A ultima linha e a que fecha o unico buraco que ninguem tinha medido: os tres papeis **nao herdam
de papel nenhum**, entao o `REVOKE` de fato aterrissa e a familia `(i)` da `…0015` **vai passar** —
o apply nao aborta por privilegio residual herdado.

**Diff semantico do corpo de `salvar_config_purga` (`…0013` → `…0014`), comentarios removidos:**
exatamente **dois hunks** — o `SELECT` do passo (6.b) e o bloco `BEGIN … EXCEPTION` do passo (8).
Nenhuma outra linha executavel mudou. O arquivo promete isso e cumpre.

### ⚠ CORRECAO FACTUAL AO ENUNCIADO: **nao existe "a execucao das 03:00 de hoje".**

```
now() no servidor          = 2026-08-23 04:12:39-03
cron.timezone              = GMT                       ← medido em pg_settings
cron.job_run_details p/ jobid 6 = 0 LINHAS             ← o job NUNCA disparou
ultima linha do ledger     = 2026-08-23 02:06:37-03    (a do T0, manual)
```

`0 3 * * *` e **03:00 UTC = 00:00 America/Sao_Paulo** — e a `20260823000012:79-80` ja documenta
isso com todas as letras (*"`0 3 * * *` E UTC, NAO HORARIO LOCAL … 03:00 UTC = 00:00 BRT"*), e o
runbook tambem (`:9`). Confirmado empiricamente pelos vizinhos: o job `30 1 * * *` rodou as
`22:30-03`, o `0 2 * * *` as `23:00-03`.

**Consequencia pratica:** a proxima varredura automatica e em **2026-08-24 00:00-03**, daqui a
~20 horas — e nao "hoje as 03:00", que ja passou sem que houvesse execucao agendada. O operador tem
uma janela de runway muito maior do que o enunciado supoe. **Isto nao e defeito** — o codigo e o
documento estao certos e concordam entre si. E fato operacional que muda o calculo de risco a favor.

### 2 · O estado intermediario (so `…0014` aplicada) e seguro para deixar de um dia para o outro?

**SIM, e agora por tres razoes medidas em vez de duas.**

1. A unica funcao que a `…0014` altera **nao e chamada por nada dentro do banco** (medido acima) —
   nem pelo cron, nem por trigger, nem por outra funcao.
2. As duas migrations sao **independentes**: tocam objetos disjuntos (`salvar_config_purga` ×
   privilegios de tabela de `config_purga`), e nenhuma le o que a outra escreve.
3. Os criterios novos sao **estritamente mais fortes** que os antigos (conjuncao, nunca
   enfraquecimento). Deixar so a `…0014` aplicada faz o portao do flip **recusar mais**, nunca
   menos. O erro cai para o lado que nao destroi.

⚠ A unica ordem que importa continua sendo: **as duas migrations ANTES do smoke.** Isso ja esta
corrigido no `46-REVIEW-FIX.md` (ME-R3-02) e eu confirmei os dois motivos.

### 3 · `seguro_aplicar` — pode o operador prosseguir?

**SIM.** Nada nesta revisao bloqueia o apply. As duas migrations aplicam **verdes** — eu executei
os dois blocos de auto-verificacao contra o banco vivo e sei exatamente o que cada um vai fazer:

| Bloco | Execucao read-only nesta sessao | Veredito |
|---|---|---|
| `…0014` `DO $verifica_pressupostos_portao_flip$` | rodado **integralmente**, sem excecao | ✅ Os dois rotulos (`'dry_run'`, `'despachado'`) estao no `CHECK` vivo; `relato_dry_run` existe |
| `…0015` `DO $verifica_privilegio_config_purga$` | rodado **sozinho, sem o `REVOKE`** → levantou `P0001` com os **15 pares** | ✅ O portao **MORDE hoje**. Simulando a ACL pos-`REVOKE` pela consulta identica: **vazio = VERDE** |

**Precondicoes (nenhuma bloqueante):**

1. **Rodar o passo 4 na mesma sessao do apply.** O smoke e a unica prova end-to-end de `(d.3)`,
   `(d.8)` e `(d.9)`. Adiar o smoke deixa o apply sem evidencia — que foi o que o `BL-R3-02` custou.
2. **Conferir o md5 pelos valores abaixo**, medidos nos bytes crus do disco agora:

   | Arquivo | `md5 -q` | octetos |
   |---|---|---|
   | `20260823000014_p46_portao_flip_veredito.sql` | `1937a39cef5ce3d23ced4c3d6d82ccbd` | 42780 |
   | `20260823000015_p46_config_purga_privilegio.sql` | `61dbd3f20582a129702c8712eb104516` | 23940 |

   ⚠ Se qualquer um dos consertos sugeridos abaixo for feito antes do apply, **estes valores mudam** —
   recalcule. E o `p46apply.cjs` ja aborta sozinho se o ledger divergir.
3. **Provar `cron.alter_job` num momento controlado.** Continua sendo o unico item de `BL-R3-01`
   sem prova por execucao, e o runbook diz isso com todas as letras. Nao bloqueia o apply — bloqueia
   confiar na alavanca.

### O corpo vivo NAO tem hotfix — confirmado por reproducao, e nao por citacao

```
md5(prosrc) de public.salvar_config_purga em PROD      = 9e1a55bee81aaa7b42d45e5a5a8fee7b
md5 do corpo dollar-quoted do arquivo …0013 em disco   = 9e1a55bee81aaa7b42d45e5a5a8fee7b   ✅ IDENTICO
```

E o `CREATE OR REPLACE` preserva tudo o que o objeto vivo tem hoje:

| Propriedade | Vivo (medido) | No arquivo `…0014` | Preservado? |
|---|---|---|---|
| assinatura | `salvar_config_purga(text,integer,integer,boolean)` — **funcao unica, sem overload** | identica | ✅ |
| `prosecdef` | `true` | `SECURITY DEFINER` reafirmado | ✅ |
| `provolatile` | `v` | `VOLATILE` reafirmado | ✅ |
| `proconfig` | `{search_path=""}` — **e so isso** | `SET search_path = ''` reafirmado | ✅ nada resetado |
| `proowner` | `postgres` | `CREATE OR REPLACE` preserva o dono | ✅ |
| `proacl` | `{postgres=X, service_role=X, authenticated=X}` | `REVOKE … FROM PUBLIC, anon, authenticated` + `GRANT … TO authenticated` | ✅ **nenhum `GRANT` cai** — `anon` nao esta na ACL (o `REVOKE` e no-op) e `service_role` nao e nomeado |

**Nenhum `GRANT` silenciosamente descartado. Nenhum `search_path` resetado. Nenhum hotfix atropelado.**

---

## Structural Findings (fallow)

Nenhum bloco `<structural_findings>` foi fornecido nesta invocacao. As checagens estruturais que
eu mesmo executei (grafo de chamadores de `salvar_config_purga`, donos e `prosecdef` das cinco
funcoes que tocam `config_purga`, pertencimento de papeis, inventario de statements por arquivo)
estao incorporadas as secoes acima e abaixo.

---

## Narrative Findings (AI reviewer)

## Veredito sobre cada afirmacao da iteracao 2

### `BL-R3-02` · `(d.3)` replanta a evidencia — **VERIFICADO CORRETO, e o caso continua MORDENDO**

Julguei pelo codigo, nao pela fixture sintetica do fixer. Tracei a montagem contra o esquema real
(`20260823000002:271-297`) e contra o criterio novo (`…0014:435-450`):

| criterio | valor em `(d.3)` depois do conserto | passa? |
|---|---|---|
| 1 · 14 dias | `min(iniciada_em)` = `now() − 20d` (a linha explicita com `RETURNING`) | **sim** |
| 2 · 14 execucoes | `1 + 12` (`generate_series(2,13)`) = **13** | **nao** → marcador `execucoes` |
| 3 · ensaio com evidencia | `v_d_exec3` tem `elegiveis = 3` **e** um item com `relato_dry_run` | **sim** |
| 4/5 · matriz | `origem = 'admin'` desde `:3108` | **sim** |

→ `v_marc[2] = 'execucoes'`, que e exatamente o esperado em `:3594`. **O caso continua reprovando,
e SO pela contagem** — 13 < 14 — que e a propriedade inteira pela qual ele existe. O fix nao o
tornou incapaz de falhar.

Tres coisas que o fixer **nao** verificou e eu verifiquei:

- **`candidato_id` NAO tem FK** (`20260823000002:274` + o `COMMENT` que justifica a ausencia). O
  item sintetico com `c_d_cand` nao viola integridade — nem em `(d)` nem em `(d.3)`, e nenhum dos
  dois jamais foi executado.
- **A ordem dos `DELETE` esta certa** — itens antes de cabecalhos —, porque a FK
  `purga_execucao_itens_execucao_id_fkey` nao tem `ON DELETE CASCADE`. Confirmado no catalogo.
- **O bloco `(d)`/`(e)` inteiro COMPILA.** Compilei os 49.529 caracteres em
  `CREATE FUNCTION pg_temp.chk_de()` contra o banco vivo (criada, **nunca executada**, descartada
  com a sessao): **sem erro de sintaxe**. Uma migration verde com um smoke que nao parseia seria o
  pior desfecho do passo 4.

⚠ **O que continua sem prova:** a execucao real. `(m)` roda a varredura em `live` num envelope
revertido, e roda-la e ato de operador. **Marco `(d.3)` como CORRETO POR TRACADO E COMPILACAO, nao
por execucao.** A prova definitiva continua sendo o passo 4.

### `BL-R3-01` · a alavanca — **assinatura CONFERIDA contra o catalogo, sem contradicao remanescente**

```
cron.alter_job(bigint,text,text,text,text,boolean)
  args: job_id bigint, schedule text, command text, database text, username text, active boolean
  lanname = c · prosecdef = false · owner = supabase_admin
  has_function_privilege('postgres', …, 'EXECUTE') = true
```

- **Grafia dos argumentos:** `job_id` e `active` sao os nomes reais. `cron.alter_job(job_id := 6,
  active := false)` esta **correto**. A prosa do runbook (`:372-375`) descreve as seis posicoes na
  ordem exata do catalogo. ✅
- **O mecanismo esta certo, e a explicacao tambem:** e funcao **C**, `prosecdef = false` — ou seja
  ela nao passa pelo verificador de ACL de tabela porque acessa o heap diretamente, e nao porque
  seja `SECURITY DEFINER`. O runbook diz *"trocam internamente para o dono da extensao"*, que e uma
  parafrase imprecisa do mesmo fato; a conclusao operacional e a mesma e esta correta.
- **`cron.unschedule` de fato ja EXECUTOU neste projeto**, ao contrario do que eu suspeitei ao ler
  o `WHERE EXISTS` de `20260823000012:108`: `cron.job_run_details` guarda o `jobid 2`
  (`ai-logs-retention-cleanup` antigo, ultima corrida 2026-07-31) que **nao existe mais** em
  `cron.job`, e o `jobid 4` e a versao recriada por `20260730000005:120`. A frase *"`unschedule` e a
  que sempre funcionou"* (`:386`) **se sustenta**.
- **Contradicao interna:** varri o documento inteiro. `UPDATE cron.job` aparece agora **so como
  proibicao** (`:346`, `:416`). O paragrafo antigo que mandava *"preferir isto a `cron.unschedule`"*
  foi removido. Nenhuma outra secao contradiz a nova. ✅

### `HI-R3-05` · a inversao para allowlist — **VERIFICADA POR EXECUCAO, e ela NAO ficou vacua**

Este era o pedido explicito: *"vazia-e-verde depois do REVOKE, nao-vazia-e-vermelha antes"*.
**Executei o bloco `DO` da `…0015` isolado, sem o `REVOKE`**, contra a ACL viva:

```
ERROR: P0001: P46-CFG: a ACL de public.config_purga concede a alguem que NAO e o dono …
[anon:DELETE, anon:INSERT, anon:TRIGGER, anon:TRUNCATE, anon:UPDATE,
 authenticated:DELETE, authenticated:INSERT, authenticated:TRIGGER, authenticated:TRUNCATE, authenticated:UPDATE,
 service_role:DELETE, service_role:INSERT, service_role:TRIGGER, service_role:TRUNCATE, service_role:UPDATE]
```

**15 pares, com os tres `:TRIGGER` nomeados** — o verbo que a familia antiga era cega para. E a
mesma consulta, sobre a ACL simulada apos o `REVOKE`
(`{postgres=arwdDxtm, anon=rxm, authenticated=rxm, service_role=rxm}`): **`<VAZIO = VERDE>`**.

A inversao esta **completa nos dois eixos** e nao e vacua. E a familia `(i)` nomeada tambem vai
passar, porque nenhum dos tres papeis herda de nada (medido). O apply nao aborta.

⚠ **O fixer reintroduziu a forma em outro lugar?** Varri o delta inteiro pela forma do `CLAUDE.md`
(`v_… <> N`, `= ANY (ARRAY['`, `IN ('a','b')`). Os unicos focos novos sao:
`v_d_evid13 IS DISTINCT FROM 1` — uma contagem contra constante sobre um conjunto que **o proprio
bloco acabou de construir dentro de uma subtransacao** (escopo deliberado, nao fotografia), e
`veredito IN ('dry_run','despachado')` na `…0014`, que o arquivo argumenta por extenso como escopo.
**Nenhuma reincidencia.** ✅

### `HI-R3-02` + `ME-R3-05` · a guarda e a transicao, e o `PERFORM` e copia unica — **CORRETO**

Confirmei o que mais importava, linha a linha e depois mecanicamente:

- **O `BEGIN … EXCEPTION WHEN OTHERS` envolve EXCLUSIVAMENTE o `PERFORM public.log_auditoria(…)`.**
  O `UPDATE` do passo (7) (`:506-511`) e o `SELECT to_jsonb` (`:513`) estao **fora** do bloco, que
  abre em `:588`. Uma falha da MUTACAO propaga e derruba a chamada. **O handler nao tem como
  engoli-la.** ✅
- `WHEN OTHERS` no PostgreSQL **nao captura `query_canceled` nem `assert_failure`** — o handler nao
  transforma um cancelamento de statement num desligamento silenciosamente "bem-sucedido". ✅
- `RAISE;` nu re-levanta a excecao original; a atomicidade de `→ live` fica identica. ✅
- **Contagem de placeholders conferida mecanicamente em TODOS os `RAISE` dos dois arquivos:** o
  `RAISE WARNING` novo de `:607` tem **4 `%` e 4 argumentos**. Nenhum descasamento em lugar nenhum
  dos dois arquivos. Isto importa porque um `RAISE` malformado **dentro do handler do kill switch**
  seria um erro de execucao no exato ponto que o achado existe para proteger. ✅
- A guarda `v_modo_novo = 'off' AND v_modo_antes IS DISTINCT FROM 'off'` e a transicao, e
  `v_modo_novo` nunca e `NULL` (`coalesce(p_modo, v_modo_antes)` sobre coluna `NOT NULL`). ✅

### `HI-R3-04` · a divergencia declarada — **JULGO O FIXER CERTO, e o review anterior errado no remedio**

O argumento e solido e eu o endosso:

> `Promise.race` **nao cancela** a operacao perdedora. Sem `AbortSignal` propagado ate o transporte,
> o `rpc("anonimizar_candidato")` continuaria rodando e **commitando no servidor** enquanto esta
> funcao ja teria gravado `desfecho_postgres = 'falha'` e fechado o item.

Isso e verdade sobre `Promise.race` e sobre `supabase-js` (o `fetch` subjacente nao recebe sinal
nenhum nestas chamadas). E a consequencia e pior que o problema: gravar `falha` sobre uma
anonimizacao que **aconteceu** e afirmacao falsa num ledger de retencao indefinida sem PITR —
exatamente a mentira simetrica que a divergencia do cheque 3 existe para evitar. **Recusar o
remedio foi a decisao certa**, e o review anterior explicitamente admitia a alternativa.

E o diff e **so de comentario**: `git diff` sobre `index.ts` mostra apenas o bloco JSDoc; nenhuma
linha executavel mudou, e `index.test.ts` nao foi tocado. Rodei `deno test --allow-all
supabase/functions/purgar-retencao/` → **19 passed, 0 failed**, com `(k)`, `(k2)` e `(k3)` provando
o orcamento nas duas direcoes. ✅

**Onde a prosa nova ainda promete um pouco a mais:** ver `LO-01` abaixo.

---

## HIGH

### HI-01 · O invariante que a `…0015` estabelece nao tem NENHUM guarda recorrente — ele e medido uma vez, no apply, e nunca mais

**Arquivos:** `20260823000015…sql:165-306` (a auto-verificacao) × `:333-347` (o `COMMENT ON TABLE`)
× `supabase/tests/p46_purga_smoke.sql` (ausencia)
**Classe:** portao de instante apresentado como propriedade permanente.

O `COMMENT ON TABLE` que a migration grava **dentro do catalogo** afirma, no presente e sem prazo:

> *"⚠⚠ ESCRITA FECHADA EM TRES CAMADAS DESDE A 20260823000015 … (1) PRIVILEGIO DE TABELA — INSERT,
> UPDATE, DELETE, TRUNCATE e TRIGGER revogados nominalmente de PUBLIC, anon, authenticated e
> service_role, **e os CINCO conferidos por medicao no mesmo apply**"*

A medicao no mesmo apply e correta e e o melhor pedaco do conserto. Mas ela roda **uma vez**, e
depois nada re-mede. **Medido:**

```
grep -n "has_table_privilege\|relacl\|aclexplode\|privilege_type"  supabase/tests/p46_purga_smoke.sql
  → NENHUMA ocorrencia
grep -rln "config_purga" supabase/tests/
  → so p46_purga_smoke.sql
```

Ou seja: **nenhum smoke deste projeto afere privilegio de tabela em `config_purga`.** Um
`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` — que e um idioma corriqueiro no Supabase,
e **e literalmente como esta tabela nasceu com escrita para os tres papeis**, segundo o proprio
cabecalho da `…0015` (`:29-35`) — reabriria a porta com **todos os portoes verdes** e com o catalogo
continuando a afirmar o contrario.

E o achado HI-04 deslocado, nao repetido: la a pergunta era feita do **lado errado da porta**; aqui
ela e feita do lado certo, **uma unica vez**, e o texto gravado no banco promete permanencia.

**Conserto (DEPOIS do apply, e de proposito):** acrescentar ao `p46_purga_smoke.sql` uma condicao
dentro de um bloco existente — a mesma consulta de `(i.a)`, exigindo conjunto **vazio**:

```sql
-- ⊖ A ESCRITA DE APLICACAO EM config_purga CONTINUA FECHADA (HI-04 / …0015).
--   Allowlist de tolerados, jamais lista de proibidos: o verbo que nascer amanha
--   cai aqui. Baseline nao aplicavel — o esperado e o conjunto VAZIO.
SELECT coalesce(string_agg(t.par, ', ' ORDER BY t.par), '') INTO v_acl_livre
  FROM (SELECT DISTINCT CASE WHEN a.grantee = 0 THEN 'PUBLIC'
                             ELSE a.grantee::regrole::text END || ':' || a.privilege_type AS par
          FROM pg_catalog.pg_class c, LATERAL pg_catalog.aclexplode(c.relacl) a
         WHERE c.oid = pg_catalog.to_regclass('public.config_purga')
           AND a.privilege_type <> ALL (ARRAY['SELECT','REFERENCES','MAINTAIN'])
           AND (a.grantee = 0 OR a.grantee <> c.relowner)) t;
IF v_acl_livre <> '' THEN RAISE EXCEPTION 'P46P FAIL: a escrita de aplicacao em config_purga REABRIU [%] …', v_acl_livre; END IF;
```

⚠ **E DEPOIS do apply, nao antes** — e a razao e operacional: uma **asserção letrada** nova mudaria
o contador de `(z)` de 27 para 28, e a previsao `27/27` e a evidencia que o passo 4 do apply vai
produzir. Editar o smoke agora troca um risco de conformidade por um risco de evidencia. Se for
feito como **condicao dentro de um bloco existente** (como `(d.8)`/`(d.9)`), o contador nao muda e
pode ir junto — mas ai o smoke muda depois de a `…0015` ja ter sido validada por mim, e eu nao teria
como reconferi-lo. **Recomendo depois.**

---

### HI-02 · A tabela de vigilancia dos 14 dias nao nomeia o sinal do criterio 3 novo — e PROD ja contem, hoje, o estado que ela nao pega

**Arquivo:** `.planning/phases/46-purga-autom-tica-dry-run-live/46-07-RUNBOOK-FLIP.md:225-234`
**Classe:** documento operacional dessincronizado do portao que ele prepara. Falha **SEGURA** (o
servidor recusa), mas o diagnostico chega **14 dias tarde**.

Desde a `…0014`, o criterio 3 e `elegiveis > 0` **AND** `EXISTS (item com relato_dry_run)`. A tabela
que o operador vai abrir toda manha durante duas semanas continua nomeando **so o `elegiveis`**:

| linha da tabela | o que ela diz |
|---|---|
| `veredito = 'dry_run'`, `processados = 0` | ✅ *"o regime normal do periodo"* |
| `elegiveis` estavel | ✅ |
| `elegiveis = 0` | ⛔ *"o criterio nº 3 para de ser satisfeito"* |

**Nao ha nenhuma linha para o estado "abriu item e o motor nao rodou".** E ele nao e hipotetico —
**esta em PROD agora**, medido:

```
execucao e3115161…  2026-08-22 20:03:14-03  dry_run/dry_run  elegiveis=6  itens=6  com relato_dry_run: 0
execucao 3f27a94c…  2026-08-23 02:06:37-03  dry_run/dry_run  elegiveis=4  itens=4  com relato_dry_run: 4
```

A primeira satisfaz **todas as tres linhas verdes da tabela** — `veredito='dry_run'`,
`processados=0`, `elegiveis=6` estavel — e **nao conta para o criterio 3**. E os seis itens dela
estao com os tres desfechos em `nao_aplicavel`, entao a linha ⛔ *"qualquer item com desfecho
carimbado fora de `nao_aplicavel`"* tambem nao a pega.

Catorze noites assim = operador confiante, e recusa no dia do flip.

**Conserto (pode ir DEPOIS do apply — e edicao de planning, nao toca PROD):** duas linhas na tabela
e uma consulta:

```markdown
| `elegiveis > 0` mas **nenhum item com `relato_dry_run`** | ⛔ o motor nao foi chamado nesta noite — ela conta para os criterios 1 e 2 e **NAO** para o 3 (`…0014`). Investigar o ramo `WHEN OTHERS` do laco `(g)` |
```

```sql
-- As noites que de fato ENSAIARAM, que e o que o criterio 3 conta desde a …0014.
SELECT e.iniciada_em, e.veredito, e.elegiveis,
       count(i.*) FILTER (WHERE i.relato_dry_run IS NOT NULL) AS com_evidencia
  FROM public.purga_execucoes e
  LEFT JOIN public.purga_execucao_itens i ON i.execucao_id = e.id
 WHERE e.modo_vigente IN ('dry_run','live') AND e.veredito IN ('dry_run','despachado')
 GROUP BY e.id, e.iniciada_em, e.veredito, e.elegiveis
 ORDER BY e.iniciada_em;
```

⚠ Sobreposicao declarada: isto vizinha com `ME-R3-01` do `46-REVIEW-3.md`, que o fixer registrou
como **NAO FEITO**. `ME-R3-01` e sobre os criterios 1 e 2 contarem noites sem ensaio; **este achado
e outro** — e sobre o operador nao ter, no documento que ele abre, o sinal que mede o criterio 3.

---

## MEDIUM

### ME-01 · O comentario novo de `HI-R3-04` aponta para as linhas erradas — e foi ele proprio que as deslocou

**Arquivo:** `supabase/functions/purgar-retencao/index.ts:138`

```ts
 * ... a mesma mentira simetrica que a
 * divergencia do cheque 3 (logo abaixo, `:473-486`) existe para evitar ...
```

**Medido:** o bloco "ORÇAMENTO 3/3" estava em `473-486` **em `56485db`** — e o commit `aa24a42`,
que escreveu essa referencia, inseriu **32 linhas de comentario acima dela**. Hoje o bloco vive em
**`505-518`**, e `473-486` aponta para os cheques **1/3 e 2/3**, que sao outra coisa.

Nao e cosmetico neste repositorio: e um comentario que contradiz o codigo ao lado, num arquivo cuja
doutrina declarada e que isso e a forma de defeito que a fase nomeia (`BL-01` do 46-04, `RD3-01`) —
e foi cometido **no commit que existia para corrigir uma prosa imprecisa**.

**Conserto:** `:505-518`. Ou, melhor, referenciar pelo rotulo em vez do numero: *"a divergencia do
cheque `ORÇAMENTO 3/3`, logo abaixo"* — rotulo nao envelhece quando alguem insere um paragrafo.

---

### ME-02 · A alavanca de emergencia embute `job_id := 6` como literal em tres pontos, e o cheque de confirmacao pergunta por outra chave

**Arquivo:** `46-07-RUNBOOK-FLIP.md:337`, `:343`, `:415`

```sql
SELECT cron.alter_job(job_id := 6, active := false);   -- jobid MEDIDO: 6
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'purga-retencao-sweep';
```

A alavanca age por **`jobid`**; a confirmacao le por **`jobname`**. Se o job tiver sido reagendado
(e o proprio runbook descreve `unschedule` + reaplicar `20260823000012` como caminho previsto, com
*"`jobid` novo"*), os dois deixam de falar do mesmo objeto. Dois desfechos:

- `jobid 6` nao existe mais → `alter_job` levanta. **Alto, e aceitavel.**
- `jobid 6` foi reaproveitado por outro job → **desarma o job errado em silencio**, e a
  confirmacao por `jobname` mostra `active = true` sem explicar por que. As tres da manha, isso e o
  cenario caro.

⚠ O documento **ja escreve o aviso** (`:377-379`), mas ele fica entre o primeiro bloco e a segunda
opcao — e o ponto `:415`, na secao *"se o desligamento nao bastar"*, repete o literal **sem o
aviso**. Um runbook e lido por copiar-e-colar sob pressao.

**Conserto** — tirar o numero do caminho critico, mantendo a mesma alavanca:

```sql
-- Le o jobid e desarma na MESMA transacao — sem numero transcrito no meio.
SELECT cron.alter_job(job_id := j.jobid, active := false)
  FROM cron.job j WHERE j.jobname = 'purga-retencao-sweep';

-- Conferir — "nao levantou" nunca foi "gravou":
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'purga-retencao-sweep';
```

E o simetrico com `active := true`. Mantenha a nota de que `alter_job` nao aceita `jobname`.

---

### ME-03 · `(d.6)` — a UNICA chamada que autoriza o flip usa notacao posicional (o item que o fixer registrou e nao consertou)

**Arquivo:** `supabase/tests/p46_purga_smoke.sql:3436`

```sql
PERFORM public.salvar_config_purga('live', NULL, NULL, true);
```

contra as outras oito, todas assim:

```sql
PERFORM public.salvar_config_purga(p_modo := 'live', p_cap_titulares := NULL,
                                   p_janela_notificacoes_meses := NULL, p_confirmo_live := true);
```

**Risco tecnico: BAIXO, e eu o medi em vez de supor.**

- Existe **exatamente uma** `salvar_config_purga` no banco (`pg_proc` → 1 linha, sem overload).
  Os `NULL` nus resolvem sem ambiguidade.
- `CREATE OR REPLACE FUNCTION` **nao pode** renomear nem retipar parametro de entrada — so o
  `DROP`+`CREATE` poderia, e ai a chamada nomeada tambem quebraria. Um overload futuro de 5
  argumentos nao afeta uma chamada de 4; um overload de 4 argumentos com tipos diferentes daria
  `42725` **alto**, nunca silencioso.

**Risco humano: o que justifica registrar.** E a unica linha do repositorio em que
`p_confirmo_live := true` **de fato autoriza o flip**, e a forma em que ela esta escrita —
`('live', NULL, NULL, true)` — e precisamente a forma que o proprio runbook e o `46-07-SUMMARY.md`
(`[Rule 1]`) proibem, porque `NULL, NULL` no meio e o formato em que um argumento trocado nao se
distingue de um argumento correto. Quem copiar essa linha para um console vivo esta a um
deslocamento de posicao de `p_cap_titulares := true`.

**Conserto** (uma linha, zero risco, e a hora barata e agora — o arquivo ainda nao rodou):

```sql
      PERFORM public.salvar_config_purga(p_modo := 'live', p_cap_titulares := NULL,
                                         p_janela_notificacoes_meses := NULL,
                                         p_confirmo_live := true);
```

⚠ **Nao bloqueia o apply.** A semantica e identica; se o operador preferir nao mexer no arquivo que
vai produzir a evidencia, adie — mas entao o md5 do smoke muda depois, e nao antes.

---

## LOW

| # | Arquivo:linha | Achado | Conserto |
|---|---|---|---|
| **LO-01** | `supabase/functions/purgar-retencao/index.ts:128` | No mesmo paragrafo em que `HI-R3-04` desinflou a promessa, sobreviveu *"120 s da 30 s de folga para o `finally` concluir o item"*. O `finally` **tambem** nao tem timeout — `concluir_item_purga` esta na propria lista de operacoes sem prazo, tres linhas acima. A frase e aritmetica de orcamento apresentada como folga garantida, sob o mesmo pressuposto de 150 s que o paragrafo acima acabou de declarar "medicao da plataforma" | *"120 s deixam 30 s de margem NOMINAL para o `finally`; ela e aritmetica sobre a mesma medicao de 150 s, e o `concluir_item_purga` tambem nao tem timeout proprio"* |
| **LO-02** | `20260823000014…sql:229` | `LO-R3-01` do review anterior, **nao consertado**: o comentario justifica `strpos` com *"este arquivo roda com `search_path` fechado"*. O bloco `DO` **nao** declara `search_path` e o arquivo tampouco. A escolha de `strpos` continua **certa** (`position(… in …)` e sintaxe especial e nao aceita qualificacao de schema); o motivo escrito nao e o motivo real. Confirmei que o bloco executa sem erro, entao e so a prosa | Reescrever para o motivo verdadeiro. Custa zero agora e exige migration nova depois |
| **LO-03** | `20260823000015…sql:191` | `v_verbos_ok := ARRAY['SELECT','REFERENCES','MAINTAIN']` e uma lista literal, e envelhece na direcao **oposta** a que `HI-R3-05` consertou: um privilegio novo e benigno do PG18 faria a familia reprovar **trabalho correto**. O impacto e limitado — o bloco roda **uma vez**, no apply, e nunca mais —, e falhar fechado e a direcao certa num portao que autoriza destruicao. Mas a mensagem de excecao nao diz ao operador o que fazer se o verbo for novo e inofensivo | Uma frase na mensagem: *"se o verbo acima e novo no Postgres e nao altera CONTEUDO, acrescente-o a `v_verbos_ok` nesta migration e reaplique — nao remova a familia"* |

---

## O que continua em aberto do `46-REVIEW-3.md`, e que eu NAO recontei

O fixer registrou honestamente cada um. Confirmo que continuam abertos e que **nenhum bloqueia o apply**:

- **`ME-R3-01`** — criterios 1 e 2 contam noites que abriram item sem chamar o motor. Reconfirmado
  em PROD: `e3115161` (2026-08-22 20:03, 6 itens, **zero** com `relato_dry_run`) ancora
  `min(iniciada_em)` ~6 h antes do T0 declarado no runbook (`:29-30`). Ainda e a hora barata — a
  `…0014` nao esta no ledger. Meu `HI-02` acima e a metade **operacional** deste mesmo assunto.
- **`ME-R3-04`** — a tolerancia silenciosa de `(m)`: se qualquer leitura de
  `net.http_request_queue` levantar, `v_fila_ok := false` e a **unica** condicao que mede o dispatch
  e pulada com `(m)` reportando PASS.
- **`ME-R3-06`** — a semantica nova de `processados` (quatro caminhos contam titular processado sem
  o motor ter rodado) nao e medida por asserção nenhuma, e `processados` e a coluna que a tabela de
  vigilancia manda ler todas as manhas.
- **`LO-R3-02`**, **`LO-R3-03`**, **`LO-R3-04`**, **`ME-01`/`ME-06` do `46-REVIEW-2.md`** — inclusive
  `docs/compliance/cron-inventory.md` declarando o 4º agendamento como NAO APLICADA enquanto o
  `jobid 6` esta vivo (reconferido nesta sessao).

---

## A ordem de conserto

**ANTES do apply — nada e obrigatorio. Se for fazer algum, faca estes tres (edicao de arquivo, zero PROD):**

1. **`ME-01`** — a referencia `:473-486` → `:505-518` ou por rotulo. Trinta segundos.
2. **`ME-03`** — notacao nomeada em `(d.6)`. Uma linha, e o arquivo ainda nao rodou.
3. **`LO-02`** — o motivo do `strpos`. Depois do apply, exige migration nova.

⚠ Se qualquer um for feito, **recalcule o md5** dos arquivos afetados antes de aplicar.

**DEPOIS do apply, e antes de qualquer ensaio em `live`:**

4. **`HI-02`** — a linha na tabela de vigilancia + a consulta que mede evidencia. **Faca isto no
   mesmo dia do apply**: os 14 dias de vigilancia comecam a valer imediatamente, e o sinal que falta
   e justamente o que so aparece no dia 14.
5. **`HI-01`** — o guarda recorrente da ACL de `config_purga` no smoke.
6. **`ME-02`**, **`LO-01`**, **`LO-03`**, e os MEDIUM/LOW herdados — conforme couber.

**E o item que fecha `BL-R3-01` de vez:** provar `cron.alter_job` desarmando e rearmando num momento
controlado. Nao e conserto — e a medicao que falta.

---

## O que eu NAO consegui verificar, e por que

1. **A execucao real do smoke.** `(m)` roda a varredura em `live` dentro de um envelope revertido;
   roda-lo e ato de operador. `(d.3)` foi verificado por **tracado do estado** (fixture → recorte →
   marcadores) e por **compilacao integral em `pg_temp`**, com a FK, a ausencia de `ON DELETE
   CASCADE` e a ausencia de FK em `candidato_id` medidas no catalogo. **Marco como CORRETO POR
   TRACADO, nao por execucao.** A prova definitiva e o passo 4.
2. **`cron.alter_job` nunca foi executada.** Privilegio, assinatura, `prokind = 'c'` e
   `prosecdef = false` medidos; a execucao, nao — executa-la e mutar o agendamento de PROD.
   O mecanismo esta corroborado por `cron.schedule` (jobid 6) e por `cron.unschedule` (a troca
   jobid 2 → 4, visivel em `cron.job_run_details`), as duas rodadas como `postgres` neste projeto.
3. **O ramo degradado da trilha nao e exercitado por teste nenhum.** Nenhum smoke forca
   `log_auditoria` a levantar dentro de `salvar_config_purga`. Correto **por construcao** — escopo do
   handler, `RAISE;`, contagem de placeholders, `WHEN OTHERS` nao capturando `query_canceled` —, nao
   por execucao. Continua sendo a pergunta 4 em aberto desde o `46-REVIEW-3.md`.
4. **O teto de parede real do Edge Runtime deste projeto** continua sem medicao e sem pino. O
   `PRAZO_MS` o torna menos decisivo, nao irrelevante — e o cabecalho agora diz isso.

---

_Revisado: 2026-08-23T04:30-03:00_
_Revisor: gsd-code-reviewer (adversarial, passe final do loop de conserto)_
_Profundidade: deep — leitura integral das 2 migrations, diff mecanico do corpo vivo × disco, inventario de statements por arquivo, conferencia mecanica de placeholders de `RAISE`, tracado do bloco `(d)` caso a caso contra o criterio novo, compilacao do bloco `(d)`/`(e)` em `pg_temp`, `deno test` 19/19, e **17 consultas read-only ao banco vivo** — incluindo a execucao isolada dos dois blocos de auto-verificacao_
_PROD nao foi tocada: `modo = dry_run` (T0 `2026-08-23 02:06:37.866049-03` intacto), `cron.job` jobid 6 `active = true` com **0 corridas**, `md5(prosrc)` de `salvar_config_purga` = `9e1a55bee81aaa7b42d45e5a5a8fee7b`, `…0014` e `…0015` com 0 registros no ledger_
