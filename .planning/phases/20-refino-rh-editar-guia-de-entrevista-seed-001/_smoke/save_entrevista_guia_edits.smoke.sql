-- =============================================================================
-- SQL SMOKE — save_entrevista_guia_edits (ENTREV-08 authz + upsert + dedup)
-- Phase: 20 (Refino RH — Editar Guia de Entrevista, SEED-001) / Plan 20-01 Task 2
-- =============================================================================
--
-- WHAT THIS IS
--   A DISPOSABLE smoke that proves the security + idempotency + dedup invariants of
--   the migration authored in 20-01 (supabase/migrations/20260629000001_entrevista_guia_edits.sql).
--   It is NOT a migration — it is wrapped in BEGIN; ... ROLLBACK; so it mutates nothing.
--   The BEGIN/ROLLBACK wrapper IS wanted HERE (the 42601/D-22 no-wrapper rule applies to
--   MIGRATIONS only; this disposable smoke wants the rollback fixture — precedent: the
--   Phase 7/8/11 SQL smokes run via Supabase MCP execute_sql + ROLLBACK).
--
-- HOW 20-02 RUNS IT (the [BLOCKING] apply wave)
--   After 20-02 applies the migration via Supabase MCP apply_migration, it runs THIS
--   script via Supabase MCP execute_sql against PROD, filling the placeholder UUIDs
--   below from real PROD seed data. Each case prints its case label + the observed
--   outcome (or RAISE NOTICE on the expected error caught by an EXCEPTION block); the
--   final ROLLBACK leaves PROD untouched.
--
-- IDENTITY SIMULATION (the ENTREV-08 deviation under test)
--   The RPC derives role from public.usuarios_rh, NOT from the JWT claim. So the smoke
--   sets BOTH:  (a) set_config('request.jwt.claims', ...)  → drives auth.uid()/auth.jwt();
--               (b) seeds/clears the usuarios_rh row for that user inside the fixture.
--   The app_metadata.role in the claim is set DELIBERATELY WRONG in case 7 to prove the
--   decision comes from the table, not the claim (Pitfall 1).
--
-- PLACEHOLDERS 20-02 FILLS FROM PROD SEED:
--   :rh_owner_user_id      — auth user_id of an RH who OWNS :vaga_id  (usuarios_rh recrutador)
--   :rh_other_user_id      — auth user_id of an RH who does NOT own :vaga_id
--   :admin_user_id         — auth user_id of an administrador (usuarios_rh administrador)
--   :candidato_user_id     — auth user_id of a candidato (NO usuarios_rh row)
--   :claim_liar_user_id    — auth user_id with NO usuarios_rh row (claim will LIE 'rh')
--   :vaga_id               — a vaga whose created_by = :rh_owner_user_id
--   :cand_id               — a candidatura whose vaga_id = :vaga_id
--   :cand_dup_id           — a candidatura used ONLY for the dedup seed (3 guide rows)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- CASE 1 — candidato (NO usuarios_rh row) → DENY insufficient_privilege (42501)
--   Expect: SQLSTATE 42501. Role read from usuarios_rh returns NULL → 42501.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', :'candidato_user_id', 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'candidato'))::text, true);
DO $$
BEGIN
  PERFORM public.save_entrevista_guia_edits(
    (:'cand_id')::uuid, 'online', '{"perguntas":[]}'::jsonb);
  RAISE EXCEPTION 'CASE 1 FAIL — candidato was NOT denied';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'CASE 1 PASS — candidato → 42501 insufficient_privilege';
END $$;

-- ---------------------------------------------------------------------------
-- CASE 2 — RH WITHOUT ownership → DENY insufficient_privilege (42501)
--   :rh_other_user_id has an ativo recrutador usuarios_rh row, but does NOT own :vaga_id.
--   Expect: SQLSTATE 42501 (own-vaga guard).
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', :'rh_other_user_id', 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'rh'))::text, true);
DO $$
BEGIN
  PERFORM public.save_entrevista_guia_edits(
    (:'cand_id')::uuid, 'online', '{"perguntas":[]}'::jsonb);
  RAISE EXCEPTION 'CASE 2 FAIL — RH-without-ownership was NOT denied';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'CASE 2 PASS — RH-without-ownership → 42501 insufficient_privilege';
END $$;

-- ---------------------------------------------------------------------------
-- CASE 3 — RH WITH ownership → OK (ok=true)
--   :rh_owner_user_id has an ativo recrutador usuarios_rh row AND owns :vaga_id.
--   Expect: jsonb { "ok": true, ... }.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', :'rh_owner_user_id', 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'rh'))::text, true);
SELECT 'CASE 3 — RH-with-ownership (expect ok=true)' AS case,
       public.save_entrevista_guia_edits(
         (:'cand_id')::uuid, 'online',
         '{"perguntas":[{"pergunta":"Conte uma situação difícil.","dimensao":"Comunicação","origem":"manual"}]}'::jsonb
       ) AS result;

-- ---------------------------------------------------------------------------
-- CASE 4 — administrador bypass → OK (ok=true)
--   :admin_user_id has an ativo administrador usuarios_rh row; owns NOTHING here →
--   the ownership guard is bypassed for administrador.
--   Expect: jsonb { "ok": true, ... }.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', :'admin_user_id', 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'administrador'))::text, true);
SELECT 'CASE 4 — administrador bypass (expect ok=true)' AS case,
       public.save_entrevista_guia_edits(
         (:'cand_id')::uuid, 'online',
         '{"perguntas":[{"pergunta":"Pergunta do admin.","dimensao":"Liderança","origem":"manual"}]}'::jsonb
       ) AS result;

-- ---------------------------------------------------------------------------
-- CASE 5 — UPSERT idempotency → exactly 1 row for (:cand_id, 'online')
--   Cases 3 + 4 both saved the SAME (candidatura_id, tipo). The ON CONFLICT upsert
--   must have collapsed them to ONE row (not two inserts).
--   Expect: count = 1.
-- ---------------------------------------------------------------------------
SELECT 'CASE 5 — upsert collapses to 1 row (expect count=1)' AS case,
       count(*) AS row_count
  FROM public.entrevista_guias
 WHERE candidatura_id = (:'cand_id')::uuid
   AND tipo = 'online';

-- ---------------------------------------------------------------------------
-- CASE 6 — DEDUP proof → 3 seeded rows collapse to 1 latest per (cand,tipo)
--   The migration's dedup DELETE already ran against PROD (it's in the applied file).
--   To prove the DELETE keeps the LATEST per (candidatura_id, tipo), seed 3 fresh
--   rows for :cand_dup_id with staggered created_at, re-run the same DISTINCT-ON
--   dedup predicate, and assert exactly 1 survives — and that it is the newest.
-- ---------------------------------------------------------------------------
INSERT INTO public.entrevista_guias (candidatura_id, tipo, guia, created_at, updated_at) VALUES
  ((:'cand_dup_id')::uuid, 'online', '{"seq":1}'::jsonb, now() - interval '2 hours', now() - interval '2 hours'),
  ((:'cand_dup_id')::uuid, 'online', '{"seq":2}'::jsonb, now() - interval '1 hour',  now() - interval '1 hour'),
  ((:'cand_dup_id')::uuid, 'online', '{"seq":3}'::jsonb, now(),                       now());

-- Re-apply the same keep-latest dedup the migration uses, scoped to :cand_dup_id.
DELETE FROM public.entrevista_guias g
 WHERE g.candidatura_id = (:'cand_dup_id')::uuid
   AND g.tipo = 'online'
   AND g.id NOT IN (
     SELECT DISTINCT ON (candidatura_id, tipo) id
       FROM public.entrevista_guias
      WHERE candidatura_id = (:'cand_dup_id')::uuid AND tipo = 'online'
      ORDER BY candidatura_id, tipo, created_at DESC, id DESC
   );

SELECT 'CASE 6 — dedup leaves exactly the latest row (expect count=1, guia.seq=3)' AS case,
       count(*)                  AS row_count,
       max((guia->>'seq')::int)  AS surviving_seq
  FROM public.entrevista_guias
 WHERE candidatura_id = (:'cand_dup_id')::uuid
   AND tipo = 'online';

-- ---------------------------------------------------------------------------
-- CASE 7 — CRITICAL anti-claim (Pitfall 1): claim SAYS 'rh' but NO usuarios_rh row
--   :claim_liar_user_id has app_metadata.role='rh' in the JWT claim but has NO row in
--   public.usuarios_rh → the RPC MUST DENY. This proves the role decision comes from
--   the authoritative TABLE, not the (forgeable/stale) claim — the ENTREV-08 deviation.
--   Expect: SQLSTATE 42501.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', :'claim_liar_user_id', 'role', 'authenticated',
    'app_metadata', json_build_object('role', 'rh'))::text, true);  -- the claim LIES
DO $$
BEGIN
  PERFORM public.save_entrevista_guia_edits(
    (:'cand_id')::uuid, 'online', '{"perguntas":[]}'::jsonb);
  RAISE EXCEPTION 'CASE 7 FAIL — claim-says-rh-but-no-usuarios_rh-row was NOT denied (role came from the CLAIM!)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'CASE 7 PASS — claim-says-rh-no-table-row → 42501 (role read from usuarios_rh, NOT the claim)';
END $$;

-- ---------------------------------------------------------------------------
-- Disposable fixture — undo EVERYTHING (cases 5/6 inserts, the upserted rows).
-- ---------------------------------------------------------------------------
ROLLBACK;
