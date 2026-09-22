/**
 * `_shared/ai-error-codes.ts` — vocabulário de `ai_call_logs.error_code` (JORN-28).
 *
 * Phase 49 / Plano 49-02 — D-27c.
 *
 * POR QUE ESTE ARQUIVO EXISTE. Medido em PROD (`ai_call_logs`, 2026-09-22): **17
 * fallbacks, todos com `error_code='anthropic_retries_exhausted'`** — enquanto as causas
 * reais, lidas uma a uma pelo `error_message`, eram **timeout ×8** (`cv_job_match` 6,
 * `interview_guide` 2), **truncamento ×4** e **Zod `too_big` ×5**. Um código que descreve
 * igualmente «a resposta não coube no teto», «o provedor não respondeu no tempo» e «a
 * resposta veio completa e fora do schema» não informa nenhum conserto: os três pedem
 * ações OPOSTAS (subir `max_tokens` / subir o timeout ou encurtar a saída / arrumar o
 * schema). Pior: subir o `max_tokens` de um `call_type` que na verdade estava batendo no
 * TEMPO piora o problema, porque saída maior leva mais tempo.
 *
 * QUEM CONSOME: `_shared/ai-client.ts` (escreve) e a tela do admin do plano 49-15 (lê e
 * traduz). A tela importa este arquivo por CAMINHO RELATIVO — precedentes em produção:
 * `src/features/privacidade/services/exportacaoService.ts:61` (`exportAllowlist`) e
 * `src/features/cadastro/components/steps/AutorizacoesStep.tsx:50` (`consent-text.json`).
 *
 * ZERO IMPORTS POR DESIGN (contrato de `_shared/email-config.ts:12-17`): nenhum `npm:`,
 * nenhum `https://deno.land/std`, nenhum `.ts`. Motivos: (a) o `src/` (Vite/tsc) não
 * resolveria um especificador `npm:` nem uma URL remota, então UM import aqui quebraria a
 * importação relativa do front e obrigaria a duplicar a tabela — e duas tabelas de causa
 * divergem em silêncio, que é o defeito que este arquivo remove; (b) as EFs consumidoras
 * não precisam de entrada nova no `import_map`. Não adicionar imports sem revisitar isso.
 */

/**
 * Vocabulário fechado de `ai_call_logs.error_code`.
 *
 * As chaves espelham os valores (o objeto é um mapa nome→literal) para que
 * `AI_ERROR_CODE.anthropic_timeout` seja legível no ponto de uso e o `as const` dê o
 * literal exato ao tipo. Strings em inglês, como as que já estão em PROD.
 */
export const AI_ERROR_CODE = {
  // ── Causas de falha do primário (Anthropic). Viram `fallback_<causa>` na linha
  //    do RESULTADO quando o fallback OpenAI responde.
  /** A resposta bateu no teto de saída e veio cortada (`stop_reason='max_tokens'`). */
  anthropic_max_tokens: "anthropic_max_tokens",
  /** O provedor não respondeu dentro do teto por chamada (`APIConnectionTimeoutError`). */
  anthropic_timeout: "anthropic_timeout",
  /** Resposta COMPLETA que não casou o schema (os 5 Zod `too_big` de 05–06/09). */
  anthropic_schema_invalid: "anthropic_schema_invalid",
  /** O modelo se recusou a responder (`stop_reason='refusal'`). */
  anthropic_refusal: "anthropic_refusal",
  /** 429 / 503 / 529 esgotados — capacidade do provedor, não do nosso pedido. */
  anthropic_overloaded: "anthropic_overloaded",
  /** Qualquer outro erro da API (4xx/5xx fora dos retentáveis). */
  anthropic_api_error: "anthropic_api_error",
  /** Disjuntor aberto: NENHUMA tentativa foi feita. */
  anthropic_circuit_open: "anthropic_circuit_open",
  /**
   * ⚠ LEGADO — não é emitido mais. Descreve as 17 linhas que já estão em PROD e
   * NÃO são reescritas (D-30: a causa real delas não é recuperável do log, e inventá-la
   * seria pior que registrar que não se sabe). Existe aqui só para a tela poder LER
   * o histórico sem mostrar código cru.
   */
  anthropic_retries_exhausted: "anthropic_retries_exhausted",

  // ── Falhas do próprio fallback (OpenAI). Não levam prefixo: não há um terceiro
  //    provedor para onde cair, então a chamada termina em exceção.
  /** `LengthFinishReasonError` — `finish_reason === 'length'` (openai 6.42.0). */
  openai_max_tokens: "openai_max_tokens",
  /** A resposta do fallback não casou o schema. */
  openai_schema_invalid: "openai_schema_invalid",
  /** Qualquer outro erro do fallback. */
  openai_error: "openai_error",

  // ── Bloqueios ANTES de tocar provedor nenhum (`provider='none'`, JORN-39).
  /** Teto HARD de custo diário por vaga (AI-06). */
  cost_cap_exceeded: "cost_cap_exceeded",
  /** Injeção de prompt detectada no input do candidato (RF-PL-18). */
  prompt_injection_detected: "prompt_injection_detected",
} as const;

export type AiErrorCode = typeof AI_ERROR_CODE[keyof typeof AI_ERROR_CODE];

/**
 * Prefixo da linha de RESULTADO de um fallback.
 *
 * Existe porque `success=true` numa linha `provider='openai'` é verdadeiro (o resultado é
 * utilizável) e ao mesmo tempo insuficiente: sem o prefixo, a tela do admin pinta a linha
 * de verde «Sucesso» e ninguém vê que o resultado NÃO veio do modelo configurado. Com o
 * prefixo, `error_code LIKE 'fallback_%'` é a consulta que separa os dois — e é o mesmo
 * predicado que impede o replay de idempotência de servir um fallback calado.
 */
export const PREFIXO_FALLBACK = "fallback_" as const;

/**
 * Rótulo pt-BR de cada causa, para a tela do admin (49-15) e o selo de proveniência.
 *
 * São as palavras que o operador usou ao descrever o problema no kickoff — «não coube»,
 * «demorou», «fora do schema» —, não uma tradução literal dos códigos.
 */
export const CAUSA_FALLBACK_ROTULO = {
  anthropic_max_tokens: "não coube",
  anthropic_timeout: "demorou",
  anthropic_schema_invalid: "fora do schema",
  anthropic_refusal: "recusa do modelo",
  anthropic_overloaded: "provedor sobrecarregado",
  anthropic_api_error: "erro do provedor",
  anthropic_circuit_open: "disjuntor aberto",
  anthropic_retries_exhausted: "causa não registrada (antes da Phase 49)",
} as const;

/**
 * `true` quando o `error_code` é o de uma linha de RESULTADO DE FALLBACK.
 *
 * Usado em dois lugares com consequências diferentes: na tela, decide o rótulo «Fallback»
 * (âmbar) em vez de «Sucesso» (verde); no `ai-client`, decide que a linha NÃO pode ser
 * replayada por idempotência — devolvê-la no clique seguinte entregaria de novo, em
 * silêncio, um resultado do `gpt-4o-mini` a quem pediu o Sonnet.
 */
export function ehFallback(errorCode: string | null | undefined): boolean {
  return typeof errorCode === "string" && errorCode.startsWith(PREFIXO_FALLBACK);
}

/** Causa crua de um `error_code` de fallback (sem o prefixo), ou `null` se não for. */
export function causaDoFallback(errorCode: string | null | undefined): string | null {
  return ehFallback(errorCode) ? (errorCode as string).slice(PREFIXO_FALLBACK.length) : null;
}

/** Rótulo pt-BR de uma causa, com degradação para o próprio código se for desconhecida. */
export function rotuloDaCausa(causa: string | null | undefined): string {
  if (!causa) return "—";
  return (CAUSA_FALLBACK_ROTULO as Record<string, string>)[causa] ?? causa;
}
