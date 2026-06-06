/**
 * Serviço de cadastro completo de candidato
 *
 * A partir da Fase 1 (FOUND-01), o cadastro é orquestrado pela Edge Function
 * `cadastrar-candidato`. Este serviço apenas serializa os dados do formulário
 * e delega a operação multi-tabela (auth.signUp + inserts + rollback) ao
 * backend, onde o service_role key reside com segurança. O cliente nunca
 * executa operações privilegiadas.
 *
 * Phase 2 Plan 02-05 evolution:
 * - `CadastroError.code` passou a espelhar o contrato estruturado da Edge
 *   Function (Plan 02-03): EMAIL_EXISTS / CPF_EXISTS / VALIDATION / SERVER_ERROR.
 * - `CadastroError.field?` permite ao consumidor rotear erros por campo.
 * - `tryAutoLogin(email, password)` exportado para uso no handler de success
 *   do CadastroMultiStepForm (D-02: single retry com backoff 500ms).
 * - `FIELD_TO_STEP_INDEX` e `FIELD_TO_STEP_PATH` exportados para o form
 *   traduzir `field` flat (do servidor) em step/path RHF (Plan 02-06 consumer).
 *
 * SECURITY / PITFALL 7:
 * Nenhum `console.*` deste módulo pode receber `data` (que contém senha) ou
 * qualquer campo senha/confirmar_senha. Logs emitem apenas email + flags
 * redigidas.
 *
 * @module cadastroService
 */

import { supabase } from '@/lib/supabase/client'
import { signUp, SignUpError } from './authService'
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
 *
 * Phase 2 Plan 02-03 introduziu o contrato estruturado de erro:
 *   { ok: false, error_code, message, field?, error? }
 * onde `error` é o alias legado de `message` mantido durante a transição
 * (RESEARCH L498). Consumers novos devem ler `message`; `error` é fallback.
 */
interface CadastrarCandidatoResponse {
  ok: boolean
  data?: {
    userId: string
    candidatoId: string
    disponibilidadeId?: string
    autorizacoesId?: string
  }
  /**
   * Código de erro canônico. Quando ausente (resposta legada), consumers
   * tratam como UNKNOWN_ERROR.
   */
  error_code?: CadastroError['code']
  /**
   * Mensagem em pt-BR cordial. Fallback para exibição ao usuário.
   */
  message?: string
  /**
   * Nome canônico do campo (flat). Ex.: 'email', 'cpf', 'cep'.
   */
  field?: string
  /**
   * Alias legado de `message`. Preservado durante transição (ver 02-03).
   */
  error?: string
}

/**
 * Custom Error para operações de cadastro
 *
 * Phase 2 Plan 02-05: `code` agora espelha o contrato estruturado da Edge
 * Function (Plan 02-03). Códigos legados (AUTH_FAILED, INSERT_FAILED,
 * ROLLBACK_FAILED, VALIDATION_ERROR) foram removidos — eram dead-code desde
 * FOUND-01 (lógica multi-tabela vive no servidor).
 */
export class CadastroError extends Error {
  constructor(
    message: string,
    public code:
      | 'EMAIL_EXISTS'
      | 'CPF_EXISTS'
      | 'VALIDATION'
      | 'SERVER_ERROR'
      | 'NETWORK_ERROR'
      | 'EDGE_FUNCTION_ERROR'
      | 'UNKNOWN_ERROR',
    public field?: string,
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
 *
 * Phase 3 Plan 03-04 / D-17 Option A: the OLD `AuthError` class was
 * RENAMED to `SignUpError`. The new canonical `AuthError` (Phase 3
 * D-17 taxonomy) lives at `@/features/auth/types/authTypes.ts` —
 * Phase 3 consumers import THAT one, never this re-export.
 *
 * TODO: remove in Phase 3 cleanup (não é mais usado por `cadastrarCandidato`).
 */
export { signUp, SignUpError }

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
  // Pitfall 7: redaction — NEVER log `data` directly (contém senha).
  console.log('[CADASTRO] Invocando Edge Function cadastrar-candidato', {
    // Pitfall 7 (WR-02): NUNCA logar PII (email/nome) — apenas flags booleanas.
    hasEmail: Boolean(data.dadosPessoais.email),
    hasNome: Boolean(data.dadosPessoais.nome_completo),
    hasPassword: Boolean(data.dadosPessoais.senha),
  })

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
      // supabase-js routes ANY non-2xx response into `invokeError` (a
      // FunctionsHttpError carrying the original Response in `.context`), NOT
      // only true network failures. The Edge Function returns its STRUCTURED
      // error ({ ok:false, error_code, message, field }) with HTTP 400, so we
      // MUST read that body to recover the real error_code — otherwise a
      // legitimate EMAIL_EXISTS / CPF_EXISTS / VALIDATION is mislabeled as a
      // network outage ("Sem conexão com o servidor") and the friendly,
      // field-specific message never reaches the user (D-12 carryover, surfaced
      // by the 05-04 iPhone UAT). Only a body we cannot parse is a genuine
      // network/relay failure → NETWORK_ERROR fallback.
      const httpResponse = (invokeError as { context?: Response }).context
      if (httpResponse && typeof httpResponse.clone === 'function') {
        let structured: CadastrarCandidatoResponse | null = null
        try {
          structured = (await httpResponse.clone().json()) as CadastrarCandidatoResponse
        } catch {
          structured = null
        }
        if (structured && structured.ok === false) {
          const code = (structured.error_code ?? 'UNKNOWN_ERROR') as CadastroError['code']
          const message =
            structured.message ?? structured.error ?? 'Erro desconhecido no servidor'
          console.error('[CADASTRO] Edge Function retornou erro (HTTP body):', { code, message })
          throw new CadastroError(message, code, structured.field)
        }
      }
      // Pitfall 7 (WR-03): NÃO logar invokeError.message / String(invokeError) —
      // alguns SDKs serializam o request body (que contém a senha) na mensagem.
      // Logar apenas name/status estruturados.
      console.error('[CADASTRO] Falha de rede ao invocar Edge Function', {
        name: invokeError instanceof Error ? invokeError.name : 'unknown',
        status: (invokeError as { status?: number }).status,
      })
      throw new CadastroError(
        invokeError.message || 'Falha ao invocar função de cadastro',
        'NETWORK_ERROR',
        undefined,
        undefined,
        undefined,
        invokeError
      )
    }

    if (!responseData?.ok) {
      const code = (responseData?.error_code ?? 'UNKNOWN_ERROR') as CadastroError['code']
      const message =
        responseData?.message ?? responseData?.error ?? 'Erro desconhecido no servidor'
      console.error('[CADASTRO] Edge Function retornou erro:', { code, message })
      throw new CadastroError(message, code, responseData?.field)
    }

    if (!responseData.data?.userId || !responseData.data?.candidatoId) {
      console.error('[CADASTRO] Edge Function retornou payload inválido:', {
        hasUserId: Boolean(responseData.data?.userId),
        hasCandidatoId: Boolean(responseData.data?.candidatoId),
      })
      throw new CadastroError(
        'Resposta da função de cadastro está incompleta',
        'EDGE_FUNCTION_ERROR',
        undefined,
        undefined,
        undefined,
        responseData
      )
    }

    console.log('[CADASTRO] Cadastro concluído com sucesso via Edge Function', {
      userId: responseData.data.userId,
      candidatoId: responseData.data.candidatoId,
    })

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
    console.error(
      '[CADASTRO] Erro de rede ou desconhecido:',
      err instanceof Error ? err.message : String(err)
    )
    throw new CadastroError(
      'Erro inesperado ao cadastrar candidato. Verifique sua conexão e tente novamente.',
      'NETWORK_ERROR',
      undefined,
      undefined,
      undefined,
      err
    )
  }
}

// ============================================
// AUTO-LOGIN HELPER (D-02) — moved to @/features/auth/services in Phase 3
// ============================================

/**
 * Phase 3 Plan 03-04: `tryAutoLogin` MOVED to
 * `src/features/auth/services/authService.ts` (canonical Phase 3 source).
 *
 * The single-retry / 500ms-backoff contract is preserved verbatim.
 * Existing Phase 2 consumer `CadastroMultiStepForm` continues to import
 * from this module (re-exported here) without behavioral change.
 *
 * @see src/features/auth/services/authService.ts for the implementation.
 */
export { tryAutoLogin } from '@/features/auth/services'

// ============================================
// FIELD ROUTING TABLES (consumed by Plan 02-06)
// ============================================

/**
 * Mapa de nome de campo FLAT (como o servidor emite em `field`) para o índice
 * de step no `CadastroMultiStepForm`:
 *   0 = Dados Pessoais
 *   1 = Endereço
 *   2 = Disponibilidade
 *   3 = Autorizações LGPD
 *
 * Usado pelo consumer (Plan 02-06) para fazer `setCurrentStepIndex(idx)` antes
 * de aplicar `methods.setError(path, ...)`.
 *
 * Nota T-02-11 (threat register): este mapa funciona como whitelist. Consumers
 * devem validar `if (field && FIELD_TO_STEP_INDEX[field] !== undefined)` antes
 * de navegar. Campos desconhecidos caem em toast genérico (sem navegação).
 */
export const FIELD_TO_STEP_INDEX: Record<string, number> = {
  // Step 0 — Dados Pessoais
  nome_completo: 0,
  cpf: 0,
  email: 0,
  telefone: 0,
  data_nascimento: 0,
  genero: 0,
  como_conheceu: 0,
  como_conheceu_detalhes: 0,
  instagram: 0,
  linkedin: 0,
  senha: 0,
  confirmar_senha: 0,
  // Step 1 — Endereço
  cep: 1,
  logradouro: 1,
  numero: 1,
  complemento: 1,
  bairro: 1,
  cidade: 1,
  estado: 1,
  // Step 3 — Autorizações LGPD
  autorizacao_uso_dados: 3,
  autorizacao_comunicacao: 3,
  autorizacao_retencao_curriculo: 3,
  autorizacao_analise_video: 3,
}

/**
 * Mapa de nome de campo FLAT para o path RHF aninhado.
 *
 * Ex.: `email` → `dadosPessoais.email`
 *      `cep`   → `endereco.cep`
 *      `autorizacao_uso_dados` → `autorizacoes.autorizacao_uso_dados`
 *
 * Consumido por `methods.setError(path, ...)` em Plan 02-06.
 */
export const FIELD_TO_STEP_PATH: Record<string, string> = {
  // Dados Pessoais
  nome_completo: 'dadosPessoais.nome_completo',
  cpf: 'dadosPessoais.cpf',
  email: 'dadosPessoais.email',
  telefone: 'dadosPessoais.telefone',
  data_nascimento: 'dadosPessoais.data_nascimento',
  genero: 'dadosPessoais.genero',
  como_conheceu: 'dadosPessoais.como_conheceu',
  como_conheceu_detalhes: 'dadosPessoais.como_conheceu_detalhes',
  instagram: 'dadosPessoais.instagram',
  linkedin: 'dadosPessoais.linkedin',
  senha: 'dadosPessoais.senha',
  confirmar_senha: 'dadosPessoais.confirmar_senha',
  // Endereço
  cep: 'endereco.cep',
  logradouro: 'endereco.logradouro',
  numero: 'endereco.numero',
  complemento: 'endereco.complemento',
  bairro: 'endereco.bairro',
  cidade: 'endereco.cidade',
  estado: 'endereco.estado',
  // Autorizações LGPD
  autorizacao_uso_dados: 'autorizacoes.autorizacao_uso_dados',
  autorizacao_comunicacao: 'autorizacoes.autorizacao_comunicacao',
  autorizacao_retencao_curriculo: 'autorizacoes.autorizacao_retencao_curriculo',
  autorizacao_analise_video: 'autorizacoes.autorizacao_analise_video',
}
