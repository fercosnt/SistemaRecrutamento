/**
 * Phase 43 / Plan 43-01 Task 1 — CONSENT-02: a prova do texto de consentimento.
 *
 * Sete comportamentos, e cada um existe porque a sua ausência produz uma FALHA
 * SILENCIOSA — uma linha de `public.autorizacoes` afirmando que a pessoa leu um
 * texto, sem que exista maneira de saber qual. É a razão de o CONSENT-02 ser o
 * requirement mais frágil da fase: ele não quebra, ele mente.
 *
 * ⚠ O PIN DO HEX (teste 6) É O GATE DA FASE. Qualquer reescrita futura da copy de
 * `consent-text.json` sem bump de `CONSENT_TEXT_VERSION` reprova AQUI, no diff, em
 * vez de escorregar para PROD e produzir linhas cujo hash não corresponde a texto
 * nenhum.
 *
 * ── COMO RECOMPUTAR O HEX PINADO (só depois de um bump de versão deliberado) ──
 *   deno eval 'import c from "./supabase/functions/_shared/consent-text.json" with { type: "json" };
 *              import { calcularHashConsentimento } from "./supabase/functions/_shared/consent-hash.ts";
 *              console.log(await calcularHashConsentimento(c.consentimentos, c.versao))'
 * Colar o resultado em HEX_PINADO_V2 e registrar no commit POR QUE a copy mudou.
 * Trocar o pin sem trocar a versão é desligar o gate.
 *
 * RUNTIME: Deno (`deno test`), não Vitest — importa `https://deno.land/std`. A
 * linha literal correspondente vive no `exclude` do bloco `test:` do
 * `vite.config.ts`; sem ela `npm run test:run` fica não-zero no repositório
 * INTEIRO por falha de CARGA de módulo ESM (lição do 42-07).
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-01-PLAN.md
 */
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calcularHashConsentimento,
  serializarEntradaHash,
  type EntradaConsentimento,
} from "../consent-hash.ts";
import corpusV2 from "../consent-text.json" with { type: "json" };
import { CONSENT_TEXT_VERSION } from "../constants.ts";

// ---------------------------------------------------------------------------
// O hex do corpus VIVO, pinado. Ver o cabeçalho para como recomputar.
// ---------------------------------------------------------------------------
const HEX_PINADO_V2 =
  "dd8f573b73f9dd63090c90e4a2c53001ef9786a5516aa9678b21c22ec88d6653";

// Fixture mínima e estável — independente do corpus vivo, para que os testes de
// SENSIBILIDADE não mudem de significado quando a copy for reescrita.
const FIXTURE: EntradaConsentimento[] = [
  { rotulo: "Primeiro rótulo", descricao: "Primeira descrição, com vírgula." },
  { rotulo: "Segundo rótulo", descricao: "Segunda descrição." },
];
const VERSAO_FIXTURE = "vTeste-0";

// ---------------------------------------------------------------------------
// 1. Determinismo
// ---------------------------------------------------------------------------
Deno.test("1. calcularHashConsentimento é determinístico — mesma entrada, mesmo hex", async () => {
  const a = await calcularHashConsentimento(FIXTURE, VERSAO_FIXTURE);
  const b = await calcularHashConsentimento(FIXTURE, VERSAO_FIXTURE);
  // Terceira chamada com um array RECONSTRUÍDO: o hash é da entrada, não da
  // identidade do objeto.
  const c = await calcularHashConsentimento(
    FIXTURE.map((e) => ({ ...e })),
    VERSAO_FIXTURE,
  );
  assertEquals(a, b);
  assertEquals(a, c);
  assertEquals(a.length, 64, "hex SHA-256 tem 64 caracteres");
  assert(/^[0-9a-f]{64}$/.test(a), `hex deve ser minúsculo e hexadecimal: ${a}`);
});

// ---------------------------------------------------------------------------
// 2. Sensibilidade a UMA VÍRGULA — o gate contra reescrita silenciosa de copy
// ---------------------------------------------------------------------------
Deno.test("2. trocar uma vírgula em rótulo ou descrição muda o hex", async () => {
  const base = await calcularHashConsentimento(FIXTURE, VERSAO_FIXTURE);

  const semVirgulaNaDescricao: EntradaConsentimento[] = [
    { rotulo: "Primeiro rótulo", descricao: "Primeira descrição com vírgula." },
    FIXTURE[1],
  ];
  assertNotEquals(
    await calcularHashConsentimento(semVirgulaNaDescricao, VERSAO_FIXTURE),
    base,
    "uma vírgula a menos na DESCRIÇÃO tem de mudar o hex",
  );

  const rotuloComVirgula: EntradaConsentimento[] = [
    { rotulo: "Primeiro, rótulo", descricao: FIXTURE[0].descricao },
    FIXTURE[1],
  ];
  assertNotEquals(
    await calcularHashConsentimento(rotuloComVirgula, VERSAO_FIXTURE),
    base,
    "uma vírgula a mais no RÓTULO tem de mudar o hex",
  );
});

// ---------------------------------------------------------------------------
// 3. Sensibilidade à ORDEM — a ordem de renderização faz parte da prova
// ---------------------------------------------------------------------------
Deno.test("3. trocar a ORDEM de dois consentimentos muda o hex", async () => {
  const base = await calcularHashConsentimento(FIXTURE, VERSAO_FIXTURE);
  const invertido = [FIXTURE[1], FIXTURE[0]];
  assertNotEquals(
    await calcularHashConsentimento(invertido, VERSAO_FIXTURE),
    base,
    "a ordem em que as escolhas são apresentadas é parte do que foi lido",
  );
});

// ---------------------------------------------------------------------------
// 4. INsensibilidade a espaço em volta e a forma de composição Unicode
// ---------------------------------------------------------------------------
Deno.test("4. espaço em volta e forma Unicode NÃO mudam o hex (trim + NFC)", async () => {
  const base = await calcularHashConsentimento(FIXTURE, VERSAO_FIXTURE);

  const comEspacos: EntradaConsentimento[] = FIXTURE.map((e) => ({
    rotulo: `  ${e.rotulo}\n`,
    descricao: `\t${e.descricao}  `,
  }));
  assertEquals(
    await calcularHashConsentimento(comEspacos, VERSAO_FIXTURE),
    base,
    "espaço em volta é ruído de edição, não texto lido",
  );

  // "ó" decomposto (o + U+0301) vs pré-composto (U+00F3). macOS usa NFD no
  // sistema de arquivos; sem normalize('NFC') um `git checkout` num Mac mudaria
  // o hash de um texto IDÊNTICO na tela.
  const nfd: EntradaConsentimento[] = FIXTURE.map((e) => ({
    rotulo: e.rotulo.normalize("NFD"),
    descricao: e.descricao.normalize("NFD"),
  }));
  assert(
    nfd[0].rotulo !== FIXTURE[0].rotulo,
    "sanity: a fixture precisa conter acento para que este teste signifique algo",
  );
  assertEquals(
    await calcularHashConsentimento(nfd, VERSAO_FIXTURE),
    base,
    "NFD e NFC do mesmo texto têm de produzir o MESMO hex",
  );
});

// ---------------------------------------------------------------------------
// 5. Sensibilidade à VERSÃO
// ---------------------------------------------------------------------------
Deno.test("5. trocar apenas a versão muda o hex", async () => {
  const base = await calcularHashConsentimento(FIXTURE, VERSAO_FIXTURE);
  assertNotEquals(
    await calcularHashConsentimento(FIXTURE, "vTeste-1"),
    base,
    "a versão entra na prova: mesmo texto sob versão nova é consentimento novo",
  );
});

// ---------------------------------------------------------------------------
// 6. O PIN — o hex do corpus VIVO sob CONSENT_TEXT_VERSION
// ---------------------------------------------------------------------------
Deno.test("6. o hex do consent-text.json vivo bate o valor PINADO", async () => {
  assertEquals(
    corpusV2.versao,
    CONSENT_TEXT_VERSION,
    "a `versao` do JSON e CONSENT_TEXT_VERSION são a mesma verdade escrita duas vezes",
  );

  const hex = await calcularHashConsentimento(
    corpusV2.consentimentos,
    CONSENT_TEXT_VERSION,
  );
  assertEquals(
    hex,
    HEX_PINADO_V2,
    "A copy de consent-text.json mudou sem bump de CONSENT_TEXT_VERSION. " +
      "Isso produziria linhas em public.autorizacoes cujo hash não corresponde " +
      "a texto nenhum. Bumpe a versão nos DOIS arquivos de constantes e " +
      "recompute o pin (instruções no cabeçalho deste arquivo).",
  );
});

// ---------------------------------------------------------------------------
// 7. Forma do corpus + a fronteira do informativo transacional
// ---------------------------------------------------------------------------
Deno.test("7. o corpus vivo tem 3 consentimentos, sem vídeo, e o transacional fica FORA do hash", () => {
  const ids = corpusV2.consentimentos.map((c) => c.id);
  assertEquals(ids, [
    "autorizacao_uso_dados",
    "autorizacao_marketing_vagas",
    "autorizacao_retencao_curriculo",
  ]);

  // BD-2 / CONSENT-05: a coleta de análise de vídeo PAROU. Nenhuma entrada.
  assert(
    !ids.some((id) => id.includes("video")),
    "autorizacao_analise_video não pode existir no corpus v2 (BD-2 / CONSENT-05)",
  );

  // UI-SPEC Invariante 3: o transacional NÃO é consentimento — existe no arquivo
  // (a copy precisa de fonte única também) mas NUNCA entra na serialização.
  assert(
    corpusV2.informativo_transacional !== undefined,
    "o bloco informativo precisa existir — é a copy da linha transacional",
  );
  const serializado = serializarEntradaHash(
    corpusV2.consentimentos,
    CONSENT_TEXT_VERSION,
  );
  assert(
    !serializado.includes(corpusV2.informativo_transacional.rotulo),
    "o rótulo do informativo transacional NÃO pode entrar na entrada do hash: " +
      "a base legal dele é o Art. 7º, V, não o consentimento do titular",
  );
  assert(
    serializado.endsWith(` ${CONSENT_TEXT_VERSION}`),
    `a serialização termina com o separador + a versão: ${serializado.slice(-40)}`,
  );
});
