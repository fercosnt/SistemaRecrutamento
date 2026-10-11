#!/usr/bin/env node
'use strict';
/*
 * p52_vitest_delta.cjs — o portão da suíte Vitest da Phase 52, julgado por DELTA contra a base da fase
 * (`refs/gsd/52/base`, fixada pelo 52-01), medida NA MESMA EXECUÇÃO. É o portão da suíte no 52-14, no
 * 52-17 e no 52-20. Cópia adaptada de `scripts/p50_vitest_delta.cjs` (precedente da Phase 50, 50-09).
 *
 * POR QUE DELTA E NÃO «ZERO FALHAS». A base intocada da fase já reprova testes — registrado em
 * STATE.md:1404 (o precedente da Phase 50) e em 51-VERIFICATION.md:120/165 (iguais na base da 51, com
 * dono na fila de fecho do M8). Um portão «zero falhas» seria vermelho por construção, antes de qualquer
 * trabalho da fase; isentar esses vermelhos por nome seria a fotografia que o CLAUDE.md proíbe
 * («Portões: varra pela FORMA» — baseline capturada na execução, nunca constante). Então o portão é:
 * NENHUM vermelho em HEAD que a base, medida agora, não tenha. A lista de pré-existentes é MEDIDA aqui,
 * nunca escrita aqui: este arquivo não contém nome de teste, caminho de arquivo de teste (além da
 * mordida, que ele mesmo planta) nem contagem.
 *
 * O QUE MUDOU DO p50 (52-01 Task 3):
 *   · BASE NAO MEDIDA, fail-closed, ANTES de rodar o HEAD: ref que não resolve, base = HEAD (comparação
 *     vazia por construção), base fora da ancestralidade do HEAD, relatório da base ausente/ilegível,
 *     com `numTotalTests` 0 ou sem arquivo de teste. Uma base que não se mede nunca vira passe vácuo.
 *   · `--base <ref>` opcional, SÓ para as provas de mordida do CLI; passa pelas mesmas recusas.
 *   · ALTERADAS: o mesmo id vermelho nos dois lados com ASSINATURA diferente (o texto da falha até a
 *     primeira linha de pilha, com o diretório da própria cópia trocado por `<copia>` e os espaços
 *     colapsados) — um vermelho pré-existente que passou a falhar por OUTRO motivo é vermelho novo
 *     escondido sob um id velho. Cada uma sai impressa com as duas assinaturas (200 caracteres).
 *   · O julgamento é uma função pura exportada, `julgar()`; o exit do uso normal é `julgar(...).codigo`
 *     e nada mais decide o exit. O `--auto-teste` (nove casos, relatórios sintéticos em memória, sem
 *     git, sem Vitest, sem rede) chama a MESMA função.
 *
 * COMO (uso normal).
 *   1. Resolver a base (padrão `refs/gsd/52/base`) e recusá-la se não se mede (acima).
 *   2. Árvore limpa (rastreados, staged e não rastreados) em src supabase tests vite.config.ts
 *      package.json package-lock.json — o portão julga código COMMITADO (`ARVORE SUJA`, exit 1). Arquivos
 *      sujos FORA desse escopo (docs/specs, docs/vagas, AGENTS.md, .planning/) não recusam.
 *   3. Medir a BASE primeiro: `git archive` num `fs.mkdtempSync` sob `os.tmpdir()`, `node_modules` do
 *      checkout ligado por symlink, `CI=true` e as duas variáveis falsas do Supabase (`AMBIENTE_FALSO`).
 *      O arquivo de ambiente real (não rastreado) NUNCA é copiado, ligado nem lido. Relatório que não
 *      mede → `BASE NAO MEDIDA` e exit 1 SEM rodar o HEAD.
 *   4. Cópia do HEAD, idêntica no método, mais a MORDIDA (`MORDIDA_REL`: um teste que reprova por
 *      construção, plantado só ali). Se a comparação não a acusar como nova, ela é vazia.
 *   5. `npx vitest run --reporter=json --outputFile=<copia>/vitest.json` em cada cópia; `julgar()`.
 *
 * Ids de falha (como no p50): `<caminho relativo> > <fullName>` de toda asserção `failed`, mais
 * `<caminho> > [SUITE]` para arquivo cujo status não é `passed` sem asserção reprovada (erro de
 * coleta/import). Mordida: `mordida=ok` só se o HEAD tem id(s) da mordida e TODOS saem novos contra a
 * base; depois eles saem do conjunto e das contagens do HEAD. Pisos: relatório do HEAD com
 * `numTotalTests > 0`; todo arquivo de teste da base presente no HEAD (`ARQUIVO SUMIU: <caminho>`).
 * Código 0 só com base e HEAD medidos, novas=0, alteradas=0, nada sumido e mordida=ok. Imprime por
 * inteiro, um id por linha: pre-existentes, corrigidas, ALTERADAS, NOVAS, a mordida; e a linha final,
 * exata:
 *   vitest delta: base=<sha7> <total>/<falhas> · head=<sha7> <total>/<falhas> · pre-existentes=<k> · corrigidas=<c> · alteradas=<a> · novas=<n> · mordida=<ok|FALHOU>
 * Os diretórios temporários saem num `finally`.
 *
 * Uso:
 *   node scripts/p52_vitest_delta.cjs [--base <ref>]
 *   node scripts/p52_vitest_delta.cjs --auto-teste
 *
 * Sem dependências: Node built-ins, git, tar e o Vitest do próprio checkout.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE_PADRAO = 'refs/gsd/52/base';
const MORDIDA_REL = path.join('src', '__tests__', 'p52-mordida-delta.test.ts');
const MORDIDA_SRC =
  "import { describe, it, expect } from 'vitest'\n\n" +
  '// Plantado SÓ na cópia de HEAD por scripts/p52_vitest_delta.cjs — reprova por construção.\n' +
  "describe('p52 mordida do delta', () => {\n" +
  "  it('reprova por construcao (se o delta nao a acusar como nova, a comparacao e vazia)', () => {\n" +
  '    expect(1).toBe(2)\n' +
  '  })\n' +
  '})\n';
const AMBIENTE_FALSO = {
  CI: 'true',
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY: 'p52-delta-fake',
};
const ESCOPO_LIMPO = ['src', 'supabase', 'tests', 'vite.config.ts', 'package.json', 'package-lock.json'];

/* ------------------------------------------------------------------------------------------------
 * Julgamento — puro (lê só os dois relatórios e os nomes dos diretórios).
 * ---------------------------------------------------------------------------------------------- */

function relativo(dir, nome) {
  let n = nome;
  try {
    n = fs.realpathSync(nome);
  } catch {
    /* arquivo pode não existir (cópia apagada, relatório sintético): usa o nome cru */
  }
  const rel = path.relative(dir, n);
  return rel.startsWith('..') || path.isAbsolute(rel) ? nome : rel;
}

/* O diretório da cópia aparece nas mensagens como `realpath` ou como o caminho cru do tmpdir (no macOS,
 * `/private/var/…` × `/var/…`): os dois viram `<copia>`. */
function variantesDir(dir) {
  const v = new Set([dir]);
  if (dir.startsWith('/private/')) v.add(dir.slice('/private'.length));
  return [...v].sort((a, b) => b.length - a.length);
}

function assinatura(texto, dir) {
  const linhas = String(texto || '').split('\n');
  const corte = linhas.findIndex((l) => /^\s+at /.test(l));
  let s = (corte < 0 ? linhas : linhas.slice(0, corte)).join('\n');
  for (const d of variantesDir(dir)) s = s.split(d).join('<copia>');
  return s.replace(/\s+/g, ' ').trim();
}

/* Map id → assinatura, e o conjunto de arquivos do relatório. */
function falhas(rel, dir) {
  const ids = new Map();
  const arquivos = new Set();
  const suites = [];
  for (const tr of rel.testResults || []) {
    const p = relativo(dir, tr.name);
    arquivos.add(p);
    const reprovadas = (tr.assertionResults || []).filter((a) => a.status === 'failed');
    for (const a of reprovadas) {
      const nome = a.fullName || [...(a.ancestorTitles || []), a.title].join(' ');
      ids.set(`${p} > ${nome}`, assinatura((a.failureMessages || []).join('\n'), dir));
    }
    if (tr.status !== 'passed' && reprovadas.length === 0) {
      ids.set(`${p} > [SUITE]`, assinatura(tr.message, dir));
      suites.push(`${p} (status ${tr.status}): ${String(tr.message || '').split('\n').slice(0, 3).join(' | ').slice(0, 300)}`);
    }
  }
  return { ids, arquivos, suites };
}

/* A base se mede? Devolve o motivo da recusa, ou null. Usada pelo uso normal ANTES de rodar o HEAD e
 * por `julgar()` — a mesma regra nos dois lugares. */
function baseNaoMedida(relBase) {
  if (!relBase || typeof relBase !== 'object') return 'relatorio da base ausente ou ilegivel';
  if (!(Number(relBase.numTotalTests) > 0)) return `relatorio da base com numTotalTests=${relBase.numTotalTests} (zero testes nao medem nada)`;
  if (!Array.isArray(relBase.testResults) || relBase.testResults.length === 0) return 'relatorio da base sem nenhum arquivo de teste';
  return null;
}

/*
 * julgar(relBase, relHead, { dirBase, dirHead, mordidaRel }) →
 *   { codigo, motivo, pre, corrigidas, alteradas, novas, sumiram, mordidaOk, idsMordida, totais, suites }
 * `codigo` é o ÚNICO que decide o exit do uso normal.
 */
function julgar(relBase, relHead, { dirBase, dirHead, mordidaRel = MORDIDA_REL } = {}) {
  const vazio = { pre: new Map(), corrigidas: new Map(), alteradas: new Map(), novas: new Map(), sumiram: [], mordidaOk: false, idsMordida: [], totais: null, suites: { base: [], head: [] } };
  const bnm = baseNaoMedida(relBase);
  if (bnm) return { ...vazio, codigo: 1, motivo: `BASE NAO MEDIDA: ${bnm}` };
  if (!relHead || typeof relHead !== 'object') return { ...vazio, codigo: 1, motivo: 'HEAD NAO MEDIDO: relatorio do HEAD ausente ou ilegivel' };

  const fb = falhas(relBase, dirBase);
  const fh = falhas(relHead, dirHead);

  // (1) mordida — tem de existir no HEAD e sair inteira como NOVA; depois sai do conjunto e das contagens.
  const idsMordida = [...fh.ids.keys()].filter((x) => x.startsWith(`${mordidaRel} > `));
  const mordidaOk = idsMordida.length > 0 && idsMordida.every((x) => !fb.ids.has(x));
  for (const x of idsMordida) fh.ids.delete(x);
  const mordidaTotal = (relHead.testResults || [])
    .filter((tr) => relativo(dirHead, tr.name) === mordidaRel)
    .reduce((n, tr) => n + (tr.assertionResults || []).length, 0);
  const mordidaFalhas = (relHead.testResults || [])
    .filter((tr) => relativo(dirHead, tr.name) === mordidaRel)
    .reduce((n, tr) => n + (tr.assertionResults || []).filter((a) => a.status === 'failed').length, 0);
  fh.arquivos.delete(mordidaRel);

  // (2) pisos
  const pisos = [];
  if (!(Number(relHead.numTotalTests) > 0)) pisos.push(`PISO: numTotalTests head=${relHead.numTotalTests} — relatorio vazio`);
  const sumiram = [...fb.arquivos].filter((p) => !fh.arquivos.has(p)).sort();

  // (3) conjuntos
  const novas = new Map();
  const corrigidas = new Map();
  const pre = new Map();
  const alteradas = new Map();
  for (const [id, sh] of fh.ids) {
    if (!fb.ids.has(id)) novas.set(id, sh);
    else if (fb.ids.get(id) !== sh) alteradas.set(id, { base: fb.ids.get(id), head: sh });
    else pre.set(id, sh);
  }
  for (const [id, sb] of fb.ids) if (!fh.ids.has(id)) corrigidas.set(id, sb);

  const totais = {
    base: { total: relBase.numTotalTests, falhas: relBase.numFailedTests },
    head: { total: relHead.numTotalTests - mordidaTotal, falhas: relHead.numFailedTests - mordidaFalhas },
  };
  const codigo = novas.size === 0 && alteradas.size === 0 && sumiram.length === 0 && pisos.length === 0 && mordidaOk ? 0 : 1;
  return { codigo, motivo: pisos.join(' ; ') || null, pre, corrigidas, alteradas, novas, sumiram, mordidaOk, idsMordida, totais, suites: { base: fb.suites, head: fh.suites } };
}

/* As linhas que o julgamento imprime (o uso normal e o auto-teste usam as mesmas). */
function relatorio(r, shaBase, shaHead) {
  const out = [];
  if (r.motivo && r.motivo.startsWith('BASE NAO MEDIDA')) return [r.motivo];
  if (r.motivo && r.motivo.startsWith('HEAD NAO MEDIDO')) return [r.motivo];
  for (const s of r.suites.base) out.push(`  [SUITE] base ${s}`);
  for (const s of r.suites.head) out.push(`  [SUITE] head ${s}`);
  const lista = (titulo, m, fmt) => {
    const ks = [...m.keys()].sort();
    out.push(`${titulo} (${ks.length}):`);
    for (const k of ks) out.push(`  - ${k}${fmt ? fmt(m.get(k)) : ''}`);
  };
  lista('pre-existentes (falham na base e em HEAD)', r.pre);
  lista('corrigidas (falham na base, passam em HEAD)', r.corrigidas);
  lista('ALTERADAS (falham nos dois, por motivo diferente)', r.alteradas, (v) => `\n      base: ${v.base.slice(0, 200)}\n      head: ${v.head.slice(0, 200)}`);
  lista('NOVAS (falham em HEAD, passavam na base)', r.novas);
  for (const p of r.sumiram) out.push(`ARQUIVO SUMIU: ${p}`);
  if (r.motivo) out.push(r.motivo);
  out.push(`mordida: ${r.idsMordida.length ? r.idsMordida.join(' ; ') : '(nenhum id da mordida no relatorio de HEAD)'} → ${r.mordidaOk ? 'acusada como nova' : 'NAO acusada'}`);
  out.push(
    `vitest delta: base=${shaBase.slice(0, 7)} ${r.totais.base.total}/${r.totais.base.falhas} · head=${shaHead.slice(0, 7)} ${r.totais.head.total}/${r.totais.head.falhas} · pre-existentes=${r.pre.size} · corrigidas=${r.corrigidas.size} · alteradas=${r.alteradas.size} · novas=${r.novas.size} · mordida=${r.mordidaOk ? 'ok' : 'FALHOU'}`
  );
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Uso normal — git, cópias simétricas e o Vitest do checkout.
 * ---------------------------------------------------------------------------------------------- */

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function resolverRef(ref) {
  try {
    return git(['rev-parse', '--verify', '-q', '--end-of-options', `${ref}^{commit}`]).trim() || null;
  } catch {
    return null;
  }
}

/* Recusa a base que não se mede ANTES de qualquer execução. Devolve { shaBase, shaHead } ou o motivo. */
function resolverBase(ref) {
  const shaHead = resolverRef('HEAD');
  if (!shaHead) return { motivo: 'HEAD nao resolve' };
  const shaBase = resolverRef(ref);
  if (!shaBase) return { motivo: `${ref} nao resolve (a base da fase e fixada pelo 52-01 Task 1)` };
  if (shaBase === shaHead) return { motivo: `${ref} = HEAD (${shaHead.slice(0, 7)}) — comparacao vazia por construcao` };
  const anc = spawnSync('git', ['merge-base', '--is-ancestor', shaBase, shaHead], { cwd: ROOT, stdio: 'ignore' });
  if (anc.status !== 0) return { motivo: `${ref} (${shaBase.slice(0, 7)}) nao e ancestral do HEAD (${shaHead.slice(0, 7)})` };
  return { shaBase, shaHead };
}

function extrair(sha, rotulo) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `p52-vdelta-${rotulo}-`)));
  const tar = path.join(dir, '..', `${path.basename(dir)}.tar`);
  try {
    git(['archive', '--format=tar', '-o', tar, sha]);
    execFileSync('tar', ['-x', '-f', tar, '-C', dir], { stdio: ['ignore', 'ignore', 'pipe'] });
  } finally {
    fs.rmSync(tar, { force: true });
  }
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}

/* Roda o Vitest numa cópia. Devolve o relatório, ou null (ausente/ilegível) com a cauda da saída. */
function rodarVitest(dir, rotulo) {
  const saida = path.join(dir, 'vitest.json');
  const env = { ...process.env, ...AMBIENTE_FALSO };
  const t0 = Date.now();
  const r = spawnSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${saida}`], {
    cwd: dir,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  });
  console.log(`vitest ${rotulo}: status ${r.status} · ${Date.now() - t0} ms`);
  if (!fs.existsSync(saida)) {
    console.log(`${`${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-15).join('\n')}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(saida, 'utf8'));
  } catch {
    return null;
  }
}

function principal(argv) {
  let ref = BASE_PADRAO;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base' && i + 1 < argv.length) ref = argv[++i];
    else {
      console.error(`vitest delta: opcao desconhecida ou sem valor: ${argv[i]} (uso: [--base <ref>] | --auto-teste)`);
      return 1;
    }
  }
  // (1) a base se mede?
  const b = resolverBase(ref);
  if (b.motivo) {
    console.error(`BASE NAO MEDIDA: ${b.motivo}`);
    return 1;
  }
  // (2) árvore limpa no escopo
  let sujo;
  try {
    sujo = git(['--no-optional-locks', 'status', '--porcelain', '--untracked-files=all', '--', ...ESCOPO_LIMPO]).trim();
  } catch (e) {
    console.error(`ARVORE SUJA: git status falhou (${String(e && e.message).split('\n')[0]})`);
    return 1;
  }
  if (sujo) {
    console.error(`ARVORE SUJA: alteracao nao commitada em ${ESCOPO_LIMPO.join(' ')} — o portao julga codigo COMMITADO:\n${sujo}`);
    return 1;
  }
  const dirs = [];
  try {
    // (3) a BASE primeiro
    const dBase = extrair(b.shaBase, 'base');
    dirs.push(dBase);
    const rBase = rodarVitest(dBase, `base ${b.shaBase.slice(0, 7)}`);
    const bnm = baseNaoMedida(rBase);
    if (bnm) {
      console.error(`BASE NAO MEDIDA: ${bnm} — o HEAD nao foi rodado`);
      return 1;
    }
    // (4) HEAD com a mordida
    const dHead = extrair(b.shaHead, 'head');
    dirs.push(dHead);
    fs.mkdirSync(path.dirname(path.join(dHead, MORDIDA_REL)), { recursive: true });
    fs.writeFileSync(path.join(dHead, MORDIDA_REL), MORDIDA_SRC, 'utf8');
    const rHead = rodarVitest(dHead, `head ${b.shaHead.slice(0, 7)}`);
    // (5) julgar — o exit é o código dele e nada mais
    const r = julgar(rBase, rHead, { dirBase: dBase, dirHead: dHead, mordidaRel: MORDIDA_REL });
    for (const l of relatorio(r, b.shaBase, b.shaHead)) console.log(l);
    return r.codigo;
  } catch (e) {
    console.error(`vitest delta: ERRO — ${String(e && e.message).split('\n')[0]}`);
    return 1;
  } finally {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------------------------------------
 * AUTO-TESTE — relatórios sintéticos no formato JSON do Vitest, sob dois diretórios falsos, julgados
 * pela MESMA `julgar()`. Os nomes de arquivo sintéticos não imitam teste nenhum de propósito: o
 * julgamento não olha sufixo, e o script não cita arquivo de teste além da mordida.
 * ---------------------------------------------------------------------------------------------- */

const DB = path.join(os.tmpdir(), 'p52-auto-teste-base-inexistente');
const DH = path.join(os.tmpdir(), 'p52-auto-teste-head-inexistente');

/* arquivos: [[relativo, [[titulo, 'passed'|'failed', mensagem?], …], status?, mensagemSuite?], …] */
function rel(dir, arquivos) {
  let total = 0;
  let falhas = 0;
  const testResults = arquivos.map(([p, casos, status, msg]) => {
    const assertionResults = casos.map(([t, st, m]) => {
      total += 1;
      if (st === 'failed') falhas += 1;
      return { fullName: t, title: t, ancestorTitles: [], status: st, failureMessages: st === 'failed' ? [`${m || 'AssertionError: falhou'}\n    at Object.<anonymous> (${dir}/${p}:1:1)`] : [] };
    });
    const st = status || (assertionResults.some((a) => a.status === 'failed') ? 'failed' : 'passed');
    return { name: path.join(dir, p), status: st, message: msg || '', assertionResults };
  });
  return { numTotalTests: total, numFailedTests: falhas, testResults };
}

const MORD = [MORDIDA_REL, [['p52 mordida do delta reprova por construcao', 'failed', 'AssertionError: expected 1 to be 2']]];
const A = (st1, st2, m1, m2) => ['sintetico/arquivo-a', [['caso a1', st1, m1], ['caso a2', st2, m2]]];
const B = (st) => ['sintetico/arquivo-b', [['caso b1', st, 'AssertionError: b1']]];
const C = ['sintetico/arquivo-c', [['caso c1', 'passed']]];
const BASE2 = () => rel(DB, [A('failed', 'failed', 'AssertionError: a1 velho', 'AssertionError: a2 velho'), B('passed'), C]);

const CASOS = [
  {
    nome: '(1) base com dois vermelhos, HEAD com os mesmos dois + a mordida',
    base: BASE2,
    head: () => rel(DH, [A('failed', 'failed', 'AssertionError: a1 velho', 'AssertionError: a2 velho'), B('passed'), C, MORD]),
    codigo: 0,
    linha: /pre-existentes=2 · corrigidas=0 · alteradas=0 · novas=0 · mordida=ok$/,
  },
  {
    nome: '(2) HEAD com um vermelho a mais',
    base: BASE2,
    head: () => rel(DH, [A('failed', 'failed', 'AssertionError: a1 velho', 'AssertionError: a2 velho'), B('failed'), C, MORD]),
    codigo: 1,
    linha: /· novas=1 · mordida=ok$/,
  },
  {
    nome: '(3) relatorio da base ausente',
    base: () => null,
    head: () => rel(DH, [C, MORD]),
    codigo: 1,
    linha: /^BASE NAO MEDIDA: /,
  },
  {
    nome: '(4) base com numTotalTests 0',
    base: () => rel(DB, []),
    head: () => rel(DH, [C, MORD]),
    codigo: 1,
    linha: /^BASE NAO MEDIDA: /,
  },
  {
    nome: '(5) HEAD sem o id da mordida',
    base: BASE2,
    head: () => rel(DH, [A('failed', 'failed', 'AssertionError: a1 velho', 'AssertionError: a2 velho'), B('passed'), C]),
    codigo: 1,
    linha: /· mordida=FALHOU$/,
  },
  {
    nome: '(6) arquivo de teste da base ausente do HEAD',
    base: BASE2,
    head: () => rel(DH, [A('failed', 'failed', 'AssertionError: a1 velho', 'AssertionError: a2 velho'), B('passed'), MORD]),
    codigo: 1,
    linha: /^ARQUIVO SUMIU: sintetico\/arquivo-c$/m,
  },
  {
    nome: '(7) mesmo vermelho nos dois, mensagem de assercao diferente',
    base: BASE2,
    head: () => rel(DH, [A('failed', 'failed', 'AssertionError: a1 velho', 'TypeError: a2 por outro motivo'), B('passed'), C, MORD]),
    codigo: 1,
    linha: /· alteradas=1 · novas=0 · mordida=ok$/,
  },
  {
    nome: '(8) erro de coleta ([SUITE]) no HEAD num arquivo que passava na base',
    base: BASE2,
    head: () => rel(DH, [A('failed', 'failed', 'AssertionError: a1 velho', 'AssertionError: a2 velho'), ['sintetico/arquivo-b', [], 'failed', 'Error: Failed to load url'], C, MORD]),
    codigo: 1,
    linha: /· novas=1 · mordida=ok$/,
  },
  {
    nome: '(9) vermelho da base que passa no HEAD',
    base: BASE2,
    head: () => rel(DH, [A('failed', 'passed', 'AssertionError: a1 velho'), B('passed'), C, MORD]),
    codigo: 0,
    linha: /pre-existentes=1 · corrigidas=1 · alteradas=0 · novas=0 · mordida=ok$/,
  },
];
const DECLARADOS = 9;

function autoTeste() {
  let rodados = 0;
  let ok = 0;
  for (const c of CASOS) {
    rodados += 1;
    let r;
    let texto;
    try {
      r = julgar(c.base(), c.head(), { dirBase: DB, dirHead: DH, mordidaRel: MORDIDA_REL });
      texto = relatorio(r, 'b'.repeat(40), 'h'.repeat(40)).join('\n');
    } catch (e) {
      r = { codigo: 'excecao' };
      texto = String(e && e.message);
    }
    const bate = r.codigo === c.codigo && c.linha.test(texto);
    if (bate) ok += 1;
    const ultima = texto.split('\n').filter(Boolean).slice(-1)[0] || '';
    console.log(`  ${bate ? 'ok    ' : 'FALHOU'} ${c.nome}: codigo ${r.codigo} (esperado ${c.codigo}) · ${ultima.slice(0, 220)}`);
  }
  if (rodados !== DECLARADOS || ok !== DECLARADOS) {
    console.log(`AUTO-TESTE FALHOU: ${ok}/${DECLARADOS} (rodados ${rodados})`);
    return 1;
  }
  console.log(`AUTO-TESTE OK: ${ok}/${DECLARADOS}`);
  return 0;
}

module.exports = { julgar, relatorio, baseNaoMedida, assinatura, falhas, resolverBase, MORDIDA_REL, BASE_PADRAO };

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a.length === 1 && a[0] === '--auto-teste') process.exit(autoTeste());
  process.exit(principal(a));
}
