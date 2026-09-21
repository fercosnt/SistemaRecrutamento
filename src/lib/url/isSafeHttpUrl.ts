/**
 * isSafeHttpUrl — the ONE http(s) URL guard for interview links.
 *
 * Defense-in-depth (WR-01): only treat an RH-written online meeting URL as a link when it
 * parses AND its scheme is `http:`/`https:`. `local_ou_link` comes from the RH write layer,
 * so a `javascript:`/`data:` URL is reachable via bad/compromised data.
 *
 * Moved verbatim from `AgendamentoCandidatoCard.tsx` (Phase 48 / 48-03, JORN-D5) so the
 * SAME function decides both sides:
 *  - render: the candidate card only linkifies what passes (else inert plain text);
 *  - write: `agendamentoSchema` refuses an online interview whose link does not pass.
 * The server layer is the trigger `validar_local_ou_link_agendamento`
 * (supabase/migrations/20260921000003_p48_local_ou_link_valida.sql), which is slightly
 * stricter (it also requires the `//` and a host) — on divergence it fails closed.
 *
 * @module lib/url/isSafeHttpUrl
 * @see src/features/agendamento/components/AgendamentoCandidatoCard.tsx (render, WR-01 — extraction source)
 * @see src/features/agendamento/schemas/agendamentoSchema.ts (write, JORN-D5)
 */
export function isSafeHttpUrl(u: string): boolean {
  try {
    const { protocol } = new URL(u.trim())
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
