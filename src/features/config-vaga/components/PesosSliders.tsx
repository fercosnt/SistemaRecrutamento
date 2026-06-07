/**
 * Phase 7 / VAGACFG-02 — PesosSliders (D-07, D-08).
 *
 * Exactly 4 integer sliders (`triagem`, `work_sample_sjt`, `redacao_cultural`,
 * `entrevista`) that must sum to 100. A live "Soma: X%" indicator renders the
 * VALID state (accent `#35BFAD`) at 100, and the ERROR state (`#EF4444`,
 * "Soma: X% (faltam Y%)") otherwise.
 *
 * FREE sliders + inline error. NO silent rebalance (D-08): dragging one slider
 * only changes that key — the other three keep their value. The optional
 * "Normalizar para 100%" button is the ONLY way the system touches values, and
 * only on explicit click. `big_five` + `cognitivo` render as read-only context
 * chips labelled "contexto — não pontua" (D-07).
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-UI-SPEC.md §Color/Copywriting
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-07, D-08)
 * @module features/config-vaga/components/PesosSliders
 */
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { GlassButton } from '@/components/ui/glass'
import { cn } from '@/components/ui/utils'
import {
  somaPesos,
  type PesosAvaliacao,
} from '../schemas/pesosAvaliacaoSchema'

export interface PesosSlidersProps {
  value: PesosAvaliacao
  onChange: (next: PesosAvaliacao) => void
}

/** The 4 weighted decision keys with their pt-BR labels (UI reading order). */
const PESO_KEYS: { key: keyof PesosAvaliacao; label: string }[] = [
  { key: 'triagem', label: 'Triagem' },
  { key: 'work_sample_sjt', label: 'Work Sample / SJT' },
  { key: 'redacao_cultural', label: 'Redação Cultural' },
  { key: 'entrevista', label: 'Entrevista' },
]

/** Read-only context tests (no peso, excluded from the sum — D-07). */
const CONTEXT_CHIPS = ['Big Five', 'Cognitivo']

/**
 * Distribute the remainder to reach exactly 100 while keeping integers
 * (Pitfall 4). Adds the diff to the first key, clamped to [0, 100].
 */
function normalizarPara100(value: PesosAvaliacao): PesosAvaliacao {
  const total = somaPesos(value)
  const diff = 100 - total
  const next = { ...value }
  next.triagem = Math.max(0, Math.min(100, next.triagem + diff))
  return next
}

export function PesosSliders({ value, onChange }: PesosSlidersProps) {
  const soma = somaPesos(value)
  const isValid = soma === 100
  const faltam = 100 - soma

  const setKey = (key: keyof PesosAvaliacao, next: number) => {
    // No silent rebalance (D-08): only the dragged key changes.
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white drop-shadow-sm text-xl font-semibold">
          Pesos de avaliação
        </h3>
        <p className="text-white/60 drop-shadow-sm text-sm">
          Os quatro pesos precisam somar 100%. Ajuste livremente — nada é
          rebalanceado automaticamente.
        </p>
      </div>

      <div className="space-y-4">
        {PESO_KEYS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white drop-shadow-sm text-sm font-semibold">
                {label}
              </Label>
              <span className="text-white drop-shadow-sm text-base font-semibold tabular-nums">
                {value[key]}%
              </span>
            </div>
            <Slider
              aria-label={label}
              min={0}
              max={100}
              step={1}
              value={[value[key]]}
              onValueChange={(vals) => setKey(key, vals[0])}
              className="min-h-[44px]"
            />
          </div>
        ))}
      </div>

      {/* Live "Soma: X%" indicator (UI-SPEC §Copywriting). */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <span
          className={cn(
            'text-base font-semibold drop-shadow-sm',
            isValid ? 'text-[#35BFAD]' : 'text-[#EF4444]'
          )}
        >
          {isValid
            ? 'Soma: 100% — pesos prontos para publicar'
            : `Soma: ${soma}% (faltam ${faltam}%)`}
        </span>

        {!isValid && (
          <GlassButton
            variant="white"
            onClick={(e) => {
              e.preventDefault()
              onChange(normalizarPara100(value))
            }}
            className="text-white text-sm"
          >
            Normalizar para 100%
          </GlassButton>
        )}
      </div>

      {/* Read-only context chips — não pontuam (D-07). */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {CONTEXT_CHIPS.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/60"
          >
            {chip} — contexto, não pontua
          </span>
        ))}
      </div>
    </div>
  )
}
