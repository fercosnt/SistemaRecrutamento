/**
 * LoginRHPage — Phase 3 Wave 4 (Plan 03-05).
 *
 * Login da área RH/Admin. Mesma estrutura da LoginCandidatoPage com 3
 * divergências (UI-SPEC L637-660):
 *   - Title: "Área RH" (não "Entrar")
 *   - Subtitle: "Acesse o painel interno"
 *   - Email placeholder: "seu.email@beautysmile.com.br"
 *   - Sem footer de cadastro/inscrição (contas RH são provisionadas pelo admin)
 *   - Esqueci senha → /auth/esqueci-senha?tipo=rh (variant query param)
 *   - **Role gate D-14 (Bug 2/3 fix)**: post-signIn, leitura de
 *     `useAuthStore.getState().role` com bounded polling (5×20ms = 100ms cap).
 *     Se role !== 'administrador' → `supabase.auth.signOut()` + toast +
 *     return (sem navegar).
 *
 * D-14 / Bug 2/3 fix:
 *   Os setters legados do antigo store admin (deletado em Phase 4.1 — FOUND-12)
 *   forjavam role='administrador' no client-side sem ler o JWT. Esta page
 *   REMOVE esses setters; a derivação do role agora vem do listener
 *   `supabase.auth.onAuthStateChange` montado uma vez no RootLayout (App.tsx),
 *   que sincroniza authStore via hydrateFromSession (Phase 4.1 fix) →
 *   extractRole (Plan 03-03 / Bug 1 fix) decodifica o JWT e popula `role`.
 *
 * Pitfall 1 (rejeitado):
 *   `await new Promise(r => setTimeout(r, 0))` cria uma macrotask que NÃO
 *   é determinística sob React 18 Concurrent Mode (research §Pitfall 1).
 *   Bounded polling 5×20ms é deterministicamente ≤ 100ms total + early-exit.
 *
 * Pitfall 7: zero console.* nesta page; observabilidade fica no authService.
 *
 * @module components/pages/LoginRHPage
 */

import { useRef, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ArrowRight,
  Clock,
  Send,
} from 'lucide-react'

import { BackgroundImage } from '../BackgroundImage'
import { GlassCard } from '../ui/glass'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { BeautySmileLogo } from '../BeautySmileLogo'

import { loginSchema, type LoginFormData } from '@/features/auth/schemas'
import { signIn, resendConfirmation } from '@/features/auth/services'
import { AuthError, isAuthError } from '@/features/auth/types'
import { useRateLimitCooldown } from '@/features/auth/hooks'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'

export function LoginRHPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [lastError, setLastError] = useState<AuthError | null>(null)
  const [isResending, setIsResending] = useState(false)
  const senhaRef = useRef<HTMLInputElement | null>(null)
  const {
    remainingSeconds,
    isActive: isInCooldown,
    setCooldown,
  } = useRateLimitCooldown()

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true, // D-05: persistente por default
    },
  })

  const passwordRegister = register('password')

  const onSubmit = async (data: LoginFormData) => {
    setLastError(null)
    try {
      await signIn({
        email: data.email,
        senha: data.password,
        rememberMe: data.rememberMe ?? true,
      })

      // D-14 ROLE GATE (ISSUE-005 — bounded polling, NOT setTimeout(0)).
      //
      // The supabase.auth.onAuthStateChange listener (mounted in App.tsx)
      // fires SIGNED_IN → authStore.setSession → extractRole → role populated.
      // That listener runs as a microtask off the SDK's internal Promise
      // resolution; empirically resolves within 1-2 ticks under React 18
      // Concurrent Mode, but we bound it to a max of 5 retries × 20ms = 100ms
      // before assuming failure. Exits the loop AS SOON AS role is populated.
      //
      // setTimeout(0) is REJECTED here (research §Pitfall 1) — a 0ms macrotask
      // is not deterministic under React Concurrent Mode rendering work.
      for (let i = 0; i < 5 && !useAuthStore.getState().role; i++) {
        await new Promise((r) => setTimeout(r, 20))
      }
      const role = useAuthStore.getState().role

      if (role !== 'administrador') {
        await supabase.auth.signOut()
        toast.error('Esta conta não tem acesso ao painel RH.', {
          duration: 6000,
        })
        return
      }

      toast.success('Login realizado com sucesso!', { duration: 3000 })
      navigate('/rh/dashboard', { replace: true })
    } catch (err) {
      if (isAuthError(err)) {
        setLastError(err)
        switch (err.code) {
          case 'INVALID_CREDENTIALS':
            toast.error(
              'Email ou senha inválidos. Verifique os dados e tente novamente.',
              { duration: 6000 }
            )
            senhaRef.current?.focus()
            break
          case 'EMAIL_NOT_CONFIRMED':
            toast.error('Confirme seu email antes de fazer login.', {
              duration: 6000,
            })
            break
          case 'RATE_LIMITED':
            toast.warning(
              `Muitas tentativas. Tente novamente em ${err.retryAfterSeconds ?? 60}s.`,
              { duration: 5000 }
            )
            if (err.retryAfterSeconds) setCooldown(err.retryAfterSeconds)
            else setCooldown(60)
            break
          case 'NETWORK_ERROR':
            toast.error('Sem conexão com o servidor. Verifique sua internet.', {
              duration: 6000,
              action: {
                label: 'Tentar novamente',
                onClick: () => {
                  void handleSubmit(onSubmit)()
                },
              },
            })
            break
          case 'SERVER_ERROR':
            toast.error('Algo deu errado. Tente novamente em alguns instantes.', {
              duration: 6000,
              action: {
                label: 'Tentar novamente',
                onClick: () => {
                  void handleSubmit(onSubmit)()
                },
              },
            })
            break
          default:
            toast.error('Erro inesperado. Tente novamente.', { duration: 6000 })
        }
      } else {
        toast.error('Erro inesperado. Tente novamente.', { duration: 6000 })
      }
    }
  }

  const handleResend = async () => {
    const email = getValues('email')
    if (!email) {
      toast.error('Informe seu email primeiro.', { duration: 4000 })
      return
    }
    setIsResending(true)
    try {
      await resendConfirmation(email)
      toast.success(
        'Email reenviado. Verifique sua caixa de entrada (e spam).',
        { duration: 5000 }
      )
    } catch (err) {
      if (isAuthError(err)) {
        if (err.code === 'RATE_LIMITED') {
          toast.warning(
            `Muitas tentativas. Tente novamente em ${err.retryAfterSeconds ?? 60}s.`,
            { duration: 5000 }
          )
          if (err.retryAfterSeconds) setCooldown(err.retryAfterSeconds)
        } else {
          toast.error(err.message, { duration: 6000 })
        }
      } else {
        toast.error('Erro inesperado. Tente novamente.', { duration: 6000 })
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <BackgroundImage
      background="gradient"
      overlayColor="bg-black"
      overlayOpacity={15}
    >
      <main
        aria-label="Autenticação"
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
                Área RH
              </h1>
              <p className="text-sm text-white/90 drop-shadow-md">
                Acesse o painel interno
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              aria-label="Formulário de login"
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
                    placeholder="seu.email@beautysmile.com.br"
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
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
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-white text-sm font-semibold"
                >
                  Senha
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
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...passwordRegister}
                    ref={(el) => {
                      passwordRegister.ref(el)
                      senhaRef.current = el
                    }}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    aria-required="true"
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? 'password-error' : undefined
                    }
                    className="bg-white/20 border-white/30 text-white text-base placeholder:text-white/50 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? 'Ocultar senha' : 'Mostrar senha'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 -m-2 text-white/70 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    aria-live="assertive"
                    className="text-red-400 text-sm flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Lembrar-me + Esqueci minha senha (?tipo=rh variant) */}
              <div className="flex items-start justify-between gap-3 py-2 flex-wrap gap-y-2">
                <div className="flex items-start gap-2">
                  <Controller
                    name="rememberMe"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="rememberMe"
                        checked={field.value ?? true}
                        onCheckedChange={(v: boolean | 'indeterminate') =>
                          field.onChange(v === true)
                        }
                        className="border-white/30 data-[state=checked]:bg-[#00109E] data-[state=checked]:border-[#00109E] mt-0.5"
                      />
                    )}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="rememberMe"
                      className="text-white text-sm font-semibold cursor-pointer"
                    >
                      Lembrar-me
                    </Label>
                    <p className="text-xs text-white/80 mt-0.5">
                      Manter sessão ativa ao fechar o navegador
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/auth/esqueci-senha?tipo=rh')}
                  className="text-sm text-white/80 hover:text-white underline py-2"
                >
                  Esqueci minha senha
                </button>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting || !isValid || isInCooldown}
                className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white text-base font-semibold py-3 min-h-11 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Entrando...
                  </>
                ) : isInCooldown ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span aria-live="polite" aria-atomic="true">
                      Aguarde {remainingSeconds}s
                    </span>
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Button>

              {/* EMAIL_NOT_CONFIRMED amber block */}
              {lastError?.code === 'EMAIL_NOT_CONFIRMED' && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-lg bg-amber-500/10 border border-amber-400/30 p-4 space-y-2"
                >
                  <p className="text-sm text-white flex items-start gap-2">
                    <AlertCircle
                      className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      Confirme seu email antes de fazer login. Verifique sua
                      caixa de entrada e spam.
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full inline-flex items-center justify-center bg-white/10 border border-white/30 text-white text-sm font-semibold py-2 rounded-md hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isResending ? (
                      <>
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Reenviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                        Reenviar email de confirmação
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* RATE_LIMITED amber block (live countdown) */}
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
                      Muitas tentativas em pouco tempo. Tente novamente em{' '}
                      <span aria-atomic="true">{remainingSeconds}s</span>.
                    </span>
                  </p>
                </div>
              )}
            </form>
          </GlassCard>

          {/* Sem footer de cadastro — contas RH são provisionadas pelo admin (UI-SPEC L647). */}
        </div>
      </main>
    </BackgroundImage>
  )
}
