/**
 * Formulário Multi-Step de Cadastro de Candidatos
 *
 * Componente principal que gerencia o formulário de cadastro em 4 etapas:
 * 1. Dados Pessoais (com Instagram e LinkedIn)
 * 2. Endereço
 * 3. Disponibilidade (sem mobilidade)
 * 4. Autorizações LGPD
 *
 * Integrado com:
 * - React Hook Form para gerenciamento de estado
 * - Zod para validação de schemas
 * - Supabase para persistência
 * - ViaCEP para busca de endereço
 */

import React, { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

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
  schema: any // Zod schema para validação do step
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
  onSubmit: (data: CandidatoFormData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<CandidatoFormData>
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function CadastroMultiStepForm({
  onSubmit,
  onCancel,
  initialData,
}: CadastroMultiStepFormProps) {
  // State do step atual
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<FormStep[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State para controlar submissão multi-etapas
  const [submissionStages, setSubmissionStages] = useState<LoadingStage[]>([])
  const [showLoadingDialog, setShowLoadingDialog] = useState(false)

  // Toast hook
  const toast = useFormToast()

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
        methods.setError(`${currentStep.id}.${field}` as any, {
          message: (messages as string[])[0],
        })
      })

      toast.messages.validationError()
      return false
    }

    // Marcar step como completado
    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps([...completedSteps, currentStep.id])
    }

    return true
  }

  /**
   * Avança para o próximo step
   */
  const handleNext = async () => {
    const isValid = await validateCurrentStep()

    if (isValid && !isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (isValid && isLastStep) {
      // Último step - fazer submit do formulário
      await handleFormSubmit()
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
   * Submit final do formulário
   */
  const handleFormSubmit = async () => {
    setIsSubmitting(true)

    try {
      const formData = methods.getValues()

      // Validação final com o schema completo
      const result = candidatoFormSchema.safeParse(formData)

      if (!result.success) {
        toast.error('Há erros no formulário. Por favor, revise todos os campos.')
        setIsSubmitting(false)
        return
      }

      // Inicializar stages do processo
      const stages: LoadingStage[] = [
        { id: 'auth', label: 'Criando conta de acesso...', status: 'pending' },
        { id: 'candidatos', label: 'Salvando dados do candidato...', status: 'pending' },
        { id: 'enderecos', label: 'Salvando endereço...', status: 'pending' },
        { id: 'disponibilidade', label: 'Salvando disponibilidade...', status: 'pending' },
        { id: 'autorizacoes', label: 'Salvando autorizações...', status: 'pending' },
        { id: 'n8n', label: 'Notificando sistema...', status: 'pending' },
      ]

      setSubmissionStages(stages)
      setShowLoadingDialog(true)

      // Simular progresso enquanto onSubmit executa
      // Nota: Em produção, o onSubmit deveria reportar progresso real via callbacks
      const stageIds = stages.map((s) => s.id)
      let currentStageIndex = 0

      // Executar onSubmit com progresso simulado
      const submitPromise = onSubmit(result.data)

      // Simular progresso (atualizar cada 400ms)
      const progressInterval = setInterval(() => {
        if (currentStageIndex < stageIds.length) {
          setSubmissionStages((prev) =>
            prev.map((stage, idx) => ({
              ...stage,
              status:
                idx < currentStageIndex ? 'success' : idx === currentStageIndex ? 'loading' : 'pending',
            }))
          )
          currentStageIndex++
        }
      }, 400)

      // Aguardar conclusão do submit
      await submitPromise

      // Limpar intervalo de progresso
      clearInterval(progressInterval)

      // Marcar todos os stages como sucesso
      setSubmissionStages((prev) => prev.map((stage) => ({ ...stage, status: 'success' })))

      toast.success('Cadastro realizado com sucesso!')

      // Fechar dialog após delay para mostrar sucesso completo
      setTimeout(() => {
        setShowLoadingDialog(false)
      }, 1500)
    } catch (error) {
      // Log detalhado do erro
      console.error('[FORM] Erro ao enviar formulário:', error)
      
      // Log adicional para erros específicos
      if (error instanceof Error) {
        console.error('Tipo do erro:', error.constructor.name)
        console.error('Mensagem:', error.message)
        console.error('Stack:', error.stack)
        
        // Se for CadastroError, logar detalhes adicionais
        if ('code' in error && 'table' in error) {
          console.error('Código do erro:', (error as any).code)
          console.error('Tabela afetada:', (error as any).table)
          console.error('Erro original:', (error as any).originalError)
        }
      }

      // Determinar mensagem de erro específica
      let errorMessage = 'Erro ao realizar cadastro. Por favor, tente novamente.'
      let errorDescription = ''

      if (error instanceof Error) {
        // Erros de autenticação
        if (error.message.includes('auth') || error.message.includes('usuário') || error.message.includes('autenticação')) {
          errorMessage = 'Erro ao criar conta de acesso'
          errorDescription = 'Não foi possível criar sua conta. Verifique se o email já está cadastrado.'
        }
        // Erros de inserção no banco
        else if (error.message.includes('inserir') || error.message.includes('banco de dados')) {
          errorMessage = 'Erro ao salvar dados'
          errorDescription = 'Não foi possível salvar seus dados. Por favor, tente novamente.'
        }
        // Erros de rollback
        else if (error.message.includes('rollback') || error.message.includes('reverter')) {
          errorMessage = 'Erro ao processar cadastro'
          errorDescription = 'Ocorreu um problema durante o cadastro. Seus dados podem ter sido parcialmente salvos. Entre em contato com o suporte.'
        }
        // Erros de validação
        else if (error.message.includes('validação') || error.message.includes('inválido')) {
          errorMessage = 'Dados inválidos'
          errorDescription = error.message
        }
        // Erros de rede
        else if (error.message.includes('rede') || error.message.includes('conexão') || error.message.includes('network')) {
          errorMessage = 'Erro de conexão'
          errorDescription = 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'
        }
      }

      // Marcar stage atual como erro com mensagem específica
      setSubmissionStages((prev) =>
        prev.map((stage) =>
          stage.status === 'loading'
            ? { 
                ...stage, 
                status: 'error', 
                errorMessage: errorDescription || 'Falha ao processar esta etapa' 
              }
            : stage
        )
      )

      toast.error(errorMessage, errorDescription, {
        duration: 5000,
      })

      // Fechar dialog após delay
      setTimeout(() => {
        setShowLoadingDialog(false)
      }, 3000)
    } finally {
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
                  <p className="text-xs font-medium text-white">
                    {step.title}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Current Step Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 sm:p-6 md:p-8">
          {/* Step Header */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
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

          {/* Botão Próximo / Finalizar */}
          <Button
            type="button"
            onClick={handleNext}
            isLoading={isSubmitting}
            loadingText={isLastStep ? 'Finalizando cadastro...' : 'Validando...'}
            className="w-full sm:w-auto bg-[#00109E] hover:bg-[#00109E]/90 text-white"
          >
            {isLastStep ? (
              <>
                Finalizar Cadastro
                <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Loading Progress Dialog */}
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
