/**
 * DecisaoFinalPage — the RH consolidated-decision page (DECISAO-01/02/03).
 *
 * The RHLayout-shelled, role-gated page under `/rh/candidato/:id/decisao` (mirrors the
 * Phase-14 EntrevistaWorkspace mount). The `:id` route param is a candidatura id →
 * resolved to its vaga via `decisaoService.getVagaIdDaCandidatura`. Three tabs (Dashboard
 * is the DEFAULT landing, the primary visual anchor):
 *   1. Dashboard  — ConsolidacaoDashboard (consolidated score + breakdown + recommendation)
 *   2. Comparativo — the Phase-10 ComparativoScreen embedded VERBATIM, scoped to the
 *      finalists in `decisao_final` for this vaga (DECISAO-02). No new comparison view.
 *   3. Decisão    — RegistrarDecisaoForm (terminal capture + alert-dialog + append-only note)
 *
 * The consolidated score is presented neutrally; the recommendation is advisory-badged;
 * the decision is always human (RNF-07a). RoleGuard role=['rh','administrador'] is wired
 * at the route in Plan 15-06.
 *
 * @module features/decisao/components/DecisaoFinalPage
 * @see src/features/entrevista/components/EntrevistaWorkspace.tsx (RHLayout tabs host + :id→vaga)
 * @see src/components/pages/ComparativoCandidatosPage.tsx (useComparativo + ComparativoScreen reuse)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (§Component Inventory)
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { RHLayout } from '@/components/RHLayout'
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/components/ui/utils'
import { useComparativo } from '@/features/triagem/hooks/useComparativo'
import {
  ComparativoScreen,
  type ComparativoCandidate,
} from '@/features/triagem/components/ComparativoScreen'
import type { RankedCandidate } from '@/features/triagem/pdf/exportComparativo'
import { ConsolidacaoDashboard } from './ConsolidacaoDashboard'
import { RegistrarDecisaoForm } from './RegistrarDecisaoForm'
import { useRegistrarDecisao } from '../hooks/useRegistrarDecisao'
import { decisaoKeys } from '../hooks/useConsolidacao'
import {
  getVagaIdDaCandidatura,
  listFinalistas,
  getDecisaoAtual,
} from '../services/decisaoService'

/** The 3 workspace tabs (Dashboard is the DEFAULT landing — UI-SPEC §Component Inventory). */
const TABS = [
  { v: 'dashboard', label: 'Dashboard' },
  { v: 'comparativo', label: 'Comparativo' },
  { v: 'decisao', label: 'Decisão' },
] as const

type TabValue = (typeof TABS)[number]['v']

/** Resolve the anonymized ranking ids (C1/C2…) back to the finalist candidaturaIds. */
function resolveFinalistCandidates(
  ranked: RankedCandidate[],
  finalistIds: string[],
): ComparativoCandidate[] {
  return ranked.map((r) => {
    const idx = Number.parseInt(r.candidate_id.replace(/\D/g, ''), 10) - 1
    return {
      ...r,
      flags: [],
      candidaturaId: finalistIds[idx] ?? r.candidate_id,
    }
  })
}

export function DecisaoFinalPage() {
  const { id } = useParams<{ id: string }>()
  const candidaturaId = id ?? ''
  const [tab, setTab] = useState<TabValue>('dashboard')

  // Resolve the vaga of this candidatura (scopes the consolidation + the Comparativo).
  const { data: vagaId, isLoading: loadingVaga } = useQuery({
    queryKey: [...decisaoKeys.all, 'vaga', candidaturaId],
    queryFn: () => getVagaIdDaCandidatura(candidaturaId),
    enabled: !!candidaturaId,
  })

  // The finalists in decisao_final for this vaga (DECISAO-02) — the Comparativo scope.
  const { data: finalistas } = useQuery({
    queryKey: decisaoKeys.finalistas(vagaId ?? ''),
    queryFn: () => listFinalistas(vagaId!),
    enabled: !!vagaId,
  })

  // The existing decision (drives the append-only note in the form).
  const { data: decisaoAtual } = useQuery({
    queryKey: decisaoKeys.atual(candidaturaId),
    queryFn: () => getDecisaoAtual(candidaturaId),
    enabled: !!candidaturaId,
  })

  const finalistIds = useMemo(
    () => (finalistas ?? []).map((f) => f.candidatura_id),
    [finalistas],
  )

  // Comparativo (Phase-10 reuse) — invoked when the Comparativo tab opens with ≥2 finalists.
  const comparativo = useComparativo()
  const { mutate: runComparativo, data: comparativoData, isPending, isError } = comparativo

  useEffect(() => {
    if (tab === 'comparativo' && vagaId && finalistIds.length >= 2 && finalistIds.length <= 10) {
      runComparativo({ vagaId, candidaturaIds: finalistIds })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, vagaId, finalistIds.join(',')])

  const candidates = useMemo<ComparativoCandidate[]>(() => {
    if (!comparativoData?.ranking?.ranked_candidates) return []
    return resolveFinalistCandidates(comparativoData.ranking.ranked_candidates, finalistIds)
  }, [comparativoData, finalistIds])

  const registrar = useRegistrarDecisao()

  function handleRegistrar(values: { decisao: 'aprovado' | 'rejeitado' | 'em_espera'; justificativa: string }) {
    registrar.mutate({
      candidaturaId,
      decisao: values.decisao,
      justificativa: values.justificativa,
    })
  }

  return (
    <RHLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-white md:text-4xl">Decisão final</h1>

        {/* Tabs — Radix tablist/tab/tabpanel (keyboard arrow-key roving focus). */}
        <Tabs value={tab} onValueChange={(v: string) => setTab(v as TabValue)}>
          <TabsList className="flex flex-wrap gap-2 h-auto w-fit bg-transparent p-0 text-white">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className={cn(
                  'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
                  'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
                  'data-[state=active]:border-white/30 data-[state=active]:bg-white/20 data-[state=active]:text-white',
                )}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Dashboard — consolidated score + breakdown + recommendation */}
          <TabsContent value="dashboard">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              {loadingVaga ? (
                <Skeleton className="h-40 w-full bg-white/5" />
              ) : (
                <ConsolidacaoDashboard candidaturaId={candidaturaId} vagaId={vagaId ?? undefined} />
              )}
            </Glass>
          </TabsContent>

          {/* Comparativo — Phase-10 reuse, scoped to finalists */}
          <TabsContent value="comparativo">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              {finalistIds.length < 2 ? (
                <div className="space-y-2 p-12 text-center text-white/80">
                  <p className="text-xl font-semibold text-white">
                    Nenhum finalista para comparar ainda.
                  </p>
                  <p>
                    O comparativo aparece quando houver outros candidatos em decisão final para esta
                    vaga.
                  </p>
                </div>
              ) : isPending ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center text-white/80">
                  <Loader2 className="h-8 w-8 animate-spin text-white/70" aria-hidden="true" />
                  <p>Gerando comparativo…</p>
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center text-white/80">
                  <AlertTriangle className="h-8 w-8 text-red-300" aria-hidden="true" />
                  <p>Não foi possível gerar o comparativo. Tente novamente.</p>
                </div>
              ) : candidates.length > 0 ? (
                <ComparativoScreen
                  ranking={comparativoData!.ranking}
                  candidates={candidates}
                  onAvancar={() => {}}
                  onRejeitar={() => {}}
                />
              ) : (
                <div className="p-12 text-center text-white/80">
                  <p>Não foi possível gerar o comparativo. Tente novamente.</p>
                </div>
              )}
            </Glass>
          </TabsContent>

          {/* Decisão — terminal capture form */}
          <TabsContent value="decisao">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              <RegistrarDecisaoForm
                onConfirm={handleRegistrar}
                submitting={registrar.isPending}
                decisaoAtual={decisaoAtual ?? null}
              />
            </Glass>
          </TabsContent>
        </Tabs>
      </div>
    </RHLayout>
  )
}
