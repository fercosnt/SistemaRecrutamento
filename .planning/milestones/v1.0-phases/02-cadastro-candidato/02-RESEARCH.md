# Phase 2: Cadastro Candidato — Research

**Researched:** 2026-04-20
**Domain:** Multi-step form wiring + Edge Function contract evolution + RPC hardening + auto-login glue
**Confidence:** HIGH (most gray areas resolved by reading shipped Phase 1 code + Supabase docs; two items MEDIUM because they depend on re-deploy ergonomics the sandbox cannot exercise)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (verbatim)

**Auto-login + Success UX (CAD-06)**
- **D-01:** Session via `supabase.auth.signInWithPassword(email, senha)` logo após a Edge Function retornar `{ ok: true }`. Client mantém a senha em memória (React Hook Form state) durante o handler de success e descarta em seguida. Não exige alterar o contract da Edge Function (já deployada).
- **D-02:** Fallback de auto-login — se `signInWithPassword` falhar, retry 1x com backoff 500ms. Se ainda falhar: `navigate('/auth/login?email=<email>')` + toast Sonner "Cadastro concluído. Faça login para continuar." (conta foi criada com sucesso; só o auto-login falhou).
- **D-03:** Success feedback — redirect direto para `/candidato/perfil` + toast Sonner `"Cadastro concluído! Bem-vindo(a), {primeiro_nome}."`. Sem modal, sem tela intermediária.
- **D-04:** Loading durante submit — botão "Criar conta" vira "Criando..." com `Loader2` inline e `disabled=true`. Padrão do form atual.

**Error Handling (CAD-03, CAD-07)**
- **D-05:** Contract estruturado na Edge Function — alterar `cadastrar-candidato/index.ts` e `_shared/schemas.ts` para retornar `{ ok: false, error_code: 'EMAIL_EXISTS' | 'CPF_EXISTS' | 'VALIDATION' | 'SERVER_ERROR', message: string, field?: string }`. `message` segue em pt-BR cordial para fallback.
- **D-06:** Client error routing — `cadastroService` mapeia `error_code`: `EMAIL_EXISTS`/`CPF_EXISTS` → erro inline no Step 1 + auto-navigate + toast; `VALIDATION` → erro inline no campo indicado por `field` se presente; `SERVER_ERROR`/`NETWORK_ERROR` → toast genérico + botão re-habilitado para retry.
- **D-07:** Race de duplicate no submit — se duplicado só pegar na Edge Function (janela entre debounce e submit), auto-navigate para Step 1 + erro inline. Form não reseta; Steps 2-4 permanecem.
- **D-08:** Tom da copy — pt-BR cordial sem jargão técnico. Nunca repassar mensagem crua de Supabase/Postgres ao usuário.

**Duplicate Check — RPC + Timing + Rate Limit (CAD-03)**
- **D-09:** RPC `public.check_candidato_duplicate(p_cpf, p_email) RETURNS jsonb` SECURITY DEFINER, retornando `{ cpf_exists, email_exists }`. `duplicateCheckService` chama `supabase.rpc('check_candidato_duplicate', ...)` (já existe, mas com bug de SDK — ver D-SDK abaixo).
- **D-10:** Timing — on blur (manter comportamento atual). `useDuplicateCheck` continua disparando ao sair do campo, debounce 300ms, abort controller existente.
- **D-11:** Sem pre-submit re-check. Trust na unique constraint do banco + error UX de D-06.
- **D-12:** Rate limit Postgres-side — tabela `rate_limit_check_duplicate (ip, called_at)` + check no corpo da função (30 calls/60s por IP, via `inet_client_addr()` + `auth.uid()`). Excedente retorna `{ cpf_exists: null, email_exists: null, rate_limited: true }`.

**Form State + Navigation (CAD-01)**
- **D-13:** Persistência via sessionStorage. Hook novo `useCadastroDraft` expondo `save(step, data)`, `load()`, `clear()`. Key: `cadastro:draft:v1`. Salva Steps 1-3 **excluindo** `senha` e `confirmar_senha`. `clear()` em success, logout, e mudança de user no `onAuthStateChange`.
- **D-14:** Leave guard com `beforeunload`. Hook `useLeaveGuard(isDirty)` registra listener enquanto o form tiver dirty state. Remove em success ou unmount. `useBlocker` do React Router fica como fallback para navegação interna (não obrigatório MVP).

**LGPD (CAD-05)**
- **D-15:** Checkboxes LGPD — 1 obrigatório (`autorizacao_uso_dados`) + 3 opcionais (`comunicacao`, `retencao_curriculo`, `analise_video`). Obrigatório bloqueia submit se false.
- **D-16:** Audit trail + `policy_version`. Coluna nova `policy_version text NOT NULL DEFAULT 'v1.0-2026-04'` em `autorizacoes`. Constante `POLICY_VERSION` em `supabase/functions/_shared/constants.ts` grava a versão corrente no insert.

### Claude's Discretion
- Estrutura interna do hook `useCadastroDraft` (setTimeout vs useEffect, debounce do save)
- Nome dos `error_code` individuais (SCREAMING_SNAKE_CASE recomendados)
- Como passar `field` no `VALIDATION` error (nome canônico do campo vs path Zod)
- Implementação do leave guard (beforeunload puro vs `useBlocker`) — desde que UX seja idempotente
- Layout exato dos 4 checkboxes LGPD — `UI-SPEC.md` já prescreve "stacked cards with emphasis"
- Naming da migration do RPC (seguir padrão Supabase CLI; pode ser `0005_*` seguindo sequência)

### Deferred Ideas (OUT OF SCOPE)
- Validação live por campo vs on-Next — manter padrão RHF atual
- Re-check ao editar email/CPF depois de passar o Step 1 — `useDuplicateCheck` já é stateful
- Modal de confirmação antes do submit final
- Edição de draft entre sessões (localStorage com TTL) — sessionStorage basta
- i18n dos error codes
- Rate limit global por email (além de IP)
- Análise de senha (HaveIBeenPwned)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAD-01 | Candidato preenche formulario multi-step de 4 etapas (Dados, Endereco, Disponibilidade, Autorizacoes) | Form shell já existe (`CadastroMultiStepForm.tsx`, 537 linhas). Research confirma que só wiring falta: `useCadastroDraft` (nov) + `useLeaveGuard` (nov) + troca de `onSubmit` handler. Ver Pathway 1. |
| CAD-02 | Validação de CPF (digito verificador + formato) em tempo real | Já implementado — `cpfValidator.ts` tem 35 testes passando. Zero trabalho novo, apenas verificação de regressão. |
| CAD-03 | Validação de duplicata via Edge Function, não anon SELECT | RPC `check_candidato_duplicate` já existe (migration 0003). Migration nova adiciona rate limit (D-12). SDK upgrade necessário (Bug 5 — CAD-DEPS-01). Ver Pathways 2 + 9. |
| CAD-04 | Auto-preenchimento ViaCEP | Já implementado — `useViaCEP`, zero trabalho novo. |
| CAD-05 | Aceite LGPD (checkbox obrigatório) | Edge Function já valida via `z.literal(true)` em `_shared/schemas.ts`. Phase 2 adiciona `policy_version` + layout UI-SPEC. Ver Pathway 7. |
| CAD-06 | Auto-login após cadastro + redirect para `/candidato/perfil` | Novo — wire `signInWithPassword` + retry + toast + navigate. Ver Pathway 3. |
| CAD-07 | `cadastroService` usa Edge Function (já — Phase 1) | Já implementado. Phase 2 apenas evolui o contract (D-05). Ver Pathway 1. |
| CAD-DEPLOY-01 (carryover) | Edge Function MUST be deployed with `--no-verify-jwt` | Ver Pathway 9 / Risks. Human-action checkpoint. |
| CAD-DEPS-01 (carryover) | Upgrade `@supabase/supabase-js` para >= 2.50.x | Ver Pathway 9 / Risks. Bloqueia teste de RPC. |
| CAD-SMOKE-01 (carryover) | Happy-path cadastro end-to-end deve completar após deploy + upgrade | Validation gate — E2E spec já existe (`cadastro-flow.spec.ts`, 342 linhas). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| Alias `@/` → `src/` | All new files use `@/features/cadastro/...` imports |
| Supabase Edge Functions + RPCs for privileged ops | Duplicate check via RPC (already done); cadastro via Edge Function (already done). NO `supabaseAdmin` in client |
| TanStack Query v5 | **Cadastro é imperativo, NÃO query-based** — use `try/catch` + `useState`, não `useMutation` (pattern seguido no código atual) |
| React Hook Form + Zod (pt-BR messages) | Schemas já existem em `features/cadastro/schemas/`. Reusar |
| Zustand unified authStore | `signInWithPassword` dispara `onAuthStateChange` → authStore atualiza sozinho |
| Tailwind + shadcn/ui + Sonner + Lucide | Zero novas deps de UI — tudo já instalado |
| Playwright E2E + Vitest unit | `cadastro-flow.spec.ts` existe — estender. Vitest para unit tests dos hooks novos |
| Husky pre-commit: `tsc --noEmit` | **388 baseline TS errors** existem (Phase 1 UAT Test 11) — pre-commit bloqueia commits; usar `--no-verify` apenas quando explicitamente autorizado. NÃO usar nessa fase |
| Feature-based org | Tudo novo em `src/features/cadastro/{hooks,constants,schemas,...}` |
| `database.types.ts` NUNCA editar manual | Após criar migration do rate limit + policy_version, rodar `npm run db:types --linked` |
| Linguagem "avaliação comportamental" (nunca "IA" / "teste psicológico") | Microcopy do `analise_video` já corrigida no UI-SPEC (§D-15) |
| NUNCA rejeitar candidato por score | N/A nesta fase (scoring é Phase 9) |
| DevNavigationMenu gated por `import.meta.env.DEV` | Já implementado Phase 1 — sem ação |

---

## Summary

Phase 2 é **majoritariamente wiring**. O formulário de 4 steps, o Edge Function `cadastrar-candidato`, a RPC `check_candidato_duplicate`, e o `cadastroService` já existem — construídos em Phase 1. O trabalho real concentra-se em **5 eixos**:

1. **Evoluir o contract da Edge Function** de `{ok, error}` para `{ok, error_code, field?, message}` sem breakar o cliente atual (ele tolera; ver Pathway 1).
2. **Adicionar rate-limit Postgres-side** à RPC de duplicate check + coluna `policy_version` em `autorizacoes` via nova migration.
3. **Escrever 3 hooks/helpers novos**: `useCadastroDraft` (sessionStorage), `useLeaveGuard` (`beforeunload`), e a lógica de auto-login com retry 1x no handler de success.
4. **Resolver 2 blockers runtime herdados do UAT Phase 1** (Bugs 4 e 5): redeploy com `--no-verify-jwt` e upgrade `@supabase/supabase-js` para ≥ 2.50.x (atualmente 2.48.1 — quebra `rpc()` com nova key format).
5. **Ajustes de UI prescritos pelo UI-SPEC**: rename "Finalizar Cadastro" → "Criar conta"; desarmar o `LoadingProgress` Dialog no fluxo (mantido em código mas não aberto); collapse `font-medium`/`font-bold` para `font-semibold` no surface do cadastro; padronizar debounce para 300ms (hoje 800ms).

**Primary recommendation:** Estrutura a fase em **3 ondas**: (Wave 0) test scaffolding + Wave 0 unit tests; (Wave 1) migration SQL + Edge Function contract + `_shared/constants.ts` + client error mapping (mudanças do eixo server→client atravessam types); (Wave 2) 3 hooks novos (`useCadastroDraft`, `useLeaveGuard`, auto-login wiring) em paralelo, depois UI polish + rename + debounce alignment + E2E spec extensions. Redeploy + SDK upgrade são **human actions** no checkpoint, não tarefas de código.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Multi-step form state | Browser/Client (RHF) | sessionStorage (draft) | Form state é client-only; persist só para sobreviver a refresh acidental |
| Draft persistence | Browser (sessionStorage) | — | Pii em localStorage seria longevo demais; sessionStorage morre com a aba (D-13) |
| Duplicate check | Database (RPC) | Browser (`useDuplicateCheck` hook) | RPC SECURITY DEFINER é a única fonte autoritativa; client só apresenta |
| Rate limit (duplicate check) | Database (Postgres) | — | `inet_client_addr()` + insert numa tabela auxiliar, tudo no Postgres. Edge/client não precisam saber |
| Cadastro atômico (auth + insert) | API (Edge Function `cadastrar-candidato`) | — | Requer service_role; NUNCA pode vazar para cliente |
| Auto-login pós-cadastro | Browser (`supabase.auth.signInWithPassword`) | — | Client anon key é suficiente; dispara `onAuthStateChange` que reidrata `authStore` |
| Leave-guard (beforeunload) | Browser | React Router `useBlocker` (fallback interno) | `beforeunload` é browser-native; `useBlocker` só captura navegação SPA |
| Policy version rastreabilidade | Database (column `policy_version` em `autorizacoes`) | Edge Function (grava na insert) + Client (lê p/ mostrar versão) | Fonte de verdade no banco; constante compartilhada entre Deno e Vite |
| LGPD consent validation | API (Edge Function Zod) | Browser (RHF Zod) | Validação client-side é UX; server-side é segurança (browser pode ser bypassado) |
| Success feedback | Browser (Sonner + navigate) | — | React Router + Sonner; zero server-side |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | **≥ 2.50.x** (atualmente 2.48.1 — **upgrade obrigatório**) `[VERIFIED: package.json + Phase 1 UAT Bug 5]` | Client para Edge Function invoke + RPC call | 2.48.1 quebra `rpc()` com `sb_publishable_` key format rolled out late 2025 |
| `react-hook-form` | ^7.x (instalado) `[ASSUMED]` | Form state, `useFormContext`, `setError` para mapear erros da Edge Function | Já em uso; feature completa |
| `@hookform/resolvers/zod` | ^3.x (instalado) `[ASSUMED]` | Integração Zod ↔ RHF | Já em uso; feature completa |
| `zod` | ^3.x (instalado; Edge Function usa `https://esm.sh/zod@3`) `[VERIFIED: _shared/schemas.ts L25]` | Schemas compartilhados entre Deno e Vite (via copy, não import) | Ambos runtimes suportam |
| `react-router-dom` | ^6.22+ para `useBlocker` estável `[CITED: reactrouter.com/api/hooks/useBlocker]` | Navegação + (opcional) leave-guard interno | Projeto já usa v6; verificar versão exata |
| `sonner` | `^2.0.3` (alias em vite.config.ts) `[VERIFIED: CONVENTIONS.md §4.4]` | Toasts de erro/sucesso | Já em uso |
| `lucide-react` | (instalado) `[VERIFIED: CadastroMultiStepForm.tsx L20]` | `Loader2`, `Check`, `ChevronLeft/Right`, `AlertCircle`, `CheckCircle2`, `Shield`, `Info` | Já em uso |
| `zustand` | (instalado) `[VERIFIED: authStore.ts L19]` | Auth store unificado — NÃO mexer nesta fase | Phase 3 vai refatorar extractRole |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jwt-decode` | — (não instalar) | — | **Phase 3 scope** (AUTH-JWT-01). NÃO instalar na Phase 2 |
| `@testing-library/react` | ^14+ | Unit tests de hooks React | **Instalar junto com `@testing-library/jest-dom`** — faltante hoje (TESTING.md §5.3) mas `LoadingProgress.test.tsx` e novos tests vão precisar |
| `@testing-library/jest-dom` | ^6+ | Matchers `.toBeInTheDocument` etc. | Idem |
| `@testing-library/user-event` | ^14+ | Simular eventos de usuário em tests | Idem |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useSyncExternalStore` para `useCadastroDraft` | `useState` + `useEffect` | `useSyncExternalStore` é **overkill** — draft não é shared state entre componentes, é single-owner por form. `useEffect` com `JSON.stringify` debounced basta e é mais simples `[CITED: react.dev/reference/react/useSyncExternalStore]` |
| Biblioteca `use-session-storage-state` | Hook custom próprio | Biblioteca adiciona 1 dep + complexidade de cross-tab sync que não precisamos aqui. Hook custom de 50 linhas resolve |
| `useBlocker` puro para leave-guard | `beforeunload` + `useBlocker` combinados | Não dá — `useBlocker` só intercepta navegação SPA; não pega refresh/fechar aba. `beforeunload` é obrigatório; `useBlocker` é bônus opcional `[CITED: reactrouter.com docs]` |
| Import real do `POLICY_VERSION` cross-runtime | Copy de constante | Deno e Vite têm module resolvers diferentes; import real exige build step customizado. Copy de 1 constante vale mais a pena (ver Pathway 7) |
| `useMutation` do TanStack Query para cadastro | `useState` + try/catch imperativo | Cadastro já usa imperativo (padrão do código — `CadastroMultiStepForm.tsx:247-386`). Sem benefício de cache |

**Installation (additions only):**
```bash
# SDK upgrade (blocker — CAD-DEPS-01)
npm install @supabase/supabase-js@latest

# Test libraries for new hook unit tests
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Version verification:**
```bash
npm view @supabase/supabase-js version   # confirm >= 2.50.x before installing
```

---

## Architecture Patterns

### System Architecture Diagram — Phase 2 Cadastro

```
┌────────────────────────────────────────────────────────────────────────┐
│                       BROWSER (React SPA)                              │
│                                                                        │
│  CadastroMultiStepForm                                                 │
│    │                                                                   │
│    ├── useForm (RHF + zodResolver)                                     │
│    │     └── candidatoFormSchema (existing)                            │
│    │                                                                   │
│    ├── useCadastroDraft (NEW)                                          │
│    │     ├── save(data) — strips senha/confirmar_senha                 │
│    │     ├── load() — on mount; Sonner toast "Retomamos..."            │
│    │     └── clear() — on success / logout / user-change               │
│    │     storage: sessionStorage['cadastro:draft:v1']                  │
│    │                                                                   │
│    ├── useLeaveGuard(isDirty) (NEW)                                    │
│    │     └── window.addEventListener('beforeunload', ...)              │
│    │         ↳ browser shows default localized dialog                  │
│    │                                                                   │
│    ├── useDuplicateCheck (existing — patch: debounce 800→300ms)        │
│    │     └── calls duplicateCheckService                               │
│    │           └── supabase.rpc('check_candidato_duplicate', ...)      │
│    │                                                                   │
│    └── onSubmit handler (rewired)                                      │
│          │                                                             │
│          ├── [1] cadastroService.cadastrarCandidato(data)              │
│          │       └── supabase.functions.invoke('cadastrar-candidato')  │
│          │                                                             │
│          ├── [2] if ok: supabase.auth.signInWithPassword(email, senha) │
│          │       ├── onAuthStateChange fires → authStore.setSession    │
│          │       └── retry 1x (500ms backoff) if first attempt fails   │
│          │                                                             │
│          ├── [3] if signIn ok: clear draft + navigate('/candidato/     │
│          │       perfil') + toast success                              │
│          │                                                             │
│          ├── [4] if signIn fail after retry: navigate('/auth/login?    │
│          │       email=<email>') + toast "Cadastro concluído. Faça     │
│          │       login para continuar."                                │
│          │                                                             │
│          └── [5] if invoke returns ok:false:                           │
│                  map error_code → action:                              │
│                    EMAIL_EXISTS | CPF_EXISTS → setError Step 1 +       │
│                                                 auto-navigate + toast  │
│                    VALIDATION → setError field indicated by            │
│                                 response.field (if present) or toast   │
│                    SERVER_ERROR | NETWORK_ERROR → toast + re-enable    │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS (sb_publishable_ anon key)
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE RUNTIME (Deno)                        │
│                                                                        │
│  cadastrar-candidato/index.ts                                          │
│    ├── (NEW) reads POLICY_VERSION from _shared/constants.ts            │
│    ├── parses body with cadastroCandidatoSchema (existing)             │
│    ├── on Zod fail → { ok:false, error_code:'VALIDATION',              │
│    │                  field: <mapped from issue.path>, message: ... } │
│    ├── supabaseAdmin.auth.admin.createUser                             │
│    │   └── on "already" → { ok:false, error_code:'EMAIL_EXISTS',       │
│    │                        field:'email', message:... }              │
│    ├── insert candidatos                                               │
│    │   └── on 23505 cpf → EMAIL_EXISTS/CPF_EXISTS w/ field             │
│    ├── insert disponibilidade (best-effort)                            │
│    └── insert autorizacoes (best-effort)                               │
│        └── payload now includes `policy_version: POLICY_VERSION`       │
└────────────────────────────────────────────────────────────────────────┘
                               │
                               │ service_role (Postgres)
                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       POSTGRES (Supabase)                              │
│                                                                        │
│  tables:                                                               │
│    candidatos (existing; constraints email/cpf UNIQUE)                 │
│    autorizacoes (existing; NEW COLUMN: policy_version text NOT NULL    │
│                                        DEFAULT 'v1.0-2026-04')         │
│    disponibilidade (existing)                                          │
│    rate_limit_check_duplicate (NEW: ip inet, called_at timestamptz)    │
│                                                                        │
│  functions:                                                            │
│    check_candidato_duplicate(p_cpf, p_email) (existing — PATCH):       │
│      1. Insert row (inet_client_addr(), now()) in                      │
│         rate_limit_check_duplicate                                     │
│      2. Count rows for same IP in last 60s                             │
│      3. If > 30 → RETURN {cpf_exists:null, email_exists:null,          │
│                           rate_limited:true}                           │
│      4. Else → normal boolean response + rate_limited:false (omit or   │
│                false for backward compat)                              │
│      5. Optional: DELETE expired rows inline (rows older than 60s)     │
│                                                                        │
│  RLS: unchanged — anon revoked on candidatos; RPC still granted to     │
│       anon + authenticated                                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (Phase 2 additions only)

```
src/features/cadastro/
├── constants.ts                        # NEW — POLICY_VERSION mirror + draft key
├── hooks/
│   ├── useCadastroDraft.ts             # NEW
│   ├── useLeaveGuard.ts                # NEW
│   └── __tests__/                      # NEW — unit tests for both
│       ├── useCadastroDraft.test.ts
│       └── useLeaveGuard.test.ts
├── services/
│   ├── cadastroService.ts              # PATCH — extend CadastroError code union + error_code mapping
│   └── __tests__/
│       └── cadastroService.test.ts     # PATCH — new cases for error_code handling
└── components/
    └── CadastroMultiStepForm.tsx       # PATCH — wire hooks, rewrite onSubmit, rename "Finalizar Cadastro" → "Criar conta", soft-disable pattern, no LoadingProgress dialog
        steps/
          └── AutorizacoesStep.tsx      # PATCH — policy version caption, microcopy from UI-SPEC

supabase/
├── functions/
│   ├── _shared/
│   │   ├── schemas.ts                  # PATCH — add error_code types; extend Zod error → field mapping helper
│   │   └── constants.ts                # NEW — POLICY_VERSION = 'v1.0-2026-04'
│   └── cadastrar-candidato/
│       └── index.ts                    # PATCH — emit structured error codes; include policy_version on insert
├── migrations/
│   └── 20260421000001_rate_limit_duplicate_check.sql   # NEW — table + RPC patch + policy_version column

e2e/
└── cadastro-flow.spec.ts               # PATCH — add happy path (auto-login), error paths (EMAIL_EXISTS, CPF_EXISTS, rate_limited), draft restore
```

### Pattern 1: Server-Structured Error + Client Routing

**What:** Edge Function emits `error_code` enum; client maps to action (inline field error + step navigation + toast).

**When to use:** Any API where recovery action depends on failure type (not just a string message).

**Example (server side — Deno):**
```typescript
// supabase/functions/cadastrar-candidato/index.ts (sketch)
type ErrorCode = 'EMAIL_EXISTS' | 'CPF_EXISTS' | 'VALIDATION' | 'SERVER_ERROR'

function errorResponse(code: ErrorCode, message: string, field?: string) {
  return jsonResponse({ ok: false, error_code: code, message, field }, 400)
}

// On Zod fail:
if (!parsed.success) {
  const firstIssue = parsed.error.errors[0]
  const field = zodPathToFieldName(firstIssue?.path)  // e.g. ['endereco', 'cep'] → 'cep'
  return errorResponse('VALIDATION', firstIssue?.message || 'Dados inválidos', field)
}

// On unique violation from candidatos insert:
const raw = candidatoError?.message ?? ''
if (raw.includes('cpf')) return errorResponse('CPF_EXISTS', 'Este CPF já está cadastrado.', 'cpf')
if (raw.includes('email')) return errorResponse('EMAIL_EXISTS', 'Este email já está cadastrado.', 'email')
```

**Example (client side):**
```typescript
// src/features/cadastro/services/cadastroService.ts (patched)
export class CadastroError extends Error {
  constructor(
    message: string,
    public code:
      | 'EMAIL_EXISTS'
      | 'CPF_EXISTS'
      | 'VALIDATION'
      | 'SERVER_ERROR'
      | 'NETWORK_ERROR'
      | 'UNKNOWN_ERROR',
    public field?: string,
  ) {
    super(message)
    this.name = 'CadastroError'
  }
}

// Mapping in invoke handler:
if (!responseData.ok) {
  const raw = responseData as { error_code?: string; message?: string; field?: string }
  const code = (raw.error_code ?? 'UNKNOWN_ERROR') as CadastroError['code']
  throw new CadastroError(raw.message ?? 'Erro', code, raw.field)
}
```

### Pattern 2: Auto-Login with Single Retry

```typescript
// Inside onSubmit after cadastrarCandidato resolves:
async function autoLogin(email: string, senha: string): Promise<boolean> {
  const first = await supabase.auth.signInWithPassword({ email, password: senha })
  if (!first.error) return true
  await new Promise(r => setTimeout(r, 500))
  const second = await supabase.auth.signInWithPassword({ email, password: senha })
  return !second.error
}
```

### Pattern 3: Draft Hook (minimal)

```typescript
// src/features/cadastro/hooks/useCadastroDraft.ts
const KEY = 'cadastro:draft:v1'
type DraftData = Omit<CandidatoFormData, never> & { _savedAt: number }

export function useCadastroDraft() {
  const save = useCallback((data: Partial<CandidatoFormData>) => {
    // Strip sensitive fields defensively
    const safe = { ...data, dadosPessoais: { ...data.dadosPessoais } }
    delete (safe.dadosPessoais as any).senha
    delete (safe.dadosPessoais as any).confirmar_senha
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ ...safe, _savedAt: Date.now() }))
    } catch (e) {
      console.warn('[cadastro] draft save failed', e)
    }
  }, [])

  const load = useCallback((): Partial<CandidatoFormData> | null => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as DraftData
      const { _savedAt, ...rest } = parsed
      return rest
    } catch { return null }
  }, [])

  const clear = useCallback(() => { sessionStorage.removeItem(KEY) }, [])

  return { save, load, clear }
}
```

### Pattern 4: beforeunload Leave-Guard

```typescript
// src/features/cadastro/hooks/useLeaveGuard.ts
export function useLeaveGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''   // required for Chromium; custom string ignored since 2017
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
```

### Anti-Patterns to Avoid

- **Não usar `localStorage` para draft PII.** sessionStorage morre com aba, localStorage sobrevive meses — risco LGPD desnecessário.
- **Não salvar `senha`/`confirmar_senha` em storage.** NUNCA. Strip explicitamente antes de serializar.
- **Não fazer re-check de duplicate antes do submit** (D-11). Confia na unique constraint + error UX.
- **Não abrir o `LoadingProgress` Dialog no cadastro.** UI-SPEC § "LoadingProgress Dialog deprecation" — inline spinner + soft-disable + toast.loading após 2s.
- **Não tentar customizar string do `beforeunload`.** Browsers modernos (Chrome 119+, Safari 17+, Firefox 110+) ignoram — default localizado é o esperado.
- **Não depender de TanStack Query para o submit.** Padrão do código é `useState` + try/catch. Mudar agora é creep de escopo.
- **Não usar `supabase.from('candidatos').select()` anônimo.** Foi revogado em Phase 1 (migration 0001). Deve falhar — se funcionar, há policy residual para remover.
- **Não mexer em extractRole / LoginRHPage.** Bugs 1-2 são Phase 3. Tocar aqui é expandir escopo e arriscar blocker.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence em `localStorage` custom | Manual JWT serialization | `supabase-js` `persistSession: true` (já configurado) | Supabase gerencia rotação de refresh token |
| Toast notifications | `alert()` / modal caseiro | `sonner` (já instalado) | Acessibilidade, `aria-live`, queue, stacking |
| Form validation cross-field | `onChange` imperativo | `zod.refine()` + `@hookform/resolvers/zod` | Já é padrão do projeto (schemas em `candidatoSchema.ts`) |
| Rate limiting | Check in client only | Postgres table + SECURITY DEFINER function (D-12) | Client-side trivialmente bypass; DB-side é autoritativo `[CITED: blog.mansueli.com/rate-limiting-supabase]` |
| CPF digit verifier | Regex só | `validateCPF()` existente (35 testes, utils/cpfValidator.ts) | Já tem algoritmo Receita Federal correto |
| Cross-tab logout | Manual `storage` event | `onAuthStateChange` (Supabase) | Phase 1 já implementou (mesmo com bug de rotação de refresh token — Phase 3 scope) |
| Custom debounce para input | `setTimeout` inline | `useDuplicateCheck` hook existente | Já tem abort controller + cache de último valor |
| Inline progress/stage dialog | `LoadingProgress` com intervalos fake | Inline Loader2 + `toast.loading` após 2s (UI-SPEC) | Edge Function é atômica — não há estágios reais |

**Key insight:** tudo que parece novo nesta fase já tem equivalente em produção — a tentação é reescrever. Resistir. O risco de quebra em Phase 1 deliverables (5 plans merged, 25 commits) é real.

---

## Runtime State Inventory

Phase 2 **não é rename/refactor** — é greenfield wiring + contract evolution. Porém **2 categorias importam**:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **1. `autorizacoes` table baseline tem 8 colunas** (id, candidato_id, 4 autorizacao_*, created_at, updated_at) — NÃO tem `ip_aceite`, `data_aceite`, `user_id`, ou `policy_version`. Edge Function atual (index.ts L236-247) tenta inserir `user_id`, `ip_aceite`, `data_aceite` — insert falha silencioso (best-effort). **2. `candidatos` table: autor do cadastro é inserido pelo Edge Function; qualquer registro EXISTENTE em prod não tem `policy_version` (precisa backfill). ** | **Migration nova adiciona `policy_version`** (D-16). **Backfill default `'v1.0-2026-04'`** para linhas existentes (DEFAULT na coluna resolve). **Investigar se `ip_aceite`/`data_aceite`/`user_id` devem ser adicionados à `autorizacoes`** (inspecionar docs/sql/sql/* legacy) — se já existem em prod, o database.types.ts está desatualizado; se não existem, Edge Function está gravando campos fantasma e deve ser corrigido. **Recommendation: criar migration que adiciona todas as colunas necessárias explicitamente** (`user_id uuid NULL REFERENCES auth.users`, `ip_aceite inet NULL`, `data_aceite timestamptz NULL DEFAULT now()`, `policy_version text NOT NULL DEFAULT 'v1.0-2026-04'`) + regenerar `database.types.ts`. |
| Live service config | **1. Edge Function `cadastrar-candidato` está DEPLOYADA em produção** (Supabase project `isljnozzlvckrgjjbjwp`). **2. Deploy NÃO usou `--no-verify-jwt` — gateway rejeita anonymous caller com 401 (Phase 1 UAT Test 9)**. **3. RPC `check_candidato_duplicate` está aplicada via migration 0003 (db push feito) mas não testável com SDK atual.** | **REDEPLOY da Edge Function com `--no-verify-jwt`** (carryover Bug 4). **Human action — documentar no CHECKPOINT**. Após redeploy, a invocação anônima funciona. **Reapply migration** após patch da RPC (adicionar rate limit) via `supabase db push`. |
| OS-registered state | None — sem cron jobs, systemd, launchd relevantes | — |
| Secrets/env vars | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` auto-injected pelo Edge Runtime. Client usa `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (`sb_publishable_` format). | **Nenhuma ação** — sem rotação necessária. Verificar se a anon key publicada é a `sb_publishable_` format (ela é — é o motivo do Bug 5). |
| Build artifacts / installed packages | **1. `@supabase/supabase-js@2.48.1` em `node_modules/` — incompatível com `sb_publishable_` key format (Bug 5).** **2. `database.types.ts` — 3218 linhas, tem `check_candidato_duplicate` mas pode estar desatualizado para a coluna `policy_version` após nova migration.** **3. `LoadingProgress.tsx` (cadastro/components) — não será usado no submit do cadastro, mas permanece no bundle.** | **`npm install @supabase/supabase-js@latest`** (CAD-DEPS-01). **`npm run db:types --linked`** após aplicar nova migration. **LoadingProgress fica como dead-code-ish (mantido p/ Phase 4 CV upload)** — aceitável; planner decide se remove. |

**The canonical question:** *Após atualizar todos os arquivos, o que em runtime ainda referencia o contract antigo `{ok, error}`?* Resposta: **cliente `cadastroService.ts` L174-196 tolera `responseData.error` se `responseData.ok === false`** — isto é compatível com `error_code` adicional no payload (não quebra). Porém qualquer consumidor novo deve ler `error_code` explicitamente. Zero regressão no client antigo.

---

## Implementation Pathways

### Pathway 1: Edge Function Contract Migration — `{ok, error}` → `{ok, error_code, field?, message}`

**Confidence:** HIGH

**Constraint from CONTEXT:** D-05 — cliente espera contract evoluído; D-08 — `message` continua em pt-BR (fallback).

**Current state (`supabase/functions/cadastrar-candidato/index.ts`):**
- Retorna `{ ok: false, error: string }` em 5 caminhos (L86, L93, L106, L132, L181).
- `_shared/schemas.ts` tem os inputs mas **nenhum tipo de response/error**.

**Zero-downtime migration:**

A estratégia **não precisa de dual-contract** porque:
1. O cliente atual (`cadastroService.ts` L174) lê `responseData.ok` e `responseData.error` — se adicionarmos `error_code`, `field`, e mantivermos `error` como alias para `message` (OR renomearmos `error` → `message`), o cliente velho continua funcionando **se mantivermos `error`**.
2. Há UM ÚNICO cliente e UMA ÚNICA Edge Function — ambos deployados juntos. Zero tráfego de clientes "legados" em outra versão.

**Recomendação:** **Cortar direto** — renomear `error` → `message` no payload da Edge Function + adicionar `error_code` e opcional `field`. Atualizar `cadastroService.ts` no mesmo commit. Redeploy único.

**Entretanto — cliente em produção no momento do redeploy:** se usuário estiver no meio do formulário durante o deploy e submeter imediatamente após o deploy da Edge Function mas antes do reload do bundle do client, ele pega a Edge Function nova com o contract novo. O client antigo (ainda em memória) lê `responseData.error` — que agora é `undefined` — e cai no fallback genérico. **UX ruim mas não critical:** toast dirá "Erro desconhecido" e user retry. Submit POST foi rejeitado (por validação server-side) então não há cadastro parcial.

**Mitigation aceitável:** **Manter `error` ALIAS de `message` no payload server** por 1 release (dual-field output). Cliente novo lê `error_code` + `message`. Cliente velho lê `error`. Em Phase 3, remover `error`.

**Shared schemas deployment:**
- Deno resolve `../_shared/schemas.ts` via relative import. A CLI `npx supabase functions deploy cadastrar-candidato` walks the dep graph e faz upload de ambos os arquivos. Ver `01-05-CHECKPOINT.md` L37-40: confirmado que sharing via `_shared/` funciona.
- Client (Vite) **não importa** `_shared/schemas.ts` — runtimes são disjuntos (Deno `esm.sh/zod@3` vs Vite `zod` local). **Não há shared types em TS entre os dois hoje** — o contract é implícito (ambos os lados têm seu próprio Zod schema). Isto é OK para MVP. Phase 2 mantém a separação.

**Client-side patch (`cadastroService.ts`):**

```typescript
// After invoke():
if (!responseData || !responseData.ok) {
  const err = responseData as Partial<{
    error_code: CadastroError['code']
    message: string
    field: string
    error: string   // legacy fallback
  }>
  const code = err.error_code ?? 'UNKNOWN_ERROR'
  const message = err.message ?? err.error ?? 'Erro desconhecido no servidor'
  throw new CadastroError(message, code, undefined, undefined, { field: err.field })
}
```

Extend `CadastroError` class:
```typescript
export class CadastroError extends Error {
  constructor(
    message: string,
    public code:
      | 'EMAIL_EXISTS'
      | 'CPF_EXISTS'
      | 'VALIDATION'
      | 'SERVER_ERROR'
      | 'NETWORK_ERROR'
      | 'EDGE_FUNCTION_ERROR'  // keep for SDK-level failures
      | 'UNKNOWN_ERROR',
    public table?: string,
    public originalError?: unknown,
    public details?: { field?: string },
  ) { super(message); this.name = 'CadastroError' }
}
```

The consumer in `CadastroMultiStepForm.tsx:312-386` (catch block) gets restructured to **switch on `err.code`** instead of string-match messages.

---

### Pathway 2: RPC `check_candidato_duplicate` — Rate Limit + Return Shape

**Confidence:** HIGH

**Current state (`supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql`):**
- Function exists, returns `jsonb` `{cpf_exists, email_exists}`.
- SECURITY DEFINER with `SET search_path = ''`.
- Grants: `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO anon, authenticated`.
- NO rate limiting.
- `database.types.ts:2748-2751` tipa como `{ Args: { p_cpf: string; p_email: string }; Returns: Json }` — return é `Json` genérico (não específico).

**New migration (example):**

```sql
-- supabase/migrations/20260421000001_rate_limit_duplicate_check.sql

BEGIN;

-- 1. Rate limit audit table
CREATE TABLE IF NOT EXISTS public.rate_limit_check_duplicate (
  id         bigserial PRIMARY KEY,
  ip         inet NOT NULL,
  user_id    uuid NULL,
  called_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial index for the 60-second query window
CREATE INDEX IF NOT EXISTS idx_rate_limit_check_duplicate_ip_recent
  ON public.rate_limit_check_duplicate (ip, called_at DESC);

-- Harden: only postgres (function owner) touches this table
REVOKE ALL ON TABLE public.rate_limit_check_duplicate FROM PUBLIC, anon, authenticated;

-- 2. Patched RPC
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
  v_ip          inet;
  v_user_id     uuid;
  v_recent_count int;
  result        jsonb;
BEGIN
  v_cpf_clean   := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  v_email_clean := lower(trim(COALESCE(p_email, '')));
  v_ip          := inet_client_addr();
  v_user_id     := auth.uid();   -- null for anon; fine

  -- Rate limit check: 30 calls / 60s per (ip, user_id) composite
  SELECT count(*) INTO v_recent_count
  FROM public.rate_limit_check_duplicate
  WHERE (ip = v_ip OR (v_user_id IS NOT NULL AND user_id = v_user_id))
    AND called_at > (now() - interval '60 seconds');

  IF v_recent_count >= 30 THEN
    RETURN jsonb_build_object(
      'cpf_exists',   null,
      'email_exists', null,
      'rate_limited', true
    );
  END IF;

  -- Log this call
  INSERT INTO public.rate_limit_check_duplicate (ip, user_id, called_at)
  VALUES (v_ip, v_user_id, now());

  -- Opportunistic cleanup: delete rows > 5 min old (cheap; amortized)
  DELETE FROM public.rate_limit_check_duplicate
  WHERE called_at < (now() - interval '5 minutes');

  -- Existing duplicate check logic
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
    END,
    'rate_limited', false
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.check_candidato_duplicate(text, text) IS
  'Returns {cpf_exists, email_exists, rate_limited}. SECURITY DEFINER with '
  'embedded 30 calls/60s per (IP, user_id) rate limit using rate_limit_check_duplicate. '
  'Opportunistic cleanup deletes rows > 5min old on each call.';

COMMIT;
```

**Key design decisions:**

1. **Rate limit key = composite (IP OR user_id)**: anonymous users identified only by IP; authenticated users (rare for this endpoint) identified by both. Attacker com VPN rotating + signed up users can still hit limits.
2. **Opportunistic cleanup inline** (5 min old rows) — preferred over pg_cron because pg_cron adds infra dependency; inline cleanup is <1ms per call and auto-prunes `[CITED: blog.mansueli.com/rate-limiting-supabase]`.
3. **Rate limit = 30 calls / 60s** per CONTEXT D-12. Generous enough for legit form user (max ~6 blur events para CPF + email retyping).
4. **`rate_limited: false` sempre presente** no return — permite cliente sempre ler a flag sem checar `undefined`.

**Return type in `database.types.ts`:** Current type is `Returns: Json` (linha 2750). After migration + regen, still `Json`. **Type narrowing happens in client** (`duplicateCheckService.ts` L178-183 já faz runtime validation). Patch para adicionar `rate_limited: boolean`.

**Supabase `rpc()` return typing:** [Supabase generates `Returns: Json` for `jsonb` return type](https://supabase.com/docs/guides/database/postgres/row-level-security). There's no way to get a narrower type from the generated types — must cast in client. This is acceptable and already the pattern.

**Client side (`duplicateCheckService.ts` patch):**

```typescript
interface CheckCandidatoDuplicateResponse {
  cpf_exists: boolean | null
  email_exists: boolean | null
  rate_limited: boolean
}

// After call:
if (response.rate_limited) {
  // New error code
  throw new DuplicateCheckError(
    'Muitas tentativas. Aguarde alguns instantes.',
    'RATE_LIMITED',
    cpfCleaned ? 'cpf' : 'email',
  )
}
```

**`DuplicateCheckError` code union:** add `'RATE_LIMITED'`.

**Hook (`useDuplicateCheck`) patch:** `onError` callback sees `RATE_LIMITED` → show Sonner warning toast (UI-SPEC § Error Code → UI Mapping).

---

### Pathway 3: `signInWithPassword` Timing + Retry

**Confidence:** HIGH

**Failure modes to handle:**
1. **Auth server warm-up after `auth.admin.createUser`**: Supabase auth.users insert is synchronous (part of Edge Function return). By the time the Edge Function returns `{ ok: true }`, the user exists. Race risk: low, but replication lag in rare cases.
2. **Rate-limit do Supabase Auth**: default é ~30 tentativas/hora por IP. Happy path faz 1 tentativa; retry adiciona 1. Low risk.
3. **PKCE race**: client uses `flowType: 'pkce'` (verificado em `src/lib/supabase/client.ts:57` via ARCHITECTURE.md). `signInWithPassword` doesn't use PKCE (PKCE é para OAuth redirect). Zero risk.
4. **Network flakiness**: the most common real-world failure.

**Strategy per D-02:** 1x retry with 500ms backoff. If both fail, navigate to login with prefilled email + success toast.

```typescript
async function tryAutoLogin(email: string, password: string): Promise<boolean> {
  const attempt1 = await supabase.auth.signInWithPassword({ email, password })
  if (!attempt1.error) return true

  // Backoff 500ms per D-02
  await new Promise(r => setTimeout(r, 500))

  const attempt2 = await supabase.auth.signInWithPassword({ email, password })
  return !attempt2.error
}

// In onSubmit success path:
const loggedIn = await tryAutoLogin(
  formData.dadosPessoais.email,
  formData.dadosPessoais.senha,   // still in RHF state, in memory only
)

if (loggedIn) {
  draft.clear()
  // onAuthStateChange will fire; authStore will reactively update
  const primeiroNome = formData.dadosPessoais.nome_completo.split(' ')[0]
  toast.success(`Cadastro concluído! Bem-vindo(a), ${primeiroNome}.`)
  navigate('/candidato/perfil', { replace: true })
} else {
  // Fallback — account exists, only auto-login failed
  draft.clear()
  toast.success('Cadastro concluído. Faça login para continuar.')
  navigate(`/auth/login?email=${encodeURIComponent(formData.dadosPessoais.email)}`)
}
```

**Why senha is still in memory:** at the moment of `onSubmit`, RHF has the form values via `methods.getValues()`. The senha field is in React state (not sessionStorage). After `await tryAutoLogin`, we exit the handler and RHF state is garbage-collected when the form unmounts (on navigate). **No explicit zeroing needed for MVP** — the memory is released by GC, and no code re-reads the form state after navigate. For future hardening (Phase 5), could use `methods.reset()` before navigate to null out fields.

**Password visibility duration:** from `onSubmit` start to `tryAutoLogin` completion (~500ms-1.5s typical). Acceptable for this phase.

---

### Pathway 4: Error Code → Field Mapping

**Confidence:** HIGH

**Server side — Zod path → flat field name:**

```typescript
// supabase/functions/_shared/schemas.ts — new helper
export function zodPathToFieldName(path: (string | number)[] | undefined): string | undefined {
  if (!path || path.length === 0) return undefined
  // Canonical mapping: nested paths flatten to the LAST segment (leaf)
  // e.g. ['endereco', 'cep'] → 'cep'
  //      ['autorizacoes', 'autorizacao_uso_dados'] → 'autorizacao_uso_dados'
  //      ['email'] → 'email'
  const leaf = path[path.length - 1]
  return typeof leaf === 'string' ? leaf : undefined
}
```

**Why leaf:** client's RHF uses nested paths (`dadosPessoais.email`). Server returns flat (`email`). Client mapping layer resolves:

```typescript
// src/features/cadastro/services/cadastroService.ts — helper
const FIELD_TO_STEP_PATH: Record<string, string> = {
  email:              'dadosPessoais.email',
  cpf:                'dadosPessoais.cpf',
  nome_completo:      'dadosPessoais.nome_completo',
  telefone:           'dadosPessoais.telefone',
  data_nascimento:    'dadosPessoais.data_nascimento',
  senha:              'dadosPessoais.senha',
  cep:                'endereco.cep',
  logradouro:         'endereco.logradouro',
  numero:             'endereco.numero',
  bairro:             'endereco.bairro',
  cidade:             'endereco.cidade',
  estado:             'endereco.estado',
  autorizacao_uso_dados: 'autorizacoes.autorizacao_uso_dados',
  // ... (all leaves mapped)
}

const FIELD_TO_STEP_INDEX: Record<string, number> = {
  email: 0, cpf: 0, nome_completo: 0, telefone: 0, data_nascimento: 0, senha: 0,
  cep: 1, logradouro: 1, numero: 1, bairro: 1, cidade: 1, estado: 1,
  autorizacao_uso_dados: 3,
  // ...
}
```

**Ambiguous cases:** if server returns `field: 'estado'` and there are two uses of `estado` (none in current schema, but defensively), mapping is deterministic (always maps to `endereco.estado`). Collisions don't exist in current schema.

**Fallback when field is ambiguous / missing:** `VALIDATION` without `field` → Sonner toast "Há um problema com os dados enviados. Revise o formulário e tente novamente." + user stays on current step. UI-SPEC § Error Code → UI Mapping already locks this.

---

### Pathway 5: sessionStorage Draft Hook — React 18 Concurrent Safety

**Confidence:** HIGH

**PII risk: sessionStorage vs localStorage:**
- `sessionStorage` dies with tab close. Tab duration ≤ cadastro session (~10 min). Acceptable for LGPD — user is actively in the flow.
- `localStorage` persists months/years. For PII (nome_completo, cpf, email, data_nascimento), this is **NOT acceptable** — LGPD Art. 16 exige minimização. Deferred idea "localStorage com TTL" rejected (CONTEXT).

**Fields to strip before save:**
- `dadosPessoais.senha` (confidential; never stored)
- `dadosPessoais.confirmar_senha` (same)
- Optionally `instagram`/`linkedin` if they're considered sensitive? — not required; keep them.

**React 18 concurrent-mode safety:**
- `useCadastroDraft` is NOT a shared-state hook. Only `CadastroMultiStepForm` uses it. No tearing risk. **`useEffect` + plain callbacks são suficientes.**
- `useSyncExternalStore` seria necessário apenas se multiple componentes precisassem ler o draft reativamente — não é o caso `[CITED: react.dev/reference/react/useSyncExternalStore]`.

**Save trigger strategy:**
- **Option A (recommended):** RHF `watch()` + `useEffect` debounced 500ms. On every form field change, schedule a save 500ms later. Cancel on next change. **Simple, performant.**
- **Option B:** Save on "Próximo" click (step transition). **Too coarse** — user loses work if they refresh mid-step.
- **Option C:** Save every blur event. **Too spammy** — 10+ saves per step.

**Recommended (A):**
```typescript
// Inside CadastroMultiStepForm
const watchedData = methods.watch()
const draft = useCadastroDraft()
useEffect(() => {
  const timer = setTimeout(() => draft.save(watchedData), 500)
  return () => clearTimeout(timer)
}, [watchedData, draft])
```

**Clear triggers (per D-13):**
1. **Success path:** `draft.clear()` após `tryAutoLogin` OK.
2. **Logout:** subscribe to `useAuthStore` or Supabase `onAuthStateChange` with event `SIGNED_OUT` → clear.
3. **User change via `onAuthStateChange`:** if event === 'USER_UPDATED' or session user.id changes → clear (handled by `authStore`'s existing subscription — just add a side-effect listener).

**Restore on mount:**
```typescript
// On CadastroMultiStepForm mount
useEffect(() => {
  const saved = draft.load()
  if (saved) {
    methods.reset(saved)
    toast.info('Retomamos seu cadastro de onde você parou.', {
      action: { label: 'Começar do zero', onClick: () => { draft.clear(); methods.reset() } },
    })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])  // once on mount only
```

**Edge case: draft schema drift.** If the saved draft has fields from an old schema (future migration), `methods.reset(saved)` will silently ignore unknown fields and skip required ones. **Mitigation: key suffix `v1`.** If schema breaks, bump to `v2` and stale drafts are ignored.

---

### Pathway 6: `beforeunload` Leave-Guard — React 18 + React Router

**Confidence:** HIGH

**Browser behavior (2026):**
- `beforeunload` still works. Custom message string is **ignored** by Chrome 119+, Safari 17+, Firefox 110+ — browsers show localized default dialog. `[CITED: MDN + UI-SPEC § Browser beforeunload Warning]`
- To trigger dialog: `event.preventDefault()` + `event.returnValue = ''` (empty string is enough for Chromium; Firefox also honors).

**Registration + cleanup (React 18 safe):**
```typescript
useEffect(() => {
  if (!isDirty) return
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = ''
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])
```

**`isDirty` source:** RHF `formState.isDirty` — true after any field change. Pass down: `useLeaveGuard(methods.formState.isDirty && !isSubmitSuccess)`.

**Interaction with React Router `useBlocker`:**

| Navigation type | `beforeunload` | `useBlocker` (v6.22+) |
|-----------------|----------------|----------------------|
| Browser back button / forward | ❌ (already-navigated) | ✅ intercepts |
| Tab close / window close | ✅ intercepts | ❌ |
| Refresh (F5) | ✅ intercepts | ❌ |
| Typing new URL | ✅ intercepts | ❌ |
| Clicking internal `<Link>` or `navigate()` | ❌ | ✅ intercepts |
| Cross-origin navigation | ✅ | ❌ |

**Recommendation (CONTEXT D-14):** `beforeunload` é **obrigatório** (cobre tab close + refresh — the actual loss scenarios). `useBlocker` é **bonus opcional** (cobre click em `<Link>` do DevNavigationMenu no dev, etc.) — **MVP não requer** `useBlocker`. Adicionar se tempo sobrar.

**Reference:** [reactrouter.com/api/hooks/useBlocker](https://reactrouter.com/api/hooks/useBlocker) — stable since v6.4.

**Safari specific gotcha:** Safari may not fire `beforeunload` on iOS in some PWA modes. Acceptable for MVP (web-only).

**Cleanup triggers:**
- On submit start: remove listener (não avisar mid-submit) — UI-SPEC prescreve.
- On submit success: listener já foi removido.
- On unmount: listener removed automaticamente by the cleanup function.

---

### Pathway 7: Policy Version Constant Sharing (Deno ↔ Vite)

**Confidence:** HIGH

**The problem:** `POLICY_VERSION = 'v1.0-2026-04'` needs to exist in:
1. **Edge Function (Deno)** — inserted on `autorizacoes` row (D-16).
2. **Client (Vite)** — displayed in `AutorizacoesStep.tsx` caption (UI-SPEC § Saiba mais affordance).

**Option A (recommended): copy of constant in two files.**

```typescript
// supabase/functions/_shared/constants.ts (Deno)
export const POLICY_VERSION = 'v1.0-2026-04' as const

// src/features/cadastro/constants.ts (Vite)
export const POLICY_VERSION = 'v1.0-2026-04' as const
```

**Rationale:**
- Deno uses URL-resolved imports (`https://esm.sh/...`) and can't cleanly import from `src/` (different project root).
- Vite uses Node-style resolution and alias `@/*` → `src/*`; can't cleanly import from `supabase/functions/_shared/` (different dependency graph, would pull Deno-specific deps).
- Bridging via build step (e.g. `scripts/sync-policy-version.ts`) is overkill for one string.

**Drift risk mitigation:**
- Add a comment in BOTH files: `// IMPORTANT: must match ../../../src/features/cadastro/constants.ts` / vice-versa.
- Unit test (Phase 2 Wave 0): `expect(POLICY_VERSION).toBe('v1.0-2026-04')` in client. Not a cross-file sync test (can't run Deno from Vitest) but forces an explicit lock.
- **Policy for future bumps**: when changing, grep for `v1.0-2026-04` across repo and update all hits in one commit.

**Option B (rejected): generate from one source of truth.** Too much machinery for 1 string.

**Option C (rejected): store in database config table.** Edge Function would SELECT on every insert — unnecessary round-trip.

---

### Pathway 8: Validation Architecture (Nyquist)

**Confidence:** HIGH

See full Validation Architecture section below.

---

### Pathway 9: Regression Risks — Phase 1 Deliverables

**Confidence:** HIGH

**Phase 2 edits shared types + already-deployed Edge Function + production migration.** What breaks?

**Shared type change (`_shared/schemas.ts`):**
- Currently: `cadastroCandidatoSchema` + `type CadastroCandidatoInput`.
- Phase 2 adds: response error types (`CadastroErrorCode` union, `CadastroErrorResponse` shape, `zodPathToFieldName` helper).
- **Regression risk:** low. Existing consumers (`cadastrar-candidato/index.ts`) re-import from same module; TypeScript check catches missing imports.

**Edge Function deployed in prod (`cadastrar-candidato`):**
- Prod state: deployed WITHOUT `--no-verify-jwt` → 401 on anonymous calls (Bug 4).
- Phase 2 redeploys WITH `--no-verify-jwt` + new code (structured errors, policy_version).
- **Regression risk:** MEDIUM. If redeploy fails mid-deployment, function is left in inconsistent state. **Mitigation:** Supabase CLI is atomic (upload then swap). Roll-back = redeploy old code.

**5 plans already merged in Phase 1 (`01-01` to `01-05`):**
- `01-01`: service_role removed from bundle. **Phase 2 does NOT re-introduce** — double-check no new `supabaseAdmin` imports.
- `01-02`: unified auth store. **Phase 2 must NOT modify `authStore.ts`** — mexer aqui reintroduz Bugs 1-2.
- `01-03`: RoleGuard. **Phase 2 does NOT touch routing** except adding `/cadastro` is already public.
- `01-04`: migrations + types pipeline + RPC. **Phase 2 ADDS migration 0005 and regenerates types.** Must run `npm run db:types --linked` after migration apply, or `tsc` fails.
- `01-05`: App.tsx simplification + Edge Function. **Phase 2 patches Edge Function + schemas.** App.tsx untouched.

**Husky pre-commit (388 baseline TS errors):**
- Existing errors in `src/features/vagas/*` (deferred to Phase 4) — DO NOT ATTEMPT TO FIX.
- New code in Phase 2 MUST compile clean. Otherwise commit is blocked.
- **Risk:** `database.types.ts` regen might add/remove types that ripple through Phase 2 new code. Mitigation: regen types BEFORE writing new code in the same wave.

**SDK upgrade (`@supabase/supabase-js` 2.48.1 → 2.50.x+):**
- Upgrade may introduce breaking changes for other consumers (`authStore.ts`, `lib/supabase/client.ts`, existing services).
- **Risk:** MEDIUM. Check the 2.49.x + 2.50.x changelog for breaking changes before upgrade.
- **Mitigation:** `npm run lint` + `npm run build` + manual smoke test of login flow (already-known-working) post-upgrade.

**DevNavigationMenu gated by `import.meta.env.DEV` (Phase 1 FOUND-06):** Phase 2 does NOT touch.

**Carryover bugs (DO NOT FIX in Phase 2):**
- Bug 1 (`extractRole`) — Phase 3.
- Bug 2 (LoginRHPage forge) — Phase 3.
- Bug 3 (`useVagas` column) — Phase 4.

---

## Common Pitfalls

### Pitfall 1: SDK upgrade ripples
**What goes wrong:** Upgrading `@supabase/supabase-js` from 2.48 to 2.50+ changes internal types used by `authStore`, `client.ts`, existing services.
**Why it happens:** Major-minor bumps often refine internal type signatures.
**How to avoid:** Upgrade in its own commit. Run `npm run lint` → `npm run build` → full E2E suite before any Phase 2 wiring. If lint errors appear, fix them (typically narrowed type declarations) before proceeding.
**Warning signs:** `tsc --noEmit` errors that didn't exist before; browser console errors in login flow after upgrade.

### Pitfall 2: `database.types.ts` drift
**What goes wrong:** Migration 0005 adds `policy_version` column + rate_limit table. Without running `db:types --linked`, Edge Function inserts untyped; client RPC call types stale.
**Why it happens:** Easy to forget regen step (not automated in husky; manual per `01-04-CHECKPOINT.md`).
**How to avoid:** Add a Wave 1 task: "After apply migration 0005, run `npm run db:types --linked` and COMMIT the regenerated `database.types.ts`."
**Warning signs:** `autorizacoes.Insert` type in `database.types.ts` lacking `policy_version` after migration apply; `rate_limit_check_duplicate` table absent from types.

### Pitfall 3: Edge Function redeploy timing vs client release
**What goes wrong:** Client bundle with new error mapping deployed before Edge Function is redeployed with new contract. Client expects `error_code` → sees `undefined` → toast "Erro desconhecido".
**Why it happens:** Two deployments, two pipelines (Vercel vs Supabase). Order matters.
**How to avoid:** **Edge Function deploy FIRST, then client deploy.** Document in CHECKPOINT. Client maintains backward compat by reading `err.message ?? err.error` (Pathway 1 pattern).
**Warning signs:** Fresh form submissions hitting UNKNOWN_ERROR in Vercel logs right after client deploy.

### Pitfall 4: beforeunload fires mid-submit
**What goes wrong:** User submits form; `isDirty` is still true; browser closes/refreshes mid-submit; `beforeunload` dialog appears with no context of "processing in progress".
**Why it happens:** The form is still "dirty" from RHF's POV until `reset()` or successful submit.
**How to avoid:** UI-SPEC § Submit Loading State prescribes **removing beforeunload listener at submit start**. Implement: set a local flag `isSubmitting`; leave-guard hook respects it (no listener if `isSubmitting === true`). Re-attach on submit failure.
**Warning signs:** Users report "the site asked me if I wanted to leave WHILE it was saving".

### Pitfall 5: Rate limit self-DDoS in E2E tests
**What goes wrong:** Playwright spec runs CPF/email blur events rapidly → 30 calls / 60s exceeded → test sees `rate_limited: true` unexpectedly.
**Why it happens:** Tests are fast; rate limit is per-IP.
**How to avoid:** **Test seed step** uses direct SQL to insert known duplicate (one SELECT, not RPC call). E2E spec's duplicate check happens at most 2-3 times per test. For CI stress tests, whitelist GitHub Actions runner IPs OR seed `rate_limit_check_duplicate` with rows aged past 60s before each test.
**Warning signs:** Intermittent `rate_limited` failures in cadastro-flow.spec.ts — especially when running many specs in parallel.

### Pitfall 6: signInWithPassword rate-limited after many E2E runs
**What goes wrong:** E2E creates N accounts with different emails, each calls `signInWithPassword` once. Supabase Auth rate-limits at ~30/hour per IP → E2E starts failing after several runs.
**Why it happens:** Auth rate limit is coarser than RPC rate limit.
**How to avoid:** Keep E2E cadastro tests low-volume (1 happy path per run). Use distinct test emails with timestamp suffix (already done: `test+${Date.now()}@...`). In CI, don't re-run cadastro specs on flaky retries.
**Warning signs:** `signInWithPassword` returning `429 Too Many Requests` in E2E logs.

### Pitfall 7: Password leaked to logs
**What goes wrong:** `cadastroService` or Edge Function logs full body `console.log(data)` — includes plaintext senha.
**Why it happens:** Debug logs left in.
**How to avoid:** Audit all `console.log` in `cadastrar-candidato/index.ts`, `cadastroService.ts`, `CadastroMultiStepForm.tsx`. Redact `password` / `senha` / `confirmar_senha` explicitly. Phase 1 UAT Test 7.1 flagged this area.
**Warning signs:** `grep -r "password" src/features/cadastro/ supabase/functions/cadastrar-candidato/` — any non-type-declaration match needs review.

### Pitfall 8: Leave guard blocks programmatic navigate on success
**What goes wrong:** After `navigate('/candidato/perfil')`, `beforeunload` still attached briefly fires on the next navigation.
**Why it happens:** React cleanup is async; listener still live for ~1 frame.
**How to avoid:** Before calling `navigate()`, set `isDirty` to false via a ref/flag that the hook respects. OR in UI-SPEC pattern: clear `beforeunload` at submit start (not success).
**Warning signs:** User sees "Leave site?" dialog right before dashboard loads.

### Pitfall 9: Schema drift between client Zod (candidatoSchema.ts) and server Zod (_shared/schemas.ts)
**What goes wrong:** Client Zod validates `senha` with strong requirements (`A-Z + a-z + 0-9`, line 139-156); server Zod only checks length (line 118). User bypasses client → weak password reaches Auth.
**Why it happens:** Two independent schema files (can't share across Deno/Vite).
**How to avoid:** Server schema MUST enforce AT LEAST the same minimum as client. Current server: `min(8)`. Client: `min(8) + regex`. **Recommendation:** align server to match client — add uppercase/lowercase/digit refines. Phase 2 opportunity.
**Warning signs:** User submits weak password (e.g. `"12345678"`) via devtools → account created.

---

## Code Examples

### Operation 1: cadastroService with structured error mapping

```typescript
// src/features/cadastro/services/cadastroService.ts (patched)
// Source: synthesis from Phase 2 CONTEXT D-05, D-06 + current implementation

export class CadastroError extends Error {
  constructor(
    message: string,
    public code:
      | 'EMAIL_EXISTS' | 'CPF_EXISTS'
      | 'VALIDATION'
      | 'SERVER_ERROR' | 'NETWORK_ERROR'
      | 'EDGE_FUNCTION_ERROR' | 'UNKNOWN_ERROR',
    public field?: string,  // e.g. 'email', 'cpf', 'cep', or undefined
    public originalError?: unknown,
  ) { super(message); this.name = 'CadastroError' }
}

export async function cadastrarCandidato(data: CandidatoFormData): Promise<CadastroCompleteResult> {
  try {
    const { data: responseData, error: invokeError } =
      await supabase.functions.invoke<{
        ok: boolean
        data?: { userId: string; candidatoId: string; disponibilidadeId?: string; autorizacoesId?: string }
        error_code?: CadastroError['code']
        message?: string
        field?: string
        error?: string  // legacy alias during transition
      }>('cadastrar-candidato', { body: buildBody(data) })

    if (invokeError) {
      throw new CadastroError(
        invokeError.message || 'Falha ao invocar função de cadastro',
        'NETWORK_ERROR', undefined, invokeError,
      )
    }

    if (!responseData?.ok) {
      const code = (responseData?.error_code ?? 'UNKNOWN_ERROR') as CadastroError['code']
      const msg = responseData?.message ?? responseData?.error ?? 'Erro desconhecido no servidor'
      throw new CadastroError(msg, code, responseData?.field)
    }

    if (!responseData.data?.userId || !responseData.data?.candidatoId) {
      throw new CadastroError(
        'Resposta da função de cadastro está incompleta',
        'EDGE_FUNCTION_ERROR', undefined, responseData,
      )
    }

    return {
      userId: responseData.data.userId,
      candidatoId: responseData.data.candidatoId,
      disponibilidadeId: responseData.data.disponibilidadeId,
      autorizacoesId: responseData.data.autorizacoesId,
    }
  } catch (err) {
    if (err instanceof CadastroError) throw err
    throw new CadastroError(
      'Erro inesperado ao cadastrar candidato.',
      'NETWORK_ERROR', undefined, err,
    )
  }
}
```

### Operation 2: onSubmit handler in CadastroMultiStepForm (reshape)

```typescript
// src/features/cadastro/components/CadastroMultiStepForm.tsx (new handleFormSubmit sketch)
// Source: Phase 2 CONTEXT D-01 through D-07 + UI-SPEC

const navigate = useNavigate()
const draft = useCadastroDraft()
useLeaveGuard(methods.formState.isDirty && !isSubmitting && !submitSuccess)

const handleFormSubmit = async () => {
  setIsSubmitting(true)
  const submitLoadingTimer = setTimeout(() => {
    toast.loading('Criando sua conta...', { id: 'cadastro-submit' })
  }, 2000)

  try {
    const formData = methods.getValues()
    const result = candidatoFormSchema.safeParse(formData)
    if (!result.success) {
      toast.error('Há erros no formulário. Por favor, revise todos os campos.')
      return
    }

    await cadastrarCandidato(result.data)  // throws CadastroError on failure

    const loggedIn = await tryAutoLogin(
      result.data.dadosPessoais.email,
      result.data.dadosPessoais.senha,
    )

    draft.clear()
    setSubmitSuccess(true)  // leave-guard hook reads this; stops warning
    const primeiroNome = result.data.dadosPessoais.nome_completo.split(' ')[0]

    if (loggedIn) {
      toast.success(`Cadastro concluído! Bem-vindo(a), ${primeiroNome}.`, { duration: 5000 })
      navigate('/candidato/perfil', { replace: true })
    } else {
      toast.success('Cadastro concluído. Faça login para continuar.', { duration: 5000 })
      navigate(`/auth/login?email=${encodeURIComponent(result.data.dadosPessoais.email)}`)
    }
  } catch (err) {
    if (err instanceof CadastroError) {
      routeCadastroError(err, methods, setCurrentStepIndex, toast)
    } else {
      toast.error('Erro inesperado. Tente novamente.')
    }
  } finally {
    clearTimeout(submitLoadingTimer)
    toast.dismiss('cadastro-submit')
    setIsSubmitting(false)
  }
}

function routeCadastroError(err: CadastroError, methods: UseFormReturn<CandidatoFormData>, setStep: (i: number) => void, toast: ReturnType<typeof useFormToast>) {
  switch (err.code) {
    case 'EMAIL_EXISTS':
      setStep(0)
      methods.setError('dadosPessoais.email', { type: 'duplicate', message: err.message })
      toast.error('Este email já está cadastrado. Tente fazer login ou use outro email.', undefined, { duration: 6000 })
      return
    case 'CPF_EXISTS':
      setStep(0)
      methods.setError('dadosPessoais.cpf', { type: 'duplicate', message: err.message })
      toast.error('Este CPF já está cadastrado. Tente fazer login ou verifique se é o correto.', undefined, { duration: 6000 })
      return
    case 'VALIDATION':
      if (err.field && FIELD_TO_STEP_INDEX[err.field] !== undefined) {
        setStep(FIELD_TO_STEP_INDEX[err.field])
        methods.setError(FIELD_TO_STEP_PATH[err.field] as any, { message: err.message })
      }
      toast.error('Há um problema com os dados enviados. Revise o formulário.', undefined, { duration: 6000 })
      return
    case 'SERVER_ERROR':
    case 'NETWORK_ERROR':
    default:
      toast.error(
        err.code === 'NETWORK_ERROR'
          ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
          : 'Algo deu errado do nosso lado. Tente novamente em alguns instantes.',
        undefined, { duration: 6000 },
      )
  }
}
```

### Operation 3: Rate-limited RPC client handling

```typescript
// src/features/cadastro/services/duplicateCheckService.ts (patched)
export class DuplicateCheckError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'RATE_LIMITED',
    public field?: DuplicateCheckField,
  ) { super(message); this.name = 'DuplicateCheckError' }
}

// Inside callDuplicateRpc, after parsing response:
const response = data as { cpf_exists: boolean | null; email_exists: boolean | null; rate_limited: boolean }
if (response.rate_limited) {
  throw new DuplicateCheckError(
    'Muitas tentativas. Aguarde alguns instantes.',
    'RATE_LIMITED',
  )
}
// ... rest unchanged
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Anonymous SELECT on `candidatos` for duplicate check | SECURITY DEFINER RPC `check_candidato_duplicate` | Phase 1 (migrations 0001+0003) | Locked down PII enumeration; now add rate limit (Phase 2) |
| `supabaseAdmin` from client | Edge Function with service_role | Phase 1 (D-01) | service_role off bundle; `cadastrarCandidato` delegates |
| `{ ok, error }` string contract | `{ ok, error_code, field?, message }` structured | Phase 2 (D-05) | Client can route errors without string-matching |
| `LoadingProgress` Dialog with fake stages | Inline `Loader2` + `toast.loading` after 2s | Phase 2 (UI-SPEC) | Honest UX; Edge Function is atomic |
| `supabase-js` 2.48.1 (legacy anon key) | 2.50.x+ (supports `sb_publishable_`) | Phase 2 (CAD-DEPS-01) | Unblocks `rpc()` + `functions.invoke` |
| `autorizacoes` audit fields absent | Adds `policy_version`, `ip_aceite`, `data_aceite`, `user_id` | Phase 2 (D-16 + migration new) | LGPD trail enables future consent revocation |
| "Finalizar Cadastro" CTA | "Criar conta" | Phase 2 (UI-SPEC Microcopy) | More precise verb |
| Debounce 800ms on duplicate check | Debounce 300ms | Phase 2 (align CONTEXT D-10 vs legacy code) | Faster feedback; within hook's abort controller coverage |

**Deprecated/outdated (code still present but not to be used):**
- `src/features/cadastro/components/LoadingProgress.tsx` — keep in repo for Phase 4 CV upload reuse, but do NOT open in cadastro submit.
- Legacy setters in `authStore.ts` (`setAdminUser`, `setCandidato`, etc.) — marked `@deprecated`, don't call from new code.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-hook-form` version >= 7.x installed | Standard Stack | Low — project imports from `react-hook-form` and uses `FormProvider` — clearly v7+ |
| A2 | `@hookform/resolvers/zod` installed | Standard Stack | Low — used in `CadastroMultiStepForm.tsx:19` |
| A3 | React Router DOM is >= 6.22 (for `useBlocker` stable) | Pathway 6 | MEDIUM — `useBlocker` is optional in Phase 2; if version is older, beforeunload alone suffices |
| A4 | Supabase generates `Returns: Json` for jsonb RPCs with no way to narrow | Pathway 2 | Low — verified in `database.types.ts:2748-2751` current state |
| A5 | `inet_client_addr()` returns a real IP in Supabase Edge runtime | Pathway 2 | MEDIUM — should verify: Supabase runs Postgres behind a proxy; `inet_client_addr()` may return the proxy IP (making rate limit per-proxy, not per-user). Fallback: pass IP from Edge Function via RPC arg (but RPC is called by browser directly, not via Edge Function). **Flag for Wave 1 SQL test: insert test rows with different IPs and verify `inet_client_addr()` behavior in prod** |
| A6 | Supabase `signInWithPassword` rate limit is ~30/hour per IP | Pitfall 6 | Low — documented on supabase.com/docs/guides/auth/rate-limits; exact number may be higher on Pro plan |
| A7 | `cadastroService` `EDGE_FUNCTION_ERROR` union preserved alongside new codes | Pathway 1 | Low — kept intentionally for SDK-level failures distinct from server-structured errors |
| A8 | LGPD legal team approves `POLICY_VERSION = 'v1.0-2026-04'` as initial version string | Pathway 7 | Low — internal convention; can be changed before go-live |

**Per the claims tagged `[ASSUMED]` in-line:**
- `react-hook-form ^7.x` version — not verified from package.json directly; inferred from API usage.
- `@hookform/resolvers ^3.x` — same.

**None of these assumptions block planning.** They're flagged so the planner can confirm or adjust in discussion.

---

## Open Questions

1. **Does `inet_client_addr()` return the true client IP in Supabase's Postgres?**
   - What we know: Supabase runs Postgres behind PgBouncer and a proxy; IP might be proxy.
   - What's unclear: whether the rate limit is per-client-IP or per-proxy-IP (which would be useless — one proxy means all clients share limit).
   - Recommendation: add a Wave 1 SQL exploration task — call `SELECT inet_client_addr()` from a test RPC, compare to the IP in `x-forwarded-for` header visible to the Edge Function. If they differ, pass IP as RPC argument from the edge-function-mediated flow. **For the direct-from-browser RPC call, we depend on `inet_client_addr()`; if it's the proxy, rate limit becomes per-proxy which is too permissive — in that case, mitigation: supplement with a composite key using `auth.uid()` for authenticated + a signed client-provided rate-limit-bucket-id (out of scope MVP).**

2. **Does the `autorizacoes` table in prod already have `ip_aceite`, `data_aceite`, `user_id` columns?**
   - What we know: `database.types.ts` shows they don't exist. Edge Function tries to insert them (best-effort, fails silently).
   - What's unclear: whether there's a legacy migration in `docs/sql/sql/*` that added them to prod but didn't get included in the consolidated baseline.
   - Recommendation: SQL audit query during Wave 0 — `\d public.autorizacoes` via `supabase db query`. If columns exist, regen types and update `Insert`. If not, new migration adds all 4 columns + `policy_version` in one shot.

3. **What version of `@supabase/supabase-js` should we pin to?**
   - What we know: 2.48.1 is broken (Bug 5). `@latest` as of research time is ≥ 2.50.x.
   - What's unclear: whether 2.50.x has known regressions affecting login, Edge Function invoke, or auth store integration.
   - Recommendation: install `@latest`, run full lint + build + manual login smoke test BEFORE starting new code. If regressions, downgrade to the first version >= 2.50.x that handles `sb_publishable_` keys cleanly (likely 2.50.0 itself).

4. **Should `--no-verify-jwt` be set in `config.toml` instead of CLI flag?**
   - What we know: Supabase 2026 supports both methods `[CITED: supabase.com/docs/guides/functions/function-configuration]`.
   - What's unclear: whether the current repo has a `supabase/config.toml` with per-function settings, and whether committing the setting there is preferred over CLI-flag runbook docs.
   - Recommendation: add `[functions.cadastrar-candidato]` block with `verify_jwt = false` in `supabase/config.toml` (if exists) — single source of truth, no runbook gotcha.

5. **Is `pg_cron` available on this Supabase project plan for rate-limit cleanup?**
   - What we know: opportunistic cleanup inline in the RPC works without cron.
   - What's unclear: if traffic spikes, rate_limit table could grow. Cron cleanup would be safer.
   - Recommendation: start with inline cleanup (current plan). If table grows > 10K rows, add cron job via `pg_cron` in Phase 3 or later.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite dev/build, Vitest | ✓ | 18+ (project uses) | — |
| Supabase CLI | `db:types --linked`, function deploy, `db push` | Assumed ✓ | `^1.x` | User-machine action; cannot run in sandbox |
| `@supabase/supabase-js` ≥ 2.50.x | RPC + functions invoke on `sb_publishable_` keys | ✗ (installed 2.48.1) | 2.48.1 → upgrade | **Cannot skip — blocker** |
| `@testing-library/react` | Unit tests for new hooks + LoadingProgress | ✗ | — | Install in Wave 0 |
| `@testing-library/jest-dom` | Matchers for RTL tests | ✗ | — | Install in Wave 0 |
| `@testing-library/user-event` | Simulating input in RTL tests | ✗ | — | Install in Wave 0 |
| Playwright | E2E specs | ✓ | ^1.56.1 | — |
| Vitest + happy-dom | Unit test runner | ✓ | ^4.0.7 + ^20.0.10 | — |
| Postgres `inet_client_addr()` | Rate limit key | ✓ (standard Postgres) | — | See Open Question 1 |
| Supabase Edge Runtime env vars (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) | Function runtime | ✓ (auto-injected) | — | Already provisioned per `01-05-CHECKPOINT.md` |

**Missing dependencies with no fallback:**
- `@supabase/supabase-js` ≥ 2.50.x — blocker. Must be installed. Human action in Wave 0.

**Missing dependencies with fallback:**
- `@testing-library/*` — fallback is to write hook tests using only Vitest primitives (`renderHook` would then need to be hand-rolled). Not recommended; install the libraries.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest ^4.0.7 + happy-dom ^20.0.10 |
| Unit config file | `vite.config.ts` (test block) |
| Unit quick run command | `npx vitest run src/features/cadastro` |
| Unit full suite command | `npm run test:run` |
| E2E framework | Playwright ^1.56.1 |
| E2E config file | `playwright.config.ts` |
| E2E quick run command | `npx playwright test cadastro-flow --project=chromium` |
| E2E full suite command | `npm run test:e2e` |
| SQL tests | pgTAP NOT available; inline queries in a `supabase/tests/` dir (NEW — optional) or test via RPC call from Vitest with a test Supabase key |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| CAD-01 | 4-step form submit with valid data → cadastro row | e2e | `npx playwright test cadastro-flow -g "happy path"` | 🟡 PATCH (`e2e/cadastro-flow.spec.ts` exists, needs happy-path-with-auto-login case) |
| CAD-02 | CPF validator blocks invalid digit verifier | unit | `npx vitest run src/features/cadastro/utils/__tests__/cpfValidator.test.ts` | ✅ (35 tests passing) |
| CAD-03 (RPC path) | RPC returns `{cpf_exists: true}` when CPF registered | integration | `npx vitest run src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` | 🟡 PATCH (exists, needs `rate_limited` case + migration to use RPC mock) |
| CAD-03 (rate limit) | RPC returns `{rate_limited: true}` after 30 calls | SQL | Manual via supabase SQL editor OR new Vitest integration test hitting live RPC | ❌ Wave 0 — new test |
| CAD-04 | CEP input auto-fills city/state | e2e | `npx playwright test cadastro-flow -g "ViaCEP"` | ✅ (covered in existing spec) |
| CAD-05 | Submit blocked without `autorizacao_uso_dados` | e2e + server Zod test | `npx playwright test cadastro-flow -g "LGPD"` | 🟡 PATCH (exists, verify) |
| CAD-05 (policy_version) | autorizacoes.policy_version defaults to `'v1.0-2026-04'` | integration / SQL | Vitest integration test inserts via Edge Function, reads row | ❌ Wave 0 — new test |
| CAD-06 | After submit, user is logged in and lands on /candidato/perfil | e2e | `npx playwright test cadastro-flow -g "auto-login"` | ❌ Wave 0 — new spec case |
| CAD-06 fallback | If signInWithPassword fails twice, redirect to `/auth/login?email=X` | e2e + unit | unit: mock supabase, verify navigate; e2e: hard to simulate | ❌ Wave 0 — unit test in `cadastroService.test.ts` or new `CadastroMultiStepForm.integration.test.tsx` |
| CAD-07 | cadastroService uses `functions.invoke`, not `supabaseAdmin` | unit / static | Grep `grep -r "supabaseAdmin" src/features/cadastro/ \|\| echo PASS` | ✅ (structural; lint check) |
| useCadastroDraft | `save()` strips senha/confirmar_senha | unit | `npx vitest run src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts` | ❌ Wave 0 |
| useCadastroDraft | `load()` returns null when no draft | unit | idem | ❌ Wave 0 |
| useCadastroDraft | `clear()` removes sessionStorage key | unit | idem | ❌ Wave 0 |
| useLeaveGuard | Adds listener on dirty, removes on clean | unit | `npx vitest run src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts` | ❌ Wave 0 |
| useLeaveGuard | Calls event.preventDefault + returnValue on beforeunload | unit | idem | ❌ Wave 0 |
| Error routing | EMAIL_EXISTS code → setError on dadosPessoais.email + step 0 | unit | Part of CadastroMultiStepForm.test.tsx (NEW) | ❌ Wave 0 |
| Error routing | VALIDATION code → step navigation based on field | unit | idem | ❌ Wave 0 |
| Race duplicate | Server EMAIL_EXISTS caught after debounce passed | e2e (hard) / integration (feasible) | Mock server to always return EMAIL_EXISTS for specific email | ❌ Wave 0 — integration in `cadastroService.test.ts` |
| RPC rate limit | After 30 fast calls, RPC returns rate_limited | integration (hits live test DB) | Vitest integration test | ❌ Wave 0 — new test |
| regression: useVagas 400 | Ensure Phase 4 bug doesn't suddenly break cadastro (shouldn't) | — | — | N/A — separate scope |

### Sampling Rate

- **Per task commit:** `npx vitest run <changed-area>` (< 5s for most). Husky pre-commit runs `npm run lint` (tsc --noEmit) — no test exec.
- **Per wave merge:** `npm run test:run` (full Vitest) + `npx playwright test cadastro-flow` (single spec, ~5min).
- **Phase gate:** Full suite green before `/gsd-verify-work` — `npm run test:run && npm run test:e2e` (all E2E specs).

### Wave 0 Gaps

- [ ] **Install test libraries:** `npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event` — also fixes pre-existing `LoadingProgress.test.tsx` (TESTING.md §5.3).
- [ ] **Install SDK upgrade:** `npm install @supabase/supabase-js@latest`. Verify `tsc --noEmit` and build pass.
- [ ] **Create `tests/setup.ts`** with `import '@testing-library/jest-dom'` if using those matchers; update `vite.config.ts` `test.setupFiles: ['./tests/setup.ts']`.
- [ ] `src/features/cadastro/hooks/__tests__/useCadastroDraft.test.ts` — covers CAD-01, CAD-06 success path.
- [ ] `src/features/cadastro/hooks/__tests__/useLeaveGuard.test.ts` — covers CAD-01.
- [ ] `src/features/cadastro/components/__tests__/CadastroMultiStepForm.integration.test.tsx` — covers error_code routing for CAD-03, CAD-06, CAD-07.
- [ ] `src/features/cadastro/services/__tests__/cadastroService.test.ts` — PATCH for new error codes (EMAIL_EXISTS, CPF_EXISTS, VALIDATION, RATE_LIMITED via duplicate service), auto-login retry scenarios.
- [ ] `src/features/cadastro/services/__tests__/duplicateCheckService.test.ts` — PATCH to add `rate_limited` return case.
- [ ] `e2e/cadastro-flow.spec.ts` — EXTEND with: (a) happy path auto-login to /candidato/perfil with toast; (b) EMAIL_EXISTS path → step 1 error; (c) CPF_EXISTS path; (d) draft auto-restore; (e) LGPD mandatory blocks submit; (f) rate-limited toast.
- [ ] (Optional) `supabase/tests/` OR `src/features/cadastro/services/__tests__/rpcRateLimit.integration.test.ts` — hits live RPC with 31 rapid calls, asserts `rate_limited: true` on 31st.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (`signInWithPassword`, `auth.admin.createUser` via Edge Function service_role); no custom auth code |
| V3 Session Management | yes | Supabase JS SDK handles JWT + refresh (multi-tab issue deferred to Phase 3) |
| V4 Access Control | partial | RPC SECURITY DEFINER restricts access; Edge Function guarded by `--no-verify-jwt` explicitly (intentional; input validation compensates) |
| V5 Input Validation | **yes (primary)** | `zod` schemas on BOTH client (UX) and server (security). Server-side is authoritative |
| V6 Cryptography | yes | Supabase Auth hashes passwords (bcrypt) — never touched client-side |
| V7 Error Handling | yes | Structured `error_code`; no raw SQL/Postgres messages leak to client (D-08) |
| V8 Data Protection | yes | PII only in sessionStorage (LGPD-aligned); senha NEVER persisted |
| V9 Communications | yes | HTTPS enforced by Supabase |
| V12 Files / Resources | partial | N/A this phase (no upload) |
| V13 API | yes | Response contract validated; CORS headers correct |

### Known Threat Patterns for React 18 + Supabase + Edge Function

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CPF/email enumeration via RPC | Information Disclosure | RPC returns booleans only (no row leak) + rate limit (Pathway 2) |
| LGPD consent bypass | Tampering (circumvent client validation) | Server Zod schema asserts `z.literal(true)` on `autorizacao_uso_dados` — independent of client |
| Password in sessionStorage / log | Information Disclosure | Strip before save (Pathway 5); audit `console.log` (Pitfall 7) |
| SQL injection via CPF/email params | Tampering | `regexp_replace` + `trim/lower` defensive cleans + parameterized query |
| Brute-force duplicate check for phishing ("does email X have account?") | Info Disclosure | Rate limit 30/60s per IP limits enumeration to ~43K/day — not zero but meaningful friction |
| Anonymous Edge Function abuse (DDoS signup) | DoS | `--no-verify-jwt` is intentional for anon signup; Edge Function charges service_role quota. Supabase Auth rate limit (~30 signUps/hour/IP by default) provides some floor |
| Session fixation via auto-login | Session Mgmt | `signInWithPassword` creates new session; no token reuse |
| `policy_version` tampering | Tampering | Grava apenas na Edge Function server-side; client não influencia |
| Race: two browsers submit same CPF concurrently | Inconsistency | Postgres UNIQUE constraint + EMAIL_EXISTS handling (D-07) |

---

## Sources

### Primary (HIGH confidence)

- **Phase 2 CONTEXT.md** — 16 locked decisions (D-01 through D-16) — `.planning/phases/02-cadastro-candidato/02-CONTEXT.md`
- **Phase 2 UI-SPEC.md** — design contract, 6/6 dimensions approved — `.planning/phases/02-cadastro-candidato/02-UI-SPEC.md`
- **Phase 1 CONTEXT.md** — D-01, D-01a, D-01b (Edge Function + RPC baseline) — `.planning/phases/01-foundation-saneada/01-CONTEXT.md`
- **Phase 1 UAT.md** — Bugs 4 & 5 (CAD-DEPLOY-01, CAD-DEPS-01), Tests 9, 10 — `.planning/phases/01-foundation-saneada/01-UAT.md`
- **Phase 1 KNOWN-ISSUES-CARRYOVER-PHASE-3.md** — Bugs 1, 2 (DO NOT FIX), Bugs 4, 5 (FIX in Phase 2)
- **Existing code** — `supabase/functions/cadastrar-candidato/index.ts`, `supabase/functions/_shared/schemas.ts`, `supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql`, `src/features/cadastro/services/{cadastroService,duplicateCheckService}.ts`, `src/features/cadastro/hooks/useDuplicateCheck.ts`, `src/features/cadastro/components/CadastroMultiStepForm.tsx`, `src/features/cadastro/components/steps/AutorizacoesStep.tsx`, `src/store/authStore.ts`, `database.types.ts`
- **Codebase maps** — `.planning/codebase/{ARCHITECTURE,CONVENTIONS,STRUCTURE,CONCERNS,TESTING}.md`

### Secondary (MEDIUM confidence)

- [Supabase Docs — Function Configuration (verify_jwt)](https://supabase.com/docs/guides/functions/function-configuration) — `--no-verify-jwt` flag or config.toml
- [Supabase Docs — Deploy to Production](https://supabase.com/docs/guides/functions/deploy) — deploy mechanics
- [Supabase Docs — Rate Limits](https://supabase.com/docs/guides/auth/rate-limits) — Auth rate limits per-IP
- [Supabase Docs — Securing Your API](https://supabase.com/docs/guides/api/securing-your-api) — RLS + SECURITY DEFINER patterns
- [Mansueli blog — Rate Limiting Supabase with Postgres](https://blog.mansueli.com/rate-limiting-supabase-requests-with-postgresql-and-pgheaderkit) — partial indexes + cleanup patterns
- [Supabase Docs — RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — SECURITY DEFINER optimization
- [React Router — useBlocker](https://reactrouter.com/api/hooks/useBlocker) — SPA navigation intercept
- [React Router — useBlocker design decision](https://github.com/remix-run/react-router/blob/main/decisions/0001-use-blocker.md) — explicit note that `beforeunload` is needed for non-SPA cases
- [React.dev — useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) — when needed vs unnecessary

### Tertiary (LOW confidence / unverified)

- [Yeti blog — Managing Persistent Browser Data with useSyncExternalStore](https://www.yeti.co/blog/managing-persistent-browser-data-with-usesyncexternalstore) — pattern reference
- [ClarityDev — Display Warning for Unsaved Form Data on Page Exit](https://claritydev.net/blog/display-warning-for-unsaved-form-data-on-page-exit) — combined beforeunload + useBlocker

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in repo / package.json / imports.
- Architecture patterns: HIGH — patterns already in production use (sketched from Phase 1 code).
- Error contract migration: HIGH — risk of client-server timing is known and mitigated by dual-field output during transition.
- RPC rate limit: MEDIUM — `inet_client_addr()` behavior in Supabase-behind-proxy is an Open Question; design is sound but needs runtime verification.
- Auto-login retry: HIGH — Supabase `signInWithPassword` semantics documented.
- Draft hook: HIGH — React 18 concurrent mode safety is about shared state; this hook is single-owner.
- Leave guard: HIGH — standard pattern, browser quirks documented.
- Policy version sharing: HIGH — copy-of-constant is the well-accepted pattern for Deno↔Vite.
- Test scaffolding: HIGH — Vitest + Playwright infrastructure exists.
- Regression risks: MEDIUM — SDK upgrade may ripple; cannot verify without running install.

**Research date:** 2026-04-20
**Valid until:** 2026-05-05 (2 weeks — SDK versions and Supabase docs move fast; re-verify before Phase 3 starts)
