/**
 * HubCandidatoRH — the real, service-backed, etapa-guided RH candidate hub (D-05/D-07/D-15).
 *
 * Replaces the 1864-line hardcoded `PerfilCandidatoRHPage` mock. It mounts at the canonical
 * `/rh/candidatos/:id` (the `:id` route param IS a candidaturaId — Pitfall 1). Every section
 * reflects the candidate's FULL M2 pipeline by reading a REAL `features/*` hook keyed by
 * candidaturaId, OR shows an explicit empty state — NEVER invented data. The M1 funnel
 * concepts (DISC / Raven / manifesto, plus the radar/pie chart widgets) are DROPPED — they do
 * not exist in M2.
 *
 * Etapa-guided (D-06): the candidate's `etapa_atual` drives a SINGLE dominant turquoise
 * "Abrir {label}" CTA (target = `funilNavMap[etapa].rotaWorkspaceRH(candidaturaId)`); the
 * full 8-stage timeline is always visible — passed stages are reachable ("Revisar {label}"),
 * future stages render as a locked empty section ("Etapa ainda não iniciada"). The CTA opens
 * the correct already-shipped workspace via SPA navigation (the workspaces are WIRED IN, not
 * redesigned — D-15).
 *
 * Reads REUSE the existing allowlist-projected hooks (RLS is row-level only; it does not hide
 * columns). NO new candidate-facing query is added — that avoids the star-projection PII-leak
 * class (reusing the allowlist-projected hooks instead).
 * Product language is "avaliação comportamental/cognitiva" (never the banned clinical wording —
 * CLAUDE.md Security Rules); NO score-driven auto-action is introduced (RNF-07a).
 *
 * @module features/hub-candidato/components/HubCandidatoRH
 * @see src/features/entrevista/components/EntrevistaWorkspace.tsx (RHLayout host + useParams id=candidaturaId)
 * @see src/lib/navegacao/funilNavMap.ts (etapa → workspace CTA source — D-17)
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-UI-SPEC.md (§Interaction Contract; §Empty states)
 */
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { RHLayout } from '@/components/RHLayout'
import { Glass, GlassCard, GlassButton } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { funilNavMap } from '@/lib/navegacao/funilNavMap'
import {
  ETAPA_M2_LABELS,
  type EtapaFunilM2,
} from '@/features/triagem/services/triagemService'
import { useEntrevistaContexto, useEntrevistaScorecard } from '@/features/entrevista/hooks/useEntrevistaScorecard'
import { useScorecardCandidato } from '@/features/avaliacao/hooks/useScorecardCandidato'
import { useRedacaoRevisao } from '@/features/triagem/hooks/useRedacaoRevisao'
import { useConsolidacao } from '@/features/decisao/hooks/useConsolidacao'
import { useUpdateCandidaturaEtapa } from '@/features/vagas/hooks/useCandidaturas'
import { RejeitarCandidaturaDialog } from '@/features/triagem/components/RejeitarCandidaturaDialog'
import { RetrocederCandidaturaDialog } from '@/features/triagem/components/RetrocederCandidaturaDialog'
import { HubSection, type HubSectionEstado } from './HubSection'
import { CvButton } from './CvButton'
import { AnaliseIABlock } from './AnaliseIABlock'
import { HistoricoBlock } from './HistoricoBlock'
import { useAnaliseCandidato } from '../hooks/useAnaliseCandidato'
import { useHistoricoCandidatura } from '../hooks/useHistoricoCandidatura'

/**
 * The funnel timeline order (the 8 M2 stages). The candidate's position in this order
 * decides, for any pipeline section, whether it is passed / current / future (D-06).
 */
const TIMELINE: EtapaFunilM2[] = [
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
  'aprovado',
  'rejeitado',
]

/** As 6 etapas de trabalho (TIMELINE sem os terminais aprovado/rejeitado) — a ordem que
 *  decide a "próxima etapa" para o Avançar (OPER-01). */
const WORKING_STAGES: EtapaFunilM2[] = TIMELINE.slice(0, 6)

/**
 * Maps a stage's funnel position relative to `etapa_atual` to a HubSection `estado`.
 * - future stage (ordinal after current) → 'futuro' (locked empty — never disappears).
 * - reached stage with no data → 'sem_dados'.
 * - reached stage with data → 'com_dados'.
 * A stale/unknown etapa (ordinal -1) is treated as not-yet-reached for safety.
 */
function estadoDaSecao(
  secaoEtapa: EtapaFunilM2,
  etapaAtual: EtapaFunilM2 | null,
  temDados: boolean,
): HubSectionEstado {
  const idxSecao = TIMELINE.indexOf(secaoEtapa)
  const idxAtual = etapaAtual ? TIMELINE.indexOf(etapaAtual) : -1
  if (idxAtual < 0 || idxSecao > idxAtual) return 'futuro'
  return temDados ? 'com_dados' : 'sem_dados'
}

export function HubCandidatoRH() {
  const { id } = useParams<{ id: string }>()
  const candidaturaId = id ?? '' // ⚠ candidaturaId, NOT candidato.id (Pitfall 1)
  const navigate = useNavigate()

  // The candidatura "row in scope" — name + etapa + vaga resolution (allowlist projection).
  const { data: contexto, isLoading: loadingContexto, isError: errorContexto } =
    useEntrevistaContexto(candidaturaId)
  const vagaId = contexto?.vaga_id
  const etapaAtual = (contexto?.etapa_atual as EtapaFunilM2 | undefined) ?? null

  // Pipeline section reads — each a real, RLS-correct, allowlist-projected hook.
  const triagemQuery = useScorecardCandidato(candidaturaId) // Avaliação Assíncrona (SJT/Work-Sample + Big Five)
  const entrevistaQuery = useEntrevistaScorecard(candidaturaId, { vagaId }) // Entrevista + Cognitiva (split by tipo)
  const redacaoQuery = useRedacaoRevisao(vagaId) // Redação (vaga-level queue)
  const decisaoQuery = useConsolidacao(candidaturaId, vagaId) // Decisão Final
  const analiseQuery = useAnaliseCandidato(candidaturaId) // Análise da IA (VISRH-02 — RH-only)
  const historicoQuery = useHistoricoCandidatura(candidaturaId) // Histórico read-only (VISRH-03)

  const cognitivoScores = (entrevistaQuery.data ?? []).filter((s) => s.tipo === 'cognitivo')
  const entrevistaScores = (entrevistaQuery.data ?? []).filter((s) => s.tipo === 'entrevista')

  // WR-01: useRedacaoRevisao is a WHOLE-VAGA review queue. Scope the presence flag to THIS
  // candidatura (RedacaoReviewRow carries candidatura_id) so the section reflects the candidate
  // in scope — NOT "any candidate in the vaga has a pending redação".
  const temRedacaoDoCandidato = (redacaoQuery.data ?? []).some(
    (r) => r.candidatura_id === candidaturaId,
  )

  const nomeCandidato = contexto?.candidato_nome ?? 'Candidato'
  const etapaLabel = etapaAtual ? ETAPA_M2_LABELS[etapaAtual] : '—'

  // The SINGLE dominant CTA — opens the current stage's workspace (D-06), if one exists.
  const entradaAtual = etapaAtual ? funilNavMap[etapaAtual] : null
  const rotaWorkspaceAtual = entradaAtual && candidaturaId
    ? entradaAtual.rotaWorkspaceRH(candidaturaId)
    : null

  // OPER-01/02/03 — a linha de ações do funil (avançar/retroceder/rejeitar) beside the CTA.
  // Avançar é 1-clique pelo write-path auditável (useUpdateCandidaturaEtapa → trigger
  // avancar_etapa); undefined em decisao_final (sem etapa de trabalho à frente).
  const { mutate: avancarEtapa } = useUpdateCandidaturaEtapa()
  const idxTrabalho = etapaAtual ? WORKING_STAGES.indexOf(etapaAtual) : -1
  const proximaEtapa = idxTrabalho >= 0 ? WORKING_STAGES[idxTrabalho + 1] : undefined

  // UX-03: explicit in-shell not-found for an unresolvable candidaturaId. The route is a
  // valid RH-only mount (RoleGuard), but the `:id` resolves to no row — render an explicit
  // not-found INSIDE the RH shell (NOT the global NotFoundPage, the catch-all for unknown
  // ROUTES), instead of degrading silently to the generic "Candidato"/"—" header. Gated on
  // the query having SETTLED (`!loadingContexto`) so it never flashes while still loading.
  // The early return sits AFTER every hook call above (rules of hooks) — UI-SPEC §3.
  if (!loadingContexto && (errorContexto || !contexto)) {
    return (
      <RHLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <GlassCard
            variant="dark"
            blur="lg"
            className="w-full max-w-lg mx-auto text-center px-8 py-12 space-y-4"
          >
            {/* Heading — 20px / 600 (UI-SPEC §3 Typography) */}
            <h1 className="text-xl font-semibold text-white drop-shadow-md">
              Candidatura não encontrada
            </h1>
            {/* Body — 16px / 400 */}
            <p className="text-base text-white/85 leading-relaxed">
              Não encontramos essa candidatura. Ela pode ter sido removida ou o link está incorreto.
            </p>
            {/* Single accent back-link — visible label, leading ArrowLeft (aria-hidden), ≥44px */}
            <div className="flex justify-center pt-2">
              <GlassButton
                variant="accent"
                onClick={() => navigate('/rh/candidatos')}
                className="min-h-11 bg-[#35BFAD]/30 text-white font-semibold"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Voltar aos candidatos
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </RHLayout>
    )
  }

  return (
    <RHLayout>
      <div className="space-y-6">
        {/* Identidade — candidate name header + etapa chip (D-07 first section) */}
        {loadingContexto ? (
          <Skeleton className="h-20 w-full bg-white/5" />
        ) : (
          <div className="space-y-3">
            <h1 className="text-5xl font-semibold text-white">{nomeCandidato}</h1>
            <span className="inline-flex items-center rounded-full bg-[#35BFAD] px-4 py-1 text-sm font-semibold text-white">
              {etapaLabel}
            </span>
          </div>
        )}

        {/* Próximo passo — the single dominant turquoise CTA for etapa_atual (D-06), plus the
            OPER-01/02/03 action row (avançar/retroceder/rejeitar) BESIDE it. The block only
            renders for non-terminal etapas (rotaWorkspaceAtual && entradaAtual), so the action
            group is naturally hidden on aprovado/rejeitado (T-31-04). */}
        {rotaWorkspaceAtual && entradaAtual ? (
          <Glass variant="dark" blur="lg" className="rounded-xl p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#35BFAD]">Próximo passo</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <p className="text-base text-white/80">
                Continue o funil pela etapa atual do candidato.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {etapaAtual ? (
                  <>
                    {/* Avançar — 1-clique pelo write-path auditável (accent, subordinado ao CTA). */}
                    {proximaEtapa ? (
                      <button
                        type="button"
                        onClick={() => avancarEtapa({ candidaturaId, novaEtapa: proximaEtapa })}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#35BFAD]/40 bg-[#35BFAD]/10 px-4 text-sm font-semibold text-[#35BFAD] transition-colors hover:bg-[#35BFAD]/20"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        Avançar
                      </button>
                    ) : null}

                    {/* Retroceder — dialog compartilhado, gatilho neutro dark-glass. */}
                    <RetrocederCandidaturaDialog
                      candidaturaId={candidaturaId}
                      nome={nomeCandidato}
                      etapaAtual={etapaAtual}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
                        >
                          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                          Retroceder
                        </button>
                      }
                    />

                    {/* Rejeitar — dialog compartilhado (única via de rejeição), gatilho destrutivo. */}
                    <RejeitarCandidaturaDialog
                      candidaturaId={candidaturaId}
                      nome={nomeCandidato}
                      trigger={
                        <button
                          type="button"
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          Rejeitar
                        </button>
                      }
                    />
                  </>
                ) : null}

                {/* O CTA dominante permanece — não é deslocado (turquesa sólido). */}
                <button
                  type="button"
                  onClick={() => navigate(rotaWorkspaceAtual)}
                  className="inline-flex min-h-[44px] items-center rounded-xl bg-[#35BFAD] px-6 text-base font-semibold text-white shadow-lg shadow-[#35BFAD]/30 transition-colors hover:bg-[#35BFAD]/90"
                >
                  {entradaAtual.ctaRH}
                </button>
              </div>
            </div>
          </Glass>
        ) : null}

        {/* Timeline — all 8 stages always visible; current = accent, others reachable/locked */}
        <Glass variant="dark" blur="lg" className="rounded-xl p-6">
          <h2 className="mb-4 text-xl font-semibold text-white md:text-2xl">Linha do funil</h2>
          <ol className="flex flex-wrap gap-2">
            {TIMELINE.map((etapa) => {
              const isAtual = etapa === etapaAtual
              const idxEtapa = TIMELINE.indexOf(etapa)
              const idxAtual = etapaAtual ? TIMELINE.indexOf(etapaAtual) : -1
              const isPassada = idxAtual >= 0 && idxEtapa < idxAtual
              const rotaPassada = funilNavMap[etapa].rotaWorkspaceRH(candidaturaId)
              return (
                <li key={etapa}>
                  {isPassada && rotaPassada ? (
                    <button
                      type="button"
                      onClick={() => navigate(rotaPassada)}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-white/20 bg-white/5 px-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
                    >
                      Revisar {ETAPA_M2_LABELS[etapa]}
                    </button>
                  ) : (
                    <span
                      className={
                        isAtual
                          ? 'inline-flex min-h-[44px] items-center rounded-lg bg-[#35BFAD] px-3 text-sm font-semibold text-white'
                          : 'inline-flex min-h-[44px] items-center rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white/50'
                      }
                    >
                      {ETAPA_M2_LABELS[etapa]}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </Glass>

        {/* Currículo (VISRH-01) — opens the CV via the P32 signed-URL EF (owner/admin,
            60s TTL); the URL is never cached nor logged (Pitfall 7). High-value cluster
            right after the funnel timeline. */}
        <Glass variant="dark" blur="lg" className="rounded-xl p-6">
          <h2 className="mb-4 text-xl font-semibold text-white md:text-2xl">Currículo</h2>
          <CvButton candidaturaId={candidaturaId} />
        </Glass>

        {/* Análise da IA (VISRH-02) — REPLACES the empty "Score de Triagem" placeholder.
            Renders the FULL analysis (pontos_fortes/gaps in full, band chip, disclaimer).
            RH-ONLY surface: the candidate has no rh_le_analise SELECT and never sees it. */}
        <AnaliseIABlock
          analise={analiseQuery.data ?? null}
          isLoading={analiseQuery.isLoading}
          isError={analiseQuery.isError}
        />

        {/* Avaliação Assíncrona — Work-Sample/SJT + Big Five (comportamental, contextual) */}
        <HubSection
          titulo="Avaliação Assíncrona"
          isLoading={triagemQuery.isLoading}
          isError={triagemQuery.isError}
          estado={estadoDaSecao('avaliacao_assincrona', etapaAtual, (triagemQuery.data?.length ?? 0) > 0)}
        >
          <p className="text-sm text-white/80">
            {triagemQuery.data?.length ?? 0} registro(s) de avaliação comportamental disponíveis para revisão.
          </p>
        </HubSection>

        {/* Avaliação Cognitiva — contextual cognitive band (tipo='cognitivo') */}
        <HubSection
          titulo="Avaliação Cognitiva"
          isLoading={entrevistaQuery.isLoading}
          isError={entrevistaQuery.isError}
          estado={estadoDaSecao('avaliacao_assincrona', etapaAtual, cognitivoScores.length > 0)}
        >
          <p className="text-sm text-white/80">
            Banda cognitiva contextual registrada — disponível no workspace de entrevista.
          </p>
        </HubSection>

        {/* Redação — review-queue presence scoped to THIS candidatura (WR-01: RedacaoReviewRow
            carries candidatura_id, so the section no longer flips to com_dados just because ANY
            candidate in the vaga has a pending redação). The "data exists" copy below stays gated
            on temRedacaoDoCandidato; the always-on CTA (IN-04) is rendered as a sibling so it is
            click-reachable regardless of data state (HubSection only renders children on
            com_dados) — D-04 requires the hub to reach each of the 3 RH workspaces. */}
        <HubSection
          titulo="Redação"
          isLoading={redacaoQuery.isLoading}
          isError={redacaoQuery.isError}
          estado={estadoDaSecao('avaliacao_assincrona', etapaAtual, temRedacaoDoCandidato)}
        >
          <p className="text-sm text-white/80">
            Há redação deste candidato na fila de revisão — abra o workspace de redação para revisar.
          </p>
        </HubSection>

        {/* IN-04 — always-visible navigation affordance to the 3rd RH workspace
            (RedacaoReviewPanel at /rh/candidato/:id/redacao). NOT gated on data state. */}
        {candidaturaId ? (
          <button
            type="button"
            onClick={() => navigate(`/rh/candidato/${candidaturaId}/redacao`)}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-[#35BFAD] px-6 text-base font-semibold text-white shadow-lg shadow-[#35BFAD]/30 transition-colors hover:bg-[#35BFAD]/90"
          >
            Abrir workspace de redação
          </button>
        ) : null}

        {/* Entrevista — scorecard rows (tipo='entrevista') */}
        <HubSection
          titulo="Entrevista"
          isLoading={entrevistaQuery.isLoading}
          isError={entrevistaQuery.isError}
          estado={estadoDaSecao('entrevista_online', etapaAtual, entrevistaScores.length > 0)}
        >
          <p className="text-sm text-white/80">
            Avaliação de entrevista registrada — abra o workspace de entrevista para revisar.
          </p>
        </HubSection>

        {/* Decisão Final — consolidação (candidaturaId + vagaId) */}
        <HubSection
          titulo="Decisão Final"
          isLoading={decisaoQuery.isLoading}
          isError={decisaoQuery.isError}
          estado={estadoDaSecao('decisao_final', etapaAtual, !!decisaoQuery.data)}
        >
          <p className="text-sm text-white/80">
            A consolidação da decisão está disponível — abra o workspace de decisão para revisar.
          </p>
        </HubSection>

        {/* Histórico (VISRH-03) — read-only feed of etapa transitions, newest-first.
            The LAST block (after Decisão Final), per UI-SPEC §Surface 1 placement. */}
        <HistoricoBlock
          rows={historicoQuery.data ?? []}
          isLoading={historicoQuery.isLoading}
          isError={historicoQuery.isError}
        />
      </div>
    </RHLayout>
  )
}
