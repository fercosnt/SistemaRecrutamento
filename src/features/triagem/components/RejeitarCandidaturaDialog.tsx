/**
 * RejeitarCandidaturaDialog — the single shared reject surface (OPER-02).
 *
 * One dialog, mounted by every RH surface (Kanban card menu · HubCandidatoRH · Comparativo)
 * via the `trigger` prop so each host's button matches its own glass chrome, while the
 * dialog BODY renders on the LIGHT `AlertDialogContent` (`bg-background`) using default
 * shadcn tokens (`foreground` / `muted-foreground` / `destructive`) — NOT the dark-glass
 * `text-white/80` of the analog. It carries a motivo `<Select>` (the 6 `motivo_rejeicao_rh`
 * enum values → pt-BR labels) + a justificativa `<Textarea>` + a live counter gated on
 * `motivo !== null && justificativa.trim().length >= 50`.
 *
 * The counter and enable-gate count `.trim().length` (the client mirror of the server's
 * `btrim` before `char_length >= 50`) so leading/trailing whitespace can't fake a pass —
 * but the counter is UX only: the `rejeitar_candidatura` RPC RAISE is the sole authority
 * (T-31-02). The reject is a HUMAN write with a justificativa — the system never
 * auto-rejects by score (RNF-07a); no score/número appears in the copy.
 *
 * Analog: RegistrarDecisaoForm (≥50 counter + AlertDialog confirm) — the ONE deviation is
 * counting trimmed length (mirror `btrim`) instead of the analog's raw `.length`.
 *
 * @module features/triagem/components/RejeitarCandidaturaDialog
 * @see src/features/decisao/components/RegistrarDecisaoForm.tsx (counter + ≥50 gate analog)
 * @see src/features/triagem/hooks/useRejeitarCandidatura.ts (the consumed mutation)
 * @see .planning/phases/31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil/31-UI-SPEC.md
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/components/ui/utils'
import { AVISO_JUSTIFICATIVA_VISIVEL } from '../constants/avisoJustificativa'
import { useRejeitarCandidatura } from '../hooks/useRejeitarCandidatura'
import type { MotivoRejeicaoRh } from '../services/triagemService'

/** Mínimo de caracteres da justificativa — espelha o `char_length >= 50` server-side. */
const JUSTIFICATIVA_MIN = 50

/** Enum `motivo_rejeicao_rh` → rótulos pt-BR (31-UI-SPEC §Motivo table). */
const MOTIVO_OPTIONS: { value: MotivoRejeicaoRh; label: string }[] = [
  { value: 'perfil_desalinhado', label: 'Perfil desalinhado com a vaga' },
  { value: 'reprovado_avaliacao', label: 'Reprovado na avaliação' },
  { value: 'reprovado_entrevista', label: 'Reprovado na entrevista' },
  { value: 'nao_compareceu', label: 'Não compareceu' },
  { value: 'desistencia', label: 'Desistência do candidato' },
  { value: 'outro', label: 'Outro' },
]

export interface RejeitarCandidaturaDialogProps {
  /** Candidatura alvo da rejeição. */
  candidaturaId: string
  /** Nome do candidato (interpolado no título). */
  nome: string
  /** Botão de disparo fornecido pelo host — casa com a chrome (glass) da superfície. */
  trigger: React.ReactNode
  /** Chamado após a rejeição bem-sucedida (o host fecha/refaz fetch). */
  onRejected?: () => void
}

/**
 * Dialog compartilhado de rejeição. Motivo `<Select>` + justificativa ≥50 + counter
 * `btrim`-aware; o confirm dispara `useRejeitarCandidatura`.
 */
export function RejeitarCandidaturaDialog({
  candidaturaId,
  nome,
  trigger,
  onRejected,
}: RejeitarCandidaturaDialogProps) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState<MotivoRejeicaoRh | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const { mutate, isPending } = useRejeitarCandidatura()

  // Conta o comprimento APÓS trim — espelha o `btrim` do servidor, então espaços
  // à esquerda/direita não forjam um "pass" no gate (T-31-02).
  const trimmedLen = justificativa.trim().length
  const tooShort = trimmedLen < JUSTIFICATIVA_MIN
  const canSubmit = motivo !== null && !tooShort && !isPending

  function handleConfirm() {
    if (motivo === null || tooShort) return
    mutate(
      { candidaturaId, motivo, justificativa },
      {
        onSuccess: () => {
          setOpen(false)
          setMotivo(null)
          setJustificativa('')
          onRejected?.()
        },
      },
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      {/* LIGHT modal (bg-background) — default shadcn tokens, NOT dark-glass white-alpha. */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rejeitar {nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            Informe o motivo e uma justificativa (mínimo 50 caracteres). Esta ação move o
            candidato para "Rejeitado" e fica registrada na trilha de auditoria. Você pode
            reverter manualmente depois.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6">
          {/* Motivo — Select obrigatório (6 opções do enum). */}
          <div className="space-y-2">
            <label
              htmlFor="motivo-rejeicao"
              className="text-sm font-semibold text-foreground"
            >
              Motivo da rejeição{' '}
              <span className="font-normal text-muted-foreground">(obrigatório)</span>
            </label>
            <Select
              value={motivo ?? undefined}
              onValueChange={(v: string) => setMotivo(v as MotivoRejeicaoRh)}
            >
              <SelectTrigger
                id="motivo-rejeicao"
                aria-label="Motivo da rejeição"
                className="w-full"
              >
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justificativa — obrigatória ≥50 chars + counter (btrim-aware). */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="justificativa-rejeicao"
                className="text-sm font-semibold text-foreground"
              >
                Justificativa{' '}
                <span className="font-normal text-muted-foreground">
                  (obrigatória — mínimo 50 caracteres)
                </span>
              </label>
              <span
                aria-live="polite"
                className={cn(
                  'text-sm font-semibold',
                  tooShort ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {trimmedLen} / {JUSTIFICATIVA_MIN} mín.
              </span>
            </div>
            <Textarea
              id="justificativa-rejeicao"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva a base da rejeição. Fica na trilha de auditoria e o candidato pode baixá-la."
              rows={4}
              aria-describedby={
                motivo !== null && tooShort
                  ? 'justificativa-rejeicao-help justificativa-rejeicao-visivel'
                  : 'justificativa-rejeicao-visivel'
              }
            />
            {/* §7.22: a justificativa vai para `etapa_justificativa`, que ENTRA na cópia
                de dados do Art. 18. Quem escreve precisa saber quem lê — o aviso fica ao
                lado do campo, no momento da escrita, e não num diálogo posterior. */}
            <p
              id="justificativa-rejeicao-visivel"
              className="text-sm text-muted-foreground"
            >
              {AVISO_JUSTIFICATIVA_VISIVEL}
            </p>
            {motivo !== null && tooShort ? (
              <p
                id="justificativa-rejeicao-help"
                className="text-sm font-semibold text-destructive"
              >
                A justificativa precisa de pelo menos 50 caracteres.
              </p>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          {/* preventDefault → o dialog fica aberto durante o pending; fecha no onSuccess. */}
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={!canSubmit}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Rejeitando…
              </span>
            ) : (
              'Rejeitar candidato'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
