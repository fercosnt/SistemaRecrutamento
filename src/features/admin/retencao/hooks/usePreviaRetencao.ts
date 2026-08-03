/**
 * usePreviaRetencao — a prévia read-only da retenção (RETEN-04).
 *
 * UMA chave (`retencaoKeys.previa()`) para as DUAS RPCs agregadas, porque linhas e total
 * são o mesmo fato visto de dois ângulos: chaves separadas permitiriam exibir um total
 * calculado antes ao lado de linhas calculadas depois, e o carimbo de data (que vem junto
 * do total) passaria a datar apenas metade do que a tela mostra.
 *
 * A chave é irmã de `retencaoKeys.matriz()` sob a mesma raiz de propósito: `useSalvarJanela`
 * invalida as duas, porque a prévia é DERIVADA da janela.
 *
 * ⚠ ESTA LEITURA NÃO EXECUTA NADA. As três funções envolvidas são `STABLE` e o smoke do
 * 43-06 mede isso por dois caminhos independentes: estaticamente (nenhum verbo de escrita
 * no corpo, por fronteira de palavra) e dinamicamente (as contagens de `candidaturas` e
 * `candidatos` são idênticas antes e depois de executá-las).
 *
 * @module features/admin/retencao/hooks/usePreviaRetencao
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { lerPrevia, type PreviaRetencao } from '../services/retencaoService'
import { retencaoKeys } from './useMatrizRetencao'

const STALE = 5 * 60 * 1000

export function usePreviaRetencao(
  options?: Omit<UseQueryOptions<PreviaRetencao, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: retencaoKeys.previa(),
    queryFn: lerPrevia,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
