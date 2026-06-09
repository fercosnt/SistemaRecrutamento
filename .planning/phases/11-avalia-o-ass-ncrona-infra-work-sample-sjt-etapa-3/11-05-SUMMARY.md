---
phase: 11
plan: 05
subsystem: avaliacao
tags: [candidato, sjt, ui, glass, rnf-07a, autosave, anti-cheat]
requires:
  - "11-03 (avaliacaoService + useAutosaveAvaliacao + testesAplicaveis ext)"
  - "11-04 (PROD apply: perguntas/perguntas_opcao_sjt/respostas_avaliacao, pontuar_sjt + get_opcoes_sjt RPCs, avaliar-redacao EF, database.types.ts)"
provides:
  - "candidate Avaliação Assíncrona container (/candidato/avaliacao/:candidaturaId)"
  - "SJT multiple-choice screen (radio-group + soft timer + per-session option shuffle)"
  - "SJT open-case screen (textarea + 200-500 word count + autosave + back-lock)"
  - "avaliacaoService.getOpcoesSjt (answer-key-safe option reader)"
  - "features/avaliacao/components barrel (extended by 11-06)"
affects:
  - "src/router/routes.tsx (3 new guarded candidato routes)"
tech-stack:
  added: []
  patterns:
    - "presentational-vs-connected split so the Wave-0 RED test mounts bare (no Router/QueryClient)"
    - "Fisher-Yates per-session option shuffle on top of server-randomized get_opcoes_sjt (defense in depth)"
    - "neutral RLS back-lock surfacing via useAutosaveAvaliacao locked state (never an error toast)"
key-files:
  created:
    - src/features/avaliacao/components/AvaliacaoContainer.tsx
    - src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx
    - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
    - src/features/avaliacao/components/index.ts
  modified:
    - src/features/avaliacao/services/avaliacaoService.ts
    - src/router/routes.tsx
decisions:
  - "Container accepts an optional testes prop → presentational mode for the bare RED test; production reads the route param + TanStack Query (no Router required in the test path)"
  - "getOpcoesSjt added to the service (Rule 2) — the MC screen needs an answer-key-safe option reader; the live get_opcoes_sjt RPC projects opcao_id+opcao_texto only"
  - "Open-case + MC screens get their own /mc and /caso routes (the container CTA routes by formato); both RoleGuard candidato, etapa gate is server-enforced by RLS"
metrics:
  duration: ~22min
  completed: 2026-06-09
  tasks: 2
  files_created: 4
  files_modified: 2
---

# Phase 11 Plan 05: Candidate Avaliação Assíncrona UI Summary

Wired the real candidate-facing Avaliação Assíncrona flow on top of the live backend (11-04) and service/hooks layer (11-03): a glass-shell container listing neutral per-teste cards, an SJT multiple-choice screen, and an SJT open-case screen — the candidate never sees a score, threshold, or pass/fail (RNF-07a).

## What Was Built

### Task 1 — Container + barrel + guarded route (commit d600258)
- `AvaliacaoContainer.tsx`: replicates the `DashboardCandidatoPage` glass shell (D-27 — `BackgroundImage` gradient + sticky glass navbar + `BeautySmileLogo` + `GlassPanel`/`GlassCard`), heading downscaled to `text-3xl md:text-4xl` for mobile. Renders one neutral card per `testes_aplicaveis` entry with status pill (Pendente=`Circle`/white-70, Concluído=`CheckCircle2`/#35BFAD, Indisponível=`Lock`/white-60) + "Tempo estimado: ~{N} min" + a "Começar/Continuar avaliação" CTA. Empty → "Nenhuma avaliação pendente", all-done → "Tudo concluído!", load-error → retry state, wrong-etapa → neutral "Esta avaliação não está disponível." lock.
- Two render modes: a `testes`-prop **presentational** mode (the 11-01 RED test mounts `<AvaliacaoContainer testes={...} />` bare, no providers) and a **connected** mode (route param + `getAvaliacaoContext` via TanStack Query).
- `avaliacaoService.getOpcoesSjt(perguntaId)` added (Rule 2) — calls the live `get_opcoes_sjt` RPC, which projects ONLY `opcao_id` + `opcao_texto` (never peso/tag), server-randomized.
- `components/index.ts` barrel + 3 guarded routes (`/candidato/avaliacao/:candidaturaId` + `/mc` + `/caso`), all `RoleGuard role="candidato"`.

### Task 2 — SJT screens (commit 6d658f7)
- `SjtMultiplaEscolhaScreen.tsx`: per-situation ("Situação {n} de {total}") `radio-group` of options fetched via `getOpcoesSjt`; a per-session Fisher-Yates shuffle layers on top of the server randomization (defense in depth, opcao_id→label stable). Soft timer "Tempo sugerido: {mm:ss} (sem limite rígido)" counts up with NO hard cutoff. "Avançar"/"Voltar" between items; "Concluir avaliação" on the last opens the `alert-dialog` confirm ("Enviar avaliação?" / "Após enviar, você não poderá editar suas respostas." / Enviar / Revisar) → `pontuarSjt` posts ONLY the option picks. No client score.
- `SjtCasoAbertoScreen.tsx`: "Caso prático" + scenario + `textarea` with the 3 word-count helper variants ("{N} palavras" / "— mínimo 200" / "— máximo 500"); submit gated until ≥200 words. `useAutosaveAvaliacao` (30s debounce + on-blur `flushNow`) drives the neutral autosave affordance (Salvando…/Salvo automaticamente with `Check` #35BFAD/tentando novamente). On `locked` (RLS back-lock, etapa advanced) the screen swaps to the neutral "Sua etapa avançou…" lock state. Submit → confirm → `avaliarRedacao` posts ONLY the text.

## Deviations from Plan

### Auto-added Functionality

**1. [Rule 2 - Missing critical functionality] Added `getOpcoesSjt` to avaliacaoService**
- **Found during:** Task 1 (interface scan) — the plan's MC screen must fetch options via the `get_opcoes_sjt` RPC, but the 11-03 service exposed `getAvaliacaoContext/loadResposta/pontuarSjt/avaliarRedacao` only, not an option reader.
- **Fix:** Added `getOpcoesSjt(perguntaId)` + `OpcaoSjt` interface — calls the live RPC, returns `{opcao_id, opcao_texto}[]` (answer-key-safe; never peso/tag). This is correctness-required: without it the MC radio-group has no data source.
- **Files modified:** src/features/avaliacao/services/avaliacaoService.ts
- **Commit:** d600258

### Self-resolved blocking issue

**2. [Rule 3 - Blocking] `<Glass />` requires children**
- The `Glass` primitive's props mark `children` as required; two skeleton placeholders used a self-closing `<Glass ... />`, producing 2 tsc errors. Wrapped each with a `<span />` child. tsc returned to baseline.

## Verification

- `npm run test:run -- AvaliacaoContainer` → 3/3 GREEN (the 11-01 RED test is flipped GREEN).
- `npm run test:run -- forbidden-strings` → 9/9 GREEN (LGPD-04 grep over the new component copy).
- Full suite: **458/458 vitest passing**.
- tsc: **291 errors** (baseline ≤293 ✓; zero errors in the new avaliacao/routes files).
- `npm run build`: **exit 0**.

## Threat Surface

All three threat-register mitigations applied:
- T-11-05-01 (info disclosure): zero score/threshold/percent in the candidate copy; forbidden-strings guard GREEN; neutral status only.
- T-11-05-02 (tampering): screens submit only `opcao_id`s / answer text via the service; no client-side score.
- T-11-05-03 (back-lock): `useAutosaveAvaliacao` `locked` state surfaces the neutral "Sua etapa avançou…" message; DB RLS is the real enforcement.

No new threat surface beyond the plan's `<threat_model>`.

## Known Stubs

None. The UI is wired to live RPCs (`get_opcoes_sjt`, `pontuar_sjt`), the live EF (`avaliar-redacao`), and the live `getAvaliacaoContext` read — no mock/empty data sources.

## Self-Check: PASSED

- FOUND: src/features/avaliacao/components/AvaliacaoContainer.tsx
- FOUND: src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx
- FOUND: src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
- FOUND: src/features/avaliacao/components/index.ts
- FOUND: commit d600258 (Task 1)
- FOUND: commit 6d658f7 (Task 2)
