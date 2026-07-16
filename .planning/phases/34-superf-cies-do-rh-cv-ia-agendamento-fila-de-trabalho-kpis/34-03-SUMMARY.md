---
phase: 34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis
plan: 03
subsystem: ui
tags: [react, tanstack-query, supabase-rls, react-hook-form, zod, anti-tamper, agendamento]

# Dependency graph
requires:
  - phase: 33
    provides: agendamentos_entrevista table + rh_gerencia_agendamento WR-04 RLS + agendamento_normaliza_vaga_id trigger + write-stamp trigger
  - phase: 34
    plan: 02
    provides: HubCandidatoRH (file co-ownership — both plans edit it) + HubSection async-state wrapper
provides:
  - "agendamentoService — direct agendamentos_entrevista read (allowlist) + agendar/reagendar/cancelar/setCompareceu writes whose payloads exclude the trigger-stamped scope/audit columns"
  - "agendamentoSchema (zod) — future data_hora + online|presencial tipo enum (pt-BR messages)"
  - "useAgendamento — agendamentoKeys factory + read query + 4 invalidating mutations"
  - "AgendamentoBlock — etapa-gated (entrevista_online/presencial) Calendar+time Popover form / summary card + compareceu ToggleGroup + Cancelar AlertDialog (row kept)"
affects: [phase-35, 34-04-fila, 34-05-kpi]

# Tech tracking
tech-stack:
  added: []  # zero new npm — every primitive (calendar, popover, select, toggle-group, alert-dialog, RHF, zod) already vendored/installed
  patterns:
    - "Direct-table write with an anti-tamper payload: build the insert/update body LITERALLY from client-writable columns only; the trigger-stamped scope/audit cols never touch a body (T-34-03-01, Pitfall 4)"
    - "The generated Insert type still lists NOT-NULL trigger-stamped cols as required → OMIT them and cast at the .insert boundary (as never) rather than smuggle a scope column onto the body"
    - "Etapa-gating done in the OUTER component (returns HubSection futuro) so the read hook only runs when unlocked — no conditional-hook hazard"
    - "cancelar = UPDATE status='cancelada' (row kept, never a delete) so the candidate still sees the cancellation via the P35 RPC"

key-files:
  created:
    - src/features/agendamento/services/agendamentoService.ts
    - src/features/agendamento/schemas/agendamentoSchema.ts
    - src/features/agendamento/hooks/useAgendamento.ts
    - src/features/agendamento/components/AgendamentoBlock.tsx
    - src/features/agendamento/services/__tests__/agendamentoService.test.ts
    - src/features/agendamento/components/__tests__/AgendamentoBlock.test.tsx
  modified:
    - src/features/hub-candidato/components/HubCandidatoRH.tsx

key-decisions:
  - "Insert body cast `as never` at the .insert boundary — the generated Insert type still requires the NOT-NULL trigger-stamped scope column (no default), but sending it is a tampering vector; we omit it and cast rather than name/forward it (the established insert/RPC-boundary cast idiom)"
  - "getAgendamento returns the single newest (data_hora DESC) non-removed row or null — the UI needs the current agendamento; a kept cancelled row + a new one surfaces the new one"
  - "AgendamentoBlock owns a small view/form state machine (empty→CTA→form; summary→reagendar-form / cancel); reagendar reuses the SAME form pre-filled from the existing row"
  - "compareceu segmented control maps sim/nao/pendente → true/false/null (null = pendente = the KPI-04 no-show source of truth)"

patterns-established:
  - "Anti-tamper write service: FORBIDDEN_KEYS asserted absent from every insert/update body by the service test + a grep gate over the service file (the forbidden column names never appear in-file, comments included)"

requirements-completed: [AGEND-02, AGEND-03]

# Metrics
duration: 12min
completed: 2026-07-16
---

# Phase 34 Plan 03: Interview-Scheduling Surface (Agendamento) Summary

**The RH interview-scheduling block on the candidate hub — schedule / reschedule / cancel an interview and record `compareceu`/no-show — writing DIRECT to the P33-shipped `agendamentos_entrevista` table via `.insert`/`.update`, with every write payload built literally so the trigger-stamped scope/audit columns can never be smuggled in (T-34-03-01), cancel kept as `status='cancelada'` so the candidate still sees it, and the block etapa-gated to the two entrevista stages.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-16T~17:14Z
- **Completed:** 2026-07-16T~17:26Z
- **Tasks:** 2 (Task 1 TDD)
- **Files:** 7 (6 created, 1 modified)

## Accomplishments

- **AGEND-02 — reschedule/cancel reflected on the candidate card.** `agendamentoService` writes DIRECT to `agendamentos_entrevista`: `agendar` inserts a body carrying ONLY the 8 client-writable columns; `reagendar(id, patch)` is an UPDATE in place with `status='reagendada'`; `cancelar(id)` is an UPDATE `status='cancelada'` (the row is KEPT — never a `.delete()`) so the cancellation reaches the candidate via the P35 `get_meu_agendamento` RPC. A service test + a grep gate prove the insert/update payloads contain NONE of the four trigger-stamped scope/audit columns (Pitfall 4).
- **AGEND-03 — register `compareceu` (the KPI-04 no-show source).** `setCompareceu(id, value)` toggles the `compareceu` column true/false/null; the summary card's segmented `ToggleGroup` (Compareceu / Não compareceu / Pendente) is wired to it. `null = pendente` is the no-show source of truth KPI-04 reads.
- **Allowlist read, never `select('*')`.** `getAgendamento` projects the RH-facing allowlist (`id, candidatura_id, tipo, data_hora, local_ou_link, status, observacoes_rh, entrevistador, compareceu`), `deleted_at IS NULL`, newest `data_hora` first, returning the current row or null. RH sees `observacoes_rh` here (RH surface); it never surfaces to a candidate (the P35 RPC excludes it by construction).
- **Etapa-gated UI.** `AgendamentoBlock` renders a locked `HubSection estado="futuro"` outside `entrevista_online`/`entrevista_presencial`; inside those etapas it shows the empty-state `Agendar entrevista` CTA → a React-Hook-Form + zod form (shadcn `Calendar` + `<input type="time">` in a `Popover`, `Select` modalidade, conditional Link/Local `Input`, Observações internas `Textarea`), or a summary card when an agendamento exists. Cancel confirms through an `AlertDialog` with the verbatim UI-SPEC copy. Mounted as a sibling of the Entrevista `HubSection` in `HubCandidatoRH`.
- **zod schema.** `agendamentoSchema` rejects a past `data_hora` (must be a valid future timestamp) and enforces the `online|presencial` tipo enum, pt-BR messages throughout.

## Task Commits

1. **Task 1 (TDD): agendamentoService + zod schema + useAgendamento hook** — `8b4afba` (feat) — RED (module-not-found) → GREEN 12 tests
2. **Task 2: AgendamentoBlock etapa-gated + mounted in HubCandidatoRH** — `4b59c57` (feat) — 50 tests GREEN (agendamento + hub-candidato)

**Plan metadata:** (this SUMMARY + STATE/ROADMAP/REQUIREMENTS) — final `docs(34-03)` commit.

## Files Created/Modified

- `services/agendamentoService.ts` — `AgendamentoServiceError` + `mapWriteError` (42501→FORBIDDEN, 23514/23502→INVALID_INPUT); `AGENDAMENTO_ALLOWLIST`; `getAgendamento` (allowlist, newest-first); `agendar`/`reagendar`/`cancelar`/`setCompareceu` (literal payloads, no trigger-stamped cols; insert cast `as never` at the boundary)
- `schemas/agendamentoSchema.ts` — zod: future `data_hora` refine + `online|presencial` enum + optional local/obs/entrevistador, pt-BR messages
- `hooks/useAgendamento.ts` — `agendamentoKeys` factory + `useAgendamento` (read query 5min stale/gc, retry 2, enabled:!!id) + 4 mutations invalidating the read key
- `components/AgendamentoBlock.tsx` — etapa-gated block; `DataHoraPicker` (Calendar+time), `AgendamentoForm` (RHF+zod), summary card (status chip, pt-BR data/hora, modalidade, compareceu ToggleGroup, Reagendar, Cancelar AlertDialog); toasts per UI-SPEC
- `components/HubCandidatoRH.tsx` — imports + renders `<AgendamentoBlock candidaturaId etapaAtual />` as a sibling in the Entrevista section
- 2 test files (service anti-tamper + schema; component etapa-gating)

## Decisions Made

See frontmatter `key-decisions`. Core: the insert body is cast `as never` at the `.insert` boundary because the generated Insert type still lists the NOT-NULL trigger-stamped scope column as required — we intentionally OMIT it (the trigger stamps it; sending it is a tampering vector) rather than name/forward it. `getAgendamento` returns the single newest row (the UI needs the current agendamento). `cancelar` keeps the row (`status='cancelada'`) so the candidate sees the cancellation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Insert typing requires the omitted trigger-stamped scope column → boundary cast**
- **Found during:** Task 1 (tsc gate after GREEN — 1 new TS error at the `.insert`)
- **Issue:** The generated `agendamentos_entrevista` `Insert` type lists the trigger-stamped scope column as **required** (the table declares it NOT NULL with no default), so a literal insert body that (correctly) OMITS it fails `tsc` with "Property … is missing". But the plan + threat model FORBID placing that column on any write body (T-34-03-01), and the grep gate forbids even naming it in the file — so `Omit<Insert, …>` (which would name it) is also out.
- **Fix:** Cast the omitted-column body at the `.insert` boundary (`insert(body as never)`) — the established insert/RPC-boundary cast idiom — with an inline comment explaining the trigger stamps the column. Payload still carries only the 8 client-writable columns; the anti-tamper test + grep gate confirm the forbidden names never appear in the file.
- **Files modified:** `src/features/agendamento/services/agendamentoService.ts`
- **Verification:** service test 12/12 GREEN; grep gates pass (no `select('*')`, no forbidden column names, no `.delete()`, has `status: 'cancelada'`); tsc restored to the 104 baseline with 0 errors in `features/agendamento`.
- **Committed in:** `8b4afba`

**2. [Rule 3 - Blocking] Pre-commit `tsc` gate incompatible with the 104-error baseline → `--no-verify`**
- **Found during:** Task 1 (first commit) + Task 2
- **Issue:** The husky `pre-commit` runs `npm run lint` (strict `tsc --noEmit`), which exits non-zero on the **104 pre-existing** errors (all in `cadastro/*` / `vagas/*`; 0 in `agendamento/*` / `hub-candidato/*`). The hook's own header designates `--no-verify` as the sanctioned GSD-executor mechanism; the plan encodes `tsc ≤ 104` as passing.
- **Fix:** `git commit --no-verify`, re-proving after each task that the total held at **104** with **0 errors in the files touched** (same pattern documented in 34-02).
- **Files modified:** none (git-mechanics only)
- **Verification:** `tsc` = 104 after both tasks; 0 errors in `features/agendamento` + `features/hub-candidato`; `npm run build` green.
- **Committed in:** both task commits.

---

**Total deviations:** 2 auto-fixed (both Rule 3, blocking). **Impact:** both mechanical/necessary; no scope creep, no product-behavior change.

## TDD Gate Compliance

Task 1 (`tdd="true"`) followed RED→GREEN: the RED state (`vitest` "Failed to resolve import … `../agendamentoService`") was proven BEFORE implementation, GREEN (12 tests) after. RED and GREEN were committed **together** because a RED state (module-not-found import) cannot pass the pre-commit `tsc` gate, leaving the repo unbuildable mid-task — the same constraint documented in 34-02. No test passed unexpectedly during RED. Task 2 is not TDD-tagged (a UI-composition task) but ships a component test asserting the etapa-gating + empty-state CTA.

## Threat Surface Scan

No new security-relevant surface beyond the plan's `<threat_model>`. The block writes to the P33 table gated by the existing `rh_gerencia_agendamento` WR-04 join-through RLS; no new endpoint, auth path, or schema. `observacoes_rh` is written and rendered only on this RH surface (T-34-03-04, accepted — the candidate path excludes it by construction, P33). The anti-tamper (T-34-03-01), PII-allowlist (T-34-03-02) and repudiation (T-34-03-03) mitigations are all implemented and gated by test + grep.

## Known Stubs

None. The block reads/writes real, RLS-gated data (or explicit empty/error/gated states). Candidate-facing reflection of the agendamento is out of scope here (P35 `get_meu_agendamento` — the candidate-panel card).

## User Setup Required

None — no external service configuration. The `agendamentos_entrevista` table + RLS + trigger + `get_meu_agendamento` RPC shipped in P33.

## Next Phase Readiness

- Remaining in P34: **34-04** (Fila cross-vaga tab) and **34-05** (KPI dashboard) — both autonomous, both planned + plan-checked; 34-01's `v_fila_trabalho` view + extended `funil_kpis` are live, so their reads are ready.
- Live UAT candidate: on `/rh/candidatos/:id` for a candidatura in an `entrevista_*` etapa — schedule, reschedule, cancel, and toggle `compareceu`; confirm the P35 candidate card reflects it once 35 ships.

## Self-Check: PASSED

- All 6 created files exist on disk (verified).
- Both task commits exist in git history (`8b4afba`, `4b59c57`).
- `npm run test:run -- src/features/agendamento src/features/hub-candidato` → 8 files / 50 tests green; `npm run lint` → 104 (≤104, 0 in new files); `npm run build` → green.

---
*Phase: 34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis*
*Completed: 2026-07-16*
