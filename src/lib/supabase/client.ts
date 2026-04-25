/**
 * Cliente Supabase configurado para o projeto Beauty Smile
 *
 * Este arquivo inicializa e exporta o cliente Supabase que será usado
 * em toda a aplicação para interagir com o banco de dados e autenticação.
 *
 * Segurança (FOUND-12):
 * - Apenas o cliente anônimo (anon key) é exportado. Nenhuma service_role
 *   key é referenciada neste arquivo. Operações privilegiadas (como cadastro
 *   de candidato e criação/deleção de usuários no auth) devem ser feitas via
 *   Edge Functions (`supabase.functions.invoke`) -- nunca a partir do client.
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../database.types'
import { rememberMeStorage } from '@/features/auth/utils/rememberMeStorage'

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
 * Cliente Supabase singleton (anon key)
 *
 * Configurado com:
 * - Auth: persistência de sessão via `rememberMeStorage` adapter (D-19 / Plan 03-03)
 *   — escolhe `localStorage` (persistente) ou `sessionStorage` (ephemeral por aba)
 *   baseado em `setRememberMeMode(mode)` chamado ANTES de `signInWithPassword`.
 * - Auto refresh do token a cada 60 segundos
 * - Detecção automática de sessão
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistir sessão — adapter escolhe localStorage (persistente) ou
    // sessionStorage (ephemeral por aba) baseado em setRememberMeMode
    // chamado ANTES de signIn. D-19 / Q1.
    storage: rememberMeStorage,

    // Auto refresh do token antes de expirar
    autoRefreshToken: true,

    // Detectar sessão automaticamente ao carregar a página
    detectSessionInUrl: true,

    // Persistir a sessão mesmo após fechar o navegador
    persistSession: true,

    // Flow type para OAuth (usado em login social, se implementado futuramente)
    flowType: 'pkce',

    // Storage key explícita
    storageKey: 'sb-auth-token'
  }
})

// supabaseAdmin REMOVED -- service_role key must NEVER be in client code.
// Privileged operations go through Edge Functions (supabase.functions.invoke)

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
