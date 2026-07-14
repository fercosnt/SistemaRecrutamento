# Architecture Research — M6 (Operação do Funil RH)

**Domain:** ATS funnel operation on an existing React 18 + Vite + TS-strict + Supabase codebase (v5.0 shipped). Integration-heavy, net-new OPER features on top of a shipped 6-stage funnel.
**Researched:** 2026-07-14
**Confidence:** HIGH (verified against migration files + generated `database.types.ts` + live-verified function bodies. The Supabase MCP tool is stripped from this restricted agent — upstream bug anthropics/claude-code#13898 — so LIVE checks were done via migration headers that state "verified against PROD via pg_get_functiondef", which is the authoritative reconciled source of truth in this repo, cross-checked against the generated types.)

> **Headline for the roadmapper:** M6 is almost entirely a *reuse + tighten* milestone, not a build-from-scratch one. Four of the five features integrate with primitives that already exist (`avancar_etapa()` trigger, `historico_candidatura`, `analise_candidato_vaga`, `curriculos` bucket). The real work is: (1) one clean new table for scheduling, (2) two SECURITY DEFINER read-primitives (KPIs RPC + CV signed-URL EF), (3) **closing two live horizontal-scope leaks** the milestone can't ship without (`curriculos` Storage read + `historico_candidatura` RH RLS are both still role-only), and (4) extending the existing Kanban/triagem write-path to per-stage advance/reject with justification. **Everything server-side + RLS-secured must land before any UI.**

---

## Standard Architecture

### System Overview — where M6 features attach

```
┌────────────────────────────────────────────────────────────────────────┐
│  CLIENT (React SPA, anon key only)                                       │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐     │
│  │ RH work-queue /  │   │ RH candidate     │   │ Candidate        │     │
│  │ Kanban + KPIs    │   │ view (CV + IA)   │   │ dashboard        │     │
│  └───────┬──────────┘   └───────┬──────────┘   └───────┬──────────┘     │
│          │ TanStack Query        │                       │ own-row read  │
├──────────┼──────────────────────┼───────────────────────┼───────────────┤
│  DATA ACCESS (Supabase JS, RLS-enforced)                 │               │
│  ┌───────▼──────────┐  ┌─────────▼────────┐  ┌───────────▼───────────┐   │
│  │ UPDATE           │  │ RPC funil_kpis   │  │ SELECT own candidatura│   │
│  │ candidaturas     │  │ (DEFINER,        │  │ + own historico       │   │
│  │ .etapa_atual     │  │  vaga-scoped)    │  │ + own agendamento     │   │
│  └───────┬──────────┘  └─────────┬────────┘  └───────────────────────┘   │
│          │ fires trigger          │ reads                                 │
├──────────┼──────────────────────┼───────────────────────────────────────┤
│  PRIVILEGED (Edge Functions, service_role, authenticate-THEN-authorize)  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ get-curriculo-url  (NEW — signed URL, vaga-owner authorized)       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────┤
│  POSTGRES                                                                 │
│  ┌─────────────┐  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │ candidaturas │→│ avancar_etapa()      │→│ historico_candidatura   │   │
│  │ (etapa_atual)│  │ BEFORE UPDATE trigger│  │ (KPI EVENT SOURCE)      │   │
│  └─────────────┘  └──────────────────────┘  └────────────────────────┘   │
│  ┌─────────────────────────┐  ┌────────────────────────────────────┐     │
│  │ agendamentos_entrevista │  │ analise_candidato_vaga /           │     │
│  │ (NEW)                    │  │ comparativo_solicitado / scores…   │     │
│  └─────────────────────────┘  └────────────────────────────────────┘     │
│  Storage bucket: curriculos (private, {auth.uid()}/{uuid}.pdf)           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New / Modified | Integration point |
|-----------|----------------|----------------|-------------------|
| `avancar_etapa()` trigger | Validate transition + write ONE `historico_candidatura` row per transition. **Sole owner** of audit writes. | REUSE as-is (do NOT re-author unless diffed vs live body) | `candidaturas.etapa_atual` UPDATE |
| `historico_candidatura` | Immutable event log — the KPI source of truth (from/to stage, actor, ts, justification, `auto_rejeitado`). | REUSE; **RH RLS must be tightened** (role-only → vaga-scoped) or read only via DEFINER RPC | trigger writes; KPI RPC reads |
| `updateCandidaturaEtapa` (triagemService) | Client write-path: `UPDATE candidaturas SET etapa_atual` under RLS. | MODIFY — add optional `justificativa` → `etapa_justificativa`; surface across all 6 stages | drives trigger |
| `agendamentos_entrevista` (NEW table) | Per-candidatura interview schedule (date/time/link/modality/status). | NEW | candidate own-row read; RH vaga-scoped |
| `funil_kpis` RPC (NEW, DEFINER) | Server-side, vaga-scoped, PII-safe aggregation over `historico_candidatura`. | NEW | replaces `RelatoriosRHPage` client aggregation |
| `get-curriculo-url` EF (NEW) | Authenticate-THEN-authorize (vaga owner OR admin) → service_role signed URL for `curriculos`. | NEW | closes the role-only Storage leak |
| `analise_candidato_vaga` / `comparativo_solicitado` / `scores_candidato` | AI triagem output surfaced on RH candidate view. | REUSE (already vaga-scoped since P24) | RH read; candidate DENY |

---

## Feature-by-feature integration (new vs modified + RLS per feature)

### Feature 1 — Per-stage advance/reject across ALL 6 stages

**Verdict: REUSE `avancar_etapa()` + `historico_candidatura`. Do NOT add a new write-path. Do NOT re-author the trigger.**

**How it works today (verified):** the RH funnel already moves via `triagemService.updateCandidaturaEtapa()` → a plain `UPDATE candidaturas SET etapa_atual = ..., status = ...` through the **anon client under RLS**. The `avancar_etapa()` BEFORE-UPDATE trigger fires inside that same transaction and:
- allows forward/skip-ahead freely; allows terminals (`aprovado`/`rejeitado`) from any stage;
- **requires a non-empty `etapa_justificativa` for regressions** (moving backward by enum ordinal) — else `RAISE EXCEPTION`;
- holds a forward advance *past* `entrevista_online` while an `entrevista_analises` row has `bloqueio_avanco=true AND revisao_confirmada_em IS NULL` (the ENTREV-03 bias-review flag guard — **the exact guard a past migration silently dropped**);
- writes exactly ONE `historico_candidatura` row with `ator = auth.uid()` and a GUC-gated `auto_rejeitado`.

So "per-stage advance/reject across all 6 stages" is **almost entirely a UI/wiring delta over an already-correct server primitive.** The M4/P25 Kanban already uses this path; M6 exposes explicit per-stage advance + reject controls on every stage (today they are concentrated on the triagem/comparativo surface).

**What to MODIFY:** extend `updateCandidaturaEtapa` to accept an optional `justificativa` and write it to `etapa_atual` + `etapa_justificativa` in the same UPDATE. The trigger copies `etapa_justificativa` → `historico_candidatura.criterio_texto`, so the audit trail captures the reason with zero extra writes.

**Avoiding the double-write bug (the Phase-8 regression):** the historical bug wrote `historico_candidatura` *explicitly* AND let the trigger fire → 2 rows. **Invariant for M6: NO code path may INSERT into `historico_candidatura` directly.** The trigger is the sole owner. Every advance/reject is expressed as a `candidaturas` UPDATE and nothing else. (The one sanctioned exception — the knockout row in `submit_candidatura_atomic` — is out of M6 scope and is structured to not double-fire because it leaves `etapa` unchanged.)

**Keeping RNF-07a intact:** advance/reject here is always human-initiated → `ator = auth.uid()` is non-null → the GUC-gated `auto_rejeitado` predicate evaluates FALSE. No score-driven auto-rejection path is added. The `guard_rejeicao_auditada` backstop (P25) and the ENTREV-03 flag guard remain untouched.

**⚠ Live-function caveat (explicit, per the DBMIG-02 near-miss):** if any M6 migration must `CREATE OR REPLACE avancar_etapa()`, **first dump the live body with `pg_get_functiondef` and diff it** — a P27 draft re-derived the function from the Phase-6 base and silently dropped the ENTREV-03 flag guard; it was caught pre-apply. The current authoritative body is `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` (which states it reproduces the verified-against-PROD body). **Preferred M6 posture: do NOT touch the trigger at all** — the reject-with-justification feature needs zero trigger changes.

**Legacy-RPC trap:** `database.types.ts` still exposes an M1-era `avancar_etapa(candidatura_uuid, usuario_rh_uuid)` overload and `rejeitar_candidato(candidatura_uuid, motivo, usuario_rh_uuid)` — **neither has a migration file and neither is the live write-path.** Do NOT wire M6 to these. The direct-UPDATE-fires-trigger path is the audited one.

**RLS status:** `candidaturas` UPDATE is already vaga-scoped (P24 `rh_avanca_etapa`: admin bypass OR `vaga_id IN (SELECT id FROM vagas WHERE created_by = auth.uid())`, in both USING and WITH CHECK). ✅ No change needed for advance/reject authorization.

---

### Feature 2 — Interview scheduling (in-system, candidate sees on dashboard, no email)

**Verdict: NEW lean table `agendamentos_entrevista`. Do NOT reuse the legacy `entrevistas_online` table. Do NOT add columns to `candidaturas`.**

**Why not `entrevistas_online`:** it exists with the exact fields (`data_agendada`, `link_videochamada`, `status`, `agendado_por`), but it is the **legacy M1 table explicitly documented as "untracked, unaudited-RLS"** (migration `20260624000001` header). Reusing it means auditing/rewriting all its policies anyway, and it drags in M1 baggage (`transcricao`, `gravacao_url`, `analise_ia`) that overlaps and conflicts with the M2-native `entrevista_analises` table → drift risk. Comparable effort to a clean table, more surface area, more confusion.

**Why not columns on `candidaturas`:** (a) can't cleanly model reschedules or an online-then-presential sequence (1:N); (b) the candidate's own-row `candidaturas` SELECT projects a limited allowlist — bolting a link/date onto that row muddies the projection boundary; (c) bloats the hottest table.

**Recommended table shape** (`agendamentos_entrevista`):

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid pk | |
| `candidatura_id` | uuid FK → candidaturas | scoping anchor |
| `modalidade` | enum(`online`,`presencial`) | reuse concept from the 2 legacy interview tables |
| `data_hora` | timestamptz | the scheduled slot |
| `link_videochamada` | text null | online only; candidate-visible |
| `local` | text null | presential only; candidate-visible |
| `status` | reuse `status_entrevista` enum (`agendada`/`reagendada`/`cancelada`/…) | already exists |
| `observacoes_rh` | text null | **RH-only, must NOT be projected to candidate** |
| `agendado_por` | uuid FK → usuarios_rh | actor |
| `created_at`/`updated_at`/`deleted_at` | timestamptz | soft-delete for reschedule history |

**RLS (both directions, per feature):**
- **RH write/read — vaga-scoped (WR-04 predicate, NOT role-only):**
  `administrador` bypass OR `candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id = c.vaga_id WHERE v.created_by = auth.uid())`. This is the exact join-scoped predicate P24 used for `redacoes_candidato` (which also has no direct `vaga_id`). Apply to SELECT/INSERT/UPDATE with USING + WITH CHECK.
- **Candidate read — own-row only, PII-safe projection:**
  candidate SELECT policy: `candidatura_id IN (SELECT id FROM candidaturas WHERE candidato_id IN (SELECT id FROM candidatos WHERE user_id = auth.uid()))`. **But RLS is row-level, not column-level** ([[reference_select_star_leaks_pii]]) — so the candidate client must read an **explicit allowlist** (`modalidade, data_hora, link_videochamada, local, status`) and NEVER `select('*')`, because `observacoes_rh` is on the same row. Belt-and-suspenders: consider a `get_meu_agendamento(candidatura_id)` DEFINER RPC returning only candidate-safe columns if the projection discipline is deemed fragile.

**How the candidate dashboard reads it:** the candidate hub (`HubCandidatoRH`) is already `etapa_atual`-driven and takes a `contexto` prop assembled from the candidate's own `candidaturas` row (read via the `candidato_le_propria_candidatura` own-row policy). Scheduling slots in as: when `etapa_atual ∈ {entrevista_online, entrevista_presencial}`, fetch the latest non-deleted `agendamentos_entrevista` own-row and render date/link in the existing "Próximo passo" turquoise CTA. No email, no push — pure dashboard read, matching the COMM-out-of-scope constraint.

**RH action:** create/reschedule/cancel is a plain insert/update to `agendamentos_entrevista` under vaga-scoped RLS (no EF needed — no service_role, no privileged read). Optionally the RH scheduling action ALSO advances `etapa_atual` to the interview stage in the same flow (two independent writes; the funnel move fires the trigger as usual).

---

### Feature 3 — CV + AI-analysis visible to RH

**Two sub-parts with very different security postures.**

**3a. AI analysis (`analise_candidato_vaga.score_match/resumo/gaps/flags` + `comparativo_solicitado` + `scores_candidato`):**
- **Already vaga-scoped since P24** (`rh_le_analise`, `rh_le_comparativo` = admin bypass OR owns vaga). Candidate has DENY (no SELECT policy). ✅
- This is a **read-only wiring feature**: surface the already-stored analysis on the RH candidate view. No new table, no new RLS, no leak to the candidate (candidate simply has no read path to these tables). Confirm the RH client reads an explicit column allowlist (not `select('*')`) to stay disciplined.

**3b. CV file (private `curriculos` bucket) — ⚠ CONTAINS A LIVE HORIZONTAL LEAK M6 MUST CLOSE:**
- The `curriculos` Storage SELECT policy is **role-only**: `role IN ('rh','administrador')` reads **ANY** candidate's CV — the exact horizontal-scope class P24 fixed for the analysis tables but **never fixed for Storage.** A recruiter can currently download the CV of a candidate on a vaga they don't own. Path schema is `{auth.uid()}/{uuid}.pdf` (candidate's auth.uid() as folder), so the object row carries no `vaga_id`.
- **Recommended fix (matches the codebase's authenticate-THEN-authorize precedent): a new EF `get-curriculo-url`.** It (1) `getUser()` authenticates, (2) resolves role from `usuarios_rh` + authorizes **vaga ownership** (the candidatura's `vaga.created_by = rh.user_id` OR admin), then (3) mints a short-lived `createSignedUrl(path, ~60s)` with service_role. This mirrors the comparativo-EF IDOR guard ([[reference_ef_authenticate_vs_authorize]]) and avoids a gnarly 4-table JOIN inside a Storage RLS predicate that runs per-object. `candidaturas.curriculo_url` already stores the object path.
- **Critically, ALSO remove the blanket role-only RH read from the Storage policy** so the EF becomes the *only* RH path (otherwise a recruiter can still `createSignedUrl` client-side and bypass the EF). Candidate own-folder read/write/delete policies stay as-is. Net: one vaga-scoped path to a CV, matching the RLS-vaga-scoped invariant.
- **Do not leak to candidate:** candidate keeps own-folder access only (unchanged); the analysis tables remain DENY for candidates.

---

### Feature 4 — Funnel KPIs (work-queue + operational metrics)

**Verdict: SECURITY DEFINER RPC (or a small set) over `historico_candidatura`, vaga-scoped inside the function. NOT client-side aggregation. NOT an unguarded SQL view.**

**Why server-side is mandatory here (security, not just performance):** `historico_candidatura`'s RH SELECT policy `rh_le_historico` is **still role-only** — P24 explicitly *deferred* tightening it to the "Phase 25 funil-RH sweep," and no migration ever swept it (verified: no `historico_candidatura` POLICY exists in any migration after the P24 deferral note). So **any client-side aggregation over `historico_candidatura` would read every vaga's events → a horizontal KPI leak.** The current `RelatoriosRHPage.tsx` does exactly this kind of client-side `.from('candidaturas')` aggregation (the "M1 dead dashboard" the M5-DRAFT calls out) and should be replaced.

Two acceptable ways to make it safe; **recommend the DEFINER RPC**:
1. **`funil_kpis(...)` SECURITY DEFINER + `SET search_path=''`** that filters to the caller's owned vagas *inside* the function (`WHERE v.created_by = auth.uid()` unless admin). PII-safe (returns only aggregate counts/durations, no candidate identity), vaga-scoped by construction, and independent of the still-loose table RLS. Matches the pattern already used everywhere (`pontuar_sjt`, `get_avaliacao_status`, the KPI-style DEFINER functions).
2. *(Alternative / complementary)* Tighten `rh_le_historico` to the WR-04 vaga-scoped predicate AND expose a plain SQL view. Lower-effort but the view must still be vaga-scoped, and aggregation-in-the-client is chattier. Prefer the RPC; optionally tighten `rh_le_historico` anyway as defense-in-depth (it is a latent leak regardless of M6).

**Query shapes (sketch — all over `historico_candidatura`, joined to `candidaturas`→`vagas` for scope):**

- **Volume per vaga/stage** — count of candidaturas that ever reached each stage:
  ```sql
  SELECT v.id AS vaga_id, h.etapa_para AS etapa, count(DISTINCT h.candidatura_id) AS volume
  FROM historico_candidatura h
  JOIN candidaturas c ON c.id = h.candidatura_id
  JOIN vagas v ON v.id = c.vaga_id
  WHERE (<is_admin> OR v.created_by = auth.uid())
  GROUP BY v.id, h.etapa_para;
  ```
- **Conversion (stage N → N+1)** — reached(N+1) / reached(N), computed from the volume-per-stage counts above using the `etapa_processo` enum ordinal ordering (forward stages only; terminals `aprovado`/`rejeitado` handled separately).
- **Time-in-stage** — timestamp delta between a candidatura's consecutive transitions, via `LEAD` over the ordered event stream:
  ```sql
  SELECT h.candidatura_id, h.etapa_de AS etapa,
         lead(h.criado_em) OVER (PARTITION BY h.candidatura_id ORDER BY h.criado_em) - h.criado_em AS tempo_na_etapa
  FROM historico_candidatura h
  -- then aggregate avg/median tempo_na_etapa per etapa, scoped to owned vagas
  ```
  (Current in-flight candidaturas: `now() - criado_em` of the last transition gives time-in-current-stage for the work-queue view.)

**Work-queue view:** the "fila de trabalho real" is a filtered/sorted `candidaturas` read (already vaga-scoped) — e.g. per-stage buckets sorted by time-in-current-stage — powered by the same DEFINER RPC or a scoped `candidaturas` query, joined to `analise_candidato_vaga.score_match` for triage ordering.

---

### Feature 5 — Reject from comparativo with mandatory justification (funil-02, tech-debt)

**Verdict: a thin variant of Feature 1 — same write-path, justification made mandatory at the UI/service layer.**

The comparativo screen already has inline advance/reject actions calling `updateCandidaturaEtapa`. funil-02 adds: reject-from-comparativo **requires a non-empty justification**, written to `etapa_justificativa` (→ `historico_candidatura.criterio_texto` via the trigger) and optionally mirrored to `candidaturas.motivo_rejeicao`. `ator = auth.uid()` (human) → `auto_rejeitado=false`, RNF-07a preserved, full audit trail. **No new server primitive** — enforce the "justification non-empty" rule in the service/Zod schema, since the trigger only *requires* justification for regressions, not terminals. This is the smallest feature; it rides entirely on Feature 1's plumbing.

---

## Architectural Patterns (established in this codebase — reuse verbatim)

### Pattern 1: Funnel move = `UPDATE candidaturas.etapa_atual`; trigger owns the audit
**What:** never write `historico_candidatura` from application code. Express every transition as a scoped UPDATE; the BEFORE-UPDATE trigger validates + audits atomically.
**When:** all M6 advance/reject/schedule-then-advance flows.
**Trade-off:** one indivisible audit row per transition; impossible to double-write **as long as** no code also INSERTs history.
```ts
// MODIFY: add optional justificativa; still ONE write, trigger does the rest
await supabase.from('candidaturas')
  .update({ etapa_atual: novaEtapa, ...(novaEtapa === 'rejeitado' && { status: 'rejeitado' }), etapa_justificativa: justificativa ?? null })
  .eq('id', candidaturaId)   // RLS vaga-scopes; trigger writes historico_candidatura
```

### Pattern 2: WR-04 vaga-scoped RLS predicate (admin bypass OR owns-vaga), never role-only
**What:** every RH-facing SELECT/UPDATE policy uses `(auth.jwt() #>> '{app_metadata,role}') = 'administrador' OR (= 'rh' AND vaga_id IN (SELECT id FROM vagas WHERE created_by = auth.uid()))`; join through `candidaturas` when the table has no direct `vaga_id`.
**When:** the new `agendamentos_entrevista` table; tightening `historico_candidatura` and `curriculos` Storage.
**Trade-off:** slightly heavier predicate, but it is the only thing that stops horizontal IDOR — behavioral smokes (impersonated JWT) caught role-only / OR-defeat leaks that structural checks missed.

### Pattern 3: Privileged read = authenticate-THEN-authorize Edge Function
**What:** service_role EF that `getUser()`s, resolves role from `usuarios_rh`, checks vaga ownership, THEN acts. Authentication ≠ authorization ([[reference_ef_authenticate_vs_authorize]]).
**When:** `get-curriculo-url` signed-URL EF.
**Trade-off:** more moving parts than client-side, but centralizes authorization and keeps service_role off the client (hard security rule).

### Pattern 4: SECURITY DEFINER RPC for reads that must ignore loose table RLS
**What:** DEFINER + `SET search_path=''`, vaga-scope *inside* the function body, return PII-safe aggregates.
**When:** `funil_kpis`; optional `get_meu_agendamento` candidate projection.

---

## Data Flow — the three new/changed flows

1. **RH advances/rejects a candidatura (all stages):**
   `RH action → updateCandidaturaEtapa(id, etapa, justificativa?) → UPDATE candidaturas (RLS vaga-scoped) → avancar_etapa() trigger validates + INSERT historico_candidatura (ator=auth.uid()) → TanStack Query invalidates Kanban + KPIs`
2. **RH schedules an interview; candidate sees it:**
   `RH form → INSERT/UPDATE agendamentos_entrevista (RLS vaga-scoped) [+ optional etapa advance] → candidate dashboard SELECT own-row agendamento (allowlist) → render date/link in "Próximo passo"`
3. **RH opens a candidate's CV + AI analysis:**
   `RH candidate view → SELECT analise_candidato_vaga/comparativo (already vaga-scoped) + invoke get-curriculo-url EF (authorize vaga owner → service_role signed URL) → render signed link (~60s)`

---

## Anti-Patterns (specific to this integration)

### Anti-Pattern 1: Explicitly INSERT-ing `historico_candidatura` alongside a funnel UPDATE
**What people do:** "record the transition" by writing history in the service, on top of the trigger. **Why wrong:** double-write (the exact Phase-8 bug) — two audit rows, corrupt KPIs. **Instead:** only UPDATE `candidaturas`; the trigger is the sole writer.

### Anti-Pattern 2: `CREATE OR REPLACE avancar_etapa()` from a migration file without diffing the live body
**What people do:** re-author the trigger from an old migration. **Why wrong:** silently drops guards the live body accreted (the ENTREV-03 flag guard — a real near-miss). **Instead:** don't touch the trigger for M6; if unavoidable, `pg_get_functiondef` first and diff.

### Anti-Pattern 3: Client-side aggregation over `historico_candidatura` for KPIs
**What people do:** `.from('historico_candidatura').select(...)` and aggregate in JS (like the M1 `RelatoriosRHPage`). **Why wrong:** RH RLS on that table is still role-only → every vaga's events leak. **Instead:** DEFINER RPC that vaga-scopes internally.

### Anti-Pattern 4: Shipping CV visibility / KPIs on the existing role-only policies "because it works"
**What people do:** reuse the role-only `curriculos` Storage read / role-only `historico` RLS. **Why wrong:** both are live horizontal leaks. **Instead:** close them as part of the feature (EF + tightened Storage policy; DEFINER RPC or tightened `rh_le_historico`).

### Anti-Pattern 5: `select('*')` on any row a candidate can read (scheduling, own candidatura)
**What people do:** read the whole row. **Why wrong:** RLS is row-level, not column-level; `observacoes_rh` / internal fields leak ([[reference_select_star_leaks_pii]]). **Instead:** explicit candidate-safe allowlist (or a DEFINER projection RPC).

### Anti-Pattern 6: Wiring to the legacy `avancar_etapa(uuid,uuid)` / `rejeitar_candidato(uuid,text,uuid)` RPCs
**What people do:** call the RPCs that appear in `database.types.ts`. **Why wrong:** M1-era, no migration file, not the audited live path. **Instead:** the direct-UPDATE path.

---

## Integration Points

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| RH Kanban (P25) ↔ per-stage controls (M6) | Both call `updateCandidaturaEtapa` (extended) | **Reconcile: one shared service, one write-path.** M6 generalizes the existing action from the triagem/comparativo surface to all-stage controls; do not fork a second advance path. |
| Scheduling ↔ funnel | Independent writes; optionally sequenced | Scheduling is its own table; advancing to the interview stage is a separate `candidaturas` UPDATE. |
| CV/analysis (RH) ↔ candidate | Hard DENY wall | Analysis tables have no candidate SELECT; CV via own-folder only; scheduling via allowlist. |
| KPIs ↔ `historico_candidatura` | DEFINER RPC only | Table RLS stays loose unless separately tightened. |

### External services

| Service | Integration pattern | Notes |
|---------|---------------------|-------|
| Supabase Storage (`curriculos`) | signed URL via authorize-first EF | Private bucket; **role-only read is a leak to close**. |
| Supabase Auth (JWT `app_metadata.role`) | RLS predicates + EF role resolution | `role` claim + `created_by` ownership is the scoping basis. |
| Migrations → PROD | Supabase MCP `apply_migration`/`execute_sql` | Bypasses 42601 on PL/pgSQL `$$` bodies; no BEGIN/COMMIT wrapper; MCP writes the version row (reconcile ledger). |

---

## Recommended Build Order (security-first: data + RLS before UI)

The roadmapper should decompose into phases in this dependency order. **Every server + RLS item lands and is smoke-verified (impersonated-JWT behavioral smokes) before its UI.**

1. **Phase A — Advance/reject + reject-with-justification (Features 1 & 5).** Lowest risk, highest reuse. Server: none new (trigger + RLS already correct). Service: extend `updateCandidaturaEtapa` with justification; enforce mandatory-justification-on-comparativo-reject in Zod. Then UI: per-stage controls across all 6 stages + comparativo reject dialog. Reconcile with the P25 Kanban (shared service). *No trigger edits.*
2. **Phase B — Security tightening for the read features (blocking prerequisites).** (a) Close the `curriculos` Storage role-only leak + build the `get-curriculo-url` EF (authenticate-THEN-authorize); (b) create the `funil_kpis` DEFINER RPC (and optionally tighten `rh_le_historico`). Ship these server-side + smoke-verified *before* the views that consume them.
3. **Phase C — Scheduling data layer (Feature 2).** New `agendamentos_entrevista` table + vaga-scoped RH RLS + candidate own-row read (allowlist / projection RPC). Smoke: RH-owns-vaga writes; non-owner denied; candidate reads own only; candidate cannot see `observacoes_rh`.
4. **Phase D — RH surfaces (UI).** RH candidate view (CV signed-URL + AI analysis wiring) + scheduling form; work-queue + KPI dashboard consuming the Phase-B RPC (replacing the M1 `RelatoriosRHPage` aggregation).
5. **Phase E — Candidate dashboard read (UI).** Surface the schedule (date/link) in `HubCandidatoRH`'s "Próximo passo" for interview stages. Pure own-row read; no email (COMM out of scope).

**Ordering rationale:** Feature 1 is pure reuse (fast win, de-risks the milestone). The two live leaks (Storage + `historico` RLS) gate Features 3 & 4 — they must be closed server-side before any consuming UI, or the milestone ships an IDOR. Scheduling's data layer + RLS precede both its RH and candidate UIs. Candidate-facing read is last because it depends on the scheduling table + RLS being proven safe.

---

## Scaling Considerations

| Scale | Architecture adjustments |
|-------|--------------------------|
| Current (single-tenant Beauty Smile, low hundreds of candidaturas) | Everything above is right-sized. KPI RPC computes on-read over `historico_candidatura`; no materialization needed. |
| 10× volume | Add an index on `historico_candidatura(candidatura_id, criado_em)` for the `LEAD`/time-in-stage window; index `candidaturas(vaga_id, etapa_atual)` for work-queue filters (likely already present from M2). |
| 100× / heavy dashboards | Consider a materialized KPI rollup refreshed on a schedule (or trigger on `historico_candidatura` insert) if the on-read RPC latency grows; not warranted now. |

**First bottleneck:** the time-in-stage window function over a large `historico_candidatura` — fix with the composite index above before any materialization.

---

## Sources

- `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` — current authoritative `avancar_etapa()` body (header: "verified against PROD via pg_get_functiondef"); ENTREV-03 flag guard, GUC-gated `auto_rejeitado`, RNF-07a rationale. **HIGH.**
- `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql` — WR-04 vaga-scoped predicate for `candidaturas`/`analise`/`comparativo`/`redacoes`; explicit deferral of `historico_candidatura` + `devolutivas_candidato` (still role-only). **HIGH.**
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql` — baseline `candidaturas` + `historico_candidatura` RLS (role-only origin); trigger-owns-audit note. **HIGH.**
- `supabase/migrations/20260425000002_curriculos_bucket.sql` — private bucket config + **role-only RH Storage read (the live leak)**; `{auth.uid()}/{uuid}.pdf` path schema. **HIGH.**
- `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql` — `entrevistas_online`/`entrevistas_presenciais` flagged legacy/"untracked, unaudited-RLS"; M2-native interview tables. **HIGH.**
- `src/features/triagem/services/triagemService.ts` (`updateCandidaturaEtapa`, L286–378) — current RH funnel write-path (direct UPDATE fires trigger). **HIGH.**
- `database.types.ts` (repo root) — `candidaturas`, `historico_candidatura`, `entrevistas_online`, `analise_candidato_vaga`, `comparativo_solicitado`, `scores_candidato`, `vagas`, enums `etapa_processo`/`status_candidatura`/`status_entrevista`; legacy `avancar_etapa(uuid,uuid)`/`rejeitar_candidato(uuid,text,uuid)` RPC overloads. **HIGH.**
- `src/components/pages/RelatoriosRHPage.tsx` — existing client-side aggregation (the M1 dashboard the KPI RPC replaces). **HIGH.**
- Auto-memory: [[reference_select_star_leaks_pii]], [[reference_ef_authenticate_vs_authorize]], Phase-8 double-write bug, DBMIG-02 flag-guard near-miss. **HIGH.**

---
*Architecture research for: M6 Operação do Funil RH (integration on shipped v5.0 ATS)*
*Researched: 2026-07-14*
