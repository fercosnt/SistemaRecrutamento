/**
 * Phase 7 — Serviço de Configuração de Vaga (M2).
 *
 * Persists the new vaga config fields (`testes_aplicaveis`, `pesos_avaliacao`)
 * and drives the two PL/pgSQL RPCs:
 *   - `upsert_pergunta_opcoes_metadata` — atomic jsonb↔table tag sync (VAGACFG-03)
 *   - `publish_vaga` — server-side D-12 publish gate (rascunho→ativa)
 *
 * Mirrors `features/vagas/services/vagasService.ts` (custom error class +
 * try/catch error mapping). Uses the ANON client only — never the admin /
 * service-role client (CLAUDE.md Security Rules). Authorization is enforced
 * server-side by the RLS
 * policies + the in-body role check inside the SECURITY DEFINER RPCs (Plan 02).
 *
 * @module features/config-vaga/services/configVagaService
 */
import { supabase } from '@/lib/supabase/client'
import type { Json, Database } from '../../../../database.types'
import type {
  VagaConfig,
  OpcaoMetadataInput,
} from '../types/configVagaTypes'

/**
 * Base-field write payload for `updateVagaBase` (FUNIL-04). Field names carry the
 * form's semantics; the writer maps each to its real `vagas` column.
 */
export interface VagaBaseInput {
  titulo: string
  departamento: string | null
  cidade: string | null
  estado: string | null
  faixaSalarialMin: number | null
  faixaSalarialMax: number | null
  jornada: string | null
  responsabilidades: string | null
  formacao: string | null
  experiencia: string | null
  tecnicos: string | null
  habilidades: string | null
  perfilIdeal: string | null
  diferenciais: string | null
  status: Database['public']['Enums']['status_vaga']
}

/**
 * Custom Error for config-vaga operations.
 *
 * Mirrors `VagasServiceError`'s code union plus `'FORBIDDEN'` (maps a Supabase
 * `42501` error raised by the SECURITY DEFINER in-body role check).
 */
export class ConfigVagaServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN',
    public details?: unknown
  ) {
    super(message)
    this.name = 'ConfigVagaServiceError'
  }
}

/** A Supabase error whose code/message indicates a 42501 (insufficient privilege). */
function isForbidden(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42501' ||
    /\b42501\b/.test(error.message ?? '') ||
    /forbidden|insufficient.?privilege/i.test(error.message ?? '')
  )
}

/**
 * Persist the two M2 jsonb columns on a vaga (D-02 "ligar de verdade").
 * Used by "Salvar rascunho" — NO publish validation (D-12: drafts never validate).
 */
export async function updateVagaConfig(
  vagaId: string,
  config: VagaConfig
): Promise<void> {
  const { error } = await supabase
    .from('vagas')
    .update({
      testes_aplicaveis: config.testes_aplicaveis,
      pesos_avaliacao: config.pesos_avaliacao,
    })
    .eq('id', vagaId)

  if (error) {
    if (isForbidden(error)) {
      throw new ConfigVagaServiceError(
        'Sem permissão para alterar a configuração desta vaga.',
        'FORBIDDEN',
        error
      )
    }
    throw new ConfigVagaServiceError(
      `Erro ao salvar configuração da vaga: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }
}

/**
 * Persist the vaga BASE fields + status on the Editar Vaga edit-save path
 * (FUNIL-04). Mirrors `updateVagaConfig`: a single real `.from('vagas').update`
 * keyed on the vaga id, anon client only (RLS + the Phase-24 vaga-scoping govern
 * who may UPDATE which vaga); a Supabase `42501` maps to code 'FORBIDDEN'.
 *
 * The payload writes ONLY columns that exist on the `vagas` Row — closing the
 * silent no-op persistence hole (T-25-03-02).
 */
export async function updateVagaBase(
  vagaId: string,
  base: VagaBaseInput
): Promise<void> {
  const { error } = await supabase
    .from('vagas')
    .update({
      titulo: base.titulo,
      departamento: base.departamento,
      cidade: base.cidade,
      estado: base.estado,
      faixa_salarial_min: base.faixaSalarialMin,
      faixa_salarial_max: base.faixaSalarialMax,
      jornada_trabalho: base.jornada,
      responsabilidades: base.responsabilidades,
      requisitos_formacao: base.formacao,
      requisitos_experiencia: base.experiencia,
      requisitos_tecnicos: base.tecnicos,
      requisitos_habilidades: base.habilidades,
      perfil_ideal: base.perfilIdeal,
      diferenciais: base.diferenciais,
      status: base.status,
    })
    .eq('id', vagaId)

  if (error) {
    if (isForbidden(error)) {
      throw new ConfigVagaServiceError(
        'Sem permissão para salvar as alterações desta vaga.',
        'FORBIDDEN',
        error
      )
    }
    throw new ConfigVagaServiceError(
      `Erro ao salvar a vaga: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }
}

/**
 * Atomic jsonb↔table tag sync for one pergunta (VAGACFG-03).
 * Calls `upsert_pergunta_opcoes_metadata(p_pergunta_id, p_opcoes)`. The RPC mints
 * a stable `opcao_id` per option (where absent), writes the id-bearing jsonb back
 * to `opcoes_resposta`, and replaces the `pergunta_opcao_metadata` rows.
 */
export async function upsertOpcoesMetadata(
  perguntaId: string,
  opcoes: OpcaoMetadataInput[]
): Promise<unknown> {
  const { data, error } = await supabase.rpc(
    'upsert_pergunta_opcoes_metadata',
    {
      p_pergunta_id: perguntaId,
      // The RPC arg is typed `Json`; OpcaoMetadataInput[] is a JSON-serializable
      // payload with optional fields, so cast at the boundary.
      p_opcoes: opcoes as unknown as Json,
    }
  )

  if (error) {
    if (isForbidden(error)) {
      throw new ConfigVagaServiceError(
        'Sem permissão para configurar as tags desta pergunta.',
        'FORBIDDEN',
        error
      )
    }
    throw new ConfigVagaServiceError(
      `Erro ao sincronizar tags das opções: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }

  return data
}

/**
 * Server-side D-12 publish gate (rascunho→ativa). Calls `publish_vaga(p_vaga_id)`,
 * which re-checks the 3 conditions before flipping `status='ativa'` — the
 * authoritative gate (the client `publishGate` fn is UX-only).
 */
export async function publishVaga(vagaId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('publish_vaga', {
    p_vaga_id: vagaId,
  })

  if (error) {
    if (isForbidden(error)) {
      throw new ConfigVagaServiceError(
        'Sem permissão para publicar esta vaga.',
        'FORBIDDEN',
        error
      )
    }
    throw new ConfigVagaServiceError(
      `Erro ao publicar vaga: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }

  return data
}
