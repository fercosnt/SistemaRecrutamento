/**
 * Schema Zod para validação do formulário de cadastro de candidatos
 *
 * Valida dados para inserção nas seguintes tabelas:
 * - candidatos (dados pessoais + auth)
 * - enderecos (endereço completo)
 * - dados_profissionais (experiência e formação)
 * - disponibilidade (turno e modelo de trabalho)
 * - autorizacoes (consentimentos LGPD)
 */

import { z } from 'zod'
import { validateCPF } from '../utils'

// ============================================
// SCHEMAS DE DADOS PESSOAIS (tabela: candidatos)
// ============================================

/**
 * Schema para validação de CPF
 * Usa o algoritmo completo de dígitos verificadores
 */
const cpfSchema = z
  .string()
  .min(1, 'CPF é obrigatório')
  .refine(validateCPF, {
    message: 'CPF inválido. Verifique os dígitos verificadores.',
  })

/**
 * Schema para validação de email
 * RFC 5322 compliant
 */
const emailSchema = z
  .string()
  .min(1, 'Email é obrigatório')
  .email('Email inválido')
  .toLowerCase()
  .trim()

/**
 * Schema para validação de telefone brasileiro
 * Formatos aceitos: (11) 98765-4321, 11987654321, (11)987654321
 */
const telefoneSchema = z
  .string()
  .min(1, 'Telefone é obrigatório')
  .regex(
    /^\(?([1-9]{2})\)?\s?9?\d{4}-?\d{4}$/,
    'Telefone inválido. Use formato: (11) 98765-4321'
  )
  .transform((val) => val.replace(/\D/g, '')) // Remove formatação para salvar apenas números

/**
 * Schema para validação de data de nascimento
 * Idade mínima: 16 anos
 * Idade máxima: 100 anos
 */
const dataNascimentoSchema = z
  .string()
  .min(1, 'Data de nascimento é obrigatória')
  .refine(
    (date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      // Ajusta idade se ainda não fez aniversário no ano
      const adjustedAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ? age - 1
          : age

      return adjustedAge >= 16 && adjustedAge <= 100
    },
    {
      message: 'Idade deve estar entre 16 e 100 anos',
    }
  )

/**
 * Schema completo de dados pessoais
 */
export const dadosPessoaisSchema = z.object({
  nome_completo: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .transform((val) => val.trim()),
  cpf: cpfSchema,
  email: emailSchema,
  telefone: telefoneSchema,
  data_nascimento: dataNascimentoSchema,
  genero: z.enum(['masculino', 'feminino', 'outro', 'prefiro_nao_informar'], {
    errorMap: () => ({ message: 'Selecione um gênero válido' }),
  }),
})

// ============================================
// SCHEMAS DE ENDEREÇO (tabela: enderecos)
// ============================================

/**
 * Schema para validação de CEP brasileiro
 * Formato: 12345-678 ou 12345678
 */
const cepSchema = z
  .string()
  .min(1, 'CEP é obrigatório')
  .regex(/^\d{5}-?\d{3}$/, 'CEP inválido. Use formato: 12345-678')
  .transform((val) => val.replace(/\D/g, '')) // Remove hífen para salvar

/**
 * Schema completo de endereço
 */
export const enderecoSchema = z.object({
  cep: cepSchema,
  logradouro: z
    .string()
    .min(3, 'Logradouro deve ter no mínimo 3 caracteres')
    .max(255, 'Logradouro deve ter no máximo 255 caracteres'),
  numero: z
    .string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número deve ter no máximo 10 caracteres'),
  complemento: z
    .string()
    .max(100, 'Complemento deve ter no máximo 100 caracteres')
    .optional()
    .nullable(),
  bairro: z
    .string()
    .min(2, 'Bairro deve ter no mínimo 2 caracteres')
    .max(100, 'Bairro deve ter no máximo 100 caracteres'),
  cidade: z
    .string()
    .min(2, 'Cidade deve ter no mínimo 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  estado: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres (ex: SP)')
    .regex(/^[A-Z]{2}$/, 'Estado deve ser sigla em maiúsculas (ex: SP)')
    .toUpperCase(),
})

// ============================================
// SCHEMAS DE DADOS PROFISSIONAIS (tabela: dados_profissionais)
// ============================================

/**
 * Enums para experiência e escolaridade
 */
const experienciaEnum = z.enum(
  ['nenhuma', 'menos_1_ano', '1_3_anos', '3_5_anos', 'mais_5_anos'],
  {
    errorMap: () => ({ message: 'Selecione uma opção de experiência válida' }),
  }
)

const escolaridadeEnum = z.enum(
  [
    'fundamental_incompleto',
    'fundamental_completo',
    'medio_incompleto',
    'medio_completo',
    'superior_incompleto',
    'superior_completo',
    'pos_graduacao',
    'mestrado',
    'doutorado',
  ],
  {
    errorMap: () => ({ message: 'Selecione um nível de escolaridade válido' }),
  }
)

/**
 * Schema completo de dados profissionais
 */
export const dadosProfissionaisSchema = z.object({
  experiencia_area: experienciaEnum,
  nivel_escolaridade: escolaridadeEnum,
  instituicao_ensino: z
    .string()
    .max(255, 'Nome da instituição deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  curso: z
    .string()
    .max(255, 'Nome do curso deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  ano_conclusao: z
    .number()
    .int('Ano deve ser número inteiro')
    .min(1950, 'Ano de conclusão não pode ser anterior a 1950')
    .max(
      new Date().getFullYear() + 10,
      'Ano de conclusão não pode ser superior a 10 anos no futuro'
    )
    .optional()
    .nullable(),
  possui_cnh: z.boolean().default(false),
  categorias_cnh: z
    .array(z.enum(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']))
    .optional()
    .nullable()
    .default([]),
})

// ============================================
// SCHEMAS DE DISPONIBILIDADE (tabela: disponibilidade)
// ============================================

/**
 * Enums para disponibilidade
 */
const turnoEnum = z.enum(['manha', 'tarde', 'noite', 'integral'], {
  errorMap: () => ({ message: 'Selecione um turno válido' }),
})

const modeloTrabalhoEnum = z.enum(['presencial', 'remoto', 'hibrido'], {
  errorMap: () => ({ message: 'Selecione um modelo de trabalho válido' }),
})

/**
 * Schema completo de disponibilidade
 */
export const disponibilidadeSchema = z.object({
  turno_preferido: turnoEnum,
  modelo_trabalho: modeloTrabalhoEnum,
  disponibilidade_imediata: z.boolean().default(false),
  data_disponibilidade: z
    .string()
    .optional()
    .nullable()
    .refine(
      (date) => {
        if (!date) return true // Se não informada, é válido
        const availableDate = new Date(date)
        const today = new Date()
        // Data deve ser hoje ou no futuro
        return availableDate >= today
      },
      {
        message: 'Data de disponibilidade não pode ser no passado',
      }
    ),
  aceita_viajar: z.boolean().default(false),
  aceita_mudanca: z.boolean().default(false),
})

// ============================================
// SCHEMAS DE AUTORIZAÇÕES LGPD (tabela: autorizacoes)
// ============================================

/**
 * Schema completo de autorizações
 * Todos os consentimentos são obrigatórios para cadastro
 */
export const autorizacoesSchema = z.object({
  autorizacao_uso_dados: z.literal(true, {
    errorMap: () => ({
      message: 'Você deve autorizar o uso dos dados para se cadastrar',
    }),
  }),
  autorizacao_comunicacao: z.boolean().default(true),
  autorizacao_retencao_curriculo: z.boolean().default(true),
  autorizacao_analise_video: z.boolean().default(false),
})

// ============================================
// SCHEMA COMPLETO DO FORMULÁRIO
// ============================================

/**
 * Schema principal que combina todos os sub-schemas
 * Representa o formulário completo de cadastro
 */
export const candidatoFormSchema = z.object({
  // Seção 1: Dados Pessoais
  dadosPessoais: dadosPessoaisSchema,

  // Seção 2: Endereço
  endereco: enderecoSchema,

  // Seção 3: Dados Profissionais
  dadosProfissionais: dadosProfissionaisSchema,

  // Seção 4: Disponibilidade
  disponibilidade: disponibilidadeSchema,

  // Seção 5: Autorizações LGPD
  autorizacoes: autorizacoesSchema,
})

/**
 * Type inference do schema completo
 * Use este type para TypeScript autocomplete
 */
export type CandidatoFormData = z.infer<typeof candidatoFormSchema>

/**
 * Type inference dos sub-schemas individuais
 */
export type DadosPessoaisData = z.infer<typeof dadosPessoaisSchema>
export type EnderecoData = z.infer<typeof enderecoSchema>
export type DadosProfissionaisData = z.infer<typeof dadosProfissionaisSchema>
export type DisponibilidadeData = z.infer<typeof disponibilidadeSchema>
export type AutorizacoesData = z.infer<typeof autorizacoesSchema>

/**
 * Validação parcial para cada seção do formulário
 * Útil para validação passo-a-passo em multi-step form
 */
export const validarDadosPessoais = (data: unknown) =>
  dadosPessoaisSchema.safeParse(data)

export const validarEndereco = (data: unknown) =>
  enderecoSchema.safeParse(data)

export const validarDadosProfissionais = (data: unknown) =>
  dadosProfissionaisSchema.safeParse(data)

export const validarDisponibilidade = (data: unknown) =>
  disponibilidadeSchema.safeParse(data)

export const validarAutorizacoes = (data: unknown) =>
  autorizacoesSchema.safeParse(data)

/**
 * Validação completa do formulário
 */
export const validarFormularioCompleto = (data: unknown) =>
  candidatoFormSchema.safeParse(data)
