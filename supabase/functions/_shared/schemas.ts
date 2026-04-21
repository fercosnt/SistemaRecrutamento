/**
 * Zod schemas compartilhados entre Edge Functions (Deno runtime)
 *
 * Estas validações rodam no servidor (Supabase Edge Functions) e protegem
 * operações privilegiadas contra payloads maliciosos ou inconsistentes.
 * O shape de entrada espelha o corpo enviado por
 * `src/features/cadastro/services/cadastroService.ts` — qualquer alteração
 * aqui deve ser replicada lá (ou vice-versa).
 *
 * Decisões estruturais:
 * - **Import via esm.sh:** Deno não tem module resolver do Node; pinamos
 *   a versão major do zod para evitar drift (`zod@3`).
 * - **CPF digit verification** inlinada (não depende de utilidade do src/):
 *   Edge Functions não podem importar de fora de `supabase/functions/`.
 * - **pt-BR messages:** mensagens retornadas ao cliente aparecem em UIs
 *   para o candidato; mantemos o idioma de produto.
 * - **Strict but permissive on optional:** campos que o client pode omitir
 *   (como `instagram`, `linkedin`, `complemento`) são `.nullish()` para
 *   aceitar tanto `undefined` quanto `null` sem divergir da serialização
 *   JSON do client.
 *
 * @module supabase/functions/_shared/schemas
 */

import { z } from 'https://esm.sh/zod@3'

// ============================================================================
// Validadores auxiliares
// ============================================================================

/**
 * Validação completa de CPF com dígitos verificadores (algoritmo oficial
 * Receita Federal). Recusa sequências triviais (111.111.111-11 etc).
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false

  // Primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  if (remainder !== parseInt(cleaned.charAt(9), 10)) return false

  // Segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  return remainder === parseInt(cleaned.charAt(10), 10)
}

// ============================================================================
// Sub-schemas
// ============================================================================

/**
 * Endereço. Todos os campos são opcionais do lado do schema para não falhar
 * quando o candidato fornece apenas cidade/estado (campos obrigatórios em
 * `candidatos`). A Edge Function decide o que é obrigatório no insert.
 */
export const enderecoSchema = z.object({
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
})

/**
 * Disponibilidade. Persistida em tabela separada se existir (best-effort
 * na Edge Function). Mantido flexível para evoluir sem quebrar clientes.
 */
export const disponibilidadeSchema = z.object({
  turno_preferido: z.string().optional().nullable(),
  modelo_trabalho: z.string().optional().nullable(),
  disponibilidade_imediata: z.boolean().optional().default(false),
  data_disponibilidade: z.string().optional().nullable(),
}).partial()

/**
 * Autorizações LGPD. `autorizacao_uso_dados` DEVE ser true para cadastro
 * ser aceito — validamos aqui para bloquear bypass do checkbox no client.
 */
export const autorizacoesSchema = z.object({
  autorizacao_uso_dados: z.literal(true, {
    errorMap: () => ({
      message: 'Você deve autorizar o uso dos dados para se cadastrar',
    }),
  }),
  autorizacao_comunicacao: z.boolean().optional().default(true),
  autorizacao_retencao_curriculo: z.boolean().optional().default(true),
  autorizacao_analise_video: z.boolean().optional().default(false),
})

// ============================================================================
// Schema principal — corpo do invoke `cadastrar-candidato`
// ============================================================================

/**
 * Shape espelha o body enviado por `cadastroService.cadastrarCandidato`
 * (serializa `CandidatoFormData` em keys flat + três sub-objetos).
 *
 * IMPORTANTE: o nome do campo de telefone vem do client como `telefone`,
 * mas a coluna no banco é `celular`. O mapping é feito no handler, não aqui.
 */
export const cadastroCandidatoSchema = z.object({
  // ---- Auth ----
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').toLowerCase().trim(),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128, 'Senha muito longa'),

  // ---- Dados pessoais ----
  nome_completo: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome muito longo')
    .transform((v) => v.trim()),
  cpf: z
    .string()
    .min(1, 'CPF é obrigatório')
    .refine(validateCPF, { message: 'CPF inválido. Verifique os dígitos verificadores.' }),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  genero: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  como_conheceu: z.string().optional().nullable(),
  como_conheceu_detalhes: z.string().optional().nullable(),

  // ---- Sub-objetos ----
  endereco: enderecoSchema.optional().nullable(),
  disponibilidade: disponibilidadeSchema.optional().nullable(),
  autorizacoes: autorizacoesSchema,
})

/**
 * Tipo inferido do schema principal. Útil para anotação do handler e de
 * funções auxiliares.
 */
export type CadastroCandidatoInput = z.infer<typeof cadastroCandidatoSchema>

// ============================================================================
// Phase 2 — Structured error contract (D-05, D-08)
// ============================================================================

export type CadastroErrorCode =
  | 'EMAIL_EXISTS'
  | 'CPF_EXISTS'
  | 'VALIDATION'
  | 'SERVER_ERROR'

// `error` is a LEGACY ALIAS of `message` kept during the Phase 2 → 3 transition
// so old clients (pre-redeploy) do not see `undefined` when the server returns
// the new contract. Drop `error` in Phase 3.
export interface CadastroErrorResponse {
  ok: false
  error_code: CadastroErrorCode
  message: string
  field?: string
  error?: string
}

export interface CadastroSuccessResponse {
  ok: true
  data: {
    userId: string
    candidatoId: string
    disponibilidadeId?: string
    autorizacoesId?: string
  }
}

// Maps a Zod issue path (e.g. ['endereco', 'cep'] or
// ['autorizacoes', 'autorizacao_uso_dados']) to a FLAT field name (the leaf
// segment). Client consumer maps this flat name back to a nested RHF path via
// FIELD_TO_STEP_PATH in cadastroService.ts. Returns undefined when the path is
// empty or the leaf is a number (array index — no such case in current schema
// but defensively handled).
export function zodPathToFieldName(
  path: (string | number)[] | undefined,
): string | undefined {
  if (!path || path.length === 0) return undefined
  const leaf = path[path.length - 1]
  return typeof leaf === 'string' ? leaf : undefined
}
