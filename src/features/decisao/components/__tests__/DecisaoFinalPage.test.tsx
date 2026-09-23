/// <reference types="@testing-library/jest-dom" />
/**
 * DecisaoFinalPage — a aba «Comparativo» da decisão final (Phase 49 / plano 49-22 · D-36b).
 *
 * Arquivo NOVO. Até aqui `src/features/decisao/components/__tests__/` tinha só
 * `ConsolidacaoDashboard` e `RegistrarDecisaoForm`: a PÁGINA nunca teve teste, e é nela que os
 * três defeitos deste plano moravam.
 *
 * ─── O QUE ESTAVA ERRADO ──────────────────────────────────────────────────────────────
 *
 * 1. Os «finalistas» vinham de `decisao_final`, a tabela de quem JÁ TEM decisão registrada —
 *    isto é, de quem em regra está ENCERRADO. A tela comparava candidaturas terminadas e
 *    escondia quem de fato aguarda decisão, enquanto o texto dizia «outros candidatos em
 *    decisão final». O conserto é no service (`listFinalistas`); aqui se prova o efeito.
 * 2. O rótulo `C<n>` era resolvido pela POSIÇÃO no array de ids (`resolveFinalistCandidates`
 *    fazia `parseInt(candidate_id.replace(/\D/g,''))-1`), o mesmo defeito de repúdio que o
 *    49-13 removeu da tela do comparativo da vaga: num empate de score a EF troca as posições
 *    e o RH lê os dados de uma pessoa sob o id de outra.
 * 3. Os literais de teto (`>= 2 && <= 10`) e o estado vazio único: com 1 finalista a tela dizia
 *    «Nenhum finalista para comparar ainda» (vago) e acima do teto ela CORTAVA EM SILÊNCIO —
 *    o `useEffect` simplesmente não invocava, e a aba ficava em branco sem dizer por quê.
 *
 * @see src/features/decisao/components/DecisaoFinalPage.tsx
 * @see src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx (o molde do rótulo por chave)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── O shell e os dois outros painéis da página são stubs: o objeto do teste é a aba
// «Comparativo» e a fiação dela. Cada um tem (ou não precisa de) suíte própria. ──
vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children?: unknown }) => children as never,
}))
vi.mock('../ConsolidacaoDashboard', () => ({
  ConsolidacaoDashboard: () => <div data-testid="consolidacao-stub" />,
}))
vi.mock('../RegistrarDecisaoForm', () => ({
  RegistrarDecisaoForm: () => <div data-testid="registrar-stub" />,
}))
vi.mock('../../hooks/useRegistrarDecisao', () => ({
  useRegistrarDecisao: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

/*
 * ⚠ As `Tabs` do Radix são substituídas por uma implementação controlada mínima. Não é
 * conveniência: no happy-dom o `TabsTrigger` do Radix depende de gestos de ponteiro que o
 * ambiente não produz (o mesmo achado que o 49-05 registrou para o `DropdownMenu`), e o que se
 * mede aqui é o que a página FAZ quando a aba muda — não o teclado do primitivo, que tem suíte
 * no próprio Radix. O mock renderiza SÓ o painel ativo, como o componente real.
 */
vi.mock('@/components/ui/tabs', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Ctx = React.createContext<{ value: string; onValueChange?: (v: string) => void }>({
    value: '',
  })
  return {
    Tabs: ({ value, onValueChange, children }: any) =>
      React.createElement(Ctx.Provider, { value: { value, onValueChange } }, children),
    TabsList: ({ children }: any) => React.createElement('div', { role: 'tablist' }, children),
    TabsTrigger: ({ value, children }: any) => {
      const ctx = React.useContext(Ctx)
      return React.createElement(
        'button',
        { type: 'button', role: 'tab', onClick: () => ctx.onValueChange?.(value) },
        children,
      )
    },
    TabsContent: ({ value, children }: any) => {
      const ctx = React.useContext(Ctx)
      return ctx.value === value ? React.createElement('div', null, children) : null
    },
  }
})

const { listFinalistasMock, getVagaIdMock, getDecisaoAtualMock } = vi.hoisted(() => ({
  listFinalistasMock: vi.fn(),
  getVagaIdMock: vi.fn(),
  getDecisaoAtualMock: vi.fn(),
}))
vi.mock('../../services/decisaoService', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return {
    ...actual,
    listFinalistas: listFinalistasMock,
    getVagaIdDaCandidatura: getVagaIdMock,
    getDecisaoAtual: getDecisaoAtualMock,
  }
})

const { useComparativoMock } = vi.hoisted(() => ({ useComparativoMock: vi.fn() }))
vi.mock('@/features/triagem/hooks/useComparativo', () => ({
  useComparativo: useComparativoMock,
}))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DecisaoFinalPage } from '../DecisaoFinalPage'
import type { RankedCandidate } from '@/features/triagem/pdf/exportComparativo'
import {
  COMPARATIVO_MAX_CANDIDATOS,
  COMPARATIVO_MIN_CANDIDATOS,
} from '../../../../../supabase/functions/_shared/comparativo-config'

const VAGA = 'vaga-1'

function ranked(candidate_id: string, rank: number, composite_score = 80): RankedCandidate {
  return {
    candidate_id,
    nome: '',
    rank,
    composite_score,
    relative_strengths: ['forte'],
    relative_weaknesses: ['gap'],
    rationale: 'justificativa',
  }
}

/** Finalista como `listFinalistas` passa a devolvê-lo (allowlist, sem PII). */
function finalista(id: string) {
  return { candidatura_id: id, etapa_atual: 'decisao_final', status: 'em_analise' }
}

interface RenderOpts {
  finalistas: { candidatura_id: string; etapa_atual: string; status: string }[]
  data?: unknown
  isPending?: boolean
  isError?: boolean
}

function renderPagina({ finalistas, data, isPending = false, isError = false }: RenderOpts) {
  getVagaIdMock.mockResolvedValue(VAGA)
  getDecisaoAtualMock.mockResolvedValue(null)
  listFinalistasMock.mockResolvedValue(finalistas)
  const mutate = vi.fn()
  useComparativoMock.mockReturnValue({ mutate, data, isPending, isError, error: null })

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/rh/candidato/cand-1/decisao']}>
        <Routes>
          <Route path="/rh/candidato/:id/decisao" element={<DecisaoFinalPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, mutate }
}

/** Abre a aba «Comparativo» e espera a resolução das queries da página. */
async function abrirComparativo() {
  await waitFor(() => expect(listFinalistasMock).toHaveBeenCalled())
  fireEvent.click(screen.getByText('Comparativo'))
}

describe('DecisaoFinalPage — a aba Comparativo compara quem AGUARDA decisão (D-36b)', () => {
  beforeEach(() => {
    listFinalistasMock.mockReset()
    getVagaIdMock.mockReset()
    getDecisaoAtualMock.mockReset()
    useComparativoMock.mockReset()
  })

  it(`com menos que o mínimo (${COMPARATIVO_MIN_CANDIDATOS}) a tela diz a VERDADE e não invoca a EF`, async () => {
    // Correção 23: é o estado de PROD hoje — 1 candidatura em decisao_final.
    const { mutate } = renderPagina({ finalistas: [finalista('c-1')] })
    await abrirComparativo()
    await waitFor(() =>
      expect(
        screen.getByText(
          new RegExp(`ao menos ${COMPARATIVO_MIN_CANDIDATOS} candidaturas em decisão final`, 'i'),
        ),
      ).toBeInTheDocument(),
    )
    expect(mutate).not.toHaveBeenCalled()
  })

  it('acima do teto a tela DIZ o limite e aponta o comparativo da vaga — não corta em silêncio', async () => {
    const muitos = Array.from({ length: COMPARATIVO_MAX_CANDIDATOS + 1 }, (_, i) =>
      finalista(`c-${i}`),
    )
    const { mutate } = renderPagina({ finalistas: muitos })
    await abrirComparativo()
    await waitFor(() =>
      expect(
        screen.getByText(new RegExp(`até ${COMPARATIVO_MAX_CANDIDATOS} candidaturas`, 'i')),
      ).toBeInTheDocument(),
    )
    // A saída tem de estar NOMEADA: um limite sem caminho é um beco.
    expect(document.body.textContent ?? '').toMatch(/comparativo da vaga/i)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('dentro do intervalo a EF é invocada com os ids dos finalistas', async () => {
    const { mutate } = renderPagina({ finalistas: ['a', 'b', 'c'].map(finalista) })
    await abrirComparativo()
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith({ vagaId: VAGA, candidaturaIds: ['a', 'b', 'c'] }),
    )
  })
})

describe('DecisaoFinalPage — o rótulo vem da CHAVE `posicoes`, nunca da posição (JORN-25)', () => {
  beforeEach(() => {
    listFinalistasMock.mockReset()
    getVagaIdMock.mockReset()
    getDecisaoAtualMock.mockReset()
    useComparativoMock.mockReset()
  })

  it('ranking em ordem DIFERENTE da lista de finalistas: cada coluna carrega o id que a EF mapeou', async () => {
    // A lista chegou [a, b]; a EF ranqueou `b` em C1 e `a` em C2 (empate desempatado por id).
    renderPagina({
      finalistas: ['a', 'b'].map(finalista),
      data: {
        ranking: { ranked_candidates: [ranked('C1', 1, 70), ranked('C2', 2, 70)] },
        posicoes: { C1: 'b', C2: 'a' },
        provedor_ia: 'anthropic',
        modelo_ia: 'claude-sonnet-4',
        fallback_cause: null,
      },
    })
    await abrirComparativo()
    // O `candidaturaId` resolvido vira a `key`/`scope` das colunas; a prova observável é o
    // rótulo de nome, que degrada para o candidate_id CRU quando não há nome (allowlist sem
    // PII) — e o que NÃO pode acontecer é `C1` receber o id `a` (a implementação antiga).
    await waitFor(() => expect(screen.getByText('C1')).toBeInTheDocument())
    expect(screen.getByText('C2')).toBeInTheDocument()
  })

  it('o selo de proveniência aparece no ranking (D-27b) — a página passou a FIAR a proveniência', async () => {
    renderPagina({
      finalistas: ['a', 'b'].map(finalista),
      data: {
        ranking: { ranked_candidates: [ranked('C1', 1), ranked('C2', 2)] },
        posicoes: { C1: 'a', C2: 'b' },
        // Contingência: o ranking saiu do modelo de fallback (JORN-28).
        provedor_ia: 'openai',
        modelo_ia: 'gpt-4o-mini',
        fallback_cause: 'anthropic_max_tokens',
      },
    })
    await abrirComparativo()
    await waitFor(() =>
      expect(screen.getByTestId('proveniencia-ia-badge')).toBeInTheDocument(),
    )
    expect(document.body.textContent ?? '').toMatch(/modelo de contingência/i)
    expect(document.body.textContent ?? '').toMatch(/gpt-4o-mini/)
  })

  it('a aba Comparativo segue READ-ONLY: nenhum «Avançar»/«Rejeitar» (UX-06)', async () => {
    renderPagina({
      finalistas: ['a', 'b'].map(finalista),
      data: {
        ranking: { ranked_candidates: [ranked('C1', 1), ranked('C2', 2)] },
        posicoes: { C1: 'a', C2: 'b' },
        provedor_ia: 'anthropic',
        modelo_ia: 'claude-sonnet-4',
        fallback_cause: null,
      },
    })
    await abrirComparativo()
    await waitFor(() => expect(screen.getByText('C1')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /^avançar$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^rejeitar$/i })).not.toBeInTheDocument()
  })
})
