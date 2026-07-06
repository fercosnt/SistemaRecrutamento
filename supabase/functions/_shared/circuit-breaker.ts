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
 * Contrato: RESET_MS=60000, com canRequest() / recordFailure() / recordSuccess().
 *
 * ── Phase 23 / Plan 23-01 (AI-02) — THRESHOLD env-configurável + singleton ──
 * O default de THRESHOLD deixa de ser o literal 5 e passa a ser env-configurável
 * (`CIRCUIT_BREAKER_THRESHOLD`, default 3) com a INVARIANTE `THRESHOLD ≤ MAX_ATTEMPTS`:
 * como o loop de retry de UMA chamada falha no máximo `MAX_ATTEMPTS` vezes, um THRESHOLD
 * maior que MAX_ATTEMPTS jamais abriria o disjuntor. `Math.min(RAW, MAX_ATTEMPTS)` garante
 * que a escada de retry de uma única chamada já pode atingir o THRESHOLD → OPEN determinístico.
 * Além disso este módulo exporta `sharedBreaker` — um singleton module-level (por-isolate)
 * usado como default por `ai-client.callAi`, para que as falhas ACUMULEM entre chamadas do
 * mesmo isolate (antes cada callAi criava um breaker novo que nunca abria).
 *
 * Módulo PURO (sem DB/rede/SDK): o leitor de env abaixo é uma cópia local da guarda de NaN
 * do `parseIntEnv` (ai-client.ts) — importá-lo criaria um ciclo ai-client ↔ circuit-breaker.
 *
 * @see docs/conhecimento/prompts/templates/08-edge-function-reference.ts (CircuitBreaker)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (Pattern 2 / IA-04)
 * @see .planning/phases/23-ressurrei-o-da-stack-de-ia/23-RESEARCH.md (§AI-02)
 */

/**
 * Leitor de env-int com guarda de NaN/≤0 (espelha `parseIntEnv` de ai-client.ts,
 * replicado localmente para manter este módulo PURO e sem ciclo de import).
 */
function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Aplica a invariante `THRESHOLD ≤ MAX_ATTEMPTS` (AI-02). Função pura para ser
 * testável de forma determinística sem depender de env de módulo-load.
 */
export function effectiveThreshold(rawThreshold: number, maxAttempts: number): number {
  return Math.min(rawThreshold, maxAttempts);
}

/** THRESHOLD efetivo default, computado uma vez no load do módulo a partir dos envs. */
const THRESHOLD_EFFECTIVE = effectiveThreshold(
  envInt("CIRCUIT_BREAKER_THRESHOLD", 3),
  envInt("MAX_ATTEMPTS", 3),
);

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private readonly THRESHOLD: number;
  private readonly RESET_MS = 60_000;

  /**
   * @param threshold nº de falhas em RESET_MS que ABRE o disjuntor. Default =
   * THRESHOLD_EFFECTIVE (env-config com invariante ≤ MAX_ATTEMPTS). Os testes
   * injetam um valor explícito para determinismo.
   */
  constructor(threshold: number = THRESHOLD_EFFECTIVE) {
    this.THRESHOLD = threshold;
  }

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

/**
 * Singleton de disjuntor por-isolate (AI-02). É o default de `ai-client.callAi`
 * (`deps.breaker ?? sharedBreaker`) — assim as falhas ACUMULAM entre chamadas do
 * mesmo isolate e o disjuntor realmente abre. Limitação aceita (PRD §3.1): o
 * estado é in-memory por-isolate, não distribuído.
 *
 * Pitfall de teste (23-RESEARCH Pitfall 3): este singleton mantém estado entre
 * testes do mesmo arquivo (module cache). Testes que exercitam falhas devem
 * INJETAR um breaker próprio (`new CircuitBreaker(...)`), nunca usar este.
 */
export const sharedBreaker = new CircuitBreaker();
