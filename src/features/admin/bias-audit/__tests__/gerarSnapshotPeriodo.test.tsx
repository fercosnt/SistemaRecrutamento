/**
 * «Gerar snapshot» tem de pedir o MÊS CORRENTE — nunca o período do snapshot exibido.
 *
 * Medido em PROD (06/09/2026, E11 do guia): o último snapshot tinha
 * `periodo = 'p45-pos-execucao'` (rótulo de uma execução de fase). O handler mandava
 * `periodo ?? currentPeriod()`, o serviço exige `YYYY-MM`, e o botão respondia «Período
 * inválido (esperado YYYY-MM)» — culpando um período que o admin nunca escolheu. Mesmo
 * com um período válido, gerar refazia o mês antigo em vez do atual.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mutate = vi.fn()

vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../hooks/useBiasAudit', () => ({
  useLatestBiasSnapshot: () => ({
    // O snapshot vivo de PROD: período que NÃO é YYYY-MM.
    data: { periodo: 'p45-pos-execucao', gerado_em: '2026-08-22T12:00:00Z', dados: { bands: [] } },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGerarBiasSnapshot: () => ({ mutate, isPending: false }),
}))

import { BiasAuditPage } from '../components/BiasAuditPage'

describe('BiasAuditPage — período do «Gerar snapshot»', () => {
  beforeEach(() => mutate.mockClear())

  it('pede o mês corrente (YYYY-MM), não o período do snapshot exibido', () => {
    render(<BiasAuditPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Gerar snapshot' }))

    expect(mutate).toHaveBeenCalledTimes(1)
    const enviado = mutate.mock.calls[0][0] as string
    expect(enviado).toMatch(/^\d{4}-\d{2}$/)
    expect(enviado).not.toBe('p45-pos-execucao')

    const agora = new Date()
    const esperado = `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}`
    expect(enviado).toBe(esperado)
  })
})
