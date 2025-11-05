/**
 * Serviço de cadastro completo de candidato
 *
 * Realiza transação em 5 tabelas com rollback automático em caso de erro:
 * 1. Criar usuário no auth (signUp)
 * 2. Inserir em candidatos (com user_id)
 * 3. Inserir em enderecos (com candidato_id)
 * 4. Inserir em dados_profissionais (com candidato_id)
 * 5. Inserir em disponibilidade (com candidato_id)
 * 6. Inserir em autorizacoes (com candidato_id)
 *
 * Rollback automático se qualquer operação falhar
 *
 * @module cadastroService
 */

import { supabase } from '@/lib/supabase/client'
import { signUp, AuthError } from './authService'
import type { CandidatoFormData } from '../types'
import type {
  CandidatoInsert,
  EnderecoInsert,
  DadosProfissionaisInsert,
  DisponibilidadeInsert,
  AutorizacoesInsert,
} from '../types'

// ============================================
// TYPES E INTERFACES
// ============================================

/**
 * Dados completos para cadastro (formulário + senha)
 */
export interface CandidatoCompleteData extends CandidatoFormData {
  password: string
}

/**
 * Resultado completo do cadastro
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
   * ID do endereço na tabela enderecos
   */
  enderecoId: string

  /**
   * ID dos dados profissionais na tabela dados_profissionais
   */
  dadosProfissionaisId: string

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
 * Mapeia dados do formulário para insert em candidatos
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
    telefone: formData.dadosPessoais.telefone,
    data_nascimento: formData.dadosPessoais.data_nascimento,
    sexo: formData.dadosPessoais.genero, // Mapeamento: genero -> sexo
    status_processo: 'cadastro_completo',
    etapa_atual: 'triagem',
    progresso_processo: 10,
    data_cadastro: new Date().toISOString(),
  }
}

/**
 * Mapeia dados do formulário para insert em enderecos
 */
function mapToEnderecoInsert(
  formData: CandidatoFormData,
  candidatoId: string
): EnderecoInsert {
  return {
    candidato_id: candidatoId,
    cep: formData.endereco.cep,
    logradouro: formData.endereco.logradouro,
    numero: formData.endereco.numero,
    complemento: formData.endereco.complemento || null,
    bairro: formData.endereco.bairro,
    cidade: formData.endereco.cidade,
    estado: formData.endereco.estado,
    pais: 'Brasil',
    endereco_principal: true,
  }
}

/**
 * Mapeia dados do formulário para insert em dados_profissionais
 */
function mapToDadosProfissionaisInsert(
  formData: CandidatoFormData,
  candidatoId: string
): DadosProfissionaisInsert {
  // Mapear experiencia_area para possui_experiencia e anos_experiencia
  const experienciaMap = {
    nenhuma: { possui: false, anos: 0 },
    menos_1_ano: { possui: true, anos: 0.5 },
    '1_3_anos': { possui: true, anos: 2 },
    '3_5_anos': { possui: true, anos: 4 },
    mais_5_anos: { possui: true, anos: 5 },
  }

  const experiencia = experienciaMap[formData.dadosProfissionais.experiencia_area]

  return {
    candidato_id: candidatoId,
    possui_experiencia: experiencia.possui,
    anos_experiencia: experiencia.anos,
    possui_cnh: formData.dadosProfissionais.possui_cnh,
    categoria_cnh: formData.dadosProfissionais.categorias_cnh?.[0] || null,
  }
}

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
    presencial: ['Presencial'],
    remoto: ['Remoto'],
    hibrido: ['Presencial', 'Remoto'],
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
  const now = new Date().toISOString()

  return {
    candidato_id: candidatoId,
    consentimento_lgpd: formData.autorizacoes.autorizacao_uso_dados,
    consentimento_termos_uso: formData.autorizacoes.autorizacao_uso_dados,
    consentimento_politica_privacidade: formData.autorizacoes.autorizacao_uso_dados,
    consentimento_comunicacoes: formData.autorizacoes.autorizacao_comunicacao,
    consentimento_compartilhamento_dados:
      formData.autorizacoes.autorizacao_retencao_curriculo,
    consentimento_gravacao_video: formData.autorizacoes.autorizacao_analise_video,
    consentimento_ia: formData.autorizacoes.autorizacao_analise_video,
    data_consentimento_lgpd: formData.autorizacoes.autorizacao_uso_dados ? now : null,
    data_consentimento_termos: formData.autorizacoes.autorizacao_uso_dados ? now : null,
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
  console.warn(`Iniciando rollback: deletando usuário ${userId} do auth`)

  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    console.error('Erro ao fazer rollback do auth:', error)
    throw new CadastroError(
      'Falha ao reverter criação de usuário. Contate o suporte.',
      'ROLLBACK_FAILED',
      'auth',
      error
    )
  }

  console.log(`Rollback completo: usuário ${userId} deletado`)
}

/**
 * Executa rollback deletando registros do banco
 * Chamado quando alguma operação de insert falha após candidatos ser criado
 */
async function rollbackDatabase(
  userId: string,
  candidatoId?: string
): Promise<void> {
  console.warn('Iniciando rollback do banco de dados')

  // Se candidato foi criado, deletar
  if (candidatoId) {
    const { error: candidatoError } = await supabase
      .from('candidatos')
      .delete()
      .eq('id', candidatoId)

    if (candidatoError) {
      console.error('Erro ao deletar candidato no rollback:', candidatoError)
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
 * 2. Inserir em candidatos
 * 3. Inserir em enderecos
 * 4. Inserir em dados_profissionais
 * 5. Inserir em disponibilidade
 * 6. Inserir em autorizacoes
 *
 * Se qualquer operação falhar, faz rollback automático
 *
 * @param data - Dados completos do formulário + senha
 * @returns IDs de todos os registros criados
 * @throws {CadastroError} Se alguma operação falhar
 *
 * @example
 * const result = await cadastrarCandidato({
 *   ...formData,
 *   password: 'Senha123'
 * })
 * console.log(result.candidatoId) // UUID do candidato criado
 */
export async function cadastrarCandidato(
  data: CandidatoCompleteData
): Promise<CadastroCompleteResult> {
  let userId: string | undefined
  let candidatoId: string | undefined

  try {
    // ============================================
    // STEP 1: Criar usuário no Supabase Auth
    // ============================================
    console.log('STEP 1: Criando usuário no Supabase Auth...')

    const authResult = await signUp({
      email: data.dadosPessoais.email,
      password: data.password,
      metadata: {
        nome_completo: data.dadosPessoais.nome_completo,
        cpf: data.dadosPessoais.cpf,
      },
    })

    userId = authResult.userId
    console.log(`✓ Usuário criado: ${userId}`)

    // ============================================
    // STEP 2: Inserir em candidatos
    // ============================================
    console.log('STEP 2: Inserindo em candidatos...')

    const candidatoData = mapToCandidatoInsert(data, userId)

    const { data: candidatoResult, error: candidatoError } = await supabase
      .from('candidatos')
      .insert(candidatoData)
      .select('id')

    if (candidatoError || !candidatoResult || candidatoResult.length === 0) {
      console.error('Erro ao inserir candidato:', candidatoError)
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
    console.log(`✓ Candidato criado: ${candidatoId}`)

    // ============================================
    // STEP 3: Inserir em enderecos
    // ============================================
    console.log('STEP 3: Inserindo em enderecos...')

    const enderecoData = mapToEnderecoInsert(data, candidatoId)

    const { data: enderecoResult, error: enderecoError } = await supabase
      .from('enderecos')
      .insert(enderecoData)
      .select('id')

    if (enderecoError || !enderecoResult || enderecoResult.length === 0) {
      console.error('Erro ao inserir endereço:', enderecoError)
      await rollbackDatabase(userId, candidatoId)
      throw new CadastroError(
        'Erro ao inserir endereço no banco de dados',
        'INSERT_FAILED',
        'enderecos',
        enderecoError,
        enderecoError
      )
    }

    const enderecoId = enderecoResult[0].id
    console.log(`✓ Endereço criado: ${enderecoId}`)

    // ============================================
    // STEP 4: Inserir em dados_profissionais
    // ============================================
    console.log('STEP 4: Inserindo em dados_profissionais...')

    const dadosProfissionaisData = mapToDadosProfissionaisInsert(data, candidatoId)

    const { data: dadosProfissionaisResult, error: dadosProfissionaisError } =
      await supabase
        .from('dados_profissionais')
        .insert(dadosProfissionaisData)
        .select('id')

    if (
      dadosProfissionaisError ||
      !dadosProfissionaisResult ||
      dadosProfissionaisResult.length === 0
    ) {
      console.error('Erro ao inserir dados profissionais:', dadosProfissionaisError)
      await rollbackDatabase(userId, candidatoId)
      throw new CadastroError(
        'Erro ao inserir dados profissionais no banco de dados',
        'INSERT_FAILED',
        'dados_profissionais',
        dadosProfissionaisError,
        dadosProfissionaisError
      )
    }

    const dadosProfissionaisId = dadosProfissionaisResult[0].id
    console.log(`✓ Dados profissionais criados: ${dadosProfissionaisId}`)

    // ============================================
    // STEP 5: Inserir em disponibilidade
    // ============================================
    console.log('STEP 5: Inserindo em disponibilidade...')

    const disponibilidadeData = mapToDisponibilidadeInsert(data, candidatoId)

    const { data: disponibilidadeResult, error: disponibilidadeError } = await supabase
      .from('disponibilidade')
      .insert(disponibilidadeData)
      .select('id')

    if (
      disponibilidadeError ||
      !disponibilidadeResult ||
      disponibilidadeResult.length === 0
    ) {
      console.error('Erro ao inserir disponibilidade:', disponibilidadeError)
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
    console.log(`✓ Disponibilidade criada: ${disponibilidadeId}`)

    // ============================================
    // STEP 6: Inserir em autorizacoes
    // ============================================
    console.log('STEP 6: Inserindo em autorizacoes...')

    const autorizacoesData = mapToAutorizacoesInsert(data, candidatoId)

    const { data: autorizacoesResult, error: autorizacoesError } = await supabase
      .from('autorizacoes')
      .insert(autorizacoesData)
      .select('id')

    if (
      autorizacoesError ||
      !autorizacoesResult ||
      autorizacoesResult.length === 0
    ) {
      console.error('Erro ao inserir autorizações:', autorizacoesError)
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
    console.log(`✓ Autorizações criadas: ${autorizacoesId}`)

    // ============================================
    // SUCCESS: Retornar todos os IDs
    // ============================================
    console.log('✓ CADASTRO COMPLETO COM SUCESSO!')

    return {
      userId,
      candidatoId,
      enderecoId,
      dadosProfissionaisId,
      disponibilidadeId,
      autorizacoesId,
    }
  } catch (err) {
    // ============================================
    // ERROR HANDLING
    // ============================================

    // Se erro já é CadastroError, apenas re-throw
    if (err instanceof CadastroError) {
      throw err
    }

    // Se erro é AuthError, fazer rollback e lançar CadastroError
    if (err instanceof AuthError) {
      console.error('Erro de autenticação:', err)

      // Se userId foi criado, tentar fazer rollback
      if (userId) {
        try {
          await rollbackAuth(userId)
        } catch (rollbackError) {
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
    console.error('Erro desconhecido durante cadastro:', err)

    // Tentar fazer rollback se possível
    if (userId) {
      try {
        await rollbackDatabase(userId, candidatoId)
      } catch (rollbackError) {
        console.error('Erro ao fazer rollback:', rollbackError)
      }
    }

    throw new CadastroError(
      'Erro inesperado ao cadastrar candidato. Tente novamente.',
      'UNKNOWN_ERROR',
      undefined,
      err
    )
  }
}
