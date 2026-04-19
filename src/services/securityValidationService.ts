/**
 * Security Validation Service
 *
 * Serviço centralizado para validações de segurança do sistema.
 * Implementa proteções contra ataques comuns e valida inputs.
 *
 * @module services/securityValidationService
 */

/**
 * Resultado da validação de senha
 */
export interface PasswordValidationResult {
  /**
   * Se a senha é válida
   */
  isValid: boolean;

  /**
   * Score de força (0-5)
   */
  strength: number;

  /**
   * Mensagens de erro (se houver)
   */
  errors: string[];

  /**
   * Avisos de segurança (não bloqueiam, mas alertam)
   */
  warnings: string[];

  /**
   * Requisitos atendidos
   */
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * Lista de senhas comuns/fracas (top 100 mais usadas)
 * Fonte: https://github.com/danielmiessler/SecLists
 */
const COMMON_PASSWORDS = [
  '123456',
  'password',
  '123456789',
  '12345678',
  '12345',
  '1234567',
  'password1',
  '123123',
  '1234567890',
  'qwerty',
  'abc123',
  '111111',
  'monkey',
  'dragon',
  'master',
  'letmein',
  'login',
  'princess',
  'qwertyuiop',
  'solo',
  'passw0rd',
  'starwars',
  'beauty',
  'smile',
  'beautysmile',
];

/**
 * Padrões sequenciais comuns
 */
const SEQUENTIAL_PATTERNS = [
  /012/,
  /123/,
  /234/,
  /345/,
  /456/,
  /567/,
  /678/,
  /789/,
  /abc/i,
  /bcd/i,
  /cde/i,
  /def/i,
  /qwe/i,
  /asd/i,
  /zxc/i,
];

/**
 * Padrões de repetição
 */
const REPETITION_PATTERNS = [
  /(.)\1{2,}/, // 3+ caracteres iguais seguidos (aaa, 111)
  /(\w{2,})\1/, // Palavras repetidas (abab, 1212)
];

/**
 * Valida força e segurança de uma senha
 *
 * Requisitos obrigatórios:
 * - Mínimo 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 *
 * Validações adicionais:
 * - Não pode ser senha comum (lista de senhas fracas)
 * - Não pode ter padrões sequenciais óbvios
 * - Não pode ter muitas repetições
 *
 * @param password - Senha a validar
 * @param userEmail - Email do usuário (opcional, para verificar similaridade)
 * @returns Resultado da validação com score e mensagens
 *
 * @example
 * ```typescript
 * const result = validatePassword('MyP@ssw0rd123', 'user@example.com');
 * if (result.isValid) {
 *   console.log(`Senha válida com força ${result.strength}/5`);
 * } else {
 *   console.error('Erros:', result.errors);
 * }
 * ```
 */
export function validatePassword(
  password: string,
  userEmail?: string
): PasswordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Requisitos básicos
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password),
  };

  // Verificar requisitos obrigatórios
  if (!requirements.minLength) {
    errors.push('A senha deve ter pelo menos 8 caracteres');
  }
  if (!requirements.hasUpperCase) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }
  if (!requirements.hasLowerCase) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }
  if (!requirements.hasNumber) {
    errors.push('A senha deve conter pelo menos um número');
  }
  if (!requirements.hasSpecialChar) {
    errors.push('A senha deve conter pelo menos um caractere especial (!@#$%^&*...)');
  }

  // Calcular score de força (0-5)
  let strength = Object.values(requirements).filter(Boolean).length;

  // Validações de segurança adicionais
  const lowerPassword = password.toLowerCase();

  // 1. Verificar se é senha comum
  if (COMMON_PASSWORDS.some((common) => lowerPassword.includes(common))) {
    errors.push('Esta senha é muito comum e insegura. Escolha uma senha mais única.');
    strength = Math.max(0, strength - 2);
  }

  // 2. Verificar padrões sequenciais
  if (SEQUENTIAL_PATTERNS.some((pattern) => pattern.test(password))) {
    warnings.push('A senha contém sequências previsíveis (ex: 123, abc)');
    strength = Math.max(0, strength - 1);
  }

  // 3. Verificar repetições excessivas
  if (REPETITION_PATTERNS.some((pattern) => pattern.test(password))) {
    warnings.push('A senha contém muitas repetições (ex: aaa, 1212)');
    strength = Math.max(0, strength - 1);
  }

  // 4. Verificar similaridade com email (se fornecido)
  if (userEmail) {
    const emailUsername = userEmail.split('@')[0].toLowerCase();
    if (lowerPassword.includes(emailUsername) && emailUsername.length > 3) {
      warnings.push('A senha não deve conter seu email ou nome de usuário');
      strength = Math.max(0, strength - 1);
    }
  }

  // 5. Verificar comprimento (bonus para senhas mais longas)
  if (password.length >= 12) {
    strength = Math.min(5, strength + 1);
  }
  if (password.length >= 16) {
    strength = Math.min(5, strength + 1);
  }

  // 6. Verificar se tem apenas letras e números (sem símbolos)
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password) && password.length < 12) {
    warnings.push('Considere adicionar caracteres especiais para maior segurança');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    strength,
    errors,
    warnings,
    requirements,
  };
}

/**
 * Sanitiza input para prevenir XSS
 *
 * Remove ou escapa caracteres perigosos que podem ser usados para XSS.
 *
 * @param input - String a sanitizar
 * @returns String sanitizada
 *
 * @example
 * ```typescript
 * const safe = sanitizeInput('<script>alert("xss")</script>');
 * // Retorna: '&lt;script&gt;alert("xss")&lt;/script&gt;'
 * ```
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Valida formato de email
 *
 * Usa regex mais restritivo que o padrão HTML5 para segurança.
 *
 * @param email - Email a validar
 * @returns true se válido
 *
 * @example
 * ```typescript
 * isValidEmail('user@example.com'); // true
 * isValidEmail('invalid'); // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  // Regex mais restritivo que HTML5 (previne bypasses)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Validações adicionais
  if (email.length > 254) {
    return false; // RFC 5321
  }

  const parts = email.split('@');
  if (parts[0].length > 64) {
    return false; // RFC 5321
  }

  return true;
}

/**
 * Detecta possíveis tentativas de SQL injection
 *
 * NOTA: Esta é apenas uma camada adicional de defesa.
 * A proteção primária DEVE ser parametrização de queries (prepared statements).
 *
 * @param input - Input a verificar
 * @returns true se detectar padrões suspeitos
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(-{2}|\/\*|\*\/)/g, // Comentários SQL
    /(;|\||&)/g, // Separadores de comando
    /('|"|`|\\)/g, // Quotes e escape
    /(\bOR\b.*=.*|AND.*=.*)/gi, // OR/AND injection
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Verifica se URL é segura (não maliciosa)
 *
 * @param url - URL a verificar
 * @returns true se URL parece segura
 */
export function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Apenas HTTPS (exceto localhost para dev)
    if (parsed.protocol !== 'https:' && !url.includes('localhost')) {
      return false;
    }

    // Prevenir URLs javascript:, data:, file:
    if (['javascript:', 'data:', 'file:', 'vbscript:'].some((p) => url.toLowerCase().startsWith(p))) {
      return false;
    }

    return true;
  } catch {
    return false; // URL malformada
  }
}

/**
 * Gera um token CSRF
 *
 * @returns Token CSRF aleatório
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida se input está dentro de limites seguros
 *
 * @param input - Input a validar
 * @param maxLength - Comprimento máximo permitido
 * @returns true se válido
 */
export function isWithinSafeLength(input: string, maxLength: number = 1000): boolean {
  return input.length <= maxLength && input.length > 0;
}

/**
 * Detecta tentativa de Path Traversal
 *
 * @param path - Caminho a verificar
 * @returns true se detectar padrões suspeitos
 */
export function detectPathTraversal(path: string): boolean {
  const dangerousPatterns = [
    /\.\./g, // ../ (directory traversal)
    /\.\.\\g/, // ..\ (Windows)
    /%2e%2e/gi, // URL encoded ../
    /\.\.%2f/gi, // Mixed encoding
  ];

  return dangerousPatterns.some((pattern) => pattern.test(path));
}

/**
 * Verifica se campo honeypot foi preenchido (bot detection)
 *
 * Honeypot: campo oculto que humanos não preenchem, mas bots sim.
 *
 * @param honeypotValue - Valor do campo honeypot
 * @returns true se detectar bot
 */
export function detectBot(honeypotValue: string): boolean {
  return honeypotValue.trim().length > 0;
}

/**
 * Valida que timestamp é razoável (não muito no passado ou futuro)
 *
 * Útil para prevenir replay attacks.
 *
 * @param timestamp - Timestamp a verificar
 * @param maxAgeMs - Idade máxima permitida em ms (default: 5 minutos)
 * @returns true se timestamp é válido
 */
export function isValidTimestamp(timestamp: number, maxAgeMs: number = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);

  // Não pode estar muito no passado ou futuro
  return diff <= maxAgeMs;
}

/**
 * Rate limiting básico por IP/fingerprint
 *
 * NOTA: Esta é uma implementação client-side. Para produção,
 * implemente rate limiting server-side.
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Verifica se identificador atingiu limite
   *
   * @param identifier - IP, fingerprint, ou email
   * @param maxAttempts - Máximo de tentativas
   * @param windowMs - Janela de tempo em ms
   * @returns true se excedeu limite
   */
  isLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];

    // Limpar tentativas antigas
    const recentAttempts = attempts.filter((timestamp) => now - timestamp < windowMs);

    return recentAttempts.length >= maxAttempts;
  }

  /**
   * Registra uma tentativa
   *
   * @param identifier - IP, fingerprint, ou email
   */
  recordAttempt(identifier: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    attempts.push(now);
    this.attempts.set(identifier, attempts);
  }

  /**
   * Limpa tentativas de um identificador
   *
   * @param identifier - IP, fingerprint, ou email
   */
  clear(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const globalRateLimiter = new RateLimiter();
