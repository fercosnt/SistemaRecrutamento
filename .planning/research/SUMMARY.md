# Project Research Summary

**Project:** Sistema de Recrutamento Beauty Smile — M6 "Operação do Funil RH" (v6.0)
**Domain:** ATS funnel-OPERATION features (advance/reject, in-app interview scheduling, RH CV/AI visibility, operational KPIs) added to an already-shipped 6-stage recruiting funnel
**Researched:** 2026-07-14
**Confidence:** HIGH

## Executive Summary

M6 does not build an ATS — it builds the **esteira** (conveyor) that makes an already-evaluative funnel *move* under RH's hand. Four research dimensions (stack, features, architecture, pitfalls) converged independently on the same conclusion: this is a **reuse-and-tighten milestone**, not a build-from-scratch one. Every UI capability M6 needs — KPI charts, date/time entry with `America/Sao_Paulo` display, PDF-in-new-tab CV viewing, justification-required forms — is covered by a library already installed and, in most cases, already used elsewhere in this exact codebase (recharts + shadcn `chart.tsx`, date-fns + native `Intl`, `entrevista_agendada_em`-style timestamptz columns, `cvUploadService.getSignedUrl`). **Net-new npm dependencies for M6: zero.** On the data side, the entire event log (`historico_candidatura`) and the sole write-owner (`avancar_etapa()` BEFORE-UPDATE trigger) already exist from Phase 6 and have accreted correctness guards across four milestones (regression-justification RAISE, the ENTREV-03 anti-bias flag hold, GUC-gated `auto_rejeitado`). M6's job is almost entirely wiring: one new table (`agendamentos_entrevista`), two new read-primitives (an EF for CV signed URLs, a SECURITY DEFINER RPC for KPIs), and UI surfacing existing data (CV, AI analysis, funnel history) that today no RH screen renders.

The recommended approach is **security-before-UI**. Two research dimensions (architecture, pitfalls), reading the same migration files independently, confirmed the SAME two live horizontal-scope leaks that M6 cannot ship around: (1) the private `curriculos` Storage bucket's RH SELECT policy is role-only (`role IN ('rh','administrador')`) with no vaga scoping, so any recruiter can already download any candidate's CV; (2) `historico_candidatura`'s RH SELECT policy (`rh_le_historico`) is *also* still role-only — Phase 24 explicitly deferred its re-scope to "the Phase 25 funil-RH sweep" and no migration ever did it. Since M6's headline KPI/work-queue feature is the first feature to seriously query `historico_candidatura`, it would silently ship a cross-recruiter data leak unless closed first. The correct fix for both is *not* a client-side RLS tweak in isolation but a matching read-primitive: an EF that authenticates-THEN-authorizes vaga ownership before minting a short-TTL signed URL (mirrors the existing comparativo-EF IDOR fix), and a SECURITY DEFINER `funil_kpis` RPC that scopes to owned vagas *inside* the function body (so aggregation is safe independent of the underlying table RLS).

The second major risk axis is **audit-trail integrity**, and it is entirely process, not technology: this codebase has a *confirmed historical bug* (the Phase-8 "survivor double-write") where application code explicitly `INSERT`ed into `historico_candidatura` alongside a trigger that already writes it — corrupting every KPI that counts transitions. M6's per-stage advance/reject work must follow one invariant with zero exceptions: **no M6 code path ever INSERTs `historico_candidatura` directly** — every transition is expressed as a plain `UPDATE candidaturas.etapa_atual` (+ optional `etapa_justificativa`) and the trigger is the sole writer. A closely related risk: if any M6 migration needs `CREATE OR REPLACE avancar_etapa()`, it must diff against the LIVE function body (`pg_get_functiondef`) first — a Phase-27 draft nearly shipped a re-authored trigger that silently dropped the live ENTREV-03 bias-review guard. The safest posture, which the architecture research recommends and the pitfalls research corroborates, is: **don't touch the trigger for M6 at all** — reject-with-justification, per-stage advance, and funil-02 all ride on the existing trigger unmodified, enforcing "justification required" at the RPC/service layer instead.

## Key Findings

### Recommended Stack

Full detail: `.planning/research/STACK.md`. Headline: **zero net-new dependencies.** Every M6 UI need maps to an already-installed, already-used library.

**Core technologies (all reused, none added):**
- `recharts@^2.15.2` via the vendored shadcn `@/components/ui/chart.tsx` wrapper — KPI charts (time-in-stage, conversion, volume). Already live in `RelatoriosRHPage.tsx`. **Do not upgrade to recharts v3** (breaking migration, the shadcn wrapper targets v2, zero M6 feature benefit).
- `date-fns@^2.30.0` + native `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })` — the exact timezone-render idiom M6 scheduling needs is already written in `EntrevistaDashboard.tsx` (`formatDataHora`, the 24h-marker helper). No `date-fns-tz` needed (single-tenant, fixed IANA zone, DST abolished in Brazil since 2019).
- `react-day-picker@^8.10.1` (shadcn `ui/calendar.tsx`) + native `<input type="time">` inside a `ui/popover.tsx` — RH's interview date/time entry. No dedicated time-picker library.
- `cvUploadService.getSignedUrl(path)` — already built for exactly this ("Used by RH to view/download CVs"), 55-min TanStack Query staleTime against a 3600s signed-URL TTL. Browsers render PDFs natively → open-in-new-tab, no `react-pdf`/`pdfjs` needed.
- `react-hook-form + zod + @hookform/resolvers`, `sonner`, `zustand`, `@tanstack/react-query@^5.90.10` — established form/state/toast stack for the justification-required reject form and all data fetching.
- Supabase Edge Functions + SECURITY DEFINER RPCs — the privileged-write/privileged-read pattern for KPI aggregation and CV signed URLs.

**Explicit anti-scope:** no 2nd charting library, no external scheduling SDK (FullCalendar/Cal.com/MS Bookings — MS Bookings is already deferred to "Future"), no email/notification infra (Resend/SMTP — COMM is out of scope), no timezone library, no PDF viewer library, no dedicated time-picker.

### Expected Features

Full detail: `.planning/research/FEATURES.md`. Confidence: HIGH for advance/reject, CV/AI visibility, and KPI definitions; MEDIUM for work-queue UX specifics and the deliberate no-email scheduling divergence (this milestone intentionally departs from the Greenhouse/Ashby/Workable market pattern, which is email-driven).

M6 = five capabilities (C1–C5) layered onto a funnel that already has the data backbone (`historico_candidatura`, `registrar_decisao`, `etapa_processo`) from Phase 6.

**Must have (table stakes):**
- **C1 — Advance/reject per-stage, all 6 stages** (today concentrated on stage 5/Kanban) — confirm dialog, unified auditable write, structured rejection reason (enum) **plus** mandatory free-text justification ≥50 chars (not dropdown-only — a generic dropdown is a documented compliance anti-pattern).
- **C5 — Reject-from-comparativo with justification (funil-02 tech-debt)** — today the comparativo's reject/advance buttons are literal no-ops (AlertDialog confirms, nothing happens) — "the worst class of trust bug." Cheapest application of C1's unified write path.
- **C3 — CV + full AI analysis visible to RH** — today NO RH surface opens the CV (`createSignedUrl` never called outside candidate flow) and AI strengths/gaps are truncated to 2 items; the human currently "decides" without auditing what the AI saw, undermining RNF-07a in practice.
- **C4 — Work-queue (cross-vaga, priority-sorted) + operational KPIs** — the dashboard today shows counters over a dead M1 model (nonexistent columns, hardcoded zeros). K2 (aging/SLA breach) is "the first real SLA badge the system has had."
- **C2 — Minimal interview scheduling** (date/time + link-or-local, RH-entered) with a **candidate-visible dashboard card** — no email exists this milestone, so the panel is the *only* notification channel.

**Should have (differentiators, v1.x / P2 priority):**
- Audited backward-move (regression) between stages.
- `.ics` client-side download + a 24h-reminder badge on the candidate panel (both substitute for what market ATS do via email).
- `compareceu` (attendance) field → unlocks the no-show KPI (K10), which is NOT computable without it.
- time-to-hire (K6), knockout rate (K7), per-stage drop rate (K8).
- "Manter no banco de talentos" flag on reject (the actual talent-pool feature is M7+).

**Defer (explicitly out of M6 / backlog):**
- COMM: any email/notification pipeline, interview invites, `.ics`-by-email.
- Self-scheduling (Calendly-style), two-way calendar sync, MS Bookings OAuth, hosted video rooms.
- Full report suite + CSV/PDF export (M6 ships on-screen KPIs only).
- Source-of-hire by vaga (data not collected today; `como_conheceu` is self-reported, not per-vaga).
- Removing the legacy M1 `RelatoriosRHPage` recharts suite is flagged as a P2 confidence-building cleanup, not launch-blocking.

**Two artifacts, not one — keep both:** the M4/P25 Kanban ("where is everyone in THIS vaga") and the new cross-vaga work-queue ("what needs MY action now, ranked by aging/SLA") answer different questions for different moments; M6 adds the work-queue without touching the Kanban.

**10 KPI definitions are computable today directly over `historico_candidatura`** (median not mean — the distribution is right-skewed; cohort-basis for conversion is explicitly a requirements-phase decision) — the sole exception is no-show, gated on the new `compareceu` field from scheduling.

### Architecture Approach

Full detail: `.planning/research/ARCHITECTURE.md`. M6 attaches to four existing pillars — `candidaturas.etapa_atual` + `avancar_etapa()` trigger + `historico_candidatura` (the funnel/audit backbone), `curriculos` Storage bucket, `analise_candidato_vaga`/`comparativo_solicitado`/`scores_candidato` (AI outputs, already vaga-scoped since P24), and the RH client service layer (`triagemService.ts`) — and adds exactly one new table plus two new read-primitives.

**Major components:**
1. `avancar_etapa()` BEFORE-UPDATE trigger (**REUSE verbatim, do not `CREATE OR REPLACE`**) — sole owner of `historico_candidatura` writes; already carries the regression-justification RAISE, the ENTREV-03 anti-bias flag guard, and the GUC-gated `auto_rejeitado` predicate that preserves RNF-07a.
2. `updateCandidaturaEtapa` (triagemService) — **MODIFY** to accept an optional `justificativa` written to `etapa_justificativa` in the same UPDATE (the trigger copies it into `historico_candidatura.criterio_texto` for free); generalize this ONE service to drive per-stage controls across all 6 stages instead of forking a second write path.
3. `agendamentos_entrevista` (**NEW table**) — lean, purpose-built for M6 scheduling (`candidatura_id`, `modalidade`, `data_hora timestamptz`, `link_videochamada`/`local`, `status`, `observacoes_rh` [RH-only], `agendado_por`). Explicitly **not** a reuse of the legacy `entrevistas_online`/`entrevistas_presenciais` tables (flagged "untracked, unaudited-RLS" M1 baggage) nor new columns on `candidaturas` (can't model reschedules; muddies the candidate's own-row projection).
4. `get-curriculo-url` EF (**NEW**) — authenticate-THEN-authorize (vaga owner OR admin) → service_role `createSignedUrl` with a short TTL. Closes the CV leak; must be paired with **removing** the blanket role-only Storage read policy so the EF becomes the only RH path.
5. `funil_kpis` RPC (**NEW**, SECURITY DEFINER, `SET search_path=''`) — vaga-scopes internally over `historico_candidatura`, returns PII-safe aggregates only. Replaces the `RelatoriosRHPage` client-side aggregation model.

### Critical Pitfalls

Full detail: `.planning/research/PITFALLS.md` (17 pitfalls, all grounded in cited migration files/line numbers). Top risks for the roadmapper:

1. **Double-writing `historico_candidatura`** — a confirmed historical bug class (Phase-8 survivor double-write). Fix: never `INSERT` into it from app code; every transition is a plain `candidaturas` UPDATE and the trigger writes exactly one row.
2. **Bypassing the audit trigger** (`status='rejeitado'` set without `etapa_atual` changing) — the trigger fires only `BEFORE UPDATE OF etapa_atual`; a "quick reject" that skips that column produces an invisible, un-audited transition. The `guard_rejeicao_auditada` backstop RAISEs on this — don't disable it, fix the caller.
3. **Reject with no justification persisted** — the trigger's *terminal* branch (unlike its regression branch) does NOT require `etapa_justificativa`, and the live comparativo reject already ships this gap (the literal funil-02 debt). Must be enforced server-side (RPC RAISE), not just a required form field — a direct PostgREST call bypasses client-only validation.
4. **The two CONFIRMED live horizontal leaks** — `curriculos` Storage SELECT (role-only, any recruiter downloads any CV) and `rh_le_historico` on `historico_candidatura` (role-only, deferred at Phase 24, never swept). Both MUST close before their consuming features (CV view, KPI dashboard) ship, or M6 ships an IDOR/PII leak on day one. Verify with **behavioral smokes** (impersonated JWT), not `pg_policies` inspection — Phase 24 proved structural checks pass while leaks persist.
5. **`CREATE OR REPLACE avancar_etapa()` without diffing the live body** — a Phase-27 near-miss already happened here (would have silently dropped the ENTREV-03 flag guard). Preferred posture: don't touch the trigger for M6 at all.
6. **Scheduling assumes an email layer that doesn't exist** — COMM is explicitly out of scope; the candidate learns of the interview ONLY via an unmissable dashboard card. Any `notificar-candidato`/n8n/pg_net wiring in an M6 diff is a scope violation.
7. **Time-in-stage math breaking on terminals/re-entrant transitions** — naive `now() - entered_stage` produces infinite durations for terminal candidates and double-counts backward-move re-entries; must use `lead()/lag()` window functions over ordered transitions and explicitly define re-entry/terminal semantics.

## Implications for Roadmap

All four research dimensions converge on the same **security-first build order** (data + RLS lands and is smoke-verified before any consuming UI). This maps to 5 phases; M6 phase numbering continues from the last shipped milestone (v5.0 ended at Phase 30, so M6 starts at **Phase 31**).

### Phase 31: Advance/Reject Everywhere + Comparativo Reject Justification (funil-02)
**Rationale:** Pure reuse of the existing trigger + RLS (already vaga-scoped since P24) — lowest risk, highest-confidence phase, and it de-risks the milestone early. No new server primitive; no trigger edits.
**Delivers:** Per-stage advance/reject controls across all 6 funnel stages (today concentrated on stage 5); reject requires enum reason + ≥50-char justification, enforced server-side; the comparativo's no-op reject/advance buttons wired to the same write path.
**Addresses:** C1 (per-stage advance/reject) and C5 (reject-from-comparativo, funil-02) from FEATURES.md.
**Avoids:** Pitfalls 1–5 (double-write, trigger bypass, unjustified reject, backward-move guard trip, score→reject creep).

### Phase 32: Close the Two Live Leaks — CV Signed-URL EF + KPI DEFINER RPC (BLOCKING)
**Rationale:** Both `curriculos` Storage SELECT and `rh_le_historico` are confirmed role-only leaks today. Any feature reading through them (CV view, KPI dashboard) must not ship until these are closed. This phase produces zero end-user-visible UI — it is purely server + RLS + smoke tests, gating Phase 34's consuming views.
**Delivers:** `get-curriculo-url` EF (authenticate-THEN-authorize, vaga-owner check, short-TTL signed URL) + removal of the blanket role-only Storage policy; `funil_kpis` SECURITY DEFINER RPC (vaga-scoped internally, PII-safe aggregates); optional defense-in-depth re-scope of `rh_le_historico` to the WR-04 vaga-scoped predicate.
**Uses:** Supabase Edge Functions + SECURITY DEFINER RPC pattern from STACK.md; the WR-04 vaga-scoped RLS predicate already used 4× in this codebase (P24).
**Implements:** `get-curriculo-url` EF and `funil_kpis` RPC components from ARCHITECTURE.md.
**Avoids:** Pitfalls 9, 11, 12 (CV bucket role-only, KPI role-only leak, client-side aggregation).

### Phase 33: Interview Scheduling Data Layer
**Rationale:** The scheduling table + its two-directional RLS (RH vaga-scoped write/read, candidate own-row read with an explicit column allowlist excluding `observacoes_rh`) must be proven safe before either the RH scheduling form or the candidate dashboard card is built on top of it.
**Delivers:** New `agendamentos_entrevista` table (modalidade, data_hora timestamptz, link/local, status, observacoes_rh, agendado_por) with vaga-scoped RH RLS and own-row candidate RLS; behavioral smokes for cross-recruiter and cross-candidate isolation and for interviewer-notes exclusion.
**Uses:** `timestamptz` + native `Intl` render idiom already proven in `EntrevistaDashboard.tsx` (STACK.md); the WR-04 join-through-`candidaturas` RLS pattern (ARCHITECTURE.md, same shape as `redacoes_candidato`).
**Implements:** `agendamentos_entrevista` component from ARCHITECTURE.md.
**Avoids:** Pitfalls 7, 8 (timezone bugs, scheduling RLS/notes leak).

### Phase 34: RH Surfaces — CV/AI View, Scheduling Form, Work-Queue + KPI Dashboard
**Rationale:** All server-side prerequisites (Phases 32 and 33) are closed and smoke-verified; this phase is pure UI wiring against already-safe primitives.
**Delivers:** RH candidate view surfacing CV ("Ver currículo" via the signed-URL EF) + full AI analysis (all strengths/gaps, not truncated to 2) + a read-only `historico_candidatura` activity-feed section; RH scheduling form (shadcn Calendar + `<input type="time">` in a Popover) writing to `agendamentos_entrevista`; work-queue view (cross-vaga, sorted by time-in-stage/SLA) + KPI dashboard (recharts via `@/components/ui/chart`, consuming `funil_kpis`) replacing the M1 `RelatoriosRHPage` client aggregation.
**Addresses:** C3 (CV + AI visibility), C4 (work-queue + KPIs K2–K5), and the RH half of C2 (scheduling entry) from FEATURES.md.
**Avoids:** Pitfall 10 (analysis/CV reaching the candidate), Pitfall 13 (time-in-stage math on terminals/re-entries), Pitfall 6 (no email-notify wiring).

### Phase 35: Candidate Dashboard — Interview Schedule Read
**Rationale:** Depends on Phase 33's table + RLS being proven safe; this is the smallest, lowest-risk phase and closes the "no email = dashboard is the only channel" requirement.
**Delivers:** `rotaCandidato` mapping added to the `funilNavMap` for `entrevista_online`/`entrevista_presencial` stages (currently missing — without it, scheduling is invisible to the candidate); an unmissable card in the candidate's "Próximo passo" surface rendering date/time (`America/Sao_Paulo`) + link/local from the candidate's own-row read (explicit allowlist, never `select('*')`).
**Addresses:** The C2 candidate-visibility requirement that makes the no-email scheduling model actually work.
**Avoids:** Pitfall 6 (email-assumption gap) and Pitfall 8's candidate-projection leak (must not expose `observacoes_rh`).

### Phase Ordering Rationale

- **Feature 1 (advance/reject) goes first** because it is pure reuse of an already-correct, already-vaga-scoped server primitive — a fast, low-risk win that proves the milestone's write-path discipline before anything riskier is built.
- **The two live leaks gate everything downstream that reads `curriculos` or `historico_candidatura`** — closing them is placed immediately after Phase 31 and *before* any UI, per all four research dimensions' explicit "security before UI" recommendation. Shipping Phase 34's UI against un-tightened RLS would ship an IDOR on day one.
- **Scheduling's data layer (33) precedes both its RH form and its candidate-facing read (34, 35)** — the table + RLS must be smoke-proven safe before either consumer is built, mirroring the same data-before-UI discipline applied to Phases 31–32.
- **Candidate-facing read is last (35)** because it is the smallest phase and strictly depends on Phase 33.
- This order also naturally sequences **cross-cutting pitfalls (15–17: live-function-body diffing, migration 42601/ledger discipline, tsc-baseline discipline)** as gates that apply to every phase carrying a migration, not just one phase.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:plan-phase --research-phase <N>`):
- **Phase 33 (Scheduling data layer):** FEATURES.md rates this MEDIUM confidence — the no-email UX divergence has no direct market precedent to crib from, and the exact reschedule/cancel semantics (soft-delete history vs new row) and whether `compareceu` lands in v1 or v1.x need to be nailed down against requirements, not assumed from research.
- **Phase 34 (Work-queue + KPI dashboard):** FEATURES.md rates work-queue UX MEDIUM confidence (aging thresholds, sort/filter specifics are still open); this is also the first DEFINER RPC in this codebase doing window-function aggregation (`lead()`/`lag()` over `historico_candidatura`) at this complexity — validate the exact SQL shapes (especially the K4 conversion cohort-maturity decision, explicitly left open in FEATURES.md) before writing the migration.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 31 (advance/reject):** HIGH confidence — the write path (`updateCandidaturaEtapa` → trigger → `historico_candidatura`) is fully reverse-engineered with exact file/line citations in ARCHITECTURE.md and PITFALLS.md; no open design questions.
- **Phase 32 (close the two leaks):** HIGH confidence — both the authenticate-THEN-authorize EF pattern and the WR-04 vaga-scoped RLS predicate are already used repeatedly in this exact codebase (P10, P24); this is precedent application, not novel design.
- **Phase 35 (candidate dashboard read):** HIGH confidence — own-row read + allowlist projection is an established, repeated pattern in this codebase (`candidato_le_propria_candidatura`, etc.).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Grounded against installed `package.json` + grep-verified actual usage in-repo; zero net-new dependencies, so there is effectively nothing unverified to be wrong about. |
| Features | HIGH (core) / MEDIUM (work-queue UX, no-email scheduling) | KPI definitions, advance/reject, and CV/AI-visibility patterns are HIGH — convergent with recruiting-analytics literature and directly mappable to the existing event log. Work-queue UX specifics and the deliberate no-email scheduling divergence are MEDIUM because they deliberately depart from market precedent and need requirements-phase decisions. |
| Architecture | HIGH | Verified against actual migration files + generated `database.types.ts`, cross-checked against migration headers stating "verified against PROD via `pg_get_functiondef`" (the Supabase MCP tool was unavailable to this research agent, so live-function verification relied on that authoritative in-repo record instead). |
| Pitfalls | HIGH | Every pitfall cites the exact migration file/line or service file/line it derives from; several are confirmed historical bugs in this exact codebase (Phase-8 double-write, Phase-27 trigger near-miss), not hypothetical. |

**Overall confidence:** HIGH

### Gaps to Address

- **Reject-justification enforcement mechanism (Phases 31/32):** PITFALLS.md offers two viable routes — a new `rejeitar_candidatura(...)` SECURITY DEFINER RPC that RAISEs on empty justification, OR extending `avancar_etapa()`'s terminal branch to require it. ARCHITECTURE.md leans toward never touching the trigger. Requirements/planning must pick one explicitly (the RPC route is lower-risk and matches the "don't touch the trigger" posture the architecture research recommends).
- **`agendamentos_entrevista` exact column set (Phase 33):** ARCHITECTURE.md proposes a shape (including `observacoes_rh`, `status` reusing the existing `status_entrevista` enum); FEATURES.md's MVP table separately proposes `entrevistador` and defers `compareceu` to v1.x. Reconcile the two into one authoritative schema during Phase 33 planning.
- **KPI conversion cohort-basis (K4, Phase 34):** FEATURES.md explicitly flags that "the requirements phase must choose the cohort basis" (candidates in-flight vs. matured cohorts) — this is a real product decision with real UX consequences (naive conversion undercounts), not a research gap that can be closed by more reading.
- **Defense-in-depth on `rh_le_historico` (Phase 32):** ARCHITECTURE.md treats tightening this policy directly as optional/complementary to the DEFINER RPC route; decide during planning whether to do both (belt-and-suspenders) or RPC-only.
- **Legacy RPC dead-code confirmation:** `database.types.ts` still exposes M1-era `avancar_etapa(uuid,uuid)` and `rejeitar_candidato(uuid,text,uuid)` overloads with no backing migration file. Confirm during Phase 31 planning that no M6 code path (old or new) references them, and consider flagging their removal as a small cleanup item.
- **`.ics` / 24h-reminder / `compareceu` scope boundary:** FEATURES.md places these in "v1.x, add after validation," not launch. Roadmap should explicitly confirm whether they land inside M6 or are pushed to a follow-up milestone — they are cheap (LOW complexity) but not on the MVP critical path per FEATURES.md's own MVP Definition.

## Sources

### Primary (HIGH confidence)
- `package.json` (repo) — installed dependency versions, grep-verified against actual `src/`/`supabase/` usage — STACK.md
- `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` — current authoritative live `avancar_etapa()` body (ENTREV-03 guard, GUC-gated `auto_rejeitado`) — ARCHITECTURE.md, PITFALLS.md
- `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql` — WR-04 vaga-scoped RLS predicate; explicit deferral of `rh_le_historico` re-scope, never completed — ARCHITECTURE.md, PITFALLS.md
- `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql`, `20260607000001_historico_candidatura.sql`, `20260709000010_guard_rejeicao_auditada.sql`, `20260425000002_curriculos_bucket.sql`, `20260624000001_entrevista_cognitivo_tables.sql` — funnel/audit/Storage/legacy-table baselines — ARCHITECTURE.md, PITFALLS.md
- `src/features/triagem/services/triagemService.ts` (`updateCandidaturaEtapa`) — live RH funnel write-path — ARCHITECTURE.md, PITFALLS.md, STACK.md
- `src/features/entrevista/components/EntrevistaDashboard.tsx` — proven `America/Sao_Paulo` timezone-render idiom — STACK.md
- `src/features/vagas/services/cvUploadService.ts` — existing `getSignedUrl` CV pattern — STACK.md, ARCHITECTURE.md
- `database.types.ts` (repo root) — generated schema types, including legacy dead-RPC overloads — ARCHITECTURE.md, PITFALLS.md
- Auto-memory: `reference_select_star_leaks_pii`, `reference_ef_authenticate_vs_authorize`, Phase-8 double-write bug, DBMIG-02 flag-guard near-miss — ARCHITECTURE.md, PITFALLS.md, this synthesis

### Secondary (MEDIUM confidence)
- [recharts npm](https://www.npmjs.com/package/recharts), [recharts issue #7361](https://github.com/recharts/recharts/issues/7361), [recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) — confirms v2→v3 is a breaking migration, justifying "don't upgrade for M6" — STACK.md
- [AIHR — 23 Recruiting Metrics](https://www.aihr.com/blog/recruiting-metrics/), [hrtutorial — Recruitment Funnel Metrics](https://hrtutorial.com/talent-acquisition/talent-acquisition-metrics-analytics/recruitment-funnel-metrics/), [Treegarden — Recruitment SLA Management](https://treegarden.io/blog/recruitment-sla-management/) — KPI definitions (time-to-hire, yield ratio, SLA breach) — FEATURES.md
- [Greenhouse Support — Schedule an interview manually](https://support.greenhouse.io/hc/en-us/articles/360045420091-Schedule-an-interview-manually), [Using the new candidate profile](https://support.greenhouse.io/hc/en-us/articles/11957068130971-Using-the-new-candidate-profile) — market-pattern baseline for the deliberate no-email divergence — FEATURES.md
- [Ashby Docs — Candidate Profile](https://docs.ashbyhq.com/candidate-profile), [Workable Help — Moving candidates through the pipeline](https://help.workable.com/hc/en-us/articles/8495289154839-Moving-candidates-through-the-pipeline) — backward-move + aging-alert precedent — FEATURES.md
- [OutSolve — Audit Candidate Disposition Reasons](https://www.outsolve.com/blog/why-all-employers-need-to-audit-candidate-disposition-reasons) — why a generic rejection dropdown is a compliance anti-pattern — FEATURES.md

### Tertiary (LOW confidence)
- [Outsail — Greenhouse vs Lever vs Ashby](https://www.outsail.co/post/greenhouse-vs-lever-vs-ashby) — general competitive positioning, not load-bearing for any M6 decision — FEATURES.md

---
*Research completed: 2026-07-14*
*Ready for roadmap: yes*
