/**
 * Testes para useLeaveGuard (Wave 0 — stubs)
 *
 * Cobertura planejada (Phase 2 Plan 02-04):
 * - Registra beforeunload listener quando isDirty=true
 * - Não registra quando isDirty=false
 * - Handler chama event.preventDefault() e event.returnValue = ''
 * - Toggle isDirty true→false remove o listener
 * - Cleanup em unmount remove o listener
 */
import { describe, it } from 'vitest'

describe('useLeaveGuard', () => {
  it.todo('registers beforeunload listener when isDirty is true')
  it.todo('does not register listener when isDirty is false')
  it.todo('handler calls event.preventDefault() and sets event.returnValue = ""')
  it.todo('toggling isDirty from true to false removes the listener')
  it.todo('unmount removes the listener via cleanup')
})
