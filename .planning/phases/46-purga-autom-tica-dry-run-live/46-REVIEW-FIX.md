---
fase: 46-purga-automatica-dry-run-live
review_path: .planning/phases/46-purga-autom-tica-dry-run-live/46-REVIEW-3.md
fixed_at: 2026-08-23
iteration: 2
escopo: critical_warning (BLOCKER + HIGH)
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
seguro_aplicar: SIM — com DOIS pre-requisitos operacionais, nenhum deles bloqueante
  para hoje. (1) A alavanca de emergencia trocada em BL-R3-01 tem o PRIVILEGIO
  medido e a EXECUCAO nao: prove `cron.alter_job` desarmando e rearmando num
  momento controlado ANTES de precisar dela. (2) O passo 4 (o smoke) continua
  sendo a unica prova end-to-end de (d.3); a correcao esta provada por execucao
  contra fixture sintetica, nao contra o banco. Os dois BLOCKERS estao fechados e
  o apply em si permanece aditivo e reversivel.
exige_apply_em_prod: true
exige_reverter_prod: false
prod_tocada_por_este_trabalho: false
modo_vigente_em_prod: dry_run
historico_de_iteracoes:
  - iteracao: 1
    review: 46-REVIEW-2.md
    escopo: 6 (BL-01, HI-01..HI-05)
    resultado: 6 consertados, 0 pulados
    veredito_da_re_revisao: 5 de 6 consertaram de fato; DOIS BLOCKERS NOVOS
      introduzidos pelos proprios consertos
  - iteracao: 2
    review: 46-REVIEW-3.md
    escopo: 7 (BL-R3-01, BL-R3-02, HI-R3-01..HI-R3-05)
    resultado: 7 consertados, 0 pulados
---

# Phase 46 · Relatório de conserto — iteração 2 (`46-REVIEW-3.md`)

**Escopo:** BLOCKER + HIGH (`BL-R3-01`, `BL-R3-02`, `HI-R3-01` … `HI-R3-05`).
**Regra de operação obedecida:** **nada foi aplicado em PROD.** Escrita em disco apenas.
**Commits:** `6d47886`, `afe4f45`, `14b3684`, `85b3462`, `479161d`, `4b591fe`, `aa24a42`, `85de7c6`.

---

## ⚠ PRIMEIRO — o estado de PROD depois deste trabalho

Medido por consulta read-only ao fim da sessão, pela mesma via de apply
(`node p46apply.cjs sql`, exclusivamente `SELECT`):

| Fato | Valor |
|---|---|
| `config_purga.modo` | `dry_run` |
| `config_purga.atualizado_em` (T0) | `2026-08-23 02:06:37.866049-03` — **inalterado** |
| `cron.job` jobid 6 `purga-retencao-sweep` | `active = true`, `0 3 * * *` |
| `md5(prosrc)` de `salvar_config_purga` | `9e1a55bee81aaa7b42d45e5a5a8fee7b` — **o corpo da `…0013`**, intocado |
| `has_table_privilege('service_role','config_purga','UPDATE')` | ainda `true` — a `…0015` **não** foi aplicada |
| linhas em `purga_execucoes` / `purga_execucao_itens` | 4 / 10 — inalteradas |
| `logs_auditoria` com `acao = 'alterar_config_purga'` | 1 — inalterada |
| `…0014` / `…0015` no ledger | **0 registradas** |

**A execução das 03:00 de hoje continua em `dry_run` e continua não podendo destruir linha real nem
enfileirar `net.http_post`.** Nenhum dos oito commits toca o corpo de `varrer_purga_retencao`, o
`cron.job`, a `config_purga` ou o bloco `(g.5)`.

Toda interação com PROD nesta sessão foi de três tipos, todos não-mutantes:
1. `SELECT` de catálogo e de contagem;
2. `SELECT` sobre fixtures sintéticas em `VALUES`/`generate_series` — **nenhuma tabela real lida**;
3. `CREATE FUNCTION pg_temp.…` para conferência de **sintaxe**, criadas e **nunca executadas**,
   descartadas com a sessão. Cinco corpos: `(d)/(e)` e `(a)/(g)/(m)/(n)` do smoke, os dois blocos
   `DO` das duas migrations, e `salvar_config_purga` (renomeada para `pg_temp.chk_scp` e com
   `SECURITY DEFINER` removido — o nome real nunca aparece no SQL enviado).

---

## O que foi consertado nesta iteração

### BL-R3-01 (BLOCKER) — o "último recurso" do runbook não executava, e havia rebaixado o que executa
**Commit:** `6d47886` · **Arquivo:** `46-07-RUNBOOK-FLIP.md`

O commit `b4c5aa4` (iteração 1) ofereceu `UPDATE cron.job SET active = false` como alavanca de
emergência e mandou **preferi-la** a `cron.unschedule`. **Medido em PROD, read-only:**

```
current_user = session_user                                    = postgres
has_table_privilege ('postgres','cron.job','UPDATE')           = false
has_column_privilege('postgres','cron.job','active','UPDATE')  = false
```

O `UPDATE` levanta `42501` **antes** de a policy `cron_job_policy` ser consultada. O relatório da
iteração 1 declarava o conserto *"conferido contra PROD (a coluna existe, o jobname confere)"* — as
duas coisas que não importavam. **É o achado HI-04 cometido de novo, no conserto do achado vizinho.**

Substituído por `cron.alter_job(job_id := 6, active := false)`, com o simétrico para reverter.
`cron.unschedule` volta a ser **segunda opção declarada**, com o preço do caminho de volta escrito.
Corrigida também a segunda ocorrência do `UPDATE`, no passo 1 da seção *"se o desligamento não
bastar"*.

**Medido, e é o que justifica a troca:**

| Objeto | `has_function_privilege('postgres', …, 'EXECUTE')` |
|---|---|
| `cron.alter_job(bigint,text,text,text,text,boolean)` | **true** |
| `cron.unschedule(text)` | **true** |
| `cron.unschedule(bigint)` | **true** |

As três são funções **C** de `pg_cron` 1.6.4 — trocam para o dono da extensão internamente, e é por
isso que `cron.schedule` funcionou como `postgres` na `20260823000012`. `cron.job` pertence a
`supabase_admin` e `postgres` carrega **`r*` e mais nada**.

⚠ Registrado no runbook: a assinatura de `alter_job` tem **seis** argumentos (`job_id, schedule,
command, database, username, active`), não sete; omitido é `NULL` e `NULL` é *"não mude"*; e a
chamada deve ser sempre por **argumento nomeado** — posicional aqui é como se troca o `command` de
um job por engano.

**Como foi provado — e o que NÃO foi provado.** Provado por execução read-only: os três privilégios
acima, os dois `has_*_privilege` negativos, `relowner`, e que o `jobid` é `6` com `active = true`.
**NÃO provado: a execução de `cron.alter_job`.** Executá-la é mutar o agendamento de PROD, o que
esta sessão tem proibido. O runbook agora **diz isso com todas as letras** no ponto da alavanca:
*"a alavanca ainda NÃO foi acionada em PROD — o privilégio foi medido, a execução não"*. É o passo
que fecha BL-R3-01 de vez, e é do operador.

**Varredura pela FORMA:** `grep -rn 'UPDATE cron\.job|cron\.job SET'` no repositório — as únicas
ocorrências restantes são os arquivos `46-REVIEW*.md` (evidência congelada, não tocada) e este
relatório. Nenhum outro runbook ou script instrui a desarmar cron por `UPDATE`.

---

### BL-R3-02 (BLOCKER) — `(d.3)` quebrava depois do apply, com diagnóstico FALSO
**Commit:** `afe4f45` · **Arquivo:** `supabase/tests/p46_purga_smoke.sql`

`(d.3)` é o **único** caso do bloco que **destrói e reconstrói** o recorte. O `DELETE` de itens
levava junto o item com `relato_dry_run` que o próprio conserto de BL-01 acabara de plantar, e a
reconstrução por `generate_series` não inseria item nenhum — **treze cabeçalhos, zero itens**. Com o
critério 3 novo (`elegiveis > 0 AND EXISTS (item com relato_dry_run)`), **dois** critérios passavam a
faltar, o marcador virava `execucoes+elegiveis` contra `execucoes` esperado, e a mensagem de FAIL
acusava **a mensagem da RPC** de nomear critérios a mais — com a RPC certa e a **fixture** podre.

Conserto, em três partes:
- a inserção é **partida em duas**: a execução de `elegiveis > 0` (−20 dias) sai com `RETURNING id`;
- o item com `relato_dry_run` é **replantado** nela, fechado e sob execução `concluida` (a mesma
  propriedade de segurança do item de `(d)`: um item sintético **aberto** sob execução `executando`
  seria autorização destrutiva plantada por um teste);
- a montagem passa a **MEDIR as duas propriedades** — 13 execuções **e** 1 com evidência —, com uma
  asserção nova cujo texto diz, em maiúsculas, que **o defeito está na FIXTURE e não na RPC**.
  Medir só a contagem foi o buraco inteiro: a segunda propriedade apodreceu em silêncio e o sintoma
  apareceu seis asserções adiante como acusação falsa.

**PROVADO POR EXECUÇÃO** — read-only, fixture sintética em `VALUES`/`generate_series` (nenhuma
tabela real lida ou escrita), reproduzindo **verbatim** os `format()` de `20260823000014:440-461` e
a extração de marcadores de `p46_purga_smoke.sql:3485-3490`:

| cenário | crit 1 (14 dias) | crit 2 (14 exec) | crit 3 (ensaio c/ evidência) | `v_marc[2]` | smoke |
|---|---|---|---|---|---|
| **A** · como estava (13 cabeçalhos, zero itens) | true | **false** | **0** | `execucoes+elegiveis` | ⛔ **VERMELHO** |
| **B** · com o item replantado | true | **false** | **1** | `execucoes` | ✅ **VERDE** |

E o caso **continua MORDENDO**: em (B) o critério 2 segue falso (13 < 14), ou seja a RPC continua
recusando com `22023`, e **por ele só**. O cenário (A) é exatamente o teste que o review pediu
("zerar a evidência daquela linha tem de fazer o marcador voltar a `execucoes+elegiveis`") — ele é a
linha de cima da tabela.

⚠ **O que não foi provado:** a execução real do smoke contra PROD. `(m)` roda a varredura em `live`
dentro de um envelope revertido, e rodá-lo é ato de operador. **A prova definitiva de `(d.3)` é o
passo 4 do apply.** Se ele vier vermelho em `(d.3)`, leia primeiro a asserção nova da fixture: ela
reprova ANTES da de marcadores e diz onde está o defeito.

⚠ Reconferidos com a mesma lente, e **corretos** com o critério novo: `(d.2)` (não apaga itens),
`(d.4)` (zera `elegiveis`; marcador `elegiveis` é o esperado), `(d.5)`, `(d.8)`, `(d.9)`, `(d.6)`.
**Apenas `(d.3)` reconstruía o ledger.** Conferido também que não há índice único sobre
`(execucao_id, candidato_id)` que a linha replantada pudesse violar — só as PKs por `id`.

---

### HI-R3-01 (HIGH) — a conferência de md5 dos dois cabeçalhos não reproduzia o ledger
**Commit:** `14b3684` · **Arquivos:** `…0014` e `…0015`

`printf '%s' "$(cat …)"` **remove as quebras de linha finais**; o ledger guarda os bytes crus
(`p46apply.cjs` faz `fs.readFileSync` e registra o mesmo buffer em `statements[1]`). O operador que
seguisse a instrução escrita veria **divergência num apply CORRETO**.

**MEDIDO contra a `20260823000013`, que já está aplicada e pinada:**

```
md5(statements[1]) lido do ledger      = 63feeec5f3d55ea4371fa6fb5954d10a
md5 -q do arquivo (bytes crus)         = 63feeec5f3d55ea4371fa6fb5954d10a   ✅
printf '%s' "$(cat arquivo)" | md5     = c410a6723d0f8557bc3c7b13e7ddc7b0   ⛔
octet_length(statements[1])            = 38678  = tamanho do arquivo em disco
```

⚠ **Correção de um número do review:** `46-REVIEW-3.md:283` cita `octet_length` 37435 para a
`…0013`. **O valor medido é 38678**, idêntico ao `wc -c` do arquivo — o que é coerente com o md5
bater. O achado do review está certo; o número está errado.

**E o comando novo MORDE:** um único byte a mais no arquivo devolve `f6bace4ea92832dc9e5a0d4ce20a4c9d`.
Três formas independentes reproduzem o valor do ledger (`md5 -q`, `openssl md5 -r`, e o
`crypto.createHash('md5')` que o próprio `p46apply.cjs` usa) — só a forma herdada não.

**Varredura pela FORMA:** a instrução errada aparece **como instrução** em **18 cabeçalhos** de
migration, e **os dezoito estão aplicados e pinados por md5** — corrigi-los faria o hash divergir do
ledger e quebraria a própria prova, exatamente como o `CLAUDE.md` já registra sobre a instrução
obsoleta de reparo de `version`. Só `…0014` e `…0015` estão fora do ledger; são as duas corrigidas, e
**o motivo de as outras ficarem está escrito dentro delas**. Os demais focos (`46-PATTERNS.md`, o
todo `processo-origem-do-drift-desconhecida.md`, os SUMMARY das Phases 43 e 45) são **citações
históricas** do cabeçalho herdado — reescrevê-las falsificaria o registro do que de fato foi escrito
na época. Registrados, não tocados.

---

### HI-R3-02 + ME-R3-05 (HIGH + MEDIUM) — a guarda vira a TRANSIÇÃO, e o `PERFORM` vira cópia única
**Commit:** `85b3462` · **Arquivo:** `…0014`

⚠ Os dois foram feitos **no mesmo diff**, como o review pediu: a forma sem duplicação resolve os
dois de uma vez, e a `…0014` ainda não está no ledger — editar agora custa zero, depois custa uma
terceira migration sobre a mesma função.

A guarda era `v_modo_novo = 'off'`, o **estado resultante**. O passo (5) só recusa a não-op
**completa**, então `modo_antes = 'off'` + `p_modo = NULL` + `p_cap_titulares = 25` caía no ramo
degradado: uma **alteração de política de retenção** commitaria sem trilha num registro de
conformidade, e o `WARNING` imprimiria `modo off -> off`, afirmando às três da manhã um desligamento
que não houve.

**PROVADO POR EXECUÇÃO** — tabela-verdade read-only sobre `VALUES`:

| antes → novo | guarda **ANTIGA** degrada | guarda **NOVA** degrada | texto do `WARNING` |
|---|---|---|---|
| `off` → `off` | **true** | **false** | seria `modo off -> off` |
| `dry_run` → `off` | true | true | `modo dry_run -> off` |
| `live` → `off` | true | true | `modo live -> off` |
| `dry_run` → `live` | false | false | — |
| `live` → `dry_run` | false | false | — |

A guarda nova **morde exatamente onde a antiga era larga** e **não encolheu** o caso que HI-01 existe
para cobrir. E o texto do `WARNING` volta a ser verdadeiro **por construção**.

**ME-R3-05:** as duas cópias verbatim do `PERFORM log_auditoria(…)` — onze argumentos nomeados cada,
`format()` de seis substituições — viraram **uma**, com a assimetria num lugar só: o handler. O
`RAISE;` nu re-levanta a exceção **original**, com `SQLSTATE` e mensagem intactos, então a
atomicidade de `-> live` fica **idêntica**; a subtransação extra é irrelevante numa função chamada
por um humano algumas vezes na vida do sistema.

⚠ **O que NÃO mudou, e foi reconferido linha a linha:** o escopo do handler continua sendo **só** o
`PERFORM`. O `UPDATE` do passo (7) e o `SELECT to_jsonb` do (7.5) estão **fora** do bloco — uma falha
da MUTAÇÃO propaga e derruba a chamada. **O kill switch não pode silenciosamente não funcionar.**

O `COMMENT ON FUNCTION` e os dois blocos de prosa do cabeçalho foram reescritos junto: a promessa
gravada **dentro do catálogo** agora descreve a transição, e não o estado.

⚠ **Limite honesto:** nenhum teste força `log_auditoria` a levantar dentro de `salvar_config_purga`,
então o ramo degradado continua correto **por construção** e não por execução. É a pergunta 4 em
aberto do `46-REVIEW-3.md`, e ela continua aberta.

---

### HI-R3-03 (HIGH) — a frase que HI-02 provou falsa, seis linhas acima da condição que a refuta
**Commit:** `4b591fe` · **Arquivo:** `p46_purga_smoke.sql`

O conserto de HI-02 corrigiu a frase gêmea no `46-06-SUMMARY.md` **no mesmo commit** e deixou o
comentário do smoke intacto — e o comentário é o que o próximo leitor abre.

Reescrito para dizer o que as quatro condições de fato provam: **o laço `(g)` abriu um item por
titular e o fechamento `(h)` não os fechou** — pré-condição do hop, não evidência dele. O texto
antigo fica citado, marcado como falso, com o motivo (o `(g.5)` só escreve no ledger no caminho de
FALHA; apague-o e as quatro continuam verdadeiras), e com o ponteiro para a **quinta** condição, que
é a única que mede o dispatch.

---

### HI-R3-04 (HIGH) — o orçamento de parede não é um relógio, e o cabeçalho prometia que era
**Commit:** `aa24a42` · **Arquivos:** `purgar-retencao/index.ts`, `46-05-SUMMARY.md`

⚠⚠ **DIVERGÊNCIA DECLARADA do conserto sugerido** — e ela é o motivo de o conserto ser de prosa.

O review propõe um `comPrazo` com `Promise.race` aplicado ao `rpc("anonimizar_candidato")` e a cada
`remove`. **`Promise.race` não cancela a operação perdedora.** O `rpc` continuaria rodando e
**commitando no servidor** enquanto esta função já teria gravado `desfecho_postgres = 'falha'` e
fechado o item — uma **afirmação falsa** num registro de conformidade com retenção indefinida e sem
PITR para desmentir. É a mentira simétrica que a divergência do cheque 3 existe para evitar, **só
que pior**: aquela diria que uma remoção bem-sucedida falhou; esta diria que a anonimização falhou
quando ela **aconteceu**, e é sobre a anonimização que o ledger responde. O conserto correto é
**cancelamento de verdade** (`AbortSignal` propagado até o transporte), não corrida — e o review
explicitamente aceita a alternativa (*"enquanto isso não existir, corrigir o cabeçalho para dizer o
que o código faz"*).

O cabeçalho de `PRAZO_MS` afirmava *"a função desiste SOZINHA antes dos 150 s"* e *"a garantia deixa
de depender do runtime"*. Passa a dizer o que o mecanismo entrega: **"a função não COMEÇA um passo
novo depois do prazo"**, com a lista completa das operações sem timeout (`plano_exclusao_titular`, o
`select` de `candidatos`, até 50 páginas de `list`, cada `remove`, `anonimizar_candidato`,
`deleteUser`, `concluir_item_purga`), o fato de que **uma única chamada travada atravessa
`T_c + 150 s` com o cheque já feito e o RD2-03 reabre**, e que o cheque 3 não cobre o intervalo até o
retorno do motor. O que ele entrega de fato — desfecho **honesto** nos quatro pontos em vez de
`SIGKILL` sem carimbo — fica dito sem inflar.

A mesma correção foi ao `46-05-SUMMARY.md:140`, que dizia *"Consertado no commit de HI-05"*: o
pressuposto ficou **menos decisivo**, não sem dono.

**Verificação:** `deno test supabase/functions/purgar-retencao/` → **19 passed, 0 failed**. Nenhum
comportamento mudou; `(k)`, `(k2)` e `(k3)` continuam provando o orçamento nas duas direções.

---

### HI-R3-05 (HIGH) — a família "EXAUSTIVA" com lista literal de verbos, omitindo o verbo que a própria migration argumenta
**Commit:** `479161d` · **Arquivo:** `…0015`

⚠ **É a casa do defeito em estado puro**, e por isso o conserto não foi acrescentar `'TRIGGER'` à
lista. O bloco `(i.a)` se apresentava como *"sem lista de papéis, sem lista de verbos conhecidos por
nome"* e trazia, três linhas abaixo, `privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE')` —
omitindo o `TRIGGER` que o `REVOKE` da **mesma migration** executa e que o cabeçalho justifica por
extenso como *"a segunda porta da mesma classe"*. Resultado: o `REVOKE` de `TRIGGER` **não era
conferido por nada**, e o `COMMENT ON TABLE` afirmava, dentro do catálogo, que ele estava revogado.

Conserto **pela FORMA**:
- **`(i.a)` passa a perguntar por ALLOWLIST DE TOLERADOS** (`v_verbos_ok = SELECT, REFERENCES,
  MAINTAIN` — os que não alteram **conteúdo**) em vez de lista de proibidos. **A direção em que a
  lista envelhece inverte:** proibidos deixam passar o verbo que ainda não existia — foi assim que
  `TRIGGER` escapou, e `MAINTAIN` nasceu no PG17 sem que ninguém revisasse —; tolerados deixam o
  desconhecido **de fora**, que é a direção segura num portão que responde por *"não existe caminho
  de escrita além de `salvar_config_purga`"*. É a mesma doutrina de "allowlist, jamais negação" que
  o critério de veredito da `…0014` já usa, agora no eixo dos verbos.
- **`(i.b)`** mantém a lista **nomeada** (ela é boa para o diagnóstico), agora idêntica verbo por
  verbo à do `REVOKE`, com a obrigação de mudarem juntas escrita ao lado.
- **O `COMMENT ON TABLE` passa a dizer o que SOBREVIVE ao `REVOKE`** — `SELECT`, `REFERENCES` e
  `MAINTAIN` nos três papéis, e por que nenhum altera conteúdo. O catálogo não pode prometer mais do
  que executa.

**PROVADO POR EXECUÇÃO** — read-only, contra a ACL viva de `public.config_purga`:

| família | pares reportados hoje |
|---|---|
| **ANTIGA** (4 verbos literais) | **12** |
| `TRIGGER` — invisível para a antiga | **3** (`anon`, `authenticated`, `service_role`) |
| **NOVA** (allowlist de tolerados) | **15**, e nomeia os três `:TRIGGER` |
| **NOVA**, simulando o estado **depois** do `REVOKE` dos 5 verbos | **vazio = VERDE** |

A última linha importa tanto quanto a primeira: a família nova **morde hoje** e **não reprova
trabalho correto** depois do apply.

**Varredura pela FORMA no repositório** (`privilege_type IN (` · `ARRAY['<verbo>'` ·
`has_table_privilege(`): o único outro foco é `20260823000006:1078-1096`, cujas listas de verbos por
tabela são **escopo argumentado** e **não estão pareadas com um `REVOKE` no mesmo arquivo** — a
assimetria que fez deste um achado está ausente lá. E aquela migration está **aplicada e pinada**,
portanto ineditável. Registrado, não tocado.

---

### ME-R3-03 (MEDIUM) — corrigido porque é prosa contradizendo o código, e você pediu
**Commit:** `85de7c6` · **Arquivo:** `46-07-SUMMARY.md`

`:213` dizia *"`(d)` — sete chamadas de controle, e as sete rodam"* enquanto o smoke exige **nove**
(`:3518`). O commit `f9cb62b` editou este mesmo arquivo e deixou a linha. A tabela ganhou os casos 8
e 9, o caso 3 registra a evidência replantada, e ficou escrito que **a ordem de execução não é a
numeração** — `v_d_st[6]=(d.8)`, `[7]=(d.9)`, `[8]=(d.6)`, `[9]=(d.7)`, conferido contra o bloco de
julgamento.

⚠ **Registrado e NÃO consertado em silêncio — não é achado do `46-REVIEW-3.md`.** Das nove chamadas,
**oito** usam notação nomeada e **uma não**: `p46_purga_smoke.sql:3436`, que é o **controle positivo
`(d.6)`** — o único ponto do arquivo em que `p_confirmo_live := true` de fato autoriza o flip. A
semântica é idêntica; o que ela contradiz é a regra que a própria seção `[Rule 1]` daquele SUMMARY
estabelece, e no ponto em que a regra mais importa. A prosa do SUMMARY passou a dizer isso; **o
código não foi tocado.**

---

## Verificação executada (e onde ela rodou)

⚠ **Tudo abaixo rodou no CHECKOUT PRINCIPAL** (`workflow.use_worktrees = false`) — portanto é
reproduzível a partir da árvore que você está lendo, e não de um worktree descartado.

| Gate | Resultado |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **96 erros — baseline congelada 96**, inalterada |
| `npm run test:run` (vitest) | **188 arquivos, 1895 testes, 0 falhas** |
| `deno test supabase/functions/purgar-retencao/` | **19 passed, 0 failed** |
| `npm run check:resend-dominio` | PASS |
| `npm run check:export-allowlist` | PASS |
| `npm run check:recibo-exclusao` | PASS |
| `npm run check:matriz-retencao` | PASS |
| `npm run check:pii-inventory-md` | PASS |
| Sintaxe SQL — 5 corpos | compilados em `pg_temp` contra o banco vivo, **nunca executados** |
| Hook de pre-commit | rodou nos **oito** commits; **zero `--no-verify`** |

⚠ `deno test supabase/functions/` (a suíte **inteira**) continua falhando em `resend-webhook` por
`npm:svix@1.99.1` ausente do `node_modules` — **pré-existente e sem relação com este trabalho**.

### Portões provados por EXECUÇÃO nesta iteração — 4 de 7

| Achado | Prova | Onde |
|---|---|---|
| `BL-R3-02` | fixture sintética A/B: marcador `execucoes+elegiveis` → `execucoes`, e continua recusando pela contagem | read-only, `VALUES` |
| `HI-R3-01` | 3 formas reproduzem o ledger, a herdada não; +1 byte muda o hash | disco + ledger read-only |
| `HI-R3-02` | tabela-verdade das 5 transições: a guarda nova morde onde a antiga era larga | read-only, `VALUES` |
| `HI-R3-05` | 12 → 15 pares, `TRIGGER` nomeado; e **vazio** depois de simular o `REVOKE` | read-only, ACL viva |

### O que NÃO foi provado, e por quê — leia antes de confiar

1. **`cron.alter_job` nunca foi executada.** Privilégio medido (`EXECUTE = true`), execução não —
   executá-la é mutar o agendamento de PROD. **Prová-la é o passo que fecha `BL-R3-01` de vez.**
2. **O smoke não foi executado.** `(m)` roda a varredura em `live` num envelope revertido; rodá-lo é
   ato de operador. A prova end-to-end de `(d.3)` é o **passo 4** do apply.
3. **O ramo degradado da trilha não é exercitado por teste nenhum.** Nenhum smoke força
   `log_auditoria` a levantar dentro de `salvar_config_purga`. Correto por construção, não por
   execução.
4. **O teto de parede real do Edge Runtime deste projeto** continua sem medição e sem pino — e o
   `PRAZO_MS` o torna menos decisivo, não irrelevante (é o conteúdo de `HI-R3-04`).

---

## ⚠⚠ ARTEFATOS QUE PRECISAM DE APPLY EM PRODUÇÃO — E EM QUE ORDEM (corrigido)

**Nada abaixo foi aplicado.** O apply é checkpoint explícito do operador.

| # | Artefato | Via | Depende de |
|---|---|---|---|
| 1 | `supabase/migrations/20260823000014_p46_portao_flip_veredito.sql` | `node p46apply.cjs migrate <arquivo>` | nada |
| 2 | `supabase/migrations/20260823000015_p46_config_purga_privilegio.sql` | `node p46apply.cjs migrate <arquivo>` | nada |
| 3 | Edge Function `purgar-retencao` | `supabase functions deploy purgar-retencao` | nada |
| 4 | Re-rodar `supabase/tests/p46_purga_smoke.sql` | `node p46apply.cjs run <arquivo>` | **1 e 2** |

### ⚠ A ordem "obrigatória" da iteração 1 estava ERRADA — ME-R3-02

O relatório anterior dizia *"a ordem 1 → 2 → 3 → 4 é obrigatória"*. **Não é.** Verificado item a
item:

- **`…0014` × `…0015` são independentes.** Tocam objetos diferentes (`salvar_config_purga` ×
  privilégios de tabela de `config_purga`); nenhuma lê ou escreve o que a outra cria.
- **O deploy da EF é independente das duas.** O dispatch só ocorre em `live`, e o modo é `dry_run`.
- **Aplicar `…0014` e parar deixa o sistema consistente e seguro overnight** — a função alterada não
  está no caminho do cron (`cron.job` jobid 6 → `SELECT public.varrer_purga_retencao();`).

**A única restrição real é: as DUAS migrations antes do smoke.** E ela vale por dois motivos:

1. `(d.8)` e `(d.9)` montam estados que o corpo **antigo** de `salvar_config_purga` **aceita** — é
   o defeito BL-01. Rodar o smoke antes produz `P46P FAIL (d.8)`/`(d.9)`, que é o portão mordendo, e
   não regressão.
2. ⚠ **O motivo que o relatório anterior não registrava:** `(q)`, `(g)`, `(m)` e `(d)` escrevem
   `config_purga` **direto**, e isso só continua funcionando porque o smoke roda como o **DONO** —
   medido nesta sessão: `current_user = session_user = postgres` e `pg_class.relowner(config_purga)
   = postgres`. O `REVOKE` da `…0015` **não alcança o dono**. Se a via de execução do smoke mudar
   depois da `…0015`, ele reprova com `42501` — e a mensagem será clara, mas o operador precisa
   saber disso de antemão.

### Depois do apply, confira o md5 assim — e **não** pela forma herdada

```bash
md5 -q supabase/migrations/20260823000014_p46_portao_flip_veredito.sql      # macOS
md5sum  supabase/migrations/20260823000014_p46_portao_flip_veredito.sql     # Linux
```
```sql
SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations WHERE version = '20260823000014';
```

⛔ `printf '%s' "$(cat …)" | md5` dá **falso negativo** (HI-R3-01). O `p46apply.cjs` já faz o
cross-check certo sozinho e **aborta** se divergir — a conferência manual existe para outra via.

### Outras cercas do apply, mantidas da iteração 1

- ⚠ **Não rodar o teardown da fixture antes do flip:** sem ela `elegiveis` volta a zero por
  aritmética, e o critério 3 — agora mais exigente, porque pede **evidência** — deixa de ser
  satisfeito.
- ⚠ **O deploy da EF é retrocompatível:** `deps.agora` é opcional e o bootstrap de produção não o
  passa (default `Date.now`).
- **Contagem esperada do smoke depois do apply:** `27/27`. Nenhuma asserção **letrada** nova nesta
  iteração — a asserção de fixture de `(d.3)` é uma condição **dentro** de `(d)`, como `(d.8)` e
  `(d.9)`. ⚠ Esta previsão é a mesma que a iteração 1 fez e errou; ela vale agora **porque** o
  cenário que a derrubava está fechado e provado, mas continua sendo previsão até o passo 4.
- **Prazo real de BL-01:** antes de **2026-09-06**. Não bloqueia a operação de hoje — o portão só é
  consultado no flip.

### Antes de precisar dela: prove a alavanca de emergência

Num momento controlado (não às três da manhã), execute e confira `active` nas duas pontas:

```sql
SELECT jobid, jobname, active FROM cron.job WHERE jobname = 'purga-retencao-sweep';  -- espera true
SELECT cron.alter_job(job_id := 6, active := false);
SELECT jobid, jobname, active FROM cron.job WHERE jobname = 'purga-retencao-sweep';  -- espera false
SELECT cron.alter_job(job_id := 6, active := true);
SELECT jobid, jobname, active FROM cron.job WHERE jobname = 'purga-retencao-sweep';  -- espera true
```

**Uma alavanca de emergência que nunca foi acionada é uma promessa sem código** — foi exatamente o
que HI-05 encontrou nos 150 s, e o que BL-R3-01 encontrou no `UPDATE cron.job`.

---

## MEDIUM/LOW do `46-REVIEW-3.md` — o que ficou em aberto

Fora de escopo, registrados aqui em vez de resolvidos em silêncio.

- **ME-R3-05 — ⚠ FEITO**, junto com HI-R3-02 (ver acima). O review pediu explicitamente que fossem o
  mesmo diff, e a `…0014` ainda não estava no ledger.
- **ME-R3-02 — ⚠ CORRIGIDO neste relatório**, que é onde a afirmação errada vivia (a tabela de apply
  acima).
- **ME-R3-03 — ⚠ CORRIGIDO**, porque é prosa contradizendo código adjacente (ver acima).
- **ME-R3-01 — NÃO FEITO.** Os critérios 1 e 2 continuam contando execuções que abriram item sem
  chamar o motor, e há uma delas em PROD (2026-08-22 20:03, 6 itens, **zero** com `relato_dry_run`)
  **ancorando o relógio dos 14 dias ~6 h antes do T0 declarado no runbook**. Não é regressão — é o
  limite declarado da divergência da iteração 1, e a conjunção é estritamente mais forte que qualquer
  metade. O que falta é o registro: o `COMMENT` e o runbook descrevem os três critérios como se os
  três medissem ensaio, e **só o 3 mede**. ⚠ Se for aceito, **é agora a hora barata** — a `…0014`
  ainda não está no ledger.
- **ME-R3-04 — NÃO FEITO.** A tolerância silenciosa de `(m)`: se qualquer leitura de
  `net.http_request_queue` levantar, `v_fila_ok := false` e a **única** condição que mede o dispatch
  é pulada com `(m)` reportando PASS. Medido hoje: `has_table_privilege('postgres',
  'net.http_request_queue','SELECT') = true` — não é vácuo agora, mas nada garante que continue.
- **ME-R3-06 — NÃO FEITO.** A semântica nova de `processados` (quatro caminhos passam a contar
  titular processado sem que o motor tenha rodado) não é medida por asserção nenhuma, e `processados`
  é a coluna que a tabela de vigilância do runbook manda ler todas as manhãs.
- **LO-R3-01 … LO-R3-04 — NÃO FEITOS.**
- **ME-01 do `46-REVIEW-2.md` — continua em aberto** (`count(*) >= 14` conta execuções, não noites), e
  o mesmo argumento de "agora é barato" se aplica.
- **ME-06 do `46-REVIEW-2.md` — continua merecendo atenção operacional:**
  `docs/compliance/cron-inventory.md` ainda declara o 4º agendamento como **NÃO APLICADA** com oito
  células em ⏳, e o job está vivo (`jobid 6`, `active = true`, reconferido nesta sessão).

---

## Iteração 1 — o registro do que foi feito antes (preservado)

> **Escopo:** BL-01, HI-01 … HI-05 do `46-REVIEW-2.md`. 6 de 6, 0 pulados.
> **Commits:** `4b1de36`, `16fff5b`, `21d7352`, `dbdf1fe`, `b4c5aa4`, `f9cb62b`.

- **BL-01** — o portão do flip contava como ensaio execuções que não ensaiaram nada. Migration
  **nova** `…0014` com `CREATE OR REPLACE` (a `…0013` está aplicada e pinada por md5). Allowlist de
  `veredito` (`IN ('dry_run','despachado')`, jamais negação) e critério 3 medindo **evidência**
  (`elegiveis > 0 AND EXISTS (item com relato_dry_run)`), em **conjunção** — divergência declarada do
  texto do review, e a re-revisão a julgou **acertada**. Medido em PROD: o recorte antigo contava 2
  execuções como ensaio, o novo conta 1. Vigilância nova: `(d.8)` e `(d.9)`; chamadas de controle
  7 → 9. ⚠ **A fixture que provava o portão vivia, ela própria, no estado de BL-01.**
  ⚠⚠ **E o conserto quebrou `(d.3)`** — é o `BL-R3-02` desta iteração.
- **HI-01** — o kill switch podia ser recusado por falha na escrita da trilha. A trilha passa a ser
  degradada para `WARNING` na transição `→ off`; para `→ live` continua atômica. A re-revisão
  confirmou linha a linha que o `EXCEPTION` envolve **só** o `PERFORM` — o ponto crítico está certo.
  ⚠⚠ Falhas: guarda pelo estado (`HI-R3-02`), duplicação (`ME-R3-05`) e, **no runbook, uma alavanca
  de emergência que não executa** (`BL-R3-01`).
- **HI-02** — a "prova durável de que o dispatch rodou" não media o dispatch. Quinta condição em
  `(m)`: `v_fila_m = v_fila_g + v_m_eleg`, com baseline capturada na própria execução. Apagar `(g.5)`
  agora deixa `(m)` **vermelho**. ⚠ Falhas: tolerância silenciosa (`ME-R3-04`) e a frase falsa
  deixada no comentário do smoke (`HI-R3-03`).
- **HI-03** — a EF gravava `desfecho_storage = 'falha'` sem ter tocado o Storage. Os três `throw`
  anteriores ao `enumerarObjetos` passam ao **Postgres**, `desfecho_storage` fica `nao_aplicavel`, e
  `(j)`/`(j2)` aferem o **objeto gravado** e não o status HTTP. Provado por execução: com a
  atribuição antiga, 16 passed → 14 passed | 2 failed. ⚠ Falha: `ME-R3-06`.
- **HI-04** — *"esta função é o único caminho de escrita"* verificado do lado errado da porta.
  Migration nova `…0015`: `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER` nominal de `PUBLIC` +
  os três papéis, com quatro famílias de auto-verificação e o `REVOKE` **antes** da medição, para que
  a migration prove o próprio efeito. A re-revisão chamou-o de **o melhor conserto do lote**.
  ⚠ Falha: a família "exaustiva" tinha lista literal de verbos e omitia `TRIGGER` (`HI-R3-05`).
- **HI-05** — a margem de 150 s calibrada contra uma constante que nada pinava. `PRAZO_MS = 120_000`
  conferido em três pontos mais o ramo `semUserId`, com relógio **injetável** e três testes que
  provam que morde nas duas direções. ⚠ **Divergência declarada** no ponto 3 (`postgres` em vez de
  `storage`) — a re-revisão julgou-a **certa e o review anterior errado**. ⚠ Falha: o mecanismo é
  por checkpoint e não por relógio, e o cabeçalho prometia o contrário (`HI-R3-04`).

> **Verificação da iteração 1:** `npm run lint` 96/96 · `npm run test:run` 188 arquivos, 1895 testes,
> 0 falhas · `deno test purgar-retencao/` 19 passed · portões novos provados por execução 5 de 5 ·
> zero `--no-verify`.
> ⚠ **Limite honesto declarado na época, e que a re-revisão mostrou ser o buraco:** as duas
> migrations e os casos `(d.8)`/`(d.9)` foram verificados por **leitura e compilação**, nunca por
> **execução** — e a previsão de `27/27` estava, por isso, incorreta.

---

## O que esta iteração aprendeu, e que vale mais que os sete consertos

**Os dois BLOCKERS da rodada 3 foram introduzidos pelos consertos da rodada 1, e os dois eram
diagnóstico FALSO** — a forma que o `CLAUDE.md` cataloga como a pior das duas. Um portão que reprova
trabalho correto acusando o lugar errado custa mais que um portão quebrado.

O padrão comum aos dois: **o conserto endureceu um critério e não reconciliou o que dependia dele.**
BL-01 endureceu o critério 3 e não reconciliou a fixture de `(d.3)`; HI-01 acrescentou uma alavanca
ao runbook e não conferiu que o statement **executa**. Nos dois casos a iteração 1 declarou
verificação — e verificou a coisa vizinha.

A defesa que esta iteração acrescentou, e que não existia: **onde um conserto criou uma dependência
nova, a dependência passou a ser MEDIDA no ponto em que é montada**, com uma mensagem que nomeia o
lado certo do defeito. A asserção de fixture de `(d.3)` reprova **antes** da asserção de marcadores e
diz, em maiúsculas, *"A FIXTURE, E NÃO A RPC"*. Sem ela, o mesmo apodrecimento voltaria a aparecer
como acusação contra código correto.

---

_Consertado: 2026-08-23 · iteração 2 · 7 de 7 achados em escopo · 0 pulados_
_PROD não foi tocada: `modo = dry_run` (T0 intacto), `cron.job` jobid 6 `active = true`, `md5(prosrc)`
de `salvar_config_purga` = `9e1a55bee81aaa7b42d45e5a5a8fee7b`, 0 migrations novas no ledger._
