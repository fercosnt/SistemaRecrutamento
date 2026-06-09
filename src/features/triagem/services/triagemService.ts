/**
 * Triagem service — RH panel read (TRIAGEM-02) + comparativo invoke (TRIAGEM-03)
 * + on-demand reprocess of a failed/old AI analysis.
 *
 * The panel read is the [[reference_select_star_leaks_pii]] fix: an EXPLICIT column
 * allowlist joining `analise_candidato_vaga`. It must NEVER pull sensitive identity
 * columns — RLS is row-level only and does not hide columns (Phase 8 LGPD leak
 * lesson). The Wave-0 RED test asserts those identity columns are absent from the
 * projection.
 *
 * @module features/triagem/services/triagemService
 * @see src/features/vagas/services/candidaturasService.ts:1145-1230 (the star-projection hazard this replaces)
 * @see supabase/migrations/20260610000003_reprocessar_rpc.sql (reprocessar_analise RPC — live in PROD via 10-04)
 */

import { supabase } from '@/lib/supabase/client'
import type {
  PaginationParams,
  StatusCandidatura,
} from '@/features/vagas/types/vagasTypes'
// NOTE: `EtapaFunilM2` (o enum M2 vivo no DB) é declarado mais abaixo neste módulo;
// type-aliases são hoisted, então pode ser referenciado em posições de tipo acima.

/**
 * Erro do serviço de triagem (espelha CandidaturasServiceError).
 */
export class TriagemServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'MIXED_VAGA'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'TriagemServiceError'
  }
}

/**
 * Filtros do painel de triagem (etapa + status + busca por nome).
 */
export interface TriagemFilters {
  status?: StatusCandidatura | null
  /** Etapa do funil M2 (= `candidaturas.etapa_atual` no DB). W2: era o enum legado M1. */
  etapa?: EtapaFunilM2 | null
  /** Busca por nome do candidato (ilike). */
  nome?: string | null
}

/**
 * Ordenação do painel. `score_desc` (default) = score_match DESC nulls-last;
 * pendente/falhou (score null) ficam no fim.
 */
export type TriagemOrderBy = 'score_desc' | 'score_asc' | 'recentes'

/**
 * Análise embutida (allowlist — sem PII).
 */
export interface TriagemAnalise {
  score_match: number | null
  pontos_fortes: string[]
  gaps: string[]
  flags: string[]
  status: string | null
}

/**
 * Linha do painel de triagem (projeção allowlist — sem colunas de identidade sensíveis).
 */
export interface TriagemRow {
  id: string
  status: StatusCandidatura
  etapa_atual: EtapaFunilM2
  created_at: string
  curriculo_nome_original: string | null
  candidato: { id: string; nome_completo: string } | null
  analise: TriagemAnalise | null
}

/**
 * Response paginado do painel.
 */
export interface TriagemPanelResponse {
  data: TriagemRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * Lista candidaturas de uma vaga para o painel de triagem RH (TRIAGEM-02).
 *
 * Projeção ALLOWLIST — junta `analise_candidato_vaga` (score_match, pontos_fortes,
 * gaps, flags, status). NUNCA projeção-estrela, NUNCA colunas de identidade sensíveis.
 * Ordenação default: score_match DESC nulls-last (pendente/falhou no fim).
 * Paginação server-side 20/página via `.range()`.
 */
export async function listTriagemPanel(
  vagaId: string,
  filters: TriagemFilters = {},
  orderBy: TriagemOrderBy = 'score_desc',
  pagination: PaginationParams = { page: 1, limit: 20 },
): Promise<TriagemPanelResponse> {
  if (!vagaId) {
    throw new TriagemServiceError('vagaId é obrigatório', 'INVALID_INPUT')
  }

  // W3: o `ilike('candidato.nome_completo', ...)` filtra o RECURSO EMBUTIDO, não a
  // linha-pai. Sem `!inner`, o PostgREST mantém TODA candidatura (nullando o embed),
  // então a busca por nome devolvia todas as candidaturas e `count:'exact'` reportava
  // o total não-filtrado (quebra a paginação). Use INNER embed SÓ quando há filtro de
  // nome — para que o ilike efetivamente filtre as candidaturas + o count fique certo.
  // Sem filtro de nome, mantém o left-join (sem `!inner`) para que linhas sem
  // candidato/análise ainda apareçam.
  const candidatoEmbed = filters.nome
    ? 'candidato:candidatos!inner ( id, nome_completo )'
    : 'candidato:candidatos ( id, nome_completo )'

  // Allowlist explícita — sem `*`, sem colunas PII. Junta a análise da IA.
  let query = supabase
    .from('candidaturas')
    .select(
      `id, status, etapa_atual, created_at, curriculo_nome_original,
       ${candidatoEmbed},
       analise:analise_candidato_vaga ( score_match, pontos_fortes, gaps, flags, status )`,
      { count: 'exact' },
    )
    .eq('vaga_id', vagaId)
    .is('deleted_at', null)

  // Filtros etapa + status.
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.etapa) {
    query = query.eq('etapa_atual', filters.etapa)
  }
  // Busca por nome (no recurso embutido candidatos — INNER ativado acima).
  if (filters.nome) {
    query = query.ilike('candidato.nome_completo', `%${filters.nome}%`)
  }

  // Ordenação: score_match na análise embutida, nulls-last (pendente/falhou ao fim).
  if (orderBy === 'recentes') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('score_match', {
      ascending: orderBy === 'score_asc',
      nullsFirst: false,
      referencedTable: 'analise',
    })
  }

  // Paginação 20/página.
  const from = (pagination.page - 1) * pagination.limit
  const to = from + pagination.limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new TriagemServiceError(
      `Erro ao carregar candidaturas: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  const total = count ?? 0
  const totalPages = Math.ceil(total / pagination.limit)

  return {
    data: (data ?? []) as unknown as TriagemRow[],
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasMore: pagination.page < totalPages,
    },
  }
}

/**
 * Re-dispara a análise da IA para uma candidatura (TRIAGEM-02 — botão "Reprocessar análise").
 *
 * Chama a RPC SECURITY DEFINER `reprocessar_analise(p_candidatura_id)` — já viva em PROD
 * (autorada em 10-02, aplicada em 10-04). A RPC re-emite o mesmo dispatch net.http_post do
 * trigger, com idempotency fresca (a EF faz upsert da row — nunca duplica).
 * Apenas um client call; NÃO é migration.
 */
export async function reprocessarAnalise(candidaturaId: string): Promise<void> {
  if (!candidaturaId) {
    throw new TriagemServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { error } = await supabase.rpc('reprocessar_analise', {
    p_candidatura_id: candidaturaId,
  })

  if (error) {
    throw new TriagemServiceError(
      `Não foi possível reprocessar a análise: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
}

/**
 * Invoca a EF comparativo-candidatos (TRIAGEM-03) com { vaga_id, candidatura_ids }.
 * Mapeia o erro EF de vagas diferentes para a cópia pt-BR exata do contrato UI-SPEC.
 * (A tela de comparativo + PDF chegam no Plan 10-06; aqui fica o client call.)
 */
export async function invokeComparativo(
  vagaId: string,
  candidaturaIds: string[],
): Promise<{ ranking: unknown; latencia_ms?: number }> {
  const { data, error } = await supabase.functions.invoke('comparativo-candidatos', {
    body: { vaga_id: vagaId, candidatura_ids: candidaturaIds },
  })

  if (error) {
    throw new TriagemServiceError(
      'Não foi possível gerar o comparativo. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  if (!data?.ok) {
    if (data?.error_code === 'MIXED_VAGA') {
      throw new TriagemServiceError(
        'Os candidatos selecionados pertencem a vagas diferentes. Compare candidatos de uma mesma vaga.',
        'MIXED_VAGA',
        data,
      )
    }
    throw new TriagemServiceError(
      'Não foi possível gerar o comparativo. Tente novamente.',
      'NETWORK_ERROR',
      data,
    )
  }

  return { ranking: data.ranking, latencia_ms: data.latencia_ms }
}

/**
 * Move uma candidatura para uma etapa do processo (TRIAGEM — ações inline do comparativo).
 *
 * Faz um UPDATE em `candidaturas.etapa_atual`, que dispara o trigger BEFORE UPDATE
 * `avancar_etapa()` (Phase 6) — este valida a transição e grava a row de auditoria em
 * `historico_candidatura` na mesma transação. A IA é apenas sugestão: a ação só ocorre
 * após confirmação humana no alert-dialog (RNF-07a — nunca auto-ação por score).
 *
 * - Avançar: `novaEtapa` = próxima etapa do funil M2 (ex.: 'avaliacao_assincrona') — NÃO
 *   exige justificativa.
 * - Rejeitar: `novaEtapa` = 'rejeitado' (terminal) — NÃO exige justificativa longa aqui
 *   (a justificativa detalhada é exigida apenas na Decisão Final / Etapa 6).
 *
 * O tipo é o enum `etapa_processo` do DB (funil M2), distinto do legado `EtapaProcesso`
 * do front-end M1 (schema-drift conhecido — ver vagasTypes.ts).
 */
export type EtapaFunilM2 =
  | 'inscricao'
  | 'triagem'
  | 'avaliacao_assincrona'
  | 'entrevista_online'
  | 'entrevista_presencial'
  | 'decisao_final'
  | 'aprovado'
  | 'rejeitado'

/** Próxima etapa após a Triagem (Etapa 2) no funil M2 — usada pelo "Avançar" do comparativo. */
export const PROXIMA_ETAPA_APOS_TRIAGEM: EtapaFunilM2 = 'avaliacao_assincrona'

/**
 * W2: rótulos pt-BR do enum M2 `etapa_processo` (= `candidaturas.etapa_atual` no DB).
 *
 * O front-end M1 carrega um enum legado `EtapaProcesso` (triagem/bigfive/disc/raven/
 * cultura/avaliacao_final) que NÃO existe no DB M2 — selecioná-lo no filtro do painel
 * gerava `eq('etapa_atual','bigfive')` → Postgres 22P02 (invalid enum), e o map de
 * rótulos M1 mostrava enum cru para etapas M2. Este map (espelha
 * `Constants.public.Enums.etapa_processo` em database.types.ts na RAIZ) é a fonte de
 * verdade do filtro + do rótulo da tabela de triagem.
 */
export const ETAPA_M2_LABELS: Record<EtapaFunilM2, string> = {
  inscricao: 'Inscrição',
  triagem: 'Triagem',
  avaliacao_assincrona: 'Avaliação Assíncrona',
  entrevista_online: 'Entrevista Online',
  entrevista_presencial: 'Entrevista Presencial',
  decisao_final: 'Decisão Final',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

/** Opções do filtro de etapa do painel (ordem do funil M2), com rótulos pt-BR. */
export const ETAPA_M2_OPTIONS: { value: EtapaFunilM2; label: string }[] = (
  [
    'inscricao',
    'triagem',
    'avaliacao_assincrona',
    'entrevista_online',
    'entrevista_presencial',
    'decisao_final',
    'aprovado',
    'rejeitado',
  ] as EtapaFunilM2[]
).map((value) => ({ value, label: ETAPA_M2_LABELS[value] }))

export async function updateCandidaturaEtapa(
  candidaturaId: string,
  novaEtapa: EtapaFunilM2,
): Promise<void> {
  if (!candidaturaId) {
    throw new TriagemServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const update: { etapa_atual: EtapaFunilM2; status?: StatusCandidatura } = {
    etapa_atual: novaEtapa,
  }
  // Rejeição terminal também marca o status como 'rejeitado' (badge no painel + dashboard).
  if (novaEtapa === 'rejeitado') {
    update.status = 'rejeitado'
  }

  const { error } = await supabase
    .from('candidaturas')
    .update(update as never)
    .eq('id', candidaturaId)

  if (error) {
    throw new TriagemServiceError(
      `Não foi possível atualizar a candidatura: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
}
