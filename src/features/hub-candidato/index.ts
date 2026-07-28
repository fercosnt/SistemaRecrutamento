/**
 * hub-candidato feature barrel (D-15).
 *
 * Re-exports the RH candidate hub so the canonical mount at `/rh/candidatos/:id`
 * (the retired `PerfilCandidatoRHPage` thin wrapper) imports it via
 * `@/features/hub-candidato`.
 *
 * @module features/hub-candidato
 */
export { HubCandidatoRH } from './components/HubCandidatoRH'
export { HubSection } from './components/HubSection'
export type { HubSectionEstado, HubSectionProps } from './components/HubSection'
