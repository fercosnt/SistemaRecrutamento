/**
 * Edge Function: executar-direito-titular
 *
 * Phase 45 / Planos 45-03 (o esqueleto) e 45-10 (o motor) — ERASE-03..ERASE-10.
 * O caminho pelo qual o titular exerce o direito de eliminação do Art. 18, VI: um
 * clique na seção 4 de `/candidato/privacidade`, uma data no banco, e — quinze dias
 * depois — três sistemas apagados.
 *
 * ⚠⚠ **ESTA FUNÇÃO APAGA, E O QUE ELA APAGA NÃO VOLTA.** O docblock anterior dizia
 * "nesta fase ela não apaga nada"; isso foi verdade até o 45-10 e deixou de ser.
 * QUATRO ações no vocabulário fechado, e as quatro são DISTINTAS por desenho:
 *   · `pedir`    — registra o pedido e encerra as candidaturas em andamento (estado);
 *   · `cancelar` — interrompe a exclusão, e **não** reabre candidatura alguma (estado);
 *   · `retirar_candidatura` — encerra UMA candidatura, agora, e **não apaga dado
 *                  nenhum** (estado, ERASE-05). A fronteira com `pedir` é o D-45-06:
 *                  retirar sai de um processo; apagar enfileira a destruição da conta.
 *                  Uma ação que fizesse as duas coisas é a ambiguidade que nesta
 *                  superfície vira ação irreversível;
 *   · `executar` — Storage, tombstone e `deleteUser`. **Irreversível**: o backup deste
 *                  projeto cobre 7 dias e **exclui Storage inteiramente**, e o PITR
 *                  está desligado (D-45-10). Um CV apagado por engano não volta por
 *                  nenhum meio.
 *
 * O esqueleto nasceu no 45-03 sobre um caminho que não destrói, e foi provado ao vivo
 * em PROD no 45-06 **antes** de a primeira linha irreversível existir. Num ambiente
 * sem segunda rede, um beco arquitetural descoberto ali custa um commit; descoberto
 * depois de Storage/tombstone/Auth, custa dado que não volta.
 *
 * ⚠ **O 45-10 escreve; quem aplica e deploya é o 45-11**, atrás do portão destrutivo
 * e de code review bloqueante. As migrations do 45-07 que o passo 2 chama
 * (`plano_exclusao_titular`, `anonimizar_candidato`) **não estão aplicadas**, e a
 * `20260805000004_p45_sever_user_id.sql` é PRÉ-CONDIÇÃO ESTRUTURAL do passo 3: sem
 * ela, `deleteUser` cascateia e falha com 23503 **depois** de o currículo já ter sido
 * apagado — o pior estado alcançável nesta fase.
 *
 * Clone ESTRUTURAL de `exportar-meus-dados/index.ts` — que é ele mesmo um clone
 * declarado de `get-curriculo-url` — com QUATRO desvios nomeados, cada um comentado
 * no ponto em que acontece:
 *
 *   | # | No molde                                  | Aqui                                                    |
 *   |---|-------------------------------------------|---------------------------------------------------------|
 *   | 1 | o corpo do request NÃO é lido             | o corpo É lido para `acao` e — SÓ na retirada — para um  |
 *   |   |                                           | `candidatura_id` que SELECIONA e não AUTORIZA (T-32-03)  |
 *   | 2 | N leituras por allowlist + INSERT direto  | ZERO escrita direta: as duas mutações são RPC DEFINER,   |
 *   |   |                                           | onde o guard de titularidade é reafirmado no banco       |
 *   | 3 | `ErrorCode` inclui `COOLDOWN` (429)       | vocabulário de 5, sem cooldown — a proteção contra       |
 *   |   |                                           | repetição é a IDEMPOTÊNCIA POR ESTADO da RPC             |
 *   | 4 | o `catch` afirma o que não foi feito       | o `catch` NÃO escreve "nada foi apagado" — ver abaixo    |
 *
 * ── OS QUATRO PASSOS, E A ORDEM É O REQUISITO ───────────────────────────────
 *   1. AUTHENTICATE — `supabaseUser.auth.getUser()`; sem sessão → 401.
 *   2. VALIDA       — `acao` contra o vocabulário FECHADO, antes de qualquer
 *                     toque privilegiado. ⚠ Este passo subiu de terceiro para segundo
 *                     no 45-13: o reencontro do CR-03 (abaixo) existe SÓ para
 *                     `executar`, então a autorização precisa saber qual é a ação para
 *                     decidir entre o 403 e a retomada. Efeito colateral favorável: uma
 *                     ação fora do vocabulário deixou de custar uma leitura
 *                     privilegiada.
 *   3. AUTHORIZE    — resolve o titular de `auth.uid()`; erro de query → 500,
 *                     ausência → 403 — **exceto** o reencontro pós-tombstone da ação
 *                     `executar`, que é autorização pelo MESMO JWT por outro caminho.
 *   4. DELEGA       — a RPC `SECURITY DEFINER`, que reafirma a titularidade.
 *
 * ── AUTHENTICATE ≠ AUTHORIZE (landmine P10/P11) ─────────────────────────────
 * As RPCs são `SECURITY DEFINER` e DEFINER bypassa RLS. O passo 2 é o primeiro
 * controle entre um autenticado qualquer e o pedido de outra pessoa — e ele roda
 * ANTES de qualquer chamada privilegiada. O guard do corpo da RPC é o cinto
 * secundário, e desde o 45-12 ele de fato morde: as claims do titular chegam lá.
 *
 * ── ⚠ O 403 DEPOIS DO TOMBSTONE, E O QUE MUDOU NO 45-13 (CR-03) ─────────────
 * O `.eq("user_id", user.id)` da autorização é **exatamente o que a severação do 45-07
 * quebra por desenho** (D-45-11): depois do tombstone `candidatos.user_id` deixa de
 * apontar para a linha do Auth e nenhuma sessão resolve o titular.
 *
 * **Para as três ações não-destrutivas isso continua sendo o certo, e continua não
 * devendo ser "consertado"**: depois da exclusão não há tela, não há pedido novo a
 * registrar e não há a quem responder.
 *
 * ⚠ **O que mudou é a ação `executar`.** O `45-REVIEW.md` mediu que aquele 403 tornava
 * os passos 3 e 4 **INALCANÇÁVEIS**: o passo 2 commitava, a EF caía em 403 e o estado
 * ficava terminal — currículos apagados, tombstone escrito, `situacao='executando'`
 * para sempre, **a conta do Auth viva com o e-mail real do titular**, e o recibo nunca
 * enviado. E não existia outro caminho (WR-09: sem chamador em `src/`, sem job agendado,
 * sem ação de operador). Agora, e SÓ nessa ação, o pedido é reencontrado pelo `auth_uid`
 * que o passo 0 persistiu no `plano` e comparado com o `sub` do JWT já verificado —
 * mesma pessoa, provada pelo mesmo JWT, nunca por identificador vindo do corpo.
 *
 * ⚠ **A janela que PERMANECE aberta** é a de depois do hard delete: sem conta não há
 * JWT, logo não há reencontro. É o item diferido `DI-45-13-02`, endereçado à Phase 46
 * junto com o executor agendado (o cron é escopo da 46 por decisão do `45-CONTEXT.md`).
 * ⚠ Este arquivo já afirmou uma vez o oposto do que fazia (desvio 3 do 45-10): num
 * módulo cujo modo de falha é irreversível, uma garantia velha é pior que nenhuma.
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
 * autenticada por desenho. O deploy da v1 foi o 45-06; o redeploy COM o motor é o
 * 45-11. O 45-10 apenas AUTORA os passos destrutivos.
 *
 * ── ⚠ O CONTRATO DE CLAIMS, POR CHAMADA (45-12 — fecha o `DI-45-10-01`) ─────
 * Esta EF opera com **TRÊS** clients, e a divisão não é estilo. O docblock deste
 * arquivo já afirmou uma vez o oposto do que o arquivo fazia (desvio 3 do 45-10);
 * num módulo cujo modo de falha é irreversível, uma garantia velha é pior que
 * nenhuma. Então: quais chamadas levam claims, quais não levam, e por quê.
 *
 *  · `supabaseUser` — anon key + `Authorization` do titular. UMA chamada:
 *    `auth.getUser()`, o passo 1 (D-23).
 *
 *  · `supabaseTitular` — **service key + `Authorization` do titular**. Só as QUATRO
 *    RPCs da fase saem dele: `registrar_pedido_exclusao`, `cancelar_pedido_exclusao`,
 *    `plano_exclusao_titular` e `anonimizar_candidato`. ⚠ O PostgREST deriva o
 *    *role* do MESMO JWT que carrega as claims: este client chega como
 *    `authenticated`, e é por isso que o conserto exigiu **também** a migration
 *    `20260805000009` (`GRANT EXECUTE ... TO authenticated` nas cinco). O que ele
 *    compra é `auth.uid()` resolvido DENTRO do banco — a metade (a) do guard das
 *    cinco. Sem ele, `auth.uid()` é NULL e as cinco recusam com `42501`.
 *
 *  · `supabaseAdmin` — service key **sem** `Authorization`. Tudo o mais:
 *    `auth.admin.deleteUser`, `storage.list`/`storage.remove`, `ler_resend_api_key`
 *    e TODA leitura/escrita de tabela. ⚠ Migrar qualquer um deles para o client do
 *    titular quebraria QUATRO caminhos de uma vez, porque o `Authorization` é o mesmo
 *    header para PostgREST, Storage e Auth Admin: `deleteUser` exige service_role,
 *    `ler_resend_api_key` é REVOGADA de `authenticated` desde a P36
 *    (`20260722000001:74`), e os carimbos em `solicitacoes_dados` passariam a depender
 *    de uma policy own-row que o tombstone QUEBRA POR DESENHO (D-45-11) — falhando
 *    nos passos 3 e 4, **depois** da mutação irreversível.
 *
 * ⚠ A saída **recusada**, e ela continua recusada: afrouxar o guard das RPCs para
 * aceitar `auth.uid() IS NULL` sob `service_role`. Reintroduziria o defeito que a
 * asserção C2 do smoke fecha, numa função que apaga PII irreversivelmente.
 *
 * ⚠ **O REDEPLOY É DO 45-11.** Este arquivo está certo no disco; a versão em PROD
 * ainda é a do 45-06, e ela não tem o terceiro client.
 *
 * @module supabase/functions/executar-direito-titular
 * @see supabase/functions/exportar-meus-dados/index.ts (o esqueleto clonado)
 * @see supabase/migrations/20260805000002_p45_rpc_pedido_exclusao.sql (as duas RPCs)
 * @see supabase/migrations/20260805000005_p45_plano_e_dry_run.sql (a expressão única)
 * @see supabase/migrations/20260805000006_p45_anonimizar_candidato.sql (o tombstone)
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
  /**
   * O TERCEIRO client: service key no `apikey`, `Authorization` do titular — logo
   * papel `authenticated` no PostgREST, com `auth.uid()` resolvido dentro do banco.
   * SÓ as quatro RPCs da fase saem dele.
   */
  // deno-lint-ignore no-explicit-any
  supabaseTitular: any;
  /** `fetch` do envio do recibo — testes injetam um mock → sem `--allow-net`. */
  fetchImpl?: typeof fetch;
  /**
   * Modo de notificação. Injetado nos testes porque `resolverModo()` lê `Deno.env`,
   * e a suíte desta EF roda sem permissão de env por contrato da fase.
   */
  modo?: ModoNotificacao;
}

/**
 * Vocabulário FECHADO de ação — QUATRO desde o 45-12.
 *
 * ⚠ `executar` é a única que destrói, e ela atravessa três sistemas SEM transação
 * compartilhada. As outras três continuam sendo puro estado.
 *
 * ⚠ E AS QUATRO PERMANECEM DISTINTAS, que é o `DI-45-10-02` fechado sem borrar a
 * fronteira que o D-45-06 desenhou: `retirar_candidatura` encerra UMA candidatura na
 * hora e **não apaga dado nenhum**; `pedir` enfileira, espera a janela e só então
 * `executar` destrói. Uma ação que fizesse as duas coisas é exatamente a ambiguidade
 * que nesta superfície vira ação irreversível.
 */
const ACOES = new Set(["pedir", "cancelar", "executar", "retirar_candidatura"]);

/**
 * Formato de UUID. É validação de FORMA, não de autorização — quem autoriza é o guard
 * da RPC, dentro do banco.
 */
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
/**
 * O MESMO SQLSTATE `22023` que `retirar_candidatura` levanta para "esta candidatura
 * não é retirável" — já decidida ou já removida (`20260805000007:212-215`). ⚠ São
 * DOIS fatos de domínio diferentes com o mesmo SQLSTATE, e é por isso que a tradução
 * é por AÇÃO: uma tradução única faria o titular ler a copy do outro caminho.
 */
const SQLSTATE_NAO_RETIRAVEL = "22023";
/** SQLSTATE do guard das duas RPCs (`RAISE ... USING ERRCODE = '42501'`). */
const SQLSTATE_FORBIDDEN = "42501";
/**
 * SQLSTATE do dry-run de `anonimizar_candidato` (`20260805000006`). Recebê-lo no
 * caminho REAL é defeito grave, nunca sucesso — ver o passo 2.
 */
const SQLSTATE_DRY_RUN = "P45DR";

/** O código de domínio devolvido ao cliente quando não há o que cancelar. */
const MOTIVO_NAO_CANCELAVEL = "PEDIDO_NAO_CANCELAVEL";
/**
 * A candidatura já foi decidida (aprovado/rejeitado) ou já foi removida — fato do
 * DOMÍNIO, jamais falha de servidor. ⚠ Ele viaja no campo `motivo`, e NÃO no
 * `error_code`: `ErrorCode` é vocabulário fechado de TRANSPORTE, com cinco valores, e
 * nenhum deles descreve um fato do domínio (Invariante 12).
 */
const MOTIVO_NAO_RETIRAVEL = "CANDIDATURA_NAO_RETIRAVEL";
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
  /**
   * ⚠ WR-01 — O QUE FOI DE FATO MUTADO, e só isso. Estes números são o `ROW_COUNT` que
   * `anonimizar_candidato` devolve mais o conjunto que a Storage Admin API confirmou ter
   * apagado. Eles são gravados no `plano` DEPOIS de ele ser esvaziado: são a prova
   * permanente da exclusão, e uma prova inflada é uma prova errada.
   */
  contagens: Record<string, number>;
  /**
   * ⚠ A PREVISÃO do passo 0, em campo SEPARADO. `plano_exclusao_titular` conta o que
   * EXISTE — para `tombstone_candidato` isso inclui candidaturas vinculadas,
   * devolutivas, disponibilidade e as próprias solicitações, e o tombstone toca UMA
   * linha de `candidatos`. Um titular com nove candidaturas produzia uma contagem
   * inflada onde deveria haver a medida do que aconteceu.
   */
  previsto?: Record<string, number>;
  /**
   * ⚠ A TRILHA DE QUEM DESTRUIU A PII, devolvida por `anonimizar_candidato` e persistida
   * aqui porque ela SOBREVIVE ao esvaziamento do plano — uma trilha apagada no fecho não
   * é trilha. Aquela função não escreve em `logs_auditoria` por razão medida (os dois
   * enums nunca foram medidos, e um valor inventado abortaria a anonimização depois de o
   * currículo já ter sido apagado — `DI-45-13-01`). O `uid` só existe aqui quando o
   * executor NÃO era o titular.
   */
  executor?: Record<string, unknown>;
  achados_resumo: {
    blob_orfao: number;
    ponteiro_morto: number;
    /** WR-03: ponteiros descartados por apontarem para fora do prefixo do titular. */
    fora_do_prefixo?: number;
    /** CR-02: caminhos que o `remove()` não devolveu — CONTAGEM, nunca a lista. */
    nao_devolvidos?: number;
  };
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

  // ── ⚠ A DIVISÃO DOS CLIENTS, E A RAZÃO MEDIDA (45-12 / `DI-45-10-01`) ──────
  //    `supabaseTitular` leva as claims; `supabaseAdmin` NÃO. O `Authorization` é o
  //    MESMO header para PostgREST, para a Storage API e para a Auth Admin API —
  //    acrescentá-lo ao client de serviço não "melhora as RPCs": troca o papel de
  //    TODAS as chamadas dele para `authenticated` de uma vez. `deleteUser` passa a
  //    403, `ler_resend_api_key` está REVOGADA de `authenticated` desde a P36
  //    (`20260722000001:74`), e os carimbos em `solicitacoes_dados` passam a depender
  //    de uma policy own-row que o tombstone QUEBRA POR DESENHO (D-45-11). Os dois
  //    últimos falhariam DEPOIS da mutação irreversível, quando já não há conta a
  //    quem responder. Cada chamada fica no papel de que ela precisa.
  const { supabaseAdmin, supabaseUser, supabaseTitular } = deps;

  // ── 1 · AUTHENTICATE (two-client D-23 — getUser pelo client anon) ──────────
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 2 · VALIDA a ação ANTES de qualquer toque privilegiado ─────────────────
  //      DESVIO 1 — o molde não lê o corpo do request. Aqui ele é lido, mas SÓ
  //      para `acao`. **Nenhum identificador vindo do corpo é lido em lugar nenhum
  //      desta função**: o titular sai de `auth.uid()` (passo 2) e o pedido a
  //      cancelar sai de uma consulta escopada por ele (passo 4). Um `candidato_id`
  //      ou um `solicitacao_id` aceitos do cliente seriam a superfície de Tampering
  //      T-32-03 — deixar forjar de quem é o pedido é deixar forjar de quem são os
  //      dados que serão destruídos.
  //
  //      ⚠ **A EMENDA DE UM ÚNICO CAMPO (45-12).** `candidatura_id` é lido do corpo, e
  //      SÓ na ação `retirar_candidatura`. Ele **seleciona** qual das candidaturas do
  //      titular, e **não autoriza** nada: quem autoriza é o guard da RPC
  //      (`v_dono IS DISTINCT FROM v_uid` → `42501`), que compara o dono da linha com o
  //      `auth.uid()` re-derivado do JWT DENTRO do banco. É defensável só porque o
  //      terceiro client faz as claims chegarem lá — sem elas o guard recusaria todo
  //      mundo e a autorização não existiria em lugar nenhum. Nenhum outro
  //      identificador do corpo é lido em lugar nenhum desta função, e dizer isso
  //      nominalmente é o que obriga a PRÓXIMA emenda a se justificar sozinha.
  let acao: unknown = null;
  let candidaturaId: unknown = null;
  try {
    const corpo = await req.json();
    const c = corpo as { acao?: unknown; candidatura_id?: unknown } | null;
    acao = c?.acao ?? null;
    candidaturaId = c?.candidatura_id ?? null;
  } catch {
    // Corpo ausente ou não-JSON cai no mesmo ramo de validação abaixo. Falha
    // FECHADA: um corpo ilegível nunca escolhe uma ação por omissão.
    acao = null;
    candidaturaId = null;
  }
  if (typeof acao !== "string" || !ACOES.has(acao)) {
    return errorResponse("VALIDATION", "Ação não reconhecida.", 400);
  }

  // ── 3 · AUTHORIZE — quem é o titular? A resposta sai de `auth.uid()`. ──────
  //      ⚠ Ver o docblock: este `.eq("user_id", ...)` é o que o tombstone de 45-07
  //      quebra POR DESENHO (D-45-11), e o 403 resultante continua sendo o
  //      comportamento desejado para as três ações não-destrutivas.
  //      A allowlist ganhou `email` no 45-10: ele é lido AQUI, ANTES do tombstone, e
  //      usado DEPOIS do `deleteUser` — entre os dois não existe mais conta de onde
  //      relê-lo. O passo 0 o persiste no `plano` e o passo 4 o apaga de lá.
  //      ⚠ A validação da `acao` subiu para ANTES desta leitura no 45-13, e a ordem é
  //      deliberada: o reencontro do CR-03 existe SÓ para `executar`, então esta função
  //      precisa saber qual é a ação para decidir entre o 403 e a retomada. Efeito
  //      colateral favorável: uma ação fora do vocabulário fechado deixou de custar
  //      sequer uma leitura privilegiada.
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

  let candidatoId: string | null = typeof cand?.id === "string" ? cand.id : null;
  let emailTitular: string | null = typeof cand?.email === "string" ? cand.email : null;

  // ── 3b · ⚠⚠ CR-03 · A RETOMADA QUE NÃO DEPENDE DE `candidatos.user_id` ─────
  //      O passo 2 severa `user_id` e COMMITA. A partir daí a resolução acima devolve
  //      vazio, e até o 45-13 esta função respondia 403 a toda invocação daquele
  //      titular — deixando os passos 3 e 4 INALCANÇÁVEIS. O review mediu o estado
  //      terminal: currículos apagados, tombstone escrito, `situacao='executando'` para
  //      sempre, **a conta do Auth viva com o e-mail real da pessoa**, e o recibo nunca
  //      enviado. E não existia outro caminho: `acao: 'executar'` não tem chamador em
  //      `src/`, não há job agendado e não há ação de operador (WR-09).
  //
  //      ⚠ POR QUE ISSO É AUTORIZAÇÃO E NÃO ATALHO. O `sub` vem do JWT verificado pelo
  //      client anon no passo 1; o `auth_uid` do `plano` foi escrito pelo PRÓPRIO motor
  //      a partir da mesma fonte, no passo 0. É a mesma pessoa, provada pelo JWT — não
  //      um identificador vindo do corpo do request. O DESVIO 1 continua valendo: nenhum
  //      id do cliente é lido aqui.
  //      ⚠ POR QUE SÓ EM `executar`: as outras três não têm estado pós-tombstone a
  //      retomar, e abrir o reencontro para elas seria superfície nova sem benefício.
  //      ⚠ ONDE O `auth_uid` DEIXA DE EXISTIR: o passo 4 esvazia o plano. Quando isso
  //      acontece o pedido já tem os quatro carimbos e não há o que retomar — dizer isso
  //      aqui evita que alguém conclua que o reencontro «parou de funcionar».
  //      ⚠ O QUE ELE NÃO ALCANÇA: depois de o `deleteUser` completar não existe mais
  //      conta, logo não existe JWT, logo não existe reencontro. A janela passo 3 →
  //      passo 4 continua aberta e é o item diferido `DI-45-13-02`.
  if (!candidatoId && acao === "executar") {
    const { data: pedidoOrfao, error: orfaoErr } = await supabaseAdmin
      .from("solicitacoes_dados")
      .select("id, candidato_id, plano")
      .eq("tipo", TIPO_EXCLUSAO)
      // ⚠ A situação TERMINAL entra na consulta: a `situacao` vira `concluido` ANTES do
      // envio do recibo, e sem ela um pedido concluído sem recibo não seria reencontrado
      // por caminho nenhum. Com os passos guardados por carimbo, um pedido inteiramente
      // finalizado que entre aqui é um no-op.
      .in("situacao", [SITUACAO_EXECUTANDO, SITUACAO_CONCLUIDO])
      .eq("plano->>auth_uid", user.id)
      .is("recibo_enviado_em", null)
      .order("solicitado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orfaoErr) {
      logErro("executar", "leitura_reencontro", "");
      return errorResponse("SERVER_ERROR", "Falha ao verificar seu pedido.", 500);
    }
    // ⚠ A COMPARAÇÃO É REFEITA AQUI, em código, e não só no filtro da consulta. Um
    // filtro é uma otimização de leitura; a autorização de um caminho que apaga a conta
    // de alguém não pode depender de o PostgREST ter interpretado o operador do jeito
    // esperado. Falha FECHADA: qualquer divergência mantém o 403.
    const planoOrfao = (pedidoOrfao?.plano ?? null) as PlanoExclusao | null;
    if (pedidoOrfao?.candidato_id && planoOrfao?.auth_uid === user.id) {
      candidatoId = String(pedidoOrfao.candidato_id);
      // O endereço do recibo continua saindo do `plano` (passo 4), então a ausência da
      // linha de `candidatos` não priva o titular de nada.
      emailTitular = null;
    }
  }

  if (!candidatoId) {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }

  try {
    // ── 4 · DELEGA à RPC SECURITY DEFINER ───────────────────────────────────
    //      DESVIO 2 — o molde escreve direto na tabela. Aqui NÃO existe escrita
    //      direta: as duas mutações são RPC, e o guard de titularidade é reafirmado
    //      DENTRO do banco. É o que faz o controle sobreviver a um futuro chamador
    //      que não seja esta função.
    if (acao === "pedir") {
      const { data, error } = await supabaseTitular.rpc("registrar_pedido_exclusao", {
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

    // ── acao === "retirar_candidatura" (ERASE-05) ───────────────────────────
    //    ⚠ ESTA AÇÃO NÃO APAGA NADA. Ela encerra UMA candidatura no funil, agora, e a
    //    fronteira com `pedir` é o D-45-06. A EF não escreve NADA por conta própria
    //    aqui: quem encerra é a RPC, e ela toca uma única coluna aditiva em
    //    `candidaturas` (D-45-13) — nunca `etapa_atual`, nunca `deleted_at`, nunca
    //    `historico_candidatura`, que tem um único escritor desde o M2/Phase 6.
    //    Replicar qualquer parte disso aqui daria dois escritores àquela trilha.
    if (acao === "retirar_candidatura") {
      // Formato ANTES de qualquer toque privilegiado. Falha FECHADA: um corpo ilegível
      // nunca escolhe uma candidatura por omissão.
      if (typeof candidaturaId !== "string" || !RE_UUID.test(candidaturaId)) {
        return errorResponse("VALIDATION", "Candidatura não reconhecida.", 400);
      }

      const { data, error } = await supabaseTitular.rpc("retirar_candidatura", {
        p_candidatura_id: candidaturaId,
      });
      if (error) {
        return respostaDeErroRpc(error, "retirar_candidatura", candidatoId, undefined, {
          mensagem: "Esta candidatura não pode mais ser retirada.",
          motivo: MOTIVO_NAO_RETIRAVEL,
        });
      }

      // ⚠ A RPC devolve `timestamptz` **ESCALAR**, não `RETURNS TABLE`: o helper de
      // primeira linha NÃO se aplica e o valor chega direto em `data`. Um valor que
      // não seja string não-vazia é falha FECHADA — «não lançou» não é «completou»,
      // que é a lição do 42804 da Phase 43, sobrevivente a um smoke 10/10 verde.
      if (typeof data !== "string" || data === "") {
        logErro("retirar_candidatura", "sem_data", candidatoId);
        return errorResponse("SERVER_ERROR", "Não foi possível concluir seu pedido.", 500);
      }

      // A idempotência é da RPC, por ESTADO: um segundo toque devolve A MESMA data sem
      // mutar nada. A EF não reimplementa idempotência nenhuma — adivinhar aqui moveria
      // a autoridade do servidor para esta função.
      return jsonResponse({
        ok: true,
        acao: "retirar_candidatura",
        encerrada_em: data,
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

    const { data, error } = await supabaseTitular.rpc("cancelar_pedido_exclusao", {
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
// ── ⚠ ATÉ ONDE A RETOMADA ALCANÇA (reescrito no 45-13 / CR-03) ─────────────
// Depois do passo 2 o `.eq("user_id", user.id)` da autorização DEIXA DE CASAR — o
// tombstone severou `user_id`, e isso é por DESENHO (D-45-11). Até o 45-12 a
// consequência era que os passos 3 e 4 ficavam INALCANÇÁVEIS e o pedido travava num
// estado terminal com a conta do Auth viva. Agora a ação `executar` reencontra o pedido
// pelo `auth_uid` persistido no `plano`, comparado com o `sub` do JWT verificado.
//
// ⚠ O QUE AINDA NÃO É RETOMÁVEL, dito para não ser redescoberto como novidade:
//   · a janela passo 3 → passo 4 (o `deleteUser` completou e o recibo não). A conta do
//     Auth já não existe, logo não há JWT, logo não há sessão que retome — `DI-45-13-02`;
//   · e nada disso roda sozinho: `acao: 'executar'` continua SEM GATILHO (WR-09). O
//     executor agendado é da Phase 46 por decisão de escopo do `45-CONTEXT.md`.
// ═══════════════════════════════════════════════════════════════════════════

interface ContextoExecucao {
  candidatoId: string;
  authUid: string;
  emailTitular: string | null;
}

async function executarExclusao(deps: Deps, ctx: ContextoExecucao): Promise<Response> {
  // ⚠ A leitura do pedido, os cinco carimbos, o Storage e o `deleteUser` seguem no
  // client de SERVIÇO; só as duas RPCs do motor saem do client do titular.
  const { supabaseAdmin, supabaseTitular } = deps;
  const { candidatoId, authUid } = ctx;

  // ── Resolve o pedido NO SERVIDOR, escopado ao titular (Invariante 12) ──────
  const { data: pedido, error: pedErr } = await supabaseAdmin
    .from("solicitacoes_dados")
    .select(COLUNAS_PEDIDO)
    .eq("candidato_id", candidatoId)
    .eq("tipo", TIPO_EXCLUSAO)
    // ⚠ 45-13 / CR-03: a situação TERMINAL entra aqui. Ela é escrita ANTES do envio do
    // recibo, então sem ela um pedido concluído SEM recibo não seria alcançável por
    // caminho nenhum — e o passo 4 é o único canal que ainda fala com o titular. Todos
    // os passos abaixo são guardados por carimbo: um pedido inteiramente finalizado que
    // entre aqui responde 200 sem tocar sistema externo nenhum.
    .in("situacao", [SITUACAO_AGENDADO, SITUACAO_EXECUTANDO, SITUACAO_CONCLUIDO])
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
    // ⚠ WR-08 · NÃO RELANÇA — mas também não some. Se este `UPDATE` falhar, o pedido
    // fica em `executando` sem `causa` e sem nenhum registro de EM QUAL SISTEMA a
    // mutação não-atômica parou: indistinguível de uma execução que nunca começou. E a
    // `causa` é, segundo o docblock dos helpers, «a única pergunta que importa às 3 da
    // manhã». O log redigido é o único canal que sobra — relançar daqui apagaria a
    // resposta do passo que de fato falhou.
    try {
      const { error } = await supabaseAdmin
        .from("solicitacoes_dados")
        .update({ causa: causaDaFalha(passo) })
        .eq("id", pedidoId);
      if (error) logErro("executar", "causa_nao_gravada", candidatoId, pedidoId, passo);
    } catch {
      logErro("executar", "causa_nao_gravada", candidatoId, pedidoId, passo);
    }
  };

  let arquivosApagados = 0;

  try {
    // ── PASSO 0 · O PLANO — o único produtor de informação ───────────────────
    let plano = (estado.plano ?? null) as PlanoExclusao | null;
    if (!plano || !Array.isArray(plano.caminhos)) {
      plano = await montarPlano(deps, ctx);
      await carimbar("storage", { plano, situacao: SITUACAO_EXECUTANDO });
    }

    // ── PASSO 1 · STORAGE ───────────────────────────────────────────────────
    // ⚠ Nunca `DELETE FROM storage.objects`: apagar por SQL remove só o metadado e
    // órfã o blob para sempre. Não existe caminho suportado para apagá-lo depois, e
    // o backup deste projeto exclui Storage inteiramente (D-45-10).
    const caminhos = plano.caminhos ?? [];
    if (!estado.storage_concluido_em) {
      let apagadosDeVerdade = 0;
      let naoDevolvidos = 0;
      for (const lote of dividirEmLotes(caminhos, LIMITE_REMOCAO)) {
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET_CURRICULOS)
          .remove(lote);
        if (error) throw new ErroDePasso("storage", "remove");
        // ⚠⚠ AUSÊNCIA NA RESPOSTA NÃO É FALHA — É «JÁ NÃO EXISTE» (CR-02).
        // `remove()` devolve os objetos que EXISTIAM e foram apagados, e
        // `unirEDeduplicarCaminhos` coloca deliberadamente no lote caminhos que podem
        // não existir: o próprio helper nomeia o caso (`ponteiro_morto`). Exigir que
        // TODO caminho do lote voltasse fazia o passo falhar depois de ter apagado os
        // CVs reais — e falhar IDENTICAMENTE em toda tentativa futura, porque os
        // objetos já não estavam lá. Currículo destruído, PII intacta, para sempre.
        const apagados = new Set(
          ((data ?? []) as Array<{ name?: unknown }>)
            .map((o) => o?.name)
            .filter((n): n is string => typeof n === "string"),
        );
        apagadosDeVerdade += apagados.size;
        for (const c of lote) {
          if (!apagados.has(c)) naoDevolvidos += 1;
        }
      }

      // ⚠⚠ A CONFERÊNCIA MUDOU DE OBJETO, E NÃO DE RIGOR: ela passou a ser sobre o
      // PÓS-ESTADO DO BUCKET, não sobre o valor de retorno de uma chamada. Três coisas
      // que isso compra, e as três são o motivo de a troca ser correta em vez de um
      // afrouxamento:
      //   1. a falha continua FECHADA — resíduo no bucket REPROVA o passo, sem carimbo;
      //   2. a retomada passa a ser CONVERGENTE: numa segunda tentativa o bucket já
      //      está vazio, `remove()` devolve vazio, e o passo carimba;
      //   3. os objetos do Storage têm o metadado em Postgres, então a listagem logo
      //      após a remoção é fortemente consistente — a re-enumeração não é uma aposta
      //      em consistência eventual.
      // ⚠ E a re-enumeração só é PROVA porque `enumerarObjetosTitular` LANÇA diante de
      // um marcador de pasta (WR-02): sem isso, uma subpasta futura devolveria vazio e
      // este bloco leria "vazio" como sucesso.
      const restantes = await enumerarObjetosTitular(supabaseAdmin, `${authUid}/`)
        .catch(() => {
          throw new ErroDePasso("storage", "list_pos_remove");
        });
      if (restantes.length > 0) throw new ErroDePasso("storage", "residuo_apos_remove");

      // ⚠ CONTAGEM, NUNCA A LISTA DE CAMINHOS. O review sugere guardar os caminhos não
      // devolvidos; isso reintroduziria no registro que sobrevive à exclusão exatamente
      // a PII que o passo 4 esvazia o plano para remover — o caminho embute o
      // `auth.uid()` do titular.
      plano.achados_resumo.nao_devolvidos = naoDevolvidos;
      plano.contagens.storage_remove = apagadosDeVerdade;

      // ⚠ Zero objetos é SUCESSO, não erro: o laço acima simplesmente não roda, o
      // carimbo acontece, e o recibo afirma zero arquivos. `curriculo_url` NULL não
      // é erro, e nenhum passo é marcado como falho por ausência de objeto.
      // ⚠ O `plano` vai no MESMO carimbo (WR-01): a contagem real do que foi apagado
      // precisa ser DURÁVEL, senão uma execução retomada a perderia — e ela é o que
      // sobra como prova depois de o plano ser esvaziado.
      await carimbar("storage", { storage_concluido_em: agora(), plano });
      arquivosApagados = apagadosDeVerdade;
    } else {
      arquivosApagados = Number(plano.contagens?.storage_remove ?? 0);
    }

    // ── PASSO 2 · POSTGRES ──────────────────────────────────────────────────
    // A EF CHAMA a metade Postgres e não reimplementa NADA dela: toda a atomicidade
    // disponível está dentro daquela transação, e duplicar um único statement aqui a
    // destruiria.
    if (!estado.postgres_concluido_em) {
      const { data, error } = await supabaseTitular.rpc("anonimizar_candidato", {
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

      // ⚠ WR-01 · AS CONTAGENS SAEM DAQUI, e não do `plano_exclusao_titular`. Estes são
      // os `ROW_COUNT` que a transação de fato produziu; aqueles eram uma PREVISÃO que
      // somava candidaturas vinculadas, devolutivas, disponibilidade e as próprias
      // solicitações — um titular com nove candidaturas produzia uma contagem inflada
      // gravada no registro que sobrevive a ele.
      const retorno = (data ?? {}) as Record<string, unknown>;
      const passosDaRpc = retorno.passos;
      if (passosDaRpc && typeof passosDaRpc === "object") {
        for (const [passo, bloco] of Object.entries(passosDaRpc as Record<string, unknown>)) {
          plano.contagens[passo] = contagemDe(passosDaRpc, passo);
          void bloco;
        }
      }
      // ⚠ A TRILHA DE QUEM DESTRUIU A PII. Ela entra no `plano` porque o `plano`
      // SOBREVIVE ao fecho do pedido — uma trilha apagada no fecho não é trilha. O
      // `uid` só vem preenchido quando o executor NÃO era o titular: o uid do titular é
      // o identificador que esta exclusão existe para apagar (`DI-45-13-01` registra a
      // lacuna de `logs_auditoria`, que continua fora por razão medida).
      if (retorno.executor && typeof retorno.executor === "object") {
        plano.executor = retorno.executor as Record<string, unknown>;
      }
      // ⚠ WR-06: `false` significa que as severações guardadas por `user_id` NÃO
      // aconteceram — zero deixa de poder ser lido como «não havia».
      if (retorno.severacao_por_user_id === false) {
        plano.contagens.severacao_por_user_id = 0;
      }

      await carimbar("postgres", { postgres_concluido_em: agora(), plano });
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
      // ⚠ E O QUE FICA É O QUE PROVA A EXCLUSÃO SEM APONTAR PARA A PESSOA: as contagens
      // REAIS, a previsão do passo 0, os achados agregados e a trilha do executor. O
      // `executor` sobrevive de propósito — ele é a única trilha que existe de quem
      // destruiu a PII, e o `uid` só está lá quando NÃO era o titular.
      await carimbar("recibo", {
        recibo_enviado_em: agora(),
        plano: {
          versao: plano.versao,
          contagens: plano.contagens,
          ...(plano.previsto ? { previsto: plano.previsto } : {}),
          ...(plano.executor ? { executor: plano.executor } : {}),
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
  deps: Deps,
  ctx: ContextoExecucao,
): Promise<PlanoExclusao> {
  // ⚠ Os DOIS clients, e a divisão é a mesma do handler: a RPC leva as claims do
  // titular; a enumeração do bucket e a leitura de ponteiros exigem `service_role`.
  const { supabaseAdmin, supabaseTitular } = deps;
  const { candidatoId, authUid, emailTitular } = ctx;

  // A expressão ÚNICA da qual o dry-run e o delete real saem (45-07). A EF CHAMA;
  // não reimplementa nada da metade Postgres — toda a atomicidade disponível está
  // dentro daquela transação, e duplicar qualquer statement aqui a destruiria.
  const rpcPlano = await supabaseTitular.rpc("plano_exclusao_titular", {
    p_candidato_id: candidatoId,
  });
  const { data: planoBanco, error: planoErr } = rpcPlano;
  if (planoErr || !planoBanco) throw new ErroDePasso("postgres", "rpc_plano");

  // ⚠⚠ CR-05 · A RECUSA ACONTECE AQUI, ANTES DA PRIMEIRA MUTAÇÃO — e é isso que a
  // torna barata. `plano_exclusao_titular` ENUMERA do catálogo as FKs para `auth.users`
  // que BLOQUEIAM o delete e que têm linha viva apontando ao titular, subtraídas as que
  // o tombstone comprovadamente severa. Uma lista não-vazia significa que o `deleteUser`
  // do passo 3 falharia com 23503 — e, até o 45-13, isso só aparecia DEPOIS de o
  // currículo ter sido apagado do Storage, num estado que (CR-03) era terminal. O passo
  // 0 roda antes de qualquer mutação, então a recusa aqui custa ZERO.
  // ⚠ Chave ausente NÃO é recusa: uma versão anterior da função em PROD (um rollback da
  // migration, por exemplo) não devolveria a chave, e transformar isso em falha travaria
  // o motor inteiro. Quem garante que a função viva é a certa é o pin de `md5(prosrc)`
  // da asserção C3 do smoke, no portão do 45-11.
  const bloqueadores = (planoBanco as Record<string, unknown>)?.bloqueadores_deleteuser;
  if (Array.isArray(bloqueadores) && bloqueadores.length > 0) {
    throw new ErroDePasso("postgres", "bloqueadores_deleteuser");
  }

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
  const ponteiros = ((cands ?? []) as Array<{ curriculo_url?: unknown }>)
    .map((c) => c?.curriculo_url)
    .filter((v): v is string => typeof v === "string" && v !== "");

  // ⚠⚠ G13 · FALHA FECHADA ESTRUTURAL, no molde de `exportar-meus-dados:270-286`, E ELA
  // MEDE OS PONTEIROS CRUS — ANTES de qualquer filtragem. Ponteiros vivos com enumeração
  // VAZIA não é o caso vazio: é a enumeração quebrada (prefixo errado, permissão,
  // convenção de caminho mudada). Seguir daqui apagaria só o que os ponteiros nomeiam e
  // deixaria os órfãos para trás, com o pedido declarado concluído.
  //
  // ⚠ A ORDEM É O MECANISMO, e inverter os dois blocos DESARMA o guard (BL-03 do
  // `45-REVIEW-2.md`): com a filtragem de prefixo rodando primeiro, um titular cujos
  // ponteiros estejam TODOS fora do prefixo produzia uma lista filtrada vazia, o guard
  // não disparava, o passo 1 carimbava `storage_concluido_em` com zero objeto removido e
  // o recibo declarava o currículo apagado — enquanto os arquivos continuavam no bucket,
  // agora sem nenhuma linha que os apontasse (o CR-04 anula `curriculo_url`) e sem conta
  // do Auth cujo prefixo os enumere. Uma declaração de conformidade sobre arquivos que
  // existem, e nenhum caminho futuro capaz de encontrá-los.
  if (ponteiros.length > 0 && doList.length === 0) {
    throw new ErroDePasso("storage", "estrutura_vazia");
  }

  // ⚠ WR-03 · REVALIDAR O PREFIXO ANTES DE UM `remove()` SOB SERVICE KEY.
  // Estes ponteiros saem de `candidaturas.curriculo_url` — uma coluna de texto — e iam
  // direto para uma remoção que roda com a service key e IGNORA RLS. Um `curriculo_url`
  // legado, importado ou escrito por outro caminho apagaria o CV de OUTRA pessoa,
  // irreversivelmente: sem PITR e com o Storage fora de todo backup. A validação de
  // prefixo existia apenas no caminho de ESCRITA (`submit-candidatura:191`).
  // ⚠ O descartado vira ACHADO REGISTRADO, nunca remoção silenciosa: uma linha estranha
  // é um fato sobre o sistema, e parar por causa de UMA delas negaria ao titular o
  // direito que ele exerceu.
  const prefixo = `${authUid}/`;
  const doBanco = ponteiros.filter((v) => v.startsWith(prefixo) && !v.includes(".."));
  const foraDoPrefixo = ponteiros.filter((v) => !doBanco.includes(v));

  // ⚠ MAS DESCARTAR **TODOS** OS PONTEIROS NÃO PODE SER SILENCIOSO. Um descarte pontual é
  // achado; o descarte integral é a afirmação de que a convenção de caminho deste titular
  // não é a que este código conhece — e nesse estado o motor não sabe o que apagar. Parar
  // aqui custa uma execução adiada; seguir custa um recibo que mente sobre arquivos que
  // continuam existindo.
  if (ponteiros.length > 0 && doBanco.length === 0) {
    throw new ErroDePasso("storage", "todos_os_ponteiros_fora_do_prefixo");
  }

  const { caminhos, achados } = unirEDeduplicarCaminhos(doList, doBanco);
  for (const c of foraDoPrefixo) achados.push({ caminho: c, tipo: "fora_do_prefixo" });

  // ⚠ WR-01 · O QUE O PLANO PREVÊ ≠ O QUE O MOTOR MUTOU, e os dois campos são
  // separados por isso. Estas contagens são do `plano_exclusao_titular`: elas dizem o
  // que EXISTE, o que é a pergunta certa para uma prévia e a errada para uma prova. As
  // contagens REAIS são preenchidas pelos passos 1 e 2, a partir do conjunto
  // efetivamente apagado e do `ROW_COUNT` que o tombstone devolve.
  const previsto: Record<string, number> = {
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
    contagens: {},
    previsto,
    achados_resumo: {
      blob_orfao: achados.filter((a) => a.tipo === "blob_orfao").length,
      ponteiro_morto: achados.filter((a) => a.tipo === "ponteiro_morto").length,
      fora_do_prefixo: foraDoPrefixo.length,
      nao_devolvidos: 0,
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
  /**
   * A tradução de `22023` PARA ESTA AÇÃO. ⚠ O default é o do cancelamento porque foi
   * o primeiro caminho a existir; `retirar_candidatura` passa o dela. O mesmo SQLSTATE
   * carrega dois fatos de domínio diferentes, e uma tradução única faria o titular ler
   * a copy do outro caminho.
   */
  dominio22023: { mensagem: string; motivo: string } = {
    mensagem: "Este pedido não pode mais ser cancelado.",
    motivo: MOTIVO_NAO_CANCELAVEL,
  },
): Response {
  const sqlstate = (error as { code?: unknown } | null)?.code;
  if (sqlstate === SQLSTATE_NAO_CANCELAVEL || sqlstate === SQLSTATE_NAO_RETIRAVEL) {
    // Já executado, já cancelado, janela vencida ou candidatura já decidida: fato do
    // DOMÍNIO. **Nunca 500** — um 500 aqui mandaria o titular tentar de novo contra um
    // estado que não muda mais.
    return errorResponse("VALIDATION", dominio22023.mensagem, 400, dominio22023.motivo);
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
    // service_role para a resolução do titular, os carimbos, o Storage, o
    // `deleteUser` e `ler_resend_api_key` (D-23). ⚠ SEM `Authorization`: acrescentá-lo
    // aqui trocaria o papel de TODAS essas chamadas para `authenticated` de uma vez.
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // ── O TERCEIRO CLIENT (45-12 / `DI-45-10-01`) ────────────────────────────
    // Service key no `apikey` E o `Authorization` do titular já validado acima. ⚠ O
    // PostgREST deriva o PAPEL do MESMO JWT que carrega as claims: este client chega
    // como `authenticated`, não como `service_role` — e é por isso que fechar o
    // `DI-45-10-01` exige TAMBÉM o `GRANT EXECUTE ... TO authenticated` da migration
    // `20260805000009`. O que ele compra é `auth.uid()` resolvido DENTRO do banco,
    // que é a metade (a) do guard das cinco RPCs desta fase. Sem ele, `auth.uid()` é
    // NULL, as cinco recusam com 42501, e o motor não roda.
    const supabaseTitular = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, supabaseUser, supabaseTitular });
  });
}
