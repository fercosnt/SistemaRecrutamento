/**
 * Phase 15 / Plan 15-04 (DECISAO-04) — the candidate LGPD Art. 20 explanation page.
 *
 * A READ-MOSTLY variant of the `ProvaCognitivaScreen` glass-over-gradient shell
 * (BackgroundImage gradient + overlay 15% + max-w-2xl + py-20). It is a TRANSPARENCY
 * surface, NOT a numeric dump: the candidate sees a high-level result line + a
 * respectful NON-CLINICAL reason (derived from the RH justificativa, never raw) + the
 * LGPD Art. 20 revision-right block + the `SolicitarRevisaoCTA`. It NEVER renders a
 * numeric result, a quantile, or a psychometric verdict (RNF-07a / LGPD-04).
 *
 * Reachability (Pitfall 6 / T-15-14): the page is reachable only after a
 * `decisao_final` with `decisao='rejeitado'` exists (own-row RLS + the service
 * reachability gate). Any other state renders "Esta página não está disponível".
 * Visiting the page stamps `explicacao_solicitada_em` (the `useExplicacao` one-shot
 * visit stamp — transparency evidence, T-15-15).
 *
 * Route wiring (`/candidato/explicacao/:id`, `RoleGuard role="candidato"`) is deferred
 * to Plan 15-06.
 *
 * @see src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx (the ScreenShell + state machine this clones)
 * @see src/features/explicacao/hooks/useExplicacao.ts (useExplicacao — query + visit stamp)
 * @see src/features/explicacao/components/SolicitarRevisaoCTA.tsx (the revision CTA)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (§Candidate LGPD Art. 20 — verbatim copy)
 * @module features/explicacao/components/ExplicacaoCandidatoPage
 */
import { useNavigate, useParams } from 'react-router-dom'
import { BackgroundImage } from '@/components/BackgroundImage'
import { Glass, GlassButton, GlassPanel } from '@/components/ui/glass'
import { useExplicacao } from '../hooks/useExplicacao'
import { SolicitarRevisaoCTA } from './SolicitarRevisaoCTA'

/** Verbatim pt-BR copy from 15-UI-SPEC §Candidate LGPD Art. 20 explanation page. */
const COPY = {
  heading: 'Sobre a sua candidatura',
  resultLine:
    'Após avaliarmos seu processo, decidimos não seguir com a sua candidatura nesta vaga.',
  reasonEyebrow: 'Por que esta decisão',
  gratitude: 'Agradecemos seu interesse e o tempo dedicado ao processo.',
  revisionIntro:
    'Você tem o direito de solicitar a revisão desta decisão por uma pessoa natural (LGPD, Art. 20).',
  revisionResultLabel: 'Resultado da revisão:',
  backToPanel: 'Voltar ao painel',
  notAvailableHeading: 'Esta página não está disponível.',
  notAvailableBody:
    'Ela aparece somente quando há uma decisão de não seguir com a candidatura.',
  loadFailedHeading: 'Não foi possível carregar esta página.',
  loadFailedBody: 'Verifique sua conexão e tente novamente.',
  retry: 'Tentar novamente',
} as const

export function ExplicacaoCandidatoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const backToPanel = () => navigate('/candidato/dashboard')

  // Own-row allowlist read (reachability-gated) + the one-shot visit stamp.
  const { data: explicacao, isLoading, isError, refetch } = useExplicacao(id)

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScreenShell>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Glass key={i} variant="white" blur="md" className="p-6 animate-pulse h-16">
              <span />
            </Glass>
          ))}
        </div>
      </ScreenShell>
    )
  }

  // ── Load error (retry) ────────────────────────────────────────────────────────
  if (isError) {
    return (
      <ScreenShell>
        <GlassPanel
          variant="white"
          blur="xl"
          className="text-white text-center p-12 space-y-4"
        >
          <p className="text-white text-xl font-semibold drop-shadow-md">
            {COPY.loadFailedHeading}
          </p>
          <p className="text-white/80">{COPY.loadFailedBody}</p>
          <GlassButton
            variant="white"
            hover
            onClick={() => refetch()}
            className="text-white min-h-[44px]"
          >
            {COPY.retry}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Not available — no rejection / wrong candidatura (reachability gate) ────────
  if (!explicacao) {
    return (
      <ScreenShell>
        <GlassPanel
          variant="white"
          blur="xl"
          className="text-white text-center p-12 space-y-4"
        >
          <p className="text-white text-xl font-semibold drop-shadow-md">
            {COPY.notAvailableHeading}
          </p>
          <p className="text-white/80">{COPY.notAvailableBody}</p>
          <GlassButton
            variant="white"
            hover
            onClick={backToPanel}
            className="text-white min-h-[44px]"
          >
            {COPY.backToPanel}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Content — high-level result + non-clinical reason + revision right ─────────
  // NEVER a numeric result / quantile / psychometric verdict here (RNF-07a / LGPD-04).
  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="text-white space-y-6">
        <h1 className="text-3xl md:text-4xl font-semibold drop-shadow-md">
          {COPY.heading}
        </h1>

        {/* High-level, non-clinical result line. */}
        <p className="text-base leading-relaxed text-white">{COPY.resultLine}</p>

        {/* Respectful templated reason (derived server-side; never the raw justificativa). */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white/70 uppercase tracking-wide">
            {COPY.reasonEyebrow}
          </p>
          <p className="text-base leading-relaxed text-white/90">{explicacao.reason}</p>
        </div>

        <p className="text-base leading-relaxed text-white/80">{COPY.gratitude}</p>

        {/* If a review result was already provided, surface it (plain text). */}
        {explicacao.revisao_resultado && (
          <div className="rounded-lg border border-white/15 bg-white/5 p-4 space-y-1">
            <p className="text-sm font-semibold text-white/70">
              {COPY.revisionResultLabel}
            </p>
            <p className="text-base leading-relaxed text-white/90">
              {explicacao.revisao_resultado}
            </p>
          </div>
        )}

        {/* LGPD Art. 20 revision-right block + the CTA. */}
        <div className="space-y-3 border-t border-white/15 pt-6">
          <p className="text-base leading-relaxed text-white/90">{COPY.revisionIntro}</p>
          <SolicitarRevisaoCTA
            candidaturaId={id as string}
            revisaoSolicitadaEm={explicacao.revisao_solicitada_em}
          />
        </div>

        {/* Back nav. */}
        <div className="pt-2">
          <GlassButton
            variant="white"
            onClick={backToPanel}
            className="text-white min-h-[44px]"
          >
            {COPY.backToPanel}
          </GlassButton>
        </div>
      </GlassPanel>
    </ScreenShell>
  )
}

/** Shared glass shell — mobile-first narrow column (verbatim ProvaCognitivaScreen). */
function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 max-w-2xl mt-8">{children}</div>
      </BackgroundImage>
    </div>
  )
}
