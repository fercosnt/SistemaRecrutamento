/**
 * Phase 24 / Plan 24-05 Task 3 — SEC-03 n8n-URL build-artifact grep guard.
 *
 * The n8n webhook URL must never ship in the PUBLIC bundle. Three client dispatch
 * sites hardcoded it — candidaturasService (VITE_N8N_NOVA_CANDIDATURA +
 * VITE_N8N_STATUS_UPDATE) and explicacaoService (VITE_N8N_REVISAO_DECISAO). Crucially,
 * `VITE_`-prefixed env vars are INLINED into the shipped bundle at build time
 * (RESEARCH Pitfall 5): a "configurable" URL is NOT a private one — it is transmitted
 * to every browser and can be forged/enumerated. 24-05 moves the dispatch server-side
 * (pg_net + Vault, migration 20260706110005) and deletes all client URL/VITE_/fetch.
 *
 * This guard locks that in on TWO planes:
 *   1. BUILD ARTIFACT — after `npm run build`, no `n8n.cloud` / `fernandocosta` literal
 *      appears anywhere in `build/`. This is the real teeth: it catches the URL even if
 *      it re-enters through a transitive import or a VITE_ inline. The `build/` leg is
 *      SKIPPED when `build/` is absent (so a plain unit run does not require a build),
 *      but it RUNS in CI where `npm run build` precedes the test.
 *   2. SOURCE — no `VITE_N8N` token remains in `src/` (comment-aware): the VITE_ read is
 *      what inlines the URL, so its absence is the source-level invariant.
 *
 * SCOPE NOTE: the tokens are `n8n.cloud` and `fernandocosta` — the SEC-03 fernandocosta
 * n8n.cloud host. A DIFFERENT, pre-existing hardcoded n8n host lives in
 * `src/features/cadastro/services/n8nService.ts` (`n8n.srv881294.hstgr.cloud`) — that is
 * OUT OF SCOPE for 24-05 (tracked in deferred-items) and does NOT contain either literal
 * token, so this guard neither covers nor false-flags it.
 *
 * ── Why Vitest + node:fs (NOT child_process) ──
 * Mirrors the rh-console / forbidden-strings guards: a pure, read-only, deterministic
 * scan via the standard library. Literal `.includes()` (not regex) so the tokens match
 * as exact substrings — `n8n.cloud` matches `...app.n8n.cloud/...` but NOT the
 * unrelated `n8n.srv881294.hstgr.cloud`.
 *
 * @see src/__tests__/guards/rh-console.grep.test.ts (the node:fs + comment-aware analog)
 * @see supabase/migrations/20260706110005_sec03_n8n_serverside.sql (the server-side dispatch)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: this file lives at src/__tests__/guards/n8n-bundle.grep.test.ts
// — 3 levels deep from the repo root (guards → __tests__ → src → ROOT).
const ROOT = resolve(__dirname, '../../..')

/** The forbidden n8n URL literals (SEC-03 fernandocosta n8n.cloud host). Exact substrings. */
const FORBIDDEN_BUILD_TOKENS = ['n8n.cloud', 'fernandocosta'] as const

/** The source-level token whose VITE_ inline leaks the URL into the bundle. */
const FORBIDDEN_SRC_TOKEN = 'VITE_N8N'

/** Text-ish build artifacts worth scanning (JS chunks carry the inlined URL). */
const BUILD_TEXT_EXT = /\.(js|mjs|cjs|css|html?|json|txt|map)$/i

/**
 * Returns the first forbidden n8n URL token found in `text`, or `null`. Literal
 * substring match (not regex) — `n8n.cloud` matches the fernandocosta URL but never
 * the unrelated `n8n.srv881294.hstgr.cloud`.
 */
export function firstForbiddenBuildToken(text: string): string | null {
  for (const tok of FORBIDDEN_BUILD_TOKENS) {
    if (text.includes(tok)) return tok
  }
  return null
}

/**
 * Comment-aware line filter (mirrors rh-console): a pure line/JSDoc comment cannot trip
 * the source guard, so this file's own prose mentioning `VITE_N8N` is exempt.
 */
function isCommentLine(line: string): boolean {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/')
}

function collectFiles(pathRel: string, extRe: RegExp): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return extRe.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry), extRe))
  }
  return out
}

describe('SEC-03 — n8n URL is out of the public bundle', () => {
  it('build/ carries NO n8n.cloud|fernandocosta literal (skipped if build/ absent)', () => {
    // The build/ leg is the real teeth: it runs in CI (build precedes test). When build/
    // is absent (plain unit run) collectFiles returns [] → 0 violations → green.
    const files = collectFiles('build', BUILD_TEXT_EXT)
    const violations: { file: string; token: string }[] = []
    for (const file of files) {
      const token = firstForbiddenBuildToken(readFileSync(file, 'utf-8'))
      if (token) violations.push({ file: file.replace(`${ROOT}/`, ''), token })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}  →  ${v.token}`).join('\n')
      throw new Error(
        `SEC-03 — the n8n webhook URL leaked into the build bundle:\n${msg}\n` +
          `Remove the client dispatch and route it server-side (pg_net + Vault).`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  it('src/ carries NO VITE_N8N token (comment-aware)', () => {
    const files = collectFiles('src', /\.(ts|tsx)$/)
    const violations: { file: string; line: number; text: string }[] = []
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (isCommentLine(text)) return // comment-aware: prose mentioning VITE_N8N is exempt
        if (text.includes(FORBIDDEN_SRC_TOKEN)) {
          violations.push({ file: file.replace(`${ROOT}/`, ''), line: idx + 1, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`).join('\n')
      throw new Error(`SEC-03 — remove the VITE_N8N read (it inlines the URL):\n${msg}`)
    }
    expect(violations).toHaveLength(0)
  })

  it('no-false-positive: the token match is an exact substring, not a broad n8n match', () => {
    // The fernandocosta URL contains the literal `n8n.cloud`.
    expect(firstForbiddenBuildToken('https://fernandocosta.app.n8n.cloud/webhook/x')).toBe(
      'n8n.cloud',
    )
    expect(firstForbiddenBuildToken('fernandocosta-anything')).toBe('fernandocosta')
    // The OUT-OF-SCOPE hstgr host must NOT trip the guard (no `n8n.cloud` substring).
    expect(firstForbiddenBuildToken('https://n8n.srv881294.hstgr.cloud/webhook/y')).toBeNull()
    // Unrelated strings that merely contain "n8n" or "cloud" separately are fine.
    expect(firstForbiddenBuildToken('an n8n workflow on a cloud server')).toBeNull()
  })

  it('comment lines mentioning VITE_N8N are exempt (comment-aware)', () => {
    expect(isCommentLine('// VITE_N8N in prose is fine')).toBe(true)
    expect(isCommentLine(' * VITE_N8N in a JSDoc block')).toBe(true)
    expect(isCommentLine("  const x = import.meta.env.VITE_N8N_FOO")).toBe(false)
  })

  it('scan resolves the src tree (sanity — path must not silently drift)', () => {
    const files = collectFiles('src', /\.(ts|tsx)$/)
    expect(files.length).toBeGreaterThan(50)
  })
})
