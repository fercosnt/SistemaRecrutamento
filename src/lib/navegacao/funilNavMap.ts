/**
 * Phase 17 / D-17 — Single-source funnel-stage → screen navigation map.
 *
 * Maps every M2 funnel stage (`EtapaFunilM2`) to its candidate-facing route, its
 * RH-workspace route, the stage label, and the step-guided CTA copy for each persona.
 * Both the candidate Dashboard step-CTA (D-09) AND the RH candidate hub (D-06) consume
 * THIS map, so the "próximo passo" experience is identical across personas and stays
 * drift-proof when the DB enum changes (D-17).
 *
 * This module lives under `src/lib/` (NOT inside any feature) precisely so BOTH the
 * candidate Dashboard page AND the RH hub feature import it via `@/lib/navegacao/funilNavMap`,
 * keeping the dependency direction acyclic (feature → lib, never feature → feature) per
 * CLAUDE.md import rules — the same rationale as `@/lib/opcoes/opcoesNormalize`.
 *
 * The funnel enum + pt-BR labels are REUSED from `triagemService` — never re-declared.
 * A parallel copy would reintroduce the exact 22P02 enum-drift bug that `ETAPA_M2_LABELS`
 * was created to fix (see triagemService.ts L307-314).
 *
 * Pure module — no React, no Supabase. All route functions are pure string builders.
 *
 * Pitfall 1 (THE central landmine): every `:id` route segment carries a **candidaturaId**,
 * NOT a candidato/vaga id — every M2 workspace + hub hook keys on candidaturaId.
 *
 * @module lib/navegacao/funilNavMap
 */

import {
  type EtapaFunilM2,
  ETAPA_M2_LABELS,
} from '@/features/triagem/services/triagemService'

/**
 * Navigation entry for one funnel stage.
 *
 * `rotaCandidato` / `rotaWorkspaceRH` return `null` when there is no candidate-facing
 * screen / RH workspace for that stage (e.g. `inscricao` and `triagem` have no dedicated
 * candidate screen, and the RH hub itself IS the destination for them).
 */
export interface FunilNavEntry {
  /** = ETAPA_M2_LABELS[etapa] (reused, never hardcoded). */
  label: string
  /** Candidate-facing route for this stage, or null if none. `:id` = candidaturaId. */
  rotaCandidato: (candidaturaId: string) => string | null
  /** RH workspace route for this stage, or null if none. `:id` = candidaturaId. */
  rotaWorkspaceRH: (candidaturaId: string) => string | null
  /** Candidate step-CTA copy (UI-SPEC): "Continuar para {label}". */
  ctaCandidato: string
  /** RH step-CTA copy (UI-SPEC): "Abrir {label}". */
  ctaRH: string
}

/**
 * Single source of truth: `EtapaFunilM2 → FunilNavEntry`.
 *
 * Typed as `Record<EtapaFunilM2, FunilNavEntry>` so TypeScript enforces EXHAUSTIVENESS —
 * the 8 funnel stages must all be present, and the enum cannot grow without this map
 * failing to compile (the D-17 drift guard).
 *
 * Route targets are verified against `src/router/routes.tsx`:
 *   - `/candidato/avaliacao/:candidaturaId` — Avaliação Assíncrona container. The
 *     `/candidato/prova-cognitiva/:id` and `/candidato/redacao/:id` screens are
 *     SUB-SCREENS of this container (it fans out internally — A2), so the candidate
 *     routes to the avaliação container during `avaliacao_assincrona`, not to a
 *     standalone redação/cognitiva route.
 *   - `/candidato/explicacao/:candidaturaId` — LGPD Art. 20 explanation (rejeitado).
 *   - `/rh/candidato/:candidaturaId/entrevista` — interview workspace (online/presencial).
 *   - `/rh/candidato/:candidaturaId/decisao` — final-decision workspace (decisao_final/aprovado/rejeitado).
 */
export const funilNavMap: Record<EtapaFunilM2, FunilNavEntry> = {
  inscricao: {
    label: ETAPA_M2_LABELS.inscricao,
    rotaCandidato: () => null,
    rotaWorkspaceRH: () => null,
    ctaCandidato: `Continuar para ${ETAPA_M2_LABELS.inscricao}`,
    ctaRH: `Abrir ${ETAPA_M2_LABELS.inscricao}`,
  },
  triagem: {
    label: ETAPA_M2_LABELS.triagem,
    // Triagem is an RH-side stage; the candidate has no dedicated screen and the RH
    // hub itself is the destination — hence both routes are null.
    rotaCandidato: () => null,
    rotaWorkspaceRH: () => null,
    ctaCandidato: `Continuar para ${ETAPA_M2_LABELS.triagem}`,
    ctaRH: `Abrir ${ETAPA_M2_LABELS.triagem}`,
  },
  avaliacao_assincrona: {
    label: ETAPA_M2_LABELS.avaliacao_assincrona,
    rotaCandidato: (candidaturaId) => `/candidato/avaliacao/${candidaturaId}`,
    rotaWorkspaceRH: () => null,
    ctaCandidato: `Continuar para ${ETAPA_M2_LABELS.avaliacao_assincrona}`,
    ctaRH: `Abrir ${ETAPA_M2_LABELS.avaliacao_assincrona}`,
  },
  entrevista_online: {
    label: ETAPA_M2_LABELS.entrevista_online,
    rotaCandidato: () => null,
    rotaWorkspaceRH: (candidaturaId) => `/rh/candidato/${candidaturaId}/entrevista`,
    ctaCandidato: `Continuar para ${ETAPA_M2_LABELS.entrevista_online}`,
    ctaRH: `Abrir ${ETAPA_M2_LABELS.entrevista_online}`,
  },
  entrevista_presencial: {
    label: ETAPA_M2_LABELS.entrevista_presencial,
    rotaCandidato: () => null,
    rotaWorkspaceRH: (candidaturaId) => `/rh/candidato/${candidaturaId}/entrevista`,
    ctaCandidato: `Continuar para ${ETAPA_M2_LABELS.entrevista_presencial}`,
    ctaRH: `Abrir ${ETAPA_M2_LABELS.entrevista_presencial}`,
  },
  decisao_final: {
    label: ETAPA_M2_LABELS.decisao_final,
    rotaCandidato: () => null,
    rotaWorkspaceRH: (candidaturaId) => `/rh/candidato/${candidaturaId}/decisao`,
    ctaCandidato: `Continuar para ${ETAPA_M2_LABELS.decisao_final}`,
    ctaRH: `Abrir ${ETAPA_M2_LABELS.decisao_final}`,
  },
  aprovado: {
    label: ETAPA_M2_LABELS.aprovado,
    rotaCandidato: () => null,
    rotaWorkspaceRH: (candidaturaId) => `/rh/candidato/${candidaturaId}/decisao`,
    ctaCandidato: `Continuar para ${ETAPA_M2_LABELS.aprovado}`,
    ctaRH: `Abrir ${ETAPA_M2_LABELS.aprovado}`,
  },
  rejeitado: {
    label: ETAPA_M2_LABELS.rejeitado,
    // Candidate path = the LGPD Art. 20 explanation screen (D-11).
    rotaCandidato: (candidaturaId) => `/candidato/explicacao/${candidaturaId}`,
    rotaWorkspaceRH: (candidaturaId) => `/rh/candidato/${candidaturaId}/decisao`,
    ctaCandidato: `Continuar para ${ETAPA_M2_LABELS.rejeitado}`,
    ctaRH: `Abrir ${ETAPA_M2_LABELS.rejeitado}`,
  },
}
