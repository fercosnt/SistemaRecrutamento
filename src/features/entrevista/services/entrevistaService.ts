/**
 * entrevistaService — the RH/gestor interview workspace data layer (ENTREV-01..05).
 *
 * Clones the Phase-13 `revisaoRedacaoService` posture verbatim. The genuinely
 * load-bearing invariants (RNF-07a + LGPD):
 *  - Every read names its columns explicitly via `ENTREVISTA_ALLOWLIST` /
 *    `*_ALLOWLIST` consts — NEVER a star projection ([[reference_select_star_leaks_pii]]).
 *    RLS is row-level only and does NOT hide columns; the candidate's interview
 *    transcript + gestor notes + scores are PII, so over-projecting would leak
 *    more than the workspace needs. The candidate has NO read policy on these
 *    rows (denied at the DB); RH/admin are allowed (14-04 candidate-DENY RLS).
 *  - The scorecard WRITE goes through the LIVE `salvar_avaliacao_entrevista`
 *    SECURITY DEFINER RPC (role + own-vaga guarded). It NEVER writes
 *    `candidaturas`, NEVER advances the funil, NEVER auto-rejects.
 *  - The two AI surfaces (`gerar-guia-entrevista`, `avaliar-transcricao-entrevista`)
 *    are invoked via `supabase.functions.invoke`; the client body carries ONLY
 *    identifiers + raw text — never a score/band (anti-tamper; the 14-01 contract
 *    test parses these exact bodies under the EF `.strict()` schemas).
 *  - `confirmarRevisaoHumana` sets `entrevista_analises.revisao_confirmada_em`,
 *    which is the human-confirmed marker the server `avancar_etapa` guard reads to
 *    release the language/accent flag block.
 *
 * @module features/entrevista/services/entrevistaService
 * @see src/features/triagem/services/revisaoRedacaoService.ts (the exact analog)
 * @see supabase/migrations (salvar_avaliacao_entrevista RPC + avancar_etapa flag guard, 14-03/14-04)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class EntrevistaServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'FORBIDDEN'
      | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'EntrevistaServiceError'
  }
}

/** The two guide-generation modes (the EF `tipo` body field). */
export type TipoEntrevista = 'online' | 'presencial'

/** The 5 RH-only qualitative cognitive faixas (descriptive, never a verdict). */
export type BandaCognitiva =
  | 'bem_abaixo'
  | 'abaixo'
  | 'na_media'
  | 'acima'
  | 'bem_acima'

// ── Allowlist projections (NEVER a star projection — PII guard) ────────────────────

/**
 * The EXPLICIT column allowlist for the interview-guide read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). Listed as a single auditable constant.
 */
export const ENTREVISTA_GUIA_ALLOWLIST =
  'id, candidatura_id, tipo, guia, prompt_version, created_at'

/**
 * The EXPLICIT column allowlist for the transcript-analysis read. Carries the
 * BARS competencies + citations + flags + the human-review markers
 * (revisao_confirmada_em is what unblocks the server avancar_etapa guard).
 */
export const ENTREVISTA_ANALISE_ALLOWLIST =
  'id, candidatura_id, status_analise, competencias, citacoes, bias_flags, bloqueio_avanco, scores_humanos, notas_humanas, revisada_por, revisao_confirmada_em, prompt_version, created_at'

/**
 * The EXPLICIT column allowlist for the scores read (the inline scorecard + the
 * RH-only cognitive band). NEVER `'*'`. Mirrors the live `scoresRhService`
 * projection — the candidate never reads `scores_candidato` (no RLS policy).
 */
export const ENTREVISTA_SCORES_ALLOWLIST =
  'id, candidatura_id, tipo, subtipo, score, score_max, status, metadata, citacoes, red_flags'

/**
 * The single auditable allowlist name the Wave-0 14-01 test source-probes
 * (`ENTREVISTA_ALLOWLIST = ...`). Aliases the guide projection so the contract
 * (an explicit, named allowlist exists; no star) is satisfied in one place.
 */
export const ENTREVISTA_ALLOWLIST = ENTREVISTA_GUIA_ALLOWLIST

/** Defensive bound on any RH read (no unbounded queries — WR-05 precedent). */
const READ_LIMIT = 100

// ── Row shapes (allowlist-projected) ─────────────────────────────────────────

/** One STAR/PEI guide question (the EF `guia.perguntas[]` shape). */
export interface GuiaPergunta {
  pergunta: string
  dimensao?: string | null
  /** The weak-dim score that motivated this question (online <3 / presencial <4). */
  score_atual?: number | null
  ancoras_bars?: Record<string, string> | string[] | null
  [k: string]: unknown
}

/** The interview-guide row, allowlist-projected. */
export interface EntrevistaGuiaRow {
  id: string
  candidatura_id: string
  tipo: string
  guia: { perguntas?: GuiaPergunta[]; foco?: string | null; [k: string]: unknown } | null
  prompt_version: string | null
  created_at: string
}

/** One BARS competency dimension from the transcript analysis (AI-derived). */
export interface AnaliseCompetencia {
  competencia: string
  score?: number | null
  reasoning?: string | null
  bias_flags?: {
    content_dependent_only?: boolean
    regional_markers_ignored?: boolean
    disfluencies_ignored?: boolean
  } | null
  [k: string]: unknown
}

/** The transcript-analysis row, allowlist-projected. */
export interface EntrevistaAnaliseRow {
  id: string
  candidatura_id: string
  status_analise: string
  competencias: AnaliseCompetencia[] | null
  citacoes: unknown[] | null
  bias_flags: Record<string, unknown> | null
  /** SEGURA o avanço (RF-24) — true when the language/accent flag fired. */
  bloqueio_avanco: boolean
  scores_humanos: Record<string, unknown> | null
  notas_humanas: string | null
  revisada_por: string | null
  /** The human-confirmed marker the server avancar_etapa guard reads to unblock. */
  revisao_confirmada_em: string | null
  prompt_version: string | null
  created_at: string
}

/** One score row (the inline scorecard + the cognitive band), allowlist-projected. */
export interface EntrevistaScoreRow {
  id: string
  candidatura_id: string
  tipo: string
  subtipo: string | null
  score: number | null
  score_max: number | null
  status: string
  metadata: Record<string, unknown> | null
  citacoes: unknown[] | null
  red_flags: unknown[] | null
}

/** The candidate-context dashboard row (etapa + scheduled datetime), allowlisted. */
export interface EntrevistaContextoRow {
  candidatura_id: string
  vaga_id: string
  etapa_atual: string
  candidato_nome: string | null
  /** Manually-scheduled interview datetime (vagas-level, V1 — in-app only). */
  entrevista_agendada_em: string | null
  /** Opt-in cognitive gate (default false). */
  aplica_cognitivo: boolean
}

// ── Reads (allowlist projections) ────────────────────────────────────────────

/**
 * Resolves the candidate context for the dashboard: the candidatura's vaga,
 * current etapa, candidate name, the manually-scheduled interview datetime, and
 * the cognitive opt-in. Allowlist projection — never a star projection. The `:id`
 * route param is a candidatura id.
 */
export async function getEntrevistaContexto(
  candidaturaId: string,
): Promise<EntrevistaContextoRow | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('candidaturas')
    .select(
      'id, vaga_id, etapa_atual, candidatos ( nome_completo ), vagas ( entrevista_agendada_em, aplica_cognitivo )',
    )
    .eq('id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível carregar o contexto da entrevista: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  if (!data) return null

  const raw = data as unknown as {
    id: string
    vaga_id: string
    etapa_atual: string
    candidatos?: { nome_completo?: string } | null
    vagas?: { entrevista_agendada_em?: string | null; aplica_cognitivo?: boolean } | null
  }
  return {
    candidatura_id: raw.id,
    vaga_id: raw.vaga_id,
    etapa_atual: raw.etapa_atual,
    candidato_nome: raw.candidatos?.nome_completo ?? null,
    entrevista_agendada_em: raw.vagas?.entrevista_agendada_em ?? null,
    aplica_cognitivo: raw.vagas?.aplica_cognitivo ?? false,
  }
}

/**
 * Resolves the vaga id for a candidatura (the `:id` route param is a candidatura
 * id; some reads/writes are keyed by vaga). Allowlist projection — never
 * a star projection. Returns null when missing.
 */
export async function getVagaIdForCandidatura(candidaturaId: string): Promise<string | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('candidaturas')
    .select('vaga_id')
    .eq('id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível resolver a vaga: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  return (data as { vaga_id: string | null } | null)?.vaga_id ?? null
}

/**
 * Reads the latest interview guide for a candidatura (RH/admin only — candidate
 * denied by RLS). Allowlist projection of `entrevista_guias`. Returns null when
 * no guide has been generated yet.
 */
export async function getGuia(candidaturaId: string): Promise<EntrevistaGuiaRow | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('entrevista_guias')
    .select(ENTREVISTA_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível carregar o guia: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  const rows = (data as unknown as EntrevistaGuiaRow[] | null) ?? []
  return rows[0] ?? null
}

/**
 * Reads the latest transcript analysis for a candidatura. Allowlist projection of
 * `entrevista_analises` (transcript competencies + citations + the flag + the
 * human-review markers). Returns null when no transcript has been analyzed yet.
 */
export async function getAnalise(
  candidaturaId: string,
): Promise<EntrevistaAnaliseRow | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('entrevista_analises')
    .select(ENTREVISTA_ANALISE_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível carregar a análise da transcrição: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  const rows = (data as unknown as EntrevistaAnaliseRow[] | null) ?? []
  return rows[0] ?? null
}

/**
 * Reads the interview + cognitive score rows for a candidatura (the inline
 * scorecard reads `tipo='entrevista'`; the cognitive band reads `tipo='cognitivo'`).
 * Allowlist projection of `scores_candidato` — never a star projection.
 */
export async function getScores(candidaturaId: string): Promise<EntrevistaScoreRow[]> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('scores_candidato')
    .select(ENTREVISTA_SCORES_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .in('tipo', ['entrevista', 'cognitivo'])
    .limit(READ_LIMIT)

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível carregar as avaliações: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  return (data as unknown as EntrevistaScoreRow[] | null) ?? []
}

// ── Writes — RPC + EF invokes ────────────────────────────────────────────────

/** Maps a Postgres/PostgREST error code to the service error union. */
function mapRpcError(error: unknown, fallbackMsg: string): EntrevistaServiceError {
  const code = (error as { code?: string }).code ?? ''
  if (code === '42501') {
    return new EntrevistaServiceError(
      'Você não tem permissão para esta avaliação.',
      'FORBIDDEN',
      error,
    )
  }
  if (code === '23514') {
    return new EntrevistaServiceError(
      'Dados inválidos. Verifique os campos.',
      'INVALID_INPUT',
      error,
    )
  }
  if (code === 'P0002' || code === 'no_data_found') {
    return new EntrevistaServiceError('Registro não encontrado.', 'NOT_FOUND', error)
  }
  return new EntrevistaServiceError(fallbackMsg, 'NETWORK_ERROR', error)
}

/** Payload for the inline scorecard save (BARS notas_humanas + optional notes). */
export interface SalvarAvaliacaoPayload {
  scoresHumanos: Record<string, number>
  notas: string
}

/**
 * Records the gestor's interview scorecard via the LIVE `salvar_avaliacao_entrevista`
 * SECURITY DEFINER RPC — NEVER a direct UPDATE. The RPC enforces role + own-vaga and
 * NEVER advances the funil / auto-rejects (RNF-07a). Error map: 42501 → FORBIDDEN,
 * 23514 → INVALID_INPUT, P0002/no_data_found → NOT_FOUND, else → NETWORK_ERROR.
 */
export async function salvarAvaliacao(
  candidaturaId: string,
  payload: SalvarAvaliacaoPayload,
): Promise<void> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { error } = await supabase.rpc('salvar_avaliacao_entrevista', {
    p_candidatura_id: candidaturaId,
    p_scores_humanos: payload.scoresHumanos,
    p_notas: payload.notas ?? '',
  })
  if (error) {
    throw mapRpcError(error, 'Não foi possível salvar a avaliação. Tente novamente.')
  }
}

/** The EF body for guide generation — identifiers + tipo ONLY (anti-tamper). */
interface GerarGuiaBody {
  candidatura_id: string
  vaga_id: string
  tipo: TipoEntrevista
}

/**
 * Invokes the LIVE `gerar-guia-entrevista` EF. The client body carries ONLY
 * `{ candidatura_id, vaga_id, tipo }` — never a score/band (the 14-01 contract
 * test parses this exact shape under the EF `.strict()` schema). Returns the
 * freshly-generated guide row.
 */
export async function gerarGuia(
  candidaturaId: string,
  vagaId: string,
  tipo: TipoEntrevista,
): Promise<EntrevistaGuiaRow | null> {
  if (!candidaturaId || !vagaId) {
    throw new EntrevistaServiceError('candidaturaId e vagaId são obrigatórios', 'INVALID_INPUT')
  }
  const body: GerarGuiaBody = { candidatura_id: candidaturaId, vaga_id: vagaId, tipo }
  const { error } = await supabase.functions.invoke('gerar-guia-entrevista', { body })
  if (error) {
    throw new EntrevistaServiceError(
      'Não foi possível gerar o guia. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }
  // The EF persists to entrevista_guias; read it back via the allowlist.
  return getGuia(candidaturaId)
}

/** The EF body for transcript analysis — identifier + raw text ONLY (anti-tamper). */
interface AvaliarTranscricaoBody {
  candidatura_id: string
  transcricao: string
}

/**
 * Invokes the LIVE `avaliar-transcricao-entrevista` EF. The client body carries
 * ONLY `{ candidatura_id, transcricao }` — the transcript is UNTRUSTED text and
 * the EF does injection-detect + maskPII server-side. Never a score/band on the
 * body (the 14-01 contract test parses this exact shape). Returns the freshly
 * persisted analysis row.
 */
export async function analisarTranscricao(
  candidaturaId: string,
  transcricao: string,
): Promise<EntrevistaAnaliseRow | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  if (!transcricao || transcricao.trim().length === 0) {
    throw new EntrevistaServiceError('A transcrição é obrigatória.', 'INVALID_INPUT')
  }
  const body: AvaliarTranscricaoBody = {
    candidatura_id: candidaturaId,
    transcricao,
  }
  const { error } = await supabase.functions.invoke('avaliar-transcricao-entrevista', {
    body,
  })
  if (error) {
    throw new EntrevistaServiceError(
      'Não foi possível analisar a transcrição. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }
  // The EF persists to entrevista_analises; read it back via the allowlist.
  return getAnalise(candidaturaId)
}

/**
 * Confirms human review on the transcript analysis — sets
 * `entrevista_analises.revisao_confirmada_em`, which the server `avancar_etapa`
 * guard reads to RELEASE the language/accent flag block (RF-24 / RNF-07a). This
 * is the only enabled path out of the flag block; the human always decides.
 *
 * Authorized via the allowlisted update (RLS + the rh-only review-fields trigger
 * backstop the write at the DB). Error map mirrors the RPC writes.
 */
export async function confirmarRevisaoHumana(analiseId: string): Promise<void> {
  if (!analiseId) {
    throw new EntrevistaServiceError('analiseId é obrigatório', 'INVALID_INPUT')
  }
  const { error } = await supabase
    .from('entrevista_analises')
    .update({ revisao_confirmada_em: new Date().toISOString() })
    .eq('id', analiseId)
    .select('id, revisao_confirmada_em')
    .maybeSingle()

  if (error) {
    throw mapRpcError(error, 'Não foi possível confirmar a revisão. Tente novamente.')
  }
}

/**
 * Records a reject-by-cognitive-alone decision in `bias_audit_log` BEFORE the
 * rejection (ENTREV-05 / RNF-07a / RF-27). The cognitive band NEVER auto-rejects;
 * if the gestor rejects based on cognitive alone, the UI forces an expanded
 * justification and writes this audit row. NEVER advances/decides the funil here —
 * this is the audit trail, the human owns the decision elsewhere.
 */
export async function registrarRejeicaoCognitiva(input: {
  candidaturaId: string
  banda: BandaCognitiva | string | null
  justificativa: string
  flagDemografico?: boolean
}): Promise<void> {
  if (!input.candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  if (!input.justificativa || input.justificativa.trim().length === 0) {
    throw new EntrevistaServiceError(
      'A justificativa expandida é obrigatória ao rejeitar com base no raciocínio lógico.',
      'INVALID_INPUT',
    )
  }
  const { error } = await supabase.from('bias_audit_log').insert({
    dados: {
      tipo: 'rejeicao_cognitiva',
      candidatura: input.candidaturaId,
      banda: input.banda ?? null,
      motivo: input.justificativa,
      flag_demografico: input.flagDemografico ?? false,
    },
  })
  if (error) {
    throw mapRpcError(error, 'Não foi possível registrar a auditoria. Tente novamente.')
  }
}
