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
 * ── TAMBÉM cobre, desde a Phase 49 / Plano 49-24 (JORN-28 / D-28) ──
 * A PROVENIÊNCIA do roteiro: `entrevista_guias.provedor_ia` / `.modelo_ia` no objeto do
 * upsert. Mora aqui porque o ativo é o mesmo — `makeMockSupabaseAdmin` captura cada
 * escrita em `writes[]`, e é sobre esse objeto que as duas famílias de asserção falam.
 * Ver o cabeçalho da seção «Phase 49 / Plano 49-24» no fim do arquivo.
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

// ── Phase 49 / D-28: o modelo que DE FATO responde é a versão DATADA, e ela DIVERGE do
//    alias configurado em `prompt_versions.model_id` (`PROMPT_ROW_FIXTURE.model_id` abaixo).
//    É essa divergência que faz `modelo_ia` valer algo: gravar o configurado seria repetir
//    a configuração e chamá-la de medição. Os testes de proveniência asseguram a distinção
//    EXPLICITAMENTE, para que um dia em que alias e snapshot coincidam não faça o teste
//    passar por acaso.
const MODELO_REAL_DATADO = "claude-sonnet-4-6-20260514";

// ── Mock anthropic: messages.parse returns the injected parsed guide (or null on fail).
//    Mirrors callAi's consumed surface ({ parsed_output, usage, model }) — same as the
//    analise test. `model` é lido por `callAi` (`ai-client.ts:935`) como a proveniência
//    real (D-28); antes do 49-24 nenhum teste desta EF o exercitava.
function makeMockAnthropic(
  parsed: Record<string, unknown> | null,
  model: string | undefined = MODELO_REAL_DATADO,
) {
  return {
    messages: {
      parse: () =>
        Promise.resolve({
          parsed_output: parsed,
          model,
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

// ── Phase 49 / D-28: o fallback OpenAI é o motivo de o requisito existir. Medido pelo
//    49-02: 17 fallbacks em PROD, e a tabela de resultado registrava o Sonnet
//    CONFIGURADO — um roteiro escrito pelo `gpt-4o-mini` era indistinguível de um do
//    Sonnet. Este mock responde no formato que `runOpenAIFallback` consome
//    (`choices[0].message.parsed`, `usage.prompt_tokens/completion_tokens`, `model`).
const MODELO_FALLBACK_DATADO = "gpt-4o-mini-2024-07-18";

function makeMockOpenAIQueResponde(
  parsed: Record<string, unknown> | null,
  model: string = MODELO_FALLBACK_DATADO,
) {
  return {
    chat: {
      completions: {
        parse: () =>
          Promise.resolve({
            choices: [{ message: { parsed } }],
            usage: { prompt_tokens: 900, completion_tokens: 300 },
            model,
          }),
      },
    },
  };
}

// Anthropic que FALHA (timeout) → `callAi` cai no fallback OpenAI. Com `timeoutMs`
// 110 s da EF e `AI_TOTAL_BUDGET_MS` 140 s, `effectiveMaxAttempts` = 1: uma tentativa,
// sem backoff, sem sleep no teste.
function makeMockAnthropicQueFalha() {
  return {
    messages: {
      parse: () => Promise.reject(new Error("Request timed out.")),
    },
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

// AI-01 (23-02): row ativa de prompt_versions que loadPrompt resolve (schema
// '1.0.0' casa SCHEMA_VERSIONS) — o stub silencioso 0.0.0 foi removido do EF.
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

function makeMockSupabaseAdmin(
  currentGuia: Record<string, unknown> | null,
  // WR-04: when set, the entrevista_guias upsert resolves with this error so the test
  // can assert the EF surfaces a failed persist instead of returning a fabricated ok.
  upsertError: { message: string } | null = null,
  // Phase 49 / D-28: gasto do dia em `ai_call_logs` para a vaga. Quando `> 0`, o
  // kill-switch de custo de `callAi` (`isDailyCostCapExceeded`, teto default US$ 50)
  // corta a chamada ANTES de tocar qualquer provedor e devolve `provider: "none"`.
  // É o único caminho `none` ALCANÇÁVEL nesta EF: `rawInput` aqui é montado pela
  // própria função (sem texto do usuário), então a detecção de injeção nunca dispara.
  //
  // Phase 49 / 49-25: um ARRAY dá um valor POR LEITURA da soma do dia — uma leitura por
  // chamada de `callAi`. `[0, 999]` é o caso «a 1ª passada roda e o RE-PROMPT é barrado»,
  // que não é expressável com um número só e é justamente onde um bloqueio podia APAGAR
  // o roteiro que a 1ª passada já tinha escrito.
  custoDiarioUsd: number | number[] = 0,
  // Phase 49 / 49-25: linhas de `scores_candidato`. Sem elas `weakDims` é `[]` e a
  // cobertura é trivialmente satisfeita — o re-prompt do passo 7 NUNCA acontece, e com
  // ele o caminho em que a 2ª passada é a barrada.
  scoreRows: Array<Record<string, unknown>> = [],
) {
  const writes: { table: string; row: Record<string, unknown>; onConflict?: string }[] = [];
  // Quantas vezes a soma do gasto do dia já foi lida (uma por `callAi`). Vive no closure
  // porque o builder é reconstruído a cada `from()`.
  let leiturasDeCusto = 0;

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
      // AI-01 (23-02): loadPrompt FALHA ALTO agora (stub silencioso removido) — o
      // mock responde à query de prompt_versions com a row ativa válida.
      case "prompt_versions":
        return PROMPT_ROW_FIXTURE;
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
        // D-28: `isDailyCostCapExceeded` encadeia `.select("cost_usd").eq().gte()`. Sem
        // este método o encadeamento lançava e o helper caía no fail-open — o caminho
        // `provider: "none"` era INALCANÇÁVEL por mock, não por construção.
        gte() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: rowFor(table), error: null });
        },
        // scores_candidato read: `await select().eq()` (thenable, resolves to rows[]).
        // `ai_call_logs`: a soma do gasto do dia (D-28) — vazia por default.
        then(resolve: (v: { data: unknown[]; error: null }) => unknown) {
          let rows: unknown[] = [];
          if (table === "ai_call_logs") {
            const usd = Array.isArray(custoDiarioUsd)
              ? (custoDiarioUsd[leiturasDeCusto++] ?? 0)
              : custoDiarioUsd;
            rows = usd > 0 ? [{ cost_usd: usd }] : [];
          } else if (table === "scores_candidato") {
            rows = scoreRows;
          }
          return resolve({ data: rows, error: null });
        },
        insert(row: Record<string, unknown>) {
          writes.push({ table, row });
          return Promise.resolve({ data: null, error: null });
        },
        upsert(row: Record<string, unknown>, options?: { onConflict?: string }) {
          writes.push({ table, row, onConflict: options?.onConflict });
          // WR-04: the entrevista_guias upsert can fail; surface the injected error so
          // the handler's error check is exercised. Other tables resolve clean.
          const error = table === "entrevista_guias" ? upsertError : null;
          return Promise.resolve({ data: null, error });
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

// Pull the LAST row upserted into entrevista_guias (Phase 49 / D-28: os testes de
// proveniência asseveram sobre o OBJETO DO UPSERT, não sobre as perguntas).
function persistedGuiaRow(
  writes: { table: string; row: Record<string, unknown> }[],
): Record<string, unknown> {
  const guiaWrite = writes.filter((w) => w.table === "entrevista_guias").at(-1);
  assert(guiaWrite, "the EF must persist to entrevista_guias");
  return guiaWrite!.row;
}

// Pull the persisted guia (questions/perguntas array) out of the LAST capture.
function persistedQuestions(
  writes: { table: string; row: Record<string, unknown> }[],
): Array<Record<string, unknown>> {
  const guia = persistedGuiaRow(writes).guia as Record<string, unknown> | undefined;
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

Deno.test("WR-04 — a FAILED upsert returns a non-200 error_code, NOT a fabricated { ok: true }", async () => {
  // The entrevista_guias upsert fails (constraint/transient). The EF must NOT report
  // success — a swallowed write error would have the client read back the stale guide.
  const supabaseAdmin = makeMockSupabaseAdmin(
    { questions: [MANUAL_QUESTION] },
    { message: "duplicate key value violates unique constraint" },
  );
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropic({
      questions: [{ question: "Pergunta gerada pela IA.", competency: "Comunicação" }],
    }),
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 500, "a failed persist must surface as a non-200");
  const body = (await res.json()) as { ok?: boolean; error_code?: string };
  assertEquals(body.ok, false, "a failed persist must NOT report { ok: true }");
  assertEquals(body.error_code, "SERVER_ERROR");
});

// ═══════════════════════════════════════════════════════════════════════════════════
// Phase 49 / Plano 49-24 — JORN-28 / D-28: o guia diz QUAL MODELO o escreveu
//
// Por que aqui e não num arquivo novo: o ativo destes testes é o `makeMockSupabaseAdmin`
// acima, que CAPTURA o objeto do upsert em `writes[]`. Duplicá-lo criaria uma segunda
// fonte de verdade para a superfície mockada do handler — a próxima mudança de contrato
// consertaria uma cópia e deixaria a outra verde. `persistedGuiaRow` é o acessório que
// faltava, e passou a servir os dois grupos.
// ═══════════════════════════════════════════════════════════════════════════════════

Deno.test("49-24 / D-28 — o upsert grava o modelo que DE FATO respondeu, não o configurado", async () => {
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

  const row = persistedGuiaRow(supabaseAdmin.writes);
  assertEquals(row.provedor_ia, "anthropic", "o provedor REAL vai para a coluna");
  assertEquals(
    row.modelo_ia,
    MODELO_REAL_DATADO,
    "modelo_ia tem de ser `response.model` (a versão datada que respondeu)",
  );
  // O ponto do requisito: o campo mede o que RESPONDEU, não o que está configurado.
  // Se esta asserção começar a falhar porque os dois coincidem, o teste perdeu a
  // capacidade de distinguir e a fixture precisa mudar — não a asserção.
  assert(
    row.modelo_ia !== PROMPT_ROW_FIXTURE.model_id,
    "modelo_ia NÃO pode ser o alias configurado em prompt_versions.model_id",
  );
  // O `prompt_version` continua sendo gravado: proveniência ACRESCENTA, não substitui.
  assertEquals(row.prompt_version, PROMPT_ROW_FIXTURE.semver);
});

Deno.test("49-24 / D-28 — guia INCOMPLETO (parse falho) também leva proveniência", async () => {
  // `parsed_output: null` → `guide == null` → persiste `{ incompleto: true, … }`. Um
  // modelo RESPONDEU (a resposta é que não era aproveitável), então a proveniência é
  // conhecida e é dele que veio o conteúdo da linha. Deixar NULL aqui faria a linha
  // mentir por omissão — e, pior, ficaria indistinguível dos 5 guias antigos.
  const supabaseAdmin = makeMockSupabaseAdmin({ questions: [MANUAL_QUESTION] });
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropic(null),
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 200);

  const row = persistedGuiaRow(supabaseAdmin.writes);
  const guia = row.guia as Record<string, unknown>;
  assertEquals(guia.incompleto, true, "a fixture tem de exercitar o caminho incompleto");
  assertEquals(row.provedor_ia, "anthropic");
  assertEquals(row.modelo_ia, MODELO_REAL_DATADO);
});

Deno.test("49-24 / D-28 — nenhum provedor chamado (teto de custo) ⇒ os DOIS campos NULL", async () => {
  // Gasto do dia acima do teto default (US$ 50) → `callAi` corta ANTES de tocar provedor
  // e devolve `provider: "none"`, `model: null`. O CHECK vivo da tabela aceita só
  // `anthropic|openai|NULL`: gravar a string "none" violaria o CHECK e transformaria uma
  // chamada barrada por gasto num 500 de persistência.
  const supabaseAdmin = makeMockSupabaseAdmin({ questions: [MANUAL_QUESTION] }, null, 999);
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropic({
      questions: [{ question: "Esta resposta NÃO deve existir.", competency: "Comunicação" }],
    }),
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 200);

  const row = persistedGuiaRow(supabaseAdmin.writes);
  assertEquals(row.provedor_ia, null, "`none` não é provedor — NULL é a verdade (D-30)");
  assertEquals(row.modelo_ia, null, "nenhum modelo respondeu");
  // A forma exata que o CHECK recusaria, asserida por nome: se alguém gravar o provider
  // cru, este teste reprova aqui e não em PROD com um 23514.
  assert(row.provedor_ia !== "none", "a string 'none' NUNCA vai para a coluna");
});

Deno.test("49-24 / D-28 — FALLBACK OpenAI: o guia registra o gpt-4o-mini, não o Sonnet configurado", async () => {
  // ⚠ ESTE é o caso que o requisito existe para resolver, e era o único caminho REAL sem
  // vigilância nenhuma nesta EF (descoberto pela prova de mordida — ver §M5 do SUMMARY).
  // Os 17 fallbacks medidos em PROD pelo 49-02 gravavam o Sonnet configurado: um roteiro
  // escrito pelo `gpt-4o-mini` era indistinguível de um escrito pelo Sonnet, e o RH
  // conduz a entrevista por ele.
  const supabaseAdmin = makeMockSupabaseAdmin({ questions: [MANUAL_QUESTION] });
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropicQueFalha(),
    openai: makeMockOpenAIQueResponde({
      questions: [{ question: "Pergunta gerada pelo fallback.", competency: "Comunicação" }],
    }),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 200);

  const row = persistedGuiaRow(supabaseAdmin.writes);
  assertEquals(row.provedor_ia, "openai", "quem respondeu foi a OpenAI — e é o que se grava");
  assertEquals(row.modelo_ia, MODELO_FALLBACK_DATADO, "o modelo REAL do fallback");
  // As duas negativas que nomeiam o defeito medido em PROD:
  assert(
    row.modelo_ia !== PROMPT_ROW_FIXTURE.model_id,
    "o Sonnet CONFIGURADO nunca pode aparecer num guia escrito pelo fallback",
  );
  assert(row.provedor_ia !== "anthropic", "o provedor configurado também não");
  // O roteiro do fallback foi persistido de fato (a proveniência não é de uma linha vazia).
  const qs = persistedQuestions(supabaseAdmin.writes);
  assertEquals(qs.filter((q) => q.origem === "ia").length, 1);
});

// ═══════════════════════════════════════════════════════════════════════════════════
// Phase 49 / Plano 49-25 — JORN-39 / JORN-28: um roteiro que NENHUM modelo escreveu
// diz que não foi escrito (WINDOWS 60)
//
// O 49-24 MEDIU o defeito pelo lado da proveniência e o deixou registrado: quando o teto
// diário de custo (AI-06) corta a chamada, `callAi` devolve um resultado cujo `parsed` NÃO
// é nulo — é um stub de recomendação («segurar», mais o marcador de revisão humana). A EF
// tratava «`parsed` não nulo» como «há roteiro», então persistia uma linha com ZERO
// perguntas de IA, SEM nenhuma flag, e respondia sucesso. Um roteiro barrado por gasto era
// indistinguível de um roteiro vazio bem-sucedido.
//
// A condição correta é pelo PROVEDOR (`provider === "none"` ⇒ ninguém respondeu ⇒ não há
// roteiro), não por uma lista de códigos: enumerar códigos é a forma «iteração sobre lista
// literal» do CLAUDE.md §Portões — o bloqueio seguinte nasceria fora da vigilância.
// ═══════════════════════════════════════════════════════════════════════════════════

// A dimensão fraca que o scorecard descobre. Deliberadamente DIFERENTE da competência da
// pergunta manual e da pergunta gerada, para que a falta de cobertura seja inequívoca.
const DIM_FRACA = "Negociação";

const SCORE_ROWS_COM_DIM_FRACA = [
  {
    tipo: "triagem",
    subtipo: null,
    score: 2,
    score_max: 5,
    metadata: { competencias: [{ competency: DIM_FRACA, score: 1 }] },
  },
];

Deno.test("49-25 / JORN-39 — teto de custo estourado NÃO é persistido como guia pronto", async () => {
  // Gasto do dia acima do teto ⇒ `callAi` corta ANTES de qualquer provedor. O mock da
  // Anthropic devolve um roteiro que NÃO deve chegar a lugar nenhum: se ele aparecer, a
  // chamada não foi barrada e o teste está medindo outra coisa.
  const supabaseAdmin = makeMockSupabaseAdmin({ questions: [MANUAL_QUESTION] }, null, 999);
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropic({
      questions: [{ question: "Esta resposta NÃO deve existir.", competency: "Comunicação" }],
    }),
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 200);

  const row = persistedGuiaRow(supabaseAdmin.writes);
  const guia = row.guia as Record<string, unknown>;

  // 1. A linha DECLARA que não há roteiro. Sem isto, quem lê a tabela (e o selo do 49-16)
  //    vê uma linha com aparência de guia gerado.
  assertEquals(
    guia.incompleto,
    true,
    "um bloqueio anterior ao provedor tem de persistir a linha como incompleta",
  );

  // 2. E diz POR QUE. O código do bloqueio é a única coisa que distingue «barrado por
  //    gasto» de «a IA não produziu saída aproveitável» — as duas viram `incompleto`.
  const flags = (guia.flags ?? []) as string[];
  assert(
    flags.includes("cost_cap_exceeded"),
    `o código do bloqueio tem de ir para flags; veio ${JSON.stringify(guia.flags)}`,
  );

  // 3. O stub do bloqueio NÃO é um roteiro. Estas duas chaves são a forma EXATA do defeito
  //    medido: elas vinham do resultado barrado e eram gravadas dentro de `guia` como se
  //    fossem conteúdo do roteiro.
  assert(
    !("recommendation" in guia),
    "a recomendação do resultado barrado não é conteúdo de roteiro e não pode ser persistida como tal",
  );
  assert(
    !("flagged_for_human_review" in guia),
    "o marcador de revisão do resultado barrado também não",
  );

  // 4. ENTREV-08: um bloqueio por custo NÃO apaga edição humana.
  const qs = persistedQuestions(supabaseAdmin.writes);
  assertEquals(qs.length, 1, "só a pergunta manual sobrevive — não havia roteiro de IA");
  assertEquals(qs[0].origem, "manual");
  assertEquals(qs[0].question ?? qs[0].pergunta, MANUAL_QUESTION.question);

  // 5. A proveniência do 49-24 segue coerente: ninguém respondeu, os dois campos NULL.
  assertEquals(row.provedor_ia, null);
  assertEquals(row.modelo_ia, null);
});

Deno.test("49-25 / JORN-39 — re-prompt barrado pelo teto NÃO apaga o roteiro da 1ª passada", async () => {
  // `[0, 999]`: a 1ª passada roda (gasto do dia zero) e o RE-PROMPT do passo 7 é barrado.
  // O scorecard descobre uma dimensão fraca que o roteiro da 1ª passada não cobre, que é o
  // que dispara o re-prompt.
  //
  // O roteiro da 1ª passada EXISTE e foi escrito por um modelo. Tratar o resultado barrado
  // como «a última palavra» descartaria esse roteiro e, pior, gravaria proveniência NULL
  // numa linha cujo conteúdo tem autor conhecido — a atribuição errada que o JORN-28 fecha.
  const supabaseAdmin = makeMockSupabaseAdmin(
    { questions: [MANUAL_QUESTION] },
    null,
    [0, 999],
    SCORE_ROWS_COM_DIM_FRACA,
  );
  const deps: GerarGuiaDeps = {
    anthropic: makeMockAnthropic({
      questions: [{ question: "Pergunta da 1ª passada.", competency: "Comunicação" }],
    }),
    openai: makeMockOpenAI(),
    supabaseAdmin,
    supabaseUser,
  };

  const res = await handler(makeRequest(), deps);
  assertEquals(res.status, 200);

  const row = persistedGuiaRow(supabaseAdmin.writes);
  const guia = row.guia as Record<string, unknown>;
  const qs = persistedQuestions(supabaseAdmin.writes);

  assertEquals(
    qs.filter((q) => q.origem === "ia").length,
    1,
    "o roteiro que a 1ª passada escreveu sobrevive ao re-prompt barrado",
  );
  assertEquals(qs.filter((q) => q.origem === "manual").length, 1, "e a pergunta manual também");
  assert(
    !("recommendation" in guia),
    "o stub do resultado barrado não pode substituir o roteiro da 1ª passada",
  );

  // A proveniência é de quem ESCREVEU o roteiro persistido — a 1ª passada. O resultado
  // barrado não é o autor de nada.
  assertEquals(
    row.provedor_ia,
    "anthropic",
    "quem escreveu o roteiro persistido foi a 1ª passada, e é ela que a linha registra",
  );
  assertEquals(row.modelo_ia, MODELO_REAL_DATADO);
});
