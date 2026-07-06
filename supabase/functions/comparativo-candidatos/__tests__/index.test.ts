/**
 * Phase 10 / Plan 10-01 Task 2 — Wave 0 RED scaffold for the RH-invoked
 * Edge Function `comparativo-candidatos` (TRIAGEM-03).
 *
 * Recebe `{ vaga_id, candidatura_ids[] }` de um RH autenticado (two-client D-23,
 * JWT verify ON), valida 2-10 ids + todos da MESMA vaga, roda o prompt
 * `comparative_ranking` (Sonnet, single-eval V1) sobre as análises pré-computadas
 * e INSERTa UMA linha de auditoria em `comparativo_solicitado`
 * (candidatura_ids + ranking + latencia_ms — RF-09).
 *
 * ── NO real API call happens (orchestrator-decision #2) ──
 * Anthropic / OpenAI / Supabase MOCKADOS via dependency injection (`deps`).
 * Sem `npm:` SDK import, sem rede. O handler real deve aceitar deps injetadas.
 *
 * ── Why this is RED now ──
 * `../index.ts` ainda NÃO existe → `import()` dinâmico lança module-not-found.
 * ESSA é a asserção RED calibrada. A implementação chega na Wave 3.
 *
 * Run: deno test --allow-read supabase/functions/comparativo-candidatos/
 *
 * @see supabase/functions/submit-candidatura/index.ts:85-178 (two-client D-23 + IDOR cross-check)
 * @see docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts:139 (ComparativeRanking English keys)
 * @see .planning/phases/10-triagem-rh-com-ia-comparativo-etapa-2/10-01-PLAN.md (Task 2 — TRIAGEM-03)
 */
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ComparativeRanking fixture — ENGLISH keys exactly as 00-shared-zod-schemas.ts:139.
const COMPARATIVE_RANKING_FIXTURE = {
  reasoning:
    "Comparação relativa entre os candidatos ancorada nos score_match estáveis e ordenada por score antes do ranking.",
  ranked_candidates: [
    { candidate_id: "C1", rank: 1, composite_score: 82, relative_strengths: ["forte A"], relative_weaknesses: [], rationale: "Lidera por experiência relevante e fit com o cargo." },
    { candidate_id: "C2", rank: 2, composite_score: 74, relative_strengths: ["forte B"], relative_weaknesses: ["gap C"], rationale: "Segundo por gap de senioridade frente ao C1." },
  ],
  recommendation: { top_choice: "C1", backup_choice: "C2", note: "C1 recomendado." },
  ties_or_concerns: [],
  bias_audit: { counterfactual_check_run: true, score_variance_within_threshold: true },
};

function makeMockAnthropic() {
  return {
    messages: {
      parse: () =>
        Promise.resolve({
          parsed_output: COMPARATIVE_RANKING_FIXTURE,
          usage: { input_tokens: 1500, cache_read_input_tokens: 500, output_tokens: 300 },
        }),
    },
  };
}

function makeMockOpenAI() {
  return { chat: { completions: { parse: () => Promise.resolve({ choices: [], usage: {} }) } } };
}

// Mock Supabase: anon client returns a valid RH user; admin client returns the
// analise rows + the vaga ownership row + captures the comparativo_solicitado INSERT.
//
// `vagaOwner` is the `vagas.created_by` returned for the ownership guard (C1). The
// happy-path RH user (RH_USER.id === 'rh-1') OWNS the vaga by default; an rh who does
// NOT own it is exercised by passing a different vagaOwner.
// AI-01 (23-02): row ativa de prompt_versions que loadPrompt resolve (schema
// '1.0.0' casa SCHEMA_VERSIONS) — o stub silencioso 0.0.0 foi removido do EF.
const PROMPT_ROW_FIXTURE = {
  id: "pv-fixture",
  semver: "1.0.0",
  system_template: "SYS",
  user_template: "USR",
  model_id: "claude-sonnet-4-6",
  temperature: 0,
  max_tokens: 2048,
  schema_version_required: "1.0.0",
  content_hash: "hash-fixture",
};

function makeMockSupabaseAdmin(
  analiseRows: Record<string, unknown>[],
  vagaOwner: string | null = "rh-1",
  // Role row returned for the `usuarios_rh` lookup (role NÃO vem mais de getUser().app_metadata —
  // o hook injeta o role só no JWT; a EF lê de usuarios_rh). null = sem linha RH → role null → 403.
  usuariosRhRole: string | null = "recrutador",
) {
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  return {
    inserts,
    from(table: string) {
      // AI-01 (23-02): loadPrompt FALHA ALTO agora (stub silencioso removido) — o
      // mock responde à query de prompt_versions (3 eq encadeados) com a row ativa.
      if (table === "prompt_versions") {
        const pchain = {
          eq: () => pchain,
          maybeSingle: () => Promise.resolve({ data: PROMPT_ROW_FIXTURE, error: null }),
        };
        return { select: (_cols?: string) => pchain };
      }
      // usuarios_rh role lookup: .select('role').eq('user_id').eq('ativo').is('deleted_at').maybeSingle()
      if (table === "usuarios_rh") {
        const chain = {
          eq: () => chain,
          is: () => chain,
          maybeSingle: () =>
            Promise.resolve({
              data: usuariosRhRole === null ? null : { role: usuariosRhRole },
              error: null,
            }),
        };
        return { select: (_cols?: string) => chain };
      }
      return {
        select: (_cols?: string) => ({
          // analise_candidato_vaga read (`.in(...)`)
          in: () => Promise.resolve({ data: analiseRows, error: null }),
          // vagas ownership read (`.eq(...).maybeSingle()`) — C1 guard
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: vagaOwner === null ? null : { created_by: vagaOwner },
                error: null,
              }),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          return Promise.resolve({ data: null, error: null });
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

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/functions/v1/comparativo-candidatos", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer rh-user-jwt" },
    body: JSON.stringify(body),
  });
}

const RH_USER = { id: "rh-1", app_metadata: { role: "rh" } };
const CANDIDATO_USER = { id: "cand-1", app_metadata: { role: "candidato" } };

function rowsForVaga(vagaId: string, ids: string[]): Record<string, unknown>[] {
  return ids.map((id) => ({
    candidatura_id: id,
    vaga_id: vagaId,
    score_match: 75,
    pontos_fortes: ["x"],
    gaps: ["y"],
    flags: [],
    resumo_cv: "resumo",
  }));
}

// ── C1: authorization (role + ownership) — IDOR/PII guard ───────────────────
Deno.test("C1 — candidato-role caller → 403 FORBIDDEN (never reaches analise data)", async () => {
  const { handler } = await loadHandler();
  const deps = {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    // candidato → no usuarios_rh row → role null → 403 (never reaches analise data).
    supabaseAdmin: makeMockSupabaseAdmin(rowsForVaga("v1", ["c1", "c2"]), "rh-1", null),
    supabaseUser: makeMockSupabaseUser(CANDIDATO_USER),
  };
  const res = await handler(makeRequest({ vaga_id: "v1", candidatura_ids: ["c1", "c2"] }), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
});

Deno.test("C1 — rh who does NOT own the vaga → 403 FORBIDDEN", async () => {
  const { handler } = await loadHandler();
  const deps = {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    // vaga owned by a DIFFERENT rh ('rh-other'), not RH_USER ('rh-1').
    supabaseAdmin: makeMockSupabaseAdmin(rowsForVaga("v1", ["c1", "c2"]), "rh-other"),
    supabaseUser: makeMockSupabaseUser(RH_USER),
  };
  const res = await handler(makeRequest({ vaga_id: "v1", candidatura_ids: ["c1", "c2"] }), deps);
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error_code, "FORBIDDEN");
});

// ── TRIAGEM-03: 2-10 validation ─────────────────────────────────────────────
Deno.test("TRIAGEM-03 — fewer than 2 ids → 400 VALIDATION", async () => {
  const { handler } = await loadHandler();
  const deps = {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    supabaseAdmin: makeMockSupabaseAdmin(rowsForVaga("v1", ["c1"])),
    supabaseUser: makeMockSupabaseUser(RH_USER),
  };
  const res = await handler(makeRequest({ vaga_id: "v1", candidatura_ids: ["c1"] }), deps);
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error_code, "VALIDATION");
});

Deno.test("TRIAGEM-03 — more than 10 ids → 400 VALIDATION", async () => {
  const { handler } = await loadHandler();
  const ids = Array.from({ length: 11 }, (_, i) => `c${i}`);
  const deps = {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    supabaseAdmin: makeMockSupabaseAdmin(rowsForVaga("v1", ids)),
    supabaseUser: makeMockSupabaseUser(RH_USER),
  };
  const res = await handler(makeRequest({ vaga_id: "v1", candidatura_ids: ids }), deps);
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error_code, "VALIDATION");
});

// ── TRIAGEM-03: same-vaga validation (mixed-vaga + length mismatch) ─────────
Deno.test("TRIAGEM-03 — candidatos de vagas diferentes → 400 ('vagas diferentes')", async () => {
  const { handler } = await loadHandler();
  // Two rows spanning two vagas → vagas.size !== 1.
  const mixed = [
    ...rowsForVaga("v1", ["c1"]),
    ...rowsForVaga("v2", ["c2"]),
  ];
  const deps = {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    supabaseAdmin: makeMockSupabaseAdmin(mixed),
    supabaseUser: makeMockSupabaseUser(RH_USER),
  };
  const res = await handler(makeRequest({ vaga_id: "v1", candidatura_ids: ["c1", "c2"] }), deps);
  assertEquals(res.status, 400);
  const json = await res.json();
  // MIXED_VAGA (not VALIDATION) so triagemService.invokeComparativo surfaces the
  // specific pt-BR copy — the two sides were misaligned (frontend checked
  // MIXED_VAGA, EF emitted VALIDATION). Verifier gap 10-VERIFICATION.
  assertEquals(json.error_code, "MIXED_VAGA");
  assert(
    /vagas diferentes/i.test(String(json.message)),
    "message must explain candidatos pertencem a vagas diferentes",
  );
});

Deno.test("TRIAGEM-03 — rows.length !== ids.length → 400 VALIDATION", async () => {
  const { handler } = await loadHandler();
  // Asked for 2 ids but only 1 analise row exists (one not yet analyzed).
  const deps = {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    supabaseAdmin: makeMockSupabaseAdmin(rowsForVaga("v1", ["c1"])),
    supabaseUser: makeMockSupabaseUser(RH_USER),
  };
  const res = await handler(makeRequest({ vaga_id: "v1", candidatura_ids: ["c1", "c2"] }), deps);
  assertEquals(res.status, 400);
});

// ── TRIAGEM-03: happy path returns ranking + writes one audit row ───────────
Deno.test("TRIAGEM-03 — happy path returns { ranking, latencia_ms } and writes one comparativo_solicitado row", async () => {
  const { handler } = await loadHandler();
  const supabaseAdmin = makeMockSupabaseAdmin(rowsForVaga("v1", ["c1", "c2"]));
  const deps = {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser: makeMockSupabaseUser(RH_USER),
  };
  const res = await handler(makeRequest({ vaga_id: "v1", candidatura_ids: ["c1", "c2"] }), deps);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertExists(json.ranking, "response must carry the ranking");
  assertEquals(typeof json.latencia_ms, "number");

  const auditRow = supabaseAdmin.inserts.find((i) => i.table === "comparativo_solicitado");
  assertExists(auditRow, "must INSERT exactly one comparativo_solicitado audit row");
  assertExists(auditRow!.row.candidatura_ids, "audit row must carry candidatura_ids");
  assertExists(auditRow!.row.ranking, "audit row must carry the ranking JSON");
  assertEquals(typeof auditRow!.row.latencia_ms, "number");
  assertEquals(
    supabaseAdmin.inserts.filter((i) => i.table === "comparativo_solicitado").length,
    1,
    "exactly one audit row",
  );
});
