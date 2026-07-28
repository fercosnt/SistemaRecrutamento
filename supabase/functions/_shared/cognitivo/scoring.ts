/**
 * `_shared/cognitivo/scoring.ts` — raciocínio lógico CTT-soma server-side scorer
 * (ENTREV-05 / RF-26c). Deep module: encapsula gabarito + soma por seção + banding
 * atrás de uma interface pública estável `scoreRaciocinio`.
 *
 * THE anti-tamper scorer of Phase 14. O candidato manda APENAS `rawResponses`
 * (itemId → optionIndex); o servidor re-pontua de `rawResponses` + o `gabarito`
 * server-only (a chave NUNCA chega ao candidato — RNF-07a). CTT soma simples 0/1
 * por item: pick correto = 1, pick errado/em-branco = 0. `total = matriz.raw +
 * letra_numero.raw`. O resultado ao gestor é uma BANDA qualitativa (5 faixas),
 * NUNCA um percentil/"QI" (RNF-12); o cognitivo é CONTEXTUAL e NUNCA elimina (RNF-07a).
 *
 * BANDING — norm_ref provisória 'provisoria_item_difficulty_sapa' (PRD §8.3 L183).
 * V1 não tem norma local BR defensável (Q-C, deferida a v2). Mapeamos a proporção de
 * acertos (`pct = total / nTotal`) em 5 faixas quintis largas (banding largo é
 * deliberado — adverse-impact contido, H3 PRD §6). Cutoffs:
 *   ≤20% → bem_abaixo · ≤40% → abaixo · ≤60% → na_media · ≤80% → acima · >80% → bem_acima.
 * Trocada por norma local (IRT 2PL / SAPA item-difficulty) em v2 — a interface
 * `scoreRaciocinio` permanece estável.
 *
 * Server-only key: este módulo NÃO importa nada candidate-facing (sem `features`/
 * `components`). O gabarito é injetado pelo caller (a RPC `pontuar_cognitivo` /
 * EF `submit-cognitivo`), nunca lido do cliente. Golden test valida COMPORTAMENTO
 * externo (entrada → banda/flags), não o loop interno de soma (PRD §11 L231).
 *
 * @see docs/prds/m2-funil-rh/PRD-cognitivo-raciocinio.md §8.2 L157-191 (interface + soma + banda) + §8.3 L183 (norm_ref provisória)
 * @see supabase/functions/_shared/cognitivo/scoring.test.ts (o golden test 14-01 que isto satisfaz)
 * @see supabase/functions/_shared/cognitivo-schemas.ts (BandaCognitivaEnum — os 5 literais)
 * @see supabase/functions/_shared/bigfive-scoring.ts (o padrão server-only-key + verbatim-from-source que isto espelha)
 */

// ============================================================================
// BANDA — 5 faixas snake_case pt-BR (PRD §8.2 L191). Duplicado como union de
// literais (NÃO importa cognitivo-schemas.ts, que é `npm:zod@...` — manter este
// módulo puro, sem dependência de runtime Zod). O contrato é o mesmo enum.
// ============================================================================

export type Banda = "bem_abaixo" | "abaixo" | "na_media" | "acima" | "bem_acima";

export const BANDAS: readonly Banda[] = [
  "bem_abaixo",
  "abaixo",
  "na_media",
  "acima",
  "bem_acima",
] as const;

// ============================================================================
// BANDING — proporção de acertos → faixa (norm_ref provisória)
// ============================================================================

/**
 * Mapeia o total bruto (CTT soma) → banda qualitativa, via a proporção de acertos
 * sobre o nº de itens (`pct = total / nTotal`). Quintis largos (norm_ref provisória
 * 'provisoria_item_difficulty_sapa', PRD §8.3 L183):
 *   ≤20% bem_abaixo · ≤40% abaixo · ≤60% na_media · ≤80% acima · >80% bem_acima.
 * `nTotal <= 0` → 'na_media' defensivo (nunca divide por zero).
 */
export const bandaFromTotal = (total: number, nTotal: number): Banda => {
  if (nTotal <= 0) return "na_media";
  const pct = total / nTotal;
  if (pct <= 0.2) return "bem_abaixo";
  if (pct <= 0.4) return "abaixo";
  if (pct <= 0.6) return "na_media";
  if (pct <= 0.8) return "acima";
  return "bem_acima";
};

// ============================================================================
// SECTION CLASSIFICATION — matriz vs letra_numero
// ============================================================================

/**
 * Classifica um itemId na sua seção. PROD: a seção vem do item bank (uma coluna
 * `secao` em `cognitivo_itens`). Para o scorer puro, derivamos pela presença do id
 * no gabarito + uma convenção de prefixo/posição: por padrão, os itens são `matriz`
 * salvo um marcador explícito de letra-número. V1 usa a posição do id (os primeiros
 * N são matriz) via o caller passar um `secoesByItem` opcional; sem ele, o scorer
 * usa o índice de inserção do gabarito (matriz primeiro, letra-número depois).
 *
 * Para manter o módulo puro e estável, a seção é derivada de `secoesByItem` quando
 * fornecido; caso contrário, todos os itens contam em `matriz` (o caller PROD SEMPRE
 * fornece a partição). O golden test fornece a partição via `secoesByItem`.
 */
export type Secao = "matriz" | "letra_numero";

export interface ScoreRaciocinioResult {
  total: number;
  secoes: {
    matriz: { raw: number; n_itens: number };
    letra_numero: { raw: number; n_itens: number };
  };
  banda: Banda;
  flags: string[];
}

/**
 * Default section partition: derive from the gabarito insertion order — the PRD item
 * bank is ~18 matriz then ~10 letra-número. Without an explicit partition the scorer
 * splits the gabarito's key order at 12 (the test fixture's matriz count) is NOT
 * assumable in general, so the public signature accepts an optional `secoesByItem`.
 * When absent, we fall back to a name-convention: ids whose section the caller did
 * not declare are treated by their position is fragile — so the stable contract is:
 * the caller (RPC/EF) passes `secoesByItem`. The golden fixture passes it implicitly
 * via the 3-arg overload below.
 */
function defaultSecaoOf(itemId: string, secoesByItem?: Record<string, Secao>): Secao {
  if (secoesByItem && secoesByItem[itemId]) return secoesByItem[itemId];
  // Convention fallback: an id containing 'ln' / 'letra' / 'numero' is letra_numero.
  if (/(?:^|_)(?:ln|letra|numero)/i.test(itemId)) return "letra_numero";
  return "matriz";
}

// ============================================================================
// scoreRaciocinio — public stable interface
// ============================================================================

/**
 * Pontua deterministicamente um vetor de escolhas brutas via CTT soma 0/1.
 *  1. para cada item DO GABARITO: pick === gabarito[item] → 1, senão (errado/blank) → 0;
 *  2. soma por seção (matriz / letra_numero);
 *  3. total = matriz.raw + letra_numero.raw;
 *  4. banda via a proporção de acertos (`bandaFromTotal`).
 *
 * O `gabarito` é a fonte de verdade do conjunto de itens — qualquer chave em
 * `rawResponses` que NÃO esteja no gabarito (ex.: um `score`/`banda` forjado) é
 * IGNORADA (anti-tamper). Itens do gabarito ausentes em `rawResponses` contam 0
 * (em branco). `secoesByItem` é a partição matriz/letra_numero (PROD: do item bank).
 *
 * Matches the PRD §8.2 L163 shape: { total, secoes: { matriz, letra_numero }, banda, flags }.
 */
export const scoreRaciocinio = (
  rawResponses: Record<string, number>,
  gabarito: Record<string, number>,
  secoesByItem?: Record<string, Secao>,
): ScoreRaciocinioResult => {
  const flags: string[] = [];

  const itemIds = Object.keys(gabarito);
  const nTotal = itemIds.length;

  let matrizRaw = 0;
  let matrizN = 0;
  let lnRaw = 0;
  let lnN = 0;

  for (const itemId of itemIds) {
    const secao = defaultSecaoOf(itemId, secoesByItem);
    // CTT soma 0/1: the candidate's pick must equal the gabarito; a missing/blank
    // answer (undefined) or a wrong pick scores 0.
    const pick = rawResponses[itemId];
    const correct = pick !== undefined && pick === gabarito[itemId] ? 1 : 0;
    if (secao === "letra_numero") {
      lnRaw += correct;
      lnN += 1;
    } else {
      matrizRaw += correct;
      matrizN += 1;
    }
  }

  const total = matrizRaw + lnRaw;
  const banda = bandaFromTotal(total, nTotal);

  return {
    total,
    secoes: {
      matriz: { raw: matrizRaw, n_itens: matrizN },
      letra_numero: { raw: lnRaw, n_itens: lnN },
    },
    banda,
    flags,
  };
};
