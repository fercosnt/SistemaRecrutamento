/**
 * Phase 4 / VAGA-02 — Runtime UUID-vs-slug discriminator.
 *
 * React Router v6 has no regex param matcher (verified via Context7); discrimination
 * happens at runtime inside VagaDetalhePage via this helper.
 *
 * Source: RESEARCH.md Pattern 1 (Slug-aware route with regex/UUID runtime branching).
 *
 * @module features/vagas/utils/isUuid
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (s: string): boolean => UUID_RE.test(s)
