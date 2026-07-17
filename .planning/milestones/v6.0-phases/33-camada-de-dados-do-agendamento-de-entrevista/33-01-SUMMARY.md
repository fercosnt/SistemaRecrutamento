---
phase: 33-camada-de-dados-do-agendamento-de-entrevista
plan: 01
status: complete
wave: 1
requirements: [AGEND-01]
completed: 2026-07-16
---

# 33-01 SUMMARY — agendamentos_entrevista schema + vaga_id trigger

## What was built

Authored (not yet applied — 33-03 is the apply gate) the first section of the single
migration file `supabase/migrations/20260716000001_agendamentos_entrevista.sql`:

- **`CREATE TABLE public.agendamentos_entrevista`** with the 15-column authoritative
  reconciled set (ARCHITECTURE `observacoes_rh`/`status`/`agendado_por` × FEATURES
  `entrevistador`/`compareceu`, CONTEXT Area 1 LOCKED):
  `id` (uuid PK), `candidatura_id` (NOT NULL FK → candidaturas ON DELETE CASCADE),
  `vaga_id` (NOT NULL FK → vagas, denormalized KPI convenience), `tipo`
  (`public.tipo_entrevista_avaliacao`), `data_hora` (timestamptz), `local_ou_link` (text),
  `status` (`public.status_entrevista` DEFAULT `'agendada'`), `observacoes_rh` (text),
  `entrevistador` (text), `compareceu` (boolean, nullable), `agendado_por` (uuid),
  `created_at`/`updated_at` (timestamptz DEFAULT now()), `updated_by` (uuid), `deleted_at` (timestamptz).
- Reuses the two **pre-existing PROD enums** by reference — no `CREATE TYPE`.
- Indices `idx_agendamentos_candidatura`, `idx_agendamentos_vaga`; `COMMENT ON TABLE` +
  `COMMENT ON COLUMN observacoes_rh` documenting the SEG-03 boundary.
- **`agendamento_normaliza_vaga_id()` BEFORE INSERT/UPDATE trigger** (`SECURITY DEFINER`,
  `SET search_path=''`, schema-qualified) — forces `NEW.vaga_id := candidatura.vaga_id`
  (Pitfall-1 belt + KPI-by-vaga integrity; a client-supplied `vaga_id` is overwritten).

## Verification
- grep gates `TABLE_OK` + `TRIGGER_OK` both PASS (after rewording a header-comment
  false-positive on the literal words "CREATE TYPE" in prose).
- No `BEGIN;/COMMIT;` wrapper (D-22); no `CREATE TYPE`; no RLS/policy/RPC yet (33-02 owns those).
- Column count = 15. Not applied to PROD; no `database.types.ts` change (table not yet live).

## Key files
- created: `supabase/migrations/20260716000001_agendamentos_entrevista.sql` (table + trigger section)

## Notes / deviations
- None. Executed inline (sequential, main tree — `use_worktrees=false`) with `--no-verify`
  commits because the husky pre-commit runs `npm run lint` (tsc) which blocks on the
  documented 104-error baseline unrelated to this `.sql` change (repo-sanctioned per
  `.husky/pre-commit` comment).

## Self-Check: PASSED
