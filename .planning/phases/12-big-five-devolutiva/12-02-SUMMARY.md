---
phase: 12-big-five-devolutiva
plan: 02
subsystem: avaliacao (Big Five scoring + devolutiva data foundation)
tags: [bigfive, ipip-neo-120, scoring, ts-port, migrations, zod, anti-tamper, lgpd]
requires:
  - scores_candidato (Phase 11, tipo='big_five' forward-declared)
  - _shared/avaliacao-schemas.ts (Phase 11)
  - bigfive-scoring.test.ts + bigfive-contract.test.ts (12-01 Wave-0 RED)
provides:
  - _shared/bigfive-scoring.ts (REVERSED 55, FACET_TO_DOMAIN, facetOf, reverse, NORMS V1 fallback, percentileFromT, band, normGroupFromBirthDate, score())
  - SubmitBigfiveFinalBodySchema (.strict) + BigfiveDevolutivaSchema
  - 20260612000001_bigfive_itens.sql (table + 120 seed + get_bigfive_itens + RLS)
  - 20260612000002_devolutivas_candidato.sql (table + own-row + RH allowlist RLS)
affects:
  - 12-03 (submit-bigfive-final EF consumes score() + SubmitBigfiveFinalBodySchema + get_bigfive_itens)
  - 12-04 (gerar-devolutiva-bigfive EF consumes BigfiveDevolutivaSchema + devolutivas_candidato)
  - 12-06 [BLOCKING] (applies both migrations via MCP, regen database.types.ts)
tech-stack:
  added: []
  patterns:
    - "TS-port deterministic scorer with verbatim-transcribed answer key + golden test (Pitfall 1)"
    - "V1 fallback norm (sex='N' adult) when norm.py is absent — percentile precision is V2/UAT"
    - "SECURITY DEFINER answer-key-safe reader projecting only safe columns (mirror get_opcoes_sjt)"
    - ".strict() anti-tamper body schema (no score field) + client↔EF source-probe contract"
    - "D-22 no-wrapper migrations, authored-not-applied (apply is the [BLOCKING] wave)"
key-files:
  created:
    - supabase/functions/_shared/bigfive-scoring.ts
    - supabase/migrations/20260612000001_bigfive_itens.sql
    - supabase/migrations/20260612000002_devolutivas_candidato.sql
  modified:
    - supabase/functions/_shared/avaliacao-schemas.ts
decisions:
  - "Norm table V1 fallback: norm.py (560 values) is NOT in the repo (verified 2026-06-09) → CONTEXT-locked fallback = combined sex='N' adult norm centered on scale midpoint, annotated // V1 fallback. NORMS is a label-keyed map so adding the Johnson groups later is additive; normGroupFromBirthDate derives sex='N' + age band for auditable metadata."
  - "score() returns dimensoes in OCEAN order with raw/percentil/banda + 30 facetas raw + echoed norm_group — exactly the 12-CONTEXT metadata shape."
  - "get_bigfive_itens uses LANGUAGE sql SECURITY DEFINER (no auth check needed — item texts are not PII; the secret is the dim/faceta/reverse key, which the projection withholds). RH manage policy uses 'administrador'."
  - "devolutivas_candidato is candidate-facing (own-row SELECT via auth.uid()) — the inverse of scores_candidato (candidate-denied). UNIQUE(candidatura_id) for idempotent regen."
metrics:
  duration: ~25min
  completed: 2026-06-09
  tasks: 2
  files: 4
---

# Phase 12 Plan 02: Big Five Scoring + Schema + Migration Data Foundation Summary

Deterministic IPIP-NEO-120 TS-port scorer (verbatim 55-item reverse key + V1 fallback norm + percentile cubic + bands), the `.strict` anti-tamper EF body schema + RFB-15 devolutiva output schema, and the two authored-not-applied migrations (item bank with answer-key-safe reader + candidate-facing devolutiva sink) — flipping both 12-01 Wave-0 RED tests GREEN.

## What Was Built

**Task 1 — Scorer + schemas (eb22800):**
- `_shared/bigfive-scoring.ts`: `REVERSED` (55 ids, per-domain N7/E6/O12/A17/C13), `FACET_TO_DOMAIN`, `facetOf`, `reverse`, the `NORMS` V1 fallback constant (sex='N' adult, midpoint-centered), `percentileFromT` (Johnson cubic, clamp 1..99), `band` (≤15/16-35/36-64/65-84/≥85), `normGroupFromBirthDate`, and `score()` returning the 12-CONTEXT `{ dimensoes, facetas, norm_group }` shape.
- `_shared/avaliacao-schemas.ts`: appended `SubmitBigfiveFinalBodySchema` (`.strict`, `respostas` record of int 1..5, uuid candidatura_id, no score field) + `BigfiveDevolutivaSchema` (RFB-15 structured output). All pre-existing exports preserved (`AvaliarRedacaoBodySchema`, `WorkSampleScoringSchema`, primitives).
- **Tests GREEN:** 8/8 deno scorer golden + 7/7 vitest client↔EF contract.

**Task 2 — Migrations (b227daf):**
- `20260612000001_bigfive_itens.sql`: table (item_id PK, texto, dimensao CHECK O/C/E/A/N, faceta 1..30, reverse_keyed, ordem) + **120-item seed** (texto from the on-disk PT-BR JSON; dim/faceta/reverse derived per PESQUISA; **55 reverse_keyed=true**) + RLS (RH manage, NO candidato SELECT) + `get_bigfive_itens()` SECURITY DEFINER projecting only item_id/texto/ordem (mirrors `get_opcoes_sjt`). D-22 no-wrapper.
- `20260612000002_devolutivas_candidato.sql`: table (conteudo_jsonb + audit modelo_ia/prompt_version) + own-row candidate SELECT (`candidato_id = auth.uid()`) + RH 'administrador' allowlist + service_role-only write (no candidate INSERT/UPDATE). D-22 no-wrapper.
- **Authored, NOT applied** — application is the 12-06 [BLOCKING] wave.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LGPD-04 forbidden-strings guard tripped by my own explanatory comments**
- **Found during:** Task 2 verification (the guard scans `supabase/migrations` + `_shared`).
- **Issue:** A header comment in the migration and a docstring in the schema literally quoted the RNF-12 banned clinical-label terms (in a "these terms must never appear" sentence) — the grep guard cannot tell intent from quotation, so it flagged them as violations.
- **Fix:** Reworded both comments to describe the rule without quoting the banned literals ("the clinical-label terms banned by RNF-12" / "sempre 'avaliação comportamental'").
- **Files modified:** `20260612000001_bigfive_itens.sql`, `_shared/avaliacao-schemas.ts`
- **Commit:** b227daf
- **Verification:** forbidden-strings guard 16/16 GREEN.

### Norm table — documented V1 fallback (not a deviation; CONTEXT-locked)
`norm.py` (560 Johnson values) is not in the repo (verified — only the item JSONs are in `docs/conhecimento/big-five/fontes/`). Per 12-CONTEXT post-research, the scorer uses the combined sex='N' adult fallback norm, annotated `// V1 fallback — precision is a V2/UAT refinement; Big Five is contextual`. The golden test is norm-independent for raws (which it pins exactly: domain raw 72 / facet raw 12 on the neutral vector) and only requires percentiles be clamped [1,99] and band-consistent — both satisfied.

## Verification

- `deno test supabase/functions/_shared/bigfive-scoring.test.ts` → 8/8 GREEN (reverse-set size, per-domain counts, verbatim id list, facetOf, FACET_TO_DOMAIN, golden raw 72/12, percentile clamp + band consistency, C-only reverse-math variant raw=68).
- `npm run test:run -- bigfive-contract` → 7/7 GREEN (120×1-5 parses, `.strict` rejects extra `score`, out-of-range/non-int fail, source-probe finds the exported `.strict()` schema with .min(1)/.max(5)).
- `npm run test:run -- forbidden-strings` → 16/16 GREEN.
- `npm run test:run` (full) → **476/476 GREEN** (no regression).
- `npm run lint` → tsc baseline **291** (flat; `_shared/` Deno modules are outside the tsc include scope).
- Migration verify: `get_bigfive_itens` present, BEGIN count = 0 (no-wrapper) in both files, 120 seed rows, 55 reverse_keyed=true.

## PROD Apply Deferred (12-06 [BLOCKING])
Neither migration is applied; `database.types.ts` is NOT edited. The 12-06 wave applies both via MCP `apply_migration` (the `$$` body in `get_bigfive_itens` is a 42601-risk push → MCP/SQL-Editor path), reconciles version rows, regenerates `database.types.ts`, and runs the 12-SMOKES (item-reader projection, 120/55 seed counts, candidate own-row devolutiva, RH allowlist).

## Self-Check: PASSED
- FOUND: supabase/functions/_shared/bigfive-scoring.ts
- FOUND: supabase/migrations/20260612000001_bigfive_itens.sql
- FOUND: supabase/migrations/20260612000002_devolutivas_candidato.sql
- FOUND: supabase/functions/_shared/avaliacao-schemas.ts (modified)
- FOUND commit: eb22800 (Task 1)
- FOUND commit: b227daf (Task 2)
