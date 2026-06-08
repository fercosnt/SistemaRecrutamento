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
  // Phase 8 / Plan 08-02 (D-02, INSCR-01, LGPD-01): `cpf` and `genero` are NO
  // LONGER collected at cadastro Etapa 1 — removed from the EF input shape. The
  // DB columns stay nullable for reversibility (D-02) but are no longer written.
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  data_nascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  instagram: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  como_conheceu: z.string().optional().nullable(),
  como_conheceu_detalhes: z.string().optional().nullable(),

  // ---- Sub-objetos ----
  endereco: enderecoSchema.optional().nullable(),
  disponibilidade: disponibilidadeSchema.optional().nullable(),
  autorizacoes: autorizacoesSchema,
})
  // Phase 8 / Plan 08-02 (D-04, LGPD-01): fail-closed allowlist. Any unknown key
  // (cpf/foto/estado_civil/saude/…) yields a Zod failure → the EF maps it to
  // error_code 'VALIDATION' / HTTP 400 BEFORE any insert. PII minimization gate.
  .strict()

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

// =============================================================================
// Phase 4 / Plan 04-05 — submit-candidatura Edge Function schema
// =============================================================================

export const submitCandidaturaSchema = z.object({
  candidato_id: z.string().uuid('candidato_id inválido'),
  vaga_id: z.string().uuid('vaga_id inválido'),
  curriculo_url: z.string().min(1, 'curriculo_url obrigatório'),
  curriculo_nome: z.string().min(1, 'curriculo_nome obrigatório'),
  curriculo_size: z
    .number()
    .int()
    .positive()
    .max(5_242_880, 'curriculo excede 5 MB'),
  // WR-09 (Phase 4 review iteration 2 fix): cap respostas[] length to defend
  // against a DoS via large payloads. The realistic max is ~30 perguntas per
  // vaga (perguntas_formulario row count); 100 leaves comfortable headroom.
  // Without the .max(N) cap an attacker with a stolen JWT could submit
  // 10_000+ entries — Zod validation, the WR-02 .in('id', perguntaIds)
  // pre-check (giant Postgres IN clause), and the SECURITY DEFINER
  // jsonb_array_elements loop in submit_candidatura_atomic would all amplify.
  respostas: z
    .array(
      z.object({
        pergunta_id: z.string().uuid(),
        resposta_texto: z.string().optional().nullable(),
        resposta_numerica: z.number().optional().nullable(),
        resposta_opcoes: z.unknown().optional().nullable(),
      }),
    )
    .max(100, 'Máximo 100 respostas por candidatura')
    .default([]),
})
  // Phase 8 / Plan 08-02 (D-04, LGPD-01): fail-closed allowlist on the
  // submit-candidatura body — unknown keys reject instead of silently stripping.
  .strict()

export type SubmitCandidaturaInput = z.infer<typeof submitCandidaturaSchema>

export type SubmitCandidaturaErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'DUPLICATE_CANDIDATURA'
  | 'STORAGE_ERROR'
  | 'SERVER_ERROR'
