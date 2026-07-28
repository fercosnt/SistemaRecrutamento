/**
 * Phase 8 / Plan 08-01 Task 1 — Wave 0 RED scaffold for the LGPD-clean cadastro
 * Etapa-1 schema (INSCR-01, LGPD-01).
 *
 * D-02 / INSCR-01: CPF and gênero are NO LONGER collected at cadastro. The
 * Dados Pessoais schema must therefore parse a payload that OMITS `cpf` and
 * `genero` successfully. Today `dadosPessoaisSchema` makes BOTH required
 * (`cpf: cpfSchema` is `.min(1)` + `.refine(validateCPF)`; `genero` is a bare
 * `z.enum([...])` with no `.optional()`), so omitting them yields
 * `.success === false`. This assertion is RED now and flips GREEN once Plan
 * 08-02 makes cpf/genero non-collected (dropped from the schema, or optional).
 *
 * `dadosPessoaisSchema` is the canonical export for the Dados Pessoais step
 * (there is no separate `candidatoSchema` symbol — the aggregate is
 * `candidatoFormSchema`); this file is named per the Plan 08-01 Task 1 spec.
 *
 * Do NOT edit the production schema in this task — only the failing test.
 *
 * @see .planning/phases/08-inscri-o-knock-out-etapa-1/08-RESEARCH.md (INSCR-01, LGPD-01)
 * @see .planning/phases/08-inscri-o-knock-out-etapa-1/08-01-PLAN.md Task 1
 */
import { describe, it, expect } from 'vitest'
import { dadosPessoaisSchema } from '../candidatoSchema'

// A Dados Pessoais payload that is valid under the POST-Plan-02 LGPD-clean
// contract: it OMITS `cpf` and `genero` entirely (those fields stop being
// collected at Etapa 1). Senha pair satisfies the password + confirm refine.
const dadosPessoaisSemCpfNemGenero = {
  nome_completo: 'Maria Silva',
  email: 'maria@example.com',
  telefone: '(11) 98765-4321',
  data_nascimento: '1990-01-01',
  como_conheceu: 'instagram',
  senha: 'SenhaSegura1',
  confirmar_senha: 'SenhaSegura1',
} as const

describe('dadosPessoaisSchema — LGPD-clean Etapa 1 (INSCR-01 / D-02)', () => {
  // RED until Plan 08-02 makes cpf/genero non-collected.
  it('parses a Dados Pessoais payload that OMITS cpf and genero', () => {
    const result = dadosPessoaisSchema.safeParse(dadosPessoaisSemCpfNemGenero)
    expect(result.success).toBe(true)
  })

  // Companion assertion: the omitted-keys payload must not surface a `cpf` or
  // `genero` validation issue (documents WHICH fields the flip removes).
  it('does not raise a required-field issue for cpf or genero when omitted', () => {
    const result = dadosPessoaisSchema.safeParse(dadosPessoaisSemCpfNemGenero)
    if (!result.success) {
      const failingFields = result.error.issues.flatMap((i) => i.path)
      expect(failingFields).not.toContain('cpf')
      expect(failingFields).not.toContain('genero')
    } else {
      expect(result.success).toBe(true)
    }
  })
})
