---
phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil
plan: 05
subsystem: services
tags: [error-handling, edge-functions, supabase-functions-invoke, ai-unavailable, resil-03, vitest, no-pii]

# Dependency graph
requires:
  - phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil
    provides: "<AsyncState errorCode> component (18-04) — the consumer of the error_code this plan plumbs"
  - phase: 10-triagem-rh-com-ia-comparativo-etapa-2
    provides: "triagemService.invokeComparativo inline MIXED_VAGA read — the seed pattern generalized here"
provides:
  - "Shared extractEfErrorCode(data, error) helper (src/lib/efErrors.ts) — reads error_code from BOTH the 200 body and the non-2xx FunctionsHttpError body; never throws; code-only (no PII)"
  - "error_code surfaced on DecisaoServiceError / AvaliacaoServiceError / BigfiveServiceError / TriagemServiceError details so <AsyncState errorCode> can branch overload-vs-generic copy"
affects:
  - 18-06 (adopts <AsyncState> on the 5 AI screens — reads the error_code this plan threads through the services)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared transport→domain error_code extractor (data.error_code first, then await error.context.json()) wrapped in try/catch so a non-JSON body degrades to undefined and NEVER throws"
    - "Service error classes carry the extracted error_code on details ({ error_code, raw }) — code-only, never echoing raw transport text/PII (ASVS V7, T-18-05-ID)"
    - "Generalize one existing per-service inline error_code read into a shared helper to prevent integration-contract drift across AI services"

key-files:
  created:
    - src/lib/efErrors.ts
    - src/lib/__tests__/efErrors.test.ts
  modified:
    - src/features/decisao/services/decisaoService.ts
    - src/features/avaliacao/services/avaliacaoService.ts
    - src/features/avaliacao/services/bigfiveService.ts
    - src/features/triagem/services/triagemService.ts

key-decisions:
  - "extractEfErrorCode reads data.error_code FIRST (200/parsed body) then falls back to await error?.context?.json?.() error_code (non-2xx FunctionsHttpError); both shapes covered, degrades to undefined on non-JSON / thrown .json() — never throws (RESEARCH A3 + Pitfall 4)."
  - "Helper returns ONLY the string code (or undefined) and discards the rest of the body — no message/stack/PII crosses back to the component (ASVS V7, T-18-05-ID/ID2)."
  - "Each AI service carries the extracted code on its existing *ServiceError details as { error_code, raw } — keeps the (message, code, details?) constructor shape and the closed code union + verbatim PT-BR messages unchanged (only details enriched)."
  - "triagemService.invokeComparativo's inline MIXED_VAGA read is generalized through the shared helper while PRESERVING the MIXED_VAGA outcome (same thrown message/code) and additionally surfacing AI_UNAVAILABLE."
  - "decisaoService.getConsolidacao KEEPS its legacy 200-body data.ok===false branch (consolidar is NO-LLM, never emits AI_UNAVAILABLE) and wires error_code on both branches for a single uniform contract."
  - "bigfiveService has NO client-side gerar-devolutiva-bigfive invoke (devolutiva is generated server-side off submit-bigfive-final); the AI EF invoke wired is submit-bigfive-final, on its NETWORK_ERROR fallback only — the LOCKED (42501/403) and INVALID_INPUT (400) branches are unchanged."

patterns-established:
  - "When more than one service must translate the same transport→domain error_code, extract a single shared, never-throwing, code-only helper rather than copy the inline read per service (drift prevention)."

requirements-completed: []
requirements-partial: [RESIL-03]

# Metrics
duration: 7min
completed: 2026-06-29
---

# Phase 18 Plan 05: extractEfErrorCode Helper + AI-Service error_code Plumbing Summary

**Closed the RESIL-03 service-layer GAP: extracted ONE shared `extractEfErrorCode(data, error)` helper that reads the EF body's `error_code` (notably `AI_UNAVAILABLE` from a 503 `{ error_code, retryable }`) from BOTH the 200 body and the non-2xx `FunctionsHttpError`, degrading safely and code-only — then threaded it onto the thrown `*ServiceError` of all 4 AI-invoking services so the overload-vs-generic copy split in `<AsyncState errorCode>` (Plan 04) is now wireable.** Adoption on the actual screens is Plan 06.

## Performance

- **Duration:** ~7 min
- **Tasks:** 2 (both `type=auto`; Task 1 `tdd=true`)
- **Files:** 2 created, 4 modified
- **Commits:** 7b9da59 (helper + test), d878198 (service wiring)
- **tsc:** 258 errors (baseline unchanged — FOUND-08 tail, M4)
- **Tests:** 80 green across the plan surface (7 new efErrors + 73 existing decisao/triagem/avaliacao service+component)

## What Was Built

### Task 1 — Shared `extractEfErrorCode` helper + test (commit 7b9da59)

`src/lib/efErrors.ts` exports a NAMED `extractEfErrorCode(data, error): Promise<string | undefined>`:
- Reads `data.error_code` first (the 200/parsed-body shape).
- Falls back to `await error?.context?.json?.()` `error_code` (the non-2xx `FunctionsHttpError` shape, RESEARCH A3), wrapped in try/catch so a non-JSON body / a thrown `.json()` degrades to `undefined` and NEVER throws.
- Returns ONLY the string code (or `undefined`); discards every other body field — no message/stack/PII (ASVS V7).

`src/lib/__tests__/efErrors.test.ts` — 7 cases, including the four `<behavior>` cases: `data.error_code → AI_UNAVAILABLE`; `error.context.json()` body → `AI_UNAVAILABLE`; no code → `undefined`; `error.context.json()` rejects → `undefined` (degrades). Plus a no-Response null case, an empty-string → undefined case, and a "does not echo non-code fields" PII-safety case.

### Task 2 — Wire error_code into the 4 AI-invoking services (commit d878198)

All four import `extractEfErrorCode` from `@/lib/efErrors` and carry the extracted code on the thrown `*ServiceError` details as `{ error_code, raw }`:

- **`avaliacaoService.avaliarRedacao`** (primary `AI_UNAVAILABLE` surface) — error_code on the `NETWORK_ERROR` branch.
- **`bigfiveService.submitBigfiveFinal`** — error_code on the `NETWORK_ERROR` fallback; the `LOCKED` (42501/403) and `INVALID_INPUT` (400) branches are unchanged.
- **`triagemService.invokeComparativo`** — inline `MIXED_VAGA` read replaced by the shared helper; `MIXED_VAGA` outcome PRESERVED (same message/code) AND `AI_UNAVAILABLE` now surfaced.
- **`decisaoService.getConsolidacao`** — error_code on the `error` branch; the legacy 200-body `data.ok===false` branch KEPT (consolidar is NO-LLM) and also surfaces error_code for a uniform contract.

No read query / allowlist was modified; no new `select('*')` introduced (the 4 `select('*')` grep hits in `bigfiveService.ts` are pre-existing docstring warnings, not queries).

## Deviations from Plan

### Auto-fixed / clarified

**1. [Scope clarification] bigfiveService has no client-side `gerar-devolutiva-bigfive` invoke.**
- **Found during:** Task 2 (`<read_first>` said "find the `functions.invoke('gerar-devolutiva-bigfive')` caller").
- **Reality:** `gerar-devolutiva-bigfive` is generated server-side (off `submit-bigfive-final` / trigger), never invoked from the client. The only AI EF invoke in `bigfiveService` is `submit-bigfive-final`.
- **Resolution:** Wired the shared helper into the `submit-bigfive-final` invoke (the plan's Task 2 action (c): "bigfiveService devolutiva caller — same pattern"), satisfying the intent (surface AI_UNAVAILABLE on the bigfive service's thrown error) on the real invoke site. No file/path change vs the plan's `files_modified` (`bigfiveService.ts`).
- **Files modified:** src/features/avaliacao/services/bigfiveService.ts
- **Commit:** d878198

### Out of scope (logged, not fixed)

**A pre-existing duplicate inline `extractEfErrorCode` lives in `entrevistaService.ts` (L573).** It is the same drift this plan eliminates, but `entrevistaService.ts` is NOT in this plan's `files_modified` (scope boundary). Refactoring it to the shared helper is a clean follow-up (candidate for Plan 06 or a tech-debt item) — left untouched here.

## Threat Surface

No new network endpoints, auth paths, or schema changes. The plan's `<threat_model>` dispositions are all met:
- T-18-05-ID / ID2: helper + service errors carry ONLY the code, never raw transport text/PII (verified by the "does not echo non-code fields" test).
- T-18-05-ID3: no read query / allowlist modified; no `select('*')` introduced.
- T-18-05-T: only error-handling after `invoke` changed; nothing written to `candidaturas`; MIXED_VAGA + NO-LLM consolidar contracts preserved.

No `## Threat Flags` — nothing new introduced.

## Known Stubs

None. The helper and all wiring are fully functional; the only consumer not yet wired is the screens (Plan 06, by design).

## Verification

- `npm run test:run -- src/lib/__tests__/efErrors.test.ts` → 7 passed.
- `npm run test:run -- src/features/decisao src/features/triagem src/features/avaliacao/services` → 73 passed.
- `npm run lint` (tsc --noEmit) → 258 errors (baseline, no regression).
- grep confirms `extractEfErrorCode` in all 4 services; MIXED_VAGA + `data.ok===false` branches preserved.

## Self-Check: PASSED

All 7 declared files exist on disk; both commits (7b9da59, d878198) are in the git log.
