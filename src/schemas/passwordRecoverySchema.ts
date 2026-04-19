/**
 * Schema de Validação para Recuperação de Senha
 *
 * Define validação Zod para formulário de solicitação de recuperação de senha.
 * Usado tanto para candidatos quanto para RH/Admin.
 *
 * @module schemas/passwordRecoverySchema
 */

import { z } from 'zod';

/**
 * Schema de validação para solicitação de recuperação de senha
 *
 * Validações:
 * - Email obrigatório
 * - Formato de email válido
 * - Mensagem customizada em português
 */
export const passwordRecoverySchema = z.object({
  email: z
    .string()
    .min(1, 'O email é obrigatório')
    .email('Digite um email válido')
    .toLowerCase()
    .trim(),
});

/**
 * Type inference do schema
 */
export type PasswordRecoveryFormData = z.infer<typeof passwordRecoverySchema>;
