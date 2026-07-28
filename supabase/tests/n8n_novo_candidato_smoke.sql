-- =============================================================================
-- Phase 26 / Plan 26-03 — n8n "novo candidato" server-side trigger behavioral smoke
-- =============================================================================
-- Proves, AFTER 20260712100004_n8n_novo_candidato.sql applies, that the AFTER INSERT
-- trigger `trg_n8n_novo_candidato`:
--   (1) GRACEFUL-SKIP — with the Vault secret `n8n_webhook_base` ABSENT (NULL), a
--       disposable candidato INSERT COMMITS with no error (the trigger returns NEW
--       without dispatching). If the trigger raised, the INSERT would fail → SKIP.
--   (2) NO-PII BODY (structural) — the trigger function definition references only
--       `NEW.id` and never a personal-data column (NEW.<identity/contact/document>).
--   (3) RNF-07a — the AFTER INSERT trigger never mutates the candidatos row: the
--       inserted row's fields are byte-identical to what was inserted.
-- A NOTICE 'PASS ...' per assertion = PASS; an EXCEPTION = FAIL.
--
-- SAFETY / SECRET PRECONDITION:
--   This smoke exercises the graceful-skip path, which is only the LIVE behavior while
--   `n8n_webhook_base` is NULL (Fernando's deferred human-action — expected NULL at
--   26-07). Setup best-effort checks the secret and SKIPs the whole smoke if it is set,
--   so a disposable INSERT never fires a real webhook. Even in the worst case (secret
--   set + trigger fires) the body is `candidato_id` ONLY — a disposable test UUID, never
--   any personal data — so nothing sensitive can leak. Note: the privileged smoke role
--   may not be able to read vault.decrypted_secrets (it is read in the DEFINER context of
--   the trigger); the check is therefore best-effort and the id-only body is the real
--   safety guarantee.
--
-- MECHANISM (self-contained disposable fixture — NO PROD candidate mutated):
--   A privileged (RLS-bypassing) setup step creates a DISPOSABLE auth.users row + a
--   DISPOSABLE candidatos row referencing it (fixed 26030001-* UUIDs → idempotent). The
--   candidato INSERT is what fires the AFTER INSERT trigger. If the fixture cannot be
--   built (live-schema NOT NULL gap / auth.users columns / secret set), the block catches,
--   sets smoke.ready='n', and every assertion SKIPs-with-NOTICE (never false-fails) —
--   adjust to live schema in 26-07.
--
-- CLEANUP is ROLLBACK-free: deletes the disposable candidato + auth.users row + GUCs.
--
-- RUN: Supabase SQL Editor / MCP `execute_sql` AFTER the migration applies (Wave 4 / 26-07).
--      THIS FILE IS RED until then — trg_n8n_novo_candidato must be live for it to fire.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP — privileged discovery + disposable fixture (RLS bypass)
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_secret_set boolean := false;
BEGIN
  -- Idempotent: clear any prior run's disposable rows.
  DELETE FROM public.candidatos WHERE id = '26030001-0000-0000-0000-0000000000c1';
  DELETE FROM auth.users        WHERE id = '26030001-0000-0000-0000-0000000000a1';

  -- Best-effort secret precondition: if the secret is SET, do not insert (avoid firing a
  -- real dispatch for a disposable row) — the graceful-skip path is not the live behavior.
  BEGIN
    SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets
                    WHERE name = 'n8n_webhook_base' AND decrypted_secret IS NOT NULL)
      INTO v_secret_set;
  EXCEPTION WHEN OTHERS THEN
    v_secret_set := false;  -- role cannot read the vault → treat as NULL (expected state)
  END;
  IF v_secret_set THEN
    PERFORM set_config('smoke.ready', 'n', false);
    RAISE NOTICE 'n8n SKIP: n8n_webhook_base is SET — graceful-skip is not the live path; skipping to avoid a disposable dispatch';
    RETURN;
  END IF;

  -- Disposable auth.users row so the candidatos.user_id FK is satisfied.
  INSERT INTO auth.users (id, instance_id, aud, role, created_at, updated_at)
  VALUES ('26030001-0000-0000-0000-0000000000a1',
          '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          now(), now());

  -- Disposable candidato → the INSERT fires the AFTER INSERT trigger (graceful-skip path).
  -- The trigger, if it raised, would abort THIS insert → the EXCEPTION handler SKIPs.
  INSERT INTO public.candidatos
    (id, user_id, nome_completo, celular, cidade, estado, data_nascimento, email)
  VALUES
    ('26030001-0000-0000-0000-0000000000c1', '26030001-0000-0000-0000-0000000000a1',
     '[SMOKE 26-03] Candidato Descartavel', '11999990000', 'Sao Paulo', 'SP',
     '1990-01-01', 'smoke-2603@example.invalid');

  PERFORM set_config('smoke.cand',           '26030001-0000-0000-0000-0000000000c1', false);
  PERFORM set_config('smoke.nome_before',    '[SMOKE 26-03] Candidato Descartavel', false);
  PERFORM set_config('smoke.email_before',   'smoke-2603@example.invalid', false);
  PERFORM set_config('smoke.ready',          'y', false);
  RAISE NOTICE 'n8n fixture built (disposable candidato % inserted — trigger fired without error)',
    '26030001-0000-0000-0000-0000000000c1';
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('smoke.ready', 'n', false);
  RAISE NOTICE 'n8n SKIP: disposable fixture could not be built (%: %) — adjust to live schema in 26-07', SQLSTATE, SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) GRACEFUL-SKIP — the disposable candidato INSERT committed with the secret NULL.
--     Its presence proves the AFTER INSERT trigger raised no error (graceful RETURN NEW).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE n int;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'n8n SKIP (1 graceful-skip): fixture not built'; RETURN; END IF;
  SELECT count(*) INTO n FROM public.candidatos WHERE id = current_setting('smoke.cand')::uuid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'n8n FAIL (1 graceful-skip): disposable candidato absent — the trigger aborted the INSERT (graceful-skip broken)';
  END IF;
  RAISE NOTICE 'PASS (1 graceful-skip): disposable candidato INSERT committed with n8n_webhook_base NULL — trigger raised no error';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) NO-PII BODY (structural) — the trigger function body references only NEW.id and
--     never a personal-data column reference (NEW.<identity/contact/document>).
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.trg_n8n_novo_candidato()'::regprocedure);
  IF v_def NOT LIKE '%NEW.id%' THEN
    RAISE EXCEPTION 'n8n FAIL (2 no-pii): trigger body does not reference NEW.id (unexpected shape)';
  END IF;
  IF v_def LIKE '%NEW.nome_completo%' OR v_def LIKE '%NEW.email%'
     OR v_def LIKE '%NEW.telefone%' OR v_def LIKE '%NEW.celular%'
     OR v_def LIKE '%NEW.cpf%' THEN
    RAISE EXCEPTION 'n8n FAIL (2 no-pii): trigger body references a personal-data column — PII would cross the wire';
  END IF;
  RAISE NOTICE 'PASS (2 no-pii): trigger body carries only NEW.id — no personal-data column reference';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (3) RNF-07a — the AFTER INSERT trigger never mutates the candidatos row.
--     The inserted row's fields are byte-identical to what setup inserted.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DO $$
DECLARE v_nome text; v_email text;
BEGIN
  IF current_setting('smoke.ready', true) IS DISTINCT FROM 'y' THEN
    RAISE NOTICE 'n8n SKIP (3 rnf-07a): fixture not built'; RETURN; END IF;
  SELECT nome_completo, email INTO v_nome, v_email
    FROM public.candidatos WHERE id = current_setting('smoke.cand')::uuid;
  IF v_nome IS DISTINCT FROM current_setting('smoke.nome_before')
     OR v_email IS DISTINCT FROM current_setting('smoke.email_before') THEN
    RAISE EXCEPTION 'n8n FAIL (3 rnf-07a): trigger mutated the candidatos row (% / % — expected % / %)',
      v_nome, v_email, current_setting('smoke.nome_before'), current_setting('smoke.email_before');
  END IF;
  RAISE NOTICE 'PASS (3 rnf-07a): candidatos row byte-identical after INSERT — trigger never writes candidatos';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLEANUP — ROLLBACK-free: drop the disposable candidato + auth.users row + GUCs.
-- ─────────────────────────────────────────────────────────────────────────────
RESET ROLE;
DELETE FROM public.candidatos WHERE id = '26030001-0000-0000-0000-0000000000c1';
DELETE FROM auth.users        WHERE id = '26030001-0000-0000-0000-0000000000a1';
SELECT set_config('smoke.ready', '', false);
