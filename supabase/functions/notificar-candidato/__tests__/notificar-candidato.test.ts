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
import {
  COPY_APROVACAO,
  COPY_REJEICAO,
} from "../../_shared/email-templates.ts";

Deno.test("COMM-01 — dedupe_key: convite usa agendamento_id; demais usam candidatura_id", () => {
  assertEquals(montarDedupeKey("convite", "cand-1", "agd-9"), "agd-9:convite");
  // 2026-09-06: reagendamento versiona pela data nova; a chave original fica intacta.
  assertEquals(
    montarDedupeKey("convite", "cand-1", "agd-9", "2026-09-10T13:00:00+00:00"),
    "agd-9:convite:2026-09-10T13:00:00+00:00",
  );
  assertEquals(montarDedupeKey("avanco", "cand-1", undefined, "ignorado"), "cand-1:avanco");
  assertEquals(montarDedupeKey("avanco", "cand-1"), "cand-1:avanco");
  assertEquals(montarDedupeKey("confirmacao", "cand-1"), "cand-1:confirmacao");
  assertEquals(montarDedupeKey("decisao", "cand-1"), "cand-1:decisao");
});

Deno.test("COMM-01 / 42-08 — mapa de evento cobre os 5 (ledger → email-config)", () => {
  // ⚠ Este literal é um Record<EventoLedger, …> e portanto um SÍTIO DO VOCABULÁRIO forçado
  // pelo compilador — o 5º, e o único que vive no corpus de TESTE. A tabela de sítios do
  // plano 42-08 enumerava quatro (os três Record<EventoNotificacao,…> de template mais o
  // EVENTO_MAP) e não contava este. Ele é uma rede legítima: um espelho escrito à mão do
  // mapa, que só passa se a implementação e a expectativa concordarem valor a valor.
  const esperado: Record<EventoLedger, string> = {
    confirmacao: "candidatura_recebida",
    avanco: "avaliacao_liberada",
    convite: "convite_entrevista",
    decisao: "decisao_final",
    revisao_respondida: "revisao_respondida",
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

// ─── P41 (41-04): branch retry (retry_id) — deps mockadas, SEM --allow-net ───
//
// A varredura pg_cron (41-03) reenvia com `retry_id` no body. Estes casos provam,
// com supabaseAdmin + fetchImpl mockados (nada de rede), que o branch retry:
//   (a) respeita o cap 5 / status terminal / linha ausente → skipped:nao_elegivel
//       SEM tocar o fetch (T-41-14: nenhum loop de custo);
//   (b) re-tenta a linha EXISTENTE keando por `id = retry_id` no sucesso
//       (status=enviado + provider_message_id) — não colapsa em skipped:duplicate;
//   (c) no non-2xx INCREMENTA tentativas (row.tentativas + 1, não reset p/ 1) e
//       grava proxima_tentativa_em (backoff); e
//   (d) o caminho NORMAL (sem retry_id) segue exercitando o claim-before-send.
// O fetch do Resend carrega Idempotency-Key = retry_id (retry) / dedupe_key (normal).

const RETRY_BEARER = "notificar-secret-fixture";

const CANDIDATURA_FIX = {
  candidato_id: "cand-x",
  vaga_id: "vaga-x",
  etapa_atual: "avaliacao",
};
const CANDIDATO_FIX = {
  nome_completo: "Fulano de Tal",
  email: "real.candidato@example.com",
};
const VAGA_FIX = { titulo: "Dentista Clínico" };

interface UpdateCapt {
  table: string;
  patch: Record<string, unknown>;
  eqCol?: string;
  eqVal?: unknown;
}
interface UpsertCapt {
  table: string;
  row: Record<string, unknown>;
  onConflict?: string;
}

/**
 * Mock do client service-role: roteia `.select().eq().maybeSingle()` por tabela
 * (a linha de retry vem de `notificacoes_enviadas`; candidatura/candidato/vaga das
 * suas), registra todo `.update(patch).eq(col,val)` e todo `.upsert(row,opts)` em
 * arrays inspecionáveis, e resolve `.rpc("ler_resend_api_key")` com uma chave fake.
 */
function makeRetryMockSupabase(opts: {
  notifRow?: Record<string, unknown> | null;
  candidaturaRow?: Record<string, unknown> | null;
  candidatoRow?: Record<string, unknown> | null;
  vagaRow?: Record<string, unknown> | null;
  agendamentoRow?: Record<string, unknown> | null;
  /** 42-08: linha de `decisao_final` lida SÓ pelo 5º evento (veredito da revisão). */
  decisaoFinalRow?: Record<string, unknown> | null;
  apiKey?: string | null;
} = {}) {
  const updates: UpdateCapt[] = [];
  const upserts: UpsertCapt[] = [];
  const rowFor = (table: string): Record<string, unknown> | null => {
    switch (table) {
      case "notificacoes_enviadas":
        return opts.notifRow ?? null;
      case "candidaturas":
        return opts.candidaturaRow ?? null;
      case "candidatos":
        return opts.candidatoRow ?? null;
      case "vagas":
        return opts.vagaRow ?? null;
      case "agendamentos_entrevista":
        return opts.agendamentoRow ?? null;
      case "decisao_final":
        return opts.decisaoFinalRow ?? null;
      default:
        return null;
    }
  };
  return {
    updates,
    upserts,
    from(table: string) {
      return {
        select: (_cols?: string) => {
          const chain = {
            eq: () => chain,
            maybeSingle: () => Promise.resolve({ data: rowFor(table), error: null }),
            single: () => Promise.resolve({ data: rowFor(table), error: null }),
          };
          return chain;
        },
        update: (patch: Record<string, unknown>) => ({
          eq: (eqCol: string, eqVal: unknown) => {
            updates.push({ table, patch, eqCol, eqVal });
            return Promise.resolve({ data: null, error: null });
          },
        }),
        upsert: (row: Record<string, unknown>, options?: { onConflict?: string }) => {
          upserts.push({ table, row, onConflict: options?.onConflict });
          return {
            select: (_c?: string) =>
              Promise.resolve({ data: [{ id: "claimed-id" }], error: null }),
          };
        },
      };
    },
    rpc: (name: string) => {
      if (name === "ler_resend_api_key") {
        return Promise.resolve({
          data: opts.apiKey === undefined ? "re_fake_key_para_teste" : opts.apiKey,
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

/** `fetchImpl` sintético: conta chamadas e devolve um Response com o status pedido. */
function makeFetchMock(status: number, jsonBody: unknown = { id: "re_abc" }) {
  const calls: Array<{ url: unknown; init?: RequestInit }> = [];
  const impl = ((url: unknown, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(
      new Response(JSON.stringify(jsonBody), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as unknown as typeof fetch;
  return { impl, calls };
}

Deno.test("41-04 — retry guard: linha ausente | status terminal | cap 5 → skipped:nao_elegivel sem fetch", async () => {
  const { handler } = await loadHandler();
  const casos: Array<Record<string, unknown> | null> = [
    null, // linha ausente
    { id: "n1", status: "enviado", tentativas: 1, dedupe_key: "cand-1:avanco" }, // terminal
    { id: "n1", status: "entregue", tentativas: 0, dedupe_key: "cand-1:avanco" }, // terminal
    { id: "n1", status: "falhou", tentativas: 5, dedupe_key: "cand-1:avanco" }, // cap 5
  ];
  for (const notifRow of casos) {
    const supa = makeRetryMockSupabase({ notifRow });
    const fetchMock = makeFetchMock(200);
    const res = await handler(
      makeRequest({ retry_id: "n1", evento: "avanco", candidatura_id: "cand-1" }, RETRY_BEARER),
      { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
    );
    assertEquals(res.status, 200);
    assertEquals((await res.json()).skipped, "nao_elegivel");
    assertEquals(fetchMock.calls.length, 0); // guard barra antes de qualquer envio
    assertEquals(supa.updates.length, 0); // linha não elegível → nada escrito
  }
});

Deno.test("41-04 — retry sucesso: fetch 200 → UPDATE status=enviado + provider_message_id keado por id", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    notifRow: { id: "n42", status: "falhou", tentativas: 1, dedupe_key: "cand-1:avanco" },
    candidaturaRow: CANDIDATURA_FIX,
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_success_123" });
  const res = await handler(
    makeRequest({ retry_id: "n42", evento: "avanco", candidatura_id: "cand-1" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "enviado");
  // fetch chamado 1x, carregando Idempotency-Key = retry_id (cinto secundário LEDGER-02)
  assertEquals(fetchMock.calls.length, 1);
  const headers = (fetchMock.calls[0].init?.headers ?? {}) as Record<string, string>;
  assertEquals(headers["Idempotency-Key"], "n42");
  // branch retry PULA o claim (nenhum upsert)
  assertEquals(supa.upserts.length, 0);
  // escrita de sucesso keada por id (não por dedupe_key), com provider_message_id
  const enviado = supa.updates.find((u) =>
    u.table === "notificacoes_enviadas" && u.patch.status === "enviado"
  );
  assert(enviado, "esperava um UPDATE status=enviado");
  assertEquals(enviado!.eqCol, "id");
  assertEquals(enviado!.eqVal, "n42");
  assertEquals(enviado!.patch.provider_message_id, "re_success_123");
});

Deno.test("41-04 — retry non-2xx (429): UPDATE status=falhou, tentativas incrementado, proxima_tentativa_em não-null", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    notifRow: { id: "n7", status: "pendente", tentativas: 2, dedupe_key: "cand-1:avanco" },
    candidaturaRow: CANDIDATURA_FIX,
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(429, { message: "rate limited" });
  const res = await handler(
    makeRequest({ retry_id: "n7", evento: "avanco", candidatura_id: "cand-1" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals(fetchMock.calls.length, 1);
  const falhou = supa.updates.find((u) =>
    u.table === "notificacoes_enviadas" && u.patch.status === "falhou"
  );
  assert(falhou, "esperava um UPDATE status=falhou");
  assertEquals(falhou!.eqCol, "id"); // keado por id, não por dedupe_key
  assertEquals(falhou!.eqVal, "n7");
  assertEquals(falhou!.patch.tentativas, 3); // 2 + 1 (incremento, não reset p/ 1)
  assert(
    falhou!.patch.proxima_tentativa_em != null,
    "backoff deve agendar próxima (n=3 < cap 5)",
  );
});

Deno.test("41-04 — caminho normal (sem retry_id) preservado: claim-before-send + escrita por dedupe_key", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: CANDIDATURA_FIX,
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_normal_1" });
  const res = await handler(
    makeRequest({ evento: "avanco", candidatura_id: "cand-1" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "enviado");
  // claim-before-send exercido (upsert ON CONFLICT dedupe_key)
  const claim = supa.upserts.find((u) => u.table === "notificacoes_enviadas");
  assert(claim, "caminho normal deve reivindicar via upsert");
  assertEquals(claim!.onConflict, "dedupe_key");
  // escrita de sucesso keada por dedupe_key (não por id)
  const enviado = supa.updates.find((u) => u.patch.status === "enviado");
  assert(enviado, "esperava UPDATE status=enviado");
  assertEquals(enviado!.eqCol, "dedupe_key");
  // Idempotency-Key = dedupe_key no caminho normal
  const headers = (fetchMock.calls[0].init?.headers ?? {}) as Record<string, string>;
  assertEquals(headers["Idempotency-Key"], "cand-1:avanco");
});

// ─── Gap-closure P39 (CR-01 / CR-02) — desfecho da decisão + survivor-guard ───
//
// Dois defeitos CRÍTICOS achados no code review da P39, ambos latentes só porque a
// entrega estava em 403 (DELIV-01). Os fixes vivem na EF, não no trigger:
//
//   CR-01 — o evento `decisao` do trigger cobre aprovado E rejeitado com corpo ids-only
//     (sem discriminador). `corpoDecisao` usava exclusivamente COPY_REJEICAO ⇒ todo
//     APROVADO recebia a rejeição. A EF já resolve `etapa_atual` na allowlist: passa a
//     derivar `desfecho` dali.
//
//   CR-02 — `trg_notif_confirmacao` é AFTER INSERT e o knockout é aplicado por um UPDATE
//     POSTERIOR (20260709000014:138), então a guarda do trigger lia o estado PRÉ-knockout
//     e nunca podia ser verdadeira. A EF é o lugar correto: `net.http_post` é assíncrono e
//     só entrega DEPOIS do COMMIT, então aqui a linha reflete o estado final. A guarda roda
//     ANTES do claim — knockout não deixa linha `pendente` para a varredura da P41 re-tentar.

/** Extrai o corpo JSON enviado ao Resend a partir da chamada capturada do fetch. */
function corpoEnviado(call: { init?: RequestInit }): { subject: string; html: string } {
  return JSON.parse(String(call.init?.body ?? "{}"));
}

Deno.test("CR-02 — confirmacao de KNOCKOUT (status=rejeitado) → skipped:knockout, zero fetch, zero claim", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, status: "rejeitado", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200);
  const res = await handler(
    makeRequest({ evento: "confirmacao", candidatura_id: "cand-ko" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).skipped, "knockout");
  assertEquals(fetchMock.calls.length, 0); // knockout = ZERO e-mail (decisão de kickoff)
  // guarda roda ANTES do claim → nenhuma linha `pendente` para a varredura re-tentar
  assertEquals(supa.upserts.length, 0);
});

Deno.test("CR-02 — confirmacao com opcao_knockout_id preenchido → skipped:knockout", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: {
      ...CANDIDATURA_FIX,
      status: "aguardando_resposta",
      opcao_knockout_id: "opt-ko-1",
    },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200);
  const res = await handler(
    makeRequest({ evento: "confirmacao", candidatura_id: "cand-ko2" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals((await res.json()).skipped, "knockout");
  assertEquals(fetchMock.calls.length, 0);
  assertEquals(supa.upserts.length, 0);
});

Deno.test("CR-02 — SURVIVOR (sem knockout) segue recebendo a confirmação", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: {
      ...CANDIDATURA_FIX,
      status: "aguardando_resposta",
      opcao_knockout_id: null,
    },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_ok" });
  const res = await handler(
    makeRequest({ evento: "confirmacao", candidatura_id: "cand-ok" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals(fetchMock.calls.length, 1); // survivor NÃO é barrado
});

Deno.test("CR-01 — decisao com etapa_atual='aprovado' envia APROVAÇÃO, nunca a rejeição", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: {
      ...CANDIDATURA_FIX,
      etapa_atual: "aprovado",
      status: "aguardando_resposta",
      opcao_knockout_id: null,
    },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_aprov" });
  await handler(
    makeRequest({ evento: "decisao", candidatura_id: "cand-aprov" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(fetchMock.calls.length, 1);
  const { subject, html } = corpoEnviado(fetchMock.calls[0]);
  assert(html.includes(COPY_APROVACAO), "aprovado deveria receber a COPY_APROVACAO");
  assert(
    !html.includes(COPY_REJEICAO),
    "REGRESSÃO CR-01: candidato APROVADO recebeu a cópia de REJEIÇÃO",
  );
  assert(/boa not[íi]cia/i.test(subject), `subject não sinaliza aprovação: ${subject}`);
});

Deno.test("CR-01 — decisao com etapa_atual='rejeitado' mantém a cópia congelada", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: {
      ...CANDIDATURA_FIX,
      etapa_atual: "rejeitado",
      status: "rejeitado",
      opcao_knockout_id: null,
    },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_rej" });
  await handler(
    makeRequest({ evento: "decisao", candidatura_id: "cand-rej" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(fetchMock.calls.length, 1);
  const { html } = corpoEnviado(fetchMock.calls[0]);
  assert(html.includes(COPY_REJEICAO), "rejeitado deveria manter a COPY_REJEICAO");
  assert(!html.includes(COPY_APROVACAO), "rejeitado não pode receber a aprovação");
});

// ─── 42-08 / REVISAO-04 — o 5º evento CABEADO, não só templatizado ──────────
//
// T-42-V2b/c pinam o TEMPLATE. Estes dois casos pinam a LIGAÇÃO: que o handler lê
// `decisao_final.revisao_veredito` e o entrega ao corpo. Sem eles, as duas frases de
// veredito passariam nos testes de template e mesmo assim NENHUM e-mail real as
// carregaria — a assimetria entre o que é testado e o que é entregue que produziu o W-01.

Deno.test("42-08 — revisao_respondida: o veredito VIVO chega ao corpo entregue", async () => {
  const { handler } = await loadHandler();
  for (
    const [veredito, esperada, proibida] of [
      ["mantida", "a decisão foi mantida", "decisão anterior foi revista"],
      ["revertida", "decisão anterior foi revista", "a decisão foi mantida"],
    ] as const
  ) {
    const supa = makeRetryMockSupabase({
      candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
      candidatoRow: CANDIDATO_FIX,
      vagaRow: VAGA_FIX,
      decisaoFinalRow: { revisao_veredito: veredito },
    });
    const fetchMock = makeFetchMock(200, { id: `re_rev_${veredito}` });
    const res = await handler(
      makeRequest(
        { evento: "revisao_respondida", candidatura_id: "cand-rev" },
        RETRY_BEARER,
      ),
      { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
    );
    assertEquals(res.status, 200);
    assertEquals(fetchMock.calls.length, 1, `${veredito}: o e-mail não foi enviado`);

    const { html } = corpoEnviado(fetchMock.calls[0]);
    assert(html.includes(esperada), `${veredito}: o corpo entregue não diz "${esperada}"`);
    assert(
      !html.includes(proibida),
      `${veredito}: o corpo entregue carrega a frase do OUTRO veredito`,
    );

    // O claim usa a chave do ramo `default` de montarDedupeKey e o template do 5º evento.
    assertEquals(supa.upserts.length, 1);
    assertEquals(supa.upserts[0].row.dedupe_key, "cand-rev:revisao_respondida");
    assertEquals(supa.upserts[0].row.evento, "revisao_respondida");
    assertEquals(supa.upserts[0].row.template, "revisao_respondida");
  }
});

Deno.test("42-08 — revisao_respondida SEM linha de decisao_final: neutro, nunca desfecho inventado", async () => {
  // Fail-safe do sítio nº9: o campo é opcional e a leitura pode não achar nada (corrida
  // com um teardown, linha removida). O e-mail ainda sai, e NÃO afirma um desfecho.
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    decisaoFinalRow: null,
  });
  const fetchMock = makeFetchMock(200, { id: "re_rev_neutro" });
  const res = await handler(
    makeRequest({ evento: "revisao_respondida", candidatura_id: "cand-rev" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals(fetchMock.calls.length, 1, "sem veredito o e-mail deveria sair mesmo assim");
  const { html } = corpoEnviado(fetchMock.calls[0]);
  assert(
    !/decis[ãa]o foi mantida|decis[ãa]o anterior foi revista/.test(html),
    "sem veredito o corpo AFIRMOU um desfecho — o servidor não sabia qual",
  );
  assert(html.includes("foi respondida"), "o corpo neutro ainda tem de informar a resposta");
});
