---
phase: 18-resili-ncia-das-efs-de-ia-bugs-do-funil
reviewed: 2026-06-29T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - src/components/pages/ComparativoCandidatosPage.tsx
  - src/components/ui/AsyncState.tsx
  - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
  - src/features/avaliacao/components/RedacaoEditorScreen.tsx
  - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/avaliacao/services/bigfiveService.ts
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/components/DecisaoFinalPage.tsx
  - src/features/decisao/services/decisaoService.ts
  - src/features/hub-candidato/components/HubSection.tsx
  - src/features/triagem/components/ComparativoScreen.tsx
  - src/features/triagem/services/triagemService.ts
  - src/lib/efErrors.ts
  - supabase/functions/_shared/ai-client.ts
  - supabase/functions/consolidar-decisao-final/index.ts
  - supabase/functions/gerar-devolutiva-bigfive/index.ts
  - vite.config.ts
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-06-29
**Depth:** standard
**Files Reviewed:** 19 (one config file `src/features/avaliacao/services/__tests__/avaliacaoService.test.ts` and the other test/`ai-client.test.ts` files were read for context but are not in the source-scope count)
**Status:** issues_found

## Summary

Reviewed the Phase 18 hardening surface: the shared `<AsyncState>` wrapper + `extractEfErrorCode` (RESIL-03), the `callAi` per-call timeout/`maxRetries:0` plumbing (RESIL-01), the parallelized Big Five devolutiva fan-out (RESIL-02), the 5 screens that adopt `<AsyncState>`, the 4 services that thread the shared error-code extractor, the deterministic consolidation EF, and `vite.config.ts`.

The phase invariants hold up well under adversarial reading:

- **RNF-07a** — no reviewed path writes `candidaturas` by score; `consolidar-decisao-final` stays NO-LLM/deterministic (`functions.invoke` throws in its own mock; no evaluation EF or LLM is reached). Confirmed.
- **authenticate-then-authorize** — `consolidar-decisao-final` does role-from-`usuarios_rh` + vaga-ownership before any privileged read (clone of the comparativo skeleton). Confirmed.
- **static `npm:` imports** — both EFs use static `npm:`/esm.sh specifiers; no `["npm:", pkg].join("")` regression. Confirmed.
- **no `select('*')` PII leak** — every candidate-/RH-facing read names an explicit allowlist. Confirmed.
- **`extractEfErrorCode` never throws / code-only** — the helper degrades to `undefined` on a thrown `.json()` and discards every non-code field; the contract test pins it. Confirmed.
- **OCEAN order preserved** — devolutiva maps `allSettled` results back by index, not resolution order; the regression test proves it. Confirmed.

No BLOCKER-class defects were found. The findings below are robustness/maintainability concerns and a small set of pre-existing edge cases the refactor now touches. The two highest-value items are WR-01 (the devolutiva fan-out passes no `idempotency_key`, so the `callAi` idempotency-replay path is dead on this EF and a retry double-bills 5 IA calls) and WR-02 (the consolidation recommendation emits self-contradictory copy for a `pendente_humano` entrevista).

## Warnings

### WR-01: Big Five devolutiva fan-out passes no `idempotency_key` — retries double-bill 5 IA calls and the `callAi` replay path is dead here

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:571-599` (the `callAiAdapter`) + `:316-324` (`personalizeDim`)
**Issue:** `ai-client.callAi` has a first-class idempotency-replay guard (`tryIdempotencyReplay`, `ai-client.ts:244-271`) that returns a zero-cost replay when the same `idempotency_key` is already in `ai_call_logs`, explicitly "evita custo duplicado + inflacao de ai_cost_daily em retries pg_net" (`ai-client.ts:291-293`). But the devolutiva adapter never sets `idempotency_key` in the `callAi` args object (`:572-583`). Combined with RESIL-02's design — `submit-bigfive-final` fans out to this EF and the n8n/best-effort retry is acknowledged in the upsert comment (`:455` "o retry best-effort do n8n não pode falhar com 23505") — a re-invocation of this EF re-runs all 5 OCEAN `callAi` calls at full cost and writes 5 fresh `ai_call_logs` rows every time. The DB row is made idempotent via the `upsert(..., {onConflict:'candidatura_id'})`, but the *spend* is not. This is the exact failure the idempotency guard exists to prevent; here it is wired around.
**Fix:** Derive a stable per-dim key and thread it into the `callAi` args so the replay guard can fire:
```ts
// in callAiAdapter, build args:
const result = await callAi(
  {
    prompt: resolved,
    rawInput: userBlock,
    vagaRubricBlock: `Dimensão ${dimArgs.dim_label}`,
    candidato_id: dimArgs.candidato_id ?? "",
    vaga_id: dimArgs.vaga_id ?? "",
    schema: PaginaSchema,
    // stable across retries → tryIdempotencyReplay returns the prior (free) result
    idempotency_key: `bigfive_devolutiva:${dimArgs.candidato_id}:${dimArgs.dim_label}:${dimArgs.banda}`,
  },
  { /* deps unchanged */ },
);
```
(Pass the dim through `personalizeDim`'s `baseArgs` so the adapter receives it.) Note this is a cost/observability robustness gap, not a correctness bug — it does not affect the candidate output.

### WR-02: Consolidation recommendation emits contradictory copy for a `pendente_humano` entrevista (listed as both "revisão pendente" and "não avaliada")

**File:** `supabase/functions/consolidar-decisao-final/index.ts:202-207` (`buildRecommendation`) driven by `:373-376`
**Issue:** When the entrevista row has `status='pendente_humano'`, `normalizeWeighted` returns `null` (status `!== 'sucesso'`), so the etapa is marked `'na'` and `'entrevista'` is pushed into `naKeys` (`:373`). Separately `pendenteHuman` is also `true` (`:375`). `buildRecommendation` then appends BOTH strings, producing: *"… Revisão humana pendente em entrevista. Etapas não avaliadas: entrevista (não ponderadas). …"* — the same etapa is simultaneously described as "pendente de revisão" and "não avaliada." For an RH reading the advisory this is confusing and arguably wrong (a pending interview is not the same as a never-conducted one).
**Fix:** Exclude `entrevista` from `naKeys` when it is the pending-human case so the two clauses don't collide:
```ts
const naKeys = weightedRows
  .filter((r) => r.status === "na")
  .map((r) => r.etapa)
  .filter((etapa) => !(etapa === "entrevista" && pendenteHuman));
```
(Compute `pendenteHuman` before `naKeys`.)

### WR-03: `extractEfErrorCode` reads `data.error_code` first even when a transport `error` is present — a 200-with-stale-body can mask the real HTTP error code

**File:** `src/lib/efErrors.ts:42-57`
**Issue:** The helper checks `data.error_code` (branch 1) BEFORE the `error.context` body (branch 2), unconditionally. For `supabase.functions.invoke`, a non-2xx returns `{ data: null, error: FunctionsHttpError }`, so in the common path `data` is null and branch 2 runs — fine. But supabase-js has surfaced cases where a non-2xx still resolves `data` to a parsed body (the EFs here even return `{ ok:false, error_code }` on a 200, see `decisaoService.ts:113`). If both `data.error_code` and `error.context` are populated with *different* codes, the helper silently prefers `data`'s and never reads the transport body. Branch 1 short-circuits and the HTTP-level code is dropped. The callers all treat the result as authoritative for branching overload-vs-generic copy, so a mismatch degrades the UX message silently.
**Fix:** When a transport `error` is present, prefer the `error.context` body and fall back to `data` only when the body yields nothing:
```ts
export async function extractEfErrorCode(data, error) {
  if (error) {
    try {
      const body = await error?.context?.json?.()
      if (body && typeof body === 'object' && 'error_code' in body) {
        const c = String((body as { error_code?: unknown }).error_code ?? '')
        if (c) return c
      }
    } catch { /* degrade */ }
  }
  if (data && typeof data === 'object' && 'error_code' in data) {
    return String((data as { error_code?: unknown }).error_code ?? '') || undefined
  }
  return undefined
}
```
(The existing contract test cases still pass under this ordering.)

### WR-04: `<AsyncState>` slow-timer fires in DB-read consumers (HubSection, SJT/Redação/BigFive screens) that are NOT AI-backed → misleading "Estamos processando com IA…" copy

**File:** `src/components/ui/AsyncState.tsx:135,149-157` + consumers `HubSection.tsx:86-95`, `BigFiveQuestionnaireScreen.tsx:375-383`, `SjtCasoAbertoScreen.tsx:181-191`, `RedacaoEditorScreen.tsx:237-246`
**Issue:** The slow escalation uses a single fixed default `slowAfterMs = 8000` and, after 8s of loading, renders the hardcoded heading "Estamos processando com IA…" / "Isso pode levar até ~30 segundos." (`COPY.slow`). The component's own JSDoc states the read regions in SJT/Redação/BigFive are "generic for DB reads" (e.g. `getBigfiveItens` is a plain RPC, `getAvaliacaoContext` is a plain table read — no IA call). If one of those DB reads is merely slow (cold cache / network), the candidate is told the *IA* is processing, which is factually wrong and could prolong a perceived wait. `slowAfterMs` and the slow copy are overridable, but no consumer overrides them, so every slow DB read shows AI copy.
**Fix:** Either (a) raise `slowAfterMs` to effectively disable the slow note for the DB-read screens, or (b) override `copy.slow` with non-AI wording for the candidate DB-read consumers, e.g.:
```tsx
<AsyncState
  isLoading={isLoading}
  isError={isError}
  errorCode={errorCodeOf(error)}
  onRetry={() => refetch()}
  copy={{ slow: { heading: 'Carregando…', body: 'Isso pode levar alguns segundos.' } }}
/>
```

### WR-05: `BigFiveQuestionnaireScreen` has no empty-items guard — empty `getBigfiveItens` yields a "Página 1 de 0" dead-end screen

**File:** `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx:341,404-415`
**Issue:** If `getBigfiveItens()` resolves to `[]` (RPC returns no rows — a seed/data gap, not an error), `isLoading`/`isError` are both false, `locked` is false, so the intro page renders. Clicking "Começar" sets `page=1`; then `totalQuestionPages = Math.ceil(0/10) = 0`, `pageStart = 0`, `pageItens = []`, `isLastPage = (1 === 0) = false`. The screen renders "Página 1 de 0", no Likert items, and an "Avançar" button (disabled because `pageAnswered` is vacuously true but `!isLastPage` keeps it as Avançar) that advances to page 2, 3, … with no content and no way to submit. Unlike `RedacaoEditorScreen` (which has an explicit `total === 0` empty branch, `RedacaoEditorScreen.tsx:250-264`) and `SjtCasoAbertoScreen` (`!pergunta` branch), this screen has no zero-items guard.
**Fix:** Add an empty-items branch mirroring the Redação screen, before the intro page:
```tsx
if (ordered.length === 0) {
  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
        <p className="text-white/90 text-xl mb-4">Avaliação indisponível no momento</p>
        <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
          Voltar ao painel
        </GlassButton>
      </GlassPanel>
    </ScreenShell>
  )
}
```

### WR-06: Untyped `pesos_avaliacao` jsonb cast to `Record<string, number>` can let a string weight produce a NaN consolidated score

**File:** `supabase/functions/consolidar-decisao-final/index.ts:296,342,349,354`
**Issue:** `pesos` is `(vagaRow.pesos_avaliacao ?? {}) as Record<string, number>` — an unchecked cast over a jsonb column. If any weight value is stored as a JSON string (`"40"` instead of `40`), the arithmetic `acc + (r.weight ?? 0)` (`:349`) and `(r.weight ?? 0) / sumPresentWeight` (`:354`) coerce it, and `Math.round(agg * 100) / 100` can yield `NaN`, which the EF returns as `consolidated`. The dashboard then renders `NaN` (it only guards `!= null`, `ConsolidacaoDashboard.tsx:149`). `publish_vaga` is the upstream guarantor that pesos are numeric, but the EF does not defend the invariant it depends on.
**Fix:** Coerce + validate each weight defensively when reading it:
```ts
const rawW = pesos[key];
const w = typeof rawW === "number" && Number.isFinite(rawW) ? rawW : null;
// ... use `w` for both `weight` and the Σ/effective_weight math
```

## Info

### IN-01: Duplicate `extractEfErrorCode` in `entrevistaService.ts` has an INVERTED argument order vs the shared helper — a refactor hazard

**File:** `src/features/entrevista/services/entrevistaService.ts:548,573` (vs `src/lib/efErrors.ts:38`)
**Issue:** The Phase-18 brief flags the duplicate inline `extractEfErrorCode` (`entrevistaService.ts:573`) as a known/accepted follow-up. Worth recording precisely: the local copy's signature is `extractEfErrorCode(error, data)` and it returns `string | null`, while the shared helper is `extractEfErrorCode(data, error)` returning `string | undefined`. A future cleanup that swaps the import to the shared helper without flipping the call site (`:548` calls `(error, data)`) would silently invert the args and break error-code extraction with no type error (both params are `unknown`). When this is finally deduped, align the call-site order at the same time.
**Fix:** When deduping, replace `extractEfErrorCode(error, data)` with the shared `extractEfErrorCode(data, error)` and delete the local definition.

### IN-02: `DecisaoFinalPage` Comparativo effect/retry guard duplicates the `>=2 && <=10` finalist bound in three places

**File:** `src/features/decisao/components/DecisaoFinalPage.tsx:123,181,204`
**Issue:** The finalist-count bound `finalistIds.length >= 2 && finalistIds.length <= 10` is repeated in the auto-run effect (`:123`), the empty-branch condition uses only `< 2` (`:181`), and the retry handler (`:204`). The empty-branch lower bound (`< 2`) and the run guards (`>= 2`) are consistent, but the upper bound (`<= 10`) is enforced only in the run paths — a selection of 11+ finalists renders the `ComparativoScreen` (because `< 2` is false) with no invoke ever firing, leaving a permanently-loading-then-empty comparativo with no user-visible reason. Low likelihood (decisao_final rarely has 11 finalists) but the asymmetry is a latent dead state.
**Fix:** Extract a single `canCompare = finalistIds.length >= 2 && finalistIds.length <= 10` memo and branch the empty state on `!canCompare` with distinct copy for the >10 case.

### IN-03: `BigFiveQuestionnaireScreen` "Voltar" on page 1 returns to a blank page 0 path is fine, but `page` can underflow conceptually

**File:** `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx:452-458`
**Issue:** The "Voltar" button does `setPage((p) => p - 1)` with no floor. From page 1 this returns to page 0 (the intro), which is the intended behavior, so there is no live bug. But there is no `Math.max(1, …)` / `Math.max(0, …)` clamp, so the invariant "page never goes negative" rests entirely on the button only being reachable when `page >= 1`. A future refactor that renders the nav outside the `page > 0` block would underflow. Defensive-only.
**Fix:** `onClick={() => setPage((p) => Math.max(0, p - 1))}` to make the floor explicit.

### IN-04: `resolveFinalistCandidates` / `resolveCandidates` silently fall back to the anonymized id on a parse miss

**File:** `src/features/decisao/components/DecisaoFinalPage.tsx:71-78`, `src/components/pages/ComparativoCandidatosPage.tsx:65-74`
**Issue:** Both helpers do `Number.parseInt(r.candidate_id.replace(/\D/g, ''), 10) - 1` and, on a miss (`idx` out of range / `NaN`), fall back to `r.candidate_id` for `candidaturaId`/`nome`. That fallback id (e.g. `"C3"`) is then used as the real `candidaturaId` for the inline Avançar/Rejeitar actions, which would issue `updateCandidaturaEtapa("C3", …)` → a DB error surfaced only as a generic toast. The mapping depends on the EF anonymizing strictly in selection order; a contract drift would corrupt the action target rather than disable it.
**Fix:** When `finalistIds[idx]` / `selection[idx]` is undefined, omit the row or disable its actions instead of substituting the anonymized id as a candidatura id.

### IN-05: `gerar-devolutiva-bigfive` template typo "são ceticismo" in a candidate-facing band template

**File:** `supabase/functions/gerar-devolutiva-bigfive/index.ts:118`
**Issue:** The `O.mod_baixo` band template reads "…abordar inovações com **são** ceticismo antes de adotá-las." — "são ceticismo" is a typo for "**sadio**/**saudável** ceticismo" (or "um certo ceticismo"). This text is the deterministic graceful-degrade output shown verbatim to the candidate when the IA personalization misses, so the typo can reach production. The doc notes these are pending final CRP review, but flagging since it is candidate-visible copy.
**Fix:** Correct to "…com um saudável ceticismo antes de adotá-las." in `BAND_TEMPLATES.O.mod_baixo`.

---

_Reviewed: 2026-06-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
