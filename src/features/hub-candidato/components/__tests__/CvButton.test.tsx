/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-02 Task 2 — RED→GREEN for `CvButton` (VISRH-01).
 *
 * Load-bearing security contract (T-34-02-02, Pitfall 7): the 60s-TTL signed URL
 * is fetched imperatively via `cvUploadService.getSignedUrl`, then assigned to a tab that
 * was opened SYNCHRONOUSLY (a blank `_blank` tab, to preserve user activation — CR-01),
 * and is NEVER stored in state/cache NOR passed to any `console.*`. This suite spies both
 * `getSignedUrl` and `window.open` and asserts the URL reaches the opened tab's location
 * while NO console call ever receives the signed-url string. A blocked popup
 * (`window.open` → null) surfaces the inline error instead of failing silently.
 *
 * @see src/features/vagas/services/cvUploadService.ts (getSignedUrl + "DO NOT log" note)
 * @see .planning/phases/34-.../34-UI-SPEC.md (§CV block copy + §Accessibility aria-busy)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const getSignedUrlMock = vi.fn()
vi.mock('@/features/vagas/services/cvUploadService', () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args),
}))

import { CvButton } from '../CvButton'

const SIGNED_URL = 'https://storage.example.com/curriculo.pdf?token=SECRET_SIGNED_TOKEN'

describe('CvButton — abrir currículo via signed URL (VISRH-01)', () => {
  beforeEach(() => {
    getSignedUrlMock.mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('estado idle → mostra "Abrir currículo"', () => {
    render(<CvButton candidaturaId="cand-1" />)
    expect(screen.getByRole('button', { name: /Abrir currículo/i })).toBeInTheDocument()
  })

  it('ao clicar → abre aba em branco SINCRONA e navega para a signed URL', async () => {
    getSignedUrlMock.mockResolvedValue(SIGNED_URL)
    const fakeWin = { location: { href: '' }, opener: {}, close: vi.fn() }
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window)

    render(<CvButton candidaturaId="cand-77" />)
    fireEvent.click(screen.getByRole('button', { name: /Abrir currículo/i }))

    // A aba é aberta SINCRONAMENTE dentro do gesto (preserva user activation — CR-01),
    // NUNCA com a URL como argumento de window.open.
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank')
    await waitFor(() => expect(getSignedUrlMock).toHaveBeenCalledWith('cand-77'))
    // A signed URL navega a aba já aberta (via location.href), não window.open(url).
    await waitFor(() => expect(fakeWin.location.href).toBe(SIGNED_URL))
    // Back-reference de tabnabbing severada (IN-02).
    expect(fakeWin.opener).toBeNull()
  })

  it('popup bloqueado (window.open → null) → mostra a cópia inline de erro', async () => {
    getSignedUrlMock.mockResolvedValue(SIGNED_URL)
    vi.spyOn(window, 'open').mockReturnValue(null)

    render(<CvButton candidaturaId="cand-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Abrir currículo/i }))

    await waitFor(() =>
      expect(screen.getByText(/Não foi possível abrir o currículo/i)).toBeInTheDocument(),
    )
  })

  it('NUNCA passa a signed URL para console.* (Pitfall 7)', async () => {
    getSignedUrlMock.mockResolvedValue(SIGNED_URL)
    const fakeWin = { location: { href: '' }, opener: {}, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    render(<CvButton candidaturaId="cand-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Abrir currículo/i }))
    // Aguarda o caminho feliz completo (URL atribuída à aba) — o ponto de risco de log.
    await waitFor(() => expect(fakeWin.location.href).toBe(SIGNED_URL))

    for (const spy of [logSpy, errSpy, warnSpy, infoSpy, debugSpy]) {
      for (const call of spy.mock.calls) {
        const joined = call.map((a) => String(a)).join(' ')
        expect(joined).not.toContain('token=')
        expect(joined).not.toContain(SIGNED_URL)
      }
    }
  })

  it('erro no getSignedUrl → fecha a aba e mostra a cópia inline de erro', async () => {
    getSignedUrlMock.mockRejectedValue(new Error('EF down'))
    const fakeWin = { location: { href: '' }, opener: {}, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window)

    render(<CvButton candidaturaId="cand-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Abrir currículo/i }))

    await waitFor(() =>
      expect(screen.getByText(/Não foi possível abrir o currículo/i)).toBeInTheDocument(),
    )
    // A aba em branco aberta especulativamente é fechada quando o fetch falha.
    expect(fakeWin.close).toHaveBeenCalled()
  })
})
