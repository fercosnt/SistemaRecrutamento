/**
 * `notificar-candidato/helpers.ts` — funções PURAS da EF, extraídas para serem
 * unit-testáveis SEM `Deno.serve` (mesmo padrão de `cost-alerter/messages.ts`: importar
 * `index.ts` num teste dispararia o servidor). O teste importa este módulo; a EF também.
 *
 * Zero rede, zero segredo. `construirCorpoResend` NUNCA carrega a chave da API.
 */
import { FROM, REPLY_TO, type EventoNotificacao } from "../_shared/email-config.ts";

/**
 * Vocabulário do ledger (CHECK vivo `evento IN (...)`), = o que os triggers enviam.
 *
 * Os 4 primeiros são do M7 (triggers de funil, P39). O 5º — `revisao_respondida` — é da
 * Phase 42 / Plan 42-08 (REVISAO-04): o aviso ao candidato de que a solicitação de revisão
 * do Art. 20 foi respondida, disparado por `trg_notif_revisao_respondida`.
 *
 * ⚠ ESTE TIPO E O CHECK `notificacoes_enviadas_evento_check` SÃO A MESMA VERDADE ESCRITA
 * DUAS VEZES, e têm de andar na MESMA entrega (D-P42-14): o valor aqui sem o CHECK produz
 * `23514` no claim; o CHECK sem o valor aqui produz `400 VALIDATION` sobre um `net.http_post`
 * que é at-most-once — e aí o e-mail some sem rastro. O CHECK vivo carrega hoje SEIS valores:
 * os 4 do M7, `revisao_solicitada` (evento de RH, consumido pela EF `notificar-rh` — NÃO
 * pertence a este tipo) e `revisao_respondida`.
 */
export type EventoLedger =
  | "confirmacao"
  | "avanco"
  | "convite"
  | "decisao"
  | "revisao_respondida";

/** Mapa explícito ledger → email-config (ambas as direções auditáveis num literal). */
export const EVENTO_MAP: Record<EventoLedger, EventoNotificacao> = {
  confirmacao: "candidatura_recebida",
  avanco: "avaliacao_liberada",
  convite: "convite_entrevista",
  decisao: "decisao_final",
  // 5º evento (42-08 / REVISAO-04). Único par em que o nome do ledger e o nome do template
  // COINCIDEM — os 4 do M7 divergem por herança (o ledger nomeia o gatilho, o template nomeia
  // a mensagem). Manter a identidade aqui é deliberado: não há gatilho distinto do conteúdo.
  revisao_respondida: "revisao_respondida",
};

/**
 * Vocabulário aceito pela validação de payload da EF — DERIVADO do mapa, nunca autoral.
 *
 * Antes (P38–P41) isto era um `new Set([...])` escrito à mão em `index.ts`. Como o tipo é
 * `ReadonlySet<string>`, o compilador NUNCA conferiu que a lista batia com `EVENTO_MAP`:
 * um evento esquecido aqui fazia a EF responder `400 VALIDATION` a um `net.http_post`, que é
 * **at-most-once** — a rejeição não volta ao banco, não vira exceção e não vira linha no
 * ledger. O e-mail some sem rastro. Era o pior dos sítios de registro do vocabulário.
 *
 * O tipo DECLARADO segue `ReadonlySet<string>` de propósito: o call site em `index.ts` testa
 * uma string crua vinda do corpo JSON (`raw.evento`), e estreitar para `ReadonlySet<EventoLedger>`
 * quebraria a compilação lá. O que mudou é o VALOR: adicionar um evento a `EVENTO_MAP` passa a
 * registrá-lo aqui automaticamente, então o sítio deixa de existir como ponto de drift.
 * Paridade pinada por `__tests__/vocabulario-eventos.test.ts` (D-P42-14).
 */
export const EVENTOS_VALIDOS: ReadonlySet<string> = new Set(Object.keys(EVENTO_MAP));

export function mapearEvento(e: EventoLedger): EventoNotificacao {
  return EVENTO_MAP[e];
}

/**
 * dedupe_key = 1 e-mail por evento por candidatura. Exceção: o CONVITE usa o
 * agendamento_id, para permitir re-convite legítimo (novo agendamento ⇒ nova chave).
 *
 * `revisao_respondida` (42-08) NÃO GANHA RAMO, e isso é decisão verificada, não omissão.
 * O ramo `default` produz `{candidatura_id}:revisao_respondida`, e essa chave é correta
 * porque `decisao_final.candidatura_id` é UNIQUE (`20260607000003:39`) — há no máximo UMA
 * revisão por candidatura, logo no máximo um e-mail legítimo. O guard de idempotência do
 * RPC `responder_revisao_decisao` (plano 42-06, guard 4) recusa uma segunda resposta com
 * `22023`, então nem sequer existe transição que pudesse pedir uma segunda chave. As duas
 * decisões juntas fecham a questão: a chave nunca bloqueia um e-mail legítimo porque não
 * existe segundo e-mail legítimo. Um ramo novo aqui só poderia introduzir colisão.
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
