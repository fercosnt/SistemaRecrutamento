---
phase: 13-reda-o-cultural-revis-o-humana
plan: 03
subsystem: [frontend, candidate-ui, avaliacao]
tags: [react, zod, allowlist, rnf-07a, autosave, glass-ui, redacao, lgpd, anti-tamper, candidate-essay]

# Dependency graph
requires:
  - phase: 13 (Plan 13-01)
    provides: Wave-0 RED scaffolds (redacaoService.test, redacao-contract.test, RedacaoCounter.test) — this plan flips all three GREEN
  - phase: 13 (Plan 13-02)
    provides: avaliar-redacao-cultural EF + AvaliarRedacaoCulturalBodySchema (.strict) + redacoes_candidato / perguntas_redacao tables (authored, applied in 13-04) — this client targets them
  - phase: 11 (avaliacao-assincrona-infra)
    provides: useAutosaveAvaliacao (30s local + 30s DB + 42501 back-lock) + upsertResposta + AvaliacaoContainer glass shell + SjtCasoAbertoScreen template
  - phase: 12 (big-five-devolutiva)
    provides: bigfiveService LOCKED/INVALID_INPUT/NETWORK_ERROR error map + AutosaveAffordance pattern
provides:
  - redacaoSchema.respostaRedacaoSchema (.strict, no-score client body — flips redacao-contract GREEN)
  - redacaoService: REDACAO_CANDIDATO_ALLOWLIST (verdict-excluding) + getRedacaoContext + getRedacaoCandidato/getMinhasRedacoes own-row reads + enviarRedacao (avaliar-redacao-cultural invoke, neutral ack)
  - RedacaoCounter (3-band 200ms-debounced word counter driving submit-disabled) + RedacaoCronometro (informative elapsed timer)
  - RedacaoEditorScreen (candidate essay editor — glass shell + autosave + counter + submit dialog + neutral post-submit) + AvaliacaoContainer redacao branch + /candidato/redacao/:candidaturaId route
affects: [13-04 PROD apply + EF deploy (runtime), 13-05 RH review queue]

# Tech tracking
tech-stack:
  added: []  # zero net-new packages — Textarea/AlertDialog/glass primitives vendored since M1/Phase 7
  patterns:
    - "Candidate own-row read uses an EXPLICIT verdict-excluding allowlist constant (REDACAO_CANDIDATO_ALLOWLIST); RLS is row-level only — the allowlist is the column-hiding defense (RNF-07a, [[reference_select_star_leaks_pii]])"
    - "3-band length counter is MECHANICAL guidance not a verdict — below-min is NEUTRAL muted (text-white/60), never alarm-red; only the in-range band uses the #35BFAD accent"
    - "Client posts only {candidatura_id, pergunta_id, texto} (.strict()) — the word-count gate is UI-side; the EF re-validates + derives the score server-side"
    - "Reuse the Phase-11 autosave machinery verbatim (useAutosaveAvaliacao teste='redacao' + upsertResposta) — the essay is one more teste key, no new autosave surface"

key-files:
  created:
    - src/features/avaliacao/schemas/redacaoSchema.ts
    - src/features/avaliacao/services/redacaoService.ts
    - src/features/avaliacao/components/RedacaoCounter.tsx
    - src/features/avaliacao/components/RedacaoCronometro.tsx
    - src/features/avaliacao/components/RedacaoEditorScreen.tsx
  modified:
    - src/features/avaliacao/components/AvaliacaoContainer.tsx
    - src/features/avaliacao/components/index.ts
    - src/router/routes.tsx
    - src/features/avaliacao/services/__tests__/redacaoService.test.ts
    - src/features/avaliacao/components/__tests__/RedacaoCounter.test.tsx

key-decisions:
  - "Candidate own-row read targets redacoes_candidato with REDACAO_CANDIDATO_ALLOWLIST = 'id, pergunta_id, texto, word_count, submetida_em, status_analise' — EXCLUDES analise_ia/scores_dimensao/score_ponderado_0_100/classificacao_cor/red_flag_etico/flags/scores_humanos/notas_revisor/decisao_revisor (RNF-07a, T-13-03-01)"
  - "Autosave reuses respostas_avaliacao via upsertResposta(teste='redacao') per the plan's <interfaces> block (the Phase-11 hook) — NOT the redacoes_candidato_em_progresso table (that is the EF/Plan-02 surface); buffer namespaces the draft by pergunta_id"
  - "perguntas_redacao read filters .eq('ativa', true) (the live column is `ativa` boolean, NOT `status`) and orders by is_padrao so the PADRAO_BS prompt leads"
  - "Submit-disabled tooltip moved to a wrapping <span title=...> — GlassButton has no `title` prop (would have grown the tsc baseline 291→292)"

patterns-established:
  - "Pattern: a verdict-excluding allowlist constant on the candidate own-row read is the column-hiding defense (RLS only denies rows); assert the network projection (the .select string), never the JSX"
  - "Pattern: 3-band counter colors are mechanical length guidance (muted/accent/amber) — below-min is neutral, never alarm-red; the candidate never sees a pass/fail signal"

requirements-completed: [AVAL-05, AVAL-06]

# Metrics
duration: ~8min
completed: 2026-06-24
---

# Phase 13 Plan 03: Redação Cultural — Candidate Essay Layer Summary

**The candidate culture-fit essay layer — 1 Zod schema (.strict, no-score) + 1 allowlist service (verdict-excluding own-row read, neutral-ack EF invoke) + 3 components (RedacaoEditorScreen glass shell + autosave + 3-band RedacaoCounter + informative RedacaoCronometro) + the AvaliacaoContainer redacao branch + the candidate route — built by reusing the Phase-11 SjtCasoAbertoScreen + useAutosaveAvaliacao machinery verbatim; the candidate NEVER sees a score/color/threshold (RNF-07a).**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-24T14:33:06Z
- **Completed:** 2026-06-24T14:40:40Z
- **Tasks:** 3 (Tasks 1+2 TDD — flipped Wave-0 RED scaffolds GREEN)
- **Files:** 5 created + 5 modified (3 source edits + 2 test scaffold @ts-expect-error removals)

## Accomplishments

- **Task 1 — schema + service (TDD GREEN):** `redacaoSchema.respostaRedacaoSchema` is `.strict()` over `{candidatura_id (uuid), pergunta_id (uuid), texto (min 1)}` — an injected `score`/`pontuacao` is rejected (anti-tamper, RNF-07a). `redacaoService` exports `REDACAO_CANDIDATO_ALLOWLIST` (verdict-excluding) and reaches three reads through it (no `select('*')` anywhere in code): `getRedacaoContext` (perguntas_redacao `.eq('ativa', true)`), `getRedacaoCandidato` + `getMinhasRedacoes` (candidate own-row on `redacoes_candidato`). `enviarRedacao` validates via the `.strict()` schema then invokes `avaliar-redacao-cultural` with only `{candidatura_id, pergunta_id, texto}`, returning the neutral ack, with the LOCKED/INVALID_INPUT/NETWORK_ERROR map cloned from `bigfiveService`. Flipped redacaoService (4/4) + redacao-contract (5/5) GREEN.
- **Task 2 — counter + cronômetro (TDD GREEN):** `RedacaoCounter` extracts `countWords` verbatim from `SjtCasoAbertoScreen` and renders the 3-band code-of-colors (muted `<200` / `#35BFAD` `200-500` / `text-amber-300/80` `>500`); the displayed count is 200ms-debounced on edits but synchronous on first render (so the bare test's immediate band assertions pass), exposes `data-submit-enabled` + `onValidChange` to drive submit-disabled, and keeps below-min NEUTRAL (never alarm-red). `RedacaoCronometro` is an informative `setInterval` elapsed timer ("Tempo nesta redação: mm:ss") — no countdown, no alarm color. Flipped RedacaoCounter (3/3) GREEN.
- **Task 3 — editor screen + container branch + route:** `RedacaoEditorScreen` copies the `SjtCasoAbertoScreen` glass shell (D-27 — `BackgroundImage` gradient + `max-w-2xl` + `GlassPanel variant="white" blur="xl"`, NOT a new shell), reuses `useAutosaveAvaliacao({ teste: 'redacao' })` + the `AutosaveAffordance` (#35BFAD Check), renders the seeded prompt + `Textarea` + `RedacaoCounter` + `RedacaoCronometro`, paginates "Pergunta {n} de {total}" with a "Próxima pergunta" CTA and a "Redações concluídas." all-done state, and gates submit through the irreversible `AlertDialog` ("Enviar redação?" / "Você ainda pode revisá-la até concluir esta etapa." / "Enviar" · "Continuar escrevendo") → `enviarRedacao` → neutral "Resposta registrada. Você pode revisar até concluir a etapa." (RF-R-06, no score). The RLS back-lock surfaces neutrally ("Sua etapa avançou."). `AvaliacaoContainer.handleOpenTeste` gains a `redacao` branch → `/candidato/redacao/:id` (+ "Redação cultural" label); the route is registered under `RoleGuard role="candidato"` mirroring the `/caso` block.
- **Quality gates:** all 3 plan-named test files GREEN (redacaoService 4/4 + redacao-contract 5/5 + RedacaoCounter 3/3 = 12/12); full avaliacao feature suite 36/36; full vitest 495 tests passed / 0 test failures (3 out-of-scope RED *files* deferred — see Deviations); `npm run build` exit 0; tsc baseline 291 (flat — zero growth).

## Task Commits

Each task committed atomically (hook-bypass `git -c core.hooksPath=/dev/null` per project convention):

1. **Task 1: client schema + allowlist service** — `89a985e` (feat)
2. **Task 2: RedacaoCounter (3-band) + RedacaoCronometro** — `903dcf3` (feat)
3. **Task 3: RedacaoEditorScreen + container branch + route** — `1c4e2c5` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `src/features/avaliacao/schemas/redacaoSchema.ts` — `.strict()` no-score client body
- `src/features/avaliacao/services/redacaoService.ts` — verdict-excluding allowlist reads + enviarRedacao neutral-ack invoke
- `src/features/avaliacao/components/RedacaoCounter.tsx` — 3-band 200ms-debounced word counter
- `src/features/avaliacao/components/RedacaoCronometro.tsx` — informative elapsed timer
- `src/features/avaliacao/components/RedacaoEditorScreen.tsx` — candidate essay editor (glass shell + autosave + counter + submit dialog + neutral post-submit)
- `src/features/avaliacao/components/AvaliacaoContainer.tsx` — handleOpenTeste redacao branch + testeLabel
- `src/features/avaliacao/components/index.ts` — Phase-13 barrel exports
- `src/router/routes.tsx` — `/candidato/redacao/:candidaturaId` route
- `src/features/avaliacao/services/__tests__/redacaoService.test.ts` — removed self-resolving `@ts-expect-error` (now GREEN)
- `src/features/avaliacao/components/__tests__/RedacaoCounter.test.tsx` — removed self-resolving `@ts-expect-error` (now GREEN)

## Decisions Made

- **Candidate own-row read targets `redacoes_candidato` with a verdict-excluding allowlist** — `REDACAO_CANDIDATO_ALLOWLIST = 'id, pergunta_id, texto, word_count, submetida_em, status_analise'` excludes every score/color/revisor column. RLS denies the *row* but cannot hide *columns*; the allowlist is the defense (T-13-03-01, [[reference_select_star_leaks_pii]]).
- **Autosave reuses `respostas_avaliacao` (teste='redacao') via `upsertResposta`** — per the plan's `<interfaces>` block, not the dedicated `redacoes_candidato_em_progresso` table (that is the EF/Plan-02 surface). The buffer namespaces the draft by `pergunta_id` so multi-question essays autosave independently under one teste key — the established Phase-11 pattern, no new autosave surface.
- **perguntas_redacao filter uses `.eq('ativa', true)`** — the live column (migration `20260623100001`) is `ativa` (boolean), NOT `status`; the read orders by `is_padrao` so the universal PADRAO_BS prompt leads.
- **Submit-disabled tooltip on a wrapping `<span title=...>`** — `GlassButton` has no `title` prop; passing it directly grew the tsc baseline (291→292). Wrapping preserves the UI-SPEC copy ("A redação precisa ter entre 200 e 500 palavras.") with zero baseline growth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed self-resolving `@ts-expect-error` in the two flipped RED scaffolds**
- **Found during:** Tasks 1 + 2
- **Issue:** The Plan-01 RED scaffolds (`redacaoService.test.ts:51`, `RedacaoCounter.test.tsx:28`) carried `@ts-expect-error — module lands in Plan 13-03`. Once the modules exist the directives become unused (TS2578), growing the tsc baseline.
- **Fix:** Replaced each stale directive with a GREEN comment; the imports now resolve under tsc + Vitest. This is the designed RED→GREEN transition.
- **Files modified:** `redacaoService.test.ts`, `RedacaoCounter.test.tsx`
- **Verification:** tsc baseline returned to 291 (flat); the 3 plan-named test files GREEN.
- **Committed in:** `89a985e` (service test) + `903dcf3` (counter test)

**2. [Rule 3 - Blocking] Submit-disabled tooltip moved off GlassButton**
- **Found during:** Task 3
- **Issue:** A `title` prop on `GlassButton` is not in its prop type (TS2322) — the baseline grew 291→292.
- **Fix:** Wrapped the `AlertDialogTrigger`/`GlassButton` in a `<span title=...>` carrying the UI-SPEC tooltip copy.
- **Files modified:** `RedacaoEditorScreen.tsx`
- **Verification:** tsc baseline 291 (flat); build exit 0.
- **Committed in:** `1c4e2c5`

### Out-of-scope discoveries (deferred, NOT fixed)

A whole-suite `vitest run` reports 3 failing test *files* (0 failing *tests* — all fail at module resolution). All three are pre-existing RED scaffolds outside Plan 13-03's scope (the candidate essay layer); logged to `deferred-items.md` (DI-13-02, DI-13-03):
- `RedacaoOverrideForm.test.tsx` + `RedacaoSidebar.test.tsx` — Plan **13-05** RH-queue surfaces (calibrated RED until 13-05).
- `essay-schemas.test.ts` — a Deno EF test that fails under Vitest's lack of an `npm:` resolver (run via `deno test`; precedent DI-13-01).

**Total deviations:** 2 auto-fixed (both Rule 3 blocking — RED→GREEN directive cleanup + a prop-type fix that kept the baseline flat). No bugs, no architectural changes. The plan executed as written.

## Known Stubs

None — every surface is fully wired. `getRedacaoContext`/`getMinhasRedacoes` read real tables (the `as never`-free narrow casts drop on the 13-04 regen); `enviarRedacao` targets the real `avaliar-redacao-cultural` EF. **Runtime requires the Plan 13-04 apply wave** (the EF + tables are authored but not yet deployed/applied to PROD) — this is a documented cross-plan dependency, not a stub: the UI/service code is complete and correct against the authored contract.

## Threat Flags

None — every surface introduced maps to the plan's `<threat_model>` (T-13-03-01 verdict-excluding allowlist, T-13-03-02 `.strict()` anti-tamper, T-13-03-03 neutral back-lock, T-13-03-SC zero net-new packages). No new network endpoints, auth paths, or trust-boundary surfaces beyond the planned EF invoke + own-row read.

## Self-Check: PASSED

All 5 created files verified on disk (redacaoSchema.ts, redacaoService.ts, RedacaoCounter.tsx, RedacaoCronometro.tsx, RedacaoEditorScreen.tsx); all 3 task commits (`89a985e`, `903dcf3`, `1c4e2c5`) found in git log. tsc baseline 291 (flat); 3 plan-named test files 12/12 GREEN; build exit 0; candidate-allowlist verdict-exclusion assertion GREEN.

---
*Phase: 13-reda-o-cultural-revis-o-humana*
*Completed: 2026-06-24*
