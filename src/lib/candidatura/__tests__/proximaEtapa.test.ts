/**
 * Tabela-verdade de `proximaEtapaDeTrabalho` (Phase 49 / plano 49-05 · D-36).
 *
 * Este arquivo é o contrato que as TRÊS telas do «Avançar» passam a compartilhar (Kanban, hub do
 * RH e — no plano 49-22 — o comparativo). Antes dele, cada tela tinha a sua própria aritmética e
 * nenhuma tinha teste: uma mudança de ordem do funil podia acertar duas telas e esquecer a
 * terceira sem nada reprovar.
 *
 * Forma herdada de `candidaturaEncerrada.test.ts` (tabela como DADO, `it.each`), pela mesma razão:
 * um caso acrescentado fica visível como linha.
 *
 * @see src/lib/candidatura/proximaEtapa.ts
 */
import { describe, it, expect } from 'vitest'
import { ETAPAS_DE_TRABALHO, proximaEtapaDeTrabalho } from '../proximaEtapa'

describe('proximaEtapaDeTrabalho(etapa)', () => {
  it.each([
    // a cadeia inteira das 6 etapas de trabalho, na ordem do funil
    ['inscricao', 'triagem'],
    ['triagem', 'avaliacao_assincrona'],
    ['avaliacao_assincrona', 'entrevista_online'],
    ['entrevista_online', 'entrevista_presencial'],
    ['entrevista_presencial', 'decisao_final'],
    // fim da linha: depois da decisão final não há etapa de trabalho, há decisão
    ['decisao_final', undefined],
    // terminais — não se «avança» para/de dentro deles pelo funil
    ['aprovado', undefined],
    ['rejeitado', undefined],
    // ausência e valor desconhecido (allowlist, não denylist)
    [null, undefined],
    [undefined, undefined],
    ['desconhecida', undefined],
    ['', undefined],
  ] as const)('(%s) → %s', (etapa, esperado) => {
    expect(proximaEtapaDeTrabalho(etapa)).toBe(esperado)
  })

  it('a lista são as 6 etapas de trabalho, na ordem, sem os terminais', () => {
    expect([...ETAPAS_DE_TRABALHO]).toEqual([
      'inscricao',
      'triagem',
      'avaliacao_assincrona',
      'entrevista_online',
      'entrevista_presencial',
      'decisao_final',
    ])
    expect(ETAPAS_DE_TRABALHO).not.toContain('aprovado')
    expect(ETAPAS_DE_TRABALHO).not.toContain('rejeitado')
  })

  it('a cadeia é fechada: seguir a próxima etapa a partir da primeira percorre a lista inteira', () => {
    // Prova de forma, não de valor: se alguém acrescentar uma etapa no meio da lista e esquecer
    // de acertar um dos casos acima, esta travessia ainda descreve a lista viva — e o caso
    // literal acima reprova. As duas asserções juntas é que fixam o contrato.
    const percorrida: string[] = ['inscricao']
    let atual: string | undefined = 'inscricao'
    while (atual) {
      atual = proximaEtapaDeTrabalho(atual)
      if (atual) percorrida.push(atual)
    }
    expect(percorrida).toEqual([...ETAPAS_DE_TRABALHO])
  })
})
