/**
 * Shared Edge-Function error_code extractor (RESIL-03 plumbing — the GAP).
 *
 * `supabase.functions.invoke` returns `{ data, error }`. The EF's domain
 * `error_code` (notably `AI_UNAVAILABLE` from a 503 `{ error_code, retryable }`,
 * or `MIXED_VAGA` from a 400) may arrive on EITHER shape:
 *   - the 200/parsed body                → `data.error_code`
 *   - a non-2xx `FunctionsHttpError`     → `await error.context.json()` `error_code`
 *
 * This helper reads BOTH and degrades safely (a non-JSON body / a thrown
 * `.json()` yields `undefined` — it NEVER throws). It returns ONLY the string
 * code (or `undefined`) and DISCARDS the rest of the body: no message, no stack,
 * no PII ever crosses back to the component (ASVS V7, T-18-05-ID). The caller
 * carries the returned code on its `*ServiceError.details` so a downstream
 * `<AsyncState errorCode>` can branch overload-vs-generic copy.
 *
 * Generalizes the single existing partial impl
 * (`triagemService.invokeComparativo`'s inline MIXED_VAGA read) into ONE source
 * so the AI services cannot drift apart ([[feedback_integration_contract_gap]]).
 *
 * @module lib/efErrors
 * @see src/features/triagem/services/triagemService.ts (the MIXED_VAGA seed this generalizes)
 */

/** The non-2xx `FunctionsHttpError` shape supabase-js surfaces (raw Response on `.context`). */
interface EfInvokeError {
  context?: { json?: () => Promise<unknown> }
}

/**
 * Reads the EF `error_code` from an invoke `{ data, error }` result, code-only,
 * never throwing.
 *
 * @param data  The resolved `data` from `functions.invoke` (200/parsed body).
 * @param error The `error` from `functions.invoke` (non-2xx `FunctionsHttpError`).
 * @returns The string `error_code` (e.g. `'AI_UNAVAILABLE'`) or `undefined`.
 */
export async function extractEfErrorCode(
  data: unknown,
  error: EfInvokeError | null | undefined,
): Promise<string | undefined> {
  // WR-03: quando um `error` de transporte está presente, o corpo da Response
  // (`error.context`) é a fonte AUTORITATIVA do error_code de nível HTTP. Lê-lo
  // PRIMEIRO; o `data` (corpo 200/parseado) só é consultado se o body não render
  // nenhum código. A ordem antiga (data primeiro, incondicional) deixava um
  // 200-com-corpo-stale OU um `{ok:false, error_code}` em `data` mascarar o código
  // HTTP real do transporte — o curto-circuito descartava silenciosamente o body.
  // 1) non-2xx FunctionsHttpError: o Response cru está em `error.context`.
  if (error) {
    try {
      const body = await error?.context?.json?.()
      if (body && typeof body === 'object' && 'error_code' in body) {
        const c = String((body as { error_code?: unknown }).error_code ?? '')
        if (c) return c
      }
    } catch {
      /* body not JSON / .json() threw — degrade to `data` then generic (NEVER throw) */
    }
  }

  // 2) 200/parsed-body shape (ou fallback quando o body do erro não tem código):
  //    error_code direto em `data`.
  if (data && typeof data === 'object' && 'error_code' in data) {
    return String((data as { error_code?: unknown }).error_code ?? '') || undefined
  }

  return undefined
}
