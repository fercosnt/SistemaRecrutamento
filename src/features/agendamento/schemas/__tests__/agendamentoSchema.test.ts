/**
 * Phase 48 / Plan 48-03 Task 2 — JORN-D5: `local_ou_link` obrigatório e validado na escrita.
 *
 * O mesmo campo guarda o LINK (online) e o ENDEREÇO (presencial) — medido em PROD. Por isso:
 * obrigatório nas duas modalidades; URL http(s) (via `isSafeHttpUrl`) só no online.
 * A camada servidor é o trigger `validar_local_ou_link_agendamento`
 * (supabase/migrations/20260921000003_p48_local_ou_link_valida.sql).
 *
 * @see src/features/agendamento/schemas/agendamentoSchema.ts
 */
import { describe, it, expect } from 'vitest'
import { agendamentoSchema } from '../agendamentoSchema'

const futuro = () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

function parse(tipo: 'online' | 'presencial', local_ou_link?: string) {
  return agendamentoSchema.safeParse({ tipo, data_hora: futuro(), local_ou_link })
}

function mensagensDoLocal(r: ReturnType<typeof parse>): string[] {
  if (r.success) return []
  return r.error.issues
    .filter((i) => i.path.join('.') === 'local_ou_link')
    .map((i) => i.message)
}

describe('agendamentoSchema — local_ou_link (JORN-D5)', () => {
  it('online + https válido → válido', () => {
    expect(parse('online', 'https://meet.google.com/abc').success).toBe(true)
  })

  it('online + "dddd" → erro de link inválido em local_ou_link', () => {
    const r = parse('online', 'dddd')
    expect(r.success).toBe(false)
    expect(mensagensDoLocal(r)).toEqual([
      'Informe um link válido, começando com http:// ou https://.',
    ])
  })

  it('online + vazio → erro de link obrigatório', () => {
    const r = parse('online', '')
    expect(r.success).toBe(false)
    expect(mensagensDoLocal(r)).toEqual(['Informe o link da videochamada.'])
  })

  it('online + ausente → erro de link obrigatório', () => {
    const r = parse('online', undefined)
    expect(r.success).toBe(false)
    expect(mensagensDoLocal(r)).toEqual(['Informe o link da videochamada.'])
  })

  it('online + javascript: → erro de link inválido', () => {
    const r = parse('online', 'javascript:alert(1)')
    expect(r.success).toBe(false)
    expect(mensagensDoLocal(r)).toEqual([
      'Informe um link válido, começando com http:// ou https://.',
    ])
  })

  it('presencial + endereço (sem esquema) → válido', () => {
    expect(parse('presencial', 'Av. Paulista, 1000').success).toBe(true)
  })

  it('presencial + só espaços → erro de local obrigatório', () => {
    const r = parse('presencial', '   ')
    expect(r.success).toBe(false)
    expect(mensagensDoLocal(r)).toEqual(['Informe o local da entrevista.'])
  })
})
