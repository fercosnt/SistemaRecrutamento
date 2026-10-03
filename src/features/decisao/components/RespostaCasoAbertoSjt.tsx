/**
 * RespostaCasoAbertoSjt — 49-44 / WR-07: dentro do aviso do sinal da etapa SJT
 * (`decisao-sjt-sinal-revisao`), o RH lê o texto que o candidato gravou na resposta do caso
 * aberto. O aviso manda «revise o texto»; até aqui o RH não tinha onde ler.
 *
 * Leitura SOB DEMANDA: o nível de cima só tem `useState` (sem `useQuery`), e a busca só monta
 * depois do clique. O texto não fica no cache do cliente depois de oculto (`gcTime: 0`).
 * O texto do candidato é renderizado como NÓ DE TEXTO React — nunca como HTML.
 * Nada aqui é desabilitado: o sinal pede leitura, não trava ação (RNF-07a).
 *
 * @module features/decisao/components/RespostaCasoAbertoSjt
 * @see supabase/migrations/20261003000001_p49_44_resposta_caso_aberto_rh.sql
 */
import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRespostaCasoAbertoSjt } from '@/features/avaliacao/services/scoresRhService'
import { decisaoKeys } from '../hooks/useConsolidacao'

export interface RespostaCasoAbertoSjtProps {
  candidaturaId: string
}

/** O conteúdo aberto: só existe depois do clique, e é ele que busca. */
function RespostaCasoAbertoConteudo({ candidaturaId, regiaoId }: { candidaturaId: string; regiaoId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...decisaoKeys.all, 'resposta-caso-aberto', candidaturaId] as const,
    queryFn: () => getRespostaCasoAbertoSjt(candidaturaId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  return (
    <div id={regiaoId} className="space-y-1">
      {isLoading ? (
        <p role="status" className="text-xs">
          Carregando a resposta…
        </p>
      ) : isError || !data ? (
        <p className="text-xs">Não foi possível carregar a resposta.</p>
      ) : data.situacao === 'disponivel' && data.texto ? (
        <p className="whitespace-pre-line rounded-md bg-black/30 px-3 py-2 text-xs leading-relaxed text-amber-100">
          {data.texto}
        </p>
      ) : (
        <p className="text-xs">O texto desta resposta não está disponível.</p>
      )}
    </div>
  )
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
        {aberto ? 'Ocultar a resposta' : 'Ler a resposta do caso aberto'}
      </button>
      {aberto ? <RespostaCasoAbertoConteudo candidaturaId={candidaturaId} regiaoId={regiaoId} /> : null}
    </div>
  )
}
