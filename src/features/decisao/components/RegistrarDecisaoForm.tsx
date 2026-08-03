/**
 * RegistrarDecisaoForm — the terminal decision-capture form (DECISAO-03).
 *
 * A 3-option `decisao` radio (Aprovar / Rejeitar / Manter em espera — selected-state
 * tints per 15-UI-SPEC §Color) + a mandatory justificativa textarea (≥50 chars, the
 * client mirror of the DB CHECK + the `registrar_decisao` re-assertion) + a char
 * counter + a "Registrar decisão" CTA gated on a selection AND ≥50 chars. The confirm
 * runs through an irreversible alert-dialog whose body mentions LGPD Art. 20 for the
 * `rejeitado` path (the candidate may ask for a human to review the decision — the copy
 * was rewritten in plain language in Phase 43 / BD-3, and is pinned by test). The RPC owns the terminal
 * `avancar_etapa()` transition — this form NEVER writes `candidaturas` directly, and a
 * decision NEVER persists without a human actor (RNF-07a / LGPD-02).
 *
 * Append-only: when a decision already exists, the "nova linha auditável" note renders
 * — registering again creates a NEW auditable row, never a silent edit.
 *
 * Analog: ProvaCognitivaScreen (radio-group :314-338 + alert-dialog gate :365-394).
 *
 * @module features/decisao/components/RegistrarDecisaoForm
 * @see src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx (radio + alert-dialog)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (copy + color contract)
 */
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/components/ui/utils'
import { GlassButton } from '@/components/ui/glass'
import {
  DECISAO_OPTIONS,
  JUSTIFICATIVA_MIN,
  type DecisaoFormValues,
} from '../schemas/decisaoSchema'
import type { DecisaoAtual } from '../services/decisaoService'

type Decisao = DecisaoFormValues['decisao']

export interface RegistrarDecisaoFormProps {
  /** Chamado após a confirmação no alert-dialog. */
  onConfirm: (values: DecisaoFormValues) => void
  /** Mutation em andamento (desabilita o CTA + mostra spinner). */
  submitting?: boolean
  /** A decisão atual (se existir) — dispara a nota append-only. */
  decisaoAtual?: DecisaoAtual | null
}

/**
 * Selected-state tints per UI-SPEC §Color (rejeitado=destructive, em_espera=amber,
 * aprovado/unselected=neutral glass). FX-07: `em_espera` text raised `amber-300`→`amber-200`
 * (lighter/brighter amber) so it clears ≥4.5:1 over the composited `bg-amber-500/15` glass
 * on `#00109E` — the amber WARNING semantic is preserved, only the lightness is lifted.
 */
const SELECTED_TINT: Record<Decisao, string> = {
  aprovado: 'border-white/30 bg-white/20 text-white',
  rejeitado: 'border-red-400/30 bg-red-500/15 text-red-300',
  em_espera: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
}

const UNSELECTED_TINT =
  'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'

export function RegistrarDecisaoForm({
  onConfirm,
  submitting = false,
  decisaoAtual = null,
}: RegistrarDecisaoFormProps) {
  const [decisao, setDecisao] = useState<Decisao | null>(null)
  const [justificativa, setJustificativa] = useState('')

  const tooShort = justificativa.length < JUSTIFICATIVA_MIN
  const canSubmit = decisao !== null && !tooShort && !submitting
  const isRejeitado = decisao === 'rejeitado'

  function handleConfirm() {
    if (decisao === null || tooShort) return
    onConfirm({ decisao, justificativa })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Registrar decisão</h2>

      {/* Append-only note when a decision already exists. */}
      {decisaoAtual ? (
        <div className="rounded-lg border border-white/15 bg-white/5 p-4 text-sm text-white/80">
          <span className="font-semibold text-white">Já existe uma decisão registrada.</span>{' '}
          Registrar novamente cria uma nova linha auditável — a decisão anterior não é apagada.
        </div>
      ) : null}

      {/* 3-option decisão selector — Radix RadioGroup (arrow-key roving focus +
          name/role/state for free; AB-2/AB-3/AB-5). Each card is a Label htmlFor-paired
          to its RadioGroupItem so the whole card stays clickable + keyboard-operable. */}
      <RadioGroup
        value={decisao ?? ''}
        onValueChange={(v: string) => setDecisao(v as Decisao)}
        aria-label="Decisão"
        className="grid gap-3 sm:grid-cols-3"
      >
        {DECISAO_OPTIONS.map((opt) => {
          const selected = decisao === opt.value
          return (
            <Label
              key={opt.value}
              htmlFor={`decisao-${opt.value}`}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors',
                selected ? SELECTED_TINT[opt.value] : UNSELECTED_TINT,
              )}
            >
              <RadioGroupItem
                value={opt.value}
                id={`decisao-${opt.value}`}
                className="border-current"
              />
              {opt.label}
            </Label>
          )
        })}
      </RadioGroup>

      {/* Justificativa — mandatory ≥50 chars + counter. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="justificativa" className="text-sm font-semibold text-white">
            Justificativa{' '}
            <span className="font-normal text-white/60">(obrigatória — mínimo 50 caracteres)</span>
          </label>
          <span
            className={cn(
              'text-sm font-semibold',
              tooShort ? 'text-white/50' : 'text-white/80',
            )}
          >
            {justificativa.length} / {JUSTIFICATIVA_MIN} mín.
          </span>
        </div>
        <Textarea
          id="justificativa"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Descreva a base da decisão. Esta justificativa fica registrada na trilha de auditoria."
          rows={4}
          className="bg-white/5 text-white placeholder:text-white/40 border-white/15"
        />
        {decisao !== null && tooShort ? (
          <p className="text-sm font-semibold text-red-300">
            A justificativa precisa de pelo menos 50 caracteres.
          </p>
        ) : null}
      </div>

      {/* Terminal CTA gated on selection + ≥50, confirmed via alert-dialog. */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <GlassButton
            variant="white"
            hover
            disabled={!canSubmit}
            className="text-white min-h-[44px]"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Registrando…
              </span>
            ) : (
              'Registrar decisão'
            )}
          </GlassButton>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRejeitado ? 'Rejeitar candidato?' : 'Registrar decisão?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRejeitado
                ? 'Esta decisão finaliza o funil e o candidato poderá pedir que uma pessoa revise esta decisão (LGPD, Art. 20). Fica registrada na trilha de auditoria.'
                : 'Esta decisão finaliza o funil desta candidatura e fica registrada na trilha de auditoria.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {isRejeitado ? 'Registrar rejeição' : 'Registrar decisão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
