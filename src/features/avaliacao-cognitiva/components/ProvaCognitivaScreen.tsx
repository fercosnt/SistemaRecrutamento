/**
 * Phase 14 / Plan 14-06 (ENTREV-05) — the candidate cognitive-reasoning prova.
 *
 * The opt-in (`vaga.aplica_cognitivo`, default false) mobile-first prova on the
 * established SJT `ScreenShell` (BackgroundImage gradient + overlay 15% + max-w-2xl
 * + py-20). Presents one CC0 reasoning item at a time (radio-group of `alternativas`
 * with `min-h-[44px]` labels — the candidate sees ONLY enunciado + alternativas,
 * never the answer key), a transparent proctoring disclosure, a soft count-up timer
 * (NO hard cutoff), Voltar/Avançar nav, and a "Concluir prova" CTA gated by an
 * irreversible `alert-dialog`.
 *
 * Light proctoring (`useProctoring`): the soft timer + tab-blur/visibilitychange
 * logging (context only, never auto-rejects) + paste-block on the answer field
 * (neutral toast). NO camera/screen/media-device access (CONTEXT decision).
 *
 * Submit posts ONLY raw picks via `cognitivoService.submitProva` (the server is the
 * sole scorer; the answer key never reaches the client). On success the candidate
 * sees the NEUTRAL "Prova registrada. Acompanhe o andamento pelo seu painel." — never
 * a score/band/threshold/pass-fail (RNF-07a); a 42501 back-lock → "Sua etapa avançou."
 *
 * Product language is non-clinical — "prova de raciocínio lógico" / "avaliação
 * cognitiva contextual"; the LGPD-04 forbidden-strings guard enforces that the
 * clinical/psychometric framing never appears in any candidate-facing copy.
 *
 * @see src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx (the ScreenShell + soft-timer + radio-group + irreversible AlertDialog this clones)
 * @see src/features/avaliacao-cognitiva/services/cognitivoService.ts (getContexto/listItens/submitProva)
 * @see src/features/avaliacao-cognitiva/hooks/useProctoring.ts (paste-block + tab-blur logging)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§Copywriting Contract — candidate cognitive prova)
 * @module features/avaliacao-cognitiva/components/ProvaCognitivaScreen
 */
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Clock, ShieldCheck } from 'lucide-react'
import { BackgroundImage } from '@/components/BackgroundImage'
import { GlassPanel, GlassButton, Glass } from '@/components/ui/glass'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  getContexto,
  listItens,
  submitProva,
  type ItemCognitivoCandidato,
} from '@/features/avaliacao-cognitiva/services/cognitivoService'
import { useProctoring } from '@/features/avaliacao-cognitiva/hooks/useProctoring'

/** Verbatim pt-BR copy from 14-UI-SPEC §Copywriting Contract (candidate cognitive prova). */
const COPY = {
  heading: 'Prova de raciocínio lógico',
  // FX-13: the prova has NO autosave (picks live in local state and are posted only
  // at submit, unlike the Big Five). Softened to not promise persistence the screen
  // does not deliver — directs the candidate to finish in one sitting.
  intro:
    'Esta etapa avalia raciocínio lógico. Faça com calma — não há limite rígido de tempo. Conclua a prova em uma única sessão; suas respostas são enviadas ao finalizar.',
  proctoring:
    'Para garantir uma avaliação justa, registramos quando a aba perde o foco e o campo de resposta não aceita colar. Nenhuma câmera, gravação ou biometria é usada.',
  questionLabel: (n: number, total: number) => `Questão ${n} de ${total}`,
  scenarioLabel: 'Enunciado',
  timer: (mmss: string) => `Tempo nesta prova: ${mmss} (sem limite rígido)`,
  back: 'Voltar',
  forward: 'Avançar',
  submitCta: 'Concluir prova',
  submitDisabledTooltip: 'Responda todas as questões para concluir.',
  postSubmit: 'Prova registrada. Acompanhe o andamento pelo seu painel.',
  etapaAdvanced:
    'Sua etapa avançou. Esta prova foi encerrada e suas respostas já estão salvas.',
  notAvailableHeading: 'Esta etapa não está disponível.',
  notAvailableBody: 'Ela aparecerá aqui quando for a sua vez.',
  loadFailedHeading: 'Não foi possível carregar a prova.',
  loadFailedBody: 'Verifique sua conexão e tente novamente.',
  retry: 'Tentar novamente',
  backToPanel: 'Voltar ao painel',
  dialogTitle: 'Enviar prova?',
  dialogBody: 'Após enviar, você não poderá editar suas respostas.',
  dialogConfirm: 'Enviar prova',
  dialogCancel: 'Revisar',
} as const

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ProvaCognitivaScreen() {
  const navigate = useNavigate()
  const { candidaturaId } = useParams<{ candidaturaId: string }>()

  const backToPanel = () => navigate('/candidato/dashboard')

  // Context — resolves the opt-in gate (vaga.aplica_cognitivo) + the etapa.
  const {
    data: ctx,
    isLoading: ctxLoading,
    isError: ctxError,
    refetch: refetchCtx,
  } = useQuery({
    queryKey: ['cognitivo', 'contexto', candidaturaId],
    queryFn: () => getContexto(candidaturaId as string),
    enabled: Boolean(candidaturaId),
  })

  const optedIn = ctx?.aplica_cognitivo === true

  // Items — only fetched once the candidate is opted in (no gabarito ever read).
  const {
    data: itens,
    isLoading: itensLoading,
    isError: itensError,
    refetch: refetchItens,
  } = useQuery({
    queryKey: ['cognitivo', 'itens', candidaturaId],
    queryFn: () => listItens(),
    enabled: Boolean(candidaturaId) && optedIn,
  })

  const perguntas = useMemo<ItemCognitivoCandidato[]>(() => itens ?? [], [itens])

  const [index, setIndex] = useState(0)
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // A stable per-session shuffle seed (advisory anti-cheat context, NOT a score). The
  // prova presents items in `ordem`; the seed records the session for the audit trail.
  const [shuffleSeed] = useState<string>(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `seed-${Date.now()}`,
  )

  // Light proctoring — soft timer + tab-blur logging + paste-block (context only).
  // CR-02: blurCount + events are now read and persisted via submitProva (the
  // "registramos quando a aba perde o foco" disclosure is truthful).
  const { seconds, blurCount, events, pasteBlockHandler } = useProctoring({
    enabled: optedIn && !done,
  })

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const outcome = await submitProva(candidaturaId as string, respostas, shuffleSeed, {
        blurCount,
        events,
        completionTimeSeconds: seconds,
      })
      if (outcome === 'locked') {
        toast.info(COPY.etapaAdvanced)
        setDone(true)
        return
      }
      setDone(true)
    } catch {
      // IN-01: collapsed the duplicate-toast if/else — both branches showed the
      // identical message. Any submit failure surfaces the same retryable toast.
      toast.error('Não foi possível enviar a prova agora. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (ctxLoading) {
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

  // ── Context load error ────────────────────────────────────────────────────────
  if (ctxError) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12 space-y-4">
          <p className="text-white text-xl font-semibold drop-shadow-md">{COPY.loadFailedHeading}</p>
          <p className="text-white/80">{COPY.loadFailedBody}</p>
          <GlassButton variant="white" hover onClick={() => refetchCtx()} className="text-white min-h-[44px]">
            {COPY.retry}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Opt-in gate — the prova only mounts when vaga.aplica_cognitivo is true ──────
  if (!optedIn) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12 space-y-4">
          <p className="text-white text-xl font-semibold drop-shadow-md">{COPY.notAvailableHeading}</p>
          <p className="text-white/80">{COPY.notAvailableBody}</p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white min-h-[44px]">
            {COPY.backToPanel}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Items loading / error (post opt-in) ───────────────────────────────────────
  if (itensLoading) {
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

  if (itensError) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12 space-y-4">
          <p className="text-white text-xl font-semibold drop-shadow-md">{COPY.loadFailedHeading}</p>
          <p className="text-white/80">{COPY.loadFailedBody}</p>
          <GlassButton variant="white" hover onClick={() => refetchItens()} className="text-white min-h-[44px]">
            {COPY.retry}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Post-submit — NEUTRAL acknowledgment (no score/band, RNF-07a) ──────────────
  if (done) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12 space-y-4">
          <p className="text-white text-xl font-semibold drop-shadow-md">{COPY.postSubmit}</p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white min-h-[44px]">
            {COPY.backToPanel}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Empty item set — nothing to answer (graceful) ─────────────────────────────
  if (perguntas.length === 0) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12 space-y-4">
          <p className="text-white text-xl font-semibold drop-shadow-md">{COPY.notAvailableHeading}</p>
          <p className="text-white/80">{COPY.notAvailableBody}</p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white min-h-[44px]">
            {COPY.backToPanel}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  const total = perguntas.length
  const current = perguntas[index]
  const isLast = index === total - 1
  const currentAnswered = respostas[current.id] !== undefined
  const allAnswered = perguntas.every((p) => respostas[p.id] !== undefined)

  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="text-white space-y-6">
        {/* Heading + soft timer */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-semibold drop-shadow-md">{COPY.heading}</h1>
          <div className="flex items-center gap-1.5 text-sm text-white/70 shrink-0">
            <Clock className="w-4 h-4" />
            <span>{COPY.timer(mmss(seconds))}</span>
          </div>
        </div>

        {/* Intro + transparent proctoring disclosure (no camera/recording/biometria) */}
        <div className="space-y-2 text-sm text-white/80">
          <p>{COPY.intro}</p>
          <div className="flex items-start gap-2 rounded-lg border border-white/15 bg-white/5 p-3">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-white/70" />
            <p>{COPY.proctoring}</p>
          </div>
        </div>

        {/* One CC0 item at a time — radio-group; paste-block wired on the answer field */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white/80">
            {COPY.questionLabel(index + 1, total)}
          </p>
          <p className="text-sm font-semibold text-white/70 uppercase tracking-wide">
            {COPY.scenarioLabel}
          </p>
          <p className="text-base leading-relaxed text-white whitespace-pre-line">
            {current.enunciado}
          </p>
        </div>

        <div onPaste={pasteBlockHandler}>
          <RadioGroup
            value={
              respostas[current.id] !== undefined ? String(respostas[current.id]) : undefined
            }
            onValueChange={(v: string) =>
              setRespostas((r) => ({ ...r, [current.id]: Number(v) }))
            }
            className="space-y-3"
          >
            {current.alternativas.map((alt, i) => {
              const optionId = `${current.id}-${i}`
              return (
                <Label
                  key={optionId}
                  htmlFor={optionId}
                  className="flex items-center gap-3 min-h-[44px] rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-3 cursor-pointer text-white text-base font-normal transition-colors"
                >
                  <RadioGroupItem id={optionId} value={String(i)} className="border-white text-white" />
                  <span className="leading-relaxed">{alt}</span>
                </Label>
              )
            })}
          </RadioGroup>
        </div>

        {/* Voltar / Avançar nav + irreversible Concluir prova dialog */}
        <div className="flex items-center justify-between gap-4 pt-2">
          {index > 0 ? (
            <GlassButton
              variant="white"
              onClick={() => setIndex((i) => i - 1)}
              className="text-white min-h-[44px]"
            >
              {COPY.back}
            </GlassButton>
          ) : (
            <span />
          )}

          {!isLast ? (
            <GlassButton
              variant="white"
              hover
              disabled={!currentAnswered}
              onClick={() => setIndex((i) => i + 1)}
              className="text-white min-h-[44px]"
            >
              {COPY.forward}
            </GlassButton>
          ) : (
            <AlertDialog>
              {/*
                FX-09: the submit-disabled hint was a native title= (not reliably
                keyboard/SR reachable). Use the Radix Tooltip on a focusable span so
                the hint is announced; a disabled button doesn't receive focus, so the
                tabIndex=0 span carries the trigger when the CTA is gated.
              */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={!allAnswered ? 0 : undefined} className="inline-flex">
                      <AlertDialogTrigger asChild>
                        <GlassButton
                          variant="white"
                          hover
                          disabled={!allAnswered || submitting}
                          className="text-white min-h-[44px]"
                        >
                          {submitting ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
                            </span>
                          ) : (
                            COPY.submitCta
                          )}
                        </GlassButton>
                      </AlertDialogTrigger>
                    </span>
                  </TooltipTrigger>
                  {!allAnswered ? (
                    <TooltipContent>{COPY.submitDisabledTooltip}</TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{COPY.dialogTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{COPY.dialogBody}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{COPY.dialogCancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>{COPY.dialogConfirm}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </GlassPanel>
    </ScreenShell>
  )
}

/** Shared glass shell for the prova (mobile-first, narrow column) — verbatim SJT. */
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
