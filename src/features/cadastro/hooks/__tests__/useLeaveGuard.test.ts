/**
 * Testes para useLeaveGuard — Phase 2 Plan 02-04.
 *
 * Cobertura (D-14):
 * - Registra beforeunload listener quando isDirty=true
 * - Não registra quando isDirty=false
 * - Handler chama preventDefault() e seta returnValue=''
 * - Toggle isDirty true→false remove o listener
 * - Cleanup em unmount remove o listener
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLeaveGuard } from '../useLeaveGuard'

describe('useLeaveGuard', () => {
  // Use `any` for the spy types — vitest 4's inferred Mock<K, V> generic for
  // window.addEventListener/removeEventListener includes an overloaded union
  // that does not assign cleanly to `ReturnType<typeof vi.spyOn>`.
  // This narrow escape hatch keeps tsc --noEmit clean without affecting runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let addSpy: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let removeSpy: any

  beforeEach(() => {
    // Reset first — vi.spyOn is idempotent and preserves mock.calls across
    // tests, so without restoreAllMocks() the new spy instance would still
    // contain invocations from prior tests. (Rule 1 auto-fix, Plan 02-04 T3)
    vi.restoreAllMocks()
    addSpy = vi.spyOn(window, 'addEventListener')
    removeSpy = vi.spyOn(window, 'removeEventListener')
  })

  it('registers beforeunload listener when isDirty is true', () => {
    renderHook(() => useLeaveGuard(true))
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('does not register listener when isDirty is false', () => {
    renderHook(() => useLeaveGuard(false))
    const beforeUnloadAdds = addSpy.mock.calls.filter((c: unknown[]) => c[0] === 'beforeunload')
    expect(beforeUnloadAdds).toHaveLength(0)
  })

  it('handler calls preventDefault() and sets returnValue = ""', () => {
    renderHook(() => useLeaveGuard(true))
    const call = addSpy.mock.calls.find((c: unknown[]) => c[0] === 'beforeunload')
    expect(call).toBeDefined()
    const handler = call![1] as (e: BeforeUnloadEvent) => void
    const event = { preventDefault: vi.fn(), returnValue: 'initial' } as unknown as BeforeUnloadEvent
    handler(event)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.returnValue).toBe('')
  })

  it('toggling isDirty from true to false removes the listener', () => {
    const { rerender } = renderHook((props: { dirty: boolean }) => useLeaveGuard(props.dirty), {
      initialProps: { dirty: true },
    })
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    rerender({ dirty: false })
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('unmount removes the listener via cleanup', () => {
    const { unmount } = renderHook(() => useLeaveGuard(true))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })
})
