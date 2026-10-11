/**
 * ⛔ 52-24 / JORN-55 (D-20, UI-SPEC Invariantes 5 e 6) — links por segmento, só `http(s)`.
 *
 * O texto livre do candidato (respostas da inscrição, LinkedIn/Instagram) vira uma lista de
 * segmentos: `string` (texto) ou `{ href }` (link). Só `http://`/`https://` viram link; qualquer
 * outro esquema (`javascript:`, `data:`, `mailto:` digitado pelo candidato) fica texto. A
 * pontuação final `.,;:)` fica FORA do link.
 *
 * O módulo é carregado por `import()` com especificador em variável: no RED ele ainda não existe,
 * e a falha tem de ser de ASSERÇÃO (função ausente), não de carga do arquivo.
 */
import { describe, it, expect } from 'vitest'

type Segmento = string | { href: string }
type Mod = { segmentosComLinks?: (texto: string) => Segmento[] }

async function fn(): Promise<(texto: string) => Segmento[]> {
  const especificador = '../linkify'
  const mod = ((await import(/* @vite-ignore */ especificador).catch(() => null)) as Mod | null) ?? {}
  expect(mod.segmentosComLinks, 'segmentosComLinks não existe').toBeTypeOf('function')
  return mod.segmentosComLinks!
}

const links = (s: Segmento[]) => s.filter((x): x is { href: string } => typeof x !== 'string')

describe('segmentosComLinks — só http(s) vira link (52-24 / D-20)', () => {
  it("'veja https://x.com/a. e javascript:alert(1)' → texto, link sem o ponto final, texto", async () => {
    const segmentosComLinks = await fn()
    expect(segmentosComLinks('veja https://x.com/a. e javascript:alert(1)')).toEqual([
      'veja ',
      { href: 'https://x.com/a' },
      '. e javascript:alert(1)',
    ])
  })

  it('javascript:, data: e mailto: nunca viram link', async () => {
    const segmentosComLinks = await fn()
    for (const t of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'mailto:fulana@exemplo.com',
      'escreva para mailto:a@b.com ou veja data:image/png;base64,AAAA',
    ]) {
      const s = segmentosComLinks(t)
      expect(links(s), t).toEqual([])
      expect(s.join(''), t).toBe(t)
    }
  })

  it('várias URLs; pontuação final .,;:) fica fora; http e https', async () => {
    const segmentosComLinks = await fn()
    expect(segmentosComLinks('(portfólio: https://a.com/x), e http://b.org/y;')).toEqual([
      '(portfólio: ',
      { href: 'https://a.com/x' },
      '), e ',
      { href: 'http://b.org/y' },
      ';',
    ])
  })

  it('URL sozinha → um link; texto sem URL → o texto inteiro; vazio → nada', async () => {
    const segmentosComLinks = await fn()
    expect(segmentosComLinks('https://behance.net/fulana')).toEqual([{ href: 'https://behance.net/fulana' }])
    expect(segmentosComLinks('www.instagram.com/x')).toEqual(['www.instagram.com/x'])
    expect(segmentosComLinks('')).toEqual([])
  })

  it('URL termina em aspas, < ou espaço — o link para ali', async () => {
    const segmentosComLinks = await fn()
    expect(segmentosComLinks('<a href="https://x.com/p">')).toEqual([
      '<a href="',
      { href: 'https://x.com/p' },
      '">',
    ])
  })

  it('só o esquema, sem endereço («https://.»), não vira link', async () => {
    const segmentosComLinks = await fn()
    expect(links(segmentosComLinks('veja https://. depois'))).toEqual([])
  })
})
