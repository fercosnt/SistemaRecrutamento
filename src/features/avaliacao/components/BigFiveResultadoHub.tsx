/**
 * BigFiveResultadoHub — Phase 52 / Plan 52-11 (JORN-56 — D-01..D-07, UI-SPEC §Aba «Avaliações»).
 *
 * No hub do RH, o Big Five deixa de dizer só «Concluído» (a D-01 revoga a D-32 da 51 no hub) e
 * mostra o perfil como o candidato o recebeu:
 *  - o aviso FIXO, sempre visível, logo abaixo do título (D-07): descreve, não classifica;
 *  - as faixas por dimensão, na ordem O C E A N, com `BANDA_LABEL` e `BandaSegments` do módulo
 *    compartilhado — o MESMO desenho da devolutiva do candidato (D-04);
 *  - o texto integral da devolutiva, RECOLHÍVEL («Ver devolutiva»/«Ocultar devolutiva», D-06),
 *    montado só depois do clique, sem abas internas (D-18).
 *
 * A fonte das faixas é a RPC `ler_devolutiva_bigfive_rh` — a devolutiva que o candidato viu —
 * e NUNCA `scores_candidato.metadata.dimensoes` (UI-SPEC, Invariante 2). Sem devolutiva, não há
 * faixa: a frase diz isso. O tipo de entrada (`BigFiveHubDimensao`) não tem número da escala, então
 * nenhum dígito chega aqui (Invariante 1, UX-07). Nada aqui ordena, filtra ou compara (RNF-07a,
 * D-02); sem `SugestaoIABadge` — o Big Five não é sugestão de decisão (D-52-U06). Accent nenhum:
 * uma faixa pintada leria como «bom».
 *
 * Leitura sob demanda e sensível (texto pessoal): `staleTime: 0`, `gcTime: 0`, `retry: false`.
 *
 * @module features/avaliacao/components/BigFiveResultadoHub
 * @see src/features/avaliacao/lib/bigFiveRotulos.tsx (rótulos e faixas, uma cópia só)
 * @see src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx (recolhível acessível)
 */
import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BANDA_LABEL,
  BandaSegments,
  DIM_LABEL,
  DIM_ORDER,
  analogia,
} from '../lib/bigFiveRotulos'
import {
  avaliacoesRhKeys,
  lerDevolutivaBigFiveRh,
  type BigFiveHubDimensao,
  type DevolutivaRh,
} from '../services/avaliacoesRhService'

/** As frases do card, exportadas para o teste conferir a constante e o render (PATTERNS §N). */
export const COPY_BIG_FIVE_HUB = {
  titulo: 'Big Five',
  naoFez: 'Big Five — Não fez',
  selo: 'Contextual · não-eliminatório',
  aviso:
    'Perfil comportamental autodeclarado: descreve, não classifica. Não é critério de aprovação nem de rejeição.',
  verDevolutiva: 'Ver devolutiva',
  ocultarDevolutiva: 'Ocultar devolutiva',
  textoRecebido: 'Texto que o candidato recebeu',
  semDevolutiva:
    'Big Five respondido. A devolutiva não está disponível, por isso as faixas não são mostradas.',
  erro: 'Não foi possível carregar a devolutiva.',
  recarregar: 'Recarregar devolutiva',
} as const

const COPY = COPY_BIG_FIVE_HUB

export interface BigFiveResultadoHubProps {
  candidaturaId: string
  /** Há linha `tipo='big_five'` na candidatura? Sem ela, o card diz «Não fez» e não lê nada. */
  temLinhaBigFive: boolean
}

/** As dimensões presentes, na ordem O C E A N, uma por letra — nunca placeholder para a ausente. */
function dimensoesEmOrdem(dimensoes: BigFiveHubDimensao[]): BigFiveHubDimensao[] {
  const porDim = new Map<string, BigFiveHubDimensao>()
  for (const d of dimensoes) if (!porDim.has(d.dim)) porDim.set(d.dim, d)
  return DIM_ORDER.flatMap((dim) => {
    const d = porDim.get(dim)
    return d ? [d] : []
  })
}

/** O texto que o candidato recebeu, empilhado (sem abas — D-18), numa ficha neutra. */
function TextoDaDevolutiva({ devolutiva }: { devolutiva: DevolutivaRh }) {
  const dims = dimensoesEmOrdem(devolutiva.dimensoes)
  return (
    <div className="space-y-4 rounded-lg border border-white/15 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white/70">{COPY.textoRecebido}</p>
      {devolutiva.disclaimer_emocional ? (
        <p className="whitespace-pre-line break-words text-base leading-relaxed text-white/80">
          {devolutiva.disclaimer_emocional}
        </p>
      ) : null}
      {dims.map((d) => (
        <div key={d.dim} className="space-y-1">
          <h3 className="text-base font-semibold text-white">
            {DIM_LABEL[d.dim]}: {BANDA_LABEL[d.banda]}
          </h3>
          <p className="text-sm text-white/70">{analogia(d.dim, d.banda)}</p>
          <p className="whitespace-pre-line break-words text-base leading-relaxed text-white/90">
            {d.texto_interpretativo}
          </p>
        </div>
      ))}
      {/* Renderizado COMO VEIO: o rodapé negado é exceção decidida (CLAUDE.md, `_NEG`). */}
      {devolutiva.disclaimer_lgpd_crp ? (
        <p className="whitespace-pre-line break-words text-sm text-white/70">
          {devolutiva.disclaimer_lgpd_crp}
        </p>
      ) : null}
    </div>
  )
}

/** As faixas + o recolhível com o texto integral. */
function FaixasEDevolutiva({ devolutiva }: { devolutiva: DevolutivaRh }) {
  const [aberto, setAberto] = useState(false)
  const regiaoId = useId()
  const dims = dimensoesEmOrdem(devolutiva.dimensoes)

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {dims.map((d) => (
          <li key={d.dim} className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-base font-semibold text-white">{DIM_LABEL[d.dim]}</span>
              <span className="text-base text-white/80">{BANDA_LABEL[d.banda]}</span>
            </div>
            <BandaSegments banda={d.banda} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={regiaoId}
        onClick={() => setAberto((v) => !v)}
        className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        {aberto ? COPY.ocultarDevolutiva : COPY.verDevolutiva}
      </button>
      <div id={regiaoId}>{aberto ? <TextoDaDevolutiva devolutiva={devolutiva} /> : null}</div>
    </div>
  )
}

/** O corpo do card enquanto há linha `big_five`: carrega, erro, sem devolutiva ou faixas. */
function CorpoBigFive({ candidaturaId }: { candidaturaId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: avaliacoesRhKeys.devolutivaBigFive(candidaturaId),
    queryFn: () => lerDevolutivaBigFiveRh(candidaturaId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  if (isLoading) {
    return <Skeleton data-testid="hub-bigfive-carregando" className="h-40 w-full bg-white/5" />
  }

  if (isError || !data) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-base text-white/80">{COPY.erro}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          {COPY.recarregar}
        </button>
      </div>
    )
  }

  if (data.situacao === 'disponivel') return <FaixasEDevolutiva devolutiva={data} />

  // `sem_devolutiva`: há resposta, não há devolutiva — e sem devolutiva não há faixa (Invariante 2).
  // `sem_big_five` (o servidor não achou a linha que a lista viu) não afirma «respondido».
  return data.situacao === 'sem_devolutiva' ? (
    <p className="text-base text-white/80">{COPY.semDevolutiva}</p>
  ) : null
}

export function BigFiveResultadoHub({ candidaturaId, temLinhaBigFive }: BigFiveResultadoHubProps) {
  return (
    <Card data-testid="hub-bigfive-resultado" className="border-white/10 bg-white/[0.03]">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-white">
            {temLinhaBigFive ? COPY.titulo : COPY.naoFez}
          </CardTitle>
          <Badge className="border-white/20 bg-white/5 text-sm font-semibold text-white/80">
            {COPY.selo}
          </Badge>
        </div>
        {temLinhaBigFive ? (
          <p className="text-sm font-semibold text-white/80">{COPY.aviso}</p>
        ) : null}
      </CardHeader>
      {temLinhaBigFive ? (
        <CardContent>
          <CorpoBigFive candidaturaId={candidaturaId} />
        </CardContent>
      ) : null}
    </Card>
  )
}
