# FK Audit — LIVE PROD (autoritativo)

**Coletado:** 2026-07-29, no kickoff do M8, via `pg_constraint` no banco de produção (Supabase MCP `execute_sql`).
**Por quê:** o pesquisador de STACK marcou o `ON DELETE` de `candidatos.user_id` como **bloqueante e não-verificado**, e o de ARCHITECTURE derivou o grafo dos arquivos de migration. Arquivo de migration não é evidência do estado vivo — este documento é.

> ⚠ **Este arquivo tem precedência sobre STACK.md e ARCHITECTURE.md em qualquer divergência sobre `ON DELETE`.** Eles leram `supabase/migrations/*.sql`; isto é `pg_constraint`.

---

## 🔴 Drift repo → PROD confirmado

| Coluna | Repositório diz | PROD tem | Consequência |
|---|---|---|---|
| `candidatos.user_id → auth.users` | `ON DELETE SET NULL` (`20260421000001_rate_limit_duplicate_check.sql:193`) | **`ON DELETE CASCADE`** | A migration usou `ADD COLUMN IF NOT EXISTS`: a coluna já existia no schema legado (era Figma Make, pré-ledger), então o statement virou **no-op** e a FK nunca foi alterada. O repo descreve uma semântica que o banco nunca teve. |

**Por que importa:** com `CASCADE`, apagar a linha em `auth.users` **cascateia** para `candidatos` → `candidaturas` (`candidaturas.candidato_id → candidatos` também CASCADE) → e aí bate nas 3 FKs `NO ACTION` abaixo, levantando **23503**. Com `SET NULL` (o que o repo sugere) o comportamento seria completamente diferente — a linha do candidato sobreviveria órfã. Qualquer plano desenhado a partir do arquivo estaria desenhado contra um banco que não existe.

Este é um item **adjacente ao débito conhecido** "drift PROD→repo de causa desconhecida" (`.planning/todos/pending/processo-origem-do-drift-desconhecida.md`), mas tem causa **identificada**: o idioma `ADD COLUMN IF NOT EXISTS` aplicado a uma coluna pré-existente silencia a cláusula FK. Vale procurar o mesmo padrão em outras migrations.

---

## As 3 FKs que bloqueiam `DELETE FROM candidaturas`

Confirmado 1:1 com o que o ARCHITECTURE.md derivou. Todas `NO ACTION` (default acidental — nenhuma cláusula `ON DELETE` foi escrita):

| Tabela | Coluna | Arquivo |
|---|---|---|
| `historico_candidatura` | `candidatura_id` | `20260607000001:39` |
| `decisao_final` | `candidatura_id` | `20260607000003:39` |
| `decisao_final_historico` | `candidatura_id` | `20260709000011:41` |

**As outras 25 FKs para `candidaturas(id)` são `ON DELETE CASCADE`** — inclusive todo o corpo psicométrico (`respostas_*`, `scores_*`, `redacoes_candidato`, `cognitivo_respostas`, `entrevista_*`) e `notificacoes_enviadas`.

## FKs para `auth.users` que bloqueiam o `deleteUser` de um candidato

| Tabela | Coluna | `ON DELETE` | Quem popula |
|---|---|---|---|
| `historico_candidatura` | `ator` | **NO ACTION** | 🔴 **O próprio candidato**, a cada transição própria do funil. É o bloqueio real do `deleteUser`. |
| `decisao_final` | `por_usuario` | NO ACTION | O **recrutador** — nunca o candidato. Não bloqueia a exclusão de candidato. |
| `redacoes_candidato` | `revisada_por` | NO ACTION | Recrutador. |
| `candidatos`/`candidaturas`/`vagas`/`usuarios_rh`/… | `created_by`, `updated_by` | NO ACTION | Usuários RH. |

⚠ **Correção de premissa do kickoff (registrada também no PROJECT.md):** `decisao_final.por_usuario NOT NULL` **não** é o obstáculo da purga. É o `auth.users(id)` do recrutador que decidiu (guardrail LGPD-02 / RNF-07a); apagar um candidato nunca toca essa coluna.

## Onde PII sobrevive a um CASCADE — as FKs `SET NULL`

Estas **não** apagam a linha; apenas desligam o ponteiro. A linha (e o que houver nela) permanece:

| Tabela | Coluna | Referência | Risco |
|---|---|---|---|
| `ai_call_logs` | `candidato_id` | `candidatos` | 🔴 **Alto** — logs de chamada de IA podem carregar conteúdo de prompt derivado de PII (CV, redação). Auditar as colunas antes de decidir. |
| `candidate_ai_decisions` | `candidato_id` | `candidatos` | Alto — decisões derivadas. |
| `logs_acesso` | `user_id` | `auth.users` | Médio — trilha de acesso. |
| `recruiter_alerts` | `candidato_id` | `candidatos` | Médio. |
| `autorizacoes` | `user_id` | `auth.users` | Baixo — mas `autorizacoes.candidato_id → candidatos` é CASCADE, então a linha some por esse caminho. |

**Implicação:** um `DELETE` que "funciona" deixa 5 tabelas com linhas órfãs. Detecção de PII por nome de coluna não pega nenhuma delas.

## Achado incidental

Existe uma tabela **`preferencias_notificacoes`** (FKs `created_by`/`updated_by` → `auth.users`). Relevante para a questão dos consentimentos órfãos (`autorizacao_comunicacao`): pode já haver uma estrutura de preferências não utilizada, análoga aos checkboxes coletados e nunca lidos. **Inspecionar antes de projetar qualquer opt-out** — pode ser reuso em vez de tabela nova.

---

## Consultas de reprodução

```sql
-- Grafo completo de FK com semântica de ON DELETE
SELECT c.conrelid::regclass::text AS tabela, a.attname AS coluna,
       c.confrelid::regclass::text AS referencia,
       CASE c.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
            WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS on_delete
FROM pg_constraint c
JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
WHERE c.contype = 'f'
  AND c.confrelid IN ('auth.users'::regclass, 'public.candidaturas'::regclass, 'public.candidatos'::regclass)
ORDER BY c.confdeltype, c.conrelid::regclass::text;
```

## Extensões — verificado ao vivo (fecha uma questão MEDIUM do STACK.md)

```sql
SELECT name, default_version, installed_version FROM pg_available_extensions
WHERE name IN ('anon','pgcrypto','pg_cron','pg_net','supabase_vault') ORDER BY name;
```

| Extensão | default | installed |
|---|---|---|
| `pg_cron` | 1.6.4 | **1.6.4** ✓ |
| `pg_net` | 0.19.5 | **0.19.5** ✓ |
| `pgcrypto` | 1.3 | **1.3** ✓ |
| `supabase_vault` | 0.3.1 | **0.3.1** ✓ |
| `anon` | — | **ausente do catálogo** |

✅ **`anon` (PostgreSQL Anonymizer) NÃO está disponível** neste projeto — não é "disponível mas não instalada": está fora de `pg_available_extensions`, ou seja, não há como instalar. Isso **promove a afirmação do STACK.md de MEDIUM para HIGH** (ele a marcou como inferência negativa por ausência de evidência). A recomendação dele decorre: o primitivo de anonimização é `UPDATE` de tombstone in-place via RPC `SECURITY DEFINER`, não uma extensão.

Nenhuma extensão nova é necessária para o M8 — as 4 que a purga/exclusão precisam já estão instaladas e versionadas acima.

---

## 🔴 Já existe uma purga de retenção rodando em PROD

`cron.job` ao vivo (3 jobs, todos `active=true`):

| jobname | schedule | o que faz |
|---|---|---|
| `ai-cost-aggregation` | `30 1 * * *` | agrega `ai_call_logs` → `ai_cost_daily` |
| **`ai-logs-retention-cleanup`** | **`0 2 * * *`** | **DELETE de retenção sobre `ai_call_logs`** |
| `notif-retry-sweep` | `*/15 * * * *` | `varrer_retry_notificacoes()` (M7/P41) |

```sql
-- comando vivo do ai-logs-retention-cleanup
DELETE FROM public.ai_call_logs
WHERE retain_until < now()
  AND id NOT IN (
    SELECT unnest(ai_call_log_ids) FROM public.candidate_ai_decisions
    WHERE status IN ('candidate_review_requested','human_reviewing'));
```

**Três implicações:**

1. **O M8 não inventa a primeira purga.** Há padrão estabelecido a reusar — retenção por coluna `retain_until` na própria linha, em vez de uma tabela de política externa. Avaliar reuso antes de projetar do zero.
2. **A ressalva já é ciente do Art. 20** — preserva o log enquanto houver revisão pendente (`candidate_review_requested` / `human_reviewing`). A fila do Art. 20 deve **integrar-se a esse gancho**, não duplicá-lo. É evidência de que alguém já pensou nessa interação.
3. 🔴 **Bug latente — footgun do `NOT IN` com NULL.** Se `unnest(ai_call_log_ids)` produzir um único elemento NULL, a condição vira NULL para *toda* linha e o `DELETE` apaga **zero**, em silêncio. Uma purga que parece funcionar e não funciona — exatamente o modo de falha mais perigoso de uma feature de retenção. Correção: `NOT EXISTS` ou `AND e.v IS NOT NULL` no unnest. **Estado atual: latente, não ativo** (ver contagens abaixo).

## Contagens ao vivo — calibram prioridade

| Tabela | Linhas | Leitura |
|---|---|---|
| `ai_call_logs` | **0** | O risco de PII órfã via FK `SET NULL` que levantei é hoje **teórico**. ⚠ Débito do M4: a P23 corrigiu a causa (coluna `prompt_version` ausente fazia todo log falhar mudo) e a tabela **continua zerada** — ou não há chamadas de IA em PROD, ou o logging segue quebrado. Fora do escopo do M8, mas vale um todo. |
| `candidate_ai_decisions` | **0** | O gancho de proteção do Art. 20 nunca foi exercitado. |
| `data_deletion_log` | **0** | Ver abaixo. |

## 🔴 Compliance pré-existente que nunca foi implementada (theater)

- **`data_deletion_log`** existe desde `20260609000001_prompt_library_schema.sql:315`, com RLS admin-only e o COMMENT literal: *"the Art.18 `delete_candidate_data()` function itself is deferred to Phase 15."*
- **A Phase 15 shipou (M2). A função nunca foi criada.** Verificado em `pg_proc`: `delete_candidate_data` **não existe** em PROD. Existem `limpar_logs_antigos()`, `gerar_bias_snapshot(p_periodo text)` e `varrer_retry_notificacoes()`.
- A tabela tem **0 linhas** e o único escritor vivo é o RPC de rollback da prompt-library (`20260609000002:227`), que grava `deletion_type` de *prompts* — não de candidatos. Ou seja: a tabela foi **repropósitada**, e o nome promete algo que ela não faz.

**Consequência de enquadramento:** o M8 **remove teatro de compliance pré-existente**, não adiciona compliance a um sistema neutro. Isso muda o tom do que é entregue e deve aparecer nos requirements.

## 🔴 A janela de retenção já está contratualmente prometida

`src/features/cadastro/components/steps/AutorizacoesStep.tsx` (checkbox `autorizacao_retencao_curriculo`):

> *"Concordo que a Beauty Smile mantenha meu currículo em banco de dados **por até 2 anos** para futuras oportunidades, mesmo que eu não seja selecionado(a) no processo atual."*

**A "decisão de negócio em aberto" tem teto.** Todo candidato cadastrado até hoje recebeu a promessa de **2 anos máximo**. Reter além disso excederia o consentimento colhido e exigiria novo consentimento. A decisão remanescente é o número **dentro** de [0, 2 anos] — e para os dados que **não** são o currículo, cuja base legal é outra (Art. 7º, V).

**Achado adjacente, não levantado por nenhum pesquisador:** a copy do `autorizacao_comunicacao` diz *"...sobre o andamento do processo seletivo **e novas oportunidades de vagas**"*. Isso **agrupa transacional com marketing**. A decisão do kickoff do M7 ("transacional sem opt-out") é defensável para "andamento", mas **não** para "novas oportunidades de vagas" — isso é comunicação de marketing e exige opt-out real. Resolver na fase de consentimentos: ou separar os dois consentimentos, ou reescrever a copy, ou implementar o opt-out.
