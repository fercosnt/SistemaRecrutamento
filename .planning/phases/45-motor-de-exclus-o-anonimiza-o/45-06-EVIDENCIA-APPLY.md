# Phase 45 / 45-06 Task 1 — Apply do tracer em PROD

**Executado:** 2026-08-05 · **Por:** orquestrador (main thread, MCP `apply_migration`)
**Natureza:** aditivo. Zero `DELETE`, zero `DROP TABLE`, zero `DROP COLUMN`, zero `UPDATE` sobre PII.

---

## Veredito

| | |
|---|---|
| `20260805000001_p45_pedido_exclusao` | ✅ aplicada · md5 **bate** · ledger reconciliado |
| `20260805000002_p45_rpc_pedido_exclusao` | ✅ aplicada · md5 **bate** · ledger reconciliado |
| Asserção negativa ERASE-08 (3 FKs `NO ACTION`) | ✅ `confdeltype = 'a'` nas três, **depois** do apply |
| Contagens de linha viva | ✅ **inalteradas** |
| Auto-verificação do caminho feliz | ✅ executou **e reverteu** — `solicitacoes_dados` segue em 0 |

**Nenhum 42601.** O `apply_migration` aceitou a migration com dois corpos delimitados por cifrões
cercados de `REVOKE`/`GRANT`/`COMMENT` — que é exatamente por que ele é o caminho deste projeto e
`db push` é proibido.

---

## ⚠ Correção ao critério de aceitação do plano — o md5 comparado como estava escrito NÃO passaria

O plano exige *"o `md5(statements[1])` bate o md5 computado do arquivo"*. **Medido: não bate, e
nunca bateria** — mas não porque o ledger seja infiel.

`length(statements[1])` conta **caracteres**; `wc -c` conta **bytes**. Comparando na mesma unidade
sobre as três migrations anteriores do M8, a diferença é de **exatamente 1 caractere** em todas:

| version | arquivo (chars) | ledger (chars) | Δ |
|---|---|---|---|
| `20260803000001` | 8453 | 8452 | 1 |
| `20260804000001` | 12589 | 12588 | 1 |
| `20260804000002` | 21445 | 21444 | 1 |

É o **newline final**, descartado no apply. Com ele removido, o md5 bate nas três:

```bash
printf '%s' "$(cat <arquivo>)" | md5 -q
```

**A receita correta**, então, é comparar contra o md5 do arquivo **sem o newline final**. Registrado
aqui para que a Phase 46/47 não repita a investigação — e porque um critério que não pode passar
treina a ignorá-lo.

⚠ Isto também **refuta**, para estas três, a preocupação registrada no cabeçalho das migrations
(*"duas das cinco migrations do M8 chegaram a PROD com os comentários descartados por essa via"*):
o ledger guarda o arquivo **fielmente**, comentários inclusive.

---

## Estado ANTES do apply

```sql
SELECT (SELECT count(*) FROM public.solicitacoes_dados)      AS solicitacoes_dados,
       (SELECT count(*) FROM public.historico_candidatura)    AS historico_candidatura,
       (SELECT count(*) FROM public.decisao_final)            AS decisao_final,
       (SELECT count(*) FROM public.decisao_final_historico)  AS decisao_final_historico,
       (SELECT count(*) FROM public.notificacoes_enviadas)    AS notificacoes_enviadas,
       (SELECT count(*) FROM public.candidaturas)             AS candidaturas,
       (SELECT count(*) FROM public.candidatos)               AS candidatos,
       … + existência das colunas/tabela novas + confdeltype das 3 FKs;
```

| medida | valor |
|---|---|
| `solicitacoes_dados` | **0** |
| `historico_candidatura` | **5** |
| `decisao_final` / `decisao_final_historico` | **1** / **0** |
| `notificacoes_enviadas` | **3** |
| `candidaturas` / `candidatos` | **9** / **22** |
| `candidaturas.encerrada_a_pedido_em` existe? | **0** (não existia) |
| `config_janela_exclusao` existe? | **0** (não existia) |
| 3 FKs `NO ACTION` (`confdeltype`) | `decisao_final=a, decisao_final_historico=a, historico_candidatura=a` |

---

## Apply 1 — `20260805000001_p45_pedido_exclusao`

**Ordem:** primeira, por desenho — cria a tabela que a `registrar_pedido_exclusao` LÊ e as colunas
que ela ESCREVE. Não tem corpo delimitado por cifrões, então uma falha de procedimento apareceria
**aqui**, sobre uma tabela de configuração recém-criada, e não sobre as funções que registram um
direito.

**Resultado:** `{"success": true}`

### Prova de fidelidade

```sql
SELECT version, length(statements[1]) AS chars, md5(statements[1])
  FROM supabase_migrations.schema_migrations WHERE name = 'p45_pedido_exclusao';
```

| | valor |
|---|---|
| `chars` no ledger | **26140** |
| `md5(statements[1])` | **`302e075244df7255ef361df4dda4c146`** |
| md5 do arquivo (sem newline final) | **`302e075244df7255ef361df4dda4c146`** |
| **veredito** | ✅ **IDÊNTICOS** — o que está em PROD é byte-a-byte o que foi revisado |

### Reconcile do ledger

`apply_migration` carimbou `version = 20260805181457` (timestamp do apply). Reconciliado:

```sql
UPDATE supabase_migrations.schema_migrations
   SET version = '20260805000001'
 WHERE name = 'p45_pedido_exclusao' AND version = '20260805181457';
```

Ledger em sequência limpa após a P44: `20260805000001` → `20260804000002` → `20260804000001` →
`20260803000001` → …

### Pós-estado medido

| verificação | resultado |
|---|---|
| `config_janela_exclusao` linhas / `dias` | **1** / **15** |
| policies na tabela | **1**, e é `SELECT` / `authenticated` |
| RLS ligada | **true** |
| policies de ESCRITA | **0** — default-deny |
| trigger de `atualizado_em` | **1** |
| colunas novas em `solicitacoes_dados` (das 7) | **7** |
| `candidaturas.encerrada_a_pedido_em` | existe, `is_nullable = YES` |
| `ck_solicitacoes_dados_situacao` | `CHECK (situacao = ANY (ARRAY['atendido','pendente','agendado','cancelado','executando','concluido']))` — **6 valores** |
| 3 FKs `NO ACTION` | `=a, =a, =a` — **inalteradas** |
| `candidatos` / `candidaturas` / `historico` | **22 / 9 / 5** — **inalteradas** |

---

## Apply 2 — `20260805000002_p45_rpc_pedido_exclusao`

⚠ **É a migration de risco de transporte:** duas funções `LANGUAGE plpgsql` com delimitadores
NOMEADOS mais um bloco anônimo, todos cercados de `REVOKE`/`GRANT`/`COMMENT`.

**Resultado:** `{"success": true}` — **nenhum SQLSTATE 42601.** O workaround do SQL Editor não foi
necessário.

### Prova de fidelidade

| | valor |
|---|---|
| `chars` no ledger | **26594** |
| `md5(statements[1])` | **`4c496ccf616020cfd24f15edd134b24a`** |
| md5 do arquivo (sem newline final) | **`4c496ccf616020cfd24f15edd134b24a`** |
| **veredito** | ✅ **IDÊNTICOS** |

Ledger reconciliado para `20260805000002`.

### A auto-verificação EXECUTOU o caminho feliz — e reverteu

O bloco `DO $verifica_registrar_pedido_exclusao$` roda dentro do apply e assere, sobre um titular
REAL, numa subtransação que termina em `RAISE EXCEPTION`:

1. `registrar_pedido_exclusao` **devolveu linha** (*"não lançou" não é "completou"*);
2. `executar_em = solicitado_em + 15 dias` — **a janela veio da config**, não de literal;
3. a **segunda** invocação foi no-op: mesma linha, mesma data, `candidaturas_encerradas = 0`;
4. **asserção negativa:** zero linha nova em `historico_candidatura` — o encerramento não passou
   pelo caminho de transição de etapa, que dispararia notificação e marcaria `auto_rejeitado`;
5. **asserção negativa:** nenhuma candidatura encerrada a pedido com `deleted_at` preenchido.

A migration só teve sucesso porque **as cinco passaram**. Se qualquer uma falhasse, o apply inteiro
falharia — é o gate mordendo, não observando.

**Prova de que reverteu:** `solicitacoes_dados` segue em **0 linhas** e
`candidaturas WHERE encerrada_a_pedido_em IS NOT NULL` em **0** — depois do apply.

### ACL das duas funções

```sql
SELECT p.proname, p.prosecdef, p.proacl FROM pg_proc p …;
```

| função | `prosecdef` | `provolatile` | `search_path` | ACL |
|---|---|---|---|---|
| `registrar_pedido_exclusao` | **true** | `v` | `search_path=""` | `postgres=X/postgres \| service_role=X/postgres` |
| `cancelar_pedido_exclusao` | **true** | `v` | `search_path=""` | `postgres=X/postgres \| service_role=X/postgres` |

**Concede a `anon`, `authenticated` ou PUBLIC?** **NÃO**, nas duas — verificado por `unnest(proacl)`
com prefixos `anon=` / `authenticated=` / `=` (PUBLIC aparece com grantee vazio). Único grant
funcional: **`service_role`**, 1 em cada.

⚠ **Nota de honestidade sobre a verificação.** A primeira consulta que rodei devolveu
`tem_grant_indevido = true` nas duas — **e o defeito era da consulta, não do ACL**: o padrão
`%=X/%` casa também `postgres=X/postgres`. Refeita com predicado correto por `unnest`. Registrado
porque um falso positivo silenciosamente "corrigido" é como uma verificação perde credibilidade.

---

## Estado DEPOIS — as asserções negativas

| medida | ANTES | DEPOIS | veredito |
|---|---|---|---|
| `solicitacoes_dados` | 0 | **0** | ✅ a auto-verificação reverteu |
| `candidaturas` com `encerrada_a_pedido_em` | (coluna não existia) | **0** | ✅ reverteu |
| `historico_candidatura` | 5 | **5** | ✅ inalterada |
| `decisao_final` | 1 | **1** | ✅ inalterada |
| `decisao_final_historico` | 0 | **0** | ✅ inalterada |
| `candidatos` | 22 | **22** | ✅ inalterada |
| `candidaturas` | 9 | **9** | ✅ inalterada |
| `notificacoes_enviadas` | 3 | **3** | ✅ **nenhum e-mail disparado** |
| `candidatos` com `user_id IS NULL` | 0 | **0** | ✅ nenhum tombstone vazou |
| 3 FKs `NO ACTION` | `a, a, a` | **`a, a, a`** | ✅ **ERASE-08 executado no apply** |

---

## Conferência automática

```
test -f .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-06-EVIDENCIA-APPLY.md && for t in "20260805000001" "20260805000002" "md5" "confdeltype" "config_janela_exclusao" "proacl"; do grep -q "$t" .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-06-EVIDENCIA-APPLY.md || { echo "FALTA: $t"; exit 1; }; done; echo OK
```

Saída: **`OK`**

---

## O que resta do 45-06

**Task 2 — deploy da EF `executar-direito-titular` + prova ponta a ponta no navegador.** ⏸ Exige
sessão de navegador com login de titular. Não executável por agente.

**Task 3 — regeneração de `database.types.ts`.** Pendente.

⚠ Nada destrutivo foi aplicado nesta sessão, e nada destrutivo existe ainda no banco: `plano`,
`storage_concluido_em`, `postgres_concluido_em`, `auth_concluido_em` e `recibo_enviado_em` nasceram
**NULOS** e só o 45-10 os preenche. O tombstone e o `deleteUser` não existem.
