/**
 * Avaliação service (AVAL-01·02·03·09) — the candidate-side data/logic layer for
 * the SJT battery.
 *
 * Three load-bearing invariants:
 *  1. ALLOWLIST reads — every candidatura/perguntas/respostas read names its
 *     columns explicitly; NEVER a star projection. RLS is row-level only and does not
 *     hide columns ([[reference_select_star_leaks_pii]], Phase-8 LGPD lesson). The
 *     candidate never reads `scores_candidato` (no RLS policy → denied).
 *  2. SERVER-AUTHORITATIVE scoring — the client posts ONLY answer identifiers/text.
 *     MC scoring goes to the `pontuar_sjt` RPC (deterministic Σ peso, SECURITY
 *     DEFINER); the open case goes to the `avaliar-redacao` EF (BARS via the
 *     `work_sample_sjt` prompt). No code path here computes or submits a score
 *     (anti-tamper, Pitfall 5). The RPC/EF return NEUTRAL payloads (RNF-07a).
 *  3. BACK-LOCK — once `avancar_etapa` moves the candidatura past
 *     `avaliacao_assincrona`, the etapa-gated RLS denies writes (42501). Callers
 *     surface that neutrally (see `useAutosaveAvaliacao`).
 *
 * NOTE: `respostas_avaliacao`, the `perguntas` SJT table and the `pontuar_sjt` RPC
 * are live in PROD but `database.types.ts` is regenerated only in the Phase-11
 * apply wave (BLOCKING checklist #4). Until then those surfaces are reached via a
 * narrow `as never` cast on the table/rpc name — the column allowlists and return
 * shapes are still typed locally, so the cast is confined to the generated-types gap.
 *
 * @module features/avaliacao/services/avaliacaoService
 * @see src/features/triagem/services/triagemService.ts (allowlist + service-error convention)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-PATTERNS.md §avaliacaoService
 */
import { supabase } from '@/lib/supabase/client'
import type { RespostaMcItem } from '../schemas/respostaAvaliacaoSchema'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class AvaliacaoServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'LOCKED'
      | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AvaliacaoServiceError'
  }
}

/** A SJT question the candidate answers (allowlist — never a star projection). */
export interface PerguntaSjt {
  id: string
  cargo: string
  cenario: string
  formato: string
  tempo_est_min: number | null
  rubric: unknown
  status: string
}

/** The candidatura context the container needs (allowlist — no PII columns). */
export interface AvaliacaoContext {
  candidatura: {
    id: string
    status: string
    etapa_atual: string
    vaga_id: string
  }
  testes_aplicaveis: unknown
  perguntas: PerguntaSjt[]
}

/** A saved autosave row (own-row read; no score columns — those live elsewhere). */
export interface RespostaAvaliacaoRow {
  candidatura_id: string
  teste: string
  respostas: unknown
  updated_at: string | null
}

/** Neutral RPC/EF acknowledgement — never carries a score (RNF-07a). */
export interface NeutralAck {
  ok: boolean
  registrado?: boolean
}

// The not-yet-regenerated surfaces (PROD-live; types land in the apply wave).
// Confined casts — see module JSDoc. The query-builder shape is intentionally
// permissive (string columns / chainable filters) because the generated row
// types for `perguntas`/`respostas_avaliacao` don't exist until the apply wave.
type LooseQuery = {
  select: (cols: string, opts?: unknown) => LooseQuery
  eq: (col: string, val: unknown) => LooseQuery
  upsert: (row: unknown, opts?: unknown) => Promise<{ error: unknown }>
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
  then: Promise<{ data: unknown; error: { message: string } | null }>['then']
}
type UntypedClient = {
  from: (table: string) => LooseQuery
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>
}
const sb = supabase as unknown as UntypedClient

/**
 * Reads the avaliação context for a candidatura (AVAL-01): the candidatura row
 * (allowlist `id, status, etapa_atual, vaga_id`), its vaga `testes_aplicaveis`,
 * and the active SJT `perguntas` for the cargo (explicit columns). Own-row RLS
 * scopes the candidatura; `perguntas` is filtered to active items.
 */
export async function getAvaliacaoContext(
  candidaturaId: string,
): Promise<AvaliacaoContext> {
  if (!candidaturaId) {
    throw new AvaliacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // Allowlist explícita — sem `*`, sem colunas PII. Junta a vaga p/ testes_aplicaveis.
  const { data: cand, error: candErr } = await supabase
    .from('candidaturas')
    .select(
      `id, status, etapa_atual, vaga_id,
       vaga:vagas ( testes_aplicaveis )`,
    )
    .eq('id', candidaturaId)
    .is('deleted_at', null)
    .maybeSingle()

  if (candErr) {
    throw new AvaliacaoServiceError(
      `Erro ao carregar candidatura: ${candErr.message}`,
      'DATABASE_ERROR',
      candErr,
    )
  }
  if (!cand) {
    throw new AvaliacaoServiceError('Candidatura não encontrada', 'NOT_FOUND')
  }

  const candRow = cand as unknown as {
    id: string
    status: string
    etapa_atual: string
    vaga_id: string
    vaga: { testes_aplicaveis: unknown } | null
  }

  const testesAplicaveis = candRow.vaga?.testes_aplicaveis ?? null

  // Active SJT items — allowlist columns only (never a star projection).
  const { data: perguntas, error: pErr } = await sb
    .from('perguntas')
    .select('id, cargo, cenario, formato, tempo_est_min, rubric, status')
    .eq('status', 'ativo')

  if (pErr) {
    throw new AvaliacaoServiceError(
      `Erro ao carregar perguntas: ${pErr.message}`,
      'DATABASE_ERROR',
      pErr,
    )
  }

  return {
    candidatura: {
      id: candRow.id,
      status: candRow.status,
      etapa_atual: candRow.etapa_atual,
      vaga_id: candRow.vaga_id,
    },
    testes_aplicaveis: testesAplicaveis,
    perguntas: (perguntas ?? []) as unknown as PerguntaSjt[],
  }
}

/**
 * Loads the candidate's own saved autosave row for a given teste (own-row RLS).
 * Allowlist columns — the row carries answers only, never a score.
 */
export async function loadResposta(
  candidaturaId: string,
  teste: string,
): Promise<RespostaAvaliacaoRow | null> {
  if (!candidaturaId || !teste) {
    throw new AvaliacaoServiceError(
      'candidaturaId e teste são obrigatórios',
      'INVALID_INPUT',
    )
  }

  const { data, error } = await sb
    .from('respostas_avaliacao')
    .select('candidatura_id, teste, respostas, updated_at')
    .eq('candidatura_id', candidaturaId)
    .eq('teste', teste)
    .maybeSingle()

  if (error) {
    throw new AvaliacaoServiceError(
      `Erro ao carregar respostas: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return (data as unknown as RespostaAvaliacaoRow | null) ?? null
}

/**
 * Upserts the autosave buffer into `respostas_avaliacao` (AVAL-09). The
 * etapa-gated RLS owns the back-lock: a denied write surfaces as 42501. This
 * function returns the raw Supabase `{ error }` envelope so callers (the autosave
 * hook) can branch on the back-lock without an exception (Pitfall 3).
 */
export async function upsertResposta(
  candidaturaId: string,
  teste: string,
  respostas: unknown,
): Promise<{ error: { code?: string; status?: number; message?: string } | null }> {
  const { error } = await sb
    .from('respostas_avaliacao')
    .upsert(
      { candidatura_id: candidaturaId, teste, respostas } as never,
      { onConflict: 'candidatura_id,teste' },
    )
  return { error: (error as { code?: string; status?: number; message?: string } | null) ?? null }
}

/**
 * Submits the SJT multiple-choice answers for server-side deterministic scoring
 * (AVAL-02). Calls the `pontuar_sjt` SECURITY DEFINER RPC with ONLY the option
 * picks — the client never computes or posts a score. Returns the neutral ack.
 */
export async function pontuarSjt(
  candidaturaId: string,
  respostas: RespostaMcItem[],
): Promise<NeutralAck> {
  if (!candidaturaId) {
    throw new AvaliacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await sb.rpc('pontuar_sjt', {
    p_candidatura_id: candidaturaId,
    p_respostas: respostas,
  })

  if (error) {
    // RLS back-lock RAISEd as 42501 inside the DEFINER fn → neutral LOCKED.
    const code = (error as { code?: string }).code
    if (code === '42501') {
      throw new AvaliacaoServiceError(
        'Sua etapa avançou — esta avaliação não aceita mais respostas.',
        'LOCKED',
        error,
      )
    }
    throw new AvaliacaoServiceError(
      `Não foi possível registrar suas respostas: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return (data as NeutralAck) ?? { ok: true }
}

/**
 * Invokes the `avaliar-redacao` EF for the SJT open case (AVAL-03). Posts ONLY
 * the answer text + identifiers; the EF derives the BARS composite server-side and
 * persists it (the client never sees a score). Returns the neutral `{ ok }`.
 */
export async function avaliarRedacao(body: {
  candidatura_id: string
  pergunta_id: string
  texto: string
}): Promise<NeutralAck> {
  if (!body?.candidatura_id || !body?.pergunta_id || !body?.texto) {
    throw new AvaliacaoServiceError(
      'candidatura_id, pergunta_id e texto são obrigatórios',
      'INVALID_INPUT',
    )
  }

  const { data, error } = await supabase.functions.invoke('avaliar-redacao', {
    body,
  })

  if (error) {
    throw new AvaliacaoServiceError(
      'Não foi possível enviar sua resposta. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  return (data as NeutralAck) ?? { ok: true }
}
