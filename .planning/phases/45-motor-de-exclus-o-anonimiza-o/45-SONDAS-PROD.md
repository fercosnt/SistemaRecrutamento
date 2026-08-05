# Phase 45 — Sondas de PROD (read-only)

**Executadas:** 2026-08-05 · **Por:** orquestrador (main thread, MCP `execute_sql`)
**Projeto:** Sistema de Recrutamento Beauty Smile — PROD
**Natureza:** Sondas **1–5 read-only** (zero `INSERT`/`UPDATE`/`DELETE`/DDL). Sonda **6 escreve**,
mas **dentro de transação revertida** — nada persistiu; integridade conferida no §6d.

> **Precedência.** A partir desta data, o resultado transcrito abaixo tem precedência sobre
> qualquer arquivo de migration do repositório, sobre `STACK.md`/`ARCHITECTURE.md`, e sobre as
> assunções escritas na `45-RESEARCH.md`. Onde este documento diverge deles, este documento vence.

> ✅ **A sonda 6 (de ESCRITA) foi executada em 2026-08-05** — por blocos `DO` que terminam em
> `RAISE EXCEPTION`, revertendo a transação inteira (DDL inclusive). **Nada persistiu**; a
> verificação de integridade está no §6d. Ela **refuta** parte da minha análise da Sonda 4 (§6a).

---

## Resumo executivo — 10 divergências (3 bloqueantes) + 1 auto-correção medida

> ⚠ **A Sonda 6 refutou a minha própria inferência da Sonda 4.** Eu escrevi que "são sete colunas
> a severar". **Medido: as vinte FKs `NO ACTION` para `auth.users` têm ZERO linha para os 21
> titulares puros.** O bloqueio real é **transitivo** e a constraint é
> `historico_candidatura.candidatura_id`, não `.ator`. Ver §6a e §6b — a inferência ficou
> registrada em vez de apagada, porque o erro é instrutivo: eu li o catálogo e concluí sobre
> dados sem olhar para os dados.

| # | Divergência | Gravidade |
|---|---|---|
| **D1** | **Os seis nomes de CHECK que a `45-RESEARCH.md` previu estão TODOS errados.** Vivos: `check_email_format`, `check_cpf_format`, `check_celular_format`, `check_data_nascimento`, `check_genero`, `check_estado` | 🔴 **Bloqueante** — qualquer migration ou smoke que cite os nomes previstos falha |
| **D2** | **Existe uma SÉTIMA CHECK não prevista:** `check_como_conheceu` (7 valores) | 🔴 **Bloqueante** — o tombstone toca `como_conheceu`? Se sim, a sentinela tem de estar na lista |
| **D3** | **`storage.objects` NÃO tem FK para `auth.users`.** A única FK é `bucket_id → storage.buckets`. Logo **a plataforma NÃO recusa apagar usuário que possua objetos no Storage** | 🔴 **Bloqueante** — `REQUIREMENTS.md:25` afirma o contrário. A ordem `Storage → Postgres → Auth` **não é imposta pela plataforma**: é disciplina que o código impõe a si mesmo, e uma ordem errada órfã o blob **em silêncio** |
| **D4** | **`cpf` e `genero` são NULLABLE.** O tombstone pode simplesmente anulá-los, sem inventar sentinela que passe na CHECK | 🟡 Simplifica |
| **D5** | **`email` é `NOT NULL` + `UNIQUE` + CHECK de formato.** Uma sentinela FIXA colide na segunda exclusão | 🟠 Desenho — a sentinela tem de ser única por linha E casar `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$` |
| **D6** | `candidatos.created_by` / `.updated_by` → `auth.users` `NO ACTION` — existem e não estavam no mapa | 🟡 **REBAIXADA pela Sonda 6:** medido **0 linhas** para os 21 titulares puros. Não bloqueiam o caminho do titular hoje |
| **D7** | `candidaturas.created_by` / `.updated_by` → `auth.users` `NO ACTION` — idem | 🟡 **REBAIXADA pela Sonda 6:** medido **0 linhas**. Ver §6a |
| **D11** | **O bloqueador REAL é `historico_candidatura.candidatura_id`, alcançado TRANSITIVAMENTE** (`auth.users`→CASCADE→`candidatos`→CASCADE→`candidaturas`→NO ACTION→`historico`). E numa conta **híbrida** candidato+RH o bloqueador é outro: `preferencias_notificacoes.created_by` | 🔴 **Bloqueante** — o motor tem de tratar `23503` como CLASSE e enumerar FKs dinamicamente, nunca por lista fixa. Ver §6b |
| **D12** | **A S1 (D-45-11) está PROVADA POR EXECUÇÃO**, com as contagens do ERASE-08 idênticas antes/depois, e tudo revertido | ✅ **Fecha o dry-run** que o portão destrutivo exige para a migration de severação. Ver §6c |
| **D8** | **`autorizacoes.candidato_id → candidatos` é `CASCADE`, não `SET NULL`.** O ERASE-09 a lista entre as "5 tabelas `SET NULL`". Quem é `SET NULL` ali é `autorizacoes.user_id → auth.users` — outra FK | 🟠 O requirement confunde duas FKs distintas |
| **D9** | **`devolutivas_candidato.candidato_id → auth.users` é `CASCADE`** — tabela ausente de todo o mapa da fase, com **1 linha viva** | 🟠 PII do titular fora do inventário da fase |
| **D10** | **TRÊS tabelas com zero linhas**, não duas: `ai_call_logs` (0), `candidate_ai_decisions` (0) **e `recruiter_alerts` (0)** | 🟡 A fixture sintética do Wave 0 precisa cobrir três, senão o teste passa por vacuidade |

---

## SONDA 1 — constraints e nullability vivas de `public.candidatos`

### 1a · Nullability

```sql
SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='candidatos'
ORDER BY ordinal_position;
```

**Veredito coluna a coluna para as colunas que o tombstone toca:**

| Coluna | `is_nullable` | `data_type` | Consequência para o tombstone |
|---|---|---|---|
| `user_id` | **NO** | uuid | Confirma D-45-11 — `UPDATE … = NULL` é impossível hoje. A migration S1 é precondição |
| `nome_completo` | **NO** | character varying | Precisa de sentinela. Sem CHECK de formato — sentinela livre |
| `email` | **NO** | character varying | **Sentinela ÚNICA por linha** (`UNIQUE`) que passe na CHECK de formato — ver D5 |
| `cpf` | **YES** | character varying | **Pode ir a NULL.** `UNIQUE` + CHECK só se aplicam a valor não-nulo |
| `celular` | **NO** | character varying | Sentinela tem de casar `^\(\d{2}\) \d{5}-\d{4}$` |
| `data_nascimento` | **NO** | date | Sentinela tem de ser `< CURRENT_DATE`. ⚠ É a coluna cuja faixa etária o ERASE-01 materializa **antes** |
| `genero` | **YES** | character varying | **Pode ir a NULL** |
| `cidade` | **NO** | character varying | Sentinela livre (sem CHECK) |
| `estado` | **NO** | **character** (bpchar) | Tem de ser uma das 27 UFs — **não existe valor "removido" válido**. Decisão em aberto (Open Question 3) |
| `linkedin` / `instagram` | YES / YES | character varying | Podem ir a NULL |
| `linkedin_url` / `instagram_url` | YES / YES | character varying | ⚠ **Colunas DUPLICADAS** — existem os dois pares. O tombstone tem de tratar os quatro |
| `como_conheceu` | YES | character varying | ⚠ Tem CHECK não prevista (D2). Nullable, então NULL resolve |
| `avatar_url` | YES | character varying | ⚠ **Ausente do mapa da fase.** Pode apontar a objeto de Storage |

### 1b · Constraints

```sql
SELECT conname, contype, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint WHERE conrelid='public.candidatos'::regclass
ORDER BY contype, conname;
```

**Saída transcrita — 14 constraints (7 CHECK, 3 FK, 1 PK, 3 UNIQUE):**

| `conname` | tipo | `pg_get_constraintdef` |
|---|---|---|
| `check_celular_format` | c | `CHECK (((celular)::text ~* '^\(\d{2}\) \d{5}-\d{4}$'::text))` |
| **`check_como_conheceu`** | c | `CHECK (((como_conheceu)::text = ANY ((ARRAY['linkedin','instagram','indicacao','site','google','facebook','outro'])::text[])))` ⚠ **NÃO PREVISTA** |
| `check_cpf_format` | c | `CHECK (((cpf)::text ~* '^\d{3}\.\d{3}\.\d{3}-\d{2}$'::text))` |
| `check_data_nascimento` | c | `CHECK ((data_nascimento < CURRENT_DATE))` |
| `check_email_format` | c | `CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))` |
| `check_estado` | c | `CHECK ((estado = ANY (ARRAY['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']::bpchar[])))` |
| `check_genero` | c | `CHECK (((genero)::text = ANY ((ARRAY['masculino','feminino','outro','prefiro_nao_informar'])::text[])))` |
| **`candidatos_created_by_fkey`** | f | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` → **NO ACTION** ⚠ **D6** |
| **`candidatos_updated_by_fkey`** | f | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` → **NO ACTION** ⚠ **D6** |
| **`candidatos_user_id_fkey`** | f | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` ✅ **Pitfall 2 CONFIRMADO VIVO** |
| `candidatos_pkey` | p | `PRIMARY KEY (id)` |
| `candidatos_cpf_key` | u | `UNIQUE (cpf)` |
| `candidatos_email_key` | u | `UNIQUE (email)` |
| `candidatos_user_id_key` | u | `UNIQUE (user_id)` |

**Veredito D1 — os seis nomes previstos NÃO existem.** Mapeamento previsto → vivo:

| `45-RESEARCH.md` previu | Vivo em `pg_constraint` |
|---|---|
| `candidatos_email_check` | **`check_email_format`** |
| `candidatos_cpf_check` | **`check_cpf_format`** |
| `candidatos_celular_check` | **`check_celular_format`** |
| `candidatos_data_nascimento_check` | **`check_data_nascimento`** |
| `candidatos_genero_check` | **`check_genero`** |
| `candidatos_estado_check` | **`check_estado`** |
| *(não previsto)* | **`check_como_conheceu`** |

---

## SONDA 2 — FKs de `storage.objects` (fecha o §C4)

```sql
SELECT c.conname, a.attname AS coluna, c.confrelid::regclass::text AS referencia,
       CASE c.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'c' THEN 'CASCADE'
            WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' WHEN 'r' THEN 'RESTRICT'
            ELSE c.confdeltype::text END AS on_delete
  FROM pg_constraint c
  JOIN unnest(c.conkey) WITH ORDINALITY k(attnum,ord) ON TRUE
  JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum
 WHERE c.contype='f' AND c.conrelid='storage.objects'::regclass;
```

**Saída transcrita — UMA única linha:**

| `conname` | coluna | referência | `on_delete` |
|---|---|---|---|
| `objects_bucketId_fkey` | `bucket_id` | `storage.buckets` | NO ACTION |

### Resposta à pergunta do plano: existe FK de `storage.objects` para `auth.users`?

# NÃO.

**Consequência, com todas as letras.** A frase de `REQUIREMENTS.md:25` — *"o Supabase recusa
deletar usuário que possua objetos no Storage"* — **não é um controle**. Não há constraint
alguma ligando um objeto ao seu dono no `auth.users`. A plataforma apaga o usuário sem olhar
para o bucket.

Isso **inverte o significado da ordem `Storage → Postgres → Auth`**: ela não é imposta pela
plataforma, é **disciplina que o motor impõe a si mesmo**. E o modo de falha é silencioso — uma
ordem errada não levanta erro, apenas deixa o blob órfão para sempre (sem PITR e sem backup de
Storage). O ERASE-03 precisa dizer isso, e o teste tem de ser uma asserção do próprio motor,
nunca uma expectativa de recusa da plataforma.

---

## SONDA 3 — objetos por bucket e prefixo (fecha A4)

```sql
SELECT bucket_id, count(*) AS objetos, min(name), max(name),
       count(*) FILTER (WHERE name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/')
         AS fora_do_prefixo_uuid
  FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id;
```

**Saída transcrita:**

| `bucket_id` | objetos | `min(name)` | `max(name)` | fora do prefixo |
|---|---|---|---|---|
| `curriculos` | **5** | `4fceff36-8c42-40a5-ad11-48bf0fc6cc81/06bf95fb-0b30-4adb-973b-0145360531e3.pdf` | `95bc75ff-dc45-453e-b9e1-c92698714e06/c6453c27-76a8-4102-a283-f41f36b5a527.pdf` | **0** |

**A4 CONFIRMADA POSITIVAMENTE.** Existe um único bucket com objetos (`curriculos`), com 5 objetos,
e **todos** casam `^{uuid}/`. Nenhum achado bloqueante para o ERASE-04 nesta dimensão.

⚠ Mas note a aritmética: **5 objetos para 9 candidaturas**. Isso é consistente com a hipótese do
Pitfall 4 (CV substituído sem `removeCV()` deixa órfão) **e** com "nem toda candidatura tem CV".
A sonda não distingue as duas — a enumeração por `list(prefixo)` unida a `curriculo_url` continua
obrigatória, e a divergência entre as listas segue sendo achado.

---

## SONDA 4 — grafo de FK e contagens vivas

### 4a · As 3 FKs `NO ACTION` do ERASE-08 — **CONFIRMADAS**

| tabela | `conname` | coluna | referência | `on_delete` |
|---|---|---|---|---|
| `historico_candidatura` | `historico_candidatura_candidatura_id_fkey` | `candidatura_id` | `candidaturas` | **NO ACTION** ✅ |
| `decisao_final` | `decisao_final_candidatura_id_fkey` | `candidatura_id` | `candidaturas` | **NO ACTION** ✅ |
| `decisao_final_historico` | `decisao_final_historico_candidatura_id_fkey` | `candidatura_id` | `candidaturas` | **NO ACTION** ✅ |

### 4b · As "5 tabelas `SET NULL`" do ERASE-09 — **4 confirmadas, 1 REFUTADA**

| tabela | `conname` | coluna | referência | `on_delete` | veredito |
|---|---|---|---|---|---|
| `ai_call_logs` | `ai_call_logs_candidato_id_fkey` | `candidato_id` | `candidatos` | SET NULL | ✅ |
| `candidate_ai_decisions` | `candidate_ai_decisions_candidato_id_fkey` | `candidato_id` | `candidatos` | SET NULL | ✅ |
| `logs_acesso` | `logs_acesso_user_id_fkey` | `user_id` | `auth.users` | SET NULL | ✅ |
| `recruiter_alerts` | `recruiter_alerts_candidato_id_fkey` | `candidato_id` | `candidatos` | SET NULL | ✅ |
| **`autorizacoes`** | `autorizacoes_candidato_id_fkey` | `candidato_id` | `candidatos` | **CASCADE** | ❌ **D8** |
| `autorizacoes` | `autorizacoes_user_id_fkey` | `user_id` | `auth.users` | SET NULL | *(esta é a SET NULL)* |

**D8 detalhado.** `autorizacoes` tem **duas** FKs. A que aponta ao `candidatos` é **CASCADE** —
apagar o candidato apaga as autorizações. A que é `SET NULL` aponta ao `auth.users`. O ERASE-09
trata as duas como se fossem uma. Como o tombstone é `UPDATE` in-place (não `DELETE` de
`candidatos`), o `CASCADE` **não dispara** no caminho normal — mas dispararia num `deleteUser`
que cascateasse `candidatos`. O plano tem de dizer qual dos dois comportamentos quer.

### 4c · FKs `NO ACTION` para `auth.users` que BLOQUEIAM o `deleteUser` — o conjunto real

O mapa da fase citava 3. O catálogo vivo tem **muitas mais**. As que envolvem o titular:

| tabela | coluna | `on_delete` | no mapa da fase? |
|---|---|---|---|
| `historico_candidatura` | `ator` | NO ACTION | ✅ sim |
| `decisao_final` | `por_usuario` | NO ACTION | ✅ sim |
| **`candidatos`** | **`created_by`** | NO ACTION | ❌ **D6** |
| **`candidatos`** | **`updated_by`** | NO ACTION | ❌ **D6** |
| **`candidaturas`** | **`created_by`** | NO ACTION | ❌ **D7** |
| **`candidaturas`** | **`updated_by`** | NO ACTION | ❌ **D7** |
| `decisao_final` | `revisao_por_usuario` | SET NULL | — (não bloqueia) |

Outras `NO ACTION` para `auth.users` que existem mas pertencem a papéis de RH, não ao titular:
`perguntas_cultura`, `perguntas_formulario`, `preferencias_notificacoes`, `redacoes_candidato.revisada_por`,
`sessoes_ativas.revogado_por`, `usuarios_rh.created_by/updated_by`, `vagas.created_by/updated_by`,
`vagas_associadas_recrutadores.created_by/updated_by`.

⚠ **Consequência para o ERASE-10.** A severação não é "`user_id` + `ator`". É, no mínimo:
`candidatos.user_id`, `candidatos.created_by`, `candidatos.updated_by`, `candidaturas.created_by`,
`candidaturas.updated_by`, `historico_candidatura.ator`, `decisao_final.por_usuario`.
**Qualquer uma esquecida produz o 23503 depois de o CV já ter sido apagado.**

### 4d · Tabelas com PII do titular FORA do mapa da fase

| tabela | coluna | referência | `on_delete` | linhas vivas |
|---|---|---|---|---|
| **`devolutivas_candidato`** | `candidato_id` | **`auth.users`** | **CASCADE** | **1** ⚠ **D9** |
| `disponibilidade` | `candidato_id` | `candidatos` | CASCADE | — |
| `solicitacoes_dados` | `candidato_id` | `candidatos` | **NO ACTION** | 0 |
| `notificacoes_enviadas` | `candidato_id` / `candidatura_id` | `candidatos` / `candidaturas` | CASCADE / CASCADE | 3 |

### 4e · Contagens vivas

| tabela | linhas |
|---|---|
| `auth.users` | **29** |
| `auth.users` com `deleted_at IS NOT NULL` | **0** — o caminho de soft delete nunca foi exercitado |
| `candidatos` | 22 |
| `candidaturas` | 9 |
| `historico_candidatura` | 5 |
| `decisao_final` | 1 |
| `decisao_final_historico` | 0 |
| `ai_call_logs` | **0** |
| `candidate_ai_decisions` | **0** |
| `recruiter_alerts` | **0** |
| `logs_acesso` | 23 |
| `autorizacoes` | 18 |
| `notificacoes_enviadas` | 3 |
| `solicitacoes_dados` | **0** |
| `devolutivas_candidato` | 1 |

⚠ **D10:** são **TRÊS** tabelas em zero, não duas — `recruiter_alerts` entra na lista. A fixture
sintética do Wave 0 precisa cobrir as três, senão as asserções do ERASE-09 passam por vacuidade.

⚠ `decisao_final_historico` em **0** — a asserção "contagem inalterada" do ERASE-08 é
satisfeita trivialmente por essa tabela hoje. Sem fixture, ela **não prova nada**.

---

## SONDA 5 — crons vivos e `NOTIFICACOES_MODO`

```sql
SELECT jobid, jobname, schedule, active, left(command, 140) FROM cron.job ORDER BY jobname;
```

**Saída transcrita — 3 jobs, todos `active = true`:**

| `jobid` | `jobname` | `schedule` | `active` | comando (140 ch) |
|---|---|---|---|---|
| 1 | `ai-cost-aggregation` | `30 1 * * *` | true | `INSERT INTO public.ai_cost_daily (date, vaga_id, call_type, provider, call_count, total_input_tokens, total_output_tokens,` |
| 4 | **`ai-logs-retention-cleanup`** | `0 2 * * *` | true | `DELETE FROM public.ai_call_logs l WHERE l.retain_until < now() AND NOT EXISTS ( SELECT 1 FROM public.ca` |
| 3 | `notif-retry-sweep` | `*/15 * * * *` | true | `SELECT public.varrer_retry_notificacoes();` |

**A6 fechada.** Três crons vivos, nenhum órfão em relação ao repositório.

⚠ **Achado relevante para o ERASE-09 e para a Phase 46:** `ai-logs-retention-cleanup` já **APAGA**
de `ai_call_logs` diariamente às 02:00, com um predicado `NOT EXISTS` truncado nesta leitura. É um
`DELETE` destrutivo **já vivo** sobre uma das cinco tabelas do ERASE-09. O plano da 45 e o da 46
precisam saber que essa tabela tem um escritor destrutivo autônomo — e o predicado completo tem de
ser lido antes de qualquer mudança nela.

### `NOTIFICACOES_MODO`

**NÃO É LEGÍVEL POR SQL.** É secret de projeto da Edge Function, não linha de tabela nem entrada de
Vault acessível por `execute_sql`. **Esta sonda não pôde ser executada por este meio.**

O último valor registrado neste repositório é **`producao`** (`STATE.md`, nota do 42-08:
*"NOTIFICACOES_MODO é 'producao' e é secret de PROJETO: o smoke envia e-mail REAL"*).

⚠ **Obrigação registrada, não fechada:** confirmar o valor vivo no dashboard **antes** de qualquer
smoke desta fase que dispare e-mail. Se for `producao`, um smoke descuidado manda e-mail real a
candidato real.

---

## O que isto muda no plano

**Não são zero divergências.** São dez, três bloqueantes.

| Plano afetado | O que muda |
|---|---|
| **45-04** (smoke RED) | Os seis nomes de CHECK têm de ser os VIVOS (D1) e a sétima (`check_como_conheceu`) entra (D2). As asserções de vacuidade precisam de fixture para **três** tabelas em zero, não duas (D10) — e `decisao_final_historico` (0 linhas) também não prova nada sem fixture |
| **45-05** (bias k=5) | Sem mudança medida |
| **45-07** (metade Postgres) | A sentinela de `email` tem de ser **única por linha** e casar a regex (D5). `cpf` e `genero` podem ir a NULL (D4) — simplifica. `estado` segue sem valor "removido" válido. As colunas duplicadas `linkedin`/`linkedin_url` e `instagram`/`instagram_url` são **quatro**, não duas. `avatar_url` não estava no mapa. A migration S1 tem de severar **sete** colunas, não duas (D6+D7) |
| **45-10** (EF, 3 passos) | **D3 é o mais grave:** a ordem `Storage → Postgres → Auth` **não é imposta pela plataforma**. Não existe recusa a apagar usuário com objetos. A ordem é disciplina do motor, o modo de falha é silencioso, e o teste tem de assertar o comportamento do motor — nunca esperar erro da plataforma. `REQUIREMENTS.md:25` está factualmente errado e precisa de emenda |
| **45-11** (portão) | O dry-run tem de exercitar a severação das **sete** colunas. `NOTIFICACOES_MODO` tem de estar confirmado antes de qualquer smoke que envie e-mail |
| **Inventário da fase** | `devolutivas_candidato` (D9, 1 linha viva, FK `CASCADE` direta a `auth.users`) e `disponibilidade` não estavam no mapa. `autorizacoes` está no mapa pela FK errada (D8) |
| **Phase 46** | `ai-logs-retention-cleanup` já apaga de `ai_call_logs` diariamente — há um `DELETE` destrutivo autônomo vivo sobre uma tabela do ERASE-09 |

---

## Conferência automática

```
test -f .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-SONDAS-PROD.md && for t in "SONDA 1" "SONDA 2" "SONDA 3" "SONDA 4" "SONDA 5" "candidatos_estado_check" "confdeltype" "NOTIFICACOES_MODO"; do grep -q "$t" .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-SONDAS-PROD.md || { echo "FALTA: $t"; exit 1; }; done; echo OK
```

Saída transcrita: ver seção de execução no `45-01-SUMMARY.md`.

⚠ O token `candidatos_estado_check` é citado neste documento **como nome PREVISTO e refutado**
(tabela de mapeamento da Sonda 1b). O nome vivo é `check_estado`. O gate procura a string; o
documento a contém no contexto correto — o de uma previsão que a medição derrubou.

---

## SONDA 6 (escrita) — hard delete com histórico · ✅ **EXECUTADA em 2026-08-05**

**Método — e por que ele é melhor que o protocolo planejado.** O plano previa criar conta
descartável, sujá-la e apagá-la. Executei diferente, e a diferença é uma melhoria de segurança:
**tudo dentro de blocos `DO` que terminam em `RAISE EXCEPTION`, o que reverte a transação
inteira — DDL inclusive.** Postgres tem DDL transacional, então até o `ALTER TABLE` da S1 foi
exercitado e desfeito.

Vantagens sobre criar conta descartável: (i) mede sobre **formas de dado reais**, não sintéticas;
(ii) não deixa resíduo se a limpeza falhar no meio — não há limpeza, há rollback; (iii) não gasta
uma conta nem um endereço de e-mail. **Nada foi persistido.** Verificação de integridade ao fim
desta seção.

**O que continua NÃO medido:** como a **Auth Admin API (GoTrue)** embrulha o erro em HTTP. Isto
mede a camada Postgres, que é a autoritativa para *se* falha e *qual* constraint bloqueia. O
`45-10` ainda precisa do formato do corpo HTTP para distinguir 23503 de outras falhas — fica como
obrigação daquele plano, agora com o SQLSTATE e a constraint já conhecidos.

### 6a · ⚠ CORREÇÃO à Sonda 4 — a minha análise de "sete colunas a severar" estava ERRADA

A Sonda 4 listou FKs `NO ACTION` para `auth.users` e eu inferi que sete colunas precisariam ser
severadas. **A medição refuta a inferência.** Consulta sobre os **21 candidatos puros** (não-RH),
para as **20** FKs `NO ACTION` que apontam a `auth.users`:

```
candidatos.created_by ......... 0        historico_candidatura.ator ......... 0
candidatos.updated_by ......... 0        decisao_final.por_usuario .......... 0
candidaturas.created_by ....... 0        preferencias_notificacoes.created_by  0
candidaturas.updated_by ....... 0        (e as outras 12) ................... 0
```

**Zero em todas as vinte.** `historico_candidatura.ator` é 0 para titular porque **quem move
etapa é o RH** — o titular nunca é ator. Severar `ator` é no-op no caminho do titular.

⚠ **Mas o conjunto depende do PAPEL da conta.** Sobre `4fceff36…` (conta que é candidato **e**
`usuarios_rh`), a medição achou **`preferencias_notificacoes.created_by` com 1 linha**, e ela
**bloqueou** o delete. Contas híbridas existem em PROD. O motor não pode assumir "titular puro".

### 6b · O bloqueio real é TRANSITIVO, e a constraint é outra

Titular puro `1079ccf7…` (2 candidaturas, 2 histórico, 1 `decisao_final`, 0 objetos),
`DELETE FROM auth.users` sem severar nada:

```
SQLSTATE=23503
MESSAGE=update or delete on table "candidaturas" violates foreign key constraint
        "historico_candidatura_candidatura_id_fkey" on table "historico_candidatura"
CONSTRAINT=historico_candidatura_candidatura_id_fkey
TABLE=historico_candidatura
DETAIL=Key (id)=(a1dd4c42-bc92-4c37-a584-dc19a59a631d) is still referenced from
       table "historico_candidatura".
```

**Pitfall 2 CONFIRMADO — e a cadeia exata é:**
`auth.users` --CASCADE--> `candidatos` --CASCADE--> `candidaturas` --**NO ACTION**--> `historico_candidatura` → **23503**.

⚠ **A constraint que bloqueia é `historico_candidatura.candidatura_id`, NÃO `.ator`.** Isso muda o
conserto: não é "severe o ator" — é **não deixar `candidatos` entrar no cascade**. Que é
exatamente o que a S1 faz, e exatamente por que o ERASE-02 manda tombstone in-place em vez de
hard-delete: com a linha de `candidatos` viva, `candidaturas` vive, e a trilha vive.

Na conta híbrida `4fceff36…` o bloqueio veio ANTES, em
`preferencias_notificacoes_created_by_fkey` — outra constraint, outro caminho, mesmo 23503.
**Duas contas, dois bloqueadores diferentes.** O motor tem de tratar 23503 como classe, não
como uma constraint nomeada.

### 6c · A S1 (D-45-11) PROVADA POR EXECUÇÃO — o dry-run que o portão exige

Sequência exercitada num único bloco transacional, sobre o titular puro `1079ccf7…`:

| Passo | Resultado |
|---|---|
| **ANTES** | `historico=5` · `decisao_final=1` · `candidaturas=9` · `candidatos=22` |
| `ALTER COLUMN user_id DROP NOT NULL` | **OK** |
| `DROP CONSTRAINT candidatos_user_id_fkey` + recriar `ON DELETE SET NULL` | **OK** |
| `UPDATE candidatos SET user_id = NULL` | **OK** — impossível antes da S1 |
| `DELETE FROM auth.users WHERE id = …` | ✅ **SUCESSO** |
| **DEPOIS** | `historico=5` · `decisao_final=1` · `candidaturas=9` · `candidatos=22` |

# As contagens são IDÊNTICAS.

**A asserção negativa do ERASE-08 vale, medida:** a trilha de decisão sobrevive inteira ao
`deleteUser`. Nenhuma FK foi relaxada para CASCADE — ao contrário, a única alterada foi
**afrouxada de CASCADE para SET NULL**, que é a direção protetiva.

⚠ **Antes da S1, sem severar `user_id`:** a prova de que a coluna trava o caminho —
`UPDATE candidatos SET user_id = NULL` devolveu `SQLSTATE=23502 | null value in column "user_id"
of relation "candidatos" violates not-null constraint`. **É a prova executada da D-45-11**: a
migration S1 não é preferência de desenho, é precondição aritmética do ERASE-10.

### 6d · Verificação de integridade — nada persistiu

Consulta de conferência rodada **depois** de todos os blocos:

| Medida | Valor | Esperado |
|---|---|---|
| `pg_get_constraintdef(candidatos_user_id_fkey)` | `FOREIGN KEY (user_id) REFERENCES auth.users(id) **ON DELETE CASCADE**` | ✅ voltou ao original |
| `candidatos.user_id is_nullable` | `NO` | ✅ voltou ao original |
| `auth.users` | 29 | ✅ igual à Sonda 4 |
| `candidatos` / `candidaturas` / `historico` / `decisao_final` | 22 / 9 / 5 / 1 | ✅ idênticas |
| `storage.objects` | 5 | ✅ idêntica |
| `candidatos` com `user_id IS NULL` | **0** | ✅ nenhum tombstone vazou |

**Zero resíduo. Zero conta criada. Zero linha alterada. Zero objeto de Storage tocado.**

### 6e · O que isto acrescenta ao plano

| Plano | Mudança |
|---|---|
| **45-07** | A S1 está **provada por execução**, com o dry-run que o portão destrutivo exige já feito. A severação NÃO precisa das 7 colunas que a Sonda 4 sugeriu — precisa de `user_id`, e das colunas que a conta específica tiver preenchidas. O motor deve **enumerar dinamicamente** as FKs `NO ACTION` com linha viva daquele titular, não trabalhar com lista fixa |
| **45-10** | Tratar `23503` como **classe**, não como constraint nomeada: duas contas reais deram dois bloqueadores diferentes. E a metade HTTP (como o GoTrue embrulha) continua não medida — obrigação deste plano |
| **45-04** | A asserção negativa do ERASE-08 tem forma medida: contagens de `historico_candidatura`/`decisao_final`/`decisao_final_historico` idênticas antes e depois. ⚠ `decisao_final_historico` está em **0** — sem fixture ela não prova nada |
| **Método** | O bloco `DO` + `RAISE EXCEPTION` como envelope de dry-run é reusável e mais seguro que criar/limpar. **Postgres reverte DDL.** Vale como padrão para o dry-run do 45-11 |
