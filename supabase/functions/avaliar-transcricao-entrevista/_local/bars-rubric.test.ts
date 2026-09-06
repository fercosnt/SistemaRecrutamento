/**
 * `buildBarsRubricBlock` — a rubrica que vai ao modelo vem do guia de entrevista.
 * Ver o cabeçalho de bars-rubric.ts para o defeito que motivou (bloco era um UUID).
 */
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBarsRubricBlock, SEM_GUIA_AVISO } from "./bars-rubric.ts";

const anchors = (prefix: string) => [
  { level: "inadequate", score: 1, description: `${prefix} nível 1` },
  { level: "exemplary", score: 5, description: `${prefix} nível 5` },
  { level: "developing", score: 3, description: `${prefix} nível 3` },
];

Deno.test("com guia: título da vaga, uma seção por competência, âncoras em ordem 5→1", () => {
  const out = buildBarsRubricBlock({
    vagaTitulo: "Social Media",
    vagaId: "v1",
    guias: [{
      questions: [
        { competency: "Planejamento de conteúdo", bars_anchors: anchors("Plan") },
        { competency: "Análise de métricas", bars_anchors: anchors("Metr") },
      ],
    }],
  });
  assertStringIncludes(out, "Vaga: Social Media");
  assertStringIncludes(out, '- Competência: "Planejamento de conteúdo"');
  assertStringIncludes(out, '- Competência: "Análise de métricas"');
  const i5 = out.indexOf('Score 5 (exemplary): "Plan nível 5"');
  const i3 = out.indexOf('Score 3 (developing): "Plan nível 3"');
  const i1 = out.indexOf('Score 1 (inadequate): "Plan nível 1"');
  assert(i5 > 0 && i5 < i3 && i3 < i1, "âncoras devem ir de 5 para 1");
  assert(!out.includes(SEM_GUIA_AVISO));
});

Deno.test("competência repetida (2 perguntas, ou online + presencial) entra UMA vez", () => {
  const out = buildBarsRubricBlock({
    vagaTitulo: null,
    vagaId: "v1",
    guias: [
      { questions: [{ competency: "Comunicação", bars_anchors: anchors("A") }, { competency: "Comunicação", bars_anchors: anchors("B") }] },
      { questions: [{ competency: "Comunicação", bars_anchors: anchors("C") }] },
    ],
  });
  assertEquals(out.split('- Competência: "Comunicação"').length - 1, 1);
  assertStringIncludes(out, "A nível 5"); // a primeira ocorrência vence
  assertStringIncludes(out, "Vaga: v1"); // sem título → id
});

Deno.test("sem guia, guia malformado ou sem âncoras: avisa o modelo em vez de calar", () => {
  for (const guias of [[], [null], ["texto"], [{ questions: "x" }], [{ questions: [{ competency: "X" }] }], [{ questions: [{ bars_anchors: [] }] }]]) {
    const out = buildBarsRubricBlock({ vagaTitulo: "Vaga Y", vagaId: "v1", guias });
    assertStringIncludes(out, "Vaga: Vaga Y");
    assertStringIncludes(out, SEM_GUIA_AVISO);
    assert(!out.includes("- Competência:"));
  }
});
