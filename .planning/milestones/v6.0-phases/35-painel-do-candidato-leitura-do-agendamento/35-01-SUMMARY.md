---
phase: 35-painel-do-candidato-leitura-do-agendamento
plan: 01
subsystem: [features/agendamento, lib/datetime]
tags: [agend-04, seg-03, candidate-read, definer-rpc, timezone-util, tdd, frontend-only]
requires:
  - get_meu_agendamento (Postgres DEFINER RPC — live PROD since Phase 33)
  - agendamentoService (TipoAgendamento / StatusAgendamento union types)
  - EntrevistaDashboard SP-timezone idiom (extraction source)
provides:
  - formatDataHoraSP (shared America/Sao_Paulo dd/mm/aaaa às hh:mm formatter)
  - saoPauloParts (timezone-pinned parts seam)
  - getMeuAgendamento (candidate own-row allowlist read via the DEFINER RPC)
  - MeuAgendamentoRow (7-col allowlist domain Row, local_ou_link/compareceu | null)
  - MeuAgendamentoServiceError
  - useMeuAgendamento + meuAgendamentoKeys (TanStack read hook + key factory)
affects:
  - src/features/entrevista/components/EntrevistaDashboard.tsx (re-imports the extracted util)
  - Plan 35-02 (AgendamentoCandidatoCard consumes formatDataHoraSP + useMeuAgendamento)
tech-stack:
  added: []
  patterns:
    - "Candidate own-row read via typed DEFINER RPC (no confined cast — RPC is in database.types.ts)"
    - "Domain Row corrects the generator's non-null RETURNS TABLE lie (local_ou_link/compareceu | null)"
    - "Shared TZ util extracted with zero external-caller breakage (behavior-preserving refactor)"
    - "RPC-guard test: assert the network call + returned shape, never the JSX"
key-files:
  created:
    - src/lib/datetime/formatDataHoraSP.ts
    - src/lib/datetime/__tests__/formatDataHoraSP.test.ts
    - src/features/agendamento/services/agendamentoCandidatoService.ts
    - src/features/agendamento/hooks/useMeuAgendamento.ts
    - src/features/agendamento/services/__tests__/agendamentoCandidatoService.test.ts
  modified:
    - src/features/entrevista/components/EntrevistaDashboard.tsx
decisions:
  - "AGEND-04 left Pending (not marked Complete): 35-01 ships only the read foundation; the user-visible card (success criterion 1) lands in 35-02, which also maps to AGEND-04."
  - "No confined cast on the .rpc call — get_meu_agendamento IS in database.types.ts (differs from redacaoService/get_minha_redacao); only local_ou_link/compareceu are widened to | null."
  - "formatCurto + compute24hMarker stay local to EntrevistaDashboard — the candidate needs neither."
metrics:
  duration: ~7min
  tasks: 2 (both TDD)
  files: 6 (5 created, 1 modified)
  commits: 4 (2 test + 2 feat — TDD RED→GREEN gate)
  tests: "formatDataHoraSP 4/4 · agendamentoCandidatoService 7/7 · full suite 991/991"
  tsc: "97 (≤104 baseline; 0 new errors in touched files)"
  completed: 2026-07-17
---

# Phase 35 Plan 01: Candidate Agendamento Read Foundation + Shared SP Timezone Util Summary

Server-enforced candidate own-row read of the scheduled interview via the
`get_meu_agendamento` DEFINER RPC (7-col allowlist, no base-table, no `select('*')`),
plus a shared `America/Sao_Paulo` formatter extracted from EntrevistaDashboard — the
tested data/logic primitives that Plan 35-02's visible card wires against.

## What Shipped

- **`src/lib/datetime/formatDataHoraSP.ts`** — `saoPauloParts` + `formatDataHoraSP`
  lifted verbatim from `EntrevistaDashboard.tsx:44-73` (renaming `formatDataHora` →
  `formatDataHoraSP`). Formats an ISO `timestamptz` as `dd/mm/aaaa às hh:mm` pinned to
  `America/Sao_Paulo` (not browser-local), including the engine midnight-`24`→`00` edge
  and null-in/null-out. Unit-tested (4/4).
- **`EntrevistaDashboard.tsx` (refactor)** — deleted the local
  `DISPLAY_TIME_ZONE`/`saoPauloParts`/`formatDataHora`, re-imports the shared util,
  repoints the call site. `formatCurto` (tooltip) + `compute24hMarker` (RH label) stay
  local. Behavior-preserving: no external caller of the moved fn (grep-verified); RH
  surface unchanged; full suite green.
- **`agendamentoCandidatoService.ts`** — `getMeuAgendamento(candidaturaId)` reads the
  candidate's own latest agendamento **only** through the typed
  `supabase.rpc('get_meu_agendamento', { p_candidatura_id })` (no confined cast — the
  RPC is present in `database.types.ts`), returns `rows[0] ?? null` (RPC ORDER BY
  data_hora DESC), throws `MeuAgendamentoServiceError` `INVALID_INPUT`/`DATABASE_ERROR`.
  `MeuAgendamentoRow` is the 7-col allowlist with `local_ou_link`/`compareceu` widened
  to `| null` (Pitfall 1 — the generator's non-null RETURNS TABLE is a lie).
- **`useMeuAgendamento.ts`** — read-half mirror of `useAgendamento`:
  `meuAgendamentoKeys` factory + `useQuery(staleTime/gcTime 5min, retry 2,
  enabled:!!candidaturaId)`. No mutations (candidate is read-only).
- **`agendamentoCandidatoService.test.ts`** — RPC-guard (mirror of
  `redacaoService.rpc.test.ts`): asserts `.rpc('get_meu_agendamento')` is the single
  data path, `.from('agendamentos_entrevista')` is never called, and the projected row
  carries none of the RH-internal columns; plus rows[0]/null ordering, empty-id
  `INVALID_INPUT`, and rpc-error `DATABASE_ERROR` (7/7).

## Security (SEG-03 consumer discipline)

The candidate read is the single typed RPC path — no base-table read, no star
projection ([[reference_select_star_leaks_pii]]). Ownership + column allowlist are
enforced server-side inside the DEFINER RPC (already smoke-proven Phase 33, 9/9 a–i).
The RPC-guard test locks the client half: it asserts the network call and the returned
shape, not the JSX. Threat register T-35-01 (Information Disclosure) mitigated;
T-35-03 (nullable widening) mitigated by the domain Row.

## TDD Gate Compliance

Both tasks followed the RED→GREEN gate encoded in the plan; git log shows `test(...)`
before `feat(...)` for each:

| Task | RED (test) | GREEN (feat) |
|------|-----------|--------------|
| 1 — formatDataHoraSP extract + refactor | `1cde7c3` | `92d1d97` |
| 2 — candidate read service + hook | `c37d816` | `e59f17f` |

RED was proven failing (module unresolved) before each implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking gate] Reworded service docstring to satisfy the RH-internal-key negative grep**
- **Found during:** Task 2 (acceptance grep gate)
- **Issue:** The service docstring literally listed the excluded RH-internal columns
  (`observacoes_rh, entrevistador, agendado_por, updated_by, vaga_id`), so a raw
  `grep -c` on the service file returned 1 where the acceptance criterion wants 0
  (same near-miss class as 34-05 `from('candidaturas')` in a docstring).
- **Fix:** Reworded the comment to describe the excluded columns without naming them
  literally; the RPC allowlist reference is preserved. Grep gate now 0.
- **Files modified:** `src/features/agendamento/services/agendamentoCandidatoService.ts`
- **Commit:** `e59f17f`

### Process deviations

**2. [Sanctioned] `--no-verify` on all four commits**
- The husky pre-commit hook runs `npm run lint` (strict `tsc --noEmit`), which fails on
  the 97 pre-existing cadastro/vagas errors (≤104 baseline). Per the plan's
  `<verification>` note + STATE Decision [Phase 34/34-02 · exec], `--no-verify` is the
  sanctioned GSD-executor allowance. Each commit re-proved tsc total **97** (did not
  increase) and **0 new errors** in the touched files.

**3. [Scope/accuracy] AGEND-04 left Pending — NOT marked Complete**
- The plan frontmatter lists `requirements: [AGEND-04]`, but AGEND-04's user-visible
  success criterion (SC-1: "O candidato vê a entrevista agendada num card no painel")
  is not satisfiable in 35-01 — no UI ships here. 35-02 also maps to AGEND-04 and
  delivers the rendered card + link/local + `.ics` + badge. Marking AGEND-04 Complete
  now would be a false completion, so it stays Pending; it closes after 35-02.

No other deviations — the plan executed as written.

## Verification Results

- `npx vitest run src/lib/datetime` — 4/4 green (SP offset, midnight edge, null).
- `npx vitest run src/features/agendamento` — 21/21 green (7 new guard behaviors).
- `npm run test:run` — 991/991 green (125 files; no regression from the refactor).
- `npm run lint` — tsc 97 total (≤104), 0 new errors in the 6 touched files.
- Grep gates: `rpc('get_meu_agendamento'` = 1; `from('agendamentos_entrevista')` /
  `select('*')` on service code = 0; `local_ou_link: string | null` = 1;
  RH-internal keys in service = 0; EntrevistaDashboard import present, 0 local
  `saoPauloParts`/`DISPLAY_TIME_ZONE`.

## For Plan 35-02

- Import `formatDataHoraSP` from `@/lib/datetime/formatDataHoraSP` for the SP date.
- Consume `useMeuAgendamento(candidaturaId)` in the `AgendamentoCandidatoCard` child
  (Rules-of-Hooks fix — the parent mounts the child only for entrevista etapas).
- The `.ics` builder (`gerarIcsAgendamento`/`baixarIcsAgendamento`) + the pure
  predicates (`ehUpcomingNaoCancelada`/`estaDentroDe24h`) are NOT in this plan — they
  land in 35-02 (full source pre-written in 35-RESEARCH §Code Examples).
- `local_ou_link` is nullable — render link/local only when present; `online` → clickable
  `<a target="_blank" rel="noopener noreferrer">`, `presencial` → text (never a link).

## Self-Check: PASSED

- Files: all 5 created files FOUND on disk; EntrevistaDashboard modified.
- Commits: `1cde7c3`, `92d1d97`, `c37d816`, `e59f17f` all FOUND in git log.
