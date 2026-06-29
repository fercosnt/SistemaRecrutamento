/**
 * TanStack Query hooks for the RH interview workspace (ENTREV-01..05).
 *
 * Mirrors the Phase-13 `useRedacaoRevisao` shape verbatim: hierarchical query
 * keys + `useQuery(staleTime 5min, retry 2, enabled:!!id)` + mutations that
 * invalidate the relevant key on success. Every read goes through the allowlist
 * service layer; the AI is always a suggestion, the human always decides (RNF-07a).
 *
 * @module features/entrevista/hooks/useEntrevistaScorecard
 * @see src/features/triagem/hooks/useRedacaoRevisao.ts (analog keys + useQuery + mutation)
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  getEntrevistaContexto,
  getGuia,
  getAnalise,
  getScores,
  salvarAvaliacao,
  gerarGuia,
  analisarTranscricao,
  confirmarRevisaoHumana,
  type EntrevistaContextoRow,
  type EntrevistaGuiaRow,
  type EntrevistaAnaliseRow,
  type EntrevistaScoreRow,
  type SalvarAvaliacaoPayload,
  type TipoEntrevista,
} from '../services/entrevistaService'
import { decisaoKeys } from '@/features/decisao/hooks/useConsolidacao'

/** Hierarchical query-key namespace (mirrors `redacaoRevisaoKeys`). */
export const entrevistaKeys = {
  all: ['entrevista'] as const,
  contexto: (id: string) => [...entrevistaKeys.all, 'contexto', id] as const,
  guia: (id: string) => [...entrevistaKeys.all, 'guia', id] as const,
  analise: (id: string) => [...entrevistaKeys.all, 'analise', id] as const,
  scorecard: (id: string) => [...entrevistaKeys.all, 'scorecard', id] as const,
}

const STALE = 5 * 60 * 1000

/** Candidate-context dashboard data (etapa + scheduled datetime + cognitive opt-in). */
export function useEntrevistaContexto(
  candidaturaId: string | undefined,
  options?: Omit<UseQueryOptions<EntrevistaContextoRow | null, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: entrevistaKeys.contexto(candidaturaId || ''),
    queryFn: () => getEntrevistaContexto(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}

/**
 * The STAR/PEI guide hook — reads the latest guide + exposes a `gerar` mutation
 * (online/presencial) that invalidates the guide on success.
 */
export function useGuiaEntrevista(
  candidaturaId: string | undefined,
  vagaId: string | undefined,
  options?: Omit<UseQueryOptions<EntrevistaGuiaRow | null, Error>, 'queryKey' | 'queryFn'>,
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: entrevistaKeys.guia(candidaturaId || ''),
    queryFn: () => getGuia(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })

  const gerar = useMutation({
    mutationFn: (tipo: TipoEntrevista) => gerarGuia(candidaturaId!, vagaId!, tipo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entrevistaKeys.guia(candidaturaId || '') })
    },
  })

  return { ...query, gerarGuia: gerar }
}

/**
 * The transcript-analysis hook — reads the latest analysis + exposes an
 * `analisar` mutation (paste → analyze) and a `confirmarRevisao` mutation
 * (releases the language/accent flag block). Both invalidate the analysis on success.
 */
export function useTranscricaoAnalise(
  candidaturaId: string | undefined,
  options?: Omit<UseQueryOptions<EntrevistaAnaliseRow | null, Error>, 'queryKey' | 'queryFn'>,
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: entrevistaKeys.analise(candidaturaId || ''),
    queryFn: () => getAnalise(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: entrevistaKeys.analise(candidaturaId || '') })

  const analisar = useMutation({
    mutationFn: (transcricao: string) => analisarTranscricao(candidaturaId!, transcricao),
    onSuccess: invalidate,
  })

  const confirmarRevisao = useMutation({
    mutationFn: (analiseId: string) => confirmarRevisaoHumana(analiseId),
    onSuccess: invalidate,
  })

  return { ...query, analisar, confirmarRevisao }
}

/**
 * Options bag for {@link useEntrevistaScorecard}.
 *
 * WR-01: `vagaId` is a NAMED option, never a bare positional arg. Folding it into
 * the options object removes the previous footgun (a `vagaId` positional inserted
 * BETWEEN `candidaturaId` and `options` meant a caller copying the old two-arg shape
 * `useEntrevistaScorecard(id, options)` would silently bind `options` to `vagaId`).
 * With this shape there is nothing positional after `candidaturaId` to mis-bind.
 */
export type UseEntrevistaScorecardOptions = Omit<
  UseQueryOptions<EntrevistaScoreRow[], Error>,
  'queryKey' | 'queryFn'
> & {
  /**
   * The candidatura's vaga id — used to invalidate the TARGETED Decisão Final
   * consolidacao key on a scorecard save (PERF-04). Optional: when absent the
   * invalidation falls back to the candidatura-prefix key (still targeted), so the
   * ≤60s freshness guarantee is never silently skipped (WR-02).
   */
  vagaId?: string | undefined
}

/**
 * The inline scorecard hook — reads the interview + cognitive score rows + exposes
 * a `salvar` mutation (BARS notas_humanas via the salvar_avaliacao_entrevista RPC)
 * that invalidates the scorecard on success. The human always decides (RNF-07a).
 */
export function useEntrevistaScorecard(
  candidaturaId: string | undefined,
  options?: UseEntrevistaScorecardOptions,
) {
  const { vagaId, ...queryOptions } = options ?? {}
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: entrevistaKeys.scorecard(candidaturaId || ''),
    queryFn: () => getScores(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...queryOptions,
  })

  const salvar = useMutation({
    mutationFn: (payload: SalvarAvaliacaoPayload) =>
      salvarAvaliacao(candidaturaId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: entrevistaKeys.scorecard(candidaturaId || ''),
      })
      // PERF-04 Gap A: a scorecard save changes the Decisão Final consolidation
      // input → invalidate the TARGETED consolidacao key (never decisaoKeys.all)
      // so the Decisão Final dashboard refetches in ≤60s. Cache-only; no
      // candidaturas write (RNF-07a — consolidacao stays read-only/advisory).
      //
      // WR-02: the invalidation MUST NOT silently no-op when `vagaId` is undefined
      // (e.g. the scorecard save completes while `useEntrevistaContexto` is still
      // loading, so `contexto.vaga_id` has not resolved). The consolidacao key is
      // `['decisao','consolidacao',candidaturaId,vagaId]`; TanStack `invalidateQueries`
      // does PREFIX matching, so passing the candidatura-prefix `['decisao',
      // 'consolidacao',candidaturaId]` matches the full key for ANY vagaId. We use
      // the exact factory key when `vagaId` is known (tightest match) and fall back to
      // the prefix otherwise — either way the ≤60s freshness guard ALWAYS fires and
      // stays targeted (never decisaoKeys.all).
      if (candidaturaId) {
        const consolidacaoKey = vagaId
          ? decisaoKeys.consolidacao(candidaturaId, vagaId)
          : ([...decisaoKeys.all, 'consolidacao', candidaturaId] as const)
        queryClient.invalidateQueries({ queryKey: consolidacaoKey })
      }
    },
  })

  return { ...query, salvarAvaliacao: salvar }
}
