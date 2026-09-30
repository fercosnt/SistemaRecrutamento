/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 49 / plano 49-16 — a aba da transcrição: de qual entrevista é a análise, qual
 * vale, o que veio antes (JORN-12 / D-39..D-42 / D-27b).
 *
 * ─── O QUE ESTE ARQUIVO VIGIA ────────────────────────────────────────────────────────
 *
 * 1. **D-41** — o seletor online/presencial existe, e o PADRÃO vem da etapa atual da
 *    candidatura. Fora de etapa de entrevista NÃO há padrão: o RH escolhe antes de
 *    analisar (a mesma postura da EF, que responde 400 pedindo o tipo em vez de gravar um
 *    palpite). O `tipo` escolhido chega ao `onAnalisar`.
 * 2. **D-39/D4** — a VIGENTE de cada entrevista aparece como vigente; as anteriores
 *    aparecem como superadas; as que não foram concluídas aparecem como falha. Nunca a
 *    mais nova de qualquer estado no lugar da que vale.
 * 3. **D-42** — a revisão humana que uma superada teve continua legível, e a vigente sem
 *    revisão aparece como «aguardando revisão humana».
 * 4. **A revisão é oferecida em CADA vigente com bandeira pendente (49-31, CR-03)** — o
 *    portão `avancar_etapa` bloqueia por qualquer uma, e `confirmar_revisao_entrevista`
 *    aceita qualquer vigente por id. Uma superada ou uma falha NÃO recebe botão: a RPC as
 *    recusa com `check_violation`.
 * 5. **D-40** — `reaproveitada` e `falhou` são DITOS, em vez de a tela simular uma
 *    análise nova que não houve.
 * 6. **D-27b** — `provedor_ia='openai'` ⇒ selo de contingência.
 *
 * Idioma RTL do repositório: `fireEvent`, não `user-event`.
 *
 * @see src/features/entrevista/components/TranscricaoReviewPanel.tsx (component under test)
 * @see .planning/phases/49-consertos-da-jornada-bloco-2/49-10-SUMMARY.md (a RPC e o predicado do lado do servidor)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  TranscricaoReviewPanel,
  TRANSCRICAO_COPY,
  tipoPadraoDaEtapa,
} from '../TranscricaoReviewPanel'
import type {
  AnalisesPorVigencia,
  EntrevistaAnaliseRow,
} from '../../services/entrevistaService'

/** Uma análise com os campos de vigência/proveniência que a allowlist agora projeta. */
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

/** Agrupa como `getAnalises` agrupa (vigente mais recente = a primeira vigente). */
function grupo(over: Partial<AnalisesPorVigencia> = {}): AnalisesPorVigencia {
  const vigentes = over.vigentes ?? []
  return {
    vigentes,
    superadas: over.superadas ?? [],
    falhas: over.falhas ?? [],
    vigenteMaisRecente:
      over.vigenteMaisRecente !== undefined ? over.vigenteMaisRecente : (vigentes[0] ?? null),
  }
}

const TEXTO_LONGO = 'x'.repeat(250)

describe('TranscricaoReviewPanel — o seletor de entrevista (D-41)', () => {
  it('renderiza o seletor com o MESMO par de opções dos CTAs do guia', () => {
    render(<TranscricaoReviewPanel analises={grupo()} />)
    const seletor = screen.getByTestId('transcricao-tipo-seletor')
    expect(within(seletor).getByRole('radio', { name: /Entrevista online/ })).toBeInTheDocument()
    expect(
      within(seletor).getByRole('radio', { name: /Entrevista presencial/ }),
    ).toBeInTheDocument()
  })

  it('candidatura em entrevista_online ⇒ «Entrevista online» PRÉ-SELECIONADO', () => {
    render(<TranscricaoReviewPanel analises={grupo()} etapaAtual="entrevista_online" />)
    const seletor = screen.getByTestId('transcricao-tipo-seletor')
    expect(within(seletor).getByRole('radio', { name: /Entrevista online/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(within(seletor).getByRole('radio', { name: /Entrevista presencial/ })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('candidatura em entrevista_presencial ⇒ «Entrevista presencial» pré-selecionado', () => {
    render(<TranscricaoReviewPanel analises={grupo()} etapaAtual="entrevista_presencial" />)
    const seletor = screen.getByTestId('transcricao-tipo-seletor')
    expect(within(seletor).getByRole('radio', { name: /Entrevista presencial/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('manda ao onAnalisar o texto E o tipo escolhido pelo RH (que vence a etapa)', () => {
    const onAnalisar = vi.fn()
    render(
      <TranscricaoReviewPanel
        analises={grupo()}
        etapaAtual="entrevista_online"
        onAnalisar={onAnalisar}
      />,
    )
    fireEvent.change(screen.getByLabelText(/Cole a transcrição/), {
      target: { value: TEXTO_LONGO },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Entrevista presencial/ }))
    fireEvent.click(screen.getByRole('button', { name: TRANSCRICAO_COPY.analisar }))
    expect(onAnalisar).toHaveBeenCalledWith(TEXTO_LONGO, 'presencial')
  })

  it('fora de etapa de entrevista NÃO há padrão: analisar fica bloqueado até o RH escolher', () => {
    const onAnalisar = vi.fn()
    render(
      <TranscricaoReviewPanel analises={grupo()} etapaAtual="triagem" onAnalisar={onAnalisar} />,
    )
    fireEvent.change(screen.getByLabelText(/Cole a transcrição/), {
      target: { value: TEXTO_LONGO },
    })
    const botao = screen.getByRole('button', { name: TRANSCRICAO_COPY.analisar })
    expect(botao).toBeDisabled()
    expect(screen.getByText(TRANSCRICAO_COPY.tipoPendente)).toBeInTheDocument()
    // Escolhido o tipo, o botão libera e o tipo viaja.
    fireEvent.click(screen.getByRole('radio', { name: /Entrevista online/ }))
    fireEvent.click(screen.getByRole('button', { name: TRANSCRICAO_COPY.analisar }))
    expect(onAnalisar).toHaveBeenCalledWith(TEXTO_LONGO, 'online')
  })

  it('tipoPadraoDaEtapa: as duas etapas de entrevista mapeiam; o resto é null (sem palpite)', () => {
    expect(tipoPadraoDaEtapa('entrevista_online')).toBe('online')
    expect(tipoPadraoDaEtapa('entrevista_presencial')).toBe('presencial')
    for (const etapa of ['triagem', 'decisao_final', 'inscricao', null, undefined]) {
      expect(tipoPadraoDaEtapa(etapa)).toBeNull()
    }
  })
})

describe('TranscricaoReviewPanel — vigente, superadas e falhas (D-39 / D4 / D-42)', () => {
  const vigente = analise({ id: 'nova', created_at: '2026-09-22T10:00:00Z' })
  const superadaRevisada = analise({
    id: 'antiga-revisada',
    superada_em: '2026-09-22T10:00:00Z',
    revisada_por: 'rh-uuid',
    revisao_confirmada_em: '2026-09-21T13:30:00Z',
    created_at: '2026-09-21T10:00:00Z',
  })
  const superadaSemRevisao = analise({
    id: 'antiga-sem-revisao',
    superada_em: '2026-09-21T09:00:00Z',
    created_at: '2026-09-20T10:00:00Z',
  })

  function comHistorico() {
    return grupo({
      vigentes: [vigente],
      superadas: [superadaRevisada, superadaSemRevisao],
    })
  }

  it('mostra a VIGENTE como vigente, com a entrevista de que ela é', () => {
    render(<TranscricaoReviewPanel analises={comHistorico()} />)
    expect(
      screen.getByRole('heading', {
        name: `${TRANSCRICAO_COPY.vigenteTitulo} — ${TRANSCRICAO_COPY.online}`,
      }),
    ).toBeInTheDocument()
  })

  it('a vigente sem revisão aparece como «aguardando revisão humana» (D-42)', () => {
    render(<TranscricaoReviewPanel analises={comHistorico()} />)
    const bloco = screen.getByTestId('analise-vigente')
    expect(
      within(bloco).getByText(TRANSCRICAO_COPY.aguardandoRevisao),
    ).toBeInTheDocument()
  })

  it('as DUAS superadas ficam acessíveis, com a data da superação', () => {
    render(<TranscricaoReviewPanel analises={comHistorico()} />)
    expect(screen.getByRole('heading', { name: TRANSCRICAO_COPY.anterioresTitulo })).toBeInTheDocument()
    expect(screen.getAllByTestId('analise-superada')).toHaveLength(2)
    expect(screen.getByText(/Superada em 22\/09\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/Superada em 21\/09\/2026/)).toBeInTheDocument()
  })

  it('a superada REVISADA mostra a revisão que teve — quem e quando (D-42)', () => {
    render(<TranscricaoReviewPanel analises={comHistorico()} />)
    const revisada = screen.getAllByTestId('analise-superada')[0]
    expect(
      within(revisada).getByText(
        new RegExp(`${TRANSCRICAO_COPY.revisadaPorEquipe} em 21/09/2026`),
      ),
    ).toBeInTheDocument()
  })

  it('a superada SEM revisão diz que não foi revisada, em vez de ficar muda', () => {
    render(<TranscricaoReviewPanel analises={comHistorico()} />)
    const semRevisao = screen.getAllByTestId('analise-superada')[1]
    expect(within(semRevisao).getByText(TRANSCRICAO_COPY.semRevisao)).toBeInTheDocument()
  })

  it('a superada LEGADA (sem `superada_em` gravado) diz que a data não está registrada — nunca inventa uma', () => {
    const legada = analise({ id: 'legada', superada_em: null, created_at: '2026-09-19T10:00:00Z' })
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [vigente], superadas: [legada] })}
      />,
    )
    expect(screen.getByText(TRANSCRICAO_COPY.superadaSemData)).toBeInTheDocument()
  })

  it('a análise que FALHOU aparece como falha, NUNCA como vigente (D-39)', () => {
    const falha = analise({
      id: 'falha',
      status_analise: 'falhou',
      competencias: null,
      created_at: '2026-09-23T10:00:00Z',
    })
    render(
      <TranscricaoReviewPanel analises={grupo({ vigentes: [vigente], falhas: [falha] })} />,
    )
    expect(screen.getByRole('heading', { name: TRANSCRICAO_COPY.falhasTitulo })).toBeInTheDocument()
    expect(screen.getByTestId('analise-falha')).toBeInTheDocument()
    // A vigente segue sendo a vigente, apesar de a falha ser MAIS NOVA que ela.
    expect(
      screen.getByRole('heading', {
        name: `${TRANSCRICAO_COPY.vigenteTitulo} — ${TRANSCRICAO_COPY.online}`,
      }),
    ).toBeInTheDocument()
  })

  it('o grupo SEM tipo aparece como «entrevista não identificada» — sem palpitar online/presencial', () => {
    const semTipo = analise({ id: 'sem-tipo', tipo: null })
    render(<TranscricaoReviewPanel analises={grupo({ vigentes: [semTipo] })} />)
    expect(
      screen.getByRole('heading', {
        name: `${TRANSCRICAO_COPY.vigenteTitulo} — ${TRANSCRICAO_COPY.semTipo}`,
      }),
    ).toBeInTheDocument()
  })

  it('uma vigente por ENTREVISTA: online e presencial aparecem as duas', () => {
    const online = analise({ id: 'v-online', tipo: 'online' })
    const presencial = analise({ id: 'v-presencial', tipo: 'presencial' })
    render(<TranscricaoReviewPanel analises={grupo({ vigentes: [presencial, online] })} />)
    expect(screen.getAllByTestId('analise-vigente')).toHaveLength(2)
  })
})

/**
 * O botão de confirmar leva o rótulo da entrevista como sufixo («… — Entrevista online»).
 * Toda consulta NEGATIVA ou de CONTAGEM usa este prefixo em regex: uma consulta pelo rótulo
 * antigo como string exata devolveria null com o botão na tela — um negativo vácuo, verde
 * para sempre (49-31, D-56). A regex fica escrita em cada consulta, e não numa constante,
 * para que o `<verify>` do plano conte as consultas que a usam.
 */

describe('TranscricaoReviewPanel — a revisão em CADA vigente pendente (CR-03)', () => {
  // O portão `avancar_etapa` bloqueia por QUALQUER vigente com bandeira pendente, e
  // `confirmar_revisao_entrevista` aceita qualquer vigente por id. A tela tem de olhar as
  // mesmas vigentes — não só a mais recente (D-39).
  const onlineAntigaComBandeira = analise({
    id: 'v-online-bandeira',
    tipo: 'online',
    bloqueio_avanco: true,
    revisao_confirmada_em: null,
    created_at: '2026-09-20T10:00:00Z',
  })
  const presencialNovaSemBandeira = analise({
    id: 'v-presencial-limpa',
    tipo: 'presencial',
    bloqueio_avanco: false,
    created_at: '2026-09-25T10:00:00Z',
  })

  it('a bandeira da vigente MAIS ANTIGA aparece, nomeia a entrevista e confirma pelo id DELA', async () => {
    const onConfirmarRevisao = vi.fn()
    // A presencial vem PRIMEIRO, como o `getAnalises` ordena — ela é a `vigenteMaisRecente`.
    const g = grupo({ vigentes: [presencialNovaSemBandeira, onlineAntigaComBandeira] })
    expect(g.vigenteMaisRecente?.id).toBe('v-presencial-limpa')
    render(
      <TranscricaoReviewPanel
        analises={g}
        onConfirmarRevisao={onConfirmarRevisao}
        onAvancarEtapa={vi.fn()}
      />,
    )
    const pendentes = screen.getByTestId('transcricao-revisao-pendente')
    expect(within(pendentes).getByText(TRANSCRICAO_COPY.online)).toBeInTheDocument()
    expect(within(pendentes).queryByText(TRANSCRICAO_COPY.presencial)).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Confirmar revisão humana/ })).toHaveLength(1)
    fireEvent.click(
      screen.getByRole('button', {
        name: `Confirmar revisão humana — ${TRANSCRICAO_COPY.online}`,
      }),
    )
    expect(onConfirmarRevisao).toHaveBeenCalledTimes(1)
    expect(onConfirmarRevisao).toHaveBeenCalledWith('v-online-bandeira')
    // O avanço fica desabilitado PELA BANDEIRA (há handler, então não é o «sem avanço»).
    const avancar = screen.getByRole('button', { name: 'Avançar etapa' })
    expect(avancar).toBeDisabled()
    fireEvent.focus(avancar.parentElement as HTMLElement)
    expect(
      (await screen.findAllByText(
        'Revise a bandeira de linguagem/sotaque antes de avançar a etapa.',
      )).length,
    ).toBeGreaterThan(0)
  })

  it('duas vigentes bandeiradas e não confirmadas ⇒ dois botões, cada um com o id da SUA análise', () => {
    const onConfirmarRevisao = vi.fn()
    const presencialComBandeira = analise({
      ...presencialNovaSemBandeira,
      id: 'v-presencial-bandeira',
      bloqueio_avanco: true,
    })
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [presencialComBandeira, onlineAntigaComBandeira] })}
        onConfirmarRevisao={onConfirmarRevisao}
      />,
    )
    expect(screen.getAllByRole('button', { name: /^Confirmar revisão humana/ })).toHaveLength(2)
    fireEvent.click(
      screen.getByRole('button', {
        name: `Confirmar revisão humana — ${TRANSCRICAO_COPY.presencial}`,
      }),
    )
    expect(onConfirmarRevisao).toHaveBeenLastCalledWith('v-presencial-bandeira')
    fireEvent.click(
      screen.getByRole('button', {
        name: `Confirmar revisão humana — ${TRANSCRICAO_COPY.online}`,
      }),
    )
    expect(onConfirmarRevisao).toHaveBeenLastCalledWith('v-online-bandeira')
    expect(onConfirmarRevisao).toHaveBeenCalledTimes(2)
  })

  it('uma confirmada e outra pendente ⇒ continua bloqueado, e SÓ a pendente tem botão', () => {
    const onConfirmarRevisao = vi.fn()
    const presencialConfirmada = analise({
      ...presencialNovaSemBandeira,
      id: 'v-presencial-confirmada',
      bloqueio_avanco: true,
      revisada_por: 'rh-uuid',
      revisao_confirmada_em: '2026-09-26T10:00:00Z',
    })
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [presencialConfirmada, onlineAntigaComBandeira] })}
        onConfirmarRevisao={onConfirmarRevisao}
        onAvancarEtapa={vi.fn()}
      />,
    )
    const botoes = screen.getAllByRole('button', { name: /^Confirmar revisão humana/ })
    expect(botoes).toHaveLength(1)
    expect(botoes[0]).toHaveAccessibleName(`Confirmar revisão humana — ${TRANSCRICAO_COPY.online}`)
    fireEvent.click(botoes[0])
    expect(onConfirmarRevisao).toHaveBeenCalledWith('v-online-bandeira')
    expect(onConfirmarRevisao).not.toHaveBeenCalledWith('v-presencial-confirmada')
    expect(screen.getByRole('button', { name: 'Avançar etapa' })).toBeDisabled()
  })

  it('todas as bandeiradas confirmadas ⇒ «Revisão humana confirmada», nenhum botão, sem tom destrutivo', () => {
    const confirmada = (a: EntrevistaAnaliseRow) =>
      analise({ ...a, bloqueio_avanco: true, revisao_confirmada_em: '2026-09-26T10:00:00Z' })
    render(
      <TranscricaoReviewPanel
        analises={grupo({
          vigentes: [confirmada(presencialNovaSemBandeira), confirmada(onlineAntigaComBandeira)],
        })}
        onAvancarEtapa={vi.fn()}
      />,
    )
    const bandeiras = screen.getByTestId('transcricao-bandeiras')
    expect(within(bandeiras).getAllByText(/Revisão humana confirmada/).length).toBeGreaterThan(0)
    expect(bandeiras.className).not.toMatch(/red-/)
    expect(screen.queryAllByRole('button', { name: /^Confirmar revisão humana/ })).toHaveLength(0)
    expect(screen.queryByTestId('transcricao-revisao-pendente')).toBeNull()
    expect(screen.getByRole('button', { name: 'Avançar etapa' })).toBeEnabled()
  })

  it('vigente do grupo SEM tipo, bandeirada ⇒ botão rotulado «Entrevista não identificada»', () => {
    const onConfirmarRevisao = vi.fn()
    const semTipo = analise({ id: 'v-sem-tipo', tipo: null, bloqueio_avanco: true })
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [semTipo] })}
        onConfirmarRevisao={onConfirmarRevisao}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: `Confirmar revisão humana — ${TRANSCRICAO_COPY.semTipo}`,
      }),
    )
    expect(onConfirmarRevisao).toHaveBeenCalledWith('v-sem-tipo')
  })

  it('a superada bandeirada NÃO oferece botão de revisar — é uma ação que o servidor recusa', () => {
    const superadaComBandeira = analise({
      id: 'superada-bandeira',
      bloqueio_avanco: true,
      superada_em: '2026-09-22T10:00:00Z',
    })
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [presencialNovaSemBandeira], superadas: [superadaComBandeira] })}
      />,
    )
    const item = screen.getByTestId('analise-superada')
    expect(within(item).queryByRole('button')).toBeNull()
    expect(screen.queryAllByRole('button', { name: /^Confirmar revisão humana/ })).toHaveLength(0)
  })

  it('sem bandeira disparada não há botão de confirmar revisão em lugar nenhum', () => {
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [presencialNovaSemBandeira, analise({ id: 'v-limpa' })] })}
      />,
    )
    expect(screen.queryByRole('button', { name: /^Confirmar revisão humana/ })).toBeNull()
    expect(screen.queryByTestId('transcricao-bandeiras')).toBeNull()
  })
})

describe('TranscricaoReviewPanel — o que a EF fez de fato com o texto (D-40)', () => {
  it('reaproveitada + vigente ⇒ diz que o texto já tinha sido analisado e que a análise vale', () => {
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [analise()] })}
        resultado={{
          analise_id: 'a-1',
          tipo: 'online',
          reaproveitada: true,
          vigente: true,
          falhou: false,
        }}
      />,
    )
    expect(screen.getByTestId('transcricao-resultado-aviso')).toHaveTextContent(
      TRANSCRICAO_COPY.reaproveitadaVigente,
    )
  })

  it('reaproveitada + NÃO vigente ⇒ diz que a vigente desta entrevista é outra', () => {
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [analise()] })}
        resultado={{
          analise_id: 'a-antiga',
          tipo: 'online',
          reaproveitada: true,
          vigente: false,
          falhou: false,
        }}
      />,
    )
    expect(screen.getByTestId('transcricao-resultado-aviso')).toHaveTextContent(
      TRANSCRICAO_COPY.reaproveitadaSuperada,
    )
  })

  it('falhou ⇒ diz que a análise não pôde ser concluída e a vigente anterior CONTINUA na tela', () => {
    const vigenteBoa = analise({ id: 'boa' })
    render(
      <TranscricaoReviewPanel
        analises={grupo({
          vigentes: [vigenteBoa],
          falhas: [analise({ id: 'f', status_analise: 'falhou', competencias: null })],
        })}
        resultado={{
          analise_id: 'f',
          tipo: 'online',
          reaproveitada: false,
          vigente: false,
          falhou: true,
        }}
      />,
    )
    expect(screen.getByTestId('transcricao-resultado-aviso')).toHaveTextContent(
      TRANSCRICAO_COPY.falhou,
    )
    expect(screen.getByTestId('analise-vigente')).toBeInTheDocument()
  })

  it('análise nova e normal NÃO mostra aviso nenhum (nem simula um)', () => {
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [analise()] })}
        resultado={{
          analise_id: 'a-1',
          tipo: 'online',
          reaproveitada: false,
          vigente: true,
          falhou: false,
        }}
      />,
    )
    expect(screen.queryByTestId('transcricao-resultado-aviso')).toBeNull()
  })
})

describe('TranscricaoReviewPanel — selo de proveniência (D-27b)', () => {
  it("provedor_ia='openai' na vigente ⇒ selo de CONTINGÊNCIA", () => {
    render(
      <TranscricaoReviewPanel
        analises={grupo({
          vigentes: [analise({ provedor_ia: 'openai', modelo_ia: 'gpt-4o-mini' })],
        })}
      />,
    )
    const selos = screen.getAllByTestId('proveniencia-ia-badge')
    expect(selos[0]).toHaveAttribute('data-contingencia', 'true')
    expect(selos[0]).toHaveTextContent('gpt-4o-mini')
  })

  it("provedor_ia='anthropic' ⇒ selo neutro (o modelo configurado respondeu)", () => {
    render(<TranscricaoReviewPanel analises={grupo({ vigentes: [analise()] })} />)
    expect(screen.getByTestId('proveniencia-ia-badge')).toHaveAttribute(
      'data-contingencia',
      'false',
    )
  })

  it('modelo_ia NULL ⇒ «modelo não registrado», nunca silêncio (D-30)', () => {
    render(
      <TranscricaoReviewPanel
        analises={grupo({ vigentes: [analise({ provedor_ia: null, modelo_ia: null })] })}
      />,
    )
    expect(screen.getByTestId('proveniencia-ia-badge')).toHaveTextContent(
      'modelo não registrado',
    )
  })

  it('a SUPERADA também carrega o seu selo — a proveniência dela não é a da vigente', () => {
    render(
      <TranscricaoReviewPanel
        analises={grupo({
          vigentes: [analise({ id: 'v', provedor_ia: 'anthropic' })],
          superadas: [
            analise({
              id: 's',
              superada_em: '2026-09-22T10:00:00Z',
              provedor_ia: 'openai',
              modelo_ia: 'gpt-4o-mini',
            }),
          ],
        })}
      />,
    )
    const item = screen.getByTestId('analise-superada')
    expect(within(item).getByTestId('proveniencia-ia-badge')).toHaveAttribute(
      'data-contingencia',
      'true',
    )
  })
})

describe('TranscricaoReviewPanel — estados vazios e linguagem', () => {
  it('sem análise nenhuma: nem vigente, nem superadas, nem falhas na tela', () => {
    render(<TranscricaoReviewPanel analises={grupo()} />)
    expect(screen.queryByTestId('analise-vigente')).toBeNull()
    expect(screen.queryByRole('heading', { name: TRANSCRICAO_COPY.anterioresTitulo })).toBeNull()
    expect(screen.queryByRole('heading', { name: TRANSCRICAO_COPY.falhasTitulo })).toBeNull()
  })

  it('analises null (leitura ainda não resolvida) não quebra o painel', () => {
    render(<TranscricaoReviewPanel analises={null} loading />)
    expect(screen.getByText('Carregando análise…')).toBeInTheDocument()
  })

  it('NUNCA usa a linguagem clínica banida (RNF-12a / LGPD-04)', () => {
    const { container } = render(
      <TranscricaoReviewPanel
        analises={grupo({
          vigentes: [analise()],
          superadas: [analise({ id: 's', superada_em: '2026-09-22T10:00:00Z' })],
          falhas: [analise({ id: 'f', status_analise: 'falhou', competencias: null })],
        })}
      />,
    )
    const texto = (container.textContent ?? '').toLowerCase()
    for (const proibido of ['psicológico', 'psicotécnico', 'psicólogo', 'psicométric']) {
      expect(texto).not.toContain(proibido)
    }
  })
})
