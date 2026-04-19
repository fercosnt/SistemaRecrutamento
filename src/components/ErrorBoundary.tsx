/**
 * Error Boundary Component
 *
 * Captura erros não tratados em componentes React e exibe UI de fallback.
 * Previne que a aplicação inteira quebre por erro em um componente.
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { GlassCard } from './ui/glass';
import { BackgroundImage } from './BackgroundImage';
import { BeautySmileLogo } from './BeautySmileLogo';

interface ErrorBoundaryProps {
  /**
   * Componentes filhos a serem renderizados
   */
  children: ReactNode;

  /**
   * Callback executado quando um erro é capturado
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;

  /**
   * UI customizada de fallback (opcional)
   */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary para capturar erros em componentes React
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <RedefinirSenhaPage />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Atualizar state para renderizar UI de fallback
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log do erro
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Atualizar state com informações do erro
    this.setState({
      error,
      errorInfo,
    });

    // Callback customizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    // Resetar state para tentar renderizar novamente
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    // Redirecionar para home
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Se fallback customizado fornecido, usar ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback padrão
      return (
        <BackgroundImage
          background="gradient"
          overlayColor="bg-black"
          overlayOpacity={15}
          className="min-h-screen"
        >
          <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <BeautySmileLogo
                  type="vertical"
                  variant="white"
                  size="lg"
                  className="drop-shadow-lg"
                />
              </div>

              {/* Card de Erro */}
              <GlassCard variant="white" blur="lg" className="p-8">
                <div className="text-center space-y-6">
                  {/* Ícone de Erro */}
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center backdrop-blur-md">
                      <AlertCircle size={48} className="text-red-300 drop-shadow-lg" />
                    </div>
                  </div>

                  {/* Título */}
                  <div className="space-y-3">
                    <h2 className="text-white drop-shadow-lg text-2xl font-bold">
                      Ops! Algo deu errado
                    </h2>
                    <p className="text-white/90 drop-shadow-md leading-relaxed">
                      Ocorreu um erro inesperado. Não se preocupe, seus dados estão seguros.
                    </p>
                  </div>

                  {/* Detalhes do Erro (apenas em desenvolvimento) */}
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm text-left">
                      <p className="text-white/70 drop-shadow-sm text-xs font-mono mb-2">
                        <strong>Erro:</strong>
                      </p>
                      <p className="text-white/60 drop-shadow-sm text-xs font-mono break-words">
                        {this.state.error.toString()}
                      </p>
                      {this.state.errorInfo && (
                        <>
                          <p className="text-white/70 drop-shadow-sm text-xs font-mono mt-3 mb-2">
                            <strong>Stack Trace:</strong>
                          </p>
                          <p className="text-white/60 drop-shadow-sm text-xs font-mono break-words max-h-40 overflow-y-auto">
                            {this.state.errorInfo.componentStack}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Informação para Usuário */}
                  <div className="bg-white/10 border border-white/20 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-white/80 drop-shadow-sm text-sm leading-relaxed">
                      💡 Tente recarregar a página ou volte para a página inicial.
                    </p>
                  </div>

                  {/* Botões de Ação */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={this.handleReset}
                      className="w-full bg-[#00109E] hover:bg-[#00109E]/90 text-white py-3 rounded-lg border border-[#00109E]/50 backdrop-blur-md transition-all duration-300 hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                      <RefreshCcw size={20} aria-hidden="true" />
                      <span>Tentar Novamente</span>
                    </button>

                    <button
                      type="button"
                      onClick={this.handleGoHome}
                      className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg border border-white/30 backdrop-blur-md transition-all duration-300 hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Home size={20} aria-hidden="true" />
                      <span>Voltar à Página Inicial</span>
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Suporte */}
              <div className="mt-6 text-center">
                <p className="text-white/70 drop-shadow-sm text-sm">
                  Precisa de ajuda?{' '}
                  <a
                    href="mailto:suporte@beautysmile.com.br"
                    className="text-white hover:text-white/90 underline transition-colors duration-200"
                  >
                    Contate o suporte
                  </a>
                </p>
              </div>
            </div>
          </div>
        </BackgroundImage>
      );
    }

    // Se não houver erro, renderizar filhos normalmente
    return this.props.children;
  }
}

/**
 * Hook para usar Error Boundary de forma funcional
 *
 * @param Component - Componente a ser envolvido pelo Error Boundary
 * @param onError - Callback executado quando erro é capturado
 * @returns Componente envolvido pelo Error Boundary
 *
 * @example
 * ```tsx
 * const SafeRedefinirSenhaPage = withErrorBoundary(
 *   RedefinirSenhaPage,
 *   (error, errorInfo) => {
 *     console.error('Error in RedefinirSenhaPage:', error);
 *   }
 * );
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
): React.FC<P> {
  return (props: P) => (
    <ErrorBoundary onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
}
