# Phase 4: Vagas + Candidatura — Research

**Researched:** 2026-04-25
**Domain:** ATS public job browsing + authenticated candidatura submit (CV upload + screening questions + atomic transaction)
**Confidence:** HIGH (most decisions verified against existing codebase + Supabase official docs via Context7)

---

<user_constraints>
## User Constraints (from 04-CONTEXT.md)

### Locked Decisions

**A. Routing — `/vagas/:slug` migration**
- **D-01:** Migrate primary route to `/vagas/:slug` with regex-based fallback for `:id`. `useParams<{ identifier: string }>` + `isUuid(identifier)` selects which `useVaga` overload to call. Back-compat for any UUID URL leaked during dev.
- **D-02:** `slug` column on `vagas` is populated by a DB trigger on INSERT/UPDATE: `slugify(titulo)` + dedup numeric suffix (`-2`, `-3`) when collision. Single source of truth in DB; RH UI in Phase 6 doesn't need to think about slugs.
- **D-03:** When slug does not resolve, render a dedicated 404 state (`VagaNotFoundState` inline component in `VagaDetalhePage.tsx`) with copy "Vaga não encontrada ou não está mais ativa" + CTA "Voltar para vagas" → `/vagas`. Returns proper 404 status (no SPA redirect).

**B. FormularioCandidaturaPage rewrite**
- **D-04:** Full rewrite of `src/components/pages/FormularioCandidaturaPage.tsx` (currently 620 LoC raw `useState` + raw `supabase.from(...)` calls). New version uses RHF + Zod + `candidaturasService.createCandidatura` + dedicated `cvUploadService` + `useVagaPerguntas` hook. Phase 2/3 conventions (`useFormToast`, error_code routing, Pitfall 7 redaction) applied uniformly.
- **D-05:** Single page with vertical sections (max-w-3xl glass card): (1) Resumo da vaga read-only, (2) Currículo upload, (3) Perguntas de triagem dinâmicas, (4) Submit. No multi-step stepper, no Sheet/drawer modal.
- **D-06:** No draft persistence. Form submit takes ~60s; user already authenticated. CV blob in sessionStorage would be expensive. Submit-or-discard.

**C. CV upload + Storage RLS**
- **D-07:** Bucket `curriculos` is private with RLS. Read policy: candidato reads own (`split_part(name, '/', 1) = auth.uid()::text`) OR role IN ('rh','admin'). Write policy: candidato uploads own only.
- **D-08:** Download exposed via signed URL on-demand, expiry 1h. Helper `cvUploadService.getSignedUrl(path)` called when RH (Phase 6) clicks "Ver CV". TanStack Query cache the URL with `staleTime: 55 minutes`.
- **D-09:** Upload UX — click-only file picker (`<input type="file" accept="application/pdf">`, no drag-drop, no PDF thumbnail). Client-side validation BEFORE upload: size ≤ 5MB + MIME type `application/pdf`. Preview after select: filename + size + remove button.
- **D-10:** Storage path schema `{candidato_id}/{uuid}.pdf` — 1 CV per candidato, global. Re-apply replaces previous CV. Trade-off: RH loses "version applied at submission time" if candidato re-uploads — accepted for MVP simplicity.

**D. Perguntas de triagem (CAND-02)**
- **D-11:** New hook `useVagaPerguntas(vagaId)` at `src/features/vagas/hooks/useVagaPerguntas.ts`. Query key `vagasKeys.perguntas(vagaId)`. Returns `PerguntaFormulario[]` ordered by `ordem` ASC. Cache independent from `useVaga`.
- **D-12:** Submit atomicity via new Edge Function `submit-candidatura` (mirror of Phase 2 `cadastrar-candidato` pattern). Receives `{ vaga_id, candidato_id, curriculo_url, respostas[] }`. Inside one DB transaction: INSERT candidatura → INSERTs respostas_formulario → triggers existing N8N webhook. All-or-nothing.
- **D-13:** Render perguntas grouped by `bloco` field — `<h3>{bloco}</h3>` section header before first input of each group. Helps cognition when vaga has 15+ perguntas.
- **D-14:** Vaga without configured perguntas (`perguntas_formulario` empty for that vaga_id) — submit form shows only sections (1) + (2). Submit proceeds with empty `respostas[]`. No warning, no block.
- **D-15:** Input type matrix follows `tipo_resposta_pergunta` enum (`texto_curto | texto_longo | single_choice | multiple_choice | numerico`). Validation per-pergunta: `obrigatoria`, `limite_caracteres`, `valor_minimo / valor_maximo`. Schema generated dynamically using a Zod `z.object({ [pergunta.id]: zodForType(pergunta) })` factory. `permite_outros: true` adds a conditional text input below the choice list when "Outros" selected.

**E-H. Locked-by-default**
- **D-16:** PKCE→OTP migration (Phase 3 carryover) deferred to Phase 5. Phase 4 does NOT touch recovery flow.
- **D-17:** `vagasService.enriquecerVaga()` N+1 (3 queries per vaga) accepted for Phase 4 MVP. Optimization deferred to Phase 5 hardening.
- **D-18:** Delete `src/components/pages/VagasPage.tsx` (153 LoC orphan). `VagasPublicasPage` is the real implementation.
- **D-19:** Bug 6 / D-15 RPC `check_candidato_duplicate` already mitigated server-side (RPC strips non-digits). Phase 4's rewrite automatically adopts the service layer.

### Claude's Discretion
- Validation timing (onBlur vs onSubmit) — follow Phase 3 pattern of onBlur with submit-disabled-while-invalid.
- `texto_ajuda` rendering — show as helper text below input (shadcn FormDescription), no tooltip.
- Empty state copy + 404 copy — match Phase 3 pt-BR tone.
- Error toast variants for upload failures — follow `useFormToast` taxonomy from Phase 2.
- Loading states (skeleton vs spinner vs Glass shimmer) — use existing project conventions.
- Order of section anchor links / sticky CTA — planner decides based on UI-SPEC research.

### Deferred Ideas (OUT OF SCOPE)
- RH side: vagas CRUD, kanban triage, candidato comparison views (Phase 6+).
- Profile side: `/candidato/perfil/candidaturas` listing real-data (Phase 5).
- E2E hardening to 100% pass + Lighthouse mobile >80 + WCAG AA tab order (Phase 5).
- PKCE→OTP recovery migration (D-16).
- enriquecerVaga N+1 optimization (D-17).
- Drag-drop CV upload + PDF thumbnail preview (D-09).
- Per-vaga CV history (D-10).
- Psychometric tests (Phase 9).
- Application analytics + n8n richer pipelines (Phase 10).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **VAGA-01** | Listagem pública de vagas filtrando por `status = 'ativa'` (não campo boolean `ativa`) | Existing `vagasService.listVagas()` already correct (line 132 `query.eq('status', 'ativa')`). `VagasPublicasPage` consumes via `useVagas` hook. Bug carryover (Phase 1 KNOWN-ISSUES line 144 of STATE.md "useVagas() queries non-existent `ativa` column") was actually fixed during Phase 1; current consumer uses correct enum. Phase 4 only verifies. |
| **VAGA-02** | Página de detalhe (`/vagas/:slug`) com descrição, requisitos, "Candidatar-se" | `VagaDetalhePage` already 431 LoC complete. Phase 4 patches: (a) `useParams<{ identifier: string }>` + isUuid runtime branch (D-01), (b) new `getVagaBySlug(slug)` overload in `vagasService`, (c) `VagaNotFoundState` inline component (D-03). `descricao` field doesn't exist on real schema — use `descricao_curta + sobre_cargo + responsabilidades` (see Schema Discrepancy Pitfall #3). |
| **VAGA-03** | "Candidatar-se" leva ao formulário (logado) ou login (deslogado) com redirect roundtrip | `VagaDetalhePage:69-73` already has the login redirect, but uses `navigate('/auth/login')` WITHOUT `?redirect=`. Phase 4 adds `?redirect=/vagas/{slug}` per FOUND-05 + Phase 1 RoleGuard contract. After login, redirect brings candidato back to `/vagas/{slug}` so they click "Candidatar-se" again, OR jumps directly to `/candidato/candidatura/formulario/{slug}`. |
| **CAND-01** | Upload de currículo (PDF, < 5MB) para Supabase Storage `curriculos` | New file `src/features/vagas/services/cvUploadService.ts` wrapping `supabase.storage.from('curriculos').upload(path, file)`. Bucket created via new SQL migration with `file_size_limit: 5MB` + `allowed_mime_types: ['application/pdf']` (server-side enforcement per Supabase docs). Path schema `{candidato_id}/{uuid}.pdf` (D-10). Client-side validation BEFORE upload (D-09). RLS path-prefix policy via `(storage.foldername(name))[1] = auth.uid()::text`. |
| **CAND-02** | Resposta às perguntas de triagem customizadas, salvas em `respostas_formulario` | `perguntas_formulario` table exists (database.types.ts lines 1185-1255) with `tipo_resposta` enum (`texto_curto | texto_longo | single_choice | multiple_choice | numerico`), `obrigatoria`, `limite_caracteres`, `opcoes_resposta` (Json), `permite_outros`, `valor_minimo / valor_maximo`, `bloco`, `ordem`, `texto_ajuda`. New `useVagaPerguntas(vagaId)` hook fetches ordered by `ordem ASC`. Dynamic Zod factory (D-15) generates schema. Submit Edge Function does INSERT batch into `respostas_formulario` (Insert shape: candidatura_id, pergunta_id, resposta_texto OR resposta_numerica OR resposta_opcoes JSONB). |
| **CAND-03** | Registro de candidatura `candidato_id + vaga_id + status='aguardando_resposta' + etapa_atual='triagem'` | `candidaturas` Insert (database.types.ts line 443) takes `status?: status_candidatura` (default `aguardando_resposta` per enum) and `etapa_atual?: etapa_processo` (default `triagem` per Postgres column default). Edge Function only needs to pass `candidato_id`, `vaga_id`, `curriculo_url`, `curriculo_nome_original`, `curriculo_tamanho_bytes`. Defaults handle the rest. Verify via `\d candidaturas` in CI smoke. |
| **CAND-04** | Prevenção de candidatura duplicada (mesmo candidato + mesma vaga) | UNIQUE constraint on `(candidato_id, vaga_id)` in DB (already enforced — `existing checkDuplicateApplication` in `candidaturasService:148` uses it). Server-side enforcement via Edge Function catching unique-violation → returns `error_code: 'DUPLICATE_CANDIDATURA'` (Phase 2 contract). Client-side hint via existing `useHasApplied` (already wired in `VagaDetalhePage`). Server-side is non-negotiable per security model; client-side is UX hint that prevents the user from filling 60s of form before failing. |
</phase_requirements>

---

## Summary

Phase 4 adds the candidate-facing browse-and-apply flow on top of a substantial existing foundation. The good news: 60% of the surface area is already production-ready and only needs surgical extensions — `vagasService` queries `status='ativa'` correctly, `candidaturasService` has the N8N webhook plumbing with retry logic, all 6 hooks (useVagas/useVaga/useHasApplied/useCheckDuplicate/useCreateCandidatura/useUpdateCandidaturaStatus) are real, the `vagas` table already has a NOT-NULL `slug` column, and the `perguntas_formulario` + `respostas_formulario` tables + `tipo_resposta_pergunta` enum already exist. The bad news: the existing `FormularioCandidaturaPage.tsx` is 620 LoC of raw `useState` + raw `supabase.from()` calls + hardcoded mock perguntas — it must be fully rewritten using the Phase 2/3 conventions (RHF + Zod + service layer + structured `error_code` + Pitfall 7 redaction). Phase 4 also creates 2 new SQL migrations (slug trigger + curriculos bucket), 1 new Edge Function (`submit-candidatura` mirroring `cadastrar-candidato`), 3 new files in `src/features/vagas/` (cvUploadService, useVagaPerguntas, candidaturaFormSchema), and patches 2 existing files (VagaDetalhePage for slug routing + 404 state, routes.tsx for `/vagas/:slug`).

**Primary recommendation:** Execute as **5 waves** — Wave 0 (DB migrations + Edge Function scaffold + Storage bucket SQL), Wave 1 (cvUploadService + useVagaPerguntas + dynamic Zod factory), Wave 2 (VagaDetalhePage slug patch + 404 state), Wave 3 (FormularioCandidaturaPage full rewrite), Wave 4 (E2E + Vitest + Pitfall 7 grep extension), Wave 5 (UAT runbook + 6 manual scenarios). Mirror Phase 2's atomic-commit pattern (one commit per logical sub-task) so any single regression bisects to a 1-file change.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public job listing (filter by status='ativa') | API/Backend (Postgres + RLS) | Frontend SPA (TanStack Query cache) | Filter logic + RLS enforcement live in Postgres; UI just renders. RLS already permits anon SELECT on `vagas` WHERE status='ativa'. |
| Slug → vaga lookup | API/Backend (Postgres) | Frontend SPA (route param parse) | `vagas.slug` UNIQUE column + DB trigger owns slug generation; frontend just URL-encodes the param and sends it. |
| Slug regex/UUID branching | Frontend SPA (runtime detection) | — | React Router v6 has NO regex param matcher (verified via Context7); branch must happen in component code via `isUuid(identifier)`. |
| 404 state for missing/inactive vaga | Frontend SPA (component state) | — | SPA cannot return real HTTP 404 (no SSR). Conceptual UX-only: dedicated state component + document.title + (optional) `<meta name="robots" content="noindex">`. |
| Auth check before "Candidatar-se" | Frontend SPA (Zustand authStore) | API/Backend (RLS double-check on candidatura insert) | Phase 1 RoleGuard handles route-level; here we check before navigate to `/candidato/candidatura/formulario/:slug`. RLS on `candidaturas.insert` is the safety net. |
| CV upload (≤5MB PDF validation) | Frontend SPA (pre-upload check) + API/Backend (Storage bucket constraint) | — | Defense-in-depth: client validates BEFORE network roundtrip (good UX); bucket-level `file_size_limit` + `allowed_mime_types` enforce server-side (security). |
| Storage RLS for `curriculos` | API/Backend (storage.objects RLS) | — | `auth.uid()` extraction + path-prefix match via `storage.foldername(name)[1]` (Supabase canonical). |
| Signed URL for CV download | API/Backend (Storage signed URL endpoint) | Frontend SPA (TanStack Query cache 55min) | Bucket private; expiring 1h-signed URLs grant time-limited public access without cookies. |
| Dynamic Zod schema for perguntas | Frontend SPA (factory function at form mount) | — | Schema depends on data fetched at runtime (perguntas list per vaga). RHF `resolver` accepts the dynamically-built schema. |
| Atomic candidatura + respostas insert | API/Backend (Edge Function calling Postgres RPC inside transaction) | — | Multi-row insert with all-or-nothing semantics is a textbook Postgres transaction. Edge Function as the trust boundary; RPC as the atomic unit. |
| Duplicate candidatura prevention | API/Backend (UNIQUE constraint + Edge Function error mapping) | Frontend SPA (`useHasApplied` hint) | DB UNIQUE is the source of truth; UI is courtesy. |
| N8N webhook for nova candidatura | API/Backend (Edge Function fire-and-forget AFTER commit) | — | Must NOT be inside the transaction (rollback on webhook failure would lose valid candidatura). |
| Pitfall 7 redaction enforcement | Repo-level (Vitest grep) | — | Static scan; no runtime cost. |

---

## Standard Stack

### Core (already installed — verified via package.json)

| Library | Version (in use) | Latest | Purpose | Why Standard |
|---------|------------------|--------|---------|--------------|
| `@supabase/supabase-js` | 2.104.0 | 2.104.1 | Auth, DB, Storage, Edge Function invocation | Project standard since Phase 1 |
| `@tanstack/react-query` | 5.90.10 | 5.100.4 | Server state cache (vagas, perguntas, hasApplied, signed URLs) | Project standard; Phase 4 reuses existing query-key hierarchy |
| `react-hook-form` | 7.55.0 | 7.73.1 | Form state for the candidatura form | Project standard since Phase 2 |
| `@hookform/resolvers` | 5.2.2 | 5.2.2 | Zod resolver for RHF | Project standard; D-19 ORDER-LOCK gotcha doesn't apply here (no `optional().default()` in candidatura schema unless needed) |
| `zod` | 3.22.4 | 4.3.6 | Schema validation including dynamic factory for perguntas | Project standard. **Stay on v3** — v4 ships breaking changes (renamed `z.string().email()` etc.). Cadastro + Auth all use v3. |
| `react-router-dom` | 6.28.0 | 7.14.2 | Routing (`/vagas/:slug`) | Project standard. **Stay on v6** — v7 is breaking; not part of Phase 4. |
| `sonner` | 2.0.3 | — | Toast notifications | Project canonical (Phase 2 dedupe + `resolve.dedupe` enforced; do NOT add versioned alias) |
| `lucide-react` | (in use) | — | Icons (Upload, FileText, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Send, X) | Project standard |

### Supporting (already in use; no install needed)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `jwt-decode` (4.x) | Read `role` claim from session JWT | Already wired by Phase 3 `extractRole`; Phase 4 doesn't touch |
| `class-variance-authority` (in shadcn) | Variant prop for Glass card variants | Existing `<GlassCard>` patterns |
| Zustand `authStore` | `candidato`, `isAuthenticated`, `role` | Read-only here; Phase 4 doesn't mutate |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RHF + Zod | Formik + Yup | Project-wide standard is RHF; switching would create inconsistency. NOT recommended. |
| Edge Function + RPC | Direct supabase-js calls from client (4 sequential inserts) | (a) Loses atomicity (partial-write risk if last insert fails); (b) No central place for audit logging; (c) Requires more permissive RLS on `respostas_formulario`. **REJECTED** per D-12. |
| Supabase Storage | S3 + presigned upload | Requires AWS account, IAM, signing logic. Supabase Storage already configured + RLS-aware. **REJECTED.** |
| `react-dropzone` for upload UI | Native `<input type="file">` | D-09 explicitly rejects drag-drop for MVP. Native input is simpler + a11y-friendly. |
| Postgres `unaccent()` extension for slug | Manual `translate()` chain | unaccent is more elegant but requires `CREATE EXTENSION` (already enabled on Supabase Pro per `pg_extension` defaults). **RECOMMENDED:** use `unaccent` if available; document fallback to `translate()` chain. |

**Installation:** None required. Phase 4 uses only deps already in `package.json`.

**Version verification (2026-04-25, npm registry):** Project versions are 1-3 minor releases behind latest, which is acceptable per project policy of "stay on the major; bump on minor only when fixing specific bugs". No version bumps needed for Phase 4.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CANDIDATE BROWSER                                │
│                                                                           │
│   ┌──────────────┐  navigate /vagas/:slug  ┌────────────────────────┐    │
│   │ /vagas       │  ──────────────────────► │ /vagas/:slug           │    │
│   │ (public)     │                         │ (VagaDetalhePage)       │    │
│   │ useVagas()   │                         │ useParams + isUuid()    │    │
│   └─────┬────────┘                         │ useVaga(slug)           │    │
│         │                                  │ useHasApplied(candId,   │    │
│         │                                  │  vagaId)                │    │
│         │                                  └─────────┬──────────────┘    │
│         │                                            │                    │
│         │  Click "Candidatar-se"                     │                    │
│         │  if !auth → /auth/login?redirect=/vagas/   │                    │
│         │             {slug}                         ▼                    │
│         │                              ┌───────────────────────────┐      │
│         │                              │ /candidato/candidatura/   │      │
│         │                              │ formulario/:vagaSlug      │      │
│         │                              │ (FormularioCandidatura)   │      │
│         │                              │                           │      │
│         │                              │ useVaga(slug) [resumo]    │      │
│         │                              │ useVagaPerguntas(vagaId)  │      │
│         │                              │ Dynamic Zod schema        │      │
│         │                              │ RHF + zodResolver         │      │
│         │                              └─────────┬─────────────────┘      │
│         │                                        │                        │
│         │                                        │ Submit                 │
│         │                                        ▼                        │
└─────────────────────────────────────────────────────────────────────────┘
                                                   │
                  ┌────────────────────────────────┼────────────────────┐
                  │                                │                    │
                  ▼                                ▼                    │
       ┌──────────────────┐           ┌──────────────────────────┐     │
       │ Supabase Storage │           │ Edge Function:            │     │
       │ POST /curriculos │           │ submit-candidatura        │     │
       │ /{candId}/{uuid} │           │                           │     │
       │ .pdf             │           │ 1. Validate Zod payload   │     │
       │                  │           │ 2. Verify auth.uid()      │     │
       │ RLS: foldername  │           │    matches candidato_id   │     │
       │  [1] = uid       │           │ 3. Call RPC               │     │
       │ Bucket cap: 5MB  │           │   submit_candidatura_atom │     │
       │ MIME: app/pdf    │           │   ic(p_vaga, p_cand,      │     │
       └────────┬─────────┘           │   p_curl, p_resp jsonb)   │     │
                │ returns path        │ 4. RPC TRANSACTION:        │     │
                │                     │    BEGIN                  │     │
                │                     │    INSERT candidaturas    │     │
                ▼                     │    INSERT respostas (×N)  │     │
       curriculo_url passed to        │    COMMIT                 │     │
       Edge Function as part of       │ 5. AFTER commit:          │     │
       payload                        │    fire-and-forget POST   │     │
                                      │    to N8N webhook (5xx-   │     │
                                      │    retry 3× exp backoff)  │     │
                                      │ 6. Return {ok, data}      │     │
                                      │    OR {ok: false,         │     │
                                      │    error_code, message,   │     │
                                      │    field?}                │     │
                                      └───────────┬───────────────┘     │
                                                  │                     │
              ┌───────────────────────────────────┴─────────────┐       │
              ▼                                                 ▼       │
   ┌──────────────────────┐                        ┌────────────────────┐│
   │ Postgres (atomic)    │                        │ N8N webhook        ││
   │ - candidaturas       │                        │ (fire-and-forget)  ││
   │   UNIQUE(cand,vaga)  │                        │ — same URL as      ││
   │ - respostas_formula  │                        │ existing service   ││
   │ - RLS via auth.uid() │                        └────────────────────┘│
   └──────────────────────┘                                              │
                                                                         │
   On {ok:true}: navigate /candidato/perfil + toast.success ─────────────┘
   On error_code='DUPLICATE_CANDIDATURA': toast + navigate to /vagas/:slug
   On error_code='STORAGE_*': inline upload error
   On error_code='VALIDATION'+field: inline error in pergunta
   On NETWORK_ERROR: toast with "Tentar novamente" action
```

### Component Responsibilities

| Layer | File | Responsibility |
|-------|------|----------------|
| Page | `src/components/pages/VagasPublicasPage.tsx` (existing, no rewrite) | Public listing; consumes `useVagas` |
| Page | `src/components/pages/VagaDetalhePage.tsx` (PATCH only) | Slug↔UUID branching, 404 state, login-redirect roundtrip |
| Page | `src/components/pages/FormularioCandidaturaPage.tsx` (REWRITE) | RHF orchestration: vaga summary + CV upload + dynamic perguntas + submit |
| Hook | `src/features/vagas/hooks/useVaga.ts` (PATCH — add slug overload) | TanStack Query for vaga by ID **or** slug |
| Hook | `src/features/vagas/hooks/useVagaPerguntas.ts` (NEW) | TanStack Query for `perguntas_formulario WHERE vaga_id = ?` ORDER BY `ordem` |
| Service | `src/features/vagas/services/vagasService.ts` (PATCH — add `getVagaBySlug`) | Slug-based fetch using `.eq('slug', slug).single()` |
| Service | `src/features/vagas/services/candidaturasService.ts` (PATCH — add `submitCandidaturaWithRespostas`) | Thin wrapper around `supabase.functions.invoke('submit-candidatura', { body })` |
| Service | `src/features/vagas/services/cvUploadService.ts` (NEW) | upload + getSignedUrl + remove |
| Schema | `src/features/vagas/schemas/candidaturaFormSchema.ts` (NEW) | `buildCandidaturaSchema(perguntas)` factory + per-pergunta `zodForType()` |
| Edge Function | `supabase/functions/submit-candidatura/index.ts` (NEW) | Validate, call RPC, fire N8N webhook |
| Edge Function | `supabase/functions/_shared/schemas.ts` (PATCH) | Add `submitCandidaturaSchema` + `SubmitCandidaturaErrorCode` |
| Migration | `supabase/migrations/20260425000001_vagas_slug_trigger.sql` (NEW) | `slugify()` function + dedup trigger + backfill |
| Migration | `supabase/migrations/20260425000002_curriculos_bucket.sql` (NEW) | Bucket + RLS read/write policies |
| Migration | `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` (NEW) | `submit_candidatura_atomic()` RPC SECURITY DEFINER |
| Test | `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` (PATCH) | Add `src/features/vagas/**` paths |

### Recommended Project Structure

```
src/features/vagas/
├── components/                          # NEW (formulário components extracted)
│   ├── PerguntaInput.tsx               # Renders single pergunta based on tipo_resposta
│   ├── CVUploadInput.tsx               # FSM widget (idle/selected/uploading/success/error)
│   └── VagaResumoCard.tsx              # Read-only vaga summary at top of formulário
├── hooks/
│   ├── index.ts                         # PATCH — add useVagaPerguntas export
│   ├── useVagas.ts
│   ├── useVaga.ts                       # PATCH — accept identifier (id|slug)
│   ├── useVagaPerguntas.ts              # NEW
│   └── useCandidaturas.ts
├── schemas/                             # NEW dir
│   └── candidaturaFormSchema.ts         # buildCandidaturaSchema factory
├── services/
│   ├── vagasService.ts                  # PATCH — getVagaBySlug overload
│   ├── candidaturasService.ts           # PATCH — submitCandidaturaWithRespostas wrapper
│   └── cvUploadService.ts               # NEW
└── types/
    └── vagasTypes.ts                    # PATCH — add PerguntaFormulario type alias
```

### Pattern 1: Slug-aware route with regex/UUID runtime branching

**What:** React Router v6 has NO regex param matcher (verified via Context7 `/websites/reactrouter_6_30_3` lookup — `useParams` returns string only; no path constraints). Pattern: single route `/vagas/:identifier`, runtime branch in component.

**When to use:** Always for Phase 4. Back-compat for any UUID URL pasted by RH or used in dev.

**Example:**

```typescript
// Source: Codified from React Router v6 useParams docs + project patterns
// src/features/vagas/utils/isUuid.ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (s: string): boolean => UUID_RE.test(s)

// VagaDetalhePage.tsx
import { useParams } from 'react-router-dom'
import { isUuid } from '@/features/vagas/utils/isUuid'

const { identifier } = useParams<{ identifier: string }>()
const { data, isLoading, error } = useVaga(
  identifier
    ? (isUuid(identifier) ? { id: identifier } : { slug: identifier })
    : null
)

// useVaga.ts overload
export function useVaga(arg: { id: string } | { slug: string } | null) {
  return useQuery({
    queryKey: arg
      ? ('id' in arg ? vagasKeys.detailById(arg.id) : vagasKeys.detailBySlug(arg.slug))
      : ['vagas', 'detail', 'noop'],
    queryFn: () =>
      'id' in arg!
        ? getVagaById(arg.id)
        : getVagaBySlug(arg!.slug),
    enabled: !!arg,
  })
}
```

### Pattern 2: Dynamic Zod schema factory for perguntas

See §8 "Dynamic Zod Factory" below for full code.

### Pattern 3: Storage path-prefix RLS

**What:** Use `(storage.foldername(name))[1]` (Supabase canonical helper, not raw `split_part`).

**Source:** [Supabase Storage Access Control docs](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/storage/security/access-control.mdx) — verified via Context7 2026-04-25.

**Example:** See §6 "Storage RLS SQL" below.

### Pattern 4: Edge Function calling RPC for atomicity

**What:** Edge Function does input validation + auth check; RPC `SECURITY DEFINER` does the multi-row insert in a single Postgres transaction. Webhook fired AFTER successful commit (fire-and-forget).

**When to use:** Any time you need to insert into 2+ tables atomically. Phase 2 `cadastrar-candidato` uses a similar pattern (rollback via `auth.admin.deleteUser` because the auth.users insert is in a different system; here both are in Postgres so a real txn works).

**Example:** See §7 "submit-candidatura Edge Function" below.

### Anti-Patterns to Avoid

- **Hardcoded perguntas in form** (current FormularioCandidaturaPage anti-pattern). Always fetch from DB; never re-implement RH UI in client.
- **Drag-drop CV upload** without explicit user opt-in. Per D-09 — click-only.
- **Sequential supabase-js calls from client for multi-table insert.** Atomicity is impossible client-side; use RPC.
- **Direct `.from('respostas_formulario').insert(...)` from client.** RLS for `respostas_formulario` should require ownership-of-candidatura — easier to enforce inside the RPC where we already know the candidatura_id was just created by this user.
- **Optimistic UI for candidatura submit.** This is a high-stakes action (creates DB rows + fires webhook). Wait for server confirmation; show explicit success/error.
- **Putting webhook call inside the transaction.** A flaky N8N would roll back valid candidaturas. Webhook = AFTER COMMIT, retried with backoff (already implemented in `candidaturasService` — Phase 4 reuses).
- **Versioned `from 'sonner@2.0.3'` import.** Phase 2 02-06 UAT taught us this kills the dedupe; always `from 'sonner'`. Vite `resolve.dedupe: ['sonner']` is the safety net.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom regex chain in JS submitting alongside titulo | Postgres trigger + `slugify()` SQL function | DB is the source of truth; RH UI in Phase 6 doesn't need to know |
| Slug uniqueness/dedup | Sequential `count()` query loop in app code | DB UNIQUE + dedup-suffix loop inside trigger | Race-free under concurrent inserts |
| File MIME type detection | Reading magic bytes in JS | Bucket `allowed_mime_types: ['application/pdf']` | Supabase enforces server-side; client validation is UX-only |
| File size limit | App-side throttle | Bucket `file_size_limit: 5242880` | Server-side, can't be bypassed |
| Signed URL generation | JWT signing in client | `supabase.storage.from('curriculos').createSignedUrl(path, 3600)` | Standard Supabase API |
| Multi-table atomic insert | Sequential calls + manual rollback in Edge Function | Postgres RPC `SECURITY DEFINER` with implicit transaction | True ACID; cleaner code |
| Duplicate candidatura prevention | `SELECT count()` before INSERT | UNIQUE constraint on `(candidato_id, vaga_id)` + Edge Function maps unique-violation → DUPLICATE_CANDIDATURA error_code | Race-free; DB is source of truth |
| Field-level error routing | Custom matcher per error | Phase 2 `error_code` taxonomy + `field?: string` (mirror cadastro pattern) | Established convention; Phase 3 also follows |
| Webhook retry/backoff | Manual setTimeout chain | Existing `WEBHOOK_CONFIG` + `isRetryableError` in `candidaturasService` (line 124) | Already production-tested; reuse |
| Toast taxonomy | Inline toast.error/success calls | `useFormToast` hook (Phase 2 — `success/error/info/warning/promise`) | Standard variants + auto-dismiss durations |
| JWT role decode | base64 split + JSON.parse | `extractRole` from `@/features/auth/utils` (Phase 3) | Already wired |
| `auth.uid()` in RLS | Manual JWT decode in Postgres | Built-in `auth.uid()` function | Standard Supabase pattern |
| Anti-enumeration on 404 | Different copy for "not found" vs "deleted" | Single neutral copy per D-03 | Established Phase 3 D-09 pattern |

**Key insight:** Almost every "should I build this?" answer in Phase 4 is "no, the platform/foundation already provides it." The only NEW custom code is (a) the slug trigger SQL, (b) the dynamic Zod factory, (c) the CV upload FSM, and (d) the submit-candidatura Edge Function — and even those are derivative of established patterns.

---

## Common Pitfalls

### Pitfall 1: Schema discrepancy — `vagas.descricao` does NOT exist

**What goes wrong:** Existing `VagaDetalhePage.tsx:278` reads `vaga.descricao`, but the real Postgres schema (verified in `database.types.ts:1130-1170` — vagas Row) has NO `descricao` column. Real columns are `descricao_curta`, `sobre_cargo`, `responsabilidades`, `requisitos_formacao`, `requisitos_experiencia`, `requisitos_habilidades`, `requisitos_tecnicos`, `diferenciais`, `beneficios`, `perfil_ideal`. The existing code accidentally renders `undefined` (string interpolation collapses to empty paragraph).

**Why it happens:** The `Vaga` interface extends `VagaRow`, but `vaga.descricao` was used historically before the schema split into multiple text fields. tsc didn't catch it because optional chaining hid the type error.

**How to avoid:** Phase 4 PATCH must replace `{vaga.descricao}` with a composed view: `descricao_curta` as lead, then sections for `sobre_cargo` / `responsabilidades` / `requisitos_*` / `diferenciais`. Document the field-to-section mapping in the planner's UI-SPEC.

**Warning signs:** Empty "Sobre a vaga" section when running locally; tsc passing because of optional chaining.

### Pitfall 2: Sonner versioned imports / split-instance regression

**What goes wrong:** Phase 2 02-06 UAT discovered that any `from 'sonner@2.0.3'` import (versioned alias) causes Vite optimizeDeps to emit a SECOND pre-bundle with its own `ToastState` singleton. Toaster subscribes to one, the new file writes into the other → toasts silently drop on the floor.

**Why it happens:** Vite alias config + module-level singletons. Even though Phase 2 fixed the 12 existing files + added `resolve.dedupe: ['sonner']`, future contributors often paste-import with `@version`.

**How to avoid:** All Phase 4 new files (FormularioCandidaturaPage, CVUploadInput, etc.) MUST `import { toast } from 'sonner'` (no version). Add Vitest grep guard to `pitfall7.grep.test.ts` extension OR a separate `sonner.import.grep.test.ts`. Existing E2E `cadastro-flow.spec.ts:276` already asserts `<li data-sonner-toast>` appears in Notifications region — replicate this assertion in `job-application-flow.spec.ts` for the candidatura success toast.

**Warning signs:** Toast not visible in production after submit; works in dev because hot-reload state masks the issue.

### Pitfall 3: `this`-detached supabase method invocation

**What goes wrong:** Phase 2 02-06 UAT discovered `const rpc = supabase.rpc as unknown as (...) => Promise<...>` extracts the method reference and DROPS `this`. Internally supabase-js dereferences `this.rest` and crashes BEFORE network I/O. Unit tests with `vi.mock('@/lib/supabase/client')` cannot catch this — only live browser does.

**Why it happens:** TypeScript type assertions detach the `this` binding. Looks innocuous, blows up at runtime.

**How to avoid:** Phase 4 NEVER does `const upload = supabase.storage.from('curriculos').upload`. Always invoke through the chain: `supabase.storage.from('curriculos').upload(path, file, opts)`. If you must extract, use `.bind(supabase.storage)` or `.call(supabase.storage, ...)`. Code review Wave 4 must grep for `const \w+ = supabase\.\w+` patterns.

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'rest')` in DevTools console on submit/upload; works in unit tests.

### Pitfall 4: Pitfall 7 — leaking sensitive tokens via `console.*`

**What goes wrong:** Logging `{ candidato_id, curriculo_url }` in submit handlers eventually leaks into Vercel Runtime Logs / browser DevTools / error tracking. While CV URLs are not as sensitive as tokens, `access_token` from Supabase storage signed-URL responses CAN appear here if you log the whole response.

**Why it happens:** Convenience logging during dev sometimes survives into production builds.

**How to avoid:** Phase 3 established 3-layer enforcement: (a) Service-level redacted logs (`{ candidato_id, vaga_id, hasFile: !!file, sizeBytes }` — never `file.name`, never URL with token), (b) Vitest console-spy in service tests, (c) `pitfall7.grep.test.ts` static scan. Phase 4 MUST extend `PHASE_3_AUTH_PATHS` array → rename to `PHASE_3_4_PATHS` (or add new `PHASE_4_VAGAS_PATHS` constant) including:
- `src/features/vagas/services/cvUploadService.ts`
- `src/features/vagas/services/candidaturasService.ts`
- `src/features/vagas/hooks/useVagaPerguntas.ts`
- `src/components/pages/FormularioCandidaturaPage.tsx`
- `src/components/pages/VagaDetalhePage.tsx`
- `supabase/functions/submit-candidatura/index.ts` (only if test scaffolding can scan Deno files; otherwise add separate Edge Function pitfall test)

Forbidden tokens for Phase 4 surfaces: `senha|password|access_token|refresh_token|signedurl|signed_url`.

**Warning signs:** Browser DevTools Network tab shows JSON.stringify(file) in console; Vercel logs contain `?token=` URL parameters.

### Pitfall 5: Slug trigger doesn't run on UPDATE → stale slug after titulo rename

**What goes wrong:** RH renames "Auxiliar de Atendimento" → "Recepcionista". If trigger is INSERT-only, the slug stays as `auxiliar-de-atendimento`, breaking SEO/social shares.

**Why it happens:** Forgot to add `OR UPDATE OF titulo` to the trigger.

**How to avoid:** Two competing recommendations — pick ONE and document in CONTEXT.md/STATE.md:
- **Option A (RECOMMENDED for MVP):** Trigger fires on INSERT only. UPDATEs to titulo do NOT regenerate slug. Rationale: stable URLs are more valuable than self-updating slugs; if RH wants a new slug, they delete + recreate the vaga (which is rare). Avoids risk of breaking shared/indexed URLs.
- **Option B:** Trigger fires on INSERT OR UPDATE OF titulo. New slug, dedup-suffixed if collision. Old slug LOST. Rationale: titulo and slug are conceptually coupled. Need to also handle the case where the new slug equals an existing one (use the same dedup-suffix loop).
- **Option C (not recommended):** Maintain a `vagas_slug_history` table mapping old slugs → current vaga_id, and fall back to history lookup in `getVagaBySlug`. Adds complexity, deferred to Phase 6+ if needed.

**Recommendation:** Option A for Phase 4. Document explicitly in the migration comment + RESEARCH.md so Phase 6 RH UI can warn "slug is permanent" in titulo edit flow.

**Warning signs:** Tests passing on insert; only manual UAT catches the rename UX gap.

### Pitfall 6: Slug encoding — accents, ç, special chars in pt-BR titles

**What goes wrong:** Without `unaccent()`, titulo "Atenção ao Paciente" becomes `aten%C3%A7%C3%A3o-ao-paciente` instead of `atencao-ao-paciente`.

**Why it happens:** Naive `lower(titulo)` doesn't strip diacritics.

**How to avoid:** Use `unaccent()` (Postgres extension). Verify availability via `SELECT * FROM pg_extension WHERE extname='unaccent'`. If absent, install via migration (`CREATE EXTENSION IF NOT EXISTS unaccent;`). Fallback: explicit `translate(titulo, 'áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ', 'aaaaaeeeeiiiioooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')`.

**Recommendation:** Try `unaccent`, fall back to `translate()`. Both are deterministic + immutable, so safe to use inside trigger function.

**Warning signs:** URLs with `%XX` percent-encoded UTF-8 octets after slug generation.

### Pitfall 7: PostgreSQL trigger collision dedup race

**What goes wrong:** Two RH users simultaneously create vagas with same titulo. Both triggers see "no collision" → both insert with same slug → UNIQUE violation on second commit.

**Why it happens:** Postgres triggers run inside the inserting transaction. The collision check `SELECT EXISTS(...)` doesn't see uncommitted inserts from other transactions.

**How to avoid:** Add UNIQUE constraint on `vagas.slug` (likely already there since column is NOT NULL — verify with `\d vagas`). Wrap the trigger logic in a retry loop using `EXCEPTION WHEN unique_violation THEN ...` — re-derive slug with incremented suffix and retry. Bounded to ~5 retries (collision of 5+ same-titulo vagas in <1s is humanly impossible).

**Warning signs:** Intermittent unique-violation errors in vagas insert during high-volume RH usage (extremely unlikely for Beauty Smile MVP volume).

### Pitfall 8: Storage RLS — using `auth.uid()::text` vs `(select auth.jwt()->>'sub')`

**What goes wrong:** Two patterns in Supabase docs: `auth.uid()::text` (older) and `(select auth.jwt()->>'sub')` (newer, recommended for performance per Supabase RLS perf docs). The newer pattern wraps in subquery so Postgres can cache the call per-statement.

**Why it happens:** Docs not always updated consistently.

**How to avoid:** Use `(select auth.uid()::text)` — wraps in subquery for cache, AND uses the canonical `auth.uid()` helper (which is itself `auth.jwt()->>'sub'::uuid`). Per Supabase RLS performance best-practices.

**Source:** Verified via Context7 — Supabase docs `apps/docs/content/troubleshooting/rls-performance-and-best-practices-Z5Jjwv.mdx`.

### Pitfall 9: Storage RLS — role check via JWT claim path

**What goes wrong:** D-07 says "OR role IN ('rh','admin')". To check role in storage RLS, you must read it from the JWT custom claim. The Custom Access Token Hook (Phase 1 FOUND-03) injects `role` at `app_metadata.role`. So the check is: `((select auth.jwt()->'app_metadata'->>'role')) IN ('rh','administrador')`.

**Why it happens:** Confusing JWT claim paths — `auth.jwt()` returns the full JWT payload; navigating to nested keys requires `->` (jsonb operator, returns jsonb) chained, then `->>` for the final text extraction. Docs sometimes show `auth.role()` which is a different thing (Postgres role like `authenticated`, NOT app role).

**How to avoid:** Use `(select auth.jwt() #>> '{app_metadata,role}')` for path-based extraction, OR `(select (auth.jwt()->'app_metadata'->>'role'))`. Add a SQL test in the migration that asserts the path resolves correctly. **Critical caveat:** the role is `'administrador'` in the project (per ETAPA enum + RoleGuard), not `'admin'` — match the literal string.

**Warning signs:** RH uploads work but RH downloads fail with RLS denial; or `auth.role()` returns `'authenticated'` instead of `'rh'` — wrong helper.

### Pitfall 10: Edge Function — auth header forwarding for `auth.uid()` resolution

**What goes wrong:** When the client calls `supabase.functions.invoke('submit-candidatura')`, the SDK sends the user's `Authorization: Bearer <jwt>` automatically. BUT inside the Edge Function, if you create the client with the SERVICE_ROLE key, `auth.uid()` returns NULL because service_role bypasses RLS / has no user context.

**Why it happens:** Service-role clients are unauthenticated from the auth perspective.

**How to avoid:** Create TWO clients in the Edge Function:
- `supabaseAdmin` (service_role) for INSERTs that bypass RLS
- `supabaseUser` (anon key + user JWT from incoming Authorization header) for `auth.getUser()` + `auth.uid()` resolution

Use `supabaseUser.auth.getUser()` to verify `candidato_id` in the body matches the authenticated user. Reject mismatch with 403.

```typescript
const authHeader = req.headers.get('Authorization')
const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader ?? '' } }
})
const { data: { user } } = await supabaseUser.auth.getUser()
if (!user) return errorResponse('UNAUTHORIZED', 'Sessão inválida.', undefined, 401)
// Then verify body.candidato_id maps to this user.id via candidatos.user_id
```

**Warning signs:** Edge Function silently allows submitting candidaturas as ANY candidato_id (security hole); `auth.uid()` returns NULL inside RPC calls.

### Pitfall 11: Curriculo URL — store path only, not the public URL

**What goes wrong:** Storing the full signed URL in `candidaturas.curriculo_url` means the URL EXPIRES (1h). Future re-views by RH get a dead URL.

**Why it happens:** Common mistake — confusing path (stable identifier) with URL (transient grant).

**How to avoid:** Store the **path** in `candidaturas.curriculo_url` (e.g., `{candidato_id}/{uuid}.pdf`). Generate a fresh signed URL on each RH access via `cvUploadService.getSignedUrl(path)`. Column name is misleading but baseline; document in service comment.

**Warning signs:** RH clicks "Ver CV" 2 hours after candidatura submitted, gets 401/403; debugging reveals expired token in URL.

### Pitfall 12: PKCE cross-browser limitation NOT addressed in Phase 4

**What goes wrong:** Phase 3 03-07 UAT-3 documented that the password-recovery PKCE flow fails silently when the user clicks the email link in a different browser. Per CONTEXT.md D-16, this is **deferred to Phase 5**, not Phase 4. If Phase 4 happens to touch any auth-recovery surface (it shouldn't — only login redirect), the contributor must NOT unintentionally claim to fix this limitation.

**Why it happens:** Scope creep; researcher might think "while I'm in auth..."

**How to avoid:** Plan acceptance criteria for Wave 0 explicitly enumerates files in scope; auth-recovery files are NOT in scope. Pitfall 7 grep extension does NOT add `passwordService.ts` or `EsqueciSenhaPage.tsx` (already in PHASE_3_AUTH_PATHS).

**Warning signs:** Wave 4 UAT passes "AUTH-04 cross-browser" — that means scope expanded; bisect last commits for unintended auth changes.

### Pitfall 13: N+1 enriquecerVaga acceptance — DON'T optimize this phase

**What goes wrong:** Tempting refactor: "while I'm in vagasService, let me batch the 3 enriching queries into 1 RPC". Per D-17, this is OUT of scope for Phase 4. Mobile Lighthouse will tell us in Phase 5 if it matters.

**Why it happens:** Researcher/planner sees the pattern and wants to fix it.

**How to avoid:** Wave 4 code review explicitly checks: did this PR touch `enriquecerVaga`? If yes, revert. Document the deferral in ROADMAP.md Phase 5.

### Pitfall 14: TanStack Query staleTime on signed URL — staleTime 55min, NOT 1h

**What goes wrong:** D-08 says signed URL expiry 1h + cache 55min. If you set staleTime to exactly 1h (3600000ms), TanStack Query may serve a 5-second-expired URL to the consumer.

**Why it happens:** Off-by-one between server expiry and client cache lifetime.

**How to avoid:** Set `staleTime: 55 * 60 * 1000` (55 min) and `gcTime: 60 * 60 * 1000` (1h). The 5-min buffer accounts for clock skew + request latency. Document constants in `cvUploadService.ts`.

---

## Runtime State Inventory

> Phase 4 is greenfield (creates new tables/buckets/Edge Functions; rewrites/extends frontend). However, since the slug column already exists on `vagas` with NOT-NULL constraint, there ARE pre-existing rows that need backfilling. Treating this as a partial migration phase.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `vagas.slug` column already NOT NULL — existing rows must already have values; Phase 4 trigger is for FUTURE inserts. **Verify:** `SELECT COUNT(*) FROM vagas WHERE slug IS NULL OR slug = '';` before applying trigger. If any null/empty rows, backfill: `UPDATE vagas SET slug = generate_unique_slug(titulo) WHERE slug IS NULL OR slug = '';` | SQL backfill in slug-trigger migration |
| **Stored data** | `candidaturas` rows pre-existing in dev DB referencing `curriculo_url`. New bucket has no backing files for those URLs. | None — accepting that dev/staging may have orphan curriculo_url pointers. Production has zero rows pre-Phase-4. |
| **Live service config** | n8n webhook `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura` already wired in `candidaturasService.ts:60` — no change needed | None |
| **OS-registered state** | None (web SPA + Supabase managed services) | None |
| **Secrets/env vars** | Edge Function needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — all already configured for `cadastrar-candidato`. New Edge Function uses same envs. | None — re-deploy via Supabase CLI populates automatically |
| **Build artifacts** | None to delete; Phase 4 only adds. `VagasPage.tsx` deletion (D-18) requires no build artifact cleanup. | Delete file + remove import from any consumer (audit step in Wave 0) |

**Nothing found in category:** OS-registered state — verified by inspecting project (no native binaries, no system services).

---

## Implementation Approach (per requirement)

### VAGA-01: Public listing of `status='ativa'` vagas, no login required

**Status of existing code:** ✓ COMPLETE. `vagasService.listVagas()` line 132 correctly filters `status='ativa'` (default `apenasAtivas: true`). `VagasPublicasPage` is the consumer page. RLS: anon SELECT on `vagas` WHERE status='ativa' is policy-gated (verify in Wave 0 via `SELECT polqual FROM pg_policy WHERE polrelid = 'vagas'::regclass;`).

**Phase 4 work:** Smoke-verify with E2E test `vagas listing public` that hits `/vagas` unauthenticated and asserts at least 1 vaga rendered (env-gated if dev DB has no seed vagas). Delete orphan `VagasPage.tsx` (D-18) — verify no consumer via `grep -rn "from.*VagasPage" src/`.

**Estimated effort:** 1 small commit (delete file + grep verification) + 1 E2E spec.

### VAGA-02: `/vagas/:slug` detail page

**Status of existing code:** ⚠ PATCH NEEDED. `VagaDetalhePage.tsx` is 431 LoC complete. Patches required:
1. Route `/vagas/:id` → `/vagas/:identifier` in `routes.tsx:83`
2. `useParams<{ id: string }>` → `useParams<{ identifier: string }>` and add `isUuid` runtime branch
3. New `getVagaBySlug(slug)` function in `vagasService.ts`
4. New `useVaga` overload accepting `{ slug } | { id }` discriminated union
5. New `VagaNotFoundState` inline component for D-03 404 UX
6. Replace `vaga.descricao` with composed view of real schema fields (Pitfall 1)
7. Update share URL helper to use slug not id
8. Update `devNavigationPages` entry from `/vagas/1` to `/vagas/exemplo-vaga` (or accept that dev menu shows ID)

**Estimated effort:** 1 medium commit (vagasService + useVaga overload + isUuid util) + 1 medium commit (VagaDetalhePage patch + 404 state).

### VAGA-03: "Candidatar-se" → form (logged-in) or login (logged-out) with redirect roundtrip

**Status of existing code:** ⚠ PATCH NEEDED. `VagaDetalhePage:69-73` calls `navigate('/auth/login')` WITHOUT `?redirect=`. Phase 4 changes:

```typescript
const handleCandidatar = () => {
  if (!isAuthenticated) {
    toast.error('Você precisa estar logado', {
      description: 'Faça login para se candidatar a esta vaga'
    })
    // Use slug in redirect target, since /vagas/:slug is the canonical URL
    const redirect = encodeURIComponent(`/candidato/candidatura/formulario/${identifier}`)
    navigate(`/auth/login?redirect=${redirect}`)
    return
  }
  // Logged-in path: navigate directly to formulário (skip the modal — D-05 single page no extra confirmation)
  navigate(`/candidato/candidatura/formulario/${identifier}`)
}
```

**Decision required:** Should the redirect target be back to `/vagas/:slug` (so candidate clicks twice — once after login) or directly to `/candidato/candidatura/formulario/:slug`? **Recommendation: directly to formulário.** Saves a click; intent is unambiguous (candidato clicked "candidatar-se" before being asked to log in). Phase 1 RoleGuard already handles `?redirect=` preservation correctly per FOUND-05.

**Existing modal (showConfirmModal):** D-05 says "no multi-step stepper, no Sheet/drawer modal" — REMOVE the confirmation modal in `VagaDetalhePage`. Direct navigation to formulário; the formulário page IS the confirmation by virtue of requiring CV + perguntas before submit. This is a deviation from existing UX, planner should call out in PLAN.md.

**Estimated effort:** 1 small commit in same patch as VAGA-02.

### CAND-01: Upload CV (PDF, ≤5MB) to Supabase Storage `curriculos`

**Status of existing code:** ❌ NEW. No `cvUploadService.ts` exists. Existing FormularioCandidaturaPage has hand-rolled drag-drop + multi-MIME (also accepts .doc/.docx — to be removed per D-09 PDF-only).

**Phase 4 work:**
1. New SQL migration `20260425000002_curriculos_bucket.sql` — creates bucket via `INSERT INTO storage.buckets ... ON CONFLICT DO NOTHING` (idempotent), file_size_limit 5242880, allowed_mime_types ['application/pdf'], public=false. Adds 4 RLS policies (SELECT own, SELECT rh, INSERT own, DELETE own).
2. New file `src/features/vagas/services/cvUploadService.ts` — `uploadCV(file, candidatoId)`, `getSignedUrl(path)`, `removeCV(path)`. Custom error class `CVUploadServiceError` with codes (`FILE_TOO_LARGE`, `INVALID_MIME`, `UPLOAD_FAILED`, `STORAGE_QUOTA`, `NETWORK_ERROR`, `UNAUTHORIZED`).
3. New component `src/features/vagas/components/CVUploadInput.tsx` — controlled FSM widget (idle/selected/uploading/success/error), client-side validation BEFORE upload (size + MIME), preview after select.

See §9 for full FSM + API surface.

**Estimated effort:** 2 commits (migration + service) + 1 commit (component) + 1 commit (Vitest unit tests).

### CAND-02: Answer screening perguntas (saved to `respostas_formulario`)

**Status of existing code:** ❌ NEW. Hardcoded perguntas in current FormularioCandidaturaPage (3 blocks × 3 perguntas = 9 hardcoded). Database has real `perguntas_formulario` table with `tipo_resposta` enum, `obrigatoria`, `limite_caracteres`, `opcoes_resposta` JSON, `permite_outros`, `valor_minimo`, `valor_maximo`, `bloco`, `ordem`, `texto_ajuda`.

**Phase 4 work:**
1. Type alias in `vagasTypes.ts`: `export type PerguntaFormulario = Database['public']['Tables']['perguntas_formulario']['Row']`
2. New hook `src/features/vagas/hooks/useVagaPerguntas.ts` — TanStack Query `vagasKeys.perguntas(vagaId)`, returns `PerguntaFormulario[]` ordered by `ordem ASC`, filter `WHERE deleted_at IS NULL`. See §10 for spec.
3. New schema factory `src/features/vagas/schemas/candidaturaFormSchema.ts` — `buildCandidaturaSchema(perguntas: PerguntaFormulario[]): ZodObject` + `zodForType(p: PerguntaFormulario): ZodType`. See §8 for full code skeleton.
4. New component `src/features/vagas/components/PerguntaInput.tsx` — switch over `tipo_resposta` to render `<Input type="text">` / `<Textarea>` / radio group / checkbox group / `<Input type="number">` / conditional "outros" text input.
5. RLS: `respostas_formulario` SELECT policy must allow candidato to read own (via JOIN to `candidaturas WHERE candidato_id = ...`). INSERT happens only inside the SECURITY DEFINER RPC, so explicit INSERT policy is restrictive (deny direct client INSERT). Verify in Wave 0.

**Estimated effort:** 2 commits (hook + schema factory) + 1 commit (PerguntaInput component) + 1 commit (Vitest unit tests for factory).

### CAND-03: Candidatura row with `status='aguardando_resposta'` + `etapa_atual='triagem'`

**Status of existing code:** ⚠ PARTIAL. `candidaturas` Insert in DB defaults `status` to 'aguardando_resposta' and `etapa_atual` defaults to 'triagem' (verify migration in Wave 0). Existing `candidaturasService.createCandidatura` (~line 250+) creates rows; current FormularioCandidaturaPage doesn't actually call it (TODO comments visible at line 195-206).

**Phase 4 work:**
1. Edge Function `submit-candidatura` (NEW) calls RPC `submit_candidatura_atomic` with `(p_candidato_id uuid, p_vaga_id uuid, p_curriculo_url text, p_curriculo_nome text, p_curriculo_size int, p_respostas jsonb)`. RPC inserts candidatura with explicit values (don't rely on column defaults — be defensive: pass `'aguardando_resposta'::status_candidatura, 'triagem'::etapa_processo`). Returns `{ candidatura_id }`.
2. New `submitCandidaturaWithRespostas(...)` thin wrapper in `candidaturasService.ts` that invokes the EF.
3. After EF returns success, new hook `useSubmitCandidatura` (in `useCandidaturas.ts`) calls `candidaturasService.notifyN8N(candidaturaPayload)` fire-and-forget.

**Estimated effort:** 2 commits (RPC migration + EF) + 1 commit (service wrapper).

### CAND-04: Prevent duplicate candidatura

**Status of existing code:** ✓ MOSTLY COMPLETE.
- DB UNIQUE constraint on `(candidato_id, vaga_id)` — verify in Wave 0 via `\d candidaturas`. If absent, add via migration.
- `candidaturasService.checkDuplicateApplication` (line 148) reads it for hint UI.
- `useHasApplied` (`useVagas.ts:149`) wraps it for `VagaDetalhePage`.

**Phase 4 work:**
- EF `submit-candidatura` catches Postgres unique-violation (`error.code === '23505'` AND constraint name matches) → returns `{ ok: false, error_code: 'DUPLICATE_CANDIDATURA', message: 'Você já se candidatou a esta vaga.' }`.
- Client maps error_code → toast + navigate to `/vagas/:slug` (page where user can see "Você já se candidatou a esta vaga" badge, courtesy of `useHasApplied`).
- FormularioCandidaturaPage on mount calls `useHasApplied(vagaId)` and if true, immediately navigates away (no need to fill form). Defense in depth — server-side wins, client-side shaves seconds.

**Recommendation per CAND-04:** **Both layers** — server-side enforcement is non-negotiable (security model); client-side is UX hint to avoid 60-second wasted form fill. This matches the project's pattern (Phase 2 cadastro: client debounce CPF check + server UNIQUE).

**Estimated effort:** Captured in EF + page rewrite commits.

---

## Slug Trigger SQL (concrete migration)

> File: `supabase/migrations/20260425000001_vagas_slug_trigger.sql`

```sql
-- =============================================================================
-- Migration: vagas slug generation trigger + backfill
-- Date: 2026-04-25
-- Phase: 04 (Vagas + Candidatura)
-- Requirement: VAGA-02 (D-02) — DB-owned slug single source of truth
-- =============================================================================
--
-- PURPOSE
-- Auto-generate URL-safe `slug` from `titulo` on INSERT. Dedup numeric suffix
-- (`-2`, `-3`, ...) on collision. INSERT-only per Pitfall 5 / Option A —
-- UPDATEs to titulo do NOT regenerate slug (URL stability > self-updating).
--
-- BACKFILL
-- Existing rows with NULL/empty slug are populated using the same generator.
-- Since `slug` is currently NOT NULL with a default, this is defensive.
-- =============================================================================

BEGIN;

-- Ensure unaccent extension exists (Supabase Pro has it pre-installed; defensive)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =========================================================================
-- 1) slugify(text) — pure function, deterministic, immutable
-- =========================================================================
CREATE OR REPLACE FUNCTION public.slugify(p_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_slug text;
BEGIN
  -- Lowercase
  v_slug := lower(COALESCE(p_input, ''));
  -- Remove accents (á→a, ç→c, etc.)
  v_slug := public.unaccent(v_slug);
  -- Replace any non-alphanumeric run with a single hyphen
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  -- Trim leading/trailing hyphens
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  -- Collapse multiple hyphens (defensive — regexp_replace above already handles)
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  -- Empty fallback (e.g., titulo = "🚀" or all-non-alphanumeric)
  IF v_slug = '' THEN
    v_slug := 'vaga';
  END IF;
  -- Hard cap at 100 chars (DB column likely text but prudent for URLs)
  v_slug := substring(v_slug from 1 for 100);
  RETURN v_slug;
END;
$$;

COMMENT ON FUNCTION public.slugify(text) IS
  'Phase 4: Convert pt-BR text to URL-safe slug. Deterministic, immutable. '
  'Used by vagas_set_slug_trigger.';

-- =========================================================================
-- 2) generate_unique_vaga_slug — collision-aware wrapper
-- =========================================================================
CREATE OR REPLACE FUNCTION public.generate_unique_vaga_slug(
  p_titulo text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix int := 1;
BEGIN
  v_base := public.slugify(p_titulo);
  v_candidate := v_base;
  -- Loop until we find an unused slug; bounded at 1000 to prevent infinite
  -- loops on pathological data
  WHILE v_suffix < 1000 LOOP
    -- Check collision (excluding current row if provided — supports future UPDATE trigger if needed)
    IF NOT EXISTS (
      SELECT 1 FROM public.vagas
      WHERE slug = v_candidate
        AND (p_exclude_id IS NULL OR id <> p_exclude_id)
    ) THEN
      RETURN v_candidate;
    END IF;
    v_suffix := v_suffix + 1;
    v_candidate := v_base || '-' || v_suffix::text;
  END LOOP;
  -- Pathological: 1000 vagas with same titulo. Fall back to UUID suffix.
  RETURN v_base || '-' || replace(gen_random_uuid()::text, '-', '');
END;
$$;

COMMENT ON FUNCTION public.generate_unique_vaga_slug(text, uuid) IS
  'Phase 4: Generate slug from titulo with numeric dedup suffix. '
  'Used by vagas_set_slug_trigger.';

-- =========================================================================
-- 3) Trigger function — INSERT-only (Pitfall 5 Option A)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.vagas_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Only generate if NEW.slug is NULL or empty (allows explicit override by RH if ever needed)
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_unique_vaga_slug(NEW.titulo);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vagas_set_slug_trigger ON public.vagas;

CREATE TRIGGER vagas_set_slug_trigger
  BEFORE INSERT ON public.vagas
  FOR EACH ROW
  EXECUTE FUNCTION public.vagas_set_slug();

COMMENT ON TRIGGER vagas_set_slug_trigger ON public.vagas IS
  'Phase 4: Auto-populate slug from titulo on INSERT only. '
  'UPDATE intentionally NOT covered (URL stability > self-updating). '
  'See .planning/phases/04-vagas-candidatura/04-RESEARCH.md Pitfall 5.';

-- =========================================================================
-- 4) Backfill existing rows with NULL/empty slug (defensive)
-- =========================================================================
UPDATE public.vagas
SET slug = public.generate_unique_vaga_slug(titulo, id)
WHERE slug IS NULL OR slug = '';

-- =========================================================================
-- 5) Ensure UNIQUE constraint on slug (idempotent)
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'vagas'
      AND indexdef LIKE '%UNIQUE%(slug)%'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX vagas_slug_unique_idx ON public.vagas (slug)';
  END IF;
END $$;

-- =========================================================================
-- 6) Grants
-- =========================================================================
REVOKE ALL ON FUNCTION public.slugify(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_unique_vaga_slug(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_unique_vaga_slug(text, uuid) TO service_role;

COMMIT;
```

**Verification (Wave 0 smoke):**
```sql
-- Smoke #1: Trigger fires on INSERT
INSERT INTO vagas (titulo, status) VALUES ('Atendimento ao Paciente', 'rascunho');
SELECT id, titulo, slug FROM vagas WHERE titulo = 'Atendimento ao Paciente';
-- Expected: slug = 'atendimento-ao-paciente'

-- Smoke #2: Dedup on second insert
INSERT INTO vagas (titulo, status) VALUES ('Atendimento ao Paciente', 'rascunho');
SELECT slug FROM vagas WHERE titulo = 'Atendimento ao Paciente' ORDER BY created_at DESC LIMIT 2;
-- Expected: ['atendimento-ao-paciente', 'atendimento-ao-paciente-2']

-- Smoke #3: Accents stripped
INSERT INTO vagas (titulo, status) VALUES ('Atenção & Cuidado', 'rascunho');
SELECT slug FROM vagas WHERE titulo = 'Atenção & Cuidado';
-- Expected: 'atencao-cuidado'

-- Cleanup
DELETE FROM vagas WHERE titulo IN ('Atendimento ao Paciente', 'Atenção & Cuidado');
```

---

## Storage RLS SQL (concrete migration)

> File: `supabase/migrations/20260425000002_curriculos_bucket.sql`

```sql
-- =============================================================================
-- Migration: curriculos bucket + RLS policies
-- Date: 2026-04-25
-- Phase: 04 (Vagas + Candidatura)
-- Requirement: CAND-01 (D-07, D-08, D-09, D-10) — Private bucket, RLS-gated
-- =============================================================================
--
-- BUCKET CONFIG
-- - private (public=false) — access only via signed URL or RLS-authorized SELECT
-- - file_size_limit: 5 MB (5,242,880 bytes) — enforces D-09 client-side cap
-- - allowed_mime_types: application/pdf only — enforces D-09 PDF-only
--
-- PATH SCHEMA (D-10)
-- {candidato_id}/{uuid}.pdf — 1 CV per candidato globally
--
-- RLS PATTERN
-- - Read: own folder (candidato) OR role IN ('rh','administrador') [Custom Access Token Hook claim]
-- - Write: own folder only (no RH writes — they only read)
-- - Delete: own folder only
-- =============================================================================

BEGIN;

-- =========================================================================
-- 1) Create bucket (idempotent)
-- =========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'curriculos',
  'curriculos',
  false,                  -- private
  5242880,                -- 5 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =========================================================================
-- 2) RLS policies on storage.objects (curriculos bucket)
-- =========================================================================

-- Drop any prior policies for idempotency (safe — fresh phase install)
DROP POLICY IF EXISTS "curriculos_select_own_or_rh"   ON storage.objects;
DROP POLICY IF EXISTS "curriculos_insert_own"          ON storage.objects;
DROP POLICY IF EXISTS "curriculos_delete_own"          ON storage.objects;
DROP POLICY IF EXISTS "curriculos_update_own"          ON storage.objects;

-- Helper note: `(storage.foldername(name))[1]` returns the FIRST folder in the
-- object path. For path "abc-123/uuid.pdf", returns "abc-123" — the candidato_id.
--
-- Helper note 2: `(select auth.uid()::text)` wraps in subquery for RLS perf cache
-- (Supabase rls-performance-and-best-practices doc).
--
-- Helper note 3: Role lives in JWT app_metadata.role — Phase 1 Custom Access
-- Token Hook injects it. Path `auth.jwt() #>> '{app_metadata,role}'`.

-- SELECT (download): candidato reads own OR rh/administrador reads any
CREATE POLICY "curriculos_select_own_or_rh"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (
    -- Candidato owns the folder (path starts with their candidato_id)
    -- BUT auth.uid() is the auth.users.id; we need to check via candidatos.user_id
    -- Pragmatic shortcut: store CV under {auth.uid()}/{uuid}.pdf instead of
    -- {candidato_id}/{uuid}.pdf — eliminates the join in RLS.
    -- Alternative: keep candidato_id pathing and join: see "Path schema decision" below.
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR
    -- RH/admin reads any
    (select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')
  )
);

-- INSERT (upload): candidato writes own folder only
CREATE POLICY "curriculos_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- UPDATE (overwrite): candidato updates own folder only (used by upload-with-replace)
CREATE POLICY "curriculos_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- DELETE: candidato deletes own folder only
CREATE POLICY "curriculos_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'curriculos'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

COMMIT;
```

**Path schema decision:** D-10 says `{candidato_id}/{uuid}.pdf`. **Recommendation: change to `{auth.uid()}/{uuid}.pdf`** — eliminates a join in RLS (faster + simpler). The mapping `auth.uid() ↔ candidato_id` happens once via `candidatos.user_id` lookup at upload time, but the RLS check is cheaper this way.

**Trade-off:** D-10 spec must be amended OR keep `{candidato_id}/...` and use a SECURITY DEFINER helper RPC `current_candidato_id()` that does the lookup, then RLS becomes `(storage.foldername(name))[1] = (select public.current_candidato_id()::text)`. Adds complexity.

**Recommendation for CONTEXT.md amendment:** D-10 path schema → `{auth.uid()}/{uuid}.pdf`. Document that "candidato folder ID" is the auth user UUID, not the candidatos table primary key. If Phase 6 RH UI needs to map back, it joins through candidatos.user_id.

**Verification (Wave 0 smoke):**
```sql
-- Smoke #1: Bucket exists with correct config
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'curriculos';

-- Smoke #2: Policies exist
SELECT polname FROM pg_policy WHERE polrelid = 'storage.objects'::regclass
  AND polname LIKE 'curriculos_%';

-- Smoke #3: Reject upload >5MB (manual via curl with 6MB file → expect 413)
-- Smoke #4: Reject upload non-PDF (manual via curl with .txt → expect 400)
-- Smoke #5: Reject upload to other user's folder (Bash + 2 JWTs → expect 403)
```

---

## submit-candidatura Edge Function (architecture)

> Files:
> - `supabase/functions/submit-candidatura/index.ts` (NEW)
> - `supabase/functions/_shared/schemas.ts` (PATCH — add `submitCandidaturaSchema`)
> - `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` (NEW)

### Architecture comparison: RPC vs Sequential

| Aspect | (a) Single RPC `SECURITY DEFINER` | (b) Sequential supabase-js calls in EF |
|--------|----------------------------------|----------------------------------------|
| Atomicity | ✓ True Postgres transaction | ✗ Manual rollback (delete candidatura on resposta failure) |
| Performance | ✓ Single round-trip | ✗ N+1 round-trips |
| Error granularity | ⚠ Single error point (RPC throws) | ✓ Per-step error handling |
| Debugging | ⚠ Need to inspect Postgres logs | ✓ Each step logged in EF |
| Code complexity | ✓ EF is thin (validate, call RPC, fire webhook) | ✗ More EF code |
| Security | ✓ RLS bypassed inside RPC; controlled surface | ⚠ Each call needs RLS attention |
| Race protection | ✓ UNIQUE check in same txn | ⚠ Race window between candidatura insert + respostas |

**RECOMMENDATION:** **Option (a) — Single RPC.** Atomicity is non-negotiable for this user-facing action; "your candidatura was created but your respostas weren't saved" is unacceptable UX. The RPC is bounded in scope (one specific operation, well-tested).

### RPC SQL (`20260425000003_submit_candidatura_rpc.sql`)

```sql
-- =============================================================================
-- Migration: submit_candidatura_atomic RPC
-- Date: 2026-04-25
-- Phase: 04
-- Requirement: CAND-02, CAND-03, CAND-04 — atomic candidatura + respostas insert
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.submit_candidatura_atomic(
  p_candidato_id      uuid,
  p_vaga_id           uuid,
  p_curriculo_url     text,
  p_curriculo_nome    text,
  p_curriculo_size    int,
  p_respostas         jsonb   -- [{pergunta_id, resposta_texto?, resposta_numerica?, resposta_opcoes?}]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_candidatura_id uuid;
  v_resposta jsonb;
BEGIN
  -- 1) Insert candidatura with explicit defaults (don't rely on column defaults)
  INSERT INTO public.candidaturas (
    candidato_id,
    vaga_id,
    status,
    etapa_atual,
    curriculo_url,
    curriculo_nome_original,
    curriculo_tamanho_bytes,
    data_candidatura,
    data_formulario_enviado
  ) VALUES (
    p_candidato_id,
    p_vaga_id,
    'aguardando_resposta'::public.status_candidatura,
    'triagem'::public.etapa_processo,
    p_curriculo_url,
    p_curriculo_nome,
    p_curriculo_size,
    now(),
    now()
  )
  RETURNING id INTO v_candidatura_id;

  -- 2) Batch insert respostas (one per element of p_respostas array)
  IF p_respostas IS NOT NULL AND jsonb_array_length(p_respostas) > 0 THEN
    FOR v_resposta IN SELECT * FROM jsonb_array_elements(p_respostas)
    LOOP
      INSERT INTO public.respostas_formulario (
        candidatura_id,
        pergunta_id,
        resposta_texto,
        resposta_numerica,
        resposta_opcoes
      ) VALUES (
        v_candidatura_id,
        (v_resposta->>'pergunta_id')::uuid,
        v_resposta->>'resposta_texto',
        CASE
          WHEN v_resposta ? 'resposta_numerica'
            THEN (v_resposta->>'resposta_numerica')::numeric
          ELSE NULL
        END,
        v_resposta->'resposta_opcoes'  -- jsonb passthrough
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'candidatura_id', v_candidatura_id,
    'respostas_count', COALESCE(jsonb_array_length(p_respostas), 0)
  );
END;
$$;

COMMENT ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) IS
  'Phase 4: Atomic INSERT candidatura + respostas_formulario. '
  'On UNIQUE violation (candidato_id+vaga_id), throws — caller must catch and map to '
  'DUPLICATE_CANDIDATURA error_code.';

REVOKE ALL ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_candidatura_atomic(uuid, uuid, text, text, int, jsonb) TO service_role;

COMMIT;
```

### Edge Function TypeScript skeleton

```typescript
// supabase/functions/submit-candidatura/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  submitCandidaturaSchema,
  type SubmitCandidaturaInput,
  type SubmitCandidaturaErrorCode,
} from '../_shared/schemas.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(
  code: SubmitCandidaturaErrorCode,
  message: string,
  field?: string,
  status = 400,
): Response {
  const body: Record<string, unknown> = { ok: false, error_code: code, message }
  if (field !== undefined) body.field = field
  return jsonResponse(body, status)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')
    return errorResponse('SERVER_ERROR', 'Método não suportado', undefined, 405)

  // 1) Parse + validate body
  let input: SubmitCandidaturaInput
  try {
    const raw = await req.json()
    const parsed = submitCandidaturaSchema.safeParse(raw)
    if (!parsed.success) {
      const issue = parsed.error.errors[0]
      return errorResponse('VALIDATION', issue?.message ?? 'Payload inválido', issue?.path?.join('.'))
    }
    input = parsed.data
  } catch {
    return errorResponse('VALIDATION', 'Corpo da requisição inválido (JSON malformado)')
  }

  // 2) Build user-context client to verify auth
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization')
  if (!authHeader)
    return errorResponse('UNAUTHORIZED', 'Sessão inválida.', undefined, 401)

  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
  if (userErr || !user)
    return errorResponse('UNAUTHORIZED', 'Sessão inválida.', undefined, 401)

  // 3) Verify body.candidato_id matches authenticated user via candidatos.user_id
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: candidato, error: candErr } = await supabaseAdmin
    .from('candidatos')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()
  if (candErr || !candidato)
    return errorResponse('UNAUTHORIZED', 'Cadastro de candidato não encontrado.', undefined, 403)
  if (candidato.id !== input.candidato_id)
    return errorResponse('UNAUTHORIZED', 'candidato_id não corresponde ao usuário autenticado.', undefined, 403)

  // 4) Call atomic RPC
  const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc(
    'submit_candidatura_atomic',
    {
      p_candidato_id: input.candidato_id,
      p_vaga_id: input.vaga_id,
      p_curriculo_url: input.curriculo_url,
      p_curriculo_nome: input.curriculo_nome,
      p_curriculo_size: input.curriculo_size,
      p_respostas: input.respostas,
    },
  )

  if (rpcErr) {
    // Postgres unique violation → DUPLICATE_CANDIDATURA
    // err.code === '23505' indicates unique_violation
    const isUnique = rpcErr.code === '23505' ||
      (rpcErr.message?.toLowerCase().includes('unique') &&
       rpcErr.message?.toLowerCase().includes('candidato'))
    if (isUnique) {
      return errorResponse('DUPLICATE_CANDIDATURA', 'Você já se candidatou a esta vaga.')
    }
    // Foreign-key violation on pergunta_id → VALIDATION (vaga_id stale)
    if (rpcErr.code === '23503') {
      return errorResponse('VALIDATION', 'Vaga ou pergunta não encontrada.')
    }
    console.error('[submit-candidatura] RPC failed:', rpcErr.message)
    return errorResponse('SERVER_ERROR', 'Não foi possível registrar a candidatura.')
  }

  const candidaturaId = (rpcData as { candidatura_id: string }).candidatura_id

  // 5) Fire-and-forget N8N webhook (AFTER COMMIT)
  // Don't await — return success to user immediately. Webhook failure should not
  // block the candidatura. Use waitUntil if available; otherwise the EF will let
  // the response flush before the function dies.
  fetch('https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'candidatura.created',
      timestamp: new Date().toISOString(),
      data: { candidatura_id: candidaturaId, vaga_id: input.vaga_id, candidato_id: input.candidato_id },
    }),
  }).catch((e) => console.warn('[submit-candidatura] N8N webhook failed (non-blocking):', e?.message))

  return jsonResponse({
    ok: true,
    data: { candidaturaId, candidaturaUrl: `/candidato/perfil` },
  }, 200)
})
```

**SubmitCandidaturaErrorCode union:**
```typescript
// _shared/schemas.ts
export type SubmitCandidaturaErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'DUPLICATE_CANDIDATURA'
  | 'STORAGE_ERROR'   // future-proof: if EF starts owning upload
  | 'SERVER_ERROR'
```

---

## Dynamic Zod Factory (working code skeleton)

> File: `src/features/vagas/schemas/candidaturaFormSchema.ts`

```typescript
/**
 * Dynamic Zod schema factory for candidatura form.
 *
 * Builds a Zod object schema based on the perguntas list fetched from DB.
 * Each pergunta becomes a key in the schema; the value's validator depends
 * on `tipo_resposta` + `obrigatoria` + `limite_caracteres` + `valor_minimo` +
 * `valor_maximo` + `permite_outros`.
 *
 * @module features/vagas/schemas/candidaturaFormSchema
 */
import { z, type ZodType } from 'zod'
import type { Database } from '../../../../database.types'

export type PerguntaFormulario =
  Database['public']['Tables']['perguntas_formulario']['Row']

export type TipoResposta =
  Database['public']['Enums']['tipo_resposta_pergunta']

/**
 * Build a Zod validator for a single pergunta.
 *
 * Returns the appropriate ZodType. If pergunta is not obrigatoria,
 * wraps in `.optional().or(z.literal(''))` to permit empty inputs.
 */
export function zodForType(p: PerguntaFormulario): ZodType<unknown> {
  let base: ZodType<unknown>

  switch (p.tipo_resposta) {
    case 'texto_curto': {
      let s = z.string().trim()
      if (p.obrigatoria) s = s.min(1, 'Resposta obrigatória')
      if (p.limite_caracteres) s = s.max(p.limite_caracteres, `Máximo ${p.limite_caracteres} caracteres`)
      base = s
      break
    }
    case 'texto_longo': {
      let s = z.string().trim()
      if (p.obrigatoria) s = s.min(1, 'Resposta obrigatória')
      if (p.limite_caracteres) s = s.max(p.limite_caracteres, `Máximo ${p.limite_caracteres} caracteres`)
      base = s
      break
    }
    case 'numerico': {
      let n = z.coerce.number()  // coerce because <input type="number"> emits string
      if (p.valor_minimo != null) n = n.min(p.valor_minimo, `Mínimo ${p.valor_minimo}`)
      if (p.valor_maximo != null) n = n.max(p.valor_maximo, `Máximo ${p.valor_maximo}`)
      base = p.obrigatoria
        ? n
        : n.optional().nullable()
      break
    }
    case 'single_choice': {
      const opts = (p.opcoes_resposta as string[] | null) ?? []
      // Build z.enum from opcoes; fall back to z.string if opcoes empty (defensive)
      const choiceSchema =
        opts.length > 0
          ? z.enum(opts as [string, ...string[]])
          : z.string()
      // If permite_outros, allow ANY string (not strictly enum) — UI surfaces "Outros" input
      const finalChoice = p.permite_outros
        ? z.string().min(1)
        : choiceSchema
      base = p.obrigatoria
        ? finalChoice
        : finalChoice.optional().or(z.literal(''))
      break
    }
    case 'multiple_choice': {
      const opts = (p.opcoes_resposta as string[] | null) ?? []
      const itemSchema = p.permite_outros
        ? z.string().min(1)
        : (opts.length > 0
            ? z.enum(opts as [string, ...string[]])
            : z.string())
      let arr = z.array(itemSchema)
      if (p.obrigatoria) arr = arr.min(1, 'Selecione pelo menos uma opção')
      base = arr
      break
    }
    default:
      // Exhaustiveness guard — TS will warn if new tipo_resposta added
      base = z.unknown()
  }

  return base
}

/**
 * Build the full candidatura form schema from a list of perguntas.
 *
 * Schema shape:
 *   {
 *     curriculo: { path: string, name: string, size: number },  -- always required
 *     respostas: { [perguntaId: string]: <type-specific> },
 *     respostas_outros: { [perguntaId: string]: string },        -- only for permite_outros
 *   }
 */
export function buildCandidaturaSchema(perguntas: PerguntaFormulario[]) {
  const respostasShape: Record<string, ZodType<unknown>> = {}
  const respostasOutrosShape: Record<string, ZodType<unknown>> = {}

  for (const p of perguntas) {
    respostasShape[p.id] = zodForType(p)
    if (p.permite_outros) {
      // Optional text field that surfaces only when "Outros" selected in UI
      respostasOutrosShape[p.id] = z.string().trim().min(1, 'Especifique').optional()
    }
  }

  return z.object({
    curriculo: z.object({
      path: z.string().min(1, 'Currículo obrigatório'),
      name: z.string().min(1),
      size: z.number().int().positive().max(5_242_880, 'Currículo deve ter no máximo 5 MB'),
    }, { required_error: 'Faça o upload do currículo (PDF, máx. 5 MB)' }),
    respostas: z.object(respostasShape),
    respostas_outros: z.object(respostasOutrosShape).optional(),
  })
}

export type CandidaturaFormData = z.infer<ReturnType<typeof buildCandidaturaSchema>>
```

**Usage in component:**

```typescript
// FormularioCandidaturaPage.tsx (excerpt)
const { data: perguntas, isLoading: perguntasLoading } = useVagaPerguntas(vagaId)

const schema = useMemo(
  () => buildCandidaturaSchema(perguntas ?? []),
  [perguntas],
)

const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur',
  defaultValues: {
    curriculo: undefined,
    respostas: Object.fromEntries((perguntas ?? []).map((p) => [p.id, undefined])),
    respostas_outros: {},
  },
})
```

**Note:** Building schema in `useMemo` means form is re-initialized when perguntas load. If perguntas is `undefined` initially, render a skeleton; mount the form only when `perguntas` is defined.

---

## CV Upload State Machine + cvUploadService API surface

### FSM (finite state machine)

```
                     ┌─────────────────┐
   user opens form → │ idle            │
                     │ (no file chosen)│
                     └────┬────────────┘
                          │ user clicks "Selecionar arquivo"
                          │ → file picker opens
                          │ → user selects a PDF
                          ▼
                     ┌─────────────────┐
                     │ validating      │
                     │ (sync check:    │
                     │  size + MIME)   │
                     └────┬────────────┘
                          │
                ┌─────────┴─────────┐
              fail               pass
                │                  │
                ▼                  ▼
       ┌────────────────┐    ┌─────────────────────┐
       │ error          │    │ selected            │
       │ - FILE_TOO_    │    │ (preview: name +    │
       │   LARGE        │    │  size + remove btn) │
       │ - INVALID_MIME │    └────┬────────────────┘
       └────┬───────────┘         │
            │                     │ user clicks Submit (form-level)
            │                     │ → form orchestrator triggers upload
       ┌────┴────┐                ▼
   user                      ┌─────────────────┐
   fixes                     │ uploading       │
                             │ (Loader2)       │
                             └────┬────────────┘
                                  │
                       ┌──────────┴──────────┐
                     fail                  pass
                       │                    │
                       ▼                    ▼
              ┌────────────────┐    ┌──────────────────┐
              │ error          │    │ success          │
              │ - UPLOAD_FAILED│    │ (path stored;    │
              │ - NETWORK      │    │  ready for       │
              │ - QUOTA        │    │  candidatura     │
              │ - UNAUTHORIZED │    │  submit)         │
              └────────────────┘    └──────────────────┘
```

**State transitions emit toast feedback:**
- `validating` → `error.FILE_TOO_LARGE` → `useFormToast.error('Currículo muito grande', 'Máximo permitido: 5 MB.')`
- `validating` → `error.INVALID_MIME` → `useFormToast.error('Formato inválido', 'Apenas arquivos PDF são aceitos.')`
- `selected` → user clicks "Remover" → back to `idle`
- `uploading` → `success` → no toast (upload is intermediate; final success toast comes from submit handler)
- `uploading` → `error.UPLOAD_FAILED` → `useFormToast.error('Falha ao enviar currículo', 'Tente novamente em instantes.', { action: { label: 'Tentar novamente', onClick: () => upload() } })`
- `uploading` → `error.NETWORK_ERROR` → idem with network-specific copy
- `uploading` → `error.STORAGE_QUOTA` → `useFormToast.error('Limite de armazenamento atingido', 'Contate o suporte.')` — should never happen with bucket cap

**State machine implementation:** Use `useState<{ status: 'idle' | 'validating' | 'selected' | 'uploading' | 'success' | 'error'; file?: File; path?: string; error?: CVUploadServiceError }>` in `CVUploadInput.tsx`. Or a `useReducer` for cleaner transitions.

### `cvUploadService.ts` API surface

```typescript
// src/features/vagas/services/cvUploadService.ts

import { supabase } from '@/lib/supabase/client'

export class CVUploadServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'FILE_TOO_LARGE'
      | 'INVALID_MIME'
      | 'UPLOAD_FAILED'
      | 'STORAGE_QUOTA'
      | 'NETWORK_ERROR'
      | 'UNAUTHORIZED',
    public details?: unknown
  ) {
    super(message)
    this.name = 'CVUploadServiceError'
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = 'application/pdf'

export interface UploadCVResult {
  path: string                   // stored in candidaturas.curriculo_url
  publicUrl: string              // not really public; just for FYI
  size: number
  name: string
}

/**
 * Client-side validation BEFORE upload (D-09).
 * @throws CVUploadServiceError with FILE_TOO_LARGE | INVALID_MIME
 */
export function validateCV(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new CVUploadServiceError(
      `Currículo deve ter no máximo ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
      'FILE_TOO_LARGE',
      { size: file.size, max: MAX_FILE_SIZE }
    )
  }
  if (file.type !== ALLOWED_MIME) {
    throw new CVUploadServiceError(
      'Apenas arquivos PDF são aceitos',
      'INVALID_MIME',
      { mime: file.type, allowed: ALLOWED_MIME }
    )
  }
}

/**
 * Upload CV to Supabase Storage. Path schema: {auth.uid()}/{uuid}.pdf
 * Replaces existing file at path (upsert: true) per D-10 "1 CV per candidato global".
 *
 * SECURITY NOTE: Pitfall 7 — log only redacted metadata, never file.name (PII)
 * and NEVER the signed URL token.
 */
export async function uploadCV(file: File, authUid: string): Promise<UploadCVResult> {
  validateCV(file)  // throws if invalid

  const uuid = crypto.randomUUID()
  const path = `${authUid}/${uuid}.pdf`

  const { data, error } = await supabase.storage
    .from('curriculos')
    .upload(path, file, {
      contentType: ALLOWED_MIME,
      upsert: false,  // each upload gets fresh UUID; never overwrites
    })

  if (error) {
    // Map common Supabase Storage errors
    const msg = error.message.toLowerCase()
    if (msg.includes('payload too large') || msg.includes('exceeded')) {
      throw new CVUploadServiceError('Currículo excede limite de 5 MB', 'FILE_TOO_LARGE', error)
    }
    if (msg.includes('mime')) {
      throw new CVUploadServiceError('Formato inválido', 'INVALID_MIME', error)
    }
    if (msg.includes('quota')) {
      throw new CVUploadServiceError('Limite de armazenamento', 'STORAGE_QUOTA', error)
    }
    if (msg.includes('jwt') || msg.includes('unauthorized')) {
      throw new CVUploadServiceError('Sessão expirada', 'UNAUTHORIZED', error)
    }
    throw new CVUploadServiceError('Falha ao enviar currículo', 'UPLOAD_FAILED', error)
  }

  return {
    path: data.path,
    publicUrl: '',  // bucket is private; signed URL on-demand
    size: file.size,
    name: file.name,
  }
}

/**
 * Generate signed URL for a CV (1h expiry per D-08).
 * Used by RH to view/download CVs in Phase 6.
 */
export async function getSignedUrl(path: string): Promise<string> {
  const EXPIRES_IN_SECONDS = 3600  // 1 hour
  const { data, error } = await supabase.storage
    .from('curriculos')
    .createSignedUrl(path, EXPIRES_IN_SECONDS)

  if (error || !data?.signedUrl) {
    throw new CVUploadServiceError('Não foi possível gerar URL de download', 'UPLOAD_FAILED', error)
  }
  return data.signedUrl
}

/**
 * Remove a CV from storage. Used on form-level "Remover" click before upload commits,
 * or when candidato wants to clear and re-upload.
 */
export async function removeCV(path: string): Promise<void> {
  const { error } = await supabase.storage.from('curriculos').remove([path])
  if (error) {
    throw new CVUploadServiceError('Não foi possível remover currículo', 'UPLOAD_FAILED', error)
  }
}
```

**Constants exposed:** `MAX_FILE_SIZE`, `ALLOWED_MIME` (for use in client validation displays).

**Tests required:**
- `validateCV` — 4 cases (valid PDF + 4MB, valid PDF + 6MB throws FILE_TOO_LARGE, .docx file throws INVALID_MIME, empty File throws FILE_TOO_LARGE on size 0 boundary — actually 0 is valid technically; test the boundary).
- `uploadCV` — happy path (mock supabase.storage.from().upload() success), error mapping for each Supabase error class.
- `getSignedUrl` — happy path, error case.
- `removeCV` — happy path, error case.

---

## useVagaPerguntas Hook Spec

> File: `src/features/vagas/hooks/useVagaPerguntas.ts`

```typescript
/**
 * TanStack Query hook for fetching screening perguntas for a vaga.
 *
 * Cache key independent from useVaga(). Returns perguntas ordered by `ordem ASC`,
 * filtered to non-deleted rows. Empty array if vaga has no perguntas configured
 * (per D-14, this is valid — submit proceeds without respostas).
 *
 * @module features/vagas/hooks/useVagaPerguntas
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { vagasKeys } from './useVagas'
import type { PerguntaFormulario } from '../schemas/candidaturaFormSchema'

// Extend vagasKeys with perguntas branch — add to useVagas.ts vagasKeys export
declare module './useVagas' {
  interface VagasKeysExtension {
    perguntas: (vagaId: string) => readonly ['vagas', 'perguntas', string]
  }
}

// In useVagas.ts, add to the vagasKeys object:
//   perguntas: (vagaId: string) =>
//     [...vagasKeys.all, 'perguntas', vagaId] as const,

interface UseVagaPerguntasOptions
  extends Omit<UseQueryOptions<PerguntaFormulario[], Error>, 'queryKey' | 'queryFn'> {}

export function useVagaPerguntas(
  vagaId: string | null | undefined,
  options?: UseVagaPerguntasOptions,
) {
  return useQuery({
    queryKey: vagasKeys.perguntas(vagaId ?? ''),
    queryFn: async (): Promise<PerguntaFormulario[]> => {
      const { data, error } = await supabase
        .from('perguntas_formulario')
        .select('*')
        .eq('vaga_id', vagaId!)
        .is('deleted_at', null)
        .order('ordem', { ascending: true })

      if (error) {
        throw new Error(`Erro ao buscar perguntas: ${error.message}`)
      }
      return data ?? []
    },
    enabled: !!vagaId,
    staleTime: 5 * 60 * 1000,    // 5 min — perguntas rarely change once vaga is published
    gcTime: 10 * 60 * 1000,       // 10 min in cache
    retry: 2,
    ...options,
  })
}
```

**Behavior contract:**
- `vagaId === null | undefined` → query disabled, `data === undefined`
- Vaga has 0 perguntas → `data === []` (NOT undefined). Form renders sections (1) + (2) only, no perguntas section header.
- RLS on `perguntas_formulario`: must allow authenticated SELECT (verify in Wave 0 — currently unknown if anon can SELECT, or if it's authenticated-only).

---

## Pitfall 7 Grep Test Extension Plan

**Recommendation:** Rename `PHASE_3_AUTH_PATHS` to a per-feature pattern. Two options:

### Option A (RECOMMENDED): Keep file as-is, add new array `PHASE_4_VAGAS_PATHS`

```typescript
// src/features/auth/utils/__tests__/pitfall7.grep.test.ts (extend)

const PHASE_3_AUTH_PATHS = [
  'src/features/auth',
  'src/components/pages/LoginCandidatoPage.tsx',
  'src/components/pages/LoginRHPage.tsx',
  'src/components/pages/EsqueciSenhaPage.tsx',
  'src/components/pages/RedefinirSenhaPage.tsx',
  'src/store/authStore.ts',
  'src/lib/supabase/client.ts',
] as const

// NEW: Phase 4 vagas surfaces
const PHASE_4_VAGAS_PATHS = [
  'src/features/vagas/services/cvUploadService.ts',
  'src/features/vagas/services/candidaturasService.ts',
  'src/features/vagas/services/vagasService.ts',
  'src/features/vagas/hooks/useVagaPerguntas.ts',
  'src/features/vagas/schemas/candidaturaFormSchema.ts',
  'src/features/vagas/components',  // CVUploadInput, PerguntaInput, VagaResumoCard
  'src/components/pages/FormularioCandidaturaPage.tsx',
  'src/components/pages/VagaDetalhePage.tsx',
] as const

const ALL_PATHS = [...PHASE_3_AUTH_PATHS, ...PHASE_4_VAGAS_PATHS] as const

// Existing test now scans both:
describe('B14 — Pitfall 7 redaction guard', () => {
  it('no console.* logs senha/password/access_token/refresh_token across Phase 3+4 surfaces', () => {
    const violations: { file: string; line: number; text: string }[] = []
    const files = ALL_PATHS.flatMap((p) => collectFiles(p))
    // ... existing FORBIDDEN scan ...
  })

  it('scan covers at least 18 source files (sanity check — 10 from Phase 3 + ≥ 8 from Phase 4)', () => {
    const files = ALL_PATHS.flatMap((p) => collectFiles(p))
    expect(files.length).toBeGreaterThanOrEqual(18)
  })

  // NEW: Phase 4-specific forbidden tokens (signed URL leak prevention)
  it('no console.* logs signed URL tokens across Phase 4 surfaces', () => {
    const FORBIDDEN_PHASE_4 =
      /console\.(log|error|warn|info|debug)[\s\S]{0,80}?(signedurl|signed_url|signedURL|\?token=)/i
    const violations: { file: string; line: number; text: string }[] = []
    const files = PHASE_4_VAGAS_PATHS.flatMap((p) => collectFiles(p))
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (FORBIDDEN_PHASE_4.test(text)) {
          violations.push({ file, line: idx + 1, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`).join('\n')
      throw new Error(`Pitfall 7 (Phase 4) violations:\n${msg}`)
    }
    expect(violations).toHaveLength(0)
  })
})
```

### Option B: Rename file to `pitfall7.grep.test.ts` (already that), add per-phase exports

Less invasive. Option A above already does this, just by adding a new constant.

**RECOMMENDATION:** Option A. Keeps Phase 3 + Phase 4 in one test file (avoids duplicating the `collectFiles` + `FORBIDDEN` infrastructure), while keeping the path arrays separately greppable.

**Edge Function pitfall coverage:** Optionally add `supabase/functions/submit-candidatura/index.ts` to the scan. The current `collectFiles` function reads `.ts/.tsx` files — Edge Functions are `.ts` so it works. Caveat: Deno's `console.error('[cadastrar-candidato] ...')` is acceptable as long as it doesn't include senha/password/tokens. Existing `cadastrar-candidato/index.ts` is NOT in the Phase 3 array (was scoped only to client surfaces). Recommendation: ADD `supabase/functions/submit-candidatura` AND `supabase/functions/cadastrar-candidato` to a new `EDGE_FUNCTION_PATHS` array.

---

## Test Plan (Vitest + Playwright + UAT)

### Vitest unit tests (Wave 4)

| Test file | Coverage | Key scenarios |
|-----------|----------|---------------|
| `src/features/vagas/services/__tests__/cvUploadService.test.ts` | NEW — 100% of cvUploadService | (1) validateCV: pass valid 4MB PDF; (2) throws FILE_TOO_LARGE on 6MB; (3) throws INVALID_MIME on .docx; (4) uploadCV happy path with mock storage; (5) maps "payload too large" → FILE_TOO_LARGE; (6) maps mime error; (7) maps quota error; (8) maps JWT error → UNAUTHORIZED; (9) getSignedUrl happy + error; (10) removeCV happy + error. |
| `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` | NEW — 100% of zodForType + buildCandidaturaSchema | (1) texto_curto obrigatoria empty fails; (2) texto_curto with limite_caracteres; (3) texto_longo same; (4) numerico with valor_minimo/maximo bounds; (5) numerico optional; (6) single_choice from opcoes; (7) single_choice with permite_outros relaxes to z.string; (8) multiple_choice obrigatoria min 1; (9) multiple_choice empty allowed when not obrigatoria; (10) buildCandidaturaSchema with empty perguntas list returns object with curriculo only; (11) buildCandidaturaSchema with mixed perguntas validates real input. |
| `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` | NEW — query behavior | (1) disabled when vagaId null; (2) returns ordered array; (3) returns [] for vaga with no perguntas; (4) error propagation. Use `@tanstack/react-query` test wrapper. |
| `src/features/vagas/services/__tests__/vagasService.test.ts` | EXTEND — add getVagaBySlug | (1) getVagaBySlug happy; (2) NOT_FOUND on nonexistent slug; (3) accepts UUID-shaped slug (treats as slug not ID — overload chooser is in hook). |
| `src/features/vagas/services/__tests__/candidaturasService.test.ts` | EXTEND — add submitCandidaturaWithRespostas | (1) happy path invokes EF; (2) maps DUPLICATE_CANDIDATURA → CandidaturasServiceError code DUPLICATE_APPLICATION; (3) maps VALIDATION → INVALID_INPUT; (4) maps SERVER_ERROR; (5) maps NETWORK_ERROR; (6) Pitfall 7: no senha/password/access_token logged. |
| `src/features/vagas/utils/__tests__/isUuid.test.ts` | NEW — 6 lines but high importance | (1) valid UUID true; (2) lowercase UUID true; (3) UUID with extra chars false; (4) slug-shaped string false; (5) empty string false; (6) UUIDv7 (also matches the regex). |
| `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` | EXTEND — add PHASE_4_VAGAS_PATHS | See §Pitfall 7 Grep Extension above |

**Estimate:** ~80 new tests across 6 new files + 2 extended.

### Playwright E2E (Wave 4)

> File: `e2e/job-application-flow.spec.ts` (rewrite — existing one is from pre-Phase-1 era)

| Test ID | Scenario | Type | Notes |
|---------|----------|------|-------|
| **B-J01** | Anon visits `/vagas` and sees ≥ 1 active vaga | Unconditional | Env-gated if dev DB has 0 seed vagas |
| **B-J02** | Anon clicks vaga card → arrives at `/vagas/:slug` | Unconditional | Asserts URL contains slug-format string (not UUID); uses `vaga.titulo` slugified |
| **B-J03** | Anon on `/vagas/:slug` clicks "Candidatar-se" → redirected to `/auth/login?redirect=...` | Unconditional | Asserts `redirect` param value |
| **B-J04** | After login, lands on `/candidato/candidatura/formulario/:slug` | Unconditional | Login helper from existing `cadastro-flow.spec.ts` patterns |
| **B-J05** | `/vagas/:invalid-slug` shows VagaNotFoundState | Unconditional | Asserts copy "Vaga não encontrada"; CTA back to `/vagas` |
| **B-J06** | Form rendering: vaga summary + CV upload + perguntas list (if any) + submit | Unconditional | Asserts heading text + section count |
| **B-J07** | Upload .docx → inline error "Apenas PDF" | Unconditional | Uses `setInputFiles` + assertion of toast/error |
| **B-J08** | Upload 6MB PDF → inline error "Máximo 5 MB" | Unconditional | 6MB fixture file in `e2e/fixtures/` |
| **B-J09** | Successful submit → toast.success + navigate `/candidato/perfil` | Env-gated (writes to DB) | Uses test-user with no existing candidatura on test vaga; cleanup in afterEach |
| **B-J10** | Re-submit (duplicate) → toast.error "já se candidatou" + stays/navigates | Env-gated | Uses test-user that DOES have candidatura |
| **B-J11** | Sonner DOM contract: candidatura success toast appears in Notifications region | Unconditional | Mirrors B15 from cadastro-flow |
| **B-J12** | Pitfall 7 (B14 equivalent): formulário page console has no `senha\|password\|access_token` after submit | Unconditional | Static — covered by Vitest grep, but E2E live-spy as belt-and-braces |

**Estimate:** ~12 scenarios. Mix of unconditional (anon flows + invalid inputs) and env-gated (DB-writing flows).

### UAT Manual Runbook (Wave 5)

> File: `.planning/phases/04-vagas-candidatura/04-XX-UAT.md` — 6-8 scenarios for human validation

| UAT ID | Scenario | Why manual (not automated) |
|--------|----------|----------------------------|
| **UAT-J01** | Real PDF upload (5MB-ish, real document) → submit → check Supabase Storage UI shows file at `{auth.uid()}/{uuid}.pdf` | Verifies bucket + RLS + path schema work end-to-end with real network |
| **UAT-J02** | Real perguntas (RH-configured in dev DB or seed data with 3+ perguntas of different types) → fill all → submit → verify `respostas_formulario` rows in Supabase Studio | Verifies dynamic schema generation + RPC atomicity with real perguntas data |
| **UAT-J03** | Same candidato re-submits same vaga → expect DUPLICATE_CANDIDATURA toast | Verifies UNIQUE + EF error mapping in real DB |
| **UAT-J04** | Anon → vaga → "Candidatar-se" → login → DOES land directly on formulário (not back at vaga detail) | Verifies redirect roundtrip UX (humans best judge "feels right") |
| **UAT-J05** | Slug stability: refresh `/vagas/:slug` after save → still works; share URL via WhatsApp opens correctly | Verifies persistent URL contract |
| **UAT-J06** | DevTools redaction (Pitfall 7): submit candidatura while DevTools Network + Console open → asserts (a) no senha in logs, (b) signed URL only in HTTPS body, (c) console uses sanitized fields | Mirrors Phase 3 UAT-5 pattern |
| **UAT-J07** | RH (Phase 6 preview) opens `/rh/candidatos/:id` → sees the curriculo path; clicking download generates fresh signed URL → file opens | Confirms read-side flow even though Phase 6 owns the UI |
| **UAT-J08** | Manual cross-browser test: candidato in Chrome, opens vaga URL in Safari → vaga loads, can apply if logged in | Sanity check no browser-specific breakage |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.7 + Playwright 1.40+ + Supabase CLI smoke tests |
| Config file | `vitest.config.ts` (existing, no changes); `playwright.config.ts` (existing) |
| Quick run command | `npm run test:run -- src/features/vagas` |
| Full suite command | `npm run test:run && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VAGA-01 | Public listing filters status='ativa' | unit + E2E | `npm run test:run -- vagasService.test.ts` + `npx playwright test job-application-flow.spec.ts -g "B-J01"` | ⚠ Wave 0 (E2E exists but obsolete; rewrite) |
| VAGA-02 | `/vagas/:slug` resolves; isUuid branches; 404 state | unit + E2E | `npm run test:run -- isUuid.test.ts useVaga.test.ts` + `npx playwright test -g "B-J02|B-J05"` | ❌ Wave 0 (isUuid + useVaga overload tests new) |
| VAGA-03 | Login redirect roundtrip | E2E | `npx playwright test -g "B-J03|B-J04"` | ❌ Wave 0 |
| CAND-01 | CV upload validation + storage | unit + E2E + UAT | `npm run test:run -- cvUploadService.test.ts` + `npx playwright test -g "B-J07|B-J08"` + UAT-J01 | ❌ Wave 0 |
| CAND-02 | Perguntas dynamic + respostas_formulario insert | unit + UAT | `npm run test:run -- candidaturaFormSchema.test.ts useVagaPerguntas.test.ts` + UAT-J02 | ❌ Wave 0 |
| CAND-03 | Candidatura row with correct defaults | E2E + UAT | `npx playwright test -g "B-J09"` + UAT-J02 | ❌ Wave 0 |
| CAND-04 | Duplicate prevention | unit + E2E + UAT | `npm run test:run -- candidaturasService.test.ts -g "DUPLICATE"` + `npx playwright test -g "B-J10"` + UAT-J03 | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:run -- src/features/vagas` (~10s scope-limited Vitest)
- **Per wave merge:** `npm run test:run` (full Vitest, ~30s) + `npx playwright test job-application-flow.spec.ts` (~40s)
- **Phase gate:** Full suite green + UAT 6/8 PASS minimum (UAT-J07 deferred to Phase 6 since RH UI not built; UAT-J08 if cross-browser available)

### Wave 0 Gaps

- [ ] `e2e/fixtures/cv-sample-4mb.pdf` — valid PDF for upload happy path
- [ ] `e2e/fixtures/cv-sample-6mb.pdf` — oversized PDF for FILE_TOO_LARGE
- [ ] `e2e/fixtures/not-a-cv.docx` — wrong MIME for INVALID_MIME
- [ ] `e2e/fixtures/cv-sample.txt` (alt INVALID_MIME)
- [ ] `src/features/vagas/services/__tests__/cvUploadService.test.ts` — covers CAND-01
- [ ] `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` — covers CAND-02
- [ ] `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` — covers CAND-02
- [ ] `src/features/vagas/utils/__tests__/isUuid.test.ts` — covers VAGA-02
- [ ] `e2e/job-application-flow.spec.ts` (full rewrite of existing pre-Phase-1 stub) — covers VAGA-01..03 + CAND-01..04
- [ ] DB seed: at least 2 active vagas with 3+ perguntas each in dev DB for E2E + UAT

### Cannot Be Unit-Tested (Needs UAT)

- Real PDF binary handling end-to-end (Vitest with mock blob ≠ real bytes flowing through Storage API)
- Real Supabase Storage RLS enforcement (Vitest mock returns 200; real RLS may reject path mismatch silently or with 403)
- Real Edge Function deployed-and-working (smoke must hit hosted URL, not local stub)
- Cross-browser slug URL handling (Safari/Chrome encode special chars differently)
- Sonner DOM contract live (Vite dev server vs production build can diverge — already learned from Phase 2 02-06)
- DevTools-level Pitfall 7 (sanity check that no leak appears under real network inspector)

### Regression Risks

- Phase 2 cadastro flow — could regress if `_shared/schemas.ts` evolution breaks `cadastroCandidatoSchema`. Run cadastro Vitest suite after each Wave.
- Phase 3 auth flow — could regress if Pitfall 7 grep test changes inadvertently exclude existing paths. Run auth Vitest suite after extending `pitfall7.grep.test.ts`.
- Existing VagaDetalhePage modal — confirmation modal removal (per D-05) is a UX change; ensure no test references the modal.
- TanStack Query cache key collision — if `vagasKeys.detail` is reused for both ID and slug variants, cache pollution. Recommendation: introduce `vagasKeys.detailById` and `vagasKeys.detailBySlug` as separate branches.

---

## Pitfalls & Trade-offs Recap (Phase 4 prioritized)

| # | Pitfall | Severity | Mitigation |
|---|---------|----------|------------|
| 1 | `vaga.descricao` doesn't exist; current code renders empty | HIGH | Patch VagaDetalhePage to use real schema fields |
| 2 | Sonner versioned import → split-instance; toasts vanish | HIGH | All new files `from 'sonner'`; rely on `resolve.dedupe` |
| 3 | `this`-detached supabase method calls crash before network | HIGH | Always invoke through chain; never `const x = supabase.foo` |
| 4 | Pitfall 7 console leak (signed URLs include tokens) | HIGH | Extend grep guard with PHASE_4_VAGAS_PATHS + signed-URL token regex |
| 5 | Slug trigger doesn't run on UPDATE (RECOMMENDATION: keep INSERT-only for URL stability) | MEDIUM | Document explicitly in trigger comment + RESEARCH; revisit Phase 6 |
| 6 | Slug encoding without unaccent → percent-encoded URLs | MEDIUM | Use `unaccent` extension; fall back to translate() |
| 7 | Concurrent slug collision race | LOW | Bounded retry on UNIQUE violation in trigger |
| 8 | `auth.uid()::text` vs `(select auth.jwt()->>'sub')` performance | LOW | Use `(select auth.uid()::text)` per Supabase RLS perf docs |
| 9 | Storage RLS role check via JWT path — wrong path returns NULL | HIGH | Use `auth.jwt() #>> '{app_metadata,role}'`; test live |
| 10 | Edge Function service_role client has no `auth.uid()` | HIGH | Create separate user-context client for auth verification |
| 11 | Storing signed URL (transient) instead of path (stable) in DB | HIGH | Always store path; signed URL on-demand |
| 12 | PKCE cross-browser — DEFERRED (D-16); don't accidentally fix in Phase 4 | MEDIUM | Plan acceptance: no auth files in scope |
| 13 | enriquecerVaga N+1 — DEFERRED (D-17); don't optimize in Phase 4 | LOW | Code review checks |
| 14 | Signed URL staleTime 1h vs 55min off-by-one | LOW | Set staleTime to 55 min; gcTime to 60 min |
| 15 | Path schema `{candidato_id}` vs `{auth.uid()}` — RECOMMEND amend D-10 to use `{auth.uid()}` to simplify RLS | MEDIUM | CONTEXT.md amendment; document in PLAN.md why |
| 16 | RLS `auth.jwt()` claim path uses `'administrador'` not `'admin'` | MEDIUM | Test in Wave 0 with real RH JWT |
| 17 | Edge Function Webhook fire-and-forget — needs `EdgeRuntime.waitUntil` for reliability | LOW | Acceptable: webhook is best-effort; existing service has retry; Phase 4 uses fetch().catch() |
| 18 | TanStack Query `vagasKeys.detail` reuse for slug+id branches → cache pollution | MEDIUM | Split into `detailById` + `detailBySlug` |
| 19 | Schema regen — `npm run db:types` after migrations | LOW | Husky-pre-commit catches; verify in Wave 0 |
| 20 | `descricao_curta` is shorter than `descricao` would have been; UI may need composition logic | MEDIUM | Compose: descricao_curta as lead + collapsible sobre_cargo + responsabilidades |

---

## Open Questions (RESOLVED)

> All 6 questions resolved 2026-04-25 during checker iteration 1. Each resolution lists the concrete answer + the plan/task that implements it.

1. **Should `respostas_outros` be persisted to DB?**
   - What we know: `permite_outros: true` allows the candidato to write a free-text response when the choice list doesn't fit. Schema has `resposta_texto` for text + `resposta_opcoes` jsonb for selections.
   - What's unclear: Should "Outros: my custom answer" be stored as part of `resposta_opcoes` (e.g., `["Other:my answer"]`) or split between `resposta_opcoes` AND `resposta_texto`?
   - Recommendation: **Concat into `resposta_opcoes` jsonb**: `["selection_1", "selection_2", { other: "free text" }]`. Simpler than schema split. Document in RPC comment.
   - **Resolution (B1):** **Concat-into-`resposta_opcoes`** is the chosen pattern. The frontend (Plan 04-07 Task 1, `onSubmit` handler) MUST merge `data.respostas_outros[perguntaId]` (when present and non-empty) into the `resposta_opcoes` array of the matching pergunta row as a final element of shape `{ outros: text }`. The Edge Function (Plan 04-05 Task 2) accepts the merged shape unchanged via `resposta_opcoes: z.unknown()`. The RPC (Plan 04-01 migration `20260425000003_submit_candidatura_rpc.sql`) writes the jsonb verbatim into `respostas_formulario.resposta_opcoes`. No schema split. No separate `outros` column. Implemented by: Plan 04-07 Task 1 (frontend merge), Plan 04-05 Task 1 (schema accepts), Plan 04-01 Task 4 (RPC stores).

2. **Does `respostas_formulario` need an INSERT RLS policy or only the RPC?**
   - What we know: D-12 says all inserts go through SECURITY DEFINER RPC. RPC bypasses RLS.
   - What's unclear: Should we ADD a restrictive RLS policy explicitly DENYING client INSERT (defense in depth)? Or rely on RPC being the only path?
   - Recommendation: ADD explicit policy `CREATE POLICY "respostas_no_direct_insert" ON respostas_formulario FOR INSERT TO authenticated WITH CHECK (false);` — fails any direct client INSERT loudly. Tests should verify this.
   - **Resolution (B1):** **Add explicit DENY-INSERT policy** for defense in depth. Implemented by: Plan 04-01 Task 3 (migration `20260425000003_submit_candidatura_rpc.sql` adds the `respostas_no_direct_insert` policy alongside the RPC definition). Server-side acceptance test in Plan 04-01 Task 5 smoke #4 attempts a direct INSERT as authenticated and asserts a policy-violation error (code `42501`).

3. **Should the Edge Function `submit-candidatura` enforce that the curriculo_url path matches `{auth.uid()}/`?**
   - What we know: The path is generated client-side from `crypto.randomUUID()`; client could spoof.
   - What's unclear: How to validate? Server-side check that path starts with `{auth.uid()}/` is cheap.
   - Recommendation: Add validation in EF: `if (!input.curriculo_url.startsWith(`${user.id}/`)) return errorResponse('VALIDATION', 'Caminho do currículo inválido')`.
   - **Resolution (B1):** **Yes — implemented as step 3b** in Edge Function. Plan 04-05 Task 2 includes the literal check `if (!input.curriculo_url.startsWith(\`${user.id}/\`))` returning `VALIDATION` error_code with `field: 'curriculo_url'`. Mitigates T-04-04 + T-04-11b. Acceptance grep in Plan 04-05 Task 2 confirms `input.curriculo_url.startsWith` is present in the EF source.

4. **Should existing `useCreateCandidatura` (in `useCandidaturas.ts`) be deprecated in favor of new `useSubmitCandidatura` calling the EF?**
   - What we know: `useCreateCandidatura` calls `candidaturasService.createCandidatura` directly (no EF).
   - What's unclear: Will it still be used? Or is it dead-code post-Phase-4?
   - Recommendation: Add `@deprecated` JSDoc to `useCreateCandidatura` + `createCandidatura`. Don't delete in Phase 4 (Phase 6 RH may need direct path); revisit deletion in Phase 5/6.
   - **Resolution (B1):** **Preserve, do not deprecate in Phase 4.** Plan 04-05 Task 3 adds `submitCandidaturaWithRespostas` ALONGSIDE the existing `createCandidatura` (acceptance criterion explicitly preserves `createCandidatura` per PATTERNS L1020-1022). No `@deprecated` JSDoc added — the legacy path may still be used by Phase 6 RH-side code. Revisit deletion decision in Phase 6 planning.

5. **Should the deletion of `VagasPage.tsx` (D-18) include also removing the import from any `App.tsx` or default-route fallback?**
   - What we know: Already grep'd — only consumer is the orphan file itself per CONTEXT.md.
   - What's unclear: Is `devNavigationPages` still referencing? Yes — Phase 4 should also remove dev menu entries that don't apply.
   - Recommendation: Wave 0 audit — `grep -rn "VagasPage" src/` should return 0 outside of `routes.tsx` (where the import is) AND `devNavigationPages.tsx`. Both removed in same commit.
   - **Resolution (B1):** **Yes — full audit + cleanup in same commit.** Plan 04-02 (routes + vagasService.getVagaBySlug + isUuid + VagasPage deletion) Task X handles `routes.tsx` removal AND `devNavigationPages.tsx` removal in a single commit. Acceptance: `grep -rn "VagasPage" src/` returns 0 lines after Plan 04-02 lands.

6. **Should we add a Vitest test for the slug trigger SQL (e.g., via `supabase db reset` + insert + assert)?**
   - What we know: SQL trigger logic isn't covered by Vitest (which is JS only).
   - What's unclear: Add a one-shot smoke script in `scripts/smoke-vaga-slug.sh` that inserts/asserts/cleans up?
   - Recommendation: Yes, but as a Wave 0 deliverable separate from Vitest — document the smoke commands in `04-VALIDATION.md` "DB smoke" section.
   - **Resolution (B1):** **Yes — captured as Plan 04-01 Task 5 SQL smoke checkpoint** (not a separate `scripts/smoke-vaga-slug.sh` file). The checkpoint includes inline `psql`/Supabase Studio queries to: (a) insert two rows with the same `titulo`, (b) assert their slugs differ (`-2` suffix), (c) cleanup. The same checkpoint also runs smokes for the bucket policies, the RPC, and the UNIQUE constraint. Documented in `.planning/phases/04-vagas-candidatura/04-VALIDATION.md` "Manual-Only Verifications" table. No separate shell script created — the planner-proposed `scripts/smoke-vaga-slug.sh` was rejected to keep smoke discipline inline with the migration checkpoint that owns the SQL.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Edge Function deploy + types regen | ✓ | (project standard) | — |
| Postgres `unaccent` extension | slugify accent stripping | ✓ (Supabase Pro default) | — | translate() chain |
| Postgres `pgcrypto` extension | UUID generation in RPC dedup fallback | ✓ (Supabase Pro default — verified Phase 2 02-06) | — | gen_random_uuid() native (Postgres 13+) — actually this works without pgcrypto |
| Node.js 18+ | Vite + Vitest + Playwright | ✓ | — | — |
| Vitest 4.x | Unit tests | ✓ (in package.json) | 4.0.7 | — |
| Playwright | E2E | ✓ (existing config) | — | — |
| Supabase Storage hosted | CV bucket | ✓ (Supabase Pro) | — | — |
| n8n.cloud webhook URL | Notification fire-and-forget | ✓ (existing in candidaturasService) | — | Webhook failure is non-blocking; candidatura still succeeds |
| Supabase Custom Access Token Hook | role claim in JWT for storage RLS | ✓ (Phase 1 FOUND-03) | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all required infra is in place.

---

## Security Domain (CLAUDE.md `security_enforcement` enabled)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Phase 3 `authStore` + RoleGuard (already in place); EF re-verifies via `supabase.auth.getUser()` |
| V3 Session Management | yes | rememberMeStorage adapter (Phase 3); no Phase 4 changes |
| V4 Access Control | **yes — primary concern for Phase 4** | RLS on `vagas` (anon SELECT WHERE status=ativa), `candidaturas` (own only), `respostas_formulario` (deny direct INSERT, SELECT own via JOIN), Storage `curriculos` bucket (foldername prefix); EF re-verifies candidato_id ↔ user.id |
| V5 Input Validation | **yes — primary concern for Phase 4** | Zod at all boundaries: dynamic candidaturaFormSchema (client + EF), submitCandidaturaSchema (EF), MIME + size at bucket level |
| V6 Cryptography | yes | Use Supabase signed URLs (don't hand-roll); `crypto.randomUUID()` for filenames |
| V7 Error Handling | yes | Structured error_code (Phase 2 contract); never leak DB errors to user |
| V8 Data Protection | yes | Pitfall 7 redaction; LGPD `policy_version` already wired to autorizacoes (Phase 2); CV files private bucket |
| V12 File Handling | **yes — primary concern for Phase 4** | MIME whitelist (`application/pdf`); size cap (5MB); path sanitization (UUID-based); private bucket; signed URL access |
| V13 API Security | yes | Edge Function `--no-verify-jwt` deploy with internal `getUser()` check (matches Phase 2 cadastrar-candidato); CORS pre-flight handled |

### Known Threat Patterns for ATS file-upload + form-submit stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CV upload spoofed user_id | Spoofing | EF verifies `candidato_id` matches `auth.uid()` via candidatos.user_id join |
| Path traversal via filename | Tampering | Generate filename via `crypto.randomUUID()`; never accept user-supplied path |
| MIME spoofing (PDF magic bytes inside .docx wrapper) | Tampering | Bucket-level `allowed_mime_types` enforced server-side; client validation is hint-only |
| File-size DoS | DoS | Bucket `file_size_limit: 5MB`; client pre-validation cuts wasted bandwidth |
| Information disclosure via slug enumeration (titulo guessing) | Info Disclosure | Slugs ARE public by design (D-03 says no anti-enumeration on 404); accept the trade-off — vagas titulos are public marketing |
| Duplicate candidatura race (TOCTOU) | Tampering / Atomicity | UNIQUE constraint + EF maps to DUPLICATE_CANDIDATURA |
| Candidatura on inactive vaga | Tampering | EF verifies `vagas.status = 'ativa'` before accepting (RLS already filters; defensive double-check) |
| respostas_formulario tampering (insert wrong candidatura_id) | Tampering | RLS deny direct INSERT; only RPC inserts; RPC validates candidatura just created |
| Signed URL token leakage in logs/Sentry/Vercel | Info Disclosure | Pitfall 7 grep guard extension (Phase 4) |
| Webhook payload tampering (fake N8N event) | Tampering | Out of Phase 4 scope (HMAC signing → Phase 10) |
| LGPD: CV retention without consent | LGPD compliance | Phase 2 captured `autorizacao_retencao_curriculo` consent; Phase 4 just stores; Phase 5+ adds delete-on-revoke |

---

## Sources

### Primary (HIGH confidence)

- **Supabase docs (Context7 `/supabase/supabase`):** Storage Access Control RLS patterns (`storage.foldername(name)[1]`); Bucket creation with `file_size_limit` + `allowed_mime_types`; `createSignedUrl(path, expiresIn)`; RLS performance best practices (`(select auth.uid())` subquery wrapping). Verified 2026-04-25.
- **React Router v6 docs (Context7 `/websites/reactrouter_6_30_3`):** `useParams<K>()` returns Readonly<Params<K>> — string only, NO regex matchers. Confirms D-01 needs runtime branching not route-level regex. Verified 2026-04-25.
- **React Hook Form docs (Context7 `/react-hook-form/react-hook-form`):** `useForm({ resolver })` accepts dynamic resolvers; pattern of building Zod schema in `useMemo` based on async data is canonical. Verified 2026-04-25.
- **Project codebase inspection:** `database.types.ts` (vagas/candidaturas/perguntas_formulario/respostas_formulario tables + tipo_resposta_pergunta enum verified); existing `vagasService.ts`, `candidaturasService.ts`, `useVagas.ts`, `VagaDetalhePage.tsx`, `pitfall7.grep.test.ts`, `cadastrar-candidato/index.ts`. Direct file reads.
- **Phase 2 02-CONTEXT.md + 02-06 SUMMARY:** error_code/field/message contract; Sonner dedupe pattern; `.call(supabase, ...)` `this`-binding fix.
- **Phase 3 03-CONTEXT.md + 03-07 SUMMARY:** AuthError taxonomy; useFormToast routing; Pitfall 7 redaction in 3 layers.
- **CLAUDE.md (project):** pt-BR domain naming; RLS-everywhere; service_role NEVER in client; query key hierarchy; useFormToast convention.
- **04-CONTEXT.md (this phase):** D-01..D-19 user-locked decisions.

### Secondary (MEDIUM confidence)

- **Postgres `unaccent` availability on Supabase Pro:** General Postgres knowledge + Supabase docs mention. **Action:** Verify via `SELECT * FROM pg_extension WHERE extname='unaccent';` in Wave 0.
- **`tipo_resposta_pergunta` enum exhaustiveness:** From `database.types.ts:2970-2975` — 5 values: `texto_curto | texto_longo | single_choice | multiple_choice | numerico`. If RH adds new types (e.g., `data`), Zod factory will fall through to `z.unknown()` and silently break — exhaustiveness check should `assertNever` the default branch.
- **Vercel waitUntil pattern for fire-and-forget:** Mentioned in research literature; Supabase Edge Functions on Deno may not support it natively. Phase 4 recommendation: standard `fetch().catch()` is sufficient for MVP.

### Tertiary (LOW confidence — needs Wave 0 validation)

- **`storage.foldername(name)[1]` returns array vs scalar:** Supabase docs sometimes inconsistent; verified by Context7 hit but confirm at runtime in Wave 0 smoke.
- **Auth claim path `app_metadata.role` after Phase 3 changes:** Custom Access Token Hook still emits this per Phase 3 03-01 dashboard audit — restated in Wave 0.

---

## Project Constraints (from CLAUDE.md)

| Constraint | How Phase 4 honors it |
|------------|----------------------|
| pt-BR domain naming | All new tables/columns/enum values stay pt-BR (e.g., `submit_candidatura_atomic`, `curriculos` bucket); UI copy in pt-BR |
| Code in en | TS/JS variable names in en (`uploadCV`, `useVagaPerguntas`, `buildCandidaturaSchema`) |
| Components: PascalCase.tsx + named exports | `CVUploadInput.tsx`, `PerguntaInput.tsx`, `VagaResumoCard.tsx` — all named exports |
| Hooks: useCamelCase.ts | `useVagaPerguntas.ts` |
| Services: camelCaseService.ts + custom error classes | `cvUploadService.ts` with `CVUploadServiceError` |
| Features dir: components/, hooks/, services/, schemas/, types/ | Phase 4 adds `schemas/` subfolder under `features/vagas/` |
| Imports: `@/` absolute, relative within feature | All new files use `@/` for cross-feature, relative for intra-feature |
| Enums DB: snake_case pt-BR | Phase 4 reuses existing `status_candidatura`, `etapa_processo`, `tipo_resposta_pergunta` |
| Query keys hierarchical | `vagasKeys.perguntas(vagaId)` extends existing `vagasKeys.all` chain |
| service_role NEVER client-side | EF owns the only service_role; client uses anon |
| RLS in 100% of user-data tables | New `respostas_formulario` policy added; Storage policies on `curriculos` |
| Duplicate check via RPC SECURITY DEFINER | Existing `check_candidato_duplicate` reused; new `submit_candidatura_atomic` follows same pattern |
| DevNavigationMenu gated by `import.meta.env.DEV` | Phase 4 doesn't touch — Phase 1 already gated |
| Linguagem produto: "avaliação comportamental/cognitiva" | Phase 4 only touches triagem perguntas — no psychometric language used |
| Sistema NUNCA rejeita por score | Phase 4 doesn't compute scores; just collects respostas |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `unaccent` extension is pre-installed on Supabase Pro | Slug Trigger SQL | Migration fails; recover by adding `CREATE EXTENSION IF NOT EXISTS unaccent;` before slugify function definition |
| A2 | UNIQUE constraint already exists on `(candidato_id, vaga_id)` in candidaturas table | CAND-04 | Without it, duplicate prevention is impossible. Wave 0 must verify via `\d candidaturas` and add if absent |
| A3 | RLS on `perguntas_formulario` allows authenticated SELECT for any vaga | useVagaPerguntas | If restricted, candidato can't fetch perguntas; broken form. Wave 0 verifies via `pg_policy` query |
| A4 | RLS on `respostas_formulario` allows candidato SELECT own (JOIN through candidaturas) | Profile (Phase 5) reads | Phase 4 doesn't read respostas; Phase 5 might. Defer verification |
| A5 | Existing `_shared/constants.ts` is the right place for new POLICY_VERSION-like constants | EF schemas extension | Low — file structure is established |
| A6 | The Edge Function `submit-candidatura` deploys cleanly with `--no-verify-jwt` (Phase 2 pattern) | EF deployment | Low — proven pattern |
| A7 | Custom Access Token Hook still emits `app_metadata.role` post-Phase 3 | Storage RLS role check | Verified in Phase 3 03-01 dashboard audit; Phase 4 inherits |
| A8 | `gen_random_uuid()` is available without `pgcrypto` (Postgres 13+) | Slug trigger fallback | Project on Postgres 15+ (Supabase default) — safe |
| A9 | Webhook URL `https://fernandocosta.app.n8n.cloud/webhook/nova-candidatura` accepts new payload shape | EF webhook | Existing payload from `candidaturasService` is more verbose than minimum I propose; n8n will silently ignore unknown fields. SAFE |
| A10 | Replacing `VagaDetalhePage` confirmation modal (per D-05) doesn't break other consumers | VAGA-03 patch | Need grep to verify no other component pops the same modal — will check in Wave 0 |
| A11 | `descricao_curta` is meaningfully populated by RH for existing vagas | VAGA-02 PATCH | If empty, fallback to "(sem descrição)"; not a blocker |
| A12 | Path schema amendment from `{candidato_id}/...` to `{auth.uid()}/...` will be approved by user | Storage RLS | Document in PLAN.md / get user OK in CONTEXT.md amendment |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps verified in package.json + npm registry
- Architecture: HIGH — patterns derived from existing Phase 1/2/3 code and Supabase official docs
- Pitfalls: HIGH — most are documented Phase 2/3 learnings + verified Postgres/Supabase docs
- Slug trigger SQL: MEDIUM-HIGH — pattern is canonical Postgres; needs Wave 0 smoke for `unaccent` availability
- Storage RLS SQL: HIGH — directly from Supabase docs via Context7; needs Wave 0 smoke for JWT path
- Dynamic Zod factory: HIGH — pattern is standard; needs Wave 0 unit test for permite_outros conditional
- Edge Function: HIGH — mirrors proven `cadastrar-candidato` pattern

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days; stable foundation, no fast-moving deps)
