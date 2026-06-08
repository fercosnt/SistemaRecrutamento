/**
 * `_shared/injection-detector.ts` — Deteccao de prompt injection (RF-PL-18).
 *
 * Fase 9 / Plano 09-04 — RF-PL-18 / threat T-09-12.
 *
 * Utilitario PURO (sem DB, sem SDK, sem rede). E o portao que permite ao
 * Edge Function consumidor (Plano 05) curto-circuitar para revisao humana
 * ANTES de qualquer chamada ao provedor de IA: se um padrao adversarial for
 * detectado, nenhuma chamada de API e feita.
 *
 * Os 8 padroes abaixo sao DOCUMENTACAO defensiva de tecnicas conhecidas de
 * injecao (extraidos de 08-edge-function-reference.ts) — conteudo legitimo de
 * seguranca, nao um ataque. Texto benigno de CV/respostas NAO deve ser flagado.
 *
 * Contrato (RED test 09-01 injection-detector.test.ts):
 *   detectPromptInjection(text) -> { detected: boolean; pattern?: string }
 *
 * @see docs/conhecimento/prompts/templates/08-edge-function-reference.ts (INJECTION_PATTERNS)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (Security Domain RF-PL-18)
 */

/** Os 8 padroes adversariais conhecidos (um por linha do contrato RF-PL-18). */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?instructions?/i,
  /you\s+are\s+now\s+(a\s+)?different/i,
  /act\s+as\s+(if\s+you\s+are\s+)?a\s+different/i,
  /\[SYSTEM\]|\[INST\]|\[\/INST\]/i,
  /jailbreak|DAN\s+mode/i,
  /<\|system\|>|<\|assistant\|>/i,
  /forget\s+(what|everything)\s+you\s+know/i,
];

/**
 * Verifica se o texto contem algum dos padroes de prompt injection conhecidos.
 * Retorna o `source` do primeiro padrao casado para fins de auditoria — sem
 * revelar ao candidato que a deteccao ocorreu (o consumidor decide a resposta).
 *
 * Funcao pura: nao registra logs, nao acessa rede e nao lanca excecoes.
 */
export function detectPromptInjection(text: string): { detected: boolean; pattern?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}
