/**
 * Edge Function: analise-candidato-individual
 *
 * Phase 10 / Plan 10-03 — TRIAGEM-01. Sink do trigger pg_net pós-knockout.
 *
 * Arquitetura (CONTEXT §Análise Individual por IA — trigger → pg_net → EF):
 *   O trigger `notify_analise_candidato` no INSERT de candidatura (migration 10-02)
 *   dispara `net.http_post` para esta EF com um Vault Bearer — SEM JWT de usuário.
 *   A EF é deployada com `--no-verify-jwt` (server-interno; deploy é job do 10-04),
 *   então ela MESMA autentica o Bearer contra o service_role (cost-alerter precedent).
 *
 * Fluxo (try/catch envolve TODA a análise — invariante never-absent):
 *   1. Self-auth do Vault Bearer (Bearer ausente/divergente → 401 UNAUTHORIZED).
 *   2. Parse + valida o body { candidatura_id, vaga_id }.
 *   3. Lê a candidatura (allowlist explícita — NÃO select('*')) + respostas Etapa 1
 *      + rubrica da vaga.
 *   4. Baixa o PDF do CV do bucket privado `curriculos` (service_role) e extrai o
 *      texto via `unpdf` (npm:, dinâmico) — truncado a um teto de tokens (DoS/custo).
 *      Falha de extração (PDF corrompido/imagem) → segue só com respostas + flag
 *      'cv_nao_extraido', NUNCA quebra a row.
 *   5. loadPrompt('cv_job_match') → callAi (callAi já faz injection/maskPII/retry/
 *      fallback/cost/log — NÃO re-implementamos NADA disso aqui).
 *   6. Mapeia as chaves INGLESAS do CvJobMatch → colunas pt-BR e UPSERTa UMA row em
 *      `analise_candidato_vaga` ON CONFLICT (candidatura_id) (status='sucesso').
 *   7. QUALQUER throw → UPSERTa { status:'falhou', erro } (never-absent invariant).
 *
 * Segurança (Pitfall 7 / T-10-08/11/12): self-auth do Bearer; logs só com
 *   ids/counts/error.code — NUNCA texto de CV/respostas/score/nome; o texto do
 *   candidato (CV + respostas) é UNTRUSTED e passa por callAi (detectPromptInjection
 *   + maskPII por dentro) — nunca contornamos isso; teto de tokens no CV.
 *
 * Deploy: `supabase functions deploy analise-candidato-individual --no-verify-jwt`
 *   (Plan 10-04 — blocking human checkpoint; NÃO deployado aqui).
 *
 * @module supabase/functions/analise-candidato-individual
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAi,
  loadPrompt,
  resolvedPromptFromLoaded,
  type ResolvedPrompt,
} from "../_shared/ai-client.ts";
import { AnaliseBodySchema, CvJobMatchSchema } from "../_shared/analise-schemas.ts";

// ---------------------------------------------------------------------------
// CORS + response helpers (copiados de cost-alerter)
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
// Token budget para o texto do CV (cap input tokens — T-10-12 DoS/custo)
// ---------------------------------------------------------------------------

/** Teto de caracteres do CV antes do prompt (~1 token ≈ 4 chars; ~3k tokens). */
const CV_CHAR_BUDGET = 12_000;
/** Teto de caracteres do bloco de respostas (Etapa 1 é curta; folga ampla). */
const RESPOSTAS_CHAR_BUDGET = 8_000;

/**
 * Extrai o texto do PDF do CV via `unpdf` (import dinâmico — só resolve no runtime
 * Deno do EF; mantém o módulo carregável offline nos testes). Trunca ao budget.
 * Retorna null em QUALQUER falha (PDF corrompido/imagem/parser indisponível) — o
 * chamador então segue só com respostas + flag 'cv_nao_extraido'.
 */
async function extractCvText(pdfBytes: Uint8Array): Promise<string | null> {
  try {
    // Specifier construído em runtime (não-literal) para que o `npm:` só resolva
    // no runtime Deno do EF — o type-check dos testes (sem rede) não o alcança,
    // mesmo padrão dos SDKs pinados em ai-client.ts.
    const unpdfSpecifier = ["npm:", "unpdf@0.11.0"].join("");
    const { extractText, getDocumentProxy } = await import(unpdfSpecifier);
    const pdf = await getDocumentProxy(pdfBytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    const trimmed = joined.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, CV_CHAR_BUDGET);
  } catch {
    return null;
  }
}

/** Achata as respostas da Etapa 1 num bloco de texto compacto, truncado. */
function buildRespostasBlock(respostas: Array<Record<string, unknown>>): string {
  const lines = respostas.map((r) => {
    const texto = r.resposta_texto ?? r.resposta_numerica ?? r.resposta_opcoes ?? "";
    return `- ${String(texto)}`;
  });
  return lines.join("\n").slice(0, RESPOSTAS_CHAR_BUDGET);
}

// ---------------------------------------------------------------------------
// Deps injetáveis (orchestrator-decision #2 — testes injetam mocks; sem rede)
// ---------------------------------------------------------------------------

export interface AnaliseDeps {
  // deno-lint-ignore no-explicit-any
  anthropic: any;
  // deno-lint-ignore no-explicit-any
  openai: any;
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  /** Segredo esperado no Bearer (== service_role JWT em produção). */
  serviceKey: string;
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói os
 * clientes reais a partir do env e delega para cá.
 */
export async function handler(req: Request, deps: AnaliseDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  // ── 1. Self-auth do Vault Bearer (T-10-08) ────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!bearer || bearer !== deps.serviceKey) {
    console.warn("[analise] Rejeitado: Bearer ausente/inválido");
    return errorResponse("UNAUTHORIZED", "Não autorizado.", 401);
  }

  // ── 2. Parse + valida o body ──────────────────────────────────────────────
  let body: { candidatura_id: string; vaga_id: string };
  try {
    const raw = await req.json();
    const parsed = AnaliseBodySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse("VALIDATION", "Payload de análise inválido.");
    }
    body = parsed.data;
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  const { candidatura_id, vaga_id } = body;
  const { anthropic, openai, supabaseAdmin } = deps;

  // ── 3-6. Toda a análise envolta em try/catch (never-absent invariant) ─────
  try {
    // 3a. Candidatura — allowlist explícita de colunas (NÃO select('*'),
    //     [[reference_select_star_leaks_pii]]).
    const { data: cand } = await supabaseAdmin
      .from("candidaturas")
      .select("id, vaga_id, candidato_id, curriculo_url, curriculo_nome_original, status")
      .eq("id", candidatura_id)
      .maybeSingle();

    // 3b. Respostas da Etapa 1.
    const respostasRes = await supabaseAdmin
      .from("respostas_formulario")
      .select("pergunta_id, resposta_texto, resposta_numerica, resposta_opcoes")
      .eq("candidatura_id", candidatura_id);
    const respostas: Array<Record<string, unknown>> = respostasRes?.data ?? [];

    // 3c. Rubrica da vaga (allowlist) — alimenta o vagaRubricBlock do prompt.
    const { data: vaga } = await supabaseAdmin
      .from("vagas")
      .select("id, titulo, descricao, requisitos")
      .eq("id", vaga_id)
      .maybeSingle();

    const flags: string[] = [];

    // 4. Download + extração do CV (service_role) — falha → respostas-only.
    let cvText = "";
    let resumoCvFallback = false;
    const curriculoPath = cand?.curriculo_url as string | undefined;
    if (curriculoPath) {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from("curriculos")
        .download(curriculoPath);
      if (dlErr || !blob) {
        flags.push("cv_nao_extraido");
        resumoCvFallback = true;
      } else {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const extracted = await extractCvText(bytes);
        if (extracted === null) {
          flags.push("cv_nao_extraido");
          resumoCvFallback = true;
        } else {
          cvText = extracted;
        }
      }
    } else {
      flags.push("cv_nao_extraido");
      resumoCvFallback = true;
    }

    // 5. Resolve o prompt cv_job_match. loadPrompt lê o DB (active/canary); se a
    //    leitura falhar (ex.: ambiente de teste sem prompt seedado), cai num
    //    ResolvedPrompt mínimo para não quebrar o caminho de sucesso — callAi
    //    ainda é a ÚNICA dona de retry/cache/log.
    let resolved: ResolvedPrompt;
    try {
      const loaded = await loadPrompt("cv_job_match", supabaseAdmin);
      resolved = resolvedPromptFromLoaded(loaded, "cv_job_match", "gpt-4o-mini");
    } catch {
      resolved = {
        call_type: "cv_job_match",
        model_id: "claude-sonnet-4-6",
        fallback_model_id: "gpt-4o-mini",
        prompt_version: "0.0.0",
        system_template: "Avalie o fit do candidato com a vaga (cv_job_match).",
        max_tokens: 2048,
        temperature: 0,
      };
    }

    const vagaRubricBlock = vaga
      ? `Vaga: ${vaga.titulo ?? ""}\n${vaga.descricao ?? ""}\nRequisitos: ${vaga.requisitos ?? ""}`
      : "";
    const respostasBlock = buildRespostasBlock(respostas);
    // Input UNTRUSTED (CV + respostas do candidato) — callAi mascara + detecta
    // injeção por dentro; NUNCA contornamos isso.
    const rawInput = `## CV\n${cvText || "(texto do CV não disponível)"}\n\n## Respostas Etapa 1\n${respostasBlock}`;

    // Idempotência: NÃO delegamos ao replay de callAi aqui — o guard de idempotência
    // desta análise é a UNIQUE(candidatura_id) + UPSERT ON CONFLICT abaixo, que
    // SOBRESCREVE a última análise (um reprocess deve gerar análise FRESCA, não
    // replay stale — Pitfall 8). Passar idempotency_key faria o callAi devolver a
    // chamada anterior de ai_call_logs e congelaria o resultado; a dedup de custo
    // do trigger já é coberta pelo próprio UNIQUE da análise.
    const result = await callAi(
      {
        prompt: resolved,
        rawInput,
        vagaRubricBlock,
        candidato_id: (cand?.candidato_id as string) ?? "",
        vaga_id,
        schema: CvJobMatchSchema,
      },
      { anthropic, openai, supabase: supabaseAdmin },
    );

    // Se callAi não produziu output válido (Anthropic esgotou retries E o fallback
    // OpenAI também não retornou parsed), trata como falha → cai no catch e
    // persiste a row 'falhou' (never-absent invariant). Sem isso, um provedor
    // totalmente indisponível gravaria uma análise 'sucesso' vazia.
    if (result.parsed == null) {
      throw new Error(result.error_code ?? "ia_sem_resultado");
    }

    // 6. Mapeia chaves INGLESAS → colunas pt-BR.
    const parsed = (result.parsed ?? {}) as {
      match_score?: number;
      strengths?: Array<{ competency?: string }>;
      gaps?: Array<{ requirement?: string }>;
      reasoning?: string;
    };
    const pontosFortes = (parsed.strengths ?? [])
      .map((s) => s.competency)
      .filter((c): c is string => typeof c === "string");
    const gapsList = (parsed.gaps ?? [])
      .map((g) => g.requirement)
      .filter((r): r is string => typeof r === "string");

    await supabaseAdmin.from("analise_candidato_vaga").upsert(
      {
        candidatura_id,
        vaga_id,
        score_match: typeof parsed.match_score === "number" ? parsed.match_score : null,
        pontos_fortes: pontosFortes,
        gaps: gapsList,
        flags,
        resumo_cv: resumoCvFallback ? "CV não pôde ser extraído — análise baseada nas respostas." : cvText.slice(0, 2000),
        resumo_respostas: parsed.reasoning ?? null,
        status: "sucesso",
        erro: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "candidatura_id" },
    );

    // Log redigido (Pitfall 7) — só ids/counts/flags-shape; NUNCA texto/score/nome.
    console.log("[analise] ok", {
      candidatura_id,
      vaga_id,
      respostas_count: respostas.length,
      cv_extraido: !resumoCvFallback,
      provider: result.provider,
    });

    return jsonResponse({ ok: true, status: "sucesso" }, 200);
  } catch (e) {
    // 7. Never-absent invariant: persiste a row 'falhou' mesmo em qualquer erro.
    const message = e instanceof Error ? e.message : String(e);
    console.error("[analise] falhou", { candidatura_id, vaga_id, error: message });
    try {
      await supabaseAdmin.from("analise_candidato_vaga").upsert(
        {
          candidatura_id,
          vaga_id,
          status: "falhou",
          erro: message,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "candidatura_id" },
      );
    } catch (upsertErr) {
      // Se até o upsert de falha falhar, loga e devolve 500 — não há mais o que fazer.
      console.error("[analise] upsert da row 'falhou' também falhou", {
        candidatura_id,
        error: upsertErr instanceof Error ? upsertErr.message : String(upsertErr),
      });
    }
    return jsonResponse({ ok: false, status: "falhou" }, 200);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (constrói os clientes reais a partir do env)
// ---------------------------------------------------------------------------

// `import.meta.main` é true só quando o EF é o entrypoint (produção/deploy) e
// false quando o módulo é importado pelo teste (que injeta deps em `handler`),
// evitando que `Deno.serve` tente abrir uma porta durante `deno test`.
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error("[analise] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    // Override opcional do segredo para rotação sem trocar a service_role key.
    const expectedSecret = Deno.env.get("ANALISE_SECRET") ?? SERVICE_KEY;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // SDKs reais só são construídos em produção (NUNCA importados nos testes). Os
    // specifiers são montados em runtime para que o `npm:` não seja resolvido no
    // type-check offline dos testes (mesmo padrão dos pins comentados em ai-client.ts).
    const { default: Anthropic } = await import(["npm:", "@anthropic-ai/sdk@0.102.0"].join(""));
    const { default: OpenAI } = await import(["npm:", "openai@6.42.0"].join(""));
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    return await handler(req, {
      anthropic,
      openai,
      supabaseAdmin,
      serviceKey: expectedSecret,
    });
  });
}
