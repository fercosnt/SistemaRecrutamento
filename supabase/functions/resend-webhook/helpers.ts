/**
 * Phase 41 / Plan 41-02 — helpers PUROS da EF `resend-webhook` (RECON-02).
 *
 * Funções puras extraídas do `index.ts` para serem testáveis SEM `Deno.serve`
 * (importar `index.ts` num teste dispararia o servidor). Mesma disciplina de
 * `notificar-candidato/helpers.ts`: ZERO rede, ZERO segredo, ZERO efeito colateral.
 *
 * @module supabase/functions/resend-webhook/helpers
 */

/** Status terminal da entrega + a coluna de timestamp correspondente. */
export interface EventoStatus {
  status: "entregue" | "bounce" | "reclamado";
  col: "entregue_em" | "bounce_em" | "reclamado_em";
}

/**
 * Mapeia o `type` do webhook do Resend para o status terminal + a coluna de
 * timestamp em `notificacoes_enviadas`. Allowlist EXPLÍCITA — só os 3 eventos
 * tratados no v1; qualquer outro tipo (`email.sent`/`email.delivery_delayed`/
 * `email.opened`/`email.clicked`/desconhecido) devolve `null` e é ignorado
 * graciosamente pelo handler.
 *
 * Source: https://resend.com/docs/webhooks/event-types
 *
 * @param type o campo `type` do envelope do webhook (ex.: "email.delivered").
 * @returns `{ status, col }` para os 3 eventos v1, ou `null` para o resto.
 */
export function mapEventoStatus(type: string): EventoStatus | null {
  switch (type) {
    case "email.delivered":
      return { status: "entregue", col: "entregue_em" };
    case "email.bounced":
      return { status: "bounce", col: "bounce_em" };
    case "email.complained":
      return { status: "reclamado", col: "reclamado_em" };
    default:
      // email.sent / email.delivery_delayed / email.opened / email.clicked / ... = ignorados no v1.
      return null;
  }
}
