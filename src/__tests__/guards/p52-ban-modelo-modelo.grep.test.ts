/**
 * Phase 52 / Plan 52-05 (JORN-58 — D-23, D-52-U17) — guarda POR FORMA do «modelo» duplicado.
 *
 * O defeito (UAT da 51, defeito b): o selo de proveniência dizia «Gerado pelo modelo» seguido
 * do fragmento que ocupava o lugar do nome do modelo quando ele não tinha sido gravado — e a
 * palavra «modelo» saía duas vezes seguidas na tela e no PDF. O conserto mora em
 * `textoProveniencia` (frase inteira para modelo nulo) e é provado lá por um teste exaustivo
 * de combinações. ESTE guarda cobre o outro caminho de volta: alguém escrever a frase
 * duplicada como literal em qualquer arquivo de `src/`.
 *
 * ── Por que VARREDURA RECURSIVA de `src/` inteiro ──
 * CLAUDE.md §Portões: «iteração sobre lista literal» não reprova nada quando o texto renasce
 * noutro arquivo. A pergunta é «existe em ALGUM lugar de `src/`», e isso pede varredura da raiz.
 *
 * ── Por que comentários CONTAM ──
 * Um docblock que cita a frase errada ensina a frase errada a quem for mexer no selo (a mesma
 * razão do `p52-ban-tempo-sugerido`). Toda linha de arquivo de código conta.
 *
 * ── Por que o piso é CALCULADO na execução ──
 * Um piso constante é uma fotografia que envelhece (CLAUDE.md §Portões). Aqui o número de
 * arquivos que a varredura alcança é comparado com uma contagem INDEPENDENTE, feita na mesma
 * execução por outro caminho (`readdirSync` recursivo do Node). Se a varredura perder uma
 * pasta, os dois números divergem e o guarda reprova, em vez de ficar verde sobre nada.
 *
 * Fora da varredura: `__tests__` (os testes NOMEIAM a frase errada para provar que ela sumiu)
 * e `node_modules`.
 *
 * @see src/__tests__/guards/p52-ban-tempo-sugerido.grep.test.ts (esqueleto `collectFiles`)
 * @see src/features/triagem/components/ProvenienciaIABadge.tsx (`textoProveniencia`)
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-05-PLAN.md (Task 1)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

// Repo root: src/__tests__/guards → __tests__ → src → ROOT.
const ROOT = resolve(__dirname, '../../..')

const SCAN_ROOT = 'src'

/** A palavra «modelo» duas vezes seguidas, tolerante a caixa e a espaço repetido. */
const MODELO_DUPLICADO = /modelo\s+modelo/i

const EXT = /\.(ts|tsx)$/

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return EXT.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}

/**
 * Contagem INDEPENDENTE (outro caminho de código: o `readdirSync` recursivo do Node), feita
 * na mesma execução — é o piso contra o qual a varredura se mede.
 */
function contagemIndependente(): number {
  const base = join(ROOT, SCAN_ROOT)
  return (readdirSync(base, { recursive: true }) as string[]).filter((rel) => {
    const partes = rel.split(sep)
    if (partes.includes('__tests__') || partes.includes('node_modules')) return false
    return EXT.test(rel) && statSync(join(base, rel)).isFile()
  }).length
}

/** Linha que reprova — a MESMA função que a varredura usa e que a sanidade exercita. */
function reprova(linha: string): boolean {
  return MODELO_DUPLICADO.test(linha)
}

describe('Proveniência sem «modelo» duplicado (52-05 / D-23)', () => {
  it('(i) nenhuma linha de src/ (código OU comentário, fora de __tests__) diz «modelo» duas vezes seguidas', () => {
    const violacoes: string[] = []
    for (const file of collectFiles(SCAN_ROOT)) {
      readFileSync(file, 'utf-8')
        .split('\n')
        .forEach((text, idx) => {
          if (reprova(text)) {
            violacoes.push(`  ${file.slice(ROOT.length + 1)}:${idx + 1}  ${text.trim()}`)
          }
        })
    }
    if (violacoes.length > 0) {
      throw new Error(
        '«modelo» duplicado em src/ — a frase de modelo nulo é inteira («Modelo não registrado»), ' +
          `vinda de PROVENIENCIA_IA_COPY, nunca uma substituição dentro de outra frase:\n${violacoes.join('\n')}`,
      )
    }
    expect(violacoes).toHaveLength(0)
  })

  it('(ii-a) sanidade: a regra reprova linhas-fixture com o «modelo» duplicado (o guarda morde)', () => {
    expect(reprova("      'Gerado pelo modelo modelo não registrado',")).toBe(true)
    expect(reprova(' * o selo dizia «Gerado pelo MODELO   modelo não registrado»')).toBe(true)
    expect(reprova('  const t = `Gerado pelo modelo\tmodelo x`')).toBe(true)
  })

  it('(ii-b) sanidade: a regra NÃO reprova as frases novas', () => {
    expect(reprova("  semModelo: 'Modelo não registrado',")).toBe(false)
    expect(reprova("  semModeloAntigo: 'Modelo não registrado (análise anterior a 22/09/2026)',")).toBe(false)
    expect(
      reprova("  contingenciaSemModelo: 'Gerado pelo modelo de contingência (modelo não registrado)',"),
    ).toBe(false)
  })

  it('(iii) sanidade: a varredura alcança TODOS os arquivos .ts/.tsx de src/ fora de __tests__ (piso medido na execução)', () => {
    const alcancados = collectFiles(SCAN_ROOT).length
    const esperados = contagemIndependente()
    expect(esperados).toBeGreaterThan(0)
    expect(alcancados).toBe(esperados)
  })
})
