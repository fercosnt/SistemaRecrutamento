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
 * (cp3) O ENDEREÇO MORTO não está em arquivo nenhum de onde ele pode chegar ao titular:
 *       `src/`, `supabase/functions/` (inclusive `_shared/consent-text.json`, que o
 *       passo de autorizações IMPORTA e que portanto vai no bundle), `index.html` e
 *       `public/`, extensões `ts|tsx|json|html`, testes inclusive (44-19, WR-06 — até ali
 *       a varredura só lia `src/**.ts(x)`). Montado em runtime (idioma 42-11): um teste
 *       que proíbe um literal e o contém é a própria primeira violação.
 * (cp4) FONTE ÚNICA: nenhum arquivo de produção do front fora do módulo da constante
 *       escreve o endereço do canal. Foi assim que o defeito sobreviveu à constante: o
 *       passo de autorizações do cadastro tinha o endereço digitado à mão, e trocar a
 *       constante não o alcançava. Casamento por FRONTEIRA (44-19, WR-06): `novo.rh@…`
 *       ou `vagas.rh@…` NÃO são o canal, e um `includes` os acusava com diagnóstico falso.
 * (cp5) A FRONTEIRA nos dois sentidos: o detector do cp4 não casa os prefixos e casa o
 *       endereço entre aspas, depois de `: ` e no começo da linha. Um detector de
 *       fronteira que nunca casa aprovaria o cp4 pelo vazio.
 *
 * Fora do repositório, a cópia de e-mail mantida no banco (`templates_email`, copy
 * editável por admin) foi medida só leitura em PROD em 2026-10-07 (44-19-SUMMARY).
 *
 * @see .planning/DECISAO-ENCARREGADO.md (nota de 2026-10-06)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { CANAL_PRIVACIDADE_EMAIL } from '../canalPrivacidade'

// src/features/privacidade/constants/__tests__ → cinco níveis até a raiz do repositório.
const ROOT = resolve(__dirname, '../../../../..')
const MODULO_DO_CANAL = 'src/features/privacidade/constants/canalPrivacidade.ts'
const PASSO_DO_CADASTRO = 'src/features/cadastro/components/steps/AutorizacoesStep.tsx'
const CONSENT_IMPORTADO_PELO_BUNDLE = 'supabase/functions/_shared/consent-text.json'
const INDEX_HTML = 'index.html'

const EXTENSOES = ['ts', 'tsx', 'json', 'html'] as const
/** Diretórios que não são fonte: dependências e saída de build. */
const PULAR = new Set(['node_modules', 'build', 'dist'])

/** Arquivos (relativos à raiz) sob `alvo` — diretório ou arquivo — com uma das `extensoes`. */
function arquivosDe(alvo: string, extensoes: readonly string[] = EXTENSOES): string[] {
  const absoluto = join(ROOT, alvo)
  if (!existsSync(absoluto)) return []
  const extensao = new RegExp(`\\.(${extensoes.join('|')})$`)
  if (!statSync(absoluto).isDirectory()) return extensao.test(alvo) ? [alvo] : []
  return readdirSync(absoluto).flatMap((nome) =>
    PULAR.has(nome) && statSync(join(absoluto, nome)).isDirectory() ? [] : arquivosDe(join(alvo, nome), extensoes),
  )
}

const ehTeste = (f: string) => /(^|\/)__tests__\//.test(f) || /\.(test|spec)\.tsx?$/.test(f)

/** Arquivos (relativos à raiz) cujo texto satisfaz `detector`. */
function quemContem(arquivos: string[], detector: (texto: string) => boolean): string[] {
  return arquivos.filter((f) => detector(readFileSync(join(ROOT, f), 'utf8'))).sort()
}

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * O endereço do canal em FRONTEIRA: o caractere anterior não pode ser de parte local de
 * e-mail (`novo.rh@…` e `vagas.rh@…` não são o canal). `i` porque e-mail não distingue
 * caixa; `m` para que o começo de cada linha conte como fronteira.
 */
const CANAL_EM_FRONTEIRA = new RegExp('(^|[^a-z0-9._%+-])' + escaparRegex(CANAL_PRIVACIDADE_EMAIL), 'im')
const temCanal = (texto: string) => CANAL_EM_FRONTEIRA.test(texto)

/** cp3 — onde o endereço morto pode voltar e chegar ao titular. */
const ALCANCE_CP3 = [
  ...arquivosDe('src'),
  ...arquivosDe('supabase/functions'),
  ...arquivosDe(INDEX_HTML),
  ...arquivosDe('public'),
]
/** cp4 — produção do front: `src/`, sem testes. */
const PRODUCAO = arquivosDe('src').filter((f) => !ehTeste(f))

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

  it('(cp3) o endereço morto não está em src/, supabase/functions/, index.html nem public/', () => {
    const morto = ['lgpd', 'beautysmile.com.br'].join('@')
    const temMorto = (texto: string) => texto.includes(morto)
    // A varredura enxerga o lugar onde o defeito morava, esta própria suíte, o `.json`
    // que o bundle importa de `supabase/functions/_shared` e o `index.html`: um alcance
    // que não chegasse lá aprovaria pelo vazio.
    for (const f of [PASSO_DO_CADASTRO, MODULO_DO_CANAL, CONSENT_IMPORTADO_PELO_BUNDLE, INDEX_HTML]) {
      expect(ALCANCE_CP3, `cp3: o alcance não chega a ${f}`).toContain(f)
    }
    // O detector morde (em memória — nenhum arquivo com o endereço morto é escrito).
    expect(temMorto(`{"contato": "${morto}"}`), 'cp3: o detector não acha o endereço morto num texto que o contém').toBe(true)
    expect(quemContem(ALCANCE_CP3, temMorto), 'endereço morto do canal de privacidade').toEqual([])
  })

  it('(cp4) só o módulo da constante escreve o endereço do canal (produção do front, por fronteira)', () => {
    // O detector morde: o próprio módulo é achado pelo valor que exporta.
    expect(quemContem([MODULO_DO_CANAL], temCanal)).toEqual([MODULO_DO_CANAL])
    expect(
      quemContem(PRODUCAO, temCanal),
      'o endereço do canal aparece em produção do front fora do módulo da constante. Pode ser o canal de ' +
        'privacidade digitado à mão (importe CANAL_PRIVACIDADE_EMAIL) OU outro uso da caixa do RH — contato de ' +
        'carreiras, placeholder de login —, que hoje é também o canal de privacidade: esse caso se decide com o operador',
    ).toEqual([MODULO_DO_CANAL])
  })

  it('(cp5) o detector do cp4 casa só em fronteira — controle nos dois sentidos', () => {
    // Não é o canal: outra parte local que TERMINA no mesmo texto.
    for (const prefixado of [`novo.${CANAL_PRIVACIDADE_EMAIL}`, `vagas.${CANAL_PRIVACIDADE_EMAIL}`]) {
      expect(temCanal(`const placeholder = '${prefixado}'`), `cp5: «${prefixado}» não é o canal`).toBe(false)
    }
    // É o canal: entre aspas, depois de `: `, num mailto e no começo de uma linha.
    for (const texto of [
      `const email = '${CANAL_PRIVACIDADE_EMAIL}'`,
      `contato: ${CANAL_PRIVACIDADE_EMAIL}`,
      `<a href="mailto:${CANAL_PRIVACIDADE_EMAIL}">`,
      `primeira linha\n${CANAL_PRIVACIDADE_EMAIL} é o canal`,
    ]) {
      expect(temCanal(texto), `cp5: o endereço do canal em «${texto}» tem de casar`).toBe(true)
    }
  })
})
