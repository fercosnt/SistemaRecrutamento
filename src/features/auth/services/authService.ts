/**
 * authService — Phase 3 Wave 3 (Plan 03-04).
 *
 * Camada de servico que envolve todas as chamadas a `supabase.auth.*` para
 * autenticacao por email+senha. Espelha o pattern estruturado de erro do
 * Phase 2 (`cadastroService` / `duplicateCheckService`) — toda saida de erro
 * passa pelo `mapSupabaseError` e propaga `AuthError` (D-17 taxonomia).
 *
 * Exports:
 *   - `signIn({ email, senha, rememberMe })` — chama `setRememberMeMode(mode)`
 *     ANTES de `supabase.auth.signInWithPassword(...)` (D-19 / Q1). Throw
 *     `AuthError` em qualquer falha; resolve `void` em sucesso (o consumer
 *     acompanha a sessao via `authStore.onAuthStateChange` listener).
 *   - `signOut()` — wrap de `supabase.auth.signOut()`.
 *   - `resendConfirmation(email)` — wrap de `supabase.auth.resend({ type: 'signup', email })`.
 *   - `tryAutoLogin(email, password)` — single-retry com 500ms backoff
 *     (movido de `cadastroService.ts`, mesma assinatura preservada para
 *     consumers da Phase 2).
 *
 * SECURITY / PITFALL 7:
 *   - Nenhum `console.*` deste modulo recebe `senha`, `password`,
 *     `access_token`, `refresh_token` ou um objeto Error completo.
 *   - Logs estruturados emitem apenas `{ email, rememberMe, hasPassword }`
 *     no inicio + `{ code, status }` em erro mapeado.
 *   - Network errors logam apenas `err.message` (string), nunca `err` cru.
 *
 * ORDER-LOCK (T-03-04 / D-19):
 *   `setRememberMeMode(mode)` e chamado ANTES de `signInWithPassword` para
 *   garantir que o primeiro write de sessao do SDK aterrize na store correta.
 *   Test T1.2 trava essa ordem via `mock.invocationCallOrder`.
 *
 * @module features/auth/services/authService
 */

import { supabase } from '@/lib/supabase/client'
import { setRememberMeMode } from '@/features/auth/utils/rememberMeStorage'
import { mapSupabaseError } from '@/features/auth/utils/mapSupabaseError'
import { AuthError } from '@/features/auth/types/authTypes'

// ============================================================
// signIn — email/senha + rememberMe storage swap
// ============================================================

/**
 * Faz login do usuario com email e senha.
 *
 * Fluxo:
 *   1. `setRememberMeMode(rememberMe ? 'local' : 'session')` — flip do flag
 *      antes do primeiro write do SDK. Idempotente: same-mode é no-op.
 *   2. `supabase.auth.signInWithPassword({ email, password: senha })`.
 *   3. Se SDK retornar `error`, throw `mapSupabaseError(error)` (mapped AuthError).
 *   4. Se SDK retornar sucesso sem `session`, throw AuthError UNKNOWN_ERROR.
 *   5. Em sucesso, retorna `void`. O `onAuthStateChange` listener no
 *      RootLayout/authStore faz o `setSession(session)` e popula o role.
 *
 * @throws {AuthError} INVALID_CREDENTIALS / EMAIL_NOT_CONFIRMED / RATE_LIMITED
 *   / SERVER_ERROR / NETWORK_ERROR / UNKNOWN_ERROR
 */
export async function signIn(input: {
  email: string
  senha: string
  rememberMe: boolean
}): Promise<void> {
  // Pitfall 7: log redigido — email + flag, NUNCA senha.
  console.log('[AUTH] signIn invoked', {
    email: input.email,
    rememberMe: input.rememberMe,
    hasPassword: Boolean(input.senha),
  })

  // T-03-04 / D-19: ORDER-LOCK — flip o storage mode ANTES do signIn.
  // Se a flag for flippada DEPOIS, o primeiro write do SDK aterrizaria
  // na store antiga. Test T1.2 protege essa ordem.
  setRememberMeMode(input.rememberMe ? 'local' : 'session')

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.senha,
    })

    if (error) {
      // Pitfall 7: log apenas { code, status }; nunca o objeto erro completo.
      console.error('[AUTH] signIn error:', {
        code: error.code,
        status: error.status,
      })
      throw mapSupabaseError(error)
    }

    if (!data.session) {
      throw new AuthError(
        'Sessão não estabelecida. Tente novamente.',
        'UNKNOWN_ERROR'
      )
    }
  } catch (err) {
    if (err instanceof AuthError) throw err
    // Network/unknown rewrap — log apenas a message string.
    console.error(
      '[AUTH] Network/Unknown error during signIn:',
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

// ============================================================
// signOut — wrap de supabase.auth.signOut
// ============================================================

/**
 * Faz logout do usuario corrente. SDK fires SIGNED_OUT event que e
 * consumido pelo authStore listener (limpa role + session no Zustand).
 *
 * @throws {AuthError} em qualquer falha (mapped)
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[AUTH] signOut error:', {
        code: error.code,
        status: error.status,
      })
      throw mapSupabaseError(error)
    }
  } catch (err) {
    if (err instanceof AuthError) throw err
    console.error(
      '[AUTH] Network/Unknown error during signOut:',
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

// ============================================================
// resendConfirmation — D-02 reenvio de email de confirmacao
// ============================================================

/**
 * Reenvia o email de confirmacao para um usuario que se cadastrou mas ainda
 * nao confirmou. Usado pelo CTA "Reenviar email de confirmacao" exibido
 * pela LoginPage quando o erro `EMAIL_NOT_CONFIRMED` e levantado.
 *
 * Pitfall 7: email passa apenas como argumento ao SDK; nao e logado.
 *
 * @throws {AuthError} RATE_LIMITED se Supabase rejeitar (over_email_send_rate_limit);
 *   outras falhas mapeadas via mapSupabaseError.
 */
export async function resendConfirmation(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      console.error('[AUTH] resendConfirmation error:', {
        code: error.code,
        status: error.status,
      })
      throw mapSupabaseError(error)
    }
  } catch (err) {
    if (err instanceof AuthError) throw err
    console.error(
      '[AUTH] Network/Unknown error during resendConfirmation:',
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

// ============================================================
// tryAutoLogin — moved from cadastroService.ts (Phase 2 D-02)
// ============================================================

/**
 * Auto-login com single-retry e 500ms backoff (Phase 2 D-02).
 *
 * Politica:
 *   - Tenta signInWithPassword.
 *   - Se falhar, espera 500ms e tenta uma vez mais.
 *   - Retorna `true` se ao menos uma das duas tentativas tiver sucesso.
 *   - Retorna `false` se ambas falharem.
 *
 * NUNCA loga o password (Pitfall 7 — caller emite a redacted shape, nao
 * este helper). Zero `console.*` calls aqui.
 *
 * Consumers:
 *   - Phase 2: `CadastroMultiStepForm.onSubmit` apos `cadastrarCandidato`.
 *   - Phase 3: `RedefinirSenhaPage` apos `setNewPassword` (D-12 fallback).
 *
 * @param email Email do usuario
 * @param password Senha em memoria (RHF state)
 * @returns true se logou com sucesso, false se ambas as tentativas falharam
 */
export async function tryAutoLogin(
  email: string,
  password: string
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!error) return true
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  return false
}
