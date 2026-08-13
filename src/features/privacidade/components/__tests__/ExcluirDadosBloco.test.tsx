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
 *    repo-wide que reprova a própria spec — na Phase 43 com o advérbio de
 *    automatismo, e na Phase 44 com os verbos deste direito. ⚠ E o ban da Phase 44
 *    **não é estendido a esta fase**: ela existe para conjugar esses verbos.
 *
 *    ⚠ Este próprio parágrafo já foi uma violação: escrito com o advérbio ao lado do
 *    substantivo, ele disparava o portão de coocorrência do `copyPortoesLgpd` — a
 *    prosa que explica a armadilha caindo nela. Foi reescrito para nomear os dois
 *    casos sem justapor os tokens, e não isentando o arquivo.
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
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const mocks = vi.hoisted(() => ({
  pedido: vi.fn(),
  invocar: vi.fn(),
  cancelarInvocar: vi.fn(),
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
  return {
    ...real,
    invocarPedirExclusao: mocks.invocar,
    invocarCancelarExclusao: mocks.cancelarInvocar,
  }
})

import { ExcluirDadosBloco } from '../ExcluirDadosBloco'
import { COPY_CONFIRMAR_EXCLUSAO } from '../ConfirmarExclusaoDialog'
import { COPY_EXCLUIR_DADOS, ExclusaoError } from '../../services/exclusaoService'
import { CANAL_PRIVACIDADE_EMAIL } from '../../constants/canalPrivacidade'
import { RECIBO_EXCLUSAO } from '../../constants/reciboExclusao.generated'

const EXECUTAR_EM = '2026-08-20T12:00:00.000Z'
const DATA_ALVO = '20/08/2026'

/** Estado A: leitura concluída, nenhum pedido em aberto, config presente, tem candidatura. */
const ESTADO_A = {
  data: {
    pedido: null,
    dias: 15,
    temCandidatura: true,
    // Os dois fatos que decidem QUAIS linhas do recibo se aplicam — medidos, não
    // presumidos (`lerRecorteDoTitular`).
    temCurriculo: true,
    temDecisaoRegistrada: true,
  },
  isLoading: false,
  isError: false,
} as const

/** Estado B: pedido agendado, dentro da janela. */
const agendadoEm = (executar_em: string | null = EXECUTAR_EM) =>
  comEstado({ pedido: { situacao: 'agendado', executar_em } })

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

/**
 * ⚠ O CTA NÃO É MAIS O PEDIDO (45-08 Task 1). Ele abre a leitura, e o pedido só sai
 * depois do segundo portão — Invariante 7: confirmação ANINHADA, sem digitação-refém.
 * Estes três cliques são o caminho INTEIRO até a mutação, e é de propósito que o teste
 * o percorra em vez de chamar o handler: um teste que atalhasse o diálogo continuaria
 * verde no dia em que alguém removesse a confirmação.
 *
 * `fireEvent` (e não `userEvent`) porque o Radix põe `pointer-events: none` no `body`
 * enquanto um modal está aberto, e o guarda de ponteiro do `userEvent` recusaria o
 * clique seguinte — idioma já usado em `EditarJanelaDialog.test.tsx`.
 */
function pedirPeloDialogo() {
  fireEvent.click(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta }))
  fireEvent.click(screen.getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.avancar }))
  fireEvent.click(screen.getByRole('button', { name: COPY_CONFIRMAR_EXCLUSAO.confirmar }))
}

beforeEach(() => {
  mocks.pedido.mockReset()
  mocks.invocar.mockReset()
  // Sem este reset, a implementação "em voo" de um caso vazaria para o seguinte e a
  // ordem dos testes viraria parte do contrato — o tipo de acoplamento que faz uma
  // suíte verde deixar de significar alguma coisa.
  mocks.cancelarInvocar.mockReset()
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
    const { container } = renderizar()

    pedirPeloDialogo()

    const cta = await screen.findByRole('button', { name: /Registrando seu pedido/i })
    await waitFor(() => expect(cta).toHaveAttribute('aria-busy', 'true'))
    expect(cta).toBeDisabled()
    expect(cta).toHaveTextContent(COPY_EXCLUIR_DADOS.ctaEmVoo)
    expect(container.querySelector('.animate-spin')).toBeTruthy()

    // Duplo clique impossível.
    fireEvent.click(cta)
    expect(mocks.invocar).toHaveBeenCalledTimes(1)
  })

  it('(w5) mutation com erro: alerta inline destructive com "Nada foi apagado."', async () => {
    mocks.invocar.mockRejectedValue(new ExclusaoError(COPY_EXCLUIR_DADOS.erroTitulo, 'SERVER_ERROR'))
    renderizar()

    pedirPeloDialogo()

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

  /**
   * ⚠ ESTE TESTE FOI INVERTIDO em 2026-08-05, e a inversão é de compliance, não de UX.
   *
   * Ele exigia o oposto: sem candidatura, CTA ausente e copy de vazio presente — seguindo a
   * 45-UI-SPEC §Empty, cuja premissa era *"a seção 4 quando não há dado nenhum a apagar"*.
   *
   * **A premissa é falsa, e o artefato gerado pelo 45-02 a mede.** Dos 20 itens do recibo de
   * exclusão, **16 têm `aplicavel_quando: "sempre"`** — entre eles `dados_de_cadastro`, que
   * cobre nome, e-mail, CPF, telefone, data de nascimento, endereço, redes sociais e
   * disponibilidade. Só três dependem de decisão registrada e um de currículo.
   *
   * Logo um titular com cadastro e zero candidaturas tem **dezesseis itens a apagar**, e a
   * versão anterior desta tela **negava a ele o exercício de um direito do Art. 18** — o
   * direito que esta fase inteira existe para tornar exercível. "Um botão que apaga nada é um
   * botão que mente" continua verdadeiro como princípio; o que era falso é que este botão
   * apagasse nada.
   *
   * O que permanece condicionado a `temCandidatura` é o ponteiro para a saída branda, que só
   * serve a quem tem processo em andamento.
   */
  it('(w8) titular SEM candidatura ainda vê o CTA — ele tem cadastro, e cadastro é dado a apagar', () => {
    mocks.pedido.mockReturnValue(comEstado({ temCandidatura: false }))
    renderizar()

    // O direito é exercível: o botão existe e está habilitado.
    const cta = screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta })
    expect(cta).toBeInTheDocument()
    expect(cta).toBeEnabled()

    // E a tela NÃO afirma que não há o que apagar.
    expect(screen.queryByText(COPY_EXCLUIR_DADOS.vazioTitulo)).toBeNull()
    expect(screen.queryByText(COPY_EXCLUIR_DADOS.vazioCorpo)).toBeNull()

    // O ponteiro para "retirar minha candidatura" some — ele não serve a quem não tem uma.
    expect(screen.queryByText(COPY_EXCLUIR_DADOS.soQuerSairTitulo)).toBeNull()
  })

  it('(w8b) titular COM candidatura vê o CTA e também o ponteiro para a saída branda', () => {
    mocks.pedido.mockReturnValue(comEstado({ temCandidatura: true }))
    renderizar()

    expect(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta })).toBeEnabled()
    // A Invariante 2 exige que este bloco NOMEIE a outra ação — sem link.
    expect(screen.getByText(COPY_EXCLUIR_DADOS.soQuerSairTitulo)).toBeInTheDocument()
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
    const segunda = renderizar()
    pedirPeloDialogo()
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

/**
 * Plano 45-08 Task 3 — Estados B e C, o cancelamento, e o que a tela NUNCA declara.
 *
 * A assimetria que organiza este bloco: falhar ao **pedir** deixa a pessoa segura
 * ("Nada foi apagado"); falhar ao **cancelar** deixa a pessoa **em risco**. Por isso a
 * copy dos dois erros é oposta, e por isso a frase tranquilizadora é permitida em um e
 * proibida no outro.
 */
describe('ExcluirDadosBloco — Estado B: a janela de arrependimento utilizável', () => {
  it('(w15) BACKSTOP E5·long-text: em QUALQUER render do Estado B, cancelar coocorre com "não voltam"', () => {
    // A regex cobre as TRÊS redações que o próprio contrato usa — "candidaturas
    // encerradas não voltam" (Estado A), "não reabre as candidaturas encerradas"
    // (Estado B) e "candidaturas encerradas não foram reabertas" (sucesso). Uma regex
    // presa a uma só ordem reprovaria a copy que a spec exige: é a mesma classe de
    // defeito que o grep repo-wide já custou duas vezes a este projeto.
    const naoVoltam =
      /(candidaturas[^.]{0,60}n[ãa]o\s+(volt|foram\s+reabert))|(n[ãa]o\s+reabre[^.]{0,60}candidaturas)/i
    const mencionaCancelar = /cancel/i

    // META-TEST primeiro: sem isto, uma regex quebrada passaria verde para sempre.
    expect(naoVoltam.test(COPY_EXCLUIR_DADOS.cancelamento)).toBe(true)
    expect(naoVoltam.test(COPY_EXCLUIR_DADOS.agendadoNota)).toBe(true)
    expect(naoVoltam.test(COPY_EXCLUIR_DADOS.canceladoCorpo)).toBe(true)

    // Os três sub-estados do Estado B: parado, em voo e com erro.
    const cenarios: Array<() => void> = [
      () => {},
      () => mocks.cancelarInvocar.mockImplementation(() => new Promise(() => {})),
    ]

    for (const preparar of cenarios) {
      mocks.pedido.mockReturnValue(agendadoEm())
      preparar()
      const { container, unmount } = renderizar()
      const texto = (container.textContent ?? '').replace(/\s+/g, ' ')
      expect(mencionaCancelar.test(texto)).toBe(true)
      expect(
        naoVoltam.test(texto),
        `O Estado B menciona cancelamento sem a frase de que as candidaturas encerradas ` +
          `não voltam — sozinha, a menção promete um desfazer que não existe.\n${texto}`,
      ).toBe(true)
      unmount()
    }
  })

  it('(w16) o recibo em tempo futuro está visível SEM nenhuma interação', () => {
    mocks.pedido.mockReturnValue(agendadoEm())
    const { container } = renderizar()

    // Uma janela de arrependimento só vale se a pessoa souber do que se arrepender:
    // sem a prévia, os dias são espera, não escolha.
    expect(container.querySelector('[data-recibo]')).toBeTruthy()
    expect(container.querySelectorAll('[data-recibo-linha="sai"]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('[data-recibo-linha="mantem"]').length).toBeGreaterThan(0)
    // Em TEMPO FUTURO — o passado é do e-mail, depois da execução.
    expect(screen.getByText(RECIBO_EXCLUSAO.cabecalhos.sai.futuro)).toBeInTheDocument()
    expect(screen.queryByText(RECIBO_EXCLUSAO.cabecalhos.sai.passado)).toBeNull()
  })

  it('(w17) "Cancelar a exclusão" NÃO é destructive — cancelar é a ação construtiva', () => {
    mocks.pedido.mockReturnValue(agendadoEm())
    renderizar()

    const botao = screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cancelarCta })
    expect(botao).toBeEnabled()
    expect(botao.className).toContain('min-h-[44px]')
    // Pintá-la de vermelho diria à pessoa que interromper uma exclusão é a coisa
    // perigosa a fazer.
    expect(botao.className).not.toContain('destructive')
    expect(botao.className).not.toContain('accent')
    // E o CTA de apagar foi SUBSTITUÍDO: pedir de novo não faz sentido aqui.
    expect(screen.queryByRole('button', { name: COPY_EXCLUIR_DADOS.cta })).toBeNull()
  })

  it('(w18) cancelamento em voo: a DATA-ALVO permanece visível, com motivo irmão', async () => {
    mocks.pedido.mockReturnValue(agendadoEm())
    mocks.cancelarInvocar.mockImplementation(() => new Promise(() => {}))
    const { container } = renderizar()

    fireEvent.click(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cancelarCta }))

    const emVoo = await screen.findByRole('button', { name: /Cancelando/i })
    await waitFor(() => expect(emVoo).toHaveAttribute('aria-busy', 'true'))
    expect(emVoo).toBeDisabled()

    // ⚠ A DATA CONTINUA LÁ. Sumi-la durante o voo faria parecer que o cancelamento já
    // valeu — e a pessoa fecharia a página acreditando num desfecho que não houve.
    expect(screen.getByText(COPY_EXCLUIR_DADOS.agendadoLinha(DATA_ALVO))).toBeInTheDocument()
    exigirMotivoEmTodoBotaoDesabilitado(container)
  })

  it('(w19) erro do cancelamento: a data, o canal humano, e ZERO tranquilização', async () => {
    mocks.pedido.mockReturnValue(agendadoEm())
    mocks.cancelarInvocar.mockRejectedValue(
      new ExclusaoError(COPY_EXCLUIR_DADOS.cancelarErroTitulo, 'SERVER_ERROR'),
    )
    renderizar()

    fireEvent.click(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cancelarCta }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(COPY_EXCLUIR_DADOS.cancelarErroTitulo)
    // A data e o canal humano, porque falhar ao cancelar deixa a pessoa EM RISCO.
    expect(alerta.textContent ?? '').toContain(DATA_ALVO)
    expect(alerta.textContent ?? '').toContain(CANAL_PRIVACIDADE_EMAIL)
    expect(alerta.className).toContain('destructive')

    // ⚠ A ASSERÇÃO DE AUSÊNCIA É SOBRE A MENSAGEM GENÉRICA DO OUTRO ERRO, não sobre o
    // verbo "tentar": a copy aprovada DIZ "tente de novo", acompanhada da data e da
    // saída humana. Um ban do verbo reprovaria a copy que a spec exige — a terceira
    // vez que este projeto pagaria por essa classe de grep.
    expect(alerta.textContent ?? '').not.toContain(COPY_EXCLUIR_DADOS.erroCorpo)
    expect(alerta.textContent ?? '').not.toContain(['Nada foi', 'apagado.'].join(' '))
  })

  it('(w20) sucesso do cancelamento: mensagem PERSISTENTE, aria-live, sem toast', async () => {
    mocks.pedido.mockReturnValue(agendadoEm())
    mocks.cancelarInvocar.mockResolvedValue({
      ok: true,
      acao: 'cancelar',
      cancelado_em: '2026-08-06T12:00:00.000Z',
    })
    const { container } = renderizar()

    fireEvent.click(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cancelarCta }))
    // O servidor confirmou; a leitura invalidada devolve a situação nova. A tela só sai
    // do Estado B por FATO do servidor, nunca pelo que foi pedido.
    mocks.pedido.mockReturnValue(comEstado({ pedido: { situacao: 'cancelado', executar_em: null } }))

    const sucesso = await screen.findByText(COPY_EXCLUIR_DADOS.canceladoTitulo)
    expect(sucesso).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.canceladoCorpo)).toBeInTheDocument()
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy()
    // O direito volta a ser exercível — e a tela não esconde isso.
    expect(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cta })).toBeEnabled()
  })

  it('(w21) data ilegível no Estado B: a frase que a conteria é OMITIDA', () => {
    mocks.pedido.mockReturnValue(agendadoEm('nao-e-uma-data'))
    const { container } = renderizar()

    // §Formatação: "um travessão no lugar da data de uma exclusão irreversível é pior
    // que a frase ausente". A asserção sai da CONSTANTE e não de um literal: escrever a
    // frase aqui a faria contar como mais uma promessa de exclusão para o portão
    // `copyPortoesLgpd` (CONSOL-04) — um teste que prova a ausência de uma frase não
    // deve entrar na conta de quem a promete.
    expect(screen.queryByText(COPY_EXCLUIR_DADOS.agendadoLinha(DATA_ALVO))).toBeNull()
    const painel = container.querySelector('[data-estado="agendado"]') as HTMLElement
    expect(painel).toBeTruthy()
    const texto = painel.textContent ?? ''
    expect(texto).not.toContain('Invalid Date')
    expect(texto).not.toContain('NaN')
    expect(texto).not.toContain('undefined')
    // O painel NÃO some: o título e a nota do que não volta continuam.
    expect(screen.getByText(COPY_EXCLUIR_DADOS.agendadoTitulo)).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.agendadoNota)).toBeInTheDocument()
  })
})

describe('ExcluirDadosBloco — Estado C: em andamento, e nenhuma palavra de desfecho', () => {
  const emExecucao = () =>
    mocks.pedido.mockReturnValue(
      comEstado({ pedido: { situacao: 'executando', executar_em: EXECUTAR_EM } }),
    )

  it('(w22) ZERO ação: sem cancelar, sem tentar de novo, sem barra de progresso', () => {
    emExecucao()
    const { container } = renderizar()

    const bloco = screen.getByTestId('bloco-excluir-dados')
    expect(bloco).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.executandoTitulo)).toBeInTheDocument()
    expect(screen.getByText(COPY_EXCLUIR_DADOS.executandoCorpo)).toBeInTheDocument()

    // A retomabilidade é do MOTOR: um retry na mão do titular seria convidá-lo a
    // re-disparar uma mutação destrutiva não-atômica.
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(container.querySelectorAll('[role="progressbar"]').length).toBe(0)
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0)
  })

  it('(w23) nenhuma palavra de desfecho, nenhuma porcentagem, nenhum sistema nomeado', () => {
    emExecucao()
    const { container } = renderizar()
    const texto = (container.textContent ?? '').toLowerCase()

    // Montadas em runtime (idioma 42-11). Enquanto os TRÊS sistemas não confirmam, a
    // copy diz "em andamento" — nunca um sinônimo de desfecho (Invariante 5).
    const desfecho = [
      ['conclu', 'ído'].join(''),
      ['conclu', 'ída'].join(''),
      ['apagad', 'o'].join(''),
      ['pron', 'to'].join(''),
      ['finaliza', 'do'].join(''),
    ]
    for (const palavra of desfecho) {
      expect(texto.includes(palavra), `palavra de desfecho "${palavra}" no Estado C`).toBe(false)
      expect(`x${palavra}y`).toContain(palavra) // META-TEST
    }

    // Invariante 12: nenhum detalhe de qual sistema já respondeu, nenhuma contagem.
    expect(texto).not.toContain('%')
    for (const interno of ['storage', 'postgres', 'auth', 'bucket', 'sqlstate']) {
      expect(texto.includes(interno), `valor interno "${interno}" vazou`).toBe(false)
    }
  })

  it('(w24) "Nada foi apagado." aparece SOMENTE no erro de registro do pedido', async () => {
    // Aqui ela é obrigatória: a falha acontece ANTES de qualquer mutação, e o titular
    // precisa saber de que lado da linha o sistema parou.
    mocks.invocar.mockRejectedValue(
      new ExclusaoError(COPY_EXCLUIR_DADOS.erroTitulo, 'SERVER_ERROR'),
    )
    const primeira = renderizar()
    pedirPeloDialogo()
    expect(await screen.findByRole('alert')).toHaveTextContent(COPY_EXCLUIR_DADOS.erroTitulo)
    expect(COPY_EXCLUIR_DADOS.erroTitulo).toContain(['Nada foi', 'apagado.'].join(' '))
    primeira.unmount()

    const frase = ['Nada foi', 'apagado.'].join(' ')

    // Estado C — a partir do início da execução ela seria ingarantível (Invariante 5).
    emExecucao()
    const segunda = renderizar()
    expect(segunda.container.textContent ?? '').not.toContain(frase)
    segunda.unmount()

    // Erro do cancelamento — o pior lugar possível para tranquilizar alguém.
    mocks.pedido.mockReturnValue(agendadoEm())
    mocks.cancelarInvocar.mockRejectedValue(
      new ExclusaoError(COPY_EXCLUIR_DADOS.cancelarErroTitulo, 'SERVER_ERROR'),
    )
    const terceira = renderizar()
    fireEvent.click(screen.getByRole('button', { name: COPY_EXCLUIR_DADOS.cancelarCta }))
    await screen.findByRole('alert')
    expect(terceira.container.textContent ?? '').not.toContain(frase)
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
