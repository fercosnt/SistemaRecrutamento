/**
 * Phase 47 / Plano 47-04 Task 2 — o PORTÃO DE COPY do escopo
 * `src/features/transparencia/`.
 *
 * Clonado do molde da Phase 43 (`src/__tests__/copyPortoesLgpd.test.ts`) com os quatro
 * idiomas dele, e cada um existe por uma razão medida:
 *
 * 1. **Diretório ausente é ZERO OCORRÊNCIA, nunca erro.** É o que permite este portão
 *    nascer na primeira wave e já estar montado quando a segunda página chegar (47-06):
 *    um `readdirSync` sobre caminho inexistente trocaria "a superfície está limpa" por
 *    "a suíte quebrou".
 * 2. **Nenhum literal proibido escrito verbatim.** Todos montados por junção de
 *    fragmentos — um portão que contém a string que proíbe é a primeira violação de si
 *    mesmo, e este arquivo mora DENTRO do escopo que ele varre.
 * 3. **Dobra de acento preservando ÍNDICES**, caractere a caractere: `normalize('NFD')`
 *    sobre a string inteira desloca os índices e faria o relatório apontar a linha errada.
 * 4. **Escopo declarado por família.** Este projeto já produziu duas vezes o defeito de
 *    escrever um grep repo-wide que reprova a própria spec.
 *
 * ── A ASSERÇÃO POSITIVA ─────────────────────────────────────────────────────
 * Um portão só de proibições verifica que a página não mente; não verifica que ela diz
 * alguma coisa. O carimbo de vigência com data válida é o mínimo que a Invariante 1 da
 * 47-UI-SPEC exige de toda linha desta feature: derivada ou DATADA.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§Copywriting Contract)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { COPY_TRANSPARENCIA, formatarDataPtBr } from '../constants/copyTransparencia'
import { LISTA_MEDIDA_EM } from '../constants/subprocessadores'

const RAIZ = resolve(__dirname, '../../../..')
const FEATURE = join(RAIZ, 'src/features/transparencia')

const EXTENSOES = ['.ts', '.tsx']
const IGNORADOS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage'])

/** ⚠ AUSÊNCIA NÃO É ERRO — é ZERO OCORRÊNCIA. Ver o idioma 1 do cabeçalho. */
function varrer(alvo: string): string[] {
  if (!existsSync(alvo)) return []
  if (statSync(alvo).isFile()) return [alvo]

  const encontrados: string[] = []
  for (const entrada of readdirSync(alvo, { withFileTypes: true })) {
    if (IGNORADOS.has(entrada.name)) continue
    const caminho = join(alvo, entrada.name)
    if (entrada.isDirectory()) encontrados.push(...varrer(caminho))
    else if (EXTENSOES.some((e) => entrada.name.endsWith(e))) encontrados.push(caminho)
  }
  return encontrados
}

/** Dobra acento e caixa preservando os ÍNDICES 1:1 com o texto original (idioma 3). */
function dobrar(texto: string): string {
  let saida = ''
  for (const ch of texto) {
    const semAcento = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
    saida += (semAcento.length > 0 ? semAcento[0] : ch).toLowerCase()
  }
  return saida
}

function linhaDoIndice(texto: string, indice: number): number {
  let linha = 1
  for (let i = 0; i < indice && i < texto.length; i++) if (texto[i] === '\n') linha++
  return linha
}

interface Ocorrencia {
  arquivo: string
  linha: number
  trecho: string
}

function relatar(ocorrencias: Ocorrencia[]): string {
  return ocorrencias
    .map((o) => `  ${o.arquivo.replace(`${RAIZ}/`, '')}:${o.linha} → "${o.trecho.trim()}"`)
    .join('\n')
}

function procurar(alvos: string[], padroes: RegExp[]): Ocorrencia[] {
  const achados: Ocorrencia[] = []
  for (const arquivo of alvos.flatMap(varrer)) {
    const texto = readFileSync(arquivo, 'utf8')
    const dobrado = dobrar(texto)
    for (const padrao of padroes) {
      for (const m of dobrado.matchAll(new RegExp(padrao.source, `${padrao.flags}g`))) {
        const idx = m.index ?? 0
        achados.push({
          arquivo,
          linha: linhaDoIndice(texto, idx),
          trecho: texto.slice(Math.max(0, idx - 40), idx + 60).replace(/\n/g, ' '),
        })
      }
    }
  }
  return achados
}

/** Monta um padrão sem que ele apareça contíguo neste arquivo (idioma 2). */
const p = (...partes: string[]) => new RegExp(partes.join(''), 'i')

// ─────────────────────────────────────────────────────────────────────────────
// As cinco famílias — todas com escopo na feature e esperado ZERO
// ─────────────────────────────────────────────────────────────────────────────

/** Construções elásticas: transformam um fato verificável numa promessa. */
const ELASTICAS = [
  p('\\bpo', 'demos\\b'),
  p('\\bpode', 'remos\\b'),
  p('\\beventual', 'mente\\b'),
  p('a nosso ', 'crite', 'rio'),
  p('entre ', 'out', 'ros\\b'),
  p('\\bet', 'c\\.'),
  p('dentre ', 'out', 'ras\\b'),
]

/** Vocabulário técnico banido pela §Invariante 4 — a redação travada é outra. */
const ENGENHARIA = [
  p('anonim', 'izad'),
  p('pseudonim', 'izad'),
  p('tomb', 'stone'),
  p('desvincul', 'ad'),
  p('\\bha', 'sh\\b'),
]

/** Expressões de totalidade sobre exclusão — factualmente falsas neste sistema. */
const TOTALIDADE = [
  p('todos os seus ', 'dad', 'os'),
  p('tudo o que temos sobre ', 'vo', 'ce'),
  p('apaga', 'mos tudo'),
]

/** Os quatro marcadores de indefinição — um campo vazio é uma omissão publicada. */
const MARCADORES = [
  p('nao\\s+', 'infor', 'mado'),
  p('\\ba\\s+', 'defi', 'nir\\b'),
  p('\\bt', 'b', 'd\\b'),
  p('\\ba\\s+', 'confir', 'mar\\b'),
]

/** Nomes de objeto de banco banidos pela §Invariante 11 — mapa de schema de graça. */
const OBJETOS_DE_BANCO = [
  p('data_dele', 'tion_log'),
  p('delete_candi', 'date_data'),
]

const FAMILIAS: Array<{ nome: string; padroes: RegExp[]; porque: string }> = [
  {
    nome: 'construções elásticas',
    padroes: ELASTICAS,
    porque:
      'Invariante 1: toda linha desta feature é derivada ou datada. Uma lista de empresas ' +
      'com "e outras" é literalmente a confissão de que a lista está incompleta.',
  },
  {
    nome: 'vocabulário de engenharia',
    padroes: ENGENHARIA,
    porque:
      'Invariante 4: são termos de engenharia e de jurista, e a página pública é lida por ' +
      'quem se candidata a uma vaga. A redação travada desde a 45-UI-SPEC é outra.',
  },
  {
    nome: 'totalidade sobre exclusão',
    padroes: TOTALIDADE,
    porque:
      'É factualmente falso: a justificativa do recrutador sobrevive sem ligação com o ' +
      'titular, e a trilha de decisão sobrevive inteira.',
  },
  {
    nome: 'marcadores de indefinição',
    padroes: MARCADORES,
    porque:
      'Invariante 5: um campo por preencher numa declaração de transferência internacional ' +
      'não é um espaço reservado, é uma omissão publicada.',
  },
  {
    nome: 'nomes de objeto de banco',
    padroes: OBJETOS_DE_BANCO,
    porque:
      'Invariante 11: nome de tabela e de função em página pública é mapa de schema ' +
      'oferecido de graça.',
  },
]

describe('portão de copy — escopo `src/features/transparencia/`', () => {
  it.each(FAMILIAS)('zero ocorrências da família «$nome»', ({ padroes, porque }) => {
    const ocorrencias = procurar([FEATURE], padroes)
    expect(ocorrencias.length, `${porque}\n${relatar(ocorrencias)}`).toBe(0)
  })

  it('o portão trata diretório ausente como ZERO ocorrência, nunca como erro', () => {
    const inexistente = join(RAIZ, 'src/features/uma-feature-que-nao-existe')
    expect(existsSync(inexistente)).toBe(false)
    expect(() => varrer(inexistente)).not.toThrow()
    expect(varrer(inexistente)).toEqual([])
    expect(procurar([inexistente], ELASTICAS)).toEqual([])
  })

  it('o portão NÃO é vácuo: ele está varrendo arquivos de verdade nesta feature', () => {
    const varridos = varrer(FEATURE).map((f) => f.replace(`${RAIZ}/`, ''))
    expect(varridos.length).toBeGreaterThan(0)
    expect(varridos).toContain('src/features/transparencia/constants/subprocessadores.ts')
    expect(varridos).toContain('src/features/transparencia/constants/copyTransparencia.ts')
    expect(varridos).toContain(
      'src/features/transparencia/components/SubprocessadoresPage.tsx',
    )
  })

  it('o portão MORDE: uma família encontra a si mesma quando o texto está contíguo', () => {
    // Prova de não-vacuidade sem sujar a feature: o padrão é aplicado a um texto
    // sintético, montado aqui, que contém a construção elástica de verdade.
    const sintetico = dobrar(['Nós po', 'demos', ' guardar mais tempo.'].join(''))
    expect(ELASTICAS.some((padrao) => padrao.test(sintetico))).toBe(true)
  })
})

describe('a asserção positiva — o carimbo de vigência existe e traz data válida', () => {
  it('a copy da página declara o prefixo do carimbo', () => {
    expect(COPY_TRANSPARENCIA.subprocessadores.carimboPrefixo.trim()).not.toBe('')
  })

  it('a data da lista formata como dd/mm/aaaa no idioma vivo do projeto', () => {
    const formatada = formatarDataPtBr(LISTA_MEDIDA_EM)
    expect(formatada).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(formatada).toBe('09/08/2026')
  })

  it('uma data inválida é falha, nunca um traço renderizado', () => {
    expect(() => formatarDataPtBr('')).toThrow()
    expect(() => formatarDataPtBr('nao-e-uma-data')).toThrow()
  })
})
