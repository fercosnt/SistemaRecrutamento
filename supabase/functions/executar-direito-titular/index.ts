/**
 * Edge Function: executar-direito-titular
 *
 * Phase 45 / Plano 45-03 — ERASE-05 + ERASE-06. O caminho pelo qual o titular
 * exerce o direito de eliminação do Art. 18, VI: um clique na seção 4 de
 * `/candidato/privacidade` e uma data no banco.
 *
 * ⚠ **NESTA FASE ELA NÃO APAGA NADA.** Duas ações, ambas de estado: `pedir`
 * (registra o pedido e encerra as candidaturas em andamento, numa transação do
 * banco) e `cancelar` (interrompe a exclusão dos dados, e **não** reabre
 * candidatura alguma). Storage, tombstone e `deleteUser` entram **neste mesmo
 * arquivo** no 45-10 — é por isso que o esqueleto é construído agora, sobre um
 * caminho que não destrói, em vez de nascer junto com o efeito irreversível.
 *
 * Clone ESTRUTURAL de `exportar-meus-dados/index.ts` — que é ele mesmo um clone
 * declarado de `get-curriculo-url` — com QUATRO desvios nomeados, cada um comentado
 * no ponto em que acontece:
 *
 *   | # | No molde                                  | Aqui                                                    |
 *   |---|-------------------------------------------|---------------------------------------------------------|
 *   | 1 | o corpo do request NÃO é lido             | o corpo É lido, mas SÓ para `acao` — todo identificador  |
 *   |   |                                           | que vier nele é IGNORADO (classe T-32-03)               |
 *   | 2 | N leituras por allowlist + INSERT direto  | ZERO escrita direta: as duas mutações são RPC DEFINER,   |
 *   |   |                                           | onde o guard de titularidade é reafirmado no banco       |
 *   | 3 | `ErrorCode` inclui `COOLDOWN` (429)       | vocabulário de 5, sem cooldown — a proteção contra       |
 *   |   |                                           | repetição é a IDEMPOTÊNCIA POR ESTADO da RPC             |
 *   | 4 | o `catch` afirma o que não foi feito       | o `catch` NÃO escreve "nada foi apagado" — ver abaixo    |
 *
 * ── OS QUATRO PASSOS, E A ORDEM É O REQUISITO ───────────────────────────────
 *   1. AUTHENTICATE — `supabaseUser.auth.getUser()`; sem sessão → 401.
 *   2. AUTHORIZE    — resolve o titular de `auth.uid()`; erro de query → 500,
 *                     ausência → 403.
 *   3. VALIDA       — `acao` contra o vocabulário FECHADO, antes de qualquer
 *                     toque privilegiado.
 *   4. DELEGA       — a RPC `SECURITY DEFINER`, que reafirma a titularidade.
 *
 * ── AUTHENTICATE ≠ AUTHORIZE (landmine P10/P11) ─────────────────────────────
 * As RPCs são chamadas com `service_role`, que bypassa RLS. O passo 2 é o ÚNICO
 * controle entre um autenticado qualquer e o pedido de outra pessoa — e ele roda
 * ANTES de qualquer chamada privilegiada. O guard do corpo da RPC é o cinto
 * secundário, não o primeiro.
 *
 * ── ⚠ O 403 QUE VAI APARECER DEPOIS DO TOMBSTONE É O COMPORTAMENTO DESEJADO ──
 * O `.eq("user_id", user.id)` do passo 2 é **exatamente o que a severação do 45-07
 * quebra por desenho** (D-45-11): depois do tombstone `candidatos.user_id` deixa de
 * apontar para a linha do Auth, nenhuma sessão resolve o titular, e esta função
 * responde 403. **Isso é o certo, não um defeito a "consertar" na primeira vez que
 * aparecer** — depois da exclusão não há sessão, não há tela e não há a quem
 * responder. Quem for editar este arquivo no 45-10 precisa ler esta linha antes.
 *
 * ── ⚠ O `catch` DESTA EF NÃO PODE ESCREVER "NADA FOI APAGADO" ───────────────
 * O molde afirma isso e está certo lá: o export não muta PII. Aqui, a partir do
 * momento em que o 45-10 acrescentar o passo de Storage, a afirmação é
 * INGARANTÍVEL — a mutação `Storage -> Postgres -> Auth` não é atômica e o estado
 * "Storage apagado, Postgres ainda não" é alcançável em produção (Invariante 5 da
 * 45-UI-SPEC). A frase "Nada foi apagado" é permitida numa única superfície: a copy
 * de erro do REGISTRO do pedido, que acontece antes de qualquer mutação. O catch
 * daqui registra `causa` do vocabulário fechado e loga REDIGIDO.
 *
 * ⚠ E a ordem `Storage -> Postgres -> Auth` **não é imposta pela plataforma**: a
 * SONDA 2 mediu que `storage.objects` NÃO tem FK para `auth.users`. Apagar o
 * usuário com objetos vivos não levanta erro nenhum — apenas órfã o blob, em
 * silêncio e para sempre. A ordem é disciplina que este arquivo impõe a si mesmo.
 *
 * Import discipline: `createClient` entra por import ESTÁTICO de esm.sh — nunca a
 * forma construída em runtime, que escondeu o pacote do bundler e produziu
 * ERR_MODULE_NOT_FOUND em P10-13.
 *
 * Deploy: `supabase functions deploy executar-direito-titular` — **JWT-ON**, e a
 * bandeira que desliga a verificação de JWT é PROIBIDA nesta função, que é
 * autenticada por desenho. O deploy é do plano 45-06 (checkpoint do orquestrador);
 * o 45-03 apenas AUTORA este arquivo.
 *
 * @module supabase/functions/executar-direito-titular
 * @see supabase/functions/exportar-meus-dados/index.ts (o esqueleto clonado)
 * @see supabase/migrations/20260805000002_p45_rpc_pedido_exclusao.sql (as duas RPCs)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assuntoReciboExclusao,
  BUCKET_CURRICULOS,
  causaDaFalha,
  chaveIdempotenciaRecibo,
  construirCorpoResendRecibo,
  corpoReciboExclusao,
  dividirEmLotes,
  enumerarObjetosTitular,
  LABEL_SINK_RECIBO,
  LIMITE_REMOCAO,
  logSeguroExclusao,
  type PassoMotor,
  refCurta,
  unirEDeduplicarCaminhos,
} from "./helpers.ts";
import {
  exigirSinkTeste,
  type ModoNotificacao,
  resolverDestinatarioComLabel,
  resolverModo,
} from "../_shared/email-config.ts";

// ---------------------------------------------------------------------------
// CORS + response helpers (copiados verbatim do molde)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * DESVIO 3 — vocabulário de CINCO, sem `COOLDOWN`. O molde precisa dele porque
 * recusar por limite de 24 h não é nenhum dos outros quatro. Aqui não existe
 * cooldown: repetir o pedido é NO-OP OBSERVÁVEL, resolvido por idempotência de
 * ESTADO dentro da RPC, que devolve a mesma data sem mutar nada. Um código de
 * recusa para uma repetição que não é recusada seria vocabulário órfão.
 */
type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "SERVER_ERROR";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
  motivo?: string,
): Response {
  // `motivo` é vocabulário FECHADO do domínio (nunca SQLSTATE, nunca HTTP, nunca a
  // mensagem crua do banco): é o que permite ao cliente escolher a copy certa sem
  // ler texto de transporte (Invariante 12 da 45-UI-SPEC).
  return jsonResponse({ ok: false, error_code: code, message, ...(motivo ? { motivo } : {}) }, status);
}

// ---------------------------------------------------------------------------
// Deps injetáveis (testes injetam mocks; sem rede)
// ---------------------------------------------------------------------------

export interface Deps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  // deno-lint-ignore no-explicit-any
  supabaseUser: any;
  /** `fetch` do envio do recibo — testes injetam um mock → sem `--allow-net`. */
  fetchImpl?: typeof fetch;
  /**
   * Modo de notificação. Injetado nos testes porque `resolverModo()` lê `Deno.env`,
   * e a suíte desta EF roda sem permissão de env por contrato da fase.
   */
  modo?: ModoNotificacao;
}

/**
 * Vocabulário FECHADO de ação — TRÊS desde o 45-10.
 *
 * ⚠ `executar` é a única que destrói, e ela atravessa três sistemas SEM transação
 * compartilhada. As outras duas continuam sendo puro estado.
 */
const ACOES = new Set(["pedir", "cancelar", "executar"]);

/** `situacao` do pedido que ainda pode ser cancelado. */
const SITUACAO_AGENDADO = "agendado";
/** `situacao` de um pedido cuja execução COMEÇOU e pode ser retomada. */
const SITUACAO_EXECUTANDO = "executando";
/** `situacao` terminal — só com os TRÊS carimbos presentes. */
const SITUACAO_CONCLUIDO = "concluido";
const TIPO_EXCLUSAO = "exclusao";

/**
 * SQLSTATE que a RPC levanta para "este pedido não é cancelável" — fato do DOMÍNIO
 * (já executado, já cancelado, ou janela vencida), nunca falha de servidor. Ver o
 * COMMENT de `cancelar_pedido_exclusao`.
 */
const SQLSTATE_NAO_CANCELAVEL = "22023";
/** SQLSTATE do guard das duas RPCs (`RAISE ... USING ERRCODE = '42501'`). */
const SQLSTATE_FORBIDDEN = "42501";
/**
 * SQLSTATE do dry-run de `anonimizar_candidato` (`20260805000006`). Recebê-lo no
 * caminho REAL é defeito grave, nunca sucesso — ver o passo 2.
 */
const SQLSTATE_DRY_RUN = "P45DR";

/** O código de domínio devolvido ao cliente quando não há o que cancelar. */
const MOTIVO_NAO_CANCELAVEL = "PEDIDO_NAO_CANCELAVEL";
/** A janela de arrependimento ainda não venceu — fato do DOMÍNIO, nunca falha. */
const MOTIVO_JANELA_ABERTA = "JANELA_ABERTA";
/** Não há pedido em estado executável para este titular. */
const MOTIVO_NADA_A_EXECUTAR = "NADA_A_EXECUTAR";
/**
 * A execução parou no meio. ⚠ Este código NÃO afirma o que foi ou não foi feito —
 * a partir do passo 1 essa afirmação é ingarantível, e a `causa` gravada no banco é
 * o único lugar onde o SISTEMA em que ela parou fica registrado.
 */
const MOTIVO_EXECUCAO_INTERROMPIDA = "EXECUCAO_INTERROMPIDA";

/** Colunas do pedido — allowlist NOMINAL, nunca projeção curinga. */
const COLUNAS_PEDIDO =
  "id, executar_em, situacao, plano, storage_concluido_em, postgres_concluido_em, auth_concluido_em, recibo_enviado_em";

/**
 * O `plano jsonb` — o ÚNICO produtor de informação da execução.
 *
 * O passo 0 grava tudo isto ANTES da primeira mutação; os passos 1–3 só CONSOMEM. É
 * isso que torna a mutação retomável apesar de não-atômica, e é literalmente o
 * ERASE-04. Nenhum passo redescobre o que o passo 0 capturou.
 *
 * ⚠ `caminhos`, `achados`, `auth_uid` e `email` são PII de vida curta dentro do
 * próprio pedido: o caminho de Storage embute o `auth.uid()` do titular. O passo 4 os
 * apaga, deixando só `contagens` e `achados_resumo` — a prova de que a exclusão
 * aconteceu não precisa dos ponteiros para o que foi apagado.
 */
interface PlanoExclusao {
  versao: number;
  auth_uid?: string;
  email?: string | null;
  caminhos?: string[];
  achados?: Array<{ caminho: string; tipo: string }>;
  recorte?: { tem_curriculo: boolean; tem_decisao_registrada: boolean };
  contagens: Record<string, number>;
  achados_resumo: { blob_orfao: number; ponteiro_morto: number };
}

/**
 * Falha ATRIBUÍDA a um passo. O tipo existe porque o `catch` genérico não consegue
 * saber em qual dos três sistemas a mutação parou — e essa é a única pergunta que
 * importa às 3 da manhã sobre um arquivo que não tem cópia de reserva.
 */
class ErroDePasso extends Error {
  constructor(readonly passo: PassoMotor, readonly classe: string) {
    super(classe);
    this.name = "ErroDePasso";
  }
}

/** `now()` do servidor da EF, em ISO — o mesmo instante para todos os carimbos. */
function agora(): string {
  return new Date().toISOString();
}

/**
 * Handler testável: recebe `deps` injetados. O `Deno.serve` (no fim do arquivo) monta
 * o two-client real a partir do env + do header Authorization e delega aqui.
 */
export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { supabaseAdmin, supabaseUser } = deps;

  // ── 1 · AUTHENTICATE (two-client D-23 — getUser pelo client anon) ──────────
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 2 · AUTHORIZE — quem é o titular? A resposta sai de `auth.uid()`. ──────
  //      ⚠ Ver o docblock: este `.eq("user_id", ...)` é o que o tombstone de 45-07
  //      quebra POR DESENHO, e o 403 resultante é o comportamento desejado.
  //      A allowlist ganhou `email` no 45-10: ele é lido AQUI, ANTES do tombstone, e
  //      usado DEPOIS do `deleteUser` — entre os dois não existe mais conta de onde
  //      relê-lo. O passo 0 o persiste no `plano` e o passo 4 o apaga de lá.
  const { data: cand, error: candErr } = await supabaseAdmin
    .from("candidatos")
    .select("id, email")
    .eq("user_id", user.id)
    .maybeSingle();
  // WR-04: NÃO engula o erro de query. Um erro transitório virando 403 é uma
  // mentira sobre autorização — e é o tipo de mentira que ninguém investiga.
  if (candErr) {
    return errorResponse("SERVER_ERROR", "Falha ao verificar o titular.", 500);
  }
  if (!cand?.id) {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }
  const candidatoId: string = cand.id;
  const emailTitular: string | null = typeof cand.email === "string" ? cand.email : null;

  // ── 3 · VALIDA a ação ANTES de qualquer toque privilegiado ─────────────────
  //      DESVIO 1 — o molde não lê o corpo do request. Aqui ele é lido, mas SÓ
  //      para `acao`. **Nenhum identificador vindo do corpo é lido em lugar nenhum
  //      desta função**: o titular sai de `auth.uid()` (passo 2) e o pedido a
  //      cancelar sai de uma consulta escopada por ele (passo 4). Um `candidato_id`
  //      ou um `solicitacao_id` aceitos do cliente seriam a superfície de Tampering
  //      T-32-03 — deixar forjar de quem é o pedido é deixar forjar de quem são os
  //      dados que serão destruídos.
  let acao: unknown = null;
  try {
    const corpo = await req.json();
    acao = (corpo as { acao?: unknown } | null)?.acao ?? null;
  } catch {
    // Corpo ausente ou não-JSON cai no mesmo ramo de validação abaixo. Falha
    // FECHADA: um corpo ilegível nunca escolhe uma ação por omissão.
    acao = null;
  }
  if (typeof acao !== "string" || !ACOES.has(acao)) {
    return errorResponse("VALIDATION", "Ação não reconhecida.", 400);
  }

  try {
    // ── 4 · DELEGA à RPC SECURITY DEFINER ───────────────────────────────────
    //      DESVIO 2 — o molde escreve direto na tabela. Aqui NÃO existe escrita
    //      direta: as duas mutações são RPC, e o guard de titularidade é reafirmado
    //      DENTRO do banco. É o que faz o controle sobreviver a um futuro chamador
    //      que não seja esta função.
    if (acao === "pedir") {
      const { data, error } = await supabaseAdmin.rpc("registrar_pedido_exclusao", {
        p_candidato_id: candidatoId,
      });
      if (error) return respostaDeErroRpc(error, "pedir", candidatoId);

      const linha = primeiraLinha(data);
      // Falha FECHADA: uma RPC que não devolveu linha NÃO completou, e "não lançou"
      // não é a mesma coisa que "completou" — a lição do 42804 da Phase 43, que
      // sobreviveu a um smoke 10/10 verde.
      if (!linha?.executar_em) {
        logErro("pedir", "sem_linha", candidatoId);
        return errorResponse("SERVER_ERROR", "Não foi possível registrar seu pedido.", 500);
      }

      // ⚠ Invariante 12: `solicitacao_id` NÃO entra na resposta. O titular vê datas
      // e consequências; o motor vê identificadores. É também o que dispensa o
      // cliente de mandar esse id de volta no cancelamento.
      return jsonResponse({
        ok: true,
        acao: "pedir",
        executar_em: linha.executar_em,
        candidaturas_encerradas: Number(linha.candidaturas_encerradas ?? 0),
      }, 200);
    }

    if (acao === "executar") {
      return await executarExclusao(deps, {
        candidatoId,
        authUid: user.id,
        emailTitular,
      });
    }

    // ── acao === "cancelar" ─────────────────────────────────────────────────
    //      O pedido é resolvido NO SERVIDOR, escopado ao titular do passo 2. O
    //      cliente nunca conheceu o `solicitacao_id` (Invariante 12), então nunca
    //      pode mandá-lo — e a superfície de forja simplesmente não existe.
    const { data: pedido, error: pedErr } = await supabaseAdmin
      .from("solicitacoes_dados")
      .select("id")
      .eq("candidato_id", candidatoId)
      .eq("tipo", TIPO_EXCLUSAO)
      .eq("situacao", SITUACAO_AGENDADO)
      .order("solicitado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pedErr) {
      logErro("cancelar", "leitura", candidatoId);
      return errorResponse("SERVER_ERROR", "Falha ao verificar seu pedido.", 500);
    }
    if (!pedido?.id) {
      // Fato do DOMÍNIO, não falha: não há pedido agendado para cancelar.
      return errorResponse(
        "VALIDATION",
        "Não há pedido de exclusão agendado.",
        400,
        MOTIVO_NAO_CANCELAVEL,
      );
    }

    const { data, error } = await supabaseAdmin.rpc("cancelar_pedido_exclusao", {
      p_solicitacao_id: pedido.id,
    });
    if (error) return respostaDeErroRpc(error, "cancelar", candidatoId, pedido.id);

    const linha = primeiraLinha(data);
    if (!linha?.cancelado_em) {
      logErro("cancelar", "sem_linha", candidatoId, pedido.id);
      return errorResponse("SERVER_ERROR", "Não foi possível cancelar agora.", 500);
    }

    return jsonResponse({ ok: true, acao: "cancelar", cancelado_em: linha.cancelado_em }, 200);
  } catch {
    // ⚠ ESTE CATCH NÃO AFIRMA O QUE FOI OU NÃO FOI FEITO. Ver o docblock: a partir
    // do 45-10 essa afirmação é ingarantível, e uma frase tranquilizadora que
    // envelhece para falsa é pior que nenhuma.
    logErro(String(acao), "excecao", candidatoId);
    return errorResponse("SERVER_ERROR", "Não foi possível concluir seu pedido.", 500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// `acao === "executar"` — OS PASSOS DESTRUTIVOS (Phase 45 / Plano 45-10)
//
// ── A ORDEM É ESTRUTURAL, NÃO ESTILÍSTICA ──────────────────────────────────
//   Storage -> Postgres -> Auth
//     · o caminho do objeto é `{authUid}/{uuid}`: depois do `deleteUser` o prefixo
//       é INTRAÇÁVEL, e nada mais consegue enumerar o que sobrou;
//     · apagar `storage.objects` por SQL órfã o blob PARA SEMPRE — a Storage Admin
//       API é o único caminho que apaga o arquivo;
//     · `user_id` tem de estar severado ANTES do `deleteUser` de qualquer modo.
//
//   ⚠ E a ordem NÃO É IMPOSTA PELA PLATAFORMA: a SONDA 2 mediu que `storage.objects`
//   não tem FK para `auth.users`. Apagar o usuário com objetos vivos não levanta erro
//   nenhum. A ordem é disciplina que este arquivo impõe a si mesmo, e o modo de falha
//   de violá-la é SILENCIOSO.
//
// ── PLANO-PRIMEIRO, EXECUTORES IDEMPOTENTES ────────────────────────────────
// O passo 0 é o ÚNICO que produz informação; os passos 1–3 só consomem o que ele
// gravou. A idempotência é por ESTADO REGISTRADO no plano, jamais por `try/catch`:
// re-executar o mesmo pedido não avança passo nenhum duas vezes.
//
// ── ⚠ ONDE A RETOMADA TEM UM LIMITE CONHECIDO ──────────────────────────────
// Depois do passo 2 o `.eq("user_id", user.id)` da autorização DEIXA DE CASAR — o
// tombstone severou `user_id`. Esta EF passa a responder 403 a qualquer invocação
// subsequente daquele titular, e ISSO É O CERTO (D-45-11, efeito colateral desejado e
// medido): depois da exclusão não há sessão, não há tela e não há a quem responder.
// A consequência prática é que a retomada por ESTE caminho só existe ATÉ o fim do
// passo 2. Quem for editar este arquivo não deve "consertar" o 403.
// ═══════════════════════════════════════════════════════════════════════════

interface ContextoExecucao {
  candidatoId: string;
  authUid: string;
  emailTitular: string | null;
}

async function executarExclusao(deps: Deps, ctx: ContextoExecucao): Promise<Response> {
  const { supabaseAdmin } = deps;
  const { candidatoId, authUid } = ctx;

  // ── Resolve o pedido NO SERVIDOR, escopado ao titular (Invariante 12) ──────
  const { data: pedido, error: pedErr } = await supabaseAdmin
    .from("solicitacoes_dados")
    .select(COLUNAS_PEDIDO)
    .eq("candidato_id", candidatoId)
    .eq("tipo", TIPO_EXCLUSAO)
    .in("situacao", [SITUACAO_AGENDADO, SITUACAO_EXECUTANDO])
    .order("solicitado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pedErr) {
    logErro("executar", "leitura", candidatoId);
    return errorResponse("SERVER_ERROR", "Falha ao verificar seu pedido.", 500);
  }
  if (!pedido?.id) {
    return errorResponse(
      "VALIDATION",
      "Não há pedido de exclusão a executar.",
      400,
      MOTIVO_NADA_A_EXECUTAR,
    );
  }
  const pedidoId: string = pedido.id;

  // ── O GUARD DA JANELA, E ELE FECHA NO ILEGÍVEL ────────────────────────────
  // Um `executar_em` que não parseia NÃO libera nada. A alternativa — tratar
  // ilegível como "já venceu" — trocaria um defeito de dado por uma destruição
  // irreversível, que é a troca que esta fase inteira existe para não fazer.
  const quando = Date.parse(String(pedido.executar_em ?? ""));
  if (!Number.isFinite(quando)) {
    logErro("executar", "executar_em_ilegivel", candidatoId, pedidoId);
    return errorResponse("SERVER_ERROR", "Não foi possível concluir seu pedido.", 500);
  }
  if (quando > Date.now()) {
    return errorResponse(
      "VALIDATION",
      "A janela para desistir ainda não terminou.",
      400,
      MOTIVO_JANELA_ABERTA,
    );
  }

  /**
   * O estado da máquina, em memória, seguindo a linha do banco. Cada passo lê
   * daqui — mas a pré-condição do passo 3, que é o único irreversível, relê a linha
   * do BANCO em vez de confiar neste espelho.
   */
  const estado: Record<string, unknown> = { ...pedido };

  /** Carimba no pedido. Uma falha aqui é falha DO PASSO — nunca engolida. */
  const carimbar = async (passo: PassoMotor, patch: Record<string, unknown>): Promise<void> => {
    const { error } = await supabaseAdmin
      .from("solicitacoes_dados")
      .update(patch)
      .eq("id", pedidoId);
    if (error) throw new ErroDePasso(passo, "carimbo");
    Object.assign(estado, patch);
  };

  /**
   * Registra a `causa` do vocabulário FECHADO. Best-effort POR DESENHO: ele roda
   * dentro do `catch` que trata uma falha, e lançar daqui apagaria a informação de
   * EM QUAL SISTEMA a mutação não-atômica parou.
   */
  const registrarCausa = async (passo: PassoMotor): Promise<void> => {
    try {
      await supabaseAdmin
        .from("solicitacoes_dados")
        .update({ causa: causaDaFalha(passo) })
        .eq("id", pedidoId);
    } catch {
      // Sem rede para a rede: já estamos no caminho de falha.
    }
  };

  let arquivosApagados = 0;

  try {
    // ── PASSO 0 · O PLANO — o único produtor de informação ───────────────────
    let plano = (estado.plano ?? null) as PlanoExclusao | null;
    if (!plano || !Array.isArray(plano.caminhos)) {
      plano = await montarPlano(supabaseAdmin, ctx);
      await carimbar("storage", { plano, situacao: SITUACAO_EXECUTANDO });
    }

    // ── PASSO 1 · STORAGE ───────────────────────────────────────────────────
    // ⚠ Nunca `DELETE FROM storage.objects`: apagar por SQL remove só o metadado e
    // órfã o blob para sempre. Não existe caminho suportado para apagá-lo depois, e
    // o backup deste projeto exclui Storage inteiramente (D-45-10).
    const caminhos = plano.caminhos ?? [];
    if (!estado.storage_concluido_em) {
      for (const lote of dividirEmLotes(caminhos, LIMITE_REMOCAO)) {
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET_CURRICULOS)
          .remove(lote);
        if (error) throw new ErroDePasso("storage", "remove");
        // ⚠ A CONFERÊNCIA DO RETORNO. `remove()` devolve os objetos EFETIVAMENTE
        // apagados, e nada neste repositório confere isso hoje: o único precedente
        // (`cvUploadService.ts:224`) descarta o array. Aqui a divergência é a
        // diferença entre um recibo honesto e um recibo que promete o que não houve.
        const apagados = new Set(
          ((data ?? []) as Array<{ name?: unknown }>)
            .map((o) => o?.name)
            .filter((n): n is string => typeof n === "string"),
        );
        for (const c of lote) {
          if (!apagados.has(c)) throw new ErroDePasso("storage", "remove_divergente");
        }
      }
      // ⚠ Zero objetos é SUCESSO, não erro: o laço acima simplesmente não roda, o
      // carimbo acontece, e o recibo afirma zero arquivos. `curriculo_url` NULL não
      // é erro, e nenhum passo é marcado como falho por ausência de objeto.
      await carimbar("storage", { storage_concluido_em: agora() });
    }
    arquivosApagados = caminhos.length;

    // ── PASSO 2 · POSTGRES ──────────────────────────────────────────────────
    // A EF CHAMA a metade Postgres e não reimplementa NADA dela: toda a atomicidade
    // disponível está dentro daquela transação, e duplicar um único statement aqui a
    // destruiria.
    if (!estado.postgres_concluido_em) {
      const { data, error } = await supabaseAdmin.rpc("anonimizar_candidato", {
        p_candidato_id: candidatoId,
        p_dry_run: false,
      });
      if (error) {
        // ⚠ O SQLSTATE DE DRY-RUN CHEGANDO NO CAMINHO REAL É DEFEITO GRAVE, JAMAIS
        // SUCESSO. Ele significa que alguém trocou o default ou o parâmetro, e a
        // transação foi REVERTIDA: nada foi anonimizado. Ler "dry-run concluído com
        // sucesso" como sucesso é o pior falso verde possível nesta fase — marcaria
        // o pedido como concluído com 100% da PII intacta e o currículo já apagado.
        const sqlstate = (error as { code?: unknown } | null)?.code;
        throw new ErroDePasso(
          "postgres",
          sqlstate === SQLSTATE_DRY_RUN ? "dry_run_no_caminho_real" : "rpc_anonimizar",
        );
      }
      // "Não lançou" NÃO é a mesma coisa que "completou" (a lição do 42804 da Phase
      // 43, que sobreviveu a um smoke 10/10 verde). O contrato da RPC é devolver um
      // dos dois resultados nomeados.
      const resultado = (data as { resultado?: unknown } | null)?.resultado;
      if (resultado !== "anonimizado" && resultado !== "ja_anonimizado") {
        throw new ErroDePasso("postgres", "sem_resultado");
      }
      await carimbar("postgres", { postgres_concluido_em: agora() });
    }

    // ── PASSO 3 · AUTH — o único passo sem volta ────────────────────────────
    if (!estado.auth_concluido_em) {
      // ⚠ PRÉ-CONDIÇÃO DE CÓDIGO, VERIFICADA CONTRA A AUTORIDADE. A ordem
      // `Storage -> Postgres -> Auth` é estrutural porque `user_id` tem de estar
      // severado ANTES: sem isso `deleteUser` cascateia `candidatos` -> `candidaturas`,
      // bate nas 3 FKs `NO ACTION` com 23503, e falha DEPOIS de o currículo já ter
      // sido apagado do Storage — o pior estado alcançável nesta fase, e sem PITR e
      // sem backup de Storage ele é definitivo. Por isso a checagem relê a linha em
      // vez de confiar na variável local que o próprio código acabou de escrever.
      const { data: conf, error: confErr } = await supabaseAdmin
        .from("solicitacoes_dados")
        .select(COLUNAS_PEDIDO)
        .eq("id", pedidoId)
        .maybeSingle();
      if (confErr || !conf) throw new ErroDePasso("auth", "releitura");
      if (!conf.postgres_concluido_em) throw new ErroDePasso("auth", "fora_de_ordem");

      // ⚠⚠ O ERRO DE `deleteUser` NÃO É ENGOLIDO. Os dois precedentes vivos do
      // repositório (`cadastrar-candidato:268,390` e `gerenciar-usuario-rh:366`)
      // fazem `.catch()` que engole, e ali está CERTO: o objetivo é não deixar
      // usuário órfão depois de um cadastro que falhou segundos antes, sem linha
      // filha nenhuma. Aqui seria CATASTRÓFICO — tornaria invisível exatamente o
      // 23503, depois de o currículo já ter sido apagado. O `try` abaixo NÃO engole:
      // ele converte a rejeição em falha ATRIBUÍDA ao passo, que é gravada em
      // `causa='falha_auth'`, respondida como 500 e deixa o pedido retomável.
      let retornoDelete: { error?: unknown } | null = null;
      try {
        retornoDelete = await supabaseAdmin.auth.admin.deleteUser(authUid, false);
      } catch {
        throw new ErroDePasso("auth", "delete_user_excecao");
      }
      if (retornoDelete?.error) throw new ErroDePasso("auth", "delete_user");
      await carimbar("auth", { auth_concluido_em: agora() });
    }

    // ⚠ A `situacao` NUNCA vira `'concluido'` com qualquer dos três carimbos
    // ausente — é a tradução em dados da Invariante 5 da UI-SPEC.
    if (
      estado.storage_concluido_em && estado.postgres_concluido_em && estado.auth_concluido_em &&
      estado.situacao !== SITUACAO_CONCLUIDO
    ) {
      await carimbar("auth", { situacao: SITUACAO_CONCLUIDO });
    }

    // ── PASSO 4 · O RECIBO — o único canal que ainda alcança o titular ──────
    if (!estado.recibo_enviado_em) {
      await enviarRecibo(deps, {
        pedidoId,
        plano,
        dataConclusao: String(estado.auth_concluido_em ?? agora()),
      });
      // ⚠ E O `plano` É ESVAZIADO NO MESMO CARIMBO. O caminho de Storage embute o
      // `auth.uid()` do titular: é PII sobrevivendo dentro do PRÓPRIO registro de
      // exclusão. A prova de que a exclusão aconteceu não precisa dos ponteiros para
      // o que foi apagado — restam as contagens por passo e os achados agregados.
      // Gravar os dois num único UPDATE evita a janela em que o plano some sem que o
      // envio tenha sido registrado, que faria a retomada perder o endereço.
      await carimbar("recibo", {
        recibo_enviado_em: agora(),
        plano: {
          versao: plano.versao,
          contagens: plano.contagens,
          achados_resumo: plano.achados_resumo,
        },
      });
    }

    return jsonResponse({
      ok: true,
      acao: "executar",
      concluido_em: estado.auth_concluido_em ?? null,
      arquivos_apagados: arquivosApagados,
    }, 200);
  } catch (e) {
    // ⚠ ESTE CATCH NUNCA ESCREVE «NADA FOI APAGADO». A partir do passo 1 essa
    // afirmação é ingarantível, e uma frase tranquilizadora que envelhece para falsa
    // é pior que nenhuma. Ele registra a `causa` — o SISTEMA em que parou — e loga
    // REDIGIDO: só `refCurta()` e chaves da allowlist local.
    const passo: PassoMotor = e instanceof ErroDePasso ? e.passo : "postgres";
    const classe = e instanceof ErroDePasso ? e.classe : "excecao";
    await registrarCausa(passo);
    logErro("executar", classe, candidatoId, pedidoId, passo);
    return errorResponse(
      "SERVER_ERROR",
      "Não foi possível concluir seu pedido.",
      500,
      MOTIVO_EXECUCAO_INTERROMPIDA,
    );
  }
}

/**
 * PASSO 0 — captura tudo ANTES de qualquer mutação.
 *
 * ⚠ Um crash entre a captura e a primeira mutação NÃO perde os ponteiros: o `plano`
 * persistido é suficiente para retomar sem redescobrir. É por isso que ele é gravado
 * numa coluna e não vive numa variável local da Edge Function.
 */
async function montarPlano(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  ctx: ContextoExecucao,
): Promise<PlanoExclusao> {
  const { candidatoId, authUid, emailTitular } = ctx;

  // A expressão ÚNICA da qual o dry-run e o delete real saem (45-07). A EF CHAMA;
  // não reimplementa nada da metade Postgres — toda a atomicidade disponível está
  // dentro daquela transação, e duplicar qualquer statement aqui a destruiria.
  const { data: planoBanco, error: planoErr } = await supabaseAdmin.rpc(
    "plano_exclusao_titular",
    { p_candidato_id: candidatoId },
  );
  if (planoErr || !planoBanco) throw new ErroDePasso("postgres", "rpc_plano");

  // A enumeração AUTORITATIVA do bucket, paginada.
  const doList = await enumerarObjetosTitular(supabaseAdmin, `${authUid}/`)
    .catch(() => {
      throw new ErroDePasso("storage", "list");
    });

  // Os ponteiros — allowlist NOMINAL de colunas, nunca projeção curinga.
  const { data: cands, error: candsErr } = await supabaseAdmin
    .from("candidaturas")
    .select("id, curriculo_url")
    .eq("candidato_id", candidatoId);
  if (candsErr) throw new ErroDePasso("storage", "leitura_ponteiros");
  const doBanco = ((cands ?? []) as Array<{ curriculo_url?: unknown }>)
    .map((c) => c?.curriculo_url)
    .filter((v): v is string => typeof v === "string" && v !== "");

  const { caminhos, achados } = unirEDeduplicarCaminhos(doList, doBanco);

  // ⚠ FALHA FECHADA ESTRUTURAL, no molde de `exportar-meus-dados:270-286`. Ponteiros
  // vivos com enumeração VAZIA não é o caso vazio: é a enumeração quebrada (prefixo
  // errado, permissão, convenção mudada). Seguir daqui apagaria só o que os ponteiros
  // nomeiam e deixaria os órfãos para trás, com o pedido declarado concluído.
  if (doBanco.length > 0 && doList.length === 0) {
    throw new ErroDePasso("storage", "estrutura_vazia");
  }

  const contagens: Record<string, number> = {
    storage_remove: caminhos.length,
    ...somarPassosDoBanco(planoBanco as Record<string, unknown>),
  };

  return {
    versao: 1,
    auth_uid: authUid,
    email: emailTitular,
    caminhos,
    achados,
    recorte: {
      // ⚠ DI-45-08-02: os dois booleanos saem do PLANO REAL do motor, que é a
      // autoridade — a prévia da tela mede os mesmos fatos por outro caminho, e um
      // TERCEIRO critério aqui seriam três verdades sobre a mesma pessoa.
      tem_curriculo: caminhos.length > 0,
      tem_decisao_registrada: contagemDe(planoBanco, "tombstone_decisao_final") > 0,
    },
    contagens,
    achados_resumo: {
      blob_orfao: achados.filter((a) => a.tipo === "blob_orfao").length,
      ponteiro_morto: achados.filter((a) => a.tipo === "ponteiro_morto").length,
    },
  };
}

/**
 * PASSO 4 — o recibo em tempo PASSADO.
 *
 * ⚠ O ENDEREÇO VEM DO `plano`, NUNCA DE UMA CONSULTA AO BANCO. Neste ponto o
 * `deleteUser` já rodou e o tombstone já trocou `candidatos.email` pela sentinela: não
 * existe mais conta de onde relê-lo. É por isso que o passo 0 o persistiu — persistir
 * (em vez de guardar numa variável local da EF) é o que torna o recibo retomável a um
 * crash entre o hard delete e o envio.
 *
 * ⚠ E ELE NÃO ENTRA EM LEDGER DE NOTIFICAÇÃO NENHUM (D-45-12 / saída R1). O
 * claim-before-send de `notificar-rh/index.ts:279-342` NÃO é clonado aqui: é
 * justamente ele que gravaria o endereço do titular — duas vezes por linha, em duas
 * colunas `NOT NULL` — dentro do registro que prova a exclusão desse endereço. Só o
 * header `Idempotency-Key` é herdado.
 */
async function enviarRecibo(
  deps: Deps,
  args: { pedidoId: string; plano: PlanoExclusao; dataConclusao: string },
): Promise<void> {
  const { supabaseAdmin } = deps;
  const para = args.plano.email;
  if (typeof para !== "string" || para === "") {
    throw new ErroDePasso("recibo", "sem_endereco");
  }

  const modo = deps.modo ?? resolverModo();
  const dest = resolverDestinatarioComLabel(para, LABEL_SINK_RECIBO, modo);
  try {
    // Hard-fail non-prod (DELIV-03): nenhum endereço real recebe um e-mail de um run
    // de teste — e este e-mail afirma que a conta da pessoa deixou de existir.
    exigirSinkTeste(dest.para, modo);
  } catch {
    throw new ErroDePasso("recibo", "sink_nao_prod");
  }

  const recorte = args.plano.recorte ?? { tem_curriculo: false, tem_decisao_registrada: false };
  let html: string;
  try {
    html = corpoReciboExclusao({
      dataConclusao: args.dataConclusao,
      temCurriculo: recorte.tem_curriculo,
      temDecisaoRegistrada: recorte.tem_decisao_registrada,
    });
  } catch {
    throw new ErroDePasso("recibo", "corpo");
  }

  const { data: apiKey } = await supabaseAdmin.rpc("ler_resend_api_key");
  if (typeof apiKey !== "string" || apiKey === "") {
    throw new ErroDePasso("recibo", "sem_chave");
  }

  const enviar = deps.fetchImpl ?? fetch;
  let resp: Response;
  try {
    resp = await enviar("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Cinto SECUNDÁRIO: o primeiro é `recibo_enviado_em`. ⚠ Nunca logada.
        "Idempotency-Key": chaveIdempotenciaRecibo(args.pedidoId),
      },
      body: JSON.stringify(
        construirCorpoResendRecibo({
          para: dest.para,
          subject: assuntoReciboExclusao(),
          html,
        }),
      ),
    });
  } catch {
    // O recibo PODE falhar; o que ele não pode é sumir em silêncio. A `causa` fica
    // gravada e o pedido continua retomável.
    throw new ErroDePasso("recibo", "fetch");
  }
  if (!resp.ok) throw new ErroDePasso("recibo", "resend_nao_2xx");
}

/** Soma os valores numéricos de um passo do jsonb de `plano_exclusao_titular`. */
function contagemDe(planoBanco: unknown, passo: string): number {
  const bloco = (planoBanco as Record<string, unknown> | null)?.[passo];
  if (!bloco || typeof bloco !== "object") return 0;
  let total = 0;
  for (const v of Object.values(bloco as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) total += v;
  }
  return total;
}

/**
 * Reduz o jsonb do banco a CONTAGENS por passo — e só a elas.
 *
 * O `plano_exclusao_titular` devolve também `candidato_id` e notas em prosa. Nada
 * disso é persistido: o que fica no `plano` é o mínimo que sustenta o recibo e a
 * prova da exclusão, porque este mesmo registro sobrevive ao titular.
 */
function somarPassosDoBanco(planoBanco: Record<string, unknown>): Record<string, number> {
  const passos = [
    "tombstone_candidato",
    "tombstone_decisao_final",
    "severar_user_id",
    "severar_fks_set_null",
    "scrub_ledger_email",
  ];
  const out: Record<string, number> = {};
  for (const p of passos) out[p] = contagemDe(planoBanco, p);
  out.auth_delete_user = planoBanco?.user_id_presente === true ? 1 : 0;
  return out;
}

/** A primeira linha de um `RETURNS TABLE` (o cliente devolve um array). */
function primeiraLinha(data: unknown): Record<string, string | number> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, string | number>) ?? null;
  if (data && typeof data === "object") return data as Record<string, string | number>;
  return null;
}

/**
 * Traduz a recusa do banco para o vocabulário de erro DA INTERFACE.
 *
 * ⚠ NADA DA MENSAGEM DO BANCO ATRAVESSA. Nem SQLSTATE, nem texto, nem `details`,
 * nem `hint` (Invariante 12). O único sinal que sai é um código de domínio fechado.
 */
function respostaDeErroRpc(
  error: unknown,
  acao: string,
  candidatoId: string,
  pedidoId?: string,
): Response {
  const sqlstate = (error as { code?: unknown } | null)?.code;
  if (sqlstate === SQLSTATE_NAO_CANCELAVEL) {
    // Já executado, já cancelado, ou janela vencida: fato do DOMÍNIO. **Nunca 500** —
    // um 500 aqui mandaria o titular tentar de novo contra um relógio que já venceu.
    return errorResponse(
      "VALIDATION",
      "Este pedido não pode mais ser cancelado.",
      400,
      MOTIVO_NAO_CANCELAVEL,
    );
  }
  if (sqlstate === SQLSTATE_FORBIDDEN) {
    // O guard da RPC recusou. Se chegamos aqui com o passo 2 verde, algo está
    // divergente entre os dois controles — e o log (redigido) é o que permite ver.
    logErro(acao, "guard_rpc", candidatoId, pedidoId);
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }
  logErro(acao, "rpc", candidatoId, pedidoId);
  return errorResponse("SERVER_ERROR", "Não foi possível concluir seu pedido.", 500);
}

/**
 * Log REDIGIDO, e a redação é ESTRUTURAL: tudo passa pela allowlist local, e os
 * ids entram apenas como prefixo de 8 caracteres. Nunca o payload, nunca o corpo do
 * request, nunca uma URL, nunca a mensagem do banco.
 */
function logErro(
  acao: string,
  classe: string,
  candidatoId: string,
  pedidoId?: string,
  passo?: string,
): void {
  console.error(
    "[executar-direito-titular] erro",
    logSeguroExclusao({
      acao,
      erro_classe: classe,
      candidato_ref: refCurta(candidatoId),
      ...(pedidoId ? { pedido_ref: refCurta(pedidoId) } : {}),
      // `passo` é o SISTEMA em que a mutação não-atômica parou — a única pergunta que
      // importa depois. Já está na allowlist local desde o 45-03.
      ...(passo ? { passo } : {}),
    }),
  );
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // Preflight ANTES do guard de Authorization — o browser manda OPTIONS SEM
    // Authorization; sem este short-circuit o guard devolveria 401 no preflight e o
    // browser bloquearia a chamada por CORS.
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[executar-direito-titular] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    }

    // anon client COM Authorization → getUser decodifica/verifica o JWT do titular.
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // service_role SÓ para a resolução do titular e as duas RPCs (D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
