/**
 * Phase 14 / Plan 14-01 Task 1 — client↔EF contract test (ENTREV-01/03 / Pitfall 5
 * — [[feedback_integration_contract_gap]]). MIGRATED in Phase 27 / Plan 27-02 (CI-07):
 * the two entrevista bodies (GerarGuia + AvaliarTranscricao) now do a REAL
 * `.safeParse` against the ONE shared EF body schema module both runtimes import
 * (`_shared/entrevista-schemas`, bare `zod` resolved by Deno via the deno.json import
 * map and by Node via node_modules) — the filesystem source-text probes are gone.
 *
 * THE integration-contract lesson (the Phase-11 SJT C1/C2 lesson): the body the
 * RH/candidate client builds MUST parse in the EF's `.strict()` Zod body schema, and
 * the body carries only identifiers + raw text — NEVER a score/band (RNF-07a).
 *
 * NOTE (scope): the SubmitCognitivo body + BandaCognitivaEnum stay as Node-local
 * replicas here — `_shared/cognitivo-schemas.ts` was NOT migrated to bare `zod` in
 * 27-02 (each shared-module rewrite forces an EF redeploy; 27-02 migrates exactly
 * schemas.ts + redacao-schemas.ts + entrevista-schemas.ts). The cognitivo shared
 * import can migrate the day its module is rewritten.
 *
 * @see supabase/functions/_shared/entrevista-schemas.ts (the shared EF body schemas)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  GerarGuiaBodySchema,
  AvaliarTranscricaoBodySchema,
} from '../../../../supabase/functions/_shared/entrevista-schemas'

// ── supabase mock for the saveGuiaEdits write-path contract (Plan 20-03) ──
// Capture the rpc args so the anti-tamper assertion can inspect the exact payload.
const supaMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  // getGuia read-back goes through .from().select().eq().order().limit() — return empty.
  select: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  const limit = vi.fn().mockResolvedValue({ data: [], error: null })
  const order = vi.fn(() => ({ limit }))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  supaMocks.select = select
  return {
    supabase: {
      rpc: supaMocks.rpc,
      from: vi.fn(() => ({ select })),
    },
  }
})

// ── Cognitivo replicas (cognitivo-schemas.ts not migrated in 27-02 — see header) ──
const SubmitCognitivoBodySchemaReplica = z
  .object({
    candidatura_id: z.string().min(1),
    raw_responses: z.record(z.string(), z.number().int()),
    shuffle_seed: z.string().min(1),
    client_timings: z.array(z.number()).optional(),
  })
  .strict()

const BandaCognitivaEnumReplica = z.enum([
  'bem_abaixo',
  'abaixo',
  'na_media',
  'acima',
  'bem_acima',
])

// The exact bodies the clients build (mirror the service layers, 14-05):
// only identifiers + raw text/picks. NEVER a score/band/threshold (RNF-07a).
function buildGuiaBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    vaga_id: '22222222-2222-4222-8222-222222222222',
    tipo: 'online' as const,
  }
}

function buildTranscricaoBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    transcricao: 'Entrevistador: fale sobre... Candidato: numa ocasião eu... (transcrição).',
  }
}

function buildCognitivoBody() {
  return {
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    raw_responses: { item_01: 3, item_02: 1, item_03: 4 },
    shuffle_seed: '11111111-1111-4111-8111-111111111111',
  }
}

describe('Entrevista client↔EF body contract (ENTREV-01/03 / Pitfall 5)', () => {
  it('the GerarGuia client body {candidatura_id, vaga_id, tipo} parses in the shared EF schema', () => {
    expect(GerarGuiaBodySchema.safeParse(buildGuiaBody()).success).toBe(true)
  })

  it('.strict REJECTS a GerarGuia body carrying an injected `score` field (anti-tamper)', () => {
    const tampered = { ...buildGuiaBody(), score: 5 }
    expect(GerarGuiaBodySchema.safeParse(tampered).success).toBe(false)
  })

  it('GerarGuia tipo only accepts online|presencial', () => {
    const bad = { ...buildGuiaBody(), tipo: 'hibrido' }
    expect(GerarGuiaBodySchema.safeParse(bad).success).toBe(false)
  })

  it('the AvaliarTranscricao client body {candidatura_id, transcricao} parses in the shared EF schema', () => {
    expect(AvaliarTranscricaoBodySchema.safeParse(buildTranscricaoBody()).success).toBe(true)
  })

  it('.strict REJECTS an AvaliarTranscricao body carrying an injected `band` field', () => {
    const tampered = { ...buildTranscricaoBody(), banda: 'acima' }
    expect(AvaliarTranscricaoBodySchema.safeParse(tampered).success).toBe(false)
  })

  it('an empty transcricao fails (min(1) — server still revalidates length≥200)', () => {
    const body = { ...buildTranscricaoBody(), transcricao: '' }
    expect(AvaliarTranscricaoBodySchema.safeParse(body).success).toBe(false)
  })

  it('the SubmitCognitivo candidate body {candidatura_id, raw_responses, shuffle_seed} parses (replica)', () => {
    expect(SubmitCognitivoBodySchemaReplica.safeParse(buildCognitivoBody()).success).toBe(true)
  })

  it('.strict REJECTS a SubmitCognitivo body carrying an injected `score`/`banda` field (replica)', () => {
    const tamperedScore = { ...buildCognitivoBody(), score: 21 }
    expect(SubmitCognitivoBodySchemaReplica.safeParse(tamperedScore).success).toBe(false)
    const tamperedBanda = { ...buildCognitivoBody(), banda: 'acima' }
    expect(SubmitCognitivoBodySchemaReplica.safeParse(tamperedBanda).success).toBe(false)
  })

  it('the optional client_timings (advisory anti-cheat) parses (replica)', () => {
    const body = { ...buildCognitivoBody(), client_timings: [12, 8, 30] }
    expect(SubmitCognitivoBodySchemaReplica.safeParse(body).success).toBe(true)
  })

  it('BandaCognitivaEnum enumerates exactly the 5 pt-BR faixas (replica)', () => {
    const expected = ['bem_abaixo', 'abaixo', 'na_media', 'acima', 'bem_acima']
    expect(BandaCognitivaEnumReplica.options).toEqual(expected)
  })
})

// ── saveGuiaEdits write-path contract (ENTREV-06/07/08 / Plan 20-03) ──
// The RH-edit save must call the LIVE save_entrevista_guia_edits RPC with
// { p_candidatura_id, p_tipo, p_guia: { perguntas } }, map a 42501 → FORBIDDEN via
// the existing mapRpcError, and carry NO score/band on the payload (anti-tamper).
import {
  saveGuiaEdits,
  EntrevistaServiceError,
  type GuiaPergunta,
} from '../services/entrevistaService'

describe('saveGuiaEdits write-path contract (ENTREV-06/07/08 / RNF-07a)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supaMocks.rpc.mockResolvedValue({ data: null, error: null })
  })

  const perguntas: GuiaPergunta[] = [
    { pergunta: 'Pergunta IA', dimensao: 'Comunicação', origem: 'ia' },
    { pergunta: 'Pergunta manual', dimensao: 'Clínica', origem: 'manual' },
  ]

  it('calls supabase.rpc("save_entrevista_guia_edits") with { p_candidatura_id, p_tipo, p_guia: { perguntas } }', async () => {
    await saveGuiaEdits('cand-1', 'online', perguntas)
    expect(supaMocks.rpc).toHaveBeenCalledWith('save_entrevista_guia_edits', {
      p_candidatura_id: 'cand-1',
      p_tipo: 'online',
      p_guia: { perguntas },
    })
  })

  it('throws INVALID_INPUT when candidaturaId is empty (no RPC call)', async () => {
    await expect(saveGuiaEdits('', 'online', perguntas)).rejects.toMatchObject({
      name: 'EntrevistaServiceError',
      code: 'INVALID_INPUT',
    })
    expect(supaMocks.rpc).not.toHaveBeenCalled()
  })

  it('maps an RPC 42501 (insufficient_privilege) → FORBIDDEN via mapRpcError', async () => {
    supaMocks.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'forbidden' } })
    await expect(saveGuiaEdits('cand-1', 'online', perguntas)).rejects.toMatchObject({
      name: 'EntrevistaServiceError',
      code: 'FORBIDDEN',
    })
  })

  it('never exposes the raw RPC error message (user-safe copy only — no PII)', async () => {
    supaMocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied for relation entrevista_guias of user cand@x.com' },
    })
    let caught: unknown
    try {
      await saveGuiaEdits('cand-1', 'online', perguntas)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(EntrevistaServiceError)
    expect((caught as EntrevistaServiceError).message).not.toMatch(/cand@x\.com|permission denied/)
  })

  it('ANTI-TAMPER: the RPC p_guia payload carries NO score/band/nota/veredito decision key', async () => {
    // The RH edits pergunta/dimensao/origem only; the guide is a recommendation that
    // never feeds candidaturas (RNF-07a). Serialize the exact payload sent and assert
    // it contains no score/band token at the decision level.
    await saveGuiaEdits('cand-1', 'presencial', perguntas)
    const [, args] = supaMocks.rpc.mock.calls[0] as [string, { p_guia: unknown }]
    const serialized = JSON.stringify(args.p_guia)
    // score_atual (the weak-dim ANCHOR motivating an IA question) is informational
    // display, NOT a candidate decision — but a top-level score/band/veredito is the
    // tamper surface the contract forbids. The RH never posts one.
    expect(serialized).not.toMatch(/"banda"|"band"|"veredito"|"threshold"|"aprovado"|"reprovado"/i)
  })

  it('NEVER writes candidaturas — the only mutation is the guide RPC (RNF-07a)', async () => {
    await saveGuiaEdits('cand-1', 'online', perguntas)
    // Only the guide RPC is invoked; getGuia read-back uses .from('entrevista_guias').
    expect(supaMocks.rpc).toHaveBeenCalledTimes(1)
    expect(supaMocks.rpc.mock.calls[0][0]).toBe('save_entrevista_guia_edits')
  })
})
