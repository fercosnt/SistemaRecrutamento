/**
 * Montagem do registro de `public.autorizacoes` — o payload do INSERT que
 * constitui a PROVA de consentimento (CONSENT-01, CONSENT-02, CONSENT-03,
 * CONSENT-05).
 *
 * Terceiro elo da cadeia:
 *
 *   consent-text.json  →  calcularHashConsentimento()  →  montarRegistroAutorizacoes()
 *                                                      →  INSERT em public.autorizacoes
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUE ISTO É UM MÓDULO SEPARADO, E NÃO UM OBJETO LITERAL DENTRO DA EF
 * ─────────────────────────────────────────────────────────────────────────────
 * A EF `cadastrar-candidato` usa `Deno.serve` direto e não tem a forma injetável
 * de `notificar-candidato` — não há como asserir o payload sem subir rede. Extrair
 * a montagem para uma função PURA é o caminho barato para uma asserção REAL sobre
 * o que o banco recebe, e refatorar a EF inteira está fora do escopo desta fase.
 * A alternativa — confiar que o literal está certo — é o que permitiu que
 * `?? true` sobrevivesse quatro meses.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⛔ ZERO COALESCÊNCIA `??` SOBRE AS FLAGS
 * ─────────────────────────────────────────────────────────────────────────────
 * Coalescer É o defeito. `input.autorizacoes.autorizacao_comunicacao ?? true`
 * (`cadastrar-candidato/index.ts:293`, até esta fase) é o segundo sítio que repunha
 * `true`: mesmo com o schema corrigido, um `undefined` que chegasse aqui viraria
 * consentimento. As flags entram JÁ VALIDADAS por `autorizacoesSchema` — que agora
 * as exige explicitamente, sem default — e atravessam sem tratamento. Um `??`
 * reintroduzido aqui reprova os testes 2 e 3 de `__tests__/autorizacoes-registro.test.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * O QUE NÃO É ESCRITO, E POR QUÊ
 * ─────────────────────────────────────────────────────────────────────────────
 * · `autorizacao_analise_video` — a chave NUNCA é emitida (BD-2 / CONSENT-05). A
 *   coleta parou; a coluna permanece com os valores históricos porque `DROP` é
 *   ação destrutiva e esta fase é zero-destrutiva por desenho. Emitir `false`
 *   também estaria errado: `false` é uma afirmação sobre uma pergunta que deixou
 *   de ser feita.
 * · `user_agent_aceite` — a coluna existe e continua sem ser escrita. Uma fase
 *   sobre consentimento honesto não é licença para começar a coletar um dado a
 *   mais de passagem.
 * · `created_at` / `updated_at` — `DEFAULT now()` no banco.
 *
 * @module supabase/functions/_shared/autorizacoes-registro
 */

/**
 * As três flags de consentimento, JÁ VALIDADAS por `autorizacoesSchema`. Note que
 * nenhuma é opcional: se um dia uma delas voltar a ser `boolean | undefined`, o
 * tipo obriga a decidir explicitamente o que fazer com o `undefined` em vez de
 * deixar um `??` decidir em silêncio.
 */
export interface FlagsAutorizacoes {
  autorizacao_uso_dados: true
  autorizacao_marketing_vagas: boolean
  autorizacao_retencao_curriculo: boolean
}

/**
 * Tudo o que a Edge Function sabe e a função pura não pode descobrir sozinha:
 * identidade, origem da requisição, e as duas versões + o hash que constituem a
 * prova.
 */
export interface ContextoRegistroAutorizacoes {
  candidatoId: string
  userId: string
  /** IP do requester, ou `null` quando nenhum header o revela. */
  ipAceite: string | null
  /** `POLICY_VERSION` — versão da Política de Privacidade. */
  policyVersion: string
  /** `CONSENT_TEXT_VERSION` — versão do TEXTO das autorizações. Eixo independente. */
  consentTextVersion: string
  /** SHA-256 hex do texto lido, calculado NO SERVIDOR (T-43-01). */
  consentTextHash: string
  /** ISO-8601 do instante do registro. */
  registradoEm: string
}

/**
 * O payload do INSERT em `public.autorizacoes`. Declarado como interface (e não
 * inferido) para que acrescentar uma coluna seja uma decisão visível no diff.
 */
export interface RegistroAutorizacoes {
  candidato_id: string
  user_id: string
  autorizacao_uso_dados: boolean
  /**
   * ⚠ A COLUNA MUDOU DE SIGNIFICADO SEM MUDAR DE FORMA (CONSENT-03).
   * Passa a designar APENAS o canal TRANSACIONAL — confirmação de candidatura,
   * mudança de etapa, convite de entrevista, resultado. Base legal: execução de
   * procedimentos preliminares ao contrato (LGPD, Art. 7º, V), **não**
   * consentimento. Por isso o valor é `true` de forma FIXA e EXPLÍCITA: ele
   * afirma um fato do sistema (o canal está ativo e não tem opt-out), não uma
   * escolha que a pessoa fez. Escrevê-lo aqui em vez de deixar o `DEFAULT` do
   * banco preencher é deliberado — o sítio que decide o valor gravado tem de ser
   * legível no código, que é a lição inteira desta fase.
   * A parte de MARKETING que esta coluna acumulava migrou para
   * `autorizacao_marketing_vagas`. Nenhum `UPDATE` em massa foi feito.
   */
  autorizacao_comunicacao: boolean
  /**
   * ⚠ BD-5 — NULL para toda a base histórica, e NULL é tratado como NÃO
   * AUTORIZADO. Depois desta fase, ZERO candidato já cadastrado está autorizado a
   * receber divulgação de vagas. Não é regressão, é a correção: ninguém nunca
   * consentiu marketing separadamente porque o consentimento separado não existia,
   * e herdar de `autorizacao_comunicacao` seria reconstruir consentimento por
   * inferência — exatamente o que o `.default(true)` fazia.
   */
  autorizacao_marketing_vagas: boolean
  autorizacao_retencao_curriculo: boolean
  ip_aceite: string | null
  policy_version: string
  consent_text_version: string
  consent_text_hash: string
  consent_registrado_em: string
}

/**
 * Valor FIXO do canal transacional. Ver o docblock de
 * `RegistroAutorizacoes.autorizacao_comunicacao`: é fato do sistema sob o
 * Art. 7º, V, não consentimento do titular — e é por isso que ele NÃO vem do
 * corpo da requisição e NÃO entra no hash.
 */
const CANAL_TRANSACIONAL_ATIVO = true

/**
 * Monta o payload do INSERT. PURA: mesma entrada, mesma saída, sem rede, sem
 * relógio, sem `Deno.env`.
 *
 * @param flags Flags JÁ VALIDADAS por `autorizacoesSchema`
 * @param ctx   Identidade, origem e as versões + hash que constituem a prova
 */
export function montarRegistroAutorizacoes(
  flags: FlagsAutorizacoes,
  ctx: ContextoRegistroAutorizacoes,
): RegistroAutorizacoes {
  return {
    candidato_id: ctx.candidatoId,
    user_id: ctx.userId,

    // As três flags atravessam SEM tratamento. Nenhum `??`, nenhum `||`,
    // nenhum `Boolean(...)`: um `false` que a pessoa escolheu chega ao banco
    // como `false`.
    autorizacao_uso_dados: flags.autorizacao_uso_dados,
    autorizacao_marketing_vagas: flags.autorizacao_marketing_vagas,
    autorizacao_retencao_curriculo: flags.autorizacao_retencao_curriculo,

    autorizacao_comunicacao: CANAL_TRANSACIONAL_ATIVO,

    ip_aceite: ctx.ipAceite,

    // As colunas de PROVA. Uma linha pós-enforcement com qualquer uma destas em
    // NULL seria indistinguível de uma linha histórica (SC#1).
    policy_version: ctx.policyVersion,
    consent_text_version: ctx.consentTextVersion,
    consent_text_hash: ctx.consentTextHash,
    consent_registrado_em: ctx.registradoEm,
  }
}
