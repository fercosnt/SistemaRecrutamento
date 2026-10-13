'use strict';
/*
 * Phase 52 / Plano 52-20 Task 2 — testes de `scripts/p52_remove_storage.cjs` (remoção dos currículos da
 * população aprovada pela Storage API, SÓ a lista aprovada — O4, F11).
 *
 * Roda com o test runner do Node (o Vitest do projeto exclui `scripts/**` no vite.config.ts):
 *   node --test scripts/__tests__/p52_remove_storage.test.cjs
 *
 * Nada aqui toca a rede: todo `fetch` é um DUBLÊ em memória (Management API para a chave, Storage API
 * para listar/remover), e a chave `service_role` do dublê é um texto falso. Cada caso prova uma linha do
 * `<behavior>` do plano:
 *   · a forma canônica de `nomes_md5`/`prefixos` (contrato do STORAGE.json com o 52-27 — a fixture do
 *     parágrafo «Forma canônica», literal: 224b2ac1…, e NÃO 78557760… nem deecf20e…);
 *   · `--capturar` recusa `POPULACAO SEM apagaveis` (ausente, null, {}) sem gravar nada;
 *   · `--aprovado` remove exatamente a lista aprovada; listagem diferente → `STORAGE DIFERE DO APROVADO`,
 *     nada removido; prefixo fora da lista nunca listado nem removido;
 *   · a chave e os nomes de arquivo nunca saem em stdout/stderr;
 *   · `--dry-run` não remove; `--dry-run --esperar-vazio` imprime `restantes=` e `total_bucket=`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'p52_remove_storage.cjs');
// Ausência do módulo = objeto vazio: cada caso reprova na SUA asserção, nunca por erro de carga.
const m = fs.existsSync(SCRIPT) ? require(SCRIPT) : {};
const chamar = (f, ...a) => (typeof f === 'function' ? f(...a) : undefined);

// A fixture do contrato (52-20 e 52-27, palavra por palavra), em escapes de JavaScript.
const FIXTURE = ['b/2.pdf', 'a/Ç.pdf', 'a/1.pdf', 'a/\u{1F600}.pdf', 'a/Ａ.pdf'];
const MD5_CANONICO = '224b2ac162f0322444eed10e6335517a';
const MD5_SORT_PADRAO = '785577602c38ce87887c0bac892cf805';
const MD5_BARRA_N_FINAL = 'deecf20eb606d12e2937b76656f97f4a';

const REF = 'isljnozzlvckrgjjbjwp';
const URL_PROJETO = `https://${REF}.supabase.co`;
const CHAVE = 'chave-service-role-FALSA-do-duble-52-20';
const TOKEN = 'token-management-FALSO-do-duble-52-20';
const U = (n) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;

/* Dublê da rede: Management API (api-keys) + Storage API (list/remove) sobre um bucket em memória. */
function duble(caminhosIniciais) {
  const objetos = new Set(caminhosIniciais);
  const chamadas = [];
  const fetchDuble = async (url, init = {}) => {
    const metodo = String(init.method || 'GET').toUpperCase();
    const corpo = init.body ? JSON.parse(init.body) : null;
    const h = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    chamadas.push({ metodo, url, corpo, auth: h.authorization || '' });
    const resp = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json, text: async () => JSON.stringify(json) });
    if (url === `https://api.supabase.com/v1/projects/${REF}/api-keys` || url.startsWith(`https://api.supabase.com/v1/projects/${REF}/api-keys?`)) {
      if (h.authorization !== `Bearer ${TOKEN}`) return resp(401, { message: 'unauthorized' });
      return resp(200, [{ name: 'anon', api_key: 'anon-falsa' }, { name: 'service_role', api_key: CHAVE }]);
    }
    if (h.authorization !== `Bearer ${CHAVE}`) return resp(401, { message: 'unauthorized' });
    if (metodo === 'POST' && url === `${URL_PROJETO}/storage/v1/object/list/curriculos`) {
      const pref = String(corpo.prefix || '').replace(/\/$/, '');
      let linhas;
      if (pref === '') {
        linhas = [...new Set([...objetos].map((x) => x.split('/')[0]))].sort().map((p) => ({ name: p, id: null }));
      } else {
        linhas = [...objetos]
          .filter((x) => x.startsWith(pref + '/'))
          .map((x) => ({ name: x.slice(pref.length + 1), id: 'obj' }))
          .sort((a, b) => (a.name < b.name ? -1 : 1));
      }
      const off = corpo.offset || 0;
      return resp(200, linhas.slice(off, off + (corpo.limit || 100)));
    }
    if (metodo === 'DELETE' && url === `${URL_PROJETO}/storage/v1/object/curriculos`) {
      const apagados = corpo.prefixes.filter((p) => objetos.has(p));
      for (const p of apagados) objetos.delete(p);
      return resp(200, apagados.map((name) => ({ name })));
    }
    return resp(404, { message: 'rota do duble desconhecida' });
  };
  return { fetch: fetchDuble, chamadas, objetos };
}

/* Saída capturada + sistema de arquivos em memória para o CLI. */
function ambiente(arquivos, d) {
  const saida = [];
  const fsMem = { ...arquivos };
  const deps = {
    fetch: d.fetch,
    token: () => TOKEN,
    io: { log: (s) => saida.push(String(s)), err: (s) => saida.push(String(s)) },
    ler: (p) => {
      if (!(p in fsMem)) throw new Error('arquivo ausente');
      return fsMem[p];
    },
    gravar: (p, t) => {
      fsMem[p] = t;
    },
    agora: () => '2026-10-13T12:00:00.000Z',
  };
  return { deps, saida, fsMem };
}

const POP_OK = JSON.stringify({ apagaveis: { ficticios: [{ id: U(1), user_id: null }], contas_teste_com_candidatura: [{ id: U(2), user_id: U(3) }] } });
const aprovadoDe = (alvo, prefixos, total) => ({
  bucket: 'curriculos',
  prefixos,
  n_objetos: alvo.length,
  nomes_md5: chamar(m.nomesMd5, alvo),
  total_bucket: total,
  capturado_em: '2026-10-13T11:00:00.000Z',
});
const removidosDe = (d) => d.chamadas.filter((c) => c.metodo === 'DELETE').flatMap((c) => c.corpo.prefixes);

test('forma canonica: a fixture do contrato da 224b2ac162f0322444eed10e6335517a', () => {
  assert.equal(chamar(m.nomesMd5, FIXTURE), MD5_CANONICO);
});

test('forma canonica: nao e o md5 do sort padrao nem o da juncao com quebra de linha final', () => {
  const h = chamar(m.nomesMd5, FIXTURE);
  assert.match(String(h), /^[0-9a-f]{32}$/);
  assert.notEqual(h, MD5_SORT_PADRAO);
  assert.notEqual(h, MD5_BARRA_N_FINAL);
  assert.equal(chamar(m.nomesMd5, []), 'd41d8cd98f00b204e9800998ecf8427e');
});

test('prefixos distintos, sem barra final, em ordem de bytes', () => {
  assert.deepEqual(chamar(m.prefixosDe, ['Ａ/x.pdf', 'b/1.pdf', 'a/2.pdf', 'b/3.pdf', 'Ç/y.pdf']), ['a', 'b', 'Ç', 'Ａ']);
});

test('--capturar: POPULACAO sem apagaveis, com null ou vazia recusa POPULACAO SEM apagaveis e nada e gravado', async () => {
  for (const pop of ['{}', '{"apagaveis":null}', '{"apagaveis":{}}', '{"apagaveis":{"ficticios":[]}}', '{"apagaveis":[]}']) {
    const d = duble([`${U(3)}/a.pdf`]);
    const { deps, saida, fsMem } = ambiente({ 'pop.json': pop }, d);
    const codigo = await chamar(m.principal, ['--capturar', 'saida.json', '--populacao', 'pop.json'], deps);
    assert.equal(codigo, 1, `codigo para ${pop}`);
    assert.ok(saida.join('\n').includes('POPULACAO SEM apagaveis'), `mensagem para ${pop}`);
    assert.equal('saida.json' in fsMem, false, `nada gravado para ${pop}`);
  }
});

test('--capturar grava bucket, prefixos, n_objetos, nomes_md5, total_bucket e capturado_em, sem nome de arquivo', async () => {
  const d = duble([`${U(3)}/cv joao.pdf`, `${U(3)}/b.pdf`, `${U(1)}/c.pdf`, `${U(9)}/fica.pdf`]);
  const { deps, fsMem } = ambiente({ 'pop.json': POP_OK }, d);
  assert.equal(await chamar(m.principal, ['--capturar', 'st.json', '--populacao', 'pop.json'], deps), 0);
  const st = JSON.parse(fsMem['st.json']);
  assert.deepEqual(Object.keys(st).sort(), ['bucket', 'capturado_em', 'n_objetos', 'nomes_md5', 'prefixos', 'total_bucket']);
  assert.equal(st.bucket, 'curriculos');
  assert.equal(st.n_objetos, 3);
  assert.equal(st.total_bucket, 4);
  assert.deepEqual(st.prefixos, [U(1), U(3)]);
  assert.equal(st.nomes_md5, chamar(m.nomesMd5, [`${U(3)}/cv joao.pdf`, `${U(3)}/b.pdf`, `${U(1)}/c.pdf`]));
  assert.doesNotMatch(fsMem['st.json'], /\.pdf|joao/);
});

test('--aprovado: listagem igual (3) remove os 3 e relista vazio', async () => {
  const alvo = [`${U(3)}/a.pdf`, `${U(3)}/b.pdf`, `${U(1)}/c.pdf`];
  const d = duble([...alvo, `${U(9)}/fica.pdf`]);
  const { deps } = ambiente({ 'ap.json': JSON.stringify(aprovadoDe(alvo, [U(1), U(3)], 4)) }, d);
  assert.equal(await chamar(m.principal, ['--aprovado', 'ap.json'], deps), 0);
  assert.deepEqual(removidosDe(d).sort(), [...alvo].sort());
  assert.deepEqual([...d.objetos], [`${U(9)}/fica.pdf`]);
});

test('--aprovado: listagem com 4 recusa STORAGE DIFERE DO APROVADO e nada e removido', async () => {
  const alvo = [`${U(3)}/a.pdf`, `${U(3)}/b.pdf`, `${U(1)}/c.pdf`];
  const d = duble([...alvo, `${U(3)}/novo.pdf`]);
  const { deps, saida } = ambiente({ 'ap.json': JSON.stringify(aprovadoDe(alvo, [U(1), U(3)], 4)) }, d);
  assert.equal(await chamar(m.principal, ['--aprovado', 'ap.json'], deps), 1);
  assert.ok(saida.join('\n').includes('STORAGE DIFERE DO APROVADO'));
  assert.equal(d.chamadas.some((c) => c.metodo === 'DELETE'), false);
  assert.equal(d.objetos.size, 4);
});

test('prefixo fora da lista aprovada nunca e listado nem removido', async () => {
  const alvo = [`${U(3)}/a.pdf`];
  const d = duble([...alvo, `${U(9)}/fica.pdf`]);
  const { deps } = ambiente({ 'ap.json': JSON.stringify(aprovadoDe(alvo, [U(3)], 2)) }, d);
  assert.equal(await chamar(m.principal, ['--aprovado', 'ap.json'], deps), 0);
  const listados = d.chamadas.filter((c) => c.url.endsWith('/object/list/curriculos')).map((c) => c.corpo.prefix);
  assert.ok(listados.length > 0);
  assert.ok(listados.every((p) => p.startsWith(U(3))));
  assert.equal(removidosDe(d).some((p) => p.startsWith(U(9))), false);
  assert.equal(d.objetos.has(`${U(9)}/fica.pdf`), true);
});

test('a chave service_role e os nomes de arquivo nunca aparecem em stdout/stderr', async () => {
  const alvo = [`${U(3)}/curriculo-maria-silva.pdf`];
  const d = duble(alvo);
  const ok = aprovadoDe(alvo, [U(3)], 1);
  const e = ambiente({ 'ok.json': JSON.stringify(ok), 'difere.json': JSON.stringify({ ...ok, n_objetos: 2 }), 'pop.json': POP_OK }, d);
  await chamar(m.principal, ['--capturar', 'st.json', '--populacao', 'pop.json'], e.deps);
  await chamar(m.principal, ['--aprovado', 'difere.json'], e.deps);
  await chamar(m.principal, ['--aprovado', 'ok.json', '--dry-run'], e.deps);
  await chamar(m.principal, ['--aprovado', 'ok.json'], e.deps);
  const tudo = e.saida.join('\n');
  assert.ok(e.saida.length > 0);
  assert.equal(tudo.includes(CHAVE), false);
  assert.equal(tudo.includes(TOKEN), false);
  assert.doesNotMatch(tudo, /maria|silva|\.pdf/i);
  // a chave chegou à Storage API: o caminho da chave foi exercido
  assert.ok(d.chamadas.some((c) => c.auth === `Bearer ${CHAVE}`));
});

test('--dry-run: lista e confere, imprime contagem e md5, nao remove', async () => {
  const alvo = [`${U(3)}/a.pdf`, `${U(1)}/c.pdf`];
  const d = duble(alvo);
  const ap = aprovadoDe(alvo, [U(1), U(3)], 2);
  const { deps, saida } = ambiente({ 'ap.json': JSON.stringify(ap) }, d);
  assert.equal(await chamar(m.principal, ['--aprovado', 'ap.json', '--dry-run'], deps), 0);
  assert.ok(saida.join('\n').includes('n_objetos=2'));
  assert.ok(saida.join('\n').includes(ap.nomes_md5));
  assert.equal(d.chamadas.some((c) => c.metodo === 'DELETE'), false);
  assert.equal(d.objetos.size, 2);
});

test('--dry-run --esperar-vazio: restantes=0 e total_bucket = capturado - aprovados; senao saida 1', async () => {
  const ap = aprovadoDe([`${U(3)}/a.pdf`, `${U(3)}/b.pdf`], [U(3)], 3);
  const vazio = duble([`${U(9)}/fica.pdf`]);
  const e1 = ambiente({ 'ap.json': JSON.stringify(ap) }, vazio);
  assert.equal(await chamar(m.principal, ['--aprovado', 'ap.json', '--dry-run', '--esperar-vazio'], e1.deps), 0);
  assert.match(e1.saida.join('\n'), /restantes=0/);
  assert.match(e1.saida.join('\n'), /total_bucket=1/);
  const sobrou = duble([`${U(3)}/a.pdf`, `${U(9)}/fica.pdf`]);
  const e2 = ambiente({ 'ap.json': JSON.stringify(ap) }, sobrou);
  assert.equal(await chamar(m.principal, ['--aprovado', 'ap.json', '--dry-run', '--esperar-vazio'], e2.deps), 1);
  assert.match(e2.saida.join('\n'), /restantes=1/);
  const outroSumiu = duble([]);
  const e3 = ambiente({ 'ap.json': JSON.stringify(ap) }, outroSumiu);
  assert.equal(await chamar(m.principal, ['--aprovado', 'ap.json', '--dry-run', '--esperar-vazio'], e3.deps), 1);
  assert.equal([vazio, sobrou, outroSumiu].some((x) => x.chamadas.some((c) => c.metodo === 'DELETE')), false);
});

test('o script nao contem storage.objects e o --auto-teste dele sai verde', () => {
  assert.equal(fs.existsSync(SCRIPT), true);
  const fonte = fs.readFileSync(SCRIPT, 'utf8');
  assert.equal(fonte.includes('storage.objects'), false);
  const out = execFileSync(process.execPath, [SCRIPT, '--auto-teste'], { encoding: 'utf8' });
  assert.match(out, /^REMOVE AUTO-TESTE OK: (\d+)\/\1/m);
});
