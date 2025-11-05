/**
 * Testes TDD para serviço de cadastro completo de candidato
 *
 * Testes escritos com mocks do Supabase para garantir que:
 * - Transação multi-tabela funciona corretamente (5 tabelas)
 * - Rollback é executado se alguma operação falhar
 * - Todos os IDs são retornados corretamente
 * - Erros são tratados adequadamente
 * - Dados são mapeados corretamente do formulário para o banco
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cadastrarCandidato,
  CadastroCompleteResult,
  CadastroError,
  type CandidatoCompleteData,
} from '../cadastroService'
import type { CandidatoFormData } from '../../types'

// Mock do Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  },
}))

// Mock do authService
vi.mock('../authService', () => ({
  signUp: vi.fn(),
  AuthError: class AuthError extends Error {
    constructor(
      message: string,
      public code: string,
      public originalError?: any
    ) {
      super(message)
      this.name = 'AuthError'
    }
  },
}))

// Import dos mocks após configuração
import { supabase } from '@/lib/supabase/client'
import { signUp, AuthError } from '../authService'

describe('cadastroService', () => {
  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    vi.clearAllMocks()
  })

  // ============================================
  // MOCK DATA - Dados de teste completos
  // ============================================

  const mockFormData: CandidatoFormData = {
    dadosPessoais: {
      nome_completo: 'João Silva Santos',
      cpf: '12345678900',
      email: 'joao.silva@example.com',
      telefone: '11987654321',
      data_nascimento: '1990-05-15',
      genero: 'masculino',
    },
    endereco: {
      cep: '12345678',
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 45',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
    },
    dadosProfissionais: {
      experiencia_area: '3_5_anos',
      nivel_escolaridade: 'superior_completo',
      instituicao_ensino: 'Universidade de São Paulo',
      curso: 'Administração',
      ano_conclusao: 2015,
      possui_cnh: true,
      categorias_cnh: ['B'],
    },
    disponibilidade: {
      turno_preferido: 'integral',
      modelo_trabalho: 'hibrido',
      disponibilidade_imediata: true,
      data_disponibilidade: null,
      aceita_viajar: true,
      aceita_mudanca: false,
    },
    autorizacoes: {
      autorizacao_uso_dados: true,
      autorizacao_comunicacao: true,
      autorizacao_retencao_curriculo: true,
      autorizacao_analise_video: false,
    },
  }

  const mockCandidatoCompleteData: CandidatoCompleteData = {
    ...mockFormData,
    password: 'Senha123',
  }

  const mockUserId = 'auth-user-uuid-123'
  const mockCandidatoId = 'candidato-uuid-456'
  const mockEnderecoId = 'endereco-uuid-789'
  const mockDadosProfissionaisId = 'profissional-uuid-012'
  const mockDisponibilidadeId = 'disponibilidade-uuid-345'
  const mockAutorizacoesId = 'autorizacoes-uuid-678'

  // ============================================
  // HELPER FUNCTIONS PARA MOCKS
  // ============================================

  /**
   * Configura mock de sucesso para todas as operações
   */
  function setupSuccessfulMocks() {
    // Mock signUp (Supabase Auth)
    vi.mocked(signUp).mockResolvedValue({
      userId: mockUserId,
      email: mockFormData.dadosPessoais.email,
      emailConfirmationRequired: false,
      user: {
        id: mockUserId,
        email: mockFormData.dadosPessoais.email,
        created_at: new Date().toISOString(),
      },
    })

    // Mock insert para candidatos
    const mockCandidatosInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: mockCandidatoId }],
        error: null,
      }),
    })

    // Mock insert para enderecos
    const mockEnderecoInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: mockEnderecoId }],
        error: null,
      }),
    })

    // Mock insert para dados_profissionais
    const mockDadosProfissionaisInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: mockDadosProfissionaisId }],
        error: null,
      }),
    })

    // Mock insert para disponibilidade
    const mockDisponibilidadeInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: mockDisponibilidadeId }],
        error: null,
      }),
    })

    // Mock insert para autorizacoes
    const mockAutorizacoesInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: mockAutorizacoesId }],
        error: null,
      }),
    })

    // Configurar supabase.from() para retornar mocks corretos baseado na tabela
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      switch (table) {
        case 'candidatos':
          return { insert: mockCandidatosInsert } as any
        case 'enderecos':
          return { insert: mockEnderecoInsert } as any
        case 'dados_profissionais':
          return { insert: mockDadosProfissionaisInsert } as any
        case 'disponibilidade':
          return { insert: mockDisponibilidadeInsert } as any
        case 'autorizacoes':
          return { insert: mockAutorizacoesInsert } as any
        default:
          return {} as any
      }
    })
  }

  /**
   * Configura mock para falha na criação de usuário (auth)
   */
  function setupAuthFailureMock() {
    vi.mocked(signUp).mockRejectedValue(
      new AuthError('Email já cadastrado', 'EMAIL_EXISTS')
    )
  }

  /**
   * Configura mock para falha na inserção de candidatos
   */
  function setupCandidatosInsertFailureMock() {
    // signUp funciona
    vi.mocked(signUp).mockResolvedValue({
      userId: mockUserId,
      email: mockFormData.dadosPessoais.email,
      emailConfirmationRequired: false,
      user: {
        id: mockUserId,
        email: mockFormData.dadosPessoais.email,
        created_at: new Date().toISOString(),
      },
    })

    // Mas insert em candidatos falha
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'candidatos') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: {
                message: 'Duplicate key violation',
                code: '23505',
              },
            }),
          }),
        } as any
      }
      return {} as any
    })
  }

  /**
   * Configura mock para falha na inserção de enderecos (depois de candidatos criado)
   */
  function setupEnderecoInsertFailureMock() {
    // signUp funciona
    vi.mocked(signUp).mockResolvedValue({
      userId: mockUserId,
      email: mockFormData.dadosPessoais.email,
      emailConfirmationRequired: false,
      user: {
        id: mockUserId,
        email: mockFormData.dadosPessoais.email,
        created_at: new Date().toISOString(),
      },
    })

    // Candidatos funciona, mas enderecos falha
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'candidatos') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: mockCandidatoId }],
              error: null,
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        } as any
      } else if (table === 'enderecos') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: {
                message: 'Foreign key constraint violation',
                code: '23503',
              },
            }),
          }),
        } as any
      }
      return {} as any
    })
  }

  // ============================================
  // TESTES: Cenário de Sucesso
  // ============================================

  describe('cadastrarCandidato - Sucesso', () => {
    it('deve criar usuário no auth e inserir em todas as 5 tabelas', async () => {
      setupSuccessfulMocks()

      const result = await cadastrarCandidato(mockCandidatoCompleteData)

      // Verificar que signUp foi chamado
      expect(signUp).toHaveBeenCalledWith({
        email: mockFormData.dadosPessoais.email,
        password: 'Senha123',
        metadata: {
          nome_completo: mockFormData.dadosPessoais.nome_completo,
          cpf: mockFormData.dadosPessoais.cpf,
        },
      })

      // Verificar que todas as 5 tabelas foram chamadas
      expect(supabase.from).toHaveBeenCalledWith('candidatos')
      expect(supabase.from).toHaveBeenCalledWith('enderecos')
      expect(supabase.from).toHaveBeenCalledWith('dados_profissionais')
      expect(supabase.from).toHaveBeenCalledWith('disponibilidade')
      expect(supabase.from).toHaveBeenCalledWith('autorizacoes')
    })

    it('deve retornar todos os IDs criados', async () => {
      setupSuccessfulMocks()

      const result = await cadastrarCandidato(mockCandidatoCompleteData)

      expect(result).toEqual({
        userId: mockUserId,
        candidatoId: mockCandidatoId,
        enderecoId: mockEnderecoId,
        dadosProfissionaisId: mockDadosProfissionaisId,
        disponibilidadeId: mockDisponibilidadeId,
        autorizacoesId: mockAutorizacoesId,
      })
    })

    it('deve inserir candidatos com user_id do auth', async () => {
      setupSuccessfulMocks()

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: mockCandidatoId }],
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'candidatos') {
          return { insert: insertMock } as any
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'some-id' }],
              error: null,
            }),
          }),
        } as any
      })

      await cadastrarCandidato(mockCandidatoCompleteData)

      // Verificar que candidatos foi inserido com user_id
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          nome_completo: mockFormData.dadosPessoais.nome_completo,
          cpf: mockFormData.dadosPessoais.cpf,
          email: mockFormData.dadosPessoais.email,
        })
      )
    })

    it('deve inserir enderecos com candidato_id correto', async () => {
      setupSuccessfulMocks()

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: mockEnderecoId }],
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'candidatos') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: mockCandidatoId }],
                error: null,
              }),
            }),
          } as any
        } else if (table === 'enderecos') {
          return { insert: insertMock } as any
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'some-id' }],
              error: null,
            }),
          }),
        } as any
      })

      await cadastrarCandidato(mockCandidatoCompleteData)

      // Verificar que enderecos foi inserido com candidato_id
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          candidato_id: mockCandidatoId,
          cep: mockFormData.endereco.cep,
          logradouro: mockFormData.endereco.logradouro,
        })
      )
    })

    it('deve inserir todas as tabelas dependentes com candidato_id correto', async () => {
      setupSuccessfulMocks()

      const dadosProfissionaisInsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: mockDadosProfissionaisId }],
          error: null,
        }),
      })

      const disponibilidadeInsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: mockDisponibilidadeId }],
          error: null,
        }),
      })

      const autorizacoesInsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: mockAutorizacoesId }],
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'candidatos') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: mockCandidatoId }],
                error: null,
              }),
            }),
          } as any
        } else if (table === 'dados_profissionais') {
          return { insert: dadosProfissionaisInsertMock } as any
        } else if (table === 'disponibilidade') {
          return { insert: disponibilidadeInsertMock } as any
        } else if (table === 'autorizacoes') {
          return { insert: autorizacoesInsertMock } as any
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'some-id' }],
              error: null,
            }),
          }),
        } as any
      })

      await cadastrarCandidato(mockCandidatoCompleteData)

      // Verificar que todas foram inseridas com candidato_id
      expect(dadosProfissionaisInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          candidato_id: mockCandidatoId,
        })
      )

      expect(disponibilidadeInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          candidato_id: mockCandidatoId,
        })
      )

      expect(autorizacoesInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          candidato_id: mockCandidatoId,
        })
      )
    })
  })

  // ============================================
  // TESTES: Cenários de Erro - Auth
  // ============================================

  describe('cadastrarCandidato - Erros de Auth', () => {
    it('deve lançar CadastroError se signUp falhar (email já existe)', async () => {
      setupAuthFailureMock()

      await expect(
        cadastrarCandidato(mockCandidatoCompleteData)
      ).rejects.toThrow(CadastroError)

      await expect(
        cadastrarCandidato(mockCandidatoCompleteData)
      ).rejects.toThrow('Erro ao criar usuário no sistema de autenticação')
    })

    it('deve ter código AUTH_FAILED quando signUp falhar', async () => {
      setupAuthFailureMock()

      try {
        await cadastrarCandidato(mockCandidatoCompleteData)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(CadastroError)
        expect((error as CadastroError).code).toBe('AUTH_FAILED')
      }
    })

    it('deve armazenar erro original do AuthError', async () => {
      const originalAuthError = new AuthError('Email já cadastrado', 'EMAIL_EXISTS')
      vi.mocked(signUp).mockRejectedValue(originalAuthError)

      try {
        await cadastrarCandidato(mockCandidatoCompleteData)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(CadastroError)
        expect((error as CadastroError).originalError).toBe(originalAuthError)
      }
    })
  })

  // ============================================
  // TESTES: Cenários de Erro - Database Insert
  // ============================================

  describe('cadastrarCandidato - Erros de Database', () => {
    it('deve lançar CadastroError se insert em candidatos falhar', async () => {
      setupCandidatosInsertFailureMock()

      await expect(
        cadastrarCandidato(mockCandidatoCompleteData)
      ).rejects.toThrow(CadastroError)
    })

    it('deve fazer rollback (deletar usuário do auth) se insert falhar', async () => {
      setupCandidatosInsertFailureMock()

      vi.mocked(supabase.auth.admin.deleteUser).mockResolvedValue({ error: null })

      try {
        await cadastrarCandidato(mockCandidatoCompleteData)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        // Verificar que tentou deletar usuário
        expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith(mockUserId)
      }
    })

    it('deve lançar erro com código INSERT_FAILED quando candidatos falhar', async () => {
      setupCandidatosInsertFailureMock()

      try {
        await cadastrarCandidato(mockCandidatoCompleteData)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(CadastroError)
        expect((error as CadastroError).code).toBe('INSERT_FAILED')
        expect((error as CadastroError).table).toBe('candidatos')
      }
    })

    it('deve fazer rollback completo se enderecos falhar', async () => {
      setupEnderecoInsertFailureMock()

      vi.mocked(supabase.auth.admin.deleteUser).mockResolvedValue({ error: null })

      try {
        await cadastrarCandidato(mockCandidatoCompleteData)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        // Verificar que tentou deletar usuário do auth
        expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith(mockUserId)

        // Verificar erro retornado
        expect(error).toBeInstanceOf(CadastroError)
        expect((error as CadastroError).table).toBe('enderecos')
      }
    })

    it('deve incluir detalhes do erro do banco no CadastroError', async () => {
      setupCandidatosInsertFailureMock()

      try {
        await cadastrarCandidato(mockCandidatoCompleteData)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(CadastroError)
        expect((error as CadastroError).details).toBeDefined()
      }
    })
  })

  // ============================================
  // TESTES: Cenários de Erro - Rollback Failures
  // ============================================

  describe('cadastrarCandidato - Erros de Rollback', () => {
    it('deve lançar erro se rollback falhar ao deletar usuário', async () => {
      setupCandidatosInsertFailureMock()

      // Mock de falha no rollback
      vi.mocked(supabase.auth.admin.deleteUser).mockResolvedValue({
        error: {
          message: 'Não foi possível deletar usuário',
          status: 500,
        } as any,
      })

      try {
        await cadastrarCandidato(mockCandidatoCompleteData)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(CadastroError)
        expect((error as CadastroError).code).toBe('ROLLBACK_FAILED')
      }
    })
  })

  // ============================================
  // TESTES: CadastroError Class
  // ============================================

  describe('CadastroError', () => {
    it('deve criar erro com código, mensagem e tabela', () => {
      const error = new CadastroError(
        'Erro ao inserir',
        'INSERT_FAILED',
        'candidatos'
      )

      expect(error.message).toBe('Erro ao inserir')
      expect(error.code).toBe('INSERT_FAILED')
      expect(error.table).toBe('candidatos')
      expect(error.name).toBe('CadastroError')
    })

    it('deve ser instância de Error', () => {
      const error = new CadastroError('Teste', 'UNKNOWN_ERROR')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(CadastroError)
    })

    it('deve armazenar erro original e detalhes', () => {
      const originalError = new Error('Database error')
      const details = { code: '23505', constraint: 'unique_cpf' }

      const error = new CadastroError(
        'Erro ao inserir',
        'INSERT_FAILED',
        'candidatos',
        originalError,
        details
      )

      expect(error.originalError).toBe(originalError)
      expect(error.details).toEqual(details)
    })

    it('deve ter todos os códigos de erro definidos', () => {
      const validCodes = [
        'AUTH_FAILED',
        'INSERT_FAILED',
        'ROLLBACK_FAILED',
        'VALIDATION_ERROR',
        'NETWORK_ERROR',
        'UNKNOWN_ERROR',
      ] as const

      validCodes.forEach((code) => {
        const error = new CadastroError('Teste', code)
        expect(error.code).toBe(code)
      })
    })
  })

  // ============================================
  // TESTES: Validação de Dados
  // ============================================

  describe('cadastrarCandidato - Validação de Dados', () => {
    it('deve mapear dados de genero do formulário para sexo do banco', async () => {
      setupSuccessfulMocks()

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: mockCandidatoId }],
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'candidatos') {
          return { insert: insertMock } as any
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'some-id' }],
              error: null,
            }),
          }),
        } as any
      })

      await cadastrarCandidato(mockCandidatoCompleteData)

      // Verificar que campo 'genero' foi mapeado para 'sexo'
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sexo: mockFormData.dadosPessoais.genero,
        })
      )
    })

    it('deve mapear campos de endereço corretamente', async () => {
      setupSuccessfulMocks()

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: mockEnderecoId }],
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'candidatos') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: mockCandidatoId }],
                error: null,
              }),
            }),
          } as any
        } else if (table === 'enderecos') {
          return { insert: insertMock } as any
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'some-id' }],
              error: null,
            }),
          }),
        } as any
      })

      await cadastrarCandidato(mockCandidatoCompleteData)

      // Verificar mapeamento de endereço
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          candidato_id: mockCandidatoId,
          cep: mockFormData.endereco.cep,
          logradouro: mockFormData.endereco.logradouro,
          numero: mockFormData.endereco.numero,
          complemento: mockFormData.endereco.complemento,
          bairro: mockFormData.endereco.bairro,
          cidade: mockFormData.endereco.cidade,
          estado: mockFormData.endereco.estado,
          pais: 'Brasil',
          endereco_principal: true,
        })
      )
    })

    it('deve mapear campos de autorizações corretamente', async () => {
      setupSuccessfulMocks()

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: mockAutorizacoesId }],
          error: null,
        }),
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'candidatos') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [{ id: mockCandidatoId }],
                error: null,
              }),
            }),
          } as any
        } else if (table === 'autorizacoes') {
          return { insert: insertMock } as any
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'some-id' }],
              error: null,
            }),
          }),
        } as any
      })

      await cadastrarCandidato(mockCandidatoCompleteData)

      // Verificar mapeamento de autorizações
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          candidato_id: mockCandidatoId,
          consentimento_lgpd: mockFormData.autorizacoes.autorizacao_uso_dados,
          consentimento_termos_uso: mockFormData.autorizacoes.autorizacao_uso_dados,
          consentimento_politica_privacidade: mockFormData.autorizacoes.autorizacao_uso_dados,
          consentimento_comunicacoes: mockFormData.autorizacoes.autorizacao_comunicacao,
          consentimento_compartilhamento_dados: mockFormData.autorizacoes.autorizacao_retencao_curriculo,
          consentimento_gravacao_video: mockFormData.autorizacoes.autorizacao_analise_video,
        })
      )
    })
  })
})
