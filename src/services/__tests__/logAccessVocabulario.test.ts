/**
 * O vocabulário de `logs_acesso.evento`, travado nos DOIS lados.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ──────────────────────────────────────────────
 * Porque a ausência dele custou **quatro meses de log de segurança**.
 *
 * Até 2026-08-22, `EventoAcesso` era um `type` union e o CHECK `check_evento`
 * era uma constraint no banco. Duas listas, dois lugares, **zero mecanismo
 * comparando as duas**. Elas divergiram: o TS declarava 8 valores, o banco
 * aceitava 8 OUTROS, e a interseção era de TRÊS.
 *
 * Cinco valores do tipo eram ilegais no banco — inclusive `sessao_expirada`,
 * que é exatamente o que o único chamador vivo manda (`useSessionTimeout.ts`).
 * Aquele INSERT batia `23514` em toda execução, e `logAccessEvent` engole o erro
 * de propósito (*"logging é secundário ao processo de autenticação"*).
 *
 * Resultado medido em PROD: a tabela só tinha `login_sucesso` e `login_falha`, e
 * a última linha era de **2026-04-20**. Ninguém notou, porque um log que não
 * grava não reclama.
 *
 * ⚠ E o defeito não foi achado por teste, review ou tela. Foi achado por
 * ACIDENTE: a sonda de uma migration sobre OUTRO assunto usou um `evento`
 * inventado, o apply abortou com `23514`, e o gate — pegando o próprio autor —
 * expôs o CHECK.
 *
 * Este teste lê o SQL da migration e compara com a lista do TS. Não é elegante
 * ler um arquivo de migration num teste de unidade; é o que existe, e é
 * estritamente melhor que a prosa que havia antes.
 *
 * ⚠ LIMITE HONESTO: isto pina o TS contra o ARQUIVO de migration, não contra o
 * banco VIVO. Uma migration aplicada à mão em PROD e não commitada continuaria
 * invisível daqui — que é o defeito de escrituração que este projeto já pagou
 * mais de uma vez. Quem quiser a garantia forte mede `pg_get_constraintdef` num
 * smoke contra PROD.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { EVENTOS_ACESSO } from '../logAccessService'

const MIGRATION = resolve(
  __dirname,
  '../../../supabase/migrations/20260822000001_p47_check_evento_vocabulario.sql',
)

/** Extrai os literais entre aspas simples do bloco `ADD CONSTRAINT check_evento`. */
function valoresDoCheck(sql: string): string[] {
  const i = sql.indexOf('ADD CONSTRAINT check_evento')
  expect(i, 'o ADD CONSTRAINT check_evento sumiu da migration').toBeGreaterThan(-1)
  const fim = sql.indexOf(');', i)
  expect(fim, 'o bloco do CHECK não fecha').toBeGreaterThan(i)

  const corpo = sql.slice(i, fim)
  // Só as linhas que declaram valores — comentários `--` ficam de fora, e é por
  // isso que a extração é por linha e não por regex sobre o bloco inteiro: um
  // valor citado dentro de um comentário entraria na lista e o teste passaria a
  // medir prosa.
  const valores: string[] = []
  for (const linha of corpo.split('\n')) {
    const semComentario = linha.split('--')[0]
    for (const m of semComentario.matchAll(/'([a-z_]+)'/g)) valores.push(m[1])
  }
  return valores
}

describe('vocabulário de logs_acesso.evento', () => {
  it('o CHECK da migration e EVENTOS_ACESSO declaram exatamente o mesmo conjunto', () => {
    const doBanco = valoresDoCheck(readFileSync(MIGRATION, 'utf-8'))
    const doTs = [...EVENTOS_ACESSO]

    const faltamNoTs = doBanco.filter((v) => !doTs.includes(v as never))
    const faltamNoBanco = doTs.filter((v) => !doBanco.includes(v))

    expect(
      faltamNoTs,
      `Valores que o CHECK aceita e o TS não declara: ${faltamNoTs.join(', ')}. ` +
        `Não é inofensivo: um evento legal que o tipo desconhece nunca será emitido.`,
    ).toEqual([])

    expect(
      faltamNoBanco,
      `Valores que o TS declara e o CHECK RECUSA: ${faltamNoBanco.join(', ')}. ` +
        `É este o defeito que deixou o log morto de 2026-04-20 a 2026-08-22 — o INSERT ` +
        `bate 23514 e logAccessEvent ENGOLE o erro, então a falha é CALADA.`,
    ).toEqual([])
  })

  it('todo evento que o serviço realmente emite é legal no CHECK', () => {
    // Mede o CÓDIGO, não a lista: uma chamada com literal fora do vocabulário
    // passaria pelo tipo se alguém usasse `as EventoAcesso`, e o caso acima não veria.
    const fonte = readFileSync(resolve(__dirname, '../logAccessService.ts'), 'utf-8')
    const emitidos = [...fonte.matchAll(/logAccessEvent\(\s*'([a-z_]+)'/g)].map((m) => m[1])

    expect(emitidos.length, 'nenhuma chamada encontrada — o extrator quebrou').toBeGreaterThan(0)

    const ilegais = [...new Set(emitidos)].filter((e) => !(EVENTOS_ACESSO as readonly string[]).includes(e))
    expect(
      ilegais,
      `O serviço emite eventos fora do vocabulário: ${ilegais.join(', ')}`,
    ).toEqual([])
  })

  it('o chamador vivo do hook de sessão emite um evento legal', () => {
    // O caso que estava quebrado, pinado pelo NOME do arquivo que o quebrou.
    const hook = readFileSync(resolve(__dirname, '../../hooks/useSessionTimeout.ts'), 'utf-8')
    const chamadas = [...hook.matchAll(/logAccessEvent\(\s*'([a-z_]+)'/g)].map((m) => m[1])

    expect(chamadas.length, 'useSessionTimeout deixou de registrar sessão expirada').toBeGreaterThan(0)
    for (const e of chamadas) {
      expect(
        (EVENTOS_ACESSO as readonly string[]).includes(e),
        `useSessionTimeout emite '${e}', que não está no vocabulário. Foi exatamente ` +
          `assim — com 'sessao_expirada' fora do CHECK — que o log ficou 4 meses sem gravar.`,
      ).toBe(true)
    }
  })
})
