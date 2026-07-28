/**
 * AuthError — taxonomia canonica de erros de autenticacao (Phase 3, D-17).
 *
 * Escopo:
 * - Usada em `src/features/auth/services/*` (signIn, signOut, passwordService)
 *   a partir da Wave 2 (Plan 03-04). Na Wave 1 (Plan 03-02), so a classe +
 *   mapSupabaseError sao criadas; os services ainda nao consomem.
 *
 * Code union (fechado, sem drift):
 * - `INVALID_CREDENTIALS`: credenciais invalidas (email/senha errados). Mensagem
 *   unica no UI — nunca distingue "email nao existe" vs "senha errada"
 *   (anti-enumeration, D-01).
 * - `EMAIL_NOT_CONFIRMED`: usuario existe mas `email_confirmed_at IS NULL`.
 *   `field: 'email'` para o form destacar o campo + CTA "reenviar confirmacao".
 * - `RATE_LIMITED`: HTTP 429. `retryAfterSeconds` traz o cooldown (ja clampado
 *   a 1h — ver extractRetryAfterSeconds / ISSUE-007).
 * - `NETWORK_ERROR`: falha de rede (fetch throw). Toast "Sem conexao...".
 * - `SERVER_ERROR`: 5xx do Supabase OU erros de regra de negocio com mensagem
 *   especifica (weak_password, same_password, session_expired). `field: 'senha'`
 *   nos casos de regra-de-senha.
 * - `UNKNOWN_ERROR`: fallback absoluto. Input malformado ou codigo nao previsto.
 *
 * `field` (uniao estreita `'email' | 'senha'`):
 * - Autenticacao so tem 2 campos de form em todas as 4 paginas (Login,
 *   EsqueciSenha, RedefinirSenha). Nao precisa ser `string` generico.
 *
 * `retryAfterSeconds` (opcional numerico):
 * - Segundos ate o proximo retry permitido. Guia o hook `useRateLimitCooldown`
 *   (Wave 2). Finito e clampado em [1, 3600] pelo extractor.
 *
 * Pitfall 7 (redacao): este modulo nao loga nada. O `originalError` e exposto
 * para inspecao em testes / telemetria estruturada (apenas `{ code, status }`
 * deve ser emitido por consumers — nunca `message` ou `originalError` completo).
 */
export class AuthError extends Error {
  constructor(
    public override readonly message: string,
    public readonly code:
      | 'INVALID_CREDENTIALS'
      | 'EMAIL_NOT_CONFIRMED'
      | 'RATE_LIMITED'
      | 'NETWORK_ERROR'
      | 'SERVER_ERROR'
      | 'UNKNOWN_ERROR',
    public readonly field?: 'email' | 'senha',
    public readonly retryAfterSeconds?: number,
    public readonly originalError?: unknown
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Type guard construtor-agnostico para AuthError.
 *
 * NAO usa `instanceof AuthError` de proposito: sobrevive a cenarios de bundle
 * duplicado (ex.: dois pre-bundles Vite com AuthError distintos, analogo ao
 * split-instance do Sonner corrigido em Phase 2 Plan 02-06). Basta verificar
 * `err instanceof Error` + `err.name === 'AuthError'`.
 */
export function isAuthError(err: unknown): err is AuthError {
  return err instanceof Error && err.name === 'AuthError'
}
