/**
 * Serviço de cadastro completo de candidato
 *
 * A partir da Fase 1 (FOUND-01), o cadastro é orquestrado pela Edge Function
 * `cadastrar-candidato` (a ser implementada na Fase 1 Plano 05). Este serviço
 * apenas serializa os dados do formulário e delega a operação multi-tabela
 * (auth.signUp + inserts + rollback) ao backend, onde o service_role key
 * reside com segurança. O cliente nunca executa operações privilegiadas.
 *
 * @module cadastroService
 */

import { supabase } from '@/lib/supabase/client'
import { signUp, AuthError } from './authService'
import type { CandidatoFormData } from '../types'

// ============================================
// TYPES E INTERFACES
// ============================================

/**
 * Resultado completo do cadastro
 *
 * NOTA:
 * - `disponibilidadeId` e `autorizacoesId` permanecem no contrato para
 *   compatibilidade com consumidores existentes, mas a Edge Function
 *   pode não retorná-los (campos opcionais). No client, apenas
 *   `userId` e `candidatoId` são usados em redirecionamentos.
 */
export interface CadastroCompleteResult {
  /**
   * ID do usuário no Supabase Auth
   */
  userId: string

  /**
   * ID do candidato na tabela candidatos
   */
  candidatoId: string

  /**
   * ID da disponibilidade na tabela disponibilidade (opcional)
   */
  disponibilidadeId?: string

  /**
   * ID das autorizações na tabela autorizacoes (opcional)
   */
  autorizacoesId?: string
}

/**
 * Formato de resposta esperada da Edge Function `cadastrar-candidato`.
 * Segue o padrão `{ ok, data | error }` definido em 01-CONTEXT.md (D-01b).
 */
interface CadastrarCandidatoResponse {
  ok: boolean
  data?: {
    userId: string
    candidatoId: string
    disponibilidadeId?: string
    autorizacoesId?: string
  }
  error?: string
}

/**
 * Custom Error para operações de cadastro
 *
 * Após FOUND-01, a maior parte da lógica (AUTH_FAILED, INSERT_FAILED,
 * ROLLBACK_FAILED) é executada na Edge Function. No client só sobrevivem
 * os códigos de erro observáveis: erros de rede/transporte e erros
 * de retorno da Edge Function.
 */
export class CadastroError extends Error {
  constructor(
    message: string,
    public code:
      | 'AUTH_FAILED'
      | 'INSERT_FAILED'
      | 'ROLLBACK_FAILED'
      | 'VALIDATION_ERROR'
      | 'NETWORK_ERROR'
      | 'EDGE_FUNCTION_ERROR'
      | 'UNKNOWN_ERROR',
    public table?: string,
    public originalError?: unknown,
    public details?: unknown
  ) {
    super(message)
    this.name = 'CadastroError'
  }
}

// ============================================
// LEGACY HELPERS (kept for backward compat)
// ============================================

/**
 * Helper legado exportado historicamente via `./authService`.
 * TODO: remove in Phase 2 cleanup (não é mais usado por `cadastrarCandidato`).
 */
export { signUp, AuthError }

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Cadastra candidato completo via Edge Function
 *
 * A Edge Function `cadastrar-candidato` executa, do lado servidor:
 * 1. Criação do usuário no Auth (usando service_role no backend)
 * 2. Insert em `candidatos`, `disponibilidade`, `autorizacoes`
 * 3. Rollback automático caso qualquer etapa falhe
 *
 * Este serviço apenas invoca a função e mapeia erros para `CadastroError`.
 *
 * @param data - Dados completos do formulário (incluindo senha)
 * @returns IDs de usuário e candidato (mais IDs opcionais)
 * @throws {CadastroError} Se a Edge Function retornar erro ou houver falha de rede
 *
 * @example
 * const result = await cadastrarCandidato(formData)
 * console.log(result.candidatoId) // UUID do candidato criado
 */
export async function cadastrarCandidato(
  data: CandidatoFormData
): Promise<CadastroCompleteResult> {
  console.log('[CADASTRO] Invocando Edge Function cadastrar-candidato')
  console.log('[CADASTRO]   Email:', data.dadosPessoais.email)
  console.log('[CADASTRO]   Nome:', data.dadosPessoais.nome_completo)

  try {
    const { data: responseData, error: invokeError } =
      await supabase.functions.invoke<CadastrarCandidatoResponse>(
        'cadastrar-candidato',
        {
          body: {
            // Dados pessoais
            email: data.dadosPessoais.email,
            password: data.dadosPessoais.senha,
            nome_completo: data.dadosPessoais.nome_completo,
            cpf: data.dadosPessoais.cpf,
            telefone: data.dadosPessoais.telefone,
            data_nascimento: data.dadosPessoais.data_nascimento,
            genero: data.dadosPessoais.genero,
            instagram: data.dadosPessoais.instagram ?? null,
            linkedin: data.dadosPessoais.linkedin ?? null,
            como_conheceu: data.dadosPessoais.como_conheceu,
            como_conheceu_detalhes:
              data.dadosPessoais.como_conheceu_detalhes ?? null,

            // Endereço (serializado diretamente; colunas vivem em candidatos)
            endereco: data.endereco,

            // Disponibilidade + autorizações (Edge Function mapeia para snake_case)
            disponibilidade: data.disponibilidade,
            autorizacoes: data.autorizacoes,
          },
        }
      )

    if (invokeError) {
      console.error('[CADASTRO] Erro ao invocar Edge Function:', invokeError)
      throw new CadastroError(
        invokeError.message || 'Falha ao invocar função de cadastro',
        'EDGE_FUNCTION_ERROR',
        undefined,
        invokeError
      )
    }

    if (!responseData || !responseData.ok) {
      const serverMessage = responseData?.error || 'Erro desconhecido no servidor'
      console.error('[CADASTRO] Edge Function retornou erro:', serverMessage)
      throw new CadastroError(serverMessage, 'EDGE_FUNCTION_ERROR')
    }

    if (!responseData.data?.userId || !responseData.data?.candidatoId) {
      console.error(
        '[CADASTRO] Edge Function retornou payload inválido:',
        responseData
      )
      throw new CadastroError(
        'Resposta da função de cadastro está incompleta',
        'EDGE_FUNCTION_ERROR',
        undefined,
        responseData
      )
    }

    console.log('[CADASTRO] Cadastro concluído com sucesso via Edge Function')
    console.log('   - User ID:', responseData.data.userId)
    console.log('   - Candidato ID:', responseData.data.candidatoId)

    return {
      userId: responseData.data.userId,
      candidatoId: responseData.data.candidatoId,
      disponibilidadeId: responseData.data.disponibilidadeId,
      autorizacoesId: responseData.data.autorizacoesId,
    }
  } catch (err) {
    // Re-lança CadastroError sem reempacotar
    if (err instanceof CadastroError) {
      throw err
    }

    // Erro de rede (fetch falhou antes de atingir a Edge Function)
    console.error('[CADASTRO] Erro de rede ou desconhecido:', err)
    throw new CadastroError(
      'Erro inesperado ao cadastrar candidato. Verifique sua conexão e tente novamente.',
      'NETWORK_ERROR',
      undefined,
      err
    )
  }
}
