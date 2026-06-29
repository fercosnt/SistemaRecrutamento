/**
 * EntrevistaWorkspace — the RH/gestor interview workspace (ENTREV-01..05).
 *
 * The RHLayout-shelled, role-gated tabs host under `/rh/candidato/:id/entrevista`
 * (mirrors the Phase-13 RedacaoReviewPanel mount). Four tabs:
 *   Painel do candidato (DEFAULT landing) / Guia de entrevista /
 *   Análise da transcrição / Avaliação da entrevista
 * The Painel do candidato is the primary visual anchor — it grounds the gestor in
 * candidate context (etapa + 24h marker) before the guide/transcript/scorecard.
 *
 * The :id route param is a candidatura id → resolved to its vaga for the guide
 * generation. The RH-only CONTEXTUAL cognitive band renders inside the Painel tab
 * (derived from the cognitive score row). Every AI block carries SugestaoIABadge; the
 * candidate never reaches this surface (RoleGuard + RLS deny + allowlist read).
 *
 * @module features/entrevista/components/EntrevistaWorkspace
 * @see src/features/triagem/components/RedacaoReviewPanel.tsx (RHLayout tabs host + :id→vaga)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§Component Inventory)
 */
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RHLayout } from '@/components/RHLayout'
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntrevistaDashboard } from './EntrevistaDashboard'
import { GuiaEntrevistaPanel } from './GuiaEntrevistaPanel'
import { EntrevistaScorecardInline, SCORECARD_TOAST } from './EntrevistaScorecardInline'
import { TranscricaoReviewPanel } from './TranscricaoReviewPanel'
import { CognitivoBandCard } from './CognitivoBandCard'
import {
  useEntrevistaContexto,
  useGuiaEntrevista,
  useTranscricaoAnalise,
  useEntrevistaScorecard,
} from '../hooks/useEntrevistaScorecard'
import {
  registrarRejeicaoCognitiva,
  type BandaCognitiva,
  type EntrevistaScoreRow,
} from '../services/entrevistaService'

/** The 4 workspace tabs (Painel is the DEFAULT landing — UI-SPEC §Visuals). */
const TABS = [
  { v: 'painel', label: 'Painel do candidato' },
  { v: 'guia', label: 'Guia de entrevista' },
  { v: 'transcricao', label: 'Análise da transcrição' },
  { v: 'avaliacao', label: 'Avaliação da entrevista' },
] as const

type TabValue = (typeof TABS)[number]['v']

/** Extracts the RH-only cognitive band from the cognitive score row's metadata. */
function bandaFromScores(scores: EntrevistaScoreRow[] | undefined): BandaCognitiva | string | null {
  const cognitivo = (scores ?? []).find((s) => s.tipo === 'cognitivo')
  const meta = (cognitivo?.metadata ?? {}) as { banda?: string }
  return meta.banda ?? null
}

export function EntrevistaWorkspace() {
  const { id } = useParams<{ id: string }>()
  const candidaturaId = id ?? ''
  // DEFAULT landing tab = Painel do candidato (primary anchor).
  const [tab, setTab] = useState<TabValue>('painel')

  const { data: contexto, isLoading: loadingContexto } = useEntrevistaContexto(candidaturaId)
  const vagaId = contexto?.vaga_id

  const {
    data: guia,
    isLoading: loadingGuia,
    gerarGuia,
  } = useGuiaEntrevista(candidaturaId, vagaId)

  const {
    data: analise,
    isLoading: loadingAnalise,
    analisar,
    confirmarRevisao,
  } = useTranscricaoAnalise(candidaturaId)

  const {
    data: scores,
    isLoading: loadingScores,
    salvarAvaliacao,
  } = useEntrevistaScorecard(candidaturaId, { vagaId })

  const banda = useMemo(() => bandaFromScores(scores), [scores])

  function handleSalvarAvaliacao(payload: { scoresHumanos: Record<string, number>; notas: string }) {
    salvarAvaliacao.mutate(payload, {
      onSuccess: () => SCORECARD_TOAST.success(),
      onError: () => SCORECARD_TOAST.error(),
    })
  }

  // WR-03: AUDIT-ONLY — writes the bias_audit_log row; it does NOT reject the
  // candidate (the real auditable rejection is the Phase-15 decision). The toast
  // no longer claims a "decisão" was taken.
  function handleRegistrarRessalvaCognitiva(justificativa: string) {
    registrarRejeicaoCognitiva({
      candidaturaId,
      banda,
      justificativa,
    })
      .then(() => toast.success('Ressalva registrada no log de auditoria de viés.'))
      .catch(() => toast.error('Não foi possível registrar a ressalva. Tente novamente.'))
  }

  return (
    <RHLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-white md:text-4xl">Entrevista</h1>

        {/* Tabs — Radix tablist/tab/tabpanel (FX-04): roving arrow-key focus + aria-selected */}
        <Tabs value={tab} onValueChange={(v: string) => setTab(v as TabValue)} className="space-y-6">
          <TabsList className="flex h-auto w-fit flex-wrap gap-2 bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="min-h-[44px] rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 data-[state=active]:border-white/30 data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Painel do candidato — dashboard + 24h marker + RH-only cognitive band */}
          <TabsContent value="painel" className="space-y-6">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              {loadingContexto ? (
                <Skeleton className="h-24 w-full bg-white/5" />
              ) : (
                <EntrevistaDashboard contexto={contexto ?? null} />
              )}
            </Glass>

            {/* RH-only CONTEXTUAL cognitive band (opt-in vaga.aplica_cognitivo). */}
            {contexto?.aplica_cognitivo ? (
              loadingScores ? (
                <Skeleton className="h-32 w-full bg-white/5" />
              ) : (
                <CognitivoBandCard
                  banda={banda}
                  rejecting={false}
                  onRejeitarPorCognitivo={handleRegistrarRessalvaCognitiva}
                />
              )
            ) : null}
          </TabsContent>

          {/* Guia de entrevista */}
          <TabsContent value="guia">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              <GuiaEntrevistaPanel
                guia={guia ?? null}
                loading={loadingGuia}
                generating={gerarGuia.isPending}
                onGerar={(tipo) => gerarGuia.mutate(tipo)}
              />
            </Glass>
          </TabsContent>

          {/* Análise da transcrição */}
          <TabsContent value="transcricao">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              <TranscricaoReviewPanel
                analise={analise ?? null}
                loading={loadingAnalise}
                analyzing={analisar.isPending}
                confirming={confirmarRevisao.isPending}
                onAnalisar={(t) => analisar.mutate(t)}
                onConfirmarRevisao={(analiseId) => confirmarRevisao.mutate(analiseId)}
              />
            </Glass>
          </TabsContent>

          {/* Avaliação da entrevista — inline scorecard */}
          <TabsContent value="avaliacao">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              <EntrevistaScorecardInline
                competenciasIA={analise?.competencias ?? null}
                saving={salvarAvaliacao.isPending}
                onSalvar={handleSalvarAvaliacao}
              />
            </Glass>
          </TabsContent>
        </Tabs>
      </div>
    </RHLayout>
  )
}
