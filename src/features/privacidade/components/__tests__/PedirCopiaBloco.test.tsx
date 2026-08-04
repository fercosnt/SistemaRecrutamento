/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 44 / Plano 44-05 Task 2 (TDD RED) — o bloco da seção 3 de
 * `/candidato/privacidade`: o CTA que **é** o pedido (EXPORT-01).
 *
 * Cinco casos, e dois deles são o que a UI-SPEC chama de backstop:
 *
 *  - **(h)** o duplo clique. O botão em voo é `disabled` + `aria-busy="true"`, e a
 *    asserção é sobre a MUTATION ter sido disparada uma única vez — não sobre o
 *    atributo. Um `disabled` que existisse sem impedir a segunda chamada passaria
 *    numa asserção de atributo e falha nesta (E2/loading).
 *
 *  - **(k)** sonda de texto-fonte com ESCOPO DECLARADO. As strings banidas pela
 *    §Copywriting da 44-UI-SPEC são procuradas **apenas** em `PedirCopiaBloco.tsx` e
 *    no gerador do `.json` — **nunca** em `src/features/privacidade/` inteiro. O
 *    `GuardaCurriculoBloco`, aprovado na Phase 43 e não editado por esta fase, contém
 *    legitimamente uma das expressões ("pedir a eliminação do seu currículo"); um grep
 *    de feature inteira reprovaria copy aprovada de outra fase. Este projeto já pagou
 *    duas vezes por essa classe de defeito (43, "automaticamente"; 44-03, asserção (c)
 *    varrendo prosa que cita as tabelas proibidas de propósito).
 *
 * Os literais proibidos são MONTADOS EM RUNTIME (idioma 42-11): um arquivo que proíbe
 * uma string e a contém verbatim é sua própria primeira violação.
 *
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§O CTA e seus cinco estados)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const mocks = vi.hoisted(() => ({
  invocar: vi.fn(),
  disparar: vi.fn(),
  ultimoPedido: vi.fn(),
}))

// O bloco resolve o titular pelo store (a página não lhe passa prop): o CTA é o
// pedido do PRÓPRIO candidato, e um id vindo de fora seria um id a mais para
// alguém tentar trocar.
vi.mock('@/store/authStore', () => ({
  useCandidato: () => ({ id: 'cand-1' }),
}))

vi.mock('../../hooks/useUltimoPedidoDados', () => ({
  useUltimoPedidoDados: () => mocks.ultimoPedido(),
}))

// O client Supabase é validado no topo do módulo do serviço real (que o
// `importActual` abaixo avalia) — mockado para não exigir `VITE_SUPABASE_*`.
vi.mock('@/lib/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

vi.mock('../../services/exportacaoService', async () => {
  const real =
    await vi.importActual<typeof import('../../services/exportacaoService')>(
      '../../services/exportacaoService',
    )
  return { ...real, invocarExportMeusDados: mocks.invocar, dispararDownloads: mocks.disparar }
})

import { PedirCopiaBloco } from '../PedirCopiaBloco'
import {
  COPY_PEDIR_COPIA,
  COPY_COOLDOWN,
  ExportacaoError,
  nomeArquivoExport,
  type RespostaExport,
} from '../../services/exportacaoService'

const RESPOSTA: RespostaExport = {
  ok: true,
  versao_allowlist: '1.1.0',
  gerado_em: '2026-08-04T13:45:00.000Z',
  payload: { candidatos: [{ id: 'cand-1' }] },
}

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <PedirCopiaBloco />
    </QueryClientProvider>,
  )
}

const botao = () => screen.getByRole('button', { name: /cópia dos meus dados|Preparando sua cópia/i })

/** O estado padrão: nunca pediu, leitura concluída. */
const SEM_PEDIDO = { data: null, isLoading: false, isError: false } as const

/** `solicitado_em` e a liberação correspondente — o MESMO instante nos dois lados. */
const SOLICITADO_EM = new Date(Date.now() - 60 * 60 * 1000).toISOString()
const LIBERADO_EM = new Date(
  new Date(SOLICITADO_EM).getTime() + 24 * 60 * 60 * 1000,
).toISOString()

beforeEach(() => {
  mocks.invocar.mockReset()
  mocks.disparar.mockReset()
  mocks.ultimoPedido.mockReset()
  mocks.ultimoPedido.mockReturnValue(SEM_PEDIDO)
})

describe('PedirCopiaBloco', () => {
  it('(g) estado disponível: CTA com a copy da spec e alvo tátil de 44px', () => {
    renderizar()
    const cta = screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta })
    expect(cta).toBeInTheDocument()
    expect(cta).toBeEnabled()
    expect(cta.className).toContain('min-h-[44px]')
    expect(cta).not.toHaveAttribute('aria-busy', 'true')
    // A prosa de escopo é leitura de carga: presente e íntegra.
    expect(screen.getByText(COPY_PEDIR_COPIA.abertura)).toBeInTheDocument()
    expect(screen.getByText(COPY_PEDIR_COPIA.oQueEsta)).toBeInTheDocument()
    expect(screen.getByText(COPY_PEDIR_COPIA.oQueNaoEsta)).toBeInTheDocument()
  })

  it('(h) em voo: desabilitado + aria-busy, e um segundo clique NÃO dispara outra mutation', async () => {
    // Promise que nunca resolve — a mutation fica em voo pelo teste inteiro.
    mocks.invocar.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))

    await waitFor(() => expect(botao()).toHaveAttribute('aria-busy', 'true'))
    expect(botao()).toBeDisabled()
    expect(botao()).toHaveTextContent(COPY_PEDIR_COPIA.ctaEmVoo)

    await user.click(botao())
    expect(mocks.invocar).toHaveBeenCalledTimes(1)
  })

  it('(i) erro: alerta inline com role="alert" e o botão volta a ficar habilitado', async () => {
    mocks.invocar.mockRejectedValue(new Error('qualquer coisa'))
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(COPY_PEDIR_COPIA.erroTitulo)
    expect(alerta).toHaveTextContent(COPY_PEDIR_COPIA.erroCorpo)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta })).toBeEnabled(),
    )
    expect(mocks.disparar).not.toHaveBeenCalled()
  })

  it('(j) sucesso: dispara UMA vez, com os DOIS arquivos e o .json na frente', async () => {
    mocks.invocar.mockResolvedValue(RESPOSTA)
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))

    await waitFor(() => expect(mocks.disparar).toHaveBeenCalledTimes(1))
    const [arquivos] = mocks.disparar.mock.calls[0]
    expect(arquivos).toHaveLength(2)
    // A ordem é contrato: o artefato do direito legal vai na frente, para
    // sobreviver caso o navegador barre o segundo download.
    expect(arquivos[0].nome).toMatch(/^beauty-smile-meus-dados-\d{4}-\d{2}-\d{2}\.json$/)
    expect(arquivos[1].nome).toMatch(/^beauty-smile-meus-dados-\d{4}-\d{2}-\d{2}\.html$/)
    expect(arquivos[0].tipo).toContain('application/json')
    expect(arquivos[1].tipo).toContain('text/html')
    // O conteúdo é o que os geradores PUROS produziram (o mock não os substitui).
    expect(JSON.parse(arquivos[0].conteudo).versao_allowlist).toBe('1.1.0')
    expect(arquivos[1].conteudo).toContain('Seus dados na Beauty Smile')
  })

  it('(k) sonda de texto-fonte, ESCOPO DECLARADO: o bloco novo e o gerador do .json', () => {
    const ler = (relativo: string) => readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
    const escopo = {
      'PedirCopiaBloco.tsx': ler('../PedirCopiaBloco.tsx'),
      'exportacaoService.ts': ler('../../services/exportacaoService.ts'),
    }

    // Literais montados em runtime — ver o docblock deste arquivo.
    const banidas = [
      ['todos', 'os', 'seus', 'dados'].join(' '),
      ['tudo', 'o', 'que', 'temos', 'sobre', 'você'].join(' '),
      ['todos', 'os', 'seus', 'registros'].join(' '),
      ['apaga', 'do'].join(''),
      ['apaga', 'dos'].join(''),
      ['exclu', 'ído'].join(''),
      ['exclu', 'ídos'].join(''),
      ['elimina', 'do'].join(''),
      ['removido', 'dos', 'nossos', 'sistemas'].join(' '),
    ]

    for (const [arquivo, conteudo] of Object.entries(escopo)) {
      for (const proibida of banidas) {
        expect(
          conteudo.toLowerCase().includes(proibida.toLowerCase()),
          `string banida "${proibida}" encontrada em ${arquivo}`,
        ).toBe(false)
      }
    }

    // META-TEST: sem isto, uma grafia errada em `banidas` passaria verde para sempre.
    for (const proibida of banidas) {
      expect(`prefixo ${proibida} sufixo`.toLowerCase()).toContain(proibida.toLowerCase())
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Plano 44-06 Task 3 — os CINCO estados, a copy da fronteira e o cooldown que
// nunca é botão morto (casos (z1)–(z8)).
//
// (z3) é o backstop de E2/error e é ESTRUTURAL de propósito: percorre todo
// `<button disabled>` do bloco e exige, para cada um, um irmão com texto visível.
// Uma asserção que olhasse só uma string não pegaria um `disabled` acrescentado
// depois — e o 42-10 encontrou 3 falsos verdes exatamente dessa classe.
// ══════════════════════════════════════════════════════════════════════════════

describe('PedirCopiaBloco — os cinco estados (44-06)', () => {
  it('(z1) loading do estado: Glass pulsante de 1 linha, e o CTA NÃO aparece pela metade', () => {
    mocks.ultimoPedido.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = renderizar()

    expect(container.querySelectorAll('.animate-pulse').length).toBe(1)
    expect(screen.queryByRole('button')).toBeNull()
    // A prosa de escopo é estática: ela não espera pelo estado do cooldown.
    expect(screen.getByText(COPY_PEDIR_COPIA.oQueNaoEsta)).toBeInTheDocument()
  })

  it('(z2) erro do estado NÃO derruba o bloco: o CTA renderiza e o servidor vira a autoridade', () => {
    mocks.ultimoPedido.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderizar()

    // Asserção POSITIVA sobre a presença do botão. O ramo `isError` do análogo faz
    // o oposto (troca a seção por uma copy de erro); copiá-lo literalmente aqui
    // moveria a barreira do cooldown para o cliente — Invariante 3.
    const cta = screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta })
    expect(cta).toBeEnabled()
    expect(screen.queryByText(COPY_COOLDOWN.titulo)).toBeNull()
  })

  it('(z3) BACKSTOP ESTRUTURAL: nenhum botão desabilitado existe sem irmão de motivo visível', async () => {
    // Cenário 1 — cooldown local.
    mocks.ultimoPedido.mockReturnValue({
      data: { id: 'ped-1', situacao: 'atendido', causa: null, solicitado_em: SOLICITADO_EM, atendido_em: null },
      isLoading: false,
      isError: false,
    })
    const { container, unmount } = renderizar()
    exigirMotivoEmTodoBotaoDesabilitado(container)
    unmount()

    // Cenário 2 — em voo. O mesmo invariante, outra causa: um `disabled` sem
    // motivo é indistinguível de tela quebrada, qualquer que seja a razão.
    mocks.ultimoPedido.mockReturnValue(SEM_PEDIDO)
    mocks.invocar.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    const segunda = renderizar()
    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))
    await waitFor(() =>
      expect(segunda.container.querySelectorAll('button[disabled]').length).toBe(1),
    )
    exigirMotivoEmTodoBotaoDesabilitado(segunda.container)
  })

  it('(z4) FONTE ÚNICA: o cooldown local e a recusa 429 do servidor renderizam A MESMA string', async () => {
    // Lado A — o estado local diz que houve pedido há 1 h.
    mocks.ultimoPedido.mockReturnValue({
      data: { id: 'ped-1', situacao: 'atendido', causa: null, solicitado_em: SOLICITADO_EM, atendido_em: null },
      isLoading: false,
      isError: false,
    })
    const local = renderizar()
    const textoLocal = local.container.querySelector('[data-motivo]')?.textContent ?? ''
    expect(textoLocal.length).toBeGreaterThan(0)
    local.unmount()

    // Lado B — a leitura de estado NÃO viu nada, o titular clicou, e o SERVIDOR
    // recusou por cooldown com o MESMO instante de liberação.
    mocks.ultimoPedido.mockReturnValue(SEM_PEDIDO)
    mocks.invocar.mockRejectedValue(
      new ExportacaoError(COPY_PEDIR_COPIA.erroTitulo, 'COOLDOWN', LIBERADO_EM),
    )
    const user = userEvent.setup()
    const servidor = renderizar()
    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))
    await waitFor(() =>
      expect(servidor.container.querySelector('[data-motivo]')?.textContent ?? '').not.toBe(''),
    )
    const textoServidor = servidor.container.querySelector('[data-motivo]')?.textContent ?? ''

    // A comparação é DOS DOIS VALORES ENTRE SI, não de cada um contra um literal:
    // dois literais iguais hoje divergem no dia em que alguém editar um deles.
    expect(textoServidor).toBe(textoLocal)
    // …e a recusa por cooldown não vira TAMBÉM o alerta genérico de erro.
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('(z5) cooldown: o motivo é TEXTO VISÍVEL ligado por aria-describedby, nunca `title`', () => {
    mocks.ultimoPedido.mockReturnValue({
      data: { id: 'ped-1', situacao: 'atendido', causa: null, solicitado_em: SOLICITADO_EM, atendido_em: null },
      isLoading: false,
      isError: false,
    })
    const { container } = renderizar()

    const botao = container.querySelector('button[disabled]') as HTMLElement
    expect(botao).toBeTruthy()
    const idMotivo = botao.getAttribute('aria-describedby')
    expect(idMotivo).toBeTruthy()

    const motivo = container.querySelector(`#${idMotivo}`)
    expect(motivo).toBeTruthy()
    expect((motivo?.textContent ?? '').trim().length).toBeGreaterThan(0)
    // Um motivo que só existe em hover é inalcançável em toque e em leitor de
    // tela — e este é o único estado em que a pessoa é IMPEDIDA de exercer um
    // direito.
    expect(botao).not.toHaveAttribute('title')
    expect(motivo).not.toHaveClass('sr-only')
    expect(screen.getByText(new RegExp(COPY_COOLDOWN.titulo))).toBeInTheDocument()
  })

  it('(z6) sucesso PERSISTE, nomeia os DOIS arquivos e não usa toast', async () => {
    mocks.invocar.mockResolvedValue(RESPOSTA)
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))

    const titulo = await screen.findByText(COPY_PEDIR_COPIA.sucessoTitulo)
    expect(titulo).toBeInTheDocument()

    const quando = new Date(RESPOSTA.gerado_em)
    const nomeHtml = nomeArquivoExport('html', quando)
    const nomeJson = nomeArquivoExport('json', quando)
    expect(
      screen.getByText(COPY_PEDIR_COPIA.sucessoCorpo(nomeHtml, nomeJson)),
    ).toBeInTheDocument()

    // PERSISTE: nada o remove por tempo. Um toast some antes de a pessoa
    // terminar de procurar dois arquivos na pasta de downloads.
    await new Promise((r) => setTimeout(r, 60))
    expect(screen.getByText(COPY_PEDIR_COPIA.sucessoTitulo)).toBeInTheDocument()

    // A sonda procura o IMPORT e a CHAMADA, não o nome da biblioteca solto: o
    // docblock do componente cita `sonner` para explicar por que ele não é usado
    // aqui, e um grep sobre o nome reprovaria a própria justificativa do ban —
    // o defeito que este projeto já pagou duas vezes (43, "automaticamente").
    const fonte = lerFonte('../PedirCopiaBloco.tsx')
    const importSonner = ["from '", 'son', "ner'"].join('')
    expect(fonte).not.toContain(importSonner)
    expect(fonte).not.toContain(['toast', '('].join(''))
    expect(fonte).not.toContain('useToast')
    expect(`x${importSonner}y`).toContain(importSonner) // META-TEST
  })

  it('(z7) a prosa de escopo não é truncada a 320px e mantém a escala de leitura', () => {
    Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
    const { container } = renderizar()

    const prosa = [
      COPY_PEDIR_COPIA.abertura,
      COPY_PEDIR_COPIA.comoChega,
      COPY_PEDIR_COPIA.oQueEsta,
      COPY_PEDIR_COPIA.oQueNaoEsta,
    ]
    for (const texto of prosa) {
      const no = screen.getByText(texto)
      // Íntegra — nenhum caractere a menos.
      expect(no.textContent).toBe(texto)
      // Leitura de CARGA: 16px/1.5. Encolhê-la é encolher a declaração.
      expect(no.className).toContain('text-base')
      expect(no.className).toContain('leading-relaxed')
      // Nada que corte a fronteira do EXPORT-06 fora da tela.
      for (const corte of ['truncate', 'line-clamp', 'overflow-hidden', 'whitespace-nowrap']) {
        expect(no.className).not.toContain(corte)
      }
    }
    // Sem contêiner de altura fixa nem scroll interno no bloco (E1/overflow).
    const bloco = container.querySelector('[data-bloco="pedir-copia"]') as HTMLElement
    expect(bloco.className).not.toMatch(/\bh-\d/)
    expect(bloco.className).not.toContain('overflow-')
  })

  it('(z8) NEGATIVA de acessibilidade: zero `text-xs` autorado neste componente', () => {
    const proibido = ['text', 'xs'].join('-')
    expect(lerFonte('../PedirCopiaBloco.tsx')).not.toContain(proibido)
    expect(`x${proibido}y`).toContain(proibido) // META-TEST
  })
})

/** Lê um arquivo-fonte relativo a ESTE teste (sonda de texto-fonte, escopo declarado). */
function lerFonte(relativo: string): string {
  return readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
}

/**
 * O backstop estrutural de E2/error, extraído para valer nos DOIS cenários que
 * desabilitam o botão. A asserção é sobre a ESTRUTURA (existe irmão com texto?),
 * nunca sobre uma string — é isso que a torna resistente a um `disabled` novo.
 */
function exigirMotivoEmTodoBotaoDesabilitado(container: HTMLElement) {
  const desabilitados = Array.from(container.querySelectorAll('button[disabled]'))
  expect(desabilitados.length).toBeGreaterThan(0)
  for (const botao of desabilitados) {
    const irmaosComTexto = Array.from(botao.parentElement?.children ?? [])
      .filter((no) => no !== botao)
      .map((no) => (no.textContent ?? '').trim())
      .filter((texto) => texto.length > 0)
    expect(
      irmaosComTexto.length,
      'botão desabilitado sem nenhum irmão de motivo visível ao lado',
    ).toBeGreaterThan(0)
  }
}
