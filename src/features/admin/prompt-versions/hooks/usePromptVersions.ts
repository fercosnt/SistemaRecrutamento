/**
 * TanStack Query hooks para Prompt Versions (admin).
 *
 * Query keys hierárquicas + mutations que invalidam a lista no sucesso.
 *
 * @module features/admin/prompt-versions/hooks/usePromptVersions
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  listPromptVersions,
  promoteToCanary,
  promoteCanaryToActive,
  rollbackToVersion,
  type PromptVersionRow,
} from '../services/promptVersionsService'
import type { Database } from '../../../../../database.types'

type LlmCallType = Database['public']['Enums']['llm_call_type']

export const promptVersionsKeys = {
  all: ['prompt-versions'] as const,
  lists: () => [...promptVersionsKeys.all, 'list'] as const,
  list: () => [...promptVersionsKeys.lists()] as const,
} as const

export function usePromptVersions(
  options?: Omit<UseQueryOptions<PromptVersionRow[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: promptVersionsKeys.list(),
    queryFn: () => listPromptVersions(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    ...options,
  })
}

export interface PromoteCanaryVars {
  callType: LlmCallType
  semver: string
  canaryPct?: number
}

export interface VersionActionVars {
  callType: LlmCallType
  semver: string
}

export function usePromoteToCanary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: PromoteCanaryVars) =>
      promoteToCanary(vars.callType, vars.semver, vars.canaryPct),
    onSuccess: () => qc.invalidateQueries({ queryKey: promptVersionsKeys.lists() }),
  })
}

export function usePromoteCanaryToActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: VersionActionVars) => promoteCanaryToActive(vars.callType, vars.semver),
    onSuccess: () => qc.invalidateQueries({ queryKey: promptVersionsKeys.lists() }),
  })
}

export function useRollbackToVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: VersionActionVars) => rollbackToVersion(vars.callType, vars.semver),
    onSuccess: () => qc.invalidateQueries({ queryKey: promptVersionsKeys.lists() }),
  })
}
