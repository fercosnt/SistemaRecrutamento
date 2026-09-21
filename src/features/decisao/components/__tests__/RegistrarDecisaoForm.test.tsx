/**
 * Phase 15 / Plan 15-03 Task 2 — `RegistrarDecisaoForm` test (DECISAO-03, TDD).
 *
 * The terminal decision-capture form: a 3-option `decisao` radio (Aprovar / Rejeitar
 * / Manter em espera) + a mandatory justificativa textarea (≥50 chars, the client
 * mirror of the DB CHECK) + a char counter ('{n} / 50 mín.') + a "Registrar decisão"
 * CTA gated on a selection AND ≥50 chars. The confirm runs through an alert-dialog
 * whose body mentions LGPD Art. 20 for the `rejeitado` path.
 *
 * All copy strings are the EXACT pt-BR from 15-UI-SPEC.md §Copywriting Contract.
 *
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (decision form copy)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-03-PLAN.md (Task 2)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { RegistrarDecisaoForm } from '../RegistrarDecisaoForm'
import { DecisaoServiceError } from '../../services/decisaoService'

/**
 * Phase 43 / Plano 43-02 (BD-3) — o texto do Art. 20 mostrado ao RH, reescrito.
 *
 * Este sítio NÃO tinha pin até aqui, e a 43-UI-SPEC nomeia a lacuna: sem pin, a
 * próxima reescrita escorrega. A ban do juridiquês da Invariante 8 é REPO-WIDE (`src/`
 * inteiro, superfície de candidato E de RH, copy E comentário) — é por isso que este
 * arquivo de RH aparece na mesma decisão que os dois do candidato, e é por isso que a
 * expressão banida não é escrita verbatim nem aqui.
 */
const COPY_ART20_RH =
  'Esta decisão finaliza o funil e o candidato poderá pedir que uma pessoa revise esta decisão (LGPD, Art. 20). Fica registrada na trilha de auditoria.'

function renderForm(props?: Partial<React.ComponentProps<typeof RegistrarDecisaoForm>>) {
  return render(
    <RegistrarDecisaoForm
      onConfirm={props?.onConfirm ?? vi.fn()}
      submitting={props?.submitting ?? false}
      decisaoAtual={props?.decisaoAtual ?? null}
      erro={props?.erro ?? null}
    />,
  )
}

describe('RegistrarDecisaoForm (Plan 15-03 — DECISAO-03)', () => {
  it('renders the 3 decisão options + the justificativa label', () => {
    renderForm()
    expect(screen.getByText('Aprovar')).toBeInTheDocument()
    expect(screen.getByText('Rejeitar')).toBeInTheDocument()
    expect(screen.getByText('Manter em espera')).toBeInTheDocument()
    expect(screen.getByText(/Justificativa/)).toBeInTheDocument()
  })

  it('the Registrar decisão CTA is DISABLED until a decisão is selected AND justificativa ≥ 50', () => {
    renderForm()
    const cta = screen.getByRole('button', { name: /Registrar decisão/ })
    expect(cta).toBeDisabled()
  })

  it('the CTA stays disabled with a decisão selected but < 50 chars', () => {
    renderForm()
    fireEvent.click(screen.getByText('Aprovar'))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'muito curto' } })
    expect(screen.getByRole('button', { name: /Registrar decisão/ })).toBeDisabled()
  })

  it('the CTA ENABLES once a decisão is selected AND justificativa ≥ 50 chars', () => {
    renderForm()
    fireEvent.click(screen.getByText('Aprovar'))
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'x'.repeat(55) } })
    expect(screen.getByRole('button', { name: /Registrar decisão/ })).toBeEnabled()
  })

  it('renders the {n} / 50 mín. char counter reflecting the current length', () => {
    renderForm()
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'abcde' } })
    expect(screen.getByText(/5 \/ 50 mín\./)).toBeInTheDocument()
  })

  it('shows the append-only note when a decisão already exists', () => {
    renderForm({ decisaoAtual: { decisao: 'aprovado', justificativa: 'prévia', em: '2026-06-01' } })
    expect(screen.getByText(/Já existe uma decisão registrada/)).toBeInTheDocument()
  })
})

/**
 * ⚠ Estas asserções leem `document.body`, nunca o `container` do `render()`: o corpo do
 * `AlertDialog` do Radix monta em PORTAL, e `container.textContent` fica vazio — a
 * asserção passaria sem olhar nada (3 falsos verdes medidos no 42-10).
 */
describe('RegistrarDecisaoForm — o aviso do Art. 20 ao RH, em linguagem simples (BD-3)', () => {
  function abrirConfirmacaoDeRejeicao() {
    renderForm()
    fireEvent.click(screen.getByText('Rejeitar'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x'.repeat(55) } })
    fireEvent.click(screen.getByRole('button', { name: /Registrar decisão/ }))
  }

  it('no caminho `rejeitado`, o corpo do diálogo traz o texto reescrito, com a citação do artigo', () => {
    abrirConfirmacaoDeRejeicao()
    expect(within(document.body).getByText(COPY_ART20_RH)).toBeInTheDocument()
  })

  it('o aviso ao RH não carrega o juridiquês que a Invariante 8 mata', () => {
    abrirConfirmacaoDeRejeicao()
    // Literal montado em runtime: um teste que proíbe uma string e a contém verbatim
    // é auto-invalidante (idioma estabelecido no 42-11).
    const juridiques = ['pessoa', 'natural'].join(' ')
    expect(document.body.textContent ?? '').not.toContain(juridiques)
  })

  it('o caminho NÃO-rejeitado segue sem menção ao Art. 20 (nada a revisar ainda)', () => {
    renderForm()
    fireEvent.click(screen.getByText('Aprovar'))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x'.repeat(55) } })
    fireEvent.click(screen.getByRole('button', { name: /Registrar decisão/ }))
    expect(document.body.textContent ?? '').not.toContain('Art. 20')
  })
})

/**
 * Phase 48 / Plano 48-15 (JORN-19 · D-23) — a recusa do servidor dita com clareza.
 *
 * O servidor recusa; a tela só traduz. Quem teve a decisão revertida na revisão precisa
 * ler POR QUE não pode registrar a nova decisão e QUEM pode — e não um erro de banco.
 */
describe('RegistrarDecisaoForm — recusas de registrar_decisao (48-15 / D-23)', () => {
  const COPY_D23 =
    'Você registrou a decisão que foi revertida na revisão. A nova decisão deste caso precisa ser registrada por outra pessoa do RH.'
  const COPY_FORBIDDEN = 'Você não tem permissão para registrar esta decisão.'
  const COPY_GENERICA = 'Não foi possível registrar a decisão. Tente novamente.'

  it('FORBIDDEN_DECISOR_REVERTIDO → bloco decisao-recusa-decisor-revertido com o texto de D-23', () => {
    renderForm({ erro: new DecisaoServiceError('x', 'FORBIDDEN_DECISOR_REVERTIDO') })
    const bloco = screen.getByTestId('decisao-recusa-decisor-revertido')
    expect(bloco).toHaveTextContent(COPY_D23)
    expect(screen.queryByText(COPY_GENERICA)).not.toBeInTheDocument()
  })

  it('FORBIDDEN (papel) → mensagem de permissão, nunca a de decisor revertido', () => {
    renderForm({ erro: new DecisaoServiceError('x', 'FORBIDDEN') })
    expect(screen.getByText(COPY_FORBIDDEN)).toBeInTheDocument()
    expect(screen.queryByTestId('decisao-recusa-decisor-revertido')).not.toBeInTheDocument()
  })

  it('DATABASE_ERROR → a mensagem genérica de sempre', () => {
    renderForm({ erro: new DecisaoServiceError('x', 'DATABASE_ERROR') })
    expect(screen.getByText(COPY_GENERICA)).toBeInTheDocument()
    expect(screen.queryByTestId('decisao-recusa-decisor-revertido')).not.toBeInTheDocument()
  })

  it('sem erro, nenhum aviso de recusa aparece', () => {
    renderForm()
    expect(screen.queryByTestId('decisao-recusa-decisor-revertido')).not.toBeInTheDocument()
    expect(screen.queryByText(COPY_FORBIDDEN)).not.toBeInTheDocument()
    expect(screen.queryByText(COPY_GENERICA)).not.toBeInTheDocument()
  })
})
