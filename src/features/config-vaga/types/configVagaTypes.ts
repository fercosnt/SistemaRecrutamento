/**
 * Phase 7 — config-vaga TS types derived from the generated `database.types.ts`.
 *
 * NEVER hand-write DB types — these alias `Database['public']` so they track the
 * generated schema (CLAUDE.md). The jsonb-shape types come from the feature Zod
 * schemas (the source of truth for the jsonb internal shape, which the DB stores
 * opaquely as `Json`).
 *
 * @module features/config-vaga/types/configVagaTypes
 */
import type { Database } from '../../../../database.types'
import type { PesosAvaliacao } from '../schemas/pesosAvaliacaoSchema'
import type { TestesAplicaveis, TesteAplicavel } from '../schemas/testesAplicaveisSchema'
import type { TagOpcao } from '../schemas/tagOpcaoSchema'

// ── DB-derived aliases (generated) ────────────────────────────────────────────

export type TagOpcaoEnum = Database['public']['Enums']['enum_tag_opcao']
export type StatusVaga = Database['public']['Enums']['status_vaga']

export type PerguntaOpcaoMetadataRow =
  Database['public']['Tables']['pergunta_opcao_metadata']['Row']
export type PerguntaOpcaoMetadataInsert =
  Database['public']['Tables']['pergunta_opcao_metadata']['Insert']

export type VagaRow = Database['public']['Tables']['vagas']['Row']
export type VagaUpdate = Database['public']['Tables']['vagas']['Update']

// ── jsonb internal shapes (from the feature schemas) ──────────────────────────

export type { PesosAvaliacao, TestesAplicaveis, TesteAplicavel, TagOpcao }

/**
 * The config slice of a vaga: the two M2 jsonb columns persisted by
 * `configVagaService.updateVagaConfig`.
 */
export interface VagaConfig {
  testes_aplicaveis: TestesAplicaveis
  pesos_avaliacao: PesosAvaliacao
}

/**
 * A single option sent to the `upsert_pergunta_opcoes_metadata` RPC.
 * `opcao_id` is null/absent for new options (the RPC mints a stable uuid).
 */
export interface OpcaoMetadataInput {
  opcao_id?: string | null
  texto: string
  tag?: TagOpcaoEnum
  peso?: number
  nota_ia?: string | null
  ordem?: number
}
