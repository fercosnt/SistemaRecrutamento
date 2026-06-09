/**
 * Phase 12 / Plan 12-05 (AVAL-04 / RF-15) — the candidate Big Five questionnaire.
 *
 * Copies the Phase-11 candidate glass shell (D-27): `BackgroundImage` gradient +
 * narrow column + `GlassPanel`. Renders the 120 IPIP-NEO-120 items (read via
 * `getBigfiveItens` — item_id/texto/ordem ONLY, never the scoring key) paginated
 * 12 pages × 10 (page 0 = intro). Each item is a statement + a 5-point Likert
 * `radio-group` using the fixed PT-BR labels; the selected option is glass-white
 * (`bg-white/30`), NOT the accent. A progress bar + a NEUTRAL "{n}/120" count is
 * the ONLY feedback — the candidate NEVER sees a score/threshold/pass-fail during
 * the questionnaire (RNF-07a, T-12-20). Autosave reuses `useAutosaveAvaliacao`
 * (teste='big_five', 30s debounce + 42501 back-lock). Submit → `submitBigfiveFinal`
 * → toast → route to the devolutiva.
 *
 * @see src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx (the analog screen)
 * @see src/features/avaliacao/hooks/useAutosaveAvaliacao.ts (reused as-is)
 * @see .planning/phases/12-big-five-devolutiva/12-RESEARCH.md UI Notes Screen 1
 * @module features/avaliacao/components/BigFiveQuestionnaireScreen
 */
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Check, Lock } from 'lucide-react'
import { BackgroundImage } from '@/components/BackgroundImage'
import { GlassPanel, GlassButton, Glass } from '@/components/ui/glass'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
  getBigfiveItens,
  submitBigfiveFinal,
  bigfiveKeys,
  BigfiveServiceError,
  type BigfiveItem,
} from '@/features/avaliacao/services/bigfiveService'
import { upsertResposta } from '@/features/avaliacao/services/avaliacaoService'
import { useAutosaveAvaliacao } from '@/features/avaliacao/hooks/useAutosaveAvaliacao'
import {
  LIKERT_LABELS,
  BIGFIVE_TOTAL_ITENS,
  countAnswered,
  isAllAnswered,
} from '@/features/avaliacao/schemas/bigfiveSchema'

const ITENS_POR_PAGINA = 10

/** Fixed emotional disclaimer (templates-devolutiva.md L28) — shown on the intro. */
const DISCLAIMER_EMOCIONAL =
  'Este questionário reflete como você se descreveu hoje. Se você estava cansado, com fome, ou passando por momento difícil, os resultados podem refletir esse estado momentâneo. Os percentis comparam você com uma amostra normativa internacional ampla, ainda sem normas brasileiras formais.'

/** Shared narrow glass shell (mobile-first) — mirrors the SJT screen. */
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

/** Top-right autosave affordance (Saving… / Salvo automaticamente / falha transitória). */
function AutosaveAffordance({ status }: { status: string }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-white/70">
        <Loader2 className="w-4 h-4 animate-spin" /> Salvando…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-sm text-[#35BFAD]">
        <Check className="w-4 h-4" /> Salvo automaticamente
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="text-sm text-white/70">
        Não foi possível salvar agora — tentando novamente…
      </span>
    )
  }
  return <span />
}

/** One Likert item — statement + a 5-point radio row (selected = glass-white). */
function LikertItem({
  item,
  value,
  onChange,
}: {
  item: BigfiveItem
  value: number | undefined
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-3 border-b border-white/10 pb-5">
      <p className="text-base leading-relaxed text-white">{item.texto}</p>
      <RadioGroup
        value={value != null ? String(value) : undefined}
        onValueChange={(v: string) => onChange(Number(v))}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        {LIKERT_LABELS.map((label, i) => {
          const optValue = i + 1
          const selected = value === optValue
          const id = `item-${item.item_id}-opt-${optValue}`
          return (
            <Label
              key={id}
              htmlFor={id}
              className={`flex items-center gap-2 min-h-[44px] flex-1 rounded-lg border border-white/20 px-3 py-2 cursor-pointer text-white text-sm font-normal transition-colors ${
                selected ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <RadioGroupItem
                id={id}
                value={String(optValue)}
                className="border-white text-white"
              />
              <span className="leading-snug">{label}</span>
            </Label>
          )
        })}
      </RadioGroup>
    </div>
  )
}

export function BigFiveQuestionnaireScreen() {
  const navigate = useNavigate()
  const { candidaturaId } = useParams<{ candidaturaId: string }>()

  const { data: itens, isLoading } = useQuery({
    queryKey: bigfiveKeys.itens(),
    queryFn: getBigfiveItens,
    staleTime: Infinity,
  })

  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [page, setPage] = useState(0) // page 0 = intro
  const [submitting, setSubmitting] = useState(false)

  // Autosave (reused as-is, teste='big_five'). The hook owns the 42501 back-lock.
  const autosave = useAutosaveAvaliacao({
    candidaturaId: candidaturaId ?? '',
    teste: 'big_five',
    upsert: (payload) =>
      upsertResposta(candidaturaId ?? '', 'big_five', payload),
  })

  const backToPanel = () => navigate(`/candidato/avaliacao/${candidaturaId}`)

  const ordered = useMemo<BigfiveItem[]>(
    () => (itens ? [...itens].sort((a, b) => a.ordem - b.ordem) : []),
    [itens],
  )

  // 12 question pages of 10 (after the intro page 0).
  const totalQuestionPages = Math.ceil(ordered.length / ITENS_POR_PAGINA)
  const answeredCount = countAnswered(respostas)
  const allAnswered = isAllAnswered(respostas)

  const handleAnswer = (itemId: number, value: number) => {
    setRespostas((r) => {
      const next = { ...r, [String(itemId)]: value }
      autosave.update(next) // immediate sessionStorage buffer + arm 30s flush
      return next
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await autosave.flushNow()
      await submitBigfiveFinal(candidaturaId as string, respostas)
      toast.success('Avaliação enviada com sucesso')
      navigate(`/candidato/avaliacao/${candidaturaId}/bigfive/devolutiva`)
    } catch (err) {
      if (err instanceof BigfiveServiceError && err.code === 'LOCKED') {
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

  // Back-lock (etapa advanced) — neutral, never alarming.
  if (autosave.locked) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white text-center p-12">
          <Lock className="w-12 h-12 text-white/60 mx-auto mb-4" />
          <p className="text-white/90 text-xl mb-4">Sua etapa avançou.</p>
          <GlassButton variant="white" hover onClick={backToPanel} className="text-white">
            Voltar ao painel
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Intro page (page 0) ──
  if (page === 0) {
    return (
      <ScreenShell>
        <GlassPanel variant="white" blur="xl" className="text-white space-y-5">
          <h1 className="text-2xl font-semibold drop-shadow-md">
            Avaliação comportamental
          </h1>
          <p className="text-base leading-relaxed text-white/90">
            A seguir você verá 120 afirmações. Descreva-se com sinceridade, da forma
            como você geralmente é — não há respostas certas ou erradas. É um
            self-assessment do seu estilo de trabalho. Suas respostas são salvas
            automaticamente; você pode fazer pausas.
          </p>
          <p className="text-sm leading-relaxed text-white/70 border-l-2 border-white/20 pl-4">
            {DISCLAIMER_EMOCIONAL}
          </p>
          <div className="flex justify-end pt-2">
            <GlassButton
              variant="white"
              hover
              onClick={() => setPage(1)}
              className="text-white min-h-[44px]"
            >
              Começar
            </GlassButton>
          </div>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Question pages (1..totalQuestionPages) ──
  const pageStart = (page - 1) * ITENS_POR_PAGINA
  const pageItens = ordered.slice(pageStart, pageStart + ITENS_POR_PAGINA)
  const isLastPage = page === totalQuestionPages
  const pageAnswered = pageItens.every((it) => respostas[String(it.item_id)] != null)

  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="text-white space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold drop-shadow-md">
            Página {page} de {totalQuestionPages}
          </h1>
          <AutosaveAffordance status={autosave.status} />
        </div>

        {/* Progress: NEUTRAL count only — never a score (RNF-07a). */}
        <div className="space-y-1.5">
          <Progress value={(answeredCount / BIGFIVE_TOTAL_ITENS) * 100} className="h-2" />
          <p className="text-sm text-white/70 text-right">
            {answeredCount}/{BIGFIVE_TOTAL_ITENS}
          </p>
        </div>

        <div className="space-y-5">
          {pageItens.map((item) => (
            <LikertItem
              key={item.item_id}
              item={item}
              value={respostas[String(item.item_id)]}
              onChange={(v) => handleAnswer(item.item_id, v)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <GlassButton
            variant="white"
            onClick={() => setPage((p) => p - 1)}
            className="text-white min-h-[44px]"
          >
            Voltar
          </GlassButton>

          {!isLastPage ? (
            <GlassButton
              variant="white"
              hover
              disabled={!pageAnswered}
              onClick={() => setPage((p) => p + 1)}
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
