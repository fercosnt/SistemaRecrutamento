/**
 * Phase 11 / Plan 11-05 (AVAL-01 / RF-11·12) — the candidate Avaliação
 * Assíncrona container.
 *
 * Replicates the `DashboardCandidatoPage` glass shell (D-27): `BackgroundImage`
 * gradient + sticky glass navbar + `BeautySmileLogo` + `GlassPanel`/`GlassCard`.
 * It renders ONE card per teste in `vaga.testes_aplicaveis`, each with a NEUTRAL
 * status pill (Pendente/Concluído/Indisponível) + "Tempo estimado: ~{N} min" +
 * a CTA that routes to the SJT MC or open-case screen. The candidate NEVER sees
 * a score/threshold/percent (RNF-07a) — status is neutral progress only.
 *
 * ── Two render modes ──
 *  1. CONNECTED (production): no `testes` prop → reads `candidaturaId` from the
 *     route, fetches `getAvaliacaoContext` via TanStack Query, derives the card
 *     list + wrong-etapa lock, and wires real navigation.
 *  2. PRESENTATIONAL (Wave-0 RED test): a `testes` prop is supplied → renders the
 *     glass shell + cards directly with no router/query providers (the 11-01 test
 *     renders `<AvaliacaoContainer testes={...} />` bare). Navigation is a no-op
 *     in this mode so the component mounts without a Router.
 *
 * @see src/components/pages/DashboardCandidatoPage.tsx (canonical glass shell, D-27)
 * @see src/features/avaliacao/services/avaliacaoService.ts (getAvaliacaoContext)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-UI-SPEC.md
 * @module features/avaliacao/components/AvaliacaoContainer
 */
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Circle, CheckCircle2, Lock, AlertCircle, LogOut, User } from 'lucide-react'
import { BackgroundImage } from '@/components/BackgroundImage'
import { BeautySmileLogo } from '@/components/BeautySmileLogo'
import { Glass, GlassPanel, GlassCard, GlassButton } from '@/components/ui/glass'
import { useAuthStore, useCandidato } from '@/store/authStore'
import {
  getAvaliacaoContext,
  type AvaliacaoContext,
} from '@/features/avaliacao/services/avaliacaoService'

/** A neutral card descriptor derived from a `testes_aplicaveis` entry. */
export interface TesteCard {
  teste: string
  status: string
  tempoEstimadoMin?: number | null
  formato?: string
}

interface AvaliacaoContainerProps {
  /**
   * Presentational override: when supplied, the container renders these cards
   * directly without the route/query layer (Wave-0 RED test path).
   */
  testes?: TesteCard[]
}

/** Human label for a teste id (neutral — no scoring framing). */
function testeLabel(teste: string): string {
  switch (teste) {
    case 'sjt_mc':
      return 'Avaliação de situações'
    case 'sjt_caso_aberto':
      return 'Caso prático'
    default:
      return teste
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

/** Neutral status presentation (RNF-07a-safe — never red/green pass-fail). */
function statusInfo(status: string) {
  switch (status) {
    case 'feito':
    case 'concluido':
      return { label: 'Concluído', Icon: CheckCircle2, color: 'text-[#35BFAD]' }
    case 'bloqueado':
    case 'indisponivel':
      return { label: 'Indisponível', Icon: Lock, color: 'text-white/60' }
    default:
      return { label: 'Pendente', Icon: Circle, color: 'text-white/70' }
  }
}

/**
 * Presentational shell — pure render, no router/query hooks. Reused by both
 * modes. `onLogout`/`onOpenTeste`/`onBackToPanel` are injected so the bare test
 * mount needs no providers.
 */
function AvaliacaoShell({
  cards,
  candidatoNome,
  candidatoEmail,
  onLogout,
  onOpenTeste,
}: {
  cards: TesteCard[]
  candidatoNome?: string
  candidatoEmail?: string
  onLogout?: () => void
  onOpenTeste?: (card: TesteCard) => void
}) {
  const pendentes = cards.filter((c) => statusInfo(c.status).label !== 'Concluído')
  const allDone = cards.length > 0 && pendentes.length === 0

  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        {/* Sticky glass navbar (copied shell — D-27) */}
        <div className="w-full border-b border-white/10 backdrop-blur-md bg-white/5 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium drop-shadow-md">
                    {candidatoNome || 'Candidato'}
                  </p>
                  <p className="text-white/70 text-sm drop-shadow-sm">
                    {candidatoEmail || ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 backdrop-blur-md transition-all duration-300 hover:shadow-lg active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span className="drop-shadow-sm">Sair</span>
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-3xl space-y-8 mt-8">
          <div className="text-center mb-8">
            <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
            <h1 className="text-white text-3xl md:text-4xl mb-2 drop-shadow-lg">Avaliação</h1>
            <p className="text-white/90 text-base drop-shadow-md">
              Conclua as avaliações abaixo no seu ritmo. Você pode fazê-las em qualquer ordem.
            </p>
          </div>

          <GlassPanel variant="white" blur="xl" className="text-white">
            {cards.length === 0 ? (
              <Glass variant="white" blur="md" className="p-12 text-center">
                <Circle className="w-14 h-14 text-white/40 mx-auto mb-4" />
                <p className="text-white/90 text-xl mb-2">Nenhuma avaliação pendente</p>
                <p className="text-white/70">
                  Você não tem avaliações para concluir nesta etapa no momento.
                </p>
              </Glass>
            ) : allDone ? (
              <Glass variant="white" blur="md" className="p-12 text-center">
                <CheckCircle2 className="w-14 h-14 text-[#35BFAD] mx-auto mb-4" />
                <p className="text-white/90 text-xl mb-2">Tudo concluído!</p>
                <p className="text-white/70">
                  Você concluiu todas as avaliações desta etapa. Avisaremos sobre os próximos passos por e-mail.
                </p>
              </Glass>
            ) : (
              <div className="space-y-4">
                {cards.map((card) => {
                  const info = statusInfo(card.status)
                  const Icon = info.Icon
                  const done = info.label === 'Concluído'
                  const indispo = info.label === 'Indisponível'
                  const tempo =
                    card.tempoEstimadoMin != null ? `~${card.tempoEstimadoMin} min` : '~10 min'
                  return (
                    <GlassCard
                      key={card.teste}
                      variant="white"
                      blur="md"
                      className="text-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-1 drop-shadow-md">
                            {testeLabel(card.teste)}
                          </h3>
                          <p className="text-white/80 text-sm">Tempo estimado: {tempo}</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 min-h-[44px]">
                          <Icon className={`w-5 h-5 ${info.color}`} />
                          <span className={`text-sm font-semibold ${info.color}`}>
                            {info.label}
                          </span>
                        </div>
                      </div>
                      {!done && !indispo && (
                        <GlassButton
                          variant="white"
                          hover
                          onClick={() => onOpenTeste?.(card)}
                          className="w-full mt-4 text-white drop-shadow-sm min-h-[44px]"
                        >
                          {card.status === 'em_andamento' || card.status === 'parcial'
                            ? 'Continuar avaliação'
                            : 'Começar avaliação'}
                        </GlassButton>
                      )}
                    </GlassCard>
                  )
                })}
              </div>
            )}
          </GlassPanel>
        </div>
      </BackgroundImage>
    </div>
  )
}

/** Neutral wrong-etapa lock state (never alarming) — the connected mode only. */
function WrongEtapaState({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 max-w-2xl mt-16">
          <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
            <Lock className="w-14 h-14 text-white/60 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2 drop-shadow-md">
              Esta avaliação não está disponível.
            </h1>
            <p className="text-white/80 mb-6">
              Ela aparecerá aqui quando for a sua etapa.
            </p>
            <GlassButton variant="white" hover onClick={onBack} className="text-white">
              Voltar ao painel
            </GlassButton>
          </GlassPanel>
        </div>
      </BackgroundImage>
    </div>
  )
}

/** Map the `testes_aplicaveis` jsonb to neutral card descriptors. */
function deriveCards(ctx: AvaliacaoContext | undefined): TesteCard[] {
  if (!ctx) return []
  const raw = ctx.testes_aplicaveis
  if (!Array.isArray(raw)) return []
  return (raw as Array<Record<string, unknown>>).map((t) => ({
    teste: String(t.teste ?? ''),
    status: String(t.status ?? 'pendente'),
    tempoEstimadoMin:
      typeof t.tempoEstimadoMin === 'number'
        ? t.tempoEstimadoMin
        : typeof t.tempo_est_min === 'number'
          ? (t.tempo_est_min as number)
          : null,
    formato: typeof t.formato === 'string' ? (t.formato as string) : undefined,
  }))
}

/**
 * Connected container — reads the route param, fetches the avaliação context,
 * and renders the shell (or the neutral wrong-etapa lock). Falls back to the
 * presentational shell when a `testes` prop is provided (Wave-0 RED test).
 */
export function AvaliacaoContainer({ testes }: AvaliacaoContainerProps = {}) {
  // ── Presentational mode (test path): no router/query providers required. ──
  if (testes) {
    return <AvaliacaoShell cards={testes} />
  }
  return <ConnectedAvaliacaoContainer />
}

function ConnectedAvaliacaoContainer() {
  const navigate = useNavigate()
  const { candidaturaId } = useParams<{ candidaturaId: string }>()
  const candidato = useCandidato()
  const { logout } = useAuthStore()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['avaliacao', 'context', candidaturaId],
    queryFn: () => getAvaliacaoContext(candidaturaId as string),
    enabled: Boolean(candidaturaId),
  })

  const cards = useMemo(() => deriveCards(data), [data])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth/login', { replace: true })
    } catch {
      /* logout failures are non-blocking here */
    }
  }

  const handleOpenTeste = (card: TesteCard) => {
    const target =
      card.formato === 'caso_aberto' || card.teste === 'sjt_caso_aberto' ? 'caso' : 'mc'
    navigate(`/candidato/avaliacao/${candidaturaId}/${target}`)
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <BackgroundImage
          background="gradient"
          className="min-h-screen py-20"
          overlayColor="bg-black"
          overlayOpacity={15}
        >
          <div className="container mx-auto px-4 max-w-3xl mt-16 space-y-4">
            {[1, 2].map((i) => (
              <Glass key={i} variant="white" blur="md" className="p-6 animate-pulse">
                <div className="h-6 bg-white/20 rounded w-2/3 mb-4" />
                <div className="h-4 bg-white/10 rounded w-1/3" />
              </Glass>
            ))}
          </div>
        </BackgroundImage>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <BackgroundImage
          background="gradient"
          className="min-h-screen py-20"
          overlayColor="bg-black"
          overlayOpacity={15}
        >
          <div className="container mx-auto px-4 max-w-2xl mt-16">
            <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
              <AlertCircle className="w-14 h-14 text-[#EF4444] mx-auto mb-4" />
              <p className="text-white/90 text-xl mb-2">
                Não foi possível carregar a avaliação.
              </p>
              <p className="text-white/70 mb-6">Verifique sua conexão e tente novamente.</p>
              <GlassButton variant="white" hover onClick={() => refetch()} className="text-white">
                Tentar novamente
              </GlassButton>
            </GlassPanel>
          </div>
        </BackgroundImage>
      </div>
    )
  }

  // Etapa gate (server-enforced by RLS; mirror neutrally in the UI).
  if (data && data.candidatura.etapa_atual !== 'avaliacao_assincrona') {
    return <WrongEtapaState onBack={() => navigate('/candidato/dashboard')} />
  }

  return (
    <AvaliacaoShell
      cards={cards}
      candidatoNome={candidato?.nome_completo}
      candidatoEmail={candidato?.email}
      onLogout={handleLogout}
      onOpenTeste={handleOpenTeste}
    />
  )
}
