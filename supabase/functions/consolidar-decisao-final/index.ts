/**
 * Edge Function: consolidar-decisao-final
 *
 * Phase 15 / Plan 15-02 — DECISAO-01. Invocada por um RH autenticado.
 *
 * Arquitetura (RESEARCH §Consolidation Aggregation — two-client D-23, JWT verify ON):
 *   Recebe `{ candidatura_id, vaga_id }`, verifica o JWT do RH (supabaseUser anon +
 *   Authorization → auth.getUser()), AUTORIZA (role from `usuarios_rh` + posse da
 *   vaga via `vagas.created_by`; administrador bypassa), então AGREGA (read-only) os
 *   scores por etapa JÁ GRAVADOS num único número consolidado ponderado.
 *
 *   DETERMINÍSTICA — NÃO faz NENHUMA chamada LLM. NUNCA re-pontua (lê
 *   `scores_candidato`/`analise_candidato_vaga`, nunca invoca uma EF de avaliação) e
 *   NUNCA auto-decide (RNF-07a) — o consolidado é advisory, o RH decide.
 *
 * ── O mapa load-bearing (RESEARCH §Consolidation Aggregation, VERIFIED) ──
 *   As 4 chaves de peso e as fontes de score NÃO casam 1:1 e as escalas diferem:
 *     • 'triagem'          ← analise_candidato_vaga.score_match   (0..100 já)
 *     • 'work_sample_sjt'  ← scores_candidato tipo='sjt'          (score/score_max*100)
 *     • 'redacao_cultural' ← scores_candidato tipo='redacao'      (score/score_max(25)*100)
 *     • 'entrevista'       ← scores_candidato tipo='entrevista'   (N/A unless status='sucesso' — Open Q1)
 *     • big_five/cognitivo ← scores_candidato                     (CONTEXT-ONLY, never weighted)
 *   PRESENT só quando status='sucesso'; senão N/A. Normaliza cada etapa para 0..100,
 *   renormaliza os pesos sobre as etapas PRESENTES (effective_weight[k] =
 *   weight[k] / Σ(weight[present])), e emite uma recomendação templada DETERMINÍSTICA.
 *
 * Two-client (D-23): supabaseUser (anon + Authorization) SÓ para auth.getUser();
 *   supabaseAdmin (service_role) SÓ para leituras privilegiadas. NUNCA service_role
 *   para auth.getUser() (sem contexto auth.uid()).
 *
 * Segurança (T-15-03 IDOR/PII): autenticar NÃO basta. Os scores são lidos via
 *   service_role (bypassa RLS), então a EF DEVE verificar papel + posse ANTES de
 *   tocar os dados (clone de comparativo-candidatos :114-190).
 *   [[reference_ef_authenticate_vs_authorize]] — Phase-10 C1 crítico.
 *
 * Deploy: `supabase functions deploy consolidar-decisao-final` (JWT-ON; SEM
 *   --no-verify-jwt — o orchestrator deploya no Plan 15-06 [BLOCKING]).
 *   AUTHORED-NOT-APPLIED: NÃO deployado aqui.
 *
 * @module supabase/functions/consolidar-decisao-final
 * @see supabase/functions/comparativo-candidatos/index.ts (auth skeleton clonado; SEM chamada de IA)
 * @see src/features/decisao/schemas/consolidacaoSchema.ts (a mesma forma .strict() do body)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// SDKs/AI helpers DELIBERADAMENTE ausentes — esta EF é DETERMINÍSTICA (sem LLM).
// Import ESTÁTICO `npm:zod` (precedente _shared/analise-schemas.ts) — NUNCA o
// `["npm:",pkg].join("")` bug (ERR_MODULE_NOT_FOUND no runtime do EF).
import { z } from "npm:zod@3.25.76/v4";

// ---------------------------------------------------------------------------
// CORS + response helpers (copiados verbatim de comparativo-candidatos :56-73)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR";

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
// Request body schema (.strict() — a MESMA forma que o client constrói; mantida em
// src/features/decisao/schemas/consolidacaoSchema.ts como fonte compartilhada do
// contrato — re-declarada aqui porque src/ NÃO é deployado no bundle do EF).
// [[feedback_integration_contract_gap]] — o contract test (15-01) prova que casam.
//
// A propriedade load-bearing é o `.strict()` (anti-tamper: rejeita chave
// desconhecida / `score` injetado — RNF-07a). O formato UUID é validado pelo schema
// COMPARTILHADO do client ANTES do invoke (consolidacaoSchema.ts usa z.string().uuid());
// aqui usamos z.string() para não acoplar o runtime do EF ao formato exato dos ids
// (o roteamento do Supabase + o client já garantem ids válidos).
// ---------------------------------------------------------------------------

const ConsolidacaoRequestSchema = z
  .object({
    candidatura_id: z.string(),
    vaga_id: z.string(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Aggregation domain (RESEARCH §Consolidation Aggregation steps 1-7)
// ---------------------------------------------------------------------------

/** Mapa chave-de-peso → tipo de score em scores_candidato (triagem é a exceção). */
const WEIGHTED_KEYS = ["triagem", "work_sample_sjt", "redacao_cultural", "entrevista"] as const;
const CONTEXT_KEYS = ["big_five", "cognitivo"] as const;
type WeightKey = (typeof WEIGHTED_KEYS)[number];

/** scores_candidato.tipo correspondente a cada chave ponderada (triagem fora — lê outra tabela). */
const TIPO_BY_KEY: Record<Exclude<WeightKey, "triagem">, string> = {
  work_sample_sjt: "sjt",
  redacao_cultural: "redacao",
  entrevista: "entrevista",
};

interface BreakdownRow {
  etapa: string;
  /** 0..100 quando present; null quando N/A ou context. */
  normalized: number | null;
  /** present | na | context. */
  status: "present" | "na" | "context";
  /** peso bruto da vaga (chaves ponderadas); null para context. */
  weight: number | null;
  /** peso renormalizado sobre as etapas present; null caso contrário. */
  effective_weight: number | null;
}

interface ScoreRow {
  id: string;
  candidatura_id: string;
  tipo: string;
  subtipo: string | null;
  score: number | null;
  score_max: number | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
}

/** Normaliza o score bruto de uma etapa ponderada para 0..100 (apenas status='sucesso'). */
function normalizeWeighted(
  key: WeightKey,
  analise: { score_match: number | null; status: string | null } | null,
  scoreRow: ScoreRow | undefined,
): number | null {
  if (key === "triagem") {
    // triagem ← analise_candidato_vaga.score_match (0..100 já). PRESENT só se status='sucesso'.
    if (!analise || analise.status !== "sucesso" || analise.score_match == null) return null;
    return analise.score_match;
  }
  // sjt / redacao / entrevista ← scores_candidato. PRESENT só se status='sucesso'.
  if (!scoreRow || scoreRow.status !== "sucesso") return null;
  if (key === "entrevista") {
    // entrevista: score só existe após confirmação humana (status='sucesso'). Open Q1 —
    // pendente_humano → N/A (NUNCA pondera um score de IA não confirmado, RNF-07a).
    if (scoreRow.score == null || scoreRow.score_max == null || scoreRow.score_max === 0) {
      return null;
    }
    return (scoreRow.score / scoreRow.score_max) * 100;
  }
  // sjt + redacao: score/score_max*100 (redacao score_max=25; sjt-MC max varia por vaga).
  if (scoreRow.score == null || scoreRow.score_max == null || scoreRow.score_max === 0) return null;
  return (scoreRow.score / scoreRow.score_max) * 100;
}

/** Recomendação DETERMINÍSTICA/templada (NUNCA LLM) keyed no consolidado + N/A + pendências. */
function buildRecommendation(
  consolidated: number | null,
  naKeys: string[],
  pendenteHuman: boolean,
): string {
  const parts: string[] = [];

  if (consolidated == null) {
    parts.push("Nenhuma etapa avaliável concluída — sem agregado disponível.");
  } else if (consolidated >= 75) {
    parts.push("Forte aderência nas etapas avaliadas.");
  } else if (consolidated >= 50) {
    parts.push("Aderência moderada nas etapas avaliadas.");
  } else {
    parts.push("Aderência baixa nas etapas avaliadas.");
  }

  if (pendenteHuman) {
    parts.push("Revisão humana pendente em entrevista.");
  }
  if (naKeys.length > 0) {
    parts.push(`Etapas não avaliadas: ${naKeys.join(", ")} (não ponderadas).`);
  }

  // Guardrail RNF-07a/LGPD-02 — o consolidado é advisory; a decisão é sempre humana.
  parts.push("Sugestão advisory — a decisão final é sempre humana (RNF-07a).");
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Deps injetáveis (testes injetam mocks; sem rede) — espelha comparativo :79-91
// ---------------------------------------------------------------------------

export interface ConsolidacaoDeps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói os
 * clientes reais a partir do env + do Authorization header e delega para cá.
 */
export async function handler(req: Request, deps: ConsolidacaoDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { supabaseAdmin, supabaseUser } = deps;

  // ── 1. Verifica o JWT do RH (two-client D-23 — auth.getUser via anon client) ─
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 1b. AUTORIZAÇÃO (T-15-03 — IDOR/PII): autenticar NÃO basta. Os scores são
  //      lidos via service_role (bypassa RLS), então a EF DEVE verificar o papel +
  //      posse ANTES de tocar os dados. role NÃO vem de getUser().app_metadata (o
  //      getUser reflete raw_app_meta_data SEM role); fonte de verdade = usuarios_rh
  //      (mesma derivação do custom_access_token_hook: recrutador→rh, admin→admin).
  //      [[reference_ef_authenticate_vs_authorize]] — Phase-10 C1 crítico.
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

  // ── 2. Parse + valida o body (.strict() — rejeita chave desconhecida/score injetado) ─
  let body: { candidatura_id: string; vaga_id: string };
  try {
    const raw = await req.json();
    const parsed = ConsolidacaoRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse("VALIDATION", "Payload da consolidação inválido.");
    }
    body = parsed.data;
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  try {
    // ── 3. Posse da vaga + pesos (C1 — role='rh' DEVE ser dono; administrador bypassa).
    //      A mesma leitura de vagas traz created_by (posse) E pesos_avaliacao (pesos).
    const { data: vagaRow, error: vagaErr } = await supabaseAdmin
      .from("vagas")
      .select("created_by, pesos_avaliacao")
      .eq("id", body.vaga_id)
      .maybeSingle();
    if (vagaErr) {
      return errorResponse("SERVER_ERROR", "Falha ao verificar a vaga.", 500);
    }
    if (!vagaRow) {
      return errorResponse("NOT_FOUND", "Vaga não encontrada.", 404);
    }
    if (role === "rh" && vagaRow.created_by !== user.id) {
      return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }

    const pesos = (vagaRow.pesos_avaliacao ?? {}) as Record<string, number>;

    // ── 4. Leituras privilegiadas (allowlist explícita de colunas — NUNCA o
    //      wildcard, [[reference_select_star_leaks_pii]]).
    // triagem ← analise_candidato_vaga.score_match (0..100 já).
    const { data: analise } = await supabaseAdmin
      .from("analise_candidato_vaga")
      .select("candidatura_id, score_match, status")
      .eq("candidatura_id", body.candidatura_id)
      .maybeSingle();
    // sjt/redacao/entrevista/big_five/cognitivo ← scores_candidato (allowlist).
    const { data: scoresRaw } = await supabaseAdmin
      .from("scores_candidato")
      .select("id, candidatura_id, tipo, subtipo, score, score_max, status, metadata")
      .eq("candidatura_id", body.candidatura_id);
    const scores: ScoreRow[] = (scoresRaw ?? []) as ScoreRow[];

    // ── 5. Agregação (RESEARCH steps 1-7) ─────────────────────────────────────
    const analiseTriagem = analise
      ? { score_match: analise.score_match ?? null, status: analise.status ?? null }
      : null;
    const scoreByTipo = new Map<string, ScoreRow>();
    for (const s of scores) {
      // primeira ocorrência por tipo (uma row por etapa no caminho feliz).
      if (!scoreByTipo.has(s.tipo)) scoreByTipo.set(s.tipo, s);
    }

    // Etapas ponderadas: normaliza + marca present/na.
    const weightedRows: BreakdownRow[] = WEIGHTED_KEYS.map((key) => {
      const scoreRow = key === "triagem" ? undefined : scoreByTipo.get(TIPO_BY_KEY[key as Exclude<WeightKey, "triagem">]);
      const normalized = normalizeWeighted(key, analiseTriagem, scoreRow);
      const present = normalized != null;
      return {
        etapa: key,
        normalized: present ? Math.round(normalized! * 100) / 100 : null,
        status: present ? "present" : "na",
        weight: pesos[key] ?? null,
        effective_weight: null, // preenchido após a renormalização
      } as BreakdownRow;
    });

    // Renormaliza os pesos sobre as etapas PRESENT (effective_weight = w / Σ present).
    const presentRows = weightedRows.filter((r) => r.status === "present");
    const sumPresentWeight = presentRows.reduce((acc, r) => acc + (r.weight ?? 0), 0);
    let consolidated: number | null = null;
    if (presentRows.length > 0 && sumPresentWeight > 0) {
      let agg = 0;
      for (const r of presentRows) {
        const eff = (r.weight ?? 0) / sumPresentWeight;
        r.effective_weight = eff;
        agg += (r.normalized ?? 0) * eff;
      }
      consolidated = Math.round(agg * 100) / 100;
    }

    // Etapas de contexto (big_five/cognitivo): sem peso, contribuem 0.
    const contextRows: BreakdownRow[] = CONTEXT_KEYS.map((key) => ({
      etapa: key,
      normalized: null,
      status: "context",
      weight: null,
      effective_weight: null,
    }));

    const breakdown: BreakdownRow[] = [...weightedRows, ...contextRows];

    // ── 6. Recomendação DETERMINÍSTICA (NUNCA LLM) ────────────────────────────
    const naKeys = weightedRows.filter((r) => r.status === "na").map((r) => r.etapa);
    const entrevistaRow = scoreByTipo.get("entrevista");
    const pendenteHuman = !!entrevistaRow && entrevistaRow.status === "pendente_humano";
    const recommendation = buildRecommendation(consolidated, naKeys, pendenteHuman);

    // Log redigido (T-15-07) — só ids/counts; NUNCA scores/justificativa/PII.
    console.log("[consolidacao] ok", {
      candidatura_id: body.candidatura_id,
      vaga_id: body.vaga_id,
      present_count: presentRows.length,
      na_count: naKeys.length,
      consolidated_present: consolidated != null,
    });

    return jsonResponse({ consolidated, breakdown, recommendation }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[consolidacao] erro", { vaga_id: body.vaga_id, error: message });
    return errorResponse("SERVER_ERROR", "Falha ao consolidar a decisão.", 500);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // CORS preflight ANTES de qualquer checagem de auth (o browser manda OPTIONS SEM
    // Authorization; sem este short-circuit o guard abaixo devolvia 401 no preflight).
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[consolidacao] Faltam variáveis de ambiente");
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
    // service_role SÓ para leituras privilegiadas (D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
