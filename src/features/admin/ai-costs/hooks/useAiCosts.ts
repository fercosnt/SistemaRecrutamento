/**
 * TanStack Query hooks para AI Costs (admin).
 *
 * @module features/admin/ai-costs/hooks/useAiCosts
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { listAiCostDaily, type AiCostDailyRow } from '../services/aiCostsService'

export const aiCostsKeys = {
  all: ['ai-costs'] as const,
  lists: () => [...aiCostsKeys.all, 'list'] as const,
  list: (month: string) => [...aiCostsKeys.lists(), month] as const,
} as const

export function useAiCosts(
  month: string,
  options?: Omit<UseQueryOptions<AiCostDailyRow[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: aiCostsKeys.list(month),
    queryFn: () => listAiCostDaily(month),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    ...options,
  })
}
