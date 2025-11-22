/**
 * TypeScript Types para o feature de Vagas e Candidaturas
 *
 * Inclui:
 * - Types para Vagas (job openings)
 * - Types para Candidaturas (job applications)
 * - Types para filtros e ordenação
 * - Types para API requests/responses
 * - Types para N8N webhook integration
 */

import type { Database } from '../../../../database.types'

// ============================================
// DATABASE TYPES (extraídos do database.types.ts)
// ============================================

/**
 * Type para inserção na tabela vagas
 */
export type VagaInsert = Database['public']['Tables']['vagas']['Insert']

/**
 * Type para row da tabela vagas
 */
export type VagaRow = Database['public']['Tables']['vagas']['Row']

/**
 * Type para update na tabela vagas
 */
export type VagaUpdate = Database['public']['Tables']['vagas']['Update']

/**
 * Type para inserção na tabela candidaturas
 */
export type CandidaturaInsert =
  Database['public']['Tables']['candidaturas']['Insert']

/**
 * Type para row da tabela candidaturas
 */
export type CandidaturaRow = Database['public']['Tables']['candidaturas']['Row']

/**
 * Type para update na tabela candidaturas
 */
export type CandidaturaUpdate =
  Database['public']['Tables']['candidaturas']['Update']

/**
 * Type para row da tabela candidatos (referência)
 */
export type CandidatoRow = Database['public']['Tables']['candidatos']['Row']

// ============================================
// VAGA DOMAIN TYPES
// ============================================

/**
 * Tipo de vaga (contrato de trabalho)
 */
export type TipoVaga =
  | 'tempo_integral'
  | 'meio_periodo'
  | 'estagio'
  | 'temporario'

/**
 * Departamento da vaga
 */
export type Departamento =
  | 'atendimento'
  | 'administrativo'
  | 'clinica'
  | 'marketing'
  | 'ti'
  | 'financeiro'
  | 'rh'
  | 'outro'

/**
 * Nível de experiência requerido
 */
export type NivelExperiencia =
  | 'junior'
  | 'pleno'
  | 'senior'
  | 'estagiario'
  | 'trainee'

/**
 * Formato de trabalho
 */
export type ModeloTrabalho = 'presencial' | 'remoto' | 'hibrido'

/**
 * Vaga com informações completas
 * Extends VagaRow com campos computados
 */
export interface Vaga extends VagaRow {
  // Campos computados/derivados
  diasDesdePublicacao?: number
  totalCandidatos?: number
  hasUserApplied?: boolean
}

/**
 * Vaga com join de candidaturas (para HR dashboard)
 */
export interface VagaComCandidaturas extends Vaga {
  candidaturas: CandidaturaRow[]
}

// ============================================
// CANDIDATURA DOMAIN TYPES
// ============================================

/**
 * Status da candidatura
 */
export type StatusCandidatura =
  | 'aplicado'
  | 'em_analise'
  | 'em_teste'
  | 'em_entrevista'
  | 'aprovado'
  | 'rejeitado'

/**
 * Etapa do processo seletivo (7 etapas)
 */
export type EtapaProcesso =
  | 'triagem'
  | 'big_five'
  | 'disc'
  | 'entrevista_telefonica'
  | 'entrevista_presencial'
  | 'analise_final'
  | 'contratacao'

/**
 * Candidatura com informações completas
 * Extends CandidaturaRow com joins
 */
export interface Candidatura extends CandidaturaRow {
  // Join com vagas
  vaga?: Partial<VagaRow>
  // Join com candidatos
  candidato?: Partial<CandidatoRow>
  // Campos computados
  diasDesdeAplicacao?: number
  progressoPercentual?: number
}

/**
 * Candidatura com todos os joins (para listagem completa)
 */
export interface CandidaturaCompleta extends CandidaturaRow {
  vaga: VagaRow
  candidato: CandidatoRow
}

// ============================================
// FILTER & SORTING TYPES
// ============================================

/**
 * Filtros para listagem de vagas
 */
export interface VagasFilters {
  tipo_vaga?: TipoVaga | null
  localizacao?: string | null
  departamento?: Departamento | null
  modelo_trabalho?: ModeloTrabalho | null
  nivel_experiencia?: NivelExperiencia | null
  apenasAtivas?: boolean
  search?: string | null // Busca por título ou descrição
}

/**
 * Ordenação para listagem de vagas
 */
export type VagasOrderBy =
  | 'mais_recentes' // created_at DESC
  | 'alfabetica' // titulo ASC
  | 'localizacao' // localizacao ASC, titulo ASC
  | 'departamento' // departamento ASC, titulo ASC

/**
 * Filtros para candidaturas (dashboard candidato)
 */
export interface CandidaturasFilters {
  status?: StatusCandidatura | null
  etapa?: EtapaProcesso | null
  dataInicio?: string | null // ISO date
  dataFim?: string | null // ISO date
  vagaId?: string | null
}

/**
 * Ordenação para candidaturas
 */
export type CandidaturasOrderBy =
  | 'mais_recentes' // data_aplicacao DESC
  | 'status' // status_candidatura ASC
  | 'vaga' // vaga.titulo ASC

// ============================================
// PAGINATION TYPES
// ============================================

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page: number
  limit: number
}

/**
 * Response paginado genérico
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request para listar vagas
 */
export interface ListVagasRequest {
  filters?: VagasFilters
  orderBy?: VagasOrderBy
  pagination?: PaginationParams
}

/**
 * Response para listar vagas
 */
export interface ListVagasResponse extends PaginatedResponse<Vaga> {
  success: boolean
  error?: string
}

/**
 * Request para buscar vaga por ID
 */
export interface GetVagaRequest {
  vagaId: string
  candidatoId?: string // Para verificar se candidato já aplicou
}

/**
 * Response para buscar vaga por ID
 */
export interface GetVagaResponse {
  success: boolean
  data?: Vaga
  error?: string
}

/**
 * Request para criar candidatura
 */
export interface CreateCandidaturaRequest {
  candidato_id: string
  vaga_id: string
  // Campos opcionais com valores default
  status_candidatura?: StatusCandidatura
  etapa_atual?: EtapaProcesso
}

/**
 * Response para criar candidatura
 */
export interface CreateCandidaturaResponse {
  success: boolean
  data?: Candidatura
  error?: {
    message: string
    code: string
    details?: unknown
  }
}

/**
 * Request para listar candidaturas do candidato
 */
export interface ListCandidaturasRequest {
  candidatoId: string
  filters?: CandidaturasFilters
  orderBy?: CandidaturasOrderBy
  pagination?: PaginationParams
}

/**
 * Response para listar candidaturas
 */
export interface ListCandidaturasResponse
  extends PaginatedResponse<Candidatura> {
  success: boolean
  error?: string
}

/**
 * Request para verificar candidatura duplicada
 */
export interface CheckDuplicateApplicationRequest {
  candidatoId: string
  vagaId: string
}

/**
 * Response para verificar candidatura duplicada
 */
export interface CheckDuplicateApplicationResponse {
  isDuplicate: boolean
  candidaturaId?: string
  dataAplicacao?: string
}

/**
 * Request para update de status de candidatura (HR)
 */
export interface UpdateCandidaturaStatusRequest {
  candidaturaId: string
  status_candidatura: StatusCandidatura
  etapa_atual?: EtapaProcesso
  motivo_rejeicao?: string | null
  notificar_candidato?: boolean
}

/**
 * Response para update de status
 */
export interface UpdateCandidaturaStatusResponse {
  success: boolean
  data?: Candidatura
  error?: string
}

// ============================================
// WEBHOOK TYPES (N8N Integration)
// ============================================

/**
 * Payload enviado para webhook N8N após nova candidatura
 */
export interface N8NNovaCandidaturaPayload {
  event: 'candidatura.created'
  timestamp: string
  data: {
    candidatura: {
      id: string
      candidato_id: string
      vaga_id: string
      status_candidatura: StatusCandidatura
      etapa_atual: EtapaProcesso
      data_aplicacao: string
    }
    candidato: {
      id: string
      nome_completo: string
      email: string
      telefone: string
    }
    vaga: {
      id: string
      titulo: string
      localizacao: string
      departamento: string
    }
  }
}

/**
 * Response esperado do webhook N8N
 */
export interface N8NWebhookResponse {
  success: boolean
  workflow_execution_id?: string
  email_sent?: boolean
  error?: string
}

// ============================================
// FORM & UI STATE TYPES
// ============================================

/**
 * State do formulário de filtros
 */
export interface VagasFilterFormState {
  filters: VagasFilters
  activeFiltersCount: number
  isOpen: boolean
}

/**
 * State de loading para operações de candidatura
 */
export interface CandidaturaLoadingState {
  isSubmitting: boolean
  isCheckingDuplicate: boolean
  submitError: string | null
}

/**
 * Props para componente de card de vaga
 */
export interface VagaCardProps {
  vaga: Vaga
  hasApplied?: boolean
  onViewDetails: (vagaId: string) => void
  onApply: (vagaId: string) => void
  isApplying?: boolean
}

/**
 * Props para componente de filtro de vagas
 */
export interface VagasFilterProps {
  filters: VagasFilters
  onFilterChange: (filters: VagasFilters) => void
  onClearFilters: () => void
  activeFiltersCount: number
}

/**
 * Props para modal/página de detalhes da vaga
 */
export interface VagaDetalheProps {
  vaga: Vaga
  hasApplied: boolean
  isApplying: boolean
  onApply: () => void
  onClose?: () => void
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Type para opções de select
 */
export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
}

/**
 * Mapeamento de tipos de vaga para labels
 */
export const TIPO_VAGA_LABELS: Record<TipoVaga, string> = {
  tempo_integral: 'Tempo Integral',
  meio_periodo: 'Meio Período',
  estagio: 'Estágio',
  temporario: 'Temporário',
}

/**
 * Mapeamento de departamentos para labels
 */
export const DEPARTAMENTO_LABELS: Record<Departamento, string> = {
  atendimento: 'Atendimento',
  administrativo: 'Administrativo',
  clinica: 'Clínica',
  marketing: 'Marketing',
  ti: 'TI',
  financeiro: 'Financeiro',
  rh: 'RH',
  outro: 'Outro',
}

/**
 * Mapeamento de status de candidatura para labels
 */
export const STATUS_CANDIDATURA_LABELS: Record<StatusCandidatura, string> = {
  aplicado: 'Aplicado',
  em_analise: 'Em Análise',
  em_teste: 'Em Teste',
  em_entrevista: 'Em Entrevista',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

/**
 * Mapeamento de etapas para labels
 */
export const ETAPA_PROCESSO_LABELS: Record<EtapaProcesso, string> = {
  triagem: 'Triagem Inicial',
  big_five: 'Teste Big Five',
  disc: 'Teste DISC',
  entrevista_telefonica: 'Entrevista Telefônica',
  entrevista_presencial: 'Entrevista Presencial',
  analise_final: 'Análise Final',
  contratacao: 'Contratação',
}

/**
 * Cores para badges de status
 */
export const STATUS_COLORS: Record<
  StatusCandidatura,
  'default' | 'secondary' | 'success' | 'destructive' | 'outline'
> = {
  aplicado: 'default',
  em_analise: 'secondary',
  em_teste: 'secondary',
  em_entrevista: 'secondary',
  aprovado: 'success',
  rejeitado: 'destructive',
}

/**
 * Helper para calcular progresso percentual baseado na etapa
 */
export const ETAPA_PROGRESS: Record<EtapaProcesso, number> = {
  triagem: 14, // 1/7
  big_five: 28, // 2/7
  disc: 42, // 3/7
  entrevista_telefonica: 57, // 4/7
  entrevista_presencial: 71, // 5/7
  analise_final: 85, // 6/7
  contratacao: 100, // 7/7
}
