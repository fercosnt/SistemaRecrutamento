/**
 * EntrevistaDashboard — the candidate-context panel of the RH interview workspace
 * (ENTREV-02). Surfaces the etapa, the manually-scheduled interview datetime, and a
 * pure client-side "24h antes" marker (in-app only — NO email/calendar pipeline in
 * V1, CONTEXT decision). RH-facing only; the candidate never reaches this surface.
 *
 * The 24h marker is an informative urgency cue, NOT an alarm (UI-SPEC §Color):
 *   <24h of the scheduled datetime → amber pill ("Entrevista em menos de 24h")
 *   ≥24h away / unscheduled       → neutral pill ("Faltam N dias" / "Sem horário")
 * A tooltip on the pill names the exact scheduled datetime.
 *
 * @module features/entrevista/components/EntrevistaDashboard
 * @see src/features/triagem/components/RedacaoCorBadge.tsx (Badge tint + tooltip idiom)
 * @see .planning/phases/14-entrevistas-com-ia-companion-etapas-4-5/14-UI-SPEC.md (§Color 24h marker)
 */
import { CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/components/ui/utils'
import type { EntrevistaContextoRow } from '../services/entrevistaService'

/** Human-readable pt-BR etapa labels (mirrors the etapa_processo enum). */
const ETAPA_LABEL: Record<string, string> = {
  inscricao: 'Inscrição',
  triagem: 'Triagem',
  avaliacao_assincrona: 'Avaliação assíncrona',
  entrevista_online: 'Entrevista online',
  entrevista_presencial: 'Entrevista presencial',
  decisao_final: 'Decisão final',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

/**
 * The domain timezone for displayed interview datetimes (IN-04). The
 * `entrevista_agendada_em` is a `timestamptz`; pinning to America/Sao_Paulo keeps the
 * shown time stable across viewer timezones instead of the browser's local zone.
 */
const DISPLAY_TIME_ZONE = 'America/Sao_Paulo'

/** Reads the timezone-pinned dd/mm/yyyy/hh/min parts of an ISO timestamptz. */
function saoPauloParts(
  iso: string,
): { dd: string; mm: string; yyyy: string; hh: string; min: string } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: DISPLAY_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  // hour12:false can render midnight as '24' in some engines — normalize to '00'.
  const hh = pick('hour') === '24' ? '00' : pick('hour')
  return { dd: pick('day'), mm: pick('month'), yyyy: pick('year'), hh, min: pick('minute') }
}

/** Formats an ISO datetime as `dd/mm/aaaa às hh:mm` pinned to America/Sao_Paulo (IN-04). */
export function formatDataHora(iso: string | null): string | null {
  if (!iso) return null
  const p = saoPauloParts(iso)
  if (!p) return null
  return `${p.dd}/${p.mm}/${p.yyyy} às ${p.hh}:${p.min}`
}

/** Short `dd/mm às hh:mm` form (America/Sao_Paulo) for the tooltip. */
function formatCurto(iso: string | null): string | null {
  if (!iso) return null
  const p = saoPauloParts(iso)
  if (!p) return null
  return `${p.dd}/${p.mm} às ${p.hh}:${p.min}`
}

/**
 * Pure client-side 24h computation. Returns the marker variant + label.
 * `<24h` (and still in the future) → amber; `≥24h` → neutral "Faltam N dias";
 * unscheduled / past → neutral fallback.
 */
export function compute24hMarker(
  agendadaEm: string | null,
  now: Date = new Date(),
): { variant: 'amber' | 'neutral'; label: string } {
  if (!agendadaEm) {
    return { variant: 'neutral', label: 'Sem horário definido' }
  }
  const target = new Date(agendadaEm)
  if (Number.isNaN(target.getTime())) {
    return { variant: 'neutral', label: 'Sem horário definido' }
  }
  const diffMs = target.getTime() - now.getTime()
  const hours24 = 24 * 60 * 60 * 1000
  if (diffMs <= 0) {
    return { variant: 'neutral', label: 'Entrevista já ocorreu' }
  }
  if (diffMs < hours24) {
    return { variant: 'amber', label: 'Entrevista em menos de 24h' }
  }
  const dias = Math.ceil(diffMs / hours24)
  return { variant: 'neutral', label: `Faltam ${dias} dias para a entrevista` }
}

export interface EntrevistaDashboardProps {
  contexto: EntrevistaContextoRow | null
  /** Opens the "Agendar entrevista" datetime picker (calendar + time select). */
  onAgendar?: () => void
  className?: string
}

/** The 24h marker pill — amber <24h / neutral otherwise; tooltip names the datetime. */
function Marker24h({ agendadaEm }: { agendadaEm: string | null }) {
  const { variant, label } = compute24hMarker(agendadaEm)
  const curto = formatCurto(agendadaEm)
  const tint =
    variant === 'amber'
      ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
      : 'border-white/20 bg-white/5 text-white/80'

  const badge = (
    <Badge className={cn('gap-1 text-xs font-semibold leading-[1.4] cursor-default', tint)}>
      <CalendarClock className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  )

  if (!curto) return badge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{curto}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * The candidate dashboard zone — etapa label + scheduled datetime + 24h marker +
 * the "Agendar entrevista" CTA. Manual scheduling V1 (in-app only, CONTEXT).
 */
export function EntrevistaDashboard({
  contexto,
  onAgendar,
  className,
}: EntrevistaDashboardProps) {
  const etapa = contexto ? (ETAPA_LABEL[contexto.etapa_atual] ?? contexto.etapa_atual) : '—'
  const agendadaEm = contexto?.entrevista_agendada_em ?? null
  const dataHora = formatDataHora(agendadaEm)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-white">Painel do candidato</h3>
          {contexto?.candidato_nome ? (
            <p className="text-sm font-semibold text-white/70">{contexto.candidato_nome}</p>
          ) : null}
        </div>
        <Marker24h agendadaEm={agendadaEm} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="text-sm font-semibold text-white/90">
            Etapa atual: <span className="text-white">{etapa}</span>
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          {dataHora ? (
            <p className="text-sm font-semibold text-white/90">
              Entrevista agendada: <span className="text-white">{dataHora}</span>{' '}
              <span className="text-white/50">(manual no V1)</span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-white/80">
              Sem horário definido.{' '}
              <span className="font-normal text-white/60">
                Defina a data e a hora da entrevista.
              </span>
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onAgendar}
        className="min-h-[44px] rounded-lg border border-white/20 bg-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30"
      >
        Agendar entrevista
      </button>
    </div>
  )
}
