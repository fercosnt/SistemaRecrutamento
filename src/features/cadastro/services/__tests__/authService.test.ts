/**
 * Testes TDD para serviço de autenticação Supabase
 *
 * Testes escritos com mocks do Supabase Auth para garantir que:
 * - Senha forte é validada corretamente
 * - Sign up cria usuário e retorna userId
 * - Erros são tratados adequadamente (email existe, senha fraca, etc)
 * - Sign in autentica usuário
 * - Sign out funciona corretamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  isStrongPassword,
  getPasswordRequirementsMessage,
  SignUpError,
  PASSWORD_REQUIREMENTS,
} from '../authService'

// Mock do Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  },
}))

// Import do mock após configuração
import { supabase } from '@/lib/supabase/client'

describe('authService', () => {
  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    vi.clearAllMocks()
  })

  describe('PASSWORD_REQUIREMENTS', () => {
    it('deve ter configuração de requisitos mínimos', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBeGreaterThan(0)
      expect(typeof PASSWORD_REQUIREMENTS.requireUppercase).toBe('boolean')
      expect(typeof PASSWORD_REQUIREMENTS.requireLowercase).toBe('boolean')
      expect(typeof PASSWORD_REQUIREMENTS.requireNumber).toBe('boolean')
      expect(typeof PASSWORD_REQUIREMENTS.requireSpecialChar).toBe('boolean')
    })
  })

  describe('isStrongPassword', () => {
    it('deve validar senha com todos os requisitos', () => {
      expect(isStrongPassword('Senha123')).toBe(true)
    })

    it('deve validar senha com caractere especial (se requerido)', () => {
      // Se caractere especial for requerido
      if (PASSWORD_REQUIREMENTS.requireSpecialChar) {
        expect(isStrongPassword('Senha123!')).toBe(true)
        expect(isStrongPassword('Senha123')).toBe(false)
      } else {
        expect(isStrongPassword('Senha123')).toBe(true)
      }
    })

    it('deve rejeitar senha muito curta', () => {
      expect(isStrongPassword('Sen1')).toBe(false)
    })

    it('deve rejeitar senha sem letra maiúscula', () => {
      expect(isStrongPassword('senha123')).toBe(false)
    })

    it('deve rejeitar senha sem letra minúscula', () => {
      expect(isStrongPassword('SENHA123')).toBe(false)
    })

    it('deve rejeitar senha sem número', () => {
      expect(isStrongPassword('SenhaForte')).toBe(false)
    })

    it('deve validar senha longa com todos requisitos', () => {
      expect(isStrongPassword('MinhaSenh4MuitoForte')).toBe(true)
    })

    it('deve rejeitar senha vazia', () => {
      expect(isStrongPassword('')).toBe(false)
    })
  })

  describe('getPasswordRequirementsMessage', () => {
    it('deve retornar mensagem com requisitos', () => {
      const message = getPasswordRequirementsMessage()
      expect(message).toContain('senha deve ter')
      expect(message).toContain(`${PASSWORD_REQUIREMENTS.minLength} caracteres`)
    })

    it('deve incluir requisito de maiúscula se habilitado', () => {
      const message = getPasswordRequirementsMessage()
      if (PASSWORD_REQUIREMENTS.requireUppercase) {
        expect(message).toContain('maiúscula')
      }
    })

    it('deve incluir requisito de número se habilitado', () => {
      const message = getPasswordRequirementsMessage()
      if (PASSWORD_REQUIREMENTS.requireNumber) {
        expect(message).toContain('número')
      }
    })
  })

  describe('signUp', () => {
    it('deve lançar erro para senha fraca', async () => {
      await expect(
        signUp({
          email: 'test@example.com',
          password: 'weak',
        })
      ).rejects.toThrow(SignUpError)

      await expect(
        signUp({
          email: 'test@example.com',
          password: 'weak',
        })
      ).rejects.toThrow('Senha muito fraca')
    })

    it('deve criar usuário com sucesso e retornar userId', async () => {
      // Mock: Usuário criado com sucesso
      const mockUser = {
        id: 'uuid-123',
        email: 'joao@example.com',
        created_at: '2024-01-01T00:00:00Z',
        confirmation_sent_at: null,
      }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: mockUser,
          session: null,
        },
        error: null,
      } as any)

      const result = await signUp({
        email: 'joao@example.com',
        password: 'Senha123',
      })

      expect(result.userId).toBe('uuid-123')
      expect(result.email).toBe('joao@example.com')
      expect(result.emailConfirmationRequired).toBe(false)
      expect(result.user.id).toBe('uuid-123')
    })

    it('deve criar usuário com metadata', async () => {
      const mockUser = {
        id: 'uuid-123',
        email: 'maria@example.com',
        created_at: '2024-01-01T00:00:00Z',
        confirmation_sent_at: null,
      }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: mockUser,
          session: null,
        },
        error: null,
      } as any)

      const result = await signUp({
        email: 'maria@example.com',
        password: 'Senha123',
        metadata: {
          nome_completo: 'Maria Santos',
          cpf: '12345678900',
        },
      })

      expect(result.userId).toBe('uuid-123')

      // Verificar que signUp foi chamado com metadata
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'maria@example.com',
        password: 'Senha123',
        options: {
          data: {
            nome_completo: 'Maria Santos',
            cpf: '12345678900',
          },
          emailRedirectTo: expect.any(String),
        },
      })
    })

    it('deve detectar quando email já existe', async () => {
      // Mock: Email já cadastrado
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'User already registered',
          status: 400,
        } as any,
      } as any)

      await expect(
        signUp({
          email: 'existente@example.com',
          password: 'Senha123',
        })
      ).rejects.toThrow(SignUpError)

      await expect(
        signUp({
          email: 'existente@example.com',
          password: 'Senha123',
        })
      ).rejects.toThrow('já está cadastrado')
    })

    it('deve detectar email inválido do Supabase', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'Invalid email',
          status: 400,
        } as any,
      } as any)

      await expect(
        signUp({
          email: 'email-invalido',
          password: 'Senha123',
        })
      ).rejects.toThrow('Email inválido')
    })

    it('deve indicar se confirmação de email é necessária', async () => {
      const mockUser = {
        id: 'uuid-123',
        email: 'novo@example.com',
        created_at: '2024-01-01T00:00:00Z',
        confirmation_sent_at: '2024-01-01T00:00:00Z', // Email enviado
      }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: mockUser,
          session: null,
        },
        error: null,
      } as any)

      const result = await signUp({
        email: 'novo@example.com',
        password: 'Senha123',
      })

      expect(result.emailConfirmationRequired).toBe(true)
    })

    it('deve lançar erro para resposta sem usuário', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: null,
      } as any)

      await expect(
        signUp({
          email: 'test@example.com',
          password: 'Senha123',
        })
      ).rejects.toThrow('Nenhum usuário foi retornado')
    })
  })

  describe('signIn', () => {
    it('deve fazer login com sucesso', async () => {
      const mockUser = {
        id: 'uuid-456',
        email: 'usuario@example.com',
        created_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: mockUser,
          session: {} as any,
        },
        error: null,
      } as any)

      const result = await signIn('usuario@example.com', 'Senha123')

      expect(result.userId).toBe('uuid-456')
      expect(result.email).toBe('usuario@example.com')
      expect(result.emailConfirmationRequired).toBe(false)
    })

    it('deve lançar erro para credenciais inválidas', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'Invalid login credentials',
          status: 400,
        } as any,
      } as any)

      await expect(
        signIn('errado@example.com', 'senhaErrada')
      ).rejects.toThrow('Email ou senha incorretos')
    })

    it('deve chamar signInWithPassword com email e senha', async () => {
      const mockUser = {
        id: 'uuid-789',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: mockUser,
          session: {} as any,
        },
        error: null,
      } as any)

      await signIn('test@example.com', 'MinhaSenh4')

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'MinhaSenh4',
      })
    })
  })

  describe('signOut', () => {
    it('deve fazer logout com sucesso', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      })

      await expect(signOut()).resolves.not.toThrow()
    })

    it('deve lançar erro se logout falhar', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: {
          message: 'Logout failed',
          status: 500,
        } as any,
      })

      await expect(signOut()).rejects.toThrow(SignUpError)
      await expect(signOut()).rejects.toThrow('Erro ao fazer logout')
    })
  })

  describe('getCurrentUser', () => {
    it('deve retornar usuário autenticado', async () => {
      const mockUser = {
        id: 'uuid-current',
        email: 'current@example.com',
        created_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: mockUser as any,
        },
        error: null,
      })

      const user = await getCurrentUser()

      expect(user).not.toBeNull()
      expect(user?.id).toBe('uuid-current')
      expect(user?.email).toBe('current@example.com')
    })

    it('deve retornar null se não houver usuário autenticado', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: null,
        },
        error: null,
      })

      const user = await getCurrentUser()

      expect(user).toBeNull()
    })

    it('deve retornar null em caso de erro', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {
          user: null,
        },
        error: {
          message: 'Error fetching user',
          status: 500,
        } as any,
      })

      const user = await getCurrentUser()

      expect(user).toBeNull()
    })
  })

  describe('SignUpError', () => {
    it('deve criar erro com código e mensagem', () => {
      const error = new SignUpError('Teste erro', 'WEAK_PASSWORD')

      expect(error.message).toBe('Teste erro')
      expect(error.code).toBe('WEAK_PASSWORD')
      expect(error.name).toBe('SignUpError')
    })

    it('deve ser instância de Error', () => {
      const error = new SignUpError('Teste', 'NETWORK_ERROR')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(SignUpError)
    })

    it('deve armazenar erro original do Supabase', () => {
      const originalError = {
        message: 'Supabase error',
        status: 400,
      } as any

      const error = new SignUpError('Mensagem amigável', 'EMAIL_EXISTS', originalError)

      expect(error.originalError).toBe(originalError)
    })
  })
})
