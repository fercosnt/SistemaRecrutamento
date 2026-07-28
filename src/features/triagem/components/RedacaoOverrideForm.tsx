/**
 * RedacaoOverrideForm — the RH human-review override form (AVAL-07 / RF-R-23/24).
 *
 * 4 BARS sliders (D1-D4, 1-5, default = IA score) that recompute the composite
 * (= mean of valid dims × 20, with the red-flag/D1≤2 caps) + the 3-color from the
 * per-vaga threshold (default {vermelho_max:40, amarelo_max:64}) LIVE on every
 * change — mirroring the EF's `computeScoreAndCors` client-side. `notas_revisor` is
 * mandatory (≥50 chars on EVERY decision); `decisao_revisor` is a radio ∈ {aprovado,
 * reprovado, duvida}. Aprovar/Reprovar require an AlertDialog confirm; Dúvida
 * escalates inline (no destructive confirm). J/K/A/R/D keyboard shortcuts. "Salvar
 * revisão" is disabled until notes ≥50 AND a decision is chosen. The AI is always a
 * suggestion; the human always decides (RNF-07a). All copy verbatim from UI-SPEC.
 *
 * @module features/triagem/components/RedacaoOverrideForm
 * @see src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx (RadioGroup + AlertDialog idiom)
 * @see supabase/functions/avaliar-redacao-cultural/_local/compute-score.ts (the recompute math mirrored here)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md (§RH human-review queue)
 */
import { useEffect, useMemo, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/components/ui/utils'
import { RedacaoCorBadge } from './RedacaoCorBadge'
import { SugestaoIABadge } from './SugestaoIABadge'
import {
  NOTAS_MIN_CHARS,
  type DecisaoRevisor,
  type RedacaoCor,
} from '../services/revisaoRedacaoService'

/** The 4 Beauty Smile value dimensions (BARS, 1-5). D1-D4 in fixed order. */
const DIMENSOES = [
  { key: 'D1', label: 'Experiência UAU' },
  { key: 'D2', label: 'Inovação' },
  { key: 'D3', label: 'Atitude de Dono' },
  { key: 'D4', label: 'Sede de Crescimento' },
] as const

type DimKey = (typeof DIMENSOES)[number]['key']

export interface IaScores {
  D1?: number | null
  D2?: number | null
  D3?: number | null
  D4?: number | null
}

/** The per-vaga 3-color threshold (default 40/64 — UI-SPEC). */
export interface CorThreshold {
  vermelho_max: number
  amarelo_max: number
}

const DEFAULT_THRESHOLD: CorThreshold = { vermelho_max: 40, amarelo_max: 64 }

/**
 * Mirrors the EF `computeScoreAndCors` client-side: composite = mean(valid dims) × 20,
 * red-flag cap → MIN(score,30), D1≤2 cap → MIN(score,50), color from the per-vaga
 * threshold. Pure derived state — recomputed on every slider change.
 */
export function recomputeCompositeAndCor(
  scores: Record<DimKey, number>,
  threshold: CorThreshold,
  redFlagEtico: boolean,
): { composite: number; cor: RedacaoCor } {
  const dims = DIMENSOES.map((d) => scores[d.key]).filter(
    (v): v is number => typeof v === 'number' && !Number.isNaN(v),
  )
  let composite = dims.length > 0
    ? Math.round((dims.reduce((a, b) => a + b, 0) / dims.length) * 20 * 100) / 100
    : 0

  const d1 = scores.D1
  if (redFlagEtico) composite = Math.min(composite, 30)
  if (typeof d1 === 'number' && d1 <= 2) composite = Math.min(composite, 50)

  let cor: RedacaoCor
  if (composite <= threshold.vermelho_max || redFlagEtico || (typeof d1 === 'number' && d1 <= 2)) {
    cor = 'vermelho'
  } else if (composite <= threshold.amarelo_max) {
    cor = 'amarelo'
  } else {
    cor = 'verde'
  }
  return { composite, cor }
}

function clampScore(v: number | null | undefined): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return 3
  return Math.min(5, Math.max(1, Math.round(v)))
}

export interface RedacaoOverrideFormProps {
  /** The IA-suggested baseline the sliders default to. */
  iaScores: IaScores
  /** The per-vaga 3-color threshold (default 40/64). */
  threshold?: CorThreshold
  /** Whether the IA flagged a red flag ético (drives the cap + color). */
  redFlagEtico?: boolean
  /** Called with the override payload when "Salvar revisão" is confirmed. */
  onSalvar?: (payload: {
    decisao: DecisaoRevisor
    notas: string
    scores_humanos: Record<DimKey, number>
  }) => void
  /** Disables the form while a save is in flight. */
  saving?: boolean
  className?: string
}

/**
 * The RH override form — 4 BARS sliders + notes ≥50 gate + decisão radio + confirm.
 */
export function RedacaoOverrideForm({
  iaScores,
  threshold = DEFAULT_THRESHOLD,
  redFlagEtico = false,
  onSalvar,
  saving = false,
  className,
}: RedacaoOverrideFormProps) {
  const [scores, setScores] = useState<Record<DimKey, number>>({
    D1: clampScore(iaScores.D1),
    D2: clampScore(iaScores.D2),
    D3: clampScore(iaScores.D3),
    D4: clampScore(iaScores.D4),
  })
  const [notas, setNotas] = useState('')
  const [decisao, setDecisao] = useState<DecisaoRevisor | ''>('')
  const [confirmFor, setConfirmFor] = useState<'aprovado' | 'reprovado' | null>(null)

  const { composite, cor } = useMemo(
    () => recomputeCompositeAndCor(scores, threshold, redFlagEtico),
    [scores, threshold, redFlagEtico],
  )

  const notasLen = notas.trim().length
  const notasOk = notasLen >= NOTAS_MIN_CHARS
  const canSave = notasOk && decisao !== '' && !saving

  function setDim(key: DimKey, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  function doSave(d: DecisaoRevisor) {
    if (!notasOk) return
    onSalvar?.({ decisao: d, notas, scores_humanos: scores })
  }

  /** A/R need an AlertDialog confirm; D escalates inline (no destructive confirm). */
  function requestDecision(d: DecisaoRevisor) {
    if (!notasOk) return
    if (d === 'duvida') {
      doSave('duvida')
    } else {
      setConfirmFor(d)
    }
  }

  // J/K/A/R/D keyboard shortcuts (UI-SPEC §Keyboard-shortcuts hint).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      // Don't hijack typing in the notes textarea / inputs.
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return
      const k = e.key.toLowerCase()
      if (k === 'a') {
        setDecisao('aprovado')
        requestDecision('aprovado')
      } else if (k === 'r') {
        setDecisao('reprovado')
        requestDecision('reprovado')
      } else if (k === 'd') {
        setDecisao('duvida')
        requestDecision('duvida')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notasOk, notas, scores])

  return (
    <div className={cn('space-y-6', className)}>
      {/* BARS sliders ------------------------------------------------------ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white/90">Ajuste por dimensão</h3>
          <SugestaoIABadge variant="compact" />
        </div>
        <p className="text-xs text-white/50">
          BARS D1-D4 (escala 1-5). Ética como princípio fundante acima das 4.
        </p>

        {DIMENSOES.map((dim) => (
          <div key={dim.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white/90">{dim.label}</span>
              <span className="text-sm font-semibold text-white/70">
                {scores[dim.key]} / 5
              </span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[scores[dim.key]]}
              onValueChange={(v: number[]) => setDim(dim.key, v[0])}
              aria-label={dim.label}
              aria-valuetext={`${scores[dim.key]} de 5`}
              disabled={saving}
            />
          </div>
        ))}

        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-sm font-semibold text-white/80">
            Composto: <span className="text-white">{composite}</span>
            <span className="text-white/50"> / 100</span>
          </span>
          <RedacaoCorBadge cor={cor} />
        </div>
        <p className="text-xs text-white/50">Composto e cor recalculados ao ajustar.</p>
      </div>

      {/* Notas ≥50 -------------------------------------------------------- */}
      <div className="space-y-2">
        <Label htmlFor="notas-revisor" className="text-sm font-semibold text-white/90">
          Justificativa da revisão (obrigatória)
        </Label>
        <Textarea
          id="notas-revisor"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Explique sua decisão. Mínimo 50 caracteres."
          className="min-h-24 bg-white/5 text-base text-white placeholder:text-white/40"
          disabled={saving}
        />
        <p
          className={cn(
            'text-sm font-semibold',
            notasOk ? 'text-white/70' : 'text-white/50',
          )}
        >
          {notasOk
            ? `${notasLen} caracteres`
            : `${notasLen}/${NOTAS_MIN_CHARS} — mínimo ${NOTAS_MIN_CHARS} caracteres`}
        </p>
      </div>

      {/* Decisão radio ---------------------------------------------------- */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-white/90">Decisão</p>
        <RadioGroup
          value={decisao || undefined}
          onValueChange={(v: string) => setDecisao(v as DecisaoRevisor)}
          className="flex flex-col gap-2"
        >
          {(
            [
              { v: 'aprovado', label: 'Aprovado' },
              { v: 'reprovado', label: 'Reprovado' },
              { v: 'duvida', label: 'Dúvida — escalar ao gestor' },
            ] as const
          ).map((opt) => {
            const selected = decisao === opt.v
            const id = `decisao-${opt.v}`
            return (
              <Label
                key={opt.v}
                htmlFor={id}
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-normal text-white transition-colors',
                  selected ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20',
                )}
              >
                <RadioGroupItem id={id} value={opt.v} className="border-white text-white" />
                <span>{opt.label}</span>
              </Label>
            )
          })}
        </RadioGroup>
        {decisao === 'duvida' ? (
          <p className="text-xs text-white/60">
            Esta redação seguirá para o gestor da vaga decidir. Não finaliza a avaliação.
          </p>
        ) : null}
      </div>

      {/* Salvar ----------------------------------------------------------- */}
      <Button
        type="button"
        disabled={!canSave}
        onClick={() => decisao && requestDecision(decisao)}
        title={
          canSave
            ? undefined
            : 'Escreva uma justificativa de pelo menos 50 caracteres e escolha uma decisão.'
        }
        className="min-h-[44px] w-full bg-white/20 text-white hover:bg-white/30"
      >
        Salvar revisão
      </Button>

      {/* A/R confirm dialog ---------------------------------------------- */}
      <AlertDialog
        open={confirmFor !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmFor(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmFor === 'reprovado' ? 'Reprovar redação?' : 'Aprovar redação?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFor === 'reprovado'
                ? 'Confirme sua justificativa (mínimo 50 caracteres).'
                : 'A justificativa registrada será salva.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmFor) doSave(confirmFor)
                setConfirmFor(null)
              }}
              className={cn(
                confirmFor === 'reprovado' &&
                  'bg-[#EF4444] text-white hover:bg-[#EF4444]/90',
              )}
            >
              {confirmFor === 'reprovado' ? 'Reprovar' : 'Aprovar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
