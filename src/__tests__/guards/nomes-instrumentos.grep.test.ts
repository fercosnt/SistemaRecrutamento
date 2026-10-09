/**
 * Phase 51 / Plan 51-04 — JORN-48 / D-15: guarda POR FORMA dos nomes dos dois instrumentos
 * cognitivos em `src/`.
 *
 * O D-15 deu um nome a cada instrumento, e nenhum dos dois continua sendo só «Avaliação
 * cognitiva»:
 *   - o instrumento textual (`aplica_cognitivo`, `ProvaCognitivaScreen`, `cognitivo_itens`)
 *     é a **«Prova cognitiva»**;
 *   - o Raven (`AvaliacaoRavenScreen`, `questoes_raven`) é o **«Raciocínio lógico (Matrizes)»**.
 * Antes do 51-01/51-03 os dois apareciam ao RH e ao candidato com nomes genéricos que não
 * distinguiam um do outro — e o textual chegou a se chamar «raciocínio lógico», que é o nome
 * novo do Raven. Este guarda impede que um nome aposentado volte a qualquer superfície do front.
 *
 * ─── (i) O QUE AS DUAS REGEX VIGIAM — regra de CONTEÚDO INTEIRO ─────────────────────────────
 *
 * Varre todo `.ts/.tsx` de `src/` (recursivo, fora `__tests__` e `node_modules`), descarta as
 * linhas de comentário (`^\s*(//|\*|/\*)`) e, de cada linha restante, extrai os CANDIDATOS A
 * RÓTULO: o conteúdo de cada string literal (aspas simples, duplas, ou crase SEM `${`) e cada
 * trecho de texto JSX (a linha partida em `<`, `>`, `{`, `}`). Um candidato reprova quando o
 * seu conteúdo INTEIRO, depois de `trim()`, é um nome aposentado:
 *
 *   NOMES_APOSENTADOS (flag `i`, sem distinção de maiúscula) — as formas de várias palavras:
 *     «Avaliação cognitiva», «Avaliação de raciocínio (lógico)», «Prova de raciocínio (lógico)»,
 *     «Raciocínio lógico» (exatamente — sem « (Matrizes)»). Tolera a falta de acento (ç/ã/í/ó)
 *     como o `forbidden-strings` tolera, para um deslize sem acento não passar. «Prova de
 *     raciocínio lógico» e «Avaliação de raciocínio lógico» entram porque foram rótulos reais
 *     (`ProvaCognitivaScreen` antes do 51-01) — o mesmo nome aposentado com uma palavra a mais.
 *
 *   ROTULO_COGNITIVO (SEM a flag `i`) — a forma de uma palavra só, `Cognitivo`/`COGNITIVO`.
 *     Distingue maiúscula DE PROPÓSITO: a minúscula `'cognitivo'` é CHAVE TÉCNICA
 *     (`queryKey: ['cognitivo', …]`, `tipo === 'cognitivo'`, os arrays de
 *     `src/lib/testes/testeContract.ts`) — vocabulário de evento, de dedupe e de contrato que o
 *     51-03 proíbe renomear. Reprová-la deixaria este guarda vermelho no primeiro run sobre
 *     código correto; aceitar o capitalizado deixaria voltar o rótulo que o D-15 aposentou
 *     (`ETAPA_LABEL.cognitivo = 'Cognitivo'` no `ConsolidacaoDashboard`, `'Cognitivo'` nos
 *     `CONTEXT_CHIPS` do `PesosSliders`, ambos antes do 51-03). Se uma chave em minúscula
 *     aparecer como achado, foi esta regex que ganhou a flag `i`: conserte a regex, nunca tire
 *     `'Cognitivo'` das fixtures que têm de casar.
 *
 * O guarda vigia RÓTULO, não prosa: uma frase que só CONTÉM uma dessas formas não casa. Isso
 * deixa passar, por desenho, a linguagem de produto genérica «avaliação comportamental/cognitiva»
 * (D-58 da 49 e o CLAUDE.md — é a cópia que SUBSTITUI o enquadramento clínico, não um nome de
 * instrumento), as razões geradas do export («Idem, avaliação cognitiva.») e os docblocks.
 *
 * ─── (ii) PRESENÇA DOS NOMES NOVOS — escopo, não fotografia ─────────────────────────────────
 *
 * A (i) por desenho não vê prosa antiga, então é a (ii) que prova que os nomes novos estão nas
 * superfícies que o D-15 nomeia («hub, container, telas, toasts, rótulos de exportação»). A
 * lista de arquivos abaixo é ESSE escopo — as superfícies que definem o nome de cada instrumento
 * —, não um inventário que envelhece: arquivo novo que fale dos instrumentos é coberto pela (i).
 * Se uma dessas superfícies mudar de arquivo, mova a entrada; não a apague.
 *
 * ─── (iii) SANIDADE — o guarda morde e não morde o que não deve ─────────────────────────────
 *
 * Fixtures que TÊM de casar e que NÃO podem casar, no formato de linha real, e a varredura
 * alcança ≥ 100 arquivos (um walk quebrado não passa vazio).
 *
 * O 51-07 estende `SCAN_ROOTS` ao template de e-mail (`supabase/functions/_shared/email-templates.ts`).
 *
 * @see .planning/phases/51-consertos-da-jornada-bloco-3/51-CONTEXT.md (D-15)
 * @see src/__tests__/guards/forbidden-strings.grep.test.ts (esqueleto da varredura recursiva)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

// Este arquivo mora em src/__tests__/guards/ — três níveis abaixo da raiz.
const ROOT = resolve(__dirname, '../../..')

/** Raízes varridas. O 51-07 acrescenta `supabase/functions/_shared/email-templates.ts`. */
const SCAN_ROOTS = ['src'] as const

/** (i) Formas de várias palavras — sem distinção de maiúscula, acento tolerado. */
const NOMES_APOSENTADOS =
  /^(?:avalia[cç][aã]o\s+cognitiva|avalia[cç][aã]o\s+de\s+racioc[ií]nio(?:\s+l[oó]gico)?|prova\s+de\s+racioc[ií]nio(?:\s+l[oó]gico)?|racioc[ií]nio\s+l[oó]gico)$/iu

/** (i) Forma de uma palavra só — COM distinção de maiúscula: a minúscula é chave técnica. */
const ROTULO_COGNITIVO = /^(?:Cognitivo|COGNITIVO)$/u

const LINHA_DE_COMENTARIO = /^\s*(\/\/|\*|\/\*)/

/** Os candidatos a rótulo de uma linha: conteúdo de string literal e trechos de texto JSX. */
export function candidatosDaLinha(linha: string): string[] {
  const out: string[] = []
  for (const m of linha.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`]*)`/g)) {
    const corpo = m[1] ?? m[2] ?? m[3] ?? ''
    if (m[3] !== undefined && corpo.includes('${')) continue // crase com interpolação não é literal
    out.push(corpo)
  }
  for (const trecho of linha.split(/[<>{}]/)) out.push(trecho)
  return out
}

/** O nome aposentado que a linha usa como rótulo inteiro, ou null. */
export function rotuloAposentado(linha: string): string | null {
  if (LINHA_DE_COMENTARIO.test(linha)) return null
  for (const c of candidatosDaLinha(linha)) {
    const t = c.trim()
    if (t && (NOMES_APOSENTADOS.test(t) || ROTULO_COGNITIVO.test(t))) return t
  }
  return null
}

function collectFiles(pathRel: string): string[] {
  const full = join(ROOT, pathRel)
  if (!existsSync(full)) return []
  const st = statSync(full)
  if (st.isFile()) return /\.(ts|tsx)$/.test(full) ? [full] : []
  if (!st.isDirectory()) return []
  const out: string[] = []
  for (const entry of readdirSync(full)) {
    // __tests__ nomeia os nomes aposentados de propósito (inclusive ESTE arquivo).
    if (entry === '__tests__' || entry === 'node_modules') continue
    out.push(...collectFiles(join(pathRel, entry)))
  }
  return out
}

/** As linhas de código (não comentário) de um arquivo do repositório. */
function linhasDeCodigo(rel: string): string[] {
  return readFileSync(join(ROOT, rel), 'utf-8')
    .split('\n')
    .filter((l) => !LINHA_DE_COMENTARIO.test(l))
}

describe('JORN-48 / D-15 — (i) nenhum rótulo de `src/` usa um nome aposentado dos instrumentos', () => {
  it('nenhuma string literal nem texto JSX é, inteiro, um nome que o D-15 aposentou', () => {
    const achados: string[] = []
    for (const file of SCAN_ROOTS.flatMap((p) => collectFiles(p))) {
      readFileSync(file, 'utf-8')
        .split('\n')
        .forEach((text, idx) => {
          const nome = rotuloAposentado(text)
          if (nome) achados.push(`  ${relative(ROOT, file)}:${idx + 1}  «${nome}»  ${text.trim()}`)
        })
    }
    if (achados.length > 0) {
      throw new Error(
        'D-15 — nome aposentado usado como rótulo. O textual é «Prova cognitiva»; o Raven é ' +
          `«Raciocínio lógico (Matrizes)»:\n${achados.join('\n')}`,
      )
    }
    expect(achados).toHaveLength(0)
  })
})

/**
 * (ii) Escopo deliberado: as superfícies que o D-15 nomeia e o nome que cada uma tem de
 * carregar, numa linha de código (comentário não conta).
 */
const SUPERFICIES: { arquivo: string; nome: RegExp; rotulo: string }[] = [
  { arquivo: 'src/features/avaliacao/components/AvaliacaoContainer.tsx', nome: /Prova cognitiva/, rotulo: 'Prova cognitiva' },
  { arquivo: 'src/features/hub-candidato/components/HubCandidatoRH.tsx', nome: /Prova cognitiva/, rotulo: 'Prova cognitiva' },
  { arquivo: 'src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx', nome: /Raciocínio lógico \(Matrizes\)/, rotulo: 'Raciocínio lógico (Matrizes)' },
  { arquivo: 'src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx', nome: /Raciocínio lógico \(Matrizes\)/, rotulo: 'Raciocínio lógico (Matrizes)' },
  { arquivo: 'src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts', nome: /Raciocínio lógico \(Matrizes\) liberado/, rotulo: 'Raciocínio lógico (Matrizes) liberado (toast)' },
  { arquivo: 'src/features/privacidade/services/exportacaoService.ts', nome: /Raciocínio lógico \(Matrizes\)/, rotulo: 'Raciocínio lógico (Matrizes) (rótulos de exportação)' },
  { arquivo: 'src/features/privacidade/services/exportacaoService.ts', nome: /prova cognitiva/i, rotulo: 'prova cognitiva (rótulos de exportação)' },
]

describe('JORN-48 / D-15 — (ii) as superfícies que o D-15 nomeia carregam os nomes novos', () => {
  it.each(SUPERFICIES.map((s) => [s.arquivo, s.rotulo, s] as const))(
    '%s carrega «%s»',
    (_arquivo, _rotulo, s) => {
      expect(existsSync(join(ROOT, s.arquivo))).toBe(true)
      expect(linhasDeCodigo(s.arquivo).some((l) => s.nome.test(l))).toBe(true)
    },
  )
})

describe('JORN-48 / D-15 — (iii) sanidade: a regra casa o que deve e só o que deve', () => {
  const CASAM = [
    `const a = 'Avaliação cognitiva'`,
    `titulo="  avaliação Cognitiva "`,
    'heading: `Prova de raciocínio`,',
    '<h3>Raciocínio lógico</h3>',
    `cognitivo: 'Cognitivo',`,
    `const CONTEXT_CHIPS = ['Big Five', " Cognitivo "]`,
    '<span>Cognitivo</span>',
    `heading: 'Prova de raciocínio lógico',`,
    '          Avaliação de raciocínio',
    `const b = 'Avaliacao cognitiva'`,
  ]
  it.each(CASAM)('casa: %s', (linha) => {
    expect(rotuloAposentado(linha)).not.toBeNull()
  })

  const NAO_CASAM = [
    `titulo: 'Prova cognitiva',`,
    `<h3>Raciocínio lógico (Matrizes)</h3>`,
    `const copy = 'Sua avaliação comportamental/cognitiva começa agora.'`,
    `'avaliação comportamental/cognitiva'`,
    `razao: 'Idem, avaliação cognitiva.',`,
    `const t = 'Esta etapa faz parte da avaliação cognitiva da vaga e leva alguns minutos.'`,
    `const k = 'cognitivo'`,
    `const k = "cognitivo"`,
    'const k = `cognitivo`',
    `queryKey: ['cognitivo', candidaturaId],`,
    `if (tipo === 'cognitivo') {`,
    `// titulo antigo: 'Avaliação cognitiva'`,
    ` * <h3>Raciocínio lógico</h3> em docblock`,
    'const m = `${nome} — Avaliação cognitiva`',
  ]
  it.each(NAO_CASAM)('não casa: %s', (linha) => {
    expect(rotuloAposentado(linha)).toBeNull()
  })

  it('a varredura alcança ≥ 100 arquivos de `src/` (um walk quebrado não passa vazio)', () => {
    const files = SCAN_ROOTS.flatMap((p) => collectFiles(p))
    expect(files.length).toBeGreaterThanOrEqual(100)
    expect(files.some((f) => f.endsWith('exportacaoService.ts'))).toBe(true)
    expect(files.some((f) => f.includes(`${'__tests__'}`))).toBe(false)
  })
})
