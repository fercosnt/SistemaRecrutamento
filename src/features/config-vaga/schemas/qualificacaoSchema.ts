/**
 * Phase 8 / INSCR-03 — Etapa-1 qualification pergunta Zod schema + type (D-06, D-14).
 *
 * A qualification pergunta is a single question shown in the candidate's Etapa-1
 * inscription form. Knockout is NOT a pergunta property — it is an OPTION tagged
 * `'knockout'` inside a qualification pergunta (D-06). The default knockouts
 * (presencial-SP for all cargos, harmonização-orofacial for dentista) are seeded
 * in `cargoTemplates.ts` as the git source of truth (D-14).
 *
 * The `tag` enum reuses the Phase-7 `enum_tag_opcao` taxonomy (knockout | atencao
 * | neutro | pontua | fortemente_pontua) via `TAGS_OPCAO` — it is NOT redefined.
 *
 * @see .planning/phases/08-inscri-o-knock-out-etapa-1/08-RESEARCH.md
 * @see .planning/phases/08-inscri-o-knock-out-etapa-1/08-PATTERNS.md
 * @module features/config-vaga/schemas/qualificacaoSchema
 */
import { z } from 'zod'
import { TAGS_OPCAO } from './tagOpcaoSchema'
import type { TagOpcaoEnum } from '../types/configVagaTypes'

/** The kinds of answer a qualification pergunta accepts. `texto` = open-ended. */
export const TIPOS_RESPOSTA = [
  'single_choice',
  'multiple_choice',
  'texto',
  'numerica',
] as const

export type TipoRespostaQualificacao = (typeof TIPOS_RESPOSTA)[number]

/**
 * A single option of a qualification pergunta. `tag='knockout'` makes selecting
 * this option eliminate the candidate (the knockout lives on the OPTION, D-06).
 * `tag` reuses the Phase-7 enum_tag_opcao taxonomy.
 */
export const qualificacaoOpcaoSchema = z.object({
  id: z.string(),
  texto: z.string().min(1, 'O texto da opção é obrigatório.'),
  tag: z.enum(TAGS_OPCAO).optional(),
  peso: z.number().int().optional(),
})

export type QualificacaoOpcao = {
  id: string
  texto: string
  tag?: TagOpcaoEnum
  peso?: number
}

/**
 * A single Etapa-1 qualification pergunta. The seeded default knockouts in
 * `cargoTemplates.ts` are obrigatoria=true so the knockout actually fires
 * (T-08-05 mitigation; mirrors publish_vaga D-12 cond 3).
 */
export const qualificacaoPerguntaSchema = z.object({
  id: z.string(),
  texto_pergunta: z.string().min(1, 'O texto da pergunta é obrigatório.'),
  tipo_resposta: z.enum(TIPOS_RESPOSTA),
  obrigatoria: z.boolean(),
  ordem: z.number().int(),
  opcoes: z.array(qualificacaoOpcaoSchema),
})

export type QualificacaoPergunta = {
  id: string
  texto_pergunta: string
  tipo_resposta: TipoRespostaQualificacao
  obrigatoria: boolean
  ordem: number
  opcoes: QualificacaoOpcao[]
}

/** The Etapa-1 qualification block = an ordered list of perguntas. */
export const qualificacaoSchema = z.array(qualificacaoPerguntaSchema)
