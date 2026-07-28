/**
 * Phase 15 / Plan 15-01 Task 1 — Wave 0 RED golden test for the RH-invoked
 * Edge Function `consolidar-decisao-final` (DECISAO-01).
 *
 * The EF receives `{ candidatura_id, vaga_id }` from an authenticated RH user
 * (two-client D-23, JWT verify ON), AUTHORIZES (role from `usuarios_rh` + vaga
 * ownership via `vagas.created_by`; administrador bypasses), then READ-ONLY
 * AGGREGATES the per-etapa scores into a single weighted consolidated number.
 * It NEVER re-scores (no evaluation-EF / LLM invoke) and NEVER auto-decides
 * (RNF-07a) — the consolidated score is advisory, the RH decides.
 *
 * ── The load-bearing mapping (RESEARCH §Consolidation Aggregation, VERIFIED) ──
 * The 3 weight keys and the score sources do NOT line up 1:1 and the scales differ:
 *   • 'work_sample_sjt'  ← scores_candidato tipo='sjt'          (score/score_max*100)
 *   • 'redacao_cultural' ← scores_candidato tipo='redacao'      (score/25*100)
 *   • 'entrevista'       ← scores_candidato tipo='entrevista'   (N/A unless status='sucesso' — Open Q1)
 *   • 'triagem' (UX-09)  ← analise_candidato_vaga.score_match   (CONTEXT-ONLY — never weighted)
 *   • big_five/cognitivo ← scores_candidato                     (CONTEXT-ONLY, never weighted)
 * PRESENT only when status='sucesso'; else N/A. The EF normalizes each etapa to
 * 0..100, renormalizes weights over PRESENT etapas (effective_weight[k] =
 * weight[k] / Σ(weight[present])), and emits a deterministic templated recommendation.
 *
 * ── NO real API call happens (consolidation makes NO LLM call) ──
 * Supabase MOCKED via dependency injection (`deps`). No `npm:`/esm.sh import at
 * call time, no network. The handler real deve aceitar deps injetadas
 * (precedent: comparativo-candidatos/__tests__/index.test.ts).
 *
 * ── Why this is RED now ──
 * `../index.ts` ainda NÃO existe → `import()` dinâmico lança module-not-found.
 * ESSA é a asserção RED calibrada. A implementação chega na Wave 1.
 *
 * Run: deno test --allow-read supabase/functions/consolidar-decisao-final/
 *
 * @see supabase/functions/comparativo-candidatos/__tests__/index.test.ts (injected-deps analog)
 * @see supabase/functions/avaliar-transcricao-entrevista/index.ts:126-189 (two-client authorize skeleton)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-RESEARCH.md §Consolidation Aggregation
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-01-PLAN.md (Task 1 — DECISAO-01)
 */
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ── Source fixtures: heterogeneous scales, exactly as the live tables carry them ──
// triagem lives in analise_candidato_vaga (0..100 int). The other etapas live in the
// generic scores_candidato (tipo enum sjt/redacao/entrevista/big_five/cognitivo).
const ANALISE_TRIAGEM = {
  candidatura_id: "cand-1",
  vaga_id: "v1",
  score_match: 80, // already 0..100 → normalized 80
  status: "sucesso",
};

// scores_candidato rows. sjt 18/25→72, redacao 20/25→80, entrevista pendente_humano→N/A,
// big_five + cognitivo are CONTEXT-ONLY (no weight, no contribution).
function scoresRows(opts: { entrevistaStatus?: string } = {}): Record<string, unknown>[] {
  return [
    { id: "s-sjt", candidatura_id: "cand-1", tipo: "sjt", subtipo: "mc", score: 18, score_max: 25, status: "sucesso", metadata: {} },
    { id: "s-red", candidatura_id: "cand-1", tipo: "redacao", subtipo: null, score: 20, score_max: 25, status: "sucesso", metadata: {} },
    { id: "s-ent", candidatura_id: "cand-1", tipo: "entrevista", subtipo: null, score: null, score_max: null, status: opts.entrevistaStatus ?? "pendente_humano", metadata: { bars: {} } },
    { id: "s-bf", candidatura_id: "cand-1", tipo: "big_five", subtipo: null, score: null, score_max: null, status: "sucesso", metadata: { dims: {} } },
    { id: "s-cog", candidatura_id: "cand-1", tipo: "cognitivo", subtipo: null, score: null, score_max: null, status: "sucesso", metadata: { banda: "na_media" } },
  ];
}

// pesos_avaliacao: 4 weight keys summing to 100 (Phase 7 publish invariant).
const PESOS = { triagem: 40, work_sample_sjt: 30, redacao_cultural: 20, entrevista: 10 };

// Mock Supabase admin: serves the usuarios_rh role lookup, the vagas ownership row,
// the analise_candidato_vaga read, the scores_candidato read, and the vaga.pesos_avaliacao.
// `vagaOwner` = vagas.created_by for the ownership guard; the happy-path RH user
// (RH_USER.id === 'rh-1') OWNS the vaga by default.
function makeMockSupabaseAdmin(
  scores: Record<string, unknown>[],
  analise: Record<string, unknown> | null = ANALISE_TRIAGEM,
  vagaOwner: string | null = "rh-1",
  usuariosRhRole: string | null = "recrutador",
  pesos: Record<string, number> = PESOS,
) {
  const calledTables: string[] = [];
  return {
    calledTables,
    from(table: string) {
      calledTables.push(table);
      // usuarios_rh role lookup: .select('role').eq().eq().is().maybeSingle()
      if (table === "usuarios_rh") {
        const chain = {
          eq: () => chain,
          is: () => chain,
          maybeSingle: () =>
            Promise.resolve({ data: usuariosRhRole === null ? null : { role: usuariosRhRole }, error: null }),
        };
        return { select: (_cols?: string) => chain };
      }
      // vagas: ownership (created_by) AND pesos_avaliacao — .select(...).eq(...).maybeSingle()
      if (table === "vagas") {
        const chain = {
          eq: () => chain,
          maybeSingle: () =>
            Promise.resolve({
              data: vagaOwner === null ? null : { created_by: vagaOwner, pesos_avaliacao: pesos },
              error: null,
            }),
        };
        return { select: (_cols?: string) => chain };
      }
      // analise_candidato_vaga: .select(...).eq(...).maybeSingle()
      if (table === "analise_candidato_vaga") {
        const chain = {
          eq: () => chain,
          maybeSingle: () => Promise.resolve({ data: analise, error: null }),
        };
        return { select: (_cols?: string) => chain };
      }
      // scores_candidato: .select(...).eq(...)  → array
      if (table === "scores_candidato") {
        const chain = {
          eq: () => Promise.resolve({ data: scores, error: null }),
        };
        return { select: (_cols?: string) => chain };
      }
      // any evaluation-EF write would be a re-score → must NEVER happen.
      return {
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        insert: (_row: Record<string, unknown>) => Promise.resolve({ data: null, error: null }),
      };
    },
    // The consolidation EF must NOT invoke any evaluation EF (no re-score, RNF-07a).
    functions: {
      invoke: (_name: string) => {
        throw new Error("consolidation must NEVER invoke an evaluation EF (re-score forbidden)");
      },
    },
  };
}

function makeMockSupabaseUser(user: Record<string, unknown> | null) {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user }, error: user ? null : new Error("no user") }),
    },
  };
}

async function loadHandler() {
  const mod = await import("../index.ts");
  return mod as {
    handler: (
      req: Request,
      deps: { supabaseAdmin: unknown; supabaseUser: unknown },
    ) => Promise<Response>;
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/functions/v1/consolidar-decisao-final", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer rh-user-jwt" },
    body: JSON.stringify(body),
  });
}

const RH_USER = { id: "rh-1", app_metadata: { role: "rh" } };
const ADMIN_USER = { id: "adm-1", app_metadata: { role: "administrador" } };
const CANDIDATO_USER = { id: "cand-user-1", app_metadata: { role: "candidato" } };
// CI-07 (27-02): the shared ConsolidacaoRequestSchema restored `.uuid()` (the EF had
// loosened it to `z.string()`), so the request body MUST carry real UUIDs. The mock
// `.eq()` stubs ignore the filter value, so the fixture rows' `candidatura_id` labels
// ("cand-1") are unaffected — only this client-submitted body needs valid UUIDs.
const BODY = {
  candidatura_id: "11111111-1111-4111-8111-111111111111",
  vaga_id: "22222222-2222-4222-8222-222222222222",
};

// ── DECISAO-01: heterogeneous-scale normalization + weight renormalization ──────
Deno.test("DECISAO-01 — normalizes heterogeneous scales to 0..100 and weights only PRESENT etapas", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin(scoresRows());
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();

  // breakdown must reference all 6 etapa keys.
  const etapas = (json.breakdown as Array<{ etapa: string }>).map((b) => b.etapa).sort();
  for (const k of ["big_five", "cognitivo", "entrevista", "redacao_cultural", "triagem", "work_sample_sjt"]) {
    assert(etapas.includes(k), `breakdown must include etapa '${k}'`);
  }

  const byEtapa = Object.fromEntries(
    (json.breakdown as Array<Record<string, unknown>>).map((b) => [b.etapa, b]),
  );
  // (a) heterogeneous normalization: sjt 18/25→72; redacao 20/25→80.
  assertEquals(byEtapa["work_sample_sjt"].normalized, 72);
  assertEquals(byEtapa["redacao_cultural"].normalized, 80);
  assertEquals(byEtapa["work_sample_sjt"].status, "present");
  assertEquals(byEtapa["redacao_cultural"].status, "present");

  // UX-09: triagem SAIU das chaves ponderadas → row de CONTEXTO (sem peso). Continua
  // visível carregando score_match (80), mas NÃO pondera no agregado.
  assertEquals(byEtapa["triagem"].status, "context");
  assertEquals(byEtapa["triagem"].normalized, 80);
  assertEquals(byEtapa["triagem"].weight, null);
  assertEquals(byEtapa["triagem"].effective_weight, null);

  // entrevista status='pendente_humano' → N/A (Open Q1: weight ONLY status='sucesso').
  assertEquals(byEtapa["entrevista"].status, "na");
  assertEquals(byEtapa["entrevista"].normalized, null);
  assertEquals(byEtapa["entrevista"].effective_weight, null);

  // (c) big_five + cognitivo → context rows: weight=null, contributing 0.
  assertEquals(byEtapa["big_five"].status, "context");
  assertEquals(byEtapa["big_five"].weight, null);
  assertEquals(byEtapa["big_five"].effective_weight, null);
  assertEquals(byEtapa["cognitivo"].status, "context");
  assertEquals(byEtapa["cognitivo"].weight, null);

  // (b) renormalization over PRESENT weighted etapas (sjt 30 + redacao 20 = 50; triagem
  // NÃO pondera, entrevista 10 dropped). Σ effective_weight of present = 1.0.
  const presentEff = (json.breakdown as Array<Record<string, unknown>>)
    .filter((b) => b.status === "present")
    .map((b) => b.effective_weight as number);
  const sumEff = presentEff.reduce((a, c) => a + c, 0);
  assert(Math.abs(sumEff - 1.0) < 1e-6, `Σ effective_weight of present must be 1.0, got ${sumEff}`);

  // consolidated = 72*(30/50) + 80*(20/50) = 75.2 (triagem/entrevista/context excluded).
  const expected = 72 * (30 / 50) + 80 * (20 / 50);
  assert(
    Math.abs((json.consolidated as number) - expected) < 0.5,
    `consolidated must aggregate present etapas (~${expected.toFixed(2)}), got ${json.consolidated}`,
  );
});

// ── DECISAO-01: missing weighted etapa → effective_weight redistributed over the rest ──
Deno.test("DECISAO-01 — a missing/N-A weighted etapa redistributes its weight; consolidated never blocks", async () => {
  const { handler } = await loadHandler();
  // triagem analise absent (null) → triagem context row carries null; entrevista pendente
  // → N/A; the two present weighted etapas (sjt+redacao) absorb entrevista's weight.
  const supabaseAdmin = makeMockSupabaseAdmin(scoresRows(), null);
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  const byEtapa = Object.fromEntries(
    (json.breakdown as Array<Record<string, unknown>>).map((b) => [b.etapa, b]),
  );
  // UX-09: triagem is a CONTEXT row (never N/A-weighted); with no analise it carries null.
  assertEquals(byEtapa["triagem"].status, "context");
  assertEquals(byEtapa["triagem"].normalized, null);
  assertExists(json.consolidated, "consolidated must still be produced from the present weighted etapas");
  // present etapas sjt(30) + redacao(20) = 50 → effective weights 0.6 / 0.4.
  assert(Math.abs((byEtapa["work_sample_sjt"].effective_weight as number) - 0.6) < 1e-6);
  assert(Math.abs((byEtapa["redacao_cultural"].effective_weight as number) - 0.4) < 1e-6);
});

// ── DECISAO-01: deterministic templated recommendation, NO re-score ─────────────
Deno.test("DECISAO-01 — emits a deterministic templated recommendation and NEVER re-scores", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin(scoresRows());
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  // (d) recommendation is a templated string (advisory) — the RH decides (RNF-07a).
  assertEquals(typeof json.recommendation, "string");
  assert((json.recommendation as string).length > 0, "recommendation must be a non-empty templated string");
  // NO evaluation-EF / re-score path was touched: functions.invoke is never reached
  // (it throws if called); reaching here proves the handler never re-scored.
  assert(
    !supabaseAdmin.calledTables.includes("redacoes_candidato"),
    "consolidation must not re-read source essays to re-score",
  );
});

// ── UX-09: gate ≥2 etapas present + triagem fora dos WEIGHTED_KEYS ───────────────
// Um número consolidado sobre 1 única etapa (ou ponderando triagem, que é pré-triagem
// de CV) engana o RH a decidir cedo. O agregado só aparece com ≥2 etapas ponderadas
// present; triagem é contexto (não pondera). Gate server-authoritative (RNF-07a).

Deno.test("UX-09 — 1 etapa present → consolidated null (gate ≥2 etapas)", async () => {
  const { handler } = await loadHandler();
  // Só o SJT present; redacao ausente, entrevista pendente, triagem ausente (analise null).
  const oneStage = [
    { id: "s-sjt", candidatura_id: "cand-1", tipo: "sjt", subtipo: "mc", score: 18, score_max: 25, status: "sucesso", metadata: {} },
    { id: "s-ent", candidatura_id: "cand-1", tipo: "entrevista", subtipo: null, score: null, score_max: null, status: "pendente_humano", metadata: {} },
  ];
  const supabaseAdmin = makeMockSupabaseAdmin(oneStage, null);
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  const byEtapa = Object.fromEntries(
    (json.breakdown as Array<Record<string, unknown>>).map((b) => [b.etapa, b]),
  );
  // Exatamente 1 etapa ponderada present → agregado SUPRIMIDO (null).
  assertEquals(byEtapa["work_sample_sjt"].status, "present");
  assertEquals(json.consolidated, null);
  // A recomendação usa a mensagem de supressão DISTINTA (não "nenhuma etapa concluída").
  assert(
    (json.recommendation as string).includes("suprimido até ≥2 etapas"),
    `recommendation must carry the distinct suppression message, got: ${json.recommendation}`,
  );
});

Deno.test("UX-09 — 2 etapas present → número consolidado", async () => {
  const { handler } = await loadHandler();
  // sjt + redacao present (entrevista pendente, triagem ausente) → ≥2 → consolidated existe.
  const twoStages = [
    { id: "s-sjt", candidatura_id: "cand-1", tipo: "sjt", subtipo: "mc", score: 18, score_max: 25, status: "sucesso", metadata: {} },
    { id: "s-red", candidatura_id: "cand-1", tipo: "redacao", subtipo: null, score: 20, score_max: 25, status: "sucesso", metadata: {} },
  ];
  const supabaseAdmin = makeMockSupabaseAdmin(twoStages, null);
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertExists(json.consolidated, "consolidated must exist with ≥2 present etapas");
  // 72*(30/50) + 80*(20/50) = 75.2
  const expected = 72 * (30 / 50) + 80 * (20 / 50);
  assert(
    Math.abs((json.consolidated as number) - expected) < 0.5,
    `consolidated ~${expected.toFixed(2)}, got ${json.consolidated}`,
  );
});

Deno.test("UX-09 — triagem-only present → consolidated null (triagem não pondera)", async () => {
  const { handler } = await loadHandler();
  // Análise de triagem bem-sucedida, mas NENHUMA etapa ponderada present → agregado null.
  const supabaseAdmin = makeMockSupabaseAdmin([], ANALISE_TRIAGEM);
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  const byEtapa = Object.fromEntries(
    (json.breakdown as Array<Record<string, unknown>>).map((b) => [b.etapa, b]),
  );
  // triagem visível como CONTEXTO (score_match 80), mas NÃO pondera → consolidated null.
  assertEquals(byEtapa["triagem"].status, "context");
  assertEquals(byEtapa["triagem"].normalized, 80);
  assertEquals(byEtapa["triagem"].weight, null);
  assertEquals(json.consolidated, null);
});

// ── DEC-CONSOLIDA-SJT-01: SJT é uma etapa COMPOSTA (mc + caso_aberto). Um
//    caso_aberto pendente_humano NÃO pode zerar a etapa nem descartar o mc sucesso.
//    Antes a leitura colapsava as duas sub-rows numa só por `tipo` (first-occurrence)
//    → quando o caso_aberto vinha primeiro a etapa inteira virava N/A. ──
Deno.test("DEC-CONSOLIDA-SJT-01 — caso_aberto pendente_humano does NOT N/A SJT; the mc sucesso component counts", async () => {
  const { handler } = await loadHandler();
  // caso_aberto pendente_humano FIRST (winner of the OLD first-occurrence collapse
  // → whole SJT N/A), mc sucesso second. entrevista null so only triagem+sjt weigh.
  const sjtComposite = [
    { id: "s-sjt-open", candidatura_id: "cand-1", tipo: "sjt", subtipo: "caso_aberto", score: 7, score_max: 25, status: "pendente_humano", metadata: {} },
    { id: "s-sjt-mc", candidatura_id: "cand-1", tipo: "sjt", subtipo: "mc", score: 10, score_max: 12, status: "sucesso", metadata: {} },
    { id: "s-ent", candidatura_id: "cand-1", tipo: "entrevista", subtipo: null, score: null, score_max: null, status: "pendente_humano", metadata: {} },
  ];
  const supabaseAdmin = makeMockSupabaseAdmin(sjtComposite, ANALISE_TRIAGEM);
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  const byEtapa = Object.fromEntries(
    (json.breakdown as Array<Record<string, unknown>>).map((b) => [b.etapa, b]),
  );
  // SJT present from the mc sucesso component (10/12*100 = 83.33) — NOT N/A.
  assertEquals(byEtapa["work_sample_sjt"].status, "present");
  assert(
    Math.abs((byEtapa["work_sample_sjt"].normalized as number) - 83.33) < 0.1,
    `SJT must aggregate the sucesso mc component (~83.33), got ${byEtapa["work_sample_sjt"].normalized}`,
  );
});

Deno.test("DEC-CONSOLIDA-SJT-01 — both mc + caso_aberto sucesso sum the components (Σscore/Σmax)", async () => {
  const { handler } = await loadHandler();
  // Once a human confirms the caso_aberto (status='sucesso'), both sub-rows count.
  const sjtBoth = [
    { id: "s-sjt-mc", candidatura_id: "cand-1", tipo: "sjt", subtipo: "mc", score: 10, score_max: 12, status: "sucesso", metadata: {} },
    { id: "s-sjt-open", candidatura_id: "cand-1", tipo: "sjt", subtipo: "caso_aberto", score: 18, score_max: 25, status: "sucesso", metadata: {} },
  ];
  const supabaseAdmin = makeMockSupabaseAdmin(sjtBoth, ANALISE_TRIAGEM);
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  const byEtapa = Object.fromEntries(
    (json.breakdown as Array<Record<string, unknown>>).map((b) => [b.etapa, b]),
  );
  // (10+18)/(12+25)*100 = 28/37*100 = 75.68
  assert(
    Math.abs((byEtapa["work_sample_sjt"].normalized as number) - 75.68) < 0.1,
    `both-sucesso SJT must sum the components (~75.68), got ${byEtapa["work_sample_sjt"].normalized}`,
  );
});

// ── DECISAO-01 authorize (Pitfall 7 — authenticate≠authorize, IDOR/PII guard) ───
Deno.test("authorize — candidato-role caller → 403 FORBIDDEN (never reaches consolidated scores)", async () => {
  const { handler } = await loadHandler();
  // candidato → no usuarios_rh row → role null → 403.
  const supabaseAdmin = makeMockSupabaseAdmin(scoresRows(), ANALISE_TRIAGEM, "rh-1", null);
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(CANDIDATO_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
});

Deno.test("authorize — rh who does NOT own the vaga → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  // vaga owned by a DIFFERENT rh ('rh-other'), not RH_USER ('rh-1').
  const supabaseAdmin = makeMockSupabaseAdmin(scoresRows(), ANALISE_TRIAGEM, "rh-other");
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(RH_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
});

Deno.test("authorize — administrador bypasses vaga ownership → 200", async () => {
  const { handler } = await loadHandler();
  // admin role, vaga owned by someone else — administrador bypasses ownership.
  const supabaseAdmin = makeMockSupabaseAdmin(scoresRows(), ANALISE_TRIAGEM, "rh-other", "administrador");
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(ADMIN_USER) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 200);
});

Deno.test("authorize — unauthenticated (no user) → 401 UNAUTHORIZED", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin(scoresRows());
  const deps = { supabaseAdmin, supabaseUser: makeMockSupabaseUser(null) };
  const res = await handler(makeRequest(BODY), deps);
  assertEquals(res.status, 401);
});

// ── Phase 18 / Plan 18-03 Task 1 — FIX-01 regression (live bug 350e994) ────────
// The composite SJT etapa (work_sample_sjt) carries TWO sub-rows in scores_candidato
// (tipo='sjt'): subtipo='mc' (deterministic, status='sucesso') and subtipo='caso_aberto'
// (BARS-by-IA, status='pendente_humano' until human confirmation). The original bug
// collapsed both sub-rows by `tipo` (first-occurrence in a Map): when the pending
// caso_aberto came first, the WHOLE etapa went N/A and the confirmed MC score was
// discarded. `normalizeSjtComposite` sums ONLY status='sucesso' sub-rows (RNF-07a —
// never weights an unconfirmed IA score) and a pending caso_aberto does NOT zero the
// etapa. These two cases would have caught the original regression.

// Loaded via dynamic import (mirrors `loadHandler`). The exported signature takes the
// full `ScoreRow[]`; the regression only exercises status/score/score_max, so the test
// fixtures are cast `as never` at the call boundary (only the three relevant fields).
async function loadNormalize() {
  const mod = (await import("../index.ts")) as unknown as {
    normalizeSjtComposite: (rows: never) => number | null;
  };
  return mod.normalizeSjtComposite;
}

Deno.test("FIX-01: caso_aberto pendente-único → null (no confirmed sub-row)", async () => {
  const normalizeSjtComposite = await loadNormalize();
  assertEquals(
    normalizeSjtComposite([
      { status: "pendente_humano", score: null, score_max: null },
    ] as never),
    null,
  );
});

Deno.test("FIX-01: MC sucesso preserved when caso_aberto pendente (8/10 → 80, not zeroed)", async () => {
  const normalizeSjtComposite = await loadNormalize();
  assertEquals(
    normalizeSjtComposite([
      { status: "sucesso", score: 8, score_max: 10 },
      { status: "pendente_humano", score: null, score_max: null },
    ] as never),
    80,
  );
});
