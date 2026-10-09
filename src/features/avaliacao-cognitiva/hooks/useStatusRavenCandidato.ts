/**
 * useStatusRavenCandidato — o estado do «Raciocínio lógico (Matrizes)» visto pelo CANDIDATO
 * (Phase 51 / Plan 51-07 · JORN-43 · D-13 · C-4).
 *
 * Lê `get_avaliacao_status` (DEFINER, guarda de titular) e devolve só a chave `raven`
 * (`{ liberado, registrado }`, dois booleanos — 51-06). É o hook que o `RavenCandidatoCard`
 * possui, no molde do `AgendamentoCandidatoCard` × `useMeuAgendamento`: o hook mora num módulo
 * próprio para que o painel (e os testes do painel, que rodam sem `QueryClientProvider`) possa
 * mocká-lo pelo mesmo idioma do `useSlaEtapas` e do `useRetirarCandidatura`.
 *
 * ⚠ A CHAVE É A DO `AvaliacaoContainer` — `['avaliacao', 'status', candidaturaId]`, literal
 * idêntica, com o mesmo `queryFn` (`getAvaliacaoStatus`). Não há fábrica de chave exportada
 * para ela (o container a escreve inline), e criar uma e migrar o container não é deste plano.
 * O que importa é que as duas leituras compartilhem a mesma entrada de cache: o payload é o
 * mesmo objeto, e uma invalidação feita por qualquer um dos lados vale para os dois. O
 * `select` recorta só a chave `raven` na saída deste hook — o cache guarda o status inteiro.
 *
 * @module features/avaliacao-cognitiva/hooks/useStatusRavenCandidato
 * @see src/features/avaliacao/components/AvaliacaoContainer.tsx (a query de status, mesma chave)
 * @see supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql (a chave raven)
 */
import { useQuery } from '@tanstack/react-query'
import {
  getAvaliacaoStatus,
  type AvaliacaoStatus,
  type AvaliacaoStatusRaven,
} from '@/features/avaliacao/services/avaliacaoService'

/** A chave de `getAvaliacaoStatus` — a mesma do `AvaliacaoContainer` (ver docblock). */
export function avaliacaoStatusKey(candidaturaId: string) {
  return ['avaliacao', 'status', candidaturaId] as const
}

export function useStatusRavenCandidato(candidaturaId: string) {
  return useQuery<AvaliacaoStatus, Error, AvaliacaoStatusRaven>({
    queryKey: avaliacaoStatusKey(candidaturaId),
    queryFn: () => getAvaliacaoStatus(candidaturaId),
    enabled: Boolean(candidaturaId),
    select: (status) => status.raven,
  })
}
