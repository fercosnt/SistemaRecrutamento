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
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
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

const MSG_VAGA =
  'Olá, Fulana! Aqui é da Beauty Smile, sobre a sua candidatura para Recepcionista.'
const ASSUNTO_VAGA = 'Beauty Smile — sua candidatura para Recepcionista'

function real(parcial: Partial<CadastroCandidatoRh> = {}): CadastroCandidatoRh {
  return payload({
    contato: { email: 'fulana@exemplo.com', celular: '(11) 98765-4321' },
    cadastro: cadastro({ nome_completo: 'Fulana de Teste', celular: '(11) 98765-4321' }),
    ...parcial,
  })
}

describe('ContatoCandidatoHeader — WhatsApp, mailto validado e estados (52-23 / D-13..D-16)', () => {
  beforeEach(() => {
    useCadastroCandidatoRhMock.mockReset()
  })

  it('mailto: com o assunto da vaga, codificado, corpo vazio (D-14)', async () => {
    hook(real())
    const container = await montarHeader()
    const link = container.querySelector('a[data-testid="hub-contato-email"]')
    expect(link?.getAttribute('href')).toBe(
      `mailto:fulana@exemplo.com?subject=${encodeURIComponent(ASSUNTO_VAGA)}`,
    )
    expect(link?.getAttribute('href')).not.toContain('body=')
  })

  it('celular válido → «Chamar no WhatsApp» com wa.me/55…, mensagem pronta, nova aba e noopener (D-13, T-52-25)', async () => {
    hook(real())
    const container = await montarHeader()
    const link = container.querySelector('a[data-testid="hub-contato-whatsapp"]')
    expect(link, 'hub-contato-whatsapp ausente').not.toBeNull()
    expect(link!.getAttribute('href')).toBe(
      `https://wa.me/5511987654321?text=${encodeURIComponent(MSG_VAGA)}`,
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('Chamar no WhatsApp')
    expect(screen.getByText('(11) 98765-4321')).toBeInTheDocument()
  })

  it('celular fora do formato → número cru como texto + a frase da Invariante 7, sem wa.me', async () => {
    hook(real({ contato: { email: 'fulana@exemplo.com', celular: '0119876543' } }))
    const container = await montarHeader()
    expect(screen.getByText('0119876543')).toBeInTheDocument()
    expect(
      screen.getByText('Número fora do formato do WhatsApp — confira o cadastro.'),
    ).toBeInTheDocument()
    expect(container.querySelector('a[href*="wa.me"]')).toBeNull()
    expect(container.querySelector('[data-testid="hub-contato-whatsapp"]')).toBeNull()
    // O e-mail segue com o seu botão.
    expect(container.querySelector('a[data-testid="hub-contato-email"]')).not.toBeNull()
  })

  it('e-mail com ?bcc= gravado → sem mailto:, o endereço fica como texto (T-52-24)', async () => {
    hook(real({ contato: { email: 'a@b.com?bcc=x@y.com', celular: null } }))
    const container = await montarHeader()
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(container.querySelector('[data-testid="hub-contato-email"]')).toBeNull()
    expect(screen.getByText('a@b.com?bcc=x@y.com')).toBeInTheDocument()
  })

  it('só celular (sem e-mail) → só o WhatsApp', async () => {
    hook(real({ contato: { email: null, celular: '11987654321' } }))
    const container = await montarHeader()
    expect(container.querySelector('a[data-testid="hub-contato-whatsapp"]')).not.toBeNull()
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(screen.queryByText('Sem contato disponível.')).toBeNull()
  })

  it('sem e-mail e sem celular → «Sem contato disponível.»', async () => {
    hook(real({ contato: { email: null, celular: null } }))
    const container = await montarHeader()
    expect(screen.getByText('Sem contato disponível.')).toBeInTheDocument()
    semAcaoDeContato(container)
  })

  it('«Vaga: {título}» só com título; sem título as frases caem para a versão sem vaga (D-52-U10)', async () => {
    hook(real())
    let container = await montarHeader()
    expect(screen.getByText('Vaga: Recepcionista')).toBeInTheDocument()
    cleanup()

    hook(real({ vaga_titulo: null }))
    container = await montarHeader()
    expect(screen.queryByText(/^Vaga:/)).toBeNull()
    expect(container.querySelector('a[data-testid="hub-contato-email"]')?.getAttribute('href')).toBe(
      `mailto:fulana@exemplo.com?subject=${encodeURIComponent('Beauty Smile — sua candidatura')}`,
    )
    expect(
      container.querySelector('a[data-testid="hub-contato-whatsapp"]')?.getAttribute('href'),
    ).toBe(
      `https://wa.me/5511987654321?text=${encodeURIComponent(
        'Olá, Fulana! Aqui é da Beauty Smile, sobre a sua candidatura.',
      )}`,
    )
  })

  it('carregando → skeleton no lugar da linha de contato', async () => {
    hook(undefined, { isLoading: true })
    const container = await montarHeader()
    const sk = container.querySelector('[data-slot="skeleton"]')
    expect(sk, 'skeleton ausente').not.toBeNull()
    expect(sk!.className).toContain('h-10')
    expect(sk!.className).toContain('max-w-md')
    expect(screen.queryByText('Sem contato disponível.')).toBeNull()
  })

  it('erro → frase + «Recarregar contato», que refaz só a leitura do contato (refetch)', async () => {
    const refetch = vi.fn()
    hook(undefined, { isError: true, refetch })
    await montarHeader()
    expect(screen.getByText('Não foi possível carregar o contato.')).toBeInTheDocument()
    const botao = screen.getByRole('button', { name: 'Recarregar contato' })
    expect(botao.className).toContain('min-h-[44px]')
    fireEvent.click(botao)
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Sem contato disponível.')).toBeNull()
  })

  it('o clique nos links não chama nada — nem rede, nem refetch (D-15)', async () => {
    const refetch = vi.fn()
    hook(real(), { refetch })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const impedir = (e: Event) => e.preventDefault()
    document.addEventListener('click', impedir, true)
    try {
      const container = await montarHeader()
      const chamadasAntes = useCadastroCandidatoRhMock.mock.calls.length
      fireEvent.click(container.querySelector('a[data-testid="hub-contato-email"]')!)
      fireEvent.click(container.querySelector('a[data-testid="hub-contato-whatsapp"]')!)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(refetch).not.toHaveBeenCalled()
      expect(useCadastroCandidatoRhMock.mock.calls.length).toBe(chamadasAntes)
    } finally {
      document.removeEventListener('click', impedir, true)
      fetchSpy.mockRestore()
    }
  })
})

describe('ContatoCandidatoHeader — privacidade: fictício, tombstone e a defesa (JORN-53, SC2, D-40)', () => {
  beforeEach(() => {
    useCadastroCandidatoRhMock.mockReset()
  })

  const CASOS: Array<[string, CadastroCandidatoRh]> = [
    [
      'fictício — contato null, celular válido no cadastro',
      payload({
        contato: null,
        cadastro: cadastro({ nome_completo: 'Fulana de Teste', celular: '(11) 98765-4321' }),
      }),
    ],
    ['tombstone — contato e cadastro nulos', payload({ contato: null, cadastro: null })],
    [
      'defesa — contato.email em @INVALIDO.LOCAL com celular válido (EF antiga no ar)',
      payload({
        contato: { email: 'anonimizado+x@INVALIDO.LOCAL', celular: '11987654321' },
        cadastro: cadastro({ nome_completo: 'Fulana de Teste', celular: '11987654321' }),
      }),
    ],
  ]

  it.each(CASOS)('%s → só «Sem contato disponível.»', async (_nome, dados) => {
    expect(dados.vaga_titulo).toBe('Recepcionista')
    hook(dados)
    const container = await montarHeader()
    expect(screen.getByText('Sem contato disponível.')).toBeInTheDocument()
    semAcaoDeContato(container)
    const html = container.innerHTML
    for (const proibido of [
      'mailto:',
      'wa.me',
      '?text=',
      'subject=',
      'Aqui é da Beauty Smile',
      'sua candidatura',
      '98765',
      '4321',
      'invalido',
      'INVALIDO',
      'anonimiz',
      'fictíci',
      'exclu',
      'removid',
      'Chamar no WhatsApp',
      'Enviar e-mail',
      'Número fora do formato',
    ]) {
      expect(html, `«${proibido}» vazou no DOM`).not.toContain(proibido)
    }
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
