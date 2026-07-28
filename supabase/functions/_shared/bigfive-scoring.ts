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
 * NORM TABLE — Johnson 2014 international norms (real, wired 2026-07-05). Domain
 * mean/sd for the neutral (sex='N' = M+F combined) norm per age band (<21 / 21-40 /
 * 41-60 / >60), transcribed PROGRAMMATICALLY from `NeuroQuestAi/five-factor-e/ipipneo/
 * norm.py` v1.13.1 (MIT, Johnson-approved) — the parser averaged the M and F groups
 * exactly as norm.py's own neutral combine does (round-2). Sex is NOT collected
 * (LGPD-01), so every candidate uses the neutral band; the age band comes from the DOB
 * (`normGroupFromBirthDate`). Only DOMAIN norms are used by score() (percentiles are
 * domain-level; facetas report raw only) — facet norms remain the midpoint placeholder
 * (V2). Percentiles are non-eliminatory (RNF-07a). An unknown band → FALLBACK_NORM.
 *
 * @see docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md L289-294 (reverse set), L304-361 (T + cubic + Python reference), L416-429 (norm strategy)
 * @see supabase/functions/_shared/bigfive-scoring.test.ts (the 12-01 golden test this satisfies)
 */

// ============================================================================
// SCORING KEY (server-side only — NEVER exposed to the candidate)
// ============================================================================

/**
 * The 53 reverse-keyed item ids, transcribed VERBATIM from PESQUISA L289-294 MINUS the
 * 2 political O6 items 88 & 118 (UX-08 — deactivated, see DEACTIVATED_ITEM_IDS).
 * Per-domain counts: N7 E6 O10 A17 C13 = 53 (asserted by the golden test).
 */
export const REVERSED: Set<number> = new Set<number>([
  // Neuroticismo (N) — 7
  51, 81, 96, 101, 106, 111, 116,
  // Extroversão (E) — 6
  62, 67, 92, 97, 102, 107,
  // Abertura (O) — 10 (UX-08: 88 & 118 removed with the deactivated political O6 items)
  48, 53, 68, 73, 78, 83, 98, 103, 108, 113,
  // Amabilidade (A) — 17
  9, 19, 24, 39, 49, 54, 69, 74, 79, 84, 89, 94, 99, 104, 109, 114, 119,
  // Conscienciosidade (C) — 13
  30, 40, 60, 70, 75, 80, 85, 90, 100, 105, 110, 115, 120,
]);

/**
 * UX-08 (Phase 24): the 4 political-opinion O6 items {28, 58, 88, 118} (LGPD
 * special-category — "convicção política") are deactivated from the item bank
 * (get_bigfive_itens filters WHERE ativo). They are all facet 28 (O6) — removing them
 * drops the whole O6 facet, so the administered instrument is 116 NON-CONTIGUOUS ids
 * (1..120 minus this set). The scorer accepts exactly this active set and prorates the
 * O domain ×6/5 so the wired 24-item Johnson O norm stays valid. Reversible in M5.
 */
export const DEACTIVATED_ITEM_IDS: ReadonlySet<number> = new Set<number>([28, 58, 88, 118]);

/** The count of active (administered) IPIP-NEO items after UX-08 (120 − 4 = 116). */
export const ACTIVE_ITEM_COUNT = 116;

/** The 116 active item ids in order (1..120 minus DEACTIVATED_ITEM_IDS) — non-contiguous. */
export const ACTIVE_ITEM_IDS: readonly number[] = Array.from(
  { length: 120 },
  (_, i) => i + 1,
).filter((id) => !DEACTIVATED_ITEM_IDS.has(id));

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

// FALLBACK — ultimate default for a norm group whose age band is not present in NORMS.
// Centered on the scale midpoint (domain raw 24-120, mid 72; facet raw 4-20, mid 12).
const FALLBACK_DOMAIN_MEAN = 72; // midpoint of 24..120
const FALLBACK_DOMAIN_SD = 18;
const FALLBACK_FACET_MEAN = 12; // midpoint of 4..20
const FALLBACK_FACET_SD = 3;

// Facet norms are unused by score() (facetas report raw only); real facet-level
// percentiles are a V2 item. This midpoint placeholder is shared by every NORMS entry.
const FALLBACK_FACET: Record<number, { mean: number; sd: number }> = Object.fromEntries(
  Array.from({ length: 30 }, (_, i) => [i + 1, { mean: FALLBACK_FACET_MEAN, sd: FALLBACK_FACET_SD }]),
) as Record<number, { mean: number; sd: number }>;

const FALLBACK_NORM: NormSet = {
  domain: {
    O: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
    C: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
    E: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
    A: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
    N: { mean: FALLBACK_DOMAIN_MEAN, sd: FALLBACK_DOMAIN_SD },
  },
  facet: FALLBACK_FACET,
};

/**
 * NORMS — Johnson 2014 international norms, neutral (sex='N' = M+F combined average)
 * per age band. Domain mean/sd transcribed PROGRAMMATICALLY from norm.py v1.13.1
 * (NeuroQuestAi/five-factor-e, MIT), 120-item block, groups 1-8, neutral combine =
 * round((M+F)/2, 2) — the same combine norm.py itself applies. score() reads
 * NORMS[label] and falls back to FALLBACK_NORM for an unknown band.
 */
export const NORMS: Record<string, NormSet> = {
  "N:<21": {
    domain: {
      O: { mean: 87.5, sd: 12.11 },
      C: { mean: 80.47, sd: 14.44 },
      E: { mean: 82.48, sd: 15.18 },
      A: { mean: 85.56, sd: 13.94 },
      N: { mean: 70.62, sd: 15.72 },
    },
    facet: FALLBACK_FACET,
  },
  "N:21-40": {
    domain: {
      O: { mean: 87.38, sd: 12.4 },
      C: { mean: 86.53, sd: 14.07 },
      E: { mean: 79.84, sd: 14.93 },
      A: { mean: 88.06, sd: 12.25 },
      N: { mean: 69.56, sd: 16.32 },
    },
    facet: FALLBACK_FACET,
  },
  "N:41-60": {
    domain: {
      O: { mean: 84.59, sd: 12.84 },
      C: { mean: 92.36, sd: 13.14 },
      E: { mean: 77.84, sd: 14.25 },
      A: { mean: 92.03, sd: 10.8 },
      N: { mean: 65.75, sd: 16.07 },
    },
    facet: FALLBACK_FACET,
  },
  "N:>60": {
    domain: {
      O: { mean: 80.67, sd: 12.44 },
      C: { mean: 95.88, sd: 12.21 },
      E: { mean: 78.97, sd: 13.18 },
      A: { mean: 93.69, sd: 10.62 },
      N: { mean: 60.95, sd: 15.2 },
    },
    facet: FALLBACK_FACET,
  },
};

// Sex is 'N' (not collected — LGPD-01); the age band comes from the DOB. An unknown
// band resolves to FALLBACK_NORM via the ?? in score().
const normGroupLabel = (g: NormGroup): string => `N:${g.faixa}`;

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
 * Deterministically score the 116-item active Likert response vector (UX-08 — the 4
 * political O6 items {28,58,88,118} are deactivated; the id set is non-contiguous).
 * 1. reverse the 53 keyed items (corrected = 6 - v);
 * 2. sum the 4 corrected items per facet → 30 facet raws (range 4-20; O6 facet 28 = 0);
 * 3. sum the facets per domain → 5 domain raws; O is summed over its 5 surviving facets
 *    and prorated ×6/5 (24-item Johnson O norm preserved); N/E/A/C stay 6-facet 24-120;
 * 4. T-score per domain via the norm group; 5. percentile via the cubic;
 * 6. band by the percentile cutoffs.
 * Matches the 12-CONTEXT metadata shape: { dimensoes, facetas, norm_group }.
 */
export const score = (
  respostas: Record<number, number>,
  normGroup: NormGroup,
): ScoreResult => {
  // WR-03: defensive coverage guard (RESEARCH Pitfall 1). The scorer is exported,
  // so the active-set invariant cannot live only in submit-bigfive-final.validateBody.
  // A partial/empty map would otherwise silently yield a structurally-valid all-zero
  // score (every percentil clamped to 1) with NO error — corrupting the band, the
  // template, and the devolutiva. Assert exactly the 116 ACTIVE ids (UX-08: the 4
  // political O6 items {28,58,88,118} are deactivated → the id set is non-contiguous),
  // each an integer within 1..120 and NOT a deactivated id.
  const keys = Object.keys(respostas);
  if (keys.length !== ACTIVE_ITEM_COUNT) {
    throw new Error(`bigfive-scoring: expected ${ACTIVE_ITEM_COUNT} responses, got ${keys.length}`);
  }
  for (const k of keys) {
    const id = Number(k);
    if (!Number.isInteger(id) || id < 1 || id > 120 || DEACTIVATED_ITEM_IDS.has(id)) {
      throw new Error(`bigfive-scoring: invalid item id "${k}" (must be an active integer id, 1..120 minus the deactivated O6 set)`);
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

  // 3b. UX-08 O-prorate: facet 28 (the political O6 facet) is deactivated, so O is
  // summed over its 5 surviving facets (20 items, range 20-100). Prorate ×6/5 so the
  // wired 24-item Johnson O domain norm (range 24-120) stays valid — a documented V1
  // stopgap; M5 restores a real 4-item O6 facet and this prorate reverts. ONLY O is
  // prorated; N/E/A/C keep their full 6 facets (Johnson norm preserved).
  domainRaw.O = Math.round((domainRaw.O * 6) / 5);

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
