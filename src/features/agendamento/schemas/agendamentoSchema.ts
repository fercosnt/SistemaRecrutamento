/**
 * agendamentoSchema — client-side interview-scheduling form shape (Zod, AGEND-02/03).
 *
 * The RH form carries ONLY the client-writable fields the service places on the write
 * body (modalidade + datetime + optional local/link/notes/interviewer). It NEVER
 * carries a trigger-stamped scope/audit column — those are stamped server-side by the
 * P33 BEFORE trigger, so they are outside the form entirely (anti-tamper by shape,
 * T-34-03-01).
 *
 * Validation gates: `data_hora` must be a valid FUTURE timestamp (you cannot schedule
 * an interview in the past); `tipo` must be one of the two live modalidades. pt-BR
 * messages throughout (CLAUDE.md §Idioma).
 *
 * @module features/agendamento/schemas/agendamentoSchema
 */
import { z } from 'zod'

/** pt-BR message set (single source, no drift). */
const MSG = {
  tipo: 'Selecione a modalidade da entrevista.',
  dataRequired: 'Informe a data e o horário da entrevista.',
  dataFuture: 'A data e o horário da entrevista devem ser no futuro.',
} as const

/**
 * The interview-scheduling form schema. `data_hora` is an ISO timestamp string that
 * must parse to a moment strictly in the future; `tipo` is the online|presencial enum.
 * The local/link, observações internas and entrevistador fields are optional strings.
 */
export const agendamentoSchema = z.object({
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

export type AgendamentoFormValues = z.infer<typeof agendamentoSchema>
