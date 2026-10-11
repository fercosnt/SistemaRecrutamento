/**
 * Edge Function: ler-cadastro-candidato-rh
 *
 * Phase 52 / Plan 52-09 — JORN-53, JORN-54 (D-08..D-11, D-16, D-40). O caminho de SERVIDOR dos
 * dados pessoais do hub do RH. Uma leitura direta do cliente liberada por RLS não gera log
 * nenhum (D-11); por isso o contato do candidato chega ao hub por aqui, e cada leitura
 * bem-sucedida escreve UMA linha de log com ids e papel — nunca um valor.
 *
 * Esqueleto clonado do `get-curriculo-url` (mesma autorização, mesmo two-client):
 *   1. AUTHENTICATE: supabaseUser (anon + Authorization) → auth.getUser() (401 se não houver).
 *   2. AUTHORIZE: a linha VIVA de `usuarios_rh` do chamador (`ativo = true`, `deleted_at IS
 *      NULL`) via supabaseAdmin; recrutador→rh, administrador→administrador; qualquer outra
 *      coisa → 403. É a ÚNICA autorização (Phase 50 / D-01, D-02 — o equivalente em EF de
 *      `is_active_rh_user()`). O papel NÃO vem de getUser().app_metadata.
 *   3. INPUT: `{ candidatura_id }` uuid (400).
 *   4. Candidatura VIVA (`deleted_at IS NULL`, `is_rascunho = false` — o ramo rh de
 *      `rh_le_candidaturas`); ausente, excluída e rascunho dão o MESMO 404 (nada distingue).
 *   5. Leituras com projeção explícita — NUNCA select('*') ([[reference_select_star_leaks_pii]]).
 *
 * ── Registro sem contato (D-16 refinada pela D-40; JORN-53; ROADMAP SC2) ──────────────
 *   TODO registro cujo e-mail termina em `@invalido.local` (depois de trim, sem diferenciar
 *   caixa) sai com `contato: null` — o tombstone de anonimização E os seis fictícios das
 *   migrations 20260830000005/20260905000002, que TÊM celular gravado. A regra é o registro
 *   ser fictício/anonimizado, não a falta de telefone. Nenhum endereço substituto nem causa sai
 *   daqui. Decidido num lugar só: `semContato()`.
 *
 * ── Log (D-11, Pitfall 11) ────────────────────────────────────────────────────────────
 *   Sucesso: console.log('[ler-cadastro-candidato-rh] ok', { candidatura_id, rh_user_id, role }).
 *   Erro:    console.error('[ler-cadastro-candidato-rh] erro', { candidatura_id, codigo }) com
 *            `codigo` FIXO da etapa — nunca a `message` do PostgREST (pode carregar valor).
 *
 * Deploy: `node efdeploy.cjs` com verify_jwt = true (slug no grupo «invocadas pelo navegador»).
 *   O deploy é do 52-15, depois do review bloqueante do bloco B — não deste plano.
 *
 * @module supabase/functions/ler-cadastro-candidato-rh
 * @see supabase/functions/get-curriculo-url/index.ts (o esqueleto clonado)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS + response helpers (clonados do get-curriculo-url)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}

const LOG_TAG = "[ler-cadastro-candidato-rh]";

/**
 * Falha de servidor numa etapa: loga SÓ o id e um código fixo da etapa (nunca a `message` do
 * PostgREST, que pode carregar valor da linha) e responde 500 com mensagem fixa.
 */
function falhaServidor(candidaturaId: string | null, codigo: string): Response {
  console.error(`${LOG_TAG} erro`, { candidatura_id: candidaturaId, codigo });
  return errorResponse("SERVER_ERROR", "Falha ao carregar os dados do candidato.", 500);
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

/** Projeção de `candidaturas` (nunca select('*')). */
interface CandidaturaRow {
  candidato_id: string;
  vaga_id: string;
}

/** Projeção de `candidatos`. `id`/`user_id` servem só ao predicado do tombstone — nunca saem. */
interface CandidatoRow {
  id: string;
  user_id: string | null;
  email: string | null;
  celular: string | null;
  data_nascimento: string | null;
}

const COLUNAS_CANDIDATO = "id, user_id, email, celular, data_nascimento";

/** Contrato de contato devolvido ao hub (cabeçalho do 52-23). */
export interface Contato {
  email: string | null;
  celular: string | null;
}

/**
 * Registro fictício ou anonimizado (D-40): e-mail que, depois de `trim().toLowerCase()`,
 * termina em `@invalido.local`. Vale para o tombstone e para os seis fictícios — mesmo com
 * celular gravado. Único lugar que decide «sem contato».
 */
export function semContato(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  return email.trim().toLowerCase().endsWith("@invalido.local");
}

/**
 * Tombstone de anonimização pelo predicado do motor (verbatim de
 * `51-23-COMANDO-APPLY.sh:34`): `c.email = 'anonimizado+' || c.id::text || '@invalido.local'
 * and c.user_id is null and c.data_nascimento = date '1900-01-01'`.
 */
export function ehTombstone(c: CandidatoRow): boolean {
  return c.user_id === null &&
    c.email === `anonimizado+${c.id}@invalido.local` &&
    c.data_nascimento === "1900-01-01";
}

function textoOuNulo(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** O contato que o hub pode oferecer — `null` para todo registro fictício/anonimizado. */
function montarContato(c: CandidatoRow): Contato | null {
  if (semContato(c.email)) return null;
  return { email: textoOuNulo(c.email), celular: textoOuNulo(c.celular) };
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Testable handler: recebe `deps` injetados. `Deno.serve` (embaixo) monta o two-client real a
 * partir do env + Authorization e delega aqui.
 */
export async function handler(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("SERVER_ERROR", "Método não suportado", 405);

  const { supabaseAdmin, supabaseUser } = deps;

  // ── 1. AUTHENTICATE (two-client D-23 — auth.getUser via anon client) ────────
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;

  // ── 2. AUTHORIZE: a linha VIVA do chamador em usuarios_rh, ANTES de qualquer leitura
  //      privilegiada (autenticar não basta — a EF lê com service_role, que ignora a RLS).
  const { data: rhRow, error: rhErr } = await supabaseAdmin
    .from("usuarios_rh")
    .select("role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  // Erro de banco não vira 403 enganoso (WR-04 do get-curriculo-url).
  if (rhErr) return falhaServidor(null, "usuarios_rh");
  const dbRole = (rhRow?.role as string | undefined) ?? null;
  const role = dbRole === "recrutador"
    ? "rh"
    : dbRole === "administrador"
      ? "administrador"
      : dbRole;
  if (role !== "rh" && role !== "administrador") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }

  // ── 3. Corpo: `candidatura_id` uuid ──────────────────────────────────────────
  let candidaturaId: string;
  try {
    const raw = await req.json();
    const id = (raw as { candidatura_id?: unknown })?.candidatura_id;
    if (typeof id !== "string" || id.trim() === "") {
      return errorResponse("VALIDATION", "candidatura_id é obrigatório.");
    }
    if (!UUID_RE.test(id.trim())) {
      return errorResponse("VALIDATION", "candidatura_id inválido.");
    }
    candidaturaId = id.trim();
  } catch {
    return errorResponse("VALIDATION", "Corpo da requisição inválido (JSON malformado).");
  }

  try {
    // ── 4. Candidatura VIVA — ausente, excluída e rascunho dão o mesmo 404 ─────
    const { data: candRaw, error: candErr } = await supabaseAdmin
      .from("candidaturas")
      .select("candidato_id, vaga_id")
      .eq("id", candidaturaId)
      .is("deleted_at", null)
      .eq("is_rascunho", false)
      .maybeSingle();
    if (candErr) return falhaServidor(candidaturaId, "candidatura");
    const candidatura = (candRaw ?? null) as CandidaturaRow | null;
    if (!candidatura) {
      return errorResponse("NOT_FOUND", "Candidatura não encontrada.", 404);
    }

    // ── 5. Candidato (projeção explícita) ──────────────────────────────────────
    const { data: pessoaRaw, error: pessoaErr } = await supabaseAdmin
      .from("candidatos")
      .select(COLUNAS_CANDIDATO)
      .eq("id", candidatura.candidato_id)
      .maybeSingle();
    if (pessoaErr) return falhaServidor(candidaturaId, "candidato");
    const pessoa = (pessoaRaw ?? null) as CandidatoRow | null;
    if (!pessoa) {
      return errorResponse("NOT_FOUND", "Candidatura não encontrada.", 404);
    }

    // ── 6. Título da vaga (para as frases de contato do 52-23) ─────────────────
    const { data: vagaRaw, error: vagaErr } = await supabaseAdmin
      .from("vagas")
      .select("titulo")
      .eq("id", candidatura.vaga_id)
      .maybeSingle();
    if (vagaErr) return falhaServidor(candidaturaId, "vaga");
    const vagaTitulo = textoOuNulo((vagaRaw as { titulo?: unknown } | null)?.titulo);

    const contato = montarContato(pessoa);

    // Log redigido (D-11) — só ids e papel; NUNCA um valor do candidato.
    console.log(`${LOG_TAG} ok`, { candidatura_id: candidaturaId, rh_user_id: user.id, role });

    return jsonResponse(
      {
        ok: true,
        vaga_titulo: vagaTitulo,
        contato,
        cadastro: null,
        disponibilidade: null,
        inscricao: [],
      },
      200,
    );
  } catch {
    // NUNCA a mensagem da exceção (pode carregar valor) — só o id e o código fixo.
    return falhaServidor(candidaturaId, "excecao");
  }
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (two-client a partir do env + Authorization)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // CORS preflight ANTES da guarda de Authorization (o browser manda OPTIONS sem ela).
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error(`${LOG_TAG} Faltam variáveis de ambiente`);
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
    }

    // anon client COM Authorization → auth.getUser() verifica o JWT do RH.
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    // service_role SÓ para as leituras privilegiadas (D-23).
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, { supabaseAdmin, supabaseUser });
  });
}
