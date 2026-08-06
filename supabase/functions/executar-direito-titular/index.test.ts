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
  const listCalls: Array<{ prefixo: string; limit: number; offset: number }> = [];
  const removeCalls: string[][] = [];
  const deleteUserCalls: unknown[][] = [];
  const updates: Array<Record<string, unknown>> = [];
  const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
  /** ⚠ D-45-12 / saída R1: se isto virar `true`, o recibo tocou o ledger. */
  let ledgerTocado = false;

  const admin = {
    ordem,
    rpcCalls,
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
            Object.assign(linha, patch);
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
