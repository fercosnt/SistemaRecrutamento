/**
 * Edge Function: comparativo-candidatos
 *
 * Phase 10 / Plan 10-03 — TRIAGEM-03. Invocada por um RH autenticado.
 *
 * Arquitetura (CONTEXT §Comparativo on-demand — two-client D-23, JWT verify ON):
 *   Recebe `{ vaga_id, candidatura_ids[] }`, verifica o JWT do RH (supabaseUser
 *   anon + Authorization → auth.getUser()), valida 2-10 ids + que TODOS pertencem
 *   à MESMA vaga (400 caso contrário), roda o prompt `comparative_ranking` (Sonnet,
 *   single-eval V1) sobre as análises PRÉ-COMPUTADAS e INSERTa UMA linha de
 *   auditoria em `comparativo_solicitado` (candidatura_ids + ranking + latencia_ms).
 *
 * ── SINGLE-EVAL V1 (anti-viés de posição) ─────────────────────────────────────
 *   O prompt `comparative_ranking` prescreve dupla-avaliação (swap + média) para
 *   neutralizar viés de posição. Para cumprir o P95 ≤5s (CONTEXT) o V1 faz UMA
 *   passada só, mitigando o viés de DUAS formas determinísticas ANTES do prompt:
 *     1. ancora no `score_match` ESTÁVEL já computado por candidato (não recalcula);
 *     2. ORDENA os candidatos por score_match DESC antes de montar o input.
 *   A dupla-avaliação (swap + média) fica DEFERIDA para o V2.
 *
 * Two-client (D-23): supabaseUser (anon + Authorization) SÓ para auth.getUser();
 *   supabaseAdmin (service_role) SÓ para leituras/escritas privilegiadas. NUNCA
 *   service_role para auth.getUser() (sem contexto auth.uid()).
 *
 * Segurança (T-10-09/10/11): IDOR — rejeita 400 quando os ids cruzam >1 vaga OU a
 *   contagem de análises != ids (um candidato ainda sem análise); o texto do
 *   candidato roteado ao prompt são as análises pré-computadas (NÃO CVs crus),
 *   reduzindo o orçamento de tokens e a superfície de injeção; logs redigidos.
 *
 * Deploy: `supabase functions deploy comparativo-candidatos` (JWT-ON; SEM
 *   --no-verify-jwt — flag tratada no Plan 10-04 [BLOCKING]).
 *
 * @module supabase/functions/comparativo-candidatos
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAi,
  loadPrompt,
  resolvedPromptFromLoaded,
  type ResolvedPrompt,
} from "../_shared/ai-client.ts";
import { ComparativoBodySchema, ComparativeRankingSchema } from "../_shared/analise-schemas.ts";

// ---------------------------------------------------------------------------
// CORS + response helpers (copiados de cost-alerter / submit-candidatura)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode = "UNAUTHORIZED" | "VALIDATION" | "SERVER_ERROR";

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
// Deps injetáveis (orchestrator-decision #2 — testes injetam mocks; sem rede)
// ---------------------------------------------------------------------------

export interface ComparativoDeps {
  // deno-lint-ignore no-explicit-any
  anthropic: any;
  // deno-lint-ignore no-explicit-any
  openai: any;
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
}

/** Linha allowlist de `analise_candidato_vaga` consumida pelo comparativo. */
interface AnaliseRow {
  candidatura_id: string;
  vaga_id: string;
  score_match: number | null;
  pontos_fortes: string[];
  gaps: string[];
  flags: string[];
  resumo_cv: string | null;
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói os
 * clientes reais a partir do env + do Authorization header e delega para cá.
 */
export async function handler(req: Request, deps: ComparativoDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { anthropic, openai, supabaseAdmin, supabaseUser } = deps;

  // ── 1. Verifica o JWT do RH (two-client D-23 — auth.getUser via anon client) ─
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 2. Parse + valida o body ──────────────────────────────────────────────
  let body: { vaga_id: string; candidatura_ids: string[] };
  try {
    const raw = await req.json();
    const parsed = ComparativoBodySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse("VALIDATION", "Payload do comparativo inválido.");
    }
    body = parsed.data;
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  const ids = body.candidatura_ids;

  // ── 3. Valida 2-10 ids ────────────────────────────────────────────────────
  if (ids.length < 2 || ids.length > 10) {
    return errorResponse(
      "VALIDATION",
      "Selecione de 2 a 10 candidatos para comparar.",
    );
  }

  const start = Date.now();

  try {
    // ── 4. Lê as análises pré-computadas (allowlist explícita — NÃO select('*'),
    //      [[reference_select_star_leaks_pii]]).
    const { data: rowsRaw, error: rowsErr } = await supabaseAdmin
      .from("analise_candidato_vaga")
      .select("candidatura_id, vaga_id, score_match, pontos_fortes, gaps, flags, resumo_cv")
      .in("candidatura_id", ids);
    if (rowsErr) {
      return errorResponse("SERVER_ERROR", "Falha ao carregar as análises.", 500);
    }
    const rows: AnaliseRow[] = (rowsRaw ?? []) as AnaliseRow[];

    // ── 5. Same-vaga + count cross-check (IDOR T-10-09) ─────────────────────
    // Toda análise tem de existir (rows.length === ids.length) E todas têm de
    // pertencer à MESMA vaga (vagas.size === 1). Falha em qualquer um → 400.
    const vagas = new Set(rows.map((r) => r.vaga_id));
    if (vagas.size !== 1 || rows.length !== ids.length) {
      return errorResponse(
        "VALIDATION",
        "Os candidatos pertencem a vagas diferentes (ou alguma análise ainda não existe).",
      );
    }

    // ── 6. Anti-viés de posição: ordena por score_match DESC ANTES do prompt ──
    //      (single-eval V1 — ver doc-comment do módulo; dupla-avaliação → V2).
    const ordered = [...rows].sort(
      (a, b) => (b.score_match ?? -1) - (a.score_match ?? -1),
    );

    // Input COMPACTO: análises pré-computadas (NÃO CVs crus) — teto de tokens.
    const compactInput = ordered
      .map((r, i) => {
        const fortes = (r.pontos_fortes ?? []).join("; ");
        const gaps = (r.gaps ?? []).join("; ");
        return `Candidato C${i + 1} (id=${r.candidatura_id})\n` +
          `- score_match: ${r.score_match ?? "n/d"}\n` +
          `- pontos_fortes: ${fortes}\n` +
          `- gaps: ${gaps}\n` +
          `- resumo_cv: ${(r.resumo_cv ?? "").slice(0, 1000)}`;
      })
      .join("\n\n");

    // ── 7. Resolve o prompt comparative_ranking + callAi (single-eval) ────────
    let resolved: ResolvedPrompt;
    try {
      const loaded = await loadPrompt("comparative_ranking", supabaseAdmin);
      resolved = resolvedPromptFromLoaded(loaded, "comparative_ranking", "gpt-4o-mini");
    } catch {
      resolved = {
        call_type: "comparative_ranking",
        model_id: "claude-sonnet-4-6",
        fallback_model_id: "gpt-4o-mini",
        prompt_version: "0.0.0",
        system_template: "Ranqueie comparativamente os candidatos (comparative_ranking).",
        max_tokens: 2048,
        temperature: 0,
      };
    }

    const result = await callAi(
      {
        prompt: resolved,
        rawInput: compactInput,
        vagaRubricBlock: `Vaga: ${body.vaga_id}`,
        candidato_id: "comparativo",
        vaga_id: body.vaga_id,
        schema: ComparativeRankingSchema,
        // idempotency_key DELIBERADAMENTE ausente — o comparativo SEMPRE roda fresh
        // no V1 (CONTEXT: sem reuso de cache); cada solicitação gera nova auditoria.
      },
      { anthropic, openai, supabase: supabaseAdmin },
    );

    const latencia_ms = Date.now() - start;
    const ranking = result.parsed ?? null;

    // ── 8. Persiste UMA linha de auditoria (RF-09) ────────────────────────────
    await supabaseAdmin.from("comparativo_solicitado").insert({
      vaga_id: body.vaga_id,
      candidatura_ids: ids,
      ranking,
      latencia_ms,
      solicitado_por: user.id,
    });

    // Log redigido (Pitfall 7) — só ids/counts/latência/provider; NUNCA PII/score.
    console.log("[comparativo] ok", {
      vaga_id: body.vaga_id,
      candidatos_count: ids.length,
      latencia_ms,
      provider: result.provider,
    });

    return jsonResponse({ ok: true, ranking, latencia_ms }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[comparativo] erro", { vaga_id: body.vaga_id, error: message });
    return errorResponse("SERVER_ERROR", "Falha ao gerar o comparativo.", 500);
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
      console.error("[comparativo] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    }

    // anon client COM Authorization → auth.getUser() decodifica/verifica o JWT do RH.
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // service_role SÓ para leituras/escritas privilegiadas (Pitfall 10 / D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // SDKs reais só são construídos em produção (NUNCA importados nos testes); os
    // specifiers são montados em runtime para não serem resolvidos no type-check
    // offline (mesmo padrão dos pins comentados em ai-client.ts).
    const { default: Anthropic } = await import(["npm:", "@anthropic-ai/sdk@0.102.0"].join(""));
    const { default: OpenAI } = await import(["npm:", "openai@6.42.0"].join(""));
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    return await handler(req, { anthropic, openai, supabaseAdmin, supabaseUser });
  });
}
