/**
 * Phase 7 / VAGACFG-01 — cargo templates as a git TS config module (D-04).
 *
 * The 8 real cargos. RH does NOT edit templates in V1 — selecting one COPIES
 * its defaults into `vaga.{pesos_avaliacao, testes_aplicaveis}` (override happens
 * on the vaga). There is NO `vaga_templates` table in V1 (D-04).
 *
 * Each template references only WHICH tests apply via `testes_aplicaveis`
 * (perguntas left empty); the SJT question bank is deferred to Phase 11 (D-05).
 *
 * [ASSUMED] numeric pesos defaults — D-09 starter values, calibrated in UAT
 * (PRD §10 Q8). The only hard requirement is that all 8 sum to exactly 100
 * (Pitfall 4). Selecting a template must deep-copy (see `getCargoTemplateDefaults`).
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Code Examples
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-04, D-05, D-07, D-09)
 * @module features/config-vaga/templates/cargoTemplates
 */
import type { PesosAvaliacao } from '../schemas/pesosAvaliacaoSchema'
import type { TesteAplicavel } from '../schemas/testesAplicaveisSchema'
import type { VagaConfig } from '../types/configVagaTypes'

export type CargoSlug =
  | 'dentista'
  | 'recepcionista'
  | 'consultor_vendas_premium'
  | 'sdr_social_seller'
  | 'assistente_financeiro'
  | 'asb'
  | 'tsb'
  | 'vaga_generica'

export interface CargoTemplate {
  slug: CargoSlug
  /** pt-BR display label. */
  label: string
  /** The 4 weighted keys — MUST sum to 100. */
  pesos_avaliacao: PesosAvaliacao
  testes_aplicaveis: TesteAplicavel[]
}

/**
 * The standard set of applicable tests. `big_five` + `cognitivo` are context-only
 * (no peso, D-07). `obrigatorio` per-test varies by cargo (a publish requires
 * ≥1 obrigatorio test — D-12 condition 2).
 */
const baseTestes = (
  overrides: Partial<Record<TesteAplicavel['teste'], boolean>> = {}
): TesteAplicavel[] => [
  { teste: 'triagem', obrigatorio: overrides.triagem ?? true, customizado: false },
  {
    teste: 'work_sample_sjt',
    obrigatorio: overrides.work_sample_sjt ?? true,
    customizado: false,
    perguntas: [],
  },
  {
    teste: 'redacao_cultural',
    obrigatorio: overrides.redacao_cultural ?? false,
    customizado: false,
  },
  { teste: 'big_five', obrigatorio: false, customizado: false },
  { teste: 'cognitivo', obrigatorio: false, customizado: false },
  { teste: 'entrevista', obrigatorio: overrides.entrevista ?? true, customizado: false },
]

export const cargoTemplates: Record<CargoSlug, CargoTemplate> = {
  dentista: {
    slug: 'dentista',
    label: 'Dentista',
    pesos_avaliacao: {
      triagem: 20,
      work_sample_sjt: 35,
      redacao_cultural: 15,
      entrevista: 30,
    },
    testes_aplicaveis: baseTestes({ redacao_cultural: true }),
  },
  recepcionista: {
    slug: 'recepcionista',
    label: 'Recepcionista',
    pesos_avaliacao: {
      triagem: 25,
      work_sample_sjt: 30,
      redacao_cultural: 20,
      entrevista: 25,
    },
    testes_aplicaveis: baseTestes(),
  },
  consultor_vendas_premium: {
    slug: 'consultor_vendas_premium',
    label: 'Consultor de Vendas Premium',
    pesos_avaliacao: {
      triagem: 20,
      work_sample_sjt: 35,
      redacao_cultural: 15,
      entrevista: 30,
    },
    testes_aplicaveis: baseTestes(),
  },
  sdr_social_seller: {
    slug: 'sdr_social_seller',
    label: 'SDR / Social Seller',
    pesos_avaliacao: {
      triagem: 25,
      work_sample_sjt: 35,
      redacao_cultural: 15,
      entrevista: 25,
    },
    testes_aplicaveis: baseTestes(),
  },
  assistente_financeiro: {
    slug: 'assistente_financeiro',
    label: 'Assistente Financeiro',
    pesos_avaliacao: {
      triagem: 30,
      work_sample_sjt: 30,
      redacao_cultural: 15,
      entrevista: 25,
    },
    testes_aplicaveis: baseTestes(),
  },
  asb: {
    slug: 'asb',
    label: 'ASB (Auxiliar de Saúde Bucal)',
    pesos_avaliacao: {
      triagem: 35,
      work_sample_sjt: 25,
      redacao_cultural: 15,
      entrevista: 25,
    },
    testes_aplicaveis: baseTestes(),
  },
  tsb: {
    slug: 'tsb',
    label: 'TSB (Técnico em Saúde Bucal)',
    pesos_avaliacao: {
      triagem: 30,
      work_sample_sjt: 30,
      redacao_cultural: 15,
      entrevista: 25,
    },
    testes_aplicaveis: baseTestes(),
  },
  vaga_generica: {
    slug: 'vaga_generica',
    label: 'Vaga Genérica',
    pesos_avaliacao: {
      triagem: 30,
      work_sample_sjt: 25,
      redacao_cultural: 20,
      entrevista: 25,
    },
    testes_aplicaveis: baseTestes(),
  },
}

/**
 * Returns a DEEP COPY of a template's config defaults to copy INTO the vaga
 * (D-04 override-on-the-vaga). Mutating the result never touches the source
 * `cargoTemplates`.
 */
export function getCargoTemplateDefaults(slug: CargoSlug): VagaConfig {
  const tpl = cargoTemplates[slug]
  return {
    pesos_avaliacao: { ...tpl.pesos_avaliacao },
    testes_aplicaveis: tpl.testes_aplicaveis.map((t) => ({
      ...t,
      perguntas: t.perguntas ? [...t.perguntas] : undefined,
    })),
  }
}
