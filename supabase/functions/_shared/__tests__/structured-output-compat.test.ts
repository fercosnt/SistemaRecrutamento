/**
 * Portão de FORMA: todo schema que alguma EF passa a `callAi({ schema })` tem de ser
 * aceito pelos DOIS construtores de structured output — `zodOutputFormat` (Anthropic) e
 * `zodResponseFormat` (OpenAI, strict mode).
 *
 * Por que existe (2026-09-06, E3 do guia de validação): o TranscriptAnalysisSchema tinha
 * `.optional()` sem `.nullable()` em dois campos. O strict mode da OpenAI proíbe isso e o
 * SDK LANÇA ao montar o schema — dentro do `try` do fallback do ai-client. Resultado: toda
 * vez que a Anthropic falhava (timeout de 60 s na versão viva), o fallback explodia e a EF
 * devolvia 500 sem nenhuma linha em ai_call_logs. O fallback desta EF NUNCA funcionou, e
 * nenhum teste o exercitava porque os testes de handler injetam `zodResponseFormat` no-op.
 *
 * Varre pela FORMA, não por lista: lê `supabase/functions/*\/index.ts`, extrai cada
 * `schema: X` e exige que X esteja no registro abaixo. Um schema novo passado ao callAi e
 * não registrado FALHA aqui — não fica fora da vigilância com o portão verde.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.102.0/helpers/zod";
import { zodResponseFormat } from "npm:openai@6.42.0/helpers/zod";
import * as analise from "../analise-schemas.ts";
import * as avaliacao from "../avaliacao-schemas.ts";
import * as essay from "../essay-schemas.ts";
import * as interview from "../interview-output-schemas.ts";
import { PaginaSchema } from "../../gerar-devolutiva-bigfive/index.ts";

const REGISTRY: Record<string, unknown> = { ...analise, ...avaliacao, ...essay, ...interview, PaginaSchema };

const FUNCTIONS_ROOT = new URL("../../", import.meta.url);

/** `{ arquivo → identificadores }` de todo `schema: X` nos index.ts das EFs. */
async function schemasPassedToCallAi(): Promise<Map<string, Set<string>>> {
  const found = new Map<string, Set<string>>();
  for await (const entry of Deno.readDir(FUNCTIONS_ROOT)) {
    if (!entry.isDirectory || entry.name.startsWith("_")) continue;
    const file = new URL(`${entry.name}/index.ts`, FUNCTIONS_ROOT);
    let src: string;
    try {
      src = await Deno.readTextFile(file);
    } catch {
      continue;
    }
    for (const m of src.matchAll(/\bschema:\s*([A-Z][A-Za-z0-9_]*Schema)\b/g)) {
      if (!found.has(entry.name)) found.set(entry.name, new Set());
      found.get(entry.name)!.add(m[1]);
    }
  }
  return found;
}

Deno.test("todo `schema: X` passado ao callAi está no registro deste teste", async () => {
  const found = await schemasPassedToCallAi();
  assert(found.size >= 6, `esperava ≥6 EFs com callAi({schema}); achou ${found.size}`);
  const missing: string[] = [];
  for (const [ef, ids] of found) {
    for (const id of ids) if (!(id in REGISTRY)) missing.push(`${ef}: ${id}`);
  }
  assertEquals(missing, [], "schema passado ao callAi e não registrado — exporte-o de _shared e acrescente ao REGISTRY");
});

Deno.test("todo schema do callAi é aceito por zodOutputFormat (Anthropic) e zodResponseFormat (OpenAI strict)", async () => {
  const found = await schemasPassedToCallAi();
  const ids = new Set<string>();
  for (const s of found.values()) for (const id of s) ids.add(id);
  const failures: string[] = [];
  for (const id of ids) {
    const schema = REGISTRY[id];
    if (!schema) continue; // já reprovado pelo teste anterior
    try {
      zodOutputFormat(schema as never);
    } catch (e) {
      failures.push(`${id} · anthropic: ${(e as Error).message.split("\n")[0]}`);
    }
    try {
      zodResponseFormat(schema as never, id);
    } catch (e) {
      failures.push(`${id} · openai: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  assertEquals(failures, []);
});
