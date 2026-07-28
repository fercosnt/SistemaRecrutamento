-- =============================================================================
-- Migration: enum_tag_opcao + pergunta_opcao_metadata table + indexes + RLS
-- Date: 2026-06-07
-- Phase: 07 (configuracao-de-vaga-tags)
-- Requirement: VAGACFG-03 (RF-35, RF-36) — option tag taxonomy + relational metadata
-- =============================================================================
--
-- PURPOSE
-- Path 1 (D-10): a relational table `pergunta_opcao_metadata` keyed by a stable
-- `opcao_id` (uuid) that mirrors the id stored INSIDE the `opcoes_resposta` jsonb on
-- `perguntas_formulario`. The jsonb<->table state is kept consistent atomically by the
-- SECURITY DEFINER RPC `upsert_pergunta_opcoes_metadata` (migration 010003) — never by
-- non-atomic client orchestration. This table is the source the downstream F8 (knockout),
-- F10 (score_match) and F15 (audit) phases read from.
--
-- Taxonomy (D-11, aligned PRD §8.2): 5-value enum `enum_tag_opcao` + `peso int`
-- (range -999..100, default 0) + `nota_ia text` nullable. An unmarked option resolves to
-- neutro / 0 / null.
--
-- F8/F10 JOIN CONTRACT (D-14): this table persists BOTH `opcao_id` AND the denormalized
-- `opcao_texto`. Downstream phases join primarily by `opcao_id`; `opcao_texto` is the
-- fallback/audit key (the candidato form today writes answer STRINGS, not opcao_ids — see
-- Pitfall 6). Storing both keeps F8/F10 join-able without breaking the Phase-4 writer.
--
-- CRITICAL CORRECTNESS RISK — do NOT copy the stale PRD §8.3 RLS template. It uses
-- `'admin'` (live role is `'administrador'`). This file uses the LIVE-verified shipped
-- idiom `(select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')`
-- (in production in 20260607000006_rls_policies_m2_backbone.sql).
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already wraps
-- each migration in its own implicit transaction; an outer BEGIN/COMMIT combined with DDL +
-- adjacent GRANT/policy statements breaks the prepared-statement boundary parser and raises
-- "cannot insert multiple commands into a prepared statement" (SQLSTATE 42601) at push time
-- (CLAUDE.md §Commands / D-22). If `supabase db push` fails with 42601, apply via the D-22
-- SQL-Editor (or Supabase MCP execute_sql) workaround, then
-- `supabase migration repair --status applied 20260607010001`.
-- =============================================================================

-- 5-value option tag taxonomy (D-11) ----------------------------------------------------------
CREATE TYPE public.enum_tag_opcao AS ENUM (
  'knockout', 'atencao', 'neutro', 'pontua', 'fortemente_pontua'
);

-- Relational option metadata (D-10 Path 1) ----------------------------------------------------
CREATE TABLE public.pergunta_opcao_metadata (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id  uuid NOT NULL REFERENCES public.perguntas_formulario(id) ON DELETE CASCADE,
  opcao_id     uuid NOT NULL,                       -- mirrors the id stored inside opcoes_resposta jsonb
  opcao_texto  text NOT NULL,                       -- denormalized for F8/F10 join-by-text (D-14, Pitfall 6)
  tag          public.enum_tag_opcao NOT NULL DEFAULT 'neutro',
  peso         int  NOT NULL DEFAULT 0 CHECK (peso BETWEEN -999 AND 100),
  nota_ia      text,
  ordem        int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pergunta_id, opcao_id)
);

COMMENT ON TABLE public.pergunta_opcao_metadata IS
  'Phase 7 / VAGACFG-03 (D-10 Path 1): per-option tag metadata keyed by a stable opcao_id that mirrors the id inside perguntas_formulario.opcoes_resposta jsonb. Synced atomically by upsert_pergunta_opcoes_metadata. Stores BOTH opcao_id AND opcao_texto (D-14) for the F8/F10 join contract (id primary, texto fallback/audit).';

-- Index strategy (D-10 discretion) ------------------------------------------------------------
CREATE INDEX idx_pom_pergunta ON public.pergunta_opcao_metadata (pergunta_id);
-- Partial index for the F8 knockout sweep (the hot downstream read):
CREATE INDEX idx_pom_knockout ON public.pergunta_opcao_metadata (pergunta_id)
  WHERE tag = 'knockout';

-- RLS: config is an RH/admin operation --------------------------------------------------------
ALTER TABLE public.pergunta_opcao_metadata ENABLE ROW LEVEL SECURITY;

-- RH/admin full access — live-verified shipped idiom (uses administrador, NOT the stale PRD role):
DROP POLICY IF EXISTS rh_gerencia_opcao_metadata ON public.pergunta_opcao_metadata;
CREATE POLICY rh_gerencia_opcao_metadata ON public.pergunta_opcao_metadata
  FOR ALL
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

-- (candidato/anon have NO policy -> denied. If F10 needs candidato-side reads later,
--  add a scoped SELECT policy in that phase. F7 = RH only.)
