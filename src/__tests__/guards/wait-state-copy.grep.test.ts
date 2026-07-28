/**
 * Phase 26 / Plan 26-04 (UX-01) — honest wait-state copy CI grep guard.
 *
 * The system has NO e-mail notification infrastructure; the candidate/RH panel
 * (dashboard/hub) is the real source of truth for process status. Every
 * "avisaremos por e-mail" / "receberá … por e-mail" promise across the candidate
 * assessment surface was therefore DISHONEST — it promised a notification the
 * product never sends. Plan 26-04 replaced all of them with the ONE canonical
 * pt-BR line:
 *
 *   "Acompanhe o andamento pelo seu painel."
 *
 * mirroring the already-honest patterns at VagaDetalhePage.tsx:319
 * ("Acompanhe o status da sua candidatura no dashboard") and
 * DashboardCandidatoPage.tsx:186 ("Acompanhe seu progresso no processo seletivo").
 *
 * This Vitest grep test is the DURABLE regression net: it BANS the e-mail-promise
 * pattern from re-appearing in EXACTLY the 6 wait-state screens and asserts the
 * canonical string is present in each. It rides ci.yml's EXISTING `unit` job via
 * `npm run test:run` — no new workflow.
 *
 * ── Why a SCOPED allowlist, not a global src ban ──
 * The ban is intentionally narrow. Legitimate transactional / consent e-mail copy
 * MUST still be allowed elsewhere:
 *   - LGPD consent (AutorizacoesStep.tsx:58 "Concordo em receber emails e
 *     notificações …") — a lawful opt-in, NOT a wait-state promise.
 *   - Password-reset copy (RedefinirSenhaPage / EsqueciSenhaPage).
 *   - The RH "Notificar candidato por email" toggle label.
 * A whole-src ban would false-flag all of those. So the guard scopes to an EXPLICIT
 * path allowlist of the 6 wait-state files, and — because the ban regexes require
 * the "avisaremos …" / "receberá …" LEAD-IN before "por e-mail" — even inside those
 * files a bare transactional "por email" (with no promise lead-in) is not matched.
 *
 * ── Why Vitest + node:fs (NOT child_process) ──
 * Mirrors forbidden-strings / n8n-bundle: a pure, read-only, deterministic scan via
 * the standard library, with a filesystem-independent regex-correctness sub-test.
 *
 * @see src/__tests__/guards/forbidden-strings.grep.test.ts (the node:fs skeleton this clones)
 * @see src/__tests__/guards/n8n-bundle.grep.test.ts (comment-aware analog)
 * @see .planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-UI-SPEC.md (§Copywriting Contract)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: this file lives at src/__tests__/guards/wait-state-copy.grep.test.ts
// — 3 levels deep from the repo root (guards → __tests__ → src → ROOT).
const ROOT = resolve(__dirname, '../../..')

/**
 * The EXACTLY-6 candidate/RH wait-state screens under this guard. An explicit path
 * allowlist — NOT a recursive src walk — so the ban stays scoped and legitimate
 * transactional/consent e-mail copy elsewhere is never touched.
 */
const WAIT_STATE_FILES = [
  'src/features/avaliacao/components/AvaliacaoContainer.tsx',
  'src/features/avaliacao/components/RedacaoEditorScreen.tsx',
  'src/features/avaliacao/components/DevolutivaBigFiveView.tsx',
  'src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx',
  'src/features/explicacao/components/SolicitarRevisaoCTA.tsx',
  'src/components/pages/SuporteRHPage.tsx',
  // Phase-26 UI-review addition: the candidatura-submit success toast (funnel entry)
  // carried the same dishonest "receberá um email" promise — no "por e-mail" substring,
  // so the original ban + allowlist missed it. Now scoped + covered by the broadened ban.
  'src/features/vagas/hooks/useCandidaturas.ts',
] as const

/** The single canonical honest wait-state line (locked by 26-CONTEXT + 26-UI-SPEC). */
const CANONICAL = 'Acompanhe o andamento pelo seu painel'

/**
 * The banned e-mail-promise patterns. Each requires a promise LEAD-IN
 * ("avisaremos …" / "receberá …") BEFORE "por e-mail" — this is what makes the ban
 * precise: a bare transactional "por email" with no promise lead-in (consent,
 * password reset, the RH notify toggle) is NOT matched. Accent-tolerant on
 * "receber[áa]" and hyphen-tolerant on "e-?mail" so an un-accented / un-hyphenated
 * slip is still caught.
 */
const BAN_PATTERNS = [
  /avisaremos[\s\S]*por e-?mail/i,
  // "receberá … (por) e-mail" — the "por" is now OPTIONAL so the funnel-entry
  // variant "receberá um email com os próximos passos" is caught. The future-tense
  // accent/vowel in `receber[áa]` is what still spares the consent "receber emails"
  // (infinitive "receber" + space, never "receberá").
  /receber[áa][\s\S]*e-?mail/i,
] as const

/** True when any banned promise pattern appears in `text`. */
function hasEmailPromise(text: string): boolean {
  return BAN_PATTERNS.some((re) => re.test(text))
}

describe('UX-01 — honest wait-state copy (no dishonest e-mail promise)', () => {
  it('none of the 6 wait-state screens carries an "avisaremos/receberá … por e-mail" promise', () => {
    const violations: { file: string; line: number; text: string }[] = []
    for (const rel of WAIT_STATE_FILES) {
      const full = join(ROOT, rel)
      // A missing scoped file is itself a regression (a rename must update this guard).
      expect(existsSync(full), `wait-state file missing from disk: ${rel}`).toBe(true)
      const lines = readFileSync(full, 'utf-8').split('\n')
      lines.forEach((text, idx) => {
        if (hasEmailPromise(text)) {
          violations.push({ file: rel, line: idx + 1, text: text.trim() })
        }
      })
    }
    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line}  ${v.text}`).join('\n')
      throw new Error(
        `UX-01 — dishonest e-mail promise re-introduced (there is no e-mail infra). ` +
          `Use the canonical "${CANONICAL}." instead:\n${msg}`,
      )
    }
    expect(violations).toHaveLength(0)
  })

  it('every one of the 6 wait-state screens contains the canonical panel line', () => {
    const missing: string[] = []
    for (const rel of WAIT_STATE_FILES) {
      const full = join(ROOT, rel)
      if (!readFileSync(full, 'utf-8').includes(CANONICAL)) missing.push(rel)
    }
    if (missing.length > 0) {
      throw new Error(
        `UX-01 — canonical wait-state line "${CANONICAL}." absent from:\n  ${missing.join('\n  ')}`,
      )
    }
    expect(missing).toHaveLength(0)
  })

  // ── Regex-correctness sub-tests (filesystem-independent) ──

  it.each([
    'Você concluiu todas as avaliações desta etapa. Avisaremos sobre os próximos passos por e-mail.',
    'Avisaremos sobre os próximos passos por e-mail.',
    'Volte em alguns instantes — avisaremos por e-mail quando estiver pronta.',
    'Você receberá atualizações por e-mail.',
    // Funnel-entry variant caught by the broadened (no-"por") receberá pattern.
    'Você receberá um email com os próximos passos.',
  ])('the ban matches the dishonest promise "%s"', (phrase) => {
    expect(hasEmailPromise(phrase)).toBe(true)
  })

  it('the ban does NOT match the canonical honest copy', () => {
    expect(hasEmailPromise(`${CANONICAL}.`)).toBe(false)
  })

  it('NO FALSE POSITIVE — legitimate transactional/consent e-mail copy is not flagged', () => {
    // LGPD consent opt-in (AutorizacoesStep.tsx:58) — a lawful "receber emails",
    // NOT a wait-state promise. The ban requires "receber[áa] … por e-mail"; this
    // reads "receber emails" (space after "receber") → no match.
    expect(
      hasEmailPromise(
        'Concordo em receber emails e notificações sobre o andamento do processo seletivo e novas oportunidades de vagas da Beauty Smile.',
      ),
    ).toBe(false)
    // The RH "Notificar candidato por email" toggle — has "por email" but no
    // avisaremos/receberá promise lead-in → not flagged.
    expect(hasEmailPromise('Notificar candidato por email')).toBe(false)
    // Password-reset transactional copy — a link to the e-mail, not a promise to notify.
    expect(hasEmailPromise('Enviamos um link de redefinição para o seu e-mail.')).toBe(false)
  })

  it('scan resolves every scoped file (path allowlist must not silently drift)', () => {
    for (const rel of WAIT_STATE_FILES) {
      expect(existsSync(join(ROOT, rel)), `scoped file must exist: ${rel}`).toBe(true)
    }
    expect(WAIT_STATE_FILES).toHaveLength(7)
  })
})
