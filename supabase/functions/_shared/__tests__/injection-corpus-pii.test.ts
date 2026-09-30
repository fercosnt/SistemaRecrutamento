/**
 * Phase 49 / Plan 49-36 — portão G1 de PII sobre o corpus REAL de PROD do detector de injeção.
 *
 * O corpus `fixtures/corpus-injecao-prod.json` é texto de PROD (transcrições, CVs, redações,
 * respostas, comparativos e texto do sistema) MASCARADO por `scripts/p49_36_corpus_injecao.mjs`
 * (regra M1..M5, nomeada no cabeçalho do script e no campo `regra_mascara`). Ele vai para o git e,
 * pelo `main`, para a Vercel: um identificador que escape da máscara exige reescrever histórico.
 *
 * O que este teste PROVA — e só isso (a afirmação é do tamanho do que é conferido):
 *   (a) nenhuma forma que o `maskPII` do runtime reconhece (CPF, CNPJ, e-mail, telefone, data de
 *       nascimento, endereço, RG) sobrou no texto — o verificador roda o PRÓPRIO `maskPII`;
 *   (b) nenhuma sequência de 2 ou mais dígitos;
 *   (c) nenhum «@»;
 *   (d) nenhuma palavra com inicial maiúscula no MEIO de oração fora de `ALLOWLIST_MAIUSCULAS`
 *       (nome de terceiro no meio da frase, cidade, clínica anterior).
 * O que ele NÃO prova: nome no INÍCIO de oração e nome digitado em minúscula. Os nomes CADASTRADOS
 * (candidatos e usuários do RH) são conferidos pelo portão G2 (`--checar-nomes` do script, que lê
 * PROD só-leitura); o resto é da LEITURA HUMANA do corpus inteiro, registrada antes do primeiro
 * commit do arquivo (checkpoint da Task 2 do 49-36).
 *
 * O verificador é exportado e é aplicado PRIMEIRO a frases sintéticas ruins, que TÊM de ser
 * acusadas: um portão que nunca foi visto reprovar não prova que morde.
 *
 * `CORPUS_PATH` (env) troca o arquivo lido — é assim que a mordida sobre uma CÓPIA com PII
 * injetada é provada sem tocar o fixture.
 *
 * Run: deno test --allow-all supabase/functions/_shared/__tests__/injection-corpus-pii.test.ts
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { maskPII } from "../pii-masker.ts";

/**
 * Tokens com inicial maiúscula que PODEM ficar no meio de oração. Escopo DELIBERADO: siglas e
 * marcas do domínio, nunca nome de pessoa, cidade ou empresa. A mesma lista existe no script
 * (`ALLOWLIST_MAIUSCULAS`); se o script deixar passar um token que não está aqui, ESTE teste
 * reprova — a divergência é ruidosa, não silenciosa.
 */
export const ALLOWLIST_MAIUSCULAS: ReadonlySet<string> = new Set([
  "IA",
  "RH",
  "CV",
  "BS",
  "LLM",
  "Beauty",
  "Smile",
  "WhatsApp",
  // Pronomes de tratamento (não identificam ninguém; o NOME depois deles é mascarado, porque o
  // ponto da abreviação não abre oração — ver `abreOracao`).
  "Dr",
  "Dra",
  "Sr",
  "Sra",
  "Srta",
  "Prof",
  "Profa",
]);

/**
 * Placeholders que a máscara produz; o que está DENTRO deles não é nome. Casados como TRECHO, não
 * como token: `[DATA_NASC]` vira dois tokens de letra («DATA», «NASC») e o segundo não é vizinho
 * de colchete.
 */
const PLACEHOLDER_RE = /\[(?:NOME|N|URL|CPF|CNPJ|EMAIL|DATA_NASC|TELEFONE|ENDERECO|RG)\]/gu;

function dentroDePlaceholder(texto: string): (idx: number) => boolean {
  const spans: Array<[number, number]> = [];
  for (const m of texto.matchAll(PLACEHOLDER_RE)) spans.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  return (idx) => spans.some(([a, b]) => idx >= a && idx < b);
}

/** Abreviações de tratamento: o ponto delas NÃO abre oração («Dr. Fulano»). */
const TRATAMENTOS: ReadonlySet<string> = new Set(["dr", "dra", "sr", "sra", "srta", "prof", "profa"]);

/**
 * O token que começa em `idx` abre oração? Início do texto, quebra de linha, ou `. ! ? : ; …`
 * antes dele (pulando espaço e pontuação de abertura). O ponto de «Dr.»/«Sra.» não conta.
 */
export function abreOracao(texto: string, idx: number): boolean {
  let i = idx - 1;
  while (i >= 0 && /[\s"'«“‘(*•\-–—#>_]/u.test(texto[i])) {
    if (texto[i] === "\n") return true;
    i--;
  }
  if (i < 0) return true;
  if (!/[.!?:;…]/u.test(texto[i])) return false;
  if (texto[i] === ".") {
    const antes = texto.slice(0, i).match(/[\p{L}]+$/u);
    if (antes && TRATAMENTOS.has(antes[0].toLowerCase())) return false;
  }
  return true;
}

export type Violacao = "maskPII" | "digitos" | "arroba" | "maiuscula";

/**
 * Verificador G1: devolve as CLASSES de violação achadas num texto (sem ecoar o trecho — a saída
 * do teste não deve reimprimir o identificador que acusou).
 */
export function verificarPII(texto: string): Violacao[] {
  const v: Violacao[] = [];
  if (maskPII(texto).placeholders.length > 0) v.push("maskPII");
  if (/\d{2,}/u.test(texto)) v.push("digitos");
  if (texto.includes("@")) v.push("arroba");
  const emPlaceholder = dentroDePlaceholder(texto);
  for (const m of texto.matchAll(/[\p{L}\p{M}]+/gu)) {
    const tok = m[0];
    const idx = m.index ?? 0;
    if (!/^\p{Lu}/u.test(tok)) continue;
    if (ALLOWLIST_MAIUSCULAS.has(tok)) continue;
    if (emPlaceholder(idx)) continue;
    if (abreOracao(texto, idx)) continue;
    v.push("maiuscula");
    break;
  }
  return v;
}

// ── Autoteste: o verificador MORDE (frases sintéticas, nenhuma de PROD) ──────────────────────
const SINTETICAS_RUINS: ReadonlyArray<[string, Violacao]> = [
  ["Pode mandar para joao@exemplo.com depois da entrevista.", "arroba"],
  ["O documento dela é 123.456.789-00, confere.", "maskPII"],
  ["Trabalhei na recepção em 2019 e gostei.", "digitos"],
  ["Ontem eu falei com a Joana na recepção.", "maiuscula"],
];

for (const [frase, esperada] of SINTETICAS_RUINS) {
  Deno.test(`G1 autoteste: acusa ${esperada} — «${frase}»`, () => {
    const v = verificarPII(frase);
    assert(v.includes(esperada), `o verificador NÃO acusou ${esperada}: ${JSON.stringify(v)}`);
  });
}

Deno.test("G1 autoteste: não acusa texto limpo (o verificador não reprova tudo)", () => {
  const limpas = [
    "Ontem eu falei com a [NOME] na recepção.",
    "Trabalhei na recepção em [N] e gostei.",
    "A Beauty Smile usa IA no RH. Você viu o CV? Sim.",
    "Falei com o Dr. [NOME] e com a Sra. [NOME] hoje.",
    "Resumo: Ela chegou cedo.\nDepois saiu.",
    "Nasceu em [DATA_NASC], mora na [ENDERECO] e o perfil é [URL].",
  ];
  for (const t of limpas) assertEquals(verificarPII(t), [], `falso positivo do verificador em «${t}»`);
});

Deno.test("G1 autoteste: o ponto de tratamento não abre oração («Dr. Fulano» é acusado)", () => {
  assert(verificarPII("Falei com o Dr. Fulano hoje.").includes("maiuscula"));
});

// ── O corpus ─────────────────────────────────────────────────────────────────────────────────
type Entrada = { texto: string; fonte?: string; limite?: string; regra?: string };
type Corpus = {
  versao?: number;
  regra_mascara?: unknown;
  benignos?: Entrada[];
  adversariais?: Entrada[];
  sem_familia?: Entrada[];
  conflitos?: Entrada[];
  pendentes?: Entrada[];
};

const CORPUS_URL = Deno.env.get("CORPUS_PATH") ??
  new URL("./fixtures/corpus-injecao-prod.json", import.meta.url).pathname;

async function carregarCorpus(): Promise<Corpus | null> {
  try {
    return JSON.parse(await Deno.readTextFile(CORPUS_URL)) as Corpus;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return null;
    throw e;
  }
}

const ARRAYS = ["benignos", "adversariais", "sem_familia", "conflitos", "pendentes"] as const;

Deno.test("G1: o corpus existe e tem população (≥ 1 entrada rotulada)", async () => {
  const c = await carregarCorpus();
  assert(c !== null, `corpus ausente em ${CORPUS_URL} — gere com scripts/p49_36_corpus_injecao.mjs --gerar`);
  const n = (c.benignos?.length ?? 0) + (c.adversariais?.length ?? 0) + (c.sem_familia?.length ?? 0);
  assert(n > 0, "corpus sem nenhuma entrada rotulada: um portão sobre população vazia não prova nada");
  assert(c.regra_mascara, "corpus sem `regra_mascara`");
});

Deno.test("G1: nenhuma entrada em `pendentes` (toda frase foi rotulada)", async () => {
  const c = await carregarCorpus();
  assert(c !== null, `corpus ausente em ${CORPUS_URL}`);
  assertEquals(c.pendentes?.length ?? 0, 0, "há frases sem rótulo em `pendentes`");
});

Deno.test("G1: nenhuma forma de PII coberta por G1 em NENHUMA frase do corpus", async () => {
  const c = await carregarCorpus();
  assert(c !== null, `corpus ausente em ${CORPUS_URL}`);
  const achados: string[] = [];
  for (const k of ARRAYS) {
    (c[k] ?? []).forEach((e, i) => {
      const v = verificarPII(String(e.texto ?? ""));
      if (v.length) achados.push(`${k}[${i}]: ${v.join(",")}`);
    });
  }
  assertEquals(achados, [], "entradas com forma de PII (índice e classe; o trecho não é reimpresso)");
});
