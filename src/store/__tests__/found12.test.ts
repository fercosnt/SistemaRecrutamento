/**
 * FOUND-12 grep guard — Phase 4.1 Wave 0 RED scaffold (Plan 04.1-01).
 *
 * Asserts that `src/store/adminAuthStore.ts` has been DELETED and that no
 * source file under src/ imports from `@/store/adminAuthStore` or any
 * relative path resolving to it.
 *
 * Why RED today: the file still exists and 2 import sites remain (App.tsx,
 * useSessionTimeout.ts). Plan 04 (Phase 4.1 Wave 4) executes the literal
 * close: migrate consumers + delete file. After Plan 04, this test goes
 * GREEN.
 *
 * Pattern: filesystem grep guard via node:fs (no shell), replicating
 * src/features/auth/utils/__tests__/pitfall7.grep.test.ts (B14).
 *
 * @see .planning/phases/04-1-auth-hydration-fix/04.1-PATTERNS.md (Pattern G)
 * @see .planning/REQUIREMENTS.md (FOUND-12)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// This file lives at src/store/__tests__/found12.test.ts — 3 levels deep
const ROOT = resolve(__dirname, '../../..')

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return [full]
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    const child = join(full, entry)
    const cst = statSync(child)
    if (cst.isDirectory()) {
      if (entry === '__tests__') continue
      if (entry === 'node_modules') continue
      out.push(...collectFiles(join(pathRel, entry)))
      continue
    }
    if (cst.isFile() && /\.(ts|tsx)$/.test(entry)) out.push(child)
  }
  return out
}

describe('FOUND-12 — adminAuthStore.ts deletion (Phase 4.1 literal close)', () => {
  it('src/store/adminAuthStore.ts has been deleted', () => {
    // RED in Wave 0: file still exists. GREEN after Plan 04 deletes it.
    expect(existsSync(resolve(ROOT, 'src/store/adminAuthStore.ts'))).toBe(false)
  })

  it('no source files import from @/store/adminAuthStore or ./store/adminAuthStore', () => {
    // RED in Wave 0: 2 import sites still exist (App.tsx, useSessionTimeout.ts).
    // GREEN after Plan 04 migrates imports.
    const violations: { file: string; line: number; text: string }[] = []
    const files = collectFiles('src')
    const FORBIDDEN = /from\s+['"](@\/store\/adminAuthStore|\.\.?\/.*store\/adminAuthStore)['"]/
    for (const file of files) {
      // Skip the shim itself if not yet deleted (it self-references nothing).
      if (file.endsWith('adminAuthStore.ts')) continue
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (FORBIDDEN.test(text)) {
          violations.push({ file, line: idx + 1, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const formatted = violations.map((v) => `${v.file}:${v.line}: ${v.text}`).join('\n')
      throw new Error(`adminAuthStore imports still present:\n${formatted}`)
    }
    expect(violations.length).toBe(0)
  })
})
