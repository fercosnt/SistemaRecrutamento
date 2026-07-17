/**
 * agendamentoCandidatoService — the CANDIDATE own-row read of the scheduled interview
 * (AGEND-04 / SEG-03). This is the security-critical consumer half of Phase 33.
 *
 * The candidate reads the interview ONLY through the `get_meu_agendamento` SECURITY
 * DEFINER RPC. That RPC:
 *  - enforces posse INSIDE the function (JOIN candidaturas→candidatos WHERE
 *    ca.user_id = auth.uid()) — the client only passes `candidatura_id`;
 *  - projects EXACTLY the 7-col allowlist (id, candidatura_id, tipo, data_hora,
 *    local_ou_link, status, compareceu) — physically EXCLUDING every RH-internal /
 *    audit column (the private notes, the interviewer, the scheduler, the audit
 *    stamps, and the vaga reference) — see the RPC allowlist in the migration below;
 *  - ORDERs BY data_hora DESC (we take the newest row).
 *
 * ANTI-PATTERN (never): `supabase.from('agendamentos_entrevista')` or a `select('*')`
 * on this path. No candidate base-table SELECT policy exists (the read would return 0
 * rows) AND a star projection would re-leak the columns the RPC excludes
 * ([[reference_select_star_leaks_pii]], T-35-01).
 *
 * @module features/agendamento/services/agendamentoCandidatoService
 * @see supabase/migrations/20260716000001_agendamentos_entrevista.sql:133-168 (the RPC)
 * @see src/features/agendamento/services/agendamentoService.ts (the RH-side write/read layer)
 */
import { supabase } from '@/lib/supabase/client'
import type { TipoAgendamento, StatusAgendamento } from './agendamentoService'

/** Service error mirroring the `camelCaseService.ts` convention (CLAUDE.md). */
export class MeuAgendamentoServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'DATABASE_ERROR' | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'MeuAgendamentoServiceError'
  }
}

/**
 * The candidate-facing agendamento row — the 7-col allowlist ONLY (never an
 * RH-internal column). `local_ou_link` and `compareceu` are widened to `| null`: the
 * Supabase types generator marks the RETURNS TABLE columns NON-NULL, but the
 * underlying columns are nullable (Pitfall 1 — the one place the generated types lie).
 */
export interface MeuAgendamentoRow {
  id: string
  candidatura_id: string
  tipo: TipoAgendamento
  data_hora: string // ISO timestamptz
  local_ou_link: string | null // ⚠ generated says `string`; column is nullable
  status: StatusAgendamento
  compareceu: boolean | null // not rendered here, but nullable
}

/**
 * Loads the candidate's OWN latest agendamento via the `get_meu_agendamento` DEFINER
 * RPC. Posse is enforced INSIDE the RPC; the projection is the 7-col allowlist. Returns
 * the newest row (rows[0] — the RPC already ORDER BY data_hora DESC) or null when the
 * candidate has no agendamento. The RPC is present in `database.types.ts`, so the call
 * is fully typed — NO confined cast (unlike get_minha_redacao, which is absent there).
 */
export async function getMeuAgendamento(
  candidaturaId: string,
): Promise<MeuAgendamentoRow | null> {
  if (!candidaturaId) {
    throw new MeuAgendamentoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase.rpc('get_meu_agendamento', {
    p_candidatura_id: candidaturaId,
  })

  if (error) {
    throw new MeuAgendamentoServiceError(
      `Não foi possível carregar sua entrevista: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  // The RPC returns an array ordered by data_hora DESC — take the newest or null. The
  // generator widens `local_ou_link`/`compareceu` to non-null; MeuAgendamentoRow is the
  // boundary that corrects that to `| null`.
  const rows = (data ?? []) as MeuAgendamentoRow[]
  return rows[0] ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// AGEND-05 — client-side `.ics` (RFC 5545) + the upcoming/≤24h pure predicates.
//
// The calendar file is hand-rolled (LOCKED: zero new npm — no `ics`/`ical-generator`
// dependency). The format is tiny and stable; the ONLY subtleties are the mandatory
// CRLF line joins (Outlook rejects bare LF), the TEXT escaping of SUMMARY/LOCATION
// (a comma in an address would otherwise break the VEVENT — RFC 5545 §3.3.11), and
// emitting the timestamptz in basic UTC form (`YYYYMMDDTHHMMSSZ`). The SUMMARY is a
// GENERIC constant — `vaga_id` is outside the RPC allowlist, so no vaga name / no PII
// ever reaches the file (T-35-01/T-35-04).
// ─────────────────────────────────────────────────────────────────────────────

const UMA_HORA_MS = 60 * 60 * 1000
const VINTE_QUATRO_HORAS_MS = 24 * UMA_HORA_MS

/** The generic calendar title — never a vaga name (vaga_id is outside the allowlist). */
const ICS_SUMMARY = 'Entrevista Beauty Smile'

/**
 * ISO timestamptz → the iCalendar basic UTC form.
 * `2026-07-20T17:30:00.000Z` → `20260720T173000Z`.
 */
function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Escapes iCalendar TEXT (RFC 5545 §3.3.11): backslash, semicolon, comma, newline. */
function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * RFC 5545 §3.1 content-line folding (WR-02): a content line longer than 75 OCTETS must
 * be split into physical lines of ≤75 octets, joined by CRLF + a single leading space
 * (the continuation marker). We measure in UTF-8 OCTETS (not chars) via `TextEncoder`
 * and iterate by code point (`for…of`) so a multi-byte codepoint is never split — a long
 * `LOCATION` (a meeting URL or a full street address after `escapeIcsText`) can exceed 75
 * octets, which a strict/legacy parser would otherwise truncate or reject. The first
 * physical line carries 75 octets; each continuation reserves 1 octet for the leading
 * space → 74 octets of payload, so every emitted physical line stays ≤75 octets.
 */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const chunks: string[] = []
  let current = ''
  let currentOctets = 0
  let limit = 75 // first physical line: full 75 octets; continuations: 74 (+ leading space)
  for (const char of line) {
    const charOctets = encoder.encode(char).length
    if (currentOctets + charOctets > limit) {
      chunks.push(current)
      current = char
      currentOctets = charOctets
      limit = 74
    } else {
      current += char
      currentOctets += charOctets
    }
  }
  chunks.push(current)
  return chunks.join('\r\n ')
}

/**
 * Builds the VCALENDAR/VEVENT string for the candidate's interview. Required VEVENT
 * fields (UID/DTSTAMP/DTSTART) + DTEND (+1h) + generic SUMMARY + optional LOCATION
 * (only when a link/local exists). Lines joined with CRLF (`\r\n`) — mandatory.
 */
export function gerarIcsAgendamento(row: MeuAgendamentoRow): string {
  // IN-03: guard the un-guarded seam — `toIcsUtc` would throw an opaque
  // `RangeError: Invalid time value` on an empty/unparseable `data_hora`. Mirror the
  // `Number.isNaN` guards on the sibling predicates and surface a typed caller error.
  const startMs = new Date(row.data_hora).getTime()
  if (Number.isNaN(startMs)) {
    throw new MeuAgendamentoServiceError(
      'data_hora inválida — não é possível gerar o .ics',
      'INVALID_INPUT',
    )
  }

  const dtStart = toIcsUtc(row.data_hora)
  const dtEnd = toIcsUtc(new Date(startMs + UMA_HORA_MS).toISOString())
  const dtStamp = toIcsUtc(new Date().toISOString())

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Beauty Smile//Recrutamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${row.id}@recrutamento.beautysmile`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(ICS_SUMMARY)}`,
    ...(row.local_ou_link
      ? [`LOCATION:${escapeIcsText(row.local_ou_link)}`]
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  // Fold each content line to ≤75 octets (RFC 5545 §3.1) BEFORE the CRLF join. CRLF is
  // mandatory (Outlook rejects bare LF).
  return lines.map(foldIcsLine).join('\r\n')
}

/**
 * Triggers the `.ics` download synchronously — mirrors the Blob/anchor idiom of
 * `biasAuditService.ts:147-155` (no npm, no loading state).
 */
export function baixarIcsAgendamento(row: MeuAgendamentoRow): void {
  const blob = new Blob([gerarIcsAgendamento(row)], {
    type: 'text/calendar;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'entrevista-beauty-smile.ics'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * The AGEND-05 gate shared by the `.ics` button AND the ≤24h badge: the interview is
 * in the future AND not cancelled. An invalid ISO is treated as not-upcoming (guard).
 */
export function ehUpcomingNaoCancelada(
  iso: string,
  status: StatusAgendamento,
  now: Date = new Date(),
): boolean {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t > now.getTime() && status !== 'cancelada'
}

/**
 * True when the interview is within the next 24h: `0 < (data_hora − now) ≤ 24h`
 * (inclusive at exactly 24h). Past/now → false.
 */
export function estaDentroDe24h(iso: string, now: Date = new Date()): boolean {
  const diff = new Date(iso).getTime() - now.getTime()
  return diff > 0 && diff <= VINTE_QUATRO_HORAS_MS
}
