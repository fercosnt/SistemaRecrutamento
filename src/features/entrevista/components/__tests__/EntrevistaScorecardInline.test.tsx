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
 * As notas do gestor seguem opcionais aqui — a divergência cliente/servidor delas é o
 * JORN-47 (Bloco 3), fora deste arquivo.
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
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeEnabled()
    fireEvent.click(salvar)
    expect(onSalvar).toHaveBeenCalledWith({ scoresHumanos: { Comunicação: 4 }, notas: '' })
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
