/**
 * TanStack Query hooks para a auditoria de viés (admin — LGPD-03).
 *
 * `useQuery` sobre `listLatestSnapshot` + `useMutation` sobre `gerarSnapshot`
 * (toast.success + invalidate no sucesso; toast.error em falha). Mirror do
 * `useAiCosts` (query) + `useComparativo` (mutation + toast.onError).
 *
 * @module features/admin/bias-audit/hooks/useBiasAudit
 * @see src/features/admin/ai-costs/hooks/useAiCosts.ts
 * @see src/features/triagem/hooks/useComparativo.ts (mutation + toast)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  gerarSnapshot,
  listLatestSnapshot,
  type BiasAuditSnapshot,
} from '../services/biasAuditService'

export const biasAuditKeys = {
  all: ['bias-audit'] as const,
  latest: () => [...biasAuditKeys.all, 'latest'] as const,
} as const

/** Lê o snapshot mais recente de bias_audit_log (allowlist). */
export function useLatestBiasSnapshot() {
  return useQuery<BiasAuditSnapshot | null, Error>({
    queryKey: biasAuditKeys.latest(),
    queryFn: () => listLatestSnapshot(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  })
}

/** Dispara gerar_bias_snapshot; toast.success + invalidate; toast.error em falha. */
export function useGerarBiasSnapshot() {
  const queryClient = useQueryClient()

  return useMutation<BiasAuditSnapshot, Error, string>({
    mutationKey: [...biasAuditKeys.all, 'gerar'],
    mutationFn: (periodo: string) => gerarSnapshot(periodo),
    onSuccess: () => {
      toast.success('Snapshot registrado em bias_audit_log.')
      void queryClient.invalidateQueries({ queryKey: biasAuditKeys.latest() })
    },
    onError: (error) => {
      toast.error(error.message || 'Não foi possível gerar o snapshot. Tente novamente.')
    },
  })
}
