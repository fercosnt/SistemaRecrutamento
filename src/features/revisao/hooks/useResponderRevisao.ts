/**
 * useResponderRevisao — a mutação que registra a resposta à revisão de decisão
 * (REVISAO-03 / REVISAO-05, LGPD Art. 20).
 *
 * Molde de `useRegistrarDecisao` (mutationKey + mutationFn + toast/invalidação no
 * sucesso), com **um delta obrigatório no `onError`** que é a razão de este hook existir
 * como arquivo próprio em vez de uma cópia.
 *
 * ── POR QUE `GUARD_DECISOR` NÃO VIRA TOAST ────────────────────────────────────────
 * O molde toasta qualquer erro numa linha só. Aqui isso seria um defeito silencioso: um
 * toast **some**, e a recusa do guard REVISAO-05 é justamente o caso em que o operador
 * precisa ler, entender e agir (encaminhar o pedido a outra pessoa). Pior: um toast
 * genérico convida a tentar de novo, e tentar de novo NUNCA vai funcionar — a recusa é
 * sobre QUEM é o usuário, não sobre o estado do pedido. Então, para esse código, o hook
 * fica deliberadamente calado e o diálogo assume: alerta inline destrutivo, permanente,
 * sem botão de tentar novamente.
 *
 * `VALIDACAO` e `DESCONHECIDO` seguem o molde e viram `toast.error`.
 *
 * ── POR QUE A INVALIDAÇÃO É PELA CHAVE RAIZ ───────────────────────────────────────
 * `revisoesKeys.all` cobre a lista **e** o contador da sidebar de uma vez. Invalidar só
 * `lists()` deixaria o badge do menu anunciando um pendente que acabou de ser respondido.
 *
 * ⚠ NOTA SOBRE O EFEITO EXTERNO: um sucesso aqui dispara `trg_notif_revisao_respondida`
 * → EF `notificar-candidato`, ou seja, um e-mail REAL ao candidato. Nada nesta camada
 * desfaz isso — não há retry idempotente a inventar nem desfazer a oferecer. Por isso o
 * diálogo confirma antes de chamar, e não depois.
 *
 * @module features/revisao/hooks/useResponderRevisao
 * @see src/features/decisao/hooks/useRegistrarDecisao.ts (o molde)
 * @see src/features/revisao/services/revisaoService.ts (responderRevisao + RevisaoError)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  responderRevisao,
  RevisaoError,
  type ResponderRevisaoVars,
} from '../services/revisaoService'
import { revisoesKeys } from './useFilaRevisoes'

/** Copy verbatim da 42-UI-SPEC (§Diálogo "Responder revisão"). */
const COPY = {
  sucesso: 'Resposta registrada. O candidato foi notificado.',
  erroGenerico: 'Não foi possível registrar a resposta. Tente novamente.',
} as const

export function useResponderRevisao() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, ResponderRevisaoVars>({
    mutationKey: [...revisoesKeys.all, 'responder'],
    mutationFn: (vars) => responderRevisao(vars),
    onSuccess: () => {
      toast.success(COPY.sucesso)
      // Chave RAIZ: cobre a lista (as duas variantes do toggle) e o contador da sidebar.
      queryClient.invalidateQueries({ queryKey: revisoesKeys.all })
    },
    onError: (error) => {
      // O delta obrigatório. Um toast aqui apagaria em 4 segundos a única explicação que
      // o operador vai receber — e sugeriria um retry que não existe.
      if (error instanceof RevisaoError && error.code === 'GUARD_DECISOR') return
      toast.error(COPY.erroGenerico)
    },
  })
}
