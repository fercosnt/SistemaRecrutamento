/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 43 / Plano 43-08 Task 1 — a revogação do marketing ponta a ponta (CONSENT-04).
 *
 * Esta suíte NÃO testa um componente isolado com props fabricadas. Ela monta a linha
 * LIGADA aos dois hooks reais (`usePrivacidade` + `useRevogarMarketing`) sobre um
 * servidor de mentira, porque as duas invariantes que importam aqui só existem na
 * ligação:
 *
 *  1. **Ausência de UI otimista** (Invariante 5 da 43-UI-SPEC). A asserção é feita
 *     DURANTE a promessa pendente, sobre o `aria-checked` do controle — não por leitura
 *     de código nem por ausência de `onMutate` no fonte. Um `onMutate` acrescentado
 *     depois reprova aqui; um teste de props não perceberia.
 *  2. **Ausência de fricção para revogar** (Invariante 4). Asserção ESTRUTURAL sobre
 *     `document.body` (conteúdo em portal — diálogo, toast — não vive no container do
 *     render; `container.textContent` fica vazio para portal, e foram 3 falsos verdes
 *     medidos assim no 42-10).
 *
 * As strings de dissuasão proibidas são montadas em runtime, no idioma do 42-11: um
 * arquivo que proíbe uma frase e a contém verbatim é auto-invalidante.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 *      (§`/candidato/privacidade` — copy verbatim; Invariantes 4 e 5)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const CANDIDATO_ID = '77777777-7777-4777-8777-777777777777'
const AUTORIZACAO_ID = '88888888-8888-4888-8888-888888888888'

/** 12h UTC: dd/mm/aaaa é o mesmo dia em qualquer fuso do planeta (±11h). */
const ISO_ANTES = '2026-03-12T12:00:00.000Z'
const ISO_DEPOIS = '2026-05-20T12:00:00.000Z'
const DATA_ANTES = '12/03/2026'
const DATA_DEPOIS = '20/05/2026'

const mocks = vi.hoisted(() => ({
  obterAutorizacoes: vi.fn(),
  revogarMarketing: vi.fn(),
  obterGuardaCurriculo: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

// O serviço é dublê, mas `PrivacidadeError` e a allowlist são REAIS — um dublê da classe
// de erro quebraria justamente as asserções de identidade que outros arquivos fazem.
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

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}))

import type { AutorizacoesCandidato } from '../../services/privacidadeService'
import { usePrivacidade } from '../../hooks/usePrivacidade'
import { useRevogarMarketing } from '../../hooks/useRevogarMarketing'
import {
  ConsentimentoSwitchRow,
  COPY_CONSENTIMENTO_MARKETING as COPY,
} from '../ConsentimentoSwitchRow'

// ─────────────────────────────────────────────────────────────────────────────
// Servidor de mentira — mutável, para que a releitura pós-escrita seja REAL
// ─────────────────────────────────────────────────────────────────────────────

function linhaBase(over: Partial<AutorizacoesCandidato> = {}): AutorizacoesCandidato {
  return {
    id: AUTORIZACAO_ID,
    autorizacao_uso_dados: true,
    autorizacao_marketing_vagas: true,
    autorizacao_retencao_curriculo: true,
    consent_text_version: 'v2-2026-08',
    created_at: ISO_ANTES,
    updated_at: ISO_ANTES,
    ...over,
  }
}

let linhaNoServidor: AutorizacoesCandidato
let queryClient: QueryClient

/**
 * A linha LIGADA — a mesma composição que a `AutorizacoesLista` faz em produção. O que
 * a tela mostra vem SEMPRE de `data`, isto é, do servidor; `mutate` não alimenta render
 * nenhum.
 */
function LinhaConectada() {
  const { data } = usePrivacidade(CANDIDATO_ID)
  const revogar = useRevogarMarketing(CANDIDATO_ID)

  if (!data) return null

  return (
    <ConsentimentoSwitchRow
      id="privacidade_marketing"
      rotulo={COPY.rotulo}
      corpo={COPY.corpo}
      valor={data.autorizacao_marketing_vagas}
      confirmadoEm={data.updated_at}
      pendente={revogar.isPending}
      erro={revogar.isError}
      onAlternar={(novoValor) =>
        revogar.mutate({ idAutorizacao: data.id, novoValor })
      }
    />
  )
}

function montar() {
  return render(
    <QueryClientProvider client={queryClient}>
      <LinhaConectada />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  linhaNoServidor = linhaBase()
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  mocks.obterAutorizacoes.mockImplementation(async () => linhaNoServidor)
  mocks.revogarMarketing.mockImplementation(
    async (_id: string, novoValor: boolean, _candidatoId: string) => {
      linhaNoServidor = {
        ...linhaNoServidor,
        autorizacao_marketing_vagas: novoValor,
        updated_at: ISO_DEPOIS,
      }
      return linhaNoServidor
    },
  )
})

// ─────────────────────────────────────────────────────────────────────────────

describe('ConsentimentoSwitchRow — o estado exibido é o do servidor', () => {
  it('(a) marketing autorizado → switch ligado, com a data em que foi ativado', async () => {
    montar()

    const controle = await screen.findByRole('switch')
    expect(controle).toBeChecked()
    expect(screen.getByText(COPY.ativoDesde(DATA_ANTES))).toBeInTheDocument()
    // O texto do consentimento fica SEMPRE visível ao lado do controle — é o que torna
    // a concessão informada. Nunca colapsado atrás de "ler mais".
    expect(screen.getByText(COPY.corpo)).toBeInTheDocument()
  })

  it('(b) `false` → desligado COM data; `null` (nunca autorizado) → desligado SEM data', async () => {
    linhaNoServidor = linhaBase({
      autorizacao_marketing_vagas: false,
      updated_at: ISO_DEPOIS,
    })
    const { unmount } = montar()

    expect(await screen.findByRole('switch')).not.toBeChecked()
    expect(screen.getByText(COPY.desativadoEm(DATA_DEPOIS))).toBeInTheDocument()
    unmount()

    // BD-5: toda a base histórica carrega NULL, e NULL vale NÃO AUTORIZADO. Sem data,
    // porque não houve ato nenhum a datar — inventar uma seria fabricar registro.
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    linhaNoServidor = linhaBase({ autorizacao_marketing_vagas: null })
    montar()

    expect(await screen.findByRole('switch')).not.toBeChecked()
    expect(screen.getByText(COPY.desativado)).toBeInTheDocument()
    expect(screen.queryByText(COPY.desativadoEm(DATA_ANTES))).not.toBeInTheDocument()
  })

  it('(c) EM VOO: o switch fica desabilitado e continua mostrando o estado do SERVIDOR', async () => {
    // Uma promessa que não resolve — a janela em que a UI otimista se denunciaria.
    mocks.revogarMarketing.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    montar()

    const controle = await screen.findByRole('switch')
    expect(controle).toBeChecked()

    await user.click(controle)

    await waitFor(() => expect(screen.getByRole('switch')).toBeDisabled())
    expect(screen.getByText(COPY.emVoo)).toBeInTheDocument()
    // A asserção que carrega o plano inteiro: o desejado é `false`, o servidor ainda diz
    // `true`, e é `true` que está na tela.
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch')).toBeChecked()
  })

  it('(d) concluída a escrita, o estado exibido é o que voltou do servidor', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('switch'))

    await waitFor(() => expect(screen.getByRole('switch')).not.toBeChecked())
    // O `candidatoId` é o 3º argumento e não é decorativo: ele vira o segundo predicado
    // do UPDATE. A policy que sozinha garantiria o escopo own-row existe em PROD e em
    // arquivo de migration NENHUM — se o hook parar de passá-lo, a escrita volta a ser
    // escopada só por `id` e nada no cliente reclama (WR-06).
    expect(mocks.revogarMarketing).toHaveBeenCalledWith(
      AUTORIZACAO_ID,
      false,
      CANDIDATO_ID,
    )
    expect(screen.getByText(COPY.desativadoEm(DATA_DEPOIS))).toBeInTheDocument()
    expect(mocks.toastSuccess).toHaveBeenCalled()
  })

  it('(e) em falha, o switch VOLTA ao estado do servidor e aparece alerta com role="alert"', async () => {
    mocks.revogarMarketing.mockRejectedValue(new Error('falha de transporte'))
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('switch'))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(COPY.erroTitulo)
    expect(alerta).toHaveTextContent(COPY.erroCorpo)
    // O estado do servidor nunca mudou — e é ele que continua na tela.
    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.getByText(COPY.ativoDesde(DATA_ANTES))).toBeInTheDocument()
    // Erro de escrita de consentimento é alerta PERSISTENTE, não toast: um toast some
    // em segundos e este é o caso em que a pessoa precisa saber que nada mudou.
    expect(mocks.toastError).not.toHaveBeenCalled()
    // E nunca o texto cru do transporte.
    expect(document.body.textContent ?? '').not.toContain('falha de transporte')
  })
})

describe('Revogar não custa nada — Invariante 4 (zero fricção)', () => {
  it('(f) alternar para desligado não abre diálogo, não pede motivo e não dissuade', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('switch'))
    await waitFor(() => expect(screen.getByRole('switch')).not.toBeChecked())

    // Estrutural: conteúdo em portal vive em `document.body`, não no container.
    expect(
      document.body.querySelectorAll('[role="dialog"], [role="alertdialog"], dialog'),
    ).toHaveLength(0)
    // Nenhum campo de texto: pedir motivo para exercer um direito é dark pattern.
    expect(document.body.querySelectorAll('input, textarea, select')).toHaveLength(0)

    // Literais montados em runtime — ver o aviso do cabeçalho.
    const dissuasao = [
      ['tem', ' ', 'certeza'].join(''),
      ['perder', ' ', 'oportunidades'].join(''),
      ['informe', ' o ', 'motivo'].join(''),
      ['por que', ' você ', 'está saindo'].join(''),
      ['confirmar', ' ', 'revogação'].join(''),
    ]
    const corpo = (document.body.textContent ?? '').toLowerCase()
    for (const frase of dissuasao) {
      expect(corpo, `texto de dissuasão presente: "${frase}"`).not.toContain(frase)
    }
  })
})

describe('Nenhuma coluna de PII de aceite atravessa para a tela', () => {
  it('(g) a linha que o serviço entrega não tem `ip_aceite` nem `user_agent_aceite`', async () => {
    montar()
    await screen.findByRole('switch')

    const entregue = await mocks.obterAutorizacoes.mock.results[0]?.value
    const chaves = Object.keys(entregue as Record<string, unknown>)
    // Montado em runtime pelo mesmo motivo das frases acima: um teste que nomeia a
    // coluna proibida verbatim vira ele próprio uma ocorrência a grepar.
    expect(chaves).not.toContain(['ip', '_aceite'].join(''))
    expect(chaves).not.toContain(['user_agent', '_aceite'].join(''))
  })
})
