/**
 * `notificar-candidato/helpers.ts` — funções PURAS da EF, extraídas para serem
 * unit-testáveis SEM `Deno.serve` (mesmo padrão de `cost-alerter/messages.ts`: importar
 * `index.ts` num teste dispararia o servidor). O teste importa este módulo; a EF também.
 *
 * Zero rede, zero segredo. `construirCorpoResend` NUNCA carrega a chave da API.
 */
import { FROM, REPLY_TO, type EventoNotificacao } from "../_shared/email-config.ts";

/** Vocabulário do ledger (CHECK vivo `evento IN (...)`), = o que o trigger da P39 envia. */
export type EventoLedger = "confirmacao" | "avanco" | "convite" | "decisao";

/** Mapa explícito ledger → email-config (ambas as direções auditáveis num literal). */
const EVENTO_MAP: Record<EventoLedger, EventoNotificacao> = {
  confirmacao: "candidatura_recebida",
  avanco: "avaliacao_liberada",
  convite: "convite_entrevista",
  decisao: "decisao_final",
};

export function mapearEvento(e: EventoLedger): EventoNotificacao {
  return EVENTO_MAP[e];
}

/**
 * dedupe_key = 1 e-mail por evento por candidatura. Exceção: o CONVITE usa o
 * agendamento_id, para permitir re-convite legítimo (novo agendamento ⇒ nova chave).
 */
export function montarDedupeKey(
  e: EventoLedger,
  candidaturaId: string,
  agendamentoId?: string,
): string {
  if (e === "convite") {
    if (!agendamentoId) {
      throw new Error("convite exige agendamento_id para o dedupe_key");
    }
    return `${agendamentoId}:convite`;
  }
  return `${candidaturaId}:${e}`;
}

/** Corpo JSON do Resend. Anexo `.ics` SÓ quando há `icsBase64` (convite). Sem chave da API. */
export function construirCorpoResend(args: {
  para: string;
  subject: string;
  html: string;
  icsBase64?: string;
}): Record<string, unknown> {
  const corpo: Record<string, unknown> = {
    from: FROM,
    to: args.para,
    reply_to: REPLY_TO,
    subject: args.subject,
    html: args.html,
  };
  if (args.icsBase64) {
    corpo.attachments = [
      { filename: "entrevista-beautysmile.ics", content: args.icsBase64 },
    ];
  }
  return corpo;
}

/**
 * Backoff exponencial capado da varredura de retry (P41 / RECON-03).
 *
 * Curva ≈15m → 1h → 6h → 24h, indexada pela NOVA contagem de tentativas, com
 * CAP de 5: a partir de `novasTentativas >= 5` devolve `null` — sem mais retries,
 * a linha permanece `falhou` (evita loop de custo/DoS de e-mail, T-41-02).
 *
 * @param novasTentativas quantas tentativas a linha terá APÓS esta (1 = 1ª falha).
 * @returns ISO da próxima tentativa, ou `null` quando esgotou o cap.
 */
const BACKOFF_MS = [
  15 * 60_000, //     após tentativa 1 → +15min
  60 * 60_000, //     após tentativa 2 → +1h
  6 * 60 * 60_000, // após tentativa 3 → +6h
  24 * 60 * 60_000, // após tentativa 4 → +24h
];

export function computeProximaTentativa(novasTentativas: number): string | null {
  if (novasTentativas >= 5) return null; // cap: sem mais retries (fica falhou)
  const ms = BACKOFF_MS[novasTentativas - 1] ?? BACKOFF_MS.at(-1)!;
  return new Date(Date.now() + ms).toISOString();
}

/** Allowlist de chaves de log — só ids/evento/status/counts. Nunca email/nome/html/segredo. */
const CHAVES_LOG_OK = new Set([
  "evento",
  "status",
  "candidatura_id",
  "agendamento_id",
  "dedupe_key",
  "skipped",
  "provider_message_id",
  "resend_status",
  "count",
]);

export function logSeguro(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (CHAVES_LOG_OK.has(k)) out[k] = v;
  }
  return out;
}
