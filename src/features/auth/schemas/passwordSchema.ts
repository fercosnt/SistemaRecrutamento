import { z } from 'zod'

/**
 * Schema compartilhado de senha (Phase 3 — D-11 / Q4).
 *
 * Unica fonte de verdade para validacao de complexidade de senha no projeto.
 * Reutilizado por:
 *   - Cadastro (Phase 2): src/features/cadastro/schemas/candidatoSchema.ts
 *     (re-exporta como `senhaSchema` via import deste arquivo).
 *   - Redefinir senha (Phase 3): src/features/auth/schemas/redefinirSenhaSchema.ts
 *     (usa diretamente nos campos `nova_senha` e `confirmar_nova_senha`).
 *
 * Mensagens alinhadas com UI-SPEC L614-622. Wording "Inclua pelo menos..."
 * substituiu o wording Phase-2 "Senha deve conter pelo menos 1..." por ser
 * mais cordial e curto; invariante de tom Dim4 preservada.
 *
 * Regex triviais (/[A-Z]/, /[a-z]/, /[0-9]/) nao introduzem risco de ReDoS
 * (nenhum backtracking). max(100) limita string a 100 chars.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(100, 'Senha deve ter no máximo 100 caracteres')
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Inclua pelo menos uma letra maiúscula',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Inclua pelo menos uma letra minúscula',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'Inclua pelo menos um número',
  })
