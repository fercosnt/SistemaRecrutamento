/**
 * Testes para useCadastroDraft — Phase 2 Plan 02-04.
 *
 * Cobertura (D-13):
 * - save() remove senha/confirmar_senha antes de serializar
 * - load() retorna null quando chave ausente / JSON inválido
 * - load() retorna objeto parseado sem metadata _savedAt
 * - clear() chama sessionStorage.removeItem
 * - Falha de serialização (quota) loga warning sem lançar
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCadastroDraft } from '../useCadastroDraft'
import { CADASTRO_DRAFT_KEY } from '../../constants'

describe('useCadastroDraft', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })
  afterEach(() => {
    sessionStorage.clear()
  })

  it('save() strips senha and confirmar_senha before JSON.stringify', () => {
    const { result } = renderHook(() => useCadastroDraft())
    act(() => {
      result.current.save({
        dadosPessoais: {
          nome_completo: 'João Teste',
          email: 'joao@example.com',
          senha: 'S3cretP@ss',
          confirmar_senha: 'S3cretP@ss',
        } as never,
      })
    })
    const raw = sessionStorage.getItem(CADASTRO_DRAFT_KEY)
    expect(raw).not.toBeNull()
    expect(raw).not.toContain('S3cretP@ss')
    const parsed = JSON.parse(raw!)
    expect(parsed.dadosPessoais.nome_completo).toBe('João Teste')
    expect(parsed.dadosPessoais.senha).toBeUndefined()
    expect(parsed.dadosPessoais.confirmar_senha).toBeUndefined()
  })

  it('load() returns null when sessionStorage key is absent', () => {
    const { result } = renderHook(() => useCadastroDraft())
    expect(result.current.load()).toBeNull()
  })

  it('load() returns parsed draft excluding _savedAt metadata', () => {
    sessionStorage.setItem(
      CADASTRO_DRAFT_KEY,
      JSON.stringify({ dadosPessoais: { nome_completo: 'Ana' }, _savedAt: 123 }),
    )
    const { result } = renderHook(() => useCadastroDraft())
    const loaded = result.current.load()
    expect(loaded).not.toBeNull()
    expect((loaded as never as Record<string, unknown>)._savedAt).toBeUndefined()
    expect(loaded!.dadosPessoais?.nome_completo).toBe('Ana')
  })

  it('load() returns null when JSON is malformed', () => {
    sessionStorage.setItem(CADASTRO_DRAFT_KEY, '{not json')
    const { result } = renderHook(() => useCadastroDraft())
    expect(result.current.load()).toBeNull()
  })

  it('clear() calls sessionStorage.removeItem with CADASTRO_DRAFT_KEY', () => {
    sessionStorage.setItem(CADASTRO_DRAFT_KEY, '{}')
    const { result } = renderHook(() => useCadastroDraft())
    act(() => result.current.clear())
    expect(sessionStorage.getItem(CADASTRO_DRAFT_KEY)).toBeNull()
  })

  it('save() does not throw on quota failure; logs warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // NOTE: spy on the `sessionStorage` instance (not `Storage.prototype`).
    // happy-dom binds storage methods on the instance after the first access,
    // so prototype-level spies stop intercepting after any test has already
    // written to sessionStorage via the instance. (Rule 1 auto-fix, Plan 02-04 T2)
    const setItemSpy = vi
      .spyOn(sessionStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
    const { result } = renderHook(() => useCadastroDraft())
    expect(() =>
      act(() => result.current.save({ dadosPessoais: { nome_completo: 'X' } as never })),
    ).not.toThrow()
    expect(warnSpy).toHaveBeenCalled()
    setItemSpy.mockRestore()
  })
})
