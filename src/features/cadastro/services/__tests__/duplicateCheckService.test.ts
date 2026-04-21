/**
 * Testes TDD para verificação de duplicatas (CPF/Email)
 *
 * Testes escritos com mocks do Supabase para garantir que:
 * - CPF duplicado é detectado corretamente
 * - Email duplicado é detectado corretamente
 * - Valores únicos retornam isDuplicate: false
 * - Erros de validação são lançados para formatos inválidos
 * - Erros de rede/banco são tratados corretamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkCPFDuplicate,
  checkEmailDuplicate,
  checkBothDuplicates,
  DuplicateCheckError,
  cleanCPF,
  cleanEmail,
  isValidCPFFormat,
  isValidEmailFormat,
} from '../duplicateCheckService'

// Mock do Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Import do mock após configuração
import { supabase } from '@/lib/supabase/client'

describe('duplicateCheckService', () => {
  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    vi.clearAllMocks()
  })

  describe('cleanCPF', () => {
    it('deve remover pontos e traços do CPF', () => {
      expect(cleanCPF('123.456.789-00')).toBe('12345678900')
    })

    it('deve remover espaços do CPF', () => {
      expect(cleanCPF('123 456 789 00')).toBe('12345678900')
    })

    it('deve retornar apenas números', () => {
      expect(cleanCPF('abc123def456ghi789jkl00')).toBe('12345678900')
    })
  })

  describe('cleanEmail', () => {
    it('deve converter email para lowercase', () => {
      expect(cleanEmail('JoAo@ExAmPlE.cOm')).toBe('joao@example.com')
    })

    it('deve remover espaços do email', () => {
      expect(cleanEmail('  joao@example.com  ')).toBe('joao@example.com')
    })

    it('deve aplicar trim e lowercase simultaneamente', () => {
      expect(cleanEmail('  JoAo@ExAmPlE.cOm  ')).toBe('joao@example.com')
    })
  })

  describe('isValidCPFFormat', () => {
    it('deve validar CPF com 11 dígitos (sem formatação)', () => {
      expect(isValidCPFFormat('12345678900')).toBe(true)
    })

    it('deve validar CPF formatado (com pontos e traço)', () => {
      expect(isValidCPFFormat('123.456.789-00')).toBe(true)
    })

    it('deve rejeitar CPF com menos de 11 dígitos', () => {
      expect(isValidCPFFormat('123456789')).toBe(false)
    })

    it('deve rejeitar CPF com mais de 11 dígitos', () => {
      expect(isValidCPFFormat('123456789012')).toBe(false)
    })

    it('deve rejeitar CPF vazio', () => {
      expect(isValidCPFFormat('')).toBe(false)
    })
  })

  describe('isValidEmailFormat', () => {
    it('deve validar email com formato correto', () => {
      expect(isValidEmailFormat('joao@example.com')).toBe(true)
    })

    it('deve validar email com subdomínios', () => {
      expect(isValidEmailFormat('joao@mail.example.com')).toBe(true)
    })

    it('deve rejeitar email sem @', () => {
      expect(isValidEmailFormat('joaoexample.com')).toBe(false)
    })

    it('deve rejeitar email sem domínio', () => {
      expect(isValidEmailFormat('joao@')).toBe(false)
    })

    it('deve rejeitar email sem nome de usuário', () => {
      expect(isValidEmailFormat('@example.com')).toBe(false)
    })

    it('deve rejeitar email vazio', () => {
      expect(isValidEmailFormat('')).toBe(false)
    })
  })

  describe('checkCPFDuplicate', () => {
    it('deve lançar erro para CPF com formato inválido', async () => {
      await expect(checkCPFDuplicate('123')).rejects.toThrow(DuplicateCheckError)
      await expect(checkCPFDuplicate('123')).rejects.toThrow('CPF inválido')
    })

    it('deve retornar isDuplicate: true quando CPF existe no banco', async () => {
      // Mock: CPF encontrado no banco
      const mockData = {
        id: '123',
        nome_completo: 'João Silva',
        email: 'joao@example.com',
        cpf: '12345678900',
        data_cadastro: '2024-01-01',
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await checkCPFDuplicate('123.456.789-00')

      expect(result.isDuplicate).toBe(true)
      expect(result.field).toBe('cpf')
      expect(result.value).toBe('12345678900')
      expect(result.existingCandidate).toEqual(mockData)
    })

    it('deve retornar isDuplicate: false quando CPF não existe no banco', async () => {
      // Mock: CPF não encontrado
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await checkCPFDuplicate('123.456.789-00')

      expect(result.isDuplicate).toBe(false)
      expect(result.field).toBe('cpf')
      expect(result.value).toBe('12345678900')
      expect(result.existingCandidate).toBeNull()
    })

    it('deve lançar DuplicateCheckError para erro de banco de dados', async () => {
      // Mock: Erro do Supabase
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      } as any)

      await expect(checkCPFDuplicate('123.456.789-00')).rejects.toThrow(
        DuplicateCheckError
      )
      await expect(checkCPFDuplicate('123.456.789-00')).rejects.toThrow(
        'Erro ao verificar CPF no banco de dados'
      )
    })

    it('deve chamar Supabase com CPF limpo (sem formatação)', async () => {
      // Mock
      const eqMock = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      } as any)

      await checkCPFDuplicate('123.456.789-00')

      // Verificar que eq foi chamado com CPF limpo
      expect(eqMock).toHaveBeenCalledWith('cpf', '12345678900')
    })
  })

  describe('checkEmailDuplicate', () => {
    it('deve lançar erro para email com formato inválido', async () => {
      await expect(checkEmailDuplicate('invalido')).rejects.toThrow(
        DuplicateCheckError
      )
      await expect(checkEmailDuplicate('invalido')).rejects.toThrow(
        'Email inválido'
      )
    })

    it('deve retornar isDuplicate: true quando Email existe no banco', async () => {
      // Mock: Email encontrado no banco
      const mockData = {
        id: '123',
        nome_completo: 'Maria Santos',
        email: 'maria@example.com',
        cpf: '98765432100',
        data_cadastro: '2024-01-01',
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await checkEmailDuplicate('maria@example.com')

      expect(result.isDuplicate).toBe(true)
      expect(result.field).toBe('email')
      expect(result.value).toBe('maria@example.com')
      expect(result.existingCandidate).toEqual(mockData)
    })

    it('deve retornar isDuplicate: false quando Email não existe no banco', async () => {
      // Mock: Email não encontrado
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await checkEmailDuplicate('novo@example.com')

      expect(result.isDuplicate).toBe(false)
      expect(result.field).toBe('email')
      expect(result.value).toBe('novo@example.com')
      expect(result.existingCandidate).toBeNull()
    })

    it('deve lançar DuplicateCheckError para erro de banco de dados', async () => {
      // Mock: Erro do Supabase
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      } as any)

      await expect(checkEmailDuplicate('test@example.com')).rejects.toThrow(
        DuplicateCheckError
      )
    })

    it('deve chamar Supabase com email normalizado (lowercase)', async () => {
      // Mock
      const ilikeMock = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: ilikeMock,
        }),
      } as any)

      await checkEmailDuplicate('JoAo@ExAmPlE.cOm')

      // Verificar que ilike foi chamado com email lowercase
      expect(ilikeMock).toHaveBeenCalledWith('email', 'joao@example.com')
    })

    it('deve usar ilike (case-insensitive) ao buscar email', async () => {
      // Mock
      const ilikeMock = vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: ilikeMock,
        }),
      } as any)

      await checkEmailDuplicate('test@example.com')

      // Verificar que ilike foi usado (não eq)
      expect(ilikeMock).toHaveBeenCalled()
    })
  })

  describe('checkBothDuplicates', () => {
    it('deve verificar CPF e Email simultaneamente', async () => {
      // Mock para CPF (não duplicado)
      const cpfFromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Mock para Email (não duplicado)
      const emailFromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      // Configurar mock para retornar mocks apropriados baseado na tabela
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'candidatos') {
          // Primeira chamada: CPF check
          if (supabase.from.mock.calls.length === 1) {
            return cpfFromMock() as any
          }
          // Segunda chamada: Email check
          return emailFromMock() as any
        }
        return {} as any
      })

      const results = await checkBothDuplicates('123.456.789-00', 'test@example.com')

      expect(results.cpf.isDuplicate).toBe(false)
      expect(results.cpf.field).toBe('cpf')
      expect(results.email.isDuplicate).toBe(false)
      expect(results.email.field).toBe('email')
    })

    it('deve retornar ambos duplicados quando existem no banco', async () => {
      // Mock para CPF (duplicado)
      const mockCpfData = {
        id: '123',
        nome_completo: 'João Silva',
        email: 'joao@example.com',
        cpf: '12345678900',
        data_cadastro: '2024-01-01',
      }

      // Mock para Email (duplicado)
      const mockEmailData = {
        id: '456',
        nome_completo: 'Maria Santos',
        email: 'maria@example.com',
        cpf: '98765432100',
        data_cadastro: '2024-01-02',
      }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Primeira chamada: CPF
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockCpfData,
                  error: null,
                }),
              }),
            }),
          } as any
        } else {
          // Segunda chamada: Email
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockEmailData,
                  error: null,
                }),
              }),
            }),
          } as any
        }
      })

      const results = await checkBothDuplicates('123.456.789-00', 'maria@example.com')

      expect(results.cpf.isDuplicate).toBe(true)
      expect(results.cpf.existingCandidate?.nome_completo).toBe('João Silva')
      expect(results.email.isDuplicate).toBe(true)
      expect(results.email.existingCandidate?.nome_completo).toBe('Maria Santos')
    })
  })

  describe('DuplicateCheckError', () => {
    it('deve criar erro com código e mensagem', () => {
      const error = new DuplicateCheckError('Teste erro', 'INVALID_INPUT', 'cpf')

      expect(error.message).toBe('Teste erro')
      expect(error.code).toBe('INVALID_INPUT')
      expect(error.field).toBe('cpf')
      expect(error.name).toBe('DuplicateCheckError')
    })

    it('deve ser instância de Error', () => {
      const error = new DuplicateCheckError('Teste', 'NETWORK_ERROR')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(DuplicateCheckError)
    })
  })
})

// ============================================
// Wave 0 stubs — Phase 2 (to be implemented in Plan 02-05)
// ============================================
describe('duplicateCheckService — rate_limited handling (Phase 2)', () => {
  it.todo('throws DuplicateCheckError with code="RATE_LIMITED" when RPC returns rate_limited=true')
  it.todo('returns normal DuplicateCheckResult when rate_limited=false and booleans present')
  it.todo('extends CheckCandidatoDuplicateResponse interface with rate_limited: boolean')
})
