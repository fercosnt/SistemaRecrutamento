/**
 * Redação cultural service (AVAL-05 / AVAL-06 / per D-13) — the candidate-side
 * data/logic layer for the culture-fit essay editor.
 *
 * Three load-bearing invariants (the same security model as `avaliacaoService` /
 * `bigfiveService`):
 *  1. ALLOWLIST reads — every read names its columns explicitly; NEVER a star
 *     projection. RLS is row-level only and does NOT hide columns
 *     ([[reference_select_star_leaks_pii]], Phase-8 LGPD lesson). The candidate
 *     own-row read of `redacoes_candidato` uses `REDACAO_CANDIDATO_ALLOWLIST`,
 *     which EXCLUDES every verdict column (analise_ia, scores_dimensao,
 *     score_ponderado_0_100, classificacao_cor, red_flag_etico, flags,
 *     scores_humanos, notas_revisor, decisao_revisor) — the candidate NEVER sees a
 *     score/color/threshold (RNF-07a, T-13-03-01).
 *  2. SERVER-AUTHORITATIVE scoring — `enviarRedacao` posts ONLY identifiers + the
 *     essay text (validated via `respostaRedacaoSchema.strict()`); the EF derives
 *     the BARS composite + the 3-color triage server-side. No code path here
 *     computes or submits a score (anti-tamper, Pitfall 5). The EF returns a
 *     NEUTRAL ack (T-13-03-02).
 *  3. BACK-LOCK — once `avancar_etapa` moves the candidatura past
 *     `avaliacao_assincrona`, the etapa-gated RLS denies writes (42501/403). That
 *     surfaces as a neutral LOCKED throw — never an alarming error (T-13-03-03).
 *
 * NOTE (13-04 apply wave): `perguntas_redacao` + `redacoes_candidato` are NOT yet
 * in the regenerated `database.types.ts` (that lands on the 13-04 BLOCKING
 * apply/regen wave). Until then those reads are reached via a NARROW confined cast
 * (the table name only), NOT a blanket UntypedClient — the EXPLICIT allowlist keeps
 * each projection auditable. Drop the cast after the 13-04 regen. The
 * `avaliar-redacao-cultural` EF is invoked via the typed `functions.invoke` path.
 *
 * @see src/features/avaliacao/services/avaliacaoService.ts (avaliarRedacao / allowlist idioms — the SJT precedent)
 * @see src/features/avaliacao/services/bigfiveService.ts (the LOCKED/INVALID_INPUT/NETWORK_ERROR error map cloned here)
 * @see src/features/avaliacao/schemas/redacaoSchema.ts (the `.strict()` no-score client body)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-PATTERNS.md §redacaoService
 * @module features/avaliacao/services/redacaoService
 */
import { supabase } from '@/lib/supabase/client'
import { respostaRedacaoSchema, type RespostaRedacao } from '../schemas/redacaoSchema'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class RedacaoServiceError extends Error {
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
    this.name = 'RedacaoServiceError'
  }
}

/** Hierarchical query keys for the redação surface (CLAUDE.md convention). */
export const redacaoKeys = {
  all: ['redacao'] as const,
  context: (candidaturaId: string) =>
    [...redacaoKeys.all, 'context', candidaturaId] as const,
  minhas: (candidaturaId: string) =>
    [...redacaoKeys.all, 'minhas', candidaturaId] as const,
}

/**
 * The candidate own-row projection of `redacoes_candidato` — a single auditable
 * allowlist constant. It EXCLUDES every verdict column (analise_ia,
 * scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico,
 * flags, scores_humanos, notas_revisor, decisao_revisor) so the candidate NEVER
 * receives a score/color/threshold (RNF-07a, T-13-03-01,
 * [[reference_select_star_leaks_pii]]). NEVER `select('*')`.
 */
export const REDACAO_CANDIDATO_ALLOWLIST =
  'id, pergunta_id, texto, word_count, submetida_em, status_analise'

/** An essay prompt the candidate answers (allowlist — the prompt text is candidate-visible). */
export interface PerguntaRedacao {
  id: string
  codigo: string
  texto: string
  valor_primario: string | null
  is_padrao: boolean
}

/** A candidate-safe own-row of `redacoes_candidato` — NEVER carries a verdict (RNF-07a). */
export interface MinhaRedacaoRow {
  id: string
  pergunta_id: string
  texto: string
  word_count: number | null
  submetida_em: string | null
  status_analise: string
}

/** Neutral EF acknowledgement — never carries a score/color (RNF-07a). */
export interface NeutralAck {
  ok: boolean
  registrado?: boolean
}

/**
 * Reads the active essay prompts for the editor (AVAL-05). The prompt TEXT is
 * candidate-visible (it is what the candidate is asked to answer — NOT an answer
 * key), so an explicit-allowlist `.eq('ativa', true)` read mirrors
 * `getAvaliacaoContext`'s `perguntas` read. NEVER `select('*')` — the
 * valor_primario hint and the bank's scoring columns stay narrowed to what the
 * screen renders.
 */
export async function getRedacaoContext(
  candidaturaId: string,
): Promise<PerguntaRedacao[]> {
  if (!candidaturaId) {
    throw new RedacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // NARROW confined cast (13-04 regen drops it): `perguntas_redacao` is not yet in
  // the generated types. Only the table name is widened — the EXPLICIT allowlist
  // (never `'*'`) keeps the projection auditable.
  const { data, error } = await (supabase.from as unknown as (
    table: string,
  ) => {
    select: (cols: string) => {
      eq: (col: string, val: boolean) => {
        order: (
          col: string,
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
  })('perguntas_redacao')
    .select('id, codigo, texto, valor_primario, is_padrao')
    .eq('ativa', true)
    .order('is_padrao')

  if (error) {
    throw new RedacaoServiceError(
      `Não foi possível carregar a redação: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return ((data as PerguntaRedacao[] | null) ?? []).map((p) => ({
    id: String(p.id),
    codigo: String(p.codigo),
    texto: String(p.texto),
    valor_primario: p.valor_primario ?? null,
    is_padrao: Boolean(p.is_padrao),
  }))
}

/**
 * Loads ONE candidate own-row of `redacoes_candidato` (own-row RLS). Uses
 * `REDACAO_CANDIDATO_ALLOWLIST` — NEVER `select('*')`; the projection EXCLUDES
 * every verdict column so the candidate never receives a score/color (RNF-07a,
 * T-13-03-01). Returns null when the candidate has not submitted a redação yet.
 */
export async function getRedacaoCandidato(
  candidaturaId: string,
): Promise<MinhaRedacaoRow | null> {
  if (!candidaturaId) {
    throw new RedacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // NARROW confined cast (13-04 regen drops it): `redacoes_candidato` is not yet in
  // the generated types. The EXPLICIT REDACAO_CANDIDATO_ALLOWLIST (never `'*'`)
  // keeps the verdict-excluding projection auditable — only the table name widens.
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
  })('redacoes_candidato')
    .select(REDACAO_CANDIDATO_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new RedacaoServiceError(
      `Não foi possível carregar sua redação: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return (data as MinhaRedacaoRow | null) ?? null
}

/**
 * Lists the candidate's OWN submitted redações for a candidatura (own-row RLS).
 * Uses `REDACAO_CANDIDATO_ALLOWLIST` — NEVER `select('*')`; the projection
 * EXCLUDES every verdict column (RNF-07a, T-13-03-01). Ordered by submission time.
 */
export async function getMinhasRedacoes(
  candidaturaId: string,
): Promise<MinhaRedacaoRow[]> {
  if (!candidaturaId) {
    throw new RedacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // NARROW confined cast (13-04 regen drops it) — same auditable allowlist as the
  // single-row reader; only the table name widens, never the client.
  const { data, error } = await (supabase.from as unknown as (
    table: string,
  ) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        order: (
          col: string,
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
  })('redacoes_candidato')
    .select(REDACAO_CANDIDATO_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .order('submetida_em')

  if (error) {
    throw new RedacaoServiceError(
      `Não foi possível carregar suas redações: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return ((data as MinhaRedacaoRow[] | null) ?? []).map((r) => ({
    id: String(r.id),
    pergunta_id: String(r.pergunta_id),
    texto: String(r.texto),
    word_count: r.word_count ?? null,
    submetida_em: r.submetida_em ?? null,
    status_analise: String(r.status_analise),
  }))
}

/**
 * Submits one culture-fit essay for server-side scoring (AVAL-06). Validates the
 * body via `respostaRedacaoSchema.strict()` (rejects any injected score), then
 * invokes the `avaliar-redacao-cultural` EF with ONLY `{ candidatura_id,
 * pergunta_id, texto }`. The EF derives the BARS composite + the 3-color triage
 * server-side and persists them; the client receives a NEUTRAL ack and NEVER a
 * score (RNF-07a). A 42501/403 back-lock maps to a neutral LOCKED throw; a 400 is
 * a deterministic validation failure (don't tell the candidate to retry).
 */
export async function enviarRedacao(body: RespostaRedacao): Promise<NeutralAck> {
  let parsed: RespostaRedacao
  try {
    parsed = respostaRedacaoSchema.parse(body)
  } catch (err) {
    throw new RedacaoServiceError(
      'Redação inválida. Verifique o texto e tente novamente.',
      'INVALID_INPUT',
      err,
    )
  }

  const { data, error } = await supabase.functions.invoke(
    'avaliar-redacao-cultural',
    { body: parsed },
  )

  if (error) {
    // A SECURITY DEFINER / etapa-gated denial can surface as a 42501 code or a 403
    // on the function path — map all of them to the neutral LOCKED throw (mirrors
    // bigfiveService.submitBigfiveFinal / useAutosaveAvaliacao's isBackLock).
    const e = error as { code?: string; status?: number }
    if (e.code === '42501' || String(e.status) === '42501' || e.status === 403) {
      throw new RedacaoServiceError(
        'Sua etapa avançou — esta redação não aceita mais respostas.',
        'LOCKED',
        error,
      )
    }
    // A 400 from the EF is a VALIDATION failure (malformed/incomplete body) — it
    // will deterministically fail again on retry, so DON'T tell the candidate to
    // "tente novamente".
    if (e.status === 400 || String(e.status) === '400') {
      throw new RedacaoServiceError(
        'Revise sua redação — o texto precisa ter entre 200 e 500 palavras.',
        'INVALID_INPUT',
        error,
      )
    }
    throw new RedacaoServiceError(
      'Não foi possível enviar sua redação. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  // The EF returns a neutral ack ({ ok, registrado? }) — NEVER a score (RNF-07a).
  return (data as NeutralAck | null) ?? { ok: true }
}
