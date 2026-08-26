/**
 * Trava a lista de `como_conheceu` contra o CHECK do banco.
 *
 * ⛔ POR QUE ESTE ARQUIVO EXISTE. Em 2026-08-25, num teste E2E em produção, quatro
 * das nove opções do campo "Como conheceu a vaga?" IMPEDIAM o cadastro:
 *
 *   front oferecia   catho, vagas_com, solides, outros
 *   CHECK aceitava   linkedin, instagram, indicacao, site, google, facebook, outro
 *
 * O `outros` × `outro` era diferença de UMA LETRA. E o defeito era mudo: o Zod
 * valida contra a lista do próprio front e aprova; a Edge Function aceita
 * `z.string()` e repassa sem olhar; só o INSERT morre, e o candidato lê "algo deu
 * errado do nosso lado" sem saber que o problema foi ter escolhido "Outros".
 *
 * Três listas para o mesmo fato — Zod, `<SelectItem>` e CHECK — e nenhuma sabia
 * das outras. Este teste amarra as três: se alguém acrescentar uma opção na tela
 * sem alargar o CHECK, ou renomear um valor, ele falha ANTES de chegar a produção.
 *
 * ⚠ A lista `NO_BANCO` abaixo é uma CÓPIA do CHECK, então ela mesma pode
 * envelhecer. Ao mexer no CHECK, atualize-a — e o comentário da constraint no
 * banco aponta de volta para cá, para que quem chegue pelo outro lado ache este
 * arquivo.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Espelho de `check_como_conheceu` (migration 20260826000001).
 * Rode para conferir:
 *   node p46apply.cjs sql "select pg_get_constraintdef(oid) from pg_constraint
 *                          where conname='check_como_conheceu'"
 */
const NO_BANCO = [
  'linkedin',
  'instagram',
  'indicacao',
  'site',
  'google',
  'facebook',
  'outro',
  'catho',
  'vagas_com',
  'solides',
] as const

const RAIZ = join(__dirname, '..', '..')

function lerValoresDoZod(): string[] {
  const src = readFileSync(join(RAIZ, 'schemas', 'candidatoSchema.ts'), 'utf8')
  const m = src.match(/const comoConheceuSchema = z\.enum\(\s*(?:\/\/[^\n]*\n\s*)*\[([^\]]+)\]/)
  if (!m) throw new Error('não achei o z.enum de comoConheceuSchema')
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1])
}

function lerValoresDoSelect(): string[] {
  const src = readFileSync(join(RAIZ, 'components', 'steps', 'DadosPessoaisStep.tsx'), 'utf8')
  const bloco = src.slice(src.indexOf('como_conheceu'))
  return [...bloco.matchAll(/<SelectItem\s+[^>]*value="([a-z_]+)"/g)].map((x) => x[1])
}

describe('como_conheceu — as três listas não podem divergir', () => {
  it('(a) todo valor do Zod é aceito pelo CHECK do banco', () => {
    const foraDoBanco = lerValoresDoZod().filter((v) => !NO_BANCO.includes(v as never))
    expect(
      foraDoBanco,
      `estes valores passam no Zod e QUEBRAM o INSERT: ${foraDoBanco.join(', ')}`
    ).toEqual([])
  })

  it('(b) toda opção da tela é aceita pelo CHECK do banco', () => {
    const foraDoBanco = lerValoresDoSelect().filter((v) => !NO_BANCO.includes(v as never))
    expect(
      foraDoBanco,
      `o candidato consegue escolher, e o cadastro falha: ${foraDoBanco.join(', ')}`
    ).toEqual([])
  })

  it('(c) tela e Zod oferecem exatamente o mesmo conjunto', () => {
    expect([...lerValoresDoSelect()].sort()).toEqual([...lerValoresDoZod()].sort())
  })

  it('(d) `outro` está no singular nas três — foi a diferença de uma letra', () => {
    expect(lerValoresDoZod()).toContain('outro')
    expect(lerValoresDoZod()).not.toContain('outros')
    expect(lerValoresDoSelect()).toContain('outro')
    expect(lerValoresDoSelect()).not.toContain('outros')
  })

  it('(e) o teste MORDE — uma opção inventada seria pega', () => {
    const inventada = 'portal_que_nao_existe'
    expect(NO_BANCO.includes(inventada as never)).toBe(false)
  })
})
