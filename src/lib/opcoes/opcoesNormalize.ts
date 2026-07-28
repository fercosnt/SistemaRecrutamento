/**
 * Phase 7 / D-13 — Neutral option-shape normalization helper.
 *
 * `perguntas_formulario.opcoes_resposta` was historically a flat `string[]`.
 * D-10 migrates it to the object shape `[{ id, texto }]` so each option gains a
 * stable `opcao_id`. This helper bridges BOTH shapes so the migration is
 * backward-compatible with shipped consumers (the Phase-4 candidato form).
 *
 * This module lives under `src/lib/` (NOT inside any feature) precisely so BOTH
 * the `config-vaga` feature AND the shipped `vagas` reader import it via
 * `@/lib/opcoes/opcoesNormalize`, keeping the dependency direction acyclic
 * (feature → lib, never feature → feature) per CLAUDE.md import rules.
 *
 * Pure functions only — no React, no Supabase. Idempotent across both shapes.
 *
 * @module lib/opcoes/opcoesNormalize
 */

/** The object shape D-10 migrates `opcoes_resposta` toward. */
export interface OpcaoObjeto {
  id: string
  texto: string
}

/** Either the legacy flat string array or the new object array (or null/unknown). */
export type OpcoesResposta = unknown

/**
 * Type guard — an option in object shape `{ id, texto }`.
 */
function isOpcaoObjeto(value: unknown): value is OpcaoObjeto {
  return (
    typeof value === 'object' &&
    value !== null &&
    'texto' in value &&
    typeof (value as { texto: unknown }).texto === 'string'
  )
}

/**
 * Normalize `opcoes_resposta` (legacy `string[]` OR new `[{id,texto}]`) to a
 * plain `string[]` of option texts.
 *
 * Idempotent: passing a legacy `string[]` returns it unchanged (filtered to
 * strings); passing the object shape reads each `.texto`. Non-array / null
 * inputs yield `[]`.
 *
 * Used by the candidato form to build `z.enum(opts)` from option STRINGS.
 */
export function opcoesToStrings(opcoes: OpcoesResposta): string[] {
  if (!Array.isArray(opcoes)) return []
  return opcoes
    .map((item) => {
      if (typeof item === 'string') return item
      if (isOpcaoObjeto(item)) return item.texto
      return null
    })
    .filter((texto): texto is string => texto !== null)
}

/**
 * Normalize `opcoes_resposta` to the object shape `[{ id, texto }]`.
 *
 * Idempotent: object-shape inputs pass through (preserving their `id`); legacy
 * string inputs get an empty `id` ('') so the sync RPC can mint a stable
 * `opcao_id` server-side via `gen_random_uuid()`. Non-array / null inputs yield
 * `[]`.
 */
export function opcoesToObjects(opcoes: OpcoesResposta): OpcaoObjeto[] {
  if (!Array.isArray(opcoes)) return []
  return opcoes
    .map((item): OpcaoObjeto | null => {
      if (typeof item === 'string') return { id: '', texto: item }
      if (isOpcaoObjeto(item)) {
        const id = 'id' in item && typeof item.id === 'string' ? item.id : ''
        return { id, texto: item.texto }
      }
      return null
    })
    .filter((opcao): opcao is OpcaoObjeto => opcao !== null)
}
