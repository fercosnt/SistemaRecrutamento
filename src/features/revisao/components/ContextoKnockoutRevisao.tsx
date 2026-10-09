/**
 * ContextoKnockoutRevisao — no diálogo de resposta a um pedido de revisão de KNOCKOUT, o RH vê
 * o que encerrou a candidatura: a pergunta eliminatória, a resposta do candidato e a opção que
 * eliminou (51-14 · JORN-42 · D-11). Não é dado novo para o RH (ele já lê o formulário por RLS
 * de RH ativo); a RPC só evita engordar a fila.
 *
 * Leitura SOB DEMANDA, no molde de `RespostaCasoAbertoConteudo` (49-44): este componente só é
 * montado pelo diálogo quando `origem === 'automatica'`, e é ele que busca — `useQuery` com
 * `staleTime: 0, gcTime: 0, retry: false`, então o texto do candidato não fica no cache depois
 * que o diálogo fecha. O texto do candidato é renderizado como NÓ DE TEXTO React — nunca HTML
 * (T-51-56). Nada aqui trava a resposta: o contexto informa, não condiciona (RNF-07a).
 *
 * Cópia de `removida` (desvio registrado no 51-14-SUMMARY): a RPC devolve `removida` quando as
 * respostas do formulário foram apagadas pelo motor de exclusão (`anonimizar_candidato`) — e
 * esse motor roda tanto no pedido do titular quanto na purga de retenção. Dizer «a pedido do
 * titular» afirmaria ao RH um exercício de direito LGPD que pode não ter havido (o mesmo motivo
 * registrado em `RespostaCasoAbertoSjt`). A frase diz o que é certo: foi apagada na exclusão de
 * dados pessoais.
 *
 * @module features/revisao/components/ContextoKnockoutRevisao
 * @see src/features/decisao/components/RespostaCasoAbertoSjt.tsx (o molde da leitura sob demanda)
 * @see supabase/migrations/20261008000003_p51_fila_tres_origens.sql (`ler_contexto_knockout_revisao`)
 */
import { useQuery } from '@tanstack/react-query'
import { lerContextoKnockout } from '../services/revisaoService'
import { revisoesKeys } from '../hooks/useFilaRevisoes'

/** As frases da tela, exportadas para que o teste asserte a constante E o render. */
export const COPY_CONTEXTO_KNOCKOUT = {
  titulo: 'O que encerrou a candidatura',
  pergunta: 'Pergunta eliminatória',
  resposta: 'Resposta do candidato',
  opcao: 'Opção que encerrou a candidatura',
  carregando: 'Carregando o que encerrou a candidatura…',
  removida:
    'A resposta do candidato foi apagada na exclusão de dados pessoais e não está mais disponível.',
  indisponivel: 'O detalhe do que encerrou esta candidatura não está disponível.',
  erro: 'Não foi possível carregar o que encerrou a candidatura.',
  tentarNovamente: 'Tentar novamente',
} as const

const COPY = COPY_CONTEXTO_KNOCKOUT

/** Micro-rótulo no papel de label de 14px — o mesmo do bloco de contexto do diálogo. */
const EYEBROW = 'text-sm font-semibold uppercase tracking-wide text-white/50'

export interface ContextoKnockoutRevisaoProps {
  /** O id do PEDIDO (`revisao_rejeicao.id`) — a chave da RPC (C-12). */
  pedidoId: string
}

/** Um par rótulo/valor; o valor é texto do candidato ou do formulário — nó de texto. */
function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1">
      <p className={EYEBROW}>{rotulo}</p>
      <p className="whitespace-pre-line text-base text-white">{valor}</p>
    </div>
  )
}

export function ContextoKnockoutRevisao({ pedidoId }: ContextoKnockoutRevisaoProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...revisoesKeys.all, 'contexto-knockout', pedidoId] as const,
    queryFn: () => lerContextoKnockout(pedidoId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  let conteudo
  if (isLoading) {
    conteudo = (
      <p role="status" className="text-sm text-white/70">
        {COPY.carregando}
      </p>
    )
  } else if (isError || !data) {
    conteudo = (
      <p className="flex flex-wrap items-center gap-2 text-sm text-white/80">
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
  } else if (
    data.situacao === 'disponivel' &&
    data.pergunta &&
    data.resposta &&
    data.opcaoEliminatoria
  ) {
    conteudo = (
      <div className="grid gap-4">
        <Par rotulo={COPY.pergunta} valor={data.pergunta} />
        <Par rotulo={COPY.resposta} valor={data.resposta} />
        <Par rotulo={COPY.opcao} valor={data.opcaoEliminatoria} />
      </div>
    )
  } else {
    conteudo = (
      <p className="text-sm text-white/80">
        {data.situacao === 'removida' ? COPY.removida : COPY.indisponivel}
      </p>
    )
  }

  return (
    <section
      data-testid="revisao-contexto-knockout"
      aria-label={COPY.titulo}
      className="space-y-3 rounded-lg border border-white/15 bg-white/5 p-4"
    >
      <p className="text-sm font-semibold text-white">{COPY.titulo}</p>
      {conteudo}
    </section>
  )
}
