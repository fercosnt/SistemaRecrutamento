/**
 * Serviço de autenticação Supabase
 *
 * Features:
 * - Sign up com email/senha
 * - Validação de senha forte
 * - Tratamento de erros específicos
 * - Retorna user_id para usar nas tabelas
 * - TypeScript strict mode
 *
 * @module authService
 */

import { supabase } from '@/lib/supabase/client'
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'

/**
 * Resultado do sign up
 */
export interface SignUpResult {
  /**
   * ID do usuário criado (UUID)
   */
  userId: string

  /**
   * Email do usuário
   */
  email: string

  /**
   * Se o email precisa ser confirmado
   */
  emailConfirmationRequired: boolean

  /**
   * Dados do usuário
   */
  user: {
    id: string
    email: string
    created_at: string
  }
}

/**
 * Dados para sign up
 */
export interface SignUpData {
  /**
   * Email do usuário
   */
  email: string

  /**
   * Senha do usuário
   */
  password: string

  /**
   * Dados adicionais (opcional)
   */
  metadata?: {
    nome_completo?: string
    cpf?: string
  }
}

/**
 * Custom Error para autenticação
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code:
      | 'WEAK_PASSWORD'
      | 'EMAIL_EXISTS'
      | 'INVALID_EMAIL'
      | 'INVALID_CREDENTIALS'
      | 'NETWORK_ERROR'
      | 'UNKNOWN_ERROR'
      | 'EMAIL_NOT_CONFIRMED',
    public originalError?: SupabaseAuthError
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Requisitos mínimos de senha
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Opcional
} as const

/**
 * Valida força da senha
 *
 * @param password - Senha a ser validada
 * @returns true se senha válida
 *
 * @example
 * isStrongPassword('Senha123') // true
 * isStrongPassword('senha') // false (sem maiúscula e número)
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return false
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return false
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return false
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    return false
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false
  }

  return true
}

/**
 * Retorna mensagem de erro amigável para requisitos de senha
 *
 * @returns Mensagem descrevendo requisitos
 */
export function getPasswordRequirementsMessage(): string {
  const requirements: string[] = [
    `Mínimo ${PASSWORD_REQUIREMENTS.minLength} caracteres`,
  ]

  if (PASSWORD_REQUIREMENTS.requireUppercase) {
    requirements.push('pelo menos 1 letra maiúscula')
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase) {
    requirements.push('pelo menos 1 letra minúscula')
  }

  if (PASSWORD_REQUIREMENTS.requireNumber) {
    requirements.push('pelo menos 1 número')
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChar) {
    requirements.push('pelo menos 1 caractere especial')
  }

  return `A senha deve ter: ${requirements.join(', ')}.`
}

/**
 * Mapeia erro do Supabase para AuthError
 *
 * @param error - Erro do Supabase Auth
 * @returns AuthError com mensagem amigável
 */
function mapSupabaseAuthError(error: SupabaseAuthError): AuthError {
  // Email já existe
  if (error.message?.includes('already registered') || error.message?.includes('User already registered')) {
    return new AuthError(
      'Este email já está cadastrado. Tente fazer login ou recuperar sua senha.',
      'EMAIL_EXISTS',
      error
    )
  }

  // Senha fraca (Supabase valida min 6 chars por padrão)
  if (error.message?.includes('Password') && error.message?.includes('least')) {
    return new AuthError(
      `Senha muito fraca. ${getPasswordRequirementsMessage()}`,
      'WEAK_PASSWORD',
      error
    )
  }

  // Email inválido
  if (error.message?.includes('Invalid email') || error.message?.includes('valid email')) {
    return new AuthError(
      'Email inválido. Verifique o formato do email.',
      'INVALID_EMAIL',
      error
    )
  }

  // Credenciais inválidas (login)
  if (error.message?.includes('Invalid login credentials')) {
    return new AuthError(
      'Email ou senha incorretos.',
      'INVALID_CREDENTIALS',
      error
    )
  }

  // Email não confirmado
  if (error.message?.includes('Email not confirmed')) {
    return new AuthError(
      'Email não confirmado. Verifique sua caixa de entrada.',
      'EMAIL_NOT_CONFIRMED',
      error
    )
  }

  // Erro genérico
  return new AuthError(
    error.message || 'Erro ao processar autenticação. Tente novamente.',
    'UNKNOWN_ERROR',
    error
  )
}

/**
 * Cria novo usuário no Supabase Auth
 *
 * @param data - Dados para sign up (email, senha, metadata)
 * @returns Resultado do sign up com userId
 * @throws {AuthError} Se senha fraca, email já existe, ou erro de rede
 *
 * @example
 * const result = await signUp({
 *   email: 'joao@example.com',
 *   password: 'Senha123',
 *   metadata: { nome_completo: 'João Silva' }
 * })
 * console.log(result.userId) // UUID do usuário criado
 */
export async function signUp(data: SignUpData): Promise<SignUpResult> {
  // Validar senha ANTES de enviar ao Supabase
  if (!isStrongPassword(data.password)) {
    throw new AuthError(
      `Senha muito fraca. ${getPasswordRequirementsMessage()}`,
      'WEAK_PASSWORD'
    )
  }

  try {
    // Criar usuário no Supabase Auth
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // Metadata do usuário (acessível em auth.users.raw_user_meta_data)
        data: data.metadata || {},

        // Configurações de confirmação de email
        // Se emailRedirectTo não for definido, Supabase usa padrão do projeto
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    // Tratar erro do Supabase
    if (error) {
      console.error('Supabase Auth error:', error)
      throw mapSupabaseAuthError(error)
    }

    // Validar resposta
    if (!authData.user) {
      throw new AuthError(
        'Erro ao criar usuário. Nenhum usuário foi retornado.',
        'UNKNOWN_ERROR'
      )
    }

    // Retornar resultado
    return {
      userId: authData.user.id,
      email: authData.user.email!,
      emailConfirmationRequired: !!authData.user.confirmation_sent_at,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        created_at: authData.user.created_at,
      },
    }
  } catch (err) {
    // Re-throw AuthError
    if (err instanceof AuthError) {
      throw err
    }

    // Erro de rede ou desconhecido
    console.error('Network/Unknown error during sign up:', err)
    throw new AuthError(
      'Erro de conexão ao criar usuário. Verifique sua internet.',
      'NETWORK_ERROR'
    )
  }
}

/**
 * Faz login de usuário existente
 *
 * @param email - Email do usuário
 * @param password - Senha do usuário
 * @returns Dados do usuário logado
 * @throws {AuthError} Se credenciais inválidas ou erro de rede
 *
 * @example
 * const result = await signIn('joao@example.com', 'Senha123')
 * console.log(result.userId)
 */
export async function signIn(email: string, password: string): Promise<SignUpResult> {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Supabase Auth error:', error)
      throw mapSupabaseAuthError(error)
    }

    if (!authData.user) {
      throw new AuthError(
        'Erro ao fazer login. Nenhum usuário foi retornado.',
        'UNKNOWN_ERROR'
      )
    }

    return {
      userId: authData.user.id,
      email: authData.user.email!,
      emailConfirmationRequired: false,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        created_at: authData.user.created_at,
      },
    }
  } catch (err) {
    if (err instanceof AuthError) {
      throw err
    }

    console.error('Network/Unknown error during sign in:', err)
    throw new AuthError(
      'Erro de conexão ao fazer login. Verifique sua internet.',
      'NETWORK_ERROR'
    )
  }
}

/**
 * Faz logout do usuário atual
 *
 * @throws {AuthError} Se erro ao fazer logout
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase Auth error:', error)
      throw new AuthError(
        'Erro ao fazer logout. Tente novamente.',
        'UNKNOWN_ERROR'
      )
    }
  } catch (err) {
    if (err instanceof AuthError) {
      throw err
    }

    console.error('Network/Unknown error during sign out:', err)
    throw new AuthError(
      'Erro de conexão ao fazer logout. Verifique sua internet.',
      'NETWORK_ERROR'
    )
  }
}

/**
 * Obtém o usuário atual autenticado
 *
 * @returns Dados do usuário ou null se não autenticado
 */
export async function getCurrentUser(): Promise<SignUpResult['user'] | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email!,
      created_at: user.created_at,
    }
  } catch (err) {
    console.error('Error getting current user:', err)
    return null
  }
}
