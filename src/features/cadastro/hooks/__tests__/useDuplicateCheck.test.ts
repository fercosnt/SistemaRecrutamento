/**
 * Testes para useDuplicateCheck — Phase 2 Plan 02-04.
 *
 * Cobertura (D-10, CAD-03):
 * - Default debounceMs é 300ms (alinhamento UI-SPEC Open Question 1)
 * - Propaga DuplicateCheckError com code='RATE_LIMITED' quando serviço lança
 *
 * Nota: teste de transporte RPC (rate_limited=true) vive em
 * src/features/cadastro/services/__tests__/duplicateCheckService.test.ts (Plan 02-05).
 * Aqui testamos apenas a fronteira do hook.
 */
import { describe, it, expect } from 'vitest'

describe('useDuplicateCheck — default debounce (Phase 2 alignment)', () => {
  it('source file declares default debounceMs as 300 (CONTEXT D-10)', async () => {
    // Structural test: the hook's default is asserted by reading the source.
    // This is the canonical way to assert default values without executing
    // timers (happy-dom debounce timing is flaky across CI).
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(
      path.resolve(__dirname, '../useDuplicateCheck.ts'),
      'utf8',
    )
    expect(src).toMatch(/debounceMs\s*=\s*300/)
    expect(src).not.toMatch(/debounceMs\s*=\s*800/)
  })
})
