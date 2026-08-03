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
