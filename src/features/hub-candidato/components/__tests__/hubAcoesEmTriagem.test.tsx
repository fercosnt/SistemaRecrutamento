/// <reference types="@testing-library/jest-dom" />
/**
 * ⛔ POR QUE ESTE ARQUIVO EXISTE.
 *
 * Em 2026-08-26, num teste E2E em produção, o RH abriu um candidato em `triagem` e
 * NÃO TINHA botão nenhum: nem Avançar, nem Retroceder, nem Rejeitar. O funil não
 * avançava pela tela — na etapa em que TODO candidato entra.
 *
 * A causa era uma condição acoplada à coisa errada:
 *
 *   {rotaWorkspaceAtual && entradaAtual ? ( … bloco inteiro … ) : null}
 *
 * `rotaWorkspaceAtual` vem de `funilNavMap[etapa].rotaWorkspaceRH(id)`, e para
 * `triagem` isso é `null` DE PROPÓSITO: o próprio hub é o destino da triagem, não
 * há outra tela para onde ir (funilNavMap.ts:82). A rota nula é correta; o erro foi
 * usá-la como condição de exibição das AÇÕES, que não dependem de haver workspace.
 *
 * O defeito era invisível para os testes porque nenhum deles renderizava o hub numa
 * etapa sem workspace. Este arquivo fecha essa lacuna: se alguém voltar a acoplar as
 * ações à rota, `triagem` volta a ficar sem botões e estes casos falham.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const useEntrevistaContextoMock = vi.fn()
const navigateSpy = vi.fn()

vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: () => ({ id: 'cand-1' }), useNavigate: () => navigateSpy }
})
vi.mock('@/features/entrevista/hooks/useEntrevistaScorecard', () => ({
  useEntrevistaContexto: (...args: unknown[]) => useEntrevistaContextoMock(...args),
  useEntrevistaScorecard: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/avaliacao/hooks/useScorecardCandidato', () => ({
  useScorecardCandidato: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/triagem/hooks/useRedacaoRevisao', () => ({
  useRedacaoRevisao: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/decisao/hooks/useConsolidacao', () => ({
  useConsolidacao: () => ({ data: null, isLoading: false, isError: false }),
}))
vi.mock('@/features/vagas/hooks/useCandidaturas', () => ({
  useUpdateCandidaturaEtapa: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/triagem/hooks/useRejeitarCandidatura', () => ({
  useRejeitarCandidatura: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/hub-candidato/hooks/useAnaliseCandidato', () => ({
  useAnaliseCandidato: () => ({ data: null, isLoading: false, isError: false }),
}))
vi.mock('@/features/hub-candidato/hooks/useHistoricoCandidatura', () => ({
  useHistoricoCandidatura: () => ({ data: [], isLoading: false, isError: false }),
}))

import { HubCandidatoRH } from '../HubCandidatoRH'
import { funilNavMap } from '@/lib/navegacao/funilNavMap'

function montarEmEtapa(etapa: string) {
  // O contexto do hub e PLANO (etapa_atual / candidato_nome), nao aninhado.
  useEntrevistaContextoMock.mockReturnValue({
    data: {
      candidatura_id: 'cand-1',
      etapa_atual: etapa,
      candidato_nome: 'Fulano de Teste',
      vaga_titulo: 'Vaga de Teste',
    },
    isLoading: false,
    isError: false,
  })
  // Etapas COM workspace montam blocos que usam useQuery proprio — dai o provider.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <HubCandidatoRH />
    </QueryClientProvider>,
  )
}

describe('HubCandidatoRH — as ações não podem depender de haver workspace', () => {
  beforeEach(() => {
    useEntrevistaContextoMock.mockReset()
    navigateSpy.mockReset()
  })

  it('(a) `triagem` REALMENTE não tem workspace — é a premissa do defeito, não suposição', () => {
    expect(funilNavMap.triagem.rotaWorkspaceRH('cand-1')).toBeNull()
  })

  it('(b) em `triagem`, o RH VÊ o botão Avançar — era o defeito de 2026-08-26', () => {
    montarEmEtapa('triagem')
    expect(screen.getByRole('button', { name: /Avançar/i })).toBeInTheDocument()
  })

  it('(c) em `triagem`, Retroceder e Rejeitar também aparecem', () => {
    montarEmEtapa('triagem')
    expect(screen.getByRole('button', { name: /Retroceder/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rejeitar/i })).toBeInTheDocument()
  })

  it('(d) o bloco "Próximo passo" aparece em etapa sem workspace', () => {
    montarEmEtapa('triagem')
    expect(screen.getByText('Próximo passo')).toBeInTheDocument()
  })

  it('(e) o defeito atingia TRES etapas, nao so triagem', () => {
    // Medido em 2026-08-26: inscricao, triagem e avaliacao_assincrona nao tem
    // workspace RH proprio. Nas tres o bloco de acoes sumia por inteiro.
    for (const etapa of ['inscricao', 'triagem', 'avaliacao_assincrona'] as const) {
      expect(funilNavMap[etapa].rotaWorkspaceRH('cand-1')).toBeNull()
    }
  })

  it('(f) numa etapa COM workspace as ações continuam aparecendo (sem regressão)', () => {
    expect(funilNavMap.entrevista_online.rotaWorkspaceRH('cand-1')).not.toBeNull()
    montarEmEtapa('entrevista_online')
    expect(screen.getByRole('button', { name: /Avançar/i })).toBeInTheDocument()
  })

  it('(g) sem workspace NÃO se oferece o CTA de navegação — ele levaria a lugar nenhum', () => {
    montarEmEtapa('triagem')
    expect(screen.queryByRole('button', { name: funilNavMap.triagem.ctaRH })).toBeNull()
  })
})

describe('HubCandidatoRH — Retroceder só quando existe etapa anterior', () => {
  beforeEach(() => {
    useEntrevistaContextoMock.mockReset()
    navigateSpy.mockReset()
  })

  it('(h) em `aprovado` NÃO se oferece Retroceder — o diálogo abriria com select vazio', () => {
    // FUNNEL_ORDER (do diálogo) não contém as terminais: indexOf → -1 → destinos [].
    // Medido em 2026-08-26: o botão aparecia, o select vinha vazio, e o RH travava.
    montarEmEtapa('aprovado')
    expect(screen.queryByRole('button', { name: /Retroceder/i })).toBeNull()
  })

  it('(i) em `inscricao` também não — é a primeira etapa, não há anterior', () => {
    montarEmEtapa('inscricao')
    expect(screen.queryByRole('button', { name: /Retroceder/i })).toBeNull()
  })

  it('(j) em `triagem` Retroceder CONTINUA disponível (há `inscricao` atrás)', () => {
    montarEmEtapa('triagem')
    expect(screen.getByRole('button', { name: /Retroceder/i })).toBeInTheDocument()
  })
})
