/**
 * Phase 52 / Plan 52-09 — teste Deno da EF `ler-cadastro-candidato-rh` (JORN-53, JORN-54).
 *
 * Harness clonado do `get-curriculo-url/index.test.ts`: `consultaQueFiltra` APLICA os
 * predicados `.eq/.is/.in` que recebe sobre linhas em memória — apagar um filtro da EF muda o
 * que ela lê, e o teste correspondente fica vermelho.
 *
 * Casos:
 *   autorização — 401 sem sessão; 403 candidato; 403 recrutador inativo; 403 `deleted_at`;
 *                 403 só a linha de outro usuário; 200 admin; 200 rh ativo.
 *   entrada     — 400 uuid inválido; 404 rascunho / excluída / ausente (o mesmo 404).
 *   contato     — rh com contato real → `contato` com e-mail e celular (o CONTROLE);
 *                 tombstone → `contato === null`; fictício `@invalido.local` COM celular →
 *                 `contato === null` e nenhum valor da fixture no corpo fora de `cadastro`;
 *                 domínio em maiúsculas e com espaço no fim → `contato === null`.
 *   log (D-11)  — espião de console.log/console.error: chaves exatas `candidatura_id`,
 *                 `rh_user_id`, `role`; nenhum valor de fixture em nenhuma chamada.
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/ler-cadastro-candidato-rh
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler } from "./index.ts";

const RH_UID = "rh-uid-ativo";
const ADMIN_UID = "admin-uid";
const CAND_UID = "cand-uid";
const OTHER_UID = "rh-uid-outro";
const CANDIDATURA_ID = "11111111-1111-4111-8111-111111111111";
const VAGA_ID = "22222222-2222-4222-8222-222222222222";
const CANDIDATO_ID = "33333333-3333-4333-8333-333333333333";
const VAGA_TITULO = "Recepcionista de Clínica";

// Valores de fixture que NUNCA podem aparecer em log, nem no corpo quando o registro não tem contato.
const EMAIL_REAL = "maria.souza@exemplo.com.br";
const CELULAR_REAL = "(11) 98888-7777";
const EMAIL_FICTICIO = "ficticio.um@invalido.local";
const CELULAR_FICTICIO = "11987654321";
const EMAIL_TOMBSTONE = `anonimizado+${CANDIDATO_ID}@invalido.local`;
const NOME = "Maria Aparecida Souza";
const CPF = "123.456.789-09";
const CEP = "01415-001";
const LOGRADOURO = "Rua Haddock Lobo";

const VALID_BODY = { candidatura_id: CANDIDATURA_ID };

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
function consultaQueFiltra(linhas: Array<Record<string, unknown>>, selects: string[]): any {
  const preds: Array<(r: Record<string, unknown>) => boolean> = [];
  const ordens: Array<{ c: string; asc: boolean }> = [];
  let limite = Infinity;
  let projecao: string[] | null = null;
  const filtradas = () => {
    const a = linhas.filter((r) => preds.every((p) => p(r)));
    for (const { c, asc } of [...ordens].reverse()) {
      a.sort((x, y) => {
        const vx = x[c] as string | number;
        const vy = y[c] as string | number;
        return vx === vy ? 0 : (vx < vy ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    // Projeção como o PostgREST: só as colunas pedidas no select — uma coluna que a EF esquece
    // de projetar chega ausente, e o teste que depende dela fica vermelho.
    return a.slice(0, limite).map((r) =>
      projecao === null ? r : Object.fromEntries(projecao.filter((c) => c in r).map((c) => [c, r[c]]))
    );
  };
  // deno-lint-ignore no-explicit-any
  const q: any = {
    select: (cols: string) => {
      selects.push(cols);
      projecao = cols.split(",").map((c) => c.trim());
      return q;
    },
    eq: (c: string, v: unknown) => {
      preds.push((r) => r[c] === v);
      return q;
    },
    is: (c: string, v: unknown) => {
      preds.push((r) => (r[c] ?? null) === v);
      return q;
    },
    in: (c: string, vs: unknown[]) => {
      preds.push((r) => vs.includes(r[c]));
      return q;
    },
    order: (c: string, o?: { ascending?: boolean }) => {
      ordens.push({ c, asc: o?.ascending !== false });
      return q;
    },
    limit: (n: number) => {
      limite = n;
      return q;
    },
    maybeSingle: () => {
      const a = filtradas();
      return Promise.resolve(
        a.length > 1
          ? { data: null, error: { code: "PGRST116", message: "mais de uma linha" } }
          : { data: a[0] ?? null, error: null },
      );
    },
    // deno-lint-ignore no-explicit-any
    then: (ok: (v: any) => unknown, ko?: (e: unknown) => unknown) =>
      Promise.resolve({ data: filtradas(), error: null }).then(ok, ko),
  };
  return q;
}

function linhaRh(user_id: string, role: string, extra: Record<string, unknown> = {}) {
  return { user_id, role, ativo: true, deleted_at: null, ...extra };
}

/** Candidato de contato real (o controle). */
function candidatoReal(extra: Record<string, unknown> = {}) {
  return {
    id: CANDIDATO_ID,
    user_id: CAND_UID,
    nome_completo: NOME,
    email: EMAIL_REAL,
    cpf: CPF,
    celular: CELULAR_REAL,
    data_nascimento: "1994-03-12",
    genero: "feminino",
    cep: CEP,
    logradouro: LOGRADOURO,
    numero: "120",
    complemento: "Apto 31",
    bairro: "Jardim Paulista",
    cidade: "São Paulo",
    estado: "SP",
    linkedin_url: "https://www.linkedin.com/in/maria-souza",
    linkedin: null,
    instagram_url: null,
    instagram: "@maria.souza",
    como_conheceu: "indicacao",
    como_conheceu_detalhes: "Indicação de uma amiga",
    // colunas internas que a EF nunca pode devolver
    deleted_at: null,
    ativo: true,
    avatar_url: "https://storage.example/avatar.png",
    faixa_etaria_materializada: "30-39",
    ...extra,
  };
}

/** Perguntas da vaga, fora de ordem de propósito (a EF devolve em `ordem` ASC). */
const P1 = "a0000000-0000-4000-8000-000000000001";
const P2 = "a0000000-0000-4000-8000-000000000002";
const P3 = "a0000000-0000-4000-8000-000000000003";
const P_REMOVIDA_RESP = "a0000000-0000-4000-8000-000000000004";
const P_REMOVIDA_SEM = "a0000000-0000-4000-8000-000000000005";
const P4 = "a0000000-0000-4000-8000-000000000006";
const P_OUTRA_VAGA = "a0000000-0000-4000-8000-000000000007";
const OPCAO_ELIMINA = "Não tenho disponibilidade aos sábados";

function pergunta(id: string, ordem: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    vaga_id: VAGA_ID,
    bloco: "jornada",
    ordem,
    texto_pergunta: `Pergunta ${ordem}`,
    tipo_resposta: "texto_curto",
    texto_ajuda: "ajuda interna",
    opcoes_resposta: [OPCAO_ELIMINA, "Tenho"],
    deleted_at: null,
    ...extra,
  };
}

const PERGUNTAS = [
  pergunta(P3, 3, { tipo_resposta: "numerico", bloco: "curriculo" }),
  pergunta(P1, 1, { tipo_resposta: "single_choice" }),
  pergunta(P_REMOVIDA_SEM, 5, { deleted_at: "2026-09-01T00:00:00Z" }),
  pergunta(P2, 2, { tipo_resposta: "multiple_choice" }),
  pergunta(P_REMOVIDA_RESP, 4, { deleted_at: "2026-09-01T00:00:00Z", texto_pergunta: "Pergunta antiga" }),
  pergunta(P4, 6, { tipo_resposta: "texto_longo" }),
  pergunta(P_OUTRA_VAGA, 0, { vaga_id: "99999999-9999-4999-8999-999999999999" }),
];

function resposta(pergunta_id: string, extra: Record<string, unknown>, candidatura_id = CANDIDATURA_ID) {
  return {
    id: crypto.randomUUID(),
    candidatura_id,
    pergunta_id,
    resposta_texto: null,
    resposta_opcoes: null,
    resposta_numerica: null,
    ...extra,
  };
}

const RESPOSTAS = [
  resposta(P1, { resposta_opcoes: ["Tenho"] }),
  resposta(P2, { resposta_opcoes: ["Instagram", "TikTok"], resposta_texto: "Kwai" }),
  resposta(P3, { resposta_numerica: "4.5" }),
  resposta(P_REMOVIDA_RESP, { resposta_texto: "Resposta antiga" }),
  // P4 sem resposta (pergunta viva → aparece com resposta null)
  // resposta de OUTRA candidatura à P4 — nunca pode vazar
  resposta(P4, { resposta_texto: "Resposta de outra pessoa" }, "44444444-4444-4444-8444-444444444444"),
];

const METADATA = [
  { id: "m1", pergunta_id: P1, opcao_id: "o1", opcao_texto: OPCAO_ELIMINA, tag: "knockout", peso: 0, ordem: 1 },
  { id: "m2", pergunta_id: P1, opcao_id: "o2", opcao_texto: "Tenho", tag: "pontua", peso: 2, ordem: 2 },
  { id: "m3", pergunta_id: P2, opcao_id: "o3", opcao_texto: "Instagram", tag: "pontua", peso: 1, ordem: 1 },
];

const DISPONIBILIDADE = [
  {
    id: "d-antiga",
    candidato_id: CANDIDATO_ID,
    periodo_disponivel: "manha",
    regime_trabalho: "remoto",
    disponibilidade_imediata: false,
    data_disponibilidade: null,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "d-recente",
    candidato_id: CANDIDATO_ID,
    periodo_disponivel: "Integral",
    regime_trabalho: "Presencial",
    disponibilidade_imediata: true,
    data_disponibilidade: "2026-11-01T00:00:00+00:00",
    updated_at: "2026-09-01T00:00:00Z",
  },
];

interface AdminOpts {
  rhRows?: Array<Record<string, unknown>>;
  /** candidaturas row; `null` = nenhuma. Viva salvo indicação. */
  cand?: Record<string, unknown> | null;
  candidato?: Record<string, unknown> | null;
  vaga?: Record<string, unknown> | null;
  disponibilidade?: Array<Record<string, unknown>>;
  perguntas?: Array<Record<string, unknown>>;
  respostas?: Array<Record<string, unknown>>;
  metadata?: Array<Record<string, unknown>>;
  /** tabela → erro a devolver em toda consulta a ela. */
  erroEm?: string;
}

function makeMockSupabaseAdmin(opts: AdminOpts = {}) {
  const rhRows = opts.rhRows ?? [RH_UID, ADMIN_UID].map((id) =>
    linhaRh(id, id === ADMIN_UID ? "administrador" : "recrutador")
  );
  const cand = opts.cand === undefined ? {} : opts.cand;
  const candidato = opts.candidato === undefined ? candidatoReal() : opts.candidato;
  const vaga = opts.vaga === undefined ? { id: VAGA_ID, titulo: VAGA_TITULO } : opts.vaga;
  const tabelas: Record<string, Array<Record<string, unknown>>> = {
    usuarios_rh: rhRows,
    candidaturas: cand === null ? [] : [{
      id: CANDIDATURA_ID,
      candidato_id: CANDIDATO_ID,
      vaga_id: VAGA_ID,
      deleted_at: null,
      is_rascunho: false,
      ...cand,
    }],
    candidatos: candidato === null ? [] : [candidato],
    vagas: vaga === null ? [] : [vaga],
    disponibilidade: opts.disponibilidade ?? DISPONIBILIDADE,
    perguntas_formulario: opts.perguntas ?? PERGUNTAS,
    respostas_formulario: opts.respostas ?? RESPOSTAS,
    pergunta_opcao_metadata: opts.metadata ?? METADATA,
  };
  const reads: Record<string, number> = {};
  const selects: Record<string, string[]> = {};
  return {
    reads,
    selects,
    from(table: string) {
      reads[table] = (reads[table] ?? 0) + 1;
      selects[table] ??= [];
      if (opts.erroEm === table) {
        const erro = { data: null, error: { code: "XX000", message: `valor ${EMAIL_REAL}` } };
        // deno-lint-ignore no-explicit-any
        const q: any = {
          select: () => q,
          eq: () => q,
          is: () => q,
          in: () => q,
          order: () => q,
          limit: () => q,
          maybeSingle: () => Promise.resolve(erro),
          // deno-lint-ignore no-explicit-any
          then: (ok: (v: any) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(erro).then(ok, ko),
        };
        return q;
      }
      return consultaQueFiltra(tabelas[table] ?? [], selects[table]);
    },
  };
}

function makeMockSupabaseUser(user: Record<string, unknown> | null) {
  return {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user }, error: user ? null : new Error("no user") }),
    },
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/functions/v1/ler-cadastro-candidato-rh", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer rh-jwt" },
    body: JSON.stringify(body),
  });
}

/** Espião de console.log/console.error durante `fn`; devolve as chamadas capturadas. */
async function comEspiao<T>(fn: () => Promise<T>) {
  const chamadas: Array<{ nivel: string; args: unknown[] }> = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args: unknown[]) => void chamadas.push({ nivel: "log", args });
  console.error = (...args: unknown[]) => void chamadas.push({ nivel: "error", args });
  try {
    const r = await fn();
    return { r, chamadas };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

async function chamar(opts: AdminOpts = {}, uid: string | null = RH_UID, body: unknown = VALID_BODY) {
  const admin = makeMockSupabaseAdmin(opts);
  const user = uid === null ? null : { id: uid };
  const { r: res, chamadas } = await comEspiao(() =>
    handler(makeRequest(body), { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(user) })
  );
  const texto = await res.text();
  return { res, status: res.status, texto, json: JSON.parse(texto), admin, chamadas };
}

// ---------------------------------------------------------------------------
// Autorização (D-10)
// ---------------------------------------------------------------------------

Deno.test("sem sessão (getUser null) → 401 UNAUTHORIZED, nada lido", async () => {
  const { status, json, admin } = await chamar({}, null);
  assertEquals(status, 401);
  assertEquals(json.error_code, "UNAUTHORIZED");
  assertEquals(admin.reads.candidatos ?? 0, 0);
});

Deno.test("candidato autenticado (sem linha em usuarios_rh) → 403, nenhuma candidatura lida", async () => {
  const { status, json, admin } = await chamar({}, CAND_UID);
  assertEquals(status, 403);
  assertEquals(json.error_code, "FORBIDDEN");
  assertEquals(admin.reads.candidaturas ?? 0, 0);
});

Deno.test("recrutador INATIVO (ativo=false) → 403, nenhuma candidatura lida", async () => {
  const { status, admin } = await chamar({ rhRows: [linhaRh(RH_UID, "recrutador", { ativo: false })] });
  assertEquals(status, 403);
  assertEquals(admin.reads.candidaturas ?? 0, 0);
});

Deno.test("recrutador EXCLUÍDO (deleted_at) → 403, nenhuma candidatura lida", async () => {
  const { status, admin } = await chamar({
    rhRows: [linhaRh(RH_UID, "recrutador", { deleted_at: "2026-10-01T00:00:00Z" })],
  });
  assertEquals(status, 403);
  assertEquals(admin.reads.candidaturas ?? 0, 0);
});

Deno.test("só a linha viva de OUTRO usuário → 403 (o filtro user_id)", async () => {
  const { status, admin } = await chamar({ rhRows: [linhaRh(OTHER_UID, "administrador")] });
  assertEquals(status, 403);
  assertEquals(admin.reads.candidaturas ?? 0, 0);
});

Deno.test("papel desconhecido numa linha viva → 403", async () => {
  const { status } = await chamar({ rhRows: [linhaRh(RH_UID, "estagiario")] });
  assertEquals(status, 403);
});

Deno.test("erro de banco ao ler usuarios_rh → 500 (não um 403 enganoso), log sem a mensagem", async () => {
  const { status, chamadas } = await chamar({ erroEm: "usuarios_rh" });
  assertEquals(status, 500);
  assert(!JSON.stringify(chamadas).includes(EMAIL_REAL), "a message do PostgREST não vai ao log");
});

// ---------------------------------------------------------------------------
// Entrada e candidatura viva
// ---------------------------------------------------------------------------

Deno.test("candidatura_id não-uuid → 400 VALIDATION", async () => {
  const { status, json } = await chamar({}, RH_UID, { candidatura_id: "nao-e-uuid" });
  assertEquals(status, 400);
  assertEquals(json.error_code, "VALIDATION");
});

Deno.test("candidatura_id ausente → 400 VALIDATION", async () => {
  const { status } = await chamar({}, RH_UID, {});
  assertEquals(status, 400);
});

Deno.test("candidatura RASCUNHO → 404, sem contato", async () => {
  const { status, json, texto } = await chamar({ cand: { is_rascunho: true } });
  assertEquals(status, 404);
  assertEquals(json.error_code, "NOT_FOUND");
  assert(!texto.includes(EMAIL_REAL));
});

Deno.test("candidatura EXCLUÍDA (deleted_at) → 404", async () => {
  const { status, json } = await chamar({ cand: { deleted_at: "2026-10-01T00:00:00Z" } });
  assertEquals(status, 404);
  assertEquals(json.error_code, "NOT_FOUND");
});

Deno.test("candidatura AUSENTE → 404 (o mesmo da excluída/rascunho)", async () => {
  const { status, json } = await chamar({ cand: null });
  assertEquals(status, 404);
  assertEquals(json.message, "Candidatura não encontrada.");
});

// ---------------------------------------------------------------------------
// Contato (D-16 refinada pela D-40; JORN-53)
// ---------------------------------------------------------------------------

Deno.test("CONTROLE — rh ativo, contato real → 200 com e-mail e celular", async () => {
  const { status, json } = await chamar();
  assertEquals(status, 200);
  assertEquals(json.ok, true);
  assertEquals(json.vaga_titulo, VAGA_TITULO);
  assertEquals(json.contato, { email: EMAIL_REAL, celular: CELULAR_REAL });
});

Deno.test("administrador → 200 com contato", async () => {
  const { status, json } = await chamar({}, ADMIN_UID);
  assertEquals(status, 200);
  assertEquals(json.contato.email, EMAIL_REAL);
});

Deno.test("tombstone de anonimização → contato === null", async () => {
  const { status, json, texto } = await chamar({
    candidato: {
      id: CANDIDATO_ID,
      user_id: null,
      email: EMAIL_TOMBSTONE,
      celular: "(00) 00000-0000",
      data_nascimento: "1900-01-01",
    },
  });
  assertEquals(status, 200);
  assertEquals(json.contato, null);
  assert(!texto.includes(EMAIL_TOMBSTONE), "nenhum endereço substituto sai da EF");
  assert(!texto.includes("invalido.local"));
});

Deno.test("fictício @invalido.local COM celular gravado → contato === null, nenhum valor no corpo fora de cadastro", async () => {
  const { status, json } = await chamar({
    candidato: candidatoReal({ email: EMAIL_FICTICIO, celular: CELULAR_FICTICIO }),
  });
  assertEquals(status, 200);
  assertEquals(json.contato, null);
  const { cadastro: _cadastro, ...foraDoCadastro } = json;
  const fora = JSON.stringify(foraDoCadastro);
  assert(!fora.includes(CELULAR_FICTICIO), "o celular do fictício não sai como contato");
  assert(!fora.includes(EMAIL_FICTICIO), "o e-mail do fictício não sai fora do cadastro");
  assert(!fora.includes("invalido.local"));
});

Deno.test("fictício com o domínio em MAIÚSCULAS → contato === null", async () => {
  const { json } = await chamar({
    candidato: candidatoReal({ email: "Ficticio.Dois@INVALIDO.LOCAL", celular: CELULAR_FICTICIO }),
  });
  assertEquals(json.contato, null);
});

Deno.test("fictício com espaço no fim do e-mail → contato === null", async () => {
  const { json } = await chamar({
    candidato: candidatoReal({ email: "ficticio.tres@invalido.local  ", celular: CELULAR_FICTICIO }),
  });
  assertEquals(json.contato, null);
});

Deno.test("contato real sem celular → contato com celular null (a regra não inventa nem apaga)", async () => {
  const { json } = await chamar({ candidato: candidatoReal({ celular: null }) });
  assertEquals(json.contato, { email: EMAIL_REAL, celular: null });
});

// ---------------------------------------------------------------------------
// Log redigido (D-11, Pitfall 11)
// ---------------------------------------------------------------------------

Deno.test("log de sucesso: UMA linha com as chaves exatas candidatura_id, rh_user_id, role — sem valor", async () => {
  const { status, chamadas } = await chamar();
  assertEquals(status, 200);
  const logs = chamadas.filter((c) => c.nivel === "log");
  assertEquals(logs.length, 1);
  assertEquals(logs[0].args[0], "[ler-cadastro-candidato-rh] ok");
  const payload = logs[0].args[1] as Record<string, unknown>;
  assertEquals(Object.keys(payload).sort(), ["candidatura_id", "rh_user_id", "role"]);
  assertEquals(payload, { candidatura_id: CANDIDATURA_ID, rh_user_id: RH_UID, role: "rh" });
  const tudo = JSON.stringify(chamadas);
  for (const v of [EMAIL_REAL, CELULAR_REAL, VAGA_TITULO, "1994-03-12"]) {
    assert(!tudo.includes(v), `valor de fixture no log: ${v}`);
  }
});

Deno.test("log de erro: código fixo da etapa, nunca a message do PostgREST", async () => {
  const { status, chamadas } = await chamar({ erroEm: "candidatos" });
  assertEquals(status, 500);
  const erros = chamadas.filter((c) => c.nivel === "error");
  assertEquals(erros.length, 1);
  assertEquals(erros[0].args[0], "[ler-cadastro-candidato-rh] erro");
  const payload = erros[0].args[1] as Record<string, unknown>;
  assertEquals(Object.keys(payload).sort(), ["candidatura_id", "codigo"]);
  assertEquals(payload.codigo, "candidato");
  assert(!JSON.stringify(chamadas).includes(EMAIL_REAL));
  assertEquals(chamadas.filter((c) => c.nivel === "log").length, 0, "falha não escreve a linha de acesso");
});

Deno.test("projeções explícitas: nenhuma leitura com '*'", async () => {
  const { admin } = await chamar();
  for (const [tabela, sels] of Object.entries(admin.selects)) {
    for (const s of sels) assert(!s.includes("*"), `select('*') em ${tabela}`);
  }
});

// ---------------------------------------------------------------------------
// Task 2 — contrato completo: cadastro, disponibilidade, inscrição
// ---------------------------------------------------------------------------

Deno.test("payload completo: as cinco chaves do contrato + ok", async () => {
  const { status, json } = await chamar();
  assertEquals(status, 200);
  assertEquals(Object.keys(json).sort(), [
    "cadastro",
    "contato",
    "disponibilidade",
    "inscricao",
    "ok",
    "vaga_titulo",
  ]);
});

Deno.test("cadastro: os 19 campos do contrato, com os valores da linha", async () => {
  const { json } = await chamar();
  assertEquals(Object.keys(json.cadastro).sort(), [
    "bairro",
    "celular",
    "cep",
    "cidade",
    "como_conheceu",
    "como_conheceu_detalhes",
    "complemento",
    "cpf",
    "data_nascimento",
    "email",
    "estado",
    "genero",
    "instagram",
    "instagram_url",
    "linkedin",
    "linkedin_url",
    "logradouro",
    "nome_completo",
    "numero",
  ]);
  assertEquals(json.cadastro.nome_completo, NOME);
  assertEquals(json.cadastro.cpf, CPF);
  assertEquals(json.cadastro.cep, CEP);
  assertEquals(json.cadastro.email, EMAIL_REAL);
  assertEquals(json.cadastro.celular, CELULAR_REAL);
  assertEquals(json.cadastro.data_nascimento, "1994-03-12");
  assertEquals(json.cadastro.linkedin, null);
  assertEquals(json.cadastro.instagram, "@maria.souza");
});

Deno.test("nenhuma chave interna no JSON: user_id, deleted_at, id do candidato, colunas fora do contrato", async () => {
  const { json, texto } = await chamar();
  const chaves = new Set<string>();
  const andar = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(andar);
    else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        chaves.add(k);
        andar(x);
      }
    }
  };
  andar(json);
  for (const k of ["user_id", "deleted_at", "id", "candidato_id", "ativo", "avatar_url", "faixa_etaria_materializada", "opcao_id", "opcao_texto", "tag", "peso", "opcoes_resposta", "texto_ajuda"]) {
    assert(!chaves.has(k), `chave interna no JSON: ${k}`);
  }
  assert(!texto.includes(CANDIDATO_ID), "o id do candidato não sai");
  assert(!texto.includes(CAND_UID), "o user_id não sai");
});

Deno.test("tombstone → cadastro === null, contato === null, disponibilidade === null", async () => {
  const { status, json, texto } = await chamar({
    candidato: {
      id: CANDIDATO_ID,
      user_id: null,
      nome_completo: "[titular removido]",
      email: EMAIL_TOMBSTONE,
      celular: "(00) 00000-0000",
      data_nascimento: "1900-01-01",
      cidade: "[removido]",
      estado: "XX",
    },
  });
  assertEquals(status, 200);
  assertEquals(json.cadastro, null);
  assertEquals(json.contato, null);
  assertEquals(json.disponibilidade, null);
  for (const v of ["1900-01-01", "[removido]", "[titular removido]", "(00) 00000-0000", "invalido.local"]) {
    assert(!texto.includes(v), `valor-sentinela do tombstone no corpo: ${v}`);
  }
});

Deno.test("e-mail anonimizado+ SEM o resto do predicado (user_id presente) não é tombstone: cadastro sai, email null", async () => {
  const { json } = await chamar({
    candidato: candidatoReal({ email: EMAIL_TOMBSTONE, data_nascimento: "1900-01-01" }),
  });
  assert(json.cadastro !== null);
  assertEquals(json.cadastro.email, null);
  assertEquals(json.contato, null);
});

Deno.test("fictício @invalido.local com celular → cadastro.email === null, celular segue no cadastro (texto, D-40), contato null", async () => {
  const { json, texto } = await chamar({
    candidato: candidatoReal({ email: EMAIL_FICTICIO, celular: CELULAR_FICTICIO }),
  });
  assertEquals(json.contato, null);
  assertEquals(json.cadastro.email, null);
  assertEquals(json.cadastro.celular, CELULAR_FICTICIO);
  assert(!texto.includes(EMAIL_FICTICIO), "nenhum endereço substituto sai");
  assert(!texto.includes("invalido.local"));
});

Deno.test("disponibilidade: os 4 campos da linha mais recente", async () => {
  const { json } = await chamar();
  assertEquals(json.disponibilidade, {
    periodo_disponivel: "Integral",
    regime_trabalho: "Presencial",
    disponibilidade_imediata: true,
    data_disponibilidade: "2026-11-01T00:00:00+00:00",
  });
});

Deno.test("disponibilidade sem linha → null", async () => {
  const { json } = await chamar({ disponibilidade: [] });
  assertEquals(json.disponibilidade, null);
});

Deno.test("inscrição: perguntas DESTA vaga em ordem ASC; removida com resposta presente e marcada; removida sem resposta ausente", async () => {
  const { json } = await chamar();
  const ids = json.inscricao.map((i: { pergunta_id: string }) => i.pergunta_id);
  assertEquals(ids, [P1, P2, P3, P_REMOVIDA_RESP, P4]);
  const ordens = json.inscricao.map((i: { ordem: number }) => i.ordem);
  assertEquals(ordens, [1, 2, 3, 4, 6]);
  const removida = json.inscricao.find((i: { pergunta_id: string }) => i.pergunta_id === P_REMOVIDA_RESP);
  assertEquals(removida.removida, true);
  assertEquals(removida.resposta, { texto: "Resposta antiga" });
  assert(!ids.includes(P_REMOVIDA_SEM), "removida sem resposta não aparece");
  assert(!ids.includes(P_OUTRA_VAGA), "pergunta de outra vaga não aparece");
  for (const i of json.inscricao.filter((x: { pergunta_id: string }) => x.pergunta_id !== P_REMOVIDA_RESP)) {
    assertEquals(i.removida, false);
  }
});

Deno.test("inscrição: forma da resposta — opções, opções+texto, número, sem resposta → null", async () => {
  const { json, texto } = await chamar();
  const porId = Object.fromEntries(
    json.inscricao.map((i: { pergunta_id: string }) => [i.pergunta_id, i]),
  );
  assertEquals(porId[P1].resposta, { opcoes: ["Tenho"] });
  assertEquals(porId[P2].resposta, { opcoes: ["Instagram", "TikTok"], texto: "Kwai" });
  assertEquals(porId[P3].resposta, { numero: 4.5 });
  assertEquals(porId[P4].resposta, null);
  assertEquals(porId[P1].bloco, "jornada");
  assertEquals(porId[P1].tipo_resposta, "single_choice");
  assertEquals(porId[P1].texto_pergunta, "Pergunta 1");
  assert(!texto.includes("Resposta de outra pessoa"), "resposta de outra candidatura não vaza");
});

Deno.test("eliminatória (D-19): eliminatoria true SEM nenhum campo nem texto da opção que elimina", async () => {
  const { json, texto } = await chamar();
  const porId = Object.fromEntries(
    json.inscricao.map((i: { pergunta_id: string }) => [i.pergunta_id, i]),
  );
  assertEquals(porId[P1].eliminatoria, true);
  assertEquals(porId[P2].eliminatoria, false, "tag pontua não é eliminatória");
  assertEquals(porId[P3].eliminatoria, false);
  assertEquals(Object.keys(porId[P1]).sort(), [
    "bloco",
    "eliminatoria",
    "ordem",
    "pergunta_id",
    "removida",
    "resposta",
    "texto_pergunta",
    "tipo_resposta",
  ]);
  assert(!texto.includes(OPCAO_ELIMINA), "o texto da opção eliminatória não sai");
  assert(!texto.includes("knockout"));
});

Deno.test("vaga sem perguntas → inscricao []", async () => {
  const { json } = await chamar({ perguntas: [], respostas: [] });
  assertEquals(json.inscricao, []);
});

Deno.test("leitura de metadata projeta só pergunta_id (nunca opcao_id/opcao_texto)", async () => {
  const { admin } = await chamar();
  assertEquals(admin.selects.pergunta_opcao_metadata, ["pergunta_id"]);
});

Deno.test("log com payload completo: nenhum CPF/CEP/logradouro/nome/resposta em nenhuma chamada", async () => {
  const { status, chamadas } = await chamar();
  assertEquals(status, 200);
  const tudo = JSON.stringify(chamadas);
  for (const v of [CPF, CEP, LOGRADOURO, NOME, EMAIL_REAL, CELULAR_REAL, "Kwai", "Resposta antiga", "Integral"]) {
    assert(!tudo.includes(v), `valor de fixture no log: ${v}`);
  }
  assertEquals(chamadas.length, 1);
});

for (const tabela of ["disponibilidade", "perguntas_formulario", "respostas_formulario", "pergunta_opcao_metadata"]) {
  Deno.test(`erro ao ler ${tabela} → 500 com código fixo, sem a message, sem linha de acesso`, async () => {
    const { status, chamadas, texto } = await chamar({ erroEm: tabela });
    assertEquals(status, 500);
    assert(!JSON.stringify(chamadas).includes(EMAIL_REAL));
    assert(!texto.includes(EMAIL_REAL));
    assertEquals(chamadas.filter((c) => c.nivel === "log").length, 0);
  });
}
