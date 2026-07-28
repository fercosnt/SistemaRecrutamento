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
 * @param candidatoId - ID do candidato (opcional; gate do `hasUserApplied`)
 * @param includeCounts - Quando true, executa a query de contagem por status
 *   (total / emAnálise / aprovados), independentemente de `candidatoId`.
 *   Threaded por `useVagas` para sessões autenticadas (RH / administrador /
 *   candidato). Anon → false. Ver Plan 25-09 (fecha gap UX-06 das tiles RH).
 * @returns Vaga enriquecida
 */
async function enriquecerVaga(
  vaga: VagaRow,
  candidatoId?: string,
  includeCounts?: boolean
): Promise<Vaga> {
  const vagaEnriquecida: Vaga = {
    ...vaga,
    diasDesdePublicacao: calcularDiasDesdePublicacao(vaga.created_at),
  }

  // WR-10 (Phase 4 review iteration 2 fix): defense-in-depth — anonymous
  // browsers do NOT need real candidate counts on /vagas or /vagas/:slug.
  // Today's Phase 1 RLS policy on `candidaturas` is `candidato_id = auth.uid()`
  // and anon has no uid, so the previous query already returned zero rows for
  // anon. But: (1) it relied on RLS-policy correctness (a future migration
  // adding an OR-true clause would silently expose real counts), and (2) the
  // WR-06 collapse traded count integers for the full status[] array, so a
  // future RLS bug would leak both totalCandidatos AND the status-enum
  // distribution per vaga (competitive-intelligence enumeration signal).
  //
  // Skipping the read for anon both removes the RLS-bug blast radius and
  // closes one of the round-trips D-17 (Phase 5 list-batch optimization)
  // is targeting: 12 vagas × 0 queries = 0 trips for anon visitors.
  //
  // Plan 25-09: the early-return now gates on BOTH signals. An anonymous
  // visitor has NEITHER a candidatoId (no session) NOR includeCounts (no RH
  // context) → skip entirely, preserving the WR-10 blast-radius guard. An RH /
  // administrador session (authStore.candidato === null, so no candidatoId)
  // passes includeCounts=true and therefore DOES reach the count query below —
  // that is the whole point of this gap-closure (RH tiles were structurally 0).
  if (!candidatoId && !includeCounts) {
    return vagaEnriquecida
  }

  // `hasUserApplied` só faz sentido para uma sessão de candidato — computado
  // apenas quando há candidatoId (uma sessão RH não tem, e não deve gerar
  // este round-trip).
  if (candidatoId) {
    const { data: candidaturas } = await supabase
      .from('candidaturas')
      .select('id')
      .eq('vaga_id', vaga.id)
      .eq('candidato_id', candidatoId)
      .is('deleted_at', null)

    vagaEnriquecida.hasUserApplied = (candidaturas?.length ?? 0) > 0
  }

  // WR-06 (Phase 4 review fix): collapse the previous 3 sequential `count: 'exact'`
  // queries (totalCandidatos / candidatosEmAnalise / candidatosAprovados — D-17
  // deferred to Phase 5 hardening) into a single SELECT that returns each
  // candidatura's status, then bucket client-side. The previous shape issued
  // up to 3 round-trips per vaga; combined with `listVagas` Promise.all fan-out
  // this amplified to 36-48 round-trips per 12-vaga page. Same WHERE clause +
  // RLS context — the new query touches the exact same rows the count queries
  // would have, just reads the `status` column instead of asking for `count`.
  // On RLS deny, supabase returns data=null which collapses to all-zero (the
  // same behavior as the old count queries on RLS deny).
  //
  // Plan 25-09: driven by `includeCounts` (not candidatoId) so RH/administrador
  // sessions get real per-vaga tiles. RLS still scopes the visible rows — a
  // candidate sees only their own candidaturas; an RH session sees candidaturas
  // of the vagas they own (administrador reads all). Anon never reaches here.
  if (includeCounts) {
    const { data: statusRows } = await supabase
      .from('candidaturas')
      .select('status')
      .eq('vaga_id', vaga.id)
      .is('deleted_at', null)

    const rows = (statusRows ?? []) as Array<{ status: string | null }>
    let total = 0
    let emAnalise = 0
    let aprovados = 0
    for (const row of rows) {
      total += 1
      if (row.status === 'em_analise') emAnalise += 1
      else if (row.status === 'aprovado_proxima') aprovados += 1
    }

    vagaEnriquecida.totalCandidatos = total
    vagaEnriquecida.candidatosEmAnalise = emAnalise
    vagaEnriquecida.candidatosAprovados = aprovados
  }

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
  candidatoId?: string,
  includeCounts?: boolean
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
      data.map((vaga) => enriquecerVaga(vaga, candidatoId, includeCounts))
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

    // Enriquecer vaga. Preserva o comportamento pré-25-09 dos detalhes: as
    // contagens rodavam sse-e-somente-se havia candidatoId → includeCounts =
    // !!candidatoId mantém isso idêntico (anon → nem hasUserApplied nem counts).
    const vagaEnriquecida = await enriquecerVaga(data, candidatoId, !!candidatoId)

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
 * Phase 4 / VAGA-02 — Busca vaga pelo slug (URL-friendly identifier).
 *
 * Mirror de getVagaById com `.eq('slug', ...)` no lugar de `.eq('id', ...)`.
 * Reusa o mesmo enriquecerVaga() N+1 path (D-17 — otimização deferida para
 * Phase 5 hardening).
 *
 * Anti-enumeration carryover de Phase 3 D-09: mensagem genérica única
 * 'Vaga não encontrada' independente da causa (slug nunca existiu vs vaga
 * soft-deletada vs RLS-bloqueada). NÃO indica ao cliente se o slug é
 * conhecido — apenas que não está acessível.
 *
 * @param slug - URL slug da vaga (ex.: "atendimento-ao-paciente")
 * @param candidatoId - ID do candidato (opcional, para enriquecimento)
 * @returns GetVagaResponse — { success: true, data } ou { success: false, error }
 *
 * @example
 * const response = await getVagaBySlug('atendimento-ao-paciente', 'candidato-456')
 */
export async function getVagaBySlug(
  slug: string,
  candidatoId?: string
): Promise<GetVagaResponse> {
  try {
    if (!slug || slug.trim() === '') {
      throw new VagasServiceError('Slug da vaga inválido', 'INVALID_INPUT')
    }

    const { data, error } = await supabase
      .from('vagas')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found — anti-enumeration generic message
        throw new VagasServiceError('Vaga não encontrada', 'NOT_FOUND', error)
      }
      throw new VagasServiceError(
        `Erro ao buscar vaga: ${error.message}`,
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      // Anti-enumeration: same generic message even if no PGRST116
      throw new VagasServiceError('Vaga não encontrada', 'NOT_FOUND')
    }

    // Preserva o comportamento pré-25-09 (counts sse-e-somente-se candidatoId).
    const vagaEnriquecida = await enriquecerVaga(data, candidatoId, !!candidatoId)

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
