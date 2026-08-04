/**
 * Phase 44 / Plano 44-05 Task 2 (TDD RED) — o lado cliente do TRACER (EXPORT-01).
 *
 * Seis contratos, e o corte entre eles é o ponto: `gerarJsonExport` é PURA (string
 * dentro, string fora, zero DOM) e `dispararDownloads` é o único lugar que toca o
 * navegador. É o mesmo corte que `gerarIcsAgendamento` / `baixarIcsAgendamento` já
 * estabeleceram nesta base — e é ele que torna o gerador do arquivo que a lei exige
 * testável sem simular um clique.
 *
 * ⚠ O mock de `@/lib/supabase/client` vem ANTES do import do serviço: o client valida
 * `VITE_SUPABASE_*` no topo do módulo (idioma de `revisaoService.test.ts:38-70`).
 *
 * As asserções (c) e (f) são NEGATIVAS, e é isso que as torna load-bearing:
 *  - (c) prova que nenhuma substring de URL assinada entra no arquivo entregue —
 *    Invariante 4 da 44-UI-SPEC. Um link de 60 s dentro de um arquivo que a pessoa
 *    abre amanhã é um link morto que parece mentira do export.
 *  - (f) prova que a mensagem crua do transporte nunca atravessa para a UI (idioma do
 *    `traduzirErro` de `privacidadeService`).
 *
 * @see .planning/phases/44-exporta-o-acesso/44-05-PLAN.md (§Task 2 — casos (a)–(f))
 * @see src/features/agendamento/services/agendamentoCandidatoService.ts:205 (o molde do disparo)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}))

import {
  ExportacaoError,
  invocarExportMeusDados,
  gerarJsonExport,
  dispararDownloads,
  nomeArquivoExport,
  COPY_PEDIR_COPIA,
  type RespostaExport,
} from '../exportacaoService'

const ISO = '2026-08-04T13:45:00.000Z'

function resposta(over: Partial<RespostaExport> = {}): RespostaExport {
  return {
    ok: true,
    versao_allowlist: '1.1.0',
    gerado_em: ISO,
    payload: {
      candidatos: [{ id: 'cand-1', nome_completo: 'Fulana de Tal' }],
      candidaturas: [{ id: 'cndt-1', curriculo_url: 'uid/cv.pdf' }],
    },
    ...over,
  }
}

/** Erro de invoke com corpo JSON (o `FunctionsHttpError` não-2xx do supabase-js). */
function erroComCorpo(corpo: unknown) {
  return { message: 'Edge Function returned a non-2xx status code', context: { json: async () => corpo } }
}

beforeEach(() => {
  mocks.invoke.mockReset()
})

// ── (a) o gerador é PURO ──────────────────────────────────────────────────────
describe('gerarJsonExport', () => {
  it('(a) é pura: mesmo payload → mesma string, e não toca o navegador', () => {
    const espiaoCreateElement = vi.spyOn(document, 'createElement')
    const r = resposta()
    const primeira = gerarJsonExport(r)
    const segunda = gerarJsonExport(r)
    expect(primeira).toBe(segunda)
    expect(espiaoCreateElement).not.toHaveBeenCalled()
    espiaoCreateElement.mockRestore()
  })

  it('(b) carrega o envelope de metadados e o payload', () => {
    const objeto = JSON.parse(gerarJsonExport(resposta()))
    expect(objeto.gerado_em).toBe(ISO)
    expect(objeto.versao_allowlist).toBe('1.1.0')
    expect(objeto.dados.candidatos[0].nome_completo).toBe('Fulana de Tal')
    // A fronteira do EXPORT-06 viaja DENTRO do arquivo: meses depois, o `.json`
    // sozinho tem de dizer o que não estava nele.
    expect(typeof objeto.o_que_nao_esta_nesta_copia).toBe('string')
    expect(objeto.o_que_nao_esta_nesta_copia.length).toBeGreaterThan(0)
  })

  it('(c) NEGATIVA: nenhuma substring de URL assinada entra no arquivo', () => {
    // Literais montados em runtime (idioma 42-11/44-03).
    const marcaToken = ['token', '='].join('')
    const marcaSign = ['/object', '/sign/'].join('')
    const texto = gerarJsonExport(
      resposta({
        payload: {
          candidaturas: [
            { id: 'cndt-1', curriculo_url: 'uid/cv.pdf', curriculo_nome_original: 'cv.pdf' },
          ],
        },
      }),
    )
    expect(texto).not.toContain(marcaToken)
    expect(texto).not.toContain(marcaSign)
    // META-TEST: uma sonda que não consegue encontrar o que procura é no-op.
    expect(`x${marcaToken}y`).toContain(marcaToken)
    expect(`x${marcaSign}y`).toContain(marcaSign)
  })
})

// ── (d) o disparo do download ─────────────────────────────────────────────────
describe('dispararDownloads', () => {
  it('(d) cria o anchor, clica e revoga a object URL', () => {
    const criar = vi.fn(() => 'blob:fake-url')
    const revogar = vi.fn()
    const urlOriginal = { criar: URL.createObjectURL, revogar: URL.revokeObjectURL }
    URL.createObjectURL = criar as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revogar as unknown as typeof URL.revokeObjectURL

    const cliques: string[] = []
    const anchorReal = document.createElement('a')
    const espiaoClick = vi
      .spyOn(anchorReal, 'click')
      .mockImplementation(() => cliques.push(anchorReal.download))
    const espiaoCreate = vi
      .spyOn(document, 'createElement')
      .mockImplementation(() => anchorReal as unknown as HTMLElement)

    try {
      dispararDownloads([
        { nome: 'beauty-smile-meus-dados-2026-08-04.json', conteudo: '{}', tipo: 'application/json' },
      ])
      expect(espiaoClick).toHaveBeenCalledTimes(1)
      expect(cliques).toEqual(['beauty-smile-meus-dados-2026-08-04.json'])
      expect(criar).toHaveBeenCalledTimes(1)
      expect(revogar).toHaveBeenCalledWith('blob:fake-url')
      // O anchor não fica no documento depois do clique.
      expect(document.body.contains(anchorReal)).toBe(false)
    } finally {
      espiaoCreate.mockRestore()
      espiaoClick.mockRestore()
      URL.createObjectURL = urlOriginal.criar
      URL.revokeObjectURL = urlOriginal.revogar
    }
  })

  it('(d2) o nome do arquivo é datado e NÃO interpola PII (Invariante 9)', () => {
    const nome = nomeArquivoExport('json', new Date('2026-08-04T13:45:00.000Z'))
    expect(nome).toBe('beauty-smile-meus-dados-2026-08-04.json')
  })
})

// ── (e)/(f) a invocação e a tradução do erro ─────────────────────────────────
describe('invocarExportMeusDados', () => {
  it('(e) invoca a EF SEM corpo significativo', async () => {
    mocks.invoke.mockResolvedValue({ data: resposta(), error: null })
    await invocarExportMeusDados()
    expect(mocks.invoke).toHaveBeenCalledTimes(1)
    const [nome, opcoes] = mocks.invoke.mock.calls[0]
    expect(nome).toBe('exportar-meus-dados')
    // A EF não lê o corpo. Mandar um `candidato_id` daria a impressão de que ele
    // importa — e é exatamente o id que a superfície T-32-03 gostaria de receber.
    expect(opcoes).toBeUndefined()
  })

  it('(e2) COOLDOWN preserva liberado_em no erro tipado', async () => {
    const liberado = '2026-08-05T13:45:00.000Z'
    mocks.invoke.mockResolvedValue({
      data: null,
      error: erroComCorpo({ ok: false, error_code: 'COOLDOWN', liberado_em: liberado }),
    })
    const erro = await invocarExportMeusDados().catch((e) => e)
    expect(erro).toBeInstanceOf(ExportacaoError)
    expect(erro.code).toBe('COOLDOWN')
    expect(erro.liberadoEm).toBe(liberado)
  })

  it.each([
    ['UNAUTHORIZED', 'UNAUTHORIZED'],
    ['FORBIDDEN', 'FORBIDDEN'],
    ['SERVER_ERROR', 'SERVER_ERROR'],
    ['UM_CODIGO_QUE_NAO_EXISTE', 'SERVER_ERROR'],
  ])('(e3) o error_code %s vira o code %s do vocabulário fechado', async (efCode, esperado) => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: erroComCorpo({ ok: false, error_code: efCode }),
    })
    const erro = await invocarExportMeusDados().catch((e) => e)
    expect(erro).toBeInstanceOf(ExportacaoError)
    expect(erro.code).toBe(esperado)
  })

  it('(e4) falha de transporte sem corpo legível vira NETWORK', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })
    const erro = await invocarExportMeusDados().catch((e) => e)
    expect(erro).toBeInstanceOf(ExportacaoError)
    expect(erro.code).toBe('NETWORK')
  })

  it('(f) NEGATIVA: a mensagem crua do transporte nunca atravessa para a UI', async () => {
    const cru = 'PGRST301: JWT expired at row 42 of public.candidatos'
    mocks.invoke.mockResolvedValue({
      data: null,
      error: erroComCorpo({ ok: false, error_code: 'SERVER_ERROR', message: cru }),
    })
    const erro = await invocarExportMeusDados().catch((e) => e)
    expect(erro.message).toBe(COPY_PEDIR_COPIA.erroTitulo)
    expect(erro.message).not.toContain('PGRST301')
    expect(erro.message).not.toContain('candidatos')
  })

  it('(f2) um 200 com ok:false também não vaza mensagem crua', async () => {
    mocks.invoke.mockResolvedValue({
      data: { ok: false, error_code: 'SERVER_ERROR', message: 'stack interno' },
      error: null,
    })
    const erro = await invocarExportMeusDados().catch((e) => e)
    expect(erro).toBeInstanceOf(ExportacaoError)
    expect(erro.message).toBe(COPY_PEDIR_COPIA.erroTitulo)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
