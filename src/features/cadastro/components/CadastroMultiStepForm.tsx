/**
 * Formulário Multi-Step de Cadastro de Candidatos
 *
 * Componente principal que gerencia o formulário de cadastro em 4 etapas:
 * 1. Dados Pessoais (com Instagram e LinkedIn)
 * 2. Endereço
 * 3. Disponibilidade (sem mobilidade)
 * 4. Autorizações LGPD
 *
 * Phase 2 Plan 02-06 wiring:
 * - D-01/D-02 auto-login via `tryAutoLogin` com single retry (500ms backoff)
 *   — internamente chama `supabase.auth.signInWithPassword` (serviceCadastro).
 * - D-03 success UX: toast `Bem-vindo(a), <nome>` + navigate('/candidato/perfil')
 * - D-06 structured error routing via `FIELD_TO_STEP_INDEX` / `FIELD_TO_STEP_PATH`
 * - D-13 draft save/load via `useCadastroDraft` (senha NUNCA persistida)
 * - D-14 leave guard via `useLeaveGuard(isDirty && !isSubmitting && !submitSuccess)`
 * - D-15 LGPD mandatory gate: submit blocked se `autorizacao_uso_dados === false`
 * - UI-SPEC: CTA "Criar conta" / "Criando..." com Loader2; LoadingProgress Dialog NÃO abre
 */

import React, { useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'

import {
  candidatoFormSchema,
  dadosPessoaisSchema,
  enderecoSchema,
  disponibilidadeSchema,
  autorizacoesSchema,
  type CandidatoFormData,
} from '../schemas'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/components/ui/utils'

import { useFormToast } from '../hooks/useFormToast'
import { LoadingProgress, type LoadingStage } from './LoadingProgress'

import { useCadastroDraft } from '../hooks/useCadastroDraft'
import { useLeaveGuard } from '../hooks/useLeaveGuard'
import {
  cadastrarCandidato,
  tryAutoLogin,
  CadastroError,
  FIELD_TO_STEP_INDEX,
  FIELD_TO_STEP_PATH,
} from '../services/cadastroService'
import { waitForCandidatoHydrated } from '@/features/auth/utils'

// Import dos componentes de cada step
import { DadosPessoaisStep } from './steps/DadosPessoaisStep'
import { EnderecoStep } from './steps/EnderecoStep'
import { DisponibilidadeStep } from './steps/DisponibilidadeStep'
import { AutorizacoesStep } from './steps/AutorizacoesStep'

// ============================================
// TYPES
// ============================================

type FormStep = 'dadosPessoais' | 'endereco' | 'disponibilidade' | 'autorizacoes'

interface StepConfig {
  id: FormStep
  title: string
  description: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any // Zod schema para validação do step
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>
}

// ============================================
// CONFIGURAÇÃO DOS STEPS
// ============================================

const FORM_STEPS: StepConfig[] = [
  {
    id: 'dadosPessoais',
    title: 'Dados Pessoais',
    description: 'Informações básicas e redes sociais',
    schema: dadosPessoaisSchema,
    component: DadosPessoaisStep,
  },
  {
    id: 'endereco',
    title: 'Endereço',
    description: 'Onde você mora atualmente',
    schema: enderecoSchema,
    component: EnderecoStep,
  },
  {
    id: 'disponibilidade',
    title: 'Disponibilidade',
    description: 'Quando você pode trabalhar',
    schema: disponibilidadeSchema,
    component: DisponibilidadeStep,
  },
  {
    id: 'autorizacoes',
    title: 'Autorizações',
    description: 'Consentimentos LGPD necessários',
    schema: autorizacoesSchema,
    component: AutorizacoesStep,
  },
]

// ============================================
// PROPS DO COMPONENTE
// ============================================

interface CadastroMultiStepFormProps {
  onSubmit?: (data: CandidatoFormData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<CandidatoFormData>
}

// ============================================
// ROUTE CADASTRO ERROR (Phase 2 D-06 helper)
// ============================================

/**
 * Roteia um `CadastroError` para a UI correta:
 * - `EMAIL_EXISTS` / `CPF_EXISTS` → step 0 + inline error no campo
 * - `VALIDATION` com `field` conhecido → step do `FIELD_TO_STEP_INDEX` + inline
 * - `NETWORK_ERROR` / `SERVER_ERROR` / default → toast genérico
 *
 * T-02-11 mitigation: `field` do servidor é validado contra `FIELD_TO_STEP_INDEX`
 * whitelist antes de navegar. Campos desconhecidos caem em toast genérico.
 */
function routeCadastroError(
  err: CadastroError,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methods: any,
  setCurrentStepIndex: (i: number) => void,
) {
  switch (err.code) {
    case 'EMAIL_EXISTS':
      setCurrentStepIndex(0)
      methods.setError('dadosPessoais.email', { type: 'duplicate', message: err.message })
      toast.error('Este email já está cadastrado. Tente fazer login ou use outro email.', { duration: 6000 })
      return
    case 'CPF_EXISTS':
      setCurrentStepIndex(0)
      methods.setError('dadosPessoais.cpf', { type: 'duplicate', message: err.message })
      toast.error('Este CPF já está cadastrado. Tente fazer login ou verifique se é o correto.', { duration: 6000 })
      return
    case 'VALIDATION':
      if (err.field && FIELD_TO_STEP_INDEX[err.field] !== undefined) {
        setCurrentStepIndex(FIELD_TO_STEP_INDEX[err.field])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        methods.setError(FIELD_TO_STEP_PATH[err.field] as any, { message: err.message })
      }
      toast.error('Há um problema com os dados enviados. Revise o formulário e tente novamente.', { duration: 6000 })
      return
    case 'NETWORK_ERROR':
      toast.error('Sem conexão com o servidor. Verifique sua internet e tente novamente.', { duration: 6000 })
      return
    case 'SERVER_ERROR':
    case 'EDGE_FUNCTION_ERROR':
    case 'UNKNOWN_ERROR':
    default:
      toast.error('Algo deu errado do nosso lado. Tente novamente em alguns instantes.', { duration: 6000 })
      return
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function CadastroMultiStepForm({
  // `onSubmit` remains in the props contract for callers that still pass it
  // (Phase 1 CadastroPage shape). Phase 2 Plan 02-06 moved the submit flow
  // into the form itself; the prop is accepted but intentionally ignored
  // here (form drives navigation via useNavigate + tryAutoLogin).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSubmit: _onSubmit,
  onCancel,
  initialData,
}: CadastroMultiStepFormProps) {
  // State do step atual
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<FormStep[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // State para o LoadingProgress Dialog (mantido para Phase 4 — NÃO abre em cadastro)
  const [submissionStages] = useState<LoadingStage[]>([])
  const showLoadingDialog = false

  // Toast hook (helpers legados ainda usados em navigateBetweenSteps)
  const toastHelper = useFormToast()

  // Router + draft + leave guard
  const navigate = useNavigate()
  const draft = useCadastroDraft()

  // Configuração do React Hook Form
  const methods = useForm<CandidatoFormData>({
    resolver: zodResolver(candidatoFormSchema),
    mode: 'onBlur', // Valida quando o campo perde foco
    defaultValues: initialData || {
      dadosPessoais: {
        nome_completo: '',
        cpf: '',
        email: '',
        telefone: '',
        data_nascimento: '',
        genero: 'prefiro_nao_informar',
        instagram: null,
        linkedin: null,
      },
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: null,
        bairro: '',
        cidade: '',
        estado: '',
      },
      disponibilidade: {
        turno_preferido: 'integral',
        modelo_trabalho: 'presencial',
        disponibilidade_imediata: false,
        data_disponibilidade: null,
      },
      autorizacoes: {
        autorizacao_uso_dados: true,
        autorizacao_comunicacao: true,
        autorizacao_retencao_curriculo: true,
        autorizacao_analise_video: false,
      },
    },
  })

  // Leave guard: bloqueia refresh/close acidental enquanto o form está sujo e
  // ainda não submetido (D-14, T-02-09)
  useLeaveGuard(methods.formState.isDirty && !isSubmitting && !submitSuccess)

  // Load draft on mount (uma única vez). Se houver rascunho, restaura e mostra
  // toast com a ação "Começar do zero".
  //
  // Nota: toast dispara em um setTimeout de 100ms — Sonner v2 subscreve os
  // toasts em uma store global que só é conectada ao <Toaster> renderizado no
  // App.tsx após o primeiro paint. Disparar dentro de useEffect no mount do
  // form pode ocorrer ANTES desse paint em React 18 (especialmente pós-reload
  // com SSR-hydration-like concurrency). O microtask defer garante a entrega.
  useEffect(() => {
    const saved = draft.load()
    if (saved) {
      methods.reset(saved as Parameters<typeof methods.reset>[0])
      setTimeout(() => {
        toast.info('Retomamos seu cadastro de onde você parou.', {
          duration: 4000,
          action: {
            label: 'Começar do zero',
            onClick: () => {
              draft.clear()
              methods.reset()
            },
          },
        })
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced draft save on every form change (500ms)
  const watchedData = methods.watch()
  useEffect(() => {
    const timer = setTimeout(() => draft.save(watchedData as never), 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedData)])

  // Configuração do step atual
  const currentStep = FORM_STEPS[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === FORM_STEPS.length - 1
  const progress = ((currentStepIndex + 1) / FORM_STEPS.length) * 100

  // ============================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ============================================

  /**
   * Valida o step atual antes de avançar
   */
  const validateCurrentStep = async (): Promise<boolean> => {
    const stepData = methods.getValues(currentStep.id)
    const result = currentStep.schema.safeParse(stepData)

    if (!result.success) {
      // Mostrar erros de validação
      const errors = result.error.flatten().fieldErrors
      Object.entries(errors).forEach(([field, messages]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        methods.setError(`${currentStep.id}.${field}` as any, {
          message: (messages as string[])[0],
        })
      })

      toastHelper.messages.validationError()
      return false
    }

    // Marcar step como completado
    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps([...completedSteps, currentStep.id])
    }

    return true
  }

  /**
   * Avança para o próximo step.
   *
   * Special-case for Step 4 (Autorizações): skip `validateCurrentStep()` and
   * jump straight to `handleFormSubmit()`. The step-level Zod schema
   * (`autorizacoesSchema`) uses `z.literal(true)` on `autorizacao_uso_dados`,
   * which would intercept the submit click with the generic
   * "Verifique os campos..." toast instead of the UI-SPEC-mandated LGPD copy
   * ("Para criar sua conta, você precisa autorizar o uso dos dados."). The
   * guard in `handleFormSubmit` produces the correct copy + inline error
   * per UI-SPEC § Submit Block Rule.
   */
  const handleNext = async () => {
    if (isLastStep) {
      await handleFormSubmit()
      return
    }

    const isValid = await validateCurrentStep()

    if (isValid) {
      setCurrentStepIndex(currentStepIndex + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /**
   * Volta para o step anterior
   */
  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /**
   * Navega diretamente para um step específico
   * (apenas se o step já foi completado ou é o próximo)
   */
  const goToStep = (stepIndex: number) => {
    const targetStep = FORM_STEPS[stepIndex]

    // Só permite navegar para steps já completados ou o próximo
    if (
      stepIndex <= currentStepIndex ||
      completedSteps.includes(targetStep.id)
    ) {
      setCurrentStepIndex(stepIndex)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /**
   * Enter-key guard para Step 4 (UI-SPEC a11y): Enter dentro de um <Input> NÃO
   * deve disparar submit — user precisa clicar explicitamente em "Criar conta".
   */
  const handleStep4KeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault()
    }
  }

  /**
   * Submit final do formulário (Step 4)
   *
   * Phase 2 D-01 / D-02 / D-03 / D-06 / D-15 wiring:
   * 1. First-line guard: LGPD mandatory (D-15)
   * 2. setTimeout(2000) → toast.loading('Criando sua conta...')
   * 3. cadastrarCandidato → Edge Function (D-01a)
   * 4. tryAutoLogin (D-02: 1x retry 500ms backoff)
   * 5. draft.clear() + navigate('/candidato/perfil') + welcome toast
   * 6. On CadastroError: routeCadastroError (D-06)
   * 7. finally: clear loading toast + re-enable submit
   */
  const handleFormSubmit = async () => {
    const formData = methods.getValues()

    // Mandatory LGPD check (D-15) — first-line guard ANTES de qualquer async
    if (!formData.autorizacoes?.autorizacao_uso_dados) {
      methods.setError('autorizacoes.autorizacao_uso_dados', {
        type: 'required',
        message: 'Para criar sua conta, você precisa autorizar o uso dos dados.',
      })
      toast.error('Para criar sua conta, você precisa autorizar o uso dos dados.', { duration: 6000 })
      return
    }

    setIsSubmitting(true)
    const submitLoadingTimer = setTimeout(() => {
      toast.loading('Criando sua conta...', { id: 'cadastro-submit' })
    }, 2000)

    try {
      const result = candidatoFormSchema.safeParse(formData)
      if (!result.success) {
        toast.error('Há erros no formulário. Por favor, revise todos os campos.', { duration: 6000 })
        return
      }

      // Phase 2 flow: form drives cadastrarCandidato → tryAutoLogin → navigate
      // regardless of whether the parent passed `onSubmit`. The parent
      // `onSubmit` (legacy Phase 1 shape) is called BEFORE navigation as a
      // side-effect hook (analytics, vagaId handling) and MUST NOT throw or
      // navigate on its own — the form owns the UX (D-01, D-03, D-06).
      await cadastrarCandidato(result.data)

      const loggedIn = await tryAutoLogin(
        result.data.dadosPessoais.email,
        result.data.dadosPessoais.senha,
      )

      draft.clear()
      setSubmitSuccess(true)
      const primeiroNome = result.data.dadosPessoais.nome_completo.split(' ')[0]

      if (loggedIn) {
        // Phase 4.1 (RESEARCH §Pitfall 5): tryAutoLogin retorna true ANTES
        // do listener SIGNED_IN ter rodado o callback. Aguarda hidratação
        // até `candidato !== null` para evitar /candidato/perfil render
        // com fields vazios.
        await waitForCandidatoHydrated({ timeoutMs: 3000 })
        toast.success(`Cadastro concluído! Bem-vindo(a), ${primeiroNome}.`, { duration: 5000 })
        navigate('/candidato/perfil', { replace: true })
      } else {
        toast.success('Cadastro concluído. Faça login para continuar.', { duration: 5000 })
        navigate('/auth/login?email=' + encodeURIComponent(result.data.dadosPessoais.email))
      }
    } catch (err) {
      if (err instanceof CadastroError) {
        routeCadastroError(err, methods, setCurrentStepIndex)
      } else {
        console.error('[CADASTRO] Erro inesperado no submit:', err instanceof Error ? err.message : String(err))
        toast.error('Erro inesperado. Tente novamente.', { duration: 6000 })
      }
    } finally {
      clearTimeout(submitLoadingTimer)
      toast.dismiss('cadastro-submit')
      setIsSubmitting(false)
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <FormProvider {...methods}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs sm:text-sm text-white">
            <span>
              Etapa {currentStepIndex + 1} de {FORM_STEPS.length}
            </span>
            <span className="hidden xs:inline">{Math.round(progress)}% completo</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-between items-center gap-1 sm:gap-2">
          {FORM_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = index === currentStepIndex
            const isAccessible =
              index <= currentStepIndex || completedSteps.includes(step.id)

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(index)}
                disabled={!isAccessible}
                aria-label={step.title}
                className={cn(
                  'flex flex-col items-center gap-1 sm:gap-2 flex-1',
                  'transition-opacity duration-200 touch-manipulation',
                  'min-w-[44px] min-h-[44px]', // Minimum touch target
                  {
                    'opacity-100': isCurrent || isCompleted,
                    'opacity-50': !isCurrent && !isCompleted,
                    'cursor-pointer hover:opacity-100': isAccessible,
                    'cursor-not-allowed': !isAccessible,
                  }
                )}
              >
                {/* Circle indicator */}
                <div
                  className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center',
                    'border-2 transition-all duration-200',
                    {
                      'bg-white border-white text-[#00109E]': isCurrent,
                      'bg-green-500 border-green-500 text-white': isCompleted && !isCurrent,
                      'bg-white/20 border-white/30 text-white': !isCurrent && !isCompleted,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <span className="text-xs sm:text-base font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step title */}
                <div className="text-center hidden sm:block">
                  <p className="text-xs font-semibold text-white">
                    {step.title}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Current Step Content */}
        <div
          className="bg-white/10 backdrop-blur-lg rounded-lg p-4 sm:p-6 md:p-8"
          onKeyDown={currentStepIndex === 3 ? handleStep4KeyDown : undefined}
        >
          {/* Step Header */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
              {currentStep.title}
            </h2>
            <p className="text-sm sm:text-base text-white">{currentStep.description}</p>
          </div>

          {/* Step Form */}
          <currentStep.component />
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pb-4 sm:pb-0">
          {/* Botão Voltar / Cancelar */}
          <Button
            type="button"
            variant="outline"
            onClick={isFirstStep ? onCancel : handlePrevious}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            {isFirstStep ? (
              'Cancelar'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </>
            )}
          </Button>

          {/* Botão Próximo / Criar conta */}
          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#00109E] hover:bg-[#00109E]/90 text-white"
          >
            {isLastStep ? (
              isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Criando...
                </>
              ) : (
                <>
                  Criar conta
                  <Check className="w-4 h-4 ml-2" aria-hidden="true" />
                </>
              )
            ) : (
              <>
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/*
          LoadingProgress Dialog — MANTIDO para reuso em Phase 4 (upload de
          currículo com progresso real), porém NUNCA aberto durante submit do
          cadastro. `showLoadingDialog` é constante `false` por design.
        */}
        <Dialog open={showLoadingDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Processando cadastro</DialogTitle>
              <DialogDescription>
                Aguarde enquanto processamos seu cadastro. Isso pode levar alguns segundos.
              </DialogDescription>
            </DialogHeader>
            <LoadingProgress
              stages={submissionStages}
              title="Criando seu cadastro..."
              showProgressBar={true}
            />
          </DialogContent>
        </Dialog>
      </div>
    </FormProvider>
  )
}
