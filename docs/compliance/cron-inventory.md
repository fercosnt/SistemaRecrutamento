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

> ⚠ **Este bloco é o lado ESQUERDO do antes/depois e não deve ser editado.** A correção do
> INVENT-05 está na seção [Depois da correção](#depois-da-correção-invent-05--d-p42-21). O corpo
> acima é o registro do estado anterior ao apply; sobrescrevê-lo destruiria a única evidência
> datada de qual era o predicado vivo.

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

## Depois da correção (INVENT-05 · D-P42-21)

| Campo | Valor |
|-------|-------|
| **Requirement coberto** | **INVENT-05** |
| **Plano** | `42-12` |
| **Migration** | [`20260730000005_p42_invent05_not_exists.sql`](../../supabase/migrations/20260730000005_p42_invent05_not_exists.sql) |
| **Consulta de raio de impacto** | [`sql/04-invent05-blast-radius.sql`](./sql/04-invent05-blast-radius.sql) |
| **Smoke de asserção negativa** | [`../../supabase/tests/p42_invent05_cron_smoke.sql`](../../supabase/tests/p42_invent05_cron_smoke.sql) |
| **Escrita em** | 2026-07-31 |
| **Estado em PROD** | ✅ **APLICADA em 2026-08-01** — checkpoint do orquestrador, sob o portão de fase destrutiva (medição → dry-run → code review bloqueante `PROCEED` → apply → asserções negativas 4/4) |

> ✅ **APLICADA — esta seção agora descreve o BANCO, não só o repositório.** Até 2026-08-01 este
> aviso dizia o contrário: enquanto "Estado em PROD" dissesse **NÃO APLICADA**, as células marcadas
> ⏳ eram *campos a preencher*, não valores medidos, e tratá-las como resultado seria exatamente o
> modo de falha que o `04-invent05-blast-radius.sql` existe para impedir. Todas foram preenchidas
> com medição real no checkpoint; nenhuma foi transcrita de expectativa.
>
> O bloco de corpo **anterior** (seção 2, acima) permanece intocado de propósito: é a única
> evidência datada de qual era o predicado vivo antes da correção, e é o lado esquerdo deste
> antes/depois.

### O corpo novo (transcrito da migration)

```sql
DELETE FROM public.ai_call_logs l
 WHERE l.retain_until < now()
   AND NOT EXISTS (
     SELECT 1
       FROM public.candidate_ai_decisions d
      WHERE d.status IN ('candidate_review_requested', 'human_reviewing')
        AND l.id = ANY(d.ai_call_log_ids)
   );
```

| Propriedade do corpo novo | Valor |
|---|---|
| `md5` do texto entre os delimitadores `$CRON$` | `b64ca58d089f3ed580205e95a40c4e5f` |
| Tamanho | 299 octetos |
| Origem do resumo | computado por execução sobre o arquivo de migration em 2026-07-31 — nunca digitado à mão |

Esse `md5` é o que a asserção **(b)** do smoke compara contra `cron.job.command`. Igualdade de
resumo sobre o texto inteiro **é** comparação byte a byte: um espaço a mais ou uma quebra de linha
a menos muda o resultado.

### O que muda e o que **não** muda

| Aspecto | Antes | Depois |
|---|---|---|
| `jobname` | `ai-logs-retention-cleanup` | **inalterado** |
| `schedule` | `0 2 * * *` | **inalterado** |
| `active` | `true` | **inalterado** |
| Forma do predicado de proteção | negação de pertencimento a uma lista de valores | verificação de **inexistência** de linha correspondente |
| Comportamento com elemento nulo no array | predicado avalia nulo para **toda** linha ⇒ apaga **zero**, em silêncio | o nulo vale por si mesmo ⇒ a linha é corretamente apagada |
| Outros dois agendamentos | — | **não são sequer mencionados** na migration (asserido por grep) e são asseridos intocados pela asserção (d) do smoke |

A substituição é **em lugar**: mesmo nome e mesmo horário, precedida do guard de remoção
condicional (idioma de `20260727000001:220-221`), então reaplicar a migration não duplica o
agendamento. A asserção **(a)** do smoke prova que a contagem continua **3**.

### Os dois conjuntos de números — a mesma consulta, duas vezes

Ambas as execuções são de `sql/04-invent05-blast-radius.sql`, **sem alterar uma vírgula entre
elas**. Se as duas medições não forem a mesma consulta, qualquer diferença observada passa a ter
duas explicações possíveis e nenhuma fica descartada.

| Métrica | Antes do apply | Depois do apply |
|---|---:|---:|
| `total_logs` | **0** | **0** ✅ idêntico |
| `total_decisions` | **0** | **0** |
| `decisions_com_null_no_array` | **0** | **0** |
| `alcance_atual` | **0** | **0** |
| `alcance_corrigido` | **0** | **0** |
| `md5_vizinho_agregacao` | `fdd283dc3e266884761a3649c31acd6c` | `fdd283dc3e266884761a3649c31acd6c` ✅ idêntico |
| `md5_vizinho_retry` | `04bf2150e09f1f7b15abcf074f74ad95` | `04bf2150e09f1f7b15abcf074f74ad95` ✅ idêntico |
| `coletado_em_utc` | 2026-07-31 14:35:22 UTC | 2026-08-01 05:33:44 UTC |

**Delta `alcance_corrigido − alcance_atual` = 0 — este número É o raio de impacto real da
correção**, e é o que decide se o apply é passo automático (delta 0) ou decisão do operador
(delta > 0).

⚠ **`total_logs` não pode mudar entre as duas medições.** Substituir um agendamento não o executa.
Se esse número mudar, isso é **incidente, não resultado** — pare e escale.

📌 As contagens de **2026-07-29** registradas na seção anterior (`ai_call_logs` = 0,
`candidate_ai_decisions` = 0) **não autorizam o apply**. A Phase 23 corrigiu a causa do logging
quebrado; se o registro de chamadas voltou a funcionar desde então, a primeira execução
pós-correção apaga o acumulado histórico de uma vez. Só a contagem tirada minutos antes do apply
autoriza.

### Asserções negativas pós-apply

| # | Asserção | Resultado |
|---|---|---|
| (a) | `cron.job` continua com **exatamente 3** agendamentos — nenhum criado, nenhum removido | ✅ **PASS** |
| (b) | Corpo vivo do alvo casa **byte a byte** com a migration (`md5` acima) | ✅ **PASS** — `b64ca58d089f3ed580205e95a40c4e5f`, 299 octetos |
| (c) | Horário `0 2 * * *` e `active` preservados | ✅ **PASS** |
| (d) | `ai-cost-aggregation` e `notif-retry-sweep` intocados (horário, estado ativo, assinatura de corpo) | ✅ **PASS** — e a igualdade **byte a byte** dos dois vizinhos deixou de ser passo manual: os `md5` viraram colunas da consulta de raio de impacto (recomendação W5 do code review), e batem nas duas coletas |
| (z) | RESUMO — gate de contagem, esperado fixo **4** | ✅ **PASS 4/4 — gate VERDE** |

Rodar numa **única** chamada `execute_sql` (o gate por GUC é escopado à sessão).

Complemento do checkpoint, que o arquivo estático do smoke não tem como conhecer de antemão:
`SELECT jobname, md5(command) FROM cron.job ORDER BY jobname;` coletado **antes** e **depois** do
apply. Os resumos de `ai-cost-aggregation` e `notif-retry-sweep` têm de ser **idênticos** nas duas
coletas — é a asserção byte a byte de que a correção não tocou o que não devia.

### Quando o efeito real acontece

O apply **não** executa a purga. A primeira execução com o predicado corrigido acontece às
**02:00 seguintes**, e a partir dela o comando passa a apagar de verdade as linhas que a política
de retenção manda apagar. Até lá, o que mudou é a definição do agendamento — não o dado.

---

## Como reproduzir

Consultas (a), (b) e (c) de [`sql/02-cron-live.sql`](./sql/02-cron-live.sql), via `execute_sql` do
MCP do Supabase, pelo orquestrador.

---

## Limites deste artefato

1. **Fotografia de 2026-07-29** — exceto a seção "Depois da correção", escrita em 2026-07-31 e
   cujos números medidos seguem **pendentes do apply**. Um job criado depois de 29/07 não aparece
   na fotografia. A re-execução é barata e deve preceder qualquer fase que toque cron (Phase 46).
2. **Rastreabilidade por nome e corpo**, não por hash assinado. Um job cujo corpo tenha sido
   alterado fora do repositório *e depois revertido* seria indistinguível.
3. **Não cobre `pg_net`/webhooks** disparados por trigger — só `cron.job`. Os triggers vivos são
   inventariados no `achados-inventario.md`.
