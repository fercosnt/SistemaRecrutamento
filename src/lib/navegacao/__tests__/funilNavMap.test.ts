/**
 * Phase 17 / Plan 17-01 Task 1 — Wave 0 RED scaffold for `funilNavMap.ts` (D-17).
 *
 * RED CONTRACT: this file STATICALLY imports `@/lib/navegacao/funilNavMap`, which does
 * NOT exist until Plan 17-02 lands it. The static import below makes Vitest fail with
 * "Cannot find module '@/lib/navegacao/funilNavMap'" at suite collection — the calibrated
 * Wave-0 RED signal. The module lands in Plan 17-02 and flips this GREEN.
 *
 * The assertions encode the D-17 single-source contract exactly:
 *  - EXHAUSTIVENESS: every one of the 8 `EtapaFunilM2` members is a key in funilNavMap
 *    (the literal key array mirrors the union members — drift-proof against the enum).
 *  - LABEL REUSE (no parallel labels): each entry.label === ETAPA_M2_LABELS[etapa]
 *    (the nav map MUST reuse the funnel's own label dict, never hardcode pt-BR copy).
 *  - candidaturaId ROUTE SHAPE (Pitfall 1 — THE central landmine): every non-null route fn
 *    interpolates the candidaturaId argument, NOT a vaga/candidato id. Verified targets:
 *      avaliacao_assincrona → rotaCandidato('abc') === '/candidato/avaliacao/abc'
 *      rejeitado            → rotaCandidato('abc') === '/candidato/explicacao/abc'
 *      entrevista_online    → rotaWorkspaceRH('abc') === '/rh/candidato/abc/entrevista'
 *      decisao_final        → rotaWorkspaceRH('abc') === '/rh/candidato/abc/decisao'
 *
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-PATTERNS.md (§funilNavMap test analog)
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-UI-SPEC.md (§Interaction Contract — funilNavMap shape)
 * @see src/features/triagem/services/triagemService.ts (L293-325 — EtapaFunilM2 + ETAPA_M2_LABELS)
 */
import { describe, it, expect } from 'vitest'

import {
  type EtapaFunilM2,
  ETAPA_M2_LABELS,
} from '@/features/triagem/services/triagemService'

// RED: '@/lib/navegacao/funilNavMap' does not exist yet → "Cannot find module".
// GREEN after Plan 17-02 creates src/lib/navegacao/funilNavMap.ts.
import { funilNavMap } from '@/lib/navegacao/funilNavMap'

// The 8 enum members, written literally so the test fails loudly if the enum grows/shrinks
// without the nav map being updated to stay exhaustive (D-17 drift guard).
const TODAS_AS_ETAPAS: EtapaFunilM2[] = [
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
  'aprovado',
  'rejeitado',
]

describe('funilNavMap — single source etapa→tela (D-17)', () => {
  it('é exaustivo: contém uma entrada para cada um dos 8 valores de EtapaFunilM2', () => {
    for (const etapa of TODAS_AS_ETAPAS) {
      expect(funilNavMap[etapa]).toBeDefined()
    }
    // No extra keys beyond the 8 enum members (no drift).
    expect(Object.keys(funilNavMap).sort()).toEqual([...TODAS_AS_ETAPAS].sort())
  })

  it('reusa ETAPA_M2_LABELS — cada entry.label === ETAPA_M2_LABELS[etapa] (sem rótulos paralelos)', () => {
    for (const etapa of TODAS_AS_ETAPAS) {
      expect(funilNavMap[etapa].label).toBe(ETAPA_M2_LABELS[etapa])
    }
  })

  it('rotaCandidato interpola o candidaturaId (NÃO vaga/candidato id) — avaliacao_assincrona + rejeitado', () => {
    expect(funilNavMap.avaliacao_assincrona.rotaCandidato('abc')).toBe(
      '/candidato/avaliacao/abc',
    )
    expect(funilNavMap.rejeitado.rotaCandidato('abc')).toBe('/candidato/explicacao/abc')
  })

  it('rotaWorkspaceRH interpola o candidaturaId — entrevista_online + decisao_final', () => {
    expect(funilNavMap.entrevista_online.rotaWorkspaceRH('abc')).toBe(
      '/rh/candidato/abc/entrevista',
    )
    expect(funilNavMap.decisao_final.rotaWorkspaceRH('abc')).toBe(
      '/rh/candidato/abc/decisao',
    )
  })

  it('toda rota não-nula carrega o candidaturaId recebido (nunca um id fixo / hardcoded)', () => {
    const candidaturaId = 'cand-123-uuid'
    for (const etapa of TODAS_AS_ETAPAS) {
      const entry = funilNavMap[etapa]
      const rc = entry.rotaCandidato(candidaturaId)
      const rw = entry.rotaWorkspaceRH(candidaturaId)
      if (rc !== null) expect(rc).toContain(candidaturaId)
      if (rw !== null) expect(rw).toContain(candidaturaId)
    }
  })
})
