/**
 * Orçamento TOTAL de uma chamada `callAi` — o fallback não pode dobrar o teto.
 *
 * MEDIDO EM PROD (2026-09-06, ao gerar o guia presencial): `ai_call_logs` registrou
 * `provider=openai`, **121 546 ms** e `error_message: "Request timed out."` — o erro da
 * Anthropic. O teto por-chamada era 110 s para o primário E para o fallback: 110 + 110 =
 * 220 s, contra os ~150 s que o Edge Function tem para responder. A EF só sobreviveu
 * porque o fallback foi rápido; com um fallback lento o gateway corta a resposta e NADA
 * é gravado — a falha some sem deixar log, que é o pior modo possível.
 *
 * O orçamento é INJETADO por `deps.totalBudgetMs` (12 s aqui), nunca por env: a env é
 * lida uma única vez, na avaliação do módulo, e os arquivos de teste compartilham o
 * processo — a primeira versão deste teste definiu `AI_TOTAL_BUDGET_MS` e quebrou o
 * AI-04 do arquivo vizinho, que conta tentativas a partir do mesmo orçamento.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { callAi } from "../ai-client.ts";

/** Orçamento pequeno, acima do piso de 5 s — senão o piso é que decidiria. */
const ORCAMENTO_MS = 12000;

const PROMPT = {
  call_type: "cv_job_match",
  model_id: "claude-sonnet-4-6",
  fallback_model_id: "gpt-4o-mini",
  prompt_version: "1.0.0",
  system_template: "You are an impartial recruiter assistant.",
  max_tokens: 2000,
  temperature: 0,
};

const baseArgs = {
  rawInput: "Texto do candidato.",
  vagaRubricBlock: "Rubric: BARS 1-5.",
  candidato_id: "11111111-1111-1111-1111-111111111111",
  vaga_id: "22222222-2222-2222-2222-222222222222",
};

/** OpenAI que REGISTRA as RequestOptions (2º argumento) — é o timeout que queremos ver. */
function openaiComOpts() {
  const opts: { timeout?: number }[] = [];
  return {
    opts,
    chat: {
      completions: {
        parse: (_req: unknown, callOpts?: { timeout?: number }) => {
          opts.push(callOpts ?? {});
          return Promise.resolve({
            choices: [{ message: { parsed: { resumo: "fallback" } } }],
            usage: { prompt_tokens: 800, completion_tokens: 150 },
          });
        },
      },
    },
  };
}

/** Anthropic que demora `atrasoMs` e então falha por timeout — come o orçamento. */
function anthropicLento(atrasoMs: number) {
  return {
    messages: {
      parse: async () => {
        await new Promise((r) => setTimeout(r, atrasoMs));
        throw Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" });
      },
    },
  };
}

function supabaseNoop() {
  return {
    from: () => ({
      insert: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  };
}

Deno.test("o primário consome o orçamento → o fallback recebe só o que sobrou", async () => {
  const openai = openaiComOpts();
  // O primário gasta ~4 s dos 12 s. Teto pedido: 30 s — mais do que sobra.
  await callAi(
    { prompt: PROMPT, ...baseArgs, timeoutMs: 30000 },
    // deno-lint-ignore no-explicit-any
    {
      anthropic: anthropicLento(4000) as any,
      openai: openai as any,
      supabase: supabaseNoop() as any,
      totalBudgetMs: ORCAMENTO_MS,
    },
  );

  assertEquals(openai.opts.length, 1, "o fallback tem de ter sido chamado");
  const teto = openai.opts[0].timeout ?? 0;
  assert(teto < 30000, `o fallback recebeu ${teto}ms — o teto cheio (30000) estouraria o orçamento`);
  assert(teto >= 7000 && teto <= 8500, `o fallback recebeu ${teto}ms — esperado ~8s (12000 - ~4000 gastos)`);
});

Deno.test("o piso protege o fallback: sobra menor que 5 s ainda dá 5 s, nunca zero", async () => {
  const openai = openaiComOpts();
  // O primário gasta 8 s dos 12 s: sobram 4 s, ABAIXO do piso de 5 s.
  await callAi(
    { prompt: PROMPT, ...baseArgs, timeoutMs: 60000 },
    // deno-lint-ignore no-explicit-any
    {
      anthropic: anthropicLento(8000) as any,
      openai: openai as any,
      supabase: supabaseNoop() as any,
      totalBudgetMs: ORCAMENTO_MS,
    },
  );
  assertEquals(openai.opts[0].timeout, 5000, "abaixo do piso vale o piso — uma chamada de 0 ms não serve a ninguém");
});
