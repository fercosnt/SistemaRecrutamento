/**
 * LoginCandidatoPage — Phase 3 Wave 4 (Plan 03-05).
 *
 * Login do candidato. Single-column glass card max-w-md (UI-SPEC L62-99).
 * Consome `signIn` + `resendConfirmation` (`@/features/auth/services`) e
 * `useRateLimitCooldown` (`@/features/auth/hooks`). Pitfall 7: nenhum
 * `console.*` nesta page; toda observabilidade vai pelo authService.
 *
 * Erros mapeados via D-17 AuthError taxonomy (UI-SPEC L743-752):
 *   INVALID_CREDENTIALS  → toast.error + foco em senha
 *   EMAIL_NOT_CONFIRMED  → amber block + Reenviar CTA
 *   RATE_LIMITED         → cooldown countdown via useRateLimitCooldown
 *   NETWORK_ERROR        → toast com action "Tentar novamente"
 *   SERVER_ERROR / UNKNOWN_ERROR → toast genérico
 *
 * D-05: rememberMe = true por default (RHF defaultValues; sobrescreve Zod default(false)).
 *
 * @module components/pages/LoginCandidatoPage
 */

import { useRef, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { waitForCandidatoHydrated } from '@/features/auth/utils'
import { resolveRedirect } from '@/features/auth/utils/resolveRedirect'

// Phase 22 / Plan 22-03 (UX-05): `resolveRedirect` was extracted into a shared
// auth util so login AND cadastro consume ONE anti-open-redirect guard. It is
// re-exported here so the pre-existing routing test (`LoginCandidatoPage.test.tsx`,
// which imports `resolveRedirect` from this module) keeps working unchanged.
export { resolveRedirect }

export function LoginCandidatoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    // Cast: Resolver v5 cross-validates Zod input vs output; loginSchema's
    // `rememberMe: z.boolean().optional().default(false)` produces input
    // `rememberMe?: boolean` vs output `rememberMe: boolean`, which the
    // strict Resolver type rejects. The runtime behavior is correct.
    resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true, // D-05: persistente por default
    },
  })

  // Encadeia o ref do RHF com o ref local (para focus em INVALID_CREDENTIALS).
  const passwordRegister = register('password')

  const onSubmit = async (data: LoginFormData) => {
    setLastError(null)
    try {
      await signIn({
        email: data.email,
        senha: data.password,
        rememberMe: data.rememberMe ?? true,
      })
      // Phase 4.1 (RESEARCH §Pattern 2): defense-in-depth. Listener Pattern 1
      // (App.tsx) hydrates via setTimeout(0); submit handler may navigate
      // BEFORE fetchProfile resolves. Block until candidato populated OR
      // hard timeout (3s) — degrades gracefully (RoleGuard catches role).
      await waitForCandidatoHydrated({ timeoutMs: 3000 })
      // UX-05 (Phase 22 / Plan 22-03): clear the orphan `candidatura_vaga_id`
      // localStorage key on successful login. It is written by CadastroPage from
      // `?vagaId` and read by InstrucoesFormularioPage, but no code path ever
      // removed it — it lingered across sessions (stale-state / info-leak surface).
      //
      // WR-01 (Phase 22 code review): do NOT clear it when this login arrived via
      // the cadastro auto-login-failure bounce (`/auth/login?email=...`, navigated
      // ONLY by CadastroMultiStepForm when post-signup auto-login fails). On that
      // path the candidatura is still in flight and InstrucoesFormularioPage must
      // consume the vaga context AFTER this manual login — clearing it here would
      // strand the candidate on the hardcoded `vagaId='1'` fallback. On that flow
      // the key is instead cleared at its point of consumption
      // (InstrucoesFormularioPage). A plain login (no `?email`) still runs cleanup.
      const cameFromCadastroBounce = searchParams.get('email') !== null
      if (!cameFromCadastroBounce) {
        localStorage.removeItem('candidatura_vaga_id')
      }
      toast.success('Login realizado com sucesso!', { duration: 3000 })
      // VAGA-03: consume `?redirect=` query param (e.g. set by VagaDetalhePage
      // when an unauthenticated visitor clicks "Candidatar-se"). Guarded against
      // open-redirect by `resolveRedirect`.
      const target = resolveRedirect(searchParams.get('redirect'))
      navigate(target, { replace: true })
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
                Entrar
              </h1>
              <p className="text-sm text-white/90 drop-shadow-md">
                Acesse sua conta de candidato
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
                    placeholder="seu@email.com"
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

              {/* Lembrar-me + Esqueci minha senha */}
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
                        className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
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
                  onClick={() => navigate('/auth/esqueci-senha')}
                  className="text-sm text-white/80 hover:text-white underline py-2"
                >
                  Esqueci minha senha
                </button>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting || isInCooldown}
                className="w-full bg-primary hover:bg-primary/90 text-white text-base font-semibold py-3 min-h-11 rounded-lg border border-primary/50 backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
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

          <p className="text-center text-sm text-white/80 mt-6">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => {
                // UX-05: carry the `?redirect` param across to cadastro so it
                // survives login→cadastro→post-login. encodeURIComponent it (the
                // value is a path that may contain query chars); CadastroPage
                // re-guards it via resolveRedirect on consumption.
                const r = searchParams.get('redirect')
                navigate(
                  r ? `/cadastro?redirect=${encodeURIComponent(r)}` : '/cadastro'
                )
              }}
              className="text-white hover:underline py-1"
            >
              Criar conta →
            </button>
          </p>
        </div>
      </main>
    </BackgroundImage>
  )
}
