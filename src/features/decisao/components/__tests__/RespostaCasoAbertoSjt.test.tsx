/**
 * 49-44 / WR-07 — o RH lê, sob demanda, o texto que o candidato gravou na resposta do caso
 * aberto da SJT. Fechado, nada é buscado; o clique busca uma vez e mostra o texto.
 *
 * @see src/features/decisao/components/RespostaCasoAbertoSjt.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/features/avaliacao/services/scoresRhService', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/features/avaliacao/services/scoresRhService')>()
  return { ...real, getRespostaCasoAbertoSjt: vi.fn() }
})

import { RespostaCasoAbertoSjt } from '../RespostaCasoAbertoSjt'
import { getRespostaCasoAbertoSjt } from '@/features/avaliacao/services/scoresRhService'

const TEXTO = 'Primeiro eu ouviria a paciente.\nDepois explicaria o protocolo de biossegurança.'

function renderComQuery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RespostaCasoAbertoSjt candidaturaId="cand-1" />
    </QueryClientProvider>,
  )
}

describe('RespostaCasoAbertoSjt — leitura sob demanda (49-44 / WR-07)', () => {
  beforeEach(() => {
    vi.mocked(getRespostaCasoAbertoSjt).mockReset()
  })

  it('fechado por padrão: o serviço NÃO é chamado', () => {
    renderComQuery()
    expect(screen.getByTestId('decisao-sjt-resposta-caso-aberto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ler a resposta do caso aberto' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(getRespostaCasoAbertoSjt).not.toHaveBeenCalled()
  })

  it('depois do clique, o serviço é chamado uma vez com o id e o texto aparece', async () => {
    vi.mocked(getRespostaCasoAbertoSjt).mockResolvedValue({ situacao: 'disponivel', texto: TEXTO })
    const user = userEvent.setup()
    renderComQuery()

    await user.click(screen.getByRole('button', { name: 'Ler a resposta do caso aberto' }))

    const texto = await screen.findByText(/Primeiro eu ouviria a paciente\./)
    expect(texto.textContent).toBe(TEXTO)
    expect(getRespostaCasoAbertoSjt).toHaveBeenCalledTimes(1)
    expect(getRespostaCasoAbertoSjt).toHaveBeenCalledWith('cand-1')
  })
})
