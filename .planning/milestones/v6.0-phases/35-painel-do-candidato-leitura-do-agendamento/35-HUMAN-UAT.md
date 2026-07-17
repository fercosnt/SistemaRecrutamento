---
status: partial
phase: 35-painel-do-candidato-leitura-do-agendamento
source: [35-VERIFICATION.md]
started: 2026-07-17T05:20:00Z
updated: 2026-07-17T05:20:00Z
---

## Current Test

[awaiting human testing — 2 live browser UATs require real candidate login + a real calendar client]

## Context

Phase 35 shipped the candidate agendamento card (read-only). All 12 automated must-haves verified (verifier re-ran 1013/1013 + grep-verified the RPC-only read path). Code review found 0 blockers + 2 warnings → both FIXED (WR-01 link-scheme validation, WR-02 .ics line folding) before this UAT. The 2 items below are inherently human (visual rendering + real calendar import + live clock).

**Test account (PROD):** the seeded candidate `candidato.funil@teste.com` / `Candidato@2026` (from prior milestones) with a candidatura in an `entrevista_online`/`entrevista_presencial` etapa that has an agendamento row. Dev server: `npm run dev` (port 3003), route `/candidato/dashboard`.

## Tests

### UAT-35-1 — Candidate dashboard card + real `.ics` import (AGEND-04/05)
- **Route:** `/candidato/dashboard`
- **Steps:** Log in as the seeded candidate. Confirm the "Sua entrevista" card renders in the per-candidatura "Próximo passo" area for the entrevista-stage candidatura, showing: data/hora in **America/Sao_Paulo** ("(horário de Brasília)"), tipo chip, and a clickable video link (online) or plain `Local:` text (presencial). Click "Adicionar à agenda (.ics)" → the file downloads → import it into **Google Calendar AND Outlook** and confirm the event date/time/location parse correctly (no broken/garbled fields — validates the RFC-5545 escaping + line folding).
- **status:** pending

### UAT-35-2 — ≤24h reminder badge live timing (AGEND-05)
- **Route:** `/candidato/dashboard`
- **Steps:** With an agendamento whose `data_hora` is within the next 24h (and not cancelled), confirm the amber "Sua entrevista é em menos de 24h" badge appears; with one >24h out, confirm it's absent; with a `cancelada` row (even future), confirm the card is VISIBLE but shows NO `.ics` button and NO badge.
- **status:** pending

## Gaps

None automated — all automated must-haves passed (12/12). Items above are live-UAT only (browser + real calendar client + live clock).
