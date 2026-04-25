/**
 * Barrel export para hooks de autenticação.
 *
 * Wave 3 / Plan 03-04 wires:
 *   - useRateLimitCooldown: in-memory countdown for rate-limit submit-disable
 *   - useRecoverySession: PASSWORD_RECOVERY state machine for RedefinirSenhaPage
 *   - useAuthFlowVariant: ?tipo=rh query-param variant detector
 */

export { useRateLimitCooldown } from './useRateLimitCooldown'
export { useRecoverySession, type RecoveryState } from './useRecoverySession'
export { useAuthFlowVariant, type AuthVariant } from './useAuthFlowVariant'
