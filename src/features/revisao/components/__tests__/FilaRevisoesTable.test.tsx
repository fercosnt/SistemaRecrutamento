/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 42 / Plano 42-09 Task 2 (TDD RED) — `FilaRevisoesTable` (REVISAO-02).
 *
 * Cobre os 4 estados assíncronos do `AsyncState`, os 3 casos parciais NOMEADOS da
 * 42-UI-SPEC (E1 partial) e o backstop de transbordo (E1 overflow, 60 linhas + o cap):
 *
 *  · empty — DOIS vazios distintos conforme o toggle. O mesmo vazio para os dois estados
 *    mentiria: "nenhum pendente" com respondidos existindo é uma fila trabalhada, e
 *    "nenhum registrado" é uma fila que nunca teve pedido. São fatos diferentes.
 *  · error — copy própria + retry, e NUNCA a mensagem crua do transporte.
 *  · partial — `decidido_por_nome` nulo → "Não identificado" e NENHUM UUID no DOM
 *    (invariante 4); linha respondida → veredito neutro sem faixa colorida; config de
 *    limiar ausente → faixa degenerada.
 *  · overflow — não há paginação no v1: cabeçalho fixo + rolagem interna, e o aviso de
 *    corte aparece SÓ no cap de 200 (o número medido pelo REVISAO-06 antes desta tela).
 *
 * Os dois hooks de leitura são mockados: esta suíte assere a TABELA, não a rede.
 *
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Fila RH · §UI Considerations E1)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const useFilaMock = vi.fn()
const useConfigMock = vi.fn()

vi.mock('@/features/revisao/hooks/useFilaRevisoes', () => ({
  useFilaRevisoes: (...args: unknown[]) => useFilaMock(...args),
  revisoesKeys: {
    all: ['revisoes'] as const,
    lists: () => ['revisoes', 'list'] as const,
    list: (f: unknown) => ['revisoes', 'list', f] as const,
    pendentesCount: () => ['revisoes', 'pendentes-count'] as const,
    configSla: () => ['revisoes', 'config-sla'] as const,
  },
}))

vi.mock('@/features/revisao/hooks/useConfigSlaRevisao', () => ({
  useConfigSlaRevisao: (...args: unknown[]) => useConfigMock(...args),
}))

import { FilaRevisoesTable } from '../FilaRevisoesTable'
import type { FilaRevisaoRow } from '../../services/revisaoService'

const UUID = '44444444-4444-4444-8444-444444444444'

function linha(over: Partial<FilaRevisaoRow> = {}): FilaRevisaoRow {
  return {
    candidatura_id: UUID,
    candidato_nome: 'Ana Souza',
    vaga_titulo: 'Dentista — Matriz',
    decisao: 'rejeitado',
    decidido_por_nome: 'Carla RH',
    revisao_solicitada_em: '2026-07-20T12:00:00Z',
    revisao_respondida_em: null,
    revisao_veredito: null,
    revisao_resultado: null,
    respondida_por_nome: null,
    pode_responder: true,
    ...over,
  }
}

function filaState(over: Record<string, unknown> = {}) {
  return {
    data: [] as FilaRevisaoRow[],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
    ...over,
  }
}

beforeEach(() => {
  useFilaMock.mockReset()
  useConfigMock.mockReset()
  useFilaMock.mockReturnValue(filaState())
  useConfigMock.mockReturnValue({ data: { diasAtencao: 5, diasAtraso: 10 } })
})

describe('FilaRevisoesTable — os DOIS vazios distintos (E1 empty)', () => {
  it('toggle desligado → "Nenhum pedido de revisão pendente"', () => {
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(screen.getByText('Nenhum pedido de revisão pendente')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Quando um candidato solicitar a revisão de uma decisão, o pedido aparece aqui — do mais antigo para o mais recente.',
      ),
    ).toBeInTheDocument()
  })

  it('toggle ligado → "Nenhum pedido de revisão registrado" (texto DISTINTO)', () => {
    render(<FilaRevisoesTable incluirRespondidos />)
    expect(screen.getByText('Nenhum pedido de revisão registrado')).toBeInTheDocument()
    expect(
      screen.getByText('Nenhum candidato solicitou revisão de decisão até agora.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Nenhum pedido de revisão pendente')).not.toBeInTheDocument()
  })

  it('nunca usa o vazio genérico do AsyncState', () => {
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(screen.queryByText('Nada para mostrar ainda')).not.toBeInTheDocument()
  })
})

describe('FilaRevisoesTable — carregando e erro (E1 loading / error)', () => {
  it('carregando → esqueleto do AsyncState, sem tabela', () => {
    useFilaMock.mockReturnValue(filaState({ isLoading: true }))
    const { container } = render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy()
    expect(container.querySelector('table')).toBeNull()
  })

  it('erro → copy própria + botão de retry', () => {
    useFilaMock.mockReturnValue(filaState({ isError: true }))
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(
      screen.getByText('Não foi possível carregar a fila de revisões.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Verifique sua conexão e tente novamente.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })

  it('erro NUNCA ecoa a mensagem crua do transporte', () => {
    useFilaMock.mockReturnValue(
      filaState({
        isError: true,
        error: new Error('permission denied for table decisao_final'),
      }),
    )
    const { container } = render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(container.textContent).not.toContain('permission denied')
    expect(container.textContent).not.toContain('decisao_final')
  })
})

describe('FilaRevisoesTable — preenchida: 7 colunas na ordem da UI-SPEC', () => {
  beforeEach(() => {
    useFilaMock.mockReturnValue(filaState({ data: [linha()] }))
  })

  it('renderiza exatamente 7 cabeçalhos de coluna', () => {
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
  })

  it('os 6 cabeçalhos visíveis batem com a copy da UI-SPEC', () => {
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    for (const rotulo of [
      'Candidato',
      'Vaga',
      'Decisão original',
      'Quem decidiu',
      'Dias em espera',
      'Acompanhamento',
    ]) {
      expect(screen.getByText(rotulo)).toBeInTheDocument()
    }
  })

  it('o cabeçalho da coluna de ações é sr-only', () => {
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    const acoes = screen.getByText('Ações')
    expect(acoes.className).toContain('sr-only')
  })

  it('a ordem das linhas é a do servidor — a tabela não reordena', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({ candidatura_id: 'a', candidato_nome: 'Primeiro Antigo' }),
          linha({ candidatura_id: 'b', candidato_nome: 'Segundo Recente' }),
        ],
      }),
    )
    const { container } = render(<FilaRevisoesTable incluirRespondidos={false} />)
    const nomes = [...container.querySelectorAll('tbody tr')].map(
      (tr) => tr.querySelector('td')?.textContent,
    )
    expect(nomes).toEqual(['Primeiro Antigo', 'Segundo Recente'])
  })

  it('traduz "Decisão original" e cai no valor cru se desconhecido', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({ candidatura_id: '1', decisao: 'aprovado' }),
          linha({ candidatura_id: '2', decisao: 'rejeitado' }),
          linha({ candidatura_id: '3', decisao: 'em_espera' }),
          linha({ candidatura_id: '4', decisao: 'coisa_nova' }),
        ],
      }),
    )
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(screen.getByText('Aprovado')).toBeInTheDocument()
    expect(screen.getByText('Rejeitado')).toBeInTheDocument()
    expect(screen.getByText('Em espera')).toBeInTheDocument()
    expect(screen.getByText('coisa_nova')).toBeInTheDocument()
  })

  it('o tooltip obrigatório do cabeçalho "Acompanhamento" está no DOM, verbatim', () => {
    const { container } = render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(container.textContent).toContain(
      'Acompanhamento interno da equipe. O Art. 20 da LGPD não fixa prazo para a revisão — este limite é definido pela própria equipe e nunca é exibido ao candidato.',
    )
  })

  it('a ação da linha é um <button> com piso de 44px e é o único elemento accent', () => {
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    const acao = screen.getByRole('button', { name: 'Responder' })
    expect(acao.tagName).toBe('BUTTON')
    expect(acao.className).toContain('min-h-[44px]')
    expect(acao.className).toContain('text-accent')
  })

  it('sem `onResponder` (esta wave) o botão fica desabilitado', () => {
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(screen.getByRole('button', { name: 'Responder' })).toBeDisabled()
  })

  it('com `onResponder` o botão fica habilitado', () => {
    render(<FilaRevisoesTable incluirRespondidos={false} onResponder={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Responder' })).toBeEnabled()
  })
})

describe('FilaRevisoesTable — casos parciais nomeados (E1 partial)', () => {
  it('`decidido_por_nome` nulo → "Não identificado", e NENHUM UUID no DOM', () => {
    useFilaMock.mockReturnValue(
      filaState({ data: [linha({ decidido_por_nome: null })] }),
    )
    const { container } = render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(screen.getByText('Não identificado')).toBeInTheDocument()
    // Invariante 4: um identificador cru NUNCA é renderizado como identidade humana.
    expect(container.innerHTML).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i)
  })

  it('"Não identificado" NÃO é o travessão genérico das outras células', () => {
    useFilaMock.mockReturnValue(
      filaState({ data: [linha({ decidido_por_nome: null, vaga_titulo: null })] }),
    )
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(screen.getByText('Não identificado')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('linha respondida → veredito neutro, célula de espera neutra, SEM faixa colorida', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({
            revisao_respondida_em: '2026-07-27T12:00:00Z',
            revisao_veredito: 'mantida',
            respondida_por_nome: 'Bruno Admin',
          }),
        ],
      }),
    )
    const { container } = render(<FilaRevisoesTable incluirRespondidos />)
    expect(screen.getByText('Mantida')).toBeInTheDocument()
    expect(screen.getByText('Respondida em 7d')).toBeInTheDocument()
    // Nenhuma das três paletas de faixa aparece numa linha já fechada.
    expect(container.innerHTML).not.toContain('emerald')
    expect(container.innerHTML).not.toContain('yellow-500')
    expect(container.innerHTML).not.toContain('red-500')
  })

  it('linha respondida → meta "Respondida em {dd/mm/aaaa} por {nome}" e ação "Ver resposta"', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({
            revisao_respondida_em: '2026-07-27T12:00:00Z',
            revisao_veredito: 'revertida',
            respondida_por_nome: 'Bruno Admin',
          }),
        ],
      }),
    )
    render(<FilaRevisoesTable incluirRespondidos />)
    expect(screen.getByText('Respondida em 27/07/2026 por Bruno Admin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver resposta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument()
  })

  it('config de limiar ausente → faixa degenerada (contagem sem badge de faixa)', () => {
    useConfigMock.mockReturnValue({ data: null })
    useFilaMock.mockReturnValue(filaState({ data: [linha()] }))
    const { container } = render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(container.innerHTML).not.toContain('emerald')
    expect(container.innerHTML).not.toContain('yellow-500')
    expect(container.innerHTML).not.toContain('red-500')
  })

  it('linha pendente que o próprio decisor abriu → ação bloqueada com motivo visível', () => {
    useFilaMock.mockReturnValue(
      filaState({ data: [linha({ pode_responder: false })] }),
    )
    render(<FilaRevisoesTable incluirRespondidos={false} onResponder={vi.fn()} />)
    const acao = screen.getByRole('button', { name: 'Responder' })
    expect(acao).toBeDisabled()
    expect(acao).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Você registrou esta decisão.')).toBeInTheDocument()
  })
})

describe('FilaRevisoesTable — zero/um/muitos e texto longo', () => {
  it('uma linha só não recebe tratamento especial', () => {
    useFilaMock.mockReturnValue(filaState({ data: [linha()] }))
    const { container } = render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1)
  })

  it('nome e título longos são truncados com `title` completo', () => {
    const nome = 'Maria Aparecida dos Santos Oliveira Nogueira Albuquerque Filha'
    const vaga = 'Cirurgiã-Dentista Especialista em Odontopediatria — Unidade Central'
    useFilaMock.mockReturnValue(
      filaState({ data: [linha({ candidato_nome: nome, vaga_titulo: vaga })] }),
    )
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    const celulaNome = screen.getByText(nome)
    const celulaVaga = screen.getByText(vaga)
    expect(celulaNome).toHaveAttribute('title', nome)
    expect(celulaVaga).toHaveAttribute('title', vaga)
    expect(celulaNome.className).toContain('truncate')
    expect(celulaVaga.className).toContain('max-w-')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// BACKSTOP DE TRANSBORDO (E1 overflow) — os dois casos que a UI-SPEC exige.
// Sem paginação no v1: cabeçalho fixo + rolagem interna, e o aviso de corte SÓ no cap.
// ══════════════════════════════════════════════════════════════════════════════
function linhas(n: number): FilaRevisaoRow[] {
  return Array.from({ length: n }, (_, i) =>
    linha({ candidatura_id: `sintetica-${i}`, candidato_nome: `Candidato ${i}` }),
  )
}

describe('FilaRevisoesTable — backstop de transbordo', () => {
  it('60 linhas sintéticas → rolagem interna com cabeçalho fixo, SEM aviso de corte', () => {
    useFilaMock.mockReturnValue(filaState({ data: linhas(60) }))
    const { container } = render(<FilaRevisoesTable incluirRespondidos={false} />)

    expect(container.querySelectorAll('tbody tr')).toHaveLength(60)

    // O container de rolagem é o pai direto da tabela (o `data-slot` do primitivo),
    // porque `position: sticky` se resolve contra o ancestral que ROLA.
    const scroll = container.querySelector('[data-slot="table-container"]')?.parentElement
    expect(scroll?.className).toContain('max-h-[70vh]')
    expect(scroll?.className).toContain('overflow-y-auto')

    // Cabeçalho fixo: o sticky vai nas CÉLULAS do cabeçalho (com `border-collapse:
    // collapse` do preflight do Tailwind, sticky em <tr>/<thead> não gruda no Chrome).
    for (const th of screen.getAllByRole('columnheader')) {
      expect(th.className).toContain('sticky')
    }

    expect(
      screen.queryByText('Mostrando os 200 pedidos mais antigos.'),
    ).not.toBeInTheDocument()
  })

  it('199 linhas (um abaixo do cap) → ainda SEM aviso de corte', () => {
    useFilaMock.mockReturnValue(filaState({ data: linhas(199) }))
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(
      screen.queryByText('Mostrando os 200 pedidos mais antigos.'),
    ).not.toBeInTheDocument()
  })

  it('exatamente 200 linhas (o cap do servidor) → aviso de corte visível', () => {
    useFilaMock.mockReturnValue(filaState({ data: linhas(200) }))
    render(<FilaRevisoesTable incluirRespondidos={false} />)
    expect(
      screen.getByText('Mostrando os 200 pedidos mais antigos.'),
    ).toBeInTheDocument()
  })
})
