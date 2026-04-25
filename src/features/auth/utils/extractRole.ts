/**
 * extractRole — Phase 3 Wave 2 (Plan 03-03).
 *
 * Decodifica o `session.access_token` (JWT) via `jwt-decode@^4` e retorna
 * o `role` a partir de `payload.app_metadata.role`. Esta e a CORRECAO do
 * Bug 1 (D-13 / AUTH-JWT-01): o codigo anterior lia `session.user.app_metadata.role`,
 * que o Supabase-js popula a partir da tabela `auth.users` onde `role` NAO
 * existe como coluna — o Custom Access Token Hook injeta `role` APENAS no
 * JWT assinado.
 *
 * Contrato:
 *   - Retorna `Role | null`. Nunca throws.
 *   - Retorna `null` quando: sessao ausente, access_token vazio, jwt-decode
 *     throws (malformed token), `app_metadata` ausente, ou role fora do
 *     whitelist `'candidato' | 'rh' | 'administrador'`.
 *
 * Pitfall 7 / T-03-07b:
 *   - NUNCA loga (console.*) o token nem o payload decodificado.
 *   - Catch block VAZIO — swallow decode errors, retorna `null`.
 *   - Consumers (RoleGuard / authStore) fazem o fallback redirect.
 *
 * @see .planning/phases/03-login-recuperacao-senha/03-RESEARCH.md (§Code Examples)
 * @see .planning/phases/01-foundation-saneada/KNOWN-ISSUES-CARRYOVER-PHASE-3.md (§Bug 1)
 *
 * @module features/auth/utils/extractRole
 */

import { jwtDecode } from 'jwt-decode'
import type { Session } from '@supabase/supabase-js'

/**
 * Role do usuario autenticado.
 *
 * - `candidato`: pessoa fisica se candidatando a vagas (area publica)
 * - `rh`: recrutador (mapeado de `usuarios_rh.role === 'recrutador'`)
 * - `administrador`: administrador do sistema
 */
export type Role = 'candidato' | 'rh' | 'administrador'

/**
 * Forma minima do payload JWT que nos importa.
 * `app_metadata.role` e narrowed para `unknown` — defensive programming,
 * nunca confie na forma bruta do payload.
 */
interface SupabaseAccessTokenPayload {
  app_metadata?: { role?: unknown }
  sub?: string
  exp?: number
}

/**
 * Extrai o role do JWT `app_metadata.role` (Bug 1 / D-13 fix).
 *
 * @param session - Supabase Session ou null
 * @returns Role validado contra whitelist, ou null em qualquer falha
 */
export function extractRole(session: Session | null): Role | null {
  if (!session?.access_token) return null
  try {
    const payload = jwtDecode<SupabaseAccessTokenPayload>(session.access_token)
    const raw = payload.app_metadata?.role
    if (raw === 'candidato' || raw === 'rh' || raw === 'administrador') {
      return raw
    }
    return null
  } catch {
    // T-03-07b: catch block INTENCIONALMENTE vazio. NAO logar nada aqui —
    // logar a mensagem de erro da lib vazaria o token via args. Malformed JWT
    // → retorna null → RoleGuard redireciona para /auth/login.
    return null
  }
}
