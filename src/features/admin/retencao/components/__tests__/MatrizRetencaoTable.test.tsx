/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 43 / Plano 43-09 Task 1 (TDD RED) — `MatrizRetencaoTable` (RETEN-01).
 *
 * A tabela é a ÂNCORA VISUAL de `/admin/retencao` (43-UI-SPEC §Âncora visual primária):
 * é o objeto que responde à pergunta que traz o administrador aqui — "por quanto tempo
 * guardamos os dados de uma candidatura, por estado?".
 *
 * Cobre os cinco comportamentos do plano, que são os quatro estados do `AsyncState` mais
 * os DOIS parciais nomeados pela 43-UI-SPEC (§UI Considerations E6 · partial):
 *
 *  · populated — uma linha por estado, "24 meses" por extenso, Origem "Seed (teto
 *    consentido)" e Última alteração em TRAVESSÃO. O travessão não é enfeite: a matriz
 *    semeada tem `atualizado_em` preenchido pelo trigger, e exibi-lo diria que alguém
 *    alterou aquela janela numa data — uma data verdadeira contando uma história falsa.
 *  · partial 1 — estado presente no enum e AUSENTE da matriz aparece como linha com
 *    "— (não definida)". Omitir a linha em silêncio esconderia exatamente o caso que a
 *    Phase 46 precisa enxergar antes de armar qualquer `DELETE`.
 *  · partial 2 — linha alterada por usuário que não existe mais em `usuarios_rh` resolve
 *    para "Não identificado", NUNCA um UUID (invariante herdada da 42-UI-SPEC).
 *  · empty — copy PRÓPRIA ("A matriz de retenção ainda não foi semeada."), nunca o vazio
 *    genérico do `AsyncState`, e o corpo diz a consequência real.
 *  · error — copy própria + retry, e NUNCA a mensagem crua do transporte.
 *
 * O hook de leitura é mockado: esta suíte assere a TABELA, não a rede.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 *      (§`/admin/retencao` — copy verbatim; §UI Considerations E6)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const useMatrizMock = vi.fn()

vi.mock('../../hooks/useMatrizRetencao', () => ({
  useMatrizRetencao: (...args: unknown[]) => useMatrizMock(...args),
  retencaoKeys: {
    all: ['retencao'] as const,
    matriz: () => ['retencao', 'matriz'] as const,
    previa: () => ['retencao', 'previa'] as const,
  },
}))

import { MatrizRetencaoTable } from '../MatrizRetencaoTable'
import type { MatrizRetencaoRow } from '../../services/retencaoService'

/** O enum fechado `etapa_processo` — 8 valores, na ordem do funil M2. */
const ETAPAS = [
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
  'aprovado',
  'rejeitado',
] as const

/** Os rótulos pt-BR vivos (`triagemService.ETAPA_M2_LABELS`) — fonte única do projeto. */
const ROTULOS = [
  'Inscrição',
  'Triagem',
  'Avaliação Assíncrona',
  'Entrevista Online',
  'Entrevista Presencial',
  'Decisão Final',
  'Aprovado',
  'Rejeitado',
]

/** O UUID que NUNCA pode aparecer na tela — o teste do parcial 2. */
const UUID_ATOR = '99999999-9999-4999-8999-999999999999'

function linhaSeed(etapa: (typeof ETAPAS)[number]): MatrizRetencaoRow {
  return {
    etapa,
    janela_meses: 24,
    origem: 'seed',
    alterado_por_nome: null,
    atualizado_em: '2026-08-01T10:00:00Z',
  }
}

function matrizSemeada(): MatrizRetencaoRow[] {
  return ETAPAS.map(linhaSeed)
}

function estado(over: Record<string, unknown> = {}) {
  return {
    data: matrizSemeada(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
    ...over,
  }
}

beforeEach(() => {
  useMatrizMock.mockReset()
  useMatrizMock.mockReturnValue(estado())
})

describe('MatrizRetencaoTable — populated (RETEN-01)', () => {
  it('uma linha por estado, com "24 meses", Origem de seed e Última alteração em travessão', () => {
    render(<MatrizRetencaoTable />)

    for (const rotulo of ROTULOS) {
      expect(screen.getByText(rotulo)).toBeInTheDocument()
    }

    // Por extenso, nunca "24m": é número de política, não métrica.
    expect(screen.getAllByText('24 meses')).toHaveLength(8)
    expect(screen.getAllByText('Seed (teto consentido)')).toHaveLength(8)
    // Travessão, nunca uma data falsa (43-UI-SPEC §`/admin/retencao`).
    expect(screen.getAllByText('—')).toHaveLength(8)
  })

  it('os cabeçalhos das 4 colunas visíveis + o cabeçalho `sr-only` da coluna de ações', () => {
    render(<MatrizRetencaoTable />)

    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Janela de retenção' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Origem' })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Última alteração' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()
  })

  it('sem `onEditar` a ação existe mas fica DESABILITADA — nenhuma afordância falsa', () => {
    render(<MatrizRetencaoTable />)
    const acoes = screen.getAllByRole('button', { name: /Editar janela/ })
    expect(acoes).toHaveLength(8)
    for (const acao of acoes) expect(acao).toBeDisabled()
  })

  it('com `onEditar` a ação fica acionável e entrega a LINHA daquele estado', () => {
    const onEditar = vi.fn()
    render(<MatrizRetencaoTable onEditar={onEditar} />)

    const acoes = screen.getAllByRole('button', { name: /Editar janela/ })
    expect(acoes[0]).toBeEnabled()
    acoes[0].click()

    expect(onEditar).toHaveBeenCalledTimes(1)
    expect(onEditar.mock.calls[0][0]).toMatchObject({
      etapa: 'inscricao',
      janelaMeses: 24,
    })
  })
})

describe('MatrizRetencaoTable — os dois parciais nomeados (E6 partial)', () => {
  it('estado do enum AUSENTE da matriz vira linha "— (não definida)", nunca omissão', () => {
    // A matriz chega sem `rejeitado` — o caso que a Phase 46 tem de conseguir enxergar.
    const parcial = matrizSemeada().filter((l) => l.etapa !== 'rejeitado')
    useMatrizMock.mockReturnValue(estado({ data: parcial }))

    render(<MatrizRetencaoTable />)

    // A linha EXISTE.
    expect(screen.getByText('Rejeitado')).toBeInTheDocument()
    expect(screen.getByText('— (não definida)')).toBeInTheDocument()
    // E continuam sendo 8 linhas de corpo, não 7.
    expect(screen.getAllByRole('row')).toHaveLength(9) // 8 + cabeçalho
  })

  it('linha alterada por usuário que não existe mais mostra "Não identificado", nunca o UUID', () => {
    const comAtorRemovido = matrizSemeada().map((l) =>
      l.etapa === 'triagem'
        ? {
            ...l,
            janela_meses: 12,
            origem: 'admin',
            alterado_por_nome: null,
            atualizado_em: '2026-08-02T09:30:00Z',
          }
        : l,
    )
    useMatrizMock.mockReturnValue(estado({ data: comAtorRemovido }))

    const { container } = render(<MatrizRetencaoTable />)

    expect(screen.getByText('Alterado por Não identificado')).toBeInTheDocument()
    expect(screen.getByText('12 meses')).toBeInTheDocument()
    // Invariante herdada da 42-UI-SPEC: um UUID nunca é identidade humana na tela.
    expect(container.textContent).not.toContain(UUID_ATOR)
    expect(container.textContent).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )
  })

  it('linha alterada por usuário existente mostra o nome e a DATA da alteração', () => {
    const alterada = matrizSemeada().map((l) =>
      l.etapa === 'aprovado'
        ? {
            ...l,
            janela_meses: 18,
            origem: 'admin',
            alterado_por_nome: 'Carla Administradora',
            atualizado_em: '2026-08-02T09:30:00Z',
          }
        : l,
    )
    useMatrizMock.mockReturnValue(estado({ data: alterada }))

    render(<MatrizRetencaoTable />)

    expect(screen.getByText('Alterado por Carla Administradora')).toBeInTheDocument()
    expect(screen.getByText('02/08/2026')).toBeInTheDocument()
    // O seed continua sem data — só a linha alterada ganhou uma.
    expect(screen.getAllByText('—')).toHaveLength(7)
  })
})

describe('MatrizRetencaoTable — vazio e erro têm copy PRÓPRIA', () => {
  it('matriz vazia usa a copy do seed ausente, não o vazio genérico do AsyncState', () => {
    useMatrizMock.mockReturnValue(estado({ data: [] }))
    render(<MatrizRetencaoTable />)

    expect(
      screen.getByText('A matriz de retenção ainda não foi semeada.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Nenhuma janela de retenção está definida. Enquanto isso, nenhum prazo é aplicado a nenhum estado.',
      ),
    ).toBeInTheDocument()
    // O vazio genérico do primitivo NUNCA aparece aqui.
    expect(screen.queryByText('Nada para mostrar ainda')).not.toBeInTheDocument()
  })

  it('erro usa a copy própria + retry, e nunca ecoa a mensagem crua do transporte', () => {
    useMatrizMock.mockReturnValue(
      estado({
        data: undefined,
        isError: true,
        error: new Error('permission denied for table config_retencao_etapa'),
      }),
    )
    const { container } = render(<MatrizRetencaoTable />)

    expect(
      screen.getByText('Não foi possível carregar a matriz de retenção.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Verifique sua conexão e tente novamente.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument()
    expect(container.textContent).not.toContain('permission denied')
    expect(container.textContent).not.toContain('config_retencao_etapa')
  })

  it('carregando não mostra nem tabela nem vazio', () => {
    useMatrizMock.mockReturnValue(estado({ data: undefined, isLoading: true }))
    const { container } = render(<MatrizRetencaoTable />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.queryByText('A matriz de retenção ainda não foi semeada.'),
    ).not.toBeInTheDocument()
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  })
})
