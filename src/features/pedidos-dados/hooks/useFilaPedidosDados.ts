/**
 * useFilaPedidosDados — a leitura da fila de pedidos de cópia de dados (EXPORT-05).
 *
 * Molde verbatim de `useFilaRevisoes` (Phase 42): fábrica de chaves hierárquica +
 * `useQuery(staleTime 5min, gcTime 5min, retry 2)`, e a leitura sempre pela camada de
 * serviço com allowlist — nunca uma projeção-estrela, nunca rede aqui dentro.
 *
 * ⚠ A ORDEM, O CORTE E O ESCOPO VÊM DO SERVIDOR. `listar_pedidos_dados` já impõe a
 * ordenação composta (não atendidos do mais antigo ao mais recente; depois os atendidos,
 * do mais recente ao mais antigo) e o `LIMIT 200`. Este hook **não** reordena, **não**
 * repagina e **não** filtra.
 *
 * ⚠ E ISSO NÃO É ESTILO — É O INVARIANTE DO BD-8. A fila e o contador do menu
 * compartilham UM predicado, escrito uma vez dentro das duas RPCs `SECURITY DEFINER` e
 * provado no servidor por impersonação real (smoke (m) do 44-02). Um hook que
 * "melhorasse" a fila com um filtro local reintroduziria exatamente a divergência que o
 * BD-8 nomeia: o contador seguiria contando o que a tela deixou de mostrar, com o prazo
 * de 15 dias do Art. 19, II correndo e ninguém vendo. O cliente não pode impor esse
 * invariante — só pode preservá-lo não tendo predicado nenhum.
 *
 * A fábrica `pedidosDadosKeys` vive AQUI (e não em arquivo próprio) pelo mesmo motivo
 * que `revisoesKeys` vive em `useFilaRevisoes.ts`: é a convenção viva do projeto — a
 * chave mora junto do hook primário do domínio e os hooks irmãos a importam daqui. Uma
 * fábrica por feature; duas seriam o começo de duas convenções de invalidação.
 *
 * @module features/pedidos-dados/hooks/useFilaPedidosDados
 * @see src/features/revisao/hooks/useFilaRevisoes.ts (o molde: keys + useQuery)
 * @see src/features/pedidos-dados/services/pedidosDadosService.ts (a inversão do toggle)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import {
  listarFilaPedidosDados,
  type FilaPedidoDadosRow,
  type FiltrosFilaPedidosDados,
} from '../services/pedidosDadosService'

/**
 * Namespace hierárquico das chaves desta feature (convenção §8.1 do projeto, espelhando
 * `revisoesKeys`/`vagasKeys`). `list` carrega o filtro na chave porque as duas variantes
 * do toggle são DUAS listas distintas no cache: colidi-las mostraria a lista errada ao
 * alternar o switch, sem refetch e sem erro visível.
 */
export const pedidosDadosKeys = {
  all: ['pedidos-dados'] as const,
  lists: () => [...pedidosDadosKeys.all, 'list'] as const,
  list: (filtros: FiltrosFilaPedidosDados) =>
    [...pedidosDadosKeys.lists(), filtros] as const,
  pendentesCount: () => [...pedidosDadosKeys.all, 'pendentes-count'] as const,
  configSla: () => [...pedidosDadosKeys.all, 'config-sla'] as const,
}

const STALE = 5 * 60 * 1000

/** Lê a fila. `soNaoAtendidos` é o toggle da 44-UI-SPEC (desligado por padrão). */
export function useFilaPedidosDados(
  filtros: FiltrosFilaPedidosDados,
  options?: Omit<
    UseQueryOptions<FilaPedidoDadosRow[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: pedidosDadosKeys.list(filtros),
    queryFn: () => listarFilaPedidosDados(filtros),
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
