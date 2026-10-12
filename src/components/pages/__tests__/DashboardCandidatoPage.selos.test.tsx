/**
 * 52-28 (G-52-6 · JORN-59 · JORN-62) — todo selo de status do painel do candidato tem fundo OPACO e
 * texto com contraste ≥ 4,5:1 contra ele (decisão do operador «Todos os selos», 2026-10-12,
 * `52-UAT.md`).
 *
 * Por quê: no UAT da 52 o selo «Rejeitado» (vermelho claro sobre vermelho translúcido) media
 * 1,3–3,6:1 sobre o vidro branco do painel, e os irmãos do mesmo mapa tinham o mesmo defeito. Um
 * fundo translúcido deixa o contraste depender do pixel que está atrás (o fundo do painel é fixo e
 * muda com a rolagem); o fundo opaco não depende.
 *
 * A GUARDA LÊ PELA FORMA, não por lista: todo objeto literal do `DashboardCandidatoPage.tsx` com
 * `icon:` e `label:` é um descritor de selo (o `getStatusInfo` e o `SELO_AGUARDANDO_EQUIPE`), e um
 * selo novo entra na vigilância sem ninguém lembrar de acrescentá-lo. O contraste é calculado pela
 * MESMA `contrasteDeClasses` do medidor `scripts/p52_contraste.cjs`.
 *
 * E A GUARDA MORDE, um predicado de cada vez: cada mordida altera SÓ o descritor do «Rejeitado»
 * numa cópia do fonte, passa a cópia pelo MESMO `julgarSelos` que vigia o fonte real (um juiz
 * reescrito para a mordida não provaria nada), confere que a cópia mudou (senão a mordida é vácua)
 * e que só o predicado visado reprovou.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const requireDoTeste = createRequire(import.meta.url)
const { contrasteDeClasses } = requireDoTeste('../../../../scripts/p52_contraste.cjs') as {
  contrasteDeClasses: (texto: string, fundo: string) => number
}
const FONTE = readFileSync(requireDoTeste.resolve('../DashboardCandidatoPage.tsx'), 'utf8')

const ALVO = 4.5
const PREFIXOS = [
  'SELO SEM COR/FUNDO',
  'FUNDO TRANSLUCIDO',
  'CONTRASTE ABAIXO',
  'CLASSE DESCONHECIDA',
  'POPULACAO',
] as const
type Prefixo = (typeof PREFIXOS)[number]

interface Descritor {
  inicio: number
  fim: number
  texto: string
  label: string
}

/** Todo objeto literal sem chaves aninhadas que tenha `icon:` e `label:` — a forma de um selo. */
function descritores(texto: string): Descritor[] {
  const achados: Descritor[] = []
  const re = /\{[^{}]*\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) {
    const corpo = m[0]
    if (!/\bicon\s*:/.test(corpo) || !/\blabel\s*:/.test(corpo)) continue
    const label = (/\blabel\s*:\s*([^,}\n]+)/.exec(corpo)?.[1] ?? '').trim()
    achados.push({ inicio: m.index, fim: m.index + corpo.length, texto: corpo, label })
  }
  return achados
}

/** O JUIZ — o mesmo sobre o fonte real e sobre cada cópia mutada. Devolve as falhas. */
function julgarSelos(texto: string): string[] {
  const falhas: string[] = []
  const lista = descritores(texto)
  for (const d of lista) {
    const color = /\bcolor\s*:\s*'([^']*)'/.exec(d.texto)?.[1]
    const bg = /\bbg\s*:\s*'([^']*)'/.exec(d.texto)?.[1]
    if (!color || !bg) {
      falhas.push(`SELO SEM COR/FUNDO: ${d.label} color=${color ?? '∅'} bg=${bg ?? '∅'}`)
      continue
    }
    // Opaco: família e tom, sem `/NN` e sem valor arbitrário — o contraste nem é calculado.
    if (!/^bg-[a-z]+-[0-9]{2,3}$/.test(bg)) {
      falhas.push(`FUNDO TRANSLUCIDO: ${d.label} ${bg}`)
      continue
    }
    let c: number
    try {
      c = contrasteDeClasses(color, bg)
    } catch (e) {
      falhas.push(`CLASSE DESCONHECIDA: ${d.label} ${String((e as Error).message)}`)
      continue
    }
    if (c < ALVO) falhas.push(`CONTRASTE ABAIXO: ${d.label} ${color} sobre ${bg} = ${c.toFixed(2)}`)
  }
  if (lista.length === 0) falhas.push('POPULACAO: nenhum descritor de selo no fonte')
  if (!lista.some((d) => d.label === "'Rejeitado'")) falhas.push("POPULACAO: falta o selo 'Rejeitado'")
  if (!lista.some((d) => d.label === 'COPY_PAINEL_AVALIACOES.selo')) {
    falhas.push('POPULACAO: falta o selo COPY_PAINEL_AVALIACOES.selo')
  }
  return falhas
}

const prefixosEm = (falhas: string[]): Set<Prefixo> =>
  new Set(PREFIXOS.filter((p) => falhas.some((f) => f.startsWith(`${p}:`))))

/** Uma cópia do fonte com SÓ o descritor do «Rejeitado» alterado. */
function mutarRejeitado(texto: string, mutar: (descritor: string) => string): string {
  const alvos = descritores(texto).filter((d) => d.label === "'Rejeitado'")
  expect(alvos, 'exatamente um descritor do «Rejeitado» no fonte').toHaveLength(1)
  const [d] = alvos
  return texto.slice(0, d.inicio) + mutar(d.texto) + texto.slice(d.fim)
}

describe('selos do painel do candidato — fundo opaco e contraste ≥ 4,5 (G-52-6)', () => {
  it('fonte real: todo descritor de selo é opaco e legível (lista de falhas vazia)', () => {
    expect(descritores(FONTE).length).toBeGreaterThan(0)
    // Numa linha só: a lista vira texto para o relatório (TAP) do Vitest não quebrar.
    expect(julgarSelos(FONTE).join(' | ')).toBe('')
  })

  it('o ícone e o rótulo do selo usam a MESMA cor do descritor (nunca só cor: ícone + palavra)', () => {
    expect(FONTE).toContain('<StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />')
    expect(FONTE).toMatch(/<span className=\{`[^`]*\$\{statusInfo\.color\}`\}>\s*\{statusInfo\.label\}/)
  })

  const MORDIDAS: Array<{ nome: string; prefixo: Prefixo; mutar: (d: string) => string }> = [
    {
      nome: '(m1) fundo translúcido',
      prefixo: 'FUNDO TRANSLUCIDO',
      mutar: (d) => d.replace(/\bbg\s*:\s*'[^']*'/, "bg: 'bg-red-800/40'"),
    },
    {
      // Opaco e claro: passa no regex da opacidade; só o ramo do contraste o reprova (~1,5:1).
      nome: '(m2) fundo opaco de baixo contraste',
      prefixo: 'CONTRASTE ABAIXO',
      mutar: (d) => d.replace(/\bbg\s*:\s*'[^']*'/, "bg: 'bg-red-300'"),
    },
    {
      nome: '(m3) descritor sem bg',
      prefixo: 'SELO SEM COR/FUNDO',
      mutar: (d) => d.replace(/,?\s*\bbg\s*:\s*'[^']*'/, ''),
    },
    {
      nome: '(m4) descritor sem color',
      prefixo: 'SELO SEM COR/FUNDO',
      mutar: (d) => d.replace(/,?\s*\bcolor\s*:\s*'[^']*'/, ''),
    },
    {
      nome: '(m5) rótulo «Rejeitado» renomeado',
      prefixo: 'POPULACAO',
      mutar: (d) => d.replace("label: 'Rejeitado'", "label: 'Recusado'"),
    },
  ]

  it.each(MORDIDAS)('mordida $nome → só $prefixo reprova', ({ prefixo, mutar }) => {
    const copia = mutarRejeitado(FONTE, mutar)
    // A mutação acertou o alvo — senão a mordida é vácua.
    expect(copia).not.toBe(FONTE)
    const falhas = julgarSelos(copia)
    const vistos = prefixosEm(falhas)
    expect(vistos.has(prefixo), `${prefixo} ausente em ${JSON.stringify(falhas)}`).toBe(true)
    // Cada predicado morde sozinho: nenhum OUTRO prefixo aparece.
    expect([...vistos].filter((p) => p !== prefixo).join(' | ')).toBe('')
  })
})
