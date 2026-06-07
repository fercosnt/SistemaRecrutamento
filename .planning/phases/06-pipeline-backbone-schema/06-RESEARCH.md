# Phase 6: Pipeline Backbone & Schema - Research

**Researched:** 2026-06-07
**Domain:** PostgreSQL / Supabase schema migration (live enum cutover + PL/pgSQL trigger + RLS)
**Confidence:** HIGH (live schema verified against `database.types.ts` + migrations; cutover mechanics CITED from PostgreSQL/Supabase docs)

## Summary

Phase 6 builds the auditable 6-stage pipeline as the DB source of truth for M2. It performs an **in-place enum cutover on live `candidaturas` data**, creates four new tables (`historico_candidatura`, `decisao_final`, `bias_audit_log`, plus the trigger function `avancar_etapa()`), and applies RLS to 100% of them. The single highest-risk operation is the enum swap on a column that has a `DEFAULT` and is referenced by live rows — this must follow the exact drop-default → alter-type-USING → re-add-default → drop-old → rename sequence, and it runs as a **human-action checkpoint in the Supabase SQL Editor** because of the project's documented SQLSTATE 42601 workaround (D-22 / CLAUDE.md §Commands).

I verified every flagged mismatch against the live codebase. **Both flags in CONTEXT.md are confirmed real:** (1) the PRD §8.3 RLS template writes `candidatos.auth_user_id` but the live column is `user_id`; (2) the PRD writes role `'admin'` but the live JWT hook emits `'administrador'`. Using the PRD verbatim would silently break all RH/admin reads. I also discovered two facts CONTEXT did not anticipate: (a) the **legacy `etapa_processo` enum values differ from the success-criteria assumption** — there is no `inscricao` or `avaliacao_assincrona` in the legacy enum (those are net-new in v2); and (b) a **pre-existing legacy `historico_acoes` table already exists** (Figma-Make era) overlapping conceptually with the planned `historico_candidatura` — the planner must decide coexist-vs-reuse.

**Primary recommendation:** Author each PL/pgSQL artifact (enum cutover, `avancar_etapa()` trigger, RLS bundle) as its own migration file WITHOUT `BEGIN/COMMIT` wrappers, applied via the SQL-Editor + `migration repair --status applied` workaround. Declare the v2 enum in pipeline order so regression is computable by native enum `<`/`>` comparison. Make `avancar_etapa()` a plain (NOT SECURITY DEFINER) `BEFORE UPDATE` trigger so `auth.uid()` resolves to the RH user for client UPDATEs and to NULL for service_role/EF writes — which is exactly the D-09 ator-capture design.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Escopo de schema (FUNIL-01..04, LGPD-02)**
- **D-01: Backbone-only.** Phase 6 cria SÓ: enum `etapa_processo` v2 (6+2), `status_candidatura` v2 (sem mudança grande), `historico_candidatura`, `bias_audit_log`, `decisao_final`, trigger `avancar_etapa()`, e RLS de todas essas tabelas. Tabelas de feature → fases 7-15.
- **D-02: `decisao_final` criada COMPLETA agora** — todos constraints do §8.2: `por_usuario uuid NOT NULL`, `justificativa text NOT NULL CHECK length >= 50`, `decisao enum (aprovado/rejeitado/em_espera)`, FKs, `RLS INSERT WITH CHECK false`. Feature de Decisão Final (Phase 15) só escreve EF/UI por cima. (success criterion #5 exige guardrail auditável JÁ na Phase 6.)

**Cutover do enum legado (FUNIL-01)**
- **D-03: In-place `ALTER COLUMN ... USING`**, não rebuild. Sequência: `CREATE TYPE etapa_processo_v2` → `ALTER TABLE candidaturas ALTER COLUMN etapa_atual TYPE etapa_processo_v2 USING (<mapping>)` → ajustar default → `DROP TYPE` legado → rename v2 → `etapa_processo`. Mantém tabela, FKs, índices e RLS.
- **D-04: Backup defensivo em schema dedicado no próprio DB** ANTES do drop: `CREATE TABLE <schema_backup>.candidaturas_pre_funil AS SELECT * FROM candidaturas` (schema `backup_m2` ou similar — naming a confirmar no plan). Retenção decidida depois.
- **D-05: Mapeamento das linhas vivas:** `triagem→triagem`, `aprovado→aprovado`, `rejeitado→rejeitado`. Valores legados intermediários órfãos colapsam para `triagem` com linha de log em `historico_candidatura`. Mapping é defensivo (FUNIL-01 declara enum legado nunca exercido além de triagem).

**Política de transição `avancar_etapa()` (FUNIL-02)**
- **D-06: Avanço pra frente é livre, inclusive pulando etapas.** Regressão (voltar pra etapa anterior) exige justificativa preenchida — bloqueada se vazia. Terminais (`aprovado`/`rejeitado`) setáveis de qualquer etapa.
- **D-07: Justificativa + critério textual chegam ao trigger via colunas companheiras na própria `candidaturas`** (ex. `etapa_motivo`/`etapa_justificativa` — naming a confirmar). Mesmo `UPDATE` seta `etapa_atual` + coluna de justificativa; trigger `BEFORE UPDATE` lê `NEW.<justificativa>`, bloqueia regressão se vazia, copia texto para `historico_candidatura`. Atômico, sem GUC/sessão.

**Escrita da transição + captura do ator (FUNIL-03, FUNIL-04, LGPD-02)**
- **D-08: Avanço de etapa = `UPDATE candidaturas` direto do client (supabase-js), RLS-gated.** RLS permite UPDATE só para role `rh`/`administrador`; trigger valida transição e grava `historico`. `ator = auth.uid()`. **`decisao_final` continua EF-only** (`WITH CHECK false`).
- **D-09: `historico_candidatura.ator` é NULL-able.** Ação humana → `ator = auth.uid()`. Ação do sistema (auto-rejeição/EF service_role onde `auth.uid()` é null) → `ator = NULL` + `auto_rejeitado = true`. **Guardrail zero-auto-rejeição (LGPD-02) vive SÓ em `decisao_final.por_usuario NOT NULL`.** Distinção limpa: "transição de pipeline" (audit-only, ator pode ser sistema) vs "decisão final" (sempre humana, NOT NULL).

### Claude's Discretion
- Naming exato das colunas companheiras (`etapa_motivo`/`etapa_justificativa`), do schema de backup (`backup_m2.*`), e dos tipos enum v2 — planner escolhe seguindo convenção pt-BR snake_case.
- Índices em `historico_candidatura` (provável `candidatura_id` + `criado_em`) e em `decisao_final`.
- Mecânica fina do mapping de órfãos no `USING` (CASE expression) — planner resolve com base no dado real.

### Deferred Ideas (OUT OF SCOPE)
- **Tabelas de feature do M2** (`analise_candidato_vaga`, `scores_candidato`, `redacoes_candidato`, `entrevistas_candidato`, `comparativo_solicitado`, `pergunta_opcao_metadata`, `vaga.testes_aplicaveis`, `vaga.pesos_avaliacao`, `devolutivas_candidato`, `bigfive/cognitivo_respostas_em_progresso`) — cada uma na fase da sua feature (7-15).
- **EF `avancar-etapa` dedicada** — D-08 escolheu UPDATE direto RLS-gated.
- **Retenção/anonimização do schema de backup** (`backup_m2.*`) — TTL/purga decidida depois.
- **MS Bookings / `agendamentos_entrevista`** — fora do M2 v1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FUNIL-01 | Migration controlada deprecando enum `etapa_processo` legado (10 valores) → novo enum 6 etapas + 2 terminais, com backup antes do drop [§3.1, §8.1 mig 01/02/03] | §"Enum Cutover Mechanics" + §"Runtime State Inventory" (live enum verified — values differ from success-criteria assumption); cutover SQL sequence CITED from PostgreSQL ALTER TYPE docs |
| FUNIL-02 | Trigger PL/pgSQL `avancar_etapa()` em `UPDATE candidaturas` faz auto-advance e bloqueia regressão sem justificativa [§3.1, §8.1 mig 15] | §"avancar_etapa() Trigger Pattern" — declare enum in pipeline order so `<`/`>` computes regression; plain (non-SECURITY-DEFINER) BEFORE UPDATE so auth.uid() resolves |
| FUNIL-03 | `historico_candidatura` registra trilha completa de toda transição (incl. `auto_rejeitado`, critério textual, timestamp, ator) [RF-04, §8.1 mig 13] | §"historico_candidatura schema" + D-09 ator NULL-able; legacy `historico_acoes` coexistence note |
| FUNIL-04 | RLS em 100% das tabelas novas (candidato lê só próprio; RH/admin via JWT `app_metadata`) [RNF-04, §8.3] | §"RLS Patterns" — CORRECTED template: `user_id` not `auth_user_id`; `'administrador'` not `'admin'`; read via `(auth.jwt() -> 'app_metadata' ->> 'role')` |
| LGPD-02 | Guardrail zero auto-rejeições; 100% `decisao_final` têm `por_usuario IS NOT NULL` (RLS + SQL audit) [RNF-07a] | §"decisao_final structural guardrail" — `por_usuario uuid NOT NULL` + `WITH CHECK false` on client INSERT; SQL audit query provided |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The planner MUST honor these — they have locked-decision authority:

- **db push workaround SQLSTATE 42601 (MANDATORY):** Migrations with `CREATE FUNCTION` or `DO $$...$$` blocks combined with adjacent `COMMENT`/`REVOKE`/`GRANT` fail via `supabase db push --linked` in the transaction pooler. Workaround: (1) paste SQL into Supabase SQL Editor → run manually; (2) `supabase migration repair --status applied <version>`; (3) `supabase db push --linked` must report "Remote database is up to date"; (4) remove `BEGIN;...COMMIT;` wrappers and add inline note. **Recurs in Phase 6 for the enum cutover and the `avancar_etapa()` trigger.** [CITED: CLAUDE.md §Commands]
- **RLS em 100% das tabelas com dados de usuário.** [CITED: CLAUDE.md §Security Rules]
- **NUNCA `supabaseAdmin`/service_role no client-side.** Privileged ops → Edge Functions. [CITED: CLAUDE.md §Security Rules]
- **Sistema NUNCA rejeita candidato automaticamente por score (RNF-07a → LGPD-02).** [CITED: CLAUDE.md §Security Rules]
- **Enums DB:** snake_case pt-BR (`status_vaga`, `etapa_processo`). [CITED: CLAUDE.md §Key Conventions]
- **`database.types.ts` é gerado** (`npm run db:types`) — NUNCA editar à mão; regenerar após migrations. [CITED: CLAUDE.md §Architecture]
- **Migration naming:** `YYYYMMDDHHMMSS_descricao.sql`. [VERIFIED: migrations dir]
- **Commits bloqueados pelo hook tsc** (~292-296 baseline): convenção = `git -c core.hooksPath=/dev/null`; Fernando commita no terminal dele. [CITED: MEMORY + STATE.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pipeline state (etapa_atual) | Database (enum + column) | — | Source of truth per phase goal; enum constrains valid states structurally |
| Stage-advance validation + regression block | Database (`avancar_etapa()` BEFORE UPDATE trigger) | — | Must be atomic/transactional with the write; can't live in client (bypassable) or EF (D-08 chose direct UPDATE) |
| Audit trail write | Database (trigger → `historico_candidatura`) | — | Must be unbypassable; same transaction as the state change |
| Actor capture (ator) | Database (`auth.uid()` in trigger context) | — | Resolves from JWT in RLS/client context; NULL for service_role = system action (D-09) |
| Access control (who reads/writes) | Database (RLS policies reading JWT app_metadata.role) | API/Edge Function (decisao_final write) | RLS is the enforcement boundary; `decisao_final` INSERT is EF-only (`WITH CHECK false`) |
| Zero-auto-rejection guardrail | Database (`decisao_final.por_usuario NOT NULL` + RLS) | SQL audit | Structural constraint = unfalsifiable; auditable by SQL per success criterion #5 |
| Cutover of live data | Database (one-time migration in SQL Editor) | Human checkpoint | Live-data mutation; runs via D-22 workaround as human-action task |

## Standard Stack

This is a pure DB-schema phase. "Stack" = PostgreSQL native features + Supabase CLI + the established project migration conventions. **No new external packages are installed.**

### Core
| Tool/Feature | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL enum types | PG 15+ (Supabase hosted) | `etapa_processo` v2 / `status_candidatura` / `decisao` | Native, ordered, comparable with `<`/`>`; constrains states structurally [CITED: postgresql.org/docs/current/datatype-enum.html] |
| `ALTER TYPE` / `ALTER COLUMN ... TYPE ... USING` | PG native | In-place enum cutover (D-03) | Canonical column-type migration without table rebuild [CITED: postgresql.org/docs/current/sql-altertype.html] |
| PL/pgSQL `BEFORE UPDATE` trigger | PG native | `avancar_etapa()` (FUNIL-02) | Atomic, unbypassable transition validation + audit write |
| Supabase RLS policies | Supabase | FUNIL-04 access control | Project standard (RLS on 100% of tables per CLAUDE.md) |
| `auth.uid()` / `auth.jwt()` | Supabase | Actor capture + role read in RLS/trigger | Established M1 pattern [VERIFIED: 20260420000002_unified_auth_role.sql] |
| Supabase CLI | (project pinned) | `migration repair`, `db push`, `db:types` | Project tooling [CITED: CLAUDE.md] |

### Supporting
| Feature | Purpose | When to Use |
|---------|---------|-------------|
| Dedicated backup schema (`backup_m2`) | Defensive snapshot before drop (D-04) | One-time, before the enum cutover |
| `CHECK` constraints | `justificativa length >= 50` (decisao_final), `por_usuario NOT NULL` | Structural guardrail enforcement |
| Partial/composite indexes | `historico_candidatura(candidatura_id, criado_em)` | Audit-query performance (Claude's discretion) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-place `ALTER COLUMN USING` (D-03) | Add new column + backfill + drop old | More steps, more index/FK churn; D-03 locked in-place |
| Plain BEFORE UPDATE trigger | SECURITY DEFINER trigger | SECURITY DEFINER would run as owner and break `auth.uid()` actor capture — REJECT (see Pitfall 4) |
| Companion columns for justificativa (D-07) | Session GUC / `set_config` | GUC is fragile, non-atomic, leaks across pooled connections — D-07 correctly rejected it |
| Reuse legacy `historico_acoes` | New `historico_candidatura` | D-01 locks new table; see "Pre-existing legacy table" note for coexistence rationale |

**Installation:** None. No npm/pip/cargo packages. (`## Package Legitimacy Audit` therefore omitted — no external packages installed this phase.)

## Runtime State Inventory

> This is a **live enum cutover on production candidatura data** — runtime state matters as much as files.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | LIVE `candidaturas.etapa_atual` rows. The M1 `submit_candidatura_atomic` RPC writes `etapa_atual='triagem'` + `status='aguardando_resposta'` on every submission [VERIFIED: 20260425000003_submit_candidatura_rpc.sql]. UAT 04-08 confirms ≥1 real candidatura exists (`candidato_id d8ef9db1-...`, etapa `triagem`). **Exact live row count + etapa distribution NOT yet queried — planner/executor MUST run the discovery SELECT in §"Pre-cutover discovery" against project `isljnozzlvckrgjjbjwp` before writing the USING CASE.** | Data migration (the USING-cast cutover) + Wave-0 discovery query |
| **Live service config** | None. No n8n/Datadog/Tailscale config embeds `etapa_processo` values. The Custom Access Token Hook is enabled in Dashboard (Auth → Hooks) but does NOT reference etapa values — unaffected by cutover. | None — verified by reading the hook (it reads role only). |
| **OS-registered state** | None. No cron/Task Scheduler/pm2 process references etapa values. | None. |
| **Secrets/env vars** | None. `VITE_SUPABASE_URL=https://isljnozzlvckrgjjbjwp.supabase.co` and keys are unaffected by schema changes. | None. |
| **Build artifacts** | `database.types.ts` (generated) currently encodes the **legacy 10-value enum** + legacy `status_candidatura`. After migrations, run `npm run db:types` to regenerate. The TS app + EFs that reference `etapa_processo` literals will see new types. | Regenerate types (`npm run db:types`) + grep for legacy enum literals in src/EFs (see below). |

**Code that references the legacy enum (must be audited before/after cutover):**
- `submit_candidatura_atomic` RPC casts `'triagem'::public.etapa_processo` — `triagem` survives the cutover (D-05), so the cast stays valid, BUT after rename the type name `public.etapa_processo` is preserved (D-03 renames v2 back to `etapa_processo`), so the RPC keeps compiling. **Verify the rename restores the canonical name `etapa_processo` so this RPC needs no edit.** [VERIFIED: RPC body]
- `candidaturas` table has legacy companion columns `analise_ia_disc`, `analise_ia_raven`, `analise_ia_cultura`, `data_disc_enviado`, `data_raven_enviado`, `data_cultura_enviado` etc. [VERIFIED: database.types.ts]. These are NOT enum-typed and are out of scope for FUNIL-01 (deferred cleanup); leave them.

**The canonical question — after every file is updated, what runtime state still holds the old enum?** Only the live `candidaturas` rows (handled by the USING cast) and the generated `database.types.ts` (handled by `npm run db:types`). No external/OS/service state. **Confirmed by reading all migrations + database.types.ts.**

## Architecture Patterns

### System Architecture Diagram

```
                         RH/admin client (supabase-js)
                                   │ UPDATE candidaturas
                                   │ SET etapa_atual = 'X',
                                   │     etapa_justificativa = '...'   (companion column, D-07)
                                   ▼
                    ┌──────────────────────────────────┐
                    │  RLS: WITH CHECK / USING           │  ← role ∈ ('rh','administrador')
                    │  (auth.jwt()->'app_metadata'       │     read from JWT (FUNIL-04)
                    │   ->>'role')                       │
                    └──────────────┬─────────────────────┘
                                   │ row passes RLS
                                   ▼
                    ┌──────────────────────────────────┐
                    │  BEFORE UPDATE TRIGGER             │
                    │  avancar_etapa()  (PL/pgSQL,       │
                    │  NOT security definer)             │
                    │                                    │
                    │  1. compute direction:             │
                    │     NEW.etapa_atual <             │
                    │     OLD.etapa_atual ? (regression) │ ← enum ordinal compare (declaration order)
                    │  2. if regression AND               │
                    │     NEW.etapa_justificativa empty   │
                    │       → RAISE EXCEPTION (block)     │  ← success criterion #2
                    │  3. forward / skip / terminal: OK   │  ← D-06
                    │  4. ator := auth.uid()              │  ← NULL for service_role (D-09)
                    └──────────────┬─────────────────────┘
                                   │ same transaction
              ┌────────────────────┴───────────────────────┐
              ▼                                             ▼
   candidaturas row updated                    INSERT historico_candidatura
   (etapa_atual = NEW)                          (candidatura_id, etapa_de, etapa_para,
                                                 criterio_texto, ator, auto_rejeitado,
                                                 criado_em)   ← FUNIL-03 audit trail


        ─────────────── SEPARATE PATH (decisao_final, EF-only) ───────────────

   RH client ──HTTP──▶ Edge Function (two-client: supabaseUser verifies, supabaseAdmin writes)
                            │ INSERT decisao_final
                            ▼
                    ┌──────────────────────────────────┐
                    │ RLS client INSERT: WITH CHECK false│ ← blocks ALL client INSERT (D-08)
                    │ CHECK por_usuario IS NOT NULL      │ ← LGPD-02 structural guardrail
                    │ CHECK length(justificativa) >= 50  │
                    └────────────────────────────────────┘
```

### Recommended Migration File Structure

Each PL/pgSQL artifact gets its own file (D-01 minimal blast-radius + per-file 42601 workaround). Suggested ordering (timestamps `2026060700000X_*`):

```
supabase/migrations/
├── ..._etapa_processo_v2_cutover.sql      # D-03/D-04/D-05: backup + CREATE TYPE v2 + ALTER USING + rename  [42601 WORKAROUND]
├── ..._status_candidatura_review.sql      # D-01: §8.1 mig 03 (no big change — confirm against live)
├── ..._historico_candidatura.sql          # FUNIL-03 table + indexes
├── ..._decisao_final.sql                  # D-02: complete table + CHECK constraints
├── ..._bias_audit_log.sql                 # LGPD-03 dependency table (schema only this phase)
├── ..._avancar_etapa_trigger.sql          # FUNIL-02 PL/pgSQL function + trigger          [42601 WORKAROUND]
└── ..._rls_policies_m2_backbone.sql       # FUNIL-04 RLS on all new tables + candidaturas UPDATE policy [maybe 42601]
```

> Naming is illustrative; planner picks final pt-BR snake_case names. The §8.1 PRD numbers map: mig 01/02/03 = enum/status, 12 = decisao_final, 13 = historico, 14 = bias_audit, 15 = trigger, 16 = RLS. **Skip §8.1 migs 04-11 — those are deferred feature tables (D-01).**

### Pattern 1: In-place enum cutover with a DEFAULT (D-03)
**What:** Swap `candidaturas.etapa_atual` from legacy enum to v2 without rebuilding the table.
**When to use:** The locked D-03 path. Runs in SQL Editor (42601 workaround).
**Exact sequence** (the DEFAULT-handling order is the critical, error-prone part):

```sql
-- Source: postgresql.org/docs/current/sql-altertype.html + sql-altercolumn semantics
-- 0. Defensive backup BEFORE anything (D-04)
CREATE SCHEMA IF NOT EXISTS backup_m2;
CREATE TABLE backup_m2.candidaturas_pre_funil AS
  SELECT * FROM public.candidaturas;

-- 1. Create the v2 enum IN PIPELINE ORDER (so < / > computes regression — Pattern 2)
CREATE TYPE public.etapa_processo_v2 AS ENUM (
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
  'aprovado',
  'rejeitado'
);

-- 2. DROP the column DEFAULT first (a default of the old type blocks the type change)
ALTER TABLE public.candidaturas ALTER COLUMN etapa_atual DROP DEFAULT;

-- 3. Convert the column, mapping live values through text (D-05 defensive CASE)
ALTER TABLE public.candidaturas
  ALTER COLUMN etapa_atual TYPE public.etapa_processo_v2
  USING (
    CASE etapa_atual::text
      WHEN 'triagem'               THEN 'triagem'
      WHEN 'aprovado'              THEN 'aprovado'
      WHEN 'rejeitado'            THEN 'rejeitado'
      WHEN 'entrevista_online'     THEN 'entrevista_online'      -- legacy name == v2 name
      WHEN 'entrevista_presencial' THEN 'entrevista_presencial'  -- legacy name == v2 name
      -- orphan legacy values collapse to 'triagem' (D-05 defensive; expected zero rows)
      WHEN 'bigfive'               THEN 'triagem'
      WHEN 'disc'                  THEN 'triagem'
      WHEN 'raven'                 THEN 'triagem'
      WHEN 'cultura'               THEN 'triagem'
      WHEN 'avaliacao_final'       THEN 'triagem'
      ELSE 'triagem'
    END::public.etapa_processo_v2
  );

-- 4. Re-add the DEFAULT (new type)
ALTER TABLE public.candidaturas ALTER COLUMN etapa_atual SET DEFAULT 'triagem';

-- 5. Drop the legacy type, then rename v2 to the canonical name
DROP TYPE public.etapa_processo;
ALTER TYPE public.etapa_processo_v2 RENAME TO etapa_processo;
```

**Pitfall flagged inline:** any orphan legacy row collapsed to `triagem` in step 3 must get a `historico_candidatura` audit line (D-05) — do that AFTER the `historico_candidatura` table exists, i.e. order the migrations so the table is created before (or in the same SQL-Editor session as) the orphan-logging. Since the expected orphan count is zero (FUNIL-01: legacy enum "nunca exercido além de triagem"), the discovery query (below) tells the executor whether any logging is even needed.

### Pattern 2: Enum declaration order = computable regression (FUNIL-02)
**What:** PostgreSQL enums are ordered by declaration order; `<`/`>` compare by that order [CITED: postgresql.org/docs/current/datatype-enum.html].
**When to use:** Declare v2 in pipeline order (inscricao..decisao_final) so the trigger computes regression with a plain comparison.
**Subtlety:** the two terminals (`aprovado`, `rejeitado`) are declared LAST, so they sort as "greater" than every pipeline stage. That is fine for D-06 (terminals reachable from any stage = always "forward"). The trigger logic should treat terminals as a special always-allowed case, then for non-terminal targets use `NEW.etapa_atual < OLD.etapa_atual` to detect regression:

```sql
-- Source: PostgreSQL enum ordering semantics (declaration order)
IF NEW.etapa_atual IN ('aprovado','rejeitado') THEN
  -- terminal: always allowed from any stage (D-06)
  NULL;
ELSIF NEW.etapa_atual < OLD.etapa_atual THEN
  -- regression: require justificativa (success criterion #2)
  IF NEW.etapa_justificativa IS NULL OR btrim(NEW.etapa_justificativa) = '' THEN
    RAISE EXCEPTION 'Regressão de etapa exige justificativa preenchida';
  END IF;
END IF;
-- forward / skip-ahead: allowed freely (D-06)
```

### Pattern 3: Actor capture in a plain trigger (D-09)
**What:** `auth.uid()` inside a **non-SECURITY-DEFINER** trigger returns the calling JWT's sub for client UPDATEs, and NULL when no JWT is present (service_role / EF writes).
**When to use:** `avancar_etapa()` actor capture. Do NOT mark the function `SECURITY DEFINER` (that would change the execution role and defeat actor capture — Pitfall 4).

```sql
-- Source: Supabase RLS/auth context docs + D-09
v_ator uuid := auth.uid();  -- NULL for service_role/system writes
INSERT INTO public.historico_candidatura
  (candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em)
VALUES
  (NEW.id, OLD.etapa_atual, NEW.etapa_atual, NEW.etapa_justificativa,
   v_ator, (v_ator IS NULL), now());
```

### Pattern 4: decisao_final structural guardrail (D-02 / LGPD-02)
```sql
-- por_usuario NOT NULL is the guardrail (success criterion #5)
CREATE TABLE public.decisao_final (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id  uuid NOT NULL UNIQUE REFERENCES public.candidaturas(id),
  decisao         public.decisao_final_resultado NOT NULL,  -- enum aprovado/rejeitado/em_espera
  justificativa   text NOT NULL CHECK (length(justificativa) >= 50),
  por_usuario     uuid NOT NULL REFERENCES auth.users(id),  -- NEVER null (LGPD-02)
  em              timestamptz NOT NULL DEFAULT now(),
  explicacao_solicitada_em timestamptz,
  revisao_solicitada_em    timestamptz,
  revisao_resultado        text
);
-- Client INSERT blocked entirely; only EF (service_role bypasses RLS) writes (D-08)
CREATE POLICY decisao_final_no_client_insert ON public.decisao_final
  FOR INSERT WITH CHECK (false);
```

### Anti-Patterns to Avoid
- **`SECURITY DEFINER` on `avancar_etapa()`** — breaks actor capture; the trigger must run in the caller's context (Pitfall 4).
- **Session GUC / `set_config` to pass justificativa** — D-07 correctly rejected; non-atomic, leaks across pooled connections. Use companion columns.
- **`BEGIN;...COMMIT;` wrappers in migration files** — triggers SQLSTATE 42601 in the transaction pooler (D-22). The CLI wraps each migration in its own transaction.
- **Copying PRD §8.3 verbatim** — it uses `auth_user_id` (wrong) and `'admin'` (wrong). See RLS section.
- **`ALTER TYPE ... ADD VALUE` to "extend" the legacy enum instead of replacing it** — would leave the dead legacy values in place, violating FUNIL-01's "deprecate legacy" intent and breaking the clean ordinal ordering needed by Pattern 2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Valid-state enforcement | App-level string validation of etapa | PG enum type | Enum makes invalid states unrepresentable at the DB level |
| Regression detection | Manual position lookup table | Native enum `<`/`>` (declaration order) | Built into PG; no maintenance |
| Atomic state-change + audit | Two separate writes from client | BEFORE UPDATE trigger (same txn) | Client-side two-step is non-atomic and bypassable |
| Actor identity | Pass user_id from client | `auth.uid()` in trigger | Client-passed IDs are spoofable; auth.uid() is from the verified JWT |
| Zero-auto-rejection guarantee | App check "is there a human?" | `por_usuario NOT NULL` + `WITH CHECK false` | Structural constraint is unfalsifiable + SQL-auditable (success criterion #5) |
| Access control | App-layer role checks | RLS reading JWT app_metadata.role | Project standard; unbypassable; M1 precedent |

**Key insight:** In this phase the database IS the application logic. Every guardrail the requirements demand (regression block, audit trail, zero-auto-rejection) is enforced structurally in Postgres so that no client, EF, or future feature can bypass it. Hand-rolling any of these in TypeScript would move the guardrail outside the trust boundary.

## Common Pitfalls

### Pitfall 1: PRD §8.3 RLS template uses the wrong column name and wrong role value
**What goes wrong:** Copying `WHERE auth_user_id = auth.uid()` and `role IN ('rh','admin')` from PRD §8.3 produces RLS that silently matches nothing — RH/admin read zero rows, candidato reads zero rows.
**Why it happens:** PRD §8.3 is a stale template authored before the M1 schema was finalized.
**How to avoid:** Use the LIVE facts (both VERIFIED below):
- `candidatos.user_id` is the auth FK (NOT `auth_user_id`) [VERIFIED: database.types.ts L332]
- `usuarios_rh.user_id` is the auth FK [VERIFIED: database.types.ts L2071]
- JWT role values are `'rh'`, `'administrador'`, `'candidato'` (NOT `'admin'`) [VERIFIED: 20260420000002_unified_auth_role.sql L52-56]

**Corrected RLS template:**
```sql
-- candidato lê só própria candidatura
CREATE POLICY candidato_le_propria_candidatura ON public.candidaturas
  FOR SELECT USING (
    candidato_id IN (SELECT id FROM public.candidatos WHERE user_id = auth.uid())
  );
-- RH/admin lê/atualiza
CREATE POLICY rh_le_candidaturas ON public.candidaturas
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('rh','administrador')
  );
CREATE POLICY rh_avanca_etapa ON public.candidaturas
  FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('rh','administrador'))
            WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('rh','administrador'));
-- bias_audit_log: só administrador
CREATE POLICY administrador_le_bias_audit ON public.bias_audit_log
  FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'administrador');
```
**Warning signs:** smoke test where an RH user gets 0 candidaturas back.

### Pitfall 2: SQLSTATE 42601 on db push (the project's recurring trap)
**What goes wrong:** `supabase db push --linked` raises "cannot insert multiple commands into a prepared statement (42601)" for the enum-cutover and trigger migrations.
**Why it happens:** PL/pgSQL `$$...$$` (or `DO $$`) + adjacent `COMMENT`/`GRANT`/`REVOKE` confuses the transaction pooler's prepared-statement parser; an outer `BEGIN/COMMIT` is the trigger.
**How to avoid:** Apply via the D-22 workaround — SQL Editor manual run → `supabase migration repair --status applied <version>` → confirm `db push` says "up to date" → remove `BEGIN/COMMIT` from the file + add the inline note. Phase 4 did this exactly for migrations 03/04 [VERIFIED: STATE.md 04-01 ledger; 20260425000003 inline note]. **The planner must model the enum cutover and the trigger as `autonomous:false` human-action checkpoint tasks** (see "Human-action checkpoint shape" below).
**Warning signs:** the error string above at push time.

### Pitfall 3: enum cutover order — DEFAULT not dropped first
**What goes wrong:** `ALTER COLUMN ... TYPE` fails with "default for column cannot be cast automatically to type" because the live `DEFAULT 'triagem'::etapa_processo` is still bound.
**Why it happens:** PG won't auto-cast a DEFAULT during a type change.
**How to avoid:** DROP DEFAULT → ALTER TYPE USING → SET DEFAULT (new type), in that order (Pattern 1). [CITED: postgresql.org ALTER TYPE / munderwood.ca]
**Warning signs:** the "cannot be cast automatically" error.

### Pitfall 4: SECURITY DEFINER nullifies actor capture
**What goes wrong:** marking `avancar_etapa()` SECURITY DEFINER makes `auth.uid()` resolve to the function-owner context (or NULL) for ALL writes, so RH actions get logged with the wrong/empty ator.
**Why it happens:** SECURITY DEFINER changes the execution role; the auth GUC the `auth.uid()` helper reads is tied to the request role/JWT context.
**How to avoid:** keep `avancar_etapa()` as a plain (SECURITY INVOKER, the default) trigger. RLS already gates WHO can UPDATE; the trigger only validates+audits. [CITED: Supabase RLS/auth docs]
**Warning signs:** `historico_candidatura.ator` NULL for legitimate RH UPDATEs.

### Pitfall 5: pre-existing legacy `historico_acoes` table collision/confusion
**What goes wrong:** A legacy `historico_acoes` table already exists (Figma-Make era) with `candidatura_id`, `tipo_acao` (enum `tipo_acao_historico` incl. `'etapa_avancada'`, `'candidato_rejeitado'`), `usuario_id` (FK `usuarios_rh.id`, NOT auth.users), `descricao`, `metadata` [VERIFIED: database.types.ts L969-1020]. The planner could accidentally write to it, or duplicate its purpose.
**Why it happens:** It overlaps conceptually with `historico_candidatura`.
**How to avoid:** D-01 locks a NEW `historico_candidatura` table. Key differences the new table needs that the legacy one lacks: explicit `etapa_de`/`etapa_para` enum columns, `auto_rejeitado boolean`, `ator` FK to `auth.users` (legacy FKs `usuarios_rh.id`). Recommend: leave `historico_acoes` untouched (out of scope), create `historico_candidatura` fresh. Document the coexistence in the migration comment so future readers don't conflate them.
**Warning signs:** trigger inserting into the wrong table; FK type mismatch (auth.users vs usuarios_rh).

### Pitfall 6: legacy enum values differ from the success-criteria text
**What goes wrong:** The roadmap/success-criteria lists the v2 enum (`inscricao`...`decisao_final`) but the LEGACY enum is a different set. Assuming the legacy enum already contains `inscricao`/`avaliacao_assincrona` and trying to `ALTER ... RENAME VALUE` would fail.
**Why it happens:** v2 introduces brand-new stage names.
**How to avoid:** Use the VERIFIED legacy value set in the USING CASE. Legacy enum (10 values): `triagem, bigfive, disc, entrevista_online, raven, cultura, entrevista_presencial, aprovado, rejeitado, avaliacao_final` [VERIFIED: database.types.ts L2935-2945]. Only `triagem, entrevista_online, entrevista_presencial, aprovado, rejeitado` have name-identical v2 targets; the rest collapse to `triagem` (D-05).
**Warning signs:** "value X is not present in enum" during cutover.

## Code Examples

### Pre-cutover discovery (Wave 0 — run in SQL Editor before writing the USING CASE)
```sql
-- Source: derived from D-05 + Runtime State Inventory; run against isljnozzlvckrgjjbjwp
-- 1. How many live rows, and what etapa distribution? (tells you if orphan logging is needed)
SELECT etapa_atual, count(*) FROM public.candidaturas GROUP BY 1 ORDER BY 2 DESC;
-- 2. Confirm the column default currently bound (must be dropped first)
SELECT column_default FROM information_schema.columns
 WHERE table_schema='public' AND table_name='candidaturas' AND column_name='etapa_atual';
-- 3. Confirm none of the target new tables already exist
SELECT tablename FROM pg_tables
 WHERE schemaname='public'
   AND tablename IN ('historico_candidatura','decisao_final','bias_audit_log');
```

### SQL audit proving the LGPD-02 guardrail (success criterion #5)
```sql
-- Must return 0 — no decision ever persisted without a human actor
SELECT count(*) AS auto_decisoes FROM public.decisao_final WHERE por_usuario IS NULL;
```

### SQL audit proving the audit trail (success criterion #3)
```sql
-- Every transition (incl. system/auto) recorded with criterio + ator + timestamp
SELECT candidatura_id, etapa_de, etapa_para, criterio_texto, ator, auto_rejeitado, criado_em
  FROM public.historico_candidatura ORDER BY criado_em DESC LIMIT 50;
-- auto/system actions are exactly the ator IS NULL rows
SELECT count(*) FROM public.historico_candidatura WHERE ator IS NULL AND auto_rejeitado = true;
```

### Regression-block smoke (success criterion #2)
```sql
-- Pick a candidatura at 'triagem', try to regress to 'inscricao' WITHOUT justificativa → must RAISE
UPDATE public.candidaturas SET etapa_atual='inscricao' WHERE id='<id>';  -- expect EXCEPTION
-- with justificativa → allowed
UPDATE public.candidaturas SET etapa_atual='inscricao', etapa_justificativa='motivo...' WHERE id='<id>';  -- OK
```

## Human-action checkpoint shape (for the planner — autonomous:false tasks)

Per the D-22 / Phase 4 precedent, model the enum cutover and the trigger migration as human-action checkpoint tasks. The recurring shape (from STATE.md 04-01 ledger):

1. **Author** the migration `.sql` file with NO `BEGIN/COMMIT` wrapper + inline 42601 note (autonomous).
2. **Checkpoint (autonomous:false):** human pastes SQL into Supabase SQL Editor (project `isljnozzlvckrgjjbjwp`) → runs → captures result.
3. **Reconcile:** `supabase migration repair --status applied <version>`.
4. **Verify:** `supabase db push --linked` → must report "Remote database is up to date".
5. **Smoke (SQL):** run the audit queries above.
6. **Regenerate types:** `npm run db:types` (autonomous) + commit.

This is the third+ time this checkpoint shape recurs (04-01 db push, 04-05 EF deploy, now Phase 6 cutover + trigger). Phase 4 surfaced that **autonomous green gates do NOT substitute for a real smoke-runtime check** (D-25..D-28) — the planner should include a live SQL smoke gate before marking the cutover task complete.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy 10-value `etapa_processo` (Figma-Make era, never exercised beyond triagem) | v2 8-value pipeline enum (6 stages + 2 terminals) | This phase (FUNIL-01) | Clean ordered enum enables ordinal regression detection |
| Legacy `historico_acoes` (FK usuarios_rh.id) | New `historico_candidatura` (FK auth.users, auto_rejeitado, etapa_de/para) | This phase (FUNIL-03) | Purpose-built audit with actor=auth.uid() and system-action distinction |

**Deprecated/outdated:**
- PRD §8.3 RLS template (`auth_user_id`, `'admin'`) — superseded by live schema (`user_id`, `'administrador'`).
- PRD §8.1 mig 01 wording "backup tabelas atuais → drop enum legado" — D-04 refines to a dedicated `backup_m2` schema snapshot.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Live `candidaturas` rows are all at `etapa_atual='triagem'` (no orphan intermediate enum values) | Runtime State Inventory | LOW — if orphans exist, D-05 collapse-to-triagem + audit-log handles them; the Wave-0 discovery query removes this assumption. MUST run discovery before writing USING CASE. |
| A2 | The rename in step 5 restores the canonical type name `etapa_processo`, so `submit_candidatura_atomic` RPC keeps compiling unchanged | Runtime State Inventory | MEDIUM — if the planner picks a different final type name, the RPC's `'triagem'::public.etapa_processo` cast and the column type diverge. Keep the canonical name. |
| A3 | `status_candidatura` needs "no big change" this phase (PRD §8.1 mig 03) | Migration structure | LOW — live status enum verified (`aguardando_resposta, em_analise, aprovado_proxima, rejeitado, finalizado`); confirm whether M2 needs new status members or leaves as-is. Planner to decide. |
| A4 | `bias_audit_log` is schema-only this phase (no snapshot job) — LGPD-03 (the monthly snapshot) is Phase 15 | Scope | LOW — D-01 lists bias_audit_log as a backbone table; the snapshot logic (LGPD-03) is mapped to Phase 15 in REQUIREMENTS traceability. Create empty table + RLS only. |
| A5 | Exact live row count / project state must be confirmed via SQL Editor at execution time (I could not run live SQL in this research session — no CLI, MCP query not executed) | Runtime State Inventory | LOW-MEDIUM — all schema facts came from the generated `database.types.ts` which Supabase regenerates from the live DB; the discovery query is the execution-time confirmation. |

## Open Questions

1. **Final type name + companion column names**
   - What we know: D-03 renames v2 back, Claude's discretion on companion column names (`etapa_motivo`/`etapa_justificativa`).
   - What's unclear: exact names; whether ONE justificativa column or separate motivo+criterio.
   - Recommendation: single `etapa_justificativa text` companion column (regression block + audit `criterio_texto` source); keep canonical type name `etapa_processo`.

2. **`status_candidatura` v2 — change or leave?**
   - What we know: PRD says "sem mudança grande"; live enum has 5 values.
   - What's unclear: whether M2 stages need new status members (e.g., a status for `decisao_final` reached).
   - Recommendation: leave `status_candidatura` as-is in Phase 6 unless a concrete new member is required; defer additions to the feature phase that needs them.

3. **Does the live `candidaturas` UPDATE today have any RLS UPDATE policy at all?**
   - What we know: M1 created SELECT/INSERT-oriented policies; D-08 needs a new RH UPDATE policy.
   - What's unclear: whether an UPDATE policy already exists that must be reconciled.
   - Recommendation: run the pg_policies discovery for `candidaturas` UPDATE before adding the `rh_avanca_etapa` policy.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (`isljnozzlvckrgjjbjwp`) | All migrations + live cutover | ✓ (live, ACTIVE per Phase 4) | hosted PG 15+ | — |
| Supabase SQL Editor | 42601 workaround (cutover + trigger) | ✓ (web) | — | — |
| Supabase CLI | `migration repair`, `db push`, `db:types` | ✗ in this research shell (`supabase not found`) | — | Fernando's terminal (per convention) — executor runs there |
| `npm run db:types` | Regenerate types post-migration | ✓ (script in package.json) | — | — |

**Missing dependencies with no fallback:** none blocking — CLI runs in Fernando's terminal per established M1 convention.
**Missing dependencies with fallback:** Supabase CLI not in the research shell; executor/human runs CLI commands in their own terminal (matches the human-action checkpoint shape).

## Validation Architecture

> nyquist_validation: config not confirmed disabled — section included. This is a DB-schema phase: "tests" are SQL smokes + (optionally) a Vitest/integration guard, not unit tests of TS.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (project) + SQL smoke queries run in SQL Editor; Playwright not applicable (no UI this phase) |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | SQL audit queries (see Code Examples) — the canonical verification for this phase |
| Full suite command | `npm run test:run` (regression guard only — no UI to e2e) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FUNIL-01 | Live cutover; no orphan/data loss | SQL smoke | discovery + post-cutover `GROUP BY etapa_atual` count match | ❌ Wave 0 (SQL Editor) |
| FUNIL-02 | Regression blocked without justificativa; forward/skip allowed | SQL smoke | regression-block smoke (Code Examples) | ❌ Wave 0 (SQL Editor) |
| FUNIL-03 | Every transition logged with criterio/ator/timestamp | SQL smoke | `SELECT ... FROM historico_candidatura` audit | ❌ Wave 0 (SQL Editor) |
| FUNIL-04 | RLS — candidato isolation, RH/admin via JWT | SQL smoke (role-impersonated) | RLS read test as candidato vs rh user | ❌ Wave 0 (SQL Editor) |
| LGPD-02 | 0 rows decisao_final with por_usuario IS NULL | SQL smoke + structural CHECK | `SELECT count(*) ... WHERE por_usuario IS NULL` → 0 | ❌ Wave 0 (SQL Editor) |

### Sampling Rate
- **Per migration apply:** run the matching SQL smoke immediately after each SQL-Editor apply.
- **Per phase gate:** all five SQL audits green + `db push` "up to date" + `npm run db:types` regenerated + `npm run test:run` no regression before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] SQL smoke runbook (the discovery + 5 audit queries) authored as a `.sql` or markdown checkpoint artifact — covers FUNIL-01..04, LGPD-02.
- [ ] (Optional) a Vitest integration test that connects with anon + RH JWTs and asserts RLS isolation — only if the project wants automated RLS regression (matches Phase 4 live-smoke lesson D-25..D-28).
- No framework install needed (Vitest present).

## Security Domain

> security_enforcement assumed enabled. This phase IS largely a security/access-control phase.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | indirect | JWT role from Custom Access Token Hook (M1, reused) |
| V3 Session Management | no | — (no session logic this phase) |
| V4 Access Control | **yes** | RLS on 100% of new tables reading `auth.jwt()->'app_metadata'->>'role'`; candidato row-isolation; decisao_final `WITH CHECK false` |
| V5 Input Validation | yes | CHECK constraints (`justificativa length >= 50`); enum constrains etapa values; trigger validates transitions |
| V6 Cryptography | no | — (no crypto this phase) |
| V8 Data Protection / Audit | **yes** | `historico_candidatura` immutable audit trail; `decisao_final` audit fields; LGPD-02 guardrail |

### Known Threat Patterns for PostgreSQL/Supabase RLS

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Candidato reads another candidato's candidatura | Information Disclosure | RLS USING `candidato_id IN (SELECT id FROM candidatos WHERE user_id = auth.uid())` |
| Client bypasses pipeline rules via direct UPDATE | Tampering / Elevation | BEFORE UPDATE trigger validates transition (unbypassable); RLS UPDATE policy gates role |
| Auto/AI decision persisted without human | Repudiation / compliance (LGPD) | `decisao_final.por_usuario NOT NULL` + client INSERT `WITH CHECK false` (EF-only) |
| Spoofed actor in audit trail | Repudiation | `ator := auth.uid()` from verified JWT (not client-passed); plain trigger preserves context |
| Privilege escalation via SECURITY DEFINER misuse | Elevation | Keep `avancar_etapa()` SECURITY INVOKER; only `decisao_final` writes go through EF two-client pattern (D-23) |
| Migration prepared-statement injection / partial apply | Tampering | 42601 workaround = explicit single-session SQL Editor apply + migration repair |

## Sources

### Primary (HIGH confidence — verified against live codebase)
- `database.types.ts` (generated from live DB) — legacy `etapa_processo` 10 values (L2935-2945), `status_candidatura` 5 values, `candidatos.user_id` (L332), `usuarios_rh.user_id` (L2071), `candidaturas` columns (L404-518), legacy `historico_acoes` table (L969-1020), `tipo_acao_historico` enum (L3203+)
- `supabase/migrations/20260420000002_unified_auth_role.sql` — JWT role values `'rh'`/`'administrador'`/`'candidato'`; `WHERE user_id = ...`
- `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` — live candidatura producer (etapa `triagem`); 42601 inline note pattern
- `supabase/migrations/20260606000001_vaga_status_sync.sql` — established BEFORE trigger + 42601 workaround precedent
- `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` §8.1/§8.2/§8.3/§8.7 — design intent (with verified corrections)
- `.planning/STATE.md` 04-01/04-05 ledgers — human-action checkpoint shape; D-22/D-23 locked
- `CLAUDE.md` §Commands / §Security Rules — 42601 workaround, RLS/security rules

### Secondary (MEDIUM confidence — official docs, CITED)
- postgresql.org/docs/current/sql-altertype.html — ALTER TYPE / enum cutover semantics
- postgresql.org/docs/current/datatype-enum.html — enum ordering by declaration order; `<`/`>` comparison
- supabase.com/docs/guides/database/postgres/enums — ALTER TYPE ADD VALUE
- supabase.com/docs/guides/database/postgres/row-level-security — RLS + auth context

### Tertiary (LOW confidence — community, cross-checked)
- munderwood.ca enum-alter article + blog.yo1.dog — DROP DEFAULT before ALTER TYPE confirmation (cross-verified with PG docs)

## Metadata

**Confidence breakdown:**
- Live schema facts (enum values, column names, role values, table presence): HIGH — read directly from generated `database.types.ts` + migrations.
- Cutover SQL sequence: HIGH — CITED from PostgreSQL official ALTER TYPE docs + matches D-03.
- Trigger pattern (ordinal regression, plain trigger actor capture): MEDIUM-HIGH — semantics CITED; exact trigger body is the planner's to finalize.
- 42601 workaround / checkpoint shape: HIGH — VERIFIED from Phase 4 ledgers + CLAUDE.md.
- Live row count / exact data state: MEDIUM — inferred from RPC + UAT evidence; Wave-0 discovery query removes the gap at execution.

**Research date:** 2026-06-07
**Valid until:** 2026-07-07 (stable DB-schema domain; re-verify only if `database.types.ts` is regenerated by intervening work)
