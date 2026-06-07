---
phase: 7
slug: configura-o-de-vaga-tags
artifact: sql-smoke-runbook
project_ref: isljnozzlvckrgjjbjwp
consumed_by:
  - "Plan 02 schema-apply checkpoint (run AFTER the migration set is applied)"
  - "/gsd:verify-work (live DB sign-off before phase close)"
created: 2026-06-07
---

# Phase 7 — Live SQL Smoke Runbook

> Copy-pasteable SQL smoke steps to run against the **LIVE** project
> (`isljnozzlvckrgjjbjwp`) **after Plan 02 applies the schema** (enum
> `enum_tag_opcao` + 2 `vagas` jsonb columns + `pergunta_opcao_metadata` table +
> the `upsert_pergunta_opcoes_metadata` and `publish_vaga` RPCs).
>
> **How to run:** Supabase SQL Editor (RH/admin session) for the privileged
> steps; a candidato/anon JWT (or `SET ROLE anon`) for the RLS-deny step. The
> D-22 PL/pgSQL apply (Pitfall 2 — SQLSTATE 42601) is covered in §5.
>
> **Secrets note (T-07-01-RB):** this runbook contains procedure only. Live JWTs
> are supplied at run-time by the operator — never paste a real JWT into this
> file or any commit.
>
> Each section states an **Expected result** and has a **pass/fail** box.

---

## Pre-flight — pick a choice pergunta

```sql
-- Find a single_choice / multiple_choice pergunta to exercise the RPC against.
SELECT id, vaga_id, tipo_resposta, texto_pergunta, opcoes_resposta
FROM   public.perguntas_formulario
WHERE  tipo_resposta IN ('single_choice', 'multiple_choice')
  AND  deleted_at IS NULL
LIMIT  5;
-- Note one `id` as <PERGUNTA_ID> for the steps below.
```

---

## 1. RPC idempotency (DELETE + re-INSERT semantics)

Call `upsert_pergunta_opcoes_metadata` **twice** with the **same payload** and
assert the second call yields the **same row count** and the **same `opcao_id`s**
— no duplicates.

```sql
-- First call (opcao_id null = generate fresh ids):
SELECT public.upsert_pergunta_opcoes_metadata(
  '<PERGUNTA_ID>'::uuid,
  '[{"opcao_id":null,"texto":"Imediata","tag":"knockout","peso":0,"nota_ia":null,"ordem":0},
    {"opcao_id":null,"texto":"Em até 15 dias","tag":"neutro","peso":0,"nota_ia":null,"ordem":1}]'::jsonb
);

-- Capture the generated ids:
SELECT opcao_id, opcao_texto, tag FROM public.pergunta_opcao_metadata
WHERE pergunta_id = '<PERGUNTA_ID>' ORDER BY ordem;
-- → note the two opcao_id values as <OID1>, <OID2>.

-- Second call WITH the same ids (idempotent re-write):
SELECT public.upsert_pergunta_opcoes_metadata(
  '<PERGUNTA_ID>'::uuid,
  '[{"opcao_id":"<OID1>","texto":"Imediata","tag":"knockout","peso":0,"nota_ia":null,"ordem":0},
    {"opcao_id":"<OID2>","texto":"Em até 15 dias","tag":"neutro","peso":0,"nota_ia":null,"ordem":1}]'::jsonb
);

-- Assert: still exactly 2 rows, same ids (DELETE+re-INSERT, no dupes):
SELECT count(*) AS row_count FROM public.pergunta_opcao_metadata
WHERE pergunta_id = '<PERGUNTA_ID>';
SELECT array_agg(opcao_id ORDER BY ordem) AS ids FROM public.pergunta_opcao_metadata
WHERE pergunta_id = '<PERGUNTA_ID>';
```

**Expected result:** `row_count = 2` after BOTH calls; `ids` array equals
`{<OID1>,<OID2>}` (unchanged). No duplicate rows, no orphans.

- [ ] PASS  - [ ] FAIL

---

## 2. opcao_id generation + jsonb backfill

Call with `opcao_id:null` options and assert (a) every `pergunta_opcao_metadata`
row got a **non-null uuid** `opcao_id`, AND (b) the source
`perguntas_formulario.opcoes_resposta` jsonb was **rewritten to `[{id,texto}]`**.

```sql
-- Fresh pergunta with NULL ids (simulates first write / legacy backfill):
SELECT public.upsert_pergunta_opcoes_metadata(
  '<PERGUNTA_ID>'::uuid,
  '[{"opcao_id":null,"texto":"Sim","tag":"pontua","peso":10,"nota_ia":null,"ordem":0},
    {"opcao_id":null,"texto":"Não","tag":"neutro","peso":0,"nota_ia":null,"ordem":1}]'::jsonb
);

-- (a) every metadata row has a non-null opcao_id:
SELECT count(*) FILTER (WHERE opcao_id IS NULL) AS null_ids
FROM public.pergunta_opcao_metadata WHERE pergunta_id = '<PERGUNTA_ID>';

-- (b) source jsonb rewritten to object shape [{id, texto}]:
SELECT opcoes_resposta,
       jsonb_typeof(opcoes_resposta->0)                AS first_elem_type,  -- expect 'object'
       (opcoes_resposta->0 ? 'id')                     AS has_id,           -- expect true
       (opcoes_resposta->0 ? 'texto')                  AS has_texto         -- expect true
FROM public.perguntas_formulario WHERE id = '<PERGUNTA_ID>';
```

**Expected result:** `null_ids = 0`; `first_elem_type = 'object'`;
`has_id = true`; `has_texto = true`. Each metadata `opcao_id` matches the `id`
inside the rewritten jsonb (jsonb↔table in sync).

- [ ] PASS  - [ ] FAIL

---

## 3. RLS deny for candidato / anon

Assert a candidato/anon JWT **cannot write** `pergunta_opcao_metadata` — both via
the RPC (in-body `42501`) and via a direct table write (policy denies).

```sql
-- Run this block under a CANDIDATO or ANON session (NOT rh/administrador).
-- 3a. RPC raises 42501 (in-body role check rejects non-rh/admin):
SELECT public.upsert_pergunta_opcoes_metadata(
  '<PERGUNTA_ID>'::uuid,
  '[{"opcao_id":null,"texto":"X","tag":"neutro","peso":0,"nota_ia":null,"ordem":0}]'::jsonb
);
-- → MUST raise: ERROR: forbidden  (SQLSTATE 42501)

-- 3b. Direct INSERT denied by the rh_gerencia_opcao_metadata policy (no row written):
INSERT INTO public.pergunta_opcao_metadata
  (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
VALUES ('<PERGUNTA_ID>'::uuid, gen_random_uuid(), 'X', 'neutro', 0, 0);
-- → MUST fail with new row violates row-level security policy (or 0 rows affected).
```

**Expected result:** 3a raises `42501 forbidden`; 3b is rejected by RLS. A
candidato/anon can neither call the privileged RPC nor write the table directly.
(RH/admin session: the same calls SUCCEED — re-run §1/§2 as RH to confirm the
allow path.)

- [ ] PASS  - [ ] FAIL

---

## 4. publish_vaga guard (D-12 server-side gate)

Assert flipping `status='ativa'` via `publish_vaga` is **rejected** when any D-12
condition fails, and **succeeds** only when all three pass.

```sql
-- Pick a draft vaga as <VAGA_ID>:
SELECT id, titulo, status, pesos_avaliacao, testes_aplicaveis
FROM public.vagas WHERE status = 'rascunho' LIMIT 5;

-- 4a. SAD path — pesos do NOT sum to 100 (condition 1):
UPDATE public.vagas
SET pesos_avaliacao = '{"triagem":30,"work_sample_sjt":30,"redacao_cultural":15,"entrevista":20}'::jsonb
WHERE id = '<VAGA_ID>';
SELECT public.publish_vaga('<VAGA_ID>'::uuid);
-- → MUST be rejected (raises / returns failure list); status stays 'rascunho'.
SELECT status FROM public.vagas WHERE id = '<VAGA_ID>';  -- expect 'rascunho'

-- 4b. HAPPY path — sum=100 + ≥1 obrigatorio test + no dangling knockout:
UPDATE public.vagas SET
  pesos_avaliacao   = '{"triagem":30,"work_sample_sjt":30,"redacao_cultural":15,"entrevista":25}'::jsonb,
  testes_aplicaveis = '[{"teste":"triagem","obrigatorio":true,"customizado":false}]'::jsonb
WHERE id = '<VAGA_ID>';
SELECT public.publish_vaga('<VAGA_ID>'::uuid);
SELECT status FROM public.vagas WHERE id = '<VAGA_ID>';  -- expect 'ativa'
```

**Expected result:** 4a leaves `status='rascunho'` (publish blocked, D-12
condition 1 reported); 4b transitions `status='ativa'` (all three conditions
pass). Rascunho writes themselves never validate — only the publish path does.

- [ ] PASS  - [ ] FAIL

---

## 5. `db push` up-to-date (D-22 reconciliation)

After applying the PL/pgSQL migration set via the **SQL Editor / Supabase MCP
`execute_sql`** path (Pitfall 2 — `$$` body + adjacent `COMMENT`/`GRANT` trips
SQLSTATE 42601 in the pooler), reconcile local state and confirm the CLI reports
the remote is up to date.

```bash
# 1. (already done) Applied the migration SQL manually via SQL Editor / MCP.
# 2. Mark each applied version as reconciled:
supabase migration repair --status applied <VERSION_1> <VERSION_2> ...
# 3. Confirm there is nothing left to push:
supabase db push --linked
# → MUST print: "Remote database is up to date."
```

**Expected result:** `supabase db push --linked` reports **"Remote database is
up to date."** No `BEGIN/COMMIT` wrapper in the migration files (the CLI driver
wraps each migration in its own transaction — the outer wrapper is the 42601
trigger).

- [ ] PASS  - [ ] FAIL

---

## Sign-off

- [ ] §1 RPC idempotency PASS
- [ ] §2 opcao_id generation + jsonb backfill PASS
- [ ] §3 RLS deny for candidato/anon PASS
- [ ] §4 publish_vaga D-12 guard PASS
- [ ] §5 `db push` up-to-date PASS

**Operator:** ______________________  **Date:** ____________
