/**
 * DevNav DEV-gate grep guard — Phase 5 Wave 0 scaffold (Plan 05-01 Task 3).
 *
 * HARD-06 / D-10 regression gate. Asserts that the DevNavigationMenu in App.tsx
 * stays wrapped in an `import.meta.env.DEV && ...` gate, so the dev-only navigation
 * shortcut can NEVER ship to a production bundle. Fails loud if a future
 * contributor removes the gate.
 *
 * Why node:fs + regex (mirrors src/features/auth/utils/__tests__/pitfall7.grep.test.ts):
 *   - Pure read-only scan; deterministic across macOS / Linux / CI.
 *   - No shell expansion, no child_process.
 *
 * PATH NOTE (Plan 05-01 deviation, Rule 3): the PLAN prescribed
 * `tests/guards/devnav-gate.grep.test.ts`, but vitest.config.ts `include` is
 * `**\/__tests__/**\/*.{test,spec}.{ts,tsx}` — a `tests/guards/...` path is NOT
 * collected by the runner, so the verify command `npm run test:run -- devnav-gate`
 * would find zero tests. Placed under `src/__tests__/guards/` to match the include
 * glob AND the established pitfall7.grep precedent (which lives in a `__tests__/`
 * dir for the same reason).
 *
 * @see .planning/phases/05-perfil-hardening-mvp/05-PATTERNS.md (§MODIFY src/App.tsx — HARD-06/D-10)
 * @see src/features/auth/utils/__tests__/pitfall7.grep.test.ts (the grep-guard idiom)
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Repo root: this file lives at src/__tests__/guards/devnav-gate.grep.test.ts
// — 3 levels deep from the repo root.
const ROOT = resolve(__dirname, '../../..')
const APP_TSX = resolve(ROOT, 'src/App.tsx')

// Matches `import.meta.env.DEV && <DevNavigationMenu` with arbitrary whitespace.
const DEVNAV_GATE = /import\.meta\.env\.DEV\s*&&\s*<DevNavigationMenu/

describe('HARD-06 — DevNav DEV-gate grep guard', () => {
  it('App.tsx renders DevNavigationMenu only behind an import.meta.env.DEV gate', () => {
    const source = readFileSync(APP_TSX, 'utf-8')
    expect(DEVNAV_GATE.test(source)).toBe(true)
  })
})
