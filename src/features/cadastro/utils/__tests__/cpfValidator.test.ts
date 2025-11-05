/**
 * Testes TDD para validação de CPF
 *
 * Testes escritos ANTES da implementação para garantir que todos
 * os casos (válidos e inválidos) sejam cobertos.
 *
 * Algoritmo CPF:
 * - 11 dígitos numéricos
 * - 2 dígitos verificadores calculados
 * - CPFs conhecidos como inválidos (todos iguais) devem ser rejeitados
 */

import { describe, it, expect } from 'vitest'
import { validateCPF, formatCPF, cleanCPF } from '../cpfValidator'

describe('cpfValidator', () => {
  describe('validateCPF', () => {
    describe('CPFs válidos', () => {
      it('deve validar CPF válido sem formatação', () => {
        expect(validateCPF('12345678909')).toBe(true)
      })

      it('deve validar CPF válido com formatação', () => {
        expect(validateCPF('123.456.789-09')).toBe(true)
      })

      it('deve validar CPF 111.444.777-35 (conhecido válido)', () => {
        expect(validateCPF('111.444.777-35')).toBe(true)
      })

      it('deve validar CPF 529.982.247-25 (válido)', () => {
        expect(validateCPF('529.982.247-25')).toBe(true)
      })

      it('deve validar CPF 091.000.000-00 (válido com zeros)', () => {
        expect(validateCPF('091.000.000-00')).toBe(true)
      })
    })

    describe('CPFs inválidos - formato', () => {
      it('deve rejeitar CPF com menos de 11 dígitos', () => {
        expect(validateCPF('123456789')).toBe(false)
      })

      it('deve rejeitar CPF com mais de 11 dígitos', () => {
        expect(validateCPF('123456789012')).toBe(false)
      })

      it('deve rejeitar CPF vazio', () => {
        expect(validateCPF('')).toBe(false)
      })

      it('deve rejeitar CPF com letras', () => {
        expect(validateCPF('123.456.789-0A')).toBe(false)
      })

      it('deve rejeitar CPF com caracteres especiais inválidos', () => {
        expect(validateCPF('123#456@789-09')).toBe(false)
      })
    })

    describe('CPFs inválidos - sequências conhecidas', () => {
      const cpfsInvalidos = [
        '000.000.000-00',
        '111.111.111-11',
        '222.222.222-22',
        '333.333.333-33',
        '444.444.444-44',
        '555.555.555-55',
        '666.666.666-66',
        '777.777.777-77',
        '888.888.888-88',
        '999.999.999-99',
      ]

      cpfsInvalidos.forEach((cpf) => {
        it(`deve rejeitar CPF sequencial ${cpf}`, () => {
          expect(validateCPF(cpf)).toBe(false)
        })
      })
    })

    describe('CPFs inválidos - dígitos verificadores errados', () => {
      it('deve rejeitar CPF com primeiro dígito verificador errado', () => {
        expect(validateCPF('123.456.789-00')).toBe(false)
      })

      it('deve rejeitar CPF com segundo dígito verificador errado', () => {
        expect(validateCPF('123.456.789-08')).toBe(false)
      })

      it('deve rejeitar CPF com ambos dígitos verificadores errados', () => {
        expect(validateCPF('123.456.789-99')).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it('deve lidar com null/undefined', () => {
        expect(validateCPF(null as any)).toBe(false)
        expect(validateCPF(undefined as any)).toBe(false)
      })

      it('deve lidar com espaços em branco', () => {
        expect(validateCPF('   123.456.789-09   ')).toBe(true)
      })

      it('deve lidar com quebras de linha', () => {
        expect(validateCPF('123.456.789-09\n')).toBe(true)
      })
    })
  })

  describe('formatCPF', () => {
    it('deve formatar CPF sem máscara para XXX.XXX.XXX-XX', () => {
      expect(formatCPF('12345678909')).toBe('123.456.789-09')
    })

    it('deve manter formatação se já estiver formatado', () => {
      expect(formatCPF('123.456.789-09')).toBe('123.456.789-09')
    })

    it('deve remover caracteres inválidos e formatar', () => {
      expect(formatCPF('123ABC456DEF789-09')).toBe('123.456.789-09')
    })

    it('deve lidar com CPF parcial (menos de 11 dígitos)', () => {
      expect(formatCPF('12345')).toBe('123.45')
    })

    it('deve retornar string vazia para input vazio', () => {
      expect(formatCPF('')).toBe('')
    })
  })

  describe('cleanCPF', () => {
    it('deve remover todos os caracteres não numéricos', () => {
      expect(cleanCPF('123.456.789-09')).toBe('12345678909')
    })

    it('deve manter apenas números', () => {
      expect(cleanCPF('ABC123DEF456GHI789JKL09')).toBe('12345678909')
    })

    it('deve lidar com string vazia', () => {
      expect(cleanCPF('')).toBe('')
    })

    it('deve remover espaços', () => {
      expect(cleanCPF('123 456 789 09')).toBe('12345678909')
    })
  })
})
