/**
 * Phase 13 / Plan 13-01 Task 3 — Wave 0 RED client↔EF contract test
 * (AVAL-06 / Pitfall 5 — [[feedback_integration_contract_gap]]).
 *
 * THE integration-contract lesson (the Phase-11 SJT C1/C2 lesson): the body the
 * CANDIDATE client builds for the new `avaliar-redacao-cultural` EF MUST parse in
 * that EF's Zod body schema, and the body MUST carry only identifiers + essay text
 * — NEVER a score (anti-tamper, RNF-07a). We pin that contract as executable
 * assertions BEFORE the EF body schema + the client body land (smoke-runtime gate).
 *
 * ── Why a Node-local Zod replica + a source-text probe (not a live import) ──
 * The EF body schema will live in a `_shared` file that imports `npm:zod@3.25.76`
 * (a Deno specifier). Vitest runs under Node/Vite and has NO resolver for the `npm:`
 * specifier, so a direct `import` fails at MODULE-RESOLUTION time — a failure that
 * would NOT flip GREEN when Plan 02 adds the schema. The faithful RED→GREEN
 * contract (exact precedent: src/features/avaliacao/__tests__/bigfive-contract.test.ts)
 * is two parts:
 *   1. A Node-local Zod replica of the EXACT shape the EF body schema must have. The
 *      runtime parse assertions document the contract — the {candidatura_id,
 *      pergunta_id, texto} body parses; an injected `score` is rejected.
 *   2. A `node:fs` source-text probe asserting the EF body schema file actually
 *      EXPORTS the body schema with the 3 identifier/text fields. This is RED now
 *      (the file/symbol is absent) and flips GREEN the moment Plan 02 authors it.
 *
 * Do NOT author the schema here — this task only authors the failing contract.
 *
 * @see src/features/avaliacao/__tests__/bigfive-contract.test.ts (the idiom this clones)
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-RESEARCH.md Pitfall 5
 * @see .planning/phases/13-reda-o-cultural-revis-o-humana/13-01-PLAN.md (Task 3)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

// ── Part 1: the runtime contract via a Node-local replica of the EF body schema ──
// This is the EXACT shape the EF body schema must have in Plan 02.
// WR-03 — `tempo_gasto_segundos` is an OPTIONAL anti-cheat timing signal (NOT a
// score), so `.strict()` accepts it but still rejects an injected `score`.
const AvaliarRedacaoCulturalBodySchemaReplica = z
  .object({
    candidatura_id: z.string().min(1),
    pergunta_id: z.string().min(1),
    texto: z.string().min(1),
    tempo_gasto_segundos: z.number().int().nonnegative().optional(),
  })
  .strict()

// The exact body the CANDIDATE client builds (mirrors the Plan-03 service layer):
// only identifiers + essay text. NEVER a score/color/threshold (RNF-07a).
function buildClientBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    pergunta_id: '22222222-2222-4222-8222-222222222222',
    texto: 'Uma vez precisei tomar uma decisão difícil sobre... (redação do candidato).',
  }
}

describe('Redação client↔EF body contract (AVAL-06 / Pitfall 5)', () => {
  it('the exact client body {candidatura_id, pergunta_id, texto} parses in the EF schema', () => {
    const parsed = AvaliarRedacaoCulturalBodySchemaReplica.safeParse(buildClientBody())
    expect(parsed.success).toBe(true)
  })

  it('.strict REJECTS a body carrying an injected `score` field (anti-tamper, RNF-07a)', () => {
    const tampered = { ...buildClientBody(), score: 99 }
    expect(AvaliarRedacaoCulturalBodySchemaReplica.safeParse(tampered).success).toBe(false)
  })

  it('an empty texto fails (min(1) — server still revalidates word_count)', () => {
    const body = { ...buildClientBody(), texto: '' }
    expect(AvaliarRedacaoCulturalBodySchemaReplica.safeParse(body).success).toBe(false)
  })

  it('the optional WR-03 tempo_gasto_segundos (anti-cheat timing) parses', () => {
    const body = { ...buildClientBody(), tempo_gasto_segundos: 412 }
    expect(AvaliarRedacaoCulturalBodySchemaReplica.safeParse(body).success).toBe(true)
  })

  // ── Part 2: source-text probe — RED until Plan 02 authors the real EF body schema ──
  // The EF body schema lives alongside the other _shared EF schemas. Plan 02 decides
  // the exact filename; the candidate contract probes the two plausible homes and
  // requires the body schema export to exist in one of them.
  const CANDIDATE_PATHS = [
    resolve(__dirname, '../../../../supabase/functions/_shared/redacao-schemas.ts'),
    resolve(__dirname, '../../../../supabase/functions/_shared/essay-schemas.ts'),
  ]

  function bodySchemaSource(): string {
    for (const p of CANDIDATE_PATHS) {
      if (existsSync(p)) {
        const src = readFileSync(p, 'utf8')
        if (/AvaliarRedacaoCulturalBodySchema/.test(src)) return src
      }
    }
    return ''
  }

  it('an EF _shared file EXPORTS AvaliarRedacaoCulturalBodySchema (RED until Plan 02)', () => {
    expect(bodySchemaSource()).toMatch(/export\s+const\s+AvaliarRedacaoCulturalBodySchema\b/)
  })

  it('the EF body schema carries the 3 identifier/text fields and no score', () => {
    const src = bodySchemaSource()
    expect(src).toMatch(/candidatura_id/)
    expect(src).toMatch(/pergunta_id/)
    expect(src).toMatch(/texto/)
    // the body must NOT declare a score/pontuacao field (anti-tamper)
    expect(src).not.toMatch(/\bpontuacao\b|\bscore\b/)
  })
})
