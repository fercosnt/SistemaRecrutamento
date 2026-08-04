/**
 * Phase 44 / Plano 44-05 Task 1 (TDD RED) — a Edge Function `exportar-meus-dados`,
 * o TRACER da fase: uma fatia vertical fina que atravessa artefato → EF → cliente.
 *
 * ── AUTHORED RED (por desenho) ───────────────────────────────────────────────
 * `../index.ts` ainda NÃO EXISTE quando este arquivo nasce. `loadHandler()` o importa
 * dinamicamente; o import falha em module-not-found e os 14 casos ficam vermelhos por
 * UMA razão conhecida e intencional. Não é erro de sintaxe: o harness compila.
 *
 * Harness clonado de `get-curriculo-url/index.test.ts`: `loadHandler()` por import
 * dinâmico + query-builder thenable/chainable + `makeMockSupabaseUser(user|null)` +
 * admin roteado por nome de tabela. Zero rede, zero `--allow-net`.
 *
 * ── O QUE ESTA SUÍTE PRENDE, E POR QUE CADA ASSERÇÃO É LOAD-BEARING ───────────
 *
 *  1. **A ORDEM das chamadas, não a presença delas.** O caso (9) assere que o INSERT
 *     em `solicitacoes_dados` acontece ANTES da primeira leitura de payload. Uma
 *     asserção de presença passaria numa EF que registra o pedido só quando a montagem
 *     dá certo — e aí o único pedido que a fila do RH precisa mostrar (o que falhou)
 *     seria justamente o que não deixa linha (Pitfall 4).
 *
 *  2. **A fase de projeção é isolada pelo INSERT.** `candidatos` e `solicitacoes_dados`
 *     são lidas DUAS vezes cada (uma no gate, uma no payload). Os casos (10)/(11) olham
 *     só as leituras POSTERIORES ao INSERT — sem esse recorte, a projeção `"id"` do
 *     passo 2 reprovaria a asserção de allowlist da própria tabela.
 *
 *  3. **Asserção NEGATIVA com o caractere montado em runtime** (idioma 42-11/44-03):
 *     o literal da projeção total não passa a existir dentro do arquivo que o proíbe.
 *
 *  4. **O corpo é ignorado, e isso se prova comparando DUAS execuções** (caso 6) — não
 *     lendo o código. Um `candidato_id` de outra pessoa no corpo tem de produzir a
 *     projeção byte-idêntica à de um POST sem corpo nenhum (T-32-03 / T-44-02).
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/exportar-meus-dados
 *
 * @see .planning/phases/44-exporta-o-acesso/44-05-PLAN.md (§Task 1 — os 14 casos)
 * @see supabase/functions/get-curriculo-url/index.test.ts (o harness clonado)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EXPORT_ALLOWLIST } from "../../_shared/exportAllowlist.ts";

const USER = { id: "auth-uid-do-titular" };
const CANDIDATO_ID = "11111111-1111-4111-8111-111111111111";
const OUTRA_PESSOA_ID = "99999999-9999-4999-8999-999999999999";
const CANDIDATURA_ID = "22222222-2222-4222-8222-222222222222";
const PEDIDO_ID = "33333333-3333-4333-8333-333333333333";

/** 24 h em ms — o mesmo número que o handler tem de encodar. */
const VINTE_E_QUATRO_H = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Harness — log ORDENADO de operações (é dele que sai a asserção de ordem)
// ---------------------------------------------------------------------------

interface Op {
  op: "select" | "insert" | "update";
  tabela: string;
  cols?: string;
  eqs: Array<[string, unknown]>;
  ins: Array<[string, unknown[]]>;
  linha?: Record<string, unknown>;
}

type Resultado = { data: unknown; error: unknown };

// deno-lint-ignore no-explicit-any
function makeChainable(op: Op, resolver: () => Resultado): any {
  // deno-lint-ignore no-explicit-any
  const chain: any = {
    select: (cols?: string) => {
      if (typeof cols === "string") op.cols = cols;
      return chain;
    },
    eq: (c: string, v: unknown) => {
      op.eqs.push([c, v]);
      return chain;
    },
    in: (c: string, v: unknown[]) => {
      op.ins.push([c, v]);
      return chain;
    },
    is: () => chain,
    not: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(resolver()),
    maybeSingle: () => Promise.resolve(resolver()),
    // deno-lint-ignore no-explicit-any
    then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(resolver()).then(onF, onR),
  };
  return chain;
}

interface AdminOpts {
  /** Linha de `candidatos` do passo 2. `null` = quem chamou não é candidato → 403. */
  candidato?: { id: string } | null;
  /** Erro da query do passo 2 — tem de virar 500, NUNCA 403 (WR-04). */
  candidatoErr?: unknown;
  /** Última linha de `solicitacoes_dados` do passo 3 (cooldown). */
  ultimoPedido?: { solicitado_em: string } | null;
  insertErr?: unknown;
  /** Linhas por tabela na fase de projeção. */
  linhas?: Record<string, unknown[]>;
  /** Nome da tabela cuja leitura de payload deve falhar (caso 13). */
  erroLeitura?: string;
}

function makeMockSupabaseAdmin(opts: AdminOpts = {}) {
  const ops: Op[] = [];
  const candidato = opts.candidato === undefined ? { id: CANDIDATO_ID } : opts.candidato;
  const ultimo = opts.ultimoPedido === undefined ? null : opts.ultimoPedido;

  const registrou = () => ops.some((o) => o.op === "insert");

  const linhasDe = (tabela: string): unknown[] => {
    if (opts.linhas && tabela in opts.linhas) return opts.linhas[tabela];
    if (tabela === "candidaturas") return [{ id: CANDIDATURA_ID, candidato_id: CANDIDATO_ID }];
    if (tabela === "candidatos") return [{ id: CANDIDATO_ID }];
    return [];
  };

  const novo = (op: Op["op"], tabela: string, linha?: Record<string, unknown>): Op => {
    const registro: Op = { op, tabela, eqs: [], ins: [], linha };
    ops.push(registro);
    return registro;
  };

  return {
    ops,
    from(tabela: string) {
      return {
        select: (cols: string) => {
          const op = novo("select", tabela);
          op.cols = cols;
          return makeChainable(op, () => {
            // ANTES do INSERT estamos nos gates (passos 2 e 3), não na projeção.
            if (!registrou()) {
              if (tabela === "candidatos") {
                return { data: candidato, error: opts.candidatoErr ?? null };
              }
              if (tabela === "solicitacoes_dados") {
                return { data: ultimo, error: null };
              }
            }
            if (opts.erroLeitura === tabela) {
              return { data: null, error: { message: "falha de leitura" } };
            }
            return { data: linhasDe(tabela), error: null };
          });
        },
        insert: (linha: Record<string, unknown>) => {
          const op = novo("insert", tabela, linha);
          return makeChainable(op, () =>
            opts.insertErr
              ? { data: null, error: opts.insertErr }
              : { data: { id: PEDIDO_ID }, error: null }
          );
        },
        update: (linha: Record<string, unknown>) => {
          const op = novo("update", tabela, linha);
          return makeChainable(op, () => ({ data: null, error: null }));
        },
      };
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

/** Deps que EXPLODEM se tocadas — o caso (1) e o (3) vivem disto. */
function depsProibidas() {
  return {
    supabaseAdmin: {
      from() {
        throw new Error("o client admin foi tocado quando não devia");
      },
    },
    supabaseUser: {
      auth: {
        getUser() {
          throw new Error("o client de usuário foi tocado quando não devia");
        },
      },
    },
  };
}

async function loadHandler() {
  // RED até a implementação existir: este import rejeita com module-not-found.
  const mod = await import("../index.ts");
  return mod as {
    handler: (
      req: Request,
      deps: { supabaseAdmin: unknown; supabaseUser: unknown },
    ) => Promise<Response>;
    chaveDoTitular: (tabela: string) => string;
  };
}

function makeRequest(
  opcoes: { method?: string; body?: unknown; auth?: boolean } = {},
): Request {
  const { method = "POST", body, auth = true } = opcoes;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = "Bearer jwt-do-titular";
  return new Request("http://localhost/functions/v1/exportar-meus-dados", {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** As leituras de payload = as que vêm DEPOIS do INSERT do registro. */
function leiturasDeProjecao(ops: Op[]): Op[] {
  const iInsert = ops.findIndex((o) => o.op === "insert");
  if (iInsert < 0) return [];
  return ops.slice(iInsert + 1).filter((o) => o.op === "select");
}

/** Assinatura comparável de uma projeção — o que o caso (6) compara entre duas execuções. */
function assinatura(ops: Op[]): string {
  return JSON.stringify(
    leiturasDeProjecao(ops).map((o) => ({ tabela: o.tabela, cols: o.cols, eqs: o.eqs, ins: o.ins })),
  );
}

// ── (1) OPTIONS → 200 + CORS, sem tocar em Deps ───────────────────────────────
Deno.test("(1) OPTIONS devolve 200 com CORS e não toca em Deps", async () => {
  const { handler } = await loadHandler();
  const res = await handler(makeRequest({ method: "OPTIONS", auth: false }), depsProibidas());
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assert(res.headers.get("Access-Control-Allow-Headers")?.includes("authorization"));
});

// ── (2) método não suportado → 405 ────────────────────────────────────────────
Deno.test("(2) GET devolve 405", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(makeRequest({ method: "GET" }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });
  assertEquals(res.status, 405);
});

// ── (3) sem sessão → 401 e NENHUMA chamada ao admin ───────────────────────────
Deno.test("(3) sem sessão → 401 UNAUTHORIZED e zero chamadas ao client admin", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(makeRequest({ auth: false }), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(null),
  });
  assertEquals(res.status, 401);
  assertEquals((await res.json()).error_code, "UNAUTHORIZED");
  // authenticate vem ANTES de qualquer leitura privilegiada.
  assertEquals(admin.ops.length, 0);
});

// ── (4) autenticado sem linha em candidatos → 403 (authenticate ≠ authorize) ───
Deno.test("(4) autenticado que não é candidato → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato: null });
  const res = await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error_code, "FORBIDDEN");
  // Nada além do próprio gate foi lido: nenhum INSERT, nenhuma projeção.
  assertEquals(admin.ops.filter((o) => o.op !== "select").length, 0);
  assertEquals(admin.ops.length, 1);
});

// ── (5) erro de query no passo 2 → 500, NUNCA 403 (WR-04) ─────────────────────
Deno.test("(5) erro de query no gate de titularidade → 500 SERVER_ERROR, nunca 403", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    candidato: null,
    candidatoErr: { message: "conexão caiu" },
  });
  const res = await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });
  assertEquals(res.status, 500);
  assertEquals((await res.json()).error_code, "SERVER_ERROR");
});

// ── (6) o CORPO É IGNORADO — provado comparando duas execuções ────────────────
Deno.test("(6) um candidato_id de outra pessoa no corpo não muda nada", async () => {
  const { handler } = await loadHandler();

  const adminComCorpo = makeMockSupabaseAdmin();
  await handler(makeRequest({ body: { candidato_id: OUTRA_PESSOA_ID } }), {
    supabaseAdmin: adminComCorpo,
    supabaseUser: makeMockSupabaseUser(USER),
  });

  const adminSemCorpo = makeMockSupabaseAdmin();
  await handler(makeRequest(), {
    supabaseAdmin: adminSemCorpo,
    supabaseUser: makeMockSupabaseUser(USER),
  });

  // A projeção é byte-idêntica nas duas execuções.
  assertEquals(assinatura(adminComCorpo.ops), assinatura(adminSemCorpo.ops));

  // E o id que atravessou é o RESOLVIDO de auth.uid(), nunca o do corpo.
  const filtros = leiturasDeProjecao(adminComCorpo.ops).flatMap((o) => [
    ...o.eqs.map(([, v]) => v),
    ...o.ins.flatMap(([, v]) => v),
  ]);
  assert(filtros.includes(CANDIDATO_ID), "o candidato_id resolvido não foi usado");
  assert(
    !filtros.includes(OUTRA_PESSOA_ID),
    "o id vindo do corpo do request atravessou para uma leitura",
  );
});

// ── (7) cooldown < 24 h → 429 COOLDOWN, sem INSERT novo ──────────────────────
Deno.test("(7) pedido há menos de 24 h → 429 COOLDOWN com liberado_em e sem INSERT", async () => {
  const { handler } = await loadHandler();
  const solicitadoEm = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 h atrás
  const admin = makeMockSupabaseAdmin({ ultimoPedido: { solicitado_em: solicitadoEm } });
  const res = await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });
  assertEquals(res.status, 429);
  const json = await res.json();
  assertEquals(json.ok, false);
  assertEquals(json.error_code, "COOLDOWN");
  assertEquals(
    json.liberado_em,
    new Date(new Date(solicitadoEm).getTime() + VINTE_E_QUATRO_H).toISOString(),
  );
  assertEquals(admin.ops.filter((o) => o.op === "insert").length, 0);
});

// ── (8) cooldown expirado → segue o fluxo ────────────────────────────────────
Deno.test("(8) pedido há mais de 24 h → segue o fluxo", async () => {
  const { handler } = await loadHandler();
  const solicitadoEm = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const admin = makeMockSupabaseAdmin({ ultimoPedido: { solicitado_em: solicitadoEm } });
  const res = await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });
  assertEquals(res.status, 200);
  assertEquals(admin.ops.filter((o) => o.op === "insert").length, 1);
});

// ── (9) ORDEM: o registro nasce ANTES da montagem (Pitfall 4) ────────────────
Deno.test("(9) o INSERT do pedido vem ANTES da primeira leitura de payload", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });

  const iInsert = admin.ops.findIndex((o) => o.op === "insert");
  assert(iInsert >= 0, "nenhum INSERT em solicitacoes_dados");
  assertEquals(admin.ops[iInsert].tabela, "solicitacoes_dados");
  assertEquals(admin.ops[iInsert].linha?.situacao, "pendente");
  assertEquals(admin.ops[iInsert].linha?.tipo, "acesso");
  assertEquals(admin.ops[iInsert].linha?.candidato_id, CANDIDATO_ID);

  // Nenhuma leitura de payload antes dele: as únicas anteriores são os dois gates.
  const anteriores = admin.ops.slice(0, iInsert);
  assertEquals(anteriores.length, 2);
  assertEquals(anteriores[0].tabela, "candidatos");
  assertEquals(anteriores[0].cols, "id");
  assertEquals(anteriores[1].tabela, "solicitacoes_dados");
  assertEquals(anteriores[1].cols, "solicitado_em");

  // E a projeção cobre TODAS as tabelas do artefato.
  const projetadas = new Set(leiturasDeProjecao(admin.ops).map((o) => o.tabela));
  assertEquals(projetadas.size, Object.keys(EXPORT_ALLOWLIST.tabelas).length);
});

// ── (10) PROJEÇÃO POR ALLOWLIST + a negativa da projeção total ───────────────
Deno.test("(10) cada select é exatamente a junção das colunas da allowlist", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });

  const porTabela = new Map(leiturasDeProjecao(admin.ops).map((o) => [o.tabela, o.cols]));
  for (const [tabela, def] of Object.entries(EXPORT_ALLOWLIST.tabelas)) {
    assertEquals(
      porTabela.get(tabela),
      (def as { colunas: readonly string[] }).colunas.join(", "),
      `projeção divergente da allowlist em ${tabela}`,
    );
  }

  // Negativa: NENHUMA string de select carrega o caractere de projeção total.
  // Montado em runtime (idioma 42-11/44-03) — o literal proibido não passa a
  // existir dentro do arquivo que o proíbe.
  const projecaoTotal = ["*"].join("");
  for (const op of admin.ops) {
    if (typeof op.cols !== "string") continue;
    assert(
      !op.cols.includes(projecaoTotal),
      `projeção total encontrada no select de ${op.tabela}`,
    );
  }
  // META: a sonda TEM de ser capaz de encontrar o caractere, senão é no-op.
  assert(`a${projecaoTotal}b`.includes(projecaoTotal));
});

// ── (11) cada leitura filtra pela chave_titular DECLARADA no artefato ────────
Deno.test("(11) o filtro de cada tabela é a chave_titular do artefato", async () => {
  const { handler, chaveDoTitular } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });

  const porTabela = new Map(leiturasDeProjecao(admin.ops).map((o) => [o.tabela, o]));
  for (const [tabela, defRaw] of Object.entries(EXPORT_ALLOWLIST.tabelas)) {
    const def = defRaw as { chave_titular: string; ligacao: string };
    const op = porTabela.get(tabela);
    assert(op, `tabela ${tabela} não foi lida`);
    assertEquals(chaveDoTitular(tabela), def.chave_titular);

    if (def.ligacao === "direta") {
      assertEquals(
        op!.eqs.find(([c]) => c === def.chave_titular)?.[1],
        CANDIDATO_ID,
        `${tabela} não filtrou por ${def.chave_titular} = candidato resolvido`,
      );
    } else {
      assertEquals(
        op!.ins.find(([c]) => c === def.chave_titular)?.[1],
        [CANDIDATURA_ID],
        `${tabela} não filtrou pelos ids da ponte declarada (${def.ligacao})`,
      );
    }
  }
});

// ── (12) caminho feliz → 200 + o UPDATE que marca atendido ──────────────────
Deno.test("(12) caminho feliz devolve 200 e marca o pedido como atendido", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.ok, true);
  assertEquals(json.versao_allowlist, EXPORT_ALLOWLIST.meta.versao);
  assert(typeof json.gerado_em === "string" && json.gerado_em.length > 0);
  assert(json.payload && typeof json.payload === "object");
  assertEquals(
    Object.keys(json.payload).length,
    Object.keys(EXPORT_ALLOWLIST.tabelas).length,
  );

  const update = admin.ops.find((o) => o.op === "update");
  assert(update, "o pedido não foi marcado");
  assertEquals(update!.tabela, "solicitacoes_dados");
  assertEquals(update!.linha?.situacao, "atendido");
  assert(typeof update!.linha?.atendido_em === "string");
  assertEquals(update!.eqs.find(([c]) => c === "id")?.[1], PEDIDO_ID);
});

// ── (13) falha na montagem → 500 e a linha PERMANECE pendente com causa ─────
Deno.test("(13) falha no meio da montagem → 500 e linha pendente com falha_geracao", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ erroLeitura: "autorizacoes" });
  const res = await handler(makeRequest(), {
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(USER),
  });
  assertEquals(res.status, 500);
  assertEquals((await res.json()).error_code, "SERVER_ERROR");

  const update = admin.ops.find((o) => o.op === "update");
  assert(update, "o pedido falho não recebeu causa");
  assertEquals(update!.linha?.situacao, "pendente");
  assertEquals(update!.linha?.causa, "falha_geracao");
  assertEquals(update!.linha?.atendido_em, undefined);
});

// ── (14) ASSERÇÃO NEGATIVA DE VAZAMENTO ─────────────────────────────────────
Deno.test("(14) nem a resposta nem o log carregam URL assinada ou payload", async () => {
  const { handler } = await loadHandler();

  // (14a) a resposta serializada não carrega substring de URL assinada, mesmo
  //       com o caminho de Storage do CV dentro da projeção de `candidaturas`.
  const adminOk = makeMockSupabaseAdmin({
    linhas: {
      candidaturas: [
        { id: CANDIDATURA_ID, candidato_id: CANDIDATO_ID, curriculo_url: "uid/cv.pdf" },
      ],
    },
  });
  const ok = await handler(makeRequest(), {
    supabaseAdmin: adminOk,
    supabaseUser: makeMockSupabaseUser(USER),
  });
  const corpo = await ok.text();
  const marcaToken = ["token", "="].join("");
  const marcaSign = ["/object", "/sign/"].join("");
  assert(!corpo.includes(marcaToken), "substring de URL assinada na resposta");
  assert(!corpo.includes(marcaSign), "substring de URL assinada na resposta");
  // META: as duas sondas TÊM de ser capazes de encontrar o que procuram.
  assert(`x${marcaToken}y`.includes(marcaToken) && `x${marcaSign}y`.includes(marcaSign));

  // (14b) o console.error do caminho de falha recebe APENAS { pedido_id }.
  const capturados: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    capturados.push(args);
  };
  try {
    const adminFalho = makeMockSupabaseAdmin({ erroLeitura: "candidatos" });
    await handler(makeRequest({ body: { candidato_id: OUTRA_PESSOA_ID } }), {
      supabaseAdmin: adminFalho,
      supabaseUser: makeMockSupabaseUser(USER),
    });
  } finally {
    console.error = original;
  }

  assertEquals(capturados.length, 1);
  const [, contexto] = capturados[0];
  assertEquals(contexto, { pedido_id: PEDIDO_ID });
  const serializado = JSON.stringify(capturados);
  assert(!serializado.includes(OUTRA_PESSOA_ID), "o corpo do request vazou para o log");
  assert(!serializado.includes("payload"), "o payload vazou para o log");
});
