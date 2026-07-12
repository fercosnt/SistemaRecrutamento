/**
 * SolicitarRevisaoCTA — the "Solicitar revisão por pessoa natural" CTA (LGPD Art. 20).
 *
 * The candidate's right to request human review of a decision (DECISAO-04). Gated by
 * an `alert-dialog` confirm (so the request is deliberate); on confirm it fires
 * `useSolicitarRevisao` which calls the own-row `solicitar_revisao_decisao` RPC + the
 * fire-and-forget RH webhook. Idempotent: once `revisao_solicitada_em` is set the CTA
 * is DISABLED and shows the "Você já solicitou a revisão desta decisão." state with a
 * tooltip naming the request date.
 *
 * Copy is verbatim from 15-UI-SPEC §Candidate LGPD Art. 20. The button carries the
 * `min-h-[44px]` mobile a11y floor. No score/band/percentile is ever rendered here.
 *
 * @module features/explicacao/components/SolicitarRevisaoCTA
 * @see src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx (the alert-dialog submit-gate idiom)
 * @see src/features/explicacao/hooks/useExplicacao.ts (useSolicitarRevisao)
 */
import { Loader2 } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSolicitarRevisao } from '../hooks/useExplicacao'

/** Verbatim pt-BR copy from 15-UI-SPEC §Candidate LGPD Art. 20. */
const COPY = {
  cta: 'Solicitar revisão por pessoa natural',
  alreadyRequested: 'Você já solicitou a revisão desta decisão.',
  dialogTitle: 'Solicitar revisão?',
  dialogBody:
    'Sua solicitação será enviada à equipe responsável, que revisará a decisão. Acompanhe o andamento pelo seu painel.',
  dialogConfirm: 'Solicitar revisão',
  dialogCancel: 'Voltar',
  sending: 'Enviando…',
} as const

/** Formats an ISO timestamp as dd/mm/aaaa (pt-BR) for the "já solicitou" tooltip. */
function formatRequestedDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export interface SolicitarRevisaoCTAProps {
  candidaturaId: string
  /** When set, the revision was already requested → the CTA is disabled (idempotent). */
  revisaoSolicitadaEm: string | null
}

export function SolicitarRevisaoCTA({
  candidaturaId,
  revisaoSolicitadaEm,
}: SolicitarRevisaoCTAProps) {
  const { mutate, isPending } = useSolicitarRevisao(candidaturaId)

  // ── Already requested — disabled CTA + "já solicitou" state with a dated tooltip ──
  if (revisaoSolicitadaEm) {
    const dateLabel = formatRequestedDate(revisaoSolicitadaEm)
    return (
      <div className="space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <GlassButton
                  variant="white"
                  disabled
                  className="text-white min-h-[44px] opacity-60 cursor-not-allowed"
                >
                  {COPY.cta}
                </GlassButton>
              </span>
            </TooltipTrigger>
            {dateLabel && (
              <TooltipContent>Solicitação registrada em {dateLabel}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <p className="text-sm font-semibold text-white/80">{COPY.alreadyRequested}</p>
      </div>
    )
  }

  // ── Not yet requested — CTA gated by the confirm dialog ───────────────────────
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <GlassButton
          variant="white"
          hover
          disabled={isPending}
          className="text-white min-h-[44px]"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {COPY.sending}
            </span>
          ) : (
            COPY.cta
          )}
        </GlassButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{COPY.dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{COPY.dialogBody}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{COPY.dialogCancel}</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutate()}>
            {COPY.dialogConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
