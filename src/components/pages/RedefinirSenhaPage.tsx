/**
 * RedefinirSenhaPage — Phase 3 Wave 5 (Plan 03-06); Phase 5 Plan 05-06 (D-15 OTP).
 *
 * Redefinição de senha via código OTP de 6 dígitos (migração PKCE→OTP, D-15/D-16).
 *
 * Fluxo OTP (substitui o magic-link deeplink PKCE):
 *   1. O usuário recebe um código de 6 dígitos por email (`{{ .Token }}` no
 *      template do Supabase) e chega aqui vindo de EsqueciSenhaPage com o
 *      email em `location.state.email` (RESEARCH A3 — sem re-perguntar).
 *   2. Digita o código de 6 dígitos (input-otp) + a nova senha + confirmação.
 *   3. No submit: `verifyRecoveryOtp(email, token)` estabelece a sessão de
 *      recuperação (verifyOtp type:'recovery'); em seguida `setNewPassword`
 *      (updateUser) define a nova senha.
 *
 * Por que OTP (D-15): o fluxo PKCE anterior exigia o `code_verifier` no
 * localStorage do MESMO browser que originou a solicitação — falhava
 * silenciosamente cross-browser/device ("Link inválido ou expirado", Phase 3
 * 03-07 finding). `verifyOtp` é flowType-independente: o código funciona em
 * QUALQUER browser. O `useRecoverySession` (state machine deeplink-driven) foi
 * RETIRADO (A4) — o gate agora é a própria verificação do OTP.
 *
 * Se o usuário chegar SEM email em router state (navegação direta), exibimos
 * um campo de email para que ele informe o email do código.
 *
 * D-11 silent Zod: sem strength meter, sem live checklist. Validação inline
 * por campo após submit (RHF mode='onBlur').
 *
 * D-12 immediate nav: em sucesso, toast + navigate imediato para
 * /candidato/perfil (replace: true).
 *
 * F-04.1-E (05-03): 422 transiente no primeiro setNewPassword → toast amigável
 * pedindo nova tentativa (sem auto-retry silencioso).
 *
 * Pitfall 2 fallback: se setNewPassword retornar session_expired, tenta
 * tryAutoLogin(email, novaSenha) e re-roteia.
 *
 * Pitfall 7: nenhuma chamada de log nesta page (o token NUNCA é logado);
 * observabilidade no passwordService.
 *
 * @module components/pages/RedefinirSenhaPage
 */

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import { BackgroundImage } from '../BackgroundImage'
import { GlassCard } from '../ui/glass'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { BeautySmileLogo } from '../BeautySmileLogo'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp'

import {
  redefinirSenhaSchema,
  type RedefinirSenhaFormData,
} from '@/features/auth/schemas'
import {
  verifyRecoveryOtp,
  setNewPassword,
  tryAutoLogin,
  destinoPosRedefinicao,
} from '@/features/auth/services'
import { isAuthError } from '@/features/auth/types'
import { useAuthFlowVariant } from '@/features/auth/hooks'
import { waitForCandidatoHydrated } from '@/features/auth/utils'

export function RedefinirSenhaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isRH } = useAuthFlowVariant()

  // D-15: email vindo de EsqueciSenhaPage via router state (RESEARCH A3).
  // Se ausente (navegação direta), expomos um campo de email.
  const emailFromState =
    (location.state as { email?: string } | null)?.email ?? ''
  const [email, setEmail] = useState(emailFromState)
  const needsEmailInput = !emailFromState

  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RedefinirSenhaFormData>({
    resolver: zodResolver(redefinirSenhaSchema),
    mode: 'onBlur',
    defaultValues: { token: '', nova_senha: '', confirmar_nova_senha: '' },
  })

  const onSubmit = async (data: RedefinirSenhaFormData) => {
    const targetEmail = (email || emailFromState).trim()
    if (!targetEmail) {
      setError('token', {
        type: 'manual',
        message: 'Informe o email para o qual o código foi enviado.',
      })
      return
    }

    try {
      // D-15: verifica o OTP de 6 dígitos → estabelece a sessão de recuperação.
      await verifyRecoveryOtp(targetEmail, data.token)
      // Sessão estabelecida → define a nova senha (updateUser).
      await setNewPassword(data.nova_senha)

      // 2026-09-06: o destino depende do PAPEL da sessão recém-criada — um RH
      // redefinindo a senha caía em /candidato/perfil e no guard.
      const destino = await destinoPosRedefinicao()
      // Phase 4.1: aguarda hidratação antes de navegar para evitar
      // /candidato/perfil renderizar com candidato=null (só faz sentido p/ candidato).
      if (destino === '/candidato/perfil') await waitForCandidatoHydrated({ timeoutMs: 3000 })
      toast.success('Senha alterada com sucesso.', { duration: 4000 })
      navigate(destino, { replace: true })
    } catch (err) {
      if (isAuthError(err)) {
        // F-04.1-E: 422 transiente no setNewPassword (recupera no retry).
        const original = err.originalError as { status?: number } | undefined
        if (original?.status === 422) {
          toast.error('Houve um erro temporário. Tente novamente.', {
            duration: 6000,
          })
          return
        }

        // OTP inválido/expirado: o verifyOtp mapeia para SERVER_ERROR com a
        // mensagem "Sessão expirada. Solicite um novo link." — mostramos um
        // erro de campo no token para orientar o usuário a pedir novo código.
        const looksOtpInvalid =
          err.code === 'SERVER_ERROR' &&
          /sess(ã|a)o|expirad|inválid|código/i.test(err.message)
        if (looksOtpInvalid) {
          setError('token', {
            type: 'manual',
            message:
              'Código inválido ou expirado. Solicite um novo código.',
          })
          toast.error('Código inválido ou expirado. Solicite um novo.', {
            duration: 6000,
          })
          return
        }

        // Pitfall 2: tryAutoLogin como último recurso quando a sessão é
        // invalidada mid-flow mas a senha pode ter sido aceita.
        if (recoveryAutoLoginCandidate(err) && targetEmail) {
          const ok = await tryAutoLogin(targetEmail, data.nova_senha)
          if (ok) {
            const destino = await destinoPosRedefinicao()
            if (destino === '/candidato/perfil') await waitForCandidatoHydrated({ timeoutMs: 3000 })
            toast.success('Senha alterada com sucesso.', { duration: 4000 })
            navigate(destino, { replace: true })
            return
          }
          toast.success('Senha alterada. Faça login para continuar.', {
            duration: 5000,
          })
          navigate(isRH ? '/auth/login-rh' : '/auth/login', { replace: true })
          return
        }
        toast.error(err.message, { duration: 6000 })
      } else {
        toast.error('Não foi possível alterar a senha. Tente novamente.', {
          duration: 6000,
        })
      }
    }
  }

  /* ============================================================
     FORM — OTP + nova senha (D-11 silent Zod, D-15 OTP)
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
                Digite o código de 6 dígitos que enviamos para o seu email e
                escolha uma senha segura.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              aria-label="Formulário de redefinição de senha"
              autoComplete="off"
              noValidate
            >
              {/* Email (apenas quando ausente do router state) */}
              {needsEmailInput && (
                <div className="space-y-2">
                  <Label
                    htmlFor="recovery_email"
                    className="text-white text-sm font-semibold"
                  >
                    Email
                    <span className="text-red-400 ml-1" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70"
                      aria-hidden="true"
                    >
                      <Mail className="w-5 h-5" />
                    </span>
                    <Input
                      id="recovery_email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      aria-required="true"
                      className="bg-white/20 border-white/30 text-white text-base placeholder:text-white/50 pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Código OTP de 6 dígitos */}
              <div className="space-y-2">
                <Label
                  htmlFor="token"
                  className="text-white text-sm font-semibold"
                >
                  Código de verificação
                  <span className="text-red-400 ml-1" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Controller
                  name="token"
                  control={control}
                  render={({ field }) => (
                    <InputOTP
                      id="token"
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      containerClassName="justify-center"
                      aria-label="Código de verificação de 6 dígitos"
                      aria-required="true"
                      aria-invalid={!!errors.token}
                      aria-describedby={
                        errors.token ? 'token-error' : 'token-helper'
                      }
                    >
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={0}
                          className="bg-white/20 border-white/30 text-white"
                        />
                        <InputOTPSlot
                          index={1}
                          className="bg-white/20 border-white/30 text-white"
                        />
                        <InputOTPSlot
                          index={2}
                          className="bg-white/20 border-white/30 text-white"
                        />
                        <InputOTPSlot
                          index={3}
                          className="bg-white/20 border-white/30 text-white"
                        />
                        <InputOTPSlot
                          index={4}
                          className="bg-white/20 border-white/30 text-white"
                        />
                        <InputOTPSlot
                          index={5}
                          className="bg-white/20 border-white/30 text-white"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  )}
                />
                <p id="token-helper" className="text-xs text-white/80">
                  Enviamos o código de 6 dígitos para o seu email.
                </p>
                {errors.token && (
                  <p
                    id="token-error"
                    role="alert"
                    aria-live="assertive"
                    className="text-red-400 text-sm flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {errors.token.message}
                  </p>
                )}
              </div>

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
                    aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
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
                <p id="nova-senha-helper" className="text-xs text-white/80">
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
                    aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
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
                className="w-full bg-primary hover:bg-primary/90 text-white text-base font-semibold py-3 min-h-11 rounded-lg border border-primary/50 backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Link para solicitar novo código */}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/auth/esqueci-senha${isRH ? '?tipo=rh' : ''}`,
                    { replace: true },
                  )
                }
                className="text-sm text-white/80 hover:text-white underline py-2 block mx-auto"
              >
                Não recebi o código
              </button>
            </form>
          </GlassCard>
        </div>
      </main>
    </BackgroundImage>
  )
}

/**
 * Pitfall 2 — heurística para decidir se vale tentar `tryAutoLogin` como
 * fallback. Só quando o erro indica sessão expirada/invalidada mid-flow
 * (a senha pode ter sido aceita server-side antes da sessão cair).
 */
function recoveryAutoLoginCandidate(err: { code?: string; message?: string }) {
  return (
    err.code === 'SERVER_ERROR' &&
    /sess(ã|a)o|expired|expirad/i.test(err.message ?? '')
  )
}
