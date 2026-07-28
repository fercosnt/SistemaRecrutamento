---
phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
plan: 04
subsystem: frontend
tags: [ux, copy, honesty, wait-state, ci-guard, candidato, rh, lgpd]

# Dependency graph
requires:
  - phase: 26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring
    provides: "26-CONTEXT + 26-UI-SPEC §Copywriting Contract (locked canonical string)"
provides:
  - "UX-01: 6 candidate/RH wait-state screens carry the canonical 'Acompanhe o andamento pelo seu painel.' — every 'avisaremos … por e-mail' promise removed"
  - "src/__tests__/guards/wait-state-copy.grep.test.ts — scoped regression net banning the e-mail-promise pattern in exactly the 6 wait-state files"
affects: [26-06, secure-phase-26, verify-phase-26]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scoped copy grep guard: explicit path allowlist (not a global src ban) + promise-lead-in ban regex so legitimate transactional/consent 'por email' copy is never false-flagged"

key-files:
  created:
    - src/__tests__/guards/wait-state-copy.grep.test.ts
  modified:
    - src/features/avaliacao/components/AvaliacaoContainer.tsx
    - src/features/avaliacao/components/RedacaoEditorScreen.tsx
    - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
    - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
    - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
    - src/components/pages/SuporteRHPage.tsx

key-decisions:
  - "The ban regexes require the promise LEAD-IN (avisaremos… / receberá…) BEFORE 'por e-mail' — this is what keeps consent ('receber emails'), the RH 'Notificar candidato por email' toggle, and password-reset copy un-flagged"
  - "Guard is scoped to an EXPLICIT 6-file path allowlist, NOT a recursive src walk — a whole-src ban would false-flag legitimate transactional/consent e-mail copy"
  - "ProvaCognitivaScreen doc-comment (:18) was updated to quote the new postSubmit verbatim so docs + guard stay honest together"
  - "AvaliacaoContainer :209 all-done copy is corrected here — 26-06 (Wave 3) must NOT revert it"

patterns-established:
  - "Copy-honesty regression net: a promise-lead-in ban regex over a scoped allowlist gives precise teeth without a whole-src false-positive tax"

requirements-completed: [UX-01]

# Metrics
duration: ~13min
completed: 2026-07-12
---

# Phase 26 Plan 04: Honest Wait-State Copy (UX-01) Summary

**Replaced every dishonest "avisaremos … por e-mail" / "receberá … por e-mail" wait-state promise across 6 candidate/RH screens with the single canonical pt-BR line "Acompanhe o andamento pelo seu painel." (the panel is the real status source — there is no e-mail infra), and added a scoped CI grep guard that bans the promise pattern from re-appearing in exactly those 6 files while proving it does not false-flag legitimate consent / password-reset / RH-notify copy.**

## Performance

- **Duration:** ~13 min
- **Completed:** 2026-07-12
- **Tasks:** 2/2

## What Was Built

### Task 1 — 6 wait-state string replacements (commit `8649520`)

Pure string-literal edits (no layout, className, icon, color, or typography change), per the 26-UI-SPEC §Copywriting Contract verbatim map:

| # | File : line | Now reads |
|---|-------------|-----------|
| 1 | `AvaliacaoContainer.tsx:209` (all-done body) | "Você concluiu todas as avaliações desta etapa. Acompanhe o andamento pelo seu painel." |
| 2 | `RedacaoEditorScreen.tsx:278` | "Acompanhe o andamento pelo seu painel." |
| 3 | `DevolutivaBigFiveView.tsx:157` | "Volte em alguns instantes. Acompanhe o andamento pelo seu painel." |
| 4 | `ProvaCognitivaScreen.tsx:82` (`postSubmit`) | "Prova registrada. Acompanhe o andamento pelo seu painel." |
| 4b | `ProvaCognitivaScreen.tsx:18` (doc-comment) | doc prose updated to quote the new `postSubmit` verbatim |
| 5 | `SolicitarRevisaoCTA.tsx:45` (`dialogBody`) | "Sua solicitação será enviada à equipe responsável, que revisará a decisão. Acompanhe o andamento pelo seu painel." |
| 6 | `SuporteRHPage.tsx:162-163` | "Recebemos sua solicitação e nossa equipe técnica irá analisá-la em breve. Acompanhe o andamento pelo seu painel." |

`AutorizacoesStep.tsx:58/93/185` (legitimate LGPD consent copy) was deliberately left untouched.

### Task 2 — scoped wait-state-copy grep guard (commit `8356bbc`)

`src/__tests__/guards/wait-state-copy.grep.test.ts` (node:fs, `ROOT = resolve(__dirname, '../../..')`, mirrors the forbidden-strings / n8n-bundle skeleton):

- Scans an **explicit 6-file path allowlist** (not a global src walk) and bans `/avisaremos[\s\S]*por e-?mail/i` + `/receber[áa][\s\S]*por e-?mail/i`.
- Positive sub-test: asserts each of the 6 files contains the canonical `"Acompanhe o andamento pelo seu painel"`.
- Filesystem-independent regex-correctness sub-tests: the ban matches each of the 4 original dishonest phrases and does NOT match the canonical line.
- **No-false-positive contract:** proves the ban does NOT flag the `AutorizacoesStep` LGPD consent line ("Concordo em receber emails …"), the RH "Notificar candidato por email" toggle, nor password-reset copy — because the ban requires the promise lead-in before "por e-mail".
- Path-drift sanity sub-test: every scoped file must resolve, and the allowlist stays length 6.

Rides the existing `npm run test:run` CI leg — no new workflow. 9/9 green.

## Verification

- **Task 1 acceptance:** canonical present in all 6 files (6/6); zero e-mail-promise remaining across the 6 (`grep -REic 'avisaremos[^.]*e-?mail|receber[áa][^.]*e-?mail'` == 0); ProvaCognitivaScreen carries the canonical twice (postSubmit + doc prose).
- **Task 2 acceptance:** file scopes to the 6 files (6 names), ban tokens present, canonical positive-assertion present, references AutorizacoesStep; `npx vitest run …/wait-state-copy.grep.test.ts` → 9/9 pass.
- **Gates:** `npm run test:run` → **761/761 passed** (96 files; +9 from the new guard). `npm run lint` (tsc) → **104 errors** (≤ 107 frozen baseline, flat vs the post-26-03 count). LGPD-04 forbidden-strings guard stays green (no clinical term introduced).

## Deviations from Plan

None — plan executed exactly as written. All Rules 1–4 unused; this was a pure client copy + guard change with no migrations, no package installs, and no architectural decisions.

## Authentication Gates

None.

## Known Stubs

None. All 6 strings resolve to real, honest copy backed by the existing dashboard/hub status surface; no placeholder or empty-data path was introduced.

## Notes for Downstream

- **26-06 (Wave 3):** the `AvaliacaoContainer.tsx:209` all-done copy is already corrected here — 26-06 (which edits `deriveCards`/`CONTAINER_TESTE_CONFIG` in the same file) must NOT revert this string. The `wait-state-copy.grep.test.ts` guard will fail CI if it does.
- The guard is the durable UX-01 regression net; it is intentionally scoped so future legitimate transactional/consent e-mail copy elsewhere in `src/` is never blocked.

## Self-Check: PASSED

- FOUND: `src/__tests__/guards/wait-state-copy.grep.test.ts`
- FOUND: `.planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-04-SUMMARY.md`
- FOUND commit: `8649520` (Task 1 — 6 wait-state string replacements)
- FOUND commit: `8356bbc` (Task 2 — scoped grep guard)
