# Phase 2: Cadastro Candidato - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 14 new/modified files
**Analogs found:** 14 / 14 (100% coverage)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/features/cadastro/services/cadastroService.ts` (PATCH) | service | request-response (invoke EF) | self — extend in place | self-patch |
| `src/features/cadastro/services/duplicateCheckService.ts` (PATCH) | service | request-response (RPC) | self — extend in place | self-patch |
| `src/features/cadastro/hooks/useDuplicateCheck.ts` (PATCH — debounce 800→300) | hook | imperative + debounce | self — 1-line patch | self-patch |
| `src/features/cadastro/hooks/useCadastroDraft.ts` (NEW) | hook | write-path (sessionStorage) | `src/features/cadastro/hooks/useViaCEP.ts` | role-match (imperative hook w/ state) |
| `src/features/cadastro/hooks/useLeaveGuard.ts` (NEW) | hook | event-driven (beforeunload) | `src/features/cadastro/hooks/useViaCEP.ts` | role-match (imperative, useEffect-based) |
| `src/features/cadastro/constants.ts` (NEW) | constants | — | *(no prior; trivial)* | N/A — trivial |
| `src/features/cadastro/components/CadastroMultiStepForm.tsx` (PATCH) | component | orchestrator | self — wire new hooks | self-patch |
| `src/features/cadastro/components/steps/AutorizacoesStep.tsx` (PATCH) | component | write-path | self — policy_version caption + microcopy | self-patch |
| `src/features/cadastro/services/__tests__/cadastroService.test.ts` (PATCH) | test | — | `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` | role-match (vitest + supabase mock) |
| `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` (PATCH — RPC rate_limited) | test | — | self — extend existing | self-patch |
| `src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts` (NEW) | test | — | `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` | role-match (vitest unit pattern) |
| `src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts` (NEW) | test | — | `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` | role-match |
| `supabase/functions/_shared/schemas.ts` (PATCH — add error_code types + zodPathToFieldName) | shared schema | — | self — extend with new types | self-patch |
| `supabase/functions/_shared/constants.ts` (NEW) | shared constants | — | *(no prior in `_shared/`)* | N/A — trivial |
| `supabase/functions/cadastrar-candidato/index.ts` (PATCH — structured errors + policy_version) | Edge Function | request-response | self — evolve contract | self-patch |
| `supabase/migrations/20260421000001_rate_limit_duplicate_check.sql` (NEW) | migration | — | `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql` + `20260420000001_rls_anon_to_rpc.sql` | exact (same migration kind) |
| `e2e/cadastro-flow.spec.ts` (PATCH — auto-login + error paths + draft restore) | e2e test | — | self — extend existing spec | self-patch |

## Pattern Assignments

---

### `src/features/cadastro/hooks/useCadastroDraft.ts` (NEW, hook, write-path sessionStorage)

**Analog:** `src/features/cadastro/hooks/useViaCEP.ts`

**Rationale:** Both are imperative single-owner hooks colocated in `features/cadastro/hooks/`, with `useState` + `useEffect` + `useCallback` + `useRef` pattern. `useViaCEP` demonstrates the established structure for options + state interface + named export.

**Header/JSDoc pattern** (lines 1-10):
```typescript
/**
 * Hook para integração com ViaCEP
 *
 * Features:
 * - Busca automática de endereço por CEP
 * - Debounce para evitar requisições excessivas
 * - Loading states
 * - Error handling
 * - Callback de sucesso para preencher formulário
 */
```

**Imports + named export pattern** (lines 12-14, 88-91):
```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { buscarCEPComCache, ViaCEPError, isValidCEP } from '../services/viaCepService'
import type { ViaCEPResponse } from '../types'
// ...
export function useViaCEP(
  cep: string,
  options: UseViaCEPOptions = {}
): UseViaCEPState {
```

**Imperative handler wrapped in useCallback** (lines 111-171):
```typescript
const buscar = useCallback(
  async (cepToBuscar: string) => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // Limpar estado de erro
    setError(null)
    // Validar antes de buscar
    if (!isValidCEP(cepToBuscar)) {
      return
    }
    abortControllerRef.current = new AbortController()
    try {
      setLoading(true)
      const resultado = await buscarCEPComCache(cepToBuscar)
      if (!abortControllerRef.current.signal.aborted) {
        setData(resultado)
        if (onSuccess) onSuccess(resultado)
      }
    } catch (err) { /* ... */ }
    finally { setLoading(false) }
  },
  [onSuccess, onError]
)
```

**Application to `useCadastroDraft`:** Export named `useCadastroDraft`. Return `{ save, load, clear }` (three `useCallback` helpers, NO internal state — hook is pure storage wrapper per RESEARCH Pattern 3, L384-410). JSDoc listing features (save/load/clear + sessionStorage key + PII stripping). Key `'cadastro:draft:v1'` imported from `../constants.ts`. `save()` must strip `senha`/`confirmar_senha` before JSON.stringify (per D-13 + Pitfall 7 audit).

---

### `src/features/cadastro/hooks/useLeaveGuard.ts` (NEW, hook, event-driven)

**Analog:** `src/features/cadastro/hooks/useViaCEP.ts`

**Rationale:** Same file-local conventions (JSDoc, named export, hooks-dir location). The relevant pattern to extract is the `useEffect` mount/unmount cleanup — `useViaCEP` shows the canonical cleanup at lines 231-243.

**useEffect cleanup pattern** (lines 229-243):
```typescript
/**
 * Cleanup ao desmontar componente
 */
useEffect(() => {
  return () => {
    // Cancelar qualquer requisição pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // Limpar timer de debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }
}, [])
```

**Application to `useLeaveGuard(isDirty: boolean)`:** Per RESEARCH Pattern 4 (L417-427) — single `useEffect` guarded by `if (!isDirty) return`, registers `window.addEventListener('beforeunload', handler)`, returns cleanup that calls `removeEventListener`. Handler sets `e.preventDefault()` + `e.returnValue = ''`. **Do NOT customize message string** (browsers ignore since 2017 — per CONTEXT D-14 + UI-SPEC "Browser beforeunload Warning" section).

---

### `src/features/cadastro/services/cadastroService.ts` (PATCH, service, request-response)

**Analog:** SELF — extend in place. Keep the custom error class + `functions.invoke` orchestration exactly as-is; only extend the `code` union and add `field?` + parsing of `error_code` from the response body.

**Custom error class pattern to extend** (lines 75-93):
```typescript
export class CadastroError extends Error {
  constructor(
    message: string,
    public code:
      | 'AUTH_FAILED'
      | 'INSERT_FAILED'
      | 'ROLLBACK_FAILED'
      | 'VALIDATION_ERROR'
      | 'NETWORK_ERROR'
      | 'EDGE_FUNCTION_ERROR'
      | 'UNKNOWN_ERROR',
    public table?: string,
    public originalError?: unknown,
    public details?: unknown
  ) {
    super(message)
    this.name = 'CadastroError'
  }
}
```

**Existing invoke + error routing to adapt** (lines 134-178):
```typescript
try {
  const { data: responseData, error: invokeError } =
    await supabase.functions.invoke<CadastrarCandidatoResponse>(
      'cadastrar-candidato',
      { body: { /* ...flat + sub-objects... */ } }
    )

  if (invokeError) {
    throw new CadastroError(
      invokeError.message || 'Falha ao invocar função de cadastro',
      'EDGE_FUNCTION_ERROR',
      undefined,
      invokeError
    )
  }

  if (!responseData || !responseData.ok) {
    const serverMessage = responseData?.error || 'Erro desconhecido no servidor'
    throw new CadastroError(serverMessage, 'EDGE_FUNCTION_ERROR')
  }
```

**Application (per RESEARCH L1045-1103):**
- Extend `code` union: ADD `'EMAIL_EXISTS' | 'CPF_EXISTS' | 'VALIDATION' | 'SERVER_ERROR'`. KEEP `'EDGE_FUNCTION_ERROR'`, `'NETWORK_ERROR'`, `'UNKNOWN_ERROR'` for SDK-level failures. REMOVE the legacy `'AUTH_FAILED' | 'INSERT_FAILED' | 'ROLLBACK_FAILED' | 'VALIDATION_ERROR'` ones (dead code per existing JSDoc comment "após FOUND-01, só sobrevivem os códigos observáveis").
- Add `public field?: string` param (between `code` and `table`).
- Reshape response parsing per RESEARCH L1077-1080: read `error_code ?? 'UNKNOWN_ERROR'`, `message ?? error ?? fallback` (legacy alias), `field` passthrough. Keep `originalError` plumbing intact.
- Keep `console.log` calls; add redaction audit — NEVER log `data.dadosPessoais.senha` or `confirmar_senha` (per Pitfall 7).

---

### `src/features/cadastro/services/duplicateCheckService.ts` (PATCH, service, request-response RPC)

**Analog:** SELF — the RPC cast pattern already exists at lines 150-188. Only extend `DuplicateCheckError.code` with `'RATE_LIMITED'` and parse `rate_limited` flag from response.

**RPC invocation pattern to keep** (lines 150-188):
```typescript
async function callDuplicateRpc(
  cpfCleaned: string,
  emailCleaned: string
): Promise<CheckCandidatoDuplicateResponse> {
  // NOTE: The RPC signature is not yet present in database.types.ts — that
  // file is regenerated via `npm run db:types` after the migrations ship.
  const rpc = supabase.rpc as unknown as (
    fn: 'check_candidato_duplicate',
    args: { p_cpf: string; p_email: string }
  ) => Promise<{ data: unknown; error: { message: string } | null }>
  const { data, error } = await rpc('check_candidato_duplicate', {
    p_cpf: cpfCleaned,
    p_email: emailCleaned,
  })
  if (error) {
    throw new DuplicateCheckError(
      'Erro ao verificar duplicatas no banco de dados. Tente novamente.',
      'DATABASE_ERROR'
    )
  }
  const response = data as unknown as CheckCandidatoDuplicateResponse | null
  if (!response || typeof response.cpf_exists !== 'boolean' || typeof response.email_exists !== 'boolean') {
    throw new DuplicateCheckError(
      'Resposta inesperada do servidor ao verificar duplicatas.',
      'DATABASE_ERROR'
    )
  }
  return response
}
```

**DuplicateCheckError class to extend** (lines 79-88):
```typescript
export class DuplicateCheckError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR',
    public field?: DuplicateCheckField
  ) {
    super(message)
    this.name = 'DuplicateCheckError'
  }
}
```

**Application:** (1) Extend `code` union: add `'RATE_LIMITED'`. (2) Extend `CheckCandidatoDuplicateResponse` interface to include `rate_limited: boolean` + allow nullable `cpf_exists`/`email_exists`. (3) After `callDuplicateRpc` returns, check `response.rate_limited === true` FIRST — throw `new DuplicateCheckError('Muitas tentativas. Aguarde alguns instantes.', 'RATE_LIMITED')` before continuing. (4) After migration apply + `db:types` regen, the `rpc` cast CAN be simplified but is NOT required for this phase (same tactical note already present at L154-158).

---

### `src/features/cadastro/hooks/useDuplicateCheck.ts` (PATCH — 1-line debounce)

**Analog:** SELF — surgical change only.

**Current default** (line 32):
```typescript
/**
 * Tempo de debounce em milissegundos
 * @default 800
 */
debounceMs?: number
```

**Application:** Change default from `800` to `300` per CONTEXT D-10 + UI-SPEC Open Question 1. Consumers that don't pass `debounceMs` will receive 300ms; those passing explicit values (check `DadosPessoaisStep.tsx` for any explicit 800 override) should also be updated to either use default or pass `300`. Verify with Grep: `debounceMs:\s*(800|1000)` across cadastro components.

---

### `src/features/cadastro/components/CadastroMultiStepForm.tsx` (PATCH — wire new hooks + rewrite onSubmit)

**Analog:** SELF — keep existing 4-step shell; rewire `onSubmit` handler, add two new hook calls, rename "Finalizar Cadastro" → "Criar conta".

**Existing imports block to extend** (lines 17-43):
```typescript
import React, { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

import {
  candidatoFormSchema,
  dadosPessoaisSchema,
  enderecoSchema,
  disponibilidadeSchema,
  autorizacoesSchema,
  type CandidatoFormData,
} from '../schemas'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/components/ui/utils'

import { useFormToast } from '../hooks/useFormToast'
import { LoadingProgress, type LoadingStage } from './LoadingProgress'

// Import dos componentes de cada step
import { DadosPessoaisStep } from './steps/DadosPessoaisStep'
```

**Application (per RESEARCH L1112-1190):**
- Add imports: `useNavigate` from `react-router-dom`, `toast` from `sonner` (or keep `useFormToast`), `cadastrarCandidato`, `CadastroError`, `useCadastroDraft`, `useLeaveGuard`, `supabase` from `@/lib/supabase/client`.
- Call `const draft = useCadastroDraft()` inside component; `useLeaveGuard(methods.formState.isDirty && !isSubmitting && !submitSuccess)`.
- On mount effect: `draft.load()` → if non-null, `methods.reset(saved)` + `toast.info('Retomamos seu cadastro de onde você parou.')`.
- `methods.watch()` + `useEffect` debounced 500ms → `draft.save(watchedData)` (per RESEARCH L815-822).
- Rewrite `handleFormSubmit` per RESEARCH L1116-1159: wrap in try/catch/finally; run `candidatoFormSchema.safeParse`; call `cadastrarCandidato`; call `tryAutoLogin(email, senha)` (inline helper — RESEARCH L700-709); on success `draft.clear()` + `navigate('/candidato/perfil', { replace: true })` + success toast; on signIn fail after retry, `navigate('/auth/login?email=' + encodeURIComponent(email))`.
- Add `routeCadastroError` helper per RESEARCH L1161-1190: switch on `err.code`; for `EMAIL_EXISTS`/`CPF_EXISTS` call `setCurrentStepIndex(0)` + `methods.setError('dadosPessoais.email'|'cpf', ...)`; for `VALIDATION` with `field`, look up `FIELD_TO_STEP_INDEX` + `FIELD_TO_STEP_PATH`.
- Do NOT open `LoadingProgress` Dialog on submit (UI-SPEC § deprecation). Keep the import/code dead for Phase 4 reuse.
- Rename button label "Finalizar Cadastro" → "Criar conta" (line 506 per CONTEXT + UI-SPEC Open Question 3). Loading label "Criando..." with `Loader2` from `lucide-react`.
- Font-weight sweep: grep `font-medium` / `font-bold` in this file + `steps/*.tsx` and collapse to `font-semibold` / `font-normal` (UI-SPEC Open Question 5 + Dimension 4).

---

### `src/features/cadastro/components/steps/AutorizacoesStep.tsx` (PATCH — policy_version caption + microcopy)

**Analog:** SELF — only text/caption changes per UI-SPEC.

**Application:**
- Import `POLICY_VERSION` from `@/features/cadastro/constants` (new file).
- Below "Política de Privacidade" link, add `<p className="text-white/70 text-xs">Versão {POLICY_VERSION}</p>` (UI-SPEC § "Saiba mais Affordance").
- Below contact paragraph (existing lines 154-176), add `<p>Esta política está na versão <strong>{POLICY_VERSION}</strong>.</p>` (UI-SPEC § LGPD Banner).
- Update microcopy of 4 checkboxes per UI-SPEC Table § LGPD Checkbox Labels & Descriptions (especially: "IA" → "avaliação comportamental e de comunicação" for `analise_video`).

---

### `src/features/cadastro/constants.ts` (NEW)

**Analog:** None (trivial file). Follow CONVENTIONS.md naming (camelCase module, SCREAMING_CASE export).

**Content (per RESEARCH Pathway 7):**
```typescript
/**
 * Cadastro-feature constants shared across components, hooks, and services.
 *
 * IMPORTANT: POLICY_VERSION must match supabase/functions/_shared/constants.ts.
 * When bumping version, update BOTH files in the same commit and grep the repo
 * for the old value to catch stray references.
 */

export const POLICY_VERSION = 'v1.0-2026-04' as const

/**
 * sessionStorage key for the cadastro draft. Suffix `v1` allows future schema
 * migrations — bump to `v2` to automatically invalidate stale drafts.
 */
export const CADASTRO_DRAFT_KEY = 'cadastro:draft:v1' as const
```

---

### `src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts` (NEW, test)

**Analog:** `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts`

**Rationale:** Closest in-tree unit test using vitest + `vi.mock`. Testing hooks specifically requires `@testing-library/react` `renderHook` — install per RESEARCH L160-165 in Wave 0.

**Test file header pattern** (lines 1-32):
```typescript
/**
 * Testes TDD para verificação de duplicatas (CPF/Email)
 *
 * Testes escritos com mocks do Supabase para garantir que:
 * - CPF duplicado é detectado corretamente
 * - Email duplicado é detectado corretamente
 * - Valores únicos retornam isDuplicate: false
 * - Erros de validação são lançados para formatos inválidos
 * - Erros de rede/banco são tratados corretamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkCPFDuplicate,
  checkEmailDuplicate,
  checkBothDuplicates,
  DuplicateCheckError,
  cleanCPF,
  cleanEmail,
  isValidCPFFormat,
  isValidEmailFormat,
} from '../duplicateCheckService'

// Mock do Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('duplicateCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
```

**Nested describe/it structure** (lines 40-52):
```typescript
describe('cleanCPF', () => {
  it('deve remover pontos e traços do CPF', () => {
    expect(cleanCPF('123.456.789-00')).toBe('12345678900')
  })
  // ...
})
```

**Application:** Import `renderHook` + `act` from `@testing-library/react`. Mock `sessionStorage` via `Object.defineProperty(window, 'sessionStorage', ...)` or the vi.stubGlobal pattern. Test cases per RESEARCH L1340-1343:
- `save()` strips `senha` and `confirmar_senha` before writing.
- `load()` returns `null` when key absent.
- `load()` returns parsed object excluding `_savedAt` metadata.
- `clear()` calls `sessionStorage.removeItem(CADASTRO_DRAFT_KEY)`.
- Serialization failure (storage quota) logs warning but does not throw.

---

### `src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts` (NEW, test)

**Analog:** `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` (same rationale as above).

**Application:** Test cases per RESEARCH L1343-1345:
- Hook registers `beforeunload` listener when `isDirty === true`.
- Hook does NOT register listener when `isDirty === false`.
- Handler calls `event.preventDefault()` + sets `event.returnValue = ''`.
- Toggle `isDirty` from true → false: listener is removed (use `rerender` from `renderHook`).
- Unmount: listener is removed via cleanup.
- Use `vi.spyOn(window, 'addEventListener')` and `vi.spyOn(window, 'removeEventListener')` to assert registration/cleanup.

---

### `src/features/cadastro/services/__tests__/cadastroService.test.ts` (PATCH — new error_code cases)

**Analog:** SELF — extend existing suite.

**Existing mock setup to reuse** (lines 22-51):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cadastrarCandidato,
  CadastroCompleteResult,
  CadastroError,
} from '../cadastroService'
import type { CandidatoFormData } from '../../types'

// Mock do Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  },
}))

// Import dos mocks após configuração
import { supabase } from '@/lib/supabase/client'
```

**Application:** Mock `supabase.functions.invoke` (not `from` — this service uses invoke now). Add test cases for each `error_code`:
- `EMAIL_EXISTS` → `CadastroError.code === 'EMAIL_EXISTS'`, `field === 'email'`.
- `CPF_EXISTS` → idem for CPF.
- `VALIDATION` + `field: 'cep'` → preserved in thrown error.
- `SERVER_ERROR` → toast fallback path.
- Legacy `error` string (no `error_code`) → fallback to `'UNKNOWN_ERROR'` (backward compat per RESEARCH L1077-1080).
- `invokeError` network failure → `'NETWORK_ERROR'`.
- Password NEVER logged: snoop `console.log` calls, assert none contain the password string (Pitfall 7).

---

### `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` (PATCH — rate_limited)

**Analog:** SELF — add 2 test cases to existing file.

**Application:**
- Mock `supabase.rpc` returning `{ data: { cpf_exists: null, email_exists: null, rate_limited: true }, error: null }`.
- Assert `await checkCPFDuplicate(...)` throws `DuplicateCheckError` with `code === 'RATE_LIMITED'`.
- Also add case: `rate_limited: false` + valid booleans returns normal `DuplicateCheckResult`.

---

### `supabase/functions/_shared/schemas.ts` (PATCH — add error types + zodPathToFieldName)

**Analog:** SELF — additive; keep all existing schemas.

**Existing module pattern** (lines 22-25):
```typescript
/**
 * @module supabase/functions/_shared/schemas
 */

import { z } from 'https://esm.sh/zod@3'
```

**Existing export pattern to follow** (lines 143-148):
```typescript
export const cadastroCandidatoSchema = z.object({ /* ... */ })

/**
 * Tipo inferido do schema principal.
 */
export type CadastroCandidatoInput = z.infer<typeof cadastroCandidatoSchema>
```

**Application (per RESEARCH L320-328 + L745-753):**
- Add `export type CadastroErrorCode = 'EMAIL_EXISTS' | 'CPF_EXISTS' | 'VALIDATION' | 'SERVER_ERROR'`.
- Add `export interface CadastroErrorResponse { ok: false; error_code: CadastroErrorCode; message: string; field?: string; error?: string }` (legacy `error` alias kept during transition per RESEARCH L498).
- Add `export interface CadastroSuccessResponse { ok: true; data: { userId: string; candidatoId: string; disponibilidadeId?: string; autorizacoesId?: string } }`.
- Add helper `export function zodPathToFieldName(path: (string | number)[] | undefined): string | undefined` — returns `path[path.length - 1]` as string if non-empty. Maps nested `['endereco', 'cep']` → `'cep'`.
- Keep `validateCPF`, `enderecoSchema`, `disponibilidadeSchema`, `autorizacoesSchema`, `cadastroCandidatoSchema` untouched.

---

### `supabase/functions/_shared/constants.ts` (NEW)

**Analog:** None — trivial file mirroring `src/features/cadastro/constants.ts`.

**Content (per RESEARCH L906-907):**
```typescript
/**
 * Constants shared among Edge Functions (Deno runtime).
 *
 * IMPORTANT: POLICY_VERSION must match src/features/cadastro/constants.ts.
 * When bumping version, update BOTH files in the same commit.
 */

export const POLICY_VERSION = 'v1.0-2026-04' as const
```

---

### `supabase/functions/cadastrar-candidato/index.ts` (PATCH — structured errors + policy_version)

**Analog:** SELF — evolve in place. The existing structure (CORS, jsonResponse helper, Deno.serve, parse → authCreateUser → candidatos insert → best-effort) is kept; only the error-response shape and `autorizacoes` insert payload change.

**Existing jsonResponse + error pattern to evolve** (lines 57-97):
```typescript
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Método não suportado' }, 405)
  }

  // ---- 1. Parse + validate body --------------------------------------------
  let input: CadastroCandidatoInput
  try {
    const rawBody = await req.json()
    const parsed = cadastroCandidatoSchema.safeParse(rawBody)
    if (!parsed.success) {
      const firstIssue = parsed.error.errors[0]
      const message = firstIssue?.message || 'Dados de cadastro inválidos'
      return jsonResponse({ ok: false, error: message }, 400)
    }
    input = parsed.data
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Corpo da requisição inválido (JSON malformado)' }, 400)
  }
```

**Existing unique-violation handling to restructure** (lines 173-187):
```typescript
if (candidatoError || !candidatoRow) {
  await supabaseAdmin.auth.admin.deleteUser(userId).catch(...)
  const raw = candidatoError?.message ?? ''
  const message = raw.includes('cpf')
    ? 'Este CPF já está cadastrado.'
    : raw.includes('email')
      ? 'Este email já está cadastrado.'
      : 'Não foi possível registrar o candidato.'
  return jsonResponse({ ok: false, error: message }, 400)
}
```

**Existing autorizacoes insert to extend** (lines 232-247):
```typescript
const { data: autData, error: autError } = await supabaseAdmin
  .from('autorizacoes')
  .insert({
    candidato_id: candidatoId,
    user_id: userId,
    autorizacao_uso_dados: input.autorizacoes.autorizacao_uso_dados,
    autorizacao_comunicacao: input.autorizacoes.autorizacao_comunicacao ?? true,
    autorizacao_retencao_curriculo: input.autorizacoes.autorizacao_retencao_curriculo ?? true,
    autorizacao_analise_video: input.autorizacoes.autorizacao_analise_video ?? false,
    ip_aceite: ipAceite,
    data_aceite: new Date().toISOString(),
  })
  .select('id')
  .maybeSingle()
```

**Application (per RESEARCH L315-334 + L243):**
- Add helper `errorResponse(code: CadastroErrorCode, message: string, field?: string, status = 400): Response` that returns `{ ok: false, error_code: code, message, field, error: message }` (the duplicate `error` field is the legacy alias per RESEARCH L498 — dropped in Phase 3).
- Replace Zod fail branch: use `zodPathToFieldName(firstIssue?.path)` + `errorResponse('VALIDATION', firstIssue?.message ?? 'Dados inválidos', field)`.
- Replace JSON-parse fail: `errorResponse('VALIDATION', 'Corpo da requisição inválido (JSON malformado)')`.
- Replace method-not-supported: `errorResponse('SERVER_ERROR', 'Método não suportado', undefined, 405)`.
- Replace auth.admin.createUser "already" branch: `errorResponse('EMAIL_EXISTS', 'Este email já está cadastrado.', 'email')`.
- Replace candidatos unique violation: inspect `raw.includes('cpf')` → `errorResponse('CPF_EXISTS', ..., 'cpf')`; `raw.includes('email')` → `errorResponse('EMAIL_EXISTS', ..., 'email')`.
- Replace env-missing branch: `errorResponse('SERVER_ERROR', 'Configuração do servidor indisponível', undefined, 500)`.
- Import `POLICY_VERSION` from `../_shared/constants.ts`; add `policy_version: POLICY_VERSION` to autorizacoes insert payload.
- Keep the success response `{ ok: true, data: { userId, candidatoId, disponibilidadeId, autorizacoesId } }` unchanged.
- Password redaction audit: NEVER log `input.password` or include it in any console output (Pitfall 7).

---

### `supabase/migrations/20260421000001_rate_limit_duplicate_check.sql` (NEW, migration)

**Analog:** `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql` (primary) + `supabase/migrations/20260420000001_rls_anon_to_rpc.sql` (for REVOKE pattern).

**Migration header + BEGIN/COMMIT pattern from 0003** (lines 1-21):
```sql
-- =============================================================================
-- Migration: RPC SECURITY DEFINER for CPF/email duplicate check
-- Date: 2026-04-20
-- Requirements: FOUND-10, D-01a
-- Threat mitigated: T-1-09 (Information Disclosure) and T-1-12
-- =============================================================================
--
-- PURPOSE
-- Replaces anonymous SELECT on public.candidatos with a narrow SECURITY DEFINER
-- function that returns ONLY boolean flags -- never raw candidato data.
--
-- RESPONSE SHAPE
--   { "cpf_exists": boolean, "email_exists": boolean }
--
-- CONSUMER
-- src/features/cadastro/services/duplicateCheckService.ts calls
--   supabase.rpc('check_candidato_duplicate', { p_cpf, p_email })
-- =============================================================================

BEGIN;
```

**Function + grant pattern from 0003** (lines 23-75):
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
  v_email_clean text;
  result        jsonb;
BEGIN
  v_cpf_clean   := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_email_clean := lower(trim(COALESCE(p_email, '')));

  SELECT jsonb_build_object(
    'cpf_exists', CASE
      WHEN v_cpf_clean = '' THEN false
      ELSE EXISTS (SELECT 1 FROM public.candidatos
                   WHERE cpf = v_cpf_clean AND deleted_at IS NULL)
    END,
    'email_exists', CASE
      WHEN v_email_clean = '' THEN false
      ELSE EXISTS (SELECT 1 FROM public.candidatos
                   WHERE lower(email) = v_email_clean AND deleted_at IS NULL)
    END
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.check_candidato_duplicate(text, text) IS '...';

REVOKE ALL ON FUNCTION public.check_candidato_duplicate(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate(text, text) TO anon, authenticated;

COMMIT;
```

**REVOKE pattern from 0001** (lines 42-44):
```sql
REVOKE SELECT ON public.candidatos FROM anon;
REVOKE SELECT ON public.candidatos FROM PUBLIC;
```

**Application (per RESEARCH L558-647):**
- File naming: `20260421000001_rate_limit_duplicate_check.sql` (ISO + 6-digit sequence, following Supabase CLI convention seen in existing migrations).
- Header block with PURPOSE / REQUIREMENTS (CONTEXT D-12, D-16) / CONSUMER (client + Edge Function).
- `BEGIN;` ... `COMMIT;` wrapper.
- **3 changes in one transaction:**
  1. `CREATE TABLE IF NOT EXISTS public.rate_limit_check_duplicate (id bigserial PRIMARY KEY, ip inet NOT NULL, user_id uuid NULL, called_at timestamptz NOT NULL DEFAULT now())`. Plus `CREATE INDEX IF NOT EXISTS idx_rate_limit_check_duplicate_ip_recent ON ... (ip, called_at DESC)`. Plus `REVOKE ALL ON TABLE public.rate_limit_check_duplicate FROM PUBLIC, anon, authenticated` (only SECURITY DEFINER function touches it).
  2. `CREATE OR REPLACE FUNCTION public.check_candidato_duplicate(p_cpf, p_email)` — same signature, SECURITY DEFINER, `SET search_path = ''`. Body: rate-limit check first (composite IP OR user_id, 30/60s window), returns `{cpf_exists: null, email_exists: null, rate_limited: true}` if exceeded. Else INSERT log row + opportunistic cleanup of rows > 5min + existing duplicate logic + `rate_limited: false` in payload.
  3. `ALTER TABLE public.autorizacoes ADD COLUMN IF NOT EXISTS policy_version text NOT NULL DEFAULT 'v1.0-2026-04'` (D-16). Consider bundling: `ip_aceite inet NULL`, `data_aceite timestamptz NULL DEFAULT now()`, `user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL` per RESEARCH L466 runtime-state-inventory (these 3 already referenced by the Edge Function but missing from baseline — add defensively with `IF NOT EXISTS`).
- `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO anon, authenticated` on the patched function.
- `COMMENT ON FUNCTION` explaining rate-limit policy, window, and cleanup.
- **Post-migration step:** run `npm run db:types --linked` + commit the regenerated `database.types.ts` (Wave 1 per Pitfall 2).

---

### `e2e/cadastro-flow.spec.ts` (PATCH — auto-login + error paths + draft)

**Analog:** SELF — extend existing spec.

**Existing Playwright setup pattern** (lines 20-27):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Cadastro de Candidato - Fluxo Completo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cadastro')
  })
```

**Existing happy-path step navigation pattern** (lines 28-97):
```typescript
test('deve completar o cadastro com sucesso', async ({ page }) => {
  // STEP 1: DADOS PESSOAIS
  await expect(page.locator('text=Dados Pessoais')).toBeVisible()
  await page.fill('input[name="dadosPessoais.nome_completo"]', 'João da Silva Test')
  await page.fill('input[name="dadosPessoais.cpf"]', '12345678901')
  await expect(page.locator('text=CPF válido e disponível!')).toBeVisible({ timeout: 3000 })
  const testEmail = `test+${Date.now()}@beautysmile.com.br`
  await page.fill('input[name="dadosPessoais.email"]', testEmail)
  // ...
  await page.click('button:has-text("Próximo")')
})
```

**Application (per RESEARCH L1367 + UI-SPEC success flow):**
Add following test cases to the existing `describe`:
- `test('happy path auto-login lands on /candidato/perfil with welcome toast', ...)` — fill all 4 steps, click "Criar conta", expect URL `/candidato/perfil`, expect toast text matching `Cadastro concluído! Bem-vindo(a), João`.
- `test('EMAIL_EXISTS race → auto-navigate to Step 1 + inline error', ...)` — seed an existing email via RPC or hit a known duplicate; assert step header shows "Dados Pessoais" + inline red text matching "Este email já está cadastrado".
- `test('CPF_EXISTS path', ...)` — analogous.
- `test('draft auto-restore on refresh', ...)` — fill Step 1 partial, reload page, assert toast `Retomamos seu cadastro de onde você parou.` + field values preserved.
- `test('LGPD mandatory blocks submit', ...)` — fill all steps leaving `autorizacao_uso_dados` unchecked; click "Criar conta"; assert toast error + inline error on the mandatory checkbox row.
- `test('rate-limited toast', ...)` — OPTIONAL; hard to reproduce per Pitfall 5. Mark `.skip` if flaky.
- **Button label update:** change all `button:has-text("Finalizar Cadastro")` → `button:has-text("Criar conta")` (UI-SPEC rename).
- **Email uniqueness:** continue using `test+${Date.now()}@beautysmile.com.br` to avoid collisions across runs (Pitfall 6).

---

## Shared Patterns

### Custom Error Class (SCREAMING_SNAKE code union)

**Source:** `src/features/cadastro/services/cadastroService.ts` lines 75-93 AND `src/features/cadastro/services/duplicateCheckService.ts` lines 79-88.

**Apply to:** Both service patches (cadastroService + duplicateCheckService) extending their existing `code` unions with the new codes (`EMAIL_EXISTS`, `CPF_EXISTS`, `VALIDATION`, `SERVER_ERROR`, `RATE_LIMITED`).

```typescript
export class CadastroError extends Error {
  constructor(
    message: string,
    public code: 'EMAIL_EXISTS' | 'CPF_EXISTS' | 'VALIDATION' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'EDGE_FUNCTION_ERROR' | 'UNKNOWN_ERROR',
    public field?: string,
    public table?: string,
    public originalError?: unknown,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'CadastroError'
  }
}
```

### Supabase Client Import (anon key, client-side)

**Source:** `src/features/cadastro/services/duplicateCheckService.ts` line 18 + `src/features/cadastro/services/cadastroService.ts` line 13.

**Apply to:** Any new hook/service invoking Supabase from the client. NEVER import `supabaseAdmin` or `service_role` (per CLAUDE.md security rules + RESEARCH L954).

```typescript
import { supabase } from '@/lib/supabase/client'
```

### Edge Function Response Helper (CORS + JSON)

**Source:** `supabase/functions/cadastrar-candidato/index.ts` lines 47-62.

**Apply to:** Any new error-emission path inside the Edge Function patch. Keep the `corsHeaders` + `jsonResponse` pair; add `errorResponse` as a thin wrapper that always produces `{ ok: false, error_code, message, field?, error? }`.

```typescript
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
```

### Migration Transaction Wrapper

**Source:** `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql` lines 19-76.

**Apply to:** New migration `20260421000001_rate_limit_duplicate_check.sql`. Always wrap CREATE TABLE + CREATE OR REPLACE FUNCTION + GRANT/REVOKE + ALTER TABLE in a single `BEGIN; ... COMMIT;` block for atomicity.

```sql
BEGIN;
-- DDL changes
CREATE TABLE IF NOT EXISTS public.rate_limit_check_duplicate ( ... );
CREATE OR REPLACE FUNCTION public.check_candidato_duplicate(...) ...;
ALTER TABLE public.autorizacoes ADD COLUMN IF NOT EXISTS policy_version text NOT NULL DEFAULT 'v1.0-2026-04';
REVOKE ALL ON FUNCTION public.check_candidato_duplicate(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_candidato_duplicate(text, text) TO anon, authenticated;
COMMIT;
```

### Vitest Mock Setup (Supabase client)

**Source:** `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` lines 24-37.

**Apply to:** All new/patched service tests and the new hook tests (for any hook that touches `supabase`).

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { supabase } from '@/lib/supabase/client'

describe('moduleName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
```

### Imperative Hook Cleanup (useEffect + refs)

**Source:** `src/features/cadastro/hooks/useViaCEP.ts` lines 229-243.

**Apply to:** `useCadastroDraft` (if it adds any debounce timer for save) and `useLeaveGuard` (for the event listener).

```typescript
useEffect(() => {
  return () => {
    // Cleanup: cancel pending timers / abort controllers / listeners
    if (timerRef.current) clearTimeout(timerRef.current)
    if (controllerRef.current) controllerRef.current.abort()
  }
}, [])
```

### Zod Schema Composition (per-step + aggregate)

**Source:** `src/features/cadastro/schemas/candidatoSchema.ts` lines 174-215 (per-step `dadosPessoaisSchema`) + 397-410 (aggregate `candidatoFormSchema`) + 431-450 (per-step validators).

**Apply to:** Any new Zod schema (none planned in Phase 2 new files — but if a plan adds one, follow this structure: sub-schemas at top, aggregate at bottom, named `validar<Step>` helper per sub-schema).

```typescript
export const dadosPessoaisSchema = z.object({ /* fields */ })
  .refine(..., { path: ['confirmar_senha'] })

export const candidatoFormSchema = z.object({
  dadosPessoais: dadosPessoaisSchema,
  endereco: enderecoSchema,
  disponibilidade: disponibilidadeSchema,
  autorizacoes: autorizacoesSchema,
})

export const validarDadosPessoais = (data: unknown) =>
  dadosPessoaisSchema.safeParse(data)
```

---

## No Analog Found

None — all Phase 2 files have a strong analog either in-feature (`cadastro/`) or in neighboring Supabase migration/functions directories. The two genuinely new files (`src/features/cadastro/constants.ts` and `supabase/functions/_shared/constants.ts`) are single-line exports and do not need an analog.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| *(none)* | — | — | 14/14 covered |

---

## Metadata

**Analog search scope:**
- `src/features/cadastro/**` (services, hooks, schemas, components, tests)
- `src/store/authStore.ts` (reference only — NOT modified)
- `supabase/functions/**` (Edge Functions + shared schemas)
- `supabase/migrations/**` (all 4 baseline + Phase 1 migrations)
- `e2e/cadastro-flow.spec.ts` (existing E2E spec)

**Files scanned:**
- 9 source files read in full (cadastroService.ts, duplicateCheckService.ts, useDuplicateCheck.ts, useViaCEP.ts, candidatoSchema.ts + index.ts, _shared/schemas.ts, cadastrar-candidato/index.ts, 20260420000003_rpc.sql)
- 5 source files read in part (CadastroMultiStepForm.tsx header, authStore.ts header, 20260420000001_rls.sql, 20260420000002_unified_auth.sql header, cadastroService.test.ts + duplicateCheckService.test.ts, cadastro-flow.spec.ts header)
- 3 directories listed (functions/, migrations/, components/steps/, services/__tests__/)

**Pattern extraction date:** 2026-04-20
