/**
 * RedefinirSenhaPage — Phase 3 Wave 5 (Plan 03-06).
 *
 * Redefinição de senha após clique no link de recuperação. 3-state machine
 * driven by `useRecoverySession()`:
 *   - validating → spinner + "Validando seu link..."
 *   - invalid    → InvalidLinkState (link expirado/replay/missing session)
 *   - valid      → 2-password form (nova_senha + confirmar_nova_senha)
 *
 * D-11 silent Zod (UI-SPEC L582-602 kill-list):
 *   Sem strength meter, sem live checklist, sem confirmação visual de
 *   match das senhas. Validação Zod aparece inline em cada campo APÓS
 *   submit (via RHF mode='onBlur').
 *
 * D-12 immediate nav (UI-SPEC L590-602):
 *   Em sucesso, toast "Senha alterada com sucesso." + navigate IMEDIATO
 *   para /candidato/perfil (replace: true). Sem countdown de 3 segundos.
 *
 * Pitfall 2 fallback (RESEARCH §Pitfall 2):
 *   Se `setNewPassword` retornar erro de session_expired (recovery session
 *   invalidada mid-flow), tenta `tryAutoLogin(email, novaSenha)` e re-roteia.
 *
 * Pitfall 7: nenhuma chamada de log nesta page; observabilidade no
 * passwordService + authService.
 *
 * @module components/pages/RedefinirSenhaPage
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import { BackgroundImage } from '../BackgroundImage'
import { GlassCard } from '../ui/glass'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { BeautySmileLogo } from '../BeautySmileLogo'

import {
  redefinirSenhaSchema,
  type RedefinirSenhaFormData,
} from '@/features/auth/schemas'
import { setNewPassword, tryAutoLogin } from '@/features/auth/services'
import { isAuthError } from '@/features/auth/types'
import { useRecoverySession } from '@/features/auth/hooks'

export function RedefinirSenhaPage() {
  const navigate = useNavigate()
  const recovery = useRecoverySession()
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RedefinirSenhaFormData>({
    resolver: zodResolver(redefinirSenhaSchema),
    mode: 'onBlur',
    defaultValues: { nova_senha: '', confirmar_nova_senha: '' },
  })

  const onSubmit = async (data: RedefinirSenhaFormData) => {
    try {
      await setNewPassword(data.nova_senha)
      // Happy path: usuário continua autenticado via PASSWORD_RECOVERY
      // session (RESEARCH §Pitfall 2). Toast + navigate imediato (D-12).
      toast.success('Senha alterada com sucesso.', { duration: 4000 })
      navigate('/candidato/perfil', { replace: true })
    } catch (err) {
      if (isAuthError(err)) {
        // Pitfall 2: session_expired fallback — recovery session foi
        // invalidada mid-flow. Tenta tryAutoLogin com a senha nova.
        const looksExpired =
          err.code === 'SERVER_ERROR' &&
          /sess(ã|a)o|expired|expirad/i.test(err.message)
        if (looksExpired && recovery.status === 'valid') {
          const ok = await tryAutoLogin(recovery.email, data.nova_senha)
          if (ok) {
            toast.success('Senha alterada com sucesso.', { duration: 4000 })
            navigate('/candidato/perfil', { replace: true })
            return
          }
          toast.success('Senha alterada. Faça login para continuar.', {
            duration: 5000,
          })
          navigate('/auth/login', { replace: true })
          return
        }
        toast.error(err.message, { duration: 6000 })
      } else {
        toast.error(
          'Não foi possível alterar a senha. Tente novamente.',
          { duration: 6000 },
        )
      }
    }
  }

  /* ============================================================
     STATE 1 — validating (spinner + neutral copy)
     ============================================================ */
  if (recovery.status === 'validating') {
    return (
      <BackgroundImage
        background="gradient"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <main
          aria-label="Validando link de recuperação"
          className="min-h-screen flex items-center justify-center px-4 py-12"
        >
          <div className="w-full max-w-md">
            <BeautySmileLogo
              type="vertical"
              variant="white"
              size="lg"
              className="mx-auto mb-8 drop-shadow-lg"
            />
            <GlassCard variant="white" blur="lg" className="p-6 sm:p-8">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2
                  className="w-10 h-10 text-white animate-spin"
                  aria-hidden="true"
                />
                <p
                  className="text-sm text-white"
                  role="status"
                  aria-live="polite"
                >
                  Validando seu link...
                </p>
              </div>
            </GlassCard>
          </div>
        </main>
      </BackgroundImage>
    )
  }

  /* ============================================================
     STATE 2 — invalid (link expirado, replay, ou missing session)
     ============================================================ */
  if (recovery.status === 'invalid') {
    return (
      <BackgroundImage
        background="gradient"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <main
          aria-label="Link inválido"
          className="min-h-screen flex items-center justify-center px-4 py-12"
        >
          <div className="w-full max-w-md">
            <BeautySmileLogo
              type="vertical"
              variant="white"
              size="lg"
              className="mx-auto mb-8 drop-shadow-lg"
            />
            <GlassCard variant="white" blur="lg" className="p-6 sm:p-8">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-md">
                    <AlertCircle
                      className="w-8 h-8 text-red-400"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-white text-xl font-semibold drop-shadow-lg">
                    Link inválido ou expirado
                  </h2>
                  <p className="text-white text-sm drop-shadow-md leading-relaxed">
                    Este link de recuperação não é mais válido. Solicite um
                    novo link para continuar.
                  </p>
                </div>

                <div
                  className="bg-white/10 border border-white/20 rounded-lg p-4"
                  role="note"
                >
                  <p className="text-white/90 text-sm">
                    Links de recuperação expiram em 1 hora por segurança.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    onClick={() =>
                      navigate('/auth/esqueci-senha', { replace: true })
                    }
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white text-base font-semibold py-3 min-h-11 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-200"
                  >
                    Solicitar novo link
                  </Button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/auth/login', { replace: true })
                    }
                    className="text-sm text-white/80 hover:text-white underline py-2"
                  >
                    Voltar ao login
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </main>
      </BackgroundImage>
    )
  }

  /* ============================================================
     STATE 3 — valid (form for nova_senha + confirmar_nova_senha)
     D-11: silent Zod, no strength meter, no live checklist
     ============================================================ */
  return (
    <BackgroundImage
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
    >
      <main
        aria-label="Redefinir senha"
        className="min-h-screen flex items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md">
          <BeautySmileLogo
            type="vertical"
            variant="white"
            size="lg"
            className="mx-auto mb-8 drop-shadow-lg"
          />

          <GlassCard variant="white" blur="lg" className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-white text-2xl font-semibold mb-2 drop-shadow-lg">
                Nova senha
              </h1>
              <p className="text-sm text-white/90 drop-shadow-md">
                Escolha uma senha segura para continuar acessando sua conta.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              aria-label="Formulário de redefinição de senha"
              noValidate
            >
              {/* Nova senha */}
              <div className="space-y-2">
                <Label
                  htmlFor="nova_senha"
                  className="text-white text-sm font-semibold"
                >
                  Nova senha
                  <span className="text-red-400 ml-1" aria-hidden="true">
                    *
                  </span>
                </Label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
                    aria-hidden="true"
                  >
                    <Lock className="w-5 h-5" />
                  </span>
                  <Input
                    id="nova_senha"
                    type={showNew ? 'text' : 'password'}
                    {...register('nova_senha')}
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!errors.nova_senha}
                    aria-describedby={
                      errors.nova_senha
                        ? 'nova-senha-error'
                        : 'nova-senha-helper'
                    }
                    className="bg-white/20 border-white/30 text-white text-base placeholder:text-white/50 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={
                      showNew ? 'Ocultar senha' : 'Mostrar senha'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 -m-2 text-white/70 hover:text-white transition-colors"
                  >
                    {showNew ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {/* D-11: helper text PASSIVE (no live checklist) */}
                <p
                  id="nova-senha-helper"
                  className="text-xs text-white/80"
                >
                  Mínimo 8 caracteres, incluindo maiúscula, minúscula e número.
                </p>
                {errors.nova_senha && (
                  <p
                    id="nova-senha-error"
                    role="alert"
                    aria-live="assertive"
                    className="text-red-400 text-sm flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {errors.nova_senha.message}
                  </p>
                )}
              </div>

              {/* Confirmar nova senha */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmar_nova_senha"
                  className="text-white text-sm font-semibold"
                >
                  Confirmar nova senha
                  <span className="text-red-400 ml-1" aria-hidden="true">
                    *
                  </span>
                </Label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
                    aria-hidden="true"
                  >
                    <Lock className="w-5 h-5" />
                  </span>
                  <Input
                    id="confirmar_nova_senha"
                    type={showConfirm ? 'text' : 'password'}
                    {...register('confirmar_nova_senha')}
                    placeholder="Digite novamente a nova senha"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!errors.confirmar_nova_senha}
                    aria-describedby={
                      errors.confirmar_nova_senha
                        ? 'confirmar-senha-error'
                        : undefined
                    }
                    className="bg-white/20 border-white/30 text-white text-base placeholder:text-white/50 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={
                      showConfirm ? 'Ocultar senha' : 'Mostrar senha'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 -m-2 text-white/70 hover:text-white transition-colors"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmar_nova_senha && (
                  <p
                    id="confirmar-senha-error"
                    role="alert"
                    aria-live="assertive"
                    className="text-red-400 text-sm flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {errors.confirmar_nova_senha.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white text-base font-semibold py-3 min-h-11 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Alterando...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </Button>
            </form>
          </GlassCard>
        </div>
      </main>
    </BackgroundImage>
  )
}
