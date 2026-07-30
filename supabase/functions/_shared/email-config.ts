/**
 * `_shared/email-config.ts` — contrato canônico de remetente, modo e destinatário.
 *
 * Fase 36 / Plan 36-01 — DELIV-01 (identidade de remetente verificada) +
 * DELIV-02 (falha explícita sem chave) + DELIV-03 (disciplina de endereço de teste).
 *
 * QUEM CONSOME: a P37 (ledger `notificacoes_enviadas`) e a P38 (Edge Function
 * `notificar-candidato`) **importam** daqui — nunca reimplementam esta resolução
 * espalhada em `if`s. Qualquer mudança de From/Reply-To/domínio acontece NESTE
 * arquivo e propaga para as duas fases.
 *
 * ZERO IMPORTS POR DESIGN: nenhum `zod`, nenhum `https://deno.land/std`, nenhum
 * `npm:`. Motivos: (a) as EFs consumidoras da P38 não precisam de entrada de
 * `import_map` no `config.toml`; (b) a suite Deno deste módulo roda sob
 * `deno test --allow-env --allow-read` **sem `--allow-net`** — nada aqui busca
 * rede em tempo de import. Não adicionar imports sem revisitar essas duas
 * consequências.
 */

/** Subdomínio de envio verificado no Resend — SPF/DKIM automáticos (DELIV-01). */
export const DOMINIO_ENVIO = 'rh.beautysmile.com.br' as const

/** Display name exibido na caixa de entrada do candidato. */
export const REMETENTE_NOME = 'Beauty Smile Recrutamento' as const

/** Endereço técnico de envio — local-part `nao-responda`, no subdomínio de envio. */
export const REMETENTE_EMAIL = `nao-responda@${DOMINIO_ENVIO}` as const

/** Header `from` pronto para a API do Resend. */
export const FROM = `${REMETENTE_NOME} <${REMETENTE_EMAIL}>` as const

/**
 * Caixa REAL do RH, no domínio ROOT (não no subdomínio de envio) — separa
 * envio de recepção: o candidato que responde cai numa caixa humana.
 */
export const REPLY_TO = 'rh@beautysmile.com.br' as const

/** Modo de operação do envio. Só `producao` alcança pessoas reais. */
export type ModoNotificacao = 'producao' | 'teste'

/** Os 4 eventos de notificação do M7 — usados como `+label` no endereço de teste. */
export type EventoNotificacao =
  | 'candidatura_recebida'
  | 'avaliacao_liberada'
  | 'convite_entrevista'
  | 'decisao_final'

/**
 * Resolve o modo a partir de `NOTIFICACOES_MODO`.
 *
 * FAIL-SAFE (DELIV-03): apenas a string exata `producao` (após `trim().toLowerCase()`)
 * habilita produção. Ausente, vazio ou malformado ⇒ `teste`, com `console.warn` quando
 * o valor foi fornecido e não é reconhecido. Espelha a guarda de env malformado de
 * `parseIntEnv()` em `ai-client.ts` (AI-07): valor ruim cai no default seguro com warn,
 * nunca propaga.
 *
 * O modo vem SOMENTE desta env explícita. Nunca deduzir de URL de projeto, env de
 * build ou nome de host: inferência implícita é o anti-pattern que faz um deploy de
 * staging enviar para candidato real.
 */
export function resolverModo(bruto = Deno.env.get('NOTIFICACOES_MODO')): ModoNotificacao {
  const v = (bruto ?? '').trim().toLowerCase()
  if (v === 'producao') return 'producao'
  if (v !== '' && v !== 'teste') {
    console.warn(`[email-config] NOTIFICACOES_MODO="${bruto}" inválido → 'teste' (fail-safe)`)
  }
  return 'teste'
}

export interface DestinatarioResolvido {
  /** Endereço que vai efetivamente no campo `to` do Resend. */
  para: string
  /** Endereço REAL do candidato — sempre preservado (ledger P37, auditoria). */
  destinatario_original: string
  modo: ModoNotificacao
  /** `true` quando o envio foi desviado para o endereço de teste. */
  redirecionado: boolean
}

/**
 * Decide para onde o e-mail realmente vai, com um rótulo ARBITRÁRIO de sink.
 *
 * Em `producao`, devolve o endereço real. Em `teste`, desvia para
 * `delivered+<label>@resend.dev` — a sandbox do provedor, que aceita e descarta.
 * Em AMBOS os modos `destinatario_original` carrega o e-mail real recebido: o
 * ledger da P37 audita quem *deveria* receber, não só quem recebeu.
 *
 * PII (T-36-01-02): o `+label` é sanitizado para `[a-z_]`. NUNCA usar
 * `candidatura_id`, e-mail ou nome de pessoa no label — esse endereço viaja para um
 * domínio de TERCEIRO. A sanitização também protege o header: um label com caractere
 * inválido quebraria o `to`.
 *
 * POR QUE ESTA GENERALIZAÇÃO EXISTE (Phase 42 / Plan 42-07 · REVISAO-01)
 * O rótulo do sink de teste é conceito de **destino**, não de vocabulário de evento de
 * candidato. A EF `notificar-rh` precisa do rótulo `revisao_solicitada_rh`, que NÃO
 * pertence — nem deve pertencer — à união `EventoNotificacao`: adicioná-lo àquela união
 * exigiria entradas correspondentes nos três `Record<EventoNotificacao, …>` de template
 * de candidato (`SUBJECTS`/`CORPOS`/`PREHEADERS` em `email-templates.ts`), poluindo um
 * vocabulário que é fechado por outra razão. `resolverDestinatario` delega para cá com
 * `evento` como rótulo — zero mudança de comportamento para os chamadores existentes.
 */
export function resolverDestinatarioComLabel(
  emailReal: string,
  label: string,
  modo: ModoNotificacao = resolverModo(),
): DestinatarioResolvido {
  if (modo === 'producao') {
    return { para: emailReal, destinatario_original: emailReal, modo, redirecionado: false }
  }
  const rotulo = label.replace(/[^a-z_]/g, '')
  return {
    para: `delivered+${rotulo}@resend.dev`,
    destinatario_original: emailReal,
    modo,
    redirecionado: true,
  }
}

/**
 * Resolução de destinatário para os eventos de CANDIDATO — o rótulo do sink é o
 * próprio nome do evento. Delega para `resolverDestinatarioComLabel`; a assinatura,
 * o tipo estreito de `evento` e os endereços produzidos permanecem idênticos aos da
 * P36/P38 (pinados pelos casos 1-9 de `__tests__/email-config.test.ts`).
 */
export function resolverDestinatario(
  emailReal: string,
  evento: EventoNotificacao,
  modo: ModoNotificacao = resolverModo(),
): DestinatarioResolvido {
  return resolverDestinatarioComLabel(emailReal, evento, modo)
}

/**
 * Exige a chave da API em `producao` (DELIV-02).
 *
 * Sem chave em produção, falha AQUI com mensagem acionável — em vez de deixar o
 * provedor devolver um `401` opaco depois de o disparo já ter sido contabilizado.
 * Em `teste`, a ausência é tolerada (retorna string vazia) para o CI rodar sem
 * segredo vivo.
 *
 * A mensagem cita apenas os identificadores (`RESEND_API_KEY` / segredo de Vault
 * `resend_api_key`) — o valor da chave NUNCA é interpolado (T-36-01-04).
 */
export function exigirChaveApi(chave: string | undefined, modo: ModoNotificacao): string {
  if (modo === 'producao' && !chave) {
    throw new Error(
      '[email-config] modo=producao sem RESEND_API_KEY — segredo não provisionado ' +
        "(Vault 'resend_api_key'). Envio abortado.",
    )
  }
  return chave ?? ''
}

/**
 * Hard-fail non-prod (P41 / DELIV-03).
 *
 * Em modo `teste`, ABORTA o envio se o destinatário efetivo não for um sink
 * `*@resend.dev` — nenhum candidato real pode receber um e-mail de um run de teste
 * (T-41-01). Em `producao` o guard é no-op (produção alcança endereços reais por
 * design). Chamado na EF logo antes do envio ao Resend.
 *
 * SEGURANÇA (V7 / T-41-03): a mensagem NUNCA interpola o destinatário — em teste o
 * `paraEfetivo` já é o sink produzido por `resolverDestinatario`, não o e-mail real;
 * mesmo assim o valor não viaja para o log estruturado (mirror `exigirChaveApi`).
 */
export function exigirSinkTeste(paraEfetivo: string, modo: ModoNotificacao): void {
  if (modo === 'teste' && !/@resend\.dev$/i.test(paraEfetivo)) {
    throw new Error(
      '[email-config] modo=teste mas destinatário não é sink *@resend.dev — envio abortado (DELIV-03).',
    )
  }
}
