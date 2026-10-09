/**
 * Phase 51 / Plan 51-01 (JORN-44, JORN-46 — D-25, D-37) — guarda POR FORMA dos rótulos
 * de navegação do candidato dentro do fluxo de avaliação.
 *
 * O defeito (C-11, reproduzido): o botão das provas dizia «Voltar ao painel» e levava
 * à LISTA de avaliações. A convenção nova: «Voltar às avaliações» vai à lista
 * (`/candidato/avaliacao/:id`); «Ir ao painel» vai a `/candidato/dashboard`. Nenhum
 * botão destas features volta a dizer «painel» com o rótulo antigo.
 *
 * ── Por que VARREDURA RECURSIVA e não lista de arquivos ──
 * CLAUDE.md §Portões: a forma «iteração sobre lista literal» (`wait-state-copy`, com
 * os seus 7 arquivos) não reprova nada quando nasce uma tela nova — o objeto novo fica
 * fora da vigilância e o portão segue verde. A pergunta deste guarda é «existe em
 * ALGUM lugar destas features», e isso pede varredura das raízes.
 *
 * ── Por que ESTAS duas raízes ──
 * `src/features/avaliacao` e `src/features/avaliacao-cognitiva` são as duas features
 * do candidato que vivem DENTRO do fluxo de avaliação (container, provas, devolutiva,
 * prova cognitiva, Raven). Ficam FORA, de propósito (escolha 3 do planejador):
 * `src/features/explicacao` e `src/features/privacidade` — o «Voltar ao painel» delas
 * aponta para o próprio painel (`/candidato/dashboard`), e o D-25 proíbe «painel»
 * apontando para a lista, não para o painel. Também fora: as páginas do RH
 * («Voltar ao painel» do comparativo, «Voltar ao painel RH» do 404), outro público.
 *
 * Comentários (`//`, `*`, `/*` no início da linha) são ignorados: docblocks que
 * CONTAM a história do rótulo antigo não são rótulo.
 *
 * @see src/__tests__/guards/forbidden-strings.grep.test.ts (esqueleto `collectFiles`)
 * @see .planning/phases/51-consertos-da-jornada-bloco-3/51-01-PLAN.md (Task 3)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: src/__tests__/guards → __tests__ → src → ROOT.
const ROOT = resolve(__dirname, '../../..')

const SCAN_ROOTS = ['src/features/avaliacao', 'src/features/avaliacao-cognitiva'] as const

/** O rótulo antigo de volta-ao-painel (e a variante «para o»), tolerante a caixa. */
const ROTULO_ANTIGO = /voltar\s+(ao|para\s+o)\s+painel/i

/** Os dois rótulos novos, exigidos ao menos uma vez cada na varredura. */
const VOLTAR_AVALIACOES = 'Voltar às avaliações'
const IR_AO_PAINEL = 'Ir ao painel'

const COMENTARIO = /^\s*(\/\/|\*|\/\*)/

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return /\.(ts|tsx)$/.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    // __tests__: os testes NOMEIAM o rótulo antigo para provar que ele sumiu.
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}

function linhasDeCodigo(): { file: string; line: number; text: string }[] {
  const out: { file: string; line: number; text: string }[] = []
  for (const file of SCAN_ROOTS.flatMap((p) => collectFiles(p))) {
    readFileSync(file, 'utf-8')
      .split('\n')
      .forEach((text, idx) => {
        if (!COMENTARIO.test(text)) out.push({ file, line: idx + 1, text })
      })
  }
  return out
}

describe('Rótulos de navegação do candidato no fluxo de avaliação (51-01 / D-25, D-37)', () => {
  it('(i) nenhuma linha de código diz o rótulo antigo «Voltar ao painel»', () => {
    const violacoes = linhasDeCodigo().filter((l) => ROTULO_ANTIGO.test(l.text))
    if (violacoes.length > 0) {
      const msg = violacoes
        .map((v) => `  ${v.file.slice(ROOT.length + 1)}:${v.line}  ${v.text.trim()}`)
        .join('\n')
      throw new Error(
        'Rótulo antigo de volta-ao-painel no fluxo de avaliação — use «Voltar às avaliações» ' +
          `(→ /candidato/avaliacao/:id) ou «Ir ao painel» (→ /candidato/dashboard):\n${msg}`,
      )
    }
    expect(violacoes).toHaveLength(0)
  })

  it('(ii) os dois rótulos novos aparecem ao menos uma vez cada', () => {
    const linhas = linhasDeCodigo()
    expect(linhas.filter((l) => l.text.includes(VOLTAR_AVALIACOES)).length).toBeGreaterThanOrEqual(1)
    expect(linhas.filter((l) => l.text.includes(IR_AO_PAINEL)).length).toBeGreaterThanOrEqual(1)
  })

  it('(iii-a) sanidade: a regex casa a linha-fixture com o rótulo antigo', () => {
    expect(ROTULO_ANTIGO.test("  backToPanel: 'Voltar ao painel',")).toBe(true)
    expect(ROTULO_ANTIGO.test('            Voltar ao painel')).toBe(true)
    expect(ROTULO_ANTIGO.test("  voltar: 'Voltar para o painel',")).toBe(true)
  })

  it('(iii-b) sanidade: a regex NÃO casa os dois rótulos novos', () => {
    expect(ROTULO_ANTIGO.test(`  voltarAvaliacoes: '${VOLTAR_AVALIACOES}',`)).toBe(false)
    expect(ROTULO_ANTIGO.test(`  irAoPainel: '${IR_AO_PAINEL}',`)).toBe(false)
  })

  it('(iii-c) sanidade: a varredura alcança ≥ 10 arquivos (as raízes resolvem)', () => {
    const files = SCAN_ROOTS.flatMap((p) => collectFiles(p))
    expect(files.length).toBeGreaterThanOrEqual(10)
  })
})
