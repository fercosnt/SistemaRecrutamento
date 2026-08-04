/**
 * usePedidosDadosPendentesCount — o escalar do badge do item de menu "Pedidos de dados"
 * da `RHSidebar` (EXPORT-05).
 *
 * Mesma forma de `useFilaPedidosDados` (staleTime/gcTime 5min, retry 2) sobre a RPC
 * `contar_pedidos_dados_pendentes`, que reimplementa o MESMO predicado de escopo da
 * listagem dentro do `SECURITY DEFINER`. O consumidor é o plano 44-09.
 *
 * ⚠ O CONSUMIDOR NUNCA RENDERIZA O NÚMERO CRU, e a proibição é mecânica, não estética:
 * em JS `0 && …` curto-circuita para `0`, e o React renderiza `0` como TEXTO — um "0"
 * solto no menu. Quem traduz é `formatarBadgePendentes`, **importada** de
 * `revisaoService` no 44-09 (não reimplementada aqui).
 *
 * ⚠ E o valor de retorno dela é `undefined`, **não** string vazia. Uma versão anterior da
 * UI-SPEC citou `''`; o código vivo devolve `undefined` e o teste vivo prende esse
 * contrato (`revisaoService.test.ts:213`). Comparar com `''` seria sempre falso e faria
 * o badge reaparecer como pílula em branco — por isso o consumidor usa ternário sobre a
 * própria string, nunca `&&` sobre o número e nunca comparação com vazio.
 *
 * ⚠ Este hook não impõe escopo, filtro nem ordem. O invariante do BD-8 (fila ≡ contador)
 * é de SERVIDOR; um predicado local aqui faria o badge contar uma coisa e a tela mostrar
 * outra.
 *
 * @module features/pedidos-dados/hooks/usePedidosDadosPendentesCount
 * @see src/features/revisao/hooks/useRevisoesPendentesCount.ts (o molde verbatim)
 * @see src/features/revisao/services/revisaoService.ts (formatarBadgePendentes)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { contarPedidosDadosPendentes } from '../services/pedidosDadosService'
import { pedidosDadosKeys } from './useFilaPedidosDados'

const STALE = 5 * 60 * 1000

/** Conta os pedidos de dados ainda não atendidos no escopo do chamador. */
export function usePedidosDadosPendentesCount(
  options?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: pedidosDadosKeys.pendentesCount(),
    queryFn: () => contarPedidosDadosPendentes(),
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
