---
phase: 42-invent-rio-gates-fila-art-20
plan: 12
subsystem: database
tags: [pg_cron, retencao, lgpd, sql-null-semantics, portao-destrutivo, blast-radius, assercao-negativa, invent-05]

requires:
  - phase: 42-01
    provides: "`.husky/pre-commit` convertido em gate de NÃO-REGRESSÃO com baseline congelada 97 — é o que torna o requisito de zero `--no-verify` satisfazível de verdade, em vez de reinterpretado"
  - phase: 42-05
    provides: "`docs/compliance/cron-inventory.md` com o corpo do agendamento registrado ANTES da correção — o contrato do antes/depois, auditável contra registro e não contra memória"
  - phase: 42-08
    provides: "`20260730000004` aplicada em PROD — esta migration é a seguinte na sequência do ledger (`20260730000005`)"
provides:
  - "`docs/compliance/sql/04-invent05-blast-radius.sql` — a MESMA consulta rodada antes e depois do apply; `alcance_atual` vs `alcance_corrigido` é o dry-run e o delta é o raio de impacto real"
  - "`supabase/tests/p42_invent05_cron_smoke.sql` — 4 asserções NEGATIVAS de catálogo, esperado fixo 4, zero verbo de escrita (seguro em PROD vivo)"
  - "`supabase/migrations/20260730000005_p42_invent05_not_exists.sql` — a correção do predicado (ESCRITA, **não aplicada**)"
  - "`docs/compliance/cron-inventory.md` § 'Depois da correção' — o formulário do antes/depois pré-preenchido com o que é fato hoje e com as células medidas marcadas ⏳"
  - "md5 `b64ca58d089f3ed580205e95a40c4e5f` (299 octetos) do corpo novo — computado por execução, é o que a asserção (b) compara contra `cron.job.command`"
affects: []

tech-stack:
  added: []
  patterns:
    - "Igualdade de `md5` sobre o corpo inteiro É comparação byte a byte — e mantém o arquivo de smoke livre do verbo de escrita que ele declara não conter, de modo que a segurança do smoke em PROD vivo é asserida por grep em vez de prometida em prosa"
    - "Um resumo esperado (md5, baseline, contagem) tem de trazer PROVENIÊNCIA no próprio arquivo: valor, origem, data, comando de recomputação e a advertência de que re-pinar sem a origem ter mudado esvazia a asserção — mesmo idioma do bloco de proveniência do `.husky/pre-commit`"
    - "Célula de artefato que ainda não foi medida escreve-se ⏳ com legenda explícita de 'campo do checkpoint, não resultado' — nunca placeholder plausível: um número inventado é indistinguível de um medido depois que a sessão acaba"
    - "O bloco que registra o estado ANTERIOR ganha marca de não-editável no próprio documento: num antes/depois, sobrescrever o 'antes' destrói a única evidência que torna o 'depois' interpretável"

key-files:
  created:
    - docs/compliance/sql/04-invent05-blast-radius.sql
    - supabase/tests/p42_invent05_cron_smoke.sql
    - supabase/migrations/20260730000005_p42_invent05_not_exists.sql
  modified:
    - docs/compliance/cron-inventory.md

key-decisions:
  - "A consulta de contenção do §E5 da pesquisa (`ai_call_log_ids @> ARRAY[NULL]::uuid[]`) foi REJEITADA e substituída por `array_position(ai_call_log_ids, NULL) IS NOT NULL`. A forma da pesquisa devolveria `false` SEMPRE — contenção de arrays compara elementos por igualdade, e igualdade contra nulo nunca é verdadeira. Ela reportaria `0` em silêncio para todo estado do banco, reintroduzindo dentro da consulta de MEDIÇÃO a mesma classe de defeito que o INVENT-05 corrige. `02-cron-live.sql:65` (plano 42-05) já usava a forma correta — a pesquisa contradiz um artefato versionado da própria fase"
  - "A asserção (b) do smoke compara por `md5`, não por string literal. Duas razões, nesta ordem: (1) md5 sobre o texto inteiro É byte a byte, estritamente mais forte que `strpos` ou inspeção visual; (2) transcrever o corpo esperado traria para dentro do smoke o verbo de escrita que o critério de aceitação proíbe ali, e o arquivo deixaria de ser provadamente seguro em PROD vivo por grep"
  - "O md5 esperado foi DERIVADO POR EXECUÇÃO sobre o arquivo de migration (extraindo o texto entre os dois delimitadores `$CRON$`), nunca transcrito à mão, e o comando de recomputação ficou gravado no cabeçalho do smoke junto com a advertência de que re-pinar sem a migration ter mudado esvazia a asserção"
  - "A consulta de raio de impacto ganhou uma 6ª coluna, `coletado_em_utc` (desvio Rule 2). O portão exige um FATO DATADO; uma data que depende de alguém lembrar de anotá-la é promessa sem código que a execute — a classe exata de defeito que esta fase documenta. Os 5 números especificados no plano estão todos lá; o carimbo é o que os torna um fato datado em vez de cinco números soltos"
  - "A asserção (d) do smoke assere os vizinhos por horário/estado ativo/assinatura de corpo, NÃO por md5 — e o limite está dito explicitamente no arquivo: o inventário de 42-05 descreveu o corpo do agregador em vez de transcrevê-lo, então não existe resumo de referência. A igualdade byte a byte dos vizinhos foi movida para o checkpoint, por `md5(command)` coletado antes e depois — dois números que um arquivo estático não teria como conhecer de antemão"
  - "A seção 'Depois da correção' do `cron-inventory.md` foi escrita ANTES do apply, com as células medidas marcadas ⏳ e uma advertência de leitura no topo. Escrevê-la depois deixaria o orquestrador redigindo estrutura durante o checkpoint, que é o pior momento para decidir o que registrar; escrevê-la com números plausíveis seria fabricar evidência"
  - "O bloco do corpo ANTERIOR no `cron-inventory.md` recebeu marca explícita de não-editável. Ele é o lado esquerdo do antes/depois: sobrescrevê-lo com o corpo novo destruiria a única evidência datada de qual era o predicado vivo, que é precisamente o que o T-42-42 (repúdio) existe para impedir"
  - "A migration NÃO remenda o predicado atual com uma condição de não-nulidade. A forma remendada funcionaria hoje e continuaria frágil a qualquer mudança futura na origem do array, dependendo de alguém lembrar da armadilha; a forma adotada é imune por construção. Numa fase cujo tema é 'toda promessa precisa de código que a execute', trocar garantia estrutural por garantia de atenção humana contradiria a tese"

patterns-established:
  - "Quando um plano aponta para um trecho da pesquisa como fonte, o trecho é HIPÓTESE, não contrato — conferir contra os artefatos já versionados da mesma fase. Aqui a pesquisa e o `02-cron-live.sql` discordavam, e quem estava certo era o arquivo versionado"
  - "Critério de aceitação por grep negativo sobre um arquivo (`zero verbo de escrita`) é uma restrição de PROJETO, não uma checagem cosmética: ela empurrou a asserção de fidelidade de string literal para md5, e o resultado ficou mais forte do que a forma que a restrição proibiu"

requirements-completed: []
requirements-pending-checkpoint: [INVENT-05]

checkpoint_pendente: true
checkpoint_task: 2
checkpoint_tasks_pendentes: [2, 3]

coverage:
  - id: D1
    description: "A correção existe como migration auditável, com a mecânica exata do defeito registrada no cabeçalho (elemento nulo dentro do array declarado não-nulo; efeito sobre TODA linha candidata; purga apaga zero em silêncio às 02:00)"
    requirement: "INVENT-05"
    verification:
      - kind: other
        ref: "gates de grep do plano, todos executados: `NOT EXISTS` não-comentário == 1; negação-por-lista não-comentário == 0; `cron.unschedule('ai-logs-retention-cleanup')` == 1; `'0 2 * * *'` == 1; `ai-cost-aggregation` == 0; `notif-retry-sweep` == 0; `BEGIN;`/`COMMIT;` executáveis == 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "A consulta de raio de impacto é read-only e devolve os 5 números especificados numa linha só, mais o carimbo UTC"
    requirement: "INVENT-05"
    verification:
      - kind: other
        ref: "`grep -icE '\\b(insert|update|delete|drop|alter|truncate)\\b'` == 0 sobre o arquivo INTEIRO (comentários inclusive); 6 aliases de coluna conferidos por leitura"
        status: pass
    human_judgment: false
  - id: D3
    description: "O smoke de asserção negativa tem esperado fixo 4, as 4 etiquetas, gate-GUC que reprova run parcial, e zero statement de escrita"
    requirement: "INVENT-05"
    verification:
      - kind: other
        ref: "`grep -icE '\\b(insert|delete)\\b'` == 0; 4 etiquetas `PASS (a..d)`; `v_esperado int := 4`; 5 `set_config('smoke42i.pass'...)` (1 inicialização + 4 incrementos)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Os commits deste plano foram criados com o hook de pre-commit executando e passando — zero `--no-verify`"
    requirement: "INVENT-05"
    verification:
      - kind: other
        ref: "`tsc errors: 97 (frozen baseline: 97)` impresso pelo hook nos DOIS commits (791bd51, 3d88374) e registrado no corpo de cada um"
        status: pass
    human_judgment: false
  - id: D5
    description: "O predicado corrigido está VIVO em PROD, com o raio de impacto medido antes pela mesma consulta, code review bloqueante antes do apply, e as asserções negativas 4/4 depois"
    requirement: "INVENT-05"
    verification:
      - kind: other
        ref: "CHECKPOINT — passos 1 a 10 abaixo. NÃO EXECUTADO: o subagente não recebe os tools MCP do Supabase (anthropics/claude-code#13898)"
        status: unknown
    human_judgment: true
    rationale: "Todo o efeito real desta correção é sobre um objeto vivo em produção. O repositório prova a FORMA da correção; só o apply medido prova o COMPORTAMENTO. O portão de fase destrutiva existe justamente para não deixar as duas coisas serem confundidas"

status: complete
---

# Phase 42 / Plan 42-12: correção do predicado da purga de retenção (INVENT-05) — Summary

Corrigido, **em código**, o único defeito destrutivo latente do inventário: o agendamento
`ai-logs-retention-cleanup` (02:00 diárias, vivo desde a Phase 6) nega pertencimento a uma
subconsulta que pode produzir linha nula — e essa negação avalia para nulo, nunca para verdadeiro,
para **toda** linha candidata, fazendo a purga apagar zero em silêncio. A migration, a consulta que
mede o raio de impacto e o smoke de asserção negativa existem e passam todos os gates. **Nada foi
aplicado em produção.**

---

## ⏳ CHECKPOINT PENDENTE — BLOQUEANTE (Tasks 2 e 3)

**Por que este plano para aqui:** subagentes GSD não recebem os tools MCP do Supabase (bug upstream
anthropics/claude-code#13898), `supabase db push` é proibido neste repositório (SQLSTATE 42601 em
corpos `$$`, CLAUDE.md) e a CLI não está autenticada. O executor **não consegue** aplicar migrations
nem consultar PROD. Mesmo se conseguisse, este plano é `autonomous: false` e o portão de fase
destrutiva exige decisão humana antes do apply.

**INVENT-05 NÃO está entregue até o passo 8 fechar.**

### Task 2 — CHECKPOINT DE DECISÃO (vem PRIMEIRO)

**Pergunta:** aplicar em PROD a correção do predicado do `ai-logs-retention-cleanup`?

A decisão é **de mão única**. O efeito é fazer uma purga agendada que hoje pode apagar zero passar a
apagar de verdade, todo dia às 02:00. Linhas removidas de `ai_call_logs` não voltam por rollback de
migration — voltariam só por restauração de backup, e a janela é curta.

**A decisão não pode ser tomada sem os números medidos HOJE.** Rode o passo 1 abaixo primeiro; ele é
insumo da decisão, não consequência dela.

| Opção | Quando é a resposta certa | Custo |
|---|---|---|
| **`aplicar-agora`** (recomendada) | `alcance_corrigido` == 0 — raio de impacto nulo e verificado no momento do apply | A primeira execução às 02:00 seguintes passa a apagar de verdade; se o registro de logs voltar a funcionar entre o apply e essa execução, o acumulado vai de uma vez |
| `aplicar-com-recorte` | `alcance_corrigido` > 0 e o volume torna o primeiro apagamento grande demais para ser observável | Introduz predicado temporário que alguém precisa lembrar de remover — promessa sem código que a execute, a classe de defeito que esta fase documenta |
| `adiar` | Só se o portão não puder ser cumprido nesta sessão | INVENT-05 é requirement DESTA fase e o critério de sucesso #5 do ROADMAP depende dele; adiar deixa um predicado incorreto rodando por mais um milestone |

**Sinal de retomada:** cole os 5 números medidos e escolha `aplicar-agora`, `aplicar-com-recorte` ou
`adiar`.

### Task 3 — o que o orquestrador tem de rodar, NESTA ORDEM

A ordem **é** o portão, não uma sugestão. Cada passo produz evidência que o passo seguinte destrói.

---

**Passo 1 — MEDIR ANTES.** `execute_sql` com o conteúdo de
`docs/compliance/sql/04-invent05-blast-radius.sql`, sem alterar uma vírgula.

Anote os 6 valores. **Este é o fato datado de raio de impacto e tem de existir antes do apply** —
depois dele, a evidência de qual era o estado anterior é irrecuperável.

*Esperado (se o defeito seguir latente como em 2026-07-29):* `total_logs` 0, `total_decisions` 0,
`decisions_com_null_no_array` 0, `alcance_atual` 0, `alcance_corrigido` 0.
⚠ Esse "esperado" é uma **expectativa**, não uma verificação: o valor que vale é o medido.

---

**Passo 2 — DRY-RUN, pela mesma consulta.** Não é um comando novo: `alcance_atual` e
`alcance_corrigido` do passo 1 **são** o dry-run — o predicado vivo e o predicado novo avaliados
como contagem, sem apagar nada.

Registre o delta explicitamente:

```
delta = alcance_corrigido − alcance_atual
```

**Se o delta for > 0, VOLTE à Task 2** — a natureza do apply mudou e a escolha
`aplicar-agora` deixa de ser automática.

---

**Passo 3 — CODE REVIEW BLOQUEANTE, ANTES DO APPLY.** Revisão sobre os 3 arquivos:

- `supabase/migrations/20260730000005_p42_invent05_not_exists.sql`
- `docs/compliance/sql/04-invent05-blast-radius.sql`
- `supabase/tests/p42_invent05_cron_smoke.sql`

Veredito explícito, registrado. **O apply não acontece sem ele.** Origem da exigência
(`.planning/STATE.md`): a Phase 39 fechou sem `VERIFICATION.md` e sem code review, e 2 defeitos
CRÍTICOS chegaram a produção.

---

**Passo 4 — REGISTRAR O CORPO VIVO, imediatamente antes do apply.**

```sql
SELECT jobid, jobname, schedule, active, md5(command) AS md5_cmd, command
  FROM cron.job ORDER BY jobname;
```

*Esperado:* **exatamente 3** agendamentos, todos `active`; e o `command` de
`ai-logs-retention-cleanup` ainda idêntico ao que `docs/compliance/cron-inventory.md` registrou em
2026-07-29 (a negação por lista com `unnest`).

**Guarde os `md5_cmd` dos outros dois agendamentos** (`ai-cost-aggregation`, `notif-retry-sweep`) —
eles são a base da asserção negativa byte a byte do passo 7, que o smoke estático não tem como
fazer sozinho.

⚠ Divergência aqui significa que alguém alterou o agendamento entre as duas coletas. **PARE e
escale** — é o achado que o `processo-origem-do-drift-desconhecida` mantém aberto.

---

**Passo 5 — APLICAR.** MCP `apply_migration`, nome `p42_invent05_not_exists`, conteúdo do arquivo
`20260730000005_p42_invent05_not_exists.sql`.

Depois, **reconciliar o ledger** para o prefixo `20260730000005` (em sequência após
`20260730000004`, aplicada pelo 42-08). `apply_migration` carimba uma `version` PRÓPRIA, de tempo
de apply — a linha em `supabase_migrations.schema_migrations` tem de ser reparada.

**Fidelidade do transporte é PROVÁVEL — assere-a, não a presuma:**

```sql
SELECT version, name, md5(statements[1]) AS md5_aplicado
  FROM supabase_migrations.schema_migrations
 WHERE name LIKE '%invent05%';
```

Compare com o md5 do arquivo local:

```bash
md5 -q supabase/migrations/20260730000005_p42_invent05_not_exists.sql   # macOS
```

Os dois applies de hoje (42-07 e 42-08) saíram byte-idênticos por esse mesmo método.

---

**Passo 6 — MEDIR DEPOIS, pela MESMA consulta.** Rode outra vez
`docs/compliance/sql/04-invent05-blast-radius.sql`, sem alterar uma vírgula. Cole os dois outputs
lado a lado.

⚠ **`total_logs` NÃO pode ter mudado.** O apply substitui um agendamento; não executa a purga. Se
mudou, isso é **incidente, não resultado** — pare e investigue antes de seguir.

*Esperado também:* `alcance_atual` e `alcance_corrigido` **iguais aos do passo 1**. A consulta lê os
predicados que ela mesma carrega, não o agendamento — o apply não deveria movê-los.

---

**Passo 7 — ASSERÇÕES NEGATIVAS.** Rode `supabase/tests/p42_invent05_cron_smoke.sql` numa **ÚNICA**
chamada `execute_sql` (o gate por GUC é escopado à sessão; statements espalhados por chamadas
separadas zeram o contador e reprovam em (z) por run parcial — precedente P41-05).

*Esperado:* **4/4 PASS** e o NOTICE do RESUMO.

E o complemento que o arquivo estático não pode fazer — a igualdade byte a byte dos vizinhos:

```sql
SELECT jobname, md5(command) FROM cron.job ORDER BY jobname;
```

Os `md5` de `ai-cost-aggregation` e `notif-retry-sweep` têm de ser **idênticos** aos guardados no
passo 4. O de `ai-logs-retention-cleanup` tem de ser `b64ca58d089f3ed580205e95a40c4e5f`.

---

**Passo 8 — `VERIFICATION.md` DA FASE, com veredito explícito.** Cole: os dois outputs da mesma
consulta (antes/depois), o delta do dry-run, o veredito do code review do passo 3, o corpo do
agendamento antes e depois, os md5 dos 3 agendamentos nas duas coletas, e o resultado 4/4 do smoke.

**Um `VERIFICATION.md` ausente ou em rascunho REPROVA o portão de fase destrutiva.**

---

**Passo 9 — `docs/compliance/cron-inventory.md`.** A seção **"Depois da correção"** já existe,
pré-preenchida. Preencher as células ⏳ e virar a linha *Estado em PROD* de
`⏳ NÃO APLICADA` para a data do apply. **Não editar** o bloco do corpo anterior — ele está marcado
como não-editável e é o lado esquerdo do antes/depois.

---

**Passo 10 — COMMIT com o hook executando e passando.** Zero `--no-verify`. Registrar
`tsc errors: 97 (frozen baseline: 97)` no corpo do commit, como nos dois commits deste plano.

### Tabela de falhas — o que cada uma significa

| Onde falha | Significado | Ação |
|---|---|---|
| Passo 1 devolve `decisions_com_null_no_array` > 0 | O defeito **está armado**, não latente. A purga já está apagando zero em silêncio | Não é motivo para parar — é motivo para aplicar. Registre no `VERIFICATION.md`: o requirement estava ativo, não latente |
| Passo 2: delta > 0 | A correção passa a alcançar linhas reais. O apply deixa de ser passo automático | **Volte à Task 2.** Decisão do operador entre `aplicar-agora` e `aplicar-com-recorte` |
| Passo 3: review levanta achado | Portão fechado por desenho | Corrigir no repositório, novo commit com hook, **repetir do passo 1** (os números envelheceram) |
| Passo 4: ≠ 3 agendamentos, ou corpo divergente do registrado em 42-05 | Existe um caminho de escrita apontado para o cron **fora do repositório** | **PARE e escale.** É a hipótese que o `processo-origem-do-drift-desconhecida` mantém aberta; aplicar por cima destruiria a evidência |
| Passo 5: md5 do `statements[1]` ≠ md5 do arquivo | O transporte alterou o SQL no caminho | Não prossiga para o smoke. Compare os dois textos e reaplique a partir do arquivo |
| Passo 6: `total_logs` mudou | Algo apagou linhas. **Incidente** — o apply não executa a purga | PARE. Investigue antes de qualquer outro passo; a evidência do estado anterior é o passo 1 |
| Passo 7 falha em (a) | Agendamento duplicado ou removido — o guard de remoção condicional não funcionou | A purga rodaria duas vezes por noite. Corrigir antes de qualquer coisa |
| Passo 7 falha em (b) | O corpo vivo não casa byte a byte com a migration | A mensagem traz md5 vivo, octetos e dois discriminadores estruturais. Se `forma antiga presente = true`, o apply não pegou |
| Passo 7 falha em (c) | Horário mudou, ou o agendamento ficou inativo | Um agendamento correto porém inativo é a política de retenção seguindo sem executar — mesmo desfecho do defeito, por outra via |
| Passo 7 falha em (d) | A correção tocou um agendamento fora do escopo | Violação de T-42-41. Reverter o que foi tocado antes de fechar |
| Passo 7 falha em (z) com N < 4 | Run parcial — o smoke foi partido em várias chamadas `execute_sql` | Repetir numa **única** chamada. NÃO tratar N parcial como verde |

---

## Performance

- **Duração:** ~45 min
- **Tasks:** 1 de 3 executada (2 e 3 são checkpoints bloqueantes, retornados ao orquestrador)
- **Arquivos:** 3 criados, 1 modificado
- **Commits:** 2, ambos com o hook executando e passando

## Accomplishments

1. **A mecânica do defeito ficou registrada onde ela é auditável** — no cabeçalho da migration, em
   três fatos encadeados e sem simplificação: a declaração `uuid[] NOT NULL` impede o **array** de
   ser nulo e não seus **elementos**; `unnest` de um elemento nulo produz linha nula; e a negação de
   pertencimento a um conjunto que contém nulo avalia para nulo — nunca verdadeiro — para **toda**
   linha candidata. O arquivo diz também por que a forma nova é imune e por que remendar a atual
   seria pior.

2. **A medição precede a correção, e é a mesma dos dois lados.** `04-invent05-blast-radius.sql` é um
   arquivo versionado justamente para que "antes" e "depois" não sejam duas digitações da mesma
   intenção. `alcance_atual` e `alcance_corrigido` avaliam os dois predicados como contagem: o
   dry-run não é um passo separado que alguém pode pular, é uma coluna do resultado.

3. **As 4 asserções do smoke são negativas por desenho**, e o arquivo explica por quê: uma asserção
   positiva ("o alvo tem o corpo novo") passa igualmente num banco onde a correção funcionou e num
   onde ela funcionou **e levou junto outra coisa**.

4. **Zero `--no-verify`, satisfeito de verdade.** Os dois commits imprimiram
   `tsc errors: 97 (frozen baseline: 97)`. Isso só é possível porque o 42-01 converteu o hook em
   gate de não-regressão — com o hook binário anterior, o requisito do portão era literalmente
   insatisfazível honestamente.

5. **Um defeito da própria pesquisa foi pego antes de entrar no artefato de medição** — ver
   Deviations, Rule 1.

## Task Commits

| Task | Commit | Descrição |
|---|---|---|
| 1 | `791bd51` | `fix(42-12)` — a consulta de raio de impacto, o smoke de asserção negativa e a migration da correção |
| 1 (doc) | `3d88374` | `docs(42-12)` — seção "Depois da correção" pré-preenchida no `cron-inventory.md` |
| 2 | — | CHECKPOINT DE DECISÃO — retornado ao orquestrador |
| 3 | — | CHECKPOINT DE APPLY — retornado ao orquestrador |

## Files Created/Modified

**Criados**

| Arquivo | O que é |
|---|---|
| `docs/compliance/sql/04-invent05-blast-radius.sql` | A mesma consulta, antes e depois. 5 números + carimbo UTC. Read-only asserido por grep sobre o arquivo inteiro |
| `supabase/tests/p42_invent05_cron_smoke.sql` | 4 asserções negativas de catálogo, gate-GUC `smoke42i.pass`, esperado fixo 4. Zero verbo de escrita |
| `supabase/migrations/20260730000005_p42_invent05_not_exists.sql` | A correção. Guard de remoção condicional idempotente + substituição em lugar (mesmo nome, mesmo horário) |

**Modificado**

| Arquivo | Mudança |
|---|---|
| `docs/compliance/cron-inventory.md` | Seção "Depois da correção" pré-preenchida (corpo novo, md5, o que muda/não muda, tabelas antes/depois com células ⏳); bloco do corpo anterior marcado não-editável; limite nº 1 corrigido (o artefato deixou de ser fotografia de data única) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] A consulta de detecção de nulo indicada pela pesquisa devolveria `false` sempre**

- **Encontrado em:** Task 1, ao escrever `04-invent05-blast-radius.sql`.
- **Problema:** o §E5 do `42-RESEARCH.md` — que o plano manda ler como fonte da consulta alvo —
  propõe `ai_call_log_ids @> ARRAY[NULL]::uuid[]` para contar decisões com elemento nulo no array.
  **Contenção de arrays compara elementos por igualdade**, e igualdade contra nulo nunca é
  verdadeira: essa expressão devolve `false` para todo array, inclusive para um que de fato contenha
  um elemento nulo. A coluna `decisions_com_null_no_array` reportaria `0` em silêncio, para todo
  estado do banco.
- **Por que importa mais do que um erro de digitação:** `decisions_com_null_no_array` é justamente o
  número que diz se o defeito está **latente** ou **armado**. Um `0` falso ali faria o checkpoint
  concluir "latente, delta 0, pode aplicar" sem que nada disso tivesse sido verificado — e o modo de
  falha seria **idêntico** ao do defeito que o INVENT-05 corrige: um predicado que envolve nulo
  devolvendo silenciosamente o resultado errado, sem erro e sem sinal.
- **Correção:** `array_position(ai_call_log_ids, NULL) IS NOT NULL`. `array_position` busca com
  semântica `IS NOT DISTINCT FROM`, então localiza elemento nulo.
- **Evidência de que esta é a forma certa, e não preferência:** `docs/compliance/sql/02-cron-live.sql:65`
  (plano 42-05, já versionado nesta mesma fase) **já usa** `array_position(..., NULL) IS NOT NULL`.
  A pesquisa contradiz um artefato versionado da própria fase; ganhou o artefato.
- **Arquivo:** `docs/compliance/sql/04-invent05-blast-radius.sql` (a razão ficou escrita no cabeçalho,
  para que a próxima pessoa tentada pelo operador de contenção encontre o aviso antes do erro).
- **Commit:** `791bd51`

**2. [Rule 2 — Funcionalidade crítica ausente] A consulta de raio de impacto não carimbava a própria data**

- **Encontrado em:** Task 1.
- **Problema:** o plano especifica 5 colunas e manda o orquestrador "anotar os 5 números e a
  data/hora UTC". A data ficaria fora da consulta, dependendo de alguém lembrar de registrá-la.
- **Por que é Rule 2 e não preferência:** o portão de fase destrutiva exige um **fato datado**. Uma
  data que depende de memória humana é uma promessa sem código que a execute — a classe exata de
  defeito que esta fase inteira existe para caçar. E o modo de falha nomeado pela Pitfall 7 é
  precisamente citar uma contagem antiga como se fosse corrente: sem carimbo no resultado, não há
  como distinguir um output de hoje de um colado de 2026-07-29.
- **Correção:** 6ª coluna `coletado_em_utc` (`now() AT TIME ZONE 'UTC'`). Os 5 números especificados
  continuam todos lá. Precedente na mesma família de artefatos: `02-cron-live.sql:66`.
- **Commit:** `791bd51`

### Decisões de implementação registradas (não são correções)

**A asserção (b) compara por `md5`, não por string literal.** O critério de aceitação exige
comparação byte a byte **e** exige `grep -icE '\b(insert|delete)\b' == 0` sobre o smoke. Transcrever
o corpo esperado violaria o segundo — o corpo contém o verbo de escrita. Em vez de escolher entre os
dois, o md5 satisfaz ambos e é **mais forte** que a alternativa proibida: igualdade de resumo sobre
o texto inteiro detecta um espaço a mais ou uma quebra de linha a menos, que uma comparação por
`strpos` não detectaria.

**O md5 esperado foi derivado por execução, nunca transcrito.** Extraído do texto entre os dois
delimitadores `$CRON$` do arquivo de migration:
`b64ca58d089f3ed580205e95a40c4e5f`, 299 octetos. O cabeçalho do smoke traz o bloco de
**proveniência** — valor, origem, data, comando de recomputação e a advertência de que re-pinar o
resumo sem a migration ter mudado esvazia a asserção. É o mesmo idioma do bloco de proveniência da
baseline do `.husky/pre-commit`. Há ainda uma checagem estrutural redundante logo após a comparação
de md5, cuja única função é gritar se alguém re-pinar o resumo indevidamente.

**A asserção (d) não usa md5 para os vizinhos, e o arquivo diz por quê.** O inventário de 42-05
**descreveu** o corpo do agregador em vez de transcrevê-lo, então não existe resumo de referência
para comparar. (d) assere o que aquele artefato de fato registrou — horário, estado ativo,
assinatura de corpo — e a igualdade byte a byte dos vizinhos foi movida para o **passo 4/7 do
checkpoint**, por `md5(command)` coletado antes e depois. O limite está escrito dentro do próprio
smoke, para não passar por asserção mais forte do que é.

**A seção "Depois da correção" foi escrita antes do apply, com ⏳ em vez de números.** Escrevê-la
depois deixaria o orquestrador redigindo estrutura no meio do checkpoint, que é o pior momento para
decidir o que registrar. Escrevê-la com números plausíveis seria fabricar evidência. As células ⏳
vêm com legenda explícita de "campo do checkpoint, não resultado" e uma advertência de leitura no
topo da seção.

## Issues Encountered

Nenhum bloqueio técnico. O único limite é estrutural e previsto: o executor não alcança PROD.

## Known Stubs

Nenhum stub de código. O que existe de deliberadamente incompleto está **declarado como tal**:

| Item | Arquivo | Por que não é stub silencioso | Quem resolve |
|---|---|---|---|
| Células ⏳ da seção "Depois da correção" | `docs/compliance/cron-inventory.md` | Marcadas com legenda "campo do checkpoint, não resultado" + advertência de leitura no topo da seção + linha "Estado em PROD: ⏳ NÃO APLICADA" | Passo 9 do checkpoint |
| `supabase/tests/p42_invent05_cron_smoke.sql` está RED | — | Documentado no cabeçalho: a asserção (b) compara contra um corpo que só existe pós-apply | Passo 7 do checkpoint |

## Threat Flags

Nenhuma superfície de segurança nova. Os dois arquivos de consulta são read-only e essa propriedade
é asserida por grep, não afirmada em prosa. A migration não toca tabela, política, índice, função
nem permissão — só a definição de um agendamento.

Sobre o registro STRIDE do plano:

| Threat | Estado ao fim deste plano |
|---|---|
| T-42-05 (destruição de dado) | Mitigação **escrita, não exercitada**. O dry-run existe como coluna da consulta; o checkpoint de decisão e o code review bloqueante são os passos 2 e 3 |
| T-42-41 (escopo do apply) | Metade fechada: os outros dois nomes de agendamento **não aparecem** na migration (grep == 0). A outra metade é a asserção (d) do smoke, pós-apply |
| T-42-42 (repúdio / evidência do estado anterior) | Reforçado além do plano: o bloco do corpo anterior no `cron-inventory.md` ganhou marca de **não-editável**, e o passo 4 re-confere o corpo vivo imediatamente antes do apply |
| T-42-43 (bypass do gate de tipos) | **Fechado.** Dois commits, hook executando e passando, saída registrada no corpo de cada um |
| T-42-SC (supply chain) | Sem alteração — zero pacote novo, zero extensão nova |

## Next Phase Readiness

O critério de sucesso #5 do ROADMAP e o requirement INVENT-05 **dependem do checkpoint**. Este é o
último plano da Phase 42; a fase não fecha sem o `VERIFICATION.md` com veredito (passo 8), que é
exigência do portão de fase destrutiva e não formalidade.

A Phase 46 (purga automática) herda daqui três coisas reutilizáveis: o idioma da consulta única
rodada antes e depois, o formato de asserção negativa por md5 de corpo de agendamento, e a
constatação de que restrição de projeto por grep negativo pode produzir uma asserção mais forte do
que a forma que ela proíbe.

## Self-Check: PASSED

- Arquivos criados/modificados — 4/4 existem em disco.
- Commits — `791bd51` e `3d88374` presentes em `git log`, ambos com
  `tsc errors: 97 (frozen baseline: 97)` impresso pelo hook.
- Deleções acidentais — `git diff --diff-filter=D HEAD~1 HEAD` vazio nos dois commits.
- Gate automatizado do plano — `INVENT05_SHAPE_OK` (3 arquivos existem; `NOT EXISTS`
  não-comentário == 1; negação-por-lista não-comentário == 0; verbos de escrita na consulta == 0;
  verbos de escrita no smoke == 0; `sh .husky/pre-commit` exit 0).
