/**
 * `_shared/audit-logger.ts` — Escrita auditavel (PII-mascarada) em ai_call_logs.
 *
 * Fase 9 / Plano 09-05 — IA-02 / LGPD-04 / RF-PL-19/20/21 / RESEARCH Pitfall 6.
 *
 * Toda chamada de IA DEVE ser registrada (IA-02). Este modulo e o unico ponto
 * de escrita em `ai_call_logs` para o runtime de IA e garante a ordem
 * MASK-ANTES-DE-ESCREVER: `maskPII()` roda sobre o template de prompt do usuario
 * ANTES de montar a linha de insert (Pitfall 6 — nenhum dado bruto do candidato
 * pode alcancar um registro persistido).
 *
 * Two-client D-23: roda sob `service_role` (`supabaseAdmin`), que faz bypass de
 * RLS para o INSERT privilegiado. NUNCA usado para auth.
 *
 * Politica de retencao (RF-PL-21): advance -> NOW + 5 anos; reject|hold -> NOW +
 * 180 dias. Em erro de escrita, registra apenas codigo+resumo (nunca o payload
 * bruto — precedente submit-candidatura).
 *
 * Contrato:
 *   logAiCall(supabaseAdmin, row) -> Promise<void>
 *   computeRetainUntil(recommendation) -> string (ISO)
 *   computeInputHash(maskedInput) -> Promise<string> (sha256 hex)
 *
 * @see docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md §2.3/§5/§7.1
 * @see docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md §6.4 RF-PL-19/20/21
 */
import { maskPII } from "./pii-masker.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETAIN_ADVANCE_MS = 5 * 365 * DAY_MS; // 5 anos
const RETAIN_DEFAULT_MS = 180 * DAY_MS; // reject | hold | desconhecido

/** Cliente minimo do supabase-js usado pelo logger (estrutural p/ mock). */
interface SupabaseLike {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  };
}

/**
 * Linha logica de uma chamada de IA. `user_prompt_template` chega CRU e e
 * mascarado aqui antes do INSERT (defesa em profundidade, mesmo que o chamador
 * ja tenha mascarado o input dinamico).
 */
export interface AiCallLogRow {
  candidato_id: string | null;
  vaga_id: string | null;
  call_type: string;
  prompt_version_id: string;
  prompt_version?: string;
  prompt_hash: string;
  provider: string;
  model_id: string;
  model_snapshot?: string;
  system_prompt: string;
  /** Template/input do usuario — sera mascarado antes do INSERT (Pitfall 6). */
  user_prompt_template: string;
  input_token_count: number;
  raw_response: unknown;
  parsed_score?: number | null;
  parsed_reasoning?: string | null;
  output_token_count: number;
  latency_ms: number;
  attempt_number: number;
  cost_usd: number;
  success: boolean;
  error_code?: string | null;
  error_message?: string | null;
  idempotency_key?: string | null;
  triggered_by?: string;
  /** recommendation parseada (advance|reject|hold) — define retain_until. */
  recommendation?: string | null;
}

/**
 * Calcula `retain_until` (ISO) conforme RF-PL-21: advance -> NOW + 5 anos;
 * reject|hold (ou desconhecido) -> NOW + 180 dias.
 */
export function computeRetainUntil(recommendation?: string | null): string {
  const ms = recommendation === "advance" ? RETAIN_ADVANCE_MS : RETAIN_DEFAULT_MS;
  return new Date(Date.now() + ms).toISOString();
}

/**
 * Hash SHA-256 (hex) do input JA MASCARADO, para reprodutibilidade/auditoria
 * sem persistir o conteudo bruto (IA-02). Usa Web Crypto (disponivel no Deno).
 */
export async function computeInputHash(maskedInput: string): Promise<string> {
  const bytes = new TextEncoder().encode(maskedInput);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Registra uma chamada de IA em `ai_call_logs`.
 *
 * ORDEM CRITICA (Pitfall 6): maskPII() roda ANTES de montar o objeto de insert.
 * O input_hash e calculado sobre o texto mascarado. Em falha de escrita, loga
 * somente codigo+resumo (jamais o payload bruto).
 */
export async function logAiCall(supabaseAdmin: SupabaseLike, row: AiCallLogRow): Promise<void> {
  // ── 1. MASCARAR PII ANTES de qualquer escrita (Pitfall 6) ──────────────
  const { masked: maskedUserPrompt } = maskPII(row.user_prompt_template ?? "");
  const input_hash = await computeInputHash(maskedUserPrompt);
  const retain_until = computeRetainUntil(row.recommendation);

  // ── 2. Montar a linha completa de ai_call_logs (IA-02 audit fields) ────
  const insertRow: Record<string, unknown> = {
    candidato_id: row.candidato_id,
    vaga_id: row.vaga_id,
    call_type: row.call_type,
    prompt_version_id: row.prompt_version_id,
    prompt_version: row.prompt_version ?? null,
    prompt_hash: row.prompt_hash,
    provider: row.provider,
    model_id: row.model_id,
    model_snapshot: row.model_snapshot ?? row.model_id,
    system_prompt: row.system_prompt,
    user_prompt_template: maskedUserPrompt, // <- mascarado
    input_hash, // sha256 do texto mascarado (reprodutibilidade IA-02)
    input_token_count: row.input_token_count,
    raw_response: row.raw_response,
    output: row.raw_response, // alias de auditoria do output bruto (IA-02)
    parsed_score: row.parsed_score ?? null,
    parsed_reasoning: row.parsed_reasoning ?? null,
    output_token_count: row.output_token_count,
    latency_ms: row.latency_ms,
    attempt_number: row.attempt_number,
    cost_usd: row.cost_usd,
    success: row.success,
    error_code: row.error_code ?? null,
    error_message: row.error_message ?? null,
    idempotency_key: row.idempotency_key ?? null,
    retain_until,
    triggered_by: row.triggered_by ?? "system",
  };

  // ── 3. INSERT via service_role (bypass RLS) ────────────────────────────
  const { error } = await supabaseAdmin.from("ai_call_logs").insert(insertRow);
  if (error) {
    // Loga apenas codigo+resumo — NUNCA o payload bruto (precedente submit-candidatura).
    const summary = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "insert_failed";
    console.error(`[audit-logger] ai_call_logs INSERT falhou (call_type=${row.call_type}): ${summary}`);
  }
}

/**
 * AI-01 (Phase 23) — alarme de "prompt stub disparado".
 *
 * Quando uma EF de IA nao consegue resolver a versao real de um prompt
 * (`SchemaVersionMismatchError` / `PromptNotConfiguredError`), o caminho antigo
 * degradava SILENCIOSAMENTE para um prompt-stub de 1 linha persistido como
 * avaliacao oficial. O fix (Plans 23-02) estreita o catch para propagar o erro
 * como 500 estruturado; ESTE helper emite, no ponto de degradacao, uma linha de
 * alerta dedicada para que a falha NUNCA rode morta em silencio.
 *
 * Por que NAO escanear ai_call_logs por prompt_version='0.0.0' (Pitfall 1):
 * `ai_call_logs.prompt_version_id` e `uuid NOT NULL REFERENCES prompt_versions(id)`
 * — um "0.0.0" faria o INSERT falhar (22P02), engolido → nenhuma row 0.0.0
 * persiste. O alarme correto e AQUI, no catch, numa tabela que aceita o valor
 * (`recruiter_alerts.threshold_violated` e `text NOT NULL`).
 *
 * INVARIANTE: NUNCA lanca. Roda no caminho de ERRO da EF — nao pode mascarar o
 * 500 original nem quebrar o re-throw. Em falha de escrita, loga so codigo+resumo
 * (padrao logAiCall). `call_type` da row de alerta e null (a coluna e o enum
 * `llm_call_type` e `bigfive_devolutiva` ainda nao e valor valido → 22P02).
 */
export async function emitPromptStubAlert(supabaseAdmin: SupabaseLike, call_type: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("recruiter_alerts").insert({
      threshold_violated: "ai_prompt_stub_fired",
      channel: "ai_stack",
      message:
        `Prompt stub disparado para call_type='${call_type}' — versão de prompt não resolvida (falha alta).`,
      value: 0,
      threshold: 0,
      call_type: null, // coluna e o enum llm_call_type — evitar 22P02 (bigfive_devolutiva)
      vaga_id: null,
      candidato_id: null,
      created_at: new Date().toISOString(),
    });
    if (error) {
      const summary = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "insert_failed";
      console.error(`[audit-logger] emitPromptStubAlert INSERT falhou (call_type=${call_type}): ${summary}`);
    }
  } catch (e) {
    // Belt-and-suspenders: um throw do client (rede/mock) NAO pode escapar deste
    // helper — ele roda no caminho de erro da EF e o 500 original deve prevalecer.
    const summary = e instanceof Error ? e.name : "throw";
    console.error(`[audit-logger] emitPromptStubAlert lançou (call_type=${call_type}): ${summary}`);
  }
}
