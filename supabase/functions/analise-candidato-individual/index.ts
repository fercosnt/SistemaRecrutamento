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
// AI-01: catch estreitado — propaga a falha de resolução de prompt como 500
// estruturado (nunca stub 0.0.0) + alarme no ponto de degradação.
import { PromptNotConfiguredError, SchemaVersionMismatchError } from "../_shared/prompt-loader.ts";
import { emitPromptStubAlert } from "../_shared/audit-logger.ts";
import { AnaliseBodySchema, CvJobMatchSchema } from "../_shared/analise-schemas.ts";
// SDKs + unpdf como import ESTÁTICO `npm:` — o runtime-constructed `["npm:",pkg].join("")` escondia o
// pacote da lista de dependências do deploy → ERR_MODULE_NOT_FOUND no runtime do EF (o EF nunca rodou
// em PROD). Precedente que deploya E passa o `deno test` type-checked: `analise-schemas.ts` importa
// `npm:zod@3.25.76` estático.
import Anthropic from "npm:@anthropic-ai/sdk@0.102.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import OpenAI from "npm:openai@6.42.0";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";
import { extractText, getDocumentProxy } from "npm:unpdf@0.11.0";

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
    // unpdf via import estático do topo (resolvível no deploy; o dynamic `.join("")`
    // anterior estourava ERR_MODULE_NOT_FOUND no runtime → CV nunca era extraído).
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
  /** Builders de structured-output (prod injeta os reais; testes omitem → callAi usa no-op). */
  zodOutputFormat?: (schema: unknown, name: string) => unknown;
  zodResponseFormat?: (schema: unknown, name: string) => unknown;
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
    // ── 3-0. MARCA `pendente` ANTES de qualquer trabalho caro ────────────────
    //
    // ⚠ POR QUE ISTO EXISTE. O try/catch abaixo garante uma linha `falhou` em
    // qualquer THROW — mas não cobre a função ser MORTA: timeout do runtime,
    // OOM, ou o processo derrubado no meio da chamada ao modelo. Nesses casos
    // nenhuma linha era criada, e a ausência ficava indistinguível de "ainda
    // processando".
    //
    // Isso importa porque o dispatch NÃO ajuda a distinguir: o trigger usa
    // `net.http_post` com o default de 5s e a análise leva ~93s (medido em
    // 2026-08-25), então `net._http_response` registra timeout em TODA execução,
    // inclusive nas bem-sucedidas. Sucesso e morte súbita eram idênticos vistos
    // de fora.
    //
    // Com esta marca, o estado sempre existe: `pendente` significa "começou e não
    // terminou", e uma varredura pode acusar as presas (ver a view
    // `v_analises_presas`). O status já estava no CHECK da tabela desde o início
    // e nunca havia sido usado.
    //
    // `onConflict` em candidatura_id: reprocessar volta a linha para `pendente`,
    // que é a verdade enquanto a nova execução não termina. Um erro AQUI não
    // interrompe a análise — perder observabilidade é ruim, perder a análise
    // inteira é pior.
    try {
      await supabaseAdmin.from("analise_candidato_vaga").upsert(
        { candidatura_id, vaga_id, status: "pendente", erro: null },
        { onConflict: "candidatura_id" },
      );
    } catch (marcaErr) {
      console.error("[analise] nao consegui marcar 'pendente' — seguindo mesmo assim", {
        candidatura_id,
        error: marcaErr instanceof Error ? marcaErr.message : String(marcaErr),
      });
    }

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

    const flags: string[] = [];

    // 3c. Rubrica da vaga (allowlist) — alimenta o vagaRubricBlock do prompt.
    //
    // ⚠ ATÉ 2026-08-23 ESTA CONSULTA PEDIA `descricao` E `requisitos`, QUE NÃO
    //   EXISTEM EM `public.vagas`. O PostgREST devolve 400 para coluna inexistente,
    //   e o `error` era DESCARTADO (`const { data: vaga }` sem `error`), então
    //   `vaga` vinha `null`, o ternário do `vagaRubricBlock` caía no ramo vazio, e
    //   a IA analisava candidato SEM NENHUM contexto da vaga — sem título, sem
    //   descrição, sem requisitos. Silenciosamente. Sete análises rodaram assim.
    //
    //   O schema já teve `descricao`/`requisitos` sem sufixo; a Phase 4 corrigiu a
    //   página (Pitfall 1) e esqueceu esta função. Varredura mecânica de TODOS os
    //   `.from().select()` das Edge Functions contra `information_schema` em
    //   2026-08-23 encontrou exatamente estas duas ocorrências e mais nenhuma.
    //
    //   Duas mudanças, e a segunda importa tanto quanto a primeira:
    //   (1) pedir as colunas que EXISTEM;
    //   (2) NÃO descartar o `error` — uma rubrica ausente passa a ser um flag
    //       visível na saída, e não um silêncio. Um defeito que não deixa rastro é
    //       indistinguível de sistema funcionando.
    const { data: vaga, error: vagaErr } = await supabaseAdmin
      .from("vagas")
      .select(
        "id, titulo, rubrica_ia, descricao_curta, sobre_cargo, requisitos_formacao, requisitos_experiencia, requisitos_tecnicos, requisitos_habilidades",
      )
      .eq("id", vaga_id)
      .maybeSingle();

    if (vagaErr || !vaga) flags.push("vaga_sem_rubrica");

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
    } catch (e) {
      // AI-01: NÃO degradar para um stub silencioso. Uma versão de prompt não
      // resolvida (schema mismatch / não configurada) FALHA ALTO — alarma e
      // propaga para o try/catch externo do handler (500 estruturado pt-BR).
      if (e instanceof SchemaVersionMismatchError || e instanceof PromptNotConfiguredError) {
        await emitPromptStubAlert(supabaseAdmin, "cv_job_match");
      }
      throw e;
    }

    // A rubrica DELIBERADA tem precedência sobre a cópia de divulgação.
    //
    // `rubrica_ia` é escrita para AVALIAR; `descricao_curta`/`sobre_cargo` são
    // escritas para ATRAIR. Os dois textos têm propósitos opostos, e usar o de
    // marketing como critério enfia na avaliação sinais que ninguém decidiu que
    // pesariam ("operação enxuta", "ambição saudável") — que é por onde viés entra
    // sem passar por decisão. Quando a vaga tem rubrica escrita e aprovada, é ela
    // que vale; o fallback existe só para as vagas anteriores a 2026-08-23.
    const rubricaDeliberada = (vaga?.rubrica_ia ?? "").trim();
    if (vaga && !rubricaDeliberada) flags.push("vaga_sem_rubrica_deliberada");

    const requisitosBlock = vaga
      ? [
          vaga.requisitos_formacao && `Formação: ${vaga.requisitos_formacao}`,
          vaga.requisitos_experiencia && `Experiência: ${vaga.requisitos_experiencia}`,
          vaga.requisitos_tecnicos && `Técnicos: ${vaga.requisitos_tecnicos}`,
          vaga.requisitos_habilidades && `Habilidades: ${vaga.requisitos_habilidades}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const vagaRubricBlock = !vaga
      ? ""
      : rubricaDeliberada
        ? `Vaga: ${vaga.titulo ?? ""}\n\n## Rubrica de avaliação\n${rubricaDeliberada}`
        : `Vaga: ${vaga.titulo ?? ""}\n${vaga.descricao_curta ?? ""}\n${vaga.sobre_cargo ?? ""}\n\nRequisitos:\n${requisitosBlock}`;
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
      // zodOutputFormat/zodResponseFormat REAIS injetados — sem eles o callAi cai no
      // default no-op `(s)=>s` e manda o schema cru, quebrando AMBOS os provedores
      // (Anthropic output_config.format inválido + OpenAI "Missing response_format.type").
      // Encaminha os builders injetados (prod) — sem eles o callAi cai no no-op `(s)=>s`
      // e manda o schema cru, quebrando AMBOS os provedores (Anthropic output_config.format
      // inválido + OpenAI "Missing response_format.type"). Testes omitem → no-op (inalterado).
      {
        anthropic,
        openai,
        supabase: supabaseAdmin,
        zodOutputFormat: deps.zodOutputFormat,
        zodResponseFormat: deps.zodResponseFormat,
      },
    );

    // Se callAi não produziu output válido (Anthropic esgotou retries E o fallback
    // OpenAI também não retornou parsed), trata como falha → cai no catch e
    // persiste a row 'falhou' (never-absent invariant). Sem isso, um provedor
    // totalmente indisponível gravaria uma análise 'sucesso' vazia.
    if (result.parsed == null) {
      throw new Error(result.error_code ?? "ia_sem_resultado");
    }

    // W4: injeção de prompt detectada. Nesse caso callAi devolve um STUB não-nulo
    // (match_score:10, flagged_for_human_review:true, error_code='prompt_injection_detected').
    // Gravar isso como status='sucesso' com score 10 pintaria um vermelho realista e
    // enganoso no painel. Em vez disso, trata como falha → cai no catch → row 'falhou'
    // com erro=error_code, e o painel mostra "— Falhou / Reprocessar análise" (sinal
    // de verificação humana preservado, never-absent mantido). Não é auto-reject
    // (RNF-07a): apenas não fabricamos um score de sucesso a partir de input adversarial.
    if (
      result.flagged_for_human_review === true ||
      result.error_code === "prompt_injection_detected"
    ) {
      throw new Error(result.error_code ?? "prompt_injection_detected");
    }

    // 6. Mapeia chaves INGLESAS → colunas pt-BR.
    const parsed = (result.parsed ?? {}) as {
      match_score?: number;
      strengths?: Array<{ competency?: string; evidence?: unknown; impact?: string }>;
      gaps?: Array<{ requirement?: string; severity?: string; note?: string }>;
      reasoning?: string;
    };

    // ⚠ ATÉ 2026-08-26 ESTE MAPEAMENTO DESCARTAVA A METADE QUE EXPLICA.
    //
    // `strengths` guardava só `competency` e `gaps` só `requirement` — jogando
    // fora a `evidence` do ponto forte e a `severity`/`note` do gap. O efeito na
    // tela do RH era pior do que perder detalhe:
    //
    //  · o gap aparecia como o NOME DO REQUISITO ("Portfólio com conteúdo
    //    relevante"), e quem lê entende "isto falta" — mesmo quando o `note` dizia
    //    que era atendimento PARCIAL. Numa análise real de 2026-08-26 o próprio
    //    `reasoning` afirmava que o candidato "apresenta um portfólio" enquanto o
    //    gap listava portfólio. A contradição não era do modelo: ele preencheu
    //    `requirement` com o requisito, que é o que o nome do campo pede, e a
    //    explicação foi descartada no caminho;
    //  · o ponto forte aparecia sem a evidência — e o prompt EXIGE citação, a
    //    rubrica desta base manda citar trecho literal do currículo. Pedir a
    //    citação e joga-la fora é gastar token para nada.
    //
    // As colunas são `text[]`, então a informação volta como texto composto em vez
    // de exigir migração de tipo. Formato: "requisito — nota [severidade]".
    const textoDaEvidencia = (ev: unknown): string => {
      if (typeof ev === "string") return ev;
      if (ev && typeof ev === "object") {
        const o = ev as Record<string, unknown>;
        for (const k of ["quote", "trecho", "text", "texto", "evidence"]) {
          if (typeof o[k] === "string") return o[k] as string;
        }
      }
      return "";
    };

    const pontosFortes = (parsed.strengths ?? [])
      .map((s) => {
        if (typeof s?.competency !== "string") return null;
        const cit = textoDaEvidencia(s.evidence).trim();
        return cit ? `${s.competency} — ${cit}` : s.competency;
      })
      .filter((c): c is string => typeof c === "string" && c.length > 0);

    const gapsList = (parsed.gaps ?? [])
      .map((g) => {
        if (typeof g?.requirement !== "string") return null;
        const nota = typeof g.note === "string" ? g.note.trim() : "";
        const sev = typeof g.severity === "string" ? g.severity : "";
        let out = g.requirement;
        if (nota) out += ` — ${nota}`;
        if (sev) out += ` [${sev}]`;
        return out;
      })
      .filter((r): r is string => typeof r === "string" && r.length > 0);

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

    // SDKs construídos a partir dos imports estáticos do topo (resolvíveis no deploy).
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    return await handler(req, {
      anthropic,
      openai,
      supabaseAdmin,
      serviceKey: expectedSecret,
      // Adapters p/ a assinatura `(schema, name)` do CallAiDeps (Anthropic usa só o schema).
      zodOutputFormat: (s, _n) => zodOutputFormat(s as never),
      zodResponseFormat: (s, n) => zodResponseFormat(s as never, n),
    });
  });
}
