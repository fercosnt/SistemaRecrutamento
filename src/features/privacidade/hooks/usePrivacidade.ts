/**
 * usePrivacidade — as duas leituras own-row de `/candidato/privacidade`.
 *
 * Chaves hierárquicas (`privacidadeKeys.*`), no idioma de `explicacaoKeys`. A leitura de
 * autorizações e a leitura de "há currículo?" são queries SEPARADAS de propósito: a
 * segunda existe só para escolher entre os três casos do bloco de guarda, e amarrá-las
 * numa só faria uma falha de candidaturas derrubar a lista de autorizações, que é a
 * âncora da tela.
 *
 * @module features/privacidade/hooks/usePrivacidade
 * @see src/features/explicacao/hooks/useExplicacao.ts (o molde de chave + useQuery)
 */
import { useQuery } from '@tanstack/react-query'
import {
  obterAutorizacoes,
  obterGuardaCurriculo,
  type AutorizacoesCandidato,
  type GuardaCurriculo,
} from '../services/privacidadeService'

export type { AutorizacoesCandidato, GuardaCurriculo }

/** Chaves hierárquicas da superfície de privacidade do candidato. */
export const privacidadeKeys = {
  all: ['privacidade'] as const,
  autorizacoes: (candidatoId: string | undefined) =>
    [...privacidadeKeys.all, 'autorizacoes', candidatoId] as const,
  curriculo: (candidatoId: string | undefined) =>
    [...privacidadeKeys.all, 'curriculo', candidatoId] as const,
  /**
   * O estado do cooldown do pedido de cópia (44-06). Entra AQUI, na fábrica que já
   * existe, e não numa fábrica nova: duas fábricas na mesma feature é o começo de
   * duas convenções de invalidação, e a segunda sempre esquece um consumidor.
   */
  ultimoPedido: (candidatoId: string | undefined) =>
    [...privacidadeKeys.all, 'ultimo-pedido', candidatoId] as const,
  /**
   * A LISTA de currículos por candidatura (44-07). ⚠ Deliberadamente **não** reusa
   * nem encosta em `curriculo` acima: aquela é a leitura booleana da seção 2 ("existe
   * currículo?"), e compartilhar a chave faria uma invalidação derrubar a outra. O
   * nome longo é proposital — duas chaves que diferissem por uma letra seriam um erro
   * de digitação a caminho.
   */
  curriculosPorCandidatura: (candidatoId: string | undefined) =>
    [...privacidadeKeys.all, 'curriculos-por-candidatura', candidatoId] as const,
}

/** Lê a linha de autorizações MAIS RECENTE do próprio candidato (own-row, allowlist). */
export function usePrivacidade(candidatoId: string | undefined) {
  return useQuery<AutorizacoesCandidato | null>({
    queryKey: privacidadeKeys.autorizacoes(candidatoId),
    queryFn: () => obterAutorizacoes(candidatoId as string),
    enabled: Boolean(candidatoId),
  })
}

/** Lê apenas SE existe currículo guardado — nunca a URL, nunca o arquivo. */
export function useGuardaCurriculo(candidatoId: string | undefined) {
  return useQuery<GuardaCurriculo>({
    queryKey: privacidadeKeys.curriculo(candidatoId),
    queryFn: () => obterGuardaCurriculo(candidatoId as string),
    enabled: Boolean(candidatoId),
  })
}
