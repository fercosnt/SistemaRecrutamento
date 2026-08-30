/**
 * Redação cultural service (AVAL-05 / AVAL-06 / per D-13) — the candidate-side
 * data/logic layer for the culture-fit essay editor.
 *
 * Three load-bearing invariants (the same security model as `avaliacaoService` /
 * `bigfiveService`):
 *  1. VERDICT-SAFE reads — RLS is row-level only and does NOT hide columns
 *     ([[reference_select_star_leaks_pii]], Phase-8 LGPD lesson). SEC-02 (Phase 24):
 *     the candidate own-row read of `redacoes_candidato` no longer touches the base
 *     table — its candidate row policy was DROPPED — and instead goes through the
 *     `get_minha_redacao` SECURITY DEFINER RPC, which enforces posse
 *     (`candidatos.user_id = auth.uid()`) and projects ONLY the safe columns
 *     (`MinhaRedacaoRow`). Neither path ever exposes a verdict column (analise_ia,
 *     scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico,
 *     flags, scores_humanos, notas_revisor, decisao_revisor) — the candidate NEVER
 *     sees a score/color/threshold (RNF-07a, T-13-03-01, T-24-03-01). Other reads
 *     (e.g. `perguntas_redacao`) keep explicit column allowlists; NEVER a star
 *     projection. `REDACAO_CANDIDATO_ALLOWLIST` remains as a defense-in-depth
 *     documentation/test anchor for the safe column set.
 *  2. SERVER-AUTHORITATIVE scoring — `enviarRedacao` posts ONLY identifiers + the
 *     essay text (validated via `respostaRedacaoSchema.strict()`); the EF derives
 *     the BARS composite + the 3-color triage server-side. No code path here
 *     computes or submits a score (anti-tamper, Pitfall 5). The EF returns a
 *     NEUTRAL ack (T-13-03-02).
 *  3. BACK-LOCK — once `avancar_etapa` moves the candidatura past
 *     `avaliacao_assincrona`, the etapa-gated RLS denies writes (42501/403). That
 *     surfaces as a neutral LOCKED throw — never an alarming error (T-13-03-03).
 *
 * NOTE (13-04 apply wave): `perguntas_redacao` + `redacoes_candidato` are NOT yet
 * in the regenerated `database.types.ts` (that lands on the 13-04 BLOCKING
 * apply/regen wave). Until then those reads are reached via a NARROW confined cast
 * (the table name only), NOT a blanket UntypedClient — the EXPLICIT allowlist keeps
 * each projection auditable. Drop the cast after the 13-04 regen. The
 * `avaliar-redacao-cultural` EF is invoked via the typed `functions.invoke` path.
 *
 * @see src/features/avaliacao/services/avaliacaoService.ts (avaliarRedacao / allowlist idioms — the SJT precedent)
 * @see src/features/avaliacao/services/bigfiveService.ts (the LOCKED/INVALID_INPUT/NETWORK_ERROR error map cloned here)
 * @see src/features/avaliacao/schemas/redacaoSchema.ts (the `.strict()` no-score client body)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-PATTERNS.md §redacaoService
 * @module features/avaliacao/services/redacaoService
 */
import { supabase } from '@/lib/supabase/client'
import { respostaRedacaoSchema, type RespostaRedacao } from '../schemas/redacaoSchema'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class RedacaoServiceError extends Error {
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
    this.name = 'RedacaoServiceError'
  }
}

/** Hierarchical query keys for the redação surface (CLAUDE.md convention). */
export const redacaoKeys = {
  all: ['redacao'] as const,
  context: (candidaturaId: string) =>
    [...redacaoKeys.all, 'context', candidaturaId] as const,
  minhas: (candidaturaId: string) =>
    [...redacaoKeys.all, 'minhas', candidaturaId] as const,
}

/**
 * The candidate own-row projection of `redacoes_candidato` — a single auditable
 * allowlist constant. It EXCLUDES every verdict column (analise_ia,
 * scores_dimensao, score_ponderado_0_100, classificacao_cor, red_flag_etico,
 * flags, scores_humanos, notas_revisor, decisao_revisor) so the candidate NEVER
 * receives a score/color/threshold (RNF-07a, T-13-03-01,
 * [[reference_select_star_leaks_pii]]). NEVER `select('*')`.
 */
export const REDACAO_CANDIDATO_ALLOWLIST =
  'id, pergunta_id, texto, word_count, submetida_em, status_analise'

/** An essay prompt the candidate answers (allowlist — the prompt text is candidate-visible). */
export interface PerguntaRedacao {
  id: string
  codigo: string
  texto: string
  valor_primario: string | null
  is_padrao: boolean
}

/** A candidate-safe own-row of `redacoes_candidato` — NEVER carries a verdict (RNF-07a). */
export interface MinhaRedacaoRow {
  id: string
  pergunta_id: string
  texto: string
  word_count: number | null
  submetida_em: string | null
  status_analise: string
}

/** Neutral EF acknowledgement — never carries a score/color (RNF-07a). */
export interface NeutralAck {
  ok: boolean
  registrado?: boolean
}

/**
 * Reads the essay prompts THIS VAGA applies (AVAL-05). O texto do enunciado é
 * visível ao candidato — é o que ele responde, não gabarito —, então a leitura usa
 * allowlist explícita e nunca `select('*')`: a dica de `valor_primario` e as
 * colunas de pontuação do banco ficam fora.
 *
 * ⚠ ATÉ 2026-08-30 ESTA FUNÇÃO SERVIA O BANCO INTEIRO. Ela lia todas as
 * `perguntas_redacao` com `ativa = true`, sem olhar a vaga. Eram ONZE, e a tela
 * itera a lista mostrando "Pergunta n de total": o candidato de uma vaga comercial
 * escreveria onze redações, entre elas "defenda uma abordagem clínica não-óbvia"
 * (feita para dentista) e "dê um feedback duro a um subordinado" (para
 * coordenação). A coluna `template_cargo` existia na tabela e nada a usava.
 *
 * É a MESMA FORMA do defeito do SJT, consertado quatro dias antes
 * (`avaliacaoService.getAvaliacaoContext`): instrumento sem escopo declarado
 * servindo o banco todo. Não apareceu antes porque a etapa de avaliação assíncrona
 * nunca havia rodado de ponta a ponta — o teste E2E passou por ela avançando o
 * funil na mão.
 *
 * O escopo agora vem da vaga, em `testes_aplicaveis`, no elemento de
 * `redacao_cultural`:
 *
 *     { teste: 'redacao_cultural', obrigatorio: true, codigos: ['PADRAO_BS'] }
 *
 * ⚠ SEM `codigos` DECLARADOS, CAI NA PERGUNTA PADRÃO — e não em lista vazia, ao
 * contrário do SJT. A diferença é deliberada e tem motivo: no SJT a lista vazia
 * evita trabalho perdido, porque `pontuar_sjt` recusaria a submissão de qualquer
 * jeito. Aqui não há recusa no servidor, a etapa pode ser obrigatória, e existe uma
 * pergunta marcada `is_padrao` justamente para ser o default. Servir uma pergunta
 * pensada para todo mundo é melhor que travar o candidato numa etapa vazia — e
 * muito melhor que servir onze.
 */
export async function getRedacaoContext(
  candidaturaId: string,
): Promise<PerguntaRedacao[]> {
  if (!candidaturaId) {
    throw new RedacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // A vaga da candidatura decide o escopo. Own-row RLS cobre esta leitura.
  const { data: candRow, error: candErr } = await supabase
    .from('candidaturas')
    .select('id, vaga:vagas!inner(testes_aplicaveis)')
    .eq('id', candidaturaId)
    .is('deleted_at', null)
    .maybeSingle()

  if (candErr) {
    throw new RedacaoServiceError(
      `Não foi possível carregar a redação: ${candErr.message}`,
      'DATABASE_ERROR',
      candErr,
    )
  }
  if (!candRow) {
    throw new RedacaoServiceError('Candidatura não encontrada', 'NOT_FOUND')
  }

  const testes = (candRow as unknown as { vaga: { testes_aplicaveis: unknown } | null })
    .vaga?.testes_aplicaveis
  const elem = Array.isArray(testes)
    ? (testes as Array<Record<string, unknown>>).find(
        (e) => e.teste === 'redacao_cultural' || e.tipo === 'redacao_cultural',
      )
    : undefined
  const codigos = Array.isArray(elem?.codigos)
    ? (elem!.codigos as unknown[]).filter((c): c is string => typeof c === 'string')
    : []

  // NARROW confined cast (13-04 regen drops it): `perguntas_redacao` is not yet in
  // the generated types. Only the table name is widened — a EXPLICIT allowlist
  // (nunca `'*'`) mantém a projeção auditável.
  type Encadeavel = {
    select: (cols: string) => Encadeavel
    eq: (col: string, val: unknown) => Encadeavel
    in: (col: string, vals: unknown[]) => Encadeavel
    order: (col: string) => Encadeavel
    then: (
      r: (v: { data: unknown; error: { message: string } | null }) => unknown,
    ) => Promise<unknown>
  }

  let query = (supabase.from as unknown as (t: string) => Encadeavel)('perguntas_redacao')
    .select('id, codigo, texto, valor_primario, is_padrao')
    .eq('ativa', true)

  query = codigos.length > 0 ? query.in('codigo', codigos) : query.eq('is_padrao', true)

  // `codigo` como desempate: sem ele a ordem entre pares de mesmo `is_padrao` fica
  // por conta do plano do Postgres, e a numeração "Pergunta n de N" mudaria entre
  // recarregamentos da mesma prova.
  const { data, error } = (await query.order('is_padrao').order('codigo')) as {
    data: unknown
    error: { message: string } | null
  }

  if (error) {
    throw new RedacaoServiceError(
      `Não foi possível carregar a redação: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return ((data as PerguntaRedacao[] | null) ?? []).map((p) => ({
    id: String(p.id),
    codigo: String(p.codigo),
    texto: String(p.texto),
    valor_primario: p.valor_primario ?? null,
    is_padrao: Boolean(p.is_padrao),
  }))
}

/**
 * Loads ONE candidate own-row of `redacoes_candidato` via the `get_minha_redacao`
 * SECURITY DEFINER RPC (SEC-02, Phase 24). The RPC enforces posse
 * (`candidatos.user_id = auth.uid()`) INSIDE the function and projects ONLY the
 * safe columns (`MinhaRedacaoRow`) — NEVER a verdict column, so the candidate never
 * receives a score/color (RNF-07a, T-13-03-01, T-24-03-01). The base-table candidate
 * row policy was DROPPED, so a direct `.from('redacoes_candidato')` read now returns
 * 0 rows — the RPC is the ONLY candidate path. Returns null when the candidate has
 * not submitted a redação yet.
 */
export async function getRedacaoCandidato(
  candidaturaId: string,
): Promise<MinhaRedacaoRow | null> {
  if (!candidaturaId) {
    throw new RedacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // SEC-02 (Phase 24): candidate own-row read goes through get_minha_redacao — the
  // verdict-safe DEFINER RPC — NOT the base table (its candidate row policy was dropped).
  // NARROW confined cast (24-08 regen drops it): get_minha_redacao is not yet in the
  // generated types. Only the RPC name/args are widened — NOT a blanket UntypedClient.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: { p_candidatura_id: string },
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    'get_minha_redacao',
    { p_candidatura_id: candidaturaId },
  )

  if (error) {
    throw new RedacaoServiceError(
      `Não foi possível carregar sua redação: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  // The RPC RETURNS TABLE (an array, ordered by `ordem`). This reader historically
  // returned a single own-row — take the first safe row or null.
  const rows = (data as MinhaRedacaoRow[] | null) ?? []
  return rows[0] ?? null
}

/**
 * Lists the candidate's OWN submitted redações for a candidatura via the
 * `get_minha_redacao` SECURITY DEFINER RPC (SEC-02, Phase 24). Own-row posse is
 * enforced INSIDE the RPC; the projection EXCLUDES every verdict column (RNF-07a,
 * T-13-03-01, T-24-03-01). The RPC returns the rows ordered by `ordem`.
 */
export async function getMinhasRedacoes(
  candidaturaId: string,
): Promise<MinhaRedacaoRow[]> {
  if (!candidaturaId) {
    throw new RedacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // SEC-02 (Phase 24): list via get_minha_redacao — the verdict-safe DEFINER RPC —
  // NOT the base table (its candidate row policy was dropped). NARROW confined cast
  // (24-08 regen drops it) widens only the RPC name/args, never the client.
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: { p_candidatura_id: string },
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    'get_minha_redacao',
    { p_candidatura_id: candidaturaId },
  )

  if (error) {
    throw new RedacaoServiceError(
      `Não foi possível carregar suas redações: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return ((data as MinhaRedacaoRow[] | null) ?? []).map((r) => ({
    id: String(r.id),
    pergunta_id: String(r.pergunta_id),
    texto: String(r.texto),
    word_count: r.word_count ?? null,
    submetida_em: r.submetida_em ?? null,
    status_analise: String(r.status_analise),
  }))
}

/**
 * Submits one culture-fit essay for server-side scoring (AVAL-06). Validates the
 * body via `respostaRedacaoSchema.strict()` (rejects any injected score), then
 * invokes the `avaliar-redacao-cultural` EF with ONLY `{ candidatura_id,
 * pergunta_id, texto }`. The EF derives the BARS composite + the 3-color triage
 * server-side and persists them; the client receives a NEUTRAL ack and NEVER a
 * score (RNF-07a). A 42501/403 back-lock maps to a neutral LOCKED throw; a 400 is
 * a deterministic validation failure (don't tell the candidate to retry).
 */
export async function enviarRedacao(body: RespostaRedacao): Promise<NeutralAck> {
  let parsed: RespostaRedacao
  try {
    parsed = respostaRedacaoSchema.parse(body)
  } catch (err) {
    throw new RedacaoServiceError(
      'Redação inválida. Verifique o texto e tente novamente.',
      'INVALID_INPUT',
      err,
    )
  }

  const { data, error } = await supabase.functions.invoke(
    'avaliar-redacao-cultural',
    { body: parsed },
  )

  if (error) {
    // A SECURITY DEFINER / etapa-gated denial can surface as a 42501 code or a 403
    // on the function path — map all of them to the neutral LOCKED throw (mirrors
    // bigfiveService.submitBigfiveFinal / useAutosaveAvaliacao's isBackLock).
    const e = error as { code?: string; status?: number }
    if (e.code === '42501' || String(e.status) === '42501' || e.status === 403) {
      throw new RedacaoServiceError(
        'Sua etapa avançou — esta redação não aceita mais respostas.',
        'LOCKED',
        error,
      )
    }
    // A 400 from the EF is a VALIDATION failure (malformed/incomplete body) — it
    // will deterministically fail again on retry, so DON'T tell the candidate to
    // "tente novamente".
    if (e.status === 400 || String(e.status) === '400') {
      throw new RedacaoServiceError(
        'Revise sua redação — o texto precisa ter entre 200 e 500 palavras.',
        'INVALID_INPUT',
        error,
      )
    }
    throw new RedacaoServiceError(
      'Não foi possível enviar sua redação. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  // The EF returns a neutral ack ({ ok, registrado? }) — NEVER a score (RNF-07a).
  return (data as NeutralAck | null) ?? { ok: true }
}
