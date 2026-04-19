/**
 * Rate Limiting Service
 *
 * Serviço para implementar rate limiting client-side usando localStorage.
 * Previne abuso do sistema de recuperação de senha.
 *
 * Limitações:
 * - Máximo de 3 tentativas por email por hora
 * - Dados armazenados em localStorage
 * - Cleanup automático de tentativas antigas
 *
 * @module services/rateLimitService
 */

const STORAGE_KEY_PREFIX = 'password_recovery_attempts_';
const MAX_ATTEMPTS = 3;
const TIME_WINDOW = 60 * 60 * 1000; // 1 hora em milissegundos

interface AttemptRecord {
  email: string;
  timestamps: number[];
}

/**
 * Limpa tentativas antigas que estão fora da janela de tempo
 *
 * @param timestamps - Array de timestamps de tentativas
 * @returns Array filtrado apenas com tentativas dentro da janela
 */
function cleanOldAttempts(timestamps: number[]): number[] {
  const now = Date.now();
  return timestamps.filter((timestamp) => now - timestamp < TIME_WINDOW);
}

/**
 * Obtém o storage key para um email específico
 *
 * @param email - Email do usuário
 * @returns Chave do localStorage
 */
function getStorageKey(email: string): string {
  // Normalizar email para evitar bypass com maiúsculas/minúsculas
  const normalizedEmail = email.toLowerCase().trim();
  // Hash simples para não expor email no localStorage
  const hash = btoa(normalizedEmail);
  return `${STORAGE_KEY_PREFIX}${hash}`;
}

/**
 * Verifica se o email atingiu o limite de tentativas
 *
 * @param email - Email a verificar
 * @returns true se atingiu o limite, false caso contrário
 */
export function isRateLimited(email: string): boolean {
  try {
    const storageKey = getStorageKey(email);
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return false;
    }

    const record: AttemptRecord = JSON.parse(stored);
    const validAttempts = cleanOldAttempts(record.timestamps);

    return validAttempts.length >= MAX_ATTEMPTS;
  } catch (error) {
    console.error('Erro ao verificar rate limit:', error);
    return false; // Em caso de erro, permitir tentativa
  }
}

/**
 * Registra uma nova tentativa de recuperação de senha
 *
 * @param email - Email usado na tentativa
 */
export function recordAttempt(email: string): void {
  try {
    const storageKey = getStorageKey(email);
    const stored = localStorage.getItem(storageKey);
    const now = Date.now();

    let record: AttemptRecord;

    if (stored) {
      record = JSON.parse(stored);
      record.timestamps = cleanOldAttempts(record.timestamps);
      record.timestamps.push(now);
    } else {
      record = {
        email: email.toLowerCase().trim(),
        timestamps: [now],
      };
    }

    localStorage.setItem(storageKey, JSON.stringify(record));
  } catch (error) {
    console.error('Erro ao registrar tentativa:', error);
  }
}

/**
 * Obtém o tempo restante até poder tentar novamente (em minutos)
 *
 * @param email - Email a verificar
 * @returns Minutos restantes ou 0 se pode tentar
 */
export function getRemainingTime(email: string): number {
  try {
    const storageKey = getStorageKey(email);
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return 0;
    }

    const record: AttemptRecord = JSON.parse(stored);
    const validAttempts = cleanOldAttempts(record.timestamps);

    if (validAttempts.length < MAX_ATTEMPTS) {
      return 0;
    }

    // Pegar a tentativa mais antiga
    const oldestAttempt = Math.min(...validAttempts);
    const timeElapsed = Date.now() - oldestAttempt;
    const timeRemaining = TIME_WINDOW - timeElapsed;

    return Math.ceil(timeRemaining / (60 * 1000)); // Converter para minutos
  } catch (error) {
    console.error('Erro ao calcular tempo restante:', error);
    return 0;
  }
}

/**
 * Obtém o número de tentativas restantes
 *
 * @param email - Email a verificar
 * @returns Número de tentativas restantes
 */
export function getRemainingAttempts(email: string): number {
  try {
    const storageKey = getStorageKey(email);
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return MAX_ATTEMPTS;
    }

    const record: AttemptRecord = JSON.parse(stored);
    const validAttempts = cleanOldAttempts(record.timestamps);

    return Math.max(0, MAX_ATTEMPTS - validAttempts.length);
  } catch (error) {
    console.error('Erro ao calcular tentativas restantes:', error);
    return MAX_ATTEMPTS;
  }
}

/**
 * Limpa todas as tentativas de um email (para testes ou reset manual)
 *
 * @param email - Email a limpar
 */
export function clearAttempts(email: string): void {
  try {
    const storageKey = getStorageKey(email);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Erro ao limpar tentativas:', error);
  }
}
