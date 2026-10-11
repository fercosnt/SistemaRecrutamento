/**
 * Phase 52 / Plan 52-07 (JORN-61 — D-25, D-52-U13) — guarda POR FORMA do jargão na tela da
 * entrevista do RH.
 *
 * O defeito (UAT da 51, teste 5): o subtítulo da avaliação dizia «BARS sliders 1–5 —
 * notas_humanas. A decisão é sempre humana.» — o nome de um componente e o nome de uma COLUNA
 * do banco, ditos ao entrevistador. A frase nova é «Escolha uma nota de 1 a 5 para cada
 * competência. A decisão é sempre humana.»
 *
 * ── A regra (o que reprova) ──
 * Varre toda linha de `src/features/entrevista` (fora de `__tests__`) e reprova:
 *  (1) «BARS sliders» (caixa e espaço tolerantes) em QUALQUER linha de código;
 *  (2) `notas_humanas` como TEXTO — texto de JSX (`<span>notas_humanas</span>`, uma linha de
 *      texto solta dentro do JSX) ou dentro de string (`{'notas_humanas'}`,
 *      `toast.error('Faltam notas_humanas')`).
 * A palavra `notas_humanas` é também o nome de um campo do banco e do tipo `EntrevistaAnaliseRow`
 * — NOME não é texto visível e não reprova. Antes de testar (2), a linha perde os usos como
 * nome, nesta ordem:
 *  a. lista de colunas numa string — só identificadores separados por vírgula
 *     (`'id, …, notas_humanas, …'`, a allowlist do `select`);
 *  b. acesso por colchete — `row['notas_humanas']`;
 *  c. chave de objeto ou campo de tipo — `notas_humanas: valor`, `notas_humanas?: string`,
 *     `'notas_humanas': x`;
 *  d. acesso a propriedade — `row.notas_humanas`, `row?.notas_humanas`;
 *  e. identificador nu em código — `const notas_humanas`, `{ notas_humanas }`, `(notas_humanas)`,
 *     `= notas_humanas`, `{notas_humanas}` em JSX (que renderiza o VALOR, não a palavra).
 * O que sobra com `notas_humanas` é texto — reprova.
 *
 * ── O que fica fora (e por quê) ──
 * Linhas de comentário (`//`, `*`, `/*` e `{/*` no início; e o trecho `// …`, `/* … *\/` ou
 * `{/* … *\/}` no fim de uma linha de código): docblocks que CONTAM a história do jargão não são
 * tela. `__tests__`: os testes NOMEIAM o jargão para provar que ele sumiu.
 *
 * ── Limites declarados (não vê) ──
 * Uma frase de JSX que use `notas_humanas` seguida de `:` («notas_humanas: obrigatório») passa
 * por chave de objeto (c); entre parênteses, por identificador (e). Uma lista literal de chaves
 * (`['scores_humanos', 'notas_humanas']`) reprova — falso positivo do lado barulhento, que se
 * resolve escrevendo-a como tipo (`keyof`). «BARS» sozinho («Âncoras BARS 1–5», o guia da
 * entrevista) não é o jargão banido e não reprova.
 *
 * ── Por que VARREDURA RECURSIVA ──
 * CLAUDE.md §Portões: «iteração sobre lista literal» não reprova nada quando o texto renasce
 * noutro arquivo. A pergunta é «existe em ALGUM lugar de `src/features/entrevista`».
 *
 * @see src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts (esqueleto `collectFiles`)
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-07-PLAN.md (Task 2)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Repo root: src/__tests__/guards → __tests__ → src → ROOT.
const ROOT = resolve(__dirname, '../../..')

const SCAN_ROOT = 'src/features/entrevista'

/** Piso de arquivos varridos: abaixo disto a raiz não resolveu e o verde não prova nada. */
const PISO_ARQUIVOS = 6

const BARS_SLIDERS = /\bBARS\s+sliders?\b/i
const NOME_DA_COLUNA = /\bnotas_humanas\b/

/** Linha inteira de comentário: `//`, `*`, `/*` ou `{/*` no início. */
const COMENTARIO = /^\s*(\/\/|\*|\/\*|\{\/\*)/

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

/** O código da linha, sem o comentário do fim; `null` se a linha inteira é comentário. */
function codigoDaLinha(linha: string): string | null {
  if (COMENTARIO.test(linha)) return null
  return linha
    .replace(/\{\/\*.*?\*\/\}/g, '')
    .replace(/\/\*.*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/, '$1')
}

/** Tira da linha os usos de `notas_humanas` como NOME (a–e do cabeçalho). */
function semUsosComoNome(codigo: string): string {
  return (
    codigo
      // a. lista de colunas numa string (só identificadores separados por vírgula)
      .replace(/(['"`])\s*[\w!:().*]+(?:\s*,\s*[\w!:().*]+)+\s*\1/g, '')
      // b. acesso por colchete
      .replace(/\[\s*(['"`])notas_humanas\1\s*\]/g, '')
      // c. chave de objeto / campo de tipo
      .replace(/(['"`]?)\bnotas_humanas\1\s*\??\s*:/g, '')
      // d. acesso a propriedade
      .replace(/\.notas_humanas\b/g, '')
      // e. identificador nu em código
      .replace(/\b(const|let|var)\s+notas_humanas\b/g, '')
      .replace(/([{(,=]\s*)notas_humanas(?=\s*[},)=;.?])/g, '$1')
  )
}

/** Linha que reprova — a MESMA função que a varredura usa e que a sanidade exercita. */
function reprova(linha: string): boolean {
  const codigo = codigoDaLinha(linha)
  if (codigo === null) return false
  if (BARS_SLIDERS.test(codigo)) return true
  return NOME_DA_COLUNA.test(semUsosComoNome(codigo))
}

describe('Entrevista do RH sem jargão na tela (52-07 / D-25, D-52-U13)', () => {
  it('(i) nenhuma linha de código de src/features/entrevista diz «BARS sliders» nem mostra `notas_humanas` como texto', () => {
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
        'Jargão na tela da entrevista — o entrevistador não lê nome de componente nem de coluna; ' +
          'use «Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.»:\n' +
          violacoes.join('\n'),
      )
    }
    expect(violacoes).toHaveLength(0)
  })

  it('(ii-a) sanidade: a regra reprova as linhas-fixture com o jargão como texto (o guarda morde)', () => {
    expect(reprova('          <p>BARS sliders 1–5</p>')).toBe(true)
    expect(reprova("          <p>{'notas_humanas'}</p>")).toBe(true)
    // A linha do defeito, como estava no componente (texto solto dentro do JSX).
    expect(reprova('          BARS sliders 1–5 — notas_humanas. A decisão é sempre humana.')).toBe(true)
    // Sem o «BARS sliders», a coluna sozinha como texto ainda reprova.
    expect(reprova('          Escala 1–5 — notas_humanas. A decisão é sempre humana.')).toBe(true)
    expect(reprova('            <span>notas_humanas</span>')).toBe(true)
    expect(reprova("    toast.error('Faltam notas_humanas')")).toBe(true)
    expect(reprova("  subtitulo: 'Notas em notas_humanas',")).toBe(true)
    expect(reprova("  titulo: 'bars  SLIDERS',")).toBe(true)
  })

  it('(ii-b) sanidade: a regra NÃO reprova `notas_humanas` como nome de campo/variável', () => {
    expect(reprova('    notas_humanas: valor,')).toBe(false)
    expect(reprova('  notas_humanas: string | null')).toBe(false)
    expect(reprova('  notas_humanas?: string')).toBe(false)
    expect(reprova("  'notas_humanas': valor,")).toBe(false)
    expect(reprova("  const texto = row.notas_humanas ?? ''")).toBe(false)
    expect(reprova("  const texto = row?.notas_humanas ?? ''")).toBe(false)
    expect(reprova("  const texto = row['notas_humanas']")).toBe(false)
    expect(reprova('  const { notas_humanas, scores_humanos } = analise')).toBe(false)
    expect(reprova('          <p>{notas_humanas}</p>')).toBe(false)
    expect(reprova('  salvar(notas_humanas)')).toBe(false)
    // A allowlist do `select` (entrevistaService): lista de colunas, não texto.
    expect(
      reprova("  'id, candidatura_id, scores_humanos, notas_humanas, revisada_por, created_at'"),
    ).toBe(false)
  })

  it('(ii-c) sanidade: a regra NÃO reprova comentários nem «BARS» sozinho', () => {
    expect(reprova(' * BARS sliders 1–5 — notas_humanas. A decisão é sempre humana.')).toBe(false)
    expect(reprova('  // notas_humanas vem do banco')).toBe(false)
    expect(reprova('/* BARS sliders */')).toBe(false)
    expect(reprova('      {/* BARS sliders — neutral, no red/green tint */}')).toBe(false)
    expect(reprova("  const x = 1 // 'notas_humanas' como texto, mas no comentário")).toBe(false)
    expect(reprova('        Âncoras BARS 1–5')).toBe(false)
    expect(
      reprova('          Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.'),
    ).toBe(false)
  })

  it(`(iii) sanidade: a varredura alcança ≥ ${PISO_ARQUIVOS} arquivos (a raiz resolve)`, () => {
    expect(collectFiles(SCAN_ROOT).length).toBeGreaterThanOrEqual(PISO_ARQUIVOS)
  })
})
