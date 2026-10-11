/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 52 / Plan 52-05 Task 2 (JORN-61 — E2 long-text (ii), backstop da UI-SPEC) — qual item
 * do menu do RH acende em cada rota.
 *
 * O defeito: dentro dos workspaces do candidato (`/rh/candidato/:id/{entrevista,redacao,decisao}`,
 * SINGULAR) o menu acendia «Dashboard». `startsWith('/rh/candidatos')` (plural) não casa o
 * singular, e a rota caía no fallback `'dashboard-rh'` (Achado F17 da pesquisa). O RH, no meio de
 * uma entrevista, via o menu dizer que estava no Dashboard.
 *
 * `getActivePageFromPath` passou a ser uma função pura exportada. A tabela abaixo cobre TODOS os
 * ramos que ela tinha antes do conserto (lidos do código), para provar que nenhum mudou, e os
 * três workspaces. O teste de render prova o mesmo pelo que o RH vê: o item realçado.
 *
 * @see src/components/RHSidebar.tsx (`getActivePageFromPath`)
 * @see src/components/__tests__/RHSidebarRevisoes.test.tsx (harness de render e a classe do realce)
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-05-PLAN.md (Task 2)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

vi.mock('@/features/revisao/hooks/useRevisoesPendentesCount', () => ({
  useRevisoesPendentesCount: () => ({ data: undefined, isLoading: false, isError: false }),
}))

vi.mock('@/features/pedidos-dados/hooks/usePedidosDadosPendentesCount', () => ({
  usePedidosDadosPendentesCount: () => ({ data: undefined, isLoading: false, isError: false }),
}))

import { RHSidebar, getActivePageFromPath } from '../RHSidebar'
import { useAuthStore } from '@/store/authStore'

/** A classe do item realçado (a mesma que `RHSidebarRevisoes.test.tsx` usa). */
const REALCE = 'bg-[#35BFAD]'

function ativa(pathname: string): string {
  // Asserção explícita antes da chamada: sem a função exportada, o teste falha dizendo
  // isso, e não com um TypeError genérico.
  expect(typeof getActivePageFromPath).toBe('function')
  return getActivePageFromPath(pathname)
}

function renderSidebar(rota: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <RHSidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useAuthStore.setState({
    user: { email: 'recrutador.rh@teste.com' } as never,
    candidato: null,
    role: 'rh',
    isAuthenticated: true,
    logout: vi.fn(() => Promise.resolve()) as never,
  })
})

describe('getActivePageFromPath — os workspaces do candidato acendem «Candidatos» (52-05 / JORN-61)', () => {
  it.each([
    '/rh/candidato/abc/entrevista',
    '/rh/candidato/abc/redacao',
    '/rh/candidato/abc/decisao',
  ])('%s ⇒ candidatos-rh', (rota) => {
    expect(ativa(rota)).toBe('candidatos-rh')
  })
})

describe('getActivePageFromPath — os ramos de antes continuam iguais', () => {
  it.each([
    ['/rh/dashboard', 'dashboard-rh'],
    ['/rh/candidatos', 'candidatos-rh'],
    ['/rh/candidatos/abc', 'candidatos-rh'],
    ['/rh/revisoes', 'revisoes-rh'],
    ['/rh/pedidos-dados', 'pedidos-dados-rh'],
    ['/rh/vagas', 'vagas-rh'],
    ['/rh/vagas/123/candidatos', 'vagas-rh'],
    ['/rh/relatorios', 'relatorios-rh'],
    ['/rh/suporte', 'suporte-rh'],
    ['/rh/configuracoes', 'configuracoes-rh'],
    ['/admin/retencao', 'retencao-admin'],
    ['/admin', 'admin'],
    ['/admin/ai-logs', 'admin'],
    // Fallback: rota sem item próprio continua no Dashboard. `/rh/candidato` sem
    // sub-segmento não é workspace (a rota real redireciona para o hub plural).
    ['/rh/perfil', 'dashboard-rh'],
    ['/rh/candidato', 'dashboard-rh'],
    ['/', 'dashboard-rh'],
  ])('%s ⇒ %s', (rota, esperado) => {
    expect(ativa(rota)).toBe(esperado)
  })
})

describe('RHSidebar — o item realçado dentro de um workspace (o que o RH vê)', () => {
  it('em /rh/candidato/abc/entrevista o item «Candidatos» acende e «Dashboard» não', () => {
    renderSidebar('/rh/candidato/abc/entrevista')
    expect(screen.getByRole('button', { name: /Candidatos/ }).className).toContain(REALCE)
    expect(screen.getByRole('button', { name: /Dashboard/ }).className).not.toContain(REALCE)
  })

  it('em /rh/dashboard continua acendendo «Dashboard»', () => {
    renderSidebar('/rh/dashboard')
    expect(screen.getByRole('button', { name: /Dashboard/ }).className).toContain(REALCE)
    expect(screen.getByRole('button', { name: /Candidatos/ }).className).not.toContain(REALCE)
  })
})
