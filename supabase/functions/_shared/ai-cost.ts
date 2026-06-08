/**
 * `_shared/ai-cost.ts` — Calculo de custo por chamada de IA (IA-03).
 *
 * Fase 9 / Plano 09-04 — IA-03.
 *
 * Utilitario PURO (sem DB, sem SDK, sem rede). O Plano 05 (ai-client) usa
 * calculateCost() para preencher ai_call_logs.cost_usd em cada chamada.
 *
 * Os precos sao os valores VERIFICADOS no 09-RESEARCH §Code Examples (pricing
 * Anthropic/OpenAI 2026): Sonnet $3/$15 por 1M, Haiku $1/$5 por 1M, cache_read
 * = 10% do input. Sao usados estes valores, NAO os do template de referencia.
 *
 * Contrato (RED test 09-01 ai-cost.test.ts):
 *   COST_PER_TOKEN[modelo] -> { input, cached_read, output }  (USD por token)
 *   calculateCost(model, inputTokens, cachedTokens, outputTokens) -> number
 *
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (§Code Examples)
 */

/** Tabela de custo por token (USD), valores verificados do RESEARCH. */
export const COST_PER_TOKEN: Record<
  string,
  { input: number; cached_read: number; output: number }
> = {
  "claude-sonnet-4-6": { input: 3e-6, cached_read: 0.3e-6, output: 15e-6 },
  "claude-haiku-4-5": { input: 1e-6, cached_read: 0.1e-6, output: 5e-6 },
  "gpt-4o-mini": { input: 0.15e-6, cached_read: 0.075e-6, output: 0.6e-6 },
};

/**
 * Calcula o custo em USD de uma chamada de IA.
 *
 * Tokens em cache (cachedTokens) sao cobrados na tarifa cached_read; os demais
 * tokens de entrada (inputTokens - cachedTokens) na tarifa input; e os tokens de
 * saida na tarifa output. Modelo desconhecido retorna 0 (default defensivo, sem
 * lancar excecao).
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  cachedTokens: number,
  outputTokens: number,
): number {
  const p = COST_PER_TOKEN[model] ?? { input: 0, cached_read: 0, output: 0 };
  // WR-01: guarda contra anomalia do provedor (cache_read_input_tokens >
  // input_tokens) que produziria freshInput negativo e deflacionaria o custo.
  const freshInput = Math.max(0, inputTokens - cachedTokens);
  return freshInput * p.input + cachedTokens * p.cached_read + outputTokens * p.output;
}
