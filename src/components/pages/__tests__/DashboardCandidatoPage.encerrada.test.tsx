/// <reference types="@testing-library/jest-dom" />
/**
 * Candidatura ENCERRADA não promete espera nem próximo passo.
 *
 * Medido em PROD (06/09/2026, E6 do guia): a candidata reprovada no knockout da
 * inscrição via, no MESMO cartão que dizia «Rejeitado», a linha «Inscrição recebida —
 * retorno da triagem em até 48 horas» e um rodapé «Próximo passo · Acompanhar
 * candidatura». As duas coisas derivam de `etapa_atual`, que no knockout permanece
 * 'inscricao' por desenho (migration 20260709000014: a etapa não muda para o trigger de
 * avanço não disparar). O cartão prometia um retorno que nunca viria.
 *
 * O critério é o STATUS. `finalizado` também encerra; `aprovado_proxima` não.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  candidaturasData: { data: [] as unknown[] },
  statusRaven: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigateMock }
})

vi.mock('@/features/vagas/hooks', () => ({
  useCandidaturas: () => ({ data: mocks.candidaturasData, isLoading: false, error: null }),
  useCandidaturasCount: () => ({
    total: mocks.candidaturasData.data.length,
    aguardando: 0,
    em_analise: 0,
    aprovadas: 0,
    rejeitadas: 1,
    finalizadas: 0,
  }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ logout: vi.fn(() => Promise.resolve()) }),
  useCandidato: () => ({ nome_completo: 'Claude Teste', email: 'claude@teste.com' }),
}))

// O rótulo de espera vem de config_sla_etapa; aqui devolvemos SEMPRE um texto para
// provar que quem o suprime é o status terminal, não a ausência de configuração.
vi.mock('@/features/timeline/hooks', () => ({
  useSlaEtapas: () => ({ isLoading: false, error: null, lookup: new Map([['inscricao', {}]]) }),
  rotuloDeEspera: () => 'Inscrição recebida — retorno da triagem em até 48 horas.',
}))

vi.mock('@/features/vagas/hooks/useRetirarCandidatura', () => ({
  useRetirarCandidatura: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

// 51-07 (JORN-43 · D-13) — o card passou a montar `RavenCandidatoCard`, que possui
// `useStatusRavenCandidato` (useQuery). Mockado pelo MESMO motivo e no MESMO idioma do
// `useRetirarCandidatura` acima: o mock é do HOOK, nunca do componente — o card real continua
// montando dentro do cartão, e é a montagem que estes testes vigiam.
// Aqui o hook diz SEMPRE «liberado e pendente»: quem suprime o card numa encerrada tem de ser o
// portão de encerrada do próprio card (e sem nem consultar — o hook não pode ser chamado).
vi.mock('@/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato', () => ({
  useStatusRavenCandidato: (id: string) => mocks.statusRaven(id),
}))

import { DashboardCandidatoPage } from '../DashboardCandidatoPage'

const base = {
  id: 'cand-ko',
  vaga_id: 'vaga-1',
  vaga: { titulo: 'Consultor(a) de Relacionamento' },
  // O knockout NÃO move a etapa — é exatamente o que produzia o defeito.
  etapa_atual: 'inscricao',
  created_at: '2026-09-06T00:00:00Z',
  data_decisao_final: null,
}

function renderCom(status: string, extra: Record<string, unknown> = {}) {
  mocks.candidaturasData = { data: [{ ...base, status, ...extra }] }
  return render(
    <MemoryRouter>
      <DashboardCandidatoPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.statusRaven.mockReturnValue({ data: { liberado: true, registrado: false }, error: null })
})

describe('cartão de candidatura encerrada', () => {
  it('rejeitada no knockout: sem estimativa de prazo e sem «Próximo passo»', () => {
    renderCom('rejeitado', {
      feedback_rejeicao:
        'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.',
    })

    expect(screen.queryByText(/retorno da triagem em até 48 horas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Próximo passo/i)).not.toBeInTheDocument()
    // O que a pessoa PRECISA ver continua lá.
    expect(screen.getByText(/não seguiremos com sua candidatura/i)).toBeInTheDocument()
  })

  it('finalizada: idem (o processo acabou)', () => {
    renderCom('finalizado')
    expect(screen.queryByText(/retorno da triagem/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Próximo passo/i)).not.toBeInTheDocument()
  })

  // 51-07 (JORN-43 · D-13): a liberação do Raven pode continuar vigente depois que a candidatura
  // acaba (medido: `2ce20fbf`, finalizada). O convite não pode aparecer, e nem se consulta.
  it.each(['rejeitado', 'finalizado'])(
    '%s com o Raven liberado e pendente: sem o card do Raciocínio lógico, e sem consultar',
    (status) => {
      renderCom(status)
      expect(screen.queryByTestId('raven-candidato-card')).not.toBeInTheDocument()
      expect(mocks.statusRaven).not.toHaveBeenCalled()
    },
  )

  it('em andamento (aguardando_resposta): a estimativa e o próximo passo CONTINUAM', () => {
    renderCom('aguardando_resposta')
    expect(screen.getByText(/retorno da triagem em até 48 horas/i)).toBeInTheDocument()
    expect(screen.getByText(/Próximo passo/i)).toBeInTheDocument()
    // 51-07: em andamento, com o Raven liberado e pendente, o convite aparece no cartão.
    expect(screen.getByTestId('raven-candidato-card')).toBeInTheDocument()
    expect(mocks.statusRaven).toHaveBeenCalledWith('cand-ko')
  })
})
