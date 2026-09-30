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

const { lastSelect, queryResult, filtros } = vi.hoisted(() => ({
  lastSelect: { value: '' },
  // 49-42: os filtros aplicados à consulta, na ordem, para o avaliador do teste de concordância.
  filtros: { value: [] as { metodo: string; args: unknown[] }[] },
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
    // Os métodos de FILTRO registram a chamada (49-42). Um método que o serviço use e que não
    // esteja aqui não existe no mock: a consulta quebra alto, e o teste não passa vácuo.
    for (const metodo of ['eq', 'neq', 'is', 'not', 'or']) {
      q[metodo] = vi.fn((...args: unknown[]) => {
        filtros.value.push({ metodo, args })
        return q
      })
    }
    q.order = vi.fn(() => q)
    q.range = vi.fn(() => q)
    q.single = vi.fn(() => Promise.resolve(queryResult.value))
    q.then = (resolve: (v: unknown) => unknown) => resolve(queryResult.value)
    return q
  }
  return { supabase: { from: vi.fn(() => makeQuery()) } }
})

import { listAiLogs, getAiLogDetail, estadoDaChamada, type EstadoChamada } from '../aiLogsService'

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

// ─────────────────────────────────────────────────────────────────────────────────────────
// Phase 49 / plano 49-42 — filtro ≡ célula (JORN-41)
//
// O 49-38 grava a linha-evento do SINAL (`provider='none'`, `success=false`,
// `error_code='prompt_injection_flagged'`): a análise SEGUIU, e a linha só registra que o texto
// tinha uma possível instrução à IA. Chamá-la de «Falha» seria diagnóstico falso — na célula E
// no filtro. O estado de uma linha é decidido por UM predicado, `estadoDaChamada`, no serviço;
// o filtro de cada estado tem de selecionar exatamente as linhas que a célula chama daquele
// estado. Este teste prova isso sobre TODAS as formas de linha, aplicando os filtros que o
// serviço montou a cada linha com a semântica do SQL — em especial a do NULO: `neq` sobre um
// código nulo NÃO seleciona a linha (NULL <> x é NULL), que é o erro que a tradução ingênua de
// «código diferente do sinal» comete.
// ─────────────────────────────────────────────────────────────────────────────────────────

type Linha = { success: boolean; error_code: string | null }
type Estado = EstadoChamada

const SINAL = 'prompt_injection_flagged'

/** Todas as formas de linha de `ai_call_logs`, cada uma com o estado que a célula lhe dá. */
const FORMAS: { nome: string; linha: Linha; esperado: Estado }[] = [
  { nome: 'sucesso limpo', linha: { success: true, error_code: null }, esperado: 'sucesso' },
  {
    nome: 'fallback com código fallback_*',
    linha: { success: true, error_code: 'fallback_anthropic_max_tokens' },
    esperado: 'fallback',
  },
  {
    nome: 'fallback antigo com código cru',
    linha: { success: true, error_code: 'anthropic_retries_exhausted' },
    esperado: 'fallback',
  },
  {
    nome: 'falha com código',
    linha: { success: false, error_code: 'anthropic_timeout' },
    esperado: 'falha',
  },
  { nome: 'falha sem código', linha: { success: false, error_code: null }, esperado: 'falha' },
  { nome: 'evento de sinal', linha: { success: false, error_code: SINAL }, esperado: 'sinal' },
  {
    nome: 'evento de bloqueio (prompt_injection_detected)',
    linha: { success: false, error_code: 'prompt_injection_detected' },
    esperado: 'falha',
  },
]

const ESTADOS: Estado[] = ['sucesso', 'fallback', 'falha', 'sinal']

/** Um valor como o PostgREST o lê num filtro: `null` literal vira nulo. */
function valorDoFiltro(v: string): string | null {
  return v === 'null' ? null : v
}

/** Uma condição simples com a semântica do SQL: comparar com NULO nunca é verdadeiro. */
function condicao(linha: Linha, coluna: string, op: string, valor: unknown): boolean {
  const atual = (linha as Record<string, unknown>)[coluna]
  switch (op) {
    case 'eq':
      return atual !== null && valor !== null && atual === valor
    case 'neq':
      return atual !== null && valor !== null && atual !== valor
    case 'is':
      return valor === null ? atual === null : atual === valor
    default:
      throw new Error(`operador não modelado pelo avaliador: ${op}`)
  }
}

/** Aplica à linha os filtros que o serviço montou (AND entre eles). */
function seleciona(linha: Linha, aplicados: { metodo: string; args: unknown[] }[]): boolean {
  return aplicados.every(({ metodo, args }) => {
    if (metodo === 'eq' || metodo === 'neq' || metodo === 'is') {
      return condicao(linha, args[0] as string, metodo, args[1])
    }
    if (metodo === 'not') {
      return !condicao(linha, args[0] as string, args[1] as string, args[2])
    }
    if (metodo === 'or') {
      return (args[0] as string).split(',').some((parte) => {
        const [coluna, op, ...resto] = parte.split('.')
        return condicao(linha, coluna, op, valorDoFiltro(resto.join('.')))
      })
    }
    throw new Error(`método de filtro não modelado pelo avaliador: ${metodo}`)
  })
}

/** Os filtros que `listAiLogs({ status })` aplica à consulta (sem a paginação/ordenação). */
async function filtrosDoEstado(estado: Estado) {
  filtros.value = []
  await listAiLogs({ status: estado })
  return [...filtros.value]
}

describe('aiLogsService — filtro de Status ≡ célula de Status (49-42 / JORN-41)', () => {
  beforeEach(() => {
    filtros.value = []
    queryResult.value = { data: [], error: null, count: 0 }
  })

  it('o filtro «Falha» NÃO seleciona o evento de sinal, e seleciona o evento de bloqueio', async () => {
    const aplicados = await filtrosDoEstado('falha')
    expect(aplicados.length).toBeGreaterThan(0)
    const sinal = FORMAS.find((f) => f.esperado === 'sinal')!.linha
    const bloqueio = FORMAS.find((f) => f.linha.error_code === 'prompt_injection_detected')!.linha
    expect(seleciona(sinal, aplicados)).toBe(false)
    expect(seleciona(bloqueio, aplicados)).toBe(true)
  })

  it('o filtro «Sinal» seleciona SÓ o evento de sinal', async () => {
    const aplicados = await filtrosDoEstado('sinal')
    const selecionadas = FORMAS.filter((f) => seleciona(f.linha, aplicados)).map((f) => f.nome)
    expect(selecionadas).toEqual(['evento de sinal'])
  })

  it('o predicado mora no SERVIÇO e a tabela de formas é a da célula', () => {
    expect(typeof estadoDaChamada).toBe('function')
    for (const f of FORMAS) expect([f.nome, estadoDaChamada(f.linha)]).toEqual([f.nome, f.esperado])
  })

  it('concordância: para cada estado E e cada forma, o filtro de E seleciona a linha ⇔ estadoDaChamada(linha) === E', async () => {
    const divergencias: string[] = []
    for (const estado of ESTADOS) {
      const aplicados = await filtrosDoEstado(estado)
      // População: cada estado seleciona ao menos uma forma (um filtro que não seleciona nada
      // concordaria vacuamente com uma célula que também não produz o estado).
      expect(
        FORMAS.some((f) => seleciona(f.linha, aplicados)),
        `o filtro «${estado}» não seleciona forma nenhuma`,
      ).toBe(true)
      for (const f of FORMAS) {
        const filtro = seleciona(f.linha, aplicados)
        const celula = estadoDaChamada(f.linha) === estado
        if (filtro !== celula) {
          divergencias.push(`${estado} × ${f.nome}: filtro=${filtro} célula=${celula}`)
        }
      }
    }
    expect(divergencias).toEqual([])
  })

  it('sem filtro de Status, nenhum filtro de estado é aplicado (a listagem mostra tudo)', async () => {
    filtros.value = []
    await listAiLogs({})
    expect(filtros.value).toEqual([])
  })
})
