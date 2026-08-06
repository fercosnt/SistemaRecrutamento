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
/** A candidatura que o titular retira (45-12). */
const CANDIDATURA_ID = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
/** A candidatura de OUTRA pessoa — o guard da RPC é quem recusa, não a EF. */
const CANDIDATURA_ALHEIA = "ffffffff-6666-4666-8666-ffffffffffff";
/** ⚠ `retirar_candidatura` devolve `timestamptz` ESCALAR, não `RETURNS TABLE`. */
const ENCERRADA_EM = "2026-08-06T11:15:00.000Z";

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

/**
 * ⚠ 45-12 — AS CHAMADAS DE RPC SÃO REGISTRADAS **POR CLIENT**, e a separação é a
 * única evidência que existe do `DI-45-10-01`.
 *
 * `rpcCalls` guarda TODAS (é o que as 14 asserções do 45-03 leem, e elas não mudam);
 * `rpcNoServico` guarda as que saíram do client SEM claims; `rpcNoTitular`, as que
 * saíram do client COM o `Authorization` do titular. O corpo da resposta é IDÊNTICO
 * nos dois casos — em PROD a diferença é `auth.uid()` NULL, `42501`, e um motor que
 * não roda. Um teste de caminho feliz passa com o defeito presente.
 */
function makeMockSupabaseAdmin(opts: AdminOpts = {}) {
  const cand = opts.cand === undefined ? { id: CANDIDATO_ID } : opts.cand;
  const pedido = opts.pedidoAberto === undefined
    ? { id: SOLICITACAO_ID, executar_em: EXECUTAR_EM }
    : opts.pedidoAberto;
  const rpcCalls: Array<{ nome: string; args: Record<string, unknown> }> = [];
  const rpcNoServico: Array<{ nome: string; args: Record<string, unknown> }> = [];
  const rpcNoTitular: Array<{ nome: string; args: Record<string, unknown> }> = [];
  const reads = { candidatos: 0, solicitacoes: 0 };

  /** O comportamento da RPC, independente do client de onde ela saiu. */
  const executarRpc = (nome: string) => {
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
    if (nome === "retirar_candidatura") {
      return Promise.resolve({ data: ENCERRADA_EM, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  };

  return {
    rpcCalls,
    rpcNoServico,
    rpcNoTitular,
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
    rpc(nome: string, args: Record<string, unknown> = {}) {
      rpcCalls.push({ nome, args });
      rpcNoServico.push({ nome, args });
      return executarRpc(nome);
    },
    /** Ponte usada SÓ pelo mock do client do titular — nunca pelo handler. */
    __rpcTitular(nome: string, args: Record<string, unknown> = {}) {
      rpcCalls.push({ nome, args });
      rpcNoTitular.push({ nome, args });
      return executarRpc(nome);
    },
  };
}

/**
 * O TERCEIRO CLIENT — service key no `apikey`, `Authorization` do titular, papel
 * `authenticated` no PostgREST com `auth.uid()` resolvido.
 *
 * ⚠ ELE EXPÕE `rpc` E NADA MAIS. Tocar `auth`, `storage` ou qualquer tabela nele
 * LANÇA, nomeando o caminho tocado — e essa é a metade que importa. O
 * `Authorization` é o MESMO header para PostgREST, Storage e Auth Admin: mover uma
 * chamada privilegiada para cá trocaria o papel dela para `authenticated`, e
 * `deleteUser` (403) e `ler_resend_api_key` (REVOGADA de `authenticated` desde a
 * P36) falhariam DEPOIS da mutação irreversível.
 */
function makeMockTitular(
  admin: { __rpcTitular: (nome: string, args: Record<string, unknown>) => unknown },
) {
  const proibir = (caminho: string): never => {
    throw new Error(
      `CLIENT DO TITULAR TOCADO EM "${caminho}": esse caminho exige service_role e ` +
        `passaria a rodar como authenticated — falharia DEPOIS da mutacao irreversivel`,
    );
  };
  return {
    rpc: (nome: string, args: Record<string, unknown> = {}) => admin.__rpcTitular(nome, args),
    get auth(): never {
      return proibir("auth.admin");
    },
    get storage(): never {
      return proibir("storage");
    },
    get from(): never {
      return proibir("from");
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
  // As `deps` ganharam `fetchImpl` e `modo` no 45-10 (o passo 4 envia o recibo, e
  // `resolverModo()` lê `Deno.env` — que `deno test` não concede). Os dois são
  // OPCIONAIS aqui para que as 14 asserções do 45-03 sigam construindo `deps` com
  // dois campos.
  return mod as {
    handler: (
      req: Request,
      deps: {
        supabaseAdmin: unknown;
        supabaseUser: unknown;
        // ⚠ 45-12: o TERCEIRO client, obrigatório. As quatro RPCs da fase saem dele.
        supabaseTitular: unknown;
        fetchImpl?: typeof fetch;
        modo?: "producao" | "teste";
      },
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
    supabaseTitular: makeMockTitular(admin),
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
    supabaseTitular: makeMockTitular(admin),
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
    supabaseTitular: makeMockTitular(admin),
  });
  // A asserção NEGATIVA é a que importa: um erro transitório virando 403 seria uma
  // mentira sobre autorização, e ninguém investiga um 403.
  assert(res.status !== 403, "erro de query jamais pode virar 403");
  assertEquals(res.status, 500);
  assertEquals((await res.json()).error_code, "SERVER_ERROR");
  assertEquals(admin.rpcCalls.length, 0);
});

// ── (d) vocabulário fechado de ação ──────────────────────────────────────────
// ⚠ `"executar"` SAIU desta lista no 45-10: ele passou a ser a TERCEIRA ação do
// vocabulário fechado. Mantê-lo aqui afirmaria que o motor destrutivo não existe —
// o teste seria verde justamente quando a fase falhou.
Deno.test("(d) ação fora de ('pedir','cancelar','executar') → 400 VALIDATION e zero RPC", async () => {
  const { handler } = await loadHandler();
  for (const acao of ["apagar", "", undefined, 42]) {
    const admin = makeMockSupabaseAdmin();
    const res = await handler(makeRequest({ acao }), {
      supabaseAdmin: admin,
      supabaseUser: makeMockSupabaseUser(TITULAR),
      supabaseTitular: makeMockTitular(admin),
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
    supabaseTitular: makeMockTitular(admin),
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
    supabaseTitular: makeMockTitular(admin),
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
    supabaseTitular: makeMockTitular(admin),
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
    supabaseTitular: makeMockTitular(admin),
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
    supabaseTitular: makeMockTitular(admin),
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
    {
      supabaseAdmin: admin,
      supabaseUser: makeMockSupabaseUser(TITULAR),
      supabaseTitular: makeMockTitular(admin),
    },
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
      {
        supabaseAdmin: admin,
        supabaseUser: makeMockSupabaseUser(TITULAR),
        supabaseTitular: makeMockTitular(admin),
      },
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
    supabaseTitular: makeMockTitular(admin),
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

// ═════════════════════════════════════════════════════════════════════════════
// Phase 45 / Plano 45-10 — OS TRÊS PASSOS DESTRUTIVOS + O RECIBO
//
// ── POR QUE UM SEGUNDO HARNESS, E NÃO UM `makeMockSupabaseAdmin` ESTENDIDO ────
// O mock do 45-03 devolve a MESMA resposta para toda leitura de uma tabela, o que
// bastava para duas ações de estado. O motor do 45-10 lê `solicitacoes_dados` e
// ESCREVE nela cinco vezes (o plano + os quatro carimbos), enumera Storage em laço
// PAGINADO, e a asserção central de metade dos casos é sobre a ORDEM das operações —
// nenhuma delas é observável num mock sem memória. Estender o antigo apagaria as 14
// asserções que ele já sustenta.
//
// ── AS ASSERÇÕES QUE UM CAMINHO FELIZ NÃO PEGA ───────────────────────────────
//  · a captura acontece ANTES da primeira mutação (`ordem`, não o corpo da resposta);
//  · a lista persistida é DETERMINÍSTICA mesmo com o `list()` paginando fora de ordem;
//  · `remove()` que devolve menos objetos do que recebeu FALHA o passo — o único
//    precedente do repositório (`cvUploadService.ts:224`) não confere esse retorno;
//  · com `storage_concluido_em` carimbado a Storage Admin API NÃO é tocada;
//  · o erro de `deleteUser` NÃO é engolido (o precedente vivo o engole por desenho);
//  · o recibo NÃO escreve no ledger de notificações (D-45-12 / saída R1) — o mock
//    daquela tabela FALHA O TESTE se for chamado.
// ═════════════════════════════════════════════════════════════════════════════

const PEDIDO_ID = "dddddddd-4444-4444-8444-dddddddddddd";
const AUTH_UID = TITULAR.id;
const PREFIXO = `${AUTH_UID}/`;
const EMAIL_TITULAR = "titular@exemplo.com";
/** Uma data de execução JÁ VENCIDA — a janela de arrependimento passou. */
const VENCIDO = "2020-01-01T00:00:00.000Z";
/** Uma data de execução AINDA NO FUTURO. */
const FUTURO = "2999-01-01T00:00:00.000Z";

const CV_A = `${PREFIXO}11111111-1111-4111-8111-111111111111.pdf`;
const CV_B = `${PREFIXO}22222222-2222-4222-8222-222222222222.pdf`;
const CV_C = `${PREFIXO}33333333-3333-4333-8333-333333333333.pdf`;

/** O jsonb que `plano_exclusao_titular` devolve — recortado ao que a EF consome. */
function planoDoBanco(over: Record<string, unknown> = {}) {
  return {
    candidato_id: CANDIDATO_ID,
    candidato_existe: true,
    ja_anonimizado: false,
    user_id_presente: true,
    storage_remove: { fonte: "fora_do_banco", objetos: null },
    tombstone_candidato: { candidatos: 1, candidaturas_vinculadas: 2 },
    tombstone_decisao_final: { decisao_final: 1, decisao_final_historico: 1, nota: "x" },
    severar_user_id: { candidatos_user_id: 1, nota: "x" },
    severar_fks_set_null: { ai_call_logs: 3, nota: "x" },
    scrub_ledger_email: { notificacoes_enviadas: 4, nota: "x" },
    auth_delete_user: { fonte: "fora_do_banco", usuario: null },
    ...over,
  };
}

interface ExecOpts {
  cand?: { id: string; email: string | null } | null;
  pedido?: Record<string, unknown> | null;
  pedidoErro?: unknown;
  /** Páginas devolvidas por `storage.list()`, na ordem em que ele as devolve. */
  paginas?: Array<Array<{ name: string }>>;
  listErro?: unknown;
  curriculos?: Array<{ id: string; curriculo_url: string | null }>;
  curriculosErro?: unknown;
  /** O que `storage.remove(lote)` devolve. Default: exatamente o que recebeu. */
  removeResultado?: (lote: string[]) => { data: Array<{ name: string }> | null; error: unknown };
  planoBanco?: { data: unknown; error: unknown };
  anonimizar?: { data: unknown; error: unknown };
  deleteUser?: { data?: unknown; error?: unknown };
  deleteUserLanca?: boolean;
  apiKey?: string | null;
  respostaResend?: { ok: boolean; status: number; corpo?: unknown };
  fetchLanca?: boolean;
  /**
   * Simula o carimbo do passo 2 NÃO chegando ao banco (update perdido, conexão que
   * cai entre o commit e o retorno). É o cenário que a pré-condição do passo 3 existe
   * para pegar — e a razão de ela ser verificada contra a AUTORIDADE, e não contra
   * uma variável local que um defeito poderia ter setado.
   */
  perdeCarimboPostgres?: boolean;
}

function makeMockAdminExecutar(o: ExecOpts = {}) {
  const cand = o.cand === undefined ? { id: CANDIDATO_ID, email: EMAIL_TITULAR } : o.cand;
  const paginas = o.paginas ?? [];
  const curriculos = o.curriculos ?? [];
  const linha: Record<string, unknown> = {
    id: PEDIDO_ID,
    executar_em: VENCIDO,
    situacao: "agendado",
    plano: null,
    storage_concluido_em: null,
    postgres_concluido_em: null,
    auth_concluido_em: null,
    recibo_enviado_em: null,
    ...(o.pedido ?? {}),
  };
  const pedido = o.pedido === null ? null : linha;

  /** Diário de bordo: toda operação observável, na ordem em que aconteceu. */
  const ordem: string[] = [];
  const rpcCalls: Array<{ nome: string; args: Record<string, unknown> }> = [];
  /** ⚠ 45-12: as RPCs que saíram do client SEM as claims do titular. */
  const rpcNoServico: Array<{ nome: string; args: Record<string, unknown> }> = [];
  /** ⚠ 45-12: as que saíram do client COM o `Authorization` do titular. */
  const rpcNoTitular: Array<{ nome: string; args: Record<string, unknown> }> = [];
  const listCalls: Array<{ prefixo: string; limit: number; offset: number }> = [];
  const removeCalls: string[][] = [];
  const deleteUserCalls: unknown[][] = [];
  const updates: Array<Record<string, unknown>> = [];
  const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
  /** ⚠ D-45-12 / saída R1: se isto virar `true`, o recibo tocou o ledger. */
  let ledgerTocado = false;

  /** O comportamento da RPC, independente do client de onde ela saiu. */
  const executarRpc = (nome: string, args: Record<string, unknown>) => {
    ordem.push(`rpc:${nome}`);
    rpcCalls.push({ nome, args });
    if (nome === "plano_exclusao_titular") {
      return Promise.resolve(o.planoBanco ?? { data: planoDoBanco(), error: null });
    }
    if (nome === "anonimizar_candidato") {
      return Promise.resolve(
        o.anonimizar ?? {
          data: { resultado: "anonimizado", candidato_id: CANDIDATO_ID },
          error: null,
        },
      );
    }
    if (nome === "ler_resend_api_key") {
      return Promise.resolve({
        data: o.apiKey === undefined ? "re_chave_de_teste" : o.apiKey,
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  };

  const admin = {
    ordem,
    rpcCalls,
    rpcNoServico,
    rpcNoTitular,
    listCalls,
    removeCalls,
    deleteUserCalls,
    updates,
    fetchCalls,
    get ledgerTocado() {
      return ledgerTocado;
    },
    get linha() {
      return linha;
    },
    from(tabela: string) {
      if (tabela === "notificacoes_enviadas") {
        ledgerTocado = true;
        ordem.push("ledger");
        return makeChainable({ data: null, error: null });
      }
      if (tabela === "candidatos") {
        ordem.push("le:candidatos");
        return makeChainable({ data: cand, error: null });
      }
      if (tabela === "candidaturas") {
        ordem.push("le:candidaturas");
        return makeChainable({
          data: o.curriculosErro ? null : curriculos,
          error: o.curriculosErro ?? null,
        });
      }
      if (tabela === "solicitacoes_dados") {
        // deno-lint-ignore no-explicit-any
        const chain: any = {
          select: () => {
            ordem.push("le:solicitacao");
            return chain;
          },
          update: (patch: Record<string, unknown>) => {
            ordem.push("escreve:solicitacao");
            updates.push(patch);
            const aplicado = { ...patch };
            if (o.perdeCarimboPostgres) delete aplicado.postgres_concluido_em;
            Object.assign(linha, aplicado);
            return chain;
          },
          eq: () => chain,
          in: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: () =>
            Promise.resolve({
              data: o.pedidoErro ? null : pedido,
              error: o.pedidoErro ?? null,
            }),
          // deno-lint-ignore no-explicit-any
          then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(onF, onR),
        };
        return chain;
      }
      return makeChainable({ data: null, error: null });
    },
    rpc(nome: string, args: Record<string, unknown> = {}) {
      rpcNoServico.push({ nome, args });
      return executarRpc(nome, args);
    },
    /** Ponte usada SÓ pelo mock do client do titular — nunca pelo handler. */
    __rpcTitular(nome: string, args: Record<string, unknown> = {}) {
      rpcNoTitular.push({ nome, args });
      return executarRpc(nome, args);
    },
    storage: {
      from(_bucket: string) {
        return {
          list(prefixo: string, opts: { limit: number; offset: number }) {
            ordem.push("storage:list");
            listCalls.push({ prefixo, limit: opts.limit, offset: opts.offset });
            if (o.listErro) return Promise.resolve({ data: null, error: o.listErro });
            const idx = Math.floor(opts.offset / opts.limit);
            return Promise.resolve({ data: paginas[idx] ?? [], error: null });
          },
          remove(lote: string[]) {
            ordem.push("storage:remove");
            removeCalls.push(lote);
            const r = o.removeResultado
              ? o.removeResultado(lote)
              : { data: lote.map((name) => ({ name })), error: null };
            return Promise.resolve(r);
          },
        };
      },
    },
    auth: {
      admin: {
        deleteUser(...args: unknown[]) {
          ordem.push("auth:deleteUser");
          deleteUserCalls.push(args);
          if (o.deleteUserLanca) return Promise.reject(new Error("GoTrue caiu"));
          return Promise.resolve(o.deleteUser ?? { data: {}, error: null });
        },
      },
    },
  };
  return admin;
}

function makeFetchMock(o: ExecOpts, admin: ReturnType<typeof makeMockAdminExecutar>) {
  return (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    admin.fetchCalls.push({ url: String(url), init: init ?? {} });
    if (o.fetchLanca) return Promise.reject(new Error("rede caiu"));
    const r = o.respostaResend ?? { ok: true, status: 200, corpo: { id: "resend-id" } };
    return Promise.resolve(
      new Response(JSON.stringify(r.corpo ?? {}), { status: r.status }),
    );
  };
}

/** Monta as `deps` completas do motor. `modo` é SEMPRE injetado: `resolverModo()`
 * lê `Deno.env`, e `deno test` roda sem `--allow-env` por contrato desta fase. */
function depsExecutar(o: ExecOpts = {}) {
  const admin = makeMockAdminExecutar(o);
  return {
    admin,
    deps: {
      supabaseAdmin: admin,
      supabaseUser: makeMockSupabaseUser(TITULAR),
      supabaseTitular: makeMockTitular(admin),
      fetchImpl: makeFetchMock(o, admin) as unknown as typeof fetch,
      modo: "producao" as const,
    },
  };
}

// ── (n) helpers: o laço PAGINADO ─────────────────────────────────────────────
Deno.test("(n) enumerarObjetosTitular pagina em laço: 3 páginas → a união das três", async () => {
  const h = await import("./helpers.ts");
  const paginas = [
    [{ name: "a.pdf" }, { name: "b.pdf" }],
    [{ name: "c.pdf" }, { name: "d.pdf" }],
    [{ name: "e.pdf" }],
  ];
  const chamadas: Array<{ limit: number; offset: number }> = [];
  const admin = {
    storage: {
      from: () => ({
        list: (_p: string, opts: { limit: number; offset: number }) => {
          chamadas.push(opts);
          return Promise.resolve({
            data: paginas[Math.floor(opts.offset / opts.limit)] ?? [],
            error: null,
          });
        },
      }),
    },
  };
  const caminhos = await h.enumerarObjetosTitular(admin, PREFIXO, 2);
  // ⚠ Um teste com UMA página só não satisfaz este critério: um `list()` sem laço
  // deixaria PII para trás EM SILÊNCIO, e o caminho feliz de uma página seria verde.
  assertEquals(caminhos.length, 5);
  assertEquals(caminhos, [
    `${PREFIXO}a.pdf`,
    `${PREFIXO}b.pdf`,
    `${PREFIXO}c.pdf`,
    `${PREFIXO}d.pdf`,
    `${PREFIXO}e.pdf`,
  ]);
  assert(chamadas.length >= 3, "o laço tem de pedir pelo menos 3 páginas");
  assertEquals(chamadas[0].offset, 0);
  assertEquals(chamadas[1].offset, 2);
});

Deno.test("(n2) enumerarObjetosTitular propaga erro de listagem — nunca devolve lista vazia", async () => {
  const h = await import("./helpers.ts");
  const admin = {
    storage: {
      from: () => ({
        list: () => Promise.resolve({ data: null, error: { message: "boom" } }),
      }),
    },
  };
  let lancou = false;
  try {
    await h.enumerarObjetosTitular(admin, PREFIXO, 2);
  } catch (e) {
    lancou = true;
    // A mensagem não pode carregar o prefixo (que é o `auth.uid()` do titular).
    assert(!String((e as Error).message).includes(AUTH_UID), "a mensagem não carrega o auth.uid");
  }
  assert(lancou, "erro de listagem VIRANDO lista vazia apagaria o passo 1 em silêncio");
});

// ── (o) helpers: união, dedup, divergências e ORDENAÇÃO ──────────────────────
Deno.test("(o) unirEDeduplicarCaminhos: dedup por caminho completo, divergências viram achado", async () => {
  const h = await import("./helpers.ts");
  // CV_B está nas DUAS listas; CV_A só no Storage (blob órfão); CV_C só no banco
  // (ponteiro morto). Nenhum dos três pode ser descartado.
  const r = h.unirEDeduplicarCaminhos([CV_B, CV_A], [CV_C, CV_B]);
  assertEquals(r.caminhos, [CV_A, CV_B, CV_C], "ordenado por caminho completo");
  assertEquals(r.caminhos.filter((c) => c === CV_B).length, 1, "presente nas duas → UMA vez");
  assertEquals(r.achados.length, 2);
  const porTipo = Object.fromEntries(r.achados.map((a) => [a.caminho, a.tipo]));
  assertEquals(porTipo[CV_A], "blob_orfao");
  assertEquals(porTipo[CV_C], "ponteiro_morto");
});

Deno.test("(o2) unirEDeduplicarCaminhos é DETERMINÍSTICO: ordem de entrada não é fonte de verdade", async () => {
  const h = await import("./helpers.ts");
  const a = h.unirEDeduplicarCaminhos([CV_C, CV_A, CV_B], []);
  const b = h.unirEDeduplicarCaminhos([CV_B, CV_C, CV_A], []);
  assertEquals(a.caminhos, b.caminhos);
  assertEquals(a.caminhos, [CV_A, CV_B, CV_C]);
});

// ── (p) helpers: lotes de no máximo 1000 ─────────────────────────────────────
Deno.test("(p) dividirEmLotes: 1200 itens → 2 lotes (1000 + 200); zero itens → zero lotes", async () => {
  const h = await import("./helpers.ts");
  const itens = Array.from({ length: 1200 }, (_, i) => `x${i}`);
  const lotes = h.dividirEmLotes(itens, 1000);
  assertEquals(lotes.length, 2);
  assertEquals(lotes[0].length, 1000);
  assertEquals(lotes[1].length, 200);
  assertEquals(h.dividirEmLotes([], 1000).length, 0);
  assertEquals(lotes.flat().length, 1200, "nenhum caminho pode se perder no fatiamento");
});

// ── (q) a janela ainda não venceu ────────────────────────────────────────────
Deno.test("(q) executar com executar_em no FUTURO → 400 VALIDATION e zero mutação", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({ pedido: { executar_em: FUTURO } });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error_code, "VALIDATION");
  assertEquals(json.motivo, "JANELA_ABERTA");
  assertEquals(admin.removeCalls.length, 0);
  assertEquals(admin.deleteUserCalls.length, 0);
  assertEquals(admin.updates.length, 0);
});

// ── (r) o guard FECHA no ilegível ────────────────────────────────────────────
Deno.test("(r) executar com executar_em ILEGÍVEL → 500, NUNCA liberação", async () => {
  const { handler } = await loadHandler();
  for (const ruim of [null, "", "amanhã", "2026-13-45T99:99:99Z"]) {
    const { admin, deps } = depsExecutar({ pedido: { executar_em: ruim } });
    const res = await handler(makeRequest({ acao: "executar" }), deps);
    assertEquals(res.status, 500, `executar_em=${JSON.stringify(ruim)} tem de FECHAR`);
    assert(res.status !== 200, "um carimbo ilegível JAMAIS libera a execução");
    assertEquals(admin.removeCalls.length, 0);
    assertEquals(admin.deleteUserCalls.length, 0);
  }
});

// ── (s) o passo 0 grava ANTES de qualquer mutação ────────────────────────────
Deno.test("(s) passo 0: o plano é persistido ANTES da primeira mutação de Storage", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_B.slice(PREFIXO.length) }, { name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [{ id: "c1", curriculo_url: CV_B }],
  });
  await handler(makeRequest({ acao: "executar" }), deps);

  const iEscrita = admin.ordem.indexOf("escreve:solicitacao");
  const iRemove = admin.ordem.indexOf("storage:remove");
  assert(iEscrita >= 0, "o plano tem de ser persistido");
  assert(iRemove >= 0, "o Storage tem de ser apagado");
  assert(iEscrita < iRemove, "capturar ANTES de mutar — é o que torna a mutação retomável");

  const plano = admin.updates[0].plano as Record<string, unknown>;
  assertEquals(plano.caminhos, [CV_A, CV_B], "persistido ORDENADO por caminho completo");
  assertEquals(plano.email, EMAIL_TITULAR, "o endereço é lido ANTES do tombstone");
  assertEquals(admin.updates[0].situacao, "executando");
  // A divergência (CV_A só no Storage) é ACHADO, nunca fundida em silêncio.
  assertEquals((plano.achados as unknown[]).length, 1);
});

// ── (t) determinismo entre execuções ─────────────────────────────────────────
Deno.test("(t) duas execuções com o list() paginando em ORDENS diferentes → MESMA lista", async () => {
  const { handler } = await loadHandler();
  const nomeA = CV_A.slice(PREFIXO.length);
  const nomeB = CV_B.slice(PREFIXO.length);
  const nomeC = CV_C.slice(PREFIXO.length);

  const um = depsExecutar({ paginas: [[{ name: nomeC }, { name: nomeA }, { name: nomeB }]] });
  await handler(makeRequest({ acao: "executar" }), um.deps);
  const dois = depsExecutar({ paginas: [[{ name: nomeB }, { name: nomeC }, { name: nomeA }]] });
  await handler(makeRequest({ acao: "executar" }), dois.deps);

  const p1 = (um.admin.updates[0].plano as Record<string, unknown>).caminhos;
  const p2 = (dois.admin.updates[0].plano as Record<string, unknown>).caminhos;
  assertEquals(p1, p2, "a ordem de paginação do list() NÃO é fonte de verdade");
  assertEquals(p1, [CV_A, CV_B, CV_C]);
});

// ── (u) zero objetos é SUCESSO, não erro ─────────────────────────────────────
Deno.test("(u) titular sem currículo: passo 1 completa, carimba, e NENHUM passo é falho", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[]],
    curriculos: [{ id: "c1", curriculo_url: null }],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  assertEquals(admin.removeCalls.length, 0, "sem caminhos, a Storage Admin API não é chamada");
  assert(admin.linha.storage_concluido_em, "storage_concluido_em TEM de ser carimbado");
  // ASSERÇÃO NEGATIVA: ausência de objeto nunca marca passo como falho.
  for (const u of admin.updates) {
    assertEquals(u.causa, undefined, "nenhum passo pode ser marcado como falho");
  }
  const plano = admin.updates[0].plano as Record<string, unknown>;
  assertEquals((plano.recorte as Record<string, boolean>).tem_curriculo, false);
});

// ── (v) falha FECHADA estrutural ─────────────────────────────────────────────
Deno.test("(v) curriculo_url não-nula com ZERO caminhos enumerados → falha FECHADA, sem mutar", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[]],
    curriculos: [{ id: "c1", curriculo_url: CV_A }],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  // Uma estrutura que DEVIA produzir itens e produziu zero é defeito, não caso vazio.
  assertEquals(admin.removeCalls.length, 0);
  assertEquals(admin.deleteUserCalls.length, 0);
  assertEquals(admin.linha.storage_concluido_em, null);
});

// ── (w) o retorno de remove() é CONFERIDO ────────────────────────────────────
Deno.test("(w) remove() devolvendo MENOS objetos → falha_storage e sem carimbo", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }, { name: CV_B.slice(PREFIXO.length) }]],
    // A Storage Admin API diz ter apagado só UM dos dois.
    removeResultado: (lote) => ({ data: [{ name: lote[0] }], error: null }),
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  assertEquals(admin.linha.storage_concluido_em, null, "conferência falhou → não carimba");
  assertEquals(admin.linha.causa, "falha_storage");
  assertEquals(admin.deleteUserCalls.length, 0, "um passo falho NUNCA avança para o próximo");
});

// ── (x) idempotência do passo 1 ──────────────────────────────────────────────
Deno.test("(x) com storage_concluido_em carimbado, a Storage Admin API NÃO é chamada", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: "2026-08-06T10:00:00.000Z",
      plano: {
        versao: 1,
        auth_uid: AUTH_UID,
        email: EMAIL_TITULAR,
        caminhos: [CV_A],
        achados: [],
        recorte: { tem_curriculo: true, tem_decisao_registrada: false },
        contagens: { storage_remove: 1 },
      },
    },
  });
  await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(admin.removeCalls.length, 0, "re-executar NÃO apaga de novo");
  assertEquals(admin.listCalls.length, 0, "nem re-enumera: o plano é a fonte");
});

// ── (y) lotes de no máximo 1000 no caminho real ──────────────────────────────
Deno.test("(y) 1200 caminhos → DUAS chamadas a remove()", async () => {
  const { handler } = await loadHandler();
  const nomes = Array.from(
    { length: 1200 },
    (_, i) => ({ name: `${String(i).padStart(6, "0")}.pdf` }),
  );
  // 12 páginas de 100 — o laço paginado tem de percorrer todas.
  const paginas: Array<Array<{ name: string }>> = [];
  for (let i = 0; i < nomes.length; i += 100) paginas.push(nomes.slice(i, i + 100));
  const { admin, deps } = depsExecutar({ paginas });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  assertEquals(admin.removeCalls.length, 2);
  assertEquals(admin.removeCalls[0].length, 1000);
  assertEquals(admin.removeCalls[1].length, 200);
});

// ═════════════════════════════════════════════════════════════════════════════
// Plano 45-10 · Task 2 — a metade Postgres e o hard delete que NÃO engole o erro
//
// ⚠ O PRECEDENTE VIVO DO REPOSITÓRIO É O PADRÃO ERRADO PARA ESTE CASO.
// `cadastrar-candidato/index.ts:268,390` e `gerenciar-usuario-rh/index.ts:366` fazem
// `deleteUser(userId).catch((e) => console.error(...))`. Ali está CERTO: o objetivo é
// não deixar usuário órfão depois de um cadastro que falhou segundos antes, sem linha
// filha nenhuma. Aqui seria CATASTRÓFICO — tornaria invisível exatamente o 23503,
// DEPOIS de o currículo já ter sido apagado do Storage, que não tem backup nem PITR.
// ═════════════════════════════════════════════════════════════════════════════

const CARIMBO_STORAGE = "2026-08-06T10:00:00.000Z";
const CARIMBO_POSTGRES = "2026-08-06T10:00:01.000Z";
const CARIMBO_AUTH = "2026-08-06T10:00:02.000Z";

/** Um plano já capturado — o passo 0 não roda de novo numa retomada. */
function planoCapturado(over: Record<string, unknown> = {}) {
  return {
    versao: 1,
    auth_uid: AUTH_UID,
    email: EMAIL_TITULAR,
    caminhos: [CV_A],
    achados: [],
    recorte: { tem_curriculo: true, tem_decisao_registrada: true },
    contagens: { storage_remove: 1, tombstone_candidato: 3 },
    achados_resumo: { blob_orfao: 0, ponteiro_morto: 0 },
    ...over,
  };
}

// ── (aa) a ORDEM é pré-condição de código, verificada contra a AUTORIDADE ────
Deno.test("(aa) postgres_concluido_em ausente → deleteUser NÃO é chamado", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    perdeCarimboPostgres: true,
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      plano: planoCapturado(),
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  // ⚠ A asserção que importa é a NEGATIVA: chamar deleteUser fora de ordem é
  // exatamente o caminho que produz o pior estado da fase — 23503 DEPOIS de o
  // currículo já ter sido apagado, irrecuperável.
  assertEquals(admin.deleteUserCalls.length, 0);
  assertEquals(admin.linha.causa, "falha_auth");
  assertEquals(admin.linha.auth_concluido_em, null);
  assertEquals(admin.linha.situacao, "executando", "nunca 'concluido' com carimbo ausente");
});

// ── (bb) idempotência do passo 2 ─────────────────────────────────────────────
Deno.test("(bb) com postgres_concluido_em carimbado, anonimizar_candidato NÃO é chamada", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      postgres_concluido_em: CARIMBO_POSTGRES,
      plano: planoCapturado(),
    },
  });
  await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(
    admin.rpcCalls.filter((c) => c.nome === "anonimizar_candidato").length,
    0,
    "re-executar NÃO roda o tombstone duas vezes",
  );
});

// ── (cc) idempotência do passo 3 ─────────────────────────────────────────────
Deno.test("(cc) com auth_concluido_em carimbado, deleteUser NÃO é chamado", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      postgres_concluido_em: CARIMBO_POSTGRES,
      auth_concluido_em: CARIMBO_AUTH,
      plano: planoCapturado(),
    },
  });
  await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(admin.deleteUserCalls.length, 0);
});

// ── (dd) o erro de deleteUser é PROPAGADO, jamais engolido ───────────────────
Deno.test("(dd) deleteUser que falha → falha_auth, sem carimbo, 500 e sem o corpo cru", async () => {
  const { handler } = await loadHandler();
  for (const variante of ["retorna_erro", "lanca"]) {
    const { admin, deps } = depsExecutar({
      pedido: {
        situacao: "executando",
        storage_concluido_em: CARIMBO_STORAGE,
        plano: planoCapturado(),
      },
      ...(variante === "lanca"
        ? { deleteUserLanca: true }
        : {
          deleteUser: {
            data: null,
            error: {
              code: "23503",
              message:
                'update or delete on table "users" violates foreign key constraint on table "historico_candidatura"',
            },
          },
        }),
    });
    const res = await handler(makeRequest({ acao: "executar" }), deps);
    assertEquals(res.status, 500, `variante ${variante}`);
    assertEquals(admin.deleteUserCalls.length, 1, "a chamada ACONTECEU e o erro NÃO sumiu");
    assertEquals(admin.linha.causa, "falha_auth");
    assertEquals(admin.linha.auth_concluido_em, null);
    assertEquals(admin.linha.situacao, "executando");
    const cru = JSON.stringify(await res.json());
    assert(!cru.includes("23503"), "SQLSTATE não vaza para o cliente");
    assert(!cru.includes("historico_candidatura"), "o corpo cru do erro não vaza");
  }
});

// ── (dd2) shouldSoftDelete = false, EXPLÍCITO (D-45-09) ──────────────────────
Deno.test("(dd2) deleteUser é chamado com (userId, false) — hard delete explícito", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      plano: planoCapturado(),
    },
  });
  await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(admin.deleteUserCalls.length, 1);
  // Soft delete falharia a LGPD DUAS vezes: o e-mail (que é PII) sobreviveria em
  // auth.users — o índice único vivo é parcial em `is_sso_user = false`, NÃO em
  // `deleted_at IS NULL` — e a pessoa ficaria silenciosamente impedida de voltar.
  assertEquals(admin.deleteUserCalls[0][0], AUTH_UID);
  assertEquals(admin.deleteUserCalls[0][1], false);
});

// ── (ee) o SQLSTATE de dry-run no caminho REAL é DEFEITO ─────────────────────
Deno.test("(ee) P45DR no caminho real é tratado como FALHA, jamais como sucesso", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      plano: planoCapturado(),
    },
    anonimizar: {
      data: null,
      error: { code: "P45DR", message: "P45 DRY-RUN concluido: nada foi persistido" },
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  // ⚠ O PIOR FALSO VERDE POSSÍVEL DESTA FASE seria ler "dry-run concluído com
  // sucesso" como sucesso: significaria que alguém trocou o default ou o parâmetro,
  // e o pedido seria marcado concluído sem nada ter sido anonimizado.
  assertEquals(res.status, 500);
  assertEquals(admin.linha.postgres_concluido_em, null);
  assertEquals(admin.linha.causa, "falha_postgres");
  assertEquals(admin.deleteUserCalls.length, 0);
});

Deno.test("(ee2) anonimizar_candidato que não devolve resultado conhecido → FALHA", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      plano: planoCapturado(),
    },
    // "não lançou" NÃO é a mesma coisa que "completou" — a lição do 42804 da Phase 43,
    // que sobreviveu a um smoke 10/10 verde.
    anonimizar: { data: {}, error: null },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  assertEquals(admin.linha.postgres_concluido_em, null);
  assertEquals(admin.deleteUserCalls.length, 0);
});

Deno.test("(ee3) anonimizar_candidato é chamada com p_dry_run: false e o id do SERVIDOR", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      plano: planoCapturado(),
    },
  });
  await handler(
    makeRequest({ acao: "executar", candidato_id: CANDIDATO_ALHEIO }),
    deps,
  );
  const chamada = admin.rpcCalls.find((c) => c.nome === "anonimizar_candidato");
  assert(chamada, "o passo 2 CHAMA a metade Postgres — nunca a reimplementa");
  assertEquals(chamada.args.p_dry_run, false);
  assertEquals(chamada.args.p_candidato_id, CANDIDATO_ID);
  assert(
    JSON.stringify(chamada.args).indexOf(CANDIDATO_ALHEIO) === -1,
    "T-32-03: o id vindo do corpo jamais alcança a RPC que apaga",
  );
});

// ── (ff) `concluido` exige os TRÊS carimbos ──────────────────────────────────
Deno.test("(ff) situacao só vira 'concluido' com os três carimbos presentes", async () => {
  const { handler } = await loadHandler();
  // Caminho completo: os três acontecem → 'concluido'.
  const completo = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      plano: planoCapturado(),
    },
  });
  await handler(makeRequest({ acao: "executar" }), completo.deps);
  assertEquals(completo.admin.linha.situacao, "concluido");
  assert(completo.admin.linha.postgres_concluido_em);
  assert(completo.admin.linha.auth_concluido_em);

  // Passo 3 falho → permanece 'executando'. É a tradução em dados da Invariante 5.
  const parcial = depsExecutar({
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      plano: planoCapturado(),
    },
    deleteUser: { data: null, error: { message: "boom" } },
  });
  await handler(makeRequest({ acao: "executar" }), parcial.deps);
  assertEquals(parcial.admin.linha.situacao, "executando");
  for (const u of parcial.admin.updates) {
    assert(u.situacao !== "concluido", "nenhum update pode declarar conclusão cedo");
  }
});

// ── (gg) log REDIGIDO com um erro em CADA passo ──────────────────────────────
Deno.test("(gg) um erro por passo: nenhum console.* recebe e-mail, nome, caminho, URL ou id completo", async () => {
  const { handler } = await loadHandler();
  const original = { error: console.error, log: console.log, warn: console.warn };
  const capturado: unknown[] = [];
  console.error = (...a: unknown[]) => capturado.push(...a);
  console.log = (...a: unknown[]) => capturado.push(...a);
  console.warn = (...a: unknown[]) => capturado.push(...a);
  try {
    const cenarios: ExecOpts[] = [
      // falha no passo 1 (conferência do retorno)
      {
        pedido: { situacao: "executando", plano: planoCapturado() },
        removeResultado: () => ({ data: [], error: null }),
      },
      // falha no passo 2
      {
        pedido: {
          situacao: "executando",
          storage_concluido_em: CARIMBO_STORAGE,
          plano: planoCapturado(),
        },
        anonimizar: { data: null, error: { code: "XX000", message: `boom em ${CV_A}` } },
      },
      // falha no passo 3
      {
        pedido: {
          situacao: "executando",
          storage_concluido_em: CARIMBO_STORAGE,
          plano: planoCapturado(),
        },
        deleteUser: { data: null, error: { message: `https://x/${EMAIL_TITULAR}` } },
      },
    ];
    for (const c of cenarios) {
      const { deps } = depsExecutar(c);
      await handler(
        makeRequest({ acao: "executar", email: EMAIL_TITULAR, nome: "Fulano de Tal" }),
        deps,
      );
    }
    const tudo = capturado.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ");
    for (
      const proibido of [
        EMAIL_TITULAR,
        "Fulano de Tal",
        CV_A,
        PEDIDO_ID,
        CANDIDATO_ID,
        AUTH_UID,
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

// ── (hh) depois do passo 1, NINGUÉM pode afirmar que nada foi apagado ────────
Deno.test("(hh) nenhuma resposta do motor afirma que nada foi apagado", async () => {
  const { handler } = await loadHandler();
  const cenarios: ExecOpts[] = [
    { pedido: { situacao: "executando", plano: planoCapturado() }, removeResultado: () => ({ data: [], error: null }) },
    {
      pedido: { situacao: "executando", storage_concluido_em: CARIMBO_STORAGE, plano: planoCapturado() },
      anonimizar: { data: null, error: { code: "XX000", message: "boom" } },
    },
    {
      pedido: { situacao: "executando", storage_concluido_em: CARIMBO_STORAGE, plano: planoCapturado() },
      deleteUser: { data: null, error: { message: "boom" } },
    },
  ];
  for (const c of cenarios) {
    const { deps } = depsExecutar(c);
    const res = await handler(makeRequest({ acao: "executar" }), deps);
    const corpo = JSON.stringify(await res.json()).toLowerCase();
    // A mutação Storage -> Postgres -> Auth não é atômica: a partir do passo 1 a
    // frase é INGARANTÍVEL, e uma frase tranquilizadora que envelhece para falsa é
    // pior que nenhuma.
    assert(!corpo.includes("nada foi apagado"), `resposta afirmou o ingarantível: ${corpo}`);
    assert(!corpo.includes("nenhum dado foi"), `resposta afirmou o ingarantível: ${corpo}`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Plano 45-10 · Task 3 — o recibo em tempo passado, FORA do ledger
//
// ⚠ ESTE É O ÚNICO E-MAIL DA FASE CUJO DESTINATÁRIO LEGÍTIMO É O TITULAR, o que
// torna tentador interpolar o nome "para ficar pessoal". É exatamente por isso que a
// asserção negativa usa fixture com TODOS os identificadores disponíveis na entrada.
//
// ⚠ E ELE NÃO ENTRA EM `notificacoes_enviadas` (D-45-12 / saída R1): aquela tabela
// tem `destinatario_email` E `destinatario_original`, ambos NOT NULL — o endereço
// seria gravado DUAS vezes por linha — além de `candidatura_id` e `candidato_id`
// NOT NULL, e o recibo de exclusão é evento DE CONTA. A prova de envio é
// `solicitacoes_dados.recibo_enviado_em`.
// ═════════════════════════════════════════════════════════════════════════════

/** Fixture com TUDO o que o corpo do e-mail jamais pode conter. */
const PII_FIXTURE = {
  nome: "Fulano de Tal da Silva",
  cpf: "123.456.789-09",
  telefone: "(11) 98765-4321",
  candidato_id: CANDIDATO_ID,
  solicitacao_id: PEDIDO_ID,
  email: EMAIL_TITULAR,
  titulo_vaga: "Dentista Clínico Geral",
  caminho_curriculo: CV_A,
};

/** Pronto para o passo 4: os três carimbos presentes, recibo ainda não enviado. */
function pedidoProntoParaRecibo(over: Record<string, unknown> = {}) {
  return {
    situacao: "executando",
    storage_concluido_em: CARIMBO_STORAGE,
    postgres_concluido_em: CARIMBO_POSTGRES,
    plano: planoCapturado(),
    ...over,
  };
}

// ── (jj) idempotência do passo 4 ─────────────────────────────────────────────
Deno.test("(jj) com recibo_enviado_em carimbado, o Resend NÃO é chamado", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    pedido: pedidoProntoParaRecibo({
      auth_concluido_em: CARIMBO_AUTH,
      recibo_enviado_em: "2026-08-06T10:00:03.000Z",
      situacao: "concluido",
    }),
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  assertEquals(admin.fetchCalls.length, 0, "segundo envio é curto-circuitado por ESTADO");
});

// ── (kk) ASSERÇÃO NEGATIVA DE LEDGER ─────────────────────────────────────────
Deno.test("(kk) o recibo NÃO escreve em notificacoes_enviadas, em execução nenhuma", async () => {
  const { handler } = await loadHandler();
  for (
    const cenario of [
      pedidoProntoParaRecibo(),
      pedidoProntoParaRecibo({ auth_concluido_em: CARIMBO_AUTH }),
      { situacao: "agendado", plano: null },
    ]
  ) {
    const { admin, deps } = depsExecutar({ pedido: cenario as Record<string, unknown> });
    await handler(makeRequest({ acao: "executar" }), deps);
    // O mock daquela tabela marca `ledgerTocado` — R1 elimina o problema na origem:
    // NENHUM endereço do titular é persistido pelo recibo.
    assertEquals(admin.ledgerTocado, false, "o recibo tocou o ledger de notificações");
  }
});

// ── (ll) fixture completa: nada de PII no HTML montado ───────────────────────
Deno.test("(ll) o corpo do recibo não contém nome, CPF, telefone, nem id nenhum", async () => {
  const h = await import("./helpers.ts");
  // ⚠ Todos os valores de PII_FIXTURE estão DISPONÍVEIS aqui. A assinatura de
  // `corpoReciboExclusao` é o controle: ela não aceita nenhum deles.
  const html = h.corpoReciboExclusao({
    dataConclusao: CARIMBO_AUTH,
    temCurriculo: true,
    temDecisaoRegistrada: true,
  });
  for (const [chave, valor] of Object.entries(PII_FIXTURE)) {
    assert(!html.includes(valor), `o recibo vazou ${chave}: ${valor}`);
  }
  // Nem verbo de recuperação, nem anexo, nem link autenticado.
  for (const proibido of ["reverter", "recuperar", "desfazer", "anexo", "token="]) {
    assert(!html.toLowerCase().includes(proibido), `o recibo contém "${proibido}"`);
  }
  // O que ELE TEM: a data e a afirmação de que a conta não existe mais.
  assert(html.includes("06/08/2026"), "a data de conclusão em dd/mm/aaaa");
  assert(html.includes("Sua conta de acesso não existe mais"));
  // Duas colunas EMPILHADAS, com os DOIS cabeçalhos, na ordem «sai» → «mantém».
  const iSai = html.indexOf("O que é apagado");
  const iMantem = html.indexOf("O que a Beauty Smile mantém");
  assert(iSai >= 0 && iMantem >= 0, "os dois cabeçalhos são obrigatórios");
  assert(iSai < iMantem, "a ordem é «sai» → «mantém»");
  // E8·overflow: cliente de e-mail é hostil a grid, e as duas colunas EMPILHADAS
  // são contrato. A comparação é contra o `layoutBase` VAZIO: ela prova que o corpo
  // do recibo não acrescentou UMA tabela de layout sequer nem uma largura fixa — as
  // que existem são do wrapper compartilhado, que não é deste plano.
  const { layoutBase } = await import("../_shared/email-templates.ts");
  const vazio = layoutBase({ preheader: "x", conteudoHtml: "" });
  const conta = (s: string, re: RegExp) => (s.match(re) ?? []).length;
  assert(!/display\s*:\s*grid/i.test(html), "sem grid");
  assert(!/grid-cols/i.test(html), "sem grid");
  assertEquals(conta(html, /<table/gi), conta(vazio, /<table/gi), "sem tabela aninhada");
  assertEquals(conta(html, /width\s*=/gi), conta(vazio, /width\s*=/gi), "sem largura fixa");
  // Nada abaixo de 14px foi autorado por este corpo.
  const tamanhos = [...html.matchAll(/font-size\s*:\s*(\d+)px/gi)].map((m) => Number(m[1]));
  const tamanhosBase = [...vazio.matchAll(/font-size\s*:\s*(\d+)px/gi)].map((m) => Number(m[1]));
  const menorHerdado = Math.min(...tamanhosBase);
  for (const t of tamanhos) {
    assert(t >= 14 || tamanhosBase.includes(t), `font-size ${t}px abaixo de 14px foi autorado aqui`);
  }
  assert(menorHerdado < 14, "o rodapé herdado é a única fonte abaixo de 14px");
});

Deno.test("(ll2) o assunto é fixo, sem interpolação e sem CR/LF", async () => {
  const h = await import("./helpers.ts");
  const assunto = h.assuntoReciboExclusao();
  assertEquals(assunto, "[Beauty Smile] Seus dados foram apagados");
  assert(!/[\r\n]/.test(assunto), "CR/LF em assunto é injeção de header de e-mail");
  for (const valor of Object.values(PII_FIXTURE)) {
    assert(!assunto.includes(valor), "o assunto não nomeia ninguém");
  }
});

// ── (mm) os dois recortes OMITEM a linha inaplicável ─────────────────────────
Deno.test("(mm) temCurriculo=false e temDecisaoRegistrada=false OMITEM as linhas inaplicáveis", async () => {
  const h = await import("./helpers.ts");
  const { RECIBO_EXCLUSAO } = await import("../_shared/reciboExclusao.ts");

  const completo = h.corpoReciboExclusao({
    dataConclusao: CARIMBO_AUTH,
    temCurriculo: true,
    temDecisaoRegistrada: true,
  });
  const semCv = h.corpoReciboExclusao({
    dataConclusao: CARIMBO_AUTH,
    temCurriculo: false,
    temDecisaoRegistrada: true,
  });
  const semDecisao = h.corpoReciboExclusao({
    dataConclusao: CARIMBO_AUTH,
    temCurriculo: true,
    temDecisaoRegistrada: false,
  });

  const itens = [...RECIBO_EXCLUSAO.colunas_sai, ...RECIBO_EXCLUSAO.colunas_mantem];
  const doCv = itens.filter((i) => i.aplicavel_quando === "tem_curriculo");
  const daDecisao = itens.filter((i) => i.aplicavel_quando === "tem_decisao_registrada");
  assert(doCv.length > 0 && daDecisao.length > 0, "o recorte tem de ter o que filtrar");

  for (const i of doCv) {
    assert(completo.includes(i.rotulo), `${i.item_id} tem de aparecer no recibo completo`);
    assert(!semCv.includes(i.rotulo), `${i.item_id} tem de SUMIR sem currículo`);
  }
  for (const i of daDecisao) {
    assert(completo.includes(i.rotulo), `${i.item_id} tem de aparecer no recibo completo`);
    assert(!semDecisao.includes(i.rotulo), `${i.item_id} tem de SUMIR sem decisão`);
  }
  // O `sempre` nunca some — o recibo não pode encolher por engano.
  for (const i of itens.filter((x) => x.aplicavel_quando === "sempre")) {
    for (const html of [completo, semCv, semDecisao]) {
      assert(html.includes(i.rotulo), `${i.item_id} é 'sempre' e sumiu`);
    }
  }
});

// ── (nn) tempo PASSADO, nunca futuro ─────────────────────────────────────────
Deno.test("(nn) o corpo usa texto_passado — e nenhum texto_futuro sobrevive nele", async () => {
  const h = await import("./helpers.ts");
  const { RECIBO_EXCLUSAO } = await import("../_shared/reciboExclusao.ts");
  const html = h.corpoReciboExclusao({
    dataConclusao: CARIMBO_AUTH,
    temCurriculo: true,
    temDecisaoRegistrada: true,
  });
  const itens = [...RECIBO_EXCLUSAO.colunas_sai, ...RECIBO_EXCLUSAO.colunas_mantem];
  for (const i of itens) {
    assert(html.includes(i.texto_passado), `${i.item_id}: falta o texto em tempo passado`);
    assert(
      !html.includes(i.texto_futuro),
      `${i.item_id}: o recibo do e-mail está em tempo FUTURO — ele relata, não promete`,
    );
  }
  // Os cabeçalhos também são os do tempo passado.
  assert(html.includes(RECIBO_EXCLUSAO.cabecalhos.sai.passado));
  assert(!html.includes(RECIBO_EXCLUSAO.cabecalhos.sai.futuro));
  // A base legal aparece ao lado do item, nunca em rodapé nem tooltip.
  for (const i of RECIBO_EXCLUSAO.colunas_mantem) {
    assert(html.includes(i.base_legal), `${i.item_id}: falta a base legal ao lado do item`);
  }
});

// ── (oo) o `plano` é ESVAZIADO no fecho ──────────────────────────────────────
Deno.test("(oo) depois de recibo_enviado_em, o plano fica só com as contagens", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({ pedido: pedidoProntoParaRecibo() });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  assert(admin.linha.recibo_enviado_em, "o envio tem de ser carimbado");
  const plano = admin.linha.plano as Record<string, unknown>;
  // ⚠ O caminho de Storage embute o `auth.uid()` do titular: é PII sobrevivendo
  // dentro do PRÓPRIO registro de exclusão. A prova de que a exclusão aconteceu não
  // precisa dos ponteiros para o que foi apagado.
  assertEquals(plano.caminhos, undefined, "o caminho de Storage não pode ficar");
  assertEquals(plano.email, undefined, "o endereço do titular não pode ficar");
  assertEquals(plano.auth_uid, undefined, "o auth.uid não pode ficar");
  assertEquals(plano.achados, undefined, "os caminhos dos achados não podem ficar");
  assert(plano.contagens, "as contagens por passo FICAM — elas são a prova");
  assert(plano.achados_resumo, "os achados ficam AGREGADOS");
  const serializado = JSON.stringify(plano);
  assert(!serializado.includes(AUTH_UID), "nenhum resquício do auth.uid no plano");
  assert(!serializado.includes(EMAIL_TITULAR), "nenhum resquício do endereço no plano");
});

// ── (pp) falha de envio: o recibo pode falhar, não pode SUMIR ────────────────
Deno.test("(pp) envio que falha → causa='falha_recibo' e sem carimbo de recibo", async () => {
  const { handler } = await loadHandler();
  for (
    const variante of [
      { fetchLanca: true },
      { respostaResend: { ok: false, status: 422, corpo: { message: "bounce" } } },
    ]
  ) {
    const { admin, deps } = depsExecutar({ pedido: pedidoProntoParaRecibo(), ...variante });
    const res = await handler(makeRequest({ acao: "executar" }), deps);
    assertEquals(res.status, 500);
    assertEquals(admin.linha.causa, "falha_recibo");
    assertEquals(admin.linha.recibo_enviado_em, null);
    // O pedido continua RETOMÁVEL: os três carimbos destrutivos permanecem.
    assert(admin.linha.auth_concluido_em, "o hard delete já aconteceu e não se desfaz");
    // E o plano NÃO foi esvaziado — o endereço ainda é necessário para retomar.
    assert((admin.linha.plano as Record<string, unknown>).email, "o endereço fica até o envio");
  }
});

// ── (qq) o cinto secundário no Resend ────────────────────────────────────────
Deno.test("(qq) o envio carrega header Idempotency-Key e vai para o endereço DO PLANO", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({ pedido: pedidoProntoParaRecibo() });
  await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(admin.fetchCalls.length, 1);
  const { url, init } = admin.fetchCalls[0];
  assertEquals(url, "https://api.resend.com/emails");
  const headers = (init.headers ?? {}) as Record<string, string>;
  assert(headers["Idempotency-Key"], "falta o cinto secundário de idempotência no Resend");
  const corpo = JSON.parse(String(init.body));
  // ⚠ O endereço vem do PLANO (lido no passo 0), nunca de uma consulta ao banco: a
  // conta já não existe e `candidatos.email` já é a sentinela do tombstone.
  assertEquals(corpo.to, EMAIL_TITULAR);
  assertEquals(corpo.subject, "[Beauty Smile] Seus dados foram apagados");
  // Nenhuma leitura de `candidatos` acontece DEPOIS do tombstone para achar o e-mail.
  assertEquals(
    admin.ordem.filter((x) => x === "le:candidatos").length,
    1,
    "o endereço não é relido: a única leitura de candidatos é a da autorização",
  );
});

// ── (rr) o guard non-prod não deixa o recibo alcançar pessoa real em teste ───
Deno.test("(rr) em modo teste o envio é desviado para o sink — nunca ao endereço real", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({ pedido: pedidoProntoParaRecibo() });
  const res = await handler(makeRequest({ acao: "executar" }), {
    ...deps,
    modo: "teste" as const,
  });
  assertEquals(res.status, 200);
  const corpo = JSON.parse(String(admin.fetchCalls[0].init.body));
  assert(/@resend\.dev$/.test(String(corpo.to)), `envio de teste foi para ${corpo.to}`);
  assert(!String(corpo.to).includes(EMAIL_TITULAR));
});

// ═════════════════════════════════════════════════════════════════════════════
// Plano 45-12 · Task 1 — O TERCEIRO CLIENT (fecha a metade de ESCRITA do
// `DI-45-10-01`)
//
// ── O DEFEITO QUE NENHUM PORTÃO ANTERIOR PODERIA PEGAR ───────────────────────
// A Edge Function está certa sozinha. As RPCs estão certas sozinhas. O defeito vive
// na JUNTA: o `supabaseAdmin` é construído com a service-role key e SEM repassar o
// `Authorization` do titular, então o JWT que chega ao PostgREST não tem claim `sub`,
// `auth.uid()` é NULL, e as cinco RPCs desta fase abrem recusando exatamente isso com
// `42501`. Plan-checker, code review e `md5` byte-perfeito passaram; só o fluxo real
// reprova.
//
// ── POR QUE UM TERCEIRO CLIENT, E NÃO O HEADER NO CLIENT QUE JÁ EXISTE ───────
// O `Authorization` é o MESMO header para PostgREST, para a Storage API e para a
// Auth Admin API. Acrescentá-lo ao client de serviço não "melhora as RPCs": troca o
// papel de TODAS as chamadas dele para `authenticated` de uma vez. `deleteUser`
// passa a 403, `ler_resend_api_key` está REVOGADA de `authenticated` desde a P36, e
// os carimbos em `solicitacoes_dados` passam a depender de uma policy own-row que o
// tombstone QUEBRA POR DESENHO (D-45-11) — os passos 3 e 4 falhariam DEPOIS da
// mutação irreversível.
//
// ⚠ A METADE QUE IMPORTA É A NEGATIVA. Um caminho feliz é verde com o defeito
// presente nos dois sentidos: com as claims faltando (hoje) e com elas vazando para
// onde não deviam (o conserto feito errado).
// ═════════════════════════════════════════════════════════════════════════════

/** As quatro RPCs que exigem `auth.uid()` resolvido dentro do banco. */
const RPCS_DO_TITULAR = [
  "registrar_pedido_exclusao",
  "cancelar_pedido_exclusao",
  "plano_exclusao_titular",
  "anonimizar_candidato",
];

// ── (ss) as quatro RPCs saem do client do TITULAR, e zero do de serviço ──────
Deno.test("(ss) 'pedir' e 'cancelar': a RPC sai do client do titular, nunca do de serviço", async () => {
  const { handler } = await loadHandler();
  for (const acao of ["pedir", "cancelar"]) {
    const admin = makeMockSupabaseAdmin(acao === "pedir" ? { pedidoAberto: null } : {});
    const res = await handler(makeRequest({ acao }), {
      supabaseAdmin: admin,
      supabaseUser: makeMockSupabaseUser(TITULAR),
      supabaseTitular: makeMockTitular(admin),
    });
    assertEquals(res.status, 200, `ação ${acao}`);
    assertEquals(admin.rpcNoTitular.length, 1, `${acao}: a RPC tem de sair COM as claims`);
    assertEquals(
      admin.rpcNoServico.length,
      0,
      `${acao}: sem as claims auth.uid() e NULL e a RPC recusa com 42501 (DI-45-10-01)`,
    );
  }
});

Deno.test("(ss2) 'executar': plano_exclusao_titular e anonimizar_candidato saem do client do titular", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [{ id: "c1", curriculo_url: CV_A }],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  const noTitular = admin.rpcNoTitular.map((c) => c.nome);
  const noServico = admin.rpcNoServico.map((c) => c.nome);
  for (const nome of ["plano_exclusao_titular", "anonimizar_candidato"]) {
    assert(noTitular.includes(nome), `${nome} tem de sair do client do titular`);
    assert(!noServico.includes(nome), `${nome} sem claims recusa com 42501`);
  }
  // ⚠ E `ler_resend_api_key` fica onde estava: ela é REVOGADA de `authenticated`
  // desde a P36 (`20260722000001:74`). Migrá-la de carona quebraria o passo 4 DEPOIS
  // do hard delete, quando não existe mais conta a quem responder.
  assert(noServico.includes("ler_resend_api_key"), "ler_resend_api_key exige service_role");
  assert(!noTitular.includes("ler_resend_api_key"), "ler_resend_api_key nunca vai ao titular");
});

// ── (ss3) o caminho completo de `executar` segue verde com o client dividido ──
Deno.test("(ss3) os quatro passos completam com o client dividido: carimbos, remove() e recibo", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [{ id: "c1", curriculo_url: CV_A }],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  assert(admin.linha.storage_concluido_em, "passo 1 carimbado");
  assert(admin.linha.postgres_concluido_em, "passo 2 carimbado");
  assert(admin.linha.auth_concluido_em, "passo 3 carimbado");
  assert(admin.linha.recibo_enviado_em, "passo 4 carimbado");
  assertEquals(admin.linha.situacao, "concluido");
  assertEquals(admin.removeCalls.length, 1);
  assertEquals(admin.deleteUserCalls.length, 1);
  assertEquals(admin.fetchCalls.length, 1);
});

// ── (ss4) deleteUser, Storage e as tabelas NUNCA mudam de client ─────────────
Deno.test("(ss4) deleteUser, Storage e toda leitura/escrita de tabela seguem no client de serviço", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [{ id: "c1", curriculo_url: CV_A }],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  // Se qualquer um desses caminhos tivesse sido movido para o client do titular, o
  // mock teria LANÇADO e o handler responderia 500 — a asserção negativa mora no
  // mock, não numa lista que alguém precisa lembrar de atualizar.
  assertEquals(res.status, 200);
  assertEquals(admin.deleteUserCalls.length, 1, "deleteUser exige service_role (Auth Admin)");
  assert(admin.listCalls.length > 0, "a enumeração do bucket exige service_role");
  assertEquals(admin.removeCalls.length, 1, "storage.remove exige service_role");
  assert(admin.updates.length > 0, "os carimbos exigem service_role: a policy own-row quebra");
});

// ── (ss5) META-TESTE: o mock do titular REPROVA de verdade ───────────────────
Deno.test("(ss5) o mock do client do titular LANÇA se auth, storage ou uma tabela for tocada nele", () => {
  const admin = makeMockSupabaseAdmin();
  const titular = makeMockTitular(admin);
  // ⚠ Sem esta prova, a asserção negativa de (ss4) poderia estar VAZIA: um mock
  // permissivo deixaria a migração indevida passar em verde. É a mesma lição do
  // meta-teste irmão do CONSOL-04 — um predicado que não discrimina não é gate.
  for (const caminho of ["auth", "storage", "from"] as const) {
    let lancou = false;
    try {
      // deno-lint-ignore no-explicit-any
      void (titular as any)[caminho];
    } catch (e) {
      lancou = true;
      assert(
        String((e as Error).message).includes(caminho === "auth" ? "auth.admin" : caminho),
        `a mensagem tem de NOMEAR o caminho tocado, e nomeou: ${(e as Error).message}`,
      );
    }
    assert(lancou, `o mock do titular aceitou ${caminho} — a asserção negativa estaria vazia`);
  }
  // E `rpc` continua funcionando: o mock proíbe o excedente, não a razão de existir.
  assert(typeof titular.rpc === "function");
});

// ── (ss6) 42501 de qualquer das quatro continua virando 403 ──────────────────
Deno.test("(ss6) 42501 vindo da RPC do titular → 403 FORBIDDEN, sem SQLSTATE atravessando", async () => {
  const { handler } = await loadHandler();
  for (const nome of ["registrar_pedido_exclusao", "cancelar_pedido_exclusao"]) {
    const admin = makeMockSupabaseAdmin({
      rpc: {
        [nome]: {
          data: null,
          error: { code: "42501", message: "FORBIDDEN: chamador sem sessao ..." },
        },
      },
    });
    const res = await handler(
      makeRequest({ acao: nome === "registrar_pedido_exclusao" ? "pedir" : "cancelar" }),
      {
        supabaseAdmin: admin,
        supabaseUser: makeMockSupabaseUser(TITULAR),
        supabaseTitular: makeMockTitular(admin),
      },
    );
    assertEquals(res.status, 403, nome);
    const json = await res.json();
    assertEquals(json.error_code, "FORBIDDEN");
    const cru = JSON.stringify(json);
    assert(!cru.includes("42501"), "SQLSTATE não pode vazar para o titular");
    assert(!cru.includes("chamador sem sessao"), "mensagem crua do banco não vaza");
  }
  assertEquals(RPCS_DO_TITULAR.length, 4, "são QUATRO as RPCs que precisam das claims");
});
