/**
 * Edge Function: avaliar-redacao
 *
 * Phase 11 / Plan 11-02 — AVAL-03 / RF-14. Invocada pelo CANDIDATO autenticado
 * (JWT-ON) para pontuar a resposta de CASO ABERTO do SJT.
 *
 * Arquitetura (two-client D-23 + C1 authenticate-THEN-authorize, lição Phase 10):
 *   Recebe `{ candidatura_id, pergunta_id, texto }`, verifica o JWT do candidato
 *   (supabaseUser anon + Authorization → auth.getUser()), AUTORIZA que auth.uid()
 *   é dono da candidatura E etapa_atual='avaliacao_assincrona' (403 caso contrário —
 *   service_role bypassa RLS, então a checagem é obrigatória ANTES de qualquer
 *   leitura/escrita), roda o prompt `work_sample_sjt` (Sonnet) sobre a resposta via
 *   callAi, mapeia os scores BARS 1-5 por dimensão para um composto ponderado 0-25,
 *   e persiste UMA linha em `scores_candidato` (tipo='sjt', subtipo='caso_aberto').
 *
 * INVARIANTE (RNF-07a — T-11-02-06): a EF NUNCA escreve `candidaturas`. Não há
 *   auto-advance nem auto-reject. `<13/25 OU ≥1 red_flag OU insufficient_evidence`
 *   → status='pendente_humano'; senão 'sucesso'. O candidato recebe um payload
 *   NEUTRO (`{ ok:true }`) — nunca o score.
 *
 * Two-client (D-23): supabaseUser (anon + Authorization) SÓ para auth.getUser();
 *   supabaseAdmin (service_role) SÓ para leituras/escritas privilegiadas.
 *
 * Prompt call_type = `work_sample_sjt` (a chave seedada; NÃO a chave órfã que o
 *   CONTEXT cita por engano — ela não tem row/template/enum, RESEARCH Pitfall 1).
 *
 * callAi (Phase 9) já faz injection/maskPII/retry/fallback/cost/log — nunca
 *   re-implementar. Injeção/never-absent → throw → persiste 'falhou'.
 *
 * Deploy: `supabase functions deploy avaliar-redacao` (JWT-ON; SEM --no-verify-jwt —
 *   é candidate-invoked; flag tratada no Plan 11-04 [BLOCKING]).
 *
 * @module supabase/functions/avaliar-redacao
 * @see supabase/functions/comparativo-candidatos/index.ts (skeleton two-client + C1)
 * @see supabase/functions/_shared/ai-client.ts (callAi + loadPrompt)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAi,
  loadPrompt,
  resolvedPromptFromLoaded,
  type ResolvedPrompt,
} from "../_shared/ai-client.ts";
import {
  AvaliarRedacaoBodySchema,
  WorkSampleScoringSchema,
} from "../_shared/avaliacao-schemas.ts";
// SDKs como import ESTÁTICO `npm:` — o runtime-constructed `["npm:",pkg].join("")` escondia o
// pacote da lista de dependências do deploy (ERR_MODULE_NOT_FOUND no runtime do EF — AVAL-03 gap).
// Precedente que deploya E passa o `deno test` type-checked: comparativo-candidatos/index.ts.
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

export interface AvaliarRedacaoDeps {
  // deno-lint-ignore no-explicit-any
  anthropic: any;
  // deno-lint-ignore no-explicit-any
  openai: any;
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
  /** Builders de structured-output (prod injeta os reais; testes omitem → callAi usa no-op). */
  zodOutputFormat?: (schema: unknown, name: string) => unknown;
  zodResponseFormat?: (schema: unknown, name: string) => unknown;
}

/** Linha de dimensão BARS retornada pelo prompt work_sample_sjt. */
interface DimensionScore {
  dimension: string;
  score: number | "insufficient_evidence";
}

/**
 * Mapeia os scores 1-5 por dimensão para um composto 0-25 (Pitfall 2).
 *
 * Derivação (documentada): composite_0_25 = (Σ(peso_i · score_i) / Σ peso_i / 5) · 25,
 * onde `peso_i` vem da rubric da pergunta quando disponível, senão peso uniforme
 * (média simples). `insufficient_evidence` NÃO contribui um número fabricado —
 * sinaliza `hasInsufficient=true`, que força `pendente_humano` (sem inventar score).
 *
 * @returns `{ composite, hasInsufficient }` — composite em [0,25].
 */
function mapDimensionsToComposite(
  dims: DimensionScore[],
  rubricWeights: Record<string, number> | null,
): { composite: number; hasInsufficient: boolean } {
  let weightedSum = 0;
  let weightTotal = 0;
  let hasInsufficient = false;

  for (const d of dims) {
    if (d.score === "insufficient_evidence" || typeof d.score !== "number") {
      hasInsufficient = true;
      continue;
    }
    const w = rubricWeights?.[d.dimension] ?? 1;
    weightedSum += w * d.score;
    weightTotal += w;
  }

  if (weightTotal === 0) return { composite: 0, hasInsufficient };
  // Normaliza a média ponderada (1-5) para a banda 0-25.
  const composite = (weightedSum / weightTotal / 5) * 25;
  return { composite: Math.round(composite * 100) / 100, hasInsufficient };
}

/** Extrai os pesos da rubric jsonb da pergunta (`{ dimensoes:[{dimension,peso}] }`). */
function rubricWeightsFrom(rubric: unknown): Record<string, number> | null {
  if (!rubric || typeof rubric !== "object") return null;
  const dimensoes = (rubric as { dimensoes?: unknown }).dimensoes;
  if (!Array.isArray(dimensoes)) return null;
  const out: Record<string, number> = {};
  for (const d of dimensoes) {
    if (d && typeof d === "object" && "dimension" in d && "peso" in d) {
      const dim = String((d as { dimension: unknown }).dimension);
      const peso = Number((d as { peso: unknown }).peso);
      if (Number.isFinite(peso)) out[dim] = peso;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói os
 * clientes reais a partir do env + do Authorization header e delega para cá.
 */
export async function handler(req: Request, deps: AvaliarRedacaoDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { anthropic, openai, supabaseAdmin, supabaseUser } = deps;

  // ── 1. Autentica o JWT do candidato (two-client D-23 — auth.getUser anon) ────
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 2. Parse + valida o body (SEM campo de score — Pitfall 5) ───────────────
  let body: { candidatura_id: string; pergunta_id: string; texto: string };
  try {
    const raw = await req.json();
    const parsed = AvaliarRedacaoBodySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse("VALIDATION", "Payload da avaliação inválido.");
    }
    body = parsed.data;
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  // ── 3. AUTORIZA (C1 — IDOR/back-lock): service_role bypassa RLS, então a EF
  //      DEVE verificar posse + etapa ANTES de tocar qualquer dado. Allowlist
  //      explícita de colunas, nunca o wildcard — [[reference_select_star_leaks_pii]].
  const { data: candRow, error: candErr } = await supabaseAdmin
    .from("candidaturas")
    .select("id, candidato_id, vaga_id, etapa_atual")
    .eq("id", body.candidatura_id)
    .maybeSingle();
  if (candErr) {
    return errorResponse("SERVER_ERROR", "Falha ao verificar a candidatura.", 500);
  }
  if (!candRow) {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }
  // posse: resolve o candidato do usuário logado via candidatos.user_id=auth.uid()
  //   e compara contra candaturas.candidato_id (= candidatos.id). Comparar
  //   `candRow.candidato_id` direto contra `user.id` é um bug: candidato_id é
  //   candidatos.id, NÃO o auth uid — eles diferem em PROD → 403 para todo candidato.
  const { data: candidatoRow } = await supabaseAdmin
    .from("candidatos")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!candidatoRow || candidatoRow.id !== candRow.candidato_id) {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }
  if (candRow.etapa_atual !== "avaliacao_assincrona") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }

  try {
    // ── 4. Lê o cenário + rubric da pergunta de caso aberto pelo id (allowlist) ─
    //      C2: lookup determinístico por `id` (NÃO `cargo_teste`, coluna inexistente).
    //      Se a pergunta não existe OU não é caso aberto, é 400 — NUNCA cair em
    //      cenário vazio + pesos uniformes (que mascararia a rubric da vaga).
    const { data: pergRow, error: pergErr } = await supabaseAdmin
      .from("perguntas")
      .select("id, cenario, rubric, formato")
      .eq("id", body.pergunta_id)
      .maybeSingle();
    if (pergErr) {
      return errorResponse("SERVER_ERROR", "Falha ao carregar a pergunta.", 500);
    }
    if (!pergRow || pergRow.formato !== "caso_aberto") {
      return errorResponse("VALIDATION", "Pergunta de caso aberto inválida.", 400);
    }
    const cenario = typeof pergRow.cenario === "string" ? pergRow.cenario : "";
    const rubricWeights: Record<string, number> | null = rubricWeightsFrom(pergRow.rubric);

    // ── 5. Resolve o prompt work_sample_sjt + callAi ──────────────────────────
    let resolved: ResolvedPrompt;
    try {
      const loaded = await loadPrompt("work_sample_sjt", supabaseAdmin);
      resolved = resolvedPromptFromLoaded(loaded, "work_sample_sjt", "gpt-4o-mini");
    } catch {
      resolved = {
        call_type: "work_sample_sjt",
        model_id: "claude-sonnet-4-6",
        fallback_model_id: "gpt-4o-mini",
        prompt_version: "0.0.0",
        system_template: "Avalie a resposta de caso aberto (work_sample_sjt).",
        max_tokens: 2048,
        temperature: 0,
      };
    }

    const result = await callAi(
      {
        prompt: resolved,
        rawInput: `${cenario}\n\n---\n\nResposta do candidato:\n${body.texto}`,
        vagaRubricBlock: `Vaga: ${candRow.vaga_id}`,
        candidato_id: candRow.candidato_id,
        vaga_id: candRow.vaga_id,
        schema: WorkSampleScoringSchema,
      },
      // Encaminha os builders injetados (prod) — sem eles o schema cru quebra ambos provedores.
      // Testes omitem → callAi usa no-op (inalterado).
      {
        anthropic,
        openai,
        supabase: supabaseAdmin,
        zodOutputFormat: deps.zodOutputFormat,
        zodResponseFormat: deps.zodResponseFormat,
      },
    );

    // ── 6. Never-absent + injeção → persiste 'falhou', nunca um sucesso falso ─
    const parsed = result.parsed as
      | { dimension_scores?: DimensionScore[]; red_flags?: string[] }
      | null;
    if (parsed == null) {
      await supabaseAdmin.from("scores_candidato").insert({
        candidatura_id: body.candidatura_id,
        pergunta_id: body.pergunta_id,
        tipo: "sjt",
        subtipo: "caso_aberto",
        score: null,
        score_max: 25,
        status: "falhou",
        metadata: { error_code: result.error_code ?? "ia_sem_resultado" },
      });
      return jsonResponse({ ok: true }, 200);
    }
    if (
      result.flagged_for_human_review === true ||
      result.error_code === "prompt_injection_detected"
    ) {
      await supabaseAdmin.from("scores_candidato").insert({
        candidatura_id: body.candidatura_id,
        pergunta_id: body.pergunta_id,
        tipo: "sjt",
        subtipo: "caso_aberto",
        score: null,
        score_max: 25,
        status: "pendente_humano",
        metadata: { error_code: result.error_code ?? "flagged_for_human_review" },
      });
      return jsonResponse({ ok: true }, 200);
    }

    // ── 7. Mapeia 1-5 → composto 0-25 (Pitfall 2) + threshold (RNF-07a) ───────
    const dims = Array.isArray(parsed.dimension_scores) ? parsed.dimension_scores : [];
    const redFlags = Array.isArray(parsed.red_flags) ? parsed.red_flags : [];
    const { composite, hasInsufficient } = mapDimensionsToComposite(dims, rubricWeights);

    // <13/25 OU ≥1 red_flag OU qualquer insufficient_evidence → pendente_humano.
    const status =
      composite < 13 || redFlags.length > 0 || hasInsufficient
        ? "pendente_humano"
        : "sucesso";

    // ── 8. Persiste UMA linha de score (NUNCA toca candidaturas — RNF-07a) ────
    await supabaseAdmin.from("scores_candidato").insert({
      candidatura_id: body.candidatura_id,
      pergunta_id: body.pergunta_id,
      tipo: "sjt",
      subtipo: "caso_aberto",
      score: composite,
      score_max: 25,
      status,
      metadata: {
        dimension_scores: dims,
        composite_0_25: composite,
        has_insufficient_evidence: hasInsufficient,
      },
      citacoes: (parsed as { cited_evidence?: unknown }).cited_evidence ?? null,
      red_flags: redFlags,
    });

    // Log redigido (Pitfall 7) — só ids/counts/status; NUNCA o texto/score bruto.
    console.log("[avaliar-redacao] ok", {
      candidatura_id: body.candidatura_id,
      pergunta_id: body.pergunta_id,
      dims_count: dims.length,
      red_flags_count: redFlags.length,
      status,
      provider: result.provider,
    });

    // Payload NEUTRO — o candidato nunca recebe o score (RNF-07a).
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[avaliar-redacao] erro", {
      candidatura_id: body.candidatura_id,
      error: message,
    });
    return errorResponse("SERVER_ERROR", "Falha ao avaliar a resposta.", 500);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[avaliar-redacao] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    }

    // anon client COM Authorization → auth.getUser() verifica o JWT do candidato.
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
