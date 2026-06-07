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

export interface PublishGateInput {
  pesos_avaliacao: PesosAvaliacao
  testes_aplicaveis: PublishGateTesteAplicavel[]
  perguntas: PublishGatePergunta[]
}

/** A single failing publish condition (stable code + pt-BR message). */
export interface PublishGateFailure {
  code: 'PESOS_SOMA' | 'SEM_TESTE_OBRIGATORIO' | 'KNOCKOUT_NAO_OBRIGATORIA'
  message: string
  /** For condition 3 — the perguntas that violate the knockout rule. */
  perguntaIds?: string[]
}

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

  return failures
}
