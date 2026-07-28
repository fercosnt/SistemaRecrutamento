-- =============================================================================
-- Phase 26 / Plan 26-07 — FUNIL-10 (A27) re-inscription-after-soft-delete smoke
-- =============================================================================
-- Proves, AFTER the legacy unfiltered UNIQUE constraint `unique_candidato_vaga` on
-- public.candidaturas(candidato_id, vaga_id) is DROPped (execution-time PROD step in
-- 26-07 — the offender is un-versioned M1 drift, not in any migration file), that:
--   (1) insert -> soft-delete (deleted_at=now()) -> RE-insert the SAME (candidato,vaga)
--       succeeds with NO 23505 (the partial keeper index allows re-application after a
--       soft-delete);
--   (2) EXACTLY ONE unique index on (candidato_id, vaga_id) remains and it carries the
--       `WHERE (deleted_at IS NULL)` filter (the keeper from 20260425000004) — the
--       unfiltered twin is gone.
--
-- A NOTICE 'PASS ...' per assertion = PASS; an unhandled EXCEPTION = FAIL.
--
-- MECHANISM (self-contained disposable fixture — NO PROD candidate mutated):
--   Discovers a REAL candidato with a user_id, builds a disposable vaga, then exercises
--   the insert->soft-delete->re-insert cycle on a fresh (candidato, disposable-vaga) pair
--   (fixed 26100010-* UUIDs so setup + cleanup are idempotent). The constraint/index is
--   enforced regardless of role, so this runs as the privileged role (no impersonation
--   needed). If the fixture cannot be built, the block skips-with-NOTICE (never false-fails).
--
-- CLEANUP is ROLLBACK-free: deletes the disposable fixture. The candidato is REAL, never deleted.
--
-- RUN: Supabase SQL Editor / MCP `execute_sql` AFTER the offender constraint is dropped
--      (26-07 Wave 4). RED (23505 on step 1) until the drop is applied.
-- =============================================================================
DO $$
DECLARE
  v_cand  uuid; v_user uuid;
  b1  uuid := '26100010-0000-0000-0000-0000000000b1';   -- disposable reinscricao vaga
  dr1 uuid := '26100010-0000-0000-0000-0000000000d1';   -- candidatura row 1 (soft-deleted)
  dr2 uuid := '26100010-0000-0000-0000-0000000000d2';   -- candidatura row 2 (re-insert)
  v_idx int; v_partial int;
BEGIN
  -- Idempotent cleanup of any prior run's disposable rows.
  DELETE FROM public.candidaturas WHERE id IN (dr1, dr2);
  DELETE FROM public.vagas WHERE id = b1;

  SELECT id, user_id INTO v_cand, v_user
    FROM public.candidatos WHERE user_id IS NOT NULL LIMIT 1;
  IF v_cand IS NULL THEN
    RAISE NOTICE 'FUNIL-10 SKIP: no candidato with a user_id — cannot build fixture'; RETURN;
  END IF;

  INSERT INTO public.vagas
    (id, titulo, slug, descricao_curta, sobre_cargo, requisitos_formacao, requisitos_experiencia,
     cidade, estado, tipo_contrato, status, testes_aplicaveis)
  VALUES
    (b1, '[SMOKE 26-10] Vaga reinscricao', 'smoke-2610-reinsc',
     'disposable smoke fixture', 'disposable', 'x', 'x', 'Sao Paulo', 'SP', 'CLT', 'ativa', '[]'::jsonb);

  -- (1) insert -> soft-delete -> re-insert the SAME (candidato, vaga): must NOT 23505.
  INSERT INTO public.candidaturas
    (id, candidato_id, vaga_id, status, etapa_atual, curriculo_url, curriculo_nome_original,
     curriculo_tamanho_bytes, data_candidatura)
  VALUES (dr1, v_cand, b1, 'aguardando_resposta', 'inscricao', 'smoke://cv', 'smoke.pdf', 0, now());
  UPDATE public.candidaturas SET deleted_at = now() WHERE id = dr1;
  BEGIN
    INSERT INTO public.candidaturas
      (id, candidato_id, vaga_id, status, etapa_atual, curriculo_url, curriculo_nome_original,
       curriculo_tamanho_bytes, data_candidatura)
    VALUES (dr2, v_cand, b1, 'aguardando_resposta', 'inscricao', 'smoke://cv', 'smoke.pdf', 0, now());
    RAISE NOTICE 'PASS (1 reinscricao): insert->soft-delete->re-insert succeeded (no 23505)';
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'FUNIL-10 FAIL (1 reinscricao): 23505 on re-insert after soft-delete — the legacy unfiltered unique index/constraint on (candidato_id, vaga_id) was NOT dropped';
  END;

  -- (2) exactly ONE unique index on (candidato_id, vaga_id) remains, and it is partial.
  SELECT count(*),
         count(*) FILTER (WHERE pg_get_indexdef(ix.indexrelid) LIKE '%deleted_at IS NULL%')
    INTO v_idx, v_partial
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid AND t.relnamespace = 'public'::regnamespace
   WHERE t.relname = 'candidaturas' AND ix.indisunique
     AND pg_get_indexdef(ix.indexrelid) LIKE '%candidato_id, vaga_id%';
  IF v_idx <> 1 OR v_partial <> 1 THEN
    RAISE EXCEPTION 'FUNIL-10 FAIL (2 index): expected exactly 1 partial unique index on (candidato_id, vaga_id), found % (% partial)', v_idx, v_partial;
  END IF;
  RAISE NOTICE 'PASS (2 index): exactly one unique index on (candidato_id, vaga_id) remains and it is partial (WHERE deleted_at IS NULL)';

  -- CLEANUP — ROLLBACK-free. The discovered candidato is REAL and is NEVER deleted.
  DELETE FROM public.candidaturas WHERE id IN (dr1, dr2);
  DELETE FROM public.vagas WHERE id = b1;
  RAISE NOTICE 'FUNIL-10 PASS: re-inscription after soft-delete works; disposable fixture cleaned up';
EXCEPTION WHEN OTHERS THEN
  DELETE FROM public.candidaturas WHERE id IN (dr1, dr2);
  DELETE FROM public.vagas WHERE id = b1;
  RAISE;
END $$;
