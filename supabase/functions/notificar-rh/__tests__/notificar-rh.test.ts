/**
 * Phase 42 / Plan 42-07 — REVISAO-01: invariantes puros da EF `notificar-rh`.
 *
 * Testa `helpers.ts` (funções puras) SEM disparar `Deno.serve` — mesmo padrão do
 * irmão `notificar-candidato/__tests__/notificar-candidato.test.ts`. Zero rede, zero
 * segredo: `--allow-net` NÃO é passado, e nenhum caso aqui toca `fetch`.
 *
 * O que este arquivo prova, em ordem de importância:
 *   1. PRIVACIDADE (T-42-24) — o corpo do e-mail ao RH não carrega nome de candidato
 *      nem `candidatura_id`. Em modo `teste` o corpo inteiro viaja para `resend.dev`,
 *      um domínio de TERCEIRO. A asserção é negativa e estrutural: a assinatura de
 *      `corpoRevisaoSolicitada` não aceita esses campos, e um objeto com campo extra
 *      injetado por qualquer caminho não os faz aparecer no HTML.
 *   2. NÃO-COLISÃO da `dedupe_key` — a chave é POR DESTINATÁRIO. Uma chave só por
 *      candidatura faria o primeiro RH consumir o claim e os demais receberem
 *      `duplicate`, silenciosamente (T-42-26).
 *   3. XSS — `tituloVaga` é dado digitado por humano no CRUD de vagas; sai escapado.
 *   4. LOG (T-42-24) — `logSeguroRh` é allowlist e NÃO deixa passar `dedupe_key`
 *      (que embute o `candidatura_id` completo E o `user_id` do RH).
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/notificar-rh
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  APP_BASE_URL_PADRAO,
  assuntoCandidaturaEncerradaAPedido,
  assuntoRevisaoSolicitada,
  construirCorpoResendRh,
  corpoCandidaturaEncerradaAPedido,
  corpoRevisaoSolicitada,
  EVENTO_LEDGER_RH_ENCERRAMENTO,
  LABEL_SINK_RH_ENCERRAMENTO,
  logSeguroRh,
  montarDedupeKeyRh,
  montarDedupeKeyRhEncerramento,
  montarUrlFila,
  montarUrlListaVaga,
  refCurta,
  TEMPLATE_LEDGER_RH_ENCERRAMENTO,
} from "../helpers.ts";
import { FROM, REPLY_TO } from "../../_shared/email-config.ts";

const TITULO = "Dentista Sênior";
const URL_FILA = "https://recruta.beautysmile.com.br/rh/revisoes";

// ─── 1) dedupe_key por destinatário ─────────────────────────────────────────

Deno.test("REVISAO-01 — montarDedupeKeyRh: '{candidatura}:revisao_solicitada:{user}'", () => {
  assertEquals(
    montarDedupeKeyRh("cand-1", "user-9"),
    "cand-1:revisao_solicitada:user-9",
  );
});

Deno.test("REVISAO-01 — NÃO-COLISÃO: dois destinatários da MESMA candidatura ⇒ chaves distintas", () => {
  const a = montarDedupeKeyRh("cand-1", "admin-aaa");
  const b = montarDedupeKeyRh("cand-1", "recrutador-bbb");
  assert(
    a !== b,
    "chave por candidatura (e não por destinatário) faria o 1º RH consumir o claim " +
      "e todos os demais receberem skipped:duplicate em silêncio",
  );
  assert(a.endsWith("admin-aaa"), `a chave deve terminar no user_id: ${a}`);
  assert(b.endsWith("recrutador-bbb"), `a chave deve terminar no user_id: ${b}`);
});

// ─── 2) assunto ─────────────────────────────────────────────────────────────

Deno.test("REVISAO-01 — assuntoRevisaoSolicitada nomeia a vaga e nunca um candidato", () => {
  const s = assuntoRevisaoSolicitada(TITULO);
  assert(s.length > 0, "assunto não pode ser vazio");
  assert(s.includes(TITULO), `assunto deve citar a vaga: ${s}`);
  // A assinatura não tem parâmetro de nome — a asserção pinada é que a PALAVRA
  // 'candidato' não aparece, tornando impossível um "candidato Fulano" futuro.
  assert(
    !/candidat/i.test(s),
    `assunto não deve nomear o candidato (RH vê o nome na fila, não no e-mail): ${s}`,
  );
});

Deno.test("REVISAO-01 — assuntoRevisaoSolicitada neutraliza CR/LF (header injection)", () => {
  const s = assuntoRevisaoSolicitada("Vaga X\r\nBcc: intruso@exemplo.com");
  assert(!/[\r\n]/.test(s), `assunto com CR/LF permite injeção de header: ${s}`);
});

// ─── 3) corpo: privacidade + XSS + link ─────────────────────────────────────

Deno.test("REVISAO-01 — corpoRevisaoSolicitada traz a vaga escapada e o link da fila", () => {
  const html = corpoRevisaoSolicitada({ tituloVaga: TITULO, urlFila: URL_FILA });
  assert(html.includes(TITULO), "o corpo deve citar o título da vaga");
  assert(html.includes(URL_FILA), "o corpo deve levar para a fila /rh/revisoes");
  assert(html.startsWith("<!doctype html>"), "deve usar layoutBase do projeto");
});

Deno.test("T-42-24 — corpoRevisaoSolicitada NÃO emite nome de candidato nem candidatura_id", () => {
  // A assinatura não aceita esses campos. Este caso prova que injetá-los por um
  // caminho lateral (objeto com campo extra) também não os faz aparecer no HTML —
  // em modo `teste` este corpo viaja INTEIRO para resend.dev, domínio de terceiro.
  const NOME = "Fulano de Tal";
  const CANDIDATURA = "11111111-2222-3333-4444-555555555555";
  const argsInjetados = {
    tituloVaga: TITULO,
    urlFila: URL_FILA,
    nomeCandidato: NOME,
    candidatura_id: CANDIDATURA,
    email: "candidato.real@gmail.com",
  } as unknown as Parameters<typeof corpoRevisaoSolicitada>[0];

  const html = corpoRevisaoSolicitada(argsInjetados);
  assert(!html.includes(NOME), "REGRESSÃO T-42-24: nome de candidato no corpo do e-mail ao RH");
  assert(!html.includes(CANDIDATURA), "REGRESSÃO T-42-24: candidatura_id no corpo do e-mail");
  assert(
    !html.includes("candidato.real@gmail.com"),
    "REGRESSÃO T-42-24: e-mail de candidato no corpo",
  );
});

Deno.test("T-42-24 — corpoRevisaoSolicitada escapa HTML no título da vaga (XSS)", () => {
  const html = corpoRevisaoSolicitada({
    tituloVaga: '<script>alert("x")</script>',
    urlFila: URL_FILA,
  });
  assert(html.includes("&lt;script&gt;"), "o título deve sair escapado");
  assert(
    !html.includes("<script>"),
    "REGRESSÃO XSS: tag <script> crua no corpo do e-mail",
  );
});

// ─── 4) corpo Resend ────────────────────────────────────────────────────────

Deno.test("REVISAO-01 — construirCorpoResendRh usa FROM/REPLY_TO, sem anexo e sem a chave", () => {
  const corpo = construirCorpoResendRh({
    para: "delivered+revisao_solicitada_rh@resend.dev",
    subject: "s",
    html: "<p>h</p>",
  });
  assertEquals(corpo.from, FROM);
  assertEquals(corpo.reply_to, REPLY_TO);
  assertEquals(corpo.to, "delivered+revisao_solicitada_rh@resend.dev");
  assertEquals("attachments" in corpo, false, "o e-mail ao RH não carrega anexo");
  const serial = JSON.stringify(corpo);
  assert(
    !/authorization|bearer|api[_-]?key/i.test(serial),
    "o corpo JSON nunca pode conter a chave da API",
  );
});

// ─── 5) log seguro ──────────────────────────────────────────────────────────

Deno.test("T-42-24 — logSeguroRh é allowlist e barra dedupe_key (embute candidatura_id + user_id)", () => {
  const filtrado = logSeguroRh({
    evento: "revisao_solicitada",
    status: "enviado",
    destinatarios: 5,
    candidatura_ref: "11111111",
    // tudo abaixo deve ser descartado
    dedupe_key: "11111111-2222-3333-4444-555555555555:revisao_solicitada:user-9",
    candidatura_id: "11111111-2222-3333-4444-555555555555",
    user_id: "9e6b0f1a-0000-0000-0000-000000000000",
    email: "rh.real@beautysmile.com.br",
    nome_completo: "Fulana RH",
    html: "<p>corpo</p>",
  });
  assertEquals(filtrado, {
    evento: "revisao_solicitada",
    status: "enviado",
    destinatarios: 5,
    candidatura_ref: "11111111",
  });
  for (const proibida of ["dedupe_key", "candidatura_id", "user_id", "email", "nome_completo", "html"]) {
    assert(!(proibida in filtrado), `logSeguroRh deixou passar '${proibida}'`);
  }
});

Deno.test("T-42-24 — refCurta trunca o id (nunca o uuid completo em log)", () => {
  assertEquals(refCurta("11111111-2222-3333-4444-555555555555"), "11111111");
  assertEquals(refCurta("abc"), "abc");
  assertEquals(refCurta(""), "");
});

// ─── 6) URL da fila ────────────────────────────────────────────────────────

Deno.test("REVISAO-01 — montarUrlFila: default canônico, barra final normalizada", () => {
  assertEquals(montarUrlFila(), `${APP_BASE_URL_PADRAO}/rh/revisoes`);
  assertEquals(
    montarUrlFila("https://recruta.beautysmile.com.br/"),
    "https://recruta.beautysmile.com.br/rh/revisoes",
  );
});

Deno.test("REVISAO-01 — montarUrlFila rejeita base malformada e cai no default (link nunca quebra)", () => {
  // Uma env malformada NÃO pode produzir um link hostil nem quebrado num e-mail
  // interno — mesma doutrina fail-safe de `resolverModo` (valor ruim ⇒ default).
  for (const ruim of ["", "   ", "javascript:alert(1)", "http://inseguro.example", "nao-e-url"]) {
    assertEquals(
      montarUrlFila(ruim),
      `${APP_BASE_URL_PADRAO}/rh/revisoes`,
      `base '${ruim}' deveria cair no default`,
    );
  }
});

/*
 * ═══ handler(req, deps) — deps mockadas, ZERO rede ══════════════════════════
 *
 * Importa `../index.ts`: como `Deno.serve` está atrás do guard de entrypoint, o import
 * NÃO abre socket. Estes casos cobrem os invariantes que o checkpoint ao vivo também
 * afere, mas aqui em CI e de graça:
 *
 *   · T-42-25 — `401` sem Bearer e com Bearer divergente, sem tocar rede nem banco.
 *   · T-42-04 — o filtro do roster usa o vocabulário da COLUNA `usuarios_rh.role`
 *     (`administrador`/`recrutador`) e NUNCA o do JWT (`rh`). Um `'rh'` aqui
 *     descartaria em silêncio todo recrutador — 1 de 5 pessoas hoje.
 *   · T-42-26 — uma linha de ledger POR DESTINATÁRIO, cada uma com `dedupe_key`
 *     distinta terminando no `user_id`, e `destinatario_original` nos dois modos.
 *   · Isolamento de falha — um destinatário duplicado ou com envio falho não
 *     interrompe os demais.
 */

const BEARER = "edge-invoke-key-fixture";

const ADMIN_1 = { user_id: "u-admin-1", email: "admin1@bs.com.br" };
const ADMIN_2 = { user_id: "u-admin-2", email: "admin2@bs.com.br" };
const RECRUTADOR = { user_id: "u-recrut-1", email: "recruta@bs.com.br" };

const CANDIDATURA_FIX = { candidato_id: "cand-x", vaga_id: "vaga-x" };
const VAGA_FIX = { titulo: "Dentista Sênior" };

interface UpsertCapt {
  row: Record<string, unknown>;
  onConflict?: string;
}
interface UpdateCapt {
  patch: Record<string, unknown>;
  eqCol: string;
  eqVal: unknown;
}

/**
 * Mock do client service-role. Roteia `.select().eq().maybeSingle()` por tabela,
 * torna a query do roster AWAITABLE (o builder do supabase-js é thenable) e registra
 * os filtros aplicados, os upserts e os updates em arrays inspecionáveis.
 */
function makeMockSupabase(opts: {
  candidaturaRow?: Record<string, unknown> | null;
  vagaRow?: Record<string, unknown> | null;
  roster?: Array<Record<string, unknown>> | null;
  rosterError?: { message: string } | null;
  /** dedupe_keys que devem devolver claim VAZIO (simula duplicate). */
  claimsDuplicados?: string[];
  apiKey?: string | null;
} = {}) {
  const upserts: UpsertCapt[] = [];
  const updates: UpdateCapt[] = [];
  const filtrosRoster: { eq: Array<[string, unknown]>; is: Array<[string, unknown]>; in: Array<[string, unknown]> } = {
    eq: [],
    is: [],
    in: [],
  };
  const dup = new Set(opts.claimsDuplicados ?? []);

  const rowFor = (table: string) =>
    table === "candidaturas"
      ? (opts.candidaturaRow ?? null)
      : table === "vagas"
      ? (opts.vagaRow ?? null)
      : null;

  return {
    upserts,
    updates,
    filtrosRoster,
    from(table: string) {
      return {
        select: (_cols?: string) => {
          // deno-lint-ignore no-explicit-any
          const chain: any = {
            eq: (c: string, v: unknown) => {
              if (table === "usuarios_rh") filtrosRoster.eq.push([c, v]);
              return chain;
            },
            is: (c: string, v: unknown) => {
              if (table === "usuarios_rh") filtrosRoster.is.push([c, v]);
              return chain;
            },
            in: (c: string, v: unknown) => {
              if (table === "usuarios_rh") filtrosRoster.in.push([c, v]);
              return chain;
            },
            maybeSingle: () => Promise.resolve({ data: rowFor(table), error: null }),
            // thenable: `await supabaseAdmin.from(...).select(...).eq(...)...`
            then: (
              res: (v: unknown) => unknown,
              rej?: (e: unknown) => unknown,
            ) =>
              Promise.resolve({
                data: table === "usuarios_rh" ? (opts.roster ?? []) : null,
                error: table === "usuarios_rh" ? (opts.rosterError ?? null) : null,
              }).then(res, rej),
          };
          return chain;
        },
        upsert: (row: Record<string, unknown>, options?: { onConflict?: string }) => {
          upserts.push({ row, onConflict: options?.onConflict });
          const vazio = dup.has(String(row.dedupe_key));
          return {
            select: (_c?: string) =>
              Promise.resolve({ data: vazio ? [] : [{ id: `claim-${upserts.length}` }], error: null }),
          };
        },
        update: (patch: Record<string, unknown>) => ({
          eq: (eqCol: string, eqVal: unknown) => {
            updates.push({ patch, eqCol, eqVal });
            return Promise.resolve({ data: null, error: null });
          },
        }),
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

function makeFetchMock(status: number, jsonBody: unknown = { id: "re_rh_1" }) {
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

async function loadHandler() {
  const mod = await import("../index.ts");
  return mod as {
    handler: (
      req: Request,
      // deno-lint-ignore no-explicit-any
      deps: { supabaseAdmin: any; fetchImpl: typeof fetch; serviceKey: string },
    ) => Promise<Response>;
  };
}

function makeRequest(body: unknown, bearer?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bearer !== undefined) headers["Authorization"] = `Bearer ${bearer}`;
  return new Request("http://localhost/functions/v1/notificar-rh", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/** Modo `teste` determinístico: sem depender da env do runner. */
function comModoTeste<T>(fn: () => Promise<T>): Promise<T> {
  const original = Deno.env.get("NOTIFICACOES_MODO");
  Deno.env.set("NOTIFICACOES_MODO", "teste");
  return fn().finally(() => {
    if (original === undefined) Deno.env.delete("NOTIFICACOES_MODO");
    else Deno.env.set("NOTIFICACOES_MODO", original);
  });
}

Deno.test("T-42-25 — Bearer ausente → 401, zero rede, zero escrita", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase();
  const fetchMock = makeFetchMock(200);
  const res = await handler(
    makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: BEARER },
  );
  assertEquals(res.status, 401);
  assertEquals((await res.json()).error_code, "UNAUTHORIZED");
  assertEquals(fetchMock.calls.length, 0);
  assertEquals(supa.upserts.length, 0);
});

Deno.test("T-42-25 — Bearer divergente → 401 (compara contra deps.serviceKey)", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase();
  const fetchMock = makeFetchMock(200);
  const res = await handler(
    makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, "segredo-errado"),
    { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: BEARER },
  );
  assertEquals(res.status, 401);
  assertEquals(fetchMock.calls.length, 0);
});

Deno.test("REVISAO-01 — vocabulário fechado: qualquer evento != revisao_solicitada → 400 VALIDATION", async () => {
  const { handler } = await loadHandler();
  const invalidos: unknown[] = [
    { evento: "revisao_invalido", candidatura_id: "cand-1" },
    { evento: "confirmacao", candidatura_id: "cand-1" },
    { evento: "revisao_respondida", candidatura_id: "cand-1" }, // evento do plano 42-08
    { evento: "revisao_solicitada", candidatura_id: "" },
    { evento: "revisao_solicitada" },
    {},
  ];
  for (const corpo of invalidos) {
    const supa = makeMockSupabase();
    const fetchMock = makeFetchMock(200);
    const res = await handler(makeRequest(corpo, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    });
    assertEquals(res.status, 400, `esperava 400 para ${JSON.stringify(corpo)}`);
    assertEquals((await res.json()).error_code, "VALIDATION");
    assertEquals(fetchMock.calls.length, 0);
    assertEquals(supa.upserts.length, 0);
  }
});

Deno.test("T-42-04 — roster: filtro usa o vocabulário da COLUNA (administrador/recrutador), nunca 'rh' do JWT", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_FIX,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1, RECRUTADOR],
  });
  const fetchMock = makeFetchMock(200);
  await comModoTeste(() =>
    handler(makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    })
  );

  const filtroIn = supa.filtrosRoster.in.find(([c]) => c === "role");
  assert(filtroIn, "o roster deve ser filtrado por role");
  const roles = filtroIn![1] as readonly string[];
  assert(roles.includes("administrador"), `roles=${JSON.stringify(roles)}`);
  assert(
    roles.includes("recrutador"),
    "REGRESSÃO T-42-04/A-02: sem 'recrutador' o filtro descarta em silêncio a persona " +
      "primária da fila de revisão (1 de 5 pessoas hoje)",
  );
  assert(
    !roles.includes("rh"),
    "REGRESSÃO T-42-04/A-02: 'rh' é valor do JWT, NUNCA da coluna usuarios_rh.role — " +
      "o CHECK da coluna só admite administrador|gerente|recrutador|visualizador",
  );
  // O par literal do hook (`ativo = true AND deleted_at IS NULL`) está aplicado.
  assert(
    supa.filtrosRoster.eq.some(([c, v]) => c === "ativo" && v === true),
    "faltou .eq('ativo', true)",
  );
  assert(
    supa.filtrosRoster.is.some(([c, v]) => c === "deleted_at" && v === null),
    "faltou .is('deleted_at', null)",
  );
});

Deno.test("REVISAO-01 — roster vazio → 200 skipped:sem_destinatarios, zero envio, zero claim", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_FIX,
    vagaRow: VAGA_FIX,
    roster: [],
  });
  const fetchMock = makeFetchMock(200);
  const res = await comModoTeste(() =>
    handler(makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    })
  );
  assertEquals(res.status, 200);
  assertEquals((await res.json()).skipped, "sem_destinatarios");
  assertEquals(fetchMock.calls.length, 0);
  assertEquals(supa.upserts.length, 0);
});

Deno.test("T-42-26 — 3 destinatários ⇒ 3 linhas de ledger, dedupe_key distinta terminando no user_id", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_FIX,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1, ADMIN_2, RECRUTADOR],
  });
  const fetchMock = makeFetchMock(200, { id: "re_rh_ok" });
  const res = await comModoTeste(() =>
    handler(makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    })
  );
  assertEquals(res.status, 200);
  assertEquals(await res.json(), {
    ok: true,
    destinatarios: 3,
    enviados: 3,
    duplicados: 0,
    falhas: 0,
  });

  assertEquals(supa.upserts.length, 3);
  const chaves = supa.upserts.map((u) => String(u.row.dedupe_key));
  assertEquals(new Set(chaves).size, 3, "chaves colidiram — 2 RH perderiam o nudge");
  for (const [i, d] of [ADMIN_1, ADMIN_2, RECRUTADOR].entries()) {
    assertEquals(chaves[i], `cand-1:revisao_solicitada:${d.user_id}`);
    assertEquals(supa.upserts[i].onConflict, "dedupe_key");
    // modo teste: `to` é o sink, mas o original é preservado (auditoria do ledger)
    assertEquals(supa.upserts[i].row.destinatario_email, "delivered+revisao_solicitada_rh@resend.dev");
    assertEquals(supa.upserts[i].row.destinatario_original, d.email);
    assertEquals(supa.upserts[i].row.modo, "teste");
    assertEquals(supa.upserts[i].row.evento, "revisao_solicitada");
    assertEquals(supa.upserts[i].row.status, "pendente");
    // `candidato_id` é requisito NOT NULL do ledger, não dado do e-mail
    assertEquals(supa.upserts[i].row.candidato_id, CANDIDATURA_FIX.candidato_id);
  }

  // 3 envios, cada um com Idempotency-Key = a própria dedupe_key
  assertEquals(fetchMock.calls.length, 3);
  const idemp = fetchMock.calls.map((c) =>
    (c.init?.headers as Record<string, string>)["Idempotency-Key"]
  );
  assertEquals(idemp, chaves);
  // 3 updates de sucesso, keados por dedupe_key
  const enviados = supa.updates.filter((u) => u.patch.status === "enviado");
  assertEquals(enviados.length, 3);
  for (const u of enviados) assertEquals(u.eqCol, "dedupe_key");
});

Deno.test("T-42-26 — um destinatário duplicado NÃO interrompe os demais", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_FIX,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1, ADMIN_2, RECRUTADOR],
    claimsDuplicados: [`cand-1:revisao_solicitada:${ADMIN_1.user_id}`],
  });
  const fetchMock = makeFetchMock(200);
  const res = await comModoTeste(() =>
    handler(makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    })
  );
  const json = await res.json();
  assertEquals(json.duplicados, 1);
  assertEquals(json.enviados, 2, "o claim vazio do 1º não pode abortar o laço");
  assertEquals(fetchMock.calls.length, 2);
});

Deno.test("REVISAO-01 — non-2xx do Resend ⇒ falhou com proxima_tentativa_em NULL (não há sweep de RH)", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_FIX,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1],
  });
  const fetchMock = makeFetchMock(429, { message: "rate limited" });
  const res = await comModoTeste(() =>
    handler(makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    })
  );
  assertEquals(res.status, 200, "fire-and-forget: net.http_post é at-most-once");
  assertEquals((await res.json()).falhas, 1);
  const falhou = supa.updates.find((u) => u.patch.status === "falhou");
  assert(falhou, "esperava UPDATE status=falhou");
  assertEquals(falhou!.eqCol, "dedupe_key");
  assertEquals(
    falhou!.patch.proxima_tentativa_em,
    null,
    "agendar retry que a varredura exclui seria escrever afirmação falsa no ledger",
  );
});

Deno.test("T-42-26 — chave do Resend ausente: claim + falhou (a tentativa deixa trilha)", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_FIX,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1],
    apiKey: null,
  });
  const fetchMock = makeFetchMock(200);
  await comModoTeste(() =>
    handler(makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    })
  );
  assertEquals(fetchMock.calls.length, 0, "sem chave não se tenta enviar");
  assertEquals(supa.upserts.length, 1, "mas a tentativa é reivindicada — T-42-26");
  const falhou = supa.updates.find((u) => u.patch.status === "falhou");
  assert(falhou, "a ausência de chave deve virar trilha `falhou`, não silêncio");
});

Deno.test("REVISAO-01 — candidatura/vaga ausente ⇒ skipped:dados_ausentes sem tocar o roster", async () => {
  const { handler } = await loadHandler();
  for (const opts of [
    { candidaturaRow: null, vagaRow: VAGA_FIX },
    { candidaturaRow: CANDIDATURA_FIX, vagaRow: null },
  ]) {
    const supa = makeMockSupabase({ ...opts, roster: [ADMIN_1] });
    const fetchMock = makeFetchMock(200);
    const res = await comModoTeste(() =>
      handler(makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, BEARER), {
        supabaseAdmin: supa,
        fetchImpl: fetchMock.impl,
        serviceKey: BEARER,
      })
    );
    assertEquals(res.status, 200);
    assertEquals((await res.json()).skipped, "dados_ausentes");
    assertEquals(supa.upserts.length, 0);
    assertEquals(fetchMock.calls.length, 0);
  }
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 45 / Plan 45-09 — ERASE-05 · D-45-06
 * O SEGUNDO evento desta EF: a candidatura encerrada a pedido do candidato.
 *
 * Nada acima desta linha foi alterado. O vocabulário fechado da EF passa de 1
 * para 2 valores, e `_shared/email-config.ts` NÃO é tocado — o docblock daquele
 * arquivo (`:40-51`) proíbe rótulo de RH na união `EventoNotificacao`.
 *
 * ⚠ UM SÓ EVENTO COBRE OS DOIS CAMINHOS (retirada avulsa e encerramento em lote
 * disparado pelo pedido de exclusão), porque os dois escrevem a MESMA coluna
 * `candidaturas.encerrada_a_pedido_em` e produzem o mesmo efeito no funil.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const VAGA_ID = "vaga-x";
const URL_LISTA = `${APP_BASE_URL_PADRAO}/rh/vagas/${VAGA_ID}/candidatos`;

/**
 * Fixture com TODOS os identificadores do titular DISPONÍVEIS NA ENTRADA.
 *
 * ⚠ A disponibilidade é o ponto: uma fixture sem esses valores provaria a
 * ausência deles POR VACUIDADE. Aqui eles existem, são injetados por caminho
 * lateral, e a asserção é que mesmo assim nenhum alcança o HTML.
 */
const PII = {
  nome: "Fulano de Tal",
  email: "candidato.real@gmail.com",
  cpf: "123.456.789-00",
  candidatoId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  candidaturaId: "11111111-2222-3333-4444-555555555555",
  solicitacaoId: "99999999-8888-7777-6666-555555555555",
} as const;

// ─── 7) assunto do encerramento ─────────────────────────────────────────────

Deno.test("ERASE-05 — assuntoCandidaturaEncerradaAPedido nomeia a VAGA e nenhum identificador de pessoa", () => {
  const s = assuntoCandidaturaEncerradaAPedido(TITULO);
  assert(s.length > 0, "assunto não pode ser vazio");
  assert(s.includes(TITULO), `assunto deve citar a vaga: ${s}`);
  // ⚠ DIVERGÊNCIA DELIBERADA DE MECANISMO em relação ao teste irmão do assunto
  // vivo, que assere `!/candidat/i`. Esse mecanismo é IMPOSSÍVEL aqui: a copy
  // aprovada da 45-UI-SPEC (§E-mail 2) é literalmente "Candidatura encerrada a
  // pedido do candidato — {vaga}". A PROPRIEDADE preservada é a mesma e é a que
  // importa — o assunto nomeia um CONCEITO, nunca uma PESSOA:
  for (const [campo, valor] of Object.entries(PII)) {
    assert(!s.includes(valor), `REGRESSÃO: assunto carrega '${campo}': ${s}`);
  }
});

Deno.test("ERASE-05 — assuntoCandidaturaEncerradaAPedido neutraliza CR/LF (header injection)", () => {
  // Réplica verbatim do teste vivo do assunto irmão: `tituloVaga` continua sendo
  // texto digitado por humano no CRUD de vagas.
  const s = assuntoCandidaturaEncerradaAPedido("Vaga X\r\nBcc: intruso@exemplo.com");
  assert(!/[\r\n]/.test(s), `assunto com CR/LF permite injeção de header: ${s}`);
});

// ─── 8) corpo do encerramento: privacidade, motivo, XSS, link ───────────────

Deno.test("Invariante 10 — corpoCandidaturaEncerradaAPedido NÃO carrega nome, e-mail nem identificador algum", () => {
  const argsInjetados = {
    tituloVaga: TITULO,
    urlLista: URL_LISTA,
    // todos disponíveis na entrada — a asserção NÃO passa por vacuidade
    nomeCandidato: PII.nome,
    email: PII.email,
    cpf: PII.cpf,
    candidato_id: PII.candidatoId,
    candidatura_id: PII.candidaturaId,
    solicitacao_id: PII.solicitacaoId,
  } as unknown as Parameters<typeof corpoCandidaturaEncerradaAPedido>[0];

  const html = corpoCandidaturaEncerradaAPedido(argsInjetados);
  for (const [campo, valor] of Object.entries(PII)) {
    assert(
      !html.includes(valor),
      `REGRESSÃO Invariante 10 / T-42-24: '${campo}' no corpo do e-mail ao RH — ` +
        "em modo `teste` o corpo INTEIRO viaja para resend.dev, domínio de terceiro",
    );
  }
});

Deno.test("Invariante 10 — o corpo NÃO diz o MOTIVO específico do encerramento", () => {
  const html = corpoCandidaturaEncerradaAPedido({ tituloVaga: TITULO, urlLista: URL_LISTA });
  // "por que" uma pessoa exerceu um direito é dado SOBRE ela. O corpo diz que a
  // candidatura foi encerrada a pedido; nunca que houve pedido de exclusão.
  assert(
    !/exclus|apagar|excluir|deletar/i.test(html),
    "REGRESSÃO Invariante 10: o corpo revela o motivo específico do encerramento",
  );
});

Deno.test("ERASE-05 — o corpo nomeia a vaga e leva para a lista de candidatos DAQUELA vaga", () => {
  const html = corpoCandidaturaEncerradaAPedido({ tituloVaga: TITULO, urlLista: URL_LISTA });
  assert(html.includes(TITULO), "o corpo deve citar o título da vaga");
  assert(html.includes(URL_LISTA), `o corpo deve levar para ${URL_LISTA}`);
  assert(html.startsWith("<!doctype html>"), "deve usar layoutBase do projeto");
  // O aviso existe para que ninguém agende ou avalie uma candidatura encerrada.
  assert(/nada a responder/i.test(html), "o corpo deve dizer que não há nada a atender");
});

Deno.test("ERASE-05 — corpoCandidaturaEncerradaAPedido escapa HTML no título da vaga (XSS)", () => {
  const html = corpoCandidaturaEncerradaAPedido({
    tituloVaga: '<script>alert("x")</script>',
    urlLista: URL_LISTA,
  });
  assert(html.includes("&lt;script&gt;"), "o título deve sair escapado");
  assert(!html.includes("<script>"), "REGRESSÃO XSS: tag <script> crua no corpo");
});

// ─── 9) dedupe_key do encerramento: POR DESTINATÁRIO ────────────────────────

Deno.test("D-45-06 — montarDedupeKeyRhEncerramento: '{candidatura}:{evento}:{user}'", () => {
  assertEquals(
    montarDedupeKeyRhEncerramento("cand-1", "user-9"),
    `cand-1:${EVENTO_LEDGER_RH_ENCERRAMENTO}:user-9`,
  );
});

Deno.test("D-45-06 — NÃO-COLISÃO: dois user_id distintos ⇒ chaves distintas para a MESMA candidatura", () => {
  const a = montarDedupeKeyRhEncerramento("cand-1", "admin-aaa");
  const b = montarDedupeKeyRhEncerramento("cand-1", "recrutador-bbb");
  assert(
    a !== b,
    "chave por candidatura (e não por destinatário) faria o 1º RH consumir o claim " +
      "e todos os demais receberem skipped:duplicate em silêncio (medido no 42-07)",
  );
  assert(a.endsWith("admin-aaa"), `a chave deve terminar no user_id: ${a}`);
  assert(b.endsWith("recrutador-bbb"), `a chave deve terminar no user_id: ${b}`);
});

Deno.test("D-45-08 — a chave do encerramento NUNCA colide com a do evento irmão", () => {
  assert(
    montarDedupeKeyRhEncerramento("cand-1", "u-1") !== montarDedupeKeyRh("cand-1", "u-1"),
    "os dois eventos da EF partilham o ledger: chaves iguais fariam o segundo sumir",
  );
});

// ─── 10) URL da lista de candidatos da vaga ─────────────────────────────────

Deno.test("ERASE-05 — montarUrlListaVaga: default canônico e barra final normalizada", () => {
  assertEquals(montarUrlListaVaga(VAGA_ID), URL_LISTA);
  assertEquals(
    montarUrlListaVaga(VAGA_ID, "https://recruta.beautysmile.com.br/"),
    URL_LISTA,
  );
});

Deno.test("ERASE-05 — montarUrlListaVaga rejeita base malformada e cai no default", () => {
  // Mesma doutrina fail-safe de `montarUrlFila`: uma env malformada não pode
  // produzir link hostil (`javascript:`) nem quebrado num e-mail interno.
  for (const ruim of ["", "   ", "javascript:alert(1)", "http://inseguro.example", "nao-e-url"]) {
    assertEquals(montarUrlListaVaga(VAGA_ID, ruim), URL_LISTA, `base '${ruim}' deveria cair no default`);
  }
});

// ─── 11) handler: o vocabulário da EF passa de 1 para 2 ─────────────────────

const CANDIDATURA_ENC = { candidato_id: "cand-x", vaga_id: VAGA_ID };

Deno.test("D-45-08 — o handler ACEITA o evento novo e grava ledger com evento/template do encerramento", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_ENC,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1, ADMIN_2, RECRUTADOR],
  });
  const fetchMock = makeFetchMock(200, { id: "re_rh_enc" });
  const res = await comModoTeste(() =>
    handler(
      makeRequest({ evento: EVENTO_LEDGER_RH_ENCERRAMENTO, candidatura_id: "cand-1" }, BEARER),
      { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: BEARER },
    )
  );
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: true, destinatarios: 3, enviados: 3, duplicados: 0, falhas: 0 });

  assertEquals(supa.upserts.length, 3);
  const chaves = supa.upserts.map((u) => String(u.row.dedupe_key));
  assertEquals(new Set(chaves).size, 3, "chaves colidiram — 2 RH perderiam o aviso");
  for (const [i, d] of [ADMIN_1, ADMIN_2, RECRUTADOR].entries()) {
    assertEquals(chaves[i], `cand-1:${EVENTO_LEDGER_RH_ENCERRAMENTO}:${d.user_id}`);
    assertEquals(supa.upserts[i].onConflict, "dedupe_key");
    assertEquals(supa.upserts[i].row.evento, EVENTO_LEDGER_RH_ENCERRAMENTO);
    assertEquals(supa.upserts[i].row.template, TEMPLATE_LEDGER_RH_ENCERRAMENTO);
    assertEquals(supa.upserts[i].row.status, "pendente");
    // sink de teste PRÓPRIO deste evento, e o original preservado (auditoria)
    assertEquals(
      supa.upserts[i].row.destinatario_email,
      `delivered+${LABEL_SINK_RH_ENCERRAMENTO}@resend.dev`,
    );
    assertEquals(supa.upserts[i].row.destinatario_original, d.email);
  }
  // Idempotency-Key = a própria dedupe_key, como no evento irmão
  assertEquals(
    fetchMock.calls.map((c) => (c.init?.headers as Record<string, string>)["Idempotency-Key"]),
    chaves,
  );
});

Deno.test("D-45-08 — o e-mail do evento novo carrega o assunto e o corpo do ENCERRAMENTO", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_ENC,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1],
  });
  const fetchMock = makeFetchMock(200);
  await comModoTeste(() =>
    handler(
      makeRequest({ evento: EVENTO_LEDGER_RH_ENCERRAMENTO, candidatura_id: "cand-1" }, BEARER),
      { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: BEARER },
    )
  );
  assertEquals(fetchMock.calls.length, 1);
  const enviado = JSON.parse(String(fetchMock.calls[0].init?.body));
  assertEquals(enviado.subject, assuntoCandidaturaEncerradaAPedido(VAGA_FIX.titulo));
  assert(
    enviado.html.includes(`/rh/vagas/${VAGA_ID}/candidatos`),
    "o corpo deve levar para a lista de candidatos DAQUELA vaga",
  );
  assert(
    !/revisão de decisão|revisao de decisao/i.test(enviado.html),
    "REGRESSÃO: o corpo do evento irmão vazou para o evento novo",
  );
});

Deno.test("D-45-08 — o evento IRMÃO continua intacto (não-regressão do REVISAO-01)", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_FIX,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1],
  });
  const fetchMock = makeFetchMock(200);
  await comModoTeste(() =>
    handler(makeRequest({ evento: "revisao_solicitada", candidatura_id: "cand-1" }, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    })
  );
  const enviado = JSON.parse(String(fetchMock.calls[0].init?.body));
  assertEquals(enviado.subject, assuntoRevisaoSolicitada(VAGA_FIX.titulo));
  assert(enviado.html.includes("/rh/revisoes"), "o evento irmão continua indo para a fila");
  assertEquals(supa.upserts[0].row.dedupe_key, `cand-1:revisao_solicitada:${ADMIN_1.user_id}`);
  assertEquals(
    supa.upserts[0].row.destinatario_email,
    "delivered+revisao_solicitada_rh@resend.dev",
  );
});

Deno.test("D-45-08 — o vocabulário continua FECHADO em 2 valores: qualquer outro → 400", async () => {
  const { handler } = await loadHandler();
  // `revisao_respondida` e `divulgacao_vagas` existem no CHECK do ledger mas NÃO
  // pertencem a esta EF — vocabulário do banco maior que o da EF é o precedente
  // registrado no COMMENT de `classe_evento_notificacao`.
  for (const ev of ["confirmacao", "revisao_respondida", "divulgacao_vagas", "candidatura_encerrada", ""]) {
    const supa = makeMockSupabase({ candidaturaRow: CANDIDATURA_ENC, vagaRow: VAGA_FIX, roster: [ADMIN_1] });
    const fetchMock = makeFetchMock(200);
    const res = await handler(makeRequest({ evento: ev, candidatura_id: "cand-1" }, BEARER), {
      supabaseAdmin: supa,
      fetchImpl: fetchMock.impl,
      serviceKey: BEARER,
    });
    assertEquals(res.status, 400, `esperava 400 para evento '${ev}'`);
    assertEquals(supa.upserts.length, 0);
    assertEquals(fetchMock.calls.length, 0);
  }
});

Deno.test("D-45-06 — claim duplicado do evento novo NÃO aborta o laço de destinatários", async () => {
  const { handler } = await loadHandler();
  const supa = makeMockSupabase({
    candidaturaRow: CANDIDATURA_ENC,
    vagaRow: VAGA_FIX,
    roster: [ADMIN_1, ADMIN_2, RECRUTADOR],
    claimsDuplicados: [`cand-1:${EVENTO_LEDGER_RH_ENCERRAMENTO}:${ADMIN_1.user_id}`],
  });
  const fetchMock = makeFetchMock(200);
  const res = await comModoTeste(() =>
    handler(
      makeRequest({ evento: EVENTO_LEDGER_RH_ENCERRAMENTO, candidatura_id: "cand-1" }, BEARER),
      { supabaseAdmin: supa, fetchImpl: fetchMock.impl, serviceKey: BEARER },
    )
  );
  const json = await res.json();
  assertEquals(json.duplicados, 1);
  assertEquals(json.enviados, 2, "o claim vazio do 1º não pode abortar o laço");
});
