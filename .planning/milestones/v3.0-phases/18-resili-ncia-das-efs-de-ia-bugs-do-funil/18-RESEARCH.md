# Phase 18: Resiliência das EFs de IA & Bugs do Funil - Research

**Researched:** 2026-06-29
**Domain:** Edge Function (Deno) resilience for Anthropic AI calls + React/TanStack-Query graceful degradation + regression-test hardening
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1 — Resiliência das EFs (RESIL-01 + RESIL-02)**
- Timeout configurável vive no helper compartilhado `callAi()`: cada chamada Anthropic/OpenAI envolvida em timeout via `AbortSignal`, exposto por env `AI_CALL_TIMEOUT_MS` (default ~25s), e `MAX_ATTEMPTS` também configurável por env. Uma fonte única cobre TODAS as EFs de IA.
- `gerar-devolutiva-bigfive`: paralelizar as 5 dimensões com `Promise.allSettled`, 1 tentativa por dimensão, com graceful-degrade per-dim para o template determinístico em caso de falha — cabe numa janela de execução. (Não tornar assíncrona/background nesta fase.)
- Quando as tentativas esgotam ou o breaker abre, a EF retorna erro estruturado `{ error_code: 'AI_UNAVAILABLE', retryable: true }` com HTTP 503 para o frontend exibir retry.
- Escopo do hardening RESIL-01 é uniforme: aplica-se a todas as EFs de IA via o helper compartilhado.

**Área 2 — Graceful degradation no frontend (RESIL-03)**
- Extrair um wrapper compartilhado `<AsyncState>` que generaliza o padrão do `HubSection` (loading skeleton / erro legível PT-BR / vazio / **retry visível**), adotado nas telas de IA candidato-facing (BigFive, SJT caso aberto, redação) e RH (consolidação, comparativo).
- Padronizar o botão "Tentar novamente" (chama refetch/re-invoke) em todas as telas — já existe no `ConsolidacaoDashboard`, virar padrão.
- UX de chamada lenta (ex.: bigfive ~30s): mensagem explícita "pode levar até ~30s" + skeleton, desabilitar double-submit, nunca tela em branco.
- Superfície de erro: estado de erro inline na região da tela + mensagem legível PT-BR; toast opcional para transientes.

**Área 3 — Travar FIX-01/FIX-02 (já codados) + deploy**
- Como os fixes já estão commitados: adicionar testes de regressão que teriam pego cada bug — consolidar: caso_aberto pendente-único → `null` mas MC preservado; avaliação: `status='active'` retorna linhas — e verificar que `consolidar-decisao-final` está deployado em PROD.
- Redeploy de `consolidar-decisao-final` (+ EFs alteradas pelo RESIL) para PROD como passo `[BLOCKING]` human-gated via Supabase MCP/CLI (precedente PROD do M2).
- Camada de teste de regressão: Vitest unit nos pontos puros/mockados (rápido, sem rede).
- Lock + deploy agora; a verificação live round-trip em PROD é deferida p/ Phase 21 (PROD-01/02).

### Claude's Discretion
- Nome exato/API do componente `<AsyncState>` e como ele compõe com `HubSection` existente.
- Valor default exato de `AI_CALL_TIMEOUT_MS` e `MAX_ATTEMPTS` (dentro do razoável p/ Sonnet).
- Estrutura interna da paralelização do bigfive (Promise.allSettled vs map+await) desde que preserve o graceful-degrade per-dim e o limite de palavras.

### Deferred Ideas (OUT OF SCOPE)
- Verificação live round-trip em PROD dos fixes/hardening → Phase 21 (PROD-01/02).
- Tornar `gerar-devolutiva-bigfive` totalmente assíncrona (job + poll) — só se a paralelização não couber na janela; caso contrário fica fora de escopo.
- LLM-as-judge / golden set para calibrar as avaliações de IA → M4 (JUDGE-01).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RESIL-01 | EFs de IA resistem a latência/overload da Anthropic — timeout configurável + retry/backoff + 429/529/overload | `callAi()` JÁ tem retry/backoff/breaker/fallback. Gap = per-call `AbortSignal`/`timeout` + env-config `MAX_ATTEMPTS`/`AI_CALL_TIMEOUT_MS`. Anthropic SDK API + EF timeout limits documented below (Pattern 1, Pitfalls 1-3). |
| RESIL-02 | `gerar-devolutiva-bigfive` completa dentro do limite de execução | 5 chamadas sequenciais hoje (verified L390-407). Paralelizar via `Promise.allSettled` + 1 tentativa/dim + degrade per-dim. EF wall-clock 400s / idle 150s budget analysis below (Pattern 2). |
| RESIL-03 | Candidato e RH veem estado claro (loading/erro/retry) — graceful degradation | `<AsyncState>` generaliza `HubSection`. 18-UI-SPEC.md states contract approved. **GAP descoberto:** `decisaoService` mapeia TODO erro de EF p/ `NETWORK_ERROR` genérico — não extrai `error_code:'AI_UNAVAILABLE'`. Pattern 3 + Pitfall 4. |
| FIX-01 | `consolidar-decisao-final` lida com `work_sample_sjt='na'` + caso aberto pendente | **JÁ CORRIGIDO** (350e994). `normalizeSjtComposite` verified L173-182: filtra `status==='sucesso'`, retorna null só quando NENHUMA sub-row confirmada, MC preservado. Job = teste de regressão + verificar deploy PROD (Validation Architecture). |
| FIX-02 | Tela de avaliação carrega perguntas (`status='active'` vs filtro `'ativo'`) | **JÁ CORRIGIDO** (686c460). `avaliacaoService.ts:139` verified `.eq('status', 'active')`. Job = teste de regressão (mock supabase retorna rows com 'active') + verificar (Validation Architecture). |
</phase_requirements>

## Summary

Phase 18 is a **hardening phase on a shipped surface**. Three of the five requirements (FIX-01, FIX-02, and the retry/backoff core of RESIL-01) are already implemented and verified in source. The research scope is therefore narrow and concrete: confirm the exact Anthropic TS SDK request-options API for adding a per-call timeout that **composes** with the existing hand-rolled retry loop without double-retrying; size the bigfive parallelization against Supabase EF execution limits; pin the TanStack Query v5 + `supabase.functions.invoke` error surface so `<AsyncState>` can distinguish AI-overload from generic errors; and define the regression-test shape that would have caught each of the two already-fixed bugs.

The single most important technical finding for RESIL-01: the Anthropic SDK's `messages.parse()` (and `messages.create()`) accept a **second positional `RequestOptions` argument** `{ timeout, maxRetries, signal, headers }`. The SDK's **default `maxRetries` is 2** and its **default `timeout` is 10 minutes — dynamically scaled UP to 60 minutes when `max_tokens` is large and the request is non-streaming**. `callAi()` already has a hand-rolled `MAX_ATTEMPTS=3` retry loop, so the timeout must be added as `{ timeout: AI_CALL_TIMEOUT_MS, maxRetries: 0 }` — setting `maxRetries: 0` is **mandatory** to avoid the SDK silently retrying inside each of your three attempts (3 × 3 = up to 9 real API calls, each able to take the full timeout). This is the cleanest composition and the gap that causes the live 38–102s hangs: with no per-call cap, a single overloaded Anthropic call can sit for minutes and blow the EF's 150s request-idle ceiling before the retry loop ever gets a chance.

The second finding for RESIL-03: there is a **real, undocumented gap** — `decisaoService.getConsolidacao` (and the analogous services) collapse every EF/transport error into a single generic `NETWORK_ERROR` code and never read the EF response body's `error_code`. For the UI-SPEC's "AI overload" copy (`'O serviço de IA está sobrecarregado…'`) versus generic copy (`'Verifique a conexão…'`) to actually differentiate, the services must extract `error_code:'AI_UNAVAILABLE'` from the EF error body and surface it to `<AsyncState>` via its `errorCode` prop. This is a planner-actionable wiring task, not just a presentational component.

**Primary recommendation:** Add `AI_CALL_TIMEOUT_MS` (default 25000) + `MAX_ATTEMPTS` env-config to `callAi()`, wrap each provider call in `{ signal: AbortSignal.timeout(ms), maxRetries: 0 }`; parallelize bigfive with `Promise.allSettled` (5 concurrent is safe within EF limits) at 1 attempt/dim with per-dim template degrade; extract `<AsyncState>` per the approved 18-UI-SPEC; thread `error_code:'AI_UNAVAILABLE'` from the EF body through the services into `<AsyncState>.errorCode`; add Vitest/Deno regression tests for FIX-01/FIX-02; redeploy changed EFs as a `[BLOCKING]` human-gated step.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-call AI timeout + configurable attempts | API / Edge Function (`_shared/ai-client.ts`) | — | Single shared runtime; all AI EFs import `callAi`. RESIL-01 must live here, not per-EF. |
| Structured `{error_code:'AI_UNAVAILABLE', retryable}` 503 contract | API / Edge Function (each EF's `Deno.serve` handler) | _shared (callAi returns `error_code`) | The HTTP status + body shape is set in each EF's serve wrapper; callAi only surfaces the `error_code` string. |
| Bigfive 5-dim parallelization + budget | API / Edge Function (`gerar-devolutiva-bigfive`) | _shared (callAi) | Execution-window concern is local to this EF's handler loop. |
| Graceful-degrade UI states (loading/slow/error/empty) | Browser / Client (`<AsyncState>` component) | Frontend service layer | Presentational; driven by TanStack Query result flags. |
| Mapping EF error_code → UI copy selector | Frontend service layer (`*Service.ts`) | Browser (`<AsyncState>.errorCode`) | The service owns transport→domain error translation; component is dumb. |
| FIX-01 SJT composite aggregation | API / Edge Function (`consolidar-decisao-final`) | — | Pure deterministic function `normalizeSjtComposite`; already correct. |
| FIX-02 SJT items load | Frontend service layer (`avaliacaoService.ts`) | Database (RLS `USING status='active'`) | Sentinel alignment; already correct. |

## Standard Stack

This phase **adds no new packages**. It hardens existing, pinned dependencies. Versions below are the in-repo pins verified against source.

### Core (existing — verified in source)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `0.102.0` | Anthropic Messages API (primary AI provider) | Already pinned in all AI EFs `[VERIFIED: source — gerar-devolutiva-bigfive/index.ts:47]`; static `npm:` import. |
| `openai` | `6.42.0` | OpenAI fallback (`gpt-4o-mini`) when breaker OPEN | Already pinned `[VERIFIED: source :49]`. |
| `zod` | `3.25.76` (`/v4` entry) | Structured output schemas | `/v4` entry mandatory — helpers do `require("zod/v4")` `[VERIFIED: source :46]`. |
| `@supabase/supabase-js` | `^2.104.0` (frontend), `@2` esm.sh (EF) | Client + service_role | `[VERIFIED: package.json + source]`. |
| `@tanstack/react-query` | `^5.90.10` | Frontend server-state; drives `<AsyncState>` flags | `[VERIFIED: package.json]`. v5 — no `onError` callback. |
| `vitest` | `^4.0.7` | Frontend regression tests (FIX-02, services, `<AsyncState>`) | `[VERIFIED: package.json]`. |
| `@testing-library/react` | `^16.3.2` | `<AsyncState>` component tests | `[VERIFIED: package.json]`. |
| Deno std `assert` | `0.224.0` | EF tests (callAi timeout, bigfive parallel, FIX-01) | `[VERIFIED: source — ai-client.test.ts:27]`. |

### Supporting (existing — UI primitives, no install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | (vendored) | `AlertTriangle`, `Loader2`, `RotateCcw` icons | `<AsyncState>` state icons (per 18-UI-SPEC §Color/§Component). |
| Vendored `Glass`/`GlassButton`/`Skeleton` | `src/components/ui/` | Glass surface + retry button + loading skeleton | `<AsyncState>` composes these — NO registry pull (18-UI-SPEC §Registry Safety: N/A). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled retry loop in `callAi` + `maxRetries:0` | SDK's built-in `maxRetries:2` | SDK retries don't expose per-attempt hooks for the circuit-breaker `recordFailure()` or the `ai_call_logs` `attempt_number`. The existing loop is intentional; KEEP it, disable SDK retry. `[CITED: platform.claude.com/docs §Retries]` |
| `Promise.allSettled` over 5 dims | `p-limit` concurrency cap (e.g. 2) | Full parallel (5) is safe within EF limits (analysis below). A cap adds a dep + latency for marginal rate-limit insurance. Recommend full parallel; note the cap as the fallback lever. |
| `AbortSignal.timeout(ms)` | Manual `AbortController` + `setTimeout` | `AbortSignal.timeout()` is built-in (Deno + modern runtimes), self-cleaning, no leaked timer. Prefer it. `[ASSUMED — confirm AbortSignal.timeout in Deno EF runtime, see Open Questions]` |

**Installation:** None. `npm install` not run for this phase.

**Version verification:** Pins verified against in-repo source (not re-fetched from registry — they are already shipped and PROD-green per MEMORY `reference_ef_npm_join_import_bug`). No new packages → no slopcheck gate required (see Package Legitimacy Audit).

## Package Legitimacy Audit

> This phase installs **no external packages**. All dependencies are already present, pinned, and PROD-green from prior M2 phases.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (none added) | — | N/A — no installs this phase |

**Packages removed due to slopcheck [SLOP] verdict:** none (no installs).
**Packages flagged as suspicious [SUS]:** none (no installs).

slopcheck not run because the phase adds zero dependencies. If the planner introduces `p-limit` (NOT recommended — see Alternatives), it must run the legitimacy gate first.

## Architecture Patterns

### System Architecture Diagram

```
RESIL-01 / RESIL-02 (Edge Function tier)
─────────────────────────────────────────
  AI EF (e.g. gerar-devolutiva-bigfive, avaliar-redacao, consolidar=NO-LLM)
        │  invokes
        ▼
  _shared/ai-client.ts :: callAi(args, deps)
        │  idempotency replay → injection → PII mask → breaker.canRequest()
        ▼
   ┌─ breaker OPEN ──────────────► OpenAI fallback (gpt-4o-mini)
   │
   └─ breaker CLOSED
        │  loop attempt 1..MAX_ATTEMPTS  (env-configurable)
        ▼
     anthropic.messages.parse(
        { model, max_tokens, system[], messages, output_config },
        { signal: AbortSignal.timeout(AI_CALL_TIMEOUT_MS),   ◄── NEW (RESIL-01)
          maxRetries: 0 }                                     ◄── NEW (prevents double-retry)
     )
        │  on timeout → APIConnectionTimeoutError (retryable) → backoff → next attempt
        │  attempts exhausted → OpenAI fallback OR
        ▼                        EF returns { error_code:'AI_UNAVAILABLE', retryable:true } HTTP 503
   ─────────────────────────────────────────────────────────
RESIL-03 (Browser + service tier)
        │  supabase.functions.invoke(...) → { data, error }
        ▼
   *Service.ts :: extract error_code from EF body  ◄── GAP: must add (Pitfall 4)
        │  throws ServiceError{ code, error_code? }
        ▼
   useQuery (TanStack v5) → { isPending, isError, error, refetch }
        │
        ▼
   <AsyncState isLoading isError errorCode={'AI_UNAVAILABLE'|...} onRetry slowAfterMs>
        loading → slow(>8s) → error(retry btn) → empty → success
```

### Pattern 1: Per-call timeout via SDK RequestOptions, composing with the hand-rolled loop (RESIL-01)

**What:** The Anthropic TS SDK methods accept a second positional `RequestOptions` argument. `messages.parse()` (the zod structured-output helper) shares the same call shape as `messages.create()`.

**When to use:** Inside `callAi`'s existing `while (attempt < MAX_ATTEMPTS)` loop, on the `anthropic.messages.parse({...})` call (source L320-330) and the OpenAI fallback `parse({...})` call (L418-425).

**Example (recommended composition):**
```typescript
// Source: platform.claude.com/docs/en/api/sdks/typescript §Retries + §Timeouts [CITED]
// callAi additions — env-config at module top:
const AI_CALL_TIMEOUT_MS = Number(Deno.env.get("AI_CALL_TIMEOUT_MS") ?? "25000");
const MAX_ATTEMPTS = Number(Deno.env.get("MAX_ATTEMPTS") ?? "3");

// Inside the attempt loop, second arg to parse():
const response = await anthropic.messages.parse(
  { model: prompt.model_id, max_tokens: prompt.max_tokens, /* …existing body… */ },
  {
    signal: AbortSignal.timeout(AI_CALL_TIMEOUT_MS), // hard per-call wall
    maxRetries: 0,  // CRITICAL: disable SDK's default 2 retries — the loop owns retry
  },
);
```

**Why `maxRetries: 0` is mandatory:** SDK default is `maxRetries: 2` `[CITED: docs §Retries]`. Without disabling it, each of your `MAX_ATTEMPTS` (3) iterations would itself retry up to 2× internally → up to 9 real API calls per `callAi`, each able to consume `AI_CALL_TIMEOUT_MS`, and the SDK retries would silently bypass your `breaker.recordFailure()` / `attempt_number` accounting.

**Why the timeout matters more than the retry:** SDK default `timeout` is 10 minutes, **scaled UP to as much as 60 minutes for large `max_tokens` non-streaming requests** `[CITED: docs §Timeouts — formula `(60*60*maxTokens)/128000`]`. bigfive uses `max_tokens: 1200` (source L518), the analise/redação EFs more. With no override, one overloaded call can hang far past the EF's **150s request-idle ceiling** → the client gets a 504, the retry loop never runs. The 25s per-call cap (× 3 attempts + backoff ≈ under 90s worst case for single-call EFs) keeps the whole `callAi` under the ceiling.

**Signal vs timeout option:** Both are valid. `{ timeout: ms }` is the SDK-native option (throws `APIConnectionTimeoutError`, already matched by `isRetryable`'s `/timeout/i` regex at source L198). `{ signal }` is the generic abort. **Recommend `{ timeout: AI_CALL_TIMEOUT_MS, maxRetries: 0 }`** (SDK-native, retryable error type already handled) over a raw `AbortSignal`, because CONTEXT says "via AbortSignal" but the SDK's `timeout` option is the cleaner, documented mechanism that produces a retryable error your loop already classifies. If the planner prefers the literal `AbortSignal` wording, use `{ signal: AbortSignal.timeout(ms), maxRetries: 0 }` — but then add `AbortError`/`TimeoutError` to `isRetryable` (the abort throws a `DOMException` named `TimeoutError`/`AbortError`, NOT matched by the current regex). **Decision input for planner:** the `{ timeout }` option needs zero change to `isRetryable`; the `{ signal }` route needs an `isRetryable` extension. Prefer `{ timeout }`.

### Pattern 2: Bigfive 5-dim parallelization with per-dim degrade (RESIL-02)

**What:** Replace the sequential `for (const dim of DIMS) { await personalizeDim(...) }` (source L390-407) with a parallel `Promise.allSettled` over the 5 dims, **1 attempt each** (CONTEXT decision), per-dim graceful-degrade to the deterministic `BAND_TEMPLATES` text on rejection/word-count-miss.

**When to use:** `gerar-devolutiva-bigfive/index.ts` handler only.

**Execution-budget proof (why 5 concurrent is safe):**
- EF wall-clock limit: **400s**; request-idle: **150s**; CPU: **2s** (CPU excludes async I/O — AI calls are I/O) `[CITED: supabase.com/docs/guides/functions/limits]`.
- EF memory: **256MB per isolate** `[CITED: supabase Discussion #6834]`. 5 in-flight `fetch` + JSON parse of ~200-word responses is well under 256MB.
- Sequential today: 5 dims × up to 2 attempts × (call latency). At observed 38–102s/call this is the documented timeout cause.
- Parallel + 1 attempt: wall time ≈ max(single call) not sum. With the new 25s per-call cap, worst case ≈ 25s + persist, comfortably inside 150s.

**Example:**
```typescript
// Source: in-repo handler refactor (CONTEXT decision Área 1) [VERIFIED: source structure]
const results = await Promise.allSettled(
  DIMS.map(async (dim) => {
    const meta = byDim.get(dim);
    const percentil = typeof meta?.percentil === "number" ? meta.percentil : 50;
    const banda = bandOf(percentil);
    const rawTemplate = BAND_TEMPLATES[dim][banda];
    // 1 attempt now (was 2). personalizeDim already degrades to rawTemplate on miss/throw.
    const { texto, palavras } = await personalizeDim(
      dim, percentil, banda, rawTemplate, callAi,
      { candidato_id: candidatoId, vaga_id: vagaId },
    );
    return { dim, banda, percentil, texto_interpretativo: texto, palavras };
  }),
);
// allSettled never rejects → map fulfilled to paginas; for any 'rejected'
// (should be none — personalizeDim never throws), degrade to template inline.
const paginas: PaginaOut[] = results.map((r, i) => {
  const dim = DIMS[i];
  if (r.status === "fulfilled") return r.value;
  const meta = byDim.get(dim);
  const percentil = typeof meta?.percentil === "number" ? meta.percentil : 50;
  const banda = bandOf(percentil);
  const rawTemplate = BAND_TEMPLATES[dim][banda];
  return { dim, banda, percentil, texto_interpretativo: rawTemplate, palavras: wordCount(rawTemplate) };
});
```

**Important preservation notes for the planner:**
- `personalizeDim` currently loops `for (attempt = 0; attempt < 2; attempt++)` (source L313). CONTEXT decision = **1 attempt per dim** under parallel — change the loop bound to 1, OR pass an attempts arg. Keep the word-count `inRange` gate and the `return rawTemplate` degrade (L323-324).
- `paginas` order MUST stay O,C,E,A,N (DIMS order) — `allSettled` preserves input order, so index-mapping is safe.
- Rate-limit risk of 5 concurrent Anthropic calls: low for a single candidate's devolutiva (5 small calls). If 429s spike under load, the per-dim degrade already absorbs them (candidate still gets the template). A concurrency cap of 2 is the documented fallback lever if PROD shows 429 clustering — not needed now.

### Pattern 3: `<AsyncState>` wrapper driven by TanStack Query v5 (RESIL-03)

**What:** A presentational wrapper that maps `{ isLoading|isPending, isError, error, refetch }` + an `errorCode` to the exact 5-state contract in 18-UI-SPEC.md (loading → slow@8s → error+retry → empty → success).

**When to use:** All AI-backed read/result regions per 18-UI-SPEC §Adoption Surface. `HubSection` refactored to delegate.

**TanStack Query v5 surface (verified):** components read `isPending`/`isLoading`, `isError`, `error`, `refetch` directly; **no `onError` callback** (removed in v5) `[VERIFIED: source — useConsolidacao.ts:33 + comment L29-31]`. For a query, `isPending` = no data yet; `isLoading` = `isPending && isFetching` (first load). The UI-SPEC uses `isLoading || isPending` for the loading state.

**Example (recommended shape — per 18-UI-SPEC Component API):**
```tsx
// Source: 18-UI-SPEC.md §Component API + HubSection.tsx idiom [CITED: 18-UI-SPEC.md]
interface AsyncStateProps {
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  errorCode?: string          // 'AI_UNAVAILABLE' → sobrecarga copy; else generic
  slowAfterMs?: number        // default 8000
  onRetry?: () => void
  retrying?: boolean
  glass?: boolean             // wrap in <Glass variant="dark">; default true
  copy?: Partial<AsyncStateCopy>
  children: ReactNode
}
// Slow state = timed escalation of loading: useState+useEffect setTimeout(slowAfterMs),
// cleared on resolve. NEVER replaces a resolved success/error.
// Error copy selector: errorCode === 'AI_UNAVAILABLE' ? COPY.error.overload : COPY.error.generic
```

**Slow-state timer pattern:** `useEffect` starts a `setTimeout(slowAfterMs)` while `isLoading`, sets a local `isSlow` flag, and clears on unmount / resolution. Vitest fake-timers are already bridged for this (`tests/setup.ts` jest-shim, L23-32) `[VERIFIED: source]`.

### Anti-Patterns to Avoid
- **Leaving SDK `maxRetries` at default (2) while keeping the hand-rolled loop** → up to 9× API calls, breaker accounting bypassed. Always `maxRetries: 0`.
- **No per-call timeout** → the live 38–102s hang; the dynamic timeout scales to 60min for large `max_tokens`. Always cap.
- **`Promise.all` (not `allSettled`)** for bigfive → one rejected dim rejects the whole batch, losing the other 4. Use `allSettled` (CONTEXT-locked) or rely on `personalizeDim` never throwing.
- **`<AsyncState>` reading the raw transport `error` for copy selection** → the EF body's `error_code` is what distinguishes overload; the service must extract it (Pitfall 4). Component must not parse Supabase errors.
- **`select('*')` in any new/edited read** → RLS is row-level only; candidate-facing reads use explicit allowlists (MEMORY `reference_select_star_leaks_pii`). `avaliacaoService` already allowlists (L135).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-call AI timeout | Manual `Promise.race([call, timeoutPromise])` | SDK `{ timeout: ms }` request option | Native, throws a retryable `APIConnectionTimeoutError` the existing `isRetryable` already matches; no leaked timer/promise. |
| Retry/backoff | New retry logic | Existing `callAi` loop (`Math.pow(2,attempt)*1000+jitter`) | Already shipped + PROD-green; only add the timeout + env-config. |
| Circuit breaker | New breaker | `_shared/circuit-breaker.ts` (CLOSED/OPEN/HALF-OPEN, 5/60s) | Already shipped. |
| Loading/error/empty UI | Per-screen ad-hoc states | `<AsyncState>` generalizing `HubSection` | CONTEXT-locked; 18-UI-SPEC defines verbatim copy. |
| Concurrency over 5 dims | `p-limit` dep | `Promise.allSettled` | Native; 5 is within EF limits; avoids a new dependency + slopcheck gate. |

**Key insight:** Nearly everything RESIL-01 needs already exists in `callAi`. The phase's risk is OVER-building (re-implementing retry/breaker) rather than the surgical 2-line timeout + env-config addition. The planner should frame RESIL-01 tasks as "augment `callAi`", not "build resilience".

## Common Pitfalls

### Pitfall 1: SDK double-retry (maxRetries default 2 × hand-rolled loop)
**What goes wrong:** Adding `{ timeout }` but forgetting `{ maxRetries: 0 }` → SDK retries 2× inside each of 3 loop attempts = up to 9 API calls; breaker `recordFailure()` and `ai_call_logs.attempt_number` undercount.
**Why it happens:** SDK default `maxRetries: 2` `[CITED: docs §Retries]`; the hand-rolled loop is invisible to the SDK.
**How to avoid:** Always pass `{ timeout: ..., maxRetries: 0 }` together.
**Warning signs:** `ai_call_logs` shows fewer rows than real API calls; cost higher than `attempt_number` implies.

### Pitfall 2: Dynamic timeout hides the hang in tests but not PROD
**What goes wrong:** Deno tests mock `messages.parse` (instant resolve/reject) so a missing timeout never manifests; PROD hangs to 60min/150s-ceiling.
**Why it happens:** SDK default timeout scales with `max_tokens` (formula); tests never exercise real latency (DI mocks).
**How to avoid:** Add an explicit Deno test that asserts the SECOND argument to the mocked `parse` contains `{ maxRetries: 0 }` and a finite `timeout`/signal (assert on the recorded `calls[i][1]`). The existing mock records `req` as `calls.push(req)` — extend to capture the options arg.
**Warning signs:** `wall clock time limit reached` / `504` in EF logs (MEMORY `project_funil_e2e_seed_achados` achado #1/#2).

### Pitfall 3: `AbortSignal.timeout` error not classified as retryable
**What goes wrong:** If the planner uses raw `{ signal: AbortSignal.timeout(ms) }` instead of `{ timeout }`, the abort throws a `DOMException` named `TimeoutError`/`AbortError` — the current `isRetryable` regex (`/529|overloaded|timeout|503|429/i`, source L198) matches "timeout" in a message but NOT a `DOMException.name === 'TimeoutError'` with an empty message.
**Why it happens:** Abort errors carry the signal info in `.name`, not always `.message`.
**How to avoid:** Prefer `{ timeout }` (no change needed). If using `{ signal }`, extend `isRetryable` to also check `err?.name === 'TimeoutError' || err?.name === 'AbortError'`.
**Warning signs:** A timed-out call falls straight to OpenAI fallback instead of retrying Anthropic.

### Pitfall 4: Generic error code swallows AI_UNAVAILABLE → wrong UI copy
**What goes wrong:** `decisaoService.getConsolidacao` maps EVERY EF/transport error to `NETWORK_ERROR` and never reads the EF body's `error_code` (verified source L96-111). `<AsyncState>` then always shows generic copy, never the "serviço de IA sobrecarregado" copy the UI-SPEC mandates for `AI_UNAVAILABLE`.
**Why it happens:** `supabase.functions.invoke` returns `{ data, error }`; on non-2xx the structured body is on `error.context` (a `Response`) OR, for the EF's own `{ok:false,error_code}` 200-body shape, on `data`. The current code reads neither's `error_code`.
**How to avoid:** In each AI-invoking service, after `invoke`, attempt to read `error_code` from (a) `data?.error_code` (when EF returns a 200/4xx JSON body the client parses into `data`) and (b) `await error?.context?.json?.()?.error_code` for non-2xx `FunctionsHttpError`. Surface it on the thrown `ServiceError` (`.error_code`), and pass `query.error?.error_code` (or read it from the error in the component) into `<AsyncState errorCode>`. Wire a shared helper `extractEfErrorCode(data, error)` to avoid per-service drift (the integration-contract lesson — MEMORY `feedback_integration_contract_gap`).
**Warning signs:** Overload (503) shows "Verifique a conexão" instead of "serviço de IA está sobrecarregado".
**Note for planner:** This is the most likely-to-be-missed task. RESIL-03 is NOT just the component; it's the component PLUS the service-layer error_code plumbing.

### Pitfall 5: 503 vs 200-body error-shape mismatch across EFs
**What goes wrong:** CONTEXT says exhausted/breaker → HTTP **503** with `{error_code:'AI_UNAVAILABLE',retryable:true}`. But `consolidar-decisao-final` (and others) currently use a 200-body `{ok:false,error_code}` convention (verified `decisaoService` L104-111 reads `data.ok===false`), and bigfive uses `500/422/200` by `out.status` (source L588). The error-shape is NOT uniform across EFs today.
**Why it happens:** Each EF wrote its own serve-wrapper status logic across M2.
**How to avoid:** RESIL-01 says the AI_UNAVAILABLE contract is uniform via the shared helper. The planner must decide: (a) standardize on HTTP 503 + body `{error_code:'AI_UNAVAILABLE',retryable:true}` for AI-exhaustion across all AI EFs, and (b) update each service's error extraction to handle BOTH the legacy `data.ok===false` and the new 503 body. Don't break the existing `consolidar` contract (it's NO-LLM and never emits AI_UNAVAILABLE — its 200-body convention stays).
**Warning signs:** One screen shows retry, another doesn't, for the same underlying overload.

### Pitfall 6: Editing `_shared/ai-client.ts` re-deploys ALL AI EFs' contracts but bundles freeze per-EF
**What goes wrong:** A change to `_shared/ai-client.ts` only takes effect in an EF when that EF is **redeployed** — other EFs keep their frozen bundle (MEMORY `reference_ef_shared_bundle_freeze`).
**Why it happens:** Deno EF deploy bundles `_shared` into each function at deploy time.
**How to avoid:** The `[BLOCKING]` deploy step must redeploy **every AI EF that imports callAi** (list in Integration Points), not just `consolidar-decisao-final`. Use `get_edge_function` to diff deployed-vs-local before/after.
**Warning signs:** Some EFs still hang post-deploy while others are fixed.

### Pitfall 7: Static `npm:` imports — never dynamic
**What goes wrong:** `await import([...].join(""))` hides the specifier from the deploy bundler → `ERR_MODULE_NOT_FOUND` → EF 500s on every call (MEMORY `reference_ef_npm_join_import_bug`).
**How to avoid:** Keep all `npm:`/`zod/v4` imports STATIC at module top (already the case — source L41-50). Any new import added for RESIL must be static.
**Warning signs:** EF 500 with `ERR_MODULE_NOT_FOUND` post-deploy.

## Runtime State Inventory

> This phase edits code + redeploys EFs. It does NOT rename/migrate stored data. Inventory included because of the EF redeploy + env-var additions.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no DB schema/data change. `normalizeSjtComposite` is read-only aggregation; `avaliacaoService` is a read. | None — verified: no migration in scope (CONTEXT: code + deploy only). |
| Live service config | **EF deployed code in PROD** — `consolidar-decisao-final` must be verified deployed (FIX-01 already committed but deploy state unconfirmed). All AI EFs importing `callAi` must be redeployed to pick up RESIL-01. | `[BLOCKING]` human-gated redeploy via Supabase CLI `functions deploy` / MCP `get_edge_function` diff. |
| OS-registered state | None — no scheduler/cron registrations touched. | None — verified: no n8n/scheduler change in scope. |
| Secrets/env vars | **NEW env vars** `AI_CALL_TIMEOUT_MS` (default 25000) + `MAX_ATTEMPTS` (default 3). Code reads them with a default fallback, so absence in PROD is safe (graceful default). | Optional: set in Supabase EF secrets if non-default desired. Code MUST default-guard (no hard failure if unset). |
| Build artifacts | EF bundles re-generated on redeploy. No npm package re-install (no deps added). | Covered by the `[BLOCKING]` redeploy step. |

**The canonical question — after every file is updated, what runtime still has stale behavior?** The deployed EF bundles. RESIL-01 lives in `_shared` → every AI EF's bundle is stale until redeployed. This is the single most important runtime-state item.

## Code Examples

### Extracting EF error_code in the service layer (RESIL-03 plumbing — the GAP)
```typescript
// Source: decisaoService.ts current shape (L92-111) + supabase-js FunctionsHttpError [CITED: source + supabase-js]
async function extractEfErrorCode(
  data: unknown,
  error: { context?: Response } | null,
): Promise<string | undefined> {
  // (a) EF returned a JSON body the client parsed into `data` (200 or parsed 4xx)
  if (data && typeof data === 'object' && 'error_code' in data) {
    return String((data as { error_code?: unknown }).error_code ?? '') || undefined
  }
  // (b) Non-2xx FunctionsHttpError → structured body on error.context (a Response)
  try {
    const body = await error?.context?.json?.()
    if (body && typeof body === 'object' && 'error_code' in body) {
      return String((body as { error_code?: unknown }).error_code ?? '') || undefined
    }
  } catch { /* body not JSON — fall through to generic */ }
  return undefined
}
// Throw with the code so the component can branch copy:
// throw new DecisaoServiceError(msg, 'NETWORK_ERROR', { error_code })  ← add error_code to details
```

### Deno regression test for FIX-01 (`normalizeSjtComposite` — pure function)
```typescript
// Source: ai-client.test.ts DI/assert idiom [CITED: source]
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeSjtComposite } from "../index.ts"; // export it if not already

Deno.test("FIX-01: caso_aberto pendente-único → null", () => {
  const rows = [{ status: "pendente_humano", score: null, score_max: null, tipo: "sjt" }];
  assertEquals(normalizeSjtComposite(rows as never), null);
});
Deno.test("FIX-01: MC sucesso preserved when caso_aberto pendente", () => {
  const rows = [
    { status: "sucesso", score: 8, score_max: 10, tipo: "sjt" },          // MC
    { status: "pendente_humano", score: null, score_max: null, tipo: "sjt" }, // caso_aberto
  ];
  assertEquals(normalizeSjtComposite(rows as never), 80); // 8/10*100, caso_aberto not zeroing
});
```
**Note:** `normalizeSjtComposite` may not be exported today — the planner must add an `export` to make it testable (it is currently a module-private `function` at L173). Pure-function extraction is the right test layer (fast, no network).

### Vitest regression test for FIX-02 (`avaliacaoService` SJT load)
```typescript
// Source: src/features/avaliacao/services/__tests__/*.test.ts idiom [CITED: source presence]
import { describe, it, expect, vi } from 'vitest'
// Mock supabase client so `.eq('status','active')` is asserted + returns rows.
const eq = vi.fn().mockResolvedValue({ data: [{ id: 'p1', status: 'active' }], error: null })
const select = vi.fn(() => ({ eq }))
vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ select })) /* + candidatura read mock */ },
}))
it("FIX-02: queries perguntas with status='active' and returns rows", async () => {
  // …call the service fn…
  expect(eq).toHaveBeenCalledWith('status', 'active') // would have failed on legacy 'ativo'
  // expect returned perguntas length > 0
})
```

### Deno test asserting timeout options are passed (RESIL-01)
```typescript
// Extend makeMockAnthropic to record the OPTIONS arg (calls.push([req, opts]))
Deno.test("RESIL-01: per-call timeout + maxRetries:0 passed to messages.parse", async () => {
  const mock = makeMockAnthropic(); // mock records [body, options]
  await callAi(args, { ...deps, anthropic: mock });
  const [, opts] = mock.calls[0] as [unknown, { timeout?: number; maxRetries?: number }];
  assertEquals(opts.maxRetries, 0);
  assert(typeof opts.timeout === "number" && opts.timeout > 0);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TanStack Query `onError` callback in `useQuery` options | Component reads `isError`/`error` directly | v5 (2024) | Already adopted in-repo (useConsolidacao comment L29-31). `<AsyncState>` follows. |
| Dynamic `await import([...].join(""))` for npm in EFs | Static `npm:`/`zod/v4` top-level imports | M2 AVAL-03 | All AI EFs already static. Preserve. |
| SDK retries left at default + no timeout | Explicit `{ timeout, maxRetries: 0 }` per call | This phase (RESIL-01) | Prevents the 60-min dynamic-timeout hang. |

**Deprecated/outdated:**
- `onError`/`onSuccess` query callbacks: removed in TanStack Query v5 — do NOT add them.
- SDK `messages.create` without options for slow calls: relies on the 10–60min default timeout — unsafe inside a 150s EF idle ceiling.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `AbortSignal.timeout(ms)` is available in the Supabase Deno EF runtime | Standard Stack / Pattern 1 | Low — it's standard in Deno ≥1.28 (SDK min) and modern runtimes. If absent, fall back to SDK `{ timeout }` option (no signal needed). Verifiable at execute time with a one-line Deno check; the `{ timeout }` route sidesteps it entirely. |
| A2 | `messages.parse()` (zod helper) accepts the same second `RequestOptions` arg as `messages.create()` | Pattern 1 | Low-Medium — docs show options on `create`; `parse` is a thin wrapper over `create` in 0.102.0. Risk: the helper signature differs. Mitigation: planner verifies the `parse` signature in `node_modules`/Deno cache during Wave 0; if it differs, use `create` + manual zod parse or `{ timeout }` on the client constructor as a per-EF default. |
| A3 | `supabase-js` `FunctionsHttpError.context` is a `Response` with `.json()` carrying the EF body | Pitfall 4 / Code Examples | Medium — supabase-js exposes the raw response on `error.context`; exact shape can vary by version (`^2.104.0`). Mitigation: the `extractEfErrorCode` helper try/catches and falls back to generic copy — safe degradation, never throws. |
| A4 | Default `AI_CALL_TIMEOUT_MS = 25000` keeps single-call EFs under the 150s idle ceiling | Pattern 1/2 | Low — 25s × 3 attempts + exp-backoff (2+4s) ≈ 81s worst case < 150s. If Sonnet routinely exceeds 25s for large prompts, tune up (env-configurable by design). |
| A5 | Full 5-way `Promise.allSettled` won't trigger Anthropic 429 clustering for a single devolutiva | Pattern 2 | Low — 5 small concurrent calls per candidate; per-dim degrade absorbs any 429. Fallback lever: concurrency cap of 2. |

## Open Questions (RESOLVED — addressed in plans)

> All three questions have documented resolution paths in the Phase 18 plans: Q1/A2 (parse() signature) → 18-01 Task 1 investigation + constructor fallback; Q2 (uniform 503 vs legacy error shapes) → `extractEfErrorCode` handles both body shapes (18-05); Q3 (redeploy set + consolidar deploy state) → 18-07 Task 1 `get_edge_function` diff.

1. **Does `messages.parse()` accept the `RequestOptions` second arg in 0.102.0?**
   - What we know: `messages.create()` does (docs, verified). `parse` is the structured-output wrapper.
   - What's unclear: exact `parse` signature in the pinned 0.102.0.
   - Recommendation: Wave 0 — grep the Deno-cached `@anthropic-ai/sdk@0.102.0/helpers/zod` or `resources/messages` `.d.ts` for the `parse` signature. If options aren't accepted, set `timeout`/`maxRetries` on the **client constructor** (`new Anthropic({ timeout, maxRetries: 0 })`) as a per-EF default instead — still satisfies RESIL-01.

2. **Uniform 503 AI_UNAVAILABLE contract vs legacy per-EF error shapes.**
   - What we know: CONTEXT mandates `{error_code:'AI_UNAVAILABLE',retryable:true}` 503; today EFs use mixed 200-body `{ok:false}` / `500/422/200`.
   - What's unclear: how many EFs need their serve-wrapper status logic updated vs just the AI-exhaustion path.
   - Recommendation: Standardize the AI-exhaustion path to 503 across AI EFs; leave non-AI EF (`consolidar`) success/error shapes intact; the service `extractEfErrorCode` handles both. Plan one task per EF serve-wrapper.

3. **Which EFs actually need redeploy, and is `consolidar-decisao-final` currently deployed with the FIX-01 commit?**
   - What we know: FIX-01 committed 350e994; deploy state unconfirmed (CONTEXT explicitly asks to verify).
   - Recommendation: `[BLOCKING]` Wave — `get_edge_function` diff for `consolidar-decisao-final` + every AI EF in Integration Points; redeploy any stale.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI / MCP `functions deploy` | `[BLOCKING]` EF redeploy | ✓ (M2 precedent) | — | MCP `deploy_edge_function` |
| Deno (EF runtime + `deno test`) | callAi/bigfive/FIX-01 tests | ✓ | EF runtime | — |
| Anthropic API key (PROD) | live AI calls | ✓ (PROD-green) | — | OpenAI fallback (existing) |
| Vitest | frontend regression + `<AsyncState>` | ✓ | ^4.0.7 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none blocking — all hardening tools present.

## Validation Architecture

> nyquist_validation treated as enabled (no `workflow.nyquist_validation:false` found in config).

### Test Framework
| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest `^4.0.7` + @testing-library/react `^16.3.2`, env `happy-dom` |
| Framework (EF) | Deno test + `std@0.224.0/assert` |
| Config file | `vite.config.ts` (`test` block) — EF tests EXCLUDED from Vitest (run under `deno test`) |
| Quick run command | `npm run test:run` (frontend single run) |
| Full suite command | `npm run test:run` + `deno test --allow-read supabase/functions/...` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESIL-01 | callAi passes `{timeout, maxRetries:0}` to provider; timeout error is retryable; env defaults apply | unit (Deno, DI mock) | `deno test --allow-read supabase/functions/_shared/__tests__/ai-client.test.ts` | ✅ extend (mock records options arg) |
| RESIL-01 | breaker/fallback still fires on exhaustion; EF emits 503 `{error_code:'AI_UNAVAILABLE'}` | unit (Deno) | per-EF Deno test | ❌ Wave 0 (per AI EF serve-wrapper) |
| RESIL-02 | bigfive uses `Promise.allSettled` over 5 dims, 1 attempt, per-dim degrade, O-C-E-A-N order preserved, words in range | unit (Deno, DI mock callAi) | `deno test supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts` | ✅ extend (add parallel + 1-attempt + degrade cases) |
| RESIL-03 | `<AsyncState>` renders loading/slow@8s/error+retry/empty/success; `errorCode==='AI_UNAVAILABLE'` → overload copy, else generic; retry calls onRetry+disabled while retrying | component (Vitest + RTL + fake timers) | `npm run test:run` | ❌ Wave 0 (`<AsyncState>.test.tsx`) |
| RESIL-03 | service extracts `error_code` from EF body (`extractEfErrorCode`) | unit (Vitest, mocked invoke) | `npm run test:run` | ❌ Wave 0 (service test) |
| FIX-01 | `normalizeSjtComposite`: pending-only → null; MC sucesso preserved when caso_aberto pendente | unit (Deno, pure fn) | `deno test supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` | ✅ extend (export fn + 2 cases) |
| FIX-02 | service queries `.eq('status','active')` and returns rows | unit (Vitest, mocked supabase) | `npm run test:run` | ❌ Wave 0 (avaliacaoService test) |

### Sampling Rate
- **Per task commit:** `npm run test:run` (touched frontend) / scoped `deno test <file>` (touched EF).
- **Per wave merge:** full `npm run test:run` + all touched-EF `deno test`.
- **Phase gate:** full frontend suite green + all AI-EF Deno tests green + `npm run lint` (tsc baseline not regressed) before `/gsd-verify-work`. (Live PROD round-trip deferred to Phase 21 — do NOT gate on it here.)

### Wave 0 Gaps
- [ ] `supabase/functions/consolidar-decisao-final/__tests__/index.test.ts` — add FIX-01 cases (requires exporting `normalizeSjtComposite`).
- [ ] `src/features/avaliacao/services/__tests__/avaliacaoService.test.ts` (or extend existing) — FIX-02 `status='active'` assertion.
- [ ] `src/features/.../__tests__/AsyncState.test.tsx` — 5-state contract + errorCode copy branch + retry disabled-while-retrying (fake timers for slow@8s).
- [ ] Service test(s) for `extractEfErrorCode` — AI_UNAVAILABLE vs generic vs no-code.
- [ ] Extend `ai-client.test.ts` mock to record the options arg; assert `{maxRetries:0, timeout>0}`.
- [ ] Extend `gerar-devolutiva-bigfive` Deno test — parallel + 1-attempt + per-dim degrade + O-C-E-A-N order.

## Security Domain

> `security_enforcement` treated as enabled (no explicit `false` found). Hardening phase — no new data exposure, but EF error contracts + redeploy touch security surface.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth change; EFs keep existing two-client authenticate-then-authorize (M2/Phase 10). Preserve when editing serve-wrappers. |
| V3 Session Management | no | Unchanged. |
| V4 Access Control | yes | EFs edited for RESIL must NOT weaken authenticate-THEN-authorize. `consolidar`/AI EFs already enforce role+ownership; verify preserved post-edit. |
| V5 Input Validation | yes | Existing shared Zod request schemas (e.g. `ConsolidacaoRequestSchema.strict()`) unchanged; `<AsyncState>` adds no input. |
| V6 Cryptography | no | None. |
| V7 Error Handling & Logging | yes | The new `error_code:'AI_UNAVAILABLE'` body must NOT leak internals (no stack, no PII). EF logs already redacted to ids/counts (bigfive L448-455); preserve. `extractEfErrorCode` reads only `error_code`, never echoes raw error to the user. |

### Known Threat Patterns for {Deno EF + React frontend}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Error message leaks PII / internal detail in 503 body | Information Disclosure | Structured `{error_code, retryable}` only — no message/stack; UI copy is static PT-BR. |
| `select('*')` PII leak in any new/edited read | Information Disclosure | Explicit allowlists (MEMORY `reference_select_star_leaks_pii`); `avaliacaoService` already allowlists. |
| EF serve-wrapper edit drops authorize-after-authenticate | Elevation of Privilege | Preserve two-client + role/ownership check (MEMORY `reference_ef_authenticate_vs_authorize`); regression test the authz path stays. |
| RNF-07a violation — AI error path writes a score/decision | Tampering | `consolidar` is NO-LLM/deterministic; AI EFs never write `candidaturas` by score. Degrade path returns templates, writes nothing decisional. Preserve. |
| `_shared` bundle freeze → partial deploy leaves stale authz/contract | Tampering/DoS | Redeploy ALL AI EFs importing callAi; `get_edge_function` diff (Pitfall 6). |

## Sources

### Primary (HIGH confidence)
- `platform.claude.com/docs/en/api/sdks/typescript` — §Retries (default maxRetries 2, per-request override), §Timeouts (default 10min, dynamic scale formula `(60*60*maxTokens)/128000` up to 60min, per-request `{timeout}`), error types (`APIConnectionTimeoutError`).
- In-repo source (verified by Read): `_shared/ai-client.ts` (callAi structure, MAX_ATTEMPTS, isRetryable, retry loop), `gerar-devolutiva-bigfive/index.ts` (5 sequential dims L390-407, max_tokens 1200, personalizeDim 2-attempt loop), `consolidar-decisao-final/index.ts` (normalizeSjtComposite L173-182 — FIX-01 correct), `avaliacaoService.ts:139` (FIX-02 correct), `HubSection.tsx`, `ConsolidacaoDashboard.tsx`, `useConsolidacao.ts` (TanStack v5 surface), `decisaoService.ts` (error mapping GAP L96-111), `tests/setup.ts` (fake-timer bridge), `ai-client.test.ts` (DI mock idiom), `vite.config.ts` test block.
- `supabase.com/docs/guides/functions/limits` — wall-clock 400s, request-idle 150s, CPU 2s.
- 18-UI-SPEC.md (approved) — `<AsyncState>` states contract + verbatim PT-BR copy + Component API.
- 18-CONTEXT.md — locked decisions.

### Secondary (MEDIUM confidence)
- `supabase` GitHub Discussion #6834 — EF memory limit 256MB per isolate.
- `github.com/anthropics/anthropic-sdk-typescript` README — confirms per-request timeout/maxRetries/AbortSignal (cross-verified with platform docs).

### Tertiary (LOW confidence)
- `AbortSignal.timeout` Deno availability (A1) — standard but to confirm at execute time; `{timeout}` option route avoids reliance.
- `FunctionsHttpError.context` JSON shape (A3) — version-dependent; helper degrades safely.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; pins verified in source + PROD-green precedent.
- Architecture (RESIL-01 SDK API): HIGH — official docs confirm `{timeout, maxRetries}` + dynamic-timeout hazard.
- Architecture (RESIL-02 budget): HIGH — EF limits cited; arithmetic well within bounds.
- Architecture (RESIL-03 plumbing GAP): HIGH — verified `decisaoService` does not extract `error_code`; this is a real planner-actionable task.
- FIX-01/FIX-02 already-fixed: HIGH — verified in source (`normalizeSjtComposite` L173-182, `avaliacaoService` L139).
- `messages.parse` options signature (A2): MEDIUM — verify in Wave 0; client-constructor fallback exists.
- Pitfalls: HIGH — grounded in verified source + MEMORY lessons.

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (stable — pinned SDK versions; Supabase EF limits stable. SDK timeout/retry semantics unlikely to change within window.)

Sources:
- [Anthropic TypeScript SDK — platform.claude.com](https://platform.claude.com/docs/en/api/sdks/typescript)
- [anthropic-sdk-typescript README](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/README.md)
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase Edge Function wall clock time limit](https://supabase.com/docs/guides/troubleshooting/edge-function-wall-clock-time-limit-reached-Nk38bW)
- [Supabase Edge Functions Memory Limits — Discussion #6834](https://github.com/orgs/supabase/discussions/6834)
