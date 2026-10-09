/**
 * ⛔ 51-03 / JORN-48 (D-16) — «Não se aplica a esta vaga» só com EVIDÊNCIA POSITIVA.
 *
 * O hub do RH troca «Sem dados nesta etapa» por «Não se aplica a esta vaga» quando a vaga não
 * aplica o instrumento. O risco é o oposto do defeito: dizer «não se aplica» porque a
 * configuração NÃO FOI LIDA, ou porque está numa forma que este código não reconhece. Isso
 * seria uma mentira plausível (memória «allowlist restritiva torna causas indistinguíveis»).
 *
 * Por isso três valores, não dois: `aplica | nao_aplica | desconhecido`. `nao_aplica` só quando
 * `testes_aplicaveis` é um array não vazio, TODAS as entradas são da convenção atual
 * (`{ teste: <id do template> }`), e nenhuma mapeia para o instrumento pelo contrato de
 * `src/lib/testes/testeContract.ts`. A convenção antiga (`{ tipo: 'sjt' }`) prova presença,
 * nunca ausência. O cognitivo segue `aplica_cognitivo` — mas só se a vaga foi carregada.
 *
 * O módulo é carregado por `import()` com `catch`: no RED ele ainda não existe, e a falha tem
 * de ser de ASSERÇÃO (função ausente), não de carga do arquivo.
 */
import { describe, it, expect } from 'vitest'

type Aplic = 'aplica' | 'nao_aplica' | 'desconhecido'
type Fn = (cfg: { aplica_cognitivo?: boolean | null; testes_aplicaveis?: unknown }) => {
  assincrona: Aplic
  redacao: Aplic
  cognitivo: Aplic
}

async function carregar(): Promise<Fn | undefined> {
  // Especificador em variável: o import-analysis do Vite não o resolve na transformação (um
  // literal reprovaria a COLETA do arquivo no RED — falha de carga, não de asserção).
  const especificador = '../instrumentosDaVaga'
  const mod = (await import(/* @vite-ignore */ especificador).catch(() => null)) as
    | Record<string, unknown>
    | null
  return mod?.instrumentosDaVaga as Fn | undefined
}

/** A forma que `cargoTemplates.baseTestes` grava hoje em toda vaga criada pelo seletor. */
const BASE_TESTES = [
  { teste: 'triagem', obrigatorio: true, customizado: false },
  { teste: 'work_sample_sjt', obrigatorio: true, customizado: false },
  { teste: 'redacao_cultural', obrigatorio: false, customizado: false },
  { teste: 'big_five', obrigatorio: false, customizado: false },
  { teste: 'cognitivo', obrigatorio: false, customizado: false },
  { teste: 'entrevista', obrigatorio: true, customizado: false },
]

describe('instrumentosDaVaga — aplicabilidade por evidência positiva (51-03 / D-16)', () => {
  it('é exportada como função', async () => {
    const f = await carregar()
    expect(typeof f).toBe('function')
  })

  it('cognitivo segue aplica_cognitivo quando a vaga foi carregada', async () => {
    const f = await carregar()
    expect(f?.({ aplica_cognitivo: false, testes_aplicaveis: BASE_TESTES }).cognitivo).toBe('nao_aplica')
    expect(f?.({ aplica_cognitivo: true, testes_aplicaveis: BASE_TESTES }).cognitivo).toBe('aplica')
  })

  it('vaga não carregada (testes_aplicaveis undefined) → tudo desconhecido, mesmo com aplica_cognitivo=false', async () => {
    const f = await carregar()
    expect(f?.({ aplica_cognitivo: false, testes_aplicaveis: undefined })).toEqual({
      assincrona: 'desconhecido',
      redacao: 'desconhecido',
      cognitivo: 'desconhecido',
    })
  })

  it('aplica_cognitivo ausente (null/undefined) com vaga carregada → cognitivo desconhecido', async () => {
    const f = await carregar()
    expect(f?.({ aplica_cognitivo: null, testes_aplicaveis: BASE_TESTES }).cognitivo).toBe('desconhecido')
    expect(f?.({ testes_aplicaveis: BASE_TESTES }).cognitivo).toBe('desconhecido')
  })

  it('convenção atual sem redação → assincrona aplica, redacao nao_aplica', async () => {
    const f = await carregar()
    const r = f?.({ aplica_cognitivo: true, testes_aplicaveis: [{ teste: 'work_sample_sjt' }, { teste: 'big_five' }] })
    expect(r).toEqual({ assincrona: 'aplica', redacao: 'nao_aplica', cognitivo: 'aplica' })
  })

  it('convenção atual só com redação → redacao aplica, assincrona nao_aplica', async () => {
    const f = await carregar()
    const r = f?.({ aplica_cognitivo: true, testes_aplicaveis: [{ teste: 'redacao_cultural' }] })
    expect(r).toEqual({ assincrona: 'nao_aplica', redacao: 'aplica', cognitivo: 'aplica' })
  })

  it('só Big Five também é avaliação assíncrona', async () => {
    const f = await carregar()
    expect(f?.({ aplica_cognitivo: true, testes_aplicaveis: [{ teste: 'big_five' }] }).assincrona).toBe('aplica')
  })

  it('entradas atuais que não são do candidato (triagem/entrevista/cognitivo) contam como reconhecidas', async () => {
    const f = await carregar()
    const r = f?.({
      aplica_cognitivo: false,
      testes_aplicaveis: [{ teste: 'triagem' }, { teste: 'entrevista' }, { teste: 'cognitivo' }],
    })
    expect(r).toEqual({ assincrona: 'nao_aplica', redacao: 'nao_aplica', cognitivo: 'nao_aplica' })
  })

  it('a forma de baseTestes (todos os instrumentos presentes) → tudo aplica, exceto o cognitivo que segue a coluna', async () => {
    const f = await carregar()
    expect(f?.({ aplica_cognitivo: false, testes_aplicaveis: BASE_TESTES })).toEqual({
      assincrona: 'aplica',
      redacao: 'aplica',
      cognitivo: 'nao_aplica',
    })
  })

  it('convenção antiga {tipo:"sjt"} → assincrona aplica, redacao desconhecido (antiga não prova ausência)', async () => {
    const f = await carregar()
    const r = f?.({ aplica_cognitivo: true, testes_aplicaveis: [{ tipo: 'sjt', cargo: 'x' }] })
    expect(r?.assincrona).toBe('aplica')
    expect(r?.redacao).toBe('desconhecido')
  })

  it('variante {teste:"sjt"} (reconhecida por ehElementoSjt) → assincrona aplica, redacao desconhecido', async () => {
    const f = await carregar()
    const r = f?.({ aplica_cognitivo: true, testes_aplicaveis: [{ teste: 'sjt' }] })
    expect(r?.assincrona).toBe('aplica')
    expect(r?.redacao).toBe('desconhecido')
  })

  it('mistura de atual com entrada não reconhecida → o que não aparece fica desconhecido', async () => {
    const f = await carregar()
    const r = f?.({ aplica_cognitivo: true, testes_aplicaveis: [{ teste: 'work_sample_sjt' }, { teste: 'xpto' }] })
    expect(r?.assincrona).toBe('aplica')
    expect(r?.redacao).toBe('desconhecido')
  })

  it.each([
    ['null', null],
    ['[]', []],
    ['objeto', { teste: 'redacao_cultural' }],
    ['só entradas não reconhecidas', [{ teste: 'xpto' }, { foo: 1 }, 'redacao_cultural', null]],
  ])('%s → assincrona e redacao desconhecido; cognitivo segue a coluna', async (_nome, testes) => {
    const f = await carregar()
    expect(f?.({ aplica_cognitivo: false, testes_aplicaveis: testes })).toEqual({
      assincrona: 'desconhecido',
      redacao: 'desconhecido',
      cognitivo: 'nao_aplica',
    })
  })
})
