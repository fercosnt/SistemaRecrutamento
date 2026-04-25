/**
 * Schema de validacao para formulario "Esqueci minha senha" (Phase 3).
 *
 * Portado de src/schemas/passwordRecoverySchema.ts (Phase 2) com rename do
 * symbol de `passwordRecoverySchema` para `esqueciSenhaSchema` (alinhamento
 * com pt-BR de dominio — ver CLAUDE.md §Key Conventions).
 *
 * Unico campo: email (obrigatorio, formato valido, toLowerCase + trim).
 *
 * D-03 (anti-enumeration): mensagem de sucesso do backend sempre e neutra
 * ("Se o email estiver cadastrado, voce recebera um link") — garantido pelo
 * passwordService (Wave 2, Plan 03-04).
 *
 * Arquivo legado `src/schemas/passwordRecoverySchema.ts` permanece por ora;
 * deletado na limpeza final (Plan 03-06 cleanup task).
 *
 * @module features/auth/schemas/esqueciSenhaSchema
 */

import { z } from 'zod'

export const esqueciSenhaSchema = z.object({
  email: z
    .string()
    .min(1, 'O email é obrigatório')
    .email('Digite um email válido')
    .toLowerCase()
    .trim(),
})

export type EsqueciSenhaFormData = z.infer<typeof esqueciSenhaSchema>
