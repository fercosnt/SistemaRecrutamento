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
 * Etapa do processo seletivo — ALIAS do enum `etapa_processo` do DB (funil M2).
 *
 * Phase 25 / FUNIL-03/06 (A12/A16): o enum M1 de 10 valores
 * (triagem/big-five/disc/raven/cultura/avaliacao-final) foi DERRUBADO do banco pelo
 * cutover `20260607000002_etapa_processo_v2_cutover.sql`. Selecionar um valor morto
 * gerava um filtro eq sobre etapa_atual → Postgres 22P02 (invalid enum). Este tipo agora
 * re-aponta para a fonte única `Database['public']['Enums']['etapa_processo']`, os 8
 * valores reais (6 etapas + 2 terminais): inscricao, triagem, avaliacao_assincrona,
 * entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado.
 *
 * O NOME é preservado de propósito (Pitfall 6): 5 campos de interface o consomem — ao
 * re-aliasar, todos se auto-corrigem. Os rótulos vivem em
 * `triagemService.ETAPA_M2_LABELS` (fonte única — NÃO recriar um segundo map aqui).
 */
export type EtapaProcesso = Database['public']['Enums']['etapa_processo']

/** 48-14 (JORN-19) — as duas colunas de `decisao_final` que o candidato lê. */
export interface EstadoReabertura {
  reaberta_em: string | null
  prazo_nova_decisao_em: string | null
}

/**
 * Candidatura com informações completas
 * Extends CandidaturaRow com joins
 */
export interface Candidatura extends CandidaturaRow {
  // Join com vagas
  vaga?: Partial<VagaRow>
  // Join com candidatos
  candidato?: Partial<CandidatoRow>
  /**
   * 48-14 (JORN-19) — embed do select do candidato: SÓ o estado da reabertura. O PostgREST
   * devolve objeto (relação um-para-um pela UNIQUE de `candidatura_id`) ou `null`; o array é
   * tratado defensivamente por quem lê (`estadoReabertura`).
   */
  decisao_final?: EstadoReabertura | EstadoReabertura[] | null
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
  // 48-16 (JORN-15): `notificar_candidato` saiu — nenhum código o honrava (o disparo do
  // n8n foi aposentado na P39) e o modal que o enviava prometia um e-mail que não existia.
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
 * Phase 25 / FUNIL-06: ETAPA_PROCESSO_LABELS (map M1 morto) removido.
 * A fonte única de rótulos de etapa é `triagemService.ETAPA_M2_LABELS`.
 */

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
 * Phase 25 / FUNIL-06 (A16): ETAPA_PROGRESS, ETAPAS_SEQUENCIA e o helper de
 * próxima-etapa (o auto-avanço M1 — vetor de crash 22P02 triagem→big-five) foram REMOVIDOS.
 * A movimentação de etapa passa pelo caminho M2 server-authoritative
 * (`triagemService.updateCandidaturaEtapa` → trigger `avancar_etapa`, que valida +
 * audita a transição). Nenhum map M1 de valores mortos sobrevive neste arquivo.
 */

// ============================================
// SCORE TYPES (Test Results)
// ============================================

/**
 * Phase 49 / 49-04 (JORN-13): `ScoresBigFive` e `ScoresDisc` foram REMOVIDOS junto com
 * os embeds `scores_bigfive` / `scores_disc`. As duas tabelas têm **0 linhas em PROD**
 * (medido em 2026-09-22) e o DISC não existe no produto — os tipos descreviam uma fonte
 * que nunca respondeu, e os helpers que os liam devolviam `0`, que a tela pintava como
 * nota. A fonte viva de notas é `scores_candidato`.
 */

/**
 * Linha de `scores_candidato` como as LISTAS do RH a leem — exatamente a projeção de
 * `EMBEDS_NOTAS_CARD` (`candidaturasService.ts`), não a tabela inteira.
 *
 * ⚠ `tipo='big_five'` existe com `score` **NULL por desenho** (avaliação comportamental
 * não avaliativa, UX-07/RNF-07a; as dimensões moram em `metadata`). Ler `score` dela como
 * nota é o defeito que o D-31 nomeia.
 */
export interface ScoreCandidatoRow {
  tipo: string | null
  status: string | null
  score: number | null
  score_max: number | null
}

/**
 * Sinal de «a pessoa FEZ a redação» — só o `id` viaja (D-32). A sugestão de nota da IA
 * que mora em `redacoes_candidato` NUNCA chega à tela como nota de Cultura.
 */
export interface RedacaoSinal {
  id: string
}

/**
 * Percentil bruto do Raven como as listas do RH o leem. Ele NUNCA é exibido: virou
 * insumo de `cognitivoBanda` (D-33/D-64). A `classificacao` por extenso do instrumento
 * NÃO entra — não é o vocabulário das telas do RH.
 */
export interface ScoresRavenPercentil {
  percentil: number | null
}

/**
 * Candidatura com as notas que as listas do RH leem (LEFT JOIN).
 *
 * `scores_candidato` e `redacoes_candidato` chegam como ARRAY (relação to-many no
 * PostgREST); `scores_raven` chega como OBJETO (a PK dela é `candidatura_id`, então o
 * PostgREST detecta to-one). Medido no catálogo em 2026-09-22.
 */
export interface CandidaturaComScores extends Candidatura {
  scores_candidato?: ScoreCandidatoRow[] | null
  redacoes_candidato?: RedacaoSinal[] | null
  scores_raven?: ScoresRavenPercentil | null
  // `analise_ia_cultura` (JSONB) e `score_geral` seguem em Candidatura — e seguem
  // 0 de 39 em PROD. Nenhum dos dois é fonte de célula do card (D-32).
}

/**
 * Phase 25 / FUNIL-03/06: KanbanStage, ETAPA_TO_KANBAN e KANBAN_STAGE_LABELS
 * (mapa Kanban→etapa M1 morto, com chaves inexistentes big_five/entrevista_telefonica/
 * analise_final/contratacao) foram REMOVIDOS. O KanbanBoard agora deriva suas colunas
 * dos 6 estágios reais via `triagemService.ETAPA_M2_LABELS`.
 */

// ============================================
// SCORE HELPER FUNCTIONS
// ============================================

/**
 * Phase 49 / 49-04 (JORN-13, D-31/D-32): `calculateBigFiveAverage`, `formatDiscProfile` e
 * `getCultureScore` foram REMOVIDOS. Os três compartilhavam o mesmo defeito de forma —
 * **devolviam um valor de nota quando a fonte não tinha dado** (`0`, `0` e `'N/A'`), e o
 * `?? 'N/A'` do card nunca disparava porque `0` não é nullish. Resultado medido no kickoff:
 * 38 cards mostrando `0` pintado de vermelho, indistinguível de uma nota real de zero.
 *
 * O substituto NÃO é «devolver null»: é devolver **ESTADO TIPADO** (`EstadoCultura`,
 * `EstadoBigFive`, `EstadoInteligencia`), para que «não fez» e «aguardando revisão» sejam
 * casos que a tela é OBRIGADA a tratar, em vez de valores que ela pode confundir com nota.
 */

/**
 * Estado da célula **Cultura** do card do RH.
 *
 * `nota` é a ÚNICA forma que carrega número — e só existe quando um humano revisou a
 * redação: a linha `scores_candidato` `tipo='redacao'` / `status='sucesso'` (0–100,
 * `score_max=100`), gravada por `sincronizar_score_redacao` (conferida ao vivo por
 * `pg_get_functiondef` em 2026-09-22). A sugestão da IA nunca vira `nota` (D-32, RNF-07a).
 */
export type EstadoCultura =
  | { estado: 'nota'; valor: number }
  | { estado: 'aguardando_revisao' }
  | { estado: 'nao_fez' }

/**
 * Deriva o estado da célula Cultura das DUAS fontes que o card recebe.
 *
 * @param scoresCandidato - linhas de `scores_candidato` da candidatura (array to-many)
 * @param redacoes - sinal de existência de redação (`redacoes_candidato`, só o `id`)
 *
 * Ordem das perguntas, e cada uma existe por um motivo:
 * 1. Há linha `redacao`/`sucesso` com `score`? → `nota`. É a nota revisada por humano.
 * 2. Há QUALQUER sinal de redação (linha `redacao` em outro status, ou redação enviada
 *    ainda sem linha de score)? → `aguardando_revisao`. Inclui `pendente_humano`, que é
 *    justamente o estado em que a nota que existe é a da IA — e ela não vai à tela.
 * 3. Nada? → `nao_fez`. **Nunca `0`.**
 */
export function estadoCultura(
  scoresCandidato?: ScoreCandidatoRow[] | null,
  redacoes?: RedacaoSinal[] | null
): EstadoCultura {
  const linhas = scoresCandidato ?? []
  const revisada = linhas.find(
    (s) =>
      s?.tipo === 'redacao' &&
      s?.status === 'sucesso' &&
      typeof s?.score === 'number'
  )
  if (revisada && typeof revisada.score === 'number') {
    return { estado: 'nota', valor: Math.round(revisada.score) }
  }

  const fezRedacao =
    (redacoes ?? []).length > 0 || linhas.some((s) => s?.tipo === 'redacao')

  return fezRedacao ? { estado: 'aguardando_revisao' } : { estado: 'nao_fez' }
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
