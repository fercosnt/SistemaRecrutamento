/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 49 / plano 49-15 — o bloco «Análise da IA» da revisão de redação (D-25/D-26/D-27b).
 *
 * Esta suíte existe porque o painel dizia DUAS coisas falsas ao mesmo tempo, e nenhuma delas
 * tinha teste:
 *
 *  1. **O rótulo não era o da rubrica avaliada.** A tela tinha um mapa próprio rotulando
 *     D1–D4 com os 4 valores Beauty Smile. Depois do plano 49-09 a Edge Function passou a
 *     medir a rubrica BARS do PRD (D1 = especificidade da SITUAÇÃO), e toda redação avaliada
 *     desde aquele deploy aparecia com um número correto sob uma legenda falsa (WINDOWS 52).
 *     As asserções abaixo **iteram sobre `DIMENSOES_REDACAO`** — a constante que o modelo
 *     recebe — em vez de travar rótulos literais: é a forma que reprova a divergência em vez
 *     de congelá-la.
 *  2. **O raciocínio da IA nunca apareceu.** A tela lia `analise_ia.reasoning` e
 *     `analise_ia.citacoes`, chaves que NÃO EXISTEM no JSONB. Medido em PROD em 2026-09-23
 *     (só leitura, nas 2 linhas vivas): `analise_ia ? 'reasoning'` = false nas duas, enquanto
 *     `dimension_scores[0] ? 'reasoning'` e `? 'cited_evidence'` = true nas duas. Os blocos
 *     renderizavam vazio sobre dado presente.
 *
 * ⚠ A asserção de ORDEM TROCADA é a que prova o mecanismo: com `dimension_scores` em
 * (D3, D1, D4, D2), cada raciocínio tem de aparecer sob o rótulo da SUA chave. Uma leitura
 * por índice passaria em todos os outros testes desta suíte e falharia só neste.
 *
 * O componente exportado é testado direto, sem montar a shell do RH (RHLayout + router +
 * TanStack Query): o objeto do teste é o que o RH LÊ sobre a análise, não o wiring da página.
 *
 * @see src/features/triagem/components/RedacaoReviewPanel.tsx
 * @see supabase/functions/_shared/bars-redacao.ts (a rubrica — fonte única, D-25)
 * @see .planning/phases/49-consertos-da-jornada-bloco-2/49-09-SUMMARY.md (a EF que a envia)
 */
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'

import { AnaliseIA } from '../RedacaoReviewPanel'
import type {
  AnaliseIARedacao,
  DimensionScoreIA,
  RedacaoReviewRow,
} from '../../services/revisaoRedacaoService'
import {
  DIMENSOES_REDACAO,
  RUBRICA_REDACAO_VERSAO,
  VALORES_BEAUTY_SMILE,
} from '../../../../../supabase/functions/_shared/bars-redacao'

/** Raciocínio/citações determinísticos por chave — o texto carrega a chave para poder casar. */
function dimensionScore(chave: string): DimensionScoreIA {
  return {
    dimension: chave,
    dimension_name: `nome-${chave}`,
    reasoning: `Raciocínio da IA sobre ${chave}.`,
    cited_evidence: [
      { text: `citacao-A-${chave}`, location: 'Parágrafo 2' },
      { text: `citacao-B-${chave}`, location: 'Frase final' },
    ],
    score: 4,
    level: 'proficient',
  }
}

function analise(ordem: string[]): AnaliseIARedacao {
  return {
    dimension_scores: ordem.map(dimensionScore),
    qualitative_summary: 'Resumo qualitativo que a IA escreveu sobre a redação inteira.',
    overall_score: 80,
    recommendation: 'good_fit',
    red_flag_etico: false,
  }
}

function row(over: Partial<RedacaoReviewRow> = {}): RedacaoReviewRow {
  return {
    id: 'red-1',
    candidatura_id: 'cand-1',
    pergunta_id: 'perg-1',
    texto: 'Texto da redação do candidato.',
    scores_dimensao: { D1: 5, D2: 4, D3: 3, D4: 2 },
    score_ponderado_0_100: 70,
    classificacao_cor: 'amarelo',
    red_flag_etico: false,
    flags: [],
    analise_ia: analise(['D1', 'D2', 'D3', 'D4']),
    rubrica_versao: RUBRICA_REDACAO_VERSAO,
    provedor_ia: 'anthropic',
    modelo_ia: 'claude-sonnet-4-6',
    scores_humanos: null,
    notas_revisor: null,
    decisao_revisor: null,
    revisada_por: null,
    revisada_em: null,
    status_analise: 'sucesso',
    bloqueio_avanco: false,
    candidato_nome: 'Candidata Fixture',
    ...over,
  }
}

/** O `<li>` daquela dimensão — o recorte em que rótulo, nota e raciocínio TÊM de coexistir. */
function itemDaDimensao(rotulo: string): HTMLElement {
  const el = screen.getByText(rotulo).closest('li')
  expect(el).not.toBeNull()
  return el as HTMLElement
}

describe('AnaliseIA — o rótulo é o da rubrica que o modelo recebeu (D-25)', () => {
  it.each(DIMENSOES_REDACAO.map((d) => [d.chave, d.rotulo]))(
    'mostra o rótulo da constante para a chave %s: "%s"',
    (_chave, rotulo) => {
      render(<AnaliseIA row={row()} />)
      expect(screen.getByText(rotulo as string)).toBeInTheDocument()
    },
  )

  it.each(VALORES_BEAUTY_SMILE.map((v) => [v]))(
    'NÃO usa o valor Beauty Smile "%s" como rótulo de dimensão',
    (valor) => {
      render(<AnaliseIA row={row()} />)
      expect(screen.queryByText(valor as string)).toBeNull()
    },
  )

  it('renderiza uma entrada por dimensão da rubrica, e nenhuma a mais', () => {
    render(<AnaliseIA row={row()} />)
    for (const dim of DIMENSOES_REDACAO) {
      expect(screen.getAllByText(dim.rotulo)).toHaveLength(1)
    }
  })

  it.each(DIMENSOES_REDACAO.map((d) => [d.chave, d.rotulo]))(
    'mostra a nota de %s ao lado do rótulo "%s"',
    (chave, rotulo) => {
      const r = row()
      render(<AnaliseIA row={r} />)
      const esperado = `${(r.scores_dimensao as Record<string, number>)[chave as string]} / 5`
      expect(within(itemDaDimensao(rotulo as string)).getByText(esperado)).toBeInTheDocument()
    },
  )

  it('mostra «—» quando a dimensão não tem nota numérica', () => {
    render(<AnaliseIA row={row({ scores_dimensao: { D1: 'insufficient_evidence' } })} />)
    expect(
      within(itemDaDimensao(DIMENSOES_REDACAO[0].rotulo)).getByText('—'),
    ).toBeInTheDocument()
  })
})

describe('AnaliseIA — raciocínio e citações vêm de dimension_scores, POR DIMENSÃO', () => {
  it.each(DIMENSOES_REDACAO.map((d) => [d.chave, d.rotulo]))(
    'o raciocínio de %s aparece sob o rótulo "%s"',
    (chave, rotulo) => {
      render(<AnaliseIA row={row()} />)
      expect(
        within(itemDaDimensao(rotulo as string)).getByText(`Raciocínio da IA sobre ${chave}.`),
      ).toBeInTheDocument()
    },
  )

  it.each(DIMENSOES_REDACAO.map((d) => [d.chave, d.rotulo]))(
    'as 2 citações de %s aparecem sob o rótulo "%s", com a localização',
    (chave, rotulo) => {
      render(<AnaliseIA row={row()} />)
      const item = within(itemDaDimensao(rotulo as string))
      expect(item.getByText(new RegExp(`citacao-A-${chave}`))).toBeInTheDocument()
      expect(item.getByText(new RegExp(`citacao-B-${chave}`))).toBeInTheDocument()
      expect(item.getByText(/Parágrafo 2/)).toBeInTheDocument()
      expect(item.getByText(/Frase final/)).toBeInTheDocument()
    },
  )

  // ⚠ A asserção que prova o mecanismo: leitura por índice passaria em tudo acima.
  it.each(DIMENSOES_REDACAO.map((d) => [d.chave, d.rotulo]))(
    'com dimension_scores em ordem TROCADA (D3,D1,D4,D2), o raciocínio de %s segue sob "%s"',
    (chave, rotulo) => {
      render(<AnaliseIA row={row({ analise_ia: analise(['D3', 'D1', 'D4', 'D2']) })} />)
      expect(
        within(itemDaDimensao(rotulo as string)).getByText(`Raciocínio da IA sobre ${chave}.`),
      ).toBeInTheDocument()
    },
  )

  it('mostra o qualitative_summary que a IA escreveu', () => {
    render(<AnaliseIA row={row()} />)
    expect(
      screen.getByText(/Resumo qualitativo que a IA escreveu sobre a redação inteira\./),
    ).toBeInTheDocument()
  })

  it('sem analise_ia, os rótulos continuam e nada de raciocínio é inventado', () => {
    render(<AnaliseIA row={row({ analise_ia: null })} />)
    for (const dim of DIMENSOES_REDACAO) {
      expect(screen.getByText(dim.rotulo)).toBeInTheDocument()
    }
    expect(screen.queryByText(/Raciocínio da IA sobre/)).toBeNull()
    expect(screen.queryByText(/Resumo/)).toBeNull()
  })

  // As chaves de RAIZ que a tela lia antes não existem no JSONB (medido em PROD). Um render
  // que as honrasse voltaria a mostrar texto fora de dimensão — e é o que esta asserção nega.
  it('ignora `reasoning`/`citacoes` na RAIZ de analise_ia (chaves que não existem no contrato)', () => {
    render(
      <AnaliseIA
        row={row({
          analise_ia: {
            reasoning: 'RACIOCINIO-DE-RAIZ',
            citacoes: ['CITACAO-DE-RAIZ'],
            dimension_scores: [],
          } as AnaliseIARedacao,
        })}
      />,
    )
    expect(screen.queryByText(/RACIOCINIO-DE-RAIZ/)).toBeNull()
    expect(screen.queryByText(/CITACAO-DE-RAIZ/)).toBeNull()
  })
})

describe('AnaliseIA — proveniência e versão da rubrica (D-26 / D-27b)', () => {
  it('rubrica_versao NULL ⇒ aviso de rubrica antiga', () => {
    render(<AnaliseIA row={row({ rubrica_versao: null })} />)
    expect(screen.getByTestId('redacao-rubrica-versao-antiga')).toBeInTheDocument()
  })

  it(`rubrica_versao = '${RUBRICA_REDACAO_VERSAO}' ⇒ SEM aviso`, () => {
    render(<AnaliseIA row={row({ rubrica_versao: RUBRICA_REDACAO_VERSAO })} />)
    expect(screen.queryByTestId('redacao-rubrica-versao-antiga')).toBeNull()
  })

  it('provedor_ia = openai ⇒ selo de contingência no painel', () => {
    render(<AnaliseIA row={row({ provedor_ia: 'openai', modelo_ia: 'gpt-4o-mini' })} />)
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toHaveAttribute('data-contingencia', 'true')
    expect(selo).toHaveTextContent(/contingência/)
    expect(selo).toHaveTextContent(/gpt-4o-mini/)
  })

  it('provedor_ia = anthropic ⇒ selo neutro com o modelo real', () => {
    render(<AnaliseIA row={row()} />)
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toHaveAttribute('data-contingencia', 'false')
    expect(selo).toHaveTextContent(/claude-sonnet-4-6/)
  })

  it('modelo_ia NULL ⇒ «modelo não registrado», nunca silêncio (D-30)', () => {
    render(<AnaliseIA row={row({ provedor_ia: null, modelo_ia: null })} />)
    expect(screen.getByTestId('proveniencia-ia-badge')).toHaveTextContent(
      /modelo não registrado/,
    )
  })
})
