/**
 * Phase 25 / Plan 25-04 (FUNIL-05 / A15) — the template↔container test-id
 * CONTRACT test (VALIDATION invariant E). Wave-0 RED: `@/lib/testes/testeContract`
 * and `AvaliacaoContainer`'s `CONTAINER_RECOGNIZED` export do NOT exist yet →
 * both imports fail at module-resolution time. THAT is the calibrated RED.
 *
 * ── Why this is the regress-guard ([[feedback_integration_contract_gap]]) ──
 * `cargoTemplates.baseTestes` emits `{triagem, work_sample_sjt, redacao_cultural,
 * big_five, cognitivo, entrevista}`; the `AvaliacaoContainer` only recognizes
 * `{sjt_mc, sjt_caso_aberto, big_five, redacao, cognitivo}` — zero overlap except
 * `big_five`. Before 25-04, `deriveCards` copied `t.teste` VERBATIM, so a real
 * vaga's `work_sample_sjt`/`redacao_cultural`/`cognitivo` fell to the default
 * label + accidental `target='mc'` (redacao routed WRONG). This test iterates
 * EVERY `cargoTemplates` teste through the shared lib's branch-map and asserts
 * every emitted id is a member of the REAL container's exported recognized set
 * (NOT a replica — the container is the real side of the contract).
 *
 * @see src/lib/testes/testeContract.ts (the canonical mapping lib)
 * @see src/features/avaliacao/components/AvaliacaoContainer.tsx (exports CONTAINER_RECOGNIZED)
 * @see .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-RESEARCH.md §2d
 * @see .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-VALIDATION.md (invariant E)
 */
import { describe, it, expect } from 'vitest'
import {
  templateTesteToContainerCards,
  TEMPLATE_TESTES,
  CONTAINER_TESTES,
  CANDIDATE_FACING,
} from '@/lib/testes/testeContract'
import { CONTAINER_RECOGNIZED } from '@/features/avaliacao/components/AvaliacaoContainer'
import { cargoTemplates } from '@/features/config-vaga/templates/cargoTemplates'

describe('testeContract — per-id template↔container mapping (FUNIL-05)', () => {
  it('work_sample_sjt → both SJT cards', () => {
    expect(templateTesteToContainerCards('work_sample_sjt')).toEqual([
      'sjt_mc',
      'sjt_caso_aberto',
    ])
  })

  it('redacao_cultural → redacao', () => {
    expect(templateTesteToContainerCards('redacao_cultural')).toEqual(['redacao'])
  })

  it('big_five → big_five', () => {
    expect(templateTesteToContainerCards('big_five')).toEqual(['big_five'])
  })

  it('cognitivo → cognitivo (label + route stub; reachability = Phase 26)', () => {
    expect(templateTesteToContainerCards('cognitivo')).toEqual(['cognitivo'])
  })

  it('triagem/entrevista are not candidate-facing → [] (filtered out)', () => {
    expect(templateTesteToContainerCards('triagem')).toEqual([])
    expect(templateTesteToContainerCards('entrevista')).toEqual([])
    expect(CANDIDATE_FACING.has('triagem')).toBe(false)
    expect(CANDIDATE_FACING.has('entrevista')).toBe(false)
  })

  it('an unknown template id maps to [] (defensive — never a broken card)', () => {
    expect(templateTesteToContainerCards('nao_existe')).toEqual([])
  })

  it('exposes the canonical template + container id unions', () => {
    expect(TEMPLATE_TESTES).toEqual([
      'triagem',
      'work_sample_sjt',
      'redacao_cultural',
      'big_five',
      'cognitivo',
      'entrevista',
    ])
    expect(CONTAINER_TESTES).toEqual([
      'sjt_mc',
      'sjt_caso_aberto',
      'big_five',
      'redacao',
      'cognitivo',
    ])
  })
})

// ── The regress-guard: parse EVERY cargoTemplate teste through the lib and assert
//    each emitted id is one the REAL container recognizes (invariant E). This asserts
//    against the container's EXPORTED set — not a replica (feedback_integration_contract_gap).
describe('CONTRACT — every cargoTemplate teste maps into the container recognized set (invariant E)', () => {
  it('no template teste emits a container id the AvaliacaoContainer does not recognize', () => {
    for (const [slug, tpl] of Object.entries(cargoTemplates)) {
      for (const entry of tpl.testes_aplicaveis) {
        const emitted = templateTesteToContainerCards(entry.teste)
        for (const id of emitted) {
          expect(
            CONTAINER_RECOGNIZED.has(id),
            `cargo ${slug} teste "${entry.teste}" → "${id}" must be recognized by AvaliacaoContainer (no default-branch fall-through)`,
          ).toBe(true)
        }
      }
    }
  })

  it('every candidate-facing template teste emits ≥1 recognized card', () => {
    for (const [slug, tpl] of Object.entries(cargoTemplates)) {
      for (const entry of tpl.testes_aplicaveis) {
        if (!CANDIDATE_FACING.has(entry.teste)) continue
        expect(
          templateTesteToContainerCards(entry.teste).length,
          `cargo ${slug} candidate-facing teste "${entry.teste}" must emit ≥1 card`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('the lib container-id union ⊆ the container recognized set', () => {
    for (const id of CONTAINER_TESTES) {
      expect(CONTAINER_RECOGNIZED.has(id)).toBe(true)
    }
  })
})
