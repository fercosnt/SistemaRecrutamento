/**
 * Testes de `_shared/sjt-rubrica.ts` — Fase 49 / Plano 49-23 (JORN-35).
 *
 * O que estes testes vigiam, em ordem de importância:
 *   1. o CONTRATO de zero imports (um import quebra o reuso pelo `src/`);
 *   2. as 5 chaves VIVAS de `perguntas.rubric.dimensoes` estarem no catálogo;
 *   3. o bloco ENVIADO ao modelo conter chave, peso, rótulo e critérios — e mandar
 *      devolver a CHAVE;
 *   4. chave desconhecida virar AVISO no bloco, nunca critério inventado;
 *   5. `ancoras === null` nas cinco, que é uma MEDIÇÃO (ver o docblock do módulo) —
 *      se alguém acrescentar âncoras, este teste reprova de propósito e obriga a
 *      registrar a fonte;
 *   6. o caminho de renderização de `ancoras` funcionar, exercitado por catálogo
 *      INJETADO — nenhuma âncora inventada entra na constante de produção.
 *
 * Run: deno test --allow-read supabase/functions/_shared/__tests__/sjt-rubrica.test.ts
 */
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  chavesDaRubrica,
  DIMENSOES_SJT,
  type DimensaoSjt,
  montarBlocoRubricaSjt,
  RED_FLAGS_SJT_CASO_ABERTO,
  REGRA_NIVEIS_SJT,
} from "../sjt-rubrica.ts";

/**
 * As 5 chaves e os pesos VIVOS, lidos de PROD em 2026-09-22 e idênticos ao seed
 * `20260611000002_perguntas_sjt.sql:181-195`. Se a rubrica da vaga mudar, este array
 * é fixture de teste — não é a fonte do peso em produção (a fonte é o banco).
 */
const RUBRICA_VIVA = [
  { dimension: "raciocinio_clinico_estetico", peso: 25 },
  { dimension: "planejamento_decisao", peso: 20 },
  { dimension: "comunicacao_expectativa", peso: 25 },
  { dimension: "etica_minimamente_invasivo", peso: 15 },
  { dimension: "consentimento_continuidade", peso: 15 },
];

/**
 * As 13 chaves VIVAS dos três cargos de marketing, lidas de PROD em 2026-10-14
 * (`social-media`, `videomaker-storymaker`, `editor-video` — migrations
 * 20261013000101..104 e 20261014000001). `clareza_do_processo` é compartilhada pelos três.
 * Mesma natureza do array acima: fixture de teste, não fonte do peso em produção.
 */
const RUBRICA_VIVA_MARKETING = [
  { dimension: "leitura_da_voz", peso: 30 },
  { dimension: "decisao_de_recorte", peso: 25 },
  { dimension: "criterio_do_desdobramento", peso: 20 },
  { dimension: "conformidade_percebida", peso: 15 },
  { dimension: "clareza_do_processo", peso: 10 },
  { dimension: "criterio_de_selecao", peso: 30 },
  { dimension: "arco_do_dia", peso: 25 },
  { dimension: "uso_da_reserva", peso: 20 },
  { dimension: "o_que_ficou_de_fora", peso: 15 },
  { dimension: "decisao_de_corte", peso: 30 },
  { dimension: "logica_das_variacoes", peso: 25 },
  { dimension: "uso_do_material", peso: 20 },
  { dimension: "conformidade_sinalizada", peso: 15 },
];

/**
 * As chaves do caso aberto de `sdr-social-seller`, nas DUAS versões que têm resposta gravada:
 * a v2 (caso a34c1967, 20261011000003, retirado em 20261014000102 com uma resposta aguardando
 * revisão humana) e a v3 (docs/specs/BANCO-SJT-V3-SDR.md, a viva depois de 20261014000102).
 */
const RUBRICA_VIVA_SDR = [
  { dimension: "acolhimento", peso: 15 },
  { dimension: "descoberta_e_qualificacao", peso: 20 },
  { dimension: "conducao_ao_agendamento", peso: 15 },
  { dimension: "cadencia_de_follow_up", peso: 25 },
  { dimension: "contorno_de_objecao", peso: 25 },
  // v2, retirada — a resposta pendente ainda pode ser reavaliada
  { dimension: "comunicacao_de_valor", peso: 15 },
  { dimension: "conducao_e_follow_up", peso: 25 },
  { dimension: "tom_clareza_e_lgpd", peso: 10 },
];

/**
 * As 5 chaves do caso aberto v2 do `dentista` (docs/specs/BANCO-SJT-DENTISTA-V2.md, migration
 * 20261015000102). As 5 do caso anterior seguem em RUBRICA_VIVA: há resposta a ele pendente.
 */
const RUBRICA_VIVA_DENTISTA_V2 = [
  { dimension: "preparacao_e_acolhimento", peso: 15 },
  { dimension: "escuta_e_personalizacao", peso: 20 },
  { dimension: "conducao_sem_surpresas", peso: 25 },
  { dimension: "orientacao_de_saida", peso: 20 },
  { dimension: "cuidado_depois_da_sessao", peso: 20 },
];

/**
 * As 5 chaves do caso aberto v1 do `lider-recepcao` (docs/specs/BANCO-SJT-LIDER-RECEPCAO-V1.md,
 * migration 20261016000101 — cargo novo).
 */
const RUBRICA_VIVA_LIDER_RECEPCAO = [
  { dimension: "confirmacao_e_preparo", peso: 15 },
  { dimension: "acolhimento_na_chegada", peso: 25 },
  { dimension: "espera_sem_surpresas", peso: 20 },
  { dimension: "saida_e_proximo_passo", peso: 20 },
  { dimension: "contato_depois", peso: 20 },
];

/** Todas as chaves vivas conhecidas, de todos os cargos. */
const TODAS_VIVAS = [
  ...RUBRICA_VIVA, ...RUBRICA_VIVA_MARKETING, ...RUBRICA_VIVA_SDR, ...RUBRICA_VIVA_DENTISTA_V2,
  ...RUBRICA_VIVA_LIDER_RECEPCAO,
];

Deno.test("49-23 / contrato — sjt-rubrica.ts não tem NENHUM import", async () => {
  const fonte = await Deno.readTextFile(new URL("../sjt-rubrica.ts", import.meta.url));
  const linhasImport = fonte
    .split("\n")
    .filter((l) => /^\s*import\s/.test(l) || /^\s*export\s+.*\sfrom\s/.test(l));
  assertEquals(
    linhasImport,
    [],
    "zero imports por contrato: um `npm:` aqui quebra a importação relativa pelo src/ e obriga a duplicar a rubrica",
  );
  // Guarda anti-vácuo: se o arquivo sumisse/encolhesse, o assert acima passaria à toa.
  assert(fonte.length > 4000, "o fonte lido é pequeno demais para ser o módulo real");
});

Deno.test("49-23 / JORN-35 — toda chave VIVA está no catálogo, com rótulo e critérios", () => {
  for (const { dimension } of TODAS_VIVAS) {
    const def = DIMENSOES_SJT[dimension];
    assert(def, `a chave viva ${dimension} não está no catálogo`);
    assert(def.rotulo.length > 3, `${dimension} sem rótulo`);
    assert(def.inclusion.length > 20, `${dimension} sem inclusion transcrito`);
    assert(def.exclusion.length > 10, `${dimension} sem exclusion transcrito`);
    assert(def.dimensao_clinica.length > 0, `${dimension} sem dimensão clínica de referência`);
  }
  // ⚠ CONSERTADO EM 2026-10-14. Até aqui esta asserção exigia que o catálogo tivesse
  // EXATAMENTE as 5 chaves do `dentista` — e reprovou o acréscimo legítimo das 13 de
  // marketing, que são chaves VIVAS em PROD. Era a «contagem contra constante» do
  // CLAUDE.md §«Portões»: uma FOTOGRAFIA de 2026-09-22 apresentada como invariante, que
  // reprova trabalho correto com diagnóstico falso («nem uma inventada» — não havia).
  //
  // O invariante REAL, e é o que o docblock deste arquivo sempre disse (item 2), é
  // «as chaves vivas estão no catálogo» — o laço acima. O que falta é o outro lado:
  // nenhuma entrada do catálogo pode ser oca. Isso NÃO congela a contagem, e continua
  // pegando a invenção que a asserção antiga queria pegar.
  const ocas = Object.entries(DIMENSOES_SJT).filter(
    ([, d]) => d.inclusion.trim().length < 20 || d.exclusion.trim().length < 10 ||
      d.rotulo.trim().length < 3 || d.dimensao_clinica.trim().length === 0,
  ).map(([k]) => k);
  assertEquals(ocas, [], "entrada de catálogo sem critério real — placeholder não entra aqui");
});

Deno.test("49-23 / JORN-35 — nenhum rótulo é reusado entre dimensões distintas", () => {
  // Dois rótulos iguais para chaves diferentes fariam a tela do RH mostrar duas
  // linhas indistinguíveis para coisas que a rubrica pesa diferente.
  const rotulos = Object.values(DIMENSOES_SJT).map((d) => d.rotulo);
  assertEquals(new Set(rotulos).size, rotulos.length, "rótulos duplicados no catálogo");
});

Deno.test("49-23 — `ancoras` é null nas 5 (MEDIÇÃO: as fontes não têm âncoras por dimensão da rubrica)", () => {
  // ⚠ Este teste reprova DE PROPÓSITO se alguém acrescentar âncoras. Ele não existe
  // para congelar o valor `null`: existe para obrigar quem acrescentar uma âncora a
  // dizer de onde ela veio (ver §`ancoras` do docblock do módulo — as âncoras 1-5 que
  // existem são das 10 dimensões CLÍNICAS, e 2 chaves da rubrica citam a MESMA (D10)
  // e 3 citam PARES, então transcrevê-las seria compor, não transcrever).
  for (const [chave, def] of Object.entries(DIMENSOES_SJT)) {
    assertEquals(
      def.ancoras,
      null,
      `${chave}: se há âncoras 1-5 reais para esta dimensão da rubrica, registre a fonte de cada nível e atualize este teste`,
    );
  }
});

Deno.test("49-23 — `template_bars` só onde o template declara reuso neste caso (2 de 5)", () => {
  // B4 declara «reuso: Mariana, cases clínicos» e B1 «reuso: Mariana, Renata, WhatsApp».
  // B2 (Honestidade/Ética comercial) e B3 (Priorização/In-basket) NÃO citam Mariana:
  // casá-los com etica_minimamente_invasivo / planejamento_decisao pela semelhança do
  // nome seria a invenção que este módulo existe para acabar.
  assertEquals(DIMENSOES_SJT.raciocinio_clinico_estetico.template_bars?.id, "B4");
  assertEquals(DIMENSOES_SJT.comunicacao_expectativa.template_bars?.id, "B1");
  assertEquals(DIMENSOES_SJT.planejamento_decisao.template_bars, null);
  assertEquals(DIMENSOES_SJT.etica_minimamente_invasivo.template_bars, null);
  assertEquals(DIMENSOES_SJT.consentimento_continuidade.template_bars, null);
});

Deno.test("49-23 / JORN-35 — o bloco contém CHAVE, PESO, RÓTULO e CRITÉRIOS de cada dimensão", () => {
  const bloco = montarBlocoRubricaSjt(RUBRICA_VIVA);
  for (const { dimension, peso } of RUBRICA_VIVA) {
    const def = DIMENSOES_SJT[dimension];
    assertStringIncludes(bloco, `\`${dimension}\` (peso ${peso})`);
    assertStringIncludes(bloco, def.rotulo);
    assertStringIncludes(bloco, def.inclusion);
    assertStringIncludes(bloco, def.exclusion);
  }
  // Os dois templates que existem entram no bloco.
  assertStringIncludes(bloco, DIMENSOES_SJT.raciocinio_clinico_estetico.template_bars!.inclusion_5);
  assertStringIncludes(bloco, DIMENSOES_SJT.comunicacao_expectativa.template_bars!.exclusion_5);
});

Deno.test("49-23 / JORN-35 — o bloco manda devolver a CHAVE e avisa que nome fora da lista vai para revisão", () => {
  const bloco = montarBlocoRubricaSjt(RUBRICA_VIVA);
  assertStringIncludes(bloco, "REGRA DE NOMEAÇÃO");
  assertStringIncludes(bloco, "CHAVE exata");
  // O defeito medido em PROD foi o modelo devolver os itens do ENUNCIADO como
  // dimensão; o bloco tem de proibir isso explicitamente.
  assertStringIncludes(bloco, "NÃO use um trecho do enunciado");
  assertStringIncludes(bloco, "DESCARTADA da nota");
});

Deno.test("49-23 — o bloco é AUTOEXPLICATIVO: callAi não acrescenta rótulo nem ordenação", () => {
  const bloco = montarBlocoRubricaSjt(RUBRICA_VIVA);
  // Cabeçalho próprio + um `##` por dimensão + nomeação + regra de níveis + red flags.
  assert(bloco.startsWith("# RUBRICA DA VAGA"), "o bloco precisa do próprio título");
  const cabecalhos = bloco.split("\n").filter((l) => l.startsWith("## "));
  assertEquals(cabecalhos.length, 5 + 3, "5 dimensões + nomeação + regra de níveis + red flags");
  // A regra de níveis viaja DENTRO do bloco, 5→1, sem depender do system_template.
  const idx5 = bloco.indexOf(`Score 5 = ${REGRA_NIVEIS_SJT[5]}`);
  const idx1 = bloco.indexOf(`Score 1 = ${REGRA_NIVEIS_SJT[1]}`);
  assert(idx5 > -1 && idx1 > idx5, "a regra 5→1 tem de estar no bloco, nessa ordem");
  assertStringIncludes(bloco, "`insufficient_evidence`");
  for (const rf of RED_FLAGS_SJT_CASO_ABERTO) assertStringIncludes(bloco, rf);
  assertStringIncludes(bloco, "RNF-07a");
});

Deno.test("49-23 / JORN-35 — chave desconhecida: aparece com o peso e com AVISO, sem critério inventado", () => {
  const bloco = montarBlocoRubricaSjt([
    { dimension: "raciocinio_clinico_estetico", peso: 60 },
    { dimension: "dimensao_que_nao_existe", peso: 40 },
  ]);
  assertStringIncludes(bloco, "`dimensao_que_nao_existe` (peso 40)");
  assertStringIncludes(bloco, "NÃO tem rótulo, critérios nem âncoras oficiais catalogados");
  assertStringIncludes(bloco, "NÃO invente critérios");
  // Nenhum critério de OUTRA dimensão pode ter escorrido para a desconhecida: a
  // única inclusion presente é a da chave conhecida (lição «instrução para campo
  // inexistente vaza»).
  const trecho = bloco.slice(bloco.indexOf("dimensao_que_nao_existe"));
  for (const def of Object.values(DIMENSOES_SJT)) {
    assert(
      !trecho.includes(def.inclusion),
      "o bloco da dimensão desconhecida não pode carregar inclusion de outra dimensão",
    );
  }
});

Deno.test("49-23 — o caminho de renderização de `ancoras` funciona (catálogo INJETADO)", () => {
  // Exercita o ramo `def.ancoras` sem que âncora inventada entre na constante de
  // produção: o catálogo vem por parâmetro, que é para isso que ele existe.
  const catalogo: Record<string, DimensaoSjt> = {
    fake_dim: {
      rotulo: "Dimensão de teste",
      ancoras: { 5: "ANC-CINCO", 4: "ANC-QUATRO", 3: "ANC-TRES", 2: "ANC-DOIS", 1: "ANC-UM" },
      dimensao_clinica: "DX",
      inclusion: "inclusion de teste com tamanho suficiente",
      exclusion: "exclusion de teste",
      template_bars: null,
    },
  };
  const bloco = montarBlocoRubricaSjt([{ dimension: "fake_dim", peso: 100 }], catalogo);
  assertStringIncludes(bloco, "Âncoras comportamentais (5 → 1):");
  const pos = ["ANC-CINCO", "ANC-QUATRO", "ANC-TRES", "ANC-DOIS", "ANC-UM"].map((a) =>
    bloco.indexOf(a)
  );
  assert(pos.every((p) => p > -1), "as 5 âncoras injetadas têm de aparecer");
  assertEquals([...pos].sort((a, b) => a - b), pos, "as âncoras saem em ordem 5→1");
  // E o aviso de ausência NÃO aparece quando há âncoras.
  assert(
    !bloco.includes("NÃO há âncoras por nível catalogadas"),
    "com âncoras presentes, o aviso de ausência não pode aparecer",
  );
});

Deno.test("49-23 — sem âncoras, o bloco DIZ que não há (em vez de omitir em silêncio)", () => {
  const bloco = montarBlocoRubricaSjt(RUBRICA_VIVA);
  const ocorrencias = bloco.split("NÃO há âncoras por nível catalogadas").length - 1;
  assertEquals(ocorrencias, 5, "as 5 dimensões vivas declaram a ausência de âncoras por nível");
});

Deno.test("49-23 — o builder é PURO e não lança para entrada malformada", () => {
  const entrada = [{ dimension: "raciocinio_clinico_estetico", peso: 25 }];
  const copia = JSON.parse(JSON.stringify(entrada));
  montarBlocoRubricaSjt(entrada);
  assertEquals(entrada, copia, "a entrada não pode ser mutada");

  // Formas tortas que uma rubric jsonb pode ter. Nenhuma pode lançar.
  const tortas: unknown[] = [
    null,
    undefined,
    [],
    [null],
    [{ dimension: "", peso: 10 }],
    [{ dimension: "ok_mas_sem_peso" }],
    [{ dimension: "peso_nao_numerico", peso: "vinte" }],
    [{ peso: 10 }],
    ["string_solta"],
    {},
  ];
  for (const t of tortas) {
    // deno-lint-ignore no-explicit-any
    const bloco = montarBlocoRubricaSjt(t as any);
    assert(typeof bloco === "string" && bloco.length > 0, `entrada torta produziu bloco vazio: ${JSON.stringify(t)}`);
    assertStringIncludes(bloco, "# RUBRICA DA VAGA");
  }
});

Deno.test("49-23 — rubrica sem dimensão nenhuma: o bloco DIZ que não há, e não finge que há", () => {
  const bloco = montarBlocoRubricaSjt([]);
  assertStringIncludes(bloco, "NÃO declarou dimensões de rubrica");
  assert(!bloco.includes("Dimensão 1 de"), "não pode listar dimensão que não existe");
  // E nenhum rótulo do catálogo pode vazar para um bloco sem dimensões.
  for (const def of Object.values(DIMENSOES_SJT)) {
    assert(!bloco.includes(def.rotulo), "rótulo do catálogo vazou para um bloco sem rubrica");
  }
});

Deno.test("49-23 — peso não numérico vira 0 no bloco, nunca `NaN` nem `undefined`", () => {
  // deno-lint-ignore no-explicit-any
  const bloco = montarBlocoRubricaSjt([{ dimension: "planejamento_decisao", peso: "vinte" } as any]);
  assertStringIncludes(bloco, "`planejamento_decisao` (peso 0)");
  assert(!bloco.includes("NaN"), "o bloco não pode mostrar NaN ao modelo");
  assert(!bloco.includes("undefined"), "o bloco não pode mostrar undefined ao modelo");
});

Deno.test("49-23 — `chavesDaRubrica` devolve o vocabulário válido e ignora entrada torta", () => {
  assertEquals(
    [...chavesDaRubrica(RUBRICA_VIVA)].sort(),
    RUBRICA_VIVA.map((d) => d.dimension).sort(),
  );
  assertEquals(chavesDaRubrica(null).size, 0);
  assertEquals(chavesDaRubrica(undefined).size, 0);
  // deno-lint-ignore no-explicit-any
  assertEquals(chavesDaRubrica([{ peso: 1 }, null, { dimension: "" }] as any).size, 0);
  // deno-lint-ignore no-explicit-any
  assertEquals(chavesDaRubrica("nao_e_array" as any).size, 0);
});
