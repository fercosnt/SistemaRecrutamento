/**
 * Hook para verificação de duplicatas (CPF/Email)
 *
 * Features:
 * - Verifica duplicatas no banco com debounce
 * - Loading states independentes por campo
 * - Error handling
 * - Callbacks de sucesso/erro
 * - Verificação manual ou automática
 *
 * @module useDuplicateCheck
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  checkCPFDuplicate,
  checkEmailDuplicate,
  DuplicateCheckError,
  isValidCPFFormat,
  isValidEmailFormat,
} from '../services/duplicateCheckService'
import type { DuplicateCheckResult, DuplicateCheckField } from '../services/duplicateCheckService'

/**
 * Configurações do hook
 */
interface UseDuplicateCheckOptions {
  /**
   * Tempo de debounce em milissegundos
   * @default 800
   */
  debounceMs?: number

  /**
   * Callback executado quando duplicata é encontrada
   */
  onDuplicate?: (result: DuplicateCheckResult) => void

  /**
   * Callback executado quando valor é único (não duplicado)
   */
  onUnique?: (result: DuplicateCheckResult) => void

  /**
   * Callback executado quando ocorre erro
   */
  onError?: (error: DuplicateCheckError) => void

  /**
   * Se deve buscar automaticamente quando valor for válido
   * @default true
   */
  autoCheck?: boolean

  /**
   * Campo a ser verificado
   */
  field: DuplicateCheckField
}

/**
 * Estado do hook
 */
interface UseDuplicateCheckState {
  /**
   * Resultado da verificação
   */
  result: DuplicateCheckResult | null

  /**
   * Se está fazendo verificação
   */
  loading: boolean

  /**
   * Erro ocorrido durante verificação
   */
  error: DuplicateCheckError | null

  /**
   * Se o valor é duplicado
   */
  isDuplicate: boolean

  /**
   * Função para verificar manualmente
   */
  check: (value: string) => Promise<void>

  /**
   * Função para limpar estado
   */
  reset: () => void
}

/**
 * Hook para verificar duplicatas de CPF ou Email com debounce
 *
 * @param value - Valor a ser verificado (CPF ou Email)
 * @param options - Opções de configuração
 * @returns Estado e funções do hook
 *
 * @example
 * // Verificar CPF
 * const { isDuplicate, loading, error } = useDuplicateCheck(cpf, {
 *   field: 'cpf',
 *   onDuplicate: (result) => {
 *     console.log('CPF já cadastrado:', result.existingCandidate?.nome_completo)
 *   }
 * })
 *
 * @example
 * // Verificar Email
 * const { isDuplicate, loading } = useDuplicateCheck(email, {
 *   field: 'email',
 *   debounceMs: 1000
 * })
 */
export function useDuplicateCheck(
  value: string,
  options: UseDuplicateCheckOptions
): UseDuplicateCheckState {
  const {
    debounceMs = 800,
    onDuplicate,
    onUnique,
    onError,
    autoCheck = true,
    field,
  } = options

  // State
  const [result, setResult] = useState<DuplicateCheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<DuplicateCheckError | null>(null)

  // Refs para evitar race conditions e re-verificações
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckedValueRef = useRef<string | null>(null)

  /**
   * Valida se o valor tem formato válido para verificação
   */
  const isValidFormat = useCallback(
    (valueToCheck: string): boolean => {
      if (!valueToCheck || valueToCheck.trim().length === 0) {
        return false
      }

      if (field === 'cpf') {
        return isValidCPFFormat(valueToCheck)
      }

      if (field === 'email') {
        return isValidEmailFormat(valueToCheck)
      }

      return false
    },
    [field]
  )

  /**
   * Função para verificar duplicata
   */
  const check = useCallback(
    async (valueToCheck: string) => {
      // Cancelar verificação anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Limpar erro anterior
      setError(null)

      // Validar formato antes de verificar
      if (!isValidFormat(valueToCheck)) {
        // Não fazer nada se valor estiver incompleto
        return
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController()

      try {
        setLoading(true)

        // Chamar serviço apropriado baseado no campo
        let checkResult: DuplicateCheckResult

        if (field === 'cpf') {
          checkResult = await checkCPFDuplicate(valueToCheck)
        } else {
          checkResult = await checkEmailDuplicate(valueToCheck)
        }

        // Verificar se não foi cancelado
        if (!abortControllerRef.current.signal.aborted) {
          setResult(checkResult)
          setError(null)

          // Chamar callback apropriado
          if (checkResult.isDuplicate && onDuplicate) {
            onDuplicate(checkResult)
          } else if (!checkResult.isDuplicate && onUnique) {
            onUnique(checkResult)
          }
        }
      } catch (err) {
        // Verificar se não foi cancelado
        if (!abortControllerRef.current.signal.aborted) {
          const duplicateError =
            err instanceof DuplicateCheckError
              ? err
              : new DuplicateCheckError(
                  'Erro desconhecido ao verificar duplicata',
                  'NETWORK_ERROR',
                  field
                )

          setError(duplicateError)
          setResult(null)

          // Chamar callback de erro
          if (onError) {
            onError(duplicateError)
          }
        }
      } finally {
        // Verificar se não foi cancelado antes de limpar loading
        if (!abortControllerRef.current.signal.aborted) {
          setLoading(false)
        }
      }
    },
    [field, isValidFormat, onDuplicate, onUnique, onError]
  )

  /**
   * Função para limpar estado
   */
  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)

    // Cancelar verificação pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Limpar timer de debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Limpar cache de último valor verificado
    lastCheckedValueRef.current = null
  }, [])

  /**
   * Effect para verificação automática com debounce
   */
  useEffect(() => {
    // Se autoCheck está desabilitado, não fazer nada
    if (!autoCheck) {
      return
    }

    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Se valor não é válido, limpar dados e não verificar
    if (!isValidFormat(value)) {
      // Limpar dados se valor foi apagado
      if (value.length === 0) {
        reset()
        lastCheckedValueRef.current = null
      }
      return
    }

    // ✅ CACHE: Não verificar se o valor já foi verificado recentemente
    if (lastCheckedValueRef.current === value) {
      return
    }

    // Criar novo timer de debounce
    debounceTimerRef.current = setTimeout(() => {
      lastCheckedValueRef.current = value
      check(value)
    }, debounceMs)

    // Cleanup: cancelar timer ao desmontar ou quando valor mudar
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value, autoCheck, debounceMs, isValidFormat, check, reset])

  /**
   * Cleanup ao desmontar componente
   */
  useEffect(() => {
    return () => {
      // Cancelar qualquer verificação pendente
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Limpar timer de debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    result,
    loading,
    error,
    isDuplicate: result?.isDuplicate ?? false,
    check,
    reset,
  }
}
