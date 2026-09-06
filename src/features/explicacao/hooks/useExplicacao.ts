/**
 * useExplicacao — the candidate LGPD Art. 20 explanation hook (DECISAO-04).
 *
 * Two TanStack-Query primitives over `explicacaoService`:
 *   - `useExplicacao(candidaturaId)` — a `useQuery` over `getExplicacao` (the own-row
 *     allowlist read, reachability-gated). On the FIRST successful load it fires
 *     `stampExplicacao` ONCE (the visit stamp — transparency evidence, T-15-15);
 *     a denied/failed stamp is swallowed (best-effort — it must never break render).
 *   - `useSolicitarRevisao(candidaturaId)` — a `useMutation` over `solicitarRevisao`;
 *     toast.success on a registered request, toast.error on failure. Invalidates the
 *     explanation query so the CTA flips to the idempotent "já solicitou" state.
 *
 * The hook keeps the candidate-facing read free of any PII beyond the service
 * allowlist — it never reads or exposes a score/band/percentile (RNF-07a / LGPD-04),
 * and since Phase 42 / 42-11 it carries the Art. 20 review OUTCOME (`revisao_veredito`
 * narrowed to the closed vocabulary + `revisao_respondida_em`) through to the page
 * WITHOUT changing the hook's shape. It carries no reviewer identity: that column is
 * not in the service allowlist, so it is never read on the candidate's side at all.
 *
 * @module features/explicacao/hooks/useExplicacao
 * @see src/features/explicacao/services/explicacaoService.ts (getExplicacao / stampExplicacao / solicitarRevisao)
 * @see src/features/triagem/hooks/useComparativo.ts (the useMutation + toast.onError idiom)
 * @see src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx (the useQuery mount idiom)
 */
import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getExplicacao,
  solicitarRevisao,
  stampExplicacao,
  type ExplicacaoCandidato,
  type RevisaoVeredito,
} from '../services/explicacaoService'

/**
 * Re-exported so the component layer consumes the review verdict type from the hook it
 * already imports — the established direction of dependency in this feature (the page
 * talks to the hook, never to the service).
 */
export type { ExplicacaoCandidato, RevisaoVeredito }

/** Hierarchical query keys for the explanation surface. */
export const explicacaoKeys = {
  all: ['explicacao'] as const,
  detail: (candidaturaId: string | undefined) =>
    [...explicacaoKeys.all, 'detail', candidaturaId] as const,
}

/**
 * Reads the candidate's own decision (reachability-gated own-row allowlist) and stamps
 * `explicacao_solicitada_em` ONCE on the first successful load (visit evidence). The
 * stamp is best-effort: a denied/failed stamp is swallowed so it never blocks render.
 */
export function useExplicacao(candidaturaId: string | undefined) {
  // Guards the one-shot visit stamp across re-renders / refetches.
  const stampedRef = useRef(false)

  return useQuery<ExplicacaoCandidato | null>({
    queryKey: explicacaoKeys.detail(candidaturaId),
    queryFn: async () => {
      const explicacao = await getExplicacao(candidaturaId as string)
      // Stamp the visit ONCE, only when the page is actually reachable (a rejection
      // exists — `explicacao` is non-null). Best-effort: never throw on a stamp failure.
      //
      // NÃO no caminho automático (§7.18): `stamp_explicacao_acessada` carimba uma
      // coluna de `decisao_final`, e o knockout não cria essa linha. Chamar ali seria
      // uma requisição que só pode falhar — e um `catch` silencioso em cima dela daria
      // a impressão de um carimbo que nunca existiu.
      if (explicacao && explicacao.origem === 'humana' && !stampedRef.current) {
        stampedRef.current = true
        try {
          await stampExplicacao(candidaturaId as string)
        } catch {
          // Swallow — the stamp is transparency evidence, not load-bearing for render.
        }
      }
      return explicacao
    },
    enabled: Boolean(candidaturaId),
  })
}

/**
 * Mutation: requests a human review (LGPD Art. 20). On success shows the exact UI-SPEC
 * toast and invalidates the explanation query so the CTA flips to the idempotent
 * "Você já solicitou a revisão desta decisão." state. On failure shows the retry toast.
 */
export function useSolicitarRevisao(candidaturaId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationKey: [...explicacaoKeys.all, 'solicitar-revisao', candidaturaId],
    mutationFn: async () => {
      const outcome = await solicitarRevisao(candidaturaId as string)
      // An own-row denial (someone else's decision) surfaces as a failure toast — it is
      // not a successful registration.
      if (outcome === 'denied') {
        throw new Error('Não foi possível enviar a solicitação. Tente novamente.')
      }
      // WR-05: the reachability gate failed — there is no rejected decision to revise
      // (it was withdrawn/amended). This is NON-retryable: surface a clear neutral
      // message, NOT the generic "tente novamente" retry copy.
      if (outcome === 'unavailable') {
        throw new Error('Não há decisão rejeitada para revisar nesta página.')
      }
    },
    onSuccess: () => {
      toast.success('Solicitação enviada. A equipe responsável foi notificada.')
      void queryClient.invalidateQueries({
        queryKey: explicacaoKeys.detail(candidaturaId),
      })
    },
    onError: (error) => {
      toast.error(
        error.message || 'Não foi possível enviar a solicitação. Tente novamente.',
      )
    },
  })
}
