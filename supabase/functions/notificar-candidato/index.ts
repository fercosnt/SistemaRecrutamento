/**
 * Edge Function: notificar-candidato (COMM-01..05)
 *
 * Phase 38 — o despachante único das 4 notificações do M7. Self-authenticating
 * (Bearer via Vault vs service_role, deploy `--no-verify-jwt`, mirror cost-alerter/
 * analise-candidato-individual). Payload IDS-ONLY; resolve os dados do candidato por
 * ALLOWLIST explícita de colunas (nunca projeção-estrela — RLS é row-level, uma projeção com `*` vazaria PII);
 * reivindica idempotência contra `notificacoes_enviadas` (claim-before-send, ON CONFLICT
 * dedupe_key DO NOTHING); renderiza o template Beauty Smile correto; envia via `fetch`
 * plano ao Resend (zero SDK, zero npm novo); grava o resultado no ledger em 2 fases.
 *
 * FIRE-AND-FORGET: qualquer falha de envio grava `falhou`+proxima_tentativa_em e a EF
 * retorna 200 — NUNCA relança ao chamador (net.http_post é at-most-once; um 500 sumiria
 * silenciosamente e perderia o registro). Sem retry interno — o pg_cron da P41 varre.
 *
 * SEGREDO: RESEND_API_KEY só do Vault via rpc `ler_resend_api_key()`; nunca logado nem
 * interpolado. Logs só carregam ids/evento/status (helper `logSeguro`).
 *
 * Deploy dormente (sem trigger) — provado ponta-a-ponta pelo smoke manual do 38-04.
 *
 * P41 (RECON-03 / testabilidade): a EF expõe `handler(req, deps)` com `fetch`,
 * `supabaseAdmin` e `serviceKey` INJETÁVEIS (mirror `analise-candidato-individual`),
 * e `Deno.serve` só roda sob `import.meta.main`. Isso permite mockar o envio ao Resend
 * nos testes SEM `--allow-net` — pré-requisito do retry (41-04) e do mock de CI.
 *
 * @module supabase/functions/notificar-candidato
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  exigirSinkTeste,
  resolverDestinatario,
  resolverModo,
} from "../_shared/email-config.ts";
import { renderarEmail } from "../_shared/email-templates.ts";
import { gerarIcsAgendamento, icsParaBase64 } from "../_shared/ics.ts";
import {
  computeProximaTentativa,
  construirCorpoResend,
  type EventoLedger,
  logSeguro,
  mapearEvento,
  montarDedupeKey,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

const EVENTOS_VALIDOS: ReadonlySet<string> = new Set([
  "confirmacao",
  "avanco",
  "convite",
  "decisao",
]);

interface CorpoRequisicao {
  evento: EventoLedger;
  candidatura_id: string;
  agendamento_id?: string;
}

// ---------------------------------------------------------------------------
// Deps injetáveis (P41 / testabilidade — testes injetam mocks; sem rede)
// ---------------------------------------------------------------------------

export interface NotificarDeps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  /** `fetch` do envio ao Resend — testes injetam um mock → sem `--allow-net`. */
  fetchImpl: typeof fetch;
  /** Segredo esperado no Bearer (== NOTIFICAR_SECRET / service_role em produção). */
  serviceKey: string;
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim, sob
 * `import.meta.main`) constrói os clientes reais a partir do env e delega para cá.
 */
export async function handler(req: Request, deps: NotificarDeps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  }

  const { supabaseAdmin } = deps;

  // ---- 1) Self-auth do Vault Bearer (mirror cost-alerter) --------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!bearer || bearer !== deps.serviceKey) {
    console.warn("[notificar-candidato] Bearer inválido/ausente");
    return errorResponse("UNAUTHORIZED", "Não autorizado.", 401);
  }

  // ---- 2) Parse ids-only -----------------------------------------------------
  let body: CorpoRequisicao;
  try {
    const raw = await req.json();
    if (
      !raw ||
      typeof raw.evento !== "string" ||
      !EVENTOS_VALIDOS.has(raw.evento) ||
      typeof raw.candidatura_id !== "string" ||
      !raw.candidatura_id
    ) {
      return errorResponse("VALIDATION", "Payload inválido (evento/candidatura_id).");
    }
    if (raw.evento === "convite" && typeof raw.agendamento_id !== "string") {
      return errorResponse("VALIDATION", "convite exige agendamento_id.");
    }
    body = {
      evento: raw.evento as EventoLedger,
      candidatura_id: raw.candidatura_id,
      agendamento_id: raw.agendamento_id ?? undefined,
    };
  } catch {
    return errorResponse("VALIDATION", "JSON malformado.");
  }

  const { evento, candidatura_id, agendamento_id } = body;

  // ---- 3) Resolver dados por ALLOWLIST de colunas (nunca projeção-estrela) ----
  const { data: candidatura } = await supabaseAdmin
    .from("candidaturas")
    .select("candidato_id, vaga_id, etapa_atual")
    .eq("id", candidatura_id)
    .maybeSingle();
  if (!candidatura) {
    return jsonResponse({ ok: true, skipped: "dados_ausentes" }, 200);
  }
  const { data: candidato } = await supabaseAdmin
    .from("candidatos")
    .select("nome_completo, email")
    .eq("id", candidatura.candidato_id)
    .maybeSingle();
  const { data: vaga } = await supabaseAdmin
    .from("vagas")
    .select("titulo")
    .eq("id", candidatura.vaga_id)
    .maybeSingle();
  if (!candidato?.email || !vaga?.titulo) {
    return jsonResponse({ ok: true, skipped: "dados_ausentes" }, 200);
  }

  let agendamento: {
    id: string;
    data_hora: string;
    local_ou_link: string | null;
    tipo: string | null;
  } | null = null;
  if (evento === "convite") {
    const { data } = await supabaseAdmin
      .from("agendamentos_entrevista")
      .select("id, data_hora, local_ou_link, tipo")
      .eq("id", agendamento_id!)
      .maybeSingle();
    if (!data) {
      return jsonResponse({ ok: true, skipped: "dados_ausentes" }, 200);
    }
    agendamento = data;
  }

  // ---- 4) Idempotência + destinatário ---------------------------------------
  const eventoNotif = mapearEvento(evento);
  const modo = resolverModo();
  const dest = resolverDestinatario(candidato.email, eventoNotif, modo);
  const dedupe_key = montarDedupeKey(evento, candidatura_id, agendamento_id);

  // ---- 5) Claim-before-send (ON CONFLICT dedupe_key DO NOTHING) --------------
  const { data: claim, error: claimErr } = await supabaseAdmin
    .from("notificacoes_enviadas")
    .upsert(
      {
        candidato_id: candidatura.candidato_id,
        candidatura_id,
        dedupe_key,
        destinatario_email: dest.para,
        destinatario_original: dest.destinatario_original,
        evento,
        template: eventoNotif,
        status: "pendente",
        modo,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id");
  if (claimErr) {
    console.error(
      "[notificar-candidato] claim falhou:",
      logSeguro({ evento, candidatura_id, status: "erro_claim" }),
    );
    return errorResponse("SERVER_ERROR", "Falha ao reivindicar notificação.", 500);
  }
  if (!claim || claim.length === 0) {
    // Já reivindicado por outra invocação — no-op idempotente.
    console.log(
      "[notificar-candidato]",
      logSeguro({ evento, candidatura_id, dedupe_key, skipped: "duplicate" }),
    );
    return jsonResponse({ ok: true, skipped: "duplicate" }, 200);
  }

  // registrarFalha: grava `falhou` + backoff (computeProximaTentativa) na linha
  // já reivindicada. `novasTentativas` default 1 (caminho normal = 1ª falha);
  // parametrizado p/ o retry do 41-04 (row.tentativas + 1). No cap 5,
  // computeProximaTentativa devolve null e a linha permanece falhou (sem novo retry).
  const registrarFalha = async (
    motivoLog: string,
    novasTentativas = 1,
  ): Promise<Response> => {
    await supabaseAdmin
      .from("notificacoes_enviadas")
      .update({
        status: "falhou",
        ultimo_erro: motivoLog.slice(0, 500),
        proxima_tentativa_em: computeProximaTentativa(novasTentativas),
        tentativas: novasTentativas,
      })
      .eq("dedupe_key", dedupe_key);
    console.warn(
      "[notificar-candidato]",
      logSeguro({ evento, candidatura_id, status: "falhou" }),
    );
    return jsonResponse({ ok: true }, 200); // fire-and-forget: nunca 5xx ao trigger
  };

  // ---- 5b) Guard non-prod (DELIV-03) — ANTES de qualquer envio --------------
  // Em modo teste, aborta se o destinatário efetivo não for um sink *@resend.dev
  // (T-41-01: nenhum candidato real recebe e-mail de um run de teste). Fire-and-
  // forget: registra `falhou` na linha reivindicada e retorna 200 (nunca 5xx).
  try {
    exigirSinkTeste(dest.para, modo);
  } catch (e) {
    return await registrarFalha(
      `guard non-prod: ${(e as { message?: string })?.message ?? "sink de teste inválido"}`,
    );
  }

  // ---- 6) Render + anexo .ics (só convite) ----------------------------------
  const dataHoraFmt = agendamento
    ? new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(agendamento.data_hora))
    : undefined;

  const { subject, html } = renderarEmail(eventoNotif, {
    nomeCandidato: candidato.nome_completo ?? "candidato(a)",
    tituloVaga: vaga.titulo,
    dataHoraFmt,
    localOuLink: agendamento?.local_ou_link ?? null,
    tipoEntrevista: agendamento?.tipo ?? undefined,
  });

  let icsBase64: string | undefined;
  if (evento === "convite" && agendamento) {
    icsBase64 = icsParaBase64(
      gerarIcsAgendamento({
        id: agendamento.id,
        data_hora: agendamento.data_hora,
        local_ou_link: agendamento.local_ou_link,
      }),
    );
  }

  // ---- 7) Segredo do Vault + envio ------------------------------------------
  const { data: apiKey } = await supabaseAdmin.rpc("ler_resend_api_key");
  if (!apiKey || typeof apiKey !== "string") {
    // Sem chave: grava falhou e sai 200 (não vaza 401 opaco; a P41 re-tenta quando houver chave).
    return await registrarFalha("resend_api_key ausente no Vault");
  }

  let resp: Response;
  try {
    resp = await deps.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        construirCorpoResend({ para: dest.para, subject, html, icsBase64 }),
      ),
    });
  } catch (e) {
    return await registrarFalha(
      `fetch Resend lançou: ${(e as { message?: string })?.message ?? "erro de rede"}`,
    );
  }

  if (!resp.ok) {
    let detalhe = `${resp.status}`;
    try {
      const err = await resp.json();
      detalhe = `${resp.status} ${(err as { message?: string })?.message ?? ""}`;
    } catch { /* corpo não-JSON */ }
    return await registrarFalha(`Resend non-2xx: ${detalhe}`);
  }

  // ---- 8) Sucesso: grava enviado + provider_message_id ----------------------
  let providerMessageId: string | null = null;
  try {
    const ok = await resp.json();
    providerMessageId = (ok as { id?: string })?.id ?? null;
  } catch { /* sem corpo — segue sem id */ }

  await supabaseAdmin
    .from("notificacoes_enviadas")
    .update({
      status: "enviado",
      provider_message_id: providerMessageId,
      enviado_em: new Date().toISOString(),
    })
    .eq("dedupe_key", dedupe_key);

  console.log(
    "[notificar-candidato]",
    logSeguro({
      evento,
      candidatura_id,
      dedupe_key,
      status: "enviado",
      provider_message_id: providerMessageId,
    }),
  );
  return jsonResponse({ ok: true, status: "enviado" }, 200);
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
      console.error("[notificar-candidato] env ausente (URL/SERVICE_KEY)");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    // Override opcional do segredo para rotação sem trocar a service_role key.
    const expectedSecret = Deno.env.get("NOTIFICAR_SECRET") ?? SERVICE_KEY;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, {
      supabaseAdmin,
      fetchImpl: fetch,
      serviceKey: expectedSecret,
    });
  });
}
