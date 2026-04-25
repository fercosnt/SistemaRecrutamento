/**
 * useRateLimitCooldown tests — Phase 3 Wave 3 (Plan 03-04).
 *
 * Behaviors covered (B4 hook layer):
 *   - Initial render: { remainingSeconds: 0, isActive: false }
 *   - setCooldown(N): isActive=true, remainingSeconds counts down per second
 *   - At 0: isActive flips false; interval cleared
 *   - T-03-06 mitigation: NO localStorage persist — store is in-memory only
 *
 * Uses @testing-library/react renderHook + vi.useFakeTimers + act.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRateLimitCooldown } from '../useRateLimitCooldown'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useRateLimitCooldown (Wave 3, Plan 03-04)', () => {
  it('T3.1: initial render — remainingSeconds=0, isActive=false', () => {
    const { result } = renderHook(() => useRateLimitCooldown())
    // Reset to ensure clean state across tests (Zustand singleton)
    act(() => {
      result.current.setCooldown(0)
    })
    expect(result.current.isActive).toBe(false)
    expect(result.current.remainingSeconds).toBe(0)
    expect(typeof result.current.setCooldown).toBe('function')
  })

  it('T3.2: setCooldown(30) → isActive=true, remainingSeconds≈30', () => {
    const { result } = renderHook(() => useRateLimitCooldown())
    act(() => {
      result.current.setCooldown(30)
    })
    expect(result.current.isActive).toBe(true)
    expect(result.current.remainingSeconds).toBeGreaterThan(28)
    expect(result.current.remainingSeconds).toBeLessThanOrEqual(30)
  })

  it('T3.3: tick 1 second → remainingSeconds decrements', () => {
    const { result } = renderHook(() => useRateLimitCooldown())
    act(() => {
      result.current.setCooldown(10)
    })
    const initial = result.current.remainingSeconds
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.remainingSeconds).toBeLessThan(initial)
  })

  it('T3.4: at 0 → isActive=false', () => {
    const { result } = renderHook(() => useRateLimitCooldown())
    act(() => {
      result.current.setCooldown(2)
    })
    expect(result.current.isActive).toBe(true)
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(result.current.remainingSeconds).toBe(0)
    expect(result.current.isActive).toBe(false)
  })

  it('T3.5: setCooldown(0) → isActive=false (clear / no cooldown)', () => {
    const { result } = renderHook(() => useRateLimitCooldown())
    act(() => {
      result.current.setCooldown(10)
    })
    expect(result.current.isActive).toBe(true)
    act(() => {
      result.current.setCooldown(0)
    })
    expect(result.current.isActive).toBe(false)
    expect(result.current.remainingSeconds).toBe(0)
  })

  it('T3.6: setCooldown clamps values > 3600 to 3600', () => {
    const { result } = renderHook(() => useRateLimitCooldown())
    act(() => {
      result.current.setCooldown(99999)
    })
    expect(result.current.remainingSeconds).toBeGreaterThan(3598)
    expect(result.current.remainingSeconds).toBeLessThanOrEqual(3600)
  })
})
