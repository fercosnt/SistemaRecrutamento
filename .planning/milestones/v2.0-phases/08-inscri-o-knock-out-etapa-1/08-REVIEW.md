---
phase: 08-inscri-o-knock-out-etapa-1
reviewed: 2026-06-07T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/FormularioCandidaturaPage.tsx
  - src/components/pages/MeuPerfilCandidatoPage.tsx
  - src/features/cadastro/components/CadastroMultiStepForm.tsx
  - src/features/cadastro/components/steps/DadosPessoaisStep.tsx
  - src/features/cadastro/hooks/useDuplicateCheck.ts
  - src/features/cadastro/schemas/candidatoSchema.ts
  - src/features/cadastro/services/cadastroService.ts
  - src/features/cadastro/services/duplicateCheckService.ts
  - src/features/config-vaga/publishGate.ts
  - src/features/config-vaga/schemas/qualificacaoSchema.ts
  - src/features/config-vaga/templates/cargoTemplates.ts
  - src/features/config-vaga/types/configVagaTypes.ts
  - src/features/vagas/services/candidaturasService.ts
  - supabase/functions/_shared/schemas.ts
  - supabase/functions/cadastrar-candidato/index.ts
  - supabase/functions/submit-candidatura/index.ts
  - supabase/migrations/20260608000001_inscricao_knockout.sql
findings:
  critical: 2
  warning: 7
  info: 4
  total: 13
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-06-07
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 8 delivers the LGPD-clean cadastro flow, per-cargo Etapa-1 qualification seeding, and the server-authoritative knockout sweep inside `submit_candidatura_atomic`. The three highest-risk areas called out for special attention hold up well:

- **Server-authoritative knockout / no self-approval:** the sweep re-reads stored answers against `pergunta_opcao_metadata` (tag='knockout') server-side; a crafted client payload cannot self-approve. ✅
- **No trait/score/age in the sweep:** the join predicate is structurally limited to `tag='knockout'` option text — no `data_nascimento`/`genero`/score is read (RNF-07a/LGPD). ✅
- **Neutral rejection / criterion never leaked:** `opcao_knockout_id` is audit-only and never returned by the EF; the UI renders only the locked D-15 copy. ✅
- **`.strict()` fail-closed allowlist:** both Edge Function schemas reject unknown keys before any insert. ✅
- **Single audit row:** the `IS NOT DISTINCT FROM` trigger guard correctly suppresses a double-write on the knockout branch. ✅

However, the candidate Dashboard — which is in-scope and received the new Phase-8 `feedback_rejeicao` rendering block — contains **wrong-field bugs that break the status filter, the status badge, and three stat counters** at runtime. There is also a verification-process gap: `npm run lint` (which CLAUDE.md defines as the gate) reports **305 tsc errors vs. the stated ~301 baseline**, and several of the new errors are in files this phase touched and encode the functional bugs below. Two BLOCKERs and several WARNINGs follow.

## Critical Issues

### CR-01: DashboardCandidatoPage reads/writes the wrong candidatura field — status filter, badge, and 3 counters are dead at runtime

**File:** `src/components/pages/DashboardCandidatoPage.tsx:18-23, 147, 155, 159, 249`
**Issue:** The candidatura row exposes `status` (DB column, confirmed in `database.types.ts:464` and used everywhere else, e.g. `useCandidaturasCount` filters on `c.status`). This page instead uses `status_candidatura`, which does not exist:

- L18/L21-23 build the filter as `{ status_candidatura: statusFilter }`, but `CandidaturasFilters` has key `status` (vagasTypes.ts:264) and `listCandidaturas` reads `filters?.status`. The status filter is **silently ignored** — selecting "Rejeitadas" still shows everything.
- L249 `getStatusInfo(candidatura.status_candidatura)` passes `undefined` → every card falls through to the `default` branch, so the **status badge label/icon is wrong for every candidatura** (always the gray fallback). This is especially visible for the new Phase-8 knockout flow: the D-16 `feedback_rejeicao` block (L288, which correctly reads `candidatura.status === 'rejeitado'`) renders, but the badge beside it does NOT say "Rejeitado".
- L147/L155/L159 read `counts.aplicadas`, `counts.em_teste`, `counts.em_entrevista`, none of which exist on the object returned by `useCandidaturasCount` (it returns `total/aguardando/em_analise/aprovadas/rejeitadas/finalizadas`). Those three stat cards render `undefined`.

All of these are confirmed compile errors under `tsc --noEmit` (TS2339/TS2322/TS2551 at the cited lines), so they are not cosmetic — they are live functional breakage shipped past the lint gate.
**Fix:**
```tsx
// L18-23 — use the real filter key
const [statusFilter, setStatusFilter] =
  useState<CandidaturasFilters['status'] | 'todas'>('todas');
const filters: CandidaturasFilters | undefined =
  statusFilter !== 'todas' ? { status: statusFilter } : undefined;

// L249 — read the real row field
const statusInfo = getStatusInfo(candidatura.status);

// L147/155/159 — either remove these cards or add the counts to
// useCandidaturasCount (aplicadas/em_teste/em_entrevista). At minimum,
// stop referencing properties that do not exist.
```

### CR-02: Lint gate (`tsc --noEmit`) regressed and is masking the CR-01 defects

**File:** `supabase`/`src` (project-wide) — surfaced by `src/components/pages/DashboardCandidatoPage.tsx`, `src/features/vagas/services/candidaturasService.ts`, `src/components/pages/MeuPerfilCandidatoPage.tsx`, `src/features/cadastro/components/CadastroMultiStepForm.tsx`
**Issue:** CLAUDE.md defines `npm run lint` as `tsc --noEmit` and the project tracks a flat tsc baseline (~301). Current run reports **305 errors**. The new/relevant ones are not pure baseline noise:

- `DashboardCandidatoPage.tsx(18/22/249)` — the CR-01 field bugs.
- `MeuPerfilCandidatoPage.tsx(709,47)` and `(768,32)` — `ETAPA_PROCESSO_LABELS[candidatura.etapa_atual]` is an implicit-any index (TS7053). Because Phase 6 added `inscricao`/`triagem`/etc. to `etapa_processo`, an etapa value missing from `ETAPA_PROCESSO_LABELS` falls back to the raw enum string (acceptable UX) but the unsafe index means a typo silently returns `undefined` with no compile guard. Worth confirming `ETAPA_PROCESSO_LABELS` actually covers `inscricao` (the new Phase-8 starting etapa) so the perfil page doesn't show the raw token.
- `candidaturasService.ts(615/616/934)` — the N8N status-update payload omits `telefone`/`localizacao` and assigns `string | null` to a `string` field; the webhook body is silently malformed.

A phase whose own gate is red cannot distinguish "known baseline" from "new regression," which is exactly how CR-01 reached this review. The phase should not ship until `tsc` is at-or-below the recorded baseline AND the reviewed-file errors above are cleared.
**Fix:** Run `npm run lint`, fix the reviewed-file errors (CR-01 + the index/payload issues), and re-establish the flat baseline before marking the phase done. Index `ETAPA_PROCESSO_LABELS` via a typed lookup (`ETAPA_PROCESSO_LABELS[etapa as EtapaProcesso] ?? etapa`) and ensure the map includes every v2 enum value.

## Warnings

### WR-01: Knockout sweep fails OPEN on any option-text drift (the core safety mechanism is exact-string-dependent)

**File:** `supabase/migrations/20260608000001_inscricao_knockout.sql:177-184`
**Issue:** The sweep matches `r.resposta_opcoes @> to_jsonb(m.opcao_texto)` — exact jsonb text containment between the answer string the form submitted and `pergunta_opcao_metadata.opcao_texto`. Any divergence (trailing whitespace, accent normalization, casing, a future UI that sends `opcao_id` or a label tweak) makes the knockout **silently never fire**, letting a candidate who should be eliminated pass to triagem. This is a fail-open posture on a discriminatory-criterion gate. The migration comment (Pitfall 1) acknowledges the id-vs-text trap but the exact-text dependency itself is undefended.
**Fix:** Normalize both sides at write and compare time (e.g. store and match on `btrim(lower(unaccent(...)))`, or add a generated normalized column), and add a SMOKE assertion that submitting the knockout option text actually flips status to `rejeitado`. Long-term, drive the match off a stable `opcao_id` written by the form rather than free text.

### WR-02: Survivor history row is stamped `auto_rejeitado=true` — misleading audit semantics

**File:** `supabase/migrations/20260608000001_inscricao_knockout.sql:208-227` (+ trigger `20260607000005_avancar_etapa_trigger.sql:82`)
**Issue:** The survivor branch relies on the `avancar_etapa()` trigger to write the single history row. Under service_role `auth.uid()` is NULL, so the trigger sets `auto_rejeitado = (v_ator IS NULL) = true` on a candidate who was NOT rejected (status stays `aguardando_resposta`, etapa advances to triagem). The column name `auto_rejeitado` now means "system write" for survivors but "auto-rejection" for knockouts — two different semantics in one boolean. Any RH report or analytics filtering `auto_rejeitado = true` to count auto-rejections will over-count by including every survivor inscrição.
**Fix:** Either pass an explicit actor/flag so survivor rows record `auto_rejeitado=false`, or rename/split the column (e.g. `sistema_automatico` vs. `auto_rejeitado`) so the rejection semantics are unambiguous. Document the chosen meaning next to any consumer query.

### WR-03: `data_disponibilidade` past-date refine compares a date-only string against a timestamp `new Date()`

**File:** `src/features/cadastro/schemas/candidatoSchema.ts:332-343`
**Issue:** `availableDate = new Date(date)` parses `'2026-06-07'` as UTC midnight, while `today = new Date()` is the current instant. For a user selecting *today*, `availableDate >= today` is false for the rest of the day (today-midnight < now), so "today" is rejected as past. Off-by-one timezone/`<` boundary bug.
**Fix:** Compare date-only:
```ts
const avail = new Date(date + 'T00:00:00')
const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)
return avail >= todayStart
```

### WR-04: `dataNascimentoSchema` accepts non-date strings as 16-year-old → server-side risk

**File:** `src/features/cadastro/schemas/candidatoSchema.ts:53-74`
**Issue:** `new Date(date)` on an unparseable string yields `Invalid Date`, whose `getFullYear()` is `NaN`; `today.getFullYear() - NaN = NaN`, and `NaN >= 16 && NaN <= 100` is `false` (so it rejects garbage — OK), but a string like `'0016-06-07'` or a far-future date can slip through the coarse year math. The EF schema (`schemas.ts:130`) only checks `min(1)` on `data_nascimento`, so the DB receives whatever string passes this loose client refine. Combined with the EF not re-validating age at all, malformed dates can reach `candidatos.data_nascimento`.
**Fix:** Validate the string is a real ISO date (`z.string().date()` in zod 3.23+, or a regex + `!isNaN(Date.parse(...))`) before the age math, and mirror a minimal date sanity check in the EF schema.

### WR-05: `useDuplicateCheck.check` reads `abortControllerRef.current.signal.aborted` after a newer call may have replaced the controller

**File:** `src/features/cadastro/hooks/useDuplicateCheck.ts:178-224`
**Issue:** `check` creates `abortControllerRef.current = new AbortController()` then, after the await, reads `abortControllerRef.current.signal.aborted` (L189/L202/L222). If a second `check` fires during the await, it overwrites `abortControllerRef.current` with a fresh, non-aborted controller; the first (stale) invocation then sees `aborted === false` and writes its now-stale result/loading into state — the race the abort guard was meant to prevent. Capturing the controller in a local would fix it.
**Fix:**
```ts
const controller = new AbortController()
abortControllerRef.current = controller
// ...await...
if (!controller.signal.aborted) { /* commit */ }
```

### WR-06: DadosPessoaisStep still references removed `existingCandidate.nome_completo` in the duplicate-email message

**File:** `src/features/cadastro/components/steps/DadosPessoaisStep.tsx:60-68`
**Issue:** `onDuplicate` builds `Email já cadastrado por ${result.existingCandidate?.nome_completo}` and toasts `result.existingCandidate?.nome_completo || 'outro candidato'`. Per `duplicateCheckService` (D-01a / FOUND-10) `existingCandidate` is `@deprecated`, always `null`/`undefined`. So the inline error renders `Email já cadastrado por undefined`. Functionally a UX defect, and it perpetuates a field that exists only to (almost) leak another candidate's name — better removed now that Phase 8 touched this step.
**Fix:** Drop `existingCandidate` usage: `setError(..., { message: 'Este email já está cadastrado.' })` and toast a generic "já cadastrado" message (the `|| 'outro candidato'` fallback hides the bug but still shows awkward copy).

### WR-07: `cadastrar-candidato` reports `EMAIL_EXISTS` via substring match on `candidatoError.message`

**File:** `supabase/functions/cadastrar-candidato/index.ts:230-233`
**Issue:** After the CPF branch removal, the only structured mapping left on the `candidatos` insert failure is `raw.includes('email')`. A unique violation on any other column whose constraint/message happens to contain "email" would be mislabeled `EMAIL_EXISTS`; conversely a real email unique violation whose driver message phrases differently (e.g. only the constraint name without the word "email") falls through to a generic `SERVER_ERROR`. The auth-layer `createUser` already catches the common duplicate-email case (L179), so this branch mainly guards the race where the auth user is new but the `candidatos.email` unique index collides — and that path is fragile.
**Fix:** Match on the Postgres error `code === '23505'` plus the constraint name (`candidatoError.details`/`.constraint`) rather than a substring of the human message.

## Info

### IN-01: `validateCPF` in the Edge Function schema is dead code

**File:** `supabase/functions/_shared/schemas.ts:35-57`
**Issue:** Phase 8 removed CPF from both EF schemas, so the exported `validateCPF` (and its inline doc rationale) is no longer referenced by any handler. Same story for the retained `checkCPFDuplicate`/`checkBothDuplicates`/`cleanCPF`/`isValidCPFFormat` in `duplicateCheckService.ts` and the `'CPF_EXISTS'` arm in several unions. Intentionally kept "for reversibility," but it is now unexercised surface that confuses readers and inflates the `CadastroErrorCode` union.
**Fix:** If reversibility is a hard requirement, gate behind a clearly-labeled `// DORMANT (D-02 reversibility)` block; otherwise remove and recover from git history when needed.

### IN-02: `console.log` of `userId`/`candidatoId` and noisy emoji logs left in production paths

**File:** `src/features/cadastro/services/cadastroService.ts:172-177, 277-280`; `src/features/vagas/services/candidaturasService.ts:839-851, 870-905`
**Issue:** Cadastro success logs `userId`+`candidatoId` (identifiers, lower sensitivity than PII but still correlatable) and the candidaturas service logs decorated `🚀`/`✅`/`❌` lines including full `updateData`. Pitfall 7 elsewhere is careful to redact; these slip through. Not a leak of passwords/PII, hence Info.
**Fix:** Drop the identifier/`updateData` logs or route through the structured redacting logger already present in the file.

### IN-03: `FormularioCandidaturaPage` reads `p.opcoes_resposta as string[]` but the option contract moved to `{id,texto}` in M2

**File:** `src/components/pages/FormularioCandidaturaPage.tsx:758, 793`
**Issue:** Memory/Phase-7 notes record D-13 migrating `opcoes_resposta` from `string[]` to `[{id,texto}]` (via `opcoesNormalize`). This page still casts `p.opcoes_resposta as string[]` and renders `opt` directly as the radio/checkbox value and label. If any vaga now stores the object shape, the option list renders `[object Object]` and the submitted `resposta_opcoes` value won't text-match the knockout metadata (compounding WR-01). Verify `useVagaPerguntas` normalizes before this page sees it.
**Fix:** Run options through the shared `@/lib/opcoes/opcoesNormalize` (or read `.texto`) instead of casting to `string[]`.

### IN-04: Magic body-size and option-count caps are duplicated literals across layers

**File:** `supabase/functions/submit-candidatura/index.ts:97`; `supabase/functions/_shared/schemas.ts:210, 227`
**Issue:** `64 * 1024`, `5_242_880`, and `.max(100)` are hardcoded in two files with prose comments cross-referencing each other. They are correct today but will drift (the client `SubmitCandidaturaWithRespostasInput` has no matching cap). Minor.
**Fix:** Hoist to named constants in `_shared` and import where used.

---

_Reviewed: 2026-06-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
