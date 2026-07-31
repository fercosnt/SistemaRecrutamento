/**
 * Phase 42 / Plano 42-10 Task 1 (TDD RED) — o schema de validação da resposta à
 * revisão de decisão (REVISAO-03).
 *
 * ⚠ O QUE ESTE ARQUIVO ESTÁ (E NÃO ESTÁ) PROVANDO. O mínimo de 50 caracteres aqui é o
 * **espelho** do guard do servidor (`responder_revisao_decisao` levanta `22023` com
 * `length(btrim(coalesce(p_justificativa,''))) < 50`), nunca o substituto. O que este
 * schema entrega é a mensagem certa no momento certo — o operador não precisa fazer uma
 * viagem de rede para descobrir que faltam 12 caracteres. Se este arquivo for apagado, o
 * write-path continua fechado; se o SERVIDOR for afrouxado, nenhum teste daqui perceberia.
 *
 * A mensagem de mínimo é asserida **byte a byte** contra a 42-UI-SPEC (§Diálogo
 * "Responder revisão" → "Erro de mínimo") porque ela aparece em duas superfícies (o
 * schema e o texto de ajuda abaixo da área de texto) e uma deriva entre as duas produz
 * duas frases diferentes para o mesmo fato.
 *
 * @see src/features/decisao/schemas/decisaoSchema.ts (o análogo copiado)
 * @see supabase/migrations/20260730000002_p42_revisao_art20_authz_fail_closed.sql (o guard real)
 */
import { describe, it, expect } from 'vitest'
import {
  JUSTIFICATIVA_MIN,
  JUSTIFICATIVA_MAX,
  responderRevisaoSchema,
  VEREDITO_OPTIONS,
} from '../responderRevisaoSchema'

/** A copy exata da 42-UI-SPEC. Se o servidor ou a spec mudarem, é aqui que dói. */
const MSG_MIN = 'A justificativa precisa de pelo menos 50 caracteres.'

const texto = (n: number) => 'a'.repeat(n)

describe('responderRevisaoSchema — o mínimo de 50 espelha o guard do servidor', () => {
  it('o mínimo declarado é 50 (o mesmo número do `22023` da RPC)', () => {
    expect(JUSTIFICATIVA_MIN).toBe(50)
  })

  it('49 caracteres → rejeita com a mensagem VERBATIM da UI-SPEC', () => {
    const r = responderRevisaoSchema.safeParse({
      veredito: 'mantida',
      justificativa: texto(49),
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message)
      expect(msgs).toContain(MSG_MIN)
    }
  })

  it('exatamente 50 caracteres → aceita (o limite é inclusivo, como no servidor)', () => {
    expect(
      responderRevisaoSchema.safeParse({
        veredito: 'mantida',
        justificativa: texto(50),
      }).success,
    ).toBe(true)
  })

  it('justificativa vazia → rejeita', () => {
    expect(
      responderRevisaoSchema.safeParse({ veredito: 'revertida', justificativa: '' })
        .success,
    ).toBe(false)
  })
})

describe('responderRevisaoSchema — o teto de 2000 é guarda de INTERFACE', () => {
  it('o teto declarado é 2000', () => {
    expect(JUSTIFICATIVA_MAX).toBe(2000)
  })

  it('exatamente 2000 → aceita', () => {
    expect(
      responderRevisaoSchema.safeParse({
        veredito: 'mantida',
        justificativa: texto(2000),
      }).success,
    ).toBe(true)
  })

  it('2001 → rejeita (o servidor exige só o mínimo; o teto é nosso)', () => {
    expect(
      responderRevisaoSchema.safeParse({
        veredito: 'mantida',
        justificativa: texto(2001),
      }).success,
    ).toBe(false)
  })
})

describe('responderRevisaoSchema — o vocabulário do veredito é fechado', () => {
  it('aceita `mantida` e `revertida`', () => {
    for (const veredito of ['mantida', 'revertida'] as const) {
      expect(
        responderRevisaoSchema.safeParse({ veredito, justificativa: texto(60) }).success,
      ).toBe(true)
    }
  })

  it('rejeita um veredito fora do par (o mesmo `22023` que a RPC levanta)', () => {
    for (const veredito of ['MANTIDA', 'aprovado', 'reverter', '']) {
      expect(
        responderRevisaoSchema.safeParse({ veredito, justificativa: texto(60) }).success,
      ).toBe(false)
    }
  })

  it('rejeita veredito ausente — o formulário abre SEM veredito pré-selecionado', () => {
    expect(
      responderRevisaoSchema.safeParse({ justificativa: texto(60) }).success,
    ).toBe(false)
  })
})

describe('VEREDITO_OPTIONS — os rótulos vêm da UI-SPEC, na ordem da UI-SPEC', () => {
  it('são exatamente duas opções, com os rótulos e a ajuda verbatim', () => {
    expect(VEREDITO_OPTIONS).toEqual([
      {
        value: 'mantida',
        label: 'Manter a decisão',
        ajuda: 'A decisão original permanece como está.',
      },
      {
        value: 'revertida',
        label: 'Reverter a decisão',
        ajuda: 'A decisão original deixa de valer.',
      },
    ])
  })

  it('todo `value` das opções é aceito pelo schema — a lista não pode divergir do enum', () => {
    for (const opt of VEREDITO_OPTIONS) {
      expect(
        responderRevisaoSchema.safeParse({
          veredito: opt.value,
          justificativa: texto(60),
        }).success,
      ).toBe(true)
    }
  })
})
