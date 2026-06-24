/**
 * RedacaoReviewPanel — the RH human-review queue, 1-redação-por-vez (AVAL-07).
 *
 * Desktop RH shell (RHLayout + Glass — NOT the candidate glass-over-gradient).
 * Two-column layout: LEFT 35% = the severity-sorted RedacaoSidebar + the "Análise da
 * IA" block (scores/citations/reasoning per the 4 Beauty Smile dimensions, each
 * carrying the SugestaoIABadge — every AI-derived block) + the RedacaoOverrideForm
 * (sliders + notas + decisão + Salvar). RIGHT 65% = the full essay text at
 * `text-base leading-relaxed` (≈16px/1.625 — the load-bearing reading panel, PRD
 * RF-R-22, never below 16px) + the vermelho top badge when classificacao_cor is
 * 'vermelho'. The review write goes through the salvar_revisao_redacao RPC; the AI is
 * always a suggestion, the human always decides (RNF-07a). A `duvida`-filtered gestor
 * escalation tab reads getDuvidasGestor (in-app only — notifications OUT OF SCOPE).
 *
 * The candidate NEVER reaches this surface (route role-gated + RLS deny + the
 * allowlist read excludes the candidate). All copy verbatim from UI-SPEC.
 *
 * @module features/triagem/components/RedacaoReviewPanel
 * @see src/features/avaliacao/components/ScorecardAvaliacao.tsx (RH panel + SugestaoIABadge + neutral score)
 * @see src/components/pages/PerfilCandidatoRHPage.tsx (RHLayout + Glass wrapper)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-UI-SPEC.md (§Component Inventory + §Typography)
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RHLayout } from '@/components/RHLayout'
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from './SugestaoIABadge'
import { RedacaoSidebar, type RedacaoSidebarItem } from './RedacaoSidebar'
import { RedacaoOverrideForm } from './RedacaoOverrideForm'
import { RedacaoVermelhoBadge, regraVermelho } from './RedacaoCorBadge'
import {
  useRedacaoRevisao,
  useDuvidasGestor,
  redacaoRevisaoKeys,
} from '../hooks/useRedacaoRevisao'
import {
  getVagaIdForCandidatura,
  type RedacaoReviewRow,
  type ScoresDimensao,
} from '../services/revisaoRedacaoService'

/** Labels for the 4 Beauty Smile dimensions (mirrors the override form). */
const DIM_LABEL: Record<string, string> = {
  D1: 'Experiência UAU',
  D2: 'Inovação',
  D3: 'Atitude de Dono',
  D4: 'Sede de Crescimento',
}

/** Reads a per-dimension AI score (number | 'insufficient_evidence' | null). */
function dimValue(scores: ScoresDimensao | null, key: string): number | null {
  const v = scores?.[key]
  return typeof v === 'number' ? v : null
}

/** The "Análise da IA" block — AI scores/reasoning, each AI block carries the badge. */
function AnaliseIA({ row }: { row: RedacaoReviewRow }) {
  const analise = (row.analise_ia ?? {}) as { reasoning?: string; citacoes?: unknown[] }
  const citacoes = Array.isArray(analise.citacoes) ? analise.citacoes : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-semibold text-white">Análise da IA</h3>
        <SugestaoIABadge variant="full" />
      </div>

      <ul className="space-y-3">
        {(['D1', 'D2', 'D3', 'D4'] as const).map((key) => {
          const v = dimValue(row.scores_dimensao, key)
          return (
            <li key={key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white/90">
                  {DIM_LABEL[key]}
                </span>
                <span className="flex items-center gap-2">
                  <SugestaoIABadge variant="compact" />
                  <span className="text-sm font-semibold text-white">
                    {v != null ? `${v} / 5` : '—'}
                  </span>
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {analise.reasoning ? (
        <div className="space-y-1 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Raciocínio
            </p>
            <SugestaoIABadge variant="compact" />
          </div>
          <p className="text-sm leading-relaxed text-white/70">{analise.reasoning}</p>
        </div>
      ) : null}

      {citacoes.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Citações
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-white/70">
            {citacoes.map((c, i) => (
              <li key={i}>{typeof c === 'string' ? c : JSON.stringify(c)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** The full essay reading panel — 16px/1.625, never compressed (PRD RF-R-22). */
function EssayPanel({ row }: { row: RedacaoReviewRow }) {
  const isVermelho = row.classificacao_cor === 'vermelho'
  const regra = regraVermelho({
    score: row.score_ponderado_0_100,
    redFlagEtico: row.red_flag_etico,
    d1: dimValue(row.scores_dimensao, 'D1'),
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-semibold text-white">Redação do candidato</h3>
        {isVermelho ? <RedacaoVermelhoBadge regra={regra} /> : null}
      </div>
      <p className="whitespace-pre-wrap text-base leading-relaxed text-white/90">
        {row.texto}
      </p>
    </div>
  )
}

export function RedacaoReviewPanel() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<'fila' | 'duvidas'>('fila')

  // The :id route param is a candidatura id → resolve its vaga (the queue is per-vaga).
  const { data: vagaId, isLoading: resolvingVaga } = useQuery({
    queryKey: ['redacao-revisao', 'vaga-for-candidatura', id ?? ''],
    queryFn: () => getVagaIdForCandidatura(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: queue,
    isLoading,
    isError,
    salvarRevisao,
  } = useRedacaoRevisao(vagaId ?? undefined)

  const { data: duvidas } = useDuvidasGestor(vagaId ?? undefined, {
    enabled: !!vagaId && tab === 'duvidas',
  } as never)

  const rows = useMemo(() => queue ?? [], [queue])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Default the selection to the most-severe pending essay (vermelho first).
  useEffect(() => {
    if (rows.length > 0 && !rows.some((r) => r.id === selectedId)) {
      setSelectedId(rows[0].id)
    }
  }, [rows, selectedId])

  const selected = rows.find((r) => r.id === selectedId) ?? null

  const sidebarItems: RedacaoSidebarItem[] = rows.map((r) => ({
    id: r.id,
    candidato_nome: r.candidato_nome,
    cor: (r.classificacao_cor ?? 'verde') as RedacaoSidebarItem['cor'],
  }))

  function handleSalvar(payload: {
    decisao: 'aprovado' | 'reprovado' | 'duvida'
    notas: string
    scores_humanos: Record<string, number>
  }) {
    if (!selected) return
    salvarRevisao.mutate(
      { redacaoId: selected.id, payload },
      {
        onSuccess: () => toast.success('Revisão salva.'),
        onError: () =>
          toast.error('Não foi possível salvar a revisão. Tente novamente.'),
      },
    )
  }

  const loading = resolvingVaga || isLoading

  return (
    <RHLayout>
      <div className="space-y-6">
        {/* Tabs: fila de revisão / dúvidas (gestor) */}
        <div className="flex gap-2">
          {(
            [
              { v: 'fila', label: 'Revisão de redações' },
              { v: 'duvidas', label: 'Dúvidas (gestor)' },
            ] as const
          ).map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTab(t.v)}
              aria-pressed={tab === t.v}
              className={cn(
                'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
                tab === t.v
                  ? 'border-white/30 bg-white/20 text-white'
                  : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'duvidas' ? (
          <Glass variant="white" blur="lg" className="rounded-xl p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Dúvidas — escaladas ao gestor</h2>
            {(duvidas ?? []).length === 0 ? (
              <p className="text-sm text-white/60">Nenhuma dúvida escalada no momento.</p>
            ) : (
              <ul className="space-y-2">
                {(duvidas ?? []).map((d) => (
                  <li
                    key={d.id}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-white">
                      {d.candidato_nome ?? 'Candidato'}
                    </p>
                    {d.notas_revisor ? (
                      <p className="mt-1 text-sm leading-relaxed text-white/70">
                        {d.notas_revisor}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Glass>
        ) : loading ? (
          <Glass variant="white" blur="lg" className="space-y-3 rounded-xl p-6">
            <Skeleton className="h-8 w-48 bg-white/5" />
            <Skeleton className="h-64 w-full bg-white/5" />
          </Glass>
        ) : isError ? (
          <Glass variant="white" blur="lg" className="rounded-xl p-6">
            <p className="text-sm text-white/60">
              Não foi possível carregar a fila de revisão.
            </p>
          </Glass>
        ) : rows.length === 0 ? (
          <Glass variant="white" blur="lg" className="rounded-xl p-12 text-center">
            <p className="text-sm text-white/60">Nenhuma redação pendente de revisão.</p>
          </Glass>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[35%_65%]">
            {/* LEFT 35% — sidebar + análise IA + override form */}
            <div className="space-y-6">
              <Glass variant="white" blur="lg" className="rounded-xl p-6">
                <RedacaoSidebar
                  items={sidebarItems}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </Glass>

              {selected ? (
                <>
                  <Glass variant="white" blur="lg" className="rounded-xl p-6">
                    <AnaliseIA row={selected} />
                  </Glass>
                  <Glass variant="white" blur="lg" className="rounded-xl p-6">
                    <RedacaoOverrideForm
                      key={selected.id}
                      iaScores={{
                        D1: dimValue(selected.scores_dimensao, 'D1'),
                        D2: dimValue(selected.scores_dimensao, 'D2'),
                        D3: dimValue(selected.scores_dimensao, 'D3'),
                        D4: dimValue(selected.scores_dimensao, 'D4'),
                      }}
                      redFlagEtico={selected.red_flag_etico}
                      saving={salvarRevisao.isPending}
                      onSalvar={handleSalvar}
                    />
                  </Glass>
                </>
              ) : null}
            </div>

            {/* RIGHT 65% — the full essay reading panel */}
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              {selected ? (
                <EssayPanel row={selected} />
              ) : (
                <p className="text-sm text-white/60">
                  Selecione uma redação na fila para revisar.
                </p>
              )}
            </Glass>
          </div>
        )}
      </div>
    </RHLayout>
  )
}

// Re-export the query key for invalidation parity with the hook module.
export { redacaoRevisaoKeys }
