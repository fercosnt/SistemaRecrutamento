/**
 * avaliacaoStatusCache — escreve a conclusão de uma prova na entrada de status que a lista
 * de avaliações lê (Phase 51 / Plan 51-18 · G2 do `51-GAPS-DECISAO.md` · WR-01 do
 * `51-REVIEW.md` · JORN-46 / D-37).
 *
 * Por quê: o `AvaliacaoContainer` lê `get_avaliacao_status` do cache do React Query, com o
 * `staleTime` global de 5 min (`src/App.tsx`). O 51-01 fez de «Voltar às avaliações» o caminho
 * padrão depois de enviar uma prova — e a lista voltava com o status de ANTES da prova, ainda
 * fresco: o card seguia em «Começar avaliação» e, na prova cognitiva, refazer sobrescrevia a
 * banda que o RH vê. A partir do envio resolvido, «concluída» é fato do servidor; esta função
 * escreve isso no cache e invalida a entrada, para o servidor confirmar na próxima leitura.
 *
 * Molde: o 51-07 no Raven (`AvaliacaoRavenScreen.tsx`, `setQueryData` + `invalidateQueries`
 * logo depois do envio). O Raven não usa esta função: ele escreve a chave `raven`, que não é
 * card do container, e já está certo.
 *
 * Contrato (bordas do EDGE-PROBE G2):
 *  - escreve SÓ `registrado: true` do card pedido — nenhum número entra no cache (RNF-07a); as
 *    outras folhas, `iniciado` do próprio card e a chave `raven` ficam como estavam;
 *  - entrada ausente continua ausente (nenhum objeto de status é fabricado), e a invalidação
 *    acontece mesmo assim;
 *  - a chave é a da candidatura pedida — a entrada de outra candidatura não muda;
 *  - quem chama só chama no SUCESSO do envio: envio que falha ou volta `LOCKED`/`'locked'` não
 *    pode chegar aqui (a lista diria «Concluído» de uma prova que o servidor recusou).
 *
 * A chave vem da fábrica única `avaliacaoStatusKey` (a mesma do container e do card do Raven).
 *
 * @module features/avaliacao/lib/avaliacaoStatusCache
 * @see src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts (avaliacaoStatusKey)
 * @see src/features/avaliacao/components/AvaliacaoContainer.tsx (a query de status, mesma chave)
 */
import type { QueryClient } from '@tanstack/react-query'
import { avaliacaoStatusKey } from '@/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato'
import type { AvaliacaoStatus } from '@/features/avaliacao/services/avaliacaoService'

/** Os cards do container cuja conclusão esta função escreve (o `sjt_mc` já invalida por conta própria). */
export type CardConcluivel = 'sjt_caso_aberto' | 'big_five' | 'redacao' | 'cognitivo'

export function marcarInstrumentoRegistrado(
  queryClient: QueryClient,
  candidaturaId: string,
  card: CardConcluivel,
): void {
  const key = avaliacaoStatusKey(candidaturaId)
  queryClient.setQueryData<AvaliacaoStatus>(key, (old) =>
    old ? { ...old, [card]: { ...old[card], registrado: true } } : old,
  )
  void queryClient.invalidateQueries({ queryKey: key })
}
