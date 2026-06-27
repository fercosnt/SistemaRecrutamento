# Phase 6: Pipeline Backbone & Schema - Pattern Map

**Mapped:** 2026-06-07
**Files analyzed:** 7 SQL migrations (all net-new)
**Analogs found:** 7 / 7 (every artifact has a live in-repo idiom to copy)

> This is a pure Postgres/Supabase DB-schema phase. "Files to be created" are SQL
> migrations under `supabase/migrations/`. There is no controller/component/service
> tier — the analogs are existing migrations whose idioms (migration header,
> 42601-note, BEFORE-trigger skeleton, SECURITY DEFINER vs INVOKER, RLS policy
> idiom, GRANT/REVOKE block) the planner should copy verbatim instead of the stale
> PRD §8.3 template.
>
> **Critical correction confirmed against live schema:** the in-production RLS idiom
> is `(select auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador')`
> wrapped in a subquery for the perf cache — NOT the unwrapped form the RESEARCH
> §Pitfall-1 template shows, and NOT the PRD §8.3 `'admin'`/`auth_user_id` form.
> See Shared Pattern A.

## File Classification

| New migration (illustrative name) | Role | Data Flow | Closest Analog | Match Quality |
|-----------------------------------|------|-----------|----------------|---------------|
| `..._etapa_processo_v2_cutover.sql` | migration (DDL + live data) | transform / batch (one-time cutover) | `20260606000001_vaga_status_sync.sql` (backfill + DDL + 42601-note) | role-match (no prior live enum cutover exists) |
| `..._status_candidatura_review.sql` | migration (DDL, likely no-op) | transform | `20260606000001_vaga_status_sync.sql` | role-match |
| `..._historico_candidatura.sql` | migration (table + index) | CRUD (append-only audit) | `20260419000000_baseline.sql` table defs + legacy `historico_acoes` (shape ref, **do NOT reuse** — Pitfall 5) | role-match |
| `..._decisao_final.sql` | migration (table + CHECK + RLS) | CRUD (EF-write only) | `20260606000001` (table+constraint+trigger style) + Shared Pattern C (decisao_final guardrail) | role-match |
| `..._bias_audit_log.sql` | migration (table + RLS, schema-only) | event-driven (snapshot deferred to P15) | `20260419000000_baseline.sql` + Shared Pattern A (admin-only RLS) | role-match |
| `..._avancar_etapa_trigger.sql` | migration (PL/pgSQL fn + BEFORE UPDATE trigger) | event-driven (trigger) | `20260606000001_vaga_status_sync.sql` (BEFORE trigger fn + DO-block bind + 42601-note) — **exact** | exact |
| `..._rls_policies_m2_backbone.sql` | migration (RLS policies) | request-response (access control) | `20260425000002_curriculos_bucket.sql` (live CREATE POLICY with role idiom) — **exact** | exact |

## Pattern Assignments

---

### `..._avancar_etapa_trigger.sql` (PL/pgSQL function + BEFORE UPDATE trigger)

**Analog:** `supabase/migrations/20260606000001_vaga_status_sync.sql` (EXACT — same artifact
shape: BEFORE trigger that coerces/validates `NEW`, idempotent `CREATE OR REPLACE FUNCTION`,
`DO $$` block to bind the trigger only if absent, trailing `COMMENT ON FUNCTION`, and the
canonical 42601 inline note). This is the single closest analog in the whole repo.

**42601 inline note + no-BEGIN/COMMIT header** (copy this block verbatim, adapt the artifact
list line) — lines 45-53:
```sql
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper. The Supabase CLI driver already
-- wraps each migration in its own implicit transaction; an outer BEGIN/COMMIT
-- combined with the `DO $$ ... END $$` / function body PL/pgSQL blocks (which
-- contain their own BEGIN/END) breaks the prepared-statement boundary parser
-- (SQLSTATE 42601 in the transaction pooler — see CLAUDE.md D-22 workaround).
-- This migration uses CREATE FUNCTION + DO $$ + COMMENT, so it MUST be applied
-- via the D-22 SQL-Editor workaround (paste + run manually, then
-- `supabase migration repair --status applied <version>`).
```

**BEFORE-trigger function skeleton** (lines 62-74) — note `RETURNS trigger`, `LANGUAGE plpgsql`,
**NO `SECURITY DEFINER`** (defaults to SECURITY INVOKER), mutate `NEW`, `RETURN NEW`:
```sql
CREATE OR REPLACE FUNCTION public.vagas_enforce_status_soft_delete_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND NEW.status = 'ativa' THEN
    NEW.status := 'arquivada';
  END IF;
  RETURN NEW;
END;
$$;
```
> **SECURITY INVOKER is load-bearing here, not incidental.** The analog omits
> `SECURITY DEFINER` and so must `avancar_etapa()` — keeping it INVOKER is what makes
> `auth.uid()` resolve to the calling RH user (and to NULL for service_role/EF writes).
> Marking it `SECURITY DEFINER` would null/owner-ize `auth.uid()` and defeat D-09 actor
> capture (RESEARCH Pitfall 4). Contrast with `submit_candidatura_atomic` below, which
> IS `SECURITY DEFINER` *because* it deliberately bypasses RLS for a privileged write.

**Idempotent trigger-bind via `DO $$` + `pg_trigger` existence check** (lines 77-89):
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'vagas_status_soft_delete_sync_trg'
      AND tgrelid = 'public.vagas'::regclass
  ) THEN
    EXECUTE 'CREATE TRIGGER vagas_status_soft_delete_sync_trg
             BEFORE INSERT OR UPDATE ON public.vagas
             FOR EACH ROW
             EXECUTE FUNCTION public.vagas_enforce_status_soft_delete_sync()';
  END IF;
END $$;
```
> For `avancar_etapa()`: bind `BEFORE UPDATE OF etapa_atual ON public.candidaturas`
> (or plain `BEFORE UPDATE`), same idempotent guard.

**New logic the analog does NOT show** (planner authors from RESEARCH §Pattern 2/3, but the
*structure* above is the copy source):
- Regression detection via enum ordinal compare: `IF NEW.etapa_atual IN ('aprovado','rejeitado') THEN NULL; ELSIF NEW.etapa_atual < OLD.etapa_atual THEN ...` (requires v2 enum declared in pipeline order — see cutover file).
- `RAISE EXCEPTION 'Regressão de etapa exige justificativa preenchida';` when `NEW.etapa_justificativa` is null/blank (success criterion #2).
- `v_ator uuid := auth.uid();` then `INSERT INTO public.historico_candidatura (... ator, auto_rejeitado ...) VALUES (... v_ator, (v_ator IS NULL) ...)` in the same transaction (D-09).

---

### `..._etapa_processo_v2_cutover.sql` (one-time live enum cutover + defensive backup)

**Analog:** `supabase/migrations/20260606000001_vaga_status_sync.sql` (role-match — it is the
established **backfill-of-live-data + DDL + 42601-checkpoint** precedent; there is no prior
enum *cutover* in the repo, so this analog supplies the *header/precondition/smoke/note*
convention, while RESEARCH §Pattern 1 supplies the cutover SQL sequence).

**PRECONDITION + SMOKE block convention** (copy this comment structure — analog lines 32-43):
```sql
-- PRECONDITION (manual verification BEFORE applying — run in SQL Editor):
--   SELECT id, slug, status, deleted_at FROM public.vagas
--     WHERE deleted_at IS NOT NULL AND status = 'ativa';
--
-- SMOKE (AFTER applying):
--   SELECT count(*) FROM public.vagas WHERE deleted_at IS NOT NULL AND status='ativa';  -- expect 0
```
> For the cutover, the precondition = the Wave-0 discovery query
> (`SELECT etapa_atual, count(*) FROM public.candidaturas GROUP BY 1`) and the smoke =
> the post-cutover `GROUP BY` count match (RESEARCH §Code Examples).

**Verified live enum facts to put in the `USING` CASE** (source: `database.types.ts` L2935-2945,
read this run — confirmed):
- Legacy `etapa_processo` (10 values): `triagem, bigfive, disc, entrevista_online, raven, cultura, entrevista_presencial, aprovado, rejeitado, avaliacao_final`.
- **There is NO `inscricao`, NO `avaliacao_assincrona`, NO `decisao_final`, NO `avaliacao_final`→`decisao_final` rename** — those are net-new v2 members (Pitfall 6).
- Name-identical survivors: `triagem`, `entrevista_online`, `entrevista_presencial`, `aprovado`, `rejeitado`. All other legacy values (`bigfive, disc, raven, cultura, avaliacao_final`) collapse to `triagem` (D-05).

**Cutover sequence** — use RESEARCH §Pattern 1 verbatim (DROP DEFAULT → CREATE TYPE v2 in pipeline
order → ALTER COLUMN ... USING CASE → SET DEFAULT → DROP legacy → RENAME v2 → `etapa_processo`).
> **Keep the final type name canonical `etapa_processo`** (D-03 rename-back) so the live
> `submit_candidatura_atomic` RPC's `'triagem'::public.etapa_processo` cast keeps compiling
> with no edit (verified L50 of the RPC, below). Diverging the final name breaks that RPC.

**Defensive backup before the drop** (D-04) — RESEARCH §Pattern 1 step 0:
`CREATE SCHEMA IF NOT EXISTS backup_m2; CREATE TABLE backup_m2.candidaturas_pre_funil AS SELECT * FROM public.candidaturas;`

**Companion column** — this file (or the historico file) must `ALTER TABLE public.candidaturas
ADD COLUMN etapa_justificativa text` (confirmed absent from live `candidaturas` Row this run).

---

### `..._historico_candidatura.sql` (append-only audit table)

**Analog:** baseline table-def style + the **legacy `historico_acoes` shape as a contrast
reference, NOT a reuse target** (Pitfall 5).

**Verified legacy `historico_acoes` columns** (database.types.ts, read this run):
`candidatura_id, created_at, descricao, tipo_acao (enum tipo_acao_historico), usuario_id (FK
usuarios_rh.id, NULL-able), metadata, id`.
> **Do NOT write to `historico_acoes` and do NOT FK to `usuarios_rh`.** The new
> `historico_candidatura` differs on purpose: explicit `etapa_de`/`etapa_para`
> (`public.etapa_processo` enum) columns, `criterio_texto text`, `auto_rejeitado boolean`,
> and **`ator uuid NULL REFERENCES auth.users(id)`** (auth.users, NOT usuarios_rh — D-09).
> Add a `COMMENT ON TABLE` noting coexistence with legacy `historico_acoes` so future
> readers don't conflate them.

Indexes (Claude's discretion, RESEARCH): `(candidatura_id, criado_em)`.

---

### `..._decisao_final.sql` (EF-write-only table with structural guardrail)

**Analog:** RESEARCH §Pattern 4 (the schema) + `submit_candidatura_atomic` for the
SECURITY-DEFINER/EF write boundary rationale + Shared Pattern C for the `WITH CHECK false`
RLS idiom.

**Structural guardrail — the load-bearing constraints** (D-02 / LGPD-02 / success criterion #5):
```sql
por_usuario   uuid NOT NULL REFERENCES auth.users(id),   -- NEVER null = zero-auto-rejection
justificativa text NOT NULL CHECK (length(justificativa) >= 50),
decisao       public.<decisao_enum> NOT NULL,            -- aprovado/rejeitado/em_espera
candidatura_id uuid NOT NULL UNIQUE REFERENCES public.candidaturas(id),
```
Client INSERT fully blocked (EF-only): `CREATE POLICY ... FOR INSERT WITH CHECK (false);`
SQL audit (success criterion #5): `SELECT count(*) FROM public.decisao_final WHERE por_usuario IS NULL;` → must be 0.

---

### `..._bias_audit_log.sql` (schema-only this phase)

**Analog:** baseline table style + Shared Pattern A (admin-only RLS).
Create empty table + RLS only; the monthly snapshot job is LGPD-03 → Phase 15 (Assumption A4).
RLS: `FOR SELECT USING ((select auth.jwt() #>> '{app_metadata,role}') = 'administrador')`.

---

### `..._status_candidatura_review.sql` (likely no-op)

**Analog:** `20260606000001` header style.
Verified live `status_candidatura` (database.types.ts, this run): `aguardando_resposta,
em_analise, aprovado_proxima, rejeitado, finalizado`. RESEARCH recommendation (Q2): **leave
as-is** unless a concrete new member is required; defer additions to the feature phase that
needs them. This migration may end up being just a confirming comment or omitted.

---

## Shared Patterns

### Shared Pattern A — RLS role/identity idiom (FUNIL-04)
**Source (LIVE, in production):** `supabase/migrations/20260425000002_curriculos_bucket.sql` L51-67.
**Apply to:** every RLS policy on the new tables + the `candidaturas` UPDATE policy.

The actually-shipped idiom — note `(select ...)` subquery wrappers (RLS perf-cache idiom,
documented as "Pitfall 8" in the analog) and the `#>>` path operator:
```sql
-- candidato owns the row
(select auth.uid()::text) = ...                     -- or: candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = (select auth.uid()))
-- RH/admin via JWT role
(select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
-- admin-only (bias_audit_log)
(select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
```

**VERIFIED corrections over the stale PRD §8.3 template** (do not copy the PRD):
- Auth FK column is **`user_id`** on both `candidatos` and `usuarios_rh` (NOT `auth_user_id`). [VERIFIED database.types.ts, this run]
- Role values are **`'rh'`, `'administrador'`, `'candidato'`** (NOT `'admin'`). [VERIFIED `20260420000002_unified_auth_role.sql` L52-65, this run]
- The JWT hook injects role into `app_metadata.role` via `custom_access_token_hook`; read it with the path-operator form above. [VERIFIED same file L77-81]

> Note: RESEARCH §Pitfall-1 shows the equivalent `(auth.jwt() -> 'app_metadata' ->> 'role')`
> unwrapped form. Both read the same claim; **prefer the live shipped `(select auth.jwt()
> #>> '{app_metadata,role}')` wrapped form** for consistency with the one RLS-policy
> precedent already in production and its perf-cache benefit.

### Shared Pattern B — Migration header + 42601 no-BEGIN/COMMIT convention
**Source:** `20260425000003_submit_candidatura_rpc.sql` L1-16 and `20260606000001_vaga_status_sync.sql` L1-53.
**Apply to:** ALL Phase-6 migrations; MANDATORY on the two with PL/pgSQL `$$`/`DO $$` (cutover, trigger).

Header skeleton (every file):
```sql
-- =============================================================================
-- Migration: <descrição>
-- Date: 2026-06-07
-- Phase: 06 (pipeline-backbone-schema)
-- Requirement: FUNIL-0x / LGPD-02
-- =============================================================================
```
Then the 42601 NOTE block (verbatim from Pattern-assignment for the trigger file) on any file
containing `CREATE FUNCTION` / `DO $$`. **No outer `BEGIN; ... COMMIT;`** in those files — the
CLI wraps each migration in its own implicit transaction; the outer wrapper + `$$` body is the
42601 trigger (CLAUDE.md §Commands / D-22).
> Counter-example: `20260420000002_unified_auth_role.sql` DOES use `BEGIN;...COMMIT;` (L30/L104)
> — that file predates the 42601 lesson and applied via `db push` before the pooler issue was
> hit. **Follow the newer `20260606000001` convention (no wrapper), not the old auth-hook one.**

### Shared Pattern C — GRANT/REVOKE + EF-write boundary
**Source:** `20260425000003_submit_candidatura_rpc.sql` L93-94 (privileged RPC) and
`20260420000002_unified_auth_role.sql` L96-102 (least-privilege grants).
**Apply to:** `decisao_final` (EF-only write) and any helper functions.
```sql
REVOKE ALL ON FUNCTION public.<fn>(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.<fn>(...) TO service_role;
```
**SECURITY DEFINER vs INVOKER decision rule (load-bearing this phase):**
- `submit_candidatura_atomic` is `SECURITY DEFINER ... SET search_path = ''` (L28-29) **because it
  deliberately performs a privileged INSERT, bypassing RLS, called by an EF as service_role.**
- `avancar_etapa()` MUST be the opposite — plain **SECURITY INVOKER** (omit the keyword, like the
  `vaga_status_sync` trigger fn) so `auth.uid()` resolves to the RH caller for actor capture (D-09).
- `decisao_final` writes go through an EF (service_role bypasses RLS), NOT a SECURITY DEFINER
  client RPC — RLS client INSERT is `WITH CHECK false`.

### Shared Pattern D — RPC that the cutover must NOT break
**Source:** `20260425000003_submit_candidatura_rpc.sql` L49-50.
The live candidatura producer casts `'aguardando_resposta'::public.status_candidatura` and
`'triagem'::public.etapa_processo`. The cutover preserves both (`triagem` survives, type renamed
back to `etapa_processo`), so this RPC needs **no edit** — but the planner must keep the canonical
type name to hold that invariant (Assumption A2).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | Every artifact maps to a live in-repo idiom. The closest concerns are *partial*: the enum *cutover* SQL sequence and the trigger's *ordinal-regression body* have no prior in-repo instance — those come from RESEARCH §Pattern 1/2/3 (CITED PostgreSQL docs), but the surrounding migration *structure* (header, 42601-note, backfill, trigger-bind, RLS idiom, grants) is all copy-from-live. |

## Metadata

**Analog search scope:** `supabase/migrations/*.sql` (12 files) + `database.types.ts` (generated).
**Files read this run:** `20260420000002_unified_auth_role.sql`, `20260425000003_submit_candidatura_rpc.sql`, `20260606000001_vaga_status_sync.sql`, `20260425000002_curriculos_bucket.sql` (L50-103), `20260420000001_rls_anon_to_rpc.sql` (L40-56), `database.types.ts` (enums L2935-2979, candidatos/usuarios_rh user_id, candidaturas Row, historico_acoes Row).
**Live facts verified (not just from RESEARCH):** legacy enum 10 values; `status_candidatura` 5 values; `candidatos.user_id` + `usuarios_rh.user_id`; role values `rh`/`administrador`/`candidato`; live RLS idiom `(select auth.jwt() #>> '{app_metadata,role}')`; only 5 CREATE POLICY statements exist (all storage/curriculos) → no existing `candidaturas` UPDATE policy to reconcile (Open Question 3 resolved: none present).
**Pattern extraction date:** 2026-06-07
