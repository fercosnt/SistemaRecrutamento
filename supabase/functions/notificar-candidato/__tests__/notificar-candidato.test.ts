/**
 * Phase 38 / Plan 38-03 Task 3 — invariantes puros da EF notificar-candidato (COMM-01/04).
 *
 * Testa `helpers.ts` (funções puras) SEM disparar Deno.serve. Sem --allow-net:
 * dedupe_key, mapa de evento, forma do corpo Resend (anexo condicional, sem chave), log seguro.
 *
 * Phase 41 / Plan 41-01 — a EF foi refatorada para expor `handler(req, deps)` com
 * `fetch`/`supabaseAdmin`/`serviceKey` INJETÁVEIS (mirror analise-candidato-individual),
 * com `Deno.serve` sob `import.meta.main`. Isso permite importar `../index.ts` num teste
 * SEM abrir socket e SEM `--allow-net` — o `handler` recebe mocks via deps.
 *
 * Run: deno test supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts --allow-env --allow-read
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeProximaTentativa,
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

// ─── P41 (41-01 Task 2 / RECON-03): backoff exponencial capado ──────────────
//
// computeProximaTentativa(novasTentativas) devolve a ISO da próxima tentativa
// (≈15m → 1h → 6h → 24h) para 1..4 e `null` no cap 5. Puro; tolerância de janela
// (comparo o delta em ms com folga, pois `Date.now()` avança entre as chamadas).

Deno.test("RECON-03 — computeProximaTentativa: 1..4 ⇒ 15m/1h/6h/24h (backoff exponencial)", () => {
  const casos: Array<[number, number]> = [
    [1, 15 * 60_000],
    [2, 60 * 60_000],
    [3, 6 * 60 * 60_000],
    [4, 24 * 60 * 60_000],
  ];
  const FOLGA_MS = 5_000; // janela de tolerância para o avanço do relógio no teste
  for (const [n, esperadoMs] of casos) {
    const antes = Date.now();
    const iso = computeProximaTentativa(n);
    assert(typeof iso === "string", `computeProximaTentativa(${n}) deveria ser ISO string`);
    const delta = new Date(iso as string).getTime() - antes;
    assert(
      Math.abs(delta - esperadoMs) <= FOLGA_MS,
      `computeProximaTentativa(${n}) delta=${delta}ms, esperado≈${esperadoMs}ms`,
    );
  }
});

Deno.test("RECON-03 — computeProximaTentativa: cap 5 ⇒ null (sem mais retries)", () => {
  assertEquals(computeProximaTentativa(5), null);
  assertEquals(computeProximaTentativa(6), null);
});

// ─── P41 (41-01 Task 1): handler(req, deps) testável — deps injetáveis ───────
//
// Importa `../index.ts`: como `Deno.serve` está sob `import.meta.main`, o import
// NÃO abre socket (o teste não é o entrypoint). O `handler` recebe mocks — nada
// de rede, nada de `--allow-net`. Prova estrutural de que a refatoração expõe o
// caminho testável exigido pelo retry (41-04) e pelo mock de CI.

/** Deps mínimas: o teste de 401 nem chega a tocar supabaseAdmin/fetchImpl. */
function makeStubDeps(serviceKey = "notificar-secret-fixture") {
  const fetchCalls: unknown[] = [];
  return {
    fetchCalls,
    supabaseAdmin: {
      from: () => {
        throw new Error("supabaseAdmin não deveria ser tocado neste caminho");
      },
      rpc: () => {
        throw new Error("rpc não deveria ser tocado neste caminho");
      },
    },
    fetchImpl: ((..._args: unknown[]) => {
      fetchCalls.push(_args);
      throw new Error("fetchImpl não deveria ser tocado neste caminho");
    }) as unknown as typeof fetch,
    serviceKey,
  };
}

async function loadHandler() {
  const mod = await import("../index.ts");
  return mod as {
    handler: (
      req: Request,
      deps: {
        // deno-lint-ignore no-explicit-any
        supabaseAdmin: any;
        fetchImpl: typeof fetch;
        serviceKey: string;
      },
    ) => Promise<Response>;
  };
}

function makeRequest(body: unknown, bearer?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bearer !== undefined) headers["Authorization"] = `Bearer ${bearer}`;
  return new Request("http://localhost/functions/v1/notificar-candidato", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

Deno.test("41-01 — handler exposto: Bearer ausente → 401 UNAUTHORIZED (via deps injetadas)", async () => {
  const { handler } = await loadHandler();
  const deps = makeStubDeps();
  const res = await handler(
    makeRequest({ evento: "confirmacao", candidatura_id: "cand-1" }), // sem Bearer
    deps,
  );
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error_code, "UNAUTHORIZED");
  // Nada de rede: o fetch injetado nunca foi chamado.
  assertEquals(deps.fetchCalls.length, 0);
});

Deno.test("41-01 — handler exposto: Bearer divergente → 401 (compara contra deps.serviceKey)", async () => {
  const { handler } = await loadHandler();
  const deps = makeStubDeps("segredo-correto");
  const res = await handler(
    makeRequest({ evento: "confirmacao", candidatura_id: "cand-1" }, "segredo-errado"),
    deps,
  );
  assertEquals(res.status, 401);
  assertEquals(deps.fetchCalls.length, 0);
});
