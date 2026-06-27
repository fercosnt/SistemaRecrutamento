# Phase 10 — SQL Smoke Runbook (Triagem RH com IA + Comparativo)

**Authored:** 2026-06-09 (Plan 10-01, Wave 0)
**Executed:** later — via **Supabase MCP `execute_sql`** with `set_config('request.jwt.claims', …, true)` to simulate RH/candidato roles (Phase 7/8 precedent). Each smoke is a fixture-driven, ROLLBACK-free check; clean up explicit fixtures at the end of each block.

> These smokes verify the Wave-1+ migrations (`analise_candidato_vaga`, `comparativo_solicitado`, the post-knockout trigger) BEFORE the EFs and the panel rely on them. They cover the trigger survivor/knockout gate, the 3-role RLS matrix on `analise_candidato_vaga`, the `UNIQUE(candidatura_id)` upsert idempotency, and the `comparativo_solicitado` audit-row contract.

**Convention for role simulation** (used by SMOKE-2/3):

```sql
-- candidato
select set_config('request.jwt.claims',
  json_build_object('role','authenticated','sub','<candidato_auth_uid>',
    'app_metadata', json_build_object('role','candidato'))::text, true);
-- rh
select set_config('request.jwt.claims',
  json_build_object('role','authenticated','sub','<rh_auth_uid>',
    'app_metadata', json_build_object('role','rh'))::text, true);
-- administrador
select set_config('request.jwt.claims',
  json_build_object('role','authenticated','sub','<admin_auth_uid>',
    'app_metadata', json_build_object('role','administrador'))::text, true);
-- reset to service_role (bypasses RLS)
select set_config('request.jwt.claims', NULL, true);
```

To exercise RLS the SELECT must run **as `authenticated`** (not `service_role`):
`set role authenticated;` … `reset role;`.

---

## SMOKE-1 — Trigger fires `net.http_post` ONLY for survivors (post-knockout)

**Contract (TRIAGEM-01):** the AFTER INSERT trigger `trg_candidaturas_analise` dispatches `net.http_post(.../analise-candidato-individual)` for survivors (`status <> 'rejeitado'` AND `opcao_knockout_id IS NULL`), and does **nothing** for knockouts.

**Approach:** `net.http_post` enqueues into `net.http_request_queue` (pg_net). Count queue rows before/after each INSERT. (If Vault `project_url`/`edge_invoke_key` are absent in the test project, the trigger short-circuits with `RETURN NEW` — in that case assert "no error + no dispatch" and note the Vault-absent skip; the survivor-vs-knockout BRANCH is still observable via a `RAISE NOTICE`/audit probe if added.)

```sql
-- Baseline queue depth
select count(*) as q_before from net.http_request_queue;

-- (a) KNOCKOUT insert → expect NO new dispatch
insert into public.candidaturas (id, vaga_id, candidato_id, status, opcao_knockout_id, etapa_atual)
values ('00000000-0000-0000-0000-00000000ko01', '<vaga_id>', '<cand_id>', 'rejeitado', '<opcao_id>', 'inscricao');
select count(*) as q_after_knockout from net.http_request_queue;
-- EXPECT: q_after_knockout == q_before  (knockout does NOT dispatch)

-- (b) SURVIVOR insert → expect ONE new dispatch (Vault present)
insert into public.candidaturas (id, vaga_id, candidato_id, status, opcao_knockout_id, etapa_atual)
values ('00000000-0000-0000-0000-00000000sv01', '<vaga_id>', '<cand_id>', 'aguardando_resposta', NULL, 'triagem');
select count(*) as q_after_survivor from net.http_request_queue;
-- EXPECT: q_after_survivor == q_after_knockout + 1   (survivor dispatches)
-- EXPECT (Vault absent): q_after_survivor == q_after_knockout  → note graceful skip

-- cleanup
delete from public.candidaturas where id in
  ('00000000-0000-0000-0000-00000000ko01','00000000-0000-0000-0000-00000000sv01');
```

**Expected result:** knockout → no dispatch; survivor → exactly one dispatch (or graceful Vault-absent skip, documented).

---

## SMOKE-2 — Candidato CANNOT read `analise_candidato_vaga` (RLS DENY)

**Contract (TRIAGEM-01 / V8 PII):** there is NO candidato SELECT policy on `analise_candidato_vaga` → a candidato JWT sees **0 rows** (score/flags/gaps never leak — [[reference_select_star_leaks_pii]]).

```sql
-- Seed one analise row as service_role (RLS bypass)
select set_config('request.jwt.claims', NULL, true);
insert into public.analise_candidato_vaga (candidatura_id, vaga_id, score_match, pontos_fortes, gaps, flags, status)
values ('<candidatura_id>', '<vaga_id>', 88, array['forte'], array['gap'], array['flag'], 'sucesso')
on conflict (candidatura_id) do update set score_match = excluded.score_match;

-- Simulate candidato + run as authenticated
select set_config('request.jwt.claims',
  json_build_object('role','authenticated','sub','<candidato_auth_uid>',
    'app_metadata', json_build_object('role','candidato'))::text, true);
set role authenticated;
select count(*) as candidato_visible from public.analise_candidato_vaga
  where candidatura_id = '<candidatura_id>';
reset role;
-- EXPECT: candidato_visible == 0   (RLS DENY — no candidato policy)
```

**Expected result:** `candidato_visible == 0`.

---

## SMOKE-3 — RH (own vaga) and Administrador CAN read; cross-vaga RH denied

**Contract (TRIAGEM-01 / V4):** `app_metadata.role IN ('rh','administrador')` may SELECT; the RH read is scoped to vagas the RH owns (admin = full).

```sql
-- role = rh (owner of <vaga_id>)
select set_config('request.jwt.claims',
  json_build_object('role','authenticated','sub','<rh_owner_auth_uid>',
    'app_metadata', json_build_object('role','rh'))::text, true);
set role authenticated;
select count(*) as rh_visible from public.analise_candidato_vaga
  where candidatura_id = '<candidatura_id>';
reset role;
-- EXPECT: rh_visible == 1

-- role = administrador (full)
select set_config('request.jwt.claims',
  json_build_object('role','authenticated','sub','<admin_auth_uid>',
    'app_metadata', json_build_object('role','administrador'))::text, true);
set role authenticated;
select count(*) as admin_visible from public.analise_candidato_vaga
  where candidatura_id = '<candidatura_id>';
reset role;
-- EXPECT: admin_visible == 1

-- (optional) role = rh of a DIFFERENT vaga → expect 0 if ownership scoping is enforced
-- EXPECT: rh_other_visible == 0
```

**Expected result:** `rh_visible == 1`, `admin_visible == 1` (cross-vaga RH `== 0` if ownership-scoped).

---

## SMOKE-4 — `UNIQUE(candidatura_id)` upsert keeps exactly ONE row

**Contract (TRIAGEM-01 idempotency):** `INSERT … ON CONFLICT (candidatura_id) DO UPDATE` keeps a single row per candidatura; the latest analysis wins (a reprocess overwrites, never duplicates).

```sql
select set_config('request.jwt.claims', NULL, true);  -- service_role
-- First write (falhou)
insert into public.analise_candidato_vaga (candidatura_id, vaga_id, score_match, status, erro)
values ('<candidatura_id>', '<vaga_id>', NULL, 'falhou', 'timeout')
on conflict (candidatura_id) do update
  set score_match = excluded.score_match, status = excluded.status, erro = excluded.erro;

-- Reprocess (sucesso) — same candidatura_id
insert into public.analise_candidato_vaga (candidatura_id, vaga_id, score_match, pontos_fortes, gaps, status, erro)
values ('<candidatura_id>', '<vaga_id>', 73, array['forte'], array['gap'], 'sucesso', NULL)
on conflict (candidatura_id) do update
  set score_match = excluded.score_match, pontos_fortes = excluded.pontos_fortes,
      gaps = excluded.gaps, status = excluded.status, erro = excluded.erro;

select count(*) as rows_for_candidatura, max(score_match) as final_score, max(status) as final_status
from public.analise_candidato_vaga where candidatura_id = '<candidatura_id>';
-- EXPECT: rows_for_candidatura == 1 ; final_score == 73 ; final_status == 'sucesso'
```

**Expected result:** exactly **1** row; latest (sucesso, score 73) wins.

---

## SMOKE-5 — `comparativo_solicitado` audit row written with full payload

**Contract (TRIAGEM-03 / RF-09):** each comparativo invocation writes one audit row carrying `candidatura_ids`, `ranking` (JSON), and `latencia_ms`.

```sql
select set_config('request.jwt.claims', NULL, true);  -- service_role (EF writes)
insert into public.comparativo_solicitado (vaga_id, candidatura_ids, ranking, latencia_ms, solicitado_por)
values (
  '<vaga_id>',
  array['<cand_id_1>','<cand_id_2>']::uuid[],
  '{"ranked_candidates":[{"candidate_id":"C1","rank":1,"composite_score":82}]}'::jsonb,
  1840,
  '<rh_auth_uid>'
)
returning id, latencia_ms, jsonb_array_length(ranking->'ranked_candidates') as ranked_n;

select count(*) as audit_rows,
       array_length(candidatura_ids, 1) as ids_n,
       (ranking ? 'ranked_candidates') as has_ranking,
       latencia_ms
from public.comparativo_solicitado
where vaga_id = '<vaga_id>' order by created_at desc limit 1;
-- EXPECT: audit_rows >= 1 ; ids_n == 2 ; has_ranking == true ; latencia_ms == 1840
```

**Expected result:** one audit row with 2 candidatura_ids, a non-null `ranking` JSON, and the recorded `latencia_ms`.

---

## Execution checklist (Wave 1+ apply)

- [ ] SMOKE-1 — trigger survivor/knockout gate (or Vault-absent graceful skip noted)
- [ ] SMOKE-2 — candidato RLS DENY (0 rows)
- [ ] SMOKE-3 — RH own-vaga + admin SELECT (1 row each)
- [ ] SMOKE-4 — UNIQUE(candidatura_id) upsert → exactly 1 row, latest wins
- [ ] SMOKE-5 — comparativo_solicitado audit row (ids + ranking + latencia_ms)

> Column names above (`erro`, `pontos_fortes`, `gaps`, `flags`, `solicitado_por`, …) are the contract these smokes assert. If the Wave-1 migration names a column differently, reconcile the migration to these names OR update this runbook in the same commit — they must not drift.
