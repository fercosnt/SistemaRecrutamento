/**
 * avaliacoesRhService — Phase 52 / Plan 52-11 (JORN-56, JORN-57): o que o candidato respondeu,
 * lido pelo hub do RH.
 *
 * - `lerDevolutivaBigFiveRh` — as faixas do Big Five QUE O CANDIDATO VIU na devolutiva dele
 *   (D-04, UI-SPEC Invariante 2), mais o texto integral que ele recebeu (D-06), pela RPC
 *   `ler_devolutiva_bigfive_rh` (52-08). Nunca de `scores_candidato.metadata.dimensoes`.
 * - `lerSjtMcRh` — o SJT de múltipla escolha: por situação, o cenário, TODAS as alternativas na
 *   ordem neutra calculada no servidor (D-37) e qual foi a escolhida; etiqueta e peso SÓ da
 *   escolhida (D-21), pela RPC `ler_sjt_mc_rh` (52-08). Nenhuma alternativa leva etiqueta/peso no
 *   tipo, e a projeção descarta os que viessem (T-52-32: nenhum gabarito chega à tela).
 *
 * O TIPO É A PRIMEIRA TRAVA (UI-SPEC Invariante 1, T-52-31): `BigFiveHubDimensao` tem só
 * `dim`, `banda` e `texto_interpretativo`. Cada objeto que chega da rede é PROJETADO campo a
 * campo para esse tipo — um campo extra que a RPC um dia devolvesse é descartado aqui, antes de
 * chegar à tela. Nada neste arquivo ordena, filtra ou compara candidatos (RNF-07a, D-02).
 *
 * Contrato validado antes de entregar à tela; a mensagem de erro NUNCA ecoa o retorno (é texto
 * pessoal do candidato). Molde: `scoresRhService.getRespostaCasoAbertoSjt`.
 *
 * @module features/avaliacao/services/avaliacoesRhService
 * @see supabase/migrations/20261011000001_p52_leituras_rh.sql (as RPCs)
 * @see src/features/avaliacao/services/scoresRhService.ts (cast confinado, classe de erro)
 */
import { supabase } from '@/lib/supabase/client'
import {
  BANDA_ORDER,
  DIM_ORDER,
  type BandaBigFive,
  type DimBigFive,
} from '@/features/avaliacao/lib/bigFiveRotulos'

/** Erro do serviço (convenção `camelCaseService.ts`, CLAUDE.md). */
export class AvaliacoesRhServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'DATABASE_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'AvaliacoesRhServiceError'
  }
}

/** Chaves de query hierárquicas (CLAUDE.md). Leituras sob demanda, sem cache (`gcTime: 0`). */
const CHAVE_RAIZ = ['avaliacoes-rh'] as const

export const avaliacoesRhKeys = {
  all: CHAVE_RAIZ,
  devolutivaBigFive: (candidaturaId: string) =>
    [...CHAVE_RAIZ, 'devolutiva-bigfive', candidaturaId] as const,
  sjtMc: (candidaturaId: string) => [...CHAVE_RAIZ, 'sjt-mc', candidaturaId] as const,
}

type RpcErro = { message: string; code?: string }

/**
 * NARROW confined cast: as RPCs do 52-08 ainda não estão em `database.types.ts` (vão ao ar no
 * 52-15). Só o nome e os args são alargados — NÃO um cliente sem tipos. Quem o retira: o plano
 * que rodar `npm run db:types < /dev/null` depois do apply (52-15) apaga este cast no mesmo commit.
 */
async function chamarRpc(fn: string, candidaturaId: string): Promise<{ data: unknown; error: RpcErro | null }> {
  return (supabase.rpc as unknown as (
    fn: string,
    args: { p_candidatura_id: string },
  ) => Promise<{ data: unknown; error: RpcErro | null }>)(fn, { p_candidatura_id: candidaturaId })
}

function codigoDoErro(error: RpcErro): AvaliacoesRhServiceError['code'] {
  return error.code === '42501' ? 'UNAUTHORIZED' : error.code === 'P0002' ? 'NOT_FOUND' : 'DATABASE_ERROR'
}

function isObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// ── Big Five ────────────────────────────────────────────────────────────────────────────────

/** As situações da devolutiva, como a RPC as devolve. */
export const SITUACOES_DEVOLUTIVA_RH = ['disponivel', 'sem_big_five', 'sem_devolutiva'] as const

export type SituacaoDevolutivaRh = (typeof SITUACOES_DEVOLUTIVA_RH)[number]

function isSituacaoDevolutiva(v: unknown): v is SituacaoDevolutivaRh {
  return typeof v === 'string' && (SITUACOES_DEVOLUTIVA_RH as readonly string[]).includes(v)
}

/**
 * Uma dimensão do Big Five no hub: a faixa que o candidato viu e o texto que ele recebeu.
 * SEM número da escala — o campo não existe no tipo, então não há o que renderizar (UX-07, D-02).
 */
export interface BigFiveHubDimensao {
  dim: DimBigFive
  banda: BandaBigFive
  texto_interpretativo: string
}

/** A devolutiva do Big Five, como o hub do RH a lê. */
export interface DevolutivaRh {
  situacao: SituacaoDevolutivaRh
  dimensoes: BigFiveHubDimensao[]
  disclaimer_emocional: string | null
  disclaimer_lgpd_crp: string | null
}

const ERRO_DEVOLUTIVA = 'Não foi possível carregar a devolutiva.'
const FORMATO_DEVOLUTIVA = 'Devolutiva em formato inesperado.'

/** Projeção EXPLÍCITA para o tipo estreito — campo extra que vier é descartado. */
function projetarDimensao(bruto: unknown): BigFiveHubDimensao {
  if (!isObjeto(bruto)) throw new AvaliacoesRhServiceError(FORMATO_DEVOLUTIVA, 'DATABASE_ERROR')
  const { dim, banda, texto_interpretativo: texto } = bruto
  if (
    typeof dim !== 'string' ||
    !(DIM_ORDER as readonly string[]).includes(dim) ||
    typeof banda !== 'string' ||
    !(BANDA_ORDER as readonly string[]).includes(banda) ||
    (texto !== null && texto !== undefined && typeof texto !== 'string')
  ) {
    throw new AvaliacoesRhServiceError(FORMATO_DEVOLUTIVA, 'DATABASE_ERROR')
  }
  // A RPC junta a página pela dimensão com LEFT JOIN: sem página, o texto vem nulo.
  return {
    dim: dim as DimBigFive,
    banda: banda as BandaBigFive,
    texto_interpretativo: typeof texto === 'string' ? texto : '',
  }
}

function textoOuNulo(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string') throw new AvaliacoesRhServiceError(FORMATO_DEVOLUTIVA, 'DATABASE_ERROR')
  return v
}

/**
 * Lê, para o RH, a devolutiva do Big Five da candidatura. A RPC (SECURITY DEFINER) aplica a
 * guarda de papel (RH ativo ou administrador) antes de qualquer busca.
 */
export async function lerDevolutivaBigFiveRh(candidaturaId: string): Promise<DevolutivaRh> {
  if (!candidaturaId) {
    throw new AvaliacoesRhServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await chamarRpc('ler_devolutiva_bigfive_rh', candidaturaId)
  if (error) {
    throw new AvaliacoesRhServiceError(ERRO_DEVOLUTIVA, codigoDoErro(error), error)
  }

  if (!isObjeto(data) || !isSituacaoDevolutiva(data.situacao)) {
    throw new AvaliacoesRhServiceError(FORMATO_DEVOLUTIVA, 'DATABASE_ERROR')
  }
  if (data.situacao !== 'disponivel') {
    return { situacao: data.situacao, dimensoes: [], disclaimer_emocional: null, disclaimer_lgpd_crp: null }
  }
  if (!Array.isArray(data.dimensoes)) {
    throw new AvaliacoesRhServiceError(FORMATO_DEVOLUTIVA, 'DATABASE_ERROR')
  }
  return {
    situacao: 'disponivel',
    dimensoes: data.dimensoes.map(projetarDimensao),
    disclaimer_emocional: textoOuNulo(data.disclaimer_emocional),
    disclaimer_lgpd_crp: textoOuNulo(data.disclaimer_lgpd_crp),
  }
}

// ── SJT de múltipla escolha ─────────────────────────────────────────────────────────────────

/** As situações do SJT MC, como a RPC as devolve. */
export const SITUACOES_SJT_MC_RH = ['disponivel', 'sem_sjt_mc'] as const

export type SituacaoSjtMcRh = (typeof SITUACOES_SJT_MC_RH)[number]

function isSituacaoSjtMc(v: unknown): v is SituacaoSjtMcRh {
  return typeof v === 'string' && (SITUACOES_SJT_MC_RH as readonly string[]).includes(v)
}

/** Uma alternativa como o candidato a viu — SEM etiqueta e SEM peso (gabarito). */
export interface SjtMcAlternativaRh {
  opcao_id: string
  texto: string
  escolhida: boolean
}

/** Uma situação do SJT MC: o cenário, as alternativas em ordem neutra e a escolha. */
export interface SjtMcItemRh {
  pergunta_id: string | null
  cenario: string | null
  alternativas: SjtMcAlternativaRh[]
  escolhida_tag: string | null
  escolhida_peso: number | null
  escolhida_no_banco: boolean
}

export interface SjtMcRh {
  situacao: SituacaoSjtMcRh
  itens: SjtMcItemRh[]
}

const ERRO_SJT_MC = 'Não foi possível carregar as situações.'
const FORMATO_SJT_MC = 'Situações em formato inesperado.'

function formatoSjt(): never {
  throw new AvaliacoesRhServiceError(FORMATO_SJT_MC, 'DATABASE_ERROR')
}

function textoOuNuloSjt(v: unknown): string | null {
  if (v === null || v === undefined) return null
  return typeof v === 'string' ? v : formatoSjt()
}

/** Projeção EXPLÍCITA da alternativa — `tag`/`peso` que viessem ficam para trás. */
function projetarAlternativa(bruto: unknown): SjtMcAlternativaRh {
  if (!isObjeto(bruto)) return formatoSjt()
  const { opcao_id: opcaoId, texto, escolhida } = bruto
  if (typeof opcaoId !== 'string' || typeof escolhida !== 'boolean') return formatoSjt()
  return { opcao_id: opcaoId, texto: textoOuNuloSjt(texto) ?? '', escolhida }
}

function projetarItem(bruto: unknown): SjtMcItemRh {
  if (!isObjeto(bruto) || !Array.isArray(bruto.alternativas)) return formatoSjt()
  const peso = bruto.escolhida_peso
  if (peso !== null && peso !== undefined && typeof peso !== 'number') return formatoSjt()
  if (typeof bruto.escolhida_no_banco !== 'boolean') return formatoSjt()
  return {
    pergunta_id: textoOuNuloSjt(bruto.pergunta_id),
    cenario: textoOuNuloSjt(bruto.cenario),
    alternativas: bruto.alternativas.map(projetarAlternativa),
    escolhida_tag: textoOuNuloSjt(bruto.escolhida_tag),
    escolhida_peso: typeof peso === 'number' ? peso : null,
    escolhida_no_banco: bruto.escolhida_no_banco,
  }
}

/**
 * Lê, para o RH, as situações do SJT de múltipla escolha da candidatura. A RPC (SECURITY DEFINER)
 * aplica a guarda de papel antes de qualquer busca e ordena as alternativas de forma neutra — o
 * cliente NÃO reordena (a ordem do banco é o gabarito, D-37).
 */
export async function lerSjtMcRh(candidaturaId: string): Promise<SjtMcRh> {
  if (!candidaturaId) {
    throw new AvaliacoesRhServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await chamarRpc('ler_sjt_mc_rh', candidaturaId)
  if (error) {
    throw new AvaliacoesRhServiceError(ERRO_SJT_MC, codigoDoErro(error), error)
  }

  if (!isObjeto(data) || !isSituacaoSjtMc(data.situacao) || !Array.isArray(data.itens)) {
    return formatoSjt()
  }
  if (data.situacao === 'sem_sjt_mc') return { situacao: 'sem_sjt_mc', itens: [] }
  return { situacao: 'disponivel', itens: data.itens.map(projetarItem) }
}
