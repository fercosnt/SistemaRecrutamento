/**
 * `_shared/cognitivo-schemas.ts` — Zod body schema do POST do candidato à Edge
 * Function / RPC de avaliação cognitiva (raciocínio lógico, Etapa 3), em escopo
 * de import do EF (Phase 14).
 *
 * Phase 14 / Plan 14-01 — ENTREV-05.
 *
 * O candidato manda APENAS as escolhas brutas (`raw_responses`) + o `shuffle_seed`
 * + timings opcionais — NUNCA um score/banda. O servidor re-pontua determinística-
 * mente a partir de `raw_responses` (anti-tamper, idêntico ao padrão `submit-
 * bigfive-final`). `.strict()` rejeita qualquer campo extra injetado (RNF-07a).
 *
 * O `BandaCognitivaEnum` (5 faixas, snake_case pt-BR) é a banda qualitativa
 * server-derivada (PRD-cognitivo §8.2 L191). Vive aqui para o scorer (`cognitivo/
 * scoring.ts`) e o RPC consumirem o mesmo enum literal sem drift; é OUTPUT
 * server-side — o body do candidato NUNCA o carrega (o `.strict()` rejeita).
 *
 * Pin Zod 3.25.76 plano (v3) — basta para o `.safeParse` do body.
 *
 * @see supabase/functions/_shared/cognitivo/scoring.ts (scoreRaciocinio — consome BandaCognitivaEnum)
 * @see docs/prds/m2-funil-rh/PRD-cognitivo-raciocinio.md §8.2 L191 (banda enum 5 faixas), §8.4 L206 (body do submit)
 */
import { z } from "npm:zod@3.25.76";

/**
 * Banda qualitativa cognitiva — 5 faixas, snake_case pt-BR (PRD-cognitivo §8.2 L191).
 * Server-derivada a partir do total CTT; descritiva, NUNCA percentil/"QI" (RNF-12).
 * Rótulos UI (Q-C3 lockado): "Bem acima / acima / na média / abaixo / bem abaixo
 * da média dos candidatos".
 */
export const BandaCognitivaEnum = z.enum([
  "bem_abaixo",
  "abaixo",
  "na_media",
  "acima",
  "bem_acima",
]);

export type BandaCognitiva = z.infer<typeof BandaCognitivaEnum>;

/**
 * Body do POST do candidato ao "Concluir" a prova cognitiva (`submit-cognitivo` EF
 * ou `pontuar_cognitivo` RPC). Só as escolhas brutas + a seed do shuffle + timings
 * opcionais. `.strict()` rejeita um campo `score`/`banda`/`banda_cognitiva` injetado
 * — anti-tamper, RNF-07a. O servidor re-pontua de `raw_responses` (NUNCA confia
 * num score do cliente — padrão `submit-bigfive-final`).
 *
 * `raw_responses`: { itemId → optionIndex }. `client_timings` é advisory (sinal de
 * tempo por item, não uma nota); opcional para compat.
 */
export const SubmitCognitivoBodySchema = z
  .object({
    candidatura_id: z.string().min(1),
    raw_responses: z.record(z.string(), z.number().int()),
    shuffle_seed: z.string().min(1),
    client_timings: z.array(z.number()).optional(),
  })
  .strict();

export type SubmitCognitivoBody = z.infer<typeof SubmitCognitivoBodySchema>;
