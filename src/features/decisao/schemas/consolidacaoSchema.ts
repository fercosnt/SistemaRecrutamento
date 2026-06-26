/**
 * Shared consolidation request schema (DECISAO-01).
 *
 * THE single source of truth for the `consolidar-decisao-final` EF request body,
 * imported by BOTH the EF (Wave 1) and the RH client `decisaoService` (Wave 2) so
 * the client↔EF contract CANNOT drift — the integration-contract lesson that broke
 * Phase 11 SJT (client sent a body the EF Zod schema rejected, both mocked sides
 * green while the real contract was broken). [[feedback_integration_contract_gap]]
 *
 * The body carries ONLY the two identifiers — NEVER a peso / threshold / numeric
 * input (anti-tamper, RNF-07a): the EF reads already-recorded results server-side
 * and the consolidated number is derived, never client-supplied. `.strict()`
 * REJECTS any extra/unknown key.
 *
 * The EF (Deno runtime) re-declares this same shape via a static `npm:zod` import;
 * this module is the Node/Vite-side source the contract test (15-01 Task 3a) probes.
 *
 * @see supabase/functions/consolidar-decisao-final/index.ts (Wave 1 — imports the shape)
 * @see src/features/decisao/schemas/__tests__/consolidacaoContract.test.ts (the contract probe)
 */
import { z } from 'zod'

/**
 * The consolidation EF request body: exactly two identifiers. `.strict()` so an
 * unknown key (or any injected numeric input) is rejected at the boundary.
 */
export const ConsolidacaoRequestSchema = z
  .object({
    candidatura_id: z.string().uuid(),
    vaga_id: z.string().uuid(),
  })
  .strict()

export type ConsolidacaoRequest = z.infer<typeof ConsolidacaoRequestSchema>
