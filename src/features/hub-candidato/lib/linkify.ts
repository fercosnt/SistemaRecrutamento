/**
 * linkify — texto livre do candidato em segmentos texto/link, só para `http(s)`
 * (Phase 52 / Plan 52-24; D-20; UI-SPEC Invariantes 5 e 6; T-52-27, T-52-28).
 *
 * Quem renderiza monta um nó de texto React por `string` e um `<a>` por `{ href }` — nunca
 * HTML cru injetado no DOM. Só `http://`/`https://` casam; `javascript:`, `data:`, `mailto:`
 * digitados pelo candidato nunca casam e ficam texto. A pontuação final `.,;:)` fica FORA do link
 * («veja https://x.com/a.» → o link é `https://x.com/a`). Sem dependência (a UI-SPEC recusa libs
 * de linkify).
 *
 * @module features/hub-candidato/lib/linkify
 */

export type SegmentoLink = { href: string }
export type Segmento = string | SegmentoLink

/** `http(s)://` seguido de qualquer coisa até espaço, `<`, `>` ou aspas. */
const URL_RE = /https?:\/\/[^\s<>"']+/gi
const PONTUACAO_FINAL = /[.,;:)]$/
const SO_ESQUEMA = /^https?:\/\/$/i

/**
 * Divide `texto` em segmentos: `string` (texto) e `{ href }` (link `http(s)`).
 * A concatenação dos segmentos (com `href` no lugar do link) devolve o texto original.
 * Segmentos vazios não entram.
 */
export function segmentosComLinks(texto: string): Segmento[] {
  const out: Segmento[] = []
  let i = 0
  for (const m of texto.matchAll(URL_RE)) {
    const inicio = m.index ?? 0
    let url = m[0]
    while (PONTUACAO_FINAL.test(url)) url = url.slice(0, -1)
    // Só o esquema («https://.» sem endereço) não é link: fica no texto.
    if (SO_ESQUEMA.test(url)) continue
    if (inicio > i) out.push(texto.slice(i, inicio))
    out.push({ href: url })
    i = inicio + url.length
  }
  if (i < texto.length) out.push(texto.slice(i))
  return out
}
