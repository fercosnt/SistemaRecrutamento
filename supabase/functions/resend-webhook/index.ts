/**
 * Edge Function: resend-webhook
 *
 * Phase 41 / Plan 41-02 — RECON-01/02. Sink dos webhooks de entrega do Resend.
 *
 * Arquitetura (RESEARCH §Architecture Patterns Pattern 1):
 *   O Resend chama esta EF nos eventos de entrega (`email.delivered`/`bounced`/
 *   `complained`). O endpoint é PÚBLICO (`verify_jwt=false` em config.toml) — a
 *   autenticação NÃO é um JWT de usuário, é a **assinatura Svix** sobre o corpo
 *   bruto. Esqueleto self-auth copiado de `analise-candidato-individual`, trocando
 *   o Bearer-check pela verificação `Webhook.verify` do Svix.
 *
 * Fluxo (handler injetável — testável sem `--allow-net`):
 *   1. `const rawBody = await req.text()` ANTES de qualquer parse (Pitfall 1: um
 *      JSON.parse+reserialize muda whitespace e quebra a assinatura).
 *   2. Monta os 3 headers svix-* e `new Webhook(secret).verify(rawBody, headers)`
 *      (síncrono, lança em assinatura inválida) → inválida = 400, ZERO writes
 *      (T-41-04: webhook forjado rejeitado; T-41-06: Svix compara constant-time).
 *   3. `mapEventoStatus(type)` (allowlist) + `data.email_id`; tipo não tratado ou
 *      id ausente → 200 "ignored" (graceful, sem write).
 *   4. `.update({status,[col]:now}).eq("provider_message_id", email_id)` — um id
 *      desconhecido afeta 0 linhas (no-op naturalmente idempotente; usa o índice
 *      parcial vivo `idx_notif_provider_msg`).
 *
 * Segurança (T-41-07 / Security V7): o `whsec` vem só do Vault via RPC e NUNCA é
 *   logado/interpolado; o payload do Resend traz `to`/`subject` (PII) — NUNCA é
 *   logado, só `type`/status/id. Assinatura inválida → 400 genérico sem detalhe.
 *
 * Deploy: `supabase functions deploy resend-webhook --no-verify-jwt` + registro do
 *   endpoint no dashboard Resend + provisionamento do `resend_webhook_secret` no
 *   Vault — tudo no plano GATED 41-05 (checkpoint humano). NÃO deployado aqui.
 *
 * @module supabase/functions/resend-webhook
 */

// `npm:svix` como import ESTÁTICO no topo — NUNCA um specifier montado em runtime
// (ex.: concatenar "npm:" com "svix"). O import dinâmico escondia o pacote da lista
// de dependências do deploy → ERR_MODULE_NOT_FOUND no runtime do EF (foi exatamente
// o bug que fez a EF de análise nunca extrair CV). Precedente estático:
// `analise-candidato-individual` importa `npm:@anthropic-ai/sdk` no topo.
import { Webhook } from "npm:svix@1.99.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapEventoStatus } from "./helpers.ts";

// ---------------------------------------------------------------------------
// CORS + response helpers (copiados de analise-candidato-individual:64-81)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Deps injetáveis (molde analise-candidato-individual — testes injetam mocks)
// ---------------------------------------------------------------------------

export interface WebhookDeps {
  /** Client service-role (mock nos testes). Escreve em notificacoes_enviadas. */
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  /** Segredo Svix `whsec_…` do Vault (injetado; testes passam um sintético). */
  webhookSecret: string;
}

/** Envelope mínimo do webhook do Resend (só o que a EF consome). */
interface ResendEvent {
  type: string;
  data?: { email_id?: string };
}

/**
 * Handler testável: recebe `deps` injetadas. `Deno.serve` (no fim) constrói o
 * client real a partir do env, lê o segredo do Vault e delega para cá.
 */
export async function handler(req: Request, deps: WebhookDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  // ── 1. Corpo BRUTO antes de qualquer parse (Pitfall 1 — reserialize quebra a assinatura).
  const rawBody = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  // ── 2. Verificação da assinatura Svix (T-41-04/06). Inválida → 400, ZERO writes.
  //    `verify` é síncrono e lança em assinatura inválida; devolve o payload verificado.
  let evt: ResendEvent;
  try {
    evt = new Webhook(deps.webhookSecret).verify(rawBody, headers) as ResendEvent;
  } catch {
    // Log genérico — NUNCA vaza o secret nem detalhe da assinatura (T-41-07).
    console.warn("[resend-webhook] assinatura Svix inválida");
    return new Response("invalid signature", { status: 400, headers: corsHeaders });
  }

  // ── 3. Mapeia type → status/coluna (allowlist) + extrai o id opaco.
  const emailId = evt.data?.email_id;
  const mapped = mapEventoStatus(evt.type);
  if (!emailId || !mapped) {
    // Tipo não tratado (opened/clicked/delivery_delayed) ou sem id → graceful no-op.
    console.log("[resend-webhook] ignorado", { type: evt.type, tem_email_id: Boolean(emailId) });
    return new Response("ignored", { status: 200, headers: corsHeaders });
  }

  // ── 4. Reconciliação por provider_message_id (idx_notif_provider_msg).
  //    Um id desconhecido afeta 0 linhas → naturalmente idempotente/no-op; um
  //    webhook repetido p/ o mesmo id/status também é no-op.
  const patch: Record<string, unknown> = { status: mapped.status };
  patch[mapped.col] = new Date().toISOString();
  await deps.supabaseAdmin
    .from("notificacoes_enviadas")
    .update(patch)
    .eq("provider_message_id", emailId);

  // Log redigido (T-41-07) — só type/status; NUNCA o payload (PII: to/subject) nem o id completo.
  console.log("[resend-webhook] reconciliado", { type: evt.type, status: mapped.status });
  return new Response("ok", { status: 200, headers: corsHeaders });
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (constrói o client real + lê o secret do Vault)
// ---------------------------------------------------------------------------

// `import.meta.main` é true só quando o EF é o entrypoint (produção/deploy) e
// false quando o módulo é importado pelo teste (que injeta deps em `handler`),
// evitando que `Deno.serve` tente abrir uma porta durante `deno test`.
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error("[resend-webhook] Faltam variáveis de ambiente");
      return new Response("misconfigured", { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Segredo do Vault (mirror de ler_resend_api_key) — a RPC é criada na migration
    // do Plano 41-03. NUNCA logar/interpolar o valor.
    const { data: whsec } = await supabaseAdmin.rpc("ler_resend_webhook_secret");
    if (!whsec || typeof whsec !== "string") {
      console.error("[resend-webhook] webhook secret ausente no Vault");
      return new Response("misconfigured", { status: 500 });
    }

    return await handler(req, { supabaseAdmin, webhookSecret: whsec });
  });
}
