/**
 * Phase 52 / Plan 52-02 (JORN-60 — D-26, D-52-U20) — guarda POR FORMA do texto antigo do
 * cronômetro do SJT de múltipla escolha.
 *
 * O defeito (UAT da 51, pendência e): o cronômetro do SJT MC conta o tempo DECORRIDO, sem
 * limite, mas dizia que era um tempo «sugerido» — o candidato lia uma meta que não existe.
 * A frase nova é «Tempo decorrido: mm:ss (sem limite de tempo)».
 *
 * ── Por que VARREDURA RECURSIVA e não o arquivo da tela ──
 * CLAUDE.md §Portões: «iteração sobre lista literal» não reprova nada quando o texto
 * renasce noutro arquivo. A pergunta deste guarda é «existe em ALGUM lugar de
 * `src/features/avaliacao`», e isso pede varredura da raiz.
 *
 * ── Por que comentários CONTAM aqui (ao contrário do `rotulos-navegacao-candidato`) ──
 * O docblock da tela descrevia o cronômetro com a frase antiga (Pitfall 12 da pesquisa):
 * quem lê o docblock para mexer na tela copia a frase de volta. Um docblock que ensina
 * a frase errada é a forma mais provável de ela voltar — então toda linha conta.
 *
 * Fora da varredura: `__tests__` (os testes NOMEIAM a frase antiga para provar que ela
 * sumiu) e `node_modules`.
 *
 * @see src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts (esqueleto `collectFiles`)
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-02-PLAN.md (Task 1)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: src/__tests__/guards → __tests__ → src → ROOT.
const ROOT = resolve(__dirname, '../../..')

const SCAN_ROOT = 'src/features/avaliacao'

/** O texto antigo do cronômetro, tolerante a caixa e a espaço repetido. */
const TEXTO_ANTIGO = /tempo\s+sugerido/i

/** Piso de arquivos varridos: abaixo disto a raiz não resolveu e o verde não prova nada. */
const PISO_ARQUIVOS = 10

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return /\.(ts|tsx)$/.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}

/** Linha que reprova — a MESMA função que a varredura usa e que a sanidade exercita. */
function reprova(linha: string): boolean {
  return TEXTO_ANTIGO.test(linha)
}

describe('Cronômetro do SJT MC diz o que mede (52-02 / D-26)', () => {
  it('(i) nenhuma linha de src/features/avaliacao (código OU comentário) diz o texto antigo', () => {
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
        'Texto antigo do cronômetro em src/features/avaliacao — o cronômetro conta o tempo ' +
          `decorrido, sem limite; use «Tempo decorrido: mm:ss (sem limite de tempo)»:\n${violacoes.join('\n')}`,
      )
    }
    expect(violacoes).toHaveLength(0)
  })

  it('(ii-a) sanidade: a regra reprova as linhas-fixture com o texto antigo (o guarda morde)', () => {
    expect(reprova('            <span>Tempo sugerido: {mmss(seconds)} (sem limite rígido)</span>')).toBe(true)
    expect(reprova(' * ("Tempo sugerido: {mm:ss} (sem limite rígido)"). On the last item')).toBe(true)
    expect(reprova("  timer: 'TEMPO  SUGERIDO',")).toBe(true)
  })

  it('(ii-b) sanidade: a regra NÃO reprova a frase nova', () => {
    expect(
      reprova('            <span className="tabular-nums">Tempo decorrido: {mmss(seconds)} (sem limite de tempo)</span>'),
    ).toBe(false)
  })

  it(`(iii) sanidade: a varredura alcança ≥ ${PISO_ARQUIVOS} arquivos (a raiz resolve)`, () => {
    expect(collectFiles(SCAN_ROOT).length).toBeGreaterThanOrEqual(PISO_ARQUIVOS)
  })
})
