/**
 * SjtMcDetalhe — Phase 52 / Plan 52-11 (JORN-57 — D-21, D-37, UI-SPEC §Aba «Avaliações», E6).
 *
 * Substitui, no hub do RH, o antigo `McBreakdown` do `ScorecardAvaliacao`, que listava
 * «Item N · <código cru da etiqueta> · peso» — o RH via `fortemente_pontua` e não via a pergunta.
 * Agora, por situação: o cenário, TODAS as alternativas e a escolhida destacada.
 *
 *  - Ordem das alternativas: a do SERVIDOR, neutra e estável (D-37 — a `ordem` do banco é o
 *    gabarito, `ordem 1 = fortemente_pontua`). O cliente não reordena; a legenda diz que o
 *    candidato as viu embaralhadas.
 *  - Etiqueta (em pt-BR, `ROTULO_TAG_SJT`) e peso SÓ na escolhida (D-21). O tipo das alternativas
 *    não tem etiqueta nem peso, então não há gabarito para vazar (T-52-32).
 *  - A escolhida tem borda, `Check` e a palavra «Escolhida» — NUNCA o accent: turquesa leria como
 *    «certo» (UI-SPEC §Color). As demais são neutras.
 *  - Mantém do `McBreakdown` o cabeçalho, a pontuação (ou «Pontuação indisponível») e o marcador de
 *    revisão humana; com a pontuação falhada, as situações aparecem mesmo assim — a resposta existe.
 *    Nada aqui é sugestão de IA (o MC é determinístico): sem `SugestaoIABadge`.
 *
 * Leitura sob demanda (`ler_sjt_mc_rh`): `staleTime: 0`, `gcTime: 0`, `retry: false`.
 *
 * @module features/avaliacao/components/SjtMcDetalhe
 * @see supabase/migrations/20261011000001_p52_leituras_rh.sql (`ler_sjt_mc_rh`)
 */
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { McMetadata, ScoreRow } from '../services/scoresRhService'
import {
  avaliacoesRhKeys,
  lerSjtMcRh,
  type SjtMcItemRh,
} from '../services/avaliacoesRhService'

/** As frases do card, exportadas para o teste conferir a constante e o render (PATTERNS §N). */
export const COPY_SJT_MC_HUB = {
  titulo: 'Múltipla escolha',
  pontuacao: 'Pontuação:',
  pontuacaoIndisponivel: 'Pontuação indisponível',
  legenda: 'Alternativas em ordem neutra — o candidato as viu embaralhadas.',
  situacao: (n: number) => `Situação ${n}`,
  escolhida: 'Escolhida',
  peso: (p: number) => `peso ${p}`,
  sumida: 'A alternativa escolhida não está mais no banco de itens.',
  erro: 'Não foi possível carregar as situações.',
  recarregar: 'Recarregar situações',
} as const

const COPY = COPY_SJT_MC_HUB

/** Etiqueta da alternativa escolhida, em pt-BR (UI-SPEC). Desconhecida → o próprio código. */
export const ROTULO_TAG_SJT: Record<string, string> = {
  fortemente_pontua: 'Pontua forte',
  pontua: 'Pontua',
  neutro: 'Neutro',
  atencao: 'Atenção',
  knockout: 'Eliminatória',
}

function rotuloDaEtiqueta(tag: string): string {
  return Object.prototype.hasOwnProperty.call(ROTULO_TAG_SJT, tag) ? ROTULO_TAG_SJT[tag] : tag
}

export interface SjtMcDetalheProps {
  /** A linha `scores_candidato` `tipo='sjt'`, `subtipo='mc'`. */
  row: ScoreRow
  candidaturaId: string
  /** O marcador neutro de revisão humana, quando a linha está `pendente_humano`. */
  marcadorRevisao?: ReactNode
}

/** Pontuação neutra «x / max» — nunca tingida de vermelho/verde. */
function ScoreValue({ score, scoreMax }: { score: number | null; scoreMax: number | null }) {
  if (score == null) {
    return <span className="text-white/70">—</span>
  }
  return (
    <span className="font-semibold text-white">
      {score}
      {scoreMax != null ? <span className="text-white/70"> / {scoreMax}</span> : null}
    </span>
  )
}

/** Etiqueta pt-BR + peso da escolhida (o único lugar onde aparecem). */
function EtiquetaEPeso({ item }: { item: SjtMcItemRh }) {
  return (
    <>
      {item.escolhida_tag ? (
        <Badge
          data-testid="sjt-mc-etiqueta"
          className="border-white/20 bg-white/5 text-sm font-semibold text-white/80"
        >
          {rotuloDaEtiqueta(item.escolhida_tag)}
        </Badge>
      ) : null}
      {item.escolhida_peso != null ? (
        <span className="text-sm text-white/70">{COPY.peso(item.escolhida_peso)}</span>
      ) : null}
    </>
  )
}

function Situacao({ item, n }: { item: SjtMcItemRh; n: number }) {
  return (
    <li className="space-y-3">
      <h3 className="text-base font-semibold text-white">{COPY.situacao(n)}</h3>
      {item.cenario ? (
        <p className="whitespace-pre-line break-words text-base leading-relaxed text-white/90">
          {item.cenario}
        </p>
      ) : null}
      <ul className="space-y-2">
        {item.alternativas.map((a) =>
          a.escolhida ? (
            <li
              key={a.opcao_id}
              data-testid="sjt-mc-alternativa"
              className="rounded-lg border border-white/40 bg-white/15 p-3 text-white"
            >
              <p data-texto="" className="break-words text-base leading-relaxed">
                {a.texto}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-semibold">{COPY.escolhida}</span>
                <EtiquetaEPeso item={item} />
              </div>
            </li>
          ) : (
            <li
              key={a.opcao_id}
              data-testid="sjt-mc-alternativa"
              className="rounded-lg border border-white/10 bg-transparent p-3 text-white/80"
            >
              <p data-texto="" className="break-words text-base leading-relaxed">
                {a.texto}
              </p>
            </li>
          ),
        )}
      </ul>
      {!item.escolhida_no_banco ? (
        <p className="flex flex-wrap items-center gap-2 text-base text-white/80">
          <span>{COPY.sumida}</span>
          <EtiquetaEPeso item={item} />
        </p>
      ) : null}
    </li>
  )
}

export function SjtMcDetalhe({ row, candidaturaId, marcadorRevisao }: SjtMcDetalheProps) {
  const falhou = row.status === 'falhou'
  const respostas = ((row.metadata ?? {}) as McMetadata).respostas ?? []
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: avaliacoesRhKeys.sjtMc(candidaturaId),
    queryFn: () => lerSjtMcRh(candidaturaId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })

  let corpo: ReactNode = null
  if (isLoading) {
    corpo = (
      <div className="space-y-3">
        {Array.from({ length: Math.max(1, respostas.length) }, (_, i) => (
          <Skeleton key={i} data-testid="sjt-mc-carregando" className="h-24 w-full bg-white/5" />
        ))}
      </div>
    )
  } else if (isError || !data) {
    corpo = (
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
  } else if (data.itens.length > 0) {
    corpo = (
      <div className="space-y-4">
        <p className="text-sm text-white/70">{COPY.legenda}</p>
        <ol className="space-y-6">
          {data.itens.map((item, i) => (
            <Situacao key={`${item.pergunta_id ?? 'item'}-${i}`} item={item} n={i + 1} />
          ))}
        </ol>
      </div>
    )
  }

  return (
    <Card data-testid="sjt-mc-detalhe" className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-white">{COPY.titulo}</CardTitle>
          {/* MC é determinístico (Σ peso) — sem IA, sem `SugestaoIABadge`. */}
          {marcadorRevisao ? <div className="flex items-center gap-2">{marcadorRevisao}</div> : null}
        </div>
        <CardDescription className="text-sm text-white/70">
          {falhou ? (
            COPY.pontuacaoIndisponivel
          ) : (
            <>
              {COPY.pontuacao} <ScoreValue score={row.score} scoreMax={row.score_max} />
            </>
          )}
        </CardDescription>
      </CardHeader>
      {corpo ? <CardContent>{corpo}</CardContent> : null}
    </Card>
  )
}
