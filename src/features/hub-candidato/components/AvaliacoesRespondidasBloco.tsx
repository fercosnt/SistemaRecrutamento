/**
 * AvaliacoesRespondidasBloco — 51-02 / JORN-45 (D-17, D-18): o caminho de um clique, no hub do
 * RH, até as avaliações que o candidato respondeu.
 *
 * Antes, a seção «Avaliação Assíncrona» dizia «N registro(s) … disponíveis para revisão» e não
 * havia onde revisar: o `ScorecardAvaliacao` não estava montado em tela nenhuma. Agora este bloco
 * diz quantas avaliações foram respondidas e abre o detalhe ALI MESMO.
 *
 * - Fica FORA do `HubSection`, como irmão logo depois dele (precedente: o botão IN-04 da Redação),
 *   porque o `HubSection` só renderiza filhos em `com_dados` e o D-17 quer o caminho em QUALQUER
 *   etapa.
 * - O número e o detalhe têm UMA fonte: `linhasDeAvaliacao` (C-8). Uma linha de entrevista ou de
 *   redação não entra no N nem vira card.
 * - O detalhe só monta depois do clique (o nível de cima só tem `useState`), no molde de
 *   `RespostaCasoAbertoSjt`. A leitura das linhas é a mesma query do hub (`useScorecardCandidato`,
 *   mesma chave), sem pedido novo.
 *
 * @module features/hub-candidato/components/AvaliacoesRespondidasBloco
 * @see src/features/avaliacao/components/ScorecardAvaliacao.tsx (`linhasDeAvaliacao`, o detalhe)
 * @see src/features/decisao/components/RespostaCasoAbertoSjt.tsx (expandir no lugar, aria)
 */
import { useId, useState } from 'react'
import { Glass } from '@/components/ui/glass'
import { useScorecardCandidato } from '@/features/avaliacao/hooks/useScorecardCandidato'
import {
  ScorecardAvaliacao,
  linhasDeAvaliacao,
} from '@/features/avaliacao/components/ScorecardAvaliacao'

/** As frases do bloco, exportadas para o teste conferir a constante e o render (PATTERNS §N). */
export const COPY_AVALIACOES_RESPONDIDAS = {
  contagem: (n: number) =>
    n === 1 ? '1 avaliação respondida' : `${n} avaliações respondidas`,
  nenhuma: 'Nenhuma avaliação respondida ainda.',
  botaoAbrir: 'Ver respostas',
  botaoOcultar: 'Ocultar respostas',
} as const

const COPY = COPY_AVALIACOES_RESPONDIDAS

export interface AvaliacoesRespondidasBlocoProps {
  candidaturaId: string
}

export function AvaliacoesRespondidasBloco({ candidaturaId }: AvaliacoesRespondidasBlocoProps) {
  const [aberto, setAberto] = useState(false)
  const regiaoId = useId()
  const { data, isLoading, isError } = useScorecardCandidato(candidaturaId)
  const n = linhasDeAvaliacao(data ?? []).length

  return (
    <Glass variant="dark" blur="lg" className="rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Carregando ou com erro, o número não é afirmado — a seção acima já diz o estado. */}
        {isLoading || isError ? (
          <span />
        ) : (
          <p className="text-base text-white/80">
            {n > 0 ? COPY.contagem(n) : COPY.nenhuma}
          </p>
        )}
        <button
          type="button"
          data-testid="hub-ver-respostas"
          aria-expanded={aberto}
          aria-controls={regiaoId}
          onClick={() => setAberto((v) => !v)}
          className="inline-flex min-h-[44px] items-center rounded-xl bg-[#35BFAD] px-6 text-base font-semibold text-white shadow-lg shadow-[#35BFAD]/30 transition-colors hover:bg-[#35BFAD]/90"
        >
          {aberto ? COPY.botaoOcultar : COPY.botaoAbrir}
        </button>
      </div>
      <div id={regiaoId}>
        {aberto ? <ScorecardAvaliacao candidaturaId={candidaturaId} className="mt-4" /> : null}
      </div>
    </Glass>
  )
}
