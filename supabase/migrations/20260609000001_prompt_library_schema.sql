-- =============================================================================
-- Migration: AI Prompt Library + Cost Infra — schema (6 tables + 3 enums + RLS)
-- Date: 2026-06-09
-- Phase: 09 (ai-prompt-library-cost-infra)
-- Requirements: IA-01, IA-02, IA-03, IA-04, LGPD-04
-- AUTHORED BUT NOT APPLIED — apply is the [BLOCKING] human task in Plan 09-07.
-- =============================================================================
--
-- PURPOSE
-- Foundation schema for the M2 funnel AI infra: versioned prompt library
-- (prompt_versions), per-call audit log (ai_call_logs), HITL Art.20 decisions
-- (candidate_ai_decisions), daily cost aggregation (ai_cost_daily), LGPD deletion
-- audit (data_deletion_log), and recruiter alerts (recruiter_alerts — NEW, did not
-- exist). The schema source is AUDITORIA-LGPD-LOGGING-VERSIONING.md §2 + PRD §8.1,
-- but those specs declare English FK targets (candidates/jobs/recruiters/
-- applications) that DO NOT exist live. Every FK here is RETARGETED to the live
-- pt-BR tables: candidatos, vagas, usuarios_rh (RESEARCH Pitfall 2/3).
--
-- AUTHORIZATION / RLS
-- All 6 tables: ENABLE ROW LEVEL SECURITY + a FOR SELECT 'administrador'-read policy
-- (recruiter_alerts additionally readable by 'rh' per orchestrator-decision #4).
-- NO INSERT/UPDATE/DELETE policy — writes happen ONLY via the EF service_role (which
-- bypasses RLS) or via the SECURITY DEFINER RPCs in migration 02 (RF-PL-29). Same
-- idiom as bias_audit_log: (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'.
--
-- SCOPE NOTES
-- - pgmq is NOT enabled here — async eval queues are deferred to Phase 11.
-- - known_schema_versions table (PRD §8.1) is OUT of v1 scope:
--   schema_version_required is a plain TEXT DEFAULT '1.0.0'.
-- - data_deletion_log is created (the rollback RPC writes an audit row), but the
--   Art.18 delete_candidate_data() function itself is deferred to Phase 15.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already
-- wraps each migration in its own implicit transaction; an outer BEGIN/COMMIT
-- combined with adjacent COMMENT/extension statements breaks the prepared-statement
-- boundary parser and raises SQLSTATE 42601 at push time (CLAUDE.md §Commands / D-22).
-- If `supabase db push` fails with 42601, apply via the D-22 SQL-Editor (or Supabase
-- MCP execute_sql) workaround, then `supabase migration repair --status applied
-- 20260609000001`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions (Supabase-managed; no third-party package install — T-09-SC)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- digest() for seed content_hash (AUDITORIA §3.3)
CREATE EXTENSION IF NOT EXISTS pg_cron;    -- aggregation + retention crons (migration 03)
CREATE EXTENSION IF NOT EXISTS pg_net;     -- cost-anomaly net.http_post trigger (migration 02)
-- NOTE: pgmq intentionally NOT enabled — async eval queues deferred to Phase 11.

-- -----------------------------------------------------------------------------
-- Enums (AUDITORIA §2.1)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.llm_call_type AS ENUM (
    'cv_summary',
    'cv_job_match',
    'comparative_ranking',
    'interview_guide',
    'transcript_analysis',
    'culture_fit_essay',
    'work_sample_sjt'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.llm_provider AS ENUM ('anthropic', 'openai', 'google');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.candidate_status AS ENUM (
    'pending_ai',
    'ai_screened',
    'auto_approved',
    'auto_rejected',
    'flagged_for_review',
    'human_reviewing',
    'human_confirmed_approved',
    'human_confirmed_rejected',
    'candidate_review_requested',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- Table: prompt_versions (versioned prompt library — runtime source of truth)
-- AUDITORIA §2.2 + PRD §8.1 schema_version_required column
-- -----------------------------------------------------------------------------
CREATE TABLE public.prompt_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_type       public.llm_call_type NOT NULL,

  -- Versioning (IMMUTABLE after deploy — enforced by trigger in migration 02)
  semver          text NOT NULL,
  content_hash    text NOT NULL UNIQUE,

  -- Content
  system_template text NOT NULL,
  user_template   text NOT NULL,

  -- Model params
  model_id        text NOT NULL,
  temperature     numeric(3,2) NOT NULL DEFAULT 0,
  max_tokens      integer NOT NULL,

  -- State
  is_active       boolean NOT NULL DEFAULT false,
  is_canary       boolean NOT NULL DEFAULT false,
  canary_pct      smallint DEFAULT 0 CHECK (canary_pct BETWEEN 0 AND 100),

  -- Compat matrix (PRD §8.1 — plain TEXT, no known_schema_versions FK in v1)
  schema_version_required text NOT NULL DEFAULT '1.0.0',

  -- Mandatory changelog
  change_summary  text NOT NULL,
  changed_by      text NOT NULL,
  approved_by     text,

  -- Rollback lineage
  previous_version_id uuid REFERENCES public.prompt_versions(id),

  -- Post-deploy metrics
  avg_score_delta numeric(5,2),
  p95_latency_ms  integer,
  error_rate_pct  numeric(5,2),

  created_at      timestamptz NOT NULL DEFAULT now(),
  deployed_at     timestamptz,
  deprecated_at   timestamptz,

  -- Only ONE active version per call_type (canary does not count)
  CONSTRAINT unique_active_per_type
    EXCLUDE USING btree (call_type WITH =)
    WHERE (is_active = true AND is_canary = false)
);

CREATE INDEX idx_prompt_versions_type_active ON public.prompt_versions (call_type, is_active, is_canary);
CREATE INDEX idx_prompt_versions_hash        ON public.prompt_versions (content_hash);

ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY administrador_le_prompt_versions ON public.prompt_versions
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  );

COMMENT ON TABLE public.prompt_versions IS
  'Phase 9 / IA-01: versioned prompt library (runtime source of truth). SemVer + content_hash '
  'SHA-256 + schema_version_required compat matrix. Immutable after deploy (trigger in migration 02). '
  'Seeded as is_active=false; first activation per call_type is one-time manual SQL (orchestrator-decision #2).';

-- -----------------------------------------------------------------------------
-- Table: ai_call_logs (per-call audit — IA-02)
-- AUDITORIA §2.3 — FKs RETARGETED candidatos/vagas (NOT candidates/jobs)
-- -----------------------------------------------------------------------------
CREATE TABLE public.ai_call_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context (pt-BR FKs — RESEARCH Pitfall 2)
  candidato_id          uuid REFERENCES public.candidatos(id) ON DELETE SET NULL,
  vaga_id               uuid REFERENCES public.vagas(id) ON DELETE SET NULL,
  call_type             public.llm_call_type NOT NULL,

  -- Traceability
  prompt_version_id     uuid NOT NULL REFERENCES public.prompt_versions(id),
  prompt_hash           text NOT NULL,

  -- Model
  provider              public.llm_provider NOT NULL,
  model_id              text NOT NULL,
  model_snapshot        text,

  -- PSEUDONYMIZED inputs (LGPD — only template + masked placeholders, never raw PII)
  system_prompt         text NOT NULL,
  user_prompt_template  text NOT NULL,
  input_token_count     integer NOT NULL,

  -- Outputs
  raw_response          jsonb NOT NULL,
  parsed_score          numeric(5,2),
  parsed_reasoning      text,
  output_token_count    integer NOT NULL,

  -- Performance
  latency_ms            integer NOT NULL,
  attempt_number        smallint NOT NULL DEFAULT 1,
  cost_usd              numeric(10,6),

  -- State
  success               boolean NOT NULL DEFAULT true,
  error_code            text,
  error_message         text,

  -- Idempotency
  idempotency_key       text UNIQUE,

  -- Retention
  created_at            timestamptz NOT NULL DEFAULT now(),
  retain_until          timestamptz NOT NULL,
  triggered_by          text NOT NULL DEFAULT 'system',

  CONSTRAINT valid_score    CHECK (parsed_score IS NULL OR (parsed_score >= 0 AND parsed_score <= 100)),
  CONSTRAINT valid_latency  CHECK (latency_ms >= 0),
  CONSTRAINT valid_attempts CHECK (attempt_number BETWEEN 1 AND 5)
);

CREATE INDEX idx_ai_logs_candidato_vaga ON public.ai_call_logs (candidato_id, vaga_id);
CREATE INDEX idx_ai_logs_created_at     ON public.ai_call_logs (created_at DESC);
CREATE INDEX idx_ai_logs_call_type      ON public.ai_call_logs (call_type);
CREATE INDEX idx_ai_logs_retain_until   ON public.ai_call_logs (retain_until) WHERE retain_until IS NOT NULL;
CREATE INDEX idx_ai_logs_provider_model ON public.ai_call_logs (provider, model_id);
CREATE INDEX idx_ai_logs_vaga_cost      ON public.ai_call_logs (vaga_id, cost_usd) WHERE success = true;
CREATE INDEX idx_ai_logs_error          ON public.ai_call_logs (error_code) WHERE success = false;
CREATE INDEX idx_ai_logs_idempotency    ON public.ai_call_logs (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY administrador_le_ai_call_logs ON public.ai_call_logs
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  );

COMMENT ON TABLE public.ai_call_logs IS
  'Phase 9 / IA-02: per-call AI audit log. Records prompt_version, model, tokens, cost, latency, '
  'masked inputs (pseudonymized — NEVER raw candidate PII), parsed score/reasoning (Art.20). '
  'Writes via EF service_role only; admin-read RLS. retain_until drives the retention purge cron.';

-- -----------------------------------------------------------------------------
-- Table: candidate_ai_decisions (HITL Art.20 — IA-02)
-- AUDITORIA §2.4 — FKs RETARGETED candidatos/vagas; reviewer_id -> usuarios_rh
-- -----------------------------------------------------------------------------
CREATE TABLE public.candidate_ai_decisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id          uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE SET NULL,
  vaga_id               uuid NOT NULL REFERENCES public.vagas(id) ON DELETE SET NULL,

  -- Aggregation of the (up to 7) call logs
  ai_call_log_ids       uuid[] NOT NULL,
  ai_composite_score    numeric(5,2) NOT NULL,
  ai_recommendation     text NOT NULL,
  ai_reasoning_summary  text NOT NULL,

  -- State
  status                public.candidate_status NOT NULL DEFAULT 'ai_screened',

  -- HITL (LGPD Art.20) — reviewer is an RH user (NOT recruiters)
  review_requested_at   timestamptz,
  review_requested_by   text,
  reviewer_id           uuid REFERENCES public.usuarios_rh(id),
  reviewed_at           timestamptz,
  human_decision        text,
  human_notes           text,
  human_overrode_ai     boolean,

  -- LGPD: explanation delivery
  explanation_delivered_at timestamptz,
  explanation_channel      text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  UNIQUE (candidato_id, vaga_id)
);

CREATE INDEX idx_decisions_status         ON public.candidate_ai_decisions (status);
CREATE INDEX idx_decisions_review_pending ON public.candidate_ai_decisions (review_requested_at)
  WHERE status = 'candidate_review_requested';
CREATE INDEX idx_decisions_candidato      ON public.candidate_ai_decisions (candidato_id);

ALTER TABLE public.candidate_ai_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY administrador_le_candidate_ai_decisions ON public.candidate_ai_decisions
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  );

COMMENT ON TABLE public.candidate_ai_decisions IS
  'Phase 9 / IA-02 + LGPD Art.20: aggregated AI decision per (candidato, vaga). Advisory only — the '
  'system NEVER auto-rejects by score (RNF-07a); status is human-in-the-loop. reviewer_id -> usuarios_rh. '
  'Writes via EF service_role / DEFINER RPC only; admin-read RLS.';

-- -----------------------------------------------------------------------------
-- Table: ai_cost_daily (daily cost aggregation — IA-03/IA-04)
-- AUDITORIA §2.5 — vaga_id RETARGETED to vagas
-- -----------------------------------------------------------------------------
CREATE TABLE public.ai_cost_daily (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  vaga_id     uuid REFERENCES public.vagas(id) ON DELETE SET NULL,
  call_type   public.llm_call_type NOT NULL,
  provider    public.llm_provider NOT NULL,
  call_count           integer NOT NULL DEFAULT 0,
  total_input_tokens   bigint NOT NULL DEFAULT 0,
  total_output_tokens  bigint NOT NULL DEFAULT 0,
  total_cost_usd       numeric(12,6) NOT NULL DEFAULT 0,
  error_count          integer NOT NULL DEFAULT 0,
  UNIQUE (date, vaga_id, call_type, provider)
);

CREATE INDEX idx_ai_cost_daily_date ON public.ai_cost_daily (date DESC);
CREATE INDEX idx_ai_cost_daily_vaga ON public.ai_cost_daily (vaga_id);

ALTER TABLE public.ai_cost_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY administrador_le_ai_cost_daily ON public.ai_cost_daily
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  );

COMMENT ON TABLE public.ai_cost_daily IS
  'Phase 9 / IA-03+IA-04: daily aggregated AI cost (per date/vaga/call_type/provider). Populated by the '
  'ai-cost-aggregation cron (migration 03) before the retention purge. A post-INSERT/UPDATE trigger '
  '(migration 02) fires net.http_post to the cost-alerter EF when PRD thresholds are violated.';

-- -----------------------------------------------------------------------------
-- Table: data_deletion_log (LGPD deletion audit trail)
-- AUDITORIA §7.4 — the rollback RPC (migration 02) writes an audit row here.
-- The Art.18 delete_candidate_data() function itself is deferred to Phase 15.
-- -----------------------------------------------------------------------------
CREATE TABLE public.data_deletion_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_type text NOT NULL,            -- e.g. 'prompt_rollback:cv_job_match:1.0.0' | 'candidate_full_deletion'
  deleted_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_deletion_log_deleted_at ON public.data_deletion_log (deleted_at DESC);

ALTER TABLE public.data_deletion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY administrador_le_data_deletion_log ON public.data_deletion_log
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
  );

COMMENT ON TABLE public.data_deletion_log IS
  'Phase 9 / LGPD audit: append-only deletion/rollback audit trail (no candidate ID — compliance). '
  'The rollback_to_version RPC writes a prompt_rollback row here. The Art.18 candidate-deletion '
  'function (delete_candidate_data) is deferred to Phase 15.';

-- -----------------------------------------------------------------------------
-- Table: recruiter_alerts (NEW — did not exist; IA-04 cost-alerter sink)
-- orchestrator-decision #4 column set (RESEARCH Open Q2). Readable by administrador + rh.
-- -----------------------------------------------------------------------------
CREATE TABLE public.recruiter_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_type         public.llm_call_type,      -- nullable — vaga/spam alerts are not call-type specific
  threshold_violated text NOT NULL,            -- alert_type, e.g. 'vaga_cost_over_200' | 'candidate_cost_over_1' | 'error_rate' | 'spam'
  vaga_id           uuid REFERENCES public.vagas(id) ON DELETE SET NULL,
  candidato_id      uuid REFERENCES public.candidatos(id) ON DELETE SET NULL,
  value             numeric,                    -- observed value that tripped the threshold
  threshold         numeric,                    -- the configured threshold
  channel           text,                       -- delivery channel, e.g. 'email' | 'cost_anomaly'
  message           text,
  is_read           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz
);

CREATE INDEX idx_recruiter_alerts_unread  ON public.recruiter_alerts (is_read, created_at DESC);
CREATE INDEX idx_recruiter_alerts_vaga    ON public.recruiter_alerts (vaga_id);
-- Dedup support for the cost-alerter (Pitfall 7): one alert per (threshold_violated, vaga_id, day)
CREATE INDEX idx_recruiter_alerts_dedup   ON public.recruiter_alerts (threshold_violated, vaga_id, created_at);

ALTER TABLE public.recruiter_alerts ENABLE ROW LEVEL SECURITY;
-- administrador AND rh may read (decision #4); writes via service_role / DEFINER only
CREATE POLICY administrador_rh_le_recruiter_alerts ON public.recruiter_alerts
  FOR SELECT USING (
    (select auth.jwt() #>> '{app_metadata,role}') IN ('administrador', 'rh')
  );

COMMENT ON TABLE public.recruiter_alerts IS
  'Phase 9 / IA-04 (NEW table): cost-anomaly + operational alerts sink. Written by the cost-alerter EF '
  '(service_role) when the ai_cost_daily trigger fires. Readable by administrador + rh. Dedup per '
  '(threshold_violated, vaga_id, day) to avoid duplicate alerts (RESEARCH Pitfall 7).';
