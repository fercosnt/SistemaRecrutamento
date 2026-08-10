/**
 * HistoricoBlock — the RH read-only history feed on the candidate hub (VISRH-03).
 *
 * Renders `historico_candidatura` transitions newest-first as a READ-ONLY vertical
 * list — each row: `{origem} → {destino}`, quem agiu (`ator_rotulo`), pt-BR timestamp
 * (`d 'de' MMM, HH:mm`), and the justificativa (`criterio_texto`). There is NO edit
 * affordance — the feed only reflects the audited transitions the write-paths
 * (avancar_etapa / rejeitar_candidatura) produced.
 *
 * ⚠ Desde a Phase 47 (CONSOL-02) a autoria chega **resolvida do servidor** como um de
 * QUATRO rótulos exaustivos, e o uuid do ator não tem nenhum caminho até esta tela. Este
 * componente **não decide rótulo nenhum**: ele renderiza o que veio. A versão anterior
 * derivava "Sistema" de um ator nulo aqui — reintroduzir essa expressão criaria uma
 * segunda fonte da mesma verdade, e as duas divergiriam.
 *
 * States: `isLoading` → HubSection skeleton; `isError` → HubSection error copy; an
 * empty `rows` → the "Sem movimentações registradas" empty copy (UI-SPEC). Os três
 * ficaram INALTERADOS nesta fase.
 *
 * @module features/hub-candidato/components/HistoricoBlock
 * @see .planning/phases/34-.../34-UI-SPEC.md (§Histórico copy + §States Contract)
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§HistoricoBlock — os quatro rótulos, D-47-U07/U08/U09)
 */
import { ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ETAPA_M2_LABELS, type EtapaFunilM2 } from '@/features/triagem/services/triagemService'
import type { HistoricoRow } from '../services/historicoCandidaturaService'
import { HubSection } from './HubSection'

export interface HistoricoBlockProps {
  /** The allowlist-projected transitions, newest-first. */
  rows: HistoricoRow[]
  /** The feed read is in flight → HubSection skeleton. */
  isLoading?: boolean
  /** The feed read failed → HubSection error copy. */
  isError?: boolean
}

/** pt-BR label for an etapa enum value; falls back to the raw value / "—". */
function labelEtapa(etapa: string | null): string {
  if (!etapa) return '—'
  return ETAPA_M2_LABELS[etapa as EtapaFunilM2] ?? etapa
}

/** Formats the transition timestamp in pt-BR (`d 'de' MMM, HH:mm`), tolerating bad input. */
function formatData(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return format(d, "d 'de' MMM, HH:mm", { locale: ptBR })
}

export function HistoricoBlock({ rows, isLoading, isError }: HistoricoBlockProps) {
  return (
    <HubSection titulo="Histórico" estado="com_dados" isLoading={isLoading} isError={isError}>
      {rows.length === 0 ? (
        <div className="space-y-1">
          <p className="text-base font-semibold text-white">Sem movimentações registradas</p>
          <p className="text-sm text-white/70 leading-relaxed">
            As transições de etapa aparecerão aqui conforme o candidato avança no funil.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, i) => (
            <li
              key={`${row.criado_em}-${i}`}
              className="rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                <span>{labelEtapa(row.etapa_de)}</span>
                <ArrowRight className="h-4 w-4 text-white/60" aria-hidden="true" />
                <span>{labelEtapa(row.etapa_para)}</span>
              </div>
              {/* A linha de metadado: {quem agiu} · {quando}.
                  ⚠ `text-sm` (14px), não `text-xs` (D-47-U07) — e a subida vale para a div
                  INTEIRA, não só para o nome. Esta fase existe para tornar este token uma
                  PROVA DE AUTORIA numa trilha de decisão sob a RNF-07a; entregá-la no menor
                  tamanho da tela, abaixo do piso de 14px que todas as UI-SPECs recentes
                  sustentam, seria entregar o oposto do requirement.
                  ⚠ Nenhuma largura fixa: é o `flex-wrap` que faz um nome completo longo
                  quebrar para a linha seguinte em vez de empurrar a data para fora. */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60">
                {/* O rótulo chega RESOLVIDO do servidor, em um de quatro (Sistema · O próprio
                    candidato · nome completo do recrutador · Recrutador removido). Sem
                    expressão de fallback aqui: um fallback no cliente criaria um QUINTO
                    caminho de rótulo que ninguém especificou e que ninguém testaria.
                    Os quatro são distinguidos por PALAVRA — nunca por cor, ícone ou selo
                    (Invariante 9) — e "Recrutador removido" não é alerta: ninguém errou.
                    O nome se separa da data por PESO e OPACIDADE, jamais por cor. */}
                <span className="font-semibold text-white/80">{row.ator_rotulo}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={row.criado_em}>{formatData(row.criado_em)}</time>
              </div>
              {row.criterio_texto ? (
                <p className="mt-2 text-sm text-white/80 leading-relaxed">{row.criterio_texto}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </HubSection>
  )
}
