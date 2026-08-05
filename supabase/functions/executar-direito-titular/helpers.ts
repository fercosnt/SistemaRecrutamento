/**
 * Helpers puros da Edge Function `executar-direito-titular` (Phase 45 / 45-03).
 *
 * Molde: `supabase/functions/notificar-rh/helpers.ts:132-166` — a ESTRUTURA
 * (allowlist local + `refCurta`), nunca o CONTEÚDO.
 *
 * ── POR QUE A ALLOWLIST DE LOG É ESCRITA DO ZERO, E NÃO IMPORTADA DA VIZINHA ──
 * `notificar-rh` já enfrentou esta decisão e a registrou: importar a allowlist de
 * uma EF irmã faz uma mudança lá alterar em silêncio o log daqui, e as chaves
 * simplesmente não são as mesmas. Nesta EF a diferença é ainda mais dura:
 *
 *  · `candidatura_ref` e `destinatarios` (chaves legítimas lá) não existem aqui;
 *  · `dedupe_key` é permitida em `notificar-candidato` e **proibida** aqui — ela
 *    embute ids completos. E sob D-45-12 (saída R1) o recibo desta fase **nem
 *    chega a ter linha de ledger**, então não há `dedupe_key` alguma a logar;
 *  · `solicitacao_id` **nunca** entra: use `pedido_ref: refCurta(id)`.
 *
 * ── O QUE ESTA EF NUNCA PODE LOGAR (Invariante 12 da 45-UI-SPEC) ─────────────
 * Nome, e-mail, CPF, `candidato_id`, `solicitacao_id` completos, caminho de
 * Storage, URL, corpo do request, payload, SQLSTATE ou mensagem crua do banco. O
 * modo de falha desta fase é irreversível e sem rede (D-45-10, PITR desligado):
 * um log com caminho de Storage seria a única cópia sobrevivente do que foi
 * destruído, no lugar errado.
 *
 * @module supabase/functions/executar-direito-titular/helpers
 * @see supabase/functions/notificar-rh/helpers.ts (a ESTRUTURA clonada)
 * @see supabase/migrations/20260805000001_p45_pedido_exclusao.sql (o CHECK de `causa`)
 */

/** Prefixo curto de um id — o ÚNICO formato de id admitido em log desta EF. */
export function refCurta(id: string): string {
  return id.slice(0, 8);
}

/**
 * Allowlist de chaves de log DESTA Edge Function. Escrita do zero — ver o docblock.
 *
 * Toda chave aqui é um FATO SOBRE A OPERAÇÃO, nunca sobre a pessoa: qual ação, como
 * terminou, e um prefixo de 8 caracteres que permite correlacionar duas linhas de
 * log sem identificar ninguém.
 */
const CHAVES_LOG_OK_EXCLUSAO = new Set([
  "acao",
  "resultado",
  "pedido_ref",
  "candidato_ref",
  "erro_classe",
  "passo",
]);

/** Filtra um objeto de log pela allowlist desta EF. O que não está na lista some. */
export function logSeguroExclusao(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (CHAVES_LOG_OK_EXCLUSAO.has(k)) out[k] = v;
  }
  return out;
}

/** Os quatro passos do motor. Os três primeiros só ganham corpo no 45-10. */
export type PassoMotor = "storage" | "postgres" | "auth" | "recibo";

/**
 * Traduz o passo que falhou para o vocabulário FECHADO de
 * `solicitacoes_dados.causa` (CHECK de sete valores, `20260805000001` §4).
 *
 * ⚠ FALLBACK TOTAL, e ele não é zelo: esta função é chamada no `catch` que registra
 * uma falha. Devolver um valor fora do CHECK faria o `UPDATE` que grava a causa
 * abortar — e a linha ficaria `pendente` com `causa` NULA, indistinguível de uma
 * marca de sucesso que falhou. Perder-se-ia justamente a informação de EM QUAL
 * SISTEMA a mutação não-atômica parou, que é a única pergunta que importa às 3 da
 * manhã sobre um arquivo que não tem cópia de reserva.
 *
 * O fallback é `falha_postgres` — o passo do meio — porque afirmar `falha_storage`
 * por engano diria que o currículo pode ter sido destruído quando ninguém sabe, e
 * afirmar `falha_auth` diria que os dois primeiros passos já terminaram.
 */
export function causaDaFalha(passo: string): string {
  switch (passo) {
    case "storage":
      return "falha_storage";
    case "auth":
      return "falha_auth";
    case "recibo":
      return "falha_recibo";
    case "postgres":
    default:
      return "falha_postgres";
  }
}
