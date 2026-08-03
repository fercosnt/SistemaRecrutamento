# Phase 44 — Live-Catalogue Measurements (M1, M2, M4, M5)

**Medido em:** 2026-08-03 06:09–06:11 UTC
**Por:** orquestrador (`mcp__supabase__execute_sql`), projeto `isljnozzlvckrgjjbjwp`
**Natureza:** READ-ONLY. M1/M2/M4 leem só catálogo (`information_schema`, `pg_policies`) — zero PII.
M5 lê `curriculo_url` de `candidaturas` em forma **agregada** (contagens), nunca valores.

> **Por que este arquivo existe.** A `44-RESEARCH.md` declarou uma lacuna honesta: subagentes GSD
> não recebem os tools MCP do Supabase, então toda contagem de coluna daquela pesquisa vem do YAML
> de **2026-07-29**, não de uma medição de hoje. A pesquisa prescreveu cinco medições READ-ONLY que
> o **orquestrador** deveria rodar antes de a allowlist ser travada. Quatro delas rodaram aqui.
> A quinta (M3) é pós-apply e pertence ao plano.

---

## M1 — Totais de escopo: o YAML envelheceu, e envelheceu no lugar que importa

Consulta **(d)** de `docs/compliance/sql/01-pii-catalog.sql`, sem alteração.

| | YAML (`meta.escopo`, 2026-07-29) | **Vivo (2026-08-03 06:09:19 UTC)** | Δ |
|---|---|---|---|
| Tabelas base `public` | 64 | **67** | **+3** |
| Colunas `public` | 993 | **1013** | **+20** |
| FKs `public` | 102 | **104** | **+2** |

**Cinco dias de drift, e não é ruído.**

### As 3 tabelas ausentes do YAML por completo

Verificado por busca literal do nome em `pii-inventory.yaml` (zero ocorrências, nem em regra nem em
prosa):

| Tabela | Colunas | Origem |
|---|---|---|
| `config_sla_revisao` | 5 | Phase 42 — `20260730000001_p42_revisao_art20.sql:442`. Criada **um dia depois** da coleta do inventário |
| `config_retencao_etapa` | 5 | Phase 43 — `20260801000002_p43_config_retencao.sql` |
| `classe_evento_notificacao` | 3 | Phase 42/43 (pipeline de notificação) |

13 das 20 colunas novas são dessas três tabelas. Nenhuma delas é PII do titular — são tabelas de
configuração e de vocabulário. **Fora do escopo do export**, mas dentro do escopo do smoke SQL do
SC#3 se o predicado do smoke for por schema em vez de por allowlist.

### ⚠ O achado que muda o plano: 4 colunas de `autorizacoes` são INVISÍVEIS ao YAML

| Coluna | Ocorrências em `pii-inventory.yaml` |
|---|---|
| `autorizacoes.consent_text_version` | **0** |
| `autorizacoes.consent_text_hash` | **0** |
| `autorizacoes.consent_registrado_em` | **0** |
| `autorizacoes.autorizacao_marketing_vagas` | **0** |

**Estas são exatamente as "colunas de consentimento versionado" que o ROADMAP nomeia como a razão
de a Phase 44 depender da Phase 43** (`ROADMAP` §Phase 44, *Depends on*: "as colunas de
consentimento versionado entram na allowlist do export").

A decisão da `44-CONTEXT.md` (Área 2, Q1) é que a allowlist seja **derivada do
`pii-inventory.yaml`**. Executada literalmente contra o YAML de hoje, essa decisão produziria um
`export-allowlist.json` que **omite em silêncio as quatro colunas que são a dependência declarada da
fase**. A decisão continua certa; o insumo é que está velho.

**Consequência obrigatória para o plano:** o gerador da allowlist não pode ler o YAML como fonte
única. Ou (a) o YAML é atualizado a partir do catálogo vivo **antes** de a allowlist ser gerada, ou
(b) o gerador lê o catálogo vivo e usa o YAML apenas para *classificação*, tratando coluna viva
ausente do YAML como **erro de fechamento**, nunca como omissão silenciosa. A opção (b) é a que
sobrevive ao próximo drift; a (a) resolve hoje e reabre na Phase 45.

Uma 5ª coluna nova em tabela existente: `candidaturas.opcao_knockout_id` (0 ocorrências no YAML).

---

## M2 — Catálogo coluna-a-coluna (tabelas do escopo provável do export)

Colhido do catálogo vivo. Contagens por tabela candidata a escopo:

| Tabela | Colunas vivas |
|---|---|
| `candidatos` | 32 |
| `candidaturas` | 39 |
| `autorizacoes` | 16 |
| `agendamentos_entrevista` | 15 |
| `historico_candidatura` | 8 |
| `preferencias_notificacoes` | 17 (⚠ é de **`usuario_rh_id`** — PII de RH, **não** do titular; fora do escopo do export) |

`preferencias_notificacoes` chaveia por `usuario_rh_id`, não por candidato. A pesquisa já havia
alertado que o vocabulário do YAML classifica para a Phase 45 (o que a exclusão faz), não para a
Phase 44 (é dado do titular sob o Art. 18, II) — esta tabela é o exemplo vivo: um `preservar` que é
PII de **terceiro**.

O catálogo completo (1013 linhas, formato `tabela|coluna`) é reproduzível pela consulta **(a)** de
`01-pii-catalog.sql`. Não é colado aqui: o artefato versionado do escopo é o
`export-allowlist.json` que o plano vai gerar, com `medido_em`.

---

## M4 — Policies vivas do bucket `curriculos` — **DUAS convenções de pasta coexistem**

`SELECT policyname, cmd, roles, qual FROM pg_policies WHERE schemaname='storage' AND tablename='objects'`

Policies do bucket `curriculos` (5 de 25 no total de `storage.objects`):

| Policy | cmd | `foldername(name)[1]` compara com |
|---|---|---|
| `Candidato lê próprios currículos` | SELECT | **`candidatos.id`** |
| `curriculos_select_own_or_rh` | SELECT | **`auth.uid()`** |
| `Candidato faz upload de currículo` | INSERT | **`candidatos.id`** |
| `Candidato pode fazer upload de currículo` | INSERT | **`candidatos.id`** (via `::uuid IN`) |
| `curriculos_insert_own` | INSERT | **`auth.uid()`** |
| `curriculos_update_own` / `Candidato atualiza próprios currículos` | UPDATE | `auth.uid()` / `candidatos.id` |
| `curriculos_delete_own` | DELETE | `auth.uid()` |
| `Admin deleta currículos` | DELETE | RH `administrador` |

**Dois fatos que o plano precisa carregar:**

1. **`curriculos_select_own_or_rh` não tem ramo de RH.** Apesar do nome, seu `qual` é own-only via
   `auth.uid()`. Isso **confirma** o docblock da Phase 32 (`get-curriculo-url/index.ts:5-8`): a
   Migration A dropou o ramo de leitura role-only. O nome ficou mentindo; o objeto está certo.

2. **As policies de SELECT são OR'd e cobrem convenções DIFERENTES.** Um candidato lê o próprio CV
   se a pasta for `candidatos.id` **ou** `auth.uid()`. Isso torna o caminho client-side do
   Achado #1 **seguro sob as duas convenções** — uma propriedade melhor do que a pesquisa supôs.

⚠ **Achado colateral (não causado por esta fase, mas registrável):** três policies de INSERT com
duas convenções de pasta é um defeito latente de consistência. Um upload novo pode cair em qualquer
uma. Não bloqueia a Phase 44; é insumo da Phase 45, onde o caminho de Storage vira destrutivo e
"achar o blob" deixa de ser barato.

---

## M5 — Prefixo real dos caminhos de CV — **fecha o Achado #1**

Estendida em relação à prescrição da pesquisa: a consulta original só testava `auth.uid()`, mas o
M4 mostrou que há duas convenções vivas, então mede as duas.

| Métrica | Valor |
|---|---|
| CVs com `curriculo_url` não-nulo | **3** |
| ...com prefixo = `candidatos.user_id` (= `auth.uid()`) | **3** |
| ...com prefixo = `candidatos.id` | **0** |
| ...com prefixo de nenhum dos dois | **0** |
| ...sem barra alguma no caminho | **0** |

**Veredito:** 100% dos CVs vivos usam a convenção `auth.uid()/…`. A premissa do Achado #1 se
sustenta: **o candidato pode cunhar o próprio signed URL client-side**, com `service_role` fora do
caminho do CV do titular — o caminho de menor privilégio.

⚠ **Honestidade sobre o n:** são **3 currículos**. A conclusão é sólida para o dado existente e o
raciocínio de M4 (policies OR'd) a estende para ambas as convenções, mas nenhuma das duas é uma
prova de volume. O plano deve tratar "o CV do titular é legível pelo próprio titular" como
**asserção testada em runtime** (falha por linha, copy própria — já é a resolução E3/`error` da
UI-SPEC), nunca como invariante assumido a partir de n=3.

---

## M3 — pendente, por construção

`SELECT ... FROM pg_policies WHERE tablename IN ('solicitacoes_dados','config_sla_dados')`

As duas tabelas ainda não existem. **M3 é tarefa do plano**, imediatamente após o apply das
migrations e antes de qualquer asserção de RLS ser declarada satisfeita — o idioma "o arquivo não é
o objeto vivo" que a Phase 42 (42-07) e a Phase 43 (A1) já pagaram para aprender duas vezes.

---

## Regra de honestidade de número (herdada de `04-invent05-blast-radius.sql:30-40`)

Nenhum número citado no plano pode vir de documento datado. O número que autoriza a decisão é o
medido minutos antes dela. **Todo número no `export-allowlist.json` carrega `medido_em`.**
