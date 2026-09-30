/**
 * Phase 49 / Plano 49-38 — `_shared/sinal-revisao.ts` (JORN-41).
 *
 * O vocabulário do SINAL de revisão (nível `flag` do detector de injeção) mora num lugar
 * só, e é lido por dois lados que não compartilham runtime: as EFs (Deno, 49-39/49-40)
 * gravam o código nas formas persistidas de cada tabela, e as telas do RH/admin
 * (Vite, 49-41/49-42) o leem de volta. Este arquivo tranca as duas pontas:
 *
 *   - `sinaisDe` lê TODAS as formas persistidas (array de códigos em `flags`/`motivos_revisao`/
 *     `sinais_revisao`; array de objetos com `sinal` em `entrevista_analises.bias_flags`) e
 *     devolve `[]` para qualquer outra coisa — um leitor que lança ou devolve lixo com um
 *     `jsonb` inesperado quebraria a tela inteira por causa de uma linha;
 *   - `comSinal` acrescenta sem duplicar (reprocessar não pode empilhar o mesmo código);
 *   - `rotuloDoSinal` degrada para o próprio código (código cru na tela é feio, célula vazia
 *     se lê como «sem sinal», que é pior).
 *
 * O módulo é importado DENTRO de cada teste: antes do GREEN do 49-38 ele não existe, e cada
 * teste reprova por si, nomeado — não o arquivo inteiro de uma vez.
 *
 * Run: deno test --allow-read supabase/functions/_shared/__tests__/sinal-revisao.test.ts
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const FONTE = new URL("../sinal-revisao.ts", import.meta.url);

type ModuloSinal = {
  SINAL_INSTRUCAO_AO_MODELO: string;
  ROTULO_SINAL: Record<string, string>;
  rotuloDoSinal: (codigo: string) => string;
  sinaisDe: (valor: unknown) => string[];
  comSinal: (lista: readonly string[] | null | undefined, codigo: string) => string[];
};

async function carregar(): Promise<ModuloSinal> {
  return (await import("../sinal-revisao.ts")) as unknown as ModuloSinal;
}

Deno.test("sinal-revisao — zero imports (o front o importa por caminho relativo)", async () => {
  const fonte = await Deno.readTextFile(FONTE);
  assert(
    !/^\s*import\s/m.test(fonte),
    "um único import impediria o `src/` de importar este arquivo — contrato de " +
      "`resultado-de-provedor.ts` e `ai-error-codes.ts`",
  );
});

Deno.test("sinal-revisao — o código do sinal é `instrucao_ao_modelo`", async () => {
  const m = await carregar();
  assertEquals(m.SINAL_INSTRUCAO_AO_MODELO, "instrucao_ao_modelo");
});

Deno.test("sinal-revisao — rotuloDoSinal devolve o rótulo pt-BR do código conhecido", async () => {
  const m = await carregar();
  assertEquals(
    m.rotuloDoSinal("instrucao_ao_modelo"),
    "Possível instrução dirigida à IA no texto analisado — revise o texto antes de considerar este resultado",
  );
  assertEquals(m.ROTULO_SINAL[m.SINAL_INSTRUCAO_AO_MODELO], m.rotuloDoSinal(m.SINAL_INSTRUCAO_AO_MODELO));
});

Deno.test("sinal-revisao — rotuloDoSinal de código desconhecido volta como o próprio código", async () => {
  const m = await carregar();
  assertEquals(m.rotuloDoSinal("codigo_que_nao_existe"), "codigo_que_nao_existe");
});

Deno.test("sinal-revisao — sinaisDe lê um array de códigos (flags / motivos_revisao / sinais_revisao)", async () => {
  const m = await carregar();
  assertEquals(m.sinaisDe(["a", "b"]), ["a", "b"]);
});

Deno.test("sinal-revisao — sinaisDe lê o elemento `{ sinal }` de bias_flags e ignora os demais objetos", async () => {
  const m = await carregar();
  assertEquals(
    m.sinaisDe([{ competency: "X" }, { sinal: "instrucao_ao_modelo" }]),
    ["instrucao_ao_modelo"],
  );
});

Deno.test("sinal-revisao — sinaisDe devolve [] para null, objeto e string", async () => {
  const m = await carregar();
  assertEquals(m.sinaisDe(null), []);
  assertEquals(m.sinaisDe({}), []);
  assertEquals(m.sinaisDe("x"), []);
  assertEquals(m.sinaisDe(undefined), []);
});

Deno.test("sinal-revisao — comSinal acrescenta sem duplicar", async () => {
  const m = await carregar();
  assertEquals(m.comSinal(["a"], "instrucao_ao_modelo"), ["a", "instrucao_ao_modelo"]);
  assertEquals(
    m.comSinal(["a", "instrucao_ao_modelo"], "instrucao_ao_modelo"),
    ["a", "instrucao_ao_modelo"],
    "reprocessar a mesma entrada não pode empilhar o mesmo código",
  );
  assertEquals(m.comSinal(null, "instrucao_ao_modelo"), ["instrucao_ao_modelo"]);
});
