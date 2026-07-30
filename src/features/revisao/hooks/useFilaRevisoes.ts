/**
 * useFilaRevisoes — a leitura da fila de revisão Art. 20 (REVISAO-02).
 *
 * Molde verbatim de `useFilaTrabalho` (Phase 34): fábrica de chaves hierárquica +
 * `useQuery(staleTime 5min, gcTime 5min, retry 2)`, e a leitura sempre pela camada de
 * serviço com allowlist — nunca uma projeção-estrela, nunca rede aqui dentro.
 *
 * ⚠ A ORDEM VEM DO SERVIDOR. `listar_revisoes_decisao` já faz
 * `ORDER BY revisao_solicitada_em ASC LIMIT 200`; este hook **não** reordena e **não**
 * repagina. Reordenar no cliente daria uma segunda fonte de verdade para "o mais antigo
 * primeiro" — que é a própria promessa da tela — e as duas divergiriam no primeiro corte
 * do `LIMIT`, porque as 200 linhas escolhidas pelo servidor não seriam as 200 primeiras
 * da nova ordenação.
 *
 * A fábrica `revisoesKeys` vive AQUI (e não num arquivo próprio) pelo mesmo motivo que
 * `filaKeys` vive em `useFilaTrabalho.ts`: é a convenção viva do projeto — a chave mora
 * junto do hook primário do domínio e os hooks irmãos a importam daqui.
 *
 * @module features/revisao/hooks/useFilaRevisoes
 * @see src/features/funil/hooks/useFilaTrabalho.ts (o molde: keys + useQuery)
 * @see supabase/migrations/20260730000002_p42_revisao_art20_authz_fail_closed.sql (contrato vivo do RPC)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import {
  listarFilaRevisoes,
  type FilaRevisaoRow,
  type FiltrosFilaRevisao,
} from '../services/revisaoService'

/**
 * Namespace hierárquico das chaves da revisão (convenção §8.1 do projeto, espelhando
 * `vagasKeys`/`filaKeys`). `list` carrega o filtro na chave porque as duas variantes do
 * toggle são DUAS listas distintas no cache: colidi-las mostraria a lista errada ao
 * alternar o switch, sem refetch e sem erro visível.
 */
export const revisoesKeys = {
  all: ['revisoes'] as const,
  lists: () => [...revisoesKeys.all, 'list'] as const,
  list: (filtros: FiltrosFilaRevisao) => [...revisoesKeys.lists(), filtros] as const,
  pendentesCount: () => [...revisoesKeys.all, 'pendentes-count'] as const,
  configSla: () => [...revisoesKeys.all, 'config-sla'] as const,
}

const STALE = 5 * 60 * 1000

/** Lê a fila (mais antigo primeiro). `incluirRespondidos` é o toggle da 42-UI-SPEC. */
export function useFilaRevisoes(
  filtros: FiltrosFilaRevisao,
  options?: Omit<UseQueryOptions<FilaRevisaoRow[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: revisoesKeys.list(filtros),
    queryFn: () => listarFilaRevisoes(filtros),
    staleTime: STALE,
    gcTime: STALE,
    retry: 2,
    ...options,
  })
}
