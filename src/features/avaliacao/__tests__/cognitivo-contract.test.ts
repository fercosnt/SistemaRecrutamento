/**
 * Phase 26 / Plan 26-06 (FUNIL-08 / A18) — the cognitivo route↔gate CONTRACT test.
 *
 * The cognitivo card is rendered inside `AvaliacaoContainer` during the
 * `avaliacao_assincrona` etapa (the container's wrong-etapa gate reads the exported
 * `AVALIACAO_ASSINCRONA_ETAPA` constant), and its CTA routes to
 * `/candidato/prova-cognitiva/:id`. That screen submits through the 5-arg
 * `pontuar_cognitivo` RPC, whose ownership gate accepts a fixed etapa set
 * (`entrevista_online`, `entrevista_presencial`, `avaliacao_assincrona` — widened in
 * 26-02). If the card ever renders in an etapa the RPC does NOT accept, the submit
 * 42501s and the assessment is a dead end.
 *
 * This test locks BOTH ends of that contract: it imports the REAL container config
 * (`AVALIACAO_ASSINCRONA_ETAPA` + `CONTAINER_TESTE_CONFIG`, NOT a replica —
 * [[feedback_integration_contract_gap]]) and asserts the render etapa ∈ the
 * RPC-accepted set. A future edit to EITHER side (the container's render etapa or the
 * RPC gate mirror below) breaks this test.
 *
 * @see src/features/avaliacao/components/AvaliacaoContainer.tsx (AVALIACAO_ASSINCRONA_ETAPA + CONTAINER_TESTE_CONFIG)
 * @see supabase/migrations/20260712100002_funil08_pontuar_cognitivo_gate.sql (:83 — the accepted etapa IN list)
 * @see .planning/phases/26-corre-o-do-funil-lado-candidato-alcan-abilidade-scoring/26-UI-SPEC.md (§Route ↔ gate invariant)
 */
import { describe, it, expect } from 'vitest'
import {
  AVALIACAO_ASSINCRONA_ETAPA,
  CONTAINER_TESTE_CONFIG,
} from '@/features/avaliacao/components/AvaliacaoContainer'

/**
 * The etapa set the LIVE 5-arg `pontuar_cognitivo` gate accepts — the SAME three
 * literals as `20260712100002_funil08_pontuar_cognitivo_gate.sql:83` (FUNIL-08 / 26-02).
 * Mirrored here so a change to either the RPC gate or the container's render etapa
 * surfaces as a broken assertion (the card must never route to a screen the RPC 42501s).
 */
const PONTUAR_COGNITIVO_ACCEPTED_ETAPAS: ReadonlySet<string> = new Set([
  'entrevista_online',
  'entrevista_presencial',
  'avaliacao_assincrona',
])

describe('cognitivo route↔gate contract (FUNIL-08)', () => {
  it('the etapa the cognitivo card renders in is one the pontuar_cognitivo RPC accepts', () => {
    // Imports the REAL container constant (not a copied literal) — integration-contract-gap lesson.
    expect(PONTUAR_COGNITIVO_ACCEPTED_ETAPAS.has(AVALIACAO_ASSINCRONA_ETAPA)).toBe(true)
    // Guard the constant itself is the async-hub etapa (documents the invariant explicitly).
    expect(AVALIACAO_ASSINCRONA_ETAPA).toBe('avaliacao_assincrona')
  })

  it('the cognitivo card routes to the REAL prova-cognitiva screen (not the dead stub)', () => {
    expect(CONTAINER_TESTE_CONFIG.cognitivo.route('abc-123')).toBe(
      '/candidato/prova-cognitiva/abc-123',
    )
    // The dead `/candidato/avaliacao/:id/cognitivo` stub must be gone.
    expect(CONTAINER_TESTE_CONFIG.cognitivo.route('abc-123')).not.toContain('/avaliacao/')
  })
})
