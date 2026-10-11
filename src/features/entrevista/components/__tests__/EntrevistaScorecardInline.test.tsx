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
    // 52-07: as notas 1–5 também são `radiogroup` (um por competência) — o seletor de ANÁLISE
    // é o que tem o nome da legenda, e é ele que não pode existir com uma só vigente.
    expect(screen.queryByRole('radiogroup', { name: SCORECARD_COPY.escolherLegenda })).toBeNull()
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
    const grupo = screen.getByRole('radiogroup', { name: SCORECARD_COPY.escolherLegenda })
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

  it('com texto nas notas, nota escolhida e análise vigente ⇒ Salvar habilitado; o clique entrega o texto', () => {
    const onSalvar = renderComVigente()
    // 52-07 (D-25): a nota não vem mais da IA (a fixture traz `score: 4`) — o entrevistador escolhe.
    fireEvent.click(screen.getByTestId('entrevista-nota-Comunicação-4'))
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

  it('o campo se chama «Notas do gestor (obrigatório)», é obrigatório e o placeholder não diz «opcional»', () => {
    renderComVigente()
    const campo = screen.getByRole('textbox')
    // 52-07 (UI-SPEC §Copy): o rótulo ganhou o sufixo «(obrigatório)» — padrão do
    // RejeitarCandidaturaDialog. O nome acessível segue o texto inteiro do rótulo.
    expect(campo).toHaveAccessibleName('Notas do gestor (obrigatório)')
    expect(campo).toBeRequired()
    expect(campo).toHaveAttribute('aria-required', 'true')
    expect(campo.getAttribute('placeholder') ?? '').not.toMatch(/opcional/i)
    expect(document.body.textContent ?? '').not.toMatch(/opcional/i)
  })
})

/*
 * 52-07 (JORN-61 — D-25 com a emenda D-52-U12). O defeito do UAT da 51 (teste 5): a avaliação
 * chegava PRÉ-MARCADA pela nota da IA (`clampScore(c.ia)`, e 3 quando a IA não dava nota), e dava
 * para salvar notas que o entrevistador não escolheu. Agora cada competência é um `radiogroup`
 * com 5 botões «1»…«5», NENHUM marcado ao abrir; «Salvar avaliação» só habilita com todas as
 * competências notadas E as notas escritas; o payload leva só as notas escolhidas.
 *
 * A fixture traz `score: 4` da IA em TODAS as competências de propósito: se qualquer valor
 * inicial vier dela, o caso (a) reprova.
 */
const COMPETENCIAS_4 = ['Experiência UAU', 'Inovação', 'Atitude de Dono', 'Sede de Crescimento']
const competenciasComIA = COMPETENCIAS_4.map((competencia) => ({ competencia, score: 4 }))
const NOTA_FALTANTE = 'Escolha uma nota para todas as competências para salvar a avaliação.'

function renderQuatro(onSalvar = vi.fn(), saving = false) {
  const vig = analise({ id: 'v-4', competencias: competenciasComIA })
  render(
    <EntrevistaScorecardInline
      competenciasIA={competenciasComIA}
      vigentes={[vig]}
      analiseId="v-4"
      onEscolherAnalise={vi.fn()}
      saving={saving}
      onSalvar={onSalvar}
    />,
  )
  return onSalvar
}

function notar(competencia: string, n: number) {
  fireEvent.click(screen.getByTestId(`entrevista-nota-${competencia}-${n}`))
}

describe('EntrevistaScorecardInline — notas 1–5 vazias e obrigatórias (52-07 / JORN-61, D-25, D-52-U12)', () => {
  it('(a) abre com score 4 da IA e NENHUMA nota marcada: 5 radios por competência, todos aria-checked=false; a nota da IA não aparece', () => {
    renderQuatro()
    for (const nome of COMPETENCIAS_4) {
      const grupo = screen.getByRole('radiogroup', { name: nome })
      const radios = within(grupo).getAllByRole('radio')
      expect(radios).toHaveLength(5)
      expect(radios.map((r) => r.textContent)).toEqual(['1', '2', '3', '4', '5'])
      for (const r of radios) expect(r).toHaveAttribute('aria-checked', 'false')
    }
    // Nenhuma leitura «x / 5» junto do controle (era assim que a nota da IA ancorava).
    expect(document.body.textContent ?? '').not.toMatch(/\d\s*\/\s*5/)
    // E9 empty: Salvar desabilitado com os dois avisos visíveis.
    expect(screen.getByRole('button', { name: 'Salvar avaliação' })).toBeDisabled()
    expect(screen.getByTestId('entrevista-nota-faltante')).toHaveTextContent(NOTA_FALTANTE)
    expect(screen.getByTestId('entrevista-notas-obrigatorias')).toBeInTheDocument()
  })

  it('(b) 3 de 4 competências notadas + notas escritas ⇒ Salvar desabilitado e o aviso de nota faltante visível', () => {
    const onSalvar = renderQuatro()
    notar('Experiência UAU', 5)
    notar('Inovação', 3)
    notar('Atitude de Dono', 1)
    escreverNotas('Boa entrevista')
    expect(screen.getByTestId('entrevista-nota-Experiência UAU-5')).toHaveAttribute('aria-checked', 'true')
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeDisabled()
    expect(screen.getByTestId('entrevista-nota-faltante')).toHaveTextContent(NOTA_FALTANTE)
    expect(screen.queryByTestId('entrevista-notas-obrigatorias')).toBeNull()
    // O aviso está ligado ao botão por aria-describedby.
    const aviso = screen.getByTestId('entrevista-nota-faltante')
    expect(aviso.id).not.toBe('')
    expect((salvar.getAttribute('aria-describedby') ?? '').split(/\s+/)).toContain(aviso.id)
    fireEvent.click(salvar)
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('(c) 4 de 4 notadas + notas vazias ⇒ desabilitado pelo aviso de notas (o de nota faltante some)', () => {
    const onSalvar = renderQuatro()
    for (const nome of COMPETENCIAS_4) notar(nome, 2)
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeDisabled()
    expect(screen.queryByTestId('entrevista-nota-faltante')).toBeNull()
    const avisoNotas = screen.getByTestId('entrevista-notas-obrigatorias')
    expect(avisoNotas.id).not.toBe('')
    expect((salvar.getAttribute('aria-describedby') ?? '').split(/\s+/)).toContain(avisoNotas.id)
    fireEvent.click(salvar)
    expect(onSalvar).not.toHaveBeenCalled()
  })

  it('(d) 4 de 4 + notas ⇒ habilitado; o clique envia só as 4 notas escolhidas, nenhuma chave undefined', () => {
    const onSalvar = renderQuatro()
    notar('Experiência UAU', 5)
    notar('Inovação', 1)
    notar('Atitude de Dono', 3)
    notar('Sede de Crescimento', 2)
    // Trocar de ideia vale; clicar de novo na mesma nota a mantém (não desmarca).
    notar('Sede de Crescimento', 4)
    notar('Sede de Crescimento', 4)
    escreverNotas('Boa entrevista')
    const salvar = screen.getByRole('button', { name: 'Salvar avaliação' })
    expect(salvar).toBeEnabled()
    expect(salvar).not.toHaveAttribute('aria-describedby')
    fireEvent.click(salvar)
    expect(onSalvar).toHaveBeenCalledTimes(1)
    const payload = onSalvar.mock.calls[0][0]
    expect(payload).toEqual({
      scoresHumanos: {
        'Experiência UAU': 5,
        Inovação: 1,
        'Atitude de Dono': 3,
        'Sede de Crescimento': 4,
      },
      notas: 'Boa entrevista',
    })
    expect(Object.values(payload.scoresHumanos).every((v) => typeof v === 'number')).toBe(true)
  })

  it('(e) saving ⇒ os botões de nota ficam desabilitados (E9 loading)', () => {
    renderQuatro(vi.fn(), true)
    for (const r of within(screen.getByRole('radiogroup', { name: 'Inovação' })).getAllByRole('radio')) {
      expect(r).toBeDisabled()
    }
  })
})

describe('EntrevistaScorecardInline — a tela fala com o entrevistador, não com o banco (52-07 / D-52-U13)', () => {
  it('o subtítulo é «Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.» e o jargão sumiu', () => {
    renderQuatro()
    expect(
      screen.getByText(
        'Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.',
      ),
    ).toBeInTheDocument()
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/BARS\s+sliders/i)
    expect(texto).not.toMatch(/notas_humanas/)
  })

  it('o rótulo das notas escritas é «Notas do gestor» + «(obrigatório)» em font-normal text-white/70', () => {
    renderQuatro()
    const rotulo = document.querySelector('label[for="entrevista-notas"]')
    expect(rotulo).not.toBeNull()
    expect(rotulo?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Notas do gestor (obrigatório)')
    const sufixo = within(rotulo as HTMLElement).getByText('(obrigatório)')
    expect(sufixo.tagName).toBe('SPAN')
    expect(sufixo).toHaveClass('font-normal', 'text-white/70')
  })
})
