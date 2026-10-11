/// <reference types="@testing-library/jest-dom" />
/**
 * FormularioCandidaturaPage — o cartão de inscrição encerrada por knockout (52-06 · JORN-62 ·
 * achado do aceite 51-17).
 *
 * O defeito: o cartão usava a paleta de fundo CLARO (`text-gray-900/700/500`) sobre o VIDRO da
 * página (`GlassCard variant="white"` sobre o gradiente escuro) — «Agradecemos seu interesse…»
 * (`text-gray-500`) ficava praticamente ilegível. O conserto troca SÓ a cor (e o tamanho do `h1`,
 * 30px → 24px, o dos outros `h1` da página). O TEXTO é o da D-15 da 48, TRAVADO — este teste pina
 * as três frases inteiras, para que um conserto de cor não vire, por descuido, uma reescrita.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: {}, from: vi.fn(), storage: { from: vi.fn() }, rpc: vi.fn() },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

import { CartaoInscricaoEncerrada } from '../FormularioCandidaturaPage'

const TITULO = 'Inscrição recebida'
const CORPO =
  'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.'
const AGRADECEMOS = 'Agradecemos seu interesse na Beauty Smile.'

function renderCartao() {
  return render(
    <MemoryRouter>
      <CartaoInscricaoEncerrada />
    </MemoryRouter>,
  )
}

describe('CartaoInscricaoEncerrada — legível no vidro, texto da D-15 intacto (52-06)', () => {
  beforeEach(() => {
    mocks.navigateMock.mockClear()
  })

  it('(a) título 24px branco (text-2xl font-semibold text-white), não mais 30px cinza', () => {
    renderCartao()
    const h1 = screen.getByRole('heading', { level: 1, name: TITULO })
    expect(h1.className).toContain('text-2xl')
    expect(h1.className).toContain('font-semibold')
    expect(h1.className).toContain('text-white')
    expect(h1.className).not.toContain('text-3xl')
  })

  it('(b) corpo text-white/80 e «Agradecemos…» text-white/70', () => {
    renderCartao()
    expect(screen.getByText(CORPO).className).toContain('text-white/80')
    expect(screen.getByText(AGRADECEMOS).className).toContain('text-white/70')
  })

  it('(c) ⊖ nenhuma classe text-gray- no cartão inteiro', () => {
    const { container } = renderCartao()
    const comCinza = Array.from(container.querySelectorAll('*')).filter((el) =>
      /(^|\s)text-gray-/.test(el.getAttribute('class') ?? ''),
    )
    expect(comCinza).toHaveLength(0)
  })

  it('(d) o texto é o de antes, frase por frase (D-15 da 48, travado)', () => {
    renderCartao()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(TITULO)
    expect(screen.getByText(CORPO).textContent).toBe(CORPO)
    expect(screen.getByText(AGRADECEMOS).textContent).toBe(AGRADECEMOS)
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument()
  })

  it('(e) «Voltar» leva ao painel, como antes', () => {
    renderCartao()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(mocks.navigateMock).toHaveBeenCalledWith('/candidato/dashboard', { replace: true })
  })
})
