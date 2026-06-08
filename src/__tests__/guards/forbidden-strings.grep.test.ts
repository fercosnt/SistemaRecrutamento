/**
 * Phase 9 / Plan 09-01 Task 1 — LGPD-04 / RNF-12 forbidden-string CI guard.
 *
 * Beauty Smile's product language is "avaliação comportamental/cognitiva".
 * It MUST NEVER ship the clinical/psychometric framing the law (LGPD) and the
 * product spec (RNF-12) forbid. This Vitest grep test scans the committed
 * product-facing source (`src/`) and the Edge Functions (`supabase/functions/`)
 * and FAILS the build the moment any of the 5 forbidden terms appears:
 *
 *   1. "teste psicológico"   (teste\s+psicol[oó]gico)
 *   2. "teste psicotécnico"  (teste\s+psicot[eé]cnico)
 *   3. "psicotécnico"        (psicot[eé]cnico)
 *   4. "laudo psicológico"   (laudo\s+psicol[oó]gico)
 *   5. "psicólogo"           (psic[oó]logo)
 *
 * Replacement product copy: "avaliação comportamental/cognitiva".
 *
 * ── Where it runs ──
 * This guard rides ci.yml's EXISTING `unit` job via `npm run test:run`
 * (the same step that runs the rest of the Vitest suite). No new workflow is
 * added — locked decision (CONTEXT.md Area 3): "Vitest grep test reusing the
 * pitfall7.grep.test.ts precedent. Runs in existing CI, fails the build."
 *
 * ── Scan scope (locked) ──
 * SCAN_ROOTS = ['src', 'supabase/functions'] — product-facing code + Edge
 * Functions only. `docs/` and `.planning/` are EXCLUDED: PRD/internal content
 * legitimately cites the forbidden terms when explaining why they are banned.
 *
 * ── Self-exclusion (load-bearing) ──
 * `__tests__` and `node_modules` are skipped in the recursive walk, so this
 * guard's OWN regex literal (which necessarily contains the forbidden terms)
 * does not trip it. Same self-exclusion logic as pitfall7.grep.test.ts.
 *
 * @see src/features/auth/utils/__tests__/pitfall7.grep.test.ts (exact analog)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-CONTEXT.md (Area 3)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (§Code Examples — LGPD-04)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: this file lives at src/__tests__/guards/forbidden-strings.grep.test.ts
// — 3 levels deep from the repo root (guards → __tests__ → src → ROOT).
const ROOT = resolve(__dirname, '../../..')

// Locked scan scope: product-facing source + Edge Functions only.
// docs/ and .planning/ are excluded — internal PRD/spec content can cite the terms.
const SCAN_ROOTS = ['src', 'supabase/functions'] as const

/**
 * LGPD-04 / RNF-12 forbidden product copy. Matches the 5 banned terms with
 * accent tolerance (o/ó, e/é) so an un-accented slip is still caught.
 */
const FORBIDDEN =
  /teste\s+psicol[oó]gico|teste\s+psicot[eé]cnico|psicot[eé]cnico|laudo\s+psicol[oó]gico|psic[oó]logo/i

// The 5 RNF-12 terms, used by the regex-correctness sub-test. Each MUST match
// FORBIDDEN — proves the regex is correct independent of the filesystem scan.
const RNF_12_TERMS = [
  'teste psicológico',
  'teste psicotécnico',
  'psicotécnico',
  'laudo psicológico',
  'psicólogo',
] as const

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return /\.(ts|tsx)$/.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    // Skip __tests__ (grep guards legitimately name the terms as regex literals,
    // including THIS file) and node_modules (vendored deps are out of scope).
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}

describe('LGPD-04 / RNF-12 — forbidden psychological-test strings', () => {
  it('no forbidden term appears in src/ or supabase/functions/', () => {
    const violations: { file: string; line: number; text: string }[] = []
    const files = SCAN_ROOTS.flatMap((p) => collectFiles(p))
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (FORBIDDEN.test(text)) {
          violations.push({ file, line: idx + 1, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`).join('\n')
      throw new Error(
        `LGPD-04 violations — replace with "avaliação comportamental/cognitiva":\n${msg}`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  it.each(RNF_12_TERMS)('FORBIDDEN regex matches the RNF-12 term "%s"', (term) => {
    // Reset lastIndex defensively (regex has no /g flag, but be explicit).
    expect(FORBIDDEN.test(term)).toBe(true)
  })

  it('FORBIDDEN regex does NOT match the approved replacement copy', () => {
    expect(FORBIDDEN.test('avaliação comportamental/cognitiva')).toBe(false)
  })

  it('scan covers at least one source file (sanity check — roots resolve)', () => {
    const files = SCAN_ROOTS.flatMap((p) => collectFiles(p))
    expect(files.length).toBeGreaterThanOrEqual(1)
  })
})
