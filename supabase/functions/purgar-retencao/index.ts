/**
 * Edge Function: purgar-retencao
 *
 * Phase 46 / Plano 46-05 — PURGA-02 · PURGA-05 · PURGA-06.
 * O executor da purga automática de retenção: recebe **um** titular por invocação e
 * destrói o pacote completo — Storage, Postgres e Auth — reusando o motor provado da
 * Phase 45 (D-46-12).
 *
 * ⚠⚠ **ESTA FUNÇÃO DESTRÓI STORAGE, POSTGRES E AUTH DE FORMA IRREVERSÍVEL, NUM
 * SISTEMA SEM PITR E SEM BACKUP DE STORAGE.** O backup deste projeto cobre 7 dias e
 * **exclui Storage inteiramente**, e o PITR está desligado (D-45-10). Um currículo
 * apagado aqui não volta por nenhum meio conhecido.
 *
 * ⚠ Ao fim do plano 46-05 ela existe e está deployada, mas **nada a invoca**: o
 * dispatch nasce no 46-06 e `config_purga.modo` está em `'off'`.
 *
 * ── O DESVIO CENTRAL, E ELE EXPLICA TODOS OS OUTROS ─────────────────────────
 * **Esta EF não tem sessao de titular de onde derivar o alvo.** Ela é disparada por
 * cron, server-to-server: não há JWT de pessoa, não há `auth.uid()`, não há tela a
 * quem responder. O alvo tem de chegar no CORPO da requisição — e é exatamente aí que
 * mora o Pitfall 11 / classe T-32-03: quem conseguisse forjar um POST com o Bearer
 * certo escolheria quem é destruído.
 *
 * A resposta é a mesma que o 45-12 documentou: **o payload SELECIONA, o banco
 * AUTORIZA.** O corpo só chega até `reivindicar_item_purga`, que reverifica o
 * encontro inteiro no servidor e devolve o `candidato_id` **do ITEM**. Nenhum outro
 * identificador do corpo é lido em lugar nenhum desta função.
 *
 * É por isso que o guard do motor precisou de um 4º ramo (46-04) e é por isso que
 * esta EF **não pode** simplesmente injetar um `Authorization` de operador: a
 * autorização vem de um ESTADO que só a varredura produz, nunca de uma credencial.
 *
 * ── DESVIOS NOMEADOS contra o molde (`executar-direito-titular/index.ts`) ────
 *
 *   | # | No molde (Phase 45)                          | Aqui (Phase 46)                                        |
 *   |---|----------------------------------------------|--------------------------------------------------------|
 *   | 1 | TRÊS clients (anon, service, titular)        | **UM** client de serviço, sem claims. Não há titular a  |
 *   |   |                                              | quem pertencer o JWT, e acrescentar um `Authorization`  |
 *   |   |                                              | trocaria o papel de TODAS as chamadas de uma vez —      |
 *   |   |                                              | `deleteUser` passaria a 403. A autorização vem do 4º    |
 *   |   |                                              | ramo do guard, não de claims.                           |
 *   | 2 | `auth.getUser()` autentica o chamador        | **Auto-autenticação por Bearer do Vault**, em tempo     |
 *   |   |                                              | constante: `verify_jwt = false`, o gateway não          |
 *   |   |                                              | autentica, e a função tem de se autenticar sozinha.     |
 *   | 3 | o alvo sai de `auth.uid()`                   | o alvo sai de `reivindicar_item_purga`, e o do corpo    |
 *   |   |                                              | NÃO SOBREVIVE à reivindicação.                          |
 *   | 4 | o passo 1 enumera do `plano.caminhos`        | o plano devolve `storage_remove.objetos = NULL` **com   |
 *   |   |                                              | o motivo escrito** (SONDA 2: `storage.objects` não tem  |
 *   |   |                                              | FK para `auth.users`). A enumeração é do BUCKET, e é    |
 *   |   |                                              | ela que pega o blob órfão por construção.               |
 *   | 5 | o `authUid` vem do `sub` do JWT              | vem de `candidatos.user_id`, lido **antes** do          |
 *   |   |                                              | tombstone — que é o statement que o severa.             |
 *   | 6 | retomada por estado em `solicitacoes_dados`  | **sem retomada**: uma invocação, um titular, um item.   |
 *   |   |                                              | Quem reconcilia o que morreu no meio é a varredura      |
 *   |   |                                              | (`20260823000007`), não uma segunda invocação.          |
 *
 * ⚠ **UMA INVOCAÇÃO, UM TITULAR. Nunca um laço sobre vários.** O teto de parede é
 * 150 s e o de CPU é 2 s por requisição; um lote cortado no meio deixaria Storage
 * apagado e Postgres intacto — o estado exato que a Phase 45 criou um vocabulário
 * para nomear, agora sem ninguém para retomar.
 *
 * ⚠ **A CONCLUSÃO VAI NUM BLOCO DE FINALIZAÇÃO**, alcançável também nos caminhos de
 * falha. Um item que fica aberto mantém viva a autorização do 4º ramo do guard até a
 * janela de 1 h de HI-03 vencer.
 *
 * ⚠ **NUNCA APAGAR STORAGE POR SQL.** `DELETE FROM storage.objects` remove só o
 * metadado e órfã o blob PARA SEMPRE — não existe caminho suportado para apagá-lo
 * depois, e o Storage está fora de todo caminho de backup.
 *
 * Roda os testes: `deno test supabase/functions/purgar-retencao/` — sem rede e sem
 * env, porque o handler recebe `deps` injetados.
 *
 * @see supabase/migrations/20260823000010_p46_item_lifecycle.sql (as duas RPCs)
 * @see supabase/migrations/20260823000006_p46_guard_purga.sql (o 4º ramo do guard)
 * @see supabase/tests/p46_purga_smoke.sql — asserções (q.1) a (q.5)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Mesmo bucket do motor da Phase 45 (`executar-direito-titular/helpers.ts:112`). */
const BUCKET_CURRICULOS = "curriculos";
/** Teto de itens por chamada de `remove`, idêntico ao do motor da Phase 45. */
const LIMITE_REMOCAO = 1000;
/** Teto de itens por página de `list`, e teto de páginas — a enumeração é de UM nível. */
const LIMITE_LISTAGEM = 100;
const MAX_PAGINAS = 50;

/** O SQLSTATE que `reivindicar_item_purga` levanta quando o encontro não confere. */
const SQLSTATE_RECUSA_REIVINDICACAO = "P46FB";
/** O terminador do dry-run do motor. Chegando no caminho REAL, é defeito grave. */
const SQLSTATE_DRY_RUN = "P45DR";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "SERVER_ERROR";

/** Vocabulário FECHADO dos desfechos que ESTA função pode gravar. */
type Desfecho = "ok" | "falha" | "nao_aplicavel";

/**
 * Os três sistemas, na ordem em que são tocados. O tipo existe porque o `catch`
 * genérico não consegue saber em qual deles a mutação parou — e essa é a única
 * pergunta que importa às 3 da manhã sobre um arquivo que não tem cópia de reserva.
 */
type Passo = "storage" | "postgres" | "auth";

// ---------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * ⚠ A resposta de erro NUNCA carrega a mensagem do banco. A recusa de
 * `reivindicar_item_purga` nomeia a condição que reprovou — texto útil para o log do
 * servidor e para quem investiga, e um ORÁCULO DE GRAÇA para quem forja um corpo.
 */
function errorResponse(code: ErrorCode, message: string, status: number): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}

// ---------------------------------------------------------------------------
// Deps injetáveis (os testes injetam mocks; sem rede, sem env)
// ---------------------------------------------------------------------------

export interface Deps {
  /**
   * ⚠ **UM ÚNICO CLIENT**, com a chave de serviço e **sem** cabeçalho
   * `Authorization` de usuário. A divisão de três clients da EF da Phase 45 não se
   * aplica porque não há titular; e acrescentar um `Authorization` aqui trocaria o
   * papel de todas as chamadas de uma vez, quebrando a remoção da conta do Auth.
   */
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  /** O segredo esperado no Bearer. Lido do ambiente pelo bootstrap; injetado nos testes. */
  segredoEsperado: string;
}

/** Falha ATRIBUÍDA a um passo. */
class ErroDePasso extends Error {
  constructor(readonly passo: Passo, readonly classe: string) {
    super(classe);
    this.name = "ErroDePasso";
  }
}

// ---------------------------------------------------------------------------
// Auto-autenticação
// ---------------------------------------------------------------------------

/**
 * Comparação em TEMPO CONSTANTE. ⚠ Divergência declarada do molde: `cost-alerter`
 * usa `!==` direto (`:112`). A diferença importa aqui porque esta função é
 * `verify_jwt = false` e destrói dado irreversível — um oráculo de temporização sobre
 * o segredo do Vault é o passo que falta entre "conhecer a URL" e "escolher quem é
 * apagado".
 *
 * ⚠ O comprimento vaza por construção (é o único jeito de comparar sem alocar), e
 * dizer isso é mais honesto que fingir que não. O que não vaza é o CONTEÚDO.
 */
function igualEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Storage — enumeração e remoção, SEMPRE pela Admin API
// ---------------------------------------------------------------------------

/**
 * Enumera os objetos sob o prefixo do titular. Clone estrutural de
 * `executar-direito-titular/helpers.ts:157-183`, inclusive na recusa diante de
 * subpasta: a enumeração é de UM nível, e seguir adiante deixaria PII para trás
 * enquanto o passo carimbava sucesso.
 *
 * ⚠ **É ESTA LISTAGEM QUE PEGA O BLOB ÓRFÃO**, e por construção: ela pergunta ao
 * BUCKET o que existe, em vez de perguntar ao Postgres o que deveria existir. O
 * `plano_exclusao_titular` devolve `storage_remove.objetos = NULL` com o motivo
 * escrito dentro do próprio retorno — não há caminho relacional do titular até os
 * objetos dele (SONDA 2: `storage.objects` não tem FK para `auth.users`).
 */
// deno-lint-ignore no-explicit-any
async function enumerarObjetos(admin: any, prefixo: string): Promise<string[]> {
  const pasta = prefixo.endsWith("/") ? prefixo.slice(0, -1) : prefixo;
  const caminhos: string[] = [];
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { data, error } = await admin.storage
      .from(BUCKET_CURRICULOS)
      .list(pasta, { limit: LIMITE_LISTAGEM, offset: pagina * LIMITE_LISTAGEM });
    if (error) throw new ErroDePasso("storage", "list");
    const linhas = (data ?? []) as Array<{ name?: unknown; id?: unknown }>;
    for (const l of linhas) {
      if (typeof l?.name !== "string" || l.name === "") continue;
      if (l.id === null) throw new ErroDePasso("storage", "subpasta_no_prefixo");
      caminhos.push(`${pasta}/${l.name}`);
    }
    if (linhas.length < LIMITE_LISTAGEM) return caminhos;
  }
  throw new ErroDePasso("storage", "excedeu_teto_de_paginas");
}

function dividirEmLotes<T>(itens: readonly T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

// ---------------------------------------------------------------------------
// Handler testável
// ---------------------------------------------------------------------------

export async function handler(req: Request, deps: Deps): Promise<Response> {
  // O preflight chega SEM `Authorization`: sem este short-circuit o guard abaixo
  // responderia 401 ao OPTIONS.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { supabaseAdmin, segredoEsperado } = deps;

  // ── 1 · AUTO-AUTENTICAÇÃO (T-46-05-01) ────────────────────────────────────
  // `verify_jwt = false`: o gateway NÃO autentica ninguém, e é a função que tem de
  // se autenticar sozinha. Virar a postura para `true` quebraria a invocação por
  // cron — `supabase/config.toml` declara que essa escolha é load-bearing.
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!bearer || !segredoEsperado || !igualEmTempoConstante(bearer, segredoEsperado)) {
    // ⚠ SEM O VALOR RECEBIDO NO LOG. Logar o segredo tentado é vazá-lo para quem lê
    // o log — e quem lê o log de uma função destrutiva não é necessariamente quem
    // pode acioná-la.
    // ⚠ A palavra do cabeçalho NÃO aparece nesta linha, e a razão é mecânica: a
    // asserção estática desta fase proíbe vocabulário de credencial adjacente a uma
    // chamada de log, e ela existe porque uma mensagem que fala de segredo é a
    // vizinha natural de uma que IMPRIME o segredo. "credencial" diz a mesma coisa e
    // custa zero informação de diagnóstico — o caminho de código já é único.
    console.warn("[purgar-retencao] requisicao recusada: credencial ausente ou divergente");
    return errorResponse("UNAUTHORIZED", "Não autorizado.", 401);
  }

  // ── 2 · O CORPO — ele SELECIONA, e não autoriza ───────────────────────────
  // Somente `item_id` e `candidato_id` são lidos, e só para serem entregues à RPC
  // de reivindicação. **Nenhum outro identificador do corpo é lido em lugar nenhum
  // desta função**, e dizer isso nominalmente é o que obriga a PRÓXIMA emenda a se
  // justificar sozinha.
  let itemId: unknown = null;
  let candidatoDoCorpo: unknown = null;
  try {
    const corpo = (await req.json()) as
      | { item_id?: unknown; candidato_id?: unknown }
      | null;
    itemId = corpo?.item_id ?? null;
    candidatoDoCorpo = corpo?.candidato_id ?? null;
  } catch {
    // Falha FECHADA: um corpo ilegível nunca escolhe um alvo por omissão.
    itemId = null;
    candidatoDoCorpo = null;
  }
  if (
    typeof itemId !== "string" || itemId === "" ||
    typeof candidatoDoCorpo !== "string" || candidatoDoCorpo === ""
  ) {
    return errorResponse("VALIDATION", "Requisição incompleta.", 400);
  }

  // ── PASSO 0 · REIVINDICAR — a única porta (T-46-05-02) ────────────────────
  // O banco reverifica o encontro inteiro e devolve o `candidato_id` DO ITEM.
  const reiv = await supabaseAdmin.rpc("reivindicar_item_purga", {
    p_item_id: itemId,
    p_candidato_id: candidatoDoCorpo,
  });
  if (reiv?.error) {
    const sqlstate = (reiv.error as { code?: unknown } | null)?.code;
    if (sqlstate === SQLSTATE_RECUSA_REIVINDICACAO) {
      console.warn("[purgar-retencao] reivindicacao recusada pelo banco (P46FB)");
      return errorResponse("FORBIDDEN", "Acesso negado.", 403);
    }
    // ⚠⚠ QUALQUER OUTRO ERRO É 500, JAMAIS 403. Um erro transitório disfarçado de
    // negativa de autorização é uma mentira sobre autorização, e é o tipo de
    // mentira que ninguém investiga (WR-04 / T-46-05-05).
    console.error("[purgar-retencao] falha ao reivindicar o item", { sqlstate });
    return errorResponse("SERVER_ERROR", "Falha ao reivindicar o item.", 500);
  }
  // "Não lançou" NUNCA foi o mesmo que "completou".
  const alvo = typeof reiv?.data === "string" ? reiv.data : null;
  if (!alvo) {
    console.error("[purgar-retencao] a reivindicacao nao devolveu identificador");
    return errorResponse("SERVER_ERROR", "Falha ao reivindicar o item.", 500);
  }

  // ⚠ DAQUI EM DIANTE, `alvo` — e SÓ ele. `candidatoDoCorpo` não é lido nem uma vez
  // abaixo desta linha; se algum dia for, esta função voltou a deixar o corpo da
  // requisição escolher quem é destruído.

  // ── A CONCLUSÃO É OBRIGATÓRIA A PARTIR DAQUI (T-46-05-08) ─────────────────
  // O item está reivindicado. Um item que fica aberto mantém viva a autorização do
  // 4º ramo do guard destrutivo até a janela de 1 h de HI-03 vencer — por isso tudo
  // o que vem abaixo roda dentro de um `try` cujo `finally` conclui o item.
  const desfechos: Record<Passo, Desfecho> = {
    storage: "nao_aplicavel",
    postgres: "nao_aplicavel",
    auth: "nao_aplicavel",
  };
  let arquivosApagados = 0;
  let falhaEm: Passo | null = null;
  let classeDaFalha: string | null = null;
  let semUserId = false;

  try {
    // ── PASSO 1 · O PLANO ───────────────────────────────────────────────────
    // Nunca escrever uma consulta nova para ENUMERAR o que apagar: a RPC já enumera
    // do catálogo as chaves estrangeiras para `auth.users`, incluindo o que uma
    // consulta à mão esquece.
    const plano = await supabaseAdmin.rpc("plano_exclusao_titular", {
      p_candidato_id: alvo,
    });
    if (plano?.error) throw new ErroDePasso("storage", "rpc_plano");
    const p = (plano?.data ?? null) as Record<string, unknown> | null;
    if (!p || typeof p !== "object") throw new ErroDePasso("storage", "plano_vazio");

    // ⚠ DESVIO 5 — O `authUid` VEM DO BANCO, E TEM DE SER LIDO ANTES DO TOMBSTONE.
    // No molde ele vinha do `sub` do JWT; aqui não há JWT. `plano_exclusao_titular`
    // devolve apenas `user_id_presente` (booleano), então a única fonte é a coluna —
    // e o PASSO 3 é justamente o statement que a severa. Lê-la depois devolveria
    // NULL sobre um titular que TINHA conta.
    const { data: cand, error: candErr } = await supabaseAdmin
      .from("candidatos")
      .select("user_id")
      .eq("id", alvo)
      .maybeSingle();
    if (candErr) throw new ErroDePasso("storage", "leitura_do_user_id");
    const authUid = typeof cand?.user_id === "string" ? cand.user_id : null;

    if (!authUid) {
      // ⚠ LIMITE DECLARADO, e ele é literalmente verdade em vez de conveniente.
      // Sem `user_id` não existe prefixo de Storage a derivar nem conta a apagar: a
      // SONDA 2 mediu que `storage.objects` não tem FK para `auth.users`, então não
      // há caminho relacional do candidato até os objetos dele. `nao_aplicavel`
      // aqui diz "não havia caminho a tentar", que é o fato.
      // ⚠ E o passo de Postgres AINDA RODA. Recusar a anonimização por isso deixaria
      // o titular preso num laço de purgas que nunca concluem — toda varredura o
      // selecionaria de novo, e toda invocação falharia igual.
      semUserId = true;
      console.warn("[purgar-retencao] titular sem user_id: Storage e Auth ficam nao_aplicavel");
    } else {
      // ── PASSO 2 · STORAGE (T-46-05-07) ────────────────────────────────────
      // ⚠ EXCLUSIVAMENTE pela Storage Admin API. Apagar por SQL removeria só o
      // metadado e orfanaria o blob PARA SEMPRE.
      const caminhos = await enumerarObjetos(supabaseAdmin, `${authUid}/`);
      for (const lote of dividirEmLotes(caminhos, LIMITE_REMOCAO)) {
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET_CURRICULOS)
          .remove(lote);
        if (error) throw new ErroDePasso("storage", "remove");
        const apagados = ((data ?? []) as Array<{ name?: unknown }>)
          .filter((o) => typeof o?.name === "string").length;
        arquivosApagados += apagados;
      }
      // ⚠ A CONFERÊNCIA É SOBRE O PÓS-ESTADO DO BUCKET, não sobre o valor de retorno
      // de uma chamada — a mesma troca que o CR-02 da Phase 45 obrigou. Resíduo
      // REPROVA o passo, e a retomada fica convergente.
      const restantes = await enumerarObjetos(supabaseAdmin, `${authUid}/`);
      if (restantes.length > 0) throw new ErroDePasso("storage", "residuo_no_bucket");
      // Zero objetos é SUCESSO, não erro: o laço simplesmente não roda.
      desfechos.storage = "ok";

      // ── PASSO 3 · POSTGRES ────────────────────────────────────────────────
      // A EF CHAMA a metade Postgres e não reimplementa NADA dela: toda a
      // atomicidade disponível está dentro daquela transação.
      const motor = await supabaseAdmin.rpc("anonimizar_candidato", {
        p_candidato_id: alvo,
        p_dry_run: false,
      });
      if (motor?.error) {
        const sqlstate = (motor.error as { code?: unknown } | null)?.code;
        // ⚠⚠ O SQLSTATE DO TERMINADOR DE DRY-RUN CHEGANDO NO CAMINHO REAL É DEFEITO
        // GRAVE, JAMAIS SUCESSO: a transação foi REVERTIDA e nada foi anonimizado.
        // Lê-lo como sucesso marcaria o item como concluído com 100% da PII intacta
        // e o currículo já apagado.
        throw new ErroDePasso(
          "postgres",
          sqlstate === SQLSTATE_DRY_RUN ? "dry_run_no_caminho_real" : "rpc_anonimizar",
        );
      }
      const resultado = (motor?.data as { resultado?: unknown } | null)?.resultado;
      if (resultado !== "anonimizado" && resultado !== "ja_anonimizado") {
        // "Não lançou" NÃO é "completou". O contrato da RPC é devolver um dos dois
        // resultados nomeados (lição do 42804 da Phase 43, que sobreviveu a um smoke
        // 10/10 verde).
        throw new ErroDePasso("postgres", "sem_resultado");
      }
      desfechos.postgres = "ok";

      // ── PASSO 4 · AUTH — o único passo sem volta ──────────────────────────
      // Só a Admin API remove de verdade, e depois dela não existe sessão nem tela a
      // quem responder.
      const del = await supabaseAdmin.auth.admin.deleteUser(authUid);
      if (del?.error) throw new ErroDePasso("auth", "delete_user");
      desfechos.auth = "ok";
    }

    if (semUserId) {
      // O caminho sem conta de Auth: só o Postgres é alcançável, e ele roda.
      const motor = await supabaseAdmin.rpc("anonimizar_candidato", {
        p_candidato_id: alvo,
        p_dry_run: false,
      });
      if (motor?.error) {
        const sqlstate = (motor.error as { code?: unknown } | null)?.code;
        throw new ErroDePasso(
          "postgres",
          sqlstate === SQLSTATE_DRY_RUN ? "dry_run_no_caminho_real" : "rpc_anonimizar",
        );
      }
      const resultado = (motor?.data as { resultado?: unknown } | null)?.resultado;
      if (resultado !== "anonimizado" && resultado !== "ja_anonimizado") {
        throw new ErroDePasso("postgres", "sem_resultado");
      }
      desfechos.postgres = "ok";
    }
  } catch (e) {
    // ⚠ A FALHA É ATRIBUÍDA A UM PASSO, e é isso que a torna útil: o `catch` genérico
    // não consegue dizer em qual dos três sistemas a mutação parou.
    if (e instanceof ErroDePasso) {
      falhaEm = e.passo;
      classeDaFalha = e.classe;
      desfechos[e.passo] = "falha";
    } else {
      // Um erro fora do vocabulário de passos é atribuído ao passo CORRENTE mais
      // conservador possível: o Postgres. Dizer `falha_storage` sem saber afirmaria
      // que o currículo pode ter sido destruído quando talvez nada tenha sido tocado.
      falhaEm = "postgres";
      classeDaFalha = "erro_nao_atribuido";
      if (desfechos.postgres !== "ok") desfechos.postgres = "falha";
    }
    console.error("[purgar-retencao] falha atribuida a um passo", {
      passo: falhaEm,
      classe: classeDaFalha,
    });
  } finally {
    // ── PASSO 5 · CONCLUIR — sempre, inclusive nos caminhos de falha ────────
    // ⚠ Este é o `UPDATE` que RETIRA a autorização do 4º ramo do guard. A janela de
    // destruição de um titular dura exatamente o tempo entre a reivindicação e esta
    // chamada.
    const fim = await supabaseAdmin.rpc("concluir_item_purga", {
      p_item_id: itemId,
      p_desfechos: desfechos,
    });
    if (fim?.error) {
      // ⚠ O mapeamento `P46FB → 403` vale EXCLUSIVAMENTE no passo 0. Aqui, qualquer
      // erro é falha de servidor: o item ficou ABERTO, e isso é grave o bastante para
      // aparecer no log com o nome certo.
      console.error("[purgar-retencao] O ITEM NAO FOI CONCLUIDO — autorizacao destrutiva segue viva ate a janela vencer", {
        sqlstate: (fim.error as { code?: unknown } | null)?.code,
      });
    }
  }

  if (falhaEm) {
    return errorResponse("SERVER_ERROR", "A purga deste titular falhou.", 500);
  }

  return jsonResponse({
    ok: true,
    desfechos,
    arquivos_apagados: arquivosApagados,
    // ⚠ Nenhum identificador de pessoa no corpo da resposta: quem chama é o cron, e
    // um `candidato_id` aqui só serviria para vazar no log de quem intermedeia.
    sem_conta_de_auth: semUserId,
  }, 200);
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (UM client de serviço a partir do env)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error("[purgar-retencao] Faltam variáveis de ambiente");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    // O Bearer esperado é o `edge_invoke_key` do Vault, que é o JWT de service_role —
    // o mesmo valor de `SUPABASE_SERVICE_ROLE_KEY`. O override explícito existe para
    // rotação sem trocar a chave de serviço (mesmo padrão de `cost-alerter`).
    const segredoEsperado = Deno.env.get("PURGAR_RETENCAO_SECRET") ?? SERVICE_KEY;

    // ⚠ UM ÚNICO CLIENT, e **SEM** `Authorization`: acrescentá-lo trocaria o papel de
    // TODAS as chamadas para `authenticated` de uma vez e `deleteUser` passaria a 403.
    // A autorização desta função vem do 4º ramo do guard, que reconhece um ESTADO —
    // não de claims, que são credenciais, e credencial é portável.
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, segredoEsperado });
  });
}
