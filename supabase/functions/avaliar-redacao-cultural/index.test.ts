/**
 * Phase 13 / Plan 13-02 Task 3 — deno test for the candidate-invoked Edge Function
 * `avaliar-redacao-cultural` (AVAL-06 / RF-R-10..20 — culture-fit essay scoring).
 *
 * The candidate (etapa_atual='avaliacao_assincrona') submits a culture-fit essay.
 * The EF runs the `culture_fit_essay` prompt over the text via callAi (EssayScoringV1
 * 4-dim BARS), derives the score/color deterministically (computeScoreAndCors), and
 * UPSERTs a redacoes_candidato row. EVERY essay is routed to status_analise=
 * 'pendente_humano' (human review ALWAYS mandatory, regardless of color);
 * bloqueio_avanco is true ONLY when classificacao_cor==='vermelho'. It NEVER writes
 * candidaturas (RNF-07a — no auto-reject, no etapa change by score).
 *
 * ── Authorize, don't just authenticate (lesson C1 — [[reference_ef_authenticate_vs_authorize]]) ──
 * service_role bypasses RLS, so the EF MUST verify, BEFORE scoring:
 *   (a) there IS a session (401 otherwise);
 *   (b) auth.uid() OWNS the candidatura — resolved via candidatos.user_id=auth.uid()
 *       (403 non-owner — IDOR, Pitfall 4);
 *   (c) the owner's candidatura is at etapa_atual='avaliacao_assincrona' (403 otherwise).
 *
 * ── NO real API call happens ── Anthropic/OpenAI/Supabase are MOCKED via dependency
 * injection (`deps`). No `npm:` SDK import at test time, no network.
 *
 * Run: deno test --allow-read supabase/functions/avaliar-redacao-cultural/index.test.ts
 *
 * @see supabase/functions/avaliar-redacao/__tests__/index.test.ts (the mock idiom this clones)
 * @see supabase/functions/avaliar-redacao-cultural/index.ts (handler under test)
 * @see docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md §8.3 (EF pseudocode)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// EssayScoringV1 fixtures — 4 BARS dims. The handler derives score/color via
// computeScoreAndCors: equal weights ×20, then caps + 3-color.
function dim(dimension: "D1" | "D2" | "D3" | "D4", score: number | "insufficient_evidence") {
  return {
    dimension,
    dimension_name: "dimensão",
    cited_evidence: [{ text: "trecho literal", location: "Parágrafo 2" }],
    reasoning: "raciocínio com pelo menos vinte caracteres aqui",
    score,
    level: "proficient" as const,
  };
}

function essay(scores: [number, number, number, number], redFlag = false) {
  return {
    preprocessing_check: {
      word_count: 312,
      detected_writing_style: "formal" as const,
      style_neutralized_in_scoring: true as const,
    },
    dimension_scores: [dim("D1", scores[0]), dim("D2", scores[1]), dim("D3", scores[2]), dim("D4", scores[3])],
    overall_score: 80,
    qualitative_summary:
      "Resumo qualitativo com no mínimo cinquenta caracteres para passar na validação do schema.",
    recommendation: "good_fit" as const,
    red_flag_etico: redFlag,
    bias_audit: {
      formality_did_not_affect_score: true,
      regional_markers_treated_as_neutral: true,
      grammar_errors_did_not_affect_content_score: true,
    },
  };
}

// All-5 → score 100 → verde (default threshold vermelho_max:40, amarelo_max:64).
const ESSAY_VERDE = essay([5, 5, 5, 5]);
// red_flag_etico → cap 30 → vermelho (regardless of dim scores).
const ESSAY_VERMELHO = essay([5, 5, 5, 5], true);

function makeMockAnthropic(parsedOutput: unknown) {
  return {
    messages: {
      parse: () =>
        Promise.resolve({
          parsed_output: parsedOutput,
          usage: { input_tokens: 1200, cache_read_input_tokens: 400, output_tokens: 250 },
          model: "claude-sonnet-4-6",
        }),
    },
  };
}

function makeMockOpenAI() {
  return { chat: { completions: { parse: () => Promise.resolve({ choices: [], usage: {} }) } } };
}

const PERGUNTA_ROW = {
  id: "perg-1",
  codigo: "PADRAO_BS",
  valor_primario: "multi",
  valor_secundario: null,
  texto: "Descreva uma situação real em que você precisou cuidar de uma pessoa...",
};

/**
 * Mock service_role client. Resolves, by table:
 *   - candidaturas  → the ownership/etapa row (allowlist read) | null
 *   - candidatos    → the auth-link row { id } where user_id=auth.uid() | null
 *   - perguntas_redacao → the prompt row
 *   - vagas         → the threshold config row
 *   - redacoes_candidato → anti-plágio hash query (select) + the UPSERT capture
 * Captures every insert/upsert/update so the test can assert the persisted payload
 * and that candidaturas is NEVER written.
 */
function makeMockSupabaseAdmin(opts: {
  candidaturaRow: { id: string; candidato_id: string; vaga_id: string; etapa_atual: string } | null;
  candidatoRow: { id: string } | null;
}) {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const upserts: { table: string; row: Record<string, unknown> }[] = [];
  const updates: { table: string; row: Record<string, unknown> }[] = [];
  // CR-01 — capture the idempotency_key callAi/tryIdempotencyReplay looks up in
  // ai_call_logs so the test can assert it is content-addressed (folds inputHash).
  const idempotencyKeys: string[] = [];

  function chainFor(table: string) {
    // Resolves the row a `.eq(...).maybeSingle()` returns for each table.
    const rowFor = (): unknown => {
      if (table === "candidaturas") return opts.candidaturaRow;
      if (table === "candidatos") return opts.candidatoRow;
      if (table === "perguntas_redacao") return PERGUNTA_ROW;
      if (table === "vagas") return { id: opts.candidaturaRow?.vaga_id ?? "vaga-1", testes_aplicaveis: [] };
      return null;
    };
    const builder = {
      // anti-plágio: .select(...).eq(...).neq(...) → array result.
      // ai_call_logs replay: .select(...).eq("idempotency_key", key).maybeSingle().
      eq: (col?: string, val?: unknown) => {
        if (table === "ai_call_logs" && col === "idempotency_key" && typeof val === "string") {
          idempotencyKeys.push(val);
        }
        return builder;
      },
      neq: () => Promise.resolve({ data: [], error: null, count: 0 }),
      maybeSingle: () => Promise.resolve({ data: rowFor(), error: null }),
      single: () => Promise.resolve({ data: { id: "redacao-1" }, error: null }),
    };
    return builder;
  }

  return {
    inserts,
    upserts,
    updates,
    idempotencyKeys,
    from(table: string) {
      return {
        select: (_cols?: string) => chainFor(table),
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: "redacao-1" }, error: null }) }),
          };
        },
        upsert: (row: Record<string, unknown>) => {
          upserts.push({ table, row });
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: "redacao-1" }, error: null }) }),
          };
        },
        update: (row: Record<string, unknown>) => {
          updates.push({ table, row });
          return { eq: () => Promise.resolve({ data: null, error: null }) };
        },
      };
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

async function loadHandler() {
  const mod = await import("./index.ts");
  return mod as unknown as {
    handler: (req: Request, deps: Record<string, unknown>) => Promise<Response>;
  };
}

function makeRequest(body: unknown, withAuth = true): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) headers.Authorization = "Bearer candidato-jwt";
  return new Request("http://localhost/functions/v1/avaliar-redacao-cultural", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// auth.uid() of the logged-in candidate. The candidatos row links it to candidato_id.
const OWNER_UID = "auth-uid-owner";
const OTHER_UID = "auth-uid-other";
const CANDIDATO_ID = "cand-1";

const CANDIDATURA = {
  id: "candidatura-1",
  candidato_id: CANDIDATO_ID,
  vaga_id: "vaga-1",
  etapa_atual: "avaliacao_assincrona",
};

const VALID_BODY = {
  candidatura_id: "candidatura-1",
  pergunta_id: "perg-1",
  // ~210 words so the server-side word_count revalidation (200-500) passes.
  texto: ("palavra ".repeat(210)).trim(),
};

function baseDeps(parsedOutput: unknown, opts: {
  candidaturaRow?: typeof CANDIDATURA | null;
  candidatoRow?: { id: string } | null;
  user?: Record<string, unknown> | null;
} = {}) {
  const admin = makeMockSupabaseAdmin({
    candidaturaRow: opts.candidaturaRow === undefined ? CANDIDATURA : opts.candidaturaRow,
    candidatoRow: opts.candidatoRow === undefined ? { id: CANDIDATO_ID } : opts.candidatoRow,
  });
  return {
    admin,
    deps: {
      anthropic: makeMockAnthropic(parsedOutput),
      openai: makeMockOpenAI(),
      supabaseAdmin: admin,
      supabaseUser: makeMockSupabaseUser(
        opts.user === undefined ? { id: OWNER_UID, app_metadata: { role: "candidato" } } : opts.user,
      ),
    },
  };
}

function persistedRow(admin: ReturnType<typeof makeMockSupabaseAdmin>): Record<string, unknown> | undefined {
  const all = [...admin.upserts, ...admin.inserts, ...admin.updates].filter(
    (w) => w.table === "redacoes_candidato",
  );
  return all[0]?.row;
}

// ── C1(a): no session → 401, never persists ──────────────────────────────────
Deno.test("C1(a) — no session (getUser null) → 401 UNAUTHORIZED, never persists", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = baseDeps(ESSAY_VERDE, { user: null });
  const res = await handler(makeRequest(VALID_BODY, false), deps);
  assertEquals(res.status, 401);
  assertEquals([...admin.upserts, ...admin.inserts].length, 0, "no session → no write");
});

// ── C1(b): authenticated non-owner → 403 (IDOR) ──────────────────────────────
Deno.test("C1(b) — authenticated user who does NOT own the candidatura → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  // The candidatos row resolved for OTHER_UID has a different id than candidato_id.
  const { admin, deps } = baseDeps(ESSAY_VERDE, {
    user: { id: OTHER_UID, app_metadata: { role: "candidato" } },
    candidatoRow: { id: "cand-2" }, // OTHER's candidate id ≠ candidatura.candidato_id (cand-1)
  });
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error_code, "FORBIDDEN");
  assertEquals([...admin.upserts, ...admin.inserts].length, 0, "non-owner → no write");
});

// ── C1(c): owner but wrong etapa → 403 (back-lock) ───────────────────────────
Deno.test("C1(c) — owner but etapa_atual !== 'avaliacao_assincrona' → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = baseDeps(ESSAY_VERDE, {
    candidaturaRow: { ...CANDIDATURA, etapa_atual: "triagem" },
  });
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  assertEquals((await res.json()).error_code, "FORBIDDEN");
  assertEquals([...admin.upserts, ...admin.inserts].length, 0, "wrong-etapa → no write");
});

// ── body validation: missing field → 400 ─────────────────────────────────────
Deno.test("400 — missing texto → VALIDATION, never persists", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = baseDeps(ESSAY_VERDE);
  const res = await handler(makeRequest({ candidatura_id: "candidatura-1", pergunta_id: "perg-1" }), deps);
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error_code, "VALIDATION");
  assertEquals([...admin.upserts, ...admin.inserts].length, 0, "invalid body → no write");
});

// ── happy path (verde): status ALWAYS pendente_humano, bloqueio=false ─────────
Deno.test("happy verde — status='pendente_humano' ALWAYS + bloqueio_avanco=false", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = baseDeps(ESSAY_VERDE);
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const row = persistedRow(admin);
  assert(row, "must persist a redacoes_candidato row");
  assertEquals(row!.status_analise, "pendente_humano", "verde STILL routes to pendente_humano");
  assertEquals(row!.bloqueio_avanco, false, "verde → bloqueio_avanco=false");
  assertEquals(row!.classificacao_cor, "verde");
});

// ── vermelho: status pendente_humano + bloqueio=true ─────────────────────────
Deno.test("vermelho (red_flag_etico) — bloqueio_avanco=true + status pendente_humano", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = baseDeps(ESSAY_VERMELHO);
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const row = persistedRow(admin);
  assert(row, "must persist a redacoes_candidato row");
  assertEquals(row!.classificacao_cor, "vermelho");
  assertEquals(row!.bloqueio_avanco, true, "vermelho → bloqueio_avanco=true");
  assertEquals(row!.status_analise, "pendente_humano", "vermelho STILL pendente_humano (human review)");
  assertEquals(row!.red_flag_etico, true);
});

// ── RNF-07a: NEVER writes candidaturas ───────────────────────────────────────
Deno.test("RNF-07a — handler NEVER writes the candidaturas table (no auto-reject)", async () => {
  const { handler } = await loadHandler();
  const { admin, deps } = baseDeps(ESSAY_VERDE);
  await handler(makeRequest(VALID_BODY), deps);
  const candidaturaWrites = [...admin.inserts, ...admin.upserts, ...admin.updates].filter(
    (w) => w.table === "candidaturas",
  );
  assertEquals(candidaturaWrites.length, 0, "RNF-07a — candidaturas untouched by scoring");
});

// ── neutral payload: candidate response never carries a score/color ──────────
Deno.test("neutral payload — the candidate HTTP response carries no score/color", async () => {
  const { handler } = await loadHandler();
  const { deps } = baseDeps(ESSAY_VERMELHO);
  const res = await handler(makeRequest(VALID_BODY), deps);
  const json = await res.json();
  assertEquals(json.ok, true);
  assertEquals("score_ponderado_0_100" in json, false, "no score in candidate payload");
  assertEquals("classificacao_cor" in json, false, "no color in candidate payload");
});

// ── CR-01: idempotency key is content-addressed (folds the essay hash) ────────
// An edited re-submit MUST mint a NEW idempotency_key so callAi does a FRESH
// scoring call instead of replaying the FIRST essay's verdict against the new
// text. Two essays with different text → two different keys (same candidatura/
// pergunta prefix); the same text → the same key (true duplicate still de-dupes).
Deno.test("CR-01 — idempotency_key folds the essay hash (edited re-submit re-scores)", async () => {
  const { handler } = await loadHandler();

  const bodyA = { ...VALID_BODY, texto: ("alpha ".repeat(210)).trim() };
  const bodyB = { ...VALID_BODY, texto: ("bravo ".repeat(210)).trim() };

  const { admin, deps } = baseDeps(ESSAY_VERDE);
  await handler(makeRequest(bodyA), deps);
  await handler(makeRequest(bodyB), deps);
  // Same text again → same key as the first call (de-dupe path preserved).
  await handler(makeRequest(bodyA), deps);

  const keys = admin.idempotencyKeys;
  assertEquals(keys.length, 3, "callAi consults ai_call_logs by idempotency_key once per submit");

  const prefix = `${VALID_BODY.candidatura_id}:${VALID_BODY.pergunta_id}:`;
  for (const k of keys) {
    assert(k.startsWith(prefix), `key keeps candidatura/pergunta prefix: ${k}`);
    assert(k.length > prefix.length, `key appends a content hash: ${k}`);
  }
  // Different essay text → different key (no stale replay across an edit).
  assert(keys[0] !== keys[1], "edited essay → distinct idempotency_key");
  // Identical essay text → identical key (true duplicate still de-dupes).
  assertEquals(keys[0], keys[2], "same essay text → same idempotency_key");
});
