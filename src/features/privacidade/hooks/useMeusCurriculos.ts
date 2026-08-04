/**
 * useMeusCurriculos — a lista de candidaturas do titular que têm currículo (EXPORT-03).
 *
 * ⚠ **A NOVA TENTATIVA FICA NO DEFAULT DO `QueryClient`, e a divergência do irmão é
 * deliberada.** O `useUltimoPedidoDados`, ao lado, usa `retry: false` porque lê um
 * estado que o SERVIDOR reavalia no clique: insistir ali é atrasar a tela para obter
 * uma opinião que não é a autoridade. Este hook lê a lista que **é** o conteúdo do
 * bloco — desistir na primeira falha esconderia currículos do próprio dono por um
 * soluço de rede, que é exatamente a ausência falsa que este milestone corrige. Dois
 * hooks vizinhos com políticas opostas precisam da razão escrita, ou o próximo leitor
 * "uniformiza" e uma das duas vira defeito.
 *
 * ⚠ O gate por candidato hidratado NÃO é opcional. Sem ele a query dispara antes de a
 * linha `candidato` existir no store e devolve vazio — que o bloco leria como "nenhum
 * currículo" e, por ser o caso em que ele NÃO renderiza, a ausência ficaria muda. É a
 * mentira mais fácil de cometer nesta tela.
 *
 * ⚠ **Nenhuma URL assinada entra neste cache.** O que é cacheado é a lista (id,
 * caminho de Storage, data, título da vaga); o link é cunhado no clique e morre nele
 * (Invariante 4 da 44-UI-SPEC).
 *
 * @module features/privacidade/hooks/useMeusCurriculos
 * @see src/features/privacidade/hooks/useUltimoPedidoDados.ts (o irmão de que ele diverge)
 * @see .planning/phases/44-exporta-o-acesso/44-CONTEXT.md (§BD-7)
 */
import { useQuery } from '@tanstack/react-query'
import { listarMeusCurriculos, type LinhaCurriculo } from '../services/exportacaoService'
import { privacidadeKeys } from './usePrivacidade'

/** Lista os currículos do próprio titular; lista vazia é resultado válido. */
export function useMeusCurriculos(candidatoId: string | undefined) {
  return useQuery<LinhaCurriculo[]>({
    queryKey: privacidadeKeys.curriculosPorCandidatura(candidatoId),
    queryFn: () => listarMeusCurriculos(candidatoId),
    enabled: Boolean(candidatoId),
  })
}
