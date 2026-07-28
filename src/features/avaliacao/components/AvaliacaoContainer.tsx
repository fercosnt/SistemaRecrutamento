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
import { Circle, CircleDot, CheckCircle2, Lock, AlertCircle, LogOut, User } from 'lucide-react'
import { BackgroundImage } from '@/components/BackgroundImage'
import { BeautySmileLogo } from '@/components/BeautySmileLogo'
import { Glass, GlassPanel, GlassCard, GlassButton } from '@/components/ui/glass'
import { useAuthStore, useCandidato } from '@/store/authStore'
import {
  getAvaliacaoContext,
  getAvaliacaoStatus,
  type AvaliacaoContext,
  type AvaliacaoStatus,
} from '@/features/avaliacao/services/avaliacaoService'
import {
  CANDIDATE_FACING,
  templateTesteToContainerCards,
  type ContainerTeste,
} from '@/lib/testes/testeContract'

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

/**
 * The container's per-card SOURCE OF TRUTH — one entry per recognized container
 * id (label + route). `testeLabel`, `handleOpenTeste` and `CONTAINER_RECOGNIZED`
 * all derive from this map, so there is NO duplicate id switch to drift apart
 * ([[feedback_integration_contract_gap]]). A new card id is added in ONE place.
 */
export const CONTAINER_TESTE_CONFIG: Record<
  ContainerTeste,
  { label: string; route: (candidaturaId: string) => string }
> = {
  sjt_mc: {
    label: 'Avaliação de situações',
    route: (id) => `/candidato/avaliacao/${id}/mc`,
  },
  sjt_caso_aberto: {
    label: 'Caso prático',
    route: (id) => `/candidato/avaliacao/${id}/caso`,
  },
  big_five: {
    label: 'Avaliação comportamental',
    route: (id) => `/candidato/avaliacao/${id}/bigfive`,
  },
  redacao: {
    // The essay editor lives on its own candidate route (not under the
    // /avaliacao/:id/:target tree).
    label: 'Redação cultural',
    route: (id) => `/candidato/redacao/${id}`,
  },
  cognitivo: {
    // FUNIL-08 (26-06): the REAL prova-cognitiva route (routes.tsx:269) — replaces the
    // dead `/candidato/avaliacao/:id/cognitivo` stub. The card is gated on
    // `vaga.aplica_cognitivo` in deriveCards and routes to a screen the pontuar_cognitivo
    // gate now accepts during `avaliacao_assincrona` (26-02).
    label: 'Avaliação cognitiva',
    route: (id) => `/candidato/prova-cognitiva/${id}`,
  },
}

/**
 * The container card ids this component RECOGNIZES — each has a real label + a
 * real route above (never the default fall-through). Exported so the FUNIL-05
 * contract test asserts the lib's emitted ids ⊆ this set against the REAL
 * container, not a replica (invariant E / [[feedback_integration_contract_gap]]).
 */
export const CONTAINER_RECOGNIZED: ReadonlySet<string> = new Set(
  Object.keys(CONTAINER_TESTE_CONFIG),
)

/**
 * The etapa in which the async-assessment cards (incl. the cognitivo card) render.
 * The wrong-etapa gate below AND the route↔gate contract test both read THIS single
 * constant, so the cognitivo card can never render in an etapa the `pontuar_cognitivo`
 * RPC would 42501 on submit — the card route and the server gate are two ends of one
 * contract ([[feedback_integration_contract_gap]]).
 */
export const AVALIACAO_ASSINCRONA_ETAPA = 'avaliacao_assincrona'

/** Human label for a container card id (neutral — no scoring framing). */
function testeLabel(teste: string): string {
  const cfg = CONTAINER_TESTE_CONFIG[teste as ContainerTeste]
  if (cfg) return cfg.label
  // Legacy alias: the M1/Phase-11 container also received `bigfive`.
  if (teste === 'bigfive') return CONTAINER_TESTE_CONFIG.big_five.label
  return teste.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Neutral status presentation (RNF-07a-safe — never red/green pass-fail). */
function statusInfo(status: string) {
  switch (status) {
    case 'feito':
    case 'concluido':
      return { label: 'Concluído', Icon: CheckCircle2, color: 'text-[#35BFAD]' }
    case 'em_andamento':
    case 'parcial':
      // Neutral progress — distinct from Pendente ONLY via icon (CircleDot) + label,
      // never a warning/accent tint (26-UI-SPEC Card State Contract: same white tint as
      // Pendente; accent stays reserved for Concluído). Additive branch — the other
      // states are byte-unchanged.
      return { label: 'Em andamento', Icon: CircleDot, color: 'text-white/70' }
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
                  Você concluiu todas as avaliações desta etapa. Acompanhe o andamento pelo seu painel.
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

/**
 * Derive a card's NEUTRAL completion state from the candidate's OWN status booleans
 * (FUNIL-12) — never a score/verdict/threshold (RNF-07a). The container card id maps
 * 1:1 onto the `get_avaliacao_status` key (sjt_mc, sjt_caso_aberto, big_five, redacao,
 * cognitivo): `registrado` → concluído, `iniciado` → em_andamento, neither → pendente.
 * The phantom per-entry vaga-config status field (which `testeAplicavelSchema` does NOT
 * carry) is NOT consulted for any card — this is the FUNIL-12 core fix.
 */
function deriveCardState(
  cardId: string,
  status: AvaliacaoStatus | undefined,
): string {
  const card = status?.[cardId as keyof AvaliacaoStatus]
  if (card?.registrado) return 'concluido'
  if (card?.iniciado) return 'em_andamento'
  return 'pendente'
}

/**
 * Map the `testes_aplicaveis` jsonb to neutral card descriptors. FUNIL-05: filter
 * to CANDIDATE_FACING template tests and map each TEMPLATE id to the CONTAINER
 * card ids the container recognizes (via the shared lib) — instead of copying the
 * template id verbatim, which fell to the default 'mc' target for
 * work_sample_sjt/redacao_cultural/cognitivo (redacao routed WRONG). One template
 * entry may fan out to multiple cards (work_sample_sjt → sjt_mc + sjt_caso_aberto).
 *
 * FUNIL-08 (BLOCKER 1): `cargoTemplates.baseTestes` emits a `cognitivo` template entry
 * UNCONDITIONALLY for all 8 cargos, so the main loop SKIPS it — the ONLY cognitivo card
 * is the gated append below, emitted exactly once when `ctx.aplica_cognitivo === true`
 * (zero otherwise), routed to the real prova-cognitiva screen. `testeContract.ts` is NOT
 * edited (the Phase-25 FUNIL-05 guard asserts its cognitivo mapping stays `['cognitivo']`).
 *
 * FUNIL-12: EVERY card's state is derived from the neutral `get_avaliacao_status`
 * booleans (`status`), never the phantom per-entry vaga-config status field.
 */
function deriveCards(
  ctx: AvaliacaoContext | undefined,
  status: AvaliacaoStatus | undefined,
): TesteCard[] {
  if (!ctx) return []
  const raw = ctx.testes_aplicaveis
  if (!Array.isArray(raw)) return []
  const cards: TesteCard[] = []
  for (const entry of raw as Array<Record<string, unknown>>) {
    const templateTeste = String(entry.teste ?? '')
    // Drop non-candidate-facing tests (triagem/entrevista) + unknown ids.
    if (!CANDIDATE_FACING.has(templateTeste)) continue
    // BLOCKER 1: skip the always-emitted template `cognitivo` entry — the cognitivo card
    // is appended once below, gated on the vaga column (never the template entry).
    if (templateTeste === 'cognitivo') continue
    const tempoEstimadoMin =
      typeof entry.tempoEstimadoMin === 'number'
        ? entry.tempoEstimadoMin
        : typeof entry.tempo_est_min === 'number'
          ? (entry.tempo_est_min as number)
          : null
    const formato =
      typeof entry.formato === 'string' ? (entry.formato as string) : undefined
    for (const containerId of templateTesteToContainerCards(templateTeste)) {
      cards.push({
        teste: containerId,
        status: deriveCardState(containerId, status),
        tempoEstimadoMin,
        formato,
      })
    }
  }
  // FUNIL-08: append the cognitivo card LAST (26-UI-SPEC ordering), gated on the vaga
  // column `aplica_cognitivo` (source of truth), NOT the always-present template entry.
  // Emitted EXACTLY ONCE → routes to `/candidato/prova-cognitiva/:id` via CONTAINER_TESTE_CONFIG.
  if (ctx.aplica_cognitivo === true) {
    cards.push({
      teste: 'cognitivo',
      status: deriveCardState('cognitivo', status),
      tempoEstimadoMin: null,
    })
  }
  return cards
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

  // FUNIL-12: sibling status query — per-card PRESENCE booleans from the candidate's own
  // rows (get_avaliacao_status). This is the source of truth for card completion state
  // (replaces the phantom per-entry vaga-config status field); it never carries a raw score.
  const { data: statusData } = useQuery({
    queryKey: ['avaliacao', 'status', candidaturaId],
    queryFn: () => getAvaliacaoStatus(candidaturaId as string),
    enabled: Boolean(candidaturaId),
  })

  const cards = useMemo(() => deriveCards(data, statusData), [data, statusData])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/auth/login', { replace: true })
    } catch {
      /* logout failures are non-blocking here */
    }
  }

  const handleOpenTeste = (card: TesteCard) => {
    // Route through the single container config (label + route co-located); the
    // essay editor's own /candidato/redacao/:id path is encoded there too.
    const cfg =
      CONTAINER_TESTE_CONFIG[card.teste as ContainerTeste] ??
      (card.teste === 'bigfive' ? CONTAINER_TESTE_CONFIG.big_five : undefined)
    if (cfg) {
      navigate(cfg.route(candidaturaId as string))
      return
    }
    // Legacy fallback: an unlabeled card with a `formato` hint routes to the open
    // case; otherwise the MC screen. deriveCards now filters unknown ids out via
    // the lib, so this only guards stray presentational-mode inputs.
    const target = card.formato === 'caso_aberto' ? 'caso' : 'mc'
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

  // Etapa gate (server-enforced by RLS; mirror neutrally in the UI). Reads the single
  // AVALIACAO_ASSINCRONA_ETAPA constant the route↔gate contract test also asserts.
  if (data && data.candidatura.etapa_atual !== AVALIACAO_ASSINCRONA_ETAPA) {
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
