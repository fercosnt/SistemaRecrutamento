/**
 * useIdsAvaliacoesConcluidas — quais candidaturas do painel do candidato têm TODAS as avaliações
 * concluídas (Phase 52 / Plan 52-04 · JORN-59 · D-27 · D-52-U16).
 *
 * O painel (`DashboardCandidatoPage`) usa o conjunto devolvido para dizer «Avaliações concluídas —
 * aguardando a equipe» no lugar do «Continuar para …», e o selo «Aguardando a equipe». NADA muda
 * no banco (D-27): `candidaturas.status` e `etapa_atual` ficam como estão; a tela deriva o estado
 * do que lê.
 *
 * Uma regra só, vinda do `AvaliacaoContainer`: as MESMAS duas leituras (`avaliacaoQueryOptions` —
 * chaves `['avaliacao','context',id]` e `['avaliacao','status',id]`, mesmas funções de serviço),
 * os MESMOS cards (`deriveCards`) e a MESMA regra (`avaliacoesConcluidas`, que é o «Tudo concluído»
 * da lista). Este hook não reescreve nenhuma delas. Por compartilhar as chaves, a escrita e a
 * invalidação que `marcarInstrumentoRegistrado` faz no status valem para o painel sem código novo.
 *
 * Só entram as candidaturas em `avaliacao_assincrona` e não encerradas. Carregando ou em erro, a
 * candidatura fica FORA do conjunto ⇒ o painel mostra o CTA de hoje (D-52-U16: nunca esconder ação
 * devida; a lista de avaliações já diz «Tudo concluído» a quem clicar).
 *
 * ⚠ Por que mora num módulo próprio, e não dentro da página: o `useQueries` exige um
 * `QueryClientProvider` (TanStack 5: «No QueryClient set», mesmo com a lista vazia), e os testes do
 * painel rodam sem provider. Como `useSlaEtapas`, `useRetirarCandidatura` e
 * `useStatusRavenCandidato`, este hook é mockado pelo caminho do módulo nesses testes — o mock é do
 * HOOK, nunca do componente. O `DashboardCandidatoPage.concluidas.test.tsx` é o que o roda de
 * verdade, sobre um cliente Supabase espião.
 *
 * @module features/avaliacao/hooks/useIdsAvaliacoesConcluidas
 * @see src/features/avaliacao/components/AvaliacaoContainer.tsx (a regra, as chaves, os cards)
 * @see src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts (o molde)
 */
import { useQueries } from '@tanstack/react-query'
import {
  AVALIACAO_ASSINCRONA_ETAPA,
  avaliacaoQueryOptions,
  avaliacoesConcluidas,
  deriveCards,
} from '@/features/avaliacao/components/AvaliacaoContainer'
import type {
  AvaliacaoContext,
  AvaliacaoStatus,
} from '@/features/avaliacao/services/avaliacaoService'
import { candidaturaEncerrada } from '@/lib/candidatura/candidaturaEncerrada'

/** O mínimo que o hook lê de cada candidatura do painel. */
export interface CandidaturaDoPainel {
  id: string
  etapa_atual?: string | null
  status?: string | null
}

export function useIdsAvaliacoesConcluidas(
  candidaturas: ReadonlyArray<CandidaturaDoPainel> | undefined,
): Set<string> {
  const ids = (candidaturas ?? [])
    .filter(
      (c) =>
        c.etapa_atual === AVALIACAO_ASSINCRONA_ETAPA &&
        !candidaturaEncerrada(c.etapa_atual, c.status),
    )
    .map((c) => c.id)

  // Duas leituras por candidatura elegível, nesta ordem: [contexto, status].
  const resultados = useQueries({
    queries: ids.flatMap((id) => [
      avaliacaoQueryOptions.contexto(id),
      avaliacaoQueryOptions.status(id),
    ]),
  })

  const concluidas = new Set<string>()
  ids.forEach((id, i) => {
    const contexto = resultados[2 * i]
    const status = resultados[2 * i + 1]
    if (!contexto?.isSuccess || !status?.isSuccess) return
    const cards = deriveCards(
      contexto.data as AvaliacaoContext,
      status.data as AvaliacaoStatus,
    )
    if (avaliacoesConcluidas(cards)) concluidas.add(id)
  })
  return concluidas
}
