/**
 * DecisaoFinalPage — the RH consolidated-decision page (DECISAO-01/02/03).
 *
 * The RHLayout-shelled, role-gated page under `/rh/candidato/:id/decisao` (mirrors the
 * Phase-14 EntrevistaWorkspace mount). The `:id` route param is a candidatura id →
 * resolved to its vaga via `decisaoService.getVagaIdDaCandidatura`. Three tabs (Dashboard
 * is the DEFAULT landing, the primary visual anchor):
 *   1. Dashboard  — ConsolidacaoDashboard (consolidated score + breakdown + recommendation)
 *   2. Comparativo — the Phase-10 ComparativoScreen embedded VERBATIM, scoped to the
 *      candidaturas that still AWAIT this decision (`etapa_atual='decisao_final'` and not
 *      encerrada — D-36b / plano 49-22; it used to read the ones ALREADY decided). No new
 *      comparison view. Read-only: no Avançar/Rejeitar here (UX-06).
 *   3. Decisão    — RegistrarDecisaoForm (terminal capture + alert-dialog + append-only note)
 *
 * The consolidated score is presented neutrally; the recommendation is advisory-badged;
 * the decision is always human (RNF-07a). RoleGuard role=['rh','administrador'] is wired
 * at the route in Plan 15-06.
 *
 * @module features/decisao/components/DecisaoFinalPage
 * @see src/features/entrevista/components/EntrevistaWorkspace.tsx (RHLayout tabs host + :id→vaga)
 * @see src/components/pages/ComparativoCandidatosPage.tsx (useComparativo + ComparativoScreen reuse)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (§Component Inventory)
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RHLayout } from '@/components/RHLayout'
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/components/ui/utils'
import { useComparativo } from '@/features/triagem/hooks/useComparativo'
import { TriagemServiceError } from '@/features/triagem/services/triagemService'
import {
  ComparativoScreen,
  type ComparativoCandidate,
} from '@/features/triagem/components/ComparativoScreen'
import type { RankedCandidate } from '@/features/triagem/pdf/exportComparativo'
// D-59: o piso e o teto vêm da MESMA constante que a EF usa para recusar (contrato de zero
// imports → import relativo; precedente do `exportacaoService.ts:61`).
import {
  COMPARATIVO_MAX_CANDIDATOS,
  COMPARATIVO_MIN_CANDIDATOS,
} from '../../../../supabase/functions/_shared/comparativo-config'
import { ConsolidacaoDashboard } from './ConsolidacaoDashboard'
import { RegistrarDecisaoForm } from './RegistrarDecisaoForm'
import { useRegistrarDecisao } from '../hooks/useRegistrarDecisao'
import { decisaoKeys } from '../hooks/useConsolidacao'
import {
  getVagaIdDaCandidatura,
  listFinalistas,
  getDecisaoAtual,
} from '../services/decisaoService'

/** The 3 workspace tabs (Dashboard is the DEFAULT landing — UI-SPEC §Component Inventory). */
const TABS = [
  { v: 'dashboard', label: 'Dashboard' },
  { v: 'comparativo', label: 'Comparativo' },
  { v: 'decisao', label: 'Decisão' },
] as const

type TabValue = (typeof TABS)[number]['v']

/** Pull the EF `error_code` (AI_UNAVAILABLE / MIXED_VAGA) off a TriagemServiceError — code-only. */
function errorCodeOf(error: unknown): string | undefined {
  if (error instanceof TriagemServiceError) {
    const details = error.details as { error_code?: unknown } | undefined
    if (typeof details?.error_code === 'string') return details.error_code
    if (error.code === 'MIXED_VAGA') return 'MIXED_VAGA'
  }
  return undefined
}

/**
 * Resolve o rótulo anonimizado (`C1`/`C2`…) para a candidatura real, PELA CHAVE.
 *
 * ⚠ Phase 49 / plano 49-22 (JORN-25) — até aqui esta função lia o número do rótulo e indexava a
 * lista de finalistas: `C2` → `finalistIds[1]`. É o MESMO defeito que o 49-13 removeu da tela do
 * comparativo da vaga, e pela mesma razão ele é de repúdio e não de layout: a Edge Function
 * ordena por score com desempate por `candidatura_id` (49-08), então num EMPATE o mesmo pedido
 * podia trocar `C1` e `C2` entre execuções — e a decisão final registrada seria sobre a pessoa
 * errada, com o registro parecendo consistente.
 *
 * A EF devolve `posicoes` (`C<n>` → `candidatura_id`), montado no MESMO laço que montou o
 * prompt. O lookup é por id e a ordem da lista deixa de importar.
 *
 * ⚠ Sem entrada em `posicoes`, fica o RÓTULO CRU — nunca o vizinho. E `nome` degrada para o
 * próprio `candidate_id` porque `listFinalistas` é allowlist SEM PII: esta tela não recebe
 * nomes, de propósito. Uma coluna sem rótulo nenhum seria pior que uma com `C1` — ninguém
 * confere o que não consegue nomear.
 */
export function resolveFinalistCandidates(
  ranked: RankedCandidate[],
  posicoes: Record<string, string> | undefined,
): ComparativoCandidate[] {
  return ranked.map((r) => {
    const candidaturaId = posicoes?.[r.candidate_id]
    return {
      ...r,
      flags: [],
      nome: r.nome || r.candidate_id,
      candidaturaId: candidaturaId ?? r.candidate_id,
    }
  })
}

export function DecisaoFinalPage() {
  const { id } = useParams<{ id: string }>()
  const candidaturaId = id ?? ''
  const [tab, setTab] = useState<TabValue>('dashboard')

  // Resolve the vaga of this candidatura (scopes the consolidation + the Comparativo).
  const { data: vagaId, isLoading: loadingVaga } = useQuery({
    queryKey: [...decisaoKeys.all, 'vaga', candidaturaId],
    queryFn: () => getVagaIdDaCandidatura(candidaturaId),
    enabled: !!candidaturaId,
  })

  // The finalists in decisao_final for this vaga (DECISAO-02) — the Comparativo scope.
  const { data: finalistas } = useQuery({
    queryKey: decisaoKeys.finalistas(vagaId ?? ''),
    queryFn: () => listFinalistas(vagaId!),
    enabled: !!vagaId,
  })

  // The existing decision (drives the append-only note in the form).
  const { data: decisaoAtual } = useQuery({
    queryKey: decisaoKeys.atual(candidaturaId),
    queryFn: () => getDecisaoAtual(candidaturaId),
    enabled: !!candidaturaId,
  })

  const finalistIds = useMemo(
    () => (finalistas ?? []).map((f) => f.candidatura_id),
    [finalistas],
  )

  // Comparativo (Phase-10 reuse) — invoked when the Comparativo tab opens with ≥2 finalists.
  const comparativo = useComparativo()
  const {
    mutate: runComparativo,
    data: comparativoData,
    isPending,
    isError,
    error: comparativoError,
  } = comparativo

  // D-59: o intervalo é o da Edge Function, lido da constante compartilhada — nunca um par de
  // literais paralelos que envelhece sozinho.
  const podeComparar =
    finalistIds.length >= COMPARATIVO_MIN_CANDIDATOS &&
    finalistIds.length <= COMPARATIVO_MAX_CANDIDATOS

  useEffect(() => {
    if (tab === 'comparativo' && vagaId && podeComparar) {
      runComparativo({ vagaId, candidaturaIds: finalistIds })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, vagaId, finalistIds.join(',')])

  const candidates = useMemo<ComparativoCandidate[]>(() => {
    if (!comparativoData?.ranking?.ranked_candidates) return []
    return resolveFinalistCandidates(
      comparativoData.ranking.ranked_candidates,
      comparativoData.posicoes,
    )
  }, [comparativoData])

  const registrar = useRegistrarDecisao()

  function handleRegistrar(values: { decisao: 'aprovado' | 'rejeitado' | 'em_espera'; justificativa: string }) {
    registrar.mutate({
      candidaturaId,
      decisao: values.decisao,
      justificativa: values.justificativa,
    })
  }

  return (
    <RHLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-white md:text-4xl">Decisão final</h1>

        {/* Tabs — Radix tablist/tab/tabpanel (keyboard arrow-key roving focus). */}
        <Tabs value={tab} onValueChange={(v: string) => setTab(v as TabValue)}>
          <TabsList className="flex flex-wrap gap-2 h-auto w-fit bg-transparent p-0 text-white">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className={cn(
                  'min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold transition-colors',
                  'border-white/15 bg-white/5 text-white/60 hover:bg-white/10',
                  'data-[state=active]:border-white/30 data-[state=active]:bg-white/20 data-[state=active]:text-white',
                )}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Dashboard — consolidated score + breakdown + recommendation */}
          <TabsContent value="dashboard">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              {loadingVaga ? (
                <Skeleton className="h-40 w-full bg-white/5" />
              ) : (
                <ConsolidacaoDashboard candidaturaId={candidaturaId} vagaId={vagaId ?? undefined} />
              )}
            </Glass>
          </TabsContent>

          {/* Comparativo — Phase-10 reuse, scoped to finalists */}
          <TabsContent value="comparativo">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              {/*
                D-36b: os dois estados em que NÃO há comparativo são DIFERENTES, e dizê-los com
                a mesma frase apagava a diferença. Abaixo do mínimo não há o que comparar;
                acima do teto há comparativo, mas não aqui — e antes deste plano a tela
                simplesmente ficava em branco (o `useEffect` não invocava e nada era dito),
                que é cortar em silêncio.
              */}
              {finalistIds.length < COMPARATIVO_MIN_CANDIDATOS ? (
                <div className="space-y-2 p-12 text-center text-white/80">
                  <p className="text-xl font-semibold text-white">
                    Ainda não há o que comparar.
                  </p>
                  <p>
                    É preciso ao menos {COMPARATIVO_MIN_CANDIDATOS} candidaturas em decisão final
                    nesta vaga para gerar o comparativo. Hoje há {finalistIds.length}.
                  </p>
                </div>
              ) : !podeComparar ? (
                <div className="space-y-2 p-12 text-center text-white/80">
                  <p className="text-xl font-semibold text-white">
                    São {finalistIds.length} candidaturas em decisão final — mais do que este
                    comparativo aceita.
                  </p>
                  <p>
                    O comparativo aceita até {COMPARATIVO_MAX_CANDIDATOS} candidaturas por vez.
                    Use o comparativo da vaga, no painel de candidatos, para escolher quais
                    comparar.
                  </p>
                </div>
              ) : (
                // O <AsyncState> do ComparativoScreen é a fonte única de
                // loading/slow/erro/retry do invoke — nunca tela em branco (RESIL-03).
                <ComparativoScreen
                  candidates={candidates}
                  // D-27b / JORN-28: a página passou a FIAR a proveniência (até o 49-22 ela
                  // omitia os três campos, e o `undefined` significava «não fiado» → nenhum
                  // selo). Agora `null` chega quando a EF não gravou o modelo, e o selo diz
                  // «modelo não registrado» em vez de calar. Este ranking decide uma decisão
                  // final: saber se saiu do modelo de contingência não é detalhe técnico.
                  provedorIa={comparativoData?.provedor_ia ?? null}
                  modeloIa={comparativoData?.modelo_ia ?? null}
                  fallbackCause={comparativoData?.fallback_cause ?? null}
                  isLoading={isPending}
                  isError={isError}
                  errorCode={errorCodeOf(comparativoError)}
                  retrying={isPending}
                  onRetry={() => {
                    if (vagaId && podeComparar) {
                      runComparativo({ vagaId, candidaturaIds: finalistIds })
                    }
                  }}
                />
              )}
            </Glass>
          </TabsContent>

          {/* Decisão — terminal capture form */}
          <TabsContent value="decisao">
            <Glass variant="white" blur="lg" className="rounded-xl p-6">
              <RegistrarDecisaoForm
                onConfirm={handleRegistrar}
                submitting={registrar.isPending}
                decisaoAtual={decisaoAtual ?? null}
                erro={registrar.error}
              />
            </Glass>
          </TabsContent>
        </Tabs>
      </div>
    </RHLayout>
  )
}
