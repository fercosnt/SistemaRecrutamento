/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 35 / Plan 35-02 Task 2 — RED→GREEN for `AgendamentoCandidatoCard`
 * (AGEND-04 / AGEND-05). REQUIRED behavioral suite (plan-check W1): a grep cannot catch
 * an inverted boolean on the .ics/badge gating, so these assertions lock it.
 *
 * The card OWNS `useMeuAgendamento`; the hook is mocked here to drive fixed rows. The
 * real service predicates (`ehUpcomingNaoCancelada`/`estaDentroDe24h`) and the real
 * SP-formatter run — dates are relative to `Date.now()` so the ≤24h gate is deterministic
 * without fake timers.
 *
 * Load-bearing contract:
 *  (a) cancelada + FUTURE → card VISIBLE (+ cancel note) but NO .ics button, NO ≤24h badge.
 *  (b) presencial → NEVER an <a> (even when local_ou_link looks like a URL) — plain `Local: `.
 *  (c) upcoming online within 24h → .ics button + ≤24h badge + link with rel="noopener noreferrer".
 *
 * @see .planning/phases/35-.../35-UI-SPEC.md (§States Contract + §.ics & ≤24h Badge Contract)
 *
 * 52-28 / 52-30 (G-52-6 · JORN-59 · JORN-62): todo chip de status deste cartão e as duas notas
 * coloridas têm fundo OPACO e texto ≥ 4,5:1 contra ele — «Cancelada» pela decisão do operador no UAT
 * («Entra junto», 2026-10-12); os outros cinco chips, o descritor de reserva e as notas pela decisão
 * da Task 1 do 52-30 («residual_chips_agendamento: consertar agora», 2026-10-12). A GUARDA LÊ PELA
 * FORMA, como a dos selos do painel (`DashboardCandidatoPage.selos.test.tsx`): todo objeto literal
 * do fonte com `icon:` e `label:` é um descritor de chip, e um status novo entra na vigilância sem
 * ninguém lembrar de acrescentá-lo. O contraste vem da MESMA `contrasteDeClasses` do medidor
 * `scripts/p52_contraste.cjs`. As notas são lidas do DOM nos casos (a) e (d). E a guarda MORDE, um
 * predicado de cada vez, sobre cópias mutadas do fonte julgadas pelo MESMO juiz.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

// A MESMA função de contraste do medidor `scripts/p52_contraste.cjs` (nunca uma cópia da fórmula).
const requireDoTeste = createRequire(import.meta.url)
const { contrasteDeClasses } = requireDoTeste('../../../../../scripts/p52_contraste.cjs') as {
  contrasteDeClasses: (texto: string, fundo: string) => number
}
const FONTE = readFileSync(requireDoTeste.resolve('../AgendamentoCandidatoCard.tsx'), 'utf8')

const ALVO = 4.5
const OPACO = /^bg-[a-z]+-[0-9]{2,3}$/
const TOKEN_TEXTO = /^text-[a-z]+-[0-9]{2,3}$/

/** Os tokens de cor de um elemento, lidos do DOM: o de texto (`text-família-tom`) e o de fundo. */
function tokensDeCor(el: HTMLElement): { texto: string | undefined; fundo: string | undefined } {
  const classes = Array.from(el.classList)
  return {
    texto: classes.find((c) => TOKEN_TEXTO.test(c)),
    fundo: classes.find((c) => c.startsWith('bg-')),
  }
}

/** Opaco e legível: fundo `bg-família-tom` (sem `/NN`, sem valor arbitrário) e contraste ≥ 4,5. */
function esperarOpacoLegivel(el: HTMLElement, nome: string): void {
  const { texto, fundo } = tokensDeCor(el)
  expect(texto, `${nome}: token de texto`).toMatch(TOKEN_TEXTO)
  expect(fundo, `${nome}: token de fundo`).toMatch(OPACO)
  expect(contrasteDeClasses(texto as string, fundo as string), `${nome}: contraste`).toBeGreaterThanOrEqual(ALVO)
}

const useMeuAgendamentoMock = vi.fn()
vi.mock('@/features/agendamento/hooks/useMeuAgendamento', () => ({
  useMeuAgendamento: (...args: unknown[]) => useMeuAgendamentoMock(...args),
  meuAgendamentoKeys: {
    all: ['meu-agendamento'] as const,
    byCandidatura: (id: string) => ['meu-agendamento', id] as const,
  },
}))

import { AgendamentoCandidatoCard } from '../AgendamentoCandidatoCard'
import type { MeuAgendamentoRow } from '../../services/agendamentoCandidatoService'

const H = 60 * 60 * 1000
const in2h = () => new Date(Date.now() + 2 * H).toISOString() // future AND within 24h
const in48h = () => new Date(Date.now() + 48 * H).toISOString() // future, beyond 24h

function makeRow(over: Partial<MeuAgendamentoRow> = {}): MeuAgendamentoRow {
  return {
    id: 'ag-1',
    candidatura_id: '11111111-1111-4111-8111-111111111111',
    tipo: 'online',
    data_hora: in2h(),
    local_ou_link: 'https://meet.example/abc',
    status: 'agendada',
    compareceu: null,
    ...over,
  }
}

function hookState(over: Record<string, unknown> = {}) {
  return {
    data: undefined as MeuAgendamentoRow | null | undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...over,
  }
}

function renderCard() {
  return render(<AgendamentoCandidatoCard candidaturaId="cand-1" />)
}

beforeEach(() => {
  useMeuAgendamentoMock.mockReset()
})

describe('AgendamentoCandidatoCard — states + AGEND-05 gating', () => {
  it('(a) cancelada + FUTURE data_hora → card visible with cancel note, but NO .ics button and NO ≤24h badge', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ status: 'cancelada', data_hora: in2h() }) }),
    )
    renderCard()

    // card is visible — the cancelada chip + note render
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(screen.getByText(/Esta entrevista foi cancelada/)).toBeInTheDocument()
    // 52-28 (G-52-6, decisão do operador «Cancelada» → «Entra junto»): o chip é opaco, o mesmo
    // par do «Rejeitado» do painel, com o contraste julgado pelas classes LIDAS DO DOM.
    const rotulo = screen.getByText('Cancelada')
    const conteiner = rotulo.parentElement as HTMLElement
    const tokenTexto = Array.from(rotulo.classList).find((c) => TOKEN_TEXTO.test(c))
    const tokenFundo = Array.from(conteiner.classList).find((c) => c.startsWith('bg-'))
    expect(tokenTexto).toBe('text-red-100')
    expect(tokenFundo).toBe('bg-red-800')
    expect(contrasteDeClasses(tokenTexto as string, tokenFundo as string)).toBeGreaterThanOrEqual(4.5)
    // 52-30 (residual_chips_agendamento → consertar agora): a nota de cancelada — a que o candidato
    // mais precisa ler — tem superfície opaca e o mesmo par do chip; a cópia é a de sempre.
    const nota = screen.getByText(/Esta entrevista foi cancelada/)
    expect(nota.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Esta entrevista foi cancelada. Você será avisado aqui se uma nova data for marcada.',
    )
    esperarOpacoLegivel(nota, 'nota de cancelada')
    expect(tokensDeCor(nota)).toEqual({ texto: 'text-red-100', fundo: 'bg-red-800' })
    // gated OUT: no .ics button, no ≤24h badge — even though the date is in the future
    expect(screen.queryByText(/Adicionar à agenda/)).toBeNull()
    expect(screen.queryByText(/menos de 24h/)).toBeNull()
  })

  it('(d) reagendada → chip «Reagendada» e a nota do horário atualizado, ambos opacos e legíveis (52-30)', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ status: 'reagendada', data_hora: in48h() }) }),
    )
    renderCard()

    const rotulo = screen.getByText('Reagendada')
    // O texto do chip está no `span`, o fundo no contêiner: julgar o par real.
    const tokenTexto = tokensDeCor(rotulo).texto
    const tokenFundo = tokensDeCor(rotulo.parentElement as HTMLElement).fundo
    expect(tokenTexto).toMatch(TOKEN_TEXTO)
    expect(tokenFundo).toMatch(OPACO)
    expect(contrasteDeClasses(tokenTexto as string, tokenFundo as string)).toBeGreaterThanOrEqual(ALVO)

    const nota = screen.getByText('O horário da sua entrevista foi atualizado.')
    esperarOpacoLegivel(nota, 'nota de reagendada')
    // Não é a nota de cancelada: cópia e estado próprios.
    expect(screen.queryByText(/Esta entrevista foi cancelada/)).toBeNull()
  })

  it('(b) tipo=presencial → renders NO <a> even when local_ou_link looks like a URL, and shows the "Local: " text', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({
        data: makeRow({
          tipo: 'presencial',
          // deliberately URL-shaped to prove presencial is NEVER linkified
          local_ou_link: 'https://maps.example/av-paulista-1000',
          data_hora: in2h(),
        }),
      }),
    )
    renderCard()

    expect(screen.queryByRole('link')).toBeNull()
    expect(
      screen.getByText(/Local:\s*https:\/\/maps\.example\/av-paulista-1000/),
    ).toBeInTheDocument()
    expect(screen.getByText('Presencial')).toBeInTheDocument()
  })

  it('(c) upcoming online within 24h, non-cancelled → .ics button + ≤24h badge + safe link', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({
        data: makeRow({
          tipo: 'online',
          status: 'agendada',
          local_ou_link: 'https://meet.example/abc',
          data_hora: in2h(),
        }),
      }),
    )
    renderCard()

    expect(screen.getByText(/Adicionar à agenda/)).toBeInTheDocument()
    expect(screen.getByText(/menos de 24h/)).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /videochamada/i })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('href', 'https://meet.example/abc')
  })

  it('upcoming online BEYOND 24h → .ics button present but NO ≤24h badge', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ data_hora: in48h() }) }),
    )
    renderCard()

    expect(screen.getByText(/Adicionar à agenda/)).toBeInTheDocument()
    expect(screen.queryByText(/menos de 24h/)).toBeNull()
  })

  it('online with null local_ou_link → graceful fallback, no link (W4)', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ tipo: 'online', local_ou_link: null }) }),
    )
    renderCard()

    expect(screen.queryByRole('link')).toBeNull()
    expect(
      screen.getByText(/Link da videochamada será informado em breve/),
    ).toBeInTheDocument()
  })

  it('(WR-01) online with a javascript:-scheme link → NOT rendered as <a>, shown as inert text', () => {
    const evil = 'javascript:alert(document.cookie)'
    useMeuAgendamentoMock.mockReturnValue(
      hookState({ data: makeRow({ tipo: 'online', local_ou_link: evil }) }),
    )
    renderCard()

    // defense-in-depth: an unsafe scheme is NEVER linkified
    expect(screen.queryByRole('link')).toBeNull()
    // the value is still shown, but as inert text (visible, not clickable)
    expect(screen.getByText(evil)).toBeInTheDocument()
  })

  it('(WR-01) online with a data:-scheme link → NOT rendered as <a>', () => {
    useMeuAgendamentoMock.mockReturnValue(
      hookState({
        data: makeRow({
          tipo: 'online',
          local_ou_link: 'data:text/html,<script>alert(1)</script>',
        }),
      }),
    )
    renderCard()

    expect(screen.queryByRole('link')).toBeNull()
  })

  it('loading → shows the eyebrow, no .ics button', () => {
    useMeuAgendamentoMock.mockReturnValue(hookState({ isLoading: true }))
    renderCard()

    expect(screen.getByText('Sua entrevista')).toBeInTheDocument()
    expect(screen.queryByText(/Adicionar à agenda/)).toBeNull()
  })

  it('no-agendamento (data null) → "Aguardando agendamento" empty copy', () => {
    useMeuAgendamentoMock.mockReturnValue(hookState({ data: null }))
    renderCard()

    expect(screen.getByText('Aguardando agendamento')).toBeInTheDocument()
    expect(
      screen.getByText(/O RH ainda não agendou sua entrevista/),
    ).toBeInTheDocument()
  })

  it('error → inline message + "Tentar novamente" re-triggers refetch', () => {
    const refetch = vi.fn()
    useMeuAgendamentoMock.mockReturnValue(hookState({ isError: true, refetch }))
    renderCard()

    expect(
      screen.getByText('Não foi possível carregar os detalhes da sua entrevista.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})

/* ------------------------------------------------------------------------------------------------
 * 52-30 — a guarda PELA FORMA dos chips do cartão (o espelho da guarda dos selos do painel).
 * ---------------------------------------------------------------------------------------------- */

const PREFIXOS = [
  'CHIP SEM COR/FUNDO',
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

/** Um `{…}` com `icon:` e `label:` cujos valores são TIPOS (`: string`, `: LucideIcon`) é a anotação
 *  do `Record`, não um descritor — a forma que a distingue é o valor ser um nome de tipo. */
const ANOTACAO_DE_TIPO = /\b(?:icon|color|bg|label)\s*:\s*(?:string|number|boolean|LucideIcon)\b/

/** Todo `{…}` sem chaves aninhadas com `icon:` e `label:` — candidatos (inclui a anotação de tipo). */
function candidatos(texto: string): Descritor[] {
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

/** Os descritores de chip: os candidatos que não são a anotação de tipo. */
function descritores(texto: string): Descritor[] {
  return candidatos(texto).filter((d) => !ANOTACAO_DE_TIPO.test(d.texto))
}

/** O JUIZ — o mesmo sobre o fonte real e sobre cada cópia mutada. Devolve as falhas. */
function julgarChips(texto: string): string[] {
  const falhas: string[] = []
  const lista = descritores(texto)
  for (const d of lista) {
    const color = /\bcolor\s*:\s*'([^']*)'/.exec(d.texto)?.[1]
    const bg = /\bbg\s*:\s*'([^']*)'/.exec(d.texto)?.[1]
    if (!color || !bg) {
      falhas.push(`CHIP SEM COR/FUNDO: ${d.label} color=${color ?? '∅'} bg=${bg ?? '∅'}`)
      continue
    }
    if (!OPACO.test(bg)) {
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
  if (lista.length === 0) falhas.push('POPULACAO: nenhum descritor de chip no fonte')
  if (!lista.some((d) => d.label === "'Cancelada'")) falhas.push("POPULACAO: falta o chip 'Cancelada'")
  if (!lista.some((d) => d.label === 'row.status')) falhas.push('POPULACAO: falta o descritor de reserva (label: row.status)')
  // Completude pela forma: toda ocorrência de `icon:` no fonte cai num candidato extraído — um
  // descritor com chaves aninhadas (que a forma `{[^{}]*}` não casa) não escapa em silêncio.
  const ocorrencias = (texto.match(/\bicon\s*:/g) ?? []).length
  const extraidos = candidatos(texto).length
  if (ocorrencias !== extraidos) falhas.push(`POPULACAO: ${ocorrencias} 'icon:' no fonte, ${extraidos} extraidos`)
  return falhas
}

const prefixosEm = (falhas: string[]): Set<Prefixo> =>
  new Set(PREFIXOS.filter((p) => falhas.some((f) => f.startsWith(`${p}:`))))

/** Uma cópia do fonte com SÓ o descritor da «Cancelada» alterado. */
function mutarCancelada(texto: string, mutar: (descritor: string) => string): string {
  const alvos = descritores(texto).filter((d) => d.label === "'Cancelada'")
  expect(alvos, 'exatamente um descritor da «Cancelada» no fonte').toHaveLength(1)
  const [d] = alvos
  return texto.slice(0, d.inicio) + mutar(d.texto) + texto.slice(d.fim)
}

describe('chips do cartão de entrevista — fundo opaco e contraste ≥ 4,5 pela forma (G-52-6 / 52-30)', () => {
  it('fonte real: todo descritor de chip (os seis do STATUS_CONFIG e a reserva) é opaco e legível', () => {
    const lista = descritores(FONTE)
    // Seis status + a reserva: a população real tem de ser maior que o único chip da decisão antiga.
    expect(lista.length).toBeGreaterThan(1)
    // A anotação de tipo foi reconhecida e excluída (senão viria como «CHIP SEM COR/FUNDO: string»).
    expect(candidatos(FONTE).length - lista.length).toBe(1)
    // Numa linha só: a lista vira texto para o relatório (TAP) do Vitest não quebrar.
    expect(julgarChips(FONTE).join(' | ')).toBe('')
  })

  it('o ícone e o rótulo do chip usam a MESMA cor do descritor (ícone + palavra, nunca só cor)', () => {
    expect(FONTE).toMatch(/<StatusIcon className=\{`[^`]*\$\{statusInfo\.color\}`\} aria-hidden="true" \/>/)
    expect(FONTE).toMatch(/<span className=\{`[^`]*\$\{statusInfo\.color\}`\}>\{statusInfo\.label\}<\/span>/)
  })

  const MORDIDAS: Array<{ nome: string; prefixo: Prefixo; mutar: (d: string) => string }> = [
    {
      nome: '(m1) fundo translúcido',
      prefixo: 'FUNDO TRANSLUCIDO',
      mutar: (d) => d.replace(/\bbg\s*:\s*'[^']*'/, "bg: 'bg-red-500/20'"),
    },
    {
      // Opaco e claro: passa no regex da opacidade; só o ramo do contraste o reprova (~1,5:1).
      nome: '(m2) fundo opaco de baixo contraste',
      prefixo: 'CONTRASTE ABAIXO',
      mutar: (d) => d.replace(/\bbg\s*:\s*'[^']*'/, "bg: 'bg-red-300'"),
    },
    {
      nome: '(m3) descritor sem bg',
      prefixo: 'CHIP SEM COR/FUNDO',
      mutar: (d) => d.replace(/,?\s*\bbg\s*:\s*'[^']*'/, ''),
    },
    {
      nome: '(m4) rótulo «Cancelada» renomeado',
      prefixo: 'POPULACAO',
      mutar: (d) => d.replace("label: 'Cancelada'", "label: 'Desmarcada'"),
    },
  ]

  it.each(MORDIDAS)('mordida $nome → só $prefixo reprova', ({ prefixo, mutar }) => {
    const copia = mutarCancelada(FONTE, mutar)
    // A mutação acertou o alvo — senão a mordida é vácua.
    expect(copia).not.toBe(FONTE)
    const falhas = julgarChips(copia)
    const vistos = prefixosEm(falhas)
    expect(vistos.has(prefixo), `${prefixo} ausente em ${JSON.stringify(falhas)}`).toBe(true)
    // Cada predicado morde sozinho: nenhum OUTRO prefixo aparece.
    expect([...vistos].filter((p) => p !== prefixo).join(' | ')).toBe('')
  })
})
