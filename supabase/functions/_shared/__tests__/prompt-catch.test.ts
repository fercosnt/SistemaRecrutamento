/**
 * Phase 23 / Plan 23-02 Task 2 — AI-01 catch estreitado (contrato compartilhado).
 *
 * Os handlers das 6 EFs enum-presentes usam `Deno.serve` (difícil unit-testar
 * isolado). O que este teste trava é o CONTRATO que o catch estreitado depende:
 *
 *   (a) `SchemaVersionMismatchError` / `PromptNotConfiguredError` são classes
 *       reais com `instanceof` funcional + `.code` — o `catch (e) { if (e instanceof …) }`
 *       de cada EF só funciona se o instanceof narrowar corretamente;
 *   (b) `emitPromptStubAlert` grava EXATAMENTE 1 row em `recruiter_alerts` com
 *       `threshold_violated='ai_prompt_stub_fired'` e NUNCA lança (roda no caminho
 *       de erro da EF — não pode mascarar o 500 nem quebrar o re-throw).
 *
 * A remoção do stub 0.0.0 por-EF é validada por grep (acceptance do plano).
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *      supabase/functions/_shared/__tests__/prompt-catch.test.ts
 *
 * @see supabase/functions/_shared/prompt-loader.ts (error classes)
 * @see supabase/functions/_shared/audit-logger.ts (emitPromptStubAlert)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PromptNotConfiguredError, SchemaVersionMismatchError } from "../prompt-loader.ts";
import { emitPromptStubAlert } from "../audit-logger.ts";

// ── Mock supabase que espiona os INSERTs (por-tabela) ───────────────────────
function makeInsertSpy(opts: { throwOnInsert?: boolean; returnError?: unknown } = {}) {
  const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
  const supabase = {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          if (opts.throwOnInsert) throw new Error("boom — client rejeitou o insert");
          inserts.push({ table, row });
          return Promise.resolve({ data: null, error: opts.returnError ?? null });
        },
      };
    },
  };
  return { supabase, inserts };
}

Deno.test("AI-01 contrato — SchemaVersionMismatchError é instanceof + carrega .code", () => {
  const err = new SchemaVersionMismatchError("work_sample_sjt", "1.0.0", "0.0.0");
  assert(err instanceof SchemaVersionMismatchError, "instanceof deve narrowar (base do catch por-EF)");
  assert(err instanceof Error, "deve ser um Error");
  assertEquals(err.code, "schema_version_mismatch");
  assertEquals(err.call_type, "work_sample_sjt");
});

Deno.test("AI-01 contrato — PromptNotConfiguredError é instanceof + carrega .code", () => {
  const err = new PromptNotConfiguredError("bigfive_devolutiva");
  assert(err instanceof PromptNotConfiguredError, "instanceof deve narrowar (base do catch por-EF)");
  assert(err instanceof Error, "deve ser um Error");
  assertEquals(err.code, "prompt_not_configured");
  assertEquals(err.call_type, "bigfive_devolutiva");
});

Deno.test("AI-01 alarme — emitPromptStubAlert grava exatamente 1 row em recruiter_alerts", async () => {
  const { supabase, inserts } = makeInsertSpy();
  await emitPromptStubAlert(supabase, "work_sample_sjt");
  assertEquals(inserts.length, 1, "deve inserir exatamente 1 linha de alerta");
  assertEquals(inserts[0].table, "recruiter_alerts");
  assertEquals(inserts[0].row.threshold_violated, "ai_prompt_stub_fired");
  // call_type da row é null (coluna é o enum llm_call_type — evita 22P02); o
  // call_type problemático vai no texto da mensagem, não na coluna enum.
  assertEquals(inserts[0].row.call_type, null);
  assert(
    String(inserts[0].row.message).includes("work_sample_sjt"),
    "a mensagem deve citar o call_type que disparou o stub",
  );
});

Deno.test("AI-01 alarme — emitPromptStubAlert NUNCA lança (nem quando o insert lança)", async () => {
  const { supabase } = makeInsertSpy({ throwOnInsert: true });
  // Não deve propagar — o 500 original da EF é que precisa prevalecer.
  await emitPromptStubAlert(supabase, "transcript_analysis");
  assert(true, "chegou aqui sem lançar");
});

Deno.test("AI-01 alarme — emitPromptStubAlert NUNCA lança (nem quando o insert retorna error)", async () => {
  const { supabase, inserts } = makeInsertSpy({ returnError: { code: "42P01" } });
  await emitPromptStubAlert(supabase, "culture_fit_essay");
  // tentou inserir uma vez; o error retornado é apenas logado, não lançado.
  assertEquals(inserts.length, 1);
});
