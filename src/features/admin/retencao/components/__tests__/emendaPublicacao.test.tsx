/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 47 / Plano 47-06 Task 3 — a **Emenda A** no diálogo de edição da janela de retenção.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE NÃO É COSMÉTICO ──────────────
 * O artefato que alimenta os prazos de `/privacidade` é escrito no BUILD; a matriz que ele
 * espelha é editada em PRODUÇÃO, por esta tela. Salvar uma janela aqui desatualiza aquela
 * página — e o portão do repositório não tem como perceber, porque ele compara a fonte
 * declarada com o artefato, e as duas continuam combinando entre si enquanto a matriz VIVA
 * anda sozinha.
 *
 * São três detectores do mesmo drift, e só um enxerga o que acontece de verdade:
 *  1. o portão do repositório (47-01) — pega a divergência DENTRO do repositório;
 *  2. o carimbo de vigência em `/privacidade` (47-06 / Task 1) — diz QUANDO o retrato foi
 *     tirado;
 *  3. esta frase — a única coisa no sistema que avisa quem acabou de mudar a política que a
 *     página pública ficou para trás.
 *
 * ── A ASSERÇÃO QUE CARREGA O PESO É A DE RENDERIZAÇÃO ───────────────────────
 * Uma chave declarada na constante e nunca exibida seria uma promessa sem dono autorada
 * pela fase que existe para removê-las. Por isso o caso (2) não olha a constante: ele abre o
 * diálogo de confirmação e procura o texto na tela.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§Emenda A)
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

import { DIALOGO_JANELA_COPY, EditarJanelaDialog } from '../EditarJanelaDialog'
import type { LinhaMatriz } from '../MatrizRetencaoTable'

const LINHA: LinhaMatriz = {
  etapa: 'triagem',
  rotulo: 'Triagem',
  janelaMeses: 24,
  origem: 'seed',
  alteradoPorNome: null,
  atualizadoEm: '2026-08-01T10:00:00Z',
  definida: true,
}

beforeEach(() => {
  salvarMock.mockReset()
  useSalvarMock.mockReset()
  useSalvarMock.mockReturnValue({
    mutate: salvarMock,
    isPending: false,
    isError: false,
    reset: vi.fn(),
  })
})

/** Abre o diálogo, digita um valor válido e avança até a confirmação aninhada. */
function abrirConfirmacao() {
  render(<EditarJanelaDialog linha={LINHA} open onOpenChange={vi.fn()} />)
  fireEvent.change(screen.getByLabelText(/Janela de retenção/), { target: { value: '12' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar janela de retenção' }))
  return screen.getByRole('alertdialog')
}

describe('Emenda A — o administrador passa a saber que a edição desatualiza a página pública', () => {
  it('(1) a chave nova existe no bloco de confirmação e não está vazia', () => {
    expect(DIALOGO_JANELA_COPY.confirmacao.publicacao.trim()).not.toBe('')
    expect(DIALOGO_JANELA_COPY.confirmacao.publicacao).toContain('página pública de privacidade')
    expect(DIALOGO_JANELA_COPY.confirmacao.publicacao).toContain('peça a regeneração')
  })

  it('(2) o texto da chave nova é RENDERIZADO no diálogo de confirmação', () => {
    const confirmacao = abrirConfirmacao()
    // ⚠ A asserção é sobre a TELA, nunca sobre a constante: uma copy declarada e nunca
    // exibida é exatamente a promessa sem dono que esta fase existe para remover.
    expect(
      within(confirmacao).getByText(DIALOGO_JANELA_COPY.confirmacao.publicacao),
    ).toBeInTheDocument()
  })

  it('(3) a chave de escopo continua byte-idêntica e continua renderizada ao lado da nova', () => {
    expect(DIALOGO_JANELA_COPY.confirmacao.escopo).toBe(
      'Nenhum dado de candidato é apagado por esta alteração — e hoje nenhuma rotina deste sistema apaga dados de candidato automaticamente.',
    )
    const corpo = abrirConfirmacao().textContent ?? ''
    expect(corpo).toContain('Nenhum dado de candidato é apagado por esta alteração')
    expect(corpo).toContain(DIALOGO_JANELA_COPY.confirmacao.publicacao)
  })

  it('(4) a frase nova NÃO promete regeneração automática', () => {
    const texto = DIALOGO_JANELA_COPY.confirmacao.publicacao.toLowerCase()
    for (const promessa of [
      ['automatica', 'mente'].join(''),
      ['automátic', 'a'].join(''),
      'atualiza sozinha',
      'se atualiza',
      'é gerada de novo sozinha',
    ]) {
      expect(texto.includes(promessa), `a Emenda A não promete: ${promessa}`).toBe(false)
    }
    // Ela diz o CONTRÁRIO — e é a negação que a torna honesta.
    expect(texto).toContain('não muda sozinha')
  })

  it('(5) nenhuma outra copy do diálogo mudou', () => {
    expect(DIALOGO_JANELA_COPY.titulo).toBe('Editar janela de retenção')
    expect(DIALOGO_JANELA_COPY.ctaPrimario).toBe('Salvar janela de retenção')
    expect(DIALOGO_JANELA_COPY.ctaSecundario).toBe('Fechar sem salvar')
    expect(DIALOGO_JANELA_COPY.confirmacao.titulo).toBe('Salvar janela de retenção?')
    expect(DIALOGO_JANELA_COPY.confirmacao.confirmar).toBe('Salvar janela de retenção')
    expect(DIALOGO_JANELA_COPY.confirmacao.recuar).toBe('Voltar')
  })

  it('(6) a estrutura do diálogo e o piso de alvo tátil dos botões ficam intactos', () => {
    const confirmacao = abrirConfirmacao()
    const dentro = within(confirmacao)
    expect(dentro.getByRole('button', { name: 'Voltar' }).className).toContain('min-h-[44px]')
    expect(
      dentro.getByRole('button', { name: 'Salvar janela de retenção' }).className,
    ).toContain('min-h-[44px]')
    // O corpo continua nomeando o estado, o valor de antes e o de depois.
    const corpo = confirmacao.textContent ?? ''
    expect(corpo).toContain('Triagem')
    expect(corpo).toContain('24 meses')
    expect(corpo).toContain('12 meses')
  })
})
