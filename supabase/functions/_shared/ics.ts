/**
 * `_shared/ics.ts` — gerador `.ics` (RFC 5545) para o convite de entrevista (COMM-04).
 *
 * PORT VERBATIM do M6: `src/features/agendamento/services/agendamentoCandidatoService.ts`
 * (`gerarIcsAgendamento` + helpers `toIcsUtc`/`escapeIcsText`/`foldIcsLine` + constantes).
 * Não há import compartilhável cross `src/`↔`supabase/functions/` (dois runtimes, dois
 * tsconfig), então a função pura é copiada byte-a-byte. A ÚNICA adaptação é o erro: o M6
 * lança `MeuAgendamentoServiceError`; aqui um `IcsGenerationError` local com a MESMA
 * mensagem preserva o comportamento (throw em `data_hora` inválida).
 *
 * ZERO IMPORTS POR DESIGN (espelha `email-config.ts`): roda sob `deno test --allow-read`
 * sem `--allow-net`; a EF do convite (`notificar-candidato`) importa
 * `gerarIcsAgendamento` + `icsParaBase64` daqui e anexa o resultado no e-mail.
 *
 * Subtilezas preservadas do M6: CRLF (`\r\n`) obrigatório (Outlook rejeita LF puro);
 * escaping de TEXT (RFC 5545 §3.3.11); UTC básico (`YYYYMMDDTHHMMSSZ`); `METHOD:PUBLISH`
 * (não REQUEST — sem semântica RSVP); SUMMARY genérico (nenhum nome de vaga / zero PII).
 */

/** Erro local do gerador — espelha a mensagem do `MeuAgendamentoServiceError` do M6. */
export class IcsGenerationError extends Error {
  constructor(message: string, public code: 'INVALID_INPUT' = 'INVALID_INPUT') {
    super(message)
    this.name = 'IcsGenerationError'
  }
}

/**
 * Input mínimo do gerador — só os 3 campos que `gerarIcsAgendamento` usa (substitui o
 * `MeuAgendamentoRow` do M6, que carrega colunas irrelevantes ao `.ics`).
 */
export interface IcsAgendamentoInput {
  id: string
  data_hora: string // ISO timestamptz
  local_ou_link: string | null
}

const UMA_HORA_MS = 60 * 60 * 1000

/** O título genérico do calendário — nunca um nome de vaga (sem PII). */
const ICS_SUMMARY = 'Entrevista Beauty Smile'

/**
 * ISO timestamptz → forma básica UTC do iCalendar.
 * `2026-07-20T17:30:00.000Z` → `20260720T173000Z`.
 */
function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Escapa TEXT do iCalendar (RFC 5545 §3.3.11): backslash, ponto-e-vírgula, vírgula, newline. */
function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Fold de content-line (RFC 5545 §3.1): linha > 75 OCTETOS é quebrada em linhas físicas
 * de ≤75 octetos, unidas por CRLF + um espaço de continuação. Medido em octetos UTF-8 via
 * `TextEncoder`, iterando por code point (`for…of`) para nunca partir um codepoint
 * multi-byte. Primeira linha física: 75 octetos; continuações: 74 (+ o espaço).
 */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const chunks: string[] = []
  let current = ''
  let currentOctets = 0
  let limit = 75 // primeira linha física: 75 octetos; continuações: 74 (+ espaço)
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
 * Constrói a string VCALENDAR/VEVENT do convite. Campos obrigatórios do VEVENT
 * (UID/DTSTAMP/DTSTART) + DTEND (+1h) + SUMMARY genérico + LOCATION opcional (só quando
 * há link/local). Linhas unidas por CRLF (`\r\n`) — obrigatório.
 */
export function gerarIcsAgendamento(row: IcsAgendamentoInput): string {
  // Guarda o seam não-guardado: `toIcsUtc` lançaria um `RangeError: Invalid time value`
  // opaco numa `data_hora` vazia/inválida. Espelha o guard do M6 e surface um erro tipado.
  const startMs = new Date(row.data_hora).getTime()
  if (Number.isNaN(startMs)) {
    throw new IcsGenerationError('data_hora inválida — não é possível gerar o .ics')
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
  // Fold de cada linha a ≤75 octetos ANTES do join CRLF. CRLF é obrigatório.
  return lines.map(foldIcsLine).join('\r\n')
}

/**
 * Converte a string `.ics` em base64 de forma UTF-8-safe, para o campo `content` do anexo
 * do Resend. `btoa` sozinho lança em char não-Latin1 (nome/local acentuado): encodamos
 * para bytes UTF-8 primeiro e então convertemos a uma binary-string que `btoa` aceita.
 * O `.ics` do convite é pequeno (<8 KB), então o spread direto é seguro (sem stack overflow).
 */
export function icsParaBase64(ics: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(ics)))
}
