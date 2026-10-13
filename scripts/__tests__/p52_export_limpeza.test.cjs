'use strict';
/*
 * Phase 52 / Plano 52-27 Task 2 — testes de `scripts/p52_export_limpeza.cjs` (export prévio da população
 * aprovada da limpeza do bloco D — D-41 emendada, condição 2: escrever e conferir o export).
 *
 * Roda com o test runner do Node (o Vitest do projeto exclui `scripts/**` no vite.config.ts):
 *   node --test --test-reporter=tap scripts/__tests__/p52_export_limpeza.test.cjs
 *
 * Nada aqui toca a rede nem o PROD: o banco é o DUBLÊ de consulta do próprio script (`consultaEmMemoria`
 * sobre `fixtureFecho`) e a Storage API é um dublê de `fetch` com chave e token FALSOS. O export de teste é
 * gravado em diretórios temporários do sistema (fora de qualquer árvore git) e apagado no fim. Cada caso
 * prova uma linha do `<behavior>` da Task 2:
 *   · a forma canônica de `nomes_md5`/`prefixos` (contrato do STORAGE.json com o 52-20 — a fixture literal:
 *     224b2ac1…, e NÃO 78557760… nem deecf20e…);
 *   · `--exportar`: diretório 0700, arquivos 0600, `linhas.jsonl` `{t, m, r}` na ordem do fecho, colunas
 *     `token` de `auth.users` em '' e listadas, `encrypted_password` presente, `storage/K.bin` +
 *     `storage/INDICE.json`, `MANIFESTO.json`, `export_md5` determinístico;
 *   · cada recusa: DENTRO DE REPOSITORIO, JA EXISTE, AUSENTE (diretório, MANIFESTO.json, linhas.jsonl, um
 *     storage/K.bin), ADULTERADO, NAO E A POPULACAO, NAO E O APROVADO, DIFERE DO VIVO;
 *   · nenhuma chave, token, e-mail, nome ou nome de arquivo em stdout/stderr.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'p52_export_limpeza.cjs');
const RAIZ = path.resolve(__dirname, '..', '..');
// Ausência do módulo = objeto vazio: cada caso reprova na SUA asserção, nunca por erro de carga.
const m = fs.existsSync(SCRIPT) ? require(SCRIPT) : {};
const chamar = (f, ...a) => (typeof f === 'function' ? f(...a) : undefined);
const precisa = (...nomes) => {
  for (const n of nomes) assert.strictEqual(typeof m[n], 'function', `${n} ausente do modulo`);
};
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');

// A fixture do contrato (52-20 e 52-27, palavra por palavra), em escapes de JavaScript.
const FIXTURE = ['b/2.pdf', 'a/Ç.pdf', 'a/1.pdf', 'a/\u{1F600}.pdf', 'a/Ａ.pdf'];
const MD5_CANONICO = '224b2ac162f0322444eed10e6335517a';
const MD5_SORT_PADRAO = '785577602c38ce87887c0bac892cf805';
const MD5_BARRA_N_FINAL = 'deecf20eb606d12e2937b76656f97f4a';

const temporarios = [];
test.after(() => {
  for (const t of temporarios) fs.rmSync(t, { recursive: true, force: true });
});

/* Um ambiente: fixture do fecho, dublê de banco e de Storage, entradas gravadas num temporário. */
function ambiente() {
  precisa('fixtureFecho', 'consultaEmMemoria', 'dubleStorage', 'nomesMd5', 'prefixosDe', 'principal');
  const f = m.fixtureFecho();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p52-27-teste-'));
  temporarios.push(tmp);
  const objetos = {
    [`${f.Uu(1)}/curriculo-fulano-sobrenome.pdf`]: Buffer.from('%PDF-falso-1 conteudo do curriculo'),
    [`${f.C(4)}/cv.pdf`]: Buffer.from('%PDF-falso-2'),
  };
  const caminhos = Object.keys(objetos);
  const storage = { bucket: 'curriculos', prefixos: m.prefixosDe(caminhos), n_objetos: caminhos.length, nomes_md5: m.nomesMd5(caminhos), total_bucket: 3, capturado_em: '2026-10-13T11:00:00.000Z' };
  const arq = (nome, txt) => {
    const p = path.join(tmp, nome);
    fs.writeFileSync(p, txt);
    return p;
  };
  const P = arq('pop.json', JSON.stringify(f.pop));
  const D = arq('dec.md', f.decisao);
  const S = arq('storage.json', JSON.stringify(storage));
  const rede = m.dubleStorage(objetos);
  const saida = [];
  const deps = { consultar: m.consultaEmMemoria(f.db), fetch: rede.fetch, token: () => rede.token, io: { log: (s) => saida.push(String(s)), err: (s) => saida.push(String(s)) } };
  const dir = path.join(tmp, 'export', '20261013T120000Z');
  const exportar = (alvo) => m.principal(['--exportar', alvo || dir, '--populacao', P, '--decisao-escopo', D, '--storage', S], deps);
  const conferir = (...extra) => m.principal(['--conferir', ...extra, '--populacao', P, '--storage', S], deps);
  return { f, tmp, objetos, storage, P, D, S, rede, saida, deps, dir, exportar, conferir, arq, texto: () => saida.join('\n') };
}

const linhas = (dir) => fs.readFileSync(path.join(dir, 'linhas.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const manifestoMd5 = (dir) => md5(fs.readFileSync(path.join(dir, 'MANIFESTO.json')));

test('forma canonica: a fixture do contrato da 224b2ac162f0322444eed10e6335517a', () => {
  assert.strictEqual(chamar(m.nomesMd5, FIXTURE), MD5_CANONICO);
});

test('forma canonica: nao e o md5 do sort padrao nem o da juncao com quebra de linha final; vazia = d41d8cd9; prefixos em ordem de bytes', () => {
  precisa('nomesMd5', 'prefixosDe');
  const h = m.nomesMd5(FIXTURE);
  assert.notStrictEqual(h, MD5_SORT_PADRAO);
  assert.notStrictEqual(h, MD5_BARRA_N_FINAL);
  assert.strictEqual(m.nomesMd5([]), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.deepStrictEqual(m.prefixosDe(['Ａ/x', 'b/1', 'a/2', 'b/3', 'Ç/y']), ['a', 'b', 'Ç', 'Ａ']);
});

test('--exportar: diretorio 0700, arquivos 0600, linhas {t, m, r} na ordem do fecho, MANIFESTO, INDICE e K.bin', async () => {
  const e = ambiente();
  assert.strictEqual(await e.exportar(), 0, e.texto());
  assert.strictEqual(fs.statSync(e.dir).mode & 0o777, 0o700);
  assert.strictEqual(fs.statSync(path.join(e.dir, 'storage')).mode & 0o777, 0o700);
  for (const a of ['MANIFESTO.json', 'linhas.jsonl', 'storage/INDICE.json', 'storage/1.bin', 'storage/2.bin']) {
    assert.strictEqual(fs.statSync(path.join(e.dir, a)).mode & 0o777, 0o600, a);
  }
  const L = linhas(e.dir);
  assert.ok(L.length > 0 && L.every((l) => Object.keys(l).join() === 't,m,r' && ['apaga', 'anula', 'atualiza'].includes(l.m)));
  const ts = L.map((l) => l.t);
  assert.ok(ts.lastIndexOf('auth.users') < ts.indexOf('auth.identities'));
  assert.ok(ts.lastIndexOf('public.candidatos') < ts.indexOf('public.candidaturas'));
  assert.ok(ts.lastIndexOf('public.candidaturas') < ts.indexOf('public.filho'));
  assert.ok(ts.lastIndexOf('public.filho') < ts.indexOf('public.neto'));
  assert.ok(!ts.some((t) => ['auth.sessions', 'auth.refresh_tokens', 'auth.mfa_factors'].includes(t)));
  const mf = JSON.parse(fs.readFileSync(path.join(e.dir, 'MANIFESTO.json'), 'utf8'));
  assert.strictEqual(mf.versao_formato, 1);
  assert.strictEqual(mf.populacao_md5, e.f.pop.populacao_md5);
  assert.strictEqual(mf.tabelas['public.candidatos'].por_modo.apaga, 4);
  assert.strictEqual(mf.tabelas['auth.users'].por_modo.apaga, 1);
  assert.deepStrictEqual(mf.excluidas_por_desenho, { 'auth.sessions': 1, 'auth.refresh_tokens': 1, 'auth.mfa_factors': 1 });
  assert.match(mf.exportado_em, /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$/);
  const ind = JSON.parse(fs.readFileSync(path.join(e.dir, 'storage', 'INDICE.json'), 'utf8'));
  assert.strictEqual(ind.length, 2);
  for (const x of ind) assert.strictEqual(md5(fs.readFileSync(path.join(e.dir, 'storage', `${x.k}.bin`))), x.md5);
  assert.strictEqual(mf.storage.nomes_md5, e.storage.nomes_md5);
  assert.match(e.texto(), new RegExp(`^EXPORT GRAVADO: dir=${e.dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} export_md5=${manifestoMd5(e.dir)} exportado_em=\\S+ linhas=${L.length} tabelas=\\d+ curriculos=2$`, 'm'));
});

test('--exportar: colunas token de auth.users em branco e listadas em colunas_em_branco; encrypted_password presente', async () => {
  const e = ambiente();
  assert.strictEqual(await e.exportar(), 0, e.texto());
  const mf = JSON.parse(fs.readFileSync(path.join(e.dir, 'MANIFESTO.json'), 'utf8'));
  assert.deepStrictEqual(mf.colunas_em_branco, { 'auth.users': ['confirmation_token', 'email_change_token_new', 'recovery_token'] });
  const u = linhas(e.dir).filter((l) => l.t === 'auth.users');
  assert.strictEqual(u.length, 1);
  for (const c of mf.colunas_em_branco['auth.users']) assert.strictEqual(u[0].r[c], '');
  assert.ok(typeof u[0].r.encrypted_password === 'string' && u[0].r.encrypted_password.length > 0);
});

test('--exportar duas vezes do mesmo estado da o mesmo export_md5', async () => {
  const e = ambiente();
  assert.strictEqual(await e.exportar(), 0, e.texto());
  const outro = path.join(e.tmp, 'export2', 'x');
  assert.strictEqual(await e.exportar(outro), 0, e.texto());
  assert.strictEqual(manifestoMd5(e.dir), manifestoMd5(outro));
});

test('recusas antes de gravar: dentro do repositorio, dentro de outra arvore git, diretorio ja existente', async () => {
  const e = ambiente();
  const noRepo = path.join(RAIZ, '.planning', 'tmp', 'p52-27-nunca-criado');
  assert.strictEqual(await e.exportar(noRepo), 1);
  assert.match(e.texto(), /EXPORT DENTRO DE REPOSITORIO/);
  assert.ok(!fs.existsSync(noRepo));
  const git = fs.mkdtempSync(path.join(os.tmpdir(), 'p52-27-git-'));
  temporarios.push(git);
  execFileSync('git', ['init', '-q', git]);
  const naArvore = path.join(git, 'sub', 'export');
  e.saida.length = 0;
  assert.strictEqual(await e.exportar(naArvore), 1);
  assert.match(e.texto(), /EXPORT DENTRO DE REPOSITORIO/);
  assert.ok(!fs.existsSync(naArvore));
  fs.mkdirSync(e.dir, { recursive: true });
  e.saida.length = 0;
  assert.strictEqual(await e.exportar(), 1);
  assert.match(e.texto(), /EXPORT JA EXISTE/);
});

test('--conferir --dir: EXPORT AUSENTE para cada ausencia (diretorio, MANIFESTO.json, linhas.jsonl, um storage/K.bin)', async () => {
  const e = ambiente();
  e.saida.length = 0;
  assert.strictEqual(await e.conferir('--dir', path.join(e.tmp, 'nao-existe')), 1);
  assert.match(e.texto(), /EXPORT AUSENTE: diretorio/);
  for (const [a, re] of [['MANIFESTO.json', /EXPORT AUSENTE: MANIFESTO\.json/], ['linhas.jsonl', /EXPORT AUSENTE: linhas\.jsonl/], ['storage/2.bin', /EXPORT AUSENTE: storage\/2\.bin/]]) {
    const d = path.join(e.tmp, `x-${a.replace(/\W/g, '')}`);
    assert.strictEqual(await e.exportar(d), 0, e.texto());
    fs.rmSync(path.join(d, a));
    e.saida.length = 0;
    assert.strictEqual(await e.conferir('--dir', d), 1, a);
    assert.match(e.texto(), re);
  }
});

test('--conferir --dir: um octeto trocado em qualquer arquivo -> EXPORT ADULTERADO: <arquivo>', async () => {
  const e = ambiente();
  for (const a of ['linhas.jsonl', 'MANIFESTO.json', 'storage/INDICE.json', 'storage/1.bin']) {
    const d = path.join(e.tmp, `adult-${a.replace(/\W/g, '')}`);
    assert.strictEqual(await e.exportar(d), 0, e.texto());
    const p = path.join(d, a);
    const b = fs.readFileSync(p);
    const i = Math.floor(b.length / 2);
    b[i] = b[i] === 0x41 ? 0x42 : 0x41;
    fs.chmodSync(p, 0o600);
    fs.writeFileSync(p, b);
    e.saida.length = 0;
    assert.strictEqual(await e.conferir('--dir', d), 1, a);
    assert.ok(e.texto().includes(`EXPORT ADULTERADO: ${a}`), `${a}: ${e.texto()}`);
  }
});

test('--conferir: raizes != apagaveis (id a mais ou a menos) e Storage != captura -> EXPORT NAO E A POPULACAO', async () => {
  const e = ambiente();
  assert.strictEqual(await e.exportar(), 0, e.texto());
  assert.strictEqual(await e.conferir('--dir', e.dir), 0, e.texto());
  const pop = e.f.pop;
  const mais = { ...pop, apagaveis: { ...pop.apagaveis, ficticios: [...pop.apagaveis.ficticios, { id: e.f.C(9), user_id: null }] } };
  mais.populacao_md5 = m.md5Ids([e.f.C(1), e.f.C(2), e.f.C(4), e.f.C(6), e.f.C(9)]);
  const menos = { ...pop, apagaveis: { ficticios: pop.apagaveis.ficticios, contas_teste_com_candidatura: pop.apagaveis.contas_teste_com_candidatura.slice(1) } };
  menos.populacao_md5 = m.md5Ids([e.f.C(2), e.f.C(4), e.f.C(6)]);
  for (const p of [mais, menos]) {
    e.arq('pop.json', JSON.stringify(p));
    e.saida.length = 0;
    assert.strictEqual(await e.conferir('--dir', e.dir), 1);
    assert.match(e.texto(), /EXPORT NAO E A POPULACAO/);
  }
  e.arq('pop.json', JSON.stringify(pop));
  e.arq('storage.json', JSON.stringify({ ...e.storage, n_objetos: 1, nomes_md5: m.nomesMd5([Object.keys(e.objetos)[0]]) }));
  e.saida.length = 0;
  assert.strictEqual(await e.conferir('--dir', e.dir), 1);
  assert.match(e.texto(), /EXPORT NAO E A POPULACAO: storage/);
});

test('--exportar com a listagem do Storage diferente da captura -> EXPORT NAO E A POPULACAO, nada gravado', async () => {
  const e = ambiente();
  e.rede.objetos.set(`${e.f.Uu(1)}/novo.pdf`, Buffer.from('novo'));
  assert.strictEqual(await e.exportar(), 1);
  assert.match(e.texto(), /EXPORT NAO E A POPULACAO: storage/);
  assert.ok(!fs.existsSync(e.dir));
});

test('--registro e --decisao: md5 ou instante diferente do manifesto -> EXPORT NAO E O APROVADO; iguais -> conferido', async () => {
  const e = ambiente();
  assert.strictEqual(await e.exportar(), 0, e.texto());
  const mf = JSON.parse(fs.readFileSync(path.join(e.dir, 'MANIFESTO.json'), 'utf8'));
  const h = manifestoMd5(e.dir);
  const reg = (md, em) => e.arq('reg.md', `# registro\nexport_dir: ${e.dir}\nexport_md5: ${md}\nexportado_em: ${em}\n`);
  const dec = (md, em) => e.arq('dec21.md', `decisao: apagar\nexport_dir: ${e.dir}\nexport_md5_aprovado: ${md}\nexport_em_aprovado: ${em}\n`);
  e.saida.length = 0;
  assert.strictEqual(await e.conferir('--registro', reg(h, mf.exportado_em)), 0, e.texto());
  assert.match(e.texto(), new RegExp(`^EXPORT CONFERIDO: export_md5=${h} linhas=\\d+ curriculos=2 vivo=nao_conferido$`, 'm'));
  assert.strictEqual(await e.conferir('--decisao', dec(h, mf.exportado_em)), 0, e.texto());
  for (const [f, md, em] of [[reg, md5('x'), mf.exportado_em], [reg, h, '2026-10-13T12:00:01.000Z'], [dec, md5('x'), mf.exportado_em], [dec, h, '2026-10-13T12:00:01.000Z']]) {
    e.saida.length = 0;
    assert.strictEqual(await e.conferir(f === reg ? '--registro' : '--decisao', f(md, em)), 1);
    assert.match(e.texto(), /EXPORT NAO E O APROVADO/);
  }
});

test('--vivo: igual -> vivo=igual; uma linha mudada no banco -> EXPORT DIFERE DO VIVO: <tabela>; Storage mudado -> EXPORT DIFERE DO VIVO: storage', async () => {
  const e = ambiente();
  assert.strictEqual(await e.exportar(), 0, e.texto());
  e.saida.length = 0;
  assert.strictEqual(await e.conferir('--dir', e.dir, '--vivo'), 0, e.texto());
  assert.match(e.texto(), /vivo=igual$/m);
  e.f.db.tabelas['public.filho'][0].nota = 'mudou';
  e.saida.length = 0;
  assert.strictEqual(await e.conferir('--dir', e.dir, '--vivo'), 1);
  assert.match(e.texto(), /EXPORT DIFERE DO VIVO: public\.filho/);
  delete e.f.db.tabelas['public.filho'][0].nota;
  e.rede.objetos.set(`${e.f.C(4)}/cv.pdf`, Buffer.from('%PDF-falso-2 trocado por outro tamanho'));
  e.saida.length = 0;
  assert.strictEqual(await e.conferir('--dir', e.dir, '--vivo'), 1);
  assert.match(e.texto(), /EXPORT DIFERE DO VIVO: storage/);
});

test('nenhuma chave, token, e-mail, nome, CPF ou nome de arquivo em stdout/stderr', async () => {
  const e = ambiente();
  await e.exportar();
  await e.conferir('--dir', e.dir, '--vivo');
  await e.exportar();
  await e.conferir('--dir', path.join(e.tmp, 'nada'));
  const t = e.texto();
  assert.ok(e.saida.length >= 4);
  assert.ok(!t.includes(e.rede.chave) && !t.includes(e.rede.token));
  assert.doesNotMatch(t, /@|Fulano|Sobrenome|000\.000|curriculo-|cv\.pdf|hashfalso|tok-/);
});

test('--auto-teste do script fecha com EXPORT AUTO-TESTE OK: n/n', () => {
  let o = '';
  try {
    o = execFileSync(process.execPath, [SCRIPT, '--auto-teste'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    o = String(err.stdout || '') + String(err.stderr || '');
  }
  const mm = o.match(/^EXPORT AUTO-TESTE OK: (\d+)\/(\d+)/m);
  assert.ok(mm && mm[1] === mm[2] && Number(mm[2]) >= 30, o.slice(0, 300));
});
