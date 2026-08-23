---
fase: 46-purga-automatica-dry-run-live
review_path: .planning/phases/46-purga-autom-tica-dry-run-live/46-REVIEW-2.md
fixed_at: 2026-08-23
iteration: 1
escopo: critical_warning (BLOCKER + HIGH)
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
exige_apply_em_prod: true
prod_tocada_por_este_trabalho: false
modo_vigente_em_prod: dry_run
---

# Phase 46 · Relatório de conserto do `46-REVIEW-2.md`

**Escopo:** BLOCKER + HIGH (BL-01, HI-01 … HI-05). MEDIUM/LOW fora de escopo.
**Regra de operação obedecida:** **nada foi aplicado em PROD.** Escrita em disco apenas.

## ⚠ PRIMEIRO — o estado de PROD depois deste trabalho

Medido por consulta read-only ao fim da sessão:

| Fato | Valor |
|---|---|
| `config_purga.modo` | `dry_run` (inalterado, T0 = 2026-08-23 02:06:37-03) |
| `cron.job` `purga-retencao-sweep` | `active = true`, `jobid 6`, `0 3 * * *` |
| corpo de `salvar_config_purga` em PROD | **ANTIGO** — a `20260823000014` não foi aplicada |
| `has_table_privilege('service_role','config_purga','UPDATE')` | ainda `true` — a `20260823000015` não foi aplicada |
| linhas em `purga_execucoes` | 4 (inalterado) |
| migrations `…0014` / `…0015` no ledger | **0 registradas** |

**A propriedade `exige_reverter_prod: false` do review foi preservada. A execução noturna continua
sendo dry-run e continua não destruindo nada.**

Toda interação com PROD nesta sessão foi **read-only** (introspecção de catálogo e contagens) ou
compilação em `pg_temp` — sessão-local, descartada, e nunca executada. A função real foi conferida
intacta depois de cada sonda.

---

## O que foi consertado

### BL-01 (BLOCKER) — o portão do flip contava como ensaio execuções que não ensaiaram nada
**Commit:** `dbdf1fe`
**Arquivos:** `supabase/migrations/20260823000014_p46_portao_flip_veredito.sql` (novo),
`supabase/tests/p46_purga_smoke.sql`

Migration NOVA com `CREATE OR REPLACE FUNCTION` — a `20260823000013` está aplicada e seus bytes
estão pinados por `md5(statements[1])` no ledger; editá-la no lugar quebraria a própria prova.

Dois consertos no recorte de `(6.b)`:

- **Allowlist de `veredito`, jamais negação:** `AND veredito IN ('dry_run','despachado')`. Os
  vereditos `cap_excedido` e `segredo_ausente` são alcançáveis **em `dry_run`** e retornam antes de
  abrir um único item — a mesma propriedade que o comentário original já argumentava sobre `off`.
- **O critério 3 mede EVIDÊNCIA:** `elegiveis > 0 AND EXISTS (item com relato_dry_run)`.

⚠ **Divergência declarada do texto do review**, que propunha trocar o número **pela** evidência:
aqui os dois viram **conjunção**. É estritamente mais forte que qualquer metade, nenhum predicado
é enfraquecido (o conjunto contado só diminui), e preserva a capacidade de `(d.4)` de reprovar pelo
critério que ele existe para medir.

⚠⚠ **O achado não é hipotético, e foi MEDIDO em PROD** (read-only):

| recorte | execuções | primeira | critério 3 |
|---|---|---|---|
| antigo (só modo) | 2 | 2026-08-22 20:03 | **2** |
| novo (modo + veredito + evidência) | 2 | 2026-08-22 20:03 | **1** |

A execução de 2026-08-22 20:03 tem `elegiveis = 6` e **seis itens, nenhum com `relato_dry_run`** —
ela é anterior à versão da varredura que captura a pré-imagem. **O portão antigo a contava como
ensaio.**

**Vigilância nova** (sem ela o conserto não fica vigiado):
- `(d.8)` — 14 execuções em `dry_run`, `elegiveis > 0`, `veredito = 'segredo_ausente'` → **RECUSA**.
- `(d.9)` — 14 execuções de ensaio sem nenhum item com `relato_dry_run` → **RECUSA**.

O ledger sintético de `(d)` ganhou o item com `relato_dry_run` que faltava. ⚠ **A fixture que provava
o portão vivia, ela própria, no estado de BL-01** — catorze cabeçalhos e nenhum item — e o caso
positivo passava sobre ela. `(d.9)` é literalmente devolver a fixture ao que ela era.
Contagem de chamadas de controle: **7 → 9**. Marcadores de diagnóstico varridos até o caso 7.

**Auto-verificação de apply** que ABORTA se `dry_run` ou `despachado` tiver deixado de existir no
`CHECK` **vivo** — allowlist apontando para rótulo morto conta zero para sempre, e um portão incapaz
de **aprovar** é tão quebrado quanto um incapaz de recusar. **Provado por execução que morde.**

---

### HI-01 (HIGH) — o kill switch podia ser recusado por uma falha na escrita da trilha
**Commits:** `dbdf1fe` (o corpo da função) e `b4c5aa4` (o runbook)
**Arquivos:** a mesma migration `…0014`, e `46-07-RUNBOOK-FLIP.md`

⚠ **Por que BL-01 e HI-01 dividem um commit:** os dois consertam o **corpo da mesma função**, e o
veículo é um único `CREATE OR REPLACE`. Separá-los criaria um commit intermediário com uma migration
meio-feita — e neste repositório migration é artefato de *apply-once* pinado por md5. Alguém aplicar
a versão errada é risco real, não teórico.

A trilha passa a ser degradada para `WARNING` **exclusivamente** na transição `→ off`. Para `→ live`
continua **atômica**, e uma falha dela continua **revertendo o flip**. A regra é uma só: o erro cai
sempre para o lado que **não destrói**.

Runbook (`b4c5aa4`): último recurso quando **qualquer** chamada de RPC falhar —
`UPDATE cron.job SET active = false WHERE jobname = 'purga-retencao-sweep';`, conferido contra PROD
(a coluna existe, o jobname confere). Preferido a `cron.unschedule`, que **destrói a linha** e exige
reaplicar `20260823000012` com `jobid` novo. Declarado também o que ele **não** faz: impede a
varredura de *começar*, não muda `config_purga.modo`, e complementa o kill switch em vez de
substituí-lo.

---

### HI-02 (HIGH) — a "prova durável de que o dispatch rodou" não media o dispatch
**Commit:** `21d7352`
**Arquivos:** `supabase/tests/p46_purga_smoke.sql`, `46-06-SUMMARY.md`

Quinta condição em `(m)`: `v_fila_m = v_fila_g + v_m_eleg`. **Baseline capturada na própria
execução**, jamais constante — a forma que o `CLAUDE.md` manda usar, e também o que a torna válida
em PROD (as tabelas do `pg_net` são `UNLOGGED` com TTL de ~6 h, e contagem absoluta seria a
fotografia que envelhece).

A igualdade pode ser **exata** porque `net.http_post` insere dentro da transação e o worker só
enxerga a linha depois do `COMMIT`, que neste envelope nunca acontece. O **único modo conhecido de a
condição acusar errado** (worker apagando linhas commitadas por run anterior, entre as duas
leituras) está escrito na própria mensagem — para não repetir o diagnóstico FALSO que esta fase já
pagou três vezes.

Corrigida a frase do `46-06-SUMMARY.md:263-265`, que afirmava o contrário com todas as letras.

---

### HI-03 (HIGH) — a Edge Function gravava `desfecho_storage = 'falha'` sem ter tocado o Storage
**Commit:** `4b1de36`
**Arquivos:** `supabase/functions/purgar-retencao/index.ts` e `index.test.ts`

Os três `throw` anteriores ao `enumerarObjetos` passam a ser atribuídos ao **Postgres** — verdade
literal: o motor daquele titular não rodou — e `desfecho_storage` fica em `nao_aplicavel`, que é o
fato.

**Consequência aceita e declarada inline:** `concluir_item_purga` incrementa `processados` quando o
desfecho de Postgres é `ok` **ou** `falha`, então estes três caminhos passam a contar como titular
processado sem que o motor tenha rodado. É o mesmo preço que o caminho de falha de despacho de
`(g.5)` já paga, e menor que o da alternativa (uma quarta coluna de desfecho numa tabela cujo ledger
está pinado por md5).

Vigiado por `(j)` e `(j2)`, que aferem o **objeto gravado** e não o status HTTP — os dois caminhos
devolvem 500 de qualquer jeito, e é por isso que um teste de status não pegaria isto.
**Provado por execução que os portões mordem:** com a atribuição antiga, 16 passed → 14 passed | 2
failed.

---

### HI-04 (HIGH) — "esta função é o único caminho de escrita" verificado do lado errado da porta
**Commit:** `f9cb62b`
**Arquivos:** `supabase/migrations/20260823000015_p46_config_purga_privilegio.sql` (novo),
`46-07-SUMMARY.md`

**Medido em PROD, read-only:** `relacl` concede `arwdDxtm` a `anon`, `authenticated` **e**
`service_role`; `rolbypassrls(service_role) = true`; e os grants são **diretos** (sem pertencimento
a papel), portanto alcançáveis por `REVOKE`.

`REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER` nominal de `PUBLIC` + os três papéis. `TRIGGER`
junto porque quem anexa trigger faz código próprio rodar na transação de quem escreve — segunda
porta da mesma classe. `SELECT` permanece: `authenticated` precisa dele para a policy admin-only.

Auto-verificação com **quatro famílias**, e a primeira existe por causa da varredura pela FORMA:

- **(i.a) EXAUSTIVA** — lê a ACL da tabela e cobra qualquer *grantee* que não seja o **dono**, sem
  lista de papéis, alcançando `PUBLIC` (grantee 0). O dono é excluído por comparação com `relowner`,
  não por nome literal, e o escopo é a ACL de **uma** tabela — então ela não alarga a ponto de
  reprovar trabalho correto. Um papel que nasça depois desta migration cai aqui.
- **(i.b) POR PAPEL NOMEADO** — varre papel × verbo (12 combinações). Tem a forma *"iteração sobre
  lista literal"* que o `CLAUDE.md` cataloga como perigosa, e fica assim mesmo, **declaradamente**:
  ela é boa para o **diagnóstico** (nomeia o par em que o operador pode agir) e a (i.a) responde
  pela **cobertura**.
- **(ii)** RLS ligada · **(iii)** zero policy de escrita, pela FORMA.

⚠ **Ordem load-bearing:** o `REVOKE` vem **antes** dos blocos de medição. O endpoint da Management
API roda o corpo inteiro numa transação, então eles medem o estado **depois** da revogação e, se
reprovarem, revertem tudo junto — **a migration prova o próprio efeito**.

⚠ **A pergunta que o review mandou conferir antes** (se o smoke rodasse como `service_role`, o
`REVOKE` derrubaria `(q)`, `(g)`, `(m)` e `(d)`): **medido** — `current_user = session_user =
postgres` e `relowner = postgres`. O dono não é alcançado por `REVOKE`; as sete escritas diretas do
smoke continuam funcionando.

**Ambos os portões provados por execução** contra o estado atual de PROD: rodados sozinhos, (i.a)
reprova listando os 12 pares não-dono e (i.b) reprova listando as 12 combinações com a ACL medida.
Passam a verde exatamente quando o `REVOKE` tiver rodado.

---

### HI-05 (HIGH) — a margem de 150 s calibrada contra uma constante que nada pinava
**Commit:** `16fff5b`
**Arquivos:** `supabase/functions/purgar-retencao/index.ts`, `index.test.ts`, `46-05-SUMMARY.md`

`PRAZO_MS = 120_000`, **ancorado na reivindicação** (não no topo do handler: é ela que ancora a
margem), conferido em três pontos mais o ramo `semUserId`:

| # | Onde | Atribuição | Por quê |
|---|---|---|---|
| 1 | antes de **abrir** o Storage | `postgres` / falha | nada foi tocado; `storage` fica `nao_aplicavel` |
| 2 | entre lotes de `remove` | `storage` / falha | verdade nos dois sentidos: mutou-e-não-completou, ou estava aberto-e-não-completou |
| 3 | antes do motor | `postgres` / falha | `desfechos.storage` **já vale `ok`** |

⚠ **Divergência declarada do texto de HI-05**, que sugeria `storage` também no ponto 3: ali
`desfechos.storage` já vale `'ok'`, e um `ErroDePasso("storage", …)` o **sobrescreveria** para
`'falha'`, afirmando que uma remoção bem-sucedida falhou — a mentira simétrica do RD2-01, do lado
pessimista, num registro com retenção indefinida e sem PITR para desmentir. `(k2)` é a asserção que
fixa isso.

Relógio **injetável** (`deps.agora`, default `Date.now`) porque um orçamento que nenhum teste
consegue estourar é a mesma promessa sem código que HI-05 encontrou nos 150 s.
**Provado por execução nas duas direções:** `semOrcamento() = false` derruba `(k)` e `(k2)`;
`semOrcamento() = true` derruba `(k3)`, o controle positivo.

Corrigido o `46-05-SUMMARY.md`, que descrevia a margem como fechando o cenário inteiro, incluindo o
**resíduo que ela não fecha nem no melhor caso** (worker morto entre o `remove` e o motor).
⚠ O cabeçalho da `20260823000010:114-121` diz o mesmo e **não foi editado**: a migration está
aplicada e seus bytes estão pinados por md5. A correção vive no SUMMARY e no cabeçalho de
`PRAZO_MS`, como o `CLAUDE.md` já faz com a instrução obsoleta de reparo de `version`.

---

## ⚠⚠ ARTEFATOS QUE PRECISAM DE APPLY EM PRODUÇÃO — E EM QUE ORDEM

**Nada abaixo foi aplicado.** O apply é checkpoint explícito do operador.

| # | Artefato | Via | Bloqueia |
|---|---|---|---|
| 1 | `supabase/migrations/20260823000014_p46_portao_flip_veredito.sql` | `node p46apply.cjs migrate <arquivo>` | **o smoke** (ver ⚠ abaixo) e o flip |
| 2 | `supabase/migrations/20260823000015_p46_config_purga_privilegio.sql` | `node p46apply.cjs migrate <arquivo>` | — |
| 3 | Edge Function `purgar-retencao` (HI-03 + HI-05) | `supabase functions deploy purgar-retencao` | — |
| 4 | Re-rodar `supabase/tests/p46_purga_smoke.sql` | `node p46apply.cjs run <arquivo>` | é a **evidência** de 1–3 |

**A ordem 1 → 2 → 3 → 4 é obrigatória, e por uma razão só:**

⚠⚠ **O smoke fica VERMELHO até a migration nº 1 ser aplicada, e isso é correto.** Os casos `(d.8)` e
`(d.9)` montam estados que o corpo **antigo** de `salvar_config_purga` **aceita** — é exatamente o
defeito BL-01. Rodar o smoke antes do apply produz `P46P FAIL (d.8)` / `(d.9)`, que é o portão
mordendo, e não uma regressão. Depois do apply os dois ficam verdes.

⚠ **`(m)` do smoke roda a varredura em `live`** dentro de um envelope revertido. Isso já era verdade
antes deste trabalho e não mudou — mas continua sendo a razão de o smoke ser rodado com atenção, e
foi por isso que **ele não foi executado nesta sessão**.

⚠ **Não rodar o teardown da fixture antes do flip** (o runbook já diz): sem ela, `elegiveis` volta a
zero por aritmética e o critério 3 — agora mais exigente, porque pede **evidência** — deixa de ser
satisfeito.

⚠ **O deploy da EF é retrocompatível:** `deps.agora` é opcional e o bootstrap de produção não o
passa (default `Date.now`).

**Contagem esperada do smoke depois do apply:** `27/27` (nenhuma asserção **letrada** nova; `(d.8)` e
`(d.9)` são **casos dentro de `(d)`**, e `(j)`/`(j2)`/`(k)`/`(k2)`/`(k3)` são testes Deno).

**Prazo real de BL-01:** antes de **2026-09-06**. Não bloqueia a operação de hoje — o portão só é
consultado no flip.

---

## Verificação executada (e onde ela rodou)

Tudo abaixo rodou **no checkout principal** (`workflow.use_worktrees = false`), portanto é
reproduzível a partir da árvore que você está lendo.

| Gate | Resultado |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **96 erros — baseline congelada 96**, inalterada. Nenhum erro novo (as Edge Functions não estão no `tsconfig`) |
| `npm run test:run` (vitest) | **188 arquivos, 1895 testes, 0 falhas** |
| `deno test supabase/functions/purgar-retencao/` | **19 passed, 0 failed** (era 14 antes: +2 de HI-03, +3 de HI-05) |
| Sintaxe SQL das duas migrations | compiladas em `pg_temp` contra o banco vivo — **nunca executadas** |
| Sintaxe do bloco `(d)` do smoke (43 KB) | compilado em `pg_temp` — **nunca executado** |
| Portões novos **provados por execução** | 5 de 5 (ver cada finding) |
| Zero `--no-verify` | confirmado; o hook de pre-commit rodou em todos os commits |

⚠ `deno test supabase/functions/` (a suíte **inteira**) falha em `resend-webhook` por dependência
`npm:svix@1.99.1` ausente do `node_modules` — **pré-existente e sem relação com este trabalho**.

⚠ **Limite honesto:** as duas migrations e os casos `(d.8)`/`(d.9)` foram verificados por **leitura e
compilação**, não por **execução** — porque executá-los é aplicar em PROD ou rodar a varredura em
`live`. A prova de que eles mordem virá do passo 4 do apply.

---

## MEDIUM tocados ou deliberadamente NÃO tocados

Fora de escopo, registrados aqui em vez de resolvidos em silêncio.

- **ME-02 — ⚠ CORRIGIDO, e não silenciosamente.** A cerca (1) do cabeçalho de `(d)` afirmava que as
  linhas em `dry_run`/`live` *"nunca são as reais"*, e isso deixou de valer em T0. Meu próprio
  `(d.9)` **alarga** esse raio (mais um `UPDATE` sobre linhas reais, em subtransação revertida);
  deixar ao lado dele uma afirmação de segurança agora mais falsa seria pior que corrigi-la. O texto
  passou a dizer que quem responde pelo bloco hoje é a cerca **(3)**, a impressão digital **medida**.
- **ME-01 — NÃO FEITO, e é o mais tentador.** `count(*) >= 14` conta **execuções**, não **noites**, e
  o conserto (`count(DISTINCT (iniciada_em AT TIME ZONE 'UTC')::date)`) é **uma linha do mesmo
  `SELECT` que acabei de reescrever**. Não foi feito porque está fora do escopo autorizado. ⚠ Se
  for aceito, é a hora barata: fazê-lo depois custa uma terceira migration sobre a mesma função.
- **ME-04 — parcialmente coberto por efeito colateral.** Dois dos três andaimes mortos do harness
  passaram a ser usados (`selectErro` em `(j2)`; o caminho de erro de RPC em `(j)`). Continuam sem
  teste: `deleteErro` (a falha de `auth.admin.deleteUser` — o único passo sem volta), `listErro`, e
  os ramos `residuo_no_bucket`, `subpasta_no_prefixo`, `excedeu_teto_de_paginas` e `fim?.error`.
- **ME-03, ME-05, ME-06 — não tocados.** ⚠ **ME-06 merece atenção operacional:**
  `docs/compliance/cron-inventory.md` ainda declara o 4º agendamento como **NÃO APLICADA** com oito
  células em ⏳, e o job está vivo (`jobid 6`, `active = true`, conferido nesta sessão). É o artefato
  de conformidade do INVENT-03, e hoje o inventário de registro não registra o estado vivo do job
  que ele existe para registrar.

---

_Consertado: 2026-08-23 · iteração 1 · 6 de 6 achados em escopo · 0 pulados_
_PROD não foi tocada: `modo = dry_run`, cron `active = true`, nenhuma migration aplicada._
