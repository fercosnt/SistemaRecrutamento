/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 43 / Plano 43-09 Task 3 — `PreviaRetencaoBloco` (RETEN-04).
 *
 * A prévia responde "quantos seriam afetados" **sem que nada seja afetado**. Esta suíte
 * prende as três regras substantivas da 43-UI-SPEC e, principalmente, o **backstop E8**.
 *
 * ── O BACKSTOP E8: POR QUE A ASSERÇÃO É ESTRUTURAL ─────────────────────────────
 * O risco real deste bloco não é comprimento de texto — é a **prévia parecer acionável**.
 * Por isso a asserção varre a ÁRVORE (nenhum `<button>`, nenhum `<a>` descendente) em vez
 * de olhar o texto visível: nenhuma asserção sobre copy pegaria um botão "Executar agora"
 * acrescentado aqui daqui a seis meses.
 *
 * ⚠ ESCOPO EXPLÍCITO DA ASSERÇÃO — ela vale para os estados **populado** e **zero**, e
 * **não** para o estado de ERRO, que legitimamente carrega o botão "Tentar novamente" que
 * a própria UI-SPEC especifica. Sem esse recorte o teste reprovaria a copy que a spec manda
 * escrever — e um teste que reprova o comportamento correto é pior que teste nenhum,
 * porque treina quem executa a desligá-lo. É a mesma lição que o portão de copy do 43-02
 * já registrou sobre o escopo do grep.
 *
 * ── O ESTADO ZERO É A RESPOSTA CERTA, MEDIDA EM PROD ───────────────────────────
 * No 43-07 mediu-se: **zero candidaturas além da janela**. A matriz está semeada em 24
 * meses e o sistema é mais novo que isso. O zero desta tela não é bug nem carregamento.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 *      (§Prévia read-only + a emenda registrada do plano 43-06 · §UI Considerations E8)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'

const usePreviaMock = vi.fn()

vi.mock('../../hooks/usePreviaRetencao', () => ({
  usePreviaRetencao: (...args: unknown[]) => usePreviaMock(...args),
}))

import { PreviaRetencaoBloco } from '../PreviaRetencaoBloco'
import type { PreviaRetencao } from '../../services/retencaoService'

const CALCULADA_EM = '2026-08-02T14:35:00'

function previa(over: Partial<PreviaRetencao> = {}): PreviaRetencao {
  return {
    linhas: [
      { etapa: 'triagem', candidaturas_afetadas: 3, candidatos_afetados: 2 },
      { etapa: 'rejeitado', candidaturas_afetadas: 12, candidatos_afetados: 9 },
    ],
    total: 10,
    calculadaEm: CALCULADA_EM,
    ...over,
  }
}

function estado(over: Record<string, unknown> = {}) {
  return {
    data: previa(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
    ...over,
  }
}

/** Os verbos destrutivos, montados em runtime (idioma do 42-11). */
const VERBOS_DESTRUTIVOS = [
  ['purg', 'ar'],
  ['apag', 'ar'],
  ['exclu', 'ir'],
  ['delet', 'ar'],
  ['limp', 'ar'],
  ['execut', 'ar'],
  ['elimin', 'ar'],
  ['aplic', 'ar agora'],
].map((p) => p.join(''))

beforeEach(() => {
  usePreviaMock.mockReset()
  usePreviaMock.mockReturnValue(estado())
})

describe('PreviaRetencaoBloco — populado', () => {
  it('título e corpo verbatim, com a declaração de que a prévia não executa nada', () => {
    render(<PreviaRetencaoBloco />)
    expect(screen.getByText('Prévia — quantos seriam afetados')).toBeInTheDocument()
    expect(screen.getByText('Esta prévia não executa nada.')).toBeInTheDocument()
  })

  it('a linha por estado conta CANDIDATURAS (emenda 43-06) e o total conta CANDIDATOS', () => {
    render(<PreviaRetencaoBloco />)

    expect(screen.getByText(/3 candidaturas/)).toBeInTheDocument()
    expect(screen.getByText(/12 candidaturas/)).toBeInTheDocument()
    expect(screen.getByText('Triagem')).toBeInTheDocument()
    expect(screen.getByText('Rejeitado')).toBeInTheDocument()
    expect(screen.getByText('Total: 10 candidatos')).toBeInTheDocument()
  })

  it('o total NÃO é a soma das linhas — e a tela não tenta "corrigir" a diferença', () => {
    render(<PreviaRetencaoBloco />)
    // 3 + 12 = 15 linhas de candidatura; 10 candidatos. A desigualdade é contrato.
    expect(screen.queryByText('Total: 15 candidatos')).not.toBeInTheDocument()
    expect(screen.getByText('Total: 10 candidatos')).toBeInTheDocument()
  })

  it('o carimbo de data vem do SERVIDOR e é obrigatório', () => {
    render(<PreviaRetencaoBloco />)
    expect(screen.getByText(/Prévia calculada em 02\/08\/2026 às 14:35\./)).toBeInTheDocument()
  })

  it('contagem acima de 999 usa separador pt-BR; até 999 é inteiro puro', () => {
    usePreviaMock.mockReturnValue(
      estado({
        data: previa({
          linhas: [
            { etapa: 'triagem', candidaturas_afetadas: 999, candidatos_afetados: 999 },
            { etapa: 'rejeitado', candidaturas_afetadas: 1234, candidatos_afetados: 1000 },
          ],
          total: 1234,
        }),
      }),
    )
    render(<PreviaRetencaoBloco />)
    expect(screen.getByText(/999 candidaturas/)).toBeInTheDocument()
    expect(screen.getByText(/1\.234 candidaturas/)).toBeInTheDocument()
    expect(screen.getByText('Total: 1.234 candidatos')).toBeInTheDocument()
  })
})

describe('PreviaRetencaoBloco — o estado ZERO é a resposta certa (medida em PROD)', () => {
  it('zero mostra a copy própria, e NÃO um vazio genérico nem um esqueleto', () => {
    usePreviaMock.mockReturnValue(
      estado({ data: previa({ linhas: [], total: 0 }) }),
    )
    const { container } = render(<PreviaRetencaoBloco />)

    expect(
      screen.getByText('Nenhum candidato seria afetado por esta janela hoje.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nada para mostrar ainda')).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
  })

  it('o carimbo aparece TAMBÉM no zero — um zero sem data também envelhece', () => {
    usePreviaMock.mockReturnValue(estado({ data: previa({ linhas: [], total: 0 }) }))
    render(<PreviaRetencaoBloco />)
    expect(screen.getByText(/Prévia calculada em 02\/08\/2026 às 14:35\./)).toBeInTheDocument()
  })

  it('sem carimbo do servidor, nenhuma data é inventada', () => {
    usePreviaMock.mockReturnValue(
      estado({ data: previa({ linhas: [], total: 0, calculadaEm: null }) }),
    )
    render(<PreviaRetencaoBloco />)
    expect(screen.queryByText(/Prévia calculada em/)).not.toBeInTheDocument()
  })
})

describe('PreviaRetencaoBloco — BACKSTOP E8 (asserção negativa ESTRUTURAL)', () => {
  it('estado POPULADO: nenhum descendente é <button> ou <a>', () => {
    const { container } = render(<PreviaRetencaoBloco />)
    const bloco = container.querySelector('section')
    expect(bloco).not.toBeNull()
    expect(within(bloco as HTMLElement).queryAllByRole('button')).toHaveLength(0)
    expect((bloco as HTMLElement).querySelectorAll('button, a')).toHaveLength(0)
  })

  it('estado ZERO: nenhum descendente é <button> ou <a>', () => {
    usePreviaMock.mockReturnValue(estado({ data: previa({ linhas: [], total: 0 }) }))
    const { container } = render(<PreviaRetencaoBloco />)
    const bloco = container.querySelector('section') as HTMLElement
    expect(bloco.querySelectorAll('button, a')).toHaveLength(0)
  })

  it('estados POPULADO e ZERO: nenhum verbo destrutivo no texto do bloco', () => {
    for (const dados of [previa(), previa({ linhas: [], total: 0 })]) {
      usePreviaMock.mockReturnValue(estado({ data: dados }))
      const { container, unmount } = render(<PreviaRetencaoBloco />)
      const texto = (container.textContent ?? '').toLowerCase()
      for (const verbo of VERBOS_DESTRUTIVOS) {
        expect(texto.includes(verbo), `verbo destrutivo no bloco: "${verbo}"`).toBe(false)
      }
      unmount()
    }
  })

  it('o ESCOPO da asserção é explícito: o estado de ERRO carrega "Tentar novamente" e isso é CORRETO', () => {
    usePreviaMock.mockReturnValue(estado({ data: undefined, isError: true }))
    const { container } = render(<PreviaRetencaoBloco />)

    expect(screen.getByText('Não foi possível calcular a prévia.')).toBeInTheDocument()
    expect(
      screen.getByText('A matriz acima continua legível e editável.'),
    ).toBeInTheDocument()
    // O botão EXISTE aqui — e é o único caso em que existe. Sem este recorte, a asserção
    // dos dois testes acima reprovaria a copy que a própria UI-SPEC manda escrever.
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument()
    expect(container.querySelectorAll('button')).toHaveLength(1)
  })

  it('erro não inventa números: nenhuma contagem e nenhum carimbo aparecem', () => {
    usePreviaMock.mockReturnValue(estado({ data: undefined, isError: true }))
    render(<PreviaRetencaoBloco />)
    expect(screen.queryByText(/candidaturas/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Total:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Prévia calculada em/)).not.toBeInTheDocument()
  })
})
