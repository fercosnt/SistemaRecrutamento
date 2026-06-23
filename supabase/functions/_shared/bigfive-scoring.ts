/**
 * `_shared/bigfive-scoring.ts` — IPIP-NEO-120 TS-port server-side scorer (AVAL-04 / RF-15).
 *
 * THE highest-blast-radius module of Phase 12. A single mis-typed reverse-keyed id
 * silently corrupts a facet raw → the domain T-score → the percentile → the band →
 * the devolutiva band template, with NO error thrown (RESEARCH Pitfall 1). The
 * reverse-key set, the facet→domain map, the facet formula, the T-score, the
 * percentile cubic, and the band cutoffs are all transcribed VERBATIM from the
 * on-disk source (cited below). The scoring/reverse key NEVER reaches the client —
 * the candidate posts only Likert 1-5; the EF re-scores server-side (anti-tamper).
 *
 * NORM TABLE — V1 fallback. The full Johnson 2014 international norm table (560
 * mean/sd values, 8 groups × [5 domain mean + 5 domain sd + 30 facet mean + 30
 * facet sd]) lives in `NeuroQuestAi/five-factor-e/ipipneo/norm.py` (MIT,
 * Johnson-approved) and is NOT present in this repo (verified 2026-06-09; only the
 * item JSONs are in docs/conhecimento/big-five/fontes/). Per 12-CONTEXT post-research,
 * V1 falls back to the combined sex='N' adult norm only, with mean centered on the
 * scale midpoint. Percentile precision is a V2/UAT refinement — Big Five is
 * CONTEXTUAL and decides nothing (RNF-07a), so an approximate percentile carries no
 * eliminatory weight. When norm.py is obtained, replace NORMS with the full table
 * keyed by NormGroup and pin the source commit here.
 *
 * @see docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md L289-294 (reverse set), L304-361 (T + cubic + Python reference), L416-429 (norm strategy)
 * @see supabase/functions/_shared/bigfive-scoring.test.ts (the 12-01 golden test this satisfies)
 */

// ============================================================================
// SCORING KEY (server-side only — NEVER exposed to the candidate)
// ============================================================================

/**
 * The 55 reverse-keyed item ids, transcribed VERBATIM from PESQUISA L289-294.
 * Per-domain counts: N7 E6 O12 A17 C13 = 55 (asserted by the golden test).
 */
export const REVERSED: Set<number> = new Set<number>([
  // Neuroticismo (N) — 7
  51, 81, 96, 101, 106, 111, 116,
  // Extroversão (E) — 6
  62, 67, 92, 97, 102, 107,
  // Abertura (O) — 12
  48, 53, 68, 73, 78, 83, 88, 98, 103, 108, 113, 118,
  // Amabilidade (A) — 17
  9, 19, 24, 39, 49, 54, 69, 74, 79, 84, 89, 94, 99, 104, 109, 114, 119,
  // Conscienciosidade (C) — 13
  30, 40, 60, 70, 75, 80, 85, 90, 100, 105, 110, 115, 120,
]);

export type Domain = "O" | "C" | "E" | "A" | "N";

/**
 * 30-facet → domain map (PESQUISA L342-348): facets cycle N,E,O,A,C across 1..30.
 */
export const FACET_TO_DOMAIN: Record<number, Domain> = {
  1: "N", 6: "N", 11: "N", 16: "N", 21: "N", 26: "N",
  2: "E", 7: "E", 12: "E", 17: "E", 22: "E", 27: "E",
  3: "O", 8: "O", 13: "O", 18: "O", 23: "O", 28: "O",
  4: "A", 9: "A", 14: "A", 19: "A", 24: "A", 29: "A",
  5: "C", 10: "C", 15: "C", 20: "C", 25: "C", 30: "C",
};

/** faceta = ((id-1) % 30) + 1 (PESQUISA L353). Each facet has exactly 4 items. */
export const facetOf = (id: number): number => ((id - 1) % 30) + 1;

/** Reverse correction (PESQUISA L282): corrected = 6 - original. */
export const reverse = (v: number): number => 6 - v;

// ============================================================================
// NORM TABLE — V1 fallback (combined sex='N' adult)
// ============================================================================

export type NormGroup = { sexo: "M" | "F" | "N"; faixa: string };

interface NormSet {
  domain: Record<Domain, { mean: number; sd: number }>;
  facet: Record<number, { mean: number; sd: number }>;
}

// V1 fallback — precision is a V2/UAT refinement; Big Five is contextual.
// Domain raw range is 24-120 (mid 72); facet raw range is 4-20 (mid 12). We center
// the fallback norm on the scale midpoint with a representative spread, so a neutral
// response vector yields T≈50 / a mid-band percentile. Replace with the Johnson
// 2014 norm.py table (per NormGroup) in V2.
const FALLBACK_DOMAIN_MEAN = 72; // midpoint of 24..120
const FALLBACK_DOMAIN_SD = 18;
const FALLBACK_FACET_MEAN = 12; // midpoint of 4..20
const FALLBACK_FACET_SD = 3;

const FALLBACK_NORM: NormSet = {
  domain: {
    O: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
    C: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
    E: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
    A: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
    N: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
  },
  facet: Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [i + 1, { mean: FALLBACK_FACET_MEAN, sd: FALLBACK_FACET_SD }]),
  ) as Record<number, { mean: number; sd: number }>,
};

/**
 * NORMS keyed by the resolved norm-group label. V1 routes every group to the single
 * combined sex='N' adult fallback. The score() function reads NORMS[label] and falls
 * back to FALLBACK_NORM, so adding the real Johnson groups here later is additive.
 */
export const NORMS: Record<string, NormSet> = {
  "N:adult": FALLBACK_NORM,
};

const normGroupLabel = (g: NormGroup): string => `N:adult`; // V1 — single combined group

// ============================================================================
// T-SCORE / PERCENTILE / BAND
// ============================================================================

/** T = 50 + 10 × (raw - mean_norm) / sd_norm (PESQUISA L306). */
const tScore = (raw: number, mean: number, sd: number): number =>
  50 + (10 * (raw - mean)) / sd;

/**
 * Johnson 2014 cubic percentile approximation (PESQUISA L358-361), clamped to [1,99].
 */
export const percentileFromT = (t: number): number => {
  const pct =
    210.335958661391 -
    16.7379362643389 * t +
    0.405936512733332 * t * t -
    0.00270624341822222 * t * t * t;
  return Math.max(1, Math.min(99, Math.round(pct)));
};

export type Banda = "muito_baixo" | "mod_baixo" | "medio" | "mod_alto" | "muito_alto";

/** Band cutoffs (12-RESEARCH / templates-devolutiva): ≤15 / 16-35 / 36-64 / 65-84 / ≥85. */
export const band = (percentil: number): Banda => {
  if (percentil <= 15) return "muito_baixo";
  if (percentil <= 35) return "mod_baixo";
  if (percentil <= 64) return "medio";
  if (percentil <= 84) return "mod_alto";
  return "muito_alto";
};

// ============================================================================
// NORM-GROUP DERIVATION (sex='N' + age band from birth date — Open Q2)
// ============================================================================

/**
 * Derive the norm group from the candidate's birth date. Sex is 'N' (neutral) —
 * sex is NOT collected in M2 (LGPD-01). The Johnson age bands are <21 / 21-40 /
 * 41-60 / >60. The faixa is stored in metadata for auditability; V1 routes them all
 * to the combined fallback norm (see NORMS).
 */
export const normGroupFromBirthDate = (dob: string | Date): NormGroup => {
  const birth = typeof dob === "string" ? new Date(dob) : dob;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  const faixa = age < 21 ? "<21" : age <= 40 ? "21-40" : age <= 60 ? "41-60" : ">60";
  return { sexo: "N", faixa };
};

// ============================================================================
// SCORE()
// ============================================================================

export interface ScoreResult {
  dimensoes: { dim: Domain; raw: number; percentil: number; banda: Banda }[];
  facetas: { faceta: number; raw: number }[];
  norm_group: NormGroup;
}

const DOMAIN_ORDER: Domain[] = ["O", "C", "E", "A", "N"];

/**
 * Deterministically score a 120-item Likert response vector.
 * 1. reverse the 55 keyed items (corrected = 6 - v);
 * 2. sum the 4 corrected items per facet → 30 facet raws (range 4-20);
 * 3. sum the 6 facets per domain → 5 domain raws (range 24-120);
 * 4. T-score per domain via the norm group; 5. percentile via the cubic;
 * 6. band by the percentile cutoffs.
 * Matches the 12-CONTEXT metadata shape: { dimensoes, facetas, norm_group }.
 */
export const score = (
  respostas: Record<number, number>,
  normGroup: NormGroup,
): ScoreResult => {
  // WR-03: defensive coverage guard (RESEARCH Pitfall 1). The scorer is exported,
  // so the 120-key invariant cannot live only in submit-bigfive-final.validateBody.
  // A partial/empty map would otherwise silently yield a structurally-valid all-zero
  // score (every percentil clamped to 1) with NO error — corrupting the band, the
  // template, and the devolutiva. Assert exactly 120 keys, each an integer 1..120.
  const keys = Object.keys(respostas);
  if (keys.length !== 120) {
    throw new Error(`bigfive-scoring: expected 120 responses, got ${keys.length}`);
  }
  for (const k of keys) {
    const id = Number(k);
    if (!Number.isInteger(id) || id < 1 || id > 120) {
      throw new Error(`bigfive-scoring: invalid item id "${k}" (must be an integer 1..120)`);
    }
  }

  // 1 + 2. facet raws (corrected per-item)
  const facetRaw: Record<number, number> = {};
  for (let f = 1; f <= 30; f++) facetRaw[f] = 0;
  for (const [idStr, valRaw] of Object.entries(respostas)) {
    const id = Number(idStr);
    const corrected = REVERSED.has(id) ? reverse(valRaw) : valRaw;
    facetRaw[facetOf(id)] += corrected;
  }

  // 3. domain raws
  const domainRaw: Record<Domain, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (let f = 1; f <= 30; f++) {
    domainRaw[FACET_TO_DOMAIN[f]] += facetRaw[f];
  }

  const norm = NORMS[normGroupLabel(normGroup)] ?? FALLBACK_NORM;

  // 4-5-6. T → percentile → band per domain
  const dimensoes = DOMAIN_ORDER.map((dim) => {
    const raw = domainRaw[dim];
    const t = tScore(raw, norm.domain[dim].mean, norm.domain[dim].sd);
    const percentil = percentileFromT(t);
    return { dim, raw, percentil, banda: band(percentil) };
  });

  const facetas = Array.from({ length: 30 }, (_, i) => ({
    faceta: i + 1,
    raw: facetRaw[i + 1],
  }));

  return { dimensoes, facetas, norm_group: normGroup };
};
