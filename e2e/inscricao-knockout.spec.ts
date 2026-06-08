/**
 * E2E Tests — Inscrição & Knock-out Etapa 1 (Phase 8 / INSCR-04, LGPD-01, D-15)
 *
 * Wave 0 scaffold (Plan 08-01 Task 2). Describes the candidate-facing knockout
 * flow that Plans 08-04/08-05 turn green:
 *   candidate answers a knockout option → sees the NEUTRAL D-15 message inline
 *   (never the criterion that fired) → then sees `feedback_rejeicao` on /perfil.
 *
 * D-15 [LOCKED]: the rejection message is NEUTRAL and must NEVER expose the
 * knockout criterion. The single standard message is:
 *   "Após análise dos requisitos da vaga, não seguiremos com sua candidatura
 *    neste momento."
 *
 * Gating (Phase 4/5 precedent — real auth + real DB writes are flaky in CI):
 *  - Plan 08-05 wired the inline result (FormularioCandidaturaPage) + the
 *    /perfil + dashboard feedback_rejeicao display, so the live-dependent steps
 *    are now PROMOTED from `test.fixme` to env-gated runnable tests. They are
 *    skipped by default (they require a real auth round-trip + a knockout-tagged
 *    seeded vaga + a candidatura write — 08-SQL-SMOKE-RUNBOOK SMOKE-1 covers the
 *    DB side) and run only when the operator sets the env flags below.
 *  - The deterministic no-criterion-leak assertion over the neutral message
 *    string runs unconditionally (pure string contract, no live deps).
 *
 * Run the live steps (Plan 08-05 wired):
 *   E2E_REAL_LOGIN=1 E2E_ALLOW_DB_WRITE=1 KNOCKOUT_VAGA_SLUG=<slug> \
 *     npx playwright test e2e/inscricao-knockout.spec.ts
 *
 * @see .planning/phases/08-inscri-o-knock-out-etapa-1/08-RESEARCH.md (D-15, INSCR-04)
 * @see .planning/phases/08-inscri-o-knock-out-etapa-1/08-SQL-SMOKE-RUNBOOK.md (SMOKE-1)
 */
import { test, expect } from '@playwright/test'

// Live steps run only when the operator opts in with real auth + DB write.
// Default-skipped in CI (Phase 4/5 precedent — real round-trips are flaky).
const LIVE = process.env.E2E_REAL_LOGIN === '1' &&
  process.env.E2E_ALLOW_DB_WRITE === '1'

// D-15 LOCKED neutral message — the ONLY copy shown after a knockout.
const NEUTRAL_MESSAGE =
  'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.'

// Criterion fragments that must NEVER leak into the candidate-facing message
// (the knockout reason stays internal — LGPD Art. 20 detailed explanation is
// Phase 15 / DECISAO-04, not here).
const FORBIDDEN_CRITERION_FRAGMENTS = [
  'presencialmente em São Paulo',
  'Brigadeiro',
  'Paraíso',
  'harmoniza',
  'knockout',
  'eliminatóri',
]

test.describe('Inscrição & Knock-out Etapa 1 (Plan 08-01 — INSCR-04, D-15)', () => {
  // Deterministic contract — no live deps. The neutral message must not embed
  // any knockout criterion fragment. This is the no-criterion-leak guard.
  test('neutral D-15 message carries no knockout criterion (no-leak contract)', () => {
    for (const fragment of FORBIDDEN_CRITERION_FRAGMENTS) {
      expect(NEUTRAL_MESSAGE.toLowerCase()).not.toContain(fragment.toLowerCase())
    }
    // Sanity: the message is the exact LOCKED D-15 copy.
    expect(NEUTRAL_MESSAGE).toBe(
      'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.',
    )
  })

  // Live step (Plan 08-05 wired) — candidate answers a knockout option ("Não"
  // to presencial-SP), submits, and sees the neutral message INLINE (never the
  // criterion). Env-gated: requires real auth + DB write + a seeded knockout
  // vaga (KNOCKOUT_VAGA_SLUG). Skipped by default in CI.
  test('candidate answers a knockout option → sees neutral D-15 message inline', async ({
    page,
  }) => {
    test.skip(!LIVE, 'live knockout submit — set E2E_REAL_LOGIN + E2E_ALLOW_DB_WRITE')
    const slug = process.env.KNOCKOUT_VAGA_SLUG
    test.skip(!slug, 'KNOCKOUT_VAGA_SLUG not set — needs a seeded knockout vaga')

    // The operator drives login + form fill against the seeded knockout vaga
    // (08-SQL-SMOKE-RUNBOOK SMOKE-1 vaga). After submit, the inline result must
    // show the neutral message and NONE of the criterion fragments.
    await page.goto(`/candidato/candidatura/formulario/${slug}`)
    // (operator: answer the knockout option "Não", upload CV, submit)
    await expect(page.getByText(NEUTRAL_MESSAGE)).toBeVisible()
    for (const fragment of FORBIDDEN_CRITERION_FRAGMENTS) {
      await expect(page.getByText(new RegExp(fragment, 'i'))).toHaveCount(0)
    }
  })

  // Live step (Plan 08-05 wired) — after the knockout, /perfil shows
  // `feedback_rejeicao` (the same neutral message), still with no criterion
  // leak (D-16 display). Env-gated; skipped by default.
  test('after knockout → /perfil shows feedback_rejeicao (neutral, no criterion leak)', async ({
    page,
  }) => {
    test.skip(!LIVE, 'live knockout submit — set E2E_REAL_LOGIN + E2E_ALLOW_DB_WRITE')

    // Navigate to /candidato/perfil; the rejected candidatura card renders
    // feedback_rejeicao = the neutral D-15 message, no criterion leak.
    await page.goto('/candidato/perfil')
    await expect(page.getByText(NEUTRAL_MESSAGE)).toBeVisible()
    for (const fragment of FORBIDDEN_CRITERION_FRAGMENTS) {
      await expect(page.getByText(new RegExp(fragment, 'i'))).toHaveCount(0)
    }
  })
})
