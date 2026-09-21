/**
 * agendamentoSchema — client-side interview-scheduling form shape (Zod, AGEND-02/03).
 *
 * The RH form carries ONLY the client-writable fields the service places on the write
 * body (modalidade + datetime + local/link + optional notes/interviewer). It NEVER
 * carries a trigger-stamped scope/audit column — those are stamped server-side by the
 * P33 BEFORE trigger, so they are outside the form entirely (anti-tamper by shape,
 * T-34-03-01).
 *
 * Validation gates: `data_hora` must be a valid FUTURE timestamp (you cannot schedule
 * an interview in the past); `tipo` must be one of the two live modalidades; and
 * `local_ou_link` is REQUIRED in both (JORN-D5, Phase 48 / 48-03) — the same column holds
 * the ADDRESS for `presencial` (any non-blank text) and the LINK for `online` (must pass
 * `isSafeHttpUrl`: http(s) only, so `dddd`/`javascript:`/`data:` never enter). The server
 * layer is the BEFORE trigger `validar_local_ou_link_agendamento`
 * (supabase/migrations/20260921000003_p48_local_ou_link_valida.sql) — the write is
 * PostgREST direct under RLS, so this schema is the UX gate and the trigger is the rule.
 * pt-BR messages throughout (CLAUDE.md §Idioma).
 *
 * @module features/agendamento/schemas/agendamentoSchema
 */
import { z } from 'zod'
import { isSafeHttpUrl } from '@/lib/url/isSafeHttpUrl'

/** pt-BR message set (single source, no drift). */
const MSG = {
  tipo: 'Selecione a modalidade da entrevista.',
  dataRequired: 'Informe a data e o horário da entrevista.',
  dataFuture: 'A data e o horário da entrevista devem ser no futuro.',
  localObrigatorio: 'Informe o local da entrevista.',
  linkObrigatorio: 'Informe o link da videochamada.',
  linkInvalido: 'Informe um link válido, começando com http:// ou https://.',
} as const

/**
 * The interview-scheduling form schema. `data_hora` is an ISO timestamp string that
 * must parse to a moment strictly in the future; `tipo` is the online|presencial enum.
 * `local_ou_link` is required per modalidade (see module doc); observações internas and
 * entrevistador are optional strings.
 */
export const agendamentoSchema = z
  .object({
    tipo: z.enum(['online', 'presencial'], {
      errorMap: () => ({ message: MSG.tipo }),
    }),
    data_hora: z
      .string({ required_error: MSG.dataRequired })
      .min(1, MSG.dataRequired)
      .refine((value) => {
        const t = new Date(value).getTime()
        return !Number.isNaN(t) && t > Date.now()
      }, MSG.dataFuture),
    local_ou_link: z.string().optional(),
    observacoes_rh: z.string().optional(),
    entrevistador: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const valor = values.local_ou_link?.trim() ?? ''
    if (values.tipo === 'presencial') {
      if (!valor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['local_ou_link'],
          message: MSG.localObrigatorio,
        })
      }
      return
    }
    if (values.tipo === 'online') {
      if (!valor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['local_ou_link'],
          message: MSG.linkObrigatorio,
        })
      } else if (!isSafeHttpUrl(valor)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['local_ou_link'],
          message: MSG.linkInvalido,
        })
      }
    }
  })

export type AgendamentoFormValues = z.infer<typeof agendamentoSchema>
