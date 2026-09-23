/**
 * Triagem service — RH panel read (TRIAGEM-02) + comparativo invoke (TRIAGEM-03)
 * + on-demand reprocess of a failed/old AI analysis.
 *
 * The panel read is the [[reference_select_star_leaks_pii]] fix: an EXPLICIT column
 * allowlist joining `analise_candidato_vaga`. It must NEVER pull sensitive identity
 * columns — RLS is row-level only and does not hide columns (Phase 8 LGPD leak
 * lesson). The Wave-0 RED test asserts those identity columns are absent from the
 * projection.
 *
 * @module features/triagem/services/triagemService
 * @see src/features/vagas/services/candidaturasService.ts:1145-1230 (the star-projection hazard this replaces)
 * @see supabase/migrations/20260610000003_reprocessar_rpc.sql (reprocessar_analise RPC — live in PROD via 10-04)
 */

import { supabase } from '@/lib/supabase/client'
import { extractEfErrorCode } from '@/lib/efErrors'
// ⚠ O teto do comparativo tem UMA fonte: a constante que a própria Edge Function usa para
// RECUSAR. Importada por caminho relativo de `_shared` (contrato de zero imports do módulo —
// precedentes vivos: `exportacaoService.ts:61` com `EXPORT_ALLOWLIST` e
// `AutorizacoesStep.tsx:50` com `consent-text.json`). O ponto é que a mensagem que o RH lê
// seja montada do MESMO número que produziu a recusa: um literal paralelo aqui diria «4»
// enquanto o servidor recusasse em outro valor, e a tela mentiria com aparência de precisão.
import { COMPARATIVO_MAX_CANDIDATOS } from '../../../../supabase/functions/_shared/comparativo-config'
import type {
  PaginationParams,
  StatusCandidatura,
} from '@/features/vagas/types/vagasTypes'
// NOTE: `EtapaFunilM2` (o enum M2 vivo no DB) é declarado mais abaixo neste módulo;
// type-aliases são hoisted, então pode ser referenciado em posições de tipo acima.

/**
 * Erro do serviço de triagem (espelha CandidaturasServiceError).
 */
export class TriagemServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'MIXED_VAGA'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'TriagemServiceError'
  }
}

/**
 * Filtros do painel de triagem (etapa + status + busca por nome).
 */
export interface TriagemFilters {
  status?: StatusCandidatura | null
  /** Etapa do funil M2 (= `candidaturas.etapa_atual` no DB). W2: era o enum legado M1. */
  etapa?: EtapaFunilM2 | null
  /** Busca por nome do candidato (ilike). */
  nome?: string | null
}

/**
 * Ordenação do painel. `score_desc` (default) = score_match DESC nulls-last;
 * pendente/falhou (score null) ficam no fim.
 */
export type TriagemOrderBy = 'score_desc' | 'score_asc' | 'recentes'

/**
 * Análise embutida (allowlist — sem PII).
 */
export interface TriagemAnalise {
  score_match: number | null
  pontos_fortes: string[]
  gaps: string[]
  flags: string[]
  status: string | null
}

/**
 * Linha do painel de triagem (projeção allowlist — sem colunas de identidade sensíveis).
 */
export interface TriagemRow {
  id: string
  status: StatusCandidatura
  etapa_atual: EtapaFunilM2
  created_at: string
  curriculo_nome_original: string | null
  candidato: { id: string; nome_completo: string } | null
  analise: TriagemAnalise | null
  /**
   * Phase 45 / ERASE-05 — Invariante 9: o silencio tambem e proibido.
   *
   * Nao-nula quando o titular encerrou a candidatura a pedido (retirada avulsa ou
   * encerramento disparado pelo pedido de exclusao — os dois escrevem esta MESMA
   * coluna). E ADITIVA de proposito: `deleted_at` continua NULL, entao a linha
   * segue visivel nas cinco leituras de RH que filtram por ele. Uma candidatura que
   * hoje soma na etapa e amanha nao esta la e um recrutador agendando entrevista
   * com quem saiu.
   */
  encerrada_a_pedido_em: string | null
}

/**
 * Response paginado do painel.
 */
export interface TriagemPanelResponse {
  data: TriagemRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

/**
 * ⚠ PONTE DE TIPOS TEMPORÁRIA — Pitfall 10, o ÚNICO idioma autorizado no projeto.
 *
 * POR QUE ELA EXISTE, e por que remover a coluna do `select` seria a saída errada:
 * `v_triagem_panel` em `database.types.ts` ainda NÃO expõe `encerrada_a_pedido_em`.
 * A view só ganha a coluna quando a migration `20260805000008` for APLICADA (plano
 * 45-11) e `npm run db:types` regenerar os tipos — e este plano AUTORA migrations,
 * não as aplica. Sem a ponte, o `select` não compila contra o tipo VELHO da view.
 *
 * As três saídas erradas, e por que cada uma é pior:
 *   · editar `database.types.ts` à mão → PROIBIDO (CLAUDE.md: arquivo gerado);
 *   · tirar a coluna do `select` → reintroduz o silêncio que a Invariante 9 proíbe:
 *     a candidatura encerrada volta a sumir da tela do RH sem uma palavra;
 *   · `select('*')` → projeção curinga numa view que carrega PII, exatamente o que a
 *     allowlist existe para impedir.
 *
 * A conversão é do OBJETO cliente, NUNCA a extração do método: extrair perde o `this`
 * e derruba o `PostgrestClient` em runtime — defeito que os testes NÃO pegam, porque
 * mockam o método inteiro. O nome da view continua LITERAL no tipo, então um erro de
 * digitação nele ainda não compila, e a allowlist de colunas continua nomeada.
 *
 * ⚠ REMOVER ESTA PONTE assim que os tipos forem regenerados após o apply do 45-11.
 * Ela é dívida com data de validade, não desenho.
 */
interface ResultadoTriagem {
  data: unknown[] | null
  error: { message: string } | null
  count: number | null
}

interface ConsultaTriagem extends PromiseLike<ResultadoTriagem> {
  select(colunas: string, opcoes?: { count?: 'exact' }): ConsultaTriagem
  eq(coluna: string, valor: unknown): ConsultaTriagem
  is(coluna: string, valor: null): ConsultaTriagem
  ilike(coluna: string, valor: string): ConsultaTriagem
  order(
    coluna: string,
    opcoes?: { ascending?: boolean; nullsFirst?: boolean },
  ): ConsultaTriagem
  range(de: number, ate: number): ConsultaTriagem
}

interface ClienteTriagem {
  from(view: 'v_triagem_panel'): ConsultaTriagem
}

const clienteTriagem = supabase as unknown as ClienteTriagem

/**
 * Lista candidaturas de uma vaga para o painel de triagem RH (TRIAGEM-02).
 *
 * Projeção ALLOWLIST — junta `analise_candidato_vaga` (score_match, pontos_fortes,
 * gaps, flags, status). NUNCA projeção-estrela, NUNCA colunas de identidade sensíveis.
 * Ordenação default: score_match DESC nulls-last (pendente/falhou no fim).
 * Paginação server-side 20/página via `.range()`.
 */
export async function listTriagemPanel(
  vagaId: string,
  filters: TriagemFilters = {},
  orderBy: TriagemOrderBy = 'score_desc',
  pagination: PaginationParams = { page: 1, limit: 20 },
): Promise<TriagemPanelResponse> {
  if (!vagaId) {
    throw new TriagemServiceError('vagaId é obrigatório', 'INVALID_INPUT')
  }

  // Lê da view `v_triagem_panel` (security_invoker=true → preserva a RLS das tabelas-base):
  // ela achata score_match + análise + candidato em colunas TOP-LEVEL. PostgREST NÃO ordena
  // linhas-pai por coluna de recurso EMBUTIDO (o `referencedTable:'analise'` ordenava só o array
  // interno → o sort por score nunca funcionava); com a view, `order('score_match')` ordena de
  // verdade e a paginação `.range()` server-side continua correta. O filtro por nome também vira
  // top-level (`candidato_nome`), dispensando o hack de INNER-embed.
  let query = clienteTriagem
    .from('v_triagem_panel')
    .select(
      `id, status, etapa_atual, created_at, curriculo_nome_original,
       candidato_id, candidato_nome,
       score_match, pontos_fortes, gaps, flags, analise_status,
       encerrada_a_pedido_em`,
      { count: 'exact' },
    )
    .eq('vaga_id', vagaId)
    .is('deleted_at', null)

  // Filtros etapa + status.
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.etapa) {
    query = query.eq('etapa_atual', filters.etapa)
  }
  // Busca por nome — agora coluna top-level da view.
  if (filters.nome) {
    query = query.ilike('candidato_nome', `%${filters.nome}%`)
  }

  // Ordenação: score_match TOP-LEVEL na view, nulls-last (pendente/falhou ao fim).
  if (orderBy === 'recentes') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('score_match', {
      ascending: orderBy === 'score_asc',
      nullsFirst: false,
    })
  }

  // Paginação 20/página.
  const from = (pagination.page - 1) * pagination.limit
  const to = from + pagination.limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new TriagemServiceError(
      `Erro ao carregar candidaturas: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  const total = count ?? 0
  const totalPages = Math.ceil(total / pagination.limit)

  // Mapeia as colunas FLAT da view → forma aninhada do TriagemRow (candidato/analise).
  // `analise_status` non-null = existe row de análise (sucesso/falhou/pendente); null = sem análise.
  const rows: TriagemRow[] = (data ?? []).map((raw) => {
    const r = raw as Record<string, unknown>
    return {
      id: r.id as string,
      status: r.status as StatusCandidatura,
      etapa_atual: r.etapa_atual as EtapaFunilM2,
      created_at: r.created_at as string,
      curriculo_nome_original: (r.curriculo_nome_original as string | null) ?? null,
      encerrada_a_pedido_em: (r.encerrada_a_pedido_em as string | null) ?? null,
      candidato: r.candidato_id
        ? { id: r.candidato_id as string, nome_completo: (r.candidato_nome as string) ?? '' }
        : null,
      analise:
        r.analise_status != null
          ? {
              score_match: (r.score_match as number | null) ?? null,
              pontos_fortes: (r.pontos_fortes as string[] | null) ?? [],
              gaps: (r.gaps as string[] | null) ?? [],
              flags: (r.flags as string[] | null) ?? [],
              status: (r.analise_status as string | null) ?? null,
            }
          : null,
    }
  })

  return {
    data: rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasMore: pagination.page < totalPages,
    },
  }
}

/**
 * Re-dispara a análise da IA para uma candidatura (TRIAGEM-02 — botão "Reprocessar análise").
 *
 * Chama a RPC SECURITY DEFINER `reprocessar_analise(p_candidatura_id)` — já viva em PROD
 * (autorada em 10-02, aplicada em 10-04). A RPC re-emite o mesmo dispatch net.http_post do
 * trigger, com idempotency fresca (a EF faz upsert da row — nunca duplica).
 * Apenas um client call; NÃO é migration.
 */
export async function reprocessarAnalise(candidaturaId: string): Promise<void> {
  if (!candidaturaId) {
    throw new TriagemServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { error } = await supabase.rpc('reprocessar_analise', {
    p_candidatura_id: candidaturaId,
  })

  if (error) {
    throw new TriagemServiceError(
      `Não foi possível reprocessar a análise: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
}

/**
 * Proveniência do resultado de IA que a EF devolve (D-27b / D-28, plano 49-08).
 *
 * Os três campos são ADITIVOS no contrato: a `DecisaoFinalPage` (que consome o mesmo
 * hook e ainda não os lê) segue compilando e funcionando como hoje até o 49-22.
 *
 * `null` em qualquer um deles é informação, não ausência de informação:
 *   - `provedor_ia = null` ⇒ NENHUM provedor foi chamado (teto de custo, injeção — a EF
 *     mapeia `provider='none'` para NULL por obrigação do CHECK em PROD);
 *   - `modelo_ia = null` ⇒ o modelo não foi registrado (D-30 — as linhas antigas);
 *   - `fallback_cause = null` ⇒ não houve fallback.
 */
export interface ProvenienciaIA {
  /** `'anthropic'` (o primário) | `'openai'` (o de contingência) | `null`. */
  provedor_ia: string | null
  /** O modelo que DE FATO respondeu, não o configurado. `null` = não registrado (D-30). */
  modelo_ia: string | null
  /** Causa crua do fallback (`anthropic_max_tokens`, `anthropic_timeout`, …) ou `null`. */
  fallback_cause: string | null
}

/**
 * Resultado do comparativo: o ranking, a tabela rótulo→chave e a proveniência.
 *
 * `posicoes` mapeia o rótulo anonimizado que a IA devolve (`C1`, `C2`, …) para o
 * `candidatura_id` REAL, montado pela EF no MESMO laço que montou o prompt (49-08). É o
 * que permite à tela rotular cada posição pela CHAVE em vez de pela ordem da seleção.
 */
export interface ComparativoResponse extends ProvenienciaIA {
  ranking: unknown
  /** `C<n>` → `candidatura_id`. Vazio quando a EF publicada ainda não o devolve. */
  posicoes: Record<string, string>
  latencia_ms?: number
}

/**
 * Cópia pt-BR de cada recusa da EF `comparativo-candidatos`.
 *
 * ⚠ **CADA CAUSA COM A SUA MENSAGEM — e é por isso que este mapa existe.** Até o plano
 * 49-08 a EF colapsava três causas distintas num único `MIXED_VAGA`, cuja frase («vagas
 * diferentes») era FALSA em duas delas: um knockout sem análise e um candidato ainda não
 * analisado são da MESMA vaga. O RH lia «vagas diferentes» e ia caçar um erro que não
 * existia. A EF passou a emitir `ENCERRADA` e `SEM_ANALISE`; se este mapa não os
 * conhecesse, eles cairiam no genérico — melhor que a mentira anterior, e pior que o alvo.
 *
 * `MIXED_VAGA` FICA, com o escopo reduzido ao único caso em que a sua frase é verdadeira
 * (candidatura da vaga certa cuja ANÁLISE aponta para outra).
 */
const RECUSA_COMPARATIVO_COPY: Record<string, string> = {
  MIXED_VAGA:
    'Os candidatos selecionados pertencem a vagas diferentes. Compare candidatos de uma mesma vaga.',
  ENCERRADA:
    'Uma das candidaturas selecionadas está encerrada e não entra no comparativo.',
  SEM_ANALISE:
    'Ainda não há análise de IA para todos os selecionados. Aguarde a análise ou reprocesse.',
  // O teto vem da constante que a EF usa para recusar — nunca de um literal paralelo.
  VALIDATION: `Selecione entre 2 e ${COMPARATIVO_MAX_CANDIDATOS} candidatos para comparar.`,
  // Genérica DE PROPÓSITO: a EF responde o MESMO 403 para «não existe» e «não é sua»
  // (49-08 / T-49-08-02). Uma mensagem que os distinguisse viraria oráculo de existência.
  FORBIDDEN: 'Você não tem acesso a uma das candidaturas selecionadas.',
}

/** Cópia genérica de última instância — nunca uma frase específica sobre causa desconhecida. */
const COMPARATIVO_FALHA_GENERICA = 'Não foi possível gerar o comparativo. Tente novamente.'

/**
 * Invoca a EF comparativo-candidatos (TRIAGEM-03) com { vaga_id, candidatura_ids }.
 *
 * Devolve, além do ranking, a tabela `posicoes` (rótulo→chave) e a proveniência do
 * resultado — os três ADITIVOS ao contrato antigo (plano 49-08 / D-55). Mapeia cada
 * recusa da EF para a sua própria cópia pt-BR (ver `RECUSA_COMPARATIVO_COPY`).
 */
export async function invokeComparativo(
  vagaId: string,
  candidaturaIds: string[],
): Promise<ComparativoResponse> {
  const { data, error } = await supabase.functions.invoke('comparativo-candidatos', {
    body: { vaga_id: vagaId, candidatura_ids: candidaturaIds },
  })

  // Shared helper reads the EF error_code from BOTH the 200 body and a non-2xx
  // FunctionsHttpError (generalizes the old inline MIXED_VAGA read; degrades safely).
  // Carried on `details.error_code` so <AsyncState errorCode> can branch the copy
  // (e.g. AI_UNAVAILABLE → "serviço de IA sobrecarregado"); only the code, never PII.
  const error_code = await extractEfErrorCode(data, error)

  // ⚠ O `error` (FunctionsHttpError) chega ANTES de `data.ok` numa recusa 4xx — é por aqui
  // que passam ENCERRADA, SEM_ANALISE, VALIDATION e FORBIDDEN. Ramificar a cópia só no
  // bloco `!data.ok` abaixo deixaria as quatro caírem no genérico.
  if (error) {
    const copy = error_code ? RECUSA_COMPARATIVO_COPY[error_code] : undefined
    throw new TriagemServiceError(
      copy ?? COMPARATIVO_FALHA_GENERICA,
      error_code === 'MIXED_VAGA' ? 'MIXED_VAGA' : 'NETWORK_ERROR',
      { error_code, raw: error },
    )
  }

  if (!data?.ok) {
    const copy = error_code ? RECUSA_COMPARATIVO_COPY[error_code] : undefined
    throw new TriagemServiceError(
      copy ?? COMPARATIVO_FALHA_GENERICA,
      // PRESERVE MIXED_VAGA: o `code` do serviço continua sendo o discriminante que a
      // `ComparativoCandidatosPage.errorCodeOf` lê quando os `details` vêm sem o código.
      error_code === 'MIXED_VAGA' ? 'MIXED_VAGA' : 'NETWORK_ERROR',
      { error_code, raw: data },
    )
  }

  return {
    ranking: data.ranking,
    // A EF publicada antes do 49-08 não devolvia `posicoes`: um `{}` aqui faz a tela
    // mostrar o rótulo CRU (`C1`), que é a degradação correta — nunca o nome do vizinho.
    posicoes: (data.posicoes ?? {}) as Record<string, string>,
    provedor_ia: data.provedor_ia ?? null,
    modelo_ia: data.modelo_ia ?? null,
    fallback_cause: data.fallback_cause ?? null,
    latencia_ms: data.latencia_ms,
  }
}

/**
 * Move uma candidatura para uma etapa do processo (TRIAGEM — ações inline do comparativo).
 *
 * Faz um UPDATE em `candidaturas.etapa_atual`, que dispara o trigger BEFORE UPDATE
 * `avancar_etapa()` (Phase 6) — este valida a transição e grava a row de auditoria em
 * `historico_candidatura` na mesma transação. A IA é apenas sugestão: a ação só ocorre
 * após confirmação humana no alert-dialog (RNF-07a — nunca auto-ação por score).
 *
 * - Avançar: `novaEtapa` = próxima etapa do funil M2 (ex.: 'avaliacao_assincrona') — NÃO
 *   exige justificativa.
 * - Rejeitar: `novaEtapa` = 'rejeitado' (terminal) — NÃO exige justificativa longa aqui
 *   (a justificativa detalhada é exigida apenas na Decisão Final / Etapa 6).
 *
 * O tipo é o enum `etapa_processo` do DB (funil M2), distinto do legado `EtapaProcesso`
 * do front-end M1 (schema-drift conhecido — ver vagasTypes.ts).
 */
export type EtapaFunilM2 =
  | 'inscricao'
  | 'triagem'
  | 'avaliacao_assincrona'
  | 'entrevista_online'
  | 'entrevista_presencial'
  | 'decisao_final'
  | 'aprovado'
  | 'rejeitado'

/** Próxima etapa após a Triagem (Etapa 2) no funil M2 — usada pelo "Avançar" do comparativo. */
export const PROXIMA_ETAPA_APOS_TRIAGEM: EtapaFunilM2 = 'avaliacao_assincrona'

/**
 * W2: rótulos pt-BR do enum M2 `etapa_processo` (= `candidaturas.etapa_atual` no DB).
 *
 * O front-end M1 carrega um enum legado `EtapaProcesso` (triagem/bigfive/disc/raven/
 * cultura/avaliacao_final) que NÃO existe no DB M2 — selecioná-lo no filtro do painel
 * gerava `eq('etapa_atual','bigfive')` → Postgres 22P02 (invalid enum), e o map de
 * rótulos M1 mostrava enum cru para etapas M2. Este map (espelha
 * `Constants.public.Enums.etapa_processo` em database.types.ts na RAIZ) é a fonte de
 * verdade do filtro + do rótulo da tabela de triagem.
 */
export const ETAPA_M2_LABELS: Record<EtapaFunilM2, string> = {
  inscricao: 'Inscrição',
  triagem: 'Triagem',
  avaliacao_assincrona: 'Avaliação Assíncrona',
  entrevista_online: 'Entrevista Online',
  entrevista_presencial: 'Entrevista Presencial',
  decisao_final: 'Decisão Final',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

/** Opções do filtro de etapa do painel (ordem do funil M2), com rótulos pt-BR. */
export const ETAPA_M2_OPTIONS: { value: EtapaFunilM2; label: string }[] = (
  [
    'inscricao',
    'triagem',
    'avaliacao_assincrona',
    'entrevista_online',
    'entrevista_presencial',
    'decisao_final',
    'aprovado',
    'rejeitado',
  ] as EtapaFunilM2[]
).map((value) => ({ value, label: ETAPA_M2_LABELS[value] }))

/**
 * Motivo estruturado da rejeição RH (OPER-02) — espelha o enum `public.motivo_rejeicao_rh`
 * (6 literais pt-BR) autorado na migration 31-01. O motivo entra como param da RPC
 * `rejeitar_candidatura`; o enum valida no boundary do parâmetro no servidor.
 */
export type MotivoRejeicaoRh =
  | 'perfil_desalinhado'
  | 'reprovado_avaliacao'
  | 'reprovado_entrevista'
  | 'nao_compareceu'
  | 'desistencia'
  | 'outro'

export async function updateCandidaturaEtapa(
  candidaturaId: string,
  novaEtapa: EtapaFunilM2,
  justificativa?: string,
): Promise<void> {
  if (!candidaturaId) {
    throw new TriagemServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // WR-05: rejeição NÃO passa por este caminho. O único reject auditado é
  // `rejeitarCandidatura` (RPC SECURITY DEFINER com gate ≥50 + posse de vaga +
  // motivo estruturado). Um `updateCandidaturaEtapa(id, 'rejeitado')` seria um
  // bypass silencioso desse gate (o trigger auditaria a transição, mas sem motivo,
  // sem justificativa ≥50 e sem checagem de posse). Fechamos o caminho morto: qualquer
  // chamador que tente rejeitar por aqui recebe um erro explícito apontando para a RPC.
  if (novaEtapa === 'rejeitado') {
    throw new TriagemServiceError(
      'Rejeição deve usar rejeitarCandidatura (RPC auditada), não updateCandidaturaEtapa',
      'INVALID_INPUT',
    )
  }

  // `etapa_justificativa` ENTRA SEMPRE no SET (nunca omitido) — o trigger
  // `avancar_etapa()` copia `NEW.etapa_justificativa` para
  // `historico_candidatura.criterio_texto`; se a coluna ficar fora do UPDATE, o
  // trigger lê o valor ANTIGO armazenado (Pitfall 3 — o hazard da justificativa
  // stale). Avanço forward → null; retrocesso → o texto fresco (RAISE do trigger se
  // vazio); rejeição → o texto ≥50. OPER-01/03.
  const update: {
    etapa_atual: EtapaFunilM2
    status?: StatusCandidatura
    etapa_justificativa: string | null
  } = {
    etapa_atual: novaEtapa,
    etapa_justificativa: justificativa ?? null,
  }

  const { error } = await supabase
    .from('candidaturas')
    .update(update)
    .eq('id', candidaturaId)

  if (error) {
    throw new TriagemServiceError(
      `Não foi possível atualizar a candidatura: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
}

/**
 * Rejeita uma candidatura (OPER-02) via a RPC SECURITY DEFINER `rejeitar_candidatura`
 * (autorada em 31-01, aplicada LIVE no [BLOCKING] 31-06).
 *
 * A RPC é a autoridade do servidor: re-autoriza (WR-04 vaga-owner), aplica o gate
 * `char_length(btrim(justificativa)) >= 50` (RAISE `check_violation`) e faz UM único
 * `UPDATE candidaturas` (etapa_atual+status='rejeitado' + `etapa_justificativa`) que
 * dispara o trigger `avancar_etapa()` — o ÚNICO escritor de `historico_candidatura`.
 * Nunca decide por score (RNF-07a). Este serviço é um pass-through tipado; ele NÃO
 * reimplementa o ≥50 — apenas mapeia o erro da RPC para `TriagemServiceError` (toast).
 *
 * NOTA: a janela pré-regen fechou. `rejeitar_candidatura` e a coluna
 * `encerrada_a_pedido_em` de `v_triagem_panel` estão em `database.types.ts`, e os
 * `as never` que existiam por causa dela foram removidos (WINDOWS 18).
 */
export async function rejeitarCandidatura(
  candidaturaId: string,
  motivo: MotivoRejeicaoRh,
  justificativa: string,
): Promise<void> {
  if (!candidaturaId) {
    throw new TriagemServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { error } = await supabase.rpc('rejeitar_candidatura', {
    p_candidatura_id: candidaturaId,
    p_motivo: motivo,
    p_justificativa: justificativa,
  })

  if (error) {
    throw new TriagemServiceError(
      `Não foi possível rejeitar o candidato: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
}
