/**
 * Phase 12 / Plan 12-01 Task 1 — Wave 0 RED scaffold for the candidate-invoked
 * Edge Function `submit-bigfive-final` (AVAL-04 / RF-15 — IPIP-NEO-120 scoring).
 *
 * The candidate (etapa_atual='avaliacao_assincrona') submits ONLY the 120 Likert
 * answers (1-5). The EF re-scores server-side (the reverse/dim/faceta answer-key
 * NEVER leaves the server), persists a `scores_candidato` row tipo='big_five'
 * status='sucesso', and returns the NEUTRAL { ok:true } payload — never a score
 * (RNF-07a). Big Five is CONTEXTUAL: the EF NEVER writes `candidaturas`, never
 * routes to pendente_humano on a trait value (RESEARCH Pitfall 4).
 *
 * ── Authorize, don't just authenticate (lesson C1; mirror avaliar-redacao) ────
 * [[reference_ef_authenticate_vs_authorize]]: service_role bypasses RLS, so the
 * EF MUST verify BEFORE scoring:
 *   (a) there IS a session                                   → else 401
 *   (b) auth.uid() OWNS the candidatura_id (IDOR)            → else 403
 *   (c) etapa_atual === 'avaliacao_assincrona' (back-lock)   → else 403
 *
 * ── NO real API call (Phase-9/10/11 precedent) ───────────────────────────────
 * Supabase MOCKADO via dependency injection (`deps`). Big Five scoring is pure
 * TS math (no LLM) — the score EF needs no Anthropic; the devolutiva EF does.
 *
 * ── Why this is RED now ──
 * `./index.ts` does not exist yet → the dynamic import throws module-not-found.
 * That IS the calibrated RED assertion. It flips GREEN in Plan 12-03 when the EF
 * (copying avaliar-redacao's authorize-then-act skeleton + the 12-02 scorer) lands.
 *
 * Run: deno test --allow-read supabase/functions/submit-bigfive-final/
 *
 * @see supabase/functions/avaliar-redacao/__tests__/index.test.ts (clone target — harness)
 * @see supabase/functions/avaliar-redacao/index.ts:148-324 (authorize-then-act skeleton)
 * @see .planning/phases/12-big-five-devolutiva/12-RESEARCH.md Pattern 1 + Pitfall 4
 * @see .planning/phases/12-big-five-devolutiva/12-01-PLAN.md Task 1
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const OWNER = { id: "cand-1", app_metadata: { role: "candidato" } };
const OTHER = { id: "cand-2", app_metadata: { role: "candidato" } };
const CANDIDATURA_ID = "cand-vaga-1";

// A complete 120-answer Likert body (every item answered 3 — neutral). The EF
// re-scores this server-side; the client never sends a score (.strict, Pitfall 3).
const RESPOSTAS_120: Record<string, number> = {};
for (let id = 1; id <= 120; id++) RESPOSTAS_120[String(id)] = 3;
const VALID_BODY = { candidatura_id: CANDIDATURA_ID, respostas: RESPOSTAS_120 };

// Mock Supabase admin (service_role): returns the candidatura ownership/etapa row
// for the authz guard and captures every INSERT/UPDATE so the test can assert
// (a) a scores_candidato row is written status='sucesso', and (b) candidaturas is
// NEVER written (the contextual / never-reject invariant, RNF-07a).
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
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: candidaturaRow, error: null }),
          }),
        }),
        insert: (insertRow: Record<string, unknown>) => {
          inserts.push({ table, row: insertRow });
          // CR-03: the REAL insert chains `.select("id").single()` (without it,
          // supabase-js v2 returns { data: null } → scoreId null → the devolutiva
          // never resolves). The mock mirrors that chain so the contract gap can't
          // reopen, while still resolving as a bare thenable for any caller that
          // awaits the insert directly (e.g. score-row inserts elsewhere).
          const result = { data: { id: "score-1" }, error: null };
          return {
            select: (_cols?: string) => ({
              single: () => Promise.resolve(result),
            }),
            then: (
              onFulfilled: (v: typeof result) => unknown,
              onRejected?: (e: unknown) => unknown,
            ) => Promise.resolve(result).then(onFulfilled, onRejected),
          };
        },
        update: (updateRow: Record<string, unknown>) => {
          updates.push({ table, row: updateRow });
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
  return mod as {
    handler: (
      req: Request,
      deps: { supabaseAdmin: unknown; supabaseUser: unknown },
    ) => Promise<Response>;
  };
}

function makeRequest(body: unknown, withAuth = true): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (withAuth) headers.Authorization = "Bearer candidato-jwt";
  return new Request("http://localhost/functions/v1/submit-bigfive-final", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// ── C1 (a): authentication — no session → 401, never scores ───────────────────
Deno.test("C1(a) — no session (getUser null) → 401, never writes a score", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(null) };
  const res = await handler(makeRequest(VALID_BODY, false), deps);
  assertEquals(res.status, 401);
  assertEquals(admin.inserts.length, 0, "must not write any score without a session");
});

// ── C1 (b): authorization — authenticated non-owner → 403 (IDOR) ──────────────
Deno.test("C1(b) — authenticated user who does NOT own the candidatura → 403", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OTHER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
  assertEquals(admin.inserts.length, 0, "non-owner must never reach scoring");
});

// ── C1 (c): authorization — owner but wrong etapa → 403 (back-lock at EF) ─────
Deno.test("C1(c) — owner but etapa_atual !== 'avaliacao_assincrona' → 403", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "triagem" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
  assertEquals(admin.inserts.length, 0, "wrong-etapa must never reach scoring");
});

// ── AVAL-04: success → scores_candidato tipo='big_five' status='sucesso' ──────
Deno.test("AVAL-04 — success INSERTs scores_candidato tipo='big_five' status='sucesso'", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  assertEquals(res.status, 200);
  const scoreRow = admin.inserts.find((i) => i.table === "scores_candidato");
  assert(scoreRow, "must INSERT exactly one scores_candidato row");
  assertEquals(scoreRow!.row.tipo, "big_five", "tipo must be big_five");
  assertEquals(scoreRow!.row.status, "sucesso", "Big Five is contextual → always 'sucesso' (Pitfall 4)");
});

// ── RNF-07a / Pitfall 4: NEVER touch candidaturas, never a trait threshold ────
Deno.test("RNF-07a — never writes/updates candidaturas (contextual, never-reject)", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  await handler(makeRequest(VALID_BODY), deps);
  const candWrite =
    admin.inserts.some((i) => i.table === "candidaturas") ||
    admin.updates.some((u) => u.table === "candidaturas");
  assert(!candWrite, "Big Five must NEVER write candidaturas (RNF-07a / Pitfall 4)");
  // no scores row may ever carry pendente_humano from a trait value
  const scoreRow = admin.inserts.find((i) => i.table === "scores_candidato");
  assert(scoreRow!.row.status !== "pendente_humano", "no trait-derived pendente_humano (Pitfall 4)");
});

// ── Anti-tamper / neutral payload: the response carries NO score ──────────────
Deno.test("AVAL-04 — response body is the neutral { ok:true }, never a score (RNF-07a)", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const res = await handler(makeRequest(VALID_BODY), deps);
  const json = await res.json();
  assertEquals(json.ok, true, "neutral ack");
  // the client may receive a devolutiva_id pointer, but NEVER a score/percentil/banda
  const serialized = JSON.stringify(json);
  assert(!/percentil|banda|t_score|"raw"|dimensoes|score/i.test(serialized),
    `the candidate response must carry no score data — got ${serialized}`);
});

// ── Anti-tamper: a body carrying a `score` field is rejected (.strict) ─────────
Deno.test("AVAL-04 — a body with an extra `score` field is rejected 400 (.strict, Pitfall 3)", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const tampered = { ...VALID_BODY, score: 99 };
  const res = await handler(makeRequest(tampered), deps);
  assertEquals(res.status, 400, "a client-sent score must be rejected, never trusted");
  assertEquals(admin.inserts.length, 0, "tampered body must never reach scoring");
});

// ── Validation: an incomplete (119-item) body is rejected 400 ─────────────────
Deno.test("AVAL-04 — an incomplete (<120) responses map is rejected 400", async () => {
  const { handler } = await loadHandler();
  const admin = makeMockSupabaseAdmin({ candidato_id: OWNER.id, etapa_atual: "avaliacao_assincrona" });
  const deps = { supabaseAdmin: admin, supabaseUser: makeMockSupabaseUser(OWNER) };
  const partial: Record<string, number> = { ...RESPOSTAS_120 };
  delete partial["120"]; // 119 answers
  const res = await handler(makeRequest({ candidatura_id: CANDIDATURA_ID, respostas: partial }), deps);
  assertEquals(res.status, 400, "must require all 120 answers");
  assertEquals(admin.inserts.length, 0);
});
