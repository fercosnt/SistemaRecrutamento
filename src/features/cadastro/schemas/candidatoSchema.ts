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
import { passwordSchema } from '@/features/auth/schemas/passwordSchema'

// ============================================
// SCHEMAS DE DADOS PESSOAIS (tabela: candidatos)
// ============================================

// Phase 8 / Plan 08-02 (D-02, INSCR-01, LGPD-01): the CPF field is NO LONGER
// collected at cadastro Etapa 1. The `cpfSchema` const and the `validateCPF`
// import were removed here — CPF stops being part of the Dados Pessoais shape.
// The DB column `candidatos.cpf` stays nullable for reversibility (D-02).

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
 * Schema para validação de URL de Instagram
 * Aceita: @usuario, instagram.com/usuario, ou URL completa
 */
const instagramSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true; // Opcional
      // Aceita @usuario, instagram.com/usuario, ou URL completa
      return (
        /^@[a-zA-Z0-9._]+$/.test(val) ||
        /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/.test(val) ||
        /^instagram\.com\/[a-zA-Z0-9._]+\/?$/.test(val)
      );
    },
    {
      message: 'Instagram inválido. Use: @usuario ou instagram.com/usuario',
    }
  );

/**
 * Schema para validação de URL de LinkedIn
 * Aceita: linkedin.com/in/usuario ou URL completa
 */
const linkedinSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true; // Opcional
      // Aceita linkedin.com/in/usuario ou URL completa
      return (
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/.test(val) ||
        /^linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/.test(val)
      );
    },
    {
      message: 'LinkedIn inválido. Use: linkedin.com/in/seu-perfil',
    }
  );

/**
 * Schema para validação de senha forte.
 *
 * Phase 3 Plan 03-02 (D-11): extraido para
 * `src/features/auth/schemas/passwordSchema.ts` como unica fonte de verdade.
 * Aqui re-exportado como `senhaSchema` (alias local) para preservar referencias
 * internas deste arquivo — zero duplicacao de regex.
 *
 * Wording das mensagens migrou de "Senha deve conter pelo menos 1..." (Phase 2)
 * para "Inclua pelo menos..." (Phase 3 UI-SPEC L614-622) — tom mais cordial,
 * aceito pelo invariante Dim4 compartilhado entre cadastro e redefinir-senha.
 */
const senhaSchema = passwordSchema;

/**
 * Schema para "Como conheceu a vaga"
 * Opções: Instagram, Facebook, LinkedIn, Indicação, Google, Catho, Vagas.com, Solides, Outros
 * Se "Outros", campo de detalhes é obrigatório
 */
const comoConheceuSchema = z.enum(
  // ⚠ ESTA LISTA TEM DE BATER COM `check_como_conheceu` NO BANCO.
  // Divergiram por meses: o front oferecia catho/vagas_com/solides/`outros` e o
  // CHECK aceitava `outro` no SINGULAR e desconhecia os portais — quatro das nove
  // opcoes IMPEDIAM o cadastro. E o defeito era mudo: o Zod valida contra esta
  // lista e aprova, a Edge Function aceita z.string() e repassa, e so o INSERT
  // quebra — o candidato le "algo deu errado do nosso lado".
  // `comoConheceuSchema.test.ts` compara as duas listas; se voce mexer aqui, o
  // banco precisa acompanhar (migration 20260826000001).
  ['instagram', 'facebook', 'linkedin', 'indicacao', 'google', 'catho', 'vagas_com', 'solides', 'outro'],
  {
    errorMap: () => ({ message: 'Selecione como conheceu a vaga' }),
  }
);

/**
 * Schema completo de dados pessoais
 * Inclui validação de confirmação de senha e como_conheceu
 */
export const dadosPessoaisSchema = z.object({
  nome_completo: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .transform((val) => val.trim()),
  // Phase 8 / Plan 08-02 (D-02, INSCR-01, LGPD-01): `cpf` and `genero` removed
  // from the collected Dados Pessoais set — Etapa 1 is now LGPD-clean. The
  // remaining fields equal exactly the INSCR-01 allowlist.
  email: emailSchema,
  telefone: telefoneSchema,
  data_nascimento: dataNascimentoSchema,
  instagram: instagramSchema,
  linkedin: linkedinSchema,
  como_conheceu: comoConheceuSchema,
  como_conheceu_detalhes: z
    .string()
    .max(500, 'Detalhes devem ter no máximo 500 caracteres')
    .optional()
    .nullable(),
  senha: senhaSchema,
  confirmar_senha: z.string().min(1, 'Por favor, confirme sua senha'),
})
  .refine((data) => data.senha === data.confirmar_senha, {
    message: 'As senhas não coincidem',
    path: ['confirmar_senha'], // Erro aparece no campo confirmar_senha
  })
  .refine(
    (data) => {
      // Se "como_conheceu" for "outro", detalhes é obrigatório
      if (data.como_conheceu === 'outro') {
        return !!data.como_conheceu_detalhes && data.como_conheceu_detalhes.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Por favor, especifique como conheceu a vaga',
      path: ['como_conheceu_detalhes'],
    }
  )

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
 * Nota: Campos de mobilidade (aceita_viajar, aceita_mudanca) foram removidos
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
})

// ============================================
// SCHEMAS DE AUTORIZAÇÕES LGPD (tabela: autorizacoes)
// ============================================

/**
 * Schema das autorizações do cadastro (Phase 43 / CONSENT-01, CONSENT-03, CONSENT-05).
 *
 * UM é obrigatório (uso de dados, gate de submit — D-15) e DOIS são opcionais
 * (divulgação de vagas e guarda do currículo). O comentário anterior deste bloco
 * afirmava que "todos os consentimentos são obrigatórios para cadastro" — falso
 * desde antes desta fase, e o tipo de afirmação que esta fase existe para eliminar.
 *
 * ⚠ NENHUM CAMPO TEM `.default()`, E ISSO É O PONTO DA FASE.
 * Com `.default(true)`, "a pessoa marcou" e "a pessoa não desmarcou" produzem a
 * mesma linha no banco: a marcação deixa de ser INEQUÍVOCA (LGPD, Art. 5º, XII)
 * e a prova de consentimento passa a provar apenas o que o formulário fez por ela.
 * Sem default, um corpo incompleto REPROVA na validação em vez de ser completado
 * em silêncio com um consentimento que ninguém deu.
 *
 * ⚠ `autorizacao_comunicacao` SAIU DO CONTRATO DE ENTRADA (CONSENT-03): o canal
 * transacional é fato do sistema sob o Art. 7º, V — não escolha do titular. A tela
 * o mostra como informação, e o servidor o grava explicitamente
 * (`_shared/autorizacoes-registro.ts`).
 *
 * ⚠ `autorizacao_analise_video` SAIU INTEIRO (BD-2 / CONSENT-05): o sistema não faz
 * análise de vídeo, então parou de pedir permissão para isso. A COLUNA permanece no
 * banco com `COMMENT` — registro técnico, não superfície. O schema do servidor é
 * `.strict()`: mandar a chave agora é `400 VALIDATION`, não descarte silencioso.
 *
 * @see supabase/functions/_shared/schemas.ts (o par servidor deste schema)
 */
export const autorizacoesSchema = z.object({
  /**
   * ⚠ `z.boolean().refine(=== true)` E NÃO `z.literal(true)`.
   * O gate de submit é IDÊNTICO (a mesma mensagem, a mesma reprovação em `false`),
   * mas o TIPO passa a ser `boolean` em vez do literal `true`. Com o literal, o
   * estado inicial `false` que o CONSENT-01 exige era literalmente
   * INEXPRIMÍVEL no tipo do formulário: `defaultValues` só aceitava `true`, e o
   * tipo obrigava o campo a nascer marcado — a própria assinatura fabricava o
   * consentimento que esta fase existe para deixar de fabricar.
   */
  autorizacao_uso_dados: z.boolean().refine((v) => v === true, {
    message: 'Você deve autorizar o uso dos dados para se cadastrar',
  }),
  autorizacao_marketing_vagas: z.boolean(),
  autorizacao_retencao_curriculo: z.boolean(),
})

// ============================================
// SCHEMA COMPLETO DO FORMULÁRIO
// ============================================

/**
 * Schema principal que combina todos os sub-schemas
 * Representa o formulário completo de cadastro
 * Nota: Dados Profissionais foram removidos - agora são 4 etapas
 */
export const candidatoFormSchema = z.object({
  // Seção 1: Dados Pessoais (com Instagram e LinkedIn)
  dadosPessoais: dadosPessoaisSchema,

  // Seção 2: Endereço
  endereco: enderecoSchema,

  // Seção 3: Disponibilidade (sem mobilidade)
  disponibilidade: disponibilidadeSchema,

  // Seção 4: Autorizações LGPD
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
