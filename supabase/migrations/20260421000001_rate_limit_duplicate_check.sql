-- =============================================================================
-- Migration: Rate limit for check_candidato_duplicate + policy_version on autorizacoes
-- Date: 2026-04-21
-- Requirements: CAD-03, CAD-05 (Phase 2), D-09, D-12, D-16
-- Threats mitigated: T-02-01 (Info Disclosure — CPF/email enumeration)
-- Authoritative source: .planning/phases/02-cadastro-candidato/02-AUDIT-RESULTS.md
-- =============================================================================
--
-- PURPOSE
-- 1. Ensure pgcrypto extension is present (needed for `digest()`).
-- 2. Add rate_limit_check_duplicate audit table keyed on
--    (x_forwarded_for, hash_cpf_email, called_at) — NOT on the Postgres
--    session-IP function (see 02-AUDIT-RESULTS.md Probe 2 for the rejected
--    approach). That function returns the Supabase internal proxy IP
--    (AWS us-east range), meaning all production
--    traffic would share one global bucket and the rate limit would DoS the
--    product itself. The table is consumed ONLY by the SECURITY DEFINER
--    function; REVOKEd from all client roles.
-- 3. Patch public.check_candidato_duplicate to enforce a HYBRID rate-limit
--    strategy:
--      (a) PRIMARY: `current_setting('request.headers', true)::json->>'x-forwarded-for'`
--          — returns real client IP when Supabase proxy propagates it.
--      (b) COMPOSITE: key = (x_forwarded_for, hash_cpf_email) — defeats abuse
--          by IP-rotators probing the same candidato identifiers. If
--          x-forwarded-for is null in production, the key collapses to
--          (null, hash) which acts as per-candidato throttling. This is
--          acceptable degradation and Wave 2 must validate which mode applies
--          at runtime.
--      (c) UPPER BOUND: hard ceiling of 1000 calls/min across all keys as
--          defense-in-depth against distributed DDoS.
--    Excess returns { cpf_exists: null, email_exists: null, rate_limited: true }.
-- 4. Add public.autorizacoes columns (D-16 + LGPD forensics):
--      - policy_version   — D-16, default 'v1.0-2026-04'
--      - ip_aceite        — `inet` NOT `text` for type strictness
--      - user_agent_aceite — LGPD forensics (detect automated abuse)
--      - user_id          — FK to auth.users, ON DELETE SET NULL
--    NOTE: the redundant timestamp column (name redacted per audit) is NOT
--    added — the table already has `created_at` with default `now()` which is
--    semantically identical (per audit Probe 1).
-- 5. Two indexes on autorizacoes: partial idx_autorizacoes_user_id
--    (WHERE user_id IS NOT NULL), and idx_autorizacoes_policy_version.
--
-- RESPONSE SHAPE (unchanged contract, new field)
--   { "cpf_exists": boolean|null, "email_exists": boolean|null, "rate_limited": boolean }
--
-- CONSUMERS
--   src/features/cadastro/services/duplicateCheckService.ts (RPC call)
--   supabase/functions/cadastrar-candidato/index.ts (INSERT into autorizacoes —
--     Plan 02-03 MUST add `user_agent_aceite` from req.headers.get('user-agent')
--     and MUST NOT reference the deprecated redundant timestamp column)
-- =============================================================================

-- pgcrypto is required for `digest()` used to hash (cpf|email) into the
-- composite rate-limit key. Safe no-op if already installed.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- -------------------------------------------------------------------------
-- 1. Rate limit audit table (hybrid key: x_forwarded_for + hash_cpf_email)
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limit_check_duplicate (
  id                bigserial PRIMARY KEY,
  x_forwarded_for   text NULL,
  hash_cpf_email    text NOT NULL,
  called_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_dup_lookup
  ON public.rate_limit_check_duplicate (x_forwarded_for, hash_cpf_email, called_at DESC);

-- Only the SECURITY DEFINER function (running as postgres) reads/writes this table.
REVOKE ALL ON TABLE public.rate_limit_check_duplicate FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limit_check_duplicate FROM anon;
REVOKE ALL ON TABLE public.rate_limit_check_duplicate FROM authenticated;

COMMENT ON TABLE public.rate_limit_check_duplicate IS
  'Audit log for check_candidato_duplicate RPC. Keys on (x_forwarded_for, hash_cpf_email). '
  'Rows > 10min old are cleaned opportunistically inside the function body. '
  'Only the SECURITY DEFINER function may read/write; all client roles are REVOKEd. '
  '(D-12 revised per 02-AUDIT-RESULTS.md, Phase 2)';

-- -------------------------------------------------------------------------
-- 2. Patched RPC with HYBRID rate limit (x-forwarded-for + hash + global cap)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_candidato_duplicate(
  p_cpf   text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cpf_clean    text;
  v_email_clean  text;
  v_xff          text := current_setting('request.headers', true)::json->>'x-forwarded-for';
  v_hash         text := encode(
                            public.digest(
                              coalesce(p_cpf,'') || '|' || coalesce(p_email,''),
                              'sha256'
                            ),
                            'hex'
                          );
  v_recent_count int;
  v_global_count int;
  v_cpf_exists   boolean;
  v_email_exists boolean;
BEGIN
  -- 2a. Opportunistic cleanup of rows older than 10 minutes
  DELETE FROM public.rate_limit_check_duplicate
  WHERE called_at < now() - interval '10 minutes';

  -- 2b. Per-key (x_forwarded_for, hash_cpf_email) count in the last 60s
  SELECT count(*) INTO v_recent_count
  FROM public.rate_limit_check_duplicate
  WHERE hash_cpf_email = v_hash
    AND (x_forwarded_for IS NOT DISTINCT FROM v_xff)
    AND called_at > now() - interval '60 seconds';

  IF v_recent_count >= 30 THEN
    RETURN jsonb_build_object(
      'cpf_exists',   null,
      'email_exists', null,
      'rate_limited', true
    );
  END IF;

  -- 2c. Global upper bound (defense-in-depth against distributed DDoS)
  SELECT count(*) INTO v_global_count
  FROM public.rate_limit_check_duplicate
  WHERE called_at > now() - interval '60 seconds';

  IF v_global_count >= 1000 THEN
    RETURN jsonb_build_object(
      'cpf_exists',   null,
      'email_exists', null,
      'rate_limited', true
    );
  END IF;

  -- 2d. Log the probe
  INSERT INTO public.rate_limit_check_duplicate (x_forwarded_for, hash_cpf_email)
  VALUES (v_xff, v_hash);

  -- 2e. Normal duplicate check (normalize CPF digits + lowercase email)
  v_cpf_clean   := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_email_clean := lower(trim(COALESCE(p_email, '')));

  SELECT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE cpf = v_cpf_clean AND deleted_at IS NULL
  ) INTO v_cpf_exists;

  SELECT EXISTS (
    SELECT 1 FROM public.candidatos
    WHERE lower(email) = v_email_clean AND deleted_at IS NULL
  ) INTO v_email_exists;

  RETURN jsonb_build_object(
    'cpf_exists',   CASE WHEN v_cpf_clean   = '' THEN false ELSE v_cpf_exists   END,
    'email_exists', CASE WHEN v_email_clean = '' THEN false ELSE v_email_exists END,
    'rate_limited', false
  );
END;
$$;

COMMENT ON FUNCTION public.check_candidato_duplicate(text, text) IS
  'Returns {cpf_exists, email_exists, rate_limited}. SECURITY DEFINER with '
  'HYBRID rate limit: primary key is x-forwarded-for header (NOT the '
  'Postgres session-IP function — see 02-AUDIT-RESULTS.md Probe 2 for why), composite fallback keyed on '
  '(x_forwarded_for, hash_cpf_email) at 30 calls/60s, plus global upper '
  'bound of 1000/60s. Opportunistic cleanup deletes rows > 10min old on each '
  'call. (D-09, D-12 revised, Phase 2)';

-- Grants: keep Phase 1 posture
REVOKE ALL ON FUNCTION public.check_candidato_duplicate(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate(text, text) TO anon, authenticated;

-- -------------------------------------------------------------------------
-- 3. policy_version + LGPD audit columns on autorizacoes + indexes
--    (per 02-AUDIT-RESULTS.md lines 37-45; the redundant timestamp column is
--     omitted — `created_at` already covers it)
-- -------------------------------------------------------------------------

ALTER TABLE public.autorizacoes
  ADD COLUMN IF NOT EXISTS policy_version text NOT NULL DEFAULT 'v1.0-2026-04',
  ADD COLUMN IF NOT EXISTS ip_aceite inet NULL,
  ADD COLUMN IF NOT EXISTS user_agent_aceite text NULL,
  ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_autorizacoes_user_id
  ON public.autorizacoes(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_autorizacoes_policy_version
  ON public.autorizacoes(policy_version);

COMMENT ON COLUMN public.autorizacoes.policy_version IS
  'LGPD policy version at time of consent (D-16, Phase 2). Default v1.0-2026-04 '
  'matches supabase/functions/_shared/constants.ts:POLICY_VERSION and '
  'src/features/cadastro/constants.ts:POLICY_VERSION — bump all three together.';

COMMENT ON COLUMN public.autorizacoes.user_agent_aceite IS
  'HTTP User-Agent header at time of consent. LGPD forensics — detect '
  'automated abuse (added per 02-AUDIT-RESULTS.md operator decision).';

COMMIT;
