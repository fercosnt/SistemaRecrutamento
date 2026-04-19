/**
 * User Type Detection Service
 *
 * Serviço para detectar o tipo de usuário (candidato ou RH/admin)
 * baseado nas tabelas do banco de dados.
 *
 * Usado para redirecionamento inteligente após recuperação de senha.
 *
 * @module services/userTypeDetectionService
 */

import { supabase } from '@/lib/supabase/client';

/**
 * Tipo de usuário detectado
 */
export type UserType = 'candidato' | 'rh' | 'unknown';

/**
 * Resultado da detecção de tipo de usuário
 */
export interface UserTypeResult {
  type: UserType;
  loginPath: string;
  displayName: string;
}

/**
 * Detecta o tipo de usuário baseado no user_id do Supabase Auth
 *
 * Verifica em ordem:
 * 1. Se existe em `usuarios_rh` → tipo 'rh'
 * 2. Se existe em `candidatos` → tipo 'candidato'
 * 3. Caso contrário → tipo 'unknown' (fallback para candidato)
 *
 * @param userId - UUID do usuário no Supabase Auth
 * @returns Tipo de usuário, caminho de login e nome de exibição
 *
 * @example
 * ```typescript
 * const { type, loginPath } = await detectUserType(user.id);
 * if (type === 'rh') {
 *   navigate('/auth/login-rh');
 * } else {
 *   navigate('/auth/login');
 * }
 * ```
 */
export async function detectUserType(userId: string): Promise<UserTypeResult> {
  try {
    // Verificar se é usuário RH/admin
    const { data: adminUser, error: adminError } = await (supabase as any)
      .from('usuarios_rh')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (adminError && adminError.code !== 'PGRST116') {
      // PGRST116 = not found (normal, não é erro)
      console.error('Erro ao verificar usuário RH:', adminError);
    }

    if (adminUser) {
      return {
        type: 'rh',
        loginPath: '/auth/login-rh',
        displayName: 'Painel Administrativo',
      };
    }

    // Verificar se é candidato
    const { data: candidato, error: candidatoError } = await supabase
      .from('candidatos')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (candidatoError && candidatoError.code !== 'PGRST116') {
      console.error('Erro ao verificar candidato:', candidatoError);
    }

    if (candidato) {
      return {
        type: 'candidato',
        loginPath: '/auth/login',
        displayName: 'Portal do Candidato',
      };
    }

    // Fallback: usuário existe no Auth mas não em nenhuma tabela
    // Redirecionar para login de candidato por padrão
    console.warn(
      `Usuário ${userId} não encontrado em candidatos nem usuarios_rh. Redirecionando para login de candidato.`
    );

    return {
      type: 'unknown',
      loginPath: '/auth/login',
      displayName: 'Portal do Candidato',
    };
  } catch (error) {
    console.error('Erro inesperado ao detectar tipo de usuário:', error);

    // Em caso de erro, redirecionar para login de candidato (mais seguro)
    return {
      type: 'unknown',
      loginPath: '/auth/login',
      displayName: 'Portal do Candidato',
    };
  }
}

/**
 * Detecta o tipo de usuário baseado no email
 *
 * Estratégia alternativa quando não temos user_id disponível.
 * Útil para situações onde apenas o email está disponível.
 *
 * @param email - Email do usuário
 * @returns Tipo de usuário, caminho de login e nome de exibição
 *
 * @example
 * ```typescript
 * const { type, loginPath } = await detectUserTypeByEmail('user@example.com');
 * navigate(loginPath);
 * ```
 */
export async function detectUserTypeByEmail(email: string): Promise<UserTypeResult> {
  try {
    // Verificar se é usuário RH/admin (assumindo que usuarios_rh tem campo email)
    const { data: adminUser, error: adminError } = await (supabase as any)
      .from('usuarios_rh')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (adminError && adminError.code !== 'PGRST116') {
      console.error('Erro ao verificar usuário RH por email:', adminError);
    }

    if (adminUser) {
      return {
        type: 'rh',
        loginPath: '/auth/login-rh',
        displayName: 'Painel Administrativo',
      };
    }

    // Verificar se é candidato
    const { data: candidato, error: candidatoError } = await supabase
      .from('candidatos')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (candidatoError && candidatoError.code !== 'PGRST116') {
      console.error('Erro ao verificar candidato por email:', candidatoError);
    }

    if (candidato) {
      return {
        type: 'candidato',
        loginPath: '/auth/login',
        displayName: 'Portal do Candidato',
      };
    }

    // Fallback: email não encontrado
    return {
      type: 'unknown',
      loginPath: '/auth/login',
      displayName: 'Portal do Candidato',
    };
  } catch (error) {
    console.error('Erro inesperado ao detectar tipo de usuário por email:', error);

    return {
      type: 'unknown',
      loginPath: '/auth/login',
      displayName: 'Portal do Candidato',
    };
  }
}
