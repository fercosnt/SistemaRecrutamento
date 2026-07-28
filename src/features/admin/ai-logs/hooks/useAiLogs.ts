/**
 * TanStack Query hooks para AI Call Logs (admin).
 *
 * Query keys hierárquicas (analog vagasKeys). staleTime 5min, retry 2.
 *
 * @module features/admin/ai-logs/hooks/useAiLogs
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import {
  listAiLogs,
  getAiLogDetail,
  type AiLogsFilters,
  type AiLogsPagination,
  type ListAiLogsResponse,
  type AiLogDetailRow,
} from '../services/aiLogsService'

export const aiLogsKeys = {
  all: ['ai-logs'] as const,
  lists: () => [...aiLogsKeys.all, 'list'] as const,
  list: (filters?: AiLogsFilters, pagination?: AiLogsPagination) =>
    [...aiLogsKeys.lists(), { filters, pagination }] as const,
  details: () => [...aiLogsKeys.all, 'detail'] as const,
  detail: (id: string) => [...aiLogsKeys.details(), id] as const,
} as const

export function useAiLogs(
  filters?: AiLogsFilters,
  pagination: AiLogsPagination = { page: 1, limit: 50 },
  options?: Omit<UseQueryOptions<ListAiLogsResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: aiLogsKeys.list(filters, pagination),
    queryFn: () => listAiLogs(filters, pagination),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    ...options,
  })
}

export function useAiLogDetail(
  id: string | null | undefined,
  options?: Omit<UseQueryOptions<AiLogDetailRow, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: aiLogsKeys.detail(id ?? ''),
    queryFn: () => getAiLogDetail(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    ...options,
  })
}
