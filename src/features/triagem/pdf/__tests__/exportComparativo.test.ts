/**
 * exportComparativo — a proveniência vai no PDF (D-27b / JORN-28).
 *
 * Phase 49 / plano 49-13, Task 2. Arquivo NOVO.
 *
 * ─── POR QUE O PDF É O CASO MAIS GRAVE, E NÃO UMA CÓPIA DO DA TELA ───────────────────
 *
 * Este PDF **circula fora do sistema**: vai por e-mail, entra em pasta compartilhada, é
 * anexado a uma ata. Um ranking de fallback exportado sem aviso viaja, sem contexto e sem
 * data, como se fosse a saída do modelo configurado — e quem o recebe não tem nenhuma tela
 * onde conferir. O selo da tela pode ser lido de novo; o PDF, não.
 *
 * O que este arquivo trava:
 *  1. a linha de proveniência existe, LOGO ABAIXO do título (não no rodapé, não na tabela);
 *  2. em fallback, ela diz que foi contingência, QUAL modelo e a causa legível;
 *  3. `modelo_ia` NULL ⇒ «modelo não registrado» (D-30), nunca linha ausente;
 *  4. a cópia é EXATAMENTE a da tela (`textoProveniencia`), não uma segunda redação — duas
 *     redações divergem, e a que ninguém revisaria é a do arquivo que sai da empresa.
 *
 * `jspdf` e `jspdf-autotable` são mockados: o que se testa é o TEXTO que o gerador manda
 * imprimir, não o PDF renderizado. Um teste que abrisse o binário mediria o jsPDF.
 *
 * @see src/features/triagem/pdf/exportComparativo.ts
 * @see src/features/triagem/components/ProvenienciaIABadge.tsx (a cópia canônica)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── jsPDF mockado: captura (texto, x, y) de cada `doc.text` e o `save` ────────────────
const { textCalls, saveMock, autoTableMock, autoTableOpts } = vi.hoisted(() => ({
  textCalls: [] as { texto: string; x: number; y: number }[],
  saveMock: vi.fn(),
  autoTableMock: vi.fn(),
  autoTableOpts: { value: null as Record<string, unknown> | null },
}))

vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 297 } }
    setFontSize = vi.fn()
    text = (texto: string, x: number, y: number) => {
      textCalls.push({ texto, x, y })
    }
    save = saveMock
  },
}))

vi.mock('jspdf-autotable', () => ({
  default: (_doc: unknown, opts: Record<string, unknown>) => {
    autoTableOpts.value = opts
    autoTableMock(opts)
  },
}))

import { exportComparativo, type RankedCandidate } from '../exportComparativo'
import { PROVENIENCIA_IA_COPY, textoProveniencia } from '../../components/ProvenienciaIABadge'
import {
  SINAL_INSTRUCAO_AO_MODELO,
  rotuloDoSinal,
} from '../../../../../supabase/functions/_shared/sinal-revisao'

function cand(nome: string, rank: number): RankedCandidate {
  return {
    candidate_id: `C${rank}`,
    nome,
    rank,
    composite_score: 80,
    relative_strengths: ['forte'],
    relative_weaknesses: ['gap'],
    rationale: 'justificativa',
  }
}

const CANDIDATOS = [cand('Ana', 1), cand('Bruno', 2)]

/** O título é a primeira linha impressa; a proveniência é a que vem logo depois. */
function linhaDeProveniencia() {
  return textCalls[1]
}

beforeEach(() => {
  textCalls.length = 0
  saveMock.mockClear()
  autoTableMock.mockClear()
  autoTableOpts.value = null
})

describe('exportComparativo — a linha de proveniência (D-27b)', () => {
  it('fallback: diz contingência, o modelo REAL e a causa legível — logo abaixo do título', () => {
    exportComparativo(CANDIDATOS, {
      provedorIa: 'openai',
      modeloIa: 'gpt-4o-mini-2024',
      fallbackCause: 'anthropic_max_tokens',
    })

    const titulo = textCalls[0]
    const prov = linhaDeProveniencia()
    expect(titulo.texto).toContain('Comparativo de candidatos')
    expect(prov).toBeDefined()
    expect(prov.texto).toContain('modelo de contingência')
    expect(prov.texto).toContain('gpt-4o-mini-2024')
    // «não coube» é o rótulo de `anthropic_max_tokens` em CAUSA_FALLBACK_ROTULO.
    expect(prov.texto).toContain('não coube')
    // ABAIXO do título e na mesma margem esquerda: é a posição que faz o aviso ser lido
    // junto com o cabeçalho, não depois da tabela inteira.
    expect(prov.y).toBeGreaterThan(titulo.y)
    expect(prov.x).toBe(titulo.x)
  })

  it('a cópia do PDF é EXATAMENTE a da tela — não uma segunda redação', () => {
    const prov = {
      provedorIa: 'openai',
      modeloIa: 'gpt-4o-mini-2024',
      fallbackCause: 'anthropic_max_tokens',
    }
    exportComparativo(CANDIDATOS, prov)
    expect(linhaDeProveniencia().texto).toContain(textoProveniencia(prov))
  })

  it('modelo configurado: diz qual modelo respondeu, SEM aviso de contingência', () => {
    exportComparativo(CANDIDATOS, {
      provedorIa: 'anthropic',
      modeloIa: 'claude-sonnet-4-6',
    })
    const prov = linhaDeProveniencia()
    expect(prov.texto).toContain('claude-sonnet-4-6')
    expect(prov.texto).not.toContain('contingência')
  })

  it('modelo NULL ⇒ «modelo não registrado» (D-30); a linha NÃO desaparece', () => {
    exportComparativo(CANDIDATOS, { provedorIa: null, modeloIa: null })
    const prov = linhaDeProveniencia()
    expect(prov).toBeDefined()
    expect(prov.texto).toContain(PROVENIENCIA_IA_COPY.modeloDesconhecido)
  })

  it('contingência com modelo NULL diz as DUAS coisas', () => {
    exportComparativo(CANDIDATOS, {
      provedorIa: 'openai',
      modeloIa: null,
      fallbackCause: 'anthropic_timeout',
    })
    const t = linhaDeProveniencia().texto
    expect(t).toContain('modelo de contingência')
    expect(t).toContain(PROVENIENCIA_IA_COPY.modeloDesconhecido)
    expect(t).toContain('demorou')
  })
})

describe('exportComparativo — o PDF que já existia continua funcionando', () => {
  it('sem proveniência (chamador antigo) NÃO imprime linha inventada, e o PDF sai igual', () => {
    // Retrocompat: o segundo parâmetro é opcional. Uma linha «não registrado» aqui
    // afirmaria uma medição que o chamador nunca fez.
    exportComparativo(CANDIDATOS)
    expect(textCalls).toHaveLength(1)
    expect(saveMock).toHaveBeenCalledWith('comparativo-candidatos.pdf')
  })

  it('a tabela continua com atributos-linha / candidatos-coluna, ordenada por rank', () => {
    exportComparativo([cand('Bruno', 2), cand('Ana', 1)], {
      provedorIa: 'anthropic',
      modeloIa: 'claude-sonnet-4-6',
    })
    const opts = autoTableOpts.value as { head: string[][]; body: string[][]; startY: number }
    expect(opts.head[0]).toEqual(['Atributo', 'Ana', 'Bruno'])
    expect(opts.body.map((r) => r[0])).toEqual([
      'Ranking IA',
      'Score IA',
      'Pontos fortes',
      'Gaps',
      'Justificativa IA',
    ])
    // A tabela começa DEPOIS da linha de proveniência — senão o aviso fica por baixo dela.
    expect(opts.startY).toBeGreaterThan(linhaDeProveniencia().y)
  })

  it('o download continua sendo disparado com o mesmo nome de arquivo', () => {
    exportComparativo(CANDIDATOS, { provedorIa: 'openai', modeloIa: 'gpt-4o-mini' })
    expect(saveMock).toHaveBeenCalledWith('comparativo-candidatos.pdf')
  })
})

// ── Phase 49 / plano 49-42 — o sinal de revisão vai no PDF (decisão (a) + D-27b) ────────
//
// O PDF é o resultado FORA da tela. Um ranking sinalizado exportado sem a marca circularia como
// resultado limpo — o mesmo argumento da proveniência (D-27b), aplicado ao sinal. A cópia é a
// da tela, IMPORTADA de `_shared/sinal-revisao.ts` (e aqui também: nenhuma cópia da frase).
// RED (49-42): a assinatura de hoje só aceita dois argumentos. O alias deixa o tsc do
// pre-commit passar enquanto o COMPORTAMENTO reprova; o GREEN o remove.
const exportarComSinais = exportComparativo as (
  c: RankedCandidate[],
  p?: Parameters<typeof exportComparativo>[1],
  s?: string[],
) => void

/** O startY da última tabela, lido por função (o TS estreitaria a propriedade a `null`). */
function startYDaTabela(): number {
  return (autoTableOpts.value as { startY: number } | null)!.startY
}

describe('exportComparativo — o sinal de revisão no cabeçalho (49-42 / JORN-41)', () => {
  const ROTULO = rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO)

  /** A linha do sinal, achada pelo texto EXATO (não pela posição). */
  function linhasDoSinal() {
    return textCalls.filter((c) => c.texto === ROTULO)
  }

  it('com o código em `sinais`, imprime EXATAMENTE o rótulo, abaixo do título e acima da tabela', () => {
    exportarComSinais(CANDIDATOS, undefined, [SINAL_INSTRUCAO_AO_MODELO])
    const titulo = textCalls[0]
    const sinal = linhasDoSinal()
    expect(sinal).toHaveLength(1)
    expect(sinal[0].y).toBeGreaterThan(titulo.y)
    expect(sinal[0].x).toBe(titulo.x)
    expect(startYDaTabela()).toBeGreaterThan(sinal[0].y)
  })

  it('com proveniência E sinal, as duas linhas saem em y DISTINTOS, as duas acima da tabela', () => {
    const prov = { provedorIa: 'openai', modeloIa: 'gpt-4o-mini', fallbackCause: 'anthropic_timeout' }
    exportarComSinais(CANDIDATOS, prov, [SINAL_INSTRUCAO_AO_MODELO])
    const titulo = textCalls[0]
    const linhaProv = textCalls.find((c) => c.texto === textoProveniencia(prov))
    const sinal = linhasDoSinal()
    expect(linhaProv).toBeDefined()
    expect(sinal).toHaveLength(1)
    expect(linhaProv!.y).toBeGreaterThan(titulo.y)
    expect(sinal[0].y).toBeGreaterThan(titulo.y)
    expect(sinal[0].y).not.toBe(linhaProv!.y)
    expect(startYDaTabela()).toBeGreaterThan(linhaProv!.y)
    expect(startYDaTabela()).toBeGreaterThan(sinal[0].y)
  })

  it('o mesmo código repetido sai UMA vez (a marca não empilha)', () => {
    exportarComSinais(CANDIDATOS, undefined, [SINAL_INSTRUCAO_AO_MODELO, SINAL_INSTRUCAO_AO_MODELO])
    expect(linhasDoSinal()).toHaveLength(1)
  })

  it('`sinais` ausente ou [] ⇒ nenhuma linha nova e o startY de hoje (o PDF não afirma nada sobre sinal)', () => {
    for (const sinais of [undefined, [] as string[]]) {
      textCalls.length = 0
      autoTableOpts.value = null
      exportarComSinais(CANDIDATOS, undefined, sinais)
      expect(textCalls).toHaveLength(1)
      const semProv = startYDaTabela()

      textCalls.length = 0
      autoTableOpts.value = null
      exportarComSinais(CANDIDATOS, { provedorIa: 'anthropic', modeloIa: 'claude-sonnet-4-6' }, sinais)
      expect(textCalls).toHaveLength(2)
      const comProv = startYDaTabela()

      // Os valores históricos (22 sem proveniência, 26 com) — medidos contra a chamada SEM o
      // terceiro argumento, e não contra constantes copiadas para cá.
      textCalls.length = 0
      exportComparativo(CANDIDATOS)
      expect(semProv).toBe(startYDaTabela())
      exportComparativo(CANDIDATOS, { provedorIa: 'anthropic', modeloIa: 'claude-sonnet-4-6' })
      expect(comProv).toBe(startYDaTabela())
    }
    expect(textCalls.some((c) => c.texto === ROTULO)).toBe(false)
  })
})
