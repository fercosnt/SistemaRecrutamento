# Phase 34: Superfícies do RH — CV/IA, Agendamento, Fila + KPIs - Research

**Researched:** 2026-07-16
**Domain:** PL/pgSQL DEFINER analytics (extending a live RPC) · security_invoker projection views · React/TanStack Query RH surfaces (already design-mapped) · MCP-applied migration + ledger reconcile
**Confidence:** HIGH (SQL design, schema, patterns — all verified against live migrations) / MEDIUM (K4 closed-cohort exact shape — a design decision, flagged as assumption)

> **Scope note.** The four front-end surfaces are already fully mapped in `34-CONTEXT.md`
> (`<code_context>` file:line) and `34-UI-SPEC.md` (approved design contract). This research
> deliberately does **not** re-map hub/tabs/chart-wrapper/service conventions. It concentrates
> on the DB-heavy, novel, and risk-bearing parts: (1) extending `funil_kpis` in-place with 4 new
> keys, (2) the cross-vaga work-queue time-in-stage data source, (3) the behavioral-smoke
> validation architecture, (4) phase-specific pitfalls.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Area 1 — KPI dashboard scope & data**
- **KPI-04: estender `funil_kpis` IN-PLACE** (+4 top-level keys: `time_to_hire`, `knockout_rate`, `drop_per_stage`, `no_show_rate`). Net-new migration (`CREATE OR REPLACE FUNCTION public.funil_kpis` preserving the 3 existing keys + 4 new) via Supabase MCP `apply_migration` + reconcile ledger + behavioral smoke (PII-safe, vaga-scoped, admin bypass). **⚠ diff the LIVE body (`pg_get_functiondef`) BEFORE the CREATE OR REPLACE** (Pitfall DBMIG-02 — do not drop the 3 existing keys/logic: median via LEAD-dwell, conversion, volume).
- **no-show rate:** join `agendamentos_entrevista` — `count(compareceu=false) / count(compareceu IS NOT NULL)` (or / total concluded), vaga-scoped internally like the rest of the RPC. `compareceu` nullable = pending.
- **Conversion (K4): closed cohort by inscription window** (recommended default — does not undercount still-in-progress candidates). Applies to `drop_per_stage`/conversion-rate; the existing `conversion_stage_to_stage` (raw counts) key is preserved.
- **Chart lib: shadcn wrapper `@/components/ui/chart`** (`ChartContainer`/`ChartTooltip`/`ChartConfig`, like `AiCostsPage`). Keep the `recharts@2.15.2` alias (`vite.config.ts:74` / `tsconfig.json:35`). **Zero new npm.**
- **RelatoriosRHPage: replace** the dead M1 client-side aggregation with the `funil_kpis` dashboard, **on the same route `/rh/relatorios`**.

**Area 2 — Candidate screen: CV + IA + History**
- **CV (VISRH-01):** button on-click → `getSignedUrl(candidaturaId)` async → `window.open(url,'_blank')`. URL 60s TTL, **never persist in query cache nor log** (Pitfall 7). Owner-of-vaga/admin only (EF already authenticate-THEN-authorize). New RH consumer (0 today).
- **IA (VISRH-02):** new per-candidatura hook `useAnaliseCandidato(candidaturaId)` (allowlist: `score_match, pontos_fortes[], gaps[], flags[], analise_status`) — forças/gaps **in full** (no `.slice(0,2)`), **neutral** bands for Big Five (RNF-12a, P23 UX-07). Replaces the empty "Score de Triagem" placeholder HubSection (`HubCandidatoRH.tsx:293-302`). Candidate NEVER sees score/análise.
- **Histórico (VISRH-03):** new hook `useHistoricoCandidatura(candidaturaId)` + read-only feed of `historico_candidatura` (allowlist: `etapa_de, etapa_para, ator, criado_em, justificativa`). RLS `rh_le_historico` WR-04 (P32) already gates. New HubSection at the end.
- **Placement:** new `<HubSection>`/`<Glass>` siblings in `HubCandidatoRH`'s `space-y-6` (CV+IA right after "Próximo passo"/timeline; Histórico at the end, after Decisão Final).

**Area 3 — Agendamento form + Work queue**
- **Agendamento (AGEND-02/03):** block in the hub's Entrevista section, **gated to `etapa_atual IN ('entrevista_online','entrevista_presencial')`**. Form: shadcn `Calendar` + `<input type="time">` in `Popover`; actions agendar / **reagendar (UPDATE in-place**, `status='reagendada'`) / **cancelar** (`status='cancelada'`, row kept) / toggle **`compareceu`**. Via new `agendamentoService` (`.from('agendamentos_entrevista').insert/.update` — RLS `rh_gerencia_agendamento` gates; **do NOT pass** `vaga_id`/`agendado_por`/`updated_by`/`updated_at` — the `agendamento_normaliza_vaga_id` trigger stamps them). Reflects on the candidate card (P35 reads via `get_meu_agendamento`).
- **Fila de trabalho (KPI-01):** new **"Fila"** tab in `CandidatosRHPage` (tabbed `todos|por-vaga|kanban` → +`fila`), **cross-vaga**, sorted by time-in-stage/SLA. **Coexists** with the Kanban tab (both preserved).
- **SLA thresholds (KPI-03):** **hardcoded per-etapa defaults** in a shared constant (e.g. `SLA_POR_ETAPA` in `src/features/funil/.../slaThresholds.ts`); aging/breach badge when time-in-stage > limit. Per-vaga config **deferred** to backlog.

### Claude's Discretion
- Final file/hook/component/route names; exact HubSection ordering.
- Exact no-show denominator + closed-cohort SQL shape (planner/researcher decides in the migration).
- Whether the cross-vaga queue reads from `v_triagem_panel`/`candidaturas`+`historico` or a light new view/RPC.
- Dashboard visual structure (which charts for which keys) — respecting ui-brand + `@/components/ui/chart`.

### Deferred Ideas (OUT OF SCOPE)
- Candidate-facing agendamento card + `.ics` + ≤24h badge → **Phase 35**.
- Per-vaga configurable SLA thresholds (UI/table) → backlog (v1 = hardcoded constant).
- COMM (email notification of the agendamento), TALENT, LGPD-OPS → M7+.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VISRH-01 | RH opens/downloads CV via signed-URL EF (owner/admin only) | `cvUploadService.getSignedUrl(candidaturaId)` verified live (`src/features/vagas/services/cvUploadService.ts:199-213`); EF `get-curriculo-url` authenticate-THEN-authorize shipped P32. Zero new SQL — pure client wiring. |
| VISRH-02 | RH sees full IA analysis; candidate never sees it | Read source = `analise_candidato_vaga` (columns verified: `score_match int 0-100 nullable, pontos_fortes text[], gaps text[], flags text[], status`) via the existing `v_triagem_panel` security_invoker view (flattened allowlist) OR direct table read; RLS `rh_le_analise` vaga-scoped. Truncation `.slice(0,2)` is vaga-level only (`TriagemTable.tsx:238-239`) — the hub renders full lists. |
| VISRH-03 | RH read-only history feed | `historico_candidatura` (`etapa_de, etapa_para, ator, criado_em, criterio_texto`) — RLS `rh_le_historico` WR-04 vaga-scoped (P32, `20260715000002:137-147`). Allowlist read, no `select('*')`. |
| KPI-01 | Cross-vaga work queue by time-in-stage | Recommend a new **security_invoker** view `v_fila_trabalho` (candidaturas + latest-transition timestamp); RH SELECT on candidaturas is already vaga-scoped (`rh_le_candidaturas`, `20260706110004:62-68`) so the view inherits scope. §"Work-Queue" below. |
| KPI-02 | Operational KPIs via DEFINER vaga-scoped RPC | `funil_kpis(p_vaga_id)` shipped P32 (3 keys). Preserved verbatim. |
| KPI-03 | Aging/SLA-breach indicator | Client-side `SLA_POR_ETAPA` constant × `dias-na-etapa` from `v_fila_trabalho.entrou_etapa_em`. §"SLA Computation". |
| KPI-04 | +time_to_hire, knockout_rate, drop_per_stage, no_show_rate in the SAME RPC | Full CTE design below (§"Extending funil_kpis"). All 4 verified against live schema. |
| AGEND-02 | Reagendar/cancelar, reflected on candidate card | `agendamentos_entrevista` (P33): UPDATE in-place `status='reagendada'`/`'cancelada'` (row kept); `agendamentoService` direct write, RLS `rh_gerencia_agendamento` gates; trigger stamps audit cols. |
| AGEND-03 | Register `compareceu`/no-show | `compareceu boolean` (nullable=pending) on `agendamentos_entrevista` — the KPI-04 no-show source of truth (verified `20260716000001:33,51`). |
</phase_requirements>

## Summary

Phase 34 is a **thin-UI-over-secure-primitives** phase with exactly **one net-new piece of server SQL that carries real risk**: the in-place extension of the live `funil_kpis` DEFINER RPC with 4 new keys. Every read primitive it consumes is already shipped and hardened (P32 EF `get-curriculo-url`, P32 `funil_kpis` 3-key baseline + `rh_le_historico` WR-04; P33 `agendamentos_entrevista` + trigger + `get_meu_agendamento`). The four RH surfaces are fully specified in CONTEXT/UI-SPEC. So the research effort concentrates where the planner actually needs help: (1) the exact CTE SQL for the 4 new KPI keys, (2) the mandatory "diff-live-body-first" apply mechanic, (3) the cross-vaga work-queue data source, and (4) the behavioral smoke that proves the extension is PII-safe and vaga-scoped.

The **hire signal for `time_to_hire`** is the `historico_candidatura` transition to `etapa_para='aprovado'` (written by `registrar_decisao`→`avancar_etapa` trigger when a final decision is `aprovado`), anchored against `candidaturas.data_candidatura` (inscription). The **knockout signal** is the durable `candidaturas.motivo_rejeicao='knockout_automatico'` marker (set by `submit_candidatura_atomic`) — a plain candidaturas column, aggregatable and PII-free, not something that needs the audit trail. The **no-show** join is `agendamentos_entrevista → candidaturas → vagas` with the same owner predicate. **drop_per_stage** is derivable entirely from `scoped_hist` (`etapa_de`/`etapa_para`) with a *closed* (exited-stage) denominator so still-in-progress candidates don't understate the rate.

**Primary recommendation:** Author one migration `CREATE OR REPLACE FUNCTION public.funil_kpis(p_vaga_id uuid)` that is re-derived from the **live** `pg_get_functiondef` output — keeping the 3 existing CTEs/keys byte-for-byte — and appends 4 new CTEs + 4 new `jsonb_build_object` keys, all reusing the existing `(v_is_admin OR v.created_by=v_uid) AND (p_vaga_id IS NULL OR v.id=p_vaga_id)` scope and the `deleted_at IS NULL` WR-02 guard. Add a new security_invoker view `v_fila_trabalho` for the work queue. Prove both with a new result-returning behavioral smoke modeled on `seg32_smokes.sql`. Keep the RPC signature single-arg (`uuid`) — do **not** add a cohort-window parameter (v1 = all-time cohort). Zero new npm.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| KPI aggregation (KPI-02/04) | **Database / DEFINER RPC** (`funil_kpis`) | — | Vaga-scope + PII-safety enforced *by construction* inside the RPC; never client-side aggregation, never PII in payload (SEG-02 invariant). |
| Work-queue time-in-stage (KPI-01/03) | **Database / security_invoker view** (`v_fila_trabalho`) | Client (SLA compare) | RLS on base tables is already vaga-scoped for RH; a view delegates scope for free. Time-in-stage needs `MAX(historico.criado_em)` which PostgREST can't order parent rows by (same limit that forced `v_triagem_panel`). SLA thresholds live client-side (hardcoded constant, KPI-03). |
| IA analysis read (VISRH-02) | **Database (RLS-gated table/view)** | Client (allowlist hook) | `analise_candidato_vaga` RLS `rh_le_analise` vaga-scoped; client projects an explicit allowlist (never `select('*')`). |
| History feed (VISRH-03) | **Database (RLS `rh_le_historico`)** | Client (allowlist hook) | WR-04 vaga-scoped SELECT already shipped P32; client renders read-only. |
| CV signed URL (VISRH-01) | **Edge Function** (`get-curriculo-url`) | Client (never logs) | Privileged (service_role signer) authenticate-THEN-authorize; the ONLY privileged path to the CV. 60s TTL, never cached/logged. |
| Interview scheduling writes (AGEND-02/03) | **Database (RLS + trigger)** | Client (`agendamentoService`) | RH writes direct to `agendamentos_entrevista`; RLS `rh_gerencia_agendamento` gates; the `agendamento_normaliza_vaga_id` trigger stamps `vaga_id`/`agendado_por`/`updated_*`. |
| KPI charts (KPI-02/04) | **Client / Browser** | — | `@/components/ui/chart` (shadcn recharts wrapper) renders aggregates only — no PII, no client aggregation. |

## Standard Stack

**Zero new dependencies.** Everything this phase needs is already installed and in use.

### Core (all pre-existing — verified in `package.json` / migrations)
| Library / primitive | Version | Purpose | Why standard here |
|---------|---------|---------|--------------|
| `recharts` (via `@/components/ui/chart`) | `^2.15.2` (aliased `vite.config.ts:74`) [CITED: 34-CONTEXT.md:110] | KPI dashboard charts | Existing consumer `AiCostsPage` (`src/features/admin/ai-costs/components/AiCostsPage.tsx:47-51`) — the canonical pattern to clone. |
| `@tanstack/react-query` | v5 [CITED: CLAUDE.md] | Server state for all new hooks | `entrevistaKeys`/`entrevistaService` factory precedent (`useEntrevistaScorecard.ts:39-45`). |
| `react-hook-form` + `zod` | in use [CITED: CLAUDE.md] | Agendamento form validation | Established forms convention (schemas pt-BR). |
| shadcn primitives (`calendar`, `popover`, `select`, `input`, `textarea`, `toggle-group`, `alert-dialog`, `tabs`, `table`, `badge`, `chart`) | vendored | All four surfaces | UI-SPEC confirms every primitive is already vendored under `src/components/ui/`. |
| `date-fns` (+ `ptBR`) | `^2.30.0` [CITED: 34-UI-SPEC.md:36] | Timestamps in history/agendamento | Already in use. |
| Supabase JS client (anon) | in use | `.from().insert/.update`, `.rpc('funil_kpis')`, `.functions.invoke('get-curriculo-url')` | Client anon only; privileged path is the EF. |
| `vitest` | `^4.1.9` [VERIFIED: package.json:93] | Unit/component tests | happy-dom env, `tests/setup.ts`, `**/__tests__/**` glob. |
| `@playwright/test` | `^1.56.1` [VERIFIED: package.json:72] | E2E / live UAT (deferred to human) | Auth-real login helper needs `blur()` (memory `e2e_login_helper_onblur`). |

**Installation:** none. `npm install` count for this phase = **0**.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages** (locked decision: "Zero new npm"). No registry fetch, no slopcheck run required. Every library above is already resident in `package.json` and exercised by shipped code. If any plan proposes a new dependency, that is a scope violation of the CONTEXT lock and must be rejected, not audited.

## Extending `funil_kpis` (the hardest part)

### The live baseline (3 keys — MUST be preserved byte-for-byte)

Current file `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql:48-124` [VERIFIED: read full body]. The git history shows the file was **already CREATE-OR-REPLACE'd once post-ship** (commit `853cb03`, WR-02: added `c.deleted_at IS NULL` to `scoped_hist` and `volume`). This is the *proof* that the live body can diverge from any single migration file — hence the mandatory diff below.

Existing CTE chain: `scoped_hist` (PII-safe projection: `candidatura_id, etapa_de, etapa_para, criado_em, vaga_id` — never `ator`, never any `candidatos` column) → `deltas` (LEAD dwell) → `median` (`percentile_cont(0.5)` over non-null dwell, excludes in-progress last transition) → `conversion` (raw `etapa_de→etapa_para` counts, `etapa_de IS NOT NULL`) → `volume` (current `etapa_atual` distribution). Scope predicate everywhere: `(v_is_admin OR v.created_by = v_uid) AND (p_vaga_id IS NULL OR v.id = p_vaga_id) AND c.deleted_at IS NULL`.

### ⚠ MANDATORY apply mechanic (Pitfall DBMIG-02 — near-miss P27)

The plan MUST instruct the executor to, **in this order**:

1. **Read the LIVE body first** via MCP: `SELECT pg_get_functiondef('public.funil_kpis(uuid)'::regprocedure);`
2. **Re-derive** the new migration body FROM that live output — copy the 3 existing keys + all their CTEs verbatim, then append the 4 new CTEs + 4 new keys. Do NOT reconstruct from the git file (it may lag the live body).
3. Apply via Supabase MCP `apply_migration` (bypasses SQLSTATE 42601 on `$$` bodies; no `BEGIN/COMMIT` wrapper — D-22).
4. **Reconcile the ledger**: `apply_migration` records a fresh-timestamp version ≠ filename → `UPDATE supabase_migrations.schema_migrations` to the filename prefix (P27/P33 idiom). MCP apply drift is REAL (STATE P33 learnings).
5. **Regenerate `database.types.ts`** at the repo ROOT (new keys change the RPC return shape; new view adds a type). `npm run db:types`.
6. Run the behavioral smoke (§Validation Architecture) via MCP `execute_sql` (result-returning form — RAISE NOTICE is invisible over MCP).

> The single most likely defect in this phase is an executor authoring `CREATE OR REPLACE` from the git file and silently dropping a CTE the WR fixes added. The plan text must name the `pg_get_functiondef` step as a discrete, non-skippable task.

### New key 1 — `time_to_hire` (median seconds inscrição→aprovado, closed by definition)

**Signal:** the `historico_candidatura` transition into `etapa_para='aprovado'` (written by `avancar_etapa` when `registrar_decisao(...,'aprovado')` sets `candidaturas.etapa_atual='aprovado'` — verified `20260625100001:139-140`). **Anchor:** `candidaturas.data_candidatura` (inscription; set to `now()` in `submit_candidatura_atomic` — verified `20260608000001:130,140`). The cohort is inherently closed (only hired candidaturas have both endpoints).

```sql
  tth AS (
    -- inscrição→aprovado seconds for hired candidaturas (already owner-scoped via scoped_hist).
    -- COALESCE anchor guards legacy rows with NULL data_candidatura; the >= guard drops clock skew.
    SELECT EXTRACT(EPOCH FROM (sh.criado_em - COALESCE(c.data_candidatura, c.created_at))) AS secs
      FROM scoped_hist sh
      JOIN public.candidaturas c ON c.id = sh.candidatura_id
     WHERE sh.etapa_para = 'aprovado'
       AND COALESCE(c.data_candidatura, c.created_at) IS NOT NULL
       AND sh.criado_em >= COALESCE(c.data_candidatura, c.created_at)
  )
  -- key: median seconds, or NULL when no hires yet (dashboard renders "—")
  'time_to_hire',
    (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY secs))::bigint
       FROM tth WHERE secs IS NOT NULL)
```
Returns a bare `bigint` seconds (mirrors `median_time_per_stage` unit) or JSON `null`. **Alternative source considered:** `decisao_final.em WHERE decisao='aprovado'` — equivalent (same txn) but requires a new table join and doesn't reuse `scoped_hist`; the historico-based form is preferred (PII-safe by inheritance, one fewer join). [ASSUMED: median statistic + `data_candidatura` anchor — confirm the anchor choice; a rolling window is NOT applied in v1.]

### New key 2 — `knockout_rate` (auto-reject-at-inscription / total)

**Signal:** `candidaturas.motivo_rejeicao='knockout_automatico'` — the durable marker `submit_candidatura_atomic` writes on a knockout (verified `20260608000001:195`). It is a plain candidaturas column (not PII, not in the audit trail's author column) → aggregate directly, like the `volume` CTE. Do NOT try to read the knockout audit row (`auto_rejeitado`) — that column is deliberately excluded from `scoped_hist`.

```sql
  ko AS (
    SELECT count(*) FILTER (WHERE c.motivo_rejeicao = 'knockout_automatico') AS knockouts,
           count(*)                                                          AS total
      FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
  )
  'knockout_rate',
    (SELECT jsonb_build_object(
       'knockouts', knockouts,
       'total',     total,
       'taxa', CASE WHEN total > 0 THEN round(knockouts::numeric / total, 4) ELSE NULL END
     ) FROM ko)
```
Structured `{knockouts, total, taxa}` (numerator + denominator + safe rate) — self-documenting, no div-by-zero (CASE guard; `count()` is 0 not NULL).

### New key 3 — `drop_per_stage` (closed-cohort per-stage drop fraction)

Derivable entirely from `scoped_hist` (`etapa_de`/`etapa_para`) — PII-safe, no extra join. **Closed denominator** = candidates who have *exited* the stage (advanced OR rejected), so those still sitting at the stage don't understate the drop rate ("não subconta em andamento"). Numerator = those who exited by rejection.

```sql
  drop_flow AS (
    SELECT sh.etapa_de AS stage,
           count(*) FILTER (WHERE sh.etapa_para = 'rejeitado') AS dropped,   -- exited by human reject
           count(*)                                            AS saidas     -- all exits (closed cohort)
      FROM scoped_hist sh
     WHERE sh.etapa_de IS NOT NULL
       AND sh.etapa_de <> sh.etapa_para                 -- exclude the knockout inscricao self-loop
       AND sh.etapa_de NOT IN ('aprovado','rejeitado')  -- terminals never "drop"
     GROUP BY sh.etapa_de
  )
  'drop_per_stage',
    COALESCE((SELECT jsonb_object_agg(stage, jsonb_build_object(
       'dropped', dropped,
       'saidas',  saidas,
       'taxa', CASE WHEN saidas > 0 THEN round(dropped::numeric / saidas, 4) ELSE NULL END
     )) FROM drop_flow), '{}'::jsonb)
```
**Design coherence:** `drop_per_stage['inscricao']` is ~0 by construction because knockout self-loops (`inscricao→inscricao`) are excluded — the inscription auto-reject drop is the *dedicated* `knockout_rate` key, not double-counted here. Human rejections at `triagem`/`avaliacao_assincrona`/`entrevista_*`/`decisao_final` populate this key. [ASSUMED: closed-cohort = per-stage "exited" denominator, all-time window (no inscription-date bound), single-arg RPC signature preserved. The alternative (rolling inscription-window cohort via a new `p_desde timestamptz` param) would create a `funil_kpis(uuid,timestamptz)` overload — rejected for v1 to keep the shipped signature/grants intact. Confirm in discuss.]

### New key 4 — `no_show_rate` (from `agendamentos_entrevista`, 0-row safe)

Join `agendamentos_entrevista → candidaturas → vagas` with the same owner predicate (the RPC is DEFINER; it joins internally). Only *decided* attendance counts (`compareceu IS NOT NULL`); pending (`NULL`) and cancelled interviews are excluded. 0-agendamento scope → `total=0` → `taxa=null` (renders "—"), never a crash or a misleading 0%.

```sql
  ns AS (
    SELECT count(*) FILTER (WHERE a.compareceu = false) AS no_shows,
           count(*)                                     AS total  -- decided attendance only
      FROM public.agendamentos_entrevista a
      JOIN public.candidaturas c ON c.id = a.candidatura_id
      JOIN public.vagas        v ON v.id = c.vaga_id
     WHERE (v_is_admin OR v.created_by = v_uid)
       AND (p_vaga_id IS NULL OR v.id = p_vaga_id)
       AND c.deleted_at IS NULL
       AND a.deleted_at IS NULL
       AND a.compareceu IS NOT NULL
  )
  'no_show_rate',
    (SELECT jsonb_build_object(
       'no_shows', no_shows,
       'total',    total,
       'taxa', CASE WHEN total > 0 THEN round(no_shows::numeric / total, 4) ELSE NULL END
     ) FROM ns)
```
Note: join via `candidatura_id → candidaturas → vagas` (not the denormalized `a.vaga_id`) to mirror the WR-04 join-through pattern used everywhere else, even though DEFINER means authorization isn't RLS-driven here — consistency + the `a.vaga_id` trigger-normalization means either works, but the join-through is the house style.

### Final `jsonb_build_object` (7 keys total)

Preserve keys 1-3 verbatim from the live body, then append keys 4-7:
```sql
  SELECT jsonb_build_object(
    'median_time_per_stage',      <existing>,   -- preserve
    'conversion_stage_to_stage',  <existing>,   -- preserve
    'volume_by_stage',            <existing>,   -- preserve
    'time_to_hire',    (SELECT ... FROM tth),
    'knockout_rate',   (SELECT ... FROM ko),
    'drop_per_stage',  COALESCE((SELECT ... FROM drop_flow), '{}'::jsonb),
    'no_show_rate',    (SELECT ... FROM ns)
  ) INTO r;
```
Update the `COMMENT ON FUNCTION` to document the 4 new keys and cite the new smoke. The `REVOKE ALL … FROM PUBLIC; GRANT EXECUTE … TO authenticated;` block stays unchanged (single `uuid` arg).

## Work-Queue Time-in-Stage (KPI-01/03)

### Recommendation: a new `security_invoker` view `v_fila_trabalho`

**Time-in-current-stage** = `now() - (latest historico_candidatura.criado_em for the candidatura)`. Every transition writes a row whose `etapa_para` = the new `etapa_atual` and whose `criado_em` = entry time, so `MAX(criado_em)` per candidatura is the current-stage entry timestamp. PostgREST cannot order parent rows by a child aggregate (the exact limitation that produced `v_triagem_panel`, `20260623000001`), and `v_triagem_panel` does **not** expose a transition timestamp — so neither `candidaturas` alone nor `v_triagem_panel` suffices. A light view is the clean answer.

```sql
create or replace view public.v_fila_trabalho
with (security_invoker = true) as       -- delegates base-table RLS (rh_le_candidaturas is vaga-scoped)
select
  c.id                as candidatura_id,
  c.vaga_id,
  vg.titulo           as vaga_titulo,    -- RH-facing; PII-acceptable (RH owns these vagas)
  ca.id               as candidato_id,
  ca.nome_completo    as candidato_nome, -- RH-facing (the queue is RH-only, vaga-scoped)
  c.etapa_atual,
  c.status,
  greatest(
    coalesce(max(h.criado_em), c.data_candidatura, c.created_at),
    c.data_candidatura
  )                   as entrou_etapa_em -- fallback when no history row exists yet
from public.candidaturas c
  left join public.candidatos ca on ca.id = c.candidato_id
  left join public.vagas      vg on vg.id = c.vaga_id
  left join public.historico_candidatura h on h.candidatura_id = c.id
where c.deleted_at is null
  and c.etapa_atual not in ('aprovado','rejeitado')  -- terminals are not "aguardando ação"
group by c.id, c.vaga_id, vg.titulo, ca.id, ca.nome_completo, c.etapa_atual, c.status, c.data_candidatura, c.created_at;
grant select on public.v_fila_trabalho to authenticated;
```

Rationale for this over a DEFINER RPC: the queue is **RH-facing and vaga-scoped by RLS already** (`rh_le_candidaturas`, `20260706110004:62-68`, admin bypass OR `vaga_id IN (SELECT id FROM vagas WHERE created_by=auth.uid())`), so `security_invoker` gives exact scope for free with no PII risk — a recruiter sees only their own vagas' candidates, and candidate names ARE appropriate here (RH must know who to action). No DEFINER, no allowlist gymnastics. This mirrors `v_triagem_panel` precisely.

**Alternative (also acceptable):** add an `entrou_etapa_em` column to `v_triagem_panel` and read the queue from it (avoids a new object). Rejected as primary because it mutates a shipped triagem surface and the queue wants terminal-stage exclusion the triagem panel does not.

### SLA computation (KPI-03)

Thresholds live client-side (locked: hardcoded constant). Client computes `dias = differenceInCalendarDays(now, entrou_etapa_em)` and compares to `SLA_POR_ETAPA[etapa]`. UI-SPEC recommends per-etapa days `triagem 3 · avaliacao_assincrona 5 · entrevista_online 4 · entrevista_presencial 4 · decisao_final 3`, badge levels **aging (amber)** when `dias >= threshold`, **breach (red)** when `dias > 1.5 × threshold`. Sort the queue by `entrou_etapa_em ASC` (oldest-waiting first = "o que precisa da minha ação agora"). Keep `inscricao` out of SLA (knockout auto-resolves it) — the queue's `etapa_atual` for survivors is already `triagem`+.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vaga-scoped KPI aggregation | A client-side reducer over candidaturas | `funil_kpis` DEFINER RPC (extend it) | Client aggregation = PII exposure + broken scope + the exact dead M1 `RelatoriosRHPage` pattern being replaced. |
| Median time-in-stage | Hand-rolled percentile in JS | `percentile_cont(0.5) WITHIN GROUP` (already in the RPC) | LEAD-dwell + null-exclusion of in-progress transitions is already correct — reuse, don't reinvent. |
| Latest-transition-per-candidatura ordering | N+1 per-row `.order().limit(1)` reads | `v_fila_trabalho` view with `MAX(criado_em)` | PostgREST can't order parents by child aggregate; a view is the shipped precedent (`v_triagem_panel`). |
| CV download URL | Client `createSignedUrl` over `curriculos` | `cvUploadService.getSignedUrl(candidaturaId)` → EF | service_role in the client is forbidden; the EF is the only privileged path (P32). The last client `createSignedUrl` on `curriculos` was removed in P32 — do not reintroduce it. |
| Interview audit columns | Client-set `agendado_por`/`updated_by`/`updated_at`/`vaga_id` | The `agendamento_normaliza_vaga_id` trigger stamps them | Trigger overwrites client values; passing them is dead code at best, a spoof vector at worst. |
| Chart container/tooltip | Raw `recharts` `ResponsiveContainer`/`Tooltip` | `ChartContainer`/`ChartTooltip`/`ChartTooltipContent` from `@/components/ui/chart` | House wrapper handles theming tokens `--chart-1..5`, a11y layer, and the alias. Chart *primitives* (`BarChart`, `Bar`, `XAxis`) still import from `recharts` — that is correct and matches `AiCostsPage`. |
| Score band chip | New band component | `scoreBandClass` + `ScoreCell` chip (`TriagemTable`) | Colorblind-safe (number+color in one element) invariant already encoded. |

**Key insight:** every "hard" primitive in this phase (signed URL, KPI scope, audit stamping, PII-safety) was deliberately built and hardened in P32/P33 so that P34 is wiring. The failure mode is re-implementing one of them client-side and reintroducing a leak the milestone just closed.

## Runtime State Inventory

> This is a DB-touching phase (extend a live RPC + add a view + regen types). Not a rename, but there IS live runtime state to reconcile.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None migrated.** `funil_kpis` is a pure function (no rows); `v_fila_trabalho` is a projection; no `agendamentos`/`candidaturas` data is rewritten. | None — no data migration. |
| Live service config | (1) The **LIVE `funil_kpis` body** — already diverged from a single file once (WR-02 fix `853cb03`). (2) `supabase_migrations.schema_migrations` ledger — MCP `apply_migration` writes a fresh-timestamp version ≠ filename. | (1) `pg_get_functiondef` diff BEFORE replace; (2) reconcile ledger to filename prefix after apply (P27/P33 idiom). |
| OS-registered state | None (no cron, no Task Scheduler, no pm2). | None — verified (no OS-level scheduler references in scope). |
| Secrets / env vars | None. No new Vault secret, no env var. CV EF secrets (`project_url`/`edge_invoke_key`) already provisioned P32. | None. |
| Build artifacts | **`database.types.ts` at repo ROOT** goes stale the moment the RPC return shape changes (+4 keys) and the new view type is missing. | `npm run db:types` after apply; a transient `as never` shim is acceptable pre-regen (Phase 8/11/25 precedent) but must be dropped once types land. |

**Pre-existing debt untouched:** `db push --linked` will still report "not up to date" (DBMIG-01 — 7 remote M5 timestamp-versions, 2 fileless). NOT a P34 defect; reconcile only the P34 rows, leave DBMIG-01 to its deferred ticket.

## Common Pitfalls

### Pitfall 1: Authoring `CREATE OR REPLACE funil_kpis` from the git file, dropping a live CTE
**What goes wrong:** The executor reconstructs the function from `20260715000002…sql` and silently loses whatever the live body has that the file doesn't (the WR fixes proved file≠live is possible). The 3 existing keys regress. **Why:** MCP-applied functions live only in PROD; git files lag. **How to avoid:** `pg_get_functiondef('public.funil_kpis(uuid)'::regprocedure)` FIRST; build the new body ON TOP of that output. **Warning sign:** the diff between the new migration and `pg_get_functiondef` shows a *removed* line that isn't one of your 4 additions.

### Pitfall 2: CV signed URL cached or logged
**What goes wrong:** Putting `getSignedUrl` in a TanStack `useQuery` (cached 5min) or logging `data.signedUrl` — the 60s-TTL URL leaks past its lifetime / into logs. **How to avoid:** call it imperatively on click (a mutation or bare async), `window.open` immediately, never store in cache, never `console.*` it. A grep guard for `signedurl`/`?token=` in `console.*` already exists (P32); a new hub consumer must not trip it. **Warning sign:** `useQuery(['cv', id], () => getSignedUrl(id))`.

### Pitfall 3: Rendering the IA analysis truncated OR leaking it to the candidate
**What goes wrong:** copying the `.slice(0,2)` from `TriagemTable.tsx:238-239` (that truncation is vaga-level table density only) — VISRH-02 requires forças/gaps **in full**. Or: the IA HubSection renders on the candidate's hub. **How to avoid:** render complete arrays; the analysis block is RH-only (`HubCandidatoRH`, never `HubCandidato`). Big Five in **neutral** descriptive bands (RNF-12a). **Warning sign:** `.slice(` anywhere in the new IA component; the IA block imported by a candidate route.

### Pitfall 4: Passing trigger-stamped columns from the agendamento client
**What goes wrong:** the form sends `vaga_id`/`agendado_por`/`updated_by`/`updated_at` in the `.insert/.update` payload. The trigger overwrites them, but a spoofed `vaga_id` is a *scope* concern (neutralized by the trigger + join-through RLS, but the client shouldn't send it at all). **How to avoid:** the `agendamentoService` payload carries ONLY `candidatura_id, tipo, data_hora, local_ou_link, status, observacoes_rh, entrevistador, compareceu`. **Warning sign:** `agendado_por:` or `vaga_id:` in the insert body.

### Pitfall 5: `no_show_rate` div-by-zero / misleading 0% when there are no interviews
**What goes wrong:** `count(false)/count(*)` with 0 decided interviews → NULL or a "0%" that reads as "great attendance". **How to avoid:** the `CASE WHEN total > 0 … ELSE NULL` guard + return `{no_shows, total, taxa}`; the metric card renders "—" for `taxa=null`. **Warning sign:** a bare `no_shows::numeric / total` without the CASE.

### Pitfall 6: Chart wrapper alias / raw recharts
**What goes wrong:** importing `ResponsiveContainer`/`Tooltip` directly, or a fresh `recharts` import that misses the `2.15.2` alias (`vite.config.ts:74`, `tsconfig.json:35`) → version drift. **How to avoid:** wrap with `ChartContainer`+`ChartTooltip` from `@/components/ui/chart`; chart primitives (`BarChart`,`Bar`,`XAxis`,`CartesianGrid`) from `recharts` exactly as `AiCostsPage.tsx:14-26,47-51` does. **Warning sign:** `import { ResponsiveContainer } from 'recharts'` in new code.

### Pitfall 7: `select('*')` on the new reads (RLS is row-level, not column-level)
**What goes wrong:** `useAnaliseCandidato`/`useHistoricoCandidatura`/`agendamentoService` reading with `select('*')` — RLS gates rows, not columns, so PII/internal columns ride along ([[reference_select_star_leaks_pii]]). **How to avoid:** explicit allowlist strings on every read (the exact allowlists are in CONTEXT). **Warning sign:** `.select('*')` or `.select()` with no projection in any new service.

### Pitfall 8: `:id` route param is candidaturaId, not candidatoId
**What goes wrong:** `/rh/candidatos/:id` — `:id` is the **candidaturaId** (UI-SPEC Pitfall 1). Passing it as a `candidato_id` to any read/RPC returns empty or wrong rows. **How to avoid:** every new hook takes `candidaturaId`; `getSignedUrl`, `useAnaliseCandidato`, `useHistoricoCandidatura`, `get_meu_agendamento` all key on candidatura. **Warning sign:** a hook param named `candidatoId` fed from `useParams().id`.

## Code Examples

### Extend the RPC — CTE skeleton (append to the live body)
```sql
-- Source: derived from live pg_get_functiondef + the 4 designs above.
-- (Existing scoped_hist/deltas/median/conversion/volume preserved above this point.)
  , tth AS ( ... ),      -- time_to_hire (see §New key 1)
    ko  AS ( ... ),      -- knockout_rate (§2)
    drop_flow AS ( ... ),-- drop_per_stage (§3)
    ns  AS ( ... )       -- no_show_rate (§4)
  SELECT jsonb_build_object(
    'median_time_per_stage', <preserve>, 'conversion_stage_to_stage', <preserve>, 'volume_by_stage', <preserve>,
    'time_to_hire', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY secs))::bigint FROM tth WHERE secs IS NOT NULL),
    'knockout_rate', (SELECT jsonb_build_object('knockouts',knockouts,'total',total,'taxa',CASE WHEN total>0 THEN round(knockouts::numeric/total,4) END) FROM ko),
    'drop_per_stage', COALESCE((SELECT jsonb_object_agg(stage, jsonb_build_object('dropped',dropped,'saidas',saidas,'taxa',CASE WHEN saidas>0 THEN round(dropped::numeric/saidas,4) END)) FROM drop_flow), '{}'::jsonb),
    'no_show_rate', (SELECT jsonb_build_object('no_shows',no_shows,'total',total,'taxa',CASE WHEN total>0 THEN round(no_shows::numeric/total,4) END) FROM ns)
  ) INTO r;
```

### Dashboard chart — clone AiCostsPage
```tsx
// Source: src/features/admin/ai-costs/components/AiCostsPage.tsx:14-26,47-51 (verified)
import { BarChart, Bar, XAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
const cfg = { taxa: { label: 'Volume', color: 'var(--chart-1)' } } satisfies ChartConfig
<ChartContainer config={cfg} className="h-56 w-full">
  <BarChart data={volumeData} accessibilityLayer>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="etapa" tickLine={false} axisLine={false} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="n" fill="var(--color-taxa)" radius={4} />
  </BarChart>
</ChartContainer>
```

### KPI hook — read the RPC (allowlist by construction: RPC returns only aggregates)
```ts
// Source: entrevistaKeys/entrevistaService factory (useEntrevistaScorecard.ts:39-45)
export const funilKpisKeys = { all: ['funil-kpis'] as const, byVaga: (v: string | null) => [...funilKpisKeys.all, v] as const }
async function fetchFunilKpis(vagaId: string | null) {
  const { data, error } = await supabase.rpc('funil_kpis', { p_vaga_id: vagaId })
  if (error) throw new FunilKpisServiceError('Não foi possível carregar os KPIs', 'RPC_FAILED', error)
  return data as FunilKpis // typed from database.types.ts after regen
}
```

## State of the Art

| Old Approach (dead M1) | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `RelatoriosRHPage` client-side aggregation over dropped M1 concepts (disc/raven/bigfive-funnel) | `funil_kpis` DEFINER RPC (vaga-scoped, PII-safe) rendered via `@/components/ui/chart` | P32 (RPC) → P34 (dashboard) | Replace on the SAME route `/rh/relatorios`; no PII, no client aggregation. |
| Client `createSignedUrl` over `curriculos` | EF `get-curriculo-url` authenticate-THEN-authorize | P32 | The only privileged CV path; 60s TTL. |
| `rh_le_historico` role-only (P24-deferred leak) | WR-04 vaga-scoped SELECT | P32 | VISRH-03 read is horizontally isolated. |

**Deprecated/outdated:**
- Reading the KPI aggregate any way other than the RPC (client reducers) — dead pattern, being removed.
- Ordering triagem/queue parent rows by an embedded child column — never worked in PostgREST; use a flattening view.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `time_to_hire` = **median** seconds, anchored on `candidaturas.data_candidatura`, hire signal = historico `etapa_para='aprovado'` | Extending funil_kpis §1 | Wrong statistic (mean vs median) or wrong anchor → misleading TTH number; low risk (both endpoints verified in schema). |
| A2 | `drop_per_stage` closed-cohort = per-stage "exited" denominator (advanced+rejected), **all-time** window, single-arg RPC signature preserved | Extending funil_kpis §3 | If product wants a rolling inscription-date window, needs a new RPC overload/param → re-plan the migration. Confirm in discuss. |
| A3 | `knockout_rate` denominator = **all** scoped candidaturas (incl. survivors); numerator = `motivo_rejeicao='knockout_automatico'` | Extending funil_kpis §2 | If denominator should be "inscrições only excluding re-applications" the number shifts; low risk (marker is durable + server-authoritative). |
| A4 | `no_show_rate` denominator = interviews with `compareceu IS NOT NULL` (decided), excluding cancelled/pending | Extending funil_kpis §4 | If cancelled-then-rescheduled should count differently, rate shifts; low risk, matches AGEND-03 intent. |
| A5 | Work queue reads a **new** `security_invoker` view `v_fila_trabalho` (vs extending `v_triagem_panel`) | Work-Queue | Either works; if planner extends `v_triagem_panel` instead, no functional loss. CONTEXT explicitly leaves this to discretion. |
| A6 | VISRH-02 reads IA from `v_triagem_panel` (flattened) or `analise_candidato_vaga` directly, filtered by candidaturaId | Phase Requirements | Both are RLS-gated vaga-scoped; view reuse is simplest. Low risk. |

## Open Questions

1. **Closed-cohort window for drop/conversion (K4)**
   - What we know: CONTEXT locks "closed cohort by inscription window" as the *shape*; REQUIREMENTS.md:56 marks it the recommended default; exact window is researcher/planner discretion.
   - What's unclear: all-time vs rolling (e.g. last 90d) — and whether the dashboard needs a period selector (none specified this phase).
   - Recommendation: **all-time** in v1 (keeps the single-arg RPC signature + grants; no new period UI). A6/A2 flag it. If a period is later wanted, add it as a *new* RPC overload, not a replace.

2. **`time_to_hire` display unit**
   - What we know: RPC returns seconds (mirrors `median_time_per_stage`).
   - What's unclear: the metric card "Tempo até contratação" wants days.
   - Recommendation: convert client-side (`secs / 86400`, round to 1 decimal); keep the RPC in seconds for unit consistency.

3. **Live human UAT of the extended RPC in PROD**
   - What we know: the smoke proves correctness on synthetic fixtures; real PROD data (a real recruiter acct exists, `fba9bc0f`) has few hires/interviews.
   - Recommendation: run the smoke as the gate; live UAT is a nice-to-have (deferred to the human, consistent with M5/M6 UAT deferrals).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP `apply_migration`/`execute_sql` | funil_kpis extend + view + smoke | ✓ (used every M6 phase) | — | SQL Editor manual paste (D-22) + `migration repair` |
| Supabase CLI `db:types` | regen `database.types.ts` (ROOT) | ✓ (CLAUDE.md `npm run db:types`) | — | transient `as never` shim (Phase 8/11/25 precedent) until regen |
| Vitest | unit/component tests | ✓ | `^4.1.9` | — |
| Playwright | live UAT | ✓ (deferred to human) | `^1.56.1` | manual UAT |

**Missing dependencies with no fallback:** none. **With fallback:** MCP apply → SQL Editor; type regen → `as never` shim.

## Validation Architecture

> `workflow.nyquist_validation` not disabled → this section is included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.9` (happy-dom) + Playwright CT `^1.56.1` |
| Config file | `vite.config.ts` (`test:` block, `environment:'happy-dom'`, `setupFiles:['./tests/setup.ts']`, include `**/__tests__/**/*.{test,spec}.{ts,tsx}`) |
| Quick run command | `npm run test:run` (single) · `npm run lint` (tsc --noEmit) |
| Full suite command | `npm run test:run && npm run lint && npm run build` |
| SQL behavioral smoke | `supabase/tests/*.sql` run via MCP `execute_sql` (result-returning form — RAISE NOTICE invisible over MCP; STATE P33 learning) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KPI-04 | 4 new keys present, PII-free, vaga-scoped, admin bypass | **live SQL smoke** | `execute_sql` on `supabase/tests/funil34_kpis_smokes.sql` (result-returning) | ❌ Wave 0 |
| KPI-04 | no_show join vaga-scoped + 0-agendamento → `taxa=null` (no crash) | live SQL smoke | same file, dedicated assertion | ❌ Wave 0 |
| KPI-04 | knockout_rate correct on a seeded knockout candidatura | live SQL smoke | same file | ❌ Wave 0 |
| KPI-04 | drop_per_stage excludes in-progress (closed denominator) + knockout self-loop | live SQL smoke | same file | ❌ Wave 0 |
| KPI-01/03 | `v_fila_trabalho` vaga-scoped (recruiter A ≠ B's rows) + `entrou_etapa_em` = latest transition | live SQL smoke | same file (or `v_fila_trabalho_smoke.sql`) | ❌ Wave 0 |
| KPI-01/03 | SLA badge aging/breach thresholds from `entrou_etapa_em` | unit | `npm run test:run` — `slaThresholds` + badge component test (model: `ScoreCard.test.tsx`, `KanbanBoard.test.tsx`) | ❌ Wave 0 |
| KPI-02/04 | Dashboard renders metric cards + charts from RPC keys; empty/error/loading states | component (vitest+happy-dom) | `npm run test:run` | ❌ Wave 0 |
| VISRH-01 | CV button → getSignedUrl → window.open; never caches/logs URL | unit + grep guard | `npm run test:run` + existing signed-url console grep guard | partial (guard exists) |
| VISRH-02 | IA hook allowlist projection (no `select('*')`), full arrays (no slice), candidate never sees | component + grep | `npm run test:run` | ❌ Wave 0 |
| VISRH-03 | História hook allowlist read, read-only render | component | `npm run test:run` | ❌ Wave 0 |
| AGEND-02/03 | agendamentoService payload excludes trigger-stamped cols; reagendar/cancelar/compareceu semantics | unit | `npm run test:run` | ❌ Wave 0 |
| all reads | no `select('*')` in new services | grep guard | `npm run test:run` — extend `src/__tests__/guards/*.grep.test.ts` | partial |

### Sampling Rate
- **Per task commit:** `npm run test:run` (fast — happy-dom) + `npm run lint`.
- **Per wave merge:** full `npm run test:run && npm run lint && npm run build`; for the RPC/view wave, run the SQL smoke via MCP `execute_sql`.
- **Phase gate:** full suite green + `funil34_kpis_smokes` every assertion PASS (result-returning) + `database.types.ts` regenerated (tsc holds baseline) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/funil34_kpis_smokes.sql` — the load-bearing KPI-04 gate. **Reuse the `seg32_smokes.sql` harness verbatim:** synthetic recruiter A/B + admin (`vagas.created_by` has no FK → synthetic UUIDs), `set_config('request.jwt.claims', …)` JWT impersonation, per-assertion `set_config('smoke.<x>', …)` + a final `SELECT` (RAISE NOTICE invisible over MCP), the PII-leak regex `v_res::text ~* '"(ator|candidato_id|candidatura_id|candidato|nome|email|cpf|user_id)"…'`. Seed: 1 hired candidatura (transition to `aprovado`), 1 knockout (`motivo_rejeicao='knockout_automatico'`), 1 agendamento with `compareceu=false`, 1 with `compareceu IS NULL`, plus an empty vaga (0 agendamentos → `no_show_rate.taxa` must be `null` not error). ROLLBACK-free cleanup like seg32.
- [ ] `slaThresholds.ts` + badge unit test — the `SLA_POR_ETAPA` constant + aging/breach classification (pure function, trivially unit-testable).
- [ ] IA / História / agendamento service+hook tests — allowlist projection assertions (no `select('*')`, no `.slice`, correct payload shape).
- [ ] Dashboard + Fila component tests — states contract (loading/empty/error/success) via `AsyncState`/`HubSection`.
- [ ] Grep-guard extension — add the new services to the `select('*')` / trigger-stamped-column tripwires (`src/__tests__/guards/`).

## Security Domain

> `security_enforcement` enabled (this is a security-first milestone; CLAUDE.md §Security Rules). Included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Privileged CV path = EF only; KPI scope = DEFINER; queue scope = security_invoker + base RLS. No service_role in client (grep guard). |
| V4 Access Control | **yes (core)** | Vaga-scoping everywhere: `funil_kpis` internal `created_by=auth.uid()` (admin bypass); `v_fila_trabalho`/analise/historico via base-table RLS; `rh_gerencia_agendamento` WR-04 join-through. |
| V5 Input Validation | yes | Agendamento form: zod schema (data_hora future?, tipo enum, link/local by modalidade); `candidatura_id` is a route param, not free input. |
| V7 Logging | yes | **Never log the signed URL** (Pitfall 2; existing grep guard). No PII in KPI payload (regex smoke). |
| V8/V9 Data Protection | yes | KPI payload aggregates only (no candidate identity); `observacoes_rh` never in candidate projection (P33, but RH form *writes* it — fine, RH-only). |
| V6 Cryptography | no | No new crypto; signing is Supabase Storage's. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PII leak in KPI jsonb (candidate name/email in an aggregate) | Information Disclosure | `scoped_hist` PII-safe projection + the smoke's identity-key regex assertion over `funil_kpis` output. |
| Cross-recruiter KPI/queue read (horizontal) | Information Disclosure / Elevation | DEFINER internal `created_by` scope + security_invoker base RLS; smoke: recruiter A gets 0 of B's numbers. |
| CV IDOR (recruiter opens another vaga's CV) | Information Disclosure | EF authenticate-THEN-authorize (owner/admin) — shipped P32; new consumer must route through `getSignedUrl` only. |
| Spoofed `vaga_id` on agendamento write | Tampering / Elevation | `agendamento_normaliza_vaga_id` trigger overwrites; join-through RLS keyed on candidatura's real vaga. Client must not send it. |
| `select('*')` column leak on new reads | Information Disclosure | Explicit allowlist projections (RLS is row-level) — grep guard. |
| Signed URL cached/logged past 60s TTL | Information Disclosure | Imperative call, `window.open` immediately, never cache/log — grep guard. |

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20260715000002_funil_kpis_and_rh_le_historico.sql:48-147` — the live `funil_kpis` baseline (3 keys) + `rh_le_historico` WR-04. Full body read.
- `supabase/migrations/20260716000001_agendamentos_entrevista.sql:23-168` — table schema (`compareceu`, `status`, `deleted_at`), trigger, `get_meu_agendamento`.
- `supabase/migrations/20260608000001_inscricao_knockout.sql:48-247` — `candidaturas.motivo_rejeicao='knockout_automatico'` + `opcao_knockout_id` (knockout signal); `data_candidatura=now()`.
- `supabase/migrations/20260607000002_etapa_processo_v2_cutover.sql:62-71` — the 8-value `etapa_processo` enum (`inscricao…aprovado,rejeitado`).
- `supabase/migrations/20260607000001_historico_candidatura.sql:37-46` — audit-trail columns.
- `supabase/migrations/20260625100001_decisao_final_phase15.sql:139-140` — `registrar_decisao('aprovado')` → `etapa_atual='aprovado'` (the hire signal).
- `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql:62-68` — `rh_le_candidaturas` vaga-scoped SELECT (the queue view inherits this).
- `supabase/migrations/20260623000001_v_triagem_panel_orderable.sql` — the security_invoker flattening-view precedent.
- `supabase/migrations/20260610000001_analise_tables.sql:31-53` — `analise_candidato_vaga` columns + RLS.
- `supabase/tests/seg32_smokes.sql` (tail) — the result-returning JWT-impersonation smoke harness to clone; PII-leak regex assertion.
- `src/features/vagas/services/cvUploadService.ts:199-213` — `getSignedUrl(candidaturaId)` (verified signature, never-log note).
- `src/features/admin/ai-costs/components/AiCostsPage.tsx:14-53` — `ChartContainer`/`ChartConfig` + recharts primitives pattern.
- `src/features/triagem/services/triagemService.ts:60-160` — allowlist projection over `v_triagem_panel`.
- `vite.config.ts` / `package.json:104-108` — Vitest config + test scripts.
- `.planning/STATE.md` (P33 learnings) — MCP apply drift, ledger reconcile, RAISE-NOTICE-invisible-over-MCP.

### Secondary (MEDIUM confidence)
- `34-CONTEXT.md` / `34-UI-SPEC.md` — locked decisions + design contract (authoritative for UI; consumed verbatim).
- `.planning/REQUIREMENTS.md:36-58` — VISRH/KPI/AGEND definitions + K4 open decision.

### Tertiary (LOW confidence)
- None — every claim is grounded in an in-repo migration, service, or planning doc.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; every library verified resident in `package.json` and used by shipped code.
- Architecture / KPI SQL: HIGH — all 4 keys derived from verified live schema + the existing DEFINER pattern; signals (aprovado transition, knockout marker, compareceu, drop transitions) each confirmed in a migration.
- Closed-cohort exact shape (K4): MEDIUM — a genuine design decision; recommended concretely and flagged (A2) for discuss confirmation.
- Pitfalls: HIGH — 6 of 8 are grep-guarded or precedent-caught (P24/P27/P32/P33); the rest are schema-verified.

**Research date:** 2026-07-16
**Valid until:** 2026-08-15 (stable — internal codebase, no fast-moving external deps; the only volatility is the live `funil_kpis` body, which is why the `pg_get_functiondef` diff is mandatory rather than trusting this doc).

## RESEARCH COMPLETE

**Phase:** 34 - Superfícies do RH — CV/IA, Agendamento, Fila de Trabalho + KPIs
**Confidence:** HIGH (MEDIUM only on the K4 closed-cohort shape, flagged A2)

### Key Findings
- **`funil_kpis` extension is the single risk-bearing SQL.** The live body already diverged from a file once (WR-02 fix `853cb03`) → `pg_get_functiondef` diff BEFORE `CREATE OR REPLACE` is non-negotiable; re-derive from live + preserve the 3 keys/CTEs + append 4. Concrete CTE SQL provided for all 4 keys.
- **Signals pinned to live schema:** time_to_hire = historico `etapa_para='aprovado'`.criado_em − `candidaturas.data_candidatura`; knockout = `candidaturas.motivo_rejeicao='knockout_automatico'`; no_show = `agendamentos_entrevista.compareceu=false / IS NOT NULL` (join-through, CASE-guarded 0-row → `taxa=null`); drop_per_stage = closed "exited" denominator from `scoped_hist`, knockout self-loop excluded. Keep RPC single-arg (all-time cohort, v1).
- **Work queue:** recommend a new `security_invoker` view `v_fila_trabalho` exposing `entrou_etapa_em = MAX(historico.criado_em)`; RH SELECT on candidaturas is already vaga-scoped so scope is free (mirrors `v_triagem_panel`). SLA thresholds hardcoded client-side.
- **Everything else is wiring over shipped-secure primitives** (CV EF, analise/historico RLS, agendamento table+trigger). The failure mode is re-implementing one client-side and reintroducing a closed leak.
- **Validation:** one load-bearing SQL smoke `funil34_kpis_smokes.sql` (clone seg32 harness, result-returning) proves PII-safety + vaga-scope + 0-agendamento COALESCE; UI is vitest component/unit-testable; grep guards for `select('*')`, trigger-stamped cols, signed-URL logging.

### File Created
`.planning/phases/34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis/34-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Zero new deps; all verified in package.json + shipped code. |
| Architecture (KPI SQL + view) | HIGH | Derived from verified live schema + existing DEFINER/view patterns. |
| Closed-cohort shape (K4) | MEDIUM | Design decision; recommended concretely, flagged A2 for discuss. |
| Pitfalls | HIGH | Mostly grep-guarded / precedent-caught (P24/P27/P32/P33). |

### Open Questions
- K4 closed-cohort window: all-time (recommended, single-arg RPC) vs rolling — confirm in discuss (A2).
- `time_to_hire` display unit (seconds in RPC → days client-side).
- Live PROD UAT deferred to human (synthetic-fixture smoke is the gate).

### Ready for Planning
Research complete. The planner can now shape the 5 plans (34-01…34-05) with the DB-heavy funil_kpis extension either as its own plan or folded into 34-05, and the `v_fila_trabalho` view into 34-04. Every net-new SQL object has a concrete design, an apply mechanic, and a smoke.
