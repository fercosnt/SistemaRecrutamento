/**
 * Edge Function: gerar-guia-entrevista
 *
 * Phase 14 / Plan 14-03 — ENTREV-01 / ENTREV-04. Invocada por um RH autenticado
 * (JWT-ON) para gerar o ROTEIRO STAR/PEI de entrevista (online | presencial).
 * EF NOVA e dedicada — clone do skeleton RH-authorize de `comparativo-candidatos`
 * + a shape de `callAi` de `avaliar-redacao-cultural`.
 *
 * Arquitetura (two-client D-23 + C1 authenticate-THEN-authorize, lição Phase 10):
 *   Recebe `{ candidatura_id, vaga_id, tipo }`, verifica o JWT do RH
 *   (supabaseUser anon + Authorization → auth.getUser()), AUTORIZA o papel a partir
 *   de `usuarios_rh` (NÃO dos claims do JWT — silent-403 landmine) + posse da vaga
 *   (vagas.created_by === user.id; administrador bypassa), lê o scorecard prévio
 *   (Etapa 3) de `scores_candidato` para computar as dimensões fracas, roda o prompt
 *   `interview_guide` (Sonnet) via callAi com o `InterviewGuideSchema`, e — depois
 *   do parse — valida server-side que TODA dimensão fraca é coberta (Pitfall 4); se
 *   não, faz UM re-prompt bounded; se ainda descoberto, persiste o roteiro com flag
 *   para humano (nunca passa um roteiro incompleto em silêncio). Persiste o roteiro
 *   em `entrevista_guias`.
 *
 * BRANCH por `tipo` (CONTEXT):
 *   - `online`     → dimensões fracas = score<3 (das etapas anteriores).
 *   - `presencial` → roteiro focado nos GAPS da entrevista online; dimensões
 *     fracas = score<4 do scorecard `tipo='entrevista'` da Etapa 4.
 *
 * INVARIANTE (RNF-07a): a EF NUNCA escreve `candidaturas`. Sem auto-advance nem
 *   auto-reject. Só persiste o roteiro + (quando descoberto) uma flag de revisão.
 *
 * ── SDK imports ESTÁTICOS `npm:` (clone de avaliar-redacao-cultural:54-60) ──
 *   O `await import(["npm:",pkg].join(""))` escondia o pacote do bundler do deploy
 *   → ERR_MODULE_NOT_FOUND no runtime. Aqui os imports são estáticos e os builders
 *   zodOutputFormat/zodResponseFormat são INJETADOS em callAi (sem eles callAi cai
 *   no no-op `(s)=>s` e quebra AMBOS os provedores — Pitfall 1/2).
 *
 * Deploy: `supabase functions deploy gerar-guia-entrevista` (JWT-ON; RH-invoked;
 *   tratado no Plan 14-04 [BLOCKING]). NÃO deployado aqui.
 *
 * @module supabase/functions/gerar-guia-entrevista
 * @see supabase/functions/comparativo-candidatos/index.ts (RH-authorize + two-client wiring)
 * @see supabase/functions/avaliar-redacao-cultural/index.ts (callAi + loadPrompt shape)
 * @see supabase/functions/gerar-guia-entrevista/_local/weak-dim-coverage.ts (Pitfall 4)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAi,
  loadPrompt,
  resolvedPromptFromLoaded,
  type ResolvedPrompt,
} from "../_shared/ai-client.ts";
// AI-01: catch estreitado — propaga a falha de resolução de prompt como 500
// estruturado (nunca stub 0.0.0) + alarme no ponto de degradação.
import { PromptNotConfiguredError, SchemaVersionMismatchError } from "../_shared/prompt-loader.ts";
import { emitPromptStubAlert } from "../_shared/audit-logger.ts";
import { GerarGuiaBodySchema } from "../_shared/entrevista-schemas.ts";
import { InterviewGuideSchema } from "../_shared/interview-output-schemas.ts";
import { checkWeakDimCoverage } from "./_local/weak-dim-coverage.ts";
// SDKs como import ESTÁTICO `npm:` — o runtime-constructed `["npm:",pkg].join("")`
// escondia o pacote da lista de deps do deploy → ERR_MODULE_NOT_FOUND. NÃO copiar.
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import OpenAI from "npm:openai@6.42.0";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";

// ---------------------------------------------------------------------------
// CORS + response helpers
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "SERVER_ERROR";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}

// ---------------------------------------------------------------------------
// Deps injetáveis (testes injetam mocks; produção constrói clientes reais)
// ---------------------------------------------------------------------------

export interface GerarGuiaDeps {
  // deno-lint-ignore no-explicit-any
  anthropic: any;
  // deno-lint-ignore no-explicit-any
  openai: any;
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
  /** Builders de structured-output (prod injeta os reais; testes omitem → callAi no-op). */
  zodOutputFormat?: (schema: unknown, name: string) => unknown;
  zodResponseFormat?: (schema: unknown, name: string) => unknown;
}

/** Linha allowlist de `scores_candidato` consumida para computar dimensões fracas. */
interface ScoreRow {
  tipo: string;
  subtipo: string | null;
  score: number | null;
  score_max: number | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Extrai as dimensões fracas (competência → score) de um conjunto de linhas de
 * scorecard. Uma dimensão é fraca quando seu score por-competência está abaixo do
 * `threshold`. Os scores por-competência vivem em `metadata.competencias`
 * (per-competency BARS); ausentes → nenhuma dimensão fraca derivável.
 */
function weakDimsFromScores(rows: ScoreRow[], threshold: number): string[] {
  const weak = new Set<string>();
  for (const r of rows) {
    const comps = (r.metadata?.competencias ?? r.metadata?.competency_scores) as
      | Array<{ competency?: string; name?: string; score?: unknown }>
      | undefined;
    if (!Array.isArray(comps)) continue;
    for (const c of comps) {
      const label = c.competency ?? c.name;
      const s = typeof c.score === "number" ? c.score : Number(c.score);
      if (label && Number.isFinite(s) && (s as number) < threshold) weak.add(label);
    }
  }
  return [...weak];
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói os
 * clientes reais a partir do env + do Authorization header e delega para cá.
 */
export async function handler(req: Request, deps: GerarGuiaDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { anthropic, openai, supabaseAdmin, supabaseUser } = deps;

  // ── 1. Verifica o JWT do RH (two-client D-23 — auth.getUser via anon client) ─
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 1b. AUTORIZA (C1 — IDOR/PII): role NÃO vem dos claims do JWT (getUser() reflete
  //      raw_app_meta_data SEM role → null → silent 403). Fonte de verdade = usuarios_rh
  //      via service_role (mesma derivação do hook: recrutador→rh, administrador→administrador).
  const { data: rhRow } = await supabaseAdmin
    .from("usuarios_rh")
    .select("role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  const dbRole = (rhRow?.role as string | undefined) ?? null;
  const role = dbRole === "recrutador"
    ? "rh"
    : dbRole === "administrador"
      ? "administrador"
      : dbRole;
  if (role !== "rh" && role !== "administrador") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }

  // ── 2. Parse + valida o body (.strict — anti-tamper, sem score/banda) ───────
  let body: { candidatura_id: string; vaga_id: string; tipo: "online" | "presencial" };
  try {
    const raw = await req.json();
    const parsed = GerarGuiaBodySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse("VALIDATION", "Payload da guia inválido.");
    }
    body = parsed.data;
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  try {
    // ── 3. Posse da vaga (C1): role='rh' DEVE ser o dono (vagas.created_by===user.id);
    //      administrador bypassa. Sem isso, um RH de OUTRA vaga geraria a guia alheia.
    const { data: vagaRow, error: vagaErr } = await supabaseAdmin
      .from("vagas")
      .select("id, created_by, titulo, pesos_avaliacao, perfil_ideal, requisitos_habilidades")
      .eq("id", body.vaga_id)
      .maybeSingle();
    if (vagaErr) {
      return errorResponse("SERVER_ERROR", "Falha ao verificar a vaga.", 500);
    }
    if (!vagaRow) {
      return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }
    if (role === "rh" && vagaRow.created_by !== user.id) {
      return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }

    // Cross-check: a candidatura pertence à vaga informada (IDOR).
    const { data: candRow } = await supabaseAdmin
      .from("candidaturas")
      .select("id, vaga_id, candidato_id")
      .eq("id", body.candidatura_id)
      .maybeSingle();
    if (!candRow || candRow.vaga_id !== body.vaga_id) {
      return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }

    // ── 4. Scorecard prévio + dimensões fracas (allowlist — NÃO select('*')). ──
    //      online → score<3 das etapas anteriores; presencial → score<4 do
    //      scorecard tipo='entrevista' (Etapa 4, GAPS da entrevista online).
    const isPresencial = body.tipo === "presencial";
    const scoreQuery = supabaseAdmin
      .from("scores_candidato")
      .select("tipo, subtipo, score, score_max, metadata")
      .eq("candidatura_id", body.candidatura_id);
    const { data: scoreRowsRaw } = isPresencial
      ? await scoreQuery.eq("tipo", "entrevista")
      : await scoreQuery;
    const scoreRows: ScoreRow[] = (scoreRowsRaw ?? []) as ScoreRow[];
    const weakThreshold = isPresencial ? 4 : 3;
    const weakDims = weakDimsFromScores(scoreRows, weakThreshold);

    // ── 5. Resolve o prompt interview_guide + monta o input block ─────────────
    let resolved: ResolvedPrompt;
    try {
      const loaded = await loadPrompt("interview_guide", supabaseAdmin);
      resolved = resolvedPromptFromLoaded(loaded, "interview_guide", "gpt-4o-mini");
    } catch (e) {
      // AI-01: NÃO degradar para um stub silencioso. Uma versão de prompt não
      // resolvida (schema mismatch / não configurada) FALHA ALTO — alarma e
      // propaga para o try/catch externo do handler (500 estruturado pt-BR).
      if (e instanceof SchemaVersionMismatchError || e instanceof PromptNotConfiguredError) {
        await emitPromptStubAlert(supabaseAdmin, "interview_guide");
      }
      throw e;
    }

    // {{BARS_RUBRIC_PER_COMPETENCY}} — derivado das competências críticas da vaga
    // (resolved Q4: a fonte é pesos_avaliacao + os requisitos; sem set hardcoded).
    const pesos = (vagaRow.pesos_avaliacao ?? {}) as Record<string, unknown>;
    const competenciasVaga = Object.keys(pesos);
    const barsRubricBlock =
      `Vaga: ${vagaRow.titulo ?? body.vaga_id}\n` +
      `Formato: ${body.tipo}\n` +
      `Competências críticas (pesos): ${competenciasVaga.join("; ") || "(derivar do perfil)"}\n` +
      `Perfil ideal: ${String(vagaRow.perfil_ideal ?? "").slice(0, 800)}\n` +
      `Dimensões fracas (probe obrigatório, score<${weakThreshold}): ${weakDims.join("; ") || "(nenhuma)"}`;

    const guideInput =
      `Gere um roteiro de entrevista ${body.tipo}.\n` +
      (isPresencial
        ? `Foque nos GAPS da entrevista online (dimensões com score<4). Cada dimensão fraca DEVE ter ≥1 pergunta.`
        : `Cada dimensão fraca (score<3) DEVE ter ≥1 pergunta. 5-7 perguntas STAR/PEI com âncoras BARS 1-5.`);

    const runGuide = (extraInstruction = "") =>
      callAi(
        {
          prompt: resolved,
          rawInput: guideInput + (extraInstruction ? `\n\n${extraInstruction}` : ""),
          vagaRubricBlock: barsRubricBlock,
          // 2026-09-06: era `body.candidatura_id` — id de CANDIDATURA numa FK para
          //   `candidatos` → ai_call_logs INSERT falhava com 23503 e NENHUM guia de
          //   entrevista jamais foi auditado/custeado. Vem da candidatura carregada.
          candidato_id: (candRow as { candidato_id?: string | null } | null)?.candidato_id ?? null,
          vaga_id: body.vaga_id,
          schema: InterviewGuideSchema,
          idempotency_key: `${body.candidatura_id}:${body.tipo}${extraInstruction ? ":reprompt" : ""}`,
          // P21-FIX: a geração do roteiro (Sonnet, structured-output STAR + âncoras BARS,
          // ~4000 tokens) excede legitimamente o teto global de 25s (RESIL-01) e estava
          // estourando timeout → 500 em TODA geração de guia em PROD. Teto por-chamada de
          // 60s dá folga p/ 1 passada completar; não afrouxa o fast-fail das outras EFs.
          // 2026-09-06: 60 s x 2 tentativas estourava (137 s medidos) → gpt-4o-mini.
          //   110 s, 1 tentativa, como as demais EFs de IA.
          timeoutMs: 110_000,
        },
        {
          anthropic,
          openai,
          supabase: supabaseAdmin,
          zodOutputFormat: deps.zodOutputFormat,
          zodResponseFormat: deps.zodResponseFormat,
        },
      );

    // ── 6. callAi (1ª passada) ────────────────────────────────────────────────
    let result = await runGuide();
    let guide = result.parsed as { questions?: Array<{ competency: string }> } | null;

    // ── 7. Pós-validação de cobertura de dimensão fraca (Pitfall 4) ───────────
    //      Se uma dimensão fraca ficou descoberta, UM re-prompt bounded enfatizando
    //      as faltantes; se AINDA descoberto, persiste com flag para humano (nunca
    //      passa um roteiro incompleto em silêncio).
    let needsHumanFlag = false;
    if (guide) {
      let coverage = checkWeakDimCoverage(
        { questions: (guide.questions ?? []).map((q) => ({ competency: q.competency })) },
        weakDims,
      );
      if (!coverage.covered) {
        result = await runGuide(
          `As dimensões fracas a seguir NÃO foram cobertas e PRECISAM de ≥1 pergunta cada: ${coverage.missing.join("; ")}.`,
        );
        const reGuide = result.parsed as { questions?: Array<{ competency: string }> } | null;
        if (reGuide) {
          guide = reGuide;
          coverage = checkWeakDimCoverage(
            { questions: (reGuide.questions ?? []).map((q) => ({ competency: q.competency })) },
            weakDims,
          );
        }
        if (!coverage.covered) needsHumanFlag = true;
      }
    }

    // ── 8. Never-absent: parse falho → persiste row de flag para humano, nunca
    //      um sucesso fabricado. Persiste o roteiro (ou a marca de revisão).
    const persistFlags: string[] = [];
    if (guide == null || result.error_code === "prompt_injection_detected") {
      persistFlags.push(result.error_code ?? "ia_sem_resultado");
    }
    if (needsHumanFlag) persistFlags.push("weak_dim_uncovered");

    // ── 8a. MERGE-PRESERVE (ENTREV-08 anti-silent-discard) ─────────────────────
    //   Lê a guia ATUAL (allowlist `select("guia")` — NUNCA select('*'),
    //   reference_select_star_leaks_pii) e separa as perguntas por `origem`. As
    //   `origem:'manual'` são PRESERVADAS (identificadas pelo campo `origem`, não por
    //   texto/ordem — o campo é autoritativo e sobrevive a reorder/edit). Apenas as
    //   `origem:'ia'` são substituídas pela geração fresca, cada uma estampada
    //   `origem:'ia'` POST-parse (A1 — NÃO via o schema zod/v4; helper surface intacta).
    //   CRÍTICO (Pitfall 3): este merge roda ANTES do fallback `guide ?? {incompleto}` —
    //   um regen FALHO (guide==null) carrega `manualQs` no payload incompleto, então
    //   NUNCA apaga uma edição manual. RNF-07a: ainda não escreve `candidaturas`.
    const { data: currentRow } = await supabaseAdmin
      .from("entrevista_guias")
      .select("guia")
      .eq("candidatura_id", body.candidatura_id)
      .eq("tipo", body.tipo)
      .maybeSingle();
    const currentGuia = currentRow?.guia as Record<string, unknown> | undefined;
    const currentQs = (currentGuia?.questions ?? currentGuia?.perguntas ?? []) as Array<
      Record<string, unknown>
    >;
    const manualQs = currentQs.filter((q) => q.origem === "manual");
    const freshIaQs = ((guide?.questions ?? []) as Array<Record<string, unknown>>).map((q) => ({
      ...q,
      origem: "ia" as const,
    }));
    const mergedQuestions = [...manualQs, ...freshIaQs];

    // WR-04: CHECK the upsert error. A swallowed write error is an anti-silent-discard
    // hole at the persistence layer — the regen would appear to succeed (ok:true) while
    // the new guide was never persisted, and the client reads back the STALE guide. The
    // merge-preserve logic above is moot if the write silently fails. Surface a
    // structured non-200 so the client treats it as a failure (NEVER a fabricated ok).
    const { error: upsertErr } = await supabaseAdmin.from("entrevista_guias").upsert(
      {
        candidatura_id: body.candidatura_id,
        tipo: body.tipo,
        guia: guide
          ? { ...guide, questions: mergedQuestions }
          : { incompleto: true, flags: persistFlags, questions: manualQs },
        prompt_version: resolved.prompt_version,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "candidatura_id,tipo" },
    );
    if (upsertErr) {
      // Redacted log (LGPD-02) — only ids + the error message, never the guide content.
      console.error("[gerar-guia-entrevista] falha ao persistir a guia", {
        candidatura_id: body.candidatura_id,
        tipo: body.tipo,
        error: (upsertErr as { message?: string }).message ?? String(upsertErr),
      });
      return errorResponse("SERVER_ERROR", "Falha ao persistir a guia de entrevista.", 500);
    }

    // Log redigido (LGPD-02 / Pitfall 7) — só ids/counts/status; NUNCA o conteúdo/nome.
    console.log("[gerar-guia-entrevista] ok", {
      candidatura_id: body.candidatura_id,
      tipo: body.tipo,
      weak_dims_count: weakDims.length,
      questions_count: guide?.questions?.length ?? 0,
      needs_human: needsHumanFlag || guide == null,
      provider: result.provider,
    });

    // Payload NEUTRO (RH-facing) — o RH abre o roteiro pela UI/serviço (allowlist).
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[gerar-guia-entrevista] erro", {
      candidatura_id: body.candidatura_id,
      error: message,
    });
    return errorResponse("SERVER_ERROR", "Falha ao gerar a guia de entrevista.", 500);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // CORS preflight ANTES de qualquer checagem de auth — o browser manda OPTIONS SEM
    // Authorization; sem este short-circuit o guard de authHeader devolvia 401 no
    // preflight → o browser bloqueava por CORS.
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[gerar-guia-entrevista] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    }

    // anon client COM Authorization → auth.getUser() verifica o JWT do RH.
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // service_role SÓ para leituras/escritas privilegiadas (D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // SDKs construídos a partir dos imports estáticos do topo (resolvíveis no deploy).
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    return await handler(req, {
      anthropic,
      openai,
      supabaseAdmin,
      supabaseUser,
      // Adapters p/ a assinatura `(schema, name)` do CallAiDeps (Anthropic usa só o schema).
      zodOutputFormat: (s, _n) => zodOutputFormat(s as never),
      zodResponseFormat: (s, n) => zodResponseFormat(s as never, n),
    });
  });
}
