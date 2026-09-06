/**
 * Edge Function: avaliar-redacao-cultural
 *
 * Phase 13 / Plan 13-02 — AVAL-06 / RF-R-10..20. Invocada pelo CANDIDATO autenticado
 * (JWT-ON) para pontuar a REDAÇÃO de fit cultural. EF NOVA e dedicada — NÃO toca a
 * `avaliar-redacao` (SJT caso-aberto, Phase 11), que segue intacta.
 *
 * Arquitetura (two-client D-23 + C1 authenticate-THEN-authorize, lição Phase 10):
 *   Recebe `{ candidatura_id, pergunta_id, texto }`, verifica o JWT do candidato
 *   (supabaseUser anon + Authorization → auth.getUser()), AUTORIZA que auth.uid() é
 *   dono da candidatura (resolvido via candidatos.user_id=auth.uid()) E
 *   etapa_atual='avaliacao_assincrona' (403 caso contrário — service_role bypassa RLS,
 *   então a checagem é obrigatória ANTES de qualquer leitura/escrita), revalida
 *   word_count 200-500 server-side, computa texto_hash (sha256(normalize)) via Web
 *   Crypto, roda o prompt `culture_fit_essay` (Sonnet) via callAi com o
 *   EssayScoringV1Schema, deriva score/cor DETERMINISTICAMENTE (computeScoreAndCors —
 *   3 caps + 3 cores, NUNCA o LLM), e UPSERTa UMA linha em `redacoes_candidato`.
 *
 * INVARIANTE (RNF-07a — T-13-02-03): a EF NUNCA escreve `candidaturas`. Sem
 *   auto-advance nem auto-reject. status_analise='pendente_humano' SEMPRE (revisão
 *   humana obrigatória independente da cor); bloqueio_avanco=true SÓ quando vermelho
 *   (apenas SEGURA o avanço automático — o humano sempre decide). O candidato recebe
 *   um payload NEUTRO (`{ ok:true }`) — nunca o score/cor.
 *
 * ── SDK imports ESTÁTICOS `npm:` (clone de analise-candidato-individual:50-54) ──
 *   O `await import(["npm:",pkg].join(""))` (ainda presente em avaliar-redacao SJT
 *   :356-357) escondia o pacote do bundler do deploy → ERR_MODULE_NOT_FOUND no runtime
 *   (a EF "deployava" mas 500ava em toda call). Aqui os imports são estáticos e os
 *   builders zodOutputFormat/zodResponseFormat são INJETADOS em callAi (sem eles
 *   callAi cai no no-op `(s)=>s` e quebra AMBOS os provedores).
 *
 * callAi (Phase 9) já faz injection/maskPII/retry/fallback/cost/log — nunca
 *   re-implementar. O texto da redação é UNTRUSTED e passa por callAi por dentro.
 *
 * Deploy: `supabase functions deploy avaliar-redacao-cultural` (JWT-ON; candidate-
 *   invoked; tratado no Plan 13-04 [BLOCKING]). NÃO deployado aqui.
 *
 * @module supabase/functions/avaliar-redacao-cultural
 * @see supabase/functions/analise-candidato-individual/index.ts (static imports + deps wiring)
 * @see supabase/functions/avaliar-redacao/index.ts (skeleton two-client + auth-then-authz)
 * @see docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md §8.3 (pseudocódigo)
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
import { EssayScoringV1Schema, type EssayScoringV1 } from "../_shared/essay-schemas.ts";
import { AvaliarRedacaoCulturalBodySchema } from "../_shared/redacao-schemas.ts";
import { computeScoreAndCors, normalizeForHash } from "./_local/compute-score.ts";
// SDKs como import ESTÁTICO `npm:` — clone de analise-candidato-individual:50-53. O
// runtime-constructed `["npm:",pkg].join("")` (avaliar-redacao SJT) escondia o pacote
// da lista de deps do deploy → ERR_MODULE_NOT_FOUND. NÃO copiar aquela linha.
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

/** Threshold de cor default quando a vaga não configura (PRD §8.3). */
const DEFAULT_THRESHOLD = { vermelho_max: 40, amarelo_max: 64 };

/** sha256 hex via Web Crypto (server-authoritative — anti-tamper/anti-plágio). */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Contagem de palavras (mesma primitiva do counter do candidato). */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Extrai {D1..D4: int|'insufficient_evidence'} dos dimension_scores parseados. */
function extractScoresDim(parsed: { dimension_scores?: Array<{ dimension?: string; score?: unknown }> }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of parsed.dimension_scores ?? []) {
    if (d?.dimension) out[d.dimension] = d.score;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Deps injetáveis (testes injetam mocks; produção constrói clientes reais)
// ---------------------------------------------------------------------------

export interface AvaliarRedacaoCulturalDeps {
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

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói os
 * clientes reais a partir do env + do Authorization header e delega para cá.
 */
export async function handler(req: Request, deps: AvaliarRedacaoCulturalDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { anthropic, openai, supabaseAdmin, supabaseUser } = deps;

  // ── 1. Autentica o JWT do candidato (two-client D-23 — auth.getUser anon) ────
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 2. Parse + valida o body (SEM campo de score — anti-tamper, Pitfall 5) ──
  let body: { candidatura_id: string; pergunta_id: string; texto: string; tempo_gasto_segundos?: number };
  try {
    const raw = await req.json();
    const parsed = AvaliarRedacaoCulturalBodySchema.safeParse(raw);
    if (!parsed.success) {
      return errorResponse("VALIDATION", "Payload da redação inválido.");
    }
    body = parsed.data;
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  // ── 3. AUTORIZA (C1 — IDOR/back-lock): service_role bypassa RLS, então a EF DEVE
  //      verificar posse + etapa ANTES de tocar qualquer dado. Allowlist explícita,
  //      nunca o wildcard ([[reference_select_star_leaks_pii]]). A posse é resolvida
  //      via candidatos.user_id=auth.uid() — comparar candidato_id direto contra
  //      user.id é o bug latente do SJT (candidato_id é candidatos.id, NÃO o auth uid).
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

  // Resolve o candidato do usuário logado (auth-link via user_id) e confere posse.
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
    // ── 4. Pergunta (allowlist) + threshold de cor da vaga (PRD §8.3 passos 1-3). ─
    const { data: pergRow } = await supabaseAdmin
      .from("perguntas_redacao")
      .select("id, codigo, valor_primario, valor_secundario, texto")
      .eq("id", body.pergunta_id)
      .maybeSingle();
    if (!pergRow) {
      return errorResponse("VALIDATION", "Pergunta de redação inválida.", 400);
    }

    const { data: vagaRow } = await supabaseAdmin
      .from("vagas")
      .select("id, testes_aplicaveis")
      .eq("id", candRow.vaga_id)
      .maybeSingle();
    const testes = Array.isArray(vagaRow?.testes_aplicaveis) ? vagaRow!.testes_aplicaveis : [];
    const redacaoCfg = testes.find((t: { tipo?: string }) => t?.tipo === "redacao");
    const threshold = (redacaoCfg?.threshold_cor as typeof DEFAULT_THRESHOLD | undefined) ?? DEFAULT_THRESHOLD;

    // ── 5. Revalida word_count 200-500 server-side + texto_hash (anti-tamper). ──
    //      O client INSERT é negado por RLS (WITH CHECK false); a contagem e o hash
    //      são server-authoritative aqui (collapse do submit-redacao numa só EF).
    const wordCount = countWords(body.texto);
    if (wordCount < 200 || wordCount > 500) {
      return errorResponse("VALIDATION", "A redação deve ter entre 200 e 500 palavras.", 400);
    }
    const textoHash = await sha256Hex(normalizeForHash(body.texto));
    const inputHash = await sha256Hex(body.texto);
    // WR-03 — segundos decorridos coletados pelo cliente (RedacaoCronometro.onTick).
    // Advisory/anti-cheat (flag <90s); o humano sempre decide (RNF-07a). Ausente
    // (clientes antigos) → 0 (a flag de tempo trata como dado desconhecido).
    const tempoGastoSegundos = Math.max(0, Math.trunc(body.tempo_gasto_segundos ?? 0));

    // ── 6. Resolve o prompt culture_fit_essay + callAi ────────────────────────
    let resolved: ResolvedPrompt;
    try {
      const loaded = await loadPrompt("culture_fit_essay", supabaseAdmin);
      resolved = resolvedPromptFromLoaded(loaded, "culture_fit_essay", "gpt-4o-mini");
    } catch (e) {
      // AI-01: NÃO degradar para um stub silencioso. Uma versão de prompt não
      // resolvida (schema mismatch / não configurada) FALHA ALTO — alarma e
      // propaga para o try/catch externo do handler (500 estruturado pt-BR).
      if (e instanceof SchemaVersionMismatchError || e instanceof PromptNotConfiguredError) {
        await emitPromptStubAlert(supabaseAdmin, "culture_fit_essay");
      }
      throw e;
    }

    const perguntaBlock =
      `Pergunta (${pergRow.codigo}): ${pergRow.texto}\n` +
      `Valor primário: ${pergRow.valor_primario ?? ""}` +
      (pergRow.valor_secundario ? ` | secundário: ${pergRow.valor_secundario}` : "");

    const result = await callAi(
      {
        prompt: resolved,
        // Texto da redação UNTRUSTED — callAi mascara + detecta injeção por dentro.
        rawInput: body.texto,
        vagaRubricBlock: perguntaBlock,
        candidato_id: candRow.candidato_id,
        vaga_id: candRow.vaga_id,
        schema: EssayScoringV1Schema,
        // 2026-09-06: sem override, o teto default de 25 s x 3 tentativas derrubava TODA
        //   chamada Anthropic para o gpt-4o-mini (medido na analise e no comparativo).
        //   110 s, 1 tentativa (AI-04), como nas outras EFs de IA.
        timeoutMs: 110_000,
        // CR-01 — chave content-addressed: o fluxo permite re-submissão até a etapa
        // fechar (UPSERT em candidatura_id,pergunta_id). Sem o inputHash a chave era
        // estável → o 2º envio de um texto EDITADO acertava tryIdempotencyReplay e
        // gravava o veredito da PRIMEIRA redação contra o NOVO texto (scores stale).
        // Dobrando o sha256 do texto na chave, um texto reescrito força scoring fresco;
        // um duplicado verdadeiro (mesmo texto) ainda de-dupa via replay.
        idempotency_key: `${body.candidatura_id}:${body.pergunta_id}:${inputHash}`,
      },
      // Builders REAIS injetados (sem eles callAi cai no no-op `(s)=>s` e quebra
      // AMBOS os provedores). Testes omitem → no-op (inalterado).
      {
        anthropic,
        openai,
        supabase: supabaseAdmin,
        zodOutputFormat: deps.zodOutputFormat,
        zodResponseFormat: deps.zodResponseFormat,
      },
    );

    // ── 7. Never-absent + injeção → persiste row de revisão humana, nunca um
    //      sucesso fabricado (clone de avaliar-redacao:241-273). Mesmo na falha a
    //      row entra como pendente_humano (revisão humana é o destino de toda redação).
    const parsedRaw = result.parsed as EssayScoringV1 | null;
    if (
      parsedRaw == null ||
      result.flagged_for_human_review === true ||
      result.error_code === "prompt_injection_detected"
    ) {
      const failFlag = result.error_code ?? (parsedRaw == null ? "ia_sem_resultado" : "flagged_for_human_review");
      await supabaseAdmin.from("redacoes_candidato").upsert(
        {
          candidatura_id: body.candidatura_id,
          pergunta_id: body.pergunta_id,
          ordem: 1,
          eh_pergunta_padrao: pergRow.codigo === "PADRAO_BS",
          texto: body.texto,
          word_count: wordCount,
          texto_hash: textoHash,
          tempo_gasto_segundos: tempoGastoSegundos,
          input_hash: inputHash,
          flags: [failFlag],
          prompt_version: resolved.prompt_version,
          model_version: resolved.model_id,
          ia_processada_em: new Date().toISOString(),
          status_analise: "pendente_humano",
          bloqueio_avanco: false,
        },
        { onConflict: "candidatura_id,pergunta_id" },
      ).select("id").single();
      console.log("[avaliar-redacao-cultural] sem-output/injecao", {
        candidatura_id: body.candidatura_id,
        pergunta_id: body.pergunta_id,
        error_code: failFlag,
      });
      return jsonResponse({ ok: true }, 200);
    }

    // ── 8. Score/cor DETERMINÍSTICO (computeScoreAndCors — NUNCA o LLM). ───────
    const { scoreGeral, classificacaoCor, flags, redFlagEtico } = computeScoreAndCors(
      parsedRaw,
      threshold,
      wordCount,
      tempoGastoSegundos, // WR-03 — tempo real do cronômetro do cliente; <90s arma a flag anti-cheat.
    );

    // ── 9. Anti-plágio intercandidato: hash igual em OUTRA candidatura → flag. ─
    //      WR-06 — .limit(50) bound: a flag dispara por PRESENÇA (length>0), então
    //      não precisamos do match-set inteiro; o cap evita gravar um array
    //      arbitrariamente grande em referencia_match num pathological boilerplate.
    const { data: matchRows } = await supabaseAdmin
      .from("redacoes_candidato")
      .select("candidatura_id")
      .eq("texto_hash", textoHash)
      .neq("candidatura_id", body.candidatura_id)
      .limit(50);
    const referenciaMatch: string[] = Array.isArray(matchRows)
      ? matchRows.map((m: { candidatura_id: string }) => m.candidatura_id)
      : [];
    if (referenciaMatch.length > 0) flags.push("possivel_plagio_intercandidato");

    // ── 10. Persiste UMA linha (UPSERT). status_analise='pendente_humano' SEMPRE;
    //       bloqueio_avanco SÓ no vermelho. NUNCA toca candidaturas (RNF-07a).
    //       `.select('id').single()` é OBRIGATÓRIO (CR-03) — sem ele supabase-js v2
    //       não pede representação e o id nunca volta.
    await supabaseAdmin.from("redacoes_candidato").upsert(
      {
        candidatura_id: body.candidatura_id,
        pergunta_id: body.pergunta_id,
        ordem: 1,
        eh_pergunta_padrao: pergRow.codigo === "PADRAO_BS",
        texto: body.texto,
        word_count: wordCount,
        texto_hash: textoHash,
        tempo_gasto_segundos: tempoGastoSegundos,
        analise_ia: parsedRaw,
        scores_dimensao: extractScoresDim(parsedRaw),
        score_ponderado_0_100: scoreGeral,
        classificacao_cor: classificacaoCor,
        red_flag_etico: redFlagEtico,
        flags: [...new Set(flags)],
        referencia_match: referenciaMatch,
        prompt_version: resolved.prompt_version,
        model_version: resolved.model_id,
        input_hash: inputHash,
        ia_processada_em: new Date().toISOString(),
        status_analise: "pendente_humano", // RNF-07a — SEMPRE revisão humana
        bloqueio_avanco: classificacaoCor === "vermelho", // SEGURA o avanço — nunca auto-reject
      },
      { onConflict: "candidatura_id,pergunta_id" },
    ).select("id").single();

    // Log redigido (LGPD-02 / Pitfall 7) — só ids/counts/status; NUNCA texto/score/nome.
    console.log("[avaliar-redacao-cultural] ok", {
      candidatura_id: body.candidatura_id,
      pergunta_id: body.pergunta_id,
      word_count: wordCount,
      cor: classificacaoCor,
      bloqueio: classificacaoCor === "vermelho",
      flags_count: flags.length,
      provider: result.provider,
    });

    // Payload NEUTRO — o candidato nunca recebe o score/cor (RNF-07a).
    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[avaliar-redacao-cultural] erro", {
      candidatura_id: body.candidatura_id,
      error: message,
    });
    return errorResponse("SERVER_ERROR", "Falha ao avaliar a redação.", 500);
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
      console.error("[avaliar-redacao-cultural] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    // 2026-09-06: o preflight CORS (OPTIONS) NAO traz Authorization. Ate hoje este
    //   wrapper exigia o header ANTES de delegar ao handler (que trata OPTIONS), entao
    //   o navegador recebia 401 no preflight e o envio morria em "blocked by CORS" —
    //   medido em PROD ao enviar uma redacao. Com verify_jwt=true o gateway respondia
    //   o OPTIONS sozinho e escondia a ordem errada; com false, ela apareceu.
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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
