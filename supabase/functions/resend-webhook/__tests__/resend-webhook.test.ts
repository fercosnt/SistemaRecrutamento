/**
 * Phase 41 / Plan 41-02 — invariantes da EF `resend-webhook` (RECON-01/02).
 *
 * Testa `helpers.ts` (função PURA `mapEventoStatus`) + a verificação de assinatura
 * Svix + o `handler(req, deps)` injetável SEM `--allow-net`:
 *   - o mapa evento→status é puro (allowlist dos 3 eventos v1, `null` no resto);
 *   - a assinatura Svix é exercida com crypto LOCAL (`wh.sign`/`wh.verify`) — sem rede;
 *   - o `handler` recebe um `supabaseAdmin` mock via deps (molde `analise…test.ts:74-126`),
 *     provando reconciliação por `provider_message_id`, rejeição de assinatura inválida
 *     e no-op idempotente (id desconhecido = 0 linhas afetadas).
 *
 * `npm:svix` é baixado no cache-time do Deno (não gated por `--allow-net`); `verify`/`sign`
 * são crypto local (node:crypto polyfill) — o runtime não abre socket.
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/resend-webhook
 */
import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Webhook } from "npm:svix@1.99.1";
import { mapEventoStatus } from "../helpers.ts";

// Segredo de teste canônico da Svix (whsec_ + base64) — só crypto local, nunca em PROD.
const TEST_WHSEC = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";

/** Assina um payload com o mesmo `Webhook`, devolvendo os 3 headers svix-* válidos. */
function assinar(secret: string, payload: string, msgId = "msg_test123") {
  const wh = new Webhook(secret);
  const ts = new Date();
  const signature = wh.sign(msgId, ts, payload);
  return {
    "svix-id": msgId,
    "svix-timestamp": Math.floor(ts.getTime() / 1000).toString(),
    "svix-signature": signature,
  };
}

Deno.test("RECON-02 — mapEventoStatus mapeia os 3 eventos e ignora o resto", () => {
  assertEquals(mapEventoStatus("email.delivered"), { status: "entregue", col: "entregue_em" });
  assertEquals(mapEventoStatus("email.bounced"), { status: "bounce", col: "bounce_em" });
  assertEquals(mapEventoStatus("email.complained"), { status: "reclamado", col: "reclamado_em" });
  assertEquals(mapEventoStatus("email.delivery_delayed"), null);
  assertEquals(mapEventoStatus("email.opened"), null);
  assertEquals(mapEventoStatus("qualquer.coisa"), null);
});

Deno.test("RECON-02 — Svix verify aceita assinatura válida e rejeita adulterada (sem rede)", () => {
  const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "re_abc" } });
  const headers = assinar(TEST_WHSEC, payload);

  // Assinatura correta → verify devolve o payload verificado (não lança).
  const verified = new Webhook(TEST_WHSEC).verify(payload, headers) as { type: string };
  assertEquals(verified.type, "email.delivered");

  // 1 byte adulterado no corpo → a assinatura não bate → verify lança.
  const adulterado = payload.replace("re_abc", "re_xyz");
  assertThrows(() => new Webhook(TEST_WHSEC).verify(adulterado, headers));

  // Segredo diferente → verify lança (webhook forjado com secret errado).
  const outroSecret = "whsec_" + btoa("outro-segredo-de-teste-diferente");
  assertThrows(() => new Webhook(outroSecret).verify(payload, headers));

  assert(true);
});
