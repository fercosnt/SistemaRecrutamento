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
    // ⚠ 45-13 / CR-05: a chave que a EF LÊ para recusar ANTES do passo 1. Vazia é o
    // estado esperado de um titular puro.
    bloqueadores_deleteuser: [],
    ...over,
  };
}

/**
 * O jsonb que `anonimizar_candidato` devolve no caminho REAL (45-13).
 *
 * ⚠ As contagens vêm DAQUI, não do `plano_exclusao_titular` (WR-01): estas são
 * `ROW_COUNT` real, aquelas eram previsão — e um titular com nove candidaturas produzia
 * uma contagem inflada gravada no registro que sobrevive à exclusão.
 * ⚠ E o bloco `executor` é a trilha: papel, se era o titular, e o `uid` APENAS quando
 * NÃO era — o uid do titular é o identificador que a exclusão existe para apagar.
 */
function retornoAnonimizar(over: Record<string, unknown> = {}) {
  return {
    resultado: "anonimizado",
    candidato_id: CANDIDATO_ID,
    severacao_por_user_id: true,
    executor: { papel: "candidato", foi_o_titular: true },
    passos: {
      tombstone_candidato: { candidatos: 1, candidaturas_curriculo: 2 },
      tombstone_decisao_final: { decisao_final: 1, decisao_final_historico: 1 },
      severar_user_id: { candidatos: 1, candidaturas_autoria: 0, historico_candidatura_ator: 1 },
      severar_fks_set_null: { ai_call_logs: 0, preferencias_notificacoes: 0 },
      scrub_ledger_email: { notificacoes_enviadas: 0 },
    },
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
  /**
   * ⚠ 45-13 / CR-02 — objetos que CONTINUAM no bucket depois do laço de remoção, por
   * nome (sem prefixo). É o resíduo: a conferência do passo 1 passou a ser sobre o
   * PÓS-ESTADO do bucket, e resíduo REPROVA. Sem esta opção não haveria como exercitar
   * a falha FECHADA depois de a conferência deixar de ser sobre o retorno de `remove()`.
   */
  residuoAposRemove?: string[];
  /** ⚠ 45-13 / WR-08 — o `UPDATE` que grava a `causa` devolve erro. */
  falhaAoGravarCausa?: boolean;
}

function makeMockAdminExecutar(o: ExecOpts = {}) {
  const cand = o.cand === undefined ? { id: CANDIDATO_ID, email: EMAIL_TITULAR } : o.cand;
  const paginas = o.paginas ?? [];
  const curriculos = o.curriculos ?? [];
  const linha: Record<string, unknown> = {
    id: PEDIDO_ID,
    // ⚠ 45-13 / CR-03: o reencontro pós-tombstone segue para `executarExclusao` com o
    // `candidato_id` DO PEDIDO — `candidatos.user_id` já não resolve nada.
    candidato_id: CANDIDATO_ID,
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

  /**
   * ⚠ 45-13 — O BUCKET COMO ESTADO, e não como constante.
   * `vivos` são os objetos que ainda existem, por NOME (sem prefixo). `remove()` os
   * retira; o `list()` posterior serve o que sobrou. É o que torna a re-enumeração do
   * CR-02 uma medição de verdade, em vez de uma leitura de fixture congelada.
   */
  const vivos = new Set<string>(paginas.flatMap((p) => p.map((l) => l.name)));
  /** Um caminho completo (`{authUid}/{uuid}.pdf`) reduzido ao nome do objeto. */
  const nomeDe = (caminho: string): string => caminho.split("/").slice(1).join("/");

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
        o.anonimizar ?? { data: retornoAnonimizar(), error: null },
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
        /** ⚠ WR-08: o último patch escrito, para que a gravação da `causa` possa falhar. */
        let ultimoPatch: Record<string, unknown> = {};
        // deno-lint-ignore no-explicit-any
        const chain: any = {
          select: () => {
            ordem.push("le:solicitacao");
            return chain;
          },
          update: (patch: Record<string, unknown>) => {
            ordem.push("escreve:solicitacao");
            updates.push(patch);
            ultimoPatch = patch;
            if (o.falhaAoGravarCausa && patch.causa !== undefined) return chain;
            const aplicado = { ...patch };
            if (o.perdeCarimboPostgres) delete aplicado.postgres_concluido_em;
            Object.assign(linha, aplicado);
            return chain;
          },
          eq: () => chain,
          in: () => chain,
          // ⚠ 45-13: o construtor real do PostgREST tem `.is()`, e o reencontro do CR-03
          // filtra `recibo_enviado_em IS NULL` por ele. Um mock sem este método faria o
          // teste falhar por lacuna do dublê, e não por defeito do código.
          is: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: () =>
            Promise.resolve({
              data: o.pedidoErro ? null : pedido,
              error: o.pedidoErro ?? null,
            }),
          // deno-lint-ignore no-explicit-any
          then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
            Promise.resolve({
              data: null,
              error: (o.falhaAoGravarCausa && ultimoPatch.causa !== undefined)
                ? { message: "conexao caiu ao gravar a causa" }
                : null,
            }).then(onF, onR),
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
          /**
           * ⚠ 45-13: o `list()` deixou de ser uma constante e passou a servir o ESTADO
           * do bucket, porque a conferência do passo 1 passou a ser sobre o PÓS-ESTADO
           * dele (CR-02). Antes do primeiro `remove()` ele serve as páginas literais —
           * que é o que preserva as asserções de ORDEM de paginação; depois, ele serve
           * o que sobrou. Um mock que devolvesse as páginas originais na re-enumeração
           * reprovaria a implementação CORRETA, dizendo que tudo continua lá.
           */
          list(prefixo: string, opts: { limit: number; offset: number }) {
            ordem.push("storage:list");
            listCalls.push({ prefixo, limit: opts.limit, offset: opts.offset });
            if (o.listErro) return Promise.resolve({ data: null, error: o.listErro });
            const idx = Math.floor(opts.offset / opts.limit);
            if (removeCalls.length === 0) {
              return Promise.resolve({ data: paginas[idx] ?? [], error: null });
            }
            const restantes = [...vivos, ...(o.residuoAposRemove ?? [])]
              .map((name) => ({ name }));
            return Promise.resolve({
              data: restantes.slice(opts.offset, opts.offset + opts.limit),
              error: null,
            });
          },
          remove(lote: string[]) {
            ordem.push("storage:remove");
            removeCalls.push(lote);
            // O DEFAULT é o comportamento REAL da Storage Admin API: ela devolve os
            // objetos que EXISTIAM e foram apagados — um caminho que não existe no
            // bucket simplesmente não volta. É o `ponteiro_morto` do CR-02.
            const r = o.removeResultado
              ? o.removeResultado(lote)
              : {
                data: lote
                  .filter((c) => vivos.has(nomeDe(c)))
                  .map((name) => ({ name })),
                error: null,
              };
            for (const item of (r.data ?? []) as Array<{ name?: unknown }>) {
              if (typeof item?.name === "string") vivos.delete(nomeDe(item.name));
            }
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

// ── (v2)(v3) 45-14 / BL-03: O G13 MEDE OS PONTEIROS **CRUS** ─────────────────
// ⚠ Os dois casos irmãos do (v), e existem porque a filtragem de prefixo do WR-03 tinha
// passado a rodar ANTES do guard: com ela primeiro, um titular cujos ponteiros estivessem
// TODOS fora do prefixo produzia lista filtrada vazia, o guard não disparava, o passo 1
// carimbava com zero objeto e o recibo declarava o currículo apagado — com os arquivos
// ainda no bucket e sem nenhuma linha (nem conta) capaz de reencontrá-los.
Deno.test("(v2) ponteiros vivos TODOS fora do prefixo + list() vazio → o motor PARA, sem carimbo", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[]],
    curriculos: [
      { id: "c1", curriculo_url: "legado/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa.pdf" },
      { id: "c2", curriculo_url: "importado/2024/bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb.pdf" },
    ],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  assertEquals(admin.removeCalls.length, 0);
  assertEquals(admin.deleteUserCalls.length, 0);
  assertEquals(
    admin.linha.storage_concluido_em,
    null,
    "zero objeto removido NUNCA carimba o passo 1 — o recibo diria que o currículo sumiu",
  );
  assertEquals(admin.linha.causa, "falha_storage");
});

Deno.test("(v3) descartar TODOS os ponteiros não é achado silencioso: para mesmo com list() cheio", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    // A enumeração funciona (o prefixo é o certo para a conta), mas NENHUM ponteiro casa:
    // a convenção de caminho daquelas linhas não é a que este código conhece.
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [{ id: "c1", curriculo_url: "legado/cccccccc-3333-4333-8333-cccccccccccc.pdf" }],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  assertEquals(admin.removeCalls.length, 0, "parar ANTES de qualquer remoção é o ponto");
  assertEquals(admin.linha.storage_concluido_em, null);
  assertEquals(admin.linha.causa, "falha_storage");
});

// ── (w) RESÍDUO NO BUCKET REPROVA — a falha continua FECHADA ─────────────────
// ⚠ 45-13 / CR-02: a conferência mudou de OBJETO, não de rigor. Ela era sobre o
// RETORNO de `remove()` — e por isso travava para sempre num `ponteiro_morto`, que o
// próprio código coloca no lote. Agora é sobre o PÓS-ESTADO do bucket: um objeto que
// continua lá depois do laço reprova o passo, sem carimbo, exatamente como antes.
Deno.test("(w) objeto que SOBRA no bucket após o laço → falha_storage e sem carimbo", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }, { name: CV_B.slice(PREFIXO.length) }]],
    // A Storage Admin API diz ter apagado só UM dos dois — o outro CONTINUA no bucket.
    removeResultado: (lote) => ({ data: [{ name: lote[0] }], error: null }),
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  assertEquals(admin.linha.storage_concluido_em, null, "resíduo no bucket → não carimba");
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
  // ⚠ A ASSIMETRIA É O PONTO, e achatá-la foi o defeito. Até 2026-08-22 este laço exigia
  //   que TODOS os itens `tem_decisao_registrada` sumissem, sem olhar `obrigatorio` — e com
  //   isso PINAVA o lado errado: quem consertasse o helper quebrava o teste, e o sinal mais
  //   provável seria reverter o conserto. `45-REVIEW-4.md` / WR-A.
  //
  //   A regra correta, idêntica à da tela (`ReciboExclusao.tsx:113`): na coluna «mantém»,
  //   `obrigatorio` VENCE a aplicabilidade. Uma retenção que a lei impõe é declarada em
  //   todo recorte; omiti-la faria a exclusão parecer maior do que foi.
  // ⚠ `obrigatorio` é propriedade da coluna «mantém» e de mais nenhuma — o próprio tipo
  //   recusa lê-lo em `colunas_sai`, e está certo: reter por obrigação legal só faz sentido
  //   para o que FICA. Por isso a pertinência é resolvida por conjunto, não por campo.
  const obrigatoriosQueFicam = new Set<string>(
    RECIBO_EXCLUSAO.colunas_mantem.filter((x) => x.obrigatorio === true).map((x) => x.rotulo),
  );

  for (const i of daDecisao) {
    assert(completo.includes(i.rotulo), `${i.item_id} tem de aparecer no recibo completo`);
    if (obrigatoriosQueFicam.has(i.rotulo)) {
      assert(
        semDecisao.includes(i.rotulo),
        `${i.item_id} é 'obrigatorio: true' e tem de PERMANECER mesmo sem decisão registrada — ` +
          `omitir uma retenção imposta por lei faz a exclusão parecer maior do que foi (SC#5)`,
      );
    } else {
      assert(!semDecisao.includes(i.rotulo), `${i.item_id} tem de SUMIR sem decisão`);
    }
  }
  // O `sempre` nunca some — o recibo não pode encolher por engano.
  for (const i of itens.filter((x) => x.aplicavel_quando === "sempre")) {
    for (const html of [completo, semCv, semDecisao]) {
      assert(html.includes(i.rotulo), `${i.item_id} é 'sempre' e sumiu`);
    }
  }
});

// ── (mm2) a REGRA da coluna «mantém», executável nos 4 recortes ──────────────
//
// O `ReciboExclusao.tsx` afirma no docblock: «Um componente, dois tempos — NUNCA DOIS
// COMPONENTES. Dois componentes divergiriam na primeira edição, e a divergência apareceria
// justamente entre o que foi PROMETIDO e o que foi RELATADO — o pior lugar possível.»
//
// ⚠ Mas o e-mail JÁ É um segundo componente, em outra linguagem e outro runtime — e ele JÁ
// TINHA divergido. A invariante estava AFIRMADA e não era imposta por mecanismo nenhum, e foi
// exatamente por isso que a divergência sobreviveu até um review encontrá-la (WR-A).
//
// Este caso não consegue importar o componente React (outro runtime), então impõe o que dá
// para impor deste lado: a REGRA DECLARADA, calculada de forma independente a partir do dado
// versionado, comparada com o que o helper realmente emite — nos QUATRO recortes possíveis,
// não só no que alguém lembrou de testar.
//
// ⚠ LIMITE HONESTO: isto pina o lado do E-MAIL contra a regra. NÃO compara os dois runtimes.
// Uma guarda de verdade exigiria a regra num artefato único consumido pelos dois — hoje ela
// existe duplicada em `ReciboExclusao.tsx:113` e em `helpers.ts`. Enquanto for assim, editar
// uma sem a outra continua possível, e o único aviso é este comentário.
Deno.test("(mm2) coluna «mantém»: `obrigatorio` vence a aplicabilidade nos 4 recortes", async () => {
  const h = await import("./helpers.ts");
  const { RECIBO_EXCLUSAO } = await import("../_shared/reciboExclusao.ts");

  const recortes = [
    { temCurriculo: true, temDecisaoRegistrada: true },
    { temCurriculo: true, temDecisaoRegistrada: false },
    { temCurriculo: false, temDecisaoRegistrada: true },
    { temCurriculo: false, temDecisaoRegistrada: false },
  ];

  // A regra, escrita aqui de forma INDEPENDENTE do helper — se as duas coincidirem por
  // acaso, o caso não prova nada; por isso ela é derivada do dado, não copiada do código.
  const seAplica = (quando: string, r: { temCurriculo: boolean; temDecisaoRegistrada: boolean }) =>
    quando === "sempre" ||
    (quando === "tem_curriculo" && r.temCurriculo) ||
    (quando === "tem_decisao_registrada" && r.temDecisaoRegistrada);

  for (const r of recortes) {
    const html = h.corpoReciboExclusao({ dataConclusao: CARIMBO_AUTH, ...r });

    for (const i of RECIBO_EXCLUSAO.colunas_mantem) {
      const deveAparecer = i.obrigatorio === true || seAplica(i.aplicavel_quando, r);
      const apareceu = html.includes(i.rotulo);
      assertEquals(
        apareceu,
        deveAparecer,
        `recorte cv=${r.temCurriculo}/decisao=${r.temDecisaoRegistrada}: «${i.rotulo}» ` +
          `(obrigatorio=${i.obrigatorio}, aplicavel_quando=${i.aplicavel_quando}) ` +
          `deveria ${deveAparecer ? "APARECER" : "SUMIR"} e ${apareceu ? "apareceu" : "sumiu"}. ` +
          `Na coluna «mantém» a regra é: obrigatorio === true OU aplicável — idêntica a ` +
          `ReciboExclusao.tsx:113. Divergir dela faz o recibo enviado DEPOIS do apagamento ` +
          `irreversível contradizer o que a pessoa viu na tela.`,
      );
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

// ═════════════════════════════════════════════════════════════════════════════
// Plano 45-12 · Task 2 — `retirar_candidatura`, a ação que faltava
// (`DI-45-10-02`)
//
// ── AS QUATRO AÇÕES PERMANECEM DISTINTAS ────────────────────────────────────
// Retirar UMA candidatura encerra o funil na hora e não apaga dado nenhum; apagar os
// dados enfileira, espera a janela e executa. Uma ação que fizesse as duas coisas é
// exatamente a ambiguidade que nesta superfície vira ação irreversível (D-45-06).
//
// ── ⚠ O `candidatura_id` SELECIONA, E NÃO AUTORIZA ──────────────────────────
// É a ÚNICA emenda ao DESVIO 1 desta EF, e ela só é defensável porque a Task 1 fez as
// claims chegarem: quem autoriza é o guard da RPC (`v_dono IS DISTINCT FROM v_uid` →
// `42501`), comparando o dono da linha com o `auth.uid()` re-derivado do JWT DENTRO do
// banco. Sem as claims o guard recusaria todo mundo, e a autorização não existiria em
// lugar nenhum.
// ═════════════════════════════════════════════════════════════════════════════

/** Um corpo de retirada, com o id que o card conhece. */
function reqRetirar(over: Record<string, unknown> = {}): Request {
  return makeRequest({
    acao: "retirar_candidatura",
    candidatura_id: CANDIDATURA_ID,
    ...over,
  });
}

function depsRetirar(rpc?: AdminOpts["rpc"]) {
  const admin = makeMockSupabaseAdmin({ rpc });
  return {
    admin,
    deps: {
      supabaseAdmin: admin,
      supabaseUser: makeMockSupabaseUser(TITULAR),
      supabaseTitular: makeMockTitular(admin),
    },
  };
}

// ── (tt) o vocabulário fechado passa a QUATRO ────────────────────────────────
Deno.test("(tt) 'retirar_candidatura' é aceita; qualquer outro valor segue em 400 VALIDATION", async () => {
  const { handler } = await loadHandler();
  const aceita = depsRetirar();
  const res = await handler(reqRetirar(), aceita.deps);
  assertEquals(res.status, 200, "a quarta ação do vocabulário fechado");

  for (const acao of ["retirar", "retirar_candidaturas", "apagar", "RETIRAR_CANDIDATURA"]) {
    const { admin, deps } = depsRetirar();
    const r = await handler(makeRequest({ acao, candidatura_id: CANDIDATURA_ID }), deps);
    assertEquals(r.status, 400, `ação ${acao} deveria ser 400`);
    assertEquals((await r.json()).error_code, "VALIDATION");
    assertEquals(admin.rpcCalls.length, 0, "zero RPC antes da validação da ação");
  }
});

// ── (uu) o formato do id é validado ANTES de qualquer toque privilegiado ─────
Deno.test("(uu) candidatura_id ausente, não-string ou fora do formato UUID → 400 e zero RPC", async () => {
  const { handler } = await loadHandler();
  // ⚠ FALHA FECHADA: um corpo ilegível NUNCA escolhe uma candidatura por omissão.
  for (const id of [undefined, null, "", 42, "nao-e-uuid", "aaaaaaaa-1111-4111-8111", {}]) {
    const { admin, deps } = depsRetirar();
    const res = await handler(
      makeRequest({ acao: "retirar_candidatura", candidatura_id: id }),
      deps,
    );
    assertEquals(res.status, 400, `candidatura_id=${JSON.stringify(id)} deveria ser 400`);
    assertEquals((await res.json()).error_code, "VALIDATION");
    assertEquals(admin.rpcCalls.length, 0, "nenhuma RPC pode ser chamada com id ilegível");
  }
});

// ── (vv) caminho feliz: a RPC sai do client do titular, com o id recebido ────
Deno.test("(vv) retirada feliz → 200 com a data de encerramento, pela RPC do titular", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsRetirar();
  const res = await handler(reqRetirar(), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.ok, true);
  assertEquals(json.acao, "retirar_candidatura");
  assertEquals(json.encerrada_em, ENCERRADA_EM);
  // ⚠ Sem as claims, o guard da RPC (`v_dono IS DISTINCT FROM v_uid`) recusaria TODO
  // chamador — e a autorização desta ação não existiria em lugar nenhum.
  assertEquals(admin.rpcNoTitular.length, 1);
  assertEquals(admin.rpcNoServico.length, 0);
  assertEquals(admin.rpcNoTitular[0].nome, "retirar_candidatura");
  assertEquals(admin.rpcNoTitular[0].args.p_candidatura_id, CANDIDATURA_ID);
});

// ── (ww) 22023 é fato do DOMÍNIO, e a copy é a da RETIRADA ───────────────────
Deno.test("(ww) 22023 → 400 VALIDATION com motivo CANDIDATURA_NAO_RETIRAVEL, nunca 500", async () => {
  const { handler } = await loadHandler();
  const { deps } = depsRetirar({
    retirar_candidatura: {
      data: null,
      error: {
        code: "22023",
        message: "CANDIDATURA_NAO_RETIRAVEL: so uma candidatura em andamento ...",
      },
    },
  });
  const res = await handler(reqRetirar(), deps);
  // Candidatura já decidida é fato do domínio: um 500 aqui mandaria o titular tentar
  // de novo contra um estado que não muda mais.
  assert(res.status !== 500, "recusa de domínio não é falha de servidor");
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error_code, "VALIDATION");
  // ⚠ O motivo é o do vocabulário da RETIRADA, não o do cancelamento: dois fatos
  // diferentes com o mesmo SQLSTATE, e uma tradução única faria o titular ler a copy
  // do outro caminho.
  assertEquals(json.motivo, "CANDIDATURA_NAO_RETIRAVEL");
  const cru = JSON.stringify(json);
  assert(!cru.includes("22023"), "SQLSTATE não vaza");
  assert(!cru.includes("so uma candidatura em andamento"), "mensagem crua do banco não vaza");
});

// ── (xx) 42501 é o id de outra pessoa, recusado NO BANCO ────────────────────
Deno.test("(xx) 42501 → 403 FORBIDDEN: o id alheio é recusado no banco, não na tela", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsRetirar({
    retirar_candidatura: {
      data: null,
      error: { code: "42501", message: "FORBIDDEN: a candidatura so pode ser retirada ..." },
    },
  });
  const res = await handler(reqRetirar({ candidatura_id: CANDIDATURA_ALHEIA }), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
  // ⚠ O id do corpo CHEGA à RPC — ele SELECIONA. Quem AUTORIZA é o guard do banco,
  // comparando o dono da linha com o `auth.uid()` re-derivado do JWT.
  assertEquals(admin.rpcNoTitular[0].args.p_candidatura_id, CANDIDATURA_ALHEIA);
  assert(!JSON.stringify(json).includes("42501"), "SQLSTATE não vaza");
});

// ── (yy) «não lançou» não é «completou» ──────────────────────────────────────
Deno.test("(yy) retorno que não é timestamp não-vazio → 500, e nada é afirmado como sucesso", async () => {
  const { handler } = await loadHandler();
  // ⚠ `retirar_candidatura` devolve `timestamptz` ESCALAR: o helper de primeira linha
  // não se aplica, e o valor chega direto em `data`. A lição do 42804 da Phase 43,
  // que sobreviveu a um smoke 10/10 verde.
  for (const data of [null, "", undefined, 0, {}, []]) {
    const { deps } = depsRetirar({ retirar_candidatura: { data, error: null } });
    const res = await handler(reqRetirar(), deps);
    assertEquals(res.status, 500, `retorno ${JSON.stringify(data)} deveria FECHAR`);
    const json = await res.json();
    assertEquals(json.ok, false);
    assertEquals(json.encerrada_em, undefined, "nada pode ser afirmado como concluído");
  }
});

// ── (zz) a idempotência é da RPC, e a EF não a reimplementa ──────────────────
Deno.test("(zz) segundo toque no mesmo card devolve A MESMA data, com UMA chamada por toque", async () => {
  const { handler } = await loadHandler();
  const um = depsRetirar();
  const primeiro = await (await handler(reqRetirar(), um.deps)).json();
  const dois = depsRetirar();
  const segundo = await (await handler(reqRetirar(), dois.deps)).json();
  assertEquals(primeiro.encerrada_em, segundo.encerrada_em, "a data NÃO é empurrada para frente");
  // UMA chamada por toque: a idempotência é por ESTADO dentro da RPC. Um ramo aqui
  // que "adivinhasse" que já foi retirada moveria a autoridade do servidor para a EF.
  assertEquals(um.admin.rpcNoTitular.length, 1);
  assertEquals(dois.admin.rpcNoTitular.length, 1);
});

// ── (ab) a retirada NÃO escreve nada por conta própria ───────────────────────
Deno.test("(ab) a retirada não toca tabela nenhuma na EF: quem encerra é a RPC", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsRetirar();
  await handler(reqRetirar(), deps);
  // ⚠ A RPC toca UMA coluna aditiva em `candidaturas` (D-45-13) — nunca `etapa_atual`,
  // nunca `deleted_at`, nunca `historico_candidatura`, que tem UM único escritor desde
  // o M2/Phase 6. Replicar qualquer parte disso aqui daria dois escritores àquela
  // trilha, que é o que o D-45-13 recusou por escrito.
  assertEquals(admin.reads.solicitacoes, 0, "a retirada não lê nem escreve solicitacoes_dados");
  assertEquals(admin.reads.candidatos, 1, "a única leitura é a da autorização (passo 2)");
});

// ═════════════════════════════════════════════════════════════════════════════
// Plano 45-13 — OS SEIS BLOCKERS DO `45-REVIEW.md`, do lado da Edge Function.
//
// ⚠ O QUE ESTAS ASSERÇÕES PROTEGEM, E POR QUE NENHUMA DELAS É DE CAMINHO FELIZ.
// O review mediu que as três rotas de falha mais prováveis do motor convergiam no
// MESMO estado terminal — currículo destruído, pessoa não apagada, nada retomável — e
// que ele é permanente: o PITR está desligado (D-45-10) e o backup de 7 dias exclui
// Storage inteiramente. Um teste de caminho feliz passa com os três defeitos presentes.
//
//  · CR-02 — o passo 1 exigia que TODO caminho do lote voltasse na resposta de
//    `remove()`. Mas `remove()` devolve os objetos que EXISTIAM, e
//    `unirEDeduplicarCaminhos` põe deliberadamente no lote caminhos que podem não
//    existir (`ponteiro_morto`, helpers.ts:177). Resultado medido: os CVs reais
//    apagados, o carimbo nunca escrito, e toda tentativa futura falhando IDENTICAMENTE
//    — porque os objetos já não estão lá.
//  · CR-03 — o passo 2 severa `candidatos.user_id` por desenho (D-45-11), e a partir
//    dali o handler respondia 403 a toda invocação daquele titular: os passos 3 e 4
//    ficavam INALCANÇÁVEIS, com a conta do Auth viva e o recibo nunca enviado.
//  · CR-05 — o 23503 era um desfecho esperado que só aparecia no passo 3, depois de o
//    currículo ter sido apagado.
// ═════════════════════════════════════════════════════════════════════════════

const OUTRO_UID = "auth-uid-de-outra-pessoa";

// ── (ac) CR-02: o `ponteiro_morto` COMPLETA o passo 1 ────────────────────────
Deno.test("(ac) CR-02: caminho que não existe no bucket NÃO falha o passo — ele carimba", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    // O bucket tem UM objeto; o banco aponta para DOIS. O segundo é o `ponteiro_morto`:
    // uma linha o aponta e ele já não existe (re-submissão anterior sem remoção).
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [
      { id: "c1", curriculo_url: CV_A },
      { id: "c2", curriculo_url: CV_C },
    ],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  assert(admin.linha.storage_concluido_em, "o passo 1 TEM de carimbar: o bucket ficou vazio");
  assertEquals(admin.linha.causa, undefined, "ausência no retorno não é falha de passo");
  assertEquals(admin.removeCalls[0].length, 2, "os dois caminhos vão ao remove()");
  // A prova de que o passo continuou avançando: o tombstone rodou.
  assertEquals(admin.rpcCalls.filter((c) => c.nome === "anonimizar_candidato").length, 1);
});

// ── (ad) CR-02: a RETOMADA converge ─────────────────────────────────────────
Deno.test("(ad) CR-02: segunda execução com o bucket JÁ vazio carimba, em vez de falhar de novo", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    // O cenário exato do review: o passo 1 apagou os objetos e morreu antes do carimbo.
    paginas: [[]],
    pedido: {
      situacao: "executando",
      plano: {
        versao: 1,
        auth_uid: AUTH_UID,
        email: EMAIL_TITULAR,
        caminhos: [CV_A, CV_B],
        achados: [],
        recorte: { tem_curriculo: true, tem_decisao_registrada: false },
        contagens: {},
        previsto: { storage_remove: 2 },
        achados_resumo: { blob_orfao: 0, ponteiro_morto: 0 },
      },
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200, "a retomada TEM de convergir — antes ela falhava para sempre");
  assertEquals(admin.removeCalls.length, 1, "o lote é re-enviado; `remove()` devolve vazio");
  assert(admin.linha.storage_concluido_em, "o pós-estado do bucket é VAZIO: o passo carimba");
  assert(admin.linha.auth_concluido_em, "e a execução chega ao fim, em vez de travar no passo 1");
});

// ── (ae) CR-02: os não-devolvidos são CONTAGEM, nunca caminhos ───────────────
Deno.test("(ae) CR-02: os não-devolvidos entram como CONTAGEM — nunca a lista de caminhos", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [
      { id: "c1", curriculo_url: CV_A },
      { id: "c2", curriculo_url: CV_C },
    ],
  });
  await handler(makeRequest({ acao: "executar" }), deps);
  const plano = admin.linha.plano as Record<string, unknown>;
  const resumo = plano.achados_resumo as Record<string, number>;
  assertEquals(resumo.nao_devolvidos, 1, "o achado é registrado, e é um NÚMERO");
  // ⚠ A asserção NEGATIVA é a que importa: o caminho embute o `auth.uid()` do titular.
  // Guardar a LISTA reintroduziria no registro que sobrevive à exclusão exatamente a
  // PII que o passo 4 esvazia o plano para remover.
  const serializado = JSON.stringify(plano);
  assert(!serializado.includes(AUTH_UID), "nenhum caminho de Storage sobrevive ao fecho");
  assert(!serializado.includes(".pdf"), "nem sequer um nome de arquivo");
});

// ── (af) WR-02: marcador de pasta LANÇA ─────────────────────────────────────
Deno.test("(af) WR-02: marcador de pasta sob o prefixo faz a enumeração LANÇAR", async () => {
  const h = await import("./helpers.ts");
  const admin = {
    storage: {
      from: () => ({
        // `id: null` é o marcador de PASTA que o Storage devolve. Descartá-lo era
        // correto para o esquema plano de hoje — e vira um buraco no dia em que alguém
        // gravar em subpasta: a enumeração devolveria zero, o laço não rodaria, o passo
        // carimbaria, e o recibo afirmaria que o currículo foi apagado. Com a
        // conferência do CR-02, a re-enumeração vazia passou a ser a PROVA de sucesso —
        // então um descarte silencioso aqui é um falso verde estrutural.
        list: () =>
          Promise.resolve({
            data: [{ name: "sub", id: null }, { name: "a.pdf", id: "obj-1" }],
            error: null,
          }),
      }),
    },
  };
  let lancou = false;
  let mensagem = "";
  try {
    await h.enumerarObjetosTitular(admin, `${AUTH_UID}/`);
  } catch (e) {
    lancou = true;
    mensagem = String((e as Error).message);
  }
  assert(lancou, "a enumeração de UM nível tem de falhar ALTO diante de uma subpasta");
  assert(!mensagem.includes(AUTH_UID), "⚠ a mensagem NÃO carrega o prefixo: ele é o auth.uid()");
});

// ── (ag) WR-03: ponteiro fora do prefixo é DESCARTADO ───────────────────────
Deno.test("(ag) WR-03: curriculo_url fora do prefixo do titular vira achado e nunca chega ao remove()", async () => {
  const { handler } = await loadHandler();
  const alheio = `${OUTRO_UID}/99999999-9999-4999-8999-999999999999.pdf`;
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [
      { id: "c1", curriculo_url: CV_A },
      { id: "c2", curriculo_url: alheio },
      { id: "c3", curriculo_url: `${PREFIXO}../fora.pdf` },
    ],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  const plano = admin.updates[0].plano as Record<string, unknown>;
  assertEquals(plano.caminhos, [CV_A], "só o que está sob o prefixo do titular entra no plano");
  const achados = plano.achados as Array<{ caminho: string; tipo: string }>;
  assertEquals(
    achados.filter((a) => a.tipo === "fora_do_prefixo").length,
    2,
    "o descarte é ACHADO REGISTRADO, nunca remoção silenciosa e nunca parada",
  );
  // ⚠ A asserção que importa: `remove()` roda com a service key e ignora RLS. Um
  // `curriculo_url` legado ou importado apagaria o CV de OUTRA pessoa,
  // irreversivelmente — sem PITR e com o Storage fora de todo backup.
  for (const lote of admin.removeCalls) {
    assert(!lote.includes(alheio), "o caminho de outra pessoa JAMAIS pode ir ao remove()");
    for (const c of lote) assert(c.startsWith(PREFIXO), `caminho fora do prefixo no lote: ${c}`);
  }
});

// ── (ah) CR-03: a retomada pós-tombstone ────────────────────────────────────
Deno.test("(ah) CR-03: com user_id já severado, 'executar' reencontra o pedido pelo auth_uid do plano", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    // O tombstone já commitou: `candidatos.user_id` é NULL e a resolução por titular
    // devolve VAZIO. Antes disto, o handler respondia 403 e os passos 3 e 4 ficavam
    // inalcançáveis — conta do Auth viva, recibo nunca enviado, `executando` para sempre.
    cand: null,
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      postgres_concluido_em: CARIMBO_POSTGRES,
      plano: planoCapturado(),
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200, "a execução TEM de ser retomável depois do passo 2");
  assertEquals(admin.deleteUserCalls.length, 1, "o passo 3 passa a ser alcançável");
  assert(admin.linha.recibo_enviado_em, "e o passo 4 também — o recibo é o único canal que resta");
});

// ── (ai) CR-03: o reencontro NÃO é um atalho de autorização ─────────────────
Deno.test("(ai) CR-03: pedido cujo auth_uid é de OUTRA pessoa não é reencontrado → 403", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    cand: null,
    pedido: {
      situacao: "executando",
      storage_concluido_em: CARIMBO_STORAGE,
      postgres_concluido_em: CARIMBO_POSTGRES,
      // ⚠ O `auth_uid` do plano foi escrito pelo motor a partir do JWT no passo 0. Se
      // ele não bate o `sub` da sessão, NÃO é a mesma pessoa — e o único identificador
      // aceito continua vindo do JWT verificado, nunca do corpo do request (T-32-03).
      plano: planoCapturado({ auth_uid: OUTRO_UID }),
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error_code, "FORBIDDEN");
  assertEquals(admin.deleteUserCalls.length, 0, "ninguém apaga a conta de outra pessoa");
  assertEquals(admin.removeCalls.length, 0);
});

// ── (aj) CR-03: o reencontro existe SÓ para `executar` ──────────────────────
Deno.test("(aj) CR-03: 'pedir', 'cancelar' e 'retirar_candidatura' NÃO ganharam o reencontro", async () => {
  const { handler } = await loadHandler();
  for (const acao of ["pedir", "cancelar", "retirar_candidatura"]) {
    const { admin, deps } = depsExecutar({ cand: null });
    const res = await handler(
      makeRequest({ acao, candidatura_id: CANDIDATURA_ID }),
      deps,
    );
    // As outras três não têm estado pós-tombstone a retomar; abrir o reencontro para
    // elas seria superfície nova sem benefício.
    assertEquals(res.status, 403, `${acao} deveria continuar em 403`);
    assertEquals(admin.rpcCalls.length, 0, `${acao} não pode alcançar RPC nenhuma`);
  }
});

// ── (ak) CR-03: pedido inteiramente finalizado é NO-OP ──────────────────────
Deno.test("(ak) CR-03: pedido com os quatro carimbos → 200 sem Storage, sem RPC e sem deleteUser", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    // ⚠ O titular resolve normalmente aqui: o reencontro do CR-03 exige
    // `recibo_enviado_em` NULO por desenho (um pedido finalizado não tem o que retomar,
    // e o passo 4 já esvaziou o `auth_uid` do plano). O que esta asserção mede é outra
    // coisa, e ela vale pelos dois caminhos de entrada: com os passos guardados por
    // CARIMBO, re-entrar num pedido finalizado é um no-op — nunca uma segunda destruição.
    pedido: {
      situacao: "concluido",
      storage_concluido_em: CARIMBO_STORAGE,
      postgres_concluido_em: CARIMBO_POSTGRES,
      auth_concluido_em: CARIMBO_AUTH,
      recibo_enviado_em: "2026-08-06T10:00:03.000Z",
      plano: { versao: 1, contagens: { storage_remove: 1 }, achados_resumo: {} },
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  // ⚠ A situação terminal precisa ser alcançável pela consulta do reencontro, senão um
  // pedido concluído SEM recibo não seria reencontrado por caminho nenhum. Com os
  // passos guardados por carimbo, entrar aqui é um no-op — e as três negativas provam.
  assertEquals(admin.removeCalls.length, 0);
  assertEquals(admin.deleteUserCalls.length, 0);
  assertEquals(admin.fetchCalls.length, 0, "nenhum sistema externo é tocado");
  assertEquals(admin.rpcCalls.filter((c) => c.nome === "anonimizar_candidato").length, 0);
});

// ── (al) CR-05: a recusa acontece ANTES do passo 1 ──────────────────────────
Deno.test("(al) CR-05: bloqueadores não-vazios param a execução ANTES de qualquer remoção", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [{ id: "c1", curriculo_url: CV_A }],
    planoBanco: {
      data: planoDoBanco({
        bloqueadores_deleteuser: [{ tabela: "public.decisao_final", coluna: "por_usuario" }],
      }),
      error: null,
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  // ⚠ O ganho está inteiro nesta linha: uma verificação antes da PRIMEIRA mutação
  // transforma o 23503 de «desfecho esperado» em «recusa barata». Sem ela, o mesmo
  // bloqueador só aparecia no passo 3 — depois de o currículo ter sido apagado, e (CR-03)
  // sem retomada.
  assertEquals(admin.removeCalls.length, 0, "zero remoção");
  assertEquals(admin.deleteUserCalls.length, 0);
  assertEquals(admin.linha.storage_concluido_em, null, "e zero carimbo");
  assertEquals(admin.linha.plano, null, "o plano nem chega a ser persistido");
});

// ── (am) WR-01: as contagens persistidas são as REAIS ───────────────────────
Deno.test("(am) WR-01: as contagens saem do retorno da RPC; as do plano viram previsão", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    curriculos: [
      { id: "c1", curriculo_url: CV_A },
      { id: "c2", curriculo_url: CV_C },
    ],
  });
  await handler(makeRequest({ acao: "executar" }), deps);
  const plano = admin.linha.plano as Record<string, unknown>;
  const contagens = plano.contagens as Record<string, number>;
  const previsto = plano.previsto as Record<string, number>;
  // `tombstone_candidato` do BANCO somava candidatos + candidaturas_vinculadas +
  // devolutivas + disponibilidade + solicitacoes = 3 na fixture; o tombstone toca UMA
  // linha de candidatos e as candidaturas do CV. O número persistido é o ROW_COUNT real.
  assertEquals(contagens.tombstone_candidato, 3, "1 candidato + 2 candidaturas, do ROW_COUNT");
  assertEquals(previsto.tombstone_candidato, 3, "a previsão do plano fica em campo SEPARADO");
  // E o Storage conta o que foi EFETIVAMENTE apagado — não o `ponteiro_morto`, que
  // nunca existiu no bucket.
  assertEquals(contagens.storage_remove, 1, "um objeto existia; o outro era ponteiro morto");
  assertEquals(previsto.storage_remove, 2, "o plano PREVIA dois caminhos");
});

// ── (an) a trilha do executor sobrevive ao esvaziamento do plano ────────────
Deno.test("(an) a trilha de quem destruiu PII sobrevive ao fecho — e o uid do titular NÃO", async () => {
  const { handler } = await loadHandler();

  // (i) executor = o próprio titular: o `uid` NÃO viaja. Ele é o identificador que a
  //     exclusão existe para apagar, e gravá-lo no registro que PROVA a exclusão seria
  //     o mesmo defeito do CR-04 com outra cara.
  const um = depsExecutar({ paginas: [[]] });
  await handler(makeRequest({ acao: "executar" }), um.deps);
  const planoTitular = um.admin.linha.plano as Record<string, unknown>;
  const execTitular = planoTitular.executor as Record<string, unknown>;
  assert(execTitular, "a trilha TEM de sobreviver: uma trilha apagada no fecho não é trilha");
  assertEquals(execTitular.foi_o_titular, true);
  assertEquals(execTitular.uid, undefined, "o uid do titular jamais sobrevive à própria exclusão");
  assert(!JSON.stringify(planoTitular).includes(AUTH_UID));

  // (ii) executor = um operador: o `uid` DELE é identidade de equipe, e é exatamente o
  //      que uma trilha precisa guardar. `anonimizar_candidato` não escreve em
  //      `logs_auditoria` (os dois enums nunca foram medidos, e um valor inventado
  //      abortaria a anonimização depois de o currículo ter sido apagado) — este bloco
  //      é a trilha que existe no lugar.
  const dois = depsExecutar({
    paginas: [[]],
    anonimizar: {
      data: retornoAnonimizar({
        executor: { papel: "administrador", foi_o_titular: false, uid: OUTRO_UID },
      }),
      error: null,
    },
  });
  await handler(makeRequest({ acao: "executar" }), dois.deps);
  const planoOperador = dois.admin.linha.plano as Record<string, unknown>;
  const execOperador = planoOperador.executor as Record<string, unknown>;
  assertEquals(execOperador.papel, "administrador");
  assertEquals(execOperador.foi_o_titular, false);
  assertEquals(execOperador.uid, OUTRO_UID, "o uid do OPERADOR fica — é isso que é trilha");
});

// ── (ao) WR-08: a causa que não foi gravada deixa rastro ────────────────────
Deno.test("(ao) WR-08: falha ao gravar a causa deixa rastro no log redigido, em vez de sumir", async () => {
  const { handler } = await loadHandler();
  const original = console.error;
  const linhas: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    linhas.push(args);
  };
  try {
    const { deps } = depsExecutar({
      falhaAoGravarCausa: true,
      deleteUser: { error: { message: "23503" } },
      pedido: {
        situacao: "executando",
        storage_concluido_em: CARIMBO_STORAGE,
        postgres_concluido_em: CARIMBO_POSTGRES,
        plano: planoCapturado(),
      },
    });
    const res = await handler(makeRequest({ acao: "executar" }), deps);
    assertEquals(res.status, 500);
  } finally {
    console.error = original;
  }
  const texto = JSON.stringify(linhas);
  // Sem este rastro, o pedido fica em `executando` sem `causa` e sem registro de em
  // qual sistema parou — indistinguível de uma execução que nunca começou.
  assert(texto.includes("causa_nao_gravada"), "a falha do UPDATE da causa tem de aparecer");
  // E o log continua REDIGIDO: nada além da allowlist local atravessa.
  assert(!texto.includes(EMAIL_TITULAR), "nenhum e-mail no log");
  assert(!texto.includes(PEDIDO_ID), "nenhum id completo no log");
});

// ═════════════════════════════════════════════════════════════════════════════
// Plano 45-16 — WR-A e WR-E do `45-REVIEW-2.md`, mantidos pelo round 3 como as
// DUAS condições da execução REAL (não-dry-run) da Task 3 do 45-11.
//
// ⚠ O QUE ESTES CASOS MEDEM NÃO É «não lança». Os dois achados produzem estados
// terminais DEPOIS do passo 1 — currículo já destruído, PII intacta, e o motor
// incapaz de carimbar `storage_concluido_em` em toda tentativa futura. A pergunta que
// cada asserção abaixo faz é: **a execução ainda CONVERGE a partir daqui?** Um erro
// mais claro no mesmo estado terminal não fecharia nenhum dos dois.
//
// ⚠ E O QUE ELES NÃO PODEM AFROUXAR: resíduo de um caminho QUE ESTAVA NO PLANO
// continua reprovando sem carimbo (o `(w)` e o `(ap3)` medem isso), e o `plano.caminhos`
// continua CONGELADO no passo 0 — ERASE-04. É a conferência que passou a tolerar um
// prefixo que mudou; o plano não deriva.
// ═════════════════════════════════════════════════════════════════════════════

/** Um objeto que apareceu no bucket DEPOIS do passo 0 — o CV novo do titular. */
const CV_NOVO = `${PREFIXO}44444444-4444-4444-8444-444444444444.pdf`;

// ── (ap) WR-A: o objeto que chegou depois do passo 0 não trava o passo 1 ─────
Deno.test("(ap) WR-A: objeto NOVO sob o prefixo depois do passo 0 → varrido, e o passo CARIMBA", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    // O plano foi congelado com CV_A; o bucket, agora, tem só o CV que o titular subiu
    // entre a tentativa que falhou e esta retomada. Nada nesta fase impede novas
    // candidaturas durante os 15 dias — este é o gatilho realista do WR-A.
    paginas: [[{ name: CV_NOVO.slice(PREFIXO.length) }]],
    pedido: { situacao: "executando", plano: planoCapturado({ caminhos: [CV_A] }) },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200, "antes do fix isto era 500 em TODA tentativa, para sempre");
  assert(admin.linha.storage_concluido_em, "o passo 1 carimba: o prefixo ficou VAZIO");
  assertEquals(admin.linha.causa, undefined, "objeto posterior ao plano não é falha de passo");
  // A prova de que a execução SEGUIU — é isto que distingue convergir de parar melhor.
  assert(admin.linha.auth_concluido_em, "a exclusão chega ao fim, em vez de travar no passo 1");
  // ⚠ E o objeto novo foi REMOVIDO, não ignorado: deixá-lo seria um recibo mentindo
  // sobre um arquivo que continua existindo — e, depois dos passos 2 e 3, sem
  // `curriculo_url` e sem conta do Auth, nada mais no sistema saberia encontrá-lo.
  assert(
    admin.removeCalls.some((lote) => lote.includes(CV_NOVO)),
    "o CV que chegou depois do passo 0 tem de ir ao remove()",
  );
});

// ── (ap2) WR-A: o plano NÃO deriva — ERASE-04 ───────────────────────────────
Deno.test("(ap2) WR-A: a varredura não recomputa `caminhos`; ela vira CONTAGEM no resumo", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_NOVO.slice(PREFIXO.length) }]],
    pedido: { situacao: "executando", plano: planoCapturado({ caminhos: [CV_A] }) },
  });
  await handler(makeRequest({ acao: "executar" }), deps);
  // ⚠ A captura de ANTES da primeira mutação é o que torna esta mutação não-atômica
  // retomável (ERASE-04). Redescobrir caminhos numa retomada é o que o desenho proíbe —
  // quem tolera o prefixo mudado é a CONFERÊNCIA, nunca o plano.
  const carimboDoPasso1 = admin.updates.find((u) => u.storage_concluido_em !== undefined);
  assert(carimboDoPasso1, "o passo 1 tem de ter carimbado");
  const planoCarimbado = carimboDoPasso1.plano as Record<string, unknown>;
  assertEquals(planoCarimbado.caminhos, [CV_A], "`caminhos` é o do passo 0, sem união nenhuma");
  const resumo = planoCarimbado.achados_resumo as Record<string, number>;
  assertEquals(resumo.varridos_pos_plano, 1, "o objeto posterior é registrado como NÚMERO");
  const contagens = planoCarimbado.contagens as Record<string, number>;
  assertEquals(contagens.storage_remove, 1, "e ele SOMA no que o passo de fato apagou");
  // A contagem é prova; o caminho seria o ponteiro que a exclusão existe para apagar.
  const serializado = JSON.stringify(admin.linha.plano);
  assert(!serializado.includes(CV_NOVO), "nenhum caminho do varrido sobrevive ao fecho");
});

// ── (ap3) WR-A: a falha FECHADA do resíduo PLANEJADO continua de pé ─────────
Deno.test("(ap3) WR-A: resíduo de um caminho DO PLANO reprova mesmo com objeto novo ao lado", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }, { name: CV_NOVO.slice(PREFIXO.length) }]],
    pedido: { situacao: "executando", plano: planoCapturado({ caminhos: [CV_A] }) },
    // O `remove()` diz ter apagado — e o CV_A CONTINUA lá. Isso é remoção que falhou,
    // não objeto que chegou depois: a varredura NÃO pode transformá-lo em sucesso.
    residuoAposRemove: [CV_A.slice(PREFIXO.length)],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  assertEquals(admin.linha.storage_concluido_em, null, "resíduo do PLANO → não carimba");
  assertEquals(admin.linha.causa, "falha_storage");
  assertEquals(admin.deleteUserCalls.length, 0, "um passo falho NUNCA avança para o próximo");
});

// ── (ap4) WR-A: o objeto novo que RESISTE à varredura também reprova ────────
Deno.test("(ap4) WR-A: varredura que não limpa o prefixo → falha FECHADA, sem carimbo", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    pedido: { situacao: "executando", plano: planoCapturado({ caminhos: [CV_A] }) },
    // Um objeto que a re-enumeração devolve SEMPRE — a varredura tenta e ele fica.
    residuoAposRemove: [CV_NOVO.slice(PREFIXO.length)],
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500, "tolerar o prefixo mudado não é carimbar sobre PII que ficou");
  assertEquals(admin.linha.storage_concluido_em, null);
  assertEquals(admin.linha.causa, "falha_storage");
});

// ── (aq) WR-E: plano persistido SEM `contagens`/`achados_resumo` ────────────
Deno.test("(aq) WR-E: plano sem `contagens` nem `achados_resumo` COMPLETA o passo 1", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    pedido: {
      situacao: "executando",
      // Um plano gravado por outra versão da EF: rollback de deploy, edição manual da
      // coluna. Antes do fix, o `remove()` acontecia e o `TypeError` estourava DEPOIS —
      // e, por não ser `ErroDePasso`, gravava `falha_postgres` para uma execução que
      // parou no Storage, depois de apagar os arquivos.
      plano: {
        versao: 1,
        auth_uid: AUTH_UID,
        email: EMAIL_TITULAR,
        caminhos: [CV_A],
        achados: [],
        recorte: { tem_curriculo: true, tem_decisao_registrada: false },
      },
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200, "a forma é verificada ANTES da remoção — o passo não estoura");
  assert(admin.linha.storage_concluido_em, "e ele carimba, em vez de repetir o TypeError");
  assertEquals(admin.linha.causa, undefined);
  const resumo = (admin.linha.plano as Record<string, unknown>).achados_resumo as Record<
    string,
    number
  >;
  assertEquals(resumo.blob_orfao, 0, "o resumo passa a existir, com os dois contadores");
  assertEquals(resumo.ponteiro_morto, 0);
});

// ── (aq2) WR-E: `contagens`/`achados_resumo` com o TIPO errado ──────────────
Deno.test("(aq2) WR-E: `contagens` escalar e `achados_resumo` array são NORMALIZADOS, não consumidos", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    pedido: {
      situacao: "executando",
      // ⚠ `Array.isArray(plano.caminhos)` era a ÚNICA condição para reusar o plano —
      // ela não diz nada sobre as outras duas chaves. Escrever numa string em módulo
      // ES (strict) LANÇA; escrever num array «funciona» e grava a prova num lugar que
      // o passo 4 não lê.
      plano: {
        versao: 1,
        auth_uid: AUTH_UID,
        email: EMAIL_TITULAR,
        caminhos: [CV_A],
        achados: [],
        recorte: { tem_curriculo: true, tem_decisao_registrada: false },
        contagens: "3",
        achados_resumo: [],
      },
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200);
  const plano = admin.linha.plano as Record<string, unknown>;
  const contagens = plano.contagens as Record<string, number>;
  assertEquals(contagens.storage_remove, 1, "a contagem real do passo 1 tem onde ser escrita");
  const resumo = plano.achados_resumo as Record<string, number>;
  assertEquals(Array.isArray(resumo), false, "o resumo vira objeto — é assim que o recibo o lê");
  assertEquals(resumo.ponteiro_morto, 0);
});

// ── (aq3) WR-E: um `caminho` de OUTRA pessoa no plano persistido ────────────
Deno.test("(aq3) WR-E: caminho fora do prefixo dentro do plano NUNCA chega ao remove()", async () => {
  const { handler } = await loadHandler();
  const alheio = `${OUTRO_UID}/99999999-9999-4999-8999-999999999999.pdf`;
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    pedido: {
      situacao: "executando",
      // O WR-03 peneira a lista MONTADA no passo 0. Um plano vindo do banco nunca passou
      // por aquela peneira — e ele vai direto a um `remove()` sob service key, que ignora
      // RLS. Sem PITR e com o Storage fora de todo backup, isto é irreversível.
      plano: planoCapturado({ caminhos: [CV_A, alheio, `${PREFIXO}../fora.pdf`] }),
    },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 200, "descartar não pode travar o passo: o prefixo é limpo assim mesmo");
  for (const lote of admin.removeCalls) {
    assert(!lote.includes(alheio), "o caminho de outra pessoa JAMAIS pode ir ao remove()");
    for (const c of lote) assert(c.startsWith(PREFIXO), `caminho fora do prefixo no lote: ${c}`);
  }
  const resumo = (admin.linha.plano as Record<string, unknown>).achados_resumo as Record<
    string,
    number
  >;
  assertEquals(resumo.fora_do_prefixo, 2, "o descarte é ACHADO REGISTRADO, nunca silêncio");
});

// ── (ar) WR-E: a `causa` nomeia o sistema em que a execução DE FATO parou ───
Deno.test("(ar) WR-E: exceção genérica no passo 1 grava falha_storage, nunca falha_postgres", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    paginas: [[{ name: CV_A.slice(PREFIXO.length) }]],
    pedido: { situacao: "executando", plano: planoCapturado({ caminhos: [CV_A] }) },
    // A Storage Admin API devolvendo uma forma que este código não conhece: o
    // `.map()` sobre ela LANÇA `TypeError`, que não é `ErroDePasso`. É a classe inteira
    // do WR-E — o defeito de forma do plano era só um dos seus membros.
    removeResultado: () =>
      ({ data: "nao-e-um-array", error: null }) as unknown as {
        data: Array<{ name: string }> | null;
        error: unknown;
      },
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  // ⚠ `falha_postgres` aqui MENTIRIA: a execução parou no Storage, depois do `remove()`.
  // A `causa` é a única pergunta que importa às 3 da manhã sobre um arquivo sem backup.
  assertEquals(admin.linha.causa, "falha_storage");
  assertEquals(admin.linha.storage_concluido_em, null, "e a falha continua FECHADA");
});

// ── (ar2) WR-E: antes do passo 1, o default segue `postgres` ────────────────
Deno.test("(ar2) WR-E: exceção genérica ANTES de qualquer remoção NÃO vira falha_storage", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = depsExecutar({
    // A leitura de ponteiros devolve uma forma que o passo 0 não conhece: o `.map()`
    // sobre ela LANÇA `TypeError`, ANTES de qualquer remoção.
    // ⚠ Nada foi tocado no bucket. Afirmar `falha_storage` aqui diria que o currículo pode
    // ter sido destruído quando ninguém encostou nele — o motivo pelo qual o fallback de
    // `causaDaFalha()` é o passo do MEIO.
    curriculos: "nao-e-um-array" as unknown as Array<{ id: string; curriculo_url: string | null }>,
  });
  const res = await handler(makeRequest({ acao: "executar" }), deps);
  assertEquals(res.status, 500);
  assertEquals(admin.linha.causa, "falha_postgres", "o passo do meio segue o default seguro");
  assertEquals(admin.removeCalls.length, 0, "e nada foi removido");
});
