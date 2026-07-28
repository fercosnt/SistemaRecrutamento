---
phase: 35-painel-do-candidato-leitura-do-agendamento
plan: 02
subsystem: [features/agendamento, components/pages]
tags: [agend-04, agend-05, candidate-read, ics, rfc-5545, timezone, rules-of-hooks, frontend-only, tdd]
requires:
  - getMeuAgendamento + MeuAgendamentoRow (35-01 candidate own-row DEFINER-RPC read)
  - useMeuAgendamento + meuAgendamentoKeys (35-01 TanStack read hook)
  - formatDataHoraSP (35-01 shared America/Sao_Paulo formatter)
  - biasAuditService Blob/anchor download idiom (mirrored, not imported)
  - DashboardCandidatoPage per-candidatura .map + as-EtapaFunilM2 drift-cast
provides:
  - gerarIcsAgendamento (hand-rolled RFC 5545 VCALENDAR/VEVENT builder — CRLF, UTC Z, +1h, escaped, generic SUMMARY)
  - baixarIcsAgendamento (synchronous client-side .ics download — zero npm)
  - ehUpcomingNaoCancelada + estaDentroDe24h (pure AGEND-05 gating predicates, injectable now)
  - AgendamentoCandidatoCard (inline candidate interview card — owns the read hook; 5 states; .ics + ≤24h badge)
affects:
  - src/components/pages/DashboardCandidatoPage.tsx (mounts the card for the two entrevista etapas)
tech-stack:
  added: []
  patterns:
    - "Child owns its own read hook so the parent's per-item .map never calls a hook conditionally (Rules-of-Hooks fix)"
    - "Hand-rolled RFC 5545 .ics (CRLF joins, basic-UTC DTSTART Z, escaped TEXT) — deliberate zero-npm hand-roll"
    - "AGEND-05 controls gated by pure predicates over data_hora×status — cancelada stays visible, controls gated OUT"
    - "Blob → createObjectURL → temp <a download> → revokeObjectURL client-download idiom (mirrored from biasAuditService)"
    - "tipo drives link vs plain text: online → <a rel=noopener>, presencial → NEVER a link (output-encoding boundary)"
key-files:
  created:
    - src/features/agendamento/components/AgendamentoCandidatoCard.tsx
    - src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx
  modified:
    - src/features/agendamento/services/agendamentoCandidatoService.ts
    - src/features/agendamento/services/__tests__/agendamentoCandidatoService.test.ts
    - src/components/pages/DashboardCandidatoPage.tsx
decisions:
  - "W3: dropped the dead `tipoEtapa` prop — every render branch keys off `row.tipo` from the RPC, so props = { candidaturaId } only; the parent mount passes just candidaturaId."
  - "W4: online interview with a null `local_ou_link` renders a graceful one-line fallback ('Link da videochamada será informado em breve') instead of an empty row; presencial null renders 'Local: a ser confirmado'."
  - "Card mounts INLINE (no new route, no funilNavMap change) — replaces the already-dead 'Próximo passo' footer no-op (rotaCandidato: () => null for both entrevista etapas)."
  - ".ics SUMMARY is the generic 'Entrevista Beauty Smile' constant — vaga_id is outside the RPC allowlist, so no vaga name / no PII reaches the file."
metrics:
  duration: ~9min
  tasks: 3 (Task 1 TDD)
  files: 5 (2 created, 3 modified)
  commits: 5 (1 test + 3 feat + 1 docs)
  tests: "agendamentoCandidatoService 20/20 · AgendamentoCandidatoCard 8/8 · full suite 1013/1013"
  tsc: "97 (≤104 baseline; 0 new errors in touched files)"
  completed: 2026-07-17
---

# Phase 35 Plan 02: Candidate Agendamento Card + Client-side .ics + ≤24h Badge Summary

The visible candidate interview experience: an inline `AgendamentoCandidatoCard` that
renders the scheduled interview (SP-pinned date/hora, status + tipo chips, safe
link/local) in the dashboard, plus a hand-rolled RFC 5545 `.ics` download and an amber
≤24h reminder badge — both gated to upcoming, non-cancelled interviews. Closes
AGEND-04 + AGEND-05; the panel is the sole channel (no e-mail).

## What Shipped

- **`agendamentoCandidatoService.ts` (extended, AGEND-05)** — the hand-rolled `.ics`
  layer + the pure gating predicates, added to the 35-01 read service:
  - `gerarIcsAgendamento(row)` builds a minimal VCALENDAR/VEVENT: `VERSION:2.0` +
    `PRODID`, `UID:${id}@recrutamento.beautysmile`, `DTSTAMP`, `DTSTART` (basic-UTC
    `YYYYMMDDTHHMMSSZ` from `toIcsUtc`), `DTEND` = DTSTART + 1h, `SUMMARY` = the generic
    constant `Entrevista Beauty Smile` (never a vaga name), and a conditional `LOCATION`
    (only when `local_ou_link` is non-null). Lines joined with **CRLF** (`\r\n`);
    SUMMARY/LOCATION run through `escapeIcsText` (`\ , ; \n` per RFC 5545 §3.3.11).
  - `baixarIcsAgendamento(row)` mirrors the biasAuditService Blob/anchor idiom verbatim
    (`Blob({type:'text/calendar;charset=utf-8'})` → `createObjectURL` → temp
    `<a download='entrevista-beauty-smile.ics'>` → click → `revokeObjectURL`) — zero npm,
    synchronous, no loading state.
  - `ehUpcomingNaoCancelada(iso, status, now?)` = future AND `status !== 'cancelada'`
    (NaN guard → false); `estaDentroDe24h(iso, now?)` = `0 < (data_hora − now) ≤ 24h`
    (inclusive at exactly 24h). Both take an injectable `now` for deterministic tests.
- **`AgendamentoCandidatoCard.tsx` (created, AGEND-04/05)** — inline candidate card,
  named export, props `{ candidaturaId }`. **OWNS `useMeuAgendamento(candidaturaId)`** —
  the hook lives here so the parent's per-candidatura `.map` never calls a hook
  conditionally (Rules-of-Hooks fix). Renders the 5 states with verbatim UI-SPEC copy:
  loading (2-line skeleton) / no-agendamento (`Aguardando agendamento`) / has-agendamento
  (full card) / cancelada-visible (full card, data+local rows dimmed `opacity-70`, red
  Cancelada chip undimmed, cancel note, NO controls) / error (`Não foi possível carregar…`
  + `Tentar novamente` → `refetch()`, does not block the page). Data/hora via
  `formatDataHoraSP` + `(horário de Brasília)` caption + a long-form `aria-label`.
  `tipo='online'` → clickable turquoise pill `<a target=_blank rel="noopener noreferrer">`
  (min-h-44px); `tipo='presencial'` → plain `Local: …` (never a link, even URL-shaped).
  The ≤24h amber badge and the `.ics` button (the LAST element) are gated by the pure
  predicates. Every icon `aria-hidden`; every chip carries a text label (colorblind-safe).
- **`DashboardCandidatoPage.tsx` (mount edit, AGEND-04)** — inside the existing per-item
  `.map` (beside `stepCTA`/`mostrarLGPD`), the `ehEntrevista` gate uses the SAME
  `candidatura.etapa_atual as EtapaFunilM2` drift-cast; when true the card replaces the
  dead "Próximo passo" footer, otherwise the existing footer is untouched. No route
  change, no `funilNavMap` change.

## Security (SEG-03 consumer discipline + output encoding)

The card consumes only `MeuAgendamentoRow` (7-col allowlist from the 35-01 DEFINER RPC) —
`observacoes_rh`/`entrevistador`/`vaga_id` are physically absent; the `.ics` SUMMARY is a
generic constant (T-35-01 mitigated). The `local_ou_link` output-encoding boundary
(T-35-03) is grep-gated: link only for `tipo='online'` with `rel="noopener noreferrer"
target="_blank"`; `presencial` is always a React text node (auto-escaped). The `.ics`
injection boundary (T-35-04) is mitigated by `escapeIcsText` on SUMMARY/LOCATION and the
builder controlling the CRLF joins, not the field content. No `select('*')`, no
base-table read introduced.

## TDD Gate Compliance

Task 1 (`tdd="true"`) followed the RED→GREEN gate; git log shows `test(...)` before
`feat(...)`:

| Task | RED (test) | GREEN (feat) |
|------|-----------|--------------|
| 1 — .ics builder + upcoming/≤24h predicates | `f6d4342` | `e6bb274` |

RED was proven failing (`X is not a function` — the new exports absent) before the GREEN
implementation. Tasks 2 and 3 are `type="auto"` (Task 2 ships the REQUIRED plan-check W1
RTL test alongside the component in a single `feat` commit).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking gate] Reworded the `date-fns` negative-grep near-miss in a docstring**
- **Found during:** Task 2 (acceptance grep `grep -c "date-fns" … is 0`)
- **Issue:** The component docstring literally read "America/Sao_Paulo formatter — never
  date-fns", so the raw `grep -c "date-fns"` returned 1 where the criterion wants 0 (same
  near-miss class as 35-01's RH-internal-key docstring and 34-05's `from('candidaturas')`).
- **Fix:** Reworded to "never the browser-local one" — the intent is preserved, the
  component genuinely imports no date-fns. Grep gate now 0.
- **Files modified:** `src/features/agendamento/components/AgendamentoCandidatoCard.tsx`
- **Commit:** `6ca1aa9`

### Plan-check revisions applied

- **W3 (dead prop):** dropped `tipoEtapa` entirely — every render branch keys off
  `row.tipo` from the RPC, so the prop was genuinely dead. Props = `{ candidaturaId }`;
  the parent mount passes only `candidaturaId` (not a silent dead prop).
- **W4 (minor UX):** `tipo='online'` with `local_ou_link === null` renders a graceful
  one-line fallback rather than an empty row (`presencial` null → `Local: a ser confirmado`).
- **W1 (required test):** `AgendamentoCandidatoCard.test.tsx` is an executable RTL suite
  (8/8) that proves the gating a grep cannot — (a) cancelada+future → card visible, NO
  `.ics`, NO badge; (b) presencial → NO `<a>` even with a URL-shaped local + `Local: `
  text; (c) upcoming online ≤24h → `.ics` + badge + link with `rel="noopener noreferrer"`.

### Process deviations

**2. [Sanctioned] `--no-verify` on all four per-task commits**
- The husky pre-commit runs `npm run lint` (strict `tsc --noEmit`), which fails on the 97
  pre-existing cadastro/vagas errors (≤104 baseline). Per the plan `<verification>` note +
  STATE Decision [Phase 34/34-02 · exec], `--no-verify` is the sanctioned GSD-executor
  allowance. Each commit re-proved tsc total **97** (did not increase) and **0 new errors**
  in the touched files. The one DashboardCandidatoPage error (GlassCard `(false | Element)[]`
  GlassProps) is **pre-existing** — verified by stashing the Task-3 edit: HEAD already had
  exactly 1 error there (line 313), total 97; after the edit still 1 (line 320), total 97.

No other deviations — the plan executed as written.

## Verification Results

- `npx vitest run src/features/agendamento` — 43/43 green (20 candidate-service incl. the
  14 new `.ics`/predicate behaviors; 8 new card RTL; 15 RH AgendamentoBlock).
- `npm run test:run` — 1013/1013 green (126 files; +22 from 991 baseline; no regression;
  DashboardCandidatoPage.funnel test still green after the mount edit).
- `npm run lint` — tsc 97 total (≤104), 0 new errors in the 5 touched files.
- Grep gates: card owns `useMeuAgendamento(` (yes); `date-fns` in card = 0; single `<a`
  (online only); `rel="noopener noreferrer"` present; `.ics`+badge both guarded by
  `ehUpcomingNaoCancelada`, badge also by `estaDentroDe24h`; all six `.ics` names present
  in the service; DashboardCandidatoPage import + `ehEntrevista` gate present; `routes.tsx`
  and `funilNavMap.ts` untouched (git diff = 0).

## For /gsd:verify-work (deferred manual UAT)

Per 35-VALIDATION §Manual-Only: log in as the seeded entrevista-stage candidate, open
`/candidato/dashboard`, confirm the card (SP time, link/local), the ≤24h badge, and that
the `.ics` downloads and imports cleanly into a real calendar (Google + Outlook — the CRLF
is specifically for Outlook).

## Self-Check: PASSED

- Files: all 5 files FOUND on disk (2 created, 3 modified).
- Commits: `f6d4342`, `e6bb274`, `6ca1aa9`, `7c1e5da` all FOUND in git log.
