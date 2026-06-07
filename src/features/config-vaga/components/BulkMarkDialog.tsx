/**
 * Phase 7 / VAGACFG-03 — BulkMarkDialog (D-11).
 *
 * Lightweight confirm Dialog (NOT AlertDialog — reversible) whose
 * "Marcar tudo como informativa" action resets EVERY option of a pergunta to
 * `neutro` + peso 0 + nota_ia null and hands the reset list to `onConfirm`.
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-UI-SPEC.md §Copywriting
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-11)
 * @module features/config-vaga/components/BulkMarkDialog
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GlassButton } from '@/components/ui/glass'
import type { TagOpcaoEnum } from '../types/configVagaTypes'

export interface BulkMarkOpcao {
  opcao_id?: string | null
  texto: string
  tag: TagOpcaoEnum
  peso: number
  nota_ia: string | null
}

export interface BulkMarkDialogProps {
  open: boolean
  /** The options of the pergunta being bulk-reset. */
  opcoes: BulkMarkOpcao[]
  /** Receives every option reset to neutro/0/null ("informativa"). */
  onConfirm: (reset: BulkMarkOpcao[]) => void
  onCancel: () => void
}

export function BulkMarkDialog({
  open,
  opcoes,
  onConfirm,
  onCancel,
}: BulkMarkDialogProps) {
  const handleConfirm = () => {
    const reset: BulkMarkOpcao[] = opcoes.map((o) => ({
      ...o,
      tag: 'neutro' as TagOpcaoEnum,
      peso: 0,
      nota_ia: null,
    }))
    onConfirm(reset)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onCancel()
      }}
    >
      <DialogContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/25 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            Resetar tags da pergunta
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Isto vai marcar todas as opções desta pergunta como informativa.
            Continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <GlassButton
            variant="white"
            onClick={(e) => {
              e.preventDefault()
              onCancel()
            }}
            className="text-white"
          >
            Cancelar
          </GlassButton>
          <GlassButton
            variant="accent"
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            className="text-white"
          >
            Marcar tudo como informativa
          </GlassButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
