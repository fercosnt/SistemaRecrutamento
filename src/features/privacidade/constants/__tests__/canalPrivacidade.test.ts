/**
 * O canal de privacidade é UM endereço — e ele tem de ser lido por alguém.
 *
 * 2026-10-06, decisão do operador: o endereço que o sistema inteiro publicava como
 * canal de privacidade NUNCA existiu como caixa lida. Todo titular que seguiu a
 * instrução «escreva para o nosso canal de privacidade» escreveu para lugar nenhum.
 * O canal passa à caixa real do RH — a mesma que já é o Reply-To dos e-mails
 * (`supabase/functions/_shared/email-config.ts`).
 *
 * O que esta suíte prende, e por quê cada coisa:
 *
 * (cp1) O VALOR LITERAL. Os outros testes da feature asserem «usa a constante» — o que
 *       é certo para a intenção deles, e cego para este defeito: com a constante
 *       apontando para uma caixa morta, todos continuavam verdes. Este é o único lugar
 *       onde o endereço é escrito à mão, de propósito.
 * (cp2) A MESMA CAIXA do Reply-To. Lido como TEXTO (não importado): o módulo do e-mail
 *       usa `Deno.env` e arrastaria um erro de tipo para o `tsc` do front. Se um dos
 *       dois mudar, este caso reprova e obriga a decidir se a caixa mudou mesmo.
 * (cp3) O ENDEREÇO MORTO não está em arquivo nenhum de `src/`. Montado em runtime
 *       (idioma 42-11): um teste que proíbe um literal e o contém é a própria primeira
 *       violação.
 * (cp4) FONTE ÚNICA: nenhum arquivo de produção fora do módulo da constante escreve o
 *       endereço do canal. Foi assim que o defeito sobreviveu à constante: o passo de
 *       autorizações do cadastro tinha o endereço digitado à mão, e trocar a constante
 *       não o alcançava.
 *
 * @see .planning/DECISAO-ENCARREGADO.md (nota de 2026-10-06)
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { CANAL_PRIVACIDADE_EMAIL } from '../canalPrivacidade'

// src/features/privacidade/constants/__tests__ → cinco níveis até a raiz do repositório.
const ROOT = resolve(__dirname, '../../../../..')
const MODULO_DO_CANAL = 'src/features/privacidade/constants/canalPrivacidade.ts'
const PASSO_DO_CADASTRO = 'src/features/cadastro/components/steps/AutorizacoesStep.tsx'

function arquivosDe(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho)
    return /\.(ts|tsx)$/.test(nome) ? [relative(ROOT, caminho)] : []
  })
}

const ehTeste = (f: string) => /(^|\/)__tests__\//.test(f) || /\.(test|spec)\.tsx?$/.test(f)

/** Arquivos (relativos à raiz) cujo texto contém `alvo`. */
function quemContem(arquivos: string[], alvo: string): string[] {
  return arquivos.filter((f) => readFileSync(join(ROOT, f), 'utf8').includes(alvo)).sort()
}

const TODOS = arquivosDe(join(ROOT, 'src'))
const PRODUCAO = TODOS.filter((f) => !ehTeste(f))

describe('o canal de privacidade (decisão do operador, 2026-10-06)', () => {
  it('(cp1) é a caixa real do RH — o endereço anterior nunca foi lido por ninguém', () => {
    expect(
      CANAL_PRIVACIDADE_EMAIL,
      'o canal de privacidade tem de ser uma caixa que alguém lê — ver DECISAO-ENCARREGADO.md, 2026-10-06',
    ).toBe('rh@beautysmile.com.br')
  })

  it('(cp2) é a mesma caixa do Reply-To dos e-mails ao candidato', () => {
    const config = readFileSync(join(ROOT, 'supabase/functions/_shared/email-config.ts'), 'utf8')
    const replyTo = config.match(/export const REPLY_TO = '([^']+)'/)?.[1]
    expect(replyTo, 'REPLY_TO ilegível em email-config.ts — o formato da declaração mudou').toBeTruthy()
    expect(
      CANAL_PRIVACIDADE_EMAIL,
      'canal e Reply-To divergiram: decida se a caixa humana mudou e mude os dois juntos',
    ).toBe(replyTo)
  })

  it('(cp3) o endereço morto não está em arquivo nenhum de src/', () => {
    const morto = ['lgpd', 'beautysmile.com.br'].join('@')
    // A varredura enxerga o lugar onde o defeito morava (e esta própria suíte):
    // um alcance que não chegasse lá aprovaria pelo vazio.
    expect(TODOS).toContain(PASSO_DO_CADASTRO)
    expect(TODOS).toContain(MODULO_DO_CANAL)
    expect(quemContem(TODOS, morto), 'endereço morto do canal de privacidade').toEqual([])
  })

  it('(cp4) só o módulo da constante escreve o endereço do canal', () => {
    // O detector morde: o próprio módulo é achado pelo valor que exporta.
    expect(quemContem([MODULO_DO_CANAL], CANAL_PRIVACIDADE_EMAIL)).toEqual([MODULO_DO_CANAL])
    expect(
      quemContem(PRODUCAO, CANAL_PRIVACIDADE_EMAIL),
      'endereço do canal digitado fora da constante — importe CANAL_PRIVACIDADE_EMAIL',
    ).toEqual([MODULO_DO_CANAL])
  })
})
