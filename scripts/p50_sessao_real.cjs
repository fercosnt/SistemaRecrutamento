#!/usr/bin/env node
'use strict';
/*
 * p50_sessao_real.cjs — Phase 50 / Plano 50-11: a metade «sessão REAL» do SC1.
 *
 * O QUE PROVA. Um recrutador de verdade (RH2, papel `recrutador`, criado pelo operador em
 * /rh/configuracoes, sem nenhuma vaga de autoria própria) entra pelo MESMO caminho do front e:
 *   1. recebe um JWT com `app_metadata.role = 'rh'`;
 *   2. vê as candidaturas de uma vaga `ativa`, uma `inativa` e uma `arquivada` — em cada uma, a
 *      vaga não excluída com mais candidaturas vivas — e cada contagem é IGUAL à do banco, > 0;
 *   3. recebe das filas (`listar_pedidos_dados(true)`, `contar_pedidos_dados_pendentes()`,
 *      `listar_revisoes_decisao(true)`, `contar_revisoes_pendentes()`) as MESMAS contagens que o
 *      administrador recebe, medidas como postgres no mesmo minuto;
 *   4. obtém da Edge Function `get-curriculo-url` uma URL assinada para o currículo de uma
 *      candidatura viva de vaga que ele NÃO criou.
 * O lado «banco» é lido por `node p46apply.cjs sql "set transaction read only; …"` (só leitura;
 * as filas do administrador são as próprias RPCs chamadas com claims de administrador dentro da
 * transação só-leitura). O banco é lido duas vezes — antes e depois da sessão — e uma mudança no
 * meio é FALHA (`estabilidade`), não um número a interpretar.
 *
 * REGRAS DE SEGREDO (por construção, conferidas pelo --auto-teste):
 *   · só a chave PÚBLICA (anon/publishable) do front e o token do PRÓPRIO usuário. Nenhuma chave
 *     privilegiada é lida, citada ou aceita: se a chave do front não for a pública, o script recusa;
 *   · do arquivo de ambiente do Vite são lidas SÓ as duas variáveis públicas do front
 *     (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY); qualquer outra linha é ignorada sem ser guardada;
 *   · e-mail, senha e token ficam em memória e NUNCA são impressos. Toda linha passa por uma
 *     blindagem que redige o e-mail, a senha, qualquer janela de 12 caracteres do token, qualquer
 *     coisa com cara de e-mail, de JWT ou de URL — e uma redação é ela mesma uma FALHA
 *     (`blindagem`): significa defeito do script, e a saída avisa;
 *   · nenhum dado de candidato: o que sai são ids, contagens, booleanos e status HTTP. Das filas
 *     só se conta o número de linhas; da Edge Function só se confere que veio uma URL — a URL não
 *     é guardada nem impressa.
 *
 * COMO O OPERADOR RODA (no PRÓPRIO terminal, na raiz do repositório — nunca no chat):
 *
 *     read -s P50_RH2_SENHA; export P50_RH2_SENHA
 *     P50_RH2_EMAIL=<email do RH2> node scripts/p50_sessao_real.cjs
 *     unset P50_RH2_SENHA
 *
 *   (o `read -s` não ecoa: digite a senha e Enter.) A saída termina em
 *   `sessao real: N/N conferencias OK` (saída 0) ou com alguma linha `FALHA …` (saída 1).
 *   Sem as duas variáveis: `SEM CREDENCIAIS …`, saída 2, sem tocar em rede nem em arquivo.
 *   A leitura do banco usa o p46apply (token da Management API do Keychain do operador).
 *
 *     node scripts/p50_sessao_real.cjs --auto-teste     # offline: sem rede, sem credencial real
 *
 * Sem dependências: módulos do Node + `fetch` global (Node ≥ 18).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(ROOT, 'p46apply.cjs');
/* O mesmo projeto que o p46apply lê (mesmo default, mesma variável de override). */
const PROJETO = process.env.SUPABASE_PROJECT_REF || 'isljnozzlvckrgjjbjwp';
const STATUS = ['ativa', 'inativa', 'arquivada'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/* Ordem de precedência do Vite no modo de desenvolvimento (o primeiro que tiver a variável vence). */
const ARQUIVOS_ENV = ['.env.development.local', '.env.development', '.env.local', '.env'];
const MSG_SEM_CRED = 'SEM CREDENCIAIS: defina P50_RH2_EMAIL e P50_RH2_SENHA no seu terminal (read -s)';
/* `sub` das claims de administrador usadas SÓ do lado postgres (o ramo do administrador não
 * depende do sub para escopo; ele só existe para a guarda de sub não-nulo). */
const SUB_SONDA_ADMIN = '00000000-0000-0000-0000-000000000000';

class ErroSeguro extends Error {}

// ─────────────────────────────────────────────────────────────────────────────
// Saída blindada
// ─────────────────────────────────────────────────────────────────────────────

function criarSaida(escrever) {
  const segredos = [];
  let redigidos = 0;

  function registrar(s) {
    if (typeof s === 'string' && s.length >= 4) segredos.push(s);
  }

  /* Marca, sobre o texto ORIGINAL, todo trecho suspeito — o segredo inteiro, qualquer janela de
   * 12 caracteres de um segredo longo (token), e-mail, JWT, URL, corrida opaca de 40+ caracteres —
   * e troca cada corrida marcada por UM `<redigido>`. Marcar antes de trocar evita que uma troca
   * quebre o padrão da seguinte e deixe sobra (uma substituição em cascata deixava fragmentos). */
  function blindar(texto) {
    const t = String(texto);
    const marca = new Uint8Array(t.length);
    const marcar = (a, b) => {
      for (let k = a; k < b; k += 1) marca[k] = 1;
    };
    for (const s of segredos) {
      for (let i = t.indexOf(s); i >= 0; i = t.indexOf(s, i + 1)) marcar(i, i + s.length);
      if (s.length >= 16) {
        for (let i = 0; i + 12 <= t.length; i += 1) if (s.includes(t.slice(i, i + 12))) marcar(i, i + 12);
      }
    }
    const padroes = [
      /[^\s@<>()"'=]+@[^\s@<>()"']+\.[^\s@<>()"']+/g, // e-mail
      /eyJ[\w-]{6,}\.[\w-]{6,}(\.[\w-]*)?/g, // JWT
      /https?:\/\/\S+/g, // URL (a assinada inclusive)
      /[A-Za-z0-9_-]{40,}/g, // corrida opaca longa (pedaço de token); um uuid tem 36
    ];
    for (const re of padroes) for (const m of t.matchAll(re)) marcar(m.index, m.index + m[0].length);
    let r = '';
    for (let k = 0; k < t.length; ) {
      if (marca[k]) {
        while (k < t.length && marca[k]) k += 1;
        r += '<redigido>';
      } else {
        r += t[k];
        k += 1;
      }
    }
    if (r !== t) redigidos += 1;
    return r;
  }

  return {
    registrar,
    blindar,
    linha: (s) => escrever('out', blindar(s)),
    erro: (s) => escrever('err', blindar(s)),
    redigidos: () => redigidos,
  };
}

/* Só números, booleanos, uuids e fichas curtas em minúsculas passam; o resto vira <redigido>. */
function valorSeguro(v) {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '-';
  if (typeof v === 'string' && (UUID_RE.test(v) || /^[a-z][a-z0-9_:>]{0,31}$/.test(v))) return v;
  return '<redigido>';
}

function codigoSeguro(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(v)) return v.toLowerCase();
  return 'sem_codigo';
}

function linhaCheck(nome, esperado, obtido, ok, nota) {
  const n = /^[a-z0-9_:]+$/.test(nome) ? nome : 'conferencia';
  return `${ok ? 'OK' : 'FALHA'} ${n} esperado=${valorSeguro(esperado)} obtido=${valorSeguro(obtido)}${nota ? ` (${nota})` : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entradas: credenciais, configuração pública do front
// ─────────────────────────────────────────────────────────────────────────────

function lerCredenciais(env) {
  const email = typeof env.P50_RH2_EMAIL === 'string' ? env.P50_RH2_EMAIL.trim() : '';
  const senha = typeof env.P50_RH2_SENHA === 'string' ? env.P50_RH2_SENHA : '';
  if (!email || !senha) return null;
  return { email, senha };
}

/* Lê do texto de um arquivo .env SÓ as duas variáveis públicas; nenhuma outra linha é guardada. */
function lerVarsVite(texto) {
  const r = {};
  for (const bruta of String(texto).split(/\r?\n/)) {
    const m = bruta.match(/^\s*(?:export\s+)?(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"') && v.length >= 2) || (v.startsWith("'") && v.endsWith("'") && v.length >= 2)) {
      v = v.slice(1, -1);
    } else {
      v = v.replace(/\s+#.*$/, '');
    }
    const campo = m[1] === 'VITE_SUPABASE_URL' ? 'url' : 'anon';
    if (v && r[campo] === undefined) r[campo] = v;
  }
  return r;
}

function lerArquivoOuNulo(arquivo) {
  try {
    return fs.readFileSync(arquivo, 'utf8');
  } catch {
    return null;
  }
}

function decodificarPayload(jwt) {
  if (typeof jwt !== 'string') return null;
  const partes = jwt.split('.');
  if (partes.length !== 3 || !partes[1]) return null;
  try {
    const p = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    return p && typeof p === 'object' && !Array.isArray(p) ? p : null;
  } catch {
    return null;
  }
}

function validarUrl(u) {
  const m = String(u).trim().match(/^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/);
  if (!m) throw new ErroSeguro('URL DO FRONT FORA DO PADRAO <ref>.supabase.co: recuso (nao comparo projeto desconhecido)');
  if (m[1] !== PROJETO) {
    throw new ErroSeguro(`PROJETO DIFERENTE: o front aponta para ${m[1]}, a leitura postgres (p46apply) le ${PROJETO}; as contagens nao seriam comparaveis`);
  }
  return `https://${m[1]}.supabase.co`;
}

/* Aceita SÓ a chave pública: publishable, ou JWT legado com role anon. Qualquer outra é recusada. */
function validarChaveAnon(k) {
  if (typeof k === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(k)) return 'publishable';
  const p = decodificarPayload(k);
  if (p && p.role === 'anon') return 'anon';
  throw new ErroSeguro('CHAVE NAO PUBLICA: VITE_SUPABASE_ANON_KEY nao e a chave anon/publishable; recuso usar (so a chave publica e o token do proprio usuario)');
}

function configPublica(env, root, lerArquivo) {
  const cfg = { url: env.VITE_SUPABASE_URL || undefined, anon: env.VITE_SUPABASE_ANON_KEY || undefined };
  for (const nome of ARQUIVOS_ENV) {
    if (cfg.url && cfg.anon) break;
    const texto = lerArquivo(path.join(root, nome));
    if (texto == null) continue;
    const v = lerVarsVite(texto);
    if (!cfg.url && v.url) cfg.url = v.url;
    if (!cfg.anon && v.anon) cfg.anon = v.anon;
  }
  if (!cfg.url || !cfg.anon) {
    throw new ErroSeguro(`SEM CONFIG DO FRONT: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nao encontradas em ${ARQUIVOS_ENV.join(', ')} nem no ambiente`);
  }
  const url = validarUrl(cfg.url);
  const tipo = validarChaveAnon(cfg.anon);
  return { url, anon: cfg.anon, tipo };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lado postgres (só leitura, via p46apply)
// ─────────────────────────────────────────────────────────────────────────────

function construirSql(sub) {
  if (!UUID_RE.test(String(sub))) throw new ErroSeguro('SUB INVALIDO: recuso montar a leitura');
  const claims = JSON.stringify({ sub: SUB_SONDA_ADMIN, role: 'authenticated', app_metadata: { role: 'administrador' } });
  return [
    'set transaction read only;',
    `select set_config('request.jwt.claims', '${claims}', true) is not null as claims;`,
    'with vivas as (',
    '  select c.id, c.vaga_id, c.curriculo_url from public.candidaturas c',
    '   where c.deleted_at is null and c.is_rascunho = false),',
    ' contagem as (',
    '  select v.id, v.status::text as status,',
    '         (select count(*) from vivas w where w.vaga_id = v.id)::int as n',
    '    from public.vagas v',
    "   where v.deleted_at is null and v.status::text in ('ativa', 'inativa', 'arquivada')),",
    ' alvo as (select distinct on (status) status, id, n from contagem order by status, n desc, id)',
    'select',
    " (select json_agg(json_build_object('status', status, 'id', id, 'n', n) order by status) from alvo) as vagas,",
    " (select json_build_object('role', u.role, 'ativo', u.ativo, 'excluido', u.deleted_at is not null)",
    `    from public.usuarios_rh u where u.user_id = '${sub}') as rh2,`,
    ` (select count(*) from public.vagas v where v.created_by = '${sub}')::int as vagas_autor,`,
    ' (select w.id from vivas w join public.vagas v on v.id = w.vaga_id',
    `   where w.curriculo_url is not null and v.deleted_at is null and v.created_by is distinct from '${sub}'`,
    "     and exists (select 1 from storage.objects o where o.bucket_id = 'curriculos' and o.name = w.curriculo_url)",
    '   order by (w.vaga_id in (select id from alvo)) desc, w.id limit 1) as cand_cv,',
    " pg_get_function_identity_arguments(to_regproc('public.listar_pedidos_dados')) as args_pedidos,",
    " pg_get_function_identity_arguments(to_regproc('public.listar_revisoes_decisao')) as args_revisoes,",
    ' (select count(*) from public.listar_pedidos_dados(true))::int as pedidos_todos,',
    ' public.contar_pedidos_dados_pendentes() as pedidos_pendentes,',
    ' (select count(*) from public.listar_revisoes_decisao(true))::int as revisoes_todas,',
    ' public.contar_revisoes_pendentes() as revisoes_pendentes,',
    " current_setting('transaction_read_only') as somente_leitura;",
  ].join('\n');
}

function lerPostgresReal(sql) {
  let out;
  try {
    out = execFileSync(process.execPath, [APPLY, 'sql', sql], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const msg = String((e && (e.stderr || e.message)) || '').split('\n').find((l) => l.trim()) || 'sem mensagem';
    throw new ErroSeguro(`LEITURA POSTGRES FALHOU (p46apply): ${msg.slice(0, 200)}`);
  }
  const i = out.indexOf('[');
  if (i < 0) throw new ErroSeguro('LEITURA POSTGRES SEM RESULTADO');
  const linhas = JSON.parse(out.slice(i));
  if (!Array.isArray(linhas) || linhas.length !== 1) throw new ErroSeguro('LEITURA POSTGRES: esperava 1 linha');
  return linhas[0];
}

function nomeDoParametro(args, rpc) {
  const m = /^(\w+) boolean$/.exec(String(args || ''));
  if (!m) throw new ErroSeguro(`ASSINATURA INESPERADA de ${rpc}: ${valorSeguro(args)}`);
  return m[1];
}

function normalizarPg(row) {
  if (!row || row.somente_leitura !== 'on') throw new ErroSeguro('LEITURA POSTGRES NAO FOI SO-LEITURA: recuso seguir');
  const vagas = {};
  for (const v of Array.isArray(row.vagas) ? row.vagas : []) {
    if (STATUS.includes(v.status) && UUID_RE.test(String(v.id))) vagas[v.status] = { id: v.id, n: Number(v.n) };
  }
  return {
    vagas,
    rh2: row.rh2 && typeof row.rh2 === 'object' ? row.rh2 : null,
    vagasAutor: Number(row.vagas_autor),
    candCv: UUID_RE.test(String(row.cand_cv)) ? row.cand_cv : null,
    paramPedidos: nomeDoParametro(row.args_pedidos, 'listar_pedidos_dados'),
    paramRevisoes: nomeDoParametro(row.args_revisoes, 'listar_revisoes_decisao'),
    pedidosTodos: Number(row.pedidos_todos),
    pedidosPendentes: Number(row.pedidos_pendentes),
    revisoesTodas: Number(row.revisoes_todas),
    revisoesPendentes: Number(row.revisoes_pendentes),
  };
}

function impressaoPg(pg) {
  return JSON.stringify([
    STATUS.map((s) => (pg.vagas[s] ? `${pg.vagas[s].id}:${pg.vagas[s].n}` : '-')),
    pg.candCv,
    pg.pedidosTodos,
    pg.pedidosPendentes,
    pg.revisoesTodas,
    pg.revisoesPendentes,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lado sessão (chave pública + token do próprio usuário)
// ─────────────────────────────────────────────────────────────────────────────

async function http(fetchFn, url, init) {
  const r = await fetchFn(url, init);
  const texto = await r.text();
  let corpo = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    corpo = null;
  }
  return { status: r.status, corpo, contentRange: r.headers && r.headers.get ? r.headers.get('content-range') : null };
}

async function login(fetchFn, cfg, cred) {
  const r = await http(fetchFn, `${cfg.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: cfg.anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cred.email, password: cred.senha }),
  });
  if (r.status !== 200 || !r.corpo || typeof r.corpo.access_token !== 'string') {
    const c = r.corpo || {};
    throw new ErroSeguro(`LOGIN RECUSADO: http=${r.status} codigo=${codigoSeguro(c.error_code || c.error || c.code)}`);
  }
  return r.corpo.access_token;
}

function cabecalhos(cfg, token, json) {
  const h = { apikey: cfg.anon, Authorization: `Bearer ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function totalDoContentRange(cr) {
  const m = /\/(\d+)$/.exec(String(cr || ''));
  return m ? Number(m[1]) : null;
}

/* O mesmo filtro do front (vagasService: vaga_id + deleted_at is null); a RLS decide o resto. */
async function contarCandidaturasSessao(fetchFn, cfg, token, vagaId) {
  const r = await http(fetchFn, `${cfg.url}/rest/v1/candidaturas?vaga_id=eq.${vagaId}&deleted_at=is.null&select=id`, {
    headers: { ...cabecalhos(cfg, token, false), Prefer: 'count=exact' },
  });
  if ((r.status !== 200 && r.status !== 206) || !Array.isArray(r.corpo)) return { erro: `http_${r.status}` };
  return { linhas: r.corpo.length, total: totalDoContentRange(r.contentRange) };
}

async function rpcSessao(fetchFn, cfg, token, nome, args) {
  const r = await http(fetchFn, `${cfg.url}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: cabecalhos(cfg, token, true),
    body: JSON.stringify(args || {}),
  });
  if (r.status !== 200) return { erro: `http_${r.status}:${codigoSeguro(r.corpo && r.corpo.code)}` };
  return { valor: r.corpo };
}

async function cvSessao(fetchFn, cfg, token, candidaturaId) {
  const r = await http(fetchFn, `${cfg.url}/functions/v1/get-curriculo-url`, {
    method: 'POST',
    headers: cabecalhos(cfg, token, true),
    body: JSON.stringify({ candidatura_id: candidaturaId }),
  });
  const ok = r.status === 200 && !!r.corpo && r.corpo.ok === true && typeof r.corpo.signedUrl === 'string' && r.corpo.signedUrl.length > 0;
  return { status: r.status, ok }; // a URL assinada é descartada aqui: nunca sai desta função
}

// ─────────────────────────────────────────────────────────────────────────────
// Execução
// ─────────────────────────────────────────────────────────────────────────────

async function principal(argv, deps) {
  const { env, fetchFn, lerPg, lerArquivo, out } = deps;
  const cred = lerCredenciais(env);
  if (!cred) {
    out.erro(MSG_SEM_CRED);
    return 2;
  }
  out.registrar(cred.email);
  out.registrar(cred.senha);

  const cfg = configPublica(env, ROOT, lerArquivo);
  out.linha(`projeto=${PROJETO} chave_publica=${cfg.tipo}`);

  // 1. login com a chave pública → token só em memória
  const token = await login(fetchFn, cfg, cred);
  out.registrar(token);
  const payload = decodificarPayload(token) || {};
  const roleJwt = payload.app_metadata && typeof payload.app_metadata === 'object' ? payload.app_metadata.role : undefined;
  const sub = payload.sub;
  out.linha(`role_jwt=${valorSeguro(roleJwt)}`);
  out.linha(`sub=${valorSeguro(sub)}`);
  if (!UUID_RE.test(String(sub))) throw new ErroSeguro('TOKEN SEM SUB UUID: recuso seguir');

  // 2. banco, só leitura (antes)
  const sql = construirSql(sub);
  const pg = normalizarPg(lerPg(sql));
  for (const s of STATUS) out.linha(`vaga:${s}=${valorSeguro(pg.vagas[s] && pg.vagas[s].id)}`);
  out.linha(`cv_candidatura=${valorSeguro(pg.candCv)}`);

  // 3. sessão real
  const sessaoVagas = {};
  for (const s of STATUS) {
    sessaoVagas[s] = pg.vagas[s] ? await contarCandidaturasSessao(fetchFn, cfg, token, pg.vagas[s].id) : { erro: 'sem_vaga' };
  }
  const listarPed = await rpcSessao(fetchFn, cfg, token, 'listar_pedidos_dados', { [pg.paramPedidos]: true });
  const contarPed = await rpcSessao(fetchFn, cfg, token, 'contar_pedidos_dados_pendentes', {});
  const listarRev = await rpcSessao(fetchFn, cfg, token, 'listar_revisoes_decisao', { [pg.paramRevisoes]: true });
  const contarRev = await rpcSessao(fetchFn, cfg, token, 'contar_revisoes_pendentes', {});
  const cv = pg.candCv ? await cvSessao(fetchFn, cfg, token, pg.candCv) : { status: 0, ok: false };
  out.linha(`cv_ok=${cv.ok} http=${cv.status}`);

  // banco de novo (depois): o mesmo minuto, sem mudança no meio
  const pg2 = normalizarPg(lerPg(sql));
  const estavel = impressaoPg(pg) === impressaoPg(pg2);

  // 4. conferências
  const c = [];
  const conf = (nome, esperado, obtido, ok, nota) => c.push({ nome, esperado, obtido, ok: !!ok, nota });
  conf('role_jwt', 'rh', roleJwt, roleJwt === 'rh');
  conf('rh2_papel', 'recrutador', pg.rh2 && pg.rh2.role, !!pg.rh2 && pg.rh2.role === 'recrutador');
  const ativo = !!pg.rh2 && pg.rh2.ativo === true && pg.rh2.excluido === false;
  conf('rh2_ativo', true, ativo, ativo);
  conf('rh2_vagas_proprias', 0, pg.vagasAutor, pg.vagasAutor === 0);
  for (const s of STATUS) {
    const esperado = pg.vagas[s] ? pg.vagas[s].n : null;
    const r = sessaoVagas[s];
    const obtido = r.erro ? r.erro : r.linhas;
    const ok = !r.erro && esperado > 0 && r.linhas === esperado && r.total === esperado;
    const nota = r.erro ? null : esperado === 0 ? 'populacao vazia' : r.total !== r.linhas ? `content-range=${valorSeguro(r.total)}` : null;
    conf(`candidaturas:${s}`, esperado, obtido, ok, nota);
  }
  const fila = (nome, esperado, r, contar) => {
    const obtido = r.erro ? r.erro : contar ? Number(r.valor) : Array.isArray(r.valor) ? r.valor.length : 'nao_lista';
    conf(nome, esperado, obtido, !r.erro && obtido === esperado, !r.erro && esperado === 0 && obtido === 0 ? 'vacuo: 0=0' : null);
  };
  fila('pedidos_dados_todos', pg.pedidosTodos, listarPed, false);
  fila('pedidos_dados_pendentes', pg.pedidosPendentes, contarPed, true);
  fila('revisoes_todas', pg.revisoesTodas, listarRev, false);
  fila('revisoes_pendentes', pg.revisoesPendentes, contarRev, true);
  conf('cv_curriculo', 200, cv.status, cv.ok, pg.candCv ? null : 'nenhuma candidatura viva com cv');
  conf('estabilidade', 'igual', estavel ? 'igual' : 'mudou', estavel, estavel ? null : 'o banco mudou durante a execucao: rodar de novo');

  for (const x of c) out.linha(linhaCheck(x.nome, x.esperado, x.obtido, x.ok, x.nota));
  const red = out.redigidos();
  out.linha(linhaCheck('blindagem', 0, red, red === 0, red ? 'DEFEITO DO SCRIPT: algo com cara de segredo foi redigido' : null));
  const total = c.length + 1;
  const okN = c.filter((x) => x.ok).length + (red === 0 ? 1 : 0);
  out.linha(`sessao real: ${okN}/${total} conferencias OK`);
  return okN === total ? 0 : 1;
}

async function executar(argv, deps) {
  try {
    return await principal(argv, deps);
  } catch (e) {
    if (e instanceof ErroSeguro) deps.out.erro(e.message);
    else deps.out.erro(`ERRO INESPERADO: ${(e && e.name) || 'Error'}: ${String((e && e.message) || '').slice(0, 160)}`);
    return 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// --auto-teste (offline: rede proibida, nenhuma credencial real)
// ─────────────────────────────────────────────────────────────────────────────

function jwtFixture(payload) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b(payload)}.assinatura-fixture-0123456789abcdef`;
}

async function autoTeste() {
  const falhas = [];
  let n = 0;
  const afirmar = (cond, rotulo) => {
    n += 1;
    if (!cond) falhas.push(rotulo);
  };
  const fetchGlobal = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('REDE PROIBIDA NO AUTO-TESTE');
  };

  const EMAIL = 'rh2.fixture@exemplo.com.br';
  const SENHA = 'S3nha-Fixture-Nao-Real!';
  const SUB = '11111111-2222-4333-8444-555555555555';
  const TOKEN = jwtFixture({ sub: SUB, role: 'authenticated', email: EMAIL, app_metadata: { role: 'rh' } });
  const ANON = jwtFixture({ iss: 'supabase', ref: PROJETO, role: 'anon' });
  const REFRESH = 'refresh-fixture-zz9988776655';
  const NOME = 'Candidata Fixture da Silva';
  const ASSINADA = `https://${PROJETO}.supabase.co/storage/v1/object/sign/curriculos/x/y.pdf?token=fixture`;
  const VAGAS = {
    ativa: { id: 'aaaaaaaa-0000-4000-8000-000000000001', n: 11 },
    inativa: { id: 'aaaaaaaa-0000-4000-8000-000000000002', n: 1 },
    arquivada: { id: 'aaaaaaaa-0000-4000-8000-000000000003', n: 7 },
  };
  const CAND = 'bbbbbbbb-0000-4000-8000-000000000001';

  try {
    // (a) credenciais
    afirmar(lerCredenciais({}) === null, 'a1 sem env devia recusar');
    afirmar(lerCredenciais({ P50_RH2_EMAIL: EMAIL }) === null, 'a2 sem senha devia recusar');
    afirmar(lerCredenciais({ P50_RH2_SENHA: SENHA }) === null, 'a3 sem email devia recusar');
    const cr = lerCredenciais({ P50_RH2_EMAIL: ` ${EMAIL} `, P50_RH2_SENHA: SENHA });
    afirmar(!!cr && cr.email === EMAIL && cr.senha === SENHA, 'a4 credenciais lidas');

    // (b) caminho de recusa, no processo real: saída 2, SEM CREDENCIAIS, nada no stdout
    const envSem = { ...process.env };
    delete envSem.P50_RH2_EMAIL;
    delete envSem.P50_RH2_SENHA;
    const filho = spawnSync(process.execPath, [__filename], { env: envSem, encoding: 'utf8' });
    afirmar(filho.status === 2, 'b1 sem credencial devia sair 2');
    afirmar(String(filho.stderr).includes('SEM CREDENCIAIS'), 'b2 mensagem SEM CREDENCIAIS');
    afirmar(String(filho.stdout) === '', 'b3 nada no stdout sem credencial');

    // (c) decodificador do payload
    const p = decodificarPayload(TOKEN);
    afirmar(!!p && p.app_metadata.role === 'rh' && p.sub === SUB, 'c1 payload decodificado');
    afirmar(decodificarPayload('a.b') === null, 'c2 duas partes -> nulo');
    afirmar(decodificarPayload('x.%%%.y') === null, 'c3 payload invalido -> nulo');
    afirmar(decodificarPayload(undefined) === null, 'c4 indefinido -> nulo');

    // (d) formatador e blindagem
    afirmar(valorSeguro(EMAIL) === '<redigido>', 'd1 email nao passa no valorSeguro');
    afirmar(valorSeguro(SENHA) === '<redigido>', 'd2 senha nao passa no valorSeguro');
    afirmar(valorSeguro(TOKEN) === '<redigido>', 'd3 token nao passa no valorSeguro');
    afirmar(valorSeguro(NOME) === '<redigido>', 'd4 nome nao passa no valorSeguro');
    afirmar(valorSeguro(SUB) === SUB && valorSeguro(7) === '7' && valorSeguro(true) === 'true', 'd5 ids/numeros/booleanos passam');
    const l = linhaCheck('x', EMAIL, SENHA, true);
    afirmar(!l.includes(EMAIL) && !l.includes(SENHA) && l.includes('<redigido>'), 'd6 linhaCheck redige');
    const cap = [];
    const so = criarSaida((canal, s) => cap.push(s));
    so.registrar(EMAIL);
    so.registrar(SENHA);
    so.registrar(TOKEN);
    so.linha(`a ${EMAIL} b ${SENHA} c ${TOKEN.slice(40, 70)} d ${ASSINADA} e outro.email@dominio.com f ${ANON}`);
    const junto = cap.join('\n');
    afirmar(!junto.includes(EMAIL) && !junto.includes(SENHA) && !junto.includes('@'), 'd7 blindagem: email/senha');
    const janelas = (s, w) => Array.from({ length: Math.max(0, s.length - w + 1) }, (_, i) => s.slice(i, i + w));
    afirmar(!janelas(TOKEN.slice(40, 70), 6).some((w) => junto.includes(w)), 'd8a blindagem: nem sobra de 6 do token');
    afirmar(!junto.includes('eyJ') && !junto.includes('://'), 'd8b blindagem: jwt/url');
    afirmar(junto === 'a <redigido> b <redigido> c <redigido> d <redigido> e <redigido> f <redigido>', 'd8c uma marca por trecho');
    afirmar(so.redigidos() === 1, 'd9 redacao contada como defeito');

    // (e) configuração: só as duas variáveis públicas; projeto e chave conferidos
    const v = lerVarsVite(`# comentario\nOUTRA_CHAVE_PRIVADA=nao-ler-isto\nVITE_SUPABASE_URL="https://${PROJETO}.supabase.co"\nexport VITE_SUPABASE_ANON_KEY=${ANON} # anon\n`);
    afirmar(JSON.stringify(Object.keys(v).sort()) === '["anon","url"]', 'e1 so url e anon');
    afirmar(!JSON.stringify(v).includes('nao-ler-isto'), 'e2 outra chave nao guardada');
    afirmar(v.url === `https://${PROJETO}.supabase.co` && v.anon === ANON, 'e3 valores lidos');
    const lidos = [];
    const cfg = configPublica({}, '/raiz-fixture', (arq) => {
      lidos.push(path.basename(arq));
      return arq.endsWith('/.env.local') ? `VITE_SUPABASE_URL=https://${PROJETO}.supabase.co\nVITE_SUPABASE_ANON_KEY=${ANON}\n` : null;
    });
    afirmar(cfg.url === `https://${PROJETO}.supabase.co` && cfg.tipo === 'anon', 'e4 config do .env.local');
    afirmar(lidos.join(',') === '.env.development.local,.env.development,.env.local', 'e5 ordem do Vite, para no primeiro completo');
    const lanca = (fn) => {
      try {
        fn();
        return false;
      } catch (e) {
        return e instanceof ErroSeguro;
      }
    };
    afirmar(lanca(() => validarUrl('https://abcdefghijabcdefghij.supabase.co')), 'e6 outro projeto recusado');
    afirmar(lanca(() => validarUrl('https://exemplo.com')), 'e7 url fora do padrao recusada');
    afirmar(lanca(() => validarChaveAnon(jwtFixture({ role: 'authenticated' }))), 'e8 jwt nao-anon recusado');
    afirmar(lanca(() => validarChaveAnon('sb_secret_fixture123')), 'e9 chave secreta recusada');
    afirmar(validarChaveAnon('sb_publishable_fixture123') === 'publishable', 'e10 publishable aceita');
    afirmar(lanca(() => configPublica({}, '/raiz-fixture', () => null)), 'e11 sem arquivo -> erro claro');

    // (f) SQL: só leitura; sub validado
    afirmar(lanca(() => construirSql("x'; drop table t; --")), 'f1 sub nao-uuid recusado');
    afirmar(construirSql(SUB).startsWith('set transaction read only;'), 'f2 sql comeca so-leitura');

    // (g) ponta a ponta com rede e banco FALSOS que devolvem dados pessoais e segredos
    const rowPg = {
      vagas: STATUS.map((s) => ({ status: s, id: VAGAS[s].id, n: VAGAS[s].n })),
      rh2: { role: 'recrutador', ativo: true, excluido: false },
      vagas_autor: 0,
      cand_cv: CAND,
      args_pedidos: 'p_incluir_atendidos boolean',
      args_revisoes: 'p_incluir_respondidos boolean',
      pedidos_todos: 3,
      pedidos_pendentes: 0,
      revisoes_todas: 3,
      revisoes_pendentes: 2,
      somente_leitura: 'on',
    };
    const cenario = async ({ desvio, loginFalho, vazia } = {}) => {
      const chamadas = [];
      const resp = (status, corpo, cr) => ({ status, headers: { get: (h) => (h === 'content-range' ? cr || null : null) }, text: async () => JSON.stringify(corpo) });
      const fakeFetch = async (url, init) => {
        chamadas.push({ url, init });
        const u = String(url);
        if (u.includes('/auth/v1/token?grant_type=password')) {
          if (loginFalho) return resp(400, { error: 'invalid_grant', error_description: `Invalid login credentials for ${EMAIL}` });
          return resp(200, { access_token: TOKEN, refresh_token: REFRESH, user: { email: EMAIL, id: SUB } });
        }
        if (u.includes('/rest/v1/candidaturas?')) {
          const s = STATUS.find((k) => u.includes(VAGAS[k].id));
          const q = vazia === s ? 0 : VAGAS[s].n - (desvio === s ? 1 : 0);
          return resp(200, Array.from({ length: q }, (_, i) => ({ id: `cccccccc-0000-4000-8000-${String(i).padStart(12, '0')}` })), q ? `0-${q - 1}/${q}` : '*/0');
        }
        if (u.endsWith('/rpc/listar_pedidos_dados')) return resp(200, [1, 2, 3].map(() => ({ candidato_nome: NOME })));
        if (u.endsWith('/rpc/contar_pedidos_dados_pendentes')) return resp(200, 0);
        if (u.endsWith('/rpc/listar_revisoes_decisao')) return resp(200, [1, 2, 3].map(() => ({ candidato_nome: NOME, vaga_titulo: 'Vaga Fixture' })));
        if (u.endsWith('/rpc/contar_revisoes_pendentes')) return resp(200, 2);
        if (u.endsWith('/functions/v1/get-curriculo-url')) return resp(200, { ok: true, signedUrl: ASSINADA });
        return resp(404, { message: 'rota inesperada' });
      };
      const sqls = [];
      const linhas = [];
      const out = criarSaida((canal, s) => linhas.push(s));
      // Toda escrita que NÃO passe pela saída blindada é capturada aqui (um console.log solto,
      // por exemplo) e conta como vazamento: o fluxo só pode imprimir por `out`.
      const fora = [];
      const escritaOut = process.stdout.write;
      const escritaErr = process.stderr.write;
      process.stdout.write = (c) => (fora.push(String(c)), true);
      process.stderr.write = (c) => (fora.push(String(c)), true);
      let code;
      try {
        code = await executar([], {
          env: { P50_RH2_EMAIL: EMAIL, P50_RH2_SENHA: SENHA, VITE_SUPABASE_URL: `https://${PROJETO}.supabase.co`, VITE_SUPABASE_ANON_KEY: ANON },
          fetchFn: fakeFetch,
          lerPg: (sql) => {
            sqls.push(sql);
            return vazia ? { ...rowPg, vagas: rowPg.vagas.map((x) => (x.status === vazia ? { ...x, n: 0 } : x)) } : rowPg;
          },
          lerArquivo: () => {
            throw new Error('arquivo nao devia ser lido com a config no ambiente');
          },
          out,
        });
      } finally {
        process.stdout.write = escritaOut;
        process.stderr.write = escritaErr;
      }
      return { code, linhas, chamadas, sqls, out, fora };
    };
    const vazou = (texto) =>
      [EMAIL, SENHA, NOME, ASSINADA, REFRESH, 'Vaga Fixture', 'eyJ', '@', '://'].some((x) => texto.includes(x)) ||
      Array.from({ length: TOKEN.length - 11 }, (_, i) => TOKEN.slice(i, i + 12)).some((w) => texto.includes(w));

    const g = await cenario();
    const gTexto = g.linhas.join('\n');
    afirmar(g.code === 0, 'g1 cenario verde sai 0');
    afirmar(g.linhas[g.linhas.length - 1] === 'sessao real: 14/14 conferencias OK', 'g2 linha final N/N');
    afirmar(g.linhas.includes('role_jwt=rh') && g.linhas.includes(`sub=${SUB}`), 'g3 role_jwt e sub impressos');
    afirmar(!vazou(gTexto), 'g4 nenhuma linha carrega email, senha, token, nome, url assinada');
    afirmar(g.out.redigidos() === 0, 'g5 nada precisou ser redigido');
    afirmar(g.fora.length === 0, 'g5b nenhuma escrita fora da saida blindada');
    afirmar(g.chamadas.every((x) => x.init.headers.apikey === ANON), 'g6 so a chave publica');
    afirmar(g.chamadas.filter((x) => !String(x.url).includes('/auth/v1/')).every((x) => x.init.headers.Authorization === `Bearer ${TOKEN}`), 'g7 token do proprio usuario');
    afirmar(g.chamadas.some((x) => String(x.url).endsWith('/rpc/listar_pedidos_dados') && x.init.body === '{"p_incluir_atendidos":true}'), 'g8 parametro vivo das filas');
    afirmar(g.sqls.length === 2 && g.sqls.every((s) => s.startsWith('set transaction read only;') && s.includes(SUB)), 'g9 banco lido 2x, so leitura');

    // (h) uma contagem diferente → FALHA e saída 1
    const h = await cenario({ desvio: 'inativa' });
    afirmar(h.code === 1, 'h1 desvio sai 1');
    afirmar(h.linhas.some((x) => x.startsWith('FALHA candidaturas:inativa esperado=1 obtido=0')), 'h2 FALHA na vaga inativa');
    afirmar(h.linhas[h.linhas.length - 1] === 'sessao real: 13/14 conferencias OK', 'h3 contagem final 13/14');
    afirmar(!vazou(h.linhas.join('\n')) && h.fora.length === 0, 'h4 sem vazamento no cenario de falha');

    // (i) login recusado com o e-mail ecoado no corpo do erro → só http e código
    const i = await cenario({ loginFalho: true });
    afirmar(i.code === 1, 'i1 login recusado sai 1');
    afirmar(i.linhas.some((x) => x === 'LOGIN RECUSADO: http=400 codigo=invalid_grant'), 'i2 mensagem so com http e codigo');
    afirmar(!vazou(i.linhas.join('\n')) && i.fora.length === 0, 'i3 sem vazamento no login recusado');

    // (j) populacao vazia: banco 0 e sessao 0 «batem», mas a prova exige > 0 → FALHA
    const j = await cenario({ vazia: 'arquivada' });
    afirmar(j.code === 1, 'j1 vaga sem candidatura viva sai 1');
    afirmar(j.linhas.some((x) => x === 'FALHA candidaturas:arquivada esperado=0 obtido=0 (populacao vazia)'), 'j2 0=0 e FALHA, nao OK');
    afirmar(j.fora.length === 0, 'j3 sem escrita fora da saida blindada');
  } finally {
    globalThis.fetch = fetchGlobal;
  }

  if (falhas.length) {
    console.error(`auto-teste FALHOU (${falhas.length}/${n}): ${falhas.join('; ')}`);
    return 1;
  }
  console.log(`auto-teste: ${n} afirmacoes, rede nao usada, nenhuma credencial real`);
  console.log('auto-teste ok');
  return 0;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--auto-teste')) {
    autoTeste().then(
      (code) => process.exit(code),
      (e) => {
        console.error(`auto-teste FALHOU: ${(e && e.name) || 'Error'}`);
        process.exit(1);
      }
    );
  } else {
    const out = criarSaida((canal, s) => (canal === 'err' ? console.error(s) : console.log(s)));
    executar(argv, { env: process.env, fetchFn: globalThis.fetch, lerPg: lerPostgresReal, lerArquivo: lerArquivoOuNulo, out }).then((code) =>
      process.exit(code)
    );
  }
}

module.exports = { valorSeguro, linhaCheck, criarSaida, lerCredenciais, lerVarsVite, decodificarPayload, construirSql, lerPostgresReal, normalizarPg };
