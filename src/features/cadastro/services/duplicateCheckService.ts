/**
 * Serviço de verificação de duplicatas (CPF/Email)
 *
 * Features:
 * - Verifica CPF duplicado no banco via RPC SECURITY DEFINER
 * - Verifica Email duplicado no banco via RPC SECURITY DEFINER
 * - Error handling específico
 * - Tipos TypeScript
 *
 * Backend: public.check_candidato_duplicate(p_cpf, p_email) — see
 * supabase/migrations/20260420000003_check_candidato_duplicate_rpc.sql.
 * The RPC returns only boolean flags — it NEVER exposes raw candidato data.
 * Requirement: FOUND-10, Decision: D-01a.
 *
 * @module duplicateCheckService
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Tipos de campo para verificação de duplicata
 */
export type DuplicateCheckField = 'cpf' | 'email'

/**
 * Resultado da verificação de duplicata
 *
 * Nota: a RPC SECURITY DEFINER (FOUND-10) retorna apenas flags booleanas e
 * nunca dados brutos do candidato. O campo legado `existingCandidate` é
 * preservado como opcional e sempre `null` — a UI deve tratar `isDuplicate=true`
 * como "já cadastrado" sem mostrar nome/email de outro candidato. A UI deve
 * pedir login ou recuperação de senha nesse caso. O campo será removido em M2
 * quando DadosPessoaisStep migrar para o novo contrato.
 */
export interface DuplicateCheckResult {
  /**
   * Se o valor já existe no banco
   */
  isDuplicate: boolean

  /**
   * Campo verificado
   */
  field: DuplicateCheckField

  /**
   * Valor verificado (sanitizado)
   */
  value: string

  /**
   * @deprecated Always `null` since FOUND-10 migration to RPC SECURITY DEFINER.
   * The RPC never exposes raw candidato data. Preserved with the legacy shape
   * so `result.existingCandidate?.nome_completo` in DadosPessoaisStep continues
   * to type-check, but the value is always `null` — consumers receive
   * `undefined` at runtime and must show a generic "já cadastrado" message.
   * Will be removed in M2 when consumers migrate to read only `isDuplicate`.
   */
  existingCandidate?: {
    id: string
    nome_completo: string
    email: string
    cpf: string
    data_cadastro: string
  } | null
}

/**
 * Resposta bruta da RPC check_candidato_duplicate
 *
 * Phase 2 Plan 02-05 (D-12 — Wave 1 migration 0005):
 * - `rate_limited: boolean` agora é SEMPRE presente na resposta (a função
 *   enforce 30 calls/60s por IP via composite `inet_client_addr()` + `auth.uid()`)
 * - `cpf_exists` / `email_exists` são `boolean | null` — o servidor retorna
 *   `null` quando o pedido foi rate-limited (evita revelar existência de
 *   candidatos sob brute-force)
 */
export interface CheckCandidatoDuplicateResponse {
  cpf_exists: boolean | null
  email_exists: boolean | null
  rate_limited: boolean
}

/**
 * Custom Error para verificação de duplicatas
 *
 * Phase 2 Plan 02-05: `'RATE_LIMITED'` adicionado ao union para propagar o
 * flag `rate_limited` da RPC (D-12). Consumers (useDuplicateCheck) devem
 * exibir toast "Muitas tentativas. Aguarde alguns instantes." e liberar o
 * campo (não tratar como duplicado).
 */
export class DuplicateCheckError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'RATE_LIMITED',
    public field?: DuplicateCheckField
  ) {
    super(message)
    this.name = 'DuplicateCheckError'
  }
}

/**
 * Limpa e formata CPF (remove caracteres não numéricos)
 *
 * @param cpf - CPF a ser limpo
 * @returns CPF apenas com números
 *
 * @example
 * cleanCPF('123.456.789-00') // '12345678900'
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

/**
 * Limpa e formata Email (trim + lowercase)
 *
 * @param email - Email a ser limpo
 * @returns Email em lowercase sem espaços
 *
 * @example
 * cleanEmail(' João@Example.COM  ') // 'joão@example.com'
 */
export function cleanEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Valida CPF (11 dígitos)
 *
 * @param cpf - CPF a ser validado
 * @returns true se CPF tem 11 dígitos
 */
export function isValidCPFFormat(cpf: string): boolean {
  const cleaned = cleanCPF(cpf)
  return /^\d{11}$/.test(cleaned)
}

/**
 * Valida Email (formato básico)
 *
 * @param email - Email a ser validado
 * @returns true se email tem formato válido
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Chama a RPC check_candidato_duplicate e retorna as duas flags em conjunto.
 *
 * Uma única chamada de RPC substitui os dois SELECTs separados que existiam
 * antes (FOUND-10). Como a RPC é SECURITY DEFINER com search_path vazio e
 * grant apenas para anon/authenticated, ela nunca expõe dados do candidato.
 *
 * @param cpfCleaned - CPF ja limpo (apenas digitos). Passe string vazia para pular o check.
 * @param emailCleaned - Email ja limpo (lowercase + trim). Passe string vazia para pular.
 * @returns { cpf_exists, email_exists, rate_limited: false } narrowed — o
 *          helper NUNCA retorna com `rate_limited=true` (throws antes)
 * @throws {DuplicateCheckError} em erro de rede/banco OU `RATE_LIMITED` quando
 *         a RPC indica excesso de chamadas
 */
async function callDuplicateRpc(
  cpfCleaned: string,
  emailCleaned: string
): Promise<{ cpf_exists: boolean; email_exists: boolean; rate_limited: false }> {
  // NOTE: The RPC signature is not yet present in database.types.ts — that
  // file is regenerated via `npm run db:types` after the migrations ship to
  // the Supabase project (see .planning/phases/01-foundation-saneada/01-04-CHECKPOINT.md).
  // Until then, supabase.rpc is cast through `unknown` to accept the new fn
  // name. Once types are regenerated, the cast can be removed.
  //
  // Must call `supabase.rpc(...)` directly (not via a destructured/aliased ref)
  // so that `this` stays bound to the PostgrestClient. The internal impl
  // dereferences `this.rest`, which is undefined when the method is called
  // without the client context — a runtime crash that unit tests don't catch
  // because they mock `supabase.rpc` wholesale.
  const { data, error } = (await (
    supabase.rpc as unknown as (
      fn: 'check_candidato_duplicate',
      args: { p_cpf: string; p_email: string }
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  ).call(supabase, 'check_candidato_duplicate', {
    p_cpf: cpfCleaned,
    p_email: emailCleaned,
  }))

  if (error) {
    console.error('Supabase error calling check_candidato_duplicate RPC:', error)
    throw new DuplicateCheckError(
      'Erro ao verificar duplicatas no banco de dados. Tente novamente.',
      'DATABASE_ERROR'
    )
  }

  // A RPC retorna jsonb { cpf_exists, email_exists, rate_limited }. Validamos
  // a forma defensivamente — em produção o supabase-js tipa como `unknown`.
  const response = data as unknown as Partial<CheckCandidatoDuplicateResponse> | null
  if (!response) {
    console.error('Invalid shape returned by check_candidato_duplicate RPC:', data)
    throw new DuplicateCheckError(
      'Resposta inesperada do servidor ao verificar duplicatas.',
      'DATABASE_ERROR'
    )
  }

  // Phase 2 D-12: rate-limit gate precede a validação dos booleans — quando
  // excedido, o servidor retorna { cpf_exists: null, email_exists: null,
  // rate_limited: true } e o client deve exibir toast cordial sem tratar
  // como duplicado.
  if (response.rate_limited === true) {
    throw new DuplicateCheckError(
      'Muitas tentativas. Aguarde alguns instantes.',
      'RATE_LIMITED'
    )
  }

  if (
    typeof response.cpf_exists !== 'boolean' ||
    typeof response.email_exists !== 'boolean'
  ) {
    console.error('Invalid shape returned by check_candidato_duplicate RPC:', data)
    throw new DuplicateCheckError(
      'Resposta inesperada do servidor ao verificar duplicatas.',
      'DATABASE_ERROR'
    )
  }

  return {
    cpf_exists: response.cpf_exists,
    email_exists: response.email_exists,
    rate_limited: false,
  }
}

/**
 * Verifica se CPF já existe no banco de dados
 *
 * Phase 8 / Plan 08-02 (D-02, D-03, INSCR-01, LGPD-01): esta função é RETIDA
 * para reversibilidade, mas NÃO é mais invocada pelo fluxo de cadastro
 * LGPD-clean — o Etapa 1 não coleta mais CPF, então o dedup é EMAIL-only
 * (ver `useDuplicateCheck` + `checkEmailDuplicate`). Mantida no contrato do
 * serviço caso uma fase futura precise reativar a checagem de CPF.
 *
 * Implementado sobre a RPC check_candidato_duplicate (FOUND-10). A RPC recebe
 * tambem o email, mas aqui passamos string vazia para que o lado do servidor
 * pule a verificacao de email (o CASE WHEN v_email_clean = '' retorna false).
 *
 * @param cpf - CPF a ser verificado (pode estar formatado)
 * @returns Resultado da verificação (boolean flag, sem dados do candidato)
 * @throws {DuplicateCheckError} Se CPF inválido ou erro de rede/banco
 *
 * @example
 * const result = await checkCPFDuplicate('123.456.789-00')
 * if (result.isDuplicate) {
 *   console.log('CPF já cadastrado')
 * }
 */
export async function checkCPFDuplicate(cpf: string): Promise<DuplicateCheckResult> {
  // Validar formato do CPF
  if (!isValidCPFFormat(cpf)) {
    throw new DuplicateCheckError(
      'CPF inválido. O CPF deve conter 11 dígitos.',
      'INVALID_INPUT',
      'cpf'
    )
  }

  const cleanedCPF = cleanCPF(cpf)

  try {
    const response = await callDuplicateRpc(cleanedCPF, '')

    return {
      isDuplicate: response.cpf_exists,
      field: 'cpf',
      value: cleanedCPF,
    }
  } catch (err) {
    // Re-throw DuplicateCheckError preservando field
    if (err instanceof DuplicateCheckError) {
      throw new DuplicateCheckError(err.message, err.code, 'cpf')
    }

    // Erro de rede ou desconhecido
    console.error('Network/Unknown error checking CPF duplicate:', err)
    throw new DuplicateCheckError(
      'Erro de conexão ao verificar CPF. Verifique sua internet.',
      'NETWORK_ERROR',
      'cpf'
    )
  }
}

/**
 * Verifica se Email já existe no banco de dados
 *
 * Implementado sobre a RPC check_candidato_duplicate (FOUND-10). Passa string
 * vazia para p_cpf para que o servidor pule essa verificacao.
 *
 * @param email - Email a ser verificado
 * @returns Resultado da verificação (boolean flag, sem dados do candidato)
 * @throws {DuplicateCheckError} Se email inválido ou erro de rede/banco
 *
 * @example
 * const result = await checkEmailDuplicate('joao@example.com')
 * if (result.isDuplicate) {
 *   console.log('Email já cadastrado')
 * }
 */
export async function checkEmailDuplicate(email: string): Promise<DuplicateCheckResult> {
  // Validar formato do Email
  if (!isValidEmailFormat(email)) {
    throw new DuplicateCheckError(
      'Email inválido. Verifique o formato do email.',
      'INVALID_INPUT',
      'email'
    )
  }

  const cleanedEmail = cleanEmail(email)

  try {
    const response = await callDuplicateRpc('', cleanedEmail)

    return {
      isDuplicate: response.email_exists,
      field: 'email',
      value: cleanedEmail,
    }
  } catch (err) {
    // Re-throw DuplicateCheckError preservando field
    if (err instanceof DuplicateCheckError) {
      throw new DuplicateCheckError(err.message, err.code, 'email')
    }

    // Erro de rede ou desconhecido
    console.error('Network/Unknown error checking Email duplicate:', err)
    throw new DuplicateCheckError(
      'Erro de conexão ao verificar Email. Verifique sua internet.',
      'NETWORK_ERROR',
      'email'
    )
  }
}

/**
 * Verifica duplicatas de CPF e Email simultaneamente
 *
 * Emite UMA única chamada de RPC (em vez de duas) — a RPC aceita os dois
 * parâmetros e retorna as duas flags. Esta é a forma preferida de uso em
 * fluxos de cadastro.
 *
 * @param cpf - CPF a ser verificado
 * @param email - Email a ser verificado
 * @returns Objeto com resultados para ambos os campos
 * @throws {DuplicateCheckError} Se algum campo inválido ou erro de rede/banco
 *
 * @example
 * const results = await checkBothDuplicates('123.456.789-00', 'joao@example.com')
 * if (results.cpf.isDuplicate || results.email.isDuplicate) {
 *   console.log('Candidato já cadastrado!')
 * }
 */
export async function checkBothDuplicates(
  cpf: string,
  email: string
): Promise<{
  cpf: DuplicateCheckResult
  email: DuplicateCheckResult
}> {
  // Validações de formato antes da chamada de rede
  if (!isValidCPFFormat(cpf)) {
    throw new DuplicateCheckError(
      'CPF inválido. O CPF deve conter 11 dígitos.',
      'INVALID_INPUT',
      'cpf'
    )
  }
  if (!isValidEmailFormat(email)) {
    throw new DuplicateCheckError(
      'Email inválido. Verifique o formato do email.',
      'INVALID_INPUT',
      'email'
    )
  }

  const cleanedCPF = cleanCPF(cpf)
  const cleanedEmail = cleanEmail(email)

  try {
    const response = await callDuplicateRpc(cleanedCPF, cleanedEmail)

    return {
      cpf: {
        isDuplicate: response.cpf_exists,
        field: 'cpf',
        value: cleanedCPF,
      },
      email: {
        isDuplicate: response.email_exists,
        field: 'email',
        value: cleanedEmail,
      },
    }
  } catch (err) {
    if (err instanceof DuplicateCheckError) {
      throw err
    }
    console.error('Network/Unknown error checking both duplicates:', err)
    throw new DuplicateCheckError(
      'Erro de conexão ao verificar duplicatas. Verifique sua internet.',
      'NETWORK_ERROR'
    )
  }
}
