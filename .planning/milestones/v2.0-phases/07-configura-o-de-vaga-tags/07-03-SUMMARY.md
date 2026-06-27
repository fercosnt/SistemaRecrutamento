---
phase: 07-configura-o-de-vaga-tags
plan: 03
subsystem: config-vaga (non-UI half — contracts, persistence, validation)
tags: [config-vaga, schemas, service, hooks, publishGate, opcoes-normalizer, D-13]
requires:
  - 07-02 (live schema: enum_tag_opcao, pergunta_opcao_metadata, vagas.{testes_aplicaveis,pesos_avaliacao} jsonb, upsert_pergunta_opcoes_metadata + publish_vaga RPCs, regenerated database.types.ts)
  - 07-01 (Wave-0 RED test scaffolds)
provides:
  - "src/features/config-vaga schemas (pesos/testes/tag), cargoTemplates (8 cargos), configVagaTypes, configVagaService, hooks, publishGate"
  - "src/lib/opcoes/opcoesNormalize (NEUTRAL shared lib — opcoesToStrings/opcoesToObjects)"
  - "Phase-4 candidaturaFormSchema migrated to the neutral normalizer (D-13)"
affects:
  - 07-04 (UI consumes these contracts/service/hooks)
  - "F8/F10/F15 (downstream consumers of pergunta_opcao_metadata — join contract documented below)"
tech-stack:
  added: []  # zero new packages
  patterns:
    - "feature scaffold mirroring src/features/vagas (custom error class, *Keys hierarchy, RHF+Zod pt-BR)"
    - "neutral src/lib helper to keep feature→lib dependency acyclic (no vagas→config-vaga edge)"
    - "client publishGate pure fn (UX) + server publish_vaga RPC (authoritative D-12 gate)"
key-files:
  created:
    - src/lib/opcoes/opcoesNormalize.ts
    - src/features/config-vaga/schemas/pesosAvaliacaoSchema.ts
    - src/features/config-vaga/schemas/testesAplicaveisSchema.ts
    - src/features/config-vaga/schemas/tagOpcaoSchema.ts
    - src/features/config-vaga/templates/cargoTemplates.ts
    - src/features/config-vaga/types/configVagaTypes.ts
    - src/features/config-vaga/publishGate.ts
    - src/features/config-vaga/services/configVagaService.ts
    - src/features/config-vaga/hooks/useConfigVaga.ts
    - src/features/config-vaga/hooks/usePerguntaOpcaoMetadata.ts
    - src/features/config-vaga/hooks/index.ts
  modified:
    - src/features/vagas/schemas/candidaturaFormSchema.ts
decisions:
  - "nyquist_compliant left false — Plan 04 must flip its 4 component Wave-0 tests GREEN first (VALIDATION L101)"
  - "p_opcoes cast `as unknown as Json` at the RPC boundary (OpcaoMetadataInput[] has optional fields, not structurally Json)"
  - "TAGS_OPCAO literal list guarded against the generated enum via a compile-time conditional type"
metrics:
  duration: ~18 min
  completed: 2026-06-07
---

# Phase 7 Plan 03: config-vaga contracts, persistence & validation Summary

Scaffolded the non-UI half of `src/features/config-vaga/` (schemas, 8-cargo templates, DB-derived types, service with `ConfigVagaServiceError`, TanStack hooks + `configVagaKeys`, the D-12 `publishGate` pure fn) plus a NEUTRAL `src/lib/opcoes/opcoesNormalize.ts` helper, and migrated the shipped Phase-4 candidato reader (`candidaturaFormSchema.ts`) to the new `[{id,texto}]` jsonb shape via that neutral helper (D-13 / Pitfall 1). Flips the Plan-01 Wave-0 schema/template/service/publishGate tests and the Phase-4 D-13 regression GREEN.

## What Was Built

| Task | Deliverable | Commit |
|------|-------------|--------|
| 1 | Schemas (pesos/testes/tag) + cargoTemplates (8 cargos) + configVagaTypes + neutral opcoesNormalize + publishGate | `4a7d30c` |
| 2 | configVagaService (updateVagaConfig/upsertOpcoesMetadata/publishVaga + FORBIDDEN) + hooks + barrel | `28e309d` |
| 3 | Phase-4 candidaturaFormSchema D-13 migration via neutral lib (dedicated commit boundary) | `b935ca3` |

### Contracts established
- **pesosAvaliacaoSchema** — 4 weighted keys (triagem/work_sample_sjt/redacao_cultural/entrevista), `z.number().int()` + `.refine(sum===100)` + `somaPesos` (Pitfall 4 integer guard, D-07).
- **cargoTemplates** — all 8 real cargos, each pesos block sums to exactly 100 (starter values, D-09/UAT-calibrated). `getCargoTemplateDefaults(slug)` returns a DEEP COPY to copy-into-vaga (D-04 — no `vaga_templates` table, perguntas left empty per D-05).
- **tagOpcaoSchema** — 5-tag enum + `peso int -999..100` (matches DB CHECK) + nullable `nota_ia` (D-11).
- **configVagaService** — anon client only; `ConfigVagaServiceError` (vagas code union + `FORBIDDEN` mapping 42501); `updateVagaConfig` (vagas UPDATE, D-02), `upsertOpcoesMetadata` (`rpc('upsert_pergunta_opcoes_metadata')`), `publishVaga` (`rpc('publish_vaga')`).
- **publishGate** — pure fn returning the failing D-12 conditions (empty when all pass).

## F8/F10/F15 Join Contract (D-14 — documented per CONTEXT requirement)

`pergunta_opcao_metadata` stores BOTH `opcao_id` (primary join key, uuid minted by the sync RPC) AND `opcao_texto` (denormalized fallback/audit). Downstream consumers (F8 knockout, F10 score_match, F15 audit) MUST join on `opcao_id` as the primary key; `opcao_texto` is the fallback for matching against `respostas_formulario.resposta_opcoes` (which today stores answer strings, not ids) and for audit trails. The sync RPC writes the id-bearing jsonb (`[{id,texto}]`) back to `perguntas_formulario.opcoes_resposta` so the candidato form's selected string can later be reconciled to an `opcao_id`.

## Verification

- **Wave-0 targeted tests GREEN:** pesosAvaliacaoSchema (5), cargoTemplates (10), publishGate (5), configVagaService (4), candidaturaFormSchema D-13 (18 = 16 existing + 2 new) — all pass.
- **Full Vitest:** 384 individual tests passed, 0 failed. (Note: the pre-existing LoadingProgress carryover failure no longer surfaces — 0 failing tests.)
- **`npm run build`:** exit 0.
- **Type safety:** 0 tsc errors in any of the 12 plan-owned files (verified under TS strict).
- **D-13 assertions:** no `as string[]` casts remain in candidaturaFormSchema.ts; imports `opcoesToStrings` from `@/lib/opcoes/opcoesNormalize` (neutral — no vagas→config-vaga edge).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `OpcaoMetadataInput[]` → `Json` RPC arg type mismatch**
- **Found during:** Task 2 (tsc check after configVagaService)
- **Issue:** `supabase.rpc('upsert_pergunta_opcoes_metadata', { p_opcoes })` types `p_opcoes` as `Json`; `OpcaoMetadataInput[]` has optional fields so it is not structurally assignable to `Json` (TS2322).
- **Fix:** Imported `Json` from `database.types` and cast `opcoes as unknown as Json` at the RPC boundary (the payload is JSON-serializable; the cast is at the serialization edge only).
- **Files modified:** src/features/config-vaga/services/configVagaService.ts
- **Commit:** `28e309d`

**2. [Rule 1 - Bug] Unused `_tagsMatch` const guard (TS6133)**
- **Found during:** Task 1 (tsc check)
- **Issue:** The original compile-time enum-drift guard declared a runtime `const _tagsMatch` that TS strict flagged as unused (`'_tagsMatch' is declared but its value is never read`) — a NEW error in a plan-owned file.
- **Fix:** Replaced the runtime const with a pure type-level guard (`export type _TagsMatchGuard`), which is zero-runtime and not flagged.
- **Files modified:** src/features/config-vaga/schemas/tagOpcaoSchema.ts
- **Commit:** `4a7d30c`

## Out-of-Scope (NOT fixed — belongs to Plan 04)

The 4 remaining Wave-0 RED test files import `@/features/config-vaga/components/{TemplateVagaSelector,PesosSliders,PerguntaWithTagsForm,BulkMarkDialog}` — UI modules this plan intentionally does NOT build (Plan 04 owns the UI). They produce 4 TS2307 module-not-found errors (the only config-vaga tsc errors) and 4 failing test FILES in the full Vitest run. These are expected RED and are NOT in this plan's `files_modified`. Per the SCOPE BOUNDARY rule, they are left for Plan 04 to flip GREEN.

## Nyquist Compliance

`nyquist_compliant` stays `false` in 07-VALIDATION.md. Per VALIDATION L101 it flips to `true` only after Plans 03 AND 04 flip the Wave-0 tests GREEN. Plan 04 still has 4 RED component test files; this plan flipped its targeted subset (schemas/templates/service/publishGate/D-13) but not the UI tests. Plan 04 owns the flip.

## Self-Check: PASSED

All 11 created files + 1 modified file verified on disk; all 4 task/wave commits verified in git log (see Self-Check section appended below).
