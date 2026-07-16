/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 34 / Plan 34-02 Task 2 — RED→GREEN for `CvButton` (VISRH-01).
 *
 * Load-bearing security contract (T-34-02-02, Pitfall 7): the 60s-TTL signed URL
 * is fetched imperatively via `cvUploadService.getSignedUrl`, opened immediately with
 * `window.open(url,'_blank')`, and is NEVER stored in state/cache NOR passed to any
 * `console.*`. This suite spies both `getSignedUrl` and `window.open` and asserts the
 * URL reaches `window.open` while NO console call ever receives the signed-url string.
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

  it('ao clicar → getSignedUrl(candidaturaId) e window.open(url, "_blank")', async () => {
    getSignedUrlMock.mockResolvedValue(SIGNED_URL)
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(<CvButton candidaturaId="cand-77" />)
    fireEvent.click(screen.getByRole('button', { name: /Abrir currículo/i }))

    await waitFor(() => expect(getSignedUrlMock).toHaveBeenCalledWith('cand-77'))
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith(SIGNED_URL, '_blank'))
  })

  it('NUNCA passa a signed URL para console.* (Pitfall 7)', async () => {
    getSignedUrlMock.mockResolvedValue(SIGNED_URL)
    vi.spyOn(window, 'open').mockImplementation(() => null)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    render(<CvButton candidaturaId="cand-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Abrir currículo/i }))
    await waitFor(() => expect(window.open).toHaveBeenCalled())

    for (const spy of [logSpy, errSpy, warnSpy, infoSpy, debugSpy]) {
      for (const call of spy.mock.calls) {
        const joined = call.map((a) => String(a)).join(' ')
        expect(joined).not.toContain('token=')
        expect(joined).not.toContain(SIGNED_URL)
      }
    }
  })

  it('erro no getSignedUrl → mostra a cópia inline de erro', async () => {
    getSignedUrlMock.mockRejectedValue(new Error('EF down'))
    vi.spyOn(window, 'open').mockImplementation(() => null)

    render(<CvButton candidaturaId="cand-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Abrir currículo/i }))

    await waitFor(() =>
      expect(screen.getByText(/Não foi possível abrir o currículo/i)).toBeInTheDocument(),
    )
  })
})
