/**
 * useRevisoesPendentesCount — o escalar do badge "Revisões" da `RHSidebar` (REVISAO-02).
 *
 * Mesma forma de `useFilaRevisoes` (staleTime/gcTime 5min, retry 2) sobre a RPC
 * `contar_revisoes_pendentes`, que reimplementa o MESMO escopo por vaga da listagem
 * dentro do `SECURITY DEFINER`. O consumidor é o plano 42-10 (o item de menu com badge);
 * este hook existe desde já porque a chave dele participa da invalidação da mutation.
 *
 * ⚠ O CONSUMIDOR NUNCA RENDERIZA O NÚMERO CRU. `formatarBadgePendentes` (plano 42-03) é
 * quem traduz `0`/erro/carregando para `undefined` — em JS `0 && …` curto-circuita para
 * `0` e o React renderiza `0` como TEXTO, o que colocaria um "0" solto no menu.
 *
 * @module features/revisao/hooks/useRevisoesPendentesCount
 * @see src/features/revisao/hooks/useFilaRevisoes.ts (a fábrica de chaves)
 * @see src/features/revisao/services/revisaoService.ts (formatarBadgePendentes)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { contarRevisoesPendentes } from '../services/revisaoService'
import { revisoesKeys } from './useFilaRevisoes'

const STALE = 5 * 60 * 1000

/** Conta as revisões pendentes no escopo do chamador. */
export function useRevisoesPendentesCount(
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: revisoesKeys.pendentesCount(),
    queryFn: () => contarRevisoesPendentes(),
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
