-- =============================================================================
-- Migration: AI Prompt Library — seed v1.0.0 (7 prompts, is_active=false)
-- Date: 2026-06-09
-- Phase: 09 (ai-prompt-library-cost-infra)
-- Requirements: IA-01
-- DEPENDS ON: 20260609000001 (schema — prompt_versions, llm_call_type), pgcrypto (digest)
-- AUTHORED BUT NOT APPLIED — apply is the [BLOCKING] human task in Plan 09-07.
-- =============================================================================
--
-- PURPOSE
-- Seeds one prompt_versions row per call_type at semver '1.0.0', is_active=false,
-- is_canary=false. The seed exists so the tables + admin pages are non-empty before
-- the real consumers arrive (Phase 10+) and so the first manual activation per
-- call_type has a row to flip.
--
-- TEMPLATE BODIES ARE PLACEHOLDERS. The authoritative system/user templates live in git
-- (docs/conhecimento/prompts/templates/NN-*.md). scripts/sync-prompts.ts hydrates the real
-- bodies + recomputes content_hash on first merge to main (RF-PL-07, hybrid git->DB). The
-- placeholder text here just points at the git path; the UPSERT in sync-prompts uses
-- ON CONFLICT (content_hash) DO NOTHING, so once the real hash lands these placeholder rows
-- can be superseded by the synced rows (or updated in place before deploy).
--
-- ACTIVATION IS MANUAL (orchestrator-decision #2 / RESEARCH A8): the CI sync writes
-- is_active=false ONLY; the first activation per call_type is a one-time manual SQL
-- (UPDATE ... SET is_active=true), NOT auto-activated. The PRD §11 "first version is_active=true"
-- note is explicitly OVERRIDDEN by CONTEXT.md.
--
-- content_hash uses extensions.digest(...) — pgcrypto's digest() lives in the `extensions`
-- schema in this Supabase project (precedent: 20260421000002_fix_digest_schema_in_rpc.sql).
-- model_id per PRD decision #5 + template frontmatter: cv_summary=claude-haiku-4-5,
-- the other 6 = claude-sonnet-4-6. max_tokens/temperature per template frontmatter.
--
-- NOTE: No `BEGIN; ... COMMIT;` wrapper (CLAUDE.md §Commands / D-22). Pure INSERTs, but kept
-- wrapper-free for consistency with the rest of the Phase-9 migration set.
-- =============================================================================

INSERT INTO public.prompt_versions (
  call_type, semver, content_hash, system_template, user_template,
  model_id, temperature, max_tokens, schema_version_required,
  is_active, is_canary, change_summary, changed_by
) VALUES
  (
    'cv_summary', '1.0.0',
    encode(extensions.digest('seed:cv_summary:1.0.0', 'sha256'), 'hex'),
    '[SEED PLACEHOLDER] system_template — hydrated from docs/conhecimento/prompts/templates/01-cv-summary.md by sync-prompts.ts',
    '[SEED PLACEHOLDER] user_template — hydrated from docs/conhecimento/prompts/templates/01-cv-summary.md by sync-prompts.ts',
    'claude-haiku-4-5', 0, 1500, '1.0.0',
    false, false,
    'seed v1.0.0',
    'tech-lead@beauty-smile.com.br'
  ),
  (
    'cv_job_match', '1.0.0',
    encode(extensions.digest('seed:cv_job_match:1.0.0', 'sha256'), 'hex'),
    '[SEED PLACEHOLDER] system_template — hydrated from docs/conhecimento/prompts/templates/02-cv-job-match.md by sync-prompts.ts',
    '[SEED PLACEHOLDER] user_template — hydrated from docs/conhecimento/prompts/templates/02-cv-job-match.md by sync-prompts.ts',
    'claude-sonnet-4-6', 0, 2048, '1.0.0',
    false, false,
    'seed v1.0.0',
    'tech-lead@beauty-smile.com.br'
  ),
  (
    'comparative_ranking', '1.0.0',
    encode(extensions.digest('seed:comparative_ranking:1.0.0', 'sha256'), 'hex'),
    '[SEED PLACEHOLDER] system_template — hydrated from docs/conhecimento/prompts/templates/03-comparative-ranking.md by sync-prompts.ts',
    '[SEED PLACEHOLDER] user_template — hydrated from docs/conhecimento/prompts/templates/03-comparative-ranking.md by sync-prompts.ts',
    'claude-sonnet-4-6', 0, 3000, '1.0.0',
    false, false,
    'seed v1.0.0',
    'tech-lead@beauty-smile.com.br'
  ),
  (
    'interview_guide', '1.0.0',
    encode(extensions.digest('seed:interview_guide:1.0.0', 'sha256'), 'hex'),
    '[SEED PLACEHOLDER] system_template — hydrated from docs/conhecimento/prompts/templates/04-interview-guide.md by sync-prompts.ts',
    '[SEED PLACEHOLDER] user_template — hydrated from docs/conhecimento/prompts/templates/04-interview-guide.md by sync-prompts.ts',
    'claude-sonnet-4-6', 0.1, 3000, '1.0.0',
    false, false,
    'seed v1.0.0',
    'tech-lead@beauty-smile.com.br'
  ),
  (
    'transcript_analysis', '1.0.0',
    encode(extensions.digest('seed:transcript_analysis:1.0.0', 'sha256'), 'hex'),
    '[SEED PLACEHOLDER] system_template — hydrated from docs/conhecimento/prompts/templates/05-transcript-analysis.md by sync-prompts.ts',
    '[SEED PLACEHOLDER] user_template — hydrated from docs/conhecimento/prompts/templates/05-transcript-analysis.md by sync-prompts.ts',
    'claude-sonnet-4-6', 0, 4000, '1.0.0',
    false, false,
    'seed v1.0.0',
    'tech-lead@beauty-smile.com.br'
  ),
  (
    'culture_fit_essay', '1.0.0',
    encode(extensions.digest('seed:culture_fit_essay:1.0.0', 'sha256'), 'hex'),
    '[SEED PLACEHOLDER] system_template — hydrated from docs/conhecimento/prompts/templates/06-culture-fit-essay.md by sync-prompts.ts',
    '[SEED PLACEHOLDER] user_template — hydrated from docs/conhecimento/prompts/templates/06-culture-fit-essay.md by sync-prompts.ts',
    'claude-sonnet-4-6', 0, 2500, '1.0.0',
    false, false,
    'seed v1.0.0',
    'tech-lead@beauty-smile.com.br'
  ),
  (
    'work_sample_sjt', '1.0.0',
    encode(extensions.digest('seed:work_sample_sjt:1.0.0', 'sha256'), 'hex'),
    '[SEED PLACEHOLDER] system_template — hydrated from docs/conhecimento/prompts/templates/07-work-sample-sjt.md by sync-prompts.ts',
    '[SEED PLACEHOLDER] user_template — hydrated from docs/conhecimento/prompts/templates/07-work-sample-sjt.md by sync-prompts.ts',
    'claude-sonnet-4-6', 0, 3000, '1.0.0',
    false, false,
    'seed v1.0.0',
    'tech-lead@beauty-smile.com.br'
  )
ON CONFLICT (content_hash) DO NOTHING;
