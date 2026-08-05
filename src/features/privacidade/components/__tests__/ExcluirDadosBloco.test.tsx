/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 45 / Plano 45-03 Task 3 (TDD RED) — a seção 4 de `/candidato/privacidade`:
 * o bloco que pede a exclusão dos dados (ERASE-05 / ERASE-06).
 *
 * Cinco dos casos abaixo são o que a 45-UI-SPEC chama de **backstop**, e três deles
 * existem porque a asserção ingênua correspondente **passaria com o defeito presente**:
 *
 *  - **(w3)** o `disabled` sem motivo é ESTRUTURAL (molde do (z3) do `PedirCopiaBloco`):
 *    percorre todo `button[disabled]` e exige um irmão com texto visível. Uma asserção
 *    sobre uma string não pegaria um `disabled` acrescentado depois. O 42-10 mediu 3
 *    falsos verdes exatamente dessa classe.
 *
 *  - **(w4)** a menção a cancelamento é verificada por **COOCORRÊNCIA**, não por
 *    ausência. A frase "você pode cancelar" é LEGÍTIMA — acompanhada. Sozinha, ela
 *    promete um desfazer que não existe: cancelar a exclusão **não reabre** as
 *    candidaturas que o pedido já encerrou (D-45-06 / Invariante 3). Um grep de
 *    ausência simples reprovaria a copy que a spec EXIGE.
 *
 *  - **(w5)** a sonda de texto-fonte tem **ESCOPO DECLARADO** e remove as linhas de
 *    comentário antes de procurar. Este projeto já pagou DUAS vezes pelo grep
 *    repo-wide que reprova a própria spec (43, "automaticamente"; 44, os verbos de
 *    exclusão). ⚠ E o ban da Phase 44 (`apagado`/`excluído`/`eliminado`) **não é
 *    estendido a esta fase**: ela existe para conjugar esses verbos.
 *
 * Os literais proibidos são MONTADOS EM RUNTIME (idioma 42-11): um arquivo que proíbe
 * uma string e a contém verbatim é sua própria primeira violação.
 *
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§Seção 4 · §Bans)
 * @see src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx (o molde)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const mocks = vi.hoisted(() => ({
  pedido: vi.fn(),
  invocar: vi.fn(),
}))

vi.mock('@/store/authStore', () => ({ useCandidato: () => ({ id: 'cand-1' }) }))
vi.mock('../../hooks/usePedidoExclusao', () => ({
  usePedidoExclusao: () => mocks.pedido(),
}))
vi.mock('@/lib/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() }, from: vi.fn() },
}))
vi.mock('../../services/exclusaoService', async () => {
  const real =
    await vi.importActual<typeof import('../../services/exclusaoService')>(
      '../../services/exclusaoService',
    )
  return { ...real, invocarPedirExclusao: mocks.invocar }
})

import { ExcluirDadosBloco } from '../ExcluirDadosBloco'
import { COPY_EXCLUIR_DADOS, ExclusaoError } from '../../services/exclusaoService'

const EXECUTAR_EM = '2026-08-20T12:00:00.000Z'
const DATA_ALVO = '20/08/2026'

/** Estado A: leitura concluída, nenhum pedido em aberto, config presente, tem candidatura. */
const ESTADO_A = {
  data: { pedido: null, dias: 15, temCandidatura: true },
  isLoading: false,
  isError: false,
} as const

function comEstado(parcial: Record<string, unknown>) {
  return {
    ...ESTADO_A,
    data: { ...ESTADO_A.data, ...parcial },
  }
}

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ExcluirDadosBloco />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mocks.pedido.mockReset()
  mocks.invocar.mockReset()
  mocks.pedido.mockReturnValue(ESTADO_A)
})

describe('ExcluirDadosBloco — os oito comportamentos da seção 4', () => {
  it('(w1) Estado A: prosa, o que o cancelamento NÃO desfaz, o ponteiro ao Painel e o CTA', () => {
    renderizar()

    expect(screen.getByText(COPY_EXCLUIR_DADOS.abertura)).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.oQueAcontece(15))).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.cancelamento)).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.soQuerSair)).toBeInTheDocument()

    const cta = screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta })
    expect(cta).toBeEnabled()
    // Glass-branco e alvo tátil — NUNCA accent (esta fase tem ZERO usos), NUNCA
    // destructive (o peso vermelho vive dentro da confirmação, Invariante 6).
    expect(cta.className).toContain('min-h-[44px]')
    expect(cta.className).not.toContain('destructive')
    expect(cta.className).not.toContain('accent')

    // O ponteiro é TEXTO — sem link e sem botão (Invariante 2): um link aqui faria
    // "quero sair desta vaga" virar caminho de dois cliques até o irreversível.
    const bloco = screen.getByTestId('bloco-excluir-dados')
    expect(bloco.querySelectorAll('a').length).toBe(0)
  })

  it('(w2) leitura em voo: Glass pulsante de 1 linha e o CTA NÃO aparece pela metade', () => {
    mocks.pedido.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    const { container } = renderizar()

    expect(container.querySelectorAll('.animate-pulse').length).toBe(1)
    expect(screen.queryByRole('button')).toBeNull()
    // A prosa de carga é estática — ela não espera pelo estado.
    expect(screen.getByText(COPY_EXCLUIR_DADOS.abertura)).toBeInTheDocument()
  })

  it('(w3) leitura com erro: o bloco NÃO some e o CTA fica desabilitado COM motivo visível', () => {
    mocks.pedido.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    const { container } = renderizar()

    // O bloco sobrevive: escopo de SEÇÃO, nunca de página.
    expect(screen.getByTestId('bloco-excluir-dados')).toBeInTheDocument()
    const cta = screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta })
    expect(cta).toBeDisabled()
    // ⚠ Ao contrário do `PedirCopiaBloco` (que renderiza o CTA "por via das dúvidas"),
    // AQUI o botão é desabilitado: um pedido duplicado aqui não é um download a mais.
    const id = cta.getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    const motivo = container.querySelector(`#${id}`)
    expect((motivo?.textContent ?? '').trim().length).toBeGreaterThan(0)
    expect(cta).not.toHaveAttribute('title')
  })

  it('(w4) mutation em voo: "Registrando seu pedido…", aria-busy, Loader2 e motivo irmão', async () => {
    mocks.invocar.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    const { container } = renderizar()

    await user.click(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta }))

    const cta = screen.getByRole('button', { name: /Registrando seu pedido/i })
    await waitFor(() => expect(cta).toHaveAttribute('aria-busy', 'true'))
    expect(cta).toBeDisabled()
    expect(cta).toHaveTextContent(COPY_EXCLUIR_DADOS.ctaEmVoo)
    expect(container.querySelector('.animate-spin')).toBeTruthy()

    // Duplo clique impossível.
    await user.click(cta)
    expect(mocks.invocar).toHaveBeenCalledTimes(1)
  })

  it('(w5) mutation com erro: alerta inline destructive com "Nada foi apagado."', async () => {
    mocks.invocar.mockRejectedValue(new ExclusaoError(COPY_EXCLUIR_DADOS.erroTitulo, 'SERVER_ERROR'))
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(COPY_EXCLUIR_DADOS.erroTitulo)
    expect(alerta).toHaveTextContent(COPY_EXCLUIR_DADOS.erroCorpo)
    expect(alerta.className).toContain('destructive')
    // A frase só é permitida NESTE erro — que acontece ANTES de qualquer mutação.
    expect(COPY_EXCLUIR_DADOS.erroTitulo).toMatch(/Nada foi apagado\./)
  })

  it('(w6) Estado B: "Exclusão agendada", a data por extenso e a nota do que não volta', () => {
    mocks.pedido.mockReturnValue(
      comEstado({ pedido: { situacao: 'agendado', executar_em: EXECUTAR_EM } }),
    )
    renderizar()

    expect(screen.getByText(COPY_EXCLUIR_DADOS.agendadoTitulo)).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.agendadoLinha(DATA_ALVO))).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.agendadoNota)).toBeInTheDocument()
    // O CTA de apagar é SUBSTITUÍDO — pedir de novo não faz sentido aqui.
    expect(screen.queryByRole('button', { name: COPY_EXCLUIR_DADOS.cta })).toBeNull()
  })

  it('(w7) config ausente: a data alvo aparece, sem NaN, sem número inventado, sem sumir', () => {
    mocks.pedido.mockReturnValue(
      comEstado({ dias: null, pedido: { situacao: 'agendado', executar_em: EXECUTAR_EM } }),
    )
    const { container } = renderizar()

    expect(screen.getByTestId('bloco-excluir-dados')).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.agendadoLinha(DATA_ALVO))).toBeInTheDocument()
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('NaN')
    expect(texto).not.toContain('undefined')
    expect(texto).not.toContain('null')
    // Nenhum número de dias é inventado quando a config não veio.
    expect(texto).not.toMatch(/\b\d+\s+dias\b/)
  })

  it('(w8) titular sem candidatura nenhuma: o CTA NÃO é renderizado e a copy de vazio aparece', () => {
    mocks.pedido.mockReturnValue(comEstado({ temCandidatura: false }))
    renderizar()

    expect(screen.getByText(COPY_EXCLUIR_DADOS.vazioTitulo)).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.vazioCorpo)).toBeInTheDocument()
    // Um botão que apaga nada é um botão que mente.
    expect(screen.queryByRole('button', { name: COPY_EXCLUIR_DADOS.cta })).toBeNull()
  })
})

describe('ExcluirDadosBloco — os backstops da 45-UI-SPEC', () => {
  it('(w9) BACKSTOP ESTRUTURAL: nenhum botão desabilitado sem irmão de motivo visível', async () => {
    // Cenário 1 — leitura falhou.
    mocks.pedido.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    const primeira = renderizar()
    exigirMotivoEmTodoBotaoDesabilitado(primeira.container)
    primeira.unmount()

    // Cenário 2 — mutation em voo. Mesmo invariante, outra causa.
    mocks.pedido.mockReturnValue(ESTADO_A)
    mocks.invocar.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    const segunda = renderizar()
    await user.click(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta }))
    await waitFor(() =>
      expect(segunda.container.querySelectorAll('button[disabled]').length).toBe(1),
    )
    exigirMotivoEmTodoBotaoDesabilitado(segunda.container)
  })

  it('(w10) BACKSTOP DE COOCORRÊNCIA: mencionar cancelamento obriga a frase das candidaturas', () => {
    // A asserção é sobre o RENDER, nos dois estados em que o cancelamento aparece.
    const cenarios = [
      ESTADO_A,
      comEstado({ pedido: { situacao: 'agendado', executar_em: EXECUTAR_EM } }),
    ]
    const mencionaCancelar = /cancel/i
    // A prova de que as candidaturas encerradas NÃO voltam, em QUALQUER redação — e
    // a spec usa as duas ordens de palavras ("candidaturas encerradas não voltam" no
    // Estado A, "não reabre as candidaturas encerradas" no Estado B). Uma regex presa
    // a uma só ordem reprovaria a copy que o próprio contrato exige — a mesma classe
    // de defeito que o grep repo-wide já custou duas vezes a este projeto.
    const naoVoltam = /(candidaturas[^.]{0,40}n[ãa]o\s+volt)|(n[ãa]o\s+reabre[^.]{0,40}candidaturas)/i

    for (const cenario of cenarios) {
      mocks.pedido.mockReturnValue(cenario)
      const { container, unmount } = renderizar()
      const texto = (container.textContent ?? '').replace(/\s+/g, ' ')
      if (mencionaCancelar.test(texto)) {
        expect(
          naoVoltam.test(texto),
          `O bloco menciona cancelamento sem a frase de que as candidaturas encerradas ` +
            `não voltam — sozinha, a menção promete um desfazer que não existe.\n${texto}`,
        ).toBe(true)
      }
      unmount()
    }

    // META-TEST: a regex de coocorrência realmente casa a frase da spec.
    expect(naoVoltam.test(COPY_EXCLUIR_DADOS.cancelamento)).toBe(true)
    expect(naoVoltam.test(COPY_EXCLUIR_DADOS.agendadoNota)).toBe(true)
  })

  it('(w11) sonda de texto-fonte, ESCOPO DECLARADO e sem linhas de comentário', () => {
    const escopo = {
      'ExcluirDadosBloco.tsx': semComentarios(lerFonte('../ExcluirDadosBloco.tsx')),
      'exclusaoService.ts': semComentarios(lerFonte('../../services/exclusaoService.ts')),
    }

    // As NOVE strings banidas da §Bans, nas duas famílias aplicáveis a esta fase:
    // totalidade (Invariante 4 — é factualmente falso) e vocabulário de soft delete
    // (D-45-09 — prometeria um estado recuperável que não existirá).
    const banidas = [
      ['todos', 'os', 'seus', 'dados'].join(' '),
      ['tudo', 'o', 'que', 'temos', 'sobre', 'você'].join(' '),
      ['todos', 'os', 'seus', 'registros'].join(' '),
      ['apagamos', 'tudo'].join(' '),
      ['desativar', 'conta'].join(' '),
      ['pausar', 'conta'].join(' '),
      ['conta', 'suspensa'].join(' '),
      ['conta', 'inativa'].join(' '),
      ['desativa', 'da'].join(''),
    ]

    for (const [arquivo, conteudo] of Object.entries(escopo)) {
      for (const proibida of banidas) {
        expect(
          conteudo.toLowerCase().includes(proibida.toLowerCase()),
          `string banida "${proibida}" encontrada em ${arquivo}`,
        ).toBe(false)
      }
    }

    // META-TEST: uma grafia errada em `banidas` passaria verde para sempre sem isto.
    for (const proibida of banidas) {
      expect(`prefixo ${proibida} sufixo`.toLowerCase()).toContain(proibida.toLowerCase())
    }
  })

  it('(w12) NEGATIVAS de escala e de componente: zero 12px e zero AsyncState', () => {
    const fonte = semComentarios(lerFonte('../ExcluirDadosBloco.tsx'))
    const tamanhoProibido = ['text', 'xs'].join('-')
    expect(fonte).not.toContain(tamanhoProibido)
    // `AsyncState` envolve em Glass escuro (tratamento de card de RH) — a UI-SPEC o
    // declara FORA de escopo nesta fase para não ser alcançado por reflexo.
    expect(fonte).not.toContain(['Async', 'State'].join(''))
    expect(`x${tamanhoProibido}y`).toContain(tamanhoProibido) // META-TEST
  })

  it('(w13) o serviço nunca usa projeção-curinga — allowlist nomeada de colunas', () => {
    const fonte = semComentarios(lerFonte('../../services/exclusaoService.ts'))
    const curinga = ["select('", '*', "')"].join('')
    expect(fonte).not.toContain(curinga)
    expect(fonte).not.toContain(['select("', '*', '")'].join(''))
    expect(`x${curinga}y`).toContain(curinga) // META-TEST
  })

  it('(w14) a prosa de consequência é leitura de CARGA e não é truncada a 320px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
    const { container } = renderizar()

    for (
      const texto of [
        COPY_EXCLUIR_DADOS.abertura,
        COPY_EXCLUIR_DADOS.cancelamento,
        COPY_EXCLUIR_DADOS.soQuerSair,
      ]
    ) {
      const no = screen.getByText(texto)
      expect(no.textContent).toBe(texto) // íntegra, nenhum caractere a menos
      expect(no.className).toContain('text-base')
      expect(no.className).toContain('leading-relaxed')
      for (const corte of ['truncate', 'line-clamp', 'overflow-hidden', 'whitespace-nowrap']) {
        expect(no.className).not.toContain(corte)
      }
    }
    // Sem contêiner de altura fixa, sem scroll interno, sem accordion.
    const bloco = container.querySelector('[data-bloco="excluir-dados"]') as HTMLElement
    expect(bloco.className).not.toMatch(/\bh-\d/)
    expect(bloco.className).not.toContain('overflow-')
    expect(container.querySelectorAll('details').length).toBe(0)
  })
})

/** Lê um arquivo-fonte relativo a ESTE teste (sonda de escopo declarado). */
function lerFonte(relativo: string): string {
  return readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
}

/**
 * Remove as linhas de comentário antes da sonda. Sem isto, a justificativa de um ban
 * escrita no docblock reprovaria o próprio arquivo que a honra — o defeito que este
 * projeto já pagou duas vezes.
 */
function semComentarios(fonte: string): string {
  return fonte
    .split('\n')
    .filter((linha) => !/^\s*(\/\/|\/\*|\*)/.test(linha))
    .join('\n')
}

/**
 * O backstop estrutural de E2/error, no molde exato do (z3) do `PedirCopiaBloco`.
 * A asserção é sobre a ESTRUTURA (existe irmão com texto?), nunca sobre uma string —
 * é isso que a torna resistente a um `disabled` acrescentado no futuro.
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
