/**
 * ⛔ 52-23 / JORN-53 (D-13, D-14, D-40) — os helpers puros do contato no cabeçalho do hub.
 *
 * Três riscos, cada um com caso próprio:
 *  - o `mailto:` montado de um e-mail gravado com `?`/`&` injetaria cabeçalho (`?bcc=…`, T-52-24);
 *  - um celular fora do formato viraria um link quebrado do WhatsApp (Invariante 7);
 *  - um registro fictício/anonimizado (`@invalido.local`, qualquer caixa, com espaço) viraria
 *    contato se uma EF antiga no ar devolvesse o e-mail marcado (defesa em profundidade, D-40).
 *
 * O módulo é carregado por `import()` com `catch`: no RED ele ainda não existe, e a falha tem de
 * ser de ASSERÇÃO (função ausente), não de carga do arquivo.
 */
import { describe, it, expect } from 'vitest'

type Contato = { email: string | null; celular: string | null }
type Lib = {
  contatoUtilizavel?: (c: Contato | null) => Contato | null
  normalizarCelularWhatsApp?: (c: string | null | undefined) => string | null
  montarLinkWhatsApp?: (numero: string, msg: string) => string
  montarMailto?: (email: string, assunto: string) => string | null
  formatarCelular?: (c: string) => string
  primeiroNome?: (nome: string | null | undefined) => string | null
  assuntoEmail?: (vaga: string | null | undefined) => string
  mensagemWhatsApp?: (primeiroNome: string | null, vaga: string | null | undefined) => string
}

async function carregar(): Promise<Lib> {
  // Especificador em variável: o import-analysis do Vite não o resolve na transformação (um
  // literal reprovaria a COLETA do arquivo no RED — falha de carga, não de asserção).
  const especificador = '../contato'
  const mod = (await import(/* @vite-ignore */ especificador).catch(() => null)) as Lib | null
  return mod ?? {}
}

async function fn<K extends keyof Lib>(nome: K): Promise<NonNullable<Lib[K]>> {
  const lib = await carregar()
  expect(typeof lib[nome], `${String(nome)} não é exportada de lib/contato`).toBe('function')
  return lib[nome] as NonNullable<Lib[K]>
}

describe('normalizarCelularWhatsApp — a regra da UI-SPEC num lugar só (D-13)', () => {
  it.each([
    ['(11) 98765-4321', '5511987654321'],
    ['11987654321', '5511987654321'],
    ['1133334444', '551133334444'],
    ['(11) 3333-4444', '551133334444'],
    ['5511987654321', '5511987654321'],
    ['551133334444', '551133334444'],
    ['+55 (11) 98765-4321', '5511987654321'],
  ])('%s → %s', async (entrada, esperado) => {
    const f = await fn('normalizarCelularWhatsApp')
    expect(f(entrada)).toBe(esperado)
  })

  it.each([
    ['(00) 00000-0000'],
    ['0119876543'],
    [''],
    ['123'],
    ['11 9876'],
    ['559876'],
    ['55119876543210'],
  ])('%s → null (inválido)', async (entrada) => {
    const f = await fn('normalizarCelularWhatsApp')
    expect(f(entrada)).toBeNull()
  })

  it('null e undefined → null', async () => {
    const f = await fn('normalizarCelularWhatsApp')
    expect(f(null)).toBeNull()
    expect(f(undefined)).toBeNull()
  })
})

describe('montarMailto — só de endereço validado; assunto codificado (D-14, T-52-24)', () => {
  it('endereço válido → mailto: com subject codificado', async () => {
    const f = await fn('montarMailto')
    expect(f('a@b.com', 'Beauty Smile — x')).toBe(
      `mailto:a@b.com?subject=${encodeURIComponent('Beauty Smile — x')}`,
    )
  })

  it.each([
    ['a@b.com?bcc=x@y.com'],
    ['a@b.com&bcc=x@y.com'],
    ['a@b.com#x'],
    ['sem-arroba'],
    ['a b@c.com'],
    ['a@b'],
    [''],
  ])('%s → null (injeção ou endereço inválido)', async (email) => {
    const f = await fn('montarMailto')
    expect(f(email, 'Beauty Smile — x')).toBeNull()
  })
})

describe('montarLinkWhatsApp — wa.me com a mensagem codificada (D-13)', () => {
  it('monta https://wa.me/{numero}?text={mensagem codificada}', async () => {
    const f = await fn('montarLinkWhatsApp')
    const msg = 'Olá, Fulana! Aqui é da Beauty Smile, sobre a sua candidatura para Recepcionista.'
    expect(f('5511987654321', msg)).toBe(
      `https://wa.me/5511987654321?text=${encodeURIComponent(msg)}`,
    )
  })
})

describe('contatoUtilizavel — registro fictício/anonimizado não tem contato (D-40, JORN-53)', () => {
  it('null → null', async () => {
    const f = await fn('contatoUtilizavel')
    expect(f(null)).toBeNull()
  })

  it.each([
    ['x@invalido.local'],
    [' X@INVALIDO.LOCAL '],
    ['anonimizado+00000000-0000-0000-0000-000000000000@Invalido.Local'],
  ])('e-mail %s com celular válido → null', async (email) => {
    const f = await fn('contatoUtilizavel')
    expect(f({ email, celular: '11987654321' })).toBeNull()
  })

  it('contato real → o mesmo objeto', async () => {
    const f = await fn('contatoUtilizavel')
    const c = { email: 'a@b.com', celular: '11987654321' }
    expect(f(c)).toBe(c)
  })

  it('sem e-mail não é registro fictício → o mesmo objeto', async () => {
    const f = await fn('contatoUtilizavel')
    const c = { email: null, celular: '11987654321' }
    expect(f(c)).toBe(c)
  })
})

describe('formatarCelular — (11) 98765-4321 / (11) 3333-4444; outro → cru', () => {
  it.each([
    ['11987654321', '(11) 98765-4321'],
    ['(11) 98765-4321', '(11) 98765-4321'],
    ['1133334444', '(11) 3333-4444'],
    ['0119876', '0119876'],
    ['+55 11 98765-4321', '+55 11 98765-4321'],
  ])('%s → %s', async (entrada, esperado) => {
    const f = await fn('formatarCelular')
    expect(f(entrada)).toBe(esperado)
  })
})

describe('frases do contato — com e sem vaga (D-13, D-14, UI-SPEC §Copy)', () => {
  it('primeiroNome: primeiro token, como gravado', async () => {
    const f = await fn('primeiroNome')
    expect(f('Fulana de Teste')).toBe('Fulana')
    expect(f('  maria  clara ')).toBe('maria')
    expect(f('')).toBeNull()
    expect(f(null)).toBeNull()
  })

  it('assuntoEmail com e sem vaga', async () => {
    const f = await fn('assuntoEmail')
    expect(f('Recepcionista')).toBe('Beauty Smile — sua candidatura para Recepcionista')
    expect(f(null)).toBe('Beauty Smile — sua candidatura')
    expect(f('   ')).toBe('Beauty Smile — sua candidatura')
  })

  it('mensagemWhatsApp com e sem vaga', async () => {
    const f = await fn('mensagemWhatsApp')
    expect(f('Fulana', 'Recepcionista')).toBe(
      'Olá, Fulana! Aqui é da Beauty Smile, sobre a sua candidatura para Recepcionista.',
    )
    expect(f('Fulana', null)).toBe('Olá, Fulana! Aqui é da Beauty Smile, sobre a sua candidatura.')
  })
})
