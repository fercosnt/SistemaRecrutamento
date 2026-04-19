/**
 * Schema de validação para formulário de login RH/Admin
 *
 * Utiliza Zod para validação client-side com mensagens em português.
 * Inclui validação de domínio de email para usuários RH.
 *
 * @module schemas/adminLoginSchema
 */

import { z } from 'zod'

/**
 * Domínios de email permitidos para login de RH
 *
 * Apenas emails corporativos Beauty Smile podem acessar sistema RH/Admin
 */
const ALLOWED_EMAIL_DOMAINS = ['beautysmile.com.br', 'beautysmile.com'] as const

/**
 * Valida se o email pertence a um domínio permitido
 *
 * @param email - Email a ser validado
 * @returns true se domínio é permitido, false caso contrário
 */
function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return ALLOWED_EMAIL_DOMAINS.some((allowedDomain) => domain === allowedDomain)
}

/**
 * Schema Zod para validação do formulário de login RH/Admin
 *
 * Campos:
 * - email: obrigatório, formato de email válido, domínio corporativo (@beautysmile.com.br ou @beautysmile.com)
 * - password: obrigatório, mínimo 1 caractere
 * - rememberMe: opcional, booleano para persistência de sessão (7 dias vs 8 horas)
 */
export const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .refine(isAllowedDomain, {
      message: 'Apenas emails corporativos @beautysmile.com.br ou @beautysmile.com são permitidos',
    }),

  password: z
    .string()
    .min(1, 'Senha é obrigatória'),

  rememberMe: z
    .boolean()
    .optional()
    .default(false),
})

/**
 * Type inference do schema para uso com TypeScript
 */
export type AdminLoginFormData = z.infer<typeof adminLoginSchema>

/**
 * Mensagens de erro customizadas para validação
 */
export const adminLoginErrorMessages = {
  email: {
    required: 'Email é obrigatório',
    invalid: 'Email inválido',
    domain: 'Apenas emails corporativos @beautysmile.com.br ou @beautysmile.com são permitidos',
  },
  password: {
    required: 'Senha é obrigatória',
  },
} as const

/**
 * Export do array de domínios permitidos para uso em outros módulos
 */
export { ALLOWED_EMAIL_DOMAINS }
