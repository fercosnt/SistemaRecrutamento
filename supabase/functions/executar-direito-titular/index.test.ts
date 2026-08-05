/**
 * Phase 45 / Plano 45-03 Task 2 (TDD RED) — a Edge Function `executar-direito-titular`
 * nas DUAS ações não-destrutivas desta fase: `pedir` e `cancelar`.
 *
 * ── AUTORADO RED (por desenho) ──────────────────────────────────────────────
 * `supabase/functions/executar-direito-titular/index.ts` NÃO EXISTE quando este
 * arquivo é escrito. `loadHandler()` importa `./index.ts` dinamicamente; esse import
 * falha por module-not-found, e TODO teste aqui é vermelho por UMA razão conhecida e
 * pretendida. Não é erro de sintaxe — o harness compila; só o alvo falta.
 *
 * Harness clonado de `get-curriculo-url/index.test.ts` (`makeChainable` +
 * `makeMockSupabaseUser` + `loadHandler`), com UM acréscimo: o mock de `admin`
 * registra as chamadas de `.rpc()`, porque três asserções desta fase são sobre
 * QUANTAS e COM QUE ARGUMENTOS as RPCs privilegiadas foram chamadas — e nenhuma
 * delas é observável a partir do corpo da resposta.
 *
 * ── OS OITO COMPORTAMENTOS, E O QUE CADA UM PROTEGE ─────────────────────────
 *  (a) sessão inválida                    → 401 UNAUTHORIZED
 *  (b) uid que não resolve candidato      → 403 FORBIDDEN
 *  (c) ERRO DE QUERY ao resolver          → 500 SERVER_ERROR, **nunca 403** (WR-04):
 *      um erro transitório virando 403 é uma mentira sobre autorização, e é o tipo
 *      de mentira que ninguém investiga.
 *  (d) `acao` fora de ('pedir','cancelar') → 400 VALIDATION, e **zero** RPC chamada
 *  (e) `acao='pedir'`                     → 200 com `executar_em` do SERVIDOR
 *  (f) `pedir` com pedido já agendado     → MESMA data, `candidaturas_encerradas: 0`
 *  (g) `acao='cancelar'` dentro da janela → 200 com `cancelado_em`
 *  (h) `cancelar` fora da janela          → 400 VALIDATION, **nunca 500**: pedido já
 *      executado ou já cancelado é FATO DO DOMÍNIO, não falha de servidor
 *  (i) `candidato_id` alheio NO CORPO     → IGNORADO; opera sobre o de `auth.uid()`
 *      (classe T-32-03 — aceitar identificador do cliente é deixar forjar de quem
 *      são os dados)
 *  (j) log REDIGIDO                       → nenhum `solicitacao_id` completo, e-mail,
 *      nome, caminho de Storage, URL ou payload sai em `console.*`
 *
 * ⚠ (i) É A ASSERÇÃO QUE UM TESTE DE CAMINHO FELIZ NÃO PEGA. O corpo da resposta é
 * idêntico nos dois casos; a única evidência é o ARGUMENTO com que a RPC foi chamada.
 *
 * Roda: `deno test supabase/functions/executar-direito-titular/` — **sem `--allow-net`**.
 *
 * @see supabase/functions/executar-direito-titular/index.ts (o handler; ausente no RED)
 * @see supabase/functions/get-curriculo-url/index.test.ts (o harness clonado)
 * @see supabase/migrations/20260805000002_p45_rpc_pedido_exclusao.sql (as duas RPCs)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const TITULAR = { id: "auth-uid-titular", app_metadata: { role: "candidato" } };
const CANDIDATO_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
/** O id que um cliente malicioso poria no corpo. NUNCA pode virar argumento de RPC. */
const CANDIDATO_ALHEIO = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const SOLICITACAO_ID = "cccccccc-3333-4333-8333-cccccccccccc";
const EXECUTAR_EM = "2026-08-20T12:00:00.000Z";
const CANCELADO_EM = "2026-08-06T09:30:00.000Z";

/** Uma cadeia PostgREST thenable+chainable que resolve sempre no mesmo `result`. */
// deno-lint-ignore no-explicit-any
function makeChainable(result: { data: unknown; error: unknown }): any {
  // deno-lint-ignore no-explicit-any
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    // deno-lint-ignore no-explicit-any
    then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onF, onR),
  };
  return chain;
}

interface AdminOpts {
  /** `candidatos` → {id}; `null` = uid não resolve titular (403). */
  cand?: { id: string } | null;
  /** erro de query ao resolver o titular → o handler deve devolver 500, nunca 403. */
  candErro?: unknown;
  /** o pedido de exclusão AGENDADO do titular; `null` = não há. */
  pedidoAberto?: { id: string; executar_em: string } | null;
  pedidoErro?: unknown;
  /** o que cada RPC devolve, por nome. */
  rpc?: Record<string, { data: unknown; error: unknown }>;
}

function makeMockSupabaseAdmin(opts: AdminOpts = {}) {
  const cand = opts.cand === undefined ? { id: CANDIDATO_ID } : opts.cand;
  const pedido = opts.pedidoAberto === undefined
    ? { id: SOLICITACAO_ID, executar_em: EXECUTAR_EM }
    : opts.pedidoAberto;
  const rpcCalls: Array<{ nome: string; args: Record<string, unknown> }> = [];
  const reads = { candidatos: 0, solicitacoes: 0 };
  return {
    rpcCalls,
    reads,
    from(tabela: string) {
      if (tabela === "candidatos") {
        reads.candidatos++;
        return makeChainable({
          data: opts.candErro ? null : cand,
          error: opts.candErro ?? null,
        });
      }
      if (tabela === "solicitacoes_dados") {
        reads.solicitacoes++;
        return makeChainable({
          data: opts.pedidoErro ? null : pedido,
          error: opts.pedidoErro ?? null,
        });
      }
      return makeChainable({ data: null, error: null });
    },
    rpc(nome: string, args: Record<string, unknown>) {
      rpcCalls.push({ nome, args });
      const resposta = opts.rpc?.[nome];
      if (resposta) return Promise.resolve(resposta);
      if (nome === "registrar_pedido_exclusao") {
        return Promise.resolve({
          data: [{
            solicitacao_id: SOLICITACAO_ID,
            executar_em: EXECUTAR_EM,
            candidaturas_encerradas: 2,
          }],
          error: null,
        });
      }
      if (nome === "cancelar_pedido_exclusao") {
        return Promise.resolve({
          data: [{ solicitacao_id: SOLICITACAO_ID, cancelado_em: CANCELADO_EM }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

function makeMockSupabaseUser(user: Record<string, unknown> | null) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user },
          error: user ? null : new Error("no user"),
        }),
    },
  };
}

async function loadHandler() {
  // RED até a Task 2 autorar o módulo: este import rejeita com module-not-found.
  const mod = await import("./index.ts");
  return mod as {
    handler: (
      req: Request,
      deps: { supabaseAdmin: unknown; supabaseUser: unknown },
    ) => Promise<Response>;
  };
}

function makeRequest(body: unknown, metodo = "POST"): Request {
  return new Request("http://localhost/functions/v1/executar-direito-titular", {
    method: metodo,
    headers: { "Content-Type": "application/json", Authorization: "Bearer jwt-titular" },
    body: metodo === "POST" ? JSON.stringify(body) : undefined,
  });
}

// ── (a) sessão inválida → 401 ────────────────────────────────────────────────
Deno.test("(a) sessão inválida → 401 UNAUTHORIZED", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(makeRequest({ acao: "pedir" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(null),
  });
  assertEquals(res.status, 401);
  assertEquals((await res.json()).error_code, "UNAUTHORIZED");
  // Sem sessão, NENHUM toque privilegiado acontece.
  assertEquals(admin.rpcCalls.length, 0);
  assertEquals(admin.reads.candidatos, 0);
});

// ── (b) uid que não resolve candidato → 403 ──────────────────────────────────
Deno.test("(b) sessão válida cujo uid não resolve candidato → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ cand: null });
  const res = await handler(makeRequest({ acao: "pedir" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(TITULAR),
  });
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error_code, "FORBIDDEN");
  assertEquals(admin.rpcCalls.length, 0);
});

// ── (c) WR-04: erro de query → 500, NUNCA 403 ────────────────────────────────
Deno.test("(c) WR-04: erro de query ao resolver o titular → 500 SERVER_ERROR, nunca 403", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candErro: { message: "conexão caiu" } });
  const res = await handler(makeRequest({ acao: "pedir" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(TITULAR),
  });
  // A asserção NEGATIVA é a que importa: um erro transitório virando 403 seria uma
  // mentira sobre autorização, e ninguém investiga um 403.
  assert(res.status !== 403, "erro de query jamais pode virar 403");
  assertEquals(res.status, 500);
  assertEquals((await res.json()).error_code, "SERVER_ERROR");
  assertEquals(admin.rpcCalls.length, 0);
});

// ── (d) vocabulário fechado de ação ──────────────────────────────────────────
Deno.test("(d) ação fora de ('pedir','cancelar') → 400 VALIDATION e zero RPC", async () => {
  const { handler } = await loadHandler();
  for (const acao of ["executar", "apagar", "", undefined, 42]) {
    const admin = makeMockSupabaseAdmin();
    const res = await handler(makeRequest({ acao }), {
      supabaseAdmin: admin,
      supabaseUser: makeMockSupabaseUser(TITULAR),
    });
    assertEquals(res.status, 400, `ação ${JSON.stringify(acao)} deveria ser 400`);
    assertEquals((await res.json()).error_code, "VALIDATION");
    // A validação acontece ANTES de qualquer toque privilegiado.
    assertEquals(admin.rpcCalls.length, 0);
  }
});

// ── (e) pedir → 200 com a data do SERVIDOR ───────────────────────────────────
Deno.test("(e) acao='pedir' → 200 { ok, executar_em, candidaturas_encerradas }", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ pedidoAberto: null });
  const res = await handler(makeRequest({ acao: "pedir" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(TITULAR),
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.ok, true);
  assertEquals(json.executar_em, EXECUTAR_EM);
  assertEquals(json.candidaturas_encerradas, 2);
  assertEquals(admin.rpcCalls.length, 1);
  assertEquals(admin.rpcCalls[0].nome, "registrar_pedido_exclusao");
  // ⚠ Invariante 12: nenhum valor interno vaza para o titular.
  assertEquals(json.solicitacao_id, undefined);
});

// ── (f) pedir idempotente ────────────────────────────────────────────────────
Deno.test("(f) acao='pedir' com pedido já agendado → MESMA data e 0 encerramentos", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    rpc: {
      registrar_pedido_exclusao: {
        data: [{
          solicitacao_id: SOLICITACAO_ID,
          executar_em: EXECUTAR_EM,
          candidaturas_encerradas: 0,
        }],
        error: null,
      },
    },
  });
  const res = await handler(makeRequest({ acao: "pedir" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(TITULAR),
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.executar_em, EXECUTAR_EM, "a data NÃO é empurrada para frente");
  assertEquals(json.candidaturas_encerradas, 0);
  // UMA chamada: a idempotência é da RPC (por ESTADO), não de um ramo do handler
  // que "adivinha" que já existe pedido — adivinhar aqui seria mover a autoridade
  // do servidor para o cliente.
  assertEquals(admin.rpcCalls.length, 1);
});

// ── (g) cancelar dentro da janela ────────────────────────────────────────────
Deno.test("(g) acao='cancelar' sobre pedido agendado → 200 { ok, cancelado_em }", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(makeRequest({ acao: "cancelar" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(TITULAR),
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.ok, true);
  assertEquals(json.cancelado_em, CANCELADO_EM);
  assertEquals(json.solicitacao_id, undefined, "Invariante 12: id interno não vaza");
  assertEquals(admin.rpcCalls.length, 1);
  assertEquals(admin.rpcCalls[0].nome, "cancelar_pedido_exclusao");
  // ⚠ O `solicitacao_id` é resolvido NO SERVIDOR, nunca recebido do cliente — é o
  // mesmo motivo do (i), aplicado ao outro identificador.
  assertEquals(admin.rpcCalls[0].args.p_solicitacao_id, SOLICITACAO_ID);
});

// ── (h) cancelar fora da janela → 400, nunca 500 ─────────────────────────────
Deno.test("(h) cancelar sem pedido agendado → 400 VALIDATION, nunca 500", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ pedidoAberto: null });
  const res = await handler(makeRequest({ acao: "cancelar" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(TITULAR),
  });
  assert(res.status !== 500, "pedido não cancelável é fato do domínio, não falha de servidor");
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error_code, "VALIDATION");
  assertEquals(admin.rpcCalls.length, 0);
});

Deno.test("(h2) RPC recusa por 22023 (já executado/cancelado) → 400 VALIDATION, nunca 500", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    rpc: {
      cancelar_pedido_exclusao: {
        data: null,
        error: { code: "22023", message: "PEDIDO_NAO_CANCELAVEL: ..." },
      },
    },
  });
  const res = await handler(makeRequest({ acao: "cancelar" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(TITULAR),
  });
  assert(res.status !== 500, "22023 é recusa de domínio, não falha de servidor");
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error_code, "VALIDATION");
  // ⚠ Invariante 12: nem SQLSTATE nem mensagem crua do banco chegam ao titular.
  const cru = JSON.stringify(json);
  assert(!cru.includes("22023"), "SQLSTATE não pode vazar para o titular");
  assert(!cru.includes("PEDIDO_NAO_CANCELAVEL: "), "mensagem crua do banco não vaza");
});

// ── (i) T-32-03: candidato_id do corpo é IGNORADO ────────────────────────────
Deno.test("(i) T-32-03: candidato_id alheio no corpo é IGNORADO — opera sobre auth.uid()", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ pedidoAberto: null });
  const res = await handler(
    makeRequest({ acao: "pedir", candidato_id: CANDIDATO_ALHEIO, candidatoId: CANDIDATO_ALHEIO }),
    { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(TITULAR) },
  );
  assertEquals(res.status, 200);
  assertEquals(admin.rpcCalls.length, 1);
  // A ÚNICA evidência: o argumento da RPC. O corpo da resposta é idêntico nos dois
  // casos, então um teste de caminho feliz passaria com o defeito presente.
  assertEquals(admin.rpcCalls[0].args.p_candidato_id, CANDIDATO_ID);
  assert(
    JSON.stringify(admin.rpcCalls[0].args).indexOf(CANDIDATO_ALHEIO) === -1,
    "o id vindo do corpo jamais pode alcançar a RPC privilegiada",
  );
});

// ── (j) log REDIGIDO ─────────────────────────────────────────────────────────
Deno.test("(j) log REDIGIDO: nem id completo, nem e-mail, nem payload saem em console.*", async () => {
  const { handler } = await loadHandler();
  const original = { error: console.error, log: console.log, warn: console.warn };
  const capturado: unknown[] = [];
  console.error = (...a: unknown[]) => capturado.push(...a);
  console.log = (...a: unknown[]) => capturado.push(...a);
  console.warn = (...a: unknown[]) => capturado.push(...a);
  try {
    const admin = makeMockSupabaseAdmin({
      rpc: {
        registrar_pedido_exclusao: {
          data: null,
          error: { code: "XX000", message: "estouro interno em /storage/curriculos/x.pdf" },
        },
      },
    });
    const res = await handler(
      makeRequest({ acao: "pedir", email: "titular@exemplo.com", nome: "Fulano de Tal" }),
      { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(TITULAR) },
    );
    assertEquals(res.status, 500);
    const tudo = capturado.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
    for (
      const proibido of [
        SOLICITACAO_ID,
        CANDIDATO_ID,
        "titular@exemplo.com",
        "Fulano de Tal",
        "/storage/curriculos/",
        "http",
      ]
    ) {
      assert(!tudo.includes(proibido), `log vazou "${proibido}": ${tudo}`);
    }
  } finally {
    console.error = original.error;
    console.log = original.log;
    console.warn = original.warn;
  }
});

// ── preflight: OPTIONS responde ANTES de qualquer guard ──────────────────────
Deno.test("(k) preflight OPTIONS responde com CORS e sem tocar em nada", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(makeRequest(null, "OPTIONS"), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(null),
  });
  assertEquals(res.status, 200);
  assert(res.headers.get("Access-Control-Allow-Origin") !== null);
  assertEquals(admin.reads.candidatos, 0);
});

// ── helpers: a allowlist de log é PRÓPRIA desta EF ───────────────────────────
Deno.test("(l) logSeguroExclusao filtra tudo o que não está na allowlist própria", async () => {
  const h = await import("./helpers.ts");
  const filtrado = h.logSeguroExclusao({
    acao: "pedir",
    resultado: "erro",
    pedido_ref: "cccccccc",
    solicitacao_id: SOLICITACAO_ID,
    email: "titular@exemplo.com",
    nome: "Fulano de Tal",
    dedupe_key: "x:y:z",
    caminho: "/storage/curriculos/x.pdf",
    payload: { qualquer: "coisa" },
  });
  assertEquals(filtrado.acao, "pedir");
  assertEquals(filtrado.resultado, "erro");
  assertEquals(filtrado.pedido_ref, "cccccccc");
  for (
    const banida of ["solicitacao_id", "email", "nome", "dedupe_key", "caminho", "payload"]
  ) {
    assertEquals(filtrado[banida], undefined, `${banida} jamais entra em log desta EF`);
  }
  // `refCurta` é o ÚNICO formato de id admitido.
  assertEquals(h.refCurta(SOLICITACAO_ID), "cccccccc");
  assert(h.refCurta(SOLICITACAO_ID).length < SOLICITACAO_ID.length);
});

// ── helpers: o tradutor para o vocabulário fechado de `causa` ────────────────
Deno.test("(m) causaDaFalha traduz passo → vocabulário FECHADO do CHECK do banco", async () => {
  const h = await import("./helpers.ts");
  assertEquals(h.causaDaFalha("storage"), "falha_storage");
  assertEquals(h.causaDaFalha("postgres"), "falha_postgres");
  assertEquals(h.causaDaFalha("auth"), "falha_auth");
  assertEquals(h.causaDaFalha("recibo"), "falha_recibo");
  // Fallback TOTAL: um passo desconhecido NÃO pode produzir um valor fora do CHECK,
  // porque o INSERT abortaria a transação que registra a própria falha.
  assertEquals(h.causaDaFalha("qualquer-coisa"), "falha_postgres");
});
