/**
 * Phase 44 / Plano 44-08 Task 1 — o reuso do classificador de faixa por ALIAS
 * (EXPORT-05, LGPD Art. 19, II).
 *
 * Este arquivo não re-testa `classifyRevisaoSla`: ele já tem suíte própria em
 * `src/features/revisao/constants/__tests__/slaRevisao.test.ts`, onde as quatro faixas
 * e os caminhos degenerados estão cobertos. Re-testá-los aqui seria duplicar a
 * asserção junto com o risco que ela existe para cobrir.
 *
 * O que este arquivo prova é outra coisa, e só ela:
 *
 *  1. **Identidade de REFERÊNCIA** (não de comportamento). `classifySlaDados` tem de
 *     ser *o mesmo objeto função* que `classifyRevisaoSla`. Uma cópia-e-cola futura
 *     — mesmo correta no dia em que for feita — reprova esta asserção, e é esse o
 *     ponto: a Área 4 do CONTEXT separou as duas TABELAS de configuração (dois prazos
 *     legais distintos não cabem numa linha), mas não separou a FUNÇÃO, que é um
 *     classificador total de três faixas agnóstico ao prazo. Dois classificadores
 *     seriam dois lugares onde a faixa degenerada pode apodrecer em silêncio.
 *
 *  2. **As faixas sob os limiares DESTA fase** (seed `acesso_dados` 7/12 do 44-02) —
 *     não o classificador, mas o encaixe entre os limiares semeados e as faixas que a
 *     44-UI-SPEC promete na coluna "Acompanhamento".
 *
 *  3. **Totalidade sob a config desta fase.** `config_sla_dados` é alterável sem
 *     deploy (é a razão de ela existir), então config ausente, limiar `0` e ordem
 *     invertida são estados ALCANÇÁVEIS em produção — o CHECK de ordem do banco cobre
 *     o `INSERT`, não todo `UPDATE` possível. Nenhum deles pode virar erro de tela.
 *
 * @see src/features/pedidos-dados/constants/slaDados.ts (o módulo sob teste)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Faixas do badge de acompanhamento)
 */
import { describe, it, expect } from 'vitest'

import {
  classifyRevisaoSla,
  diasEmEspera as diasEmEsperaOriginal,
  ROTULOS_FAIXA_SLA_REVISAO,
} from '@/features/revisao/constants/slaRevisao'

import {
  classifySlaDados,
  diasEmEspera,
  ROTULOS_FAIXA_SLA_DADOS,
  type LimiaresSlaDados,
} from '../slaDados'

// Os limiares REALMENTE semeados em PROD pelo 44-02 (linha `acesso_dados`, 7/12),
// aplicados em 44-04. Não são constantes do código — vivem na tabela, e é por isso
// que o classificador tem de ser total.
const SEED_ACESSO_DADOS: LimiaresSlaDados = { diasAtencao: 7, diasAtraso: 12 }

describe('(au) identidade de REFERÊNCIA com o classificador vivo da revisão', () => {
  it('classifySlaDados É classifyRevisaoSla — a mesma função, não uma cópia', () => {
    expect(classifySlaDados).toBe(classifyRevisaoSla)
  })
})

describe('(av) os demais reusos também são a mesma referência', () => {
  it('diasEmEspera é reexportado, não reimplementado', () => {
    expect(diasEmEspera).toBe(diasEmEsperaOriginal)
  })

  it('ROTULOS_FAIXA_SLA_DADOS é o mesmo objeto de rótulos da revisão', () => {
    expect(ROTULOS_FAIXA_SLA_DADOS).toBe(ROTULOS_FAIXA_SLA_REVISAO)
  })
})

describe('(aw) faixas sob os limiares desta fase (seed 7/12)', () => {
  it('3 dias → em_dia', () => {
    expect(classifySlaDados(3, SEED_ACESSO_DADOS)).toBe('em_dia')
  })

  it('8 dias → atencao', () => {
    expect(classifySlaDados(8, SEED_ACESSO_DADOS)).toBe('atencao')
  })

  it('15 dias → atrasado', () => {
    expect(classifySlaDados(15, SEED_ACESSO_DADOS)).toBe('atrasado')
  })
})

describe('(ax) totalidade sob os estados alcançáveis de config_sla_dados', () => {
  // `config_sla_dados` é alterável sem deploy — os três casos abaixo são o que um
  // UPDATE mal feito produz, e nenhum deles pode derrubar a fila do RH.
  it('config ausente (null) → degenerado, sem lançar', () => {
    expect(() => classifySlaDados(9, null)).not.toThrow()
    expect(classifySlaDados(9, null)).toBe('degenerado')
  })

  it('limiar zerado → degenerado, sem lançar', () => {
    const cfg: LimiaresSlaDados = { diasAtencao: 0, diasAtraso: 12 }
    expect(() => classifySlaDados(9, cfg)).not.toThrow()
    expect(classifySlaDados(9, cfg)).toBe('degenerado')
  })

  it('ordem invertida → degenerado, sem lançar', () => {
    const cfg: LimiaresSlaDados = { diasAtencao: 12, diasAtraso: 7 }
    expect(() => classifySlaDados(9, cfg)).not.toThrow()
    expect(classifySlaDados(9, cfg)).toBe('degenerado')
  })
})
