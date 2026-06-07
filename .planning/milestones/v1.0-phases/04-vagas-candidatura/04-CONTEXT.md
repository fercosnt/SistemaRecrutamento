# Phase 4: Vagas + Candidatura — Context

**Gathered:** 2026-04-25
**Status:** Ready for research/planning
**Requirements addressed:** VAGA-01, VAGA-02, VAGA-03, CAND-01, CAND-02, CAND-03, CAND-04
**Depends on:** Phase 1 (foundation) + Phase 3 (auth/login)

<domain>
## Phase Boundary

A logged-in candidato browses active jobs (`vagas.status = 'ativa'`), opens job detail at `/vagas/:slug`, uploads a PDF CV (<5MB), answers vaga-specific screening questions (`perguntas_formulario`), and submits an application that lands as a `candidaturas` row with `status='aguardando_resposta'` + `etapa_atual='triagem'` plus `respostas_formulario` rows. Duplicate applications (same candidato + same vaga) are blocked. Unauthenticated visitors clicking "Candidatar-se" go to `/auth/login?redirect=/vagas/:slug`.

**OUT of scope:** RH-side vaga CRUD, kanban triage, CV download UX (Phase 6); profile-side candidaturas list (Phase 5); E2E hardening + Lighthouse + a11y polish (Phase 5); psychometric tests (Phase 9); n8n integrations beyond what `candidaturasService` already wires (Phase 10).

</domain>

<decisions>
## Implementation Decisions

### A. Routing — `/vagas/:slug` migration

- **D-01:** Migrate primary route to `/vagas/:slug` with **regex-based fallback for `:id`**. `useParams<{ identifier: string }>` + `isUuid(identifier)` selects which `useVaga` overload to call. Back-compat for any UUID URL leaked during dev.
- **D-02:** `slug` column on `vagas` is populated by a **DB trigger** on INSERT/UPDATE: `slugify(titulo)` + dedup numeric suffix (`-2`, `-3`) when collision. Single source of truth in DB; RH UI in Phase 6 doesn't need to think about slugs.
- **D-03:** When slug does not resolve, render a **dedicated 404 state** (`VagaNotFoundState` inline component in `VagaDetalhePage.tsx`) with copy "Vaga não encontrada ou não está mais ativa" + CTA "Voltar para vagas" → `/vagas`. Returns proper 404 status (no SPA redirect).

### B. FormularioCandidaturaPage rewrite

- **D-04:** **Full rewrite** of `src/components/pages/FormularioCandidaturaPage.tsx` (currently 620 LoC raw `useState` + raw `supabase.from(...)` calls). New version uses RHF + Zod + `candidaturasService.createCandidatura` + dedicated `cvUploadService` + `useVagaPerguntas` hook. Phase 2/3 conventions (`useFormToast`, error_code routing, Pitfall 7 redaction) applied uniformly.
- **D-05:** **Single page with vertical sections** (max-w-3xl glass card): (1) Resumo da vaga read-only, (2) Currículo upload, (3) Perguntas de triagem dinâmicas, (4) Submit. No multi-step stepper, no Sheet/drawer modal.
- **D-06:** **No draft persistence.** Form submit takes ~60s; user already authenticated. CV blob in sessionStorage would be expensive. Submit-or-discard.

### C. CV upload + Storage RLS

- **D-07:** Bucket `curriculos` is **private** with RLS. Read policy: candidato reads own (`split_part(name, '/', 1) = auth.uid()::text`) OR role IN ('rh','admin'). Write policy: candidato uploads own only.
- **D-08:** Download exposed via **signed URL on-demand, expiry 1h**. Helper `cvUploadService.getSignedUrl(path)` called when RH (Phase 6) clicks "Ver CV". TanStack Query cache the URL with `staleTime: 55 minutes`.
- **D-09:** Upload UX — **click-only file picker** (`<input type="file" accept="application/pdf">`, no drag-drop, no PDF thumbnail). Client-side validation BEFORE upload: size ≤ 5MB + MIME type `application/pdf`. Preview after select: filename + size + remove button.
- **D-10:** Storage path schema `{candidato_id}/{uuid}.pdf` — **1 CV per candidato, global**. Re-apply replaces previous CV. ⚠ Trade-off: RH loses "version applied at submission time" if candidato re-uploads — accepted for MVP simplicity.

### D. Perguntas de triagem (CAND-02)

- **D-11:** New hook `useVagaPerguntas(vagaId)` at `src/features/vagas/hooks/useVagaPerguntas.ts`. Query key `vagasKeys.perguntas(vagaId)`. Returns `PerguntaFormulario[]` ordered by `ordem` ASC. Cache independent from `useVaga`.
- **D-12:** Submit atomicity via **new Edge Function `submit-candidatura`** (mirror of Phase 2 `cadastrar-candidato` pattern). Receives `{ vaga_id, candidato_id, curriculo_url, respostas[] }`. Inside one DB transaction: INSERT candidatura → INSERTs respostas_formulario → triggers existing N8N webhook. All-or-nothing.
- **D-13:** Render perguntas grouped by `bloco` field — `<h3>{bloco}</h3>` section header before first input of each group. Helps cognition when vaga has 15+ perguntas.
- **D-14:** Vaga without configured perguntas (`perguntas_formulario` empty for that vaga_id) — submit form shows only sections (1) + (2). Submit proceeds with empty `respostas[]`. No warning, no block. (RH responsibility to configure if they want triagem questions.)
- **D-15:** Input type matrix follows `tipo_resposta_pergunta` enum (`texto_curto | texto_longo | single_choice | multiple_choice | numerico`). Validation per-pergunta: `obrigatoria`, `limite_caracteres`, `valor_minimo / valor_maximo`. Schema generated dynamically from fetched perguntas using a Zod `z.object({ [pergunta.id]: zodForType(pergunta) })` factory. `permite_outros: true` adds a conditional text input below the choice list when "Outros" selected.

### E-H. Locked-by-default (no adjustments requested)

- **D-16:** PKCE→OTP migration (Phase 3 carryover) **deferred to Phase 5**. Phase 4 does NOT touch recovery flow. Existing same-browser flow works; cross-browser limitation documented + 3 mitigations identified in `03-07-SUMMARY.md`.
- **D-17:** `vagasService.enriquecerVaga()` N+1 (3 queries per vaga) **accepted for Phase 4 MVP**. Optimization (RPC or denormalization on `vagas` row) deferred to Phase 5 hardening if Lighthouse mobile flags it.
- **D-18:** **Delete** `src/components/pages/VagasPage.tsx` (153 LoC orphan with hardcoded mocks). `VagasPublicasPage` is the real implementation. Mechanical cleanup.
- **D-19:** Bug 6 / D-15 RPC `check_candidato_duplicate` — **already mitigated server-side** (RPC strips non-digits via `regexp_replace(p_cpf, '\D', '', 'g')`). Phase 4's `FormularioCandidaturaPage` rewrite (D-04) automatically adopts the service layer that uses the RPC. No additional migration needed.

### Claude's Discretion

- Validation timing (onBlur vs onSubmit) — follow Phase 3 pattern of onBlur with submit-disabled-while-invalid.
- `texto_ajuda` rendering — show as helper text below input (shadcn FormDescription), no tooltip.
- Empty state copy + 404 copy — match Phase 3 pt-BR tone.
- Error toast variants for upload failures (file too large, MIME invalid, network) — follow `useFormToast` taxonomy from Phase 2.
- Loading states (skeleton vs spinner vs Glass shimmer) — use existing project conventions.
- Order of section anchor links / sticky CTA on `/vagas/:slug` — planner decides based on UI-SPEC research.

</decisions>

<specifics>
## Specific Ideas

- Mobile-first per CLAUDE.md — `/vagas` listing must work cleanly on iPhone 12 viewport. Consider sticky "Candidatar-se" CTA on `/vagas/:slug` that anchors to bottom of viewport on mobile.
- Path schema `{candidato_id}/{uuid}.pdf` aligns with the principle "1 CV per candidato globally" — same CV reused across applications. RH gets current CV when reviewing any of that candidato's candidaturas.
- Per Phase 2 02-06 UAT learnings: prefer `resolve.dedupe` + module-level singleton hygiene; pre-existing infrastructure should already prevent regressions.
- Per Phase 3 03-04 D-09 anti-enumeration: any error surface for "vaga not found" must NOT echo whether the slug existed but was inactive vs never existed. (Less critical here than auth, but maintain instinct.)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & milestone
- `.planning/PROJECT.md` — Core value, current state (post-Phase 3), Key Decisions table
- `.planning/REQUIREMENTS.md` — VAGA-01..03 + CAND-01..04 requirement statements
- `.planning/ROADMAP.md` — Phase 4 goal + Success Criteria
- `.planning/STATE.md` — Carryover bugs (Bug 6/D-15 RPC CPF, PKCE OTP migration deferred)

### Prior phase artifacts (decisions to honor)
- `.planning/phases/02-cadastro-candidato/02-CONTEXT.md` — Edge Function pattern, error_code contract, structured `{ ok, error_code, message, field? }` shape
- `.planning/phases/02-cadastro-candidato/02-06-SUMMARY.md` — Sonner DOM regression assertion pattern + UAT-driven bug-finding playbook
- `.planning/phases/03-login-recuperacao-senha/03-CONTEXT.md` — Auth conventions (AuthError taxonomy, useFormToast routing, Pitfall 7 redaction)
- `.planning/phases/03-login-recuperacao-senha/03-07-SUMMARY.md` — UAT findings deferred to Phase 4 (PKCE OTP migration)
- `.planning/phases/03-login-recuperacao-senha/03-REVIEW.md` — Code-review advisory WR-01..WR-05 (none block; relevant if Phase 4 touches authStore or useRecoverySession)

### Carryover documents
- `.planning/phases/01-foundation-saneada/KNOWN-ISSUES-CARRYOVER-PHASE-3.md` — Bug 6/D-15 description (mostly mitigated; D-19 above closes the loop)

### Source patterns to mirror
- `src/features/cadastro/` — feature folder structure (services/hooks/schemas/types/components subfolders)
- `src/features/auth/services/authService.ts` — service shape with mapSupabaseError throws
- `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` — extend `PHASE_3_AUTH_PATHS` to include `src/features/vagas/**` once Phase 4 lands
- `supabase/functions/cadastrar-candidato/` — Edge Function reference for `submit-candidatura` (similar shape: validation, transaction, structured error contract, --no-verify-jwt deploy)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (PRODUCTION-READY — do not rewrite)

- `src/features/vagas/services/vagasService.ts` — `listVagas()` queries `status='ativa'` correctly (no `ativa` boolean bug). 429 LoC. Phase 4 only ADDS `getVagaBySlug(slug)` overload + `useVagaPerguntas` data layer.
- `src/features/vagas/services/candidaturasService.ts` — 1200 LoC, `createCandidatura` + N8N webhook + retry logic (10s timeout, 3 retries, exp backoff 1s/2s/4s, only retries on 5xx + network). Phase 4 ADDS `submitCandidaturaWithRespostas(...)` thin wrapper that calls the new Edge Function.
- `src/features/vagas/hooks/` — `useVagas`, `useVaga`, `useHasApplied`, `useCheckDuplicate`, `useCreateCandidatura`, `useUpdateCandidaturaStatus` — all real and tested.
- `src/features/vagas/types/vagasTypes.ts` — `Vaga`, `Candidatura`, `StatusCandidatura`, `EtapaProcesso`, `VagasFilters` — complete.
- `src/components/pages/VagaDetalhePage.tsx` — 431 LoC real implementation; Phase 4 PATCHES `useParams` for slug + adds 404 state, does NOT rewrite.

### Files to REWRITE
- `src/components/pages/FormularioCandidaturaPage.tsx` — Full rewrite (D-04).

### Files to DELETE
- `src/components/pages/VagasPage.tsx` — Orphan with hardcoded mocks (D-18).

### Files to CREATE
- `src/features/vagas/hooks/useVagaPerguntas.ts` (D-11).
- `src/features/vagas/services/cvUploadService.ts` — wraps Supabase Storage upload + signed URL helpers (D-08, D-09).
- `src/features/vagas/schemas/candidaturaFormSchema.ts` — RHF + Zod schema; dynamic respostas via factory (D-15).
- `supabase/functions/submit-candidatura/index.ts` — Edge Function for atomic submit (D-12).
- DB migration `2026XXXXXXXXXX_vagas_slug_trigger.sql` — adds slug generation trigger + backfill for existing rows (D-02).
- DB migration `2026XXXXXXXXXX_curriculos_bucket.sql` (or storage policy file) — creates bucket + RLS read/write policies (D-07).
- `src/components/pages/__tests__/` and `e2e/` — see test plan in research phase.

### Routes to UPDATE
- `src/router/routes.tsx:79-83` — `/vagas` (rename component to `VagasPublicasPage` if not already; remove `VagasPage` import) + `/vagas/:id` → `/vagas/:slug` with regex param matcher accepting both UUIDs and slugs.

</code_context>

<scope_guardrails>
## Out-of-Scope — Defer to Roadmap Backlog

- ✗ RH side: vagas CRUD, kanban triage, candidato comparison views (Phase 6+).
- ✗ Profile side: `/candidato/perfil/candidaturas` listing real-data (Phase 5).
- ✗ E2E hardening to 100% pass + Lighthouse mobile >80 + WCAG AA tab order (Phase 5).
- ✗ PKCE→OTP recovery migration (D-16 — Phase 5 if user prioritizes; otherwise survives current limitation).
- ✗ enriquecerVaga N+1 optimization via RPC or denormalization (D-17 — Phase 5 hardening).
- ✗ Drag-drop CV upload + PDF thumbnail preview (D-09 — explicitly out for MVP).
- ✗ Per-vaga CV history (D-10 — only current global CV per candidato).
- ✗ Psychometric tests (Phase 9).
- ✗ Application analytics + n8n richer pipelines (Phase 10).

## Deferred Ideas Captured Mid-Discussion

(None this round — all ideas surfaced in scope or routed to existing future phases.)

</scope_guardrails>

<next_steps>
## Next Steps

1. **Run `/gsd-research-phase 4`** (or proceed straight to `/gsd-plan-phase 4` which auto-invokes research) to:
   - Investigate `slugify` + DB trigger patterns for VARCHAR slug column with collision dedup.
   - Verify Supabase Storage RLS policy syntax for path-prefix access (`split_part(name, '/', 1)`).
   - Confirm Edge Function transaction boundary semantics for `submit-candidatura` (rpc-driven txn vs sequential with rollback).
   - Catalog UI-SPEC needs: `/vagas` listing card density, sticky CTA mobile, 404 state copy.
   - Map dynamic Zod schema construction patterns (`z.discriminatedUnion` per `tipo_resposta`).
2. **Optional** `/gsd-ui-phase 4` to formalize visual contract for the 3 candidate-facing surfaces (`/vagas`, `/vagas/:slug`, `/candidato/candidatura/formulario/:vagaSlug`).
3. **Then** `/gsd-plan-phase 4` to break decisions + research into wave-sequenced PLAN.md files.

</next_steps>
