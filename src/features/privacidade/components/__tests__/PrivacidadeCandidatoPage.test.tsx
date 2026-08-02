/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 43 / Plano 43-08 Task 3 — a suíte que prova o que a tela **NÃO** faz.
 *
 * Quatro dos cinco casos aqui são ASSERÇÕES NEGATIVAS, e é isso que os torna
 * load-bearing: o que esta tela promete já é verificável por quem a abre; o que ela se
 * proíbe de fazer só permanece proibido se houver teste. As três regras de método:
 *
 *  1. **Estrutural, nunca textual.** O caso (a) varre a região do transacional por
 *     SELETOR (`role="checkbox"`, `role="switch"`, `aria-checked`, `aria-disabled`,
 *     `<input>`). Uma asserção sobre o texto visível não pegaria um controle
 *     acrescentado ali seis meses depois — e é exatamente assim que a Invariante 3
 *     morreria em silêncio.
 *  2. **Conteúdo em portal é lido de `document.body`**, nunca do container do render:
 *     `container.textContent` fica VAZIO para portal e toda asserção negativa passaria
 *     sem olhar nada (3 falsos verdes medidos no 42-10).
 *  3. **Literais proibidos montados em runtime** (idioma do 42-11 / 43-02): um arquivo
 *     que proíbe uma string e a contém verbatim é sua própria primeira violação — e este
 *     arquivo vive dentro de `src/features/privacidade/`, que está na allowlist do
 *     portão de copy do 43-02.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const CANDIDATO_ID = '77777777-7777-4777-8777-777777777777'
const AUTORIZACAO_ID = '88888888-8888-4888-8888-888888888888'
const ISO = '2026-03-12T12:00:00.000Z'

const mocks = vi.hoisted(() => ({
  obterAutorizacoes: vi.fn(),
  revogarMarketing: vi.fn(),
  obterGuardaCurriculo: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  navigate: vi.fn(),
  /** Espião do argumento de `select` — o caso (e) vive disto. */
  select: vi.fn(),
  /** Resposta do dublê do PostgREST, sobrescrevível por teste. */
  resposta: { valor: { data: null as unknown, error: null as unknown } },
}))

vi.mock('../../services/privacidadeService', async () => {
  const real =
    await vi.importActual<typeof import('../../services/privacidadeService')>(
      '../../services/privacidadeService',
    )
  return {
    ...real,
    obterAutorizacoes: mocks.obterAutorizacoes,
    revogarMarketing: mocks.revogarMarketing,
    obterGuardaCurriculo: mocks.obterGuardaCurriculo,
  }
})

/**
 * Dublê do cliente PostgREST. Só o caso (e) o exercita — ele chama o serviço REAL
 * (via `importActual`) para inspecionar o argumento de `select`. Para os demais casos
 * este dublê é inerte, porque o serviço está mockado acima.
 */
vi.mock('@/lib/supabase/client', () => {
  const builder: Record<string, unknown> = {}
  const encadear = () => builder
  builder.select = (colunas: string) => {
    mocks.select(colunas)
    return builder
  }
  builder.eq = encadear
  builder.not = encadear
  builder.order = encadear
  builder.limit = encadear
  builder.update = encadear
  builder.maybeSingle = async () => mocks.resposta.valor
  builder.single = async () => mocks.resposta.valor
  return { supabase: { from: () => builder } }
})

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))

vi.mock('@/store/authStore', () => ({
  useCandidato: () => ({ id: CANDIDATO_ID }),
}))

vi.mock('@/components/BackgroundImage', () => ({
  BackgroundImage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

import type { AutorizacoesCandidato } from '../../services/privacidadeService'
import { PrivacidadeCandidatoPage, COPY_PRIVACIDADE } from '../PrivacidadeCandidatoPage'
import { COPY_CONSENTIMENTO_MARKETING } from '../ConsentimentoSwitchRow'

function linha(over: Partial<AutorizacoesCandidato> = {}): AutorizacoesCandidato {
  return {
    id: AUTORIZACAO_ID,
    autorizacao_uso_dados: true,
    autorizacao_marketing_vagas: true,
    autorizacao_retencao_curriculo: true,
    consent_text_version: 'v2-2026-08',
    created_at: ISO,
    updated_at: ISO,
    ...over,
  }
}

let queryClient: QueryClient

function montar() {
  return render(
    <QueryClientProvider client={queryClient}>
      <PrivacidadeCandidatoPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  mocks.obterAutorizacoes.mockResolvedValue(linha())
  mocks.obterGuardaCurriculo.mockResolvedValue({ temCurriculo: true })
  mocks.revogarMarketing.mockResolvedValue(
    linha({ autorizacao_marketing_vagas: false }),
  )
  mocks.resposta.valor = { data: null, error: null }
})

// ─────────────────────────────────────────────────────────────────────────────

describe('(a) A linha do transacional é INFORMAÇÃO, não controle (Invariante 3)', () => {
  it('a região do transacional não contém nenhum controle, por seletor', async () => {
    const { container } = montar()
    await screen.findByRole('switch')

    const regiao = container.querySelector('[data-linha="transacional"]')
    expect(regiao, 'a linha do transacional não foi renderizada').not.toBeNull()

    const proibidos = regiao!.querySelectorAll(
      '[role="checkbox"], [role="switch"], [aria-checked], [aria-disabled], input, button',
    )
    expect(
      proibidos.length,
      'um controle apareceu na linha do transacional: um leitor de tela passaria a ' +
        'ouvir "opção desabilitada" onde tem de ouvir informação (43-UI-SPEC, Invariante 3)',
    ).toBe(0)

    // E a base legal continua NOMEADA — é o que impede a assimetria de virar mentira.
    expect(regiao!.textContent).toContain('Art. 7º, V')
  })

  it('a ordem é contratual: o item SEM escolha vem antes do item COM escolha', async () => {
    const { container } = montar()
    await screen.findByRole('switch')

    const linhas = Array.from(container.querySelectorAll('[data-linha]')).map((el) =>
      el.getAttribute('data-linha'),
    )
    expect(linhas).toEqual(['transacional', 'marketing', 'guarda-curriculo'])
  })
})

describe('(b) Zero fricção para revogar (Invariante 4)', () => {
  it('alternar para desligado não abre diálogo, não pede motivo e não dissuade', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('switch'))
    await waitFor(() => expect(mocks.revogarMarketing).toHaveBeenCalled())

    // Portal: lido de `document.body`, não do container (regra 2 do cabeçalho).
    expect(
      document.body.querySelectorAll('[role="dialog"], [role="alertdialog"], dialog'),
    ).toHaveLength(0)
    expect(document.body.querySelectorAll('input, textarea, select')).toHaveLength(0)

    const dissuasao = [
      ['tem', ' ', 'certeza'].join(''),
      ['perder', ' ', 'oportunidades'].join(''),
      ['informe', ' o ', 'motivo'].join(''),
      ['confirmar', ' ', 'revogação'].join(''),
      ['você', ' vai ', 'perder'].join(''),
    ]
    const corpo = (document.body.textContent ?? '').toLowerCase()
    for (const frase of dissuasao) {
      expect(corpo, `texto de dissuasão presente: "${frase}"`).not.toContain(frase)
    }
  })
})

describe('(c) Sem UI otimista (Invariante 5)', () => {
  it('com a mutação pendente o switch está desabilitado e mostra o estado do SERVIDOR', async () => {
    mocks.revogarMarketing.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    montar()

    const controle = await screen.findByRole('switch')
    expect(controle).toBeChecked()

    await user.click(controle)

    await waitFor(() => expect(screen.getByRole('switch')).toBeDisabled())
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(COPY_CONSENTIMENTO_MARKETING.emVoo)).toBeInTheDocument()
  })
})

describe('(e) Nenhuma coluna de PII de aceite atravessa para a tela', () => {
  it('o contrato de tipo e o objeto entregue não têm as colunas de PII do aceite', async () => {
    montar()
    await screen.findByRole('switch')

    const entregue = await mocks.obterAutorizacoes.mock.results[0]?.value
    const chaves = Object.keys(entregue as Record<string, unknown>)
    expect(chaves).not.toContain(['ip', '_aceite'].join(''))
    expect(chaves).not.toContain(['user_agent', '_aceite'].join(''))
  })

  it('a leitura chama o PostgREST com lista de colunas NOMEADA — nunca a estrela', async () => {
    // Aqui o serviço REAL é exercitado contra o dublê do cliente: é o argumento de
    // `select` que prova a allowlist. Uma asserção sobre o tipo TypeScript não provaria
    // nada — o tipo some no runtime e a estrela viajaria pela rede do mesmo jeito.
    const real =
      await vi.importActual<typeof import('../../services/privacidadeService')>(
        '../../services/privacidadeService',
      )

    mocks.resposta.valor = { data: linha(), error: null }
    await real.obterAutorizacoes(CANDIDATO_ID)

    expect(mocks.select).toHaveBeenCalledTimes(1)
    const colunas = String(mocks.select.mock.calls[0]?.[0] ?? '')

    expect(colunas).not.toContain('*')
    expect(colunas).not.toContain(['ip', '_aceite'].join(''))
    expect(colunas).not.toContain(['user_agent', '_aceite'].join(''))
    for (const coluna of [
      'id',
      'autorizacao_uso_dados',
      'autorizacao_marketing_vagas',
      'autorizacao_retencao_curriculo',
      'consent_text_version',
      'created_at',
      'updated_at',
    ]) {
      expect(colunas).toContain(coluna)
    }
    // A allowlist exportada é a MESMA string enviada — se alguém editar uma das duas
    // sem a outra, este par de asserções denuncia.
    expect(colunas).toBe(real.AUTORIZACOES_ALLOWLIST)
  })
})

describe('(f) Carregamento e erro renderizam a copy da spec, nunca o erro cru', () => {
  it('carregando: skeleton de 3 blocos, sem copy de erro', async () => {
    mocks.obterAutorizacoes.mockImplementation(() => new Promise(() => {}))
    const { container } = montar()

    await waitFor(() =>
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3),
    )
    expect(screen.queryByText(COPY_PRIVACIDADE.erroTitulo)).not.toBeInTheDocument()
  })

  it('erro: copy própria + "Tentar novamente", e o texto do transporte nunca aparece', async () => {
    const CRU = 'FetchError: connect ECONNREFUSED 127.0.0.1:54321'
    mocks.obterAutorizacoes.mockRejectedValue(new Error(CRU))
    const user = userEvent.setup()
    montar()

    expect(await screen.findByText(COPY_PRIVACIDADE.erroTitulo)).toBeInTheDocument()
    expect(screen.getByText(COPY_PRIVACIDADE.erroCorpo)).toBeInTheDocument()
    expect(document.body.textContent ?? '').not.toContain('ECONNREFUSED')

    const retry = screen.getByRole('button', {
      name: COPY_PRIVACIDADE.tentarNovamente,
    })
    expect(retry).toBeInTheDocument()

    mocks.obterAutorizacoes.mockResolvedValue(linha())
    await user.click(retry)
    expect(await screen.findByRole('switch')).toBeInTheDocument()
  })
})
