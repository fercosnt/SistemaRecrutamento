/**
 * Phase 7 / VAGACFG-03 — tag-row Zod schema for option metadata (D-11).
 *
 * Taxonomy (5 tags, enum `enum_tag_opcao`):
 *   knockout | atencao | neutro | pontua | fortemente_pontua
 * plus `peso int` (range -999..100, matching the DB CHECK) and
 * `nota_ia text` (nullable/optional). An unmarked option = `neutro` + peso 0 +
 * nota_ia null (= "informativa").
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Code Examples
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-11)
 * @module features/config-vaga/schemas/tagOpcaoSchema
 */
import { z } from 'zod'
import type { Database } from '../../../../database.types'

/** The 5 tags — kept in sync with `Database['public']['Enums']['enum_tag_opcao']`. */
export const TAGS_OPCAO = [
  'knockout',
  'atencao',
  'neutro',
  'pontua',
  'fortemente_pontua',
] as const

// Compile-time guard: the literal list above must be assignable to the
// generated DB enum (drift between the two becomes a type error here).
type _AssertTagsMatch =
  (typeof TAGS_OPCAO)[number] extends Database['public']['Enums']['enum_tag_opcao']
    ? true
    : never
export type _TagsMatchGuard = _AssertTagsMatch

export const tagOpcaoSchema = z.object({
  tag: z.enum(TAGS_OPCAO),
  peso: z
    .number()
    .int()
    .min(-999, 'Peso mínimo é -999')
    .max(100, 'Peso máximo é 100'),
  nota_ia: z.string().nullable().optional(),
})

export type TagOpcao = z.infer<typeof tagOpcaoSchema>
