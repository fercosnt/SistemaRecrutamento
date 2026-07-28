/**
 * Hook para prevenir fechamento/refresh acidental da aba enquanto o cadastro
 * está sujo (isDirty=true).
 *
 * - Registra listener `beforeunload` quando isDirty é true.
 * - NÃO registra quando isDirty é false.
 * - Remove listener no unmount ou quando isDirty vira false.
 *
 * Browsers modernos ignoram a string customizada; o diálogo mostrado é o
 * padrão localizado. Não tente customizar (D-14 + UI-SPEC).
 *
 * @module useLeaveGuard
 */

import { useEffect } from 'react'

export function useLeaveGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [isDirty])
}
