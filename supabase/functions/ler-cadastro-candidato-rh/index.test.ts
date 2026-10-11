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

const VALID_BODY = { candidatura_id: CANDIDATURA_ID };

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
function consultaQueFiltra(linhas: Array<Record<string, unknown>>, selects: string[]): any {
  const preds: Array<(r: Record<string, unknown>) => boolean> = [];
  const filtradas = () => linhas.filter((r) => preds.every((p) => p(r)));
  // deno-lint-ignore no-explicit-any
  const q: any = {
    select: (cols: string) => {
      selects.push(cols);
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
    email: EMAIL_REAL,
    celular: CELULAR_REAL,
    data_nascimento: "1994-03-12",
    ...extra,
  };
}

interface AdminOpts {
  rhRows?: Array<Record<string, unknown>>;
  /** candidaturas row; `null` = nenhuma. Viva salvo indicação. */
  cand?: Record<string, unknown> | null;
  candidato?: Record<string, unknown> | null;
  vaga?: Record<string, unknown> | null;
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
