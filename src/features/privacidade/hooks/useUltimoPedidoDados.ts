/**
 * useUltimoPedidoDados — o estado do cooldown de 24 h do pedido de cópia (EXPORT-01).
 *
 * ⚠ A NOVA TENTATIVA ESTÁ DESLIGADA, e a razão é a **Invariante 3 na sua forma
 * de hook**: este hook lê um estado que o SERVIDOR vai reavaliar no clique. Insistir
 * em ler é atrasar a tela para obter uma opinião que não é a autoridade. Falhar
 * rápido e degradar para "estado desconhecido" — com o CTA renderizando e o servidor
 * recusando se for o caso — é estritamente mais correto do que ficar em `isError`.
 *
 * Pela mesma razão o serviço resolve erro para `null` em vez de lançar: o hook nunca
 * fica em `isError` por causa de uma leitura de estado, e a seção nunca vira uma
 * tela de erro por causa de uma informação que só governa a APRESENTAÇÃO. Molde
 * verbatim de `useConfigSlaRevisao` (Phase 42), que estabeleceu o padrão.
 *
 * ⚠ O gate por candidato hidratado NÃO é opcional. Sem ele a query dispara antes de
 * o candidato estar hidratado no store e devolve vazio — que a tela leria como
 * "nunca pediu", liberando o CTA por um fato que ninguém mediu. A corrida entre o
 * `RoleGuard` (papel do JWT) e a linha `candidato` hidratada já é reconhecida neste
 * projeto por `waitForCandidatoHydrated`.
 *
 * ⚠ **NADA DO EXPORT ENTRA NO CACHE.** Este hook cacheia SOMENTE o estado do último
 * pedido (id, situação, causa, dois timestamps). O payload da cópia e qualquer URL
 * assinada ficam fora do React Query por construção — a mutation do 44-05 não
 * persiste resposta em cache e o link do currículo é cunhado no clique (Invariante 4).
 *
 * @module features/privacidade/hooks/useUltimoPedidoDados
 * @see src/features/revisao/hooks/useConfigSlaRevisao.ts (o molde: falhar rápido e degradar)
 * @see .planning/phases/44-exporta-o-acesso/44-04-SUMMARY.md (a policy own-row que autoriza a leitura)
 */
import { useQuery } from '@tanstack/react-query'
import { lerUltimoPedidoDados, type UltimoPedidoDados } from '../services/exportacaoService'
import { privacidadeKeys } from './usePrivacidade'

/**
 * `staleTime` = `gcTime` de propósito (igual ao molde): o dado só interessa
 * enquanto a tela está aberta, e mantê-lo em cache depois de obsoleto convidaria a
 * uma decisão de apresentação tomada sobre um estado velho.
 */
const STALE = 5 * 60 * 1000

/** Lê o último pedido de acesso do titular; `null` é resultado válido, não erro. */
export function useUltimoPedidoDados(candidatoId: string | undefined) {
  return useQuery<UltimoPedidoDados | null>({
    queryKey: privacidadeKeys.ultimoPedido(candidatoId),
    queryFn: () => lerUltimoPedidoDados(candidatoId),
    enabled: Boolean(candidatoId),
    staleTime: STALE,
    gcTime: STALE,
    retry: false,
  })
}
