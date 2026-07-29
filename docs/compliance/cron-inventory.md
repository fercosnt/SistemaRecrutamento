# Inventário dos `cron.job` vivos × repositório

| Campo | Valor |
|-------|-------|
| **Requirement coberto** | **INVENT-03** |
| **Data de coleta** | **2026-07-29** (`14:07 UTC`) |
| **Query reprodutora** | [`sql/02-cron-live.sql`](./sql/02-cron-live.sql) |
| **Ambiente** | PROD (`isljnozzlvckrgjjbjwp`) |
| **Natureza** | Read-only |

---

## Resultado — 3 jobs vivos, todos rastreáveis, nenhum órfão

**Esperado: exatamente 3 jobs, todos `active`. Encontrado: exatamente 3 jobs, todos `active`.**
**Nenhum 4º job. Nenhum corpo divergente. Não há achado bloqueante.**

Isso importa porque um 4º job — ou um corpo que divergisse do arquivo — significaria que existe um
**caminho de escrita apontado para uma purga fora do repositório**. É a hipótese que o
`processo-origem-do-drift-desconhecida` mantém aberta, e ela **não** se materializou aqui.

| jobid | jobname | schedule | active | Origem no repositório | Veredito |
|------:|---------|----------|:------:|----------------------|----------|
| 1 | `ai-cost-aggregation` | `30 1 * * *` | ✅ | `20260609000003_prompt_library_cron.sql` | ✅ rastreável |
| 2 | `ai-logs-retention-cleanup` | `0 2 * * *` | ✅ | `20260609000003_prompt_library_cron.sql` | ✅ rastreável · ⚠ **alvo do INVENT-05** |
| 3 | `notif-retry-sweep` | `*/15 * * * *` | ✅ | `20260727000001_p41_recon_retry.sql` | ✅ rastreável |

Todos rodam como `postgres` no database `postgres`.

---

## Corpo de cada job (verbatim do catálogo vivo)

### 1 · `ai-cost-aggregation` — `30 1 * * *`

Agrega custo diário de IA em `ai_cost_daily` com `ON CONFLICT DO UPDATE`. **Não é destrutivo**
(só `INSERT`/`UPDATE`). Fora do escopo do portão destrutivo.

### 2 · `ai-logs-retention-cleanup` — `0 2 * * *` ⚠

```sql
DELETE FROM public.ai_call_logs
WHERE retain_until < now()
  AND id NOT IN (
    SELECT unnest(ai_call_log_ids) FROM public.candidate_ai_decisions
    WHERE status IN ('candidate_review_requested','human_reviewing'));
```

**É o único `DELETE` vivo em cron neste sistema.** É o alvo do INVENT-05 — ver a análise de
precisão abaixo, que corrige o enunciado do requirement.

### 3 · `notif-retry-sweep` — `*/15 * * * *`

```sql
SELECT public.varrer_retry_notificacoes();
```

Não destrutivo. ⚠ **Relevante para a Phase 42:** o plano `42-07` identificou que esta função
re-despacha **toda** linha não-terminal do ledger para `notificar-candidato` por URL fixa — uma
linha de evento de RH em `falhou` seria rejeitada com `400 VALIDATION` **antes** do branch de
retry, então `tentativas` nunca incrementa e a linha re-seleciona a cada 15 min para sempre,
consumindo o orçamento `LIMIT 20`. Fechado no `42-07` com predicado de exclusão explícito.

---

## ⚠ Correção ao enunciado do INVENT-05

O requirement diz:

> *"`NOT IN` com subquery que pode conter NULL apaga zero linhas em silêncio"*

O mecanismo está certo, mas **a condição de disparo não é a que o enunciado sugere**, e a diferença
muda o que precisa ser provado.

**Estado medido em 2026-07-29:**

| Métrica | Valor |
|---------|------:|
| `ai_call_logs` — total | **0** |
| `ai_call_logs` — elegíveis por retenção (`retain_until < now()`) | **0** |
| `candidate_ai_decisions` — total | **0** |
| `candidate_ai_decisions` — protegidas (status em review) | **0** |
| protegidas com `ai_call_log_ids IS NULL` | **0** |
| protegidas com elemento `NULL` no array | **0** |

**Com `candidate_ai_decisions` vazia, a subquery devolve ZERO linhas — e `x NOT IN (conjunto vazio)`
é `TRUE`, não `NULL`.** Ou seja: **hoje o cron apaga corretamente.** O bug não está ativo.

O bug **arma-se** quando ambas as condições ocorrerem:

1. existir ao menos uma linha em `candidate_ai_decisions` com status
   `candidate_review_requested` ou `human_reviewing`; **e**
2. o `ai_call_log_ids` de alguma dessas linhas contiver um elemento `NULL`
   (ou a coluna inteira for `NULL`).

A partir daí, o `NOT IN` avalia `NULL` para **toda** linha candidata e o `DELETE` passa a apagar
**zero em silêncio** — indefinidamente, sem erro, sem log.

### Por que isso importa para o portão destrutivo

O efeito da correção (`NOT IN` → `NOT EXISTS`) **não** é "voltar a apagar". Hoje já apaga. O efeito
é **impedir que pare de apagar no futuro**, silenciosamente.

E a asserção de blast radius fica mais forte, não mais fraca: **com 0 linhas em `ai_call_logs`, a
correção não pode apagar nada hoje, sob nenhuma circunstância.** É a janela mais segura possível
para tocar um `DELETE` vivo — e é um fato datado, não uma suposição.

---

## Como reproduzir

Consultas (a), (b) e (c) de [`sql/02-cron-live.sql`](./sql/02-cron-live.sql), via `execute_sql` do
MCP do Supabase, pelo orquestrador.

---

## Limites deste artefato

1. **Fotografia de 2026-07-29.** Um job criado depois desta data não aparece aqui. A re-execução é
   barata e deve preceder qualquer fase que toque cron (Phase 46).
2. **Rastreabilidade por nome e corpo**, não por hash assinado. Um job cujo corpo tenha sido
   alterado fora do repositório *e depois revertido* seria indistinguível.
3. **Não cobre `pg_net`/webhooks** disparados por trigger — só `cron.job`. Os triggers vivos são
   inventariados no `achados-inventario.md`.
