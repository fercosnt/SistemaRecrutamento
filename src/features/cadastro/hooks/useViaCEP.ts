/**
 * Hook para integração com ViaCEP
 *
 * Features:
 * - Busca automática de endereço por CEP
 * - Debounce para evitar requisições excessivas
 * - Loading states
 * - Error handling
 * - Callback de sucesso para preencher formulário
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { buscarCEPComCache, ViaCEPError, isValidCEP } from '../services/viaCepService'
import type { ViaCEPResponse } from '../types'

/**
 * Configurações do hook
 */
interface UseViaCEPOptions {
  /**
   * Tempo de debounce em milissegundos
   * @default 500
   */
  debounceMs?: number

  /**
   * Callback executado quando endereço é encontrado
   */
  onSuccess?: (data: ViaCEPResponse) => void

  /**
   * Callback executado quando ocorre erro
   */
  onError?: (error: ViaCEPError) => void

  /**
   * Se deve buscar automaticamente quando CEP for válido
   * @default true
   */
  autoFetch?: boolean
}

/**
 * Estado do hook
 */
interface UseViaCEPState {
  /**
   * Dados do endereço retornados pela API
   */
  data: ViaCEPResponse | null

  /**
   * Se está fazendo requisição
   */
  loading: boolean

  /**
   * Erro ocorrido durante busca
   */
  error: ViaCEPError | null

  /**
   * Função para buscar CEP manualmente
   */
  buscar: (cep: string) => Promise<void>

  /**
   * Função para limpar estado
   */
  limpar: () => void
}

/**
 * Hook para buscar endereço por CEP com debounce
 *
 * @param cep - CEP a ser buscado
 * @param options - Opções de configuração
 * @returns Estado e funções do hook
 *
 * @example
 * const { data, loading, error } = useViaCEP(cep, {
 *   onSuccess: (data) => {
 *     setValue('logradouro', data.logradouro)
 *     setValue('bairro', data.bairro)
 *   }
 * })
 */
export function useViaCEP(
  cep: string,
  options: UseViaCEPOptions = {}
): UseViaCEPState {
  const {
    debounceMs = 500,
    onSuccess,
    onError,
    autoFetch = true,
  } = options

  // State
  const [data, setData] = useState<ViaCEPResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ViaCEPError | null>(null)

  // Refs para evitar race conditions
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * ⚠ OS CALLBACKS VIVEM EM REF, E ISSO NÃO É ESTILO — É CORREÇÃO DE DEFEITO.
   *
   * `onSuccess`/`onError` chegam como arrow inline do componente, então ganham
   * identidade NOVA a cada render. Enquanto estiveram nas deps de `buscar`
   * (useCallback), a cadeia era:
   *
   *   render → novo onSuccess → novo buscar → o useEffect de busca (que tem
   *   `buscar` nas deps) roda → reagenda o debounce → nova busca → onSuccess →
   *   o setValue lá dentro provoca render → recomeça.
   *
   * O sintoma que chegou ao operador em 2026-08-26: no passo de Endereço, o foco
   * voltava sozinho para o campo Número a cada ~600 ms, e quem desse Tab para o
   * Complemento via o texto entrar no Número. Antes disso o mesmo loop já tinha
   * aparecido como toast piscando — e na época foi contornado com uma guarda no
   * toast (`lastToastedCepRef`), deixando a raiz viva. Ela voltou com outra roupa.
   *
   * Guardar em ref mantém os callbacks SEMPRE atuais na chamada sem os colocar nas
   * dependências — o efeito passa a rodar por mudança de `cep`, que é o que ele
   * deveria observar desde o início.
   */
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
  })

  /**
   * Função para buscar CEP
   */
  const buscar = useCallback(
    async (cepToBuscar: string) => {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Limpar estado de erro
      setError(null)

      // Validar CEP antes de buscar
      if (!isValidCEP(cepToBuscar)) {
        // Não fazer nada se CEP estiver incompleto
        // Só mostrar erro se tentarem buscar manualmente
        return
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController()

      try {
        setLoading(true)

        // Buscar CEP na API
        const resultado = await buscarCEPComCache(cepToBuscar)

        // Verificar se não foi cancelado
        if (!abortControllerRef.current.signal.aborted) {
          setData(resultado)
          setError(null)

          // Chamar callback de sucesso
          if (onSuccessRef.current) {
            onSuccessRef.current(resultado)
          }
        }
      } catch (err) {
        // Verificar se não foi cancelado
        if (!abortControllerRef.current.signal.aborted) {
          const viaCepError =
            err instanceof ViaCEPError
              ? err
              : new ViaCEPError('Erro desconhecido ao buscar CEP', 'NETWORK_ERROR')

          setError(viaCepError)
          setData(null)

          // Chamar callback de erro
          if (onErrorRef.current) {
            onErrorRef.current(viaCepError)
          }
        }
      } finally {
        // Verificar se não foi cancelado antes de limpar loading
        if (!abortControllerRef.current.signal.aborted) {
          setLoading(false)
        }
      }
    },
    // Sem `onSuccess`/`onError` aqui de proposito — ver a nota dos refs acima.
    []
  )

  /**
   * Função para limpar estado
   */
  const limpar = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)

    // Cancelar requisição pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Limpar timer de debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }, [])

  /**
   * Effect para busca automática com debounce
   */
  useEffect(() => {
    // Se autoFetch está desabilitado, não fazer nada
    if (!autoFetch) {
      return
    }

    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Se CEP não é válido, limpar dados e não buscar
    if (!isValidCEP(cep)) {
      // Limpar dados se CEP foi apagado
      if (cep.length === 0) {
        limpar()
      }
      return
    }

    // Criar novo timer de debounce
    debounceTimerRef.current = setTimeout(() => {
      buscar(cep)
    }, debounceMs)

    // Cleanup: cancelar timer ao desmontar ou quando CEP mudar
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [cep, autoFetch, debounceMs, buscar, limpar])

  /**
   * Cleanup ao desmontar componente
   */
  useEffect(() => {
    return () => {
      // Cancelar qualquer requisição pendente
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
    data,
    loading,
    error,
    buscar,
    limpar,
  }
}
