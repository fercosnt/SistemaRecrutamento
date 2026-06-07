---
phase: 04-vagas-candidatura
plan: 07
status: complete
nyquist_compliant: true
subsystem: page-rewrite/candidatura-form
tags: [phase-04, formulario-candidatura, react-hook-form, dynamic-zod, cv-upload, single-page, vaga-03-fix, anti-open-redirect]

# Dependency graph
requires:
  - plan: 04-02
    provides: useVagaBySlug, useHasApplied (Wave 1a)
  - plan: 04-03
    provides: cvUploadService (validateCV, uploadCV, removeCV, CVUploadServiceError, MAX_FILE_SIZE)
  - plan: 04-04
    provides: buildCandidaturaSchema, CandidaturaFormData, PerguntaFormulario, useVagaPerguntas
  - plan: 04-05
    provides: submitCandidaturaWithRespostas, CandidaturasServiceError (Edge Function wrapper)
  - plan: 04-06
    provides: ":vagaSlug route, login-redirect target builder (FLAGGED redirect consumption gap — closed here)"
provides:
  - "FormularioCandidaturaPage rewritten — single max-w-3xl glass card, 4 vertical sections (D-04 / D-05)"
  - "D-09 click-only PDF picker (no drag-drop, no auto-upload-on-select)"
  - "D-13 perguntas grouped by `bloco` with section header per group"
  - "D-14 vaga without perguntas renders only sections 1+2+4 (no warning, no error)"
  - "B1 permite_outros merge — respostas_outros free-text concat'd into resposta_opcoes as final {outros: text} element"
  - "8 error_code mappings wired (FILE_TOO_LARGE / INVALID_MIME / UPLOAD_FAILED / UNAUTHORIZED / STORAGE_QUOTA / DUPLICATE_APPLICATION / INVALID_INPUT / NETWORK_ERROR / DATABASE_ERROR)"
  - "Pitfall 7 page-level rule honored — ZERO console-method calls in the file"
  - "Pitfall 2 honored — `import { toast } from 'sonner'` (unversioned)"
  - "CV upload orphan-cleanup wired (`removeCV(path)` on EF submit failure)"
  - "VAGA-03 closed — LoginCandidatoPage now consumes ?redirect= with anti-open-redirect guard"
affects: [04-08]

# Tech tracking
tech-stack:
  patterns:
    - "Dynamic Zod schema rebuilt via useMemo([perguntas]) only when perguntas reference changes (RESEARCH §Dynamic Zod Factory L1407)"
    - "Resolver type-cast: `zodResolver(schema) as Resolver<CandidaturaFormData>` — required by @hookform/resolvers v5 input/output mismatch (PATTERNS L196-198)"
    - "FSM-lite CV upload state: cvFile (staged) → cvPath (uploaded) — re-submit after transient error doesn't double-upload"
    - "Hook-order discipline: ALL hooks (useEffect/useMemo/useForm) called unconditionally before any early return; useHasApplied gated via TanStack Query `enabled: !!vaga?.id`"
    - "Anti-open-redirect guard: pure resolveRedirect(raw, fallback) helper rejects anything not starting with `/` or starting with `//` (protocol-relative)"

key-files:
  modified:
    - "src/components/pages/FormularioCandidaturaPage.tsx — full rewrite: -584 LoC (legacy useState + raw supabase.from + hardcoded mock perguntas) / +677 LoC (RHF + dynamic Zod + cvUpload + EF submit + 4 sections + B1 merge); net +93 LoC, 713 final LoC"
    - "src/components/pages/LoginCandidatoPage.tsx — +30 LoC: resolveRedirect helper + useSearchParams import + post-login redirect consumption (VAGA-03 closure)"
  created:
    - "src/components/pages/__tests__/LoginCandidatoPage.test.tsx — 11 Vitest cases for resolveRedirect (happy path, anti-open-redirect, empty/null, custom fallback)"

key-decisions:
  - "PerguntaInput inlined in same file (vs PATTERNS L257 component-extraction option) per D-04 atomic single-file rewrite. Future extraction is trivial — the component takes only `pergunta` + `form` props with no internal state."
  - "useEffect for `form.setValue('curriculo', ...)` placed BEFORE early returns — hook-order discipline. Plan template had it AFTER the loading early-return, which would violate Rules of Hooks; corrected during implementation."
  - "useHasApplied receives only vagaId (not candidatoId+vagaId) — hook signature is `useHasApplied(vagaId)` with candidato.id read from authStore inside the hook itself. Plan template had wrong signature; corrected to match actual hook."
  - "DB field for question text is `texto_pergunta` (not `pergunta`) per database.types.ts; plan template used `p.pergunta` which would fail tsc. Corrected during implementation."
  - "respostas_outros free-text rendered inline below choice options (single + multiple choice) when permite_outros=true. Visible when option group is rendered, NOT gated on a specific option being selected — the merge logic in onSubmit handles the empty-string case."
  - "Orphan-cleanup uses fire-and-forget `void removeCV(path).catch(() => undefined)` — failure to clean up is non-blocking. cvUploadService logs the redacted shape internally; no observability lost."
  - "Anti-open-redirect: `//evil.com` rejected because browsers treat protocol-relative URLs as absolute (inheriting current scheme). `https://evil.com` rejected because it doesn't start with `/`. `javascript:alert(1)` rejected for the same reason. Helper exported for unit testing in isolation."

deviations:
  - "Page LoC: 713 (target was 250-500 per plan acceptance criteria). The plan TEMPLATE in 04-07-PLAN.md itself was ~535 lines; faithfully implementing all four sections + 5 question types + 8 error_code switch arms + B1 merge logic + redirect handlers + auth gate + already-applied gate produces ~700 LoC. The 250-500 target was an aspirational lower bound that conflicted with the mandated structural completeness. Quality preserved — every section is necessary, no dead code, no premature abstraction."
  - "Page-rewrite test coverage: deferred to Plan 04-08 E2E (Playwright) per existing project convention — the cadastro/auth/vagas pages do NOT have render-tested unit suites. Component behavior is exercised end-to-end in Plan 04-08 UAT. The redirect helper IS unit-tested (LoginCandidatoPage.test.tsx, 11 cases) because it's a pure function with a clear contract."

# Metrics
duration: ~12min wall-clock (autonomous, no checkpoints; 2 commits sequential)
completed: 2026-04-25
commits: [caa5639, e744309]
files_modified: 2
files_created: 1
files_deleted: 0
loc_changed: "+707 / -586"
---

# Phase 04 Plan 07: FormularioCandidaturaPage Full Rewrite + VAGA-03 Closure — Summary

**Rewrite completo de `src/components/pages/FormularioCandidaturaPage.tsx` (D-04): single max-w-3xl glass card com 4 seções verticais (Resumo / Currículo / Perguntas / Submit), RHF + dynamic Zod via `buildCandidaturaSchema` (Plan 04-04) com `useMemo`, CV upload click-only PDF (Plan 04-03 / D-09), submit atomic via Edge Function (Plan 04-05) com error_code routing para 8 códigos, Pitfall 2 (Sonner unversioned) + Pitfall 7 (zero console-method calls) compliant. B1 `respostas_outros` merge logic implementado: quando `permite_outros: true` e free-text non-empty, concat em `resposta_opcoes` como elemento final `{outros: text}`. Adicional: VAGA-03 closure — `LoginCandidatoPage` agora consome `?redirect=` query param com anti-open-redirect guard (helper `resolveRedirect`), 11 Vitest cases passando, fechando o gap flagado pelo Plan 04-06 SUMMARY (login não retornava usuário ao formulário após autenticação).**

## Performance

- **Duração:** ~12 min wall-clock (autonomous, sem checkpoints; 2 commits)
- **Iniciado:** 2026-04-25T19:21:34Z (worktree agent-adef80d5 spawn)
- **Concluído:** 2026-04-25T19:35:00Z
- **Tasks:** 1 (rewrite atomic per D-04) + 1 escopo adicional (VAGA-03 fix)
- **Commits:** 2 (`caa5639`, `e744309`)
- **Arquivos:** 2 modified + 1 created (test), 0 deleted
- **Net LoC:** +707 / -586 (page rewrite +93 LoC; VAGA-03 fix +30 LoC + 113 LoC novos testes)

## Accomplishments

### Commit 1 — `caa5639` — VAGA-03 LoginCandidatoPage redirect closure

**Plan 04-06's SUMMARY identified** that `VagaDetalhePage.handleCandidatar` builds `/auth/login?redirect=/candidato/candidatura/formulario/<slug>` URLs but `LoginCandidatoPage.onSubmit` blindly navigated to `/candidato/perfil` after `signIn` success — query param ignored. This broke VAGA-03 ("unauthenticated visitor clicking Candidatar-se is redirected to login and returned to the job after authenticating").

**Implementation:**

1. **Pure helper `resolveRedirect(raw, fallback = '/candidato/perfil')`** exported from the page module:
   - Returns `raw` when it starts with `/` AND does NOT start with `//`
   - Falls back otherwise (covers `null` / `undefined` / `''` / `https://evil.com` / `//evil.com` / `javascript:alert(1)` / relative paths without leading `/`)
   - Anti-open-redirect: `//evil.com` is rejected because browsers treat protocol-relative URLs as absolute (inheriting the current scheme).

2. **Page hookup:** `useSearchParams()` imported from react-router-dom; after `signIn` success the page calls `navigate(resolveRedirect(searchParams.get('redirect')), { replace: true })`.

3. **Tests** — 11 Vitest cases in `src/components/pages/__tests__/LoginCandidatoPage.test.tsx`:
   - 3 happy path (relative path / simple slug-route / path with query string)
   - 4 anti-open-redirect (http(s) / protocol-relative / javascript: / no-leading-slash)
   - 3 empty/missing input (null / undefined / '')
   - 1 custom fallback honored

   Mocks `@/lib/supabase/client` + `@/features/auth/services` to avoid the supabase client throwing on missing env vars at test-time module load.

### Commit 2 — `e744309` — FormularioCandidaturaPage full rewrite

**Discarded the entire 620 LoC legacy** (raw `useState` for 9+ fields, raw `supabase.from('candidaturas').insert` calls bypassing the EF, hardcoded mock perguntas array, no Zod, no error_code routing, no `vagaSlug` consumption). Rewrote from scratch per D-04.

**Section 1 — Resumo da vaga (read-only):**
- `<h1>` with `vaga.titulo`
- `<p>` with `vaga.descricao_curta` (when present)
- Tipo-contrato chip (when present)

**Section 2 — Currículo (D-09 click-only PDF picker):**
- `<input type="file" accept="application/pdf">` inside a styled `<label>` (no drag-drop, no `react-dropzone`)
- Pick → `validateCV(file)` (sync throw on FILE_TOO_LARGE / INVALID_MIME) → stage `setCvFile(file)` (NO upload yet — D-09 says no auto-upload-on-select)
- Selected state: `<FileText/>` icon + `cvFile.name` + `formatBytes(cvFile.size)` + `<X/>` remove button
- Remove handler: clears `cvFile`, `cvPath`, and resets the RHF `curriculo` field

**Section 3 — Perguntas de triagem (D-13 grouping, D-14 hidden when empty):**
- `groupByBloco(perguntas)` returns `Map<string, PerguntaFormulario[]>` with `bloco?.trim() || 'Geral'` fallback (DB field is `string` non-nullable but I defend against empty/whitespace)
- Outer `<section>` rendered only when `hasPerguntas` (D-14 — vaga without configured perguntas renders only sections 1+2+4)
- Per-bloco header (`<h3>`) + ordered `PerguntaInput` per pergunta
- `PerguntaInput` (inlined per D-04 atomic-rewrite) handles all 5 `tipo_resposta` branches: `texto_curto` / `texto_longo` / `numerico` / `single_choice` / `multiple_choice`
- `permite_outros` adds an inline `<input>` below the option group keyed under `respostas_outros.<perguntaId>`

**Section 4 — Submit:**
- `<button type="submit">` disabled when `!cvFile || cvUploading || form.formState.isSubmitting`
- Loader spinner + "Enviando..." while uploading or submitting
- Default state: `<Send/>` icon + "Enviar candidatura"

**Submit handler (`onSubmit`):**

1. **Upload CV (just-in-time)** — only if `cvPath === null`. Uses `user.id` (= `auth.uid()`) for the storage path prefix (W5/D-10 amendment, server-side validated by EF step 3b via `curriculo_url.startsWith(user.id)`).

2. **Build respostas array** — iterate `Object.entries(data.respostas)`:
   - `numerico` → `{ pergunta_id, resposta_numerica }`
   - `single_choice` / `multiple_choice` → normalize value to array, then **B1 merge**: when `p.permite_outros && respostas_outros[id].trim().length > 0`, push `{ outros: trimmedText }` as final element of `resposta_opcoes`
   - `texto_curto` / `texto_longo` → `{ pergunta_id, resposta_texto }`

3. **Atomic submit via Edge Function** — `submitCandidaturaWithRespostas({ candidato_id, vaga_id, curriculo_url, curriculo_nome, curriculo_size, respostas })`.

4. **Success** → `toast.success('Candidatura enviada com sucesso!')` + `navigate('/candidato/perfil', { replace: true })`.

**Error code routing (8 codes):**

| Source | Code                  | UX Action                                                                                          |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------- |
| CV     | `FILE_TOO_LARGE`      | toast.error com `Máximo: 5 MB`                                                                     |
| CV     | `INVALID_MIME`        | toast.error com `Apenas PDF`                                                                       |
| CV     | `UNAUTHORIZED`        | toast.error + navigate `/auth/login?redirect=<current>`                                            |
| CV     | `STORAGE_QUOTA`       | toast.error com `Limite de armazenamento atingido`                                                 |
| CV     | `UPLOAD_FAILED` / `NETWORK_ERROR` (default) | toast.error + Tentar novamente CTA                                                                |
| EF     | `DUPLICATE_APPLICATION` | toast.error + navigate `/vagas/<slug>` (server-side UNIQUE is the actual gate)                   |
| EF     | `INVALID_INPUT`       | toast.error com `err.message`                                                                      |
| EF     | `UNAUTHORIZED`        | toast.error + navigate `/auth/login?redirect=<current>`                                            |
| EF     | `NETWORK_ERROR`       | toast.error + Tentar novamente CTA                                                                 |
| EF     | `NOT_FOUND` / `WEBHOOK_ERROR` / `DATABASE_ERROR` (default) | toast.error generic + Tentar novamente CTA                                                         |
| —      | unknown               | toast.error `Erro inesperado`                                                                      |

**Orphan-cleanup:** when EF submit fails AFTER a successful upload, the page calls `void removeCV(uploadedPath).catch(() => undefined)` to delete the orphaned object from the curriculos bucket. Fire-and-forget — failure to clean up is non-blocking.

## Pitfall Compliance Evidence

### Pitfall 2 — Sonner imports unversioned

```bash
grep -c "from 'sonner'" src/components/pages/FormularioCandidaturaPage.tsx     # 2 (page + helper imports)
grep -c "from 'sonner@" src/components/pages/FormularioCandidaturaPage.tsx     # 0
```

### Pitfall 7 — Page-level "ZERO console-method calls" rule

```bash
grep -cE "console\." src/components/pages/FormularioCandidaturaPage.tsx        # 0
```

All observability lives in the service layer (`cvUploadService` logs `{ sizeKb, mime, hasFile }`; `candidaturasService` logs `{ vaga_id, candidato_id, respostas_count }` per Pitfall 7 redaction). The static `pitfall7.grep.test.ts` test passes (4/4 cases).

### Hook-order discipline

All hooks (`useParams`, `useNavigate`, 3× `useAuthStore`, `useVagaBySlug`, `useVagaPerguntas`, `useHasApplied`, 3× `useState`, `useMemo`, `useForm`, 3× `useEffect`) execute on every render BEFORE any early-return branch. `useHasApplied` and `useVagaPerguntas` are gated via TanStack Query's `enabled: !!vagaId` flag, NOT via conditional hook calls — Rules of Hooks honored.

## Gate Verification

| Gate                                                                              | Result        |
| --------------------------------------------------------------------------------- | ------------- |
| `grep -c "useVagaBySlug"` page                                                    | 2 (≥1 ✓)      |
| `grep -c "useVagaPerguntas"` page                                                 | 3 (≥1 ✓)      |
| `grep -c "useHasApplied"` page                                                    | 2 (≥1 ✓)      |
| `grep -c "buildCandidaturaSchema"` page                                           | 2 (≥1 ✓)      |
| `grep -c "uploadCV"` page                                                         | 4 (≥1 ✓)      |
| `grep -c "validateCV"` page                                                       | 3 (≥1 ✓)      |
| `grep -c "submitCandidaturaWithRespostas"` page                                   | 2 (≥1 ✓)      |
| `grep -c "DUPLICATE_APPLICATION"` page                                            | 2 (≥1 ✓)      |
| `grep -c "FILE_TOO_LARGE"` page                                                   | 3 (≥1 ✓)      |
| `grep -c "INVALID_MIME"` page                                                     | 3 (≥1 ✓)      |
| `grep -c 'type="file"'` page                                                      | 1 ✓           |
| `grep -c 'accept="application/pdf"'` page                                         | 1 ✓           |
| `grep -c "groupByBloco"` page                                                     | 2 (≥1 ✓)      |
| `grep -c "from 'sonner'"` page                                                    | 2 (≥1 ✓)      |
| `grep -c "from 'sonner@"` page                                                    | 0 ✓           |
| `grep -cE "console\."` page                                                       | 0 ✓           |
| `grep -c "useMemo"` page                                                          | 2 (≥1 ✓)      |
| `grep -c "respostas_outros"` page                                                 | 7 (≥1 ✓)      |
| `grep -c "permite_outros"` page                                                   | 6 (≥1 ✓)      |
| `grep -c "outros: outrosText"` page                                               | 1 ✓           |
| `grep -cE "single_choice\|multiple_choice"` page                                  | 6 (≥2 ✓)      |
| `grep -c "D-10"` page                                                             | 1 (≥1 ✓)      |
| `grep -c "auth.uid()"` page                                                       | 1 (≥1 ✓)      |
| LoC                                                                               | 713           |
| Page-specific tsc errors                                                          | 0             |
| Total tsc errors (vs 323 baseline)                                                | 320 (-3)      |
| `npm run build`                                                                   | exit 0 ✓      |
| `pitfall7.grep.test.ts`                                                           | 4/4 pass ✓    |
| `LoginCandidatoPage.test.tsx`                                                     | 11/11 pass ✓  |

## Deviations from Plan

### Auto-fixed during implementation (Rule 1 / Rule 3 — bug fixes)

1. **[Rule 3] Hook-order violation in plan template** — the plan example placed `useEffect(() => form.setValue('curriculo', ...), [cvFile, cvPath, form])` AFTER the loading early-return, which would throw "Rendered fewer hooks than expected" on first render (vagaLoading=true). Moved the hook above all early returns to honor Rules of Hooks.

2. **[Rule 3] `useHasApplied` signature mismatch** — plan template called `useHasApplied(candidato?.id ?? '', vaga?.id ?? '')`. Actual hook signature is `useHasApplied(vagaId)` (single arg; reads `candidato.id` from authStore internally). Corrected to `useHasApplied(vaga?.id ?? null)`.

3. **[Rule 3] DB field name mismatch** — plan template referenced `p.pergunta` for the question text label. Actual `database.types.ts` field is `texto_pergunta`. Corrected throughout PerguntaInput.

4. **[Rule 1] Comment containing literal `console.*`** — initial draft had a doc-comment literal `Pitfall 7: ZERO console.* calls` which the verify gate `grep -cE "console\."` would count as a match (the regex doesn't distinguish comment vs. code). Reworded to `console-method calls` to keep the count at 0.

### Acknowledged scope expansion (per orchestrator instruction)

- **VAGA-03 closure (additional scope)** — the orchestrator brief explicitly extended Plan 04-07's scope to fix the LoginCandidatoPage redirect gap flagged by Plan 04-06. Implemented as a separate atomic commit (`caa5639`) before the page rewrite, with 11 unit tests for the `resolveRedirect` helper. Documented here for traceability.

### Plan acceptance criteria deviation (LoC bound)

- **Page LoC: 713 (target 250-500)** — the plan's TEMPLATE in 04-07-PLAN.md itself spans ~535 lines; faithfully implementing all four sections + 5 question types + 8 error_code switch arms + B1 merge logic + 3 redirect handlers + auth gate + already-applied gate + inline PerguntaInput produces ~700 LoC. The 250-500 upper bound was an aspirational target that conflicted with the mandated structural completeness. Quality preserved — every section is necessary, no dead code, no premature abstraction. No follow-up needed.

## Threat Flags

None — no new security-relevant surface introduced. CV upload flow goes through Plan 04-03's `cvUploadService` (validated bucket); EF submit goes through Plan 04-05's `submitCandidaturaWithRespostas` (JWT-gated, server-side `submit_candidatura_atomic` RPC). All mitigations from the plan's `<threat_model>` (T-04-04 MIME spoofing, T-04-05 race-condition duplicate, T-04-07 PII logging) implemented as designed.

## Self-Check: PASSED

Verified existence of all artifacts referenced in the SUMMARY:

- `src/components/pages/FormularioCandidaturaPage.tsx` — FOUND (713 LoC, full rewrite)
- `src/components/pages/LoginCandidatoPage.tsx` — FOUND (with `resolveRedirect` helper + `useSearchParams` consumption)
- `src/components/pages/__tests__/LoginCandidatoPage.test.tsx` — FOUND (11 Vitest cases, all passing)
- Commit `caa5639` — FOUND in `git log`
- Commit `e744309` — FOUND in `git log`
- `npm run build` — exit 0
- `npm run lint` — 320 errors (3 below the 323 baseline; no new errors in scope)
- `npx vitest run pitfall7.grep` — 4/4 passing
- `npx vitest run LoginCandidatoPage.test.tsx` — 11/11 passing
