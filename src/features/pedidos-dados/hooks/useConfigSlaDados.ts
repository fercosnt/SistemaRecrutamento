/**
 * useConfigSlaDados — os dois limiares de acompanhamento da fila de pedidos de dados.
 *
 * ⚠ O RETRY ESTÁ DESLIGADO, deliberadamente e ao contrário dos hooks irmãos (que fazem
 * duas tentativas). A justificativa não é estilística: repetir a leitura de uma
 * configuração que falhou não muda o desenlace, porque o consumidor **já tem** uma
 * apresentação correta para "sem configuração" — a faixa degenerada (a contagem de dias,
 * sem badge, `classifySlaDados` → `'degenerado'`). Cada retry só ADIA essa apresentação,
 * mantendo a coluna de acompanhamento em suspenso enquanto a fila inteira já está
 * legível ao lado. Falhar rápido e degradar é melhor que insistir e travar.
 *
 * Pela mesma razão o serviço resolve erro para `null` em vez de lançar: este hook **nunca
 * fica em `isError`**. É isso que permite ao 44-09 manter a config fora do carregamento
 * E do erro da tabela (E6/loading da 44-UI-SPEC) — uma célula de configuração ilegível
 * não pode virar estado de erro de uma tela que já tem tudo o mais para mostrar.
 *
 * Os limiares são meta operacional INTERNA, escolhida abaixo do teto de 15 dias do
 * Art. 19, II — não são o prazo legal, e não são dado da decisão.
 *
 * @module features/pedidos-dados/hooks/useConfigSlaDados
 * @see src/features/revisao/hooks/useConfigSlaRevisao.ts (o molde verbatim)
 * @see src/features/pedidos-dados/constants/slaDados.ts (a faixa degenerada)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { lerConfigSlaDados } from '../services/pedidosDadosService'
import type { LimiaresSlaDados } from '../constants/slaDados'
import { pedidosDadosKeys } from './useFilaPedidosDados'

const STALE = 5 * 60 * 1000

/** Lê os limiares; `null` (config ausente/ilegível) é resultado válido, não erro. */
export function useConfigSlaDados(
  options?: Omit<
    UseQueryOptions<LimiaresSlaDados | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: pedidosDadosKeys.configSla(),
    queryFn: () => lerConfigSlaDados(),
    staleTime: STALE,
    gcTime: STALE,
    retry: false,
    ...options,
  })
}
