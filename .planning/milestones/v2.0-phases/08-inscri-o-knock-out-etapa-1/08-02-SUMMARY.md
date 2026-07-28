---
phase: 08-inscri-o-knock-out-etapa-1
plan: 02
subsystem: cadastro
tags: [lgpd, pii-minimization, zod-strict, dedup, edge-function]
requires:
  - "08-01 Wave 0 RED scaffolds (strict-schema.test.ts + candidatoSchema.test.ts + duplicateCheckService.test.ts D-03 describe)"
provides:
  - "LGPD-clean /cadastro Etapa 1: CPF + gênero no longer collected (UI + client schema + EF insert + auth.users user_metadata)"
  - "Fail-closed .strict() allowlist on cadastroCandidatoSchema + submitCandidaturaSchema (D-04)"
  - "Email-only candidate dedup (D-03)"
affects:
  - "Future M2 phases that read candidatos.cpf/genero must treat them as nullable/empty for new registrations"
tech-stack:
  added: []
  patterns:
    - "Zod .strict() as a fail-closed PII allowlist gate at the Edge Function trust boundary"
    - "Reversible PII removal: drop from collection/UI/insert, keep DB column nullable (D-02)"
    - "Source-text grep probe (node:fs) as RED→GREEN contract for Deno-imported schemas + hook call-site removal"
key-files:
  created: []
  modified:
    - supabase/functions/_shared/schemas.ts
    - supabase/functions/cadastrar-candidato/index.ts
    - src/features/cadastro/schemas/candidatoSchema.ts
    - src/features/cadastro/components/steps/DadosPessoaisStep.tsx
    - src/features/cadastro/components/CadastroMultiStepForm.tsx
    - src/features/cadastro/services/cadastroService.ts
    - src/features/cadastro/services/duplicateCheckService.ts
    - src/features/cadastro/hooks/useDuplicateCheck.ts
decisions:
  - "D-04 implemented: .strict() on BOTH EF schemas — unknown keys (cpf/foto/estado_civil/saude) fail-closed → VALIDATION/400 before any insert"
  - "D-02 implemented reversibly: candidatos.cpf/genero columns kept nullable, never written; not dropped"
  - "D-03 implemented: dedup is email-only; useDuplicateCheck CPF branch removed; checkCPFDuplicate retained-but-uninvoked for reversibility"
  - "T-02-11 extension: cpf/genero removed from FIELD_TO_STEP_INDEX/PATH whitelists so a stray server field:'cpf' falls through to generic toast"
  - "CPF_EXISTS code kept in CadastroError union for back-compat but routed to generic toast (no dadosPessoais.cpf field exists to attach inline error)"
metrics:
  duration: ~9 min
  completed: 2026-06-08
---

# Phase 8 Plan 02: Inscrição & Knock-out — LGPD-clean cadastro Etapa 1 Summary

PII minimization for /cadastro: dropped CPF and gênero from collection (UI + client schema + EF insert + auth.users user_metadata), switched candidate dedup to EMAIL only, and added Zod `.strict()` so the Edge Function rejects any forbidden key fail-closed — DB columns kept nullable for reversibility.

## What Was Built

### Task 1 — `.strict()` allowlist + drop cpf/genero from schemas (commit `145aea5`)
- `supabase/functions/_shared/schemas.ts`: removed `cpf` + `genero` from `cadastroCandidatoSchema`'s object shape; appended `.strict()` to BOTH `cadastroCandidatoSchema` and `submitCandidaturaSchema`. `validateCPF` helper retained (still exported, harmless).
- `src/features/cadastro/schemas/candidatoSchema.ts`: removed `cpf: cpfSchema` and the required `genero: z.enum([...])` from `dadosPessoaisSchema`; deleted the now-unused `cpfSchema` const and its `validateCPF` import. The collected Dados Pessoais set now equals exactly the INSCR-01 allowlist.
- Plan 01 RED tests flipped GREEN: `strict-schema.test.ts` (7) + `candidatoSchema.test.ts` (2) → 9/9.

### Task 2 — email-only dedup + drop cpf/genero from UI/payload/EF (commit `5deecb9`)
- `useDuplicateCheck.ts`: removed the CPF branch + import → email-only. All literal `checkCPFDuplicate` tokens removed from the file (the D-03 probe is a source-text grep, so even comments had to be reworded).
- `DadosPessoaisStep.tsx`: removed the CPF `useDuplicateCheck` invocation, the cpf watch, the CPF input JSX block, and the gênero `<Controller>` field. Email-only `useDuplicateCheck(email, {field:'email'})` kept.
- `CadastroMultiStepForm.tsx`: dropped `cpf`/`genero` from `defaultValues`; `CPF_EXISTS` case now routes to a generic toast (no inline cpf field exists).
- `cadastroService.ts`: stopped sending `cpf`/`genero` to the EF body; removed `cpf`/`genero` from `FIELD_TO_STEP_INDEX` + `FIELD_TO_STEP_PATH` whitelists.
- `cadastrar-candidato/index.ts`: stopped inserting `cpf` into `candidatos` and into `auth.users` user_metadata; dropped `genero` from the insert; removed the now-unreachable CPF UNIQUE→CPF_EXISTS branch; dropped `cleanedCpf`/`formattedCpf`.
- `duplicateCheckService.ts`: JSDoc note that `checkCPFDuplicate` is retained for reversibility but no longer invoked by the LGPD-clean cadastro flow.
- Plan 01 D-03 RED test flipped GREEN; full cadastro suite 183/183.

## Verification Results

- `npm run test:run -- supabase/functions/_shared/__tests__ src/features/cadastro`: **190/190 passed** (11 files).
- `npm run build`: exit 0 (~16s).
- `npm run lint` (tsc baseline): **301 = 301** (zero growth).
- Acceptance grep: `.strict()` count = 2; `field: 'cpf'` = 0 and `id="cpf"` = 0 in DadosPessoaisStep; cpf/genero in EF appear only in explanatory comments (no insert/payload/user_metadata write).

## Deviations from Plan

None — plan executed exactly as written.

Notes on judgment calls within scope (not deviations):
- The D-03 source-text probe (`expect(hookSrc).not.toMatch(/checkCPFDuplicate/)`) matches ANY occurrence including comments. The first GREEN attempt left the literal token in JSDoc/inline comments; reworded them to "CPF duplicate-check path" / "its service import" to satisfy the literal grep while preserving documentation intent. This is the Plan-01 RED contract working as designed.
- Kept `CPF_EXISTS` in the `CadastroError` code union (back-compat) but routed it to a generic toast since the inline `dadosPessoais.cpf` field no longer exists.

## Threat Surface

All three mitigations from the plan's `<threat_model>` are implemented:
- **T-08-01** (forbidden PII smuggling) → `.strict()` on `cadastroCandidatoSchema` (Task 1).
- **T-08-02** (cpf persisted against minimization) → removed from EF insert + user_metadata (Task 2); column nullable, not written.
- **T-08-03** (CPF-probe enumeration) → dedup email-only; CPF probe path no longer invoked.

No new security-relevant surface introduced beyond the plan's threat register.

## Known Stubs

None. CPF/gênero removal is intentional and complete; DB columns retained nullable per D-02 (documented, not a stub).

## Manual Verification Deferred

Live EF confirmation that a cadastro body with an extra `cpf` key returns 400 VALIDATION is covered by the strict-schema unit test; live-EF deploy confirmation is deferred to the phase UAT (no EF redeploy performed in this plan).

## Self-Check: PASSED

All 8 modified files + SUMMARY.md present on disk; all 3 commits (`145aea5`, `5deecb9`, `256b20e`) present in git log.
