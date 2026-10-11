/**
 * ContextoRejeicaoTriagemRevisao — no diálogo de resposta a um pedido de revisão de uma
 * REJEIÇÃO PELO RH (`origem = 'humana_triagem'`), quem responde vê por que a candidatura foi
 * encerrada: o motivo e a justificativa registrados por quem rejeitou (52-13 · JORN-62 · D-38;
 * o último achado do 51-17).
 *
 * São DOIS PARES A MAIS no bloco de contexto do diálogo (52-UI-SPEC: `sm:col-span-2`), não um
 * bloco próprio: o componente é montado DENTRO da grade do diálogo e o invólucro é `contents`,
 * então cada par ocupa a linha inteira da grade existente.
 *
 * · Motivo: o rótulo vem do MESMO `MOTIVO_OPTIONS` do diálogo de rejeição — um mapa só, para o
 *   mesmo motivo nunca ter dois nomes. Código fora do mapa aparece cru (nada inventado).
 * · Justificativa: o texto de quem rejeitou, `whitespace-pre-wrap`, NUNCA truncado — truncar
 *   esvaziaria a revisão. Renderizado como NÓ DE TEXTO React, nunca HTML (T-52-37).
 * · Ausente (campo nulo, ou qualquer forma que não seja `disponivel`) → «Não registrado».
 *
 * Leitura SOB DEMANDA, no molde de `ContextoKnockoutRevisao`: `useQuery` com `staleTime: 0,
 * gcTime: 0, retry: false`, então a justificativa não fica no cache depois que o diálogo fecha
 * (T-52-36). Erro → frase + «Tentar novamente». Nada aqui trava a resposta: o contexto informa,
 * não condiciona (RNF-07a).
 *
 * @module features/revisao/components/ContextoRejeicaoTriagemRevisao
 * @see src/features/revisao/components/ContextoKnockoutRevisao.tsx (o molde)
 * @see supabase/migrations/20261011000001_p52_leituras_rh.sql (`ler_contexto_rejeicao_triagem_revisao`)
 */
import { useQuery } from '@tanstack/react-query'
import { MOTIVO_OPTIONS } from '@/features/triagem/components/RejeitarCandidaturaDialog'
import { lerContextoRejeicaoTriagem } from '../services/revisaoService'
import { revisoesKeys } from '../hooks/useFilaRevisoes'

/** As frases da tela, exportadas para que o teste asserte a constante E o render. */
export const COPY_CONTEXTO_TRIAGEM = {
  motivo: 'Motivo da rejeição',
  justificativa: 'Justificativa registrada',
  ausente: 'Não registrado',
  carregando: 'Carregando o motivo da rejeição…',
  erro: 'Não foi possível carregar o motivo da rejeição.',
  tentarNovamente: 'Tentar novamente',
} as const

const COPY = COPY_CONTEXTO_TRIAGEM

/**
 * Rótulo de campo no papel de label de 14px/600, como os pares vizinhos do bloco de contexto,
 * em `/70` — a 52-UI-SPEC §Color não admite `/50` autorado nesta fase.
 */
const ROTULO = 'text-sm font-semibold uppercase tracking-wide text-white/70'

/** Ocupa a linha inteira da grade `sm:grid-cols-2` do diálogo. */
const LINHA = 'sm:col-span-2'

export interface ContextoRejeicaoTriagemRevisaoProps {
  /** O id do PEDIDO (`revisao_rejeicao.id`) — a chave da RPC (C-12). */
  pedidoId: string
}

/** O rótulo pt-BR do motivo pelo mapa do diálogo de rejeição; desconhecido → o código. */
function rotularMotivoRejeicao(motivo: string): string {
  return MOTIVO_OPTIONS.find((o) => o.value === motivo)?.label ?? motivo
}

export function ContextoRejeicaoTriagemRevisao({ pedidoId }: ContextoRejeicaoTriagemRevisaoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...revisoesKeys.all, 'contexto-triagem', pedidoId] as const,
    queryFn: () => lerContextoRejeicaoTriagem(pedidoId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  let conteudo
  if (isLoading) {
    conteudo = (
      <p role="status" className={`${LINHA} text-sm text-white/70`}>
        {COPY.carregando}
      </p>
    )
  } else if (isError || !data) {
    conteudo = (
      <p className={`${LINHA} flex flex-wrap items-center gap-2 text-sm text-white/80`}>
        <span>{COPY.erro}</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-2 hover:text-white"
        >
          {COPY.tentarNovamente}
        </button>
      </p>
    )
  } else {
    // Toda forma que não for `disponivel` já chega do serviço com os dois campos nulos.
    const disponivel = data.situacao === 'disponivel'
    const motivo = disponivel && data.motivo ? rotularMotivoRejeicao(data.motivo) : null
    const justificativa = disponivel ? data.justificativa : null
    conteudo = (
      <>
        <div className={`${LINHA} space-y-1`}>
          <p className={ROTULO}>{COPY.motivo}</p>
          <p className="text-base text-white">{motivo ?? COPY.ausente}</p>
        </div>
        <div className={`${LINHA} space-y-1`}>
          <p className={ROTULO}>{COPY.justificativa}</p>
          {/* Nunca truncada: é a razão da rejeição nas palavras de quem rejeitou. */}
          <p className="text-base whitespace-pre-wrap text-white/90">
            {justificativa ?? COPY.ausente}
          </p>
        </div>
      </>
    )
  }

  return (
    <div data-testid="revisao-contexto-triagem" className="contents">
      {conteudo}
    </div>
  )
}
