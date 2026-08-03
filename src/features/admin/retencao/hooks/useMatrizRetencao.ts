/**
 * useMatrizRetencao — a leitura da matriz de retenção por estado (RETEN-01).
 *
 * Molde verbatim de `useFilaRevisoes` (Phase 42): fábrica de chaves hierárquica +
 * `useQuery(staleTime 5min, gcTime 5min, retry 2)`, leitura sempre pela camada de serviço
 * com allowlist — nunca projeção-estrela, nunca rede aqui dentro.
 *
 * A fábrica `retencaoKeys` vive AQUI (e não num arquivo próprio) pela convenção viva do
 * projeto: a chave mora junto do hook primário do domínio, e os hooks irmãos
 * (`useSalvarJanela`, `usePreviaRetencao`) a importam daqui. Ter a chave em dois lugares
 * é como uma invalidação passa a errar o alvo em silêncio.
 *
 * @module features/admin/retencao/hooks/useMatrizRetencao
 * @see src/features/revisao/hooks/useFilaRevisoes.ts (o molde: keys + useQuery)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { listarMatriz, type MatrizRetencaoRow } from '../services/retencaoService'

/**
 * Namespace hierárquico das chaves da retenção (convenção §8.1 do projeto).
 *
 * `matriz` e `previa` são irmãs sob `all` de propósito: a prévia é DERIVADA da janela, e
 * salvar uma janela tem de invalidar as duas. Se elas vivessem em raízes diferentes, a
 * mutação invalidaria só a matriz e a tela mostraria, logo abaixo da tabela recém-alterada,
 * um número calculado com a política antiga.
 */
export const retencaoKeys = {
  all: ['retencao'] as const,
  matriz: () => [...retencaoKeys.all, 'matriz'] as const,
  previa: () => [...retencaoKeys.all, 'previa'] as const,
}

const STALE = 5 * 60 * 1000

/** Lê a matriz (uma linha por estado semeado), na ordem que o servidor devolve. */
export function useMatrizRetencao(
  options?: Omit<UseQueryOptions<MatrizRetencaoRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: retencaoKeys.matriz(),
    queryFn: listarMatriz,
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
