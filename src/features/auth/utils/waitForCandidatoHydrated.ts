/**
 * waitForCandidatoHydrated — Phase 4.1 Pattern 2 (defense in depth)
 *
 * Aguarda candidato (legacy alias for profile when role==='candidato')
 * ser populado no store. Usado por submit handlers que precisam navegar
 * para uma rota dependente de candidato.id.
 *
 * Defense in depth: complementa Pattern 1 (listener centralized hydration).
 * O listener é assíncrono via setTimeout(0); submit handlers podem chamar
 * navigate() ANTES de fetchProfile resolver. Este helper bloqueia até o
 * store reportar candidato !== null OU hard timeout disparar.
 *
 * @param timeoutMs hard cap to avoid hanging forever (default 3000ms)
 * @returns
 *   - true se candidato hidratou na janela
 *   - false em timeout OU se role autenticou como rh/administrador
 *
 * @see RESEARCH §Pattern 2 + §Pitfall 5
 * @see PATTERNS.md §Pattern C
 *
 * Pitfall 7: zero console.* — utility lives under src/features/auth which
 * is recursively scanned by pitfall7.grep.test.ts PHASE_3_AUTH_PATHS.
 *
 * @module features/auth/utils/waitForCandidatoHydrated
 */
import { useAuthStore } from '@/store/authStore'

export async function waitForCandidatoHydrated(
  { timeoutMs = 3000 }: { timeoutMs?: number } = {}
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { candidato, role } = useAuthStore.getState()
    if (candidato && role === 'candidato') return true
    if (role && role !== 'candidato') return false
    await new Promise((r) => setTimeout(r, 50))
  }
  return false
}
