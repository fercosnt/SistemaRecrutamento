/**
 * Tabela-verdade do predicado canônico TS — os mesmos casos que o
 * `p48_candidatura_encerrada_smoke.sql` confere contra `public.candidatura_encerrada`.
 * Se um dos lados mudar e o outro não, este arquivo ou o smoke reprova.
 */
import { describe, it, expect } from 'vitest'
import {
  candidaturaEncerrada,
  ETAPAS_TERMINAIS,
  STATUS_TERMINAIS,
} from '../candidaturaEncerrada'

describe('candidaturaEncerrada(etapa, status)', () => {
  it.each([
    // encerradas
    ['aprovado', 'finalizado', true],
    ['rejeitado', 'rejeitado', true],
    ['inscricao', 'rejeitado', true], // knockout — a etapa NÃO muda, por desenho
    ['triagem', 'finalizado', true], // legado: status terminal em etapa de trabalho
    [null, 'rejeitado', true],
    [undefined, 'finalizado', true],
    // em andamento
    ['triagem', 'em_analise', false],
    ['decisao_final', 'aguardando_resposta', false],
    ['triagem', null, false],
    [null, null, false],
  ] as const)('(%s, %s) → %s', (etapa, status, esperado) => {
    expect(candidaturaEncerrada(etapa, status)).toBe(esperado)
  })

  it('aprovado_proxima NÃO encerra — ali há próximo passo', () => {
    expect(candidaturaEncerrada('entrevista_online', 'aprovado_proxima')).toBe(false)
  })

  it('etapa terminal encerra mesmo sem status', () => {
    expect(candidaturaEncerrada('aprovado', null)).toBe(true)
    expect(candidaturaEncerrada('rejeitado', undefined)).toBe(true)
  })

  it('valor desconhecido não encerra (allowlist, não denylist)', () => {
    expect(candidaturaEncerrada('etapa_nova', 'status_novo')).toBe(false)
  })

  it('os conjuntos exportados são exatamente os terminais do SQL', () => {
    expect([...ETAPAS_TERMINAIS].sort()).toEqual(['aprovado', 'rejeitado'])
    expect([...STATUS_TERMINAIS].sort()).toEqual(['finalizado', 'rejeitado'])
  })
})
