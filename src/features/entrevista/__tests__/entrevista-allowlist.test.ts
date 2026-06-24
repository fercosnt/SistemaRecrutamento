/**
 * Phase 14 / Plan 14-01 Task 3 — Wave 0 RED allowlist-projection test for the
 * (future) `entrevistaService` ([[reference_select_star_leaks_pii]]).
 *
 * THE PII-projection lesson (Phase-8 security gate): RLS is row-level only — it does
 * NOT hide columns. An RH read of the candidate's interview transcript + gestor notes
 * + scores MUST name its columns via an EXPLICIT allowlist, NEVER `select('*')`,
 * which over-projects PII (the transcript box and notes are sensitive). We pin that
 * contract as an executable source-probe BEFORE the service lands (smoke-runtime gate).
 *
 * ── Why this is RED now ──
 * `entrevistaService.ts` ships in Plan 14-05. This test source-probes that the service
 * file (a) exists and (b) declares an explicit column allowlist constant and (c) never
 * calls `.select('*')`. It is RED now (the file is absent) and flips GREEN the moment
 * 14-05 authors the allowlist-projecting service. This is the calibrated Wave-0 failure.
 *
 * Test the NETWORK SELECT, not the JSX (the lesson). The service file is the single
 * place the projection is decided, so a source-text probe of the service is the
 * faithful contract.
 *
 * @see src/features/triagem/services/revisaoRedacaoService.ts (REDACAO_ALLOWLIST idiom)
 * @see src/features/entrevista/services/entrevistaService.ts (ships in 14-05 — RED until then)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SERVICE_PATH = resolve(
  __dirname,
  '../../../features/entrevista/services/entrevistaService.ts',
)

function serviceSrc(): string {
  return existsSync(SERVICE_PATH) ? readFileSync(SERVICE_PATH, 'utf8') : ''
}

describe('Entrevista service allowlist projection (RED until 14-05)', () => {
  it('entrevistaService.ts exists (ships in 14-05)', () => {
    // RED now: the service file is absent until Plan 14-05.
    expect(existsSync(SERVICE_PATH)).toBe(true)
  })

  it('declares an EXPLICIT column allowlist constant (ENTREVISTA_ALLOWLIST), never select(*)', () => {
    const src = serviceSrc()
    // an explicit allowlist constant must exist
    expect(src).toMatch(/ENTREVISTA_ALLOWLIST\s*=/)
  })

  it('never calls .select(\'*\') (no PII over-projection — RLS is row-level only)', () => {
    const src = serviceSrc()
    expect(src).not.toMatch(/\.select\(\s*['"`]\*['"`]\s*\)/)
  })

  it('the RH read projects through the allowlist (select(ENTREVISTA_ALLOWLIST...))', () => {
    const src = serviceSrc()
    expect(src).toMatch(/\.select\(\s*(?:ENTREVISTA_ALLOWLIST|ENTREVISTA_EMBED|`\$\{ENTREVISTA_ALLOWLIST)/)
  })
})
