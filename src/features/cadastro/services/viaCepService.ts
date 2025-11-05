/**
 * Serviço de integração com ViaCEP API
 *
 * API Pública: https://viacep.com.br/
 * Documentação: https://viacep.com.br/
 *
 * Funcionalidades:
 * - Busca de endereço por CEP
 * - Validação de formato de CEP
 * - Tratamento de erros
 * - Cache de resultados (opcional)
 */

import type { ViaCEPResponse } from '../types'

/**
 * URL base da API ViaCEP
 */
const VIACEP_BASE_URL = 'https://viacep.com.br/ws'

/**
 * Timeout para requisições (5 segundos)
 */
const REQUEST_TIMEOUT = 5000

/**
 * Erros customizados do ViaCEP
 */
export class ViaCEPError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_CEP' | 'NOT_FOUND' | 'NETWORK_ERROR' | 'TIMEOUT'
  ) {
    super(message)
    this.name = 'ViaCEPError'
  }
}

/**
 * Limpa CEP removendo caracteres não numéricos
 *
 * @param cep - CEP com ou sem formatação
 * @returns CEP apenas com números
 *
 * @example
 * cleanCEP('12345-678') // '12345678'
 * cleanCEP('12345678') // '12345678'
 */
export function cleanCEP(cep: string): string {
  return cep.replace(/\D/g, '')
}

/**
 * Valida formato de CEP brasileiro
 *
 * @param cep - CEP a ser validado
 * @returns true se CEP é válido, false caso contrário
 *
 * @example
 * isValidCEP('12345-678') // true
 * isValidCEP('12345678') // true
 * isValidCEP('1234') // false
 */
export function isValidCEP(cep: string): boolean {
  const cleaned = cleanCEP(cep)
  return /^\d{8}$/.test(cleaned)
}

/**
 * Formata CEP para o padrão XXXXX-XXX
 *
 * @param cep - CEP sem formatação
 * @returns CEP formatado
 *
 * @example
 * formatCEP('12345678') // '12345-678'
 */
export function formatCEP(cep: string): string {
  const cleaned = cleanCEP(cep)
  if (cleaned.length !== 8) return cleaned
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
}

/**
 * Busca endereço por CEP na API ViaCEP
 *
 * @param cep - CEP a ser buscado (com ou sem formatação)
 * @returns Promise com dados do endereço
 * @throws {ViaCEPError} Se CEP for inválido, não encontrado ou houver erro de rede
 *
 * @example
 * const endereco = await buscarCEP('01310-100')
 * console.log(endereco.logradouro) // 'Avenida Paulista'
 */
export async function buscarCEP(cep: string): Promise<ViaCEPResponse> {
  // Validar formato do CEP
  if (!isValidCEP(cep)) {
    throw new ViaCEPError(
      'CEP inválido. O formato deve ser 00000-000 ou 00000000',
      'INVALID_CEP'
    )
  }

  const cleanedCEP = cleanCEP(cep)

  try {
    // Criar AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    // Fazer requisição para ViaCEP
    const response = await fetch(
      `${VIACEP_BASE_URL}/${cleanedCEP}/json/`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    clearTimeout(timeoutId)

    // Verificar se resposta foi bem sucedida
    if (!response.ok) {
      throw new ViaCEPError(
        `Erro ao buscar CEP: ${response.status} ${response.statusText}`,
        'NETWORK_ERROR'
      )
    }

    // Parse da resposta JSON
    const data: ViaCEPResponse = await response.json()

    // ViaCEP retorna { erro: true } quando CEP não existe
    if (data.erro) {
      throw new ViaCEPError(
        'CEP não encontrado. Verifique se digitou corretamente.',
        'NOT_FOUND'
      )
    }

    return data
  } catch (error) {
    // Tratar erro de timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ViaCEPError(
        'Tempo limite excedido ao buscar CEP. Verifique sua conexão.',
        'TIMEOUT'
      )
    }

    // Re-throw ViaCEPError
    if (error instanceof ViaCEPError) {
      throw error
    }

    // Tratar outros erros de rede
    throw new ViaCEPError(
      'Erro ao conectar com o serviço de CEP. Tente novamente.',
      'NETWORK_ERROR'
    )
  }
}

/**
 * Cache simples de CEPs consultados
 * Evita requisições repetidas para o mesmo CEP
 */
const cepCache = new Map<string, ViaCEPResponse>()

/**
 * Busca CEP com cache
 * Retorna resultado do cache se disponível, senão busca na API
 *
 * @param cep - CEP a ser buscado
 * @returns Promise com dados do endereço
 */
export async function buscarCEPComCache(cep: string): Promise<ViaCEPResponse> {
  const cleanedCEP = cleanCEP(cep)

  // Verificar se CEP está no cache
  if (cepCache.has(cleanedCEP)) {
    return cepCache.get(cleanedCEP)!
  }

  // Buscar na API
  const resultado = await buscarCEP(cep)

  // Salvar no cache
  cepCache.set(cleanedCEP, resultado)

  return resultado
}

/**
 * Limpa o cache de CEPs
 * Útil para testes ou quando quiser forçar nova busca
 */
export function limparCacheViaCEP(): void {
  cepCache.clear()
}

/**
 * Mapeia resposta do ViaCEP para formato do formulário
 *
 * @param viaCepData - Dados retornados pela API ViaCEP
 * @returns Objeto com campos mapeados para o formulário
 */
export function mapViaCEPToForm(viaCepData: ViaCEPResponse) {
  return {
    cep: viaCepData.cep,
    logradouro: viaCepData.logradouro,
    complemento: viaCepData.complemento || null,
    bairro: viaCepData.bairro,
    cidade: viaCepData.localidade,
    estado: viaCepData.uf,
  }
}
