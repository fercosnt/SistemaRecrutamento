/**
 * `notificar-rh/helpers.ts` — funções PURAS da EF, extraídas para serem
 * unit-testáveis SEM `Deno.serve` (mesmo padrão de `notificar-candidato/helpers.ts` e
 * de `cost-alerter/messages.ts`: importar `index.ts` num teste dispararia o servidor).
 * O teste importa este módulo; a EF também.
 *
 * Zero rede, zero segredo. `construirCorpoResendRh` NUNCA carrega a chave da API.
 *
 * Phase 42 / Plan 42-07 — REVISAO-01: o pedido de revisão Art. 20 do candidato passa a
 * CHEGAR ao RH. Até aqui `solicitar_revisao_decisao` gravava `revisao_solicitada_em` e o
 * processo terminava — um timestamp que ninguém lia.
 */
import { FROM, REPLY_TO } from "../_shared/email-config.ts";
import { escapeHtml, layoutBase } from "../_shared/email-templates.ts";

/**
 * Host do app do RH. `recruta.beautysmile.com.br` é o host vivo e verificado — é o
 * mesmo do `LOGO_URL` dos templates em produção (`email-templates.ts:30`) e o domínio
 * de envio verificado no Resend desde a P36.
 *
 * Override por env `APP_BASE_URL` para ambiente de preview; a validação em
 * `montarUrlFila` garante que uma env malformada cai neste default em vez de produzir
 * um link quebrado — ou hostil — num e-mail interno.
 */
export const APP_BASE_URL_PADRAO = "https://recruta.beautysmile.com.br" as const;

/** Rótulo do sink de teste desta EF. NÃO pertence à união `EventoNotificacao`. */
export const LABEL_SINK_RH = "revisao_solicitada_rh" as const;

/** Valor gravado em `notificacoes_enviadas.evento` para o nudge ao RH. */
export const EVENTO_LEDGER_RH = "revisao_solicitada" as const;

/** Valor gravado em `notificacoes_enviadas.template`. */
export const TEMPLATE_LEDGER_RH = "revisao_solicitada_rh" as const;

/**
 * `dedupe_key` do nudge ao RH — `{candidatura_id}:revisao_solicitada:{user_id}`.
 *
 * ⚠ A chave é **POR DESTINATÁRIO**, e isso é load-bearing: `notificacoes_enviadas`
 * tem `UNIQUE (dedupe_key)` e a EF reivindica antes de enviar (claim-before-send). Uma
 * chave só por candidatura faria o PRIMEIRO RH consumir o claim e todos os demais
 * receberem `skipped:duplicate` — silenciosamente, sem erro em lugar nenhum. Com 4
 * administradores + 1 recrutador vivos, 4 de 5 pessoas nunca seriam notificadas.
 *
 * O `user_id` fica no FIM da chave de propósito: o gate ao vivo do checkpoint verifica
 * que cada linha do ledger termina no `user_id` do seu destinatário.
 */
export function montarDedupeKeyRh(candidaturaId: string, userId: string): string {
  return `${candidaturaId}:${EVENTO_LEDGER_RH}:${userId}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 45 / Plan 45-09 — ERASE-05 · D-45-06
// O SEGUNDO evento desta EF: a candidatura encerrada a pedido do candidato.
//
// ⚠ O vocabulário desta EF passa de 1 para 2 valores, e `_shared/email-config.ts`
// NÃO é tocado: o docblock daquele arquivo (`:40-51`) proíbe acrescentar rótulo de
// RH à união `EventoNotificacao`, porque cada valor ali obriga uma entrada em
// SUBJECTS, CORPOS e PREHEADERS — e um template órfão é e-mail que nunca será
// enviado. O sink de teste usa `resolverDestinatarioComLabel`, que existe
// exatamente para não inflar aquela união.
//
// ⚠ UM SÓ EVENTO COBRE OS DOIS CAMINHOS: a retirada avulsa de UMA candidatura
// (`retirar_candidatura`) e o encerramento em lote disparado pelo pedido de
// exclusão (`registrar_pedido_exclusao`). Os dois escrevem a MESMA coluna
// `candidaturas.encerrada_a_pedido_em` e produzem o MESMO efeito no funil. Dois
// eventos para o mesmo efeito seriam duas entradas de vocabulário fechado, dois
// templates e duas oportunidades de o preheader não ramificar — literalmente o
// defeito W-01 que a Phase 42 encontrou.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rótulo do sink de teste do encerramento. NÃO pertence à união `EventoNotificacao`.
 *
 * Só `[a-z_]` de propósito: `resolverDestinatarioComLabel` sanitiza o rótulo para
 * essa classe, então qualquer dígito ou hífen aqui sumiria em silêncio e dois
 * eventos poderiam colidir no mesmo endereço de sink.
 */
export const LABEL_SINK_RH_ENCERRAMENTO = "candidatura_encerrada_rh" as const;

/**
 * Valor gravado em `notificacoes_enviadas.evento`.
 *
 * ⚠ FECHADO EM TRÊS SÍTIOS, e os três andam na MESMA entrega (D-45-08):
 *   1. esta constante;
 *   2. a CHECK `notificacoes_enviadas_evento_check` (8 valores desde a migration
 *      `20260805000007`);
 *   3. a linha de `classe_evento_notificacao` — cujo trigger BEFORE INSERT é
 *      FAIL-CLOSED para classe desconhecida: um evento no CHECK sem linha de
 *      classe é recusado com `P0003` em TODA reivindicação, e o envio vira no-op
 *      silencioso.
 */
export const EVENTO_LEDGER_RH_ENCERRAMENTO = "candidatura_encerrada_a_pedido" as const;

/** Valor gravado em `notificacoes_enviadas.template`. */
export const TEMPLATE_LEDGER_RH_ENCERRAMENTO = "candidatura_encerrada_a_pedido_rh" as const;

/** O vocabulário FECHADO desta EF — de 1 para 2 valores. */
export const EVENTOS_RH_VALIDOS = [
  EVENTO_LEDGER_RH,
  EVENTO_LEDGER_RH_ENCERRAMENTO,
] as const;

export type EventoRh = typeof EVENTOS_RH_VALIDOS[number];

/** Narrowing do payload contra o vocabulário fechado. */
export function ehEventoRh(v: unknown): v is EventoRh {
  return typeof v === "string" &&
    (EVENTOS_RH_VALIDOS as readonly string[]).includes(v);
}

/**
 * `dedupe_key` do aviso de encerramento — `{candidatura_id}:{evento}:{user_id}`.
 *
 * ⚠ POR DESTINATÁRIO, pela mesma razão medida no 42-07 e pelo mesmo mecanismo:
 * `notificacoes_enviadas` tem `UNIQUE (dedupe_key)` e a EF reivindica antes de
 * enviar. Uma chave só por candidatura faria o PRIMEIRO RH consumir o claim e
 * todos os demais receberem `skipped:duplicate` — silenciosamente, sem erro em
 * lugar nenhum. Com 4 administradores + 1 recrutador vivos, 4 de 5 pessoas nunca
 * seriam avisadas de que o processo daquela pessoa acabou.
 *
 * O `evento` no meio da chave é o que impede colisão com o aviso irmão sobre a
 * MESMA candidatura e o MESMO destinatário — sem ele o segundo aviso sumiria.
 */
export function montarDedupeKeyRhEncerramento(
  candidaturaId: string,
  userId: string,
): string {
  return `${candidaturaId}:${EVENTO_LEDGER_RH_ENCERRAMENTO}:${userId}`;
}

/**
 * Assunto interno em pt-BR. Nomeia o pedido e a VAGA, nunca o candidato — ver a
 * decisão de privacidade em `corpoRevisaoSolicitada`.
 *
 * CR/LF são neutralizados: `tituloVaga` é texto digitado por humano no CRUD de vagas,
 * e um `\r\n` num campo de assunto é a forma clássica de injeção de header de e-mail.
 */
export function assuntoRevisaoSolicitada(tituloVaga: string): string {
  const titulo = tituloVaga.replace(/[\r\n]+/g, " ").trim();
  return `[Beauty Smile] Pedido de revisão de decisão — ${titulo}`;
}

/**
 * Assunto do aviso de encerramento. Copy verbatim da 45-UI-SPEC (§E-mail 2).
 *
 * A neutralização de CR/LF é REPLICADA de `assuntoRevisaoSolicitada`, e não
 * herdada por acaso: injeção de header de e-mail é a razão de ela existir, e
 * `tituloVaga` continua sendo texto digitado por humano no CRUD de vagas.
 *
 * ⚠ Ele nomeia a VAGA e um CONCEITO ("do candidato"), nunca uma PESSOA. O teste
 * irmão do assunto vivo assere `!/candidat/i`; aqui esse mecanismo é impossível
 * porque a copy aprovada contém a palavra — a propriedade preservada, e aferida,
 * é a ausência de qualquer identificador do titular.
 */
export function assuntoCandidaturaEncerradaAPedido(tituloVaga: string): string {
  const titulo = tituloVaga.replace(/[\r\n]+/g, " ").trim();
  return `[Beauty Smile] Candidatura encerrada a pedido do candidato — ${titulo}`;
}

/**
 * Monta a URL absoluta da fila `/rh/revisoes`.
 *
 * FAIL-SAFE (idioma de `resolverModo`): base ausente, vazia, não-URL, ou com esquema
 * diferente de `https:` cai no default canônico. Um link malformado num e-mail interno
 * é ruído; um link com esquema `javascript:` é superfície de ataque.
 */
export function montarUrlFila(baseBruta: string = APP_BASE_URL_PADRAO): string {
  let base = APP_BASE_URL_PADRAO as string;
  try {
    const u = new URL(baseBruta.trim());
    if (u.protocol === "https:") base = u.origin;
  } catch {
    // base malformada — mantém o default (nunca lança: o e-mail vale mais que o link)
  }
  return `${base.replace(/\/+$/, "")}/rh/revisoes`;
}

/**
 * Monta a URL absoluta da lista de candidatos DAQUELA vaga (`/rh/vagas/:id/candidatos`).
 *
 * Mesmo FAIL-SAFE de `montarUrlFila`, e pela mesma razão: base ausente, vazia,
 * não-URL ou com esquema diferente de `https:` cai no default canônico. Um link
 * malformado num e-mail interno é ruído; um link com esquema `javascript:` é
 * superfície de ataque.
 *
 * ⚠ O destino é a lista da VAGA, e não uma tela do candidato: o aviso existe para
 * que ninguém agende ou avalie uma candidatura encerrada, e quem precisa ver isso
 * vê na lista da vaga. `encodeURIComponent` no id porque ele entra no CAMINHO da
 * URL — hoje é um uuid vindo do próprio banco, mas um id inesperado não pode
 * inventar segmento de rota.
 */
export function montarUrlListaVaga(
  vagaId: string,
  baseBruta: string = APP_BASE_URL_PADRAO,
): string {
  let base = APP_BASE_URL_PADRAO as string;
  try {
    const u = new URL(baseBruta.trim());
    if (u.protocol === "https:") base = u.origin;
  } catch {
    // base malformada — mantém o default (nunca lança: o e-mail vale mais que o link)
  }
  return `${base.replace(/\/+$/, "")}/rh/vagas/${encodeURIComponent(vagaId)}/candidatos`;
}

/**
 * Corpo HTML do e-mail ao RH.
 *
 * DECISÃO REGISTRADA DE PRIVACIDADE (T-42-24) — o corpo **não** carrega nome de
 * candidato nem `candidatura_id`, e a assinatura não aceita esses campos:
 *
 *   (a) em modo `teste` o corpo INTEIRO viaja para `resend.dev`, um domínio de
 *       terceiro sobre o qual a Beauty Smile não tem contrato de tratamento; e
 *   (b) o RH não precisa do nome no e-mail — ele o vê na FILA, que é a superfície
 *       durável e autenticada. O e-mail é um nudge, não um registro.
 *
 * O corpo diz que há um pedido de revisão na vaga X e leva para `/rh/revisoes`.
 * `escapeHtml` + `layoutBase` vêm de `_shared/email-templates.ts` (não reimplementar:
 * `escapeHtml` é o escape canônico do projeto).
 */
export function corpoRevisaoSolicitada(
  args: { tituloVaga: string; urlFila: string },
): string {
  const titulo = escapeHtml(args.tituloVaga);
  const url = escapeHtml(args.urlFila);
  return layoutBase({
    preheader: "Um pedido de revisão de decisão entrou na fila do RH.",
    conteudoHtml: `<p style="margin:0 0 16px;">Olá, equipe de RH,</p>
<p style="margin:0 0 16px;">Foi registrado um <strong>pedido de revisão de decisão</strong> referente à vaga <strong>${titulo}</strong>.</p>
<p style="margin:0 0 16px;">O pedido já está na fila de revisões, com os detalhes e o histórico da decisão. Ele deve ser respondido pela fila — não por resposta a este e-mail.</p>
<p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;padding:12px 24px;background:#00A9A5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Abrir a fila de revisões</a></p>
<p style="margin:0;font-size:14px;color:#6b7280;">Se o botão não funcionar, acesse: ${url}</p>`,
  });
}

/**
 * Corpo HTML do aviso ao RH de que uma candidatura foi encerrada a pedido.
 *
 * Copy verbatim da 45-UI-SPEC (§E-mail 2), molde de `corpoRevisaoSolicitada`.
 *
 * DUAS OMISSÕES DELIBERADAS, e a assinatura as impõe (Invariante 10 / T-42-24):
 *
 *   (a) NENHUM IDENTIFICADOR DO CANDIDATO — nem nome, nem e-mail, nem CPF, nem
 *       `candidato_id`/`candidatura_id`/`solicitacao_id`. Em modo `teste` o corpo
 *       INTEIRO viaja para `resend.dev`, domínio de terceiro sobre o qual a Beauty
 *       Smile não tem contrato de tratamento. O RH identifica a candidatura na
 *       LISTA DA VAGA, que é a superfície durável e autenticada.
 *
 *   (b) NENHUM MOTIVO ESPECÍFICO. O corpo diz que a candidatura foi encerrada a
 *       pedido; NUNCA que houve pedido de exclusão de dados. **Por que** uma pessoa
 *       exerceu um direito é dado SOBRE ela, e não cabe num corpo que sai do
 *       domínio. Por isso um só texto serve aos dois caminhos — o que não é
 *       coincidência de economia, é a consequência de não contar o motivo.
 *
 * `escapeHtml` + `layoutBase` vêm de `_shared/email-templates.ts` (não
 * reimplementar: `escapeHtml` é o escape canônico do projeto, e um segundo escape
 * é um segundo escape a auditar).
 */
export function corpoCandidaturaEncerradaAPedido(
  args: { tituloVaga: string; urlLista: string },
): string {
  const titulo = escapeHtml(args.tituloVaga);
  const url = escapeHtml(args.urlLista);
  return layoutBase({
    preheader: "Uma candidatura foi encerrada a pedido do candidato.",
    conteudoHtml: `<p style="margin:0 0 16px;">Olá, equipe de RH,</p>
<p style="margin:0 0 16px;">Uma candidatura da vaga <strong>${titulo}</strong> foi <strong>encerrada a pedido do próprio candidato</strong>, no exercício de um direito previsto na LGPD.</p>
<p style="margin:0 0 16px;">O processo não continua para essa pessoa. Não há nada a responder e nada a atender — este aviso existe para que ninguém agende ou avalie uma candidatura encerrada.</p>
<p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;padding:12px 24px;background:#00A9A5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Abrir a lista de candidatos da vaga</a></p>
<p style="margin:0;font-size:14px;color:#6b7280;">Se o botão não funcionar, acesse: ${url}</p>`,
  });
}

/**
 * Corpo JSON do Resend, no molde de `construirCorpoResend` (`notificar-candidato`).
 *
 * SEM anexo (o e-mail ao RH nunca carrega `.ics`) e SEM a chave da API — a chave vai
 * no header `Authorization`, montado no `index.ts`, e nunca neste objeto.
 */
export function construirCorpoResendRh(args: {
  para: string;
  subject: string;
  html: string;
}): Record<string, unknown> {
  return {
    from: FROM,
    to: args.para,
    reply_to: REPLY_TO,
    subject: args.subject,
    html: args.html,
  };
}

/** Prefixo curto de um id — o único formato de id admitido em log desta EF. */
export function refCurta(id: string): string {
  return id.slice(0, 8);
}

/**
 * Allowlist de chaves de log desta EF.
 *
 * POR QUE NÃO IMPORTAR `logSeguro` DE `notificar-candidato/helpers.ts`
 * Decidido por leitura: (a) a allowlist de lá NÃO tem as chaves que esta EF precisa
 * (`destinatarios`, `candidatura_ref`) e TEM chaves que esta EF não deve emitir; e
 * (b) `dedupe_key` é permitida lá e **proibida aqui** — a chave do RH embute o
 * `candidatura_id` COMPLETO e o `user_id` do destinatário, então logá-la reintroduziria
 * exatamente o que a allowlist existe para barrar. Um import cruzado entre EFs também
 * faria uma mudança na allowlist do candidato alterar em silêncio o log do RH.
 *
 * `candidatura_id` NÃO está na allowlist: usar `candidatura_ref: refCurta(id)`.
 */
const CHAVES_LOG_OK_RH = new Set([
  "evento",
  "status",
  "skipped",
  "destinatarios",
  "candidatura_ref",
  "resend_status",
  "count",
]);

export function logSeguroRh(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (CHAVES_LOG_OK_RH.has(k)) out[k] = v;
  }
  return out;
}
