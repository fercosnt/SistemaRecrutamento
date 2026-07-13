/**
 * Phase 29 / Plan 29-02 — NovoUsuarioDialog (USR-02).
 *
 * The "Novo usuário" create dialog: a BARE RHF (`register`/`Controller`) + Zod form
 * (`zodResolver(novoUsuarioSchema)`) — NOT the unused shadcn Form-field primitive —
 * that dispatches `action:'criar'` through the secure Phase-28 EF via `useCriarUsuario`.
 *
 * Honest copy (UI-SPEC §Copywriting Contract, verbatim pt-BR): the created user
 * receives an e-mail to define their OWN password — the helper promises exactly what
 * the EF does (`resetPasswordForEmail → /auth/redefinir-senha?tipo=rh`) and nothing
 * more (T-29-04). `papel` is a fixed Select over {Recrutador, Administrador} bound to
 * the schema enum (T-29-05); the EF `.strict()` union is the authoritative gate.
 *
 * Feedback ownership split:
 *   - SUCCESS / EMAIL_SEND_FAILED → the HOOK toasts (success or success-with-warning)
 *     and invalidates the roster; the dialog just CLOSES + resets (never double-toasts).
 *   - EMAIL_EXISTS → a FIELD error on `email`; the dialog STAYS open.
 *   - UNAUTHORIZED → a DISTINCT expired-session toast (parity with the hook's toastRowError).
 *   - VALIDATION / FORBIDDEN / NOT_FOUND / SERVER_ERROR / unknown → the exact pt-BR
 *     `toast.error`; the dialog stays open for a retry.
 * Client-side Zod validation blocks the invoke before it happens (defense-in-depth).
 *
 * @module features/admin/components/NovoUsuarioDialog
 * @see src/features/admin/hooks/useUsuariosRh.ts (useCriarUsuario — success/warning toasts + invalidate)
 * @see src/features/config-vaga/components/BulkMarkDialog.tsx (glass Dialog shell analog)
 * @see src/components/pages/LoginRHPage.tsx (bare RHF register/Controller + zodResolver idiom)
 */
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useCriarUsuario } from '../hooks/useUsuariosRh'
import {
  novoUsuarioSchema,
  PAPEL_OPTIONS,
  type NovoUsuarioForm,
} from '../schemas/usuarioRhSchemas'
import type { UsuariosRhServiceError } from '../services/usuariosRhService'

export interface NovoUsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Reads the EF `error_code` the service carries on `.details.error_code`. */
function errorCodeOf(err: unknown): string | undefined {
  return (err as UsuariosRhServiceError | null | undefined)?.details?.error_code
}

export function NovoUsuarioDialog({ open, onOpenChange }: NovoUsuarioDialogProps) {
  const criar = useCriarUsuario()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<NovoUsuarioForm>({
    resolver: zodResolver(novoUsuarioSchema) as Resolver<NovoUsuarioForm>,
    mode: 'onBlur',
    defaultValues: { email: '', nome_completo: '', cargo: '', papel: 'recrutador' },
  })

  const onSubmit = async (values: NovoUsuarioForm) => {
    try {
      await criar.mutateAsync(values)
      // Sucesso OU sucesso-com-aviso (EMAIL_SEND_FAILED): o hook já toasta
      // (success/warning) + invalida a lista. O dialog só fecha + reseta.
      reset()
      onOpenChange(false)
    } catch (err) {
      const code = errorCodeOf(err)
      if (code === 'EMAIL_EXISTS') {
        // Campo, não toast — mantém o dialog aberto para correção.
        setError('email', { message: 'Já existe um usuário com este e-mail.' })
        return
      }
      if (code === 'VALIDATION') {
        toast.error('Verifique os campos e tente novamente.')
      } else if (code === 'UNAUTHORIZED') {
        // Sessão expirada — paridade com o `toastRowError` do hook (distinta do balde genérico).
        toast.error('Sua sessão expirou. Entre novamente.')
      } else if (code === 'FORBIDDEN') {
        toast.error('Você não tem permissão para esta ação.')
      } else if (code === 'NOT_FOUND') {
        toast.error('Usuário não encontrado.')
      } else {
        toast.error('Não foi possível concluir agora. Tente novamente em instantes.')
      }
      // Mantém o dialog aberto para nova tentativa.
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) handleCancel()
      }}
    >
      <DialogContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/25 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Novo usuário</DialogTitle>
          <DialogDescription className="text-white/70">
            Preencha os dados da nova conta da equipe de RH.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* E-mail */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-white">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="nome@beautysmile.com.br"
              autoComplete="off"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="border-white/30 bg-white/20 text-white placeholder:text-white/50"
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                aria-live="assertive"
                className="text-sm text-red-400"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Nome completo */}
          <div className="space-y-2">
            <Label htmlFor="nome_completo" className="text-sm font-semibold text-white">
              Nome completo
            </Label>
            <Input
              id="nome_completo"
              {...register('nome_completo')}
              aria-invalid={!!errors.nome_completo}
              aria-describedby={errors.nome_completo ? 'nome_completo-error' : undefined}
              className="border-white/30 bg-white/20 text-white placeholder:text-white/50"
            />
            {errors.nome_completo && (
              <p
                id="nome_completo-error"
                role="alert"
                aria-live="assertive"
                className="text-sm text-red-400"
              >
                {errors.nome_completo.message}
              </p>
            )}
          </div>

          {/* Cargo */}
          <div className="space-y-2">
            <Label htmlFor="cargo" className="text-sm font-semibold text-white">
              Cargo
            </Label>
            <Input
              id="cargo"
              {...register('cargo')}
              placeholder="ex.: Analista de RH"
              aria-invalid={!!errors.cargo}
              aria-describedby={errors.cargo ? 'cargo-error' : undefined}
              className="border-white/30 bg-white/20 text-white placeholder:text-white/50"
            />
            {errors.cargo && (
              <p
                id="cargo-error"
                role="alert"
                aria-live="assertive"
                className="text-sm text-red-400"
              >
                {errors.cargo.message}
              </p>
            )}
          </div>

          {/* Papel */}
          <div className="space-y-2">
            <Label htmlFor="papel" className="text-sm font-semibold text-white">
              Papel
            </Label>
            <Controller
              name="papel"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="papel"
                    aria-label="Papel"
                    aria-invalid={!!errors.papel}
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
            {errors.papel && (
              <p
                id="papel-error"
                role="alert"
                aria-live="assertive"
                className="text-sm text-red-400"
              >
                {errors.papel.message}
              </p>
            )}
          </div>

          {/* Honest helper — promises ONLY what the EF does (T-29-04). */}
          <p className="text-xs text-white/60">
            O usuário receberá um e-mail para definir a própria senha e acessar o painel.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="min-h-[44px] border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending} className="min-h-[44px]">
              {criar.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Criando…
                </span>
              ) : (
                'Criar usuário'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
