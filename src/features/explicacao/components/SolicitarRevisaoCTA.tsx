/**
 * SolicitarRevisaoCTA — the "Pedir que uma pessoa revise esta decisão" CTA (LGPD Art. 20).
 *
 * The candidate's right to request human review of a decision (DECISAO-04). Gated by
 * an `alert-dialog` confirm (so the request is deliberate); on confirm it fires
 * `useSolicitarRevisao` which calls the own-row `solicitar_revisao_decisao` RPC + the
 * fire-and-forget RH webhook. Idempotent: once `revisao_solicitada_em` is set the CTA
 * is DISABLED and shows the "Você já solicitou a revisão desta decisão." state with a
 * tooltip naming the request date.
 *
 * Phase 42 / Plan 42-11 (REVISAO-04) adds the THIRD and terminal state — the review was
 * answered — as a new branch AHEAD of the two existing ones, which are unchanged. Three
 * short fixed labels, no free-text interpolation (E7 da 42-UI-SPEC); the answered
 * tooltip names the request date AND the answer date, and nothing about the RH-side
 * follow-up threshold (D-P42-03).
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

/**
 * Verbatim pt-BR copy from 15-UI-SPEC §Candidate LGPD Art. 20, com os três rótulos do
 * pedido REESCRITOS pela 43-UI-SPEC §"Copy do Art. 20 reescrita (BD-3)".
 *
 * ⚠ BD-3 (Phase 43): o juridiquês saiu porque um direito só é exercível na medida em que
 * o titular entende que ele existe — juridiquês é fricção sobre um direito. A ÂNCORA LEGAL
 * não se perdeu: a citação do Art. 20 vive na introdução da `ExplicacaoCandidatoPage`,
 * imediatamente acima deste CTA. `solicitar`/`solicitação` NÃO é juridiquês e permanece
 * nos dois rótulos de estado, que a UI-SPEC declara explicitamente inalterados.
 *
 * Os cinco rótulos alterados são pinados por igualdade de string em
 * `__tests__/SolicitarRevisaoCTA.test.tsx` — três deles (título e confirmação do diálogo,
 * mais o texto do RH em `RegistrarDecisaoForm`) ganharam pin só na 43-02, que é por que a
 * reescrita anterior pôde escorregar.
 */
const COPY = {
  cta: 'Pedir que uma pessoa revise esta decisão',
  alreadyRequested: 'Você já solicitou a revisão desta decisão.',
  /** 42-UI-SPEC §Superfície do candidato — the third, terminal state (42-11). */
  alreadyAnswered: 'Sua solicitação de revisão foi respondida.',
  dialogTitle: 'Pedir revisão desta decisão?',
  dialogBody:
    'Sua solicitação será enviada à equipe responsável, que revisará a decisão. Acompanhe o andamento pelo seu painel.',
  dialogConfirm: 'Pedir revisão',
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
  /**
   * When set, the review has been ANSWERED → the third, terminal CTA state (42-11 /
   * REVISAO-04). It is the same column the 42-08 trigger watches to send the candidate's
   * e-mail, so the CTA and the e-mail cannot disagree about whether an answer exists.
   * Optional so every existing call site keeps compiling with the two-state behaviour.
   */
  revisaoRespondidaEm?: string | null
}

export function SolicitarRevisaoCTA({
  candidaturaId,
  revisaoSolicitadaEm,
  revisaoRespondidaEm = null,
}: SolicitarRevisaoCTAProps) {
  const { mutate, isPending } = useSolicitarRevisao(candidaturaId)

  // ── Already ANSWERED — the terminal state (42-11). Checked FIRST because it strictly
  // implies "already requested": the server refuses to answer a review nobody asked for.
  // Three short, fixed labels, zero free-text interpolation (E7 da 42-UI-SPEC). The
  // tooltip names the two DATES and nothing else — no waiting-day count, no band, no
  // late label: the RH-side follow-up threshold is internal and the Art. 20 fixes no
  // deadline (D-P42-03). The label is duplicated in an `sr-only` span because a Radix
  // tooltip only mounts its content while open, and hover is not a path a screen reader
  // or a touch device has — same idiom as the fila's mandatory header tooltip (42-09).
  if (revisaoRespondidaEm) {
    const pedidoEm = revisaoSolicitadaEm ? formatRequestedDate(revisaoSolicitadaEm) : ''
    const respostaEm = formatRequestedDate(revisaoRespondidaEm)
    const tooltip =
      pedidoEm && respostaEm
        ? `Solicitação registrada em ${pedidoEm} · respondida em ${respostaEm}`
        : ''
    return (
      <div className="space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                {/* Native `disabled` is the whole mechanism here — no `aria-disabled`
                    duplicate: `GlassButton` does not forward extra props to the <button>
                    (see the deferred note D-42-11-01), and a native disabled button
                    already carries the state to assistive tech. */}
                <GlassButton
                  variant="white"
                  disabled
                  className="text-white min-h-[44px] opacity-60 cursor-not-allowed"
                >
                  {COPY.cta}
                </GlassButton>
              </span>
            </TooltipTrigger>
            {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
        <p className="text-sm font-semibold text-white/80">{COPY.alreadyAnswered}</p>
        {tooltip && <span className="sr-only">{tooltip}</span>}
      </div>
    )
  }

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
