/**
 * Types TypeScript para o feature de cadastro
 *
 * Inclui:
 * - Types para form state (React Hook Form)
 * - Types para API requests/responses
 * - Types para database operations
 * - Types para submission e validação
 */

import type { Database } from '../../../../database.types'
import type {
  CandidatoFormData,
  DadosPessoaisData,
  EnderecoData,
  // DadosProfissionaisData, // Não coletado mais no cadastro (Opção B)
  DisponibilidadeData,
  AutorizacoesData,
} from '../schemas/candidatoSchema'

// ============================================
// DATABASE TYPES (extraídos do database.types.ts)
// ============================================

/**
 * Type para inserção na tabela candidatos
 */
export type CandidatoInsert = Database['public']['Tables']['candidatos']['Insert']

/**
 * Type para row da tabela candidatos
 */
export type CandidatoRow = Database['public']['Tables']['candidatos']['Row']

/**
 * Type para inserção na tabela enderecos
 */
export type EnderecoInsert = Database['public']['Tables']['enderecos']['Insert']

/**
 * Type para row da tabela enderecos
 */
export type EnderecoRow = Database['public']['Tables']['enderecos']['Row']

/**
 * Type para inserção na tabela dados_profissionais
 * NOTA: Tabela existe no banco mas não é usada durante cadastro (Opção B)
 */
export type DadosProfissionaisInsert =
  Database['public']['Tables']['dados_profissionais']['Insert']

/**
 * Type para row da tabela dados_profissionais
 * NOTA: Tabela existe no banco mas não é usada durante cadastro (Opção B)
 */
export type DadosProfissionaisRow =
  Database['public']['Tables']['dados_profissionais']['Row']

/**
 * Type para inserção na tabela disponibilidade
 */
export type DisponibilidadeInsert =
  Database['public']['Tables']['disponibilidade']['Insert']

/**
 * Type para row da tabela disponibilidade
 */
export type DisponibilidadeRow =
  Database['public']['Tables']['disponibilidade']['Row']

/**
 * Type para inserção na tabela autorizacoes
 */
export type AutorizacoesInsert =
  Database['public']['Tables']['autorizacoes']['Insert']

/**
 * Type para row da tabela autorizacoes
 */
export type AutorizacoesRow = Database['public']['Tables']['autorizacoes']['Row']

// ============================================
// FORM STATE TYPES
// ============================================

/**
 * State de cada seção do formulário multi-step
 */
export type FormStepStatus = 'pending' | 'completed' | 'error' | 'current'

/**
 * Seções do formulário multi-step (4 etapas - dados_profissionais removido)
 */
export type FormStep =
  | 'dadosPessoais'
  | 'endereco'
  // | 'dadosProfissionais' // Removido - não coletado mais (Opção B)
  | 'disponibilidade'
  | 'autorizacoes'

/**
 * State completo do formulário multi-step
 */
export interface FormMultiStepState {
  currentStep: FormStep
  completedSteps: FormStep[]
  formData: Partial<CandidatoFormData>
  isSubmitting: boolean
  submitError: string | null
}

/**
 * Actions do reducer do formulário multi-step
 */
export type FormMultiStepAction =
  | { type: 'NEXT_STEP'; payload: FormStep }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; payload: FormStep }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<CandidatoFormData> }
  | { type: 'MARK_STEP_COMPLETED'; payload: FormStep }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_SUBMIT_ERROR'; payload: string | null }
  | { type: 'RESET_FORM' }

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Payload para criação de candidato (4 tabelas - dados_profissionais não coletado)
 */
export interface CreateCandidatoPayload {
  // Dados para tabela candidatos
  candidato: {
    nome_completo: string
    cpf: string
    email: string
    telefone: string
    data_nascimento: string
    genero: 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_informar'
    instagram?: string | null
    linkedin?: string | null
    // user_id será preenchido após criação no Supabase Auth
  }

  // Dados para tabela enderecos
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento?: string | null
    bairro: string
    cidade: string
    estado: string
  }

  // Dados para tabela dados_profissionais - COMENTADO (Opção B)
  // dadosProfissionais: {
  //   experiencia_area: 'nenhuma' | 'menos_1_ano' | '1_3_anos' | '3_5_anos' | 'mais_5_anos'
  //   nivel_escolaridade:
  //     | 'fundamental_incompleto'
  //     | 'fundamental_completo'
  //     | 'medio_incompleto'
  //     | 'medio_completo'
  //     | 'superior_incompleto'
  //     | 'superior_completo'
  //     | 'pos_graduacao'
  //     | 'mestrado'
  //     | 'doutorado'
  //   instituicao_ensino?: string | null
  //   curso?: string | null
  //   ano_conclusao?: number | null
  //   possui_cnh: boolean
  //   categorias_cnh?: string[] | null
  // }

  // Dados para tabela disponibilidade (sem mobilidade)
  disponibilidade: {
    turno_preferido: 'manha' | 'tarde' | 'noite' | 'integral'
    modelo_trabalho: 'presencial' | 'remoto' | 'hibrido'
    disponibilidade_imediata: boolean
    data_disponibilidade?: string | null
    // aceita_viajar: boolean // Removido
    // aceita_mudanca: boolean // Removido
  }

  // Dados para tabela autorizacoes
  autorizacoes: {
    autorizacao_uso_dados: boolean
    autorizacao_comunicacao: boolean
    autorizacao_retencao_curriculo: boolean
    autorizacao_analise_video: boolean
  }
}

/**
 * Response da API ao criar candidato (sem dados_profissionais)
 */
export interface CreateCandidatoResponse {
  success: boolean
  data?: {
    candidato: CandidatoRow
    endereco: EnderecoRow
    // dadosProfissionais: DadosProfissionaisRow // Não criado mais (Opção B)
    disponibilidade: DisponibilidadeRow
    autorizacoes: AutorizacoesRow
  }
  error?: {
    message: string
    code: string
    details?: unknown
  }
}

/**
 * Response da verificação de duplicatas
 */
export interface DuplicateCheckResponse {
  isDuplicate: boolean
  existingField?: 'cpf' | 'email'
  candidatoId?: string
}

/**
 * Response da busca de CEP (ViaCEP)
 */
export interface ViaCEPResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string // cidade
  uf: string // estado
  ibge: string
  gia: string
  ddd: string
  siafi: string
  erro?: boolean // true se CEP não encontrado
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Resultado de validação de campo individual
 */
export interface FieldValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Resultado de validação de seção completa
 */
export interface SectionValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Type para erros do React Hook Form (sem dados_profissionais)
 */
export type FormErrors = {
  dadosPessoais?: Partial<Record<keyof DadosPessoaisData, string>>
  endereco?: Partial<Record<keyof EnderecoData, string>>
  // dadosProfissionais?: Partial<Record<keyof DadosProfissionaisData, string>> // Removido
  disponibilidade?: Partial<Record<keyof DisponibilidadeData, string>>
  autorizacoes?: Partial<Record<keyof AutorizacoesData, string>>
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Type helper para extrair keys de um objeto nested
 */
export type NestedKeyOf<T extends object> = {
  [Key in keyof T & (string | number)]: T[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<T[Key]>}`
    : `${Key}`
}[keyof T & (string | number)]

/**
 * Type helper para valores do formulário em formato de input
 * Usado para campos controlados do React Hook Form
 */
export type FormFieldValue = string | number | boolean | string[] | null | undefined

/**
 * Type para opções de select/radio/checkbox
 */
export interface FormOption<T = string> {
  value: T
  label: string
  disabled?: boolean
}

/**
 * Type para estado de loading de campos específicos
 */
export interface FieldLoadingState {
  cpfCheck: boolean
  emailCheck: boolean
  cepLookup: boolean
}

/**
 * Type para mapear form data para database inserts (sem dados_profissionais)
 */
export interface FormDataMapper {
  toCandidatoInsert: (
    formData: CandidatoFormData,
    userId: string
  ) => CandidatoInsert
  toEnderecoInsert: (
    formData: CandidatoFormData,
    candidatoId: string
  ) => EnderecoInsert
  // toDadosProfissionaisInsert: ( // Não usado mais (Opção B)
  //   formData: CandidatoFormData,
  //   candidatoId: string
  // ) => DadosProfissionaisInsert
  toDisponibilidadeInsert: (
    formData: CandidatoFormData,
    candidatoId: string
  ) => DisponibilidadeInsert
  toAutorizacoesInsert: (
    formData: CandidatoFormData,
    candidatoId: string
  ) => AutorizacoesInsert
}

// ============================================
// WEBHOOK TYPES (N8N Integration)
// ============================================

/**
 * Payload enviado para webhook N8N após cadastro
 */
export interface N8NWebhookPayload {
  event: 'candidato.created'
  timestamp: string
  data: {
    candidato: {
      id: string
      nome_completo: string
      email: string
      telefone: string
      cpf: string
    }
    metadata: {
      created_at: string
      has_all_data: boolean
    }
  }
}

/**
 * Response esperado do webhook N8N
 */
export interface N8NWebhookResponse {
  success: boolean
  workflow_execution_id?: string
  error?: string
}

// ============================================
// EXPORT TYPES (Re-export from schema)
// ============================================

// Re-export types do schema Zod para facilitar imports
export type {
  CandidatoFormData,
  DadosPessoaisData,
  EnderecoData,
  // DadosProfissionaisData, // Não usado mais (Opção B)
  DisponibilidadeData,
  AutorizacoesData,
}
