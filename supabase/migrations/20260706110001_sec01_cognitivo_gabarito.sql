-- =============================================================================
-- Phase 24 / Plan 24-02 / SEC-01 — blindar o gabarito do banco cognitivo (CC0)
-- =============================================================================
-- Trust boundary: candidate JWT → PostgREST. RLS is ROW-level only and NEVER hides
-- a column ([[reference_select_star_leaks_pii]]); a candidato who issues
--   GET /rest/v1/cognitivo_itens?select=gabarito_idx
-- must obtain ZERO answer columns. This migration closes that leak with the proven
-- M2 answer-key posture (mirror get_bigfive_itens / get_opcoes_sjt):
--
--   (1) DROP the broad `auth_le_cognitivo_itens` SELECT row policy — after this the
--       candidato has NO SELECT policy on cognitivo_itens, so RLS returns 0 rows on
--       any direct read. This is the primary, PROVEN teeth (row-deny), identical to
--       how perguntas_opcao_sjt / bigfive_itens hide their scoring key.
--   (2) A new SECURITY DEFINER reader `get_cognitivo_itens()` that projects ONLY
--       id/secao/enunciado/alternativas/ordem — NEVER gabarito_idx. The candidate
--       reads the prova exclusively through this RPC (client rewired in the SAME
--       plan — cognitivoService.listItens — so the prova is never left with 0 rows,
--       RESEARCH Pitfall 2). SET search_path = '' + REVOKE PUBLIC / GRANT authenticated.
--   (3) Defense-in-depth column REVOKE of gabarito_idx from authenticated, anon.
--
-- ⚠️ NOTE (24-08 apply — column-REVOKE effectiveness): this project grants table-level
--    privileges to `authenticated` via Supabase defaults (GRANT ALL ON ALL TABLES),
--    and a bare `REVOKE SELECT (col)` does NOT override a table-level SELECT grant in
--    Postgres. For SEC-01 the ROW-deny in step (1) is the real boundary (candidato →
--    0 rows), so the column REVOKE here is belt-and-suspenders and remains correct
--    even if it is a no-op against the table-level grant. cognitivo_itens is EMPTY
--    today (CC0 seed deferred to M5) — this leak is LATENT but MUST close before the
--    seed (SEC-01 is the CC0 prerequisite). Behavioral candidato-DENY smoke:
--    supabase/tests/sec01_07_smokes.sql, executed against PROD in 24-08.
--
-- RNF-07a: nothing here writes candidaturas or auto-rejects.
-- Applied via Supabase MCP in 24-08 (bypasses 42601). NO outer BEGIN/COMMIT wrapper
-- (the driver wraps each migration in its own tx — an outer BEGIN/COMMIT triggers 42601).
-- =============================================================================

-- (1) Drop the broad authenticated SELECT — candidate now reads ONLY via the RPC.
--     No replacement SELECT policy → candidato/anon read 0 rows on the base table.
DROP POLICY IF EXISTS auth_le_cognitivo_itens ON public.cognitivo_itens;

-- (2) Answer-key-safe candidate reader (mirror get_bigfive_itens 20260612000001:200-212).
--     Projects ONLY the presentation columns — NEVER gabarito_idx (server-only key).
CREATE OR REPLACE FUNCTION public.get_cognitivo_itens()
RETURNS TABLE (id uuid, secao text, enunciado text, alternativas jsonb, ordem int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id, c.secao, c.enunciado, c.alternativas, c.ordem
    FROM public.cognitivo_itens c
   ORDER BY c.ordem;
$$;

REVOKE ALL ON FUNCTION public.get_cognitivo_itens() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cognitivo_itens() TO authenticated;

COMMENT ON FUNCTION public.get_cognitivo_itens() IS
  'Phase 24 / SEC-01: leitor answer-key-safe do banco cognitivo para o candidato. Projeta APENAS id/secao/enunciado/alternativas/ordem — NUNCA gabarito_idx (chave server-only, lida so por pontuar_cognitivo DEFINER). SET search_path = ''''; REVOKE PUBLIC / GRANT authenticated. Read-only — nao faz DML nem auto-rejeita (RNF-07a).';

-- (3) Defense-in-depth column REVOKE — see the ⚠️ NOTE above (row-deny is the boundary).
REVOKE SELECT (gabarito_idx) ON public.cognitivo_itens FROM authenticated, anon;
