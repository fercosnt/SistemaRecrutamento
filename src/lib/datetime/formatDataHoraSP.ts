/**
 * formatDataHoraSP — the shared America/Sao_Paulo interview-datetime formatter.
 *
 * A `timestamptz` arrives as an ISO UTC string; pinning the display to
 * America/Sao_Paulo (via `Intl.DateTimeFormat`) keeps the shown time stable across
 * viewer timezones instead of the browser's local zone (IN-04 / AGEND-04). This is
 * the ONE implementation both the RH `EntrevistaDashboard` and the candidate
 * agendamento card (Plan 35-02) consume — extracted verbatim from
 * EntrevistaDashboard.tsx:44-73 (rename `formatDataHora` → `formatDataHoraSP`).
 *
 * Brazil abolished DST in 2019 (São Paulo is a fixed UTC-3), but `Intl` with an
 * explicit `timeZone` is correct with or without DST — never hand-roll a UTC-3 offset.
 *
 * @module lib/datetime/formatDataHoraSP
 * @see src/features/entrevista/components/EntrevistaDashboard.tsx (extraction source)
 */

/**
 * The domain timezone for displayed interview datetimes (IN-04). Pinning to
 * America/Sao_Paulo keeps the shown time stable across viewer timezones.
 */
const DISPLAY_TIME_ZONE = 'America/Sao_Paulo'

/** Reads the timezone-pinned dd/mm/yyyy/hh/min parts of an ISO timestamptz. */
export function saoPauloParts(
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
export function formatDataHoraSP(iso: string | null): string | null {
  if (!iso) return null
  const p = saoPauloParts(iso)
  if (!p) return null
  return `${p.dd}/${p.mm}/${p.yyyy} às ${p.hh}:${p.min}`
}
