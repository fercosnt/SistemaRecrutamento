/**
 * B14 — Pitfall 7 redaction guard (T-03-03 regression gate).
 *
 * Scans Phase 3 auth surfaces for `console.*` calls that would leak
 * senha / password / access_token / refresh_token. Fails the test suite
 * on any match, ensuring future contributors cannot accidentally
 * re-introduce the leak Phase 1 had to remove.
 *
 * Why Vitest + node:fs (not child_process / execSync):
 *   - Per-RESEARCH §Pitfall 7: child_process is reserved for CLI tools.
 *     Vitest tests should read files directly via the standard library.
 *   - Pure read-only scan; no shell expansion; deterministic across
 *     macOS / Linux / Windows / CI runners.
 *
 * Maintenance contract (T-03-grep-test-false-negative):
 *   If new Phase 3 auth surfaces are added (new pages, new services,
 *   new hooks), append them to PHASE_3_AUTH_PATHS below. The sanity-check
 *   test asserts that the resolved file count remains >= 10 — if a future
 *   contributor accidentally drops a path, that count drops and the test
 *   fails loud.
 *
 * @see .planning/phases/03-login-recuperacao-senha/03-RESEARCH.md (§Pitfall 7)
 * @see .planning/phases/03-login-recuperacao-senha/03-VALIDATION.md (B14)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: this file lives at src/features/auth/utils/__tests__/pitfall7.grep.test.ts
// — 5 levels deep from the repo root.
const ROOT = resolve(__dirname, '../../../../..')

const PHASE_3_AUTH_PATHS = [
  'src/features/auth', // whole subtree (recursive)
  'src/components/pages/LoginCandidatoPage.tsx',
  'src/components/pages/LoginRHPage.tsx',
  'src/components/pages/EsqueciSenhaPage.tsx',
  'src/components/pages/RedefinirSenhaPage.tsx',
  'src/store/authStore.ts',
  'src/lib/supabase/client.ts',
] as const

// Phase 4 surfaces — vagas, candidatura, CV upload
const PHASE_4_VAGAS_PATHS = [
  'src/features/vagas/services/cvUploadService.ts',
  'src/features/vagas/services/candidaturasService.ts',
  'src/features/vagas/services/vagasService.ts',
  'src/features/vagas/hooks/useVagaPerguntas.ts',
  'src/features/vagas/schemas/candidaturaFormSchema.ts',
  'src/features/vagas/components',
  'src/components/pages/FormularioCandidaturaPage.tsx',
  'src/components/pages/VagaDetalhePage.tsx',
] as const

const ALL_PATHS = [...PHASE_3_AUTH_PATHS, ...PHASE_4_VAGAS_PATHS] as const

/**
 * Forbidden pattern — matches `console.<method>(...)` where the call
 * argument list (within ~80 chars) contains any of the leak tokens.
 * Tolerates multi-arg shapes like `console.error('[AUTH]', { senha })`.
 */
const FORBIDDEN =
  /console\.(log|error|warn|info|debug)[\s\S]{0,80}?(senha|password|access_token|refresh_token)/

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
      // Skip __tests__ — grep tests can LEGITIMATELY reference the token names
      // as patterns in their own assertions (this very file does so above).
      if (entry === '__tests__') continue
      out.push(...collectFiles(join(pathRel, entry)))
      continue
    }
    if (cst.isFile() && /\.(ts|tsx)$/.test(entry)) out.push(child)
  }
  return out
}

describe('B14 — Pitfall 7 redaction guard', () => {
  it('no console.* logs senha/password/access_token/refresh_token across Phase 3 + Phase 4 surfaces', () => {
    const violations: { file: string; line: number; text: string }[] = []
    const files = ALL_PATHS.flatMap((p) => collectFiles(p))
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
      throw new Error(`Pitfall 7 violations:\n${msg}`)
    }
    expect(violations).toHaveLength(0)
  })

  it('scan covers at least 10 Phase 3 source files (sanity check)', () => {
    const files = PHASE_3_AUTH_PATHS.flatMap((p) => collectFiles(p))
    expect(files.length).toBeGreaterThanOrEqual(10)
  })

  it('Phase 4 path-collection is tolerant of missing files (Wave 0 — sources land Wave 1+)', () => {
    // collectFiles graceful-skips missing files; this assertion just guards against
    // a future regression where a typo in PHASE_4_VAGAS_PATHS makes collectFiles throw.
    const files = PHASE_4_VAGAS_PATHS.flatMap((p) => collectFiles(p))
    expect(files.length).toBeGreaterThanOrEqual(0)
  })

  it('Phase 4 — no console.* logs signed URL tokens across vagas surfaces', () => {
    const FORBIDDEN_PHASE_4 =
      /console\.(log|error|warn|info|debug)[\s\S]{0,80}?(signedurl|signed_url|signedURL|\?token=|curriculo_nome|file\.name)/i
    const violations: { file: string; line: number; text: string }[] = []
    const files = PHASE_4_VAGAS_PATHS.flatMap((p) => collectFiles(p))
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (FORBIDDEN_PHASE_4.test(text)) {
          violations.push({ file, line: idx + 1, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`).join('\n')
      throw new Error(`Pitfall 7 (Phase 4 signed URL): violations:\n${msg}`)
    }
    expect(violations).toHaveLength(0)
  })
})
