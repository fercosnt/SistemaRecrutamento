/**
 * `_shared/circuit-breaker.ts` — Disjuntor in-memory para o provedor de IA.
 *
 * Fase 9 / Plano 09-04 — IA-04 / RF-PL-15 / threat T-09-13.
 *
 * Utilitario PURO (sem DB, sem SDK, sem rede). Estado in-memory POR ISOLATE
 * (limitacao documentada no PRD §3.1): cada isolate do Edge Function mantem seu
 * proprio contador. O Plano 05 (ai-client) consulta canRequest() antes de cada
 * chamada e usa o disjuntor para portar o fallback OpenAI quando a Anthropic
 * estiver indisponivel.
 *
 * Estados:
 *   CLOSED    — operacao normal; canRequest() === true.
 *   OPEN      — abriu apos THRESHOLD falhas em RESET_MS; canRequest() === false.
 *   HALF-OPEN — apos RESET_MS, canRequest() libera 1 probe (zera contadores).
 *
 * Contrato (RED test 09-01 circuit-breaker.test.ts): THRESHOLD=5, RESET_MS=60000,
 * com canRequest() / recordFailure() / recordSuccess().
 *
 * @see docs/conhecimento/prompts/templates/08-edge-function-reference.ts (CircuitBreaker)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (Pattern 2 / IA-04)
 */

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private readonly THRESHOLD = 5;
  private readonly RESET_MS = 60_000;

  /**
   * true se uma requisicao pode prosseguir. Quando o disjuntor esta OPEN ha mais
   * de RESET_MS, faz a transicao para HALF-OPEN: zera o estado e libera 1 probe.
   */
  canRequest(): boolean {
    if (this.openedAt !== null) {
      if (Date.now() - this.openedAt > this.RESET_MS) {
        // HALF-OPEN: janela de reset expirou — permite uma tentativa de prova.
        this.failures = 0;
        this.openedAt = null;
        return true;
      }
      return false;
    }
    return true;
  }

  /** Registra sucesso: zera o contador de falhas e fecha o disjuntor. */
  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  /** Registra falha: abre o disjuntor ao atingir THRESHOLD falhas. */
  recordFailure(): void {
    this.failures++;
    if (this.failures >= this.THRESHOLD) {
      this.openedAt = Date.now();
    }
  }
}
