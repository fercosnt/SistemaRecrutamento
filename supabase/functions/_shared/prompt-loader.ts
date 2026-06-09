/**
 * `_shared/prompt-loader.ts` — Resolucao de versao de prompt em RUNTIME (IA-01).
 *
 * Fase 9 / Plano 09-05 — IA-01 / RF-PL-12 / RF-PL-13.
 *
 * O runtime consome prompts EXCLUSIVAMENTE do banco (tabela `prompt_versions`),
 * NUNCA do sistema de arquivos (RF-PL-12). O sync git->DB (Plano 09-06) e o
 * unico escritor; aqui apenas LEMOS a versao ativa (ou a canary, por
 * probabilidade `canary_pct/100`) para um dado `call_type`.
 *
 * O roteamento canary e CENTRALIZADO aqui (RESEARCH Open Q4) — os consumidores
 * (ai-client e os Edge Functions de Fase 10+) nunca implementam o sorteio;
 * chamam `loadPrompt(call_type, supabaseAdmin)` e recebem a versao ja escolhida.
 *
 * Two-client D-23: este modulo roda server-side sob `service_role`
 * (`supabaseAdmin`), passado pelo chamador — sem JWT de usuario (o EF consumidor
 * ja verificou o usuario). `service_role` faz bypass de RLS para ler
 * `prompt_versions`.
 *
 * Contrato:
 *   loadPrompt(call_type, supabaseAdmin) -> LoadedPrompt
 *   assertSchemaVersionCompat(call_type, schema_version_required) -> void | throws
 *
 * @see docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md §3.5
 * @see docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md §6.3 RF-PL-12/13
 */

/** Colunas lidas de `prompt_versions` — allowlist EXPLICITA (nunca select('*')). */
const PROMPT_COLUMNS =
  "id, semver, system_template, user_template, model_id, temperature, max_tokens, schema_version_required, content_hash";

/** Versoes de schema conhecidas pelo CODIGO (fail-fast RF-PL-13). */
export const SCHEMA_VERSIONS: Record<string, string> = {
  cv_summary: "1.0.0",
  cv_job_match: "1.0.0",
  comparative_ranking: "1.0.0",
  sjt_evaluation: "1.0.0",
  interview_questions: "1.0.0",
  interview_summary: "1.0.0",
  reference_check: "1.0.0",
  final_recommendation: "1.0.0",
};

/** Forma da versao de prompt resolvida e retornada ao chamador. */
export interface LoadedPrompt {
  id: string;
  semver: string;
  system_template: string;
  user_template: string;
  model_id: string;
  temperature: number;
  max_tokens: number;
  schema_version_required: string;
  content_hash: string;
}

/** Erro estruturado de incompatibilidade de schema_version (RF-PL-13). */
export class SchemaVersionMismatchError extends Error {
  readonly call_type: string;
  readonly required: string;
  readonly code: string;
  readonly known: string;
  constructor(call_type: string, required: string, known: string) {
    super(
      `schema_version mismatch para call_type='${call_type}': prompt requer '${required}', codigo conhece '${known}'`,
    );
    this.name = "SchemaVersionMismatchError";
    this.call_type = call_type;
    this.required = required;
    this.known = known;
    this.code = "schema_version_mismatch";
  }
}

/** Erro estruturado quando nenhuma versao ativa existe para o call_type. */
export class PromptNotConfiguredError extends Error {
  readonly call_type: string;
  readonly code: string;
  constructor(call_type: string) {
    super(`Nenhuma versao ativa de prompt para call_type='${call_type}'`);
    this.name = "PromptNotConfiguredError";
    this.call_type = call_type;
    this.code = "prompt_not_configured";
  }
}

/**
 * Cliente minimo necessario do supabase-js (apenas o que usamos). Mantido
 * estrutural para permitir injecao de um spy nos testes mockados.
 */
interface PromptQuery {
  // `.eq()` e chainable (encadeavel) sem limite — supabase-js em producao
  // suporta cadeias arbitrarias; o tipo recursivo deixa o mock casar com a
  // cadeia active (3 `.eq()`) e a cadeia canary (2 `.eq()`).
  eq(column: string, value: unknown): PromptQuery;
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: unknown }>;
}

interface SupabaseLike {
  from(table: string): {
    select(columns: string): PromptQuery;
  };
}

/** Mapeia uma linha crua de `prompt_versions` para `LoadedPrompt`. */
function toLoadedPrompt(row: Record<string, unknown>): LoadedPrompt {
  return {
    id: String(row.id),
    semver: String(row.semver),
    system_template: String(row.system_template),
    user_template: String(row.user_template),
    model_id: String(row.model_id),
    temperature: Number(row.temperature),
    max_tokens: Number(row.max_tokens),
    schema_version_required: String(row.schema_version_required),
    content_hash: String(row.content_hash ?? ""),
  };
}

/**
 * Verifica fail-fast (RF-PL-13) que o schema exigido pela versao de prompt bate
 * com o schema que o CODIGO conhece para aquele call_type. Lanca
 * `SchemaVersionMismatchError` em caso de divergencia.
 */
export function assertSchemaVersionCompat(call_type: string, schema_version_required: string): void {
  const known = SCHEMA_VERSIONS[call_type];
  if (known !== schema_version_required) {
    throw new SchemaVersionMismatchError(call_type, schema_version_required, known ?? "<desconhecido>");
  }
}

/**
 * Resolve a versao de prompt para um `call_type` lendo APENAS o banco (RF-PL-12).
 *
 * 1. Busca a linha ATIVA (is_active=true AND is_canary=false) com allowlist de
 *    colunas (nunca select('*')).
 * 2. Busca a linha CANARY (is_canary=true), se existir, junto com seu canary_pct.
 * 3. Com probabilidade canary_pct/100 (Math.random()), retorna a canary; caso
 *    contrario, retorna a ativa. Roteamento CENTRALIZADO aqui (Open Q4).
 *
 * Apos resolver, valida o schema_version (fail-fast RF-PL-13) e devolve o
 * `LoadedPrompt`.
 */
export async function loadPrompt(call_type: string, supabaseAdmin: SupabaseLike): Promise<LoadedPrompt> {
  // ── 1. Versao ativa (allowlist explicita) ──────────────────────────────
  const activeRes = await supabaseAdmin
    .from("prompt_versions")
    .select(PROMPT_COLUMNS)
    .eq("call_type", call_type)
    .eq("is_active", true)
    .eq("is_canary", false)
    .maybeSingle();

  if (activeRes.error || !activeRes.data) {
    throw new PromptNotConfiguredError(call_type);
  }
  const active = activeRes.data;

  // ── 2. Versao canary (se houver) — inclui canary_pct para o sorteio ────
  const canaryRes = await supabaseAdmin
    .from("prompt_versions")
    .select(`${PROMPT_COLUMNS}, canary_pct`)
    .eq("call_type", call_type)
    .eq("is_canary", true)
    .maybeSingle();

  const canary = canaryRes.error ? null : canaryRes.data;

  // ── 3. Roteamento canary centralizado (canary_pct/100) ─────────────────
  if (canary) {
    const pct = Number(canary.canary_pct ?? 0);
    if (pct > 0 && Math.random() < pct / 100) {
      const chosen = toLoadedPrompt(canary);
      assertSchemaVersionCompat(call_type, chosen.schema_version_required);
      return chosen;
    }
  }

  const chosen = toLoadedPrompt(active);
  assertSchemaVersionCompat(call_type, chosen.schema_version_required);
  return chosen;
}
