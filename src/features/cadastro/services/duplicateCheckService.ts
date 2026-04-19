/**
 * Serviço de verificação de duplicatas (CPF/Email)
 *
 * Features:
 * - Verifica CPF duplicado no banco
 * - Verifica Email duplicado no banco
 * - Error handling específico
 * - Tipos TypeScript
 *
 * @module duplicateCheckService
 */

import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/client'

// Type aliases para melhor legibilidade
type CandidatosTable = Database['public']['Tables']['candidatos']['Row']

/**
 * Tipos de campo para verificação de duplicata
 */
export type DuplicateCheckField = 'cpf' | 'email'

/**
 * Resultado da verificação de duplicata
 */
export interface DuplicateCheckResult {
  /**
   * Se o valor já existe no banco
   */
  isDuplicate: boolean

  /**
   * Campo verificado
   */
  field: DuplicateCheckField

  /**
   * Valor verificado (sanitizado)
   */
  value: string

  /**
   * Dados do candidato existente (se duplicado)
   */
  existingCandidate?: {
    id: string
    nome_completo: string
    email: string
    cpf: string
    data_cadastro: string
  } | null
}

/**
 * Custom Error para verificação de duplicatas
 */
export class DuplicateCheckError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR',
    public field?: DuplicateCheckField
  ) {
    super(message)
    this.name = 'DuplicateCheckError'
  }
}

/**
 * Limpa e formata CPF (remove caracteres não numéricos)
 *
 * @param cpf - CPF a ser limpo
 * @returns CPF apenas com números
 *
 * @example
 * cleanCPF('123.456.789-00') // '12345678900'
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Limpa e formata Email (trim + lowercase)
 *
 * @param email - Email a ser limpo
 * @returns Email em lowercase sem espaços
 *
 * @example
 * cleanEmail(' João@Example.COM  ') // 'joão@example.com'
 */
export function cleanEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Valida CPF (11 dígitos)
 *
 * @param cpf - CPF a ser validado
 * @returns true se CPF tem 11 dígitos
 */
export function isValidCPFFormat(cpf: string): boolean {
  const cleaned = cleanCPF(cpf)
  return /^\d{11}$/.test(cleaned)
}

/**
 * Valida Email (formato básico)
 *
 * @param email - Email a ser validado
 * @returns true se email tem formato válido
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Verifica se CPF já existe no banco de dados
 *
 * @param cpf - CPF a ser verificado (pode estar formatado)
 * @returns Resultado da verificação com dados do candidato se duplicado
 * @throws {DuplicateCheckError} Se CPF inválido ou erro de rede/banco
 *
 * @example
 * const result = await checkCPFDuplicate('123.456.789-00')
 * if (result.isDuplicate) {
 *   console.log(`CPF já cadastrado: ${result.existingCandidate?.nome_completo}`)
 * }
 */
export async function checkCPFDuplicate(cpf: string): Promise<DuplicateCheckResult> {
  // Validar formato do CPF
  if (!isValidCPFFormat(cpf)) {
    throw new DuplicateCheckError(
      'CPF inválido. O CPF deve conter 11 dígitos.',
      'INVALID_INPUT',
      'cpf'
    )
  }

  const cleanedCPF = cleanCPF(cpf)

  try {
    // Buscar candidato com CPF no banco
    const { data, error } = await supabase
      .from('candidatos')
      .select('id, nome_completo, email, cpf, created_at')
      .eq('cpf', cleanedCPF)
      .maybeSingle() // Retorna null se não encontrar, evita erro

    // Tratar erro do Supabase
    if (error) {
      console.error('Supabase error checking CPF duplicate:', error)
      throw new DuplicateCheckError(
        'Erro ao verificar CPF no banco de dados. Tente novamente.',
        'DATABASE_ERROR',
        'cpf'
      )
    }

    // Retornar resultado
    return {
      isDuplicate: !!data,
      field: 'cpf',
      value: cleanedCPF,
      existingCandidate: data || null,
    }
  } catch (err) {
    // Re-throw DuplicateCheckError
    if (err instanceof DuplicateCheckError) {
      throw err
    }

    // Erro de rede ou desconhecido
    console.error('Network/Unknown error checking CPF duplicate:', err)
    throw new DuplicateCheckError(
      'Erro de conexão ao verificar CPF. Verifique sua internet.',
      'NETWORK_ERROR',
      'cpf'
    )
  }
}

/**
 * Verifica se Email já existe no banco de dados
 *
 * @param email - Email a ser verificado
 * @returns Resultado da verificação com dados do candidato se duplicado
 * @throws {DuplicateCheckError} Se email inválido ou erro de rede/banco
 *
 * @example
 * const result = await checkEmailDuplicate('joao@example.com')
 * if (result.isDuplicate) {
 *   console.log(`Email já cadastrado: ${result.existingCandidate?.nome_completo}`)
 * }
 */
export async function checkEmailDuplicate(email: string): Promise<DuplicateCheckResult> {
  // Validar formato do Email
  if (!isValidEmailFormat(email)) {
    throw new DuplicateCheckError(
      'Email inválido. Verifique o formato do email.',
      'INVALID_INPUT',
      'email'
    )
  }

  const cleanedEmail = cleanEmail(email)

  try {
    // Buscar candidato com Email no banco (case-insensitive)
    const { data, error } = await supabase
      .from('candidatos')
      .select('id, nome_completo, email, cpf, created_at')
      .ilike('email', cleanedEmail) // ilike = case-insensitive
      .maybeSingle() // Retorna null se não encontrar

    // Tratar erro do Supabase
    if (error) {
      console.error('Supabase error checking Email duplicate:', error)
      throw new DuplicateCheckError(
        'Erro ao verificar Email no banco de dados. Tente novamente.',
        'DATABASE_ERROR',
        'email'
      )
    }

    // Retornar resultado
    return {
      isDuplicate: !!data,
      field: 'email',
      value: cleanedEmail,
      existingCandidate: data || null,
    }
  } catch (err) {
    // Re-throw DuplicateCheckError
    if (err instanceof DuplicateCheckError) {
      throw err
    }

    // Erro de rede ou desconhecido
    console.error('Network/Unknown error checking Email duplicate:', err)
    throw new DuplicateCheckError(
      'Erro de conexão ao verificar Email. Verifique sua internet.',
      'NETWORK_ERROR',
      'email'
    )
  }
}

/**
 * Verifica duplicatas de CPF e Email simultaneamente
 *
 * @param cpf - CPF a ser verificado
 * @param email - Email a ser verificado
 * @returns Objeto com resultados para ambos os campos
 * @throws {DuplicateCheckError} Se algum campo inválido ou erro de rede/banco
 *
 * @example
 * const results = await checkBothDuplicates('123.456.789-00', 'joao@example.com')
 * if (results.cpf.isDuplicate || results.email.isDuplicate) {
 *   console.log('Candidato já cadastrado!')
 * }
 */
export async function checkBothDuplicates(
  cpf: string,
  email: string
): Promise<{
  cpf: DuplicateCheckResult
  email: DuplicateCheckResult
}> {
  // Executar verificações em paralelo para melhor performance
  const [cpfResult, emailResult] = await Promise.all([
    checkCPFDuplicate(cpf),
    checkEmailDuplicate(email),
  ])

  return {
    cpf: cpfResult,
    email: emailResult,
  }
}
