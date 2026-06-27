---
phase: 12
slug: big-five-devolutiva
artifact: sql-smoke-runbook
project_ref: isljnozzlvckrgjjbjwp
consumed_by:
  - "Plan 12-06 [BLOCKING] PROD-apply checkpoint (run AFTER the 2 migrations + reader RPC land + EFs deploy)"
  - "/gsd:verify-work (live DB sign-off before phase close)"
created: 2026-06-09
---

# Phase 12 — Live SQL Smoke Runbook (Big Five + Devolutiva)

> Copy-pasteable SQL smoke steps to run against the **LIVE** project
> (`isljnozzlvckrgjjbjwp`) **after Plan 12-06 lands** the two new tables
> (`bigfive_itens`, `devolutivas_candidato`), the `get_bigfive_itens()` SECURITY
> DEFINER reader, and the seed of the 120 items. They are the post-apply
> acceptance gate for the answer-key projection (T-12-02), the candidate score
> deny (Pitfall 7), the devolutiva own-row read, and the RH allowlist.
>
> **How to run:** Apply the PL/pgSQL pieces (the `get_bigfive_itens` `$$` body)
> via **Supabase MCP `execute_sql` / `apply_migration`** — the transaction pooler
> trips SQLSTATE 42601 on a `$$` body adjacent to `COMMENT`/`GRANT` (CLAUDE.md
> §Migrations / D-22). The `bigfive_itens` table+seed is plain DDL+INSERT (no `$$`)
> → it pushes clean like `scores_candidato` did. Reconcile by writing version rows
> into `supabase_migrations` so `db push --linked` reports "up to date".
>
> **Role simulation:** switch the session role with
> `set_config('request.jwt.claims', '{"sub":"<uuid>","app_metadata":{"role":"<role>"}}', true)`
> to simulate `candidato` / `rh` / `administrador` for the RLS-relevant calls.
> `auth.uid()` is GUC-derived from `request.jwt.claims.sub` (Phase-6 D-06-DEFINER
> lesson — auth.uid() is GUC-based, not a separate auth context).
>
> **Disposable-fixture idiom (mirrors the Phase-8 runbook):** create a throwaway
> candidatura + a `scores_candidato` big_five row + a `devolutivas_candidato` row,
> exercise the read paths, then **ROLLBACK-free cleanup** by `DELETE`ing the
> fixture rows by their captured ids. Do NOT wrap the smokes in a single
> `BEGIN; … ROLLBACK;` — the transaction pooler trips 42601 on PL/pgSQL bodies.
>
> **Secrets note:** procedure only. Live JWTs / `request.jwt.claims` payloads are
> supplied at run-time by the operator — never paste a real JWT into this file.
>
> Each section states an **Expected result** and has a **pass/fail** box.

---

## SMOKE-1 — `get_bigfive_itens()` projects ONLY item_id / texto / ordem (T-12-02 answer-key protection)

The candidate reader RPC must NEVER surface the scoring key (`dimensao`, `faceta`,
`reverse_keyed`). If any of those columns appears in the result, the answer-key has
leaked and a candidate could reverse-engineer the reverse-key set.

```sql
-- (a) The RPC's declared RETURNS columns must be exactly item_id, texto, ordem.
SELECT p.proname,
       pg_get_function_result(p.oid) AS returns_signature
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname = 'public' AND p.proname = 'get_bigfive_itens';

-- (b) Call it as a candidate and confirm the projected columns.
SELECT set_config('request.jwt.claims',
  '{"sub":"<CANDIDATO_UUID>","app_metadata":{"role":"candidato"}}', true);
SELECT * FROM public.get_bigfive_itens() LIMIT 1;
```

**Expected result:**
- (a) `returns_signature` = `TABLE(item_id integer, texto text, ordem integer)` —
  NO `dimensao` / `faceta` / `reverse_keyed` column present.
- (b) the row has exactly 3 keys (`item_id`, `texto`, `ordem`); a candidate call
  succeeds (SECURITY DEFINER). The base table `bigfive_itens` has NO candidate
  SELECT policy → a direct `SELECT * FROM public.bigfive_itens` as candidato is
  denied (0 rows / RLS).

**[ ] PASS  [ ] FAIL**

---

## SMOKE-2 — candidate is DENIED on `scores_candidato` (Pitfall 7 — never sees the score)

Big Five is contextual; the candidate must never read the raw OCEAN score. The
table has NO candidate read policy (deny-all for candidato), exactly like the
Phase-11 SJT rows.

```sql
-- Fixture: a big_five score row for a throwaway candidatura (service_role / RH setup).
INSERT INTO public.scores_candidato (candidatura_id, tipo, status, metadata)
VALUES ('<CANDIDATURA_UUID>', 'big_five', 'sucesso',
        '{"dimensoes":[],"facetas":[],"norm_group":{"sexo":"N","faixa":"21-40"}}'::jsonb)
RETURNING id;  -- capture <SCORE_ID>

-- Candidate session: must return ZERO rows (no read policy → denied).
SELECT set_config('request.jwt.claims',
  '{"sub":"<CANDIDATO_UUID>","app_metadata":{"role":"candidato"}}', true);
SELECT count(*) AS visible_to_candidate
FROM   public.scores_candidato
WHERE  candidatura_id = '<CANDIDATURA_UUID>';

-- Cleanup (ROLLBACK-free):
DELETE FROM public.scores_candidato WHERE id = '<SCORE_ID>';
```

**Expected result:** `visible_to_candidate = 0`. The candidate sees no big_five
score row whatsoever (RNF-07a / Pitfall 7).

**[ ] PASS  [ ] FAIL**

---

## SMOKE-3 — candidate reads ONLY their OWN `devolutivas_candidato` row (own-row RLS)

The devolutiva is FOR the candidate → own-row read is correct here (unlike
`scores_candidato`). A different candidate's uuid must return 0 rows.

```sql
-- Fixture: a devolutiva row owned by CANDIDATO_A (service_role / RH setup).
INSERT INTO public.devolutivas_candidato (candidatura_id, conteudo_jsonb)
VALUES ('<CANDIDATURA_A_UUID>',
        '{"cabecalho":{"nome":"Fixture"},"paginas":[]}'::jsonb)
RETURNING id;  -- capture <DEV_ID>

-- (a) CANDIDATO_A reads their own row → 1 row.
SELECT set_config('request.jwt.claims',
  '{"sub":"<CANDIDATO_A_UUID>","app_metadata":{"role":"candidato"}}', true);
SELECT count(*) AS own_rows
FROM   public.devolutivas_candidato
WHERE  candidatura_id = '<CANDIDATURA_A_UUID>';

-- (b) CANDIDATO_B (a DIFFERENT candidate) reads the same row → 0 rows.
SELECT set_config('request.jwt.claims',
  '{"sub":"<CANDIDATO_B_UUID>","app_metadata":{"role":"candidato"}}', true);
SELECT count(*) AS cross_rows
FROM   public.devolutivas_candidato
WHERE  candidatura_id = '<CANDIDATURA_A_UUID>';

-- Cleanup (ROLLBACK-free):
DELETE FROM public.devolutivas_candidato WHERE id = '<DEV_ID>';
```

**Expected result:** (a) `own_rows = 1`; (b) `cross_rows = 0` — the own-row policy
keys on `auth.uid()` owning the candidatura. No candidate reads another's devolutiva.

**[ ] PASS  [ ] FAIL**

---

## SMOKE-4 — RH / 'administrador' reads BOTH tables via the allowlist (never select *)

RH/admin must read the score (contextual scorecard) AND the devolutiva. The
`scores_candidato` policy is keyed to `role IN ('rh','administrador')` (uses
`'administrador'`, NEVER the stale `'admin'`). Reads in the app use an explicit
column allowlist — `select('*')` is forbidden ([[reference_select_star_leaks_pii]]),
but at the SQL layer the smoke just confirms the rows are VISIBLE to RH.

```sql
-- Re-insert the two fixture rows (or reuse SMOKE-2/3 ids before cleanup).
SELECT set_config('request.jwt.claims',
  '{"sub":"<RH_UUID>","app_metadata":{"role":"administrador"}}', true);

SELECT count(*) AS scores_visible
FROM   public.scores_candidato
WHERE  candidatura_id = '<CANDIDATURA_UUID>' AND tipo = 'big_five';

SELECT count(*) AS devolutivas_visible
FROM   public.devolutivas_candidato
WHERE  candidatura_id = '<CANDIDATURA_UUID>';

-- Negative control: a 'candidato' role sees the score as 0 (re-confirms SMOKE-2).
SELECT set_config('request.jwt.claims',
  '{"sub":"<CANDIDATO_UUID>","app_metadata":{"role":"candidato"}}', true);
SELECT count(*) AS score_for_candidate
FROM   public.scores_candidato
WHERE  candidatura_id = '<CANDIDATURA_UUID>' AND tipo = 'big_five';
```

**Expected result:** as `administrador`, `scores_visible >= 1` AND
`devolutivas_visible >= 1`; as `candidato`, `score_for_candidate = 0`.

**[ ] PASS  [ ] FAIL**

---

## SMOKE-5 — seed integrity: `bigfive_itens` has 120 items, 55 reverse-keyed (Pitfall 1)

The seed must hold exactly the 120-item IPIP-NEO-120 bank with exactly the 55
reverse-keyed items, and the per-domain reverse counts N7 E6 O12 A17 C13. A wrong
count here means the answer-key transcription drifted — the #1 scoring-bug source.

```sql
-- (a) total items + total reverse-keyed.
SELECT count(*)                                   AS total_itens,        -- expect 120
       count(*) FILTER (WHERE reverse_keyed)      AS reverse_count       -- expect 55
FROM   public.bigfive_itens;

-- (b) per-domain reverse counts.
SELECT dimensao,
       count(*) FILTER (WHERE reverse_keyed) AS reverse_per_domain
FROM   public.bigfive_itens
GROUP  BY dimensao
ORDER  BY dimensao;

-- (c) item_id covers 1..120 with no gaps, faceta in 1..30.
SELECT min(item_id) AS min_id, max(item_id) AS max_id, count(DISTINCT item_id) AS distinct_ids,
       min(faceta)  AS min_facet, max(faceta) AS max_facet
FROM   public.bigfive_itens;
```

**Expected result:**
- (a) `total_itens = 120`, `reverse_count = 55`.
- (b) `A=17, C=13, E=6, N=7, O=12` (sum 55) — matches PESQUISA L289-294.
- (c) `min_id=1, max_id=120, distinct_ids=120`; `min_facet=1, max_facet=30`.

**[ ] PASS  [ ] FAIL**

---

## Cleanup checklist (ROLLBACK-free)

- [ ] SMOKE-2 `scores_candidato` fixture row deleted by `<SCORE_ID>`.
- [ ] SMOKE-3 `devolutivas_candidato` fixture row deleted by `<DEV_ID>`.
- [ ] No throwaway candidatura/candidato fixtures left behind.
- [ ] `db push --linked` reports "Remote database is up to date" after MCP apply +
      version-row reconciliation.
