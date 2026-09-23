/**
 * Phase 49 / plano 49-15 — a projeção da LISTAGEM de `ai_call_logs` (D-27c / T-49-15-03).
 *
 * Este arquivo nasce porque o plano pede duas coisas ao mesmo tempo e elas se opõem:
 * a listagem precisa de `error_code` e `model_snapshot` (sem eles a tela não pode distinguir
 * um fallback de um sucesso nem mostrar o modelo REAL), e precisa continuar SEM as colunas
 * sensíveis — `system_prompt`, `user_prompt_template`, `raw_response`, `parsed_reasoning` —,
 * que só entram na projeção do modal de detalhe. Acrescentar coluna a uma allowlist é
 * exatamente o momento em que a segunda metade do contrato se perde em silêncio: RLS é
 * row-level e não esconde coluna nenhuma.
 *
 * A asserção é sobre a FORMA da string de `.select`, capturada do cliente mockado — o mesmo
 * idioma de `revisaoRedacaoService.test.ts` e de `candidaturasService.test.ts`. Ela não
 * depende de fixture e pega o retorno silencioso de um `select('*')`.
 *
 * @see src/features/admin/ai-logs/services/aiLogsService.ts
 * @see src/features/triagem/services/__tests__/revisaoRedacaoService.test.ts (idioma)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { lastSelect, queryResult } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  // `data` é `unknown` (não `unknown[]`): a listagem devolve array e o detalhe devolve UMA
  // linha, e os dois compartilham este captador.
  queryResult: {
    value: { data: null as unknown, error: null as unknown, count: 0 as number | null },
  },
}))

vi.mock('@/lib/supabase/client', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn((cols: string) => {
      lastSelect.value = cols
      return q
    })
    q.eq = vi.fn(() => q)
    q.order = vi.fn(() => q)
    q.range = vi.fn(() => q)
    q.single = vi.fn(() => Promise.resolve(queryResult.value))
    q.then = (resolve: (v: unknown) => unknown) => resolve(queryResult.value)
    return q
  }
  return { supabase: { from: vi.fn(() => makeQuery()) } }
})

import { listAiLogs, getAiLogDetail } from '../aiLogsService'

/** As colunas que NUNCA podem sair na listagem — conteúdo de prompt e resposta bruta. */
const SENSIVEIS = [
  'system_prompt',
  'user_prompt_template',
  'raw_response',
  'parsed_reasoning',
] as const

describe('aiLogsService — projeção da LISTAGEM', () => {
  beforeEach(() => {
    lastSelect.value = ''
    queryResult.value = { data: [], error: null, count: 0 }
  })

  it('nunca projeta `*`', async () => {
    await listAiLogs()
    expect(lastSelect.value.length).toBeGreaterThan(0)
    expect(lastSelect.value).not.toContain('*')
  })

  it.each(['error_code', 'model_snapshot'])(
    'projeta `%s` — o que permite distinguir fallback de sucesso e mostrar o modelo real',
    async (coluna) => {
      await listAiLogs()
      expect(lastSelect.value).toContain(coluna)
    },
  )

  it.each(SENSIVEIS)('NÃO projeta a coluna sensível `%s` na listagem', async (coluna) => {
    await listAiLogs()
    expect(lastSelect.value).not.toContain(coluna)
  })

  it('segue projetando `model_id` — a reserva quando não há snapshot', async () => {
    await listAiLogs()
    expect(lastSelect.value).toContain('model_id')
  })
})

describe('aiLogsService — projeção do DETALHE (onde o conteúdo é permitido)', () => {
  beforeEach(() => {
    lastSelect.value = ''
    queryResult.value = { data: { id: 'log-1' }, error: null, count: null }
  })

  it('o detalhe projeta raw_response e parsed_reasoning, e `error_code`', async () => {
    await getAiLogDetail('log-1')
    expect(lastSelect.value).toContain('raw_response')
    expect(lastSelect.value).toContain('parsed_reasoning')
    expect(lastSelect.value).toContain('error_code')
    expect(lastSelect.value).not.toContain('*')
  })
})
