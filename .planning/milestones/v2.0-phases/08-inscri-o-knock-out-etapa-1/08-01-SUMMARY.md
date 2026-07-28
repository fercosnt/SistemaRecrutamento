---
phase: 08-inscri-o-knock-out-etapa-1
plan: 01
subsystem: testing
tags: [vitest, playwright, zod, sql-smoke, red-tests, lgpd, knockout]

requires:
  - phase: 07-configura-o-de-vaga-tags
    provides: pergunta_opcao_metadata (opcao_id + opcao_texto join-by-text fallback), enum_tag_opcao knockout, cargoTemplates.ts, publishGate.ts (D-12)
  - phase: 04-vagas-candidatura
    provides: submit_candidatura_atomic RPC, respostas_formulario.resposta_opcoes (option TEXT strings), cadastroCandidatoSchema / submitCandidaturaSchema (Deno EF)
provides:
  - RED unit scaffolds calibrated against pre-Phase-8 code (D-04 .strict() allowlist, D-03 email-only dedup, D-02 LGPD-clean dadosPessoaisSchema)
  - RED template/publish scaffolds (INSCR-03/D-14 default knockouts, INSCR-02/D-09 qualification gate)
  - 08-SQL-SMOKE-RUNBOOK.md (disposable-fixture SMOKE-1..4 for the knockout sweep, texto-join predicate, [VERIFY LIVE — A4] note)
  - e2e/inscricao-knockout.spec.ts (neutral D-15 message + no-criterion-leak guard)
affects: [08-02-PLAN, 08-03-PLAN, 08-04-PLAN, 08-05-PLAN]

tech-stack:
  added: []
  patterns:
    - "Wave 0 RED scaffold: tests compile under TS strict but FAIL at runtime against pre-implementation code — the failure IS the assertion the behavior is missing"
    - "Deno EF schema RED via node:fs source-text probe (esm.sh import unresolvable in Vitest) — flips GREEN exactly when .strict() lands in source"
    - "Augmented-shape cast (`as unknown as { qualificacao?: … }`) reads a not-yet-modeled field defensively so the file stays tsc-clean while failing at runtime"

key-files:
  created:
    - supabase/functions/_shared/__tests__/strict-schema.test.ts
    - src/features/cadastro/schemas/__tests__/candidatoSchema.test.ts
    - .planning/phases/08-inscri-o-knock-out-etapa-1/08-SQL-SMOKE-RUNBOOK.md
    - e2e/inscricao-knockout.spec.ts
  modified:
    - src/features/cadastro/services/__tests__/duplicateCheckService.test.ts
    - src/features/config-vaga/templates/__tests__/cargoTemplates.test.ts
    - src/features/config-vaga/__tests__/publishGate.test.ts

key-decisions:
  - "D-04 .strict() RED via node:fs source-text probe (not live safeParse) — the EF schema imports zod from https://esm.sh/zod@3 which Vitest/Node cannot resolve; the source-probe idiom (already used for the rate_limited probe in duplicateCheckService.test.ts) is RED while .strict() is absent and GREEN the moment Plan 02 adds it"
  - "dadosPessoaisSchema is the canonical Dados Pessoais export (no separate candidatoSchema symbol; aggregate is candidatoFormSchema) — the D-02 omit-cpf/genero test targets it"
  - "Answer-key = texto-join: runbook locks @> to_jsonb(m.opcao_texto), NOT opcao_id, with a [VERIFY LIVE — A4] re-confirm gate before Plan 04 writes the RPC"

patterns-established:
  - "Wave 0 RED scaffold gate for Phase 8 (Phase 4.1 / Phase 5 / Phase 7 precedent): every Phase 8 behavior is detectable BEFORE implementation"
  - "Source-text probe for Deno EF schemas (esm.sh unresolvable in Vitest) flips GREEN on the production edit, not on environment change"

requirements-completed: [INSCR-01, INSCR-02, INSCR-03, INSCR-04, LGPD-01]

duration: 5min
completed: 2026-06-08
---

# Phase 8 Plan 01: Inscrição & Knock-out Etapa 1 — Wave 0 RED Scaffolds Summary

**20 RED test assertions + a disposable-fixture SQL smoke runbook + a Playwright neutral-message guard that make every Phase 8 behavior (D-04 `.strict()` allowlist, D-03 email-only dedup, D-02 LGPD-clean schema, D-14 default knockouts, D-09 qualification gate, D-15 neutral rejection) detectable BEFORE implementation — calibrated to fail now and flip GREEN as Plans 02–05 land.**

## Performance

- **Duration:** 5 min (autonomous)
- **Started:** 2026-06-08T01:01:06Z
- **Completed:** 2026-06-08T01:06:51Z
- **Tasks:** 2
- **Files modified:** 7 (4 created + 3 extended)

## Accomplishments

- **Task 1 — 3 RED unit scaffolds (9 new RED assertions):**
  - `strict-schema.test.ts` (NEW): D-04 forbidden-key allowlist (cpf/foto/estado_civil/saude → reject) via `node:fs` source-text probe — RED until Plan 02 adds `.strict()` to both EF schemas; positive INSCR-01-valid allowlist case GREEN.
  - `duplicateCheckService.test.ts` (extended): "D-03 email-only dedup" describe — `checkEmailDuplicate` `p_cpf=''` contract locked GREEN; `useDuplicateCheck` no-`checkCPFDuplicate` source probe RED until Plan 02.
  - `candidatoSchema.test.ts` (NEW): `dadosPessoaisSchema` parses a payload omitting `cpf` + `genero` — RED today (both required), GREEN when Plan 02 makes them non-collected.
- **Task 2 — 2 RED template/publish scaffolds (11 new RED assertions) + runbook + E2E:**
  - `cargoTemplates.test.ts` (extended): INSCR-03/D-14 — every cargo seeds the presencial-SP knockout (`Não`→`knockout`); ONLY `dentista` adds the harmonização-orofacial knockout. 8 KO1 + 1 KO2 RED until Plan 03 seeds `qualificacao`.
  - `publishGate.test.ts` (extended): INSCR-02/D-09 — gate rejects >10 perguntas OR >1 open-ended (`resposta_texto`) in the qualification block. Q1+Q2 RED until Plan 03; Q3 compliant case GREEN.
  - `08-SQL-SMOKE-RUNBOOK.md` (NEW, 254 lines): disposable-fixture SMOKE-1 (knockout-fires) / SMOKE-2 (survivor-passes) / SMOKE-3 (single-history-row) / SMOKE-4 (seeded-defaults), the `@> to_jsonb(m.opcao_texto)` texto-join predicate, and the `[VERIFY LIVE — A4]` re-confirm note.
  - `e2e/inscricao-knockout.spec.ts` (NEW): deterministic neutral-D-15-message no-criterion-leak guard (runs unconditionally) + 2 `test.fixme` live steps for the inline result + `/perfil` `feedback_rejeicao` display.
- **Full suite:** 20 RED (all new Phase 8 assertions) + 398 GREEN; pre-existing suite otherwise unchanged. tsc baseline 301 = 301 (zero growth). Playwright spec lists clean across chromium/mobile-chrome/tablet.

## Task Commits

1. **Task 1: RED unit scaffolds — .strict() allowlist + cadastro dedup/schema** — `1ea5bc3` (test)
2. **Task 2: RED template/publish scaffolds + SQL smoke runbook + E2E stub** — `7dcffca` (test)

**Plan metadata:** (this docs commit)

## Files Created/Modified

- `supabase/functions/_shared/__tests__/strict-schema.test.ts` (NEW) — D-04 forbidden-key allowlist RED via source-text probe
- `src/features/cadastro/schemas/__tests__/candidatoSchema.test.ts` (NEW) — D-02 omit-cpf/genero RED
- `.planning/phases/08-inscri-o-knock-out-etapa-1/08-SQL-SMOKE-RUNBOOK.md` (NEW) — SMOKE-1..4 disposable-fixture knockout sweep
- `e2e/inscricao-knockout.spec.ts` (NEW) — neutral D-15 message + no-criterion-leak Playwright guard
- `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` (extended) — D-03 email-only dedup describe
- `src/features/config-vaga/templates/__tests__/cargoTemplates.test.ts` (extended) — INSCR-03/D-14 default knockouts describe
- `src/features/config-vaga/__tests__/publishGate.test.ts` (extended) — INSCR-02/D-09 qualification gate describe

## Decisions Made

- **D-04 `.strict()` RED via `node:fs` source-text probe (Rule 3 deviation, see below)** rather than a live `schema.safeParse(...)`: the Deno EF schema imports zod from `https://esm.sh/zod@3`, which Vitest/Node cannot resolve and which has no import-map alias. A live import would fail at module-resolution time (a module-not-found error that would NOT flip on the `.strict()` edit). The source-probe idiom — already established in this repo for the `rate_limited: boolean` structural probe — is RED while the source lacks `.strict()` on `cadastroCandidatoSchema`/`submitCandidaturaSchema` and GREEN the instant Plan 02 adds it.
- **`dadosPessoaisSchema` is the canonical Dados Pessoais export** (there is no separate `candidatoSchema` symbol; the aggregate export is `candidatoFormSchema`). The D-02 omit-cpf/genero test targets `dadosPessoaisSchema`; the file is named `candidatoSchema.test.ts` per the Plan 08-01 Task 1 spec.
- **Answer-key = texto-join:** the runbook locks the `@> to_jsonb(m.opcao_texto)` predicate (NOT `opcao_id`), matching the Phase 7 join-by-text fallback, and carries the `[VERIFY LIVE — A4]` gate to re-confirm `resposta_opcoes` shape via Supabase MCP `execute_sql` before Plan 04 writes the RPC.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] D-04 `.strict()` test authored as a `node:fs` source-text probe instead of a live `safeParse`**
- **Found during:** Task 1 (strict-schema.test.ts)
- **Issue:** The plan's literal instruction was to import `cadastroCandidatoSchema`/`submitCandidaturaSchema` from `../schemas.ts` and call `.safeParse(...)`. That file imports zod from `https://esm.sh/zod@3` (Deno URL specifier). Vitest runs under Node with no resolver for the esm.sh URL and no `vite.config.ts` alias for it — a direct import fails at module-resolution time, producing a module-not-found error that would NOT flip to GREEN when Plan 02 adds `.strict()` (the import would still be unresolvable).
- **Fix:** Authored the RED assertion as a `node:fs` source-text probe over `schemas.ts` (the exact idiom already used in `duplicateCheckService.test.ts` for the `rate_limited: boolean` structural probe), scoped to each schema's declaration block, asserting `.strict()` presence. The forbidden-key payloads (cpf/foto/estado_civil/saude) and the INSCR-01-valid allowlist are documented as fixtures so the Plan 02 implementer's intent is unambiguous. The probe is RED while `.strict()` is absent and GREEN the moment it lands in source.
- **Files modified:** `supabase/functions/_shared/__tests__/strict-schema.test.ts`
- **Verification:** `grep -c "\.strict()" supabase/functions/_shared/schemas.ts` = 0 (no prod schema edited); 6 `.strict()`-probe assertions RED, positive allowlist case GREEN.
- **Committed in:** `1ea5bc3` (Task 1 commit)

**2. [Rule 3 - Blocking] Augmented-shape casts to read not-yet-modeled fields (`qualificacao`)**
- **Found during:** Task 2 (cargoTemplates.test.ts + publishGate.test.ts)
- **Issue:** `CargoTemplate` has no `qualificacao` field and `PublishGateInput` has no qualification block; reading them directly would be a tsc-strict compile error, blocking the test file from compiling at all.
- **Fix:** Read the planned field via a structural cast (`cargoTemplates[slug] as unknown as { qualificacao?: … }`; `validInput() as PublishGateInput & { qualificacao?: … }`) so the file stays tsc-clean (301 = 301) while the assertion still fails at runtime (field reads `undefined` → RED). This is the Phase-7 Wave-0 RED idiom: compiles green, fails at runtime.
- **Files modified:** `src/features/config-vaga/templates/__tests__/cargoTemplates.test.ts`, `src/features/config-vaga/__tests__/publishGate.test.ts`
- **Verification:** `npx tsc --noEmit` = 301 errors (baseline, zero growth); KO1×8 + KO2 + Q1 + Q2 RED, Q3 compliant case GREEN.
- **Committed in:** `7dcffca` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 3 — blocking test-authoring adaptations)
**Impact on plan:** Both adaptations preserve the plan's RED→GREEN intent exactly (RED now, GREEN on the Plan 02/03 production edit) while keeping the test files compilable. No production source modified; no scope change.

## Issues Encountered

None — the only friction was the esm.sh-import and not-yet-modeled-field constraints, both resolved via established repo idioms (documented as Rule 3 deviations above).

## User Setup Required

None — no external service configuration. The SQL smoke runbook and the `test.fixme` E2E live steps are consumed later (Plan 08-04 RPC apply + `/gsd:verify-work` live sign-off) by the operator against the live project; this plan authors them only.

## Next Phase Readiness

- `wave_0_complete: true` can be set in `08-VALIDATION.md` — every Phase 8 behavior now has a calibrated RED assertion.
- **Plan 08-02** flips: add `.strict()` to both EF schemas (6 probe assertions GREEN), drop `cpf` collection from `useDuplicateCheck` (1 source probe GREEN), make `cpf`/`genero` non-collected in `dadosPessoaisSchema` (2 assertions GREEN).
- **Plan 08-03** flips: seed `qualificacao` in `cargoTemplates` (8 KO1 + 1 KO2 GREEN), extend `publishGate` with the >10-perguntas / >1-open-ended check (Q1 + Q2 GREEN).
- **Plan 08-04** (W3, [BLOCKING] non-autonomous): the knockout sweep RPC — must run the `[VERIFY LIVE — A4]` `resposta_opcoes` probe before locking `@> to_jsonb(opcao_texto)`, then execute SMOKE-1..4 against live PROD.
- **Plan 08-05** flips the 2 `test.fixme` E2E live steps (inline neutral message + `/perfil` `feedback_rejeicao`).

---
*Phase: 08-inscri-o-knock-out-etapa-1*
*Completed: 2026-06-08*

## Self-Check: PASSED

- All 5 created/key files verified on disk (strict-schema.test.ts, candidatoSchema.test.ts, 08-SQL-SMOKE-RUNBOOK.md, inscricao-knockout.spec.ts, 08-01-SUMMARY.md).
- Both task commits verified in git log: `1ea5bc3` (Task 1), `7dcffca` (Task 2).
- Full vitest: 20 RED (all new Phase 8 assertions) + 398 GREEN; tsc baseline 301 = 301; Playwright spec lists clean.
