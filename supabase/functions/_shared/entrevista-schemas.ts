/**
 * `_shared/entrevista-schemas.ts` — Zod body schemas das duas Edge Functions de
 * entrevista (`gerar-guia-entrevista` + `avaliar-transcricao-entrevista`), em
 * escopo de import do EF (Phase 14).
 *
 * Phase 14 / Plan 14-01 — ENTREV-01/03/04.
 *
 * SEPARADO dos schemas de OUTPUT (`InterviewGuideSchema`/`TranscriptAnalysisSchema`
 * em `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts`) de propósito:
 * aqueles são o output estruturado da IA (carregam scores BARS, bias_flags). O
 * contrato client↔EF (`src/features/entrevista/__tests__/entrevista-contract.test.ts`,
 * Pitfall 5 / [[feedback_integration_contract_gap]]) faz um source-probe que exige
 * que ESTE arquivo de body schema NÃO carregue nenhum campo de nota/banda/veredito
 * (anti-tamper: o cliente nunca posta uma nota). Por isso o body vive aqui, num
 * arquivo deliberadamente livre de qualquer token de nota.
 *
 * Os bodies carregam APENAS identificadores + o texto bruto da transcrição —
 * NUNCA uma nota, banda ou threshold. `.strict()` rejeita qualquer campo extra
 * injetado (RNF-07a): o veredito é server-authoritative (derivado no EF, nunca
 * recebido do cliente).
 *
 * Pin Zod 3.25.76 plano (v3) — basta para o `.safeParse` do body; o `/v4` só é
 * load-bearing para os helpers de structured-output da SDK (que operam sobre os
 * schemas de OUTPUT `InterviewGuideSchema`/`TranscriptAnalysisSchema`, não sobre
 * estes bodies — Pitfall 3).
 *
 * NOTE [[feedback_integration_contract_gap]]: quando `database.types.ts` regenerar
 * (Plan 14-04 apply wave), remover quaisquer casts `as never` introduzidos no
 * client/service da entrevista — eles mascaram colunas inexistentes pré-apply.
 *
 * @see src/features/entrevista/__tests__/entrevista-contract.test.ts (contrato RED→GREEN)
 * @see supabase/functions/_shared/redacao-schemas.ts (AvaliarRedacaoCulturalBodySchema — precedente Phase 13)
 * @see supabase/functions/_shared/cognitivo-schemas.ts (SubmitCognitivoBodySchema — body do candidato)
 */
import { z } from 'zod';

/**
 * Body do POST do RH para `gerar-guia-entrevista`. Só identificadores + o formato
 * da entrevista (online | presencial). `.strict()` rejeita um campo extra injetado
 * — anti-tamper, RNF-07a. O EF resolve o scorecard prévio (Etapa 3) server-side a
 * partir do `candidatura_id`; o cliente jamais posta scores/banda.
 */
export const GerarGuiaBodySchema = z
  .object({
    candidatura_id: z.string().min(1),
    vaga_id: z.string().min(1),
    tipo: z.enum(["online", "presencial"]),
  })
  .strict();

export type GerarGuiaBody = z.infer<typeof GerarGuiaBodySchema>;

/**
 * Body do POST do RH para `avaliar-transcricao-entrevista`. Só o `candidatura_id`,
 * o texto bruto da transcrição (UNTRUSTED — o `callAi` faz injection-detect +
 * maskPII internamente) e DE QUAL entrevista ele é. `.strict()` rejeita um campo
 * extra injetado — anti-tamper, RNF-07a. O `len(transcricao) >= 200` é revalidado
 * server-side dentro do EF; aqui basta `min(1)` no texto.
 *
 * `tipo` (Phase 49 / 49-10 / D-41): qual entrevista gerou esta transcrição. É o RH
 * quem escolhe — a etapa atual da candidatura serve só de PADRÃO, porque analisar a
 * transcrição da online quando o candidato já está em presencial é legítimo e comum.
 * A análise sem `tipo` não sabe de qual entrevista é, e foi assim que as 6 análises
 * vivas em PROD nasceram (medido 2026-09-22: `tipo` NULL em todas as 6).
 *
 * ⚠ OPCIONAL de propósito, e a ordem é o motivo (Pitfall 4 / D-55): esta EF é
 *   deployada ANTES de o front passar a mandar o campo (a tela é do plano 49-16).
 *   Entre os dois deploys, o cliente vivo manda `{candidatura_id, transcricao}` — com
 *   `tipo` obrigatório, `.strict()` recusaria TODA análise nesse intervalo. A EF
 *   resolve o padrão a partir da etapa; fora de etapa de entrevista ela devolve 400
 *   pedindo o tipo, em vez de gravar um palpite.
 */
export const AvaliarTranscricaoBodySchema = z
  .object({
    candidatura_id: z.string().min(1),
    transcricao: z.string().min(1),
    tipo: z.enum(["online", "presencial"]).optional(),
  })
  .strict();

export type AvaliarTranscricaoBody = z.infer<typeof AvaliarTranscricaoBodySchema>;
