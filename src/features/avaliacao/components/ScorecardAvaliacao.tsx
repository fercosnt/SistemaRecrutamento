/**
 * ScorecardAvaliacao — the RH-facing read-only SJT scorecard (AVAL-02/03).
 *
 * Desktop RH shell (NOT the candidate glass shell — inherits the Phase-10 panel
 * contract). Renders the deterministic MC situations (`SjtMcDetalhe`, 52-11) + the open-case BARS
 * dimensions (1-5 → composite 0-25) + citations/red_flags from `metadata`, in a
 * NEUTRAL/structured presentation (no red/green pass-fail tints). Every AI-derived
 * block carries the reused `SugestaoIABadge` (RNF-07a — full on the panel header,
 * compact inline on each AI dimension). When a row is `pendente_humano` it surfaces
 * a neutral "Requer revisão humana" marker — the system never auto-rejects and
 * never changes etapa by score. The candidate never reaches this surface (RLS +
 * allowlist deny in `scoresRhService`).
 *
 * MONTADO desde 51-02 / JORN-45 (D-17..D-20, C-7): o hub do RH o abre no lugar, pelo
 * «Ver respostas» de `features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx` — a
 * PRIMEIRA e única montagem. Até então (49-REVIEW-GAPS-3 CR-02, 2026-09-30) nenhuma rota o
 * renderizava e o build o descartava. O que ele mostra a partir daqui:
 *  - só as linhas `sjt` + `big_five` (`linhasDeAvaliacao`, C-8) — a mesma função conta o «N» do hub;
 *  - Big Five (52-11 / JORN-56, D-01: a D-32 da 51 está REVOGADA no hub): com linha `big_five`,
 *    `BigFiveResultadoHub` — as faixas que o candidato viu na devolutiva, o aviso fixo e o texto
 *    recolhível, sem número da escala e sem o resumo da IA; sem linha, «Big Five — Não fez». O card
 *    da LISTA do RH segue «Concluído / Não fez» (D-05);
 *  - no caso aberto, o TEXTO INTEGRAL do candidato ao lado das citações recortadas pela IA (D-20),
 *    lido pela RPC `ler_resposta_caso_aberto_sjt` via `RespostaCasoAbertoConteudo` — nó de texto
 *    React, nunca HTML. Nenhuma leitura nova de banco (D-38/C-6).
 * A Decisão Final (`ConsolidacaoDashboard`) segue com o texto sem as citações (C-7): o D-20 proíbe
 * recorte sem original, e ali há original sem recorte.
 *
 * @module features/avaliacao/components/ScorecardAvaliacao
 * @see src/features/triagem/components/SugestaoIABadge.tsx (reused verbatim — not re-authored)
 * @see .planning/phases/11-avalia-o-ass-ncrona-infra-work-sample-sjt-etapa-3/11-UI-SPEC.md (§RH Scorecard View)
 */
import { CircleDashed } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/components/ui/utils'
import { SugestaoIABadge } from '@/features/triagem/components/SugestaoIABadge'
import { RespostaCasoAbertoConteudo } from '@/features/decisao/components/RespostaCasoAbertoSjt'
import { estadoBigFive, type EstadoBigFive } from '@/features/vagas/types/vagasTypes'
import { useScorecardCandidato } from '../hooks/useScorecardCandidato'
import { BigFiveResultadoHub, COPY_BIG_FIVE_HUB } from './BigFiveResultadoHub'
import { SjtMcDetalhe } from './SjtMcDetalhe'
import {
  isBigFiveRow,
  type ScoreRow,
  type CasoAbertoMetadata,
} from '../services/scoresRhService'
// Phase 49 / plano 49-41 — JORN-41, decisão (a). O vocabulário do sinal tem UMA fonte, a mesma
// que a Edge Function escreve; contrato de ZERO IMPORTS, por isso o caminho relativo
// (precedente: `ProvenienciaIABadge` ← `_shared/ai-error-codes`).
import {
  SINAL_INSTRUCAO_AO_MODELO,
  rotuloDoSinal,
  sinaisDe,
} from '../../../../supabase/functions/_shared/sinal-revisao'

export interface ScorecardAvaliacaoProps {
  candidaturaId: string
  className?: string
}

/** Neutral copy for the human-review marker (RNF-07a — never auto-rejects). */
const REQUER_REVISAO_COPY = 'Requer revisão humana'

/** Neutral marker shown when a score row is `pendente_humano`. */
function RevisaoHumanaMarker() {
  return (
    <Badge className="gap-1 border-white/20 bg-white/5 text-white/80 text-sm font-semibold [&>svg]:size-4">
      <CircleDashed className="h-4 w-4" aria-hidden="true" />
      {REQUER_REVISAO_COPY}
    </Badge>
  )
}

/** Rótulo da coluna do texto integral (D-20). Não diz que é o texto avaliado — o mecanismo não
 *  garante isso (R1–R4 da migration 20261003000001). */
export const ROTULO_TEXTO_DO_CANDIDATO = 'Texto do candidato'

/**
 * Open-case BARS card (subtipo='caso_aberto'): dimensions + composite + citations/red_flags.
 *
 * D-20 (51-02): as citações recortadas pela IA nunca aparecem sem o original. D-22 (52-12): as
 * citações ficam marcadas DENTRO do texto onde aparecem literalmente; as não localizadas ficam ao
 * lado (`TextoComCitacoes`). O texto aparece mesmo quando a pontuação falhou: é o conteúdo do
 * candidato, não da IA.
 */
function CasoAbertoBreakdown({ row, candidaturaId }: { row: ScoreRow; candidaturaId: string }) {
  const meta = (row.metadata ?? {}) as CasoAbertoMetadata
  const dimensions = meta.dimension_scores ?? []
  const composite = meta.composite_0_25 ?? row.score
  const pendente = row.status === 'pendente_humano'
  const falhou = row.status === 'falhou'
  // 49-41: o motivo «instrução à IA» (49-39). Só ESTE motivo é mostrado aqui — os outros de
  // `motivos_revisao` têm UX própria, fora deste plano. Tom neutro: o sinal pede leitura do
  // texto, não reprova nada, não trava ação e não mexe no composto (RNF-07a).
  const sinalInstrucao = sinaisDe(meta.motivos_revisao).includes(SINAL_INSTRUCAO_AO_MODELO)
  const citacoes = Array.isArray(row.citacoes) ? (row.citacoes as unknown[]) : []
  // Como texto (não-string vira JSON, o idioma de sempre); vazias quando a pontuação falhou.
  const citacoesTexto = falhou
    ? []
    : citacoes.map((c) => (typeof c === 'string' ? c : JSON.stringify(c)))
  const redFlags = Array.isArray(row.red_flags) ? (row.red_flags as unknown[]) : []

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-white">Caso aberto (BARS)</CardTitle>
          <div className="flex items-center gap-2">
            <SugestaoIABadge variant="full" />
            {pendente ? <RevisaoHumanaMarker /> : null}
          </div>
        </div>
        {sinalInstrucao ? (
          <p
            data-testid="sjt-sinal-revisao"
            className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/80"
          >
            {rotuloDoSinal(SINAL_INSTRUCAO_AO_MODELO)}
          </p>
        ) : null}
        <CardDescription className="text-white/70">
          {falhou ? (
            'Pontuação indisponível'
          ) : (
            <>
              Composto:{' '}
              <span className="font-semibold text-white">
                {composite ?? '—'}
                <span className="text-white/50"> / 25</span>
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!falhou && dimensions.length > 0 ? (
          <ul className="space-y-3">
            {dimensions.map((dim, i) => (
              <li key={`${dim.dimension}-${i}`} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-white/90">{dim.dimension}</span>
                  <span className="flex items-center gap-2">
                    <SugestaoIABadge variant="compact" />
                    <span className="font-semibold text-white">
                      {dim.score_1_5}
                      <span className="text-white/50"> / 5</span>
                    </span>
                    {dim.level ? (
                      <Badge className="border-white/15 bg-white/5 text-white/70 text-xs">
                        {dim.level}
                      </Badge>
                    ) : null}
                  </span>
                </div>
                {dim.reasoning ? (
                  <p className="text-sm text-white/60">{dim.reasoning}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {/* D-22 (52-12): o texto do candidato com as citações da IA marcadas onde aparecem; as não
            localizadas — ou todas, sem o texto — ficam ao lado, numa grade que é do
            `TextoComCitacoes`. Tudo como nó de texto React. */}
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
            {ROTULO_TEXTO_DO_CANDIDATO}
          </p>
          <RespostaCasoAbertoConteudo
            candidaturaId={candidaturaId}
            variante="hub"
            citacoes={citacoesTexto}
          />
        </div>

        {!falhou && redFlags.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Red flags
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-white/70">
              {redFlags.map((f, i) => (
                <li key={i}>{typeof f === 'string' ? f : JSON.stringify(f)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

/**
 * D-19: os dois estados do Big Five pela regra de `estadoBigFive`. No hub, desde o 52-11 (D-01),
 * só o «Não fez» é título de card aqui — com linha `big_five` o card é o `BigFiveResultadoHub`.
 * O «Não fez» tem UMA fonte, a do card do hub.
 */
export const COPY_BIG_FIVE_ESTADO: Record<EstadoBigFive, string> = {
  concluido: 'Big Five — Concluído',
  nao_fez: COPY_BIG_FIVE_HUB.naoFez,
}

/**
 * Big Five no detalhe do hub quando NÃO há linha `tipo='big_five'`: «Big Five — Não fez» e o selo,
 * nada mais (UI-SPEC §Aba «Avaliações»). Com linha, quem desenha é o `BigFiveResultadoHub`
 * (52-11 / D-01 — a D-32 da 51, que reduzia o hub a «Concluído», está revogada no hub).
 */
function BigFiveEstado({ estado }: { estado: EstadoBigFive }) {
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle data-testid="scorecard-bigfive-estado" className="text-white">
            {COPY_BIG_FIVE_ESTADO[estado]}
          </CardTitle>
          <Badge className="border-white/20 bg-white/5 text-white/80 text-sm font-semibold">
            Contextual · não-eliminatório
          </Badge>
        </div>
      </CardHeader>
    </Card>
  )
}

/**
 * 51-02 / JORN-45 (C-8) — as linhas que são AVALIAÇÃO RESPONDIDA: `tipo IN ('sjt','big_five')`.
 *
 * `getScores` lê TODOS os tipos de `scores_candidato` da candidatura, e em PROD há também
 * `entrevista` e `redacao`. Sem este filtro, o despacho abaixo mandava essas linhas para
 * `CasoAbertoBreakdown` (viravam card de «caso aberto»), e o «N» do hub as contava. Uma fonte
 * só: o hub conta com ESTA função e o detalhe mostra o que ELA devolve.
 */
export function linhasDeAvaliacao(rows: ScoreRow[]): ScoreRow[] {
  return rows.filter((row) => row.tipo === 'sjt' || row.tipo === 'big_five')
}

/**
 * RH read-only scorecard for the SJT scores of one candidatura. Structured,
 * neutral, AI-as-suggestion (RNF-07a) — never an auto-decision.
 */
export function ScorecardAvaliacao({
  candidaturaId,
  className,
}: ScorecardAvaliacaoProps) {
  const { data, isLoading, isError } = useScorecardCandidato(candidaturaId)

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-24 w-full bg-white/5" />
        <Skeleton className="h-40 w-full bg-white/5" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className={cn('text-sm text-white/60', className)}>
        Não foi possível carregar as avaliações.
      </p>
    )
  }

  // C-8: o filtro vem ANTES da checagem de vazio e do despacho — só entrevista/redação = vazio.
  const rows = linhasDeAvaliacao(data ?? [])
  if (rows.length === 0) {
    return (
      <p className={cn('text-sm text-white/60', className)}>
        Sem avaliações registradas ainda.
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {rows
        .filter((row) => !isBigFiveRow(row))
        .map((row) =>
          row.subtipo === 'mc' ? (
            // 52-11 / D-21, D-37: situação, alternativas em ordem neutra e a escolhida — no lugar
            // da antiga lista «Item N · etiqueta · peso», que mostrava o código cru da etiqueta.
            <SjtMcDetalhe
              key={row.id}
              row={row}
              candidaturaId={candidaturaId}
              marcadorRevisao={row.status === 'pendente_humano' ? <RevisaoHumanaMarker /> : null}
            />
          ) : (
            <CasoAbertoBreakdown key={row.id} row={row} candidaturaId={candidaturaId} />
          ),
        )}
      {/* 52-11 / D-01: com linha `big_five`, as faixas da devolutiva; sem, «Não fez». */}
      {estadoBigFive(rows) === 'concluido' ? (
        <BigFiveResultadoHub candidaturaId={candidaturaId} temLinhaBigFive />
      ) : (
        <BigFiveEstado estado="nao_fez" />
      )}
    </div>
  )
}
