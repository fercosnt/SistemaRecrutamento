# Phase 04: Vagas + Candidatura — Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 17 (3 PATCH, 1 REWRITE, 12 CREATE, 1 DELETE)
**Analogs found:** 14 / 17 (3 sem analogo direto: storage bucket migration, Postgres trigger, atomic submit RPC — RESEARCH.md fornece skeletons completos)

---

## File Classification

| New/Modified File | Operation | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|-----------|------|-----------|----------------|---------------|
| `src/features/vagas/hooks/useVagaPerguntas.ts` | CREATE | hook (TanStack Query) | request-response (read-only Postgres) | `src/features/vagas/hooks/useVagas.ts` (useVaga) | exact |
| `src/features/vagas/services/cvUploadService.ts` | CREATE | service (Storage wrapper) | file-I/O (upload + signed URL) | `src/features/vagas/services/vagasService.ts` (error class shape only) + RESEARCH.md §cvUploadService.ts API surface | partial (NEW data flow) |
| `src/features/vagas/schemas/candidaturaFormSchema.ts` | CREATE | schema (Zod factory) | transform (perguntas → schema) | `src/features/auth/schemas/loginSchema.ts` (shape) + RESEARCH.md §Dynamic Zod Factory | partial (DYNAMIC factory is novel) |
| `src/features/vagas/services/__tests__/cvUploadService.test.ts` | CREATE | test (Vitest) | mock-driven | `src/features/cadastro/services/__tests__/cadastroService.test.ts` | exact |
| `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` | CREATE | test (Vitest + RQ wrapper) | hook test | NONE (no existing hook __tests__ dir) — RESEARCH.md §Test Plan only | no analog (use RESEARCH skeleton) |
| `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` | CREATE | test (Vitest) | schema validation | `src/features/auth/schemas/__tests__/redefinirSenhaSchema.test.ts` | exact |
| `supabase/functions/submit-candidatura/index.ts` | CREATE | edge function (Deno) | request-response (RPC + webhook fire-and-forget) | `supabase/functions/cadastrar-candidato/index.ts` | exact |
| `supabase/functions/_shared/constants.ts` | PATCH | shared constants | n/a | `supabase/functions/_shared/constants.ts` (POLICY_VERSION) — extend with new error_code union | exact |
| `supabase/functions/_shared/schemas.ts` | PATCH | shared Zod schemas | transform | `supabase/functions/_shared/schemas.ts` (cadastroCandidatoSchema) — add `submitCandidaturaSchema` + `SubmitCandidaturaErrorCode` | exact |
| `supabase/migrations/20260425000001_vagas_slug_trigger.sql` | CREATE | DB migration (function + trigger) | event-driven (BEFORE INSERT) | `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql` (function-with-grants pattern only — NO trigger precedent in repo) | partial (no trigger precedent — see RESEARCH.md §Slug Trigger SQL) |
| `supabase/migrations/20260425000002_curriculos_bucket.sql` | CREATE | DB migration (storage bucket + RLS) | n/a | `supabase/migrations/20260420000001_rls_anon_to_rpc.sql` (RLS policy idempotent shape only — NO storage precedent) | no analog (use RESEARCH §Storage RLS SQL) |
| `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` | CREATE | DB migration (SECURITY DEFINER fn) | request-response | `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql` | exact |
| `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` | CREATE | DB migration (UNIQUE constraint) | n/a | `supabase/migrations/20260420000001_rls_anon_to_rpc.sql` (idempotent BEGIN/COMMIT shape) | partial |
| `e2e/vagas-browse.spec.ts` | CREATE | E2E (Playwright) | request-response | `e2e/login-flow.spec.ts` + existing `e2e/job-application-flow.spec.ts` | exact |
| `e2e/candidatura-submit.spec.ts` | CREATE | E2E (Playwright) | file-I/O + form-submit | `e2e/cadastro-flow.spec.ts` (multi-section form pattern) + existing `e2e/job-application-flow.spec.ts` | exact |
| `src/components/pages/FormularioCandidaturaPage.tsx` | REWRITE | page (RHF + Zod) | request-response + file-I/O | `src/components/pages/LoginCandidatoPage.tsx` (RHF + AuthError routing + useFormToast) + `src/features/cadastro/components/CadastroMultiStepForm.tsx` (FormProvider + RHF wiring) | exact |
| `src/components/pages/VagaDetalhePage.tsx` | PATCH | page (route param + 404 state) | request-response | itself + `src/components/pages/VagaDetalhePage.tsx:39-45` (useParams pattern) | exact (self-patch) |
| `src/router/routes.tsx` | PATCH | router config | n/a | `src/router/routes.tsx:78-85` (existing `/vagas/:id` definition) | exact |
| `src/features/vagas/services/vagasService.ts` | PATCH | service | request-response | `src/features/vagas/services/vagasService.ts:316-382` (`getVagaById`) | exact (self-extension) |
| `src/features/vagas/services/candidaturasService.ts` | PATCH | service | event-driven (EF invoke) | `src/features/vagas/services/candidaturasService.ts:496-636` (`createCandidatura`) + `src/features/cadastro/services/cadastroService.ts:168-279` (EF invoke pattern) | exact |
| `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` | PATCH | test (grep guard) | n/a | itself (lines 33-41 PHASE_3_AUTH_PATHS) — extend with PHASE_4_VAGAS_PATHS | exact (self-extension) |
| `src/components/pages/VagasPage.tsx` | DELETE | orphan (153 LoC mocks) | n/a | n/a (delete only — D-18) | n/a |

---

## Pattern Assignments

### `src/features/vagas/hooks/useVagaPerguntas.ts` (hook, request-response)

**Analog:** `src/features/vagas/hooks/useVagas.ts` lines 117-132 (`useVaga`) and lines 36-49 (vagasKeys hierarchy)

**Imports + query-key extension** (copy verbatim, then add `perguntas` branch):
```typescript
// useVagas.ts:12-26
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
  listVagas,
  getVagaById,
  checkIfCandidatoApplied,
} from '../services/vagasService'
import type {
  Vaga,
  VagasFilters,
  VagasOrderBy,
  PaginationParams,
  ListVagasResponse,
  GetVagaResponse,
} from '../types/vagasTypes'

// useVagas.ts:36-49 — vagasKeys hierarchy
export const vagasKeys = {
  all: ['vagas'] as const,
  lists: () => [...vagasKeys.all, 'list'] as const,
  list: (...) => [...] as const,
  details: () => [...vagasKeys.all, 'detail'] as const,
  detail: (id: string, candidatoId?: string) =>
    [...vagasKeys.details(), id, candidatoId] as const,
  hasApplied: (candidatoId: string, vagaId: string) =>
    [...vagasKeys.all, 'hasApplied', candidatoId, vagaId] as const,
}
```

**Core hook pattern** (useVagas.ts:117-132 — copy enabled + retry + staleTime conventions):
```typescript
export function useVaga(
  vagaId: string | null | undefined,
  options?: Omit<UseQueryOptions<GetVagaResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const candidato = useAuthStore((state) => state.candidato)
  return useQuery({
    queryKey: vagasKeys.detail(vagaId || '', candidato?.id),
    queryFn: () => getVagaById(vagaId!, candidato?.id),
    enabled: !!vagaId,                  // gate on truthy id
    staleTime: 2 * 60 * 1000,           // ← perguntas use 5min (RESEARCH.md L1665)
    gcTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  })
}
```

**What to copy verbatim:**
- Import block layout (`useQuery` + types).
- `vagasKeys` extension shape: `perguntas: (vagaId: string) => [...vagasKeys.all, 'perguntas', vagaId] as const`.
- `enabled: !!vagaId`, `retry: 2`, options spread.

**What to adapt (per RESEARCH.md §useVagaPerguntas Hook Spec, L1611-1671):**
- Query key path is `vagasKeys.perguntas(vagaId)`.
- queryFn calls `supabase.from('perguntas_formulario').select('*').eq('vaga_id', vagaId!).is('deleted_at', null).order('ordem', { ascending: true })`.
- staleTime = `5 * 60 * 1000` (perguntas rarely change once vaga published).
- gcTime = `10 * 60 * 1000`.
- Return type: `PerguntaFormulario[]` (from `../schemas/candidaturaFormSchema`).
- Empty array (`data === []`) is valid per D-14 (vaga sem perguntas → form mostra apenas Sections 1+2).

**Pitfalls observed in analog:**
- `enriquecerVaga` in `vagasService.ts:65-116` causes N+1 (3 extra count queries per vaga). D-17 explicitly DEFERS this optimization. **Do not** import that pattern into the perguntas hook — perguntas are a single SELECT, no enrichment needed.
- `useVagasWithStore` (useVagas.ts:178-185) uses `require()` for circular import dodge — **do not** copy this anti-pattern.

---

### `src/features/vagas/services/cvUploadService.ts` (service, file-I/O)

**Analog (error class shape only):** `src/features/vagas/services/vagasService.ts:28-42` (`VagasServiceError`)

**No prior Storage usage in repo** — this is the first Supabase Storage wrapper. **Use RESEARCH.md §`cvUploadService.ts` API surface (L1472-1599) as canonical reference.**

**Error class shape to mirror** (vagasService.ts:28-42):
```typescript
export class VagasServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown
  ) {
    super(message)
    this.name = 'VagasServiceError'
  }
}
```

**Imports verbatim:**
```typescript
import { supabase } from '@/lib/supabase/client'
```

**What to adapt from RESEARCH.md (L1479-1494):**
- Class name `CVUploadServiceError`.
- Error code union: `FILE_TOO_LARGE | INVALID_MIME | UPLOAD_FAILED | STORAGE_QUOTA | NETWORK_ERROR | UNAUTHORIZED`.
- Constants `MAX_FILE_SIZE = 5 * 1024 * 1024`, `ALLOWED_MIME = 'application/pdf'` (export both).
- Three exports: `validateCV(file)`, `uploadCV(file, authUid)`, `getSignedUrl(path)`, `removeCV(path)`.
- Path schema `${authUid}/${uuid}.pdf` per RESEARCH §Storage RLS L967-971 amendment (NOT `${candidato_id}/...` — eliminates RLS join).
- Error mapping (RESEARCH L1547-1563): match `payload too large`, `mime`, `quota`, `jwt|unauthorized` substrings → typed error code.

**Pitfall 7 redaction (mandatory):**
- Never log `file.name` (PII), the signed URL, or any token. Log only `{ size, mime, hasFile }` shape, copying the redaction discipline from `authService.ts:64-69`:
```typescript
// authService.ts:64-69 — Pitfall 7 redacted log shape
console.log('[AUTH] signIn invoked', {
  email: input.email,
  rememberMe: input.rememberMe,
  hasPassword: Boolean(input.senha),
})
```
- Apply same shape to cvUploadService: `console.log('[CV] upload invoked', { sizeKb: Math.round(file.size/1024), mime: file.type })` — file name OUT.

**Pitfalls observed:**
- `vagasService.ts:65-116` shows `enriquecerVaga` returning a single `Vaga`. cvUploadService should NOT enrich — return the raw `UploadCVResult` shape from RESEARCH L1499-1504.
- Vagasservice's catch-all wraps unknown errors as `'NETWORK_ERROR'` (line 296-300). Mirror this default in cvUploadService.

---

### `src/features/vagas/schemas/candidaturaFormSchema.ts` (schema, transform)

**Analog:** `src/features/auth/schemas/loginSchema.ts` (shape, lines 21-31) + RESEARCH.md §Dynamic Zod Factory L1256-1407

**Imports + module header to copy from loginSchema.ts:21-31:**
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  rememberMe: z.boolean().optional().default(false),
})

export type LoginFormData = z.infer<typeof loginSchema>
```

**What to adapt (canonical source = RESEARCH.md L1256-1383):**
- Import `Database` types from generated file: `import type { Database } from '../../../../database.types'`.
- Export `PerguntaFormulario` and `TipoResposta` types as type aliases on the Database tables/enums (RESEARCH L1274-1278).
- Implement `zodForType(p: PerguntaFormulario): ZodType<unknown>` — switch on `tipo_resposta` enum (`texto_curto | texto_longo | numerico | single_choice | multiple_choice`). RESEARCH L1286-1346 has the full implementation.
- Implement `buildCandidaturaSchema(perguntas: PerguntaFormulario[])` factory. Returns `z.object({ curriculo: ..., respostas: ..., respostas_outros: ... })`. RESEARCH L1359-1380.
- Export `CandidaturaFormData = z.infer<ReturnType<typeof buildCandidaturaSchema>>`.

**Pt-BR error messages** (mandatory per CLAUDE.md):
- `'Resposta obrigatória'`, `'Máximo {N} caracteres'`, `'Mínimo {N}'`, `'Selecione pelo menos uma opção'`, `'Currículo obrigatório'`, `'Currículo deve ter no máximo 5 MB'`, `'Especifique'`.

**Pitfalls observed:**
- `loginSchema.ts:28` uses `z.boolean().optional().default(false)` which produces input/output type mismatch — RHF resolver requires `as Resolver<LoginFormData>` cast (LoginCandidatoPage.tsx:74). The dynamic factory likely faces similar issues with optional perguntas — be ready to cast `zodResolver(schema) as Resolver<CandidaturaFormData>` in the page.
- `useMemo` rebuild of schema fires when `perguntas` array reference changes. RESEARCH L1407 warns: render skeleton until perguntas defined; mount form only when `perguntas !== undefined`.

---

### `src/features/vagas/services/__tests__/cvUploadService.test.ts` (test, mock-driven)

**Analog:** `src/features/cadastro/services/__tests__/cadastroService.test.ts` lines 1-60 (file header + supabase mock setup)

**Mock setup pattern to copy verbatim** (cadastroService.test.ts:29-39):
```typescript
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: {
      signInWithPassword: vi.fn(),
      admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) },
    },
  },
}))
```

**Adapt for Storage:**
```typescript
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
  },
}))
```

**Test scenarios** (per RESEARCH.md L1765, 10 cases):
1. `validateCV` accepts valid 4MB PDF.
2. `validateCV` throws FILE_TOO_LARGE on 6MB.
3. `validateCV` throws INVALID_MIME on `.docx`.
4. `uploadCV` happy path with mock storage.
5. Maps `payload too large` → FILE_TOO_LARGE.
6. Maps `mime` substring → INVALID_MIME.
7. Maps `quota` substring → STORAGE_QUOTA.
8. Maps `jwt|unauthorized` → UNAUTHORIZED.
9. `getSignedUrl` happy + error.
10. `removeCV` happy + error.

**Pitfall 7 assertion** (copy from cadastroService.test.ts area covering "Pitfall 7: password never appears in console.* calls"): scan all `console.*` mock calls and assert no leak of `file.name`, signed URL substring, or token.

---

### `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` (test, hook)

**No prior analog — see RESEARCH.md §Test Plan L1767 for canonical test list.**

The repo has no `src/features/*/hooks/__tests__/` directory yet. Use the standard `@testing-library/react` + TanStack Query `QueryClientProvider` wrapper pattern. Reference RESEARCH L1767:
- (1) disabled when vagaId null;
- (2) returns ordered array;
- (3) returns [] for vaga with no perguntas;
- (4) error propagation.

Mock supabase client similarly to cvUploadService.test.ts above. Wrap `renderHook` with a fresh `QueryClient` per test (no retry, no caching) for isolation.

---

### `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` (test, schema)

**Analog:** `src/features/auth/schemas/__tests__/redefinirSenhaSchema.test.ts` lines 1-80

**Test structure to copy verbatim** (redefinirSenhaSchema.test.ts:1-22):
```typescript
import { describe, it, expect } from 'vitest'
import { passwordSchema } from '../passwordSchema'
import { redefinirSenhaSchema } from '../redefinirSenhaSchema'

describe('passwordSchema (Wave 1, Plan 03-02)', () => {
  it('T3.1: rejects < 8 chars with pt-BR min message', () => {
    const result = passwordSchema.safeParse('Abcdef1')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Senha deve ter no mínimo 8 caracteres'
      )
    }
  })
  // ...
})
```

**Adapt** for `zodForType` and `buildCandidaturaSchema` — 11 cases per RESEARCH.md L1766:
1. `texto_curto` obrigatoria empty fails.
2. `texto_curto` with `limite_caracteres`.
3. `texto_longo` same.
4. `numerico` with `valor_minimo`/`valor_maximo` bounds.
5. `numerico` optional.
6. `single_choice` from `opcoes`.
7. `single_choice` with `permite_outros` relaxes to `z.string`.
8. `multiple_choice` obrigatoria min 1.
9. `multiple_choice` empty allowed when not obrigatoria.
10. `buildCandidaturaSchema` with empty perguntas list returns object with curriculo only.
11. `buildCandidaturaSchema` with mixed perguntas validates real input.

**Fixture pattern:** Build minimal `PerguntaFormulario` objects with only the fields under test; cast `as PerguntaFormulario` to bypass full Database type compliance (mirrors cadastroService.test.ts:72-80 `as unknown as CandidatoFormData` discipline).

---

### `supabase/functions/submit-candidatura/index.ts` (edge function, request-response)

**Analog:** `supabase/functions/cadastrar-candidato/index.ts` (entire file, especially lines 38-130 + 144-192)

**Imports + CORS setup** (cadastrar-candidato/index.ts:38-72 — copy verbatim, adjust schema imports):
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { POLICY_VERSION } from '../_shared/constants.ts'
import {
  cadastroCandidatoSchema,
  zodPathToFieldName,
  type CadastroCandidatoInput,
  type CadastroErrorCode,
} from '../_shared/schemas.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(
  code: CadastroErrorCode,
  message: string,
  field?: string,
  status = 400,
): Response {
  const body: Record<string, unknown> = {
    ok: false,
    error_code: code,
    message,
    error: message,   // legacy alias — DROP for submit-candidatura (no legacy clients)
  }
  if (field !== undefined) body.field = field
  return jsonResponse(body, status)
}
```

**Handler structure** (cadastrar-candidato/index.ts:102-130 — Parse + validate + service-role client):
```typescript
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return errorResponse('SERVER_ERROR', 'Método não suportado', undefined, 405)
  }

  let input: CadastroCandidatoInput
  try {
    const rawBody = await req.json()
    const parsed = cadastroCandidatoSchema.safeParse(rawBody)
    if (!parsed.success) {
      const firstIssue = parsed.error.errors[0]
      const message = firstIssue?.message || 'Dados de cadastro inválidos'
      const field = zodPathToFieldName(firstIssue?.path)
      return errorResponse('VALIDATION', message, field)
    }
    input = parsed.data
  } catch (_err) {
    return errorResponse('VALIDATION', 'Corpo da requisição inválido (JSON malformado)')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) { /* SERVER_ERROR */ }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  // ... business logic
})
```

**What to copy verbatim:**
- `corsHeaders`, `jsonResponse`, `errorResponse` helpers (drop the `error` legacy alias for the new function — no Phase 2 legacy clients).
- OPTIONS preflight + method-guard.
- Zod safeParse + first-issue field extraction via `zodPathToFieldName`.
- Service-role client construction.
- `console.error('[submit-candidatura] ...', error?.message)` log shape (NEVER log full error object — copy from line 135, 185, 211).

**What to adapt (canonical source = RESEARCH.md §Edge Function TypeScript skeleton, L1106-1241):**
- Import `submitCandidaturaSchema` + `SubmitCandidaturaErrorCode` from `_shared/schemas.ts` (PATCH that file — see next entry).
- Add user-context auth verification (RESEARCH L1160-1188): build a second `supabaseUser` client with `Authorization: req.headers.get('Authorization')`, call `auth.getUser()`, then verify `body.candidato_id` matches `candidatos.user_id` for `user.id`. Return UNAUTHORIZED 401/403 on mismatch.
- Call `supabaseAdmin.rpc('submit_candidatura_atomic', { p_candidato_id, p_vaga_id, p_curriculo_url, p_curriculo_nome, p_curriculo_size, p_respostas })`.
- Map RPC error codes per RESEARCH L1203-1217: `23505` (unique_violation) → `DUPLICATE_CANDIDATURA`; `23503` (FK violation) → `VALIDATION` ("Vaga ou pergunta não encontrada"); other → `SERVER_ERROR`.
- Fire-and-forget N8N webhook AFTER COMMIT (RESEARCH L1226-1234) — `fetch(...).catch(...)` — do NOT await.

**Pitfalls observed in analog (cadastrar-candidato):**
- Lines 184-192: rollback `auth.admin.deleteUser` on any post-createUser failure. **submit-candidatura does NOT need rollback** — RPC is atomic; failures rollback automatically inside Postgres txn.
- Lines 247-284: best-effort inserts (disponibilidade, autorizacoes) with `console.warn` instead of error. **submit-candidatura has no best-effort steps** — every insert is critical (inside RPC).
- Line 92 (legacy `error` field alias): described as "drop in Phase 3"; for submit-candidatura, **drop from day 1**. Plan should explicitly remove the alias.

---

### `supabase/functions/_shared/constants.ts` (constants — PATCH)

**Analog:** itself — `supabase/functions/_shared/constants.ts:8` (`POLICY_VERSION`).

**Current content (preserve verbatim):**
```typescript
// _shared/constants.ts:1-9
export const POLICY_VERSION = 'v1.0-2026-04' as const
```

**What to add (per RESEARCH.md L1243-1252):**
```typescript
export type SubmitCandidaturaErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'DUPLICATE_CANDIDATURA'
  | 'STORAGE_ERROR'
  | 'SERVER_ERROR'
```

Decision (planner): keep type union here OR in `_shared/schemas.ts` next to `CadastroErrorCode` (lines 154-158 of schemas.ts). **RECOMMENDED:** keep next to `submitCandidaturaSchema` in `schemas.ts` for cohesion (mirrors `CadastroErrorCode` placement).

---

### `supabase/functions/_shared/schemas.ts` (Zod schemas — PATCH)

**Analog:** itself — lines 115-148 (`cadastroCandidatoSchema` + `CadastroCandidatoInput`).

**Pattern to mirror** (schemas.ts:115-148):
```typescript
export const cadastroCandidatoSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').toLowerCase().trim(),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128, 'Senha muito longa'),
  // ...
})

export type CadastroCandidatoInput = z.infer<typeof cadastroCandidatoSchema>

// Phase 2 — Structured error contract
export type CadastroErrorCode =
  | 'EMAIL_EXISTS'
  | 'CPF_EXISTS'
  | 'VALIDATION'
  | 'SERVER_ERROR'
```

**What to add (per RESEARCH.md §Edge Function TypeScript skeleton):**
```typescript
export const submitCandidaturaSchema = z.object({
  candidato_id: z.string().uuid('candidato_id inválido'),
  vaga_id: z.string().uuid('vaga_id inválido'),
  curriculo_url: z.string().min(1, 'curriculo_url obrigatório'),
  curriculo_nome: z.string().min(1, 'curriculo_nome obrigatório'),
  curriculo_size: z.number().int().positive().max(5_242_880, 'curriculo excede 5 MB'),
  respostas: z.array(z.object({
    pergunta_id: z.string().uuid(),
    resposta_texto: z.string().optional().nullable(),
    resposta_numerica: z.number().optional().nullable(),
    resposta_opcoes: z.unknown().optional().nullable(),
  })).default([]),
})

export type SubmitCandidaturaInput = z.infer<typeof submitCandidaturaSchema>

export type SubmitCandidaturaErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'DUPLICATE_CANDIDATURA'
  | 'STORAGE_ERROR'
  | 'SERVER_ERROR'
```

**What to copy verbatim from analog:** the `import { z } from 'https://esm.sh/zod@3'` import (line 25); pt-BR error messages style.

**Pitfall observed:** `validateCPF` is inlined in this file because Edge Functions cannot import from `src/`. The new `submitCandidaturaSchema` does not need validators that live in `src/` — it only needs UUID + size + jsonb shape.

---

### `supabase/migrations/20260425000001_vagas_slug_trigger.sql` (DB migration — function + trigger)

**No prior trigger precedent in repo.** RPC function precedent: `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql`.

**Header + BEGIN/COMMIT shape to copy** (20260420000003_check_candidato_duplicate_rpc.sql:1-21):
```sql
-- =============================================================================
-- Migration: <description>
-- Date: 2026-04-25
-- Phase: 04 (Vagas + Candidatura)
-- Requirements: VAGA-02 (D-02)
-- =============================================================================
BEGIN;
-- ... function defs ...
COMMIT;
```

**Function-with-grants pattern** (20260420000003_check_candidato_duplicate_rpc.sql:23-74):
```sql
CREATE OR REPLACE FUNCTION public.check_candidato_duplicate(
  p_cpf   text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cpf_clean   text;
  -- ...
BEGIN
  -- ...
END;
$$;

COMMENT ON FUNCTION public.check_candidato_duplicate(text, text) IS
  '...';

REVOKE ALL ON FUNCTION public.check_candidato_duplicate(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate(text, text) TO anon, authenticated;
```

**What to copy verbatim:**
- `BEGIN; ... COMMIT;` wrapping.
- `LANGUAGE plpgsql` + `SET search_path = ''` (security best practice).
- `REVOKE ALL ... FROM PUBLIC` then explicit `GRANT EXECUTE TO ...` after each function.
- Module header with date + phase + requirement comment block.

**What to use canonical from RESEARCH.md §Slug Trigger SQL (L658-822):**
- Three functions: `slugify(text)` IMMUTABLE, `generate_unique_vaga_slug(text, uuid)`, `vagas_set_slug()` (trigger fn).
- `CREATE EXTENSION IF NOT EXISTS unaccent` at top.
- `BEFORE INSERT` trigger only (Pitfall 5 Option A — URL stability > self-updating).
- Backfill UPDATE for existing rows with NULL/empty slug.
- Idempotent UNIQUE INDEX guard via `DO $$ BEGIN IF NOT EXISTS ... END $$`.
- Grants: `slugify` → authenticated + service_role; `generate_unique_vaga_slug` → service_role only (called by trigger fn which runs as table owner anyway).

**Pitfalls observed:**
- The `check_candidato_duplicate` analog is **a single function**. This migration creates **three functions + a trigger + backfill + UNIQUE index** — much larger surface. RESEARCH.md §Pitfall 7 (L444-453) flags trigger collision dedup race; mitigated by bounded loop (1000 attempts → UUID fallback). Plan should call out this edge case in tests.
- No prior migration touches `pg_indexes` for idempotency. The DO/IF NOT EXISTS pattern at RESEARCH L800-811 is the canonical guard.

---

### `supabase/migrations/20260425000002_curriculos_bucket.sql` (DB migration — bucket + RLS)

**No prior storage migration in repo.** Closest: `20260420000001_rls_anon_to_rpc.sql` for the RLS DROP POLICY IF EXISTS idempotent shape (lines 31-50).

**Header + idempotent DROP shape** (20260420000001_rls_anon_to_rpc.sql:31-44):
```sql
BEGIN;

-- Defensive DROPs for policy names commonly used in the prod era.
-- Each is wrapped in IF EXISTS so missing policies are silently skipped.
DROP POLICY IF EXISTS "candidatos_anon_select"            ON public.candidatos;
DROP POLICY IF EXISTS "candidatos_public_select"          ON public.candidatos;
-- ...
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;

COMMIT;
```

**No prior analog — see RESEARCH.md §Storage RLS SQL (L847-986) for canonical implementation.** Key elements:
- `INSERT INTO storage.buckets (...) VALUES ('curriculos', 'curriculos', false, 5242880, ARRAY['application/pdf']) ON CONFLICT (id) DO UPDATE SET ...`.
- 4 policies on `storage.objects`: `curriculos_select_own_or_rh`, `curriculos_insert_own`, `curriculos_update_own`, `curriculos_delete_own`.
- Path check: `(storage.foldername(name))[1] = (select auth.uid()::text)` (per Pitfall 8 — wrap in `select` for RLS perf cache).
- Role check: `(select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador')`.

**What to copy verbatim from rls_anon_to_rpc.sql:**
- `DROP POLICY IF EXISTS` per policy name (idempotency for re-runs).
- `BEGIN; ... COMMIT;` wrapping.

**Pitfalls observed (RESEARCH §Pitfall 8-9, L454-473):**
- DO NOT use `auth.uid()::text` directly — wrap as `(select auth.uid()::text)` for query plan caching.
- Role lives in `app_metadata.role` (Phase 1 Custom Access Token Hook), NOT `user_metadata`. RLS policy MUST use `#>> '{app_metadata,role}'` path.
- D-10 says path is `{candidato_id}/{uuid}.pdf`; RESEARCH L967-971 RECOMMENDS amending to `{auth.uid()}/{uuid}.pdf` to eliminate RLS join. **Plan must either follow the amendment or implement the SECURITY DEFINER `current_candidato_id()` helper RPC.** Most likely the planner picks the amendment.

---

### `supabase/migrations/20260425000003_submit_candidatura_rpc.sql` (DB migration — atomic RPC)

**Analog:** `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql` (entire file)

**SECURITY DEFINER function-with-grants pattern** (20260420000003_check_candidato_duplicate_rpc.sql:23-74) — same as Slug Trigger entry above. Copy verbatim:
- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `SET search_path = ''`
- `RETURNS jsonb`
- `REVOKE ALL ... FROM PUBLIC` then `GRANT EXECUTE ... TO service_role` (this RPC is service-role-only because Edge Function calls it; never invoked from client).

**What to use canonical from RESEARCH.md §RPC SQL (L1011-1104):**
- Function signature: `submit_candidatura_atomic(p_candidato_id uuid, p_vaga_id uuid, p_curriculo_url text, p_curriculo_nome text, p_curriculo_size int, p_respostas jsonb) RETURNS jsonb`.
- Body: INSERT into `candidaturas` (returning id); FOR loop over `jsonb_array_elements(p_respostas)` to INSERT into `respostas_formulario`.
- Returns `jsonb_build_object('candidatura_id', v_candidatura_id, 'respostas_count', ...)`.
- `GRANT EXECUTE ... TO service_role` (NOT authenticated — this RPC is server-only).

**What to adapt:** explicit defaults for `status = 'aguardando_resposta'::public.status_candidatura` and `etapa_atual = 'triagem'::public.etapa_processo` (don't rely on column defaults — RESEARCH L1040).

**Pitfalls observed:**
- `check_candidato_duplicate` grants to `anon, authenticated` (line 74) because the duplicate check runs from client. `submit_candidatura_atomic` MUST grant ONLY to `service_role` — Edge Function uses service-role client.
- Postgres unique violation `23505` is the only error the RPC throws naturally for the duplicate case; the EF maps it to `DUPLICATE_CANDIDATURA`. The migration should add a `CONSTRAINT` comment noting the dependency on the UNIQUE constraint added by migration `20260425000004`.

---

### `supabase/migrations/20260425000004_candidaturas_unique_constraint.sql` (DB migration — UNIQUE)

**Analog (idempotent shape):** `supabase/migrations/20260420000001_rls_anon_to_rpc.sql:31-56` (BEGIN/COMMIT + DO IF EXISTS guards).

**Pattern to copy verbatim:**
```sql
BEGIN;
-- defensive idempotent guard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'candidaturas_candidato_vaga_unique_idx'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX candidaturas_candidato_vaga_unique_idx
             ON public.candidaturas (candidato_id, vaga_id)
             WHERE deleted_at IS NULL';
  END IF;
END $$;
COMMIT;
```

**What to adapt:**
- Index name: `candidaturas_candidato_vaga_unique_idx`.
- Partial index `WHERE deleted_at IS NULL` so soft-deleted candidaturas don't block re-application (mirrors `vagasService.ts:180-185` `deleted_at IS NULL` filter logic).
- Add COMMENT explaining: "Server-side defense for CAND-04 duplicate prevention. Companion to client-side `checkDuplicateApplication` (candidaturasService.ts:148) and Edge Function `submit-candidatura` mapping of code 23505 → DUPLICATE_CANDIDATURA."

**Pitfall observed:**
- `candidaturasService.ts:162-176` already attempts `maybeSingle()` on `(candidato_id, vaga_id)`. If multiple legacy rows exist, `maybeSingle` throws — the migration MUST run AFTER any data cleanup. RESEARCH does not specify; planner should add a "verify zero duplicates exist before applying" precondition step.

---

### `e2e/vagas-browse.spec.ts` (E2E, Playwright)

**Analog:** `e2e/login-flow.spec.ts` lines 1-77 (file structure + helpers) + existing `e2e/job-application-flow.spec.ts` lines 1-60 (TEST_USER + login helper).

**File header to copy verbatim from login-flow.spec.ts:1-23:**
```typescript
/**
 * E2E Tests - Fluxo de Listagem de Vagas (Phase 4 / VAGA-01, VAGA-02)
 * ...
 */
import { test, expect, type Page } from '@playwright/test'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'fernando@beautysmile.com.br',
  password: process.env.TEST_USER_PASSWORD || 'teste123',
}
```

**Helper pattern to copy** (login-flow.spec.ts:34-41):
```typescript
async function fillLoginForm(page: Page, email: string, password: string, rememberMe = false) {
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  if (rememberMe) await page.getByRole('checkbox', { name: /lembrar-me/i }).check()
}
```

**What to copy from job-application-flow.spec.ts:32-60:**
- `login(page, email, password)` helper.
- `gotoVagasPage(page)` helper.

**What to adapt for browse spec (per RESEARCH §Playwright E2E L1779+):**
- Test IDs: `B-J01` (anon visits `/vagas` sees ≥ 1 active vaga), filters interaction, `/vagas/:slug` resolves, 404 state for unknown slug, regex back-compat for UUID URL.
- Use `page.goto('/vagas')` unauthenticated as the entry — no login required.

**Pitfall observed in cadastro-flow.spec.ts:71-76:** unique-email-per-run pattern via `test+${Date.now()}@beautysmile.com.br`. Vagas browse doesn't write data, so this is not needed; but the candidatura submit spec (next entry) DOES need fresh-test-user discipline.

---

### `e2e/candidatura-submit.spec.ts` (E2E, Playwright + file upload)

**Analog:** `e2e/cadastro-flow.spec.ts` lines 1-100 (multi-section form fill helpers) + `e2e/job-application-flow.spec.ts` (login + duplicate-prevention scenarios).

**Imports + structure** (cadastro-flow.spec.ts:1-21):
```typescript
import { test, expect, type Page } from '@playwright/test'
```

**File upload pattern (NEW — no analog in repo):**
```typescript
// New pattern for CV upload. Reference: Playwright FileChooser API.
const fileChooserPromise = page.waitForEvent('filechooser')
await page.getByRole('button', { name: /selecionar arquivo/i }).click()
const fileChooser = await fileChooserPromise
await fileChooser.setFiles({
  name: 'cv-test.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 ... fake pdf content'),
})
```

**Login bootstrap** (job-application-flow.spec.ts:32-40 — copy verbatim):
```typescript
async function login(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  await page.goto('/auth/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/candidato/, { timeout: 10000 })
}
```

**What to adapt (per RESEARCH §Playwright E2E table starting at L1779):**
- Scenarios: happy path submit (CV + perguntas → Edge Function → success toast → redirect to `/candidato/perfil`), file too large rejection, non-PDF rejection, duplicate candidatura blocked with DUPLICATE_CANDIDATURA toast.
- Test data: use existing TEST_USER (no fresh user per run — duplicate spec needs the SAME user to assert duplicate block).

**Pitfalls observed:**
- cadastro-flow.spec.ts:71-76 generates unique email/CPF per run — submit spec should NOT do this for the duplicate-block scenario, but SHOULD use a freshly-created vaga (or fixture-cleared candidaturas table) to allow the happy path.
- job-application-flow.spec.ts is being REWRITTEN per RESEARCH L1777 ("rewrite — existing one is from pre-Phase-1 era"). The new `candidatura-submit.spec.ts` SHOULD subsume some scenarios; planner decides whether to delete the old file entirely.

---

### `src/components/pages/FormularioCandidaturaPage.tsx` (REWRITE, page)

**Multiple analogs:**
1. `src/components/pages/LoginCandidatoPage.tsx` (RHF + AuthError routing + useFormToast pattern).
2. `src/features/cadastro/components/CadastroMultiStepForm.tsx` (FormProvider + RHF wiring + Zod resolver).
3. Existing `src/components/pages/FormularioCandidaturaPage.tsx` (current 620 LoC raw — what NOT to do).

**RHF setup pattern** (LoginCandidatoPage.tsx:63-81 — copy and adapt):
```typescript
const {
  register,
  handleSubmit,
  control,
  getValues,
  formState: { errors, isSubmitting, isValid },
} = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
  mode: 'onBlur',
  defaultValues: { /* ... */ },
})
```

**Service-layer error_code routing** (LoginCandidatoPage.tsx:96-148 — copy switch-case discipline):
```typescript
const onSubmit = async (data: LoginFormData) => {
  setLastError(null)
  try {
    await signIn({ /* ... */ })
    toast.success('Login realizado com sucesso!', { duration: 3000 })
    navigate('/candidato/perfil', { replace: true })
  } catch (err) {
    if (isAuthError(err)) {
      setLastError(err)
      switch (err.code) {
        case 'INVALID_CREDENTIALS': /* ... */ break
        case 'EMAIL_NOT_CONFIRMED': /* ... */ break
        case 'RATE_LIMITED': /* ... */ break
        case 'NETWORK_ERROR': /* ... */ break
        case 'SERVER_ERROR':
          toast.error('Algo deu errado. Tente novamente em alguns instantes.', {
            duration: 6000,
            action: {
              label: 'Tentar novamente',
              onClick: () => { void handleSubmit(onSubmit)() },
            },
          })
          break
        default: toast.error('Erro inesperado. Tente novamente.', { duration: 6000 })
      }
    } else {
      toast.error('Erro inesperado. Tente novamente.', { duration: 6000 })
    }
  }
}
```

**What to adapt:**
- Use `CandidaturasServiceError` (see candidaturasService.ts:39-55) instead of `AuthError`.
- Switch on codes: `DUPLICATE_APPLICATION`, `INVALID_INPUT`, `UPLOAD_FAILED`, `FILE_TOO_LARGE`, `INVALID_MIME`, `NETWORK_ERROR`, `DATABASE_ERROR`, `WEBHOOK_ERROR`.
- Schema: `useMemo(() => buildCandidaturaSchema(perguntas ?? []), [perguntas])` per RESEARCH L1391-1394. Render skeleton until perguntas defined.
- Sections per D-05: (1) Resumo da vaga read-only, (2) Currículo upload, (3) Perguntas dinâmicas (grouped by `bloco` per D-13), (4) Submit. Single max-w-3xl glass card.
- Use `<input type="file" accept="application/pdf">` per D-09 — click-only, no drag-drop.
- BackgroundImage + GlassCard + BeautySmileLogo wrapper (LoginCandidatoPage.tsx:183-200).

**FormProvider for nested children** (CadastroMultiStepForm.tsx:22-23 import — copy if perguntas need their own input components):
```typescript
import { useForm, FormProvider } from 'react-hook-form'
```

**What NOT to copy (existing FormularioCandidaturaPage.tsx anti-patterns):**
- Lines 1-87: `useState` + `useEffect(fetchCandidato)` + raw `supabase.auth.getUser()` + raw `supabase.from('candidatos')`. Replace ALL of this with `useAuthStore((state) => state.candidato)` (LoginCandidatoPage.tsx:42 pattern).
- Line 8: direct `import { notifyCandidatoCriado } from '@/features/cadastro/services/n8nService'` — N8N webhook is fired by the Edge Function (RESEARCH L1226), not the page.
- Lines 11-29: raw `interface FormData` with hardcoded blocks — replace with dynamic `CandidaturaFormData` from the schema.

**Pitfall 7 redaction:**
- Page must NOT `console.log` the candidato object (contains email/celular/CPF) or any signed URL. Mirror LoginCandidatoPage which has zero `console.*` calls (all observability lives in service layer).

---

### `src/components/pages/VagaDetalhePage.tsx` (PATCH, page)

**Analog:** itself — VagaDetalhePage.tsx:39-41 (current useParams).

**Current pattern (line 40 — what to change):**
```typescript
const { id: vagaId } = useParams<{ id: string }>()
```

**What to adapt (D-01):**
```typescript
import { useMemo } from 'react'
// ...
const { identifier } = useParams<{ identifier: string }>()
const isUuidParam = useMemo(() => isUuid(identifier ?? ''), [identifier])
const { data: vagaData, isLoading, error } = isUuidParam
  ? useVaga(identifier)            // existing UUID overload
  : useVagaBySlug(identifier)      // new slug overload (PATCH adds this hook)
```

**404 state component (D-03 — INLINE in same file):**
```typescript
function VagaNotFoundState() {
  const navigate = useNavigate()
  return (
    <div className="...">
      <p>Vaga não encontrada ou não está mais ativa</p>
      <GlassButton onClick={() => navigate('/vagas')}>
        Voltar para vagas
      </GlassButton>
    </div>
  )
}
```

**What to copy verbatim (preserve):**
- VagaDetalhePage.tsx:42-93 (auth store + handlers + share menu) — no changes needed.
- VagaDetalhePage.tsx:39-78 layout structure (BackgroundImage + GlassCard + Loader2).

**Pitfalls observed:**
- D-09 anti-enumeration (D-03 follow-on): the 404 must NOT echo whether the slug existed but was inactive vs never existed. Single error string regardless of cause.
- Existing VagaDetalhePage uses `useCreateCandidatura` mutation directly. Phase 4 Plan must ensure this is replaced by navigation to `/candidato/candidatura/formulario/:vagaSlug` (the rewritten FormularioCandidaturaPage) — the modal-confirm flow at lines 80-93 is being REPLACED by the dedicated form page.

---

### `src/router/routes.tsx` (PATCH, router)

**Analog:** itself — routes.tsx:78-85 (current `/vagas` + `/vagas/:id`).

**Current shape:**
```typescript
{
  path: '/vagas',
  element: <VagasPublicasPage />,
},
{
  path: '/vagas/:id',
  element: <VagaDetalhePage />,
},
```

**What to adapt (D-01 + D-18):**
```typescript
{
  path: '/vagas',
  element: <VagasPublicasPage />,
},
{
  // Single param `identifier` matches both UUID and slug;
  // VagaDetalhePage branches via isUuid() at runtime
  path: '/vagas/:identifier',
  element: <VagaDetalhePage />,
},
```

Also update `/candidato/candidatura/formulario/:vagaId` (line 159) → `/candidato/candidatura/formulario/:vagaSlug` to align with the slug-first convention.

**What to remove:**
- `import { VagasPage } from '../components/pages/VagasPage'` (D-18 — orphan).
- Any `VagasPage` reference in the `routes` array (none currently — already uses `VagasPublicasPage`).

**Pitfall observed:**
- React Router v6 does not support regex on params; param matcher accepts ANY string. Discrimination happens INSIDE the page via `isUuid(identifier)`. Ensure `isUuid` lives at `src/features/vagas/utils/isUuid.ts` (CREATE — small helper, see RESEARCH L1770 for test plan).

---

### `src/features/vagas/services/vagasService.ts` (PATCH, service — add `getVagaBySlug`)

**Analog:** itself — vagasService.ts:316-382 (`getVagaById`).

**Pattern to mirror verbatim** (vagasService.ts:316-382):
```typescript
export async function getVagaById(
  vagaId: string,
  candidatoId?: string
): Promise<GetVagaResponse> {
  try {
    if (!vagaId || vagaId.trim() === '') {
      throw new VagasServiceError('ID da vaga inválido', 'INVALID_INPUT')
    }
    const { data, error } = await supabase
      .from('vagas')
      .select('*')
      .eq('id', vagaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new VagasServiceError('Vaga não encontrada', 'NOT_FOUND', error)
      }
      throw new VagasServiceError(
        `Erro ao buscar vaga: ${error.message}`, 'DATABASE_ERROR', error
      )
    }
    if (!data) throw new VagasServiceError('Vaga não encontrada', 'NOT_FOUND')

    const vagaEnriquecida = await enriquecerVaga(data, candidatoId)
    return { success: true, data: vagaEnriquecida }
  } catch (error) {
    if (error instanceof VagasServiceError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Erro inesperado ao buscar vaga' }
  }
}
```

**What to adapt:**
- New function `getVagaBySlug(slug: string, candidatoId?: string): Promise<GetVagaResponse>`.
- Replace `.eq('id', vagaId)` with `.eq('slug', slug)`.
- Adjust validation: `if (!slug || slug.trim() === '') throw new VagasServiceError('Slug da vaga inválido', 'INVALID_INPUT')`.
- Same `PGRST116` → NOT_FOUND mapping (anti-enumeration: same generic message regardless of cause per D-09 / Phase 3 carryover).
- Same `enriquecerVaga(data, candidatoId)` call (N+1 accepted per D-17).

**Pitfall observed:**
- `enriquecerVaga` (lines 65-116) does 3 extra count queries per call. Both `getVagaById` and the new `getVagaBySlug` will pay this cost. Don't optimize here — D-17 defers to Phase 5.

---

### `src/features/vagas/services/candidaturasService.ts` (PATCH, service — add `submitCandidaturaWithRespostas`)

**Analog (in same file):** candidaturasService.ts:496-636 (`createCandidatura`) + `src/features/cadastro/services/cadastroService.ts:168-279` (Edge Function invoke pattern).

**Edge Function invoke pattern from cadastroService.ts:168-279 (THIS is the canonical EF caller pattern):**
```typescript
export async function cadastrarCandidato(
  data: CandidatoFormData
): Promise<CadastroCompleteResult> {
  console.log('[CADASTRO] Invocando Edge Function cadastrar-candidato', {
    email: data.dadosPessoais.email,        // redacted shape
    hasPassword: Boolean(data.dadosPessoais.senha),
  })

  try {
    const { data: responseData, error: invokeError } =
      await supabase.functions.invoke<CadastrarCandidatoResponse>(
        'cadastrar-candidato',
        { body: { /* ... */ } }
      )

    if (invokeError) {
      console.error('[CADASTRO] Erro ao invocar Edge Function:',
        invokeError.message || String(invokeError))
      throw new CadastroError(
        invokeError.message || 'Falha ao invocar função de cadastro',
        'NETWORK_ERROR', undefined, undefined, undefined, invokeError
      )
    }

    if (!responseData?.ok) {
      const code = (responseData?.error_code ?? 'UNKNOWN_ERROR') as CadastroError['code']
      const message = responseData?.message ?? responseData?.error ?? 'Erro desconhecido'
      console.error('[CADASTRO] Edge Function retornou erro:', { code, message })
      throw new CadastroError(message, code, responseData?.field)
    }

    if (!responseData.data?.userId || !responseData.data?.candidatoId) {
      throw new CadastroError('Resposta da função de cadastro está incompleta', 'EDGE_FUNCTION_ERROR')
    }

    return { /* ... */ }
  } catch (err) {
    if (err instanceof CadastroError) throw err
    throw new CadastroError('Erro inesperado...', 'NETWORK_ERROR', /* ... */)
  }
}
```

**CandidaturasServiceError reuse** (candidaturasService.ts:39-55):
```typescript
export class CandidaturasServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'DUPLICATE_APPLICATION'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'WEBHOOK_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown
  ) {
    super(message)
    this.name = 'CandidaturasServiceError'
  }
}
```

**What to adapt:**
- New thin wrapper `submitCandidaturaWithRespostas(input: SubmitCandidaturaInput): Promise<{ candidaturaId: string }>`.
- Invoke `submit-candidatura` (NOT `cadastrar-candidato`).
- Map error codes per RESEARCH L1243-1252: `DUPLICATE_CANDIDATURA` → CandidaturasServiceError code `DUPLICATE_APPLICATION` (existing); `VALIDATION` → `INVALID_INPUT`; `UNAUTHORIZED` → `UNAUTHORIZED`; `STORAGE_ERROR` → new code (extend the union or coerce to `NETWORK_ERROR`); `SERVER_ERROR` → keep as is via cast.
- Pitfall 7: log only `{ vaga_id, candidato_id, respostas_count }` — NEVER log curriculo URL or signed URL.

**What NOT to touch:**
- `createCandidatura` (lines 496-636) — preserve as legacy pathway used by VagaDetalhePage's "quick apply" modal (which Phase 4 may or may not retire — planner decides).
- `triggerN8NWebhook` (lines 218+) — N8N call is now done by the Edge Function, not the client. The new wrapper does NOT call this helper.

**Pitfall observed:**
- candidaturasService.ts:574-580 logs `{ candidatoError, vagaError }` — at risk of leaking error details. The new wrapper should follow the cleaner cadastroService.ts:229-230 pattern: `console.error('[CANDIDATURA] EF retornou erro:', { code, message })`.

---

### `src/features/auth/utils/__tests__/pitfall7.grep.test.ts` (PATCH, test)

**Analog:** itself — lines 33-41 (`PHASE_3_AUTH_PATHS` constant).

**Current pattern to extend** (pitfall7.grep.test.ts:33-41):
```typescript
const PHASE_3_AUTH_PATHS = [
  'src/features/auth',
  'src/components/pages/LoginCandidatoPage.tsx',
  'src/components/pages/LoginRHPage.tsx',
  'src/components/pages/EsqueciSenhaPage.tsx',
  'src/components/pages/RedefinirSenhaPage.tsx',
  'src/store/authStore.ts',
  'src/lib/supabase/client.ts',
] as const
```

**What to adapt (per RESEARCH §Pitfall 7 Grep Test Extension Plan, L1684-1746):**
```typescript
// NEW: Phase 4 vagas surfaces
const PHASE_4_VAGAS_PATHS = [
  'src/features/vagas/services/cvUploadService.ts',
  'src/features/vagas/services/candidaturasService.ts',
  'src/features/vagas/services/vagasService.ts',
  'src/features/vagas/hooks/useVagaPerguntas.ts',
  'src/features/vagas/schemas/candidaturaFormSchema.ts',
  'src/features/vagas/components',
  'src/components/pages/FormularioCandidaturaPage.tsx',
  'src/components/pages/VagaDetalhePage.tsx',
] as const

const ALL_PATHS = [...PHASE_3_AUTH_PATHS, ...PHASE_4_VAGAS_PATHS] as const

// Existing test now scans both via ALL_PATHS.
```

Add a NEW test (Phase 4-specific signed-URL leak guard) per RESEARCH L1727-1745:
```typescript
const FORBIDDEN_PHASE_4 =
  /console\.(log|error|warn|info|debug)[\s\S]{0,80}?(signedurl|signed_url|signedURL|\?token=)/i
```

**What to copy verbatim:**
- `collectFiles(pathRel)` helper (lines 51-71) — works as-is for new paths.
- `FORBIDDEN` regex (line 49) — reuse for combined scan.
- describe/it shape (lines 73-95).

**What to update:**
- Sanity-check assertion (line 94): `expect(files.length).toBeGreaterThanOrEqual(10)` → `>= 18` (RESEARCH L1721).

**Pitfall observed:**
- The `__tests__` directory skip on lines 62-64 is critical — without it, the test self-matches its own `senha|password` literals. Phase 4 surfaces should not contain `__tests__/` either, but if a test directory ever lands inside `src/features/vagas/services/`, the same skip applies automatically.

---

### `src/components/pages/VagasPage.tsx` (DELETE)

**No analog — delete only (D-18).**

This file (153 LoC, hardcoded mocks) is orphan; `VagasPublicasPage.tsx` is the real implementation already wired in `routes.tsx:80`. Verify no remaining import statements via Grep before delete.

---

## Shared Patterns

### Pitfall 7 Redaction (CRITICAL — applies to every TypeScript file)

**Source:** `src/features/auth/services/authService.ts:64-69, 84-87, 100-103`
**Apply to:** All new/patched .ts files in `src/features/vagas/`, `src/components/pages/FormularioCandidaturaPage.tsx`, `supabase/functions/submit-candidatura/index.ts`.

```typescript
// Redacted log shape — log structured object with redacted flags, NEVER raw input
console.log('[AUTH] signIn invoked', {
  email: input.email,
  rememberMe: input.rememberMe,
  hasPassword: Boolean(input.senha),    // boolean flag, never the value
})

// Error logging: extract only { code, status }, NEVER the full error object
console.error('[AUTH] signIn error:', {
  code: error.code,
  status: error.status,
})

// Network/unknown errors: log only message string
console.error(
  '[AUTH] Network/Unknown error during signIn:',
  err instanceof Error ? err.message : String(err)
)
```

**Phase 4 forbidden tokens** (extend FORBIDDEN regex):
- `senha`, `password`, `access_token`, `refresh_token` (Phase 3 carryover)
- `signedurl`, `signed_url`, `?token=` (Phase 4 — RESEARCH L1729)
- `file.name` (PII — CV filename) — not regex-enforced but planner must add to checklist

### Service Layer Error Class Shape

**Source:** `src/features/vagas/services/vagasService.ts:28-42` (mirrored in `candidaturasService.ts:39-55`, `authService.ts:38-39` AuthError import, `cadastroService.ts:109-128`)
**Apply to:** All new service files (`cvUploadService.ts`, any future Phase 4 service).

```typescript
export class XxxServiceError extends Error {
  constructor(
    message: string,
    public code: 'CODE1' | 'CODE2' | ...,
    public details?: unknown
  ) {
    super(message)
    this.name = 'XxxServiceError'
  }
}
```

Always include `NETWORK_ERROR` as a default fallback code for unknown rejections.

### Edge Function Structured Error Contract (D-05/D-08 from Phase 2)

**Source:** `supabase/functions/cadastrar-candidato/index.ts:82-96` (errorResponse helper) + `supabase/functions/_shared/schemas.ts:154-169` (CadastroErrorCode + interfaces)
**Apply to:** `supabase/functions/submit-candidatura/index.ts`

```typescript
// Standard response shape:
//   { ok: false, error_code: 'CODE', message: 'pt-BR string', field?: 'fieldName' }
//   { ok: true, data: { ... } }
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
```

**DROP** the `error: message` legacy alias (line 92 of cadastrar-candidato/index.ts) — submit-candidatura has no legacy client to support.

### Postgres SECURITY DEFINER + Grants Pattern

**Source:** `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql:21-77`
**Apply to:** `submit_candidatura_atomic` RPC migration; `slugify` and `generate_unique_vaga_slug` functions.

```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_name(...)
RETURNS jsonb / text / etc
LANGUAGE plpgsql
SECURITY DEFINER         -- bypasses RLS; required for cross-user reads/writes
SET search_path = ''     -- prevents search_path injection attacks
AS $$
BEGIN
  -- ... body ...
END;
$$;

COMMENT ON FUNCTION public.fn_name(...) IS '...';

REVOKE ALL ON FUNCTION public.fn_name(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_name(...) TO <role>;

COMMIT;
```

Choose grant target carefully:
- `anon, authenticated` — for client-callable RPCs (e.g. `check_candidato_duplicate`).
- `service_role` only — for Edge-Function-only RPCs (e.g. `submit_candidatura_atomic`).

### TanStack Query Conventions

**Source:** `src/features/vagas/hooks/useVagas.ts:36-49, 117-132`
**Apply to:** `useVagaPerguntas`, any future Phase 4 hook.

- Hierarchical query keys via single `vagasKeys` object: `[...vagasKeys.all, 'subkey', id]`.
- Always set `enabled: !!param` to guard on optional inputs.
- Always set `retry: 2` (or `1` for hot paths like `hasApplied`).
- Always set `staleTime` based on data volatility (5min for stable data, 1-2min for hot data).
- Always spread `...options` last so consumers can override.

### React Hook Form + Zod Resolver Cast

**Source:** `src/components/pages/LoginCandidatoPage.tsx:73-74`
**Apply to:** New `FormularioCandidaturaPage` if Zod schema produces input/output type mismatch.

```typescript
resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
```

The dynamic `buildCandidaturaSchema` factory likely produces inferred types that need this cast. Required when Zod schema has `.optional().default(...)`, transform, or refine clauses.

---

## No Analog Found

Files with no close match in the codebase (planner MUST use RESEARCH.md skeletons):

| File | Role | Why no analog | RESEARCH.md section to use |
|------|------|---------------|----------------------------|
| `src/features/vagas/services/cvUploadService.ts` | Storage wrapper | First Supabase Storage usage in the project | §`cvUploadService.ts` API surface (L1472-1599) |
| `src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts` | TanStack Query hook test | No prior `src/features/*/hooks/__tests__/` directory exists | §Test Plan (L1767) — apply standard QueryClientProvider wrapper pattern |
| `supabase/migrations/20260425000001_vagas_slug_trigger.sql` | Postgres trigger + immutable function | No prior trigger migration in repo | §Slug Trigger SQL (L658-822) — full migration provided |
| `supabase/migrations/20260425000002_curriculos_bucket.sql` | Storage bucket + RLS policies | No prior storage migration in repo | §Storage RLS SQL (L847-986) — full migration + path schema amendment recommendation provided |
| `e2e/candidatura-submit.spec.ts` (FILE UPLOAD portion only) | Playwright FileChooser API | No prior file-upload E2E in repo | Reference Playwright docs + RESEARCH §Test Plan L1779 |

---

## Metadata

**Analog search scope:**
- `src/features/vagas/` (services, hooks, types)
- `src/features/auth/` (services, schemas, hooks, utils, types, __tests__)
- `src/features/cadastro/` (services, schemas, components, __tests__)
- `src/components/pages/` (LoginCandidatoPage, VagaDetalhePage, FormularioCandidaturaPage existing)
- `src/router/routes.tsx`
- `supabase/functions/cadastrar-candidato/` + `_shared/`
- `supabase/migrations/*` (6 prior migrations scanned)
- `e2e/*.spec.ts` (4 prior specs scanned)

**Files scanned:** 22 source/migration/test files read directly; 1 large source file (RESEARCH.md, 2067 lines) chunked.

**Pattern extraction date:** 2026-04-25
