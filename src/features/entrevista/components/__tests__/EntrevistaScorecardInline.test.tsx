/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 49 / plano 49-31 — o scorecard diz SOBRE QUAL análise a nota humana será gravada,
 * e deixa o RH escolher quando há mais de uma vigente (gap CR-03, D-39).
 *
 * ─── O QUE ESTE ARQUIVO VIGIA ────────────────────────────────────────────────────────
 *
 * 1. Uma vigente ⇒ a linha `scorecard-analise-em-revisao` nomeia a entrevista; sem seletor.
 * 2. Duas vigentes ⇒ radiogroup rotulado por `rotuloTipoAnalise`; escolher a outra chama
 *    `onEscolherAnalise` com o id dela. A RPC do 49-30 grava no id que o workspace manda.
 * 3. Nenhuma vigente ⇒ «Salvar avaliação» desabilitado e a frase do que falta; `onSalvar`
 *    nunca é chamado (antes a tela deixava clicar e o servidor recusava).
 *
 * 4. (51-04 / JORN-47, D-22) As notas do gestor são obrigatórias, espelho do servidor:
 *    `salvar_avaliacao_entrevista` recusa `p_notas` nulo ou vazio depois de `btrim`
 *    (`notas_humanas obrigatorias`, 23514). Antes a tela deixava clicar com o campo vazio e
 *    o RH recebia um 400 mudo. Agora, com as notas vazias depois de `trim()`, o Salvar fica
 *    desabilitado e a tela diz por quê (`entrevista-notas-obrigatorias`). O `trim()` do
 *    cliente remove TODO espaço em branco e o `btrim` do servidor só espaços: o cliente é
 *    igual ou mais estrito — nada que o servidor recusa o cliente aceita.
 *
 * Idioma RTL do repositório: `fireEvent`, não `user-event`.
 *
 * @see src/features/entrevista/components/EntrevistaScorecardInline.tsx (component under test)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EntrevistaScorecardInline, SCORECARD_COPY } from '../EntrevistaScorecardInline'
import { TRANSCRICAO_COPY } from '../TranscricaoReviewPanel'
import type { EntrevistaAnaliseRow } from '../../services/entrevistaService'

function analise(over: Partial<EntrevistaAnaliseRow> = {}): EntrevistaAnaliseRow {
  return {
    id: 'a-1',
    candidatura_id: 'c-1',
    tipo: 'online',
    status_analise: 'pendente_humano',
    superada_em: null,
    texto_hash: 'hash-1',
    provedor_ia: 'anthropic',
    modelo_ia: 'claude-sonnet-4-6-20260215',
    competencias: [{ competencia: 'Comunicação', score: 4 }],
    citacoes: [],
    bias_flags: null,
    bloqueio_avanco: false,
    scores_humanos: null,
    notas_humanas: null,
    revisada_por: null,
    revisao_confirmada_em: null,
    prompt_version: 'v1',
    created_at: '2026-09-20T10:00:00Z',
    ...over,
  } as EntrevistaAnaliseRow
}

const online = analise({ id: 'v-online', tipo: 'online', created_at: '2026-09-20T10:00:00Z' })
const presencial = analise({
  id: 'v-presencial',
  tipo: 'presencial',
  created_at: '2026-09-25T10:00:00Z',
})

describe('EntrevistaScorecardInline — qual análise está sendo avaliada (CR-03)', () => {
  it('uma vigente ⇒ a linha diz sobre qual entrevista a avaliação será registrada; nenhum seletor', () => {
    const onSalvar = vi.fn()
    render(
      <EntrevistaScorecardInline
        competenciasIA={online.competencias}
        vigentes={[online]}
        analiseId="v-online"
        onEscolherAnalise={vi.fn()}
        onSalvar={onSalvar}
      />,
    )
    const linha = screen.getByTestId('scorecard-analise-em-revisao')
    expect(linha).toHaveTextContent(`${SCORECARD_COPY.registradaSobre} ${TRANSCRICAO_COPY.online}`)
    expect(screen.queryByRole('radiogroup')).toBeNull()
    // 51-04 (D-22): com as notas vazias o Salvar NÃO habilita — antes este caso esperava
    // `onSalvar` com `notas: ''`, que o servidor recusa com 23514.
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeDisabled()
    fireEvent.click(salvar)
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('duas vigentes ⇒ radiogroup rotulado pela entrevista; escolher a outra chama onEscolherAnalise com o id dela', () => {
    const onEscolherAnalise = vi.fn()
    render(
      <EntrevistaScorecardInline
        competenciasIA={presencial.competencias}
        vigentes={[presencial, online]}
        analiseId="v-presencial"
        onEscolherAnalise={onEscolherAnalise}
        onSalvar={vi.fn()}
      />,
    )
    const grupo = screen.getByRole('radiogroup')
    const radios = within(grupo).getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(within(grupo).getByRole('radio', { name: TRANSCRICAO_COPY.presencial })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const outra = within(grupo).getByRole('radio', { name: TRANSCRICAO_COPY.online })
    expect(outra).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('scorecard-analise-em-revisao')).toHaveTextContent(
      TRANSCRICAO_COPY.presencial,
    )
    fireEvent.click(outra)
    expect(onEscolherAnalise).toHaveBeenCalledTimes(1)
    expect(onEscolherAnalise).toHaveBeenCalledWith('v-online')
  })

  it('nenhuma vigente ⇒ «Salvar avaliação» desabilitado, a frase do que falta, e onSalvar nunca chamado', () => {
    const onSalvar = vi.fn()
    render(
      <EntrevistaScorecardInline
        competenciasIA={null}
        vigentes={[]}
        analiseId={null}
        onEscolherAnalise={vi.fn()}
        onSalvar={onSalvar}
      />,
    )
    expect(
      screen.getByText(
        'Nenhuma análise vigente: analise a transcrição antes de registrar a avaliação.',
      ),
    ).toBeInTheDocument()
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeDisabled()
    fireEvent.click(salvar)
    expect(onSalvar).not.toHaveBeenCalled()
    expect(screen.queryByTestId('scorecard-analise-em-revisao')).toBeNull()
  })
})

/** A mensagem literal do D-22 — fixada aqui por texto, não só pela constante. */
const NOTAS_OBRIGATORIAS = 'Escreva as notas do gestor para salvar a avaliação.'

function renderComVigente(onSalvar = vi.fn()) {
  render(
    <EntrevistaScorecardInline
      competenciasIA={online.competencias}
      vigentes={[online]}
      analiseId="v-online"
      onEscolherAnalise={vi.fn()}
      onSalvar={onSalvar}
    />,
  )
  return onSalvar
}

function escreverNotas(valor: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: valor } })
}

describe('EntrevistaScorecardInline — notas do gestor obrigatórias, espelho do servidor (51-04 / JORN-47, D-22)', () => {
  it('notas vazias ⇒ Salvar desabilitado e a mensagem «Escreva as notas do gestor…» na tela', () => {
    const onSalvar = renderComVigente()
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeDisabled()
    const aviso = screen.getByTestId('entrevista-notas-obrigatorias')
    expect(aviso).toHaveTextContent(NOTAS_OBRIGATORIAS)
    expect(SCORECARD_COPY.notasObrigatorias).toBe(NOTAS_OBRIGATORIAS)
    fireEvent.click(salvar)
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('notas só com espaço em branco (espaço, quebra de linha, tab) ⇒ Salvar desabilitado — cliente igual ou mais estrito que o btrim do servidor', () => {
    const onSalvar = renderComVigente()
    escreverNotas('   \n\t ')
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeDisabled()
    expect(screen.getByTestId('entrevista-notas-obrigatorias')).toHaveTextContent(
      NOTAS_OBRIGATORIAS,
    )
    fireEvent.click(salvar)
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('com texto nas notas e análise vigente ⇒ Salvar habilitado; o clique entrega o texto', () => {
    const onSalvar = renderComVigente()
    escreverNotas('Boa entrevista')
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeEnabled()
    expect(screen.queryByTestId('entrevista-notas-obrigatorias')).toBeNull()
    fireEvent.click(salvar)
    expect(onSalvar).toHaveBeenCalledTimes(1)
    expect(onSalvar).toHaveBeenCalledWith({
      scoresHumanos: { Comunicação: 4 },
      notas: 'Boa entrevista',
    })
  })

  it('sem análise vigente: com notas segue desabilitado (semVigente); sem notas as duas mensagens coexistem', () => {
    const onSalvar = vi.fn()
    render(
      <EntrevistaScorecardInline
        competenciasIA={null}
        vigentes={[]}
        analiseId={null}
        onEscolherAnalise={vi.fn()}
        onSalvar={onSalvar}
      />,
    )
    expect(screen.getByText(SCORECARD_COPY.semVigente)).toBeInTheDocument()
    expect(screen.getByTestId('entrevista-notas-obrigatorias')).toHaveTextContent(
      NOTAS_OBRIGATORIAS,
    )
    escreverNotas('Boa entrevista')
    expect(screen.queryByTestId('entrevista-notas-obrigatorias')).toBeNull()
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeDisabled()
    fireEvent.click(salvar)
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('o campo se chama «Notas do gestor», é obrigatório e o placeholder não diz «opcional»', () => {
    renderComVigente()
    const campo = screen.getByRole('textbox')
    expect(screen.getByText('Notas do gestor', { selector: 'label' })).toBeInTheDocument()
    expect(campo).toHaveAccessibleName('Notas do gestor')
    expect(campo).toBeRequired()
    expect(campo).toHaveAttribute('aria-required', 'true')
    expect(campo.getAttribute('placeholder') ?? '').not.toMatch(/opcional/i)
    expect(document.body.textContent ?? '').not.toMatch(/opcional/i)
  })
})
