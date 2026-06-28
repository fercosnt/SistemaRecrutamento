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
import { cn } from '@/components/ui/utils'
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
      <span className="flex items-center gap-1.5 text-sm text-[#6EE6D6]">
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

/**
 * One Likert item — the affirmation as the visual star (numbered "{n}/120", larger
 * type, breathing room) + a horizontal 5-point scale (UX-BIGFIVE-01). The 5 points are
 * equal cells numbered 1..5; ONLY the two extremes carry a visible label so the long
 * PT-BR labels never wrap and break the linear scale (the old 4+1 grid orphaned the 5th
 * option). Each point keeps its FULL PT-BR label as an `aria-label` — the radiogroup
 * roving focus + screen-reader names are preserved (a11y, UAT-16 C5). Selected =
 * glass-white (NOT the accent, never implying right/wrong — RNF-07a). Exported for the
 * BigFiveLikert test.
 */
export function LikertItem({
  item,
  numero,
  value,
  onChange,
}: {
  item: BigfiveItem
  /** 1-based global position (1..120), shown as "{numero} / 120". */
  numero: number
  value: number | undefined
  onChange: (v: number) => void
}) {
  const headingId = `bigfive-item-${item.item_id}`
  return (
    <div className="space-y-4 border-b border-white/10 pb-7">
      {/* The affirmation is the star: position marker + larger, heavier statement. */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
          {`${numero} / ${BIGFIVE_TOTAL_ITENS}`}
        </span>
        <p id={headingId} className="text-lg font-semibold leading-snug text-white sm:text-xl">
          {item.texto}
        </p>
      </div>

      {/* Horizontal 5-point scale — equal cells, numbered, only the extremes labeled. */}
      <RadioGroup
        value={value != null ? String(value) : undefined}
        onValueChange={(v: string) => onChange(Number(v))}
        aria-labelledby={headingId}
        className="flex items-stretch gap-1.5 sm:gap-2"
      >
        {LIKERT_LABELS.map((label, i) => {
          const optValue = i + 1
          const selected = value === optValue
          const id = `item-${item.item_id}-opt-${optValue}`
          return (
            <Label
              key={id}
              htmlFor={id}
              className={`flex min-h-[44px] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border px-1 py-2 transition-colors ${
                selected ? 'border-white/40 bg-white/30' : 'border-white/20 bg-white/10 hover:bg-white/20'
              }`}
            >
              <RadioGroupItem
                id={id}
                value={String(optValue)}
                aria-label={label}
                className="border-white text-white"
              />
              <span className="text-sm font-semibold text-white/90">{optValue}</span>
            </Label>
          )
        })}
      </RadioGroup>

      {/* Only the two extremes are labeled — the scale reads left→right. */}
      <div className="flex justify-between text-xs leading-tight text-white/80">
        <span>{LIKERT_LABELS[0]}</span>
        <span>{LIKERT_LABELS[LIKERT_LABELS.length - 1]}</span>
      </div>
    </div>
  )
}

/**
 * Translucent DARK glass surface for the questionnaire (UX-BIGFIVE-02, refinado).
 *
 * O `bg-white/15` original lavava o texto (contraste ruim); a 1ª tentativa
 * (`#00109E/85`, quase opaco + azul saturado) leu bem mas ficou com cara de "sistema
 * antigo" (painel chapado, perdeu o glassmorphism). Aqui voltamos ao GLASS de verdade:
 * um tint PRETO translúcido `bg-black/45` (menos transparente + mais escuro que o
 * white/15, mas ainda glass — mantém o blur e deixa o gradiente vibrante aparecer
 * borrado por trás). Sobre o backdrop vibrante (overlay 15, inalterado), o pior caso
 * (card sobre o ponto mais claro do gradiente) dá: branco 100% 8.1:1, brancos
 * 80–95% 5.8–7.5:1, branco/70 4.9:1 — todos ≥ WCAG AA. O acento turquesa usa um tom
 * mais claro (`#6EE6D6`) p/ passar AA como TEXTO (5.4:1) sem o painel precisar escurecer.
 * `twMerge` (via `cn`/GlassPanel) faz este bg sobrepor o `bg-white/15` da variante.
 */
const PANEL_DARK = 'bg-black/45'

/**
 * The 5-point scale legend (UX-BIGFIVE-02) — explains what each Likert level means
 * (1..5 → the canonical PT-BR label), shown VISIBLY on the intro (full) and at the top
 * of each question page (compact) so the candidate never has to guess what 2/3/4 mean.
 * High-contrast on the dark glass. Exported for the BigFiveIntro test.
 */
export function EscalaLegenda({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-white/85', className)}>
        {LIKERT_LABELS.map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <span>{label}</span>
          </span>
        ))}
      </div>
    )
  }
  return (
    <div className={cn('rounded-lg border border-white/20 bg-black/20 p-4', className)}>
      <p className="mb-2.5 text-sm font-semibold text-white">
        Como responder — a escala vai de 1 a 5:
      </p>
      <ul className="space-y-2">
        {LIKERT_LABELS.map((label, i) => (
          <li key={label} className="flex items-center gap-2.5 text-sm text-white/90">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-xs font-semibold text-white">
              {i + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The Big Five intro panel (UX-BIGFIVE-02) — scannable + legible. The dark brand-blue
 * glass gives white + turquoise text WCAG-AA contrast. The emotional disclaimer is
 * VISIBLE (no collapsed `<details>` — that hid it in the 01), the instructions are
 * richer, and the 5-level scale is explained up front via EscalaLegenda. Exported for
 * the BigFiveIntro test (rendered standalone, without ScreenShell).
 */
export function BigFiveIntro({ onComecar }: { onComecar: () => void }) {
  return (
    <GlassPanel variant="white" blur="xl" className={cn(PANEL_DARK, 'text-white space-y-6')}>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold drop-shadow-md">Avaliação comportamental</h1>
        {/* Scannable highlight line — turquoise now reads on the dark glass (WCAG AA). */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[#6EE6D6]">
          <span>120 afirmações</span>
          <span aria-hidden="true" className="text-white/40">·</span>
          <span>~15 min</span>
          <span aria-hidden="true" className="text-white/40">·</span>
          <span>sem resposta certa ou errada</span>
        </p>
      </div>

      {/* Richer, scannable instructions. */}
      <ul className="space-y-2.5 text-base leading-relaxed text-white/95">
        {[
          'Leia cada afirmação e marque o quanto ela combina com você, pensando em como você é no geral — não só hoje.',
          'Descreva-se com sinceridade: não há resposta certa ou errada. É só o seu estilo, não uma prova nem teste de QI.',
          'São 120 afirmações, em páginas de 10. Você pode pausar e voltar quando quiser — tudo é salvo automaticamente.',
        ].map((linha) => (
          <li key={linha} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6EE6D6]" aria-hidden="true" />
            <span>{linha}</span>
          </li>
        ))}
      </ul>

      {/* The 5-level scale, explained up front and VISIBLE. */}
      <EscalaLegenda />

      {/* Emotional disclaimer — VISIBLE (no collapsed <details>), subtle but readable. */}
      <p className="rounded-lg border-l-2 border-white/30 bg-black/15 px-4 py-3 text-sm leading-relaxed text-white/85">
        {DISCLAIMER_EMOCIONAL}
      </p>

      <div className="flex justify-end pt-1">
        <GlassButton
          variant="white"
          hover
          onClick={onComecar}
          className="text-white min-h-[44px]"
        >
          Começar
        </GlassButton>
      </div>
    </GlassPanel>
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
        <BigFiveIntro onComecar={() => setPage(1)} />
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
      <GlassPanel variant="white" blur="xl" className={cn(PANEL_DARK, 'text-white space-y-6')}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold drop-shadow-md">
            Página {page} de {totalQuestionPages}
          </h1>
          <AutosaveAffordance status={autosave.status} />
        </div>

        {/* Progress: NEUTRAL count only — never a score (RNF-07a). */}
        <div className="space-y-1.5">
          <Progress value={(answeredCount / BIGFIVE_TOTAL_ITENS) * 100} className="h-2" />
          <p className="text-sm text-white/80 text-right">
            {answeredCount}/{BIGFIVE_TOTAL_ITENS}
          </p>
        </div>

        {/* Compact scale reminder at the top of every page (UX-BIGFIVE-02). */}
        <EscalaLegenda compact />

        <div className="space-y-6">
          {pageItens.map((item, idx) => (
            <LikertItem
              key={item.item_id}
              item={item}
              numero={pageStart + idx + 1}
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
