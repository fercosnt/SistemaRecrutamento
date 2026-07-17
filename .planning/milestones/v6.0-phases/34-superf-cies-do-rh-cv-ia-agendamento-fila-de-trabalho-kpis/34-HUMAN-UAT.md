---
status: partial
phase: 34-superf-cies-do-rh-cv-ia-agendamento-fila-de-trabalho-kpis
source: [34-VERIFICATION.md]
started: 2026-07-16T18:30:00Z
updated: 2026-07-16T18:30:00Z
---

## Current Test

[awaiting human testing — 4 live browser UATs require real RH login sessions]

## Context

Phase 34 shipped 4 RH surfaces. All 23 automated must-haves verified (incl. live PROD `funil_kpis`/`v_fila_trabalho` curl checks). Code review found + FIXED 1 blocker (CV popup-block) + 2 warnings before this UAT. The 4 items below are inherently human (visual + real multi-user auth) and cannot be grepped/unit-tested.

**Test accounts (PROD, from prior milestones):** `e2e.admin@beautysmile.com.br` (administrador) + the first `recrutador` account created in M5 (exercises the vaga-scoped cross-recruiter path). Dev server: `npm run dev` (port 3003).

## Tests

### UAT-34-1 — CV open (VISRH-01) + cross-recruiter isolation
- **Route:** `/rh/candidatos/:id` (hub)
- **Steps:** As a recruiter who OWNS the vaga, click "Abrir currículo" → a new tab opens with the CV file. As a recruiter who does NOT own that vaga, the same button surfaces the inline error (opens nothing).
- **Post-CR-01-fix note:** the tab is opened synchronously on click (activation-preserving), then navigated to the signed URL — confirm it is NOT popup-blocked in Safari AND Chrome, and that a blocked popup shows the inline error rather than failing silently.
- **status:** pending

### UAT-34-2 — Agendamento flow (AGEND-02/03)
- **Route:** hub, a candidatura in `entrevista_online`/`entrevista_presencial`
- **Steps:** Schedule via the form (Calendar + time Popover + modalidade + link/local + the newly-added "Entrevistador" input from the WR-01 fix); confirm the summary card appears; reschedule; cancel (AlertDialog confirms first, row is kept); toggle comparecimento and see it reflected.
- **status:** pending

### UAT-34-3 — Fila de Trabalho tab (KPI-01/03)
- **Route:** `/rh/candidatos` → "Fila" tab
- **Steps:** Confirm cross-vaga rows for the logged-in recruiter, ordered oldest-waiting-first, with amber "Atenção · Nd" / red "Atrasado · Nd" SLA badges matching real time-in-stage; Kanban tab still works alongside.
- **status:** pending

### UAT-34-4 — KPI dashboard (KPI-02/04)
- **Route:** `/rh/relatorios`
- **Steps:** Confirm 3 metric cards (Tempo até contratação / Taxa no-show / Taxa knockout, showing "—" when null) + 4 charts (Volume, Tempo mediano, Conversão, Drop) render via the shadcn chart wrapper with working tooltips; no candidate identity appears on screen.
- **status:** pending

## Gaps

None automated — all automated must-haves passed (23/23). Items above are live-UAT only.
