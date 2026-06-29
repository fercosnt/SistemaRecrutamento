/**
 * Phase 20 / Plan 20-01 Task 2 — RED-by-design merge-preserve invariant test for the
 * `gerar-guia-entrevista` Edge Function (ENTREV-08, anti-silent-discard).
 *
 * ── WHY THIS IS RED NOW (RED-by-design until 20-04) ──
 * The EF today does a BLIND `.insert()` (index.ts:318) — it does NOT read the current
 * guide, does NOT preserve `origem:'manual'` questions, and does NOT stamp generated
 * questions `origem:'ia'`. So every assertion below FAILS against the current handler.
 * 20-04 changes the EF to read-merge-UPSERT (split current questions by `origem`, keep
 * every manual one, stamp fresh ones `origem:'ia'`, upsert on the UNIQUE arbiter); when
 * that lands, this test flips GREEN. This plan (20-01) only AUTHORS the scaffold — it is
 * NOT run as a gate here (20-RESEARCH §Validation Architecture, Wave 0 gap).
 *
 * The invariant under test (ENTREV-08 — "nenhuma pergunta origem:'manual' some após um
 * regen"):
 *   (1) A successful regen PRESERVES an existing `origem:'manual'` question in the
 *       upserted guide.
 *   (2) A FAILED regen (callAi returns parsed=null → guide=null) does NOT clobber the
 *       manual question with `{ incompleto: true }` — the manual question survives.
 *   (3) Freshly-generated questions are stamped `origem:'ia'`.
 *
 * ── NO real API call / NO socket ──
 * Anthropic / OpenAI / Supabase are MOCKED via the injected `GerarGuiaDeps`. The handler
 * already accepts `handler(req, deps)` (index.ts:137) — this test injects mocks and never
 * constructs a real SDK client. `zodOutputFormat`/`zodResponseFormat` are OMITTED so the
 * real callAi path is exercised against the mock anthropic.
 *
 * Run: deno test --allow-read --allow-env supabase/functions/gerar-guia-entrevista/
 *
 * @see supabase/functions/analise-candidato-individual/__tests__/index.test.ts:35-105 (makeMockSupabase capturing .upsert)
 * @see supabase/functions/gerar-guia-entrevista/index.ts:137 (handler(req, deps)) + :318 (the blind .insert to replace)
 * @see .planning/phases/20-refino-rh-editar-guia-de-entrevista-seed-001/20-RESEARCH.md §Pattern 3 (merge-preserve)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler, type GerarGuiaDeps } from "../index.ts";

// ── A pre-existing guide row carrying ONE manual question (the thing that must survive).
const MANUAL_QUESTION = {
  question: "Conte uma situação em que você liderou sob pressão.",
  pergunta: "Conte uma situação em que você liderou sob pressão.",
  competency: "Liderança",
  dimensao: "Liderança",
  origem: "manual" as const,
};

// ── Mock anthropic: messages.parse returns the injected parsed guide (or null on fail).
//    Mirrors callAi's consumed surface ({ parsed_output, usage }) — same as the analise test.
function makeMockAnthropic(parsed: Record<string, unknown> | null) {
  return {
    messages: {
      parse: () =>
        Promise.resolve({
          parsed_output: parsed,
          usage: { input_tokens: 800, cache_read_input_tokens: 0, output_tokens: 200 },
        }),
    },
  };
}

function makeMockOpenAI() {
  return {
    chat: { completions: { parse: () => Promise.resolve({ choices: [], usage: {} }) } },
  };
}

// ── Mock supabaseAdmin: returns a seeded CURRENT guide row on the entrevista_guias
//    read, the owning vaga + the matching candidatura on their reads, an empty
//    scorecard, and CAPTURES every write (.insert/.upsert) into `writes[]` so the test
//    asserts the persisted guia. `select(...).maybeSingle()` and `select(...).eq(...)`
//    are both supported (the handler uses both shapes).
const OWNER_ID = "rh-owner-0000-0000-0000-000000000001";
const VAGA_ID = "vaga-0000-0000-0000-000000000002";
const CAND_ID = "cand-0000-0000-0000-000000000003";

function makeMockSupabaseAdmin(currentGuia: Record<string, unknown> | null) {
  const writes: { table: string; row: Record<string, unknown>; onConflict?: string }[] = [];

  function rowFor(table: string): Record<string, unknown> | null {
    switch (table) {
      case "usuarios_rh":
        return { role: "recrutador" }; // owner authorizes as rh
      case "vagas":
        return {
          id: VAGA_ID,
          created_by: OWNER_ID,
          titulo: "Dentista",
          pesos_avaliacao: {},
          perfil_ideal: "",
          requisitos_habilidades: [],
        };
      case "candidaturas":
        return { id: CAND_ID, vaga_id: VAGA_ID };
      case "entrevista_guias":
        return currentGuia === null ? null : { guia: currentGuia };
      default:
        return null;
    }
  }

  return {
    writes,
    from(table: string) {
      const builder = {
        _table: table,
        select(_cols?: string) {
          return this;
        },
        eq() {
          return this;
        },
        is() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: rowFor(table), error: null });
        },
        // scores_candidato read: `await select().eq()` (thenable, resolves to rows[]).
        then(resolve: (v: { data: unknown[]; error: null }) => unknown) {
          return resolve({ data: [], error: null });
        },
        insert(row: Record<string, unknown>) {
          writes.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
        upsert(row: Record<string, unknown>, options?: { onConflict?: string }) {
          writes.push({ table, row, onConflict: options?.onConflict });
          return Promise.resolve({ data: null, error: null });
        },
      };
      return builder;
    },
  };
}

const supabaseUser = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: OWNER_ID } }, error: null }),
  },
};

function makeRequest(): Request {
  return new Request("http://localhost/functions/v1/gerar-guia-entrevista", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer rh-jwt-fixture" },
    body: JSON.stringify({ candidatura_id: CAND_ID, vaga_id: VAGA_ID, tipo: "online" }),
  });
}

// Pull the persisted guia (questions/perguntas array) out of the LAST capture.
function persistedQuestions(
  writes: { table: string; row: Record<string, unknown> }[],
): Array<Record<string, unknown>> {
  const guiaWrite = writes.filter((w) => w.table === "entrevista_guias").at(-1);
  assert(guiaWrite, "the EF must persist to entrevista_guias");
  const guia = guiaWrite!.row.guia as Record<string, unknown> | undefined;
  const qs = (guia?.questions ?? guia?.perguntas ?? []) as Array<Record<string, unknown>>;
  return qs;
}

Deno.test("ENTREV-08 [RED until 20-04] — successful regen PRESERVES the origem:'manual' question", async () => {
  const supabaseAdmin = makeMockSupabaseAdmin({ questions: [MANUAL_QUESTION] });
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropic({
      questions: [{ question: "Pergunta gerada pela IA.", competency: "Comunicação" }],
    }),
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 200);

  const qs = persistedQuestions(supabaseAdmin.writes);
  const manual = qs.filter((q) => q.origem === "manual");
  assertEquals(
    manual.length,
    1,
    "a regen must NOT drop the existing origem:'manual' question",
  );
  assertEquals(manual[0].question ?? manual[0].pergunta, MANUAL_QUESTION.question);
});

Deno.test("ENTREV-08 [RED until 20-04] — FAILED regen (guide=null) does NOT clobber the manual question", async () => {
  const supabaseAdmin = makeMockSupabaseAdmin({ questions: [MANUAL_QUESTION] });
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropic(null), // parse fails → result.parsed=null → guide=null
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 200);

  const qs = persistedQuestions(supabaseAdmin.writes);
  const manual = qs.filter((q) => q.origem === "manual");
  assert(
    manual.length === 1,
    "a FAILED regen must preserve the manual question — never wipe it with { incompleto: true }",
  );
});

Deno.test("ENTREV-08 [RED until 20-04] — freshly-generated questions are stamped origem:'ia'", async () => {
  // No current row → only IA questions persist; each must carry origem:'ia'.
  const supabaseAdmin = makeMockSupabaseAdmin(null);
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropic({
      questions: [
        { question: "Pergunta IA 1.", competency: "Comunicação" },
        { question: "Pergunta IA 2.", competency: "Liderança" },
      ],
    }),
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 200);

  const qs = persistedQuestions(supabaseAdmin.writes);
  const ia = qs.filter((q) => q.origem === "ia");
  assertEquals(ia.length, 2, "every freshly-generated question must be stamped origem:'ia'");
});
