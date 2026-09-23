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
 * INVARIANTE (RNF-07a): a EF NUNCA escreve `candidaturas`. A nota consolidada nasce
 *   `pendente_humano` com score NULL — `sucesso` só vem da mão humana, em
 *   `salvar_avaliacao_entrevista`; bloqueio_avanco=true SÓ quando a flag de língua/
 *   sotaque dispara (apenas SEGURA o avanço — o humano sempre decide; o bloqueio é
 *   imposto no avancar_etapa). Mesmo na falha (parse nulo / injeção) persiste uma
 *   linha — nunca um sucesso fabricado. O RH recebe um payload NEUTRO: ids e estado,
 *   nunca texto nem nota.
 *
 * ── Phase 49 / 49-10 (JORN-12 / D-37..D-42): a análise passa a ter DONO ──
 *   A gravação é UMA transação na RPC `public.registrar_analise_entrevista`
 *   (SECURITY DEFINER, só `service_role`), que é o ÚNICO escritor de
 *   `entrevista_analises` a partir daqui. Ela marca a vigente anterior do mesmo
 *   `(candidatura, tipo)` como superada, insere a nova com `tipo` / `solicitado_por` /
 *   `texto_hash` / `ai_call_log_id` / `provedor_ia` / `modelo_ia`, e devolve a nota
 *   consolidada a `pendente_humano` com score NULL (D-42: uma análise nova é sobre
 *   outro texto, logo a revisão humana anterior não vale para ela — mas CONTINUA
 *   legível na análise superada, que não é apagada).
 *   Três coisas que a versão anterior errava e que o teste do handler agora fixa:
 *     · a análise não sabia de qual entrevista era (`tipo` NULL nas 6 linhas vivas);
 *     · uma linha de FALHA entrava como a mais nova e escondia a análise boa;
 *     · as três escritas não tinham o erro checado — recusa saía como sucesso.
 *   E o mesmo texto reenviado (D-40) devolve a análise que já existe, sem tocar a IA.
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
  // Phase 49 / D-38 — o MESMO cálculo que o `logAiCall` usa para
  // `ai_call_logs.input_hash`. Reexportado pelo `ai-client` de propósito: duas
  // implementações do mesmo hash divergem em silêncio, e a divergência só aparece no
  // dia em que alguém tenta juntar a análise ao log pelo hash.
  inputHashDe,
  loadPrompt,
  parseIntEnv,
  resolvedPromptFromLoaded,
  type ResolvedPrompt,
} from "../_shared/ai-client.ts";
// AI-01: catch estreitado — propaga a falha de resolução de prompt como 500
// estruturado (nunca stub 0.0.0) + alarme no ponto de degradação.
import { PromptNotConfiguredError, SchemaVersionMismatchError } from "../_shared/prompt-loader.ts";
import { emitPromptStubAlert } from "../_shared/audit-logger.ts";
import { AvaliarTranscricaoBodySchema } from "../_shared/entrevista-schemas.ts";
import { TranscriptAnalysisSchema } from "../_shared/interview-output-schemas.ts";
import {
  deriveLanguageAccentFlag,
  type TranscriptAnalysisSlice,
} from "./_local/derive-flags.ts";
import { buildBarsRubricBlock } from "./_local/bars-rubric.ts";
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

/**
 * Phase 49 / 49-10 / D-41 — de qual entrevista é a transcrição.
 *
 * O `tipo` do body vence; a etapa atual da candidatura é só o PADRÃO. Fora de etapa de
 * entrevista não há padrão defensável: a EF devolve 400 pedindo o tipo em vez de gravar
 * um palpite (uma análise com o tipo errado é pior que uma sem tipo — ela supera a
 * vigente da entrevista errada).
 */
const ETAPA_PARA_TIPO: Record<string, "online" | "presencial"> = {
  entrevista_online: "online",
  entrevista_presencial: "presencial",
};

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

/**
 * Phase 49 / 49-10 / D-28 — o `provedor_ia` de um RESULTADO, ou NULL.
 *
 * `entrevista_analises_provedor_ia_check` aceita só `anthropic`, `openai` ou NULL. O
 * `CallAiResult.provider` também vale `'none'` (teto de custo, injeção detectada), e
 * `'none'` não é provedor de resultado — um resultado existe porque algum modelo
 * respondeu. Sem esta normalização o caminho de falha violaria o CHECK e a gravação
 * seria recusada — que, com o erro agora checado, viraria um 500 em vez de uma linha.
 */
function provedorDeResultado(provider: unknown): string | null {
  return provider === "anthropic" || provider === "openai" ? provider : null;
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
  let body: { candidatura_id: string; transcricao: string; tipo?: "online" | "presencial" };
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
    //      `etapa_atual` entra na MESMA allowlist (D-41) — é o padrão do `tipo`.
    const { data: candRow } = await supabaseAdmin
      .from("candidaturas")
      .select("id, vaga_id, candidato_id, etapa_atual")
      .eq("id", body.candidatura_id)
      .maybeSingle();
    if (!candRow) {
      return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }
    const { data: vagaRow } = await supabaseAdmin
      .from("vagas")
      .select("titulo, created_by")
      .eq("id", candRow.vaga_id)
      .maybeSingle();
    if (role === "rh") {
      if (!vagaRow || vagaRow.created_by !== user.id) {
        return errorResponse("FORBIDDEN", "Acesso negado.", 403);
      }
    }

    // ── 4a. De QUAL entrevista é esta transcrição (D-41). O `tipo` do body vence; a
    //      etapa atual é o padrão. Resolvido ANTES de qualquer chamada de IA: um 400 por
    //      tipo indeterminado não deve custar uma chamada ao provedor.
    const tipo = body.tipo ??
      ETAPA_PARA_TIPO[String((candRow as { etapa_atual?: unknown }).etapa_atual ?? "")];
    if (!tipo) {
      return errorResponse(
        "VALIDATION",
        "Informe se a transcrição é da entrevista online ou presencial.",
      );
    }

    // ── 4b. D-40 · o mesmo texto já analisado não é analisado de novo.
    //      Conferido ANTES da IA: é aqui que a economia acontece (medido em PROD — 2 das
    //      4 análises de `bf26ee3c…` são replays do mesmo texto). A RPC confere de novo,
    //      porque duas requisições simultâneas passariam as duas por esta leitura.
    //      ⚠ O hash é sobre o texto MASCARADO (`inputHashDe`), o mesmo valor que o
    //      `logAiCall` grava em `ai_call_logs.input_hash` — é o elo entre a análise e o
    //      texto, sem coluna de conteúdo nova (D-38).
    const textoHash = await inputHashDe(body.transcricao);
    const { data: jaExiste, error: jaExisteErr } = await supabaseAdmin
      .from("entrevista_analises")
      .select("id, superada_em, status_analise, competencias")
      .eq("candidatura_id", body.candidatura_id)
      .eq("tipo", tipo)
      .eq("texto_hash", textoHash)
      .neq("status_analise", "falhou")
      .not("competencias", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (jaExisteErr) {
      throw new Error(
        `leitura de reaproveitamento em entrevista_analises falhou: ${jaExisteErr.code ?? ""} ${jaExisteErr.message ?? ""}`
          .trim(),
      );
    }
    if (jaExiste) {
      console.log("[avaliar-transcricao-entrevista] reaproveitada", {
        candidatura_id: body.candidatura_id,
        tipo,
        analise_id: jaExiste.id,
      });
      return jsonResponse({
        ok: true,
        analise_id: jaExiste.id,
        tipo,
        reaproveitada: true,
        vigente: jaExiste.superada_em == null,
        falhou: false,
      }, 200);
    }

    // ── 4c. Rubrica BARS = âncoras do guia DO TIPO desta análise.
    //   ⚠ Até 2026-09-06 o bloco era `Vaga: <uuid>` — ver _local/bars-rubric.ts.
    //   ⚠ Phase 49 / 49-10: até aqui a leitura não filtrava por `tipo` e juntava as
    //     âncoras dos DOIS guias. O presencial repete as competências do online com
    //     âncoras recalibradas, então a análise da online podia ser avaliada contra a
    //     régua da presencial — o `buildBarsRubricBlock` resolve empate por «1ª
    //     ocorrência vence», e a ordem era `created_at`, não o tipo.
    //   O guia é insumo, não pré-requisito: falha de leitura → bloco "sem âncoras".
    let guias: unknown[] = [];
    try {
      const { data: guiaRows } = await supabaseAdmin
        .from("entrevista_guias")
        .select("guia")
        .eq("candidatura_id", body.candidatura_id)
        .eq("tipo", tipo)
        .order("created_at", { ascending: true });
      guias = Array.isArray(guiaRows) ? guiaRows.map((g: { guia?: unknown }) => g?.guia ?? null) : [];
    } catch {
      guias = [];
    }
    const barsRubricBlock = buildBarsRubricBlock({
      vagaTitulo: (vagaRow as { titulo?: string | null } | null)?.titulo ?? null,
      vagaId: candRow.vaga_id,
      guias,
    });

    // ── 5. Resolve o prompt transcript_analysis + callAi (transcrição UNTRUSTED) ─
    let resolved: ResolvedPrompt;
    try {
      const loaded = await loadPrompt("transcript_analysis", supabaseAdmin);
      resolved = resolvedPromptFromLoaded(loaded, "transcript_analysis", "gpt-4o-mini");
    } catch (e) {
      // AI-01: NÃO degradar para um stub silencioso. Uma versão de prompt não
      // resolvida (schema mismatch / não configurada) FALHA ALTO — alarma e
      // propaga para o try/catch externo do handler (500 estruturado pt-BR).
      if (e instanceof SchemaVersionMismatchError || e instanceof PromptNotConfiguredError) {
        await emitPromptStubAlert(supabaseAdmin, "transcript_analysis");
      }
      throw e;
    }

    const result = await callAi(
      {
        prompt: resolved,
        // Transcrição UNTRUSTED — callAi mascara PII + detecta injeção por dentro.
        rawInput: body.transcricao,
        vagaRubricBlock: barsRubricBlock,
        candidato_id: candRow.candidato_id,
        vaga_id: candRow.vaga_id,
        schema: TranscriptAnalysisSchema,
        idempotency_key: `${body.candidatura_id}:transcript`,
        // AI-04: a análise de transcrição (Sonnet, structured-output, ~4000
        // tokens sobre a transcrição completa) tem o mesmo perfil que fazia
        // gerar-guia estourar o teto global de 25s (RESIL-01). Teto por-chamada
        // de 60s (env-overridable) dá folga; o cap de retry-budget de 23-01
        // mantém o total sob ~150s do EF. Espelha gerar-guia-entrevista:274.
        timeoutMs: parseIntEnv("TRANSCRICAO_TIMEOUT_MS", 110000), // 2026-09-06: 60 s nao bastava ao Sonnet (ver gerar-guia)
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

    // ── 6. Never-absent: parse falho / injeção → persiste a linha com
    //      `status_analise='falhou'` e bloqueio_avanco:false (nunca um sucesso
    //      fabricado). Sem scores_candidato (não há análise para gravar), e — Phase 49 /
    //      49-10 — a linha NÃO supera ninguém e NÃO é vigente: a análise boa anterior
    //      continua sendo a que a tela, a revisão e o portão de avanço leem.
    //      ⚠ Até aqui esta linha entrava como `pendente_humano`, e por isso virava «a
    //      mais nova» para todo leitor que ordenava por `created_at` — uma falha de IA
    //      apagava da tela a análise que tinha funcionado.
    if (parsed == null || result.error_code === "prompt_injection_detected") {
      const { data: falhaRes, error: falhaErr } = await supabaseAdmin.rpc(
        "registrar_analise_entrevista",
        {
          p_candidatura_id: body.candidatura_id,
          p_tipo: tipo,
          p_solicitado_por: user.id,
          p_texto_hash: textoHash,
          p_ai_call_log_id: result.log_id,
          p_provedor_ia: provedorDeResultado(result.provider),
          p_modelo_ia: result.model,
          p_prompt_version: resolved.prompt_version,
          p_status_analise: "falhou",
          p_competencias: null,
          p_citacoes: null,
          p_bias_flags: null,
          p_bloqueio_avanco: false,
          p_score_metadata: null,
        },
      );
      if (falhaErr) {
        throw new Error(
          `registrar_analise_entrevista (falhou) recusou a gravacao: ${falhaErr.code ?? ""} ${falhaErr.message ?? ""}`
            .trim(),
        );
      }
      console.log("[avaliar-transcricao-entrevista] sem-output/injecao", {
        candidatura_id: body.candidatura_id,
        tipo,
        analise_id: falhaRes?.analise_id ?? null,
        error_code: result.error_code ?? "ia_sem_resultado",
      });
      return jsonResponse({
        ok: true,
        analise_id: falhaRes?.analise_id ?? null,
        tipo,
        reaproveitada: false,
        vigente: false,
        falhou: true,
      }, 200);
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

    // A gravação é UMA transação, na RPC (D-39): marcar a vigente anterior como superada,
    // inserir esta, e devolver a nota consolidada a `pendente_humano` são três escritas que
    // só fazem sentido juntas. Até aqui eram um INSERT e um upsert soltos, sem nenhum
    // `superada_em` — e sem erro checado, então uma escrita recusada saía como `{ok:true}`.
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc(
      "registrar_analise_entrevista",
      {
        p_candidatura_id: body.candidatura_id,
        p_tipo: tipo,
        p_solicitado_por: user.id,
        p_texto_hash: textoHash,
        p_ai_call_log_id: result.log_id,
        p_provedor_ia: provedorDeResultado(result.provider),
        p_modelo_ia: result.model,
        p_prompt_version: resolved.prompt_version,
        p_status_analise: "pendente_humano",
        p_competencias: competencias,
        p_citacoes: citacoes,
        p_bias_flags: biasFlags,
        // SEGURA o avanço — nunca auto-reject (RNF-07a). O bloqueio é imposto no
        // `avancar_etapa`, e desde o 49-06 ele só olha a análise VIGENTE.
        p_bloqueio_avanco: derived.flag,
        p_score_metadata: {
          competencias,
          recommendation: (parsed as { recommendation?: unknown }).recommendation ?? null,
          bloqueio_avanco: derived.flag,
          blocked_competencies: derived.blockedCompetencies,
        },
      },
    );
    if (rpcErr) {
      throw new Error(
        `registrar_analise_entrevista recusou a gravacao: ${rpcErr.code ?? ""} ${rpcErr.message ?? ""}`
          .trim(),
      );
    }

    // Log redigido (LGPD-02 / Pitfall 7) — só ids/counts/flag; NUNCA transcrição/score/nome.
    console.log("[avaliar-transcricao-entrevista] ok", {
      candidatura_id: body.candidatura_id,
      tipo,
      analise_id: rpcRes?.analise_id ?? null,
      superadas: rpcRes?.superadas ?? 0,
      competencias_count: competencias.length,
      bloqueio: derived.flag,
      blocked_count: derived.blockedCompetencies.length,
      provider: result.provider,
    });

    // Payload NEUTRO (RH-facing) — ids e estado, nunca texto nem nota.
    return jsonResponse({
      ok: true,
      analise_id: rpcRes?.analise_id ?? null,
      tipo,
      reaproveitada: rpcRes?.reaproveitada === true,
      vigente: rpcRes?.vigente === true,
      falhou: false,
    }, 200);
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
