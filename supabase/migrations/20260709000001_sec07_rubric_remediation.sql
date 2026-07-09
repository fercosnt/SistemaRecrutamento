-- =============================================================================
-- Phase 24 / Plan 24-08 / SEC-07 REMEDIATION — effective rubric column-secrecy
-- =============================================================================
-- 24-08 live smoke found (as 20260706110002_sec07_rubric.sql's ⚠️ NOTE predicted):
-- Supabase grants table-level SELECT to `authenticated`/`anon` (GRANT ALL ON ALL
-- TABLES), and in Postgres a bare `REVOKE SELECT (rubric)` does NOT override a
-- table-level SELECT grant. Live proof (2026-07-09, MCP):
--     has_column_privilege('authenticated','public.perguntas','rubric','SELECT') = true
-- SEC-07 has NO row-deny fallback (the candidate row policy `cand_le_perguntas_ativas`
-- stays), so a candidato could still `GET /rest/v1/perguntas?select=rubric`.
--
-- EFFECTIVE FIX (the documented idiom): REVOKE the table-level SELECT, then re-GRANT
-- column-level SELECT on EVERY perguntas column EXCEPT `rubric`. After this the only
-- reader of rubric is the `avaliar-redacao` EF (service_role — bypasses grants).
--
-- SAFETY (verified before applying):
--   * A3: no authenticated client (candidato OR RH) reads rubric via the API — the
--     only src reference is the SEC guard test. The sole production perguntas reader
--     (avaliacaoService.ts:142) projects an explicit allowlist that already omits rubric.
--   * RH keeps INSERT/UPDATE(rubric) (not touched) — write path intact.
--   * SEC-01 needs no equivalent because its candidate row policy was DROPPED (row-deny).
--
-- Column set = the live perguntas schema minus rubric (11 cols → 10). If a future
-- migration adds a perguntas column, extend this GRANT (or rubric stays the only
-- non-readable column, which is the intended default-safe posture).
--
-- RNF-07a: nothing here writes candidaturas or auto-rejects. No BEGIN/COMMIT wrapper.
-- =============================================================================

REVOKE SELECT ON public.perguntas FROM authenticated, anon;

GRANT SELECT (id, tipo, cargo, dimensao_primaria, cenario, formato,
              tempo_est_min, content_hash, status, created_at)
  ON public.perguntas TO authenticated, anon;
