# Phase 33: Camada de Dados do Agendamento de Entrevista - Research

**Researched:** 2026-07-16
**Domain:** Supabase Postgres data layer — new table + bidirectional RLS + SECURITY DEFINER read RPC, proven by JWT-impersonated behavioral smoke (security-first, zero UI)
**Confidence:** HIGH (every pattern is a verbatim copy of a shipped, live-verified precedent in this repo; no novel mechanism)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Area 1 — Schema Shape & Enums (accepted as recommended)**
- REUSE the enums already in the DB (do NOT create new): `status_entrevista` (`agendada, em_andamento, concluida, cancelada, reagendada, nao_compareceu`) and `tipo_entrevista_avaliacao` (`online, presencial`).
- Authoritative column set of `public.agendamentos_entrevista`:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE`
  - `vaga_id uuid NOT NULL REFERENCES public.vagas(id)` — denormalized (immutable, set from candidatura at insert)
  - `tipo tipo_entrevista_avaliacao NOT NULL`
  - `data_hora timestamptz NOT NULL`
  - `local_ou_link text` — single column, semantics inferred by `tipo`
  - `status status_entrevista NOT NULL DEFAULT 'agendada'`
  - `observacoes_rh text` — RH-internal, NEVER in the candidate projection (SEG-03)
  - `entrevistador text`
  - `compareceu boolean` — nullable (null = pending); distinct from `status`; feeds KPI-04 no-show
  - `agendado_por uuid` (author — AGEND-01)
  - `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`, `updated_by uuid`, `deleted_at timestamptz`
  - indexes `idx_agendamentos_candidatura (candidatura_id)` + `idx_agendamentos_vaga (vaga_id)`
- Comparecimento: `compareceu boolean` as its own field (not derived from `status`).
- Local/link: single `local_ou_link text` column (not two columns).

**Area 2 — RLS & SEG-03 Column Boundary (accepted as recommended)**
- RH access: vaga-scoped WR-04 predicate on SELECT + INSERT + UPDATE + DELETE. Role from `(select auth.jwt() #>> '{app_metadata,role}')` ∈ (`rh`,`administrador`) — NOT from `usuarios_rh`. Admin bypass OR (`rh` AND vaga ownership). WITH CHECK mirrors USING on writes. `(select auth.uid())` subquery idiom preserved verbatim.
- Candidate read: SECURITY DEFINER RPC `get_meu_agendamento` (clone `get_minha_redacao` skeleton) projecting allowlist ONLY (`id, candidatura_id, tipo, data_hora, local_ou_link, status, compareceu` — WITHOUT `observacoes_rh`, `entrevistador`, `agendado_por`, `updated_by`), ownership enforced INTERNALLY via join `→ candidaturas → candidatos WHERE ca.user_id = (select auth.uid())`. `search_path=''`, `REVOKE ALL … FROM PUBLIC`, `GRANT EXECUTE … TO authenticated`. Candidate has NO direct SELECT policy on the table → `observacoes_rh` unreachable by construction.
- RH write path: direct RLS-gated `.insert/.update/.delete` (USING + WITH CHECK vaga-scoped) — no RPC (no server-min like P31's justificativa≥50).
- Candidate writes: NONE — no INSERT/UPDATE/DELETE policy for candidate.

**Area 3 — Lifecycle Semantics & Apply/Smoke (accepted as recommended)**
- Reschedule: UPDATE the same row (new `data_hora`, `status='reagendada'`); audit via `updated_at`/`updated_by`. No history table.
- Cancel: `status='cancelada'` (soft; row kept for KPI + candidate visibility). NOT hard-delete.
- Uniqueness: no hard unique constraint in v1 (planner MAY add partial unique `(candidatura_id) WHERE status <> 'cancelada' AND deleted_at IS NULL`; non-blocking).
- Apply + smoke gate: author 1 migration file (no BEGIN/COMMIT — D-22) → apply to PROD via Supabase MCP `apply_migration` → regen `database.types.ts` (repo ROOT) → reconcile `supabase_migrations.schema_migrations` → run JWT-impersonated smokes (cross-recruiter + cross-candidate + `observacoes_rh` exclusion) via `execute_sql` as the SEG-03 gate. Autonomous PROD-apply authorization is standing (M4/M5/P31/P32).

### Claude's Discretion
- Exact WR-04 predicate form (denormalized `vaga_id IN (…)` vs join-through-candidaturas) — choose the one most consistent with the migration. **[Research note: these are NOT equally safe — see Pitfall 1. Recommend join-through-candidaturas.]**
- Final policy/index/RPC names; whether to add the partial-unique 1-active constraint.
- Smoke fixture structure (synthetic recruiters vs real 0-vaga `usuarios_rh` + real FK-bound candidato). **[Research note: `vagas.created_by` HAS an FK — synthetic recruiter UUIDs will fail. Use real 0-vaga `usuarios_rh` users, P32 precedent. See Pitfall 4.]**

### Deferred Ideas (OUT OF SCOPE)
- Partial-unique "1 active agendamento per candidatura" — optional v1, planner decides.
- Candidate confirm/decline of the agendamento — read-only this layer; future (COMM/M7+).
- Reschedule-history table — v1 evolves the row in place.
- `.ics`-by-email + email reminder — COMM (M7+); P35 does client-side `.ics` download + ≤24h badge (no email).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AGEND-01** | RH agenda entrevista (modalidade online/presencial, data/hora, link ou local), gravada com autor (`agendado_por`) e vaga-scoped, na tabela nova `agendamentos_entrevista`. | Standard Stack (CREATE TABLE template `20260624000001`) + Architecture Pattern 1 (WR-04 write policies) + Code Example A. The column set is locked in CONTEXT Area 1; enums confirmed live in `database.types.ts`. |
| **SEG-03** | Agendamento respeita isolamento — candidato lê apenas a própria linha (sem `observacoes_rh`) e RH é vaga-scoped; smokes cross-candidato e cross-recrutador incl. exclusão de `observacoes_rh`. | Architecture Patterns 1–3 (WR-04 bidirectional + DEFINER allowlist RPC), the entire **Validation Architecture** section (the load-bearing behavioral smoke), Pitfalls 1/2/3/5. Mechanism = verbatim `get_minha_redacao` (P24 SEC-02) + `rh_le_historico` WR-04 (P32 SEG-02). |
</phase_requirements>

## Summary

Phase 33 is a **pure data-layer, security-first** phase whose every building block already ships in this repo. There is no novel technology to research: the table shape is locked (CONTEXT Area 1, cross-checked against `database.types.ts`), the RLS predicate is a verbatim copy of the shipped WR-04 join-scope, and the candidate-read boundary is a verbatim copy of the `get_minha_redacao` DEFINER-allowlist pattern (P24 SEC-02). The two enums (`status_entrevista`, `tipo_entrevista_avaliacao`) already exist in PROD (they back the legacy M1 `entrevistas_online`/`entrevistas_presenciais` tables — so "pre-declared, unused" is imprecise: they are *typed and stable*, just not yet used by an M2/M6 table). The target table `agendamentos_entrevista` does **not** exist (verified: absent from `database.types.ts`).

The research value is concentrated where the scouts did not go: **(1)** the denormalized-`vaga_id` authorization hole (the two "both safe" predicate options are NOT equally safe — a spoofed `vaga_id` column defeats the direct-`vaga_id` predicate; the join-through-candidaturas predicate is safe by construction); **(2)** the exact RED→GREEN behavioral-smoke harness that makes SEG-03 a load-bearing gate rather than theater (it must count PASS notices, not merely the absence of an exception, and it must include a *discriminating* cross-vaga-INSERT-with-spoofed-vaga_id assertion); and **(3)** the apply-ordering + `schema_migrations` ledger reconciliation that P32 established.

**Primary recommendation:** Author the table + RLS + DEFINER RPC in ONE migration file using the join-through-candidaturas WR-04 predicate (immune to `vaga_id` spoofing); author `seg33_agendamento_smokes.sql` in the RED wave with the 8 assertions in the Validation Architecture; apply via MCP `apply_migration` (name == filename version), regen `database.types.ts` at repo ROOT, confirm the ledger row, then run the smoke as the SEG-03 gate — every assertion must emit `PASS`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Store the interview schedule | Database / Storage (`agendamentos_entrevista`) | — | Per-candidatura relational data; a table, not client state. |
| Authorize RH read/write (vaga-scoped) | Database (RLS on `agendamentos_entrevista`) | — | WR-04 predicate enforced at the row layer; RH uses the plain anon client under RLS (no EF — no service_role read needed, unlike the CV bucket). |
| Authorize candidate read + hide `observacoes_rh` | Database (SECURITY DEFINER RPC `get_meu_agendamento`) | — | RLS is row-level only and cannot hide a column; column isolation is achieved by denying the base-table row + a DEFINER allowlist projection. Candidate calls the RPC via the anon client. |
| Prove isolation before any UI | Database (JWT-impersonated SQL smoke) | — | The load-bearing SEG-03 gate runs above `pg_policies`, in PROD, via MCP `execute_sql`. |
| Consume `compareceu` for KPI-04 no-show | Database (`funil_kpis` / P34) | — | Out of scope for P33 — P33 only creates the column; P34 reads it. |

**No frontend/API/EF tier participates in Phase 33.** Every capability lives in Postgres. The candidate card (P35) and RH form (P34) are downstream.

## Standard Stack

**Zero new dependencies** (M6 invariant — STATE.md `[Stack/M6]`). This phase adds one migration file, one behavioral-smoke SQL file, and a regenerated `database.types.ts`. No npm/PyPI/crates package is installed.

### Core (tooling, all already present)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Supabase MCP `apply_migration` | (MCP, standing auth) | Apply the migration to PROD, bypassing SQLSTATE 42601 on `$$` bodies + adjacent REVOKE/GRANT | D-22; every M2–M6 PL/pgSQL migration landed this way `[VERIFIED: STATE.md decisions, P24/P32]` |
| Supabase MCP `execute_sql` | (MCP, standing auth) | Run `seg33_agendamento_smokes.sql` as the SEG-03 gate | P24/P31/P32 precedent `[VERIFIED: seg32_smokes.sql header line 42]` |
| Supabase CLI | `supabase` at `/Users/fernando/.local/bin/supabase` | Regen `database.types.ts` via `npm run db:types` | CLAUDE.md §Commands `[VERIFIED: which supabase]` |
| tsc / vitest | (installed) | `npm run lint` (baseline 104 errors must not increase) after regen | CLAUDE.md §Commands `[VERIFIED]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DEFINER RPC for candidate read | Column-level `GRANT`/`REVOKE` on `observacoes_rh` | **Wrong mechanism.** RH shares the `authenticated` Postgres role with the candidate, so a column REVOKE would ALSO blind RH — the exact P24 SEC-02 landmine (`20260706110003:9-16`). Row-deny + DEFINER allowlist is the only correct pattern. |
| New table | Reuse legacy `entrevistas_online`/`entrevistas_presenciais` | Rejected in ARCHITECTURE.md:96 — legacy M1 tables are "untracked, unaudited-RLS," drag `transcricao`/`gravacao_url`/`analise_ia` baggage that conflicts with `entrevista_analises`. Clean new table is less surface area. |
| Direct `.insert/.update` under RLS | A DEFINER write RPC | Unnecessary — there is no server-min invariant (no justificativa≥50 like P31). USING + WITH CHECK vaga-scoping is sufficient (CONTEXT Area 2). |

## Package Legitimacy Audit

**N/A — this phase installs zero external packages** (M6 "zero dependências npm novas" invariant). No registry lookup, no slopcheck run required. The only artifacts are a SQL migration, a SQL smoke, and a regenerated types file.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
   RH (anon client,      │              Postgres (PROD)                │
   authenticated role) ──┼──► agendamentos_entrevista (NEW)            │
   .insert/.update/      │      │  RLS: rh_gerencia_agendamento         │
   .delete/.select       │      │   USING+WITH CHECK = WR-04            │
                         │      │   (admin bypass OR rh owns candidatura│
                         │      │    via candidaturas→vagas.created_by) │
                         │      │  NO candidate SELECT policy           │
                         │      │  NO candidate write policy            │
                         │      └───────────────┬───────────────────────┘
                         │                      │ FK candidatura_id → candidaturas
   Candidate (anon       │                      │      ON DELETE CASCADE
   client, authenticated)│                      │ FK vaga_id → vagas (denormalized)
        │                │                      ▼
        │  rpc(          │      ┌─────────────────────────────────────┐
        │  get_meu_      │      │ candidaturas → candidatos            │
        │  agendamento)  │      │  (ownership join: user_id=auth.uid())│
        └────────────────┼──►  get_meu_agendamento(candidatura_id)    │
                         │      │  SECURITY DEFINER, search_path=''    │
                         │      │  RETURNS allowlist ONLY              │
                         │      │  (id,candidatura_id,tipo,data_hora,  │
                         │      │   local_ou_link,status,compareceu)   │
                         │      │  → observacoes_rh UNREACHABLE        │
                         │      └─────────────────────────────────────┘
                         │
   Verification:  MCP execute_sql → seg33_agendamento_smokes.sql
   (JWT impersonation: set_config('request.jwt.claims',…) + SET ROLE authenticated)
                         └─────────────────────────────────────────────┘
```

### Recommended Migration/Test Structure
```
supabase/
├── migrations/
│   └── 20260716HHMMSS_agendamentos_entrevista.sql   # table + RLS + get_meu_agendamento RPC (1 file)
└── tests/
    └── seg33_agendamento_smokes.sql                  # 8 JWT-impersonated assertions (RED→GREEN)
database.types.ts                                     # regen at repo ROOT after apply
```

### Pattern 1: RH bidirectional write/read — WR-04 vaga-scoped (join-through-candidaturas)
**What:** One `FOR ALL` policy (or one policy per verb) with USING + WITH CHECK = the WR-04 predicate, keyed on the **candidatura's** vaga owner, NOT the denormalized `vaga_id` column.
**When to use:** Every RH read AND write of `agendamentos_entrevista`.
**Why join-through (not direct `vaga_id`):** see Pitfall 1 — the direct-`vaga_id IN (…)` form is defeatable by a spoofed `vaga_id` column value at INSERT.
**Example (adapt `rh_le_historico`, `20260715000002:137-147`):**
```sql
-- Source: supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql:137-147
--         + 20260706110004_sec05_08_vaga_scope.sql:94-124 (USING + WITH CHECK shape)
ALTER TABLE public.agendamentos_entrevista ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rh_gerencia_agendamento ON public.agendamentos_entrevista;
CREATE POLICY rh_gerencia_agendamento ON public.agendamentos_entrevista
  FOR ALL TO authenticated
  USING (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  )
  WITH CHECK (
    (select auth.jwt() #>> '{app_metadata,role}') = 'administrador'
    OR ((select auth.jwt() #>> '{app_metadata,role}') = 'rh'
        AND candidatura_id IN (
          SELECT c.id FROM public.candidaturas c
            JOIN public.vagas v ON v.id = c.vaga_id
           WHERE v.created_by = (select auth.uid())))
  );
-- NOTE: the denormalized vaga_id column is authorization-IRRELEVANT under this predicate
--       (scope is keyed on the candidatura's REAL vaga) → a spoofed vaga_id cannot cross scope.
--       Enforce vaga_id ↔ candidatura consistency separately (Pitfall 1 fix options).
```
**Discretion note (`FOR ALL` vs per-verb):** `FOR ALL` is the concise shipped idiom (see `cand_escreve_cognitivo_respostas`, `20260624000001:189-206`). If the planner prefers explicit per-verb policies (SELECT/INSERT/UPDATE/DELETE) for readability, that is equivalent — just keep the predicate identical in every USING and WITH CHECK.

### Pattern 2: Candidate read — DEFINER allowlist RPC (column isolation by construction)
**What:** Drop-in clone of `get_minha_redacao`. No candidate base-table SELECT policy exists → candidate reads 0 rows from the table directly; the RPC is the ONLY candidate path and its `RETURNS TABLE` signature physically cannot return `observacoes_rh`.
**When to use:** The candidate's only read of their own agendamento (consumed by P35).
**Example (clone `get_minha_redacao`, `20260706110003:52-88`):**
```sql
-- Source: supabase/migrations/20260706110003_sec02_redacao_verdict.sql:52-88
CREATE OR REPLACE FUNCTION public.get_meu_agendamento(p_candidatura_id uuid)
RETURNS TABLE (
  id             uuid,
  candidatura_id uuid,
  tipo           public.tipo_entrevista_avaliacao,
  data_hora      timestamptz,
  local_ou_link  text,
  status         public.status_entrevista,
  compareceu     boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT a.id, a.candidatura_id, a.tipo, a.data_hora, a.local_ou_link, a.status, a.compareceu
      FROM public.agendamentos_entrevista a
      JOIN public.candidaturas c  ON c.id  = a.candidatura_id
      JOIN public.candidatos    ca ON ca.id = c.candidato_id
     WHERE a.candidatura_id = p_candidatura_id
       AND ca.user_id = auth.uid()          -- own-row guard (inside the DEFINER)
       AND a.deleted_at IS NULL             -- hide hard-removed rows; CANCELLED stays visible
     ORDER BY a.data_hora DESC;             -- latest first (P34 reads the most-recent active)
END;
$$;

REVOKE ALL ON FUNCTION public.get_meu_agendamento(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_meu_agendamento(uuid) TO authenticated;
```
**Note:** `observacoes_rh`, `entrevistador`, `agendado_por`, `updated_by` are NEVER in the signature → unreachable. `deleted_at IS NULL` filters hard-removed rows only; `status='cancelada'` rows are intentionally still returned (candidate must see a cancellation — CONTEXT Area 3).

### Pattern 3: CREATE TABLE — full template
**What:** uuid PK, FK `ON DELETE CASCADE`, indexes, `ENABLE ROW LEVEL SECURITY`, `COMMENT ON TABLE`, `DROP POLICY IF EXISTS` before each `CREATE POLICY`.
**Source:** `20260624000001_entrevista_cognitivo_tables.sql` (whole file) — copy its discipline verbatim.

### Anti-Patterns to Avoid
- **`select('*')` on the candidate side.** RLS does not hide columns; the candidate must go through `get_meu_agendamento` only (`[[reference_select_star_leaks_pii]]`).
- **Column-level REVOKE to hide `observacoes_rh`.** No-op / wrong tier — blinds RH too (P24 SEC-02 landmine, `20260706110003:9-16`). Also a **REVOKE no-op**: structural greps of a REVOKE pass while the behavioral read still succeeds (P24 SEC-07). The smoke is the only real check.
- **A second permissive SELECT policy** (e.g., a leftover role-only `rh_le_*` or a candidate own-row policy "for convenience"). Postgres OR-combines permissive policies → one loose policy defeats the tight one (P24 SEC-08 "OR-defeat"; P32 caught a *second* live role-only `curriculos` policy the plan missed). Ensure the table has EXACTLY one RH policy and NO candidate SELECT policy.
- **Editing the `avancar_etapa()` trigger** or writing `historico_candidatura` directly. Out of scope; P33 does not touch the funnel trigger.
- **`BEGIN;…COMMIT;` wrapper** in the migration file (D-22 — triggers 42601).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vaga-scoped RH authorization | A new bespoke predicate | Copy `rh_le_historico` WR-04 verbatim (`20260715000002:137-147`) | "The failure mode is inventing a new predicate instead of copying the one that already ships" (`20260706110004:13-14`). |
| Hiding `observacoes_rh` from the candidate | Column grants / view gymnastics | Clone `get_minha_redacao` DEFINER allowlist (`20260706110003:52-88`) | The only mechanism that hides a column without blinding RH (shared `authenticated` role). |
| JWT-impersonated behavioral proof | A bespoke test rig | Clone `seg32_smokes.sql` structure (`set_config('request.jwt.claims',…)` + `SET ROLE authenticated`, disposable fixed-UUID fixture) | Load-bearing precedent; catches REVOKE no-op + OR-defeat that structural checks miss. |
| Applying PL/pgSQL to PROD | `supabase db push` | MCP `apply_migration` | `db push` hits 42601 on `$$` bodies (CLAUDE.md §Migrations); MCP bypasses it. |

**Key insight:** Every piece of Phase 33 is a copy of a shipped, live-verified artifact. The risk is not "can we build it" — it is "did we copy the *correct* predicate and did the smoke actually prove isolation." Spend the effort on Pitfall 1 (predicate choice) and the Validation Architecture (making the smoke discriminating), not on schema mechanics.

## Common Pitfalls

### Pitfall 1: Denormalized `vaga_id` authorization bypass — the "both safe" claim is false
**What goes wrong:** CONTEXT Area 1 lets the planner choose the direct-`vaga_id IN (SELECT id FROM vagas WHERE created_by=auth.uid())` predicate for RLS. With that predicate, a malicious recruiter A can INSERT a row where `candidatura_id` = a **victim's** candidatura (on recruiter B's vaga) but `vaga_id` = **A's own** vaga. The WITH CHECK on `vaga_id` passes (A owns that vaga), the row is created, and it is now linked to the victim's candidatura — and the victim's candidate would read it via `get_meu_agendamento` (which joins on `candidatura_id`, ignoring `vaga_id`). It also corrupts KPI-by-vaga (denormalized `vaga_id` ≠ `candidatura.vaga_id`).
**Why it happens:** The direct-`vaga_id` predicate authorizes on a **client-supplied, spoofable column** instead of on the candidatura's real ownership.
**How to avoid:** Use the **join-through-candidaturas** predicate (Pattern 1) — authorization is keyed on `candidaturas→vagas.created_by`, immune to a spoofed `vaga_id`. Keep `vaga_id` as a KPI convenience only, and enforce its consistency with a BEFORE INSERT/UPDATE trigger (`NEW.vaga_id := (SELECT vaga_id FROM candidaturas WHERE id = NEW.candidatura_id)`) OR simply do not trust it for authorization. `[VERIFIED: reasoned from 20260706110004 predicate semantics + CONTEXT column set]`
**Warning signs:** A smoke assertion where recruiter A INSERTs `candidatura_id`=victim + `vaga_id`=own succeeds instead of being denied (assertion (c) in Validation Architecture — the discriminating test).

### Pitfall 2: The smoke SKIPs instead of FAILing → false green in RED, and a weak GREEN gate
**What goes wrong:** Pre-apply, `agendamentos_entrevista` does not exist, so the fixture-build `DO` block throws and (per the `EXCEPTION WHEN OTHERS` precedent) sets `smoke.ready='n'`, making every assertion SKIP-with-NOTICE. "No EXCEPTION raised" then looks like success. Post-apply, if the fixture silently fails to build (e.g., cannot find 2 recruiters), every assertion again SKIPs — and a reviewer scanning for "FAIL" sees none.
**Why it happens:** SKIP-on-fixture-failure is the correct anti-false-fail design, but it means "absence of FAIL" ≠ "isolation proven."
**How to avoid:** The GREEN gate criterion is **"count N `PASS (…)` notices == expected assertion count,"** not "no exception." Document the expected PASS count (8 — see Validation Architecture) and require the operator/verifier to confirm all 8. `[VERIFIED: seg32_smokes.sql SKIP semantics, lines 79-83, 120]`
**Warning signs:** Smoke output shows `SEG-33 SKIP` lines instead of `PASS (a)…PASS (h)`.

### Pitfall 3: `SET search_path = ''` un-qualified object → RPC resolves nothing or the wrong table
**What goes wrong:** The DEFINER RPC sets `search_path=''`; any object not schema-qualified (`public.` / `auth.`) fails to resolve or resolves to an unexpected schema, silently returning 0 rows (candidate sees a blank card) or erroring.
**Why it happens:** Empty search_path is the mandatory security hardening (prevents search_path hijack of a DEFINER function), but it makes every bare identifier a bug.
**How to avoid:** Schema-qualify EVERYTHING (`public.agendamentos_entrevista`, `public.candidaturas`, `public.candidatos`, `auth.uid()`). `auth.uid()`/`auth.jwt()` read the `request.jwt.claims` GUC and survive DEFINER (the "Phase-6 proof," `20260715000002:36-39`). `[VERIFIED: get_minha_redacao 20260706110003:64, funil_kpis 20260715000002:52]`
**Warning signs:** Candidate `get_meu_agendamento` returns 0 rows for a row that exists; smoke assertion (f) fails "owner got 0 rows."

### Pitfall 4: Synthetic recruiter UUIDs violate the `vagas.created_by` FK
**What goes wrong:** CONTEXT's Discretion note repeats an older assumption ("synthetic recruiters — `vagas.created_by` sem FK"). This is **stale**: P32's execution (32-04) discovered `vagas.created_by` HAS a FK (`vagas_created_by_fkey`); inserting a disposable vaga with a made-up `created_by` UUID violates it.
**Why it happens:** The `rejeitar_candidatura` smoke (P31, `oper31_…:26`) *could* use a synthetic second recruiter because that RPC reads role from the JWT and never inserts a vaga for the second recruiter. The P33 smoke MUST insert vagas for BOTH recruiters (to test vaga-scope), so both `created_by` values must be **real** users.
**How to avoid:** Discover TWO distinct real `usuarios_rh` users owning 0 vagas (the P32 fixture pattern, `seg32_smokes.sql:67-74`) as recruiter A / recruiter B; a third real `usuarios_rh` user as admin; a real FK-bound candidato (`candidatos.user_id`) as the candidate. `[VERIFIED: seg32_smokes.sql:26-29 header note + fixture 67-77]`
**Warning signs:** Fixture build raises a foreign-key violation → `smoke.ready='n'` → everything SKIPs (Pitfall 2 masks it).

### Pitfall 5: `compareceu` vs `status='nao_compareceu'` — two sources of truth for no-show
**What goes wrong:** `status_entrevista` includes a `nao_compareceu` value AND the schema has a separate `compareceu boolean`. KPI-04 (P34) reads `compareceu`. If a UI later sets `status='nao_compareceu'` without setting `compareceu=false` (or vice-versa), the KPI and the displayed status diverge.
**Why it happens:** The enum was designed for the legacy interview tables; the boolean is the M6 KPI field. Both survive into the new schema (CONTEXT Area 1 keeps both).
**How to avoid (P33 scope):** P33 only creates the columns. Document that **`compareceu` is the single source of truth for the no-show KPI**, and that `status='nao_compareceu'` is a display/lifecycle value P34's write path must keep consistent with `compareceu` (or P34 should avoid using `nao_compareceu` and rely on `compareceu` + `status='concluida'`). Record this as an Assumption for P34, not a P33 blocker. `[ASSUMED — needs confirmation at P34 planning]`
**Warning signs:** (P34) a no-show KPI number that disagrees with the count of `status='nao_compareceu'` rows.

### Pitfall 6: MCP `apply_migration` records a ledger version ≠ filename → future `db push` drift
**What goes wrong:** MCP `apply_migration` writes a `supabase_migrations.schema_migrations` version row derived from the `name` argument. If `name` ≠ the migration filename's `YYYYMMDDHHMMSS` prefix, `supabase db push --linked` later reports the file as unapplied (Phase 11 landmine: "MCP grava timestamp-version≠filename").
**Why it happens:** The apply path (MCP) and the ledger convention (filename) can disagree.
**How to avoid:** Pass `apply_migration` a `name` equal to the exact filename version (`20260716HHMMSS_agendamentos_entrevista`); after apply, `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '<ts>'` to confirm exactly one row; reconcile with an UPDATE if it drifted (P27 converged 42 drift rows with one UPDATE). `[VERIFIED: STATE.md M4/P27 note + MEMORY Phase 11 note]`
**Warning signs:** `supabase db push --linked` does not say "Remote database is up to date" after apply.

## Runtime State Inventory

> Greenfield table — not a rename/refactor. The formal 5-category inventory does not apply. One adjacency worth an explicit note:

- **Legacy interview tables (`entrevistas_online`, `entrevistas_presenciais`) and `vagas.entrevista_agendada_em`:** These pre-exist and USE the `status_entrevista`/`tipo_entrevista_avaliacao` enums (verified in `database.types.ts:1552,1679,3677`). Phase 33 does **NOT** touch them, does **NOT** migrate their data, and does **NOT** reuse them (ARCHITECTURE.md:96). The new `agendamentos_entrevista` is per-candidatura and independent; `vagas.entrevista_agendada_em` is a legacy per-vaga datetime that does not conflict. **No data migration is in scope** — this is a brand-new empty table.
- **Enums already in PROD:** `status_entrevista` (6 labels) + `tipo_entrevista_avaliacao` (2 labels) exist and are stable. The migration must `REFERENCE`/type against them (`public.status_entrevista`, `public.tipo_entrevista_avaliacao`) and must NOT `CREATE TYPE` them (would raise "type already exists"). `[VERIFIED: database.types.ts:4795-4801, 4827]`

## Code Examples

### Full migration skeleton (table + RLS + RPC in one file, no BEGIN/COMMIT)
```sql
-- Source: assembled from 20260624000001 (table) + 20260715000002 (WR-04) + 20260706110003 (DEFINER RPC)
-- File: supabase/migrations/20260716HHMMSS_agendamentos_entrevista.sql  (D-22: NO BEGIN/COMMIT)

CREATE TABLE public.agendamentos_entrevista (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id uuid NOT NULL REFERENCES public.candidaturas(id) ON DELETE CASCADE,
  vaga_id        uuid NOT NULL REFERENCES public.vagas(id),          -- denormalized (KPI convenience; NOT the auth key)
  tipo           public.tipo_entrevista_avaliacao NOT NULL,
  data_hora      timestamptz NOT NULL,
  local_ou_link  text,
  status         public.status_entrevista NOT NULL DEFAULT 'agendada',
  observacoes_rh text,                                                -- RH-only; NEVER in candidate projection
  entrevistador  text,
  compareceu     boolean,                                            -- null = pending; KPI-04 no-show source of truth
  agendado_por   uuid,                                               -- author (AGEND-01); no FK (audit actor, cf. historico.ator)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid,
  deleted_at     timestamptz
);
CREATE INDEX idx_agendamentos_candidatura ON public.agendamentos_entrevista (candidatura_id);
CREATE INDEX idx_agendamentos_vaga        ON public.agendamentos_entrevista (vaga_id);
COMMENT ON TABLE public.agendamentos_entrevista IS
  'Phase 33 / AGEND-01+SEG-03: agendamento de entrevista por candidatura. RH vaga-scoped (WR-04 via candidaturas->vagas.created_by, USING+WITH CHECK). Candidato SEM policy SELECT direta -> le APENAS via get_meu_agendamento (DEFINER allowlist, sem observacoes_rh). Cancelar=status cancelada (linha mantida); deleted_at=remocao dura. compareceu (nullable) alimenta KPI-04 no-show.';

-- RLS: exactly ONE RH policy; NO candidate SELECT/write policy (column isolation by construction).
ALTER TABLE public.agendamentos_entrevista ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rh_gerencia_agendamento ON public.agendamentos_entrevista;
CREATE POLICY rh_gerencia_agendamento ON public.agendamentos_entrevista
  FOR ALL TO authenticated
  USING ( /* WR-04 join-through-candidaturas — see Pattern 1 */ )
  WITH CHECK ( /* same predicate */ );

-- Candidate reader — DEFINER allowlist (see Pattern 2). REVOKE PUBLIC / GRANT authenticated.
CREATE OR REPLACE FUNCTION public.get_meu_agendamento(p_candidatura_id uuid) ...;

-- Optional vaga_id consistency guard (Pitfall 1 belt): BEFORE INSERT/UPDATE trigger or CHECK.
```

### Apply + gate sequence (P33-03, BLOCKING)
```
1. MCP apply_migration(name='20260716HHMMSS_agendamentos_entrevista', query=<file>)
2. SELECT version FROM supabase_migrations.schema_migrations WHERE version='20260716HHMMSS';  -- exactly 1 row
3. npm run db:types   (regen database.types.ts at repo ROOT) ; git-diff shows agendamentos_entrevista + get_meu_agendamento
4. npm run lint       (tsc --noEmit) — error count must stay <= 104 baseline
5. MCP execute_sql(<seg33_agendamento_smokes.sql>)  → confirm 8x "PASS (…)" notices (SEG-03 gate)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Role-only RH read (`role IN ('rh','administrador')`) | WR-04 vaga-scoped (admin bypass OR owns-vaga) | M4/P24 | New tables must ship vaga-scoped from day 1 — P33 does not repeat the P24/P32 "role-only leak deferred and forgotten" mistake. |
| Column hidden via REVOKE | Row-deny base table + DEFINER allowlist RPC | M4/P24 (SEC-02) | The only correct column-isolation mechanism when RH+candidate share `authenticated`. |
| Structural greps / `pg_policies` as the gate | JWT-impersonated behavioral smoke as the load-bearing gate | M4/P24 | Structural checks pass while REVOKE-no-op / OR-defeat leaks live; the smoke is authoritative. |
| `supabase db push` for PL/pgSQL | MCP `apply_migration` + ledger reconcile | M2→M6 | Bypasses 42601; requires the version-row reconciliation (Pitfall 6). |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `compareceu` (not `status='nao_compareceu'`) is the single source of truth for the KPI-04 no-show metric | Pitfall 5 | Low for P33 (both columns exist regardless); a P34 divergence would mis-count no-show. Confirm at P34 planning. |
| A2 | `agendado_por`/`updated_by` carry NO FK (plain uuid audit-actor columns, like `historico_candidatura.ator` which the smoke sets NULL) | Standard Stack / Code Example | Low. If a FK to `auth.users` is later desired, it is satisfiable (recruiter uid = `vagas.created_by`), but adds a fixture constraint. CONTEXT Area 1 specifies plain `uuid`. |
| A3 | Candidate should SEE `status='cancelada'` rows (RPC filters only `deleted_at IS NULL`) | Pattern 2 | Low — CONTEXT Area 3 says the cancelled row is kept "p/ … visibilidade do candidato." |
| A4 | Including `compareceu` in the candidate projection is acceptable (CONTEXT allowlist lists it) | Pattern 2 | Low/UX-only — showing `compareceu=false` to the candidate is a P35 UX choice, not a security issue. |

**Note:** The `vagas.created_by` FK claim (Pitfall 4) is NOT an assumption — it is `[VERIFIED]` from P32's live execution (`seg32_smokes.sql:26-29`, which shipped GREEN in PROD 2026-07-16).

## Open Questions

1. **Should `vaga_id` consistency be enforced by trigger or left as pure denormalization?**
   - What we know: The join-through predicate (Pattern 1) makes `vaga_id` authorization-irrelevant, so a spoofed value cannot cross scope. But a stale/mismatched `vaga_id` would still corrupt KPI-by-vaga.
   - What's unclear: Whether P33 adds a BEFORE INSERT/UPDATE trigger to force `vaga_id = candidatura.vaga_id`, or defers consistency to the P34 write path.
   - Recommendation: Add the small BEFORE trigger in P33 (cheap, closes the KPI-corruption vector permanently and makes the column trustworthy for P34). Include a smoke assertion that a mismatched `vaga_id` is normalized (or rejected).

2. **Single `FOR ALL` RH policy vs four per-verb policies?**
   - What we know: Both are shipped idioms; `FOR ALL` is terser.
   - What's unclear: Reviewer preference for explicit per-verb readability.
   - Recommendation: `FOR ALL` with identical USING/WITH CHECK (matches `cand_escreve_cognitivo_respostas`). Non-blocking; planner's discretion.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP `apply_migration` | Apply migration to PROD (33-03) | ✓ (standing auth) | MCP | SQL Editor paste + `migration repair` (CLAUDE.md §Migrations) |
| Supabase MCP `execute_sql` | Run the SEG-03 smoke gate (33-03) | ✓ | MCP | SQL Editor paste |
| Supabase CLI | `npm run db:types` regen at repo ROOT | ✓ `/Users/fernando/.local/bin/supabase` | installed | Hand-regen via MCP `generate_typescript_types` if CLI auth blocks |
| Node/tsc/vitest | `npm run lint` baseline check | ✓ | installed | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None blocking — every path has the SQL-Editor / MCP fallback already used in M2–M6.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` → this section is REQUIRED. This phase is **security-critical (SEG-03)**; the behavioral smoke is the load-bearing acceptance gate, above any structural check.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **SQL behavioral smoke** run via Supabase MCP `execute_sql` (the DB-security "framework" in this repo — precedent: `supabase/tests/*.sql`). Secondary: `tsc --noEmit` (type regen check) + `vitest` (no new TS logic in P33). |
| Config file | none — smokes are self-contained `.sql` run through MCP (P24/P31/P32 precedent) |
| Quick run command | MCP `execute_sql(<supabase/tests/seg33_agendamento_smokes.sql>)` → expect 8× `PASS (…)` |
| Full suite command | `npm run lint` (baseline ≤104) + `npm run test:run` (existing suite green) + the smoke above |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGEND-01 | RH (vaga owner) INSERTs an agendamento with `agendado_por`; it persists | behavioral smoke (assertion b) | MCP `execute_sql seg33_agendamento_smokes.sql` | ❌ Wave 0 |
| AGEND-01 | Table + RPC types materialize; tsc still ≤104 | build | `npm run db:types && npm run lint` | ✅ existing |
| SEG-03 | cross-recruiter READ deny (A cannot read B's agendamento) | behavioral smoke (a) | same | ❌ Wave 0 |
| SEG-03 | cross-recruiter WRITE deny incl. spoofed-`vaga_id` INSERT (Pitfall 1) | behavioral smoke (c) | same | ❌ Wave 0 |
| SEG-03 | owner allow (B reads/writes own) + admin bypass | behavioral smoke (b, d) | same | ❌ Wave 0 |
| SEG-03 | candidate DIRECT base-table read → 0 rows (no candidate SELECT policy; `observacoes_rh` unreachable) | behavioral smoke (e) | same | ❌ Wave 0 |
| SEG-03 | candidate RPC allow + column allowlist (result has NO `observacoes_rh`/`entrevistador`/`agendado_por`/`updated_by`) | behavioral smoke (f) | same | ❌ Wave 0 |
| SEG-03 | cross-candidate RPC deny (other candidate → 0 rows) | behavioral smoke (g) | same | ❌ Wave 0 |
| SEG-03 | candidate write deny (INSERT/UPDATE/DELETE → 0 rows / 42501) | behavioral smoke (h) | same | ❌ Wave 0 |

**The 8 load-bearing assertions (`seg33_agendamento_smokes.sql`) — clone `seg32_smokes.sql` structure:**
- **(a) cross-recruiter READ deny** — recruiter A (rh JWT, owns only empty vagaA) `SELECT count(*) FROM public.agendamentos_entrevista WHERE candidatura_id = <vagaB candidatura>` → **0** (WR-04 USING).
- **(b) owner READ+WRITE allow** — recruiter B (owns vagaB) INSERTs an agendamento for its candidatura and reads it back → **1**; `agendado_por` set.
- **(c) DISCRIMINATING cross-vaga INSERT with spoofed `vaga_id`** — recruiter A INSERTs `candidatura_id = <vagaB candidatura>`, `vaga_id = <A's own vagaA>` → **DENIED** (42501 / 0 rows). *This assertion fails if the direct-`vaga_id` predicate was chosen (Pitfall 1) — it is the test that proves the correct predicate.*
- **(d) admin bypass** — administrador reads any agendamento → rows returned.
- **(e) candidate DIRECT base-table deny** — owning candidate `SELECT observacoes_rh, * FROM public.agendamentos_entrevista WHERE candidatura_id = <own>` → **0 rows** (no candidate SELECT policy; proves `observacoes_rh` and every column unreachable directly).
- **(f) candidate RPC allow + allowlist** — owning candidate `SELECT * FROM public.get_meu_agendamento(<own candidatura>)` → **1** row AND the assertion checks the returned column set excludes `observacoes_rh`/`entrevistador`/`agendado_por`/`updated_by` (RETURNS TABLE signature guarantees it; assert row present + safe columns populated).
- **(g) cross-candidate RPC deny** — a DIFFERENT candidate calls `get_meu_agendamento(<other's candidatura>)` → **0 rows** (ownership join inside DEFINER).
- **(h) candidate write deny** — owning candidate attempts INSERT/UPDATE/DELETE on the base table → **denied** (no candidate write policy).

Each assertion emits `RAISE NOTICE 'PASS (x) …'` on success, `RAISE EXCEPTION` on a real leak (seg32 precedent). **GREEN gate = all 8 PASS notices present** (Pitfall 2 — count them; "no EXCEPTION" is insufficient).

### RED → GREEN harness
- **Wave 0 (33-02, RED):** author `seg33_agendamento_smokes.sql`. Pre-apply it is RED because `agendamentos_entrevista`/`get_meu_agendamento` do not exist → the fixture `DO` block's INSERTs raise `relation does not exist` → `EXCEPTION WHEN OTHERS` sets `smoke.ready='n'` → all assertions SKIP-with-NOTICE. RED here = "all SKIP (objects absent)."
- **Wave GREEN (33-03, BLOCKING):** after MCP apply + `database.types.ts` regen + ledger reconcile, run the smoke → all 8 PASS.
- **Fixture (disposable, fixed-UUID, ROLLBACK-free — real rows never deleted):** 2 distinct real 0-vaga `usuarios_rh` users = recruiter A / B (Pitfall 4 — NOT synthetic UUIDs, `vagas.created_by` has an FK); a 3rd `usuarios_rh` = admin; a real FK-bound candidato (`candidatos.user_id`) as the candidate + a second real candidato for assertion (g); disposable vagaA (created_by=A, empty) + vagaB (created_by=B) + one candidatura on vagaB. Impersonate via `set_config('request.jwt.claims', jsonb_build_object('sub',…, 'app_metadata', jsonb_build_object('role', 'rh'|'administrador'|'candidato'))::text, false)` + `SET ROLE authenticated`. Cleanup deletes only the disposable fixed-UUID rows.

### Sampling Rate
- **Per task commit (author waves):** `npm run lint` (tsc ≤104) after any `database.types.ts` change; grep the migration for the required policy/RPC shape (structural pre-check, NOT the gate).
- **Per wave merge:** re-run the full existing `npm run test:run` (no regression) — P33 adds no TS logic so this is a guard, not a target.
- **Phase gate (33-03):** the 8-assertion behavioral smoke GREEN in PROD via MCP `execute_sql` — the SEG-03 acceptance gate — plus `supabase db push --linked` reporting "up to date" (ledger reconciled).

### Wave 0 Gaps
- [ ] `supabase/tests/seg33_agendamento_smokes.sql` — the 8 assertions above (covers SEG-03 + AGEND-01 persistence). Name chosen to avoid collision with the existing `perfil_rh_seg03_smoke.sql` (a different phase's SEG-03).
- [ ] No conftest/framework install needed (SQL smokes are self-contained; MCP is available).

## Security Domain

> `security_enforcement` is not set to `false` in `.planning/config.json` → enabled. Phase 33 IS the security phase (SEG-03).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Handled upstream (JWT via Custom Access Token Hook); P33 trusts `auth.uid()`/`app_metadata.role`. |
| V3 Session Management | no | Supabase-managed. |
| V4 Access Control | **yes** | RLS WR-04 vaga-scope (RH) + DEFINER allowlist RPC (candidate) — the core of the phase. Horizontal (IDOR) isolation both directions. |
| V5 Input Validation | partial | Enum/uuid/timestamptz column types constrain inputs; `candidatura_id` is a uuid FK. No free-form injection surface (no dynamic SQL; `search_path=''`). |
| V6 Cryptography | no | No secrets/crypto in this phase. |

### Known Threat Patterns for Supabase Postgres RLS + DEFINER RPC
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Horizontal read across vagas (recruiter A reads B's schedule) | Information Disclosure | WR-04 vaga-scoped USING (Pattern 1); smoke (a). |
| Spoofed denormalized `vaga_id` at INSERT crosses scope | Elevation / Tampering | Join-through-candidaturas predicate (auth keyed on real vaga) + optional consistency trigger; smoke (c) — **Pitfall 1**. |
| Column leak of `observacoes_rh` to candidate | Information Disclosure | Base-table row-deny + DEFINER allowlist RPC (never `select('*')`, never column REVOKE); smoke (e)/(f). |
| OR-defeat: a second permissive/role-only policy re-opens the row | Information Disclosure | Exactly one RH policy, zero candidate SELECT policy; behavioral smoke tests NET effect (P24 SEC-08; P32 caught a 2nd live policy). |
| REVOKE no-op mistaken for a column hide | Information Disclosure | Use row-deny, not column REVOKE; smoke is authoritative (P24 SEC-07). |
| Cross-candidate read via the RPC (ownership join wrong) | Elevation | `ca.user_id = auth.uid()` inside the DEFINER, schema-qualified under `search_path=''`; smoke (g). |
| search_path hijack of the DEFINER function | Elevation | `SET search_path=''` + fully schema-qualified objects (Pitfall 3). |

## Sources

### Primary (HIGH confidence)
- `database.types.ts` (repo ROOT) — live-schema snapshot: confirmed `status_entrevista` (6 labels, :4795-4801) + `tipo_entrevista_avaliacao` (:4827); `agendamentos_entrevista` ABSENT; `candidaturas.vaga_id`/`candidato_id` NOT NULL + `observacoes_rh` + `deleted_at` (:829-860); legacy `entrevistas_online`/`entrevistas_presenciais` use the enums (:1552/1679).
- `supabase/migrations/20260706110003_sec02_redacao_verdict.sql:52-88` — `get_minha_redacao` DEFINER allowlist template (candidate column isolation).
- `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql:137-147` — `rh_le_historico` WR-04 join-through-candidaturas predicate (verbatim RH scope).
- `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql:94-124` — USING + WITH CHECK vaga-scope shape (redacoes RH read/update).
- `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql` — full CREATE TABLE + RLS + `FOR ALL` candidate policy template; "RLS cannot hide columns" note (:33-34).
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql:38-70` — candidate own-row ownership-join idiom.
- `supabase/tests/seg32_smokes.sql` — JWT-impersonated behavioral smoke structure + the `vagas.created_by` FK correction (:26-29) + disposable fixture (:45-113).
- `supabase/tests/oper31_rejeitar_candidatura_smokes.sql:20-37` — synthetic-vs-real recruiter fixture distinction.
- `.planning/phases/33-.../33-CONTEXT.md` — locked decisions (authoritative).
- `.planning/REQUIREMENTS.md:28,51` — AGEND-01, SEG-03 definitions + M6 invariants (:7-13).
- `.planning/STATE.md:80-92` — WR-04 / smoke / apply-mechanic decisions; tsc baseline 104.
- `.planning/research/ARCHITECTURE.md:94-121`, `FEATURES.md:64-105` — the two schema proposals CONTEXT reconciled.
- `CLAUDE.md` §Migrations (42601 workaround), §Security Rules.

### Secondary (MEDIUM confidence)
- MEMORY notes (`reference_select_star_leaks_pii`, `reference_auth_hook_rls_gap`, Phase 11 ledger note) — corroborating cross-phase lessons.

### Tertiary (LOW confidence)
- None. No WebSearch was needed — every claim is grounded in this repo's shipped artifacts.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; tooling verified present (`supabase` CLI, MCP, tsc/vitest).
- Architecture: HIGH — every pattern is a verbatim copy of a shipped, live-GREEN precedent (P24/P32).
- Pitfalls: HIGH — Pitfall 1 (spoofed `vaga_id`) reasoned from predicate semantics; Pitfalls 2/4/6 verified against P32/P27 live execution notes; Pitfall 5 flagged as a P34 assumption.
- Live schema facts: HIGH — confirmed via `database.types.ts` (the generated snapshot of PROD). Direct MCP DB introspection was unavailable to the research agent (Read/Write/Bash/Web tools only); the generated types file is the authoritative substitute and P32's live-executed smoke supplies the FK fact.

**Research date:** 2026-07-16
**Valid until:** 2026-08-15 (stable — internal schema/RLS patterns, no fast-moving external deps)

## RESEARCH COMPLETE

**Phase:** 33 - Camada de Dados do Agendamento de Entrevista
**Confidence:** HIGH

### Key Findings
- Every building block is a verbatim shipped precedent: table (`20260624000001`), RH WR-04 (`20260715000002:137-147`), candidate DEFINER allowlist (`20260706110003:52-88`), behavioral smoke (`seg32_smokes.sql`). No novel mechanism, zero new npm deps.
- **Pitfall 1 (highest-value):** the CONTEXT "both predicates safe" note is false — the direct-`vaga_id IN (…)` predicate is defeatable by a spoofed `vaga_id` at INSERT. **Use the join-through-candidaturas predicate** (auth keyed on the candidatura's real vaga); add smoke assertion (c) as the discriminating test.
- **Pitfall 4:** `vagas.created_by` HAS an FK (P32 live-verified) → the smoke fixture MUST use real 0-vaga `usuarios_rh` users, not synthetic UUIDs (the CONTEXT discretion note is stale on this point).
- Live-schema verified via `database.types.ts`: both enums exist with the exact CONTEXT labels; `agendamentos_entrevista` is absent (greenfield); `candidaturas` FK columns + `observacoes_rh` + `deleted_at` present.
- SEG-03 gate = an 8-assertion JWT-impersonated smoke whose GREEN criterion is "count 8 PASS notices," not "no exception" (Pitfall 2). Column isolation proven by base-table row-deny (e) + DEFINER allowlist (f).

### File Created
`.planning/phases/33-camada-de-dados-do-agendamento-de-entrevista/33-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Zero new deps; tooling verified present. |
| Architecture | HIGH | Verbatim copies of P24/P32 live-GREEN artifacts. |
| Pitfalls | HIGH | Reasoned from predicate semantics + P32/P27 live-execution notes. |
| Validation | HIGH | seg32 smoke structure is directly reusable; 8 assertions specified. |

### Open Questions
1. Enforce `vaga_id` consistency via a BEFORE trigger (recommended) vs. defer to P34? (Open Q1)
2. `compareceu` vs `status='nao_compareceu'` no-show source of truth — confirm at P34 (Assumption A1, Pitfall 5).

### Ready for Planning
Research complete. The planner can author 33-01 (table + soft-delete), 33-02 (WR-04 bidirectional RLS + DEFINER RPC + RED smoke), and 33-03 (BLOCKING: MCP apply + types regen + ledger reconcile + smoke GREEN gate), planning to the CONTEXT decisions with the join-through predicate and the real-user fixture.
