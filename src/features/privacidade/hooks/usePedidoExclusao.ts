/**
 * usePedidoExclusao — o estado da seção 4: o pedido em aberto, a janela e se há o
 * que apagar (ERASE-06).
 *
 * ⚠ **UMA LEITURA, UMA FONTE.** Os três fatos vêm do MESMO hook de propósito: a tela
 * decide entre Estado A, Estado B e vazio com base nos três juntos, e três queries
 * independentes produziriam renders intermediários em que o CTA aparece antes de se
 * saber se já existe pedido — exatamente o "botão que pisca entre habilitado e
 * desabilitado" que a UI-SPEC (E1/loading) proíbe, aqui sobre a ação que APAGA DADOS.
 *
 * ⚠ **O GATE POR CANDIDATO HIDRATADO NÃO É OPCIONAL.** Sem `enabled` a query dispara
 * antes de a linha `candidato` existir no store e devolve vazio — que a tela leria
 * como "nunca pediu", liberando o CTA por um fato que ninguém mediu. A corrida entre
 * o `RoleGuard` (papel do JWT) e a linha hidratada já é reconhecida neste projeto por
 * `waitForCandidatoHydrated`. Nesta fase o CTA em questão é o que destrói dados sem
 * rede de recuperação (D-45-10).
 *
 * ⚠ A NOVA TENTATIVA ESTÁ DESLIGADA, molde verbatim de `useUltimoPedidoDados`: este
 * hook lê um estado que o SERVIDOR reavalia no clique. Mas note a divergência de
 * CONSUMO — lá, `isError` deixa o CTA renderizar (o servidor recusa se for o caso);
 * aqui, `isError` DESABILITA o CTA com motivo visível (E1/error), porque um pedido
 * duplicado não é um download a mais.
 *
 * @module features/privacidade/hooks/usePedidoExclusao
 * @see src/features/privacidade/hooks/useUltimoPedidoDados.ts (o molde)
 */
import { useQuery } from '@tanstack/react-query'
import {
  lerPedidoExclusaoAberto,
  lerJanelaExclusao,
  titularTemCandidatura,
  type PedidoExclusao,
} from '../services/exclusaoService'
import { privacidadeKeys } from './usePrivacidade'

/** `staleTime` = `gcTime`: o dado só interessa enquanto a tela está aberta. */
const STALE = 5 * 60 * 1000

export interface EstadoExclusao {
  /** O pedido em aberto, ou `null` se nunca houve. */
  pedido: PedidoExclusao | null
  /** A janela em dias; `null` = config ausente (a tela degrada, não some). */
  dias: number | null
  /** Há o que apagar? Falso ⇒ o CTA não é renderizado. */
  temCandidatura: boolean
}

export function usePedidoExclusao(candidatoId: string | undefined) {
  return useQuery<EstadoExclusao>({
    queryKey: privacidadeKeys.pedidoExclusao(candidatoId),
    queryFn: async () => {
      const [pedido, dias, temCandidatura] = await Promise.all([
        lerPedidoExclusaoAberto(candidatoId),
        lerJanelaExclusao(),
        titularTemCandidatura(candidatoId),
      ])
      return { pedido, dias, temCandidatura }
    },
    enabled: Boolean(candidatoId),
    staleTime: STALE,
    gcTime: STALE,
    retry: false,
  })
}
