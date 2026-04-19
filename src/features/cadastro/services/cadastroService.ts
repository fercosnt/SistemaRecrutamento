/**
 * Serviço de cadastro completo de candidato
 *
 * Realiza transação em 3 tabelas com rollback automático em caso de erro:
 * 1. Criar usuário no auth (signUp)
 * 2. Inserir em candidatos (com user_id, instagram, linkedin, endereço completo)
 * 3. Inserir em disponibilidade (com candidato_id)
 * 4. Inserir em autorizacoes (com candidato_id)
 *
 * NOTA: 
 * - dados_profissionais não é mais inserido durante cadastro (Opção B)
 * - endereço é salvo diretamente na tabela candidatos (não há tabela enderecos separada)
 *
 * Rollback automático se qualquer operação falhar
 *
 * @module cadastroService
 */

import { supabaseAdmin } from '@/lib/supabase/client'
import { signUp, AuthError } from './authService'
import type { CandidatoFormData } from '../types'
import type {
  CandidatoInsert,
  // EnderecoInsert, // Não usado mais (endereço salvo diretamente em candidatos)
  // DadosProfissionaisInsert, // Não usado mais (Opção B)
  DisponibilidadeInsert,
  AutorizacoesInsert,
} from '../types'

// ============================================
// TYPES E INTERFACES
// ============================================

/**
 * Resultado completo do cadastro
 * NOTA: 
 * - dadosProfissionaisId foi removido (não coletamos mais no cadastro)
 * - enderecoId foi removido (endereço é salvo diretamente na tabela candidatos)
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
   * ID da disponibilidade na tabela disponibilidade
   */
  disponibilidadeId: string

  /**
   * ID das autorizações na tabela autorizacoes
   */
  autorizacoesId: string
}

/**
 * Custom Error para operações de cadastro
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
// DATA MAPPING FUNCTIONS
// ============================================

/**
 * Formata telefone para o formato esperado pelo banco: (XX) XXXXX-XXXX
 * Remove todos os caracteres não numéricos e formata
 */
function formatTelefone(telefone: string): string {
  // Remove todos os caracteres não numéricos
  const apenasNumeros = telefone.replace(/\D/g, '')
  
  // Verifica se tem 11 dígitos (DDD + número de celular)
  if (apenasNumeros.length === 11) {
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7)}`
  }
  
  // Se tiver 10 dígitos (DDD + número fixo), formata como (XX) XXXX-XXXX
  if (apenasNumeros.length === 10) {
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 6)}-${apenasNumeros.slice(6)}`
  }
  
  // Se não tiver o tamanho esperado, retorna como está (será validado pelo banco)
  return telefone
}

/**
 * Mapeia dados do formulário para insert em candidatos
 * Incluindo redes sociais (Instagram e LinkedIn)
 */
function mapToCandidatoInsert(
  formData: CandidatoFormData,
  userId: string
): CandidatoInsert {
  return {
    user_id: userId,
    nome_completo: formData.dadosPessoais.nome_completo,
    cpf: formData.dadosPessoais.cpf,
    email: formData.dadosPessoais.email,
    celular: formatTelefone(formData.dadosPessoais.telefone), // Formata telefone para (XX) XXXXX-XXXX
    data_nascimento: formData.dadosPessoais.data_nascimento,
    genero: formData.dadosPessoais.genero, // Campo 'genero' no banco (não 'sexo')
    instagram: formData.dadosPessoais.instagram || null,
    linkedin: formData.dadosPessoais.linkedin || null,
    como_conheceu: formData.dadosPessoais.como_conheceu,
    como_conheceu_detalhes: formData.dadosPessoais.como_conheceu_detalhes || null,
    // Campos de endereço (salvos diretamente na tabela candidatos)
    cep: formData.endereco.cep || null,
    logradouro: formData.endereco.logradouro || null,
    numero: formData.endereco.numero || null,
    complemento: formData.endereco.complemento || null,
    bairro: formData.endereco.bairro || null,
    cidade: formData.endereco.cidade,
    estado: formData.endereco.estado,
  }
}

/**
 * Mapeia dados do formulário para insert em enderecos
 * FUNÇÃO REMOVIDA - Endereço é salvo diretamente na tabela candidatos
 */
// function mapToEnderecoInsert(
//   formData: CandidatoFormData,
//   candidatoId: string
// ): EnderecoInsert {
//   return {
//     candidato_id: candidatoId,
//     cep: formData.endereco.cep,
//     logradouro: formData.endereco.logradouro,
//     numero: formData.endereco.numero,
//     complemento: formData.endereco.complemento || null,
//     bairro: formData.endereco.bairro,
//     cidade: formData.endereco.cidade,
//     estado: formData.endereco.estado,
//     pais: 'Brasil',
//     endereco_principal: true,
//   }
// }

/**
 * Mapeia dados do formulário para insert em dados_profissionais
 * FUNÇÃO COMENTADA - Dados profissionais não são mais coletados no cadastro
 */
// function mapToDadosProfissionaisInsert(
//   formData: CandidatoFormData,
//   candidatoId: string
// ): DadosProfissionaisInsert {
//   // Mapear experiencia_area para possui_experiencia e anos_experiencia
//   const experienciaMap = {
//     nenhuma: { possui: false, anos: 0 },
//     menos_1_ano: { possui: true, anos: 0.5 },
//     '1_3_anos': { possui: true, anos: 2 },
//     '3_5_anos': { possui: true, anos: 4 },
//     mais_5_anos: { possui: true, anos: 5 },
//   }
//
//   const experiencia = experienciaMap[formData.dadosProfissionais.experiencia_area]
//
//   return {
//     candidato_id: candidatoId,
//     possui_experiencia: experiencia.possui,
//     anos_experiencia: experiencia.anos,
//     possui_cnh: formData.dadosProfissionais.possui_cnh,
//     categoria_cnh: formData.dadosProfissionais.categorias_cnh?.[0] || null,
//   }
// }

/**
 * Mapeia dados do formulário para insert em disponibilidade
 */
function mapToDisponibilidadeInsert(
  formData: CandidatoFormData,
  candidatoId: string
): DisponibilidadeInsert {
  // Mapear turno_preferido para periodo_disponivel
  const periodoMap = {
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite',
    integral: 'Integral',
  }

  // Mapear modelo_trabalho para regime_trabalho
  const regimeMap = {
    presencial: 'Presencial',
    remoto: 'Remoto',
    hibrido: 'Híbrido',
  }

  return {
    candidato_id: candidatoId,
    periodo_disponivel: periodoMap[formData.disponibilidade.turno_preferido],
    regime_trabalho: regimeMap[formData.disponibilidade.modelo_trabalho],
    data_disponibilidade: formData.disponibilidade.disponibilidade_imediata
      ? new Date().toISOString()
      : formData.disponibilidade.data_disponibilidade || null,
  }
}

/**
 * Mapeia dados do formulário para insert em autorizacoes
 */
function mapToAutorizacoesInsert(
  formData: CandidatoFormData,
  candidatoId: string
): AutorizacoesInsert {
  return {
    candidato_id: candidatoId,
    autorizacao_uso_dados: formData.autorizacoes.autorizacao_uso_dados,
    autorizacao_comunicacao: formData.autorizacoes.autorizacao_comunicacao,
    autorizacao_retencao_curriculo: formData.autorizacoes.autorizacao_retencao_curriculo,
    autorizacao_analise_video: formData.autorizacoes.autorizacao_analise_video,
  }
}

// ============================================
// ROLLBACK FUNCTIONS
// ============================================

/**
 * Executa rollback deletando usuário do Supabase Auth
 * Chamado quando alguma operação de insert falha
 */
async function rollbackAuth(userId: string): Promise<void> {
  console.warn(`[CADASTRO] Iniciando rollback: deletando usuário ${userId} do auth`)

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  if (error) {
    console.error('[CADASTRO] Erro ao fazer rollback do auth:', error)
    console.error('[CADASTRO]   Código:', error.code)
    console.error('[CADASTRO]   Mensagem:', error.message)
    throw new CadastroError(
      'Falha ao reverter criação de usuário. Contate o suporte.',
      'ROLLBACK_FAILED',
      'auth',
      error
    )
  }

  console.log(`[CADASTRO] Rollback completo: usuário ${userId} deletado do auth`)
}

/**
 * Executa rollback deletando registros do banco
 * Chamado quando alguma operação de insert falha após candidatos ser criado
 */
async function rollbackDatabase(
  userId: string,
  candidatoId?: string
): Promise<void> {
  console.warn('[CADASTRO] Iniciando rollback do banco de dados')
  console.log('[CADASTRO]   User ID:', userId)
  console.log('[CADASTRO]   Candidato ID:', candidatoId || 'N/A')

  // Se candidato foi criado, deletar
  if (candidatoId) {
    console.log('[CADASTRO]   Deletando candidato...')
    const { error: candidatoError } = await supabaseAdmin
      .from('candidatos')
      .delete()
      .eq('id', candidatoId)

    if (candidatoError) {
      console.error('[CADASTRO] Erro ao deletar candidato no rollback:', candidatoError)
      console.error('[CADASTRO]   Código:', candidatoError.code)
      console.error('[CADASTRO]   Mensagem:', candidatoError.message)
    } else {
      console.log('[CADASTRO] Candidato deletado com sucesso')
    }
  }

  // Sempre deletar usuário do auth
  await rollbackAuth(userId)
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Cadastra candidato completo em todas as tabelas
 *
 * Fluxo:
 * 1. Criar usuário no Supabase Auth
 * 2. Inserir em candidatos (com instagram e linkedin)
 * 3. Inserir em enderecos
 * 4. Inserir em disponibilidade (sem mobilidade)
 * 5. Inserir em autorizacoes
 *
 * NOTA: dados_profissionais não é mais inserido (Opção B - opcional)
 *
 * Se qualquer operação falhar, faz rollback automático
 *
 * @param data - Dados completos do formulário + senha
 * @returns IDs de todos os registros criados (sem dadosProfissionaisId)
 * @throws {CadastroError} Se alguma operação falhar
 *
 * @example
 * const result = await cadastrarCandidato(formData)
 * console.log(result.candidatoId) // UUID do candidato criado
 *
 * @note A senha é obtida de formData.dadosPessoais.senha
 */
export async function cadastrarCandidato(
  data: CandidatoFormData
): Promise<CadastroCompleteResult> {
  let userId: string | undefined
  let candidatoId: string | undefined

  console.log('[CADASTRO] Iniciando processo de cadastro completo')
  console.log('[CADASTRO] Email:', data.dadosPessoais.email)
  console.log('[CADASTRO] Nome:', data.dadosPessoais.nome_completo)

  try {
    // ============================================
    // STEP 1: Criar usuário no Supabase Auth
    // ============================================
    console.log('[CADASTRO] STEP 1: Criando usuário no Supabase Auth...')
    console.log('[CADASTRO]   Email:', data.dadosPessoais.email)

    const authResult = await signUp({
      email: data.dadosPessoais.email,
      password: data.dadosPessoais.senha,
      metadata: {
        nome_completo: data.dadosPessoais.nome_completo,
        cpf: data.dadosPessoais.cpf,
      },
    })

    userId = authResult.userId
    console.log(`[CADASTRO] STEP 1 concluído: Usuário criado com ID ${userId}`)

    // ============================================
    // STEP 2: Inserir em candidatos
    // ============================================
    console.log('[CADASTRO] STEP 2: Inserindo em candidatos...')

    const candidatoData = mapToCandidatoInsert(data, userId)
    console.log('[CADASTRO]   Dados do candidato:', {
      nome: candidatoData.nome_completo,
      cpf: candidatoData.cpf,
      email: candidatoData.email,
      celular: candidatoData.celular,
      cidade: candidatoData.cidade,
      estado: candidatoData.estado,
    })

    const { data: candidatoResult, error: candidatoError } = await supabaseAdmin
      .from('candidatos')
      .insert(candidatoData)
      .select('id')

    if (candidatoError || !candidatoResult || candidatoResult.length === 0) {
      console.error('[CADASTRO] Erro ao inserir candidato:', candidatoError)
      console.error('[CADASTRO]   Código:', candidatoError?.code)
      console.error('[CADASTRO]   Mensagem:', candidatoError?.message)
      console.error('[CADASTRO]   Detalhes:', candidatoError?.details)
      console.log('[CADASTRO] Iniciando rollback do auth...')
      await rollbackAuth(userId)
      throw new CadastroError(
        'Erro ao inserir dados do candidato no banco de dados',
        'INSERT_FAILED',
        'candidatos',
        candidatoError,
        candidatoError
      )
    }

    candidatoId = candidatoResult[0].id
    console.log(`[CADASTRO] STEP 2 concluído: Candidato criado com ID ${candidatoId}`)
    console.log('[CADASTRO]   Endereço salvo diretamente na tabela candidatos')

    // ============================================
    // STEP 3: Inserir em dados_profissionais (COMENTADO - OPÇÃO B)
    // ============================================
    // NOTA: Dados profissionais não são mais coletados no formulário de cadastro.
    // Esta tabela permanece no banco para dados históricos e pode ser preenchida
    // posteriormente através de outro processo.
    //
    // console.log('STEP 4: Inserindo em dados_profissionais...')
    //
    // const dadosProfissionaisData = mapToDadosProfissionaisInsert(data, candidatoId)
    //
    // const { data: dadosProfissionaisResult, error: dadosProfissionaisError } =
    //   await supabase
    //     .from('dados_profissionais')
    //     .insert(dadosProfissionaisData)
    //     .select('id')
    //
    // if (
    //   dadosProfissionaisError ||
    //   !dadosProfissionaisResult ||
    //   dadosProfissionaisResult.length === 0
    // ) {
    //   console.error('Erro ao inserir dados profissionais:', dadosProfissionaisError)
    //   await rollbackDatabase(userId, candidatoId)
    //   throw new CadastroError(
    //     'Erro ao inserir dados profissionais no banco de dados',
    //     'INSERT_FAILED',
    //     'dados_profissionais',
    //     dadosProfissionaisError,
    //     dadosProfissionaisError
    //   )
    // }
    //
    // const dadosProfissionaisId = dadosProfissionaisResult[0].id
    // console.log(`✓ Dados profissionais criados: ${dadosProfissionaisId}`)

    // ============================================
    // STEP 3: Inserir em disponibilidade
    // ============================================
    console.log('[CADASTRO] STEP 3: Inserindo em disponibilidade...')

    const disponibilidadeData = mapToDisponibilidadeInsert(data, candidatoId)
    console.log('   Período:', disponibilidadeData.periodo_disponivel, '| Regime:', disponibilidadeData.regime_trabalho)

    const { data: disponibilidadeResult, error: disponibilidadeError } = await supabaseAdmin
      .from('disponibilidade')
      .insert(disponibilidadeData)
      .select('id')

    if (
      disponibilidadeError ||
      !disponibilidadeResult ||
      disponibilidadeResult.length === 0
    ) {
      console.error('[CADASTRO] Erro ao inserir disponibilidade:', disponibilidadeError)
      console.error('[CADASTRO]   Código:', disponibilidadeError?.code)
      console.error('[CADASTRO]   Mensagem:', disponibilidadeError?.message)
      console.log('[CADASTRO] Iniciando rollback completo...')
      await rollbackDatabase(userId, candidatoId)
      throw new CadastroError(
        'Erro ao inserir disponibilidade no banco de dados',
        'INSERT_FAILED',
        'disponibilidade',
        disponibilidadeError,
        disponibilidadeError
      )
    }

    const disponibilidadeId = disponibilidadeResult[0].id
    console.log(`[CADASTRO] STEP 3 concluído: Disponibilidade criada com ID ${disponibilidadeId}`)

    // ============================================
    // STEP 4: Inserir em autorizacoes
    // ============================================
    console.log('[CADASTRO] STEP 4: Inserindo em autorizacoes...')

    const autorizacoesData = mapToAutorizacoesInsert(data, candidatoId)

    const { data: autorizacoesResult, error: autorizacoesError } = await supabaseAdmin
      .from('autorizacoes')
      .insert(autorizacoesData)
      .select('id')

    if (
      autorizacoesError ||
      !autorizacoesResult ||
      autorizacoesResult.length === 0
    ) {
      console.error('[CADASTRO] Erro ao inserir autorizações:', autorizacoesError)
      console.error('[CADASTRO]   Código:', autorizacoesError?.code)
      console.error('[CADASTRO]   Mensagem:', autorizacoesError?.message)
      console.log('[CADASTRO] Iniciando rollback completo...')
      await rollbackDatabase(userId, candidatoId)
      throw new CadastroError(
        'Erro ao inserir autorizações no banco de dados',
        'INSERT_FAILED',
        'autorizacoes',
        autorizacoesError,
        autorizacoesError
      )
    }

    const autorizacoesId = autorizacoesResult[0].id
    console.log(`[CADASTRO] STEP 4 concluído: Autorizações criadas com ID ${autorizacoesId}`)

    // ============================================
    // SUCCESS: Retornar todos os IDs
    // ============================================
    console.log('[CADASTRO] CADASTRO COMPLETO COM SUCESSO!')
    console.log('[CADASTRO] Resumo:')
    console.log('   - User ID:', userId)
    console.log('   - Candidato ID:', candidatoId)
    console.log('   - Disponibilidade ID:', disponibilidadeId)
    console.log('   - Autorizações ID:', autorizacoesId)

    return {
      userId,
      candidatoId,
      // enderecoId não é mais retornado (endereço salvo diretamente em candidatos)
      // dadosProfissionaisId não é mais retornado (não inserido)
      disponibilidadeId,
      autorizacoesId,
    }
  } catch (err) {
    // ============================================
    // ERROR HANDLING
    // ============================================
    console.error('[CADASTRO] Erro capturado no processo de cadastro')
    console.error('[CADASTRO]   Tipo:', err instanceof Error ? err.constructor.name : typeof err)
    console.error('[CADASTRO]   Mensagem:', err instanceof Error ? err.message : String(err))
    
    if (err instanceof Error && err.stack) {
      console.error('[CADASTRO]   Stack:', err.stack)
    }

    // Se erro já é CadastroError, apenas re-throw
    if (err instanceof CadastroError) {
      console.error('[CADASTRO]   Código:', err.code)
      console.error('[CADASTRO]   Tabela:', err.table || 'N/A')
      throw err
    }

    // Se erro é AuthError, fazer rollback e lançar CadastroError
    if (err instanceof AuthError) {
      console.error('[CADASTRO] Erro de autenticação detectado')
      console.error('[CADASTRO]   Código:', err.code)
      console.error('[CADASTRO]   Mensagem original:', err.originalError?.message || 'N/A')

      // Se userId foi criado, tentar fazer rollback
      if (userId) {
        console.log('[CADASTRO] Tentando fazer rollback do auth...')
        try {
          await rollbackAuth(userId)
        } catch (rollbackError) {
          console.error('[CADASTRO] Erro ao fazer rollback do auth:', rollbackError)
          // Se rollback falhar, lançar erro de rollback
          throw rollbackError
        }
      }

      throw new CadastroError(
        'Erro ao criar usuário no sistema de autenticação',
        'AUTH_FAILED',
        undefined,
        err
      )
    }

    // Erro desconhecido
    console.error('[CADASTRO] Erro desconhecido durante cadastro')
    console.error('[CADASTRO]   Erro completo:', err)

    // Tentar fazer rollback se possível
    if (userId) {
      console.log('[CADASTRO] Tentando fazer rollback completo...')
      try {
        await rollbackDatabase(userId, candidatoId)
        console.log('[CADASTRO] Rollback completo executado com sucesso')
      } catch (rollbackError) {
        console.error('[CADASTRO] Erro ao fazer rollback:', rollbackError)
        console.error('[CADASTRO]   ATENÇÃO: Rollback falhou! Dados podem estar inconsistentes.')
      }
    } else {
      console.log('[CADASTRO] Nenhum usuário foi criado, rollback não necessário')
    }

    throw new CadastroError(
      'Erro inesperado ao cadastrar candidato. Tente novamente.',
      'UNKNOWN_ERROR',
      undefined,
      err
    )
  }
}
