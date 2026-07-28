/**
 * Hook de toast centralizado para operações do formulário
 *
 * Fornece interface consistente para mostrar notificações de
 * sucesso, erro, info e loading durante operações assíncronas.
 *
 * Features:
 * - Mensagens padronizadas e amigáveis
 * - Ícones apropriados para cada tipo
 * - Promise-based loading toasts
 * - Auto-dismiss configurável
 * - Previne spam de toasts duplicados
 *
 * @example
 * ```tsx
 * const toast = useFormToast()
 *
 * // Success toast
 * toast.success('Cadastro realizado com sucesso!')
 *
 * // Error toast com detalhes
 * toast.error('Erro ao salvar dados', 'CPF inválido')
 *
 * // Loading toast que atualiza automaticamente
 * const promise = cadastrarCandidato(data)
 * toast.promise(promise, {
 *   loading: 'Salvando cadastro...',
 *   success: 'Cadastro salvo!',
 *   error: 'Erro ao salvar'
 * })
 * ```
 */

import { toast } from 'sonner'
import type { ExternalToast } from 'sonner'

// ============================================
// TYPES
// ============================================

export interface ToastOptions extends ExternalToast {
  /**
   * Duração do toast em milissegundos
   * @default 4000 (4 segundos)
   */
  duration?: number

  /**
   * Descrição adicional (subtítulo do toast)
   */
  description?: string

  /**
   * Callback quando toast é fechado
   */
  onDismiss?: () => void

  /**
   * Callback quando botão de ação é clicado
   */
  onAction?: () => void
}

export interface PromiseToastMessages<T = any> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: any) => string)
}

// ============================================
// HOOK
// ============================================

export function useFormToast() {
  /**
   * Toast de sucesso (verde com check icon)
   */
  const success = (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: 4000,
      ...options,
    })
  }

  /**
   * Toast de erro (vermelho com X icon)
   *
   * @param message - Mensagem principal do erro
   * @param details - Detalhes adicionais do erro (opcional)
   */
  const error = (message: string, details?: string, options?: ToastOptions) => {
    return toast.error(message, {
      description: details,
      duration: 6000, // Erros ficam mais tempo
      ...options,
    })
  }

  /**
   * Toast de informação (azul com info icon)
   */
  const info = (message: string, options?: ToastOptions) => {
    return toast.info(message, {
      duration: 4000,
      ...options,
    })
  }

  /**
   * Toast de aviso (amarelo com alert icon)
   */
  const warning = (message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      duration: 5000,
      ...options,
    })
  }

  /**
   * Toast baseado em Promise
   *
   * Mostra loading toast e atualiza automaticamente para
   * success ou error quando a promise resolve/rejects
   *
   * @example
   * ```tsx
   * const promise = fetch('/api/candidato')
   * toast.promise(promise, {
   *   loading: 'Carregando...',
   *   success: (data) => `Candidato ${data.nome} carregado!`,
   *   error: (err) => `Erro: ${err.message}`
   * })
   * ```
   */
  const promise = <T = any>(
    promise: Promise<T>,
    messages: PromiseToastMessages<T>,
    options?: ToastOptions
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      ...options,
    })
  }

  /**
   * Toast de loading manual (não baseado em promise)
   *
   * Útil quando você precisa controlar manualmente quando
   * o loading termina
   *
   * @returns ID do toast (para atualizar ou dismissar depois)
   *
   * @example
   * ```tsx
   * const toastId = toast.loading('Salvando...')
   * // ... async operation
   * toast.dismiss(toastId)
   * toast.success('Salvo!')
   * ```
   */
  const loading = (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      duration: Infinity, // Loading toast não dismissa sozinho
      ...options,
    })
  }

  /**
   * Dismissar toast específico ou todos
   *
   * @param toastId - ID do toast a dismissar (opcional)
   */
  const dismiss = (toastId?: string | number) => {
    return toast.dismiss(toastId)
  }

  /**
   * Mensagens pré-definidas para operações comuns
   */
  const messages = {
    // CEP
    cepFound: () => success('CEP encontrado! Endereço preenchido automaticamente'),
    cepNotFound: () => error('CEP não encontrado', 'Verifique se digitou corretamente'),
    cepInvalid: () =>
      error('CEP inválido', 'O CEP deve conter 8 dígitos (ex: 01310-100)'),
    cepError: () => error('Erro ao buscar CEP', 'Tente novamente em alguns instantes'),

    // Duplicate Check
    cpfAvailable: () => success('CPF disponível!'),
    cpfDuplicate: (nome: string) =>
      error('CPF já cadastrado', `Este CPF pertence a ${nome}`),
    emailAvailable: () => success('Email disponível!'),
    emailDuplicate: (nome: string) =>
      error('Email já cadastrado', `Este email pertence a ${nome}`),

    // Form Submission
    submitting: () => loading('Salvando cadastro...'),
    submitSuccess: () =>
      success('Cadastro realizado com sucesso!', {
        description: 'Você receberá um email de confirmação em breve',
      }),
    submitError: (details?: string) =>
      error('Erro ao salvar cadastro', details || 'Tente novamente mais tarde'),

    // Auth
    authCreating: () => loading('Criando sua conta...'),
    authSuccess: () => success('Conta criada com sucesso!'),
    authError: (details?: string) =>
      error('Erro ao criar conta', details || 'Verifique seus dados e tente novamente'),

    // Network
    networkError: () =>
      error('Erro de conexão', 'Verifique sua internet e tente novamente'),
    timeoutError: () => error('Tempo esgotado', 'A operação demorou demais. Tente novamente'),

    // Validation
    validationError: () =>
      warning('Verifique os campos', 'Alguns campos contêm erros ou estão vazios'),

    // General
    genericError: () => error('Ops! Algo deu errado', 'Tente novamente mais tarde'),
  }

  return {
    success,
    error,
    info,
    warning,
    promise,
    loading,
    dismiss,
    messages,
  }
}

// Export type for convenience
export type UseFormToast = ReturnType<typeof useFormToast>
