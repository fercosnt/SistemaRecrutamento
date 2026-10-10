/**
 * Phase 49 / Plan 49-04 Task 3 (JORN-40 / D-64) — o bloco cognitivo do hub mostra FAIXA.
 *
 * O que estes testes travam: o hub exibia ao RH o **percentil numérico** («Percentil 12»)
 * e a **contagem bruta de acertos** («8 de 60»). Os dois são números que se leem como nota,
 * na tela de um instrumento que não compõe o score da vaga e não rejeita ninguém (UX-07,
 * RNF-07a). E o card da lista, na mesma sessão, já mostrava faixa — duas telas, dois
 * vocabulários, e o do hub contradizia a regra.
 *
 * A asserção que importa é NEGATIVA e por FORMA: nenhum dígito de percentil, nenhum «de 60»,
 * nenhuma palavra «Percentil» no DOM. Um teste que só conferisse a presença da faixa passaria
 * com o percentil ainda ao lado dela.
 *
 * ⚠ O «Tempo» FICA: minutos decorridos não são nota, e o tempo de aplicação é o dado
 * operacional de uma prova presencial. Por isso a asserção de dígitos é por limite de
 * palavra (`\b12\b`), não «nenhum dígito no bloco» — que reprovaria o tempo.
 *
 * @see src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx
 * @see src/lib/cognitivo/cognitivoBanda.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const useLiberacaoCognitivo = vi.fn()

vi.mock('../../hooks/useLiberacaoCognitivo', () => ({
  useLiberacaoCognitivo: (id: string) => useLiberacaoCognitivo(id),
  useLiberarCognitivo: () => ({ mutate: vi.fn(), isPending: false }),
  useRevogarCognitivo: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { LiberacaoCognitivoBlock } from '../LiberacaoCognitivoBlock'

/** O resultado medido em PROD (a única linha de `scores_raven`, percentil baixo). */
const RESULTADO_INFERIOR = {
  percentil: 12,
  classificacao: 'Inferior',
  total_acertos: 8,
  tempo_total_segundos: 900,
}

function montar(data: unknown) {
  useLiberacaoCognitivo.mockReturnValue({ data, isLoading: false })
  return render(<LiberacaoCognitivoBlock candidaturaId="cand-1" />)
}

describe('LiberacaoCognitivoBlock — faixa, nunca percentil nem acertos (49-04 / JORN-40)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resultado concluído → mostra a faixa e NÃO mostra percentil, acertos nem «de 60»', () => {
    const { container } = montar({
      liberado: true,
      liberado_em: '2026-09-01T12:00:00Z',
      revogado_em: null,
      concluido: true,
      resultado: RESULTADO_INFERIOR,
    })

    // A faixa, pelo mesmo vocabulário do card da lista.
    expect(screen.getByTestId('cognitivo-banda-rh')).toHaveTextContent(
      'Abaixo do esperado'
    )

    const texto = container.textContent ?? ''
    // Os três números crus que saíram da tela.
    expect(texto).not.toMatch(/\b12\b/) // o percentil
    expect(texto).not.toMatch(/\b8\b/) // os acertos
    expect(texto).not.toMatch(/de 60/) // o total do instrumento
    expect(texto).not.toMatch(/Percentil/i)
    // A classificação por extenso do instrumento não é o vocabulário do RH.
    expect(texto).not.toMatch(/Inferior/)

    // O tempo FICA — não é nota.
    expect(texto).toMatch(/15min 00s/)
  })

  it('sem resultado → o bloco não quebra e não mostra faixa', () => {
    montar({
      liberado: true,
      liberado_em: '2026-09-01T12:00:00Z',
      revogado_em: null,
      concluido: false,
      resultado: null,
    })

    expect(screen.queryByTestId('cognitivo-banda-rh')).toBeNull()
    expect(screen.getByText(/aguardando o candidato/i)).toBeInTheDocument()
  })

  it('concluído com percentil NULO → nenhuma faixa inventada (ausência não vira faixa)', () => {
    const { container } = montar({
      liberado: true,
      liberado_em: '2026-09-01T12:00:00Z',
      revogado_em: null,
      concluido: true,
      resultado: { ...RESULTADO_INFERIOR, percentil: null },
    })

    expect(screen.queryByTestId('cognitivo-banda-rh')).toBeNull()
    // E o «Abaixo do esperado» não aparece por default — percentil ausente não é
    // percentil baixo. Era essa a forma do defeito original, em outra célula.
    expect(container.textContent ?? '').not.toMatch(/Abaixo do esperado/)
  })
})

/**
 * Validação Nyquist da 51 (JORN-48 / D-15) — o bloco do Raven no hub DIZ, na tela renderizada,
 * «Raciocínio lógico (Matrizes)», e nunca o nome do instrumento textual nem o nome aposentado.
 *
 * Por que um teste de render, se o guarda `nomes-instrumentos.grep.test.ts` (ii) já lista este
 * arquivo: o (ii) é estático e o seu filtro de comentário (`^\s*(//|\*|/\*)`) não reconhece a
 * linha de comentário JSX (a que abre com chave e barra-asterisco). A linha 71 do componente é
 * um comentário JSX que contém o nome novo: com o `<p>` do título trocado por um nome que não é
 * aposentado (medido: «Avaliação do Raven»), o (i) e o (ii) continuam verdes. E o teste do hub
 * (`hubEmptyState.test.tsx`) mocka este bloco como `null` — nenhum teste via o título.
 * O defeito do JORN-48 era exatamente o que o RH LÊ: «Avaliação Cognitiva» logo acima de
 * «Avaliação de raciocínio». Mordida provada contra `refs/gsd/51-03/base` (cca99243).
 */
describe('LiberacaoCognitivoBlock — o Raven se chama «Raciocínio lógico (Matrizes)» na tela (JORN-48 / D-15)', () => {
  beforeEach(() => vi.clearAllMocks())

  const ESTADOS: [string, unknown][] = [
    ['não liberado', { liberado: false, liberado_em: null, revogado_em: null, concluido: false, resultado: null }],
    ['liberado, aguardando', { liberado: true, liberado_em: '2026-09-01T12:00:00Z', revogado_em: null, concluido: false, resultado: null }],
    ['concluído', { liberado: true, liberado_em: '2026-09-01T12:00:00Z', revogado_em: null, concluido: true, resultado: RESULTADO_INFERIOR }],
  ]

  it.each(ESTADOS)('%s → o título visível é «Raciocínio lógico (Matrizes)», distinto de «Prova cognitiva»', (_rotulo, data) => {
    const { container } = montar(data)

    expect(screen.getByText('Raciocínio lógico (Matrizes)')).toBeInTheDocument()

    const texto = container.textContent ?? ''
    // Nada que confunda com o instrumento textual, que no hub se chama «Prova cognitiva».
    expect(texto).not.toMatch(/Prova cognitiva/i)
    // Nem os nomes aposentados (o de antes da 51-03 era «Avaliação de raciocínio»).
    expect(texto).not.toMatch(/Avaliação (de raciocínio|cognitiva)/i)
  })
})
