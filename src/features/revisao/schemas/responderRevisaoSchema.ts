/**
 * responderRevisaoSchema — a validação de cliente da resposta à revisão de decisão
 * (REVISAO-03, LGPD Art. 20).
 *
 * Forma copiada de `decisaoSchema.ts` (a constante do mínimo, o `z.enum`, a mensagem de
 * mínimo e o array de opções rotuladas), porque é o mesmo gesto de produto: um veredito
 * de vocabulário fechado + uma justificativa longa que sai do sistema.
 *
 * ── O MÍNIMO DE 50 AQUI **ESPELHA** O SERVIDOR, NÃO O SUBSTITUI ───────────────────
 * `responder_revisao_decisao` levanta `22023` quando
 * `length(btrim(coalesce(p_justificativa,''))) < 50`. Esse é o guard REAL: ele vale
 * mesmo que este arquivo seja apagado, mesmo que alguém chame a RPC por fora, mesmo com
 * a interface desatualizada. O que este schema entrega é a mensagem certa no momento
 * certo — o operador descobre que faltam 12 caracteres antes de uma viagem de rede, não
 * depois. Confundir os dois papéis é como se perde um controle: quem trata a validação
 * de cliente como a barreira acaba afrouxando o servidor "porque o formulário já checa".
 *
 * ── O TETO DE 2000 É NOSSO, E SÓ NOSSO ───────────────────────────────────────────
 * O servidor exige apenas o mínimo. O teto é guarda de interface: uma justificativa é
 * lida por uma pessoa num e-mail e numa página, e um texto de 40 mil caracteres não é
 * transparência, é despejo. O `maxLength` da área de texto e este `.max()` são o mesmo
 * número, declarado uma vez.
 *
 * @module features/revisao/schemas/responderRevisaoSchema
 * @see src/features/decisao/schemas/decisaoSchema.ts (a forma copiada)
 * @see supabase/migrations/20260730000002_p42_revisao_art20_authz_fail_closed.sql (o guard real)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Diálogo "Responder revisão")
 */
import { z } from 'zod'

/** O piso da justificativa — o MESMO número do `22023` da RPC (defesa em profundidade). */
export const JUSTIFICATIVA_MIN = 50

/** O teto da justificativa — guarda de interface; o servidor não o exige. */
export const JUSTIFICATIVA_MAX = 2000

export const responderRevisaoSchema = z.object({
  veredito: z.enum(['mantida', 'revertida']),
  justificativa: z
    .string()
    // `.trim()` ANTES dos limites, espelhando o `btrim` do servidor. Sem ele, 60 espaços
    // passariam no gate do cliente e voltariam como um `22023` opaco — o operador veria
    // "não foi possível registrar" sem nenhuma pista de por quê.
    .trim()
    // Mensagem VERBATIM da 42-UI-SPEC (§Diálogo → "Erro de mínimo"). O mesmo texto que
    // `decisaoSchema` já usa: o operador vê uma frase só para este fato, nas duas telas.
    .min(JUSTIFICATIVA_MIN, 'A justificativa precisa de pelo menos 50 caracteres.')
    .max(JUSTIFICATIVA_MAX, 'A justificativa pode ter no máximo 2000 caracteres.'),
})

export type ResponderRevisaoFormValues = z.infer<typeof responderRevisaoSchema>

/**
 * As duas opções de veredito, na ordem da UI-SPEC, com os rótulos e os textos de ajuda
 * verbatim. A ajuda vive AQUI (e não solta no componente) para que rótulo e explicação
 * não possam derivar um do outro.
 */
export const VEREDITO_OPTIONS: {
  value: ResponderRevisaoFormValues['veredito']
  label: string
  ajuda: string
}[] = [
  {
    value: 'mantida',
    label: 'Manter a decisão',
    ajuda: 'A decisão original permanece como está.',
  },
  {
    value: 'revertida',
    label: 'Reverter a decisão',
    ajuda: 'A decisão original deixa de valer.',
  },
]
