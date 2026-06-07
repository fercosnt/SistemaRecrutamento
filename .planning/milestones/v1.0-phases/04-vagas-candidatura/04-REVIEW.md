---
phase: 04-vagas-candidatura
reviewed: 2026-04-26T12:00:00Z
depth: standard
iteration: 2
files_reviewed: 28
files_reviewed_list:
  - .gitignore
  - CLAUDE.md
  - e2e/candidatura-submit.spec.ts
  - e2e/vagas-browse.spec.ts
  - src/components/pages/FormularioCandidaturaPage.tsx
  - src/components/pages/LoginCandidatoPage.tsx
  - src/components/pages/VagaDetalhePage.tsx
  - src/components/pages/__tests__/LoginCandidatoPage.test.tsx
  - src/features/auth/utils/__tests__/pitfall7.grep.test.ts
  - src/features/vagas/hooks/__tests__/useVagaPerguntas.test.ts
  - src/features/vagas/hooks/useVagaPerguntas.ts
  - src/features/vagas/hooks/useVagas.ts
  - src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts
  - src/features/vagas/schemas/candidaturaFormSchema.ts
  - src/features/vagas/services/__tests__/candidaturasService.test.ts
  - src/features/vagas/services/__tests__/cvUploadService.test.ts
  - src/features/vagas/services/__tests__/vagasService.test.ts
  - src/features/vagas/services/candidaturasService.ts
  - src/features/vagas/services/cvUploadService.ts
  - src/features/vagas/services/vagasService.ts
  - src/features/vagas/types/vagasTypes.ts
  - src/features/vagas/utils/__tests__/isUuid.test.ts
  - src/features/vagas/utils/isUuid.ts
  - src/router/routes.tsx
  - supabase/functions/_shared/schemas.ts
  - supabase/functions/submit-candidatura/index.ts
  - supabase/migrations/20260425000001_vagas_slug_trigger.sql
  - supabase/migrations/20260425000002_curriculos_bucket.sql
  - supabase/migrations/20260425000003_submit_candidatura_rpc.sql
  - supabase/migrations/20260425000004_candidaturas_unique_constraint.sql
prior_iteration_warnings_status:
  WR-01: verified_fixed
  WR-02: verified_fixed
  WR-03: verified_fixed
  WR-04: verified_fixed
  WR-05: verified_fixed
  WR-06: verified_fixed
findings:
  critical: 0
  warning: 4
  info: 9
  total: 13
status: issues_found
---

# Phase 4: Code Review Report (Iteration 2)

**Reviewed:** 2026-04-26T12:00:00Z
**Depth:** standard
**Files Reviewed:** 28
**Iteration:** 2 (post WR-01..WR-06 fix verification)
**Status:** issues_found (0 Critical, 4 Warning, 9 Info)

## Summary

Iteration 2 covers two responsibilities: (a) verifying that the 6 warnings landed in iteration 1 (WR-01..WR-06, commits `0eabead`..`5c7c7b1`) were fixed at the root cause without regressions or surface-level patches, and (b) scanning for new issues — including those potentially introduced by the fixes themselves.

**Verification of prior fixes (all confirmed PASS):**
- **WR-01** (orphan CV cleanup) — `FormularioCandidaturaPage.tsx:345-350` correctly hoists cleanup before the error-class branching. The `!(err instanceof CVUploadServiceError)` guard combined with `removeCV`'s falsy-path guard via `uploadedPath` covers `TypeError`/`AbortError`/SDK invariant errors. Fix is at the root cause.
- **WR-02** (per-pergunta validation) — `submit-candidatura/index.ts:172-209` introduces a pre-check before the RPC call, returning `field='pergunta_id'` on mismatch. Uses `supabaseAdmin` which already has authority to read `perguntas_formulario`. No migration touched, deployable via `supabase functions deploy`. Fix is at the root cause.
- **WR-03** (stale-while-revalidate redirect race) — `FormularioCandidaturaPage.tsx:122-124, 163-168` gates redirect on `appliedQuerySettled && alreadyApplied === true`. `isSuccess` is the right TanStack Query primitive for "definitively settled". Fix is at the root cause.
- **WR-04** (hardcoded N8N URLs) — Both `candidaturasService.ts:69-83` (FE) and `submit-candidatura/index.ts:269-271` (EF) read from env vars with hardcoded fallback. Pitfall-7 grep guard still passes. Fix is correct; the fallback hardcoded URL is a pragmatic transition affordance.
- **WR-05** (synchronous `require()`) — `useVagas.ts:18-20, 221-232` replaces dynamic CommonJS require with static ESM import. Eliminates `(state: any)` casts. Fix is at the root cause.
- **WR-06** (3 sequential count queries) — `vagasService.ts:96-114` collapses the three `count: 'exact'` queries into a single `select('status')` over the same predicate, with client-side bucketing. RLS semantics preserved (RLS deny → `data: null` → all-zero, same as count `null` → 0 fallback). Fix is at the root cause; D-17 list-batch optimization correctly deferred to Phase 5.

**New findings (4 warnings, 9 info):** No critical security regressions. Four warnings flag latent correctness/security concerns that survived iteration 1 because they are scattered across the same files but unrelated to the original 6 issues. The nine info items are stylistic, pre-existing baseline drift (in `vagasTypes.ts`), and dead-code/legacy-pattern observations that should be tracked for Phase 5/6 cleanup.

## Warnings

### WR-07: Auth-gate `useEffect` in FormularioCandidaturaPage redundant with `RoleGuard`, may flap on auth hydration

**File:** `src/components/pages/FormularioCandidaturaPage.tsx:148-155`
**Issue:** The page declares its own auth-gate effect:

```tsx
useEffect(() => {
  if (!isAuthenticated) {
    const target = `/candidato/candidatura/formulario/${vagaSlug ?? ''}`
    navigate(`/auth/login?redirect=${encodeURIComponent(target)}`, { replace: true })
  }
}, [isAuthenticated, navigate, vagaSlug])
```

But the route in `router/routes.tsx:160-167` already wraps this page in `<RoleGuard role="candidato">`. The guard runs FIRST (during render, synchronously) — so by the time this effect fires, the user is guaranteed to be authenticated. **Two consequences:**

1. **Dead-code redirect target:** the `?redirect=` value is never consumed because `RoleGuard` would have already redirected an unauthenticated user with its own (potentially different) redirect strategy. The redirect target preservation contract is owned by `VagaDetalhePage:115-121` (which is anon-accessible) — that's the real entry point and it works. This effect is redundant.
2. **Auth-hydration flap:** if the Zustand `authStore` momentarily reports `isAuthenticated=false` during page mount/hydration (before the persisted session is restored), this effect can fire and redirect the user away from the formulário **even though they are logged in**. `RoleGuard` may handle the same flap, but having TWO components racing to redirect off the same boolean is fragile.

**Root cause:** belt-and-suspenders pattern accumulated during Plan 04-07 carryover — the original CARRYOVER-PLAN added the effect before confirming the route was already RoleGuard-wrapped.

**Fix:** delete the effect entirely (lines 148-155); rely on `RoleGuard`. The comment block at line 147 ("Pitfall 2 auth roundtrip") is misleading — the roundtrip is owned by VagaDetalhePage, not this page.

```tsx
// REMOVE these lines (148-155):
// useEffect(() => {
//   if (!isAuthenticated) { ... navigate(`/auth/login?redirect=...`) }
// }, [isAuthenticated, navigate, vagaSlug])
```

If a defensive redirect is desired, gate it on a settled-auth-store flag (e.g. `useAuthStore((s) => s.hydrated)`) so the effect only fires once the store has resolved its persisted session.

---

### WR-08: Unhandled promise rejection — `navigator.clipboard.writeText` returns a Promise but is called synchronously

**File:** `src/components/pages/VagaDetalhePage.tsx:148-153`
**Issue:**

```tsx
case 'copy':
  navigator.clipboard.writeText(url)
  toast.success('Link copiado!', { ... })
  break
```

`navigator.clipboard.writeText` returns a `Promise<void>` and rejects when (a) the document is not focused, (b) the document is in an insecure context (HTTP), (c) the user has denied clipboard-write permission, or (d) Safari's transient activation requirement is not met. The current code:
- **Shows success toast even on rejection** — user thinks the link was copied when it wasn't.
- **Triggers an unhandled promise rejection** that fires `window.onunhandledrejection` (visible in DevTools console as a warning, may surface in error-tracking integrations as a real error).

**Root cause:** missing `await` / `.then()` / `.catch()`. Pre-existing pattern in this file (was there before Plan 04-06), but Plan 04-06 rewrote the page without fixing it.

**Fix:**

```tsx
case 'copy':
  navigator.clipboard.writeText(url)
    .then(() => {
      toast.success('Link copiado!', {
        description: 'O link foi copiado para sua área de transferência',
      })
    })
    .catch(() => {
      toast.error('Não foi possível copiar o link', {
        description: 'Copie manualmente da barra de endereço.',
      })
    })
  break
```

(Also consider falling back to `document.execCommand('copy')` for old-Safari support, but that's optional polish.)

---

### WR-09: `submit-candidatura` Edge Function does not enforce a request-body size cap (DoS vector via large `respostas[]`)

**File:** `supabase/functions/submit-candidatura/index.ts:88` (`const raw = await req.json()`)
**Issue:** The handler calls `await req.json()` without inspecting `Content-Length` or capping body size. The Zod schema (`schemas.ts:199-219`) caps `curriculo_size` at 5 MB and validates `respostas[]` shape — but `submitCandidaturaSchema.respostas` is `z.array(...)` with **no `.max()` cap**. A client (or attacker with a stolen JWT) can submit a `respostas` array of 10,000+ entries, each with a `resposta_texto: '...'` of arbitrary string length. The Edge Function will:

1. Buffer the entire body into memory (Deno default body limit on Supabase Edge is generous — typically 10 MB).
2. Run Zod validation across the whole array.
3. Pass the array to the `submit_candidatura_atomic` RPC.
4. The RPC's `FOR v_resposta IN SELECT * FROM jsonb_array_elements(p_respostas)` loop runs N inserts inside the SECURITY DEFINER transaction — locking `respostas_formulario` rows / FK index pages for the duration.

**Root cause:** schema lacks `respostas: z.array(...).max(N)` constraint. Plan 04-05 RESEARCH doesn't specify a maximum but the practical cap is the number of `perguntas_formulario` rows for the vaga (typically ≤30). The WR-02 pre-check (added in iteration 1) actually exposes this further: it issues an `.in('id', perguntaIds)` query, so a 10,000-element `perguntaIds` array becomes a giant IN clause hitting Postgres planner limits.

**Fix (defense in depth — both layers):**

`supabase/functions/_shared/schemas.ts:209-218`:
```ts
respostas: z
  .array(z.object({ /* ... */ }))
  .max(100, 'Máximo 100 respostas por candidatura')  // ← add cap
  .default([]),
```

(100 is generously above the realistic max of ~30 perguntas per vaga.)

Optional second layer — the EF should reject bodies above a threshold before parsing:

`supabase/functions/submit-candidatura/index.ts:85-88`:
```ts
const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
if (contentLength > 64 * 1024) {  // 64 KB is plenty for a candidatura payload
  return errorResponse('VALIDATION', 'Payload muito grande', undefined, 413)
}
```

---

### WR-10: `enriquecerVaga` exposes RLS-leak signal via `totalCandidatos` count when called for anonymous browsers

**File:** `src/features/vagas/services/vagasService.ts:96-114`
**Issue:** The WR-06 fix (collapsed count queries into a single `select('status')`) preserves the prior behavior on RLS deny — but the prior behavior had a subtle issue that survived: when an **anonymous** visitor browses `/vagas`, `listVagas` calls `enriquecerVaga(vaga, undefined)` for each row. The service then runs:

```ts
const { data: statusRows } = await supabase
  .from('candidaturas')
  .select('status')
  .eq('vaga_id', vaga.id)
  .is('deleted_at', null)
```

Whatever rows the anon's RLS policy on `candidaturas` allows (typically: zero, because the Phase 1 RLS policy is `candidato_id = auth.uid()` — and anon has no uid) become the `totalCandidatos` count rendered on the public `/vagas` and `/vagas/:slug` pages. That's correct **today** — but:

1. **It depends on RLS policy correctness for `candidaturas`.** If a future migration accidentally adds an `OR true` clause or a policy gap, anon visitors will start seeing real candidate counts. The service code does not enforce its own `if (!candidatoId) skip` gate.
2. **It double-leaks vs. the prior 3-count behavior:** the count queries with `count: 'exact', head: true` return only a count integer. The new shape returns the full `status` array — so a future RLS bug exposes both the count **and** the status enum distribution per vaga (powerful enumeration signal: "this vaga has 47 `em_analise` candidates" is a competitive-intelligence leak).

**Root cause:** WR-06 traded query count for data surface area. The collapse is correct under current RLS; the concern is defense-in-depth.

**Fix:** gate the candidaturas read on `candidatoId` presence (or RH/admin role detection) — anon browsers don't need real counts on `/vagas`:

```ts
async function enriquecerVaga(vaga: VagaRow, candidatoId?: string): Promise<Vaga> {
  const vagaEnriquecida: Vaga = {
    ...vaga,
    diasDesdePublicacao: calcularDiasDesdePublicacao(vaga.created_at),
  }

  // Anon browsers get NO candidate-count signal — defense in depth vs. RLS bugs.
  // Counts are only meaningful for authenticated candidatos (their own hasUserApplied)
  // and RH (handled in Phase 6 list-batch path).
  if (!candidatoId) {
    return vagaEnriquecida
  }

  // ... existing hasUserApplied + status bucketing logic
}
```

This also further reduces query volume on the public landing page (12 vagas × 0 queries = 0 round-trips for anon), pushing closer to D-17's eventual target.

## Info

### IN-01: `RoleGuard` import path uses default-style import for component re-exported as named (verify)

**File:** `src/router/routes.tsx:33`
**Issue:** `import { RoleGuard } from '../components/RoleGuard'` — assumes named export. Phase 1 convention (per `CLAUDE.md`) requires named exports. This is consistent, but if future refactors regress to a default export, the route file won't surface the regression cleanly.
**Fix:** none required; Info-level reminder. A grep guard for `export default` in `src/components/RoleGuard.tsx` would catch regressions.

---

### IN-02: `vagasTypes.ts` enum-label maps inconsistent with type definitions (pre-existing baseline)

**File:** `src/features/vagas/types/vagasTypes.ts:568-587, 732-740`
**Issue:** Three `Record<Enum, string>` constants reference enum keys that don't match the corresponding type union — these are part of the documented 320 lint-error baseline:

- `TIPO_VAGA_LABELS:Record<TipoVaga, string>` (L568) declares keys `tempo_integral`, `meio_periodo`, `estagio`, `temporario` but `TipoVaga` type (L90) is only `'CLT' | 'PJ'`.
- `DEPARTAMENTO_LABELS:Record<Departamento, string>` (L578) declares keys `clinica`, `ti`, `rh`, `outro` but `Departamento` type (L96-104) uses `clinico`, `tecnologia`, `recursos_humanos`. There's NO `outro` member.
- `ETAPA_TO_KANBAN:Record<EtapaProcesso, KanbanStage>` (L732-740) references `big_five`, `entrevista_telefonica`, `analise_final`, `contratacao` — none of which appear in the `EtapaProcesso` union (L200-210).

**Root cause:** legacy hand-edited enum maps that drifted away from the regenerated `database.types.ts`. Pre-existing — not introduced by Phase 4. Phase 4 acceptance criterion is "zero growth in lint baseline" (320 → 320), which iteration 1 met. These should be cleaned up in the Phase 5 backlog under D-26 (token reparation).
**Fix:** regenerate the maps from the type unions (single source of truth in pt-BR domain), or delete the unused entries. Out of scope for Phase 4.

---

### IN-03: `getProximaEtapa` returns `'rejeitado'` after `'aprovado'` instead of `null`

**File:** `src/features/vagas/types/vagasTypes.ts:670-680`
**Issue:**

```ts
export const ETAPAS_SEQUENCIA: EtapaProcesso[] = [
  'triagem', 'bigfive', 'disc', 'entrevista_online', 'raven',
  'entrevista_presencial', 'cultura', 'avaliacao_final',
  'aprovado',  // index 8
  'rejeitado', // index 9
]

export function getProximaEtapa(etapaAtual: EtapaProcesso): EtapaProcesso | null {
  const index = ETAPAS_SEQUENCIA.indexOf(etapaAtual)
  if (index === -1 || index >= ETAPAS_SEQUENCIA.length - 1) {
    return null
  }
  return ETAPAS_SEQUENCIA[index + 1]
}
```

If `etapaAtual = 'aprovado'`, `index = 8`, `ETAPAS_SEQUENCIA.length - 1 = 9`, so the bounds check passes and the function returns `'rejeitado'` — clearly a logic bug (you don't reject someone after approving them). The `'aprovado'` and `'rejeitado'` states are both terminal and shouldn't be in a linear sequence at all.

**Root cause:** terminal states co-located with progression states in the same array.

**Fix:** treat both `'aprovado'` and `'rejeitado'` as terminals explicitly:

```ts
const TERMINAL_ETAPAS = new Set<EtapaProcesso>(['aprovado', 'rejeitado'])
export function getProximaEtapa(etapaAtual: EtapaProcesso): EtapaProcesso | null {
  if (TERMINAL_ETAPAS.has(etapaAtual)) return null
  const index = ETAPAS_SEQUENCIA.indexOf(etapaAtual)
  if (index === -1 || index >= ETAPAS_SEQUENCIA.length - 1) return null
  return ETAPAS_SEQUENCIA[index + 1]
}
```

This is reachable today via `updateCandidaturaStatus` calling `getProximaEtapa(etapaAtualAnterior)` (`candidaturasService.ts:832`) — so an admin who approves an already-approved candidate would advance them to `'rejeitado'`. Defer to Phase 6 if RH-flow is out of Phase 4 scope, but flag as a real bug.

---

### IN-04: `candidaturasService.updateCandidaturaStatus` logs candidatura PII via emoji-prefixed `console.log`

**File:** `src/features/vagas/services/candidaturasService.ts:839, 848, 870, 893, 901`
**Issue:** Five `console.log`/`console.error` calls in the legacy `updateCandidaturaStatus` path log identifiers and PII-adjacent fields:

```ts
console.log('🚀 Auto-avançando etapa:', { candidaturaId, etapaAnterior, ... })
console.log('⚠️ Candidato já está na última etapa:', { candidaturaId, etapaAtual })
console.error('❌ Erro no update da candidatura:', { candidaturaId, updateData, ... })
console.error('❌ Erro ao buscar candidatura após update:', fetchErrorAfterUpdate)
console.log('✅ Candidatura atualizada com sucesso:', { id: data.id, status, etapa_atual })
```

The Pitfall-7 grep guard (`pitfall7.grep.test.ts:62-63`) only forbids tokens `senha|password|access_token|refresh_token` — these slip past. While the logged data is not as severe as a token leak, `candidaturaId`, `feedback_rejeicao` (via `updateData` spread), and the candidatura row contents leak operational visibility into RH actions, which should be in a server-side log not a browser console.

**Root cause:** legacy `updateCandidaturaStatus` predates Phase 4's Pitfall-7 discipline. The function is consumed by RH/admin flows (Phase 6 territory), not the candidate flow under Phase 4 acceptance.

**Fix:** strip the emoji-prefixed logs entirely or route them through a redaction-aware logger. Out of scope for Phase 4 verification, but tracked here so the Phase 6 owner inherits the work. Consider extending `pitfall7.grep.test.ts:118-136` to scan for `candidaturaId|feedback_rejeicao|motivo_rejeicao` in `console.*` calls.

---

### IN-05: `useVagasWithStore` does not forward `options` to underlying `useVagas`

**File:** `src/features/vagas/hooks/useVagas.ts:221-232`
**Issue:** The fix-up in WR-05 cleaned up the `require()`-based dynamic import but did not add an `options` parameter to forward downstream:

```ts
export function useVagasWithStore() {
  const filters = useVagasStore((state) => state.filters)
  // ...
  return useVagas(filters, orderBy, pagination)  // no options forwarding
}
```

Consumers cannot customize `staleTime`, `refetchOnWindowFocus`, etc. without dropping back to `useVagas` directly and re-wiring the store selectors. Minor — every existing consumer uses defaults today.

**Fix:**
```ts
export function useVagasWithStore(
  options?: Parameters<typeof useVagas>[3]
) {
  const filters = useVagasStore((state) => state.filters)
  const orderBy = useVagasStore((state) => state.orderBy)
  const pagination = useVagasStore((state) => state.pagination)
  return useVagas(filters, orderBy, pagination, options)
}
```

---

### IN-06: `isUuid` accepts any 8-4-4-4-12 hex pattern, not strictly RFC-4122 (acceptable for current usage)

**File:** `src/features/vagas/utils/isUuid.ts:12-13`
**Issue:**
```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```

This matches any UUID-shaped string — including strings with invalid version digits (RFC 4122 requires position 13 = `1|2|3|4|5|7|8` and position 17 = `8|9|a|b`). Test T6 (`isUuid.test.ts:24`) explicitly accepts `'01234567-89ab-7def-8123-456789abcdef'` as valid (UUIDv7 — fine, but `7def` would fail strict v4 validation).

**Root cause:** discriminator is "is this a UUID, or is it a slug?" — for that purpose, the loose pattern is correct because slugs (`/^[a-z0-9-]+$/`) and UUIDs (`8-4-4-4-12 hex`) cannot both match. A "valid UUID" v4-strict regex would reject UUIDv7 IDs Postgres might emit in the future, falsely treating them as slugs.

**Fix:** none — current behavior is intentional. Just documenting the trade-off here for future reviewers who might tighten the regex. Test T6 already documents this. Acceptable.

---

### IN-07: `VagaDetalhePage` renders `VagaNotFoundState` for empty/missing identifier instead of routing 404

**File:** `src/components/pages/VagaDetalhePage.tsx:96-99, 181-183`
**Issue:**
```tsx
const isUuidParam = identifier ? isUuid(identifier) : false
const byIdQuery = useVaga(isUuidParam ? identifier : null)
const bySlugQuery = useVagaBySlug(isUuidParam ? null : (identifier ?? null))
const { data: vagaData, isLoading } = isUuidParam ? byIdQuery : bySlugQuery
// ...
if (!vagaData?.success || !vaga) {
  return <VagaNotFoundState />
}
```

When `identifier === undefined` (rare — React Router would have already 404'd, but possible if route config is mis-edited), both queries are disabled, `isLoading` is `false`, `vagaData` is `undefined`, and the 404 state renders. The user sees "Vaga não encontrada" which is technically correct but masks a routing bug.

**Root cause:** ambiguous error mapping. The page conflates "identifier param missing" (routing bug) with "identifier provided but vaga absent" (legitimate 404).

**Fix:** narrow the precondition:
```tsx
if (!identifier) {
  // routing bug — should be unreachable; navigate home
  navigate('/vagas', { replace: true })
  return null
}
if (!vagaData?.success || !vaga) {
  return <VagaNotFoundState />
}
```
Or simply trust React Router's path-matching and accept the current shape. Either way, a comment explaining the choice would help.

---

### IN-08: Legacy `createCandidatura` retains its own webhook fire after Plan 04-05 made the EF the canonical path

**File:** `src/features/vagas/services/candidaturasService.ts:514-654`
**Issue:** The pre-Phase-4 `createCandidatura` function still inserts directly into `candidaturas` and fires its own N8N webhook (lines 600-624). After Plan 04-05 introduced `submitCandidaturaWithRespostas` as the canonical Phase 4+ path (which uses the EF, which fires its own webhook), there is a duplicate-fire-by-design risk: any caller still using `createCandidatura` will fire one webhook; the EF fires another from server-side. The WR-04 fix correctly documented this in the JSDoc, but did not gate the legacy path with a deprecation marker.

**Root cause:** Plan 04-05 deliberately preserved `createCandidatura` per `04-RESEARCH §1926` (Phase 6 RH may need a direct DB path). Today's only consumer is `useCreateCandidatura` (`src/features/vagas/hooks/useCandidaturas.ts:259-270`). It is NOT dead code, but is also not on the Phase 4 candidate-submission path.

**Fix:** add a `@deprecated` JSDoc marker so future contributors get a TS hint (without breaking Phase 6 plans):
```ts
/**
 * @deprecated Phase 4 → Phase 6: prefer `submitCandidaturaWithRespostas`
 *   (Edge Function path) for new candidate-side flows. This direct DB path
 *   is preserved for Phase 6 RH-side scenarios per 04-RESEARCH §1926.
 */
export async function createCandidatura(/* ... */) { /* ... */ }
```

This is consistent with the WR-04 review fix — both flag the duplicate-fire concern at the doc-comment layer rather than mutating runtime behavior.

---

### IN-09: `submit_candidatura_atomic` RPC accepts `p_curriculo_size` as `int` but schema permits up to 5 MB (within int range)

**File:** `supabase/migrations/20260425000003_submit_candidatura_rpc.sql:23`
**Issue:** Postgres `int` is signed 32-bit (max ~2.1 GB). 5 MB (5_242_880 bytes) fits comfortably. The schema in `_shared/schemas.ts:204-208` caps `curriculo_size` at 5_242_880, so this is fine. However, if a future change ever raises the bucket cap above 2 GB (unlikely but possible for video uploads in later phases), `int` would silently overflow. The defensive choice is `bigint`.
**Fix:** change `p_curriculo_size int` → `p_curriculo_size bigint` in the RPC signature. Backwards-compatible (Postgres widens `int` → `bigint` implicitly on call). Low priority — purely future-proofing.

---

_Reviewed: 2026-04-26T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 2_
