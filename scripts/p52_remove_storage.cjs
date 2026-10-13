#!/usr/bin/env node
'use strict';
/*
 * p52_remove_storage.cjs — remoção dos currículos da população APROVADA pela Storage API (Phase 52, bloco D;
 * plano 52-20 Task 2; usado pelo 52-21 Task 3, sob o mesmo OK destrutivo do banco).
 *
 * O4 / F11: o Storage só sai pela Storage API — NUNCA por SQL no catálogo do Storage (o trigger
 * `protect_objects_delete` existe porque remover o metadado deixa o blob órfão para sempre; a EF
 * `purgar-retencao` segue a mesma regra). Este script não tem SQL nenhum.
 *
 * MODOS
 *   --capturar <saida.json> --populacao <POPULACAO.json>
 *       Deriva os prefixos de `apagaveis` do POPULACAO.json (contrato do 52-19: cada entrada `{ id, user_id }`;
 *       prefixo = `user_id`, ou `id` quando `user_id` é nulo — os fictícios e os tombstones), recusando
 *       `POPULACAO SEM apagaveis` (saída 1, nada gravado, nenhuma chamada de rede) se a chave faltar, não for
 *       objeto, ou não tiver entrada nenhuma — nunca uma captura vazia por chave errada. Lista o bucket
 *       `curriculos` sob cada prefixo e grava `{ bucket, prefixos, n_objetos, nomes_md5, total_bucket,
 *       capturado_em }` — nenhum nome de arquivo (o nome pode conter o nome do candidato).
 *   --aprovado <STORAGE.json> [--dry-run]
 *       Lista SÓ os prefixos aprovados, confere contagem e `nomes_md5` contra o aprovado
 *       (`STORAGE DIFERE DO APROVADO` → saída 1, nada removido); sem `--dry-run`, remove em lotes
 *       (`DELETE /storage/v1/object/<bucket>` com `prefixes`), relista e exige zero sob os prefixos.
 *   --aprovado <STORAGE.json> --dry-run --esperar-vazio
 *       Prova depois (52-21 Task 3): só lista; imprime `restantes=<n>` e `total_bucket=<n>`; saída 1 se
 *       `restantes` ≠ 0 ou se `total_bucket` ≠ `total_bucket` capturado − `n_objetos`.
 *   --auto-teste
 *       Os casos do `<behavior>` do plano com dublê de `fetch` (sem rede).
 *
 * FORMA CANÔNICA (contrato do STORAGE.json com o 52-27, `p52_export_limpeza.cjs` — o parágrafo «Forma
 * canônica de `nomes_md5` e `prefixos`» é idêntico nos dois planos): cada objeto é o caminho COMPLETO dentro
 * do bucket, `<prefixo>/<nome>`, como em `name` do catálogo do Storage — sem bucket, sem `/` inicial;
 * `<nome>` é o `name` que a listagem devolve sob o prefixo. `nomes_md5` = md5 hex minúsculo dos bytes UTF-8
 * da junção por `\n`, SEM `\n` no fim, depois de ordenar por comparação de bytes UTF-8 (`Buffer.compare`,
 * nunca o `.sort()` padrão, que compara unidades UTF-16); lista vazia ⇒ d41d8cd9…. `prefixos` = os prefixos
 * distintos dos caminhos, sem `/` final, na mesma ordem de bytes. Fixture do contrato no `--auto-teste`.
 *
 * CHAVE: a `service_role` é obtida em memória por `GET https://api.supabase.com/v1/projects/<ref>/api-keys`
 * com o token da Management API (Keychain «Supabase CLI»/«supabase», ou SUPABASE_ACCESS_TOKEN — o molde do
 * `efdeploy.cjs`); nunca impressa, nunca gravada. Toda saída passa por um redator que troca chave e token
 * por `<redigido>` (defesa em profundidade); mensagens de erro de rede levam só o passo e o status HTTP,
 * nunca o corpo (que pode ecoar um nome de arquivo).
 *
 * Saída: 0 ok · 1 recusa/erro · 2 uso. Sem dependências (fetch nativo do Node).
 */

const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const REF = process.env.SUPABASE_PROJECT_REF || 'isljnozzlvckrgjjbjwp';
const URL_PROJETO = `https://${REF}.supabase.co`;
const URL_CHAVES = `https://api.supabase.com/v1/projects/${REF}/api-keys`;
const BUCKET = 'curriculos';
const LIMITE = 100;
const MAX_PAGINAS = 100;
const LOTE = 100;

const U = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const H = /^[0-9a-f]{32}$/;
const O = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const I = (x) => Number.isInteger(x) && x >= 0;
const md5 = (s) => crypto.createHash('md5').update(Buffer.from(s, 'utf8')).digest('hex');

class Recusa extends Error {}
class ErroRede extends Error {}

/* ───────────────────────────── forma canônica (PURA) ───────────────────────────── */

function ordenarBytes(xs) {
  return [...xs].sort((a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')));
}

function nomesMd5(caminhos) {
  return md5(ordenarBytes(caminhos).join('\n'));
}

function prefixosDe(caminhos) {
  return ordenarBytes([...new Set(caminhos.map((c) => String(c).split('/')[0]))]);
}

/* Prefixos da população (contrato do 52-19). Devolve { prefixos } ou { erro }. */
function prefixosDaPopulacao(pop) {
  if (!O(pop) || !O(pop.apagaveis)) return { erro: 'POPULACAO SEM apagaveis: a chave falta ou nao e objeto' };
  const ps = [];
  for (const [k, lista] of Object.entries(pop.apagaveis)) {
    if (!Array.isArray(lista)) return { erro: `POPULACAO SEM apagaveis: apagaveis.${k} nao e lista` };
    for (const x of lista) {
      if (!O(x) || !U.test(String(x.id || '')) || !(x.user_id === null || x.user_id === undefined || U.test(String(x.user_id)))) {
        return { erro: `POPULACAO SEM apagaveis: entrada malformada em apagaveis.${k}` };
      }
      ps.push(x.user_id ? x.user_id : x.id);
    }
  }
  if (!ps.length) return { erro: 'POPULACAO SEM apagaveis: nenhuma entrada' };
  return { prefixos: ordenarBytes([...new Set(ps)]) };
}

/* O formato do STORAGE.json aprovado. Devolve a lista de erros (vazia = no formato). */
function conferirAprovado(j) {
  const e = [];
  if (!O(j)) return ['raiz nao e objeto'];
  if (j.bucket !== BUCKET) e.push('bucket');
  if (!Array.isArray(j.prefixos) || j.prefixos.some((p) => typeof p !== 'string' || !U.test(p))) e.push('prefixos (cada um um uuid, sem /)');
  else if (JSON.stringify(ordenarBytes([...new Set(j.prefixos)])) !== JSON.stringify(j.prefixos)) e.push('prefixos (fora da forma canonica: distintos, ordem de bytes)');
  if (!I(j.n_objetos)) e.push('n_objetos');
  if (typeof j.nomes_md5 !== 'string' || !H.test(j.nomes_md5)) e.push('nomes_md5');
  if (!I(j.total_bucket) || (I(j.n_objetos) && j.total_bucket < j.n_objetos)) e.push('total_bucket');
  if (typeof j.capturado_em !== 'string' || !Number.isFinite(Date.parse(j.capturado_em))) e.push('capturado_em');
  if (Array.isArray(j.prefixos) && I(j.n_objetos) && j.n_objetos > 0 && j.prefixos.length === 0) e.push('prefixos vazios com n_objetos > 0');
  return e;
}

/* ───────────────────────────── rede (injetável) ───────────────────────────── */

async function obterChave(fetchFn, token) {
  let r;
  try {
    r = await fetchFn(URL_CHAVES, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ErroRede('chave: Management API inalcancavel');
  }
  if (!r.ok) throw new ErroRede(`chave: Management API HTTP ${r.status}`);
  let j;
  try {
    j = await r.json();
  } catch {
    throw new ErroRede('chave: resposta sem JSON');
  }
  const k = Array.isArray(j) ? j.find((x) => O(x) && x.name === 'service_role' && typeof x.api_key === 'string' && x.api_key) : null;
  if (!k) throw new ErroRede('chave: service_role ausente na resposta da Management API');
  return k.api_key;
}

function criarCliente(fetchFn, chave) {
  const cab = { Authorization: `Bearer ${chave}`, apikey: chave, 'Content-Type': 'application/json' };
  return {
    async listarPagina(prefixo, offset) {
      let r;
      try {
        r = await fetchFn(`${URL_PROJETO}/storage/v1/object/list/${BUCKET}`, {
          method: 'POST',
          headers: cab,
          body: JSON.stringify({ prefix: prefixo, limit: LIMITE, offset, sortBy: { column: 'name', order: 'asc' } }),
        });
      } catch {
        throw new ErroRede('listagem: Storage API inalcancavel');
      }
      if (!r.ok) throw new ErroRede(`listagem: Storage API HTTP ${r.status}`);
      const j = await r.json().catch(() => null);
      if (!Array.isArray(j)) throw new ErroRede('listagem: resposta nao e lista');
      return j;
    },
    async remover(caminhos) {
      let r;
      try {
        r = await fetchFn(`${URL_PROJETO}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: cab, body: JSON.stringify({ prefixes: caminhos }) });
      } catch {
        throw new ErroRede('remocao: Storage API inalcancavel');
      }
      if (!r.ok) throw new ErroRede(`remocao: Storage API HTTP ${r.status}`);
      const j = await r.json().catch(() => null);
      return Array.isArray(j) ? j.length : 0;
    },
  };
}

/* Os caminhos completos sob UM prefixo (um nível; subpasta = recusa, como a EF purgar-retencao). */
async function listarPrefixo(cli, prefixo) {
  const caminhos = [];
  for (let p = 0; p < MAX_PAGINAS; p++) {
    const linhas = await cli.listarPagina(prefixo, p * LIMITE);
    for (const l of linhas) {
      if (!O(l) || typeof l.name !== 'string' || l.name === '') continue;
      if (l.id === null) throw new Recusa('SUBPASTA NO PREFIXO: a listagem e de um nivel; seguir adiante deixaria arquivo para tras');
      caminhos.push(`${prefixo}/${l.name}`);
    }
    if (linhas.length < LIMITE) return caminhos;
  }
  throw new Recusa('LISTAGEM EXCEDEU O TETO DE PAGINAS');
}

/* Total de objetos do bucket (dois níveis: pastas na raiz, arquivos dentro). */
async function contarBucket(cli) {
  let total = 0;
  for (let p = 0; p < MAX_PAGINAS; p++) {
    const linhas = await cli.listarPagina('', p * LIMITE);
    for (const l of linhas) {
      if (!O(l) || typeof l.name !== 'string' || l.name === '') continue;
      if (l.id === null) total += (await listarPrefixo(cli, l.name)).length;
      else total += 1;
    }
    if (linhas.length < LIMITE) return total;
  }
  throw new Recusa('LISTAGEM DA RAIZ EXCEDEU O TETO DE PAGINAS');
}

async function listarTodos(cli, prefixos) {
  const todos = [];
  for (const p of prefixos) todos.push(...(await listarPrefixo(cli, p)));
  return todos;
}

/* ───────────────────────────── modos ───────────────────────────── */

function tokenPadrao() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Recusa('TOKEN AUSENTE: Keychain "Supabase CLI"/"supabase" ou SUPABASE_ACCESS_TOKEN');
  }
}

function depsPadrao() {
  return {
    fetch: (...a) => globalThis.fetch(...a),
    token: tokenPadrao,
    io: { log: (s) => console.log(s), err: (s) => console.error(s) },
    ler: (p) => fs.readFileSync(p, 'utf8'),
    gravar: (p, t) => fs.writeFileSync(p, t, { mode: 0o644 }),
    agora: () => new Date().toISOString(),
  };
}

const USO =
  'USO: node scripts/p52_remove_storage.cjs --auto-teste | --capturar <saida.json> --populacao <POPULACAO.json> | ' +
  '--aprovado <STORAGE.json> [--dry-run [--esperar-vazio]]';

function lerArgs(argv) {
  const a = { modo: null, saida: null, populacao: null, aprovado: null, dryRun: false, esperarVazio: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--auto-teste') a.modo = a.modo ? 'erro' : 'auto';
    else if (x === '--capturar' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      a.modo = a.modo ? 'erro' : 'capturar';
      a.saida = argv[++i];
    } else if (x === '--populacao' && argv[i + 1] && !argv[i + 1].startsWith('--')) a.populacao = argv[++i];
    else if (x === '--aprovado' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      a.modo = a.modo ? 'erro' : 'aprovado';
      a.aprovado = argv[++i];
    } else if (x === '--dry-run') a.dryRun = true;
    else if (x === '--esperar-vazio') a.esperarVazio = true;
    else a.modo = 'erro';
  }
  if (a.modo === 'auto' && argv.length !== 1) a.modo = 'erro';
  if (a.modo === 'capturar' && (!a.populacao || a.dryRun || a.esperarVazio)) a.modo = 'erro';
  if (a.modo === 'aprovado' && (a.populacao || (a.esperarVazio && !a.dryRun))) a.modo = 'erro';
  return a;
}

async function modoCapturar(a, d, out) {
  let pop;
  try {
    pop = JSON.parse(d.ler(a.populacao));
  } catch {
    throw new Recusa('POPULACAO SEM apagaveis: POPULACAO.json ilegivel ou malformado');
  }
  const r = prefixosDaPopulacao(pop);
  if (r.erro) throw new Recusa(r.erro);
  const chave = await obterChave(d.fetch, d.token());
  out.segredos.push(chave);
  const cli = criarCliente(d.fetch, chave);
  const caminhos = await listarTodos(cli, r.prefixos);
  const total = await contarBucket(cli);
  const st = {
    bucket: BUCKET,
    prefixos: prefixosDe(caminhos),
    n_objetos: caminhos.length,
    nomes_md5: nomesMd5(caminhos),
    total_bucket: total,
    capturado_em: d.agora(),
  };
  d.gravar(a.saida, JSON.stringify(st, null, 2) + '\n');
  out.log(
    `STORAGE CAPTURADO: prefixos_da_populacao=${r.prefixos.length} prefixos_com_objeto=${st.prefixos.length} n_objetos=${st.n_objetos} ` +
      `nomes_md5=${st.nomes_md5} total_bucket=${st.total_bucket}`
  );
  return 0;
}

async function modoAprovado(a, d, out) {
  let ap;
  try {
    ap = JSON.parse(d.ler(a.aprovado));
  } catch {
    throw new Recusa('APROVADO FORA DO FORMATO: STORAGE.json ilegivel ou malformado');
  }
  const e = conferirAprovado(ap);
  if (e.length) throw new Recusa(`APROVADO FORA DO FORMATO: ${e.join(', ')}`);
  const chave = await obterChave(d.fetch, d.token());
  out.segredos.push(chave);
  const cli = criarCliente(d.fetch, chave);

  if (a.esperarVazio) {
    const restantes = (await listarTodos(cli, ap.prefixos)).length;
    const total = await contarBucket(cli);
    const esperado = ap.total_bucket - ap.n_objetos;
    out.log(`PROVA DEPOIS: restantes=${restantes} total_bucket=${total} (esperado ${esperado} = capturado ${ap.total_bucket} - aprovados ${ap.n_objetos})`);
    if (restantes !== 0 || total !== esperado) {
      out.err(`STORAGE NAO ESVAZIOU COMO APROVADO: restantes=${restantes} total_bucket=${total} esperado=${esperado}`);
      return 1;
    }
    return 0;
  }

  const caminhos = await listarTodos(cli, ap.prefixos);
  const agoraMd5 = nomesMd5(caminhos);
  if (caminhos.length !== ap.n_objetos || agoraMd5 !== ap.nomes_md5) {
    out.err(
      `STORAGE DIFERE DO APROVADO: agora n_objetos=${caminhos.length} nomes_md5=${agoraMd5}; aprovado n_objetos=${ap.n_objetos} nomes_md5=${ap.nomes_md5}; nada removido`
    );
    return 1;
  }
  if (a.dryRun) {
    out.log(`DRY-RUN: n_objetos=${caminhos.length} nomes_md5=${agoraMd5} = aprovado (prefixos=${ap.prefixos.length}); nada removido`);
    return 0;
  }
  const ordem = ordenarBytes(caminhos);
  let removidos = 0;
  for (let i = 0; i < ordem.length; i += LOTE) removidos += await cli.remover(ordem.slice(i, i + LOTE));
  const restantes = (await listarTodos(cli, ap.prefixos)).length;
  if (removidos !== caminhos.length || restantes !== 0) {
    out.err(`REMOCAO INCOMPLETA: removidos=${removidos} de ${caminhos.length}; restantes=${restantes} sob os prefixos aprovados`);
    return 1;
  }
  out.log(`REMOVIDOS: n=${removidos} nomes_md5=${agoraMd5}; restantes=0 sob ${ap.prefixos.length} prefixo(s) aprovado(s)`);
  return 0;
}

/* CLI testável: devolve o código de saída. `deps` substitui rede, token, saída e arquivos. */
async function principal(argv, deps) {
  const d = { ...depsPadrao(), ...(deps || {}) };
  const segredos = [];
  const redigir = (s) => {
    let t = String(s);
    for (const x of segredos) if (x) t = t.split(x).join('<redigido>');
    return t;
  };
  const out = { segredos, log: (s) => d.io.log(redigir(s)), err: (s) => d.io.err(redigir(s)) };
  const a = lerArgs(argv);
  if (!a.modo || a.modo === 'erro') {
    out.err(USO);
    return 2;
  }
  try {
    if (a.modo === 'auto') return await autoTeste(out);
    // o token entra na lista de redação antes de qualquer chamada
    const tk = d.token;
    d.token = () => {
      const t = tk();
      segredos.push(t);
      return t;
    };
    if (a.modo === 'capturar') return await modoCapturar(a, d, out);
    return await modoAprovado(a, d, out);
  } catch (e) {
    if (e instanceof Recusa) out.err(e.message);
    else if (e instanceof ErroRede) out.err(`ERRO DE REDE: ${e.message}; nada concluido`);
    else out.err(`ERRO INESPERADO: ${e && e.name ? e.name : 'erro'}; nada concluido`);
    return 1;
  }
}

/* ───────────────────────────── auto-teste (dublê de fetch, sem rede) ───────────────────────────── */

const CHAVE_FALSA = 'chave-service-role-FALSA-do-auto-teste';
const TOKEN_FALSO = 'token-management-FALSO-do-auto-teste';

function duble(iniciais) {
  const objetos = new Set(iniciais);
  const chamadas = [];
  const resp = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
  const f = async (url, init = {}) => {
    const metodo = String(init.method || 'GET').toUpperCase();
    const corpo = init.body ? JSON.parse(init.body) : null;
    const h = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    chamadas.push({ metodo, url, corpo, auth: h.authorization || '' });
    if (url === URL_CHAVES) {
      if (h.authorization !== `Bearer ${TOKEN_FALSO}`) return resp(401, {});
      return resp(200, [{ name: 'anon', api_key: 'anon-falsa' }, { name: 'service_role', api_key: CHAVE_FALSA }]);
    }
    if (h.authorization !== `Bearer ${CHAVE_FALSA}`) return resp(401, {});
    if (metodo === 'POST' && url === `${URL_PROJETO}/storage/v1/object/list/${BUCKET}`) {
      const pref = String(corpo.prefix || '');
      const linhas =
        pref === ''
          ? [...new Set([...objetos].map((x) => x.split('/')[0]))].sort().map((p) => ({ name: p, id: null }))
          : [...objetos].filter((x) => x.startsWith(pref + '/')).sort().map((x) => ({ name: x.slice(pref.length + 1), id: 'obj' }));
      return resp(200, linhas.slice(corpo.offset, corpo.offset + corpo.limit));
    }
    if (metodo === 'DELETE' && url === `${URL_PROJETO}/storage/v1/object/${BUCKET}`) {
      const ap = corpo.prefixes.filter((p) => objetos.has(p));
      for (const p of ap) objetos.delete(p);
      return resp(200, ap.map((name) => ({ name })));
    }
    return resp(404, {});
  };
  return { fetch: f, chamadas, objetos };
}

async function autoTeste(out) {
  const Uf = (n) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
  const amb = (arquivos, d) => {
    const saida = [];
    const mem = { ...arquivos };
    return {
      saida,
      mem,
      deps: {
        fetch: d.fetch,
        token: () => TOKEN_FALSO,
        io: { log: (s) => saida.push(String(s)), err: (s) => saida.push(String(s)) },
        ler: (p) => {
          if (!(p in mem)) throw new Error('ausente');
          return mem[p];
        },
        gravar: (p, t) => {
          mem[p] = t;
        },
        agora: () => '2026-10-13T12:00:00.000Z',
      },
    };
  };
  const apr = (alvo, prefixos, total) => JSON.stringify({ bucket: BUCKET, prefixos, n_objetos: alvo.length, nomes_md5: nomesMd5(alvo), total_bucket: total, capturado_em: '2026-10-13T11:00:00.000Z' });
  const dels = (d) => d.chamadas.filter((c) => c.metodo === 'DELETE').flatMap((c) => c.corpo.prefixes);
  const POP = JSON.stringify({ apagaveis: { ficticios: [{ id: Uf(1), user_id: null }], contas_teste_com_candidatura: [{ id: Uf(2), user_id: Uf(3) }] } });
  const FIXTURE = ['b/2.pdf', 'a/Ç.pdf', 'a/1.pdf', 'a/\u{1F600}.pdf', 'a/Ａ.pdf'];

  const casos = [
    ['forma canonica: fixture = 224b2ac162f0322444eed10e6335517a', async () => nomesMd5(FIXTURE) === '224b2ac162f0322444eed10e6335517a'],
    ['forma canonica: nao e o .sort() padrao (78557760...) nem a juncao com \\n final (deecf20e...)', async () => {
      const h = nomesMd5(FIXTURE);
      const padrao = md5([...FIXTURE].sort().join('\n'));
      const barraN = md5(ordenarBytes(FIXTURE).join('\n') + '\n');
      return padrao === '785577602c38ce87887c0bac892cf805' && barraN === 'deecf20eb606d12e2937b76656f97f4a' && h !== padrao && h !== barraN;
    }],
    ['forma canonica: lista vazia = d41d8cd98f00b204e9800998ecf8427e', async () => nomesMd5([]) === 'd41d8cd98f00b204e9800998ecf8427e'],
    ['prefixos distintos, sem / final, em ordem de bytes', async () => JSON.stringify(prefixosDe(['Ａ/x', 'b/1', 'a/2', 'b/3', 'Ç/y'])) === JSON.stringify(['a', 'b', 'Ç', 'Ａ'])],
    ['--capturar recusa POPULACAO SEM apagaveis (ausente, null, {}, sem entrada, lista) sem gravar nem chamar a rede', async () => {
      for (const p of ['{}', '{"apagaveis":null}', '{"apagaveis":{}}', '{"apagaveis":{"ficticios":[]}}', '{"apagaveis":[]}', 'nao-json']) {
        const d = duble([`${Uf(3)}/a.pdf`]);
        const e = amb({ 'pop.json': p }, d);
        const c = await principal(['--capturar', 's.json', '--populacao', 'pop.json'], e.deps);
        if (c !== 1 || !e.saida.join('\n').includes('POPULACAO SEM apagaveis') || 's.json' in e.mem || d.chamadas.length) return false;
      }
      return true;
    }],
    ['--capturar grava so { bucket, prefixos, n_objetos, nomes_md5, total_bucket, capturado_em }, sem nome de arquivo', async () => {
      const d = duble([`${Uf(3)}/cv fulano.pdf`, `${Uf(3)}/b.pdf`, `${Uf(1)}/c.pdf`, `${Uf(9)}/fica.pdf`]);
      const e = amb({ 'pop.json': POP }, d);
      if ((await principal(['--capturar', 's.json', '--populacao', 'pop.json'], e.deps)) !== 0) return false;
      const st = JSON.parse(e.mem['s.json']);
      return (
        JSON.stringify(Object.keys(st).sort()) === JSON.stringify(['bucket', 'capturado_em', 'n_objetos', 'nomes_md5', 'prefixos', 'total_bucket']) &&
        st.n_objetos === 3 && st.total_bucket === 4 && JSON.stringify(st.prefixos) === JSON.stringify([Uf(1), Uf(3)]) &&
        st.nomes_md5 === nomesMd5([`${Uf(3)}/cv fulano.pdf`, `${Uf(3)}/b.pdf`, `${Uf(1)}/c.pdf`]) && !/\.pdf|fulano/.test(e.mem['s.json'])
      );
    }],
    ['--aprovado com n_objetos=3 e nomes_md5 igual remove os 3 (chamadas registradas) e relista vazio', async () => {
      const alvo = [`${Uf(3)}/a.pdf`, `${Uf(3)}/b.pdf`, `${Uf(1)}/c.pdf`];
      const d = duble([...alvo, `${Uf(9)}/fica.pdf`]);
      const e = amb({ 'a.json': apr(alvo, [Uf(1), Uf(3)], 4) }, d);
      return (await principal(['--aprovado', 'a.json'], e.deps)) === 0 && JSON.stringify(dels(d).sort()) === JSON.stringify([...alvo].sort()) && d.objetos.size === 1;
    }],
    ['listagem com 4 -> STORAGE DIFERE DO APROVADO, nada removido', async () => {
      const alvo = [`${Uf(3)}/a.pdf`, `${Uf(3)}/b.pdf`, `${Uf(1)}/c.pdf`];
      const d = duble([...alvo, `${Uf(3)}/novo.pdf`]);
      const e = amb({ 'a.json': apr(alvo, [Uf(1), Uf(3)], 4) }, d);
      return (await principal(['--aprovado', 'a.json'], e.deps)) === 1 && e.saida.join('\n').includes('STORAGE DIFERE DO APROVADO') && !dels(d).length && d.objetos.size === 4;
    }],
    ['mesma contagem e nome trocado -> STORAGE DIFERE DO APROVADO (o md5 morde sozinho)', async () => {
      const alvo = [`${Uf(3)}/a.pdf`];
      const d = duble([`${Uf(3)}/z.pdf`]);
      const e = amb({ 'a.json': apr(alvo, [Uf(3)], 1) }, d);
      return (await principal(['--aprovado', 'a.json'], e.deps)) === 1 && e.saida.join('\n').includes('STORAGE DIFERE DO APROVADO') && !dels(d).length;
    }],
    ['prefixo fora da lista: nunca listado nem removido', async () => {
      const alvo = [`${Uf(3)}/a.pdf`];
      const d = duble([...alvo, `${Uf(9)}/fica.pdf`]);
      const e = amb({ 'a.json': apr(alvo, [Uf(3)], 2) }, d);
      const ok = (await principal(['--aprovado', 'a.json'], e.deps)) === 0;
      const listados = d.chamadas.filter((c) => c.url.endsWith(`/object/list/${BUCKET}`)).map((c) => c.corpo.prefix);
      return ok && listados.length > 0 && listados.every((p) => p === Uf(3)) && !dels(d).some((p) => p.startsWith(Uf(9))) && d.objetos.has(`${Uf(9)}/fica.pdf`);
    }],
    ['a chave e o token nunca em stdout/stderr; nenhum nome de arquivo', async () => {
      const alvo = [`${Uf(3)}/curriculo-nome-sobrenome.pdf`];
      const d = duble(alvo);
      const ok = JSON.parse(apr(alvo, [Uf(3)], 1));
      const e = amb({ 'ok.json': JSON.stringify(ok), 'difere.json': JSON.stringify({ ...ok, n_objetos: 2 }), 'pop.json': POP }, d);
      await principal(['--capturar', 's.json', '--populacao', 'pop.json'], e.deps);
      await principal(['--aprovado', 'difere.json'], e.deps);
      await principal(['--aprovado', 'ok.json', '--dry-run'], e.deps);
      await principal(['--aprovado', 'ok.json'], e.deps);
      const t = e.saida.join('\n');
      return e.saida.length >= 4 && !t.includes(CHAVE_FALSA) && !t.includes(TOKEN_FALSO) && !/sobrenome|\.pdf/.test(t) && d.chamadas.some((c) => c.auth === `Bearer ${CHAVE_FALSA}`);
    }],
    ['--dry-run lista, confere, imprime contagem e md5, nao remove', async () => {
      const alvo = [`${Uf(3)}/a.pdf`, `${Uf(1)}/c.pdf`];
      const d = duble(alvo);
      const e = amb({ 'a.json': apr(alvo, [Uf(1), Uf(3)], 2) }, d);
      const t = () => e.saida.join('\n');
      return (await principal(['--aprovado', 'a.json', '--dry-run'], e.deps)) === 0 && t().includes('n_objetos=2') && t().includes(nomesMd5(alvo)) && !dels(d).length && d.objetos.size === 2;
    }],
    ['--dry-run --esperar-vazio: restantes=0 e total coerente -> 0; restante ou total diferente -> 1', async () => {
      const ap = apr([`${Uf(3)}/a.pdf`, `${Uf(3)}/b.pdf`], [Uf(3)], 3);
      const e1 = amb({ 'a.json': ap }, duble([`${Uf(9)}/fica.pdf`]));
      const e2 = amb({ 'a.json': ap }, duble([`${Uf(3)}/a.pdf`, `${Uf(9)}/fica.pdf`]));
      const e3 = amb({ 'a.json': ap }, duble([]));
      return (
        (await principal(['--aprovado', 'a.json', '--dry-run', '--esperar-vazio'], e1.deps)) === 0 && /restantes=0 total_bucket=1/.test(e1.saida.join('\n')) &&
        (await principal(['--aprovado', 'a.json', '--dry-run', '--esperar-vazio'], e2.deps)) === 1 && /restantes=1/.test(e2.saida.join('\n')) &&
        (await principal(['--aprovado', 'a.json', '--dry-run', '--esperar-vazio'], e3.deps)) === 1
      );
    }],
    ['APROVADO fora do formato (prefixo com /, md5 malformado, fora da ordem) -> recusa sem rede', async () => {
      for (const j of [
        { bucket: BUCKET, prefixos: ['a/b'], n_objetos: 1, nomes_md5: md5('x'), total_bucket: 1, capturado_em: '2026-10-13T11:00:00Z' },
        { bucket: BUCKET, prefixos: [Uf(1)], n_objetos: 1, nomes_md5: 'xyz', total_bucket: 1, capturado_em: '2026-10-13T11:00:00Z' },
        { bucket: BUCKET, prefixos: [Uf(3), Uf(1)], n_objetos: 1, nomes_md5: md5('x'), total_bucket: 1, capturado_em: '2026-10-13T11:00:00Z' },
        { bucket: 'outro', prefixos: [Uf(1)], n_objetos: 1, nomes_md5: md5('x'), total_bucket: 1, capturado_em: '2026-10-13T11:00:00Z' },
      ]) {
        const d = duble([]);
        const e = amb({ 'a.json': JSON.stringify(j) }, d);
        if ((await principal(['--aprovado', 'a.json'], e.deps)) !== 1 || !e.saida.join('\n').includes('APROVADO FORA DO FORMATO') || d.chamadas.length) return false;
      }
      return true;
    }],
    ['subpasta sob um prefixo aprovado -> recusa, nada removido', async () => {
      const d = duble([`${Uf(3)}/sub/a.pdf`]);
      const orig = d.fetch;
      d.fetch = async (url, init) => {
        const r = await orig(url, init);
        if (init && init.method === 'POST' && JSON.parse(init.body).prefix === Uf(3)) return { ok: true, status: 200, json: async () => [{ name: 'sub', id: null }] };
        return r;
      };
      const e = amb({ 'a.json': apr([`${Uf(3)}/sub`], [Uf(3)], 1) }, d);
      return (await principal(['--aprovado', 'a.json'], e.deps)) === 1 && e.saida.join('\n').includes('SUBPASTA NO PREFIXO') && !dels(d).length;
    }],
    ['uso invalido -> 2', async () => {
      const e = amb({}, duble([]));
      return (await principal(['--aprovado', 'a.json', '--esperar-vazio'], e.deps)) === 2 && (await principal([], e.deps)) === 2 && (await principal(['--capturar', 's.json'], e.deps)) === 2;
    }],
  ];

  const falhas = [];
  for (const [nome, f] of casos) {
    let r = false;
    try {
      r = (await f()) === true;
    } catch {
      r = false;
    }
    if (!r) falhas.push(nome);
  }
  if (falhas.length) {
    out.err(`REMOVE AUTO-TESTE FALHOU: ${falhas.join('; ')}`);
    return 1;
  }
  out.log(`REMOVE AUTO-TESTE OK: ${casos.length}/${casos.length} (forma canonica do STORAGE.json, capturar, aprovado, recusas, dry-run, esperar-vazio, chave e nomes fora da saida)`);
  return 0;
}

module.exports = { nomesMd5, prefixosDe, ordenarBytes, prefixosDaPopulacao, conferirAprovado, obterChave, criarCliente, listarPrefixo, contarBucket, principal, autoTeste: () => autoTeste({ segredos: [], log: (s) => console.log(s), err: (s) => console.error(s) }), BUCKET, URL_PROJETO, URL_CHAVES };

if (require.main === module) {
  principal(process.argv.slice(2)).then(
    (c) => process.exit(c),
    () => {
      console.error('ERRO INESPERADO; nada concluido');
      process.exit(1);
    }
  );
}
