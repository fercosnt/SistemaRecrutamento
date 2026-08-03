# Varredura do idioma `ADD COLUMN IF NOT EXISTS`

| Campo | Valor |
|-------|-------|
| **Requirement coberto** | **INVENT-04** |
| **Data de coleta** | **2026-07-29** |
| **Fonte (repo)** | `grep -rn "ADD COLUMN IF NOT EXISTS" supabase/migrations/*.sql` |
| **Fonte (vivo)** | `information_schema.columns` + `pg_constraint`, projeto `isljnozzlvckrgjjbjwp` |
| **Natureza** | Read-only |

---

## Por que esta varredura existe

`ALTER TABLE … ADD COLUMN IF NOT EXISTS x … REFERENCES …` é **silenciosamente parcial**: se a
coluna `x` já existe, o Postgres pula o statement inteiro — **incluindo a cláusula `REFERENCES`**.
A migration reporta sucesso, o repositório passa a afirmar que existe uma FK, e o banco não tem FK
nenhuma. O mesmo vale para `NOT NULL` e `DEFAULT` acrescentados pelo mesmo idioma.

O ROADMAP do M8 nomeia esse idioma como a **"causa identificada do drift `candidatos.user_id`"**.
Esta varredura foi feita para confirmar isso. **Ela refuta a afirmação nos dois níveis.**

---

## Resultado da varredura

| Métrica | Valor |
|---------|------:|
| Ocorrências de `ADD COLUMN IF NOT EXISTS` | **16** |
| Arquivos de migration distintos | **8** |
| **Classe A** — com cláusula `REFERENCES` (FK silenciável) | **1** |
| **Classe B** — com `NOT NULL` / `DEFAULT` (constraint silenciável) | **6** |
| Classe C — só tipo, nada silenciável | 9 |

Só as classes **A** e **B** podem esconder divergência. São **7 verificações, não dezesseis**.

---

## Verificação viva das 7 ocorrências A+B

Cada linha foi conferida contra o **catálogo vivo de PROD**, não contra o arquivo que a declara.

| # | Classe | Migration | Alvo | O que deveria ter landed | Estado vivo em PROD | Veredito |
|---|--------|-----------|------|--------------------------|---------------------|----------|
| 1 | **A** | `20260421000001:193` | `autorizacoes.user_id` | FK → `auth.users(id)` `ON DELETE SET NULL` | `autorizacoes_user_id_fkey` **existe**, `ON DELETE SET NULL` | ✅ **landed** |
| 2 | B | `20260421000001:190` | `autorizacoes.policy_version` | `NOT NULL DEFAULT 'v1.0-2026-04'` | `NO` / `'v1.0-2026-04'::text` | ✅ landed |
| 3 | B | `20260607010002:36` | `vagas.testes_aplicaveis` | `NOT NULL DEFAULT '[]'::jsonb` | `NO` / `'[]'::jsonb` | ✅ landed |
| 4 | B | `20260607010002:37` | `vagas.pesos_avaliacao` | `NOT NULL DEFAULT {…}::jsonb` | `NO` / `'{"triagem": 0, …}'::jsonb` | ✅ landed |
| 5 | B | `20260608000001:64` | `vagas.qualificacao_etapa1` | `NOT NULL DEFAULT '[]'::jsonb` | `NO` / `'[]'::jsonb` | ✅ landed |
| 6 | B | `20260624000001:52` | `vagas.aplica_cognitivo` | `NOT NULL DEFAULT false` | `NO` / `false` | ✅ landed |
| 7 | B | `20260706110008:49` | `bigfive_itens.ativo` | `NOT NULL DEFAULT true` | `NO` / `true` | ✅ landed |

**7 de 7 landed corretamente. O idioma não silenciou nada neste repositório.**

---

## ⚠ A premissa do INVENT-04 está errada — nos dois níveis

### Nível 1 — a citação da semente aponta para a tabela errada

`.planning/research/FK-AUDIT-LIVE.md` atribui o drift de **`candidatos.user_id`** à linha 193 de
`20260421000001_rate_limit_duplicate_check.sql`. Essa linha é, literalmente:

```sql
ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
```

…e o `ALTER TABLE` que a governa é **`public.autorizacoes`**, não `public.candidatos`. A citação
trocou a tabela.

### Nível 2 — não há drift em `candidatos.user_id`

Evidência viva (consulta (c) de `sql/01-pii-catalog.sql`):

```
candidatos_user_id_fkey │ FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
```

E no repositório, `docs/sql/sql/02-tabela-candidatos.sql:14`:

```sql
user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
```

**Idênticos.** Não há divergência nessa FK. E ela nunca passou pelo idioma
`ADD COLUMN IF NOT EXISTS` — nasceu no `CREATE TABLE`.

### Consequência

O `.planning/todos/pending/processo-origem-do-drift-desconhecida.md` (herdado do M7) registra que
*"a causa do drift PROD→repo nunca foi identificada"*. O ROADMAP do M8 declarou a causa como
identificada. **A varredura mostra que o todo estava certo e o ROADMAP, otimista.** A causa segue
desconhecida.

---

## O achado que substitui a premissa refutada

O risco real de fidelidade de schema neste projeto **não** é o idioma condicional. É este:

> **O DDL base de ~40 tabelas legadas vive FORA do ledger de migrations**, em
> `docs/sql/sql/*.sql` — **49 scripts** que nunca foram registrados como migration e que o
> `supabase migration list` não conhece.

Consequências concretas:

1. Qualquer inventário, allowlist de export ou plano de exclusão que leia apenas
   `supabase/migrations/` enxerga **um fragmento** do schema e se declara completo.
2. `supabase db diff` compara contra um baseline que nunca incluiu esses 49 scripts.
3. É um caminho de escrita de schema que existe fora do processo — que é exatamente a forma de
   drift que o todo herdado descreve, e ela **não** foi fechada por esta fase.

**Mitigação já aplicada nesta fase:** o inventário PII (`pii-inventory.yaml`) foi construído do
**catálogo vivo**, nunca de arquivos de migration — precisamente para não herdar esse ponto cego.

**Recomendação para a Phase 47 (CONSOL-04):** o checklist de "zumbi de compliance" deve incluir a
pergunta *"este artefato foi derivado do catálogo vivo ou de arquivos de migration?"*.

---

## Como reproduzir

```bash
# Repo — as 16 ocorrências e suas classes
grep -rn "ADD COLUMN IF NOT EXISTS" supabase/migrations/*.sql
grep -rn "ADD COLUMN IF NOT EXISTS.*REFERENCES" supabase/migrations/*.sql   # classe A
grep -rn "ADD COLUMN IF NOT EXISTS.*NOT NULL"   supabase/migrations/*.sql   # classe B
```

Vivo: consultas (a), (b) e (c) de [`sql/01-pii-catalog.sql`](./sql/01-pii-catalog.sql).

---

## Limites deste artefato

- Cobre **apenas** `supabase/migrations/*.sql`. Os 49 scripts de `docs/sql/sql/` **não** foram
  varridos pelo mesmo idioma — eles são `CREATE TABLE`, não `ALTER`, então o idioma não se aplica;
  mas isso não foi verificado exaustivamente.
- Confirma que as 7 ocorrências A+B **landed**. Não prova que nenhuma outra divergência
  repo↔PROD exista por outras causas — só que **esta** causa não é a responsável.
