/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 49 / plano 49-15 — `/admin/ai-logs`: o fallback deixa de passar por sucesso (D-27c).
 *
 * ─── O QUE ESTAVA ERRADO (medido em PROD em 2026-09-23, só leitura) ──────────────────
 *
 * `ai_call_logs` tem 55 linhas. **17 delas** têm `success = true` E
 * `error_code = 'anthropic_retries_exhausted'` — ou seja: o modelo configurado NÃO respondeu,
 * o resultado veio do modelo de contingência, e a tela do admin as pintava de verde
 * «Sucesso», idênticas às 38 legítimas. Um resultado de fallback é utilizável e, ao mesmo
 * tempo, não é o que foi pedido; sem o terceiro estado, quem audita o custo e a qualidade das
 * chamadas não tem como distinguir os dois casos.
 *
 * ⚠ **O discriminante NÃO pode ser só o prefixo `fallback_`.** O prefixo é a codificação
 * que o plano 49-02 instalou; as 17 linhas vivas são ANTERIORES a ele e carregam o código
 * cru. Uma regra que olhasse apenas `ehFallback(error_code)` deixaria exatamente essas 17
 * linhas verdes — as MESMAS que motivaram o conserto. É a lição do CLAUDE.md §«Portões»
 * aplicada ao discriminante: a forma («tem código de erro numa chamada bem-sucedida») vigia o
 * caso novo; a lista literal de prefixos conhecidos não.
 *
 * Os 5 casos abaixo são o `<behavior>` do plano. O fixture é tipado LOCALMENTE, de propósito:
 * o hook é mockado, então o teste não depende da forma de `AiLogListRow` e a fase RED reprova
 * por ASSERÇÃO (o selo «Fallback» não existe) e não por erro de tipo ou de carregamento de
 * módulo — que seria um RED inválido (#3770).
 *
 * @see supabase/functions/_shared/ai-error-codes.ts (CAUSA_FALLBACK_ROTULO — a causa legível)
 * @see .planning/phases/49-consertos-da-jornada-bloco-2/49-02-SUMMARY.md (o prefixo e as causas)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const useAiLogsMock = vi.fn()
const useAiLogDetailMock = vi.fn()

vi.mock('../../hooks/useAiLogs', () => ({
  useAiLogs: (...args: unknown[]) => useAiLogsMock(...args),
  useAiLogDetail: (...args: unknown[]) => useAiLogDetailMock(...args),
  aiLogsKeys: {
    all: ['ai-logs'] as const,
    lists: () => ['ai-logs', 'list'] as const,
    list: () => ['ai-logs', 'list', {}] as const,
    details: () => ['ai-logs', 'detail'] as const,
    detail: (id: string) => ['ai-logs', 'detail', id] as const,
  },
}))

// A shell do RH monta sidebar + topbar + store de auth; nada disso é o objeto deste teste.
vi.mock('../../../../../components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// 49-42: o Radix Select vira um `<select>` nativo (o idioma do repositório, ver
// `ComparativoScreen.test.tsx`): as OPÇÕES do filtro de Status ficam observáveis sem abrir
// portal, e trocar a opção é um `fireEvent.change`.
vi.mock('../../../../../components/ui/select', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string
      onValueChange: (v: string) => void
      children?: React.ReactNode
    }) =>
      React.createElement(
        'select',
        { value: value ?? '', onChange: (e: { target: { value: string } }) => onValueChange(e.target.value) },
        children,
      ),
    SelectTrigger: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) =>
      React.createElement('option', { value }, children),
  }
})

import { AiLogsPage, estadoDaChamada } from '../AiLogsPage'
import { CAUSA_FALLBACK_ROTULO } from '../../../../../../supabase/functions/_shared/ai-error-codes'

/**
 * A forma que a LISTAGEM projeta depois deste plano. Tipada aqui, não importada: ver o
 * docblock — é o que mantém o RED válido.
 */
interface LinhaFixture {
  id: string
  created_at: string
  candidato_id: string | null
  vaga_id: string | null
  call_type: string
  provider: string
  model_id: string
  model_snapshot: string | null
  prompt_hash: string
  prompt_version_id: string
  success: boolean
  error_code: string | null
  parsed_score: number | null
  cost_usd: number | null
  latency_ms: number
}

function linha(over: Partial<LinhaFixture> = {}): LinhaFixture {
  return {
    id: 'log-1',
    created_at: '2026-09-20T12:00:00Z',
    candidato_id: null,
    vaga_id: null,
    call_type: 'comparative_ranking',
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-6',
    model_snapshot: null,
    prompt_hash: 'h',
    prompt_version_id: 'pv',
    success: true,
    error_code: null,
    parsed_score: null,
    cost_usd: 0.01,
    latency_ms: 1234,
    ...over,
  }
}

/** Os 4 estados do `<behavior>`, cada um com um `model_snapshot` único para poder ser achado. */
const FALLBACK_NOVO = linha({
  id: 'log-fallback-novo',
  success: true,
  error_code: 'fallback_anthropic_max_tokens',
  provider: 'openai',
  model_id: 'gpt-4o-mini',
  model_snapshot: 'gpt-4o-mini-2024-07-18',
})

const FALHA = linha({
  id: 'log-falha',
  success: false,
  provider: 'anthropic',
  error_code: 'anthropic_timeout',
  model_snapshot: 'claude-sonnet-4-6-20260101',
})

const SUCESSO = linha({
  id: 'log-sucesso',
  success: true,
  error_code: null,
  model_snapshot: 'claude-sonnet-4-6-20260202',
})

// As 17 linhas vivas: fallback ANTERIOR ao prefixo do 49-02.
const FALLBACK_ANTIGO = linha({
  id: 'log-fallback-antigo',
  success: true,
  error_code: 'anthropic_retries_exhausted',
  model_snapshot: 'gpt-4o-mini-2024-07-18-antigo',
})

function montar(rows: LinhaFixture[]) {
  useAiLogsMock.mockReturnValue({
    data: { data: rows, total: rows.length, page: 1, limit: 50, totalPages: 1 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })
  useAiLogDetailMock.mockReturnValue({ data: undefined, isLoading: false })
  render(<AiLogsPage />)
}

/** A `<tr>` de uma linha, localizada pelo `model_snapshot` (único por fixture). */
function linhaDe(snapshot: string): HTMLElement {
  const tr = screen.getByText(snapshot).closest('tr')
  expect(tr).not.toBeNull()
  return tr as HTMLElement
}

describe('AiLogsPage — os três estados do log de IA (D-27c)', () => {
  beforeEach(() => {
    useAiLogsMock.mockReset()
    useAiLogDetailMock.mockReset()
  })

  it('success=true com `fallback_anthropic_max_tokens` ⇒ «Fallback» com «não coube»', () => {
    montar([FALLBACK_NOVO])
    const tr = linhaDe('gpt-4o-mini-2024-07-18')
    const selo = within(tr).getByTestId('ai-log-fallback')
    expect(selo).toHaveTextContent(/Fallback/)
    expect(within(tr).getByText(/não coube/)).toBeInTheDocument()
  })

  it('a linha de fallback NUNCA diz «Sucesso» (a prohibition do JORN-28)', () => {
    montar([FALLBACK_NOVO])
    expect(linhaDe('gpt-4o-mini-2024-07-18')).not.toHaveTextContent('Sucesso')
  })

  it('o selo de fallback é âmbar — nem verde de sucesso, nem vermelho de falha', () => {
    montar([FALLBACK_NOVO])
    expect(within(linhaDe('gpt-4o-mini-2024-07-18')).getByTestId('ai-log-fallback').className)
      .toMatch(/amber/)
  })

  it('success=false com `anthropic_timeout` ⇒ «Falha» com «demorou»', () => {
    montar([FALHA])
    const tr = linhaDe('claude-sonnet-4-6-20260101')
    expect(tr).toHaveTextContent(/Falha/)
    expect(within(tr).getByText(/demorou/)).toBeInTheDocument()
    expect(within(tr).queryByTestId('ai-log-fallback')).toBeNull()
  })

  it('success=true sem `error_code` ⇒ «Sucesso», sem selo de fallback e sem causa', () => {
    montar([SUCESSO])
    const tr = linhaDe('claude-sonnet-4-6-20260202')
    expect(tr).toHaveTextContent(/Sucesso/)
    expect(within(tr).queryByTestId('ai-log-fallback')).toBeNull()
  })

  // ⚠ A asserção que separa «forma» de «lista literal»: sem o prefixo `fallback_`,
  // um discriminante baseado só em `ehFallback` deixaria esta linha verde.
  it('linha antiga `anthropic_retries_exhausted` ⇒ «Fallback» com «causa não registrada (antes da Phase 49)»', () => {
    montar([FALLBACK_ANTIGO])
    const tr = linhaDe('gpt-4o-mini-2024-07-18-antigo')
    expect(within(tr).getByTestId('ai-log-fallback')).toHaveTextContent(/Fallback/)
    expect(within(tr).getByText(/causa não registrada \(antes da Phase 49\)/)).toBeInTheDocument()
    expect(tr).not.toHaveTextContent('Sucesso')
  })

  it('os quatro estados convivem na mesma tabela', () => {
    montar([FALLBACK_NOVO, FALHA, SUCESSO, FALLBACK_ANTIGO])
    expect(screen.getAllByTestId('ai-log-fallback')).toHaveLength(2)
  })
})

describe('AiLogsPage — a coluna Modelo mostra o modelo REAL', () => {
  beforeEach(() => {
    useAiLogsMock.mockReset()
    useAiLogDetailMock.mockReset()
  })

  it('mostra `model_snapshot` quando presente (o modelo que de fato respondeu)', () => {
    montar([SUCESSO])
    expect(screen.getByText('claude-sonnet-4-6-20260202')).toBeInTheDocument()
  })

  it('cai para `model_id` quando `model_snapshot` é NULL — nunca célula vazia', () => {
    montar([linha({ id: 'log-sem-snapshot', model_snapshot: null, model_id: 'modelo-configurado' })])
    expect(screen.getByText('modelo-configurado')).toBeInTheDocument()
  })
})

// ── Phase 49 / plano 49-42 — a linha-evento do SINAL é «Sinal», não «Falha» (JORN-41) ────
//
// O 49-38 grava `provider='none'`, `success=false`, `error_code='prompt_injection_flagged'`
// quando o detector classifica a entrada como `flag`: a análise SEGUIU, e o resultado do modelo
// vem numa linha própria. `success=false` porque a linha-evento não é chamada de modelo — e
// «Falha» seria um diagnóstico falso ao admin.
const EVENTO_SINAL = linha({
  id: 'log-evento-sinal',
  success: false,
  provider: 'none',
  error_code: 'prompt_injection_flagged',
  model_snapshot: 'evento-sinal-snapshot',
})

/** Tokens de cor destrutiva (o idioma do 49-41: por TOKEN, não por substring). */
function tomDestrutivo(className: string): string[] {
  return className.split(/\s+/).filter((t) => /^(bg|text|border)-(red|destructive)/.test(t))
}

describe('AiLogsPage — o estado «Sinal» (49-42 / JORN-41)', () => {
  beforeEach(() => {
    useAiLogsMock.mockReset()
    useAiLogDetailMock.mockReset()
  })

  it('estadoDaChamada: o código do sinal é «sinal», antes de olhar `success`', () => {
    expect(estadoDaChamada({ success: false, error_code: 'prompt_injection_flagged' })).toBe('sinal')
  })

  it('os três estados de hoje ficam iguais na célula', () => {
    expect(estadoDaChamada({ success: false, error_code: 'anthropic_timeout' })).toBe('falha')
    expect(estadoDaChamada({ success: false, error_code: null })).toBe('falha')
    expect(estadoDaChamada({ success: false, error_code: 'prompt_injection_detected' })).toBe('falha')
    expect(estadoDaChamada({ success: true, error_code: 'fallback_anthropic_timeout' })).toBe('fallback')
    expect(estadoDaChamada({ success: true, error_code: null })).toBe('sucesso')
  })

  it('a linha-evento mostra «Sinal» com a causa legível do mapa — e NUNCA «Falha»', () => {
    montar([EVENTO_SINAL])
    const tr = linhaDe('evento-sinal-snapshot')
    const selo = within(tr).getByTestId('ai-log-sinal')
    expect(selo).toHaveTextContent(/^Sinal$/)
    expect(within(tr).getByText(CAUSA_FALLBACK_ROTULO.prompt_injection_flagged)).toBeInTheDocument()
    expect(tr).not.toHaveTextContent('Falha')
    expect(tomDestrutivo(selo.className)).toEqual([])
  })

  it('as cinco formas convivem: «Sinal» só na linha-evento, «Falha» só na falha', () => {
    montar([FALLBACK_NOVO, FALHA, SUCESSO, FALLBACK_ANTIGO, EVENTO_SINAL])
    expect(screen.getAllByTestId('ai-log-sinal')).toHaveLength(1)
    expect(screen.getAllByTestId('ai-log-fallback')).toHaveLength(2)
    expect(linhaDe('claude-sonnet-4-6-20260101')).toHaveTextContent(/Falha/)
  })

  it('o Select de Status oferece «Todos», «Sucesso», «Fallback», «Falha» e «Sinal»', () => {
    montar([])
    const status = screen
      .getAllByRole('combobox')
      .find((el) => within(el).queryByRole('option', { name: 'Falha' }))
    expect(status).toBeDefined()
    expect(within(status!).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todos',
      'Sucesso',
      'Fallback',
      'Falha',
      'Sinal',
    ])
  })

  it('escolher «Sinal» manda `status: \'sinal\'` ao serviço', () => {
    montar([])
    const status = screen
      .getAllByRole('combobox')
      .find((el) => within(el).queryByRole('option', { name: 'Falha' }))!
    fireEvent.change(status, { target: { value: 'sinal' } })
    const [filtros] = useAiLogsMock.mock.calls[useAiLogsMock.mock.calls.length - 1] as [
      Record<string, unknown>,
    ]
    expect(filtros).toEqual({ status: 'sinal' })
  })
})
