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

// Mock Supabase admin (service_role): returns the candidatura ownership/etapa row
// for the authz guard and captures every INSERT/UPDATE so the test can assert
// (a) a scores_candidato row is written and (b) candidaturas is NEVER updated.
//
// `candidaturaRow` is what the ownership guard reads for `candidatura_id`:
//   { candidato_id, etapa_atual } | null (null → candidatura not found).
function makeMockSupabaseAdmin(
  candidaturaRow: { candidato_id: string; etapa_atual: string } | null,
) {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const updates: { table: string; row: Record<string, unknown> }[] = [];
  return {
    inserts,
    updates,
    from(table: string) {
      return {
        select: (_cols?: string) => ({
          // candidaturas ownership/etapa read (`.eq(...).maybeSingle()`) — C1 guard
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: candidaturaRow, error: null }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
        update: (row: Record<string, unknown>) => {
          updates.push({ table, row });
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

const OWNER = { id: "cand-1", app_metadata: { role: "candidato" } };
const OTHER = { id: "cand-2", app_metadata: { role: "candidato" } };

const CANDIDATURA_ID = "cand-vaga-1";
const VALID_BODY = {
  candidatura_id: CANDIDATURA_ID,
  teste: "sjt_caso_aberto",
  resposta: "Descreveria a situação ao time e seguiria o protocolo de biossegurança...",
};

// ── C1 (a): authentication — no session → 401 ────────────────────────────────
Deno.test("C1(a) — no session (getUser null) → 401 UNAUTHORIZED, never scores", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
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
Deno.test("C1(b) — authenticated user who does NOT own the candidatura → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  // candidatura is owned by OWNER, but the caller is OTHER.
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
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

// ── C1 (c): authorization — owner but wrong etapa → 403 (back-lock at EF) ─────
Deno.test("C1(c) — owner but etapa_atual !== 'avaliacao_assincrona' → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "triagem" });
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
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
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
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
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

// ── RNF-07a: the EF NEVER writes candidaturas (no auto-reject, no etapa change) ─
Deno.test("RNF-07a — handler NEVER updates the candidaturas table (no auto-reject)", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
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
