/**
 * bigfiveService — the candidate-facing Big Five client surface (AVAL-04 / AVAL-08).
 *
 * Three operations, each honoring the answer-key/score protection invariants:
 *  - `getBigfiveItens()`   → the `get_bigfive_itens` SECURITY DEFINER RPC, which
 *    projects ONLY item_id/texto/ordem (the scoring key — dimensao/faceta/
 *    reverse_keyed — NEVER reaches the client; RESEARCH Pitfall 3, T-12-17).
 *  - `submitBigfiveFinal()`→ the `submit-bigfive-final` EF. Posts ONLY Likert 1-5
 *    answers (the body matches `SubmitBigfiveBodySchema`); the EF derives the score
 *    server-side. Neutral ack; a 42501/403 back-lock maps to a LOCKED throw — the
 *    client NEVER receives or sees a score (RNF-07a, T-12-20).
 *  - `loadDevolutiva()`    → the candidate's OWN `devolutivas_candidato` row via an
 *    explicit column allowlist (NEVER `select('*')` — T-12-19,
 *    [[reference_select_star_leaks_pii]]). The devolutiva is the ONE place a
 *    candidate sees their percentile.
 *
 * NOTE (12-06 apply wave): `get_bigfive_itens` + `devolutivas_candidato` are NOT
 * yet in the regenerated `database.types.ts` (that lands on the 12-06 BLOCKING
 * apply/regen wave). Until then the RPC name + the new-table read are reached via
 * a NARROW confined cast (`as never` on the RPC name only / a local row type), NOT
 * a blanket UntypedClient. Drop the cast after the 12-06 regen.
 *
 * @see src/features/avaliacao/services/avaliacaoService.ts (getOpcoesSjt / pontuarSjt — the mirrored idioms)
 * @see src/features/avaliacao/schemas/bigfiveSchema.ts (the client body schema)
 * @see .planning/phases/12-big-five-devolutiva/12-RESEARCH.md Pattern Map + Pitfalls 3/7
 * @module features/avaliacao/services/bigfiveService
 */
import { supabase } from '@/lib/supabase/client'
import {
  buildSubmitBigfiveBody,
  type SubmitBigfiveBody,
} from '../schemas/bigfiveSchema'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class BigfiveServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'LOCKED'
      | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'BigfiveServiceError'
  }
}

/** Hierarchical query keys for the Big Five surface (CLAUDE.md convention). */
export const bigfiveKeys = {
  all: ['bigfive'] as const,
  itens: () => [...bigfiveKeys.all, 'itens'] as const,
  devolutiva: (candidaturaId: string) =>
    [...bigfiveKeys.all, 'devolutiva', candidaturaId] as const,
}

/** A candidate-safe Big Five item — ONLY id + text + order, NEVER the scoring key. */
export interface BigfiveItem {
  item_id: number
  texto: string
  ordem: number
}

/** A neutral submit ack — never carries a score (RNF-07a). */
export interface BigfiveAck {
  ok: boolean
  devolutiva_id?: string
}

/** One devolutiva dashboard row (candidate-facing — the only place a percentil shows). */
export interface DevolutivaDashboardRow {
  dim: 'O' | 'C' | 'E' | 'A' | 'N'
  percentil: number
  banda: 'muito_baixo' | 'mod_baixo' | 'medio' | 'mod_alto' | 'muito_alto'
}

/** One devolutiva dimension page (~150-200 words interpretive text). */
export interface DevolutivaPagina {
  dim: 'O' | 'C' | 'E' | 'A' | 'N'
  banda: DevolutivaDashboardRow['banda']
  percentil: number
  texto_interpretativo: string
  palavras: number
}

/** The structured devolutiva content (BigfiveDevolutivaSchema, persisted jsonb). */
export interface DevolutivaConteudo {
  cabecalho: {
    nome: string
    dashboard: DevolutivaDashboardRow[]
  }
  paginas: DevolutivaPagina[]
  disclaimer_emocional: string
  disclaimer_lgpd_crp: string
}

/** The candidate's own devolutiva row (allowlist — never `select('*')`). */
export interface DevolutivaRow {
  id: string
  candidatura_id: string
  conteudo_jsonb: DevolutivaConteudo
  created_at: string
}

/**
 * Reads the answer-key-safe Big Five items (AVAL-04). Calls the
 * `get_bigfive_itens` SECURITY DEFINER RPC, which returns ONLY item_id/texto/ordem
 * in presentation order — the scoring key (dimensao/faceta/reverse_keyed) stays
 * server-side. The candidate cannot reverse-engineer the instrument.
 */
export async function getBigfiveItens(): Promise<BigfiveItem[]> {
  // NARROW confined cast (12-06 regen drops it): the RPC name is not yet in the
  // generated types. Not a blanket UntypedClient — only the RPC name is widened.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    'get_bigfive_itens',
  )

  if (error) {
    throw new BigfiveServiceError(
      `Não foi possível carregar os itens da avaliação: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return ((data as BigfiveItem[] | null) ?? []).map((i) => ({
    item_id: Number(i.item_id),
    texto: String(i.texto),
    ordem: Number(i.ordem),
  }))
}

/**
 * Submits the 120 Likert answers for server-side scoring (AVAL-04). Posts ONLY
 * `{ candidatura_id, respostas }` (validated via `SubmitBigfiveBodySchema`); the EF
 * derives the OCEAN score server-side. The candidate never computes or receives a
 * score (RNF-07a). A 42501/403 back-lock maps to a neutral LOCKED throw.
 */
export async function submitBigfiveFinal(
  candidaturaId: string,
  respostas: Record<string, number>,
): Promise<BigfiveAck> {
  if (!candidaturaId) {
    throw new BigfiveServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  let body: SubmitBigfiveBody
  try {
    body = buildSubmitBigfiveBody(candidaturaId, respostas)
  } catch (err) {
    throw new BigfiveServiceError(
      'Respostas inválidas. Verifique se todas foram preenchidas.',
      'INVALID_INPUT',
      err,
    )
  }

  const { data, error } = await supabase.functions.invoke('submit-bigfive-final', {
    body,
  })

  if (error) {
    // A SECURITY DEFINER / etapa-gated denial can surface as a 42501 code or a 403
    // on the function path — map all of them to the neutral LOCKED throw (mirrors
    // pontuarSjt / useAutosaveAvaliacao's isBackLock).
    const e = error as { code?: string; status?: number }
    if (e.code === '42501' || String(e.status) === '42501' || e.status === 403) {
      throw new BigfiveServiceError(
        'Sua etapa avançou — esta avaliação não aceita mais respostas.',
        'LOCKED',
        error,
      )
    }
    throw new BigfiveServiceError(
      'Não foi possível enviar sua avaliação. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  // The EF returns a neutral ack ({ ok, devolutiva_id? }) — NEVER a score (RNF-07a).
  return (data as BigfiveAck | null) ?? { ok: true }
}

/**
 * Loads the candidate's OWN devolutiva (AVAL-08, own-row RLS). Explicit column
 * allowlist — NEVER `select('*')` ([[reference_select_star_leaks_pii]]). Returns
 * null when the devolutiva has not been generated yet.
 */
export async function loadDevolutiva(
  candidaturaId: string,
): Promise<DevolutivaRow | null> {
  if (!candidaturaId) {
    throw new BigfiveServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // NARROW confined cast (12-06 regen drops it): `devolutivas_candidato` is not yet
  // in the generated types. The EXPLICIT allowlist (never `'*'`) keeps the
  // projection auditable; only the table name is widened, not the client.
  const { data, error } = await (supabase.from as unknown as (
    table: string,
  ) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{
          data: unknown
          error: { message: string } | null
        }>
      }
    }
  })('devolutivas_candidato')
    .select('id, candidatura_id, conteudo_jsonb, created_at')
    .eq('candidatura_id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new BigfiveServiceError(
      `Não foi possível carregar sua devolutiva: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return (data as DevolutivaRow | null) ?? null
}
