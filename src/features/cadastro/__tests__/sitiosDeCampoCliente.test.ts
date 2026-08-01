/**
 * Phase 43 / Plan 43-03 Task 1 — CONSENT-01 / CONSENT-03 / CONSENT-05:
 * os sítios de campo do CLIENTE.
 *
 * O 43-01 fechou os dois sítios do SERVIDOR — os que decidem o valor GRAVADO.
 * Este arquivo é o gate dos sítios do CLIENTE: schema Zod do formulário, tipo,
 * `defaultValues` do RHF, os dois mapas de campo do service e a chave de rascunho.
 *
 * ⚠ POR QUE UM VALOR INICIAL `true` É O DEFEITO CENTRAL DA FASE:
 * com `.default(true)`, "a pessoa marcou" e "a pessoa não desmarcou" produzem
 * exatamente a mesma linha no banco — a marcação deixa de ser INEQUÍVOCA
 * (LGPD, Art. 5º, XII) e a prova de consentimento vira prova de nada. Nenhum
 * dado grava o que a pessoa fez; grava o que o formulário fez por ela.
 *
 * ⚠ POR QUE O OBRIGATÓRIO TAMBÉM NASCE `false`:
 * ele é o gate de submit (D-15), mas nascer marcado o torna igualmente
 * ambíguo. Ele tem de ser marcado por INTERAÇÃO.
 *
 * ⚠ IDENTIFICADORES APOSENTADOS SÃO MONTADOS EM RUNTIME:
 * um teste que proíbe um literal e o contém é auto-invalidante — um `grep`
 * de verificação encontraria o próprio teste e reprovaria o estado correto.
 * (idioma estabelecido na 42-11.)
 *
 * ⚠ POR QUE AS ASSERÇÕES SÃO DE RUNTIME E NÃO DE TIPO:
 * o gate de pre-commit deste repositório é um contador de NÃO-REGRESSÃO de `tsc`
 * (baseline congelada 97) e `--no-verify` é proibido nesta fase. Um RED que
 * quebrasse na COMPILAÇÃO (referenciando um export que ainda não existe) elevaria
 * a contagem para 98 e tornaria o próprio commit RED impossível de fazer
 * honestamente. Por isso o acesso ao módulo é feito por namespace + índice
 * castado: compila hoje, FALHA hoje em runtime, e passa a valer quando o export
 * existir. O ciclo RED→GREEN sobrevive ao gate em vez de negociar com ele.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-CONTEXT.md (BD-2)
 */
import { describe, it, expect } from 'vitest'
import { autorizacoesSchema } from '../schemas/candidatoSchema'
import * as cadastroService from '../services/cadastroService'
import { CADASTRO_DRAFT_KEY } from '../constants'
import * as CadastroFormModule from '../components/CadastroMultiStepForm'

/** Lê um export por nome sem exigir que ele já exista — ver ⚠ no cabeçalho. */
function exportDe<T>(mod: unknown, nome: string): T | undefined {
  return (mod as Record<string, unknown>)[nome] as T | undefined
}

// O nome REAL do mapa é `FIELD_TO_STEP_INDEX` — o plano supôs `FIELD_TO_STEP`.
// A lista de um plano é hipótese sobre onde o dado vive; o compilador tem a real.
const FIELD_TO_STEP =
  exportDe<Record<string, number>>(cadastroService, 'FIELD_TO_STEP_INDEX') ?? {}
const FIELD_TO_STEP_PATH =
  exportDe<Record<string, string>>(cadastroService, 'FIELD_TO_STEP_PATH') ?? {}

// Identificadores APOSENTADOS, montados em runtime (ver cabeçalho).
const CHAVE_VIDEO = ['autorizacao', 'analise', 'video'].join('_')
const CHAVE_COMUNICACAO = ['autorizacao', 'comunicacao'].join('_')

const CHAVES_ESPERADAS = [
  'autorizacao_uso_dados',
  'autorizacao_marketing_vagas',
  'autorizacao_retencao_curriculo',
] as const

describe('43-03 Task 1 — o schema de autorizações do cliente', () => {
  it('não repõe valor nenhum: omitir um opcional REPROVA em vez de virar `true`', () => {
    // Sem `.default()`, um corpo incompleto é REJEITADO. Com `.default(true)`,
    // ele passaria e o campo omitido chegaria ao servidor afirmando um
    // consentimento que ninguém deu.
    const r = autorizacoesSchema.safeParse({ autorizacao_uso_dados: true })
    expect(r.success).toBe(false)
  })

  it('aceita os três valores explícitos e devolve exatamente o que recebeu', () => {
    const r = autorizacoesSchema.safeParse({
      autorizacao_uso_dados: true,
      autorizacao_marketing_vagas: false,
      autorizacao_retencao_curriculo: false,
    })
    expect(r.success).toBe(true)
    if (r.success) {
      const data = r.data as Record<string, unknown>
      expect(data.autorizacao_marketing_vagas).toBe(false)
      expect(data.autorizacao_retencao_curriculo).toBe(false)
      expect(Object.keys(data).sort()).toEqual([...CHAVES_ESPERADAS].sort())
    }
  })

  it('não conhece a chave de análise de vídeo (BD-2 / CONSENT-05)', () => {
    const r = autorizacoesSchema.safeParse({
      autorizacao_uso_dados: true,
      autorizacao_marketing_vagas: false,
      autorizacao_retencao_curriculo: false,
      [CHAVE_VIDEO]: true,
    })
    // Zod não-strict descarta em silêncio; o que importa é que a chave não
    // sobreviva ao parse — o servidor é `.strict()` e a rejeitaria com 400.
    if (r.success) {
      expect(Object.keys(r.data)).not.toContain(CHAVE_VIDEO)
    }
  })
})

describe('43-03 Task 1 — os defaultValues do formulário (CONSENT-01)', () => {
  // Acesso por namespace + índice castado — ver ⚠ no cabeçalho.
  const defaults = exportDe<{ autorizacoes?: Record<string, boolean> }>(
    CadastroFormModule,
    'CADASTRO_DEFAULT_VALUES'
  )

  it('o formulário EXPORTA seus defaultValues reais — o teste não assere sobre uma cópia', () => {
    // Uma cópia local dos defaults ficaria verde para sempre enquanto o
    // componente derivasse: verde sobre forma morta. A única asserção que
    // vale é a que lê o objeto que o RHF de fato consome.
    expect(defaults?.autorizacoes).toBeDefined()
  })

  it('tem exatamente as três chaves esperadas', () => {
    expect(Object.keys(defaults?.autorizacoes ?? {}).sort()).toEqual(
      [...CHAVES_ESPERADAS].sort()
    )
  })

  it.each(CHAVES_ESPERADAS)('nasce `false` em `%s`', (chave) => {
    expect(defaults?.autorizacoes?.[chave]).toBe(false)
  })

  it('não carrega nenhuma das duas chaves aposentadas', () => {
    const chaves = Object.keys(defaults?.autorizacoes ?? {})
    expect(chaves).not.toContain(CHAVE_VIDEO)
    expect(chaves).not.toContain(CHAVE_COMUNICACAO)
  })
})

describe('43-03 Task 1 — os dois mapas de campo do service', () => {
  it('FIELD_TO_STEP_INDEX conhece a chave de marketing e roteia para o passo 3', () => {
    expect(FIELD_TO_STEP.autorizacao_marketing_vagas).toBe(3)
  })

  it('FIELD_TO_STEP_PATH aponta a chave de marketing para o path RHF aninhado', () => {
    expect(FIELD_TO_STEP_PATH.autorizacao_marketing_vagas).toBe(
      'autorizacoes.autorizacao_marketing_vagas'
    )
  })

  it('nenhum dos dois mapas conhece as chaves aposentadas', () => {
    for (const chave of [CHAVE_VIDEO, CHAVE_COMUNICACAO]) {
      expect(Object.keys(FIELD_TO_STEP)).not.toContain(chave)
      expect(Object.keys(FIELD_TO_STEP_PATH)).not.toContain(chave)
    }
  })

  it('nenhum path de FIELD_TO_STEP_PATH referencia uma chave aposentada', () => {
    const paths = Object.values(FIELD_TO_STEP_PATH)
    for (const chave of [CHAVE_VIDEO, CHAVE_COMUNICACAO]) {
      expect(paths.some((p) => p.includes(chave))).toBe(false)
    }
  })
})

describe('43-03 Task 1 — a chave de rascunho (D-13)', () => {
  it('foi bumpada para v2 — um rascunho antigo tem a forma que o servidor `.strict()` rejeita', () => {
    expect(CADASTRO_DRAFT_KEY).toBe('cadastro:draft:v2')
  })
})
