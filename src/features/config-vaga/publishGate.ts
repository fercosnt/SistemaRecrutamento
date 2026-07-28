/**
 * Phase 7 / D-12 — Publish gate (rascunho → ativa) pure function.
 *
 * Returns the list of FAILING conditions (empty array = all pass). Rascunho
 * never validates; this gate only runs on the "Publicar vaga" action.
 *
 * D-12 conditions:
 *   (1) `pesos_avaliacao` must sum to exactly 100
 *   (2) ≥1 test in `testes_aplicaveis` with `obrigatorio = true`
 *   (3) every pergunta carrying a `tag = 'knockout'` option must be `obrigatoria`
 *
 * D-09 conditions (Etapa-1 qualification block, INSCR-02):
 *   (4) at most 10 perguntas in the qualification block
 *   (5) at most 1 open-ended (resposta_texto) pergunta
 * The authoritative D-09 gate is the server `publish_vaga` RPC (Plan 04); this
 * is the client mirror for instant UX feedback.
 *
 * Defense-in-depth: the authoritative gate is the server `publish_vaga` RPC;
 * this client gate gives instant UX feedback (pt-BR copy per UI-SPEC).
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-12)
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-RESEARCH.md §Architecture Pattern 3
 * @module features/config-vaga/publishGate
 */
import { somaPesos, type PesosAvaliacao } from './schemas/pesosAvaliacaoSchema'
import type { TagOpcaoEnum } from './types/configVagaTypes'

export interface PublishGateTesteAplicavel {
  teste: string
  obrigatorio: boolean
  customizado: boolean
}

export interface PublishGateOpcao {
  opcao_id?: string | null
  texto: string
  tag: TagOpcaoEnum
}

export interface PublishGatePergunta {
  id: string
  texto_pergunta: string
  obrigatoria: boolean
  opcoes: PublishGateOpcao[]
}

/**
 * An Etapa-1 qualification pergunta as seen by the D-09 gate. Only the answer
 * kind matters here. `'texto'` and `'resposta_texto'` are BOTH treated as
 * open-ended (the schema uses `'texto'`; the server/contract uses
 * `'resposta_texto'`) so the gate stays robust to either spelling.
 */
export interface PublishGateQualificacaoPergunta {
  texto_pergunta: string
  tipo_resposta: string
}

export interface PublishGateInput {
  pesos_avaliacao: PesosAvaliacao
  testes_aplicaveis: PublishGateTesteAplicavel[]
  perguntas: PublishGatePergunta[]
  /** The Etapa-1 qualification block (D-09). Optional — absent = no D-09 check. */
  qualificacao?: PublishGateQualificacaoPergunta[]
}

/** A single failing publish condition (stable code + pt-BR message). */
export interface PublishGateFailure {
  code:
    | 'PESOS_SOMA'
    | 'SEM_TESTE_OBRIGATORIO'
    | 'KNOCKOUT_NAO_OBRIGATORIA'
    | 'QUALIFICACAO_MAX_PERGUNTAS'
    | 'QUALIFICACAO_MAX_ABERTAS'
  message: string
  /** For condition 3 — the perguntas that violate the knockout rule. */
  perguntaIds?: string[]
}

/** D-09 structural bounds for the Etapa-1 qualification block. */
const MAX_QUALIFICACAO_PERGUNTAS = 10
const MAX_QUALIFICACAO_ABERTAS = 1

/** Open-ended answer kinds (schema spelling `'texto'`, contract `'resposta_texto'`). */
const TIPOS_ABERTOS = new Set(['texto', 'resposta_texto'])

/**
 * Evaluate the D-12 publish gate. Returns every failing condition so the UI can
 * surface all blockers at once.
 */
export function publishGate(input: PublishGateInput): PublishGateFailure[] {
  const failures: PublishGateFailure[] = []

  // Condition 1 — pesos must sum to 100 (integers; Pitfall 4).
  if (somaPesos(input.pesos_avaliacao) !== 100) {
    failures.push({
      code: 'PESOS_SOMA',
      message: 'Os pesos de avaliação precisam somar 100%.',
    })
  }

  // Condition 2 — at least one obrigatorio test.
  const temTesteObrigatorio = input.testes_aplicaveis.some((t) => t.obrigatorio)
  if (!temTesteObrigatorio) {
    failures.push({
      code: 'SEM_TESTE_OBRIGATORIO',
      message: 'Defina pelo menos um teste obrigatório.',
    })
  }

  // Condition 3 — every pergunta with a knockout option must be obrigatoria.
  const knockoutNaoObrigatoria = input.perguntas.filter(
    (p) =>
      !p.obrigatoria && p.opcoes.some((o) => o.tag === 'knockout')
  )
  if (knockoutNaoObrigatoria.length > 0) {
    failures.push({
      code: 'KNOCKOUT_NAO_OBRIGATORIA',
      message:
        'Toda pergunta com opção eliminatória (knockout) deve ser obrigatória.',
      perguntaIds: knockoutNaoObrigatoria.map((p) => p.id),
    })
  }

  // Condition 4 (D-09) — at most 10 perguntas in the Etapa-1 qualification block.
  const qualificacao = input.qualificacao ?? []
  if (qualificacao.length > MAX_QUALIFICACAO_PERGUNTAS) {
    failures.push({
      code: 'QUALIFICACAO_MAX_PERGUNTAS',
      message: 'A qualificação da Etapa 1 permite no máximo 10 perguntas.',
    })
  }

  // Condition 5 (D-09) — at most 1 open-ended pergunta in the qualification block.
  const abertas = qualificacao.filter((p) => TIPOS_ABERTOS.has(p.tipo_resposta))
  if (abertas.length > MAX_QUALIFICACAO_ABERTAS) {
    failures.push({
      code: 'QUALIFICACAO_MAX_ABERTAS',
      message: 'A qualificação da Etapa 1 permite no máximo 1 pergunta aberta.',
    })
  }

  return failures
}
