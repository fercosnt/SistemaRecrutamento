/**
 * Phase 52 / Plan 52-02 (JORN-60 — D-24, D-36, D-52-U15) — `SairDaProvaButton`, o botão
 * de saída DURANTE a prova.
 *
 * Dois ramos, decididos pela tela que o monta:
 *  - `temRespostaNaoSalva=false` → navega direto (telas com rascunho, ou memória sem
 *    nenhuma resposta). Com `antesDeSair`, a navegação espera a Promise (o flush de
 *    desmontagem do `useAutosaveAvaliacao` é fogo-e-esquece; o de saída não pode ser).
 *  - `temRespostaNaoSalva=true` → confirmação de perda «Sair da avaliação?»; «Continuar»
 *    fecha sem navegar, «Sair» navega.
 *
 * Navegação REAL (MemoryRouter com rota-sentinela): prova-se a tela a que o clique chega.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '@testing-library/jest-dom'

import { SairDaProvaButton, COPY_SAIR_DA_PROVA } from '../SairDaProvaButton'

const DESTINO = '/candidato/avaliacao/CAND1'

function renderBotao(props: Partial<Parameters<typeof SairDaProvaButton>[0]> = {}) {
  return render(
    <MemoryRouter initialEntries={['/prova']}>
      <Routes>
        <Route
          path="/prova"
          element={
            <SairDaProvaButton
              rotulo="voltarAvaliacoes"
              destino={DESTINO}
              temRespostaNaoSalva={false}
              {...props}
            />
          }
        />
        <Route path="/candidato/avaliacao/:candidaturaId" element={<p>SENTINELA-LISTA</p>} />
        <Route path="/candidato/dashboard" element={<p>SENTINELA-PAINEL</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('COPY_SAIR_DA_PROVA — frases travadas (D-24 + D-52-U14)', () => {
  it('as seis frases, verbatim', () => {
    expect(COPY_SAIR_DA_PROVA).toEqual({
      voltarAvaliacoes: 'Voltar às avaliações',
      irAoPainel: 'Ir ao painel',
      titulo: 'Sair da avaliação?',
      corpo: 'Se sair agora, as respostas desta prova não serão salvas.',
      continuar: 'Continuar',
      sair: 'Sair',
    })
  })
})

describe('SairDaProvaButton', () => {
  it('rótulo e destino: «Voltar às avaliações» e «Ir ao painel»', () => {
    const { unmount } = renderBotao()
    expect(screen.getByTestId('sair-da-prova')).toHaveAccessibleName('Voltar às avaliações')
    unmount()
    renderBotao({ rotulo: 'irAoPainel', destino: '/candidato/dashboard' })
    expect(screen.getByTestId('sair-da-prova')).toHaveAccessibleName('Ir ao painel')
  })

  it('sem resposta não salva → navega direto, sem diálogo', async () => {
    renderBotao()
    fireEvent.click(screen.getByTestId('sair-da-prova'))
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('com resposta não salva → diálogo; «Continuar» fecha sem navegar', async () => {
    renderBotao({ temRespostaNaoSalva: true })
    fireEvent.click(screen.getByTestId('sair-da-prova'))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent(COPY_SAIR_DA_PROVA.titulo)
    expect(dialogo).toHaveTextContent(COPY_SAIR_DA_PROVA.corpo)

    // «Continuar» é o AlertDialogCancel — o Radix dá a ele o foco inicial.
    const continuar = screen.getByRole('button', { name: COPY_SAIR_DA_PROVA.continuar })
    await waitFor(() => expect(continuar).toHaveFocus())

    fireEvent.click(continuar)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(screen.queryByText('SENTINELA-LISTA')).toBeNull()
    expect(screen.getByTestId('sair-da-prova')).toBeInTheDocument()
  })

  it('com resposta não salva → «Sair» (destrutivo, #EF4444) navega ao destino', async () => {
    renderBotao({ temRespostaNaoSalva: true })
    fireEvent.click(screen.getByTestId('sair-da-prova'))
    const sair = await screen.findByRole('button', { name: COPY_SAIR_DA_PROVA.sair })
    expect(sair.className).toContain('bg-[#EF4444]')
    fireEvent.click(sair)
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
  })

  it('com antesDeSair → navega SÓ depois que a Promise resolve (ordem verificada)', async () => {
    const ordem: string[] = []
    let resolver: () => void = () => {}
    const antesDeSair = vi.fn(
      () =>
        new Promise<void>((r) => {
          ordem.push('flush:inicio')
          resolver = () => {
            ordem.push('flush:fim')
            r()
          }
        }),
    )
    renderBotao({ antesDeSair })

    fireEvent.click(screen.getByTestId('sair-da-prova'))
    await waitFor(() => expect(antesDeSair).toHaveBeenCalledTimes(1))
    // Flush pendente: ainda na prova.
    expect(screen.queryByText('SENTINELA-LISTA')).toBeNull()

    resolver()
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
    expect(ordem).toEqual(['flush:inicio', 'flush:fim'])
  })

  it('com antesDeSair que rejeita → navega mesmo assim (sair é navegação local)', async () => {
    const antesDeSair = vi.fn(() => Promise.reject(new Error('rede')))
    renderBotao({ antesDeSair })
    fireEvent.click(screen.getByTestId('sair-da-prova'))
    expect(await screen.findByText('SENTINELA-LISTA')).toBeInTheDocument()
    expect(antesDeSair).toHaveBeenCalledTimes(1)
  })
})
