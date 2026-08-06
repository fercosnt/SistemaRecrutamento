/**
 * useRetirarCandidatura — a mutação da retirada de UMA candidatura (ERASE-05).
 *
 * ── A PORTA É A EDGE FUNCTION, E ISSO NÃO É PREFERÊNCIA DE ARQUITETURA ──────
 * A RPC `retirar_candidatura(uuid)` tem `REVOKE ALL … FROM PUBLIC, anon,
 * authenticated` e um ÚNICO `GRANT` para o papel de servidor (migration
 * `20260805000007`). O navegador não a alcança por desenho: a EF resolve o titular
 * de `auth.uid()` no servidor, e o guard do corpo da RPC confere a titularidade
 * daquela candidatura antes de escrever.
 *
 * ── POR QUE **AQUI** O `candidatura_id` VIAJA NO CORPO, E NOS IRMÃOS NÃO ─────
 * `invocarPedirExclusao` / `invocarCancelarExclusao` (45-08) não enviam
 * identificador nenhum, e o docblock de lá explica: o escopo delas é a CONTA
 * INTEIRA, então o servidor não precisa que o cliente diga sobre quem age — e um id
 * vindo do corpo seria a superfície de Tampering T-32-03.
 *
 * Aqui o escopo é **UMA candidatura entre várias do mesmo titular**, então o id é a
 * única forma de dizer QUAL. Isso NÃO reabre o T-32-03, e a razão é mecânica: o id
 * **seleciona**, não **autoriza**. Quem autoriza é o guard da RPC
 * (`v_dono IS DISTINCT FROM v_uid` → `42501`), que compara o dono da candidatura com
 * `auth.uid()` resolvido no servidor. Um id de outra pessoa é recusado no banco, não
 * na tela.
 *
 * ── SEM OTIMISMO, SEM TOAST ─────────────────────────────────────────────────
 * `onMutate` otimista está fora (Invariante 5 da 43, ainda em vigor): UI otimista
 * sobre uma escrita que encerra um processo seletivo é a categoria errada de
 * mentira. E nenhum toast — todo desfecho desta fase é persistente por definição; um
 * aviso de 4 segundos sobre a saída de um processo é a forma errada de dizer isso.
 * O desfecho aparece no próprio card, por escrito.
 *
 * ── ESTADO DO SERVIDOR (DI-45-07-01 / DI-45-10-01) ──────────────────────────
 * A EF chamava as RPCs com privilégio de servidor **sem repassar as claims do
 * titular** — `auth.uid()` NULL, `42501`, caminho morto. A **Task 1 do plano 45-12**
 * fecha isso com um terceiro client (service key + `Authorization` do titular) e a
 * migration `20260805000009` de `GRANT EXECUTE ... TO authenticated`. ⚠ As duas
 * entregas estão **no disco**; o redeploy da EF e o apply da migration são do 45-11.
 * Nenhum guard foi afrouxado para "fazer funcionar": o guard continua sendo o
 * controle, e passou a reconhecer o chamador que o desenho de fato tem.
 *
 * @module features/vagas/hooks/useRetirarCandidatura
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase/client'

import { candidaturasKeys } from './useCandidaturas'

/** Ação do vocabulário fechado da EF `executar-direito-titular`. */
const ACAO_RETIRAR = 'retirar_candidatura' as const

export class RetirarCandidaturaError extends Error {
  constructor(
    message: string,
    public readonly code: 'NETWORK' | 'FORBIDDEN' | 'NAO_RETIRAVEL' | 'SERVER_ERROR',
  ) {
    super(message)
    this.name = 'RetirarCandidaturaError'
  }
}

/**
 * O código de DOMÍNIO que a EF devolve quando a candidatura já foi decidida ou já foi
 * removida. ⚠ Ele viaja no campo `motivo`, e **nunca** no `error_code`.
 */
export const MOTIVO_NAO_RETIRAVEL = 'CANDIDATURA_NAO_RETIRAVEL'

/**
 * Traduz a recusa da EF, com fallback TOTAL — e lê os DOIS campos, cada um pelo que
 * ele de fato carrega.
 *
 * ⚠ **POR QUE O `motivo`, E NÃO SÓ O `error_code`** (terceiro defeito medido pelo
 * 45-12). O `ErrorCode` da EF é vocabulário fechado de **TRANSPORTE**, com cinco
 * valores: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION`, `NOT_FOUND`, `SERVER_ERROR`.
 * `CANDIDATURA_NAO_RETIRAVEL` não é nenhum deles — é código de **DOMÍNIO**, e domínio
 * viaja no campo de motivo por Invariante 12. Casar só contra o campo de transporte
 * fazia toda recusa legítima virar `SERVER_ERROR`: erro de servidor onde não há erro
 * de servidor nenhum.
 *
 * O fallback permanece TOTAL: motivo desconhecido resolve para `SERVER_ERROR`, e nada
 * de SQLSTATE, código HTTP ou nome de tabela alcança a tela de quem só quer sair de
 * uma vaga.
 */
function traduzirErro(motivo: unknown, codigo?: unknown): RetirarCandidaturaError {
  if (motivo === MOTIVO_NAO_RETIRAVEL) {
    return new RetirarCandidaturaError('nao_retiravel', 'NAO_RETIRAVEL')
  }
  if (codigo === 'FORBIDDEN') {
    return new RetirarCandidaturaError('forbidden', 'FORBIDDEN')
  }
  return new RetirarCandidaturaError('server_error', 'SERVER_ERROR')
}

export async function invocarRetirarCandidatura(candidaturaId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('executar-direito-titular', {
    body: { acao: ACAO_RETIRAR, candidatura_id: candidaturaId },
  })

  // O corpo de uma `Response` só pode ser consumido UMA vez — ler duas vezes leria a
  // segunda sobre um stream esgotado (idioma verbatim de `exclusaoService`).
  const contexto = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context
  if (contexto?.json) {
    try {
      const corpo = (await contexto.json()) as { error_code?: unknown; motivo?: unknown }
      // O `motivo` (domínio) é extraído ANTES do `error_code` (transporte) e tem
      // precedência: é ele que distingue "candidatura já decidida" de falha real.
      if (corpo?.error_code) throw traduzirErro(corpo.motivo, corpo.error_code)
    } catch (e) {
      if (e instanceof RetirarCandidaturaError) throw e
      /* corpo não-JSON: degrada para o caminho genérico, nunca lança o erro cru */
    }
  }

  if (error) throw new RetirarCandidaturaError('network', 'NETWORK')
  if (!data || (data as { ok?: unknown }).ok !== true) {
    throw new RetirarCandidaturaError('server_error', 'SERVER_ERROR')
  }
}

export function useRetirarCandidatura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (candidaturaId: string) => invocarRetirarCandidatura(candidaturaId),
    // Invalida a lista para que o card volte JÁ com `encerrada_a_pedido_em` do
    // servidor. É a releitura — e não um patch local — que faz a tela mostrar o
    // fato que o banco de fato gravou.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidaturasKeys.all })
    },
  })
}
