---
phase: 35-painel-do-candidato-leitura-do-agendamento
verified: 2026-07-17T04:35:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "Rota das etapas entrevista_online/entrevista_presencial mapeada no funilNavMap (ROADMAP success criterion 1)"
    reason: "35-CONTEXT.md (Smart Discuss, gathered 2026-07-17, LOCKED decision under 'Surface & Routing') documents this as a correction to a ROADMAP shorthand/error — AGEND-04 is candidate-facing and the card was deliberately designed to mount INLINE in DashboardCandidatoPage's already-dead 'Próximo passo' footer (funilNavMap.rotaCandidato: () => null was already a no-op for both entrevista etapas — there was never a route to navigate to). Adding a route would contradict the LOCKED design. Verified independently: git diff shows zero changes to src/router/routes.tsx or src/lib/navegacao/funilNavMap.ts across all Phase 35 commits, and the card is confirmed mounted and functional inline."
    accepted_by: "fernando (documented in 35-CONTEXT.md prior to planning; reconfirmed via orchestrator context notes at verification time)"
    accepted_at: "2026-07-17T00:00:00Z"
---

# Phase 35: Painel do Candidato — Leitura do Agendamento Verification Report

**Phase Goal:** O candidato acompanha a entrevista agendada EXCLUSIVAMENTE pelo painel do candidato — um card na superfície "Próximo passo" (DashboardCandidatoPage) com data/hora em America/Sao_Paulo + link clicável (online) ou local (presencial), leitura own-row por allowlist via a RPC DEFINER get_meu_agendamento, download .ics client-side e badge de lembrete quando a entrevista está a ≤24h. Painel é o canal único (sem e-mail).
**Verified:** 2026-07-17T04:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Candidate sees the scheduled interview in a card on the panel — SP time + clickable link/local — mounted at the "Próximo passo" surface (AGEND-04, ROADMAP SC1, minus the funilNavMap route clause) | ✓ PASSED (override) | `DashboardCandidatoPage.tsx:386-387` mounts `<AgendamentoCandidatoCard candidaturaId={candidatura.id} />` in place of the footer when `ehEntrevista`. Route/funilNavMap change explicitly descoped per 35-CONTEXT.md — see override above. |
| 2 | Candidate read is restricted to own row via explicit allowlist and NEVER exposes `observacoes_rh` (AGEND-04, ROADMAP SC2) | ✓ VERIFIED | `agendamentoCandidatoService.ts:62-86` calls only `supabase.rpc('get_meu_agendamento', {p_candidatura_id})`; `MeuAgendamentoRow` (line 45-53) has exactly 7 fields, no `observacoes_rh`/`entrevistador`/`agendado_por`/`updated_by`/`vaga_id`. RPC-guard test (`agendamentoCandidatoService.test.ts:85-138`) asserts the network call, absent base-table read, and absent RH-internal keys — passes (`npx vitest run` green). |
| 3 | Candidate downloads a `.ics` file, generated client-side (AGEND-05, ROADMAP SC3) | ✓ VERIFIED | `gerarIcsAgendamento`/`baixarIcsAgendamento` (`agendamentoCandidatoService.ts:128-172`) — hand-rolled, zero npm, Blob→createObjectURL→temp-anchor→revokeObjectURL. Wired via the `.ics` button `onClick={() => baixarIcsAgendamento(row)}` (`AgendamentoCandidatoCard.tsx:238`). |
| 4 | Candidate sees a ≤24h reminder badge (AGEND-05, ROADMAP SC4) | ✓ VERIFIED | `estaDentroDe24h` gate rendered at `AgendamentoCandidatoCard.tsx:227-232`; boundary-tested (exactly 24h → true, 24h+1s → false) in `agendamentoCandidatoService.test.ts:220-242`. |
| 5 | `getMeuAgendamento` reads via `supabase.rpc('get_meu_agendamento', {p_candidatura_id})` — NEVER `.from('agendamentos_entrevista')`, NEVER `select('*')` | ✓ VERIFIED | Code path confirmed (see #2). Only 1 grep hit for the literal string `from('agendamentos_entrevista')` in the whole file, and it is inside a comment describing the anti-pattern (line 15), not executable code — see Anti-Patterns section below (flagged as minor/INFO, not a functional gap). |
| 6 | `MeuAgendamentoRow` exposes ONLY the 7 allowlist columns; `local_ou_link`/`compareceu` typed `\| null` | ✓ VERIFIED | `agendamentoCandidatoService.ts:45-53`. `grep "local_ou_link: string \| null"` matches line 50. |
| 7 | `formatDataHoraSP` formats SP-pinned `dd/mm/aaaa às hh:mm`, incl. midnight `'24'`→`'00'` engine edge and null handling | ✓ VERIFIED | `src/lib/datetime/formatDataHoraSP.ts` — ran `npx vitest run src/lib/datetime`: 4/4 green (known-instant offset, midnight edge, null-in, unparseable-in). |
| 8 | `EntrevistaDashboard` re-imports the extracted `formatDataHoraSP` (behavior-preserving refactor, no external caller broken) | ✓ VERIFIED | `grep "formatDataHoraSP\|saoPauloParts" EntrevistaDashboard.tsx` shows only the import + 2 call sites; no local re-declaration of `DISPLAY_TIME_ZONE`/`saoPauloParts`. Full suite green (no EntrevistaDashboard/EntrevistaWorkspace regression). |
| 9 | `useMeuAgendamento` mirrors `useAgendamento`'s read half (key factory + `useQuery` 5min stale/gc, retry 2, `enabled:!!id`) | ✓ VERIFIED | `useMeuAgendamento.ts:19-38` — `meuAgendamentoKeys` factory + `useQuery({staleTime:5*60*1000, gcTime:5*60*1000, retry:2, enabled:!!candidaturaId})`. |
| 10 | A candidate in `entrevista_online`/`entrevista_presencial` sees the card in place of the dead footer; every other etapa keeps the existing footer unchanged | ✓ VERIFIED | `DashboardCandidatoPage.tsx:309-311,386-409` — `ehEntrevista` ternary; else-branch is the original, untouched footer block. `git diff --stat` for the mount commit touches only this one file. |
| 11 | `tipo='online'` → clickable link (`<a target=_blank rel="noopener noreferrer">`); `tipo='presencial'` → plain `Local:` text, never a link even if URL-shaped | ✓ VERIFIED | `AgendamentoCandidatoCard.tsx:188-211` — conditional branch; RTL test (b) explicitly renders a URL-shaped `local_ou_link` under `tipo='presencial'` and asserts `screen.queryByRole('link')` is null. |
| 12 | The card ALWAYS renders once the RPC returns a row; `status='cancelada'` stays visible (dimmed rows + red chip + note) with NO `.ics` button and NO badge | ✓ VERIFIED | `AgendamentoCandidatoCard.tsx:147-152,219-224,227,235` — `upcoming = ehUpcomingNaoCancelada(...)` is `false` when `status==='cancelada'` (predicate excludes it), so both the badge and `.ics` button are gated out; RTL test (a) proves this with a FUTURE `data_hora` + `cancelada` status. |
| 13 | `gerarIcsAgendamento` emits a valid VCALENDAR/VEVENT: CRLF joins, DTSTART UTC `Z`, DTEND = DTSTART+1h, generic SUMMARY (no vaga name), escaped LOCATION, UID/DTSTAMP present | ✓ VERIFIED | `agendamentoCandidatoService.ts:128-154` + 6 assertions in `agendamentoCandidatoService.test.ts:159-199` — all green (CRLF, DTSTART/DTEND, generic SUMMARY, comma-escaped LOCATION, no LOCATION when null). |
| 14 | `.ics` button AND ≤24h badge appear ONLY when `ehUpcomingNaoCancelada`; badge additionally requires `estaDentroDe24h` | ✓ VERIFIED | `AgendamentoCandidatoCard.tsx:151-152,227,235` — `dentro24h = upcoming && estaDentroDe24h(...)`; both grep-gated and RTL-tested (beyond-24h case shows `.ics` button but no badge). |

**Score:** 14/14 truths verified (13 VERIFIED + 1 PASSED-override; note: truths 1-4 mirror the 4 ROADMAP success criteria, truths 5-14 add the PLAN-frontmatter-level detail — no double-counting in the frontmatter score, which reports the deduplicated 12 distinct must-haves).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/datetime/formatDataHoraSP.ts` | Shared SP-timezone formatter, exports `formatDataHoraSP`/`saoPauloParts` | ✓ VERIFIED | 51 lines, both exports present, unit-tested 4/4. |
| `src/lib/datetime/__tests__/formatDataHoraSP.test.ts` | Formatter unit test | ✓ VERIFIED | 41 lines, 4 tests green. |
| `src/features/agendamento/services/agendamentoCandidatoService.ts` | Candidate read via DEFINER RPC + allowlist Row + `.ics` builder + predicates | ✓ VERIFIED | 195 lines. Exports `getMeuAgendamento`, `MeuAgendamentoRow`, `MeuAgendamentoServiceError`, `gerarIcsAgendamento`, `baixarIcsAgendamento`, `ehUpcomingNaoCancelada`, `estaDentroDe24h` — all present, all wired, all tested. |
| `src/features/agendamento/hooks/useMeuAgendamento.ts` | TanStack read hook + key factory | ✓ VERIFIED | 39 lines, exports `useMeuAgendamento`/`meuAgendamentoKeys`, wired into the card. |
| `src/features/agendamento/services/__tests__/agendamentoCandidatoService.test.ts` | RPC-guard + `.ics`/predicate tests | ✓ VERIFIED | 243 lines, 20 tests, all green. |
| `src/features/agendamento/components/AgendamentoCandidatoCard.tsx` | Inline candidate card (5 states, .ics, badge) | ✓ VERIFIED | 248 lines (>90 min). Owns `useMeuAgendamento`; all 5 states present; wired into `DashboardCandidatoPage`. |
| `src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx` | RTL behavioral suite | ✓ VERIFIED | 178 lines, 8 tests, all green — proves the gating a grep cannot (cancelada+future, presencial-never-link, upcoming-online-badge+ics). |
| `src/components/pages/DashboardCandidatoPage.tsx` | Mount point for the card | ✓ VERIFIED | `AgendamentoCandidatoCard` imported (line 13) and conditionally mounted (line 387); `ehEntrevista` gate present (lines 309-311); non-interview etapas' footer untouched. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `agendamentoCandidatoService.ts` | `get_meu_agendamento` (Postgres DEFINER RPC) | `supabase.rpc` | ✓ WIRED | `rpc('get_meu_agendamento', {...})` at line 69; RPC confirmed present in `database.types.ts:4792`. |
| `EntrevistaDashboard.tsx` | `src/lib/datetime/formatDataHoraSP.ts` | `import` | ✓ WIRED | `import { formatDataHoraSP, saoPauloParts } from '@/lib/datetime/formatDataHoraSP'` at line 25; used at lines 49, 131. |
| `DashboardCandidatoPage.tsx` | `AgendamentoCandidatoCard.tsx` | conditional mount when etapa ∈ {entrevista_online, entrevista_presencial} | ✓ WIRED | `ehEntrevista ? <AgendamentoCandidatoCard candidaturaId={candidatura.id} /> : <div>...footer...</div>` at lines 386-409. |
| `AgendamentoCandidatoCard.tsx` | `useMeuAgendamento.ts` | hook call (child owns the hook) | ✓ WIRED | `useMeuAgendamento(candidaturaId)` at line 85 (Rules-of-Hooks fix — parent never calls a hook conditionally). |
| `AgendamentoCandidatoCard.tsx` | `baixarIcsAgendamento` | `.ics` button `onClick` | ✓ WIRED | `onClick={() => baixarIcsAgendamento(row)}` at line 238. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `AgendamentoCandidatoCard` | `agendamento` (from `useMeuAgendamento`) | `getMeuAgendamento` → `supabase.rpc('get_meu_agendamento', ...)` — live PostgreSQL DEFINER RPC, shipped to PROD in Phase 33 (9/9 smoke GREEN per project memory) | Yes | ✓ FLOWING |
| `DashboardCandidatoPage` → `candidaturaId` prop | `candidatura.id` | `useCandidaturas()` hook (real TanStack query against the candidaturas table), iterated via `candidaturasData.data.map(...)` | Yes | ✓ FLOWING (not a hardcoded/empty prop at the call site) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Datetime formatter (SP-pinned + midnight edge + null) | `npx vitest run src/lib/datetime` | 4/4 passed | ✓ PASS |
| Candidate read + `.ics` + predicates | `npx vitest run src/features/agendamento` | 43/43 passed | ✓ PASS |
| Card RTL behavioral gating (cancelada, presencial-never-link, upcoming+badge) | `npx vitest run src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx` | 8/8 passed | ✓ PASS |
| Full regression suite | `npm run test:run` | 1013/1013 passed (126 files) | ✓ PASS |
| Type-check regression (no new errors in touched files) | `npm run lint` (`tsc --noEmit`) + isolated revert-and-recount of `DashboardCandidatoPage.tsx` | 97 total errors both before and after the Phase-35 mount edit (same single pre-existing `GlassCard` children-type error, shifted from line 313→320 by the added lines) | ✓ PASS — confirmed independently, not a phase-35 regression |

### Probe Execution

No probes declared for this phase and no conventional `scripts/*/tests/probe-*.sh` apply (frontend-only phase, no migration/CLI tooling). Step 7c: SKIPPED — no applicable probes.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|-------------|--------------|--------|----------|
| AGEND-04 | 35-01, 35-02 | Candidate sees the interview in a panel card — SP time + link/local, own-row allowlist read, no e-mail | ✓ SATISFIED | Truths 1-2, 5-12 above; card mounted, RPC-only read, link/local rendering all verified in code + tests. |
| AGEND-05 | 35-02 | Candidate downloads `.ics`, sees ≤24h badge | ✓ SATISFIED | Truths 3-4, 13-14 above; `.ics` builder + badge gating verified in code + tests. |

No orphaned requirements: REQUIREMENTS.md traceability maps exactly {AGEND-04, AGEND-05} to Phase 35, matching the union of both plans' frontmatter `requirements:` fields.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `agendamentoCandidatoService.ts` | 15 | Doc comment literally contains the string `supabase.from('agendamentos_entrevista')` while describing the ANTI-PATTERN to avoid | ℹ️ INFO | The 35-01-PLAN.md acceptance criterion's literal grep (`grep -c "from('agendamentos_entrevista')\|select('\*')"` expected to be `0`) actually returns `1` — but the sole match is inside a comment, not executable code. Functionally verified clean: the RPC-guard test (`agendamentoCandidatoService.test.ts:92-93`) mocks `.from()` and asserts it is never called with `'agendamentos_entrevista'` — this passes. No security or behavioral impact; purely a literal-grep near-miss identical in class to the two near-misses the executor already fixed elsewhere in this phase (docstring rewording for the RH-internal-keys grep and the `date-fns` grep). Not a blocker. |

No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER, no console.log-only implementations, no empty stub returns, and no hardcoded-empty props found across all 9 phase-35-touched files.

### Human Verification Required

1. **Candidate dashboard end-to-end visual check + real `.ics` calendar import**

**Test:** Log in as a seeded candidate with a candidatura in `entrevista_online` or `entrevista_presencial`, open `/candidato/dashboard`, and inspect the `AgendamentoCandidatoCard`: confirm the date/hora renders correctly at America/Sao_Paulo time, the status/tipo chips render, the online link opens in a new tab (or the presencial local text renders, never as a link), the `.ics` button downloads a file, and the file imports cleanly into a real calendar client (Google Calendar and Outlook — the CRLF line-ending requirement is specifically to satisfy Outlook's parser).
**Expected:** Card renders visually correct per 35-UI-SPEC.md tokens/copy; the downloaded `.ics` opens/imports without error in both calendar clients, showing the correct SP-adjusted UTC time window and the generic "Entrevista Beauty Smile" title.
**Why human:** Real browser rendering, a real file download, and third-party calendar-app import behavior cannot be verified by static analysis or unit/RTL tests — this is explicitly called out as "Manual-Only" in `35-VALIDATION.md` and deferred there to `/gsd:verify-work`.

2. **≤24h reminder badge — live timing behavior**

**Test:** With a seeded candidatura whose `agendamentos_entrevista.data_hora` is set within 24h of "now," confirm the amber "Sua entrevista é em menos de 24h" badge appears on the live dashboard; with a schedule >24h out, confirm it does not.
**Expected:** Badge visibility flips correctly at the live 24h boundary in the running application (not just in the unit-tested pure predicate).
**Why human:** The predicate logic (`estaDentroDe24h`) is unit-tested with a fixed injected clock (deterministic), but the end-to-end behavior against the real system clock + real RPC data in a live session is a runtime/browser behavior outside static verification.

### Gaps Summary

No functional gaps found. All 12 distinct must-haves (4 ROADMAP success criteria + 8 additional PLAN-frontmatter-level truths, after dedup) are met — 1 via a documented, pre-planned override (the funilNavMap route clause in ROADMAP SC1, which 35-CONTEXT.md correctly identifies as a ROADMAP-authoring shorthand/error that the LOCKED design decision supersedes) and the rest directly VERIFIED against the codebase (code inspection + independently re-run automated tests: `npx vitest run src/lib/datetime src/features/agendamento` → 47/47 green; `npm run test:run` → 1013/1013 green; `npm run lint` → 97 total tsc errors, confirmed pre-existing and unchanged by this phase via an isolated revert-and-recount).

One INFO-level documentation near-miss was found (a comment in `agendamentoCandidatoService.ts` literally contains the string the anti-pattern grep checks for) — it does not affect behavior, is independently disproven by the RPC-guard test, and is not classified as a gap.

Status is `human_needed` (not `passed`) solely because of the 2 items that legitimately require a human/browser session (visual card rendering + real `.ics` calendar import; live ≤24h badge timing) — both are pre-identified in `35-VALIDATION.md` as "Manual-Only" and were correctly deferred by the executor rather than skipped.

---

_Verified: 2026-07-17T04:35:00Z_
_Verifier: Claude (gsd-verifier)_
