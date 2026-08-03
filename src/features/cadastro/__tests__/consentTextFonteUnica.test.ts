/**
 * Phase 43 / Plan 43-01 Task 1 — CONSENT-02: a FONTE ÚNICA do texto de
 * consentimento, provada por execução.
 *
 * Este arquivo resolve empiricamente a suposição A3 da 43-RESEARCH: *o cliente
 * (Vite/Vitest/tsc) consegue importar um JSON que mora em
 * `supabase/functions/_shared/`?* O import abaixo É a prova — se ele atravessar,
 * o texto tem UMA fonte lida pelas duas runtimes e não há espelho a manter.
 *
 * ⚠ POR QUE A FONTE ÚNICA IMPORTA MAIS AQUI DO QUE EM QUALQUER OUTRO PAR:
 * o par `POLICY_VERSION` (src ⟷ _shared) vive espelhado desde a Phase 2 SEM
 * nenhum teste de paridade — 4 meses em que uma divergência teria passado
 * despercebida, porque o sintoma seria apenas um número diferente numa legenda.
 * Com o TEXTO do consentimento a aposta é outra: se o browser renderizar um texto
 * e a Edge Function hashear outro, `autorizacoes.consent_text_hash` passa a
 * afirmar que a pessoa leu algo que ela não leu — e a afirmação é
 * indistinguível da verdade. É exatamente o defeito que o CONSENT-02 existe para
 * tornar impossível.
 *
 * Escopo deste arquivo (Vitest/Node — sem `crypto.subtle` no contrato): a FORMA do
 * corpus e a PARIDADE das constantes. A aritmética do hash é provada do lado Deno,
 * em `supabase/functions/_shared/__tests__/consent-hash.test.ts`, que é onde ela
 * roda em produção.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-RESEARCH.md §Q1 (A3)
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// A PROVA: o import cross-boundary. `tsconfig.json` tem `resolveJsonModule: true`
// e o Vite resolve JSON nativamente, então este specifier relativo atravessa a
// fronteira src/ → supabase/functions/. Se um dia ele parar de atravessar, ESTE
// import quebra na carga do módulo — alto e no lugar certo — em vez de deixar
// alguém espelhar o arquivo em silêncio.
// ─────────────────────────────────────────────────────────────────────────────
import corpusV2 from '../../../../supabase/functions/_shared/consent-text.json'
import corpusV1 from '../../../../supabase/functions/_shared/consent-text.v1-historico.json'
import { CONSENT_TEXT_VERSION } from '../constants'

const EF_CONSTANTS_PATH = resolve(
  __dirname,
  '../../../../supabase/functions/_shared/constants.ts',
)

describe('CONSENT-02 — fonte única do texto de consentimento', () => {
  it('o JSON do servidor é importável do lado do cliente (fonte única, sem espelho)', () => {
    // O import no topo já provou a resolução; esta asserção prova que o
    // conteúdo chegou íntegro e não como módulo vazio.
    expect(corpusV2).toBeTypeOf('object')
    expect(Array.isArray(corpusV2.consentimentos)).toBe(true)
  })

  it('o corpus v2 tem exatamente 3 consentimentos, na ordem de renderização', () => {
    expect(corpusV2.consentimentos.map((c) => c.id)).toEqual([
      'autorizacao_uso_dados',
      'autorizacao_marketing_vagas',
      'autorizacao_retencao_curriculo',
    ])
  })

  it('nenhum consentimento de análise de vídeo sobrevive no v2 (BD-2 / CONSENT-05)', () => {
    const serializado = JSON.stringify(corpusV2.consentimentos)
    expect(serializado).not.toMatch(/video|vídeo/i)
  })

  it('cada consentimento carrega id, rótulo, descrição e obrigatoriedade não-vazios', () => {
    for (const c of corpusV2.consentimentos) {
      expect(c.id).toBeTruthy()
      expect(c.rotulo.trim().length).toBeGreaterThan(0)
      expect(c.descricao.trim().length).toBeGreaterThan(0)
      expect(typeof c.obrigatorio).toBe('boolean')
    }
    // Exatamente UM obrigatório — o gate de submit (D-15).
    expect(corpusV2.consentimentos.filter((c) => c.obrigatorio)).toHaveLength(1)
    expect(corpusV2.consentimentos[0].obrigatorio).toBe(true)
  })

  it('o informativo transacional existe e fica FORA do array de consentimentos (Invariante 3)', () => {
    // Não é consentimento: base legal Art. 7º, V. Um controle que a pessoa não
    // pode desligar renderizado como checkbox é a doença deste milestone.
    expect(corpusV2.informativo_transacional.rotulo).toBeTruthy()
    expect(corpusV2.informativo_transacional.base_legal).toMatch(/Art\. 7/)
    expect(corpusV2.consentimentos.map((c) => c.id)).not.toContain(
      'autorizacao_comunicacao',
    )
  })

  it('o v1 histórico está capturado verbatim, com as 4 entradas que existiam', () => {
    expect(corpusV1.versao).toBe('v1-historico')
    expect(corpusV1.nao_editavel).toBe(true)
    expect(corpusV1.consentimentos.map((c) => c.id)).toEqual([
      'autorizacao_uso_dados',
      'autorizacao_comunicacao',
      'autorizacao_retencao_curriculo',
      'autorizacao_analise_video',
    ])
  })

  it('nenhuma linha do banco jamais carregará `v1-historico` — os rótulos de versão são disjuntos', () => {
    // O NULL é o discriminador entre pré e pós-enforcement (SC#1). Se o v1 virasse
    // valor de coluna, as linhas históricas passariam a AFIRMAR uma versão que
    // ninguém gravou — o mesmo erro que `policy_version NOT NULL DEFAULT` cometeu.
    expect(corpusV1.versao).not.toBe(CONSENT_TEXT_VERSION)
    expect(corpusV2.versao).toBe(CONSENT_TEXT_VERSION)
  })
})

describe('CONSENT_TEXT_VERSION — paridade do espelho src ⟷ _shared', () => {
  it('as duas constantes têm o MESMO valor', () => {
    // Sonda de texto-fonte, no idioma de `strict-schema.test.ts`: importar o
    // módulo .ts da EF sob Vitest não é possível (specifiers Deno), então lemos o
    // arquivo. O que importa é que a divergência REPROVE — o par POLICY_VERSION
    // ficou 4 meses sem essa rede.
    const src = readFileSync(EF_CONSTANTS_PATH, 'utf8')
    const match = src.match(
      /export const CONSENT_TEXT_VERSION\s*=\s*'([^']+)'\s*as const/,
    )
    expect(
      match,
      'CONSENT_TEXT_VERSION ausente em supabase/functions/_shared/constants.ts',
    ).not.toBeNull()
    expect(match![1]).toBe(CONSENT_TEXT_VERSION)
  })

  it('CONSENT_TEXT_VERSION NÃO reusa POLICY_VERSION (eixos independentes)', () => {
    // Reusar faria uma edição de política cunhar versões falsas de consentimento.
    const src = readFileSync(EF_CONSTANTS_PATH, 'utf8')
    const policy = src.match(/export const POLICY_VERSION\s*=\s*'([^']+)'/)
    expect(policy).not.toBeNull()
    expect(CONSENT_TEXT_VERSION).not.toBe(policy![1])
  })
})
