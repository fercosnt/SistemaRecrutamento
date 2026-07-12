/**
 * Phase 27 / Plan 27-03 Task 2 — CI-03 / CI-07: client↔EF body contract test for
 * `submit-candidatura` (the sole sanctioned auto-reject path). A REAL `.safeParse`
 * against the ONE shared `submitCandidaturaSchema` both runtimes import — NOT a
 * Node-local replica (the replica idiom could not catch drift; the Phase-11 SJT
 * C1/C2 lesson, [[feedback_integration_contract_gap]]).
 *
 * The EF (Deno, via the deno.json `zod` import map) and this client test (Node,
 * via node_modules — bare `zod` 3.25.76, byte-identical) import the SAME module,
 * `supabase/functions/_shared/schemas`, so the contract CANNOT drift.
 *
 * THE anti-tamper invariant (RNF-07a): the body carries only identifiers +
 * curriculo metadata — NEVER a score/peso/threshold. `.strict()` rejects any
 * injected key. The test asserts BOTH the valid body parses AND an injected
 * `score` is rejected.
 *
 * Run: npm run test:run -- submitCandidaturaContract
 *
 * @see supabase/functions/_shared/schemas.ts (submitCandidaturaSchema — the shared source)
 * @see src/features/vagas/services/candidaturasService.ts:778-790 (the client body shape)
 */
import { describe, it, expect } from 'vitest'
// No `@/` alias — a relative import keeps tsc from pulling extra program roots
// (baseline stays flat). This is the SAME module the EF imports.
import { submitCandidaturaSchema } from '../../../../supabase/functions/_shared/schemas'

// The exact body the client builds (candidaturasService.submitCandidaturaWithRespostas
// / SubmitCandidaturaWithRespostasInput): six fields, identifiers + curriculo
// metadata + respostas. NEVER a score.
function buildClientBody() {
  return {
    candidato_id: '11111111-1111-4111-8111-111111111111',
    vaga_id: '22222222-2222-4222-8222-222222222222',
    curriculo_url: 'auth-uid-1/curriculo.pdf',
    curriculo_nome: 'curriculo.pdf',
    curriculo_size: 12_345,
    respostas: [
      { pergunta_id: '33333333-3333-4333-8333-333333333333', resposta_texto: 'Sim' },
    ],
  }
}

describe('submit-candidatura client↔EF body contract (CI-03/CI-07 / integration-contract-gap)', () => {
  it('the exact client body parses in the shared .strict() submitCandidaturaSchema', () => {
    const parsed = submitCandidaturaSchema.safeParse(buildClientBody())
    expect(parsed.success).toBe(true)
  })

  it('.strict REJECTS an injected `score` field (anti-tamper, RNF-07a)', () => {
    const tampered = { ...buildClientBody(), score: 9 }
    expect(submitCandidaturaSchema.safeParse(tampered).success).toBe(false)
  })

  it('.strict REJECTS any extra/unknown key (fail-closed allowlist, D-04/LGPD-01)', () => {
    const withUnknown = { ...buildClientBody(), foo: 'bar' }
    expect(submitCandidaturaSchema.safeParse(withUnknown).success).toBe(false)
  })

  it('a non-uuid candidato_id fails (`.uuid()` on the shared schema)', () => {
    const body = { ...buildClientBody(), candidato_id: 'not-a-uuid' }
    expect(submitCandidaturaSchema.safeParse(body).success).toBe(false)
  })

  it('a curriculo_size over 5 MB fails (server-side DoS cap)', () => {
    const body = { ...buildClientBody(), curriculo_size: 5_242_881 }
    expect(submitCandidaturaSchema.safeParse(body).success).toBe(false)
  })
})
