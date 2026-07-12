/**
 * Phase 24 / Plan 24-05 (SEC-03) + Phase 26 / Plan 26-03 (2nd n8n leak) —
 * n8n bundle grep guard.
 *
 * The n8n webhook host + candidate PII must never ship in the PUBLIC bundle.
 *
 * ── SEC-03 (Phase 24) ──
 * Three client dispatch sites hardcoded the fernandocosta n8n.cloud host —
 * candidaturasService (VITE_N8N_NOVA_CANDIDATURA + VITE_N8N_STATUS_UPDATE) and
 * explicacaoService (VITE_N8N_REVISAO_DECISAO). `VITE_`-prefixed env vars are INLINED
 * into the shipped bundle at build time: a "configurable" URL is NOT a private one — it
 * reaches every browser and can be forged/enumerated. 24-05 moved that dispatch
 * server-side (pg_net + Vault, migration 20260706110005) and deleted the client
 * URL/VITE_/fetch.
 *
 * ── 2nd leak (Phase 26 / 26-03) ──
 * A SECOND, independent client leak lived in
 * `src/features/cadastro/services/n8nService.ts`: 18 hardcoded
 * `n8n.srv881294.hstgr.cloud` webhook URLs and a candidato-created dispatch helper that
 * shipped candidate PII (nome_completo / email / telefone / cpf) from the browser. That
 * subtree had ZERO runtime callers and is DELETED in 26-03; the candidato-created
 * dispatch is moved server-side (trigger `trg_n8n_novo_candidato`, migration
 * 20260712100004, id-only body). This guard DROPS the old 24-05 carve-out that exempted
 * the hstgr host and now BANS it — plus the PII payload field names when co-located with
 * an n8n host.
 *
 * This guard locks it in on TWO planes:
 *   1. BUILD ARTIFACT — after `npm run build`, no banned n8n host literal (n8n.cloud /
 *      fernandocosta / n8n.srv881294.hstgr.cloud) and no PII field name co-located with an
 *      n8n host appears anywhere in `build/`. This is the real teeth: it catches the host
 *      even if it re-enters through a transitive import or a VITE_ inline. The `build/`
 *      leg is SKIPPED when `build/` is absent (so a plain unit run needs no build), but it
 *      RUNS in CI where `npm run build` precedes the test.
 *   2. SOURCE — no banned n8n host, no VITE_N8N read, and no PII-with-host literal remains
 *      in `src/` (comment-aware).
 *
 * NO-FALSE-POSITIVE contract: the PII payload field names (e.g. `nome_completo`) are only
 * flagged when co-located with a recognizable n8n HOSTNAME. A bare `nome_completo` schema
 * field (formTypes.ts / candidatoSchema) with NO n8n host on the same text is NEVER
 * flagged — otherwise legitimate cadastro/form code would trip. A type identifier such as
 * `N8NWebhookPayload` (no `.tld` after `n8n`) is not a hostname and never matches.
 *
 * ── Why Vitest + node:fs (NOT child_process) ──
 * Mirrors the rh-console / forbidden-strings guards: a pure, read-only, deterministic
 * scan via the standard library. Literal `.includes()` for the exact host tokens; a tight
 * hostname regex only for the PII co-location context.
 *
 * @see src/__tests__/guards/rh-console.grep.test.ts (the node:fs + comment-aware analog)
 * @see supabase/migrations/20260706110005_sec03_n8n_serverside.sql (SEC-03 server-side dispatch)
 * @see supabase/migrations/20260712100004_n8n_novo_candidato.sql (26-03 server-side dispatch)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: this file lives at src/__tests__/guards/n8n-bundle.grep.test.ts
// — 3 levels deep from the repo root (guards → __tests__ → src → ROOT).
const ROOT = resolve(__dirname, '../../..')

/**
 * The forbidden n8n host literals. Exact substrings.
 *   - 'n8n.cloud' / 'fernandocosta' — the SEC-03 fernandocosta host.
 *   - 'n8n.srv881294.hstgr.cloud'   — the 2nd-leak host (26-03; carve-out dropped).
 */
const FORBIDDEN_BUILD_TOKENS = [
  'n8n.cloud',
  'fernandocosta',
  'n8n.srv881294.hstgr.cloud',
] as const

/**
 * The PII payload field names the deleted client dispatch helper shipped. Banned only
 * when co-located with an n8n host (see N8N_HOSTNAME_RE) — a bare schema field is exempt.
 */
const PII_PAYLOAD_TOKENS = ['nome_completo'] as const

/**
 * A recognizable n8n webhook HOSTNAME (`n8n<subdomains>.<tld>`). It catches
 * `n8n.srv881294.hstgr.cloud`, `app.n8n.cloud`, and any future
 * `n8n.*.cloud|com|net|io|dev|app` host — so a re-introduced payload is caught even if the
 * host is not one of the exact tokens above. It is tight enough that a type identifier
 * such as `N8NWebhookPayload` (no `.tld` after `n8n`) is not a hostname and never matches.
 */
const N8N_HOSTNAME_RE = /n8n[\w.-]*\.(?:cloud|com|net|io|dev|app)\b/i

/** The source-level token whose VITE_ inline leaks the URL into the bundle. */
const FORBIDDEN_SRC_TOKEN = 'VITE_N8N'

/** Text-ish build artifacts worth scanning (JS chunks carry the inlined URL). */
const BUILD_TEXT_EXT = /\.(js|mjs|cjs|css|html?|json|txt|map)$/i

/**
 * Returns the first forbidden token found in `text`, or `null`.
 *   1. An exact n8n host literal (n8n.cloud / fernandocosta / hstgr host) — always banned.
 *   2. A PII payload field name — banned ONLY when co-located with a recognizable n8n
 *      hostname (defense-in-depth against a re-introduced payload whose host is not one of
 *      the exact tokens). A bare PII schema field with no n8n host is NOT flagged.
 */
export function firstForbiddenBuildToken(text: string): string | null {
  for (const tok of FORBIDDEN_BUILD_TOKENS) {
    if (text.includes(tok)) return tok
  }
  if (N8N_HOSTNAME_RE.test(text)) {
    for (const tok of PII_PAYLOAD_TOKENS) {
      if (text.includes(tok)) return tok
    }
  }
  return null
}

/**
 * Comment-aware line filter (mirrors rh-console): a pure line/JSDoc comment cannot trip
 * the source guard, so this file's own prose mentioning the tokens is exempt.
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

describe('SEC-03 + 26-03 — n8n host + candidate PII are out of the public bundle', () => {
  it('build/ carries NO banned n8n host / PII-with-host literal (skipped if build/ absent)', () => {
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
        `n8n — a banned host / PII literal leaked into the build bundle:\n${msg}\n` +
          `Remove the client dispatch and route it server-side (pg_net + Vault).`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  it('src/ carries NO banned n8n host / PII-with-host literal (comment-aware)', () => {
    const files = collectFiles('src', /\.(ts|tsx)$/)
    const violations: { file: string; line: number; token: string; text: string }[] = []
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (isCommentLine(text)) return // comment-aware: prose mentioning a token is exempt
        const token = firstForbiddenBuildToken(text)
        if (token) {
          violations.push({ file: file.replace(`${ROOT}/`, ''), line: idx + 1, token, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  →  ${v.token}   ${v.text}`).join('\n')
      throw new Error(
        `n8n — a banned host / PII-with-host literal remains in src/:\n${msg}\n` +
          `Delete the client n8n subtree; the dispatch is server-side (trigger + Vault).`,
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

  it('bans each n8n host token + the hstgr host (26-03 carve-out dropped)', () => {
    // The fernandocosta URL contains the literal `n8n.cloud`.
    expect(firstForbiddenBuildToken('https://fernandocosta.app.n8n.cloud/webhook/x')).toBe(
      'n8n.cloud',
    )
    expect(firstForbiddenBuildToken('fernandocosta-anything')).toBe('fernandocosta')
    // 26-03: the hstgr host is now BANNED (was carved out in 24-05).
    expect(firstForbiddenBuildToken('https://n8n.srv881294.hstgr.cloud/webhook/y')).toBe(
      'n8n.srv881294.hstgr.cloud',
    )
  })

  it('bans PII co-located with an n8n host, but NOT a bare schema field (no-false-positive)', () => {
    // A NEW n8n host (not an exact token) + a PII field → the PII token is flagged.
    expect(firstForbiddenBuildToken('post("https://n8n.example.cloud", { nome_completo })')).toBe(
      'nome_completo',
    )
    // A bare PII schema field with NO n8n host → NOT flagged (legitimate cadastro/form code).
    expect(firstForbiddenBuildToken('  nome_completo: string  // cadastro schema field')).toBeNull()
    // The type identifier (no `.tld` hostname) is not a host → PII field NOT flagged.
    expect(
      firstForbiddenBuildToken('export interface N8NWebhookPayload { nome_completo: string }'),
    ).toBeNull()
    // Unrelated strings that merely contain "n8n"/"cloud" separately are fine.
    expect(firstForbiddenBuildToken('an n8n workflow on a cloud server')).toBeNull()
  })

  it('comment lines mentioning the tokens are exempt (comment-aware)', () => {
    expect(isCommentLine('// VITE_N8N in prose is fine')).toBe(true)
    expect(isCommentLine(' * n8n.srv881294.hstgr.cloud in a JSDoc block')).toBe(true)
    expect(isCommentLine('  const x = import.meta.env.VITE_N8N_FOO')).toBe(false)
  })

  it('scan resolves the src tree (sanity — path must not silently drift)', () => {
    const files = collectFiles('src', /\.(ts|tsx)$/)
    expect(files.length).toBeGreaterThan(50)
  })
})
