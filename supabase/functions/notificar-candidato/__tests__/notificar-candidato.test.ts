/**
 * Phase 38 / Plan 38-03 Task 3 — invariantes puros da EF notificar-candidato (COMM-01/04).
 *
 * Testa `helpers.ts` (não `index.ts` — importar index dispararia Deno.serve). Sem --allow-net:
 * dedupe_key, mapa de evento, forma do corpo Resend (anexo condicional, sem chave), log seguro.
 *
 * Run: deno test supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts --allow-env --allow-read
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  construirCorpoResend,
  type EventoLedger,
  logSeguro,
  mapearEvento,
  montarDedupeKey,
} from "../helpers.ts";
import { FROM, REPLY_TO } from "../../_shared/email-config.ts";

Deno.test("COMM-01 — dedupe_key: convite usa agendamento_id; demais usam candidatura_id", () => {
  assertEquals(montarDedupeKey("convite", "cand-1", "agd-9"), "agd-9:convite");
  assertEquals(montarDedupeKey("avanco", "cand-1"), "cand-1:avanco");
  assertEquals(montarDedupeKey("confirmacao", "cand-1"), "cand-1:confirmacao");
  assertEquals(montarDedupeKey("decisao", "cand-1"), "cand-1:decisao");
});

Deno.test("COMM-01 — mapa de evento cobre os 4 (ledger → email-config)", () => {
  const esperado: Record<EventoLedger, string> = {
    confirmacao: "candidatura_recebida",
    avanco: "avaliacao_liberada",
    convite: "convite_entrevista",
    decisao: "decisao_final",
  };
  for (const e of Object.keys(esperado) as EventoLedger[]) {
    assertEquals(mapearEvento(e), esperado[e]);
  }
});

Deno.test("COMM-04 — corpo Resend inclui anexo .ics SÓ quando há icsBase64", () => {
  const comAnexo = construirCorpoResend({
    para: "x@resend.dev",
    subject: "s",
    html: "<p>h</p>",
    icsBase64: "QUJD",
  });
  assertEquals(comAnexo.attachments, [
    { filename: "entrevista-beautysmile.ics", content: "QUJD" },
  ]);

  const semAnexo = construirCorpoResend({
    para: "x@resend.dev",
    subject: "s",
    html: "<p>h</p>",
  });
  assertEquals("attachments" in semAnexo, false);
});

Deno.test("COMM-01 — corpo Resend usa FROM/REPLY_TO e NÃO carrega a chave da API", () => {
  const corpo = construirCorpoResend({
    para: "y@resend.dev",
    subject: "s",
    html: "<p>h</p>",
  });
  assertEquals(corpo.from, FROM);
  assertEquals(corpo.reply_to, REPLY_TO);
  assertEquals(corpo.to, "y@resend.dev");
  const serial = JSON.stringify(corpo);
  assert(!/authorization|bearer|api[_-]?key/i.test(serial), "corpo não pode conter a chave");
});

Deno.test("COMM-01 — logSeguro filtra PII (só ids/evento/status passam)", () => {
  const filtrado = logSeguro({
    evento: "confirmacao",
    status: "enviado",
    candidatura_id: "cand-1",
    email: "pii@exemplo.com",
    nome_completo: "Fulano de Tal",
    html: "<p>corpo</p>",
  });
  assertEquals(filtrado, {
    evento: "confirmacao",
    status: "enviado",
    candidatura_id: "cand-1",
  });
  assert(!("email" in filtrado) && !("nome_completo" in filtrado) && !("html" in filtrado));
});
