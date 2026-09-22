/**
 * `_shared/comparativo-config.ts` — o teto de candidatos do comparativo, num lugar só.
 *
 * Phase 49 / plano 49-08 — D-59 (ex-D-29). ⚠ ZERO IMPORTS por design (o mesmo contrato de
 * `_shared/email-config.ts:12-17` e de `_shared/candidaturaEncerrada.ts`): nenhum `npm:`,
 * nenhum `https://deno.land/std`, nenhum relativo. É o que permite ao front importar por
 * caminho RELATIVO sem arrastar um especificador Deno para o grafo do bundle do Vite —
 * precedentes vivos: `src/features/privacidade/services/exportacaoService.ts:61`
 * (`EXPORT_ALLOWLIST`) e o reexport de `candidaturaEncerrada` (49-03).
 *
 * ─── O QUE ESTAVA ERRADO (medido em PROD, só leitura) ─────────────────────────────────
 *
 * O número vivia em OITO lugares (varredura C1 #17 do kickoff, re-rodada em 2026-09-22):
 * `comparativo-candidatos/index.ts:169,172`; `analise-schemas.ts:156` (`.max(10)`);
 * `TriagemTable.tsx:50,52,214,267,425`; `ComparativoCandidatosPage.tsx:103,172`;
 * `DecisaoFinalPage.tsx:123,201`; `__tests__/index.test.ts:212,229`. Oito lugares para um
 * número é oito chances de o front OFERECER uma seleção que a Edge Function recusa — ou,
 * pior, de a EF ACEITAR um pedido que não cabe no tempo do modelo e devolver o ranking do
 * modelo de fallback como se fosse o configurado.
 *
 * Foi o que aconteceu em 2026-09-20: um comparativo de **6 candidatos** truncou em
 * `max_tokens=3000` (`ai_call_logs`, JSON cortado na posição 9290), o parse falhou, e a
 * resposta saiu do `gpt-4o-mini` registrada como SUCESSO. O teto de 10 nunca foi medido —
 * ele foi escrito antes de o Sonnet ser o provedor efetivo.
 *
 * ─── A CONTA (D-59) ──────────────────────────────────────────────────────────────────
 *
 * Throughput Sonnet medido no pior caso de saída longa: **45 tok/s** (`interview_guide`,
 * 4436 tok em 98,4 s). O teto por tentativa é 110 s (1 tentativa — `index.ts` passa
 * `timeoutMs: 110_000`). Reservando ~30 s (27 %) para DB, TTFT e variância, sobram **80 s**
 * de geração:
 *
 *     80 s × 45 tok/s = 3600 tokens  ⇒  `prompt_versions.max_tokens = 3600`
 *                                        (migration `20260922000005_p49_comparativo_max_tokens.sql`)
 *
 * Modelo conservador de saída (P ≈ 410 tok/candidato, parte fixa F ≈ 1500 tok):
 *
 *     n = 4  ⇒  1500 + 4×410 = 3140 tok  = 87 % do teto   ← com folga
 *     n = 5  ⇒  1500 + 5×410 = 3550 tok  = 99 % do teto   ← sem folga nenhuma
 *
 * **Maior n com folga no modelo conservador = 4.** Daí `COMPARATIVO_MAX_CANDIDATOS = 4`.
 *
 * ⚠ MUDAR O TETO É MUDAR DUAS COISAS. Este arquivo e o `max_tokens` da linha ativa de
 * `comparative_ranking` em `prompt_versions` andam JUNTOS: subir o teto de candidatos sem
 * subir o `max_tokens` traz de volta exatamente o truncamento de 20/09; subir o `max_tokens`
 * sem medir o throughput troca truncamento por TIMEOUT, que é pior (a saída maior demora
 * mais, e o log dirá `anthropic_timeout` em vez de `anthropic_max_tokens`).
 *
 * A premissa A3 do RESEARCH (P ≈ 280–410 tok/candidato) é MEDIDA pela prova n=4 do plano
 * 49-18: se a saída real passar de 3140 tok, o teto volta ao operador antes de fechar a fase.
 *
 * ─── QUEM CONSOME ────────────────────────────────────────────────────────────────────
 *
 *   - `comparativo-candidatos/index.ts` — a recusa ANTES da chamada de IA, com a mensagem
 *     montada DESTAS constantes (não de um literal paralelo que envelhece sozinho).
 *   - `_shared/analise-schemas.ts` — `ComparativeRankingSchema.ranked_candidates.max(...)`.
 *     A direção de import é esta e só esta: `analise-schemas.ts` importa `npm:zod`, então
 *     ele PODE importar daqui; o contrário quebraria o contrato de zero imports.
 *   - o front (plano 49-22) — `TriagemTable`, `ComparativoCandidatosPage`, `DecisaoFinalPage`,
 *     por caminho relativo, substituindo `COMPARE_MAX`/`COMPARE_MIN`.
 *
 * @module supabase/functions/_shared/comparativo-config
 * @see supabase/migrations/20260922000005_p49_comparativo_max_tokens.sql (o `max_tokens` irmão)
 * @see .planning/phases/49-consertos-da-jornada-bloco-2/49-RESEARCH.md (§D-29 — a conta e as medições)
 */

/** Mínimo de candidatos para que haja comparação — comparar 1 com ninguém não é comparar. */
export const COMPARATIVO_MIN_CANDIDATOS = 2 as const;

/**
 * Máximo de candidatos por comparativo. 4, e não 10: é o maior n cujo pior caso de saída
 * (3140 tok) ainda cabe com folga no teto de 3600 tok que os 110 s de timeout permitem.
 * Ver a conta no docblock do módulo.
 */
export const COMPARATIVO_MAX_CANDIDATOS = 4 as const;
