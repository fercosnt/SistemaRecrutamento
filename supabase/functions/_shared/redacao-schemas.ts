/**
 * `_shared/redacao-schemas.ts` — Zod body schema da Edge Function de redação
 * cultural (`avaliar-redacao-cultural`), em escopo de import do EF (Phase 13).
 *
 * Phase 13 / Plan 13-02 — AVAL-06.
 *
 * SEPARADO de `essay-schemas.ts` de propósito: o `essay-schemas.ts` contém o
 * `EssayScoringV1Schema` (o output estruturado da IA, com os campos de nota). O
 * contrato client↔EF (`src/features/avaliacao/__tests__/redacao-contract.test.ts`,
 * Pitfall 5 / [[feedback_integration_contract_gap]]) faz um source-probe que exige
 * que o arquivo do body schema NÃO carregue nenhum campo de nota/veredito
 * (anti-tamper: o candidato nunca posta uma nota). Por isso o body vive aqui,
 * num arquivo deliberadamente livre de qualquer token de nota.
 *
 * O body carrega APENAS identificadores + o texto da redação — NUNCA uma nota,
 * cor ou threshold. `.strict()` rejeita qualquer campo extra injetado (RNF-07a):
 * o veredito é server-authoritative (derivado no EF, nunca recebido do cliente).
 *
 * Pin Zod 3.25.76 plano (v3) — basta para o `.safeParse` do body; o `/v4` só é
 * load-bearing para os helpers de structured-output da SDK (que operam sobre o
 * `EssayScoringV1Schema`, não sobre este body).
 *
 * @see src/features/avaliacao/__tests__/redacao-contract.test.ts (contrato RED→GREEN)
 * @see supabase/functions/_shared/avaliacao-schemas.ts (AvaliarRedacaoBodySchema — precedente SJT)
 */
import { z } from "npm:zod@3.25.76";

/**
 * Body do POST do candidato para `avaliar-redacao-cultural`. Só identificadores +
 * o texto da redação. `.strict()` rejeita um campo extra injetado — anti-tamper,
 * RNF-07a. O `word_count` 200-500 é revalidado server-side dentro do EF; aqui
 * basta `min(1)` no texto.
 */
export const AvaliarRedacaoCulturalBodySchema = z
  .object({
    candidatura_id: z.string().min(1),
    pergunta_id: z.string().min(1),
    texto: z.string().min(1),
    // WR-03 — segundos decorridos no editor (anti-cheat `tempo_anormalmente_curto`,
    // <90s). Sinal de tempo, NÃO uma nota — não viola o anti-tamper. Opcional p/
    // compat: clientes que não enviam caem no default 0 (flag tratada como dead).
    // O EF revalida word_count server-side; o tempo é advisory (o humano decide).
    tempo_gasto_segundos: z.number().int().nonnegative().optional(),
  })
  .strict();

export type AvaliarRedacaoCulturalBody = z.infer<typeof AvaliarRedacaoCulturalBodySchema>;
