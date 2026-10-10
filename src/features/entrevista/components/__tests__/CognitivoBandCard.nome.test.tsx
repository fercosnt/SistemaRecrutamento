/**
 * Validação Nyquist da 51 (JORN-48 / D-15) — o card da banda cognitiva do workspace de
 * entrevista nomeia o instrumento TEXTUAL como «Prova cognitiva».
 *
 * Antes da 51-03 o título deste card era «Raciocínio lógico» — o nome que, depois do D-15, é o
 * do Raven. Era a confusão do JORN-48 na direção inversa: a banda da prova textual com o nome do
 * outro instrumento. Nenhum teste fixava o título (51-03-SUMMARY, coverage D5,
 * `human_judgment: true`), e este arquivo não está na lista (ii) do guarda
 * `nomes-instrumentos.grep.test.ts`. Mordida provada contra `refs/gsd/51-03/base` (cca99243).
 *
 * @see src/features/entrevista/components/CognitivoBandCard.tsx
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CognitivoBandCard } from '../CognitivoBandCard'

describe('CognitivoBandCard — o título é «Prova cognitiva», nunca o nome do Raven (JORN-48 / D-15)', () => {
  it.each([['com banda', 'na_media'], ['sem banda', null]] as const)(
    '%s → título «Prova cognitiva» e nada de «Raciocínio lógico» / «Matrizes»',
    (_rotulo, banda) => {
      const { container } = render(<CognitivoBandCard banda={banda} />)

      expect(screen.getByText('Prova cognitiva')).toBeInTheDocument()

      const texto = container.textContent ?? ''
      expect(texto).not.toMatch(/Raciocínio lógico/i)
      expect(texto).not.toMatch(/Matrizes/i)
      expect(texto).not.toMatch(/Avaliação cognitiva/i)
    },
  )
})
