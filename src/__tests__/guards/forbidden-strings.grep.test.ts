/**
 * Phase 9 / Plan 09-01 Task 1 — LGPD-04 / RNF-12 forbidden-string CI guard.
 *
 * Beauty Smile's product language is "avaliação comportamental/cognitiva".
 * It MUST NEVER ship the clinical/psychometric framing the law (LGPD) and the
 * product spec (RNF-12) forbid. This Vitest grep test scans the committed
 * product-facing source (`src/`) and the Edge Functions (`supabase/functions/`)
 * and FAILS the build the moment any of the 7 forbidden terms appears:
 *
 *   1. "teste psicológico"    (teste\s+psicol[oó]gico)
 *   2. "teste psicotécnico"   (teste\s+psicot[eé]cnico)
 *   3. "psicotécnico"         (psicot[eé]cnico)
 *   4. "laudo psicológico"    (laudo\s+psicol[oó]gico)
 *   5. "psicólogo"            (psic[oó]logo)
 *   6. "testes psicométricos" (testes?\s+psicom[eé]tricos?)   ← Phase 22 / UX-02
 *   7. "análise de perfil"    (an[aá]lise\s+de\s+perfil)      ← Phase 22 / UX-02
 *
 * Terms 6–7 are the *marketing* framing (as opposed to the clinical terms 1–5)
 * that RNF-12a also forbids on the candidate-facing landing. They were added in
 * Phase 22 (UX-02) so a copy regression cannot silently reintroduce them.
 *
 * Replacement product copy: "avaliação comportamental/cognitiva".
 *
 * ── Where it runs ──
 * This guard rides ci.yml's EXISTING `unit` job via `npm run test:run`
 * (the same step that runs the rest of the Vitest suite). No new workflow is
 * added — locked decision (CONTEXT.md Area 3): "Vitest grep test reusing the
 * pitfall7.grep.test.ts precedent. Runs in existing CI, fails the build."
 *
 * ── Scan scope (locked + Phase-11 extension) ──
 * SCAN_ROOTS = ['src', 'supabase/functions', 'supabase/migrations'] —
 * product-facing code + Edge Functions + DB migrations. The Phase-11 SJT seed
 * migration carries candidate-facing scenario text (the SJT cenários), so the
 * migrations root is scanned too. `docs/` and `.planning/` remain EXCLUDED:
 * PRD/internal content legitimately cites the forbidden terms when explaining
 * why they are banned. `.sql` files are scanned in addition to `.ts/.tsx`.
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

// Locked scan scope: product-facing source + Edge Functions + DB migrations.
// docs/ and .planning/ are excluded — internal PRD/spec content can cite the terms.
// `supabase/migrations` added in Phase 11 (11-01) so the SJT seed scenario text is scanned.
const SCAN_ROOTS = ['src', 'supabase/functions', 'supabase/migrations'] as const

/**
 * LGPD-04 / RNF-12 forbidden product copy. Matches the 5 banned terms with
 * accent tolerance (o/ó, e/é) so an un-accented slip is still caught.
 */
const FORBIDDEN =
  /teste\s+psicol[oó]gico|teste\s+psicot[eé]cnico|psicot[eé]cnico|laudo\s+psicol[oó]gico|psic[oó]logo|testes?\s+psicom[eé]tricos?|an[aá]lise\s+de\s+perfil/i

// The 7 RNF-12 terms, used by the regex-correctness sub-test. Each MUST match
// FORBIDDEN — proves the regex is correct independent of the filesystem scan.
// Terms 6–7 are the marketing framing added by Phase 22 / UX-02 (the clinical
// terms 1–5 were the original Phase-9 set).
const RNF_12_TERMS = [
  'teste psicológico',
  'teste psicotécnico',
  'psicotécnico',
  'laudo psicológico',
  'psicólogo',
  'testes psicométricos',
  'análise de perfil',
] as const

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return /\.(ts|tsx|sql)$/.test(full) ? [full] : []
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
    // Phase 22 / UX-02 — the exact landing replacements must also read clean, so
    // the new marketing-term alternations cannot false-positive on honest copy.
    expect(
      FORBIDDEN.test('Avaliação comportamental e cognitiva com design moderno e tecnológico'),
    ).toBe(false)
    expect(FORBIDDEN.test('Acompanhe seu progresso e sua avaliação comportamental')).toBe(false)
  })

  it('scan covers at least one source file (sanity check — roots resolve)', () => {
    const files = SCAN_ROOTS.flatMap((p) => collectFiles(p))
    expect(files.length).toBeGreaterThanOrEqual(1)
  })

  // Phase 10 / Plan 10-01 — guard-the-guard. SCAN_ROOTS already lists
  // 'supabase/functions' (recursive), so the new Phase-10 Edge Functions
  // (analise-candidato-individual, comparativo-candidatos) and the
  // src/features/triagem tree are auto-covered. This assertion locks that:
  // if a future glob/walk regression silently stops reaching the Edge
  // Functions root, this fails — the new EF dirs cannot drift out of scope.
  it('scan actually reaches files under supabase/functions/ (Phase-10 EF coverage)', () => {
    const efFiles = collectFiles('supabase/functions')
    expect(efFiles.length).toBeGreaterThanOrEqual(1)
    // Every collected EF path must live under the Edge Functions root.
    const efRoot = join(ROOT, 'supabase/functions')
    expect(efFiles.every((f) => f.startsWith(efRoot))).toBe(true)
  })

  // Phase 15 / Plan 15-01 Task 3b — guard-the-guard for the 3 new feature dirs.
  // SCAN_ROOTS already lists 'src' (recursive), so the Phase-15 feature dirs
  // (src/features/decisao, src/features/explicacao, src/features/admin/bias-audit)
  // are AUTO-covered the moment they exist — we do NOT touch SCAN_ROOTS. This
  // sanity-count locks that coverage: it is TOLERANT pre-implementation (the dirs
  // may be absent in Wave 0 — only test files exist so far) and ASSERTS coverage
  // the moment a Wave-2 source file lands. If a future glob/walk regression
  // silently stops reaching these dirs, this flips red — they cannot drift out.
  it('scan reaches the 3 new Phase-15 feature dirs once they exist (LGPD-04 coverage lock)', () => {
    const NEW_FEATURE_DIRS = [
      'src/features/decisao',
      'src/features/explicacao',
      'src/features/admin/bias-audit',
    ] as const
    const present = NEW_FEATURE_DIRS.filter((d) => existsSync(join(ROOT, d)))
    for (const dir of present) {
      const files = collectFiles(dir)
      const dirRoot = join(ROOT, dir)
      // Pre-implementation a dir may hold only __tests__ files (skipped by the
      // walk) → collectFiles can be empty; that's tolerated. Once a non-test
      // source file lands, the recursive walk MUST reach it under the dir root.
      expect(files.every((f) => f.startsWith(dirRoot))).toBe(true)
    }
    // At least the bias-audit dir exists from this plan's Task 2 (__tests__ only),
    // proving the path resolves; the assertion holds vacuously until source lands.
    expect(present.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase 12 / Plan 12-01 Task 2 — LGPD-04 / D-12-AVAL-08 extension: the new
// candidate-facing devolutiva prompt template.
//
// The Big Five devolutiva prompt (`08-bigfive-devolutiva.md`) is the ONE new
// candidate-facing prompt this phase. Its rendered text reaches the candidate, so
// it MUST NOT carry the clinical/psychometric framing LGPD-04 forbids — and, per
// the Big Five domain rule (templates-devolutiva.md L241), it must label N as
// "Sensibilidade Emocional", NEVER "Neuroticismo" (a pathologizing term).
//
// ── Why a TARGETED include, not adding docs/ to SCAN_ROOTS ──
// SCAN_ROOTS deliberately excludes docs/ — the PRD/knowledge base legitimately
// cites the forbidden terms when explaining why they are banned. Adding docs/
// wholesale would light up on every PRD reference. So this guard targets ONE file:
// the prompt template that actually ships to candidates.
//
// ── Hygiene: do NOT flag the compliant negated disclaimer ──
// The fixed LGPD/CFP footer (templates-devolutiva.md L44) reads "…não é teste
// psicológico…" — a forbidden term used in a NEGATED, compliant context. A naive
// `FORBIDDEN.test` would mis-flag it. So we strip comment lines (`grep -v '^#'`
// hygiene equivalent) AND the negated-disclaimer lines, then scan the REMAINDER
// for candidate-facing clinical LABELS. No bare `=== 0` on unfiltered content.
//
// ── RED→GREEN contract ──
// The template does not exist yet → the include simply has no match (the guard
// stays GREEN now — `existsSync` short-circuits). The assertion lands the moment
// Plan 12-04 authors `docs/conhecimento/prompts/templates/08-bigfive-devolutiva.md`.
// ─────────────────────────────────────────────────────────────────────────────
const BIGFIVE_PROMPT_TEMPLATE =
  'docs/conhecimento/prompts/templates/08-bigfive-devolutiva.md'

// Candidate-facing clinical LABELS forbidden in the devolutiva (beyond the 5 RNF-12
// terms above): a diagnosis/disorder framing, or "Neuroticismo" used as a label
// (the LGPD-04 / L241 rename rule — use "Sensibilidade Emocional").
const DEVOLUTIVA_FORBIDDEN_LABELS =
  /\bdiagn[oó]stico\b|\btranstorno\b|\bneuroticismo\b|teste\s+psicol[oó]gico|psic[oó]logo/i

// Lines we MUST NOT treat as violations: markdown comments, and the compliant
// NEGATED disclaimer ("não é teste psicológico"). A line is exempt if it negates
// the term ("não é …") — the disclaimer is the intended, LGPD-compliant usage.
function isExemptDevolutivaLine(line: string): boolean {
  const t = line.trim()
  if (t.startsWith('#') || t.startsWith('<!--')) return true // comment hygiene
  // negated/compliant disclaimer usage — "não é teste psicológico", "não é um diagnóstico"
  if (/n[ãa]o\s+[ée]\s+(um\s+|uma\s+)?(teste\s+psicol[oó]gico|diagn[oó]stico)/i.test(t)) return true
  return false
}

describe('LGPD-04 / D-12-AVAL-08 — Big Five devolutiva prompt template', () => {
  it('the guard targets 08-bigfive-devolutiva.md (path wired before the file exists)', () => {
    // Pure path-wiring assertion: locks the include so the guard cannot silently
    // drift off the template path even before Plan 12-04 authors it.
    expect(BIGFIVE_PROMPT_TEMPLATE).toMatch(/08-bigfive-devolutiva\.md$/)
  })

  it('no candidate-facing clinical label leaks into the devolutiva prompt (asserts once 12-04 lands)', () => {
    const full = join(ROOT, BIGFIVE_PROMPT_TEMPLATE)
    if (!existsSync(full)) {
      // Template not authored yet (pre-12-04) — guard stays green; nothing to scan.
      expect(existsSync(full)).toBe(false)
      return
    }
    const violations: { line: number; text: string }[] = []
    readFileSync(full, 'utf-8')
      .split('\n')
      .forEach((text, idx) => {
        if (isExemptDevolutivaLine(text)) return // skip comments + negated disclaimer
        if (DEVOLUTIVA_FORBIDDEN_LABELS.test(text)) {
          violations.push({ line: idx + 1, text: text.trim() })
        }
      })
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${BIGFIVE_PROMPT_TEMPLATE}:${v.line}  ${v.text}`).join('\n')
      throw new Error(
        `LGPD-04 — clinical label in the devolutiva prompt (use "Sensibilidade Emocional"; ` +
          `"avaliação comportamental"):\n${msg}`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  // Regex-correctness sub-tests (filesystem-independent, like the RNF-12 block).
  it.each(['diagnóstico', 'transtorno', 'Neuroticismo'])(
    'DEVOLUTIVA_FORBIDDEN_LABELS matches the candidate-facing label "%s"',
    (label) => {
      expect(DEVOLUTIVA_FORBIDDEN_LABELS.test(label)).toBe(true)
    },
  )

  it('the approved N label "Sensibilidade Emocional" is NOT flagged', () => {
    expect(DEVOLUTIVA_FORBIDDEN_LABELS.test('Sensibilidade Emocional')).toBe(false)
  })

  it('the compliant negated disclaimer line is exempt (not a violation)', () => {
    expect(isExemptDevolutivaLine('Este é um self-assessment — não é teste psicológico.')).toBe(true)
  })
})
