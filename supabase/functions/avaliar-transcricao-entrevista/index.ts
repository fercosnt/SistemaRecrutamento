/**
 * Edge Function: avaliar-transcricao-entrevista
 *
 * Phase 14 / Plan 14-03 — ENTREV-03 / RF-24. Invocada por um RH autenticado
 * (JWT-ON) para analisar a TRANSCRIÇÃO de entrevista colada pelo gestor. EF NOVA e
 * dedicada — clone de `avaliar-redacao-cultural` (untrusted text → callAi → derive
 * → never-absent persist → payload neutro).
 *
 * Arquitetura (two-client D-23 + C1 authenticate-THEN-authorize, lição Phase 10):
 *   Recebe `{ candidatura_id, transcricao }`, verifica o JWT do RH (supabaseUser anon
 *   + Authorization → auth.getUser()), AUTORIZA o papel a partir de `usuarios_rh`
 *   (NÃO dos claims do JWT — silent-403 landmine) + posse da vaga da candidatura
 *   (vagas.created_by === user.id; administrador bypassa), revalida
 *   `len(transcricao) >= 200` server-side, roda o prompt `transcript_analysis`
 *   (Sonnet) via callAi com o `TranscriptAnalysisSchema` (a transcrição é UNTRUSTED
 *   — callAi faz injection-detect + maskPII por dentro), DERIVA a flag de língua/
 *   sotaque DETERMINISTICAMENTE (deriveLanguageAccentFlag — server-authoritative,
 *   NÃO o LLM), e persiste UMA linha em `entrevista_analises` + os scores BARS em
 *   `scores_candidato` (tipo='entrevista').
 *
 * INVARIANTE (RNF-07a): a EF NUNCA escreve `candidaturas`. status_analise=
 *   'pendente_humano' SEMPRE; bloqueio_avanco=true SÓ quando a flag de língua/
 *   sotaque dispara (apenas SEGURA o avanço — o humano sempre decide; o bloqueio é
 *   imposto no avancar_etapa, migration 04). Mesmo na falha (parse nulo / injeção)
 *   persiste uma row pendente_humano com bloqueio_avanco:false — nunca um sucesso
 *   fabricado. O RH recebe um payload NEUTRO (`{ ok:true }`).
 *
 * ── SDK imports ESTÁTICOS `npm:` (clone de avaliar-redacao-cultural:54-60) ──
 *   O `await import(["npm:",pkg].join(""))` escondia o pacote do bundler do deploy
 *   → ERR_MODULE_NOT_FOUND. Imports estáticos + builders zodOutputFormat/
 *   zodResponseFormat INJETADOS em callAi (sem eles callAi cai no no-op `(s)=>s` e
 *   quebra AMBOS os provedores — Pitfall 1/2).
 *
 * Deploy: `supabase functions deploy avaliar-transcricao-entrevista` (JWT-ON;
 *   RH-invoked; tratado no Plan 14-04 [BLOCKING]). NÃO deployado aqui.
 *
 * @module supabase/functions/avaliar-transcricao-entrevista
 * @see supabase/functions/avaliar-redacao-cultural/index.ts (analog mais próximo)
 * @see supabase/functions/avaliar-transcricao-entrevista/_local/derive-flags.ts (a flag server-derivada)
 * @see supabase/functions/comparativo-candidatos/index.ts (RH-authorize + two-client wiring)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAi,
  loadPrompt,
  resolvedPromptFromLoaded,
  type ResolvedPrompt,
} from "../_shared/ai-client.ts";
import { AvaliarTranscricaoBodySchema } from "../_shared/entrevista-schemas.ts";
import { TranscriptAnalysisSchema } from "../_shared/interview-output-schemas.ts";
import {
  deriveLanguageAccentFlag,
  type TranscriptAnalysisSlice,
} from "./_local/derive-flags.ts";
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

/** Comprimento mínimo da transcrição (server-authoritative — mirror do word-count guard). */
const MIN_TRANSCRICAO_LEN = 200;

// ---------------------------------------------------------------------------
// Deps injetáveis (testes injetam mocks; produção constrói clientes reais)
// ---------------------------------------------------------------------------

export interface AvaliarTranscricaoDeps {
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

/** Extrai os scores BARS por competência do output parseado (para o metadata). */
function extractCompetencias(
  parsed: { competency_evaluations?: Array<{ competency?: string; score?: unknown }> },
): Array<{ competency: string; score: unknown }> {
  return (parsed.competency_evaluations ?? [])
    .filter((c) => !!c.competency)
    .map((c) => ({ competency: c.competency as string, score: c.score }));
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói os
 * clientes reais a partir do env + do Authorization header e delega para cá.
 */
export async function handler(req: Request, deps: AvaliarTranscricaoDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { anthropic, openai, supabaseAdmin, supabaseUser } = deps;

  // ── 1. Verifica o JWT do RH (two-client D-23 — auth.getUser via anon client) ─
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 1b. AUTORIZA (C1): role de usuarios_rh (NÃO dos claims — silent-403 landmine).
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
  let body: { candidatura_id: string; transcricao: string };
  try {
    const raw = await req.json();
    const parsed = AvaliarTranscricaoBodySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse("VALIDATION", "Payload da transcrição inválido.");
    }
    body = parsed.data;
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  // ── 3. Guard de comprimento server-side (mirror do word-count da redação). ──
  if (body.transcricao.trim().length < MIN_TRANSCRICAO_LEN) {
    return errorResponse("VALIDATION", "A transcrição é muito curta para análise.", 400);
  }

  try {
    // ── 4. Resolve a vaga da candidatura + posse (C1 — IDOR/PII). role='rh' DEVE
    //      possuir a vaga (vagas.created_by===user.id); administrador bypassa.
    const { data: candRow } = await supabaseAdmin
      .from("candidaturas")
      .select("id, vaga_id, candidato_id")
      .eq("id", body.candidatura_id)
      .maybeSingle();
    if (!candRow) {
      return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }
    if (role === "rh") {
      const { data: vagaRow } = await supabaseAdmin
        .from("vagas")
        .select("created_by")
        .eq("id", candRow.vaga_id)
        .maybeSingle();
      if (!vagaRow || vagaRow.created_by !== user.id) {
        return errorResponse("FORBIDDEN", "Acesso negado.", 403);
      }
    }

    // ── 5. Resolve o prompt transcript_analysis + callAi (transcrição UNTRUSTED) ─
    let resolved: ResolvedPrompt;
    try {
      const loaded = await loadPrompt("transcript_analysis", supabaseAdmin);
      resolved = resolvedPromptFromLoaded(loaded, "transcript_analysis", "gpt-4o-mini");
    } catch {
      resolved = {
        call_type: "transcript_analysis",
        model_id: "claude-sonnet-4-6",
        fallback_model_id: "gpt-4o-mini",
        prompt_version: "0.0.0",
        system_template: "Analise a transcrição de entrevista (transcript_analysis).",
        max_tokens: 4000,
        temperature: 0,
      };
    }

    const result = await callAi(
      {
        prompt: resolved,
        // Transcrição UNTRUSTED — callAi mascara PII + detecta injeção por dentro.
        rawInput: body.transcricao,
        vagaRubricBlock: `Vaga: ${candRow.vaga_id}`,
        candidato_id: candRow.candidato_id,
        vaga_id: candRow.vaga_id,
        schema: TranscriptAnalysisSchema,
        idempotency_key: `${body.candidatura_id}:transcript`,
      },
      {
        anthropic,
        openai,
        supabase: supabaseAdmin,
        zodOutputFormat: deps.zodOutputFormat,
        zodResponseFormat: deps.zodResponseFormat,
      },
    );

    const parsed = result.parsed as
      | (TranscriptAnalysisSlice & { competency_evaluations?: Array<{ competency?: string; score?: unknown }> })
      | null;

    // ── 6. Never-absent: parse falho / injeção → persiste row pendente_humano com
    //      bloqueio_avanco:false (nunca um sucesso fabricado). Sem scores_candidato
    //      (não há análise para gravar), mas a row de análise SEMPRE entra.
    if (parsed == null || result.error_code === "prompt_injection_detected") {
      await supabaseAdmin.from("entrevista_analises").insert({
        candidatura_id: body.candidatura_id,
        competencias: null,
        citacoes: null,
        bias_flags: null,
        bloqueio_avanco: false,
        status_analise: "pendente_humano",
        prompt_version: resolved.prompt_version,
      });
      console.log("[avaliar-transcricao-entrevista] sem-output/injecao", {
        candidatura_id: body.candidatura_id,
        error_code: result.error_code ?? "ia_sem_resultado",
      });
      return jsonResponse({ ok: true }, 200);
    }

    // ── 7. Flag de língua/sotaque DERIVADA server-side (NÃO o LLM — resolved Q2).
    //      bloqueio_avanco = derived.flag (SEGURA o avanço; o bloqueio real é imposto
    //      no avancar_etapa, migration 04).
    const derived = deriveLanguageAccentFlag(parsed);

    // ── 8. Persiste UMA linha de análise + os scores BARS em scores_candidato.
    //      status_analise='pendente_humano' SEMPRE (RNF-07a). NUNCA toca candidaturas.
    const competencias = extractCompetencias(parsed);
    const citacoes = (parsed.competency_evaluations ?? []).map((c) => ({
      competency: (c as { competency?: string }).competency,
      cited_evidence: (c as { cited_evidence?: unknown }).cited_evidence,
    }));
    const biasFlags = (parsed.competency_evaluations ?? []).map((c) => ({
      competency: (c as { competency?: string }).competency,
      bias_flags: (c as { bias_flags?: unknown }).bias_flags,
    }));

    await supabaseAdmin.from("entrevista_analises").insert({
      candidatura_id: body.candidatura_id,
      competencias,
      citacoes,
      bias_flags: biasFlags,
      bloqueio_avanco: derived.flag, // SEGURA o avanço — nunca auto-reject (RNF-07a)
      status_analise: "pendente_humano",
      prompt_version: resolved.prompt_version,
    });

    await supabaseAdmin.from("scores_candidato").upsert(
      {
        candidatura_id: body.candidatura_id,
        tipo: "entrevista",
        subtipo: null,
        score: null,
        score_max: null,
        status: "pendente_humano", // RNF-07a — SEMPRE revisão humana
        metadata: {
          competencias,
          recommendation: (parsed as { recommendation?: unknown }).recommendation ?? null,
          bloqueio_avanco: derived.flag,
          blocked_competencies: derived.blockedCompetencies,
        },
      },
      { onConflict: "candidatura_id,tipo,subtipo,pergunta_id" },
    );

    // Log redigido (LGPD-02 / Pitfall 7) — só ids/counts/flag; NUNCA transcrição/score/nome.
    console.log("[avaliar-transcricao-entrevista] ok", {
      candidatura_id: body.candidatura_id,
      competencias_count: competencias.length,
      bloqueio: derived.flag,
      blocked_count: derived.blockedCompetencies.length,
      provider: result.provider,
    });

    // Payload NEUTRO (RH-facing).
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[avaliar-transcricao-entrevista] erro", {
      candidatura_id: body.candidatura_id,
      error: message,
    });
    return errorResponse("SERVER_ERROR", "Falha ao avaliar a transcrição.", 500);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // CORS preflight ANTES de qualquer checagem de auth.
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[avaliar-transcricao-entrevista] Faltam variáveis de ambiente");
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
      zodOutputFormat: (s, _n) => zodOutputFormat(s as never),
      zodResponseFormat: (s, n) => zodResponseFormat(s as never, n),
    });
  });
}
