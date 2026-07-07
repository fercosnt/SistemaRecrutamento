/**
 * Phase 16 / Plan 16-01 Task 2 — FX-14 RH-path console.* grep guard.
 *
 * Beauty Smile's RH path must not ship debug logging. Per the project's Pitfall-7
 * redaction discipline (and the Phase-16 FX-14 cleanup), an RH-facing surface that calls
 * `console.log/debug/info/warn` can leak operational state (and incidental PII) into the
 * browser console. This Vitest grep test scans the RH-path surfaces and FAILS the build
 * the moment any `console.(log|debug|info|warn)` call appears in product source.
 *
 * ── CALIBRATED RED (Wave-0 contract, smoke-runtime precedent) ──
 * On the current tree this guard is RED: PerfilCandidatoRHPage.tsx and SuporteRHPage.tsx
 * carry the 6 confirmed debug `console.log` sites (Perfil ~428/432/436/485/490, Suporte
 * ~102). That failure IS the FX-14 contract — the cleanup plan removes those calls and
 * flips this guard GREEN. Do NOT "fix" by loosening the regex; remove the console calls.
 *
 * ── Why Vitest + node:fs (NOT child_process) ──
 * Per RESEARCH §Pitfall 7 / the pitfall7.grep.test.ts precedent: child_process is reserved
 * for CLI tools. Vitest grep guards read files directly via the standard library — a pure,
 * read-only, deterministic scan with no shell expansion. This file mirrors that exact idiom.
 *
 * ── Comment-aware (load-bearing) ──
 * Lines that are pure line-comments (slash-slash) or JSDoc/block-comment body lines
 * (starting with an asterisk or a slash-asterisk opener / closer) are stripped before
 * the forbidden-pattern test, so a doc-comment that legitimately mentions the word
 * "console" (including THIS file's own prose) cannot self-invalidate the gate or produce a
 * false positive. `__tests__` subtrees are skipped in the recursive walk for the same
 * reason (a guard test names the token as a regex literal).
 *
 * @see src/features/auth/utils/__tests__/pitfall7.grep.test.ts (the exact node:fs analog)
 * @see .planning/phases/16-compliance-a11y-hardening/16-UI-SPEC.md (§3c FX-14)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: this file lives at src/__tests__/guards/rh-console.grep.test.ts
// — 3 levels deep from the repo root (guards → __tests__ → src → ROOT).
const ROOT = resolve(__dirname, '../../..')

/**
 * RH-path debug-log surfaces (FX-14). Explicit page files + the recursive RH feature
 * dirs (decisao / entrevista / triagem). Recursive entries are scanned whole; the walk
 * graceful-skips `__tests__` and any missing path (so a future restructure fails the
 * sanity-count rather than throwing).
 */
const RH_PATH_FILES = [
  'src/components/pages/PerfilCandidatoRHPage.tsx',
  'src/components/pages/SuporteRHPage.tsx',
  // SEC-11 (Phase 24 / 24-06): ConfiguracoesPage leaked a candidate email via
  // console.log (`Enviando email de redefinição para:`) and MeuPerfilPage logged
  // RH profile data. Their operational console.log calls were stripped; adding both
  // here locks the guard so a regression re-fails.
  'src/components/pages/ConfiguracoesPage.tsx',
  'src/components/pages/MeuPerfilPage.tsx',
  'src/features/decisao', // whole subtree (recursive)
  'src/features/entrevista', // whole subtree (recursive)
  'src/features/triagem', // whole subtree (recursive)
] as const

/**
 * Forbidden pattern — a debug console call on the RH path. We deliberately do NOT
 * forbid `console.error` (genuine error reporting is acceptable); FX-14 targets the
 * debug-noise family: log / debug / info / warn.
 */
const FORBIDDEN_CONSOLE = /console\.(log|debug|info|warn)\s*\(/

/**
 * Strip a single line of its comment content so a doc-comment mentioning "console"
 * cannot trip the guard. A line is treated as a non-code comment line and skipped if,
 * after trimming, it begins with a line-comment opener, an asterisk JSDoc-body marker,
 * or a block-comment opener / closer. Mirrors the pitfall7 guard's comment discipline;
 * conservative — a code line with a trailing comment keeps its code portion since it
 * does not START with a comment marker.
 */
function isCommentLine(line: string): boolean {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/')
}

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return /\.(ts|tsx)$/.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    // Skip __tests__ (grep guards legitimately name the token as a regex literal) and
    // node_modules (never present under src, but defensive).
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}

describe('FX-14 — RH-path console.* grep guard', () => {
  it('no console.(log|debug|info|warn) on the RH path (RED until FX-14 cleanup lands)', () => {
    const violations: { file: string; line: number; text: string }[] = []
    const files = RH_PATH_FILES.flatMap((p) => collectFiles(p))
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (isCommentLine(text)) return // comment-aware: doc/line comments cannot trip the gate
        if (FORBIDDEN_CONSOLE.test(text)) {
          violations.push({ file: file.replace(`${ROOT}/`, ''), line: idx + 1, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`).join('\n')
      throw new Error(
        `FX-14 — remove debug console.* on the RH path (log/debug/info/warn):\n${msg}`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  it('FORBIDDEN_CONSOLE matches a debug call but NOT console.error', () => {
    expect(FORBIDDEN_CONSOLE.test("console.log('x')")).toBe(true)
    expect(FORBIDDEN_CONSOLE.test('console.debug(y)')).toBe(true)
    expect(FORBIDDEN_CONSOLE.test('console.info(z)')).toBe(true)
    expect(FORBIDDEN_CONSOLE.test('console.warn(w)')).toBe(true)
    expect(FORBIDDEN_CONSOLE.test("console.error('ok to keep')")).toBe(false)
  })

  it('comment lines mentioning console are exempt (comment-aware)', () => {
    expect(isCommentLine('// console.log here is just prose')).toBe(true)
    expect(isCommentLine(' * console.debug in a JSDoc block')).toBe(true)
    expect(isCommentLine("  console.log('real code')")).toBe(false)
  })

  it('scan resolves at least 2 RH-path files (sanity check — paths must not silently drift)', () => {
    const files = RH_PATH_FILES.flatMap((p) => collectFiles(p))
    // PerfilCandidatoRHPage.tsx + SuporteRHPage.tsx are the two always-present anchors;
    // the feature dirs add more. If a future path typo drops below 2, this fails loud.
    expect(files.length).toBeGreaterThanOrEqual(2)
  })
})
