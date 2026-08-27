/**
 * Serviço da avaliação cognitiva por Matrizes de Raven.
 *
 * SEPARADO de `cognitivoService` de propósito — são instrumentos diferentes, não a
 * mesma coisa em lugares diferentes:
 *
 *   cognitivoService  →  `cognitivo_itens`  → enunciado + alternativas (TEXTO)
 *   ravenService      →  `questoes_raven`   → matriz + opções (IMAGEM)
 *
 * E os gates também diferem. O cognitivo textual é liberado pela vaga
 * (`aplica_cognitivo`); o Raven é liberado NOMINALMENTE, por candidatura, em
 * `cognitivo_liberacao` — decisão de 2026-08-26: aplicação presencial a poucos
 * finalistas, para não criar assimetria de avaliação entre candidatos da mesma vaga.
 *
 * ⚠ O GABARITO NUNCA CHEGA AO CLIENTE. `questoes_raven.resposta_correta` teve o
 * SELECT revogado para `authenticated` e `anon` (migration 20260826000010 — até
 * 2026-08-26 estava aberto, inclusive para quem nem estava logado). As questões vêm
 * pela RPC `get_questoes_raven()`, que projeta tudo MENOS o gabarito. O acerto é
 * decidido no servidor: `after_insert_resposta_raven` chama `calcular_scores_raven`
 * quando a sexagésima resposta entra.
 *
 * @module features/avaliacao-cognitiva/services/ravenService
 */
import { supabase } from '@/lib/supabase/client'

export class RavenServiceError extends Error {
  constructor(
    message: string,
    public code: 'NAO_LIBERADO' | 'JA_RESPONDIDO' | 'INCOMPLETO' | 'DATABASE_ERROR' | 'NETWORK_ERROR',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'RavenServiceError'
  }
}

/** Uma questão como o CANDIDATO a recebe — sem gabarito. */
export interface QuestaoRaven {
  id: string
  numero_questao: number
  serie: string
  imagem_matriz_url: string
  /** URLs das alternativas. Séries A/B têm 6; C/D/E têm 8. */
  opcoes_imagens: string[]
}

export interface LiberacaoRaven {
  liberado: boolean
  liberado_em: string | null
  ja_respondeu: boolean
}

/** As 60 questões, em ordem de série e número. Sem `resposta_correta`. */
export async function listarQuestoesRaven(): Promise<QuestaoRaven[]> {
  const { data, error } = await supabase.rpc('get_questoes_raven')

  if (error) {
    throw new RavenServiceError(
      `Erro ao carregar as questões: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return (data ?? []).map((q: Record<string, unknown>) => ({
    id: String(q.id),
    numero_questao: Number(q.numero_questao),
    serie: String(q.serie),
    imagem_matriz_url: String(q.imagem_matriz_url ?? ''),
    opcoes_imagens: Array.isArray(q.opcoes_imagens)
      ? (q.opcoes_imagens as unknown[]).map((o) =>
          typeof o === 'string' ? o : String((o as { url?: string })?.url ?? ''),
        )
      : [],
  }))
}

/**
 * O candidato está liberado, e já respondeu?
 *
 * As duas leituras andam juntas porque a tela precisa distinguir TRÊS estados que
 * seriam confundidos por um booleano só: não liberado (o RH ainda não abriu),
 * liberado e pendente (pode fazer), e já respondido (não refaz). Um "não pode
 * entrar" que não diz qual dos três é o motivo deixa o candidato sem ação possível.
 */
export async function consultarLiberacao(candidaturaId: string): Promise<LiberacaoRaven> {
  const [lib, resp] = await Promise.all([
    supabase
      .from('cognitivo_liberacao')
      .select('liberado_em, revogado_em')
      .eq('candidatura_id', candidaturaId)
      .is('revogado_em', null)
      .maybeSingle(),
    supabase
      .from('scores_raven')
      .select('candidatura_id')
      .eq('candidatura_id', candidaturaId)
      .maybeSingle(),
  ])

  if (lib.error) {
    throw new RavenServiceError(
      `Erro ao verificar a liberação: ${lib.error.message}`,
      'DATABASE_ERROR',
      lib.error,
    )
  }

  return {
    liberado: !!lib.data,
    liberado_em: (lib.data?.liberado_em as string | undefined) ?? null,
    ja_respondeu: !!resp.data,
  }
}

/**
 * Grava as 60 respostas. O score sai do trigger `after_insert_resposta_raven`, que
 * chama `calcular_scores_raven` quando a sexagésima entra.
 *
 * ⚠ EXIGE AS 60 ANTES DE ESCREVER QUALQUER UMA. Um envio parcial deixaria linhas em
 * `respostas_raven` sem nunca disparar o cálculo — o candidato apareceria como "fez
 * a prova" sem score, e refazer esbarraria nas respostas já gravadas. Ou entra tudo,
 * ou não entra nada.
 *
 * ⚠ O TEMPO PRECISA VIR DAQUI, item a item. `calcular_scores_raven` derivava o total
 * de `MAX(created_at) - MIN(created_at)`: no app original cada resposta era inserida
 * no instante em que o candidato a dava, e o intervalo entre a primeira e a última
 * ERA a duração da prova. Aqui as 60 entram na mesma transação — todas com o mesmo
 * `created_at` — e esse intervalo é sempre ZERO. A primeira execução real gravou
 * `tempo_total_segundos = 0` com o cronômetro marcando 2min53 na tela (2026-08-26).
 *
 * Por isso cada linha carrega o tempo do SEU item, e a função passou a somar quando
 * a coluna vem preenchida (migration 20260827000001), caindo no intervalo antigo
 * quando vem nula.
 */
export async function submeterRaven(
  candidaturaId: string,
  respostas: Record<string, number>,
  temposPorQuestao: Record<string, number>,
): Promise<void> {
  const linhas = Object.entries(respostas).map(([questao_id, resposta]) => ({
    candidatura_id: candidaturaId,
    questao_id,
    resposta,
    // `?? null` e não `?? 0`: um item sem tempo medido é desconhecido, não instantâneo.
    tempo_resposta_segundos: temposPorQuestao[questao_id] ?? null,
  }))

  if (linhas.length !== 60) {
    throw new RavenServiceError(
      `A avaliação tem 60 questões e ${linhas.length} foram respondidas.`,
      'INCOMPLETO',
    )
  }

  const { error } = await supabase.from('respostas_raven').insert(linhas)

  if (error) {
    // 42501 = a policy de INSERT recusou: sem liberação ativa ou não é o dono.
    if (error.code === '42501') {
      throw new RavenServiceError(
        'Esta avaliação não está liberada para você.',
        'NAO_LIBERADO',
        error,
      )
    }
    if (error.code === '23505') {
      throw new RavenServiceError('Esta avaliação já foi respondida.', 'JA_RESPONDIDO', error)
    }
    throw new RavenServiceError(`Erro ao enviar as respostas: ${error.message}`, 'DATABASE_ERROR', error)
  }
}
