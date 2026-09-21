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
  extrairVersaoDaChave,
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
  // 48-08: `avanco` e `decisao` passaram a ser versionados pelo `historico_id` (4º parâmetro).
  // Sem ele, a chave LEGADA — é o que a EF produz enquanto o trigger não manda o campo.
  assertEquals(montarDedupeKey("avanco", "cand-1"), "cand-1:avanco");
  assertEquals(montarDedupeKey("confirmacao", "cand-1"), "cand-1:confirmacao");
  // `confirmacao` NÃO é versionado: uma candidatura tem uma confirmação.
  assertEquals(montarDedupeKey("confirmacao", "cand-1", undefined, H1), "cand-1:confirmacao");
  assertEquals(montarDedupeKey("decisao", "cand-1"), "cand-1:decisao");
});

// ─── 48-08 / JORN-18 — a chave distingue DECISÕES (uma por linha de histórico) ─────────
//
// O Defeito 18, provado no log da EF (2026-09-20 16:03:25 UTC): a rejeição na triagem foi
// DESPACHADA e descartada como `skipped:"duplicate"` porque a chave `{candidatura}:decisao`
// já estava ocupada pela aprovação anterior. O discriminador é o id da linha de
// `historico_candidatura` que o trigger AFTER INSERT recebe como NEW.id.

const H1 = "11111111-1111-4111-8111-111111111111";
const H2 = "22222222-2222-4222-8222-222222222222";

Deno.test("48-08 — montarDedupeKey: decisao/avanco versionados pelo historico_id; convite inalterado", () => {
  assertEquals(montarDedupeKey("decisao", "C", undefined, H1), `C:decisao:${H1}`);
  assertEquals(montarDedupeKey("decisao", "C"), "C:decisao"); // legado (tolerância)
  assertEquals(montarDedupeKey("avanco", "C", undefined, H1), `C:avanco:${H1}`);
  assertEquals(montarDedupeKey("convite", "C", "A", "D"), "A:convite:D");
  assertEquals(montarDedupeKey("convite", "C", "A"), "A:convite");
});

Deno.test("48-08 — BORDA adjacency: duas decisões ⇒ duas chaves; a MESMA decisão ⇒ a mesma chave", () => {
  const k1 = montarDedupeKey("decisao", "C", undefined, H1);
  const k2 = montarDedupeKey("decisao", "C", undefined, H2);
  assert(k1 !== k2, "duas linhas de histórico colapsaram na mesma chave — é o Defeito 18");
  assertEquals(montarDedupeKey("decisao", "C", undefined, H1), k1);
  // e nenhuma das versionadas colide com a legada (linhas antigas do ledger ficam intactas)
  assert(k1 !== montarDedupeKey("decisao", "C"));
});

Deno.test("48-08 — extrairVersaoDaChave: devolve o historico_id só de decisao/avanco com forma de uuid", () => {
  assertEquals(extrairVersaoDaChave(`C:decisao:${H1}`, "decisao"), H1);
  assertEquals(extrairVersaoDaChave(`C:avanco:${H2}`, "avanco"), H2);
  assertEquals(extrairVersaoDaChave("C:decisao", "decisao"), undefined); // legado
  assertEquals(extrairVersaoDaChave("C:decisao:nao-uuid", "decisao"), undefined);
  assertEquals(extrairVersaoDaChave(`A:convite:${H1}`, "convite"), undefined);
  assertEquals(extrairVersaoDaChave(`C:confirmacao:${H1}`, "confirmacao"), undefined);
});

Deno.test("48-08 — logSeguro deixa passar historico_id (é id, não PII)", () => {
  assertEquals(
    logSeguro({ evento: "decisao", historico_id: H1, email: "x@y.z" }),
    { evento: "decisao", historico_id: H1 },
  );
});

Deno.test("COMM-01 / 42-08 / 48-10 — mapa de evento cobre os 6 (ledger → email-config)", () => {
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
    // 6º evento de candidato (48-10 / D-22): a liberação da avaliação cognitiva.
    cognitivo_liberado: "avaliacao_cognitiva_liberada",
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
        /** 48-16 (JORN-U2): a base do app — o wiring lê `APP_BASE_URL`; ausente ⇒ default. */
        appBaseUrl?: string;
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
  /** 48-08: linha de `historico_candidatura` lida quando o corpo traz `historico_id`. */
  historicoRow?: Record<string, unknown> | null;
  apiKey?: string | null;
} = {}) {
  const updates: UpdateCapt[] = [];
  const upserts: UpsertCapt[] = [];
  /** 48-08: toda leitura, com as colunas pedidas e os filtros — prova de allowlist. */
  const selects: Array<{ table: string; cols?: string; eqs: Array<[string, unknown]> }> = [];
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
      case "historico_candidatura":
        return opts.historicoRow ?? null;
      default:
        return null;
    }
  };
  return {
    updates,
    upserts,
    selects,
    from(table: string) {
      return {
        select: (cols?: string) => {
          const reg = { table, cols, eqs: [] as Array<[string, unknown]> };
          selects.push(reg);
          const chain = {
            eq: (c: string, v: unknown) => {
              reg.eqs.push([c, v]);
              return chain;
            },
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
      ["mantida", "a decisão foi mantida", "reaberta e será decidida novamente"],
      // 48-13: a reabertura (D-01). Sem `prazo_nova_decisao_em` na linha, a frase sai sem data.
      ["revertida", "sua candidatura foi reaberta e será decidida novamente.", "a decisão foi mantida"],
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
    !/decis[ãa]o foi mantida|anterior foi revista|reaberta e ser[áa] decidida/.test(html),
    "sem veredito o corpo AFIRMOU um desfecho — o servidor não sabia qual",
  );
  assert(html.includes("foi respondida"), "o corpo neutro ainda tem de informar a resposta");
});

// ─── 48-08 / JORN-18 · JORN-20 — o handler com `historico_id` ───────────────────────────
//
// O corpo do trigger passa a carregar o id da transição. A EF (1) valida a FORMA (uuid) —
// senão 400 sem claim; (2) confere que a linha pertence à candidatura do corpo — senão
// `historico_inconsistente` sem claim e sem envio (nunca mandar a cópia de outra decisão);
// (3) deriva o DESFECHO de `historico.etapa_para`, não de `candidaturas.etapa_atual` na hora
// do envio (L1 da varredura: o retry de uma rejeição antiga feito depois de uma nova
// aprovação sairia com a cópia de APROVAÇÃO); (4) versiona a chave pelo historico_id.

const CAND_H = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

Deno.test("48-08 — BORDA empty: historico_id que não é uuid → 400 VALIDATION, nenhum claim, nenhum envio", async () => {
  const { handler } = await loadHandler();
  for (const historico_id of ["nao-uuid", 42, "", `${H1}x`]) {
    const supa = makeRetryMockSupabase({
      candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "rejeitado", status: "rejeitado" },
      candidatoRow: CANDIDATO_FIX,
      vagaRow: VAGA_FIX,
    });
    const fetchMock = makeFetchMock(200);
    const res = await handler(
      makeRequest({ evento: "decisao", candidatura_id: CAND_H, historico_id }, RETRY_BEARER),
      { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
    );
    assertEquals(res.status, 400, `historico_id=${JSON.stringify(historico_id)}`);
    assertEquals((await res.json()).error_code, "VALIDATION");
    assertEquals(supa.upserts.length, 0);
    assertEquals(fetchMock.calls.length, 0);
  }
});

Deno.test("48-08 — historico_id de OUTRA candidatura (ou ausente) → 200 historico_inconsistente, sem claim e sem envio", async () => {
  const { handler } = await loadHandler();
  for (
    const historicoRow of [
      { etapa_para: "rejeitado", candidatura_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
      null,
    ]
  ) {
    const supa = makeRetryMockSupabase({
      candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "rejeitado", status: "rejeitado" },
      candidatoRow: CANDIDATO_FIX,
      vagaRow: VAGA_FIX,
      historicoRow,
    });
    const fetchMock = makeFetchMock(200);
    const res = await handler(
      makeRequest({ evento: "decisao", candidatura_id: CAND_H, historico_id: H1 }, RETRY_BEARER),
      { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
    );
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(json.ok, true);
    assertEquals(json.skipped, "historico_inconsistente");
    assertEquals(supa.upserts.length, 0, "não pode reivindicar a chave de uma decisão inconsistente");
    assertEquals(fetchMock.calls.length, 0);
  }
});

Deno.test("48-08 — a chave do claim é {candidatura}:decisao:{historico_id} e a leitura do histórico é por allowlist", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "rejeitado", status: "rejeitado" },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    historicoRow: { etapa_para: "rejeitado", candidatura_id: CAND_H },
  });
  const fetchMock = makeFetchMock(200, { id: "re_h1" });
  const res = await handler(
    makeRequest({ evento: "decisao", candidatura_id: CAND_H, historico_id: H1 }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals(supa.upserts.length, 1);
  assertEquals(supa.upserts[0].row.dedupe_key, `${CAND_H}:decisao:${H1}`);
  const headers = (fetchMock.calls[0].init?.headers ?? {}) as Record<string, string>;
  assertEquals(headers["Idempotency-Key"], `${CAND_H}:decisao:${H1}`);
  const leitura = supa.selects.find((s) => s.table === "historico_candidatura");
  assert(leitura, "o histórico não foi lido");
  assertEquals(leitura!.cols, "etapa_para, candidatura_id");
  assertEquals(leitura!.eqs, [["id", H1]]);
});

Deno.test("48-08 — BORDA ordering (L1): histórico diz rejeitado, candidatura HOJE aprovada → cópia de REJEIÇÃO", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "aprovado", status: "aguardando_resposta" },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    historicoRow: { etapa_para: "rejeitado", candidatura_id: CAND_H },
  });
  const fetchMock = makeFetchMock(200, { id: "re_l1" });
  await handler(
    makeRequest({ evento: "decisao", candidatura_id: CAND_H, historico_id: H1 }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(fetchMock.calls.length, 1);
  const { html } = corpoEnviado(fetchMock.calls[0]);
  assert(html.includes(COPY_REJEICAO), "o e-mail da decisão ANTIGA tem de anunciar a rejeição");
  assert(!html.includes(COPY_APROVACAO), "L1: a cópia veio do estado ATUAL, não da decisão da chave");
});

Deno.test("48-08 — e o inverso: histórico aprovado, candidatura hoje rejeitada → cópia de APROVAÇÃO", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "rejeitado", status: "rejeitado" },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    historicoRow: { etapa_para: "aprovado", candidatura_id: CAND_H },
  });
  const fetchMock = makeFetchMock(200, { id: "re_l1b" });
  await handler(
    makeRequest({ evento: "decisao", candidatura_id: CAND_H, historico_id: H2 }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  const { html } = corpoEnviado(fetchMock.calls[0]);
  assert(html.includes(COPY_APROVACAO));
  assert(!html.includes(COPY_REJEICAO));
});

Deno.test("48-08 — branch retry: o historico_id é DERIVADO da dedupe_key da linha e o desfecho vem do histórico", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    notifRow: { id: "n-h", status: "falhou", tentativas: 1, dedupe_key: `${CAND_H}:decisao:${H1}` },
    candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "aprovado", status: "aguardando_resposta" },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    historicoRow: { etapa_para: "rejeitado", candidatura_id: CAND_H },
  });
  const fetchMock = makeFetchMock(200, { id: "re_retry_h" });
  // A varredura NÃO manda historico_id (20260805000007:768-777) — só retry_id/evento/candidatura.
  const res = await handler(
    makeRequest({ retry_id: "n-h", evento: "decisao", candidatura_id: CAND_H }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  const leitura = supa.selects.find((s) => s.table === "historico_candidatura");
  assert(leitura, "o retry não leu o histórico da chave");
  assertEquals(leitura!.eqs, [["id", H1]]);
  const { html } = corpoEnviado(fetchMock.calls[0]);
  assert(html.includes(COPY_REJEICAO), "retry de rejeição antiga saiu com a cópia do estado atual");
  // O retry continua deduplicado pela linha existente: sem claim, Idempotency-Key = retry_id.
  assertEquals(supa.upserts.length, 0);
  const headers = (fetchMock.calls[0].init?.headers ?? {}) as Record<string, string>;
  assertEquals(headers["Idempotency-Key"], "n-h");
});

Deno.test("48-08 — corpo SEM historico_id: chave legada e desfecho por etapa_atual (tolerância pré-migration)", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "aprovado", status: "aguardando_resposta" },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    historicoRow: { etapa_para: "rejeitado", candidatura_id: CAND_H }, // não pode ser lido
  });
  const fetchMock = makeFetchMock(200, { id: "re_legado" });
  await handler(
    makeRequest({ evento: "decisao", candidatura_id: CAND_H }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(supa.upserts[0].row.dedupe_key, `${CAND_H}:decisao`);
  assertEquals(supa.selects.filter((s) => s.table === "historico_candidatura").length, 0);
  const { html } = corpoEnviado(fetchMock.calls[0]);
  assert(html.includes(COPY_APROVACAO), "sem histórico, o desfecho segue vindo de etapa_atual");
});

Deno.test("48-08 — avanco com historico_id: chave versionada, histórico conferido", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "avaliacao_assincrona", status: "aguardando_resposta" },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    historicoRow: { etapa_para: "avaliacao_assincrona", candidatura_id: CAND_H },
  });
  const fetchMock = makeFetchMock(200, { id: "re_av" });
  await handler(
    makeRequest({ evento: "avanco", candidatura_id: CAND_H, historico_id: H2 }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(supa.upserts[0].row.dedupe_key, `${CAND_H}:avanco:${H2}`);
  assertEquals(fetchMock.calls.length, 1);
});

// ─── 48-08 Task 2 — o CICLO de revisão também tem chave própria ─────────────────────────
//
// A premissa «no máximo UMA revisão por candidatura» (docblock antigo de montarDedupeKey)
// cai com D-01: reabrir devolve a candidatura a decisao_final, e um 2º pedido de revisão
// terá uma 2ª resposta. Sem discriminador, a resposta do 2º ciclo seria engolida pela chave
// `{candidatura}:revisao_respondida` do 1º. O ciclo é o instante do pedido
// (`extract(epoch from revisao_solicitada_em)::bigint`), passado pelo trigger como texto.

const CICLO = "1758400000";

Deno.test("48-08 T2 — montarDedupeKey: revisao_respondida versionada pelo ciclo; sem ciclo, chave legada", () => {
  assertEquals(
    montarDedupeKey("revisao_respondida", "C", undefined, CICLO),
    `C:revisao_respondida:${CICLO}`,
  );
  assertEquals(montarDedupeKey("revisao_respondida", "C"), "C:revisao_respondida");
  assert(
    montarDedupeKey("revisao_respondida", "C", undefined, CICLO) !==
      montarDedupeKey("revisao_respondida", "C", undefined, "1758500000"),
    "dois ciclos de revisão colapsaram na mesma chave",
  );
});

Deno.test("48-08 T2 — ciclo inválido → 400 VALIDATION, nenhum claim", async () => {
  const { handler } = await loadHandler();
  for (const ciclo of ["abc", 1758400000, "", "12345678901234", "-1", "17.5", " 1"]) {
    const supa = makeRetryMockSupabase({
      candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
      candidatoRow: CANDIDATO_FIX,
      vagaRow: VAGA_FIX,
      decisaoFinalRow: { revisao_veredito: "mantida" },
    });
    const fetchMock = makeFetchMock(200);
    const res = await handler(
      makeRequest({ evento: "revisao_respondida", candidatura_id: "cand-rev", ciclo }, RETRY_BEARER),
      { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
    );
    assertEquals(res.status, 400, `ciclo=${JSON.stringify(ciclo)}`);
    assertEquals((await res.json()).error_code, "VALIDATION");
    assertEquals(supa.upserts.length, 0);
    assertEquals(fetchMock.calls.length, 0);
  }
});

Deno.test("48-08 T2 — revisao_respondida com ciclo válido: a chave do claim carrega o ciclo", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    decisaoFinalRow: { revisao_veredito: "mantida" },
  });
  const fetchMock = makeFetchMock(200, { id: "re_ciclo" });
  const res = await handler(
    makeRequest({ evento: "revisao_respondida", candidatura_id: "cand-rev", ciclo: CICLO }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals(supa.upserts.length, 1);
  assertEquals(supa.upserts[0].row.dedupe_key, `cand-rev:revisao_respondida:${CICLO}`);
  assertEquals(fetchMock.calls.length, 1);
});

Deno.test("48-08 T2 — o ciclo NÃO versiona outros eventos (decisao segue pelo historico_id)", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, etapa_atual: "rejeitado", status: "rejeitado" },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_dec_ciclo" });
  await handler(
    makeRequest({ evento: "decisao", candidatura_id: CAND_H, ciclo: CICLO }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(supa.upserts[0].row.dedupe_key, `${CAND_H}:decisao`);
});

Deno.test("48-08 T3 — ciclo/historico_id NULL valem como AUSENTES (chave legada, e-mail sai) — jsonb_build_object manda null, não omite", async () => {
  // O trigger monta o corpo com jsonb_build_object: um revisao_solicitada_em nulo vira
  // `"ciclo": null`, não a ausência da chave. Recusar com 400 perderia o e-mail em silêncio
  // (net.http_post é at-most-once). Nulo = sem discriminador = comportamento legado.
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    decisaoFinalRow: { revisao_veredito: "mantida" },
  });
  const fetchMock = makeFetchMock(200, { id: "re_null" });
  const res = await handler(
    makeRequest(
      { evento: "revisao_respondida", candidatura_id: "cand-rev", ciclo: null, historico_id: null },
      RETRY_BEARER,
    ),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals(supa.upserts[0].row.dedupe_key, "cand-rev:revisao_respondida");
  assertEquals(fetchMock.calls.length, 1);
});

// ─── 48-10 / D-22 — a liberação da avaliação cognitiva avisa o candidato ────────────────
//
// `trg_notif_cognitivo_liberado` (migration 20260921000010) despacha `cognitivo_liberado` com
// `ciclo = extract(epoch from liberado_em)::bigint::text`. A chave é por LIBERAÇÃO:
// `{candidatura}:cognitivo_liberado:{ciclo}` — uma re-liberação depois de uma revogação
// recarimba `liberado_em` e é um aviso novo; a mesma liberação entregue duas vezes colapsa.
// O `ciclo` é o MESMO campo genérico do 48-08 (mesma forma, mesma validação).

const CAND_COG = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CICLO_COG = "1758400000";

Deno.test("48-10 — montarDedupeKey('cognitivo_liberado', C, undefined, ciclo) → C:cognitivo_liberado:ciclo", () => {
  assertEquals(
    montarDedupeKey("cognitivo_liberado", "C", undefined, CICLO_COG),
    `C:cognitivo_liberado:${CICLO_COG}`,
  );
  // Duas liberações (revogou e liberou de novo) ⇒ duas chaves.
  assert(
    montarDedupeKey("cognitivo_liberado", "C", undefined, CICLO_COG) !==
      montarDedupeKey("cognitivo_liberado", "C", undefined, "1758500000"),
    "duas liberações colapsaram na mesma chave — a re-liberação seria engolida",
  );
  // O retry não deriva nada da chave para este evento (não há linha de histórico a ler).
  assertEquals(extrairVersaoDaChave(`C:cognitivo_liberado:${CICLO_COG}`, "cognitivo_liberado"), undefined);
});

Deno.test("48-10 — cognitivo_liberado com ciclo válido: claim versionado, template avaliacao_cognitiva_liberada, 1 envio", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_cog" });
  const res = await handler(
    makeRequest({ evento: "cognitivo_liberado", candidatura_id: CAND_COG, ciclo: CICLO_COG }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "enviado");
  assertEquals(supa.upserts.length, 1);
  assertEquals(supa.upserts[0].row.dedupe_key, `${CAND_COG}:cognitivo_liberado:${CICLO_COG}`);
  assertEquals(supa.upserts[0].row.evento, "cognitivo_liberado");
  assertEquals(supa.upserts[0].row.template, "avaliacao_cognitiva_liberada");
  assertEquals(fetchMock.calls.length, 1);
  const { subject, html } = corpoEnviado(fetchMock.calls[0]);
  assert(/avalia[çc][ãa]o cognitiva/i.test(subject), `assunto: ${subject}`);
  assert(html.includes(VAGA_FIX.titulo), "corpo sem a vaga");
  // Este evento não lê histórico nem decisão — allowlist mínima (ids + nome/e-mail + vaga).
  const tabelas = new Set(supa.selects.map((s) => s.table));
  assert(!tabelas.has("historico_candidatura"), "leu historico_candidatura sem precisar");
  assert(!tabelas.has("decisao_final"), "leu decisao_final sem precisar");
});

Deno.test("48-10 — cognitivo_liberado com ciclo malformado ('x') → 400 VALIDATION, nenhum claim, nenhum envio", async () => {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200);
  const res = await handler(
    makeRequest({ evento: "cognitivo_liberado", candidatura_id: CAND_COG, ciclo: "x" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error_code, "VALIDATION");
  assertEquals(supa.upserts.length, 0);
  assertEquals(fetchMock.calls.length, 0);
});

Deno.test("48-10 — cognitivo_liberado SEM ciclo (ou null): chave legada, o e-mail sai (tolerância)", async () => {
  const { handler } = await loadHandler();
  for (const corpo of [
    { evento: "cognitivo_liberado", candidatura_id: CAND_COG },
    { evento: "cognitivo_liberado", candidatura_id: CAND_COG, ciclo: null },
  ]) {
    const supa = makeRetryMockSupabase({
      candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
      candidatoRow: CANDIDATO_FIX,
      vagaRow: VAGA_FIX,
    });
    const fetchMock = makeFetchMock(200, { id: "re_cog_legado" });
    const res = await handler(makeRequest(corpo, RETRY_BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: RETRY_BEARER,
    });
    assertEquals(res.status, 200);
    assertEquals(supa.upserts[0].row.dedupe_key, `${CAND_COG}:cognitivo_liberado`);
    assertEquals(fetchMock.calls.length, 1);
  }
});

Deno.test("48-10 — evento de CANDIDATO: o retry da varredura (sem ciclo no corpo) re-tenta a linha existente por id", async () => {
  // `varrer_retry_notificacoes` NÃO exclui `cognitivo_liberado` (não é evento de RH) e reenvia
  // só {retry_id, evento, candidatura_id, agendamento_id}. O branch retry não precisa do ciclo:
  // atualiza a linha por id e usa o retry_id como Idempotency-Key.
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    notifRow: {
      id: "n-cog",
      status: "falhou",
      tentativas: 1,
      dedupe_key: `${CAND_COG}:cognitivo_liberado:${CICLO_COG}`,
    },
    candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_cog_retry" });
  const res = await handler(
    makeRequest({ retry_id: "n-cog", evento: "cognitivo_liberado", candidatura_id: CAND_COG }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "enviado");
  assertEquals(supa.upserts.length, 0);
  const headers = (fetchMock.calls[0].init?.headers ?? {}) as Record<string, string>;
  assertEquals(headers["Idempotency-Key"], "n-cog");
  const enviado = supa.updates.find((u) => u.patch.status === "enviado");
  assertEquals(enviado?.eqCol, "id");
  assertEquals(enviado?.eqVal, "n-cog");
});

// ─── 48-13 / JORN-19 · D-01 — o e-mail da reabertura diz a DATA EXATA ───────────────────
//
// O 48-11 grava `decisao_final.prazo_nova_decisao_em` = 00:00 de São Paulo do dia SEGUINTE à
// data-limite (fim do 10º dia corrido). A data dita ao candidato é a data-limite: o instante
// do prazo MENOS 1 segundo, em America/Sao_Paulo. Leitura guardada por `revisao_respondida`,
// allowlist de DUAS colunas (`revisao_resultado`, a justificativa do revisor, segue fora).

const FRASE_D01 = "Após a revisão, sua candidatura foi reaberta e será decidida novamente";

async function enviarRevisao(decisaoFinalRow: Record<string, unknown> | null) {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow: { ...CANDIDATURA_FIX, status: "em_andamento", opcao_knockout_id: null },
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
    decisaoFinalRow,
  });
  const fetchMock = makeFetchMock(200, { id: "re_rev_48_13" });
  const res = await handler(
    makeRequest({ evento: "revisao_respondida", candidatura_id: "cand-rev" }, RETRY_BEARER),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER },
  );
  assertEquals(res.status, 200);
  assertEquals(fetchMock.calls.length, 1, "o e-mail da revisão não foi enviado");
  return { supa, html: corpoEnviado(fetchMock.calls[0]).html };
}

Deno.test("48-13 — revertida com prazo 2026-10-04T03:00:00Z ⇒ «… até 03/10/2026.» (SP, prazo − 1 s)", async () => {
  const { html } = await enviarRevisao({
    revisao_veredito: "revertida",
    prazo_nova_decisao_em: "2026-10-04T03:00:00Z",
  });
  assert(html.includes(`${FRASE_D01} até 03/10/2026.`), "o corpo não diz a data-limite em SP");
  assert(!html.includes("04/10/2026"), "a data saiu com um dia a mais (instante do prazo sem o −1 s)");
});

Deno.test("48-13 — a data é a de São Paulo, não a de UTC (prazo 2026-10-10T03:00:00Z ⇒ 09/10/2026)", async () => {
  const { html } = await enviarRevisao({
    revisao_veredito: "revertida",
    prazo_nova_decisao_em: "2026-10-10T03:00:00Z",
  });
  assert(html.includes(`${FRASE_D01} até 09/10/2026.`), "a data não foi calculada em America/Sao_Paulo");
});

Deno.test("48-13 — revertida com prazo ilegível ⇒ frase SEM data (nunca data inventada)", async () => {
  for (const prazo of [null, "não-é-data", 12345]) {
    const { html } = await enviarRevisao({ revisao_veredito: "revertida", prazo_nova_decisao_em: prazo });
    assert(html.includes(`${FRASE_D01}.`), `prazo ${JSON.stringify(prazo)}: esperada a frase sem data`);
    assert(!/novamente até/.test(html), `prazo ${JSON.stringify(prazo)}: saiu uma data`);
  }
});

Deno.test("48-13 — mantida com prazo na linha NÃO fala de data nem de reabertura", async () => {
  const { html } = await enviarRevisao({
    revisao_veredito: "mantida",
    prazo_nova_decisao_em: "2026-10-04T03:00:00Z",
  });
  assert(html.includes("a decisão foi mantida"));
  assert(!/03\/10\/2026|reaberta/.test(html), "mantida recebeu a data ou a reabertura");
});

Deno.test("48-13 — leitura de decisao_final por allowlist de DUAS colunas, só em revisao_respondida", async () => {
  const { supa } = await enviarRevisao({ revisao_veredito: "revertida", prazo_nova_decisao_em: null });
  const leituras = supa.selects.filter((s) => s.table === "decisao_final");
  assertEquals(leituras.length, 1, "decisao_final lida mais de uma vez (ou nenhuma)");
  const cols = String(leituras[0].cols).split(",").map((c) => c.trim()).sort();
  assertEquals(cols, ["prazo_nova_decisao_em", "revisao_veredito"]);
  assertEquals(leituras[0].eqs, [["candidatura_id", "cand-rev"]]);
});

// ─── 48-16 / JORN-U2 · D-09 — o e-mail que a EF ENTREGA leva ao login do candidato ───────
//
// Os testes de template provam o BLOCO; estes provam a LIGAÇÃO: que o handler monta o
// `urlLogin` e o passa ao `renderarEmail` — senão o bloco passaria nos testes e nenhum
// e-mail real o carregaria (a assimetria testado × entregue que produziu o W-01).
// A base entra por `deps.appBaseUrl` (o wiring lê `APP_BASE_URL`), não por `Deno.env` dentro
// do handler — a suíte roda sem `--allow-env` por contrato (decisão do 48-07).

const LOGIN_PADRAO = "https://rh.beautysmile.com.br/auth/login";

async function enviarComBase(
  corpo: Record<string, unknown>,
  appBaseUrl: string | undefined,
  candidaturaRow: Record<string, unknown> = {
    ...CANDIDATURA_FIX,
    status: "aguardando_resposta",
    opcao_knockout_id: null,
  },
) {
  const { handler } = await loadHandler();
  const supa = makeRetryMockSupabase({
    candidaturaRow,
    candidatoRow: CANDIDATO_FIX,
    vagaRow: VAGA_FIX,
  });
  const fetchMock = makeFetchMock(200, { id: "re_u2" });
  const deps = { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: RETRY_BEARER, appBaseUrl };
  const res = await handler(makeRequest(corpo, RETRY_BEARER), deps);
  assertEquals(res.status, 200);
  assertEquals(fetchMock.calls.length, 1, "o e-mail não foi enviado");
  return corpoEnviado(fetchMock.calls[0]).html;
}

Deno.test("48-16 — APP_BASE_URL ausente ⇒ o e-mail entregue tem o botão e o link do login padrão", async () => {
  const html = await enviarComBase({ evento: "confirmacao", candidatura_id: "cand-u2" }, undefined);
  assert(html.includes("Acessar meu painel"), "o e-mail entregue não tem o botão de acesso");
  assert(html.includes(`href="${LOGIN_PADRAO}"`), "o botão não aponta para o login padrão");
  assert(html.includes(`acesse: ${LOGIN_PADRAO}`), "falta o link por extenso");
});

Deno.test("48-16 — APP_BASE_URL malformada ('lixo', 'javascript:', http:) ⇒ o login padrão", async () => {
  for (const base of ["lixo", "javascript:alert(1)", "http://rh.beautysmile.com.br", ""]) {
    const html = await enviarComBase({ evento: "confirmacao", candidatura_id: "cand-u2" }, base);
    assert(html.includes(`href="${LOGIN_PADRAO}"`), `base ${JSON.stringify(base)}: não caiu no default`);
    assert(!/javascript:/i.test(html), `base ${JSON.stringify(base)}: esquema hostil no e-mail`);
  }
});

Deno.test("48-16 — APP_BASE_URL https válida ⇒ o login daquela origem (preview)", async () => {
  const html = await enviarComBase(
    { evento: "confirmacao", candidatura_id: "cand-u2" },
    "https://preview.example.com/qualquer/caminho",
  );
  assert(html.includes('href="https://preview.example.com/auth/login"'), "a base válida não foi usada");
});

Deno.test("48-16 — a DECISÃO também leva ao login: aprovado, rejeitado e knockout", async () => {
  const casos: Array<Record<string, unknown>> = [
    { ...CANDIDATURA_FIX, etapa_atual: "aprovado", status: "aguardando_resposta", opcao_knockout_id: null },
    { ...CANDIDATURA_FIX, etapa_atual: "rejeitado", status: "rejeitado", opcao_knockout_id: null },
    // knockout: etapa 'inscricao' preservada por desenho, status rejeitado, opção marcada
    { ...CANDIDATURA_FIX, etapa_atual: "inscricao", status: "rejeitado", opcao_knockout_id: "opt-ko" },
  ];
  for (const row of casos) {
    const html = await enviarComBase({ evento: "decisao", candidatura_id: "cand-dec" }, undefined, row);
    assert(html.includes(`href="${LOGIN_PADRAO}"`), `decisao ${String(row.etapa_atual)}: sem o link`);
  }
});
