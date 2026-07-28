-- =============================================================================
-- Phase 24 / Plan 24-02 / SEC-07 — blindar a rubric (BARS) das perguntas SJT
-- =============================================================================
-- Trust boundary: candidate JWT → PostgREST. `perguntas.rubric` carries the BARS
-- open-case dimension weights (an answer key). RLS is ROW-level only and never hides
-- a column ([[reference_select_star_leaks_pii]]) — a candidato who issues
--   GET /rest/v1/perguntas?select=rubric
-- must obtain ZERO rubric values. Unlike SEC-01, the candidate row policy
-- `cand_le_perguntas_ativas` STAYS (the candidato still needs the other perguntas
-- columns — cargo/cenario/formato/…), so the ONLY mechanism here is the column
-- REVOKE + the client allowlist drop (avaliacaoService — same plan). Only the
-- `avaliar-redacao` EF (service_role, bypasses grants) legitimately reads rubric;
-- LIVE-STATE A3 confirmed NO authenticated client (candidato OR RH) reads it via the
-- API → revoking the column from authenticated is safe (distinct from SEC-02, where
-- RH reads the verdict as `authenticated` → column REVOKE forbidden).
--
-- ⚠️ NOTE (24-08 apply — column-REVOKE effectiveness): this project grants table-level
--    privileges to `authenticated` via Supabase defaults (GRANT ALL ON ALL TABLES),
--    and in Postgres a bare `REVOKE SELECT (rubric)` does NOT override a table-level
--    SELECT grant — so this REVOKE alone may be a NO-OP and rubric could still be
--    readable by a direct PostgREST query. SEC-07 has NO row-deny fallback (the row
--    policy stays), so if the behavioral smoke (supabase/tests/sec01_07_smokes.sql,
--    §(c)) FAILs in 24-08, remediate with the effective idiom (verify the live grant
--    model first via MCP):
--        REVOKE SELECT ON public.perguntas FROM authenticated, anon;
--        GRANT  SELECT (id, tipo, cargo, dimensao_primaria, cenario, formato,
--                       tempo_est_min, content_hash, status, created_at)
--               ON public.perguntas TO authenticated, anon;
--    (i.e. revoke the table-level SELECT, then re-grant column-level SELECT on every
--     column EXCEPT rubric). A3: no authenticated client reads rubric, so RH is unaffected.
--
-- RNF-07a: nothing here writes candidaturas or auto-rejects. Do NOT touch
-- `cand_le_perguntas_ativas`. NO outer BEGIN/COMMIT wrapper.
-- =============================================================================

-- Column REVOKE — the candidate/anon may no longer project the BARS answer key.
-- (avaliar-redacao reads it via service_role, which bypasses column grants.)
REVOKE SELECT (rubric) ON public.perguntas FROM authenticated, anon;

COMMENT ON COLUMN public.perguntas.rubric IS
  'Phase 24 / SEC-07: BARS open-case dimension weights = ANSWER KEY. SELECT column REVOKE de authenticated/anon — lida APENAS pela EF avaliar-redacao (service_role). NUNCA na projecao candidate-facing (avaliacaoService dropa rubric do allowlist). Ver 20260706110002_sec07_rubric.sql (nota 24-08 sobre grant table-level).';
