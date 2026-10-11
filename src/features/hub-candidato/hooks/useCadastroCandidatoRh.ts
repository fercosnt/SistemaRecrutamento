/**
 * useCadastroCandidatoRh — a query ÚNICA dos dados pessoais do candidato no hub do RH
 * (Phase 52 / Plan 52-09; JORN-53, JORN-54).
 *
 * O cabeçalho de contato (52-23) e a aba «Cadastro e inscrição» (52-10) consomem esta MESMA
 * chave — uma chamada à EF `ler-cadastro-candidato-rh` por candidatura.
 *
 * Cache (escolha registrada no 52-09-SUMMARY): segue o padrão do hub — `staleTime`/`gcTime`
 * 5 min, `retry` 2 — e NÃO o padrão «sem cache» das leituras sensíveis sob demanda, porque o
 * cabeçalho e a aba têm de dividir uma chamada (UI-SPEC). Consequência: cada chamada à EF
 * escreve uma linha de log, então a linha registra a ABERTURA do hub (no máximo uma a cada
 * 5 min por candidatura), não cada render.
 *
 * @module features/hub-candidato/hooks/useCadastroCandidatoRh
 * @see src/features/hub-candidato/hooks/useHistoricoCandidatura.ts (molde)
 */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import {
  lerCadastroCandidatoRh,
  type CadastroCandidatoRh,
} from '../services/cadastroCandidatoRhService'

/** Namespace hierárquico das chaves. */
export const cadastroRhKeys = {
  all: ['hub-candidato', 'cadastro'] as const,
  porCandidatura: (id: string) => [...cadastroRhKeys.all, id] as const,
}

const CINCO_MIN = 5 * 60 * 1000

/**
 * Lê contato/cadastro/disponibilidade/inscrição de uma candidatura pelo caminho de servidor.
 * `candidaturaId` é o `:id` da rota do hub.
 */
export function useCadastroCandidatoRh(
  candidaturaId: string | undefined,
  options?: Omit<UseQueryOptions<CadastroCandidatoRh, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: cadastroRhKeys.porCandidatura(candidaturaId || ''),
    queryFn: () => lerCadastroCandidatoRh(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: CINCO_MIN,
    gcTime: CINCO_MIN,
    retry: 2,
    ...options,
  })
}
