/**
 * Phase 30 / Plan 30-05 — SenhaSection (PERFIL-02 password change with re-auth).
 *
 * The "Senha" GlassCard: three `type="password"` fields (Senha atual / Nova senha / Confirmar
 * nova senha) — bare RHF + `zodResolver(alterarSenhaSchema)` (NOT the shadcn Form-field primitive,
 * Phase-29 parity). The caller's OWN email comes from the loaded profile row (never a form field).
 *
 * Flow: `useAlterarSenha(email, atual, nova)` re-auths (`signInWithPassword`) BEFORE rotating
 * (`updateUser`). A WRONG_CURRENT outcome sets a FIELD error on "Senha atual" and keeps the form
 * open with the other fields preserved. Success → the hook toasts; here we clear the fields. The
 * session stays valid — NO logout, NO invented "email de confirmação" copy (honest GoTrue copy).
 *
 * Pitfall-7: the password values are never rendered or logged.
 *
 * @module features/perfil-rh/components/SenhaSection
 * @see src/features/perfil-rh/hooks/usePerfilRh.ts (useAlterarSenha — success toast; field error owned here)
 * @see src/features/perfil-rh/schemas/perfilRhSchemas.ts (alterarSenhaSchema — nova≥8, match, differ)
 */
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass'

import { useAlterarSenha } from '../hooks/usePerfilRh'
import { alterarSenhaSchema, type AlterarSenhaForm } from '../schemas/perfilRhSchemas'

export interface SenhaSectionProps {
  /** The caller's OWN email (from the loaded profile row) — re-auth material, never a field. */
  email: string
}

export function SenhaSection({ email }: SenhaSectionProps) {
  const alterar = useAlterarSenha()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<AlterarSenhaForm>({
    resolver: zodResolver(alterarSenhaSchema) as Resolver<AlterarSenhaForm>,
    mode: 'onBlur',
    defaultValues: { senha_atual: '', nova_senha: '', confirmar_senha: '' },
  })

  const onSubmit = async (values: AlterarSenhaForm) => {
    try {
      await alterar.mutateAsync({
        email,
        senhaAtual: values.senha_atual,
        novaSenha: values.nova_senha,
      })
      // Success → hook toasted 'Senha alterada com sucesso.'; clear the fields. Session stays valid.
      reset()
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      if (code === 'WRONG_CURRENT') {
        // Field error on "Senha atual" — form stays open, other fields preserved.
        setError('senha_atual', { message: 'Senha atual incorreta.' })
        return
      }
      // WEAK_PASSWORD / NETWORK_ERROR → route to the relevant field, keep the form open.
      if (code === 'WEAK_PASSWORD') {
        setError('nova_senha', {
          message: 'A nova senha não atende aos requisitos de segurança.',
        })
        return
      }
      setError('nova_senha', { message: 'Não foi possível alterar a senha. Tente novamente.' })
    }
  }

  return (
    <GlassCard variant="white" blur="md" className="rounded-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">Senha</h2>
          <p className="text-sm text-white/70">Altere sua senha de acesso.</p>
        </div>

        {/* Senha atual */}
        <div className="space-y-2">
          <Label htmlFor="senha_atual" className="text-sm font-semibold text-white">
            Senha atual
          </Label>
          <Input
            id="senha_atual"
            type="password"
            autoComplete="current-password"
            {...register('senha_atual')}
            aria-invalid={!!errors.senha_atual}
            aria-describedby={errors.senha_atual ? 'senha_atual-error' : undefined}
            className="border-white/30 bg-white/20 text-white placeholder:text-white/60"
          />
          {errors.senha_atual && (
            <p
              id="senha_atual-error"
              role="alert"
              aria-live="assertive"
              className="text-sm text-red-400"
            >
              {errors.senha_atual.message}
            </p>
          )}
        </div>

        {/* Nova senha */}
        <div className="space-y-2">
          <Label htmlFor="nova_senha" className="text-sm font-semibold text-white">
            Nova senha
          </Label>
          <Input
            id="nova_senha"
            type="password"
            autoComplete="new-password"
            {...register('nova_senha')}
            aria-invalid={!!errors.nova_senha}
            aria-describedby={errors.nova_senha ? 'nova_senha-error' : undefined}
            className="border-white/30 bg-white/20 text-white placeholder:text-white/60"
          />
          {errors.nova_senha && (
            <p
              id="nova_senha-error"
              role="alert"
              aria-live="assertive"
              className="text-sm text-red-400"
            >
              {errors.nova_senha.message}
            </p>
          )}
        </div>

        {/* Confirmar nova senha */}
        <div className="space-y-2">
          <Label htmlFor="confirmar_senha" className="text-sm font-semibold text-white">
            Confirmar nova senha
          </Label>
          <Input
            id="confirmar_senha"
            type="password"
            autoComplete="new-password"
            {...register('confirmar_senha')}
            aria-invalid={!!errors.confirmar_senha}
            aria-describedby={errors.confirmar_senha ? 'confirmar_senha-error' : undefined}
            className="border-white/30 bg-white/20 text-white placeholder:text-white/60"
          />
          {errors.confirmar_senha && (
            <p
              id="confirmar_senha-error"
              role="alert"
              aria-live="assertive"
              className="text-sm text-red-400"
            >
              {errors.confirmar_senha.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={alterar.isPending}
          className="min-h-[44px] bg-[#35BFAD] text-[#04121F] hover:bg-[#2ba99a]"
        >
          {alterar.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Alterando…
            </span>
          ) : (
            'Alterar senha'
          )}
        </Button>
      </form>
    </GlassCard>
  )
}
