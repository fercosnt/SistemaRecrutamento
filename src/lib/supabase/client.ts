/**
 * Cliente Supabase configurado para o projeto Beauty Smile
 *
 * Este arquivo inicializa e exporta o cliente Supabase que será usado
 * em toda a aplicação para interagir com o banco de dados e autenticação.
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../database.types'

// Validar variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local'
  )
}

/**
 * Cliente Supabase singleton
 *
 * Configurado com:
 * - Auth: persistência de sessão no localStorage
 * - Auto refresh do token a cada 60 segundos
 * - Detecção automática de sessão
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistir sessão no localStorage do navegador
    storage: window.localStorage,

    // Auto refresh do token antes de expirar
    autoRefreshToken: true,

    // Detectar sessão automaticamente ao carregar a página
    detectSessionInUrl: true,

    // Persistir a sessão mesmo após fechar o navegador
    persistSession: true,

    // Flow type para OAuth (usado em login social, se implementado futuramente)
    flowType: 'pkce'
  }
})

/**
 * Helper para verificar se há uma sessão ativa
 */
export const hasActiveSession = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

/**
 * Helper para obter o usuário atual
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Error fetching current user:', error)
    return null
  }

  return user
}

/**
 * Helper para fazer logout
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

// Exportar tipo Database para uso em outros arquivos
export type { Database }
