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
 *   5. Leituras com projeção explícita — NUNCA a projeção com curinga ([[reference_select_star_leaks_pii]]).
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

/** Projeção de `candidaturas` (lista explícita, nunca curinga). */
interface CandidaturaRow {
  candidato_id: string;
  vaga_id: string;
}

/**
 * Os 19 campos do cadastro devolvidos ao hub (D-08), na ordem do contrato. Colunas medidas em
 * `information_schema.columns` (PROD, só nomes) no 52-09.
 */
export const CAMPOS_CADASTRO = [
  "nome_completo",
  "email",
  "cpf",
  "celular",
  "data_nascimento",
  "genero",
  "cep",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "estado",
  "linkedin_url",
  "linkedin",
  "instagram_url",
  "instagram",
  "como_conheceu",
  "como_conheceu_detalhes",
] as const;

type CampoCadastro = typeof CAMPOS_CADASTRO[number];
export type Cadastro = Record<CampoCadastro, string | null>;

/**
 * Projeção de `candidatos`: os 19 campos + `id`/`user_id`, que servem SÓ ao predicado do
 * tombstone e nunca saem no JSON.
 */
type CandidatoRow = { id: string; user_id: string | null } & Partial<Record<CampoCadastro, unknown>> & {
  email: string | null;
  data_nascimento: string | null;
};

const COLUNAS_CANDIDATO = ["id", "user_id", ...CAMPOS_CADASTRO].join(", ");

/** Os 4 campos de `disponibilidade` (por `candidato_id`; F12 — nomes medidos). */
const CAMPOS_DISPONIBILIDADE = [
  "periodo_disponivel",
  "regime_trabalho",
  "disponibilidade_imediata",
  "data_disponibilidade",
] as const;

export interface Disponibilidade {
  periodo_disponivel: string | null;
  regime_trabalho: string | null;
  disponibilidade_imediata: boolean | null;
  data_disponibilidade: string | null;
}

/** Resposta de uma pergunta da inscrição: só os campos preenchidos; `null` sem resposta. */
export interface RespostaInscricao {
  texto?: string;
  opcoes?: string[];
  numero?: number;
}

/** Item da inscrição (D-19): nunca a opção que elimina — só `eliminatoria: boolean`. */
export interface ItemInscricao {
  pergunta_id: string;
  bloco: string;
  ordem: number;
  texto_pergunta: string;
  tipo_resposta: string;
  eliminatoria: boolean;
  removida: boolean;
  resposta: RespostaInscricao | null;
}

interface PerguntaRow {
  id: string;
  bloco: string;
  ordem: number;
  texto_pergunta: string;
  tipo_resposta: string;
  deleted_at: string | null;
}

interface RespostaRow {
  pergunta_id: string;
  resposta_texto: string | null;
  resposta_opcoes: unknown;
  resposta_numerica: number | string | null;
}

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

/**
 * O cadastro como o candidato preencheu (D-08). `null` para o tombstone (F6: «01/01/1900 (126
 * anos)» seria dado falso e pista de exclusão). Nos fictícios `@invalido.local`, `email: null` —
 * nenhum endereço substituto sai; os outros campos (o celular inclusive) seguem, e a aba Cadastro
 * do 52-10 os mostra como texto, nunca como ação de contato (D-40).
 */
function montarCadastro(c: CandidatoRow): Cadastro | null {
  if (ehTombstone(c)) return null;
  const out = {} as Cadastro;
  for (const campo of CAMPOS_CADASTRO) {
    const v = c[campo];
    out[campo] = typeof v === "string" ? v : null;
  }
  if (semContato(c.email)) out.email = null;
  return out;
}

function montarDisponibilidade(row: Record<string, unknown> | null): Disponibilidade | null {
  if (!row) return null;
  return {
    periodo_disponivel: typeof row.periodo_disponivel === "string" ? row.periodo_disponivel : null,
    regime_trabalho: typeof row.regime_trabalho === "string" ? row.regime_trabalho : null,
    disponibilidade_imediata: typeof row.disponibilidade_imediata === "boolean"
      ? row.disponibilidade_imediata
      : null,
    data_disponibilidade: typeof row.data_disponibilidade === "string" ? row.data_disponibilidade : null,
  };
}

/**
 * `resposta_opcoes` (jsonb, array de textos) / `resposta_texto` / `resposta_numerica` →
 * `{ opcoes?, texto?, numero? }` com só o que foi preenchido; nada preenchido → `null`.
 */
function montarResposta(r: RespostaRow | undefined): RespostaInscricao | null {
  if (!r) return null;
  const out: RespostaInscricao = {};
  if (Array.isArray(r.resposta_opcoes)) {
    const opcoes = r.resposta_opcoes.filter((o): o is string => typeof o === "string" && o.trim() !== "");
    if (opcoes.length > 0) out.opcoes = opcoes;
  }
  if (typeof r.resposta_texto === "string" && r.resposta_texto.trim() !== "") out.texto = r.resposta_texto;
  if (r.resposta_numerica !== null && r.resposta_numerica !== undefined && r.resposta_numerica !== "") {
    const n = typeof r.resposta_numerica === "number" ? r.resposta_numerica : Number(r.resposta_numerica);
    if (Number.isFinite(n)) out.numero = n;
  }
  return Object.keys(out).length > 0 ? out : null;
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

    const tombstone = ehTombstone(pessoa);
    const contato = montarContato(pessoa);
    const cadastro = montarCadastro(pessoa);

    // ── 7. Disponibilidade (sem linha → null). `candidato_id` não é único na tabela: a mais
    //      recente vence. O tombstone não tem disponibilidade a mostrar (a limpeza da 51-23
    //      apagou as linhas; uma remanescente seria dado de titular removido).
    let disponibilidade: Disponibilidade | null = null;
    if (!tombstone) {
      const { data: dispRaw, error: dispErr } = await supabaseAdmin
        .from("disponibilidade")
        .select(CAMPOS_DISPONIBILIDADE.join(", "))
        .eq("candidato_id", candidatura.candidato_id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (dispErr) return falhaServidor(candidaturaId, "disponibilidade");
      const linhas = Array.isArray(dispRaw) ? dispRaw as Array<Record<string, unknown>> : [];
      disponibilidade = montarDisponibilidade(linhas[0] ?? null);
    }

    // ── 8. Inscrição (D-19): perguntas da vaga em `ordem` ASC × respostas DESTA candidatura.
    //      As removidas (`deleted_at`) entram só se esta candidatura as respondeu, marcadas
    //      `removida`. `eliminatoria` = existe metadata `knockout` para a pergunta — a opção
    //      que elimina NUNCA é lida nem devolvida.
    const { data: pergRaw, error: pergErr } = await supabaseAdmin
      .from("perguntas_formulario")
      .select("id, bloco, ordem, texto_pergunta, tipo_resposta, deleted_at")
      .eq("vaga_id", candidatura.vaga_id)
      .order("ordem", { ascending: true });
    if (pergErr) return falhaServidor(candidaturaId, "perguntas");
    const perguntas = Array.isArray(pergRaw) ? pergRaw as PerguntaRow[] : [];

    const { data: respRaw, error: respErr } = await supabaseAdmin
      .from("respostas_formulario")
      .select("pergunta_id, resposta_texto, resposta_opcoes, resposta_numerica")
      .eq("candidatura_id", candidaturaId);
    if (respErr) return falhaServidor(candidaturaId, "respostas");
    const respostas = new Map<string, RespostaRow>();
    for (const r of (Array.isArray(respRaw) ? respRaw as RespostaRow[] : [])) respostas.set(r.pergunta_id, r);

    const eliminatorias = new Set<string>();
    if (perguntas.length > 0) {
      const { data: metaRaw, error: metaErr } = await supabaseAdmin
        .from("pergunta_opcao_metadata")
        .select("pergunta_id")
        .in("pergunta_id", perguntas.map((p) => p.id))
        .eq("tag", "knockout");
      if (metaErr) return falhaServidor(candidaturaId, "metadata");
      for (const m of (Array.isArray(metaRaw) ? metaRaw as Array<{ pergunta_id: string }> : [])) {
        eliminatorias.add(m.pergunta_id);
      }
    }

    const inscricao: ItemInscricao[] = [];
    for (const p of [...perguntas].sort((a, b) => a.ordem - b.ordem)) {
      const resposta = montarResposta(respostas.get(p.id));
      const removida = p.deleted_at !== null && p.deleted_at !== undefined;
      if (removida && resposta === null) continue;
      inscricao.push({
        pergunta_id: p.id,
        bloco: p.bloco,
        ordem: p.ordem,
        texto_pergunta: p.texto_pergunta,
        tipo_resposta: p.tipo_resposta,
        eliminatoria: eliminatorias.has(p.id),
        removida,
        resposta,
      });
    }

    // Log redigido (D-11) — só ids e papel; NUNCA um valor do candidato.
    console.log(`${LOG_TAG} ok`, { candidatura_id: candidaturaId, rh_user_id: user.id, role });

    return jsonResponse(
      {
        ok: true,
        vaga_titulo: vagaTitulo,
        contato,
        cadastro,
        disponibilidade,
        inscricao,
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
