/**
 * Phase 44 / Plano 44-08 Task 3 — a fábrica de chaves da feature `pedidos-dados`
 * (EXPORT-05).
 *
 * ⚠ ARQUIVO DECLARADO EXPLICITAMENTE PELO 44-08 (o roster compartilhado dos sete planos
 * anteriores não o enumera). Ele existe porque duas propriedades da fábrica só são
 * observáveis como VALOR, e nenhuma delas aparece numa revisão de leitura:
 *
 *  · o filtro **participa** da chave da lista — sem isso as duas variantes do toggle
 *    seriam a MESMA entrada de cache, e alternar o switch mostraria a lista errada sem
 *    refetch e sem erro visível (precedente 42);
 *  · as quatro chaves da feature são distintas entre si e a raiz não colide com a da
 *    feature de revisão — chaves coincidentes fazem uma invalidação derrubar a query
 *    vizinha, também em silêncio.
 *
 * São asserções sobre valor puro: sem render, sem rede, sem `QueryClientProvider`.
 *
 * @see src/features/pedidos-dados/hooks/useFilaPedidosDados.ts (o módulo sob teste)
 */
import { describe, it, expect } from 'vitest'

import { revisoesKeys } from '@/features/revisao/hooks/useFilaRevisoes'
import { pedidosDadosKeys } from '../useFilaPedidosDados'

describe('(bj) o filtro participa da chave da lista', () => {
  const soNaoAtendidos = pedidosDadosKeys.list({ soNaoAtendidos: true })
  const visaoCompleta = pedidosDadosKeys.list({ soNaoAtendidos: false })

  it('as duas variantes do toggle produzem chaves DIFERENTES', () => {
    expect(JSON.stringify(soNaoAtendidos)).not.toBe(JSON.stringify(visaoCompleta))
  })

  // Comparação SEGMENTO A SEGMENTO, não por prefixo de string: a chave é um array, e
  // uma asserção sobre o JSON serializado passaria por acidente com um segmento que
  // apenas COMEÇA igual (`'list'` × `'listagem'`).
  it('as duas partem do prefixo hierárquico de lists()', () => {
    const prefixo = pedidosDadosKeys.lists()
    prefixo.forEach((segmento, i) => {
      expect(soNaoAtendidos[i]).toBe(segmento)
      expect(visaoCompleta[i]).toBe(segmento)
    })
    expect(soNaoAtendidos).toHaveLength(prefixo.length + 1)
    expect(visaoCompleta).toHaveLength(prefixo.length + 1)
  })
})

describe('(bk) as quatro chaves da feature são mutuamente distintas', () => {
  it('lista×2, contador e config não colidem entre si', () => {
    const chaves = [
      pedidosDadosKeys.list({ soNaoAtendidos: true }),
      pedidosDadosKeys.list({ soNaoAtendidos: false }),
      pedidosDadosKeys.pendentesCount(),
      pedidosDadosKeys.configSla(),
    ].map((k) => JSON.stringify(k))

    // Duas chaves que coincidem fazem uma invalidação derrubar a outra query.
    expect(new Set(chaves).size).toBe(chaves.length)
  })
})

describe('(bl) a raiz não colide com a fábrica da feature de revisão', () => {
  it('o primeiro segmento é o do domínio novo', () => {
    expect(pedidosDadosKeys.all[0]).toBe('pedidos-dados')
    expect(pedidosDadosKeys.all[0]).not.toBe(revisoesKeys.all[0])
  })

  it('nenhuma chave desta feature começa pela raiz da revisão', () => {
    const raizRevisao = revisoesKeys.all[0]
    const todas = [
      pedidosDadosKeys.all,
      pedidosDadosKeys.lists(),
      pedidosDadosKeys.list({ soNaoAtendidos: false }),
      pedidosDadosKeys.pendentesCount(),
      pedidosDadosKeys.configSla(),
    ]
    for (const chave of todas) {
      expect(chave[0]).not.toBe(raizRevisao)
    }
  })
})
