/**
 * scoresRhService — the RH-facing read of `scores_candidato` (AVAL-02/03).
 *
 * Load-bearing invariant (T-11-06-01, [[reference_select_star_leaks_pii]]): the
 * read names its columns explicitly — NEVER a star projection. RLS is row-level
 * only and does not hide columns; over-projecting here would leak more than the
 * scorecard needs. The candidate never reads `scores_candidato` (no RLS policy →
 * denied at the DB); RH/admin are allowed (Plan 11-02). This service just must
 * not over-project — the Wave-0 test asserts the select string excludes `'*'`.
 *
 * @module features/avaliacao/services/scoresRhService
 * @see src/features/triagem/services/triagemService.ts:128-138 (allowlist idiom + error class)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-06-PLAN.md (Task 1)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class ScoresRhServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ScoresRhServiceError'
  }
}

/** The subtype discriminator for an SJT score row. */
export type ScoreSubtipo = 'mc' | 'caso_aberto'

/** A `pendente_humano` row needs human review; `falhou` has no score. */
export type ScoreStatus = 'sucesso' | 'pendente_humano' | 'falhou'

/** One MC answer item from `metadata.respostas` (server-derived, neutral). */
export interface McRespostaItem {
  pergunta_id: string
  opcao_id: string
  tag: string
  peso: number
}

/** MC metadata shape (subtipo='mc'). */
export interface McMetadata {
  respostas?: McRespostaItem[]
  has_atencao?: boolean
}

/** One BARS dimension from `metadata.dimension_scores` (open case). */
export interface DimensionScore {
  dimension: string
  score_1_5: number
  level?: string
  reasoning?: string
}

/** Open-case metadata shape (subtipo='caso_aberto'). */
export interface CasoAbertoMetadata {
  dimension_scores?: DimensionScore[]
  composite_0_25?: number
  /**
   * Por que esta linha foi para revisão humana — lista de códigos escrita pelo SERVIDOR
   * (`avaliar-redacao`), nunca pelo modelo. Ausente quando não há motivo. Desde o 49-39
   * pode conter `instrucao_ao_modelo` (`_shared/sinal-revisao.ts`): a nota composta VALE,
   * mas o texto precisa ser lido. Esse código NÃO decide o status (49-REVIEW-GAPS-2 CR-01):
   * uma linha `sucesso` pode tê-lo, sozinho. Leia com `sinaisDe`, que tolera qualquer forma.
   */
  motivos_revisao?: string[]
}

/** One OCEAN dimension from a big_five `metadata.dimensoes` row (CONTEXTUAL). */
export interface BigFiveDimensao {
  dim: 'O' | 'C' | 'E' | 'A' | 'N'
  raw?: number
  percentil: number
  banda: 'muito_baixo' | 'mod_baixo' | 'medio' | 'mod_alto' | 'muito_alto'
}

/**
 * Big Five metadata shape (tipo='big_five'). CONTEXTUAL / não-eliminatório
 * (RNF-07a): these traits NEVER drive a pass/fail. The RH scorecard marks them so
 * and carries the SugestaoIABadge on any AI-derived devolutiva text.
 */
export interface BigFiveMetadata {
  dimensoes?: BigFiveDimensao[]
  facetas?: Array<{ faceta: number; raw: number }>
  norm_group?: string
  /** Optional executive summary text (AI-derived — carries the SugestaoIABadge). */
  resumo_executivo?: string
}

/**
 * One `scores_candidato` row, projected via the explicit allowlist. Never carries
 * PII identity columns — only the score surface the RH scorecard renders.
 */
export interface ScoreRow {
  id: string
  tipo: string
  subtipo: ScoreSubtipo
  pergunta_id: string | null
  score: number | null
  score_max: number | null
  status: ScoreStatus
  metadata:
    | McMetadata
    | CasoAbertoMetadata
    | BigFiveMetadata
    | Record<string, unknown>
    | null
  citacoes: unknown
  red_flags: unknown
}

/**
 * True when a score row is the contextual Big Five (tipo='big_five'). The RH
 * scorecard renders these as CONTEXTUAL / não-eliminatório (RNF-07a) — never a
 * pass/fail. Read via the existing `SCORES_ALLOWLIST` (never `select('*')`).
 */
export function isBigFiveRow(row: ScoreRow): boolean {
  return row.tipo === 'big_five'
}

/**
 * The EXPLICIT column allowlist for the RH scorecard read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). Listed as a constant so the projection
 * is auditable in one place.
 */
const SCORES_ALLOWLIST =
  'id, tipo, subtipo, pergunta_id, score, score_max, status, metadata, citacoes, red_flags'

/**
 * Reads the SJT scores for a candidatura (RH/admin only — candidate denied by
 * RLS). Allowlist projection of `scores_candidato`; never a star projection.
 */
export async function getScores(candidaturaId: string): Promise<ScoreRow[]> {
  if (!candidaturaId) {
    throw new ScoresRhServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // `scores_candidato` is now present in the regenerated `database.types.ts`
  // (Phase-11 apply wave done), so the read uses the typed client directly. The
  // explicit allowlist (never `'*'`) keeps the projection auditable.
  const { data, error } = await supabase
    .from('scores_candidato')
    .select(SCORES_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)

  if (error) {
    throw new ScoresRhServiceError(
      `Erro ao carregar avaliações: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return (data as unknown as ScoreRow[] | null) ?? []
}

/**
 * 49-44 / WR-07 — a situação da resposta do caso aberto da SJT, como a RPC
 * `ler_resposta_caso_aberto_sjt` a devolve. Só `removida_pelo_titular` nomeia causa (o
 * marcador `redigido` do motor de exclusão a prova); `indisponivel` não alega por que o
 * texto falta.
 */
export const SITUACOES_RESPOSTA_CASO_ABERTO = [
  'disponivel',
  'sem_resposta_enviada',
  'indisponivel',
  'removida_pelo_titular',
] as const

export type SituacaoRespostaCasoAberto = (typeof SITUACOES_RESPOSTA_CASO_ABERTO)[number]

function isSituacaoRespostaCasoAberto(v: unknown): v is SituacaoRespostaCasoAberto {
  return typeof v === 'string' && (SITUACOES_RESPOSTA_CASO_ABERTO as readonly string[]).includes(v)
}

/** O texto gravado na resposta do caso aberto (só em `disponivel`), lido pelo RH. */
export interface RespostaCasoAbertoRh {
  situacao: SituacaoRespostaCasoAberto
  texto: string | null
}

/**
 * 49-44 / WR-07 — lê, para o RH, o texto que o candidato gravou na resposta do caso aberto
 * da SJT. A RPC (SECURITY DEFINER) aplica o predicado WR-04 de `rh_le_scores`: administrador,
 * ou `rh` dono da vaga. Só depois do envio — o rascunho nunca sai.
 */
export async function getRespostaCasoAbertoSjt(
  candidaturaId: string,
): Promise<RespostaCasoAbertoRh> {
  if (!candidaturaId) {
    throw new ScoresRhServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // NARROW confined cast: `ler_resposta_caso_aberto_sjt` ainda não está em `database.types.ts`
  // (a migration 20261003000001 só é aplicada no 49-45). Só o nome e os args da RPC são
  // alargados — NÃO um cliente sem tipos. Quem o retira: o primeiro plano que rodar
  // `npm run db:types < /dev/null` depois do apply do 49-45 apaga este cast no mesmo commit.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: { p_candidatura_id: string },
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>)(
    'ler_resposta_caso_aberto_sjt',
    { p_candidatura_id: candidaturaId },
  )

  if (error) {
    const code =
      error.code === '42501' ? 'UNAUTHORIZED' : error.code === 'P0002' ? 'NOT_FOUND' : 'DATABASE_ERROR'
    throw new ScoresRhServiceError(
      'Não foi possível carregar a resposta do caso aberto.',
      code,
      error,
    )
  }

  // Valida o contrato antes de entregar à tela: um texto não vira «indisponível» em silêncio,
  // nem o contrário. A mensagem NUNCA ecoa o retorno (é texto pessoal do candidato).
  const ret = data as { situacao?: unknown; texto?: unknown } | null
  if (typeof ret !== 'object' || ret === null || Array.isArray(ret) || !isSituacaoRespostaCasoAberto(ret.situacao)) {
    throw new ScoresRhServiceError(
      'Resposta do caso aberto em formato inesperado.',
      'DATABASE_ERROR',
    )
  }
  if (ret.situacao === 'disponivel') {
    if (typeof ret.texto !== 'string' || ret.texto.trim() === '') {
      throw new ScoresRhServiceError(
        'Resposta do caso aberto em formato inesperado.',
        'DATABASE_ERROR',
      )
    }
    return { situacao: 'disponivel', texto: ret.texto }
  }
  return { situacao: ret.situacao, texto: null }
}
