/**
 * RespostaCasoAbertoSjt — 49-44 / WR-07: dentro do aviso do sinal da etapa SJT
 * (`decisao-sjt-sinal-revisao`), o RH lê o texto que o candidato gravou na resposta do caso
 * aberto. O aviso manda «revise o texto»; até aqui o RH não tinha onde ler.
 *
 * Leitura SOB DEMANDA: o nível de cima só tem `useState` (sem `useQuery`), e a busca só monta
 * depois do clique. O texto não fica no cache do cliente depois de oculto (`gcTime: 0`).
 * O texto do candidato é renderizado como NÓ DE TEXTO React — nunca como HTML.
 * Nada aqui é desabilitado, nem durante o carregamento: o sinal pede leitura, não trava ação
 * (RNF-07a).
 *
 * Cópia: nenhuma frase nomeia mecanismo de IA nem causa. `removida` é NEUTRO de propósito: o
 * marcador `redigido` prova que o motor de exclusão redigiu o texto, não quem pediu — o motor
 * grava o mesmo marcador no direito do titular e na purga de retenção, e dizer «a pedido do
 * titular» afirmaria ao RH um exercício de direito LGPD que pode não ter havido. Nenhuma frase
 * diz que o texto mostrado é o que foi avaliado — o mecanismo não garante isso (R1–R3 no
 * cabeçalho da migration 20261003000001).
 *
 * @module features/decisao/components/RespostaCasoAbertoSjt
 * @see supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql
 */
import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRespostaCasoAbertoSjt } from '@/features/avaliacao/services/scoresRhService'
import { decisaoKeys } from '../hooks/useConsolidacao'

/** As frases da tela, exportadas para que o teste asserte a constante E o render (PATTERNS §N). */
export const COPY_RESPOSTA_CASO_ABERTO = {
  botaoAbrir: 'Ler a resposta do caso aberto',
  botaoOcultar: 'Ocultar a resposta',
  titulo: 'Resposta do candidato ao caso aberto',
  carregando: 'Carregando a resposta…',
  removida: 'O texto desta resposta não está mais disponível.',
  indisponivel: 'O texto desta resposta não está disponível.',
  semRespostaEnviada: 'Não há resposta enviada ao caso aberto.',
  erro: 'Não foi possível carregar a resposta.',
  tentarDeNovo: 'Tentar de novo',
} as const

const COPY = COPY_RESPOSTA_CASO_ABERTO

export interface RespostaCasoAbertoSjtProps {
  candidaturaId: string
}

/** O conteúdo aberto: só existe depois do clique, e é ele que busca. */
function RespostaCasoAbertoConteudo({ candidaturaId }: { candidaturaId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...decisaoKeys.all, 'resposta-caso-aberto', candidaturaId] as const,
    queryFn: () => getRespostaCasoAbertoSjt(candidaturaId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  if (isLoading) {
    return (
      <p role="status" className="text-xs">
        {COPY.carregando}
      </p>
    )
  }

  if (isError || !data) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-xs">
        <span>{COPY.erro}</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-semibold underline underline-offset-2 hover:text-white"
        >
          {COPY.tentarDeNovo}
        </button>
      </p>
    )
  }

  if (data.situacao === 'disponivel' && data.texto) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold">{COPY.titulo}</p>
        <p className="whitespace-pre-line rounded-md bg-black/30 px-3 py-2 text-xs leading-relaxed text-amber-100">
          {data.texto}
        </p>
      </div>
    )
  }

  const frase =
    data.situacao === 'removida'
      ? COPY.removida
      : data.situacao === 'sem_resposta_enviada'
        ? COPY.semRespostaEnviada
        : COPY.indisponivel
  return <p className="text-xs">{frase}</p>
}

export function RespostaCasoAbertoSjt({ candidaturaId }: RespostaCasoAbertoSjtProps) {
  const [aberto, setAberto] = useState(false)
  const regiaoId = useId()

  return (
    <div data-testid="decisao-sjt-resposta-caso-aberto" className="space-y-2 pt-1 text-amber-100">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={regiaoId}
        onClick={() => setAberto((v) => !v)}
        className="text-xs font-semibold underline underline-offset-2 hover:text-white"
      >
        {aberto ? COPY.botaoOcultar : COPY.botaoAbrir}
      </button>
      <div id={regiaoId}>
        {aberto ? <RespostaCasoAbertoConteudo candidaturaId={candidaturaId} /> : null}
      </div>
    </div>
  )
}
