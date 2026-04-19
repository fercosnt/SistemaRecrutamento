/**
 * Error Handling Service
 *
 * Serviço centralizado para tratamento de erros do fluxo de recuperação de senha.
 * Fornece mensagens amigáveis e logging consistente.
 *
 * @module services/errorHandlingService
 */

/**
 * Tipos de erro conhecidos
 */
export type ErrorType =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'SESSION_EXPIRED'
  | 'INVALID_TOKEN'
  | 'WEAK_PASSWORD'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EMAIL_NOT_SENT'
  | 'SUPABASE_ERROR'
  | 'N8N_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Informações sobre o erro processado
 */
export interface ProcessedError {
  /**
   * Tipo do erro
   */
  type: ErrorType;

  /**
   * Título do erro (para toast/modal)
   */
  title: string;

  /**
   * Descrição detalhada (amigável para o usuário)
   */
  description: string;

  /**
   * Se o erro é recuperável (usuário pode tentar novamente)
   */
  isRecoverable: boolean;

  /**
   * Ação sugerida para o usuário
   */
  suggestedAction?: string;

  /**
   * Mensagem técnica original (para logging)
   */
  technicalMessage: string;
}

/**
 * Mensagens de erro amigáveis mapeadas por tipo
 */
const ERROR_MESSAGES: Record<
  ErrorType,
  {
    title: string;
    description: string;
    isRecoverable: boolean;
    suggestedAction?: string;
  }
> = {
  NETWORK_ERROR: {
    title: 'Erro de Conexão',
    description:
      'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
    isRecoverable: true,
    suggestedAction: 'Tente novamente em alguns instantes',
  },
  TIMEOUT_ERROR: {
    title: 'Tempo Esgotado',
    description:
      'A operação demorou mais do que o esperado. O servidor pode estar temporariamente indisponível.',
    isRecoverable: true,
    suggestedAction: 'Aguarde alguns minutos e tente novamente',
  },
  SESSION_EXPIRED: {
    title: 'Sessão Expirada',
    description:
      'Sua sessão de recuperação expirou por motivos de segurança. Links de recuperação expiram em 24 horas.',
    isRecoverable: true,
    suggestedAction: 'Solicite um novo link de recuperação',
  },
  INVALID_TOKEN: {
    title: 'Link Inválido',
    description:
      'Este link de recuperação não é válido ou já foi utilizado. Cada link só pode ser usado uma vez.',
    isRecoverable: true,
    suggestedAction: 'Solicite um novo link de recuperação',
  },
  WEAK_PASSWORD: {
    title: 'Senha Muito Fraca',
    description:
      'A senha escolhida não atende aos requisitos mínimos de segurança. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e símbolos.',
    isRecoverable: true,
    suggestedAction: 'Escolha uma senha mais forte',
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Muitas Tentativas',
    description:
      'Você atingiu o limite de tentativas por hora. Esta restrição protege sua conta contra acessos não autorizados.',
    isRecoverable: true,
    suggestedAction: 'Aguarde alguns minutos antes de tentar novamente',
  },
  EMAIL_NOT_SENT: {
    title: 'Email Não Enviado',
    description:
      'Não foi possível enviar o email de confirmação, mas sua senha foi alterada com sucesso.',
    isRecoverable: false,
    suggestedAction: 'Você já pode fazer login com a nova senha',
  },
  SUPABASE_ERROR: {
    title: 'Erro no Servidor',
    description:
      'Ocorreu um erro temporário em nossos servidores. Nossa equipe foi notificada.',
    isRecoverable: true,
    suggestedAction: 'Tente novamente em alguns minutos',
  },
  N8N_ERROR: {
    title: 'Erro no Envio de Email',
    description:
      'Não foi possível enviar o email de confirmação neste momento. Sua senha foi alterada normalmente.',
    isRecoverable: false,
    suggestedAction: 'Você pode fazer login com a nova senha',
  },
  UNKNOWN_ERROR: {
    title: 'Erro Inesperado',
    description:
      'Ocorreu um erro inesperado. Se o problema persistir, entre em contato com o suporte.',
    isRecoverable: true,
    suggestedAction: 'Tente novamente ou contate o suporte',
  },
};

/**
 * Detecta o tipo de erro baseado na mensagem/código
 *
 * @param error - Erro original
 * @returns Tipo de erro identificado
 */
function detectErrorType(error: any): ErrorType {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch failed') ||
    errorCode === 'NETWORK_ERROR'
  ) {
    return 'NETWORK_ERROR';
  }

  // Timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted') ||
    errorCode === 'TIMEOUT_ERROR'
  ) {
    return 'TIMEOUT_ERROR';
  }

  // Session/token errors
  if (
    errorMessage.includes('session_not_found') ||
    errorMessage.includes('invalid_grant') ||
    errorMessage.includes('token') ||
    errorMessage.includes('expired')
  ) {
    if (errorMessage.includes('expired')) {
      return 'SESSION_EXPIRED';
    }
    return 'INVALID_TOKEN';
  }

  // Password errors
  if (errorMessage.includes('weak_password') || errorMessage.includes('password')) {
    return 'WEAK_PASSWORD';
  }

  // Rate limit errors
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many') ||
    errorCode === 'RATE_LIMIT_EXCEEDED'
  ) {
    return 'RATE_LIMIT_EXCEEDED';
  }

  // N8N errors
  if (errorCode === 'N8N_ERROR' || errorMessage.includes('n8n')) {
    return 'N8N_ERROR';
  }

  // Supabase errors
  if (errorMessage.includes('supabase') || errorCode?.startsWith('PGRST')) {
    return 'SUPABASE_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Processa um erro e retorna informações formatadas
 *
 * @param error - Erro original (Error, string, ou qualquer objeto)
 * @param context - Contexto onde o erro ocorreu (para logging)
 * @returns Erro processado com mensagens amigáveis
 *
 * @example
 * ```typescript
 * try {
 *   await supabase.auth.updateUser({ password: newPassword });
 * } catch (error) {
 *   const processedError = processError(error, 'RedefinirSenha');
 *   toast.error(processedError.title, {
 *     description: processedError.description,
 *   });
 * }
 * ```
 */
export function processError(error: any, context: string = 'Unknown'): ProcessedError {
  // Log técnico para debugging
  console.error(`[${context}] Error:`, error);

  const errorType = detectErrorType(error);
  const errorInfo = ERROR_MESSAGES[errorType];

  const technicalMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

  return {
    type: errorType,
    title: errorInfo.title,
    description: errorInfo.description,
    isRecoverable: errorInfo.isRecoverable,
    suggestedAction: errorInfo.suggestedAction,
    technicalMessage,
  };
}

/**
 * Verifica se um erro é de rede/temporário (deve fazer retry)
 *
 * @param error - Erro a verificar
 * @returns true se for erro temporário
 */
export function isTransientError(error: any): boolean {
  const errorType = detectErrorType(error);
  return (
    errorType === 'NETWORK_ERROR' ||
    errorType === 'TIMEOUT_ERROR' ||
    errorType === 'SUPABASE_ERROR'
  );
}

/**
 * Verifica se um erro é de autenticação/sessão
 *
 * @param error - Erro a verificar
 * @returns true se for erro de autenticação
 */
export function isAuthError(error: any): boolean {
  const errorType = detectErrorType(error);
  return errorType === 'SESSION_EXPIRED' || errorType === 'INVALID_TOKEN';
}

/**
 * Verifica se um erro é de validação de senha
 *
 * @param error - Erro a verificar
 * @returns true se for erro de senha fraca
 */
export function isPasswordError(error: any): boolean {
  const errorType = detectErrorType(error);
  return errorType === 'WEAK_PASSWORD';
}

/**
 * Formata erro para logging no banco de dados
 *
 * @param error - Erro original
 * @param maxLength - Tamanho máximo da mensagem (default: 500)
 * @returns Mensagem de erro truncada e sanitizada
 */
export function formatErrorForLogging(error: any, maxLength: number = 500): string {
  const processedError = processError(error);

  let message = processedError.technicalMessage;

  // Sanitizar dados sensíveis
  message = message.replace(/password[:\s=]+[^\s,}]*/gi, 'password: [REDACTED]');
  message = message.replace(/token[:\s=]+[^\s,}]*/gi, 'token: [REDACTED]');
  message = message.replace(/email[:\s=]+[^\s,}@]*@[^\s,}]*/gi, 'email: [REDACTED]');

  // Truncar se necessário
  if (message.length > maxLength) {
    message = message.substring(0, maxLength - 3) + '...';
  }

  return `[${processedError.type}] ${message}`;
}

/**
 * Cria uma mensagem de erro genérica (anti-enumeração)
 *
 * Útil para situações onde não queremos revelar informações ao usuário
 * (ex: se email existe ou não no sistema)
 */
export function createGenericSuccessMessage(): ProcessedError {
  return {
    type: 'UNKNOWN_ERROR',
    title: 'Solicitação Processada',
    description:
      'Se o email informado estiver cadastrado, você receberá as instruções de recuperação.',
    isRecoverable: false,
    technicalMessage: 'Generic success message (anti-enumeration)',
  };
}
