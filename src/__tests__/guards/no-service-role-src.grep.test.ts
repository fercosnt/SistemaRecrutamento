/**
 * Phase 28 / Plan 28-02 Task 2 — SEG-01 client-bundle tripwire: no service_role /
 * privileged Supabase client under src/.
 *
 * The project's load-bearing security invariant: the service_role key (and any admin
 * client built with it) hands FULL, RLS-bypassing DB power to whoever holds it. It must
 * live ONLY server-side (Edge Functions). If it ever compiles into `src/` it ships in the
 * public browser bundle — a total compromise. This Vitest grep guard scans `src/` and
 * FAILS the build the moment a service_role key / privileged `createClient` construction
 * appears in product source.
 *
 * ── GREEN now, and it must stay green ──
 * Unlike the RED harness sibling (28-02 Task 1), this guard is GREEN on the current tree:
 * the only `service_role` mentions under src/ are doc-comment prose (avaliacaoService.ts,
 * cadastroService.ts, lib/supabase/client.ts), all of which the comment-aware strip
 * exempts. `client.ts` already documents that `supabaseAdmin` was REMOVED. This guard is
 * the standing regression tripwire that keeps it that way.
 *
 * ── Server-side is legitimate — do NOT scan supabase/functions ──
 * Edge Functions LEGITIMATELY use the service_role key (that is the whole point of the
 * SEG-01 authenticate-THEN-authorize EF). This guard scans ONLY `src/` — the shipped
 * client bundle. Never point it at supabase/functions.
 *
 * ── Why Vitest + node:fs (NOT child_process) ──
 * Mirrors rh-console / n8n-bundle / forbidden-strings guards: a pure, read-only,
 * deterministic scan via the standard library. No shell expansion. `__tests__` subtrees
 * are skipped so a guard test naming the token as a regex literal cannot self-trip.
 *
 * @see src/__tests__/guards/rh-console.grep.test.ts (the node:fs + comment-aware analog)
 * @see src/__tests__/guards/n8n-bundle.grep.test.ts (the co-located-token idiom)
 * @see src/lib/supabase/client.ts (anon-only client — supabaseAdmin REMOVED)
 * @see .planning/phases/28-gest-o-de-usu-rios-rh-n-cleo-seguro/28-CONTEXT.md (SEG-01 invariant)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: this file lives at src/__tests__/guards/no-service-role-src.grep.test.ts
// — 3 levels deep from the repo root (guards → __tests__ → src → ROOT).
const ROOT = resolve(__dirname, '../../..')

/**
 * Forbidden identifiers (SEG-01). A service_role key or a privileged client under src/.
 *   - SUPABASE_SERVICE_ROLE_KEY — the env-var name (VITE_/import.meta.env would inline it).
 *   - service_role              — the bare Postgres privileged-role token (case-insensitive
 *                                 standalone; the `_`-word boundaries keep it from matching
 *                                 inside SUPABASE_SERVICE_ROLE_KEY, which is caught above).
 *   - serviceRoleKey            — the common camelCase identifier for the key.
 */
const FORBIDDEN_TOKENS: { name: string; re: RegExp }[] = [
  { name: 'SUPABASE_SERVICE_ROLE_KEY', re: /\bSUPABASE_SERVICE_ROLE_KEY\b/ },
  { name: 'service_role', re: /\bservice_role\b/i },
  { name: 'serviceRoleKey', re: /\bserviceRoleKey\b/ },
]

/**
 * A `createClient(...)` construction that passes a service-role/admin key on the same
 * line — defense in depth against a key smuggled under a non-obvious name. A plain
 * `createClient(url, anonKey)` (or the bare import) is NOT flagged.
 */
const CREATE_CLIENT_ADMIN_RE = /createClient\s*\([^)]*(service_?role|serviceRole|SERVICE_ROLE)/i

/**
 * Returns the name of the first forbidden token found in `text`, or null. Exported so the
 * positive/negative contract is unit-asserted in-file (a bare `role`/anon-key line is safe).
 */
export function firstServiceRoleViolation(text: string): string | null {
  for (const { name, re } of FORBIDDEN_TOKENS) {
    if (re.test(text)) return name
  }
  if (CREATE_CLIENT_ADMIN_RE.test(text)) return 'createClient(service_role)'
  return null
}

/**
 * Comment-aware line filter (mirrors rh-console / n8n-bundle): a pure line/JSDoc comment
 * cannot trip the guard, so legitimate doc-comment prose mentioning `service_role`
 * (client.ts, cadastroService.ts, avaliacaoService.ts) — and this file's own prose — is
 * exempt. Conservative: a code line with a TRAILING comment keeps its code portion.
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
    // Skip __tests__ (a guard test names the token as a regex literal) and node_modules.
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}

describe('SEG-01 — no service_role / privileged client in the shipped src/ bundle', () => {
  it('src/ carries NO service_role key or privileged createClient (comment-aware, GREEN)', () => {
    const files = collectFiles('src')
    const violations: { file: string; line: number; token: string; text: string }[] = []
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (isCommentLine(text)) return // comment-aware: doc/line comments cannot trip the gate
        const token = firstServiceRoleViolation(text)
        if (token) {
          violations.push({ file: file.replace(`${ROOT}/`, ''), line: idx + 1, token, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  →  ${v.token}   ${v.text}`).join('\n')
      throw new Error(
        `SEG-01 — service_role / privileged client must NEVER ship in the client bundle:\n${msg}\n` +
          `Move every privileged write server-side (Edge Function service_role).`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  it('flags a service_role key / privileged createClient (positive contract)', () => {
    expect(firstServiceRoleViolation("const x = 'service_role'")).toBe('service_role')
    expect(firstServiceRoleViolation('const k = import.meta.env.SUPABASE_SERVICE_ROLE_KEY')).toBe(
      'SUPABASE_SERVICE_ROLE_KEY',
    )
    expect(firstServiceRoleViolation('const admin = createClient(url, serviceRoleKey)')).toBe(
      'serviceRoleKey',
    )
    // camelCase `serviceRole` is not one of the bare FORBIDDEN_TOKENS, so this exercises
    // the createClient co-location leg specifically (a key smuggled under a non-obvious name).
    expect(firstServiceRoleViolation('const admin = createClient(SUPABASE_URL, serviceRole)')).toBe(
      'createClient(service_role)',
    )
  })

  it('does NOT flag anon key, a bare `role` field, or a plain createClient import (no false positive)', () => {
    expect(firstServiceRoleViolation('const anon = import.meta.env.VITE_SUPABASE_ANON_KEY')).toBeNull()
    expect(firstServiceRoleViolation('const papel = user.role')).toBeNull()
    expect(firstServiceRoleViolation("import { createClient } from '@supabase/supabase-js'")).toBeNull()
    expect(firstServiceRoleViolation('createClient(SUPABASE_URL, SUPABASE_ANON_KEY)')).toBeNull()
  })

  it('comment lines mentioning service_role are exempt (comment-aware)', () => {
    expect(isCommentLine('// service_role must never be in client code')).toBe(true)
    expect(isCommentLine(' * the EF (service_role) reads it server-side')).toBe(true)
    expect(isCommentLine("  const key = process.env.SUPABASE_SERVICE_ROLE_KEY")).toBe(false)
  })

  it('scan resolves the src tree (sanity — path must not silently drift)', () => {
    const files = collectFiles('src')
    expect(files.length).toBeGreaterThan(50)
  })
})
