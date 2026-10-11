/**
 * Phase 52 / Plan 52-11 — `BigFiveResultadoHub` (JORN-56 — D-01..D-07, UI-SPEC E5).
 *
 * O hub mostra a faixa que o candidato viu, com o aviso fixo e o texto recolhível — e NENHUM
 * número da escala: a dimensão montada com um campo numérico extra (cast, como se a rede o
 * trouxesse) não deixa o dígito chegar ao DOM (T-52-31, UX-07). Sem devolutiva, nenhuma faixa.
 *
 * @see src/features/avaliacao/components/BigFiveResultadoHub.tsx
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))
const lerDevolutivaMock = vi.fn()
vi.mock('../../services/avaliacoesRhService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/avaliacoesRhService')>()
  return { ...actual, lerDevolutivaBigFiveRh: (...a: unknown[]) => lerDevolutivaMock(...a) }
})

import { BigFiveResultadoHub, COPY_BIG_FIVE_HUB } from '../BigFiveResultadoHub'
import type { DevolutivaRh } from '../../services/avaliacoesRhService'

function render(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return rtlRender(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

/** Cinco dimensões fora de ordem, cada uma com um número extra que o tipo não tem. */
const DISPONIVEL = {
  situacao: 'disponivel',
  dimensoes: [
    { dim: 'N', banda: 'muito_baixo', texto_interpretativo: 'Texto N.', percentil: 87 },
    { dim: 'O', banda: 'muito_alto', texto_interpretativo: 'Texto O\nsegunda linha.', percentil: 87 },
    { dim: 'C', banda: 'medio', texto_interpretativo: 'Texto C.', percentil: 87 },
    { dim: 'E', banda: 'mod_baixo', texto_interpretativo: 'Texto E.', percentil: 87 },
    { dim: 'A', banda: 'mod_alto', texto_interpretativo: 'Texto A.', percentil: 87 },
  ],
  disclaimer_emocional: 'Este perfil descreve preferências.',
  disclaimer_lgpd_crp: 'Rodapé como veio.',
} as unknown as DevolutivaRh

beforeEach(() => {
  lerDevolutivaMock.mockReset()
})

describe('BigFiveResultadoHub — faixas, aviso fixo, devolutiva recolhível (52-11 / D-01..D-07)', () => {
  it('disponível: aviso fixo, 5 faixas na ordem O C E A N e «Ver devolutiva» fechado', async () => {
    lerDevolutivaMock.mockResolvedValue(DISPONIVEL)
    render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive />)
    const card = screen.getByTestId('hub-bigfive-resultado')
    expect(within(card).getByText('Big Five')).toBeInTheDocument()
    expect(within(card).getByText(COPY_BIG_FIVE_HUB.selo)).toBeInTheDocument()
    expect(within(card).getByText(COPY_BIG_FIVE_HUB.aviso)).toBeInTheDocument()
    expect(COPY_BIG_FIVE_HUB.aviso).toBe(
      'Perfil comportamental autodeclarado: descreve, não classifica. Não é critério de aprovação nem de rejeição.',
    )

    const botao = await screen.findByRole('button', { name: 'Ver devolutiva' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(lerDevolutivaMock).toHaveBeenCalledWith('cand-1')

    const rotulos = within(card)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(rotulos).toEqual([
      'Abertura à ExperiênciaMuito alto',
      'ConscienciosidadeMédio',
      'ExtroversãoModeradamente baixo',
      'AmabilidadeModeradamente alto',
      'Sensibilidade EmocionalMuito baixo',
    ])
    // Fechado: o texto da devolutiva não está montado.
    expect(screen.queryByText(COPY_BIG_FIVE_HUB.textoRecebido)).toBeNull()
    expect(screen.queryByText('Texto C.')).toBeNull()
  })

  it('clique: abre o texto que o candidato recebeu, com os avisos como vieram; clique de novo fecha', async () => {
    lerDevolutivaMock.mockResolvedValue(DISPONIVEL)
    render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive />)
    const botao = await screen.findByRole('button', { name: 'Ver devolutiva' })
    fireEvent.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(botao).toHaveTextContent('Ocultar devolutiva')
    const regiao = document.getElementById(botao.getAttribute('aria-controls')!)!
    expect(within(regiao).getByText(COPY_BIG_FIVE_HUB.textoRecebido)).toBeInTheDocument()
    expect(within(regiao).getByText('Este perfil descreve preferências.')).toBeInTheDocument()
    expect(within(regiao).getByText('Rodapé como veio.')).toBeInTheDocument()
    expect(within(regiao).getByText('Abertura à Experiência: Muito alto')).toBeInTheDocument()
    expect(
      within(regiao).getByText('Você se descreveu com um nível muito alto de abertura à experiência.'),
    ).toBeInTheDocument()
    const textoO = within(regiao).getByText(/Texto O/)
    expect(textoO.textContent).toBe('Texto O\nsegunda linha.')
    expect(textoO.className).toContain('whitespace-pre-line')
    // Sem abas internas (D-18).
    expect(within(regiao).queryByRole('tab')).toBeNull()

    fireEvent.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(COPY_BIG_FIVE_HUB.textoRecebido)).toBeNull()
  })

  it('número extra da escala (cast) NÃO chega ao DOM — nem fechado, nem aberto (UX-07)', async () => {
    lerDevolutivaMock.mockResolvedValue(DISPONIVEL)
    const { container } = render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive />)
    const botao = await screen.findByRole('button', { name: 'Ver devolutiva' })
    expect(container.textContent).not.toContain('87')
    fireEvent.click(botao)
    expect(screen.getByText(COPY_BIG_FIVE_HUB.textoRecebido)).toBeInTheDocument()
    expect(container.textContent).not.toContain('87')
    expect(container.textContent).not.toMatch(/\d/)
  })

  it('devolutiva com menos de 5 dimensões: só as presentes, na ordem, sem placeholder', async () => {
    lerDevolutivaMock.mockResolvedValue({
      situacao: 'disponivel',
      dimensoes: [
        { dim: 'A', banda: 'medio', texto_interpretativo: 'a' },
        { dim: 'O', banda: 'medio', texto_interpretativo: 'o' },
      ],
      disclaimer_emocional: null,
      disclaimer_lgpd_crp: null,
    } satisfies DevolutivaRh)
    render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive />)
    await screen.findByRole('button', { name: 'Ver devolutiva' })
    const card = screen.getByTestId('hub-bigfive-resultado')
    expect(within(card).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Abertura à ExperiênciaMédio',
      'AmabilidadeMédio',
    ])
  })

  it('sem devolutiva: a frase de indisponível, nenhuma faixa, nenhum botão', async () => {
    lerDevolutivaMock.mockResolvedValue({
      situacao: 'sem_devolutiva',
      dimensoes: [],
      disclaimer_emocional: null,
      disclaimer_lgpd_crp: null,
    } satisfies DevolutivaRh)
    render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive />)
    expect(await screen.findByText(COPY_BIG_FIVE_HUB.semDevolutiva)).toBeInTheDocument()
    expect(COPY_BIG_FIVE_HUB.semDevolutiva).toBe(
      'Big Five respondido. A devolutiva não está disponível, por isso as faixas não são mostradas.',
    )
    expect(screen.queryByRole('listitem')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(COPY_BIG_FIVE_HUB.aviso)).toBeInTheDocument()
  })

  it('sem linha big_five: «Big Five — Não fez» e nada mais — nenhuma leitura', () => {
    render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive={false} />)
    expect(screen.getByText('Big Five — Não fez')).toBeInTheDocument()
    expect(screen.queryByText(COPY_BIG_FIVE_HUB.aviso)).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(lerDevolutivaMock).not.toHaveBeenCalled()
  })

  it('carregando: skeleton no lugar das faixas, aviso fixo visível', () => {
    lerDevolutivaMock.mockReturnValue(new Promise(() => {}))
    render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive />)
    expect(screen.getByTestId('hub-bigfive-carregando')).toBeInTheDocument()
    expect(screen.getByText(COPY_BIG_FIVE_HUB.aviso)).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('erro: frase + «Recarregar devolutiva» que lê de novo; o aviso fixo continua visível', async () => {
    lerDevolutivaMock.mockRejectedValueOnce(new Error('falhou'))
    render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive />)
    expect(await screen.findByText(COPY_BIG_FIVE_HUB.erro)).toBeInTheDocument()
    expect(screen.getByText(COPY_BIG_FIVE_HUB.aviso)).toBeInTheDocument()
    lerDevolutivaMock.mockResolvedValue(DISPONIVEL)
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar devolutiva' }))
    expect(await screen.findByRole('button', { name: 'Ver devolutiva' })).toBeInTheDocument()
    expect(lerDevolutivaMock).toHaveBeenCalledTimes(2)
  })

  it('nada de sugestão da IA nem de accent no card (D-52-U06; uma faixa turquesa leria como «bom»)', async () => {
    lerDevolutivaMock.mockResolvedValue(DISPONIVEL)
    const { container } = render(<BigFiveResultadoHub candidaturaId="cand-1" temLinhaBigFive />)
    await screen.findByRole('button', { name: 'Ver devolutiva' })
    expect(screen.queryByText(/Sugestão/i)).toBeNull()
    expect(container.innerHTML).not.toMatch(/35BFAD/i)
  })
})
