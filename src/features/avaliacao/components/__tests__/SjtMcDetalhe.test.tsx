/**
 * Phase 52 / Plan 52-11 — `SjtMcDetalhe` (JORN-57 — D-21, D-37, UI-SPEC E6).
 *
 * O RH lê cada situação como o candidato a viu: o cenário, TODAS as alternativas na ordem neutra
 * do servidor (D-37) e a escolhida destacada — com a etiqueta pt-BR e o peso SÓ nela. O caso
 * perigoso é o gabarito: a fixture tem 4 alternativas com etiquetas distintas (cast, como se a rede
 * as trouxesse) e o DOM tem de ter EXATAMENTE UMA etiqueta (T-52-32).
 *
 * @see src/features/avaliacao/components/SjtMcDetalhe.tsx
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))
const lerSjtMcMock = vi.fn()
vi.mock('../../services/avaliacoesRhService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/avaliacoesRhService')>()
  return { ...actual, lerSjtMcRh: (...a: unknown[]) => lerSjtMcMock(...a) }
})

import { SjtMcDetalhe, COPY_SJT_MC_HUB, ROTULO_TAG_SJT } from '../SjtMcDetalhe'
import type { ScoreRow } from '../../services/scoresRhService'
import type { SjtMcRh } from '../../services/avaliacoesRhService'

function render(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return rtlRender(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

function linhaMc(over: Partial<Record<string, unknown>> = {}): ScoreRow {
  return {
    id: 'mc-1',
    tipo: 'sjt',
    subtipo: 'mc',
    pergunta_id: null,
    score: 8,
    score_max: 10,
    status: 'sucesso',
    metadata: { respostas: [{ pergunta_id: 'p-1', opcao_id: 'o-2', tag: 'pontua', peso: 2 }] },
    citacoes: null,
    red_flags: null,
    ...over,
  } as unknown as ScoreRow
}

/** 1 situação, 4 alternativas com etiquetas DISTINTAS (cast), escolhida a 2ª. */
const UM_ITEM = {
  situacao: 'disponivel',
  itens: [
    {
      pergunta_id: 'p-1',
      cenario: 'Uma paciente liga reclamando\ndo atraso.',
      alternativas: [
        { opcao_id: 'o-4', texto: 'Alternativa D', escolhida: false, tag: 'fortemente_pontua', peso: 3 },
        { opcao_id: 'o-2', texto: 'Alternativa B', escolhida: true, tag: 'pontua', peso: 2 },
        { opcao_id: 'o-1', texto: 'Alternativa A', escolhida: false, tag: 'atencao', peso: 0 },
        { opcao_id: 'o-3', texto: 'Alternativa C', escolhida: false, tag: 'knockout', peso: -5 },
      ],
      escolhida_tag: 'pontua',
      escolhida_peso: 2,
      escolhida_no_banco: true,
    },
  ],
} as unknown as SjtMcRh

beforeEach(() => {
  lerSjtMcMock.mockReset()
})

describe('SjtMcDetalhe — situação, alternativas em ordem neutra, escolhida (52-11 / D-21, D-37)', () => {
  it('populado: legenda da D-37, «Situação 1», cenário e as 4 alternativas na ordem do servidor', async () => {
    lerSjtMcMock.mockResolvedValue(UM_ITEM)
    render(<SjtMcDetalhe row={linhaMc()} candidaturaId="cand-1" />)
    const card = screen.getByTestId('sjt-mc-detalhe')
    expect(within(card).getByText('Múltipla escolha')).toBeInTheDocument()
    expect(await within(card).findByRole('heading', { name: 'Situação 1' })).toBeInTheDocument()
    expect(lerSjtMcMock).toHaveBeenCalledWith('cand-1')
    expect(within(card).getByText(COPY_SJT_MC_HUB.legenda)).toBeInTheDocument()
    expect(COPY_SJT_MC_HUB.legenda).toBe('Alternativas em ordem neutra — o candidato as viu embaralhadas.')
    const cenario = within(card).getByText(/Uma paciente liga/)
    expect(cenario.textContent).toBe('Uma paciente liga reclamando\ndo atraso.')
    expect(cenario.className).toContain('whitespace-pre-line')

    const itens = within(card).getAllByTestId('sjt-mc-alternativa')
    expect(itens.map((li) => li.querySelector('[data-texto]')?.textContent)).toEqual([
      'Alternativa D',
      'Alternativa B',
      'Alternativa A',
      'Alternativa C',
    ])
  })

  it('gabarito: EXATAMENTE UMA etiqueta no DOM (a da escolhida), uma «Escolhida» e «peso 2» só nela', async () => {
    lerSjtMcMock.mockResolvedValue(UM_ITEM)
    const { container } = render(<SjtMcDetalhe row={linhaMc()} candidaturaId="cand-1" />)
    await screen.findByRole('heading', { name: 'Situação 1' })

    const etiquetas = screen.getAllByTestId('sjt-mc-etiqueta')
    expect(etiquetas).toHaveLength(1)
    expect(etiquetas[0]).toHaveTextContent('Pontua')
    expect(screen.getAllByText('Escolhida')).toHaveLength(1)
    expect(screen.getAllByText('peso 2')).toHaveLength(1)

    // Nenhum outro rótulo pt-BR, nenhum código cru, nenhum outro peso.
    for (const rotulo of ['Pontua forte', 'Atenção', 'Eliminatória', 'Neutro']) {
      expect(screen.queryByText(rotulo)).toBeNull()
    }
    for (const codigo of Object.keys(ROTULO_TAG_SJT)) {
      expect(container.textContent).not.toContain(codigo)
    }
    expect(container.textContent).not.toMatch(/peso\s*(3|0|-5)/)

    // A escolhida carrega a etiqueta; as outras, não.
    const itens = screen.getAllByTestId('sjt-mc-alternativa')
    expect(within(itens[1]).getByTestId('sjt-mc-etiqueta')).toBeInTheDocument()
    for (const i of [0, 2, 3]) expect(within(itens[i]).queryByText('Escolhida')).toBeNull()
  })

  it('a escolhida tem borda e Check, sem accent; as demais são neutras', async () => {
    lerSjtMcMock.mockResolvedValue(UM_ITEM)
    const { container } = render(<SjtMcDetalhe row={linhaMc()} candidaturaId="cand-1" />)
    await screen.findByRole('heading', { name: 'Situação 1' })
    const itens = screen.getAllByTestId('sjt-mc-alternativa')
    expect(itens[1].className).toContain('border-white/40')
    expect(itens[1].className).toContain('bg-white/15')
    expect(itens[1].querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(itens[0].className).toContain('border-white/10')
    expect(itens[0].className).toContain('bg-transparent')
    expect(itens[0].querySelector('svg')).toBeNull()
    expect(container.innerHTML).not.toMatch(/35BFAD/i)
  })

  it('etiqueta em pt-BR pelo mapa; etiqueta desconhecida → o código', async () => {
    expect(ROTULO_TAG_SJT).toEqual({
      fortemente_pontua: 'Pontua forte',
      pontua: 'Pontua',
      neutro: 'Neutro',
      atencao: 'Atenção',
      knockout: 'Eliminatória',
    })
    lerSjtMcMock.mockResolvedValue({
      situacao: 'disponivel',
      itens: [{ ...UM_ITEM.itens[0], escolhida_tag: 'codigo_novo', escolhida_peso: 1 }],
    })
    render(<SjtMcDetalhe row={linhaMc()} candidaturaId="cand-1" />)
    expect(await screen.findByTestId('sjt-mc-etiqueta')).toHaveTextContent('codigo_novo')
  })

  it('alternativa escolhida fora do banco → a frase de alternativa sumida', async () => {
    lerSjtMcMock.mockResolvedValue({
      situacao: 'disponivel',
      itens: [
        {
          ...UM_ITEM.itens[0],
          alternativas: UM_ITEM.itens[0].alternativas.map((a) => ({ ...a, escolhida: false })),
          escolhida_no_banco: false,
        },
      ],
    })
    render(<SjtMcDetalhe row={linhaMc()} candidaturaId="cand-1" />)
    expect(await screen.findByText(COPY_SJT_MC_HUB.sumida)).toBeInTheDocument()
    expect(COPY_SJT_MC_HUB.sumida).toBe('A alternativa escolhida não está mais no banco de itens.')
    expect(screen.queryByText('Escolhida')).toBeNull()
  })

  it('linha «falhou»: «Pontuação indisponível» e as situações aparecem mesmo assim', async () => {
    lerSjtMcMock.mockResolvedValue(UM_ITEM)
    render(<SjtMcDetalhe row={linhaMc({ status: 'falhou', score: null })} candidaturaId="cand-1" />)
    expect(screen.getByText('Pontuação indisponível')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Situação 1' })).toBeInTheDocument()
  })

  it('erro da leitura: frase + «Recarregar situações»; a pontuação continua visível', async () => {
    lerSjtMcMock.mockRejectedValueOnce(new Error('falhou'))
    render(<SjtMcDetalhe row={linhaMc()} candidaturaId="cand-1" />)
    expect(await screen.findByText(COPY_SJT_MC_HUB.erro)).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    lerSjtMcMock.mockResolvedValue(UM_ITEM)
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar situações' }))
    expect(await screen.findByRole('heading', { name: 'Situação 1' })).toBeInTheDocument()
    expect(lerSjtMcMock).toHaveBeenCalledTimes(2)
  })

  it('carregando: skeleton por situação, cabeçalho e pontuação já visíveis', () => {
    lerSjtMcMock.mockReturnValue(new Promise(() => {}))
    render(
      <SjtMcDetalhe
        row={linhaMc({
          metadata: {
            respostas: [
              { pergunta_id: 'p-1', opcao_id: 'o-1', tag: 'pontua', peso: 2 },
              { pergunta_id: 'p-2', opcao_id: 'o-2', tag: 'neutro', peso: 1 },
            ],
          },
        })}
        candidaturaId="cand-1"
      />,
    )
    expect(screen.getAllByTestId('sjt-mc-carregando')).toHaveLength(2)
    expect(screen.getByText('Múltipla escolha')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('sem itens (linha de motor antigo): nenhuma legenda, nenhuma situação', async () => {
    lerSjtMcMock.mockResolvedValue({ situacao: 'disponivel', itens: [] })
    render(<SjtMcDetalhe row={linhaMc()} candidaturaId="cand-1" />)
    await screen.findByText('Múltipla escolha')
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText(COPY_SJT_MC_HUB.legenda)).toBeNull()
    expect(screen.queryByRole('heading', { name: /Situação/ })).toBeNull()
  })

  it('muitas situações: «Situação {n}» por item, sem frase de total fixo', async () => {
    const base = UM_ITEM.itens[0]
    lerSjtMcMock.mockResolvedValue({
      situacao: 'disponivel',
      itens: Array.from({ length: 6 }, (_, i) => ({ ...base, pergunta_id: `p-${i}` })),
    })
    render(<SjtMcDetalhe row={linhaMc()} candidaturaId="cand-1" />)
    expect(await screen.findByRole('heading', { name: 'Situação 6' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: /^Situação \d$/ })).toHaveLength(6)
    expect(screen.getAllByTestId('sjt-mc-etiqueta')).toHaveLength(6)
  })

  it('marcador de revisão humana quando passado (linha pendente)', async () => {
    lerSjtMcMock.mockResolvedValue(UM_ITEM)
    render(
      <SjtMcDetalhe
        row={linhaMc({ status: 'pendente_humano' })}
        candidaturaId="cand-1"
        marcadorRevisao={<span>Requer revisão humana</span>}
      />,
    )
    expect(screen.getByText('Requer revisão humana')).toBeInTheDocument()
  })
})
