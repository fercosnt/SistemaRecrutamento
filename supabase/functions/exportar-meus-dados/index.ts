/**
 * Edge Function: exportar-meus-dados
 *
 * Phase 44 / Plano 44-05 — EXPORT-01 + EXPORT-02. O caminho pelo qual o titular
 * exerce o direito de acesso do Art. 18, II: um clique em `/candidato/privacidade`
 * e um arquivo no aparelho dele. Esta função é o lado servidor desse caminho.
 *
 * Clone ESTRUTURAL de `get-curriculo-url/index.ts` (D-23 two-client,
 * authenticate-THEN-authorize, `Deps` injetável, import estático de esm.sh),
 * com CINCO desvios nomeados — cada um comentado no ponto em que acontece:
 *
 *   | # | No molde                                  | Aqui                                                    |
 *   |---|-------------------------------------------|---------------------------------------------------------|
 *   | 1 | passo 2 lê `usuarios_rh.role` (rh/admin)  | passo 2 resolve `candidatos.id` de `auth.uid()`; o RH    |
 *   |   |                                           | NÃO usa este endpoint                                    |
 *   | 2 | valida `{ candidatura_id }` com UUID_RE   | o corpo do request NÃO é lido — não há id a receber      |
 *   | 3 | uma leitura de `candidaturas`             | N leituras por allowlist + o INSERT/UPDATE do registro   |
 *   | 4 | `ErrorCode` de 5 valores                  | + `"COOLDOWN"` (429) — código próprio, nunca 403         |
 *   | 5 | minta signed URL do CV                    | NÃO minta URL nenhuma (BD-7: o CV vai pelo cliente)      |
 *
 * ── OS SETE PASSOS, E A ORDEM É O REQUISITO ─────────────────────────────────
 *   1. AUTHENTICATE  — `supabaseUser.auth.getUser()`; sem sessão → 401.
 *   2. AUTHORIZE     — resolve o titular; erro de query → 500, ausência → 403.
 *   3. COOLDOWN      — última linha de `solicitacoes_dados`; < 24 h → 429.
 *   4. REGISTRA      — INSERT `pendente` ANTES da montagem (Pitfall 4).
 *   5. PROJETA       — allowlist explícita por tabela, do artefato gerado.
 *   6. MARCA         — UPDATE `atendido` + `atendido_em`.
 *   7. RESPONDE      — 200 `{ ok, versao_allowlist, gerado_em, payload }`.
 *
 * ── POR QUE O PASSO 4 VEM ANTES DO 5 (e não é detalhe de implementação) ─────
 * Se a montagem viesse primeiro, um pedido que quebrou não deixaria linha — e a
 * fila de supervisão do RH, cujo valor inteiro está na FALHA (o caminho feliz é
 * automático), ficaria vazia exatamente quando importa. Pior: o cooldown não
 * morderia no caminho que falhou, e o endpoint viraria amplificador de
 * exfiltração para quem soubesse fazê-lo falhar.
 *
 * ── AUTHENTICATE ≠ AUTHORIZE (landmine P10/P11) ─────────────────────────────
 * O payload é lido com `service_role`, que bypassa RLS. O passo 2 é o ÚNICO
 * controle entre um autenticado qualquer e os dados de um candidato — e ele roda
 * ANTES de qualquer leitura privilegiada.
 *
 * Import discipline: `createClient` entra por import estático de esm.sh — nunca a
 * forma construída em runtime, que escondeu o pacote do bundler e produziu
 * ERR_MODULE_NOT_FOUND em P10-13.
 *
 * A allowlist entra pelo ESPELHO TypeScript gerado (ver o import abaixo), não pelo
 * `.json` de `docs/compliance/`: import de JSON cross-diretório é a assunção A1 da
 * 44-RESEARCH e pode não sobreviver ao bundler do `functions deploy`. O espelho foi
 * gerado exatamente para eliminar essa dependência de resolução (T-44-25).
 *
 * Deploy: `supabase functions deploy exportar-meus-dados` — **JWT-ON**, nunca
 *   `--no-verify-jwt`: a função é autenticada por desenho.
 *
 * @module supabase/functions/exportar-meus-dados
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EXPORT_ALLOWLIST } from "../_shared/exportAllowlist.ts";

// ---------------------------------------------------------------------------
// CORS + response helpers (copiados verbatim do molde)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * DESVIO 4 — `COOLDOWN` é valor NOVO em relação ao molde, e existe por uma razão
 * de interface: recusar por limite de 24 h não é falta de sessão (401), não é
 * falta de permissão (403) e não é input inválido (400). Traduzi-lo para 403
 * obrigaria a UI a adivinhar qual 403 é qual — e a copy de cooldown é a única que
 * carrega uma hora de liberação.
 */
type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "COOLDOWN";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
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

/** A janela do cooldown, em ms. Vive na TABELA, nunca em memória (44-CONTEXT §Área 1). */
const JANELA_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** A forma de cada entrada do artefato gerado — o contrato que o código consome. */
interface DefinicaoTabela {
  chave_titular: string;
  colunas: readonly string[];
  /** `"direta"` ou `"via:<tabela-ponte>"`. */
  ligacao: string;
}

const TABELAS = EXPORT_ALLOWLIST.tabelas as unknown as Record<string, DefinicaoTabela>;

/**
 * A coluna pela qual uma tabela se liga ao titular — **DADO do artefato, nunca
 * inferência do código.**
 *
 * Inferir por nome (`*_id`, "termina em candidato") é exatamente como uma tabela
 * nova entra lendo a linha errada: o 44-03 já registrou DUAS colunas que uma regra
 * por sufixo não pegaria (`redacoes_candidato.referencia_match`, ponteiro para
 * candidaturas de OUTRAS pessoas, e `agendamentos_entrevista.entrevistador`, o nome
 * de um funcionário). Uma tabela sem declaração no artefato falha FECHADO.
 */
export function chaveDoTitular(tabela: string): string {
  const chave = TABELAS[tabela]?.chave_titular;
  if (!chave) {
    throw new Error(`tabela fora do artefato de allowlist: ${tabela}`);
  }
  return chave;
}

/** A tabela-ponte de uma ligação indireta (`"via:candidaturas"` → `"candidaturas"`). */
function pontePara(def: DefinicaoTabela): string | null {
  if (def.ligacao === "direta") return null;
  const [prefixo, ponte] = def.ligacao.split(":");
  if (prefixo !== "via" || !ponte) {
    throw new Error(`ligação não reconhecida no artefato: ${def.ligacao}`);
  }
  return ponte;
}

/**
 * Handler testável: recebe `deps` injetados. O `Deno.serve` (no fim do arquivo)
 * monta o two-client real a partir do env + do header Authorization e delega aqui.
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

  // ── 2 · AUTHORIZE — DESVIO 1 -----------------------------------------------
  //      O molde pergunta "esta pessoa é RH?"; aqui a pergunta é "quem é o
  //      titular?", e a resposta sai de `auth.uid()`. O RH não usa este endpoint:
  //      dar-lhe um caminho para baixar a cópia de um candidato abriria uma
  //      segunda superfície de exfiltração (Invariante 5 da 44-UI-SPEC).
  //
  //      DESVIO 2 — **o corpo do request não é lido em lugar nenhum desta
  //      função.** Não há id a receber, e qualquer id vindo do cliente seria a
  //      superfície de Tampering T-32-03 / T-44-02. Um corpo que não é lido é um
  //      corpo que não pode ser forjado.
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

  // ── 3 · COOLDOWN — o SERVIDOR é a autoridade (Invariante 3 da 44-UI-SPEC) ──
  //      O cliente nunca decide se um pedido é permitido. O `liberado_em` no corpo
  //      é o que a UI renderiza: ele existe para que a copy do servidor e a do
  //      cliente sejam a MESMA frase, com a MESMA hora.
  const { data: ultimo, error: ultimoErr } = await supabaseAdmin
    .from("solicitacoes_dados")
    .select("solicitado_em")
    .eq("candidato_id", candidatoId)
    .eq("tipo", "acesso")
    .order("solicitado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultimoErr) {
    return errorResponse("SERVER_ERROR", "Falha ao verificar pedidos anteriores.", 500);
  }
  if (ultimo?.solicitado_em) {
    const solicitadoEm = new Date(ultimo.solicitado_em).getTime();
    // ⚠ FECHA no ilegível. Enquanto isto era `Number.isFinite(...) && ...`, um
    // `solicitado_em` que não parseasse fazia o guard ser PULADO e o pedido
    // seguir — um controle de segurança cujo ramo de entrada-ilegível é "permitir".
    // É a mesma forma do defeito `NOT IN`/NULL que a migration desta fase
    // (`20260804000002:242-247`) chama de "REAL, medido na 42-06". Um marco que
    // não sabemos ler não é um marco expirado.
    if (!Number.isFinite(solicitadoEm)) {
      return errorResponse("SERVER_ERROR", "Falha ao verificar pedidos anteriores.", 500);
    }
    if (Date.now() - solicitadoEm < JANELA_COOLDOWN_MS) {
      return jsonResponse(
        {
          ok: false,
          error_code: "COOLDOWN" satisfies ErrorCode,
          liberado_em: new Date(solicitadoEm + JANELA_COOLDOWN_MS).toISOString(),
        },
        429,
      );
    }
  }

  // ── 4 · REGISTRA ANTES DE MONTAR (Pitfall 4) ──────────────────────────────
  //      Ver o docblock do módulo: a ordem é o requisito, não o efeito.
  const { data: pedido, error: insErr } = await supabaseAdmin
    .from("solicitacoes_dados")
    .insert({ candidato_id: candidatoId, tipo: "acesso", situacao: "pendente" })
    .select("id")
    .single();
  if (insErr || !pedido?.id) {
    return errorResponse("SERVER_ERROR", "Falha ao registrar o pedido.", 500);
  }
  const pedidoId: string = pedido.id;

  try {
    // ── 5 · PROJETA por ALLOWLIST EXPLÍCITA ─────────────────────────────────
    //      [[reference_select_star_leaks_pii]] — a classe de vulnerabilidade nº 1
    //      deste projeto, com dois incidentes anteriores. NENHUMA leitura daqui
    //      usa projeção total: a lista de colunas de cada tabela vem do artefato
    //      gerado, e o `--check` do gerador é quem impede que ela e o arquivo
    //      entregue divirjam.
    //
    //      DESVIO 3 — o molde faz UMA leitura; aqui são N, em duas passadas:
    //      as ligações DIRETAS primeiro (é a passada que produz os ids da ponte),
    //      as INDIRETAS depois. Duas passadas, e não a ordem do artefato, porque a
    //      ordem alfabética põe `agendamentos_entrevista` (indireta) antes de
    //      `candidaturas` (a ponte) — depender dela seria depender de um acidente
    //      de ordenação do gerador.
    const payload: Record<string, unknown[]> = {};

    for (const [tabela, def] of Object.entries(TABELAS)) {
      if (pontePara(def) !== null) continue;
      const { data, error } = await supabaseAdmin
        .from(tabela)
        .select(def.colunas.join(", "))
        .eq(chaveDoTitular(tabela), candidatoId);
      if (error) throw new Error(`leitura de ${tabela}`);
      payload[tabela] = (data ?? []) as unknown[];
    }

    for (const [tabela, def] of Object.entries(TABELAS)) {
      const ponte = pontePara(def);
      if (ponte === null) continue;
      const linhasDaPonte = payload[ponte];
      if (!linhasDaPonte) {
        // Falha FECHADA: sem a ponte lida não há como escopar esta tabela ao
        // titular, e ler sem escopo é o vazamento que a função existe para evitar.
        throw new Error(`ponte ${ponte} ausente para ${tabela}`);
      }
      const ids = linhasDaPonte
        .map((linha) => (linha as { id?: unknown }).id)
        .filter((id): id is string => typeof id === "string");
      // ⚠ FALHA FECHADA: ponte COM linhas que não produz id nenhum é defeito
      // ESTRUTURAL, nunca "o titular não tem candidatura". Sem esta guarda os dois
      // casos produzem o MESMO `[]` silencioso — e se `candidaturas.id` sair da
      // projeção, ou uma ponte futura tiver PK com outro nome, as 18 tabelas de
      // ligação indireta voltam VAZIAS e a cópia se apresenta como completa. Sem
      // erro, sem log, sem teste vermelho: o caso vazio é um ramo legítimo.
      if (linhasDaPonte.length > 0 && ids.length === 0) {
        throw new Error(`ponte ${ponte} não produziu ids para ${tabela}`);
      }
      if (ids.length === 0) {
        // Sem candidatura nenhuma não há o que ler — e N round-trips vazios seriam
        // custo sem informação. O bloco existe no payload, vazio, dizendo a verdade.
        payload[tabela] = [];
        continue;
      }
      const { data, error } = await supabaseAdmin
        .from(tabela)
        .select(def.colunas.join(", "))
        .in(chaveDoTitular(tabela), ids);
      if (error) throw new Error(`leitura de ${tabela}`);
      payload[tabela] = (data ?? []) as unknown[];
    }

    // ── 6 · MARCA o pedido como atendido ────────────────────────────────────
    const atendidoEm = new Date().toISOString();
    const { error: marcaErr } = await supabaseAdmin
      .from("solicitacoes_dados")
      .update({ situacao: "atendido", atendido_em: atendidoEm })
      .eq("id", pedidoId);
    if (marcaErr) {
      // A cópia FOI entregue; só o carimbo falhou. Não vira 500 — vira SINAL.
      // Descartar o erro deixava a linha `pendente` com `causa = NULL`, e a fila
      // do RH então renderiza "Motivo não registrado." + "Atender pelo Encarregado
      // de Dados" para um pedido que foi atendido: o operador é despachado atrás
      // de trabalho que não existe, contra um relógio de 15 dias.
      console.error("[exportar-meus-dados] marca de atendido falhou", { pedido_id: pedidoId });
    }

    // ⚠ O bloco `solicitacoes_dados` foi projetado no passo 5, ANTES da marca —
    // então a linha do pedido que está sendo servido AGORA foi lida como
    // `pendente`/`atendido_em: null`. Sem esta correção, o arquivo que a pessoa
    // acabou de baixar com sucesso contém um registro afirmando que o próprio
    // pedido que o gerou ficou sem atendimento. Numa peça de compliance cuja
    // premissa inteira é honestidade, isso é uma linha auto-desmentida.
    //
    // Só é aplicado quando a marca DEU CERTO: se ela falhou, a linha no banco
    // continua `pendente`, e afirmar `atendido` na cópia seria trocar uma
    // afirmação falsa por outra.
    if (!marcaErr) {
      payload.solicitacoes_dados = (payload.solicitacoes_dados ?? []).map((linha) =>
        (linha as { id?: unknown }).id === pedidoId
          ? { ...(linha as Record<string, unknown>), situacao: "atendido", atendido_em: atendidoEm }
          : linha
      );
    }

    // ── 7 · RESPONDE ────────────────────────────────────────────────────────
    //      DESVIO 5 — nenhuma URL assinada é cunhada nem devolvida. O CV do
    //      titular é aberto pelo cliente (BD-7, plano 44-07); o payload carrega,
    //      no máximo, o caminho de Storage que a allowlist já decidiu exportar —
    //      nunca um link (Invariante 4 da 44-UI-SPEC).
    return jsonResponse(
      {
        ok: true,
        versao_allowlist: EXPORT_ALLOWLIST.meta.versao,
        gerado_em: new Date().toISOString(),
        payload,
      },
      200,
    );
  } catch {
    // A linha PERMANECE `pendente` e ganha causa: o único pedido que consome prazo
    // é o que falhou, e é ele que a fila do RH existe para mostrar.
    const { error: causaErr } = await supabaseAdmin
      .from("solicitacoes_dados")
      .update({ situacao: "pendente", causa: "falha_geracao" })
      .eq("id", pedidoId);
    // Log REDIGIDO: só o id do pedido. Nunca o payload, nunca o corpo do request,
    // nunca uma URL. A allowlist de log é POR Edge Function e não se importa da
    // vizinha (lição do 42-07).
    console.error("[exportar-meus-dados] erro", { pedido_id: pedidoId });
    if (causaErr) {
      // Sem isto a causa se perde inteira e a linha fica indistinguível de uma
      // marca de sucesso que falhou — os dois desfechos convergem para
      // `pendente` + `causa NULL`, e a divergência é inobservável dos dois lados.
      console.error("[exportar-meus-dados] registro da causa falhou", { pedido_id: pedidoId });
    }
    return errorResponse("SERVER_ERROR", "Falha ao preparar a cópia.", 500);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // Preflight ANTES do guard de Authorization — o browser manda OPTIONS SEM
    // Authorization; sem este short-circuit o guard devolveria 401 no preflight e
    // o browser bloquearia a chamada por CORS.
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error("[exportar-meus-dados] Faltam variáveis de ambiente");
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
    // service_role SÓ para as leituras privilegiadas e o registro (D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
