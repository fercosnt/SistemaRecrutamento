/**
 * Phase 49 / Plano 49-10 Task 1 — teste do handler de `avaliar-transcricao-entrevista`.
 *
 * ⚠ NÃO EXISTIA TESTE DESTE HANDLER. A EF está em PROD desde a Phase 14 e as únicas
 *   coberturas eram o `_local/derive-flags.test.ts` (a derivação pura) e o contrato de
 *   body do front. Foi nesse vão que os três defeitos que este arquivo fixa viveram:
 *     · a análise gravada não sabia de QUAL entrevista era (`tipo` NULL nas 6 linhas
 *       vivas em PROD, medido 2026-09-22), de qual texto veio, quem a pediu nem qual
 *       modelo a produziu;
 *     · a linha de FALHA entrava como `pendente_humano` e virava «a mais nova» para todo
 *       leitor que ordenava por `created_at` — uma falha de IA escondia da tela a análise
 *       que tinha funcionado;
 *     · as três escritas (`:266`, `:299`, `:309` da versão anterior) não checavam erro, e
 *       uma recusa do banco saía como `{ ok: true }`.
 *
 * ── NENHUMA chamada de rede ──
 * Anthropic / OpenAI / Supabase MOCKADOS por injeção de dependência (`deps`), no idioma
 * de `comparativo-candidatos/__tests__/index.test.ts`: os testes chamam `handler(req, deps)`
 * e NÃO exercitam o wiring do `Deno.serve` (o fechamento de imports se confere com
 * `efdeploy.cjs --dry-run`).
 *
 * Os builders de structured-output (`zodOutputFormat`/`zodResponseFormat`) são OMITIDOS de
 * propósito — sem eles o `callAi` usa o no-op `(s) => s` e o mock do SDK devolve o
 * `parsed_output` da fixture direto, que é o que queremos exercitar (o parse do SDK real
 * não é objeto deste teste).
 *
 * Run: deno test --allow-all supabase/functions/avaliar-transcricao-entrevista/
 *
 * @see supabase/migrations/20260922000007_p49_analise_entrevista_vigente.sql (a RPC que grava)
 * @see .planning/phases/49-consertos-da-jornada-bloco-2/49-10-PLAN.md (Task 1 — JORN-12 / D-37..D-42)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const CANDIDATURA = "cand-1";
const VAGA = "vaga-1";
const CANDIDATO = "candidato-1";
const RH_USER = { id: "rh-1", email: "rh@exemplo.com" };
const LOG_ID = "log-da-chamada-1";

/**
 * Modelo que DE FATO responde no mock — datado, e DISTINTO do alias configurado em
 * `PROMPT_ROW_FIXTURE.model_id`. É essa diferença que o teste de proveniência exercita:
 * `modelo_ia` tem de ser quem respondeu, não quem estava configurado (D-28).
 */
const MODELO_REAL_DO_MOCK = "claude-sonnet-4-6-20260215";

/** Transcrição acima do mínimo server-side de 200 caracteres. */
const TRANSCRICAO_A = "A: Conte sobre um conflito que você mediou. " +
  "B: Na clínica anterior duas auxiliares discordavam da escala de sábado; " +
  "chamei as duas, ouvi cada uma em separado, propus alternar os sábados e combinamos " +
  "revisar em um mês. A escala parou de ser assunto e ninguém pediu transferência.";

const TRANSCRICAO_B = "A: E uma vez em que você errou com um paciente? " +
  "B: Marquei um retorno de ortodontia no horário do almoço do doutor; o paciente veio e " +
  "esperou quarenta minutos. Assumi o erro com ele, remarquei na mesma semana com desconto " +
  "na manutenção, e passei a conferir a agenda do profissional antes de confirmar retorno.";

/** Output parseado do `transcript_analysis` — chaves EM INGLÊS, como o schema. */
const TRANSCRIPT_FIXTURE = {
  competency_evaluations: [
    {
      competency: "Resolução de conflitos",
      score: 4,
      reasoning: "Descreveu mediação com passos observáveis e resultado verificável.",
      cited_evidence: ["chamei as duas, ouvi cada uma em separado"],
      bias_flags: {
        content_dependent_only: true,
        regional_markers_ignored: true,
        disfluencies_ignored: true,
      },
    },
    {
      competency: "Responsabilização",
      score: 4,
      reasoning: "Assumiu o erro e mudou o processo para não repeti-lo.",
      cited_evidence: ["Assumi o erro com ele"],
      bias_flags: {
        content_dependent_only: true,
        regional_markers_ignored: true,
        disfluencies_ignored: true,
      },
    },
  ],
  recommendation: "avancar",
};

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

function makeMockAnthropic(parsedOutput: unknown = TRANSCRIPT_FIXTURE) {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    messages: {
      parse: (params: Record<string, unknown>) => {
        calls.push(params ?? {});
        return Promise.resolve({
          parsed_output: parsedOutput,
          model: MODELO_REAL_DO_MOCK,
          usage: { input_tokens: 4000, cache_read_input_tokens: 0, output_tokens: 900 },
        });
      },
    },
  };
}

function makeMockOpenAI() {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    chat: {
      completions: {
        parse: (params: Record<string, unknown>) => {
          calls.push(params ?? {});
          return Promise.resolve({ choices: [], usage: {} });
        },
      },
    },
  };
}

interface AdminOpts {
  /** `role` devolvido pelo lookup em `usuarios_rh`. null ⇒ sem linha RH ⇒ 403. */
  usuariosRhRole?: string | null;
  /** etapa da candidatura — é o PADRÃO do `tipo` quando o body não o manda (D-41). */
  etapaAtual?: string;
  /** `vagas.created_by` do guard de posse. */
  vagaOwner?: string | null;
  /** Guias por tipo — a leitura passa a filtrar, e o teste confere que filtrou. */
  guiasPorTipo?: Record<string, Array<Record<string, unknown>>>;
  /** Análise de sucesso já existente com o MESMO `texto_hash` (D-40). */
  analiseExistente?: Record<string, unknown> | null;
  /** Erro devolvido pela leitura de reaproveitamento. */
  analiseReadError?: { code?: string; message?: string } | null;
  /** Erro devolvido pela RPC de gravação — tem de virar 500, nunca `{ok:true}`. */
  rpcError?: { code?: string; message?: string } | null;
  /**
   * Phase 49 / plano 49-26: gasto do dia em `ai_call_logs` para a vaga. Quando `> 0`, o
   * kill-switch de custo de `callAi` (`isDailyCostCapExceeded`, teto default US$ 50) corta a
   * chamada ANTES de tocar provedor nenhum e devolve `provider: "none"` com um `parsed` que
   * NÃO é nulo. É o único caminho `none` alcançável nesta EF: a detecção de injeção também o
   * produz, mas ela já tem teste próprio e a transcrição precisaria carregar o padrão.
   *
   * Sem este parâmetro o caminho era inexpressável pelo mock — e era por isso que o defeito
   * (`WINDOWS 65`) existia com 27 testes verdes em volta dele.
   */
  custoDiarioUsd?: number;
}

/**
 * Mock do client `service_role`. Registra o que foi LIDO (com o filtro de `tipo`) e as
 * chamadas de RPC — as asserções «zero chamadas de IA» e «zero RPCs de gravação» são o que
 * distingue um reaproveitamento real (D-40) de um que só não mostrou a linha nova.
 */
function makeMockSupabaseAdmin(opts: AdminOpts = {}) {
  const {
    usuariosRhRole = "recrutador",
    etapaAtual = "entrevista_online",
    vagaOwner = RH_USER.id,
    guiasPorTipo = {},
    analiseExistente = null,
    analiseReadError = null,
    rpcError = null,
    custoDiarioUsd = 0,
  } = opts;

  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const reads: Array<{ table: string; filtros: Record<string, unknown> }> = [];
  const escritasDiretas: Array<{ table: string; op: string }> = [];
  let proximoId = 0;

  const client = {
    rpcCalls,
    reads,
    escritasDiretas,
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      if (rpcError) return Promise.resolve({ data: null, error: rpcError });
      proximoId += 1;
      return Promise.resolve({
        data: {
          ok: true,
          analise_id: `analise-nova-${proximoId}`,
          reaproveitada: false,
          vigente: args.p_status_analise !== "falhou",
          superadas: args.p_status_analise === "falhou" ? 0 : 1,
        },
        error: null,
      });
    },
    from(table: string) {
      if (table === "prompt_versions") {
        const chain = {
          eq: () => chain,
          maybeSingle: () => Promise.resolve({ data: PROMPT_ROW_FIXTURE, error: null }),
        };
        return { select: (_c?: string) => chain };
      }

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
        return { select: (_c?: string) => chain };
      }

      if (table === "candidaturas") {
        return {
          select: (_c?: string) => ({
            eq: () => ({
              maybeSingle: () => {
                reads.push({ table, filtros: {} });
                return Promise.resolve({
                  data: {
                    id: CANDIDATURA,
                    vaga_id: VAGA,
                    candidato_id: CANDIDATO,
                    etapa_atual: etapaAtual,
                  },
                  error: null,
                });
              },
            }),
          }),
        };
      }

      if (table === "vagas") {
        return {
          select: (_c?: string) => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: vagaOwner === null ? null : { titulo: "Auxiliar de Saúde Bucal", created_by: vagaOwner },
                  error: null,
                }),
            }),
          }),
        };
      }

      // Leitura de reaproveitamento (D-40): .eq × 3 → .neq → .not → .order → .limit → .maybeSingle
      if (table === "entrevista_analises") {
        const filtros: Record<string, unknown> = {};
        const chain = {
          eq: (c: string, v: unknown) => {
            filtros[c] = v;
            return chain;
          },
          neq: (c: string, v: unknown) => {
            filtros[`neq:${c}`] = v;
            return chain;
          },
          not: (c: string, op: string, v: unknown) => {
            filtros[`not:${c}`] = `${op} ${v}`;
            return chain;
          },
          order: () => chain,
          limit: () => chain,
          maybeSingle: () => {
            reads.push({ table, filtros });
            return Promise.resolve({
              data: analiseReadError ? null : analiseExistente,
              error: analiseReadError,
            });
          },
        };
        return {
          select: (_c?: string) => chain,
          // Se a EF voltar a escrever DIRETO nesta tabela, o teste vê.
          insert: () => {
            escritasDiretas.push({ table, op: "insert" });
            return Promise.resolve({ data: null, error: null });
          },
          upsert: () => {
            escritasDiretas.push({ table, op: "upsert" });
            return Promise.resolve({ data: null, error: null });
          },
        };
      }

      // Guias: .select("guia").eq(candidatura_id).eq(tipo).order(...) — awaited direto.
      if (table === "entrevista_guias") {
        const filtros: Record<string, unknown> = {};
        const chain = {
          eq: (c: string, v: unknown) => {
            filtros[c] = v;
            return chain;
          },
          order: () => {
            reads.push({ table, filtros });
            const tipo = String(filtros["tipo"] ?? "");
            return Promise.resolve({ data: guiasPorTipo[tipo] ?? [], error: null });
          },
        };
        return { select: (_c?: string) => chain };
      }

      if (table === "ai_call_logs") {
        const escrita = {
          select: (_c: string) => ({
            single: () => Promise.resolve({ data: { id: LOG_ID }, error: null }),
          }),
          then: (
            res: (v: { data: null; error: null }) => unknown,
          ) => Promise.resolve({ data: null, error: null }).then(res),
        };
        return {
          // Duas formas de `select` convivem: o replay de idempotência
          // (`.eq(...).maybeSingle()`) e o teto de custo (`.eq(...).gte(...)`, thenable).
          select: (_c?: string) => {
            const chain = {
              eq: () => chain,
              // A soma do gasto do dia (`cost_usd`) — vazia por default; com
              // `custoDiarioUsd > 0` o teto estoura e `callAi` corta antes do provedor.
              gte: () =>
                Promise.resolve({
                  data: custoDiarioUsd > 0 ? [{ cost_usd: custoDiarioUsd }] : [],
                  error: null,
                }),
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            };
            return chain;
          },
          upsert: (_row: unknown, _o?: unknown) => escrita,
          insert: (_row: unknown) => escrita,
        };
      }

      if (table === "scores_candidato") {
        return {
          upsert: () => {
            escritasDiretas.push({ table, op: "upsert" });
            return Promise.resolve({ data: null, error: null });
          },
          insert: () => {
            escritasDiretas.push({ table, op: "insert" });
            return Promise.resolve({ data: null, error: null });
          },
        };
      }

      // Qualquer outra tabela (ex.: recruiter_alerts) — aceita e registra.
      const generico = {
        select: (_c?: string) => generico,
        eq: () => generico,
        insert: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      };
      return generico;
    },
  };
  return client;
}

function makeMockSupabaseUser(user: Record<string, unknown> | null = RH_USER) {
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
  // `deps` é declarado com os 4 clientes obrigatórios; os mocks daqui são estruturais e
  // não implementam os tipos do SDK, então a ponte passa por `unknown` (o idioma que o
  // Deno exige quando os dois lados não se sobrepõem).
  return mod.handler as unknown as (
    req: Request,
    deps: Record<string, unknown>,
  ) => Promise<Response>;
}

function post(body: unknown): Request {
  return new Request("https://exemplo.local/avaliar-transcricao-entrevista", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deps(admin: ReturnType<typeof makeMockSupabaseAdmin>, extra: Record<string, unknown> = {}) {
  return {
    anthropic: makeMockAnthropic(),
    openai: makeMockOpenAI(),
    supabaseAdmin: admin,
    supabaseUser: makeMockSupabaseUser(),
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// D-41 · a análise sabe de qual entrevista é, quem a pediu e qual modelo respondeu
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("tipo='online' + texto novo ⇒ UMA chamada de IA e a RPC com tipo/autor/hash/vínculo/modelo", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const anthropic = makeMockAnthropic();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin, { anthropic }),
  );
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(json.ok, true);
  assertEquals(json.tipo, "online");
  assertEquals(json.reaproveitada, false);
  assertEquals(json.falhou, false);
  assertEquals(json.vigente, true);

  // Exatamente UMA chamada ao provedor.
  assertEquals(anthropic.calls.length, 1);

  // A gravação foi pela RPC, e só por ela.
  assertEquals(admin.rpcCalls.length, 1);
  assertEquals(admin.rpcCalls[0].fn, "registrar_analise_entrevista");
  assertEquals(
    admin.escritasDiretas,
    [],
    "a EF voltou a escrever DIRETO em entrevista_analises/scores_candidato — a RPC é o único escritor (D-39)",
  );

  const args = admin.rpcCalls[0].args;
  assertEquals(args.p_candidatura_id, CANDIDATURA);
  assertEquals(args.p_tipo, "online");
  assertEquals(args.p_solicitado_por, RH_USER.id, "solicitado_por tem de ser o RH do JWT");
  assertEquals(args.p_status_analise, "pendente_humano");
  assertEquals(args.p_ai_call_log_id, LOG_ID, "ai_call_log_id é a linha de log que contém o texto mascarado (D-38)");
  assertEquals(args.p_provedor_ia, "anthropic");
  assertEquals(
    args.p_modelo_ia,
    MODELO_REAL_DO_MOCK,
    "modelo_ia tem de ser o modelo que DE FATO respondeu, não o alias configurado (D-28)",
  );
  assert(typeof args.p_texto_hash === "string" && (args.p_texto_hash as string).length > 0);
});

Deno.test("p_texto_hash é o MESMO valor que inputHashDe dá para a transcrição (D-38)", async () => {
  const handler = await loadHandler();
  const { inputHashDe } = await import("../../_shared/ai-client.ts");
  const esperado = await inputHashDe(TRANSCRICAO_A);

  const admin = makeMockSupabaseAdmin();
  await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin),
  );
  assertEquals(
    admin.rpcCalls[0].args.p_texto_hash,
    esperado,
    "o hash gravado tem de ser o mesmo que o audit-logger grava em ai_call_logs.input_hash — dois cálculos divergem em silêncio",
  );
});

Deno.test("sem tipo no body, candidatura em entrevista_presencial ⇒ p_tipo='presencial' (a etapa é o padrão)", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({ etapaAtual: "entrevista_presencial" });
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A }),
    deps(admin),
  );
  const json = await res.json();
  assertEquals(res.status, 200);
  assertEquals(json.tipo, "presencial");
  assertEquals(admin.rpcCalls[0].args.p_tipo, "presencial");
});

Deno.test("sem tipo no body e fora de etapa de entrevista ⇒ 400 pedindo o tipo, SEM chamada de IA", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({ etapaAtual: "triagem" });
  const anthropic = makeMockAnthropic();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A }),
    deps(admin, { anthropic }),
  );
  const json = await res.json();

  assertEquals(res.status, 400);
  assertEquals(json.ok, false);
  assertEquals(json.error_code, "VALIDATION");
  assert(
    /online ou presencial/i.test(String(json.message)),
    `a mensagem tem de pedir o tipo; veio «${json.message}»`,
  );
  assertEquals(anthropic.calls.length, 0, "um 400 por tipo indeterminado não deve custar uma chamada ao provedor");
  assertEquals(admin.rpcCalls.length, 0);
});

Deno.test("o body do RH vence a etapa: tipo='online' com a candidatura em entrevista_presencial", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({ etapaAtual: "entrevista_presencial" });
  await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin),
  );
  assertEquals(
    admin.rpcCalls[0].args.p_tipo,
    "online",
    "analisar a transcrição da online quando o candidato já está em presencial é legítimo — a etapa é padrão, não regra (D-41)",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// D-40 · o mesmo texto não é analisado duas vezes
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("texto com hash já analisado na mesma (candidatura, tipo) ⇒ 0 IA, 0 RPC, reaproveitada:true", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    analiseExistente: {
      id: "analise-que-ja-existe",
      superada_em: null,
      status_analise: "pendente_humano",
      competencias: [{ competency: "Resolução de conflitos", score: 4 }],
    },
  });
  const anthropic = makeMockAnthropic();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin, { anthropic }),
  );
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(json.reaproveitada, true);
  assertEquals(json.analise_id, "analise-que-ja-existe");
  assertEquals(json.vigente, true);
  assertEquals(json.tipo, "online");
  assertEquals(anthropic.calls.length, 0, "reenviar o mesmo texto não pode custar uma chamada de IA (D-40)");
  assertEquals(admin.rpcCalls.length, 0, "reenviar o mesmo texto não pode criar linha nova (D-40)");
});

Deno.test("a leitura de reaproveitamento é escopada por candidatura, tipo e hash, e exclui falhas", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin),
  );
  const leitura = admin.reads.find((r) => r.table === "entrevista_analises");
  assert(leitura, "a EF não conferiu o hash antes de chamar a IA");
  assertEquals(leitura!.filtros["candidatura_id"], CANDIDATURA);
  assertEquals(leitura!.filtros["tipo"], "online");
  assertEquals(
    leitura!.filtros["neq:status_analise"],
    "falhou",
    "uma análise que FALHOU não pode ser reaproveitada — ela não tem resultado",
  );
  assert(
    typeof leitura!.filtros["texto_hash"] === "string",
    "o reaproveitamento tem de ser por texto_hash, não por candidatura",
  );
});

Deno.test("texto DIFERENTE na mesma (candidatura, tipo) ⇒ chama a IA e grava (o hash discrimina)", async () => {
  const handler = await loadHandler();
  const { inputHashDe } = await import("../../_shared/ai-client.ts");
  const hashA = await inputHashDe(TRANSCRICAO_A);
  const hashB = await inputHashDe(TRANSCRICAO_B);
  assert(hashA !== hashB, "a fixture não discriminaria nada se os dois textos tivessem o mesmo hash");

  const admin = makeMockSupabaseAdmin();
  const anthropic = makeMockAnthropic();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_B, tipo: "online" }),
    deps(admin, { anthropic }),
  );
  const json = await res.json();
  assertEquals(json.reaproveitada, false);
  assertEquals(anthropic.calls.length, 1);
  assertEquals(admin.rpcCalls[0].args.p_texto_hash, hashB);
});

// ─────────────────────────────────────────────────────────────────────────────
// Falha e erro checado
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("parse nulo ⇒ RPC com p_status_analise='falhou' e resposta falhou:true, vigente:false", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin, { anthropic: makeMockAnthropic(null) }),
  );
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(json.ok, true);
  assertEquals(json.falhou, true);
  assertEquals(
    json.vigente,
    false,
    "uma análise que falhou NUNCA é vigente — era assim que ela virava «a mais nova» e escondia a boa",
  );
  assertEquals(admin.rpcCalls.length, 1);
  assertEquals(admin.rpcCalls[0].args.p_status_analise, "falhou");
  assertEquals(admin.rpcCalls[0].args.p_competencias, null);
  assertEquals(admin.rpcCalls[0].args.p_bloqueio_avanco, false);
  // A falha também carrega tipo e elo com o texto: é o que permite saber depois QUAL
  // texto a IA não conseguiu analisar.
  assertEquals(admin.rpcCalls[0].args.p_tipo, "online");
  assert(typeof admin.rpcCalls[0].args.p_texto_hash === "string");
});

// ═══════════════════════════════════════════════════════════════════════════════════
// Phase 49 / Plano 49-26 — WINDOWS 65 · JORN-39
//
// Bloqueio ANTERIOR ao provedor não é uma análise esperando revisão humana.
//
// Com o teto diário de custo (AI-06) estourado, `callAi` corta a chamada antes de tocar
// provedor nenhum e devolve `provider: "none"` com um `parsed` que NÃO é nulo — um stub que
// existe para preservar a RNF-07a. A guarda de never-absent perguntava «o resultado veio
// nulo?», então o stub passava por ela: a EF caía no caminho de SUCESSO e gravava uma
// análise `pendente_humano` com a lista de competências VAZIA — indistinguível, para a tela,
// para a revisão e para o portão de avanço, de uma avaliação real que alguém precisa revisar.
//
// A pergunta correta é estrutural: nenhum provedor respondeu ⇒ não há análise. O `error_code`
// segue existindo como DIAGNÓSTICO, nunca como gatilho — enumerar os códigos de bloqueio
// conhecidos é a forma «iteração sobre lista literal» do CLAUDE.md §Portões, e foi exatamente
// por ela que o teto de custo passou enquanto a injeção era barrada.
//
// O destino certo é o ramo `falhou` que o 49-10 desenhou: ele NÃO supera ninguém e NÃO é
// vigente, então a análise boa anterior continua sendo a que todos leem.
// ═══════════════════════════════════════════════════════════════════════════════════

Deno.test("49-26 / WINDOWS 65 — teto de custo estourado grava 'falhou', nunca análise aguardando revisão", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({ custoDiarioUsd: 999 });
  // A Anthropic devolveria uma análise COMPLETA. Se ela aparecer na RPC, a chamada não foi
  // barrada e o teste está medindo outra coisa.
  const anthropic = makeMockAnthropic();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin, { anthropic }),
  );
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(
    anthropic.calls.length,
    0,
    "o teto de custo corta ANTES do provedor — se houve chamada, o cenário não é este",
  );

  assertEquals(admin.rpcCalls.length, 1, "a linha é gravada: a EF nunca fica calada");
  const args = admin.rpcCalls[0].args;

  // 1. O CONSERTO. `pendente_humano` aqui significaria «há uma avaliação de IA à espera de um
  //    humano», e não há avaliação nenhuma: ninguém respondeu.
  assertEquals(
    args.p_status_analise,
    "falhou",
    "nenhum provedor respondeu — a linha não pode entrar na fila de revisão como avaliação",
  );

  // 2. E por consequência não supera a vigente nem se torna vigente (o desenho do 49-10).
  assertEquals(
    json.vigente,
    false,
    "a análise boa anterior continua sendo a que a tela, a revisão e o portão de avanço leem",
  );
  assertEquals(json.falhou, true);

  // 3. Nada de conteúdo fabricado: o stub do bloqueio não é avaliação de competência.
  assertEquals(
    args.p_competencias,
    null,
    "competências vazias gravadas como análise real é a forma EXATA do defeito medido",
  );
  assertEquals(args.p_citacoes, null);
  assertEquals(args.p_bias_flags, null);
  assertEquals(args.p_score_metadata, null);

  // 4. RNF-07a: um corte por gasto nunca segura o avanço do candidato.
  assertEquals(args.p_bloqueio_avanco, false);

  // 5. Proveniência coerente: ninguém escreveu, então não há a quem atribuir.
  assertEquals(args.p_provedor_ia, null, "`none` não é nome de provedor para quem lê a coluna");
  assertEquals(args.p_modelo_ia, null);

  // 6. Mas a linha sabe DE QUAL texto ela é — é o que permite reanalisar depois.
  assertEquals(args.p_tipo, "online");
  assert(typeof args.p_texto_hash === "string" && (args.p_texto_hash as string).length > 0);

  // 7. A RPC continua sendo o único escritor (D-39).
  assertEquals(admin.escritasDiretas, []);
});

Deno.test("RPC devolvendo erro ⇒ 500, nunca { ok: true }", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    rpcError: { code: "22023", message: "p_status_analise invalido" },
  });
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin),
  );
  const json = await res.json();
  assertEquals(res.status, 500);
  assertEquals(json.ok, false);
  assertEquals(json.error_code, "SERVER_ERROR");
});

Deno.test("RPC devolvendo erro no caminho de FALHA também ⇒ 500 (a never-absent não pode mentir)", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    rpcError: { code: "23514", message: "check_violation" },
  });
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin, { anthropic: makeMockAnthropic(null) }),
  );
  assertEquals(res.status, 500);
  assertEquals((await res.json()).ok, false);
});

Deno.test("erro na leitura de reaproveitamento ⇒ 500, e a IA não é chamada", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    analiseReadError: { code: "42501", message: "permission denied" },
  });
  const anthropic = makeMockAnthropic();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin, { anthropic }),
  );
  assertEquals(res.status, 500);
  assertEquals(
    anthropic.calls.length,
    0,
    "sem saber se o texto já foi analisado, chamar a IA gasta dinheiro e pode duplicar a análise",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// A rubrica BARS vem do guia DO TIPO da análise
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("os guias lidos são filtrados pelo tipo da análise", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({
    guiasPorTipo: {
      online: [{
        guia: {
          questions: [{
            competency: "Resolução de conflitos",
            bars_anchors: [{ score: 5, level: "alto", description: "ANCORA DA ONLINE" }],
          }],
        },
      }],
      presencial: [{
        guia: {
          questions: [{
            competency: "Resolução de conflitos",
            bars_anchors: [{ score: 5, level: "alto", description: "ANCORA DA PRESENCIAL" }],
          }],
        },
      }],
    },
  });
  const anthropic = makeMockAnthropic();
  await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin, { anthropic }),
  );

  const leitura = admin.reads.find((r) => r.table === "entrevista_guias");
  assert(leitura, "os guias não foram lidos");
  assertEquals(
    leitura!.filtros["tipo"],
    "online",
    "sem o filtro a análise da online é avaliada contra a régua recalibrada da presencial",
  );

  // E a âncora que chegou ao modelo é a da online — a prova de que o filtro teve efeito.
  const enviado = JSON.stringify(anthropic.calls[0] ?? {});
  assert(enviado.includes("ANCORA DA ONLINE"), "a âncora do guia online não chegou ao prompt");
  assert(
    !enviado.includes("ANCORA DA PRESENCIAL"),
    "a âncora da presencial chegou ao prompt da análise da online — o filtro de tipo não teve efeito",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// O body continua fechado, e a autorização continua antes de tudo
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("body com campo extra continua recusado (.strict — anti-tamper)", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(
    post({
      candidatura_id: CANDIDATURA,
      transcricao: TRANSCRICAO_A,
      tipo: "online",
      score: 5,
    }),
    deps(admin),
  );
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error_code, "VALIDATION");
  assertEquals(admin.rpcCalls.length, 0);
});

Deno.test("tipo fora do vocabulário ⇒ 400 (o enum do body recusa antes de qualquer leitura)", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "hibrido" }),
    deps(admin),
  );
  assertEquals(res.status, 400);
  assertEquals((await res.json()).error_code, "VALIDATION");
  assertEquals(admin.rpcCalls.length, 0);
});

Deno.test("RH que não é dono da vaga ⇒ 403, sem IA e sem gravação", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({ vagaOwner: "outro-rh" });
  const anthropic = makeMockAnthropic();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin, { anthropic }),
  );
  assertEquals(res.status, 403);
  assertEquals(anthropic.calls.length, 0);
  assertEquals(admin.rpcCalls.length, 0);
});

Deno.test("sem linha ativa em usuarios_rh ⇒ 403 (o papel não vem dos claims)", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin({ usuariosRhRole: null });
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: TRANSCRICAO_A, tipo: "online" }),
    deps(admin),
  );
  assertEquals(res.status, 403);
  assertEquals(admin.rpcCalls.length, 0);
});

Deno.test("transcrição abaixo do mínimo ⇒ 400, sem IA", async () => {
  const handler = await loadHandler();
  const admin = makeMockSupabaseAdmin();
  const anthropic = makeMockAnthropic();
  const res = await handler(
    post({ candidatura_id: CANDIDATURA, transcricao: "curta demais", tipo: "online" }),
    deps(admin, { anthropic }),
  );
  assertEquals(res.status, 400);
  assertEquals(anthropic.calls.length, 0);
  assertEquals(admin.rpcCalls.length, 0);
});
