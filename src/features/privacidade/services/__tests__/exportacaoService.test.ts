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
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
  /**
   * O dublê de `storage` (44-07). O molde é `perfilRhService.test.ts:40-73` — o
   * ÚNICO `createSignedUrl` mockado vivo neste repositório.
   */
  storageFrom: vi.fn(),
  createSignedUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  mocks.storageFrom.mockImplementation(() => ({ createSignedUrl: mocks.createSignedUrl }))
  return {
    supabase: {
      functions: { invoke: mocks.invoke },
      from: mocks.from,
      storage: { from: mocks.storageFrom },
    },
  }
})

import {
  ExportacaoError,
  invocarExportMeusDados,
  gerarJsonExport,
  gerarHtmlExport,
  escapeHtml,
  formatarDataPtBr,
  dispararDownloads,
  nomeArquivoExport,
  lerUltimoPedidoDados,
  calcularLiberacaoCooldown,
  listarMeusCurriculos,
  mintarUrlCurriculoProprio,
  CURRICULOS_ALLOWLIST,
  TTL_CURRICULO_SEGUNDOS,
  BUCKET_CURRICULOS,
  ULTIMO_PEDIDO_COLUNAS,
  JANELA_COOLDOWN_MS,
  COPY_PEDIR_COPIA,
  COPY_ARQUIVO,
  TRAVESSAO,
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

/** Cadeia PostgREST mínima — só os métodos que o leitor encadeia, nada mais. */
function cadeia(resultado: { data: unknown; error: unknown }) {
  const c = {
    select: vi.fn((_colunas: string) => c),
    eq: vi.fn((_coluna: string, _valor: string) => c),
    order: vi.fn((_coluna: string, _opcoes: { ascending: boolean }) => c),
    limit: vi.fn((_n: number) => c),
    maybeSingle: vi.fn(async () => resultado),
  }
  return c
}

/**
 * Cadeia da LISTA de currículos (44-07). Diferente da de cima em duas coisas que
 * importam: termina em `await` sobre o próprio builder (é uma lista, não há
 * `maybeSingle`), e expõe `is` **de propósito** — o caso (ac) precisa poder provar
 * que ele NÃO foi chamado, e um método ausente falharia por `TypeError` em vez de
 * pela asserção, que é a diferença entre um teste que mede e um que explode.
 */
function cadeiaLista(resultado: { data: unknown; error: unknown }) {
  const c = {
    select: vi.fn((_colunas: string) => c),
    eq: vi.fn((_coluna: string, _valor: unknown) => c),
    not: vi.fn((_coluna: string, _operador: string, _valor: unknown) => c),
    is: vi.fn((_coluna: string, _valor: unknown) => c),
    order: vi.fn((_coluna: string, _opcoes: { ascending: boolean }) => c),
    then: (aceitar: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(resultado).then(aceitar),
  }
  return c
}

beforeEach(() => {
  mocks.invoke.mockReset()
  mocks.from.mockReset()
  mocks.createSignedUrl.mockReset()
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

// ══════════════════════════════════════════════════════════════════════════════
// Plano 44-06 Task 1 — o SEGUNDO arquivo: o que uma pessoa lê (casos (l)–(t))
//
// Todos sobre funções PURAS, sem DOM (exceto (r), que é o disparo). O gerador do
// `.html` é o ponto onde o payload do titular — texto livre digitado por humanos,
// inclusive por TERCEIROS (`observacoes_rh`, `motivo_rejeicao`) — vira marcação
// aberta em `file://`, onde **não há CSP nenhuma**. O escape é o único controle.
// ══════════════════════════════════════════════════════════════════════════════

describe('escapeHtml', () => {
  it('(l) converte as cinco entidades e resolve ausência para travessão', () => {
    expect(escapeHtml('&')).toBe('&amp;')
    expect(escapeHtml('"')).toBe('&quot;')
    expect(escapeHtml("'")).toBe('&#39;')
    expect(escapeHtml('a & b')).toBe('a &amp; b')

    // A ORDEM importa: com o `&` escapado por último, `<` viraria `&amp;lt;`.
    // Esta igualdade é o que prova que ele vai primeiro.
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('>')).toBe('&gt;')
    expect(escapeHtml('<b>')).toBe('&lt;b&gt;')

    // Ausência é travessão, NUNCA a string "null" — um `.html` que mostra `null`
    // ao titular está descrevendo o banco de dados, não a pessoa.
    expect(escapeHtml(null)).toBe(TRAVESSAO)
    expect(escapeHtml(undefined)).toBe(TRAVESSAO)
    expect(escapeHtml(null)).not.toBe('null')
    expect(escapeHtml('')).toBe(TRAVESSAO)
  })
})

describe('gerarHtmlExport', () => {
  it('(m) payload HOSTIL de campo livre sai escapado, nunca executável', () => {
    // Literais montados em runtime: um arquivo que proíbe uma forma e a contém
    // verbatim é sua própria primeira violação (idioma 42-11).
    const tagScript = `<${['scr', 'ipt'].join('')}>alert(1)</${['scr', 'ipt'].join('')}>`
    const imgHandler = `<img src=x on${'error'}="alert(1)">`

    const html = gerarHtmlExport(
      resposta({
        payload: {
          candidaturas: [
            { id: 'cndt-1', observacoes_rh: tagScript, motivo_rejeicao: imgHandler },
          ],
        },
      }),
    )

    // A forma ESCAPADA está lá (o dado do titular não é descartado)…
    expect(html).toContain('&lt;')
    expect(html).toContain('alert(1)')
    // …e a forma EXECUTÁVEL não.
    expect(html).not.toContain(tagScript)
    expect(html).not.toContain(imgHandler)
    expect(html).not.toContain(`<${'scr'}${'ipt'}>`)
    expect(html).not.toContain('<img')

    // A prova FORTE: o documento é PARSEADO e o payload hostil não virou NÓ
    // nenhum. Uma asserção só de substring não distinguiria "escapado" de
    // "escapado pela metade"; esta pergunta ao parser, que é quem decide.
    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect(doc.querySelectorAll(['scr', 'ipt'].join('')).length).toBe(0)
    expect(doc.querySelectorAll('img').length).toBe(0)
    expect(doc.querySelectorAll(`[on${'error'}]`).length).toBe(0)
    // …e o dado do titular continua LEGÍVEL como texto, não descartado.
    expect(doc.body.textContent).toContain(tagScript)

    // META-TEST: uma sonda que não encontra o que procura é no-op.
    expect(`x${tagScript}y`).toContain(tagScript)
    expect(`x${imgHandler}y`).toContain(imgHandler)
  })

  it('(n) carrega título, carimbo no topo e as DUAS seções obrigatórias de fronteira', () => {
    const html = gerarHtmlExport(resposta())

    expect(html).toContain(COPY_ARQUIVO.titulo)
    // Carimbo `dd/mm/aaaa HH:mm` — sem ele não há como distinguir uma cópia de
    // hoje de uma do mês passado, e a diferença é o que o titular precisa saber.
    expect(html).toMatch(/Cópia gerada em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/)
    // O carimbo vem ANTES do primeiro bloco de dados.
    expect(html.indexOf('Cópia gerada em')).toBeLessThan(html.indexOf(COPY_ARQUIVO.rotuloTabela.candidatos))

    // O título da SEÇÃO DO ARQUIVO é "…nesta cópia" (a spec o fixa assim), mas a
    // razão nomeada é a MESMA string que a tela renderiza — uma fronteira só.
    expect(html).toContain(COPY_ARQUIVO.naoEstaTitulo)
    expect(html).toContain(COPY_PEDIR_COPIA.oQueNaoEsta)
    expect(html).toContain(COPY_ARQUIVO.naoFazTitulo)
    expect(html).toContain(COPY_ARQUIVO.naoFazCorpo)
  })

  it('(n2) DATA PURA sai no DIA CERTO e sem hora inventada — em qualquer fuso', () => {
    // ⚠ Esta asserção existe porque a (n) acima NÃO pega o defeito: ela casa a
    // FORMA `\d{2}/\d{2}/\d{4}`, que continua verde num dia errado. A CR-02 foi
    // medida assim, sob `TZ=America/Sao_Paulo`:
    //   1990-05-12 → 11/05/1990 às 21:00   (dia anterior + hora inventada)
    //   2000-01-01 → 31/12/1999 às 22:00   (ANO anterior)
    // Causa: `new Date('1990-05-12')` é meia-noite UTC, formatada em hora local.
    //
    // A prova aqui é DE FUSO-INDEPENDENTE de propósito — asserção que só falha
    // na máquina de quem a escreveu não é asserção. A ausência de `às` reprova o
    // código antigo mesmo em UTC, onde o dia por acaso sairia certo.
    const html = gerarHtmlExport(
      resposta({
        payload: {
          candidatos: [
            { id: 'cand-1', data_nascimento: '1990-05-12' },
            // A virada de ANO é o caso que torna o defeito indefensável.
            { id: 'cand-2', data_nascimento: '2000-01-01' },
          ],
        },
      }),
    )

    expect(html).toContain('12/05/1990')
    expect(html).toContain('01/01/2000')
    // O dia anterior — o que o código antigo entregava — não pode aparecer.
    expect(html).not.toContain('11/05/1990')
    expect(html).not.toContain('31/12/1999')

    // E nenhuma HORA foi inventada sobre uma coluna que não tem relógio. O
    // carimbo do topo (`Cópia gerada em … às …`) é instante de verdade e fica
    // fora desta contagem, por isso a sonda olha só o bloco do cadastro.
    const bloco = html.slice(
      html.indexOf(COPY_ARQUIVO.rotuloTabela.candidatos),
      html.indexOf(COPY_ARQUIVO.naoEstaTitulo),
    )
    expect(bloco).toContain('12/05/1990')
    expect(bloco).not.toContain(' às ')

    // O INSTANTE de verdade continua com hora — a correção separa os dois casos,
    // não remove o relógio de quem tem relógio.
    expect(html).toMatch(/Cópia gerada em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/)

    // META-TEST: a sonda acha o que procura quando ele existe.
    expect(`x11/05/1990y`).toContain('11/05/1990')
  })

  it('(n3) `formatarDataPtBr` é pura, total e não passa por `Date`', () => {
    expect(formatarDataPtBr('1990-05-12')).toBe('12/05/1990')
    expect(formatarDataPtBr('2000-01-01')).toBe('01/01/2000')
    // Total: nada produz `Invalid Date` nem `NaN` na cópia do titular.
    expect(formatarDataPtBr(null)).toBe(TRAVESSAO)
    expect(formatarDataPtBr(undefined)).toBe(TRAVESSAO)
    expect(formatarDataPtBr('')).toBe(TRAVESSAO)
    expect(formatarDataPtBr('não é data')).toBe(TRAVESSAO)
    // Um INSTANTE não é data pura: ele pertence ao outro formatador.
    expect(formatarDataPtBr('2026-08-04T13:45:00.000Z')).toBe(TRAVESSAO)
  })

  it('(o) o rodapé carrega a versão da allowlist junto à data da geração', () => {
    const html = gerarHtmlExport(resposta({ versao_allowlist: '1.1.0' }))
    const rodape = html.slice(html.indexOf('<footer'))
    expect(rodape).toContain('1.1.0')
    expect(rodape).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('(p) NEGATIVA: nenhum link, nenhum caminho de Storage, nenhum base64 do currículo', () => {
    const marcaToken = ['token', '='].join('')
    const marcaSign = ['/object', '/sign/'].join('')
    const marcaBase64 = ['data:application/pdf;', 'base64,'].join('')
    const caminhoStorage = 'a1b2c3/curriculo-fulana.pdf'

    const html = gerarHtmlExport(
      resposta({
        payload: {
          candidaturas: [
            {
              id: 'cndt-1',
              curriculo_url: caminhoStorage,
              curriculo_nome_original: 'curriculo-fulana.pdf',
              data_candidatura: '2026-07-01T10:00:00.000Z',
            },
          ],
        },
      }),
    )

    expect(html).not.toContain(marcaToken)
    expect(html).not.toContain(marcaSign)
    expect(html).not.toContain(marcaBase64)
    // O CAMINHO de Storage é identificador interno de infraestrutura: ele não diz
    // nada ao titular e é a semente do link de 60 s. Fica de fora do arquivo legível.
    expect(html).not.toContain(caminhoStorage)

    // O que o titular VÊ do currículo: o nome, a data, e a frase fixa ao lado.
    expect(html).toContain('curriculo-fulana.pdf')
    expect(html).toContain('01/07/2026')
    expect(html).toContain(COPY_ARQUIVO.curriculoNota)

    for (const marca of [marcaToken, marcaSign, marcaBase64, caminhoStorage]) {
      expect(`x${marca}y`).toContain(marca)
    }
  })

  it('(q) texto livre atravessa ÍNTEGRO; ausência vira travessão, nunca `null`', () => {
    const longo = 'a'.repeat(5000)
    const html = gerarHtmlExport(
      resposta({
        payload: {
          candidaturas: [{ id: 'cndt-1', observacoes_rh: longo, motivo_rejeicao: null }],
        },
      }),
    )

    // Truncar a cópia dos dados de alguém é entregar uma cópia FALSA.
    expect(html).toContain(longo)
    expect(html).not.toContain('…')
    expect(html).toContain(TRAVESSAO)
    expect(html).not.toContain('>null<')
  })

  it('(n2) é PURA: mesma resposta → mesma string, e não toca o navegador', () => {
    const espiao = vi.spyOn(document, 'createElement')
    const r = resposta()
    expect(gerarHtmlExport(r)).toBe(gerarHtmlExport(r))
    expect(espiao).not.toHaveBeenCalled()
    espiao.mockRestore()
  })
})

describe('os DOIS arquivos', () => {
  it('(r) dispararDownloads recebe os dois e o `.json` é clicado PRIMEIRO', () => {
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
        { nome: 'beauty-smile-meus-dados-2026-08-04.html', conteudo: '<html></html>', tipo: 'text/html' },
      ])
      // A asserção é sobre a ORDEM, não sobre a presença: o artefato do direito
      // legal vai na frente, para sobreviver caso o navegador barre o segundo.
      expect(cliques).toEqual([
        'beauty-smile-meus-dados-2026-08-04.json',
        'beauty-smile-meus-dados-2026-08-04.html',
      ])
      expect(cliques[0].endsWith('.json')).toBe(true)
      expect(criar).toHaveBeenCalledTimes(2)
      expect(revogar).toHaveBeenCalledTimes(2)
    } finally {
      espiaoCreate.mockRestore()
      espiaoClick.mockRestore()
      URL.createObjectURL = urlOriginal.criar
      URL.revokeObjectURL = urlOriginal.revogar
    }
  })

  it('(s) os dois nomes seguem o padrão datado e NENHUM interpola PII', () => {
    const dia = new Date('2026-08-04T13:45:00.000Z')
    const nomes = [nomeArquivoExport('json', dia), nomeArquivoExport('html', dia)]

    expect(nomes).toEqual([
      'beauty-smile-meus-dados-2026-08-04.json',
      'beauty-smile-meus-dados-2026-08-04.html',
    ])
    // O nome aparece na barra de downloads e na pasta compartilhada do aparelho.
    for (const nome of nomes) {
      expect(nome).toMatch(/^beauty-smile-meus-dados-\d{4}-\d{2}-\d{2}\.(json|html)$/)
      expect(nome).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i) // nenhum UUID
      expect(nome.toLowerCase()).not.toContain('fulana')
      expect(nome).not.toContain('@')
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Plano 44-06 Task 2 — o estado do cooldown: leitura own-row que NUNCA lança
// (casos (u)–(y)). A autoridade sobre o limite é o SERVIDOR; este leitor só
// informa a apresentação, e por isso pode falhar sem derrubar nada.
// ══════════════════════════════════════════════════════════════════════════════

describe('lerUltimoPedidoDados', () => {
  it('(u) projeta por ALLOWLIST NOMEADA e filtra por candidato E por tipo', async () => {
    const c = cadeia({ data: { id: 'ped-1', situacao: 'atendido' }, error: null })
    mocks.from.mockReturnValue(c)

    await lerUltimoPedidoDados('cand-1')

    expect(mocks.from).toHaveBeenCalledWith('solicitacoes_dados')
    // A string passada ao `select` é comparada por IGUALDADE com a constante —
    // idioma de `perfilRhService.test.ts`. Coluna acrescentada sem revisão de
    // privacidade quebra este teste antes de chegar ao cache do TanStack Query.
    expect(c.select).toHaveBeenCalledTimes(1)
    expect(c.select.mock.calls[0][0]).toBe(ULTIMO_PEDIDO_COLUNAS)

    const filtros = c.eq.mock.calls
    expect(filtros).toContainEqual(['candidato_id', 'cand-1'])
    // Sem o filtro de tipo, os pedidos de EXCLUSÃO da Phase 45 entrariam neste
    // cooldown em silêncio — dois direitos diferentes num limite só.
    expect(filtros).toContainEqual(['tipo', 'acesso'])
    expect(c.order).toHaveBeenCalledWith('solicitado_em', { ascending: false })
    expect(c.limit).toHaveBeenCalledWith(1)
    expect(c.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it('(v) NEGATIVA: a string de select não contém projeção total', () => {
    const projecaoTotal = ['*'].join('')
    expect(ULTIMO_PEDIDO_COLUNAS).not.toContain(projecaoTotal)
    expect(`x${projecaoTotal}y`).toContain(projecaoTotal) // META-TEST
  })

  it('(w) erro de transporte resolve para null e NÃO lança', async () => {
    mocks.from.mockReturnValue(
      cadeia({ data: null, error: { code: 'PGRST301', message: 'JWT expired' } }),
    )
    await expect(lerUltimoPedidoDados('cand-1')).resolves.toBeNull()
  })

  it('(x) ausência de linha é resultado VÁLIDO: "nunca pediu"', async () => {
    mocks.from.mockReturnValue(cadeia({ data: null, error: null }))
    await expect(lerUltimoPedidoDados('cand-1')).resolves.toBeNull()
  })

  it('(x2) sem candidatoId a leitura nem acontece', async () => {
    await expect(lerUltimoPedidoDados('')).resolves.toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

describe('calcularLiberacaoCooldown', () => {
  const agora = new Date('2026-08-04T12:00:00.000Z')

  it('(y) pedido recente → o instante de liberação é solicitado + 24 h', () => {
    const solicitado = '2026-08-04T06:00:00.000Z'
    expect(calcularLiberacaoCooldown(solicitado, agora)).toBe('2026-08-05T06:00:00.000Z')
    expect(JANELA_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('(y2) pedido antigo → null (sem cooldown), inclusive na borda exata', () => {
    expect(calcularLiberacaoCooldown('2026-08-01T06:00:00.000Z', agora)).toBeNull()
    expect(calcularLiberacaoCooldown('2026-08-03T12:00:00.000Z', agora)).toBeNull()
  })

  it('(y3) é TOTAL: data ilegível ou ausente vira "sem cooldown", nunca NaN', () => {
    // Um `Invalid Date` na tela do titular lê como sistema quebrado; e travar o
    // botão por causa de um valor ilegível seria o cliente decidindo o limite.
    expect(calcularLiberacaoCooldown('nao é data', agora)).toBeNull()
    expect(calcularLiberacaoCooldown(null, agora)).toBeNull()
    expect(calcularLiberacaoCooldown(undefined, agora)).toBeNull()
    expect(String(calcularLiberacaoCooldown('nao é data', agora))).not.toContain('NaN')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 44-07 · O CV DO TITULAR — a leitura own-row e a cunhagem client-side (EXPORT-03)
// ══════════════════════════════════════════════════════════════════════════════

describe('listarMeusCurriculos', () => {
  const LINHA = {
    id: 'cndt-1',
    curriculo_url: 'uid-1/cv.pdf',
    created_at: '2026-07-01T10:00:00.000Z',
    vaga: { titulo: 'Dentista' },
  }

  it('(aa) projeta pela allowlist NOMEADA, com o embed da vaga também por allowlist', async () => {
    const c = cadeiaLista({ data: [LINHA], error: null })
    mocks.from.mockReturnValue(c)

    await listarMeusCurriculos('cand-1')

    expect(mocks.from).toHaveBeenCalledWith('candidaturas')
    // Igualdade com a CONSTANTE, não com um literal transcrito: um literal aqui
    // seria uma segunda verdade sobre a projeção, e as duas divergiriam no dia em
    // que alguém editasse uma delas.
    expect(c.select.mock.calls[0][0]).toBe(CURRICULOS_ALLOWLIST)
    expect(CURRICULOS_ALLOWLIST).toContain('vaga')
    expect(CURRICULOS_ALLOWLIST).toContain('titulo')
  })

  it('(ab) NEGATIVA: a string de select não contém projeção total', () => {
    const projecaoTotal = ['*'].join('')
    expect(CURRICULOS_ALLOWLIST).not.toContain(projecaoTotal)
    expect(`x${projecaoTotal}y`).toContain(projecaoTotal) // META-TEST
  })

  it('(ac) filtra own-row + currículo presente, e NÃO esconde candidatura removida', async () => {
    const c = cadeiaLista({ data: [LINHA], error: null })
    mocks.from.mockReturnValue(c)

    await listarMeusCurriculos('cand-1')

    expect(c.eq.mock.calls).toContainEqual(['candidato_id', 'cand-1'])
    expect(c.not).toHaveBeenCalledWith('curriculo_url', 'is', null)

    // ⚠ A ASSERÇÃO LOAD-BEARING DESTE CASO. O predicado oposto vive no
    // `get-curriculo-url` (WR-03) e a tentação de copiá-lo é alta — mas lá o leitor
    // é um RH, aqui é o DONO do arquivo. O arquivo continua no Storage; negar-lhe a
    // existência seria a mentira oposta à que este milestone corrige.
    expect(c.is).not.toHaveBeenCalled()
    expect(c.eq.mock.calls.map(([coluna]) => coluna)).not.toContain('deleted_at')
    expect(c.not.mock.calls.map(([coluna]) => coluna)).not.toContain('deleted_at')
  })

  it('(ag) normaliza o embed: objeto, lista de um, e ausente produzem a MESMA forma', async () => {
    const comObjeto = cadeiaLista({ data: [LINHA], error: null })
    mocks.from.mockReturnValue(comObjeto)
    const [aObjeto] = await listarMeusCurriculos('cand-1')

    const comLista = cadeiaLista({
      data: [{ ...LINHA, vaga: [{ titulo: 'Dentista' }] }],
      error: null,
    })
    mocks.from.mockReturnValue(comLista)
    const [aLista] = await listarMeusCurriculos('cand-1')

    expect(aObjeto).toEqual({
      id: 'cndt-1',
      caminho: 'uid-1/cv.pdf',
      enviadoEm: '2026-07-01T10:00:00.000Z',
      vagaTitulo: 'Dentista',
    })
    expect(aLista).toEqual(aObjeto)

    // Vaga ausente ⇒ título NULO. Nunca `undefined`, nunca objeto vazio: quem
    // renderiza decide entre "Vaga não identificada" e o título, e um terceiro
    // valor faria o componente conhecer as formas do PostgREST.
    const semVaga = cadeiaLista({
      data: [{ ...LINHA, vaga: null }, { ...LINHA, id: 'cndt-2', vaga: [] }],
      error: null,
    })
    mocks.from.mockReturnValue(semVaga)
    const linhas = await listarMeusCurriculos('cand-1')
    expect(linhas.map((l) => l.vagaTitulo)).toEqual([null, null])
  })

  it('(ac2) sem candidatoId a leitura nem acontece', async () => {
    await expect(listarMeusCurriculos('')).resolves.toEqual([])
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('(ae2) erro do PostgREST vira ExportacaoError sem a mensagem crua', async () => {
    mocks.from.mockReturnValue(
      cadeiaLista({ data: null, error: { code: '42501', message: 'permission denied for schema' } }),
    )
    const erro = await listarMeusCurriculos('cand-1').catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ExportacaoError)
    expect((erro as ExportacaoError).message).not.toContain('permission denied')
  })
})

describe('mintarUrlCurriculoProprio', () => {
  it('(ad) cunha com o caminho EXATO recebido e com o TTL canônico de 60 s', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://exemplo.test/assinada' },
      error: null,
    })

    const url = await mintarUrlCurriculoProprio('uid-1/cv.pdf')

    expect(url).toBe('https://exemplo.test/assinada')
    expect(mocks.storageFrom).toHaveBeenCalledWith(BUCKET_CURRICULOS)
    // Os DOIS argumentos. Uma asserção que só olhasse o caminho deixaria passar um
    // TTL frouxo — e o TTL é o que torna honesta a frase "válido por poucos
    // segundos" que a seção 3 mostra ao titular.
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('uid-1/cv.pdf', 60)
    expect(TTL_CURRICULO_SEGUNDOS).toBe(60)
    expect(BUCKET_CURRICULOS).toBe('curriculos')
  })

  it('(ae) erro do Storage vira ExportacaoError, sem a mensagem crua do transporte', async () => {
    mocks.createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Object not found: bucket curriculos' },
    })
    const erro = await mintarUrlCurriculoProprio('uid-1/cv.pdf').catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ExportacaoError)
    expect((erro as ExportacaoError).message).not.toContain('Object not found')
    expect((erro as ExportacaoError).message).not.toContain('bucket')
  })

  it('(ae3) resposta SEM URL assinada também é erro — nunca uma string vazia na aba', async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: {}, error: null })
    await expect(mintarUrlCurriculoProprio('uid-1/cv.pdf')).rejects.toBeInstanceOf(ExportacaoError)
  })
})

// ── (af) sonda de texto-fonte: o MÓDULO INTEIRO é livre de chamada de log ─────
// O escopo é o **módulo**, não a função, e a diferença é o ponto: uma linha de log
// acrescentada seis meses depois em qualquer ponto deste serviço tem a URL assinada
// ao alcance da mão, e um TTL de 60 s vira um link colado no console de quem
// estiver olhando a tela (Invariante 4 · Pitfall 7).
describe('o serviço não loga', () => {
  it('(af) nenhuma chamada de log no módulo inteiro do exportacaoService', () => {
    // ⚠ O caminho passa por VARIÁVEL, e não é estilo: o Vite reescreve
    // estaticamente `new URL('<literal>', import.meta.url)` para uma URL de asset
    // (`http:`), e `fileURLToPath` então recusa com "must be of scheme file". Com
    // variável a análise estática não dispara — idioma vivo do caso (t) logo abaixo.
    const relativo = '../exportacaoService.ts'
    const fonte = readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
    // Literal montado em runtime (idioma 42-11): um arquivo que proíbe uma string
    // e a contém verbatim é sua própria primeira violação.
    const alvos = [
      ['con', 'sole', '.'].join(''),
      ['logg', 'er', '.'].join(''),
    ]
    for (const alvo of alvos) {
      expect(fonte.includes(alvo), `chamada de log "${alvo}" encontrada no serviço`).toBe(false)
    }
    for (const alvo of alvos) {
      expect(`prefixo ${alvo} sufixo`).toContain(alvo) // META-TEST
    }
  })
})

// ── (t) sonda de texto-fonte com ESCOPO DECLARADO ────────────────────────────
// O escopo é ESTES DOIS ARQUIVOS, nunca `src/features/privacidade/` inteiro: o
// `GuardaCurriculoBloco`, aprovado na Phase 43 e NÃO editado por esta fase, contém
// legitimamente "pedir a eliminação do seu currículo". Um grep de feature inteira
// reprovaria copy aprovada de outra fase — defeito que este projeto já pagou 2×.
describe('bans da §Copywriting', () => {
  it('(t) nenhuma string banida no gerador nem no bloco novo', () => {
    const ler = (relativo: string) =>
      readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
    const escopo = {
      'exportacaoService.ts': ler('../exportacaoService.ts'),
      'PedirCopiaBloco.tsx': ler('../../components/PedirCopiaBloco.tsx'),
    }

    const banidas = [
      ['todos', 'os', 'seus', 'dados'].join(' '),
      ['tudo', 'o', 'que', 'temos', 'sobre', 'você'].join(' '),
      ['todos', 'os', 'seus', 'registros'].join(' '),
      ['apaga', 'do'].join(''),
      ['apaga', 'dos'].join(''),
      ['exclu', 'ído'].join(''),
      ['exclu', 'ídos'].join(''),
      ['elimina', 'do'].join(''),
      ['removido', 'dos', 'nossos', 'sistemas'].join(' '),
    ]

    for (const [arquivo, conteudo] of Object.entries(escopo)) {
      for (const proibida of banidas) {
        expect(
          conteudo.toLowerCase().includes(proibida.toLowerCase()),
          `string banida "${proibida}" encontrada em ${arquivo}`,
        ).toBe(false)
      }
    }

    for (const proibida of banidas) {
      expect(`prefixo ${proibida} sufixo`.toLowerCase()).toContain(proibida.toLowerCase())
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
