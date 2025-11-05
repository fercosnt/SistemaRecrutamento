/**
 * Validação de CPF (Cadastro de Pessoa Física)
 *
 * Implementa o algoritmo oficial de validação de CPF brasileiro
 * incluindo verificação de dígitos verificadores.
 *
 * Referência: Receita Federal do Brasil
 */

/**
 * Remove todos os caracteres não numéricos de uma string
 *
 * @param cpf - CPF com ou sem formatação
 * @returns CPF apenas com números
 *
 * @example
 * cleanCPF('123.456.789-09') // '12345678909'
 * cleanCPF('123ABC456') // '123456'
 */
export function cleanCPF(cpf: string): string {
  if (!cpf) return ''
  return cpf.replace(/\D/g, '')
}

/**
 * Formata um CPF para o padrão XXX.XXX.XXX-XX
 *
 * @param cpf - CPF sem formatação ou parcialmente formatado
 * @returns CPF formatado
 *
 * @example
 * formatCPF('12345678909') // '123.456.789-09'
 * formatCPF('12345') // '123.45'
 */
export function formatCPF(cpf: string): string {
  if (!cpf) return ''

  // Limpar e manter apenas números
  const cleaned = cleanCPF(cpf)

  // Aplicar máscara progressivamente
  if (cleaned.length <= 3) {
    return cleaned
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`
  } else if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`
  } else {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`
  }
}

/**
 * Valida um CPF usando o algoritmo de dígitos verificadores
 *
 * Verifica:
 * 1. Se possui 11 dígitos após limpeza
 * 2. Se não é uma sequência conhecida como inválida (000...000, 111...111, etc)
 * 3. Se os dígitos verificadores estão corretos
 *
 * @param cpf - CPF com ou sem formatação
 * @returns true se CPF é válido, false caso contrário
 *
 * @example
 * validateCPF('123.456.789-09') // true
 * validateCPF('000.000.000-00') // false
 * validateCPF('123.456.789-00') // false (dígitos errados)
 */
export function validateCPF(cpf: string | null | undefined): boolean {
  // Validar entrada
  if (!cpf || typeof cpf !== 'string') {
    return false
  }

  // Remover espaços e quebras de linha
  const trimmed = cpf.trim()

  // Verificar se contém apenas caracteres válidos (dígitos, pontos, hífen)
  // Caracteres especiais como #, @, etc devem ser rejeitados
  const validCharsRegex = /^[\d\.\-\s]+$/
  if (!validCharsRegex.test(trimmed)) {
    return false
  }

  // Limpar e remover caracteres de formatação
  const cleaned = cleanCPF(trimmed)

  // Verificar se tem exatamente 11 dígitos
  if (cleaned.length !== 11) {
    return false
  }

  // Rejeitar CPFs conhecidos como inválidos (todos dígitos iguais)
  const invalidCPFs = [
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999',
  ]

  if (invalidCPFs.includes(cleaned)) {
    return false
  }

  // Calcular primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i)
  }

  let remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0

  // Verificar primeiro dígito
  if (remainder !== parseInt(cleaned.charAt(9))) {
    return false
  }

  // Calcular segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i)
  }

  remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0

  // Verificar segundo dígito
  if (remainder !== parseInt(cleaned.charAt(10))) {
    return false
  }

  return true
}

/**
 * Gera um CPF válido aleatório (útil para testes)
 *
 * IMPORTANTE: Usar apenas em ambientes de teste!
 * Não usar em produção.
 *
 * @returns CPF válido gerado aleatoriamente
 */
export function generateRandomCPF(): string {
  // Gerar 9 primeiros dígitos aleatórios
  const randomDigits = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  )

  // Calcular primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += randomDigits[i] * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  randomDigits.push(remainder)

  // Calcular segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += randomDigits[i] * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10) remainder = 0
  randomDigits.push(remainder)

  // Retornar formatado
  const cpfString = randomDigits.join('')
  return formatCPF(cpfString)
}
