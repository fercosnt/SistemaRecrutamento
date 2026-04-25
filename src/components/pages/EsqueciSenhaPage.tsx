/**
 * EsqueciSenhaPage — Phase 3 Wave 5 (Plan 03-06).
 *
 * Recuperação de senha (candidato e RH). Single-column glass card max-w-md
 * (UI-SPEC L443-503). 2-state machine: form → post-submit neutral success card.
 * D-09 anti-enumeration: copy de sucesso é IDÊNTICA para email cadastrado e
 * não-cadastrado; nenhum echo de `{emailValue}` na success card.
 *
 * Variant detection (UI-SPEC L658-660):
 *   `?tipo=rh` → Voltar ao login navega para `/auth/login-rh`
 *   default    → Voltar ao login navega para `/auth/login`
 *
 * Service layer:
 *   `requestPasswordReset(email, isRH)` — D-09 swallow-vs-surface; APENAS
 *   RATE_LIMITED é propagado ao caller. Network errors / não-encontrado /
 *   etc. são silenciados no service e a UI mostra success neutro.
 *
 * Pitfall 7: nenhuma chamada de log nesta page; observabilidade no passwordService.
 *
 * @module components/pages/EsqueciSenhaPage
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Mail,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Clock,
} from 'lucide-react'

import { BackgroundImage } from '../BackgroundImage'
import { GlassCard } from '../ui/glass'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { BeautySmileLogo } from '../BeautySmileLogo'

import {
  esqueciSenhaSchema,
  type EsqueciSenhaFormData,
} from '@/features/auth/schemas'
import { requestPasswordReset } from '@/features/auth/services'
import { isAuthError } from '@/features/auth/types'
import { useAuthFlowVariant, useRateLimitCooldown } from '@/features/auth/hooks'

export function EsqueciSenhaPage() {
  const navigate = useNavigate()
  const [emailEnviado, setEmailEnviado] = useState(false)
  const { isRH } = useAuthFlowVariant()
  const {
    remainingSeconds,
    isActive: isInCooldown,
    setCooldown,
  } = useRateLimitCooldown()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EsqueciSenhaFormData>({
    resolver: zodResolver(esqueciSenhaSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  })

  const goToLogin = () => {
    navigate(isRH ? '/auth/login-rh' : '/auth/login', { replace: true })
  }

  const reopenForm = () => {
    reset({ email: '' })
    setEmailEnviado(false)
  }

  const onSubmit = async (data: EsqueciSenhaFormData) => {
    try {
      await requestPasswordReset(data.email, isRH)
      setEmailEnviado(true)
      toast.info('Se o email existir, o link de recuperação foi enviado.', {
        duration: 4000,
      })
    } catch (err) {
      if (isAuthError(err) && err.code === 'RATE_LIMITED') {
        toast.warning(
          err.retryAfterSeconds
            ? `Muitas solicitações. Tente novamente em ${err.retryAfterSeconds}s.`
            : 'Muitas solicitações. Tente novamente em alguns minutos.',
          { duration: 5000 },
        )
        if (err.retryAfterSeconds) setCooldown(err.retryAfterSeconds)
        else setCooldown(60)
        // D-09: NÃO avança para success em rate-limit — usuário precisa
        // ver o cooldown e tentar de novo depois.
        return
      }
      // D-09 anti-enumeration: qualquer outro erro continua mostrando
      // a success neutra (passwordService já swallow no service layer;
      // este catch é defensivo para casos não previstos).
      setEmailEnviado(true)
      toast.info('Se o email existir, o link de recuperação foi enviado.', {
        duration: 4000,
      })
    }
  }

  return (
    <BackgroundImage
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
    >
      <main
        aria-label="Recuperação de senha"
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
            {emailEnviado ? (
              /* ========================================
                 POST-SUBMIT — D-09 neutral success card
                 ======================================== */
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center backdrop-blur-md">
                    <CheckCircle2
                      className="w-8 h-8 text-green-400 drop-shadow-lg"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-white text-xl font-semibold drop-shadow-lg">
                    Verifique seu email
                  </h2>
                  <p className="text-white text-sm drop-shadow-md leading-relaxed">
                    Se o email estiver cadastrado, enviamos um link de
                    recuperação. Verifique sua caixa de entrada (e spam).
                  </p>
                </div>

                <div
                  className="bg-white/10 border border-white/20 rounded-lg p-4"
                  role="note"
                >
                  <p className="text-white/90 text-sm leading-relaxed">
                    O link expira em 1 hora.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    onClick={goToLogin}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white text-base font-semibold py-3 min-h-11 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-200"
                  >
                    Voltar ao login
                  </Button>
                  <button
                    type="button"
                    onClick={reopenForm}
                    className="text-sm text-white/80 hover:text-white underline py-2"
                  >
                    Usar outro email
                  </button>
                </div>
              </div>
            ) : (
              /* ========================================
                 INITIAL FORM
                 ======================================== */
              <>
                <div className="text-center mb-6">
                  <h1 className="text-white text-2xl font-semibold mb-2 drop-shadow-lg">
                    Recuperar senha
                  </h1>
                  <p className="text-sm text-white/90 drop-shadow-md">
                    Informe seu email cadastrado e enviaremos um link para
                    você criar uma nova senha.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                  aria-label="Formulário de recuperação de senha"
                  noValidate
                >
                  {/* Email */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
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
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="seu@email.com"
                        autoComplete="email"
                        autoFocus
                        aria-required="true"
                        aria-invalid={!!errors.email}
                        aria-describedby={
                          errors.email ? 'email-error' : undefined
                        }
                        className="bg-white/20 border-white/30 text-white text-base placeholder:text-white/50 pl-10"
                      />
                    </div>
                    {errors.email && (
                      <p
                        id="email-error"
                        role="alert"
                        aria-live="assertive"
                        className="text-red-400 text-sm flex items-center gap-1"
                      >
                        <AlertCircle
                          className="w-4 h-4"
                          aria-hidden="true"
                        />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || isInCooldown}
                    className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white text-base font-semibold py-3 min-h-11 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Enviando...
                      </>
                    ) : isInCooldown ? (
                      <>
                        <Clock
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                        <span aria-live="polite" aria-atomic="true">
                          Aguarde {remainingSeconds}s
                        </span>
                      </>
                    ) : (
                      'Enviar instruções'
                    )}
                  </Button>

                  {/* RATE_LIMITED amber block (cooldown ativo) */}
                  {isInCooldown && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="rounded-lg bg-amber-500/10 border border-amber-400/30 p-4"
                    >
                      <p className="text-sm text-white flex items-start gap-2">
                        <Clock
                          className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          Muitas solicitações em pouco tempo. Tente novamente
                          em <span aria-atomic="true">{remainingSeconds}s</span>.
                        </span>
                      </p>
                    </div>
                  )}
                </form>

                {/* Voltar ao login */}
                <button
                  type="button"
                  onClick={() =>
                    navigate(isRH ? '/auth/login-rh' : '/auth/login')
                  }
                  className="flex items-center justify-center gap-2 text-sm text-white/80 hover:text-white underline py-2 mt-6 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Voltar ao login
                </button>
              </>
            )}
          </GlassCard>
        </div>
      </main>
    </BackgroundImage>
  )
}
