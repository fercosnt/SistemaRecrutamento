/**
 * Phase 23 / Plan 23-04 Task 2 — psychometric honesty (UX-07) for the RH scorecard.
 *
 * The Big Five rows are CONTEXTUAL / non-evaluative (RNF-07a): NEVER the raw percentil
 * digit (Phase 23) and NEVER an "abaixo/dentro/acima do esperado" evaluative frame.
 *
 * ⚠ 52-11 / JORN-56 (D-01): a D-32 da 51 («no hub, Big Five só "Concluído" / "Não fez"») está
 * REVOGADA no hub. O detalhe que o RH abre mostra, com linha `big_five`, as FAIXAS que o candidato
 * viu na devolutiva — lidas de `ler_devolutiva_bigfive_rh` (mockada aqui), nunca de
 * `metadata.dimensoes` — e continua sem número da escala, sem dígito e sem o resumo da IA. O
 * `describe` da D-32 foi SUBSTITUÍDO (não apagado) pelo da D-01: «faixa sim, percentil não»; o
 * «Não fez» foi levado como estava. O card da LISTA do RH segue «Concluído / Não fez» (D-05).
 *
 * D-20: o card do caso aberto mostra o TEXTO INTEGRAL do candidato ao lado das citações da IA,
 * lido por `getRespostaCasoAbertoSjt` (mockado aqui), sempre como nó de texto React.
 *
 * @see src/features/avaliacao/components/ScorecardAvaliacao.tsx
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// 52-11: as leituras do hub (Big Five e SJT MC) vão por `avaliacoesRhService` — mockadas no
// mesmo idioma lazy do `getRespostaMock`, com reset e padrão num `beforeEach` próprio.
const lerDevolutivaMock = vi.fn()
const lerSjtMcMock = vi.fn()
vi.mock('../../services/avaliacoesRhService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/avaliacoesRhService')>()
  return {
    ...actual,
    lerDevolutivaBigFiveRh: (...a: unknown[]) => lerDevolutivaMock(...a),
    lerSjtMcRh: (...a: unknown[]) => lerSjtMcMock(...a),
  }
})
beforeEach(() => {
  lerDevolutivaMock.mockReset()
  lerDevolutivaMock.mockResolvedValue({
    situacao: 'sem_devolutiva',
    dimensoes: [],
    disclaimer_emocional: null,
    disclaimer_lgpd_crp: null,
  })
  lerSjtMcMock.mockReset()
  lerSjtMcMock.mockResolvedValue({ situacao: 'disponivel', itens: [] })
})

// Sem `.env.local` (worktree da prova de mordida, CI) o client real lança ao carregar.
vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))
vi.mock('../../hooks/useScorecardCandidato', () => ({
  useScorecardCandidato: vi.fn(),
}))
const getRespostaMock = vi.fn()
vi.mock('../../services/scoresRhService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/scoresRhService')>()
  return { ...actual, getRespostaCasoAbertoSjt: (...a: unknown[]) => getRespostaMock(...a) }
})

import { ScorecardAvaliacao } from '../ScorecardAvaliacao'
import { useScorecardCandidato } from '../../hooks/useScorecardCandidato'
import type { ScoreRow } from '../../services/scoresRhService'

/** O card do caso aberto lê o texto do candidato por `useQuery` (D-20). */
function render(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return rtlRender(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  getRespostaMock.mockReset()
  getRespostaMock.mockResolvedValue({ situacao: 'sem_resposta_enviada', texto: null })
})
// 49-41: o vocabulário do sinal tem UMA fonte, a mesma que a EF escreve.
import {
  SINAL_INSTRUCAO_AO_MODELO,
  rotuloDoSinal,
} from '../../../../../supabase/functions/_shared/sinal-revisao'

const BIGFIVE_ROW = {
  id: 'bf-1',
  tipo: 'big_five',
  subtipo: null,
  pergunta_id: null,
  score: null,
  score_max: null,
  status: 'sucesso',
  metadata: {
    dimensoes: [
      { dim: 'O', percentil: 88, banda: 'muito_alto' },
      { dim: 'N', percentil: 12, banda: 'muito_baixo' },
    ],
    resumo_executivo: 'Resumo executivo AI.',
  },
  citacoes: null,
  red_flags: null,
} as unknown as ScoreRow

function mockRows(rows: ScoreRow[]) {
  vi.mocked(useScorecardCandidato).mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useScorecardCandidato>)
}

const MC_ROW = {
  id: 'mc-1',
  tipo: 'sjt',
  subtipo: 'mc',
  pergunta_id: null,
  score: 8,
  score_max: 10,
  status: 'sucesso',
  metadata: { respostas: [] },
  citacoes: null,
  red_flags: null,
} as unknown as ScoreRow

describe('ScorecardAvaliacao — UX-07 Big Five banda neutra (sem percentil cru)', () => {
  it('não renderiza nenhum percentil cru nas rows Big Five', () => {
    mockRows([BIGFIVE_ROW])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.queryByText(/Percentil\s*\d/)).toBeNull()
    expect(screen.queryByText(/Percentil/i)).toBeNull()
  })
})

describe('ScorecardAvaliacao — Big Five: faixa sim, percentil não (52-11 / D-01, substitui a D-32)', () => {
  it('com linha big_five: as faixas da devolutiva aparecem, e nenhum número da escala no DOM', async () => {
    // Dimensões com um número extra (cast), como se a rede o trouxesse — e o `BIGFIVE_ROW` carrega
    // 88 e 12 em `metadata.dimensoes`, que o hub NÃO lê (Invariante 2).
    lerDevolutivaMock.mockResolvedValue({
      situacao: 'disponivel',
      dimensoes: [
        { dim: 'O', banda: 'mod_alto', texto_interpretativo: 'Texto O.', percentil: 87 },
        { dim: 'N', banda: 'medio', texto_interpretativo: 'Texto N.', percentil: 87 },
      ],
      disclaimer_emocional: null,
      disclaimer_lgpd_crp: null,
    })
    mockRows([BIGFIVE_ROW])
    const { container } = render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(await screen.findByText('Moderadamente alto')).toBeInTheDocument()
    expect(screen.getByText('Abertura à Experiência')).toBeInTheDocument()
    expect(screen.getByText('Sensibilidade Emocional')).toBeInTheDocument()
    expect(screen.getByText('Médio')).toBeInTheDocument()
    expect(screen.getByTestId('hub-bigfive-resultado')).toBeInTheDocument()
    expect(lerDevolutivaMock).toHaveBeenCalledWith('cand-1')
    // A faixa vem da devolutiva, não de `metadata.dimensoes` («Muito alto»/«Muito baixo» lá).
    expect(screen.queryByText('Muito alto')).toBeNull()
    expect(screen.queryByText('Muito baixo')).toBeNull()
    expect(container.textContent).not.toContain('87')
    expect(container.textContent).not.toContain('88')
    expect(container.textContent).not.toContain('12')
    expect(container.textContent).not.toMatch(/\d/)
    expect(container.textContent).not.toContain('Resumo executivo AI.')
    expect(screen.queryByText(/esperado/i)).toBeNull()
    expect(screen.queryByText('Big Five — Concluído')).toBeNull()
  })

  it('sem linha big_five: a linha do Big Five diz «Não fez»', () => {
    mockRows([MC_ROW])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Big Five — Não fez')).toBeInTheDocument()
    expect(screen.queryByText('Big Five — Concluído')).toBeNull()
  })
})

describe('ScorecardAvaliacao — texto integral do caso aberto ao lado das citações (51-02 / D-20)', () => {
  const CASO = {
    id: 'ca-9',
    tipo: 'sjt',
    subtipo: 'caso_aberto',
    pergunta_id: 'p-9',
    score: 15,
    score_max: 25,
    status: 'sucesso',
    metadata: { dimension_scores: [], composite_0_25: 15 },
    citacoes: ['trecho recortado pela IA'],
    red_flags: null,
  } as unknown as ScoreRow

  it('mostra as citações E o texto do candidato, lido pela RPC da candidatura', async () => {
    getRespostaMock.mockResolvedValue({ situacao: 'disponivel', texto: 'Eu ligaria para o paciente.' })
    mockRows([CASO])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('trecho recortado pela IA')).toBeInTheDocument()
    expect(screen.getByText('Texto do candidato')).toBeInTheDocument()
    expect(await screen.findByText('Eu ligaria para o paciente.')).toBeInTheDocument()
    expect(getRespostaMock).toHaveBeenCalledWith('cand-1')
  })

  it('o texto com marcação aparece LITERAL, nunca como HTML (T-51-04)', async () => {
    getRespostaMock.mockResolvedValue({ situacao: 'disponivel', texto: 'antes <b>negrito</b> depois' })
    mockRows([CASO])
    const { container } = render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(await screen.findByText('antes <b>negrito</b> depois')).toBeInTheDocument()
    expect(container.querySelector('b')).toBeNull()
  })

  it('sem resposta enviada: o lugar do texto diz isso (o recorte nunca fica sozinho calado)', async () => {
    mockRows([CASO])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Texto do candidato')).toBeInTheDocument()
    expect(await screen.findByText('Não há resposta enviada ao caso aberto.')).toBeInTheDocument()
  })
})

// ── Phase 49 / plano 49-41 — o motivo «instrução à IA» no card da SJT (JORN-41) ────────
//
// Na SJT caso aberto, uma resposta com imperativo nu dirigido à IA é avaliada normalmente:
// a nota composta É gravada e o código entra em `metadata.motivos_revisao` (49-39). O status
// é o que as OUTRAS causas decidirem — desde o 49-REVIEW-GAPS-2 CR-01 o sinal não manda mais a
// linha para `pendente_humano`, então o aviso aparece com qualquer status. Este plano mostra
// SÓ o motivo do sinal — os outros motivos têm dono próprio e não são renderizados aqui.
describe('ScorecardAvaliacao — o motivo do sinal, com qualquer status (49-41 / JORN-41)', () => {
  function casoAberto(motivos: string[] | undefined): ScoreRow {
    return {
      id: 'ca-1',
      tipo: 'sjt',
      subtipo: 'caso_aberto',
      pergunta_id: 'p-1',
      score: 17,
      score_max: 25,
      status: 'pendente_humano',
      metadata: {
        dimension_scores: [{ dimension: 'D1', score_1_5: 4 }],
        composite_0_25: 17,
        ...(motivos ? { motivos_revisao: motivos } : {}),
      },
      citacoes: null,
      red_flags: null,
    } as unknown as ScoreRow
  }

  it('com o código em motivos_revisao, o rótulo pt-BR aparece junto do marcador', () => {
    mockRows([casoAberto([SINAL_INSTRUCAO_AO_MODELO])])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Requer revisão humana')).toBeInTheDocument()
    expect(
      screen.getByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO)),
    ).toBeInTheDocument()
    expect(screen.queryByText(SINAL_INSTRUCAO_AO_MODELO)).toBeNull()
  })

  it('sem o código nos motivos, o rótulo NÃO aparece (e os outros motivos não são deste plano)', () => {
    mockRows([casoAberto(['abaixo_do_corte'])])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getByText('Requer revisão humana')).toBeInTheDocument()
    expect(screen.queryByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO))).toBeNull()
    expect(screen.queryByText('abaixo_do_corte')).toBeNull()
  })

  it('sem motivos_revisao (linhas antigas), nada muda', () => {
    mockRows([casoAberto(undefined)])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.queryByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO))).toBeNull()
  })

  // 49-REVIEW-GAPS-2 CR-01 (2026-09-30): o sinal deixou de mandar a linha para
  // `pendente_humano` — uma resposta sinalizada sem outra causa é gravada `sucesso`, com o
  // código em `motivos_revisao`. O aviso tem de aparecer MESMO ASSIM (é a única marca que
  // sobra), e o marcador «Requer revisão humana» — decidido só pelo status — não.
  it('linha `sucesso` com o código em motivos_revisao: o rótulo aparece, sem o marcador de revisão', () => {
    mockRows([{ ...casoAberto([SINAL_INSTRUCAO_AO_MODELO]), status: 'sucesso' } as ScoreRow])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(
      screen.getByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO)),
    ).toBeInTheDocument()
    expect(screen.queryByText('Requer revisão humana')).toBeNull()
    expect(screen.getByText('17')).toBeInTheDocument()
  })

  it('tom neutro e a nota composta intacta (RNF-07a)', () => {
    mockRows([casoAberto([SINAL_INSTRUCAO_AO_MODELO])])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    const rotulo = screen.getByText(rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO))
    const tokens = rotulo.className.split(/\s+/)
    expect(tokens.filter((t) => /^(bg|text|border)-(red|destructive)/.test(t))).toEqual([])
    expect(screen.getByText('17')).toBeInTheDocument()
  })
})

// ── Phase 52 / plano 52-11 — SJT de múltipla escolha no hub (JORN-57, D-21, D-37) ───────────
//
// Antes, o card listava «Item N · <código cru da etiqueta> · peso». Agora mostra cada situação
// com TODAS as alternativas em ordem neutra e a escolhida destacada — a etiqueta, em pt-BR, SÓ
// nela. As alternativas abaixo carregam etiquetas distintas (cast, como se a rede as trouxesse):
// o DOM tem de ter exatamente UMA etiqueta.
describe('ScorecardAvaliacao — SJT MC: exatamente uma etiqueta, nenhum código cru (52-11 / D-21)', () => {
  const MC_COM_RESPOSTA = {
    ...MC_ROW,
    metadata: {
      respostas: [{ pergunta_id: 'p-1', opcao_id: 'o-2', tag: 'fortemente_pontua', peso: 3 }],
    },
  } as unknown as ScoreRow

  it('linha sjt/mc: a escolhida com «Pontua forte», as outras sem etiqueta, e nenhum `fortemente_pontua` cru', async () => {
    lerSjtMcMock.mockResolvedValue({
      situacao: 'disponivel',
      itens: [
        {
          pergunta_id: 'p-1',
          cenario: 'Cenário da situação.',
          alternativas: [
            { opcao_id: 'o-1', texto: 'Primeira', escolhida: false, tag: 'atencao' },
            { opcao_id: 'o-2', texto: 'Segunda', escolhida: true, tag: 'fortemente_pontua' },
            { opcao_id: 'o-3', texto: 'Terceira', escolhida: false, tag: 'neutro' },
            { opcao_id: 'o-4', texto: 'Quarta', escolhida: false, tag: 'knockout' },
          ],
          escolhida_tag: 'fortemente_pontua',
          escolhida_peso: 3,
          escolhida_no_banco: true,
        },
      ],
    })
    mockRows([MC_COM_RESPOSTA])
    const { container } = render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(await screen.findByText('Situação 1')).toBeInTheDocument()
    expect(lerSjtMcMock).toHaveBeenCalledWith('cand-1')
    expect(screen.getByText('Múltipla escolha')).toBeInTheDocument()
    expect(screen.getAllByTestId('sjt-mc-etiqueta')).toHaveLength(1)
    expect(screen.getByTestId('sjt-mc-etiqueta')).toHaveTextContent('Pontua forte')
    expect(screen.getAllByText('Escolhida')).toHaveLength(1)
    for (const rotulo of ['Atenção', 'Neutro', 'Eliminatória']) expect(screen.queryByText(rotulo)).toBeNull()
    expect(container.textContent).not.toContain('fortemente_pontua')
    expect(screen.queryByText(/^Item \d/)).toBeNull()
  })
})

import { within } from '@testing-library/react'

// ── Phase 52 / plano 52-12 — o card do caso aberto no hub (D-22, D-52-U19, D-52-U23) ───────────
//
// Pelo card INTEIRO: o texto do candidato com as citações marcadas, as não localizadas (ou todas,
// sem o texto) na lista lateral, nenhum âmbar na cadeia de classes do ramo do hub, «Pontos de
// atenção» no lugar de «Red flags», e rótulos/selos em 14px. Os casos D-20 acima ficam como estão.
describe('ScorecardAvaliacao — caso aberto no hub: citações no texto, cor neutra, 14px (52-12 / D-22)', () => {
  const CIT_A = 'ouviria a paciente com calma'
  const CIT_B = 'trecho que a IA citou e não está no texto'
  const CASO_HUB = {
    id: 'ca-12',
    tipo: 'sjt',
    subtipo: 'caso_aberto',
    pergunta_id: 'p-12',
    score: 18,
    score_max: 25,
    status: 'sucesso',
    metadata: {
      dimension_scores: [{ dimension: 'Empatia', score_1_5: 4, level: 'Proficiente', reasoning: 'Raciocínio.' }],
      composite_0_25: 18,
      motivos_revisao: [SINAL_INSTRUCAO_AO_MODELO],
    },
    citacoes: [CIT_A, CIT_B],
    red_flags: ['Promete prazo que não depende dela'],
  } as unknown as ScoreRow

  /** Cor por classe: jsdom não computa Tailwind; a cor herdada é a do ancestral mais próximo que declara cor. */
  const COR = /^text-(white|black|amber|red|green|yellow|orange|emerald|teal|cyan|sky|blue|slate|gray|zinc|neutral|stone|\[#)/

  function cadeiaDeClasses(el: Element): string[][] {
    const cadeia: string[][] = []
    for (let n: Element | null = el; n; n = n.parentElement) {
      cadeia.push((n.getAttribute('class') ?? '').split(/\s+/).filter(Boolean))
      if (n === document.body) break
    }
    return cadeia
  }

  function corNeutraNoRamoDoHub() {
    const hub = screen.getByTestId('caso-aberto-hub')
    const comTexto = [hub, ...Array.from(hub.querySelectorAll('*'))].filter((el) =>
      Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== ''),
    )
    expect(comTexto.length).toBeGreaterThan(0)
    for (const el of comTexto) {
      const cadeia = cadeiaDeClasses(el)
      expect(cadeia.flat().filter((c) => c.startsWith('text-amber')), `âmbar na cadeia de «${el.textContent}»`).toEqual([])
      let dono: Element | null = el
      let cor: string | undefined
      for (const classes of cadeia) {
        cor = classes.find((c) => COR.test(c))
        if (cor) break
        dono = dono?.parentElement ?? null
      }
      expect(cor, `sem cor declarada para «${el.textContent}»`).toMatch(/^text-white/)
      expect(hub.contains(dono), `cor de «${el.textContent}» vem de fora do ramo do hub`).toBe(true)
    }
  }

  const SEM_TEXTO = [
    ['carregando', () => getRespostaMock.mockReturnValue(new Promise(() => {})), 'Carregando a resposta…'],
    ['erro', () => getRespostaMock.mockRejectedValue(new Error('rede')), 'Não foi possível carregar a resposta.'],
    ['removida', () => getRespostaMock.mockResolvedValue({ situacao: 'removida', texto: null }), 'O texto desta resposta não está mais disponível.'],
    ['indisponivel', () => getRespostaMock.mockResolvedValue({ situacao: 'indisponivel', texto: null }), 'O texto desta resposta não está disponível.'],
    [
      'sem_resposta_enviada',
      () => getRespostaMock.mockResolvedValue({ situacao: 'sem_resposta_enviada', texto: null }),
      'Não há resposta enviada ao caso aberto.',
    ],
  ] as const

  it.each(SEM_TEXTO)('%s: as 2 citações na lista lateral, zero <mark> no card, e nenhum âmbar no ramo do hub', async (_nome, preparar, frase) => {
    preparar()
    mockRows([CASO_HUB])
    const { container } = render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(await screen.findByText(frase)).toBeInTheDocument()
    const lista = screen.getByTestId('caso-aberto-citacoes-nao-localizadas')
    expect(within(lista).getByText(CIT_A)).toBeInTheDocument()
    expect(within(lista).getByText(CIT_B)).toBeInTheDocument()
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    corNeutraNoRamoDoHub()
  })

  it('caso marcado: a citação presente no texto vira <mark>, e a lista lateral fica só com a outra', async () => {
    getRespostaMock.mockResolvedValue({
      situacao: 'disponivel',
      texto: `Primeiro eu ${CIT_A}.\nDepois explicaria o protocolo.`,
    })
    mockRows([CASO_HUB])
    const { container } = render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(await screen.findByText(CIT_A, { selector: 'mark' })).toBeInTheDocument()
    expect(container.querySelectorAll('mark')).toHaveLength(1)
    const lista = screen.getByTestId('caso-aberto-citacoes-nao-localizadas')
    expect(within(lista).getByText(CIT_B)).toBeInTheDocument()
    expect(within(lista).queryByText(CIT_A)).toBeNull()
    expect(screen.getByText('Trechos marcados: citados pela análise da IA.')).toBeInTheDocument()
    corNeutraNoRamoDoHub()
  })

  it('exatamente um «Texto do candidato», com a variante do hub montada', async () => {
    mockRows([CASO_HUB])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.getAllByText('Texto do candidato')).toHaveLength(1)
    expect(screen.getByTestId('caso-aberto-hub')).toBeInTheDocument()
    expect(await screen.findByText('Não há resposta enviada ao caso aberto.')).toBeInTheDocument()
    expect(screen.getAllByText('Texto do candidato')).toHaveLength(1)
  })

  it('«Pontos de atenção» no lugar de «Red flags» (D-52-U19), e os rótulos em 14px/600 sem caixa-alta', async () => {
    mockRows([CASO_HUB])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    expect(screen.queryByText(/Red flags/i)).toBeNull()
    for (const rotulo of ['Pontos de atenção', 'Texto do candidato']) {
      const classes = screen.getByText(rotulo).className.split(/\s+/)
      expect(classes).toEqual(expect.arrayContaining(['text-sm', 'font-semibold', 'text-white/70']))
      expect(classes).not.toContain('uppercase')
      expect(classes).not.toContain('text-xs')
    }
    expect(screen.getByText('Promete prazo que não depende dela')).toBeInTheDocument()
    await screen.findByText('Não há resposta enviada ao caso aberto.')
  })

  it('selos e sinais do card em 14px (D-52-U23): as duas SugestaoIABadge, o sinal de revisão e o nível; a dimensão em 600', async () => {
    mockRows([CASO_HUB])
    render(<ScorecardAvaliacao candidaturaId="cand-1" />)
    for (const texto of ['Sugestão da IA — decisão é sempre humana', 'Sugestão da IA']) {
      const classes = screen.getByText(texto).className.split(/\s+/)
      expect(classes, texto).toContain('text-sm')
      expect(classes, texto).not.toContain('text-xs')
    }
    const sinal = screen.getByTestId('sjt-sinal-revisao').className.split(/\s+/)
    expect(sinal).toContain('text-sm')
    expect(sinal).not.toContain('text-xs')
    const nivel = screen.getByText('Proficiente').className.split(/\s+/)
    expect(nivel).toEqual(expect.arrayContaining(['text-sm', 'font-semibold']))
    expect(nivel).not.toContain('text-xs')
    const dimensao = screen.getByText('Empatia').className.split(/\s+/)
    expect(dimensao).toContain('font-semibold')
    expect(dimensao).not.toContain('font-medium')
    await screen.findByText('Não há resposta enviada ao caso aberto.')
  })
})
