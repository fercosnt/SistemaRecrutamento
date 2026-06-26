/**
 * Phase 15 / Plan 15-03 — `RegistrarDecisaoForm` decision-capture Zod schema
 * (DECISAO-03).
 *
 * The terminal decision payload: a 3-option `decisao` ∈ {aprovado, rejeitado,
 * em_espera} (the live `decisao_final_resultado` enum) + a mandatory justificativa
 * of ≥50 characters. The ≥50 client gate MIRRORS the DB CHECK and the
 * `registrar_decisao` RPC re-assertion (defense in depth, T-15-10): the client
 * floor is UX; the server is the truth.
 *
 * Mirrors the `pesosAvaliacaoSchema` shape (zod object + typed export) — the
 * config-vaga schema analog. The min(50) message is the EXACT pt-BR copy from
 * 15-UI-SPEC §Copywriting (the too-short error).
 *
 * @see src/features/config-vaga/schemas/pesosAvaliacaoSchema.ts (the zod-object analog)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (copy contract)
 * @module features/decisao/schemas/decisaoSchema
 */
import { z } from 'zod'

/** The min-chars floor for the justificativa — mirrors the DB CHECK (defense in depth). */
export const JUSTIFICATIVA_MIN = 50

export const decisaoSchema = z.object({
  decisao: z.enum(['aprovado', 'rejeitado', 'em_espera']),
  justificativa: z
    .string()
    .min(JUSTIFICATIVA_MIN, 'A justificativa precisa de pelo menos 50 caracteres.'),
})

export type DecisaoFormValues = z.infer<typeof decisaoSchema>

/** The 3 decision options, in the UI-SPEC order with the exact pt-BR labels. */
export const DECISAO_OPTIONS: { value: DecisaoFormValues['decisao']; label: string }[] = [
  { value: 'aprovado', label: 'Aprovar' },
  { value: 'rejeitado', label: 'Rejeitar' },
  { value: 'em_espera', label: 'Manter em espera' },
]
