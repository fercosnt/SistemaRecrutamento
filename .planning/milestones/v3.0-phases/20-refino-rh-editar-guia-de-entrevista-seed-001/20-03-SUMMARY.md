---
phase: 20-refino-rh-editar-guia-de-entrevista-seed-001
plan: 03
subsystem: features/entrevista (RH interview-guide edit data + server-state layer)
tags: [ENTREV-06, ENTREV-07, ENTREV-08, service, hook, tanstack-query, anti-tamper, lgpd]
requires:
  - "save_entrevista_guia_edits RPC (20-02, live in PROD)"
  - "entrevista_guias.updated_at + UNIQUE(candidatura_id,tipo) (20-02)"
  - "database.types.ts regenerated with the RPC + column (20-02)"
provides:
  - "saveGuiaEdits(candidaturaId, tipo, perguntas) — the guide-edit write the UI (20-05) consumes"
  - "origem-aware normalizeGuia (legacy/missing → 'ia') — read layer carries provenance"
  - "GuiaPergunta.origem?: 'ia' | 'manual' + EntrevistaGuiaRow.updated_at"
  - "ENTREVISTA_GUIA_ALLOWLIST extended with updated_at (no select('*'))"
  - "useGuiaEntrevista.saveEdits mutation invalidating entrevistaKeys.guia(candidaturaId)"
affects:
  - "20-04 (EF merge-preserve — reads origem the service now carries)"
  - "20-05 (edit-mode UI — consumes saveEdits + origem badge)"
tech-stack:
  added: []
  patterns:
    - "RPC write cloned from salvarAvaliacao (swap RPC name + payload), mapRpcError reused verbatim"
    - "Json cast at the RPC boundary (`as unknown as Json`) — configVagaService precedent"
    - "origem-aware read normalization (default 'ia', preserve explicit 'manual')"
    - "TanStack mutation invalidating the SAME guide key the read + gerar use (targeted invalidation)"
key-files:
  created:
    - ".planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/20-03-SUMMARY.md"
  modified:
    - "src/features/entrevista/services/entrevistaService.ts"
    - "src/features/entrevista/hooks/useEntrevistaScorecard.ts"
    - "src/features/entrevista/__tests__/guia-normalize.test.ts"
    - "src/features/entrevista/__tests__/entrevista-contract.test.ts"
    - "src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts"
decisions:
  - "p_guia cast `as unknown as Json` at the RPC boundary — GuiaPergunta's `[k]:unknown` index signature is structurally wider than Json; the RPC stores opaque jsonb anyway (configVagaService p_opcoes precedent). Held tsc at the 257 baseline."
  - "origem coercion is allowlist-style: only an explicit 'manual' is preserved; ANY other value (missing/legacy/garbled) → 'ia' (A2: legacy guides are wholly AI-generated, no backfill)."
  - "saveEdits mutation vars carry { tipo, perguntas } — the guide is online|presencial and the panel knows which it edits; tipo threaded through the vars rather than hook-positional."
metrics:
  duration: "~9min"
  completed: 2026-06-29
  tasks: 2
  files: 5
  tsc: 257
  tests: "675/675 (full suite; +13 new in this plan)"
---

# Phase 20 Plan 03: Refino RH — Editar Guia (Service + Hook layer) Summary

**One-liner:** Added the guide-edit data + server-state contract — `saveGuiaEdits` calls the live `save_entrevista_guia_edits` RPC (42501→FORBIDDEN, no PII), origem-aware `normalizeGuia` (legacy→'ia'), `updated_at` allowlist, and `useGuiaEntrevista.saveEdits` invalidating the guide key — all green at the 257 tsc baseline.

## Objective (met)

Defined the clone-with-one-swap data + server-state layer the 20-04 EF and 20-05 edit UI consume: the RPC write, the origem-aware read normalization, the allowlist extension, the `GuiaPergunta.origem` shape, and the `saveEdits` mutation — with service/hook tests proving ENTREV-06/07/08 deterministically (RPC payload, 42501 mapping, origem normalization, hook invalidation, anti-tamper).

## What shipped

### Task 1 — saveGuiaEdits + origem-aware normalizeGuia + updated_at allowlist (commit `80c10c1`)

- **`saveGuiaEdits(candidaturaId, tipo, perguntas)`** — clones `salvarAvaliacao`: guards empty `candidaturaId` → `INVALID_INPUT`; calls `supabase.rpc('save_entrevista_guia_edits', { p_candidatura_id, p_tipo, p_guia: { perguntas } })`; on error `throw mapRpcError(...)` (reused verbatim — 42501→FORBIDDEN, 23514→INVALID_INPUT, P0002/no_data_found→NOT_FOUND, else NETWORK_ERROR); reads the guide back via `getGuia` (allowlist). The raw RPC error/PII is NEVER surfaced (static pt-BR copy). RNF-07a: never writes `candidaturas`.
- **`normalizeGuia` origem-awareness** — the questions→perguntas map now stamps `origem: q.origem === 'manual' ? 'manual' : 'ia'`. The read layer carries provenance; legacy/missing/garbled defaults to `'ia'` (A2, no backfill); only an explicit `'manual'` is preserved. The already-pt-BR passthrough branch keeps origem untouched (it spreads).
- **`ENTREVISTA_GUIA_ALLOWLIST`** appended `, updated_at` (NEVER `select('*')` — `reference_select_star_leaks_pii` / Pitfall 6).
- **Shapes:** `GuiaPergunta` gained `origem?: 'ia' | 'manual'`; `EntrevistaGuiaRow` gained `updated_at?: string | null`; `EfGuiaQuestion` gained `origem?: string` for the normalize pass-through.
- **Json boundary:** `p_guia` cast `as unknown as Json` (database.types types it as `Json`; `GuiaPergunta`'s index signature is structurally wider). Held tsc at 257.
- **Tests:** `guia-normalize.test.ts` +4 origem cases (legacy→'ia', preserve 'manual', garbled→'ia', pt-BR passthrough with origem); `entrevista-contract.test.ts` +6 saveGuiaEdits cases (RPC payload shape, INVALID_INPUT no-call, 42501→FORBIDDEN, no-PII message, anti-tamper p_guia carries no score/band/veredito, never-writes-candidaturas).

### Task 2 — useGuiaEntrevista.saveEdits mutation (commit `e63445c`)

- **`saveEdits` mutation** added to `useGuiaEntrevista`, cloning the `gerar` mutation: `mutationFn: (vars: { tipo; perguntas }) => saveGuiaEdits(candidaturaId!, vars.tipo, vars.perguntas)`; `onSuccess` invalidates `entrevistaKeys.guia(candidaturaId || '')` — the SAME key the read query + `gerar` use, so the panel re-renders with the saved guide. Returns `{ ...query, gerarGuia: gerar, saveEdits }` (gerarGuia preserved).
- **Imports** `saveGuiaEdits` + `GuiaPergunta` extended into the existing service import block.
- **Tests:** `useEntrevistaScorecard.test.ts` +3 hook cases (saveGuiaEdits called with `(candidaturaId, tipo, perguntas)`; invalidates the guide key on success; saveEdits coexists with gerarGuia).

## Verification

- `npm run test:run -- src/features/entrevista` → **46/46 green** (allowlist 4, contract 22, guia-normalize 10, hook 5, citacoes 5).
- `npm run test:run` (full) → **675/675 green** (was 662; +13 new in this plan).
- `npm run lint` (tsc --noEmit) → **257 error TS** (held at baseline; the transient +1 from the Json mismatch was fixed by the boundary cast).
- Grep gates: `supabase.rpc('save_entrevista_guia_edits'` present (entrevistaService L502); `saveEdits` useMutation returned from `useGuiaEntrevista` (L98, L106); `ENTREVISTA_GUIA_ALLOWLIST` contains `updated_at`, no `select('*')`.

## Threat model (mitigations applied)

| Threat ID | Disposition | How mitigated this plan |
|-----------|-------------|-------------------------|
| T-20-09 (Tampering — client posts score/band) | mitigate | `entrevista-contract` anti-tamper test asserts the `p_guia` payload carries no `banda/band/veredito/threshold/aprovado/reprovado`; the RPC stores opaque jsonb; saveGuiaEdits never writes `candidaturas` (RNF-07a) |
| T-20-10 (Info disclosure — over-projection) | mitigate | `ENTREVISTA_GUIA_ALLOWLIST` adds `updated_at` explicitly; no `select('*')` (RLS is row-level only) |
| T-20-11 (Repudiation — manual question loses provenance on read) | mitigate | `normalizeGuia` carries origem through; legacy/missing → 'ia' (A2); origem-normalize tests pin both the preserve-manual and default-ia branches |
| T-20-SC (supply-chain) | accept | zero external packages added this phase |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `p_guia` payload Json type mismatch**
- **Found during:** Task 1 (tsc check)
- **Issue:** `database.types.ts` types the RPC arg `p_guia` as `Json`; `{ perguntas: GuiaPergunta[] }` is not assignable because `GuiaPergunta`'s `[k: string]: unknown` index signature is structurally wider than `Json` → tsc rose to 258.
- **Fix:** Cast `p_guia: { perguntas } as unknown as Json` at the RPC boundary (established repo precedent: `configVagaService.ts:103` `p_opcoes as unknown as Json`); imported `type { Json } from '@/../database.types'`. The RPC stores opaque jsonb, so the cast is faithful to the runtime contract.
- **Files modified:** `src/features/entrevista/services/entrevistaService.ts`
- **Commit:** `80c10c1`
- **Result:** tsc back to 257.

No other deviations — the plan executed as written (clone-with-one-swap).

## Known Stubs

None. Both surfaces are fully wired to the live RPC (20-02) and the existing read/invalidation plumbing. The edit-mode UI that drives `saveEdits` (and stamps `origem:'manual'` on added rows) is plan 20-05's scope, explicitly deferred there.

## Self-Check: PASSED

- `src/features/entrevista/services/entrevistaService.ts` — FOUND (saveGuiaEdits + origem normalize + allowlist)
- `src/features/entrevista/hooks/useEntrevistaScorecard.ts` — FOUND (saveEdits mutation)
- `src/features/entrevista/__tests__/guia-normalize.test.ts` — FOUND (origem cases)
- `src/features/entrevista/__tests__/entrevista-contract.test.ts` — FOUND (saveGuiaEdits contract)
- `src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts` — FOUND (saveEdits hook test)
- Commit `80c10c1` (Task 1) — FOUND
- Commit `e63445c` (Task 2) — FOUND
