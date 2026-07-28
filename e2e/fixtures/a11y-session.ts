/**
 * a11y-session — reusable mocked-Supabase-session fixture for the Tier-A axe loop.
 *
 * Phase 16 / Plan 16-01 Task 1 (LGPD-05). Extracted from the perfil.spec.ts idiom
 * (e2e/perfil.spec.ts:35-94) so the Tier-A main-M2 axe loop in a11y.spec.ts can drive
 * any role-gated route past `RoleGuard` under a mocked session — no live Supabase, no
 * secrets, deterministic in CI.
 *
 * How it works (verified against src/components/RoleGuard.tsx + extractRole.ts):
 *  - `RoleGuard` gates ONLY on `authStore.role`, which `extractRole` derives from the
 *    JWT `app_metadata.role` (NOT `session.user.app_metadata.role`). So a decode-valid
 *    (unsigned) JWT carrying `app_metadata.role` is enough — supabase-js never
 *    re-verifies the signature client-side.
 *  - `mockSession` fulfills the password-grant token endpoint with that JWT, so the
 *    login round-trip resolves and the guard renders the protected children.
 *
 * Security (threat T-16-01, accept): this mock lives ONLY in e2e/ test code; it is
 * never imported by src/. RLS (server) is the real gate and is unchanged. supabase-js
 * does not re-verify client-side, so the unsigned token is a sanctioned test-local mock.
 *
 * @see e2e/perfil.spec.ts (the makeJwt + page.route('**\/auth/v1/token**') source idiom)
 * @see src/components/RoleGuard.tsx (role gate) + src/features/auth/utils/extractRole.ts
 * @module e2e/fixtures/a11y-session
 */
import type { Page } from '@playwright/test'

/**
 * Role values accepted by `extractRole` (whitelist in
 * src/features/auth/utils/extractRole.ts). The JWT `app_metadata.role` must be one
 * of these for `RoleGuard` to render children.
 */
export type MockRole = 'candidato' | 'rh' | 'administrador'

/**
 * makeJwt — decode-valid (NOT signature-verifiable) JWT for mocked auth.
 *
 * supabase-js never re-verifies the signature client-side, so any base64url 3-part
 * token round-trips through the auth flow under mock interception. Copied verbatim
 * from e2e/perfil.spec.ts:35-39.
 */
export function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.fake-signature-not-verified`
}

/**
 * mockSession — fulfill the password-grant token endpoint with a JWT carrying
 * `app_metadata.role`, so the role-gated shell renders past `RoleGuard`.
 *
 * The caller still navigates (page.goto) and mocks any per-screen `**\/rest/v1/<table>**`
 * reads the screen needs to paint its shell. This helper only seeds the auth round-trip.
 *
 * @param page - the Playwright page under test
 * @param role - the JWT `app_metadata.role` to mock (candidato | rh | administrador)
 */
export async function mockSession(page: Page, role: MockRole): Promise<void> {
  const jwt = makeJwt({
    sub: 'a11y-test-uuid',
    email: 'a11y@beautysmile.com.br',
    // extractRole reads app_metadata.role from the DECODED token (RoleGuard gate).
    app_metadata: { role, provider: 'email' },
    exp: Math.floor(Date.now() / 1000) + 3600,
  })

  await page.route('**/auth/v1/token?grant_type=password', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: jwt,
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'a11y-test-uuid',
          email: 'a11y@beautysmile.com.br',
          // NOTE: role is intentionally NOT here — it lives only in the signed JWT
          // app_metadata (the Custom Access Token Hook injects it). extractRole reads
          // the decoded access_token, not user.app_metadata.
          app_metadata: { provider: 'email' },
        },
      }),
    }),
  )
}

/**
 * driveLogin — perform the mocked login round-trip from /auth/login so the auth store
 * hydrates `role` from the mocked token, then return. The caller navigates to the
 * target route afterwards. Mirrors the perfil.spec.ts Tier-1 flow.
 *
 * Kept separate from `mockSession` so a screen can register its rest/v1 data mocks
 * BEFORE the login navigation (route order matters in Playwright).
 *
 * @param page - the Playwright page under test
 */
export async function driveLogin(page: Page): Promise<void> {
  await page.goto('/auth/login')
  await page.locator('#email').fill('a11y@beautysmile.com.br')
  await page.locator('#email').blur()
  // CI-08: mock fill value only — the token endpoint is intercepted by mockSession,
  // so this never authenticates against real Supabase (not a real credential).
  await page.locator('#password, #senha').first().fill('mock-password-123')
  await page.locator('#password, #senha').first().blur()
  await page.getByRole('button', { name: /^Entrar$/ }).click()
}
