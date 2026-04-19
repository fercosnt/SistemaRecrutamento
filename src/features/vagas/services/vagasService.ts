/**
 * Serviço de Vagas (Job Openings)
 *
 * Features:
 * - Listar vagas ativas com filtros
 * - Buscar vaga por ID
 * - Verificar se candidato já aplicou
 * - Ordenação e paginação
 *
 * @module features/vagas/services/vagasService
 */

import { supabase } from '@/lib/supabase/client'
import type {
  Vaga,
  VagaRow,
  VagasFilters,
  VagasOrderBy,
  PaginationParams,
  ListVagasResponse,
  GetVagaResponse,
  CandidaturaRow,
} from '../types/vagasTypes'

/**
 * Custom Error para operações de vagas
 */
export class VagasServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown
  ) {
    super(message)
    this.name = 'VagasServiceError'
  }
}

/**
 * Calcula número de dias desde a publicação
 *
 * @param createdAt - Data de criação (ISO string)
 * @returns Número de dias desde criação
 */
export function calcularDiasDesdePublicacao(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Enriquece vaga com campos computados
 *
 * @param vaga - Vaga do banco
 * @param candidatoId - ID do candidato (opcional)
 * @returns Vaga enriquecida
 */
async function enriquecerVaga(
  vaga: VagaRow,
  candidatoId?: string
): Promise<Vaga> {
  const vagaEnriquecida: Vaga = {
    ...vaga,
    diasDesdePublicacao: calcularDiasDesdePublicacao(vaga.created_at),
  }

  // Se candidatoId fornecido, verificar se já aplicou
  if (candidatoId) {
    const { data: candidaturas } = await supabase
      .from('candidaturas')
      .select('id')
      .eq('vaga_id', vaga.id)
      .eq('candidato_id', candidatoId)
      .is('deleted_at', null)

    vagaEnriquecida.hasUserApplied = (candidaturas?.length ?? 0) > 0
  }

  // Contar total de candidatos
  const { count: totalCount } = await supabase
    .from('candidaturas')
    .select('*', { count: 'exact', head: true })
    .eq('vaga_id', vaga.id)
    .is('deleted_at', null)

  vagaEnriquecida.totalCandidatos = totalCount ?? 0

  // Contar candidatos em análise
  const { count: emAnaliseCount } = await supabase
    .from('candidaturas')
    .select('*', { count: 'exact', head: true })
    .eq('vaga_id', vaga.id)
    .eq('status', 'em_analise')
    .is('deleted_at', null)

  vagaEnriquecida.candidatosEmAnalise = emAnaliseCount ?? 0

  // Contar candidatos aprovados (para próxima etapa)
  const { count: aprovadosCount } = await supabase
    .from('candidaturas')
    .select('*', { count: 'exact', head: true })
    .eq('vaga_id', vaga.id)
    .eq('status', 'aprovado_proxima')
    .is('deleted_at', null)

  vagaEnriquecida.candidatosAprovados = aprovadosCount ?? 0

  return vagaEnriquecida
}

/**
 * Constrói query Supabase com filtros aplicados
 *
 * @param filters - Filtros a aplicar
 * @returns Query do Supabase
 */
function buildVagasQuery(filters?: VagasFilters) {
  let query = supabase
    .from('vagas')
    .select('*', { count: 'exact' })
    .is('deleted_at', null) // Sempre excluir deletadas

  // Filtro padrão: apenas ativas (a menos que explicitamente desabilitado)
  if (filters?.apenasAtivas !== false) {
    query = query.eq('status', 'ativa')
  }

  // Filtro por tipo de contrato (tipo_vaga → tipo_contrato)
  if (filters?.tipo_vaga) {
    query = query.eq('tipo_contrato', filters.tipo_vaga)
  }

  // Filtro por localização (usando cidade)
  if (filters?.localizacao) {
    query = query.eq('cidade', filters.localizacao)
  }

  // Filtro por departamento
  if (filters?.departamento) {
    query = query.eq('departamento', filters.departamento)
  }

  // Filtro por modelo de trabalho
  if (filters?.modelo_trabalho) {
    query = query.eq('modelo_trabalho', filters.modelo_trabalho)
  }

  // Filtro por nível de senioridade (nivel_experiencia → nivel_senioridade)
  if (filters?.nivel_experiencia) {
    query = query.eq('nivel_senioridade', filters.nivel_experiencia)
  }

  // Busca textual (título ou descricao_curta - não "descricao")
  if (filters?.search && filters.search.trim()) {
    const searchTerm = `%${filters.search.trim()}%`
    query = query.or(`titulo.ilike.${searchTerm},descricao_curta.ilike.${searchTerm}`)
  }

  return query
}

/**
 * Aplica ordenação à query
 *
 * @param query - Query Supabase
 * @param orderBy - Tipo de ordenação
 * @returns Query com ordenação aplicada
 */
function applyOrdering(query: ReturnType<typeof buildVagasQuery>, orderBy: VagasOrderBy) {
  switch (orderBy) {
    case 'mais_recentes':
      return query.order('created_at', { ascending: false })

    case 'alfabetica':
      return query.order('titulo', { ascending: true })

    case 'localizacao':
      return query
        .order('cidade', { ascending: true })
        .order('estado', { ascending: true })
        .order('titulo', { ascending: true })

    case 'departamento':
      return query
        .order('departamento', { ascending: true })
        .order('titulo', { ascending: true })

    default:
      return query.order('created_at', { ascending: false })
  }
}

/**
 * Lista vagas com filtros, ordenação e paginação
 *
 * @param params - Parâmetros de listagem
 * @param candidatoId - ID do candidato (para verificar aplicações)
 * @returns Lista paginada de vagas
 *
 * @throws {VagasServiceError} Se houver erro na busca
 *
 * @example
 * const response = await listVagas({
 *   filters: { departamento: 'atendimento', apenasAtivas: true },
 *   orderBy: 'mais_recentes',
 *   pagination: { page: 1, limit: 12 }
 * })
 */
export async function listVagas(
  params: {
    filters?: VagasFilters
    orderBy?: VagasOrderBy
    pagination?: PaginationParams
  } = {},
  candidatoId?: string
): Promise<ListVagasResponse> {
  try {
    const { filters, orderBy = 'mais_recentes', pagination = { page: 1, limit: 12 } } = params

    // Validar paginação
    if (pagination.page < 1) {
      throw new VagasServiceError(
        'Página deve ser >= 1',
        'INVALID_INPUT'
      )
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new VagasServiceError(
        'Limit deve estar entre 1 e 100',
        'INVALID_INPUT'
      )
    }

    // Construir query
    let query = buildVagasQuery(filters)

    // Aplicar ordenação
    query = applyOrdering(query, orderBy)

    // Aplicar paginação
    const from = (pagination.page - 1) * pagination.limit
    const to = from + pagination.limit - 1
    query = query.range(from, to)

    // Executar query
    const { data, error, count } = await query

    if (error) {
      throw new VagasServiceError(
        `Erro ao buscar vagas: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      throw new VagasServiceError(
        'Resposta vazia do banco de dados',
        'DATABASE_ERROR'
      )
    }

    // Enriquecer vagas com campos computados
    const vagasEnriquecidas = await Promise.all(
      data.map((vaga) => enriquecerVaga(vaga, candidatoId))
    )

    const total = count ?? 0
    const totalPages = Math.ceil(total / pagination.limit)

    return {
      success: true,
      data: vagasEnriquecidas,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasMore: pagination.page < totalPages,
      },
    }
  } catch (error) {
    if (error instanceof VagasServiceError) {
      throw error
    }

    // Erro inesperado
    throw new VagasServiceError(
      'Erro inesperado ao listar vagas',
      'NETWORK_ERROR',
      error
    )
  }
}

/**
 * Busca vaga por ID com informações completas
 *
 * @param vagaId - UUID da vaga
 * @param candidatoId - ID do candidato (para verificar se já aplicou)
 * @returns Vaga encontrada
 *
 * @throws {VagasServiceError} Se vaga não encontrada ou erro na busca
 *
 * @example
 * const response = await getVagaById('abc-123', 'candidato-456')
 */
export async function getVagaById(
  vagaId: string,
  candidatoId?: string
): Promise<GetVagaResponse> {
  try {
    // Validar UUID
    if (!vagaId || vagaId.trim() === '') {
      throw new VagasServiceError(
        'ID da vaga inválido',
        'INVALID_INPUT'
      )
    }

    // Buscar vaga
    const { data, error } = await supabase
      .from('vagas')
      .select('*')
      .eq('id', vagaId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        throw new VagasServiceError(
          'Vaga não encontrada',
          'NOT_FOUND',
          error
        )
      }

      throw new VagasServiceError(
        `Erro ao buscar vaga: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      throw new VagasServiceError(
        'Vaga não encontrada',
        'NOT_FOUND'
      )
    }

    // Enriquecer vaga
    const vagaEnriquecida = await enriquecerVaga(data, candidatoId)

    return {
      success: true,
      data: vagaEnriquecida,
    }
  } catch (error) {
    if (error instanceof VagasServiceError) {
      return {
        success: false,
        error: error.message,
      }
    }

    // Erro inesperado
    return {
      success: false,
      error: 'Erro inesperado ao buscar vaga',
    }
  }
}

/**
 * Verifica se candidato já aplicou para uma vaga
 *
 * @param candidatoId - UUID do candidato
 * @param vagaId - UUID da vaga
 * @returns True se já aplicou, false caso contrário
 *
 * @throws {VagasServiceError} Se houver erro na verificação
 *
 * @example
 * const hasApplied = await checkIfCandidatoApplied('candidato-123', 'vaga-456')
 */
export async function checkIfCandidatoApplied(
  candidatoId: string,
  vagaId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('candidaturas')
      .select('id')
      .eq('candidato_id', candidatoId)
      .eq('vaga_id', vagaId)
      .is('deleted_at', null)

    if (error) {
      throw new VagasServiceError(
        `Erro ao verificar candidatura: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    return (data?.length ?? 0) > 0
  } catch (error) {
    if (error instanceof VagasServiceError) {
      throw error
    }

    throw new VagasServiceError(
      'Erro inesperado ao verificar candidatura',
      'NETWORK_ERROR',
      error
    )
  }
}
