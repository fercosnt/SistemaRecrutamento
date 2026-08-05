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
import { logSeguroExclusao, refCurta } from "./helpers.ts";

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
}

/** Vocabulário FECHADO de ação. Nesta fase, duas — e nenhuma delas destrói nada. */
const ACOES = new Set(["pedir", "cancelar"]);

/** `situacao` do pedido que ainda pode ser cancelado. */
const SITUACAO_AGENDADO = "agendado";
const TIPO_EXCLUSAO = "exclusao";

/**
 * SQLSTATE que a RPC levanta para "este pedido não é cancelável" — fato do DOMÍNIO
 * (já executado, já cancelado, ou janela vencida), nunca falha de servidor. Ver o
 * COMMENT de `cancelar_pedido_exclusao`.
 */
const SQLSTATE_NAO_CANCELAVEL = "22023";
/** SQLSTATE do guard das duas RPCs (`RAISE ... USING ERRCODE = '42501'`). */
const SQLSTATE_FORBIDDEN = "42501";

/** O código de domínio devolvido ao cliente quando não há o que cancelar. */
const MOTIVO_NAO_CANCELAVEL = "PEDIDO_NAO_CANCELAVEL";

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
  const { data: cand, error: candErr } = await supabaseAdmin
    .from("candidatos")
    .select("id")
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
function logErro(acao: string, classe: string, candidatoId: string, pedidoId?: string): void {
  console.error(
    "[executar-direito-titular] erro",
    logSeguroExclusao({
      acao,
      erro_classe: classe,
      candidato_ref: refCurta(candidatoId),
      ...(pedidoId ? { pedido_ref: refCurta(pedidoId) } : {}),
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
