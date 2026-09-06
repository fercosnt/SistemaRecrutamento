/**
 * `AGENDAMENTO_ATIVO` — o conjunto de status que ainda conta como entrevista marcada.
 *
 * Existe porque o filtro literal `.eq('status','agendada')` (o conserto da manhã de
 * 06/09/2026, commit d643a89) quebrou no PRIMEIRO reagendamento da mesma tarde: o painel
 * voltou a dizer «Sem horário definido» com a entrevista marcada para dali a 4 dias — a
 * mesma mensagem do defeito que aquele conserto resolvia.
 *
 * O teste vigia a FORMA (a partição do enum é total), não uma lista: um status novo em
 * `public.status_entrevista` obriga uma decisão explícita — ativo ou encerrado — em vez de
 * cair silenciosamente para fora do painel.
 */
import { describe, it, expect } from 'vitest'
import { AGENDAMENTO_ATIVO } from '../entrevistaService'

// Espelha public.status_entrevista (migration 20260624000001).
const ENUM_STATUS_ENTREVISTA = [
  'agendada',
  'em_andamento',
  'concluida',
  'cancelada',
  'reagendada',
  'nao_compareceu',
] as const

describe('AGENDAMENTO_ATIVO — partição do enum status_entrevista', () => {
  it('inclui reagendada — o defeito que motivou o conjunto', () => {
    expect(AGENDAMENTO_ATIVO as readonly string[]).toContain('reagendada')
  })

  it('exclui exatamente os status que ENCERRAM o agendamento', () => {
    const encerrados = ENUM_STATUS_ENTREVISTA.filter(
      (s) => !(AGENDAMENTO_ATIVO as readonly string[]).includes(s),
    )
    expect(encerrados.slice().sort()).toEqual(['cancelada', 'nao_compareceu'])
  })

  it('nenhum status fora do enum entrou na lista', () => {
    const desconhecidos = (AGENDAMENTO_ATIVO as readonly string[]).filter(
      (s) => !(ENUM_STATUS_ENTREVISTA as readonly string[]).includes(s),
    )
    expect(desconhecidos).toEqual([])
  })
})
