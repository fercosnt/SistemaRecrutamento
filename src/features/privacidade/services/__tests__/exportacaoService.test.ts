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
  formatarDataPuraPtBr,
  dispararDownloads,
  nomeArquivoExport,
  nomesArquivosExport,
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
// A MESMA fonte que o serviço filtra e que a Edge Function projeta. Importar o
// artefato (em vez de repetir nomes de coluna aqui) é o que impede esta sonda de
// ficar para trás quando a allowlist crescer por geração.
import { EXPORT_ALLOWLIST } from '../../../../../supabase/functions/_shared/exportAllowlist'
import { CANAL_PRIVACIDADE_EMAIL } from '../../constants/canalPrivacidade'

const ISO = '2026-08-04T13:45:00.000Z'

function resposta(over: Partial<RespostaExport> = {}): RespostaExport {
  return {
    ok: true,
    // A versão do BUNDLE, derivada — nunca um literal: com a lista da resposta igual à do
    // site, os arquivos carregam a frase da tela; numa versão divergente, a neutra (WR-03,
    // caso (cr6)). Um literal aqui envelheceria a cada regeneração da allowlist.
    versao_allowlist: EXPORT_ALLOWLIST.meta.versao,
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
    expect(objeto.versao_allowlist).toBe(EXPORT_ALLOWLIST.meta.versao)
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

  it('(n3) `formatarDataPuraPtBr` é pura, total e não passa por `Date`', () => {
    expect(formatarDataPuraPtBr('1990-05-12')).toBe('12/05/1990')
    expect(formatarDataPuraPtBr('2000-01-01')).toBe('01/01/2000')
    // Total: nada produz `Invalid Date` nem `NaN` na cópia do titular.
    expect(formatarDataPuraPtBr(null)).toBe(TRAVESSAO)
    expect(formatarDataPuraPtBr(undefined)).toBe(TRAVESSAO)
    expect(formatarDataPuraPtBr('')).toBe(TRAVESSAO)
    expect(formatarDataPuraPtBr('não é data')).toBe(TRAVESSAO)
    // Um INSTANTE não é data pura: ele pertence ao outro formatador.
    expect(formatarDataPuraPtBr('2026-08-04T13:45:00.000Z')).toBe(TRAVESSAO)
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

  it('(p2) NENHUM ponteiro de infra da ALLOWLIST GERADA entra no arquivo legível', () => {
    // ⚠ A (p) acima prova UMA coluna, por fixture. Era esse o buraco: enquanto a
    // exclusão era um `Set` literal de um item, três irmãs (`avatar_url`,
    // `gravacao_url`, `link_videochamada`) já estavam na allowlist e passavam
    // direto — e nenhum teste tinha fixture delas. Esta sonda ENUMERA o artefato
    // gerado, então ela não pode ficar para trás quando a allowlist crescer.
    const declarados = Object.entries(EXPORT_ALLOWLIST.tabelas).flatMap(([tabela, def]) =>
      ((def as { fora_do_arquivo_legivel: readonly string[] }).fora_do_arquivo_legivel ?? []).map(
        (coluna) => [tabela, coluna] as const,
      ),
    )

    // META-TEST: uma sonda que não enumera nada é no-op verde.
    expect(declarados.length, 'a sonda não achou ponteiro nenhum no artefato — é no-op').toBeGreaterThan(0)

    for (const [tabela, coluna] of declarados) {
      const marca = `MARCA-${tabela}-${coluna}`
      const html = gerarHtmlExport(resposta({ payload: { [tabela]: [{ id: 'x', [coluna]: marca }] } }))
      expect(html, `${tabela}.${coluna} vazou para o arquivo legível`).not.toContain(marca)
    }
  })

  it('(p3) o filtro é DIRIGIDO, não uma varredura: endereço do titular continua visível', () => {
    // O contrapeso da (p2), e ele é o que impede a correção de virar excesso. Uma
    // regra que escondesse todo nome de endereço tiraria do titular o que ele
    // mesmo digitou (`instagram_url`) e o ONDE da entrevista (`local_ou_link`) —
    // e essas duas colunas têm veredito EXPLÍCITO `fora_do_arquivo_legivel: false`
    // no `export-scope-rules.yaml`. Elas casam o padrão de nome e ficam visíveis.
    const visiveis = [
      ['candidatos', 'instagram_url'],
      ['agendamentos_entrevista', 'local_ou_link'],
    ] as const

    for (const [tabela, coluna] of visiveis) {
      const declarados = (
        EXPORT_ALLOWLIST.tabelas as Record<string, { colunas: readonly string[]; fora_do_arquivo_legivel: readonly string[] }>
      )[tabela]
      // Se a coluna sair da allowlist, esta asserção avisa em vez de virar no-op.
      expect(declarados?.colunas, `${tabela}.${coluna} sumiu da allowlist`).toContain(coluna)
      expect(declarados.fora_do_arquivo_legivel).not.toContain(coluna)

      const marca = `MARCA-${tabela}-${coluna}`
      const html = gerarHtmlExport(resposta({ payload: { [tabela]: [{ id: 'x', [coluna]: marca }] } }))
      expect(html, `${tabela}.${coluna} sumiu do arquivo legível sem veredito que o mande sumir`).toContain(marca)
    }
  })

  it('(p4) tabela que o artefato NÃO conhece falha FECHADA: endereço não é impresso', () => {
    // A Edge Function roda o artefato IMPLANTADO; este bundle roda o artefato
    // COMPILADO. Na janela entre regenerar e implantar eles divergem, e a EF pode
    // projetar uma tabela que este código não conhece. "Não sei" tem de esconder
    // o endereço, nunca imprimi-lo.
    const tabelaNova = 'tabela_que_nao_existe_no_artefato'
    expect(Object.keys(EXPORT_ALLOWLIST.tabelas)).not.toContain(tabelaNova)

    const html = gerarHtmlExport(
      resposta({
        payload: {
          [tabelaNova]: [
            { id: 'x', anexo_url: 'MARCA-ENDERECO', observacao: 'MARCA-LEGIVEL' },
          ],
        },
      }),
    )

    expect(html, 'endereço de tabela desconhecida foi impresso — o fail-open que a CR-01 nomeia').not.toContain('MARCA-ENDERECO')
    // …e a seção continua INTEIRA: fechar no endereço nunca vira esconder a tabela.
    expect(html).toContain('MARCA-LEGIVEL')
  })

  it('(p5) as tabelas e colunas do G5 (44-11) aparecem com rótulo legível, nunca com o nome técnico', () => {
    // As duas tabelas que a allowlist 1.4.0 pôs em escopo — a sonda confere que
    // elas existem no artefato, para não testar um rótulo de tabela que nunca chega.
    for (const t of ['retencao_hold', 'cognitivo_liberacao']) {
      expect(Object.keys(EXPORT_ALLOWLIST.tabelas), `G5 (p5): ${t} não está no artefato`).toContain(t)
    }

    const html = gerarHtmlExport(
      resposta({
        versao_allowlist: '1.4.0',
        payload: {
          candidatos: [{ id: 'cand-1', faixa_etaria_materializada: '25-34' }],
          candidaturas: [{ id: 'cndt-1', encerrada_a_pedido_em: ISO }],
          solicitacoes_dados: [
            {
              id: 'sol-1',
              executar_em: ISO,
              cancelado_em: null,
              storage_concluido_em: ISO,
              postgres_concluido_em: ISO,
              auth_concluido_em: ISO,
            },
          ],
          retencao_hold: [
            { id: 'rh-1', candidatura_id: 'cndt-1', motivo: 'MARCA-MOTIVO', criado_em: ISO, liberado_em: null },
          ],
          cognitivo_liberacao: [
            { id: 'cl-1', candidatura_id: 'cndt-1', liberado_em: ISO, revogado_em: null, motivo: 'MARCA-LIB' },
          ],
        },
      }),
    )

    // Títulos de seção em português de produto…
    expect(html).toContain('<h2>Conservação dos seus dados além do prazo</h2>')
    // 51-04 (D-15): a liberação é do Raven — «Raciocínio lógico (Matrizes)», não mais o nome
    // genérico que os dois instrumentos dividiam.
    expect(html).toContain('<h2>Liberação do Raciocínio lógico (Matrizes)</h2>')
    expect(html).not.toContain('Liberação da avaliação cognitiva')
    // …e nunca o nome técnico humanizado pelo fallback.
    expect(html).not.toContain('Retencao hold')
    expect(html).not.toContain('Cognitivo liberacao')

    // As seis colunas novas com rótulo explícito.
    const esperados: Record<string, string> = {
      faixa_etaria_materializada: 'Faixa etária registrada',
      executar_em: 'Data prevista para a execução do pedido',
      encerrada_a_pedido_em: 'Encerrada a seu pedido em',
      storage_concluido_em: 'Etapa dos arquivos concluída em',
      postgres_concluido_em: 'Etapa do cadastro concluída em',
      auth_concluido_em: 'Etapa da conta de acesso concluída em',
    }
    for (const [coluna, rotulo] of Object.entries(esperados)) {
      expect(COPY_ARQUIVO.rotuloColuna[coluna], `G5 (p5): ${coluna} sem rótulo explícito`).toBe(rotulo)
      expect(html).toContain(`<dt>${rotulo}</dt>`)
      // O fallback do humanizador (nome técnico) não aparece.
      const tecnico = coluna.replace(/_/g, ' ')
      expect(html).not.toContain(`<dt>${tecnico.charAt(0).toUpperCase()}${tecnico.slice(1)}</dt>`)
    }

    // Nenhum rótulo novo nomeia infraestrutura (Invariante 2 / proibição do 44-13).
    const novos = [
      COPY_ARQUIVO.rotuloTabela.retencao_hold,
      COPY_ARQUIVO.rotuloTabela.cognitivo_liberacao,
      ...Object.values(esperados),
    ]
    for (const r of novos) {
      expect(r, `G5 (p5): rótulo ausente`).toBeTruthy()
      expect(r).not.toMatch(/storage|postgres|auth\b|supabase|bucket/i)
    }

    // `recibo_enviado_em` ficou FORA da cópia (44-11): rótulo para coluna que
    // nunca chega seria promessa sem executor.
    expect(COPY_ARQUIVO.rotuloColuna).not.toHaveProperty('recibo_enviado_em')
    expect(EXPORT_ALLOWLIST.tabelas.solicitacoes_dados.colunas).not.toContain('recibo_enviado_em')

    // Os nomes de coluna que o humanizador já resolve continuam legíveis.
    expect(html).toContain('<dt>Liberado em</dt>')
    expect(html).toContain('MARCA-MOTIVO')
    expect(html).toContain('MARCA-LIB')
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
// Plano 44-14 — CR-01: a fronteira dita ao titular (casos (cr1)–(cr3)).
//
// `COPY_PEDIR_COPIA.oQueNaoEsta` é a ÚNICA frase que o titular lê sobre o que
// ficou de fora da cópia — na tela, no `.html` e no `.json`. Sob a allowlist 1.4.0
// ela afirmava que o retido era só telemetria, e não era (44-REVIEW §CR-01). O
// portão abaixo prende a frase ao ARTEFATO: as famílias de razão são DERIVADAS de
// `colunas_excluidas`/`excluidas` na execução, nunca escritas aqui — um veto novo
// com família nova reprova o (cr1) até a frase mudar pela 44-UI-SPEC.
// (CLAUDE.md §Portões: iteração sobre lista literal não reprova nada.)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Família de razão → marcador (substring que TEM de estar na frase).
 *
 * ⚠ ESCOPO DELIBERADO, não fotografia: cada entrada é uma decisão de copy. Mudar uma
 * entrada é mudar a frase pela 44-UI-SPEC (linha «O que não está na cópia») — nunca o
 * contrário. As CHAVES são conferidas por IGUALDADE DE CONJUNTOS com as famílias que o
 * artefato produz; um conjunto escrito aqui que não batesse com o artefato reprova o
 * (cr1) pelos dois lados (`familiaSemClausula` e `clausulaOrfa`).
 */
const CLAUSULA_POR_FAMILIA: Readonly<Record<string, string>> = {
  telemetria_interna: 'os registros técnicos de funcionamento do sistema',
  'BD-13 (iv)': 'o controle de envio de mensagens',
  configuracao_do_produto: 'a configuração do próprio sistema',
  vocabulario_do_sistema: 'a configuração do próprio sistema',
  segredo: 'a configuração do próprio sistema',
  pii_de_terceiro: 'os dados que identificam outras pessoas',
  'BD-10': 'as anotações internas da equipe sobre a conservação dos seus dados além do prazo',
  'BD-13 (ii)': 'a ficha técnica que o sistema monta ao atender um pedido de exclusão',
  'BD-9': 'o texto em que a equipe justificou a decisão final',
}

/**
 * Forma ESTRUTURAL do artefato — aceita `EXPORT_ALLOWLIST` (o espelho `.ts`, `as const`)
 * e as cópias sintéticas dos controles negativos do (cr3).
 */
type ArtefatoFronteira = {
  tabelas: Record<string, { colunas_excluidas?: Record<string, string> }>
  excluidas: Record<string, string>
}

/** `BD-<n>` opcionalmente seguido de espaço e `(<romano minúsculo>)`. */
const ID_DECISAO = /BD-\d+(?:\s*\([ivxlcdm]+\))?/
/** Citação de coluna entre crases: `tabela.coluna`. */
const CITACAO_COLUNA = /`([a-z0-9_]+)\.([a-z0-9_]+)`/g

function razaoDaColuna(artefato: ArtefatoFronteira, tabela: string, coluna: string): string | undefined {
  return artefato.tabelas[tabela]?.colunas_excluidas?.[coluna]
}

/**
 * A REGRA DE FAMÍLIA do 44-14 (`<interfaces>`), em sete passos e nesta ordem. Pura:
 * só lê `artefato`. Devolve `null` quando o item não tem família — e é isso que o
 * (cr1) reprova, nomeando o item. `visitados` protege os passos 2 e 6 de ciclo.
 */
function familiaDaRazao(
  item: string,
  razao: string,
  artefato: ArtefatoFronteira,
  visitados: ReadonlySet<string> = new Set(),
): string | null {
  if (visitados.has(item)) return null
  const vistos = new Set(visitados).add(item)
  const seguir = (ref: string): string | null => {
    const [tabela, coluna] = ref.split('.')
    const r = razaoDaColuna(artefato, tabela, coluna)
    return r === undefined ? null : familiaDaRazao(ref, r, artefato, vistos)
  }

  // 1. sem o prefixo `decisoes_por_coluna:` e, depois, sem um `(i)` inicial.
  const texto = razao.replace(/^decisoes_por_coluna:/, '').trim().replace(/^\(i\)/, '').trim()

  // 2. «Herda `tabela.coluna`» → a família do item referido, no MESMO artefato.
  const herda = texto.match(/^Herda\s+`([a-z0-9_]+)\.([a-z0-9_]+)`/)
  if (herda) return seguir(`${herda[1]}.${herda[2]}`)

  // 3. a cabeça: até o primeiro « — » ou a primeira quebra de linha.
  const cabeca = texto.split(/ — |\n/)[0]

  // 4. id de decisão na cabeça, com espaço único.
  const id = cabeca.match(ID_DECISAO)
  if (id) return id[0].replace(/\s*\(/, ' (')

  // 5. token do VOCABULÁRIO — os valores de `excluidas`, derivados aqui, nunca escritos.
  const vocabulario = [...new Set(Object.values(artefato.excluidas))]
  const achados = vocabulario
    .map((token) => [token, cabeca.indexOf(token)] as const)
    .filter(([, i]) => i >= 0)
    .sort((a, b) => a[1] - b[1])
  if (achados.length > 0) return achados[0][0]

  // 6. a razão inteira cita entre crases exatamente UMA outra coluna retida.
  const citadas = new Set(
    [...razao.matchAll(CITACAO_COLUNA)]
      .map((m) => `${m[1]}.${m[2]}`)
      .filter((ref) => ref !== item && razaoDaColuna(artefato, ...(ref.split('.') as [string, string])) !== undefined),
  )
  if (citadas.size === 1) return seguir([...citadas][0])

  // 7. sem família.
  return null
}

type LacunasDaFronteira = {
  /** famílias que o artefato produz (para a sanidade do (cr1) e para o SUMMARY) */
  familias: string[]
  /** itens retidos que receberam família — `tabela.coluna` ou `tabela` → família */
  itens: Record<string, string>
  semFamilia: string[]
  familiaSemClausula: string[]
  clausulaOrfa: string[]
  marcadorAusente: string[]
  semCanal: boolean
}

/**
 * Tudo o que separa a frase do artefato, em listas ORDENADAS (o output do vermelho
 * nomeia o item ou a família). Pura; `mapa` é parâmetro para os controles do (cr3).
 */
function lacunasDaFronteira(
  frase: string,
  artefato: ArtefatoFronteira,
  mapa: Readonly<Record<string, string>> = CLAUSULA_POR_FAMILIA,
): LacunasDaFronteira {
  const itens: Record<string, string> = {}
  const semFamilia: string[] = []
  const classificar = (item: string, razao: string) => {
    const familia = familiaDaRazao(item, razao, artefato)
    if (familia === null) semFamilia.push(item)
    else itens[item] = familia
  }
  for (const [tabela, def] of Object.entries(artefato.tabelas)) {
    for (const [coluna, razao] of Object.entries(def.colunas_excluidas ?? {})) {
      classificar(`${tabela}.${coluna}`, razao)
    }
  }
  for (const [tabela, razao] of Object.entries(artefato.excluidas)) classificar(tabela, razao)

  const familias = [...new Set(Object.values(itens))].sort()
  const temClausula = (f: string) => Object.prototype.hasOwnProperty.call(mapa, f)
  return {
    familias,
    itens,
    semFamilia: semFamilia.sort(),
    familiaSemClausula: familias.filter((f) => !temClausula(f)),
    clausulaOrfa: Object.keys(mapa).filter((f) => !familias.includes(f)).sort(),
    marcadorAusente: familias.filter((f) => temClausula(f) && !frase.includes(mapa[f])),
    semCanal: !frase.includes(CANAL_PRIVACIDADE_EMAIL),
  }
}

describe('a fronteira dita ao titular (CR-01)', () => {
  it('(cr1) CR-01 · toda família de razão do artefato tem cláusula na frase', () => {
    const l = lacunasDaFronteira(COPY_PEDIR_COPIA.oQueNaoEsta, EXPORT_ALLOWLIST)

    // Sanidade: um artefato que não produzisse família nenhuma deixaria as quatro
    // listas abaixo vazias pelo motivo errado (população vazia mente).
    expect(l.familias.length, 'o artefato não produziu família nenhuma — a regra não está lendo o artefato').toBeGreaterThan(0)

    expect(
      l.semFamilia,
      'item retido sem família de razão — escreva a razão no artefato com uma família reconhecível (id BD-<n> ou token de `excluidas`)',
    ).toEqual([])
    expect(
      l.familiaSemClausula,
      'família sem cláusula — nomeie a categoria na frase pela 44-UI-SPEC e acrescente-a ao CLAUSULA_POR_FAMILIA',
    ).toEqual([])
    expect(
      l.clausulaOrfa,
      'cláusula órfã — a família saiu do artefato; a frase passaria a negar a entrega de algo que agora vem: tire a cláusula pela 44-UI-SPEC',
    ).toEqual([])
    expect(
      l.marcadorAusente,
      'família sem marcador na frase — a frase não nomeia esta categoria retida; reescreva-a pela 44-UI-SPEC',
    ).toEqual([])
    expect(l.semCanal, 'a frase não traz o canal de privacidade para pedir o que não veio').toBe(false)
  })

  it('(cr2) CR-01 · a frase é a mesma na tela, no .html e no .json', () => {
    const frase = COPY_PEDIR_COPIA.oQueNaoEsta
    const r = resposta()

    // .json — a chave de metadado carrega a MESMA string.
    expect(JSON.parse(gerarJsonExport(r)).o_que_nao_esta_nesta_copia).toBe(frase)

    // .html — o escape não muda nada, então o texto do arquivo é literalmente a frase,
    // e o parágrafo vem IMEDIATAMENTE depois do título da seção de fronteira.
    expect(escapeHtml(frase)).toBe(frase)
    expect(gerarHtmlExport(r)).toContain(
      `<section><h2>${escapeHtml(COPY_ARQUIVO.naoEstaTitulo)}</h2>\n<p>${frase}</p></section>`,
    )

    // tela — o bloco renderiza a constante, não uma cópia dela. (Caminho por
    // VARIÁVEL: com literal o Vite reescreve `new URL` para `http:` — ver o (af).)
    const relativo = '../../components/PedirCopiaBloco.tsx'
    const bloco = readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
    expect(bloco).toContain('{COPY_PEDIR_COPIA.oQueNaoEsta}')

    // Nenhum nome técnico de tabela ou coluna (T-44-86).
    expect(frase).not.toMatch(/\b[a-z0-9]+_[a-z0-9_]+\b/)
    // A afirmação antiga (o retido «descreve o sistema») não volta — literal montado
    // em runtime, idioma do (t): o trecho não é plantado neste arquivo.
    const afirmacaoAntiga = ['descrevem', 'o', 'sistema'].join(' ')
    expect(frase).not.toContain(afirmacaoAntiga)
    expect(`x ${afirmacaoAntiga} y`).toContain(afirmacaoAntiga)
  })

  // Os controles negativos PERMANENTES do portão (CLAUDE.md §Portões: «um portão que
  // você tornou incapaz de falhar é pior que o quebrado»). Cada mutação parte do
  // artefato REAL ou da frase REAL, e antes da mordida prova que mudou algo — uma
  // mutação que não muda nada faria o controle testar o vazio.
  it('(cr3) CR-01 · o portão morde: família nova, cláusula retirada, razão sem família, família que saiu do artefato e canal ausente reprovam', () => {
    const frase = COPY_PEDIR_COPIA.oQueNaoEsta
    const clonar = (): ArtefatoFronteira => structuredClone(EXPORT_ALLOWLIST) as ArtefatoFronteira
    const mudouOArtefato = (a: ArtefatoFronteira) => JSON.stringify(a) !== JSON.stringify(EXPORT_ALLOWLIST)
    const reterNovaColuna = (a: ArtefatoFronteira, coluna: string, razao: string) => {
      a.tabelas.candidatos.colunas_excluidas = { ...a.tabelas.candidatos.colunas_excluidas, [coluna]: razao }
    }

    // 1. família nova sintética (um veto futuro com id de decisão que a frase não conhece)
    const vetoNovo = clonar()
    reterNovaColuna(vetoNovo, 'sonda_bd99', 'decisoes_por_coluna: BD-99 — sonda do portão')
    expect(mudouOArtefato(vetoNovo), 'controle BD-99: a mutação não mudou o artefato').toBe(true)
    expect(lacunasDaFronteira(frase, vetoNovo).familiaSemClausula).toEqual(['BD-99'])

    // Os alvos dos controles 2 e 4 são escolhidos pelos DADOS DERIVADOS, nunca por nome
    // (44-REVIEW §IN-01): nomear uma família cuja decisão segue em aberto faria este caso
    // reprovar trabalho correto no dia em que ela fosse decidida e a frase mudasse.
    const real = lacunasDaFronteira(frase, EXPORT_ALLOWLIST)

    // 2. a frase real sem a cláusula da PRIMEIRA família (ordenada) cujo marcador é só
    // dela no mapa e aparece uma única vez na frase — retirá-lo não toca outra família.
    const marcadorExclusivo = (f: string) =>
      Object.values(CLAUSULA_POR_FAMILIA).filter((m) => m === CLAUSULA_POR_FAMILIA[f]).length === 1
    const alvoDaFrase = real.familias.find(
      (f) => CLAUSULA_POR_FAMILIA[f] !== undefined && marcadorExclusivo(f) && frase.split(CLAUSULA_POR_FAMILIA[f]).length === 2,
    )
    expect(alvoDaFrase, 'controle 2: nenhuma família com marcador exclusivo e único na frase — o controle não teria o que retirar').toBeDefined()
    const semClausula = frase.replace(CLAUSULA_POR_FAMILIA[alvoDaFrase as string], '')
    expect(semClausula, 'controle 2: a mutação não mudou a frase').not.toBe(frase)
    expect(lacunasDaFronteira(semClausula, EXPORT_ALLOWLIST).marcadorAusente).toEqual([alvoDaFrase])

    // 3. uma razão que não pertence a família nenhuma
    const razaoSolta = clonar()
    reterNovaColuna(razaoSolta, 'sonda_sem_familia', 'decisoes_por_coluna: texto sem família nenhuma')
    expect(mudouOArtefato(razaoSolta), 'controle sem família: a mutação não mudou o artefato').toBe(true)
    expect(lacunasDaFronteira(frase, razaoSolta).semFamilia).toEqual(['candidatos.sonda_sem_familia'])

    // 4. uma família que SAIU do artefato (como se a decisão dela passasse o item para a
    // cópia): a frase passaria a negar a entrega de algo que agora vem. O clone perde
    // TODOS os itens — colunas e tabelas — que `real.itens` atribui à primeira família.
    const alvoDoArtefato = real.familias[0]
    expect(alvoDoArtefato, 'controle 4: o artefato não produziu família nenhuma').toBeDefined()
    const semFamilia = clonar()
    for (const [item, familia] of Object.entries(real.itens)) {
      if (familia !== alvoDoArtefato) continue
      const [tabela, coluna] = item.split('.')
      if (coluna === undefined) delete semFamilia.excluidas[tabela]
      else delete semFamilia.tabelas[tabela]?.colunas_excluidas?.[coluna]
    }
    expect(mudouOArtefato(semFamilia), 'controle 4: a mutação não mudou o artefato').toBe(true)
    expect(lacunasDaFronteira(frase, semFamilia).clausulaOrfa).toEqual([alvoDoArtefato])

    // 5. a frase real sem o canal de privacidade
    const semCanal = frase.replace(CANAL_PRIVACIDADE_EMAIL, '')
    expect(semCanal, 'controle do canal: a mutação não mudou a frase').not.toBe(frase)
    expect(lacunasDaFronteira(semCanal, EXPORT_ALLOWLIST).semCanal).toBe(true)
  })

  // ── Plano 44-17 — CR-01-bis: o portão por TABELA (BD-21) ─────────────────────
  // O (cr1) casa por FAMÍLIA, e uma família cujo rótulo é falso para uma das suas
  // tabelas passa inteira: `entrevista_guias` estava em `configuracao_do_produto`,
  // cuja cláusula afirmava que o retido era igual para todos — e o roteiro é por
  // candidatura (44-REVIEW §CR-01-bis). O (cr5) prende cada tabela por titular retida
  // numa família «da configuração do sistema» a um veredito PRÓPRIO na frase.
  // Nada aqui é lista literal de tabelas nem contagem contra constante: a classe, as
  // colunas de vínculo e o conjunto de tabelas vêm do artefato e do catálogo na
  // execução (CLAUDE.md §Portões).

  /**
   * Tabela → veredito de copy. ⚠ ESCOPO DELIBERADO, não fotografia: cada entrada é uma
   * decisão do operador sobre como a frase nomeia aquela tabela retida. Mudar uma
   * entrada é mudar a frase pela 44-UI-SPEC (linha «O que não está na cópia») — nunca o
   * contrário. As CHAVES são conferidas por IGUALDADE DE CONJUNTOS com a classe DERIVADA
   * (`lacunasPorTabela().comVinculo`): uma tabela que entre na classe sem veredito
   * reprova (`semVeredito`), e um veredito cuja tabela saiu da classe também
   * (`vereditoOrfao`).
   */
  const VEREDITO_POR_TABELA: Readonly<Record<string, { decisao: string; marcador: string }>> = {
    entrevista_guias: { decisao: 'BD-18', marcador: 'o roteiro que a equipe monta para conduzir a sua entrevista' },
  }

  /**
   * A tabela-raiz do grafo do titular. A `chave_titular` dela é a PK da própria pessoa
   * (`id`), não um vínculo — escopo deliberado (a raiz), não fotografia.
   */
  const RAIZ_DO_TITULAR = 'candidatos'

  /** Forma ESTRUTURAL do artefato com a chave de vínculo — aceita `EXPORT_ALLOWLIST` e clones. */
  type ArtefatoPorTabela = {
    tabelas: Record<string, { chave_titular?: string; colunas_excluidas?: Record<string, string> }>
    excluidas: Record<string, string>
  }

  type ColunaDoCatalogo = { tabela: string; coluna: string }

  /**
   * Forma do catálogo vivo que o portão lê. `colunas_fora_do_escopo` é o bloco medido que
   * o 44-18 acrescenta (o gerador da allowlist não o lê); aqui ele já é aceito, opcional.
   */
  type CatalogoVinculo = {
    colunas: ReadonlyArray<ColunaDoCatalogo>
    colunas_fora_do_escopo?: { tabelas: ReadonlyArray<string>; colunas: ReadonlyArray<ColunaDoCatalogo> }
  }

  /**
   * As famílias GENÉRICAS — as que dividem, no mapa, o marcador de
   * `configuracao_do_produto` («a configuração do próprio sistema»). Derivadas do mapa,
   * nunca escritas: uma família nova apontada para a mesma cláusula entra sozinha.
   */
  function familiasGenericas(mapa: Readonly<Record<string, string>>): string[] {
    const marcador = mapa.configuracao_do_produto
    if (marcador === undefined) return []
    return Object.keys(mapa)
      .filter((f) => mapa[f] === marcador)
      .sort()
  }

  /** As colunas de VÍNCULO ao titular: os `chave_titular` do artefato, menos o da raiz. */
  function colunasDeVinculo(artefato: ArtefatoPorTabela): string[] {
    const chaves = Object.entries(artefato.tabelas)
      .filter(([tabela]) => tabela !== RAIZ_DO_TITULAR)
      .map(([, def]) => def.chave_titular)
      .filter((c): c is string => typeof c === 'string' && c.length > 0)
    return [...new Set(chaves)].sort()
  }

  type LacunasPorTabela = {
    /** tabelas excluídas de família genérica com coluna de vínculo no catálogo */
    comVinculo: string[]
    semVeredito: string[]
    vereditoOrfao: string[]
    /** veredito cujo marcador não está na frase */
    marcadorAusente: string[]
    /**
     * tabelas excluídas de família genérica SEM NENHUMA coluna medida (nem em `colunas` nem
     * em `colunas_fora_do_escopo.colunas`): a cobertura falha FECHADA — ausência de coluna
     * no catálogo não é ausência de vínculo (população vazia mente)
     */
    naoMedidas: string[]
    /**
     * vereditos cuja tabela não tem, no YAML, comentário imediatamente acima de
     * `  <tabela>:` dentro de `fora_do_escopo:` citando a `decisao` — a razão mora onde a
     * classificação mora
     */
    semRazaoNoYaml: string[]
  }

  /**
   * As linhas de comentário CONTÍGUAS imediatamente acima de `  <tabela>:` dentro do bloco
   * `fora_do_escopo:` do YAML, juntadas — ou `null` se a entrada não estiver lá. O bloco vai
   * de `fora_do_escopo:` (coluna 0) até a próxima chave de topo.
   */
  function comentarioAcimaNoYaml(yamlTexto: string, tabela: string): string | null {
    const linhas = yamlTexto.split('\n')
    const ini = linhas.findIndex((l) => /^fora_do_escopo:\s*$/.test(l))
    if (ini < 0) return null
    const depois = linhas.findIndex((l, i) => i > ini && /^[^\s#]/.test(l))
    const fim = depois < 0 ? linhas.length : depois
    const alvo = linhas.findIndex((l, i) => i > ini && i < fim && l.startsWith(`  ${tabela}:`))
    if (alvo < 0) return null
    const comentario: string[] = []
    for (let i = alvo - 1; i > ini && /^\s*#/.test(linhas[i]); i--) comentario.unshift(linhas[i])
    return comentario.join('\n')
  }

  /** O texto cita o id de decisão como TOKEN (`BD-18` não casa `BD-181`). */
  function citaDecisao(texto: string, decisao: string): boolean {
    const id = decisao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^A-Za-z0-9-])${id}(?![0-9])`).test(texto)
  }

  /**
   * Tudo o que separa a frase do artefato, do catálogo e do YAML, POR TABELA, em listas
   * ORDENADAS (o output do vermelho nomeia a tabela). Pura; `vereditos` e `mapa` são
   * parâmetros para os controles de mordida.
   */
  function lacunasPorTabela(
    frase: string,
    artefato: ArtefatoPorTabela,
    catalogo: CatalogoVinculo,
    yamlTexto: string,
    vereditos: Readonly<Record<string, { decisao: string; marcador: string }>> = VEREDITO_POR_TABELA,
    mapa: Readonly<Record<string, string>> = CLAUSULA_POR_FAMILIA,
  ): LacunasPorTabela {
    const genericas = new Set(familiasGenericas(mapa))
    const vinculo = new Set(colunasDeVinculo(artefato))
    const colunas = [...catalogo.colunas, ...(catalogo.colunas_fora_do_escopo?.colunas ?? [])]
    const ligadas = new Set(colunas.filter((c) => vinculo.has(c.coluna)).map((c) => c.tabela))
    const medidas = new Set(colunas.map((c) => c.tabela))

    const daClasse = Object.entries(artefato.excluidas)
      .filter(([tabela, razao]) => {
        const familia = familiaDaRazao(tabela, razao, artefato)
        return familia !== null && genericas.has(familia)
      })
      .map(([tabela]) => tabela)
      .sort()
    const comVinculo = daClasse.filter((t) => ligadas.has(t))
    const chaves = Object.keys(vereditos).sort()

    return {
      comVinculo,
      semVeredito: comVinculo.filter((t) => !chaves.includes(t)),
      vereditoOrfao: chaves.filter((t) => !comVinculo.includes(t)),
      marcadorAusente: chaves.filter((t) => !frase.includes(vereditos[t].marcador)),
      naoMedidas: daClasse.filter((t) => !medidas.has(t)),
      semRazaoNoYaml: chaves.filter((t) => {
        const comentario = comentarioAcimaNoYaml(yamlTexto, t)
        return comentario === null || !citaDecisao(comentario, vereditos[t].decisao)
      }),
    }
  }

  it('(cr5) CR-01-bis · toda tabela retida com vínculo ao titular numa família da configuração do sistema tem veredito próprio na frase', () => {
    const frase = COPY_PEDIR_COPIA.oQueNaoEsta
    // Caminho por VARIÁVEL (idioma do (cr2)/(af)): com literal o Vite reescreve `new URL`.
    const relativo = '../../../../../docs/compliance/catalogo-vivo-44.json'
    const catalogo = JSON.parse(
      readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8'),
    ) as CatalogoVinculo

    // Sanidade (população vazia mente): sem classe genérica ou sem coluna de vínculo,
    // as listas abaixo ficariam vazias pelo motivo errado.
    const genericas = familiasGenericas(CLAUSULA_POR_FAMILIA)
    expect(genericas, 'a classe genérica não foi derivada do mapa').toContain('configuracao_do_produto')
    expect(genericas, 'a classe genérica não foi derivada do mapa').toContain('vocabulario_do_sistema')
    const vinculo = colunasDeVinculo(EXPORT_ALLOWLIST)
    expect(vinculo.length, 'nenhuma coluna de vínculo derivada de `chave_titular` do artefato').toBeGreaterThan(0)
    const nomesNoCatalogo = new Set(catalogo.colunas.map((c) => c.coluna))
    expect(
      vinculo.filter((c) => !nomesNoCatalogo.has(c)),
      'coluna de vínculo que não existe no catálogo — o portão estaria procurando um nome que o catálogo não tem',
    ).toEqual([])

    // O YAML onde a classificação mora — a razão por tabela é conferida no comentário dele.
    const relativoYaml = '../../../../../docs/compliance/export-scope-rules.yaml'
    const yamlTexto = readFileSync(fileURLToPath(new URL(relativoYaml, import.meta.url)), 'utf8')

    const l = lacunasPorTabela(frase, EXPORT_ALLOWLIST, catalogo, yamlTexto)

    // `expect.soft`: o vermelho mostra TODAS as lacunas de uma vez, cada uma nomeando a tabela.
    expect
      .soft(
        l.naoMedidas,
        'tabela excluída numa família da configuração do sistema sem NENHUMA coluna medida — ausência de coluna não é ausência de vínculo: meça-a (só leitura) e acrescente as colunas a `colunas_fora_do_escopo` do catálogo',
      )
      .toEqual([])
    expect
      .soft(
        l.semRazaoNoYaml,
        'veredito sem razão no YAML — escreva, no comentário imediatamente acima de `  <tabela>:` em `fora_do_escopo:` de docs/compliance/export-scope-rules.yaml, a razão citando a decisão',
      )
      .toEqual([])
    expect
      .soft(
        l.semVeredito,
        'tabela por titular retida numa família da configuração do sistema sem veredito — nomeie-a na frase pela 44-UI-SPEC e registre a decisão em VEREDITO_POR_TABELA e no comentário do YAML',
      )
      .toEqual([])
    expect
      .soft(
        l.vereditoOrfao,
        'veredito órfão — a tabela saiu da classe (mudou de família, perdeu o vínculo ou passou a vir na cópia); revise a frase pela 44-UI-SPEC e tire a entrada de VEREDITO_POR_TABELA',
      )
      .toEqual([])
    expect
      .soft(
        l.marcadorAusente,
        'veredito sem marcador na frase — a frase não nomeia esta tabela retida; reescreva-a pela 44-UI-SPEC',
      )
      .toEqual([])

    // Os dois trechos que saíram (BD-18, BD-19) não voltam — montados em runtime por
    // junção de palavras (idioma do (t)): o trecho não é plantado neste arquivo.
    const retirados = {
      'igualdade entre candidatos (BD-18)': ['mesmo', 'para', 'todos', 'os', 'candidatos'].join(' '),
      'oferta de entregar o retido (BD-19)': ['ou', 'pedir', 'algum', 'deles'].join(' '),
    }
    for (const [nome, trecho] of Object.entries(retirados)) {
      expect.soft(frase.includes(trecho), `trecho retirado voltou à frase: ${nome}`).toBe(false)
      expect(`x ${trecho} y`).toContain(trecho) // META-TEST: a sonda acha o trecho quando ele existe
    }

    // Sanidade do bloco medido (população vazia mente): sem tabelas medidas fora do escopo,
    // `naoMedidas` só estaria vazio se o catálogo antigo por acaso cobrisse a classe.
    // No fim do caso, para o vermelho mostrar antes as listas acima.
    expect(
      catalogo.colunas_fora_do_escopo?.tabelas.length ?? 0,
      '`colunas_fora_do_escopo.tabelas` ausente ou vazio no catálogo — a classe excluída não foi medida',
    ).toBeGreaterThan(0)
  })

  // Os controles negativos PERMANENTES do portão de classe (CLAUDE.md §Portões: «um portão
  // que você tornou incapaz de falhar é pior que o quebrado»). Cada mutação parte do
  // artefato, do catálogo, da frase, do YAML ou dos vereditos REAIS e, antes da mordida,
  // prova que mudou algo. A tabela-alvo dos controles 3, 4, 6 e 7 é escolhida pelos DADOS
  // (a primeira chave ordenada de VEREDITO_POR_TABELA), nunca por nome (44-REVIEW §IN-01).
  it('(cr5b) CR-01-bis · o portão de classe morde: tabela genérica nova com vínculo, veredito retirado, marcador retirado, tabela entregue, tabela não medida, razão apagada do YAML e vínculo renomeado reprovam', () => {
    type CatalogoMutavel = {
      colunas: ColunaDoCatalogo[]
      colunas_fora_do_escopo?: { tabelas: string[]; colunas: ColunaDoCatalogo[] }
    }
    const frase = COPY_PEDIR_COPIA.oQueNaoEsta
    // Caminhos por VARIÁVEL (idioma do (cr2)/(af)): com literal o Vite reescreve `new URL`.
    const relativoCatalogo = '../../../../../docs/compliance/catalogo-vivo-44.json'
    const relativoYaml = '../../../../../docs/compliance/export-scope-rules.yaml'
    const catalogoTexto = readFileSync(fileURLToPath(new URL(relativoCatalogo, import.meta.url)), 'utf8')
    const yamlTexto = readFileSync(fileURLToPath(new URL(relativoYaml, import.meta.url)), 'utf8')
    const catalogoReal = JSON.parse(catalogoTexto) as CatalogoMutavel

    const clonarArtefato = (): ArtefatoPorTabela => structuredClone(EXPORT_ALLOWLIST) as ArtefatoPorTabela
    const clonarCatalogo = (): CatalogoMutavel => structuredClone(catalogoReal)
    const mudouOArtefato = (a: ArtefatoPorTabela) => JSON.stringify(a) !== JSON.stringify(EXPORT_ALLOWLIST)
    const mudouOCatalogo = (c: CatalogoMutavel) => JSON.stringify(c) !== JSON.stringify(catalogoReal)

    // Ponto de partida: o portão real está verde (senão as mordidas abaixo não distinguiriam nada).
    const real = lacunasPorTabela(frase, EXPORT_ALLOWLIST, catalogoReal, yamlTexto)
    expect(real.comVinculo.length, 'a classe com vínculo está vazia — os controles testariam o vazio').toBeGreaterThan(0)
    expect(catalogoReal.colunas_fora_do_escopo, 'o catálogo não tem o bloco medido `colunas_fora_do_escopo`').toBeDefined()
    const alvo = Object.keys(VEREDITO_POR_TABELA).sort()[0]
    expect(alvo, 'VEREDITO_POR_TABELA vazio — os controles 2..7 não teriam alvo').toBeDefined()
    const vinculo = colunasDeVinculo(EXPORT_ALLOWLIST)

    // 1. tabela genérica NOVA com coluna de vínculo, medida no bloco, sem veredito
    const novaArt = clonarArtefato()
    novaArt.excluidas.sonda_por_titular = 'configuracao_do_produto'
    const novaCat = clonarCatalogo()
    novaCat.colunas_fora_do_escopo?.tabelas.push('sonda_por_titular')
    novaCat.colunas_fora_do_escopo?.colunas.push({ tabela: 'sonda_por_titular', coluna: vinculo[0] })
    expect(mudouOArtefato(novaArt), 'controle 1: a mutação não mudou o artefato').toBe(true)
    expect(mudouOCatalogo(novaCat), 'controle 1: a mutação não mudou o catálogo').toBe(true)
    expect(lacunasPorTabela(frase, novaArt, novaCat, yamlTexto).semVeredito).toEqual(['sonda_por_titular'])

    // 2. vereditos retirados: toda tabela da classe com vínculo fica sem veredito
    const semVereditos: Readonly<Record<string, { decisao: string; marcador: string }>> = {}
    expect(Object.keys(VEREDITO_POR_TABELA), 'controle 2: retirar os vereditos não mudou nada').not.toEqual(Object.keys(semVereditos))
    expect(lacunasPorTabela(frase, EXPORT_ALLOWLIST, catalogoReal, yamlTexto, semVereditos).semVeredito).toEqual(
      Object.keys(VEREDITO_POR_TABELA).sort(),
    )

    // 3. a frase real sem o marcador do veredito-alvo (todas as ocorrências)
    const semMarcador = frase.split(VEREDITO_POR_TABELA[alvo].marcador).join('')
    expect(semMarcador, 'controle 3: a mutação não mudou a frase').not.toBe(frase)
    expect(lacunasPorTabela(semMarcador, EXPORT_ALLOWLIST, catalogoReal, yamlTexto).marcadorAusente).toEqual([alvo])

    // 4. a tabela-alvo ENTREGUE (saiu de `excluidas`): o veredito fica órfão
    const entregue = clonarArtefato()
    delete entregue.excluidas[alvo]
    expect(mudouOArtefato(entregue), 'controle 4: a mutação não mudou o artefato').toBe(true)
    expect(lacunasPorTabela(frase, entregue, catalogoReal, yamlTexto).vereditoOrfao).toEqual([alvo])

    // 5. tabela genérica nova SEM NENHUMA coluna medida: a cobertura falha fechada
    const naoMedida = clonarArtefato()
    naoMedida.excluidas.sonda_sem_medida = 'vocabulario_do_sistema'
    expect(mudouOArtefato(naoMedida), 'controle 5: a mutação não mudou o artefato').toBe(true)
    expect(
      [...catalogoReal.colunas, ...(catalogoReal.colunas_fora_do_escopo?.colunas ?? [])].some((c) => c.tabela === 'sonda_sem_medida'),
      'controle 5: a sonda já tem coluna medida — o controle não testaria a ausência',
    ).toBe(false)
    expect(lacunasPorTabela(frase, naoMedida, catalogoReal, yamlTexto).naoMedidas).toEqual(['sonda_sem_medida'])

    // 6. a razão do alvo apagada do YAML: as linhas de comentário contíguas acima de `  <alvo>:`
    const linhas = yamlTexto.split('\n')
    const entrada = linhas.findIndex((l) => l.startsWith(`  ${alvo}:`))
    expect(entrada, 'controle 6: a entrada do alvo não está no YAML').toBeGreaterThan(0)
    let topo = entrada
    while (topo > 0 && /^\s*#/.test(linhas[topo - 1])) topo--
    const semRazao = [...linhas.slice(0, topo), ...linhas.slice(entrada)].join('\n')
    expect(semRazao, 'controle 6: a mutação não mudou o YAML').not.toBe(yamlTexto)
    expect(lacunasPorTabela(frase, EXPORT_ALLOWLIST, catalogoReal, semRazao).semRazaoNoYaml).toEqual([alvo])

    // 7. as colunas de vínculo do alvo RENOMEADAS no catálogo (em `colunas` e no bloco): o
    // alvo sai da classe e o veredito fica órfão — o conjunto vem do catálogo, não de lista
    const renomeado = clonarCatalogo()
    let renomeadas = 0
    for (const c of [...renomeado.colunas, ...(renomeado.colunas_fora_do_escopo?.colunas ?? [])]) {
      if (c.tabela === alvo && vinculo.includes(c.coluna)) {
        c.coluna = `${c.coluna}_renomeada`
        renomeadas++
      }
    }
    expect(renomeadas, 'controle 7: nenhuma coluna de vínculo do alvo foi renomeada').toBeGreaterThan(0)
    expect(mudouOCatalogo(renomeado), 'controle 7: a mutação não mudou o catálogo').toBe(true)
    expect(lacunasPorTabela(frase, EXPORT_ALLOWLIST, renomeado, yamlTexto).vereditoOrfao).toEqual([alvo])
  })

  // ── Plano 44-20 — WR-03: a fronteira dos ARQUIVOS falha fechada (BD-22) ─────────
  // O (cr1)/(cr5) prendem a frase ao artefato DO REPOSITÓRIO — o compilado no bundle. O
  // carimbo dos arquivos vem da Edge Function IMPLANTADA (`versao_allowlist` da resposta),
  // e as duas saem por canais independentes (CLAUDE.md). Numa versão divergente, a cópia
  // não pode afirmar a fronteira de uma versão com o carimbo de outra: carrega a frase
  // neutra que manda ao canal. O rodapé e o `.json` continuam dizendo a versão recebida.
  it('(cr6) WR-03 · versão da lista da resposta diferente da do site ⇒ fronteira neutra nos dois arquivos', () => {
    const daTela = COPY_PEDIR_COPIA.oQueNaoEsta
    const neutra = COPY_ARQUIVO.naoEstaVersaoDivergente
    const secao = (texto: string) =>
      `<section><h2>${escapeHtml(COPY_ARQUIVO.naoEstaTitulo)}</h2>\n<p>${escapeHtml(texto)}</p></section>`
    const fronteiraDoJson = (r: RespostaExport) => JSON.parse(gerarJsonExport(r)).o_que_nao_esta_nesta_copia

    // 1. versão IGUAL à do site: a frase da tela, nos dois arquivos, e nenhuma neutra.
    const igual = resposta({ versao_allowlist: EXPORT_ALLOWLIST.meta.versao })
    expect(fronteiraDoJson(igual), 'versão igual: o .json tem de carregar a frase da tela').toBe(daTela)
    expect(gerarHtmlExport(igual), 'versão igual: o .html tem de carregar a frase da tela logo após o título da seção').toContain(secao(daTela))

    // 2. versão DIFERENTE: a frase neutra no mesmo lugar, e a frase da tela em lugar nenhum.
    const divergente = resposta({ versao_allowlist: '9.9.9' })
    expect(EXPORT_ALLOWLIST.meta.versao, 'a sonda de versão divergente coincide com a do site').not.toBe('9.9.9')
    expect(
      fronteiraDoJson(divergente),
      'versão divergente: o .json carrega a fronteira do bundle com o carimbo de outra versão — use fronteiraDaCopia(resposta.versao_allowlist)',
    ).not.toBe(daTela)
    expect(
      gerarHtmlExport(divergente),
      'versão divergente: o .html carrega a fronteira do bundle com o carimbo de outra versão — use fronteiraDaCopia(resposta.versao_allowlist)',
    ).not.toContain(daTela)
    expect(typeof neutra, 'COPY_ARQUIVO.naoEstaVersaoDivergente não existe').toBe('string')
    expect(neutra).not.toBe(daTela)
    expect(fronteiraDoJson(divergente)).toBe(neutra)
    expect(gerarHtmlExport(divergente)).toContain(secao(neutra))
    // O carimbo continua dizendo a versão que a resposta trouxe — nos dois arquivos.
    expect(JSON.parse(gerarJsonExport(divergente)).versao_allowlist).toBe('9.9.9')
    const htmlDivergente = gerarHtmlExport(divergente)
    expect(htmlDivergente.slice(htmlDivergente.indexOf('<footer'))).toContain('9.9.9')

    // A versão igual não carrega a neutra (o `neutra` só é conferido depois de existir).
    expect(fronteiraDoJson(igual)).not.toBe(neutra)
    expect(gerarHtmlExport(igual)).not.toContain(neutra)

    // 3. versão VAZIA e versão AUSENTE (a chave nem veio): falha fechada também.
    const vazia = resposta({ versao_allowlist: '' })
    const semVersao: Partial<RespostaExport> = { ...resposta() }
    delete semVersao.versao_allowlist
    expect('versao_allowlist' in semVersao, 'controle: a chave não saiu do objeto').toBe(false)
    for (const [nome, r] of [
      ['vazia', vazia],
      ['ausente', semVersao as RespostaExport],
    ] as const) {
      expect(fronteiraDoJson(r), `versão ${nome}: o .json tem de carregar a frase neutra`).toBe(neutra)
      expect(gerarHtmlExport(r), `versão ${nome}: o .html tem de carregar a frase neutra`).toContain(secao(neutra))
      expect(gerarHtmlExport(r), `versão ${nome}: o .html não pode carregar a frase da tela`).not.toContain(daTela)
    }

    // 4. a frase neutra em si: passa no escape sem mudar, sem nome técnico, com o canal.
    expect(escapeHtml(neutra)).toBe(neutra)
    expect(neutra).not.toMatch(/\b[a-z0-9]+_[a-z0-9_]+\b/)
    expect(neutra).toContain(CANAL_PRIVACIDADE_EMAIL)
  })

  // ── Plano 44-20 — WR-02: os parênteses POSITIVOS da frase (BD-20) ──────────────
  // Os parênteses «(… entra)»/«(… entram)» afirmam o que ENTRA na cópia. O (cr1) só
  // confere que cada família retida tem marcador; um veto futuro de `retencao_hold.motivo`
  // com razão BD-10 cairia numa família que já tem marcador, e a frase continuaria
  // prometendo um campo que a cópia não traz — a «cópia mais generosa que a promessa» pelo
  // outro lado (docblock de `oQueEsta`). O (cr4) DERIVA da frase todo parêntese positivo e o
  // prende às colunas que o artefato exporta.

  /**
   * Parêntese positivo (com os parênteses) → a tabela e as colunas que ele afirma que entram.
   *
   * ⚠ ESCOPO DELIBERADO, não fotografia: cada entrada é uma afirmação da frase sobre o que
   * ENTRA na cópia. Mudar uma entrada é mudar a frase pela 44-UI-SPEC (linha «O que não está
   * na cópia») — nunca o contrário. As CHAVES são conferidas por IGUALDADE DE CONJUNTOS com
   * os parênteses DERIVADOS da frase (`parentesesDaFrase`), nos dois sentidos: um parêntese
   * novo sem entrada reprova (`semEntrada`), e uma entrada cujo parêntese saiu da frase
   * também (`entradaOrfa`). Nunca um pulo silencioso quando um trecho some da frase — esse
   * era o defeito do conserto sugerido na revisão (44-REVIEW §WR-02). Ordem das entradas: a
   * da frase.
   */
  const PARENTESES_QUE_ENTRAM: Readonly<Record<string, { tabela: string; colunas: readonly string[] }>> = {
    '(o motivo e as datas entram)': { tabela: 'retencao_hold', colunas: ['motivo', 'criado_em', 'liberado_em'] },
    '(o andamento e as datas do pedido entram)': {
      tabela: 'solicitacoes_dados',
      colunas: ['situacao', 'solicitado_em', 'atendido_em'],
    },
    '(a decisão em si entra)': { tabela: 'decisao_final', colunas: ['decisao'] },
  }

  /** Forma ESTRUTURAL do artefato para os parênteses — aceita `EXPORT_ALLOWLIST` e clones. */
  type ArtefatoEntregue = {
    tabelas: Record<string, { colunas?: ReadonlyArray<string>; colunas_excluidas?: Record<string, string> }>
  }

  /**
   * Todo trecho entre parênteses, SEM parêntese interno, que termina em « entra» ou
   * « entram» — com os parênteses, sem repetição, ORDENADO. Pura.
   */
  function parentesesDaFrase(frase: string): string[] {
    return [...new Set(frase.match(/\([^()]* entram?\)/g) ?? [])].sort()
  }

  type LacunasDosParenteses = {
    /** os parênteses positivos derivados da frase (para a sanidade e para o SUMMARY) */
    parenteses: string[]
    /** parêntese da frase sem chave no mapa */
    semEntrada: string[]
    /** chave do mapa cujo parêntese não está na frase */
    entradaOrfa: string[]
    /** tabela de uma entrada que não está em `artefato.tabelas` */
    tabelaAusente: string[]
    /** `tabela.coluna` de uma entrada que não está em `colunas`, ou está em `colunas_excluidas` */
    colunaNaoEntregue: string[]
  }

  /**
   * Tudo o que separa os parênteses positivos da frase das colunas que o artefato exporta,
   * em listas ORDENADAS (o vermelho nomeia o parêntese, a tabela ou `tabela.coluna`). Pura;
   * `mapa` é parâmetro para os controles do (cr4b). Uma entrada cuja tabela saiu do artefato
   * é nomeada só em `tabelaAusente` — as colunas dela não são listadas de novo.
   */
  function lacunasDosParenteses(
    frase: string,
    artefato: ArtefatoEntregue,
    mapa: Readonly<Record<string, { tabela: string; colunas: readonly string[] }>> = PARENTESES_QUE_ENTRAM,
  ): LacunasDosParenteses {
    const parenteses = parentesesDaFrase(frase)
    const chaves = Object.keys(mapa).sort()
    const tabelaAusente = new Set<string>()
    const colunaNaoEntregue = new Set<string>()
    for (const { tabela, colunas } of Object.values(mapa)) {
      const def = artefato.tabelas[tabela]
      if (def === undefined) {
        tabelaAusente.add(tabela)
        continue
      }
      for (const coluna of colunas) {
        const exportada = (def.colunas ?? []).includes(coluna)
        const vetada = Object.prototype.hasOwnProperty.call(def.colunas_excluidas ?? {}, coluna)
        if (!exportada || vetada) colunaNaoEntregue.add(`${tabela}.${coluna}`)
      }
    }
    return {
      parenteses,
      semEntrada: parenteses.filter((p) => !chaves.includes(p)),
      entradaOrfa: chaves.filter((p) => !parenteses.includes(p)),
      tabelaAusente: [...tabelaAusente].sort(),
      colunaNaoEntregue: [...colunaNaoEntregue].sort(),
    }
  }

  it('(cr4) WR-02 · todo parêntese «… entra(m)» da frase está preso a colunas que o artefato exporta', () => {
    const l = lacunasDosParenteses(COPY_PEDIR_COPIA.oQueNaoEsta, EXPORT_ALLOWLIST)

    // Sanidade (população vazia mente): sem parêntese derivado, as listas abaixo ficariam
    // vazias pelo motivo errado — a derivação não estaria lendo a frase.
    expect(l.parenteses.length, 'nenhum parêntese «… entra(m)» derivado da frase — a derivação não está lendo a frase').toBeGreaterThan(0)

    expect
      .soft(
        l.semEntrada,
        'parêntese positivo da frase sem entrada em PARENTESES_QUE_ENTRAM — registre a tabela e as colunas que ele afirma que entram (a frase muda pela 44-UI-SPEC)',
      )
      .toEqual([])
    expect
      .soft(
        l.entradaOrfa,
        'entrada órfã em PARENTESES_QUE_ENTRAM — o parêntese saiu da frase; tire a entrada',
      )
      .toEqual([])
    expect
      .soft(
        l.tabelaAusente,
        'a frase promete que entra algo de uma tabela que não está no artefato — reescreva o parêntese pela 44-UI-SPEC',
      )
      .toEqual([])
    expect
      .soft(
        l.colunaNaoEntregue,
        'a frase promete uma coluna que a cópia não traz (fora de `colunas` ou vetada em `colunas_excluidas`) — reescreva o parêntese pela 44-UI-SPEC',
      )
      .toEqual([])
  })

  // Os controles negativos PERMANENTES do portão dos parênteses (CLAUDE.md §Portões). Cada
  // mutação parte da frase ou do artefato REAIS e, antes da mordida, prova que mudou algo.
  // Os alvos vêm do mapa (primeira e última entrada, na ordem da frase), nunca por nome.
  it('(cr4b) WR-02 · o portão dos parênteses morde: coluna vetada, parêntese novo, entrada órfã e tabela que saiu do artefato reprovam', () => {
    const frase = COPY_PEDIR_COPIA.oQueNaoEsta
    const clonar = (): ArtefatoEntregue => structuredClone(EXPORT_ALLOWLIST) as ArtefatoEntregue
    const mudouOArtefato = (a: ArtefatoEntregue) => JSON.stringify(a) !== JSON.stringify(EXPORT_ALLOWLIST)

    // Ponto de partida: o portão real está verde (senão as mordidas não distinguiriam nada).
    const real = lacunasDosParenteses(frase, EXPORT_ALLOWLIST)
    expect(real.parenteses.length, 'nenhum parêntese derivado — os controles testariam o vazio').toBeGreaterThan(0)
    expect([...real.semEntrada, ...real.entradaOrfa, ...real.tabelaAusente, ...real.colunaNaoEntregue]).toEqual([])
    const entradas = Object.entries(PARENTESES_QUE_ENTRAM)
    expect(entradas.length, 'PARENTESES_QUE_ENTRAM vazio — os controles não teriam alvo').toBeGreaterThan(0)
    const [, primeira] = entradas[0]
    const [ultimoParentese, ultima] = entradas[entradas.length - 1]

    // 1. a primeira coluna da primeira entrada VETADA: sai de `colunas`, entra em `colunas_excluidas`
    const coluna = primeira.colunas[0]
    const vetada = clonar()
    const def = vetada.tabelas[primeira.tabela]
    def.colunas = (def.colunas ?? []).filter((c) => c !== coluna)
    def.colunas_excluidas = { ...def.colunas_excluidas, [coluna]: 'decisoes_por_coluna: BD-99 — sonda' }
    expect(mudouOArtefato(vetada), 'controle 1: a mutação não mudou o artefato').toBe(true)
    expect(lacunasDosParenteses(frase, vetada).colunaNaoEntregue).toEqual([`${primeira.tabela}.${coluna}`])

    // 2. um parêntese positivo NOVO na frase, sem entrada no mapa
    const novo = '(o texto entra)'
    const comNovo = `${frase} ${novo}`
    expect(parentesesDaFrase(comNovo), 'controle 2: a derivação não viu o parêntese novo').toContain(novo)
    expect(lacunasDosParenteses(comNovo, EXPORT_ALLOWLIST).semEntrada).toEqual([novo])

    // 3. a frase sem o parêntese da última entrada: a entrada fica órfã
    const semParentese = frase.split(ultimoParentese).join('')
    expect(semParentese, 'controle 3: a mutação não mudou a frase').not.toBe(frase)
    expect(lacunasDosParenteses(semParentese, EXPORT_ALLOWLIST).entradaOrfa).toEqual([ultimoParentese])

    // 4. a tabela da última entrada SAIU do artefato
    const semTabela = clonar()
    delete semTabela.tabelas[ultima.tabela]
    expect(mudouOArtefato(semTabela), 'controle 4: a mutação não mudou o artefato').toBe(true)
    expect(lacunasDosParenteses(frase, semTabela).tabelaAusente).toEqual([ultima.tabela])
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

  it('(ag) `nomesArquivosExport` lê o relógio UMA vez — inclusive no fallback', () => {
    // A função existe para que os DOIS nomes saiam do MESMO instante. No caminho
    // degradado (`gerado_em` ilegível) isso deixava de valer: o fallback morava
    // dentro de `nomeArquivoExport`, que é chamada duas vezes, e eram duas
    // leituras independentes do relógio. Na virada de dia em UTC os dois arquivos
    // saíam com datas diferentes — e o texto de sucesso, gerado de uma TERCEIRA
    // invocação, podia nomear arquivo que ninguém escreveu.
    const RelogioReal = globalThis.Date
    let leiturasSemArgumento = 0
    class DateEspiao extends RelogioReal {
      constructor(valor?: string | number | Date) {
        if (valor === undefined) {
          leiturasSemArgumento += 1
          // Cada leitura devolve um DIA diferente: havendo duas, os nomes divergem.
          super(RelogioReal.UTC(2026, 7, 3 + leiturasSemArgumento))
        } else {
          super(valor)
        }
      }
    }
    vi.stubGlobal('Date', DateEspiao)
    try {
      const nomes = nomesArquivosExport({ ...resposta(), gerado_em: 'não é uma data' })
      expect(leiturasSemArgumento, 'o relógio foi lido mais de uma vez').toBeLessThanOrEqual(1)
      // E a consequência observável: os dois nomes carregam o MESMO dia.
      expect(nomes.json.replace(/\.json$/, '')).toBe(nomes.html.replace(/\.html$/, ''))
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('(af2) o serviço não importa da camada de COMPONENTES', () => {
    // A direção de camada do projeto (CLAUDE.md §File Structure) é
    // components → services, nunca o contrário. Um import de componente aqui
    // arrasta React, `lucide-react` e os primitivos glass para o grafo de um
    // módulo cujo docblock anuncia `gerarJsonExport`/`gerarHtmlExport` como PUROS
    // e sem DOM — e é esse corte que os torna testáveis sem simular um clique.
    const relativo = '../exportacaoService.ts'
    const fonte = readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
    const alvo = ["from '", '../components/'].join('')
    expect(fonte.includes(alvo), 'o serviço voltou a importar de `components/`').toBe(false)
    expect(`x${alvo}y`).toContain(alvo) // META-TEST
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
