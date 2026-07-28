/**
 * `_shared/cognitivo/item-bank.ts` — o contrato TIPADO do banco de itens de
 * raciocínio lógico (ENTREV-05 / RF-26a) + o seed `SEED_ITENS_RACIOCINIO` que a
 * migration 14-03 lê para popular `cognitivo_itens`, e o helper `buildGabarito`
 * que o scorer (`scoring.ts`, 14-01) consome server-side.
 *
 * FONTE DOS ITENS — APENAS CC0. O conteúdo dos itens (matriz + letra-número) +
 * o gabarito `superKey60` vêm do dataset CC0 do Harvard Dataverse
 * (doi:10.7910/DVN/TZJGAT — SAPA ICAR). É PROIBIDO reusar:
 *   - o item bank do icar-project.com (licença "non-commercial research" —
 *     incompatível com um ATS comercial), e
 *   - os blobs Raven `.webp` legados que persistem no git history
 *     (PRD-cognitivo Q-C5 — licença Pearson inviável + adverse impact).
 * Ver `docs/conhecimento/cognitivo/README.md` + `docs/conhecimento/cognitivo/LICENSE-CC0.md`.
 *
 * ANTI-TAMPER (RNF-07a / T-14-02-01). O `gabarito_idx` é a CHAVE de resposta e
 * vive SOMENTE server-side (neste módulo + no JSON commitado). A prova do
 * candidato (14-06) projeta apenas `enunciado` + `alternativas`; o `gabarito_idx`
 * NUNCA é serializado para uma superfície candidate-facing. O scorer recomputa
 * de `rawResponses` + o gabarito server-only (a chave nunca trafega ao cliente).
 *
 * @see docs/prds/m2-funil-rh/PRD-cognitivo-raciocinio.md §8.5 (sourcing + licença CC0)
 * @see docs/conhecimento/icar60/item-bank-raciocinio.md (modelo de item + decisões Q-C1/Q-C4)
 * @see supabase/functions/_shared/cognitivo/scoring.ts (o scorer 14-01 — `buildGabarito` alimenta o arg `gabarito` de `scoreRaciocinio`; `secao` casa com o `Secao` do scorer)
 */

// ============================================================================
// ItemRaciocinio — o contrato estável consumido pelo seed (14-03), o scorer
// (14-01) e a prova do candidato (14-06).
//
// `secao` usa os MESMOS literais snake_case que o `Secao` do scorer
// (`scoring.ts`): "matriz" | "letra_numero" — para que a partição do item bank
// alimente `scoreRaciocinio(..., secoesByItem)` sem tradução.
// ============================================================================

export type SecaoRaciocinio = "matriz" | "letra_numero";

export interface ItemRaciocinio {
  /** ID estável do item (ex.: 'mat_01', 'ln_01'). Snake_case com prefixo de seção. */
  id: string;
  /** Seção do item — casa com o `Secao` do scorer. */
  secao: SecaoRaciocinio;
  /**
   * Enunciado textual do item. Para matrizes derivadas de figura, é a descrição
   * textual/serializada da matriz (V1 = itens com alternativas DISCRETAS, não o
   * `.webp` composto do shell Raven legado).
   */
  enunciado: string;
  /** Alternativas discretas (texto). O candidato escolhe um índice 0-based. */
  alternativas: string[];
  /**
   * Índice 0-based da alternativa correta (do `superKey60`). SERVER-ONLY — nunca
   * é projetado para o candidato (RNF-07a / T-14-02-01).
   */
  gabarito_idx: number;
}

// ============================================================================
// buildGabarito — id → gabarito_idx, o `Record<string, number>` que o scorer
// (`scoreRaciocinio`) recebe como argumento `gabarito` server-side.
// ============================================================================

/**
 * Deriva o gabarito server-only (id → gabarito_idx) a partir de um vetor de
 * itens. É a ponte item-bank → scorer: o caller PROD (RPC `pontuar_cognitivo` /
 * EF `submit-cognitivo`) passa o retorno deste helper como o arg `gabarito` de
 * `scoreRaciocinio`. O candidato nunca recebe este mapa.
 */
export const buildGabarito = (
  itens: readonly ItemRaciocinio[],
): Record<string, number> => {
  const gabarito: Record<string, number> = {};
  for (const item of itens) {
    gabarito[item.id] = item.gabarito_idx;
  }
  return gabarito;
};

/**
 * Companion de `buildGabarito`: a partição id → seção que `scoreRaciocinio`
 * aceita como `secoesByItem` (para somar matriz/letra_numero corretamente sem
 * depender da convenção de prefixo do id).
 */
export const buildSecoesByItem = (
  itens: readonly ItemRaciocinio[],
): Record<string, SecaoRaciocinio> => {
  const secoes: Record<string, SecaoRaciocinio> = {};
  for (const item of itens) {
    secoes[item.id] = item.secao;
  }
  return secoes;
};

// ============================================================================
// SEED_ITENS_RACIOCINIO — o conteúdo CC0 que a migration 14-03 lê.
//
// [PENDING CC0 DOWNLOAD — Task 2 / checkpoint:human-verify]
// Este array fica VAZIO até o conteúdo CC0 (matriz + letra-número) + o gabarito
// `superKey60` serem baixados do Harvard Dataverse (doi:10.7910/DVN/TZJGAT),
// verificados como CC0 e commitados em `docs/conhecimento/cognitivo/
// itens-raciocinio-cc0.json`. Na Task 2, este export passa a importar/embutir
// o JSON commitado (≥20 itens, ambas as seções). NÃO fabricar itens aqui — o
// conteúdo cruza uma fronteira de licença e exige verificação humana (T-14-02-02).
// ============================================================================

export const SEED_ITENS_RACIOCINIO: ItemRaciocinio[] = [];
