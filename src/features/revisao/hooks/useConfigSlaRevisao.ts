/**
 * useConfigSlaRevisao — os dois limiares de acompanhamento interno da fila (D-P42-02).
 *
 * ⚠ O RETRY ESTÁ DESLIGADO, deliberadamente e ao contrário dos hooks irmãos (que fazem
 * duas tentativas). Repetir a leitura de uma
 * configuração que falhou não muda o desenlace: o consumidor já tem uma apresentação
 * correta para "sem configuração" — a faixa **degenerada** (a contagem de dias, sem
 * badge, `classifyRevisaoSla` → `'degenerado'`). Cada retry só ADIA essa apresentação
 * degenerada, mantendo a coluna de acompanhamento em suspenso enquanto a fila inteira já
 * está legível ao lado. Falhar rápido e degradar é melhor que insistir e travar.
 *
 * Pela mesma razão o serviço resolve erro para `null` em vez de lançar: este hook nunca
 * fica em `isError`, e a tela nunca tem um estado de erro por causa de uma célula de
 * configuração. O limiar é meta operacional interna, não dado da decisão.
 *
 * @module features/revisao/hooks/useConfigSlaRevisao
 * @see src/features/revisao/constants/slaRevisao.ts (classifyRevisaoSla — a faixa degenerada)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { lerConfigSlaRevisao } from '../services/revisaoService'
import type { LimiaresSlaRevisao } from '../constants/slaRevisao'
import { revisoesKeys } from './useFilaRevisoes'

const STALE = 5 * 60 * 1000

/** Lê os limiares; `null` (config ausente/ilegível) é resultado válido, não erro. */
export function useConfigSlaRevisao(
  options?: Omit<
    UseQueryOptions<LimiaresSlaRevisao | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: revisoesKeys.configSla(),
    queryFn: () => lerConfigSlaRevisao(),
    staleTime: STALE,
    gcTime: STALE,
    retry: false,
    ...options,
  })
}
