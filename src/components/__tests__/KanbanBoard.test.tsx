/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 25 / Plan 25-02 Task 2 — KanbanBoard rewire regression net (FUNIL-03/06, UX-03).
 *
 * The board was drifted onto the dead M1 enum (bigfive/disc/raven/cultura columns) and
 * the raw auto-advance write-path. This suite pins the corrected contract:
 *  - the 6 REAL working stages render as columns, labels === triagemService.ETAPA_M2_LABELS
 *    (single source — no hardcoded 2nd copy) and in funnel order (FUNIL-03);
 *  - NO dead M1 column (Big Five / DISC / Raven / Cultura) renders (FUNIL-06);
 *  - terminals (aprovado/rejeitado) are NOT drop columns — exactly 6 columns exist —
 *    and a terminal-state candidatura shows a terminal pill on its card (UI-SPEC §1);
 *  - "Ver Perfil" forwards candidatura.id (NOT candidato.id) so the hub route resolves
 *    the candidaturaId it expects (UX-03);
 *  - a drop routes through the M2 audited mutation (updateCandidaturaEtapa via
 *    useUpdateCandidaturaEtapa), never the raw useUpdateCandidaturaStatus.
 *
 * @see .planning/phases/25-corre-o-do-funil-lado-rh-enums-colunas-contratos/25-UI-SPEC.md (§1)
 * @see src/features/triagem/services/triagemService.ts (ETAPA_M2_LABELS / updateCandidaturaEtapa)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the candidaturas hooks module: the rewired board consumes
// useUpdateCandidaturaEtapa (the M2 audited mutation); we also stub the legacy
// useUpdateCandidaturaStatus so the module contract is complete either way.
const mutateEtapa = vi.fn()
const mutateStatus = vi.fn()
vi.mock('@/features/vagas/hooks/useCandidaturas', () => ({
  useUpdateCandidaturaEtapa: () => ({ mutate: mutateEtapa, isPending: false }),
  useUpdateCandidaturaStatus: () => ({ mutate: mutateStatus, isPending: false }),
}))

// ── 49-05 · Radix DropdownMenu → itens sempre renderizados ────────────────────────────────
// Sem isso o conteúdo do menu só existe no DOM depois de um gesto de ponteiro que o happy-dom
// não produz com `fireEvent.click` (medido: o clique no gatilho não abre o menu). Mesma forma
// já usada em `UsuariosRhTable.test.tsx` / `GestaoUsuariosPage.test.tsx`.
vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Frag = ({ children }: any) => React.createElement(React.Fragment, null, children)
  return {
    DropdownMenu: Frag,
    DropdownMenuTrigger: Frag, // asChild → renderiza o próprio <button> do card
    DropdownMenuContent: ({ children }: any) => React.createElement('div', null, children),
    DropdownMenuItem: ({ children, onClick, onSelect, className }: any) =>
      React.createElement(
        'button',
        {
          role: 'menuitem',
          className,
          onClick: onClick ?? (() => onSelect?.({ preventDefault() {} })),
        },
        children,
      ),
  }
})

// ── 49-05 · os dois diálogos compartilhados → só o `trigger` ──────────────────────────────
// Com os itens do menu sempre no DOM (acima), estes dois passariam a MONTAR de verdade — e
// ambos chamam hooks do TanStack Query (`useRejeitarCandidatura`, `useUpdateCandidaturaEtapa`)
// que exigem um QueryClientProvider que esta suíte não instala de propósito. O que se testa
// aqui é o roteamento do card, não o conteúdo dos diálogos (que têm suíte própria).
vi.mock('@/features/triagem/components/RejeitarCandidaturaDialog', () => ({
  RejeitarCandidaturaDialog: ({ trigger }: any) => trigger ?? null,
}))
vi.mock('@/features/triagem/components/RetrocederCandidaturaDialog', () => ({
  RetrocederCandidaturaDialog: ({ trigger }: any) => trigger ?? null,
  FUNNEL_ORDER: [
    'inscricao',
    'triagem',
    'avaliacao_assincrona',
    'entrevista_online',
    'entrevista_presencial',
    'decisao_final',
  ],
}))

import { KanbanBoard } from '../KanbanBoard'
import { ETAPA_M2_LABELS } from '@/features/triagem/services/triagemService'

type Row = {
  id: string
  candidato: { id: string; nome_completo: string; email?: string; celular?: string }
  vaga: { titulo: string }
  etapa_atual: string
  status: string
  score_geral: number | null
  /** 49-05 / D-34: retirada a pedido NÃO é encerrada pelo predicado canônico. */
  encerrada_a_pedido_em?: string | null
}

function makeRow(over: Partial<Row> & { id: string }): Row {
  return {
    candidato: { id: `pessoa-${over.id}`, nome_completo: `Candidato ${over.id}` },
    vaga: { titulo: 'Dentista' },
    etapa_atual: 'triagem',
    status: 'em_analise',
    score_geral: 70,
    ...over,
  }
}

function renderBoard(rows: Row[], onViewPerfil = vi.fn()) {
  render(
    <KanbanBoard
      candidaturas={rows as never}
      onViewPerfil={onViewPerfil}
    />,
  )
  return { onViewPerfil }
}

/** Fires the native HTML5 drag sequence react-dnd's HTML5Backend listens to. */
function dragCardToColumn(card: HTMLElement, column: HTMLElement) {
  const data: Record<string, string> = {}
  const dataTransfer = {
    data,
    setData(k: string, v: string) {
      data[k] = v
    },
    getData(k: string) {
      return data[k] ?? ''
    },
    setDragImage() {},
    dropEffect: '',
    effectAllowed: '',
    types: [] as string[],
    items: [] as unknown[],
  }
  fireEvent.dragStart(card, { dataTransfer })
  fireEvent.dragEnter(column, { dataTransfer })
  fireEvent.dragOver(column, { dataTransfer })
  fireEvent.drop(column, { dataTransfer })
  fireEvent.dragEnd(card, { dataTransfer })
}

describe('KanbanBoard — 6 real stages, terminals as pills, M2 drag (FUNIL-03/06, UX-03)', () => {
  beforeEach(() => {
    mutateEtapa.mockReset()
    mutateStatus.mockReset()
  })

  const WORKING_STAGES = [
    'inscricao',
    'triagem',
    'avaliacao_assincrona',
    'entrevista_online',
    'entrevista_presencial',
    'decisao_final',
  ] as const

  it('renders exactly the 6 real working stages, labels from ETAPA_M2_LABELS', () => {
    renderBoard([makeRow({ id: 'a' })])
    for (const stage of WORKING_STAGES) {
      expect(screen.getByText(ETAPA_M2_LABELS[stage])).toBeInTheDocument()
    }
    // Exactly 6 drop columns — terminals are NOT columns.
    expect(screen.getAllByTestId(/^kanban-column-/)).toHaveLength(6)
  })

  it('renders NO dead M1 column (Big Five / DISC / Raven / Cultura)', () => {
    renderBoard([makeRow({ id: 'a' })])
    expect(screen.queryByText('Big Five')).toBeNull()
    expect(screen.queryByText('DISC')).toBeNull()
    expect(screen.queryByText('Raven (QI)')).toBeNull()
    expect(screen.queryByText('Cultura')).toBeNull()
  })

  it('shows a red "Rejeitado" terminal pill on a rejected card (no Rejeitado column)', () => {
    renderBoard([makeRow({ id: 'rej', etapa_atual: 'triagem', status: 'rejeitado' })])
    const pill = screen.getByTestId('terminal-pill-rej')
    expect(pill).toHaveTextContent('Rejeitado')
    // Still exactly 6 columns — no terminal drop column was introduced.
    expect(screen.getAllByTestId(/^kanban-column-/)).toHaveLength(6)
  })

  it('shows a green "Aprovado" terminal pill for a terminal-etapa candidatura', () => {
    renderBoard([makeRow({ id: 'apr', etapa_atual: 'aprovado', status: 'finalizado' })])
    const pill = screen.getByTestId('terminal-pill-apr')
    expect(pill).toHaveTextContent('Aprovado')
  })

  it('"Ver Perfil" forwards candidatura.id (not candidato.id) — UX-03', () => {
    const onViewPerfil = vi.fn()
    // candidatura.id !== candidato.id so the assertion is meaningful.
    renderBoard(
      [makeRow({ id: 'cand-1', candidato: { id: 'pessoa-XYZ', nome_completo: 'Ana' } })],
      onViewPerfil,
    )
    fireEvent.click(screen.getByText('Ver Perfil'))
    expect(onViewPerfil).toHaveBeenCalledWith('cand-1')
    expect(onViewPerfil).not.toHaveBeenCalledWith('pessoa-XYZ')
  })

  it('a drop onto a working column calls the M2 mutation with (candidaturaId, targetEtapa)', () => {
    renderBoard([makeRow({ id: 'cand-1', etapa_atual: 'triagem' })])
    const card = screen.getByTestId('kanban-card-cand-1')
    const targetColumn = screen.getByTestId('kanban-column-avaliacao_assincrona')
    dragCardToColumn(card, targetColumn)
    expect(mutateEtapa).toHaveBeenCalledTimes(1)
    expect(mutateEtapa).toHaveBeenCalledWith(
      expect.objectContaining({ candidaturaId: 'cand-1', novaEtapa: 'avaliacao_assincrona' }),
    )
    // The raw auto-advance status path is NOT used for an etapa move.
    expect(mutateStatus).not.toHaveBeenCalled()
  })

  it('LOW-01: a terminal (rejeitado) card is NOT draggable — the drag is refused, no mutation', () => {
    // A rejected candidatura is anchored in decisao_final with a pill; dragging it to a
    // working column would trigger an always-failing avancar_etapa (a backward move with
    // no etapa_justificativa). canDrag:false makes react-dnd refuse to begin the drag, so
    // the card never enters the dragging state and no etapa mutation is ever attempted.
    renderBoard([makeRow({ id: 'rej', etapa_atual: 'triagem', status: 'rejeitado' })])
    const card = screen.getByTestId('kanban-card-rej')
    const targetColumn = screen.getByTestId('kanban-column-avaliacao_assincrona')

    // Because canDrag returns false, beginDrag is refused; the manually-fired HTML5 drop
    // then hovers with no active drag, which react-dnd guards with an invariant. Catching
    // it here is the assertion: had the card been draggable, the drop would have completed
    // and called the mutation instead of throwing.
    let refusedDrag = false
    try {
      dragCardToColumn(card, targetColumn)
    } catch {
      refusedDrag = true
    }
    // The card never advertised the drag affordance either.
    expect(card).not.toHaveClass('opacity-50')
    expect(refusedDrag).toBe(true)
    expect(mutateEtapa).not.toHaveBeenCalled()
    expect(mutateStatus).not.toHaveBeenCalled()
  })
})

// ── 49-05 / JORN-33 — candidatura encerrada não é arrastável e não tem menu de ações ───────
//
// `getTerminalBadge` reconhecia só `etapa_atual` terminal e `status='rejeitado'`. O terceiro
// estado terminal — `status='finalizado'` numa etapa de TRABALHO — devolvia `null`, e como
// `!terminalBadge` libera tanto o `canDrag` quanto o menu Avançar/Retroceder/Rejeitar, uma
// candidatura já encerrada continuava empurrável para a frente. Medido em PROD em 2026-09-22:
// 3 linhas nesse estado (`triagem/finalizado`, `entrevista_online/finalizado`,
// `decisao_final/finalizado`).
//
// O critério passou a ser o predicado canônico `candidaturaEncerrada(etapa, status)` (D-21) —
// o mesmo do banco, do hub e da EF de notificação. Retirada a pedido fica FORA por desenho
// (D-34 / Invariante 9 da 45-UI-SPEC: ela continua visível E operável pelo RH).
describe('KanbanBoard — encerrada pelo predicado canônico (JORN-33 / D-21)', () => {
  beforeEach(() => {
    mutateEtapa.mockReset()
    mutateStatus.mockReset()
  })

  it('card `finalizado` em etapa de trabalho ganha o selo «Encerrada»', () => {
    renderBoard([makeRow({ id: 'fin', etapa_atual: 'triagem', status: 'finalizado' })])
    const selo = screen.getByTestId('kanban-selo-encerrada')
    expect(selo).toHaveTextContent('Encerrada')
    expect(selo).toHaveAttribute('data-candidatura-id', 'fin')
    // Cor neutra: «encerrada» não afirma desfecho bom nem ruim.
    expect(selo.className).not.toMatch(/text-(green|red)-/)
  })

  it('card encerrado NÃO expõe o menu de ações (sem Avançar/Retroceder/Rejeitar)', () => {
    renderBoard([makeRow({ id: 'fin', etapa_atual: 'triagem', status: 'finalizado' })])
    expect(screen.queryByRole('button', { name: /ações do candidato/i })).toBeNull()
    // "Ver Perfil" continua — ler o histórico de quem acabou é leitura, não ação de funil.
    expect(screen.getByText('Ver Perfil')).toBeInTheDocument()
  })

  it('card encerrado NÃO é arrastável — o drag é recusado, nenhuma mutação sai', () => {
    renderBoard([makeRow({ id: 'fin', etapa_atual: 'triagem', status: 'finalizado' })])
    const card = screen.getByTestId('kanban-card-fin')
    const targetColumn = screen.getByTestId('kanban-column-avaliacao_assincrona')

    // Mesma mecânica do LOW-01 acima: `canDrag:false` faz o react-dnd recusar o beginDrag, e
    // o drop manual sem drag ativo cai numa invariant. Se o card FOSSE arrastável, o drop
    // completaria e chamaria a mutação — é isso que a asserção separa.
    let refusedDrag = false
    try {
      dragCardToColumn(card, targetColumn)
    } catch {
      refusedDrag = true
    }
    expect(refusedDrag).toBe(true)
    expect(card).not.toHaveClass('opacity-50')
    expect(mutateEtapa).not.toHaveBeenCalled()
    expect(mutateStatus).not.toHaveBeenCalled()
  })

  it('retirada a pedido NÃO é encerrada: sem selo, com menu, arrastável (D-34)', () => {
    renderBoard([
      makeRow({
        id: 'ret',
        etapa_atual: 'triagem',
        status: 'em_analise',
        encerrada_a_pedido_em: '2026-09-01T10:00:00Z',
      }),
    ])
    expect(screen.queryByTestId('kanban-selo-encerrada')).toBeNull()
    expect(screen.queryByTestId('terminal-pill-ret')).toBeNull()
    expect(screen.getByRole('button', { name: /ações do candidato/i })).toBeInTheDocument()

    // E o arraste funciona — a candidatura retirada segue operável pelo RH.
    const card = screen.getByTestId('kanban-card-ret')
    dragCardToColumn(card, screen.getByTestId('kanban-column-avaliacao_assincrona'))
    expect(mutateEtapa).toHaveBeenCalledWith(
      expect.objectContaining({ candidaturaId: 'ret', novaEtapa: 'avaliacao_assincrona' }),
    )
  })

  it('os selos Aprovado e Rejeitado de hoje continuam — o ramo novo vem DEPOIS deles', () => {
    // `aprovado/finalizado` casa com o predicado canônico também; o ramo específico ganha,
    // porque «Aprovado» diz mais ao RH que «Encerrada».
    renderBoard([makeRow({ id: 'apr', etapa_atual: 'aprovado', status: 'finalizado' })])
    expect(screen.getByTestId('terminal-pill-apr')).toHaveTextContent('Aprovado')
    expect(screen.queryByTestId('kanban-selo-encerrada')).toBeNull()
  })

  it('`rejeitado` em etapa de trabalho (knockout) segue como «Rejeitado», não «Encerrada»', () => {
    renderBoard([makeRow({ id: 'ko', etapa_atual: 'inscricao', status: 'rejeitado' })])
    expect(screen.getByTestId('terminal-pill-ko')).toHaveTextContent('Rejeitado')
    expect(screen.queryByTestId('kanban-selo-encerrada')).toBeNull()
  })
})

// ── 49-05 / D-36 — «Avançar» leva à próxima etapa REAL, pela fonte única ───────────────────
describe('KanbanBoard — «Avançar» usa proximaEtapaDeTrabalho (D-36)', () => {
  beforeEach(() => {
    mutateEtapa.mockReset()
    mutateStatus.mockReset()
  })

  it('em `triagem`, «Avançar» move para `avaliacao_assincrona`', () => {
    renderBoard([makeRow({ id: 'av', etapa_atual: 'triagem' })])
    fireEvent.click(screen.getByRole('menuitem', { name: /avançar/i }))
    expect(mutateEtapa).toHaveBeenCalledWith(
      expect.objectContaining({ candidaturaId: 'av', novaEtapa: 'avaliacao_assincrona' }),
    )
  })

  it('em `entrevista_presencial`, «Avançar» move para `decisao_final`', () => {
    // O caso que a cópia local do comparativo errava (D-36): ele gravaria
    // `avaliacao_assincrona`, jogando o candidato TRÊS etapas para trás.
    renderBoard([makeRow({ id: 'ep', etapa_atual: 'entrevista_presencial' })])
    fireEvent.click(screen.getByRole('menuitem', { name: /avançar/i }))
    expect(mutateEtapa).toHaveBeenCalledWith(
      expect.objectContaining({ candidaturaId: 'ep', novaEtapa: 'decisao_final' }),
    )
  })

  it('em `decisao_final` não há «Avançar» — depois dela há decisão, não etapa', () => {
    renderBoard([makeRow({ id: 'df', etapa_atual: 'decisao_final' })])
    expect(screen.queryByRole('menuitem', { name: /avançar/i })).toBeNull()
    // O menu existe (Retroceder/Rejeitar continuam) — só o Avançar não.
    expect(screen.getByRole('menuitem', { name: /retroceder/i })).toBeInTheDocument()
  })
})
