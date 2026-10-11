/**
 * Guarda da regra de normalização das competências — cliente × servidor (Phase 52 / 52-26,
 * WR-01 do 52-REVIEW-GAP-1).
 *
 * Desde a migration `20261011000005_p52_sjt_uuid_e_nota_completa`, a
 * `salvar_avaliacao_entrevista` de 4 argumentos recusa (23514) toda avaliação cujas chaves não
 * sejam EXATAMENTE o conjunto de competências que a tela renderiza. Esse conjunto sai de dois
 * trechos de cliente — `normalizeCompetencia` (service) e o filtro do scorecard
 * (`competenciasDoScorecard`) — e o servidor guarda uma CÓPIA da regra num CASE (gerado por
 * `scripts/geradores/gen-p52-gap.cjs`):
 *
 *   `competencia` string NÃO vazia → ela; senão `competency` STRING → ela; senão ''.
 *
 * A outra metade desta guarda é a cláusula (n) do smoke52g
 * (`supabase/tests/p52_gap_servidor_smoke.sql`), com o MESMO fixture e o MESMO conjunto esperado
 * `{A, B, C, ''}` escritos lá. Quem muda um lado reprova o teste do lado que mudou: aqui, se o
 * cliente mudar; lá (e nas mutações G8/G9 de `scripts/p52_mutacoes.cjs`), se o CASE mudar.
 *
 * Divergiu de propósito? Mude os DOIS lados — o CASE pelo gerador (nunca à mão, e numa migration
 * nova se a 0005 já estiver aplicada), o fixture/conjunto aqui E na cláusula (n).
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as service from '../services/entrevistaService'
import * as scorecard from '../components/EntrevistaScorecardInline'
import type { AnaliseCompetencia } from '../services/entrevistaService'

vi.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}))

const ROOT = resolve(__dirname, '../../../..')
const SMOKE = 'supabase/tests/p52_gap_servidor_smoke.sql'

/** O fixture da cláusula (n) do smoke52g — o MESMO texto, byte a byte. */
const FIXTURE_JSON =
  '[{"competencia":"","competency":"A"},{"competencia":7,"competency":"B"},{"competencia":"C","competency":"X"},{"competency":9},{}]'
/** A avaliação completa da cláusula (n): grava só com a chave '' presente. */
const COMPLETA_JSON = '{"A":4,"B":4,"C":4,"":4}'
/** O conjunto esperado — escrito também na cláusula (n) do smoke52g. */
const ESPERADO = ['', 'A', 'B', 'C']

const fixture = (): AnaliseCompetencia[] => JSON.parse(FIXTURE_JSON) as AnaliseCompetencia[]

type Normalizar = (c: AnaliseCompetencia) => AnaliseCompetencia
type DaTela = (cs: AnaliseCompetencia[] | null | undefined) => { key: string; label: string }[]

function regrasDoCliente(): { normalizar: Normalizar; daTela: DaTela } {
  const normalizar = (service as Record<string, unknown>).normalizeCompetencia
  const daTela = (scorecard as Record<string, unknown>).competenciasDoScorecard
  expect(normalizar, 'normalizeCompetencia exportado pelo service').toBeTypeOf('function')
  expect(daTela, 'competenciasDoScorecard exportado pelo scorecard').toBeTypeOf('function')
  return { normalizar: normalizar as Normalizar, daTela: daTela as DaTela }
}

/** O conjunto de chaves que a tela pede, ordenado — o que o servidor exige. */
function conjunto(normalizar: Normalizar, daTela: DaTela): string[] {
  return [...new Set(daTela(fixture().map(normalizar)).map((c) => c.key))].sort()
}

describe('normalizeCompetencia + filtro do scorecard — espelho do CASE da 0005 (WR-01)', () => {
  it('o fixture da cláusula (n) vira exatamente o conjunto {A, B, C, \'\'}', () => {
    const { normalizar, daTela } = regrasDoCliente()
    // por elemento: '' não vale (cai para competency); 7 não é string; competencia vence
    // competency; competency 9 não é string; objeto vazio
    expect(fixture().map(normalizar).map((c) => c.competencia)).toEqual(['A', 'B', 'C', '', ''])
    expect(conjunto(normalizar, daTela)).toEqual(ESPERADO)
  })

  it('a avaliação completa da cláusula (n) tem exatamente as chaves do conjunto', () => {
    const { normalizar, daTela } = regrasDoCliente()
    expect(Object.keys(JSON.parse(COMPLETA_JSON)).sort()).toEqual(conjunto(normalizar, daTela))
  })

  it('o smoke52g traz o MESMO fixture e a MESMA avaliação completa (uma vez cada)', () => {
    const smoke = readFileSync(resolve(ROOT, SMOKE), 'utf8')
    expect(smoke.split(`'${FIXTURE_JSON}'::jsonb`).length - 1).toBe(1)
    expect(smoke.split(`'${COMPLETA_JSON}'::jsonb`).length - 1).toBe(1)
  })

  it('a guarda morde: os dois ramos que a G8/G9 mutam no servidor, mutados no cliente, mudam o conjunto', () => {
    const { normalizar, daTela } = regrasDoCliente()
    // G8 no cliente: `competencia` string vazia passa a valer
    const semComprimento: Normalizar = (c) => ({
      ...normalizar(c),
      competencia: typeof c.competencia === 'string' ? c.competencia : normalizar(c).competencia,
    })
    // G9 no cliente: `competency` deixa de exigir string
    const competencyQualquer: Normalizar = (c) => {
      const n = normalizar(c)
      const cru = c as unknown as Record<string, unknown>
      return n.competencia === '' && 'competency' in cru ? { ...n, competencia: String(cru.competency) } : n
    }
    expect(conjunto(semComprimento, daTela)).not.toEqual(ESPERADO)
    expect(conjunto(competencyQualquer, daTela)).not.toEqual(ESPERADO)
  })
})
