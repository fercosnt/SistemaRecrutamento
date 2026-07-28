/**
 * `avaliar-redacao-cultural/_local/compute-score.ts` — pipeline DETERMINÍSTICO
 * de scoring + 3 caps + sistema 3-cores (Phase 13).
 *
 * Phase 13 / Plan 13-01 — AVAL-06.
 *
 * Transcrito VERBATIM de `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md` §8.3.
 * Estes caps e a classificação 3-cores são CÓDIGO determinístico do Edge Function,
 * NUNCA o LLM (anti-pattern: jamais deixar o LLM decidir cor/cap). O LLM só emite
 * os scores brutos 1-5 por dimensão; este módulo deriva o score ponderado, aplica
 * os 3 caps e classifica a cor a partir do threshold per-vaga.
 *
 *   Pesos iguais V1 (25% cada): score_geral = (Σ dims válidas / n) × 20.
 *   Cap (a) red_flag_etico  → MIN(score, 30) + flag 'red_flag_etico'
 *   Cap (b) D1 ≤ 2          → MIN(score, 50) + flag 'situacao_generica_ou_inventada'
 *   Cap (c) word_count < 200 tratado upstream (submit-redacao rejeita; não aqui)
 *   flag 'tempo_anormalmente_curto' se tempo_gasto_segundos < 90
 *   3-cores (threshold per-vaga, default {vermelho_max:40, amarelo_max:64}):
 *     vermelho se score ≤ vermelho_max OR red_flag_etico OR D1≤2
 *     amarelo  se score ≤ amarelo_max
 *     verde    caso contrário
 *
 * @see docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md §8.3 (fonte BINDING — verbatim)
 * @see supabase/functions/_shared/essay-schemas.ts (tipo EssayScoringV1 importado aqui)
 */
import type { EssayScoringV1 } from "../../_shared/essay-schemas.ts";

export function computeScoreAndCors(
  parsed: EssayScoringV1,
  threshold: { vermelho_max: number; amarelo_max: number },
  wordCount: number,
  tempoSegundos: number,
): { scoreGeral: number; classificacaoCor: "verde" | "amarelo" | "vermelho"; flags: string[]; redFlagEtico: boolean } {
  const flags: string[] = [];
  const dims = parsed.dimension_scores;

  // Pesos iguais V1 (25% cada — calibrar V2 com dados)
  let sum = 0, validDims = 0;
  for (const d of dims) {
    if (d.score === "insufficient_evidence") {
      flags.push(`${d.dimension}_insufficient_evidence`);
      continue;
    }
    sum += d.score as number;
    validDims++;
  }
  let scoreGeral = validDims > 0 ? Math.round((sum / validDims) * 20 * 100) / 100 : 0;

  // Cap (a) — red_flag_etico
  const redFlagEtico = parsed.red_flag_etico ?? false;
  if (redFlagEtico) {
    scoreGeral = Math.min(scoreGeral, 30);
    flags.push("red_flag_etico");
  }

  // Cap (b) — D1 ≤ 2
  const dim1 = dims.find((d) => d.dimension === "D1");
  if (dim1 && typeof dim1.score === "number" && dim1.score <= 2) {
    scoreGeral = Math.min(scoreGeral, 50);
    flags.push("situacao_generica_ou_inventada");
  }

  // Flag tempo anormalmente curto
  if (tempoSegundos < 90) flags.push("tempo_anormalmente_curto");

  // Cap (c) já tratado upstream (Edge Function `submit-redacao` rejeita < 200 palavras)

  // Classificação 3 cores
  let classificacaoCor: "verde" | "amarelo" | "vermelho";
  if (scoreGeral <= threshold.vermelho_max || redFlagEtico || (dim1 && typeof dim1.score === "number" && dim1.score <= 2)) {
    classificacaoCor = "vermelho";
  } else if (scoreGeral <= threshold.amarelo_max) {
    classificacaoCor = "amarelo";
  } else {
    classificacaoCor = "verde";
  }

  return { scoreGeral, classificacaoCor, flags: [...new Set(flags)], redFlagEtico };
}

export function normalizeForHash(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[.,!?;:"'\(\)\[\]\{\}\-—–_]/g, "") // remove pontuação
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
