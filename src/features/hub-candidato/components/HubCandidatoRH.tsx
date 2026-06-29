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
import { RHLayout } from '@/components/RHLayout'
import { Glass } from '@/components/ui/glass'
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
import { HubSection, type HubSectionEstado } from './HubSection'

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

        {/* Próximo passo — the single dominant turquoise CTA for etapa_atual (D-06) */}
        {rotaWorkspaceAtual && entradaAtual ? (
          <Glass variant="dark" blur="lg" className="rounded-xl p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#35BFAD]">Próximo passo</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <p className="text-base text-white/80">
                Continue o funil pela etapa atual do candidato.
              </p>
              <button
                type="button"
                onClick={() => navigate(rotaWorkspaceAtual)}
                className="inline-flex min-h-[44px] items-center rounded-xl bg-[#35BFAD] px-6 text-base font-semibold text-white shadow-lg shadow-[#35BFAD]/30 transition-colors hover:bg-[#35BFAD]/90"
              >
                {entradaAtual.ctaRH}
              </button>
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

        {/* Score de Triagem (IA) — read off the same allowlist scorecard read */}
        <HubSection
          titulo="Score de Triagem"
          isLoading={loadingContexto}
          isError={errorContexto}
          estado={estadoDaSecao('triagem', etapaAtual, false)}
        >
          <p className="text-sm text-white/70">
            O score de triagem por IA é exibido no painel de triagem da vaga.
          </p>
        </HubSection>

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
      </div>
    </RHLayout>
  )
}
