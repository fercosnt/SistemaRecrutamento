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

import { FROM, REPLY_TO } from "../_shared/email-config.ts";
import { escapeHtml, layoutBase } from "../_shared/email-templates.ts";
import { RECIBO_EXCLUSAO } from "../_shared/reciboExclusao.ts";

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
 * ⚠⚠ LINHA DE PASTA (o marcador que o Storage devolve com `id: null`) **LANÇA** desde
 * o 45-13 (WR-02), e a inversão é a precondição de a re-enumeração do CR-02 ser PROVA.
 * Descartá-la era correto para o esquema plano de hoje (`{authUid}/{uuid}.pdf`,
 * `cvUploadService.ts:101`) e vira um buraco no dia em que alguém gravar em subpasta: a
 * enumeração devolveria ZERO objetos, o laço não rodaria, `storage_concluido_em` seria
 * carimbado e o recibo afirmaria ao titular que o currículo foi apagado. Com a
 * conferência do passo 1 medindo o PÓS-ESTADO do bucket, uma re-enumeração vazia passou
 * a ser o que PROVA o sucesso — e um descarte silencioso ali é um falso verde
 * estrutural, não uma imprecisão. O guard de falha fechada de `montarPlano`
 * (`doBanco > 0 && doList === 0`) **não pega** este caso, porque `curriculo_url`
 * também apontaria para a subpasta e entraria na união.
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
      if (l.id === null) {
        throw new Error(
          "o prefixo do titular contem SUBPASTA e a enumeracao deste motor e de UM nivel: " +
            "seguir daqui deixaria PII para tras e o passo 1 carimbaria assim mesmo",
        );
      }
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
   *  `ponteiro_morto`: uma linha o aponta e ele não existe no bucket.
   *  `fora_do_prefixo` (WR-03): uma linha aponta para fora do prefixo do titular, ou
   *  com travessia de diretório — ele é DESCARTADO da remoção e registrado aqui. */
  tipo: "blob_orfao" | "ponteiro_morto" | "fora_do_prefixo";
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

// ═══════════════════════════════════════════════════════════════════════════
// Phase 45 / Plano 45-10 — O RECIBO AO TITULAR (passo 4)
//
// ⚠ ZERO TEXTO DE RECIBO DIGITADO AQUI. Todo rótulo, todo texto e toda base legal
// saem de `RECIBO_EXCLUSAO`, o espelho GERADO por `gen-recibo-exclusao.cjs` e
// protegido por `npm run check:recibo-exclusao`. O recibo é DERIVADO, nunca digitado
// (Invariante 4 da 45-UI-SPEC): nenhuma linha pode afirmar um apagamento sem um
// `passo_motor` que o execute.
//
// ⚠ E O ESCAPE É O CANÔNICO DE `_shared/email-templates.ts`. Um segundo escape neste
// repositório seria um segundo escape para auditar — e o dia em que os dois
// divergirem, a divergência mora justamente num corpo que sai do domínio.
//
// ⚠ ESTE CORPO NÃO É REGISTRADO EM LEDGER DE NOTIFICAÇÃO NENHUM (D-45-12 / saída R1).
// A prova de envio é `solicitacoes_dados.recibo_enviado_em`. Custo aceito e declarado:
// perde-se bounce/reclamado PARA ESTE E-MAIL — defensável porque, depois do hard
// delete, não há a quem re-tentar.
// ═══════════════════════════════════════════════════════════════════════════

/** Rótulo do sink de teste deste e-mail. Sanitizado para `[a-z_]` por quem consome. */
export const LABEL_SINK_RECIBO = "recibo_exclusao" as const;

/** O recorte do titular — os DOIS booleanos, e nada mais. */
export interface RecorteRecibo {
  temCurriculo: boolean;
  temDecisaoRegistrada: boolean;
}

/**
 * ⚠ FAIL-CLOSED por vocabulário. Um `aplicavel_quando` que o gerador venha a
 * introduzir e que este helper não conheça faz a linha ser OMITIDA, nunca incluída:
 * o recibo não afirma o que não pôde medir. Uma linha a menos é um recibo modesto;
 * uma linha a mais é uma promessa de apagamento que ninguém executou.
 */
function aplicavel(quando: string, r: RecorteRecibo): boolean {
  if (quando === "sempre") return true;
  if (quando === "tem_curriculo") return r.temCurriculo;
  if (quando === "tem_decisao_registrada") return r.temDecisaoRegistrada;
  return false;
}

/**
 * `dd/mm/aaaa` no fuso de São Paulo — o titular lê a data dele, não a do servidor.
 *
 * Data ilegível LANÇA. O contrato do corpo é *"concluído em {dd/mm/aaaa}"*, e um
 * recibo com data vazia seria um documento de compliance afirmando um fato sem
 * dizer quando. O chamador trata como `falha_recibo`, que é retomável.
 */
function dataBR(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new Error("data de conclusao ilegivel para o recibo");
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(t));
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")}`;
}

/**
 * Assunto FIXO, sem interpolação — logo sem superfície de CR/LF. A neutralização é
 * feita mesmo assim, por simetria com `assuntoCandidaturaEncerradaAPedido`: o dia em
 * que alguém interpolar algo aqui, a proteção já está no lugar.
 */
export function assuntoReciboExclusao(): string {
  return "[Beauty Smile] Seus dados foram apagados".replace(/[\r\n]+/g, " ").trim();
}

/** Preheader do recibo (45-UI-SPEC § E-mail 1). */
export const PREHEADER_RECIBO = "Seu pedido de exclusão foi concluído." as const;

/** Um item renderizado — `base` só existe na coluna que fica. */
function itemHtml(rotulo: string, texto: string, base?: string): string {
  // A base legal fica AO LADO do item, em 14px/600 — nunca em nota de rodapé, nunca
  // em tooltip (regra 3 do recibo). Uma justificativa legal escondida atrás de hover
  // é uma justificativa que a maioria nunca lê.
  const baseHtml = base
    ? `<div style="margin:4px 0 0;font-size:14px;font-weight:600;color:#00109E;">${
      escapeHtml(base)
    }</div>`
    : "";
  return `<div style="margin:0 0 14px;">
<div style="font-size:16px;font-weight:700;">${escapeHtml(rotulo)}</div>
<div style="margin:2px 0 0;font-size:16px;">${escapeHtml(texto)}</div>
${baseHtml}</div>`;
}

/**
 * O corpo do recibo — as duas colunas EMPILHADAS, em `texto_passado`.
 *
 * ⚠ A ASSINATURA É O CONTROLE DE PRIVACIDADE. Ela aceita uma data e dois booleanos, e
 * NADA MAIS: nome, CPF, telefone, `candidato_id`, `solicitacao_id`, título de vaga e
 * caminho de Storage simplesmente não têm por onde entrar. Este é o único e-mail da
 * fase cujo destinatário legítimo é o titular, o que torna tentador interpolar o nome
 * "para ficar pessoal" — e a assinatura é o que impede que a tentação vire código.
 *
 * ⚠ E8·overflow: **duas colunas EMPILHADAS**, com os dois cabeçalhos, na ordem
 * «sai» → «mantém». Cliente de e-mail é hostil a grid, e a regra de pareamento por
 * cabeçalho já cobre o caso. Sem largura fixa, sem tabela de layout aninhada, e nada
 * abaixo de 14px.
 */
export function corpoReciboExclusao(args: {
  dataConclusao: string;
  temCurriculo: boolean;
  temDecisaoRegistrada: boolean;
}): string {
  const recorte: RecorteRecibo = {
    temCurriculo: args.temCurriculo,
    temDecisaoRegistrada: args.temDecisaoRegistrada,
  };
  const data = dataBR(args.dataConclusao);

  const sai = RECIBO_EXCLUSAO.colunas_sai
    .filter((i) => aplicavel(i.aplicavel_quando, recorte))
    .map((i) => itemHtml(i.rotulo, i.texto_passado))
    .join("\n");

  // ⚠ `obrigatorio` VENCE o filtro nesta coluna — IDÊNTICO a ReciboExclusao.tsx:113.
  //   As linhas `obrigatorio: true` são as que o motor NÃO PODE apagar (o histórico das
  //   etapas, os agregados de não-discriminação e a justificativa do recrutador); elas
  //   aparecem em TODOS os recortes, mesmo quando a aplicabilidade não bate. Omitir uma
  //   retenção obrigatória faz a exclusão parecer MAIOR do que foi — a superestimação que
  //   o SC#5 proíbe — e ESTE é o recibo que sai DEPOIS do apagamento irreversível.
  //
  //   ⚠ Até 2026-08-22 esta linha filtrava só por `aplicavel(...)`, e a divergência era
  //   ALCANÇÁVEL no recorte MAJORITÁRIO (quem se candidatou e ainda não foi decidido):
  //   tela 8 itens, e-mail 7, faltando `justificativa_do_recrutador` — o único item que é
  //   `obrigatorio: true` E condicional. `45-REVIEW-4.md` / WR-A.
  //
  //   O `colunas_sai` NÃO leva esta regra, e não é esquecimento: nenhum item daquela
  //   coluna tem `obrigatorio` (o campo só faz sentido para retenção), e o filtro de lá
  //   já é byte-a-byte o mesmo da tela.
  const mantem = RECIBO_EXCLUSAO.colunas_mantem
    .filter((i) => i.obrigatorio === true || aplicavel(i.aplicavel_quando, recorte))
    .map((i) => itemHtml(i.rotulo, i.texto_passado, i.base_legal))
    .join("\n");

  const conteudoHtml = `<p style="margin:0 0 16px;">Olá,</p>
<p style="margin:0 0 16px;">Seu pedido para apagar seus dados na Beauty Smile foi <strong>concluído em ${data}</strong>. Sua conta de acesso não existe mais.</p>
<div style="margin:24px 0 8px;font-size:18px;font-weight:700;color:#00109E;">${
    escapeHtml(RECIBO_EXCLUSAO.cabecalhos.sai.passado)
  }</div>
${sai}
<div style="margin:28px 0 8px;font-size:18px;font-weight:700;color:#00109E;">${
    escapeHtml(RECIBO_EXCLUSAO.cabecalhos.mantem.passado)
  }</div>
${mantem}
<p style="margin:24px 0 0;">Se quiser se candidatar a uma vaga no futuro, é só fazer um cadastro novo.</p>`;

  return layoutBase({ preheader: PREHEADER_RECIBO, conteudoHtml });
}

/** Corpo do POST ao Resend. NUNCA carrega a chave da API. */
export function construirCorpoResendRecibo(args: {
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

/**
 * Chave de idempotência do recibo no Resend — cinto SECUNDÁRIO.
 *
 * O primeiro cinto é `solicitacoes_dados.recibo_enviado_em`. Este só existe para o
 * caso de o carimbo não ter chegado ao banco depois de o provedor já ter aceitado.
 * ⚠ NUNCA logada: ela embute o `solicitacao_id` completo.
 */
export function chaveIdempotenciaRecibo(solicitacaoId: string): string {
  return `${LABEL_SINK_RECIBO}:${solicitacaoId}`;
}
