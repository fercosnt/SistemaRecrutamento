/**
 * Phase 11 / Plan 11-05 (AVAL-02 / RF-13) — the SJT multiple-choice screen.
 *
 * Renders the cargo's SJT `perguntas` (formato='mc') one situation at a time
 * ("Situação {n} de {total}"): the "Cenário" label + scenario body (16px/1.5) +
 * a shadcn `radio-group` of options fetched via `getOpcoesSjt` (the answer-key-
 * safe RPC — ONLY opcao_id + opcao_texto, server-randomized; the candidate never
 * sees peso/tag). A soft timer counts up with NO hard cutoff
 * ("Tempo sugerido: {mm:ss} (sem limite rígido)"). On the last item "Concluir
 * avaliação" opens the irreversible-submit `alert-dialog`; on confirm it submits
 * ONLY the option picks via `avaliacaoService.pontuarSjt` — the client never
 * computes or posts a score (RNF-07a / anti-tamper Pitfall 5). A 42501 back-lock
 * surfaces neutrally.
 *
 * @see src/features/avaliacao/components/AvaliacaoContainer.tsx (shell + nav)
 * @see src/features/avaliacao/services/avaliacaoService.ts (getOpcoesSjt, pontuarSjt)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-UI-SPEC.md (SJT MC screen)
 * @module features/avaliacao/components/SjtMultiplaEscolhaScreen
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Clock } from 'lucide-react'
import { BackgroundImage } from '@/components/BackgroundImage'
import { GlassPanel, GlassButton, Glass } from '@/components/ui/glass'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
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
  getAvaliacaoContext,
  getOpcoesSjt,
  pontuarSjt,
  AvaliacaoServiceError,
  type PerguntaSjt,
  type OpcaoSjt,
} from '@/features/avaliacao/services/avaliacaoService'
import type { RespostaMcItem } from '@/features/avaliacao/schemas/respostaAvaliacaoSchema'

/** Stable per-session Fisher-Yates shuffle (anti-cheat — opcao_id→label stable). */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** One question's options sub-view — fetches the answer-key-safe options. */
function OpcoesRadio({
  pergunta,
  value,
  onChange,
}: {
  pergunta: PerguntaSjt
  value: string | undefined
  onChange: (opcaoId: string) => void
}) {
  const { data: opcoes, isLoading } = useQuery({
    queryKey: ['avaliacao', 'opcoes', pergunta.id],
    queryFn: () => getOpcoesSjt(pergunta.id),
    staleTime: Infinity, // keep the order stable for the session
  })

  // Shuffle once per fetched set (anti-cheat). useMemo keyed on the option ids.
  const ordered = useMemo<OpcaoSjt[]>(
    () => (opcoes ? shuffle(opcoes) : []),
    [opcoes],
  )

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-white/10 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
      {ordered.map((o) => (
        <Label
          key={o.opcao_id}
          htmlFor={o.opcao_id}
          className="flex items-center gap-3 min-h-[44px] rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-3 cursor-pointer text-white text-base font-normal transition-colors"
        >
          <RadioGroupItem id={o.opcao_id} value={o.opcao_id} className="border-white text-white" />
          <span className="leading-relaxed">{o.opcao_texto}</span>
        </Label>
      ))}
    </RadioGroup>
  )
}

export function SjtMultiplaEscolhaScreen() {
  const navigate = useNavigate()
  const { candidaturaId } = useParams<{ candidaturaId: string }>()

  const { data: ctx, isLoading } = useQuery({
    queryKey: ['avaliacao', 'context', candidaturaId],
    queryFn: () => getAvaliacaoContext(candidaturaId as string),
    enabled: Boolean(candidaturaId),
  })

  const perguntas = useMemo<PerguntaSjt[]>(
    () => (ctx?.perguntas ?? []).filter((p) => p.formato === 'mc'),
    [ctx],
  )

  const [index, setIndex] = useState(0)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [seconds, setSeconds] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Soft timer — counts up, NO hard cutoff (the candidate is never timed out).
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const queryClient = useQueryClient()
  const backToPanel = () => navigate(`/candidato/avaliacao/${candidaturaId}`)

  const handleSubmit = async () => {
    const items: RespostaMcItem[] = Object.entries(respostas).map(
      ([pergunta_id, opcao_id]) => ({ pergunta_id, opcao_id }),
    )
    setSubmitting(true)
    try {
      await pontuarSjt(candidaturaId as string, items)
      // 2026-09-06: sem isto o hub voltava a mostrar «Pendente · Começar avaliação» para
      // um SJT já enviado (a query ['avaliacao','status'] ficava em cache até o reload).
      await queryClient.invalidateQueries({ queryKey: ['avaliacao', 'status', candidaturaId] })
      toast.success('Avaliação enviada com sucesso')
      backToPanel()
    } catch (err) {
      if (err instanceof AvaliacaoServiceError && err.code === 'LOCKED') {
        toast.info('Sua etapa avançou. Esta avaliação foi encerrada.')
        backToPanel()
        return
      }
      toast.error('Não foi possível enviar agora. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

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

  if (perguntas.length === 0) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <p className="text-white/90 text-xl mb-4">Nenhuma avaliação pendente</p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  const total = perguntas.length
  const current = perguntas[index]
  const isLast = index === total - 1
  const currentAnswered = Boolean(respostas[current.id])
  const allAnswered = perguntas.every((p) => respostas[p.id])

  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="text-white space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold drop-shadow-md">
            Situação {index + 1} de {total}
          </h1>
          <div className="flex items-center gap-1.5 text-sm text-white/70">
            <Clock className="w-4 h-4" />
            <span>Tempo sugerido: {mmss(seconds)} (sem limite rígido)</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-white/80">Cenário</p>
          <p className="text-base leading-relaxed text-white whitespace-pre-line">
            {current.cenario}
          </p>
          <p className="text-sm text-white/70 pt-2">
            Leia a situação e escolha a alternativa que melhor representa como você agiria.
          </p>
        </div>

        <OpcoesRadio
          key={current.id}
          pergunta={current}
          value={respostas[current.id]}
          onChange={(opcaoId) =>
            setRespostas((r) => ({ ...r, [current.id]: opcaoId }))
          }
        />

        <div className="flex items-center justify-between gap-4 pt-2">
          {index > 0 ? (
            <GlassButton
              variant="white"
              onClick={() => setIndex((i) => i - 1)}
              className="text-white min-h-[44px]"
            >
              Voltar
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
              Avançar
            </GlassButton>
          ) : (
            <AlertDialog>
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
                    'Concluir avaliação'
                  )}
                </GlassButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enviar avaliação?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Após enviar, você não poderá editar suas respostas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Revisar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>Enviar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </GlassPanel>
    </ScreenShell>
  )
}

/** Shared glass shell for the SJT screens (mobile-first, narrow column). */
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
