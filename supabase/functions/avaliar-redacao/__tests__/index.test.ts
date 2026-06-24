/**
 * Phase 11 / Plan 11-01 Task 1 — Wave 0 RED scaffold for the candidate-invoked
 * Edge Function `avaliar-redacao` (AVAL-03 / RF-14 — SJT open case).
 *
 * The candidate (etapa_atual='avaliacao_assincrona') submits an open-case answer.
 * The EF runs the `work_sample_sjt` prompt (Sonnet) over the answer, maps the
 * per-dimension 1-5 BARS scores to a weighted composite 0-25, persists a
 * `scores_candidato` row (tipo='sjt') and routes `<13/25 OR ≥1 red_flag` to
 * `status='pendente_humano'`. It NEVER changes `candidaturas` (RNF-07a — no
 * auto-reject, no etapa change by score).
 *
 * ── Authorize, don't just authenticate (lesson C1, Phase 10 — D-22) ──────────
 * [[reference_ef_authenticate_vs_authorize]]: a candidate-invoked EF reads/writes
 * via service_role (bypasses RLS), so it MUST verify, BEFORE scoring:
 *   (a) there IS a session (401 otherwise);
 *   (b) auth.uid() OWNS the candidatura_id (403 non-owner — IDOR);
 *   (c) the owner's candidatura is at etapa_atual='avaliacao_assincrona'
 *       (403 wrong-etapa — back-lock at the EF layer).
 * These three authz cases are asserted HERE, before the EF exists.
 *
 * ── NO real API call happens (Phase-9/10 precedent) ──────────────────────────
 * Anthropic / OpenAI / Supabase MOCKADOS via dependency injection (`deps`).
 * Sem `npm:` SDK import, sem rede. O handler real deve aceitar deps injetadas.
 *
 * ── Why this is RED now ──
 * `../index.ts` ainda NÃO existe → `import()` dinâmico lança module-not-found.
 * ESSA é a asserção RED calibrada (smoke-runtime gate). A implementação chega
 * na Wave 2 (Plan 11 EF wave); o PROD apply é a Wave 3 [BLOCKING].
 *
 * Run: deno test --allow-read supabase/functions/avaliar-redacao/
 *
 * @see supabase/functions/comparativo-candidatos/__tests__/index.test.ts (clone target)
 * @see supabase/functions/comparativo-candidatos/index.ts:98-120 (two-client + authz to mirror)
 * @see docs/conhecimento/prompts/templates/07-work-sample-sjt.md (work_sample_sjt prompt)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-01-PLAN.md (Task 1)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// WorkSampleScoring fixture — per-dimension 1-5 BARS scores + citations + red_flags.
// The handler maps these to a weighted composite 0-25 (documented in the EF).
const SCORING_FIXTURE_PASS = {
  dimension_scores: [
    { dimension: "comunicacao_clinica", score: 4, evidence: "Cita a abordagem ao paciente." },
    { dimension: "etica_seguranca", score: 4, evidence: "Reforça consentimento informado." },
    { dimension: "resolucao_problema", score: 4, evidence: "Estrutura um plano de ação." },
    { dimension: "trabalho_equipe", score: 4, evidence: "Envolve a recepção e o time." },
  ],
  red_flags: [],
  reasoning: "Resposta consistente, citando o cenário antes de opinar (Cite Before You Speak).",
};

// A low-scoring fixture (every dimension at 1 → composite well below 13/25).
const SCORING_FIXTURE_LOW = {
  dimension_scores: [
    { dimension: "comunicacao_clinica", score: 1, evidence: "Vago." },
    { dimension: "etica_seguranca", score: 1, evidence: "Sem menção a segurança." },
    { dimension: "resolucao_problema", score: 1, evidence: "Sem plano." },
    { dimension: "trabalho_equipe", score: 1, evidence: "Ignora o time." },
  ],
  red_flags: [],
  reasoning: "Resposta rasa.",
};

// A fixture with a red_flag (composite irrelevant — any red_flag → pendente_humano).
const SCORING_FIXTURE_REDFLAG = {
  dimension_scores: [
    { dimension: "comunicacao_clinica", score: 5, evidence: "Excelente." },
    { dimension: "etica_seguranca", score: 5, evidence: "Forte." },
    { dimension: "resolucao_problema", score: 5, evidence: "Completo." },
    { dimension: "trabalho_equipe", score: 5, evidence: "Colaborativo." },
  ],
  red_flags: ["Sugere ignorar protocolo de biossegurança em uma das frases."],
  reasoning: "Alto desempenho técnico, mas com um sinal de alerta ético.",
};

function makeMockAnthropic(parsedOutput: unknown) {
  return {
    messages: {
      parse: () =>
        Promise.resolve({
          parsed_output: parsedOutput,
          usage: { input_tokens: 1200, cache_read_input_tokens: 400, output_tokens: 250 },
        }),
    },
  };
}

function makeMockOpenAI() {
  return { chat: { completions: { parse: () => Promise.resolve({ choices: [], usage: {} }) } } };
}

// A caso-aberto pergunta row the EF reads by id (`.eq('id', pergunta_id)`): the
// rubric carries dimension weights so the composite is rubric-weighted (C2). The
// dentista rubric (25/20/25/15/15-style) — comunicacao + resolucao weighted 25,
// etica 20, equipe 15 — proves the weighting actually flows into the composite.
const PERGUNTA_CASO_ABERTO = {
  id: "perg-1",
  formato: "caso_aberto",
  cenario: "Um paciente chega ansioso antes de um procedimento. Como você conduz?",
  rubric: {
    dimensoes: [
      { dimension: "comunicacao_clinica", peso: 25 },
      { dimension: "etica_seguranca", peso: 20 },
      { dimension: "resolucao_problema", peso: 25 },
      { dimension: "trabalho_equipe", peso: 15 },
    ],
  },
};

// Mock Supabase admin (service_role): returns the candidatura ownership/etapa row
// for the authz guard, the candidatos row that the authed user owns (resolved by
// user_id), the perguntas row for the by-id case lookup, and captures every
// INSERT/UPDATE so the test can assert (a) a scores_candidato row is written and
// (b) candidaturas is NEVER updated.
//
// The REAL ownership contract (the bug this mock now reflects): candaturas.candidato_id
// is a candidatos.id value, NOT an auth uid. The EF resolves the candidato owned by
// the authed user via `candidatos.select('id').eq('user_id', auth.uid())` and compares
// that candidatos.id against candaturas.candidato_id. So:
//   - `candidaturaRow` is what the ownership guard reads for `candidatura_id`:
//       { candidato_id, etapa_atual } | null (null → candidatura not found).
//       `candidato_id` is a candidatos.id value (NOT the auth uid).
//   - `candidatoOwnerRow` is the candidatos row the authed user owns ({ id } | null):
//       its `id` must equal candidaturaRow.candidato_id for the happy path; a
//       different id (or null) proves a non-owner → 403.
//   - `perguntaRow` is what the by-id case lookup reads (null → 400 invalid pergunta).
function makeMockSupabaseAdmin(
  candidaturaRow: { candidato_id: string; etapa_atual: string } | null,
  perguntaRow: Record<string, unknown> | null = PERGUNTA_CASO_ABERTO,
  candidatoOwnerRow: { id: string } | null = { id: CANDIDATO_ROW_ID },
) {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const updates: { table: string; row: Record<string, unknown> }[] = [];
  return {
    inserts,
    updates,
    from(table: string) {
      // Each table resolves its own `.eq(...).maybeSingle()` row.
      const row = table === "perguntas"
        ? perguntaRow
        : table === "candidatos"
        ? candidatoOwnerRow
        : candidaturaRow;
      return {
        select: (_cols?: string) => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: row, error: null }),
          }),
        }),
        insert: (insertRow: Record<string, unknown>) => {
          inserts.push({ table, row: insertRow });
          return Promise.resolve({ data: null, error: null });
        },
        update: (updateRow: Record<string, unknown>) => {
          updates.push({ table, row: updateRow });
          return {
            eq: () => Promise.resolve({ data: null, error: null }),
          };
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

async function loadHandler() {
  const mod = await import("../index.ts");
  return mod as {
    handler: (
      req: Request,
      deps: {
        anthropic: unknown;
        openai: unknown;
        supabaseAdmin: unknown;
        supabaseUser: unknown;
      },
    ) => Promise<Response>;
  };
}

function makeRequest(body: unknown, withAuth = true): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) headers.Authorization = "Bearer candidato-jwt";
  return new Request("http://localhost/functions/v1/avaliar-redacao", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// `OWNER.id` / `OTHER.id` are AUTH user ids (auth.users.id — the JWT's user.id).
// They are DISTINCT from candidatos.id: the EF resolves the candidato owned by the
// authed user via candidatos.user_id=auth.uid() and compares the resolved
// candidatos.id against candaturas.candidato_id (= CANDIDATO_ROW_ID for the owner).
const OWNER = { id: "auth-uid-1", app_metadata: { role: "candidato" } };
const OTHER = { id: "auth-uid-2", app_metadata: { role: "candidato" } };

const CANDIDATURA_ID = "cand-vaga-1";
const PERGUNTA_ID = "perg-1";
// candaturas.candidato_id is a candidatos.id value — NOT an auth uid (they differ
// in PROD; comparing candidato_id directly against user.id is the bug this fixes).
const CANDIDATO_ROW_ID = "candidato-row-1";
const VALID_BODY = {
  candidatura_id: CANDIDATURA_ID,
  pergunta_id: PERGUNTA_ID,
  texto: "Descreveria a situação ao time e seguiria o protocolo de biossegurança...",
};

// ── C1 (a): authentication — no session → 401 ────────────────────────────────
Deno.test("C1(a) — no session (getUser null) → 401 UNAUTHORIZED, never scores", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" });
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_PASS),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(null),
  };
  const res = await handler(makeRequest(VALID_BODY, false), deps);
  assertEquals(res.status, 401);
  assertEquals(admin.inserts.length, 0, "must not write any score without a session");
});

// ── C1 (b): authorization — authenticated non-owner → 403 ─────────────────────
// The candidatura is owned by candidatos.id=CANDIDATO_ROW_ID, but the authed user
// (OTHER) resolves via candidatos.user_id to a DIFFERENT candidatos row
// (id="candidato-row-2") → its id ≠ candidato_id → 403. This proves the resolved
// candidatos.id ownership check (not the old broken candidato_id===user.id equality).
Deno.test("C1(b) — authenticated user who does NOT own the candidatura → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin(
    { candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" },
    PERGUNTA_CASO_ABERTO,
    { id: "candidato-row-2" }, // OTHER resolves to a different candidato → not the owner
  );
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_PASS),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OTHER),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
  assertEquals(admin.inserts.length, 0, "non-owner must never reach scoring");
});

// ── C1 (b'): authorization — authed user has NO candidatos row → 403 ──────────
// If candidatos.user_id=auth.uid() resolves to no row at all, ownership cannot be
// proven → 403. Guards against a NULL candidatoOwnerRow short-circuiting to allow.
Deno.test("C1(b') — authed user with no candidatos row (user_id unmatched) → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin(
    { candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" },
    PERGUNTA_CASO_ABERTO,
    null, // candidatos lookup by user_id returns nothing
  );
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_PASS),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
  assertEquals(admin.inserts.length, 0, "unresolved candidato must never reach scoring");
});

// ── C1 (c): authorization — owner but wrong etapa → 403 (back-lock at EF) ─────
Deno.test("C1(c) — owner but etapa_atual !== 'avaliacao_assincrona' → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: CANDIDATO_ROW_ID, etapa_atual: "triagem" });
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_PASS),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
  assertEquals(admin.inserts.length, 0, "wrong-etapa must never reach scoring");
});

// ── AVAL-03: composite mapping + threshold routing → pendente_humano ──────────
Deno.test("AVAL-03 — low composite (<13/25) routes to status='pendente_humano'", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" });
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_LOW),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const scoreRow = admin.inserts.find((i) => i.table === "scores_candidato");
  assert(scoreRow, "must INSERT one scores_candidato row");
  assertEquals(scoreRow!.row.status, "pendente_humano", "<13/25 → pendente_humano");
});

Deno.test("AVAL-03 — any red_flag routes to status='pendente_humano' regardless of composite", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" });
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_REDFLAG),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const scoreRow = admin.inserts.find((i) => i.table === "scores_candidato");
  assert(scoreRow, "must INSERT one scores_candidato row");
  assertEquals(scoreRow!.row.status, "pendente_humano", "≥1 red_flag → pendente_humano");
});

// ── C1/C2: missing or non-caso_aberto pergunta → 400 (no silent fall-through) ─
Deno.test("C2 — missing pergunta (by id) → 400 VALIDATION, never scores", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin(
    { candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" },
    null, // perguntas lookup returns no row
  );
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_PASS),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error_code, "VALIDATION");
  assertEquals(admin.inserts.length, 0, "missing pergunta must never reach scoring");
});

Deno.test("C2 — pergunta with formato !== 'caso_aberto' → 400 VALIDATION", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin(
    { candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" },
    { ...PERGUNTA_CASO_ABERTO, formato: "multipla_escolha" },
  );
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_PASS),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 400);
  assertEquals(admin.inserts.length, 0, "non-caso_aberto must never reach scoring");
});

// ── C2: the composite is rubric-weighted (NOT a uniform average) ──────────────
// dims: comunicacao=5(peso25) etica=2(peso20) resolucao=5(peso25) equipe=2(peso15).
// weighted mean = (5*25 + 2*20 + 5*25 + 2*15) / (25+20+25+15)
//               = (125 + 40 + 125 + 30) / 85 = 320/85 ≈ 3.7647 → /5*25 ≈ 18.82.
// A UNIFORM (unweighted) mean would be (5+2+5+2)/4 = 3.5 → /5*25 = 17.5.
// Asserting the composite is the rubric-weighted value (≈18.82, NOT 17.5) proves
// the rubric weights actually flow into the composite (the C2 regression).
Deno.test("C2 — composite uses the pergunta rubric weights (not a uniform average)", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    candidato_id: CANDIDATO_ROW_ID,
    etapa_atual: "avaliacao_assincrona",
  });
  const fixture = {
    dimension_scores: [
      { dimension: "comunicacao_clinica", score: 5, evidence: "Forte." },
      { dimension: "etica_seguranca", score: 2, evidence: "Fraca." },
      { dimension: "resolucao_problema", score: 5, evidence: "Forte." },
      { dimension: "trabalho_equipe", score: 2, evidence: "Fraca." },
    ],
    red_flags: [],
    reasoning: "Desempenho desigual entre dimensões.",
  };
  const deps = {
    anthropic: makeMockAnthropic(fixture),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const scoreRow = admin.inserts.find((i) => i.table === "scores_candidato");
  assert(scoreRow, "must INSERT one scores_candidato row");
  // Rubric-weighted ≈ 18.82 (rounded to 2 decimals by the EF), NOT 17.5 uniform.
  assertEquals(scoreRow!.row.score, 18.82, "composite must be the rubric-weighted value");
  assertEquals(scoreRow!.row.status, "sucesso", "≥13/25, no red_flag → sucesso");
});

// ── RNF-07a: the EF NEVER writes candidaturas (no auto-reject, no etapa change) ─
Deno.test("RNF-07a — handler NEVER updates the candidaturas table (no auto-reject)", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: CANDIDATO_ROW_ID, etapa_atual: "avaliacao_assincrona" });
  const deps = {
    anthropic: makeMockAnthropic(SCORING_FIXTURE_PASS),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(OWNER),
  };
  await handler(makeRequest(VALID_BODY), deps);
  const candidaturaWrites = [...admin.inserts, ...admin.updates].filter(
    (w) => w.table === "candidaturas",
  );
  assertEquals(candidaturaWrites.length, 0, "RNF-07a — candidaturas must be untouched by scoring");
});
