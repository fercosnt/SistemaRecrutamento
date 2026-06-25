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
import { cn } from '@/components/ui/utils'
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
  } = useEntrevistaScorecard(candidaturaId)

  const banda = useMemo(() => bandaFromScores(scores), [scores])

  function handleSalvarAvaliacao(payload: { scoresHumanos: Record<string, number>; notas: string }) {
    salvarAvaliacao.mutate(payload, {
      onSuccess: () => SCORECARD_TOAST.success(),
      onError: () => SCORECARD_TOAST.error(),
    })
  }

  function handleRejeitarPorCognitivo(justificativa: string) {
    registrarRejeicaoCognitiva({
      candidaturaId,
      banda,
      justificativa,
    })
      .then(() => toast.success('Decisão registrada no log de auditoria de viés.'))
      .catch(() => toast.error('Não foi possível registrar a auditoria. Tente novamente.'))
  }

  return (
    <RHLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-white md:text-4xl">Entrevista</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTab(t.v)}
              aria-pressed={tab === t.v}
              className={cn(
                'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
                tab === t.v
                  ? 'border-white/30 bg-white/20 text-white'
                  : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Painel do candidato — dashboard + 24h marker + RH-only cognitive band */}
        {tab === 'painel' ? (
          <div className="space-y-6">
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
                  onRejeitarPorCognitivo={handleRejeitarPorCognitivo}
                />
              )
            ) : null}
          </div>
        ) : null}

        {/* Guia de entrevista */}
        {tab === 'guia' ? (
          <Glass variant="white" blur="lg" className="rounded-xl p-6">
            <GuiaEntrevistaPanel
              guia={guia ?? null}
              loading={loadingGuia}
              generating={gerarGuia.isPending}
              onGerar={(tipo) => gerarGuia.mutate(tipo)}
            />
          </Glass>
        ) : null}

        {/* Análise da transcrição */}
        {tab === 'transcricao' ? (
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
        ) : null}

        {/* Avaliação da entrevista — inline scorecard */}
        {tab === 'avaliacao' ? (
          <Glass variant="white" blur="lg" className="rounded-xl p-6">
            <EntrevistaScorecardInline
              competenciasIA={analise?.competencias ?? null}
              saving={salvarAvaliacao.isPending}
              onSalvar={handleSalvarAvaliacao}
            />
          </Glass>
        ) : null}
      </div>
    </RHLayout>
  )
}
