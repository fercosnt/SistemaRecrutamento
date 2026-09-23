/**
 * Tabela-verdade de `algumProvedorRespondeu` — o predicado ÚNICO de «algum modelo respondeu
 * isto?» (Phase 49 / plano 49-26 · D-21).
 *
 * Duas Edge Functions o consomem (`gerar-guia-entrevista`, `avaliar-transcricao-entrevista`), e
 * é esse compartilhamento que dá a este arquivo o seu valor: até aqui a pergunta estava escrita
 * uma vez por EF, e o defeito foi encontrado DUAS vezes (`WINDOWS` 60 e 65) porque consertar uma
 * cópia deixa as outras verdes. Se o predicado mudar de comportamento, reprova aqui — não na
 * próxima EF que alguém abrir meses depois.
 *
 * O caso que importa é o TERCEIRO: bloqueio anterior ao provedor devolve um `parsed` que NÃO é
 * nulo, então a única pergunta capaz de distinguir «ninguém respondeu» de «o modelo respondeu
 * isto» é a pergunta pelo provedor.
 *
 * Run: deno test supabase/functions/_shared/__tests__/resultado-de-provedor.test.ts
 * (sem --allow-net nem --allow-read: o módulo sob teste tem ZERO IMPORTS por contrato)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  algumProvedorRespondeu,
  PROVEDOR_NENHUM,
  type ResultadoComProvedor,
} from "../resultado-de-provedor.ts";

Deno.test("resultado-de-provedor — um provedor real respondeu", () => {
  assert(algumProvedorRespondeu({ provider: "anthropic" }));
  assert(algumProvedorRespondeu({ provider: "openai" }));
  // `google` está no enum `llm_provider` de PROD sem ter chamador hoje. O predicado é
  // ALLOWLIST-FREE de propósito: ele pergunta «tem provedor?», não «é um dos que eu conheço».
  // Um provedor novo não pode nascer classificado como «ninguém respondeu».
  assert(
    algumProvedorRespondeu({ provider: "google" }),
    "um provedor que o predicado não conhece ainda respondeu — a pergunta não é uma allowlist",
  );
});

Deno.test("resultado-de-provedor — NENHUM provedor respondeu (o caso que o defeito atravessava)", () => {
  assertEquals(
    algumProvedorRespondeu({ provider: PROVEDOR_NENHUM }),
    false,
    "bloqueio anterior ao provedor: teto de custo diário (AI-06) e injeção detectada (RF-PL-18)",
  );
  // A constante é o valor cru que `callAi` devolve — asserido para que renomeá-la sem trocar o
  // valor (ou o contrário) reprove aqui em vez de silenciosamente parar de casar com `callAi`.
  assertEquals(PROVEDOR_NENHUM, "none");
  assertEquals(algumProvedorRespondeu({ provider: "none" }), false);
});

Deno.test("resultado-de-provedor — o CINTO: provedor vazio, nulo ou ausente", () => {
  // Inalcançável hoje (medido: todo retorno de `callAi` carrega literal não vazio, e o único de
  // origem externa lê o enum `llm_provider` NOT NULL de PROD). A asserção existe para que a
  // remoção do cinto reprove aqui — «na dúvida sobre quem respondeu, não afirme».
  assertEquals(algumProvedorRespondeu({ provider: "" }), false);
  assertEquals(algumProvedorRespondeu({ provider: null }), false);
  assertEquals(algumProvedorRespondeu({}), false);
  assertEquals(algumProvedorRespondeu({ provider: undefined }), false);
});

Deno.test("resultado-de-provedor — o predicado NÃO opina sobre o conteúdo", () => {
  // As duas perguntas são independentes, e é por isso que os chamadores fazem as DUAS. Um
  // provedor real pode devolver `parsed` nulo (parse falho / schema recusado): isso é ausência
  // de CONTEÚDO, não ausência de provedor, e as duas têm diagnósticos diferentes. Se este
  // predicado passasse a olhar `parsed`, ele apagaria essa distinção — e o chamador perderia a
  // capacidade de dizer POR QUE não há resultado.
  const comProvedorSemConteudo = { provider: "anthropic", parsed: null } as ResultadoComProvedor;
  assert(
    algumProvedorRespondeu(comProvedorSemConteudo),
    "parse falho é ausência de conteúdo, não de provedor — quem responde isso é o chamador",
  );

  // E o simétrico: o stub do bloqueio é um objeto NÃO nulo, e ainda assim ninguém respondeu.
  // Esta é a linha exata do defeito medido nas duas EFs.
  const semProvedorComStub = {
    provider: PROVEDOR_NENHUM,
    parsed: { recommendation: "hold", flagged_for_human_review: true },
  } as ResultadoComProvedor;
  assertEquals(
    algumProvedorRespondeu(semProvedorComStub),
    false,
    "um stub não nulo nunca vira resposta de modelo por ser um objeto",
  );
});
