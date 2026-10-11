/**
 * Phase 52 / Plan 52-11 — JORN-56 / D-02 / UX-07 (UI-SPEC §Bans, Invariante 1): guarda POR FORMA
 * contra o número da escala do Big Five no hub do RH.
 *
 * A D-01 da 52 devolveu ao hub as FAIXAS do Big Five (a D-32 da 51 está revogada no hub). O que
 * não volta é o número: o RH vê «Moderadamente alto», nunca um dígito da escala, e nada ordena,
 * filtra ou rejeita por Big Five (RNF-07a). A trava principal é o TIPO — `BigFiveHubDimensao`
 * não tem o campo, e o serviço projeta campo a campo. Esta varredura é a segunda trava: ela
 * reprova a primeira linha de CÓDIGO que nomear o campo nos arquivos do Big Five do hub, antes
 * que uma edição futura o faça chegar à tela (T-52-31).
 *
 * ─── ESCOPO — deliberado, não fotografia ──────────────────────────────────────────────────────
 *
 * Os três arquivos são o Big Five do hub E o que ele importa (UI-SPEC §Bans: «`BigFiveResultadoHub`
 * e o que ele importa»): o componente, o módulo de rótulos compartilhado e o serviço que lê a RPC.
 * A devolutiva do CANDIDATO (`DevolutivaBigFiveView`, `bigfiveService`) fica fora de propósito:
 * é a única tela onde o candidato vê o próprio número, e o tipo dela o carrega. Se o Big Five do
 * hub ganhar arquivo novo, ele entra nesta lista; se um destes mudar de lugar, mova a entrada —
 * o teste de existência abaixo reprova o caminho que sumiu, para a lista não ficar varrendo nada.
 *
 * ─── O QUE CONTA COMO CÓDIGO ──────────────────────────────────────────────────────────────────
 *
 * Toda linha que não começa (depois do recuo) por `//`, `*`, `/*` ou `{/*` — comentário de
 * TS e de JSX. Docblock pode explicar a proibição; código não pode nomear o campo. Comentário
 * no FIM de uma linha de código conta como código (reprova no sentido barulhento, de propósito).
 * Sem distinção de maiúscula: `Percentil` num rótulo também reprova.
 *
 * ─── SANIDADE ─────────────────────────────────────────────────────────────────────────────────
 *
 * Linhas-fixture no formato de linha real que TÊM de morder (campo no tipo, leitura do campo,
 * render JSX, rótulo) e que NÃO podem (comentários de linha, de bloco e de JSX) — contra a MESMA
 * função que a varredura usa. Um guarda que não morde é pior que nenhum.
 *
 * @see src/features/avaliacao/components/BigFiveResultadoHub.tsx
 * @see src/features/avaliacao/services/avaliacoesRhService.ts
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Este arquivo mora em src/__tests__/guards/ — três níveis abaixo da raiz.
const ROOT = resolve(__dirname, '../../..')

/** O Big Five do hub e o que ele importa (escopo — ver o docblock). */
const ARQUIVOS_DO_HUB = [
  'src/features/avaliacao/components/BigFiveResultadoHub.tsx',
  'src/features/avaliacao/lib/bigFiveRotulos.tsx',
  'src/features/avaliacao/services/avaliacoesRhService.ts',
] as const

const PROIBIDO = /percentil/i
const LINHA_DE_COMENTARIO = /^\s*(\/\/|\*|\/\*|\{\/\*)/

/** A linha é código que nomeia o campo proibido? (A ÚNICA função — varredura e sanidade.) */
export function nomeiaPercentil(linha: string): boolean {
  if (LINHA_DE_COMENTARIO.test(linha)) return false
  return PROIBIDO.test(linha)
}

function achados(rel: string): string[] {
  const linhas = readFileSync(join(ROOT, rel), 'utf-8').split('\n')
  const out: string[] = []
  linhas.forEach((l, i) => {
    if (nomeiaPercentil(l)) out.push(`${rel}:${i + 1}: ${l.trim()}`)
  })
  return out
}

function linhasDeCodigo(rel: string): number {
  return readFileSync(join(ROOT, rel), 'utf-8')
    .split('\n')
    .filter((l) => l.trim() !== '' && !LINHA_DE_COMENTARIO.test(l)).length
}

describe('52-11 / UX-07 — nenhum número da escala do Big Five no código do hub do RH', () => {
  it('os arquivos do Big Five do hub não nomeiam o campo em linha de código', () => {
    const todos = ARQUIVOS_DO_HUB.flatMap(achados)
    expect(todos, `achados:\n${todos.join('\n')}`).toEqual([])
  })

  it('a lista resolve: cada arquivo existe e tem código (uma lista que não varre nada não passa)', () => {
    for (const rel of ARQUIVOS_DO_HUB) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true)
      expect(linhasDeCodigo(rel), rel).toBeGreaterThan(10)
    }
  })

  it('SANIDADE — morde nas formas reais de nomear o campo', () => {
    for (const l of [
      '  percentil: number',
      '    const n = d.percentil',
      '              <span>{d.percentil}</span>',
      "      rotulo: 'Percentil',",
      "  return { dim, banda, percentil: bruto.percentil }",
      '  const x = 1 // percentil aqui é código com comentário no fim',
    ]) {
      expect(nomeiaPercentil(l), l).toBe(true)
    }
  })

  it('SANIDADE — não morde em comentário (docblock, linha, bloco, JSX) nem em código sem o campo', () => {
    for (const l of [
      ' * o tipo não tem percentil (Invariante 1)',
      '  // percentil nunca chega aqui',
      '  /* percentil */',
      '      {/* sem percentil */}',
      "  banda: 'muito_alto',",
      '  texto_interpretativo: string',
    ]) {
      expect(nomeiaPercentil(l), l).toBe(false)
    }
  })
})
