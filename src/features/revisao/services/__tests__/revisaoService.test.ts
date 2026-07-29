/**
 * Phase 42 / Plano 42-03 Task 2 (TDD RED) — contrato de erro + allowlist de colunas
 * da fila de revisão + formatador do contador da sidebar (REVISAO-02/03/05).
 *
 * Três contratos puros, todos sem rede (este arquivo não monta cliente Supabase — os
 * leitores e a mutation entram nos planos 42-09/42-10):
 *
 *  1. `classificarErroRevisao` (T-42-V11, lado cliente) — o servidor usa o MESMO
 *     SQLSTATE `42501` para DUAS recusas distintas ("não é RH" e "é o decisor"), e a
 *     42-UI-SPEC exige copy própria e **sem retry oferecido** apenas para a segunda.
 *     Só a MENSAGEM discrimina; a UI não pode adivinhar. Este teste prende exatamente
 *     essa discriminação — inclusive o caso negativo (`42501` genérico ⇒ DESCONHECIDO),
 *     que é o que faz o teste morder se alguém trocar o predicado por um `true`.
 *
 *  2. `FILA_REVISAO_COLUNAS` (T-42-03 / Pitfall 8) — o espelho cliente do `RETURNS
 *     TABLE` de `listar_revisoes_decisao`. RLS é row-level e NÃO esconde coluna
 *     ([[reference_select_star_leaks_pii]]), então a projeção é allowlist explícita. As
 *     três asserções NEGATIVAS (uma por chave proibida) são o cinto: a justificativa
 *     interna do recrutador (BD-9 em aberto, PII digitada à mão) e a identidade do
 *     revisor não podem entrar nesta lista por descuido de um plano futuro.
 *
 *  3. `formatarBadgePendentes` (T-42-V12) — o consumidor em `RHSidebar.tsx:241` avalia
 *     `item.badge && item.badge > 0`; um `0` ali é renderizado como TEXTO pelo React.
 *     Por isso o contrato é `undefined` (some), nunca um número.
 *
 * @see src/features/explicacao/services/__tests__/explicacaoService.test.ts (o molde)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-RESEARCH.md (§Pattern 3 · §Pitfall 8)
 */
import { describe, it, expect } from 'vitest'
import {
  RevisaoError,
  classificarErroRevisao,
  FILA_REVISAO_COLUNAS,
  formatarBadgePendentes,
} from '../revisaoService'

// A mensagem LITERAL que `responder_revisao_decisao` levanta no guard REVISAO-05
// (42-RESEARCH §Code Examples E3). É este texto que o servidor emite; se ele mudar,
// este teste é quem avisa — não a tela do RH.
const MSG_GUARD_DECISOR =
  'quem registrou a decisao nao pode responder a revisao dela (decisor)'

describe('classificarErroRevisao — o 42501 do guard é discriminado por MENSAGEM', () => {
  it('42501 + mensagem com "decisor" → GUARD_DECISOR', () => {
    const err = classificarErroRevisao({ code: '42501', message: MSG_GUARD_DECISOR })
    expect(err.code).toBe('GUARD_DECISOR')
  })

  // O caso que faz o teste MORDER: o mesmo SQLSTATE, mensagem genérica. Se o predicado
  // de discriminação for afrouxado para `true`, esta asserção quebra.
  it('42501 + mensagem genérica ("forbidden") → DESCONHECIDO, NÃO GUARD_DECISOR', () => {
    const err = classificarErroRevisao({ code: '42501', message: 'forbidden' })
    expect(err.code).toBe('DESCONHECIDO')
    expect(err.code).not.toBe('GUARD_DECISOR')
  })

  it('22023 (validação de payload) → VALIDACAO', () => {
    const err = classificarErroRevisao({
      code: '22023',
      message: 'justificativa precisa de ao menos 50 caracteres',
    })
    expect(err.code).toBe('VALIDACAO')
  })

  it('no_data_found (alcançabilidade) → VALIDACAO', () => {
    const err = classificarErroRevisao({
      code: 'no_data_found',
      message: 'decisao inexistente',
    })
    expect(err.code).toBe('VALIDACAO')
  })

  it('SQLSTATE desconhecido (PGRST301) → DESCONHECIDO', () => {
    expect(classificarErroRevisao({ code: 'PGRST301', message: 'x' }).code).toBe(
      'DESCONHECIDO',
    )
  })

  it('erro de rede sem `code` → DESCONHECIDO', () => {
    expect(classificarErroRevisao(new Error('rede')).code).toBe('DESCONHECIDO')
  })

  it('entradas degeneradas (null / undefined / string) não lançam → DESCONHECIDO', () => {
    expect(() => classificarErroRevisao(null)).not.toThrow()
    expect(classificarErroRevisao(null).code).toBe('DESCONHECIDO')
    expect(classificarErroRevisao(undefined).code).toBe('DESCONHECIDO')
    expect(classificarErroRevisao('falhou').code).toBe('DESCONHECIDO')
  })

  it('o resultado é SEMPRE um RevisaoError com name "RevisaoError" e `details` preservado', () => {
    const original = { code: '42501', message: MSG_GUARD_DECISOR }
    const err = classificarErroRevisao(original)
    expect(err).toBeInstanceOf(RevisaoError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('RevisaoError')
    expect(err.details).toBe(original)
    expect(err.message.length).toBeGreaterThan(0)
  })

  it('preserva `details` também para o erro de rede opaco', () => {
    const original = new Error('rede')
    expect(classificarErroRevisao(original).details).toBe(original)
  })
})

describe('FILA_REVISAO_COLUNAS — allowlist explícita do RETURNS TABLE da fila', () => {
  it('declara exatamente as 11 chaves do contrato (D-P42-05 + estado da linha)', () => {
    expect([...FILA_REVISAO_COLUNAS]).toEqual([
      'candidatura_id',
      'candidato_nome',
      'vaga_titulo',
      'decisao',
      'decidido_por_nome',
      'revisao_solicitada_em',
      'revisao_respondida_em',
      'revisao_veredito',
      'revisao_resultado',
      'respondida_por_nome',
      'pode_responder',
    ])
    expect(FILA_REVISAO_COLUNAS).toHaveLength(11)
  })

  // ── As três asserções NEGATIVAS, uma por chave proibida ──────────────────────
  it('NÃO contém `justificativa` — o texto interno do recrutador fica fora da fila (Pitfall 8 / BD-9)', () => {
    expect(FILA_REVISAO_COLUNAS as readonly string[]).not.toContain('justificativa')
  })

  it('NÃO contém `motivo_rejeicao` — texto interno, nunca projetado na fila', () => {
    expect(FILA_REVISAO_COLUNAS as readonly string[]).not.toContain('motivo_rejeicao')
  })

  it('NÃO contém `revisao_por_usuario` — a identidade (UUID) do revisor nunca vai ao cliente', () => {
    expect(FILA_REVISAO_COLUNAS as readonly string[]).not.toContain(
      'revisao_por_usuario',
    )
  })

  it('`revisao_resultado` (resposta AO CANDIDATO) está presente e é distinta da justificativa interna', () => {
    expect(FILA_REVISAO_COLUNAS as readonly string[]).toContain('revisao_resultado')
    expect(FILA_REVISAO_COLUNAS as readonly string[]).not.toContain('justificativa')
  })

  it('não tem chave duplicada', () => {
    expect(new Set(FILA_REVISAO_COLUNAS).size).toBe(FILA_REVISAO_COLUNAS.length)
  })
})

describe('formatarBadgePendentes — o contador da sidebar (oculto em 0, 99+ acima de 99)', () => {
  it('0 → undefined (badge OCULTO; um 0 seria renderizado como texto pelo React)', () => {
    expect(formatarBadgePendentes(0)).toBeUndefined()
  })

  it('1 → "1"', () => {
    expect(formatarBadgePendentes(1)).toBe('1')
  })

  it('99 → "99" (última contagem exata)', () => {
    expect(formatarBadgePendentes(99)).toBe('99')
  })

  it('100 → "99+"', () => {
    expect(formatarBadgePendentes(100)).toBe('99+')
  })

  it('1234 → "99+"', () => {
    expect(formatarBadgePendentes(1234)).toBe('99+')
  })

  it('undefined → undefined (carregando: oculto, nunca 0, nunca "—")', () => {
    expect(formatarBadgePendentes(undefined)).toBeUndefined()
  })

  it('null → undefined (falha de leitura: oculto)', () => {
    expect(formatarBadgePendentes(null)).toBeUndefined()
  })

  it('NaN → undefined', () => {
    expect(formatarBadgePendentes(NaN)).toBeUndefined()
  })

  it('-3 → undefined (contagem negativa é impossível; oculta em vez de exibir lixo)', () => {
    expect(formatarBadgePendentes(-3)).toBeUndefined()
  })

  it('nunca lança para nenhuma dessas entradas', () => {
    for (const n of [0, 1, 99, 100, 1234, undefined, null, NaN, -3]) {
      expect(() => formatarBadgePendentes(n)).not.toThrow()
    }
  })
})
