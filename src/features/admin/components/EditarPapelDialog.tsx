/**
 * Phase 29 / Plan 29-03 — EditarPapelDialog (USR-03).
 *
 * The per-row "Editar papel" dialog: a small BARE RHF (`Controller`) + Zod form
 * (`zodResolver(editarPapelSchema)`) over a single {Recrutador, Administrador} Select,
 * pre-set to the user's current role, that dispatches `action:'mudar_papel'` through the
 * secure Phase-28 EF via `useMudarPapel`. The hook toasts "Papel atualizado." + invalidates
 * the roster on success and maps `LAST_ADMIN` on error — the dialog only closes on resolve.
 *
 * Anti-lockout (USR-07 UX): when `isLastActiveAdmin` is true and the chosen value would
 * DEMOTE the last active administrador (administrador → recrutador), the "Salvar papel"
 * action is DISABLED. The disabled control is wrapped in a `<span className="inline-flex">`
 * that we make ACTUALLY keyboard/SR-reachable — `tabIndex={0}` + `aria-disabled` + a `title`
 * carrying the reason — improving on the bare mouse-only TriagemTable idiom (:250-263), so
 * the reason is announced without a mouse. The EF/trigger `LAST_ADMIN` guard (Phase 28)
 * remains authoritative; this client hint is UX only — a race falls back to the server toast.
 *
 * Per-row remount hygiene: the dialog is rendered once per row and never unmounts, so the
 * RHF default seeds only at mount. `reset({ novo_papel })` runs on every `open` to re-sync
 * the Select to the LIVE role — otherwise a cancelled-then-reopened dialog would show a
 * stale uncommitted selection (and arm the demote guard from stale input).
 *
 * A legacy/unknown DB role (gerente/visualizador) is normalized to 'recrutador' for the
 * control default (the console only assigns the two-value enum), keeping the label honest.
 *
 * @module features/admin/components/EditarPapelDialog
 * @see src/features/admin/hooks/useUsuariosRh.ts (useMudarPapel — success/LAST_ADMIN toasts + invalidate)
 * @see src/features/config-vaga/components/BulkMarkDialog.tsx (glass Dialog shell analog)
 * @see src/features/admin/components/NovoUsuarioDialog.tsx (reset-on-open/close/success analog)
 * @see src/features/triagem/components/TriagemTable.tsx (disabled-tooltip idiom :250-263 — mouse-only; we harden it here)
 */
import { useEffect } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { useMudarPapel } from '../hooks/useUsuariosRh'
import {
  editarPapelSchema,
  PAPEL_OPTIONS,
  type EditarPapelForm,
  type Papel,
} from '../schemas/usuarioRhSchemas'
import type { UsuarioRhRow } from '../services/usuariosRhService'

/** Copy verbatim from UI-SPEC §Anti-Lockout. */
const ANTI_LOCKOUT_TOOLTIP =
  'Não é possível desativar ou rebaixar o último administrador ativo.'

export interface EditarPapelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The roster row whose role is being edited. */
  user: UsuarioRhRow
  /** True when `user` is the single active administrador — blocks the demote path. */
  isLastActiveAdmin: boolean
}

/** Normaliza um papel legado/desconhecido (gerente/visualizador) para 'recrutador'. */
function normalizePapel(role: string): Papel {
  return role === 'administrador' ? 'administrador' : 'recrutador'
}

export function EditarPapelDialog({
  open,
  onOpenChange,
  user,
  isLastActiveAdmin,
}: EditarPapelDialogProps) {
  const mudarPapel = useMudarPapel()
  const currentPapel = normalizePapel(user.role)

  const { handleSubmit, control, watch, reset } = useForm<EditarPapelForm>({
    resolver: zodResolver(editarPapelSchema) as Resolver<EditarPapelForm>,
    defaultValues: { novo_papel: currentPapel },
  })

  // O dialog é por-linha e nunca desmonta → re-sincroniza o Select ao papel LIVE a cada
  // abertura (senão um cancelar-e-reabrir mostraria a seleção obsoleta não confirmada).
  useEffect(() => {
    if (open) reset({ novo_papel: normalizePapel(user.role) })
  }, [open, user.role, reset])

  const selected = watch('novo_papel')

  // Rebaixar o último administrador ativo (administrador → recrutador) é bloqueado.
  const wouldDemoteLastAdmin =
    isLastActiveAdmin && user.role === 'administrador' && selected === 'recrutador'

  const onSubmit = async (values: EditarPapelForm) => {
    if (wouldDemoteLastAdmin) return
    try {
      await mudarPapel.mutateAsync({ targetId: user.id, novoPapel: values.novo_papel })
      // O hook toasta "Papel atualizado." + invalida a lista. O dialog só fecha.
      onOpenChange(false)
    } catch {
      // O hook já toastou (LAST_ADMIN / genérico); mantém o dialog aberto.
    }
  }

  const saveDisabled = mudarPapel.isPending || wouldDemoteLastAdmin

  const saveButton = (
    <Button type="submit" disabled={saveDisabled} className="min-h-[44px]">
      {mudarPapel.isPending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Salvando…
        </span>
      ) : (
        'Salvar papel'
      )}
    </Button>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onOpenChange(false)
      }}
    >
      <DialogContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/25 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Editar papel</DialogTitle>
          <DialogDescription className="text-white/70">
            Defina o papel de {user.nome_completo} no painel de RH.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="novo_papel" className="text-sm font-semibold text-white">
              Papel
            </Label>
            <Controller
              name="novo_papel"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="novo_papel"
                    aria-label="Papel"
                    className="border-white/30 bg-white/20 text-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              Cancelar
            </Button>
            {wouldDemoteLastAdmin ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Focusable + announced: a disabled control swallows focus, so the
                        wrapper carries tabIndex/aria-disabled/title → the reason reaches
                        keyboard + SR users without a mouse (hardens the TriagemTable idiom). */}
                    <span
                      className="inline-flex"
                      tabIndex={0}
                      aria-disabled="true"
                      title={ANTI_LOCKOUT_TOOLTIP}
                    >
                      {saveButton}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{ANTI_LOCKOUT_TOOLTIP}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              saveButton
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
