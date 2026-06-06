/**
 * Barrel export para hooks de autenticação.
 *
 * Wave 3 / Plan 03-04 wires:
 *   - useRateLimitCooldown: in-memory countdown for rate-limit submit-disable
 *   - useAuthFlowVariant: ?tipo=rh query-param variant detector
 *
 * Phase 5 / Plan 05-06 (D-15 OTP migration):
 *   - useRecoverySession RETIRED — the PKCE deeplink PASSWORD_RECOVERY state
 *     machine is no longer needed; RedefinirSenhaPage gates on the OTP verify
 *     call (verifyRecoveryOtp) instead of a materialized deeplink session.
 */

export { useRateLimitCooldown } from './useRateLimitCooldown'
export { useAuthFlowVariant, type AuthVariant } from './useAuthFlowVariant'
