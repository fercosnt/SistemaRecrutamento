/**
 * Testes TDD para serviço de integração com N8N Webhooks
 *
 * Testes escritos com mocks do fetch para garantir que:
 * - Payload correto é enviado para cada workflow
 * - Retry logic funciona (3 tentativas)
 * - Timeout de 10 segundos é respeitado
 * - Modo teste/produção funciona corretamente
 * - Erros de rede são tratados adequadamente
 * - Success/failure responses são processados corretamente
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  sendToN8N,
  N8NError,
  type N8NWebhookPayload,
  type N8NWorkflow,
  N8N_WORKFLOWS,
} from '../n8nService'

// Mock do fetch global
global.fetch = vi.fn()

describe('n8nService', () => {
  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    vi.clearAllMocks()
  })

  // ============================================
  // MOCK DATA
  // ============================================

  const mockPayload: N8NWebhookPayload = {
    event: 'candidato.created',
    timestamp: '2024-01-01T00:00:00.000Z',
    data: {
      candidato: {
        id: 'candidato-123',
        nome_completo: 'João Silva',
        email: 'joao@example.com',
        telefone: '11987654321',
        cpf: '12345678900',
      },
      metadata: {
        created_at: '2024-01-01T00:00:00.000Z',
        has_all_data: true,
      },
    },
  }

  // ============================================
  // TESTES: N8N_WORKFLOWS Configuration
  // ============================================

  describe('N8N_WORKFLOWS', () => {
    it('deve ter 9 workflows configurados', () => {
      const workflows = Object.keys(N8N_WORKFLOWS)
      expect(workflows).toHaveLength(9)
    })

    it('deve ter workflow analise-formulario configurado', () => {
      expect(N8N_WORKFLOWS['analise-formulario']).toBeDefined()
      expect(N8N_WORKFLOWS['analise-formulario'].test).toContain('webhook-test')
      expect(N8N_WORKFLOWS['analise-formulario'].production).toContain('webhook')
      expect(N8N_WORKFLOWS['analise-formulario'].production).not.toContain('webhook-test')
    })

    it('deve ter todos os workflows com URLs de teste e produção', () => {
      Object.entries(N8N_WORKFLOWS).forEach(([name, config]) => {
        expect(config.test).toBeTruthy()
        expect(config.production).toBeTruthy()
        expect(config.test).toContain('webhook-test')
        expect(config.production).toContain('webhook')
        expect(config.production).not.toContain('webhook-test')
      })
    })

    it('deve ter workflow analise-bigfive configurado', () => {
      expect(N8N_WORKFLOWS['analise-bigfive']).toBeDefined()
    })

    it('deve ter workflow analise-disc configurado', () => {
      expect(N8N_WORKFLOWS['analise-disc']).toBeDefined()
    })

    it('deve ter workflow analise-raven configurado', () => {
      expect(N8N_WORKFLOWS['analise-raven']).toBeDefined()
    })

    it('deve ter workflow analise-fit-cultural configurado', () => {
      expect(N8N_WORKFLOWS['analise-fit-cultural']).toBeDefined()
    })

    it('deve ter workflow analise-entrevistas configurado', () => {
      expect(N8N_WORKFLOWS['analise-entrevistas']).toBeDefined()
    })

    it('deve ter workflow emails-automaticos configurado', () => {
      expect(N8N_WORKFLOWS['emails-automaticos']).toBeDefined()
    })

    it('deve ter workflow lembretes-cron configurado', () => {
      expect(N8N_WORKFLOWS['lembretes-cron']).toBeDefined()
    })

    it('deve ter workflow integracao-notion configurado', () => {
      expect(N8N_WORKFLOWS['integracao-notion']).toBeDefined()
    })
  })

  // ============================================
  // TESTES: Sucesso - Envio para N8N
  // ============================================

  describe('sendToN8N - Sucesso', () => {
    it('deve enviar payload para workflow em modo teste', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true, workflow_execution_id: 'exec-123' }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await sendToN8N('analise-formulario', mockPayload, 'test')

      expect(fetch).toHaveBeenCalledWith(
        N8N_WORKFLOWS['analise-formulario'].test,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockPayload),
        })
      )

      expect(result.success).toBe(true)
      expect(result.workflow_execution_id).toBe('exec-123')
    })

    it('deve enviar payload para workflow em modo produção', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await sendToN8N('analise-formulario', mockPayload, 'production')

      expect(fetch).toHaveBeenCalledWith(
        N8N_WORKFLOWS['analise-formulario'].production,
        expect.anything()
      )
    })

    it('deve usar modo produção como padrão', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await sendToN8N('analise-formulario', mockPayload)

      expect(fetch).toHaveBeenCalledWith(
        N8N_WORKFLOWS['analise-formulario'].production,
        expect.anything()
      )
    })

    it('deve incluir timeout de 10 segundos na requisição', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await sendToN8N('analise-formulario', mockPayload)

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
    })

    it('deve retornar response do N8N com success: true', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          workflow_execution_id: 'exec-456',
          data: { processed: true },
        }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const result = await sendToN8N('emails-automaticos', mockPayload)

      expect(result).toEqual({
        success: true,
        workflow_execution_id: 'exec-456',
        data: { processed: true },
      })
    })
  })

  // ============================================
  // TESTES: Retry Logic
  // ============================================

  describe('sendToN8N - Retry Logic', () => {
    it('deve tentar 3 vezes em caso de erro de rede', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      await expect(
        sendToN8N('analise-bigfive', mockPayload)
      ).rejects.toThrow(N8NError)

      // 1 tentativa inicial + 2 retries = 3 chamadas
      expect(fetch).toHaveBeenCalledTimes(3)
    })

    it('deve tentar 3 vezes em caso de HTTP 500', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await expect(
        sendToN8N('analise-disc', mockPayload)
      ).rejects.toThrow(N8NError)

      expect(fetch).toHaveBeenCalledTimes(3)
    })

    it('deve tentar 3 vezes em caso de HTTP 503', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({}),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await expect(
        sendToN8N('analise-raven', mockPayload)
      ).rejects.toThrow(N8NError)

      expect(fetch).toHaveBeenCalledTimes(3)
    })

    it('deve ter sucesso na segunda tentativa', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      }
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockErrorResponse as any)
        .mockResolvedValueOnce(mockSuccessResponse as any)

      const result = await sendToN8N('analise-fit-cultural', mockPayload)

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    })

    it('não deve fazer retry em caso de HTTP 400 (bad request)', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid payload' }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await expect(
        sendToN8N('analise-entrevistas', mockPayload)
      ).rejects.toThrow(N8NError)

      // Não deve fazer retry em 400
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('não deve fazer retry em caso de HTTP 404', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await expect(
        sendToN8N('emails-automaticos', mockPayload)
      ).rejects.toThrow(N8NError)

      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================
  // TESTES: Timeout
  // ============================================

  describe('sendToN8N - Timeout', () => {
    it('deve usar AbortController para timeout', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      await sendToN8N('lembretes-cron', mockPayload)

      // Verificar que AbortSignal foi usado
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
    })
  })

  // ============================================
  // TESTES: Error Handling
  // ============================================

  describe('sendToN8N - Error Handling', () => {
    it('deve lançar N8NError com código NETWORK_ERROR em caso de erro de rede', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'))

      try {
        await sendToN8N('integracao-notion', mockPayload)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(N8NError)
        expect((error as N8NError).code).toBe('NETWORK_ERROR')
      }
    })

    it('deve lançar N8NError com código NETWORK_ERROR após esgotar retries para HTTP 500', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      try {
        await sendToN8N('analise-bigfive', mockPayload)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(N8NError)
        expect((error as N8NError).code).toBe('NETWORK_ERROR')
        expect((error as N8NError).attempts).toBe(3)
      }
    })

    it('deve lançar N8NError com código VALIDATION_ERROR para payload inválido', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid payload' }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      try {
        await sendToN8N('analise-disc', mockPayload)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(N8NError)
        expect((error as N8NError).code).toBe('VALIDATION_ERROR')
      }
    })

    it('deve lançar N8NError com código WORKFLOW_NOT_FOUND para workflow inexistente', async () => {
      await expect(
        sendToN8N('workflow-invalido' as any, mockPayload)
      ).rejects.toThrow(N8NError)

      await expect(
        sendToN8N('workflow-invalido' as any, mockPayload)
      ).rejects.toThrow('Workflow não encontrado')
    })

    it('deve incluir workflow name no erro', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      try {
        await sendToN8N('analise-raven', mockPayload)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(N8NError)
        expect((error as N8NError).workflow).toBe('analise-raven')
      }
    })

    it('deve incluir número de tentativas no erro', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      try {
        await sendToN8N('analise-fit-cultural', mockPayload)
        expect.fail('Deveria ter lançado erro')
      } catch (error) {
        expect(error).toBeInstanceOf(N8NError)
        expect((error as N8NError).attempts).toBe(3)
      }
    })
  })

  // ============================================
  // TESTES: N8NError Class
  // ============================================

  describe('N8NError', () => {
    it('deve criar erro com código, mensagem e workflow', () => {
      const error = new N8NError(
        'Erro de teste',
        'NETWORK_ERROR',
        'analise-formulario'
      )

      expect(error.message).toBe('Erro de teste')
      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.workflow).toBe('analise-formulario')
      expect(error.name).toBe('N8NError')
    })

    it('deve ser instância de Error', () => {
      const error = new N8NError('Teste', 'TIMEOUT_ERROR', 'emails-automaticos')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(N8NError)
    })

    it('deve armazenar statusCode opcional', () => {
      const error = new N8NError(
        'HTTP Error',
        'HTTP_ERROR',
        'integracao-notion',
        500
      )

      expect(error.statusCode).toBe(500)
    })

    it('deve armazenar número de attempts', () => {
      const error = new N8NError('Network Error', 'NETWORK_ERROR', 'lembretes-cron')
      error.attempts = 3

      expect(error.attempts).toBe(3)
    })

    it('deve ter todos os códigos de erro definidos', () => {
      const validCodes = [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'HTTP_ERROR',
        'VALIDATION_ERROR',
        'WORKFLOW_NOT_FOUND',
        'UNKNOWN_ERROR',
      ] as const

      validCodes.forEach((code) => {
        const error = new N8NError('Teste', code, 'analise-bigfive')
        expect(error.code).toBe(code)
      })
    })
  })
})
