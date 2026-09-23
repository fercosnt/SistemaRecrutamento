/**
 * ComparativoCandidatosPage — wrapper RHLayout da tela de comparativo (UI-SPEC §B).
 *
 * Lê os ids selecionados + nomes (router state, enviados pelo painel via `onCompare`)
 * + vagaId (param). Roda `useComparativo` (invoca a EF comparativo-candidatos com o JWT
 * do usuário). Resolve os ids anonimizados da IA (C1/C2…) de volta para a candidatura
 * real + nome PELA CHAVE `posicoes` que a EF devolve (49-13). Renderiza
 * `ComparativoScreen` com estados loading/erro — vagas diferentes (EF 400) mostra a
 * cópia pt-BR exata. Avançar chama `updateCandidaturaEtapa` com a PRÓXIMA ETAPA REAL de
 * cada candidato (`proximaEtapaDeTrabalho`, 49-05 / D-36 — era uma etapa fixa); Rejeitar abre o
 * `RejeitarCandidaturaDialog` compartilhado (montado no `ComparativoScreen`) que grava
 * pela RPC auditada `rejeitar_candidatura` (motivo + justificativa ≥50) — funil-02 /
 * OPER-04, substituindo o antigo update de etapa cru (sem justificativa).
 *
 * @module components/pages/ComparativoCandidatosPage
 * @see src/features/triagem/components/ComparativoScreen.tsx
 * @see src/features/triagem/components/RejeitarCandidaturaDialog.tsx
 * @see src/features/triagem/hooks/useRejeitarCandidatura.ts
 */

import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { RHLayout } from '../RHLayout'
import { Glass, GlassButton } from '@/components/ui/glass'
import { useComparativo } from '@/features/triagem/hooks/useComparativo'
import { triagemKeys } from '@/features/triagem/hooks/useTriagemPanel'
import {
  updateCandidaturaEtapa,
  TriagemServiceError,
} from '@/features/triagem/services/triagemService'
import {
  ComparativoScreen,
  type ComparativoCandidate,
} from '@/features/triagem/components/ComparativoScreen'
import type { RankedCandidate } from '@/features/triagem/pdf/exportComparativo'
import { proximaEtapaDeTrabalho } from '@/lib/candidatura/proximaEtapa'
import { candidaturaEncerrada } from '@/lib/candidatura/candidaturaEncerrada'
// D-59: o piso e o teto vêm da MESMA constante que a EF usa para recusar (contrato de zero
// imports → import relativo; precedente do `exportacaoService.ts:61`).
import {
  COMPARATIVO_MAX_CANDIDATOS,
  COMPARATIVO_MIN_CANDIDATOS,
} from '../../../supabase/functions/_shared/comparativo-config'

/** Pull the EF `error_code` (AI_UNAVAILABLE / MIXED_VAGA) off a TriagemServiceError — code-only. */
function errorCodeOf(error: unknown): string | undefined {
  if (error instanceof TriagemServiceError) {
    const details = error.details as { error_code?: unknown } | undefined
    if (typeof details?.error_code === 'string') return details.error_code
    // MIXED_VAGA may arrive as the service `code` even if details omit error_code.
    if (error.code === 'MIXED_VAGA') return 'MIXED_VAGA'
  }
  return undefined
}

/**
 * Seleção carregada pelo painel: candidatura id + nome, em ordem de score DESC.
 *
 * Phase 49 / plano 49-22 — D-36: `etapa_atual` e `status` são OPCIONAIS de propósito. O painel
 * (`VagaCandidatosRHPage.handleCompare`) sempre os envia; ausentes significa «estado de rota de
 * um bundle anterior», e a resposta a isso NÃO é assumir «não pode avançar» — inferir da
 * ausência esconderia a ação de quem pode. Ver `podeAvancar`.
 */
interface SelectionItem {
  id: string
  nome: string
  etapa_atual?: string
  status?: string
}

interface ComparativoLocationState {
  ids?: string[]
  candidatos?: SelectionItem[]
}

/**
 * Resolve o rótulo anonimizado (`C1`/`C2`…) para a candidatura/nome reais, PELA CHAVE.
 *
 * ⚠ **POR QUE PELA CHAVE, E NÃO PELA POSIÇÃO (JORN-25 / T-49-13-01).** Até o plano 49-13
 * esta função lia o número do rótulo e indexava a seleção: `C2` → `selection[1]`. Isso
 * supõe que a ordem em que a Edge Function anonimiza é a mesma em que o painel entregou a
 * seleção — e as duas divergem sempre que a EF reordena, o que ela faz por score com
 * desempate por `candidatura_id` (49-08). Num empate de score, o mesmo pedido podia trocar
 * `C1` e `C2` entre execuções: o RH leria os pontos fortes de uma pessoa sob o nome de
 * outra, sem nada na tela indicando a troca. É um defeito de repúdio, não de layout.
 *
 * A EF passou a devolver `posicoes` (`C<n>` → `candidatura_id`), montado no MESMO laço que
 * montou o prompt. O lookup é por id, e a ordem da seleção deixa de importar.
 *
 * ⚠ **Sem entrada em `posicoes`, mostra o RÓTULO CRU — nunca o vizinho** (Discretion
 * obrigatória do JORN-25). É o que acontece se a EF publicada for anterior ao 49-08: `C1`
 * aparece como `C1`, que é visivelmente incompleto, em vez de um nome plausível e errado.
 *
 * Exportada para teste direto: é uma função pura e o caso que importa (seleção em ordem
 * diferente do ranking) é caro de montar pela página inteira.
 */
export function resolveCandidates(
  ranked: RankedCandidate[],
  posicoes: Record<string, string> | undefined,
  selection: SelectionItem[],
): ComparativoCandidate[] {
  const porId = new Map(selection.map((s) => [s.id, s]))
  return ranked.map((r) => {
    const candidaturaId = posicoes?.[r.candidate_id]
    const sel = candidaturaId ? porId.get(candidaturaId) : undefined
    return {
      ...r,
      flags: [],
      nome: sel?.nome ?? r.candidate_id,
      candidaturaId: candidaturaId ?? r.candidate_id,
    }
  })
}

/**
 * Página de comparativo de candidatos (RH).
 */
export function ComparativoCandidatosPage() {
  const { id: vagaId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const state = (location.state ?? {}) as ComparativoLocationState
  const selection = useMemo<SelectionItem[]>(() => state.candidatos ?? [], [state.candidatos])
  const ids = useMemo<string[]>(
    () => state.ids ?? selection.map((s) => s.id),
    [state.ids, selection],
  )

  const comparativo = useComparativo()
  const { mutate, data, isPending, isError, error } = comparativo

  // Dispara a invocação ao montar (uma vez por seleção válida). O intervalo é o da EF.
  const selecaoValida =
    ids.length >= COMPARATIVO_MIN_CANDIDATOS && ids.length <= COMPARATIVO_MAX_CANDIDATOS

  useEffect(() => {
    if (vagaId && selecaoValida) {
      mutate({ vagaId, candidaturaIds: ids })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vagaId, ids.join(',')])

  const candidates = useMemo<ComparativoCandidate[]>(() => {
    if (!data?.ranking?.ranked_candidates) return []
    return resolveCandidates(data.ranking.ranked_candidates, data.posicoes, selection)
  }, [data, selection])

  const invalidatePanel = () => {
    queryClient.invalidateQueries({ queryKey: triagemKeys.all })
  }

  /**
   * Phase 49 / plano 49-22 — D-36. Até aqui esta função gravava
   * `PROXIMA_ETAPA_APOS_TRIAGEM` ('avaliacao_assincrona') para QUALQUER candidato, qualquer que
   * fosse a etapa dele. Não divergia: estava errada sempre — quem estava em
   * `entrevista_presencial` era jogado TRÊS etapas atrás, e o painel mostrava o retrocesso como
   * se fosse um avanço. A resposta passa a vir de `proximaEtapaDeTrabalho`, o mesmo util que o
   * Kanban e o hub do RH consomem (49-05).
   *
   * ⚠ Sem próxima etapa, a tela DIZ isso em vez de gravar um palpite. O botão já não deveria
   * estar visível (`podeAvancar`), mas a decisão de não escrever mora aqui também: a camada que
   * ESCREVE é a que não pode supor.
   */
  const handleAvancar = async (candidaturaId: string) => {
    const item = selection.find((s) => s.id === candidaturaId)
    const proxima = proximaEtapaDeTrabalho(item?.etapa_atual)
    if (!proxima) {
      toast.error(
        'Não foi possível identificar a próxima etapa deste candidato. Abra o perfil dele para avançar.',
      )
      return
    }
    try {
      await updateCandidaturaEtapa(candidaturaId, proxima)
      toast.success('Candidato avançado para a próxima etapa.')
      invalidatePanel()
    } catch {
      toast.error('Não foi possível avançar o candidato. Tente novamente.')
    }
  }

  /**
   * Elegibilidade do «Avançar», por candidato (D-36 / D-34) — a SEGUNDA camada. A EF já recusa
   * encerrada (`ENCERRADA`, 49-08) e o banco trava o avanço (49-06); aqui o botão simplesmente
   * não é oferecido.
   *
   * ⚠ Sem `etapa_atual` no estado da rota NÃO SABEMOS, e o retorno é `true`: inferir «não pode»
   * da ausência esconderia a ação de quem pode, e o `handleAvancar` acima já se recusa a gravar
   * um palpite. Absence-is-not-evidence é a mesma regra que o 49-04 aplicou à célula DISC.
   */
  const podeAvancar = (candidaturaId: string) => {
    const item = selection.find((s) => s.id === candidaturaId)
    if (!item || item.etapa_atual === undefined) return true
    if (candidaturaEncerrada(item.etapa_atual, item.status)) return false
    return proximaEtapaDeTrabalho(item.etapa_atual) !== undefined
  }

  // funil-02 / OPER-04: a rejeição em si — motivo + justificativa ≥50 — é feita pelo
  // RejeitarCandidaturaDialog compartilhado (montado no ComparativoScreen), que grava
  // pela RPC auditada `rejeitar_candidatura` via `useRejeitarCandidatura` (e já emite o
  // toast de sucesso + invalida candidaturasKeys/vagasKeys/triagemKeys). Aqui fica só o
  // callback pós-sucesso — NUNCA mais o update de etapa cru sem justificativa
  // (disposição não-auditável), que era a dívida funil-02.
  const handleRejeitar = () => {
    invalidatePanel()
  }

  const voltar = () => navigate(vagaId ? `/rh/vagas/${vagaId}/candidatos` : '/rh/vagas')

  return (
    <RHLayout>
      <div className="space-y-6 px-6 py-8">
        <div className="flex items-center gap-3">
          <GlassButton onClick={voltar}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </GlassButton>
          <h1 className="text-xl font-semibold text-white">Comparativo de candidatos</h1>
        </div>

        <Glass variant="white" blur="lg" className="p-6">
          {/* Seleção inválida — pré-condição (não é estado assíncrono). O piso e o teto são os
              da EF (D-59): acima do teto a tela diz o limite em vez de cortar em silêncio. */}
          {!selecaoValida ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-white/80">
              <AlertTriangle className="h-8 w-8 text-white/60" aria-hidden="true" />
              <p>
                {ids.length < COMPARATIVO_MIN_CANDIDATOS
                  ? `Selecione ao menos ${COMPARATIVO_MIN_CANDIDATOS} candidatos para comparar.`
                  : `O comparativo aceita até ${COMPARATIVO_MAX_CANDIDATOS} candidatos por vez. Você selecionou ${ids.length} — volte ao painel e reduza a seleção.`}
              </p>
              <GlassButton onClick={voltar}>Voltar ao painel</GlassButton>
            </div>
          ) : (
            // O <AsyncState> dentro do ComparativoScreen é a fonte única de
            // loading/slow/erro/retry do invoke — nunca tela em branco (RESIL-03).
            // MIXED_VAGA preservado via errorCode (ComparativoScreen ramifica a cópia).
            <ComparativoScreen
              candidates={candidates}
              // D-27b: a proveniência atravessa a tela até o PDF. Passar `data?.…` (e não um
              // default local) é o que faz o selo dizer «modelo não registrado» quando a EF
              // não gravou o modelo, em vez de silenciar.
              provedorIa={data?.provedor_ia ?? null}
              modeloIa={data?.modelo_ia ?? null}
              fallbackCause={data?.fallback_cause ?? null}
              onAvancar={handleAvancar}
              onRejeitar={handleRejeitar}
              podeAvancar={podeAvancar}
              isLoading={isPending}
              isError={isError}
              errorCode={errorCodeOf(error)}
              retrying={isPending}
              onRetry={() => {
                if (vagaId && selecaoValida) {
                  mutate({ vagaId, candidaturaIds: ids })
                }
              }}
            />
          )}
        </Glass>
      </div>
    </RHLayout>
  )
}
