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

// ═══════════════════════════════════════════════════════════════════════════
// Phase 45 / Plano 45-10 — a ENUMERAÇÃO do Storage
//
// ⚠ TRÊS CAPACIDADES SEM ANALOG NO REPOSITÓRIO INTEIRO (45-PATTERNS § No Analog
// Found), e é por isso que elas moram aqui como funções PURAS e testáveis:
//   · `storage.list()` tem ZERO ocorrências em todo o projeto;
//   · `storage.remove()` tem UM precedente (`cvUploadService.ts:224`) — client-side
//     sob RLS, um caminho por vez, e SEM conferir o array de retorno;
//   · `auth.admin.deleteUser` só existe como rollback compensatório, sempre com
//     `.catch()` que engole o erro.
// Código sem rede é escrito para ser exercitado sem rede.
// ═══════════════════════════════════════════════════════════════════════════

/** O bucket dos currículos. Único bucket com objetos em PROD (SONDA 3: 5 objetos). */
export const BUCKET_CURRICULOS = "curriculos";

/** Tamanho de página do `list()`. */
export const LIMITE_LISTAGEM = 100;

/** Teto do `remove()` por chamada — a Storage API apaga no máximo 1000 por vez. */
export const LIMITE_REMOCAO = 1000;

/**
 * Teto de páginas do laço de enumeração. Existe para que um `list()` que devolva
 * sempre a mesma página cheia (mock ruim, API mudada, offset ignorado) FALHE ALTO em
 * vez de girar para sempre dentro de uma Edge Function com timeout.
 */
const MAX_PAGINAS = 1000;

// deno-lint-ignore no-explicit-any
type ClienteStorage = any;

/**
 * Enumera TODOS os objetos sob o prefixo do titular, em laço PAGINADO.
 *
 * ⚠ A PAGINAÇÃO NÃO É OPCIONAL. Com 1 CV por candidatura o volume é trivial hoje,
 * mas o upload gera UUID novo a cada chamada e nunca sobrescreve
 * (`cvUploadService.ts:130-131`): um titular com re-submissões acumula objetos, e um
 * `list()` sem laço deixa PII para trás **em silêncio** — o pior modo de falha
 * possível num apagamento que depois se declara concluído.
 *
 * ⚠ ERRO DE LISTAGEM LANÇA, JAMAIS VIRA LISTA VAZIA. Uma lista vazia por engano
 * produziria um passo 1 que "completa com sucesso" sem apagar nada e um recibo
 * afirmando zero arquivos ao titular que tinha três.
 *
 * Linhas de PASTA (o marcador que o Storage devolve com `id: null`) são descartadas:
 * elas não são objetos, `remove()` nunca as devolve, e mantê-las produziria uma
 * divergência garantida na conferência do passo 1 — um `falha_storage` falso.
 *
 * A mensagem de erro NÃO carrega o prefixo: ele é o `auth.uid()` do titular.
 */
export async function enumerarObjetosTitular(
  admin: ClienteStorage,
  prefixo: string,
  limite: number = LIMITE_LISTAGEM,
): Promise<string[]> {
  const pasta = prefixo.endsWith("/") ? prefixo.slice(0, -1) : prefixo;
  const caminhos: string[] = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { data, error } = await admin.storage
      .from(BUCKET_CURRICULOS)
      .list(pasta, { limit: limite, offset: pagina * limite });
    if (error) throw new Error("falha ao enumerar os objetos do titular no Storage");
    const linhas = (data ?? []) as Array<{ name?: unknown; id?: unknown }>;
    for (const l of linhas) {
      if (typeof l?.name !== "string" || l.name === "") continue;
      if (l.id === null) continue;
      caminhos.push(`${pasta}/${l.name}`);
    }
    if (linhas.length < limite) return caminhos;
  }
  throw new Error("enumeracao do Storage excedeu o teto de paginas");
}

/** Uma divergência entre as duas fontes. Nenhuma delas é descartada. */
export interface AchadoCaminho {
  caminho: string;
  /** `blob_orfao`: existe no bucket e nenhuma linha o aponta.
   *  `ponteiro_morto`: uma linha o aponta e ele não existe no bucket. */
  tipo: "blob_orfao" | "ponteiro_morto";
}

export interface UniaoDeCaminhos {
  /** A união, deduplicada por caminho COMPLETO e ORDENADA. */
  caminhos: string[];
  achados: AchadoCaminho[];
}

/**
 * Une a enumeração do Storage com os ponteiros de `candidaturas.curriculo_url`.
 *
 * ⚠ ENUMERAR POR `curriculo_url` SOZINHO DEIXA PII PARA TRÁS. O upload gera UUID novo
 * a cada chamada e a remoção do antigo é responsabilidade explícita de quem chama
 * (`cvUploadService.ts:102-103`): todo CV substituído sem remoção continua no bucket
 * **sem linha que o aponte**, e passaria incólume por uma exclusão que "funcionou". A
 * SONDA 3 mediu 5 objetos para 9 candidaturas — consistente com essa hipótese.
 *
 * ⚠ E A DIVERGÊNCIA É ACHADO, NUNCA FUSÃO SILENCIOSA. As duas listas discordarem é um
 * fato sobre o estado do sistema, e o único registro dele que vai sobreviver à
 * exclusão é este.
 *
 * A ordenação por caminho completo é o que torna uma RETOMADA reproduzível: a ordem
 * de paginação do `list()` não é fonte de verdade e pode variar entre chamadas.
 */
export function unirEDeduplicarCaminhos(
  doList: readonly string[],
  doBanco: readonly string[],
): UniaoDeCaminhos {
  const noStorage = new Set(doList);
  const noBanco = new Set(doBanco);
  const caminhos = [...new Set([...doList, ...doBanco])].sort();
  const achados: AchadoCaminho[] = [];
  for (const c of caminhos) {
    if (!noBanco.has(c)) achados.push({ caminho: c, tipo: "blob_orfao" });
    else if (!noStorage.has(c)) achados.push({ caminho: c, tipo: "ponteiro_morto" });
  }
  return { caminhos, achados };
}

/** Fatia em lotes de no máximo `tamanho`. Lista vazia → zero lotes (nunca um lote vazio). */
export function dividirEmLotes<T>(itens: readonly T[], tamanho: number = LIMITE_REMOCAO): T[][] {
  const passo = Math.max(1, Math.floor(tamanho));
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += passo) lotes.push(itens.slice(i, i + passo));
  return lotes;
}
