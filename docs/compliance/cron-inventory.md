# Inventário dos `cron.job` vivos × repositório

> ⚠ **2026-08-23 — este documento passou a ter TRÊS camadas, e elas não têm o mesmo
> estatuto.** A seção abaixo é a coleta de **2026-07-29** (3 jobs). A seção
> [Depois da correção](#depois-da-correção-invent-05--d-p42-21) é de 2026-07-31, aplicada em
> 2026-08-01. E a seção [Re-coleta da Phase 46](#re-coleta-da-phase-46--o-4º-agendamento) é de
> **2026-08-23** e declara um **4º** agendamento — cujas células medidas seguem **⏳ pendentes do
> apply**, exatamente como as desta seção estiveram entre 31/07 e 01/08. Uma célula ⏳ é um campo a
> preencher, **nunca** um valor medido.

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

## Re-coleta da Phase 46 — o 4º agendamento

| Campo | Valor |
|-------|-------|
| **Requirement coberto** | **PURGA-01** (INVENT-03 continua sendo o requisito deste documento) |
| **Plano** | `46-06` |
| **Migration** | [`20260823000012_p46_cron.sql`](../../supabase/migrations/20260823000012_p46_cron.sql) |
| **Escrita em** | **2026-08-23** |
| **Estado em PROD** | ⏳ **NÃO APLICADA** — o apply é do checkpoint do orquestrador |
| **Re-coleta viva** | ⏳ pendente do apply |

> ⚠ **O próprio documento manda re-coletar antes de qualquer fase que toque cron** (§Limites, item
> 1), e esta seção é essa re-coleta — **do lado do repositório**. O lado VIVO ainda não foi medido:
> o autor deste plano não tem acesso ao banco, e transcrever aqui um número que ninguém mediu seria
> o defeito que esta pasta inteira existe para impedir. As células ⏳ são preenchidas no checkpoint,
> por execução da consulta abaixo.

### O agendamento novo, como o repositório o declara

| jobid | jobname | schedule | active | Origem no repositório | Veredito |
|------:|---------|----------|:------:|----------------------|----------|
| ⏳ | `purga-retencao-sweep` | `0 3 * * *` (**UTC**) | ⏳ | `20260823000012_p46_cron.sql` | ⏳ pendente do apply |

**Papel:** é o gatilho da purga automática de retenção (LGPD). Chama a varredura
`public.varrer_purga_retencao()`, criada em `20260823000004` e em sua terceira versão desde
`20260823000011`. **Não é destrutivo hoje**: `public.config_purga.modo` está em `off`, e nesse
regime a varredura conta os elegíveis, grava uma linha de heartbeat em `public.purga_execucoes` e
retorna sem tocar em nada. Ligar o dry-run é ato do plano 46-07.

**Corpo do job (transcrito da migration):**

```sql
 SELECT public.varrer_purga_retencao();
```

| Propriedade do corpo | Valor |
|---|---|
| `md5` do texto entre os delimitadores `$sweep$` | `381a0edbc8a59b47b23b50dd1eba9a86` |
| Tamanho | **40 octetos** (inclui o espaço inicial e o final, que fazem parte do corpo) |
| Origem do resumo | computado **por execução** sobre o arquivo de migration em 2026-08-23 — nunca digitado à mão |

Esse `md5` é o que a asserção **(a)** do
[`p46_purga_smoke.sql`](../../supabase/tests/p46_purga_smoke.sql) compara contra
`cron.job.command`. **O corpo é só a chamada da função de propósito:** SQL solto dentro de um
agendamento é lógica que vive fora do repositório e fora de todo pin — alterável sem commit, sem
revisão e sem rastro. Com o corpo mínimo, `md5(command)` pina o agendamento e `md5(prosrc)` pina a
lógica.

### `0 3 * * *` é UTC (D-46-10)

`pg_cron` interpreta o schedule no fuso do servidor, que neste projeto é GMT. 03:00 UTC = 00:00 BRT,
off-peak. Diário, e não a cada 15 minutos como o `notif-retry-sweep`: retenção é medida em **meses**,
então diário é folgado por três ordens de grandeza e ainda dá granularidade de observação diária
durante os 14 dias de dry-run que D-46-14 exige.

⚠ `[ASSUMED A1]`: o Brasil não observa horário de verão desde 2019, logo a equivalência com 00:00 BRT
vale o ano inteiro. Se voltar a observar, o efeito é a purga rodar às 01:00 BRT — **nunca** uma
diferença de correção.

### A emenda do portão, no MESMO commit que criou o job (D-46-23)

`supabase/tests/p42_invent05_cron_smoke.sql`, asserção **(a)**, foi **convertida de instantâneo em
invariante em 2026-08-23**, no mesmo commit da migration acima.

| | Antes | Depois |
|---|---|---|
| O que media | `count(*) FROM cron.job` contra a **constante 3** | (i) os três `jobname` herdados existem por igualdade exata · (ii) existe exatamente um `purga-retencao-sweep` · (iii) não há nenhum outro `jobname`, correlacionado por `NOT EXISTS` · e nenhum duplicado |
| O que faria em 2026-08-23 | ficaria **VERMELHO** diante de trabalho correto, acusando *"guard de remoção condicional falhou e o alvo ficou duplicado"* — uma causa que não aconteceu | fica **VERDE** com quatro jobs, e continua mordendo em duplicata, remoção e intruso |
| O que dirá quando surgir um 5º job | nada de útil: "tem 5, esperado 3" | **o nome dele**, apontando para esta seção e para a lista do smoke — o nome entra nos dois, no commit que cria o job |

Por que isso não é afrouxar o portão: a lista de quatro nomes é o **escopo declarado** do INVENT-03,
não uma fotografia. Um agendamento novo passa a exigir uma edição consciente em dois artefatos —
que é precisamente o que INVENT-03 pede — em vez de um número trocado em silêncio.

⚠ E a asserção (a.iii) é correlacionada por `NOT EXISTS`, jamais por negação de pertencimento a
conjunto: `cron.job.jobname` é **anulável** (a forma de dois argumentos de `cron.schedule` agenda sem
nome), e a forma banida avaliaria DESCONHECIDO para o intruso sem nome, deixando-o escapar. Seria o
INVENT-05 renascendo dentro do próprio gate do INVENT-05.

### Consulta de re-coleta (a preencher no checkpoint)

```sql
SELECT jobid, jobname, schedule, active, md5(command) AS md5_corpo, octet_length(command) AS octetos
  FROM cron.job
 ORDER BY jobname;
```

Esperado: **quatro** linhas. Os três herdados com `schedule` idêntico ao registrado nas seções
anteriores (`30 1 * * *`, `0 2 * * *`, `*/15 * * * *`) e com os `md5` de corpo idênticos aos de
2026-08-01 (`fdd283dc3e266884761a3649c31acd6c` e `04bf2150e09f1f7b15abcf074f74ad95` para os dois
vizinhos; `b64ca58d089f3ed580205e95a40c4e5f` para o alvo do INVENT-05). O novo com `0 3 * * *`,
`active = true` e `md5` igual a `381a0edbc8a59b47b23b50dd1eba9a86`.

| Job | schedule esperado | md5 esperado | Medido no apply |
|---|---|---|---|
| `ai-cost-aggregation` | `30 1 * * *` | `fdd283dc3e266884761a3649c31acd6c` | ⏳ |
| `ai-logs-retention-cleanup` | `0 2 * * *` | `b64ca58d089f3ed580205e95a40c4e5f` | ⏳ |
| `notif-retry-sweep` | `*/15 * * * *` | `04bf2150e09f1f7b15abcf074f74ad95` | ⏳ |
| `purga-retencao-sweep` | `0 3 * * *` | `381a0edbc8a59b47b23b50dd1eba9a86` | ⏳ |

### Idempotência do agendamento — provada por execução, não por leitura

A migration usa o par desagendar-guardado-por-existência antes de agendar (idioma de
`20260727000001:220-221`). **D-46-10 exige que isso seja provado aplicando a migration uma SEGUNDA
vez** e conferindo que `count(*) FROM cron.job WHERE jobname = 'purga-retencao-sweep'` continua `1`.
Ler o código não prova: um agendamento duplicado faria a purga rodar duas vezes por noite, e em
`live` isso são duas varreduras concorrentes disputando os mesmos titulares.

| Verificação | Resultado |
|---|---|
| `count(*)` após o **primeiro** apply | ⏳ |
| `count(*)` após o **segundo** apply | ⏳ (esperado `1`) |

### Quando o efeito real acontece

O apply **não** executa a purga. A primeira execução acontece às **03:00 UTC seguintes**, e — porque
`config_purga.modo` está em `off` — a única coisa que ela faz é gravar uma linha de heartbeat em
`public.purga_execucoes` com `veredito = 'desligado'` e `processados = 0`. Nenhum dado é apagado, e
nenhuma requisição HTTP é enfileirada: o hop para a Edge Function existe **apenas** dentro do ramo
`live` da função.

---

## Como reproduzir

Consultas (a), (b) e (c) de [`sql/02-cron-live.sql`](./sql/02-cron-live.sql), via `execute_sql` do
MCP do Supabase, pelo orquestrador.

---

## Limites deste artefato

1. **Fotografia de 2026-07-29** — exceto a seção "Depois da correção" (escrita em 2026-07-31,
   medida e aplicada em 2026-08-01) e a seção "Re-coleta da Phase 46" (escrita em 2026-08-23, com o
   lado vivo ⏳ **pendente do apply**). Um job criado depois de 29/07 não aparece na fotografia. A
   re-execução é barata e deve preceder qualquer fase que toque cron.
   ⚠ **E, desde 2026-08-23, ela deixou de depender de alguém lembrar:** a asserção (a) do
   `p42_invent05_cron_smoke.sql` reprova nomeando qualquer `jobname` vivo que não esteja na lista
   deste documento. Um job criado sem passar por aqui fica vermelho no primeiro smoke.
2. **Rastreabilidade por nome e corpo**, não por hash assinado. Um job cujo corpo tenha sido
   alterado fora do repositório *e depois revertido* seria indistinguível.
3. **Não cobre `pg_net`/webhooks** disparados por trigger — só `cron.job`. Os triggers vivos são
   inventariados no `achados-inventario.md`.
