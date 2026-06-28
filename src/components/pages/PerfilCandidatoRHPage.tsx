/**
 * PerfilCandidatoRHPage — thin wrapper at the canonical `/rh/candidatos/:id` mount (D-04/D-05).
 *
 * This file used to hold the 1864-line hardcoded mock (the old M1 personality/cognitive
 * tabs, chart-library radar/pie widgets, fabricated scores). Per D-05 the mock is RETIRED
 * and its destination CONTENT is replaced by the real, service-backed, etapa-guided hub —
 * `HubCandidatoRH` (the
 * new `src/features/hub-candidato/` feature). The named export `PerfilCandidatoRHPage` is
 * preserved so `src/router/routes.tsx` keeps mounting it unchanged (no route-table churn /
 * no same-wave collision with 17-02/17-05). The `:id` route param IS a candidaturaId
 * (Pitfall 1) — the hub reads it via `useParams`.
 *
 * @module components/pages/PerfilCandidatoRHPage
 * @see src/features/hub-candidato/components/HubCandidatoRH.tsx (the real hub this now renders)
 */
import { HubCandidatoRH } from '@/features/hub-candidato'

export function PerfilCandidatoRHPage() {
  return <HubCandidatoRH />
}
