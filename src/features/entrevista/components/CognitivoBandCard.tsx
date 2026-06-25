/**
 * CognitivoBandCard — the RH-only cognitive qualitative band (ENTREV-05 / RNF-07a).
 *
 * Reuses the `ScorecardAvaliacao` "Contextual · não-eliminatório" badge VERBATIM.
 * Descriptive band ("Banda {n} de 5 — {rótulo}"), NO red/green tint — the band NEVER
 * decides the etapa. A tooltip states "Contextual — nunca elimina sozinho. Decisão
 * sempre humana." The band header carries the SugestaoIABadge.
 *
 * The reject-by-cognitive-alone path NEVER auto-rejects: it forces an alert-dialog
 * requiring an expanded justification (obrigatória) and writes a `bias_audit_log` row
 * (dados jsonb { candidatura, banda, motivo, flag_demografico }) BEFORE the rejection.
 * The candidate NEVER sees this card (RH panel only — route role-gate + RLS deny).
 *
 * @module features/entrevista/components/CognitivoBandCard
 * @see src/features/avaliacao/components/ScorecardAvaliacao.tsx (BigFiveBreakdown CONTEXTUAL badge)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§RH cognitive band gate)
 */
import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/alert-dialog'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import type { BandaCognitiva } from '../services/entrevistaService'

/** Descriptive faixa labels (RH-only, never a verdict). */
const BANDA_LABEL: Record<string, string> = {
  bem_abaixo: 'bem abaixo da média',
  abaixo: 'abaixo da média',
  na_media: 'mediana',
  acima: 'acima da média',
  bem_acima: 'bem acima da média',
}

/** The 1-5 ordinal for a banda key (descriptive display only). */
const BANDA_N: Record<string, number> = {
  bem_abaixo: 1,
  abaixo: 2,
  na_media: 3,
  acima: 4,
  bem_acima: 5,
}

export interface CognitivoBandCardProps {
  /** The RH-only qualitative band (null when no cognitive prova was applied). */
  banda: BandaCognitiva | string | null
  /** Called with the expanded justification when reject-by-cognitive is confirmed. */
  onRejeitarPorCognitivo?: (justificativa: string) => void
  rejecting?: boolean
  className?: string
}

/**
 * The RH cognitive band card — CONTEXTUAL, never a verdict; the reject-by-cognitive
 * path forces the expanded justification + bias_audit_log gate.
 */
export function CognitivoBandCard({
  banda,
  onRejeitarPorCognitivo,
  rejecting = false,
  className,
}: CognitivoBandCardProps) {
  const [open, setOpen] = useState(false)
  const [justificativa, setJustificativa] = useState('')

  const n = banda ? (BANDA_N[banda] ?? null) : null
  const rotulo = banda ? (BANDA_LABEL[banda] ?? banda) : null
  const justificativaOk = justificativa.trim().length > 0

  function confirmReject() {
    if (!justificativaOk) return
    // Writes bias_audit_log via the service BEFORE the rejection (RNF-07a / RF-27).
    onRejeitarPorCognitivo?.(justificativa)
    setOpen(false)
  }

  return (
    <Card className={cn('border-white/10 bg-white/[0.03]', className)}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-white">Raciocínio lógico</CardTitle>
            <SugestaoIABadge variant="compact" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* "Contextual · não-eliminatório" badge — reused VERBATIM. */}
                <Badge className="border-white/15 bg-white/5 text-white/70 text-xs font-semibold cursor-default">
                  Contextual · não-eliminatório
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Contextual — nunca elimina sozinho. Decisão sempre humana.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-white/70">
          Sinaliza raciocínio lógico — não decide a etapa. Decisão sempre humana.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Descriptive band readout — NO red/green tint. */}
        {n != null && rotulo ? (
          <p className="text-sm font-semibold text-white/90">
            Banda {n} de 5 — <span className="text-white">{rotulo}</span>
          </p>
        ) : (
          <p className="text-sm text-white/60">Banda ainda não disponível.</p>
        )}

        {/* Reject-by-cognitive-alone gate — forces justification + bias_audit_log. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={rejecting || banda == null}
          className="min-h-[44px] rounded-lg border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          Rejeitar com base no raciocínio lógico
        </button>
      </CardContent>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar com base no raciocínio lógico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta decisão exige justificativa expandida e será registrada no log de
              auditoria de viés (bias_audit_log).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label
              htmlFor="rejeicao-justificativa"
              className="text-sm font-semibold text-white/90"
            >
              Justificativa expandida (obrigatória ao rejeitar com base no raciocínio
              lógico)
            </Label>
            <Textarea
              id="rejeicao-justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique por que a decisão se apoia no raciocínio lógico. Esta justificativa entra no registro de auditoria de viés."
              className="min-h-24 bg-white/5 text-base text-white placeholder:text-white/40"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setJustificativa('')}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!justificativaOk || rejecting}
              onClick={confirmReject}
              className="bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
            >
              Registrar e rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
