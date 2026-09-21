/**
 * explicacaoService — the candidate LGPD Art. 20 explanation data layer (DECISAO-04).
 *
 * Clones the Phase-14 `cognitivoService` posture verbatim — the closest candidate
 * data-layer analog (own-row allowlist read + SECURITY DEFINER RPC invoke + custom
 * error class). The genuinely load-bearing invariants (RNF-07a + LGPD-04):
 *
 *  - `getExplicacao` reads `decisao_final` via an EXPLICIT own-row allowlist
 *    (`DECISAO_EXPLICACAO_ALLOWLIST` — 6 named columns) that EXCLUDES the internal RH
 *    `justificativa` free text (Phase-24 CR-01 — a column read but never used still ships
 *    over the wire) AND every score / band / percentile column, and NEVER joins the
 *    psychometric scores table. RLS is row-level only and does NOT hide columns
 *    ([[reference_select_star_leaks_pii]] — the Phase-8 LGPD leak lesson, T-15-12). NEVER
 *    a star projection. The own-row scope is enforced by the LIVE
 *    `candidato_le_propria_decisao` RLS policy (`candidatos.user_id = auth.uid()`).
 *
 *  - REACHABILITY GATE (Pitfall 6 / T-15-14): the read returns the decision only
 *    when `decisao = 'rejeitado'`. Any other state (no row / aprovado / em_espera)
 *    resolves to `null` → the page renders the "Esta página não está disponível"
 *    state. The page is a transparency surface, not a status board.
 *
 *  - NON-CLINICAL REASON (Open Q5): the candidate sees a respectful, deterministic
 *    TEMPLATED reason keyed on `decisao` — NOT the raw internal RH justificativa
 *    tone, and NEVER a score/band/percentile. The internal justificativa never
 *    crosses to the candidate surface verbatim.
 *
 *  - `solicitarRevisao` invokes the LIVE `solicitar_revisao_decisao` SECURITY
 *    DEFINER RPC (own-row guarded, idempotent — DECISAO-04 / LGPD Art. 20). On RPC
 *    success it fires a fire-and-forget N8N webhook (the established thin-client
 *    idiom — copies submit-candidatura's redacted post-commit fetch) to notify the
 *    responsible RH; the webhook is NON-BLOCKING and NEVER throws into the mutation
 *    (the request is already registered server-side once the RPC resolves OK). The
 *    body carries NO PII beyond ids.
 *
 *  - `stampExplicacao` invokes `stamp_explicacao_acessada` (own-row, first-access
 *    stamp — transparency evidence, T-15-15). A 42501 / 403 from either RPC (own-row
 *    denial) surfaces as a neutral no-op outcome, NOT an error.
 *
 * The two candidate RPCs (`solicitar_revisao_decisao` / `stamp_explicacao_acessada`)
 * are LIVE in PROD (migration `20260625100001_decisao_final_phase15.sql`) and typed in
 * `database.types.ts` (regen da Plan 15-06) — the `rpc()` calls below are fully typed,
 * no `as never` casts remain.
 *
 * @module features/explicacao/services/explicacaoService
 * @see src/features/avaliacao-cognitiva/services/cognitivoService.ts (allowlist read + RPC + error class analog)
 * @see src/features/decisao/services/decisaoService.ts (the own-row SECURITY DEFINER RPC precedent)
 * @see supabase/functions/submit-candidatura/index.ts (the redacted fire-and-forget N8N webhook idiom)
 * @see supabase/migrations/20260625100001_decisao_final_phase15.sql (solicitar_revisao_decisao / stamp_explicacao_acessada — LIVE in PROD)
 */
import { supabase } from '@/lib/supabase/client'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class ExplicacaoServiceError extends Error {
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
    this.name = 'ExplicacaoServiceError'
  }
}

/**
 * The EXPLICIT own-row column allowlist for the candidate read of `decisao_final`. It
 * names ONLY the 6 columns the candidate may see — the high-level `decisao` and the
 * LGPD Art. 20 lifecycle stamps (`revisao_solicitada_em`, `revisao_resultado`,
 * `explicacao_solicitada_em`) plus, since Phase 42 / 42-11 (REVISAO-04), the review
 * OUTCOME the candidate has a right to read: `revisao_veredito` and
 * `revisao_respondida_em`.
 *
 * SEC-02-class fix (Phase 24 / CR-01): the internal RH `justificativa` free text is
 * DELIBERATELY EXCLUDED. RLS is row-level only and does NOT hide columns
 * ([[reference_select_star_leaks_pii]]); selecting `justificativa` transmitted the raw
 * internal reasoning to the candidate's browser (visible in DevTools) even though the
 * candidate-facing `reason` is derived purely from `decisao` via REASON_BY_DECISAO —
 * `justificativa` was never read. Dropping it from the projection closes the leak at the
 * network layer. Also EXCLUDES every score/band/percentile column and NEVER joins the
 * psychometric scores table (RNF-07a / LGPD-04, T-15-12). NEVER the wildcard.
 *
 * TWO EXCLUSIONS THAT SURVIVED THE 42-11 EXTENSION, both asserted negatively in the
 * service test (an extension is exactly where an exclusion is lost by accident):
 *
 *  1. THE REVIEWER'S IDENTITY IS NOT HERE. The column that records WHO answered the
 *     review is NOT in this allowlist, and the candidate's client does not read it at
 *     all. The reviewer's name is employee PII, and the Art. 20 transparency duty is
 *     discharged by the CONTENT of the review — the verdict and the written reasoning —
 *     not by naming the person who wrote it (42-UI-SPEC §Regra de identidade).
 *  2. `justificativa` STAYS OUT. That exclusion is the Phase-24 CR-01 fix and must not
 *     be reverted by accident: a column that is read and never used still travels over
 *     the wire into the candidate's browser.
 */
export const DECISAO_EXPLICACAO_ALLOWLIST =
  'decisao, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em, revisao_veredito, revisao_respondida_em'

/** The candidate-facing decision result — the live `decisao_final_resultado` enum. */
export type DecisaoResultado = 'aprovado' | 'rejeitado' | 'em_espera'

/**
 * The LGPD Art. 20 review verdict — a CLOSED two-value vocabulary, mirroring the live
 * `p_veredito NOT IN ('mantida','revertida')` guard of `responder_revisao_decisao`
 * (migration `20260730000002`).
 *
 * The union is narrowed HERE rather than typed as `string` because the client decides
 * what to RENDER from it. The DB CHECK already restricts the vocabulary, but a remote
 * invariant is the wrong thing for a rendering decision to rest on: the day a fifth
 * verdict is added server-side, this surface must fall silent instead of echoing an
 * unknown token at the candidate.
 */
export type RevisaoVeredito = 'mantida' | 'revertida'

const VEREDITOS_CONHECIDOS: readonly string[] = ['mantida', 'revertida']

/**
 * Defensive normalization of the verdict read from the server: anything outside the
 * closed vocabulary — including `null`, `undefined` and a future value this build has
 * never heard of — resolves to `null` instead of leaking into the UI. Pure and total.
 */
export function normalizarVeredito(valor: unknown): RevisaoVeredito | null {
  return typeof valor === 'string' && VEREDITOS_CONHECIDOS.includes(valor)
    ? (valor as RevisaoVeredito)
    : null
}

/**
 * The own-row explanation the candidate sees. It carries the HIGH-LEVEL result + the
 * derived NON-CLINICAL `reason` + the LGPD Art. 20 revision lifecycle — NEVER a
 * score/band/percentile (RNF-07a / LGPD-04). The internal `justificativa` is NOT part
 * of this shape: only the templated `reason` derived from it crosses to the candidate.
 */
export interface ExplicacaoCandidato {
  /**
   * De onde veio a rejeição — o discriminador que a página usa para decidir QUE texto
   * mostrar e se existe direito de revisão a oferecer (§7.18, JORN-22):
   *
   *  - `'humana'` — a decisão final registrada por uma pessoa em `decisao_final`. Único
   *    caminho COM pedido de revisão.
   *  - `'automatica'` — o knockout da inscrição. Não cria linha em `decisao_final`, não
   *    tem revisão a pedir, e o texto diz que nenhuma pessoa avaliou.
   *  - `'humana_triagem'` — rejeição por uma pessoa da equipe ANTES da decisão final
   *    (`rejeitar_candidatura`, D-20). Também sem linha em `decisao_final`, portanto sem
   *    revisão a pedir — mas o texto diz que uma pessoa decidiu, porque foi o que houve.
   *
   * Não é cosmético: `solicitar_revisao_decisao` exige a linha em `decisao_final`, então
   * oferecer o CTA fora do caminho `'humana'` seria um botão que o servidor sempre recusa.
   * E trocar os textos entre `'automatica'` e `'humana_triagem'` seria mentir ao
   * candidato sobre QUEM decidiu.
   */
  origem: 'humana' | 'automatica' | 'humana_triagem'
  /** Always `'rejeitado'` here — the reachability gate returns null otherwise. */
  decisao: DecisaoResultado
  /** A respectful, deterministic templated reason (Open Q5) — non-clinical, high-level. */
  reason: string
  /** Set once the candidate requests a human review (idempotent). Drives the CTA state. */
  revisao_solicitada_em: string | null
  /** The RH-provided result of a requested review, if any (plain text). */
  revisao_resultado: string | null
  /** Stamped on the first visit — transparency evidence (T-15-15). */
  explicacao_solicitada_em: string | null
  /**
   * The review verdict, narrowed to the closed vocabulary (REVISAO-04). `null` while the
   * review is unanswered AND whenever the server sends a value this build cannot render.
   */
  revisao_veredito: RevisaoVeredito | null
  /**
   * When the review was answered. This is the SAME column the 42-08 trigger watches to
   * fire the candidate's e-mail, so it is also what tells this surface that there is an
   * answer to show at all — the panel and the e-mail cannot disagree about that fact.
   */
  revisao_respondida_em: string | null
}

/**
 * The neutral outcome of an own-row RPC write — NEVER an error on an own-row denial.
 *
 *  - `'ok'`         — the write landed.
 *  - `'denied'`     — own-row denial (42501/403): the candidate is acting on someone
 *                     else's decision the RLS/RPC blocks.
 *  - `'unavailable'`— the reachability gate failed (`no_data_found` / P0002): there is
 *                     no rejected decision to revise (e.g. it was withdrawn/amended).
 *                     Distinct from a generic retryable network error (WR-05) — the
 *                     action can NEVER succeed, so the candidate is NOT told to retry.
 */
export type ExplicacaoWriteOutcome = 'ok' | 'denied' | 'unavailable'

/**
 * Derives a respectful, NON-CLINICAL templated reason keyed on the decision (Open Q5).
 *
 * The candidate NEVER receives the raw internal RH justificativa tone, a score, a band,
 * or a percentile — only this deterministic, high-level, respectful phrasing keyed on
 * `decisao`. The internal `justificativa` is NOT even fetched (Phase-24 CR-01 dropped it
 * from the projection); this template is the candidate-facing substitute (RNF-07a /
 * LGPD-04). Kept here (not the component) so the no-leak invariant is enforced at the
 * data layer and asserted by the service test.
 */
const REASON_BY_DECISAO: Record<DecisaoResultado, string> = {
  // Only `rejeitado` reaches the candidate page (reachability gate). The templates are
  // fixed, respectful, non-clinical statements — no numeric result, no internal phrasing.
  rejeitado:
    'Avaliamos seu processo de forma global, considerando o conjunto das etapas e o ' +
    'alinhamento com o perfil buscado para esta vaga nesta seleção. Com base nessa ' +
    'análise, decidimos não seguir adiante neste momento. Esta decisão se refere a esta ' +
    'vaga específica e não representa um julgamento sobre o seu valor profissional.',
  // The two states below never reach the page (the gate returns null) — present so the
  // map is total and the keying-on-decisao design (Open Q5) is explicit.
  aprovado:
    'Avaliamos seu processo e seguiremos com a sua candidatura. A equipe entrará em contato.',
  em_espera:
    'Sua candidatura segue em análise. Avisaremos você sobre os próximos passos.',
}

function reasonForDecisao(decisao: DecisaoResultado): string {
  return REASON_BY_DECISAO[decisao]
}

/**
 * A razão templated da rejeição AUTOMÁTICA (§7.18, caminho (2) — decisão do responsável).
 *
 * Ela nomeia o MECANISMO e cala o CRITÉRIO, e essa fronteira é a única coisa
 * load-bearing aqui. O Art. 20 dá ao titular o direito de saber que a decisão foi
 * automatizada e em que ela se baseou; D-15 mantém fora da superfície do candidato QUAL
 * resposta o eliminou (o `opcao_knockout_id` sequer atravessa a rede — a RPC devolve um
 * booleano). Dizer «uma das respostas do formulário» é verdade suficiente para o Art. 20
 * sem virar o feedback de critério que a política do produto recusa.
 *
 * E ela NÃO promete revisão. Esse é o veredito: explicação sim, revisão não. Uma tela que
 * oferecesse o pedido sem que o `solicitar_revisao_decisao` o aceitasse (ele exige linha
 * em `decisao_final`, que o knockout não cria) seria pior que o silêncio de antes.
 */
const REASON_KNOCKOUT =
  'Esta vaga define alguns requisitos objetivos de elegibilidade, e uma das respostas ' +
  'que você deu no formulário de inscrição não atende a um deles. Por isso a sua ' +
  'candidatura foi encerrada logo na inscrição, sem passar pelas etapas de avaliação. ' +
  'Nenhuma nota, análise ou perfil foi usado nesta decisão. Ela vale para esta vaga ' +
  'nesta seleção e não impede que você se candidate a outras.'

/**
 * A razão templated da rejeição HUMANA fora da decisão final (JORN-22 / D-20 — decisão
 * do operador: explicação + canal, sem pedido de revisão).
 *
 * Ela diz QUEM decidiu — uma pessoa da equipe — e nada sobre o PORQUÊ: nem o motivo que
 * o RH escolheu, nem a justificativa escrita, nem critério ou nota. O motivo sequer
 * atravessa a rede (a RPC `explicacao_rejeicao_origem` o lê e devolve só o
 * discriminador).
 *
 * E ela NÃO diz em que etapa a decisão foi tomada. A rejeição pelo RH é alcançável em
 * qualquer etapa não terminal (a entrevista inclusive — o motivo `reprovado_entrevista`
 * existe), então «logo no início do processo» seria falso para parte dos casos.
 *
 * Nenhuma palavra do grep-guard dos e-mails de decisão
 * (`/score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i`) — asserido no teste.
 */
export const REASON_HUMANA_TRIAGEM =
  'A sua candidatura foi analisada por uma pessoa da nossa equipe, que decidiu não ' +
  'seguir com ela neste momento. Esta decisão vale para esta vaga nesta seleção e não ' +
  'impede que você se candidate a outras.'

/**
 * Reads the candidate's OWN decision (DECISAO-04) via the own-row allowlist, scoped to
 * `candidaturaId`. The LIVE `candidato_le_propria_decisao` RLS policy enforces own-row
 * (`candidatos.user_id = auth.uid()`); the allowlist enforces own-COLUMN (no score
 * leak). NEVER a star projection, NEVER a psychometric-scores join.
 *
 * REACHABILITY GATE (Pitfall 6 / T-15-14): returns `null` unless `decisao = 'rejeitado'`
 * — the page renders the "Esta página não está disponível" state for every other case
 * (no row / aprovado / em_espera / wrong candidatura the RLS hides). The candidate
 * receives a derived non-clinical `reason`, never the raw justificativa or any score.
 */
export async function getExplicacao(
  candidaturaId: string,
): Promise<ExplicacaoCandidato | null> {
  if (!candidaturaId) {
    throw new ExplicacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('decisao_final')
    .select(DECISAO_EXPLICACAO_ALLOWLIST)
    .eq('candidatura_id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new ExplicacaoServiceError(
      `Não foi possível carregar esta página: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
  // Sem linha em `decisao_final` (a RLS escondeu, ou nunca houve decisão final): ANTES
  // de desistir, pergunte ao servidor QUEM encerrou a candidatura — o knockout (§7.18)
  // ou uma pessoa da equipe antes da decisão final (JORN-22 / D-20).
  if (!data) return getExplicacaoSemDecisaoFinal(candidaturaId)

  const raw = data as unknown as {
    decisao: DecisaoResultado
    revisao_solicitada_em: string | null
    revisao_resultado: string | null
    explicacao_solicitada_em: string | null
    revisao_veredito: string | null
    revisao_respondida_em: string | null
  }

  // Reachability gate: the page exists ONLY after a rejection. aprovado / em_espera →
  // not-available (the candidate is still in-process or approved — no explanation page).
  //
  // O fallback NÃO é consultado aqui: existe decisão humana registrada, e ela é
  // aprovada ou em espera. Uma candidatura não é knockout E decisão final ao mesmo
  // tempo — o knockout encerra na inscrição, antes de qualquer etapa avaliável.
  if (raw.decisao !== 'rejeitado') return null

  return {
    origem: 'humana',
    decisao: raw.decisao,
    // Derived templated non-clinical reason — the internal justificativa is NEVER
    // surfaced verbatim; no score/band/percentile ever crosses (Open Q5 / RNF-07a).
    reason: reasonForDecisao(raw.decisao),
    revisao_solicitada_em: raw.revisao_solicitada_em ?? null,
    revisao_resultado: raw.revisao_resultado ?? null,
    explicacao_solicitada_em: raw.explicacao_solicitada_em ?? null,
    // Defensive: an unexpected verdict resolves to null instead of reaching the UI.
    revisao_veredito: normalizarVeredito(raw.revisao_veredito),
    revisao_respondida_em: raw.revisao_respondida_em ?? null,
  }
}

/**
 * O caminho SEM `decisao_final` da explicação — o knockout automático (§7.18, caminho (2))
 * e a rejeição humana fora da decisão final (JORN-22 / D-20).
 *
 * Pergunta à RPC `explicacao_rejeicao_origem` QUEM encerrou ESTA candidatura do próprio
 * titular. Ela devolve só o discriminador — `'automatica'`, `'humana_triagem'` ou `null`
 * — e nada mais: o motivo, a opção do knockout e a justificativa do RH não atravessam a
 * rede (D-15). `null` cobre «não é sua» e «não se aplica» (anti-oráculo).
 *
 * ⚠ A PERGUNTA PRECISA SER FEITA AO SERVIDOR. Do lado do cliente, a rejeição humana na
 * triagem e o knockout automático são a MESMA linha: as duas têm `status='rejeitado'`,
 * as duas ficam sem `decisao_final`, e a allowlist do candidato exclui `motivo_rejeicao`
 * de propósito. Inferir uma da outra daria a uma rejeição escrita por uma pessoa o texto
 * da automática (ou o inverso) — plausível, silencioso e falso.
 *
 * Substitui a chamada à booleana `explicacao_rejeicao_automatica`, que continua existindo
 * no banco (sem DROP — o front anterior a este a chamava) e deixou de ser usada aqui.
 *
 * Um erro aqui resolve para `null` (página indisponível), não para uma exceção: este é o
 * caminho de fallback de uma tela de transparência, e derrubá-la por causa dele seria
 * trocar «não há explicação» por «a página quebrou».
 */
async function getExplicacaoSemDecisaoFinal(
  candidaturaId: string,
): Promise<ExplicacaoCandidato | null> {
  // Aplicada em PROD (`20260921000008`, ledger com md5 conferido) e presente em
  // `database.types.ts` (regen do 48-09) — chamada tipada, sem cast.
  const { data, error } = await supabase.rpc('explicacao_rejeicao_origem', {
    p_candidatura_id: candidaturaId,
  })

  if (error) return null

  // Comparação ESTRITA, nunca truthy: qualquer valor fora dos dois esperados — inclusive
  // o `true` da RPC booleana antiga, ou um shape de um build futuro — fecha a página em
  // vez de virar uma explicação.
  let origem: 'automatica' | 'humana_triagem'
  let reason: string
  if (data === 'automatica') {
    origem = 'automatica'
    reason = REASON_KNOCKOUT
  } else if (data === 'humana_triagem') {
    origem = 'humana_triagem'
    reason = REASON_HUMANA_TRIAGEM
  } else {
    return null
  }

  return {
    origem,
    decisao: 'rejeitado',
    reason,
    // Nenhum dos dois caminhos cria linha em `decisao_final`, então NENHUM estado do
    // ciclo de revisão existe — e não existir é o ponto, não uma lacuna a preencher.
    revisao_solicitada_em: null,
    revisao_resultado: null,
    explicacao_solicitada_em: null,
    revisao_veredito: null,
    revisao_respondida_em: null,
  }
}

/**
 * Stamps `explicacao_solicitada_em` on the first visit via the own-row
 * `stamp_explicacao_acessada` SECURITY DEFINER RPC (transparency evidence, T-15-15).
 * Idempotent server-side (first-access-only `COALESCE`). A 42501 / 403 own-row denial
 * resolves to the neutral `'denied'` outcome, NOT an error (the stamp is best-effort —
 * a denied stamp must never break the page render).
 *
 * The RPC is LIVE in PROD + typed in `database.types.ts` (15-06 regen) — fully typed.
 */
export async function stampExplicacao(
  candidaturaId: string,
): Promise<ExplicacaoWriteOutcome> {
  if (!candidaturaId) {
    throw new ExplicacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // `stamp_explicacao_acessada` is live in PROD + present in database.types.ts (15-06 regen).
  const { error } = await supabase.rpc('stamp_explicacao_acessada', {
    p_candidatura_id: candidaturaId,
  })

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    const status = (error as { status?: number }).status
    if (code === '42501' || status === 403) return 'denied'
    throw new ExplicacaoServiceError(
      'Não foi possível registrar o acesso a esta página.',
      'NETWORK_ERROR',
      error,
    )
  }

  return 'ok'
}

/**
 * Requests a human review of the decision (LGPD Art. 20 / DECISAO-04) via the own-row
 * `solicitar_revisao_decisao` SECURITY DEFINER RPC, which sets
 * `decisao_final.revisao_solicitada_em` idempotently.
 *
 * SEC-03: the RH notification is now fired SERVER-SIDE by the AFTER UPDATE trigger
 * `trg_n8n_revisao_decisao` on `decisao_final` (pg_net + Vault n8n_webhook_base) when
 * `revisao_solicitada_em` transitions NULL -> NOT NULL. This service NO LONGER carries
 * the n8n URL — VITE_-prefixed vars are inlined into the public bundle (Pitfall 5), so
 * a "configurable" webhook URL still shipped to every browser. The body carries NO PII
 * beyond the candidatura id.
 *
 * A 42501 / 403 own-row denial resolves to `'denied'` (a neutral outcome — the
 * candidate is acting on someone else's decision the RLS/RPC blocks), NOT an error.
 *
 * WR-05: the reachability `no_data_found` (PG code `P0002`) the RPC raises when there
 * is no `decisao='rejeitado'` row (decision withdrawn/amended between page load and
 * click) resolves to the NON-RETRYABLE `'unavailable'` outcome — NOT a generic
 * NETWORK_ERROR "tente novamente" the candidate could never satisfy.
 *
 * The RPC is LIVE in PROD + typed in `database.types.ts` (15-06 regen) — fully typed.
 */
export async function solicitarRevisao(
  candidaturaId: string,
): Promise<ExplicacaoWriteOutcome> {
  if (!candidaturaId) {
    throw new ExplicacaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // `solicitar_revisao_decisao` is live in PROD + present in database.types.ts (15-06 regen).
  const { error } = await supabase.rpc('solicitar_revisao_decisao', {
    p_candidatura_id: candidaturaId,
  })

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    const status = (error as { status?: number }).status
    if (code === '42501' || status === 403) return 'denied'
    // WR-05: the reachability gate (no rejected decision to revise) is non-retryable —
    // distinguish `no_data_found`/P0002 from a generic retryable network error.
    if (code === 'P0002' || code === 'no_data_found') return 'unavailable'
    throw new ExplicacaoServiceError(
      'Não foi possível enviar a solicitação. Tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  // SEC-03: the RH notification is fired SERVER-SIDE by trg_n8n_revisao_decisao on the
  // NULL -> NOT NULL transition of revisao_solicitada_em (pg_net + Vault). No client
  // fetch — the n8n URL must never ship in the bundle (Pitfall 5). The RPC is the
  // source of record; once it resolves OK the request is registered server-side.
  return 'ok'
}

/** Namespaced object export (camelCaseService convention). */
export const explicacaoService = {
  getExplicacao,
  stampExplicacao,
  solicitarRevisao,
  normalizarVeredito,
}
