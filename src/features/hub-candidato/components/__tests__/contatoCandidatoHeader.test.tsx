/// <reference types="@testing-library/jest-dom" />
/**
 * ⛔ 52-23 / JORN-53 (G-51-OP1, D-12..D-16, D-40) — o contato do candidato no cabeçalho do hub.
 *
 * O operador pediu «e-mail e telefone para entrar em contato fácil, com um botão de enviar e-mail
 * e … chamar no WhatsApp». O contrato medido aqui:
 *  - o contato sai SÓ de `contato` da EF `ler-cadastro-candidato-rh` (pelo `useCadastroCandidatoRh`
 *    do 52-09 — a leitura que deixa linha de log); do `cadastro` o cabeçalho lê só o nome;
 *  - registro fictício/anonimizado (`contato: null`, mesmo com celular no `cadastro`) → «Sem
 *    contato disponível.», sem `mailto:`, sem `wa.me`, sem causa (Invariante 4, ROADMAP SC2);
 *  - o componente está montado no cabeçalho do `HubCandidatoRH`, fora das abas (D-12).
 *
 * O módulo é carregado por `import()` com `catch`: no RED ele ainda não existe, e a falha tem de
 * ser de ASSERÇÃO (componente ausente), não de carga do arquivo.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type {
  CadastroCandidatoRh,
  DadosCadastroRh,
} from '@/features/hub-candidato/services/cadastroCandidatoRhService'
import { CAMPOS_CADASTRO_RH } from '@/features/hub-candidato/services/cadastroCandidatoRhService'

const useCadastroCandidatoRhMock = vi.fn()
const useEntrevistaContextoMock = vi.fn()

// Sem `.env.local` (worktree da prova de mordida, CI) o client real lança ao carregar.
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))
vi.mock('@/features/hub-candidato/hooks/useCadastroCandidatoRh', () => ({
  useCadastroCandidatoRh: (...args: unknown[]) => useCadastroCandidatoRhMock(...args),
  cadastroRhKeys: {
    all: ['hub-candidato', 'cadastro'],
    porCandidatura: (id: string) => ['hub-candidato', 'cadastro', id],
  },
}))

// Harness do hub (molde `hubVerRespostas.test.tsx`) — só para provar a montagem no cabeçalho.
vi.mock('@/components/RHLayout', () => ({
  RHLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: () => ({ id: 'cand-1' }), useNavigate: () => vi.fn() }
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
vi.mock('@/features/decisao/hooks/useConsolidacao', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/decisao/hooks/useConsolidacao')>()
  return { ...actual, useConsolidacao: () => ({ data: null, isLoading: false, isError: false }) }
})
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
vi.mock('../CvButton', () => ({ CvButton: () => null }))
vi.mock('@/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock', () => ({
  LiberacaoCognitivoBlock: () => null,
}))
vi.mock('@/features/agendamento/components/AgendamentoBlock', () => ({
  AgendamentoBlock: () => null,
}))
vi.mock('../AvaliacoesRespondidasBloco', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../AvaliacoesRespondidasBloco')>()
  return { ...actual, AvaliacoesRespondidasBloco: () => null }
})

import { HubCandidatoRH } from '../HubCandidatoRH'

type Mod = {
  ContatoCandidatoHeader?: React.ComponentType<{ candidaturaId: string }>
  COPY_CONTATO?: Record<string, unknown>
}

async function carregar(): Promise<Mod | null> {
  // Especificador em variável: o import-analysis do Vite não o resolve na transformação (um
  // literal reprovaria a COLETA do arquivo no RED — falha de carga, não de asserção).
  const especificador = '../ContatoCandidatoHeader'
  return ((await import(/* @vite-ignore */ especificador).catch(() => null)) as Mod | null)
}

/** Cadastro com todos os campos nulos, sobrescritos por `parcial`. */
function cadastro(parcial: Partial<DadosCadastroRh>): DadosCadastroRh {
  const base = Object.fromEntries(CAMPOS_CADASTRO_RH.map((c) => [c, null])) as DadosCadastroRh
  return { ...base, ...parcial }
}

function payload(parcial: Partial<CadastroCandidatoRh>): CadastroCandidatoRh {
  return {
    vaga_titulo: 'Recepcionista',
    contato: null,
    cadastro: null,
    disponibilidade: null,
    inscricao: [],
    ...parcial,
  }
}

function hook(data: CadastroCandidatoRh | undefined, extra: Record<string, unknown> = {}) {
  useCadastroCandidatoRhMock.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...extra,
  })
}

async function montarHeader(): Promise<HTMLElement> {
  const mod = await carregar()
  expect(mod?.ContatoCandidatoHeader, 'ContatoCandidatoHeader não existe').toBeTypeOf('function')
  const C = mod!.ContatoCandidatoHeader!
  const { container } = render(<C candidaturaId="cand-1" />)
  return container
}

function semAcaoDeContato(container: HTMLElement) {
  expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
  expect(container.querySelector('a[href*="wa.me"]')).toBeNull()
  expect(container.querySelector('[data-testid="hub-contato-email"]')).toBeNull()
  expect(container.querySelector('[data-testid="hub-contato-whatsapp"]')).toBeNull()
}

describe('ContatoCandidatoHeader — e-mail do candidato com «Enviar e-mail» (52-23 / D-12, D-14)', () => {
  beforeEach(() => {
    useCadastroCandidatoRhMock.mockReset()
  })

  it('contato com e-mail → link «Enviar e-mail» com href mailto:', async () => {
    hook(payload({ contato: { email: 'fulana@exemplo.com', celular: null } }))
    const container = await montarHeader()
    const link = container.querySelector('a[data-testid="hub-contato-email"]')
    expect(link, 'hub-contato-email ausente').not.toBeNull()
    expect(link!.getAttribute('href') ?? '').toMatch(/^mailto:fulana@exemplo\.com/)
    expect(link).toHaveTextContent('Enviar e-mail')
    expect(screen.getByText('fulana@exemplo.com')).toBeInTheDocument()
  })

  it('lê pelo hook do 52-09 com o candidaturaId recebido', async () => {
    hook(payload({ contato: { email: 'fulana@exemplo.com', celular: null } }))
    await montarHeader()
    expect(useCadastroCandidatoRhMock).toHaveBeenCalledWith('cand-1')
  })

  it('fictício (contato null, celular no cadastro) → «Sem contato disponível.» e nenhum mailto:/wa.me', async () => {
    hook(
      payload({
        contato: null,
        cadastro: cadastro({ nome_completo: 'Fulana de Teste', celular: '(11) 98765-4321' }),
      }),
    )
    const container = await montarHeader()
    expect(screen.getByText('Sem contato disponível.')).toBeInTheDocument()
    semAcaoDeContato(container)
  })
})

describe('HubCandidatoRH — o contato está no cabeçalho, fora das abas (52-23 / D-12)', () => {
  beforeEach(() => {
    useCadastroCandidatoRhMock.mockReset()
    useEntrevistaContextoMock.mockReset()
  })

  it('monta ContatoCandidatoHeader com o candidaturaId da rota', () => {
    useEntrevistaContextoMock.mockReturnValue({
      data: {
        candidatura_id: 'cand-1',
        vaga_id: 'vaga-1',
        etapa_atual: 'triagem',
        status: 'em_analise',
        candidato_nome: 'Fulana de Teste',
      },
      isLoading: false,
      isError: false,
    })
    hook(payload({ contato: { email: 'fulana@exemplo.com', celular: null } }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <HubCandidatoRH />
      </QueryClientProvider>,
    )
    expect(screen.getByTestId('hub-contato-email')).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:/),
    )
    expect(useCadastroCandidatoRhMock).toHaveBeenCalledWith('cand-1')
  })
})
