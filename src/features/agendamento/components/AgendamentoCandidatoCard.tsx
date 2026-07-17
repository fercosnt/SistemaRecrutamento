/**
 * AgendamentoCandidatoCard — the candidate-facing interview card (AGEND-04 / AGEND-05).
 *
 * Mounts INLINE in `DashboardCandidatoPage`'s "Próximo passo" footer for candidaturas in
 * the two entrevista etapas. This component OWNS `useMeuAgendamento(candidaturaId)` — the
 * hook lives HERE so the parent's per-candidatura `.map` never calls a hook conditionally
 * (Rules-of-Hooks fix; RESEARCH Pattern 3 / Pitfall 4). The parent only decides whether to
 * MOUNT this child.
 *
 * Reads only the 7-col `MeuAgendamentoRow` allowlist from the DEFINER RPC (never an
 * RH-internal column). The `.ics` download + ≤24h badge appear ONLY for upcoming,
 * non-cancelled interviews; a cancelled interview stays VISIBLE (dimmed data rows + red
 * chip + note) so the candidate sees the cancellation (CONTEXT/UI-SPEC LOCKED).
 *
 * @module features/agendamento/components/AgendamentoCandidatoCard
 * @see src/features/agendamento/hooks/useMeuAgendamento.ts (the owned read hook)
 * @see src/lib/datetime/formatDataHoraSP.ts (America/Sao_Paulo formatter — never the browser-local one)
 * @see .planning/phases/35-.../35-UI-SPEC.md (states + verbatim copy + tokens)
 */
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Video,
  MapPin,
  Download,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'
import { useMeuAgendamento } from '../hooks/useMeuAgendamento'
import {
  baixarIcsAgendamento,
  ehUpcomingNaoCancelada,
  estaDentroDe24h,
  type MeuAgendamentoRow,
} from '../services/agendamentoCandidatoService'
import type { StatusAgendamento } from '../services/agendamentoService'
import { formatDataHoraSP } from '@/lib/datetime/formatDataHoraSP'

export interface AgendamentoCandidatoCardProps {
  candidaturaId: string
}

/**
 * Status → chip presentation. Reuses the file's `getStatusInfo` color grammar (verbatim
 * tokens per 35-UI-SPEC). Every chip carries a TEXT label alongside the color
 * (colorblind-safe).
 */
const STATUS_CONFIG: Record<
  StatusAgendamento,
  { icon: LucideIcon; color: string; bg: string; label: string }
> = {
  agendada: { icon: CalendarCheck, color: 'text-green-300', bg: 'bg-green-500/20', label: 'Agendada' },
  em_andamento: { icon: Clock, color: 'text-blue-300', bg: 'bg-blue-500/20', label: 'Em andamento' },
  concluida: { icon: CheckCircle2, color: 'text-gray-300', bg: 'bg-gray-500/20', label: 'Concluída' },
  reagendada: { icon: RefreshCw, color: 'text-yellow-300', bg: 'bg-yellow-500/20', label: 'Reagendada' },
  cancelada: { icon: AlertCircle, color: 'text-red-300', bg: 'bg-red-500/20', label: 'Cancelada' },
  nao_compareceu: { icon: AlertCircle, color: 'text-gray-300', bg: 'bg-gray-500/20', label: 'Não compareceu' },
}

/**
 * Defense-in-depth (WR-01): only linkify an RH-written online meeting URL when it parses
 * AND its scheme is `http:`/`https:`. `local_ou_link` comes from the RH write layer, so a
 * `javascript:`/`data:` URL is reachable via bad/compromised data; such a value is
 * rendered as inert plain text instead of a candidate-clickable anchor.
 */
function isSafeHttpUrl(u: string): boolean {
  try {
    const { protocol } = new URL(u.trim())
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Long-form pt-BR date for the screen-reader aria-label (SP-pinned). */
function formatDataHoraLonga(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(d)
}

/** The shared container: reuses the existing footer separator + the eyebrow slot. */
function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
      <span className="text-xs uppercase tracking-wide text-white/60">Sua entrevista</span>
      {children}
    </div>
  )
}

export function AgendamentoCandidatoCard({ candidaturaId }: AgendamentoCandidatoCardProps) {
  const { data: agendamento, isLoading, isError, refetch } = useMeuAgendamento(candidaturaId)

  // ── loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <CardShell>
        <div className="flex flex-col gap-2" aria-hidden="true">
          <div className="h-4 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
        </div>
      </CardShell>
    )
  }

  // ── error (does NOT block the rest of the candidatura card) ───────────────
  if (isError) {
    return (
      <CardShell>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-white/80">
            Não foi possível carregar os detalhes da sua entrevista.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 active:scale-95 sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      </CardShell>
    )
  }

  // ── no-agendamento (RH hasn't scheduled yet) ──────────────────────────────
  if (!agendamento) {
    return (
      <CardShell>
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-white/60" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-white">Aguardando agendamento</p>
            <p className="text-sm text-white/70">
              O RH ainda não agendou sua entrevista. Assim que a data for definida, ela
              aparecerá aqui.
            </p>
          </div>
        </div>
      </CardShell>
    )
  }

  // ── has-agendamento (row exists — cancelada stays visible) ────────────────
  const row: MeuAgendamentoRow = agendamento
  const statusInfo = STATUS_CONFIG[row.status] ?? {
    icon: AlertCircle,
    color: 'text-gray-300',
    bg: 'bg-gray-500/20',
    label: row.status,
  }
  const StatusIcon = statusInfo.icon
  const isCancelada = row.status === 'cancelada'
  const dimClass = isCancelada ? 'opacity-70' : ''

  // AGEND-05 gates (pure predicates). Cancelada ⇒ upcoming false ⇒ no .ics, no badge.
  const upcoming = ehUpcomingNaoCancelada(row.data_hora, row.status)
  const dentro24h = upcoming && estaDentroDe24h(row.data_hora)

  const dataHoraTexto = formatDataHoraSP(row.data_hora)
  const dataHoraLonga = formatDataHoraLonga(row.data_hora)

  return (
    <CardShell>
      {/* status + tipo chips — side-by-side on sm+, wrap on narrow */}
      <div className="flex flex-wrap gap-2">
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-2 ${statusInfo.bg} border border-white/20`}
        >
          <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} aria-hidden="true" />
          <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/80">
          {row.tipo === 'online' ? (
            <Video className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MapPin className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{row.tipo === 'online' ? 'Online' : 'Presencial'}</span>
        </div>
      </div>

      {/* data/hora — SP-pinned; screen readers hear the long form */}
      {dataHoraTexto && (
        <p
          className={`text-sm text-white ${dimClass}`}
          aria-label={dataHoraLonga || undefined}
        >
          {dataHoraTexto} <span className="text-white/60">(horário de Brasília)</span>
        </p>
      )}

      {/* link (online) / local (presencial) — presencial is NEVER a link */}
      <div className={dimClass}>
        {row.tipo === 'online' ? (
          !row.local_ou_link ? (
            // W4: RH hasn't set a link yet — graceful fallback.
            <p className="text-sm text-white/70">
              Link da videochamada será informado em breve
            </p>
          ) : isSafeHttpUrl(row.local_ou_link) ? (
            <a
              href={row.local_ou_link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Entrar na videochamada da entrevista (abre em nova aba)"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 break-words rounded-lg border border-[#35BFAD]/60 px-4 py-2 text-sm font-semibold text-[#35BFAD] transition-all duration-200 hover:bg-[#35BFAD]/10 sm:w-auto"
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              Entrar na videochamada
            </a>
          ) : (
            // WR-01: an RH-written link with a non-http(s) scheme (javascript:/data:) is
            // NEVER linkified — render the raw value as inert plain text (same non-link
            // treatment as presencial), never a candidate-clickable anchor.
            <p className="break-words text-sm text-white/90">{row.local_ou_link}</p>
          )
        ) : (
          <p className="break-words text-sm text-white/90">
            Local: {row.local_ou_link ?? 'a ser confirmado'}
          </p>
        )}
      </div>

      {/* reagendada / cancelada inline notes */}
      {row.status === 'reagendada' && (
        <p className="text-sm text-yellow-200/90">
          O horário da sua entrevista foi atualizado.
        </p>
      )}
      {isCancelada && (
        <p className="text-sm text-red-200/90">
          Esta entrevista foi cancelada. Você será avisado aqui se uma nova data for
          marcada.
        </p>
      )}

      {/* ≤24h reminder badge — amber (semantic warning, not accent) */}
      {dentro24h && (
        <div className="flex w-full items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-500/25 px-3 py-1.5 text-sm font-semibold text-amber-100 sm:w-auto">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          <span>Sua entrevista é em menos de 24h</span>
        </div>
      )}

      {/* .ics download — the LAST element, only for upcoming non-cancelled interviews */}
      {upcoming && (
        <button
          type="button"
          onClick={() => baixarIcsAgendamento(row)}
          aria-label="Adicionar entrevista à agenda, baixar arquivo .ics"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#35BFAD] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#35BFAD]/90 active:scale-95 sm:w-auto"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Adicionar à agenda (.ics)
        </button>
      )}
    </CardShell>
  )
}
