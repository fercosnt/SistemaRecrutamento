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
 *   logAiCall(supabaseAdmin, row) -> Promise<{ id: string | null; error: string | null }>
 *   computeRetainUntil(recommendation) -> string (ISO)
 *   computeInputHash(maskedInput) -> Promise<string> (sha256 hex)
 *
 * ⚠ Phase 49 / JORN-39 — `logAiCall` DEIXOU de devolver `void`. Devolve
 *   `{ id, error }` por duas razões medidas:
 *     (a) o `id` da linha é a proveniência que o D-38 grava em
 *         `entrevista_analises.ai_call_log_id` (o `ai_call_logs` é purgado em 180 d,
 *         então a EF precisa guardar a referência no momento da escrita);
 *     (b) o `error` era engolido em `console.error` e SÓ. Medido em PROD antes da
 *         Phase 49: `select count(*) from ai_call_logs where provider='none'` = **0**.
 *         Os dois caminhos que cortam uma chamada antes de tocar provedor (teto de
 *         custo AI-06 e injeção) gravavam `provider:"none"`, o enum `llm_provider`
 *         não tinha o valor, o INSERT falhava em 22P02 — e ninguém ficou sabendo.
 *   A INVARIANTE não mudou: `logAiCall` **nunca lança**. Quem chama decide o que
 *   fazer com o `error` (ver `emitAuditLossAlert`).
 *
 * @see docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md §2.3/§5/§7.1
 * @see docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md §6.4 RF-PL-19/20/21
 */
import { maskPII } from "./pii-masker.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETAIN_ADVANCE_MS = 5 * 365 * DAY_MS; // 5 anos
const RETAIN_DEFAULT_MS = 180 * DAY_MS; // reject | hold | desconhecido

/** Cliente minimo do supabase-js usado por `emitPromptStubAlert` (estrutural p/ mock). */
interface SupabaseLike {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  };
}

/**
 * Cliente do supabase-js usado por `logAiCall` — precisa de UPSERT alem de INSERT.
 *
 * CR-01 (Phase 23): `ai_call_logs.idempotency_key` e `text UNIQUE`. O fix AI-05
 * (uma FALHA cacheada NAO e replayada -> cai p/ uma chamada NOVA) faz o retry
 * REUSAR a MESMA idempotency_key. Um plain `.insert()` colidiria (23505) com a
 * linha stale `success=false`, o erro seria engolido e o resultado do retry NUNCA
 * persistiria: audit quebrado (IA-02), o custo real do retry fica invisivel ao teto
 * AI-06 (que soma `cost_usd WHERE success=true`), e nunca converge (a mesma chamada
 * paga se repete p/ sempre). Por isso `logAiCall` faz UPSERT `onConflict:
 * idempotency_key` quando ha key: 1 linha por key, ULTIMO resultado vence. Keys
 * NULL NAO deduplicam (Postgres trata NULLs como distintos na UNIQUE) -> cada
 * chamada sem key e uma linha propria, via plain insert.
 */
interface SupabaseUpsertLike {
  from(table: string): {
    insert(row: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
    upsert(
      row: Record<string, unknown>,
      opts?: { onConflict?: string },
    ): Promise<{ data: unknown; error: unknown }>;
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
 * Phase 49 / D-38 — o hash do texto que gerou um resultado de IA, calculável FORA do
 * `logAiCall`.
 *
 * É o MESMO valor que `logAiCall` grava em `ai_call_logs.input_hash` para a mesma entrada
 * passada a `callAi`. Existe porque a EF precisa gravar o hash na tabela de RESULTADO
 * (`entrevista_analises.texto_hash`) no mesmo instante, e a única forma de fazer isso sem
 * duplicar a regra era recalculá-la — duas implementações do mesmo hash divergem em
 * silêncio, e a divergência só aparece no dia em que alguém tenta a consulta de
 * conferência:
 *
 *   select count(*) from entrevista_analises a
 *     join ai_call_logs l on l.input_hash = a.texto_hash;
 *
 * Um resultado zero aí é indistinguível de «a análise não veio de chamada nenhuma».
 *
 * ⚠ A composição é `maskPII` DUAS vezes na prática: o `callAi` mascara o input antes de
 *   passá-lo adiante e o `logAiCall` mascara de novo (defesa em profundidade, Pitfall 6).
 *   `maskPII` é IDEMPOTENTE para todas as regras PT-BR do `pii-masker` (cada placeholder
 *   `[CPF]`/`[EMAIL]`/… não casa nenhuma regex), então uma aplicação basta — e é por isso
 *   que este hash também bate com as linhas `provider='none'`, onde o texto passa pela
 *   máscara uma única vez. Há teste fixando essa idempotência: se ela cair, os dois
 *   caminhos passam a gravar hashes diferentes para o mesmo input.
 *
 * O hash é sobre o texto MASCARADO, nunca sobre o bruto: pode ser publicado, comparado e
 * guardado em tabela de resultado sem reintroduzir PII (LGPD-04).
 */
export async function inputHashDe(rawInput: string): Promise<string> {
  const { masked } = maskPII(rawInput ?? "");
  return await computeInputHash(masked);
}

/** Resultado de `logAiCall` — Phase 49 / JORN-39 + D-38. NUNCA lança; reporta. */
export interface LogAiCallResult {
  /**
   * `id` da linha gravada, quando o cliente devolveu um builder com `.select`
   * (o SupabaseClient real). `null` quando o cliente não oferece `.select`
   * (os mocks das 7 EFs devolvem `{ error }` direto) ou quando a escrita falhou.
   */
  id: string | null;
  /** Código/resumo do erro de escrita (nunca o payload). `null` = gravou. */
  error: string | null;
}

/**
 * Registra uma chamada de IA em `ai_call_logs`.
 *
 * ORDEM CRITICA (Pitfall 6): maskPII() roda ANTES de montar o objeto de insert.
 * O input_hash e calculado sobre o texto mascarado. Em falha de escrita, loga
 * somente codigo+resumo (jamais o payload bruto).
 */
export async function logAiCall(
  supabaseAdmin: SupabaseUpsertLike,
  row: AiCallLogRow,
): Promise<LogAiCallResult> {
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
    // ⚠ Até 2026-09-05 havia aqui `output: row.raw_response` — coluna que NUNCA
    //   existiu em ai_call_logs. O PostgREST devolvia PGRST204, o INSERT inteiro
    //   falhava, o erro era só logado, e `ai_call_logs` ficou com 1 linha desde
    //   22/08: custo de IA invisível, cost-alerter cego, /admin/ai-costs vazio.
    //   `input_hash` ganhou coluna própria na …0905000003 (IA-02 exige o hash).
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

  // ── 3. Escrita via service_role (bypass RLS) ───────────────────────────
  // CR-01: UPSERT quando ha idempotency_key. Um retry AI-05 reusa a MESMA key e um
  // plain insert colidiria (23505) com a linha stale `success=false` -> o erro seria
  // engolido e o resultado do retry nunca persistiria (audit quebrado + custo real
  // invisivel ao teto AI-06 + nunca converge). O UPSERT sobrescreve a linha stale
  // (1 linha por key, ultimo resultado vence). Keys NULL sao distintas na UNIQUE
  // (Postgres) -> mantem-se o plain insert (cada chamada sem key e uma linha propria).
  const logsTable = supabaseAdmin.from("ai_call_logs");
  // ⚠ NÃO fazer `await` aqui: o PostgREST devolve um BUILDER (thenable) e é nele que
  //   `.select("id").single()` existe. Um `await` prematuro executa a query e devolve
  //   `{ data, error }`, que não tem `.select` — foi como o `id` nunca chegava.
  const pendente = insertRow.idempotency_key != null
    ? logsTable.upsert(insertRow, { onConflict: "idempotency_key" })
    : logsTable.insert(insertRow);

  // Phase 49 / D-38: o `id` da linha só é obtenível encadeando `.select("id").single()`
  // no builder. Feature-detection (mesmo idioma de `tryIdempotencyReplay`): os mocks das
  // 7 EFs consumidoras devolvem `Promise.resolve({ data, error })`, que NÃO tem `.select`
  // — esses degradam para `id: null` e continuam válidos sem uma única edição.
  const comSelect = pendente as unknown as {
    select?: (columns: string) => {
      single: () => Promise<{ data: { id?: unknown } | null; error: unknown }>;
    };
  };
  let id: string | null = null;
  let error: unknown = null;
  if (typeof comSelect.select === "function") {
    const devolvido = await comSelect.select("id").single();
    error = devolvido.error;
    const idBruto = devolvido.data?.id;
    id = typeof idBruto === "string" ? idBruto : null;
  } else {
    error = (await pendente).error;
  }

  if (error) {
    // Loga apenas codigo+resumo — NUNCA o payload bruto (precedente submit-candidatura).
    const summary = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "insert_failed";
    console.error(`[audit-logger] ai_call_logs INSERT falhou (call_type=${row.call_type}): ${summary}`);
    // JORN-39: o `console.error` CONTINUA (é o rastro de runtime), mas o erro deixa de
    // morrer aqui — quem chama decide se vira alerta em `recruiter_alerts`.
    return { id: null, error: summary };
  }
  return { id, error: null };
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

/**
 * JORN-39 (Phase 49) — alarme de «a linha de auditoria não pôde ser gravada».
 *
 * MEDIDO EM PROD em 2026-09-22: `select count(*) from ai_call_logs where
 * provider::text='none'` devolvia **0**. Os dois caminhos que cortam uma chamada antes de
 * tocar provedor nenhum — o teto de custo diário (AI-06) e a detecção de injeção — gravam
 * `provider:"none"`; o enum `public.llm_provider` não tinha esse valor; o INSERT falhava
 * com 22P02; e `logAiCall` transformava o erro num `console.error` que ninguém lê. O
 * resultado é o pior tipo de defeito de auditoria: **indistinguível de «nunca aconteceu»**.
 * Nenhum corte de gasto e nenhuma injeção detectada deixou rastro por mais de um mês.
 *
 * O 49-01 acrescentou `'none'` ao enum, e isto fecha o outro lado: quando a escrita falha,
 * ALGUÉM fica sabendo. O alerta é o backstop de um backstop — se ele também falhar, resta
 * o `console.error`, e é aí que a cadeia termina.
 *
 * INVARIANTE (igual a `emitPromptStubAlert`): NUNCA lança. Roda no caminho em que o
 * `callAi` já decidiu devolver `hold` + revisão humana (RNF-07a); uma exceção daqui
 * transformaria uma falha de AUDITORIA numa falha de AVALIAÇÃO do candidato.
 *
 * PRIVACIDADE (T-49-02-03): a linha de alerta leva só o `error_code` e o `call_type` —
 * nunca o input, nunca o padrão de injeção casado, nunca o prompt. Esquema conferido em
 * PROD por leitura (`information_schema.columns` + `pg_constraint`): `threshold_violated`
 * é `text NOT NULL` SEM CHECK, `channel` é `text` nulável SEM CHECK, e `call_type` é o
 * enum `llm_call_type` — por isso vai `null`, como no precedente (`bigfive_devolutiva`
 * não é valor válido do enum e daria 22P02). Nenhum valor novo de enum/CHECK é criado.
 */
export async function emitAuditLossAlert(
  supabaseAdmin: SupabaseLike,
  call_type: string,
  error_code: string,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("recruiter_alerts").insert({
      threshold_violated: "ai_audit_write_failed",
      channel: "ai_stack",
      message:
        `Falha ao gravar a linha de auditoria de IA (call_type='${call_type}', error_code='${error_code}') — ` +
        `o bloqueio ACONTECEU e NÃO ficou registrado em ai_call_logs.`,
      value: 0,
      threshold: 0,
      call_type: null, // coluna e o enum llm_call_type — evitar 22P02
      vaga_id: null,
      candidato_id: null,
      created_at: new Date().toISOString(),
    });
    if (error) {
      const summary = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "insert_failed";
      console.error(
        `[audit-logger] emitAuditLossAlert INSERT falhou (call_type=${call_type}, error_code=${error_code}): ${summary}`,
      );
    }
  } catch (e) {
    const summary = e instanceof Error ? e.name : "throw";
    console.error(`[audit-logger] emitAuditLossAlert lançou (call_type=${call_type}): ${summary}`);
  }
}
