/**
 * Formulário Multi-Step de Cadastro de Candidatos
 *
 * Componente principal que gerencia o formulário de cadastro em 5 etapas:
 * 1. Dados Pessoais
 * 2. Endereço
 * 3. Dados Profissionais
 * 4. Disponibilidade
 * 5. Autorizações LGPD
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
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

import {
  candidatoFormSchema,
  dadosPessoaisSchema,
  enderecoSchema,
  dadosProfissionaisSchema,
  disponibilidadeSchema,
  autorizacoesSchema,
  type CandidatoFormData,
} from '../schemas'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/components/ui/utils'

// Import dos componentes de cada step (criaremos a seguir)
import { DadosPessoaisStep } from './steps/DadosPessoaisStep'
import { EnderecoStep } from './steps/EnderecoStep'
import { DadosProfissionaisStep } from './steps/DadosProfissionaisStep'
import { DisponibilidadeStep } from './steps/DisponibilidadeStep'
import { AutorizacoesStep } from './steps/AutorizacoesStep'

// ============================================
// TYPES
// ============================================

type FormStep = 'dadosPessoais' | 'endereco' | 'dadosProfissionais' | 'disponibilidade' | 'autorizacoes'

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
    description: 'Informações básicas sobre você',
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
    id: 'dadosProfissionais',
    title: 'Dados Profissionais',
    description: 'Sua formação e experiência',
    schema: dadosProfissionaisSchema,
    component: DadosProfissionaisStep,
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
      dadosProfissionais: {
        experiencia_area: 'nenhuma',
        nivel_escolaridade: 'medio_completo',
        instituicao_ensino: null,
        curso: null,
        ano_conclusao: null,
        possui_cnh: false,
        categorias_cnh: [],
      },
      disponibilidade: {
        turno_preferido: 'integral',
        modelo_trabalho: 'presencial',
        disponibilidade_imediata: false,
        data_disponibilidade: null,
        aceita_viajar: false,
        aceita_mudanca: false,
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

      toast.error('Por favor, corrija os erros antes de continuar')
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

      // Chamar função de submit fornecida pelo componente pai
      await onSubmit(result.data)

      toast.success('Cadastro realizado com sucesso!')
    } catch (error) {
      console.error('Erro ao enviar formulário:', error)
      toast.error('Erro ao realizar cadastro. Por favor, tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <FormProvider {...methods}>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-white/90">
            <span>
              Etapa {currentStepIndex + 1} de {FORM_STEPS.length}
            </span>
            <span>{Math.round(progress)}% completo</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-between items-center">
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
                className={cn(
                  'flex flex-col items-center gap-2 flex-1',
                  'transition-opacity duration-200',
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
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    'border-2 transition-all duration-200',
                    {
                      'bg-white border-white text-[#00109E]': isCurrent,
                      'bg-green-500 border-green-500 text-white': isCompleted && !isCurrent,
                      'bg-white/20 border-white/30 text-white': !isCurrent && !isCompleted,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step title */}
                <div className="text-center hidden sm:block">
                  <p
                    className={cn('text-xs font-medium', {
                      'text-white': isCurrent,
                      'text-white/80': !isCurrent,
                    })}
                  >
                    {step.title}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Current Step Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 md:p-8">
          {/* Step Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {currentStep.title}
            </h2>
            <p className="text-white/80">{currentStep.description}</p>
          </div>

          {/* Step Form */}
          <currentStep.component />
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          {/* Botão Voltar / Cancelar */}
          <Button
            type="button"
            variant="outline"
            onClick={isFirstStep ? onCancel : handlePrevious}
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
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
            disabled={isSubmitting}
            className="bg-[#00109E] hover:bg-[#00109E]/90 text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </span>
            ) : isLastStep ? (
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
      </div>
    </FormProvider>
  )
}
