---
phase: 37-camada-de-dados-de-notifica-o-notificacoes-enviadas-config-s
plan: 02
subsystem: database
tags: [postgres, supabase, migrations, rls, schema-drift, plpgsql, smoke-test]

# Dependency graph
requires:
  - phase: 37-01
    provides: "37-SCHEMA-VIVO.md — dump literal do catálogo Postgres de PROD (colunas, constraints, índices, policies, enums, seed, ledger), única fonte da verdade do DDL"
provides:
  - "supabase/migrations/20260721000001_notificacoes_enviadas.sql — DDL declarativo fiel de public.notificacoes_enviadas (16 colunas, 5 constraints, 5 índices, RLS + rh_le_notificacoes, enum status_notificacao, COMMENTs verbatim)"
  - "supabase/migrations/20260721000002_config_sla_etapa.sql — DDL declarativo fiel de public.config_sla_etapa (5 colunas, 4 constraints, RLS + sla_public_read) + seed das 8 etapas"
  - "supabase/tests/p37_fidelidade_schema_smoke.sql — gate de fidelidade catálogo↔arquivo, 12 asserções somente-leitura, toggle v_pos_aditiva"
  - "Correspondência 1:1 restaurada entre o ledger de PROD e os arquivos do repo: um db reset/rebuild reproduz as duas tabelas em vez de perdê-las"
affects: [37-03, 38, 40, 41]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reconstrução declarativa de migration órfã: arquivo com a version que JÁ consta no ledger, cabeçalho de PROVENIÊNCIA, nunca aplicado"
    - "Gate de fidelidade de schema: PL/pgSQL somente-leitura comparando 6 catálogos por igualdade de tupla contra os literais do arquivo"
    - "Toggle de baseline (v_pos_aditiva) para manter um smoke estrutural re-executável nos dois lados de uma migration aditiva"
    - "Igualdade de predicado RLS catálogo-contra-catálogo (contra uma policy precedente auditada) em vez de contra string transcrita à mão"

key-files:
  created:
    - supabase/migrations/20260721000001_notificacoes_enviadas.sql
    - supabase/migrations/20260721000002_config_sla_etapa.sql
    - supabase/tests/p37_fidelidade_schema_smoke.sql
  modified: []

key-decisions:
  - "Fidelidade ao catálogo vence redação: os COMMENTs foram transcritos verbatim (em inglês) em vez de reescritos em pt-BR, com a glosa pt-BR em comentário SQL adjacente — reescrever o texto do COMMENT criaria divergência repo↔PROD"
  - "A asserção do qual de rh_le_notificacoes compara contra o qual da policy precedente rh_gerencia_agendamento (P33/WR-04), não contra uma string transcrita: o deparse do Postgres reescreve o predicado com parênteses/casts/quebras próprios, então transcrever à mão seria adivinhação"
  - "pg_constraint filtrado por contype IN ('p','u','f','c'): a partir do PG17 as restrições NOT NULL também aparecem como contype 'n' e desestabilizariam as contagens 5/4 entre versões de servidor"
  - "Verificação end-to-end num Postgres 17 descartável em vez de revisão por leitura: as duas migrations foram aplicadas de verdade num banco vazio e o smoke rodado contra o resultado (12/12), convertendo cada literal normalizado previsto em fato verificado"
  - "Contagem de índices = 5 nos DOIS modos do toggle (idx_notif_retry já existe em PROD; a 37-03 verifica em vez de criar)"

patterns-established:
  - "Cabeçalho de PROVENIÊNCIA em migration reconstruída: declara version no ledger, origem, data de descoberta do drift, proibição de aplicar, e onde vivem as lacunas posteriores"
  - "Negativos executados como prova de que um gate não é vazio: cada mitigação do threat model foi validada quebrando o schema num banco descartável e exigindo que o smoke pegasse"

requirements-completed: [LEDGER-01, LEDGER-02, LEDGER-03, TIMELINE-01]

# Metrics
duration: 24min
completed: 2026-07-22
---

# Phase 37 Plano 02: Reconciliação do Drift PROD→Repo Summary

**As duas tabelas de notificação que só existiam em PROD voltaram a ser declaradas no repositório, byte-a-byte fiéis ao catálogo — e a fidelidade foi provada aplicando as migrations num Postgres 17 real e rodando o gate contra elas, não por revisão de leitura.**

## Performance

- **Duração:** 24 min
- **Iniciado:** 2026-07-22T14:07:00Z
- **Concluído:** 2026-07-22T14:31:00Z
- **Tasks:** 3/3
- **Arquivos criados:** 3

## Accomplishments

### Task 1 — `20260721000001_notificacoes_enviadas.sql` (commit `a0b1ebf`)

Reconstrução declarativa do DDL vivo a partir das seções A..H do `37-SCHEMA-VIVO.md`:

- **16 colunas** na ordem de `ordinal_position`, com tipo (`udt_name`), nulidade e default do catálogo.
- **5 constraints com os nomes REAIS** — `notificacoes_enviadas_pkey`, `uq_notif_dedupe UNIQUE (dedupe_key)` (a guarda de idempotência do LEDGER-02), `notificacoes_enviadas_evento_check` com os 4 eventos do M7, e as 2 FKs `ON DELETE CASCADE` para `candidaturas`/`candidatos`. Os nomes default do Postgres são reproduzidos deterministicamente pelas declarações inline; `uq_notif_dedupe` (não-default) é explícito.
- **3 índices explícitos** transcritos verbatim do `indexdef` (total vivo = 5 com os 2 implícitos), incluindo o parcial `idx_notif_retry`.
- **Enum `status_notificacao`** na ordem de `enumsortorder`; `etapa_processo` apenas referenciado, nunca re-declarado.
- **RLS + `rh_le_notificacoes`** (SELECT, `{authenticated}`), o join-through vaga-scoped do LEDGER-03, com o literal de role **`administrador`**. O candidato-DENY continua implícito por default-deny, conforme travado no CONTEXT.
- **COMMENTs verbatim** — os de `status` e `dedupe_key` são contrato de implementação que a **Phase 38 herda**: o formato da `dedupe_key` e o protocolo de reivindicação (`ON CONFLICT … DO NOTHING RETURNING id` **antes** do envio) já estão especificados; a P38 deve segui-los, não reinventá-los.

### Task 2 — `20260721000002_config_sla_etapa.sql` (commit `ae91395`)

- **5 colunas**, `etapa` (`public.etapa_processo`) como PK; **4 constraints** com os nomes reais, incluindo `ck_sla_prazo_consistente` amarrando `prazo_valor`/`prazo_unidade` como par tudo-ou-nada.
- **RLS + `sla_public_read`** (`SELECT`, `{anon, authenticated}`, `USING (true)`) — leitura pública por design, que é o que a TIMELINE-02 / P40 precisa.
- **Seed 8/8** com `ON CONFLICT (etapa) DO NOTHING` (jamais upsert — re-seed sobrescreveria em PROD texto que já está correto). Os 8 rótulos foram conferidos **byte-a-byte contra a fonte por diff**, não por leitura; `atualizado_em` fica fora do INSERT para o default `now()` agir.

### Task 3 — `p37_fidelidade_schema_smoke.sql` (commit `8f0f629`)

**12 asserções somente-leitura** sobre 6 catálogos (`information_schema.columns`, `pg_constraint`/`pg_get_constraintdef`, `pg_indexes`, `pg_policies`, `pg_trigger`, `pg_enum`) + o seed. Comparação por igualdade de tupla/string — sem `LIKE`, sem normalização de espaços. Gate = contar os 12 PASS (Pitfall 2 do `seg33`: "não levantou exceção" é insuficiente).

O toggle `v_pos_aditiva` mantém o arquivo re-executável nos dois lados do apply da aditiva `20260722000002`, em vez de virar um smoke morto após a 37-03.

## Verificação executada (não apenas asserida)

O plano pedia fidelidade provada por execução. Como o executor não tem os tools MCP do Supabase, a prova foi feita num **Postgres 17.6 descartável** (mesma imagem `supabase/postgres` do stack local; container criado e **removido** ao fim, zero resíduo, zero contato com PROD):

| Verificação | Resultado |
|---|---|
| As duas migrations aplicam num banco vazio | ✅ limpo, sem erro |
| Smoke no modo baseline contra o schema que elas produzem | ✅ **12/12 PASS** |
| Aditiva da 37-03 simulada + smoke no modo `v_pos_aditiva=true` | ✅ 12/12 PASS |
| Modo baseline após a aditiva simulada | ✅ vermelho corretamente (`(a)`: 18 ≠ 16) → o toggle é real, não decorativo |

**Isto é o achado mais importante do plano:** todo literal *normalizado* previsto (`pg_get_constraintdef`, `indexdef`, tuplas de coluna, ordem de enum, bytes do seed) foi confirmado contra o deparse real do Postgres. Sem esse passo, esses literais seriam adivinhação sobre como o Postgres reescreve as definições — e o smoke chegaria vermelho na primeira execução do orquestrador.

### Negativos — prova de que o gate não é vazio

Cada mitigação do threat model foi validada **quebrando** o schema no banco descartável e exigindo que o smoke pegasse:

| Threat | Sabotagem aplicada | O gate pegou |
|---|---|---|
| T-37-02-03 (EoP) | Policy afrouxada, perdendo o `AND candidatura_id IN (…)` | ✅ `(e)`, com "ESCALAR (não ajustar este smoke)" |
| T-37-02-04 (EoP) | Literal de role trocado para `'admin'` | ✅ `(e)`, nomeando `administrador` vs `admin` |
| T-37-02-02 (Tampering) | `uq_notif_dedupe` renomeado para `uq_dedupe_key` | ✅ `(c)`, esperado vs `<ausente>` |
| T-37-02-07 (Tampering) | Rótulo pt-BR "melhorado" (acentuação removida) | ✅ `(j)`, mostrando as duas strings |

## Verificação do plano

- ✅ Os dois arquivos existem com os nomes exatos das versions do ledger
- ✅ Nenhum contém `IF NOT EXISTS`, `BEGIN;`, `COMMIT;` ou `DO UPDATE` fora de comentários
- ✅ Nenhum contém as lacunas da 37-03 (`destinatario_original`, `modo`, `tocar_atualizado_em`)
- ✅ O smoke é somente-leitura (grep por comandos de escrita nas linhas não-comentário = 0), tem o toggle e lê os 4 catálogos exigidos + `pg_trigger` e `pg_enum`
- ✅ `npm run lint` = **97 erros** `tsc` (baseline pré-existente inalterado; teto CI 104); **0** citam arquivos deste plano
- ✅ `npm run build` verde · `npm run test:run` verde (126 arquivos, **1018 testes**)

## Deviations from Plan

### 1. [Rule 3 — Bloqueio] O `qual` verbatim da policy não existia no dump; asserção redesenhada para catálogo-contra-catálogo

- **Encontrado em:** Task 3
- **Problema:** o plano manda asserir que o `qual` de `rh_le_notificacoes` é "idêntico ao literal do dump". Mas a seção D do `37-SCHEMA-VIVO.md` delega para o todo do drift, que traz uma **paráfrase** (e sabidamente errada no literal de role), não o texto do catálogo. O `qual` renderizado pelo `pg_policies` é produto do deparse do Postgres — parênteses, `::text`, `AS uid`, quebras de linha e indentação próprios. Transcrevê-lo à mão seria exatamente a adivinhação que o plano proíbe.
- **Correção:** a asserção compara o `qual` de `rh_le_notificacoes` por **igualdade exata contra o `qual` da policy precedente `rh_gerencia_agendamento`** (P33 / WR-04) — mesmo predicado, mesma coluna `candidatura_id`, mesmo literal de role, já auditada. Catálogo-contra-catálogo elimina o risco de transcrição e é uma prova *mais forte*: ela afirma que o LEDGER-03 vivo **é** o join-through vaga-scoped auditado. Reforçada por uma checagem do literal `administrador` via `strpos` (não `LIKE`). Ambos os caminhos foram validados pelos negativos 1 e 2 acima.
- **Arquivo:** `supabase/tests/p37_fidelidade_schema_smoke.sql` · **Commit:** `8f0f629`

### 2. [Rule 2 — Correção] Filtro `contype` em `pg_constraint` para estabilidade entre versões

- **Encontrado em:** Task 3
- **Problema:** a partir do PG 17, restrições `NOT NULL` também são registradas em `pg_constraint` (`contype = 'n'`). Um `count(*)` cru retornaria muito mais que as 5/4 constraints do dump, e o gate ficaria vermelho ou verde por motivo errado dependendo da versão do servidor.
- **Correção:** todas as consultas a `pg_constraint` filtram `contype IN ('p','u','f','c')`, documentado no cabeçalho. Validado no PG 17.6: contagens 5 e 4, como o dump.
- **Commit:** `8f0f629`

### 3. [Rule 1 — Bug] Aridade de `RAISE` na asserção (e)

- **Encontrado em:** Task 3, na revisão pré-execução
- **Problema:** o `RAISE EXCEPTION` da asserção (e) tinha 3 argumentos para 2 placeholders (um `%%` escapado contava como literal). PL/pgSQL só valida aridade de `RAISE` em **runtime** — o erro só apareceria no momento em que uma divergência real fosse detectada, isto é, exatamente quando a mensagem mais importa. O gate teria falhado com "too many parameters specified for RAISE" em vez de mostrar o predicado divergente.
- **Correção:** mensagem simplificada para 2 placeholders / 2 argumentos. Confirmado pelos negativos 1 e 2, que imprimiram a mensagem correta.
- **Commit:** `8f0f629`

### 4. [Decisão de fidelidade] `COMMENT ON TABLE` mantido verbatim em inglês, com glosa pt-BR adjacente

- **Encontrado em:** Task 2
- **Situação:** o plano (escrito antes de a Wave 1 revelar que os COMMENTs já existem em PROD) pedia um `COMMENT ON TABLE` novo citando "TIMELINE-01", "non-PII", "public-read" e "estimativa". O catálogo vivo já tem um COMMENT que cobre `TIMELINE-01`, `non-PII`, `Public-read` e `ESTIMATE, never countdown`.
- **Resolução:** a restrição de fidelidade vence — reescrever o texto do COMMENT produziria divergência repo↔PROD num campo que o plano manda transcrever. O COMMENT foi transcrito **verbatim**, e a glosa pt-BR (com os termos "ESTIMATIVA nunca countdown", o invariante non-PII e a explicação de `referencias`/`aprovado`) ficou em comentário SQL imediatamente acima, onde qualquer leitor do repo a encontra. O invariante non-PII exigido pela mitigação de T-37-02-05 está declarado nos dois lugares.
- **Arquivo:** `supabase/migrations/20260721000002_config_sla_etapa.sql` · **Commit:** `ae91395`

### 5. [Nota] O terceiro grep do `<verify>` da Task 1 é artefato de uma revisão anterior do plano

- O bloco `<verify>` da Task 1 procura `proxima_tentativa_em)\s*WHERE` esperando 0. Esse padrão foi escrito quando se supunha que o índice de retry seria criado pela 37-03. A Wave 1 provou que `idx_notif_retry` **já existe em PROD**, e o próprio corpo da Task 1 manda incluir "os índices da seção C que NÃO forem os implícitos de PK/UNIQUE" — o que inclui o de retry. Os *acceptance criteria* exigem grep 0 apenas para `destinatario_original` e `tocar_atualizado_em`, e ambos passam.
- O arquivo declara o índice em duas linhas (`… (proxima_tentativa_em)` / `WHERE (…)`), então o `<verify>` passa como escrito. Registrado para que ninguém "corrija" o arquivo removendo o índice: **removê-lo seria drift**, e o smoke pegaria (`(d)`: 4 ≠ 5).

## Nenhum contato com PROD

Este plano é 100% de arquivo, como o objetivo exige. Nada foi aplicado, nada foi re-seedado, nada foi editado retroativamente. As versions `20260721000001` e `20260721000002` seguem no ledger de PROD, e os arquivos agora existem para descrevê-las.

## Known Stubs

Nenhum. Os três arquivos são completos e auto-suficientes.

## O que a 37-03 herda

1. **Não criar `idx_notif_retry`** — já existe; verificar. A contagem de índices permanece 5.
2. **O smoke de fidelidade já está pronto para o pós-apply:** basta alternar `v_pos_aditiva := true` e re-rodar. As contagens esperadas já estão codificadas (18 colunas, 6 constraints, 5 índices, 1 trigger por tabela).
3. **A aditiva encolheu para duas coisas:** as colunas `destinatario_original`/`modo` (+CHECK) e a função/triggers `tocar_atualizado_em`.
4. **`public.tocar_atualizado_em()` não existe** → sem colisão. `update_updated_at_column()` existe mas seta `NEW.updated_at` (inglês) → não reusar.

## Para o orquestrador

O smoke precisa ser rodado por você via MCP `execute_sql` contra PROD — subagentes GSD não recebem os tools MCP do Supabase. Ele já está validado contra um Postgres 17 real com o schema que os arquivos produzem; rodá-lo contra PROD é o que fecha o triângulo dump → arquivo → **banco vivo**.

Se a asserção `(e)` falhar em PROD, leia a mensagem antes de agir: um predicado diferente significa que o LEDGER-03 vivo não é o que o repo declara — **escalar, não ajustar o smoke**.

## Self-Check: PASSED

Arquivos: `supabase/migrations/20260721000001_notificacoes_enviadas.sql` ✅ · `supabase/migrations/20260721000002_config_sla_etapa.sql` ✅ · `supabase/tests/p37_fidelidade_schema_smoke.sql` ✅
Commits: `a0b1ebf` ✅ · `ae91395` ✅ · `8f0f629` ✅
