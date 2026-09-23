/**
 * `_shared/bars-redacao.ts` — a rubrica BARS da redação, versionada.
 *
 * Phase 49 / Plan 49-09 — JORN-07 / D-24..D-26.
 *
 * O defeito que estes testes travam: o prompt `culture_fit_essay` manda «use as
 * âncoras BARS fornecidas no input» e o input só levava a pergunta. O modelo
 * inventava os nomes das dimensões, e inventava DIFERENTE a cada chamada (medido nas
 * 2 redações já avaliadas em PROD). Ver o cabeçalho de `bars-redacao.ts`.
 *
 * Run: deno test --allow-all supabase/functions/_shared/__tests__/bars-redacao.test.ts
 */
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DIMENSOES_REDACAO,
  montarBlocoRubricaRedacao,
  normalizarNomesDimensoes,
  RUBRICA_REDACAO_VERSAO,
  validarDimensoesRedacao,
  VALORES_BEAUTY_SMILE,
} from "../bars-redacao.ts";

const PERGUNTA =
  "Descreva uma situação real em que você precisou cuidar de uma pessoa em momento de fragilidade.";

// ── A constante em si ────────────────────────────────────────────────────────

Deno.test("49-09 / D-24 — são as 4 dimensões BARS do PRD, nesta ordem, NÃO os 4 valores", () => {
  assertEquals(DIMENSOES_REDACAO.map((d) => d.chave), ["D1", "D2", "D3", "D4"]);
  assertEquals(DIMENSOES_REDACAO.map((d) => d.nome), [
    "especificidade",
    "acao",
    "aprendizado",
    "alinhamento_valores",
  ]);
  assertEquals(DIMENSOES_REDACAO.map((d) => d.rotulo), [
    "Especificidade da situação",
    "Ação demonstrada",
    "Aprendizado / Reflexão",
    "Alinhamento com os valores Beauty Smile",
  ]);
  // Os 4 valores existem, mas como OBJETO da D4 — nenhum deles é rótulo de dimensão.
  assertEquals([...VALORES_BEAUTY_SMILE], [
    "UAU",
    "Inovação",
    "Atitude de Dono",
    "Sede de Crescimento",
  ]);
  for (const valor of VALORES_BEAUTY_SMILE) {
    assertEquals(
      DIMENSOES_REDACAO.some((d) => d.rotulo === valor),
      false,
      `"${valor}" é um valor BS, não uma dimensão da rubrica (D-24/D-25)`,
    );
  }
});

Deno.test("49-09 / D-26 — a versão da rubrica é 'bars-prd-1.1'", () => {
  assertEquals(RUBRICA_REDACAO_VERSAO, "bars-prd-1.1");
});

Deno.test("49-09 — toda dimensão tem as 5 âncoras (1..5), não-vazias e distintas", () => {
  for (const d of DIMENSOES_REDACAO) {
    const textos: string[] = [];
    for (const nivel of [1, 2, 3, 4, 5] as const) {
      const a = d.ancoras[nivel];
      assertEquals(typeof a, "string", `${d.chave} nível ${nivel} deve existir`);
      assert(a.trim().length > 40, `${d.chave} nível ${nivel}: âncora curta demais para ser comportamental`);
      textos.push(a);
    }
    assertEquals(new Set(textos).size, 5, `${d.chave}: as 5 âncoras têm de ser distintas`);
    assert(d.oQueMede.trim().length > 20, `${d.chave} precisa de "o que mede"`);
  }
});

// ── montarBlocoRubricaRedacao ────────────────────────────────────────────────

Deno.test("49-09 / JORN-07 — o bloco contém os 4 rótulos e as âncoras 5→1 de cada dimensão", () => {
  const bloco = montarBlocoRubricaRedacao({ perguntaTexto: PERGUNTA });

  for (const d of DIMENSOES_REDACAO) {
    assertStringIncludes(bloco, d.rotulo);
    // as 5 âncoras da constante, literais, no bloco
    for (const nivel of [1, 2, 3, 4, 5] as const) {
      assertStringIncludes(bloco, d.ancoras[nivel]);
    }
    // e em ordem 5 → 1 (o molde de bars-rubric.ts)
    const i5 = bloco.indexOf(d.ancoras[5]);
    const i4 = bloco.indexOf(d.ancoras[4]);
    const i3 = bloco.indexOf(d.ancoras[3]);
    const i2 = bloco.indexOf(d.ancoras[2]);
    const i1 = bloco.indexOf(d.ancoras[1]);
    assert(
      i5 > 0 && i5 < i4 && i4 < i3 && i3 < i2 && i2 < i1,
      `${d.chave}: âncoras devem ir de 5 para 1`,
    );
  }
});

Deno.test("49-09 / C7 #8 — a pergunta vai como 'Pergunta: <texto>', NUNCA com o código", () => {
  const bloco = montarBlocoRubricaRedacao({ perguntaTexto: PERGUNTA });
  assertStringIncludes(bloco, `Pergunta: ${PERGUNTA}`);
  // Os códigos vivos de `perguntas_redacao` incluem D1, D2 e D3 — colidem com as
  // chaves das dimensões. Nenhuma forma `Pergunta (<codigo>)` pode existir no bloco.
  assertEquals(bloco.includes("Pergunta ("), false, "nenhum código de pergunta no bloco");
  for (const codigo of ["C1", "C2", "C3", "F1", "PADRAO_BS", "R1", "R2", "R3"]) {
    assertEquals(
      bloco.includes(`(${codigo})`),
      false,
      `código de pergunta ${codigo} não pode aparecer no bloco`,
    );
  }
});

Deno.test("49-09 — o bloco manda devolver `dimension` com as chaves D1–D4 e o nome canônico", () => {
  const bloco = montarBlocoRubricaRedacao({ perguntaTexto: PERGUNTA });
  assertStringIncludes(bloco, "`dimension`");
  assertStringIncludes(bloco, "`D1`, `D2`, `D3` e `D4`");
  assertStringIncludes(bloco, "dimension_name");
  for (const d of DIMENSOES_REDACAO) {
    assertStringIncludes(bloco, `${d.chave}=${d.nome}`);
  }
});

Deno.test("49-09 — o bloco carrega os 2 caps em linguagem de instrução", () => {
  const bloco = montarBlocoRubricaRedacao({ perguntaTexto: PERGUNTA });
  // Cap (b) — D1 ≤ 2 → 50
  assertStringIncludes(bloco, "`D1 ≤ 2`");
  assertStringIncludes(bloco, "limitada a 50");
  // Cap (a) — red flag ético ⇒ D2 = 1 E D4 = 1
  assertStringIncludes(bloco, "`D2 = 1` E `D4 = 1`");
  assertStringIncludes(bloco, "red_flag_etico: true");
  // RNF-07a explícito: nenhum score rejeita
  assertStringIncludes(bloco, "RNF-07a");
});

Deno.test("49-09 — valores primário/secundário da pergunta entram como contexto da D4", () => {
  const comDois = montarBlocoRubricaRedacao({
    perguntaTexto: PERGUNTA,
    valorPrimario: "UAU",
    valorSecundario: "Atitude de Dono",
  });
  assertStringIncludes(comDois, "contexto para a D4");
  assertStringIncludes(comDois, "UAU · Atitude de Dono");

  const soPrimario = montarBlocoRubricaRedacao({
    perguntaTexto: PERGUNTA,
    valorPrimario: "Inovação",
    valorSecundario: null,
  });
  assertStringIncludes(soPrimario, "contexto para a D4");
  assertEquals(soPrimario.includes(" · "), true); // o separador dos 4 valores segue lá

  // Sem valores: a linha de contexto some, e a rubrica continua completa.
  const semValores = montarBlocoRubricaRedacao({ perguntaTexto: PERGUNTA });
  assertEquals(semValores.includes("contexto para a D4"), false);
  for (const d of DIMENSOES_REDACAO) assertStringIncludes(semValores, d.rotulo);
});

Deno.test("49-09 — o bloco é autoexplicativo: quem o transporta não acrescenta rótulo nenhum", () => {
  // `callAi` passa este texto LITERAL como 2º bloco de system (Anthropic) ou
  // concatenado ao system_template (OpenAI). Sem cabeçalho próprio ele chega mudo.
  const bloco = montarBlocoRubricaRedacao({ perguntaTexto: PERGUNTA });
  assertStringIncludes(bloco, "## PERGUNTA DA REDAÇÃO");
  assertStringIncludes(bloco, "## DIMENSÕES CULTURAIS A AVALIAR");
  assertStringIncludes(bloco, RUBRICA_REDACAO_VERSAO);
  assertStringIncludes(bloco, "## REGRAS DE SAÍDA PARA AS DIMENSÕES");
  assertStringIncludes(bloco, "## CAPS OBRIGATÓRIOS DA RUBRICA");
});

Deno.test("49-09 — o builder é puro: mesma entrada ⇒ mesmo bloco (a chave de idempotência depende disso)", () => {
  const a = montarBlocoRubricaRedacao({ perguntaTexto: PERGUNTA, valorPrimario: "UAU" });
  const b = montarBlocoRubricaRedacao({ perguntaTexto: PERGUNTA, valorPrimario: "UAU" });
  assertEquals(a, b);
  // e pergunta diferente ⇒ bloco diferente (senão a impressão digital não discrimina)
  assert(a !== montarBlocoRubricaRedacao({ perguntaTexto: "Outra pergunta.", valorPrimario: "UAU" }));
});

// ── validarDimensoesRedacao ──────────────────────────────────────────────────

const d = (dimension: string) => ({ dimension });

Deno.test("49-09 / T-49-09-01 — {D1,D2,D3,D4} é o ÚNICO conjunto aceito", () => {
  assertEquals(validarDimensoesRedacao([d("D1"), d("D2"), d("D3"), d("D4")]).ok, true);
  // ordem diferente ainda é o mesmo CONJUNTO — aceito
  assertEquals(validarDimensoesRedacao([d("D4"), d("D2"), d("D1"), d("D3")]).ok, true);
});

Deno.test("49-09 / T-49-09-01 — faltando, repetida ou fora do vocabulário ⇒ recusa com motivo", () => {
  const casos: Array<[Array<{ dimension?: string }>, string]> = [
    [[d("D1"), d("D2"), d("D3")], "3 dimensões"],
    [[d("D1"), d("D1"), d("D3"), d("D4")], "repetida"],
    [[d("D1"), d("D2"), d("D3"), d("D5")], "fora da rubrica"],
    [[d("D1"), d("D2"), d("D3"), d("Ownership")], "nome inventado"],
    [[d("D1"), d("D2"), d("D3"), d("D4"), d("D4")], "5 entradas"],
    [[{}, d("D2"), d("D3"), d("D4")], "dimension ausente"],
    [[d("D1"), d("D2"), d("D3"), d("")], "string vazia"],
  ];
  for (const [dims, rotulo] of casos) {
    const r = validarDimensoesRedacao(dims);
    assertEquals(r.ok, false, `${rotulo} deve ser recusado`);
    assert(typeof r.motivo === "string" && r.motivo.length > 0, `${rotulo}: motivo obrigatório`);
  }
});

Deno.test("49-09 — a recusa NOMEIA a causa certa: repetida ≠ ausente", () => {
  // ⚠ Medido por mutação: com a checagem de repetição desativada, `[D1,D1,D3,D4]`
  //   AINDA é recusado — pela checagem de completude, porque num array de tamanho 4
  //   sobre um vocabulário de 4 toda repetição implica uma chave faltando. O veredito
  //   é redundante; o que NÃO é redundante é o MOTIVO. Sem esta asserção a checagem de
  //   repetição é um portão incapaz de falhar, e um diagnóstico errado («faltou a D2»
  //   quando o defeito é «a D1 veio duas vezes») manda o leitor procurar a coisa errada.
  assertEquals(
    validarDimensoesRedacao([d("D1"), d("D1"), d("D3"), d("D4")]).motivo,
    "dimension repetida: D1",
  );
  assertEquals(
    validarDimensoesRedacao([d("D1"), d("D2"), d("D3")]).motivo,
    "esperava 4 dimensões, recebi 3",
  );
  assertEquals(
    validarDimensoesRedacao([d("D1"), d("D2"), d("D3"), d("D5")]).motivo,
    "dimension fora da rubrica: D5",
  );
});

Deno.test("49-09 — entrada malformada nunca lança (a avaliação é never-absent)", () => {
  for (const entrada of [null, undefined, [], "x" as unknown as []]) {
    const r = validarDimensoesRedacao(entrada as never);
    assertEquals(r.ok, false);
    assert(typeof r.motivo === "string");
  }
});

// ── normalizarNomesDimensoes ─────────────────────────────────────────────────

Deno.test("49-09 / D-24 — o dimension_name gravado é o da CONSTANTE, não o que o modelo devolveu", () => {
  // Os nomes abaixo são os que o Sonnet REALMENTE devolveu nas 2 redações de PROD.
  const doModelo = [
    { dimension: "D1", dimension_name: "Cuidado e Empatia com o Outro", score: 4 },
    { dimension: "D2", dimension_name: "Ownership e Protagonismo Individual", score: 5 },
    { dimension: "D3", dimension_name: "Aprendizado e Melhoria Contínua", score: 3 },
    { dimension: "D4", dimension_name: "Consideração de Trade-offs e Perspectivas Divergentes", score: 4 },
  ];
  const out = normalizarNomesDimensoes(doModelo);
  assertEquals(out.map((x) => x.dimension_name), [
    "especificidade",
    "acao",
    "aprendizado",
    "alinhamento_valores",
  ]);
  // o resto da entrada sobrevive intacto
  assertEquals(out.map((x) => x.score), [4, 5, 3, 4]);
  assertEquals(out.map((x) => x.dimension), ["D1", "D2", "D3", "D4"]);
  // e a entrada original não é mutada
  assertEquals(doModelo[0].dimension_name, "Cuidado e Empatia com o Outro");
});
