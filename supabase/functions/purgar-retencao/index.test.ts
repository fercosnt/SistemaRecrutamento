/**
 * Phase 46 / Plano 46-05 Task 3 (TDD RED) — a Edge Function `purgar-retencao`,
 * o executor destrutivo da purga automática de retenção.
 *
 * ── AUTORADO RED (por desenho) ──────────────────────────────────────────────
 * `supabase/functions/purgar-retencao/index.ts` NÃO EXISTE quando este arquivo é
 * escrito. `loadHandler()` importa `./index.ts` dinamicamente; esse import falha por
 * module-not-found, e TODO teste aqui é vermelho por UMA razão conhecida e
 * pretendida. Não é erro de sintaxe — o harness compila; só o alvo falta.
 *
 * ⚠ A linha de `exclude` de `vite.config.ts` já existe (Task 1 deste plano, commit
 * anterior). Ela nasceu ANTES deste arquivo de propósito: uma entrada de `exclude`
 * apontando para caminho inexistente é no-op inofensivo, e uma que chegasse DEPOIS
 * deixaria `npm run test:run` vermelho no intervalo entre dois commits — por falha de
 * CARGA de módulo, não de asserção (Pitfall 12 / precedente negativo da Phase 42).
 *
 * ── OS NOVE COMPORTAMENTOS, E O QUE CADA UM PROTEGE ─────────────────────────
 *  (a) requisição SEM `Authorization`        → 401, sem tocar em nada. `verify_jwt`
 *      é `false`: o gateway não autentica, e a função tem de se autenticar sozinha.
 *  (b) Bearer que NÃO confere                → 401, e o log **não** carrega o valor
 *      recebido — logar o segredo tentado é vazá-lo para quem lê o log.
 *  (c) método diferente de POST              → 405 (e `OPTIONS` → 200, preflight)
 *  (d) corpo sem `item_id` ou sem `candidato_id` → 400, e **zero** RPC chamada
 *  (e) reivindicação RECUSADA (`P46FB`)      → 403. O payload SELECIONA e o banco
 *      AUTORIZA (Pitfall 11 / classe T-32-03).
 *  (f) ERRO TRANSITÓRIO na reivindicação     → 500, **nunca 403**: um erro de
 *      consulta virando negativa de autorização é uma mentira sobre autorização, e é
 *      o tipo de mentira que ninguém investiga.
 *  (g) caminho feliz                          → reivindica, enumera, remove do
 *      Storage, chama o motor, apaga a conta do Auth e conclui o item — NESSA ORDEM.
 *  (h) falha no passo de Storage              → o item é concluído com
 *      `desfecho_storage = 'falha'` e os passos seguintes **não** executam. Uma
 *      invocação que apagasse a conta do Auth depois de o Storage ter falhado
 *      deixaria o currículo órfão e sem ninguém a quem responder.
 *  (i) o identificador usado depois da reivindicação é o DEVOLVIDO PELA RPC, jamais
 *      o do corpo.
 *
 * ⚠ (i) É A ASSERÇÃO QUE UM TESTE DE CAMINHO FELIZ NÃO PEGA. O corpo da resposta é
 * idêntico nos dois casos; a única evidência é o ARGUMENTO com que o Storage, o motor
 * e a Admin API do Auth foram chamados. É a herdeira direta do caso (i) da EF da
 * Phase 45, aqui na forma *"item forjado no corpo ⇒ 403, porque o banco reverifica o
 * encontro"* mais *"identificador alheio no corpo ⇒ IGNORADO"*.
 *
 * ⚠ E TODO CAMINHO DEPOIS DA REIVINDICAÇÃO CONCLUI O ITEM. Um item que fica aberto
 * mantém viva a autorização do 4º ramo do guard destrutivo até a janela de HI-03
 * vencer — por isso a conclusão vai num bloco de finalização, e por isso ela é
 * asserida em (g), (h) e no caso de falha do motor.
 *
 * Roda: `deno test supabase/functions/purgar-retencao/` — **sem `--allow-net`** e
 * **sem `--allow-env`**: o handler recebe `deps` injetados e não lê `Deno.env`.
 *
 * @see supabase/functions/purgar-retencao/index.ts (o handler; ausente no RED)
 * @see supabase/migrations/20260823000010_p46_item_lifecycle.sql (as duas RPCs)
 */

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------------------------------------------------------------------------
// Harness — um único client falso, porque a EF tem um único client real
// ---------------------------------------------------------------------------

const SEGREDO = "segredo-de-teste-do-vault";
const ITEM = "11111111-1111-4111-8111-111111111111";
/** O que o CORPO manda. Ele SELECIONA, e não autoriza. */
const CORPO_CANDIDATO = "22222222-2222-4222-8222-222222222222";
/** O que a RPC DEVOLVE. É este que a função tem de usar dali em diante. */
const ITEM_CANDIDATO = "33333333-3333-4333-8333-333333333333";
/** O `user_id` do Auth daquele candidato — o prefixo do Storage e o alvo do delete. */
const AUTH_UID = "44444444-4444-4444-8444-444444444444";

interface ChamadaRpc {
  nome: string;
  args: Record<string, unknown>;
}

interface Registro {
  rpc: ChamadaRpc[];
  storageList: string[];
  storageRemove: string[][];
  deleteUser: string[];
  select: Array<{ tabela: string; coluna: string; valor: unknown }>;
  /** A ORDEM em que os sistemas foram tocados — é ela que (g) afere. */
  ordem: string[];
}

interface Cenario {
  /** Resposta de cada RPC por nome. `erro` vira `{ data: null, error }`. */
  rpc?: Record<string, { data?: unknown; error?: { code?: string; message?: string } }>;
  /** `user_id` devolvido por `candidatos`. `null` = titular sem conta de Auth. */
  userId?: string | null;
  selectErro?: { message: string } | null;
  /** Objetos sob o prefixo, por chamada de `list` (a 2ª é a re-conferência). */
  listagens?: Array<Array<{ name: string; id: string }>>;
  listErro?: { message: string } | null;
  removeErro?: { message: string } | null;
  deleteErro?: { message: string } | null;
}

function makeAdmin(cenario: Cenario, reg: Registro) {
  let listIdx = 0;
  return {
    rpc(nome: string, args: Record<string, unknown>) {
      reg.rpc.push({ nome, args });
      reg.ordem.push(`rpc:${nome}`);
      const r = cenario.rpc?.[nome];
      if (r?.error) return Promise.resolve({ data: null, error: r.error });
      return Promise.resolve({ data: r?.data ?? null, error: null });
    },
    from(tabela: string) {
      return {
        select(_cols: string) {
          return {
            eq(coluna: string, valor: unknown) {
              return {
                maybeSingle() {
                  reg.select.push({ tabela, coluna, valor });
                  reg.ordem.push(`select:${tabela}`);
                  if (cenario.selectErro) {
                    return Promise.resolve({ data: null, error: cenario.selectErro });
                  }
                  return Promise.resolve({
                    data: { user_id: cenario.userId === undefined ? AUTH_UID : cenario.userId },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
    storage: {
      from(_bucket: string) {
        return {
          list(pasta: string, _opts: unknown) {
            reg.storageList.push(pasta);
            reg.ordem.push("storage:list");
            if (cenario.listErro) return Promise.resolve({ data: null, error: cenario.listErro });
            const pagina = cenario.listagens?.[listIdx] ?? [];
            listIdx += 1;
            return Promise.resolve({ data: pagina, error: null });
          },
          remove(caminhos: string[]) {
            reg.storageRemove.push(caminhos);
            reg.ordem.push("storage:remove");
            if (cenario.removeErro) {
              return Promise.resolve({ data: null, error: cenario.removeErro });
            }
            return Promise.resolve({ data: caminhos.map((c) => ({ name: c })), error: null });
          },
        };
      },
    },
    auth: {
      admin: {
        deleteUser(uid: string) {
          reg.deleteUser.push(uid);
          reg.ordem.push("auth:deleteUser");
          if (cenario.deleteErro) return Promise.resolve({ data: null, error: cenario.deleteErro });
          return Promise.resolve({ data: { user: { id: uid } }, error: null });
        },
      },
    },
  };
}

/**
 * O cenário do caminho feliz — cada teste sobrescreve só o que quer quebrar.
 *
 * ⚠ `extra.rpc` é MESCLADO, nunca substituído, e a distinção não é estilo: a primeira
 * versão deste helper espalhava `...extra` DEPOIS de montar o mapa de RPCs, e o
 * `extra.rpc` parcial apagava as outras três. O efeito era silencioso e perverso — a
 * `reivindicar_item_purga` sumia do mapa, devolvia `null`, e a EF respondia 500 no
 * passo 0. Os testes (e), (f) e (f2) continuavam VERDES porque eles esperam recusa no
 * passo 0 de qualquer jeito: **eles passavam pelo motivo errado**. Só (h2) e (h3),
 * que precisam CHEGAR ao motor, expuseram o defeito. É a mesma classe de falso verde
 * que esta fase cataloga, agora dentro do próprio harness.
 */
function cenarioFeliz(extra: Partial<Cenario> = {}): Cenario {
  const { rpc: rpcExtra, listagens, ...resto } = extra;
  return {
    ...resto,
    rpc: {
      reivindicar_item_purga: { data: ITEM_CANDIDATO },
      plano_exclusao_titular: {
        data: {
          candidato_id: ITEM_CANDIDATO,
          candidato_existe: true,
          ja_anonimizado: false,
          user_id_presente: true,
          bloqueadores_deleteuser: [],
        },
      },
      anonimizar_candidato: { data: { resultado: "anonimizado" } },
      concluir_item_purga: { data: null },
      ...(rpcExtra ?? {}),
    },
    listagens: listagens ?? [[{ name: "cv.pdf", id: "obj-1" }], []],
  };
}

function novoRegistro(): Registro {
  return { rpc: [], storageList: [], storageRemove: [], deleteUser: [], select: [], ordem: [] };
}

function req(
  body: unknown,
  opts: { metodo?: string; auth?: string | null } = {},
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== null) headers["Authorization"] = opts.auth ?? `Bearer ${SEGREDO}`;
  return new Request("https://exemplo.local/purgar-retencao", {
    method: opts.metodo ?? "POST",
    headers,
    body: opts.metodo === "GET" || opts.metodo === "OPTIONS" ? undefined : JSON.stringify(body),
  });
}

async function loadHandler() {
  // RED até a implementação existir: este import rejeita com module-not-found.
  const mod = await import("./index.ts");
  return mod.handler as (
    r: Request,
    // ⚠ `agora` é o relógio injetável do orçamento de parede (HI-05). Opcional
    //   aqui pelo mesmo motivo que é opcional em `Deps`: em produção o bootstrap
    //   não passa nada e o default é `Date.now`.
    deps: { supabaseAdmin: unknown; segredoEsperado: string; agora?: () => number },
  ) => Promise<Response>;
}

/** Captura `console.*` para as asserções de log — sem segredo, sem PII. */
function capturarLogs(): { linhas: string[]; restaurar: () => void } {
  const linhas: string[] = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  const captura = (...a: unknown[]) => {
    linhas.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  };
  console.log = captura;
  console.warn = captura;
  console.error = captura;
  return {
    linhas,
    restaurar() {
      console.log = orig.log;
      console.warn = orig.warn;
      console.error = orig.error;
    },
  };
}

/** Índice do desfecho gravado por `concluir_item_purga`, ou `null` se não foi chamada. */
function desfechosConcluidos(reg: Registro): Record<string, unknown> | null {
  const c = reg.rpc.find((x) => x.nome === "concluir_item_purga");
  if (!c) return null;
  return (c.args.p_desfechos ?? null) as Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// (a) SEM Authorization → 401, e nada é tocado
// ---------------------------------------------------------------------------

Deno.test("(a) requisicao sem Authorization devolve 401 e nao toca em sistema nenhum", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }, { auth: null }), {
    supabaseAdmin: makeAdmin(cenarioFeliz(), reg),
    segredoEsperado: SEGREDO,
  });

  assertEquals(res.status, 401);
  // ⊖ O ponto inteiro de `verify_jwt = false`: quem recusa é a FUNÇÃO, e ela recusa
  // ANTES de qualquer chamada. Um 401 depois de a primeira RPC ter rodado seria uma
  // recusa decorativa.
  assertEquals(reg.rpc.length, 0);
  assertEquals(reg.storageRemove.length, 0);
  assertEquals(reg.deleteUser.length, 0);
});

// ---------------------------------------------------------------------------
// (b) Bearer que não confere → 401, e o log NÃO carrega o valor recebido
// ---------------------------------------------------------------------------

Deno.test("(b) Bearer divergente devolve 401 e o log nao carrega o valor recebido", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const cap = capturarLogs();
  let res: Response;
  try {
    res = await handler(
      req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }, { auth: "Bearer valor-forjado-xyz" }),
      { supabaseAdmin: makeAdmin(cenarioFeliz(), reg), segredoEsperado: SEGREDO },
    );
  } finally {
    cap.restaurar();
  }

  assertEquals(res.status, 401);
  assertEquals(reg.rpc.length, 0);
  const log = cap.linhas.join("\n");
  assert(
    !log.includes("valor-forjado-xyz"),
    "o log carregou o Bearer RECEBIDO — logar o segredo tentado e vaza-lo para quem le o log",
  );
  assert(
    !log.includes(SEGREDO),
    "o log carregou o segredo ESPERADO — pior ainda que carregar o recebido",
  );
});

Deno.test("(b2) Authorization sem o prefixo Bearer devolve 401", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const res = await handler(
    req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }, { auth: SEGREDO }),
    { supabaseAdmin: makeAdmin(cenarioFeliz(), reg), segredoEsperado: SEGREDO },
  );
  assertEquals(res.status, 401);
  assertEquals(reg.rpc.length, 0);
});

// ---------------------------------------------------------------------------
// (c) método
// ---------------------------------------------------------------------------

Deno.test("(c) metodo GET devolve 405 e OPTIONS devolve 200 (preflight)", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const deps = { supabaseAdmin: makeAdmin(cenarioFeliz(), reg), segredoEsperado: SEGREDO };

  const get = await handler(req(null, { metodo: "GET" }), deps);
  assertEquals(get.status, 405);

  // O preflight chega SEM Authorization e tem de passar — senão o 401 do guard
  // responderia ao OPTIONS e o navegador nunca mandaria o POST.
  const options = await handler(req(null, { metodo: "OPTIONS", auth: null }), deps);
  assertEquals(options.status, 200);
  assertEquals(reg.rpc.length, 0);
});

// ---------------------------------------------------------------------------
// (d) corpo incompleto → 400, e ZERO RPC
// ---------------------------------------------------------------------------

Deno.test("(d) corpo sem item_id ou sem candidato_id devolve 400 sem chamar RPC nenhuma", async () => {
  const handler = await loadHandler();

  for (
    const corpo of [
      {},
      { item_id: ITEM },
      { candidato_id: CORPO_CANDIDATO },
      { item_id: "", candidato_id: CORPO_CANDIDATO },
      { item_id: ITEM, candidato_id: 42 },
    ]
  ) {
    const reg = novoRegistro();
    const res = await handler(req(corpo), {
      supabaseAdmin: makeAdmin(cenarioFeliz(), reg),
      segredoEsperado: SEGREDO,
    });
    assertEquals(res.status, 400, `corpo ${JSON.stringify(corpo)} deveria ser 400`);
    assertEquals(reg.rpc.length, 0, `corpo ${JSON.stringify(corpo)} chamou RPC`);
  }
});

// ---------------------------------------------------------------------------
// (e) reivindicação recusada → 403
// ---------------------------------------------------------------------------

Deno.test("(e) reivindicacao recusada com P46FB devolve 403 e nao toca em sistema nenhum", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const cen = cenarioFeliz({
    rpc: {
      reivindicar_item_purga: {
        error: { code: "P46FB", message: "FORBIDDEN: a reivindicacao foi recusada" },
      },
    },
  });

  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cen, reg),
    segredoEsperado: SEGREDO,
  });

  assertEquals(res.status, 403);
  // ⊖ ZERO ato irreversível. A reivindicação é a única porta que esta função
  // atravessa ANTES de tocar no Storage — se ela recusa, nada foi tocado.
  assertEquals(reg.storageRemove.length, 0);
  assertEquals(reg.deleteUser.length, 0);
  // ⊖ E o item NÃO é concluído: ele não é nosso. Concluí-lo fecharia um item que
  // pertence a outra invocação, ou que nem existe.
  assertEquals(desfechosConcluidos(reg), null);

  // ⊖ O corpo da resposta não devolve a mensagem do banco: ela nomeia a condição
  // que reprovou, e devolvê-la ao chamador é dar o oráculo de graça.
  const body = await res.json();
  assert(
    !JSON.stringify(body).includes("recusada"),
    "a resposta 403 ecoou a mensagem do banco — isso e um oraculo para quem forja",
  );
});

// ---------------------------------------------------------------------------
// (f) erro transitório → 500, NUNCA 403
// ---------------------------------------------------------------------------

Deno.test("(f) erro transitorio na reivindicacao devolve 500 e NUNCA 403", async () => {
  const handler = await loadHandler();

  for (
    const erro of [
      { code: "57014", message: "canceling statement due to statement timeout" },
      { code: "08006", message: "connection failure" },
      { message: "sem code nenhum" },
    ]
  ) {
    const reg = novoRegistro();
    const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
      supabaseAdmin: makeAdmin(cenarioFeliz({ rpc: { reivindicar_item_purga: { error: erro } } }), reg),
      segredoEsperado: SEGREDO,
    });
    assertEquals(
      res.status,
      500,
      `erro ${JSON.stringify(erro)} deveria ser 500 — um erro de consulta virando 403 e uma mentira sobre autorizacao`,
    );
    assertEquals(reg.storageRemove.length, 0);
  }
});

Deno.test("(f2) reivindicacao que NAO lanca mas nao devolve identificador e 500, nunca sucesso", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cenarioFeliz({ rpc: { reivindicar_item_purga: { data: null } } }), reg),
    segredoEsperado: SEGREDO,
  });
  // "Nao lancou" nunca foi o mesmo que "completou".
  assertEquals(res.status, 500);
  assertEquals(reg.storageRemove.length, 0);
  assertEquals(reg.deleteUser.length, 0);
});

// ---------------------------------------------------------------------------
// (g) caminho feliz — a ORDEM dos três sistemas, e o carimbo no fim
// ---------------------------------------------------------------------------

Deno.test("(g) caminho feliz percorre Storage -> Postgres -> Auth e conclui o item", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cenarioFeliz(), reg),
    segredoEsperado: SEGREDO,
  });

  assertEquals(res.status, 200);

  const iReiv = reg.ordem.indexOf("rpc:reivindicar_item_purga");
  const iRemove = reg.ordem.indexOf("storage:remove");
  const iMotor = reg.ordem.indexOf("rpc:anonimizar_candidato");
  const iAuth = reg.ordem.indexOf("auth:deleteUser");
  const iConc = reg.ordem.indexOf("rpc:concluir_item_purga");

  assert(iReiv >= 0, "a reivindicacao nao foi chamada");
  assert(iRemove > iReiv, "o Storage foi tocado ANTES da reivindicacao");
  assert(iMotor > iRemove, "o motor rodou ANTES do Storage — a ordem e Storage -> Postgres -> Auth");
  assert(iAuth > iMotor, "o Auth foi apagado ANTES do Postgres");
  assert(iConc > iAuth, "o item foi concluido ANTES do ultimo passo");

  // ⚠ UMA INVOCAÇÃO, UM TITULAR: nunca um laço sobre vários.
  assertEquals(reg.deleteUser.length, 1);

  const d = desfechosConcluidos(reg);
  assertEquals(d, { storage: "ok", postgres: "ok", auth: "ok" });
});

// ---------------------------------------------------------------------------
// (h) falha no Storage → o item fecha com `falha` e os passos seguintes NÃO rodam
// ---------------------------------------------------------------------------

Deno.test("(h) falha no Storage conclui o item com desfecho_storage=falha e NAO segue adiante", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cenarioFeliz({ removeErro: { message: "storage indisponivel" } }), reg),
    segredoEsperado: SEGREDO,
  });

  assertEquals(res.status, 500);
  // ⚠ ESTE É O PONTO. Apagar a conta do Auth depois de o Storage ter falhado
  // deixaria o curriculo orfao num bucket sem backup, e sem ninguem a quem responder.
  assertEquals(
    reg.rpc.filter((c) => c.nome === "anonimizar_candidato").length,
    0,
    "o motor rodou mesmo com o Storage falhado",
  );
  assertEquals(reg.deleteUser.length, 0, "a conta do Auth foi apagada com o Storage falhado");

  const d = desfechosConcluidos(reg);
  assertEquals(d, { storage: "falha", postgres: "nao_aplicavel", auth: "nao_aplicavel" });
});

Deno.test("(h2) falha no motor conclui o item com postgres=falha e NAO apaga a conta do Auth", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const cen = cenarioFeliz({
    rpc: { anonimizar_candidato: { error: { code: "P45DR", message: "dry-run terminator" } } },
  });
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cen, reg),
    segredoEsperado: SEGREDO,
  });

  // ⚠ O SQLSTATE DO TERMINADOR DE DRY-RUN CHEGANDO NO CAMINHO REAL É FALHA
  // ATRIBUÍDA AO PASSO, jamais sucesso: a transação foi REVERTIDA e nada foi
  // anonimizado. Lê-lo como sucesso marcaria o item como concluído com 100% da PII
  // intacta e o currículo já apagado.
  assertEquals(res.status, 500);
  assertEquals(reg.deleteUser.length, 0);
  const d = desfechosConcluidos(reg);
  assertEquals(d, { storage: "ok", postgres: "falha", auth: "nao_aplicavel" });
});

Deno.test("(h3) motor que NAO lanca mas nao devolve resultado nomeado e falha, nunca sucesso", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const cen = cenarioFeliz({ rpc: { anonimizar_candidato: { data: { resultado: "seila" } } } });
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cen, reg),
    segredoEsperado: SEGREDO,
  });

  assertEquals(res.status, 500);
  assertEquals(reg.deleteUser.length, 0);
  const d = desfechosConcluidos(reg);
  assertEquals(d, { storage: "ok", postgres: "falha", auth: "nao_aplicavel" });
});

// ---------------------------------------------------------------------------
// (i) O IDENTIFICADOR DO CORPO NÃO SOBREVIVE À REIVINDICAÇÃO
// ---------------------------------------------------------------------------

Deno.test("(i) tudo depois da reivindicacao usa o identificador DEVOLVIDO PELA RPC, nunca o do corpo", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cenarioFeliz(), reg),
    segredoEsperado: SEGREDO,
  });
  assertEquals(res.status, 200);

  // A reivindicação recebe o do corpo — ela SELECIONA, e é o banco que autoriza.
  const reiv = reg.rpc.find((c) => c.nome === "reivindicar_item_purga");
  assertEquals(reiv?.args.p_item_id, ITEM);
  assertEquals(reiv?.args.p_candidato_id, CORPO_CANDIDATO);

  // Daqui em diante, NENHUMA chamada carrega o identificador do corpo.
  const plano = reg.rpc.find((c) => c.nome === "plano_exclusao_titular");
  assertEquals(plano?.args.p_candidato_id, ITEM_CANDIDATO);

  const motor = reg.rpc.find((c) => c.nome === "anonimizar_candidato");
  assertEquals(motor?.args.p_candidato_id, ITEM_CANDIDATO);
  assertEquals(motor?.args.p_dry_run, false);

  assertEquals(reg.select[0]?.valor, ITEM_CANDIDATO);

  // O Storage e o Auth operam sobre o `user_id` daquele candidato — resolvido a
  // partir do identificador DO ITEM, nunca do corpo.
  assertEquals(reg.deleteUser, [AUTH_UID]);
  for (const pasta of reg.storageList) {
    assertStringIncludes(pasta, AUTH_UID);
    assert(!pasta.includes(CORPO_CANDIDATO), "o prefixo do Storage veio do CORPO da requisicao");
  }

  const tudo = JSON.stringify(reg);
  assert(
    tudo.split(CORPO_CANDIDATO).length - 1 === 1,
    "o identificador do corpo aparece mais de uma vez nas chamadas — ele so pode " +
      "aparecer na propria reivindicacao, onde SELECIONA sem autorizar",
  );
});

Deno.test("(i2) titular sem user_id: Storage e Auth ficam nao_aplicavel e o motor AINDA roda", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cenarioFeliz({ userId: null }), reg),
    segredoEsperado: SEGREDO,
  });

  // ⚠ Sem `user_id` não existe prefixo de Storage a derivar nem conta a apagar — a
  // SONDA 2 mediu que `storage.objects` não tem FK para `auth.users`, então não há
  // caminho relacional do candidato até os objetos dele. `nao_aplicavel` aqui é
  // literalmente verdade: não havia caminho a tentar. E recusar a anonimização por
  // isso deixaria o titular preso num laço de purgas que nunca concluem.
  assertEquals(res.status, 200);
  assertEquals(reg.storageRemove.length, 0);
  assertEquals(reg.deleteUser.length, 0);
  const d = desfechosConcluidos(reg);
  assertEquals(d, { storage: "nao_aplicavel", postgres: "ok", auth: "nao_aplicavel" });
});

// ---------------------------------------------------------------------------
// (j) HI-03 — falha ANTES do Storage não pode carimbar `desfecho_storage`
// ---------------------------------------------------------------------------
// ⚠⚠ ESTES DOIS CASOS EXISTEM PORQUE O LEDGER É PROVA, E NÃO LOG.
//   `purga_execucao_itens` é registro de cumprimento de obrigação legal com
//   retenção INDEFINIDA (D-46-16), num sistema sem PITR para desmentir. Gravar
//   `desfecho_storage = 'falha'` num passo que **nunca foi tentado** manda o
//   operador do dia seguinte investigar o bucket por um defeito que está numa
//   RPC do Postgres — é a mesma classe do RD2-01 desta fase, *a mentira
//   simétrica custa o mesmo que a otimista*, e ela já tinha sido consertada do
//   lado da reconciliação (`20260823000011:332-357`) antes de reaparecer aqui.
//
// ⚠ E o vocabulário já tinha a palavra certa: `concluir_item_purga` aceita
//   `nao_aplicavel` com o significado literal *"nem chegou a ser tentado"*
//   (`20260823000010:422-432`). A asserção é sobre o objeto GRAVADO, e não
//   sobre o status HTTP — os dois caminhos devolvem 500 de qualquer jeito, e é
//   por isso que um teste de status não pegaria isto.

Deno.test("(j) falha na RPC do plano fecha o item com postgres=falha e Storage em nao_aplicavel", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const cen = cenarioFeliz({
    rpc: { plano_exclusao_titular: { error: { code: "57014", message: "cancelado" } } },
  });
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cen, reg),
    segredoEsperado: SEGREDO,
  });

  assertEquals(res.status, 500);
  // ⊖ NÃO-VACUIDADE: o passo de Storage não chegou a ser aberto. Sem esta
  //   contagem, um `desfecho_storage = 'nao_aplicavel'` gravado DEPOIS de uma
  //   remoção real passaria por correto.
  assertEquals(reg.storageList.length, 0, "o Storage foi enumerado antes do plano falhar");
  assertEquals(reg.storageRemove.length, 0);
  assertEquals(reg.deleteUser.length, 0);
  assertEquals(desfechosConcluidos(reg), {
    storage: "nao_aplicavel",
    postgres: "falha",
    auth: "nao_aplicavel",
  });
});

Deno.test("(j2) falha ao ler candidatos.user_id fecha o item com postgres=falha, jamais storage=falha", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  const cen = cenarioFeliz({ selectErro: { message: "permission denied for table candidatos" } });
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cen, reg),
    segredoEsperado: SEGREDO,
  });

  assertEquals(res.status, 500);
  assertEquals(reg.storageList.length, 0, "o Storage foi enumerado antes de ler o user_id");
  assertEquals(reg.storageRemove.length, 0);
  assertEquals(reg.deleteUser.length, 0);
  assertEquals(desfechosConcluidos(reg), {
    storage: "nao_aplicavel",
    postgres: "falha",
    auth: "nao_aplicavel",
  });
});

// ---------------------------------------------------------------------------
// (k) HI-05 — o orçamento de parede é DA FUNÇÃO, e ele MORDE
// ---------------------------------------------------------------------------
// ⚠⚠ ESTES TRÊS CASOS EXISTEM PORQUE A MARGEM DE 150 S NÃO TINHA DONO.
//   `reivindicar_item_purga` concede a reivindicação apenas quando a execução
//   tem 150 s de janela restante, e infere daí que *"se a reivindicação passou,
//   o guard de 1 h ainda autoriza em todo passo posterior"* — o que fecha o
//   cenário RD2-03 (Storage apagado, motor recusa com 42501, currículo órfão e
//   irrecuperável, num bucket fora de todo backup). A aritmética está certa; o
//   PRESSUPOSTO — *"a EF morre aos 150 s"* — era uma medição da plataforma, do
//   tipo que muda com plano, região ou versão do runtime, sem diff e sem aviso.
//   `(q.2)` do smoke prova que o LITERAL `interval '150 seconds'` está no corpo
//   vivo da RPC, e **um literal presente não é um relógio**.
//
// ⚠ O RELÓGIO É INJETADO, e é isso que transforma o orçamento de promessa em
//   mecanismo aferível: um teto que nenhum teste consegue estourar é o mesmo
//   defeito que ele veio consertar.

/** Relógio falso: devolve, em ordem, os instantes que o teste roteirizou. */
function relogio(instantes: readonly number[]): () => number {
  let i = 0;
  return () => instantes[Math.min(i++, instantes.length - 1)];
}

Deno.test("(k) orcamento estourado ANTES do Storage: nada e tocado e o Postgres leva a falha", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  // 1ª leitura ancora o prazo em 0 + 120_000; a 2ª (antes do Storage) já passou.
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cenarioFeliz(), reg),
    segredoEsperado: SEGREDO,
    agora: relogio([0, 200_000]),
  });

  assertEquals(res.status, 500);
  // ⊖ O PONTO: o `remove` é o primeiro ato irreversível, e ele não aconteceu.
  assertEquals(reg.storageList.length, 0, "o bucket foi enumerado com o orcamento estourado");
  assertEquals(reg.storageRemove.length, 0, "houve REMOCAO com o orcamento estourado");
  assertEquals(reg.deleteUser.length, 0);
  // ⚠ `storage: nao_aplicavel` e não `falha`: nenhuma chamada aconteceu, e
  //   afirmar o contrário seria a mentira simétrica do RD2-01 (HI-03).
  assertEquals(desfechosConcluidos(reg), {
    storage: "nao_aplicavel",
    postgres: "falha",
    auth: "nao_aplicavel",
  });
});

Deno.test("(k2) orcamento estourado ANTES do motor: storage fica ok, e o Auth NAO e apagado", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  // Passa no cheque pré-Storage e no de lote, e estoura no cheque pré-motor.
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cenarioFeliz(), reg),
    segredoEsperado: SEGREDO,
    agora: relogio([0, 1_000, 2_000, 200_000]),
  });

  assertEquals(res.status, 500);
  assertEquals(reg.storageRemove.length, 1, "o Storage nao chegou a ser removido");
  assertEquals(
    reg.rpc.filter((c) => c.nome === "anonimizar_candidato").length,
    0,
    "o motor rodou com o orcamento estourado",
  );
  // ⚠⚠ ESTA É A ASSERÇÃO QUE JUSTIFICA A DIVERGÊNCIA DO TEXTO DE HI-05, que
  //   sugeria atribuir `storage` também aqui: o passo de Storage COMPLETOU, e
  //   sobrescrevê-lo para `falha` afirmaria que uma remoção bem-sucedida
  //   falhou — num registro com retenção INDEFINIDA e sem PITR para desmentir.
  assertEquals(desfechosConcluidos(reg), {
    storage: "ok",
    postgres: "falha",
    auth: "nao_aplicavel",
  });
  assertEquals(reg.deleteUser.length, 0);
});

Deno.test("(k3) com orcamento de sobra o caminho feliz continua inteiro — o cheque nao e um freio permanente", async () => {
  const handler = await loadHandler();
  const reg = novoRegistro();
  // ⊕ CONTROLE POSITIVO. Sem ele, um `semOrcamento()` que devolvesse SEMPRE
  //   true passaria nos dois casos acima — é o modo de falha nº 3 dos sete
  //   portões da Phase 45, e o que aconteceu com a `(p.3)` do smoke por três
  //   rodadas de review.
  const res = await handler(req({ item_id: ITEM, candidato_id: CORPO_CANDIDATO }), {
    supabaseAdmin: makeAdmin(cenarioFeliz(), reg),
    segredoEsperado: SEGREDO,
    agora: relogio([0, 10, 20, 30, 40]),
  });

  assertEquals(res.status, 200);
  assertEquals(reg.deleteUser.length, 1);
  assertEquals(desfechosConcluidos(reg), { storage: "ok", postgres: "ok", auth: "ok" });
});
