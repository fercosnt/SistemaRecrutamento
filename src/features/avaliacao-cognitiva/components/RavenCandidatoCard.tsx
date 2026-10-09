/**
 * RavenCandidatoCard — a porta de entrada do «Raciocínio lógico (Matrizes)» no painel do
 * candidato (Phase 51 / Plan 51-07 · JORN-43 · D-13 · C-4).
 *
 * Até aqui a prova de raciocínio (Raven) tinha rota (`/candidato/avaliacao-raciocinio/:id`) e
 * nenhuma tela que levasse a ela: o RH liberava, o e-mail dizia «acesse o seu painel», e o
 * painel não mostrava nada. Este card é a entrada — dentro do cartão de cada candidatura, e
 * FORA do `AvaliacaoContainer`, porque aquela lista é por etapa e o Raven não pertence a etapa
 * nenhuma (a liberação é nominal, por candidatura, em `cognitivo_liberacao`).
 *
 * QUANDO APARECE — as três condições juntas, e nenhuma outra:
 *   1. a candidatura NÃO está encerrada (`candidaturaEncerrada(etapa, status)`). Medido pela
 *      pesquisa: `2ce20fbf` está finalizada com liberação vigente; ali o convite levaria a uma
 *      prova sem candidatura viva. Encerrada ⇒ `null` SEM consultar o servidor — o componente
 *      externo decide isso antes de montar o interno, que é quem possui o hook (Rules of Hooks);
 *   2. `raven.liberado` — liberação vigente (revogar faz o card sumir);
 *   3. `!raven.registrado` — ainda não concluída (concluir faz o card sumir). A conclusão vem do
 *      servidor (chave `raven` de `get_avaliacao_status`, 51-06), porque o candidato não lê o
 *      próprio `scores_raven` (C-4) — uma leitura direta daria sempre «não concluída».
 *
 * CARREGANDO OU ERRO ⇒ NADA. É um convite, não um painel de estado: um esqueleto piscando ou
 * um «não foi possível carregar» no cartão da candidatura é pior que a ausência, e a prova
 * continua alcançável pelo e-mail de liberação. O erro vai para o console só em DEV.
 *
 * O botão encapsula o `stopPropagation` (padrão do `RetirarCandidaturaAcao`): o `GlassCard` do
 * painel navega para a vaga ao clique, e sem isso o toque abriria a prova E a vaga.
 *
 * RNF-07a: só dois booleanos chegam aqui; nenhum número do instrumento é lido nem exibido.
 *
 * @module features/avaliacao-cognitiva/components/RavenCandidatoCard
 * @see src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts (o hook possuído)
 * @see src/components/pages/DashboardCandidatoPage.tsx (onde é montado)
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Grid3x3 } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass'
import { candidaturaEncerrada } from '@/lib/candidatura/candidaturaEncerrada'
import { useStatusRavenCandidato } from '../hooks/useStatusRavenCandidato'

export interface RavenCandidatoCardProps {
  candidaturaId: string
  etapaAtual: string
  status: string
}

/** O nome do instrumento para o candidato (D-15). */
const TITULO = 'Raciocínio lógico (Matrizes)'

export function RavenCandidatoCard({ candidaturaId, etapaAtual, status }: RavenCandidatoCardProps) {
  // Encerrada ⇒ nada, e nenhuma consulta: o interno (dono do hook) nem é montado.
  if (candidaturaEncerrada(etapaAtual, status)) return null
  return <RavenCandidatoCardConteudo candidaturaId={candidaturaId} />
}

function RavenCandidatoCardConteudo({ candidaturaId }: { candidaturaId: string }) {
  const navigate = useNavigate()
  const { data: raven, error } = useStatusRavenCandidato(candidaturaId)

  useEffect(() => {
    if (error && import.meta.env.DEV) {
      console.warn('[RavenCandidatoCard] status do Raven indisponível:', error.message)
    }
  }, [error])

  // Carregando, erro, não liberado/revogado ou já concluído ⇒ nenhum convite.
  if (!raven || !raven.liberado || raven.registrado) return null

  return (
    <GlassCard
      variant="white"
      blur="sm"
      data-testid="raven-candidato-card"
      className="mt-4 p-4 text-white"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Grid3x3 className="mt-0.5 h-5 w-5 shrink-0 text-[#35BFAD]" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-white drop-shadow-sm">{TITULO}</p>
            <p className="text-sm text-white/80">
              A equipe liberou esta avaliação para a sua candidatura.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/candidato/avaliacao-raciocinio/${candidaturaId}`)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#35BFAD] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#35BFAD]/90 active:scale-95"
        >
          Fazer a avaliação
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </GlassCard>
  )
}
