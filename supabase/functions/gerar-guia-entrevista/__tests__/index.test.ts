/**
 * Phase 50 / 50-REVIEW-ACESSO-1 WR-05 — teste de HANDLER da autorização de `gerar-guia-entrevista`.
 *
 * Desde a Phase 50 / D-01 a ÚNICA autorização desta EF é a linha VIVA do chamador em
 * `usuarios_rh` (`.eq("user_id", user.id).eq("ativo", true).is("deleted_at", null)`, papel
 * `recrutador→rh` ou `administrador`). Até este arquivo, a EF não tinha teste que reprovasse se
 * um desses predicados sumisse: o `_local/merge-preserve.test.ts` chama o handler, mas o mock
 * dele devolve `{ role: "recrutador" }` para QUALQUER filtro — apagar `.eq("ativo", true)`
 * deixava o token de um recrutador desativado gerar roteiro (IA + gravação) de qualquer
 * candidatura, com todas as suítes verdes.
 *
 * O mock daqui APLICA os predicados `.eq`/`.is`/`.in` que recebe às linhas em memória
 * (`consultaQueFiltra`) — em `usuarios_rh`, `vagas` e `candidaturas`. Cada negativa difere do
 * controle positivo em UM atributo; sem o predicado correspondente na EF, ela deixa de ser 403
 * (provado por mutação no fix round do 50-REVIEW-ACESSO-1).
 *
 * Também fica aqui o cross-check de INTEGRIDADE (D-09): candidatura de outra vaga → 403.
 *
 * SEM rede: Anthropic / OpenAI / Supabase injetados; `zodOutputFormat`/`zodResponseFormat`
 * omitidos (o `callAi` usa o no-op e o mock devolve o `parsed_output` direto).
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/gerar-guia-entrevista/
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type GerarGuiaDeps, handler } from "../index.ts";

const RH_ID = "rh-0000-0000-0000-000000000001";
const VAGA_ID = "vaga-0000-0000-0000-000000000002";
const OUTRA_VAGA_ID = "vaga-0000-0000-0000-000000000009";
const CAND_ID = "cand-0000-0000-0000-000000000003";

const PROMPT_ROW_FIXTURE = {
  id: "pv-fixture",
  semver: "1.0.0",
  system_template: "SYS",
  user_template: "USR",
  model_id: "claude-sonnet-4-6",
  temperature: 0,
  max_tokens: 4000,
  schema_version_required: "1.0.0",
  content_hash: "hash-fixture",
};

// Consulta que APLICA os predicados que recebe (ver o cabeçalho).
// deno-lint-ignore no-explicit-any
function consultaQueFiltra(linhas: Array<Record<string, unknown>>, aoLer?: () => void): any {
  const preds: Array<(r: Record<string, unknown>) => boolean> = [];
  const filtradas = () => {
    aoLer?.();
    return linhas.filter((r) => preds.every((p) => p(r)));
  };
  // deno-lint-ignore no-explicit-any
  const q: any = {
    select: () => q,
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

/** Linha de usuarios_rh; VIVA (ativo, não excluída) salvo o que `extra` disser. */
function linhaRh(user_id: string, role: string, extra: Record<string, unknown> = {}) {
  return { user_id, role, ativo: true, deleted_at: null, ...extra };
}

/** Candidatura VIVA da vaga do pedido, salvo o que `extra` disser. */
function linhaCand(extra: Record<string, unknown> = {}) {
  return { id: CAND_ID, vaga_id: VAGA_ID, candidato_id: "candidato-1", deleted_at: null, is_rascunho: false, ...extra };
}

interface AdminOpts {
  rhRows?: Array<Record<string, unknown>>;
  candRows?: Array<Record<string, unknown>>;
}

function makeMockSupabaseAdmin(opts: AdminOpts = {}) {
  const rhRows = opts.rhRows ?? [linhaRh(RH_ID, "recrutador")];
  const candRows = opts.candRows ?? [linhaCand()];
  const vagaRows = [{
    id: VAGA_ID,
    titulo: "Dentista",
    pesos_avaliacao: {},
    perfil_ideal: "",
    requisitos_habilidades: [],
  }];
  /** Tabelas lidas DEPOIS da autorização (tudo que não é usuarios_rh). */
  const lidas: string[] = [];
  const writes: { table: string; row: Record<string, unknown> }[] = [];

  return {
    lidas,
    writes,
    from(table: string) {
      if (table === "usuarios_rh") return consultaQueFiltra(rhRows);
      if (table === "vagas") return consultaQueFiltra(vagaRows, () => lidas.push(table));
      if (table === "candidaturas") return consultaQueFiltra(candRows, () => lidas.push(table));
      if (table === "scores_candidato") return consultaQueFiltra([], () => lidas.push(table));
      if (table === "prompt_versions") {
        const chain = {
          eq: () => chain,
          maybeSingle: () => Promise.resolve({ data: PROMPT_ROW_FIXTURE, error: null }),
        };
        return { select: (_c?: string) => chain };
      }
      if (table === "entrevista_guias") {
        const q = consultaQueFiltra([], () => lidas.push(table));
        q.upsert = (row: Record<string, unknown>) => {
          writes.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        };
        return q;
      }
      // ai_call_logs (soma do gasto do dia + log da chamada) e o resto (recruiter_alerts…).
      const escrita = {
        select: (_c: string) => ({ single: () => Promise.resolve({ data: { id: "log-1" }, error: null }) }),
        then: (res: (v: { data: null; error: null }) => unknown) => Promise.resolve({ data: null, error: null }).then(res),
      };
      const generico = {
        select: (_c?: string) => generico,
        eq: () => generico,
        gte: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        insert: (row: Record<string, unknown>) => {
          writes.push({ table, row });
          return escrita;
        },
        upsert: (row: Record<string, unknown>) => {
          writes.push({ table, row });
          return escrita;
        },
      };
      return generico;
    },
  };
}

function makeMockAnthropic() {
  const calls: unknown[] = [];
  return {
    calls,
    messages: {
      parse: (params: unknown) => {
        calls.push(params);
        return Promise.resolve({
          parsed_output: { questions: [{ question: "Pergunta gerada pela IA.", competency: "Comunicação" }] },
          model: "claude-sonnet-4-6-20260514",
          usage: { input_tokens: 800, cache_read_input_tokens: 0, output_tokens: 200 },
        });
      },
    },
  };
}

function makeMockOpenAI() {
  return { chat: { completions: { parse: () => Promise.resolve({ choices: [], usage: {} }) } } };
}

function makeRequest(body: Record<string, unknown> = { candidatura_id: CAND_ID, vaga_id: VAGA_ID, tipo: "online" }) {
  return new Request("http://localhost/functions/v1/gerar-guia-entrevista", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer rh-jwt-fixture" },
    body: JSON.stringify(body),
  });
}

async function rodar(opts: AdminOpts = {}, body?: Record<string, unknown>, userId: string | null = RH_ID) {
  const supabaseAdmin = makeMockSupabaseAdmin(opts);
  const anthropic = makeMockAnthropic();
  const deps: GerarGuiaDeps = {
    anthropic,
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser: {
      auth: {
        getUser: () =>
          Promise.resolve(
            userId ? { data: { user: { id: userId } }, error: null } : { data: { user: null }, error: new Error("no user") },
          ),
      },
    },
  };
  const res = await handler(makeRequest(body), deps);
  const guias = supabaseAdmin.writes.filter((w) => w.table === "entrevista_guias");
  return { res, supabaseAdmin, anthropic, guias };
}

// ── Controle positivo ──────────────────────────────────────────────────────────
Deno.test("controle — rh com linha usuarios_rh VIVA → 200, IA chamada, guia gravada", async () => {
  const { res, anthropic, guias } = await rodar();
  assertEquals(res.status, 200);
  assertEquals(anthropic.calls.length, 1);
  assertEquals(guias.length, 1);
});

Deno.test("controle — administrador VIVO → 200", async () => {
  const { res } = await rodar({ rhRows: [linhaRh(RH_ID, "administrador")] });
  assertEquals(res.status, 200);
});

// ── Autenticação ───────────────────────────────────────────────────────────────
Deno.test("sem sessão → 401, nada lido", async () => {
  const { res, supabaseAdmin } = await rodar({}, undefined, null);
  assertEquals(res.status, 401);
  assertEquals(supabaseAdmin.lidas.length, 0);
});

// ── WR-05: o filtro da linha viva É a autorização ──────────────────────────────
Deno.test("sem linha em usuarios_rh (candidato) → 403, nada lido, zero IA, zero gravação", async () => {
  const { res, supabaseAdmin, anthropic, guias } = await rodar({ rhRows: [] });
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error_code, "FORBIDDEN");
  assertEquals(supabaseAdmin.lidas.length, 0);
  assertEquals(anthropic.calls.length, 0);
  assertEquals(guias.length, 0);
});

Deno.test("WR-05 — linha do chamador INATIVA (ativo=false) → 403, nada lido, zero IA, zero gravação", async () => {
  const { res, supabaseAdmin, anthropic, guias } = await rodar({ rhRows: [linhaRh(RH_ID, "recrutador", { ativo: false })] });
  assertEquals(res.status, 403);
  assertEquals(supabaseAdmin.lidas.length, 0);
  assertEquals(anthropic.calls.length, 0);
  assertEquals(guias.length, 0);
});

Deno.test("WR-05 — linha do chamador EXCLUÍDA (deleted_at) → 403, nada lido", async () => {
  const { res, supabaseAdmin, guias } = await rodar({
    rhRows: [linhaRh(RH_ID, "recrutador", { deleted_at: "2026-10-01T00:00:00Z" })],
  });
  assertEquals(res.status, 403);
  assertEquals(supabaseAdmin.lidas.length, 0);
  assertEquals(guias.length, 0);
});

Deno.test("WR-05 — só a linha viva de OUTRO usuário → 403 (o filtro user_id)", async () => {
  const { res, supabaseAdmin, guias } = await rodar({ rhRows: [linhaRh("rh-outro", "administrador")] });
  assertEquals(res.status, 403);
  assertEquals(supabaseAdmin.lidas.length, 0);
  assertEquals(guias.length, 0);
});

Deno.test("papel fora de {recrutador, administrador} (linha viva de visualizador) → 403", async () => {
  const { res, guias } = await rodar({ rhRows: [linhaRh(RH_ID, "visualizador")] });
  assertEquals(res.status, 403);
  assertEquals(guias.length, 0);
});

// ── Integridade (D-09): candidatura de OUTRA vaga → 403 genérico ───────────────
Deno.test("cross-check — candidatura de outra vaga → 403, zero IA, zero gravação", async () => {
  const { res, anthropic, guias } = await rodar({ candRows: [linhaCand({ vaga_id: OUTRA_VAGA_ID })] });
  assertEquals(res.status, 403);
  assertEquals(anthropic.calls.length, 0);
  assertEquals(guias.length, 0);
});
