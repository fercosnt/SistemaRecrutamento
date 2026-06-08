/**
 * Phase 8 / Plan 08-01 Task 1 — Wave 0 RED scaffold for the D-04 `.strict()`
 * forbidden-field allowlist (LGPD-01).
 *
 * D-04 / LGPD-01: the Edge Function input schemas MUST reject unknown keys
 * (`cpf`, `foto`, `estado_civil`, `saude`, …) rather than silently strip them.
 * Today neither `cadastroCandidatoSchema` nor `submitCandidaturaSchema` carries
 * `.strict()`, so Zod's default behavior (`.strip()`) drops extra keys with
 * `.success === true`. These assertions are therefore RED now and flip GREEN
 * once Plan 08-02 adds `.strict()` to both schemas.
 *
 * ── Why a source-text probe instead of a live `schema.safeParse(...)` ──
 * `supabase/functions/_shared/schemas.ts` imports zod from
 * `https://esm.sh/zod@3` (Deno runtime). Vitest runs under Node and has no
 * resolver for the esm.sh URL specifier and no import-map alias for it, so a
 * direct `import { cadastroCandidatoSchema } from '../schemas.ts'` fails at
 * MODULE-RESOLUTION time — a module-not-found error that would NOT flip to GREEN
 * when Plan 08-02 adds `.strict()`. The faithful RED→GREEN contract is a
 * `node:fs` source-text probe (the exact idiom already used in
 * src/features/cadastro/services/__tests__/duplicateCheckService.test.ts for the
 * `rate_limited: boolean` structural assertion). The probe is RED while the
 * source lacks `.strict()` on these two schemas and GREEN the moment it lands.
 *
 * The Zod forbidden-key payloads below are documented as fixtures so the intent
 * (cpf/foto/estado_civil/saude → reject; INSCR-01-valid keys → accept) is
 * unambiguous for the Plan 02 implementer, even though the assertion runs over
 * source text.
 *
 * Do NOT add `.strict()` here or edit the production schema — this task only
 * authors the failing test.
 *
 * @see .planning/phases/08-inscri-o-knock-out-etapa-1/08-RESEARCH.md (D-04, LGPD-01)
 * @see .planning/phases/08-inscri-o-knock-out-etapa-1/08-01-PLAN.md Task 1
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SCHEMAS_PATH = resolve(__dirname, '../schemas.ts')
const schemasSource = () => readFileSync(SCHEMAS_PATH, 'utf8')

// Forbidden keys that LGPD-01 / D-04 must reject (never collected at Etapa 1).
const FORBIDDEN_KEYS = ['cpf', 'foto', 'estado_civil', 'saude'] as const

// The INSCR-01-valid allowlist shape (documents what MUST still parse green
// after `.strict()` lands — the positive case for the Plan 02 implementer).
const INSCR_01_VALID_PAYLOAD = {
  email: 'candidato@example.com',
  password: 'senhaSegura1',
  nome_completo: 'Maria Silva',
  telefone: '11987654321',
  data_nascimento: '1990-01-01',
  autorizacoes: { autorizacao_uso_dados: true },
}

describe('D-04 .strict() forbidden-field allowlist (LGPD-01)', () => {
  // RED until Plan 08-02 adds `.strict()` to cadastroCandidatoSchema.
  it('cadastroCandidatoSchema is declared `.strict()` so unknown keys reject', () => {
    const src = schemasSource()
    // Isolate the cadastroCandidatoSchema declaration block (up to the next
    // top-level `export`) so the assertion is scoped to the right schema.
    const block = src.slice(src.indexOf('export const cadastroCandidatoSchema'))
    const decl = block.slice(0, block.indexOf('export type CadastroCandidatoInput'))
    expect(decl).toMatch(/\.strict\(\)/)
  })

  // RED until Plan 08-02 adds `.strict()` to submitCandidaturaSchema.
  it('submitCandidaturaSchema is declared `.strict()` so unknown keys reject', () => {
    const src = schemasSource()
    const block = src.slice(src.indexOf('export const submitCandidaturaSchema'))
    const decl = block.slice(0, block.indexOf('export type SubmitCandidaturaInput'))
    expect(decl).toMatch(/\.strict\(\)/)
  })

  // RED until Plan 08-02: each forbidden key must be unrepresentable in the
  // allowlist (asserts `.strict()` is the rejection mechanism, not per-key
  // hand-coding). The probe confirms BOTH schemas are strict-locked so ANY
  // extra key — cpf/foto/estado_civil/saude included — is rejected as a class.
  it.each(FORBIDDEN_KEYS)(
    'forbidden key "%s" is rejected by the .strict() allowlist (not stripped)',
    (forbiddenKey) => {
      // Fixture: a payload carrying the forbidden key — under `.strict()` this
      // makes `.safeParse(...).success === false`. Documented for Plan 02.
      const payloadWithForbiddenKey = {
        ...INSCR_01_VALID_PAYLOAD,
        [forbiddenKey]: 'should-be-rejected',
      }
      expect(payloadWithForbiddenKey[forbiddenKey]).toBe('should-be-rejected')

      // The rejection mechanism for ALL forbidden keys is a single `.strict()`
      // on cadastroCandidatoSchema. RED while it is absent.
      const src = schemasSource()
      const block = src.slice(src.indexOf('export const cadastroCandidatoSchema'))
      const decl = block.slice(0, block.indexOf('export type CadastroCandidatoInput'))
      expect(decl).toMatch(/\.strict\(\)/)
    },
  )

  // Positive allowlist case — the INSCR-01-valid keys must remain accepted.
  // This is GREEN both before AND after Plan 02 (no forbidden key present); it
  // documents the allowlist contract so the implementer does not over-tighten.
  it('INSCR-01-valid payload carries only allowlisted keys', () => {
    const allowlisted = new Set([
      'email',
      'password',
      'nome_completo',
      'telefone',
      'data_nascimento',
      'autorizacoes',
    ])
    for (const key of Object.keys(INSCR_01_VALID_PAYLOAD)) {
      expect(allowlisted.has(key)).toBe(true)
      expect(FORBIDDEN_KEYS).not.toContain(key)
    }
  })
})
