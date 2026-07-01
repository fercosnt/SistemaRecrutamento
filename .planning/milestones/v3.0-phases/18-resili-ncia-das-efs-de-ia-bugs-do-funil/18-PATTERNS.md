# Phase 18: Resiliência das EFs de IA & Bugs do Funil - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 12 (5 MODIFY + 2 NEW + 5 test files)
**Analogs found:** 12 / 12

> This is a **hardening phase on a shipped surface** — every file to be created/modified has a strong in-repo analog (often the file itself, edited in place). There are NO greenfield roles. The planner should frame tasks as "augment the existing X following pattern Y", never "build from scratch".

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/functions/_shared/ai-client.ts` (MODIFY) | service / shared-runtime | request-response (AI provider call) | itself — retry loop L317-378 + OpenAI fallback L407-432 | exact (edit-in-place) |
| `supabase/functions/gerar-devolutiva-bigfive/index.ts` (MODIFY) | service / EF handler | batch / transform (5-dim fan-out) | itself — sequential loop L390-407 + `personalizeDim` L291-325 | exact (edit-in-place) |
| `src/features/.../components/AsyncState.tsx` (NEW) | component | request-response (presentational state) | `HubSection.tsx` (full file) + `ConsolidacaoDashboard.tsx:90-127` | exact (generalization) |
| `extractEfErrorCode` helper (NEW — shared, used by services) | utility | transform (transport→domain error) | `decisaoService.getConsolidacao` L92-114 + `triagemService.invokeComparativo` L247-275 | role-match |
| `decisaoService.ts` / `avaliacaoService.ts` / `triagemService.ts` (MODIFY — wire error_code) | service | request-response (EF invoke) | `triagemService.invokeComparativo` L259-266 (the ONLY one already reading `error_code`) | exact (existing partial impl) |
| `consolidar-decisao-final/__tests__/index.test.ts` (MODIFY — FIX-01) | test | pure-fn assertion | `ai-client.test.ts` DI/assert idiom + existing file | exact |
| `avaliacaoService` test (NEW/MODIFY — FIX-02) | test | mocked-supabase assertion | `decisaoService.test.ts` `vi.hoisted` mock idiom | exact |
| `AsyncState.test.tsx` (NEW — RESIL-03) | test | component (RTL + fake timers) | `ComparativoScreen.test.tsx` / `RegistrarDecisaoForm.test.tsx` (RTL idiom) + `tests/setup.ts` timer bridge | role-match |
| `extractEfErrorCode` test (NEW) | test | mocked-invoke assertion | `decisaoService.test.ts` `invokeMock` idiom | exact |
| `ai-client.test.ts` (MODIFY — RESIL-01) | test | DI-mock assertion | itself — `makeMockAnthropic` L31-50 | exact (extend mock) |
| `gerar-devolutiva-bigfive/__tests__/index.test.ts` (MODIFY — RESIL-02) | test | DI-mock assertion | `ai-client.test.ts` DI idiom + existing file | exact (extend) |
| Adoption sites: `BigFiveQuestionnaireScreen` · `SjtCasoAbertoScreen` · `RedacaoEditorScreen` · `ComparativoScreen` · `ConsolidacaoDashboard` (MODIFY) | component | request-response | `ConsolidacaoDashboard.tsx:90-127` (retry exemplar) | exact |

---

## Pattern Assignments

### `supabase/functions/_shared/ai-client.ts` (MODIFY — RESIL-01: timeout + configurable attempts)

**Analog:** itself (edit-in-place). All AI EFs import `callAi` from here — this is the SINGLE point for RESIL-01.

**Module-top config to copy (mirror the existing const block at L60-64):**
```typescript
// EXISTING (L60-64):
const OPENAI_FALLBACK_MODEL = "gpt-4o-mini";
const RETRYABLE_STATUS = new Set([429, 503, 529]);
const MAX_ATTEMPTS = 3;          // ← make env-configurable
// ADD (RESEARCH Pattern 1):
//   const MAX_ATTEMPTS = Number(Deno.env.get("MAX_ATTEMPTS") ?? "3");
//   const AI_CALL_TIMEOUT_MS = Number(Deno.env.get("AI_CALL_TIMEOUT_MS") ?? "25000");
// MUST default-guard — absence in PROD is safe (RESEARCH Runtime State Inventory).
```

**Anthropic call to wrap** (the SECOND positional arg is the gap — currently absent):
```typescript
// CURRENT L320-330 — single positional arg, NO options:
const response = await anthropic.messages.parse({
  model: prompt.model_id,
  max_tokens: prompt.max_tokens,
  temperature: prompt.temperature,
  system: [ /* …ephemeral blocks… */ ],
  messages: [{ role: "user", content: maskedInput }],
  output_config: { format: zodOutputFormat(schema, prompt.call_type) },
});
// ADD second arg: { timeout: AI_CALL_TIMEOUT_MS, maxRetries: 0 }
// `maxRetries: 0` is MANDATORY (Pitfall 1) — the hand-rolled loop L317 owns retry.
```

**Retry loop to preserve (do NOT rebuild)** — env-config swaps the bound only:
```typescript
// CURRENT L315-378 — KEEP this entire structure. RESIL-01 = add timeout, not rewrite.
let attempt = 0;
let lastErr: unknown = null;
while (attempt < MAX_ATTEMPTS) {     // ← MAX_ATTEMPTS becomes env-configurable
  attempt++;
  try { /* …parse… */ breaker.recordSuccess(); /* …logAiCall… */ return {...}; }
  catch (err) {
    lastErr = err;
    breaker.recordFailure();
    if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
      await sleep(Math.pow(2, attempt) * 1000 + Math.random() * 500);  // exp-backoff + jitter
      continue;
    }
    break;
  }
}
```

**Retryable-error classifier (decision input for `{signal}` vs `{timeout}`):**
```typescript
// CURRENT L194-199 — { timeout } needs NO change here (throws a "timeout"-matching message):
function isRetryable(err: unknown): boolean {
  const s = statusOf(err);
  if (s !== undefined && RETRYABLE_STATUS.has(s)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /529|overloaded|timeout|503|429/i.test(msg);
}
// If planner uses raw { signal: AbortSignal.timeout() } instead → MUST extend this to
//   err?.name === 'TimeoutError' || err?.name === 'AbortError' (Pitfall 3).
// RECOMMENDED: { timeout } route → zero change to isRetryable.
```

**Provider client interfaces to update** (so the options arg type-checks under tsc):
```typescript
// CURRENT L103-112 — parse(req: unknown) takes ONE arg. To pass options, widen to:
//   parse(req: unknown, opts?: { timeout?: number; maxRetries?: number; signal?: AbortSignal }): Promise<...>
interface AnthropicLike { messages: { parse(req: unknown): Promise<{...}>; }; }   // ← widen
interface OpenAILike { chat: { completions: { parse(req: unknown): Promise<{...}>; }; }; } // ← widen (L114-125)
```

**Structured 503 contract (RESEARCH Pitfall 5):** `callAi` only surfaces `error_code` (it already returns `error_code` on the fallback result, L471). The `{ error_code:'AI_UNAVAILABLE', retryable:true }` HTTP-503 shape is set per-EF in the `Deno.serve` wrapper — NOT here. See per-EF serve-wrapper note below.

---

### `supabase/functions/gerar-devolutiva-bigfive/index.ts` (MODIFY — RESIL-02: parallelize 5 dims)

**Analog:** itself. The sequential handler loop is the exact code to replace.

**Sequential loop to replace** (RESEARCH Pattern 2 — swap for `Promise.allSettled`):
```typescript
// CURRENT L390-407 — 5 dims AWAITED one-by-one (the timeout cause):
const paginas: PaginaOut[] = [];
const dashboard: { dim: Dim; percentil: number; banda: Banda }[] = [];
for (const dim of DIMS) {
  const meta = byDim.get(dim);
  const percentil = typeof meta?.percentil === "number" ? meta.percentil : 50;
  const banda = bandOf(percentil);
  const rawTemplate = BAND_TEMPLATES[dim][banda];
  const { texto, palavras } = await personalizeDim(dim, percentil, banda, rawTemplate, callAi,
    { candidato_id: candidatoId, vaga_id: vagaId });
  paginas.push({ dim, banda, percentil, texto_interpretativo: texto, palavras });
  dashboard.push({ dim, percentil, banda });
}
// → REPLACE with Promise.allSettled(DIMS.map(async dim => {...})) — RESEARCH Pattern 2 example.
// MUST preserve: O-C-E-A-N order (allSettled preserves input order → index-map safe),
//   per-dim degrade to BAND_TEMPLATES on reject, and the dashboard[] parallel build.
```

**`personalizeDim` 2→1 attempt change** (CONTEXT decision: 1 attempt/dim under parallel):
```typescript
// CURRENT L312-324 — loops 2 attempts; degrade already correct (KEEP the degrade):
for (let attempt = 0; attempt < 2; attempt++) {       // ← change bound to 1 OR add attempts arg
  const res = await callAi({ ...baseArgs, attempt });
  const texto = res?.parsed?.texto_interpretativo ?? "";
  const palavras = typeof res?.parsed?.palavras === "number" ? res.parsed.palavras : wordCount(texto);
  if (texto.length > 0 && inRange(palavras)) return { texto, palavras };  // ← KEEP inRange gate
}
return { texto: rawTemplate, palavras: wordCount(rawTemplate) };  // ← KEEP degrade (never throws)
```

**Serve-wrapper status logic to preserve** (already maps domain status → HTTP):
```typescript
// CURRENT L588-590 — keep this; RESIL-02 changes the handler internals, not the wrapper:
const httpStatus = out.status === "refused" ? 422 : out.status === "falhou" ? 500 : 200;
return new Response(JSON.stringify(out), { status: httpStatus, /* …headers… */ });
// If planner adds an AI_UNAVAILABLE path here, emit 503 + {error_code:'AI_UNAVAILABLE',retryable:true}.
```

**Preservation guards (do NOT touch):** the RF-19b `tipo !== "big_five"` refuse (L354-360), the `candidato_id`/`vaga_id` attribution resolve (L362-379, WR-01 LGPD-02), the service_role precondition read (L338-349).

---

### `AsyncState.tsx` (NEW — RESIL-03: shared loading/slow/error/empty/success wrapper)

**Analog:** `HubSection.tsx` (full file — the base pattern to generalize) + `ConsolidacaoDashboard.tsx:90-127` (the retry exemplar). Component API is Claude's discretion per 18-UI-SPEC §Component API.

**Imports pattern** (copy from `HubSection.tsx` L24-26 + add lucide + GlassButton):
```tsx
import type { ReactNode } from 'react'
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { GlassButton } from '@/components/ui/glass'        // retry button (ConsolidacaoDashboard:108)
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'  // 18-UI-SPEC §Color/§Component
```

**Glass surface idiom** (copy verbatim from `HubSection.tsx` L76 — identical wrapper):
```tsx
<Glass variant="dark" blur="lg" className="rounded-xl p-6"> {/* …state… */} </Glass>
```

**Single-source COPY const** (the no-drift guarantee — mirror `HubSection.COPY` L48-62, fill with the 18-UI-SPEC §Copywriting Contract verbatim PT-BR):
```tsx
const COPY = {
  slow:  { heading: 'Estamos processando com IA…', body: 'Isso pode levar até ~30 segundos. Não feche esta tela.' },
  error: {
    heading: 'Não foi possível concluir agora.',
    overload: 'O serviço de IA está sobrecarregado. Tente novamente em instantes.', // errorCode==='AI_UNAVAILABLE'
    generic:  'Verifique a conexão e tente novamente.',                              // else
  },
  empty: { heading: 'Nada para mostrar ainda', body: 'Os dados desta etapa aparecerão aqui quando estiverem disponíveis.' },
  retry: { label: 'Tentar novamente', inflight: 'Tentando…' },
} as const
```

**Centered empty/error block** (copy `HubSection.EstadoVazio` L64-72 verbatim — same typography tokens):
```tsx
function EstadoVazio({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <p className="text-base font-semibold text-white md:text-lg">{heading}</p>
      <p className="max-w-md text-sm text-white/70">{body}</p>
    </div>
  )
}
```

**Error state + retry button** (copy from `ConsolidacaoDashboard.tsx:102-111` — this IS the standard):
```tsx
// AlertTriangle text-red-300 (signal, never a fill) + GlassButton retry. UI-SPEC: 44px touch target,
// "Tentando…" + disabled while `retrying`, optional RotateCcw 16px icon.
<div className="flex flex-col items-center gap-3 p-12 text-center text-white/80">
  <AlertTriangle className="h-8 w-8 text-red-300" aria-hidden="true" />
  <p className="font-semibold text-white">{COPY.error.heading}</p>
  <p>{errorCode === 'AI_UNAVAILABLE' ? COPY.error.overload : COPY.error.generic}</p>
  <GlassButton onClick={onRetry} disabled={retrying} className="min-h-[44px]">
    {retrying ? <><Loader2 className="w-4 h-4 animate-spin" /> {COPY.retry.inflight}</> : COPY.retry.label}
  </GlassButton>
</div>
```

**Loading skeleton** (copy `HubSection.tsx` L80):
```tsx
<Skeleton className="h-24 w-full bg-white/5" />
```

**Slow-state timer** (18-UI-SPEC: `useEffect` + `setTimeout(slowAfterMs ?? 8000)` while loading, clear on resolve; NEVER replaces a resolved state). Vitest fake-timers already bridged in `tests/setup.ts` L23-32.

**State priority (binding, 18-UI-SPEC §States Contract):** `isLoading||isPending` → slow@8s → `isError`+retry → `isEmpty` → `children`. `isError`/`isLoading` take precedence over `isEmpty` (the `HubSection` convention, L79-89).

**HubSection refactor:** `HubSection` delegates to `<AsyncState>` (or shares its COPY source) so its `futuro`/`sem_dados` copy stays as HubSection-specific overrides and the two never drift.

---

### `extractEfErrorCode` (NEW — shared helper) + service wiring (RESIL-03 plumbing — THE GAP)

**Analog (the only existing partial impl):** `triagemService.invokeComparativo` L259-266 already reads `data?.error_code === 'MIXED_VAGA'`. Generalize that pattern into a shared helper to avoid per-service drift (the integration-contract lesson — `feedback_integration_contract_gap`).

**The GAP to fix — `decisaoService.getConsolidacao` collapses every error to NETWORK_ERROR** (L96-111) and never reads the 503 body's `error_code`:
```typescript
// CURRENT L92-114 — neither branch surfaces error_code to the UI:
const { data, error } = await supabase.functions.invoke('consolidar-decisao-final', { body: parsed.data })
if (error) {
  throw new DecisaoServiceError('Não foi possível carregar a consolidação. Verifique a conexão e tente novamente.',
    'NETWORK_ERROR', error)              // ← error_code from error.context never read
}
if (data && (data as { ok?: boolean }).ok === false) {
  throw new DecisaoServiceError('…', 'NETWORK_ERROR', data)  // ← legacy 200-body {ok:false} (KEEP — consolidar is NO-LLM)
}
```

**Shared helper to add** (RESEARCH Code Examples — reads BOTH the 200-body `data.error_code` and the non-2xx `error.context` Response; degrades safely, never throws):
```typescript
async function extractEfErrorCode(
  data: unknown,
  error: { context?: Response } | null,
): Promise<string | undefined> {
  if (data && typeof data === 'object' && 'error_code' in data) {
    return String((data as { error_code?: unknown }).error_code ?? '') || undefined
  }
  try {
    const body = await error?.context?.json?.()
    if (body && typeof body === 'object' && 'error_code' in body) {
      return String((body as { error_code?: unknown }).error_code ?? '') || undefined
    }
  } catch { /* body not JSON — fall through to generic */ }
  return undefined
}
```

**Service error-class to extend** (carry `error_code` in `details` so the component can branch copy). Mirror `DecisaoServiceError` (decisaoService L39-53) / `TriagemServiceError` / `AvaliacaoServiceError` (avaliacaoService L33-46) — all share the same `(message, code, details?)` shape:
```typescript
// Add the extracted error_code onto the thrown error's details so the hook/component reads
//   query.error and pulls error_code into <AsyncState errorCode>.
// throw new DecisaoServiceError(msg, 'NETWORK_ERROR', { error_code, raw: error })
```

**Services to wire** (each invokes a slow AI EF and currently maps to NETWORK_ERROR without error_code):
- `decisaoService.getConsolidacao` L92-114 → consolidar is NO-LLM (never emits AI_UNAVAILABLE), but the dashboard shows AI-derived breakdown; wire for uniformity.
- `avaliacaoService.avaliarRedacao` L312-322 → invokes `avaliar-redacao` (AI EF) — primary AI_UNAVAILABLE surface.
- `triagemService.invokeComparativo` L247-275 → already reads `error_code` for MIXED_VAGA; extend to also surface AI_UNAVAILABLE via the same helper.
- bigfive screen: the candidate-facing devolutiva read service (find its `functions.invoke('gerar-devolutiva-bigfive')` caller and wire identically).

---

### `consolidar-decisao-final/__tests__/index.test.ts` (MODIFY — FIX-01 regression)

**Analog:** existing test file + `ai-client.test.ts` DI/assert idiom (L26 `std@0.224.0/assert`).

**Function under test (already correct, L173-182) — must be EXPORTED to test:**
```typescript
// CURRENT L173 — module-private `function`; add `export` for the pure-fn test:
function normalizeSjtComposite(sjtRows: ScoreRow[]): number | null {
  const confirmed = sjtRows.filter(
    (r) => r.status === "sucesso" && r.score != null && r.score_max != null && r.score_max > 0,
  );
  if (confirmed.length === 0) return null;          // ← FIX-01: pending-only → null
  const sumScore = confirmed.reduce((acc, r) => acc + (r.score as number), 0);
  const sumMax = confirmed.reduce((acc, r) => acc + (r.score_max as number), 0);
  if (sumMax === 0) return null;
  return (sumScore / sumMax) * 100;                 // ← MC sucesso preserved when caso_aberto pendente
}
```

**Test shape to add** (RESEARCH Code Examples — 2 cases that would have caught the bug):
```typescript
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeSjtComposite } from "../index.ts";
Deno.test("FIX-01: caso_aberto pendente-único → null", () => {
  assertEquals(normalizeSjtComposite([{ status:"pendente_humano", score:null, score_max:null }] as never), null);
});
Deno.test("FIX-01: MC sucesso preserved when caso_aberto pendente", () => {
  assertEquals(normalizeSjtComposite([
    { status:"sucesso", score:8, score_max:10 }, { status:"pendente_humano", score:null, score_max:null },
  ] as never), 80);
});
```
Run: `deno test --allow-read supabase/functions/consolidar-decisao-final/__tests__/index.test.ts`

---

### `avaliacaoService` test (NEW/MODIFY — FIX-02 regression)

**Analog:** `decisaoService.test.ts` `vi.hoisted` + `vi.mock('@/lib/supabase/client')` idiom (L23-54). The avaliacaoService dir already has `__tests__/` (bigfiveService, redacaoService, scoresRhService) — add a `getAvaliacaoContext` test there.

**Function under test (already correct, L133-139):**
```typescript
const { data: perguntas, error: pErr } = await supabase
  .from('perguntas')
  .select('id, cargo, cenario, formato, tempo_est_min, rubric, status')  // allowlist — never select('*')
  .eq('status', 'active')   // ← FIX-02: canonical sentinel 'active' (en); legacy 'ativo' matched zero rows
```

**Test shape** (RESEARCH Code Examples — mock returns 'active' rows, assert `.eq('status','active')` called):
```typescript
const eq = vi.fn().mockResolvedValue({ data: [{ id:'p1', status:'active' }], error: null })
const select = vi.fn(() => ({ eq }))
// vi.mock supabase.from → { select } ; assert eq toHaveBeenCalledWith('status','active') + rows.length > 0
```
Run: `npm run test:run`. (NOTE: `getAvaliacaoContext` also reads `candidaturas` first L93-128 — the mock must serve both `from('candidaturas')` and `from('perguntas')`; see `decisaoService.test.ts` `makeQuery` multi-table pattern L31-46.)

---

### `AsyncState.test.tsx` (NEW — RESIL-03 component contract)

**Analog:** `ComparativoScreen.test.tsx` / `RegistrarDecisaoForm.test.tsx` (RTL render idiom) + `tests/setup.ts` L23-32 (fake-timer jest-shim, already bridged for the slow@8s timer).

**Cases (RESEARCH Test Map):** 5-state contract render; `errorCode==='AI_UNAVAILABLE'` → overload copy vs generic; retry calls `onRetry` and is `disabled`+"Tentando…" while `retrying`; slow@8s via `vi.advanceTimersByTime(8000)`. Framework: Vitest `^4.0.7` + `@testing-library/react` `^16.3.2`, env happy-dom.

---

### `extractEfErrorCode` test (NEW)

**Analog:** `decisaoService.test.ts` `invokeMock` idiom (L23-28, L66-70). Cases: `data.error_code==='AI_UNAVAILABLE'` → returns it; non-2xx `error.context.json()` → returns body's `error_code`; no code → `undefined`; non-JSON body → `undefined` (degrades, never throws).

---

### `ai-client.test.ts` (MODIFY — RESIL-01 options assertion)

**Analog:** itself — extend `makeMockAnthropic` (L31-50) to record the OPTIONS arg.

**Mock to extend** (currently records only `req`, L37 `calls.push(req)`):
```typescript
parse: (req: unknown, opts?: unknown) => { calls.push([req, opts]); /* …existing… */ }  // capture both args
```
**Assertion (RESEARCH Code Examples + Pitfall 2):**
```typescript
const [, opts] = mock.calls[0] as [unknown, { timeout?: number; maxRetries?: number }];
assertEquals(opts.maxRetries, 0);
assert(typeof opts.timeout === "number" && opts.timeout > 0);
```
Existing fixtures to reuse: `makeMockOpenAI` (L53-69), `makeMockSupabase` (L72-85), `SONNET_PROMPT` (L88+). Existing retryable-path coverage uses `makeMockAnthropic({ failTimes })` (L31-33) → reuse for the timeout-is-retryable case.

---

### `gerar-devolutiva-bigfive/__tests__/index.test.ts` (MODIFY — RESIL-02)

**Analog:** existing file + `ai-client.test.ts` DI-mock idiom (mock `callAi` via `HandlerDeps`). Cases: `Promise.allSettled` over 5 dims (assert concurrency — all 5 `callAi` invoked before any resolves, via deferred promises); 1 attempt/dim (assert `callAi` called once per dim, not twice); per-dim degrade to `BAND_TEMPLATES` on reject; **O-C-E-A-N order preserved** in `paginas`; word-count `inRange` gate honored. Run: `deno test --allow-read supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts`.

---

### Adoption sites for `<AsyncState>` (MODIFY)

| Screen | Persona | File | Current state → target |
|--------|---------|------|------------------------|
| `ConsolidacaoDashboard` | RH | `src/features/decisao/components/ConsolidacaoDashboard.tsx` | L90-127 IS the retry exemplar → migrate to `<AsyncState>`; its copy/button become the shared default. Pass `errorCode` from `useConsolidacao().error`. |
| `BigFiveQuestionnaireScreen` | Candidato | `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx` | bare skeleton today → add slow (~30s) + error+retry. |
| `SjtCasoAbertoScreen` | Candidato | `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx` | loading-only → add error+retry. |
| `RedacaoEditorScreen` | Candidato | `src/features/avaliacao/components/RedacaoEditorScreen.tsx` | already has refetch + "Tentar novamente" → migrate to shared wrapper. |
| `ComparativoScreen` | RH | `src/features/triagem/components/ComparativoScreen.tsx` | `isGenerating` → slow state + error+retry; read `error_code` from `invokeComparativo`. |

**Hook contract all adopters share** (TanStack Query v5 — `useConsolidacao.ts` L33-41 is the template): `useQuery({ ..., staleTime: 5*60*1000, retry: 2 })`; component reads `{ data, isLoading, isError, error, refetch }` directly — **no `onError` callback** (removed in v5; comment at `useConsolidacao.ts` L29-31). `onRetry={() => refetch()}`; `errorCode` pulled from `error` (a `*ServiceError` carrying `error_code` in details once the plumbing lands).

---

## Shared Patterns

### Error class shape (transport→domain)
**Source:** `decisaoService.DecisaoServiceError` (L39-53), `triagemService.TriagemServiceError` (L27-32), `avaliacaoService.AvaliacaoServiceError` (L33-46)
**Apply to:** every service wired for `error_code`
All three share `constructor(message, code: 'INVALID_INPUT'|'NETWORK_ERROR'|'DATABASE_ERROR'|'NOT_FOUND'|'UNAUTHORIZED'|…, details?)`. RESIL-03 adds the extracted `error_code` into `details` (or a new field) so the component can branch overload vs generic copy. Keep the union closed and PT-BR messages verbatim from 18-UI-SPEC.

### EF invoke → error_code extraction
**Source:** `triagemService.invokeComparativo` L259-266 (the only one already doing it for MIXED_VAGA)
**Apply to:** all AI-invoking services via the shared `extractEfErrorCode`
`supabase.functions.invoke` returns `{ data, error }`. The `error_code` may be on `data` (200/parsed-body) OR `await error.context.json()` (non-2xx `FunctionsHttpError`). The shared helper handles both and degrades safely (Pitfall 4).

### Static `npm:` imports only (NEVER dynamic)
**Source:** `ai-client.ts` L40-58 (static), `gerar-devolutiva-bigfive/index.ts` import block
**Apply to:** every EF edit
Any new EF import for RESIL must be static at module top. `await import([...].join(""))` → `ERR_MODULE_NOT_FOUND` at deploy (Pitfall 7, `reference_ef_npm_join_import_bug`).

### EF two-client authenticate-THEN-authorize (preserve)
**Source:** `consolidar-decisao-final/index.ts` `Deno.serve` L396-403 (two-client wiring from env + Authorization)
**Apply to:** every edited EF serve-wrapper
The RESIL serve-wrapper edits MUST NOT drop the role+ownership check after `getUser()` (`reference_ef_authenticate_vs_authorize`, ASVS V4). Regression-test the authz path stays.

### Explicit-allowlist reads (never `select('*')`)
**Source:** `avaliacaoService` L135, `decisaoService` L172/L204 (all name columns)
**Apply to:** any new/edited read
RLS is row-level only; candidate-facing reads use explicit allowlists (`reference_select_star_leaks_pii`, T-08-13/09). The new 503 error body must carry only `{error_code, retryable}` — no message/stack/PII (ASVS V7).

### RNF-07a — AI is advisory, never auto-decides
**Source:** `consolidar` is deterministic/NO-LLM (`normalizeSjtComposite` L173-182, comment L184); bigfive degrade returns templates and writes nothing decisional (L323-324, L417+)
**Apply to:** every EF edit
The degrade/error paths must NEVER write a score/decision. Preserve.

### Deno EF redeploy = ALL callAi consumers (Pitfall 6 — the #1 runtime-state item)
**Source:** `reference_ef_shared_bundle_freeze`
**Apply to:** the `[BLOCKING]` deploy step
A change to `_shared/ai-client.ts` only takes effect in an EF when THAT EF is redeployed. Redeploy **every AI EF importing callAi**: analise-candidato-individual, avaliar-redacao, avaliar-redacao-cultural, avaliar-transcricao-entrevista, gerar-devolutiva-bigfive, gerar-guia-entrevista, comparativo-candidatos — PLUS verify `consolidar-decisao-final` carries FIX-01 (350e994). Use `get_edge_function` to diff deployed-vs-local before/after. M2 PROD precedent: Supabase MCP `apply_migration`/CLI `functions deploy`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | Every file has a strong in-repo analog (most are edit-in-place on the file itself). This is a hardening phase — no greenfield role exists. |

---

## Metadata

**Analog search scope:** `supabase/functions/_shared/`, `supabase/functions/{gerar-devolutiva-bigfive,consolidar-decisao-final,avaliar-redacao,comparativo-candidatos,analise-candidato-individual}/`, `src/features/{hub-candidato,decisao,triagem,avaliacao}/{components,hooks,services,__tests__}/`
**Files scanned:** ai-client.ts, gerar-devolutiva-bigfive/index.ts, consolidar-decisao-final/index.ts, decisaoService.ts, avaliacaoService.ts, triagemService.ts, HubSection.tsx, ConsolidacaoDashboard.tsx, useConsolidacao.ts, ai-client.test.ts, decisaoService.test.ts + test-file inventory (12 Deno EF tests, 16 frontend service/component tests)
**Pattern extraction date:** 2026-06-29
