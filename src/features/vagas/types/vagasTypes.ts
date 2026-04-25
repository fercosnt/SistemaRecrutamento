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
// PERGUNTAS / RESPOSTAS DOMAIN TYPES (Phase 4 — CAND-02)
// ============================================

/**
 * Phase 4 / CAND-02 — Type alias derivado de Database para perguntas_formulario.
 *
 * Source of truth: database.types.ts (regenerado via `npm run db:types`).
 * NÃO redefinir manualmente — mantém sincronia com schema do Postgres.
 *
 * Uso: consumido por `useVagaPerguntas` (hook) + `buildCandidaturaSchema`
 * (Zod factory) na Plan 04-04.
 */
export type PerguntaFormulario =
  Database['public']['Tables']['perguntas_formulario']['Row']

/**
 * Phase 4 / CAND-02 — Enum value alias para tipo_resposta_pergunta.
 *
 * Valores válidos: 'texto_curto' | 'texto_longo' | 'single_choice' |
 *                  'multiple_choice' | 'numerico'
 *
 * Source: Database['public']['Enums']['tipo_resposta_pergunta'].
 */
export type TipoResposta =
  Database['public']['Enums']['tipo_resposta_pergunta']

// ============================================
// VAGA DOMAIN TYPES
// ============================================

/**
 * Tipo de contrato (tipo_contrato na tabela vagas)
 * IMPORTANTE: Valores devem corresponder exatamente aos valores no banco
 */
export type TipoVaga = 'CLT' | 'PJ'

/**
 * Departamento da vaga
 * IMPORTANTE: Valores devem corresponder exatamente aos valores no banco
 */
export type Departamento =
  | 'atendimento'
  | 'administrativo'
  | 'comercial'
  | 'clinico'
  | 'marketing'
  | 'recursos_humanos'
  | 'financeiro'
  | 'tecnologia'

/**
 * Nível de senioridade (nivel_senioridade na tabela vagas)
 * IMPORTANTE: Valores devem corresponder exatamente aos valores no banco
 */
export type NivelExperiencia =
  | 'Júnior'
  | 'Pleno'
  | 'Sênior'
  | 'Estagiário'

/**
 * Modelo de trabalho
 * IMPORTANTE: Valores devem corresponder exatamente aos valores no banco (com capitalização e acentos)
 */
export type ModeloTrabalho = 'Presencial' | 'Remoto' | 'Híbrido'

/**
 * Vaga com informações completas
 * Extends VagaRow com campos computados
 */
export interface Vaga extends VagaRow {
  // Campos computados/derivados
  diasDesdePublicacao?: number
  totalCandidatos?: number
  candidatosEmAnalise?: number
  candidatosAprovados?: number
  hasUserApplied?: boolean
}

/**
 * Vaga com join de candidaturas (para HR dashboard)
 */
export interface VagaComCandidaturas extends Vaga {
  candidaturas: CandidaturaRow[]
}

// ============================================
// VAGA HELPERS
// ============================================

/**
 * Formata localização da vaga a partir de cidade e estado
 * @param vaga - Vaga com cidade e estado
 * @returns String formatada "Cidade - UF" ou "Remoto" se não houver cidade
 */
export function formatarLocalizacaoVaga(vaga: Pick<VagaRow, 'cidade' | 'estado' | 'modelo_trabalho'>): string {
  // Se for remoto, retornar "Remoto"
  if (vaga.modelo_trabalho === 'Remoto') {
    return 'Remoto'
  }

  // Se tiver cidade e estado
  if (vaga.cidade && vaga.estado) {
    return `${vaga.cidade} - ${vaga.estado}`
  }

  // Se tiver apenas cidade
  if (vaga.cidade) {
    return vaga.cidade
  }

  // Se tiver apenas estado
  if (vaga.estado) {
    return vaga.estado
  }

  // Fallback
  return 'Não informado'
}

// ============================================
// CANDIDATURA DOMAIN TYPES
// ============================================

/**
 * Status da candidatura
 * IMPORTANTE: Valores devem corresponder exatamente ao enum status_candidatura do banco
 */
export type StatusCandidatura =
  | 'aguardando_resposta'
  | 'em_analise'
  | 'aprovado_proxima'
  | 'rejeitado'
  | 'finalizado'

/**
 * Etapa do processo seletivo (valores do ENUM PostgreSQL etapa_processo)
 * IMPORTANTE: Estes valores devem corresponder EXATAMENTE ao enum no banco!
 *
 * ORDEM DO PROCESSO SELETIVO:
 * 1. triagem → 2. bigfive → 3. disc → 4. entrevista_online →
 * 5. raven → 6. entrevista_presencial → 7. cultura → 8. avaliacao_final →
 * 9. aprovado OU rejeitado
 */
export type EtapaProcesso =
  | 'triagem'
  | 'bigfive'              // Teste Big Five (SEM underscore!)
  | 'disc'                 // Teste DISC
  | 'entrevista_online'    // Entrevista online (vídeo)
  | 'raven'                // Teste Cognitivo (antigo: Raven)
  | 'entrevista_presencial' // Entrevista presencial
  | 'cultura'              // Análise de fit cultural
  | 'avaliacao_final'      // Avaliação final (NOVO - requer migração DB)
  | 'aprovado'             // Aprovado final
  | 'rejeitado'            // Rejeitado final

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
 * Payload enviado para webhook N8N após mudança de status
 */
export interface N8NStatusUpdatePayload {
  event: 'candidatura.status_updated'
  timestamp: string
  data: {
    candidatura: {
      id: string
      candidato_id: string
      vaga_id: string
      status_anterior: StatusCandidatura
      status_novo: StatusCandidatura
      etapa_atual: EtapaProcesso
      motivo_rejeicao?: string
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
  aguardando_resposta: 'Aguardando Resposta',
  em_analise: 'Em Análise',
  aprovado_proxima: 'Aprovado - Próxima Etapa',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
}

/**
 * Mapeamento de etapas para labels
 * ORDEM: Triagem → Big Five → DISC → Online → Cognitivo → Presencial → Cultura → Avaliação Final → Aprovado/Rejeitado
 */
export const ETAPA_PROCESSO_LABELS: Record<EtapaProcesso, string> = {
  triagem: 'Triagem Inicial',
  bigfive: 'Teste Big Five',
  disc: 'Teste DISC',
  entrevista_online: 'Entrevista Online',
  raven: 'Teste Cognitivo',                    // ✅ RENOMEADO: era "Teste Raven (QI)"
  entrevista_presencial: 'Entrevista Presencial',  // ✅ REORDENADO: vem antes de Cultura
  cultura: 'Análise Cultural',                 // ✅ REORDENADO: vem depois de Presencial
  avaliacao_final: 'Avaliação Final',          // ✅ NOVO
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

/**
 * Cores para badges de status
 */
export const STATUS_COLORS: Record<
  StatusCandidatura,
  'default' | 'secondary' | 'success' | 'destructive' | 'outline'
> = {
  aguardando_resposta: 'default',
  em_analise: 'secondary',
  aprovado_proxima: 'success',
  rejeitado: 'destructive',
  finalizado: 'outline',
}

/**
 * Helper para calcular progresso percentual baseado na etapa
 * ORDEM CORRIGIDA: 10 etapas totais (incluindo Avaliação Final)
 */
export const ETAPA_PROGRESS: Record<EtapaProcesso, number> = {
  triagem: 10,                  // 1/10
  bigfive: 20,                  // 2/10
  disc: 30,                     // 3/10
  entrevista_online: 40,        // 4/10
  raven: 50,                    // 5/10 (Cognitivo)
  entrevista_presencial: 60,    // 6/10 ✅ REORDENADO
  cultura: 70,                  // 7/10 ✅ REORDENADO
  avaliacao_final: 80,          // 8/10 ✅ NOVO
  aprovado: 100,                // 10/10 - Final
  rejeitado: 0,                 // Rejeitado (sem progresso)
}

/**
 * Ordem sequencial das etapas do processo seletivo
 * Usado para avanço automático de etapa
 */
export const ETAPAS_SEQUENCIA: EtapaProcesso[] = [
  'triagem',
  'bigfive',
  'disc',
  'entrevista_online',
  'raven',
  'entrevista_presencial',
  'cultura',
  'avaliacao_final',
  'aprovado', // Estado final
  'rejeitado', // Estado final
]

/**
 * Retorna a próxima etapa na sequência
 * @param etapaAtual - Etapa atual do candidato
 * @returns Próxima etapa ou null se já estiver na última
 */
export function getProximaEtapa(etapaAtual: EtapaProcesso): EtapaProcesso | null {
  const index = ETAPAS_SEQUENCIA.indexOf(etapaAtual)

  // Se não encontrou ou já está em etapa final, retorna null
  if (index === -1 || index >= ETAPAS_SEQUENCIA.length - 1) {
    return null
  }

  // Retorna próxima etapa
  return ETAPAS_SEQUENCIA[index + 1]
}

// ============================================
// SCORE TYPES (Test Results)
// ============================================

/**
 * Scores Big Five (OCEAN model)
 */
export interface ScoresBigFive {
  score_openness: number // 0-100
  score_conscientiousness: number // 0-100
  score_extraversion: number // 0-100
  score_agreeableness: number // 0-100
  score_neuroticism: number // 0-100
}

/**
 * Scores DISC
 */
export interface ScoresDisc {
  perfil_primario: string // D, I, S, or C
  perfil_secundario: string // D, I, S, or C
}

/**
 * Scores Raven (Intelligence Test)
 */
export interface ScoresRaven {
  percentil: number // 0-100
  classificacao: string // Ex: "Superior", "Médio Superior", etc
}

/**
 * Candidatura com scores de testes incluídos (LEFT JOIN)
 */
export interface CandidaturaComScores extends Candidatura {
  scores_bigfive?: ScoresBigFive | null
  scores_disc?: ScoresDisc | null
  scores_raven?: ScoresRaven | null
  // analise_ia_cultura já está em Candidatura (JSONB)
  // score_geral já está em Candidatura (number 0-100) - MAIS IMPORTANTE
}

/**
 * Kanban stages for visual board
 */
export type KanbanStage = 'triagem' | 'testes' | 'cultura' | 'entrevista'

/**
 * Mapeamento de etapas para colunas Kanban
 */
export const ETAPA_TO_KANBAN: Record<EtapaProcesso, KanbanStage> = {
  triagem: 'triagem',
  big_five: 'testes',
  disc: 'testes',
  entrevista_telefonica: 'cultura',
  entrevista_presencial: 'entrevista',
  analise_final: 'entrevista',
  contratacao: 'entrevista',
}

/**
 * Labels para colunas Kanban
 */
export const KANBAN_STAGE_LABELS: Record<KanbanStage, string> = {
  triagem: '🔍 Triagem',
  testes: '📝 Testes',
  cultura: '❤️ Cultura',
  entrevista: '🎯 Entrevista',
}

// ============================================
// SCORE HELPER FUNCTIONS
// ============================================

/**
 * Calcula média dos scores Big Five
 * @param scores - Objeto com os 5 scores OCEAN
 * @returns Média arredondada (0-100) ou 0 se não houver scores
 */
export function calculateBigFiveAverage(
  scores?: ScoresBigFive | null
): number {
  if (!scores) return 0
  const sum =
    scores.score_openness +
    scores.score_conscientiousness +
    scores.score_extraversion +
    scores.score_agreeableness +
    scores.score_neuroticism
  return Math.round(sum / 5)
}

/**
 * Formata perfil DISC como string compacta
 * @param scores - Objeto com perfil primário e secundário
 * @returns String formatada (ex: "DI") ou "N/A"
 */
export function formatDiscProfile(scores?: ScoresDisc | null): string {
  if (!scores) return 'N/A'
  return `${scores.perfil_primario}${scores.perfil_secundario}`
}

/**
 * Extrai score de cultura da análise IA (JSONB)
 * @param analiseIACultura - JSONB com análise de cultura
 * @returns Score de cultura (0-100) ou 0
 */
export function getCultureScore(analiseIACultura?: any): number {
  if (!analiseIACultura) return 0
  // Ajustar conforme estrutura real do JSONB
  return analiseIACultura?.score || analiseIACultura?.cultura_score || 0
}

/**
 * Retorna cor para score (0-100)
 * @param score - Score numérico (0-100)
 * @returns Classe de cor Tailwind
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}
