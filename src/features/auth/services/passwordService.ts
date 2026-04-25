/**
 * passwordService — Phase 3 Wave 3 (Plan 03-04).
 *
 * Camada de servico para os 2 fluxos de recuperacao de senha:
 *   - `requestPasswordReset(email, isRH?)` — envia o email de reset; D-09
 *     anti-enumeration (swallow ALL errors except RATE_LIMITED).
 *   - `setNewPassword(novaSenha)` — atualiza a senha do usuario corrente
 *     (que ja precisa estar autenticado via PASSWORD_RECOVERY session,
 *     gated pelo `useRecoverySession` hook).
 *
 * D-09 (anti-enumeration / T-03-02):
 *   `requestPasswordReset` NUNCA distingue "email cadastrado" vs
 *   "email nao cadastrado" para o caller. UI mostra a mesma copy neutra
 *   ("Se o email estiver cadastrado, enviamos um link..."). Apenas o erro
 *   RATE_LIMITED e propagado, porque o usuario PRECISA ver o cooldown ou
 *   continuara clicando submit. Network errors tambem sao swallowed.
 *
 * Asymmetry (intencional):
 *   - `requestPasswordReset`: SWALLOW network errors (D-09 — UI neutra).
 *   - `setNewPassword`: THROW network errors (usuario ja esta autenticado;
 *     nada a enumerate; ele precisa de feedback de falha).
 *
 * SECURITY / PITFALL 7:
 *   - `requestPasswordReset` NAO loga o email (mesmo que ja seja conhecido
 *     pelo caller — minimiza pegada em logs caso eles vazem).
 *   - `setNewPassword` NAO loga `novaSenha` em hipotese alguma — apenas
 *     `{ hasPassword: Boolean(novaSenha) }` no log de inicio.
 *   - Erros mapeados emitem apenas `{ code, status }`.
 *
 * @module features/auth/services/passwordService
 */

import { supabase } from '@/lib/supabase/client'
import { mapSupabaseError } from '@/features/auth/utils/mapSupabaseError'
import { AuthError } from '@/features/auth/types/authTypes'

// ============================================================
// requestPasswordReset — D-09 anti-enumeration
// ============================================================

/**
 * Solicita email de recuperacao de senha.
 *
 * Comportamento (D-09):
 *   - Calcula `redirectTo` baseado em `window.location.origin` + `?tipo=rh`
 *     se a flag estiver setada (UI-SPEC: o RH e candidato compartilham a
 *     mesma pagina de redefinicao, mas ramificam no header copy/redirect).
 *   - Chama `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
 *   - Se SDK retornar erro:
 *     - RATE_LIMITED (`over_email_send_rate_limit` / `over_request_rate_limit`):
 *       throw AuthError mapeado. UI mostra cooldown.
 *     - Qualquer outro erro: SWALLOW. UI mostra copy neutra de sucesso.
 *   - Network errors (fetch throw): SWALLOW (mesmo argumento que outros codes).
 *
 * @param email Email do usuario
 * @param isRH Se true, redirectTo inclui `?tipo=rh` para a UI ramificar
 *
 * @throws {AuthError} APENAS quando `code === RATE_LIMITED` — todos os
 *   outros erros sao swallowed para anti-enumeration.
 */
export async function requestPasswordReset(
  email: string,
  isRH: boolean = false
): Promise<void> {
  // Pitfall 7: NAO logar email aqui — apenas a flag. Reduz pegada em logs.
  console.log('[AUTH] requestPasswordReset invoked', { isRH })

  const redirectTo = `${window.location.origin}/auth/redefinir-senha${
    isRH ? '?tipo=rh' : ''
  }`

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      // Pitfall 7: log apenas { code, status }; NAO logar message (pode
      // conter substring do email em alguns codes do Supabase).
      console.error('[AUTH] resetPasswordForEmail error:', {
        code: error.code,
        status: error.status,
      })
      // D-09: surface APENAS RATE_LIMITED. Todo o resto e swallowed para
      // manter a UI neutra (anti-enumeration).
      if (
        error.code === 'over_email_send_rate_limit' ||
        error.code === 'over_request_rate_limit'
      ) {
        throw mapSupabaseError(error)
      }
    }
  } catch (err) {
    if (err instanceof AuthError) throw err
    // Network error: SWALLOW (D-09 — UI continua mostrando copy neutra de
    // sucesso ao usuario; debugging fica restrito ao `console.error` abaixo
    // que NUNCA inclui senha/email/access_token).
    console.error(
      '[AUTH] Network error during requestPasswordReset:',
      err instanceof Error ? err.message : String(err)
    )
  }
}

// ============================================================
// setNewPassword — D-10/D-12
// ============================================================

/**
 * Atualiza a senha do usuario corrente. O usuario JA precisa estar
 * autenticado — tipicamente via uma `PASSWORD_RECOVERY` session que o
 * `detectSessionInUrl: true` do supabase-js materializa quando o link
 * do email e aberto. O `useRecoverySession` hook valida essa pre-condicao
 * antes de a UI permitir o submit.
 *
 * Em sucesso, o SDK dispara `USER_UPDATED` event → `authStore.setSession`
 * re-extrai o role do novo access_token. O caller pode entao navegar
 * para `/candidato/perfil` (ou `/admin` para RH) com `replace: true`.
 *
 * @throws {AuthError} SERVER_ERROR (weak_password / same_password / session_expired)
 *   / RATE_LIMITED / NETWORK_ERROR / UNKNOWN_ERROR
 */
export async function setNewPassword(novaSenha: string): Promise<void> {
  // Pitfall 7: log apenas a flag — NUNCA `novaSenha`.
  console.log('[AUTH] setNewPassword invoked', {
    hasPassword: Boolean(novaSenha),
  })

  try {
    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    if (error) {
      console.error('[AUTH] updateUser error:', {
        code: error.code,
        status: error.status,
      })
      throw mapSupabaseError(error)
    }
  } catch (err) {
    if (err instanceof AuthError) throw err
    console.error(
      '[AUTH] Network/Unknown error during setNewPassword:',
      err instanceof Error ? err.message : String(err)
    )
    throw new AuthError(
      'Sem conexão com o servidor. Verifique sua internet.',
      'NETWORK_ERROR',
      undefined,
      undefined,
      err
    )
  }
}
