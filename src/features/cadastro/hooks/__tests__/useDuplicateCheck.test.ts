/**
 * Testes para useDuplicateCheck (Wave 0 — stubs)
 *
 * Cobertura planejada (Phase 2 Plan 02-04):
 * - Debounce default é 300ms (alinhamento D-10)
 * - rate_limited=true dispara DuplicateCheckError com code='RATE_LIMITED'
 * - Abort controller cancela chamada anterior
 */
import { describe, it } from 'vitest'

describe('useDuplicateCheck', () => {
  it.todo('default debounceMs is 300 (aligned with CONTEXT D-10)')
  it.todo('propagates RATE_LIMITED error when RPC returns rate_limited=true')
  it.todo('cancels in-flight request when value changes mid-debounce')
})
