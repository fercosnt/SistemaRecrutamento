/**
 * Phase 22 / Plan 22-05 Task 2 — CI-08 no-hardcoded-test-credentials CI guard.
 *
 * Real test-account credentials (a login-able email + password) MUST NEVER live
 * in the repo — they are an Info-Disclosure surface and violate the CLAUDE.md hard
 * rule (no secrets in git). The E2E specs read them from env vars and skip-if-unset;
 * the real values live ONLY in `.env.test` (gitignored). This Vitest grep guard
 * scans everything under `e2e/` and FAILS the build the moment a real-account
 * credential literal reappears — so a copy/paste regression can never silently
 * reintroduce one.
 *
 * ── Where it runs ──
 * Rides ci.yml's EXISTING `unit` job via `npm run test:run` (the same step that
 * runs the rest of the Vitest suite). No new workflow — mirrors the
 * forbidden-strings.grep.test.ts / pitfall7.grep.test.ts precedent.
 *
 * ── Scan scope ──
 * SCAN_ROOTS = ['e2e'] — the only tree where the credentials were hardcoded. The
 * guard file itself lives under `src/__tests__/guards/`, NOT under e2e/, so its own
 * regex literal (which necessarily names the banned strings) is never scanned.
 * `node_modules` is skipped defensively. `.ts`, `.tsx` and `.md` are scanned so the
 * spec files, fixtures AND e2e/README.md are all covered.
 *
 * ── What is banned (real accounts only) ──
 * The legacy candidate account (`fernando@beautysmile.com.br` / `teste123`) and the
 * current `.env.test` accounts (`candidato.funil@teste.com` / `Candidato@2026`,
 * `e2e.admin@beautysmile.com.br` / `E2eAdmin.Bs2026`). The intentional
 * INVALID_CREDENTIALS negative literals (`invalido@teste.com`, `teste@teste.com`),
 * the fully-mocked fixture email (`a11y@beautysmile.com.br` — no real password), and
 * the dynamic cadastro email (`test+<ts>@beautysmile.com.br`) are NOT real accounts
 * and are deliberately NOT matched.
 *
 * @see src/__tests__/guards/forbidden-strings.grep.test.ts (structural analog)
 * @see .planning/phases/22-rede-de-testes-destravamento-varredura-de-honestidade/22-05-PLAN.md
 * @see .env.test.example (the documented, value-free key list)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: this file lives at src/__tests__/guards/no-hardcoded-test-creds.grep.test.ts
// — 3 levels deep from the repo root (guards → __tests__ → src → ROOT).
const ROOT = resolve(__dirname, '../../..')

// Only e2e/ is scanned — that is where the test-account credentials were hardcoded.
const SCAN_ROOTS = ['e2e'] as const

/**
 * Real test-account credential literals that must NEVER appear under e2e/.
 * Covers the legacy candidate creds AND the current .env.test accounts, so a
 * paste of EITHER generation is caught. The specific-prefix anchors
 * (`fernando@`, `candidato.funil@`, `e2e.admin@`) keep this from false-flagging
 * the legitimate mocked / dynamic / negative-path emails under e2e/.
 */
const HARDCODED_CREDS =
  /fernando@beautysmile|teste123|Candidato@2026|E2eAdmin|candidato\.funil@teste\.com|e2e\.admin@beautysmile\.com\.br/

// Real credential literals — each MUST match HARDCODED_CREDS (regex-correctness,
// filesystem-independent).
const BANNED_LITERALS = [
  'fernando@beautysmile.com.br',
  'teste123',
  'Candidato@2026',
  'E2eAdmin.Bs2026',
  'candidato.funil@teste.com',
  'e2e.admin@beautysmile.com.br',
] as const

// Literals that legitimately live under e2e/ and MUST NOT be flagged.
const ALLOWED_LITERALS = [
  'invalido@teste.com', // login-flow.spec.ts INVALID_CREDENTIALS (negative path)
  'teste@teste.com', // login-flow.spec.ts senha-vazia validation (negative path)
  'a11y@beautysmile.com.br', // fully-mocked a11y fixture email (no real password)
  'test+1700000000000@beautysmile.com.br', // cadastro dynamic unique email
  'candidato.mock@example.test', // perfil.spec.ts Tier-1 mock email
  'process.env.TEST_USER_EMAIL', // the env-read the guard promotes
] as const

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return /\.(ts|tsx|md)$/.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    // node_modules is out of scope; nothing else under e2e/ needs excluding
    // (this guard is NOT under e2e/, so its own literals are never scanned).
    if (entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}

describe('CI-08 — no hardcoded test credentials under e2e/', () => {
  it('no real test-account credential literal appears under e2e/', () => {
    const violations: { file: string; line: number; text: string }[] = []
    const files = SCAN_ROOTS.flatMap((p) => collectFiles(p))
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (HARDCODED_CREDS.test(text)) {
          violations.push({ file, line: idx + 1, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`).join('\n')
      throw new Error(
        `CI-08 — hardcoded test credential(s) under e2e/. Read from env + skip-if-unset ` +
          `instead (see .env.test.example):\n${msg}`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  it.each(BANNED_LITERALS)('HARDCODED_CREDS regex matches the banned literal "%s"', (lit) => {
    expect(HARDCODED_CREDS.test(lit)).toBe(true)
  })

  it.each(ALLOWED_LITERALS)(
    'HARDCODED_CREDS regex does NOT match the allowed literal "%s"',
    (lit) => {
      expect(HARDCODED_CREDS.test(lit)).toBe(false)
    },
  )

  it('scan reaches at least one file under e2e/ (roots resolve)', () => {
    const files = SCAN_ROOTS.flatMap((p) => collectFiles(p))
    expect(files.length).toBeGreaterThanOrEqual(1)
    // Every collected path lives under the e2e root — a walk regression cannot
    // silently stop reaching the specs.
    const e2eRoot = join(ROOT, 'e2e')
    expect(files.every((f) => f.startsWith(e2eRoot))).toBe(true)
  })

  it('the scan actually covers e2e/README.md (markdown coverage lock)', () => {
    const files = SCAN_ROOTS.flatMap((p) => collectFiles(p))
    expect(files.some((f) => f.endsWith('README.md'))).toBe(true)
  })
})
