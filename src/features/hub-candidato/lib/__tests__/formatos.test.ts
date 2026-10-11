/**
 * ⛔ 52-10 / JORN-54 (D-08, D-09, D-52-U18) — os formatos da ficha «Dados do cadastro».
 *
 * Funções puras: CPF `000.000.000-00`, CEP `00000-000`, data `dd/MM/yyyy`, idade na data de hoje
 * no fuso `America/Sao_Paulo` («(1 ano)» no singular), e os mapas de rótulo aplicados sobre
 * `toLowerCase()` (F12: valores vivos em caixa mista). Valor fora de formato → como veio.
 *
 * O módulo é carregado por `import()` com especificador em variável: no RED ele ainda não existe,
 * e a falha tem de ser de ASSERÇÃO (função ausente), não de carga do arquivo.
 */
import { describe, it, expect } from 'vitest'

type Mod = {
  formatarCpf?: (v: string) => string
  formatarCep?: (v: string) => string
  formatarDataBr?: (v: string) => string
  idadeEm?: (dataIso: string, hoje: Date) => number | null
  formatarNascimento?: (dataIso: string, hoje: Date) => string
  inicioDisponibilidade?: (imediata: boolean | null, data: string | null) => string | null
  rotuloGenero?: (v: string) => string
  rotuloComoConheceu?: (v: string) => string
  rotuloTurno?: (v: string) => string
  rotuloModeloTrabalho?: (v: string) => string
  ROTULO_GENERO?: Record<string, string>
  ROTULO_COMO_CONHECEU?: Record<string, string>
  ROTULO_TURNO?: Record<string, string>
  ROTULO_MODELO_TRABALHO?: Record<string, string>
}

async function carregar(): Promise<Mod> {
  const especificador = '../formatos'
  return ((await import(/* @vite-ignore */ especificador).catch(() => null)) as Mod | null) ?? {}
}

/** 2026-10-10 ao meio-dia em São Paulo. */
const HOJE = new Date('2026-10-10T15:00:00Z')

describe('formatos — CPF e CEP (52-10 / D-08)', () => {
  it("formatarCpf('12345678901') → '123.456.789-01'", async () => {
    const { formatarCpf } = await carregar()
    expect(formatarCpf, 'formatarCpf não existe').toBeTypeOf('function')
    expect(formatarCpf!('12345678901')).toBe('123.456.789-01')
  })

  it('CPF já mascarado continua no formato; fora de 11 dígitos → como veio', async () => {
    const { formatarCpf } = await carregar()
    expect(formatarCpf, 'formatarCpf não existe').toBeTypeOf('function')
    expect(formatarCpf!('123.456.789-01')).toBe('123.456.789-01')
    expect(formatarCpf!('1234')).toBe('1234')
  })

  it("formatarCep('01310100') → '01310-100'; fora de 8 dígitos → como veio", async () => {
    const { formatarCep } = await carregar()
    expect(formatarCep, 'formatarCep não existe').toBeTypeOf('function')
    expect(formatarCep!('01310100')).toBe('01310-100')
    expect(formatarCep!('01310-100')).toBe('01310-100')
    expect(formatarCep!('0131')).toBe('0131')
  })
})

describe('formatos — data e idade (52-10 / D-09)', () => {
  it("formatarDataBr('1994-03-12') → '12/03/1994'; fora de formato → como veio", async () => {
    const { formatarDataBr } = await carregar()
    expect(formatarDataBr, 'formatarDataBr não existe').toBeTypeOf('function')
    expect(formatarDataBr!('1994-03-12')).toBe('12/03/1994')
    expect(formatarDataBr!('2026-11-02T00:00:00+00:00')).toBe('02/11/2026')
    expect(formatarDataBr!('12 de março')).toBe('12 de março')
  })

  it('idadeEm(1994-03-12, hoje 2026-10-10) = 32', async () => {
    const { idadeEm } = await carregar()
    expect(idadeEm, 'idadeEm não existe').toBeTypeOf('function')
    expect(idadeEm!('1994-03-12', HOJE)).toBe(32)
  })

  it('idade no fuso America/Sao_Paulo: 02:00 UTC de 11/10 ainda é 10/10 em São Paulo', async () => {
    const { idadeEm } = await carregar()
    expect(idadeEm, 'idadeEm não existe').toBeTypeOf('function')
    // Aniversário 11/10: em UTC já seria o dia (32), em São Paulo ainda não (31).
    expect(idadeEm!('1994-10-11', new Date('2026-10-11T02:00:00Z'))).toBe(31)
    expect(idadeEm!('1994-10-11', new Date('2026-10-11T04:00:00Z'))).toBe(32)
  })

  it('formatarNascimento: «12/03/1994 (32 anos)»', async () => {
    const { formatarNascimento } = await carregar()
    expect(formatarNascimento, 'formatarNascimento não existe').toBeTypeOf('function')
    expect(formatarNascimento!('1994-03-12', HOJE)).toBe('12/03/1994 (32 anos)')
  })

  it('formatarNascimento: 0 anos → «(0 anos)»; 1 ano → «(1 ano)» no singular', async () => {
    const { formatarNascimento } = await carregar()
    expect(formatarNascimento, 'formatarNascimento não existe').toBeTypeOf('function')
    expect(formatarNascimento!('2025-10-11', HOJE)).toMatch(/\(0 anos\)$/)
    expect(formatarNascimento!('2025-10-10', HOJE)).toBe('10/10/2025 (1 ano)')
    expect(formatarNascimento!('2024-10-10', HOJE)).toBe('10/10/2024 (2 anos)')
  })

  it('formatarNascimento: data fora de formato → como veio, sem idade', async () => {
    const { formatarNascimento } = await carregar()
    expect(formatarNascimento, 'formatarNascimento não existe').toBeTypeOf('function')
    expect(formatarNascimento!('março de 1994', HOJE)).toBe('março de 1994')
  })
})

describe('formatos — mapas de rótulo sobre lower(valor) (52-10 / D-52-U18, F12)', () => {
  it('gênero: mapa da UI-SPEC; desconhecido → como veio', async () => {
    const { rotuloGenero } = await carregar()
    expect(rotuloGenero, 'rotuloGenero não existe').toBeTypeOf('function')
    expect(rotuloGenero!('masculino')).toBe('Masculino')
    expect(rotuloGenero!('Feminino')).toBe('Feminino')
    expect(rotuloGenero!('outro')).toBe('Outro')
    expect(rotuloGenero!('prefiro_nao_informar')).toBe('Prefiro não informar')
    expect(rotuloGenero!('nao_binario')).toBe('nao_binario')
  })

  it('como conheceu: os nove valores do CHECK do banco', async () => {
    const { rotuloComoConheceu } = await carregar()
    expect(rotuloComoConheceu, 'rotuloComoConheceu não existe').toBeTypeOf('function')
    const esperado: Record<string, string> = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      linkedin: 'LinkedIn',
      indicacao: 'Indicação',
      google: 'Google',
      catho: 'Catho',
      vagas_com: 'Vagas.com',
      solides: 'Solides',
      outro: 'Outro',
    }
    for (const [v, r] of Object.entries(esperado)) expect(rotuloComoConheceu!(v)).toBe(r)
    expect(rotuloComoConheceu!('jornal')).toBe('jornal')
  })

  it('turno e modelo de trabalho em caixa mista (valores vivos de PROD)', async () => {
    const { rotuloTurno, rotuloModeloTrabalho } = await carregar()
    expect(rotuloTurno, 'rotuloTurno não existe').toBeTypeOf('function')
    expect(rotuloModeloTrabalho, 'rotuloModeloTrabalho não existe').toBeTypeOf('function')
    expect(rotuloTurno!('Integral')).toBe('Integral')
    expect(rotuloTurno!('manha')).toBe('Manhã')
    expect(rotuloTurno!('TARDE')).toBe('Tarde')
    expect(rotuloTurno!('noite')).toBe('Noite')
    expect(rotuloTurno!('madrugada')).toBe('madrugada')
    expect(rotuloModeloTrabalho!('presencial')).toBe('Presencial')
    expect(rotuloModeloTrabalho!('Presencial')).toBe('Presencial')
    expect(rotuloModeloTrabalho!('remoto')).toBe('Remoto')
    expect(rotuloModeloTrabalho!('hibrido')).toBe('Híbrido')
    expect(rotuloModeloTrabalho!('Flexível')).toBe('Flexível')
  })

  it('inicioDisponibilidade: imediata → «Imediato»; senão a data dd/MM/yyyy; nada → null', async () => {
    const { inicioDisponibilidade } = await carregar()
    expect(inicioDisponibilidade, 'inicioDisponibilidade não existe').toBeTypeOf('function')
    expect(inicioDisponibilidade!(true, '2026-11-02')).toBe('Imediato')
    expect(inicioDisponibilidade!(false, '2026-11-02')).toBe('02/11/2026')
    expect(inicioDisponibilidade!(null, '2026-11-02')).toBe('02/11/2026')
    expect(inicioDisponibilidade!(false, null)).toBeNull()
    expect(inicioDisponibilidade!(null, null)).toBeNull()
  })
})
