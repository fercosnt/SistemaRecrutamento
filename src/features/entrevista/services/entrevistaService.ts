/**
 * entrevistaService — the RH/gestor interview workspace data layer (ENTREV-01..05).
 *
 * Clones the Phase-13 `revisaoRedacaoService` posture verbatim. The genuinely
 * load-bearing invariants (RNF-07a + LGPD):
 *  - Every read names its columns explicitly via `ENTREVISTA_ALLOWLIST` /
 *    `*_ALLOWLIST` consts — NEVER a star projection ([[reference_select_star_leaks_pii]]).
 *    RLS is row-level only and does NOT hide columns; the candidate's interview
 *    transcript + gestor notes + scores are PII, so over-projecting would leak
 *    more than the workspace needs. The candidate has NO read policy on these
 *    rows (denied at the DB); RH/admin are allowed (14-04 candidate-DENY RLS).
 *  - The scorecard WRITE goes through the LIVE `salvar_avaliacao_entrevista`
 *    SECURITY DEFINER RPC (role + own-vaga guarded). It NEVER writes
 *    `candidaturas`, NEVER advances the funil, NEVER auto-rejects.
 *  - The two AI surfaces (`gerar-guia-entrevista`, `avaliar-transcricao-entrevista`)
 *    are invoked via `supabase.functions.invoke`; the client body carries ONLY
 *    identifiers + raw text — never a score/band (anti-tamper; the 14-01 contract
 *    test parses these exact bodies under the EF `.strict()` schemas).
 *  - `confirmarRevisaoHumana` sets `entrevista_analises.revisao_confirmada_em`,
 *    which is the human-confirmed marker the server `avancar_etapa` guard reads to
 *    release the language/accent flag block.
 *
 * @module features/entrevista/services/entrevistaService
 * @see src/features/triagem/services/revisaoRedacaoService.ts (the exact analog)
 * @see supabase/migrations (salvar_avaliacao_entrevista RPC + avancar_etapa flag guard, 14-03/14-04)
 */
import { supabase } from '@/lib/supabase/client'
import type { StatusAgendamento } from '@/features/agendamento/services/agendamentoService'
import { extractEfErrorCode } from '@/lib/efErrors'
import type { Json } from '@/../database.types'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class EntrevistaServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'FORBIDDEN'
      | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'EntrevistaServiceError'
  }
}

/** The two guide-generation modes (the EF `tipo` body field). */
export type TipoEntrevista = 'online' | 'presencial'

/** The 5 RH-only qualitative cognitive faixas (descriptive, never a verdict). */
export type BandaCognitiva =
  | 'bem_abaixo'
  | 'abaixo'
  | 'na_media'
  | 'acima'
  | 'bem_acima'

// ── Allowlist projections (NEVER a star projection — PII guard) ────────────────────

/**
 * The EXPLICIT column allowlist for the interview-guide read. NEVER `'*'`
 * ([[reference_select_star_leaks_pii]]). Listed as a single auditable constant.
 */
export const ENTREVISTA_GUIA_ALLOWLIST =
  'id, candidatura_id, tipo, guia, prompt_version, provedor_ia, modelo_ia, created_at, updated_at'

/**
 * The EXPLICIT column allowlist for the transcript-analysis read. Carries the
 * BARS competencies + citations + flags + the human-review markers
 * (revisao_confirmada_em is what unblocks the server avancar_etapa guard).
 *
 * ── Phase 49 / plano 49-16 (D-39..D-42, D-27b) ──────────────────────────────────
 * Ganhou as colunas de VIGÊNCIA (`tipo`, `superada_em`) e de PROVENIÊNCIA
 * (`provedor_ia`, `modelo_ia`, `texto_hash`). Sem `tipo`/`superada_em` a tela não tinha
 * como distinguir a análise que VALE da mais nova de qualquer estado — e era isso que
 * ela mostrava. `texto_hash` entra porque é o que identifica QUAL texto gerou a linha
 * (D-38/D-40) quando o RH compara duas análises da mesma entrevista.
 *
 * ⚠ **NÃO** entram `ai_call_log_id` nem `solicitado_por` (T-49-16-02): nenhuma tela lê
 * o primeiro (é chave técnica do log, purgado em 180 d) e o segundo é UUID de
 * FUNCIONÁRIO — projetar um dado de terceiro para o navegador porque «estava na mesma
 * linha» é exatamente o vazamento que a allowlist existe para impedir. A allowlist
 * segue sem curinga: RLS é por linha e NÃO esconde coluna.
 */
export const ENTREVISTA_ANALISE_ALLOWLIST =
  'id, candidatura_id, tipo, status_analise, superada_em, texto_hash, provedor_ia, modelo_ia, competencias, citacoes, bias_flags, bloqueio_avanco, scores_humanos, notas_humanas, revisada_por, revisao_confirmada_em, prompt_version, created_at'

/**
 * The EXPLICIT column allowlist for the scores read (the inline scorecard + the
 * RH-only cognitive band). NEVER `'*'`. Mirrors the live `scoresRhService`
 * projection — the candidate never reads `scores_candidato` (no RLS policy).
 */
export const ENTREVISTA_SCORES_ALLOWLIST =
  'id, candidatura_id, tipo, subtipo, score, score_max, status, metadata, citacoes, red_flags'

/**
 * The single auditable allowlist name the Wave-0 14-01 test source-probes
 * (`ENTREVISTA_ALLOWLIST = ...`). Aliases the guide projection so the contract
 * (an explicit, named allowlist exists; no star) is satisfied in one place.
 */
export const ENTREVISTA_ALLOWLIST = ENTREVISTA_GUIA_ALLOWLIST

/** Defensive bound on any RH read (no unbounded queries — WR-05 precedent). */
const READ_LIMIT = 100

// ── Row shapes (allowlist-projected) ─────────────────────────────────────────

/** One STAR/PEI guide question (the EF `guia.perguntas[]` shape). */
export interface GuiaPergunta {
  pergunta: string
  dimensao?: string | null
  /** The weak-dim score that motivated this question (online <3 / presencial <4). */
  score_atual?: number | null
  ancoras_bars?: Record<string, string> | string[] | null
  /**
   * Provenance of the question (ENTREV-08 audit). `'ia'` = AI-generated by the
   * `gerar-guia-entrevista` EF; `'manual'` = added/edited by the RH in the edit-mode
   * panel (20-04). The read layer (normalizeGuia) defaults legacy/missing → `'ia'`
   * (legacy guides are wholly AI-generated — no data backfill, A2).
   */
  origem?: 'ia' | 'manual'
  [k: string]: unknown
}

/** The interview-guide row, allowlist-projected. */
export interface EntrevistaGuiaRow {
  id: string
  candidatura_id: string
  tipo: string
  guia: { perguntas?: GuiaPergunta[]; foco?: string | null; [k: string]: unknown } | null
  prompt_version: string | null
  /**
   * Proveniência do roteiro (D-27b / 49-24). `'openai'` ⇒ veio do modelo de
   * contingência; NULL ⇒ desconhecida (as 5 linhas anteriores à v18 da EF, medidas em
   * 2026-09-23). NULL nunca é silêncio na tela — é «modelo não registrado» (D-30).
   */
  provedor_ia?: string | null
  modelo_ia?: string | null
  created_at: string
  /** Bumped by the save_entrevista_guia_edits upsert (20-02 migration). */
  updated_at?: string | null
}

/** One BARS competency dimension from the transcript analysis (AI-derived). */
export interface AnaliseCompetencia {
  competencia: string
  /**
   * The raw English key the EF persists (`competency`) — kept on the shape so the
   * normalization in `getAnalise` is non-lossy. Consumers read `competencia`.
   */
  competency?: string | null
  score?: number | null
  reasoning?: string | null
  bias_flags?: {
    content_dependent_only?: boolean
    regional_markers_ignored?: boolean
    disfluencies_ignored?: boolean
  } | null
  [k: string]: unknown
}

/** The transcript-analysis row, allowlist-projected. */
export interface EntrevistaAnaliseRow {
  id: string
  candidatura_id: string
  /**
   * De QUAL entrevista é esta análise (49-01/49-10). NULL nas 6 linhas vivas
   * anteriores à Phase 49 (medido 2026-09-23: `tipo` NULL em todas as 6) — e NULL é um
   * GRUPO próprio, não um palpite: a tela as mostra como «entrevista não identificada».
   */
  tipo: string | null
  status_analise: string
  /**
   * Quando esta análise foi SUPERADA por outra do mesmo `(candidatura, tipo)`. NULL =
   * não superada (o 1º termo do predicado `public.entrevista_analise_vigente`).
   * Superar é MARCAR, nunca apagar (D-02/49-10): a revisão humana que a linha teve
   * continua legível.
   */
  superada_em: string | null
  /** Qual texto gerou esta análise (D-38) — o mesmo valor de `ai_call_logs.input_hash`. */
  texto_hash: string | null
  /** Proveniência REAL (D-27b): `'openai'` ⇒ contingência; NULL ⇒ desconhecida (D-30). */
  provedor_ia: string | null
  modelo_ia: string | null
  competencias: AnaliseCompetencia[] | null
  citacoes: unknown[] | null
  bias_flags: Record<string, unknown> | null
  /** SEGURA o avanço (RF-24) — true when the language/accent flag fired. */
  bloqueio_avanco: boolean
  scores_humanos: Record<string, unknown> | null
  notas_humanas: string | null
  revisada_por: string | null
  /** The human-confirmed marker the server avancar_etapa guard reads to unblock. */
  revisao_confirmada_em: string | null
  prompt_version: string | null
  created_at: string
}

/** One score row (the inline scorecard + the cognitive band), allowlist-projected. */
export interface EntrevistaScoreRow {
  id: string
  candidatura_id: string
  tipo: string
  subtipo: string | null
  score: number | null
  score_max: number | null
  status: string
  metadata: Record<string, unknown> | null
  citacoes: unknown[] | null
  red_flags: unknown[] | null
}

/** The candidate-context dashboard row (etapa + scheduled datetime), allowlisted. */
export interface EntrevistaContextoRow {
  candidatura_id: string
  vaga_id: string
  etapa_atual: string
  /**
   * `candidaturas.status` — JORN-26: sem ele o hub não sabe que o knockout (etapa
   * `inscricao`, status `rejeitado`) ou o legado `finalizado` já acabaram, e oferece
   * «Avançar»/«Rejeitar». Ver `@/lib/candidatura/candidaturaEncerrada`.
   */
  status: string | null
  candidato_nome: string | null
  /** Horário da entrevista: agendamento ativo da candidatura (agendamentos_entrevista); fallback ao campo V1 da vaga. */
  entrevista_agendada_em: string | null
  /** Opt-in cognitive gate (default false). */
  aplica_cognitivo: boolean
}

// ── Reads (allowlist projections) ────────────────────────────────────────────

/**
 * Os status em que um agendamento ainda VALE — o que o painel deve exibir como horário.
 *
 * ⚠ 2026-09-06, no mesmo dia: o conserto da manhã filtrava `.eq('status', 'agendada')`.
 *   Bastou REAGENDAR (status → 'reagendada', o único caminho que a UI oferece para mudar
 *   a data) para o painel voltar a dizer «Sem horário definido» com a entrevista marcada
 *   para dali a 4 dias — a MESMA mensagem do defeito que aquele conserto resolvia. Uma
 *   lista literal de um item é uma fotografia do caminho feliz.
 *
 *   O critério é o complemento: valem os status que NÃO encerraram o agendamento.
 *   `cancelada` e `nao_compareceu` encerram; `em_andamento` e `concluida` não apagam a
 *   data (a entrevista aconteceu naquele horário). Espelha o `WHEN` do trigger
 *   `trg_notif_convite_reagendamento` (migration 20260906000004), que usa o mesmo conjunto
 *   ativo para decidir se reenvia o convite. O `satisfies` abaixo faz o compilador reprovar
 *   um valor novo do enum que não seja classificado aqui.
 */
const AGENDAMENTO_ENCERRADO = ['cancelada', 'nao_compareceu'] as const

export const AGENDAMENTO_ATIVO = [
  'agendada',
  'reagendada',
  'em_andamento',
  'concluida',
] as const satisfies readonly Exclude<
  StatusAgendamento,
  (typeof AGENDAMENTO_ENCERRADO)[number]
>[]

/**
 * Resolves the candidate context for the dashboard: the candidatura's vaga,
 * current etapa, candidate name, the manually-scheduled interview datetime, and
 * the cognitive opt-in. Allowlist projection — never a star projection. The `:id`
 * route param is a candidatura id.
 */
export async function getEntrevistaContexto(
  candidaturaId: string,
): Promise<EntrevistaContextoRow | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('candidaturas')
    .select(
      'id, vaga_id, etapa_atual, status, candidatos ( nome_completo ), vagas ( entrevista_agendada_em, aplica_cognitivo )',
    )
    .eq('id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível carregar o contexto da entrevista: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  if (!data) return null

  const raw = data as unknown as {
    id: string
    vaga_id: string
    etapa_atual: string
    status?: string | null
    candidatos?: { nome_completo?: string } | null
    vagas?: { entrevista_agendada_em?: string | null; aplica_cognitivo?: boolean } | null
  }
  // 2026-09-06: o horário vinha SÓ de `vagas.entrevista_agendada_em` — um campo por
  // VAGA (V1) que nada no app escreve. O painel dizia «Sem horário definido» com um
  // agendamento de 10/09 gravado em `agendamentos_entrevista` (Phase 35, por
  // candidatura). A fonte de verdade é o agendamento ativo mais recente da
  // candidatura; o campo da vaga fica só como fallback histórico.
  let agendadaEm: string | null = raw.vagas?.entrevista_agendada_em ?? null
  const { data: agendamento } = await supabase
    .from('agendamentos_entrevista')
    .select('data_hora')
    .eq('candidatura_id', candidaturaId)
    .in('status', AGENDAMENTO_ATIVO)
    .is('deleted_at', null)
    .order('data_hora', { ascending: false })
    .limit(1)
    .maybeSingle()
  const dataHora = (agendamento as { data_hora?: string | null } | null)?.data_hora
  if (typeof dataHora === 'string' && dataHora) agendadaEm = dataHora

  return {
    candidatura_id: raw.id,
    vaga_id: raw.vaga_id,
    etapa_atual: raw.etapa_atual,
    status: raw.status ?? null,
    candidato_nome: raw.candidatos?.nome_completo ?? null,
    entrevista_agendada_em: agendadaEm,
    aplica_cognitivo: raw.vagas?.aplica_cognitivo ?? false,
  }
}

/**
 * Resolves the vaga id for a candidatura (the `:id` route param is a candidatura
 * id; some reads/writes are keyed by vaga). Allowlist projection — never
 * a star projection. Returns null when missing.
 */
export async function getVagaIdForCandidatura(candidaturaId: string): Promise<string | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('candidaturas')
    .select('vaga_id')
    .eq('id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível resolver a vaga: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  return (data as { vaga_id: string | null } | null)?.vaga_id ?? null
}

/**
 * One STAR/PEI guide question as it can appear inside the persisted `questions[]`
 * array. The EF emits English keys (`question`/`competency`); but a PRESERVED manual
 * row carries the pt-BR keys (`pergunta`/`dimensao`) — it was written by the RPC
 * (`saveGuiaEdits` → `{ perguntas: [{ pergunta, dimensao, origem:'manual' }] }`) and
 * then concatenated verbatim into the English-keyed `questions[]` by the EF merge
 * (`mergedQuestions = [...manualQs, ...freshIaQs]`). normalizeGuia therefore tolerates
 * BOTH key shapes per element so a manual row never normalizes to an empty `pergunta`
 * (CR-01) and never loses its `dimensao` (WR-02).
 */
interface EfGuiaQuestion {
  question?: string
  competency?: string
  /** pt-BR shape — present on a preserved manual row living under `questions[]` (CR-01/WR-02). */
  pergunta?: string
  dimensao?: string | null
  bars_anchors?: unknown
  /** Provenance, when present (the EF stamps `'ia'`; RH edits stamp `'manual'`). */
  origem?: string
  [k: string]: unknown
}

/**
 * Bridges the EF-persisted interview guide to the shape the RH panel reads
 * (ENTREV-GUIA-DISPLAY-01 — [[feedback_integration_contract_gap]]).
 *
 * `gerar-guia-entrevista` persists `guia` under its `InterviewGuideSchema` OUTPUT shape:
 * `{ questions: [{ question, competency, bars_anchors, ... }], ... }` (English keys). The
 * RH panel (`GuiaEntrevistaPanel.perguntasOf` + `PerguntaRow`) reads `guia.perguntas[]`
 * with `pergunta`/`dimensao` (pt-BR). Without this bridge `guia.perguntas` is undefined →
 * the panel renders "Nenhum guia gerado ainda." for EVERY persisted guide, however created.
 *
 * Bridged in the SERVICE READ LAYER ONLY (exact precedent: `normalizeCompetencia` for the
 * transcript analysis, CR-04) — the EF write is NOT renamed (it keeps `questions`/
 * `competency`, which `weakDimsFromScores` + the coverage check read). Non-lossy: the
 * original EF keys are preserved via spread. An incompleto guia (no `questions`) and a
 * guia already in pt-BR (`perguntas` present) pass through untouched.
 *
 * CR-01/WR-01/WR-02 (key-shape collision): after an EF regen the `questions[]` array is
 * HETEROGENEOUS — fresh IA rows carry English keys (`question`/`competency`), but a
 * PRESERVED manual row carries the pt-BR keys (`pergunta`/`dimensao`) because the RPC
 * wrote it that way and the EF merge concatenated it verbatim. Deriving `pergunta`
 * SOLELY from `q.question` blanked the manual row's text (it has none) — data loss to
 * the RH. The fix reads BOTH shapes per element: `pergunta = q.pergunta ?? q.question`
 * and `dimensao = q.dimensao ?? q.competency`, so a manual row in either shape renders
 * its real text/dimension regardless of which writer last touched it.
 */
export function normalizeGuia(guia: EntrevistaGuiaRow['guia']): EntrevistaGuiaRow['guia'] {
  if (!guia || typeof guia !== 'object') return guia
  // Already pt-BR (defensive — e.g. a future EF emitting `perguntas`): leave as-is.
  if (Array.isArray((guia as { perguntas?: unknown }).perguntas)) return guia
  const questions = (guia as { questions?: EfGuiaQuestion[] }).questions
  if (!Array.isArray(questions)) return guia
  const perguntas: GuiaPergunta[] = questions.map((q) => ({
    ...q,
    // CR-01: a preserved manual row carries `pergunta` (no `question`); fall back to it
    // so its text survives a regen-merge instead of normalizing to '' (silent data loss).
    pergunta:
      typeof q.pergunta === 'string'
        ? q.pergunta
        : typeof q.question === 'string'
          ? q.question
          : '',
    // WR-02: likewise carry the manual row's `dimensao` when the English `competency`
    // is absent, so a preserved manual row keeps its dimension through the round-trip.
    dimensao:
      typeof q.dimensao === 'string'
        ? q.dimensao
        : typeof q.competency === 'string'
          ? q.competency
          : null,
    // ENTREV-08: the read layer is origem-aware. Provenance survives the read; a
    // missing/legacy/garbled value defaults to 'ia' (legacy guides are wholly
    // AI-generated — no data backfill, A2). Only an explicit 'manual' is preserved.
    origem: q.origem === 'manual' ? 'manual' : 'ia',
  }))
  return { ...guia, perguntas }
}

/**
 * Reads the latest interview guide for a candidatura (RH/admin only — candidate
 * denied by RLS). Allowlist projection of `entrevista_guias`. Returns null when
 * no guide has been generated yet. Normalizes the EF OUTPUT shape (questions[]/
 * competency) → the pt-BR perguntas[] the panel reads (ENTREV-GUIA-DISPLAY-01).
 */
export async function getGuia(candidaturaId: string): Promise<EntrevistaGuiaRow | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('entrevista_guias')
    .select(ENTREVISTA_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível carregar o guia: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  const rows = (data as unknown as EntrevistaGuiaRow[] | null) ?? []
  const row = rows[0] ?? null
  if (!row) return null
  // Bridge the EF OUTPUT shape (questions[]/competency) → the pt-BR perguntas[] the
  // panel reads (ENTREV-GUIA-DISPLAY-01). Without this every guide rendered empty.
  return { ...row, guia: normalizeGuia(row.guia) }
}

/**
 * Normalizes one persisted competency entry (CR-04). The EF writes the English key
 * `competency` (`extractCompetencias` in avaliar-transcricao-entrevista/index.ts);
 * every RH consumer reads the pt-BR key `competencia`. We bridge the two in the
 * SERVICE READ LAYER ONLY — the EF write is NOT renamed (gerar-guia's
 * weakDimsFromScores keeps reading `competency`, IN-03). A missing label falls
 * through to an empty string so the UI filters/keys never crash.
 */
function normalizeCompetencia(c: AnaliseCompetencia): AnaliseCompetencia {
  return {
    ...c,
    competencia:
      typeof c.competencia === 'string' && c.competencia.length > 0
        ? c.competencia
        : typeof c.competency === 'string'
          ? c.competency
          : '',
    score: typeof c.score === 'number' ? c.score : null,
  }
}

/**
 * A análise VIGENTE? — a MESMA regra que o banco aplica.
 *
 * Espelha `public.entrevista_analise_vigente(timestamptz, text, jsonb)` (criada pelo
 * plano 49-01 e CHAMADA pelas três RPCs de `entrevista_analises`, 49-10). O corpo vivo,
 * lido do catálogo em 2026-09-23:
 *
 * ```sql
 * SELECT p_superada_em IS NULL
 *    AND p_status_analise IS DISTINCT FROM 'falhou'
 *    AND p_competencias IS NOT NULL
 * ```
 *
 * ⚠ **Esta é a QUINTA cópia potencial do predicado, e é por isso que ela é uma função
 * só, nomeada, com a fonte apontada.** A lacuna do JORN-12 é literalmente vários
 * leitores decidindo «qual análise vale» por regras que divergiam em silêncio — o
 * `avancar_etapa`, a revisão humana, a RPC de gravação e a TELA. Os três primeiros
 * passaram a chamar a função do banco (49-06/49-10); o navegador não pode chamá-la numa
 * consulta de coluna, então aqui ela é transcrita UMA vez. Mudar a regra do banco sem
 * mudar esta linha é o defeito voltando.
 */
function analiseVigente(row: EntrevistaAnaliseRow): boolean {
  return (
    row.superada_em == null &&
    row.status_analise !== 'falhou' &&
    row.competencias != null
  )
}

/**
 * As análises de uma candidatura separadas por VIGÊNCIA (D-39 / D4 / D-42).
 *
 * A tela mostrava a mais nova de QUALQUER estado como se fosse a que vale — então uma
 * falha de IA virava «a análise», e a análise boa anterior desaparecia junto com a
 * revisão humana que alguém tinha feito nela.
 */
export interface AnalisesPorVigencia {
  /**
   * A vigente de CADA grupo de tipo — `online`, `presencial` e o grupo das análises
   * antigas sem tipo (`tipo` NULL é um grupo próprio, nunca um palpite: RESEARCH
   * Correção 10). Mais recente primeiro.
   */
  vigentes: EntrevistaAnaliseRow[]
  /**
   * As anteriores, mais recente primeiro — acessíveis, nunca escondidas (D4).
   *
   * ⚠ Inclui DUAS populações, e a diferença é visível na tela em vez de apagada:
   * (a) as MARCADAS, com `superada_em` preenchida pela RPC (49-10); (b) as legadas que
   * já foram superadas de FATO — existe uma vigente mais nova do mesmo grupo — mas cujo
   * marcador nunca foi escrito (as 6 linhas de PROD medidas em 2026-09-23 têm
   * `superada_em` NULL em todas). Para (b) a tela diz que a data não está registrada, em
   * vez de inventar uma; a marcação retroativa é do plano 49-12, com checkpoint.
   */
  superadas: EntrevistaAnaliseRow[]
  /**
   * As que NÃO produziram análise: `status_analise='falhou'` (injeção, parse nulo, teto
   * de custo desde o 49-26) ou sem competências. Nunca apresentadas como vigentes.
   */
  falhas: EntrevistaAnaliseRow[]
  /**
   * A ÚNICA análise sobre a qual a revisão humana é oferecida: a vigente mais recente —
   * exatamente a linha que `salvar_avaliacao_entrevista` grava e que
   * `confirmar_revisao_entrevista` aceita (49-10). Oferecer revisar outra seria oferecer
   * uma ação que o servidor recusa.
   */
  vigenteMaisRecente: EntrevistaAnaliseRow | null
}

/** `tipo` NULL é um grupo próprio — chave interna do agrupamento (nunca vai à tela). */
const GRUPO_SEM_TIPO = '__sem_tipo__'

/**
 * Lê TODAS as análises de uma candidatura e as classifica por vigência (JORN-12).
 *
 * UMA consulta — não N+1: a classificação é feita no cliente com o predicado
 * {@link analiseVigente}, que é a transcrição da função do banco. Allowlist projection
 * de `entrevista_analises`, nunca `select('*')`.
 *
 * CR-04: o EF persiste a chave inglesa `competency`; esta leitura a normaliza para o
 * `competencia` pt-BR que a UI do RH lê (scorecard + painel), em TODAS as linhas — a
 * superada é lida pelo RH tanto quanto a vigente.
 */
export async function getAnalises(candidaturaId: string): Promise<AnalisesPorVigencia> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('entrevista_analises')
    .select(ENTREVISTA_ANALISE_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .order('created_at', { ascending: false })
    .limit(READ_LIMIT)

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível carregar a análise da transcrição: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  const rows = ((data as unknown as EntrevistaAnaliseRow[] | null) ?? []).map((row) => ({
    ...row,
    competencias: Array.isArray(row.competencias)
      ? row.competencias.map(normalizeCompetencia)
      : row.competencias,
  }))

  const vigentes: EntrevistaAnaliseRow[] = []
  const superadas: EntrevistaAnaliseRow[] = []
  const falhas: EntrevistaAnaliseRow[] = []
  // As linhas vêm ordenadas por `created_at` DESC, então a PRIMEIRA vigente de cada
  // grupo é a vigente dele. As vigentes seguintes do mesmo grupo são as legadas da
  // população (b) — superadas de fato, sem o marcador escrito.
  const vigenteJaVista = new Set<string>()

  for (const row of rows) {
    if (row.superada_em != null) {
      superadas.push(row)
      continue
    }
    if (!analiseVigente(row)) {
      falhas.push(row)
      continue
    }
    const grupo = row.tipo ?? GRUPO_SEM_TIPO
    if (vigenteJaVista.has(grupo)) {
      superadas.push(row)
      continue
    }
    vigenteJaVista.add(grupo)
    vigentes.push(row)
  }

  return {
    vigentes,
    // Reordena porque a população (b) foi intercalada durante a varredura por grupo.
    superadas: superadas.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    falhas,
    vigenteMaisRecente: vigentes[0] ?? null,
  }
}

/**
 * A análise VIGENTE mais recente de uma candidatura — a que o scorecard pontua e a que
 * a revisão humana pode confirmar. Retorna null quando nenhuma transcrição produziu
 * análise que valha.
 *
 * ⚠ Até o plano 49-16 esta função devolvia a linha mais nova de QUALQUER estado
 * (`order('created_at', desc).limit(1)`). Com isso uma análise que falhou passava a ser
 * «a análise» da tela e do scorecard, escondendo a que tinha funcionado — e a revisão
 * era oferecida sobre uma linha que a RPC recusa desde o 49-10.
 */
export async function getAnalise(
  candidaturaId: string,
): Promise<EntrevistaAnaliseRow | null> {
  const { vigenteMaisRecente } = await getAnalises(candidaturaId)
  return vigenteMaisRecente
}

/**
 * Reads the interview + cognitive score rows for a candidatura (the inline
 * scorecard reads `tipo='entrevista'`; the cognitive band reads `tipo='cognitivo'`).
 * Allowlist projection of `scores_candidato` — never a star projection.
 */
export async function getScores(candidaturaId: string): Promise<EntrevistaScoreRow[]> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { data, error } = await supabase
    .from('scores_candidato')
    .select(ENTREVISTA_SCORES_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .in('tipo', ['entrevista', 'cognitivo'])
    .limit(READ_LIMIT)

  if (error) {
    throw new EntrevistaServiceError(
      `Não foi possível carregar as avaliações: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  return (data as unknown as EntrevistaScoreRow[] | null) ?? []
}

// ── Writes — RPC + EF invokes ────────────────────────────────────────────────

/**
 * Maps a Postgres/PostgREST error code to the service error union.
 *
 * `mensagens` sobrepõe a cópia de UM código para UMA chamada (49-16). Existe porque o
 * 23514 genérico — «Dados inválidos. Verifique os campos.» — é a frase errada para a
 * recusa que o `confirmar_revisao_entrevista` passou a fazer no 49-10: não há campo
 * errado para o RH conferir, a análise é que não é mais a que vale. Escopado à chamada de
 * propósito: as outras RPCs deste serviço usam 23514 para validação de campo mesmo, e
 * trocar a frase para todas tornaria a mensagem errada em quatro lugares em vez de um.
 */
function mapRpcError(
  error: unknown,
  fallbackMsg: string,
  mensagens?: Partial<Record<string, string>>,
): EntrevistaServiceError {
  const code = (error as { code?: string }).code ?? ''
  const propria = mensagens?.[code]
  if (propria) {
    return new EntrevistaServiceError(
      propria,
      code === '42501' ? 'FORBIDDEN' : 'INVALID_INPUT',
      error,
    )
  }
  if (code === '42501') {
    return new EntrevistaServiceError(
      'Você não tem permissão para esta avaliação.',
      'FORBIDDEN',
      error,
    )
  }
  if (code === '23514') {
    return new EntrevistaServiceError(
      'Dados inválidos. Verifique os campos.',
      'INVALID_INPUT',
      error,
    )
  }
  if (code === 'P0002' || code === 'no_data_found') {
    return new EntrevistaServiceError('Registro não encontrado.', 'NOT_FOUND', error)
  }
  return new EntrevistaServiceError(fallbackMsg, 'NETWORK_ERROR', error)
}

/** Payload for the inline scorecard save (BARS notas_humanas + optional notes). */
export interface SalvarAvaliacaoPayload {
  scoresHumanos: Record<string, number>
  notas: string
}

/**
 * Records the gestor's interview scorecard via the LIVE `salvar_avaliacao_entrevista`
 * SECURITY DEFINER RPC — NEVER a direct UPDATE. The RPC enforces role + own-vaga and
 * NEVER advances the funil / auto-rejects (RNF-07a). Error map: 42501 → FORBIDDEN,
 * 23514 → INVALID_INPUT, P0002/no_data_found → NOT_FOUND, else → NETWORK_ERROR.
 */
export async function salvarAvaliacao(
  candidaturaId: string,
  payload: SalvarAvaliacaoPayload,
): Promise<void> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { error } = await supabase.rpc('salvar_avaliacao_entrevista', {
    p_candidatura_id: candidaturaId,
    p_scores_humanos: payload.scoresHumanos,
    p_notas: payload.notas ?? '',
  })
  if (error) {
    throw mapRpcError(error, 'Não foi possível salvar a avaliação. Tente novamente.')
  }
}

/**
 * Persists the RH-edited interview guide via the LIVE `save_entrevista_guia_edits`
 * SECURITY DEFINER RPC (20-02) — NEVER a direct UPDATE. The RPC enforces role
 * (derived from `usuarios_rh`, not the JWT claim — ENTREV-08) + own-vaga and stores
 * the `perguntas[]` array as OPAQUE jsonb. It NEVER writes `candidaturas`, NEVER
 * advances the funil / auto-rejects (RNF-07a). The client stamps `origem:'manual'`
 * on RH-added rows (20-04 edit state); this service passes the array verbatim.
 *
 * Anti-tamper (T-20-09): the payload carries only the edited `perguntas[]` —
 * pergunta/dimensao/origem — never a top-level score/band/veredito; the guide is a
 * recommendation that never feeds candidaturas. Error map (reuses mapRpcError
 * verbatim): 42501 → FORBIDDEN, 23514 → INVALID_INPUT, P0002/no_data_found →
 * NOT_FOUND, else → NETWORK_ERROR — the raw RPC error/PII is NEVER surfaced. Reads
 * the guide back via the allowlist (origem default 'ia') so callers get the fresh row.
 */
export async function saveGuiaEdits(
  candidaturaId: string,
  tipo: TipoEntrevista,
  perguntas: GuiaPergunta[],
): Promise<EntrevistaGuiaRow | null> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  const { error } = await supabase.rpc('save_entrevista_guia_edits', {
    p_candidatura_id: candidaturaId,
    p_tipo: tipo,
    // The RPC stores opaque jsonb (database.types.ts types p_guia as `Json`); the
    // GuiaPergunta index signature (`[k:string]:unknown`) is structurally wider than
    // Json, so cast at the RPC boundary (precedent: configVagaService p_opcoes).
    p_guia: { perguntas } as unknown as Json,
  })
  if (error) {
    throw mapRpcError(error, 'Não foi possível salvar as edições do guia. Tente novamente.')
  }
  // The RPC upserts entrevista_guias; read it back via the allowlist (origem default 'ia').
  return getGuia(candidaturaId)
}

/** The EF body for guide generation — identifiers + tipo ONLY (anti-tamper). */
interface GerarGuiaBody {
  candidatura_id: string
  vaga_id: string
  tipo: TipoEntrevista
}

/**
 * Invokes the LIVE `gerar-guia-entrevista` EF. The client body carries ONLY
 * `{ candidatura_id, vaga_id, tipo }` — never a score/band (the 14-01 contract
 * test parses this exact shape under the EF `.strict()` schema). Returns the
 * freshly-generated guide row.
 */
export async function gerarGuia(
  candidaturaId: string,
  vagaId: string,
  tipo: TipoEntrevista,
): Promise<EntrevistaGuiaRow | null> {
  if (!candidaturaId || !vagaId) {
    throw new EntrevistaServiceError('candidaturaId e vagaId são obrigatórios', 'INVALID_INPUT')
  }
  const body: GerarGuiaBody = { candidatura_id: candidaturaId, vaga_id: vagaId, tipo }
  const { error } = await supabase.functions.invoke('gerar-guia-entrevista', { body })
  if (error) {
    throw new EntrevistaServiceError(
      'Não foi possível gerar o guia. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }
  // The EF persists to entrevista_guias; read it back via the allowlist.
  return getGuia(candidaturaId)
}

/**
 * The EF body for transcript analysis — identifiers + raw text ONLY (anti-tamper).
 *
 * `tipo` (D-41): de QUAL entrevista é esta transcrição. Escolha do RH; a etapa atual é
 * só o PADRÃO da tela, porque analisar a transcrição da online quando o candidato já
 * está em presencial é legítimo. O campo é OPCIONAL no schema `.strict()` da EF desde o
 * 49-10 (a EF saiu antes da tela — D-55), mas a tela sempre o manda: sem ele a EF cai no
 * padrão dela e, fora de etapa de entrevista, devolve 400 pedindo o tipo.
 */
interface AvaliarTranscricaoBody {
  candidatura_id: string
  transcricao: string
  tipo: TipoEntrevista
}

/**
 * O que a EF `avaliar-transcricao-entrevista` devolve (contrato do 49-10) — o que a tela
 * precisa para NÃO simular uma análise nova que não houve (D-40).
 */
export interface AnaliseTranscricaoResultado {
  /** A análise resultante (nova, reaproveitada ou a linha de falha). */
  analise_id: string | null
  /** De qual entrevista a EF registrou a análise. */
  tipo: TipoEntrevista | null
  /**
   * `true` ⇒ este texto JÁ tinha sido analisado com sucesso: nenhuma linha nova, nenhuma
   * chamada de IA paga. A EF confere o `texto_hash` antes de chamar o modelo.
   */
  reaproveitada: boolean
  /** `true` ⇒ a análise devolvida é a VIGENTE do seu tipo. */
  vigente: boolean
  /**
   * `true` ⇒ a análise não pôde ser concluída (injeção, parse fora do schema, teto de
   * custo). A linha entra como `falhou`, NÃO supera ninguém, e a vigente anterior
   * continua valendo (49-10/49-26).
   */
  falhou: boolean
}

/**
 * Server-authoritative minimum transcript length (mirrors the EF
 * `MIN_TRANSCRICAO_LEN = 200` in avaliar-transcricao-entrevista/index.ts). WR-05:
 * the client guards this BEFORE invoking so a too-short transcript surfaces a
 * specific, non-retryable message instead of a generic network error.
 */
export const MIN_TRANSCRICAO_LEN = 200

/**
 * Invokes the LIVE `avaliar-transcricao-entrevista` EF. The client body carries
 * ONLY `{ candidatura_id, transcricao, tipo }` — the transcript is UNTRUSTED text and
 * the EF does injection-detect + maskPII server-side. Never a score/band on the
 * body (the 14-01 contract test parses this exact shape).
 *
 * Devolve o RESULTADO da EF (D-40), não a linha lida de volta: «o texto já tinha sido
 * analisado» e «a análise não pôde ser concluída» são fatos que só a resposta carrega. A
 * tela lê a análise por {@link getAnalises} depois da invalidação — ler de volta aqui
 * diria «pronto» tanto no caso em que nasceu uma análise quanto no caso em que nada
 * nasceu, que é precisamente a confusão que o D-40 existe para acabar.
 */
export async function analisarTranscricao(
  candidaturaId: string,
  transcricao: string,
  tipo: TipoEntrevista,
): Promise<AnaliseTranscricaoResultado> {
  if (!candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  if (!transcricao || transcricao.trim().length === 0) {
    throw new EntrevistaServiceError('A transcrição é obrigatória.', 'INVALID_INPUT')
  }
  // WR-05: mirror the EF's 200-char floor client-side with a SPECIFIC pt-BR message
  // — a too-short transcript is a deterministic validation failure, not a retryable
  // network error.
  if (transcricao.trim().length < MIN_TRANSCRICAO_LEN) {
    throw new EntrevistaServiceError(
      `A transcrição é muito curta para análise (mínimo de ${MIN_TRANSCRICAO_LEN} caracteres).`,
      'INVALID_INPUT',
    )
  }
  const body: AvaliarTranscricaoBody = {
    candidatura_id: candidaturaId,
    transcricao,
    tipo,
  }
  const { data, error } = await supabase.functions.invoke('avaliar-transcricao-entrevista', {
    body,
  })
  if (error) {
    // WR-05: surface the EF `error_code:'VALIDATION'` distinctly instead of
    // collapsing every EF error into NETWORK_ERROR. The FunctionsHttpError carries
    // the parsed body on `context` (a Response); fall back to the error shape.
    const efCode = await extractEfErrorCode(data, error)
    if (efCode === 'VALIDATION') {
      throw new EntrevistaServiceError(
        'A transcrição não passou na validação. Verifique se há texto suficiente para análise.',
        'INVALID_INPUT',
        error,
      )
    }
    throw new EntrevistaServiceError(
      'Não foi possível analisar a transcrição. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }
  // A EF devolve 200 mesmo no caminho de FALHA (o payload é que diz `falhou: true`) —
  // dar 500 a uma injeção detectada ou a um corte por teto de custo transformaria um
  // controle funcionando em falha do sistema (49-26). Por isso a leitura do resultado é
  // do CORPO, não do código de status.
  const res = (data ?? {}) as {
    analise_id?: string | null
    tipo?: string | null
    reaproveitada?: boolean
    vigente?: boolean
    falhou?: boolean
  }
  return {
    analise_id: res.analise_id ?? null,
    tipo: res.tipo === 'online' || res.tipo === 'presencial' ? res.tipo : null,
    reaproveitada: res.reaproveitada === true,
    vigente: res.vigente === true,
    falhou: res.falhou === true,
  }
}

/**
 * Confirms human review on the transcript analysis — sets
 * `entrevista_analises.revisao_confirmada_em`, which the server `avancar_etapa`
 * guard reads to RELEASE the language/accent flag block (RF-24 / RNF-07a). This
 * is the only enabled path out of the flag block; the human always decides.
 *
 * CR-03 + WR-07: routes through the `confirmar_revisao_entrevista` SECURITY DEFINER
 * RPC (role + vaga-ownership guarded) — NEVER a direct UPDATE. `entrevista_analises`
 * has RLS with only a SELECT policy, so a client UPDATE would be RLS-filtered to a
 * silent 0-row no-op (no error, no write). The RPC RETURNS the updated row; we ASSERT
 * the marker landed and throw NOT_FOUND when nothing came back — no silent success.
 * Error map: 42501 → FORBIDDEN, P0002/no_data_found → NOT_FOUND, else → NETWORK_ERROR.
 */
export async function confirmarRevisaoHumana(analiseId: string): Promise<void> {
  if (!analiseId) {
    throw new EntrevistaServiceError('analiseId é obrigatório', 'INVALID_INPUT')
  }
  // `confirmar_revisao_entrevista` (14-07 migration) is live in PROD + present in the
  // regenerated database.types.ts union — no cast needed.
  const { data, error } = await supabase.rpc('confirmar_revisao_entrevista', {
    p_analise_id: analiseId,
  })

  if (error) {
    throw mapRpcError(error, 'Não foi possível confirmar a revisão. Tente novamente.', {
      // 49-10: a RPC recusa com `check_violation` (23514) quando a análise foi SUPERADA
      // ou FALHOU — ela existe e foi encontrada, só não é mais a que vale. A frase
      // genérica de 23514 mandaria o RH conferir campos que não existem nesta ação.
      '23514':
        'Esta análise não é mais a vigente desta entrevista — a revisão só pode ser confirmada na análise que vale. Recarregue a página para ver a atual.',
    })
  }

  // Readback assertion (WR-07): the RPC returns the updated row carrying
  // revisao_confirmada_em. A null/empty return means nothing was confirmed —
  // surface NOT_FOUND instead of an optimistic "released".
  const row = Array.isArray(data) ? data[0] : data
  const marker = (row as { revisao_confirmada_em?: string | null } | null)?.revisao_confirmada_em
  if (!row || !marker) {
    throw new EntrevistaServiceError(
      'A análise não foi encontrada ou a revisão não pôde ser confirmada.',
      'NOT_FOUND',
      data,
    )
  }
}

/**
 * Records an AUDIT-ONLY cognitive-band ressalva in `bias_audit_log` (ENTREV-05 /
 * RNF-07a / RF-27). WR-03: this does NOT reject the candidate — the cognitive band
 * never decides; the real auditable rejection is the Phase-15 decisão final. The UI
 * forces an expanded justification and writes this audit row. NEVER advances/decides
 * the funil here — this is the audit trail, the human owns the decision elsewhere.
 */
export async function registrarRejeicaoCognitiva(input: {
  candidaturaId: string
  banda: BandaCognitiva | string | null
  justificativa: string
  flagDemografico?: boolean
}): Promise<void> {
  if (!input.candidaturaId) {
    throw new EntrevistaServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }
  if (!input.justificativa || input.justificativa.trim().length === 0) {
    throw new EntrevistaServiceError(
      'A justificativa expandida é obrigatória ao rejeitar com base no raciocínio lógico.',
      'INVALID_INPUT',
    )
  }
  const { error } = await supabase.from('bias_audit_log').insert({
    dados: {
      tipo: 'rejeicao_cognitiva',
      candidatura: input.candidaturaId,
      banda: input.banda ?? null,
      motivo: input.justificativa,
      flag_demografico: input.flagDemografico ?? false,
    },
  })
  if (error) {
    throw mapRpcError(error, 'Não foi possível registrar a auditoria. Tente novamente.')
  }
}
