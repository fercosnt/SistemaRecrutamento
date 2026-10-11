/**
 * Guarda do espelho DEFAULT_COMPETENCIAS — cliente × servidor (Phase 52 / 52-26, F13).
 *
 * Desde a migration `20261011000005_p52_sjt_uuid_e_nota_completa`, a
 * `salvar_avaliacao_entrevista` de 4 argumentos exige nota 1–5 para TODA competência do conjunto
 * que a tela renderiza — e, quando a análise não traz nenhum nome, esse conjunto é a lista
 * `DEFAULT_COMPETENCIAS` de `EntrevistaScorecardInline.tsx`. O servidor guarda uma CÓPIA dessa
 * lista numa linha única da migration, terminada pelo comentário marcador. Se as duas divergirem,
 * a tela pede notas para nomes que o servidor recusa como «fora» (ou o servidor exige um nome que
 * a tela não mostra) e o RH nunca consegue salvar.
 *
 * Este teste lê a migration (texto GERADO por `scripts/geradores/gen-p52-gap.cjs`) e confere:
 * a linha marcadora aparece exatamente uma vez, e os literais entre aspas simples dela são os
 * nomes de `DEFAULT_COMPETENCIAS`, na mesma ordem. E prova que a guarda MORDE: o mesmo
 * comparador sobre uma cópia do texto com um nome trocado reprova.
 *
 * Divergiu? Mude a lista nos DOIS lados (a da migration, pelo gerador — nunca à mão — e numa
 * migration nova se a 0005 já estiver aplicada).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_COMPETENCIAS } from '../components/EntrevistaScorecardInline'

const ROOT = resolve(__dirname, '../../../..')
const MIGRATION = 'supabase/migrations/20261011000005_p52_sjt_uuid_e_nota_completa.sql'
const MARCADOR = 'F13: espelho de DEFAULT_COMPETENCIAS'

/** Os literais SQL ('…', com '' como aspa escapada) da ÚNICA linha que traz o marcador. */
function extrairEspelho(texto: string): string[] {
  const linhas = texto.split('\n').filter((l) => l.includes(MARCADOR))
  if (linhas.length !== 1) {
    throw new Error(`a linha marcadora "${MARCADOR}" aparece ${linhas.length} vez(es) (esperado 1)`)
  }
  return [...linhas[0].matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"))
}

/** Mesmos nomes, mesma ordem. */
function espelhoConfere(texto: string, lista: readonly string[]): boolean {
  let nomes: string[]
  try {
    nomes = extrairEspelho(texto)
  } catch {
    return false
  }
  return nomes.length === lista.length && nomes.every((n, i) => n === lista[i])
}

describe('DEFAULT_COMPETENCIAS — espelho na migration 20261011000005 (F13)', () => {
  const texto = readFileSync(resolve(ROOT, MIGRATION), 'utf8')

  it('a lista da linha marcadora da migration é DEFAULT_COMPETENCIAS (mesmos nomes, mesma ordem)', () => {
    const nomes = extrairEspelho(texto)
    // numa linha (nomes e ordem) e depois estrutural
    expect(nomes.join(' | ')).toBe(DEFAULT_COMPETENCIAS?.join(' | '))
    expect(nomes).toEqual(DEFAULT_COMPETENCIAS)
    expect(espelhoConfere(texto, DEFAULT_COMPETENCIAS)).toBe(true)
  })

  it('a linha marcadora aparece exatamente uma vez', () => {
    expect(texto.split('\n').filter((l) => l.includes(MARCADOR))).toHaveLength(1)
  })

  it('a guarda morde: com um nome trocado na cópia do texto, o comparador reprova', () => {
    const primeiro = DEFAULT_COMPETENCIAS[0]
    const linha = texto.split('\n').find((l) => l.includes(MARCADOR)) ?? ''
    expect(linha).toContain(`'${primeiro}'`)
    const mutado = texto.replace(linha, linha.replace(`'${primeiro}'`, `'${primeiro} (trocado)'`))
    expect(mutado).not.toBe(texto)
    expect(espelhoConfere(mutado, DEFAULT_COMPETENCIAS)).toBe(false)
    // e a ordem também conta
    const invertido = texto.replace(
      linha,
      linha.replace(`'${DEFAULT_COMPETENCIAS[0]}', '${DEFAULT_COMPETENCIAS[1]}'`, `'${DEFAULT_COMPETENCIAS[1]}', '${DEFAULT_COMPETENCIAS[0]}'`),
    )
    expect(invertido).not.toBe(texto)
    expect(espelhoConfere(invertido, DEFAULT_COMPETENCIAS)).toBe(false)
  })
})
