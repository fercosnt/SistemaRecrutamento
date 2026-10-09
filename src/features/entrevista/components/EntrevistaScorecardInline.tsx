/**
 * EntrevistaScorecardInline — the inline-editable interview scorecard (ENTREV-02).
 *
 * BARS `Slider` rows per competência (`notas_humanas`, 1-5) + notas do gestor obrigatórias
 * (espelho de `salvar_avaliacao_entrevista`, D-22) + "Salvar avaliação" via the LIVE RPC. Built on the
 * neutral `ScorecardAvaliacao` presentation idiom — NO red/green tint on the scores
 * (mirrors the Phase-11/13 neutrality). The AI suggestion (if any transcript-analysis
 * row exists) seeds the slider defaults; the gestor always decides (RNF-07a).
 * RH-facing only.
 *
 * 49-31 (gap CR-03, D-39): a nota humana é gravada numa análise NOMEADA por id, e a tela
 * diz qual — «Esta avaliação será registrada sobre a análise da {entrevista}». Com mais de
 * uma vigente (online e presencial), o RH escolhe num radiogroup; a vigente mais recente é
 * só o padrão. Sem vigente não há onde gravar, e o Salvar fica desabilitado com a frase do
 * que falta. Quem acrescenta o id ao payload é o workspace; aqui o `onSalvar` continua
 * entregando `{ scoresHumanos, notas }`.
 *
 * 51-04 (JORN-47, D-22): as notas do gestor são obrigatórias nos dois lados. O servidor recusa
 * `p_notas` nulo ou vazio depois de `btrim` (`notas_humanas obrigatorias`, 23514), e a tela
 * deixava clicar com o campo vazio — o RH via só o toast genérico de erro. Agora o cliente
 * espelha a regra: com `notas.trim()` vazio o Salvar fica desabilitado e a tela diz por quê
 * (`entrevista-notas-obrigatorias`). O `trim()` remove todo espaço em branco e o `btrim` do
 * servidor só espaços — o cliente é igual ou mais estrito; nada que o servidor recusa passa.
 *
 * @module features/entrevista/components/EntrevistaScorecardInline
 * @see src/features/triagem/components/RedacaoOverrideForm.tsx (BARS Slider + notes + save)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§Copywriting Scorecard)
 */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import { rotuloTipoAnalise } from './TranscricaoReviewPanel'
import type {
  AnaliseCompetencia,
  EntrevistaAnaliseRow,
  SalvarAvaliacaoPayload,
} from '../services/entrevistaService'

/** Cópia pt-BR da escolha da análise avaliada (49-31). */
export const SCORECARD_COPY = {
  registradaSobre: 'Esta avaliação será registrada sobre a análise da',
  escolherLegenda: 'Qual análise você está avaliando?',
  semVigente: 'Nenhuma análise vigente: analise a transcrição antes de registrar a avaliação.',
  /** 51-04 (D-22): notas vazias depois de `trim()` — o servidor recusaria com 23514. */
  notasObrigatorias: 'Escreva as notas do gestor para salvar a avaliação.',
} as const

/** Default Beauty Smile interview competencies (used when the AI gives none). */
const DEFAULT_COMPETENCIAS = [
  'Experiência UAU',
  'Inovação',
  'Atitude de Dono',
  'Sede de Crescimento',
] as const

function clampScore(v: number | null | undefined): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return 3
  return Math.min(5, Math.max(1, Math.round(v)))
}

export interface EntrevistaScorecardInlineProps {
  /** The AI-suggested competency scores (from the transcript analysis), if any. */
  competenciasIA?: AnaliseCompetencia[] | null
  /** As análises VIGENTES da candidatura — com duas ou mais, o RH escolhe qual avaliar. */
  vigentes?: EntrevistaAnaliseRow[]
  /** O id da análise sobre a qual a nota será gravada; nulo ⇒ não há onde gravar. */
  analiseId?: string | null
  /** O RH escolheu outra vigente. */
  onEscolherAnalise?: (analiseId: string) => void
  saving?: boolean
  onSalvar?: (payload: SalvarAvaliacaoPayload) => void
  className?: string
}

/**
 * The inline-editable scorecard — BARS sliders per competência + notas obrigatórias +
 * Salvar via the RPC. The AI seeds the defaults (badge on the header); the gestor
 * always decides.
 */
export function EntrevistaScorecardInline({
  competenciasIA,
  vigentes = [],
  analiseId = null,
  onEscolherAnalise,
  saving = false,
  onSalvar,
  className,
}: EntrevistaScorecardInlineProps) {
  const emRevisao = analiseId ? (vigentes.find((a) => a.id === analiseId) ?? null) : null
  const semAnalise = !analiseId

  // Build the competency list from the AI suggestion, falling back to defaults.
  const competencias = useMemo<{ key: string; label: string; ia: number | null }[]>(() => {
    const fromIA = (competenciasIA ?? [])
      .filter((c) => c && typeof c.competencia === 'string')
      .map((c) => ({
        key: c.competencia,
        label: c.competencia,
        ia: typeof c.score === 'number' ? c.score : null,
      }))
    if (fromIA.length > 0) return fromIA
    return DEFAULT_COMPETENCIAS.map((label) => ({ key: label, label, ia: null }))
  }, [competenciasIA])

  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(competencias.map((c) => [c.key, clampScore(c.ia)])),
  )
  const [notas, setNotas] = useState('')
  // D-22: mesma regra do servidor (ou mais estrita) — vazio depois de trim() não salva.
  const semNotas = notas.trim().length === 0

  function setDim(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  function handleSalvar() {
    if (saving || semAnalise || semNotas) return
    onSalvar?.({ scoresHumanos: scores, notas })
  }

  const hasIA = competencias.some((c) => c.ia != null)

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-white">Avaliação por competência</h3>
          {hasIA ? <SugestaoIABadge variant="compact" /> : null}
        </div>
        <p className="text-sm font-semibold text-white/60">
          BARS sliders 1–5 — notas_humanas. A decisão é sempre humana.
        </p>
      </div>

      {/* Qual análise recebe a nota (49-31, D-39) — e a escolha, quando há mais de uma. */}
      {emRevisao ? (
        <p
          data-testid="scorecard-analise-em-revisao"
          className="text-base leading-relaxed text-white/90"
        >
          {SCORECARD_COPY.registradaSobre}{' '}
          <span className="font-semibold">{rotuloTipoAnalise(emRevisao.tipo)}</span>.
        </p>
      ) : null}
      {vigentes.length > 1 ? (
        <fieldset className="space-y-2 border-0 p-0" disabled={saving}>
          <legend className="text-sm font-semibold text-white/90">
            {SCORECARD_COPY.escolherLegenda}
          </legend>
          <div
            role="radiogroup"
            aria-label={SCORECARD_COPY.escolherLegenda}
            className="flex flex-wrap gap-2"
          >
            {vigentes.map((a) => {
              const ativo = a.id === analiseId
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => {
                    if (!ativo) onEscolherAnalise?.(a.id)
                  }}
                  disabled={saving}
                  className={cn(
                    'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50',
                    ativo
                      ? 'border-white/40 bg-white/25 hover:bg-white/30'
                      : 'border-white/20 bg-white/5 hover:bg-white/15',
                  )}
                >
                  {rotuloTipoAnalise(a.tipo)}
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {/* BARS sliders — neutral, no red/green tint on the value readout. */}
      <div className="space-y-4">
        {competencias.map((c) => (
          <div key={c.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white/90">{c.label}</span>
              <span className="text-sm font-semibold text-white/70">{scores[c.key]} / 5</span>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[scores[c.key]]}
              onValueChange={(v: number[]) => setDim(c.key, v[0])}
              aria-label={c.label}
              aria-valuetext={`${scores[c.key]} de 5`}
              disabled={saving}
            />
          </div>
        ))}
      </div>

      {/* Notas do gestor obrigatórias (espelho de `salvar_avaliacao_entrevista`, D-22). */}
      <div className="space-y-2">
        <Label htmlFor="entrevista-notas" className="text-sm font-semibold text-white/90">
          Notas do gestor
        </Label>
        <Textarea
          id="entrevista-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Observações sobre a entrevista."
          required
          aria-required="true"
          className="min-h-24 bg-white/5 text-base text-white placeholder:text-white/40"
          disabled={saving}
        />
      </div>

      {semAnalise ? (
        <p className="text-sm text-white/75">{SCORECARD_COPY.semVigente}</p>
      ) : null}
      {semNotas ? (
        <p data-testid="entrevista-notas-obrigatorias" className="text-sm text-white/75">
          {SCORECARD_COPY.notasObrigatorias}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={saving || semAnalise || semNotas}
        onClick={handleSalvar}
        className="min-h-[44px] w-full bg-white/20 text-white hover:bg-white/30"
      >
        Salvar avaliação
      </Button>
    </div>
  )
}

/** Toast helpers wired by the workspace on the save mutation outcome. */
export const SCORECARD_TOAST = {
  success: () => toast.success('Avaliação salva.'),
  error: () => toast.error('Não foi possível salvar a avaliação. Tente novamente.'),
}
