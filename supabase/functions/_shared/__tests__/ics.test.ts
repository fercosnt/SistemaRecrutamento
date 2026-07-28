/**
 * Phase 38 / Plan 38-01 Task 2 — paridade do `.ics` portado do M6 (COMM-04).
 *
 * Prova por execução (não por leitura) que o port de `gerarIcsAgendamento` para o mundo
 * Deno é fiel: METHOD:PUBLISH, PRODID Beauty Smile, CRLF obrigatório, LOCATION condicional,
 * DTEND = DTSTART + 1h, guard de data inválida, e round-trip base64 UTF-8-safe.
 *
 * Run: deno test supabase/functions/_shared/__tests__/ics.test.ts --allow-env --allow-read
 */
import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { gerarIcsAgendamento, icsParaBase64, IcsGenerationError } from "../ics.ts";

const INPUT = {
  id: "agd-123",
  data_hora: "2026-08-01T14:30:00-03:00",
  local_ou_link: "Rua Exemplo, 100 — São Paulo",
};

Deno.test("COMM-04 — estrutura RFC-5545 com METHOD:PUBLISH e PRODID Beauty Smile", () => {
  const ics = gerarIcsAgendamento(INPUT);
  for (
    const needle of [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Beauty Smile//Recrutamento//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:agd-123@recrutamento.beautysmile",
      "DTSTAMP:",
      "DTSTART:",
      "DTEND:",
      "SUMMARY:",
      "LOCATION:",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
  ) {
    assert(ics.includes(needle), `.ics deveria conter "${needle}"`);
  }
});

Deno.test("COMM-04 — join usa CRLF (\\r\\n), nunca LF puro", () => {
  const ics = gerarIcsAgendamento(INPUT);
  assert(ics.includes("\r\n"), "deveria conter CRLF");
  // Remove todos os CRLF; o que sobrar não pode conter nenhum \n solto.
  const semCrlf = ics.split("\r\n").join("");
  assert(!semCrlf.includes("\n"), "não deveria haver LF sem CR");
});

Deno.test("COMM-04 — LOCATION é condicional (ausente quando local_ou_link é null)", () => {
  const ics = gerarIcsAgendamento({ ...INPUT, local_ou_link: null });
  assert(!ics.includes("LOCATION:"), "sem local não deveria emitir LOCATION");
});

Deno.test("COMM-04 — DTEND = DTSTART + 1h", () => {
  const ics = gerarIcsAgendamento(INPUT);
  const parse = (label: string): number => {
    const m = ics.match(new RegExp(`${label}:(\\d{8}T\\d{6}Z)`));
    assert(m, `${label} deveria estar presente em UTC básico`);
    const s = m![1];
    // YYYYMMDDTHHMMSSZ → Date
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${
      s.slice(9, 11)
    }:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
    return new Date(iso).getTime();
  };
  assertEquals(parse("DTEND") - parse("DTSTART"), 60 * 60 * 1000);
});

Deno.test("COMM-04 — guard: data_hora inválida lança IcsGenerationError", () => {
  assertThrows(
    () => gerarIcsAgendamento({ id: "x", data_hora: "", local_ou_link: null }),
    IcsGenerationError,
  );
});

Deno.test("COMM-04 — icsParaBase64 round-trip preserva acento (São Paulo)", () => {
  const ics = gerarIcsAgendamento(INPUT);
  const b64 = icsParaBase64(ics);
  // decode base64 → bytes → UTF-8 string
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  assertEquals(decoded, ics);
  assert(decoded.includes("São Paulo"), "o acento deve sobreviver ao round-trip");
});
