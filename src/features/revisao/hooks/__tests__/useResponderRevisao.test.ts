/**
 * Phase 42 / Plano 42-10 Task 1 (TDD RED) — `useResponderRevisao` (REVISAO-03/05).
 *
 * ── A ASSERÇÃO MAIS IMPORTANTE DESTE PLANO ────────────────────────────────────────
 * O molde deste hook (`useRegistrarDecisao`) tem um `onError` de UMA linha: um
 * `toast.error` para qualquer erro. Copiá-lo verbatim aqui estaria ERRADO, e o erro
 * seria invisível — a tela funcionaria, o operador veria "algo deu errado", e o fato
 * específico ("você registrou esta decisão, então não pode respondê-la") sumiria em
 * ~4 segundos junto com o toast.
 *
 * Por isso existe aqui um teste que **falha se `GUARD_DECISOR` disparar toast**. A
 * recusa do guard é o único caso em que o hook fica calado de propósito: o diálogo
 * assume e renderiza o alerta inline destrutivo, que **permanece** na tela e **não**
 * oferece tentar de novo — porque tentar de novo nunca vai funcionar. A recusa é sobre
 * QUEM é o usuário, não sobre o estado do pedido.
 *
 * ── A INVALIDAÇÃO É PELA CHAVE RAIZ, DE PROPÓSITO ─────────────────────────────────
 * `revisoesKeys.all` cobre a lista **e** o contador da sidebar de uma vez. Invalidar só
 * `lists()` deixaria o badge do menu mostrando um pendente que acabou de ser respondido,
 * e o operador clicaria no menu para encontrar uma fila vazia.
 *
 * @see src/features/decisao/hooks/useRegistrarDecisao.ts (o molde, com o delta do onError)
 * @see src/features/triagem/hooks/__tests__/useRejeitarCandidatura.test.ts (o molde deste arquivo)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  responderRevisao: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

// O serviço é mockado por inteiro, mas `RevisaoError` é REAL: o predicado do `onError`
// é `error instanceof RevisaoError`, e um dublê quebraria justamente a asserção que
// este arquivo existe para fazer.
vi.mock('../../services/revisaoService', async () => {
  const real =
    await vi.importActual<typeof import('../../services/revisaoService')>(
      '../../services/revisaoService',
    )
  return { RevisaoError: real.RevisaoError, responderRevisao: mocks.responderRevisao }
})

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

import { useResponderRevisao } from '../useResponderRevisao'
import { revisoesKeys } from '../useFilaRevisoes'
import { RevisaoError } from '../../services/revisaoService'

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

const VARS = {
  candidaturaId: '55555555-5555-4555-8555-555555555555',
  veredito: 'mantida' as const,
  justificativa: 'Reexaminamos a avaliação comportamental e a decisão segue válida.',
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

describe('useResponderRevisao — sucesso', () => {
  it('encaminha as três variáveis ao serviço', async () => {
    mocks.responderRevisao.mockResolvedValue(undefined)
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mocks.responderRevisao).toHaveBeenCalledWith(VARS)
  })

  it('toasta a copy VERBATIM da UI-SPEC', async () => {
    mocks.responderRevisao.mockResolvedValue(undefined)
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'Resposta registrada. O candidato foi notificado.',
    )
  })

  it('invalida a CHAVE RAIZ — a lista e o contador da sidebar de uma vez', async () => {
    mocks.responderRevisao.mockResolvedValue(undefined)
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(spy).toHaveBeenCalledWith({ queryKey: revisoesKeys.all })
  })
})

describe('useResponderRevisao — a recusa do guard NÃO vira toast (REVISAO-05)', () => {
  it('`GUARD_DECISOR` → NENHUM toast é disparado (nem de erro, nem de sucesso)', async () => {
    mocks.responderRevisao.mockRejectedValue(
      new RevisaoError('recusado', 'GUARD_DECISOR'),
    )
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isError).toBe(true))

    // Se alguém copiar o `onError` de uma linha do molde, ESTA asserção quebra.
    expect(mocks.toastError).not.toHaveBeenCalled()
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('`GUARD_DECISOR` fica disponível em `error` para o diálogo renderizar o alerta inline', async () => {
    const recusa = new RevisaoError('recusado', 'GUARD_DECISOR')
    mocks.responderRevisao.mockRejectedValue(recusa)
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(recusa)
    expect((result.current.error as RevisaoError).code).toBe('GUARD_DECISOR')
  })

  it('`GUARD_DECISOR` NÃO invalida — nada mudou no servidor, não há o que revalidar', async () => {
    mocks.responderRevisao.mockRejectedValue(
      new RevisaoError('recusado', 'GUARD_DECISOR'),
    )
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('useResponderRevisao — os outros erros SIM viram toast', () => {
  it('`VALIDACAO` → toast de erro com a copy da UI-SPEC', async () => {
    mocks.responderRevisao.mockRejectedValue(new RevisaoError('inválido', 'VALIDACAO'))
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mocks.toastError).toHaveBeenCalledWith(
      'Não foi possível registrar a resposta. Tente novamente.',
    )
  })

  it('`DESCONHECIDO` → toast de erro', async () => {
    mocks.responderRevisao.mockRejectedValue(new RevisaoError('opaco', 'DESCONHECIDO'))
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mocks.toastError).toHaveBeenCalledTimes(1)
  })

  it('um `Error` cru (rede, bug) → toast de erro, sem quebrar o predicado do guard', async () => {
    mocks.responderRevisao.mockRejectedValue(new Error('rede caiu'))
    const { result } = renderHook(() => useResponderRevisao(), { wrapper })
    result.current.mutate(VARS)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mocks.toastError).toHaveBeenCalledTimes(1)
  })
})
