/**
 * Regressão do tempo da avaliação de raciocínio (medido em PROD, 2026-08-26).
 *
 * A primeira execução completa dentro do ATS gravou as 60 respostas e um score
 * correto — e `tempo_total_segundos = 0`, com o cronômetro marcando 00:02:53 na tela.
 *
 * A causa estava nas duas pontas, e nenhuma delas dava erro:
 *
 *  • `calcular_scores_raven` derivava o total de `MAX(created_at) - MIN(created_at)`.
 *    No app de origem cada resposta era inserida quando o candidato a dava, e esse
 *    intervalo ERA a duração. O port grava as 60 na mesma transação — de propósito,
 *    para que nunca exista prova pela metade — então o intervalo é sempre zero.
 *
 *  • `submeterRaven` pendurava o total na PRIMEIRA linha e deixava as outras 59 nulas,
 *    com um comentário afirmando que a função consolidava esse valor. Ela nunca leu
 *    aquela coluna. O comentário era a única coisa que sustentava o desenho.
 *
 * Este arquivo tranca a metade do cliente: cada linha carrega o tempo do SEU item, e
 * a soma delas é a duração. A metade do servidor está na migration
 * 20260827000001, que tem portão próprio provado por execução.
 *
 * @see supabase/migrations/20260827000001_raven_tempo_total_por_item.sql
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

/** Linha de `respostas_raven` como o serviço a monta. */
type LinhaResposta = {
  candidatura_id: string
  questao_id: string
  resposta: number
  tempo_resposta_segundos: number | null
}

// O parâmetro é declarado de propósito: sem ele `insertMock.mock.calls[0][0]` tipa
// como tupla vazia, e as asserções sobre as linhas não compilam.
const { insertMock, fromMock } = vi.hoisted(() => ({
  insertMock: vi.fn((_linhas: LinhaResposta[]) => Promise.resolve({ error: null })),
  fromMock: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => {
  fromMock.mockImplementation(() => ({ insert: insertMock }))
  return { supabase: { from: fromMock, rpc: vi.fn() } }
})

import { submeterRaven } from '@/features/avaliacao-cognitiva/services/ravenService'

/** 60 questões com id previsível, e um tempo distinto por item. */
function provaCompleta() {
  const respostas: Record<string, number> = {}
  const tempos: Record<string, number> = {}
  for (let i = 1; i <= 60; i++) {
    respostas[`q${i}`] = (i % 6) + 1
    tempos[`q${i}`] = i // soma = 1830
  }
  return { respostas, tempos }
}

describe('submeterRaven — o tempo vai por item, não pendurado na primeira linha', () => {
  beforeEach(() => {
    insertMock.mockClear()
    fromMock.mockClear()
  })

  it('grava o tempo de CADA item, e a soma é a duração da prova', async () => {
    const { respostas, tempos } = provaCompleta()
    await submeterRaven('cand-1', respostas, tempos)

    const linhas = insertMock.mock.calls[0][0]
    expect(linhas).toHaveLength(60)

    // ⚠ A regressão: no desenho antigo 59 linhas saíam nulas e só a primeira tinha
    // valor. Com `SUM` no servidor aquilo daria a duração certa por acidente, mas o
    // dado por item — o que permite ver onde o candidato travou — não existiria.
    const nulas = linhas.filter((l) => l.tempo_resposta_segundos === null)
    expect(nulas).toHaveLength(0)

    const soma = linhas.reduce((t, l) => t + (l.tempo_resposta_segundos ?? 0), 0)
    expect(soma).toBe(1830)

    // E cada linha carrega o tempo do seu próprio item, não uma cópia do total.
    const daQuestao7 = linhas.find((l) => l.questao_id === 'q7')
    expect(daQuestao7?.tempo_resposta_segundos).toBe(7)
  })

  it('item sem tempo medido entra NULO, não zero', async () => {
    // Zero significaria "respondeu instantaneamente" — uma afirmação sobre a pessoa
    // que o sistema não mediu. Nulo é a ausência, e é o que a coluna aceita.
    const { respostas, tempos } = provaCompleta()
    delete tempos.q13

    await submeterRaven('cand-1', respostas, tempos)
    const linhas = insertMock.mock.calls[0][0]
    expect(linhas.find((l) => l.questao_id === 'q13')?.tempo_resposta_segundos).toBeNull()
  })

  it('recusa a prova incompleta ANTES de escrever qualquer linha', async () => {
    // A atomicidade é o motivo de o tempo não poder vir dos `created_at`; se ela cair,
    // o defeito volta por outro caminho.
    const { respostas, tempos } = provaCompleta()
    delete respostas.q60

    await expect(submeterRaven('cand-1', respostas, tempos)).rejects.toThrow(/60 questões/)
    expect(insertMock).not.toHaveBeenCalled()
  })
})
