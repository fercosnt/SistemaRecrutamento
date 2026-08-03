/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 42 / Plano 42-10 Task 2 (TDD RED) — `ResponderRevisaoDialog` (REVISAO-03/05).
 *
 * ── O QUE ESTA SUÍTE EXISTE PARA IMPEDIR ──────────────────────────────────────────
 * O diálogo é a face de interface de um guard que vive no servidor. Há três formas
 * conhecidas de errar isso, e cada uma tem aqui um teste que morde:
 *
 *  1. **Transformar a recusa num toast.** Um toast some em 4 segundos; a recusa do
 *     REVISAO-05 é justamente o caso em que o operador precisa ler e agir. O teste
 *     assere que o diálogo PERMANECE ABERTO, que o texto digitado é PRESERVADO, e que
 *     um alerta inline verbatim aparece.
 *  2. **Oferecer um retry que não existe.** Tentar de novo nunca vai funcionar — a
 *     recusa é sobre QUEM é o usuário. O teste falha se qualquer botão de tentar
 *     novamente / reenviar for renderizado nesse estado.
 *  3. **Rotular os dois recuos com o mesmo verbo genérico.** "Fechar sem registrar"
 *     abandona a resposta inteira; "Voltar" recua um passo dentro da confirmação. Os
 *     dois podem estar visíveis no mesmo fluxo, e o operador precisa saber qual está
 *     tomando. O teste assere os dois rótulos exatos E a AUSÊNCIA do verbo genérico.
 *
 * A mutação é mockada: esta suíte é sobre o diálogo, não sobre a rede.
 *
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Diálogo · §Confirmação · §Recusa do servidor)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'

const { mutateMock, resetMock, useResponderMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  resetMock: vi.fn(),
  useResponderMock: vi.fn(),
}))

vi.mock('../../hooks/useResponderRevisao', () => ({
  useResponderRevisao: useResponderMock,
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ResponderRevisaoDialog } from '../ResponderRevisaoDialog'
import { RevisaoError, type FilaRevisaoRow } from '../../services/revisaoService'
import { JUSTIFICATIVA_MAX } from '../../schemas/responderRevisaoSchema'

const CANDIDATURA = '55555555-5555-4555-8555-555555555555'

function linha(over: Partial<FilaRevisaoRow> = {}): FilaRevisaoRow {
  return {
    candidatura_id: CANDIDATURA,
    candidato_nome: 'Ana Souza',
    vaga_titulo: 'Dentista — Matriz',
    decisao: 'rejeitado',
    decidido_por_nome: 'Carla RH',
    revisao_solicitada_em: '2026-07-20T12:00:00Z',
    revisao_respondida_em: null,
    revisao_veredito: null,
    revisao_resultado: null,
    respondida_por_nome: null,
    pode_responder: true,
    ...over,
  }
}

function estadoMutacao(over: Record<string, unknown> = {}) {
  return { mutate: mutateMock, isPending: false, error: null, reset: resetMock, ...over }
}

function renderDialog(props: Partial<React.ComponentProps<typeof ResponderRevisaoDialog>> = {}) {
  return render(
    <ResponderRevisaoDialog
      linha={props.linha ?? linha()}
      open={props.open ?? true}
      onOpenChange={props.onOpenChange ?? vi.fn()}
    />,
  )
}

const TEXTO_VALIDO =
  'Reexaminamos a avaliação comportamental e a base documental da decisão original.'

function escolherVeredito(label: string) {
  fireEvent.click(screen.getByText(label))
}

function digitar(valor: string) {
  fireEvent.change(screen.getByLabelText(/Justificativa/i), { target: { value: valor } })
}

function primario() {
  return screen.getByRole('button', { name: /Registrar resposta|Enviando…/ })
}

/**
 * ⚠ O CONTEÚDO DO DIÁLOGO VIVE NUM **PORTAL**, fora do `container` do RTL. Asserções de
 * texto contra `container.textContent` aqui seriam FALSO VERDE: ele é a string vazia, e
 * todo `not.toContain(...)` passaria sem olhar nada. Este helper lê `document.body`, que
 * é onde o Radix monta o portal — e é por isso que as asserções negativas deste arquivo
 * (copy de contorno, verbo genérico de cancelamento) valem alguma coisa.
 */
function corpo(): string {
  return document.body.textContent ?? ''
}

/**
 * As frases que a UI-SPEC PROÍBE na região da recusa — montadas em runtime, nunca
 * escritas como literal. Escrevê-las aqui faria a própria asserção introduzir na feature
 * a copy que ela existe para proibir, e o gate de grep do plano (que varre
 * `src/features/revisao/` inteiro, testes inclusive) passaria a reprovar por causa do
 * teste. Mesmo idioma adotado no plano 42-11 para `revisao_por_usuario`.
 */
const COPY_DE_CONTORNO = [
  ['solicitar', ' ', 'liberação'],
  ['pedir', ' ', 'permissão'],
  ['pode', ' ', 'liberar'],
  ['sobre', '', 'por'],
  ['exce', '', 'ção'],
].map((partes) => partes.join(''))

beforeEach(() => {
  vi.clearAllMocks()
  useResponderMock.mockReturnValue(estadoMutacao())
})

describe('ResponderRevisaoDialog — vazio: abre sem veredito e com o envio bloqueado', () => {
  it('título, descrição e o bloco de contexto somente leitura', () => {
    renderDialog()
    expect(screen.getByText('Responder revisão')).toBeInTheDocument()
    expect(
      screen.getByText(
        'A resposta fica registrada na trilha de auditoria e o candidato é notificado por e-mail.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Dentista — Matriz')).toBeInTheDocument()
    expect(screen.getByText('Rejeitado')).toBeInTheDocument()
    expect(screen.getByText('Carla RH')).toBeInTheDocument()
    expect(corpo()).toContain('20/07/2026')
  })

  it('nenhum veredito pré-selecionado e a área de texto vazia', () => {
    renderDialog()
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
    expect(screen.getByLabelText(/Justificativa/i)).toHaveValue('')
  })

  it('o botão primário nasce desabilitado e o contador começa em 0', () => {
    renderDialog()
    expect(primario()).toBeDisabled()
    expect(screen.getByText('0 / 50 mín.')).toBeInTheDocument()
  })

  it('as duas opções trazem rótulo e texto de ajuda verbatim da UI-SPEC', () => {
    renderDialog()
    expect(screen.getByText('Manter a decisão')).toBeInTheDocument()
    expect(screen.getByText('A decisão original permanece como está.')).toBeInTheDocument()
    expect(screen.getByText('Reverter a decisão')).toBeInTheDocument()
    expect(screen.getByText('A decisão original deixa de valer.')).toBeInTheDocument()
  })
})

describe('ResponderRevisaoDialog — parcial: o déficit é mostrado e o envio fica bloqueado', () => {
  it('veredito escolhido + 10 caracteres → contador mostra o déficit, primário DESABILITADO', () => {
    renderDialog()
    escolherVeredito('Manter a decisão')
    digitar('a'.repeat(10))
    expect(screen.getByText('10 / 50 mín.')).toBeInTheDocument()
    expect(primario()).toBeDisabled()
    expect(
      screen.getByText('A justificativa precisa de pelo menos 50 caracteres.'),
    ).toBeInTheDocument()
  })

  it('aos 50 caracteres o primário HABILITA e a mensagem de mínimo some', () => {
    renderDialog()
    escolherVeredito('Manter a decisão')
    digitar('a'.repeat(50))
    expect(primario()).toBeEnabled()
    expect(
      screen.queryByText('A justificativa precisa de pelo menos 50 caracteres.'),
    ).not.toBeInTheDocument()
  })

  it('justificativa suficiente SEM veredito → primário continua desabilitado', () => {
    renderDialog()
    digitar(TEXTO_VALIDO)
    expect(primario()).toBeDisabled()
  })

  it('50 espaços não fingem um envio válido — o contador espelha o `btrim` do servidor', () => {
    renderDialog()
    escolherVeredito('Manter a decisão')
    digitar(' '.repeat(60))
    expect(screen.getByText('0 / 50 mín.')).toBeInTheDocument()
    expect(primario()).toBeDisabled()
  })
})

describe('ResponderRevisaoDialog — texto longo: o teto de 2000 é guarda de interface', () => {
  it('a área de texto declara `maxLength` igual ao teto do schema', () => {
    renderDialog()
    expect(screen.getByLabelText(/Justificativa/i)).toHaveAttribute(
      'maxlength',
      String(JUSTIFICATIVA_MAX),
    )
    expect(JUSTIFICATIVA_MAX).toBe(2000)
  })

  it('o contador continua visível no topo do intervalo', () => {
    renderDialog()
    escolherVeredito('Reverter a decisão')
    digitar('a'.repeat(2000))
    expect(screen.getByText('2000 / 50 mín.')).toBeInTheDocument()
    expect(primario()).toBeEnabled()
  })
})

describe('ResponderRevisaoDialog — a confirmação aninhada ramifica por veredito', () => {
  it('`mantida` → "Registrar resposta?" + corpo de manutenção + botão "Registrar resposta"', () => {
    renderDialog()
    escolherVeredito('Manter a decisão')
    digitar(TEXTO_VALIDO)
    fireEvent.click(primario())

    const confirmacao = screen.getByRole('alertdialog')
    expect(within(confirmacao).getByText('Registrar resposta?')).toBeInTheDocument()
    expect(confirmacao.textContent).toContain('A decisão original será mantida.')
    expect(
      within(confirmacao).getByRole('button', { name: 'Registrar resposta' }),
    ).toBeInTheDocument()
  })

  it('`revertida` → "Reverter a decisão?" + corpo de reversão + botão "Registrar reversão"', () => {
    renderDialog()
    escolherVeredito('Reverter a decisão')
    digitar(TEXTO_VALIDO)
    fireEvent.click(primario())

    const confirmacao = screen.getByRole('alertdialog')
    expect(within(confirmacao).getByText('Reverter a decisão?')).toBeInTheDocument()
    expect(confirmacao.textContent).toContain('A decisão original deixará de valer.')
    expect(
      within(confirmacao).getByRole('button', { name: 'Registrar reversão' }),
    ).toBeInTheDocument()
  })

  // ── O gate dos DOIS RECUOS ─────────────────────────────────────────────────────
  it('os dois recuos têm rótulos DISTINTOS e nenhum usa o verbo genérico de cancelamento', () => {
    renderDialog()
    escolherVeredito('Manter a decisão')
    digitar(TEXTO_VALIDO)
    expect(
      screen.getByRole('button', { name: 'Fechar sem registrar' }),
    ).toBeInTheDocument()

    fireEvent.click(primario())
    const confirmacao = screen.getByRole('alertdialog')
    expect(within(confirmacao).getByRole('button', { name: 'Voltar' })).toBeInTheDocument()

    // O verbo genérico é proibido em TODO o fluxo — o literal é montado em runtime
    // para que a própria proibição não introduza a palavra no arquivo da feature.
    const generico = ['Cancel', 'ar'].join('')
    expect(corpo()).not.toContain(generico)
  })

  it('confirmar → `mutate` com as três variáveis, a justificativa já sem espaços de borda', () => {
    renderDialog()
    escolherVeredito('Reverter a decisão')
    digitar(`  ${TEXTO_VALIDO}  `)
    fireEvent.click(primario())
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Registrar reversão',
      }),
    )
    expect(mutateMock).toHaveBeenCalledTimes(1)
    expect(mutateMock.mock.calls[0][0]).toEqual({
      candidaturaId: CANDIDATURA,
      veredito: 'revertida',
      justificativa: TEXTO_VALIDO,
    })
  })
})

describe('ResponderRevisaoDialog — carregando: sem duplo envio e sem fechar sozinho', () => {
  it('durante a mutação o primário fica pendente e DESABILITADO', () => {
    useResponderMock.mockReturnValue(estadoMutacao({ isPending: true }))
    renderDialog()
    escolherVeredito('Manter a decisão')
    digitar(TEXTO_VALIDO)
    const botao = screen.getByRole('button', { name: /Enviando…/ })
    expect(botao).toBeDisabled()
  })

  it('o diálogo NÃO fecha por conta própria enquanto a RPC não responde', () => {
    const onOpenChange = vi.fn()
    useResponderMock.mockReturnValue(estadoMutacao({ isPending: true }))
    renderDialog({ onOpenChange })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText('Responder revisão')).toBeInTheDocument()
  })

  it('um segundo clique no primário não dispara um segundo envio', () => {
    renderDialog()
    escolherVeredito('Manter a decisão')
    digitar(TEXTO_VALIDO)
    fireEvent.click(primario())
    const confirmar = within(screen.getByRole('alertdialog')).getByRole('button', {
      name: 'Registrar resposta',
    })
    fireEvent.click(confirmar)
    fireEvent.click(confirmar)
    expect(mutateMock).toHaveBeenCalledTimes(1)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// A RECUSA DO SERVIDOR (REVISAO-05) — o bloco mais importante do arquivo.
// ══════════════════════════════════════════════════════════════════════════════
describe('ResponderRevisaoDialog — recusa do guard: estado terminal, sem saída prometida', () => {
  const recusa = new RevisaoError('recusado', 'GUARD_DECISOR')

  function renderRecusado() {
    useResponderMock.mockReturnValue(estadoMutacao({ error: recusa }))
    const onOpenChange = vi.fn()
    const utils = renderDialog({ onOpenChange })
    escolherVeredito('Manter a decisão')
    digitar(TEXTO_VALIDO)
    return { ...utils, onOpenChange }
  }

  it('o alerta inline aparece com a copy VERBATIM da UI-SPEC', () => {
    renderRecusado()
    expect(corpo()).toContain(
      'O servidor recusou esta resposta. Quem registrou a decisão não pode responder à revisão dela. Encaminhe este pedido a outra pessoa do RH ou a um administrador.',
    )
  })

  it('o diálogo PERMANECE ABERTO — nada o fecha', () => {
    const { onOpenChange } = renderRecusado()
    expect(screen.getByText('Responder revisão')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('o texto digitado é PRESERVADO', () => {
    renderRecusado()
    expect(screen.getByLabelText(/Justificativa/i)).toHaveValue(TEXTO_VALIDO)
  })

  it('o botão primário fica DESABILITADO mesmo com o formulário completo', () => {
    renderRecusado()
    expect(primario()).toBeDisabled()
  })

  it('NENHUM botão de tentar novamente / reenviar é renderizado', () => {
    renderRecusado()
    expect(
      screen.queryByRole('button', { name: /tentar novamente|tente novamente|reenviar|repetir/i }),
    ).not.toBeInTheDocument()
  })

  it('"Fechar sem registrar" continua disponível — é literalmente o que aconteceu', () => {
    renderRecusado()
    expect(screen.getByRole('button', { name: 'Fechar sem registrar' })).toBeEnabled()
  })

  it('a copy NUNCA promete contorno, liberação, exceção ou sobreposição', () => {
    renderRecusado()
    const texto = corpo().toLowerCase()
    for (const proibido of COPY_DE_CONTORNO) {
      expect(texto).not.toContain(proibido.toLowerCase())
    }
  })
})

describe('ResponderRevisaoDialog — erro genérico: aberto e preservado, sem alerta de guard', () => {
  it('`DESCONHECIDO` → diálogo aberto, texto preservado, SEM o alerta do guard', () => {
    useResponderMock.mockReturnValue(
      estadoMutacao({ error: new RevisaoError('opaco', 'DESCONHECIDO') }),
    )
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })
    escolherVeredito('Manter a decisão')
    digitar(TEXTO_VALIDO)

    expect(screen.getByLabelText(/Justificativa/i)).toHaveValue(TEXTO_VALIDO)
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(corpo()).not.toContain('O servidor recusou esta resposta.')
    // O erro genérico não trava o formulário: tentar de novo AQUI faz sentido.
    expect(primario()).toBeEnabled()
  })
})

describe('ResponderRevisaoDialog — modo somente-leitura ("Ver resposta")', () => {
  const respondida = linha({
    revisao_respondida_em: '2026-07-27T12:00:00Z',
    revisao_veredito: 'revertida',
    revisao_resultado: 'A avaliação foi refeita e a decisão anterior deixa de valer.',
    respondida_por_nome: 'Bruno Admin',
    pode_responder: false,
  })

  it('mostra o veredito e a justificativa registrados', () => {
    renderDialog({ linha: respondida })
    expect(screen.getByText('Resultado da revisão')).toBeInTheDocument()
    expect(screen.getByText('Revertida')).toBeInTheDocument()
    expect(
      screen.getByText('A avaliação foi refeita e a decisão anterior deixa de valer.'),
    ).toBeInTheDocument()
    expect(corpo()).toContain('27/07/2026')
  })

  it('NÃO renderiza controles editáveis nem o botão primário', () => {
    renderDialog({ linha: respondida })
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Registrar resposta/ }),
    ).not.toBeInTheDocument()
  })

  it('a justificativa registrada preserva as quebras de linha (`whitespace-pre-wrap`)', () => {
    renderDialog({
      linha: linha({
        revisao_respondida_em: '2026-07-27T12:00:00Z',
        revisao_veredito: 'mantida',
        revisao_resultado: 'linha um\nlinha dois',
      }),
    })
    const corpo = screen.getByText(/linha um/)
    expect(corpo.className).toContain('whitespace-pre-wrap')
  })
})

describe('ResponderRevisaoDialog — piso de acessibilidade', () => {
  it('todo controle acionável carrega o piso de 44px', () => {
    renderDialog()
    escolherVeredito('Manter a decisão')
    digitar(TEXTO_VALIDO)
    for (const nome of ['Registrar resposta', 'Fechar sem registrar']) {
      expect(screen.getByRole('button', { name: nome }).className).toContain(
        'min-h-[44px]',
      )
    }
  })

  it('o diálogo tem título e descrição REAIS (não `sr-only` vazios)', () => {
    renderDialog()
    const titulo = screen.getByText('Responder revisão')
    expect(titulo.className).not.toContain('sr-only')
    expect(titulo.textContent?.trim().length).toBeGreaterThan(0)
  })

  it('a copy do diálogo nunca chama o limite interno de exigência estatutária', () => {
    renderDialog()
    const texto = corpo().toLowerCase()
    expect(texto).not.toContain('prazo legal')
    expect(texto).not.toContain('prazo da lei')
  })
})
