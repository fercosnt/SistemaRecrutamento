/**
 * Phase 49 / Plano 49-02 — `_shared/ai-error-codes.ts` (JORN-28).
 *
 * O que este arquivo tranca não é «a constante existe», é a LIGAÇÃO entre o que o
 * `ai-client.ts` EMITE e o que a tela do admin (49-15) sabe TRADUZIR. Medido em PROD
 * antes desta fase: 17 fallbacks, todos com `error_code='anthropic_retries_exhausted'`,
 * enquanto as causas reais eram timeout ×8, truncamento ×4 e Zod `too_big` ×5. Separar
 * as causas no `ai-client` e esquecer de dar rótulo a uma delas produz uma tela que
 * mostra o código cru — a mesma opacidade, com mais passos.
 *
 * Por isso a asserção central LÊ O FONTE do `ai-client.ts` e exige rótulo para cada
 * causa que ele usa. Acrescentar uma causa nova sem rótulo REPROVA aqui.
 *
 * Run: deno test --allow-read supabase/functions/_shared/__tests__/ai-error-codes.test.ts
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  AI_ERROR_CODE,
  CAUSA_FALLBACK_ROTULO,
  causaDoFallback,
  ehFallback,
  PREFIXO_FALLBACK,
} from "../ai-error-codes.ts";

const FONTE_AI_CLIENT = new URL("../ai-client.ts", import.meta.url);

Deno.test("ai-error-codes — zero imports (o front o importa por caminho relativo)", async () => {
  const fonte = await Deno.readTextFile(new URL("../ai-error-codes.ts", import.meta.url));
  assert(
    !/^\s*import\s/m.test(fonte),
    "um único import (npm:, https://, .ts) impediria o `src/` de importar este arquivo — " +
      "é o contrato do `email-config.ts:12-17` e o precedente do `exportacaoService.ts:61`",
  );
});

Deno.test("ai-error-codes — toda causa `anthropic_*` tem rótulo pt-BR", () => {
  const causas = Object.values(AI_ERROR_CODE).filter((c) => c.startsWith("anthropic_"));
  assert(causas.length >= 7, `esperado ≥7 causas anthropic_*, achei ${causas.length}`);
  for (const causa of causas) {
    const rotulo = (CAUSA_FALLBACK_ROTULO as Record<string, string>)[causa];
    assert(
      typeof rotulo === "string" && rotulo.length > 0,
      `a causa "${causa}" não tem rótulo — a tela do admin mostraria o código cru`,
    );
  }
});

Deno.test("ai-error-codes — o legado `anthropic_retries_exhausted` é traduzível (as 17 linhas antigas)", () => {
  // Nenhuma escrita retroativa: as 17 linhas de PROD ficam com o código genérico. Mas a
  // tela TEM de saber lê-las, senão o histórico vira código cru.
  assertEquals(AI_ERROR_CODE.anthropic_retries_exhausted, "anthropic_retries_exhausted");
  assert(
    CAUSA_FALLBACK_ROTULO.anthropic_retries_exhausted.length > 0,
    "o código legado precisa de rótulo — ele descreve 17 linhas vivas em PROD",
  );
});

Deno.test("ai-error-codes — ehFallback / causaDoFallback fazem a volta completa", () => {
  assertEquals(PREFIXO_FALLBACK, "fallback_");
  assertEquals(ehFallback("fallback_anthropic_timeout"), true);
  assertEquals(causaDoFallback("fallback_anthropic_timeout"), "anthropic_timeout");

  // Um sucesso Anthropic e um bloqueio NÃO são fallback — é essa distinção que decide se
  // o replay de idempotência pode servir a linha (JORN-28: fallback nunca é replayado).
  assertEquals(ehFallback("anthropic_timeout"), false, "a causa crua não é o rótulo do resultado");
  assertEquals(ehFallback(null), false);
  assertEquals(ehFallback(undefined), false);
  assertEquals(ehFallback("cost_cap_exceeded"), false);
  assertEquals(causaDoFallback("anthropic_timeout"), null, "sem prefixo não há causa a extrair");
  assertEquals(causaDoFallback(null), null);

  // Toda causa com rótulo tem de sobreviver à ida e à volta.
  for (const causa of Object.keys(CAUSA_FALLBACK_ROTULO)) {
    const codigoDoResultado = `${PREFIXO_FALLBACK}${causa}`;
    assertEquals(ehFallback(codigoDoResultado), true, `${codigoDoResultado} tem de ser fallback`);
    assertEquals(causaDoFallback(codigoDoResultado), causa);
  }
});

Deno.test("ai-error-codes — TODO código que o `ai-client.ts` usa existe na constante (e, se for causa, tem rótulo)", async () => {
  const fonte = await Deno.readTextFile(FONTE_AI_CLIENT);
  const usados = new Set<string>();
  for (const m of fonte.matchAll(/AI_ERROR_CODE\.([A-Za-z0-9_]+)/g)) usados.add(m[1]);

  // Guarda contra teste vácuo: se o `ai-client` parar de usar a constante, isto reprova
  // ANTES de a asserção seguinte passar por não ter nada a conferir.
  assert(
    usados.size >= 8,
    `o ai-client.ts tem de referenciar a constante (achei ${usados.size} usos de AI_ERROR_CODE.*) — ` +
      "códigos literais espalhados foi exatamente o defeito que esta constante resolve",
  );

  for (const chave of usados) {
    const valor = (AI_ERROR_CODE as Record<string, string>)[chave];
    assert(valor !== undefined, `o ai-client usa AI_ERROR_CODE.${chave}, que NÃO existe na constante`);
    if (valor.startsWith("anthropic_")) {
      assert(
        (CAUSA_FALLBACK_ROTULO as Record<string, string>)[valor] !== undefined,
        `o ai-client emite "${valor}" e a tela não teria rótulo para ele`,
      );
    }
  }
});

Deno.test("ai-error-codes — nenhum código `anthropic_*`/`openai_*` LITERAL sobrou no `ai-client.ts`", async () => {
  const fonte = await Deno.readTextFile(FONTE_AI_CLIENT);
  // Só linhas de código (comentários citam os códigos de propósito, para explicar a causa).
  const literais = new Set<string>();
  for (const linha of fonte.split("\n")) {
    const semComentario = linha.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
    for (const m of semComentario.matchAll(/["'](anthropic_[a-z_]+|openai_[a-z_]+)["']/g)) {
      literais.add(m[1]);
    }
  }
  assertEquals(
    [...literais],
    [],
    "um código literal no ai-client é um código que pode nascer sem rótulo — use AI_ERROR_CODE.*",
  );
});
