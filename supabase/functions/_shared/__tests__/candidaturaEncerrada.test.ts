/**
 * Tabela-verdade do predicado canônico TS, do lado DENO — os MESMOS casos que o
 * `src/lib/candidatura/__tests__/candidaturaEncerrada.test.ts` (vitest) roda pelo reexport, e
 * que o `p48_candidatura_encerrada_smoke.sql` confere contra `public.candidatura_encerrada`.
 *
 * Phase 49 / plano 49-03: a implementação passou a ser UMA (`_shared/candidaturaEncerrada.ts`),
 * consumida por Edge Functions e pelo front. Dois runtimes, uma fonte — este arquivo prova que o
 * MESMO módulo se comporta igual sob Deno, que é onde a guarda de `avanco` da EF
 * `notificar-candidato` o consulta antes de deixar um e-mail sair.
 *
 * Se um dos três lados (SQL vivo, este teste, o vitest) mudar e os outros não, um deles reprova.
 *
 * Run: deno test supabase/functions/_shared/__tests__/candidaturaEncerrada.test.ts
 * (sem --allow-net: o módulo sob teste tem ZERO IMPORTS por contrato)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  candidaturaEncerrada,
  ETAPAS_TERMINAIS,
  STATUS_TERMINAIS,
} from "../candidaturaEncerrada.ts";

/**
 * A MESMA tabela do vitest, na mesma ordem — a correspondência é o ponto: um caso acrescentado
 * de um lado e esquecido do outro fica visível na diferença entre os dois arquivos.
 */
const TABELA_VERDADE: ReadonlyArray<
  readonly [string | null | undefined, string | null | undefined, boolean]
> = [
  // encerradas
  ["aprovado", "finalizado", true],
  ["rejeitado", "rejeitado", true],
  ["inscricao", "rejeitado", true], // knockout — a etapa NÃO muda, por desenho
  ["triagem", "finalizado", true], // legado: status terminal em etapa de trabalho
  [null, "rejeitado", true],
  [undefined, "finalizado", true],
  // em andamento
  ["triagem", "em_analise", false],
  ["decisao_final", "aguardando_resposta", false],
  ["triagem", null, false],
  [null, null, false],
];

Deno.test("49-03 — candidaturaEncerrada(etapa, status): a tabela-verdade inteira, sob Deno", () => {
  for (const [etapa, status, esperado] of TABELA_VERDADE) {
    assertEquals(
      candidaturaEncerrada(etapa, status),
      esperado,
      `(${String(etapa)}, ${String(status)}) deveria ser ${esperado}`,
    );
  }
});

Deno.test("49-03 — aprovado_proxima NÃO encerra: ali há próximo passo", () => {
  assertEquals(candidaturaEncerrada("entrevista_online", "aprovado_proxima"), false);
});

Deno.test("49-03 — etapa terminal encerra mesmo sem status", () => {
  assertEquals(candidaturaEncerrada("aprovado", null), true);
  assertEquals(candidaturaEncerrada("rejeitado", undefined), true);
});

Deno.test("49-03 — valor desconhecido não encerra (allowlist, não denylist)", () => {
  assertEquals(candidaturaEncerrada("etapa_nova", "status_novo"), false);
});

Deno.test("49-03 — os conjuntos exportados são exatamente os terminais do SQL vivo", () => {
  assertEquals([...ETAPAS_TERMINAIS].sort(), ["aprovado", "rejeitado"]);
  assertEquals([...STATUS_TERMINAIS].sort(), ["finalizado", "rejeitado"]);
});

Deno.test("49-03 — retirada a pedido NÃO é encerrada por este predicado (D-34: fica visível ao RH)", () => {
  // `encerrada_a_pedido_em` não é argumento — e não deve virar um. Uma candidatura retirada
  // continua em etapa de trabalho com status de trabalho, e o predicado diz `false`.
  assert(!candidaturaEncerrada("triagem", "em_analise"));
  assert(!candidaturaEncerrada("entrevista_online", "aguardando_resposta"));
});
