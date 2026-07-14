# Pitfalls Research

**Domain:** Adding funnel-OPERATION features (per-stage advance/reject · in-system interview scheduling · CV+AI visibility to RH · operational KPIs · reject-from-comparativo) to an already-shipped React 18 + Vite + Supabase ATS (M6 — Operação do Funil RH, Phases 31+)
**Researched:** 2026-07-14
**Confidence:** HIGH — verified against the LIVE migration source (`supabase/migrations/*`) and the LIVE RH client service (`src/features/triagem/services/triagemService.ts`), not training data. Each pitfall cites the exact object/line it derives from.

> **Scope note.** These are integration pitfalls specific to *reusing* the funnel machinery this codebase already ships — `avancar_etapa()` / `historico_candidatura`, vaga-scoped RLS, the private `curriculos` bucket, the `guard_rejeicao_auditada` backstop — while preserving four HARD invariants that MUST survive M6:
> - **RNF-07a** — the system NEVER auto-rejects on a score; a human always decides.
> - **RNF-12a** — product language is always "avaliação comportamental/cognitiva", never "teste psicológico".
> - **RLS-is-not-a-column-secret** — RLS filters rows, not columns; `select('*')` leaks answer-keys/PII/verdicts even with RLS on.
> - **No-email / dashboard-only** — COMM (email/notification) is OUT of scope this milestone; the candidate learns everything via the in-app dashboard.

---

## Critical Pitfalls

### Pitfall 1: Double-writing to `historico_candidatura` (writing the audit row yourself)

**What goes wrong:**
M6 adds per-stage advance/reject controls and — wanting an explicit audit row — does `INSERT INTO historico_candidatura` *in addition to* the `candidaturas.etapa_atual` UPDATE. Result: **two** audit rows for one transition. Every KPI that counts transitions (time-in-stage, conversion, volume-per-stage) is now inflated/wrong, and the trail lies about what happened.

**Why it happens:**
The audit write is invisible at the call site. `avancar_etapa()` is a `BEFORE UPDATE OF etapa_atual` trigger (`supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql:110-117`) that writes **exactly one** `historico_candidatura` row per transition *inside the same transaction*. A developer who doesn't know the trigger exists "adds" the audit row the trigger already wrote. **This is a CONFIRMED historical bug in this codebase** — the Phase-8 survivor-advance once wrote a second `historico_candidatura` row because `submit_candidatura_atomic` inserted explicitly *and* the trigger fired (MEMORY: "survivor double-write").

**How to avoid:**
- The ONLY way M6 code changes a stage is a plain UPDATE of `candidaturas.etapa_atual` (+ `etapa_justificativa`, + `status` for terminals). NEVER `INSERT INTO historico_candidatura` from application code, an EF, or a new RPC. The trigger owns that table. Reuse the shipped `updateCandidaturaEtapa()` shape (`triagemService.ts:350-378`).
- If a new SECURITY DEFINER RPC drives the transition, it too must UPDATE `etapa_atual` (let the trigger write the row) — do not add its own INSERT.

**Warning signs:**
- Any `historico_candidatura` INSERT outside the `avancar_etapa()` / knockout paths.
- Two rows in `historico_candidatura` with the same `candidatura_id`, `etapa_para`, and `criado_em` within milliseconds.

**Phase to address:** Per-stage advance/reject phase (first M6 phase). **Test:** advance one candidatura one stage, assert `select count(*) from historico_candidatura where candidatura_id=$1 and etapa_para=$2` returns exactly 1.

---

### Pitfall 2: Bypassing `avancar_etapa()` — a stage change with no audit row

**What goes wrong:**
The inverse of Pitfall 1. M6 introduces a path that changes the *effective* stage without going through `UPDATE candidaturas.etapa_atual` — e.g. flipping only `status='rejeitado'` while leaving `etapa_atual` unchanged, or writing a bespoke `estagio` column, or a bulk action that updates a side table. No `historico_candidatura` row is written → the transition is invisible to the audit trail and to KPIs, violating FUNIL-03/RNF-07a.

**Why it happens:**
`avancar_etapa()` is a `BEFORE UPDATE **OF etapa_atual**` trigger (note the column list) — it fires ONLY when `etapa_atual` is in the UPDATE's SET list. A "quick reject" that sets `status='rejeitado'` alone never fires it. **This exact hole existed in the live UpdateStatusModal reject path** and had to be closed in Phase 25 by a second trigger, `guard_rejeicao_auditada` (`supabase/migrations/20260709000010_guard_rejeicao_auditada.sql:60-70`), which RAISEs on any `status→rejeitado` that is neither sanctioned (txn-local GUC `app.rejeicao_sancionada='on'`) nor accompanied by an `etapa_atual` transition.

**How to avoid:**
- Every stage move (including reject) drives `etapa_atual`. To reject, set `etapa_atual='rejeitado'` **and** `status='rejeitado'` in the *same* UPDATE (the shipped comparativo pattern, `triagemService.ts:358-369`) — this satisfies `guard_rejeicao_auditada`'s etapa branch and produces the audit row.
- If a reject must leave `etapa_atual` unchanged (a knockout-style case), it MUST run through a SECURITY DEFINER RPC that sets `set_config('app.rejeicao_sancionada','on',true)` — the ONLY sanctioned no-etapa reject path.
- Do NOT invent a new "stage" column; `etapa_atual` (enum `etapa_processo`) is the single source of truth.

**Warning signs:**
- A reject UI that calls `.update({ status: 'rejeitado' })` with no `etapa_atual`.
- `PostgREST` error `check_violation` "Rejeição sem trilha de auditoria não é permitida" surfacing to RH — that's the backstop catching a bypass; fix the caller, don't disable the guard.

**Phase to address:** Per-stage advance/reject phase. **Test:** attempt a `status→rejeitado` with `etapa_atual` unchanged and no GUC — assert it RAISEs `check_violation`.

---

### Pitfall 3: Allowing a reject with no justification (breaking the audit trail)

**What goes wrong:**
M6 lets RH reject a candidate — from a stage control or from the comparativo — and the reject lands with `criterio_texto = NULL` in `historico_candidatura`. The audit trail records *that* a rejection happened but not *why*, defeating the whole point of the trail (LGPD Art. 20 explainability, RNF-07a "human decided — on what basis?").

**Why it happens:**
The trigger's regression branch requires a non-empty `etapa_justificativa`, but the **terminal branch does NOT** — `IF NEW.etapa_atual IN ('aprovado','rejeitado') THEN NULL` allows terminals from any stage with no justification (`20260712110001_...:76-78`). The live comparativo reject (`triagemService.ts:updateCandidaturaEtapa`) sets `etapa_atual='rejeitado'` but **never sets `etapa_justificativa`** → the audit row's `criterio_texto` is NULL. This is exactly the **funil-02 tech-debt** M6 pulls in ("rejeição a partir do comparativo exigindo justificativa"). The justification is NOT enforced server-side today.

**How to avoid:**
- Enforce the justification **server-side**, not just in the form. Two viable routes:
  1. Route rejects through a SECURITY DEFINER RPC (e.g. `rejeitar_candidatura(p_candidatura_id, p_justificativa)`) that RAISEs on empty `p_justificativa`, then UPDATEs `etapa_atual='rejeitado', status='rejeitado', etapa_justificativa=p_justificativa` and sets the sanction GUC — the trigger copies `etapa_justificativa` into `criterio_texto`. Mirror the existing `registrar_decisao` fold (`20260709000012_registrar_decisao_amend.sql`).
  2. OR extend `avancar_etapa()` to also require `etapa_justificativa` when `NEW.etapa_atual='rejeitado'` — **but** see Pitfall 15 (you must reproduce the live body verbatim, including the ENTREV-03 flag guard and the GUC-gated `auto_rejeitado`).
- A client-only "required" attribute is insufficient — a direct PostgREST call bypasses it.

**Warning signs:**
- `select count(*) from historico_candidatura where etapa_para='rejeitado' and (criterio_texto is null or btrim(criterio_texto)='')` returns > 0.
- The reject dialog has a "motivo" textarea but the network payload doesn't carry it.

**Phase to address:** funil-02 / comparativo-reject phase AND the per-stage reject phase (same enforcement). **Test:** a reject with empty justification RAISEs; a reject with text lands `criterio_texto = <text>`.

---

### Pitfall 4: A "backward move" or bulk action that trips the never-unjustified-regression guard

**What goes wrong:**
M6 adds "move back a stage" or a bulk "advance selected" action. A backward move (e.g. `entrevista_online → triagem`) fails at runtime with `Regressão de etapa exige justificativa preenchida`, OR a bulk action half-applies (some rows advance, one hits the ENTREV-03 flag guard and RAISEs, and — if not wrapped in a transaction — the batch is left inconsistent).

**Why it happens:**
- The regression branch RAISEs unless `etapa_justificativa` is non-empty (`20260712110001_...:79-83`). The live client `updateCandidaturaEtapa` **never sets `etapa_justificativa`** (`triagemService.ts:358`) — it only ever moves forward or to terminal, so it never hit this. A new backward-move UI that reuses that shape without wiring a justification field will always RAISE.
- The Phase-14 flag guard RAISEs `check_violation` on a *forward* advance past `entrevista_online` while an `entrevista_analises` row has `bloqueio_avanco=true AND revisao_confirmada_em IS NULL` (`20260712110001_...:91-104`). A bulk "advance all" will trip this for any held candidate.

**How to avoid:**
- Backward-move UI MUST collect and send `etapa_justificativa` in the same UPDATE. Surface the RAISE message as a field error, not a toast.
- Bulk actions: wrap each transition so a partial failure is visible per-row (report "3 advanced, 1 held for language/accent review, 1 needs justification"), and run each as its own statement — do NOT assume all-or-nothing unless you explicitly open a transaction. Never suppress the flag-guard RAISE.
- Do not "fix" a failing bulk advance by removing or weakening the ENTREV-03 guard (that's a live anti-regional-bias control, RF-24).

**Warning signs:**
- Backward-move requests with no `etapa_justificativa` in the payload.
- A bulk-advance that silently skips held rows, or one that disables the flag guard to "make it work".

**Phase to address:** Per-stage advance/reject phase. **Test:** backward move without justification RAISEs; with justification lands a regression audit row; bulk advance past a held candidate reports the hold instead of failing the batch.

---

### Pitfall 5: A path that *looks like* an auto-reject on a score (RNF-07a)

**What goes wrong:**
M6 surfaces `score_match` next to the advance/reject controls and someone adds a convenience — "auto-reject below 40", a default-selected "Reject" when the AI flags gaps, or a batch action that rejects everyone under a threshold. Any of these makes the *system* the deciding actor on a score. Violates RNF-07a and the LGPD-20 posture; also poisons `historico_candidatura.auto_rejeitado` semantics.

**Why it happens:**
The score is right there, the KPI dashboard makes low scores salient, and "help the recruiter" feels benign. The codebase deliberately has NO score→reject path: the ONLY sanctioned auto-reject is the objective knockout in `submit_candidatura_atomic` (no trait/score/age), and `auto_rejeitado=true` is written ONLY for `(v_ator IS NULL AND app.rejeicao_sancionada='on' AND NEW.etapa_atual='rejeitado')` (`20260712110001_...:115-116`). A human reject carries `ator=auth.uid()` and `auto_rejeitado=false`.

**How to avoid:**
- Every reject in M6 is human-initiated with a human `ator` (`auth.uid()`) and a justification. The AI score is *displayed as context*, never wired to an action.
- No threshold config that rejects. No pre-selected "Reject". No "reject all below X" batch.
- Preserve `auto_rejeitado`'s meaning: any M6 reject RPC must NOT set `app.rejeicao_sancionada` (that GUC is for the knockout path only) — so human rejects correctly record `auto_rejeitado=false`.

**Warning signs:**
- Any code branch: `if (score < N) { reject }`.
- A new `historico_candidatura` row with `ator IS NULL` and `auto_rejeitado=true` outside the submit/knockout path.
- Product copy implying the AI "decides" or "reprova".

**Phase to address:** Per-stage advance/reject phase + KPI phase (KPIs must not offer a reject-from-metric shortcut). **Test:** grep guard for score→reject; assert no M6 write path produces `ator IS NULL` on a reject.

---

### Pitfall 6: Interview scheduling assuming an email/notification layer exists (it does NOT)

**What goes wrong:**
M6 builds "schedule interview" and wires it to "send the candidate an email/notification" — a step that does not exist this milestone. Either it silently no-ops (candidate never learns), or someone reaches for the deferred `n8n` webhook / a half-built EF and ships a broken/insecure notification path. The candidate misses the interview because nothing told them.

**Why it happens:**
"Schedule → notify" is the universal ATS mental model. But COMM (the `notificar-candidato` EF pipeline) is explicitly **deferred to a future milestone** (`.planning/M5-DRAFT.md` COMM group; PROJECT.md M6 "Fora de escopo: COMM"). There is no email transport, no `notificacoes_enviadas` table, no Resend/SMTP in scope. The `n8n` webhook is a separate, security-flagged (SEC-03) tech-debt item, NOT a notification channel.

**How to avoid:**
- The candidate learns about the interview **only via the in-app dashboard**. Scheduling writes a row the candidate's own-row read surfaces on their timeline/status card — that IS the notification for M6.
- Do NOT add a "send email" step, a trigger dispatching `pg_net`/n8n for scheduling, or a `notificacoes_enviadas` write. If a stakeholder asks "does it email them?", the honest answer is "dashboard-only this milestone; email is a later COMM milestone."
- Design the dashboard surface so the scheduled date/time/link is unmissable (empty-state → "Entrevista agendada para …").

**Warning signs:**
- Any `functions.invoke('notificar-candidato')`, `resend`, `smtp`, or scheduling-triggered `pg_net`/n8n reference in an M6 diff.
- A scheduling flow whose only candidate-facing output is an email nobody built.

**Phase to address:** Interview-scheduling phase. **Test:** schedule an interview, then load the candidate dashboard as that candidate and assert the date/time/link render; assert NO email/notification EF is invoked.

---

### Pitfall 7: Timezone bugs in scheduling (store UTC, render America/São_Paulo)

**What goes wrong:**
An interview scheduled for "14:00" shows as "11:00" or "17:00" to the candidate, or shifts by an hour around a DST boundary, or a `date`-only column drops the time. Missed interviews, eroded trust.

**Why it happens:**
Brazil is UTC−03 (no DST since 2019, but libraries and Postgres still carry historical DST rules, so naive offset math is fragile). Common mistakes: storing a wall-clock string with no zone; using `timestamp` (without tz) instead of `timestamptz`; converting to a hardcoded `-03:00` offset instead of the IANA zone; or formatting on the server in the server's zone.

**How to avoid:**
- Column type `timestamptz`. Store the instant in UTC (Postgres normalizes `timestamptz` to UTC internally). Never store a zone-less wall-clock string.
- Render in `America/Sao_Paulo` explicitly at the display layer (IANA zone name, not a numeric offset) — same on RH and candidate views so both see the same wall-clock time.
- Send an ISO-8601 instant (with `Z`/offset) over the wire; never a bare `"2026-08-01 14:00"`.

**Warning signs:**
- A `timestamp`/`date`/`time` (no tz) column for the interview slot.
- Hardcoded `-3` / `-03:00` anywhere.
- The RH-entered time and the candidate-displayed time differ.

**Phase to address:** Interview-scheduling phase. **Test:** schedule at a known instant; assert RH view and candidate view both render the same `America/Sao_Paulo` wall-clock; assert stored value is `timestamptz`.

---

### Pitfall 8: Scheduling RLS — candidate reads others' slots, or RH is role-only, or interviewer notes leak

**What goes wrong:**
The net-new scheduling table ships with weak RLS: a candidate can read another candidate's interview row, OR any recruiter reads/writes every vaga's interviews (role-only, not vaga-scoped), OR the candidate's own-row read pulls `select('*')` and leaks an `notas_entrevistador` / internal-notes column.

**Why it happens:**
No scheduling table exists today (verified: no `agendamento`/scheduling table in `supabase/migrations/*`), so M6 writes RLS from scratch — and the tempting shortcut is to copy the *old* role-only pattern (`role IN ('rh','administrador')`) that this codebase already had to remediate on four tables in Phase 24. Plus, "the candidate reads their own row" is true at the *row* level but `select('*')` still leaks *columns* — the RLS-is-not-a-column-secret trap (CONFIRMED repeatedly: Phase-8 knockout leak, Phase-24 verdict/rubric REVOKEs).

**How to avoid:**
- **Candidate read:** own-row only, via a candidatura→candidato→`user_id = auth.uid()` predicate (mirror `candidato_le_proprio_historico`, `20260607000006_...:61-70`), AND an **explicit column allowlist** (or a candidate-facing view / column REVOKE) that excludes interviewer notes and any internal fields. Do NOT `select('*')`.
- **RH read/write:** **vaga-scoped**, not role-only — copy the shipped WR-04 predicate verbatim: `administrador` bypass `OR (role='rh' AND vaga_id IN (SELECT id FROM vagas WHERE created_by = auth.uid()))` (`20260706110004_...:76-87`). If the scheduling row has no direct `vaga_id`, scope through the `candidaturas→vagas` JOIN (the redacoes pattern, same file:94-124).
- **Interviewer notes:** put them in a column the candidate policy/allowlist excludes — or a separate RH-only table. Never in a column a candidate `select('*')` could reach.

**Warning signs:**
- A scheduling SELECT policy that is `role IN ('rh','administrador')` with no `vaga_id` predicate.
- A candidate-facing scheduling query using `select('*')` or `select('*, ...')`.
- A behavioral smoke where recruiter B reads recruiter A's interview row.

**Phase to address:** Interview-scheduling phase. **Test:** behavioral smoke (JWT impersonation via `set_config` + `SET ROLE authenticated`) — candidate A cannot read candidate B's slot; recruiter B cannot read recruiter A's vaga's slots; candidate projection excludes interviewer-notes column.

---

### Pitfall 9: Storage bucket RLS lets the wrong recruiter fetch a CV (role-only, not vaga-scoped)

**What goes wrong:**
M6 exposes the CV to RH by reusing the existing `curriculos` SELECT policy — which is **role-only**: `(auth.jwt() #>> '{app_metadata,role}') IN ('rh','administrador')` (`20260425000002_curriculos_bucket.sql:55-68`). So ANY recruiter downloads ANY candidate's CV regardless of whether they own the vaga. Horizontal PII leak / IDOR, LGPD violation.

**Why it happens:**
The bucket policy predates the Phase-24 vaga-scoping sweep and was never tightened (verified: only `20260425000002` and `20260607000006` touch it). And Storage RLS can't easily do the vaga→`created_by` join because the object path is `{auth.uid()}/{uuid}.pdf` (the *candidate's* uid — `20260425000002_...:8-9`), which is not linked to a vaga. So a naive "just let RH read the bucket" is role-only by construction.

**How to avoid:**
- Do NOT hand RH a direct bucket read or a broad signed URL. Mint the CV signed URL from an **Edge Function that authenticate-THEN-authorizes**: verify the caller's role AND that the caller owns (or is admin over) the vaga tied to that candidatura, THEN `createSignedUrl` server-side with a short TTL. This is the shipped authenticate-then-authorize EF pattern (M2 P10 IDOR fix; `reference_ef_authenticate_vs_authorize`).
- Alternatively, tighten the bucket SELECT policy to a vaga-scoped predicate joining `candidaturas→vagas`, but the EF route is cleaner given the path schema doesn't carry vaga_id.
- Keep the candidate's own-folder write/read policies untouched.

**Warning signs:**
- A CV link built from a role-only bucket read or a long-lived/public signed URL.
- No vaga-ownership check between "recruiter clicked download" and "URL minted".
- Recruiter B can download a CV for recruiter A's vaga in a smoke.

**Phase to address:** CV + AI-analysis visibility phase. **Test:** EF/smoke — owner recruiter gets a working signed URL; non-owner recruiter gets 403; candidate cannot mint an RH download URL.

---

### Pitfall 10: Exposing the CV signed URL or the AI analysis/score to the CANDIDATE

**What goes wrong:**
While wiring CV+analysis visibility for RH, the candidate-facing dashboard query accidentally reads `analise_candidato_vaga` (score_match, pontos_fortes, gaps, flags) or the RH CV download URL. The candidate sees their own AI score / the recruiter's private assessment. Breaks RNF-07a posture (candidate learns of an AI "verdict"), leaks internal evaluation, and can imply a "teste" (RNF-12a).

**Why it happens:**
The analysis rows live alongside candidatura data; a shared query or a `select('*')` on the candidatura sweeps them in. The candidate-DENY RLS on analysis exists, but a service_role EF or a mis-scoped view can bypass it, and column-level exposure via `select('*')` is the recurring trap (Phase-8: `listCandidaturas` `select('*')` leaked `opcao_knockout_id`/`motivo_rejeicao` to the candidate; `reference_select_star_leaks_pii`).

**How to avoid:**
- The AI analysis / `score_match` / comparativo is **RH-only**. The candidate dashboard NEVER queries `analise_candidato_vaga`, `comparativo_solicitado`, or `scores_candidato` verdict columns. Its funnel view is the neutral `etapa_atual` + `historico_candidatura` own-row (which carries no score).
- CV signed URLs for RH download are minted server-side and never returned to a candidate-facing endpoint.
- Reuse the explicit-allowlist / `security_invoker` view pattern for RH reads (`v_triagem_panel`, `triagemService.ts:118-131`) so even the RH projection is column-disciplined — never `select('*')`.

**Warning signs:**
- The candidate dashboard's network calls include `analise_candidato_vaga` / `score_match`.
- A candidate can see a numeric fit score, "pontos fortes/gaps", or an RH CV link.

**Phase to address:** CV + AI-analysis visibility phase. **Test:** load the candidate dashboard as a real candidate; assert no analysis/score columns and no RH CV URL appear in any response; behavioral smoke confirms candidate SELECT on `analise_candidato_vaga` returns 0 rows.

---

### Pitfall 11: KPI query is role-only — every recruiter sees every vaga's numbers

**What goes wrong:**
The operational KPI dashboard (time-in-stage, conversion, volume per vaga/stage) queries `historico_candidatura` — whose RH SELECT policy `rh_le_historico` is **role-only**: `role IN ('rh','administrador')` (`20260607000006_...:73-77`). So every recruiter's KPIs aggregate EVERY vaga's audit rows, including other recruiters' candidates. Horizontal data leak and misleading per-recruiter metrics.

**Why it happens:**
This is a **CONFIRMED, still-live gap**. Phase 24 explicitly flagged `rh_le_historico` (and `rh_le_devolutivas`) as carrying "the SAME role-only gap" and **deferred it to Phase 25's funil-RH sweep** (`20260706110004_...:126-131`) — but no Phase-25/26/27 migration ever re-scoped it (verified: `rh_le_historico` appears only in its original Phase-6 definition and the Phase-24 deferral comment). So the KPI feature is being built directly on top of an un-remediated role-only policy.

**How to avoid:**
- **Re-scope `rh_le_historico` to vaga-ownership FIRST**, as part of the KPI phase, before building any aggregation on it. `historico_candidatura` has no direct `vaga_id` → scope through the `candidatura_id → candidaturas → vagas.created_by` JOIN (the redacoes JOIN pattern, `20260706110004_...:94-124`), with the `administrador` bypass branch.
- Aggregate server-side (SQL/RPC/view) so the vaga-scoped RLS actually applies to the rows being counted; do not aggregate in the browser after a role-only pull (see Pitfall 12).
- Verify with a behavioral smoke, not `pg_policies` inspection — Phase 24 proved structural checks pass while the leak persists (the REVOKE no-op / OR-defeat lessons, PROJECT Key Decisions).

**Warning signs:**
- KPI numbers that don't change when you switch between two recruiters who own disjoint vagas.
- Any KPI query on `historico_candidatura` shipped before `rh_le_historico` is vaga-scoped.

**Phase to address:** KPI / work-queue phase (with the RLS re-scope as its first task). **Test:** behavioral smoke — recruiter A's KPI totals exclude recruiter B's vaga rows; admin sees all.

---

### Pitfall 12: Client-side KPI aggregation pulling whole tables to the browser

**What goes wrong:**
The KPI dashboard fetches raw `candidaturas`/`historico_candidatura` rows to the browser and computes counts/averages in JS. It's slow, it ships PII to the client that the KPI never needed, and it silently breaks the moment data grows (or when RLS is later tightened and the client math assumes rows it can no longer see).

**Why it happens:**
The existing `RelatoriosRHPage.tsx` already does exactly this — `useQuery` + direct `supabase` client + `recharts`, aggregating client-side (the "M1 dead model" the M6 brief explicitly wants to replace, `.planning/M5-DRAFT.md` "não o modelo M1 morto"). Copying that page's shape carries the anti-pattern forward.

**How to avoid:**
- Aggregate in the database: a `security_invoker` view or a SECURITY-scoped RPC that returns pre-aggregated KPI rows (counts, avg time-in-stage per stage/vaga), so RLS applies to the aggregation and only the numbers cross the wire — no candidate PII.
- The client renders numbers, never re-derives them from raw candidate rows.
- Explicit column selection on any supporting query; never `select('*')`.

**Warning signs:**
- A KPI component that fetches per-candidate rows and `.reduce()`s them.
- Candidate names/CPF present in a KPI network response.
- Growing payload sizes as candidatura volume grows.

**Phase to address:** KPI / work-queue phase. **Test:** KPI endpoint returns aggregates only (assert no PII columns in the response); payload size is O(stages·vagas), not O(candidaturas).

---

### Pitfall 13: Time-in-stage math that breaks on terminals or re-entrant transitions

**What goes wrong:**
"Time in stage" and "conversion" are computed naively (e.g. `now() - entered_stage`) and give nonsense for: candidates sitting in terminal `aprovado`/`rejeitado` (infinite/ever-growing "time in stage"); candidates who moved backward and re-entered a stage (double-counted, or negative durations); or the first transition where `etapa_de IS NULL`.

**Why it happens:**
`historico_candidatura` is a transition log, not a stage-duration table. Duration = time between *consecutive* transition rows for a candidatura — which requires window functions (`lead()`/`lag()` over `partition by candidatura_id order by criado_em`). Terminals have no "next" row (`etapa_para IN ('aprovado','rejeitado')` is an endpoint). Regressions mean a stage can be entered more than once (`etapa_de` can be `NULL` on first entry — the column is nullable, `20260607000001_...:40`). Enum ordinal comparison (`NEW < OLD`) means re-entry is real, not a bug.

**How to avoid:**
- Compute stage duration as `lead(criado_em) - criado_em` over the ordered transition rows; the terminal row has no lead → treat as "time to decision" or exclude from "time-in-stage", not "still waiting forever".
- Decide and document the semantics for re-entrant stages (sum all visits, or count last visit) and for `etapa_de IS NULL` (first entry).
- Conversion = distinct candidaturas that reached stage N+1 ÷ distinct that reached stage N — over distinct candidaturas, not transition-row counts (which double-count re-entries).

**Warning signs:**
- A candidate in `rejeitado` showing an ever-increasing "time in stage".
- Negative or double-counted durations after a backward move.
- Conversion > 100% (transition-row counting instead of distinct candidaturas).

**Phase to address:** KPI / work-queue phase. **Test:** fixture with a re-entrant transition and a terminal; assert durations are non-negative, terminals excluded from "waiting", conversion ≤ 100%.

---

### Pitfall 14: Reject-from-comparativo justification not persisted / not required server-side (funil-02)

**What goes wrong:**
The comparativo screen gets a "reject with justification" control, but the justification is only a client-side field — the actual write is still the shipped `updateCandidaturaEtapa('rejeitado')` that sets `etapa_atual='rejeitado'` with no `etapa_justificativa`. The reason never reaches `historico_candidatura.criterio_texto`. Looks done in the UI, empty in the trail.

**Why it happens:**
This is the specific instantiation of Pitfall 3 at the comparativo surface, and it's the literal funil-02 tech-debt. The current comparativo reject path (`triagemService.ts:updateCandidaturaEtapa`, called from the comparativo inline actions per its docstring `:287-300`) writes no justification because the terminal branch of `avancar_etapa()` doesn't demand one.

**How to avoid:**
- Persist the justification on the same write that flips the stage: send `etapa_justificativa` in the UPDATE (trigger copies it to `criterio_texto`) or go through the reject RPC from Pitfall 3.
- Enforce non-empty server-side (RPC RAISE or trigger extension), not just a required form field.
- One enforcement mechanism shared by the comparativo reject AND the per-stage reject (don't build two divergent reject paths).

**Warning signs:**
- The comparativo reject network payload has no `etapa_justificativa`.
- A comparativo-originated `rejeitado` row with NULL `criterio_texto`.

**Phase to address:** funil-02 / comparativo-reject phase (share enforcement with the per-stage reject phase). **Test:** reject from comparativo with a reason; assert the resulting `historico_candidatura` row's `criterio_texto` equals that reason.

---

### Pitfall 15: `CREATE OR REPLACE` a live function without reproducing its live body

**What goes wrong:**
M6 needs to change `avancar_etapa()` (e.g. to require justification on terminal reject, Pitfall 3/14) and re-authors it from an *older* migration file. The new body silently DROPS a control the live function carries — most dangerously the **Phase-14 ENTREV-03 flag guard** (anti-regional-bias hold) and/or the GUC-gated `auto_rejeitado` semantics — because `CREATE OR REPLACE` replaces the whole body, and the file it was copied from predates those additions.

**Why it happens:**
The function has been re-authored multiple times across phases; the migration files are NOT cumulative-obvious. **This is a CONFIRMED near-miss in THIS codebase**: in Phase 27 an early draft of `20260712110001` was derived from the Phase-6 body and "would have regressed a live bias-review control" — caught pre-apply only because the author diffed against `pg_get_functiondef` (the file's own `⚠ CORRECTNESS NOTE`, `20260712110001_...:10-16`; PROJECT Key Decisions "Verificar o corpo LIVE da função ANTES de CREATE OR REPLACE").

**How to avoid:**
- Before ANY `CREATE OR REPLACE` of a live function, dump the LIVE body (`pg_get_functiondef`) and diff — start from the live definition, change only the intended lines, keep everything else verbatim. The current live `avancar_etapa()` is `20260712110001` (Phase 6 transition/audit + Phase-14 `v_blocked` flag guard + Phase-27 GUC-gated `auto_rejeitado`). Any re-author MUST preserve: the `IS NOT DISTINCT FROM` no-op guard, the regression justification RAISE, the ENTREV-03 block (`:91-104`), the exact `auto_rejeitado` predicate (`:115-116`), `SECURITY DEFINER`, `SET search_path=''`, and the `REVOKE ... FROM PUBLIC`.
- Prefer a NEW wrapper RPC over editing the shared trigger function when possible (smaller blast radius).

**Warning signs:**
- A migration `CREATE OR REPLACE`ing `avancar_etapa()` / `guard_rejeicao_auditada()` / `registrar_decisao()` whose body is shorter than the live one.
- No `pg_get_functiondef` diff in the plan/PR.

**Phase to address:** Any phase touching the trigger functions (advance/reject, funil-02). **Test:** post-apply, assert the ENTREV-03 hold still fires and `auto_rejeitado` still writes false for a survivor advance.

---

### Pitfall 16: Migration authoring — the 42601 pooler trap and the ledger drift

**What goes wrong:**
A PL/pgSQL migration (`CREATE FUNCTION`/`DO $$…$$` + adjacent `COMMENT`/`GRANT`/`REVOKE`) fails with `SQLSTATE 42601 — cannot insert multiple commands into a prepared statement` via `supabase db push` on the transaction pooler, OR it's applied via MCP but the migration ledger drifts (MCP writes a timestamp version row, not the filename version).

**Why it happens:**
The Supabase CLI driver wraps each migration in its own implicit transaction; an outer `BEGIN; … COMMIT;` combined with `$$` bodies breaks the prepared-statement boundary parser (CLAUDE.md §Migrations workaround, D-22). And MCP `apply_migration` reconciles the ledger by timestamp, so the file's version prefix must match to avoid drift (PROJECT Key Decisions; DBMIG-01).

**How to avoid:**
- Author PL/pgSQL migrations with **no outer `BEGIN;/COMMIT;` wrapper** (each shipped funnel migration already follows this — see the header notes in `20260607000005`, `20260712110001`).
- Apply PROD via **Supabase MCP `apply_migration`/`execute_sql`** (bypasses 42601), then reconcile the version row; confirm `supabase db push --linked` reports "up to date".
- Use fresh contiguous version prefixes — two migrations sharing a prefix breaks the version row (the Phase-25 renumber lesson, `20260709000010_...:8-13`).

**Warning signs:**
- `42601` on `db push`.
- `db push` reporting "migration versions not found" after an MCP apply (ledger drift).

**Phase to address:** Every M6 phase with a migration. **Test:** post-apply `supabase db push --linked` reports "Remote database is up to date".

---

### Pitfall 17: Letting the `tsc` baseline grow (and `as never` casts masking schema drift)

**What goes wrong:**
M6 adds features and the pinned `tsc --noEmit` error baseline (currently **104**, red-on-growth in CI) creeps up, or new code uses `.update(x as never)` to silence type errors — which then masks a real column/enum mismatch against the regenerated `database.types.ts`.

**Why it happens:**
The baseline is a CI gate (`ci.yml`, PROJECT). The live advance path already uses `.update(update as never)` (`triagemService.ts:368`) — a known smell (`feedback_integration_contract_gap`: casts mask nonexistent columns). New scheduling/KPI tables mean regenerated types; code written before regeneration tends to accrete casts.

**How to avoid:**
- Regenerate `database.types.ts` (`npm run db:types`) after every schema change; drop `as never`/`as any` casts once types exist. The file lives at repo ROOT, never edit by hand.
- Keep the baseline flat or shrinking; treat a baseline bump as a review red flag, not a routine.

**Warning signs:**
- CI tsc gate red (baseline grew).
- New `as never`/`as any` in service writes against new tables.

**Phase to address:** Every M6 phase (cross-cutting gate). **Test:** CI `tsc` gate stays ≤ pinned baseline; grep for new `as never` in M6 diffs.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse the role-only `rh_le_historico` / `curriculos` SELECT for KPIs/CV instead of vaga-scoping | Ship faster; no new policy | Horizontal PII/IDOR leak across recruiters; LGPD exposure; the exact class Phase 24 spent a whole phase remediating | **Never** — vaga-scope before building on either |
| Client-side KPI aggregation (copy `RelatoriosRHPage`) | Fast to render with recharts | Ships PII to browser, slow, breaks when RLS tightens | Only a throwaway internal spike, never the shipped dashboard |
| Client-only "justification required" on reject | Quick UI | Direct PostgREST bypass leaves unjustified rejects; funil-02 stays open | Never — enforce server-side (RPC/trigger) |
| `.update(x as never)` to pass tsc | Unblocks the write | Masks column/enum drift against `database.types.ts` (contract-gap lesson) | Only transiently until `npm run db:types` regenerates; drop the cast same PR |
| Re-author `avancar_etapa()` from an old migration file | Familiar starting point | Silently drops the live ENTREV-03 guard / GUC `auto_rejeitado` (Phase-27 near-miss) | Never — start from `pg_get_functiondef` of the live body |
| Store interview time as zone-less `timestamp`/wall-clock string | Simple form binding | DST/offset bugs, missed interviews | Never — `timestamptz` + IANA render |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `avancar_etapa()` trigger | Also `INSERT INTO historico_candidatura` from app code → double-write | Only UPDATE `etapa_atual`; the trigger owns the audit row |
| `guard_rejeicao_auditada` trigger | `status='rejeitado'` alone (etapa unchanged, no GUC) → `check_violation` | Reject drives `etapa_atual='rejeitado'` in the same UPDATE, or a sanctioned DEFINER RPC |
| `curriculos` private bucket | Reuse role-only SELECT → any recruiter downloads any CV | EF authenticate-THEN-authorize + short-TTL `createSignedUrl`, vaga-ownership checked |
| `analise_candidato_vaga` / `score_match` | Sweep into a candidate query via `select('*')` | RH-only; candidate dashboard never queries analysis/score |
| Supabase Storage RLS | Assume `select('*')` on a candidate row is safe because RLS is on | RLS is row-level only; use explicit allowlist / view / column REVOKE |
| Migration apply | `supabase db push` on `$$` bodies → 42601 | MCP `apply_migration`, no BEGIN/COMMIT wrapper, reconcile version row |
| COMM / email | Wire scheduling to a "notify candidate" step | No email this milestone — dashboard-only; do not touch n8n/`notificar-candidato` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Client-side KPI aggregation over raw rows | Slow dashboard, large payloads, PII on wire | DB-side aggregate view/RPC | Grows with total candidatura volume (hundreds+) |
| Time-in-stage without window functions | Wrong/negative/infinite durations | `lead()/lag()` over ordered transitions; exclude terminals | Any re-entrant transition or terminal candidate |
| Unindexed KPI scans on `historico_candidatura` | Slow group-bys | The shipped `(candidatura_id, criado_em)` index (`20260607000001_...:49`); add a JOIN-supporting index if grouping by vaga | Larger history tables |
| Per-row bulk advance without batching feedback | Batch appears to hang/half-apply | Report per-row outcome; don't assume atomicity | Bulk actions across many candidates |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| KPIs on role-only `rh_le_historico` | Recruiter sees every vaga's numbers (horizontal leak) | Vaga-scope `rh_le_historico` via candidaturas→vagas JOIN BEFORE building KPIs |
| Role-only CV bucket read | Any recruiter downloads any candidate's CV (IDOR/PII, LGPD) | EF-minted vaga-scoped signed URL |
| AI score/analysis reaching the candidate | Candidate sees internal verdict; RNF-07a/12a posture broken | RH-only analysis; candidate dashboard excludes it; behavioral smoke |
| `select('*')` on candidate/scheduling/analysis rows | Column-level leak (notes, score, criteria) despite RLS | Explicit allowlist / `security_invoker` view / column REVOKE |
| Scheduling table role-only RLS | Recruiter reads other vagas' interviews; candidate reads others' slots | Vaga-scoped RH + candidate own-row; verify via impersonation smoke |
| Structural-only RLS verification (`pg_policies`) | Passes while leak persists (REVOKE no-op / OR-defeat) | Behavioral smokes: `set_config` JWT + `SET ROLE authenticated` |
| Any score→reject convenience | Auto-rejection on a score (RNF-07a) + LGPD-20 breach | Human-only reject with `ator=auth.uid()`; grep guard |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Scheduled interview only "sent by email" | Candidate never learns (no email exists) | Unmissable dashboard card: date/time/link + `America/Sao_Paulo` |
| Reject dialog without a required reason | Empty audit trail; candidate gets no basis | Server-enforced justification; neutral candidate-facing copy |
| Showing raw AI score to the candidate | Feels like an automated "teste"/verdict (RNF-12a/07a) | Neutral stage status only for the candidate |
| Backward-move button that errors on click | Recruiter confusion (`Regressão exige justificativa`) | Require + send `etapa_justificativa`; surface as a field prompt |
| Product copy "teste psicológico"/"reprovado pela IA" | RNF-12a / RNF-07a breach | "avaliação comportamental/cognitiva"; "análise da IA" as context |

## "Looks Done But Isn't" Checklist

- [ ] **Advance/reject controls:** often missing — verify exactly ONE `historico_candidatura` row per transition (trigger-owned, no app INSERT).
- [ ] **Reject (any surface):** often missing — verify `criterio_texto` is non-empty and enforcement is server-side, not just a form field.
- [ ] **Backward move:** often missing — verify `etapa_justificativa` is collected and sent (else the regression guard RAISEs).
- [ ] **Interview scheduling:** often missing — verify the candidate can SEE it on the dashboard (no email exists) and the time renders in `America/Sao_Paulo`.
- [ ] **Scheduling RLS:** often missing — verify candidate own-row only, RH vaga-scoped, interviewer notes excluded from the candidate projection.
- [ ] **CV visibility:** often missing — verify the download URL is vaga-scoped (EF), not the role-only bucket read.
- [ ] **AI analysis visibility:** often missing — verify the candidate dashboard does NOT include `score_match`/analysis.
- [ ] **KPIs:** often missing — verify `rh_le_historico` is vaga-scoped and aggregation is DB-side (no PII on the wire).
- [ ] **Time-in-stage:** often missing — verify terminals and re-entrant transitions don't produce infinite/negative durations.
- [ ] **Trigger edit:** often missing — verify a `pg_get_functiondef` diff exists and the ENTREV-03 guard + `auto_rejeitado` predicate survive.
- [ ] **Migrations:** often missing — verify no `BEGIN/COMMIT` wrapper, MCP-applied, ledger reconciled ("up to date").
- [ ] **Types/tsc:** often missing — verify `database.types.ts` regenerated, `as never` casts dropped, baseline not grown.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double-write to `historico_candidatura` | MEDIUM | Remove the app/RPC INSERT; de-dup existing rows (keep the trigger-written one); re-verify KPI counts |
| Role-only `rh_le_historico` shipped with KPIs | MEDIUM | Re-scope policy to vaga JOIN; behavioral smoke; audit whether cross-vaga numbers were exposed |
| Role-only CV bucket exposed to all RH | MEDIUM | Replace direct read with EF signed-URL; revoke broad access; check download logs for cross-vaga access |
| Unjustified rejects already written | LOW–MEDIUM | Add server enforcement; backfill/annotate historical NULL `criterio_texto` rows if policy requires |
| `avancar_etapa()` re-authored dropping a guard | HIGH | Restore from `pg_get_functiondef` of a known-good version; re-apply; regression-test the ENTREV-03 hold live |
| Timezone bug in scheduling | LOW | Migrate column to `timestamptz`; fix render to IANA zone; re-notify affected candidates via dashboard |
| Score→reject shipped | HIGH | Remove the path immediately; audit `historico_candidatura` for illegitimate `auto_rejeitado`/`ator IS NULL` rejects; manual review |

## Pitfall-to-Phase Mapping

Phases are thematic (M6 numbering starts at **Phase 31**; the roadmapper assigns exact numbers/order). Suggested grouping: **(A)** per-stage advance/reject + funil-02 comparativo reject; **(B)** interview scheduling; **(C)** CV + AI-analysis visibility to RH; **(D)** work-queue dashboard + operational KPIs. Cross-cutting pitfalls (15–17) apply to every phase that ships a migration.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Double-write | A (advance/reject) | Exactly 1 history row per transition |
| 2 Bypass trigger / no audit row | A | `status→rejeitado` w/o etapa RAISEs `check_violation` |
| 3 Reject without justification | A + funil-02 | Empty justification RAISES; text lands in `criterio_texto` |
| 4 Backward-move / bulk guard | A | Backward w/o justification RAISEs; bulk reports held rows |
| 5 Auto-reject on score (RNF-07a) | A + D | Grep guard; no `ator NULL` human-reject; no threshold reject |
| 6 Assumes email exists | B (scheduling) | Candidate sees schedule on dashboard; no notify EF invoked |
| 7 Timezone | B | RH & candidate render same `America/Sao_Paulo`; `timestamptz` |
| 8 Scheduling RLS + notes leak | B | Impersonation smoke: own-row candidate, vaga-scoped RH, notes excluded |
| 9 CV bucket role-only | C (CV/AI visibility) | Owner recruiter 200, non-owner 403, candidate cannot mint |
| 10 Analysis/CV to candidate | C | Candidate dashboard has no score/analysis/CV URL |
| 11 KPI role-only leak | D (KPIs) — re-scope `rh_le_historico` FIRST | Recruiter A KPIs exclude recruiter B's vagas |
| 12 Client-side aggregation | D | KPI endpoint returns aggregates only, no PII |
| 13 Time-in-stage math | D | Non-negative durations; terminals/re-entries handled; conversion ≤100% |
| 14 Comparativo reject justification (funil-02) | funil-02 | `criterio_texto` equals the entered reason |
| 15 `CREATE OR REPLACE` live body | any phase editing triggers | `pg_get_functiondef` diff; ENTREV-03 + `auto_rejeitado` survive |
| 16 42601 / ledger drift | any phase w/ migration | MCP apply; `db push` "up to date" |
| 17 tsc baseline / `as never` | all phases | tsc gate ≤ baseline; types regenerated |

## Sources

- **Live migration source (authoritative, HIGH):**
  - `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` — CURRENT live `avancar_etapa()` body (transition validation + audit write + Phase-14 ENTREV-03 flag guard + GUC-gated `auto_rejeitado`); its `⚠ CORRECTNESS NOTE` documents the Phase-27 re-author near-miss.
  - `supabase/migrations/20260607000005_avancar_etapa_trigger.sql` + `20260624000004_avancar_etapa_flag_guard.sql` — trigger evolution / SECURITY DEFINER rationale.
  - `supabase/migrations/20260607000001_historico_candidatura.sql` — append-only audit table (nullable `etapa_de`, `(candidatura_id, criado_em)` index).
  - `supabase/migrations/20260607000006_rls_policies_m2_backbone.sql` — role-only `rh_le_historico` + candidate own-row `candidato_le_proprio_historico`.
  - `supabase/migrations/20260706110004_sec05_08_vaga_scope.sql` — WR-04 vaga-scoped predicate; **line 126-131 defers `rh_le_historico` re-scope to Phase 25 (never completed)**.
  - `supabase/migrations/20260709000010_guard_rejeicao_auditada.sql` — reject-without-trail backstop + sanction GUC idiom.
  - `supabase/migrations/20260425000002_curriculos_bucket.sql` — private bucket, **role-only RH SELECT**, `{auth.uid()}/{uuid}.pdf` path.
- **Live RH client (HIGH):** `src/features/triagem/services/triagemService.ts` — `updateCandidaturaEtapa` (direct `etapa_atual` UPDATE, no `etapa_justificativa`), `v_triagem_panel` allowlist read, `as never` cast.
- **Existing reports surface:** `src/components/pages/RelatoriosRHPage.tsx` — client-side recharts aggregation (the "M1 dead model").
- **Project memory / decisions (HIGH):** `.planning/PROJECT.md` Key Decisions (SECURITY DEFINER + GUC actor capture; RLS-not-a-column-secret; behavioral smokes > structural; verify live body before `CREATE OR REPLACE`; MCP apply / 42601); `CLAUDE.md` §Migrations workaround + Security Rules; MEMORY references `reference_select_star_leaks_pii`, `reference_ef_authenticate_vs_authorize`, `feedback_integration_contract_gap` (survivor double-write, Phase-8 leak, contract casts).
- **Scope (HIGH):** `.planning/M5-DRAFT.md` OPER group + COMM deferral; PROJECT.md `## Current Milestone` (COMM/TALENT/LGPD-OPS out of scope; RNF-07a/RNF-12a invariants).

---
*Pitfalls research for: funnel-operation features on the Beauty Smile ATS (M6 — Operação do Funil RH)*
*Researched: 2026-07-14*
