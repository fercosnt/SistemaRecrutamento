/**
 * rememberMeStorage — Phase 3 Wave 2 (Plan 03-03 / D-19).
 *
 * Adapter compativel com o contrato `SupportedStorage` do @supabase/supabase-js
 * (apenas `getItem` / `setItem` / `removeItem` — supabase-js nao chama `clear`,
 * `length` ou `key`). Roteia dinamicamente entre `window.localStorage` e
 * `window.sessionStorage` conforme o modo atual setado via `setRememberMeMode`.
 *
 * Uso tipico (Wave 2 `authService.signIn`):
 *   setRememberMeMode(rememberMe ? 'local' : 'session')
 *   await supabase.auth.signInWithPassword(...)
 *
 * Correctness-critical details:
 *   - `setRememberMeMode('session')` WIPE sb-* keys do localStorage ANTES de
 *     flipar o flag (T-03-04: swap sem wipe deixaria token persistente visivel
 *     pela proxima leitura, mesmo depois de o usuario desmarcar Lembrar-me).
 *   - `setRememberMeMode('local')` wipe simetrico em sessionStorage — evita
 *     que um residuo de sessao anterior corrompa o modo 'persistent'.
 *   - `getItem` faz read-through: backing store primeiro, OTHER store depois.
 *     Suporta o cenario fresh-tab-recovery em que o adapter foi inicializado
 *     mas a sessao persistida estava na outra store (ex.: redeploy que
 *     resetou o modo default).
 *   - `removeItem` limpa AMBAS as stores defensivamente — SIGNED_OUT deve
 *     obliterar qualquer vestigio independente do modo corrente.
 *
 * Pitfall 7 / T-03-07b: ZERO console.* calls. Falhas silenciosas no backing
 * (quota exceeded, etc.) sao propagadas para o caller (supabase-js trata).
 *
 * @see .planning/phases/03-login-recuperacao-senha/03-RESEARCH.md (§Code Examples)
 * @see .planning/phases/03-login-recuperacao-senha/03-PATTERNS.md (§rememberMeStorage)
 *
 * @module features/auth/utils/rememberMeStorage
 */

const STORAGE_KEY_PREFIX = 'sb-'

type StorageMode = 'local' | 'session'

/** Estado module-scoped. Default 'local' (Lembrar-me checked = default UX, UI-SPEC D-05). */
let currentMode: StorageMode = 'local'

function getBackingStore(): Storage {
  return currentMode === 'local' ? window.localStorage : window.sessionStorage
}

function getOtherStore(): Storage {
  return currentMode === 'local' ? window.sessionStorage : window.localStorage
}

/**
 * Flip o modo de storage. Wipe os sb-* keys da store que acabou de perder
 * a preferencia (T-03-04 — evita token leakage entre sessoes de "Lembrar-me").
 *
 * Idempotente: chamadas com o mesmo modo vigente sao no-op (nao wipe).
 */
export function setRememberMeMode(mode: StorageMode): void {
  if (mode === currentMode) return

  // Store que vai deixar de ser ativa — wipe sb-* antes de flipar o flag.
  const toWipe =
    currentMode === 'local' ? window.localStorage : window.sessionStorage

  for (let i = toWipe.length - 1; i >= 0; i--) {
    const key = toWipe.key(i)
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      toWipe.removeItem(key)
    }
  }

  currentMode = mode
}

/**
 * Storage adapter entregue ao supabase-js via `createClient({ auth: { storage } })`.
 *
 * Os metodos leem `currentMode` em TODA chamada (late-binding), nao capturam
 * o valor no modulo-load. Isso garante que um `setRememberMeMode('session')`
 * chamado entre a inicializacao do client e o primeiro `signInWithPassword`
 * ainda seja respeitado pelo primeiro write.
 */
export const rememberMeStorage = {
  getItem(key: string): string | null {
    return getBackingStore().getItem(key) ?? getOtherStore().getItem(key)
  },
  setItem(key: string, value: string): void {
    getBackingStore().setItem(key, value)
  },
  removeItem(key: string): void {
    // Defensive: SIGNED_OUT deve limpar ambas as stores independente do modo.
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}
