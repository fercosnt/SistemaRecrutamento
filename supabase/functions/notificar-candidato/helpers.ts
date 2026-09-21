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
 * que é at-most-once — e aí o e-mail some sem rastro.
 *
 * O 6º — `cognitivo_liberado` — é da Phase 48 / Plan 48-10 (D-22): o aviso ao candidato de
 * que o RH liberou a avaliação cognitiva, disparado por `trg_notif_cognitivo_liberado`
 * (migration 20260921000010). É evento de CANDIDATO e continua elegível à varredura de retry.
 *
 * O CHECK vivo carrega, depois da 20260921000010, NOVE valores: os 6 deste tipo e três que
 * NÃO pertencem a ele — `revisao_solicitada` e `candidatura_encerrada_a_pedido` (eventos de
 * RH, consumidos pela EF `notificar-rh`) e `divulgacao_vagas` (marketing, reservado, sem
 * emissor).
 */
export type EventoLedger =
  | "confirmacao"
  | "avanco"
  | "convite"
  | "decisao"
  | "revisao_respondida"
  | "cognitivo_liberado";

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
  // 6º evento (48-10 / D-22). O ledger nomeia o gatilho (a liberação), o template nomeia a
  // mensagem (a avaliação cognitiva liberada) — a mesma convenção dos 4 do M7.
  cognitivo_liberado: "avaliacao_cognitiva_liberada",
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
 * dedupe_key = 1 e-mail por OCORRÊNCIA do evento. A chave nomeia o que o e-mail anuncia:
 *
 *   - `convite`            → `{agendamento}:convite[:{data_hora}]` (re-convite = novo agendamento;
 *                            reagendamento = nova data, 2026-09-06)
 *   - `decisao` / `avanco` → `{candidatura}:{evento}:{historico_id}` (48-08) — uma chave por
 *                            TRANSIÇÃO, porque `trg_notif_transicao` é AFTER INSERT em
 *                            `historico_candidatura` e `NEW.id` é a transição
 *   - `revisao_respondida` → `{candidatura}:revisao_respondida:{ciclo}` (48-08) — uma chave
 *                            por CICLO de revisão; `ciclo` = epoch do `revisao_solicitada_em`
 *   - `cognitivo_liberado` → `{candidatura}:cognitivo_liberado:{ciclo}` (48-10) — uma chave
 *                            por LIBERAÇÃO; `ciclo` = epoch do `liberado_em`. Re-liberar
 *                            depois de revogar recarimba `liberado_em` (`liberar_cognitivo`,
 *                            20260826000008) e é aviso novo; a mesma liberação entregue duas
 *                            vezes colapsa
 *   - demais / sem versão  → `{candidatura}:{evento}` (a chave LEGADA)
 *
 * ⚠ A premissa antiga — «no máximo UMA decisão e UMA revisão por candidatura, logo a chave
 * por candidatura nunca bloqueia um e-mail legítimo» — era FALSA para a decisão e deixou de
 * valer para a revisão:
 *   · a decisão: `RegistrarDecisaoForm` + o upsert de `registrar_decisao` já permitiam
 *     redecidir pela UI, e a rejeição na triagem é outra decisão sobre a mesma candidatura.
 *     O log da EF de 2026-09-20 16:03:25 UTC registra a rejeição da Etapa 9 DESPACHADA e
 *     descartada como `skipped:"duplicate"` na chave `…:decisao` ocupada pela aprovação
 *     (Defeitos 18 e 20 — o mesmo mecanismo);
 *   · a revisão: a reabertura (D-01, plano 48-11) permite um segundo ciclo de revisão.
 *
 * Sem `versao`, a chave LEGADA — de propósito: a EF é deployada ANTES da migration que passa
 * o campo (Pitfall 7), e nesse intervalo o trigger ainda manda o corpo antigo. As linhas
 * antigas `{candidatura}:decisao` do ledger não colidem com as novas (sufixo).
 *
 * `confirmacao` nunca é versionada: uma candidatura tem uma confirmação.
 */
export function montarDedupeKey(
  e: EventoLedger,
  candidaturaId: string,
  agendamentoId?: string,
  versao?: string,
): string {
  if (e === "convite") {
    if (!agendamentoId) {
      throw new Error("convite exige agendamento_id para o dedupe_key");
    }
    // 2026-09-06 (E4 do guia): um REAGENDAMENTO reenvia o convite do MESMO agendamento com
    // outra data. A chave sem versão já foi consumida pelo convite original e engoliria o
    // reenvio em silêncio (a candidata ficaria com a data antiga na agenda). A `data_hora`
    // nova discrimina — reagendar duas vezes para a MESMA data continua dedupado.
    return versao ? `${agendamentoId}:convite:${versao}` : `${agendamentoId}:convite`;
  }
  if (versao && EVENTOS_VERSIONADOS.has(e)) {
    return `${candidaturaId}:${e}:${versao}`;
  }
  return `${candidaturaId}:${e}`;
}

/** Eventos de candidatura cuja chave carrega um discriminador (48-08). */
const EVENTOS_VERSIONADOS: ReadonlySet<EventoLedger> = new Set<EventoLedger>([
  "decisao",
  "avanco",
  "revisao_respondida",
  "cognitivo_liberado",
]);

/**
 * Eventos cujo discriminador é o `ciclo` do corpo (epoch em texto, `RE_CICLO`): a resposta à
 * revisão (48-08) e a liberação cognitiva (48-10). O `ciclo` é ignorado nos demais eventos.
 */
const EVENTOS_POR_CICLO: ReadonlySet<EventoLedger> = new Set<EventoLedger>([
  "revisao_respondida",
  "cognitivo_liberado",
]);

/** `true` quando o evento usa o `ciclo` do corpo como discriminador da chave. */
export function eventoPorCiclo(evento: EventoLedger): boolean {
  return EVENTOS_POR_CICLO.has(evento);
}

/** Eventos cujo discriminador é o id de uma linha de `historico_candidatura`. */
const EVENTOS_POR_HISTORICO: ReadonlySet<EventoLedger> = new Set<EventoLedger>([
  "decisao",
  "avanco",
]);

/** Forma de uuid — a MESMA regex de `executar-direito-titular/index.ts` (`RE_UUID`). */
export const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Inverso de `montarDedupeKey` para o branch RETRY (48-08): a varredura `pg_cron` reenvia só
 * `{retry_id, evento, candidatura_id, agendamento_id}` (`20260805000007:768-777`), então o
 * `historico_id` da decisão que a linha anuncia é lido da própria `dedupe_key` da linha.
 *
 * Devolve o 3º segmento SÓ quando o evento é `decisao`/`avanco` e o segmento tem forma de
 * uuid; em qualquer outro caso (chave legada, outro evento, segmento malformado) `undefined`
 * — e o chamador cai no comportamento legado (desfecho por `etapa_atual`).
 */
export function extrairVersaoDaChave(
  dedupeKey: string,
  evento: EventoLedger,
): string | undefined {
  if (!EVENTOS_POR_HISTORICO.has(evento)) return undefined;
  const partes = dedupeKey.split(":");
  if (partes.length !== 3 || partes[1] !== evento) return undefined;
  return RE_UUID.test(partes[2]) ? partes[2] : undefined;
}

/**
 * Forma do `ciclo` (48-08): só dígitos, até 12 — o epoch em segundos que o trigger manda
 * (`extract(epoch from revisao_solicitada_em)::bigint::text`). 12 dígitos cobrem o epoch até
 * o ano 33658; nada além disso é um instante plausível, e nada fora de `\d` pode entrar numa
 * chave de dedupe. Espelhado em `notificar-rh/helpers.ts` (`RE_CICLO`).
 */
export const RE_CICLO = /^\d{1,12}$/;

/** `true` quando o evento usa `historico_id` como discriminador (decisao/avanco). */
export function eventoPorHistorico(evento: EventoLedger): boolean {
  return EVENTOS_POR_HISTORICO.has(evento);
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
  // 48-08: o id da transição (linha de historico_candidatura) — id, não PII.
  "historico_id",
  // 48-08: o instante (epoch) do pedido de revisão — identidade do ciclo, não PII.
  "ciclo",
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
