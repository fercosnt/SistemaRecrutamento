/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 43 / Plano 43-09 Task 2 (TDD RED) — `EditarJanelaDialog` (RETEN-02).
 *
 * RETEN-02 só fica verdadeiro quando um administrador **altera pela tela**: uma tabela que
 * só se muda por `UPDATE` de banco não satisfaz "alterável sem deploy" no sentido que o
 * requirement usa — "um DBA roda um UPDATE" e "um administrador clica em salvar" são a
 * mesma frase apenas para quem tem credencial de banco.
 *
 * Os seis comportamentos do plano, e o que cada um protege:
 *
 *  · valor atual PRÉ-PREENCHIDO — quem edita uma política precisa ver a política atual no
 *    campo, não um campo vazio que o obrigue a lembrar de cor o que vai mudar.
 *  · acima de 24 → erro do teto + CTA desabilitado. **Cosmético** (o `CHECK` e a RPC são o
 *    controle real), mas evita gastar uma ida à rede para receber `22023` opaco.
 *  · vazio / não-positivo → a outra mensagem, e são DUAS mensagens distintas de propósito.
 *  · valor IGUAL ao atual → CTA desabilitado. Salvar sem mudança escreveria uma linha de
 *    auditoria vazia; o servidor recusa isso com `22023` (asserção do smoke do 43-07), e a
 *    tela tem a MESMA regra. Uma regra que vive só na tela é uma regra que não existe — e
 *    aqui ela vive nos dois lados.
 *  · confirmação ANINHADA que nomeia estado, valor ANTES e valor DEPOIS.
 *  · envio pendente sem duplo submit; falha mantém o diálogo aberto COM o valor digitado.
 *
 * ── OS DOIS RECUOS, E POR QUE NENHUM SE CHAMA "CANCELAR" ────────────────────────
 * "Voltar" (na confirmação) recua UM passo e devolve ao formulário preenchido; "Fechar sem
 * salvar" (no rodapé) abandona a edição inteira. Os dois podem estar visíveis no mesmo
 * fluxo, e um operador que leia o mesmo verbo nos dois não sabe qual saída está tomando.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 *      (§Diálogo "Editar janela de retenção" · §Confirmação — copy verbatim)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'

const salvarMock = vi.fn()
const useSalvarMock = vi.fn()

vi.mock('../../hooks/useSalvarJanela', () => ({
  useSalvarJanela: (...args: unknown[]) => useSalvarMock(...args),
  COPY_TOAST_JANELA: {
    sucesso: 'Janela de retenção atualizada.',
    erro: 'Não foi possível salvar a janela. Tente novamente.',
  },
}))

import { EditarJanelaDialog } from '../EditarJanelaDialog'
import type { LinhaMatriz } from '../MatrizRetencaoTable'

function linha(over: Partial<LinhaMatriz> = {}): LinhaMatriz {
  return {
    etapa: 'triagem',
    rotulo: 'Triagem',
    janelaMeses: 24,
    origem: 'seed',
    alteradoPorNome: null,
    atualizadoEm: '2026-08-01T10:00:00Z',
    definida: true,
    ...over,
  }
}

function mutacao(over: Record<string, unknown> = {}) {
  return { mutate: salvarMock, isPending: false, isError: false, reset: vi.fn(), ...over }
}

function abrir(props: Partial<Parameters<typeof EditarJanelaDialog>[0]> = {}) {
  const onOpenChange = vi.fn()
  const utils = render(
    <EditarJanelaDialog
      linha={linha()}
      open
      onOpenChange={onOpenChange}
      {...props}
    />,
  )
  return { ...utils, onOpenChange }
}

const campo = () => screen.getByLabelText(/Janela de retenção/)
const ctaSalvar = () =>
  screen.getByRole('button', { name: 'Salvar janela de retenção' })

beforeEach(() => {
  salvarMock.mockReset()
  useSalvarMock.mockReset()
  useSalvarMock.mockReturnValue(mutacao())
})

describe('EditarJanelaDialog — abertura e contexto somente-leitura', () => {
  it('abre com o valor atual pré-preenchido', () => {
    abrir()
    expect(campo()).toHaveValue('24')
  })

  it('título e descrição REAIS (nunca `sr-only` vazios) + o bloco de contexto', () => {
    abrir()
    expect(screen.getByText('Editar janela de retenção')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Define por quanto tempo os dados de uma candidatura neste estado ficam guardados. A alteração fica registrada na trilha de auditoria.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Janela atual')).toBeInTheDocument()
    expect(screen.getByText('Última alteração')).toBeInTheDocument()
    expect(screen.getByText('Triagem')).toBeInTheDocument()
  })

  it('a ajuda do campo apresenta 24 como TETO CONSENTIDO, não como recomendação técnica', () => {
    abrir()
    expect(
      screen.getByText(/o teto que o candidato já leu e aceitou no cadastro/),
    ).toBeInTheDocument()
  })

  it('o campo é numérico e limitado a 2 dígitos — sem texto livre no formulário', () => {
    abrir()
    expect(campo()).toHaveAttribute('inputMode', 'numeric')
    expect(campo()).toHaveAttribute('maxLength', '2')
  })
})

describe('EditarJanelaDialog — as três recusas do CTA', () => {
  it('valor acima de 24 mostra o erro do teto e mantém o CTA desabilitado', () => {
    abrir()
    fireEvent.change(campo(), { target: { value: '36' } })
    expect(
      screen.getByText(
        'A janela não pode passar de 24 meses. Esse é o teto consentido pela copy do cadastro.',
      ),
    ).toBeInTheDocument()
    expect(ctaSalvar()).toBeDisabled()
  })

  it('valor vazio mostra "maior que zero" e mantém o CTA desabilitado', () => {
    abrir()
    fireEvent.change(campo(), { target: { value: '' } })
    expect(
      screen.getByText('Informe um número de meses maior que zero.'),
    ).toBeInTheDocument()
    expect(ctaSalvar()).toBeDisabled()
  })

  it('valor não-positivo mostra a mesma mensagem e mantém o CTA desabilitado', () => {
    abrir()
    fireEvent.change(campo(), { target: { value: '0' } })
    expect(
      screen.getByText('Informe um número de meses maior que zero.'),
    ).toBeInTheDocument()
    expect(ctaSalvar()).toBeDisabled()
  })

  it('valor VÁLIDO porém IGUAL ao atual mantém o CTA desabilitado (no-op não se salva)', () => {
    abrir()
    // 24 é o valor atual — válido, e mesmo assim nada a salvar.
    expect(campo()).toHaveValue('24')
    expect(ctaSalvar()).toBeDisabled()
    // E o no-op NÃO é apresentado como erro de validação: não há o que corrigir.
    expect(
      screen.queryByText('Informe um número de meses maior que zero.'),
    ).not.toBeInTheDocument()
  })

  it('valor válido e DIFERENTE habilita o CTA', () => {
    abrir()
    fireEvent.change(campo(), { target: { value: '12' } })
    expect(ctaSalvar()).toBeEnabled()
  })
})

describe('EditarJanelaDialog — a confirmação aninhada', () => {
  it('confirmar abre o alert-dialog que nomeia o estado, o ANTES e o DEPOIS', () => {
    abrir()
    fireEvent.change(campo(), { target: { value: '12' } })
    fireEvent.click(ctaSalvar())

    const confirmacao = screen.getByRole('alertdialog')
    expect(
      within(confirmacao).getByText('Salvar janela de retenção?'),
    ).toBeInTheDocument()
    const corpo = confirmacao.textContent ?? ''
    expect(corpo).toContain('Triagem')
    expect(corpo).toContain('24 meses')
    expect(corpo).toContain('12 meses')
    // E a declaração de escopo honesto, verbatim.
    expect(corpo).toContain('Nenhum dado de candidato é apagado por esta alteração')
    expect(corpo).toContain(['automatica', 'mente'].join(''))
  })

  it('a mutação NÃO é chamada ao abrir a confirmação — só ao confirmar', () => {
    abrir()
    fireEvent.change(campo(), { target: { value: '12' } })
    fireEvent.click(ctaSalvar())
    expect(salvarMock).not.toHaveBeenCalled()

    const confirmacao = screen.getByRole('alertdialog')
    fireEvent.click(
      within(confirmacao).getByRole('button', { name: 'Salvar janela de retenção' }),
    )
    expect(salvarMock).toHaveBeenCalledTimes(1)
    expect(salvarMock.mock.calls[0][0]).toEqual({ etapa: 'triagem', meses: 12 })
  })

  it('os DOIS recuos existem, têm rótulos distintos e nenhum se chama "Cancelar"', () => {
    abrir()
    fireEvent.change(campo(), { target: { value: '12' } })
    fireEvent.click(ctaSalvar())

    expect(screen.getByRole('button', { name: 'Fechar sem salvar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Cancelar$/i })).not.toBeInTheDocument()
  })

  it('"Voltar" fecha SÓ a confirmação e devolve ao formulário com o valor digitado', () => {
    const { onOpenChange } = abrir()
    fireEvent.change(campo(), { target: { value: '12' } })
    fireEvent.click(ctaSalvar())
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(campo()).toHaveValue('12')
    // O diálogo inteiro NÃO foi fechado.
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('"Fechar sem salvar" abandona a edição inteira', () => {
    const { onOpenChange } = abrir()
    fireEvent.change(campo(), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fechar sem salvar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(salvarMock).not.toHaveBeenCalled()
  })
})

describe('EditarJanelaDialog — envio e falha', () => {
  it('durante o envio o CTA fica pendente e desabilitado (sem duplo submit)', () => {
    useSalvarMock.mockReturnValue(mutacao({ isPending: true }))
    abrir()
    fireEvent.change(campo(), { target: { value: '12' } })

    const cta = screen.getByRole('button', { name: /Salvando…/ })
    expect(cta).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Salvar janela de retenção' }),
    ).not.toBeInTheDocument()
  })

  it('falha mantém o diálogo aberto COM o valor digitado preservado', () => {
    useSalvarMock.mockReturnValue(mutacao({ isError: true }))
    const { onOpenChange } = abrir()
    fireEvent.change(campo(), { target: { value: '12' } })

    expect(campo()).toHaveValue('12')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(ctaSalvar()).toBeEnabled()
  })

  it('linha nula não renderiza conteúdo nenhum', () => {
    const { container } = render(
      <EditarJanelaDialog linha={null} open onOpenChange={vi.fn()} />,
    )
    expect(container.textContent).toBe('')
  })
})

describe('EditarJanelaDialog — a asserção negativa do verbo destrutivo', () => {
  it('nenhum controle do diálogo, nem da confirmação, carrega verbo destrutivo', () => {
    abrir()
    fireEvent.change(campo(), { target: { value: '12' } })
    fireEvent.click(ctaSalvar())

    // Montados em runtime (idioma do 42-11): um teste que proíbe uma string e a contém
    // verbatim seria sua própria primeira violação.
    const VERBOS = [
      ['purg', 'ar'],
      ['apag', 'ar'],
      ['exclu', 'ir'],
      ['delet', 'ar'],
      ['limp', 'ar'],
      ['execut', 'ar'],
      ['elimin', 'ar'],
    ].map((p) => p.join(''))

    // `document.body` porque Dialog e AlertDialog do Radix montam em PORTAL.
    const controles = Array.from(document.body.querySelectorAll('button, a'))
    expect(controles.length).toBeGreaterThan(0)
    for (const controle of controles) {
      const texto = (controle.textContent ?? '').toLowerCase()
      for (const verbo of VERBOS) {
        expect(
          texto.includes(verbo),
          `Controle com verbo destrutivo "${verbo}": "${controle.textContent}"`,
        ).toBe(false)
      }
    }
  })
})
