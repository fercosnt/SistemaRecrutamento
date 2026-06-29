/**
 * ComparativoCandidatosPage — wrapper RHLayout da tela de comparativo (UI-SPEC §B).
 *
 * Lê os ids selecionados + nomes (router state, enviados pelo painel via `onCompare`)
 * + vagaId (param). Roda `useComparativo` (invoca a EF comparativo-candidatos com o JWT
 * do usuário). Resolve os ids anonimizados da IA (C1/C2…) de volta para a candidatura
 * real + nome, ordenando a seleção por score (a EF anonimiza nessa ordem). Renderiza
 * `ComparativoScreen` com estados loading/erro — vagas diferentes (EF 400) mostra a
 * cópia pt-BR exata. Ações inline Avançar/Rejeitar chamam `updateCandidaturaEtapa`.
 *
 * @module components/pages/ComparativoCandidatosPage
 * @see src/features/triagem/components/ComparativoScreen.tsx
 */

import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { RHLayout } from '../RHLayout'
import { Glass, GlassButton } from '@/components/ui/glass'
import { useComparativo } from '@/features/triagem/hooks/useComparativo'
import { triagemKeys } from '@/features/triagem/hooks/useTriagemPanel'
import {
  updateCandidaturaEtapa,
  PROXIMA_ETAPA_APOS_TRIAGEM,
  TriagemServiceError,
} from '@/features/triagem/services/triagemService'
import {
  ComparativoScreen,
  type ComparativoCandidate,
} from '@/features/triagem/components/ComparativoScreen'
import type { RankedCandidate } from '@/features/triagem/pdf/exportComparativo'

/** Pull the EF `error_code` (AI_UNAVAILABLE / MIXED_VAGA) off a TriagemServiceError — code-only. */
function errorCodeOf(error: unknown): string | undefined {
  if (error instanceof TriagemServiceError) {
    const details = error.details as { error_code?: unknown } | undefined
    if (typeof details?.error_code === 'string') return details.error_code
    // MIXED_VAGA may arrive as the service `code` even if details omit error_code.
    if (error.code === 'MIXED_VAGA') return 'MIXED_VAGA'
  }
  return undefined
}

/** Seleção carregada pelo painel: candidatura id + nome, em ordem de score DESC. */
interface SelectionItem {
  id: string
  nome: string
}

interface ComparativoLocationState {
  ids?: string[]
  candidatos?: SelectionItem[]
}

/**
 * Resolve o `candidate_id` anonimizado (C1/C2…) para a candidatura/nome reais.
 * A EF anonimiza pela ordem de score (RESEARCH), então C{n} → seleção[n-1].
 */
function resolveCandidates(
  ranked: RankedCandidate[],
  selection: SelectionItem[],
): ComparativoCandidate[] {
  return ranked.map((r) => {
    const idx = Number.parseInt(r.candidate_id.replace(/\D/g, ''), 10) - 1
    const sel = selection[idx]
    return {
      ...r,
      flags: [],
      nome: sel?.nome ?? r.candidate_id,
      candidaturaId: sel?.id ?? r.candidate_id,
    }
  })
}

/**
 * Página de comparativo de candidatos (RH).
 */
export function ComparativoCandidatosPage() {
  const { id: vagaId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const state = (location.state ?? {}) as ComparativoLocationState
  const selection = useMemo<SelectionItem[]>(() => state.candidatos ?? [], [state.candidatos])
  const ids = useMemo<string[]>(
    () => state.ids ?? selection.map((s) => s.id),
    [state.ids, selection],
  )

  const comparativo = useComparativo()
  const { mutate, data, isPending, isError, error } = comparativo

  // Dispara a invocação ao montar (uma vez por seleção válida).
  useEffect(() => {
    if (vagaId && ids.length >= 2 && ids.length <= 10) {
      mutate({ vagaId, candidaturaIds: ids })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vagaId, ids.join(',')])

  const candidates = useMemo<ComparativoCandidate[]>(() => {
    if (!data?.ranking?.ranked_candidates) return []
    return resolveCandidates(data.ranking.ranked_candidates, selection)
  }, [data, selection])

  const invalidatePanel = () => {
    queryClient.invalidateQueries({ queryKey: triagemKeys.all })
  }

  const handleAvancar = async (candidaturaId: string) => {
    try {
      await updateCandidaturaEtapa(candidaturaId, PROXIMA_ETAPA_APOS_TRIAGEM)
      toast.success('Candidato avançado para a próxima etapa.')
      invalidatePanel()
    } catch {
      toast.error('Não foi possível avançar o candidato. Tente novamente.')
    }
  }

  const handleRejeitar = async (candidaturaId: string) => {
    try {
      await updateCandidaturaEtapa(candidaturaId, 'rejeitado')
      toast.success('Candidato movido para “Rejeitado”.')
      invalidatePanel()
    } catch {
      toast.error('Não foi possível rejeitar o candidato. Tente novamente.')
    }
  }

  const voltar = () => navigate(vagaId ? `/rh/vagas/${vagaId}/candidatos` : '/rh/vagas')

  return (
    <RHLayout>
      <div className="space-y-6 px-6 py-8">
        <div className="flex items-center gap-3">
          <GlassButton onClick={voltar}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </GlassButton>
          <h1 className="text-xl font-semibold text-white">Comparativo de candidatos</h1>
        </div>

        <Glass variant="white" blur="lg" className="p-6">
          {/* Seleção inválida — pré-condição (não é estado assíncrono). */}
          {ids.length < 2 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-white/80">
              <AlertTriangle className="h-8 w-8 text-white/60" aria-hidden="true" />
              <p>Selecione ao menos 2 candidatos para comparar.</p>
              <GlassButton onClick={voltar}>Voltar ao painel</GlassButton>
            </div>
          ) : (
            // O <AsyncState> dentro do ComparativoScreen é a fonte única de
            // loading/slow/erro/retry do invoke — nunca tela em branco (RESIL-03).
            // MIXED_VAGA preservado via errorCode (ComparativoScreen ramifica a cópia).
            <ComparativoScreen
              ranking={data?.ranking ?? { ranked_candidates: [] }}
              candidates={candidates}
              onAvancar={handleAvancar}
              onRejeitar={handleRejeitar}
              isLoading={isPending}
              isError={isError}
              errorCode={errorCodeOf(error)}
              retrying={isPending}
              onRetry={() => {
                if (vagaId && ids.length >= 2 && ids.length <= 10) {
                  mutate({ vagaId, candidaturaIds: ids })
                }
              }}
            />
          )}
        </Glass>
      </div>
    </RHLayout>
  )
}
