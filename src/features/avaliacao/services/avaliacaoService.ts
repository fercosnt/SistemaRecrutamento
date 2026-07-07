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
 * NOTE: `respostas_avaliacao`, the `perguntas` SJT table and the `pontuar_sjt` /
 * `get_opcoes_sjt` RPCs are now present in the regenerated `database.types.ts`
 * (Phase-11 apply wave done), so every surface here is reached via the typed
 * `supabase` client — no blanket `as never` cast. Local interfaces still narrow
 * the row/return shapes the UI consumes.
 *
 * @module features/avaliacao/services/avaliacaoService
 * @see src/features/triagem/services/triagemService.ts (allowlist + service-error convention)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-PATTERNS.md §avaliacaoService
 */
import { supabase } from '@/lib/supabase/client'
import { extractEfErrorCode } from '@/lib/efErrors'
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

/**
 * A SJT question the candidate answers (allowlist — never a star projection).
 * SEC-07 (Phase 24): the BARS open-case answer-key column is DROPPED from this
 * candidate-facing shape and column-REVOKE'd at Postgres — only the `avaliar-redacao`
 * EF (service_role) reads it. See the SEC-07 migration (20260706110002).
 */
export interface PerguntaSjt {
  id: string
  cargo: string
  cenario: string
  formato: string
  tempo_est_min: number | null
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

  // Active SJT items — allowlist columns only (never a star projection). SEC-07
  // (Phase 24): the BARS open-case answer-key column is DROPPED from this candidate
  // projection and column-REVOKE'd at Postgres — the candidate never sees the key.
  const { data: perguntas, error: pErr } = await supabase
    .from('perguntas')
    .select('id, cargo, cenario, formato, tempo_est_min, status')
    // Canonical sentinel is 'active' (en) — matches the `perguntas` DEFAULT, the
    // partial index, the RLS policy `USING (status = 'active')` and `get_opcoes_sjt`.
    // The previous 'ativo' (pt) never matched any row → the candidate saw zero SJT items.
    .eq('status', 'active')

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

/** A candidate-safe SJT option — ONLY id + text, never peso/tag (RNF-07a). */
export interface OpcaoSjt {
  opcao_id: string
  opcao_texto: string
}

/**
 * Reads the answer-key-safe options for one SJT question (AVAL-02). Calls the
 * `get_opcoes_sjt` SECURITY DEFINER RPC, which projects ONLY `opcao_id` +
 * `opcao_texto` (NEVER peso/tag) in server-randomized order. The candidate never
 * receives the option weights — the scoring key stays server-side.
 */
export async function getOpcoesSjt(perguntaId: string): Promise<OpcaoSjt[]> {
  if (!perguntaId) {
    throw new AvaliacaoServiceError('perguntaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase.rpc('get_opcoes_sjt', {
    p_pergunta_id: perguntaId,
  })

  if (error) {
    throw new AvaliacaoServiceError(
      `Não foi possível carregar as alternativas: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return ((data as OpcaoSjt[] | null) ?? []).map((o) => ({
    opcao_id: o.opcao_id,
    opcao_texto: o.opcao_texto,
  }))
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

  const { data, error } = await supabase
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
  const { error } = await supabase
    .from('respostas_avaliacao')
    .upsert(
      { candidatura_id: candidaturaId, teste, respostas: respostas as never },
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

  const { data, error } = await supabase.rpc('pontuar_sjt', {
    p_candidatura_id: candidaturaId,
    p_respostas: respostas as never,
  })

  if (error) {
    // RLS back-lock: the etapa advanced. A SECURITY DEFINER RPC denial can surface
    // as a raw 42501 (code/status) OR as a 403 on the function-call path — map all
    // of them to the neutral LOCKED throw (mirrors useAutosaveAvaliacao's isBackLock).
    const e = error as { code?: string; status?: number }
    if (
      e.code === '42501' ||
      String(e.status) === '42501' ||
      e.status === 403
    ) {
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

  // The RPC returns a neutral Json ack ({ ok, registrado? }); narrow it via
  // `unknown` (Json does not structurally overlap NeutralAck) — RNF-07a: never a score.
  return (data as unknown as NeutralAck | null) ?? { ok: true }
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
    // The PRIMARY AI_UNAVAILABLE surface: avaliar-redacao is an AI EF that emits a
    // 503 { error_code:'AI_UNAVAILABLE', retryable:true } under overload. The shared
    // helper pulls that code (code-only, no PII) so <AsyncState errorCode> can show
    // the "serviço de IA sobrecarregado" copy instead of the generic network one.
    const error_code = await extractEfErrorCode(data, error)
    throw new AvaliacaoServiceError(
      'Não foi possível enviar sua resposta. Tente novamente.',
      'NETWORK_ERROR',
      { error_code, raw: error },
    )
  }

  return (data as NeutralAck) ?? { ok: true }
}
