/**
 * Error Boundary para capturar erros em componentes React
 *
 * Captura erros durante renderização, em métodos de ciclo de vida,
 * e em construtores de toda a árvore abaixo dele.
 *
 * Features:
 * - Fallback UI amigável quando ocorre erro
 * - Logging de erros para debugging
 * - Botão para tentar novamente (reset)
 * - Informações de erro em dev mode
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <CadastroMultiStepForm />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================
// TYPES
// ============================================

interface ErrorBoundaryProps {
  /**
   * Componentes filhos a serem protegidos
   */
  children: ReactNode

  /**
   * Callback quando erro é capturado (opcional)
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void

  /**
   * Componente de fallback customizado (opcional)
   */
  fallback?: (error: Error, reset: () => void) => ReactNode

  /**
   * Título customizado para a mensagem de erro
   * @default "Ops! Algo deu errado"
   */
  fallbackTitle?: string

  /**
   * Mensagem customizada para o erro
   * @default "Ocorreu um erro inesperado. Por favor, tente novamente."
   */
  fallbackMessage?: string
}

interface ErrorBoundaryState {
  /**
   * Se um erro foi capturado
   */
  hasError: boolean

  /**
   * O erro capturado
   */
  error: Error | null

  /**
   * Informações adicionais sobre o erro
   */
  errorInfo: ErrorInfo | null
}

// ============================================
// COMPONENT
// ============================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  /**
   * Atualiza estado quando erro é capturado
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Lifecycle method chamado quando erro é capturado
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Atualizar estado com informações do erro
    this.setState({
      error,
      errorInfo,
    })

    // Log do erro (em produção, enviar para serviço de logging)
    console.error('ErrorBoundary capturou erro:', error)
    console.error('Component stack:', errorInfo.componentStack)

    // Chamar callback se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * Reseta o estado do erro
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  /**
   * Renderiza fallback ou componentes filhos
   */
  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, fallbackTitle, fallbackMessage } = this.props

    // Se há erro, mostrar fallback
    if (hasError && error) {
      // Usar fallback customizado se fornecido
      if (fallback) {
        return fallback(error, this.resetError)
      }

      // Fallback padrão
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00109E] to-[#000B6E] p-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-lg p-8 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-white">
                {fallbackTitle || 'Ops! Algo deu errado'}
              </h1>
              <p className="text-white/80">
                {fallbackMessage ||
                  'Ocorreu um erro inesperado. Por favor, tente novamente.'}
              </p>
            </div>

            {/* Error details (apenas em dev) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
                <p className="text-xs font-mono text-red-300 font-semibold">
                  Erro (Dev Mode):
                </p>
                <p className="text-xs font-mono text-white/70 break-words">
                  {error.toString()}
                </p>
                {errorInfo && (
                  <details className="text-xs font-mono text-white/50">
                    <summary className="cursor-pointer hover:text-white/70">
                      Stack trace
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.resetError}
                className="w-full bg-white text-[#00109E] hover:bg-white/90"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Recarregar Página
              </Button>
            </div>

            {/* Support message */}
            <p className="text-xs text-white/60 text-center">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      )
    }

    // Sem erro, renderizar normalmente
    return children
  }
}
