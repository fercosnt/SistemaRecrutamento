/**
 * Phase 45 — o consumidor do payload **v2 com k-anonimato** (`eeoc_4_5_age_band_v2_k5`).
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────────────
 * O `45-05` mudou `gerar_bias_snapshot` para suprimir células com menos de 5 candidatos.
 * Numa célula suprimida, os campos derivados **não viajam**: sem `applicants`, sem
 * `selected`, sem `selection_rate`, sem `razao_4_5`, sem `flag`. Publicá-los devolveria a
 * contagem por outro caminho, e a supressão não suprimiria nada.
 *
 * O consumidor TypeScript continuava tipando todos esses campos como obrigatórios. Três
 * modos de falha, em ordem crescente de gravidade:
 *
 *   1. `formatRate(undefined)` → `"NaN%"` — ruído visível.
 *   2. `formatRatio(undefined)` → `TypeError` em `.toFixed` — a página **caía inteira**, e
 *      `exportCsv` lançava antes de gerar o arquivo.
 *   3. ⚠ O pior, e o que estes testes existem para tornar impossível: uma célula ausente
 *      renderizada como **zero**. Numa auditoria de viés, "0 candidatos aprovados nesta
 *      faixa" e "o número não foi publicado porque a faixa tem menos de 5 pessoas" são
 *      afirmações OPOSTAS sobre discriminação — e a primeira é acionável contra a empresa.
 *
 * Cada asserção abaixo REPROVA contra o código anterior à correção. Isso é deliberado: um
 * teste que passasse nos dois estados não provaria nada.
 *
 * @see supabase/migrations/20260805000003_p45_bias_k5.sql (o produtor do payload)
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/deferred-items.md (DI-45-05-01)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { bandaSuprimida } from '../biasMath'
import type { AdverseImpactResult, BandResult } from '../biasMath'
import { exportCsv } from '../services/biasAuditService'

/** Payload v2 realista: uma faixa publicada, uma suprimida por k, uma complementar. */
function payloadV2(): AdverseImpactResult {
  return {
    metodo: 'eeoc_4_5_age_band_v2_k5',
    limitacao: 'apenas faixa etária — raça/gênero não coletados (LGPD-01)',
    k_supressao: 5,
    celulas_suprimidas: 2,
    supressao_complementar_aplicada: true,
    n_total_suprimido: true,
    faixa_referencia: '25-34',
    small_sample_warning: true,
    excluidos_sem_data: 3,
    bands: [
      { faixa: '18-24', suprimida: true, motivo_supressao: 'k_anonimato_primaria' },
      {
        faixa: '25-34',
        suprimida: false,
        applicants: 40,
        selected: 20,
        selection_rate: 0.5,
        razao_4_5: 1,
        flag: false,
      },
      { faixa: '35-44', suprimida: true, motivo_supressao: 'complementar' },
    ],
  }
}

describe('discriminador de faixa suprimida', () => {
  it('reconhece a faixa suprimida e a publicada', () => {
    const [suprimida, publicada] = payloadV2().bands
    expect(bandaSuprimida(suprimida)).toBe(true)
    expect(bandaSuprimida(publicada)).toBe(false)
  })

  it('trata payload v1 (SEM a chave `suprimida`) como PUBLICADA — compatibilidade', () => {
    // A função viva em PROD ainda é a v1: a migration do 45-05 não foi aplicada. Um snapshot
    // gerado hoje sai sem a chave, e lê-lo como "suprimida" esconderia dado real.
    const v1 = {
      faixa: '45-54',
      applicants: 12,
      selected: 4,
      selection_rate: 0.3333,
      razao_4_5: 0.67,
      flag: true,
    } as BandResult
    expect(bandaSuprimida(v1)).toBe(false)
  })
})

describe('exportCsv sobre o payload v2', () => {
  let capturado = ''

  beforeEach(() => {
    capturado = ''
    vi.stubGlobal('Blob', class {
      constructor(partes: string[]) {
        capturado = partes.join('')
      }
    })
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:teste',
      revokeObjectURL: () => undefined,
    })
    // O link é criado e clicado; nada disso precisa acontecer de verdade.
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n)
    vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('NÃO lança sobre payload v2 — antes da correção, `.toFixed` de undefined derrubava o export', () => {
    expect(() => exportCsv(payloadV2(), '2026-08')).not.toThrow()
    expect(capturado.length).toBeGreaterThan(0)
  })

  it('a faixa suprimida sai com células VAZIAS, nunca com zero', () => {
    exportCsv(payloadV2(), '2026-08')
    const linha = capturado.split('\n').find((l) => l.startsWith('18-24'))
    expect(linha, 'a linha da faixa suprimida tem de existir — suprimir o NÚMERO não é suprimir a FAIXA').toBeDefined()

    const celulas = linha!.split(',')
    // faixa, suprimida, motivo, applicants, selected, selection_rate, razao_4_5, flag
    expect(celulas[1]).toBe('true')
    expect(celulas[2]).toBe('k_anonimato_primaria')
    // ⚠ A asserção que carrega o peso: as cinco derivadas são STRING VAZIA.
    for (const i of [3, 4, 5, 6, 7]) {
      expect(celulas[i], `célula ${i} deveria estar VAZIA — um "0" aqui afirmaria o oposto da supressão`).toBe('')
      expect(celulas[i]).not.toBe('0')
      expect(celulas[i]).not.toBe('0.0000')
    }
  })

  it('a faixa publicada mantém os números — a supressão não pode apagar o que é publicável', () => {
    exportCsv(payloadV2(), '2026-08')
    const celulas = capturado.split('\n').find((l) => l.startsWith('25-34'))!.split(',')
    expect(celulas[1]).toBe('false')
    expect(celulas[3]).toBe('40')
    expect(celulas[4]).toBe('20')
    expect(celulas[5]).toBe('0.5000')
  })

  it('o rodapé declara a supressão — uma tabela com faixas faltando sem dizer que faltam é pior que uma incompleta declarada', () => {
    exportCsv(payloadV2(), '2026-08')
    expect(capturado).toContain('2 faixa(s) suprimida(s)')
    expect(capturado).toContain('NAO PUBLICADO, nunca zero')
    expect(capturado).toContain('subtracao')
    expect(capturado).toContain('n_total')
  })

  it('sem supressão alguma, o rodapé NÃO aparece — não poluir o caso normal', () => {
    const semSupressao: AdverseImpactResult = {
      ...payloadV2(),
      celulas_suprimidas: 0,
      supressao_complementar_aplicada: false,
      n_total_suprimido: false,
      n_total: 100,
      bands: [
        {
          faixa: '25-34',
          suprimida: false,
          applicants: 100,
          selected: 50,
          selection_rate: 0.5,
          razao_4_5: 1,
          flag: false,
        },
      ],
    }
    exportCsv(semSupressao, '2026-08')
    expect(capturado).not.toContain('suprimida(s) por k-anonimato')
  })

  it('faixa publicada SEM razão 4/5 (referência suprimida) sai vazia, não zero', () => {
    // Quando a faixa de MAIOR taxa cai abaixo de k, a razão do relatório inteiro cai junto:
    // não há denominador publicável. Um "0.0000" aqui seria lido como impacto adverso máximo.
    const refSuprimida: AdverseImpactResult = {
      ...payloadV2(),
      faixa_referencia: undefined,
      faixa_referencia_suprimida: true,
      bands: [
        { faixa: '18-24', suprimida: true, motivo_supressao: 'k_anonimato_primaria' },
        { faixa: '25-34', suprimida: false, applicants: 40, selected: 20, selection_rate: 0.5 },
      ],
    }
    exportCsv(refSuprimida, '2026-08')
    const celulas = capturado.split('\n').find((l) => l.startsWith('25-34'))!.split(',')
    expect(celulas[6], 'razao_4_5 ausente deve sair VAZIA').toBe('')
    expect(celulas[7], 'flag ausente deve sair VAZIA — `false` afirmaria "sem impacto adverso"').toBe('')
    expect(capturado).toContain('faixa de referencia')
  })
})
